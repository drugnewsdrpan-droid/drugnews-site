# Drugnews Daily Social Update Command Pack

Purpose: update Drugnews with the newest published Facebook and Dcard articles using the lowest-token, highest-confidence workflow. Do not guess article content.

## Start Here

Read only these files first:

- `README.md`
- `package.json`
- `scripts/import_facebook_posts_to_content.mjs`
- `scripts/import_dcard_scrape_to_content.mjs`
- `scripts/daily_social_update_check.mjs`
- `scripts/publish_articles.mjs`
- `git status --short`

Do not scan the whole repository unless one of those files points to a specific new dependency.

## Daily Decision Rule

1. Run the unified social check:
   `/bin/zsh scripts/codex_daily_start.sh`
2. Open the dedicated capture Chrome only when the command reports a missing capture file:
   `npm run chrome:social`
   The first run opens Facebook and Dcard in a reusable profile. Log in there once.
3. If the dedicated Chrome profile is blocked by a Facebook or Dcard login shell, try the normal logged-in Chrome window once, opening the newest permalink directly.
4. Find the newest published Drugnews post on each platform. The source of truth is the public Facebook / Dcard post, not local draft folders, three-platform writing packs, image prompt folders, schedule notes, or unpublished PM files.
5. Compare its title/date/permalink with the newest article in:
   - `index.html`
   - `articles/index.html`
   - `search-index.json`
   - `content/published/*/meta.json`
6. If the newest social post is already on the site, report that and stop.
7. If the newest social post is not on the site, import it.
8. If Facebook or Dcard blocks or hides the post body after the dedicated Chrome route and the normal logged-in Chrome route, stop and ask only for the latest post URL or the pasted post body plus images.
9. Vocus paid articles are not homepage lead stories. Use summaries and routing only; do not move paid full text into the official site.

Successful fallback pattern from 2026-06-28:

- Dedicated social-capture Chrome saw a login wall and produced only a short candidate.
- Normal logged-in Chrome opened the Facebook permalink and exposed the full post text plus four images.
- The import JSON was then written to `/private/tmp/drugnews-facebook-latest-full.json` and imported with `scripts/import_facebook_posts_to_content.mjs`.
- The importer must preserve date-start paragraphs such as `6 月 22 日...`; do not filter them out as admin text.

## Import Contract

Create a temporary JSON file shaped like:

```json
[
  {
    "title": "Post title",
    "slug": "english-slug",
    "published": "YYYY-MM-DDT10:30:00+08:00",
    "url": "Facebook permalink",
    "articleText": "Full post text with original line breaks",
    "images": ["Facebook image CDN URL 1", "Facebook image CDN URL 2"],
    "cover_image": "",
    "cover_image_alt": "Clean editorial cover description"
  }
]
```

Use the Facebook post body exactly, preserving line breaks and section order. Remove only admin UI text, comments, reactions, and Facebook chrome.

For Dcard captures, use:

```json
[
  {
    "title": "Post title",
    "published": "YYYY-MM-DDT10:30:00+08:00",
    "url": "https://www.dcard.tw/@drugnews/post/POST_ID",
    "articleText": "Full Dcard post text with original paragraph breaks",
    "images": ["https://megapx-assets.dcard.tw/images/.../1280.webp"]
  }
]
```

Preserve Dcard paragraph breaks exactly. Dcard original images should stay in the article body in the same logical order as the post.

Before import, scan the title, article text, summary, and notes for non-public production markers: `使用者`, `內部`, `Prompt`, `【圖片插入】`, `待最後確認`, `QA`, `送出前`, `raw markdown`, code fences, `mp.weixin.qq.com`, A/B/C/D/E/F/G package headings, scheduling notes, and CMoney checklist language. The Facebook and Dcard importers enforce this gate. A hit means the payload is a writing pack or internal draft, not a public article; stop and route it back to PM.

## Fast Commands

Start with the single daily entrypoint:

```bash
/bin/zsh scripts/codex_daily_start.sh
```

This is the preferred Codex-open workflow. It uses the bundled Node runtime when normal `node` is unavailable, attempts logged-in Chrome capture, runs import/publish when fresh posts exist, then runs reference, reader-path, and PM health audits.

For a lighter status-only check:

```bash
npm run daily:social
```

