import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Fixed reviewed revisions, no arbitrary ref input. No deployment or uploaded artifacts.
const BASELINE = "75fa1aff73938e675f8bd0f996efb81625efd10f";
const CANDIDATE = "29cb08fd2f674668d9fd2df0d2964d353d684b0b";
const SAFE_REASONS = new Set(["ENTRYPOINT_ZERO", "ENTRYPOINT_DUPLICATE", "ENTRYPOINT_MISSING", "BODY_DIGEST_MISMATCH", "BODY_CANARY_MISSING", "T_PLUS_DIRECT_MISSING", "T_PLUS_IMAGE_MISSING", "T_PLUS_IMAGE_HASH_MISMATCH", "T_MINUS_DIRECT_LEAK", "T_MINUS_TEXT_LEAK", "T_MINUS_IMAGE_LEAK", "T_MINUS_GIT_TEXT_LEAK", "T_MINUS_GIT_IMAGE_LEAK"]);
const SAFE_SURFACES = new Set(["companies.html", "index.html", "en/index.html", "articles/index.html", "en/articles/index.html", "sitemap.xml", "news-sitemap.xml", "image-sitemap.xml", "search-index.json", "en/search-index.json", "feed.xml", "feed.json", "en/feed.xml", "en/feed.json", "ai-index.json", "llms.txt", "knowledge-graph.json", "market-radar.json", "search-intents.json"]);
async function main() {
  if (process.env.RUNNER_TEMP !== "/home/runner/work/_temp") throw new Error("INVALID_RUNNER");
  const scratch = "/home/runner/work/_temp/drugnews-scheduled-diagnostic";
  if (process.argv.includes("--cleanup")) {
    await fs.rm(scratch, {recursive:true, force:true});
    console.log(JSON.stringify({phase:"cleanup", status:"pass"}));
    return;
  }
  await fs.mkdir(scratch, {recursive:true, mode:0o700});
  const repo = process.cwd();
  const clock = new Date().toISOString();
  for (const [phase, sha] of [["baseline", BASELINE], ["candidate", CANDIDATE]]) {
    const root = path.join(scratch, phase);
    const made = spawnSync("git", ["worktree", "add", "--detach", root, sha], {cwd:repo, encoding:"utf8"});
    if (made.status) throw new Error("CHECKOUT_FAILED");
    const {prepareQueue} = await import(pathToFileURL(path.join(root, "scripts/scheduled_queue.mjs")));
    const summary = await prepareQueue({queueDir:path.join(root,"content/scheduled"), workDir:path.join(scratch,phase+"-queue"), publishedRoot:path.join(root,"content/published"), now:clock});
    console.log(JSON.stringify({phase, stage:"prepare", digest:summary.queue_digest, due:summary.due_count, pending:summary.pending_count, held:summary.held_count}));
    const env = {...process.env, DRUGNEWS_INBOX:summary.stagingRoot, DRUGNEWS_NOW:clock, DRUGNEWS_PUBLISH_PRODUCTION:"1"};
    delete env.DRUGNEWS_QUEUE_KEY_B64;
    delete env.DRUGNEWS_QUEUE_KEY_B64_V2;
    const built = spawnSync("npm", ["run","publish"], {cwd:root, env, encoding:"utf8", maxBuffer:10*1024*1024});
    await fs.writeFile(path.join(scratch,phase+"-build.log"), (built.stdout||"")+(built.stderr||""), {mode:0o600});
    if (built.status) throw new Error("BUILD_FAILED");
    const candidate = path.join(scratch,phase+"-public");
    const copied = spawnSync("rsync", ["-a","--exclude=.git","--exclude=.github","--exclude=content","--exclude=scripts","--exclude=node_modules",`${root}/`,`${candidate}/`], {encoding:"utf8"});
    if (copied.status) throw new Error("COPY_FAILED");
    const {auditCandidate} = await import(pathToFileURL(path.join(root,"scripts/audit_scheduled_leaks.mjs")));
    try {
      const result = await auditCandidate({root:candidate, repoRoot:root, auditFile:summary.auditFile, liveBaseUrl:"https://drugnews.com.tw"});
      console.log(JSON.stringify({phase, stage:"audit", ...result}));
    } catch (error) {
      const failures = (Array.isArray(error.failures) ? error.failures : []).map(item => ({
        job_id:/^[a-f0-9]{32}$/.test(item.job_id) ? item.job_id : "INVALID_ID",
        code:SAFE_REASONS.has(item.reason) ? item.reason : "OTHER_GATE_FAILED",
        surface:SAFE_SURFACES.has(item.surface) ? item.surface : "OTHER_SURFACE"
      }));
      console.log(JSON.stringify({phase, stage:"audit", status:"fail", code:"AUDIT_FAILED", failures}));
      if (phase === "candidate") process.exitCode=1;
    }
  }
  console.log(JSON.stringify({phase:"diagnostic_complete", published:false, artifacts_uploaded:false}));
}
main().catch(() => {
  console.log(JSON.stringify({phase:"diagnostic", status:"fail", code:"DIAGNOSTIC_INTERNAL_FAILURE"}));
  process.exitCode=1;
});
