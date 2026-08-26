#!/usr/bin/env node
// Blocks a web article that drifts toward a same-topic short social version.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "content", "source-provenance.json");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="))?.slice(7);

async function readable(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function resolveSourcePath(configuredPath) {
  const portablePath = String(configuredPath || "").replace(/^(\.\.[/\\])+/, "");
  const candidates = [path.resolve(ROOT, configuredPath)];
  if (path.basename(path.dirname(ROOT)) === ".worktrees") {
    candidates.push(path.resolve(ROOT, "../..", portablePath));
  }
  candidates.push(path.resolve(ROOT, "..", portablePath));
  for (const candidate of [...new Set(candidates)]) {
    if (await readable(candidate)) return candidate;
  }
  throw new Error(`Source file not found: ${configuredPath}`);
}

function textOf(markdown) {
  return String(markdown || "")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[`*_>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function grams(text, size) {
  const normalized = textOf(text).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const result = new Set();
  for (let index = 0; index <= normalized.length - size; index += 1) result.add(normalized.slice(index, index + size));
  return result;
}

function coverage(article, source, size) {
  const articleGrams = grams(article, size);
  const sourceGrams = grams(source, size);
  if (!articleGrams.size) return 0;
  let common = 0;
  for (const gram of articleGrams) if (sourceGrams.has(gram)) common += 1;
  return Number((common / articleGrams.size).toFixed(4));
}

async function check(record) {
  const articlePath = path.join(ROOT, "content", "published", record.slug, "article.md");
  const longPath = await resolveSourcePath(record.canonical_source.path);
  const shortPath = record.short_form_comparator?.path
    ? await resolveSourcePath(record.short_form_comparator.path)
    : null;
  const [article, longform, shortform] = await Promise.all([
    fs.readFile(articlePath, "utf8"),
    fs.readFile(longPath, "utf8"),
    shortPath ? fs.readFile(shortPath, "utf8") : Promise.resolve("")
  ]);
  const articleChars = [...textOf(article)].length;
  const longChars = [...textOf(longform)].length;
  const ratio = Number((articleChars / longChars).toFixed(4));
  const ngramSize = record.ngram_size || 5;
  const longCoverage = coverage(article, longform, ngramSize);
  const shortCoverage = shortPath ? coverage(article, shortform, ngramSize) : null;
  const issues = [];
  if (ratio < record.min_longform_char_ratio) issues.push(`body ratio ${ratio} is below long-form minimum ${record.min_longform_char_ratio}`);
  if (record.min_longform_ngram_coverage && longCoverage < record.min_longform_ngram_coverage) {
    issues.push(`long-form n-gram coverage ${longCoverage} is below minimum ${record.min_longform_ngram_coverage}`);
  }
  if (shortCoverage !== null && shortCoverage >= longCoverage) {
    issues.push(`article is at least as close to short form (${shortCoverage}) as canonical long form (${longCoverage})`);
  }
  return {
    slug: record.slug,
    canonical_source: record.canonical_source,
    article_chars: articleChars,
    longform_chars: longChars,
    longform_ratio: ratio,
    min_longform_char_ratio: record.min_longform_char_ratio,
    ngram_size: ngramSize,
    longform_ngram_coverage: longCoverage,
    shortform_ngram_coverage: shortCoverage,
    status: issues.length ? "failed" : "ok",
    issues
  };
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const records = (manifest.records || []).filter((record) => !slugArg || record.slug === slugArg);
  if (!records.length) throw new Error(slugArg ? `No source-provenance record for ${slugArg}` : "No source-provenance records");
  const results = await Promise.all(records.map(check));
  const failed = results.filter((result) => result.status !== "ok");
  console.log(JSON.stringify({ status: failed.length ? "failed" : "ok", checked_articles: results.length, results }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
