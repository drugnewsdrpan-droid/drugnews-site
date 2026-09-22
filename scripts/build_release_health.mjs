import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PUBLIC_STATES = new Set(["due", "duplicate", "legacy_e4"]);
export function releaseHealth(audit, commit, now = new Date()) {
  const actual = new Date(now).getTime();
  if (!/^[a-f0-9]{40}$/.test(commit || "") || audit?.schema_version !== 1 || !Array.isArray(audit.jobs) || audit.jobs.length > 28 || !Number.isFinite(actual) || !Number.isFinite(Date.parse(audit.clock)) || Date.parse(audit.clock) > actual) throw new Error("HEALTH_INPUT_INVALID");
  const seen = new Set();
  const jobs = audit.jobs.filter(job => PUBLIC_STATES.has(job.state)).map(job => {
    if (!/^[a-f0-9]{32}$/.test(job.job_id || "") || seen.has(job.job_id) || !/^\d{4}-\d{2}-\d{2}T08:00:00\+08:00$/.test(job.publish_at || "") || !Number.isFinite(Date.parse(job.publish_at)) || Date.parse(job.publish_at) > Math.min(actual, Date.parse(audit.clock)) || !Array.isArray(job.articles) || job.articles.length < 1 || job.articles.length > 2) throw new Error("HEALTH_PUBLIC_JOB_INVALID");
    if (new Date(job.publish_at).toISOString().slice(0, 10) !== job.publish_at.slice(0, 10)) throw new Error("HEALTH_CALENDAR_INVALID");
    seen.add(job.job_id);
    const paths = job.articles.map(article => {
      if (!/^articles\/\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(article.url_path || "") || !article.url_path.startsWith("articles/" + job.publish_at.slice(0, 10) + "-")) throw new Error("HEALTH_PATH_INVALID");
      return article.url_path;
    });
    if (new Set(paths).size !== paths.length) throw new Error("HEALTH_DUPLICATE_PATH");
    return { id: job.job_id, at: job.publish_at, paths };
  });
  const result = { schema: 1, commit, generated_at: new Date(actual).toISOString(), eligible_until: audit.clock, jobs };
  if (Buffer.byteLength(JSON.stringify(result)) > 32768) throw new Error("HEALTH_SIZE_LIMIT");
  return result;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const i = arg.indexOf("="); return [arg.slice(0, i), arg.slice(i + 1)]; }));
  if (Object.keys(args).sort().join() !== "--audit-file,--commit,--output") throw new Error("HEALTH_ARGUMENTS_INVALID");
  const audit = JSON.parse(await fs.readFile(args["--audit-file"], "utf8"));
  const receipt = releaseHealth(audit, args["--commit"]);
  await fs.writeFile(args["--output"], JSON.stringify(receipt) + "\n");
  console.log(JSON.stringify({ status: "DUE_ONLY_HEALTH_BUILT", public_jobs: receipt.jobs.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => { console.error("RELEASE_HEALTH_FAILED_CLOSED"); process.exitCode = 1; });
