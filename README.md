# Drugnews GitHub Pages Site

This is a static GitHub Pages site for Drugnews. It is designed as a long-form article hub, while Facebook and Dcard remain distribution channels.

## Daily Publishing Workflow

For the daily Drugnews social update, start with:

```bash
npm run audit:pm
```

This gives the fastest product-manager status check: latest article date, social capture state, AI/SEO files, reference quality, related-reading quality, and analytics/Search Console configuration.

Then run the social capture and import workflow:

```bash
/bin/zsh scripts/daily_social_update.sh
```

This checks both Facebook and Dcard capture files, imports fresh posts, rebuilds the article pages, search, feeds, English index, topic hubs, and analytics injection. If no capture file exists, it prints the exact minimum JSON shape needed for that platform.

For the shortest Codex handoff checklist, use `docs/daily-codex-update-playbook.md`.

For Facebook-only maintenance, use:

```bash
/bin/zsh scripts/daily_fb_update.sh
```

If `/private/tmp/drugnews-facebook-latest.json` exists, this imports new Facebook posts, rebuilds article pages, search, sitemap, feeds, English index, and topic hubs. If the JSON does not exist, the command prints the exact minimum capture format needed from the logged-in Facebook page. If npm is available, `npm run daily:fb` is equivalent.

If the daily check asks for a logged-in browser capture, open the dedicated Drugnews capture Chrome with:

```bash
npm run chrome:social
```

The first run opens a dedicated Chrome profile for Drugnews social capture. Log in to Facebook and Dcard in that window once; the same profile is reused by future capture runs.

Then capture the newest Facebook long-form post with:

```bash
npm run capture:fb
```

The capture script writes `/private/tmp/drugnews-facebook-latest.json` plus `/private/tmp/drugnews-facebook-latest.json.diagnostics.json`. It only selects candidates that look like long-form analysis posts and downranks notifications, comments, course promotions, and website announcements.

Capture the newest Dcard post with:

```bash
npm run capture:dcard
```

The Dcard capture script writes `/private/tmp/drugnews-dcard-latest.json` plus diagnostics, keeps the original paragraph breaks, downloads Dcard article images, and inserts them back into the article body by section order.

To combine capture and import in one command, use:

```bash
npm run daily:social:capture
```

This attempts Facebook and Dcard capture first, then runs the normal social import status check. If Chrome remote debugging is not available or a platform returns no safe long-form candidate, it continues with a clear capture request instead of guessing.

1. Create one folder under `content/inbox/`.
2. Add:
   - `article.md`
   - `meta.json`
   - optional `images/`
3. Run:

```bash
npm run publish
```

Articles with `publish_at` in the past are generated into `articles/`, moved to `content/published/`, and added to `search-index.json` and `sitemap.xml`.

Use `npm run publish:force` to publish inbox drafts regardless of `publish_at`.

## Cover Image Policy

Facebook and Dcard original images should stay in the article body with their original placement. Do not use long social post infographics as website covers. For Facebook imports, generate a clean landscape editorial cover for `cover_image`; the publisher blocks `images/facebook-XX.*` as a Facebook article cover so card thumbnails, OG images, RSS, and homepage previews do not crop body infographics badly.

## Article Markdown

Use normal Markdown headings, paragraphs, links, lists, blockquotes, and inline images:

```markdown
![Image caption](images/example.jpg)
```

Each article must include the disclaimer sentence that the content does not constitute investment, medical, fundraising, or stock advice.

## Meta File

```json
{
  "title": "Article title",
  "date": "2026-06-10",
  "publish_at": "2026-06-10T10:30:00+08:00",
  "category": "生技估值",
  "tags": ["估值", "生技"],
  "summary": "Short article summary.",
  "slug": "optional-english-slug",
  "facebook_url": "",
  "dcard_url": ""
}
```
