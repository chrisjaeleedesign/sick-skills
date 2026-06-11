/**
 * Standalone studio server — replaces the Next.js dev server.
 *
 * Runs under Node (better-sqlite3 and sqlite-vec are Node native modules);
 * bundled transiently by Bun via `bun run build:server`. Handlers are
 * web-standard (Request) => Response, adapted to node:http at the bottom.
 *
 * RAM design (16GB machine, two prior crashes from Turbopack):
 *  - no compiler in this process; prototypes are prebuilt by build.ts
 *  - mtime staleness check recompiles a prototype in a transient subprocess
 *  - self-terminates after IDLE_MS without a request — zero steady-state RAM
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { readManifest, writeManifest, listProjects, createProject } from "./app/lib/manifest";
import type { Section, Family, Settings } from "./app/lib/manifest";
import { getProject, getProjectFilter } from "./app/lib/request";
import { handleAction } from "./app/lib/route-handler";
import { getDb, DESIGN_ROOT } from "./app/lib/db";
import {
  createEntry, getEntry, updateEntry, deleteEntry, queryEntries,
  addRevision, getRevisions, addAttachment, getAttachments,
  addRelation, removeRelation, getRelations,
  entryTags, entryFamilies, entryColors, entryProjects,
} from "./app/lib/db-entries";
import {
  listBoards, listBoardsWithPreviews, getBoard, getBoardItems, getBoardItemsEnriched,
  createBoard, updateBoard, deleteBoard, addBoardItem, removeBoardItem,
  updateBoardItemLayout, bulkUpdateBoardLayout, getBoardsForEntry,
} from "./app/lib/db-boards";
import {
  queryFeatures, insertFeature, updateFeature, deleteFeature,
  featureAreas, updateFeaturePositions,
  getAllConnections, addConnection, removeConnection, updateConnectionNote,
} from "./app/lib/db-features";
import { listSavedFilters, createSavedFilter, deleteSavedFilter } from "./app/lib/db-saved-filters";
import { storeEmbedding, hybridSearch } from "./app/lib/db-embeddings";
import { generateEmbedding } from "./app/lib/embeddings";
import type { Entry, EntryQueryParams, SourceType, ConnectionType } from "./app/lib/types";

// Runs either as source (studio root) or bundled (studio/dist/server.mjs).
const HERE = import.meta.dirname;
const STUDIO_ROOT = path.basename(HERE) === "dist" ? path.dirname(HERE) : HERE;
const DIST = path.join(STUDIO_ROOT, "dist");
const GALLERY_DIST = path.join(DIST, "gallery");
const PORT = Number(process.env.PORT ?? 3001);
const IDLE_MS = Number(process.env.STUDIO_IDLE_MS ?? 15 * 60 * 1000);

const json = (data: unknown, init?: ResponseInit) => Response.json(data, init);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
};

function serveFile(filePath: string, cacheControl = "no-cache"): Response {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(filePath).toLowerCase();
  return new Response(readFileSync(filePath), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": cacheControl,
    },
  });
}

// ---------------------------------------------------------------------------
// /api/manifest
// ---------------------------------------------------------------------------

type ManifestAction =
  | { action?: undefined; sections?: Section[]; families?: Record<string, Family>; settings?: Partial<Settings> }
  | { action: "add-family"; family: Family }
  | { action: "add-section"; section: Section }
  | { action: "set-current"; family: string; version: number };

function assignToFocusedSection(manifest: { sections: Section[] }, slug: string): void {
  const focused = manifest.sections.find((s) => s.focus);
  if (!focused) return;
  if (!focused.items.includes(slug)) focused.items.push(slug);
}

function manifestGet(request: Request): Response {
  return json(readManifest(getProject(request)));
}

async function manifestPost(request: Request): Promise<Response> {
  const project = getProject(request);
  const body = (await request.json()) as ManifestAction;
  const manifest = readManifest(project);

  if (body.action === "add-family") {
    manifest.families[body.family.slug] = body.family;
    assignToFocusedSection(manifest, body.family.slug);
  } else if (body.action === "add-section") {
    const section = { ...body.section, items: body.section.items ?? [] };
    manifest.sections.unshift(section);
  } else if (body.action === "set-current") {
    manifest.current = { family: body.family, version: body.version };
  } else {
    if (body.sections) manifest.sections = body.sections;
    if (body.families) manifest.families = body.families;
    if (body.settings) manifest.settings = { ...manifest.settings, ...body.settings };
  }

  writeManifest(manifest, project);
  return json({ ok: true });
}

function manifestProjectsGet(): Response {
  return json(listProjects());
}

async function manifestProjectsPost(request: Request): Promise<Response> {
  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return json({ error: "name is required" }, { status: 400 });
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const manifest = createProject(slug);
  return json({ ok: true, project: slug, manifest });
}

function manifestFamilyGet(slug: string): Response {
  for (const project of listProjects()) {
    const manifest = readManifest(project);
    const family = manifest.families[slug];
    if (family) {
      return json({
        name: family.name,
        description: family.description,
        versions: family.versions,
        project,
      });
    }
  }
  return json(null, { status: 404 });
}

// ---------------------------------------------------------------------------
// /api/entries
// ---------------------------------------------------------------------------

/** Best-effort embedding: generate and store, but never fail the request. */
async function embedRevision(revisionId: string, body: string | undefined): Promise<void> {
  if (!body) return;
  try {
    const vector = await generateEmbedding(body);
    if (vector) storeEmbedding(revisionId, vector);
  } catch {
    console.error(`Failed to embed revision ${revisionId}`);
  }
}

