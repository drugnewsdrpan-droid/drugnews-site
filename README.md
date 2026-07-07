# Drugnews GitHub Pages Site

This is a static GitHub Pages site for Drugnews. It is designed as a long-form article hub, while Facebook and Dcard remain distribution channels.

## Daily Publishing Workflow

For the daily Drugnews social update, start with:

```bash
/bin/zsh scripts/codex_daily_start.sh
```

This is the fastest Codex entrypoint. It runs the PM health check, confirms the dedicated social-capture Chrome, tries Facebook and Dcard capture/import, rebuilds the site if fresh posts are found, runs reference and reader-path QA, and leaves status files in `/private/tmp`.

### Public Source And Import Gate

The newest website article must be verified from a public Drugnews source before import. Use Facebook and Dcard public long-form posts first; use Vocus only for paid-column summaries and routing. Do not infer "today's article" from local draft folders, three-platform writing packs, filenames, screenshots, or unpublished planning notes. If Facebook or Dcard is blocked by a login wall, app shell, Cloudflare, or missing permalink, report the capture blocker and ask for the latest public post URL or pasted full text plus images instead of guessing.

Before any Facebook or Dcard payload is imported, the importers scan the public article payload for production markers such as `使用者`, `內部`, `Prompt`, `【圖片插入】`, `待最後確認`, `QA`, `送出前`, `raw markdown`, code fences, `mp.weixin.qq.com`, three-platform package sections, scheduling notes, and CMoney checklist language. A match blocks the import and routes the item back to PM. Only the public long-form article, public images, references, and disclaimer belong on the official website.

If the newest social post URL is known, pass it directly to the same daily entrypoint:

```bash
/bin/zsh scripts/codex_daily_start.sh --facebook-post="https://www.facebook.com/..."
/bin/zsh scripts/codex_daily_start.sh --dcard-post="https://www.dcard.tw/f/persona_drugnews/p/POST_ID"
```

This keeps the daily workflow no-API by reading the full post and images from the logged-in Chrome page.

The daily entrypoint now standardizes the no-API fallback Codex has used successfully before: if the Facebook or Dcard profile page exposes only a preview, diagnostics are checked for the newest permalink and the script automatically retries the logged-in single-post route. It also checks whether a Facebook or Dcard single-post tab is already open in the social-capture Chrome before navigating back to the profile page. If the actual post is already open and you want to force that active tab, use `--facebook-current` or `--dcard-current`.

If the user's normal Chrome profile is already logged in, the daily entrypoint first runs a regular-Chrome readiness check. For Codex to read the actual page body from normal Chrome, Chrome must have this one-time local setting enabled:

```text
Chrome menu bar -> View / 顯示方式 -> Developer / 開發人員選項 -> Allow JavaScript from Apple Events / 允許 Apple 事件的 JavaScript
```

Without that setting, Codex can see the logged-in page on screen but cannot reliably extract the full FB / Dcard article DOM or image URLs. The dedicated social-capture Chrome remains the lowest-friction automation path because it is launched with a fixed remote-debugging endpoint.

After that setting is enabled, the shortest route for the user's already-open normal Chrome is:

```bash
/bin/zsh scripts/codex_daily_start.sh --facebook-regular-current
/bin/zsh scripts/codex_daily_start.sh --dcard-regular-current
```

This reads the currently active Facebook or Dcard tab in the normal Chrome profile, writes `/private/tmp/drugnews-facebook-latest.json` or `/private/tmp/drugnews-dcard-latest.json`, imports fresh posts, and rebuilds the site when the current tab contains a readable long-form post. It is intended for the logged-in platform page or a single-post page already opened by the user.

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
4. Do not shorten the article into a summary. Preserve the Chinese article's argument sequence, section structure, company examples, risk layers, references, and disclaimer. The English version should read like a professional English business-analysis article, not a machine translation and not an executive summary.
5. For the newest English article, create at least four English article figures when the Chinese source has multiple social images or the topic is a full-length daily analysis. Preferred standard: GPT-generated BioRender-style 16:9 raster figures with short English labels, inspected manually for spelling and layout. If generated text is unreliable, generate a clean no-text background and add exact English labels programmatically.
6. Put the figures back into the article body by logic, not as a gallery at the end. The cover / OG image should be the best English figure, not a cropped Chinese social infographic.
7. Run the localization and completeness audits before deployment:

```bash
npm run audit:english-localization
npm run audit:english-completeness
```

`audit:english-completeness` checks the latest English article for minimum image count, non-summary length, heading parity with the Chinese source, and absence of Chinese/social-image reuse in English figures.

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

### Editorial Cover Visual System

Website covers are a brand surface, not just article decoration. New daily articles should use a consistent Drugnews editorial visual system across article cards, homepage cards, OG previews, and RSS thumbnails:

1. Generate a dedicated 16:9 or 1.91:1 landscape cover for the website. Do not reuse Facebook / Dcard body infographics, long social cards, screenshots, or text-heavy slides as covers.
2. Keep one premium research-media visual language across the same series: clean biotech-pharma editorial art, restrained labels, generous margins, soft depth, consistent lighting, and a polished white / neutral scientific background. Do not mix dashboard UI cards, cartoon icons, unrelated BioRender diagrams, and pitch-deck slides in the same article list.
3. Cover text must never be cropped. Prefer no headline text on the cover; if a label is needed, keep it short and inside a safe center area with at least 10% margin on every side.
4. Covers and body figures serve different jobs. Body figures can explain mechanisms or frameworks; covers should signal the article theme with premium visual quality and consistent composition.
5. Chinese and English covers must be localized separately. English article covers cannot reuse Chinese text graphics.
6. Before deployment, inspect the article card list and mobile layout: adjacent covers should feel like one Drugnews brand system, not unrelated one-off prompts.
7. Already published covers are not silently replaced. If a live cover looks weak, record it as a retrofitting candidate and change it only with explicit user approval.

Run the cover audit during daily QA:

```bash
npm run audit:cover-visual
```

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
