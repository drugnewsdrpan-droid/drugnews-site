import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const DEFAULT_INPUT = "/private/tmp/drugnews-facebook-latest.json";
const FB_PAGE_URL = "https://www.facebook.com/profile.php?id=61568446257142";

const args = process.argv.slice(2);
const inputArg = args.find((arg) => arg.startsWith("--input="));
const inputPath = inputArg ? inputArg.slice("--input=".length) : DEFAULT_INPUT;
const dryRun = args.includes("--dry-run");

function postId(url = "") {
  const value = String(url || "");
  return value.match(/[?&]story_fbid=([^&]+)/)?.[1] ||
    value.match(/[?&]set=pcb\.([^&]+)/)?.[1] ||
    value.match(/[?&]fbid=([^&]+)/)?.[1] ||
    "";
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, "utf8"));
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
        facebook_url: meta.facebook_url || "",
        facebook_id: postId(meta.facebook_url || ""),
        source_platform: meta.source_platform || "",
        lang: meta.lang || "zh-Hant"
      });
    } catch {
      // Ignore malformed old drafts; the publish step will report hard errors.
    }
  }
  return items.sort((a, b) => String(b.publish_at).localeCompare(String(a.publish_at)));
}

function samePost(post, item) {
  const incomingId = postId(post.url || post.facebook_url || "");
  if (incomingId && incomingId === item.facebook_id) return true;
  const incomingUrl = String(post.url || post.facebook_url || "").trim();
  if (incomingUrl && incomingUrl === item.facebook_url) return true;
  const incomingTitle = String(post.title || "").trim();
  return Boolean(incomingTitle && incomingTitle === item.title);
}

function validatePosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    throw new Error("Input must be a non-empty array of Facebook posts.");
  }
  for (const [index, post] of posts.entries()) {
    for (const field of ["title", "published", "url", "articleText"]) {
      if (!String(post[field] || "").trim()) {
        throw new Error(`Post ${index + 1} is missing required field: ${field}`);
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

function printCaptureRequest(published) {
  const latestFb = published.find((item) => /^facebook$/i.test(item.source_platform) || item.facebook_url);
  const latestAny = published[0];
  console.log(JSON.stringify({
    status: "needs_facebook_capture",
    facebook_page_url: FB_PAGE_URL,
    input_path: inputPath,
    latest_known_facebook_article: latestFb ? {
      date: latestFb.date,
      title: latestFb.title,
      url: latestFb.facebook_url,
      slug: latestFb.slug
    } : null,
    latest_site_article: latestAny ? {
      date: latestAny.date,
      title: latestAny.title,
      slug: latestAny.slug
    } : null,
    next_step: "Open the logged-in Facebook page, capture the newest published Drugnews post, save it to input_path, then rerun this command.",
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
  }, null, 2));
}

async function main() {
  const published = await listPublished();
  if (!fs.existsSync(inputPath)) {
    printCaptureRequest(published);
    return;
  }

  const posts = validatePosts(await readJson(inputPath));
  const freshPosts = posts.filter((post) => !published.some((item) => samePost(post, item)));

  if (freshPosts.length === 0) {
    console.log(JSON.stringify({
      status: "already_current",
      checked_input: inputPath,
      posts_checked: posts.length,
      latest_known_article: published[0] ? {
        date: published[0].date,
        title: published[0].title,
        slug: published[0].slug
      } : null
    }, null, 2));
    return;
  }

  const importPath = inputPath;
  if (freshPosts.length !== posts.length) {
    const filteredPath = path.join("/private/tmp", `drugnews-facebook-fresh-${Date.now()}.json`);
    await fsp.writeFile(filteredPath, `${JSON.stringify(freshPosts, null, 2)}\n`, "utf8");
    console.log(`Filtered ${posts.length - freshPosts.length} duplicate post(s). Importing ${freshPosts.length} new post(s) from ${filteredPath}`);
    if (!dryRun) {
      runNode("scripts/import_facebook_posts_to_content.mjs", [filteredPath]);
    }
  } else if (!dryRun) {
    runNode("scripts/import_facebook_posts_to_content.mjs", [importPath]);
  }

  if (!dryRun) {
    runNode("scripts/publish_articles.mjs", ["--force"]);
    runNode("scripts/build_english_site.mjs");
    runNode("scripts/build_japanese_site.mjs");
    runNode("scripts/build_topic_hubs.mjs");
    runNode("scripts/inject_analytics.mjs");
  }

  console.log(JSON.stringify({
    status: dryRun ? "dry_run_ready" : "published",
    imported_posts: freshPosts.map((post) => ({
      title: post.title,
      published: post.published,
      url: post.url,
      images: Array.isArray(post.images) ? post.images.length : 0
    })),
    next_step: dryRun ? "Rerun without --dry-run to import and rebuild." : "Run git status, QA the generated page, then commit and push intended files only."
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
