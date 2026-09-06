import assert from "node:assert/strict";
import { canonicalMarkdownBody, canonicalRenderedBody, sha256Text, bodyCanaries, LOCK_START, LOCK_END } from "./scheduled_content_integrity.mjs";
import { renderApprovedBody, markdownToHtml } from "./article_body_renderer.mjs";
import { inferSeries, marketRadarValidationError } from "./article_public_contract.mjs";

const tests = [];
function test(name, fn) { tests.push([name, fn]); }
const wrap = (s) => `${LOCK_START}${s}${LOCK_END}`;
const canonical = (s) => canonicalRenderedBody(wrap(s));
const fixtures = [
  ["Chinese strong punctuation", "這是**重要**資訊。", "這是重要資訊。"],
  ["Chinese inline link", "請看[研究](https://example.invalid/study)。", "請看研究。"],
  ["inline code", "使用`marker`進行測試。", "使用marker進行測試。"],
  ["English strong", "The **clinical** result.", "The clinical result."],
  ["nested strong link", "**請看[研究](https://example.invalid/study)**。", "請看研究。"],
  ["thematic break", "第一段\n\n---\n\n第二段", "第一段 第二段"],
  ["long thematic break", "甲\n\n-------\n\n乙", "甲 乙"],
  ["literal inline hyphens", "x---y 與 IL-6", "x---y 與 IL-6"],
  ["heading", "## 第一節\n\n本文。", "第一節 本文。"],
  ["ordered list", "1. 第一項\n2. 第二項", "第一項 第二項"],
  ["unordered list", "- 第一項\n- 第二項", "第一項 第二項"],
  ["figure excluded", "本文\n\n![示意圖](images/figure.png)\n\n下文", "本文 下文"],
  ["table", "| 項目 | 數值 |\n| --- | --- |\n| 劑量 | 25 |", "項目 數值 劑量 25"],
  ["inline underscore retained", "marker_name 是識別字", "marker_name 是識別字"],
  ["literal tilde retained", "約 ~25 mg", "約 ~25 mg"],
  ["fenced code punctuation retained", "```js\nconst x_y = a | b;\n```", "const x_y = a | b;"],
  ["escaped literal markup retained", "<risk> 尚待證实", "<risk> 尚待證实"],
  ["references", "## 參考資料\n\n1. [研究](https://example.invalid/r)\n2. [試驗](https://example.invalid/t)", "參考資料 研究 試驗"],
  ["block quote", "> 第一段\n> 第二段", "第一段 第二段"],
  ["normal whitespace", "甲\r\n\r\n乙", "甲 乙"],
];
for (const [name, markdown, expected] of fixtures) test(name, () => {
  assert.equal(canonicalMarkdownBody(markdown, ""), expected);
  assert.equal(canonical(renderApprovedBody(markdown, "")), expected);
});

test("only leading title and standard Chinese disclaimer omitted", () => {
  const md = "# Synthetic title\n\n正文。\n\n本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";
  assert.equal(canonicalMarkdownBody(md, "Synthetic title"), "正文。");
});
test("no locked body is rejected", () => assert.equal(canonicalRenderedBody("<p>unlocked</p>"), ""));
test("share controls stay outside the protected body", () => {
  assert.equal(canonicalRenderedBody(wrap("<p>甲。</p>") + "<p>分享</p>" + wrap("<p>乙。</p>")), "甲。 乙。");
});
test("responsive image and image zoom UI do not enter body hash", () => {
  const md = "本文\n\n![Test](images/figure.png)\n\n後文";
  const html = markdownToHtml(md, new Map(), { responsive_inline_images: true, inline_image_viewer: true, lang: "en" });
  assert.equal(canonical(html), canonicalMarkdownBody(md, ""));
});
for (const [name, before, after] of [
  ["dose changed", "劑量 25 mg", "劑量 50 mg"],
  ["negation removed", "未達統計顯著", "達統計顯著"],
  ["sentence deleted", "第一段。\n\n關鍵風險。", "第一段。"],
  ["claim inserted", "尚待證實。", "尚待證實。已獲核准。"],
  ["paragraph order changed", "甲。\n\n乙。", "乙。\n\n甲。"],
  ["underscore changed", "gene_A", "geneA"],
  ["literal tilde changed", "~25 mg", "25 mg"],
  ["code literal changed", "```\nx_y | z\n```", "```\nxy | z\n```"],
]) test(`reject ${name}`, () => {
  assert.notEqual(sha256Text(canonicalMarkdownBody(before, "")), sha256Text(canonical(renderApprovedBody(after, ""))));
});
test("tampering outside sampled canaries is still rejected by full digest", () => {
  const words = Array.from({ length: 500 }, (_, i) => `句${i}維持原樣`).join("。");
  for (let i = 40; i < 80; i++) {
    const modified = words.replace(`句${i}維持原樣`, `句${i}新增錯誤`);
    assert.notEqual(sha256Text(canonicalMarkdownBody(words, "")), sha256Text(canonical(renderApprovedBody(modified, ""))));
  }
});
for (const category of ["生技估值", "公司研究", "BD / 授權", "臨床與 CMC", "IR 與資本市場", "活動紀錄"]) {
  test(`legacy category ${category} gets the same public series as the builder`, () => assert.equal(inferSeries({category, title: "血液檢測的產業價值", tags: [], access: "免費文章"}), "商業分析系列"));
}
test("explicit series wins", () => assert.equal(inferSeries({ series:"基本面系列", category:"臨床與 CMC" }), "基本面系列"));
test("explicit public category preserved", () => assert.equal(inferSeries({ category:"製藥巨頭系列" }), "製藥巨頭系列"));
test("conference classification preserved", () => assert.equal(inferSeries({ category:"臨床與 CMC", title:"ASCO 重點" }), "醫學大會"));
test("Vocus paid fundamentals preserved", () => assert.equal(inferSeries({ source:"方格子", access:"付費文章", title:"財報分析" }), "基本面系列"));
test("Vocus paid deep research preserved", () => assert.equal(inferSeries({ source:"方格子", access:"付費文章", title:"研究分析" }), "付費深度商業分析文章系列"));

