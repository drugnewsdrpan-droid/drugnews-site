import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const audit = fileURLToPath(new URL("./audit_english_article_completeness.mjs", import.meta.url));
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "drugnews-english-audit-test-"));
const imageIssue = "English article images appear to reuse social/Chinese image assets or Chinese alt text";
const fixture = () => ({
  meta: { title: "English test article", date: "2026-01-02", slug: "test-en", lang: "en", translations: { "zh-Hant": "2026-01-02-test-zh.html" } },
  images: [1, 2, 3, 4].map(i => ({ alt: `English diagram ${i}`, src: `images/figure-${i}-en.png` })),
  words: 1250,
  headings: 3
});

let passed = 0;
const failed = [];
async function check(name, mutate, issue = null) {
  const record = fixture();
  mutate(record);
  const published = path.join(temp, "content", "published");
  const english = path.join(published, "en");
  const chinese = path.join(published, "zh");
  await fs.mkdir(english, { recursive: true });
  await fs.mkdir(chinese, { recursive: true });
  await fs.writeFile(path.join(english, "meta.json"), JSON.stringify(record.meta));
  await fs.writeFile(path.join(english, "article.md"), [
    ...Array.from({ length: record.headings }, (_, i) => `## Heading ${i}`),
    "evidence ".repeat(record.words),
    ...record.images.map(image => `![${image.alt}](${image.src})`)
  ].join("\n\n"));
  await fs.writeFile(path.join(chinese, "meta.json"), JSON.stringify({ date: "2026-01-02", slug: "test-zh", lang: "zh-Hant" }));
  await fs.writeFile(path.join(chinese, "article.md"), "## 一\n\n## 二\n\n## 三\n\n中文來源");
  const result = spawnSync(process.execPath, [audit, "--strict"], { cwd: temp, encoding: "utf8" });
  try {
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, issue ? 1 : 0, result.stderr || result.stdout);
    assert.equal(report.checked_articles, 1);
    assert.equal(report.status, issue ? "failed" : "ok");
    if (issue) assert(report.results[0].issues.some(value => value.includes(issue)), result.stdout);
    else assert.deepEqual(report.results[0].issues, []);
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed.push(name);
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

try {
  await check("ASCII English assets", () => {});
  await check("Unicode filename does not determine image language", r => { r.images[0].src = "images/01_治療時間軸_EN_v2.png"; });
  await check("Unicode directory does not determine image language", r => { r.images[0].src = "images/臨床圖表/figure-1-en.png"; });
  await check("percent-encoded Unicode filename", r => { r.images[0].src = "images/" + encodeURIComponent("01_治療時間軸_EN_v2.png"); });
  await check("Chinese alt still fails", r => { r.images[0].alt = "中文替代文字"; }, imageIssue);
  await check("Facebook asset still fails", r => { r.images[0].src = "images/facebook-01.png"; }, imageIssue);
  await check("Dcard asset still fails", r => { r.images[0].src = "images/dcard-02.png"; }, imageIssue);
  await check("explicit ZH image still fails", r => { r.images[0].src = "images/01_治療時間軸_ZH_v2.png"; }, imageIssue);
  await check("explicit zh-Hant image still fails", r => { r.images[0].src = "images/figure-01-zh-Hant.png"; }, imageIssue);
  await check("explicit Chinese-language directory still fails", r => { r.images[0].src = "images/zh-Hant/figure-01.png"; }, imageIssue);
  await check("explicit CN image still fails", r => { r.images[0].src = "images/figure-01-cn.png"; }, imageIssue);
  await check("mixed English and Chinese alt still fails", r => { r.images[0].alt = "Clinical result 圖"; }, imageIssue);
  await check("missing fourth image still fails", r => { r.images.pop(); }, "needs at least 4");
  await check("short English body still fails", r => { r.words = 20; }, "English body looks too short");
  await check("heading mismatch still fails", r => { r.headings = 1; }, "heading parity is low");
  await check("no article-specific language exemption", r => {
    r.meta.slug = "scholar-rock-isembyld-sma-care-en";
    r.images[0].alt = "中文替代文字";
  }, imageIssue);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log(JSON.stringify({ suite: "english-article-completeness", tests: passed + failed.length, passed, failed }));
if (failed.length) process.exitCode = 1;
