(async function () {
  const input = document.querySelector("[data-search-input]");
  const list = document.querySelector("[data-search-results]");
  if (!input || !list) return;

  let records = [];
  try {
    const response = await fetch("../search-index.json", { cache: "no-store" });
    records = await response.json();
  } catch (error) {
    list.innerHTML = '<p class="notice">搜尋資料尚未載入，請稍後再試。</p>';
    return;
  }

  function readerFirstRank(item) {
    if (item.access !== "免費文章") return 4;
    if (!item.external && /Dcard/i.test(item.source || "")) return 0;
    if (!item.external && /Facebook/i.test(item.source || "")) return 1;
    if (!item.external) return 2;
    return 3;
  }

  function readerFirstSort(items) {
    return [...items].sort((a, b) => {
      const rank = readerFirstRank(a) - readerFirstRank(b);
      if (rank) return rank;
      return new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date) || b.title.localeCompare(a.title, "zh-Hant");
    });
  }

  function render(items) {
    const inArticles = location.pathname.endsWith("/articles/") || location.pathname.endsWith("/articles/index.html");
    const hrefFor = (item) => item.external ? item.url : (inArticles ? item.url.replace(/^articles\//, "") : item.url);
    const visibleTags = (tags = []) => tags.filter((tag) => !/^(Dcard|Facebook|FB|方格子|免費文章|付費文章)$/i.test(tag));
    const imageFor = (image) => {
      if (!image) return "";
      if (/^https?:\/\//i.test(image)) return image;
      return inArticles ? image : image.replace(/^\.\.\//, "");
    };
    list.innerHTML = items.map((item) => `
      <a class="article-card${imageFor(item.image) ? " with-image" : ""}${item.external ? " external-card" : ""}" href="${hrefFor(item)}"${item.external ? ' target="_blank" rel="noopener"' : ""}>
        ${imageFor(item.image) ? `<div class="thumb-wrap"><img class="card-thumb" src="${imageFor(item.image)}" alt="${item.imageAlt || item.title}" loading="lazy"></div>` : ""}
        <div class="article-card-body">
          <div class="meta"><span>${item.date}</span><span>${item.category}</span><span>${item.access || "免費文章"}</span></div>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="tag-row">${visibleTags(item.tags).slice(0, 5).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        </div>
      </a>
    `).join("");
  }

  function applySearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) return render(readerFirstSort(records));
    render(records.filter((item) => [
      item.title,
      item.summary,
      item.category,
      item.topic || "",
      item.tags.join(" "),
      item.text
    ].join(" ").toLowerCase().includes(q)));
  }

  const initialQuery = new URLSearchParams(location.search).get("q");
  if (initialQuery) input.value = initialQuery;

  input.addEventListener("input", applySearch);

  applySearch();
})();