function entriesGet(request: Request): Response {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");
  if (id) {
    const entry = getEntry(id);
    if (!entry) return json({ error: "Not found" }, { status: 404 });
    return json({
      ...entry,
      revisions: getRevisions(id),
      attachments: getAttachments(id),
      relations: getRelations(id),
    });
  }

  const view = searchParams.get("view");

  const rawKind = searchParams.get("kind");
  const rawImportance = searchParams.get("importance");
  const rawFamily = searchParams.get("family");

  const params: EntryQueryParams = {
    search: searchParams.get("search") ?? undefined,
    kind: rawKind
      ? (rawKind.includes(",")
          ? rawKind.split(",").filter(Boolean) as EntryQueryParams["kind"]
          : rawKind as EntryQueryParams["kind"])
      : undefined,
    importance: rawImportance
      ? (rawImportance.includes(",")
          ? rawImportance.split(",").filter(Boolean) as EntryQueryParams["importance"]
          : rawImportance as EntryQueryParams["importance"])
      : undefined,
    color: (searchParams.get("color") as EntryQueryParams["color"]) ?? undefined,
    family: rawFamily
      ? (rawFamily.includes(",") ? rawFamily.split(",").filter(Boolean) : rawFamily)
      : undefined,
    project: getProjectFilter(request),
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? undefined,
    pinned: searchParams.has("pinned") ? searchParams.get("pinned") === "true" : undefined,
    hidden: searchParams.has("hidden") ? searchParams.get("hidden") === "true" : undefined,
    since: searchParams.get("since") ?? undefined,
    until: searchParams.get("until") ?? undefined,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined,
    source_type: searchParams.get("source_type")
      ? searchParams.get("source_type")!.split(",").filter(Boolean) as SourceType[]
      : undefined,
  };

  if (view === "bank") {
    const entries = queryEntries(params, { withRevision: true });
    if (entries.length === 0) return json(entries);

    const db = getDb();
    const ids = entries.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(", ");
    const attachmentRows = db
      .prepare(
        `SELECT thought_id, path, type FROM attachments WHERE thought_id IN (${placeholders}) ORDER BY created_at`
      )
      .all(...ids) as { thought_id: string; path: string; type: string }[];

    const firstAttachment = new Map<string, { path: string; type: string }>();
    for (const row of attachmentRows) {
      if (!firstAttachment.has(row.thought_id)) {
        firstAttachment.set(row.thought_id, { path: row.path, type: row.type });
      }
    }

    const result = entries.map((t) => {
      const boards = getBoardsForEntry(t.id).map((b) => ({
        id: b.board_id,
        name: b.name,
        color: b.color,
      }));
      return { ...t, attachment: firstAttachment.get(t.id) ?? null, boards };
    });

    return json(result);
  }

  return json(queryEntries(params, { withRevision: true }));
}

