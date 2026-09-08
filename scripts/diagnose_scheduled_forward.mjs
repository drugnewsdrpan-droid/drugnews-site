import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Technical rehearsal of the existing ciphertext only; not content approval.
// No arbitrary ref/clock input, deployment, notification or artifact upload.
const CANDIDATE = "29cb08fd2f674668d9fd2df0d2964d353d684b0b";
const SCRATCH = "/home/runner/work/_temp/drugnews-scheduled-forward";
const CLOCKS = ["2026-09-09T07:59:59+08:00", ...Array.from({length:11}, (_, i) => `2026-09-${String(i+9).padStart(2,"0")}T08:00:00+08:00`)];
const STATES = new Set(["due", "legacy_e4", "validated_pending", "validated_revoked", "validated_superseded", "held", "duplicate"]);
const CODES = new Set(["ENTRYPOINT_ZERO", "ENTRYPOINT_DUPLICATE", "ENTRYPOINT_MISSING", "BODY_DIGEST_MISMATCH", "BODY_CANARY_MISSING", "T_PLUS_DIRECT_MISSING", "T_PLUS_IMAGE_MISSING", "T_PLUS_IMAGE_HASH_MISMATCH", "T_MINUS_DIRECT_LEAK", "T_MINUS_TEXT_LEAK", "T_MINUS_IMAGE_LEAK", "T_MINUS_GIT_TEXT_LEAK", "T_MINUS_GIT_IMAGE_LEAK"]);
const SURFACES = new Set(["companies.html", "index.html", "en/index.html", "articles/index.html", "en/articles/index.html", "sitemap.xml", "news-sitemap.xml", "image-sitemap.xml", "search-index.json", "en/search-index.json", "feed.xml", "feed.json", "en/feed.xml", "en/feed.json", "ai-index.json", "llms.txt", "knowledge-graph.json", "market-radar.json", "search-intents.json"]);
const hash = value => /^[a-f0-9]{64}$/.test(value);
const jobId = value => /^[a-f0-9]{32}$/.test(value) ? value : "INVALID_ID";

export function safeForwardInventory(audit) {
  if (audit?.schema_version !== 1 || !hash(audit.queue_digest) || !Array.isArray(audit.jobs)) throw new Error("INVENTORY_INVALID");
  return audit.jobs.map(job => {
    if (jobId(job.job_id) === "INVALID_ID" || !STATES.has(job.state) || !/^2026-09-(?:0[5-9]|1\d)T08:00:00\+08:00$/.test(job.publish_at) || !hash(job.approved_content_hash) || !Array.isArray(job.articles) || job.articles.length < 1 || job.articles.length > 2) throw new Error("INVENTORY_INVALID");
    const languages = job.articles.map(article => {
      if (!["zh","en"].includes(article.lang) || !hash(article.body_sha256) || !Array.isArray(article.images) || article.images.length !== 4) throw new Error("INVENTORY_INVALID");
      const images = article.images.map((image,index) => {
        if (image.order !== index+1 || !hash(image.sha256)) throw new Error("INVENTORY_INVALID");
        return {order:index+1, sha256:image.sha256};
      });
      return {lang:article.lang, body_sha256:article.body_sha256, images};
    }).sort((a,b) => a.lang === b.lang ? 0 : a.lang === "zh" ? -1 : 1);
    if (languages[0].lang !== "zh" || (languages[1] && languages[1].lang !== "en")) throw new Error("INVENTORY_INVALID");
    return {job_id:job.job_id, publish_at:job.publish_at, state:job.state, approved_content_hash:job.approved_content_hash, languages};
  });
}

export function safeForwardFailures(error) {
  return (Array.isArray(error?.failures) ? error.failures : []).map(item => ({job_id:jobId(item?.job_id), code:CODES.has(item?.reason) ? item.reason : "OTHER_GATE_FAILED", surface:SURFACES.has(item?.surface) ? item.surface : "OTHER_SURFACE"}));
}

