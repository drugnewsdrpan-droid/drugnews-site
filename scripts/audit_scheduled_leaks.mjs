import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bodyCanaries, canonicalRenderedBody, sha256Text } from "./scheduled_content_integrity.mjs";
import { verifyExistingPublicAssetRefs } from "./scheduled_queue.mjs";

const BASE_URL = "https://drugnews.com.tw";
const TEXT_EXT = /\.(?:css|html?|js|json|txt|xml)$/i;
const IMAGE_EXT = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeRelative(value) {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) throw new Error("AUDIT_PATH_INVALID");
  return normalized;
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

async function walk(root, relative = "") {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = safeRelative(path.posix.join(relative, entry.name));
    if (entry.isDirectory()) files.push(...await walk(root, rel));
    else if (entry.isFile()) files.push(rel);
    else throw new Error("AUDIT_NON_REGULAR_FILE");
  }
  return files;
}

async function loadAudit(filePath) {
  const audit = JSON.parse(await fs.readFile(filePath, "utf8"));
  if (audit.schema_version !== 1 || !Array.isArray(audit.jobs) || Number.isNaN(Date.parse(audit.clock || ""))) throw new Error("AUDIT_DESCRIPTOR_INVALID");
  return audit;
}

function publicState(job, clock) {
  if (["validated_pending", "validated_revoked", "validated_superseded"].includes(job.state)) return "private";
  if (job.state === "held" && Date.parse(job.publish_at) > Date.parse(clock)) return "private";
  if (["due", "duplicate", "legacy_e4"].includes(job.state)) return "public";
  return "unchanged";
}

function occurrences(text, token) {
  let count = 0;
  let at = 0;
  while (token && (at = text.indexOf(token, at)) !== -1) { count += 1; at += token.length; }
  return count;
}

async function textCorpus(root, files) {
  const values = new Map();
  for (const file of files.filter((item) => TEXT_EXT.test(item))) values.set(file, await fs.readFile(path.join(root, file), "utf8"));
  return values;
}

async function imageHashPaths(root, files) {
  const values = new Map();
  for (const file of files.filter((item) => IMAGE_EXT.test(item))) {
    const digest = sha256(await fs.readFile(path.join(root, file)));
    if (!values.has(digest)) values.set(digest, new Set());
    values.get(digest).add(file);
  }
  return values;
}

async function candidatePublicAssetPaths(root, refs) {
  const allowed = new Map();
  for (const ref of refs) {
    const sourcePath = safeRelative(ref.public_path);
    const targetPath = safeRelative(ref.target_path);
    if (sourcePath === targetPath) throw new Error("PUBLIC_ASSET_REF_TARGET_PATH_FORBIDDEN");
    let stat;
    try { stat = await fs.lstat(path.join(root, sourcePath)); } catch (error) { if (error.code === "ENOENT") throw new Error("PUBLIC_ASSET_REF_CANDIDATE_MISSING"); throw error; }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("PUBLIC_ASSET_REF_CANDIDATE_INVALID");
    if (sha256(await fs.readFile(path.join(root, sourcePath))) !== ref.sha256) throw new Error("PUBLIC_ASSET_REF_CANDIDATE_MISMATCH");
    if (await exists(path.join(root, targetPath))) throw new Error("T_MINUS_DIRECT_ASSET_LEAK");
    if (!allowed.has(ref.sha256)) allowed.set(ref.sha256, new Set());
    allowed.get(ref.sha256).add(sourcePath);
  }
  return allowed;
}

function addFailure(failures, job, reason, surface = "") {
  failures.push({ job_id: job.job_id, reason, ...(surface ? { surface } : {}) });
}

function gitNeedlePresent(repoRoot, needle, history) {
  const args = history
    ? ["log", "--all", "--format=%H", "--fixed-strings", "-S", needle, "--", "."]
    : ["grep", "-I", "-q", "-F", needle, "HEAD"];
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 1024 * 1024 });
  return history ? Boolean(result.stdout.trim()) : result.status === 0;
}

