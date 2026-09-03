import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bodyCanaries, canonicalMarkdownBody, sha256Text } from "./scheduled_content_integrity.mjs";
import { publicDateValidationError, strictCalendarDate, validateSocialCoverPolicy } from "./article_metadata_contract.mjs";

export const MAX_JOBS = 16;
export const MAX_BUNDLE_BYTES = 89 * 1024 * 1024;
export const MAX_QUEUE_BYTES = 512 * 1024 * 1024;
const MAGIC = Buffer.from("DNQ1");
const VERSION = 1;
const TAG_BYTES = 16;
const JOB_ID_RE = /^[0-9a-f]{32}$/;
const KEY_ID_RE = /^v[1-9][0-9]*$/;
const PUBLISH_AT_RE = /^\d{4}-\d{2}-\d{2}T08:00:00\+08:00$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_OID_RE = /^[0-9a-f]{40}$/;
const IMAGE_RE = /\.(?:gif|jpe?g|png|svg|webp)$/i;
const SUPPORTED_CATEGORIES = new Set(["生技估值", "公司研究", "BD / 授權", "臨床與 CMC", "IR 與資本市場", "活動紀錄", "商業分析系列", "基本面系列", "醫學大會", "付費深度商業分析文章系列", "製藥巨頭系列"]);
const TOPIC_RULES = [
  ["biotech-investing", ["生技投資", "投資", "資本市場", "估值", "現金", "市值", "股價", "商業判斷"], 1],
  ["biotech-valuation", ["估值", "rNPV", "SOTP", "峰值銷售", "市值", "重估", "管線價值", "估值模型"], 5],
  ["bd-licensing", ["BD", "授權", "交易", "upfront", "milestone", "royalty", "併購", "合作", "license"], 1],
  ["clinical-data", ["臨床", "數據", "endpoint", "PFS", "OS", "ORR", "Phase", "試驗", "安全性"], 1],
  ["cmc", ["CMC", "製造", "產能", "CDMO", "製程", "放大", "品質", "供應鏈"], 1],
  ["drug-development", ["新藥", "研發", "藥物開發", "靶點", "管線", "適應症", "Phase", "AI 製藥"], 1],
  ["big-pharma", ["製藥巨頭", "大型藥廠", "Big Pharma", "Lilly", "Novo", "Merck", "GSK", "BMS", "Pfizer", "併購"], 1],
  ["glp1", ["GLP-1", "減重", "肥胖", "代謝", "tirzepatide", "semaglutide", "retatrutide", "Novo", "Lilly"], 5]
];
const COMPANY_INDEX_ALIASES = [
  "藥華藥", "PharmaEssentia", "Besremi", "6446", "生華科", "Senhwa", "CX-5461", "Pidnarulex", "寶泰生醫", "Protect Biotech", "寵物醫療", "台康生技", "EirGenix", "CDMO", "Herwenda", "安宏生醫", "AnHorn", "智新生物", "Intellegene", "圓祥", "Forward Therapeutics", "信達", "Innovent", "Eli Lilly", "Lilly", "禮來", "Mounjaro", "Zepbound", "tirzepatide", "Retatrutide", "Novo Nordisk", "諾和諾德", "Ozempic", "Wegovy", "semaglutide", "Merck", "默沙東", "Keytruda", "MK-2010", "GSK", "Nuvalent", "肺癌", "Pfizer", "輝瑞", "Vepdegestrant", "Johnson", "J&J", "嬌生", "Stelara", "CAR-T", "BMS", "百時美", "Bristol", "恒瑞", "Roche", "羅氏", "AstraZeneca", "阿斯特捷利康", "Daiichi", "第一三共", "ADC", "GLP-1", "肥胖", "減重", "減肥藥", "瘦瘦針", "RAS", "KRAS", "胰臟癌", "daraxonrasib", "PRMT5", "MAT2A", "AI", "人工智慧", "AI 製藥", "PROTAC", "foundation model", "抗體藥物複合體", "細胞治療", "自體免疫", "BD", "授權", "upfront", "milestone", "royalty", "併購", "收購", "估值", "rNPV", "SOTP", "峰值銷售", "管線估值", "FDA", "CRL", "PDUFA", "法規", "藥證"
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function imageDimensions(bytes, filePath) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.length >= 10 && bytes.subarray(0, 3).toString("ascii") === "GIF") return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (bytes.length >= 30 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = bytes.subarray(12, 16).toString("ascii");
    if (kind === "VP8X") return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
    if (kind === "VP8 " && bytes.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L" && bytes[20] === 0x2f) return { width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8), height: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10) };
  }
  if (/\.svg$/i.test(filePath)) {
    const text = bytes.toString("utf8", 0, Math.min(bytes.length, 4096));
    const viewBox = text.match(/viewBox=["'][^"']*?([0-9.]+)[ ,]+([0-9.]+)["']/i);
    const width = text.match(/\bwidth=["']([0-9.]+)/i); const height = text.match(/\bheight=["']([0-9.]+)/i);
    if (width && height) return { width: Math.round(Number(width[1])), height: Math.round(Number(height[1])) };
    if (viewBox) return { width: Math.round(Number(viewBox[1])), height: Math.round(Number(viewBox[2])) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      const length = bytes.readUInt16BE(offset + 2); if (length < 2) break; offset += 2 + length;
    }
  }
  throw new Error("IMAGE_DIMENSIONS_UNSUPPORTED");
}

function gitBlobOid(value) {
  return crypto.createHash("sha1").update(`blob ${value.length}\0`).update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function expectedTopicPaths(meta, markdown) {
  if (meta.lang === "en") return [];
  const title = String(meta.title || "").toLowerCase();
  const tags = Array.isArray(meta.tags) ? meta.tags.map((tag) => String(tag).toLowerCase()) : [];
  const haystack = [meta.title, meta.category, meta.summary, meta.access, markdown, ...tags].join(" ").toLowerCase();
  return TOPIC_RULES.filter(([, keywords, minimum]) => keywords.reduce((score, keyword) => {
    const needle = keyword.toLowerCase();
    return score + (title.includes(needle) ? 8 : 0) + (tags.some((tag) => tag.includes(needle)) ? 5 : 0) + (haystack.includes(needle) ? 2 : 0);
  }, 0) >= minimum).map(([slug]) => `topics/${slug}.html`);
}

function expectedCompanyIndex(meta) {
  if (meta.lang === "en") return false;
  const haystack = [meta.title, meta.summary, meta.category, ...(Array.isArray(meta.tags) ? meta.tags : [])].join(" ");
  return COMPANY_INDEX_ALIASES.some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const shortAscii = /^[A-Za-z0-9+-]{1,4}$/.test(alias);
    return new RegExp(shortAscii ? `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)` : escaped, "i").test(haystack);
  });
}

function safeRelative(value, label = "path") {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`${label} must be a safe relative path`);
  }
  return normalized;
}

