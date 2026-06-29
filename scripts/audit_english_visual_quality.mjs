#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const RECENT_CUTOFF = "2026-06-15";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function collectEnglishArticles() {
  return fs.readdirSync(PUBLISHED)
    .map((name) => path.join(PUBLISHED, name))
    .filter((dir) => fs.existsSync(path.join(dir, "meta.json")) && fs.existsSync(path.join(dir, "article.md")))
    .map((dir) => ({
      dir,
      meta: readJson(path.join(dir, "meta.json")),
      markdown: fs.readFileSync(path.join(dir, "article.md"), "utf8")
    }))
    .filter(({ meta }) => meta.lang === "en")
    .sort((a, b) => String(b.meta.date || "").localeCompare(String(a.meta.date || "")));
}

function imageRefs(markdown) {
  const refs = [];
  const re = /!\[([^\]]*)]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    refs.push({ alt: match[1], src: match[2] });
  }
  return refs;
}

function isSvg(src) {
  return /\.svg(?:$|\?)/i.test(String(src || ""));
}

function isGeneratedRaster(src) {
  return /\.(?:png|jpe?g|webp)(?:$|\?)/i.test(String(src || ""));
}

const articles = collectEnglishArticles();
const needsGeneratedArtwork = [];
let svgRefs = 0;
let rasterRefs = 0;

for (const article of articles) {
  const refs = imageRefs(article.markdown);
  const cover = article.meta.cover_image || "";
  const svgImages = refs.filter((ref) => isSvg(ref.src));
  const rasterImages = refs.filter((ref) => isGeneratedRaster(ref.src));
  if (isSvg(cover)) svgImages.unshift({ alt: "cover", src: cover });
  svgRefs += svgImages.length;
  rasterRefs += rasterImages.length + (isGeneratedRaster(cover) ? 1 : 0);

  if (svgImages.length) {
    needsGeneratedArtwork.push({
      date: article.meta.date,
      slug: article.meta.slug,
      title: article.meta.title,
      priority: String(article.meta.date || "") >= RECENT_CUTOFF ? "recent" : "backlog",
      svg_images: svgImages.map((ref) => ref.src)
    });
  }
}

const recentNeeds = needsGeneratedArtwork.filter((item) => item.priority === "recent");
const status = needsGeneratedArtwork.length ? "needs_review" : "ok";

console.log(JSON.stringify({
  status,
  checked_articles: articles.length,
  svg_image_refs: svgRefs,
  raster_image_refs: rasterRefs,
  articles_needing_generated_artwork: needsGeneratedArtwork.length,
  recent_articles_needing_generated_artwork: recentNeeds.length,
  next_priority: needsGeneratedArtwork.slice(0, 8)
}, null, 2));

if (process.argv.includes("--strict") && status !== "ok") {
  process.exit(1);
}
