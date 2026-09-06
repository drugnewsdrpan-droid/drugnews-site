import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyReceipt, requireSuccessfulDeployment } from "./verify_repair_receipt.mjs";
import { canonicalRenderedBody, sha256Text, LOCK_START, LOCK_END } from "./scheduled_content_integrity.mjs";
const commit="a".repeat(40), file="articles/2026-09-06-sample.html", canonical="https://drugnews.com.tw/"+file;
const asset="assets/articles/sample/圖.png", bytes=Buffer.from("authenticated-image");
const hash=crypto.createHash("sha256").update(bytes).digest("hex");
const html=`<link rel="canonical" href="${canonical}">${LOCK_START}<p>研究數值為 98。完整保留。</p><figure><img src="../assets/articles/sample/%E5%9C%96.png" alt="圖解"></figure>${LOCK_END}`;
const receipt={schema_version:1,commit,articles:[{url_path:file,body_sha256:sha256Text(canonicalRenderedBody(html)),lang:"zh",category:"商業分析系列",images:[{path:asset,sha256:hash}],homepage_expected:true}]};
const base={
 [file]:Buffer.from(html), [asset]:bytes,
 "sitemap.xml":Buffer.from(`<loc>${canonical}</loc>`),
 "search-index.json":Buffer.from(JSON.stringify([{url:file}])),
 "feed.json":Buffer.from(JSON.stringify({items:[{url:canonical}]})),
 "feed.xml":Buffer.from(`<link>${canonical}</link>`),
 "articles/index.html":Buffer.from('<a href="2026-09-06-sample.html">文</a>'),
 "articles/category/business-analysis.html":Buffer.from('<a href="../2026-09-06-sample.html">文</a>'),
 "index.html":Buffer.from('<a href="articles/2026-09-06-sample.html">文</a>')
};
const read=(docs)=>(async p=>({status:docs[p] ? 200:404,bytes:docs[p] || Buffer.from("missing")}));
let count=0; async function test(name,fn){await fn();count++;console.log("PASS",name);}
await test("all public content and surfaces verified", async()=>assert.equal((await verifyReceipt(receipt,read(base))).status,"PRODUCTION_CONTENT_VERIFIED"));
await test("same URL with changed number fails full-body check",async()=>await assert.rejects(()=>verifyReceipt(receipt,read({...base,[file]:Buffer.from(html.replace("98","99"))})),/LIVE_BODY_DIGEST_MISMATCH/));
await test("image exists but wrong bytes fails",async()=>await assert.rejects(()=>verifyReceipt(receipt,read({...base,[asset]:Buffer.from("wrong")})),/LIVE_IMAGE_DIGEST_MISMATCH/));
for(const surface of [file,asset,"sitemap.xml","search-index.json","feed.json","feed.xml","articles/index.html","articles/category/business-analysis.html","index.html"]){
 await test("missing required surface fails: "+surface,async()=>{const docs={...base};delete docs[surface];await assert.rejects(()=>verifyReceipt(receipt,read(docs)),/LIVE_HTTP_STATUS/);});
}
await test("stale homepage HTTP 200 still fails",async()=>await assert.rejects(()=>verifyReceipt(receipt,read({...base,"index.html":Buffer.from("old home")})),/LIVE_HOMEPAGE_ENTRY_MISMATCH/));
await test("duplicate search row fails",async()=>await assert.rejects(()=>verifyReceipt(receipt,read({...base,"search-index.json":Buffer.from(JSON.stringify([{url:file},{url:file}]))})),/LIVE_SEARCH_ENTRY_MISMATCH/));
const run={head_sha:commit,path:".github/workflows/pages.yml",event:"workflow_dispatch",status:"completed",conclusion:"success",created_at:"2026-09-06T12:00:00Z"};
const jobs=[{steps:["Deploy to GitHub Pages","Read back production E4"].map(name=>({name,status:"completed",conclusion:"success"}))}];
await test("matching fully completed native deployment accepted",()=>requireSuccessfulDeployment(run,jobs,commit,"2026-09-06T11:59:00Z"));
await test("different commit cannot pass",()=>assert.throws(()=>requireSuccessfulDeployment({...run,head_sha:"b".repeat(40)},jobs,commit,"2026-09-06T11:59:00Z"),/DEPLOYMENT_NOT_VERIFIED/));
await test("old successful deployment cannot pass",()=>assert.throws(()=>requireSuccessfulDeployment({...run,created_at:"2026-09-05T12:00:00Z"},jobs,commit,"2026-09-06T11:59:00Z"),/DEPLOYMENT_NOT_VERIFIED/));
await test("skipped E4 cannot pass",()=>assert.throws(()=>requireSuccessfulDeployment(run,[{steps:[jobs[0].steps[0],{...jobs[0].steps[1],status:"completed",conclusion:"skipped"}]}],commit,"2026-09-06T11:59:00Z"),/REQUIRED_DEPLOYMENT_STEP_NOT_PASSED/));
console.log(JSON.stringify({suite:"production-receipt-verification",tests:count,passed:count,failed:0}));
