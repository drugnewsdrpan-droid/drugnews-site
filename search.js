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
    const hrefFor = (item) => item.external ? item.url : (inArticles ? item.url.replace(/^articles\//, "") : item.url);
    const imageFor = (image) => {
      if (!image) return "";
      if (/^https?:\/\//i.test(image)) return image;
      return inArticles ? image : image.replace(/^\.\.\//, "");
    };
    list.innerHTML = items.map((item) => `
      <a class="article-card${imageFor(item.image) ? " with-image" : ""}${item.external ? " external-card" : ""}" href="${hrefFor(item)}"${item.external ? ' target="_blank" rel="noopener"' : ""}>
        ${imageFor(item.image) ? `<div class="thumb-wrap"><img class="card-thumb" src="${imageFor(item.image)}" alt="${item.imageAlt || item.title}" loading="lazy"></div>` : ""}
        <div class="article-card-body">
          <div class="meta"><span>${item.date}</span><span>${item.category}</span>${item.external ? `<span>${item.source}・${item.access}</span>` : ""}</div>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="tag-row">${item.tags.slice(0, 5).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        </div>
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