function reachableGitObjects(repoRoot) {
  const result = spawnSync("git", ["rev-list", "--objects", "--all"], { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("GIT_HISTORY_AUDIT_UNAVAILABLE");
  return new Set(result.stdout.split("\n").map((line) => line.split(" ")[0]).filter(Boolean));
}

function parseJson(text, surface) {
  try { return JSON.parse(text); } catch { throw new Error(`AUDIT_JSON_INVALID:${surface}`); }
}

const CATEGORY_SLUGS = new Map([["生技估值", "biotech-valuation"], ["公司研究", "company-research"], ["BD / 授權", "bd-licensing"], ["臨床與 CMC", "clinical-cmc"], ["IR 與資本市場", "ir-capital-markets"], ["活動紀錄", "events"], ["商業分析系列", "business-analysis"], ["基本面系列", "fundamental-analysis"], ["醫學大會", "medical-conference"], ["付費深度商業分析文章系列", "paid-deep-analysis"], ["製藥巨頭系列", "big-pharma"]]);

function scheduledTopFive(audit, lang) {
  return audit.jobs
    .filter((job) => publicState(job, audit.clock) === "public")
    .flatMap((job) => (job.articles || []).filter((article) => article.lang === lang).map((article) => ({ article, publishAt: job.publish_at })))
    .sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt) || b.article.title.localeCompare(a.article.title))
    .slice(0, 5)
    .map((item) => item.article.url_path);
}

function expectedSurfaces(article, job, audit) {
  const common = ["sitemap.xml", "image-sitemap.xml", "llms.txt", "ai-index.json", "knowledge-graph.json"];
  const permanent = article.lang === "en"
    ? ["en/articles/index.html", "en/search-index.json", "en/feed.xml", "en/feed.json", ...common]
    : ["articles/index.html", "search-index.json", "feed.xml", "feed.json", "market-radar.json", "search-intents.json", `articles/category/${CATEGORY_SLUGS.get(article.category) || "uncategorized"}.html`, ...(article.topic_paths || []), ...common];
  const timed = [];
  if (scheduledTopFive(audit, article.lang).includes(article.url_path)) timed.push(article.lang === "en" ? "en/index.html" : "index.html");
  const published = Date.parse(job.publish_at);
  const clock = Date.parse(audit.clock);
  if (published >= clock - (48 * 60 * 60 * 1000) && published <= clock + (60 * 60 * 1000)) timed.push("news-sitemap.xml");
  if (article.company_indexed && published >= clock - (48 * 60 * 60 * 1000) && published <= clock + (60 * 60 * 1000)) timed.push("companies.html");
  return [...permanent, ...timed];
}

function countJsonValue(value, expected) {
  if (value === expected) return 1;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countJsonValue(item, expected), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((sum, item) => sum + countJsonValue(item, expected), 0);
  return 0;
}

function countArticleRows(rows, article, url) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row && typeof row === "object" && (
    row.url === url || row.canonical_url === url || row.external_url === url || row.slug === article.slug
  )).length;
}