async function main() {
  if (process.env.RUNNER_TEMP !== "/home/runner/work/_temp") throw new Error("INVALID_RUNNER");
  if (process.argv.includes("--cleanup")) {
    await fs.rm(SCRATCH, {recursive:true, force:true});
    console.log(JSON.stringify({phase:"cleanup", status:"pass"}));
    return;
  }
  await fs.mkdir(SCRATCH, {recursive:true, mode:0o700});
  const root = path.join(SCRATCH,"checkout");
  if (spawnSync("git", ["worktree","add","--detach",root,CANDIDATE], {cwd:process.cwd(), encoding:"utf8"}).status) throw new Error("CHECKOUT_FAILED");
  const {prepareQueue} = await import(pathToFileURL(path.join(root,"scripts/scheduled_queue.mjs")));
  const {auditCandidate} = await import(pathToFileURL(path.join(root,"scripts/audit_scheduled_leaks.mjs")));
  let digest;
  for (const [index, clock] of CLOCKS.entries()) {
    const summary = await prepareQueue({queueDir:path.join(root,"content/scheduled"), workDir:path.join(SCRATCH,"queue"), publishedRoot:path.join(root,"content/published"), now:clock});
    if (!hash(summary.queue_digest) || (digest && digest !== summary.queue_digest)) throw new Error("DIGEST_DRIFT");
    digest = summary.queue_digest;
    const audit = JSON.parse(await fs.readFile(summary.auditFile,"utf8"));
    const inventory = safeForwardInventory(audit);
    if (index === 0) console.log(JSON.stringify({phase:"authenticated_inventory", candidate:CANDIDATE, digest, jobs:inventory}));
    console.log(JSON.stringify({phase:"prepare", clock, digest, due:summary.due_count, legacy:summary.legacy_e4_count, pending:summary.pending_count, held:summary.held_count, english_approved:inventory.filter(job => job.languages.length === 2).length, english_absent:inventory.filter(job => job.languages.length === 1).length}));
    if (summary.held_count) throw new Error("HELD_QUEUE");
    const env = {...process.env, DRUGNEWS_INBOX:summary.stagingRoot, DRUGNEWS_NOW:clock, DRUGNEWS_PUBLISH_PRODUCTION:"1"};
    delete env.DRUGNEWS_QUEUE_KEY_B64;
    delete env.DRUGNEWS_QUEUE_KEY_B64_V2;
    const built = spawnSync("npm", ["run","publish"], {cwd:root, env, encoding:"utf8", maxBuffer:10*1024*1024});
    await fs.writeFile(path.join(SCRATCH,"private-build.log"), (built.stdout||"")+(built.stderr||""), {mode:0o600});
    if (built.status) throw new Error("BUILD_FAILED");
    const candidate = path.join(SCRATCH,"public");
    if (spawnSync("rsync", ["-a","--delete","--exclude=.git","--exclude=.github","--exclude=content","--exclude=scripts","--exclude=node_modules",`${root}/`,`${candidate}/`], {encoding:"utf8"}).status) throw new Error("COPY_FAILED");
    try {
      const result = await auditCandidate({root:candidate, repoRoot:root, auditFile:summary.auditFile, liveBaseUrl:"https://drugnews.com.tw"});
      console.log(JSON.stringify({phase:"audit", clock, digest, status:result.status === "pass" ? "pass" : "fail", jobs:inventory.length, public_jobs:result.public_jobs}));
    } catch (error) {
      console.log(JSON.stringify({phase:"audit", clock, digest, status:"fail", failures:safeForwardFailures(error)}));
      process.exitCode=1;
    }
  }
  console.log(JSON.stringify({phase:"forward_complete", clocks:CLOCKS.length, published:false, artifacts_uploaded:false, content_approval:false}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => {
  console.log(JSON.stringify({phase:"forward", status:"fail", code:"FORWARD_INTERNAL_FAILURE"}));
  process.exitCode=1;
});
