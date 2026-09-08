import { afterAll, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const script = path.resolve(import.meta.dir, "../scripts/task.ts");
const temporaryRoots: string[] = [];
const env = { ...process.env, GIT_AUTHOR_NAME: "Task Test", GIT_AUTHOR_EMAIL: "task-test@example.invalid",
  GIT_COMMITTER_NAME: "Task Test", GIT_COMMITTER_EMAIL: "task-test@example.invalid" };
const serviceRoot = process.env.CJL_LIFE_OS_ROOT || "/Volumes/Misc/life_os";
function git(root: string, ...args: string[]) {
  return execFileSync("git", ["-C", root, ...args], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function fixture() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "task-client-test-"));
  temporaryRoots.push(root);
  const vault = path.join(root, "my-life");
  fs.mkdirSync(path.join(vault, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(vault, "pages"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps/pi-mono/src"), { recursive: true });
  fs.writeFileSync(path.join(vault, "tasks.base"), "views: []\n");
  fs.writeFileSync(path.join(vault, "pages/Existing Project.md"), "---\ntype: project\nstatus: active\ngroup: Work\n---\n");
  // Exercise the real LifeOS service through an isolated checkout entrypoint.
  const bridge = [
    "import {runTaskCli,taskBooleans,taskRepeats} from " + JSON.stringify(path.join(serviceRoot, "apps/pi-mono/src/task-cli.ts")) + ";",
    "import {parseCliArgs} from " + JSON.stringify(path.join(serviceRoot, ".agents/lib/common.ts")) + ";",
    "try { const args=parseCliArgs(process.argv.slice(2),{booleanOptions:taskBooleans,repeatableOptions:taskRepeats});",
    "console.log(JSON.stringify(runTaskCli(args,{vaultRoot:" + JSON.stringify(vault) + ",db:" + JSON.stringify(path.join(root, "ledger.sqlite")) + "})));",
    "} catch(e) {console.error(JSON.stringify({error:e.message})); process.exitCode=1;}",
  ].join("\n");
  fs.writeFileSync(path.join(root, "apps/pi-mono/src/task-cli.ts"), bridge);
  fs.writeFileSync(path.join(root, ".gitignore"), "ledger.sqlite*\n.agents/state/\n");
  git(root, "init", "-q"); git(root, "add", "."); git(root, "commit", "-qm", "fixture");
  const call = (args: string[], ok = true, extraEnv = {}) => {
    const result = Bun.spawnSync([process.execPath, script, ...args], {
      cwd: root, env: { ...env, CJL_LIFE_OS_ROOT: root, ...extraEnv }, stdout: "pipe", stderr: "pipe",
    });
    if (ok && result.exitCode) throw new Error(result.stderr.toString());
    if (!ok) { expect(result.exitCode).not.toBe(0); return JSON.parse(result.stderr.toString()); }
    return JSON.parse(result.stdout.toString());
  };
  const add = (title: string, extra: string[] = []) => call(["add", "--title", title, "--inbox", "--idempotency-key", randomUUID(), ...extra, "--apply"]);
  return { root, vault, call, add };
}
afterAll(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { recursive: true, force: true });
});

test("setup validates LifeOS and never initializes a standalone store", () => {
  const f = fixture(), before = git(f.root, "rev-parse", "HEAD");
  expect(f.call(["setup"]).vaultRoot).toBe(f.vault);
  expect(f.call(["setup", "--apply"]).valid).toBe(true);
  expect(fs.existsSync(path.join(f.vault, ".git"))).toBe(false);
  expect(git(f.root, "rev-parse", "HEAD")).toBe(before);
  expect(f.call(["setup"], false, { CJL_TASK_VAULT: path.join(f.root, "old") }).error).toContain("retired");
  expect(fs.existsSync(path.join(f.root, "old"))).toBe(false);
  expect(f.call(["setup"], false, { CJL_LIFE_OS_ROOT: path.join(f.root, "missing") }).error).toContain("unavailable");
});

test("capture confirms its project, keeps exact audit input, and retries without duplicates", () => {
  const f = fixture();
  expect(f.call(["add", "--title", "Not confirmed"]).confirmationRequired).toBe(true);
  f.call(["add", "--title", "Not confirmed", "--apply"], false);
  expect(f.call(["list", "--all"]).tasks).toHaveLength(0);
  const key = randomUUID();
  const args = ["add", "--title", "Keep : this / wording?", "--project", "pages/Existing Project.md", "--idempotency-key", key, "--apply"];
  const added = f.call(args);
  expect(added.properties.projects).toEqual(["[[pages/Existing Project]]"]);
  expect(added.properties.group).toBe("Work");
  expect(added.properties.title).toBeUndefined();
  expect(f.call(args).taskPath).toBe(added.taskPath);
  expect(f.call(["list", "--all"]).tasks).toHaveLength(1);
  f.call(["add", "--title", "Changed", "--project", "pages/Existing Project.md", "--idempotency-key", key, "--apply"], false);
  f.call(["add", "--title", "Invalid", "--project", "pages/Unknown.md", "--idempotency-key", randomUUID(), "--apply"], false);
  const general = f.add("Intentionally separate");
  expect(general.properties.projects).toEqual([]);
  expect(general.taskPath).toStartWith("tasks/");
});

test("repository mappings suggest, never approve, and worktrees share the main suggestion", () => {
  const f = fixture();
  fs.mkdirSync(path.join(f.root, ".agents"), { recursive: true });
  fs.writeFileSync(path.join(f.root, ".agents/task-project.json"), '{"project_path":"pages/Existing Project.md"}');
  git(f.root, "add", ".agents/task-project.json"); git(f.root, "commit", "-qm", "mapping");
  expect(f.call(["projects"]).suggestion.path).toBe("pages/Existing Project.md");
  expect(f.call(["add", "--title", "Still requires approval"]).confirmationRequired).toBe(true);
  const worktree = path.join(f.root, "worktree");
  git(f.root, "worktree", "add", "--detach", worktree, "HEAD");
  expect(f.call(["projects", "--source", worktree]).suggestion.path).toBe("pages/Existing Project.md");
  fs.writeFileSync(path.join(worktree, ".agents/task-project.json"), "{}");
  f.call(["projects", "--source", worktree], false);
  expect(f.call(["list", "--all"]).tasks).toHaveLength(0);
});

test("the thin client preserves additive tags, stale-write rejection, and verified completion", () => {
  const f = fixture();
  const added = f.add("Agent work", ["--context", "A bounded problem.", "--done-when", "The outcome is observed.", "--tag", "ui/navigation"]);
  const show = () => f.call(["show", "--path", added.taskPath]);
  const edit = (action: string, args: string[]) => {
    const current = show();
    return f.call([action, "--path", current.path, "--expected-hash", current.hash,
      ...(current.properties.claim_id ? ["--claim-id", current.properties.claim_id] : []), ...args, "--apply"]);
  };
  edit("update", ["--tag", "writing/essay"]);
  expect(show().properties.tags).toEqual(["ui/navigation", "writing/essay"]);
  expect(f.call(["list", "--tag", "ui"]).tasks).toHaveLength(1);
  f.call(["update", "--path", added.taskPath, "--expected-hash", added.hash, "--priority", "high", "--apply"], false);
  edit("claim", ["--owner", "specific-agent"]);
  const claimed = show();
  f.call(["update", "--path", added.taskPath, "--expected-hash", claimed.hash, "--priority", "high", "--apply"], false);
  edit("complete", ["--result", "Implemented outcome.", "--verification", "Assertions pass.", "--limitations", "Local only."]);
  expect(show().properties.stage).toBe("done");
  expect(show().body).toContain("Assertions pass.");
  expect(show().properties.owner).toBe("specific-agent");
});

test("invalid paths and dirty targets do not write", () => {
  const f = fixture(), added = f.add("Preserve manual work");
  const before = git(f.root, "rev-parse", "HEAD");
  f.call(["update", "--path", "../escape.md", "--expected-hash", added.hash, "--priority", "high", "--apply"], false);
  const file = path.join(f.vault, added.taskPath);
  fs.appendFileSync(file, "\nManual edit.\n");
  const dirty = fs.readFileSync(file, "utf8");
  const shown = f.call(["show", "--path", added.taskPath]);
  f.call(["update", "--path", added.taskPath, "--expected-hash", shown.hash, "--priority", "high", "--apply"], false);
  expect(fs.readFileSync(file, "utf8")).toBe(dirty);
  expect(git(f.root, "rev-parse", "HEAD")).toBe(before);
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
