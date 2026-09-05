#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

export const DEFAULT_VAULT = "/Volumes/Misc/.agents/tasks";
const STAGES = ["backlog", "todo", "in-progress", "done", "canceled"];
const MARKER = ".task-vault.json";
type Options = Record<string, any>;
type Note = { path: string; hash: string; properties: Record<string, any>; body: string };
type Route = { folder: string; project: string | null; repository?: string };
type Change = { path: string; before: string | null; after: string | null };

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function git(cwd: string, args: string[]) {
  const environment: NodeJS.ProcessEnv = { ...process.env, GIT_LITERAL_PATHSPECS: "1" };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) delete environment[key];
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: environment,
  }).trim();
}
function hash(text: string) { return createHash("sha256").update(text).digest("hex"); }
function readOptional(file: string) {
  try { return fs.readFileSync(file, "utf8"); }
  catch (error: any) { if (error.code === "ENOENT") return null; throw error; }
}
function slug(value: string) {
  requireValue(typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value),
    "Project must be 1–80 letters, digits, underscores or hyphens, starting with a letter or digit.");
  return value;
}
function textOption(o: Options, key: string) {
  requireValue(typeof o[key] === "string" && o[key].trim(), `--${key} is required and must not be blank.`);
  return o[key] as string;
}
function uuid(value: string) {
  requireValue(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value), "Expected a UUID idempotency key.");
  return value.toLowerCase();
}

// Refuse symlinks, including broken links, before touching any task or config path.
function safePath(root: string, relative: string) {
  requireValue(relative && !path.isAbsolute(relative) && !relative.includes("\\") &&
    relative.split("/").every(p => p && p !== "." && p !== ".." && p !== ".git"), `Unsafe path: ${relative}`);
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    try { requireValue(!fs.lstatSync(current).isSymbolicLink(), `Symlink is not allowed: ${current}`); }
    catch (error: any) { if (error.code !== "ENOENT") throw error; }
  }
  return current;
}
function vaultRoot() {
  const root = process.env.CJL_TASK_VAULT ?? DEFAULT_VAULT;
  requireValue(path.isAbsolute(root) && root !== path.parse(root).root, "CJL_TASK_VAULT must be an absolute vault directory.");
  const normalized = path.resolve(root);
  safePath(path.parse(normalized).root, normalized.slice(path.parse(normalized).root.length));
  return normalized;
}
function validateVault(root: string) {
  const marker = readOptional(safePath(root, MARKER));
  requireValue(marker && JSON.parse(marker).version === 1, `Task vault is not initialized: ${root}. Run setup --apply.`);
  requireValue(fs.lstatSync(path.join(root, ".git")).isDirectory(), "Vault must have its own .git directory.");
  requireValue(fs.realpathSync(git(root, ["rev-parse", "--show-toplevel"])) === fs.realpathSync(root),
    "Task vault must be its own Git repository.");
}

