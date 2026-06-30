#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find((item) => item === name || item.startsWith(prefix));
  if (!arg) return fallback;
  if (arg === name) return true;
  return arg.slice(prefix.length);
}

const LIMIT = Number(argValue("--limit", 1));
const MIN_IMAGES = Number(argValue("--min-images", 4));
const MIN_WORDS = Number(argValue("--min-words", 1200));
const STRICT = process.argv.includes("--strict");

function stripReferenceSection(markdown) {
  return String(markdown || "").replace(
    /(^|\n)\s*(參考(?:資料|來源)[:：]?|References:?)\s*\n[\s\S]*?(?=\n---|\n#{1,3}\s|$)/i,
    ""
  );
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, " ")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(markdown) {
  return stripMarkdown(stripReferenceSection(markdown)).split(/\s+/).filter(Boolean).length;
}

function chineseCharCount(markdown) {
  return (stripMarkdown(stripReferenceSection(markdown)).match(/[\u4e00-\u9fff]/g) || []).length;
}

function markdownImages(markdown) {
  return [...String(markdown || "").matchAll(/!\[([^\]]*)]\(([^)]+)\)/g)].map((match) => ({
    alt: match[1],
    src: match[2]
  }));
}

function markdownHeadings(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line.trim()))
    .map((line) => line.trim().replace(/^##\s+/, ""));
}

async function readPublished() {
  const folders = await fs.readdir(PUBLISHED, { withFileTypes: true });
  const records = [];
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const folderPath = path.join(PUBLISHED, folder.name);
    try {
      const [metaRaw, markdown] = await Promise.all([
        fs.readFile(path.join(folderPath, "meta.json"), "utf8"),
        fs.readFile(path.join(folderPath, "article.md"), "utf8")
      ]);
      const meta = JSON.parse(metaRaw);
      records.push({ folder: folder.name, folderPath, meta, markdown });
    } catch {
      // Ignore incomplete folders; publish validation covers them elsewhere.
    }
  }
  return records;
}

function expectedEnglishHtml(record) {
  return `${record.meta.date}-${record.meta.slug}.html`;
}

function findChineseSource(enRecord, allRecords) {
  const zhHtml = enRecord.meta.translations?.["zh-Hant"];
  if (zhHtml) {
    return allRecords.find((record) => expectedEnglishHtml(record) === zhHtml) || null;
  }
  const enHtml = expectedEnglishHtml(enRecord);
  return allRecords.find((record) => record.meta.translations?.en === enHtml) || null;
}

function checkEnglishRecord(record, source) {
  const images = markdownImages(record.markdown);
  const headings = markdownHeadings(record.markdown);
  const words = wordCount(record.markdown);
  const sourceHeadings = source ? markdownHeadings(source.markdown) : [];
  const sourceChineseChars = source ? chineseCharCount(source.markdown) : 0;
  const sourceAdjustedMinWords = sourceChineseChars ? Math.max(MIN_WORDS, Math.round(sourceChineseChars / 4)) : MIN_WORDS;
  const issues = [];

  if (images.length < MIN_IMAGES) {
    issues.push(`needs at least ${MIN_IMAGES} article images, found ${images.length}`);
  }
  if (words < sourceAdjustedMinWords) {
    issues.push(`English body looks too short: ${words} words; expected >= ${sourceAdjustedMinWords}`);
  }
  if (sourceHeadings.length && headings.length < Math.max(1, sourceHeadings.length - 1)) {
    issues.push(`heading parity is low: ${headings.length} English H2 vs ${sourceHeadings.length} Chinese H2`);
  }
  if (/facebook-\d{2}|dcard-\d{2}|[\u4e00-\u9fff]/u.test(images.map((image) => `${image.src} ${image.alt}`).join(" "))) {
    issues.push("English article images appear to reuse social/Chinese image assets or Chinese alt text");
  }

  return {
    title: record.meta.title,
    date: record.meta.date,
    slug: record.meta.slug,
    images: images.length,
    words,
    headings: headings.length,
    source_headings: sourceHeadings.length,
    source_chinese_chars: sourceChineseChars,
    expected_min_words: sourceAdjustedMinWords,
    status: issues.length ? "warning" : "ok",
    issues
  };
}

async function main() {
  const records = await readPublished();
  const english = records
    .filter((record) => record.meta.lang === "en")
    .sort((a, b) => String(b.meta.publish_at || b.meta.date).localeCompare(String(a.meta.publish_at || a.meta.date)))
    .slice(0, LIMIT);

  const results = english.map((record) => checkEnglishRecord(record, findChineseSource(record, records)));
  const failed = results.filter((result) => result.status !== "ok");
  const report = {
    status: failed.length ? (STRICT ? "failed" : "warning") : "ok",
    checked_articles: results.length,
    min_images: MIN_IMAGES,
    min_words: MIN_WORDS,
    results
  };

  console.log(JSON.stringify(report, null, 2));
  if (STRICT && failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
