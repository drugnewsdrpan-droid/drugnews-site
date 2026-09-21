import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { buildResponsiveCover } from "./build_article_media.mjs";
import { auditBodyImageReferences as audit, scheduledDisplayAssets, publicRequestUrl } from "./scheduled_image_integrity.mjs";
import { markdownToHtml } from "./article_body_renderer.mjs";
import { LOCK_START, LOCK_END } from "./scheduled_content_integrity.mjs";
const wrap = (s) => `${LOCK_START}${s}${LOCK_END}`;
const page = "https://drugnews.com.tw/articles/2026-09-06-sample.html";
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
let count = 0;
function test(name, fn) { fn(); count++; console.log("PASS", name); }
const image = (name) => ({ path: `assets/articles/sample/${name}`, sha256: hash(name) });
const node = (name, alt="圖解") => `<img src="../assets/articles/sample/${encodeURIComponent(name)}" alt="${alt}">`;
function check(html, names) { return audit(html, {images:names.map(image)}, page); }
for (const name of ["figure-01.png", "圖 一.png", "A&B.png", "100%.png", "literal%20.png", "a#b.png", "a?b.png"]) {
 test("exact URL encoding: " + name, () => assert.equal(check(wrap(node(name)), [name]), ""));
}
test("single quoted absolute same-origin URL", () => assert.equal(check(wrap("<img alt='x' src='https://drugnews.com.tw/assets/articles/sample/x.png'>"),["x.png"]), ""));
test("original order accepted", () => assert.equal(check(wrap(node("a.png")+node("b.png")),["a.png","b.png"]), ""));
test("order swapped rejected", () => assert.equal(check(wrap(node("b.png")+node("a.png")),["a.png","b.png"]), "IMAGE_REFERENCE_OR_ORDER_MISMATCH"));
test("missing image rejected", () => assert.equal(check(wrap(node("a.png")),["a.png","b.png"]), "IMAGE_COUNT_MISMATCH"));
test("extra image rejected", () => assert.equal(check(wrap(node("a.png")+node("b.png")),["a.png"]), "IMAGE_COUNT_MISMATCH"));
test("blank alt rejected", () => assert.equal(check(wrap(node("a.png","  ")),["a.png"]), "IMAGE_ALT_MISSING"));
test("metadata and hero cannot mask a missing body image", () => assert.equal(check(node("a.png")+wrap("<p>body</p>"),["a.png"]), "IMAGE_COUNT_MISMATCH"));
test("off-site same filename rejected", () => assert.equal(check(wrap('<img alt="x" src="https://evil.example/assets/articles/sample/a.png">'),["a.png"]), "IMAGE_REFERENCE_OR_ORDER_MISMATCH"));
test("invalid percent escape rejected", () => assert.equal(check(wrap('<img alt="x" src="../assets/articles/sample/%ZZ.png">'),["%ZZ.png"]), "IMAGE_REFERENCE_OR_ORDER_MISMATCH"));
test("script image text cannot pass", () => assert.equal(check(wrap('<script>'+node("a.png")+'</script>'),["a.png"]), "IMAGE_COUNT_MISMATCH"));
test("protected segments around share controls keep order", () => assert.equal(check(wrap(node("a.png"))+node("irrelevant.png")+wrap(node("b.png")),["a.png","b.png"]), ""));
const payload = { slug:"sample", files: [720,1400].map((size) => ({ path:`images/圖-${size}.webp`, sha256:hash(String(size)) })) };
const responsive = { ...image("圖.png"), ...scheduledDisplayAssets(payload,{responsive_inline_images:true},{path:"images/圖.png"}) };
const md="![圖解](images/圖.png)";
const responsiveHtml=wrap(markdownToHtml(md,new Map([["images/圖.png","../assets/articles/sample/"+encodeURIComponent("圖.png")]]),{responsive_inline_images:true}));
test("actual production renderer responsive references accepted with authenticated variants", () => assert.equal(audit(responsiveHtml,{images:[responsive]},page), ""));
test("missing authenticated 1400 variant rejected", () => assert.equal(audit(responsiveHtml,{images:[{...responsive,rendered_assets:responsive.rendered_assets.filter((v)=>!v.path.includes("1400"))}]},page), "IMAGE_RENDERED_ASSET_UNAUTHENTICATED"));
test("missing authenticated 720 variant rejected", () => assert.equal(audit(responsiveHtml,{images:[{...responsive,rendered_assets:responsive.rendered_assets.filter((v)=>!v.path.includes("720"))}]},page), "IMAGE_RENDERED_ASSET_UNAUTHENTICATED"));
test("bad responsive hash descriptor rejected", () => assert.equal(audit(responsiveHtml,{images:[{...responsive,rendered_assets:responsive.rendered_assets.map((v)=>({...v,sha256:"wrong"}))}]},page), "IMAGE_RENDERED_ASSET_UNAUTHENTICATED"));
test("off-site srcset rejected", () => assert.equal(audit(responsiveHtml.replace('../assets/articles/sample/%E5%9C%96-720.webp','https://evil.example/f.webp'),{images:[responsive]},page), "IMAGE_SRCSET_UNAUTHENTICATED"));
test("original source hash retained", () => assert.equal(responsive.sha256,image("圖.png").sha256));
test("non-responsive asset unchanged", () => assert.deepEqual(scheduledDisplayAssets(payload,{}, {path:"images/圖.png"}), {}));
test("live requests encode literal query/hash as filename characters", () => {
 const u = new URL(publicRequestUrl("assets/articles/sample/a?#.png", "https://drugnews.com.tw/"));
 assert.equal(u.search, ""); assert.equal(u.hash, ""); assert.equal(decodeURIComponent(u.pathname), "/assets/articles/sample/a?#.png");
});
test("live requests preserve literal percent filenames without decoding twice", () => assert.match(publicRequestUrl("assets/articles/sample/literal%20.png", "https://drugnews.com.tw/"), /literal%2520\.png$/));
function budgetFixture(html, files = {}, setup = () => {}) {
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drugnews-image-budget-"));
 const root = path.join(temp, "site");
 try {
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, "index.html"), html);
  for (const [name, bytes] of Object.entries(files)) {
   const file = path.join(root, name);
   fs.mkdirSync(path.dirname(file), {recursive:true});
   fs.writeFileSync(file, Buffer.alloc(bytes));
  }
  setup(root, temp);
  return spawnSync(process.execPath, [fileURLToPath(new URL("./audit_image_budget.mjs", import.meta.url))], {cwd:root, encoding:"utf8"});
 } finally { fs.rmSync(temp, {recursive:true, force:true}); }
}
const budgetImg = (src) => `<img fetchpriority="high" src="${src}">`;
const pharmaCover = "assets/articles/pharmaessentia-besremi-et-mimrylo-fda/01_九月新訊_三層證據_豐富版_20260918-720.webp";
test("budget reproducer: Pharma encoded Chinese cover resolves to native filename", () => {
 const url = pharmaCover.split("/").map(encodeURIComponent).join("/");
 const result = budgetFixture(budgetImg(url), {[pharmaCover]:1});
 assert.equal(result.status, 0, result.stderr);
});
for (const [name, url, file] of [
 ["plain ASCII", "assets/cover-720.webp", "assets/cover-720.webp"],
 ["native Unicode and spaces", "assets/中文 圖-720.webp", "assets/中文 圖-720.webp"],
 ["encoded Unicode and spaces", "assets/%E4%B8%AD%E6%96%87%20%E5%9C%96-720.webp", "assets/中文 圖-720.webp"],
 ["decode once", "assets/literal%2520-720.webp", "assets/literal%20-720.webp"],
 ["literal encoded punctuation", "assets/a%3Fb%23c%25-720.webp", "assets/a?b#c%-720.webp"],
 ["query and fragment", "assets/cover-720.webp?v=a,b#preview", "assets/cover-720.webp"],
 ["site-root URL", "/assets/cover-720.webp?v=1#preview", "assets/cover-720.webp"],
 ["double encoded dot segment is a literal directory", "assets/%252e%252e/cover-720.webp", "assets/%2e%2e/cover-720.webp"]
]) test("budget URL: " + name, () => {
 const result = budgetFixture(budgetImg(url), {[file]:1});
 assert.equal(result.status, 0, result.stderr);
 assert.equal(JSON.parse(result.stdout).rows.length, 1);
});
test("budget srcset and preload retain every responsive candidate", () => {
 const result = budgetFixture('<link rel="preload" imagesrcset="assets/%E5%9C%96%20%E4%B8%80-720.webp 720w, assets/%E5%9C%96%20%E4%B8%80-1400.webp 1400w">', {"assets/圖 一-720.webp":200000,"assets/圖 一-1400.webp":500000});
 assert.equal(result.status, 0, result.stderr);
 assert.deepEqual(JSON.parse(result.stdout).rows.map((row) => row.budget), [200000,500000]);
});
for (const [file, bytes] of [["cover-720.webp",200001],["cover-1400.webp",500001]]) test("budget remains fail-closed above limit: " + file, () => {
 const result = budgetFixture(budgetImg(file), {[file]:bytes});
 assert.equal(result.status, 1);
 assert.equal(JSON.parse(result.stdout).failures.length, 1);
});
test("budget genuine missing file still fails", () => {
 const result = budgetFixture(budgetImg("assets/missing-720.webp"));
 assert.notEqual(result.status, 0);
 assert.match(result.stderr, /ENOENT/);
});
for (const url of ["../outside-720.webp", "%2e%2e/outside-720.webp", "assets/%2Foutside.webp", "assets/%ZZ.webp", "file:///tmp/outside.webp", "//example.test/cover.webp"]) test("budget rejects unsafe or malformed URL: " + url, () => {
 const result = budgetFixture(budgetImg(url), {}, (_root, temp) => fs.writeFileSync(path.join(temp,"outside-720.webp"), "x"));
 assert.notEqual(result.status, 0);
});
test("budget rejects a symlink outside the site root", () => {
 const result = budgetFixture(budgetImg("linked-720.webp"), {}, (root,temp) => {
  const outside = path.join(temp,"outside-720.webp");
  fs.writeFileSync(outside,"x"); fs.symlinkSync(outside,path.join(root,"linked-720.webp"));
 });
 assert.notEqual(result.status, 0);
 assert.match(result.stderr, /IMAGE_BUDGET_PATH_OUTSIDE_ROOT/);
});
test("budget in-root symlink retains the requested 720 limit", () => {
 const result = budgetFixture(budgetImg("linked-720.webp?cache=1#image"), {"actual.webp":200001}, (root) => {
  fs.symlinkSync(path.join(root,"actual.webp"),path.join(root,"linked-720.webp"));
 });
 assert.equal(result.status, 1);
 assert.equal(JSON.parse(result.stdout).failures[0].budget, 200000);
});
test("budget keeps existing external HTTP image handling", () => {
 const result = budgetFixture(budgetImg("https://example.test/remote.webp")+budgetImg("local.webp"), {"local.webp":1});
 assert.equal(result.status, 0, result.stderr);
 assert.equal(JSON.parse(result.stdout).rows.length, 1);
});
const mediaTemp = fs.mkdtempSync(path.join(os.tmpdir(), "drugnews-cover-derivatives-"));
try {
 const sharp = createRequire(import.meta.url)("sharp");
 const source = path.join(mediaTemp, "原圖 空格%20.png");
 const destination = path.join(mediaTemp, "public", "原圖 空格%20");
 await sharp({create:{width:1600,height:900,channels:3,background:"#135642"}}).png().toFile(source);
 const original = fs.readFileSync(source);
 const rows = await buildResponsiveCover(source, destination, {onlyMissing:true});
 test("missing cover variants generated under unchanged budgets", () => {
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row)=>row.budget), [200000,500000]);
  assert(rows.every((row)=>row.pass));
 });
 for (const [size,quality] of [[720,74],[1400,80]]) {
  const output = `${destination}-${size}.webp`;
  const info = await sharp(output).metadata();
  const expected = await sharp(source).resize({width:size,withoutEnlargement:true}).webp({quality,effort:5}).toBuffer();
  test(`cover ${size}: same established resize/encoding, full aspect ratio`, () => {
   assert.equal(info.format,"webp"); assert.equal(info.width,size); assert.equal(info.height,Math.round(size*9/16));
   assert.equal(hash(fs.readFileSync(output)),hash(expected));
  });
 }
 const before = rows.map((row)=>({hash:hash(fs.readFileSync(row.output)),mtime:fs.statSync(row.output).mtimeMs}));
 await buildResponsiveCover(source, destination, {onlyMissing:true});
 test("existing derivatives and approved original are not rewritten", () => {
  assert.deepEqual(rows.map((row)=>({hash:hash(fs.readFileSync(row.output)),mtime:fs.statSync(row.output).mtimeMs})),before);
  assert.deepEqual(fs.readFileSync(source),original);
 });
 await assert.rejects(buildResponsiveCover(path.join(mediaTemp,"missing.png"), destination, {onlyMissing:true}),{code:"ENOENT"});
 test("missing original fails even when both derivatives exist",()=>{});
 fs.writeFileSync(`${destination}-720.webp`,Buffer.alloc(200001));
 const excessive = await buildResponsiveCover(source,destination,{onlyMissing:true});
 test("existing oversized derivative fails budget without being overwritten",()=>assert.equal(excessive[0].pass,false));
 const invalid = path.join(mediaTemp,"invalid.png"); fs.writeFileSync(invalid,"not an image");
 await assert.rejects(buildResponsiveCover(invalid,path.join(mediaTemp,"invalid")),/unsupported image format/i);
 test("corrupt original is rejected, not skipped",()=>{});
 const cli = spawnSync(process.execPath,[fileURLToPath(new URL("./build_article_media.mjs",import.meta.url)),"cover",source,path.join(mediaTemp,"cli")],{encoding:"utf8"});
 test("existing media cover CLI remains compatible",()=>{assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).count,2);});
} finally { fs.rmSync(mediaTemp,{recursive:true,force:true}); }
console.log(JSON.stringify({suite:"scheduled-image-integrity",tests:count,passed:count,failed:0}));
