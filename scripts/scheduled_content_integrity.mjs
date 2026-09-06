import crypto from "node:crypto";
import { renderApprovedBody } from "./article_body_renderer.mjs";

export const LOCK_START = "<!-- drugnews:locked-body:start -->";
export const LOCK_END = "<!-- drugnews:locked-body:end -->";

export function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function canonicalText(value) {
  return decodeEntities(String(value || ""))
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

export function canonicalMarkdownBody(markdown, title) {
  // The approved source bytes remain authenticated by the queue envelope and
  // approved_content_hash. Compare the entire deterministic rendered body,
  // rather than two incompatible Markdown/HTML stripping algorithms.
  return canonicalRenderedBody(`${LOCK_START}${renderApprovedBody(markdown, title)}${LOCK_END}`);
}

export function canonicalRenderedBody(html) {
  const fragments = [];
  const re = new RegExp(`${LOCK_START}([\\s\\S]*?)${LOCK_END}`, "gu");
  let match;
  while ((match = re.exec(String(html || "")))) fragments.push(match[1]);
  if (!fragments.length) return "";
  const body = fragments.join(" ")
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/giu, " ")
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/giu, " ")
    // Inline formatting does not insert spaces into the approved text.
    .replace(/<\/?(?:a|strong|em|code|span|b|i|s|small|sub|sup|mark)\b[^>]*>/giu, "")
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
  return canonicalText(body);
}

export function bodyCanaries(text) {
  // Callers pass already-canonical body text; do not decode literal entities twice.
  const value = String(text || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!value) return [];
  const width = Math.min(64, Math.max(24, Math.floor(value.length / 4)));
  const starts = [0, Math.max(0, Math.floor((value.length - width) / 2)), Math.max(0, value.length - width)];
  return [...new Set(starts.map((start) => value.slice(start, start + width).trim()).filter((item) => item.length >= 16))];
}