function exactStructuredEntry(text, surface, article, baseUrl) {
  const url = `${baseUrl}/${article.url_path}`;
  if (surface.endsWith("search-index.json")) {
    const rows = parseJson(text, surface);
    return Array.isArray(rows) ? rows.filter((row) => row.slug === article.slug || String(row.url || "").endsWith(article.url_path)).length : 0;
  }
  if (surface.endsWith("feed.json")) {
    const rows = parseJson(text, surface).items || [];
    return rows.filter((row) => row.url === url || row.external_url === url).length;
  }
  if (surface.endsWith("feed.xml")) return occurrences(text, `<link>${url}</link>`);
  if (["sitemap.xml", "news-sitemap.xml", "image-sitemap.xml"].includes(surface)) return occurrences(text, `<loc>${url}</loc>`);
  const basename = path.posix.basename(article.url_path);
  if (surface === "index.html") return occurrences(text, `href="articles/${basename}"`);
  if (surface === "articles/index.html") return occurrences(text, `href="${basename}"`);
  if (surface === "en/index.html") return occurrences(text, `href="../articles/${basename}"`);
  if (surface === "en/articles/index.html") return occurrences(text, `href="../../articles/${basename}"`);
  if (surface.startsWith("articles/category/")) return occurrences(text, `href="../${basename}"`);
  if (surface === "companies.html") return occurrences(text, `href="${article.url_path}"`) > 0 ? 1 : 0;
  if (surface.startsWith("topics/")) {
    const escaped = article.url_path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [...text.matchAll(new RegExp(`<a\\b[^>]*class="[^"]*topic-hub-article[^"]*"[^>]*href="\\.\\.\\/${escaped}"`, "gu"))].length;
  }
  if (surface.endsWith(".json")) {
    const payload = parseJson(text, surface);
    if (surface === "ai-index.json" || surface === "knowledge-graph.json") return countArticleRows(payload.latest_articles, article, url);
    if (surface === "search-intents.json") return countArticleRows(payload.latest_canonical_articles, article, url);
    if (surface === "market-radar.json") return countArticleRows((payload.buckets || []).flatMap((bucket) => bucket.articles || []), article, url);
    return countJsonValue(payload, url);
  }
  if (surface === "llms.txt") return occurrences(text, `URL: ${url}`);
  return occurrences(text, url);
}

function allArticleImages(article) {
  const seen = new Set();
  return [...(article.images || []), ...(article.website_images || [])].filter((image) => {
    if (!image?.path || seen.has(image.path)) return false;
    seen.add(image.path);
    return true;
  });
}

function auditDirectHtml(text, article, pairedArticles, baseUrl) {
  const url = `${baseUrl}/${article.url_path}`;
  if (!text.includes(article.title)) return "DIRECT_TITLE_MISSING";
  if (!text.includes(`rel="canonical" href="${url}"`)) return "CANONICAL_MISSING";
  if (!text.includes("application/ld+json") || !text.includes('property="og:')) return "SCHEMA_OR_OG_MISSING";
  const body = canonicalRenderedBody(text);
  if (!body || sha256Text(body) !== article.body_sha256) return "BODY_DIGEST_MISMATCH";
  if ((article.body_canaries || bodyCanaries(body)).some((canary) => !body.includes(canary))) return "BODY_CANARY_MISSING";
  let lastImage = -1;
  for (const image of article.images || []) {
    const basename = path.posix.basename(image.path);
    const at = text.indexOf(image.path, lastImage + 1);
    if (at === -1 || at < lastImage) return "IMAGE_REFERENCE_OR_ORDER_MISMATCH";
    const tag = text.match(new RegExp(`<img\\b[^>]*src="[^"]*${basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`, "u"))?.[0] || "";
    if (!/\balt="[^"]+"/u.test(tag)) return "IMAGE_ALT_MISSING";
    lastImage = at;
  }
  for (const image of article.website_images || []) {
    if (!(image.roles || ["cover_image"]).includes("cover_image")) continue;
    const basename = path.posix.basename(image.path);
    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tag = text.match(new RegExp(`<img\\b[^>]*src="[^"]*${escaped}"[^>]*>`, "u"))?.[0] || "";
    if (!text.includes(image.path) && !text.includes(encodeURIComponent(basename))) return "WEBSITE_IMAGE_REFERENCE_MISSING";
    if (tag && !/\balt="[^"]+"/u.test(tag)) return "WEBSITE_IMAGE_ALT_MISSING";
  }
  const selfLang = article.lang === "en" ? "en" : "zh-Hant";
  if (!text.includes(`hreflang="${selfLang}" href="${url}"`)) return "HREFLANG_SELF_MISSING";
  if (pairedArticles.length > 1) {
    const other = pairedArticles.find((candidate) => candidate.lang !== article.lang);
    const otherLang = other?.lang === "en" ? "en" : "zh-Hant";
    if (!other || !text.includes(`hreflang="${otherLang}" href="${baseUrl}/${other.url_path}"`)) return "HREFLANG_PAIR_MISSING";
  } else if (article.lang !== "en" && /hreflang="en"/u.test(text)) {
    return "ENGLISH_HOLD_HREFLANG_LEAK";
  }
  return "";
}

