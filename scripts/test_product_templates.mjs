import assert from "node:assert/strict";
import { renderProductTemplate, payloadHash, reportsDiscoveryErrors } from "./render_product_template.mjs";
import { reportShareScript } from './report_interface.mjs';
import { reportCollectionCandidates, mergeReportAIIndex } from './build_search_ready.mjs';
import vm from 'node:vm';

const report = await renderProductTemplate("report");
const job = await renderProductTemplate("job");
assert(report.includes("noindex,nofollow") && report.includes("版型預覽"));
assert(!report.includes("下載免費PDF") && !report.includes("{{"));
assert(report.includes('href="#report-section-1"') && report.includes('id="report-section-1"'));
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
const full = { author: "Synthetic fixture editorial", canonical_url: "https://drugnews.com.tw/reports/unit-fixture.html", revisions: [{ version: "test", date: "2026-10-07", summary: "Synthetic first test version, not published" }], title: "unit fixture", version: "test", updated_at: "2026-10-07", source_owner: "test", language: "en", coverage: "executive_summary", summary: "unit fixture", sections: [{ id: "evidence", heading: "Evidence", body: "unit fixture" }], references: [{ title: "unit source", url: "https://example.com/", date: "2026-10-07" }] };
full.original_report_schema = {"@context":"https://schema.org","@type":"Report",headline:full.title,author:{name:full.author},inLanguage:full.language,url:full.canonical_url,datePublished:"2026-10-07",isAccessibleForFree:true};
const qaFor = data => ({ author_attribution_verified: true, original_report_schema_sha256: data.original_report_schema ? payloadHash(data.original_report_schema) : undefined, independent: true, author_id: "fixture-author", reviewer_id: "fixture-reviewer", score: 100, p0: 0, p1: 0, article_ai_feel: 10, image_ai_feel: [], payload_sha256: payloadHash(data) });
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
const origin = "https://drugnews.com.tw";
const collection = '<a href="https://drugnews.com.tw/guides/clinical-endpoints.html">真指南</a>';
assert(reportsDiscoveryErrors('<a href="/articles/">文章</a>', collection, [], origin).errors.includes("REPORTS_ENTRY_MISSING_FROM_FINAL_HOMEPAGE"));
const homeWithReports = '<a href="https://drugnews.com.tw/reports/">產業研究</a>';
const withoutReport = reportsDiscoveryErrors(homeWithReports, collection, [], origin);
assert.equal(withoutReport.verifiedReportCount, 0); assert.deepEqual(withoutReport.errors, []);
assert.deepEqual(reportsDiscoveryErrors(homeWithReports, collection+'<a href="#reading-paths">同頁目錄</a>', [], origin).errors, []);
assert(reportsDiscoveryErrors(homeWithReports, '<a href="/reports/placeholder.html">test-only invalid placeholder</a>', [], origin).errors[0].startsWith("UNVERIFIED_REPORT_LINK"));
const declaredTestReport = { url: origin + "/reports/test-only.html" }; // synthetic contract input only, never a publication
assert(reportsDiscoveryErrors(homeWithReports, collection, [declaredTestReport], origin).errors[0].startsWith("REAL_REPORT_MISSING"));
console.log("Final homepage discovery counterexample, no-report state and placeholder rejection PASS.");

