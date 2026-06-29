# Drugnews GitHub Pages Site

This is a static GitHub Pages site for Drugnews. It is designed as a long-form article hub, while Facebook and Dcard remain distribution channels.

## Daily Publishing Workflow

For the daily Drugnews social update, start with:

```bash
/bin/zsh scripts/codex_daily_start.sh
```

This is the fastest Codex entrypoint. It runs the PM health check, confirms the dedicated social-capture Chrome, tries Facebook and Dcard capture/import, rebuilds the site if fresh posts are found, runs reference and reader-path QA, and leaves status files in `/private/tmp`.

If the newest social post URL is known, pass it directly to the same daily entrypoint:

```bash
/bin/zsh scripts/codex_daily_start.sh --facebook-post="https://www.facebook.com/..."
/bin/zsh scripts/codex_daily_start.sh --dcard-post="https://www.dcard.tw/f/persona_drugnews/p/POST_ID"
```

This keeps the daily workflow no-API by reading the full post and images from the logged-in Chrome page.

The daily entrypoint now standardizes the no-API fallback Codex has used successfully before: if the Facebook or Dcard profile page exposes only a preview, diagnostics are checked for the newest permalink and the script automatically retries the logged-in single-post route. It also checks whether a Facebook or Dcard single-post tab is already open in the social-capture Chrome before navigating back to the profile page. If the actual post is already open and you want to force that active tab, use `--facebook-current` or `--dcard-current`.

If you only want to inspect site health without social capture:

```bash
npm run audit:pm
```

This gives the fastest product-manager status check: latest article date, social capture state, AI/SEO files, reference quality, related-reading quality, and analytics/Search Console configuration.

When Google Analytics or Search Console tokens are ready, enable them with:

```bash
npm run tracking:configure -- --ga4=G-XXXXXXXXXX --gsc=GOOGLE_SEARCH_CONSOLE_TOKEN
```

Then run `npm run audit:pm`, commit, and deploy. The command accepts the Search Console HTML-tag content value; it also strips the surrounding `<meta ...>` tag if pasted whole.

Then run the social capture and import workflow:

```bash
/bin/zsh scripts/daily_social_update.sh
```

This checks both Facebook and Dcard capture files, imports fresh posts, rebuilds the article pages, search, feeds, English index, topic hubs, and analytics injection. If no capture file exists, it prints the exact minimum JSON shape needed for that platform.

For the shortest Codex handoff checklist, use `docs/daily-codex-update-playbook.md`.

Daily automation note: Codex has one active app automation named `Drugnews 每日文章更新檢查` (`drugnews`). It runs the same daily social update check at 10:45 Taipei time. Duplicate thread wakeups have been paused so the site is not updated by two competing workflows. The automation should import and deploy only when it can safely read full posts and images; if Facebook, Dcard, or Vocus blocks access, it reports the exact minimum input needed instead of guessing.

After the daily growth brief is generated, notify supported search engines of the updated canonical article and AI-readable files with:

```bash
npm run growth:indexnow
```

Use `node scripts/submit_indexnow.mjs --dry-run` first when checking the URL list without sending it.

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

The Dcard capture script reads the Drugnews persona route (`https://www.dcard.tw/f/persona_drugnews`) and writes `/private/tmp/drugnews-dcard-latest.json` plus diagnostics. It supports both old `@drugnews/post/POST_ID` links and newer `f/persona_drugnews/p/POST_ID` links, keeps the original paragraph breaks, downloads Dcard article images, and inserts them back into the article body by section order. If Dcard changes the route again, set `DRUGNEWS_DCARD_PAGE_URL` before running the daily command.

To combine capture and import in one command, use:

```bash
npm run daily:social:capture
```

This attempts Facebook and Dcard capture first, then runs the normal social import status check. If Chrome remote debugging is not available or a platform returns no safe long-form candidate, it continues with a clear capture request instead of guessing.

If the newest post URL is already known, use the logged-in Chrome single-post route. This is the fastest no-API route and is the preferred fallback when profile pages are noisy:

```bash
DRUGNEWS_FACEBOOK_POST_URL="https://www.facebook.com/..." npm run daily:social:capture
DRUGNEWS_DCARD_POST_URL="https://www.dcard.tw/f/persona_drugnews/p/POST_ID" npm run daily:social:capture
```

This reads the post body and images from the browser page, keeps paragraph breaks, downloads images into the article folder, rebuilds the site, and avoids guessing from previews.

If the newest post is already open in the social-capture Chrome window, read that current platform tab directly:

```bash
/bin/zsh scripts/codex_daily_start.sh --facebook-current
/bin/zsh scripts/codex_daily_start.sh --dcard-current
```

This is the preferred no-API fallback when Facebook or Dcard profile pages show only a login wall or app shell. Open the actual post page in Chrome first; Codex will read the visible article text and images from that tab.

## International Article Standard

English pages should read as native English articles, not machine-looking mirrors of the Chinese page. When no API is available, use the deterministic localization workflow:

1. Translate and rewrite from the published Chinese article into natural English.
2. Link the Chinese and English `meta.json` files through `translations`.
3. Rebuild article images as English SVG or programmatically typeset cards; do not reuse Chinese Facebook or Dcard infographics as English figures.
4. Run the localization audit before deployment:

```bash
npm run audit:english-localization
```

Japanese localization is not exposed on the public site for now. Re-enable it only after there is enough maintained Japanese content and localized figures to meet the same quality bar as the Chinese and English site.

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
Publishing also refreshes RSS (`feed.xml`), JSON Feed (`feed.json`), `llms.txt`, `ai-index.json`, `knowledge-graph.json`, and the capital-market radar files used by search and AI answer engines.

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