export async function auditCandidate({ root, auditFile, liveBaseUrl = "", repoRoot = process.cwd(), skipLiveInventory = false, skipGitAudit = false }) {
  const audit = await loadAudit(auditFile);
  const files = await walk(root);
  const texts = await textCorpus(root, files);
  const imageHashes = await imageHashPaths(root, files);
  const corpus = [...texts.values()].join("\n");
  const failures = [];
  const reachable = skipGitAudit ? new Set() : reachableGitObjects(repoRoot);

  for (const job of audit.jobs) {
    const state = publicState(job, audit.clock);
    if (state === "private") {
      const refs = job.existingPublicAssetRefs || [];
      let allowedImagePaths = new Map();
      let refsVerified = false;
      try {
        await verifyExistingPublicAssetRefs(refs, { repoRoot, liveBaseUrl });
        allowedImagePaths = await candidatePublicAssetPaths(root, refs);
        refsVerified = true;
      } catch (error) {
        addFailure(failures, job, error.message);
      }
      const imageRecords = job.imageRecords || (job.imageHashes || []).map((sha256, index) => ({ sha256, git_oid: job.imageGitOids?.[index] || "" }));
      const hasVerifiedRef = (image) => refsVerified && refs.some((ref) => ref.public_path === image.public_path && ref.sha256 === image.sha256 && ref.git_oid === image.git_oid);
      for (const direct of job.directPaths || []) if (await exists(path.join(root, safeRelative(direct)))) addFailure(failures, job, "T_MINUS_DIRECT_LEAK", direct);
      if ((job.needles || []).some((needle) => corpus.includes(needle))) addFailure(failures, job, "T_MINUS_TEXT_LEAK");
      if (imageRecords.some((image) => [...(imageHashes.get(image.sha256) || [])].some((imagePath) => !hasVerifiedRef(image) || !allowedImagePaths.get(image.sha256)?.has(imagePath)))) addFailure(failures, job, "T_MINUS_IMAGE_LEAK");
      if (!skipGitAudit && (job.needles || []).some((needle) => gitNeedlePresent(repoRoot, needle, false) || gitNeedlePresent(repoRoot, needle, true))) addFailure(failures, job, "T_MINUS_GIT_TEXT_LEAK");
      if (!skipGitAudit && imageRecords.some((image) => !hasVerifiedRef(image) && reachable.has(image.git_oid))) addFailure(failures, job, "T_MINUS_GIT_IMAGE_LEAK");
      continue;
    }
    if (state !== "public") continue;
    for (const article of job.articles || []) {
      const direct = safeRelative(article.url_path);
      if (!texts.has(direct)) { addFailure(failures, job, "T_PLUS_DIRECT_MISSING", direct); continue; }
      const directReason = auditDirectHtml(texts.get(direct), article, job.articles, BASE_URL);
      if (directReason) addFailure(failures, job, directReason, direct);
      for (const image of allArticleImages(article)) {
        const imagePath = safeRelative(image.path);
        if (!files.includes(imagePath)) addFailure(failures, job, "T_PLUS_IMAGE_MISSING", imagePath);
        else if (sha256(await fs.readFile(path.join(root, imagePath))) !== image.sha256) addFailure(failures, job, "T_PLUS_IMAGE_HASH_MISMATCH", imagePath);
      }
      for (const surface of expectedSurfaces(article, job, audit)) {
        if (!texts.has(surface)) { addFailure(failures, job, "ENTRYPOINT_MISSING", surface); continue; }
        const count = exactStructuredEntry(texts.get(surface), surface, article, BASE_URL);
        if (count !== 1) addFailure(failures, job, count === 0 ? "ENTRYPOINT_ZERO" : "ENTRYPOINT_DUPLICATE", surface);
      }
    }
  }

  if (!skipLiveInventory && liveBaseUrl) {
    const revoked = new Set(audit.jobs.filter((job) => job.state === "validated_revoked").flatMap((job) => (job.articles || []).map((article) => article.url_path)));
    for (const surface of ["search-index.json", "en/search-index.json"]) {
      const response = await fetch(new URL(surface, liveBaseUrl), { signal: AbortSignal.timeout(20000), headers: { "cache-control": "no-cache" } });
      if (!response.ok) throw new Error(`LIVE_INVENTORY_UNAVAILABLE:${surface}`);
      const live = await response.json();
      for (const row of Array.isArray(live) ? live : []) {
        const localPath = String(row.url || row.fileName || "").replace(/^https:\/\/drugnews\.com\.tw\//, "").replace(/^\.\.\//, "articles/");
        if (localPath && localPath.includes("articles/") && !revoked.has(localPath) && !(await exists(path.join(root, safeRelative(localPath))))) throw new Error("LIVE_INVENTORY_REGRESSION");
      }
    }
  }
  if (failures.length) throw Object.assign(new Error("SCHEDULED_LEAK_AUDIT_FAILED"), { failures });
  return { status: "pass", queue_digest: audit.queue_digest, jobs: audit.jobs.length, public_jobs: audit.jobs.filter((job) => publicState(job, audit.clock) === "public").length };
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "cache-control": "no-cache" } });
  return { status: response.status, ok: response.ok, body: response.ok ? await response.text() : "" };
}

