(async function () {
  const input = document.querySelector("[data-search-input]");
  const list = document.querySelector("[data-search-results]");
  const status = document.querySelector("[data-search-status]");
  const clear = document.querySelector("[data-search-clear]");
  if (!input || !list) return;

  let records = [];
  try {
    const response = await fetch("../search-index.json", { cache: "no-store" });
    records = await response.json();
  } catch (error) {
    list.innerHTML = '<p class="notice">搜尋資料尚未載入，請稍後再試。</p>';
    return;
  }

  const popularTopics = [
    ["BD", "../topics/bd-licensing.html"],
    ["GLP-1", "../topics/glp1.html"],
    ["臨床數據", "../topics/clinical-data.html"],
    ["估值", "../topics/biotech-valuation.html"]
  ];

  function readerFirstRank(item) {
    if (item.access !== "免費文章") return 4;
    if (!item.external && /Dcard/i.test(item.source || "")) return 0;
    if (!item.external && /Facebook/i.test(item.source || "")) return 1;
    if (!item.external) return 2;
    return 3;
  }

  function readerFirstSort(items) {
    return [...items].sort((a, b) => {
      const bTime = new Date(b.publishAt || b.date).getTime();
      const aTime = new Date(a.publishAt || a.date).getTime();
      const time = bTime - aTime;
      if (time) return time;
      const rank = readerFirstRank(a) - readerFirstRank(b);
      if (rank) return rank;
      return b.title.localeCompare(a.title, "zh-Hant");
    });
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function visibleTags(tags = []) {
    return tags.filter((tag) => !/^(Dcard|Facebook|FB|方格子|免費文章|付費文章|商業分析系列|基本面系列|醫學大會|付費深度商業分析文章系列|製藥巨頭系列)$/i.test(tag));
  }

  function inArticlesPage() {
    return location.pathname.endsWith("/articles/") || location.pathname.endsWith("/articles/index.html");
  }

  function hrefFor(item) {
    if (item.external) return item.url;
    return inArticlesPage() ? item.url.replace(/^articles\//, "") : item.url;
  }

  function imageFor(image) {
    if (!image) return "";
    if (/^https?:\/\//i.test(image)) return image;
    return inArticlesPage() ? image : image.replace(/^\.\.\//, "");
  }

  function noResultHtml(query) {
    const links = popularTopics
      .map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
      .join("");
    return `<div class="search-empty">
      <h3>沒有找到「${escapeHtml(query)}」</h3>
      <p>可以先從這幾個常用入口找相關案例。</p>
      <div class="library-links">${links}</div>
    </div>`;
  }

  function syncQueryParam(query) {
    const url = new URL(location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url);
  }

  function render(items, query = "") {
    if (query && !items.length) {
      list.innerHTML = noResultHtml(query);
      return;
    }
    list.innerHTML = items.map((item) => {
      const image = imageFor(item.image);
      return `
      <a class="article-card${image ? " with-image" : ""}${item.external ? " external-card" : ""}" href="${escapeHtml(hrefFor(item))}"${item.external ? ' target="_blank" rel="noopener"' : ""}>
        ${image ? `<div class="thumb-wrap"><img class="card-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy"></div>` : ""}
        <div class="article-card-body">
          <div class="meta"><span>${escapeHtml(item.date)}</span><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.access || "免費文章")}</span></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="tag-row">${visibleTags(item.tags).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
      </a>`;
    }).join("");
  }

  function updateStatus(query, count) {
    if (!status) return;
    if (!query) {
      status.textContent = "";
      status.hidden = true;
      return;
    }
    status.hidden = false;
    status.textContent = `搜尋「${query}」：找到 ${count} 篇`;
  }

  function applySearch() {
    const q = input.value.trim();
    const query = q.toLowerCase();
    const filtered = query
      ? records.filter((item) => [
          item.title,
          item.summary,
          item.category,
          item.topic || "",
          (item.tags || []).join(" "),
          item.text
        ].join(" ").toLowerCase().includes(query))
      : readerFirstSort(records);
    updateStatus(q, filtered.length);
    if (clear) clear.hidden = !q;
    render(query ? filtered : readerFirstSort(records), q);
    syncQueryParam(q);
  }

  const initialQuery = new URLSearchParams(location.search).get("q");
  if (initialQuery) input.value = initialQuery;

  input.addEventListener("input", applySearch);
  clear?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    applySearch();
  });

  applySearch();
})();