// These report/figure values are in-memory fixtures, never actual ADC data or acceptance.
const reordered = { ...full, sections: [{id:'numbers',heading:'Fixture numbers',body:'Fixture B'},{id:'evidence',heading:'Evidence',body:'Fixture A'}], published_anchor_ids:['evidence'], published_anchor_map:{evidence:'evidence'} };
const reorderedHTML = await renderProductTemplate('report',reordered,{preview:false,acceptance:qaFor(reordered)});
assert(reorderedHTML.includes('id="evidence"><h2>Evidence</h2>') && reorderedHTML.includes('href="#evidence"'));
assert(!reorderedHTML.includes('id="report-section-2"') && !reorderedHTML.includes('下載免費PDF'));
const lost = {...reordered, sections:reordered.sections.filter(s=>s.id!=='evidence')};
await assert.rejects(renderProductTemplate('report',lost,{preview:false,acceptance:qaFor(lost)}),/preserved/);
const moved = {...reordered, published_anchor_map:{evidence:'numbers'}};
await assert.rejects(renderProductTemplate('report',moved,{preview:false,acceptance:qaFor(moved)}),/section identity/);
for(const sections of [[{id:'same',heading:'A',body:'A'},{id:'same',heading:'B',body:'B'}],[{heading:'missing explicit ID',body:'B'}]]) {
 const bad={...full,sections};await assert.rejects(renderProductTemplate('report',bad,{preview:false,acceptance:qaFor(bad)}),/stable chapter IDs/);
}
for(const author of ['', '待原作者交稿', 'Original author pending', 'TBD']) {
 const bad={...full,author};await assert.rejects(renderProductTemplate('report',bad,{preview:false,acceptance:qaFor(bad)}),/real editorial/);
}
const noRevision={...full,revisions:[]};
await assert.rejects(renderProductTemplate('report',noRevision,{preview:false,acceptance:qaFor(noRevision)}),/revision/);
assert(reorderedHTML.includes('Versions and corrections') && reorderedHTML.includes('Synthetic first test version'));
const missingSchema={...full,original_report_schema:undefined};
await assert.rejects(renderProductTemplate('report',missingSchema,{preview:false,acceptance:qaFor(missingSchema)}),/existing Report schema/);
await assert.rejects(renderProductTemplate('report',full,{preview:false,acceptance:{...qaFor(full),original_report_schema_sha256:'tampered'}}),/existing Report schema/);
const wrongSchemaURL={...full,original_report_schema:{...full.original_report_schema,url:origin+'/reports/wrong-only.html'}};
await assert.rejects(renderProductTemplate('report',wrongSchemaURL,{preview:false,acceptance:qaFor(wrongSchemaURL)}),/existing Report schema/);

const quantitative={src:'/assets/reports/unit-only.png',alt:'Synthetic unit-test image, not a scientific figure',caption:'Synthetic caption',language:'en',kind:'quantitative',key_info:'Fixture count 150',unit:'fixture items',period:'fixture period',population:'fixture population',source_url:'https://example.com/'};
const withFigure={...full,figures:[quantitative],sections:[{...full.sections[0],figure_indices:[0]}],og_image:{src:quantitative.src,alt:quantitative.alt,width:1200,height:630}};
const figureQA=data=>({...qaFor(data),image_ai_feel:[10]});
const figureHTML=await renderProductTemplate('report',withFigure,{preview:false,acceptance:figureQA(withFigure)});
for(const value of ['Fixture count 150','fixture items','fixture period','fixture population','https://example.com/'])assert(figureHTML.includes(value));
assert(figureHTML.includes('property="og:image"') && figureHTML.includes('data-share-url="https://drugnews.com.tw/reports/unit-fixture.html#evidence"'));
for(const field of ['key_info','unit','period','population']) {
 const bad={...withFigure,figures:[{...quantitative,[field]:''}]};await assert.rejects(renderProductTemplate('report',bad,{preview:false,acceptance:figureQA(bad)}),/Quantitative/);
}
const mechanism={...quantitative,kind:'mechanism',steps:['Fixture step A','Fixture step B'],evidence_scope:'Fixture demonstration only'};
for(const field of ['key_info','unit','period','population'])delete mechanism[field];
const mechData={...withFigure,figures:[mechanism]};
const mechHTML=await renderProductTemplate('report',mechData,{preview:false,acceptance:figureQA(mechData)});
assert(mechHTML.includes('Fixture step A')&&mechHTML.includes('Fixture demonstration only')&&!mechHTML.includes('<dt>Units</dt>'));
const noSources={...withFigure,figures:[{...quantitative,source_url:undefined}]};
await assert.rejects(renderProductTemplate('report',noSources,{preview:false,acceptance:figureQA(noSources)}),/source links/);