function decodeKey(value, label) {
  const text = String(value || "").trim();
  if (!text || !/^[A-Za-z0-9+/]{43}=$/.test(text)) throw new Error(`${label}_MISSING_OR_INVALID`);
  const key = Buffer.from(text, "base64");
  if (key.length !== 32 || key.toString("base64") !== text) throw new Error(`${label}_MISSING_OR_INVALID`);
  return key;
}

function keyForId(keyId, env = process.env) {
  if (!KEY_ID_RE.test(keyId)) throw new Error("KEY_ID_INVALID");
  const suffix = keyId === "v1" ? "" : `_${keyId.toUpperCase()}`;
  return decodeKey(env[`DRUGNEWS_QUEUE_KEY_B64${suffix}`], `QUEUE_KEY_${keyId.toUpperCase()}`);
}

export function bundleSizeReason(bytes) {
  return bytes > MAX_BUNDLE_BYTES ? "BUNDLE_TOO_LARGE" : "";
}

export function validateQueueLimitsFromStats(stats) {
  const count = stats.length;
  const totalBytes = stats.reduce((sum, item) => sum + item.bytes, 0);
  if (count > MAX_JOBS) return { ok: false, reason: "QUEUE_COUNT_LIMIT", count, totalBytes };
  if (totalBytes > MAX_QUEUE_BYTES) return { ok: false, reason: "QUEUE_TOTAL_LIMIT", count, totalBytes };
  return { ok: true, reason: "", count, totalBytes };
}

export function compareDueJobs(left, right) {
  return Date.parse(left.publishAt) - Date.parse(right.publishAt) || Buffer.from(left.jobId).compare(Buffer.from(right.jobId));
}

function buildHeader({ keyId, jobId, iv, cipherBytes }) {
  const key = Buffer.from(keyId, "ascii");
  const job = Buffer.from(jobId, "ascii");
  if (!KEY_ID_RE.test(keyId) || !JOB_ID_RE.test(jobId) || iv.length !== 12) throw new Error("ENVELOPE_FIELD_INVALID");
  const fixed = Buffer.alloc(12);
  MAGIC.copy(fixed, 0);
  fixed.writeUInt8(VERSION, 4);
  fixed.writeUInt8(key.length, 5);
  fixed.writeUInt8(job.length, 6);
  fixed.writeUInt8(iv.length, 7);
  fixed.writeUInt32BE(cipherBytes, 8);
  return Buffer.concat([fixed, key, job, iv]);
}

export function encryptEnvelope(plaintext, { key, keyId = "v1", jobId, iv = crypto.randomBytes(12) }) {
  const header = buildHeader({ keyId, jobId, iv, cipherBytes: plaintext.length });
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(header);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([header, ciphertext, cipher.getAuthTag()]);
}

export function parseEnvelope(bundle, expectedJobId = "") {
  if (!Buffer.isBuffer(bundle) || bundle.length < 12 + TAG_BYTES) throw new Error("ENVELOPE_TRUNCATED");
  if (!bundle.subarray(0, 4).equals(MAGIC) || bundle.readUInt8(4) !== VERSION) throw new Error("ENVELOPE_MAGIC_OR_VERSION");
  const keyBytes = bundle.readUInt8(5);
  const jobBytes = bundle.readUInt8(6);
  const ivBytes = bundle.readUInt8(7);
  const cipherBytes = bundle.readUInt32BE(8);
  const headerBytes = 12 + keyBytes + jobBytes + ivBytes;
  if (keyBytes < 2 || jobBytes !== 32 || ivBytes !== 12 || headerBytes + cipherBytes + TAG_BYTES !== bundle.length) {
    throw new Error("ENVELOPE_LENGTH_INVALID");
  }
  const keyId = bundle.subarray(12, 12 + keyBytes).toString("ascii");
  const jobId = bundle.subarray(12 + keyBytes, 12 + keyBytes + jobBytes).toString("ascii");
  if (!KEY_ID_RE.test(keyId) || !JOB_ID_RE.test(jobId) || (expectedJobId && jobId !== expectedJobId)) {
    throw new Error("ENVELOPE_ID_INVALID");
  }
  return {
    keyId,
    jobId,
    header: bundle.subarray(0, headerBytes),
    iv: bundle.subarray(headerBytes - ivBytes, headerBytes),
    ciphertext: bundle.subarray(headerBytes, headerBytes + cipherBytes),
    tag: bundle.subarray(headerBytes + cipherBytes)
  };
}

export function decryptEnvelope(bundle, key, expectedJobId = "") {
  const parsed = parseEnvelope(bundle, expectedJobId);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, parsed.iv);
  decipher.setAAD(parsed.header);
  decipher.setAuthTag(parsed.tag);
  return { ...parsed, plaintext: Buffer.concat([decipher.update(parsed.ciphertext), decipher.final()]) };
}

function normalizedArticleForHash(article) {
  return {
    title: article.title,
    slug: article.slug,
    body_path: article.body_path,
    metadata: article.metadata,
    images: article.images.map(({ order, purpose, width, height, bytes, language, path: imagePath, sha256: digest, existing_public_asset_ref: publicRef }) => ({
      order, purpose, width, height, bytes, language, path: imagePath, sha256: digest,
      ...(publicRef ? { existing_public_asset_ref: {
        source_slug: publicRef.source_slug,
        public_path: publicRef.public_path,
        sha256: publicRef.sha256,
        git_oid: publicRef.git_oid
      } } : {})
    })),
    files: article.files.map(({ path: filePath, sha256: digest }) => ({ path: filePath, sha256: digest }))
      .sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)))
  };
}

export function computeApprovedContentHash(payload) {
  const articles = {};
  for (const lang of ["zh", "en"]) {
    if (payload.articles?.[lang]) articles[lang] = normalizedArticleForHash(payload.articles[lang]);
  }
  return sha256(stableJson({ content_id: payload.content_id, release_key: payload.release_key, lock_version: payload.lock?.version, publish_at: payload.publish_at, slug: payload.slug, articles }));
}

