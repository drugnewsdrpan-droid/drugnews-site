// Match the final search-ready adapter's existing date/URL order. Its complete
// eligible catalog includes permanent articles outside the encrypted queue.
// Same-day ties follow the full publish timestamp (`publishedAt`, taken from
// the public feed.json) so the latest article of the day is the hero instead of
// the first URL alphabetically. The timestamp only counts when its Taipei
// calendar day matches the public `datePublished`; otherwise, and for rows
// without `publishedAt`, the previous URL tiebreak applies unchanged.
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

function publishedAtMs(row) {
  const ms = Date.parse(row.publishedAt || "");
  if (!Number.isFinite(ms)) return 0;
  const taipeiDay = new Date(ms + TAIPEI_OFFSET_MS).toISOString().slice(0, 10);
  return taipeiDay === String(row.datePublished || "").slice(0, 10) ? ms : 0;
}

export function chineseHomepageArticles(records) {
  return [...records].sort((a, b) =>
    Date.parse(b.datePublished) - Date.parse(a.datePublished)
    || publishedAtMs(b) - publishedAtMs(a)
    || a.url.localeCompare(b.url)).slice(0, 5);
}

// English discovery also contains guides; the English homepage only contains
// published internal articles, ordered exactly as build_english_site.mjs.
export function englishHomepageArticles(records) {
  return records.filter((item) => item.lang === "en" && !item.external && String(item.url).startsWith("articles/"))
    .sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt) || b.title.localeCompare(a.title, "en"))
    .slice(0, 5);
}