const url = "https://drugnews.com.tw/articles/2026-09-05-synthetic.html";
const row = { title:"Synthetic market signal", url };
const radar = (rows = [row]) => ({schema_version:"1.0", buckets:[{name:"臨床與法規催化", count:rows.length, articles:rows}]});
const sitemap = `<urlset><url><loc>${url}</loc></url></urlset>`;
const validate = (data, map=sitemap) => marketRadarValidationError(JSON.stringify(data), map);
test("non-radar article is not required in a curated view", () => assert.equal(validate(radar()), ""));
test("empty curated view can be legitimate", () => assert.equal(validate({ schema_version:"1.0", buckets:[] }), ""));
test("invalid JSON is rejected", () => assert.equal(marketRadarValidationError("{",sitemap), "RADAR_JSON_INVALID"));
test("missing radar schema is rejected", () => assert.equal(validate({}), "RADAR_SCHEMA_INVALID"));
test("bad bucket count is rejected", () => { const r=radar(); r.buckets[0].count=9; assert.equal(validate(r),"RADAR_BUCKET_INVALID"); });
test("duplicate article is rejected", () => assert.equal(validate(radar([row,row])),"RADAR_ARTICLE_DUPLICATE"));
test("duplicate bucket is rejected", () => { const r=radar(); r.buckets.push({name:r.buckets[0].name,count:0,articles:[]}); assert.equal(validate(r),"RADAR_BUCKET_DUPLICATE"); });
test("external radar URL is rejected", () => assert.equal(validate(radar([{...row,url:"https://evil.invalid/articles/x.html"}])) ,"RADAR_NONCANONICAL_URL"));
test("query-bearing radar URL is rejected", () => assert.equal(validate(radar([{...row,url:url+"?track=1"}])) ,"RADAR_NONCANONICAL_URL"));
test("radar URL absent from sitemap is rejected", () => assert.equal(validate(radar(),"<urlset/>"),"RADAR_ARTICLE_NOT_IN_SITEMAP"));
test("radar over its genuine 32-record cap is rejected", () => {
  const rows=Array.from({length:33},(_,i)=>({...row,url:`https://drugnews.com.tw/articles/synthetic-${i}.html`}));
  const map=rows.map(r=>`<loc>${r.url}</loc>`).join("");
  assert.equal(validate(radar(rows),map),"RADAR_RECORD_LIMIT_EXCEEDED");
});

test("literal entities do not undergo a second decode in canaries", () => {
  const body = canonicalMarkdownBody("顯示字元 &amp; 與 &#38;lt; 必須保持原樣。".repeat(10), "");
  for (const needle of bodyCanaries(body)) assert(body.includes(needle));
});

let failed=0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch(error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(JSON.stringify({ suite:"scheduled-contract-regressions", tests:tests.length, passed:tests.length-failed, failed }));
if (failed) process.exitCode=1;
