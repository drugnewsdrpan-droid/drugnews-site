#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repo = process.cwd();
const publishedDir = path.join(repo, 'content', 'published');
const cjkPattern = /[\u3400-\u9fff\u3040-\u30ff]/;
const originalImagePattern = /(?:^|\/)(?:facebook|dcard)-\d+\.(?:png|jpe?g|webp|gif)$/i;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectArticles() {
  return fs.readdirSync(publishedDir)
    .map((name) => path.join(publishedDir, name))
    .filter((dir) => fs.existsSync(path.join(dir, 'meta.json')))
    .map((dir) => ({ dir, meta: readJson(path.join(dir, 'meta.json')) }))
    .filter(({ meta }) => meta.lang === 'en');
}

function imageRefs(markdown) {
  const refs = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    refs.push({ alt: match[1], src: match[2] });
  }
  return refs;
}

const flaggedImages = [];
const checkedArticles = [];

for (const article of collectArticles()) {
  const articlePath = path.join(article.dir, 'article.md');
  if (!fs.existsSync(articlePath)) continue;
  const markdown = fs.readFileSync(articlePath, 'utf8');
  checkedArticles.push(article.meta.slug);
  for (const ref of imageRefs(markdown)) {
    const src = ref.src.split('?')[0];
    if (originalImagePattern.test(src) || cjkPattern.test(ref.alt)) {
      flaggedImages.push({
        slug: article.meta.slug,
        title: article.meta.title,
        src: ref.src,
        alt: ref.alt
      });
    }
  }
}

const status = flaggedImages.length ? 'needs_fix' : 'ok';
console.log(JSON.stringify({
  status,
  checked_articles: checkedArticles.length,
  flagged_images: flaggedImages
}, null, 2));

if (process.argv.includes('--strict') && status !== 'ok') {
  process.exit(1);
}