When Chrome remote debugging is available and you want the fastest assisted capture path, use:

```bash
npm run daily:social:capture
```

If Chrome remote debugging is not available, start the dedicated social-capture browser first:

```bash
npm run chrome:social
```

If `npm` is unavailable in the current Codex shell, use:

```bash
/bin/zsh scripts/start_social_capture_chrome.sh
```

Behavior:

- If `/private/tmp/drugnews-facebook-latest.json` or `/private/tmp/drugnews-dcard-latest.json` is missing, it prints the latest known site article and the exact capture JSON shape for that platform.
- If the JSON exists and the post is already published, it skips that platform.
- If either JSON contains a new post, it imports text/images and rebuilds the site once.

Use the bundled Node path if `node` is unavailable or npm is not available:

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/daily_social_update_check.mjs
```

Fallback manual pipeline:

If the dedicated Chrome is already running with remote debugging enabled, capture the newest Facebook candidate first:

```bash
npm run capture:fb
```

Inspect `/private/tmp/drugnews-facebook-latest.json.diagnostics.json` before importing. The selected candidate must be a real long-form Drugnews article, not a notification, comment thread, website announcement, or course/promo post.

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/import_facebook_posts_to_content.mjs /private/tmp/drugnews-facebook-latest.json
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/import_dcard_scrape_to_content.mjs /private/tmp/drugnews-dcard-latest.json
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/publish_articles.mjs --force
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build_english_site.mjs
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build_topic_hubs.mjs
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/inject_analytics.mjs
```

## Image Rules

- Keep Facebook/Dcard original images inside the article body.
- Do not use long social infographics as the homepage cover.
- Make a clean premium landscape editorial cover for `cover_image`. Prefer no headline text on the cover so homepage cards, OG previews, and mobile crops cannot cut words off.
- For the newest English daily long-form article, the preferred standard is four GPT-generated 16:9 English figures with short English text baked into the image, inspected manually for spelling, margins, and layout. If generated text is unreliable, fall back to a no-text background plus exact programmatic English labels.
- Check that every public image exists under `assets/articles/<slug>/`.

## English Article Rules

- The English article must not be a shortened summary of the Chinese article. Preserve the original argument sequence, H2 sections, examples, risk layers, references, and disclaimer.
- Write in natural professional English for global biotech, pharma, investor-relations, and capital-market readers. Avoid machine-translation phrasing.
- The newest English long-form article should have at least four English article figures. Use GPT-generated BioRender-style 16:9 figures with English labels baked into the image when quality is good, then inspect each image for spelling, layout, and readability.
- Do not reuse Chinese Facebook/Dcard images as English figures. If the original image is useful, recreate the concept in English. If GPT text quality is poor, generate the background without text and add labels programmatically.
- Insert English figures into the corresponding sections; do not append them as a disconnected gallery.
- Use the best English figure as `cover_image` so homepage, OG image, RSS, and search previews are English-native.

## QA Checklist

Before commit:

- `articles/YYYY-MM-DD-slug.html` exists.
- `index.html` shows the new article as the latest free article.
- `articles/index.html`, `search-index.json`, `sitemap.xml`, and `feed.xml` contain the new slug.
- Article body has full text, section breaks, and image placement.
- English counterpart has full-length analysis and at least four English figures when it is a daily long-form article.
- No horizontal overflow in local browser QA.
- `git status --short` contains only intended files plus known pre-existing unrelated changes.

English-specific QA:

```bash
npm run audit:english-localization
npm run audit:english-visual
npm run audit:english-completeness
```

## Commit And Deploy

Only stage the new article folder, public assets, generated article page, and necessary index/search/sitemap/feed/topic pages.

Do not mix unrelated dirty files into the commit.

Push with:

```bash
git -c core.sshCommand="ssh -i ../drugnews_editorial_june_deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" push git@github.com:drugnewsdrpan-droid/drugnews-site.git main
```

Verify:

```bash
curl -s -I https://drugnews.com.tw/articles/YYYY-MM-DD-slug.html
curl -s https://drugnews.com.tw/articles/index.html | rg -n "slug-or-title"
```

## Default User-Facing Report

Keep the report short:

- Article title
- Official URL
- Images imported
- Search/sitemap/feed updated
- Commit hash
- Any known leftover unrelated dirty file
