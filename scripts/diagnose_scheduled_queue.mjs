import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// No artifacts, deployment, or plaintext output. Only opaque IDs and gate codes leave the runner.
const repo = process.cwd();
const scratch = path.join(process.env.RUNNER_TEMP, "drugnews-scheduled-diagnostic");
await fs.mkdir(scratch, { recursive: true, mode: 0o700 });
const clock = new Date().toISOString();
const root = path.join(scratch, "baseline");
const made = spawnSync("git", ["worktree", "add", "--detach", root, "75fa1aff73938e675f8bd0f996efb81625efd10f"], { cwd: repo, encoding: "utf8" });
if (made.status) throw new Error("DIAGNOSTIC_BASELINE_CHECKOUT_FAILED");
const { prepareQueue } = await import(pathToFileURL(path.join(root, "scripts/scheduled_queue.mjs")));
const summary = await prepareQueue({ queueDir: path.join(root, "content/scheduled"), workDir: path.join(scratch, "queue"), publishedRoot: path.join(root, "content/published"), now: clock });
console.log(JSON.stringify({ phase: "baseline_prepare", clock, digest: summary.queue_digest, due: summary.due_count, pending: summary.pending_count, held: summary.held_count }));
const env = { ...process.env, DRUGNEWS_INBOX: summary.stagingRoot, DRUGNEWS_NOW: clock, DRUGNEWS_PUBLISH_PRODUCTION: "1" };
delete env.DRUGNEWS_QUEUE_KEY_B64;
delete env.DRUGNEWS_QUEUE_KEY_B64_V2;
const built = spawnSync("npm", ["run", "publish"], { cwd: root, env, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
await fs.writeFile(path.join(scratch, "build.log"), built.stdout + built.stderr, { mode: 0o600 });
if (built.status) throw new Error("DIAGNOSTIC_BUILD_FAILED");
const candidate = path.join(scratch, "public");
const copied = spawnSync("rsync", ["-a", "--exclude=.git", "--exclude=.github", "--exclude=content", "--exclude=scripts", "--exclude=node_modules", `${root}/`, `${candidate}/`], { encoding: "utf8" });
if (copied.status) throw new Error("DIAGNOSTIC_PUBLIC_COPY_FAILED");
const { auditCandidate } = await import(pathToFileURL(path.join(root, "scripts/audit_scheduled_leaks.mjs")));
try {
  const result = await auditCandidate({ root: candidate, repoRoot: root, auditFile: summary.auditFile, liveBaseUrl: "https://drugnews.com.tw" });
  console.log(JSON.stringify({ phase: "baseline_audit", ...result }));
} catch (error) {
  console.log(JSON.stringify({ phase: "baseline_audit", status: "fail", reason: error.message, failures: (error.failures || []).map(({ job_id, code, reason, surface }) => ({ job_id, code, reason, surface })) }));
}
console.log(JSON.stringify({ phase: "diagnostic_complete", published: false, artifacts_uploaded: false }));
