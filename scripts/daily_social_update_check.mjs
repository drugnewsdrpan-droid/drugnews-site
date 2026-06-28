import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const FB_INPUT = "/private/tmp/drugnews-facebook-latest.json";
const DCARD_INPUT = "/private/tmp/drugnews-dcard-latest.json";
const FB_DIAGNOSTICS = `${FB_INPUT}.diagnostics.json`;
const FB_PAGE_URL = "https://www.facebook.com/profile.php?id=61568446257142";
const DCARD_PAGE_URL = process.env.DRUGNEWS_DCARD_PAGE_URL || "https://www.dcard.tw/f/persona_drugnews";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const captureFacebook = args.includes("--capture-facebook") || process.env.DRUGNEWS_CAPTURE_FACEBOOK === "1";
const captureDcard = args.includes("--capture-dcard") || process.env.DRUGNEWS_CAPTURE_DCARD === "1";
const fbInput = args.find((arg) => arg.startsWith("--facebook="))?.slice("--facebook=".length) || FB_INPUT;
const dcardInput = args.find((arg) => arg.startsWith("--dcard="))?.slice("--dcard=".length) || DCARD_INPUT;
const facebookPostUrl = args.find((arg) => arg.startsWith("--facebook-post="))?.slice("--facebook-post=".length) || process.env.DRUGNEWS_FACEBOOK_POST_URL || "";
const dcardPostUrl = args.find((arg) => arg.startsWith("--dcard-post="))?.slice("--dcard-post=".length) || process.env.DRUGNEWS_DCARD_POST_URL || "";

function facebookId(url = "") {
  const value = String(url || "");
  return value.match(/[?&]story_fbid=([^&]+)/)?.[1] ||
    value.match(/[?&]set=pcb\.([^&]+)/)?.[1] ||
    value.match(/[?&]fbid=([^&]+)/)?.[1] ||
    "";
}

function dcardId(url = "") {
  return String(url || "").match(/\/(?:post|p)\/(\d+)/)?.[1] || "";
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, "utf8"));
}

async function readJsonSafe(filePath, fallback = null) {
  try {
    return await readJson(filePath);
  } catch {
    return fallback;
  }
}

async function listPublished() {
  const folders = await fsp.readdir(PUBLISHED, { withFileTypes: true }).catch(() => []);
  const items = [];
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const metaPath = path.join(PUBLISHED, folder.name, "meta.json");
    if (!fs.existsSync(metaPath)) continue;
    try {
      const meta = await readJson(metaPath);
      items.push({
        folder: folder.name,
        title: meta.title || "",
        date: meta.date || "",
        publish_at: meta.publish_at || meta.date || "",
        slug: meta.slug || folder.name,
        source_platform: meta.source_platform || "",
        facebook_url: meta.facebook_url || "",
        facebook_id: facebookId(meta.facebook_url || ""),
        dcard_url: meta.dcard_url || "",
        dcard_id: dcardId(meta.dcard_url || "")
      });
    } catch {
      // Older malformed drafts should not stop the daily status check.
    }
  }
  return items.sort((a, b) => String(b.publish_at).localeCompare(String(a.publish_at)));
}

function sameFacebookPost(post, item) {
  const incomingId = facebookId(post.url || post.facebook_url || "");
  if (incomingId && incomingId === item.facebook_id) return true;
  const incomingUrl = String(post.url || post.facebook_url || "").trim();
  if (incomingUrl && incomingUrl === item.facebook_url) return true;
  const incomingTitle = String(post.title || "").trim();
  return Boolean(incomingTitle && incomingTitle === item.title);
}

function sameDcardPost(post, item) {
  const incomingId = dcardId(post.url || post.dcard_url || "");
  if (incomingId && incomingId === item.dcard_id) return true;
  const incomingUrl = String(post.url || post.dcard_url || "").trim();
  if (incomingUrl && incomingUrl === item.dcard_url) return true;
  const incomingTitle = String(post.title || "").trim();
  return Boolean(incomingTitle && incomingTitle === item.title);
}

function normalizeTitle(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[｜|]\s*(Drugnews|藥時事).*$/iu, "")
    .trim();
}

