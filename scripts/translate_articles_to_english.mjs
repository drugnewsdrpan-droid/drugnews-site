import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const MODEL = process.env.OPENAI_TRANSLATION_MODEL;
const API_KEY = process.env.OPENAI_API_KEY;
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const LIMIT_ARG = args.get("all") ? "all" : args.get("limit");
const LIMIT = LIMIT_ARG === "all" ? Infinity : Number(LIMIT_ARG || 3);
const SLUG = args.get("slug") || "";
const DRY_RUN = args.has("dry-run");
const REPORT = path.join(ROOT, "content", "english-translation-report.json");

function slugify(input, fallback) {
  const slug = String(input || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function articleFileName(meta) {
  return `${meta.date}-${meta.slug || slugify(meta.title, "article")}.html`;
}

function promptFor(meta, markdown) {
  return `You are the native-English editorial translator for Drugnews, a biotech and pharmaceutical business-analysis media site.

Translate the Traditional Chinese article into polished, native-speaker business English for professional biotech, pharma, investor-relations, and capital-market readers.

Hard requirements:
- Preserve all Markdown image lines exactly, including alt text and file paths. Do not move images.
- Preserve section order, paragraph breaks, numbered section logic, company names, drug names, ticker symbols, clinical phases, endpoints, and financial numbers.
- Translate titles, headings, summaries, and body copy into natural editorial English, not literal classroom English.
- Keep claims faithful to the source. Do not add facts.
- Do not include source-platform labels such as Dcard, Facebook, or 方格子 in tags unless they are part of a quoted title.
- Use "This article is intended for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice." as the disclaimer.

Return strict JSON only:
{
  "title": "...",
  "summary": "...",
  "tags": ["...", "..."],
  "article_markdown": "..."
}

Source meta:
${JSON.stringify({
  title: meta.title,
  summary: meta.summary,
  tags: meta.tags,
  category: meta.category,
  date: meta.date
}, null, 2)}

Source Markdown:
${markdown}`;
}

async function translate(meta, markdown) {
  if (!API_KEY) throw new Error("OPENAI_API_KEY is required to translate articles.");
  if (!MODEL) throw new Error("OPENAI_TRANSLATION_MODEL is required. Set it to the current production translation model before running.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: promptFor(meta, markdown),
      text: { format: { type: "json_object" } }
    })
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`OpenAI translation failed (${response.status}): ${body}`);
  const json = JSON.parse(body);
  const text = json.output_text || json.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("") || "";
  if (!text.trim()) throw new Error("OpenAI translation returned an empty response.");
  return JSON.parse(text);
}

function imageLines(markdown) {
  return String(markdown)
    .split(/\r?\n/u)
    .filter((line) => /^!\[[^\]]*\]\([^)]+\)\s*$/u.test(line.trim()));
}

function assertImageLinesPreserved(sourceMarkdown, translatedMarkdown, slug) {
  const source = imageLines(sourceMarkdown);
  const translated = imageLines(translatedMarkdown);
  const sameLength = source.length === translated.length;
  const sameOrder = sameLength && source.every((line, index) => line === translated[index]);
  if (!sameOrder) {
    throw new Error(`Image Markdown lines changed for ${slug}. Source=${JSON.stringify(source)} Translated=${JSON.stringify(translated)}`);
  }
}

async function loadCandidates() {
  const entries = await fs.readdir(PUBLISHED, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SLUG && entry.name !== SLUG) continue;
    const dir = path.join(PUBLISHED, entry.name);
    const metaPath = path.join(dir, "meta.json");
    const articlePath = path.join(dir, "article.md");
    if (!(await exists(metaPath)) || !(await exists(articlePath))) continue;
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    if (/^en\b/i.test(meta.lang || "")) continue;
    const englishSlug = `${meta.slug || entry.name}-en`;
    if (meta.translations?.en || await exists(path.join(PUBLISHED, englishSlug))) continue;
    candidates.push({ dir, entryName: entry.name, meta, articlePath, englishSlug });
  }
  return candidates.sort((a, b) => new Date(b.meta.publish_at || b.meta.date) - new Date(a.meta.publish_at || a.meta.date));
}

async function writeEnglishArticle(candidate, translated) {
  const sourceMetaPath = path.join(candidate.dir, "meta.json");
  const targetDir = path.join(PUBLISHED, candidate.englishSlug);
  const sourceImages = path.join(candidate.dir, "images");
  const targetImages = path.join(targetDir, "images");
  const sourceHasImages = await exists(sourceImages);
  await fs.mkdir(targetDir, { recursive: true });
  if (sourceHasImages) await fs.cp(sourceImages, targetImages, { recursive: true, force: true });

  const sourceMeta = candidate.meta;
  const englishMeta = {
    title: translated.title,
    slug: candidate.englishSlug,
    date: sourceMeta.date,
    publish_at: sourceMeta.publish_at,
    category: sourceMeta.category,
    series: sourceMeta.series || sourceMeta.category,
    access: sourceMeta.access || "免費文章",
    lang: "en",
    translations: {
      "zh-Hant": articleFileName(sourceMeta)
    },
    tags: Array.isArray(translated.tags) ? translated.tags.slice(0, 12) : [],
    summary: translated.summary,
    cover_image: sourceMeta.cover_image || "",
    cover_image_alt: translated.title,
    source_platform: "Website"
  };

  await fs.writeFile(path.join(targetDir, "meta.json"), `${JSON.stringify(englishMeta, null, 2)}\n`);
  await fs.writeFile(path.join(targetDir, "article.md"), `${translated.article_markdown.trim()}\n`);

  sourceMeta.lang = sourceMeta.lang || "zh-Hant";
  sourceMeta.translations = { ...(sourceMeta.translations || {}), en: `${sourceMeta.date}-${candidate.englishSlug}.html` };
  await fs.writeFile(sourceMetaPath, `${JSON.stringify(sourceMeta, null, 2)}\n`);
}

async function main() {
  const candidates = await loadCandidates();
  const selected = candidates.slice(0, LIMIT);
  if (!selected.length) {
    console.log("No untranslated Chinese articles found.");
    return;
  }
  if (DRY_RUN) {
    console.log(JSON.stringify({
      total_untranslated: candidates.length,
      selected: selected.length,
      items: selected.map((item) => ({ slug: item.entryName, title: item.meta.title, target: item.englishSlug }))
    }, null, 2));
    return;
  }
  const report = {
    started_at: new Date().toISOString(),
    total_untranslated_at_start: candidates.length,
    selected: selected.length,
    translated: [],
    failed: []
  };
  for (const candidate of selected) {
    const markdown = await fs.readFile(candidate.articlePath, "utf8");
    console.log(`Translating ${candidate.entryName} -> ${candidate.englishSlug}`);
    try {
      const translated = await translate(candidate.meta, markdown);
      assertImageLinesPreserved(markdown, translated.article_markdown, candidate.entryName);
      await writeEnglishArticle(candidate, translated);
      report.translated.push({
        slug: candidate.entryName,
        target: candidate.englishSlug,
        title: translated.title
      });
      await fs.writeFile(REPORT, `${JSON.stringify({ ...report, updated_at: new Date().toISOString() }, null, 2)}\n`);
    } catch (error) {
      report.failed.push({
        slug: candidate.entryName,
        target: candidate.englishSlug,
        error: error.message
      });
      await fs.writeFile(REPORT, `${JSON.stringify({ ...report, updated_at: new Date().toISOString() }, null, 2)}\n`);
      throw error;
    }
  }
  report.completed_at = new Date().toISOString();
  await fs.writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Translated ${selected.length} article(s). Run npm run publish to rebuild the site.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
