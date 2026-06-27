# Drugnews Daily Facebook Update Command Pack

Purpose: update Drugnews with the newest published Facebook article using the lowest-token, highest-confidence workflow. Do not guess article content.

## Start Here

Read only these files first:

- `README.md`
- `package.json`
- `scripts/import_facebook_posts_to_content.mjs`
- `scripts/publish_articles.mjs`
- `git status --short`

Do not scan the whole repository unless one of those files points to a specific new dependency.

## Daily Decision Rule

1. Open the logged-in Chrome session and visit:
   `https://www.facebook.com/profile.php?id=61568446257142`
2. Find the newest Drugnews page post.
3. Compare its title/date/permalink with the newest article in:
   - `index.html`
   - `articles/index.html`
   - `search-index.json`
   - `content/published/*/meta.json`
4. If the newest Facebook post is already on the site, report that and stop.
5. If the newest Facebook post is not on the site, import it.
6. If Facebook blocks or hides the post body after two attempts, stop and ask only for the latest post URL or the pasted post body plus images.

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

## Fast Commands

Start with the single daily entrypoint:

```bash
npm run daily:fb
```

Behavior:

- If `/private/tmp/drugnews-facebook-latest.json` is missing, it prints the latest known site article and the exact Facebook capture JSON shape.
- If the JSON exists and the post is already published, it stops with `already_current`.
- If the JSON contains a new post, it imports Facebook text/images and rebuilds the site.

Use the bundled Node path if `node` is unavailable or npm is not available:

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/daily_facebook_update_check.mjs
```

Fallback manual pipeline:

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/import_facebook_posts_to_content.mjs /private/tmp/drugnews-facebook-latest.json
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/publish_articles.mjs --force
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build_english_site.mjs
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build_topic_hubs.mjs
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/inject_analytics.mjs
```

## Image Rules

- Keep Facebook/Dcard original images inside the article body.
- Do not use long social infographics as the homepage cover.
- Make a clean landscape editorial cover for `cover_image`.
- For images with important text, do not rely on AI-rendered text. Use either original images or programmatic English labels.
- Check that every public image exists under `assets/articles/<slug>/`.

## QA Checklist

Before commit:

- `articles/YYYY-MM-DD-slug.html` exists.
- `index.html` shows the new article as the latest free article.
- `articles/index.html`, `search-index.json`, `sitemap.xml`, and `feed.xml` contain the new slug.
- Article body has full text, section breaks, and image placement.
- No horizontal overflow in local browser QA.
- `git status --short` contains only intended files plus known pre-existing unrelated changes.

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
