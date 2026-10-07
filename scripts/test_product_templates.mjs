import assert from "node:assert/strict";
import { renderProductTemplate, payloadHash } from "./render_product_template.mjs";

const report = await renderProductTemplate("report");
const job = await renderProductTemplate("job");
assert(report.includes("noindex,nofollow") && report.includes("版型預覽"));
assert(!report.includes("下載免費PDF") && !report.includes("{{"));
assert(job.includes("預覽不受理應徵") && !job.includes('class="apply"') && !job.includes("JobPosting"));
await assert.rejects(renderProductTemplate("report", {}, { preview: false }), /independent acceptance/);
const payload = { title: "synthetic test-only payload", version: "test", updated_at: "2026-10-07", source_owner: "test", company: "TEST ONLY" };
const acceptance = { independent: true, author_id: "fixture-author", reviewer_id: "fixture-reviewer", score: 100, p0: 0, p1: 0, payload_sha256: payloadHash(payload) };
await assert.rejects(renderProductTemplate("job", payload, { preview: false, acceptance }), /Employer-confirmed/);
await assert.rejects(renderProductTemplate("report", { ...payload, title: "changed" }, { preview: false, acceptance }), /Same-version/);
const escaped = await renderProductTemplate("report", { title: '<script>alert("x")</script>' });
assert(!escaped.includes('<script>alert("x")</script>'));
console.log("Product templates: preview disclosure, no false PDF/job, independent gate, same-version binding, and escaping PASS.");

// Synthetic in-memory fixtures only; no customer order, payment, file or publication.
const full = { title: "unit fixture", version: "test", updated_at: "2026-10-07", source_owner: "test", language: "en", coverage: "executive_summary", summary: "unit fixture", sections: [{ heading: "Evidence", body: "unit fixture" }], references: [{ title: "unit source", url: "https://example.com/", date: "2026-10-07" }] };
const qaFor = data => ({ independent: true, author_id: "fixture-author", reviewer_id: "fixture-reviewer", score: 100, p0: 0, p1: 0, article_ai_feel: 10, image_ai_feel: [], payload_sha256: payloadHash(data) });
for (const score of [NaN, Infinity, 94, 101, "100"]) await assert.rejects(renderProductTemplate("report", full, { preview: false, acceptance: { ...qaFor(full), score } }), /independent acceptance/);
for (const article_ai_feel of [null, "10", NaN, -1, 21]) await assert.rejects(renderProductTemplate("report", full, { preview: false, acceptance: { ...qaFor(full), article_ai_feel } }), /AI Feel/);
for (const bad of [{ ...full, sections: [{}] }, { ...full, references: [{ url: "https://example.com/" }] }, { ...full, title: " " }]) await assert.rejects(renderProductTemplate("report", bad, { preview: false, acceptance: qaFor(bad) }));
const jobData = { title: "unit fixture", version: "test", updated_at: "2026-10-07", source_owner: "test", company: "synthetic test only", location: "test", salary: "test", responsibilities: "test", requirements: "test", official_apply_url: "https://example.com/", valid_through: "2026-10-07T12:00:00+08:00" };
const jobQA = data => ({ ...qaFor(data), employer_publication_confirmed: true, payment_verified: true, commission_evidence_ref: "synthetic unit test, not a payment or order" });
await assert.rejects(renderProductTemplate("job", jobData, { preview: false, acceptance: jobQA(jobData) }), /Employer-confirmed/);
const completeJob = { ...jobData, employment_type: "unit test" };
const atDeadline = await renderProductTemplate("job", completeJob, { preview: false, acceptance: jobQA(completeJob), now: completeJob.valid_through });
assert(atDeadline.includes("已截止") && !atDeadline.includes('class="apply"'));
console.log("Affected invalid QA, incomplete payload and exact deadline boundaries PASS.");
