import crypto from "node:crypto";

const CHINESE_DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";
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
  let body = String(markdown || "").replace(CHINESE_DISCLAIMER, "").trim();
  const escapedTitle = String(title || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  body = body.replace(new RegExp(`^\\s*#\\s+${escapedTitle}\\s*(?:\\n|$)`, "u"), "");
  body = body
    .replace(/^\s*!\[[^\]]*\]\([^)]+\)\s*$/gmu, " ")
    .replace(/^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/gmu, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/gu, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/^\s*```[^\n]*$/gmu, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gmu, "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[*_~`]/gu, "")
    .replace(/\|/gu, " ");
  return canonicalText(body);
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
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
  return canonicalText(body);
}

export function bodyCanaries(text) {
  const value = canonicalText(text);
  if (!value) return [];
  const width = Math.min(64, Math.max(24, Math.floor(value.length / 4)));
  const starts = [0, Math.max(0, Math.floor((value.length - width) / 2)), Math.max(0, value.length - width)];
  return [...new Set(starts.map((start) => value.slice(start, start + width).trim()).filter((item) => item.length >= 16))];
}