async function entriesPost(request: Request): Promise<Response> {
  const body = await request.json();
  const db = getDb();
  const project = getProject(request);

  return handleAction(body, {
    "create-entry": async (b) => {
      const incoming = b.entry as Parameters<typeof createEntry>[0];
      // If the body doesn't supply a project, fall back to the request's
      // ?project= (default "default"). The "*" escape hatch is meaningless
      // on writes, so treat it as no override.
      const entry = incoming.project || project === "*"
        ? incoming
        : { ...incoming, project };
      const result = createEntry(entry);
      await embedRevision(result.revision.id, result.revision.body);
      return result;
    },
    "update-entry": (b) => {
      updateEntry(b.id as string, b.patch as Parameters<typeof updateEntry>[1]);
    },
    "delete-entry": (b) => {
      deleteEntry(b.id as string);
    },
    "add-revision": async (b) => {
      const revision = addRevision(b.entry_id as string, b.body as string, b.source as string);
      await embedRevision(revision.id, revision.body);
      return { revision };
    },
    "add-attachment": (b) => {
      const attachment = addAttachment(b.attachment as Parameters<typeof addAttachment>[0]);
      return { attachment };
    },
    "add-relation": (b) => {
      addRelation(b.from_id as string, b.to_id as string, b.type as Parameters<typeof addRelation>[2]);
    },
    "remove-relation": (b) => {
      removeRelation(b.from_id as string, b.to_id as string);
    },
    "bulk-update-sort-order": (b) => {
      const items = b.items as { id: string; sort_order: number }[];
      const stmt = db.prepare("UPDATE entries SET sort_order = ? WHERE id = ?");
      const tx = db.transaction(() => {
        for (const item of items) stmt.run(item.sort_order, item.id);
      });
      tx();
    },
  });
}

// ---------------------------------------------------------------------------
// /api/entries/search
// ---------------------------------------------------------------------------

/** Filter entries by project. `"*"` skips the filter (escape hatch). */
function inProject(entry: Entry, project: string): boolean {
  if (project === "*") return true;
  return entry.project === project;
}

async function entriesSearchGet(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const similarTo = searchParams.get("similar_to");
  const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : 10;
  const project = getProject(request);
  const projectFilter = project === "*" ? undefined : project;

  if (similarTo) {
    const revisions = getRevisions(similarTo);
    const latestBody = revisions[0]?.body;
    if (!latestBody) return json([]);

    const queryVector = await generateEmbedding(latestBody);
    if (!queryVector) {
      const keywords = latestBody.split(/\s+/).slice(0, 5).join(" ");
      return json(queryEntries({ search: keywords, limit, project: projectFilter }));
    }

    const results = hybridSearch(latestBody, queryVector, limit);
    const entries = results
      .filter((r) => r.thought_id !== similarTo)
      .map((r) => {
        const entry = getEntry(r.thought_id);
        return entry ? { ...entry, score: r.score } : null;
      })
      .filter((t): t is Entry & { score: number } => t != null)
      .filter((t) => inProject(t, project));

    return json(entries);
  }

  if (!query) {
    return json({ error: "Missing q or similar_to param" }, { status: 400 });
  }

  const queryVector = await generateEmbedding(query);
  if (!queryVector) {
    return json(queryEntries({ search: query, limit, project: projectFilter }));
  }

  const results = hybridSearch(query, queryVector, limit);
  const entries = results
    .map((r) => {
      const entry = getEntry(r.thought_id);
      return entry ? { ...entry, score: r.score } : null;
    })
    .filter((t): t is Entry & { score: number } => t != null)
    .filter((t) => inProject(t, project));

  return json(entries);
}

