// Match the final search-ready adapter's existing date/URL order. Its complete
// eligible catalog includes permanent articles outside the encrypted queue.
export function chineseHomepageArticles(records) {
  return [...records].sort((a, b) => Date.parse(b.datePublished) - Date.parse(a.datePublished) || a.url.localeCompare(b.url)).slice(0, 5);
}

// English discovery also contains guides; the English homepage only contains
// published internal articles, ordered exactly as build_english_site.mjs.
export function englishHomepageArticles(records) {
  return records.filter((item) => item.lang === "en" && !item.external && String(item.url).startsWith("articles/"))
    .sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt) || b.title.localeCompare(a.title, "en"))
    .slice(0, 5);
}
