import path from "node:path";
import { LOCK_START, LOCK_END } from "./scheduled_content_integrity.mjs";

// Only references derived from the authenticated payload are accepted. The
// original image still keeps its original digest and is checked independently.
export function scheduledDisplayAssets(payloadArticle, meta, image) {
  const name = path.posix.basename(image.path);
  const assetDir = `assets/articles/${payloadArticle.slug}`;
  const originalPath = path.posix.join(assetDir, name);
  const responsive = (meta.responsive_inline_images === true && /\.png$/i.test(name))
    || (payloadArticle.slug === "fasedienol-cns-en" && /^figure-0[1-4]\.png$/.test(name));
  if (!responsive) return {};
  const source = path.posix.parse(image.path);
  const renderedAssets = [];
  for (const size of ["720", "1400"]) {
    const filePath = path.posix.join(source.dir, `${source.name}-${size}.webp`);
    const file = (payloadArticle.files || []).find((f) => f.path === filePath);
    if (file && /^[a-f0-9]{64}$/.test(file.sha256 || "")) {
      renderedAssets.push({ path: path.posix.join(assetDir, path.posix.basename(filePath)), sha256: file.sha256 });
    }
  }
  return { display_path: originalPath.replace(/\.png$/i, "-1400.webp"),
    rendered_assets: renderedAssets,
    required_rendered_paths: ["720", "1400"].map((size) => originalPath.replace(/\.png$/i, `-${size}.webp`)) };
}

// Inputs are raw repository-relative paths, not already encoded URLs.
export function publicRequestUrl(relative, base) {
  return new URL(String(relative).split("/").map(encodeURIComponent).join("/"), base).toString();
}

function decodeAttribute(value) {
  return String(value).replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const known = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (known[entity.toLowerCase()]) return known[entity.toLowerCase()];
    const hex = entity.slice(0, 3).toLowerCase() === "&#x";
    const cp = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : entity;
  });
}
function attribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "iu"));
  return match ? decodeAttribute(match[1] ?? match[2]) : "";
}
function assetPath(value, pageUrl) {
  try {
    const url = new URL(value, pageUrl);
    if (url.origin !== new URL(pageUrl).origin || url.search || url.hash) return "";
    return decodeURIComponent(url.pathname).replace(/^\//, "");
  } catch { return ""; }
}

// Use the real protected body, not image URLs in JSON-LD, OG metadata or sidebars.
export function auditBodyImageReferences(html, article, pageUrl) {
  const blocks = [...String(html).matchAll(new RegExp(`${LOCK_START}([\\s\\S]*?)${LOCK_END}`, "gu"))];
  if (!blocks.length) return "IMAGE_LOCKED_BODY_MISSING";
  const body = blocks.map((m) => m[1]).join("\n")
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/giu, "")
    .replace(/<!--[\s\S]*?-->/gu, "");
  const tags = [...body.matchAll(/<img\b[^>]*>/giu)].map((m) => ({ tag: m[0], index: m.index }));
  const images = article.images || [];
  if (tags.length !== images.length) return "IMAGE_COUNT_MISMATCH";
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const tag = tags[i].tag;
    const expected = image.display_path || image.path;
    const variants = image.rendered_assets || [];
    if (expected !== image.path && (!variants.some((v) => v.path === expected && /^[a-f0-9]{64}$/.test(v.sha256 || ""))
      || !(image.required_rendered_paths || []).every((p) => variants.some((v) => v.path === p && /^[a-f0-9]{64}$/.test(v.sha256 || ""))))) {
      return "IMAGE_RENDERED_ASSET_UNAUTHENTICATED";
    }
    if (assetPath(attribute(tag, "src"), pageUrl) !== expected) return "IMAGE_REFERENCE_OR_ORDER_MISMATCH";
    if (!attribute(tag, "alt").trim()) return "IMAGE_ALT_MISSING";
    // Validate every source srcset in the containing picture as well as the img.
    const before = body.slice(0, tags[i].index);
    const pictureStart = before.lastIndexOf("<picture");
    const pictureEnd = before.lastIndexOf("</picture>");
    const picture = pictureStart > pictureEnd ? before.slice(pictureStart) : "";
    const allowed = new Set([image.path, ...variants.map((v) => v.path)]);
    const candidates = [tag, ...picture.match(/<source\b[^>]*>/giu) || []];
    for (const candidate of candidates) {
      const srcset = attribute(candidate, "srcset");
      if (!srcset) continue;
      for (const entry of srcset.split(",")) {
        const src = entry.trim().split(/\s+/u)[0];
        if (!allowed.has(assetPath(src, pageUrl))) return "IMAGE_SRCSET_UNAUTHENTICATED";
      }
    }
  }
  return "";
}
