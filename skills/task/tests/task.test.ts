import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

const script = path.resolve(import.meta.dir, "../scripts/task.ts");
const temporaryRoots: string[] = [];
const env = {
  ...process.env, GIT_AUTHOR_NAME: "Task Test", GIT_AUTHOR_EMAIL: "task-test@example.invalid",
  GIT_COMMITTER_NAME: "Task Test", GIT_COMMITTER_EMAIL: "task-test@example.invalid",
};
function git(cwd: string, ...args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function fixture(name = "example") {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "task-vault-test-"));
  temporaryRoots.push(root);
  const vault = path.join(root, "vault"), repo = path.join(root, name);
  fs.mkdirSync(repo);
  git(repo, "init", "--initial-branch=main");
  git(repo, "commit", "--allow-empty", "-m", "test repository");
  const call = (args: string[], cwd = repo, ok = true) => {
    const result = Bun.spawnSync([process.execPath, script, ...args], {
      cwd, env: { ...env, CJL_TASK_VAULT: vault }, stdout: "pipe", stderr: "pipe",
    });
    const stdout = result.stdout.toString(), stderr = result.stderr.toString();
    if (ok && result.exitCode !== 0) throw new Error(`${args.join(" ")}: ${stderr}`);
    if (!ok) { expect(result.exitCode).not.toBe(0); return JSON.parse(stderr); }
    return JSON.parse(stdout);
  };
  const setup = () => call(["setup", "--apply"]);
  const add = (title = "Fix the actual problem", args: string[] = []) => call(["add", "--title", title, ...args, "--apply"]).tasks[0];
  const show = (p: string, args: string[] = []) => call(["show", "--path", p, ...args]);
  const change = (command: string, note: any, args: string[] = [], ok = true) => call([
    command, "--path", note.path, "--expected-hash", note.hash,
    ...(note.properties.claim_id ? ["--claim-id", note.properties.claim_id] : []), ...args, "--apply",
  ], repo, ok);
  return { root, vault, repo, call, setup, add, show, change };
}
afterAll(() => {
  for (const root of temporaryRoots) {
    if (path.basename(root).startsWith("task-vault-test-")) fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("vault and routing", () => {
  test("setup preview creates nothing; applied setup owns a separate repository", () => {
    const f = fixture();
    expect(f.call(["setup"]).applied).toBe(false);
    expect(fs.existsSync(f.vault)).toBe(false);
    f.setup();
    expect(git(f.vault, "rev-parse", "--show-toplevel")).toBe(f.vault);
    expect(fs.existsSync(path.join(f.vault, "inbox"))).toBe(true);
    expect(f.call(["setup", "--apply"]).applied).toBe(false);
    const before = git(f.vault, "rev-parse", "HEAD");
    expect(f.call(["add", "--title", "Preview only"]).applied).toBe(false);
    expect(f.call(["list"]).tasks).toEqual([]);
    expect(git(f.vault, "rev-parse", "HEAD")).toBe(before);
    expect(fs.readdirSync(path.join(f.vault, "projects"))).toEqual([".gitkeep"]);
    expect(git(f.repo, "status", "--porcelain")).toBe("");
  });
  test("setup refuses nonempty directories, and a wrong override never falls back", () => {
    const f = fixture();
    fs.mkdirSync(f.vault); fs.writeFileSync(path.join(f.vault, "important.md"), "Preserve me");
    expect(f.call(["setup", "--apply"], f.repo, false).error).toContain("not initialized");
    expect(fs.readFileSync(path.join(f.vault, "important.md"), "utf8")).toBe("Preserve me");
    expect(fs.existsSync(path.join(f.vault, ".git"))).toBe(false);
  });
  test("default project, override, separate inbox, and unrecognized arguments", () => {
    const f = fixture("sick-skills"); f.setup();
    const initialHead = git(f.repo, "rev-parse", "HEAD");
    const title = "Keep : my / exact wording?";
    const note = f.add(title);
    expect(note.path).toStartWith("projects/sick-skills/");
    expect(note.properties.title).toBe(title);
    expect(note.properties.stage).toBe("backlog");
    expect(note.properties.owner).toBeNull();
    expect(f.add("Separate", ["--inbox"]).path).toStartWith("inbox/");
    expect(f.add("Different project", ["--project", "WR"]).path).toStartWith("projects/WR/");
    expect(f.call(["list"]).tasks).toHaveLength(1);
    expect(f.call(["list", "--all"]).tasks).toHaveLength(3);
    expect(git(f.repo, "rev-parse", "HEAD")).toBe(initialHead);
    expect(git(f.repo, "status", "--porcelain")).toBe("");
    expect(f.call(["add", "--title", "No route", "--apply"], f.root, false).error).toContain("No Git project");
    f.call(["add", "--title", "Wrong", "--project", "WR", "--inbox", "--apply"], f.repo, false);
    f.call(["add", "--title", "Wrong", "--stage", "done", "--apply"], f.repo, false);
    f.call(["add", "--title", "Wrong", "--project", "", "--apply"], f.repo, false);
    expect(f.call(["list", "--all"]).tasks).toHaveLength(3);
  });
  test("custom project identity and malformed configuration", () => {
    const f = fixture(); f.setup();
    fs.mkdirSync(path.join(f.repo, ".agents"));
    const config = path.join(f.repo, ".agents/task-project.json");
    fs.writeFileSync(config, JSON.stringify({ project: "custom-project" }));
    expect(f.add().path).toStartWith("projects/custom-project/");
    fs.writeFileSync(config, "{}");
    f.call(["add", "--title", "Wrong", "--apply"], f.repo, false);
    fs.writeFileSync(config, '{"project":123}');
    f.call(["add", "--title", "Wrong type", "--apply"], f.repo, false);
    expect(f.call(["list", "--all"]).tasks).toHaveLength(1);
    expect(f.call(["add", "--title", "Explicit", "--project", "custom-project", "--apply"]).tasks[0].path).toContain("custom-project");
  });
  test("linked worktrees share the main project and cannot silently change identity", () => {
    const f = fixture("WR"); f.setup();
    fs.mkdirSync(path.join(f.repo, ".agents"));
    fs.writeFileSync(path.join(f.repo, ".agents/task-project.json"), '{"project":"viewer"}');
    git(f.repo, "add", ".agents/task-project.json"); git(f.repo, "commit", "-m", "Project identity");
    const wt = path.join(f.root, "codex-worktree-123");
    git(f.repo, "worktree", "add", "-b", "codex/test", wt);
    const note = f.add();
    expect(f.call(["list"], wt).tasks[0].path).toBe(note.path);
    expect(f.call(["add", "--title", "From worktree", "--apply"], wt).tasks[0].path).toStartWith("projects/viewer/");
    fs.writeFileSync(path.join(wt, ".agents/task-project.json"), '{"project":"diverged"}');
    expect(f.call(["list"], wt, false).error).toContain("differs from the main");
  });
  test("two repositories with the same name fail unless explicitly routed", () => {
    const f = fixture(); f.setup(); f.add();
    const other = path.join(f.root, "nested/example");
    fs.mkdirSync(other, { recursive: true }); git(other, "init");
    expect(f.call(["add", "--title", "Collision", "--apply"], other, false).error).toContain("another repository");
    expect(f.call(["list", "--project", "example"], other).tasks).toHaveLength(1);
    expect(f.call(["add", "--title", "Wrong case", "--project", "Example", "--apply"], other, false).error).toContain("differs only by case");
  });
  test("traversal, symlinks, and out-of-project task paths cannot write", () => {
    const f = fixture(); f.setup(); const n = f.add();
    f.call(["add", "--title", "Unsafe", "--project", "../../escape", "--apply"], f.repo, false);
    f.call(["show", "--path", "projects/example/../../escape.md"], f.repo, false);
    f.call(["show", "--path", n.path, "--project", "WR"], f.repo, false);
    const outside = path.join(f.root, "outside"); fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(f.vault, "projects/linked"));
    f.call(["add", "--title", "Unsafe", "--project", "linked", "--apply"], f.repo, false);
    expect(fs.readdirSync(outside)).toEqual([]);
  });
});

test("targeted installation backs up the old skill outside discovery and leaves others alone", () => {
  const f = fixture();
  const agent = path.join(f.root, "agent"), skills = path.join(agent, "skills");
  fs.mkdirSync(path.join(skills, "task"), { recursive: true });
  fs.writeFileSync(path.join(skills, "task/SKILL.md"), "Original skill content");
  const unrelated = path.join(skills, "unrelated");
  fs.symlinkSync("/old/sick-skills/skills/unrelated", unrelated);
  const installer = path.resolve(import.meta.dir, "../../../install.sh");
  execFileSync("bash", [installer, "--skill", "task", "--target", skills], { env, stdio: "pipe" });
  expect(fs.realpathSync(path.join(skills, "task"))).toBe(path.resolve(import.meta.dir, ".."));
  expect(fs.readlinkSync(unrelated)).toBe("/old/sick-skills/skills/unrelated");
  const backups = fs.readdirSync(path.join(agent, "skill-backups"));
  expect(backups).toHaveLength(1);
  expect(fs.readFileSync(path.join(agent, "skill-backups", backups[0], "task/SKILL.md"), "utf8")).toBe("Original skill content");
  execFileSync("bash", [installer, "--skill", "task", "--target", skills], { env, stdio: "pipe" });
  expect(fs.readdirSync(path.join(agent, "skill-backups"))).toHaveLength(1);
});

describe("task lifecycle and preservation", () => {
  test("capture retry and filename collisions", () => {
    const f = fixture(); f.setup(); const id = randomUUID();
    const n = f.add("Same title", ["--idempotency-key", id]);
    const head = git(f.vault, "rev-parse", "HEAD");
    expect(f.add("Same title", ["--idempotency-key", id]).path).toBe(n.path);
    expect(git(f.vault, "rev-parse", "HEAD")).toBe(head);
    expect(f.add("Same title").path).toContain(" (2).md");
    f.call(["add", "--title", "Other", "--idempotency-key", id, "--apply"], f.repo, false);
    expect(f.call(["list"]).tasks).toHaveLength(2);
  });
  test("stale writes fail and manual metadata/body survive a current update", () => {
    const f = fixture(); f.setup(); const n = f.add();
    const file = path.join(f.vault, n.path);
    const raw = fs.readFileSync(file, "utf8").replace("type: task", 'custom_field: ["keep", "this"]\ntype: task') +
      "\n## Decisions\n\nKeep this authored paragraph.\n\n```markdown\n## Done when\nExample only\n```\n";
    fs.writeFileSync(file, raw);
    expect(f.change("update", n, ["--context", "Stale"], false).error).toContain("Stale task hash");
    const current = f.show(n.path);
    const updated = f.change("update", current, ["--context", "Actual problem", "--done-when", "Observable outcome"]).tasks[0];
    expect(updated.properties.custom_field).toEqual(["keep", "this"]);
    expect(updated.body).toContain("Keep this authored paragraph.");
    expect(updated.body).toContain("```markdown\n## Done when\nExample only\n```");
    expect(updated.body).toContain("Actual problem");
    expect(f.show(n.path).hash).toBe(updated.hash);
    expect(git(f.vault, "status", "--porcelain")).toBe("");
  });
  test("claim, handoff, release, and verified completion", () => {
    const f = fixture(); f.setup(); let n = f.add("Bounded outcome", ["--done-when", "The observable outcome works."]);
    n = f.change("claim", n, ["--owner", "codex:session-a", "--conversation", "actual-session-reference"]).tasks[0];
    const firstClaim = n.properties.claim_id;
    expect(n.properties.stage).toBe("in-progress");
    f.call(["update", "--path", n.path, "--expected-hash", n.hash, "--context", "Wrong owner", "--apply"], f.repo, false);
    f.change("update", n, ["--stage", "done"], false);
    f.change("update", n, ["--stage", "todo"], false);
    n = f.change("handoff", n, ["--owner", "claude:session-b"]).tasks[0];
    expect(n.properties.claim_id).not.toBe(firstClaim);
    expect(n.properties.conversation).toBeNull();
    n = f.change("release", n).tasks[0];
    expect(n.properties.owner).toBeNull(); expect(n.properties.stage).toBe("todo");
    n = f.change("claim", n, ["--owner", "Chris"]).tasks[0];
    f.change("complete", n, ["--result", "Done"], false);
    n = f.change("complete", n, ["--result", "Implemented the requested behavior.", "--verification", "Acceptance check passed.", "--limitations", "Local sessions only."]).tasks[0];
    expect(n.properties.stage).toBe("done"); expect(n.properties.owner).toBe("Chris");
    expect(n.properties.claim_id).toBeNull(); expect(n.properties.completed).toBeTruthy();
    expect(n.body).toContain("### Verification\n\nAcceptance check passed.");
    expect(n.body).toContain("Local sessions only.");
    n = f.change("update", n, ["--stage", "todo"]).tasks[0];
    expect(n.properties.owner).toBeNull(); expect(n.properties.completed).toBeUndefined();
    expect(n.body).toContain("Implemented the requested behavior.");
  });
  test("completion cannot proceed without acceptance conditions", () => {
    const f = fixture(); f.setup(); let n = f.add();
    n = f.change("claim", n, ["--owner", "session-a"]).tasks[0];
    expect(f.change("complete", n, ["--result", "Done", "--verification", "Checked"], false).error).toContain("Done when");
    expect(f.show(n.path).properties.stage).toBe("in-progress");
  });
  test("split and rename preserve identity, ownership, and generated links", () => {
    const f = fixture(); f.setup(); let n = f.add("Two independent outcomes", ["--priority", "high", "--due", "2026-09-15"]);
    n = f.change("claim", n, ["--owner", "session-a"]).tasks[0];
    const split = f.change("split", n, ["--item", "First outcome", "--item", "Second outcome", "--inherit-priority"]);
    const [parent, first, second] = split.tasks;
    expect(parent.properties.stage).toBe("canceled");
    expect(parent.properties.claim_id).toBeNull();
    expect(first.properties.owner).toBeNull(); expect(second.properties.stage).toBe("backlog");
    expect(first.properties.priority).toBe("high"); expect(first.properties.due).toBeNull();
    expect(first.body).toContain(`[[${n.path.slice(0, -3)}]]`);
    expect(git(f.vault, "show", "--pretty=format:", "--name-only", split.commit).split("\n")).toHaveLength(3);
    const renamed = f.change("rename", first, ["--title", "Renamed outcome"]).tasks[0];
    expect(renamed.properties.id).toBe(first.properties.id);
    expect(fs.existsSync(path.join(f.vault, first.path))).toBe(false);
    expect(f.show(parent.path).body).toContain(`[[${renamed.path.slice(0, -3)}]]`);
    expect(f.show(parent.path).body).not.toContain(`[[${first.path.slice(0, -3)}]]`);
  });
  test("invalid dates, priorities and incomplete split leave no changes", () => {
    const f = fixture(); f.setup(); const n = f.add(); const head = git(f.vault, "rev-parse", "HEAD");
    f.change("update", n, ["--due", "2026-02-30"], false);
    f.change("update", n, ["--priority", "critical"], false);
    f.change("split", n, ["--item", "Only one"], false);
    expect(git(f.vault, "rev-parse", "HEAD")).toBe(head);
    expect(f.call(["list"]).tasks).toHaveLength(1);
  });
});

describe("tags and subtags", () => {
  test("capture normalizes tags and parent filters respect boundaries and routing", () => {
    const f = fixture(); f.setup();
    const nested = f.add("Clearer navigation", ["--tag", " #UI/Navigation ", "--tag", "accessibility", "--tag", "ui/navigation"]);
    expect(nested.properties.tags).toEqual(["ui/navigation", "accessibility"]);
    expect(fs.readFileSync(path.join(f.vault, nested.path), "utf8")).toContain("- ui/navigation");
    const parent = f.add("UI polish", ["--tag", "ui"]);
    f.add("Separate topic", ["--tag", "uikit"]);
    f.add("Untagged");
    const other = f.add("Other project", ["--project", "other", "--tag", "ui/navigation/menus"]);
    const inbox = f.add("Separate general work", ["--inbox", "--tag", "ui"]);
    expect(f.call(["list", "--tag", "#UI"]).tasks.map((n: any) => n.id).sort()).toEqual([nested.properties.id, parent.properties.id].sort());
    expect(f.call(["list", "--tag", "ui/navigation"]).tasks.map((n: any) => n.id)).toEqual([nested.properties.id]);
    expect(f.call(["list", "--tag", "ui", "--tag", "accessibility"]).tasks).toHaveLength(1);
    expect(f.call(["list", "--tag", "ui", "--query", "clearer"]).tasks).toHaveLength(1);
    expect(f.call(["list", "--tag", "ui", "--query", "Separate"]).tasks).toEqual([]);
    expect(f.call(["list", "--all", "--tag", "ui"]).tasks).toHaveLength(4);
    expect(f.call(["list", "--all", "--tag", "ui/navigation"]).tasks).toHaveLength(2);
    expect(f.call(["list", "--project", "other", "--tag", "ui"]).tasks[0].id).toBe(other.properties.id);
    expect(f.call(["list", "--inbox", "--tag", "ui"]).tasks[0].id).toBe(inbox.properties.id);
  });
  test("tag edits preview, add, remove exactly, replace, and retain conflict guards", () => {
    const f = fixture(); f.setup(); let n = f.add("Tagged work", ["--tag", "ui", "--tag", "ui/navigation"]);
    const head = git(f.vault, "rev-parse", "HEAD");
    const preview = f.call(["update", "--path", n.path, "--expected-hash", n.hash, "--tag", "accessibility"]);
    expect(preview.applied).toBe(false);
    expect(preview.tasks[0].properties.tags).toEqual(["ui", "ui/navigation", "accessibility"]);
    expect(f.show(n.path).hash).toBe(n.hash);
    expect(git(f.vault, "rev-parse", "HEAD")).toBe(head);
    const old = n;
    n = f.change("update", n, ["--tag", "accessibility", "--tag", "UI"]).tasks[0];
    expect(n.properties.tags).toEqual(["ui", "ui/navigation", "accessibility"]);
    expect(f.change("update", old, ["--tag", "stale"], false).error).toContain("Stale task hash");
    n = f.change("update", n, ["--remove-tag", "#UI", "--remove-tag", "accessibility"]).tasks[0];
    expect(n.properties.tags).toEqual(["ui/navigation"]);
    n = f.change("claim", n, ["--owner", "session-a"]).tasks[0];
    expect(f.call(["update", "--path", n.path, "--expected-hash", n.hash, "--clear-tags", "--apply"], f.repo, false).error).toContain("current --claim-id");
    n = f.change("update", n, ["--clear-tags", "--tag", "writing/essay"]).tasks[0];
    expect(n.properties.tags).toEqual(["writing/essay"]);
    expect(n.properties.owner).toBe("session-a");
    expect(n.properties.stage).toBe("in-progress");
    n = f.change("update", n, ["--clear-tags"]).tasks[0];
    expect(n.properties.tags).toEqual([]);
  });
  test("legacy tasks need no migration and manual tag spelling is preserved", () => {
    const f = fixture(); f.setup(); const n = f.add();
    const file = path.join(f.vault, n.path);
    const raw = fs.readFileSync(file, "utf8").replace(/^tags:\s*\[\]\n/m, "");
    expect(raw).not.toContain("tags:");
    fs.writeFileSync(file, raw);
    const head = git(f.vault, "rev-parse", "HEAD");
    expect(f.show(n.path).properties.tags).toEqual([]);
    expect(f.show(n.path).hash).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(f.call(["list"]).tasks[0].tags).toEqual([]);
    expect(f.call(["list", "--tag", "ui"]).tasks).toEqual([]);
    expect(fs.readFileSync(file, "utf8")).toBe(raw);
    expect(git(f.vault, "rev-parse", "HEAD")).toBe(head);
    fs.writeFileSync(file, raw.replace("type: task", "tags: [UI/Navigation]\ncustom_field: keep\ntype: task"));
    expect(f.call(["list", "--tag", "ui"]).tasks).toHaveLength(1);
    const updated = f.change("update", f.show(n.path), ["--tag", "ui/navigation", "--tag", "accessibility"]).tasks[0];
    expect(updated.properties.tags).toEqual(["UI/Navigation", "accessibility"]);
    expect(updated.properties.custom_field).toBe("keep");
    expect(f.change("update", updated, ["--remove-tag", "ui/navigation"]).tasks[0].properties.tags).toEqual(["accessibility"]);
  });
  test("lifecycle preserves tags and split only inherits them explicitly", () => {
    const f = fixture(); f.setup(); let n = f.add("Tagged outcome", ["--tag", "ui/navigation", "--done-when", "Navigation is clear"]);
    n = f.change("claim", n, ["--owner", "session-a"]).tasks[0];
    n = f.change("handoff", n, ["--owner", "session-b"]).tasks[0];
    n = f.change("release", n).tasks[0];
    n = f.change("claim", n, ["--owner", "session-c"]).tasks[0];
    n = f.change("rename", n, ["--title", "Renamed tagged outcome"]).tasks[0];
    n = f.change("complete", n, ["--result", "Clear navigation", "--verification", "Checked"]).tasks[0];
    expect(n.properties.tags).toEqual(["ui/navigation"]);
    const parent = f.add("Split tagged work", ["--tag", "ui/navigation"]);
    const split = f.change("split", parent, ["--item", "One", "--item", "Two"]);
    expect(split.tasks.map((t: any) => t.properties.tags)).toEqual([["ui/navigation"], [], []]);
    const other = f.add("Inherit tagged work", ["--tag", "ui/navigation"]);
    const inherited = f.change("split", other, ["--item", "Three", "--item", "Four", "--inherit-tags"]);
    expect(inherited.tasks.map((t: any) => t.properties.tags)).toEqual([["ui/navigation"], ["ui/navigation"], ["ui/navigation"]]);
  });
  test("invalid tags and contradictory edits fail without changes", () => {
    const f = fixture(); f.setup(); const n = f.add(); const head = git(f.vault, "rev-parse", "HEAD");
    for (const tag of ["", " ", "#", "123", "ui//navigation", "/ui", "ui/", "two words", "ui.nav", "../ui"]) {
      expect(f.call(["add", "--title", "Invalid", "--tag", tag, "--apply"], f.repo, false).error).toContain("Invalid tag");
      expect(f.change("update", n, ["--tag", tag], false).error).toContain("Invalid tag");
      expect(f.call(["list", "--tag", tag], f.repo, false).error).toContain("Invalid tag");
    }
    expect(f.change("update", n, ["--tag", "ui", "--remove-tag", "#UI"], false).error).toContain("same tag");
    expect(f.change("update", n, ["--clear-tags", "--remove-tag", "ui"], false).error).toContain("not both");
    expect(f.change("update", n, ["--remove-tag", "ui//nav"], false).error).toContain("Invalid tag");
    expect(git(f.vault, "rev-parse", "HEAD")).toBe(head);
    expect(git(f.vault, "status", "--porcelain")).toBe("");
    expect(f.show(n.path).hash).toBe(n.hash);
    const file = path.join(f.vault, n.path), raw = fs.readFileSync(file, "utf8");
    for (const invalid of ["ui/navigation", "[123]", "{ui: navigation}"]) {
      const malformed = raw.replace(/^tags:\s*\[\]\n/m, `tags: ${invalid}\n`);
      fs.writeFileSync(file, malformed);
      expect(f.call(["show", "--path", n.path], f.repo, false).error).toContain("YAML list of strings");
      expect(fs.readFileSync(file, "utf8")).toBe(malformed);
    }
  });
});

describe("transactions", () => {
  test("two concurrent claim attempts produce exactly one winner", async () => {
    const f = fixture(); f.setup(); const n = f.add();
    const claim = async (owner: string) => {
      const proc = Bun.spawn([process.execPath, script, "claim", "--path", n.path, "--expected-hash", n.hash, "--owner", owner, "--apply"], {
        cwd: f.repo, env: { ...env, CJL_TASK_VAULT: f.vault }, stdout: "pipe", stderr: "pipe",
      });
      const [code, stdout, stderr] = await Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      return { code, stdout, stderr };
    };
    const results = await Promise.all([claim("session-a"), claim("session-b")]);
    expect(results.map(r => r.code).sort()).toEqual([0, 1]);
    expect(results.find(r => r.code === 1)!.stderr).toContain("Stale task hash");
    const actual = f.show(n.path);
    expect(["session-a", "session-b"]).toContain(actual.properties.owner);
    expect(actual.hash).toBe(createHash("sha256").update(fs.readFileSync(path.join(f.vault, n.path))).digest("hex"));
    expect(fs.existsSync(path.join(f.vault, ".git/task.lock"))).toBe(false);
  });
  test("failed split commit restores parent and removes all proposed children", () => {
    const f = fixture(); f.setup(); const n = f.add();
    const before = fs.readFileSync(path.join(f.vault, n.path), "utf8");
    const hook = path.join(f.vault, ".git/hooks/pre-commit");
    fs.writeFileSync(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    expect(f.change("split", n, ["--item", "Child one", "--item", "Child two"], false).error).toContain("rolled back");
    expect(fs.readFileSync(path.join(f.vault, n.path), "utf8")).toBe(before);
    expect(f.call(["list"]).tasks).toHaveLength(1);
    expect(git(f.vault, "status", "--porcelain")).toBe("");
  });
  test("failed completion restores both status and Result", () => {
    const f = fixture(); f.setup(); let n = f.add("Acceptance", ["--done-when", "Pass the check"]);
    n = f.change("claim", n, ["--owner", "session-a"]).tasks[0];
    const before = fs.readFileSync(path.join(f.vault, n.path), "utf8");
    fs.writeFileSync(path.join(f.vault, ".git/hooks/pre-commit"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    f.change("complete", n, ["--result", "Complete", "--verification", "Checked"], false);
    expect(fs.readFileSync(path.join(f.vault, n.path), "utf8")).toBe(before);
    expect(f.show(n.path).properties.stage).toBe("in-progress");
  });
  test("unrelated edits survive and staged changes block mutations", () => {
    const f = fixture(); f.setup(); const n = f.add();
    const manual = path.join(f.vault, "Personal.md"); fs.writeFileSync(manual, "My edits");
    const updated = f.change("update", n, ["--context", "Supported context"]).tasks[0];
    expect(git(f.vault, "show", "--pretty=format:", "--name-only", "HEAD")).toBe(n.path);
    expect(fs.readFileSync(manual, "utf8")).toBe("My edits");
    git(f.vault, "add", "Personal.md");
    expect(f.change("update", updated, ["--context", "Blocked"], false).error).toContain("staged changes");
    expect(f.show(n.path).body).toContain("Supported context");
    expect(git(f.vault, "diff", "--cached", "--name-only")).toBe("Personal.md");
  });
});
