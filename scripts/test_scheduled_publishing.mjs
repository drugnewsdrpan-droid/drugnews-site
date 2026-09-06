import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  MAX_BUNDLE_BYTES,
  MAX_QUEUE_BYTES,
  bundleSizeReason,
  compareDueJobs,
  computeApprovedContentHash,
  decryptEnvelope,
  encryptEnvelope,
  packBundle,
  preflightQueue,
  prepareQueue,
  validatePayload,
  validateQueueLimitsFromStats
} from "./scheduled_queue.mjs";
import { auditCandidate, auditLive, writeIndexNowBrief } from "./audit_scheduled_leaks.mjs";

const KEY = Buffer.alloc(32, 0x42);
const KEY_V2 = Buffer.alloc(32, 0x24);
const ENV = { DRUGNEWS_QUEUE_KEY_B64: KEY.toString("base64") };
const ENV_V2 = { DRUGNEWS_QUEUE_KEY_B64_V2: KEY_V2.toString("base64") };
const ENV_MIXED = { ...ENV, ...ENV_V2 };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=", "base64");
const tests = [];
const REPO_ROOT = process.cwd();

function test(name, fn) { tests.push({ name, fn }); }
function digest(data) { return crypto.createHash("sha256").update(data).digest("hex"); }
function gitOid(data) { return crypto.createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex"); }
async function write(file, data) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); }
async function captureRejection(fn) {
  let caught;
  try { await fn(); } catch (error) { caught = error; }
  assert(caught, "expected operation to reject");
  return caught;
}

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result;
}

async function makeGitRepo(parent, name = "leak-repo") {
  const root = path.join(parent, name);
  await fs.mkdir(root, { recursive: true });
  run("git", ["init", "-q"], root);
  run("git", ["config", "user.email", "scheduler-test@example.invalid"], root);
  run("git", ["config", "user.name", "Scheduler Test"], root);
  await write(path.join(root, "baseline.txt"), "clean baseline\n");
  run("git", ["add", "baseline.txt"], root);
  run("git", ["commit", "-qm", "baseline"], root);
  return root;
}

const PACK_REPO_PARENT = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-pack-repo-"));
const PACK_REPO = await makeGitRepo(PACK_REPO_PARENT);

async function treeDigest(root) {
  const rows = [];
  async function walk(relative = "") {
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
      const rel = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(rel);
      else rows.push(`${rel}:${digest(await fs.readFile(path.join(root, rel)))}`);
    }
  }
  await walk();
  return digest(rows.sort().join("\n"));
}

function metaFor({ slug, title, publishAt, lang }) {
  return {
    title,
    slug,
    date: publishAt.slice(0, 10),
    publish_at: publishAt,
    author: "Drugnews Test",
    category: "商業分析系列",
    tags: ["AI", "synthetic", slug],
    summary: `Synthetic summary for ${slug}`,
    access: lang === "en" ? "Free Article" : "免費文章",
    publish_attributes: { visibility: "public", paywall: false },
    lang,
    cover_image: "images/cover.png",
    responsive_card_image: false
  };
}

