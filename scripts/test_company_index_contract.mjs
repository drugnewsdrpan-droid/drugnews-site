import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { matchCompanyArticles, companyIndexArticlePaths } from "./company_index_contract.mjs";
import { writeIndexNowBrief } from "./audit_scheduled_leaks.mjs";

const bbb = { title: "Blood-brain barrier delivery", summary: "Central nervous system platforms", category: "商業分析系列", topic: "BD / 授權", date: "2026-09-08", url: "articles/bbb.html", tags: [] };
assert.equal(matchCompanyArticles([bbb], ["BD"]).length, 1, "original category retained in topic must reach company cards");
assert.equal(matchCompanyArticles([{...bbb, topic: "SBDX"}], ["BD"]).length, 0, "short tokens require word boundaries");
assert.equal(matchCompanyArticles([{...bbb, lang: "en"}], ["BD"]).length, 0, "English content is not placed in the Chinese company index");
const seven = Array.from({length: 7}, (_, i) => ({...bbb, title: `Article ${i}`, date: `2026-09-${String(9 + i).padStart(2, "0")}`, url: `articles/a${i}.html`}));
const selected = companyIndexArticlePaths([bbb, ...seven]);
assert.equal(selected.has(bbb.url), false, "old eligible article outside the six-card capacity is not required");
assert.equal(selected.has(seven[0].url), false);
assert.equal(selected.has(seven[6].url), true);
assert.equal(selected.size, 6);
const root = await fs.mkdtemp(path.join(os.tmpdir(), "dn-company-index-"));
try {
  const auditFile = path.join(root, "audit.json");
  const output = path.join(root, "indexnow.json");
  await fs.writeFile(auditFile, JSON.stringify({ schema_version: 1, clock: "2026-09-08T05:00:00Z", queue_digest: "test", jobs: [
    {job_id: "1", state: "due", publish_at: "2026-09-08T08:00:00+08:00", articles: [{url_path: "articles/overdue.html"}]},
    {job_id: "2", state: "validated_pending", publish_at: "2026-09-09T08:00:00+08:00", articles: [{url_path: "articles/future.html"}]},
    {job_id: "3", state: "held", publish_at: "2026-09-08T08:00:00+08:00", articles: [{url_path: "articles/held.html"}]}
  ]}));
  await writeIndexNowBrief({ auditFile, output });
  assert.deepEqual(JSON.parse(await fs.readFile(output, "utf8")).search_submission_urls, ["https://drugnews.com.tw/articles/overdue.html"]);
} finally {
  await fs.rm(root, {recursive: true, force: true});
}
console.log(JSON.stringify({suite: "company-index-and-overdue", status: "pass", checks: 8}));