function entriesMetaGet(): Response {
  return json({
    tags: entryTags(),
    families: entryFamilies(),
    colors: entryColors(),
    projects: entryProjects(),
    kinds: ["observation", "question", "principle", "reference"],
  });
}

// ---------------------------------------------------------------------------
// /api/entries/boards
// ---------------------------------------------------------------------------

function boardsGet(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const project = getProject(request);

  if (id) {
    const board = getBoard(id);
    if (!board) return json({ error: "Not found" }, { status: 404 });
    if (searchParams.get("enriched") === "true") {
      return json({ board, entries: getBoardItemsEnriched(id) });
    }
    return json({ board, items: getBoardItems(id) });
  }

  if (searchParams.get("preview") === "true") {
    return json({ boards: listBoardsWithPreviews(project) });
  }

  return json({ boards: listBoards(project) });
}

async function boardsPost(request: Request): Promise<Response> {
  const body = await request.json();
  const project = getProject(request);

  return handleAction(body, {
    "create-board": (b) => {
      const incoming = b.board as Parameters<typeof createBoard>[0];
      const boardInput = incoming.project || project === "*"
        ? incoming
        : { ...incoming, project };
      const board = createBoard(boardInput);
      return { board };
    },
    "update-board": (b) => {
      updateBoard(b.id as string, b.patch as Parameters<typeof updateBoard>[1]);
    },
    "delete-board": (b) => {
      deleteBoard(b.id as string);
    },
    "add-item": (b) => {
      addBoardItem(
        b.board_id as string,
        b.entry_id as string,
        { x: b.x as number | undefined, y: b.y as number | undefined, w: b.w as number | undefined, h: b.h as number | undefined },
      );
    },
    "remove-item": (b) => {
      removeBoardItem(b.board_id as string, b.entry_id as string);
    },
    "update-board-item-layout": (b) => {
      updateBoardItemLayout(
        b.board_id as string,
        b.entry_id as string,
        b.layout as Parameters<typeof updateBoardItemLayout>[2],
      );
    },
    "bulk-update-board-layout": (b) => {
      bulkUpdateBoardLayout(
        b.board_id as string,
        b.items as Parameters<typeof bulkUpdateBoardLayout>[1],
      );
    },
  });
}

// ---------------------------------------------------------------------------
// /api/features
// ---------------------------------------------------------------------------

function featuresGet(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const project = getProject(request);
  const params = { area: searchParams.get("area") ?? undefined, project };
  const features = queryFeatures(params);
  const connections = getAllConnections();
  const areas = featureAreas();
  return json({ features, connections, areas });
}

async function featuresPost(request: Request): Promise<Response> {
  const body = await request.json();
  const project = getProject(request);

  return handleAction(body, {
    create: (b) => {
      const incoming = b.feature as Parameters<typeof insertFeature>[0];
      const featureInput = incoming.project || project === "*"
        ? incoming
        : { ...incoming, project };
      return { feature: insertFeature(featureInput) };
    },
    update: (b) => { updateFeature(b.id as string, b.feature as Partial<Parameters<typeof updateFeature>[1]>); },
    delete: (b) => { deleteFeature(b.id as string); },
    "update-positions": (b) => { updateFeaturePositions(b.updates as Parameters<typeof updateFeaturePositions>[0]); },
    "add-connection": (b) => { addConnection(b.a_id as string, b.b_id as string, b.type as ConnectionType, b.note as string); },
    "remove-connection": (b) => { removeConnection(b.a_id as string, b.b_id as string); },
    "update-connection-note": (b) => { updateConnectionNote(b.a_id as string, b.b_id as string, b.note as string); },
  });
}

