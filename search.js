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

  function render(items) {
    const inArticles = location.pathname.endsWith("/articles/") || location.pathname.endsWith("/articles/index.html");
    const hrefFor = (url) => inArticles ? url.replace(/^articles\//, "") : url;
    list.innerHTML = items.map((item) => `
      <a class="article-card" href="${hrefFor(item.url)}">
        <div class="meta"><span>${item.date}</span><span>${item.category}</span></div>
        <h3>${item.title}</h3>
        <p>${item.summary}</p>
        <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      </a>
    `).join("");
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return render(records);
    render(records.filter((item) => [
      item.title,
      item.summary,
      item.category,
      item.tags.join(" "),
      item.text
    ].join(" ").toLowerCase().includes(q)));
  });

  render(records);
})();
