# Drugnews GitHub Pages Site

This is a static GitHub Pages site for Drugnews. It is designed as a long-form article hub, while Facebook and Dcard remain distribution channels.

## Daily Publishing Workflow

For the daily Drugnews social update, start with:

```bash
/bin/zsh scripts/daily_social_update.sh
```

This checks both Facebook and Dcard capture files, imports fresh posts, rebuilds the article pages, search, feeds, English index, topic hubs, and analytics injection. If no capture file exists, it prints the exact minimum JSON shape needed for that platform.

For Facebook-only maintenance, use:

```bash
/bin/zsh scripts/daily_fb_update.sh
```

If `/private/tmp/drugnews-facebook-latest.json` exists, this imports new Facebook posts, rebuilds article pages, search, sitemap, feeds, English index, and topic hubs. If the JSON does not exist, the command prints the exact minimum capture format needed from the logged-in Facebook page. If npm is available, `npm run daily:fb` is equivalent.

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