function firstFacebookCandidate(diagnostics) {
  return Array.isArray(diagnostics?.candidates) ? diagnostics.candidates[0] : null;
}

function facebookPreviewAlreadyPublished(diagnostics, published) {
  const candidate = firstFacebookCandidate(diagnostics);
  if (!candidate?.title) return false;
  const title = normalizeTitle(candidate.title);
  return published.some((item) => normalizeTitle(item.title) === title);
}

function validatePosts(posts, platform) {
  if (!Array.isArray(posts)) {
    throw new Error(`${platform} input must be a non-empty array of posts.`);
  }
  for (const [index, post] of posts.entries()) {
    for (const field of ["title", "published", "url", "articleText"]) {
      if (!String(post[field] || "").trim()) {
        throw new Error(`${platform} post ${index + 1} is missing required field: ${field}`);
      }
    }
    if (!Array.isArray(post.images)) post.images = [];
  }
  return posts;
}

function runNode(script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}`);
  }
}

async function writeFiltered(prefix, posts) {
  const filteredPath = path.join("/private/tmp", `${prefix}-${Date.now()}.json`);
  await fsp.writeFile(filteredPath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  return filteredPath;
}

function captureRequests(published, missing) {
  const latestFb = published.find((item) => /^facebook$/i.test(item.source_platform) || item.facebook_url);
  const latestDcard = published.find((item) => /^dcard$/i.test(item.source_platform) || item.dcard_url);
  const requests = {};
  if (missing.facebook) {
    requests.facebook = {
      status: "needs_facebook_capture",
      page_url: FB_PAGE_URL,
      input_path: fbInput,
      latest_known: latestFb ? {
        date: latestFb.date,
        title: latestFb.title,
        url: latestFb.facebook_url,
        slug: latestFb.slug
      } : null,
      required_shape: [{
        title: "Post title",
        slug: "english-slug",
        published: "YYYY-MM-DDT10:30:00+08:00",
        url: "Facebook permalink",
        articleText: "Full post text with original line breaks",
        images: ["Facebook image CDN URL 1", "Facebook image CDN URL 2"],
        cover_image: "",
        cover_image_alt: "Clean editorial cover description"
      }]
    };
  }
  if (missing.dcard) {
    requests.dcard = {
      status: "needs_dcard_capture",
      page_url: DCARD_PAGE_URL,
      input_path: dcardInput,
      latest_known: latestDcard ? {
        date: latestDcard.date,
        title: latestDcard.title,
        url: latestDcard.dcard_url,
        slug: latestDcard.slug
      } : null,
      note: "Dcard often blocks server-side reading. Use the logged-in Chrome scraper first, or save the full post text and image URLs to input_path.",
      required_shape: [{
        title: "Post title",
        published: "YYYY-MM-DDT10:30:00+08:00",
        url: "https://www.dcard.tw/@drugnews/post/POST_ID or https://www.dcard.tw/f/persona_drugnews/p/POST_ID",
        articleText: "Full Dcard post text with original paragraph breaks",
        images: ["https://megapx-assets.dcard.tw/images/.../1280.webp"]
      }]
    };
  }
  return requests;
}

async function loadFresh(inputPath, platform, published, samePost) {
  if (!fs.existsSync(inputPath)) return { missing: true, posts: [], freshPosts: [] };
  const rawPosts = await readJson(inputPath);
  if (!Array.isArray(rawPosts) || rawPosts.length === 0) return { missing: true, posts: [], freshPosts: [] };
  const posts = validatePosts(rawPosts, platform);
  const freshPosts = posts.filter((post) => !published.some((item) => samePost(post, item)));
  return { missing: false, posts, freshPosts };
}

async function main() {
  if (captureFacebook) {
    const result = spawnSync(process.execPath, [
      "scripts/scrape_facebook_cdp.mjs",
      facebookPostUrl ? "post" : "profile",
      facebookPostUrl || FB_PAGE_URL,
      fbInput
    ], {
      cwd: ROOT,
      encoding: "utf8"
    });
    if (result.status !== 0) {
      console.warn("Facebook Chrome capture was not available; continuing with capture request output.");
    } else if (result.stdout) {
      process.stdout.write(result.stdout);
    }
  }

  if (captureDcard) {
    const result = spawnSync(process.execPath, [
      "scripts/scrape_dcard_cdp.mjs",
      dcardPostUrl ? "post" : "profile",
      dcardPostUrl || DCARD_PAGE_URL,
      dcardInput
    ], {
      cwd: ROOT,
      encoding: "utf8"
    });
    if (result.status !== 0) {
      console.warn("Dcard Chrome capture was not available; continuing with capture request output.");
    } else if (result.stdout) {
      process.stdout.write(result.stdout);
    }
  }

  const published = await listPublished();
  const facebook = await loadFresh(fbInput, "Facebook", published, sameFacebookPost);
  const dcard = await loadFresh(dcardInput, "Dcard", published, sameDcardPost);
  const facebookDiagnostics = await readJsonSafe(FB_DIAGNOSTICS, null);
  const facebookLimitedButCurrent = facebook.missing && facebookPreviewAlreadyPublished(facebookDiagnostics, published);

  const imported = [];

  if (facebook.freshPosts.length) {
    const importPath = facebook.freshPosts.length === facebook.posts.length
      ? fbInput
      : await writeFiltered("drugnews-facebook-fresh", facebook.freshPosts);
    if (!dryRun) runNode("scripts/import_facebook_posts_to_content.mjs", [importPath]);
    imported.push(...facebook.freshPosts.map((post) => ({ platform: "Facebook", title: post.title, published: post.published, url: post.url, images: post.images.length })));
  }

  if (dcard.freshPosts.length) {
    const importPath = dcard.freshPosts.length === dcard.posts.length
      ? dcardInput
      : await writeFiltered("drugnews-dcard-fresh", dcard.freshPosts);
    if (!dryRun) runNode("scripts/import_dcard_scrape_to_content.mjs", [importPath]);
    imported.push(...dcard.freshPosts.map((post) => ({ platform: "Dcard", title: post.title, published: post.published, url: post.url, images: post.images.length })));
  }

  if (imported.length && !dryRun) {
    runNode("scripts/publish_articles.mjs", ["--force"]);
    runNode("scripts/build_english_site.mjs");
    runNode("scripts/build_japanese_site.mjs");
    runNode("scripts/build_topic_hubs.mjs");
    runNode("scripts/build_company_index.mjs");
    runNode("scripts/inject_analytics.mjs");
  }

  const status = imported.length
    ? (dryRun ? "dry_run_ready" : "published")
    : ((facebook.missing && !facebookLimitedButCurrent) || dcard.missing ? "needs_capture" : facebookLimitedButCurrent ? "already_current_limited_capture" : "already_current");

  console.log(JSON.stringify({
    status,
    imported_posts: imported,
    platform_state: {
      facebook: facebookLimitedButCurrent ? "already_current_limited_capture" : facebook.missing ? "needs_capture" : "capture_ready",
      dcard: dcard.missing ? "needs_capture" : "capture_ready"
    },
    checked_inputs: {
      facebook: fbInput,
      dcard: dcardInput
    },
    capture_mode: {
      facebook: captureFacebook ? (facebookPostUrl ? "logged_in_chrome_post" : "logged_in_chrome_profile") : "existing_json",
      dcard: captureDcard ? (dcardPostUrl ? "logged_in_chrome_post" : "logged_in_chrome_profile") : "existing_json"
    },
    requests: captureRequests(published, {
      facebook: facebook.missing && !facebookLimitedButCurrent,
      dcard: dcard.missing
    }),
    latest_site_article: published[0] ? {
      date: published[0].date,
      title: published[0].title,
      slug: published[0].slug
    } : null,
    next_step: imported.length
      ? "QA the generated pages, then commit and push intended files only."
      : facebookLimitedButCurrent && dcard.missing
        ? "Facebook visible preview matches an already published site article. Dcard still needs logged-in capture if it has a newer post."
        : "If the social platforms have newer posts, run the logged-in Chrome scraper or provide the missing capture JSON and rerun this command."
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