function repository(source: string) {
  let top: string, common: string;
  try {
    top = fs.realpathSync(git(source, ["rev-parse", "--show-toplevel"]));
    common = fs.realpathSync(git(source, ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
  } catch { throw new Error("No Git project here. Supply --project, or --inbox only for explicitly separate work."); }
  // Linked worktrees use the main checkout's identity, never the worktree folder name.
  const main = path.dirname(common);
  requireValue(path.basename(common) === ".git", "Nonstandard Git directory: supply an explicit --project.");
  const configAt = (dir: string) => readOptional(safePath(dir, ".agents/task-project.json"));
  const local = configAt(top), primary = top === main ? local : configAt(main);
  const parse = (raw: string | null) => raw === null ? null : slug(JSON.parse(raw).project ?? "");
  const localName = parse(local), mainName = parse(primary);
  requireValue(top === main || localName === null || localName === mainName,
    "Worktree project identity differs from the main checkout. Align task-project.json before automatic routing.");
  return { project: mainName ?? slug(path.basename(main)), repository: common };
}
function resolveRoute(root: string, o: Options): Route {
  requireValue(!(o.project !== undefined && o.inbox), "Use either --project or --inbox.");
  if (o.inbox) return { folder: "inbox", project: null };
  const checkCase = (project: string) => {
    const directory = safePath(root, "projects");
    const alias = fs.existsSync(directory) && fs.readdirSync(directory).find(p => p !== project && p.toLowerCase() === project.toLowerCase());
    requireValue(!alias, `Project '${project}' differs only by case from '${alias}'. Use the existing spelling.`);
  };
  if (o.project !== undefined) {
    slug(o.project); checkCase(o.project);
    return { folder: `projects/${o.project}`, project: o.project };
  }
  const detected = repository(o.source ?? process.cwd());
  checkCase(detected.project);
  const folder = `projects/${detected.project}`;
  const binding = readOptional(safePath(root, `${folder}/.project.json`));
  if (binding) requireValue(JSON.parse(binding).repository === detected.repository,
    `Project name '${detected.project}' belongs to another repository. Use a distinct task-project.json or an explicit --project.`);
  else {
    const existing = fs.existsSync(safePath(root, folder)) && fs.readdirSync(path.join(root, folder)).some(f => f.endsWith(".md"));
    requireValue(!existing, `Project '${detected.project}' has no repository binding. Select it explicitly with --project.`);
  }
  return { ...detected, folder };
}

function notePath(root: string, relative: string) {
  requireValue(/^(?:inbox|projects\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79})\/[^/]+\.md$/.test(relative), "Use the exact vault-relative task path returned by list/show.");
  return safePath(root, relative);
}
function parseNote(root: string, relative: string, content?: string): Note {
  const raw = content ?? fs.readFileSync(notePath(root, relative), "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  requireValue(match, `Missing YAML frontmatter: ${relative}`);
  const properties = Bun.YAML.parse(match[1]) as Record<string, any>;
  requireValue(properties && properties.type === "task" && STAGES.includes(properties.stage), `Invalid task metadata: ${relative}`);
  const expectedProject = relative.startsWith("inbox/") ? null : relative.split("/")[1];
  requireValue(properties.project === expectedProject, `Project metadata disagrees with folder: ${relative}`);
  requireValue(typeof properties.title === "string" && properties.title.trim(), `Missing title: ${relative}`);
  requireValue(properties.stage !== "in-progress" || (properties.owner && properties.claim_id), `In-progress task lacks ownership: ${relative}`);
  return { path: relative, hash: hash(raw), properties, body: raw.slice(match[0].length) };
}
function render(note: Note) {
  return `---\n${Bun.YAML.stringify(note.properties, null, 2).trimEnd()}\n---\n${note.body}`;
}
function allPaths(root: string, folder: string): string[] {
  const full = safePath(root, folder);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith(".")) return [];
    const relative = `${folder}/${entry.name}`;
    safePath(root, relative);
    return entry.isDirectory() ? allPaths(root, relative) : entry.name.endsWith(".md") ? [relative] : [];
  }).sort();
}
function allNotes(root: string) {
  return [...allPaths(root, "inbox"), ...allPaths(root, "projects")].map(p => parseNote(root, p));
}

