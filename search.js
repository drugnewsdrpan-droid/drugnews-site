(async function () {
  const input = document.querySelector("[data-search-input]");
  const list = document.querySelector("[data-search-results]");
  const status = document.querySelector("[data-search-status]");
  const clear = document.querySelector("[data-search-clear]");
  if (!input || !list) return;

  let records = [];
  try {
    const indexUrl = document.body.dataset.searchIndex || (location.pathname.includes("/articles/") ? "../search-index.json" : "search-index.json");
    const response = await fetch(indexUrl, { cache: "no-store" });
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

  const aliases = {
    "藥華藥": ["藥華藥", "6446", "PharmaEssentia", "BESREMi", "ropeginterferon", "P1101"],
    "6446": ["藥華藥", "6446", "PharmaEssentia", "BESREMi", "ropeginterferon", "P1101"],
    "中裕": ["中裕", "TMB-365", "TMB-380", "Trogarzo"],
    "逸達": ["逸達", "FP-001", "CAMCEVI", "leuprolide", "prostate cancer"],
    "NASP": ["NASP", "Sobi", "SEL-212", "pegadricase", "sirolimus", "痛風"],
    "GLP-1": ["GLP-1", "GLP 1", "glp1", "tirzepatide", "semaglutide", "dorzagliatin", "orforglipron", "retatrutide", "肥胖", "減重"]
  };

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

  function readerFacingText(value = "") {
    return String(value || "")
      .replaceAll("【限時免費－", "【")
      .replaceAll("【限時免費-", "【")
      .replaceAll("限時免費－", "限時活動－")
      .replaceAll("限時免費-", "限時活動-")
      .replaceAll("【付費深度商業分析文章系列】", "【深度商業分析系列】")
      .replaceAll("付費深度商業分析文章系列", "深度商業分析系列")
      .replaceAll("付費專欄", "深度分析")
      .replaceAll("付費文章", "深度分析")
      .replaceAll("免費文章", "商業分析文")
      .replaceAll("近期免費分析", "近期商業分析")
      .replaceAll("免費分析", "商業分析")
      .replaceAll("Paid Research", "In-depth Research")
      .replaceAll("Paid Article", "In-depth Analysis")
      .replaceAll("Free Article", "Business Analysis")
      .replaceAll("paid research", "in-depth research")
      .replaceAll("paid article", "in-depth article")
      .replaceAll("free article", "business analysis");
  }

  function categoryDisplay(category = "") {
    return readerFacingText(category);
  }

  function accessDisplay(access = "") {
    return {
      "免費文章": "商業分析文",
      "付費文章": "深度分析"
    }[access] || access || "商業分析文";
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u2010-\u2015－–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function isCjk(term) {
    return /[\u3400-\u9fff]/.test(term);
  }

  function tokenMatch(value, term) {
    const source = normalize(value);
    const needle = normalize(term);
    if (!needle) return false;
    if (isCjk(needle)) return source.includes(needle);
    const pattern = needle.split(/\s+/).map(escapeRegExp).join("[-\\s]?");
    return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(source);
  }

  function termsFor(query) {
    const trimmed = query.trim();
    return Array.from(new Set([trimmed, ...(aliases[trimmed] || [])].filter(Boolean)));
  }

  function scoreRecord(item, query) {
    const terms = termsFor(query);
    let score = 0;
    const directReasons = [];
    const mentionReasons = [];
    const title = item.title || "";
    const tags = (item.tags || []).join(" ");
    const summary = item.summary || "";
    const body = item.text || "";
    let directMatch = false;
    let mentionMatch = false;

    for (const term of terms) {
      if (tokenMatch(title, term)) {
        score += normalize(term) === normalize(query) ? 420 : 260;
        directMatch = true;
        directReasons.push(`標題命中 ${term}`);
      }
      if (tokenMatch(tags, term)) {
        score += normalize(term) === normalize(query) ? 180 : 70;
        directMatch = true;
        directReasons.push(`標籤命中 ${term}`);
      }
      if (tokenMatch(summary, term)) {
        score += 40;
        directMatch = true;
        directReasons.push(`摘要提到 ${term}`);
      }
      if (tokenMatch(body, term)) {
        score += 8;
        mentionMatch = true;
        if (mentionReasons.length < 3) mentionReasons.push(`正文提到 ${term}`);
      }
    }

    if (item.access === "免費文章") score += 4;
    if (item.category === "公司索引") score += 22;
    return {
      item,
      score,
      resultType: directMatch ? "direct" : mentionMatch ? "mention" : "none",
      reasons: Array.from(new Set(directMatch ? directReasons : mentionReasons)).slice(0, 4)
    };
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

  function renderIdle() {
    list.innerHTML = `<div class="search-idle">
      <p class="eyebrow">Start a search</p>
      <h3>輸入一家公司、一個資產，或一個你正在追的臨床問題。</h3>
      <p>例如藥華藥、6446、Trogarzo、KRAS G12C、PFS、BD 授權或 rNPV。</p>
    </div>`;
  }

  function syncQueryParam(query, mode = "replace") {
    const url = new URL(location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history[mode === "push" ? "pushState" : "replaceState"]({ query }, "", url);
  }

  function render(items, query = "") {
    if (query && !items.length) {
      list.innerHTML = noResultHtml(query);
      return;
    }
    list.innerHTML = items.map((item) => {
      const image = imageFor(item.image);
      const title = readerFacingText(item.title);
      return `
      <a class="article-card${image ? " with-image" : ""}${item.external ? " external-card" : ""}" href="${escapeHtml(hrefFor(item))}"${item.external ? ' target="_blank" rel="noopener"' : ""}>
        ${image ? `<div class="thumb-wrap"><img class="card-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(readerFacingText(item.imageAlt || title))}" loading="lazy"></div>` : ""}
        <div class="article-card-body">
          <div class="meta"><span>${escapeHtml(item.date)}</span><span>${escapeHtml(categoryDisplay(item.category))}</span><span>${escapeHtml(accessDisplay(item.access))}</span></div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="tag-row">${visibleTags(item.tags).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(readerFacingText(tag))}</span>`).join("")}</div>
        </div>
      </a>`;
    }).join("");
  }

  function resultCard({ item, reasons }, index) {
    const image = imageFor(item.image);
    const title = readerFacingText(item.title);
    return `
      <a class="article-card${image ? " with-image" : ""}${item.external ? " external-card" : ""}" href="${escapeHtml(hrefFor(item))}"${item.external ? ' target="_blank" rel="noopener"' : ""}>
        ${image ? `<div class="thumb-wrap"><img class="card-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(readerFacingText(item.imageAlt || title))}" loading="lazy"></div>` : ""}
        <div class="article-card-body">
          <div class="meta"><span>#${index + 1}</span><span>${escapeHtml(item.date)}</span><span>${escapeHtml(categoryDisplay(item.category))}</span><span>${escapeHtml(accessDisplay(item.access))}</span></div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="reason-row">${reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>
        </div>
      </a>`;
  }

  function renderSearchGroups(direct, mentions, query) {
    if (!direct.length && !mentions.length) {
      list.innerHTML = noResultHtml(query);
      return;
    }
    const directHtml = direct.length
      ? direct.map(resultCard).join("")
      : `<div class="search-empty"><h3>沒有直接相關結果</h3><p>我們不會用弱相關文章補滿直接結果。</p></div>`;
    const mentionHtml = mentions.length
      ? mentions.map(resultCard).join("")
      : `<div class="search-empty"><h3>沒有延伸提及</h3><p>目前沒有其他文章正文提到這個詞。</p></div>`;
    list.innerHTML = `<div class="search-result-groups">
      <section class="search-result-group"><h3>直接相關</h3>${directHtml}</section>
      <section class="search-result-group"><h3>延伸提及</h3>${mentionHtml}</section>
    </div>`;
  }

  function updateStatus(query, count, mentionCount = 0) {
    if (!status) return;
    if (!query) {
      status.textContent = "";
      status.hidden = true;
      return;
    }
    status.hidden = false;
    status.textContent = `搜尋「${query}」：直接相關 ${count} 筆，延伸提及 ${mentionCount} 筆`;
  }

  function applySearch(options = {}) {
    const q = input.value.trim();
    if (!q) {
      updateStatus("", 0);
      if (clear) clear.hidden = true;
      if (inArticlesPage()) {
        render(readerFirstSort(records));
      } else {
        renderIdle();
      }
      if (options.sync !== false) syncQueryParam("", options.historyMode);
      return;
    }
    const ranked = records
      .map((item) => scoreRecord(item, q))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || String(b.item.date).localeCompare(String(a.item.date)));
    const direct = ranked.filter((entry) => entry.resultType === "direct").slice(0, 8);
    const mentions = ranked.filter((entry) => entry.resultType === "mention").slice(0, 6);
    updateStatus(q, direct.length, mentions.length);
    if (clear) clear.hidden = !q;
    renderSearchGroups(direct, mentions, q);
    if (options.sync !== false) syncQueryParam(q, options.historyMode);
  }

  const initialQuery = new URLSearchParams(location.search).get("q");
  if (initialQuery) input.value = initialQuery;

  input.addEventListener("input", () => applySearch({ sync: false }));
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applySearch({ historyMode: "push" });
  });
  document.querySelector("[data-search-submit]")?.addEventListener("click", () => {
    applySearch({ historyMode: "push" });
  });
  clear?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    applySearch({ historyMode: "push" });
  });
  document.querySelectorAll("[data-query]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.query || "";
      input.focus();
      applySearch({ historyMode: "push" });
    });
  });

  window.addEventListener("popstate", () => {
    input.value = new URLSearchParams(location.search).get("q") || "";
    applySearch({ sync: false });
  });

  applySearch({ sync: false });
})();