function sharingHarness(navigator) {
 const handlers={},status={textContent:''},manual={hidden:true,value:''};
 const copy={dataset:{shareUrl:full.canonical_url+'#evidence'},addEventListener:(_,cb)=>handlers.copy=cb};
 const share={dataset:{shareUrl:full.canonical_url+'#evidence',shareTitle:'Fixture section'},addEventListener:(_,cb)=>handlers.share=cb};
 const region={querySelector:selector=>({output:status,input:manual,'[data-report-copy]':copy,'[data-report-share]':share}[selector])};
 const document={documentElement:{lang:'zh-Hant'},querySelectorAll:()=>[region]};
 vm.runInNewContext(reportShareScript().replace(/^<script>|<\/script>$/g,''),{document,navigator});
 return {status,manual,share:()=>handlers.share({currentTarget:share}),copy:()=>handlers.copy({currentTarget:copy})};
}
let copied=[];
const fallback=sharingHarness({clipboard:{writeText:async url=>copied.push(url)}});await fallback.share();assert.deepEqual(copied,[full.canonical_url+'#evidence']);
copied=[];
const cancel=sharingHarness({share:async()=>{throw {name:'AbortError'};},clipboard:{writeText:async url=>copied.push(url)}});await cancel.share();assert.equal(copied.length,0);assert(cancel.status.textContent.includes('取消'));
const denied=sharingHarness({clipboard:{writeText:async()=>{throw Error('test denied');}}});await denied.copy();assert.equal(denied.manual.hidden,false);assert.equal(denied.manual.value,full.canonical_url+'#evidence');assert(!denied.status.textContent.includes('已複製'));
copied=[];
const unavailable=sharingHarness({share:async()=>{throw Error('should not call');},canShare:()=>false,clipboard:{writeText:async url=>copied.push(url)}});await unavailable.share();assert.equal(copied.length,1);
let handed;
const native=sharingHarness({share:async data=>handed=data});await native.share();assert.equal(handed.url,full.canonical_url+'#evidence');assert(native.status.textContent.includes('裝置'));

const originalAI={schema_version:'1.0',citation_guidance:'Synthetic preserved original guidance',latest_articles:[{url:origin+'/articles/fixture.html',canonical_url:origin+'/articles/fixture.html',title:'original fixture'}]};
assert.strictEqual(mergeReportAIIndex(originalAI,[],origin),originalAI);
assert.deepEqual(reportCollectionCandidates(collection,origin),[]);
const fixtureURL=origin+'/reports/unit-fixture.html';
assert.deepEqual(reportCollectionCandidates('<a href="unit-fixture.html#evidence">Actual fixture link</a><a href="/reports/">Collection</a>',origin),[fixtureURL]);
const fixturePage={url:fixtureURL,html:'<meta property="og:image" content="https://drugnews.com.tw/assets/reports/unit-only.png">',article:{headline:'Synthetic report fixture',datePublished:'2026-10-07',inLanguage:'zh-Hant',author:{name:'Fixture editorial'},isAccessibleForFree:true}};
const merged=mergeReportAIIndex(originalAI,[fixturePage],origin);
assert.equal(merged.citation_guidance,originalAI.citation_guidance);assert.deepEqual(merged.latest_articles[1],originalAI.latest_articles[0]);assert.equal(merged.latest_articles[0].canonical_url,fixtureURL);
assert.throws(()=>mergeReportAIIndex(originalAI,[fixturePage,fixturePage],origin),/Duplicate/);
const stale={...originalAI,latest_articles:[...originalAI.latest_articles,{url:origin+'/reports/removed-fixture.html'}]};
assert.deepEqual(mergeReportAIIndex(stale,[],origin),originalAI);
console.log('Stable reordered/retained anchors, author/revision/figure extractability, optional PDF, report-only native/copy fallback, and unchanged original AI index with zero reports PASS.');
await import('./test_report_index_integration.mjs');
await import('./test_qualified_report_gate.mjs');