// Recognize only real level-two headings, not examples inside fenced code blocks.
function sections(body: string) {
  const found: { title: string; start: number; content: number; end: number }[] = [];
  let offset = 0, fence = "";
  for (const line of body.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(line)) fence = "";
    } else if (!fence) {
      const heading = line.match(/^## ([^\r\n]+)\r?\n?$/);
      if (heading) {
        if (found.length) found.at(-1)!.end = offset;
        found.push({ title: heading[1], start: offset, content: offset + line.length, end: body.length });
      }
    }
    offset += line.length;
  }
  return found;
}
function getSection(note: Note, title: string) {
  const matches = sections(note.body).filter(s => s.title === title);
  requireValue(matches.length <= 1, `Duplicate '${title}' sections in ${note.path}; clarify manually first.`);
  return matches[0] ? note.body.slice(matches[0].content, matches[0].end).trim() : "";
}
function setSection(note: Note, title: string, value: string) {
  getSection(note, title);
  const section = sections(note.body).find(s => s.title === title);
  const replacement = `## ${title}\n\n${value.trim()}\n\n`;
  note.body = section ? note.body.slice(0, section.start) + replacement + note.body.slice(section.end)
    : note.body.trimEnd() + `\n\n${replacement}`;
}
function filename(title: string) {
  let stem = title.normalize("NFC").replace(/[\x00-\x1f<>:"/\\|?*#\[\]`]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+|[. ]+$/g, "");
  while (Buffer.byteLength(stem) > 160) stem = Array.from(stem).slice(0, -1).join("");
  requireValue(stem, "Title does not contain a usable filename.");
  return stem;
}
function availablePath(root: string, folder: string, title: string, reserved: Set<string>) {
  const stem = filename(title);
  for (let i = 1; ; i++) {
    const candidate = `${folder}/${stem}${i === 1 ? "" : ` (${i})`}.md`;
    const occupied = fs.existsSync(safePath(root, folder)) ? fs.readdirSync(path.join(root, folder)) : [];
    if (!occupied.some(p => p.toLocaleLowerCase() === path.basename(candidate).toLocaleLowerCase()) &&
      ![...reserved].some(p => p.toLocaleLowerCase() === candidate.toLocaleLowerCase())) {
      reserved.add(candidate); return candidate;
    }
  }
}
function freshNote(root: string, route: Route, title: string, reserved: Set<string>, id: string = randomUUID()): Note {
  const now = new Date().toISOString();
  return {
    path: availablePath(root, route.folder, title, reserved), hash: "",
    properties: { type: "task", id, title, stage: "backlog", project: route.project, owner: null,
      claim_id: null, conversation: null, priority: null, due: null, created: now, updated: now },
    body: "\n## Context\n\n## Done when\n\n## Result\n",
  };
}
function details(note: Note, o: Options) {
  if (o.priority !== undefined) {
    requireValue(["", "urgent", "high", "medium", "low"].includes(o.priority), "Invalid --priority.");
    note.properties.priority = o.priority || null;
  }
  if (o.due !== undefined) {
    requireValue(o.due === "" || (/^\d{4}-\d{2}-\d{2}$/.test(o.due) &&
      !Number.isNaN(Date.parse(o.due)) && new Date(o.due).toISOString().slice(0, 10) === o.due), "--due must be a real YYYY-MM-DD date.");
    note.properties.due = o.due || null;
  }
  if (o.context !== undefined) setSection(note, "Context", o.context);
  if (o["done-when"] !== undefined) setSection(note, "Done when", o["done-when"]);
}

async function withLock<T>(root: string, action: () => T): Promise<T> {
  const file = path.join(root, ".git", "task.lock");
  const owner = `${process.pid}:${randomUUID()}\n`;
  const deadline = Date.now() + 5000;
  // ponytail: one lock for the local vault; partition only if measured contention warrants it.
  while (true) {
    try { fs.writeFileSync(file, owner, { flag: "wx", mode: 0o600 }); break; }
    catch (error: any) {
      if (error.code !== "EEXIST") throw error;
      requireValue(Date.now() < deadline, `Vault busy: ${file}. If its recorded process exited, inspect Git status before removing the stale lock.`);
      await Bun.sleep(40);
    }
  }
  try { return action(); }
  finally { if (readOptional(file) === owner) fs.unlinkSync(file); }
}
function atomicWrite(root: string, relative: string, text: string) {
  const target = safePath(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = path.join(root, ".git", `task-write-${randomUUID()}`);
  try {
    fs.writeFileSync(temporary, text, { flag: "wx" });
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function commitChanges(root: string, changes: Change[], message: string) {
  const actual = changes.filter(c => c.before !== c.after);
  if (!actual.length) return git(root, ["rev-parse", "HEAD"]);
  requireValue(!git(root, ["diff", "--cached", "--name-only"]), "Vault has staged changes. Commit or unstage them before a task mutation.");
  for (const c of actual) requireValue(readOptional(safePath(root, c.path)) === c.before, `File changed during operation: ${c.path}`);
  const written: Change[] = [];
  let head = "";
  try { head = git(root, ["rev-parse", "--verify", "HEAD"]); } catch { /* initial setup */ }
  try {
    for (const c of actual) {
      requireValue(readOptional(safePath(root, c.path)) === c.before, `File changed during operation: ${c.path}`);
      if (c.after === null) fs.unlinkSync(safePath(root, c.path));
      else atomicWrite(root, c.path, c.after);
      written.push(c);
    }
    git(root, ["add", "--", ...actual.map(c => c.path)]);
    git(root, ["commit", "--only", "-m", message, "--", ...actual.map(c => c.path)]);
  } catch (error: any) {
    let currentHead = "";
    try { currentHead = git(root, ["rev-parse", "--verify", "HEAD"]); } catch { /* unborn */ }
    requireValue(head === currentHead, "Git HEAD changed during a failed write; inspect the vault before retrying.");
    for (const c of written.reverse()) {
      requireValue(readOptional(safePath(root, c.path)) === c.after, `Concurrent manual edit preserved at ${c.path}; inspect vault Git status before retrying.`);
      if (c.before === null) { if (fs.existsSync(safePath(root, c.path))) fs.unlinkSync(safePath(root, c.path)); }
      else atomicWrite(root, c.path, c.before);
    }
    if (head) git(root, ["reset", "-q", "HEAD", "--", ...actual.map(c => c.path)]);
    else git(root, ["rm", "--cached", "--ignore-unmatch", "--", ...actual.map(c => c.path)]);
    throw new Error(`Task write rolled back: ${error.stderr?.toString().trim() || error.message}`);
  }
  return git(root, ["rev-parse", "HEAD"]);
}

function changeFor(root: string, note: Note): Change {
  const before = readOptional(notePath(root, note.path));
  requireValue(note.hash ? before !== null && hash(before) === note.hash : before === null, `File changed after reading: ${note.path}`);
  return { path: note.path, before, after: render(note) };
}
function routeChange(root: string, route: Route): Change[] {
  if (!route.repository) return [];
  const relative = `${route.folder}/.project.json`;
  const before = readOptional(safePath(root, relative));
  return before ? [] : [{ path: relative, before, after: JSON.stringify({ repository: route.repository }, null, 2) + "\n" }];
}
function receipt(root: string, notes: Note[], applied: boolean, commit?: string, changes?: Change[]) {
  return { vault: root, applied, ...(commit ? { commit } : {}), tasks: notes.map(n => ({
    ...n, hash: applied ? parseNote(root, n.path).hash : hash(render(n)), absolute_path: path.join(root, n.path),
  })), ...(changes ? { changes: changes.map(c => ({ path: c.path, action: c.after === null ? "delete" : c.before === null ? "create" : "update", after: c.after })) } : {}) };
}
function checkClaim(note: Note, o: Options, required = false) {
  if (required || note.properties.claim_id) {
    requireValue(note.properties.claim_id && o["claim-id"] === note.properties.claim_id,
      `Task is owned by ${note.properties.owner ?? "nobody"}; supply the current --claim-id. Handoff/release must be explicit.`);
  }
}
function active(note: Note) {
  requireValue(!["done", "canceled"].includes(note.properties.stage), "Task is finished. Reopen it explicitly with update --stage todo first.");
}

// Heal the vault-relative wikilinks generated by this CLI, including aliases and headings.
function renameLinks(root: string, notes: Note[], oldPath: string, newPath: string): Change[] {
  const oldTarget = oldPath.slice(0, -3), newTarget = newPath.slice(0, -3);
  return notes.flatMap(note => {
    if (note.path === oldPath) return [];
    const before = fs.readFileSync(notePath(root, note.path), "utf8");
    const after = before.replace(/\[\[([^\]|#]+)([^\]]*)\]\]/g, (link, target, suffix) =>
      target === oldTarget || target === oldPath ? `[[${newTarget}${suffix}]]` : link);
    return before === after ? [] : [{ path: note.path, before, after }];
  });
}

function planMutation(root: string, command: string, o: Options) {
  const route = resolveRoute(root, o);
  const reserved = new Set<string>();
  if (command === "add") {
    const title = textOption(o, "title");
    const id = o["idempotency-key"] ? uuid(o["idempotency-key"]) : randomUUID();
    const prior = allNotes(root).find(n => n.properties.id === id);
    if (prior) {
      requireValue(prior.properties.title === title && path.dirname(prior.path) === route.folder, "Idempotency key already belongs to a different task or routing.");
      return { notes: [prior], changes: [] as Change[] };
    }
    const note = freshNote(root, route, title, reserved, id);
    details(note, o);
    return { notes: [note], changes: [...routeChange(root, route), changeFor(root, note)] };
  }
  const relative = textOption(o, "path");
  requireValue(path.dirname(relative) === route.folder, "Task is outside the selected project. Select its --project or --inbox explicitly.");
  const note = parseNote(root, relative);
  requireValue(textOption(o, "expected-hash") === note.hash, "Stale task hash. Read show again and reconcile before retrying.");
  if (command !== "claim") checkClaim(note, o, ["release", "handoff", "complete"].includes(command));
  const now = new Date().toISOString();
  note.properties.updated = now;
  let changes: Change[] = [], notes = [note];
  switch (command) {
    case "update": {
      details(note, o);
      if (o.stage !== undefined) {
        requireValue(["backlog", "todo", "canceled"].includes(o.stage), "Use claim for in-progress and complete for done.");
        requireValue(!note.properties.claim_id || o.stage === "canceled", "Release the active claim before returning a task to backlog/todo.");
        note.properties.stage = o.stage;
        note.properties.claim_id = null;
        if (o.stage !== "canceled") {
          note.properties.owner = null; note.properties.conversation = null; delete note.properties.completed;
        }
      }
      requireValue(["stage", "context", "done-when", "priority", "due"].some(k => o[k] !== undefined), "No task update supplied.");
      break;
    }
    case "claim":
      active(note);
      requireValue(!note.properties.claim_id && !note.properties.owner, "Task already has an owner. Arrange a handoff or release.");
      note.properties.owner = textOption(o, "owner");
      note.properties.claim_id = randomUUID();
      note.properties.conversation = o.conversation || null;
      note.properties.stage = "in-progress";
      break;
    case "release":
      active(note);
      note.properties.owner = null; note.properties.claim_id = null; note.properties.conversation = null;
      note.properties.stage = "todo";
      break;
    case "handoff":
      active(note);
      note.properties.owner = textOption(o, "owner");
      note.properties.claim_id = randomUUID();
      note.properties.conversation = o.conversation || null;
      break;
    case "complete": {
      active(note);
      requireValue(getSection(note, "Done when"), "Record Done when before completing the task.");
      const result = textOption(o, "result"), verification = textOption(o, "verification");
      setSection(note, "Result", `${result}\n\n### Verification\n\n${verification}${o.limitations ? `\n\n### Limitations\n\n${o.limitations}` : ""}`);
      note.properties.stage = "done"; note.properties.claim_id = null; note.properties.completed = now;
      break;
    }
    case "rename": {
      const title = textOption(o, "title");
      const desired = `${route.folder}/${filename(title)}.md`;
      requireValue(desired === relative || desired.toLowerCase() !== relative.toLowerCase(), "Case-only filename changes are not supported; choose a distinct title.");
      const target = desired === relative ? relative : availablePath(root, route.folder, title, reserved);
      if (target !== relative) {
        const before = fs.readFileSync(notePath(root, relative), "utf8");
        requireValue(hash(before) === note.hash, `File changed after reading: ${relative}`);
        changes.push({ path: relative, before, after: null });
        changes.push(...renameLinks(root, allNotes(root), relative, target));
        note.hash = "";
      }
      note.path = target; note.properties.title = title;
      break;
    }
    case "split": {
      active(note);
      const titles: string[] = o.item ?? [];
      requireValue(titles.length >= 2 && titles.every(t => t.trim()), "Split requires at least two nonblank --item titles.");
      const children = titles.map(title => freshNote(root, route, title, reserved));
      for (const child of children) {
        setSection(child, "Context", `Split from [[${note.path.slice(0, -3)}]].`);
        if (o["inherit-priority"]) child.properties.priority = note.properties.priority;
        if (o["inherit-due"]) child.properties.due = note.properties.due;
      }
      setSection(note, "Superseded by", children.map(c => `- [[${c.path.slice(0, -3)}]]`).join("\n"));
      note.properties.stage = "canceled"; note.properties.claim_id = null;
      notes.push(...children);
      break;
    }
    default: throw new Error(`Unknown mutation: ${command}`);
  }
  changes.push(...notes.map(n => changeFor(root, n)));
  return { notes, changes };
}

const HELP = `task — shared Markdown task vault (Bun 1.3+ and Git)

Usage: bun <skill>/scripts/task.ts <command> [options]
Vault: CJL_TASK_VAULT or ${DEFAULT_VAULT}
Routing: --source <directory> (default cwd), --project <slug>, or explicit --inbox.

setup                          Initialize/validate the standalone Git vault.
add --title <text>              Capture a backlog task; optional --idempotency-key <UUID>.
list [--all] [--query <text>]    List the current project, or all projects and inbox.
show --path <relative.md>       Return metadata, body, and content hash.
update --path ...               --context, --done-when, --priority, --due, --stage.
rename --path ... --title ...   Rename and heal full vault-relative wikilinks.
split --path ... --item ...     Repeat --item for each approved replacement.
claim --path ... --owner ...    Claim with optional --conversation <reference>.
release --path ...              Release ownership and return to todo.
handoff --path ... --owner ...  Rotate claim; optional --conversation <reference>.
complete --path ...             Requires --result and --verification; optional --limitations.

Mutations preview by default; --apply commits. Every existing-task mutation
requires --expected-hash from show and, if claimed, the current --claim-id.
complete/release/handoff require an active claim. update cannot set done or
in-progress. Priority: urgent/high/medium/low; due: YYYY-MM-DD; empty clears.
split defaults to unowned backlog children; --inherit-priority/--inherit-due
only when explicitly requested. Setup never adopts an existing nonempty folder.
Output is JSON; errors go to stderr with a nonzero exit code.
`;

function parseOptions(args: string[]): { command: string; o: Options } {
  const command = args[0] ?? "help";
  const fields: Record<string, string[]> = {
    setup: [], add: ["title", "context", "done-when", "priority", "due", "idempotency-key"],
    list: ["all", "query"], show: ["path"],
    update: ["path", "expected-hash", "claim-id", "context", "done-when", "priority", "due", "stage"],
    rename: ["path", "expected-hash", "claim-id", "title"],
    split: ["path", "expected-hash", "claim-id", "item", "inherit-priority", "inherit-due"],
    claim: ["path", "expected-hash", "owner", "conversation"],
    release: ["path", "expected-hash", "claim-id"],
    handoff: ["path", "expected-hash", "claim-id", "owner", "conversation"],
    complete: ["path", "expected-hash", "claim-id", "result", "verification", "limitations"],
  };
  if (command === "help" || command === "--help") return { command: "help", o: {} };
  requireValue(fields[command], `Unknown command '${command}'. Run help.`);
  const flags = ["apply", "help", "inbox", "all", "inherit-priority", "inherit-due"];
  const options = Object.fromEntries(["help", ...fields[command],
    ...(command === "setup" ? ["apply"] : ["source", "project", "inbox"]),
    ...(["setup", "list", "show"].includes(command) ? [] : ["apply"]),
  ].map(key => [key, { type: flags.includes(key) ? "boolean" : "string", ...(key === "item" ? { multiple: true } : {}) }]));
  const o: Options = parseArgs({ args: args.slice(1), options: options as any, strict: true }).values;
  return { command: o.help ? "help" : command, o };
}

export async function run(args: string[]) {
  const { command, o } = parseOptions(args);
  if (command === "help") return HELP;
  const root = vaultRoot();
  if (command === "setup") {
    if (fs.existsSync(root) && fs.readdirSync(root).length) {
      validateVault(root);
      return { vault: root, initialized: true, applied: false };
    }
    if (!o.apply) return { vault: root, initialized: false, applied: false, action: "Initialize independent Git vault" };
    fs.mkdirSync(root, { recursive: true });
    git(root, ["init", "--initial-branch=main"]);
    const files = {
      [MARKER]: JSON.stringify({ version: 1 }, null, 2) + "\n",
      ".gitignore": ".DS_Store\n.obsidian/\n",
      "inbox/.gitkeep": "", "projects/.gitkeep": "",
    };
    const commit = await withLock(root, () => commitChanges(root, Object.entries(files).map(([p, text]) => ({ path: p, before: null, after: text })), "Initialize standalone task vault"));
    return { vault: root, initialized: true, applied: true, commit };
  }
  validateVault(root);
  if (command === "list") {
    requireValue(!o.all || !(o.project !== undefined || o.inbox), "--all cannot be combined with project routing.");
    const route = o.all ? null : resolveRoute(root, o);
    const notes = (route ? allPaths(root, route.folder).map(p => parseNote(root, p)) : allNotes(root))
      .filter(n => !o.query || `${n.properties.title}\n${n.body}`.toLowerCase().includes(String(o.query).toLowerCase()));
    return { vault: root, tasks: notes.map(n => ({ ...n.properties, path: n.path, absolute_path: path.join(root, n.path), hash: n.hash })) };
  }
  if (command === "show") {
    const route = resolveRoute(root, o), relative = textOption(o, "path");
    requireValue(path.dirname(relative) === route.folder, "Task is outside the selected project; use --project or --inbox explicitly.");
    const note = parseNote(root, relative);
    return { vault: root, ...note, absolute_path: path.join(root, note.path) };
  }
  const execute = () => {
    const { notes, changes } = planMutation(root, command, o);
    const commit = o.apply ? commitChanges(root, changes, `task ${command}: ${notes[0].properties.title.replace(/\s+/g, " ").slice(0, 100)}`) : undefined;
    return receipt(root, notes, !!o.apply, commit, o.apply ? undefined : changes);
  };
  return o.apply ? withLock(root, execute) : execute();
}

if (import.meta.main) {
  try {
    const result = await run(process.argv.slice(2));
    process.stdout.write(typeof result === "string" ? result : JSON.stringify(result, null, 2) + "\n");
  } catch (error: any) {
    process.stderr.write(JSON.stringify({ error: error.message }) + "\n");
    process.exitCode = 1;
  }
}