export async function auditLive({ auditFile, baseUrl = BASE_URL, canonicalBaseUrl = BASE_URL }) {
  const audit = await loadAudit(auditFile);
  const failures = [];
  const cache = new Map();
  const requestBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const get = async (relative) => {
    if (!cache.has(relative)) cache.set(relative, fetchText(new URL(relative, requestBaseUrl).toString()));
    return cache.get(relative);
  };
  for (const job of audit.jobs) {
    const state = publicState(job, audit.clock);
    if (state === "private") {
      for (const ref of job.existingPublicAssetRefs || []) {
        let response;
        try { response = await fetch(new URL(safeRelative(ref.public_path), requestBaseUrl), { redirect: "error", signal: AbortSignal.timeout(20000), headers: { "cache-control": "no-cache" } }); } catch { response = null; }
        const bytes = response?.status === 200 ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
        if (response?.status !== 200 || sha256(bytes) !== ref.sha256) addFailure(failures, job, "LIVE_PUBLIC_ASSET_REF_FAIL", ref.public_path);
      }
      for (const article of job.articles || []) {
        const response = await get(article.url_path);
        if (response.status !== 404) addFailure(failures, job, "LIVE_T_MINUS_NOT_404", article.url_path);
        for (const image of allArticleImages(article)) {
          const asset = await get(image.path);
          if (asset.status !== 404) addFailure(failures, job, "LIVE_T_MINUS_ASSET_NOT_404", image.path);
        }
      }
      const privateSurfaces = new Set(["", "articles/", "en/", "en/articles/", "search-index.json", "en/search-index.json", "feed.xml", "feed.json", "en/feed.xml", "en/feed.json", "sitemap.xml", "news-sitemap.xml", "image-sitemap.xml", "market-radar.json", "search-intents.json", "llms.txt", "ai-index.json", "knowledge-graph.json", "companies.html", "topics/", ...job.articles.flatMap((article) => article.topic_paths || [])]);
      for (const surface of privateSurfaces) {
        const response = await get(surface);
        if (!response.ok || (job.needles || []).some((needle) => response.body.includes(needle))) addFailure(failures, job, response.ok ? "LIVE_T_MINUS_TEXT_LEAK" : "LIVE_SURFACE_UNAVAILABLE", surface || "/");
      }
      continue;
    }
    if (state !== "public") continue;
    for (const article of job.articles || []) {
      const direct = await get(article.url_path);
      if (!direct.ok || auditDirectHtml(direct.body, article, job.articles, canonicalBaseUrl)) addFailure(failures, job, "LIVE_DIRECT_E4_FAIL", article.url_path);
      for (const image of allArticleImages(article)) {
        const response = await fetch(new URL(image.path, requestBaseUrl), { signal: AbortSignal.timeout(20000), headers: { "cache-control": "no-cache" } });
        const bytes = response.ok ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
        if (!response.ok || sha256(bytes) !== image.sha256) addFailure(failures, job, "LIVE_IMAGE_E4_FAIL", image.path);
      }
      for (const surface of expectedSurfaces(article, job, audit)) {
        const response = await get(surface);
        if (!response.ok || exactStructuredEntry(response.body, surface, article, canonicalBaseUrl) !== 1) addFailure(failures, job, "LIVE_ENTRYPOINT_E4_FAIL", surface);
      }
    }
  }
  if (failures.length) throw Object.assign(new Error("SCHEDULED_LIVE_E4_FAILED"), { failures });
  return { status: "pass", queue_digest: audit.queue_digest };
}