async function articleSpec(root, name, { slug, title, publishAt, lang }) {
  const articleRoot = path.join(root, name);
  const meta = metaFor({ slug, title, publishAt, lang });
  const body = `# ${title}\n\nSynthetic body canary ${slug} proves frozen clock publication behavior.\n\n` +
    ["cover", "figure-02", "figure-03", "figure-04"].map((image, index) => `![Synthetic ${index + 1}](images/${image}.png)`).join("\n\n") +
    (lang === "en" ? `\n\nThis synthetic fixture does not constitute investment or medical advice.\n` : `\n\n本合成測試不構成投資或醫療建議。\n`);
  await write(path.join(articleRoot, "article.md"), body);
  await write(path.join(articleRoot, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  const imageNames = ["cover", "figure-02", "figure-03", "figure-04"];
  const imageBytes = new Map(imageNames.map((image) => [image, Buffer.concat([PNG, Buffer.from(`\n${slug}:${image}\n`)])]));
  for (const image of imageNames) await write(path.join(articleRoot, "images", `${image}.png`), imageBytes.get(image));
  const filePaths = ["article.md", "meta.json", ...imageNames.map((image) => `images/${image}.png`)];
  const files = [];
  for (const filePath of filePaths) files.push({ path: filePath, sha256: digest(await fs.readFile(path.join(articleRoot, filePath))) });
  return {
    directory: name,
    title,
    slug,
    body_path: "article.md",
    metadata: { author: meta.author, category: meta.category, tags: meta.tags, summary: meta.summary, access: meta.access, publish_attributes: meta.publish_attributes },
    files,
    images: imageNames.map((image, index) => ({ order: index + 1, purpose: index ? `body-${index + 1}` : "cover", width: 1, height: 1, bytes: imageBytes.get(image).length, language: lang === "en" ? "en" : "zh-Hant", path: `images/${image}.png`, sha256: digest(imageBytes.get(image)) }))
  };
}

async function makeInput(root, index, { publishAt = "2026-09-11T08:00:00+08:00", slug = `synthetic-article-${index}`, contentId = `synthetic_content_${index}`, english = false, title = `Synthetic Article ${index}` } = {}) {
  await fs.mkdir(root, { recursive: true });
  const jobId = index.toString(16).padStart(32, "0");
  const zh = await articleSpec(root, "zh", { slug, title, publishAt, lang: "zh-Hant" });
  const enSlug = `${slug}-en`;
  const en = english ? await articleSpec(root, "en", { slug: enSlug, title: `${title} English`, publishAt, lang: "en" }) : null;
  if (en) {
    const zhMetaPath = path.join(root, "zh", "meta.json");
    const enMetaPath = path.join(root, "en", "meta.json");
    const zhMeta = JSON.parse(await fs.readFile(zhMetaPath, "utf8"));
    const enMeta = JSON.parse(await fs.readFile(enMetaPath, "utf8"));
    zhMeta.translations = { en: `${publishAt.slice(0, 10)}-${enSlug}.html` };
    enMeta.translations = { "zh-Hant": `${publishAt.slice(0, 10)}-${slug}.html` };
    await write(zhMetaPath, `${JSON.stringify(zhMeta, null, 2)}\n`);
    await write(enMetaPath, `${JSON.stringify(enMeta, null, 2)}\n`);
    for (const article of [zh, en]) {
      const metaFile = article.files.find((file) => file.path === "meta.json");
      metaFile.sha256 = digest(await fs.readFile(path.join(root, article.directory, "meta.json")));
    }
  }
  await write(path.join(root, "internal", "synthetic-pass.md"), "synthetic-pass");
  const manifest = {
    schema_version: 1,
    job_id: jobId,
    content_id: contentId,
    release_key: `${contentId}@v1`,
    lock: { version: 1, sha256: "" },
    state: "queued",
    publish_at: publishAt,
    slug,
    english_status: english ? "APPROVED" : "HOLD",
    sources: [{ level: "primary", title: "Synthetic primary source", url: "https://example.com/source" }],
    qa: { content: 98, communication: 97, visual: 96, p0: 0, p1: 0, report_path: "internal/synthetic-pass.md", report_sha256: digest("synthetic-pass") },
    social_schedule: ["Facebook", "Dcard", "CMoney"].map((platform, sequence) => ({ platform, sequence: sequence + 1, status: "SCHEDULED", scheduled_at: publishAt, row_id: `synthetic-${platform}-${index}`, evidence: `internal/${platform}.txt` })),
    articles: { zh, ...(en ? { en } : {}) },
    approved_content_hash: ""
  };
  manifest.approved_content_hash = computeApprovedContentHash(manifest);
  manifest.lock.sha256 = manifest.approved_content_hash;
  await write(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function writeLockedManifest(root, manifest) {
  manifest.approved_content_hash = computeApprovedContentHash(manifest);
  manifest.lock.sha256 = manifest.approved_content_hash;
  await write(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function addDedicatedWebsiteCover(root, manifest, lang = "zh") {
  const article = manifest.articles[lang];
  const coverPath = "images/website-cover.png";
  const coverBytes = Buffer.concat([PNG, Buffer.from(`\n${article.slug}:website-cover\n`)]);
  await write(path.join(root, article.directory, coverPath), coverBytes);
  article.files.push({ path: coverPath, sha256: digest(coverBytes) });
  article.images[0].purpose = "body-opening";
  const metaPath = path.join(root, article.directory, "meta.json");
  const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
  meta.cover_image = coverPath;
  meta.cover_image_alt = `Dedicated website cover for ${article.title}`;
  meta.homepage_cover_image = coverPath;
  meta.homepage_cover_image_alt = meta.cover_image_alt;
  await write(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  article.files.find((file) => file.path === "meta.json").sha256 = digest(await fs.readFile(metaPath));
  await writeLockedManifest(root, manifest);
  return { coverPath, coverBytes };
}

async function addBundle(queue, input, manifest) {
  return packBundle({ inputRoot: input, outputPath: queue, key: KEY, keyId: "v1", repoRoot: PACK_REPO, liveBaseUrl: "" });
}

async function copyTrackedBaseline(target) {
  const files = run("git", ["ls-files", "-z"], REPO_ROOT).stdout.split("\0").filter(Boolean);
  for (let offset = 0; offset < files.length; offset += 64) {
    await Promise.all(files.slice(offset, offset + 64).map(async (relative) => {
      const destination = path.join(target, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(REPO_ROOT, relative), destination);
    }));
  }
}

async function copyPublicTree(source, target) {
  const excluded = new Set([".git", ".github", "_site", "content", "scripts", "node_modules", "package.json", "README.md", ".gitignore"]);
  const files = [];
  async function visit(relative = "") {
    for (const entry of await fs.readdir(path.join(source, relative), { withFileTypes: true })) {
      if (!relative && excluded.has(entry.name)) continue;
      if (entry.name === ".DS_Store") continue;
      const next = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(next);
      else if (entry.isFile()) files.push(next);
    }
  }
  await visit();
  for (let offset = 0; offset < files.length; offset += 64) {
    await Promise.all(files.slice(offset, offset + 64).map(async (relative) => {
      await fs.mkdir(path.dirname(path.join(target, relative)), { recursive: true });
      await fs.copyFile(path.join(source, relative), path.join(target, relative));
    }));
  }
}

async function runPublisherCandidate(candidate, stagingRoot, now = "2026-09-11T00:01:00Z", { fullChain = false } = {}) {
  const buildRoot = fullChain ? `${candidate}-build` : candidate;
  if (fullChain) await copyTrackedBaseline(buildRoot);
  else {
    await write(path.join(buildRoot, "content", "external-articles.json"), "[]\n");
    for (const file of ["styles.css", "favicon.svg", "site-nav.js"]) {
      await fs.copyFile(path.join(REPO_ROOT, file), path.join(buildRoot, file)).catch(() => {});
    }
  }
  const env = { ...process.env, DRUGNEWS_INBOX: stagingRoot, DRUGNEWS_NOW: now, DRUGNEWS_PUBLISH_PRODUCTION: "1" };
  const scripts = ["publish_articles.mjs", "build_english_site.mjs", "build_topic_hubs.mjs", "build_company_index.mjs"];
  if (fullChain) scripts.push("prerender_concept_guides.mjs", "normalize_site_headers.mjs", "inject_analytics.mjs", "audit_image_budget.mjs");
  try {
    for (const script of scripts) run(process.execPath, [path.join(REPO_ROOT, "scripts", script)], buildRoot, env);
    if (fullChain) await copyPublicTree(buildRoot, candidate);
  } finally {
    if (fullChain) await fs.rm(buildRoot, { recursive: true, force: true });
  }
}

async function staticServer(root) {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "");
      let file = path.join(root, pathname);
      const stat = await fs.stat(file).catch(() => null);
      if (stat?.isDirectory()) file = path.join(file, "index.html");
      const data = await fs.readFile(file);
      response.writeHead(200); response.end(data);
    } catch { response.writeHead(404); response.end("not found"); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}/`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function writePrivateSurfaceShell(root) {
  const textFiles = ["index.html", "articles/index.html", "en/index.html", "en/articles/index.html", "feed.xml", "en/feed.xml", "sitemap.xml", "news-sitemap.xml", "image-sitemap.xml", "llms.txt", "companies.html", "topics/index.html", "topics/biotech-investing.html", "topics/biotech-valuation.html", "topics/bd-licensing.html", "topics/clinical-data.html", "topics/cmc.html", "topics/drug-development.html", "topics/big-pharma.html", "topics/glp1.html"];
  const arrayJson = ["search-index.json", "en/search-index.json"];
  const objectJson = ["feed.json", "en/feed.json", "market-radar.json", "search-intents.json", "ai-index.json", "knowledge-graph.json"];
  for (const file of textFiles) await write(path.join(root, file), "public shell\n");
  for (const file of arrayJson) await write(path.join(root, file), "[]\n");
  for (const file of objectJson) await write(path.join(root, file), "{}\n");
}

async function payloadFromFixture(root) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
  const payload = structuredClone(manifest);
  for (const article of Object.values(payload.articles)) {
    article.files = await Promise.all(article.files.map(async (file) => ({ ...file, data: (await fs.readFile(path.join(root, article.directory, file.path))).toString("base64") })));
    delete article.directory;
  }
  return payload;
}

function writePayloadTextFile(article, filePath, text) {
  const file = article.files.find((candidate) => candidate.path === filePath);
  const bytes = Buffer.from(text);
  file.data = bytes.toString("base64");
  file.sha256 = digest(bytes);
}

function relockPayload(payload) {
  payload.approved_content_hash = computeApprovedContentHash(payload);
  payload.lock.sha256 = payload.approved_content_hash;
}

async function writeAuthenticatedPayload(queue, payload, { key = KEY, keyId = "v1" } = {}) {
  const bundle = encryptEnvelope(Buffer.from(JSON.stringify(payload)), { key, keyId, jobId: payload.job_id });
  await write(path.join(queue, `${payload.job_id}.dnq`), bundle);
}

test("AES-256-GCM envelope authenticates header and ciphertext", () => {
  const plain = Buffer.from("synthetic secret");
  const bundle = encryptEnvelope(plain, { key: KEY, jobId: "1".padStart(32, "0") });
  assert.equal(decryptEnvelope(bundle, KEY, "1".padStart(32, "0")).plaintext.toString(), plain.toString());
  const tampered = Buffer.from(bundle); tampered[tampered.length - 17] ^= 1;
  assert.throws(() => decryptEnvelope(tampered, KEY), /auth|authenticate/i);
});

test("production and CI permanently reject --force", () => {
  const result = spawnSync(process.execPath, [path.resolve("scripts/publish_articles.mjs"), "--force"], {
    cwd: process.cwd(),
    env: { ...process.env, CI: "true" },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /--force is permanently disabled/);
});

test("actual-byte capacity boundaries are exact", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-size-"));
  try {
    for (const size of [MAX_BUNDLE_BYTES - 1, MAX_BUNDLE_BYTES, MAX_BUNDLE_BYTES + 1]) {
      const file = path.join(dir, String(size)); await fs.writeFile(file, ""); await fs.truncate(file, size);
      const actual = (await fs.stat(file)).size;
      assert.equal(bundleSizeReason(actual), size > MAX_BUNDLE_BYTES ? "BUNDLE_TOO_LARGE" : "");
    }
    const maxStats = Array.from({ length: 16 }, (_, index) => ({ bytes: Math.floor(MAX_QUEUE_BYTES / 16) + (index === 0 ? MAX_QUEUE_BYTES % 16 : 0) }));
    assert.equal(validateQueueLimitsFromStats(maxStats).ok, true);
    maxStats[0].bytes += 1;
    assert.equal(validateQueueLimitsFromStats(maxStats).reason, "QUEUE_TOTAL_LIMIT");
    assert.equal(validateQueueLimitsFromStats(Array.from({ length: 17 }, () => ({ bytes: 1 }))).reason, "QUEUE_COUNT_LIMIT");
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("due materialization order is publish_at then opaque job ID", () => {
  const jobs = [
    { publishAt: "2026-09-06T08:00:00+08:00", jobId: "0".repeat(32) },
    { publishAt: "2026-09-05T08:00:00+08:00", jobId: "f".repeat(32) },
    { publishAt: "2026-09-05T08:00:00+08:00", jobId: "1".repeat(32) }
  ].sort(compareDueJobs);
  assert.deepEqual(jobs.map((job) => job.jobId), ["1".repeat(32), "f".repeat(32), "0".repeat(32)]);
});

test("queue root is an allowlist and gitignore blocks future plaintext", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-allowlist-"));
  try {
    for (const [name, kind] of [["future.txt", "file"], ["future.png", "file"], ["future-dir", "dir"], ["future-link", "link"]]) {
      const queue = path.join(root, name.replace(/\W/g, "-")); await fs.mkdir(queue, { recursive: true });
      await write(path.join(queue, "README.md"), "control\n");
      if (kind === "dir") await fs.mkdir(path.join(queue, name));
      else if (kind === "link") await fs.symlink("README.md", path.join(queue, name));
      else await write(path.join(queue, name), name.endsWith(".png") ? PNG : "future plaintext");
      await assert.rejects(() => preflightQueue(queue), /QUEUE_(?:UNKNOWN_ENTRY|ENTRY_INVALID)/);
    }
    for (const relative of ["content/scheduled/future.txt", "content/scheduled/future.png", "content/scheduled/future-dir/plain.md"]) {
      const ignored = spawnSync("git", ["check-ignore", "--no-index", "-q", relative], { cwd: REPO_ROOT });
      assert.equal(ignored.status, 0, `${relative} must be ignored`);
    }
    for (const relative of ["content/scheduled/README.md", "content/scheduled/0123456789abcdef0123456789abcdef.dnq"]) {
      const ignored = spawnSync("git", ["check-ignore", "--no-index", "-q", relative], { cwd: REPO_ROOT });
      assert.equal(ignored.status, 1, `${relative} must remain trackable`);
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("pack leak gate scans index, working diff, untracked text, and staged image", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-pack-gate-"));
  try {
    const input = path.join(root, "input");
    const manifest = await makeInput(input, 18, { slug: "pack-gate-secret", title: "Pack Gate Secret Title" });
    const cases = [
      ["index", async (repo) => { await write(path.join(repo, "staged.txt"), manifest.articles.zh.title); run("git", ["add", "staged.txt"], repo); await fs.rm(path.join(repo, "staged.txt")); }],
      ["worktree", async (repo) => { await write(path.join(repo, "baseline.txt"), manifest.articles.zh.title); }],
      ["untracked", async (repo) => { await write(path.join(repo, "untracked.txt"), "Synthetic body canary pack-gate-secret proves frozen clock publication behavior."); }],
      ["image-index", async (repo) => { await write(path.join(repo, "staged.png"), await fs.readFile(path.join(input, "zh", "images", "cover.png"))); run("git", ["add", "staged.png"], repo); await fs.rm(path.join(repo, "staged.png")); }]
    ];
    for (const [name, arrange] of cases) {
      const repo = await makeGitRepo(root, `repo-${name}`); await arrange(repo);
      const output = path.join(root, `queue-${name}`);
      await assert.rejects(
        () => packBundle({ inputRoot: input, outputPath: output, key: KEY, repoRoot: repo, liveBaseUrl: "" }),
        /PACK_GIT_(?:LEAK|UNTRACKED_LEAK|IMAGE_LEAK)/
      );
      assert.equal(await fs.readdir(output).then((items) => items.length).catch(() => 0), 0);
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("existing public asset reuse requires an exact locked ref at pack and T-minus", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-public-ref-"));
  let server;
  try {
    const input = path.join(root, "input");
    const manifest = await makeInput(input, 19, { slug: "future-public-ref", title: "Future Public Ref Title" });
    const repo = await makeGitRepo(root, "repo");
    const live = path.join(root, "live");
    const image = manifest.articles.zh.images[1];
    const imageBytes = Buffer.concat([PNG, Buffer.from("\nexisting public asset\n")]);
    await write(path.join(input, manifest.articles.zh.directory, image.path), imageBytes);
    manifest.articles.zh.files.find((file) => file.path === image.path).sha256 = digest(imageBytes);
    image.sha256 = digest(imageBytes);
    image.bytes = imageBytes.length;
    relockPayload(manifest);
    await write(path.join(input, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const sourceSlug = "existing-public-source";
    const publicPath = `assets/articles/${sourceSlug}/figure-01.png`;
    await write(path.join(repo, publicPath), imageBytes);
    run("git", ["add", publicPath], repo);
    run("git", ["commit", "-qm", "public asset"], repo);
    await write(path.join(live, publicPath), imageBytes);
    server = await staticServer(live);

    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "undeclared"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PACK_GIT_IMAGE_LEAK/
    );

    const hashBeforeRef = manifest.approved_content_hash;
    image.existing_public_asset_ref = { source_slug: sourceSlug, public_path: publicPath, sha256: image.sha256, git_oid: gitOid(imageBytes) };
    relockPayload(manifest);
    assert.notEqual(manifest.approved_content_hash, hashBeforeRef);
    await write(path.join(input, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const packed = await packBundle({ inputRoot: input, outputPath: path.join(root, "declared"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl });
    assert.equal(await fs.access(packed.output).then(() => true).catch(() => false), true);

    const duplicate = structuredClone(manifest);
    const duplicateImage = duplicate.articles.zh.images[2];
    const duplicatePath = path.join(input, duplicate.articles.zh.directory, duplicateImage.path);
    const duplicateOriginalBytes = await fs.readFile(duplicatePath);
    await write(duplicatePath, imageBytes);
    duplicate.articles.zh.files.find((file) => file.path === duplicateImage.path).sha256 = digest(imageBytes);
    duplicateImage.sha256 = digest(imageBytes);
    duplicateImage.bytes = imageBytes.length;
    relockPayload(duplicate);
    await write(path.join(input, "manifest.json"), `${JSON.stringify(duplicate, null, 2)}\n`);
    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "duplicate-same-oid"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PACK_GIT_IMAGE_LEAK/
    );
    await write(duplicatePath, duplicateOriginalBytes);
    await write(path.join(input, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    const unlockedSwap = await payloadFromFixture(input);
    unlockedSwap.articles.zh.images[1].existing_public_asset_ref.source_slug = "other-public-source";
    unlockedSwap.articles.zh.images[1].existing_public_asset_ref.public_path = "assets/articles/other-public-source/figure-01.png";
    assert.throws(() => validatePayload(unlockedSwap), /APPROVED_CONTENT_HASH_MISMATCH/);

    await write(path.join(repo, publicPath), Buffer.from("stale worktree asset"));
    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "stale"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PUBLIC_ASSET_REF_WORKTREE_MISMATCH/
    );
    await write(path.join(repo, publicPath), imageBytes);

    const missing = structuredClone(manifest);
    missing.articles.zh.images[1].existing_public_asset_ref.source_slug = "missing-public-source";
    missing.articles.zh.images[1].existing_public_asset_ref.public_path = "assets/articles/missing-public-source/figure-01.png";
    relockPayload(missing);
    await write(path.join(input, "manifest.json"), `${JSON.stringify(missing, null, 2)}\n`);
    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "missing"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PUBLIC_ASSET_REF_HEAD_MISSING/
    );

    const mismatched = structuredClone(manifest);
    mismatched.articles.zh.images[1].existing_public_asset_ref.git_oid = "0".repeat(40);
    relockPayload(mismatched);
    await write(path.join(input, "manifest.json"), `${JSON.stringify(mismatched, null, 2)}\n`);
    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "mismatched"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PUBLIC_ASSET_REF_IMAGE_IDENTITY_MISMATCH/
    );
    await write(path.join(input, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    await write(path.join(live, publicPath), Buffer.from("live mismatch"));
    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "live-mismatch"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PUBLIC_ASSET_REF_LIVE_MISMATCH/
    );
    await write(path.join(live, publicPath), imageBytes);

    await write(path.join(repo, "baseline.txt"), manifest.articles.zh.title);
    await assert.rejects(
      () => packBundle({ inputRoot: input, outputPath: path.join(root, "future-text"), key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl }),
      /PACK_GIT_LEAK/
    );
    await write(path.join(repo, "baseline.txt"), "clean baseline\n");

    const queue = path.join(root, "queue");
    await packBundle({ inputRoot: input, outputPath: queue, key: KEY, repoRoot: repo, liveBaseUrl: server.baseUrl });
    const published = path.join(root, "published"); await fs.mkdir(published);
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-10T23:59:00Z"), env: ENV });
    const audit = JSON.parse(await fs.readFile(summary.auditFile, "utf8"));
    assert.equal(audit.jobs[0].existingPublicAssetRefs.length, 1);
    const candidate = path.join(root, "candidate");
    await write(path.join(candidate, publicPath), imageBytes);
    await auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: repo, skipLiveInventory: true });

    await fs.rm(path.join(candidate, publicPath));
    let failure = await captureRejection(() => auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: repo, skipLiveInventory: true }));
    assert(failure.failures.some((item) => item.reason === "PUBLIC_ASSET_REF_CANDIDATE_MISSING"));
    await write(path.join(candidate, publicPath), Buffer.from("candidate mismatch"));
    failure = await captureRejection(() => auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: repo, skipLiveInventory: true }));
    assert(failure.failures.some((item) => item.reason === "PUBLIC_ASSET_REF_CANDIDATE_MISMATCH"));
    await write(path.join(candidate, publicPath), imageBytes);

    const targetPath = audit.jobs[0].existingPublicAssetRefs[0].target_path;
    await write(path.join(candidate, targetPath), imageBytes);
    failure = await captureRejection(() => auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: repo, skipLiveInventory: true }));
    assert(failure.failures.some((item) => ["T_MINUS_DIRECT_ASSET_LEAK", "T_MINUS_DIRECT_LEAK", "T_MINUS_IMAGE_LEAK"].includes(item.reason)));
    await fs.rm(path.join(candidate, path.posix.dirname(targetPath)), { recursive: true, force: true });

    await write(path.join(live, publicPath), Buffer.from("live mismatch at candidate"));
    failure = await captureRejection(() => auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: repo, skipLiveInventory: true }));
    assert(failure.failures.some((item) => item.reason === "PUBLIC_ASSET_REF_LIVE_MISMATCH"));
  } finally {
    if (server) await server.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("direct pack CLI executes from the non-ASCII repository path", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-cli-"));
  try {
    const input = path.join(root, "input");
    const manifest = await makeInput(input, 20, { slug: "direct-cli-pack", title: "Direct CLI Pack Title" });
    const repo = await makeGitRepo(root, "repo");
    const output = path.join(root, "queue");
    const preload = path.join(root, "mock-fetch.mjs");
    await write(preload, "globalThis.fetch = async () => new Response('not found', { status: 404 });\n");
    const fixtureScripts = path.join(root, "非ASCII-cli", "scripts");
    await fs.mkdir(fixtureScripts, { recursive: true });
    // Copy the full local import graph, including indirect renderer dependencies.
    const copiedModules = new Set();
    async function copyQueueModule(file) {
      const source = path.resolve(REPO_ROOT, "scripts", file);
      if (path.dirname(source) !== path.resolve(REPO_ROOT, "scripts")) throw new Error("CLI_FIXTURE_IMPORT_OUTSIDE_SCRIPTS");
      if (copiedModules.has(source)) return;
      copiedModules.add(source);
      const code = await fs.readFile(source, "utf8");
      await fs.copyFile(source, path.join(fixtureScripts, path.basename(source)));
      for (const match of code.matchAll(/\bfrom\s*["'](\.\/[^"']+\.mjs)["']/g)) {
        await copyQueueModule(match[1]);
      }
    }
    await copyQueueModule("scheduled_queue.mjs");
    const script = await fs.realpath(path.join(fixtureScripts, "scheduled_queue.mjs"));
    assert.match(script, /[^\x00-\x7f]/);
    const result = spawnSync(process.execPath, [script, "pack", `--input=${input}`, `--output=${output}`], {
      cwd: repo,
      env: { ...process.env, ...ENV, NODE_OPTIONS: `--import=${pathToFileURL(preload).href}` },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const cli = JSON.parse(result.stdout);
    assert.equal(cli.status, "packed");
    assert.equal(cli.job_id, manifest.job_id);
    assert.equal(await fs.access(path.join(output, `${manifest.job_id}.dnq`)).then(() => true).catch(() => false), true);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("1/9/16 jobs all validate; 17 is a global HOLD", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-count-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    for (let index = 1; index <= 16; index++) {
      const input = path.join(root, `input-${index}`); const manifest = await makeInput(input, index); await addBundle(queue, input, manifest);
      if ([1, 9, 16].includes(index)) {
        const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, `work-${index}`), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
        assert.equal(summary.queue_count, index); assert.equal(summary.due_count, index);
      }
    }
    const input17 = path.join(root, "input-17"); const manifest17 = await makeInput(input17, 17); await addBundle(queue, input17, manifest17);
    await assert.rejects(() => prepareQueue({ queueDir: queue, workDir: path.join(root, "work-17"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV }), /QUEUE_COUNT_LIMIT/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("V2-only bundle prepares with only the V2 environment secret", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-v2-only-"));
  try {
    const input = path.join(root, "input"); const queue = path.join(root, "queue"); const published = path.join(root, "published");
    const manifest = await makeInput(input, 123, { slug: "v2-only" });
    manifest.release_key = `${manifest.content_id}@v2`; manifest.lock.version = 2; await writeLockedManifest(input, manifest);
    await packBundle({ inputRoot: input, outputPath: queue, key: KEY_V2, keyId: "v2", repoRoot: PACK_REPO, liveBaseUrl: "" });
    await fs.mkdir(published, { recursive: true });
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV_V2 });
    assert.equal(summary.queue_count, 1); assert.equal(summary.due_count, 1); assert.equal(summary.held_count, 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("mixed V1 and V2 queue prepares without repacking the V1 bundle", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-v1-v2-mixed-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published");
    const v1Input = path.join(root, "v1"); const v1 = await makeInput(v1Input, 124, { slug: "mixed-v1" });
    const v1Packed = await addBundle(queue, v1Input, v1);
    const v1Before = { bytes: (await fs.stat(v1Packed.output)).size, sha256: digest(await fs.readFile(v1Packed.output)) };
    const v2Input = path.join(root, "v2"); const v2 = await makeInput(v2Input, 125, { slug: "mixed-v2" });
    v2.release_key = `${v2.content_id}@v2`; v2.lock.version = 2; await writeLockedManifest(v2Input, v2);
    await packBundle({ inputRoot: v2Input, outputPath: queue, key: KEY_V2, keyId: "v2", repoRoot: PACK_REPO, liveBaseUrl: "" });
    assert.deepEqual({ bytes: (await fs.stat(v1Packed.output)).size, sha256: digest(await fs.readFile(v1Packed.output)) }, v1Before);
    await fs.mkdir(published, { recursive: true });
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV_MIXED });
    assert.equal(summary.queue_count, 2); assert.equal(summary.due_count, 2); assert.equal(summary.held_count, 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("mixed queue fails closed when a referenced V2 secret is missing or incorrect", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-v2-missing-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published");
    const v1Input = path.join(root, "v1"); const v1 = await makeInput(v1Input, 128, { slug: "v2-guard-v1" }); await addBundle(queue, v1Input, v1);
    const input = path.join(root, "v2");
    const manifest = await makeInput(input, 126, { slug: "v2-secret-missing" });
    manifest.release_key = `${manifest.content_id}@v2`; manifest.lock.version = 2; await writeLockedManifest(input, manifest);
    await packBundle({ inputRoot: input, outputPath: queue, key: KEY_V2, keyId: "v2", repoRoot: PACK_REPO, liveBaseUrl: "" });
    await fs.mkdir(published, { recursive: true });
    await assert.rejects(
      () => prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV }),
      /QUEUE_KEY_V2_MISSING_OR_INVALID/
    );
    const wrongV2 = { ...ENV, DRUGNEWS_QUEUE_KEY_B64_V2: Buffer.alloc(32, 0x25).toString("base64") };
    await assert.rejects(
      () => prepareQueue({ queueDir: queue, workDir: path.join(root, "wrong"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: wrongV2 }),
      /QUEUE_KEY_AUTH_FAILED:v2/
    );
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("frozen clock keeps T-1 private and publishes at T+1 idempotently", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-clock-"));
  try {
    const input = path.join(root, "input"); const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const manifest = await makeInput(input, 31); await addBundle(queue, input, manifest);
    const before = await prepareQueue({ queueDir: queue, workDir: path.join(root, "before"), publishedRoot: published, now: new Date("2026-09-10T23:59:00Z"), env: ENV });
    assert.equal(before.pending_count, 1); assert.equal((await fs.readdir(before.stagingRoot)).length, 0);
    const emptyCandidate = path.join(root, "candidate-before"); await fs.mkdir(emptyCandidate);
    await auditCandidate({ root: emptyCandidate, auditFile: before.auditFile, skipLiveInventory: true });
    assert.equal(await fs.access(path.join(emptyCandidate, `articles/${manifest.publish_at.slice(0, 10)}-${manifest.slug}.html`)).then(() => true).catch(() => false), false);
    await write(path.join(emptyCandidate, "index.html"), manifest.slug);
    await assert.rejects(() => auditCandidate({ root: emptyCandidate, auditFile: before.auditFile, skipLiveInventory: true }), /SCHEDULED_LEAK_AUDIT_FAILED/);
    const privateSite = path.join(root, "private-http"); await writePrivateSurfaceShell(privateSite);
    const privateServer = await staticServer(privateSite);
    try { await auditLive({ auditFile: before.auditFile, baseUrl: privateServer.baseUrl }); }
    catch (error) { throw new Error(`${error.message}: ${JSON.stringify(error.failures || [])}`); }
    finally { await privateServer.close(); }
    assert.equal(Date.parse("2026-09-11T08:00:00+08:00"), Date.parse("2026-09-11T00:00:00Z"));
    assert.notEqual(Date.parse("2026-09-11T08:00:00Z"), Date.parse("2026-09-11T00:00:00Z"));

    const after1 = await prepareQueue({ queueDir: queue, workDir: path.join(root, "after-1"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    const after2 = await prepareQueue({ queueDir: queue, workDir: path.join(root, "after-2"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    const after3 = await prepareQueue({ queueDir: queue, workDir: path.join(root, "after-3"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    const fallback = await prepareQueue({ queueDir: queue, workDir: path.join(root, "fallback-0810"), publishedRoot: published, now: new Date("2026-09-11T00:10:00Z"), env: ENV });
    assert.equal(after1.due_count, 1); assert.equal(after2.due_count, 1); assert.equal(after3.due_count, 1); assert.equal(fallback.due_count, 1);
    assert.equal(await treeDigest(after1.stagingRoot), await treeDigest(after2.stagingRoot));
    assert.equal(await treeDigest(after2.stagingRoot), await treeDigest(after3.stagingRoot));
    assert.equal(await treeDigest(after3.stagingRoot), await treeDigest(fallback.stagingRoot));
    assert.equal(after1.queue_digest, after2.queue_digest);

    const candidate = path.join(root, "candidate-after"); await runPublisherCandidate(candidate, after1.stagingRoot, "2026-09-11T00:01:00Z", { fullChain: true });
    const candidateRepeat = path.join(root, "candidate-repeat"); await runPublisherCandidate(candidateRepeat, after2.stagingRoot);
    const candidateRepeat2 = path.join(root, "candidate-repeat-2"); await runPublisherCandidate(candidateRepeat2, after3.stagingRoot);
    try {
      await auditCandidate({ root: candidate, auditFile: after1.auditFile, skipLiveInventory: true, skipGitAudit: true });
      await auditCandidate({ root: candidateRepeat, auditFile: after2.auditFile, skipLiveInventory: true, skipGitAudit: true });
      await auditCandidate({ root: candidateRepeat2, auditFile: after2.auditFile, skipLiveInventory: true, skipGitAudit: true });
    } catch (error) {
      throw new Error(`${error.message}: ${JSON.stringify(error.failures || [])}`);
    }
    assert.equal(await treeDigest(candidateRepeat), await treeDigest(candidateRepeat2));
    const publicServer = await staticServer(candidate);
    try { await auditLive({ auditFile: after1.auditFile, baseUrl: publicServer.baseUrl }); }
    finally { await publicServer.close(); }
    if (process.env.DRUGNEWS_SCHEDULED_FIXTURE_OUT) {
      await fs.rm(process.env.DRUGNEWS_SCHEDULED_FIXTURE_OUT, { recursive: true, force: true });
      await fs.cp(candidate, process.env.DRUGNEWS_SCHEDULED_FIXTURE_OUT, { recursive: true });
    }
    const directPath = path.join(candidate, `articles/${manifest.publish_at.slice(0, 10)}-${manifest.slug}.html`);
    const lockedHtml = await fs.readFile(directPath, "utf8");
    const mutationServer = await staticServer(candidate);
    try {
      for (const replacement of [
        lockedHtml.replace("Synthetic body canary", "Wrong body canary"),
        lockedHtml.replace(/<!-- drugnews:locked-body:start -->[\s\S]*?<!-- drugnews:locked-body:end -->/u, "<!-- drugnews:locked-body:start --><p>Old body</p><!-- drugnews:locked-body:end -->"),
        lockedHtml.replace("publication behavior.", "")
      ]) {
        await write(directPath, replacement);
        const candidateError = await captureRejection(() => auditCandidate({ root: candidate, auditFile: after1.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO }));
        assert(candidateError.failures.some((failure) => ["BODY_DIGEST_MISMATCH", "BODY_CANARY_MISSING"].includes(failure.reason)));
        const liveError = await captureRejection(() => auditLive({ auditFile: after1.auditFile, baseUrl: mutationServer.baseUrl }));
        assert(liveError.failures.some((failure) => failure.reason === "LIVE_DIRECT_E4_FAIL"));
      }
    } finally { await mutationServer.close(); }
    await write(directPath, lockedHtml);
    const search = JSON.parse(await fs.readFile(path.join(candidate, "search-index.json"), "utf8")); search.push(search[0]); await write(path.join(candidate, "search-index.json"), JSON.stringify(search));
    await assert.rejects(() => auditCandidate({ root: candidate, auditFile: after1.auditFile, skipLiveInventory: true }), /SCHEDULED_LEAK_AUDIT_FAILED/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("fifteen daily due bundles retain permanent entrypoints without stale home or news failures", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-fifteen-days-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const manifests = [];
    for (let offset = 0; offset < 15; offset++) {
      const day = 5 + offset;
      const publishAt = `2026-09-${String(day).padStart(2, "0")}T08:00:00+08:00`;
      const input = path.join(root, `input-${day}`);
      const manifest = await makeInput(input, 101 + offset, { publishAt, slug: `scheduled-day-${day}`, title: `Scheduled Day ${day} AI` });
      await addBundle(queue, input, manifest); manifests.push(manifest);
    }
    assert.equal((await fs.readdir(queue)).filter((name) => name.endsWith(".dnq")).length, 15);
    for (let offset = 0; offset < 15; offset++) {
      const day = 5 + offset;
      const now = new Date(`2026-09-${String(day).padStart(2, "0")}T00:01:00Z`);
      const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, `work-${day}`), publishedRoot: published, now, env: ENV });
      assert.equal(summary.due_count, offset + 1); assert.equal(summary.pending_count, 14 - offset);
      assert.equal(summary.newly_due_count, 1);
      assert.equal(summary.queue_slots_used, 15); assert.equal(summary.queue_slots_remaining, 1);
      const candidate = path.join(root, `candidate-${day}`); await runPublisherCandidate(candidate, summary.stagingRoot, now.toISOString());
      try { await auditCandidate({ root: candidate, auditFile: summary.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO }); }
      catch (error) { throw new Error(`day ${day}: ${error.message}: ${JSON.stringify(error.failures || [])}`); }
      const firstUrl = `articles/${manifests[0].publish_at.slice(0, 10)}-${manifests[0].slug}.html`;
      assert.equal(await fs.access(path.join(candidate, firstUrl)).then(() => true).catch(() => false), true);
      assert((await fs.readFile(path.join(candidate, "articles", "index.html"), "utf8")).includes(path.basename(firstUrl)));
      if (offset >= 5) assert.equal((await fs.readFile(path.join(candidate, "index.html"), "utf8")).includes(`href="${firstUrl}"`), false);
      if (offset >= 2) assert.equal((await fs.readFile(path.join(candidate, "news-sitemap.xml"), "utf8")).includes(`https://drugnews.com.tw/${firstUrl}`), false);
      if (offset === 14) {
        const outbox = path.join(root, "indexnow.json"); await writeIndexNowBrief({ auditFile: summary.auditFile, output: outbox });
        const urls = JSON.parse(await fs.readFile(outbox, "utf8")).search_submission_urls;
        assert.deepEqual(urls, [`https://drugnews.com.tw/articles/${manifests[14].publish_at.slice(0, 10)}-${manifests[14].slug}.html`]);
      }
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("byte-identical historical due content is legacy_e4 and is not materialized again", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-legacy-e4-"));
  try {
    const input = path.join(root, "input"); const queue = path.join(root, "queue"); const published = path.join(root, "published");
    const manifest = await makeInput(input, 118, { publishAt: "2026-09-05T08:00:00+08:00", slug: "historical-locked", title: "Historical Locked AI" });
    await fs.mkdir(published, { recursive: true });
    await fs.cp(path.join(input, "zh"), path.join(published, manifest.slug), { recursive: true });
    await addBundle(queue, input, manifest);
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-05T00:01:00Z"), env: ENV });
    assert.equal(summary.due_count, 0); assert.equal(summary.legacy_e4_count, 1);
    assert.equal(summary.jobs[0].state, "legacy_e4"); assert.equal(summary.jobs[0].reason, "LOCKED_BYTES_ALREADY_PUBLISHED");
    assert.equal((await fs.readdir(summary.stagingRoot)).length, 0);
    const audit = JSON.parse(await fs.readFile(summary.auditFile, "utf8")); assert.equal(audit.jobs[0].state, "legacy_e4");

    const candidate = path.join(root, "candidate");
    await fs.mkdir(path.join(candidate, "content", "published"), { recursive: true });
    await fs.cp(path.join(published, manifest.slug), path.join(candidate, "content", "published", manifest.slug), { recursive: true });
    await runPublisherCandidate(candidate, summary.stagingRoot, "2026-09-05T00:01:00Z");
    await auditCandidate({ root: candidate, auditFile: summary.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("bad key fails closed; one tampered job does not hide later validation", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-auth-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    for (const index of [41, 42]) { const input = path.join(root, `input-${index}`); const manifest = await makeInput(input, index); await addBundle(queue, input, manifest); }
    const wrong = { DRUGNEWS_QUEUE_KEY_B64: Buffer.alloc(32, 1).toString("base64") };
    await assert.rejects(() => prepareQueue({ queueDir: queue, workDir: path.join(root, "wrong"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: wrong }), /QUEUE_KEY_AUTH_FAILED/);
    const first = (await fs.readdir(queue)).sort()[0]; const bytes = await fs.readFile(path.join(queue, first)); bytes[bytes.length - 17] ^= 1; await fs.writeFile(path.join(queue, first), bytes);
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "mixed"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(summary.due_count, 1); assert.equal(summary.held_count, 1); assert(summary.jobs.some((job) => job.reason === "AUTH_FAILED"));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("one malformed authenticated manifest is held while another due job publishes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-isolation-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const goodInput = path.join(root, "good"); const good = await makeInput(goodInput, 43); await addBundle(queue, goodInput, good);
    const badInput = path.join(root, "bad"); const bad = await makeInput(badInput, 44); const badPayload = await payloadFromFixture(badInput);
    const metaFile = badPayload.articles.zh.files.find((file) => file.path === "meta.json");
    const meta = JSON.parse(Buffer.from(metaFile.data, "base64").toString("utf8")); meta.date = "2026-09-10";
    metaFile.data = Buffer.from(JSON.stringify(meta)).toString("base64"); metaFile.sha256 = digest(Buffer.from(metaFile.data, "base64"));
    const badBundle = encryptEnvelope(Buffer.from(JSON.stringify(badPayload)), { key: KEY, jobId: badPayload.job_id });
    await write(path.join(queue, `${badPayload.job_id}.dnq`), badBundle);
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(summary.due_count, 1); assert.equal(summary.held_count, 1);
    assert(summary.jobs.some((job) => job.job_id === badPayload.job_id && /META_MISMATCH/.test(job.reason)));
    assert.equal((await fs.readdir(summary.stagingRoot)).length, 1);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("invalid Gregorian public_date is held while a valid due job builds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-public-date-isolation-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const goodInput = path.join(root, "good"); const good = await makeInput(goodInput, 119); await addBundle(queue, goodInput, good);
    const badInput = path.join(root, "bad"); await makeInput(badInput, 120); const bad = await payloadFromFixture(badInput);
    const metaFile = bad.articles.zh.files.find((file) => file.path === "meta.json");
    const meta = JSON.parse(Buffer.from(metaFile.data, "base64").toString("utf8")); meta.public_date = "2026-02-30";
    writePayloadTextFile(bad.articles.zh, "meta.json", JSON.stringify(meta)); relockPayload(bad);
    await writeAuthenticatedPayload(queue, bad);

    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(summary.due_count, 1); assert.equal(summary.held_count, 1);
    assert(summary.jobs.some((job) => job.job_id === bad.job_id && /public_date.*Gregorian/.test(job.reason)));
    assert.deepEqual(await fs.readdir(summary.stagingRoot), [good.slug]);
    const candidate = path.join(root, "candidate"); await runPublisherCandidate(candidate, summary.stagingRoot);
    await auditCandidate({ root: candidate, auditFile: summary.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("Facebook body image cover is held while a valid due job builds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-facebook-cover-isolation-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const goodInput = path.join(root, "good"); const good = await makeInput(goodInput, 121); await addBundle(queue, goodInput, good);
    const badInput = path.join(root, "bad"); await makeInput(badInput, 122); const bad = await payloadFromFixture(badInput);
    const article = bad.articles.zh;
    const metaFile = article.files.find((file) => file.path === "meta.json");
    const meta = JSON.parse(Buffer.from(metaFile.data, "base64").toString("utf8"));
    meta.source_platform = "Facebook"; meta.cover_image = "images/facebook-01.png";
    writePayloadTextFile(article, "meta.json", JSON.stringify(meta));
    const markdownFile = article.files.find((file) => file.path === "article.md");
    const markdown = Buffer.from(markdownFile.data, "base64").toString("utf8").replace("images/cover.png", "images/facebook-01.png");
    writePayloadTextFile(article, "article.md", markdown);
    article.files.find((file) => file.path === "images/cover.png").path = "images/facebook-01.png";
    article.images[0].path = "images/facebook-01.png";
    relockPayload(bad); await writeAuthenticatedPayload(queue, bad);

    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(summary.due_count, 1); assert.equal(summary.held_count, 1);
    assert(summary.jobs.some((job) => job.job_id === bad.job_id && /Facebook article cover_image/.test(job.reason)));
    assert.deepEqual(await fs.readdir(summary.stagingRoot), [good.slug]);
    const candidate = path.join(root, "candidate"); await runPublisherCandidate(candidate, summary.stagingRoot);
    await auditCandidate({ root: candidate, auditFile: summary.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("dedicated website cover stays outside four-image body and is audited at T-minus and T-plus", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-dedicated-cover-"));
  try {
    const input = path.join(root, "input"); const queue = path.join(root, "queue"); const published = path.join(root, "published");
    const manifest = await makeInput(input, 127, { slug: "dedicated-website-cover" });
    const { coverBytes } = await addDedicatedWebsiteCover(input, manifest);
    const payload = await payloadFromFixture(input);
    validatePayload(payload, payload.job_id);
    assert.equal(payload.articles.zh.images.length, 4);
    assert.equal(payload.articles.zh.files.length, 7);
    const missingAlt = structuredClone(payload);
    const metaFile = missingAlt.articles.zh.files.find((file) => file.path === "meta.json");
    const meta = JSON.parse(Buffer.from(metaFile.data, "base64").toString("utf8")); delete meta.cover_image_alt;
    writePayloadTextFile(missingAlt.articles.zh, "meta.json", JSON.stringify(meta)); relockPayload(missingAlt);
    assert.throws(() => validatePayload(missingAlt), /DEDICATED_COVER_ALT_REQUIRED/);
    const bodyPurposeCollision = structuredClone(payload); bodyPurposeCollision.articles.zh.images[1].purpose = "cover"; relockPayload(bodyPurposeCollision);
    assert.throws(() => validatePayload(bodyPurposeCollision), /DEDICATED_COVER_PURPOSE_MISMATCH/);
    const basenameCollision = structuredClone(payload);
    const collisionCover = basenameCollision.articles.zh.files.find((file) => file.path === "images/website-cover.png");
    collisionCover.path = "images/site/cover.png";
    const collisionMetaFile = basenameCollision.articles.zh.files.find((file) => file.path === "meta.json");
    const collisionMeta = JSON.parse(Buffer.from(collisionMetaFile.data, "base64").toString("utf8"));
    collisionMeta.cover_image = collisionCover.path; collisionMeta.homepage_cover_image = collisionCover.path;
    writePayloadTextFile(basenameCollision.articles.zh, "meta.json", JSON.stringify(collisionMeta)); relockPayload(basenameCollision);
    assert.throws(() => validatePayload(basenameCollision), /PUBLISHED_IMAGE_BASENAME_COLLISION/);

    await packBundle({ inputRoot: input, outputPath: queue, key: KEY, keyId: "v1", repoRoot: PACK_REPO, liveBaseUrl: "" });
    await fs.mkdir(published, { recursive: true });
    const before = await prepareQueue({ queueDir: queue, workDir: path.join(root, "before"), publishedRoot: published, now: new Date("2026-09-10T23:59:00Z"), env: ENV });
    const audit = JSON.parse(await fs.readFile(before.auditFile, "utf8"));
    assert.equal(audit.jobs[0].imageRecords.length, 5);
    assert.equal(audit.jobs[0].articles[0].images.length, 4);
    assert.equal(audit.jobs[0].articles[0].website_images.length, 1);
    assert.deepEqual(audit.jobs[0].articles[0].website_images[0].roles, ["cover_image", "homepage_cover_image"]);
    const privateCandidate = path.join(root, "candidate-before"); await fs.mkdir(privateCandidate);
    await auditCandidate({ root: privateCandidate, auditFile: before.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO });
    const privateSite = path.join(root, "private-site"); await writePrivateSurfaceShell(privateSite);
    const privateServer = await staticServer(privateSite);
    try { await auditLive({ auditFile: before.auditFile, baseUrl: privateServer.baseUrl }); }
    finally { await privateServer.close(); }
    await write(path.join(privateCandidate, "leaked-cover.png"), coverBytes);
    const leak = await captureRejection(() => auditCandidate({ root: privateCandidate, auditFile: before.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO }));
    assert(leak.failures.some((failure) => failure.reason === "T_MINUS_IMAGE_LEAK"));

    const after = await prepareQueue({ queueDir: queue, workDir: path.join(root, "after"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    const publicCandidate = path.join(root, "candidate-after"); await runPublisherCandidate(publicCandidate, after.stagingRoot);
    try { await auditCandidate({ root: publicCandidate, auditFile: after.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO }); }
    catch (error) { throw new Error(`${error.message}: ${JSON.stringify(error.failures || [])}`); }
    const publishedCover = path.join(publicCandidate, "assets", "articles", manifest.slug, "website-cover.png");
    await fs.rm(publishedCover);
    const missingCover = await captureRejection(() => auditCandidate({ root: publicCandidate, auditFile: after.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO }));
    assert(missingCover.failures.some((failure) => failure.reason === "T_PLUS_IMAGE_MISSING"));
    await write(publishedCover, coverBytes);
    const publicServer = await staticServer(publicCandidate);
    try {
      await auditLive({ auditFile: after.auditFile, baseUrl: publicServer.baseUrl });
      await write(publishedCover, Buffer.from("tampered website cover"));
      const liveMismatch = await captureRejection(() => auditLive({ auditFile: after.auditFile, baseUrl: publicServer.baseUrl }));
      assert(liveMismatch.failures.some((failure) => failure.reason === "LIVE_IMAGE_E4_FAIL"));
    } finally { await publicServer.close(); }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("same version/hash is idempotent; different hash slug collision is held", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-collision-"));
  try {
    const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const duplicateQueue = path.join(root, "dup-queue");
    const in1 = path.join(root, "dup-1"); const m1 = await makeInput(in1, 51, { slug: "same-slug", contentId: "same_content", title: "Same locked title" }); await addBundle(duplicateQueue, in1, m1);
    const in2 = path.join(root, "dup-2"); const m2 = await makeInput(in2, 52, { slug: "same-slug", contentId: "same_content", title: "Same locked title" }); await addBundle(duplicateQueue, in2, m2);
    assert.equal(m1.approved_content_hash, m2.approved_content_hash);
    const duplicate = await prepareQueue({ queueDir: duplicateQueue, workDir: path.join(root, "dup-work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(duplicate.due_count, 1); assert(duplicate.jobs.some((job) => job.state === "duplicate"));

    const conflictQueue = path.join(root, "conflict-queue");
    for (const [index, title] of [[61, "First locked title"], [62, "Different locked title"]]) {
      const input = path.join(root, `conflict-${index}`); const manifest = await makeInput(input, index, { slug: "conflict-slug", contentId: `conflict_content_${index}`, title }); await addBundle(conflictQueue, input, manifest);
    }
    const conflict = await prepareQueue({ queueDir: conflictQueue, workDir: path.join(root, "conflict-work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(conflict.due_count, 0); assert.equal(conflict.jobs.filter((job) => job.reason === "SLUG_CONFLICT").length, 2);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("English HOLD stays Chinese-only; approved English stages one locked pair", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-language-"));
  try {
    const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    for (const [index, english, expected] of [[81, false, 1], [82, true, 2]]) {
      const queue = path.join(root, `queue-${index}`); const input = path.join(root, `input-${index}`);
      const manifest = await makeInput(input, index, { english }); await addBundle(queue, input, manifest);
      const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, `work-${index}`), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
      assert.equal((await fs.readdir(summary.stagingRoot)).length, expected);
      assert.equal(await fs.access(path.join(summary.stagingRoot, `${manifest.slug}-en`)).then(() => true).catch(() => false), english);
      const candidate = path.join(root, `candidate-${index}`); await runPublisherCandidate(candidate, summary.stagingRoot);
      await auditCandidate({ root: candidate, auditFile: summary.auditFile, skipLiveInventory: true, repoRoot: PACK_REPO });
      const zhFile = path.join(candidate, "articles", `${manifest.publish_at.slice(0, 10)}-${manifest.slug}.html`);
      const zhHtml = await fs.readFile(zhFile, "utf8");
      assert.equal(/hreflang="en"/u.test(zhHtml), english);
      const enFile = path.join(candidate, "articles", `${manifest.publish_at.slice(0, 10)}-${manifest.slug}-en.html`);
      assert.equal(await fs.access(enFile).then(() => true).catch(() => false), english);
      if (english) {
        const enHtml = await fs.readFile(enFile, "utf8");
        assert(enHtml.includes(`hreflang="zh-Hant" href="https://drugnews.com.tw/articles/${manifest.publish_at.slice(0, 10)}-${manifest.slug}.html"`));
      }
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("REVOKED and superseded bundles remain absent", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-state-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const revokedInput = path.join(root, "revoked"); const revoked = await makeInput(revokedInput, 91); revoked.state = "revoked"; revoked.status_reason = "synthetic withdrawal"; await write(path.join(revokedInput, "manifest.json"), `${JSON.stringify(revoked, null, 2)}\n`); await addBundle(queue, revokedInput, revoked);
    const oldInput = path.join(root, "superseded"); const old = await makeInput(oldInput, 92); old.state = "superseded"; old.superseded_by = "synthetic_content_93"; await write(path.join(oldInput, "manifest.json"), `${JSON.stringify(old, null, 2)}\n`); await addBundle(queue, oldInput, old);
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    assert.equal(summary.due_count, 0); assert.equal((await fs.readdir(summary.stagingRoot)).length, 0);
    assert(summary.jobs.some((job) => job.state === "validated_revoked")); assert(summary.jobs.some((job) => job.state === "validated_superseded"));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("live no-regression allows only the exact validated REVOKED URL", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-revoke-live-"));
  try {
    const queue = path.join(root, "queue"); const published = path.join(root, "published"); await fs.mkdir(published, { recursive: true });
    const input = path.join(root, "input"); const manifest = await makeInput(input, 93, { slug: "revoked-exact" });
    manifest.state = "revoked"; manifest.status_reason = "verified withdrawal";
    await write(path.join(input, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`); await addBundle(queue, input, manifest);
    const summary = await prepareQueue({ queueDir: queue, workDir: path.join(root, "work"), publishedRoot: published, now: new Date("2026-09-11T00:01:00Z"), env: ENV });
    const candidate = path.join(root, "candidate"); await write(path.join(candidate, "articles", "retained.html"), "retained");
    const live = path.join(root, "live");
    await write(path.join(live, "search-index.json"), JSON.stringify([
      { url: `https://drugnews.com.tw/articles/2026-09-11-${manifest.slug}.html` },
      { url: "https://drugnews.com.tw/articles/retained.html" }
    ]));
    await write(path.join(live, "en", "search-index.json"), "[]");
    const server = await staticServer(live);
    try {
      await auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: PACK_REPO });
      await fs.rm(path.join(candidate, "articles", "retained.html"));
      await assert.rejects(() => auditCandidate({ root: candidate, auditFile: summary.auditFile, liveBaseUrl: server.baseUrl, repoRoot: PACK_REPO }), /LIVE_INVENTORY_REGRESSION/);
    } finally { await server.close(); }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("release manifest rejects missing content-chain gates and wrong timezone", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnq-manifest-"));
  try {
    const manifest = await makeInput(root, 71);
    const payload = await payloadFromFixture(root);
    validatePayload(payload, payload.job_id);
    const badTime = structuredClone(payload); badTime.publish_at = "2026-09-11T08:00:00Z";
    assert.throws(() => validatePayload(badTime), /PUBLISH_AT_INVALID/);
    const missingLock = structuredClone(payload); delete missingLock.content_id;
    assert.throws(() => validatePayload(missingLock), /CONTENT_LOCK_REQUIRED/);
    const missingSocial = structuredClone(payload); missingSocial.social_schedule = [];
    assert.throws(() => validatePayload(missingSocial), /SOCIAL_SCHEDULE_REQUIRED/);
    const fakeEnglish = structuredClone(payload); fakeEnglish.english_status = "APPROVED";
    assert.throws(() => validatePayload(fakeEnglish), /ENGLISH_STATUS_MISMATCH/);
    const qaFail = structuredClone(payload); qaFail.qa.visual = 94;
    assert.throws(() => validatePayload(qaFail), /QA_SCORE_HOLD/);
    const imageOrder = structuredClone(payload); imageOrder.articles.zh.images[0].order = 2;
    assert.throws(() => validatePayload(imageOrder), /IMAGE_FIELDS_INVALID/);
    for (const invalidDate of ["2026-02-29T08:00:00+08:00", "2026-02-30T08:00:00+08:00"]) {
      const invalid = structuredClone(payload); invalid.publish_at = invalidDate;
      assert.throws(() => validatePayload(invalid), /PUBLISH_AT_INVALID/);
    }
    for (const invalidPublicDate of ["not-a-date", "2026-02-30"]) {
      const invalid = structuredClone(payload);
      const metaFile = invalid.articles.zh.files.find((file) => file.path === "meta.json");
      const meta = JSON.parse(Buffer.from(metaFile.data, "base64").toString("utf8")); meta.public_date = invalidPublicDate;
      writePayloadTextFile(invalid.articles.zh, "meta.json", JSON.stringify(meta)); relockPayload(invalid);
      assert.throws(() => validatePayload(invalid), /public_date.*Gregorian/);
    }
    const wrongPublicDate = structuredClone(payload);
    const publicDateFile = wrongPublicDate.articles.zh.files.find((file) => file.path === "meta.json");
    const publicDateMeta = JSON.parse(Buffer.from(publicDateFile.data, "base64").toString("utf8")); publicDateMeta.public_date = "2026-09-10";
    writePayloadTextFile(wrongPublicDate.articles.zh, "meta.json", JSON.stringify(publicDateMeta)); relockPayload(wrongPublicDate);
    assert.throws(() => validatePayload(wrongPublicDate), /public_date.*Asia\/Taipei/);
    const wrongMetaDate = structuredClone(payload);
    const wrongMetaFile = wrongMetaDate.articles.zh.files.find((file) => file.path === "meta.json");
    const wrongMeta = JSON.parse(Buffer.from(wrongMetaFile.data, "base64").toString("utf8")); wrongMeta.date = "2026-09-10";
    wrongMetaFile.data = Buffer.from(JSON.stringify(wrongMeta)).toString("base64"); wrongMetaFile.sha256 = digest(Buffer.from(wrongMetaFile.data, "base64"));
    assert.throws(() => validatePayload(wrongMetaDate), /META_MISMATCH/);
    const fakeHoldPair = structuredClone(payload);
    const fakePairFile = fakeHoldPair.articles.zh.files.find((file) => file.path === "meta.json");
    const fakePairMeta = JSON.parse(Buffer.from(fakePairFile.data, "base64").toString("utf8")); fakePairMeta.translations = { en: "future-en.html" };
    fakePairFile.data = Buffer.from(JSON.stringify(fakePairMeta)).toString("base64"); fakePairFile.sha256 = digest(Buffer.from(fakePairFile.data, "base64"));
    assert.throws(() => validatePayload(fakeHoldPair), /ENGLISH_HOLD_TRANSLATION_FORBIDDEN/);
    await write(path.join(root, "internal", "synthetic-pass.md"), "wrong-report");
    await assert.rejects(() => packBundle({ inputRoot: root, outputPath: path.join(root, "queue"), key: KEY, repoRoot: PACK_REPO, liveBaseUrl: "" }), /QA_REPORT_HASH_MISMATCH/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

let failed = 0;
for (const item of tests) {
  try { await item.fn(); console.log(`PASS ${item.name}`); }
  catch (error) { failed += 1; console.error(`FAIL ${item.name}: ${error.stack || error.message}`); }
}
console.log(`${tests.length - failed}/${tests.length} scheduled publishing tests passed.`);
await fs.rm(PACK_REPO_PARENT, { recursive: true, force: true });
if (failed) process.exitCode = 1;
