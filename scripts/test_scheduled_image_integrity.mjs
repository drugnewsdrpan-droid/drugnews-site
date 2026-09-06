import assert from "node:assert/strict";
import crypto from "node:crypto";
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
console.log(JSON.stringify({suite:"scheduled-image-integrity",tests:count,passed:count,failed:0}));