// ---------------------------------------------------------------------------
// /api/saved-filters
// ---------------------------------------------------------------------------

function savedFiltersGet(request: Request): Response {
  return json({ filters: listSavedFilters(getProject(request)) });
}

async function savedFiltersPost(request: Request): Promise<Response> {
  const body = await request.json();
  const project = getProject(request);

  return handleAction(body, {
    create: (b) => {
      const filter = createSavedFilter({
        name: b.name as string,
        filter_json: b.filter_json as object,
        project: (b.project as string | undefined) ?? (project === "*" ? undefined : project),
      });
      return { filter };
    },
    delete: (b) => {
      deleteSavedFilter(b.id as string);
    },
  });
}

// ---------------------------------------------------------------------------
// /api/screenshot + /api/media
// ---------------------------------------------------------------------------

function screenshotGet(family: string, version: string): Response {
  const filePath = path.join(DESIGN_ROOT, "references", `${family}-v${version}.png`);
  if (!existsSync(filePath)) return new Response(null, { status: 404 });
  return new Response(readFileSync(filePath), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-cache" },
  });
}

function mediaGet(segments: string[]): Response {
  if (!segments || segments.length === 0) {
    return json({ error: "No path provided" }, { status: 400 });
  }

  const filePath = path.join(DESIGN_ROOT, ...segments);
  const resolvedRoot = path.resolve(DESIGN_ROOT);
  const resolvedFile = path.resolve(filePath);

  // Prevent path traversal
  if (!resolvedFile.startsWith(resolvedRoot + path.sep) && resolvedFile !== resolvedRoot) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  if (!existsSync(resolvedFile)) {
    return json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(resolvedFile).toLowerCase();
  return new Response(readFileSync(resolvedFile), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// ---------------------------------------------------------------------------
// Prototypes — static bundles with mtime staleness recompile
// ---------------------------------------------------------------------------

/**
 * Recompile a prototype in a transient subprocess when its source is newer
 * than its bundle (covers human hand-edits that don't announce writes).
 */
function ensureFresh(family: string, version: string): void {
  const src = path.join(STUDIO_ROOT, "app", "prototypes", family, `v${version}`, "page.tsx");
  const out = path.join(DIST, "prototypes", family, `v${version}`, "bundle.js");
  const buildScript = path.join(STUDIO_ROOT, "build.ts");
  if (!existsSync(src) || !existsSync(buildScript)) return;

  const stale = !existsSync(out) || statSync(src).mtimeMs > statSync(out).mtimeMs;
  if (!stale) return;

  console.log(`[studio] rebuilding stale prototype ${family}/v${version}`);
  const result = spawnSync("bun", [buildScript, family, version], {
    cwd: STUDIO_ROOT,
    stdio: "inherit",
    timeout: 60_000,
  });
  if (result.status !== 0) {
    console.error(`[studio] rebuild failed for ${family}/v${version}`);
  }
}

function prototypeGet(family: string, version: string, file?: string): Response {
  const dir = path.join(DIST, "prototypes", family, `v${version}`);
  if (!file) {
    ensureFresh(family, version);
    return serveFile(path.join(dir, "index.html"));
  }
  // Asset names come from the URL — keep them inside the prototype's dist dir.
  const resolved = path.resolve(dir, file);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  return serveFile(resolved);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

type Handler = (request: Request, match: RegExpMatchArray) => Response | Promise<Response>;

const routes: Array<[string, RegExp, Handler]> = [
  ["GET",  /^\/api\/manifest$/,                        (req) => manifestGet(req)],
  ["POST", /^\/api\/manifest$/,                        (req) => manifestPost(req)],
  ["GET",  /^\/api\/manifest\/projects$/,              () => manifestProjectsGet()],
  ["POST", /^\/api\/manifest\/projects$/,              (req) => manifestProjectsPost(req)],
  ["GET",  /^\/api\/manifest\/family\/([^/]+)$/,       (_req, m) => manifestFamilyGet(decodeURIComponent(m[1]))],
  ["GET",  /^\/api\/entries$/,                         (req) => entriesGet(req)],
  ["POST", /^\/api\/entries$/,                         (req) => entriesPost(req)],
  ["GET",  /^\/api\/entries\/search$/,                 (req) => entriesSearchGet(req)],
  ["GET",  /^\/api\/entries\/meta$/,                   () => entriesMetaGet()],
  ["GET",  /^\/api\/entries\/boards$/,                 (req) => boardsGet(req)],
  ["POST", /^\/api\/entries\/boards$/,                 (req) => boardsPost(req)],
  ["GET",  /^\/api\/features$/,                        (req) => featuresGet(req)],
  ["POST", /^\/api\/features$/,                        (req) => featuresPost(req)],
  ["GET",  /^\/api\/saved-filters$/,                   (req) => savedFiltersGet(req)],
  ["POST", /^\/api\/saved-filters$/,                   (req) => savedFiltersPost(req)],
  ["GET",  /^\/api\/screenshot\/([^/]+)\/([^/]+)$/,    (_req, m) => screenshotGet(decodeURIComponent(m[1]), decodeURIComponent(m[2]))],
  ["GET",  /^\/api\/media\/(.+)$/,                     (_req, m) => mediaGet(m[1].split("/").map(decodeURIComponent))],
  ["GET",  /^\/prototypes\/([^/]+)\/v(\d+)$/,          (_req, m) => prototypeGet(m[1], m[2])],
  ["GET",  /^\/prototypes\/([^/]+)\/v(\d+)\/(.+)$/,    (_req, m) => prototypeGet(m[1], m[2], m[3])],
];

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  for (const [method, pattern, handler] of routes) {
    if (request.method !== method) continue;
    const match = pathname.match(pattern);
    if (match) return handler(request, match);
  }

  // Legacy redirect preserved from the Next app
  if (pathname === "/thoughts" || pathname.startsWith("/thoughts/")) {
    return Response.redirect(`http://localhost:${PORT}${pathname.replace("/thoughts", "/bank")}${url.search}`, 307);
  }

  if (request.method === "GET") {
    // Gallery SPA static assets, then SPA fallback for navigation routes
    const assetPath = path.resolve(GALLERY_DIST, pathname.slice(1));
    if (
      pathname !== "/" &&
      assetPath.startsWith(GALLERY_DIST + path.sep) &&
      existsSync(assetPath) &&
      statSync(assetPath).isFile()
    ) {
      return serveFile(assetPath, "public, max-age=3600");
    }
    const index = path.join(GALLERY_DIST, "index.html");
    if (existsSync(index)) return serveFile(index);
    return new Response(
      "Gallery not built yet. Run: bun run build:gallery",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  return json({ error: "Not found" }, { status: 404 });
}

// ---------------------------------------------------------------------------
// node:http adapter + idle self-shutdown
// ---------------------------------------------------------------------------

let lastActivity = Date.now();

function toWebRequest(req: IncomingMessage): Request {
  const url = `http://localhost:${PORT}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) for (const v of value) headers.append(key, v);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (req as unknown as BodyInit) : undefined,
    // @ts-expect-error: required by undici for stream bodies
    duplex: "half",
  });
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  if (response.body) {
    res.end(Buffer.from(await response.arrayBuffer()));
  } else {
    res.end();
  }
}

const server = createServer(async (req, res) => {
  lastActivity = Date.now();
  try {
    await sendWebResponse(res, await route(toWebRequest(req)));
  } catch (err) {
    console.error("[studio] unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: String(err) }));
  }
});

setInterval(() => {
  if (Date.now() - lastActivity > IDLE_MS) {
    console.log(`[studio] idle for ${Math.round(IDLE_MS / 60000)} minutes — shutting down`);
    process.exit(0);
  }
}, 60_000);

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[studio] serving at http://localhost:${PORT} (idle shutdown after ${Math.round(IDLE_MS / 60000)}m)`);
});
