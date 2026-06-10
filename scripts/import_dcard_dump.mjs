import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/import_dcard_dump.mjs /path/to/dump.json");
  process.exit(1);
}

function imageExt(url) {
  if (/\.jpe?g($|\?)/i.test(url)) return ".png";
  if (/\.webp($|\?)/i.test(url)) return ".webp";
  if (/\.png($|\?)/i.test(url)) return ".png";
  return ".png";
}

const posts = JSON.parse(await fs.readFile(inputPath, "utf8"));

for (const post of posts) {
  const dir = path.join(ROOT, "content", "published", post.slug);
  const imageDir = path.join(dir, "images");
  await fs.mkdir(imageDir, { recursive: true });
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(post.meta, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(dir, "article.md"), post.markdown, "utf8");
  const manifest = post.imageUrls.map((url, index) => ({
    url,
    file: `dcard-${String(index + 1).padStart(2, "0")}${imageExt(url)}`
  }));
  await fs.writeFile(path.join(imageDir, "image-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Imported ${post.date} ${post.slug}`);
}