export async function writeIndexNowBrief({ auditFile, output, baseUrl = BASE_URL }) {
  const audit = await loadAudit(auditFile);
  const urls = [];
  const clock = Date.parse(audit.clock);
  for (const job of audit.jobs.filter((item) => item.state === "due" && clock - Date.parse(item.publish_at) >= 0 && clock - Date.parse(item.publish_at) <= 15 * 60 * 1000)) {
    for (const article of job.articles || []) urls.push(`${baseUrl}/${article.url_path}`);
  }
  const unique = [...new Set(urls)].sort();
  const brief = { schema_version: 1, queue_digest: audit.queue_digest, search_submission_urls: unique };
  await fs.writeFile(output, `${JSON.stringify(brief, null, 2)}\n`, { mode: 0o600 });
  return { status: "ready", url_count: unique.length };
}

function parseCli(argv) {
  const positionals = [];
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) positionals.push(arg);
    else { const [key, ...value] = arg.slice(2).split("="); options[key] = value.length ? value.join("=") : true; }
  }
  return { command: positionals[0], options };
}

async function cli() {
  const { command, options } = parseCli(process.argv.slice(2));
  if (!options["audit-file"]) throw new Error("--audit-file is required");
  let result;
  if (command === "candidate") result = await auditCandidate({ root: path.resolve(String(options.root || "_site")), auditFile: path.resolve(String(options["audit-file"])), liveBaseUrl: String(options["live-base"] || ""), repoRoot: path.resolve(String(options["repo-root"] || ".")), skipLiveInventory: options["skip-live-inventory"] === true, skipGitAudit: options["skip-git-audit"] === true });
  else if (command === "live") result = await auditLive({ auditFile: path.resolve(String(options["audit-file"])), baseUrl: String(options["base-url"] || BASE_URL) });
  else if (command === "indexnow") {
    if (!options.output) throw new Error("indexnow requires --output");
    result = await writeIndexNowBrief({ auditFile: path.resolve(String(options["audit-file"])), output: path.resolve(String(options.output)), baseUrl: String(options["base-url"] || BASE_URL) });
  } else throw new Error("Usage: audit_scheduled_leaks.mjs candidate|live|indexnow --audit-file=...");
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  cli().catch((error) => {
    console.error(JSON.stringify({ status: "fail", reason: error.message, failures: error.failures || [] }));
    process.exitCode = 1;
  });
}