function validateArticlePayload(article, lang, publishAt) {
  if (!article || typeof article !== "object" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || "")) {
    throw new Error(`MANIFEST_${lang.toUpperCase()}_INVALID`);
  }
  if (!Array.isArray(article.files) || !article.files.length || !Array.isArray(article.images) || article.images.length !== 4) {
    throw new Error(`MANIFEST_${lang.toUpperCase()}_FOUR_IMAGES_REQUIRED`);
  }
  if (!String(article.title || "").trim() || article.body_path !== "article.md" || !article.metadata || typeof article.metadata !== "object") {
    throw new Error(`MANIFEST_${lang.toUpperCase()}_CONTENT_FIELDS_REQUIRED`);
  }
  for (const field of ["author", "category", "tags", "summary", "access", "publish_attributes"]) {
    if (article.metadata[field] === undefined || article.metadata[field] === "") throw new Error(`MANIFEST_${lang.toUpperCase()}_METADATA_REQUIRED`);
  }
  if (!Array.isArray(article.metadata.tags)) throw new Error(`MANIFEST_${lang.toUpperCase()}_TAGS_INVALID`);
  const paths = new Set();
  for (const file of article.files) {
    file.path = safeRelative(file.path, `${lang} file path`);
    if (paths.has(file.path) || !SHA256_RE.test(file.sha256 || "") || typeof file.data !== "string") {
      throw new Error(`MANIFEST_${lang.toUpperCase()}_FILE_INVALID`);
    }
    paths.add(file.path);
    const bytes = Buffer.from(file.data, "base64");
    if (bytes.toString("base64") !== file.data || sha256(bytes) !== file.sha256) throw new Error(`MANIFEST_${lang.toUpperCase()}_HASH_MISMATCH`);
  }
  for (const required of ["article.md", "meta.json"]) if (!paths.has(required)) throw new Error(`MANIFEST_${lang.toUpperCase()}_${required.toUpperCase()}_MISSING`);
  const imagePaths = new Set(article.images.map((image) => safeRelative(image.path, `${lang} image path`)));
  if (imagePaths.size !== 4) throw new Error(`MANIFEST_${lang.toUpperCase()}_FOUR_IMAGES_REQUIRED`);
  for (const [index, image] of article.images.entries()) {
    if (image.order !== index + 1 || !String(image.purpose || "").trim() || !Number.isInteger(image.width) || image.width < 1 || !Number.isInteger(image.height) || image.height < 1 || !Number.isInteger(image.bytes) || image.bytes < 1) {
      throw new Error(`MANIFEST_${lang.toUpperCase()}_IMAGE_FIELDS_INVALID`);
    }
    const expectedLanguage = lang === "en" ? "en" : "zh-Hant";
    if (image.language !== expectedLanguage || !IMAGE_RE.test(image.path) || !paths.has(image.path) || !SHA256_RE.test(image.sha256 || "")) throw new Error(`MANIFEST_${lang.toUpperCase()}_IMAGE_INVALID`);
    const file = article.files.find((candidate) => candidate.path === image.path);
    const imageBytes = Buffer.from(file.data, "base64");
    const dimensions = imageDimensions(imageBytes, image.path);
    if (file.sha256 !== image.sha256 || imageBytes.length !== image.bytes || dimensions.width !== image.width || dimensions.height !== image.height) throw new Error(`MANIFEST_${lang.toUpperCase()}_IMAGE_HASH_MISMATCH`);
    if (image.existing_public_asset_ref !== undefined) {
      const ref = image.existing_public_asset_ref;
      const keys = ref && typeof ref === "object" && !Array.isArray(ref) ? Object.keys(ref).sort() : [];
      if (stableJson(keys) !== stableJson(["git_oid", "public_path", "sha256", "source_slug"])) throw new Error("PUBLIC_ASSET_REF_FIELDS_INVALID");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref.source_slug || "") || !SHA256_RE.test(ref.sha256 || "") || !GIT_OID_RE.test(ref.git_oid || "")) throw new Error("PUBLIC_ASSET_REF_IDENTITY_INVALID");
      ref.public_path = safeRelative(ref.public_path, "existing public asset path");
      const prefix = `assets/articles/${ref.source_slug}/`;
      if (/[\0\r\n]/.test(ref.public_path) || !ref.public_path.startsWith(prefix) || ref.public_path.slice(prefix.length).includes("/") || !IMAGE_RE.test(ref.public_path)) throw new Error("PUBLIC_ASSET_REF_PATH_INVALID");
      if (ref.sha256 !== image.sha256 || ref.git_oid !== gitBlobOid(imageBytes)) throw new Error("PUBLIC_ASSET_REF_IMAGE_IDENTITY_MISMATCH");
    }
  }
  const metaFile = article.files.find((file) => file.path === "meta.json");
  const markdownFile = article.files.find((file) => file.path === "article.md");
  let meta;
  try { meta = JSON.parse(Buffer.from(metaFile.data, "base64").toString("utf8")); } catch { throw new Error(`MANIFEST_${lang.toUpperCase()}_META_INVALID`); }
  if (meta.slug !== article.slug || meta.publish_at !== publishAt || meta.title !== article.title || meta.date !== publishAt.slice(0, 10) || !strictCalendarDate(meta.date)) throw new Error(`MANIFEST_${lang.toUpperCase()}_META_MISMATCH`);
  const publicDateError = publicDateValidationError(meta);
  if (publicDateError) throw new Error(publicDateError);
  const coverErrors = validateSocialCoverPolicy(meta);
  if (coverErrors.length) throw new Error(coverErrors[0]);
  for (const field of ["author", "category", "tags", "summary", "access", "publish_attributes"]) {
    if (stableJson(meta[field]) !== stableJson(article.metadata[field])) throw new Error(`MANIFEST_${lang.toUpperCase()}_META_MISMATCH`);
  }
  if (!SUPPORTED_CATEGORIES.has(meta.category)) throw new Error(`MANIFEST_${lang.toUpperCase()}_CATEGORY_UNSUPPORTED`);
  if (lang === "zh" && /^en\b/i.test(meta.lang || "")) throw new Error("MANIFEST_ZH_LANGUAGE_MISMATCH");
  if (lang === "en" && !/^en\b/i.test(meta.lang || "")) throw new Error("MANIFEST_EN_LANGUAGE_MISMATCH");
  const markdown = Buffer.from(markdownFile.data, "base64").toString("utf8");
  const plain = markdown.replace(/!\[[^\]]*]\([^)]+\)/g, " ").replace(/[*_`#>\[\]()]/g, " ").replace(/\s+/g, " ");
  const hasDisclaimer = lang === "en"
    ? /does not constitute[^.]{0,160}(investment|medical)/i.test(plain)
    : plain.includes("不構成") && (plain.includes("投資") || plain.includes("醫療"));
  if (!hasDisclaimer) throw new Error(`MANIFEST_${lang.toUpperCase()}_DISCLAIMER_REQUIRED`);
  const markdownImages = [...markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map((match) => safeRelative(match[1], `${lang} markdown image`));
  const declaredImages = article.images.map((image) => image.path);
  if (stableJson(markdownImages) !== stableJson(declaredImages)) throw new Error(`MANIFEST_${lang.toUpperCase()}_IMAGE_REFERENCES_MISMATCH`);
  if (article.images[0].purpose !== "cover" || meta.cover_image !== article.images[0].path) throw new Error(`MANIFEST_${lang.toUpperCase()}_COVER_MISMATCH`);
  for (const field of ["cover_image", "card_image", "homepage_cover_image"]) {
    if (meta[field] && !/^https?:\/\//i.test(meta[field]) && !paths.has(safeRelative(meta[field], `${lang} ${field}`))) throw new Error(`MANIFEST_${lang.toUpperCase()}_${field.toUpperCase()}_MISSING`);
  }
  return meta;
}

export function validatePayload(payload, expectedJobId = "") {
  if (!payload || payload.schema_version !== 1 || !JOB_ID_RE.test(payload.job_id || "") || (expectedJobId && payload.job_id !== expectedJobId)) {
    throw new Error("PAYLOAD_ID_OR_VERSION_INVALID");
  }
  if (!PUBLISH_AT_RE.test(payload.publish_at || "") || !strictCalendarDate(String(payload.publish_at).slice(0, 10)) || Number.isNaN(Date.parse(payload.publish_at))) throw new Error("PUBLISH_AT_INVALID");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug || "") || !["queued", "revoked", "superseded"].includes(payload.state)) throw new Error("PAYLOAD_STATE_OR_SLUG_INVALID");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(payload.content_id || "") || !/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{7,191}$/.test(payload.release_key || "") || !payload.lock || (!Number.isInteger(payload.lock.version) && !String(payload.lock.version || "").trim())) throw new Error("CONTENT_LOCK_REQUIRED");
  if (!Array.isArray(payload.sources) || !payload.sources.length || !payload.sources.some((source) => source.level === "primary")) throw new Error("PRIMARY_SOURCE_REQUIRED");
  for (const source of payload.sources || []) {
    if (!String(source.title || "").trim() || !/^https:\/\//.test(source.url || "")) throw new Error("SOURCE_INVALID");
  }
  if (!Array.isArray(payload.social_schedule) || payload.social_schedule.length !== 3) throw new Error("SOCIAL_SCHEDULE_REQUIRED");
  const platforms = new Set();
  for (const item of payload.social_schedule) {
    if (!["Facebook", "Dcard", "CMoney"].includes(item.platform) || platforms.has(item.platform) || !["SCHEDULED", "BLOCKED", "REVOKED"].includes(item.status)) throw new Error("SOCIAL_SCHEDULE_INVALID");
    platforms.add(item.platform);
    if (!Number.isInteger(item.sequence) || item.sequence < 1) throw new Error("SOCIAL_SCHEDULE_SEQUENCE_REQUIRED");
    if (item.status === "SCHEDULED" && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(item.scheduled_at || "") || !strictCalendarDate(String(item.scheduled_at).slice(0, 10)) || Number.isNaN(Date.parse(item.scheduled_at)) || !String(item.row_id || "").trim() || !String(item.evidence || "").trim())) throw new Error("SOCIAL_SCHEDULE_E3_REQUIRED");
    if (item.status === "BLOCKED" && !String(item.reason || "").trim()) throw new Error("SOCIAL_SCHEDULE_BLOCK_REASON_REQUIRED");
  }
  if (payload.state === "revoked" && !String(payload.status_reason || "").trim()) throw new Error("REVOKED_REASON_REQUIRED");
  if (payload.state === "superseded" && !String(payload.superseded_by || "").trim()) throw new Error("SUPERSEDED_TARGET_REQUIRED");
  if (!payload.articles?.zh) throw new Error("ZH_ARTICLE_REQUIRED");
  if (!["APPROVED", "HOLD"].includes(payload.english_status)) throw new Error("ENGLISH_STATUS_REQUIRED");
  if ((payload.english_status === "APPROVED") !== Boolean(payload.articles.en)) throw new Error("ENGLISH_STATUS_MISMATCH");
  const metas = { zh: validateArticlePayload(payload.articles.zh, "zh", payload.publish_at) };
  if (payload.articles.en) metas.en = validateArticlePayload(payload.articles.en, "en", payload.publish_at);
  if (payload.articles.zh.slug !== payload.slug || Object.values(metas).some((meta) => meta.publish_at !== payload.publish_at)) throw new Error("ARTICLE_IDENTITY_MISMATCH");
  const targetSlugs = new Set(Object.values(payload.articles).map((article) => article.slug));
  const publicRefPaths = new Set();
  for (const article of Object.values(payload.articles)) {
    for (const image of article.images) {
      const ref = image.existing_public_asset_ref;
      if (!ref) continue;
      if (targetSlugs.has(ref.source_slug)) throw new Error("PUBLIC_ASSET_REF_TARGET_SLUG_FORBIDDEN");
      if (publicRefPaths.has(ref.public_path)) throw new Error("PUBLIC_ASSET_REF_DUPLICATE_PATH");
      publicRefPaths.add(ref.public_path);
    }
  }
  const date = payload.publish_at.slice(0, 10);
  if (payload.english_status === "HOLD") {
    if (metas.zh.translations?.en) throw new Error("ENGLISH_HOLD_TRANSLATION_FORBIDDEN");
  } else {
    const zhTarget = `${date}-${payload.articles.zh.slug}.html`;
    const enTarget = `${date}-${payload.articles.en.slug}.html`;
    if (metas.zh.translations?.en !== enTarget || metas.en.translations?.["zh-Hant"] !== zhTarget) throw new Error("ENGLISH_TRANSLATION_PAIR_INVALID");
  }
  if (payload.state === "queued") {
    const qa = payload.qa || {};
    for (const key of ["content", "communication", "visual"]) if (!Number.isFinite(qa[key]) || qa[key] < 95) throw new Error("QA_SCORE_HOLD");
    if (qa.p0 !== 0 || qa.p1 !== 0) throw new Error("QA_SEVERITY_HOLD");
    if (!String(qa.report_path || "").trim() || !SHA256_RE.test(qa.report_sha256 || "")) throw new Error("QA_REPORT_REQUIRED");
  }
  if (!SHA256_RE.test(payload.approved_content_hash || "") || computeApprovedContentHash(payload) !== payload.approved_content_hash) {
    throw new Error("APPROVED_CONTENT_HASH_MISMATCH");
  }
  if (payload.lock.sha256 !== payload.approved_content_hash) throw new Error("CONTENT_LOCK_HASH_MISMATCH");
  return metas;
}

async function walkRegularFiles(root, relative = "") {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = safeRelative(path.posix.join(relative, entry.name));
    const full = path.join(root, rel);
    const stat = await fs.lstat(full);
    if (stat.isSymbolicLink()) throw new Error("SYMLINK_FORBIDDEN");
    if (stat.isDirectory()) files.push(...await walkRegularFiles(root, rel));
    else if (stat.isFile()) files.push(rel);
    else throw new Error("NON_REGULAR_FILE_FORBIDDEN");
  }
  return files.sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
}

async function loadArticleInput(inputRoot, spec, lang) {
  const directory = safeRelative(spec.directory, `${lang} directory`);
  const root = path.join(inputRoot, directory);
  const actual = await walkRegularFiles(root);
  const declared = (spec.files || []).map((file) => safeRelative(file.path)).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  if (stableJson(actual) !== stableJson(declared)) throw new Error(`MANIFEST_${lang.toUpperCase()}_FILE_SET_MISMATCH`);
  const files = [];
  for (const declaredFile of spec.files) {
    const filePath = safeRelative(declaredFile.path);
    const data = await fs.readFile(path.join(root, filePath));
    const digest = sha256(data);
    if (digest !== declaredFile.sha256) throw new Error(`MANIFEST_${lang.toUpperCase()}_HASH_MISMATCH`);
    files.push({ path: filePath, sha256: digest, data: data.toString("base64") });
  }
  return { title: spec.title, slug: spec.slug, body_path: spec.body_path, metadata: spec.metadata, files, images: spec.images };
}

export async function payloadFromInput(inputRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(inputRoot, "manifest.json"), "utf8"));
  if (manifest.state === "queued") {
    const reportPath = safeRelative(manifest.qa?.report_path, "qa report path");
    let report;
    try { report = await fs.readFile(path.join(inputRoot, reportPath)); } catch { throw new Error("QA_REPORT_NOT_FOUND"); }
    if (sha256(report) !== manifest.qa?.report_sha256) throw new Error("QA_REPORT_HASH_MISMATCH");
  }
  const payload = { ...manifest, articles: {} };
  payload.articles.zh = await loadArticleInput(inputRoot, manifest.articles?.zh || {}, "zh");
  if (manifest.articles?.en) payload.articles.en = await loadArticleInput(inputRoot, manifest.articles.en, "en");
  validatePayload(payload, manifest.job_id);
  return payload;
}

function contentNeedles(payload) {
  const needles = new Set([payload.slug]);
  const imageHashes = new Set();
  const imageGitOids = new Set();
  const imageRecords = [];
  const existingPublicAssetRefs = [];
  const directPaths = [];
  const articles = [];
  for (const [lang, article] of Object.entries(payload.articles)) {
    const meta = JSON.parse(Buffer.from(article.files.find((file) => file.path === "meta.json").data, "base64").toString("utf8"));
    const markdown = Buffer.from(article.files.find((file) => file.path === "article.md").data, "base64").toString("utf8");
    const canonicalBody = canonicalMarkdownBody(markdown, meta.title);
    needles.add(meta.title);
    const canary = markdown.replace(/^#.*$/m, "").replace(/\s+/g, " ").trim().slice(0, 72);
    if (canary.length >= 24) needles.add(canary);
    for (const image of article.images) {
      imageHashes.add(image.sha256);
      const file = article.files.find((candidate) => candidate.path === image.path);
      const gitOid = gitBlobOid(Buffer.from(file.data, "base64"));
      imageGitOids.add(gitOid);
      imageRecords.push({ sha256: image.sha256, git_oid: gitOid, ...(image.existing_public_asset_ref ? { public_path: image.existing_public_asset_ref.public_path } : {}) });
    }
    const urlPath = `articles/${String(meta.date)}-${article.slug}.html`;
    const assetDir = `assets/articles/${article.slug}`;
    for (const image of article.images) {
      if (!image.existing_public_asset_ref) continue;
      existingPublicAssetRefs.push({
        ...image.existing_public_asset_ref,
        lang,
        target_path: path.posix.join(assetDir, path.posix.basename(image.path))
      });
    }
    directPaths.push(urlPath, assetDir);
    articles.push({
      lang,
      slug: article.slug,
      title: meta.title,
      category: meta.category,
      url_path: urlPath,
      asset_dir: assetDir,
      body_sha256: sha256Text(canonicalBody),
      body_canaries: bodyCanaries(canonicalBody),
      topic_paths: expectedTopicPaths(meta, markdown),
      company_indexed: expectedCompanyIndex(meta),
      images: article.images.map((image) => {
        const file = article.files.find((candidate) => candidate.path === image.path);
        return { order: image.order, purpose: image.purpose, path: path.posix.join(assetDir, path.posix.basename(image.path)), sha256: image.sha256, git_oid: gitBlobOid(Buffer.from(file.data, "base64")) };
      })
    });
  }
  return { needles: [...needles].filter(Boolean), imageHashes: [...imageHashes], imageGitOids: [...imageGitOids], imageRecords, existingPublicAssetRefs, directPaths, articles };
}

function git(repoRoot, args, maxBuffer = 64 * 1024 * 1024) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: null, maxBuffer });
  if (result.status !== 0) throw new Error(`PACK_GIT_AUDIT_UNAVAILABLE:${args[0]}`);
  return result.stdout;
}

function gitGrep(repoRoot, needle, mode) {
  const args = mode === "index"
    ? ["grep", "--cached", "-I", "-q", "-F", needle]
    : mode === "head" ? ["grep", "-I", "-q", "-F", needle, "HEAD"] : ["grep", "-I", "-q", "-F", needle];
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error("PACK_GIT_AUDIT_UNAVAILABLE:grep");
}

function nulPaths(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

async function untrackedContains(repoRoot, needles) {
  const paths = nulPaths(git(repoRoot, ["ls-files", "--others", "--exclude-standard", "-z"]));
  for (const relative of paths) {
    const full = path.join(repoRoot, safeRelative(relative, "untracked path"));
    const stat = await fs.lstat(full);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("PACK_GIT_UNTRACKED_NON_REGULAR");
    const bytes = await fs.readFile(full);
    if (needles.some((needle) => bytes.includes(Buffer.from(needle)))) return true;
  }
  return false;
}

async function currentImageOids(repoRoot) {
  const oids = new Set();
  const index = git(repoRoot, ["ls-files", "--stage", "-z"]).toString("utf8").split("\0").filter(Boolean);
  for (const row of index) {
    const match = /^\d+ ([0-9a-f]{40,64}) \d\t/.exec(row);
    if (match) oids.add(match[1]);
  }
  const paths = new Set([
    ...nulPaths(git(repoRoot, ["diff", "--name-only", "-z"])),
    ...nulPaths(git(repoRoot, ["ls-files", "--others", "--exclude-standard", "-z"]))
  ]);
  for (const relative of paths) {
    const full = path.join(repoRoot, safeRelative(relative, "working path"));
    let stat;
    try { stat = await fs.lstat(full); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("PACK_GIT_WORKTREE_NON_REGULAR");
    oids.add(gitBlobOid(await fs.readFile(full)));
  }
  return oids;
}

function gitObject(repoRoot, spec, missingReason) {
  const result = spawnSync("git", ["show", spec], { cwd: repoRoot, encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(missingReason);
  return result.stdout;
}

function assertPublicAssetBytes(bytes, ref, surface) {
  if (sha256(bytes) !== ref.sha256 || gitBlobOid(bytes) !== ref.git_oid) throw new Error(`PUBLIC_ASSET_REF_${surface}_MISMATCH`);
}

async function fetchPublicAsset(url, ref, surface) {
  let response;
  try {
    response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000), headers: { "cache-control": "no-cache" } });
  } catch {
    throw new Error(`PUBLIC_ASSET_REF_${surface}_UNAVAILABLE`);
  }
  if (response.status !== 200) throw new Error(`PUBLIC_ASSET_REF_${surface}_MISSING`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assertPublicAssetBytes(bytes, ref, surface);
}

export async function verifyExistingPublicAssetRefs(refs, { repoRoot, liveBaseUrl = "", requireLive = false }) {
  if (!Array.isArray(refs)) throw new Error("PUBLIC_ASSET_REFS_INVALID");
  if (refs.length && requireLive && !liveBaseUrl) throw new Error("PUBLIC_ASSET_REF_LIVE_BASE_REQUIRED");
  const seen = new Set();
  for (const ref of refs) {
    if (!ref || typeof ref !== "object" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref.source_slug || "") || !SHA256_RE.test(ref.sha256 || "") || !GIT_OID_RE.test(ref.git_oid || "")) throw new Error("PUBLIC_ASSET_REF_IDENTITY_INVALID");
    const publicPath = safeRelative(ref.public_path, "existing public asset path");
    const prefix = `assets/articles/${ref.source_slug}/`;
    if (/[\0\r\n]/.test(publicPath) || !publicPath.startsWith(prefix) || publicPath.slice(prefix.length).includes("/") || !IMAGE_RE.test(publicPath) || seen.has(publicPath)) throw new Error("PUBLIC_ASSET_REF_PATH_INVALID");
    seen.add(publicPath);

    const headBytes = gitObject(repoRoot, `HEAD:${publicPath}`, "PUBLIC_ASSET_REF_HEAD_MISSING");
    assertPublicAssetBytes(headBytes, ref, "HEAD");

    const indexRows = nulPaths(git(repoRoot, ["ls-files", "--stage", "-z", "--", publicPath]));
    const indexMatch = indexRows.length === 1 ? /^\d+ ([0-9a-f]{40,64}) 0\t(.+)$/.exec(indexRows[0]) : null;
    if (!indexMatch || indexMatch[2] !== publicPath) throw new Error("PUBLIC_ASSET_REF_INDEX_MISSING");
    if (indexMatch[1] !== ref.git_oid) throw new Error("PUBLIC_ASSET_REF_INDEX_MISMATCH");
    assertPublicAssetBytes(gitObject(repoRoot, `:${publicPath}`, "PUBLIC_ASSET_REF_INDEX_MISSING"), ref, "INDEX");

    let worktreeStat;
    const worktreePath = path.join(repoRoot, publicPath);
    try { worktreeStat = await fs.lstat(worktreePath); } catch (error) { if (error.code === "ENOENT") throw new Error("PUBLIC_ASSET_REF_WORKTREE_MISSING"); throw error; }
    if (!worktreeStat.isFile() || worktreeStat.isSymbolicLink()) throw new Error("PUBLIC_ASSET_REF_WORKTREE_INVALID");
    assertPublicAssetBytes(await fs.readFile(worktreePath), ref, "WORKTREE");

    if (ref.target_path) {
      const targetPath = safeRelative(ref.target_path, "future target asset path");
      if (targetPath === publicPath) throw new Error("PUBLIC_ASSET_REF_TARGET_PATH_FORBIDDEN");
      const headTarget = spawnSync("git", ["cat-file", "-e", `HEAD:${targetPath}`], { cwd: repoRoot, encoding: "utf8" });
      if (headTarget.status === 0 || nulPaths(git(repoRoot, ["ls-files", "--stage", "-z", "--", targetPath])).length) throw new Error("PACK_GIT_IMAGE_LEAK");
      try { await fs.lstat(path.join(repoRoot, targetPath)); throw new Error("PACK_GIT_IMAGE_LEAK"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }

    if (liveBaseUrl) {
      await fetchPublicAsset(new URL(publicPath, liveBaseUrl), ref, "LIVE");
      if (ref.target_path) {
        let targetResponse;
        try { targetResponse = await fetch(new URL(ref.target_path, liveBaseUrl), { redirect: "error", signal: AbortSignal.timeout(15000), headers: { "cache-control": "no-cache" } }); } catch { throw new Error("PUBLIC_ASSET_REF_TARGET_LIVE_UNAVAILABLE"); }
        if (targetResponse.status !== 404) throw new Error("PACK_LIVE_LEAK");
      }
    }
  }
  return refs;
}

async function liveContains(payload, baseUrl) {
  const { needles, directPaths } = contentNeedles(payload);
  const urls = ["/", "/articles/", "/search-index.json", "/en/search-index.json", "/feed.xml", "/feed.json", "/sitemap.xml", "/news-sitemap.xml", "/image-sitemap.xml", "/llms.txt", "/ai-index.json", "/knowledge-graph.json"];
  for (const direct of directPaths.filter((item) => item.endsWith(".html"))) urls.push(`/${direct}`);
  for (const url of urls) {
    const response = await fetch(new URL(url, baseUrl), { signal: AbortSignal.timeout(15000), headers: { "cache-control": "no-cache" } });
    if (url.includes("/articles/") && url.endsWith(".html") && response.status !== 404) return true;
    if (!response.ok && response.status !== 404) throw new Error("LIVE_LEAK_AUDIT_UNAVAILABLE");
    const body = response.ok ? await response.text() : "";
    if (needles.some((needle) => body.includes(needle))) return true;
  }
  return false;
}

async function packLeakGate(payload, { repoRoot, liveBaseUrl }) {
  const { needles, imageRecords, existingPublicAssetRefs } = contentNeedles(payload);
  await verifyExistingPublicAssetRefs(existingPublicAssetRefs, { repoRoot, liveBaseUrl, requireLive: true });
  for (const needle of needles) {
    const history = spawnSync("git", ["log", "--all", "--format=%H", "--fixed-strings", "-S", needle, "--", "."], { cwd: repoRoot, encoding: "utf8", maxBuffer: 1024 * 1024 });
    if (history.status !== 0) throw new Error("PACK_GIT_AUDIT_UNAVAILABLE:history");
    if (gitGrep(repoRoot, needle, "head") || gitGrep(repoRoot, needle, "index") || gitGrep(repoRoot, needle, "worktree") || history.stdout.trim()) throw new Error("PACK_GIT_LEAK");
  }
  if (await untrackedContains(repoRoot, needles)) throw new Error("PACK_GIT_UNTRACKED_LEAK");
  const reachable = new Set(git(repoRoot, ["rev-list", "--objects", "--all"]).toString("utf8").split("\n").map((line) => line.split(" ")[0]).filter(Boolean));
  const current = await currentImageOids(repoRoot);
  if (imageRecords.some((image) => !image.public_path && (reachable.has(image.git_oid) || current.has(image.git_oid)))) throw new Error("PACK_GIT_IMAGE_LEAK");
  if (liveBaseUrl && await liveContains(payload, liveBaseUrl)) throw new Error("PACK_LIVE_LEAK");
}

export async function packBundle({ inputRoot, outputPath, key, keyId = "v1", repoRoot = process.cwd(), liveBaseUrl = "https://drugnews.com.tw", skipLeakGate = false }) {
  const payload = await payloadFromInput(inputRoot);
  if (!skipLeakGate) await packLeakGate(payload, { repoRoot, liveBaseUrl });
  const plaintext = Buffer.from(stableJson(payload));
  const bundle = encryptEnvelope(plaintext, { key, keyId, jobId: payload.job_id });
  if (bundle.length > MAX_BUNDLE_BYTES) throw new Error("BUNDLE_TOO_LARGE");
  const check = decryptEnvelope(bundle, key, payload.job_id).plaintext;
  if (!crypto.timingSafeEqual(plaintext, check)) throw new Error("PACK_SELF_CHECK_FAILED");
  const expectedName = `${payload.job_id}.dnq`;
  const finalPath = outputPath.endsWith(".dnq") ? outputPath : path.join(outputPath, expectedName);
  if (path.basename(finalPath) !== expectedName) throw new Error("OUTPUT_JOB_ID_MISMATCH");
  await fs.mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
  const temp = `${finalPath}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  try {
    await fs.writeFile(temp, bundle, { mode: 0o600, flag: "wx" });
    await fs.rename(temp, finalPath);
  } finally {
    await fs.rm(temp, { force: true });
    plaintext.fill(0);
    check.fill(0);
  }
  return { job_id: payload.job_id, bytes: bundle.length, sha256: sha256(bundle), output: finalPath };
}

export async function preflightQueue(queueDir) {
  const entries = await fs.readdir(queueDir, { withFileTypes: true }).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
  const stats = [];
  for (const entry of entries) {
    const full = path.join(queueDir, entry.name);
    const stat = await fs.lstat(full);
    if (entry.name === "README.md") {
      if (!entry.isFile() || stat.isSymbolicLink()) throw new Error("QUEUE_ENTRY_INVALID");
      continue;
    }
    if (!/^[0-9a-f]{32}\.dnq$/.test(entry.name)) throw new Error("QUEUE_UNKNOWN_ENTRY");
    const jobId = entry.name.slice(0, -4);
    if (!entry.isFile() || stat.isSymbolicLink() || !JOB_ID_RE.test(jobId)) throw new Error("QUEUE_ENTRY_INVALID");
    stats.push({ jobId, file: full, bytes: stat.size });
  }
  stats.sort((a, b) => Buffer.from(a.jobId).compare(Buffer.from(b.jobId)));
  const limits = validateQueueLimitsFromStats(stats);
  if (!limits.ok) throw Object.assign(new Error(limits.reason), limits);
  const digestInput = [];
  for (const item of stats) digestInput.push({ job_id: item.jobId, sha256: await sha256File(item.file) });
  const digest = sha256(stableJson(digestInput));
  return { ...limits, stats, digest };
}

async function existingArticleMatches(publishedRoot, article) {
  const root = path.join(publishedRoot, article.slug);
  try {
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  for (const file of article.files) {
    try {
      const data = await fs.readFile(path.join(root, safeRelative(file.path)));
      if (sha256(data) !== file.sha256) return false;
    } catch { return false; }
  }
  return true;
}

function safeSummaryRecord(jobId) {
  return { job_id: jobId, state: "held", reason: "UNVALIDATED" };
}

async function decryptAndValidate(item, env) {
  const bundle = await fs.readFile(item.file);
  try {
    const envelope = parseEnvelope(bundle, item.jobId);
    const key = keyForId(envelope.keyId, env);
    const opened = decryptEnvelope(bundle, key, item.jobId);
    try {
      const payload = JSON.parse(opened.plaintext.toString("utf8"));
      const metas = validatePayload(payload, item.jobId);
      return { payload, metas, keyId: envelope.keyId };
    } finally {
      opened.plaintext.fill(0);
    }
  } finally {
    bundle.fill(0);
  }
}

async function materialize(payload, stagingRoot) {
  for (const article of Object.values(payload.articles)) {
    const target = path.join(stagingRoot, article.slug);
    await fs.mkdir(target, { recursive: true, mode: 0o700 });
    for (const file of article.files) {
      const output = path.join(target, safeRelative(file.path));
      await fs.mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
      await fs.writeFile(output, Buffer.from(file.data, "base64"), { mode: 0o600 });
    }
  }
}

async function writePrivateJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export async function prepareQueue({ queueDir, workDir, publishedRoot, now = new Date(), env = process.env }) {
  const clock = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(clock.getTime())) throw new Error("CLOCK_INVALID");
  const preflight = await preflightQueue(queueDir);
  if (!String(env.DRUGNEWS_QUEUE_KEY_B64 || "").trim() && !String(env.DRUGNEWS_QUEUE_KEY_B64_V2 || "").trim()) throw new Error("QUEUE_SECRET_MISSING");
  const referencedKeyIds = new Set();
  for (const item of preflight.stats.filter((candidate) => !bundleSizeReason(candidate.bytes))) {
    try { referencedKeyIds.add(parseEnvelope(await fs.readFile(item.file), item.jobId).keyId); } catch { /* Per-bundle envelope gate reports this below. */ }
  }
  for (const keyId of referencedKeyIds) keyForId(keyId, env);
  const stagingRoot = path.join(workDir, "staging");
  const auditFile = path.join(workDir, "private-audit.json");
  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(stagingRoot, { recursive: true, mode: 0o700 });
  const results = new Map(preflight.stats.map((item) => [item.jobId, safeSummaryRecord(item.jobId)]));
  const valid = [];
  const auditJobs = [];
  let authFailures = 0;
  let authAttempts = 0;

  for (const item of preflight.stats) {
    const result = results.get(item.jobId);
    const sizeReason = bundleSizeReason(item.bytes);
    if (sizeReason) { Object.assign(result, { reason: sizeReason }); continue; }
    try {
      authAttempts += 1;
      const opened = await decryptAndValidate(item, env);
      const { payload, metas } = opened;
      const state = payload.state === "revoked"
        ? "validated_revoked"
        : payload.state === "superseded"
          ? "validated_superseded"
          : Date.parse(payload.publish_at) <= clock.getTime() ? "due" : "validated_pending";
      const articleFiles = Object.values(payload.articles).map((article) => ({ slug: article.slug, files: article.files.map(({ path: filePath, sha256: digest }) => ({ path: filePath, sha256: digest })) }));
      valid.push({ item, jobId: item.jobId, state, hash: payload.approved_content_hash, contentId: payload.content_id, releaseKey: payload.release_key, lockVersion: String(payload.lock.version), publishAt: payload.publish_at, articleFiles });
      const leak = contentNeedles(payload);
      auditJobs.push({ job_id: item.jobId, state, publish_at: payload.publish_at, approved_content_hash: payload.approved_content_hash, ...leak });
      Object.assign(result, { state, reason: "" });
    } catch (error) {
      const reason = /auth|authenticate/i.test(error.message) ? "AUTH_FAILED" : error.message;
      if (reason === "AUTH_FAILED") authFailures += 1;
      Object.assign(result, { reason });
    }
  }
  if (authAttempts && authFailures === authAttempts) throw new Error("QUEUE_KEY_AUTH_FAILED");

  const collisions = new Map();
  const contentIds = new Map();
  const releaseKeys = new Map();
  for (const job of valid) {
    if (!contentIds.has(job.contentId)) contentIds.set(job.contentId, []);
    contentIds.get(job.contentId).push(job);
    if (!releaseKeys.has(job.releaseKey)) releaseKeys.set(job.releaseKey, []);
    releaseKeys.get(job.releaseKey).push(job);
    for (const article of job.articleFiles) {
      if (!collisions.has(article.slug)) collisions.set(article.slug, []);
      collisions.get(article.slug).push(job);
    }
  }
  for (const jobs of contentIds.values()) {
    const identities = new Set(jobs.map((job) => `${job.lockVersion}:${job.hash}`));
    if (identities.size > 1) for (const job of jobs) Object.assign(results.get(job.jobId), { state: "held", reason: "CONTENT_ID_VERSION_CONFLICT" });
  }
  for (const jobs of releaseKeys.values()) {
    if (new Set(jobs.map((job) => job.hash)).size > 1) for (const job of jobs) Object.assign(results.get(job.jobId), { state: "held", reason: "RELEASE_KEY_CONFLICT" });
  }
  for (const jobs of collisions.values()) {
    if (new Set(jobs.map((job) => job.hash)).size > 1) {
      for (const job of jobs) Object.assign(results.get(job.jobId), { state: "held", reason: "SLUG_CONFLICT" });
    }
  }
  for (const job of valid) {
    if (results.get(job.jobId).state === "held") continue;
    const matches = [];
    for (const article of job.articleFiles) {
      const match = await existingArticleMatches(publishedRoot, article);
      matches.push(match);
      if (match === false) Object.assign(results.get(job.jobId), { state: "held", reason: "SLUG_CONFLICT_PUBLISHED" });
    }
    if (results.get(job.jobId).state === "due" && matches.length && matches.every((match) => match === true)) {
      Object.assign(results.get(job.jobId), { state: "legacy_e4", reason: "LOCKED_BYTES_ALREADY_PUBLISHED" });
    }
  }

  const materializedSlugs = new Set();
  for (const job of valid
    .filter((candidate) => results.get(candidate.jobId).state === "due")
    .sort(compareDueJobs)) {
    const slugKey = job.articleFiles.map((article) => article.slug).sort().join("|") + `:${job.hash}`;
    if (materializedSlugs.has(slugKey)) { Object.assign(results.get(job.jobId), { state: "duplicate", reason: "SAME_HASH_DUPLICATE" }); continue; }
    const opened = await decryptAndValidate(job.item, env);
    try { await materialize(opened.payload, stagingRoot); } finally {
      for (const article of Object.values(opened.payload.articles)) for (const file of article.files) file.data = "";
    }
    materializedSlugs.add(slugKey);
  }

  const safeResults = [...results.values()];
  const summary = {
    schema_version: 1,
    clock: clock.toISOString(),
    queue_digest: preflight.digest,
    queue_count: preflight.count,
    queue_slots_used: preflight.count,
    queue_slots_remaining: MAX_JOBS - preflight.count,
    queue_bytes: preflight.totalBytes,
    due_count: safeResults.filter((item) => item.state === "due").length,
    newly_due_count: safeResults.filter((item) => {
      const job = valid.find((candidate) => candidate.jobId === item.job_id);
      const elapsed = job ? clock.getTime() - Date.parse(job.publishAt) : Number.POSITIVE_INFINITY;
      return item.state === "due" && elapsed >= 0 && elapsed <= 15 * 60 * 1000;
    }).length,
    legacy_e4_count: safeResults.filter((item) => item.state === "legacy_e4").length,
    pending_count: safeResults.filter((item) => item.state === "validated_pending").length,
    held_count: safeResults.filter((item) => item.state === "held").length,
    jobs: safeResults
  };
  for (const auditJob of auditJobs) auditJob.state = results.get(auditJob.job_id)?.state || "held";
  await writePrivateJson(auditFile, { schema_version: 1, clock: clock.toISOString(), queue_digest: preflight.digest, jobs: auditJobs });
  await writePrivateJson(path.join(workDir, "summary.json"), summary);
  return { ...summary, stagingRoot, auditFile };
}

function parseCli(argv) {
  const positionals = [];
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) positionals.push(arg);
    else {
      const [key, ...rest] = arg.slice(2).split("=");
      options[key] = rest.length ? rest.join("=") : true;
    }
  }
  return { command: positionals[0] || "", options };
}

async function appendGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const text = Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
  await fs.appendFile(process.env.GITHUB_OUTPUT, text);
}

async function appendStepSummary(lines) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
}

async function cli() {
  const { command, options } = parseCli(process.argv.slice(2));
  if (command === "pack") {
    if (!options.input || !options.output) throw new Error("pack requires --input and --output");
    const keyId = String(options["key-id"] || "v1");
    const result = await packBundle({ inputRoot: path.resolve(options.input), outputPath: path.resolve(options.output), key: keyForId(keyId), keyId });
    console.log(JSON.stringify({ status: "packed", job_id: result.job_id, bytes: result.bytes, sha256: result.sha256 }, null, 2));
    return;
  }
  if (command === "prepare") {
    const workDir = path.resolve(String(options["work-dir"] || "/tmp/drugnews-queue"));
    const summary = await prepareQueue({
      queueDir: path.resolve(String(options.queue || "content/scheduled")),
      workDir,
      publishedRoot: path.resolve(String(options.published || "content/published")),
      now: options.now ? new Date(String(options.now)) : new Date()
    });
    await appendGithubOutput({ due_count: summary.due_count, newly_due_count: summary.newly_due_count, queue_digest: summary.queue_digest, staging_root: summary.stagingRoot, audit_file: summary.auditFile });
    await appendStepSummary(["## Encrypted publishing queue", "", `- Capacity: ${summary.queue_slots_used}/${MAX_JOBS} used; ${summary.queue_slots_remaining} slots remaining`, `- Due: ${summary.due_count}; legacy E4: ${summary.legacy_e4_count}; pending: ${summary.pending_count}; held: ${summary.held_count}`, `- Queue digest: \`${summary.queue_digest}\``]);
    console.log(JSON.stringify({ status: "prepared", queue_digest: summary.queue_digest, queue_count: summary.queue_count, due_count: summary.due_count, newly_due_count: summary.newly_due_count, legacy_e4_count: summary.legacy_e4_count, pending_count: summary.pending_count, held_count: summary.held_count, jobs: summary.jobs }, null, 2));
    return;
  }
  throw new Error("Usage: scheduled_queue.mjs pack|prepare [--key=value]");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  cli().catch(async (error) => {
    console.error(error.message);
    await appendStepSummary(["## Encrypted publishing queue", "", `- HOLD: \`${error.message}\``, "- Deployment was not started."]);
    process.exitCode = 1;
  });
}
