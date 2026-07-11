(() => {
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const search = document.getElementById("trialSearch");
  const areaFilter = document.getElementById("areaFilter");
  const phaseFilter = document.getElementById("phaseFilter");
  const resultFilter = document.getElementById("resultFilter");
  const marketFilter = document.getElementById("marketFilter");
  const evidenceFilter = document.getElementById("evidenceFilter");
  const resetButton = document.getElementById("resetFilters");
  const resetDirectoryButton = document.getElementById("resetDirectoryFilters");
  const resultCount = document.getElementById("trialResultCount");
  const sortLabel = document.getElementById("trialSortLabel");
  const companyJump = document.getElementById("trialCompanyJump");
  const companyJumpWrap = document.getElementById("trialCompanyJumpWrap");
  const companyDirectory = document.getElementById("companyDirectory");
  const companyList = document.getElementById("trialCompanyList");
  const loadMoreButton = document.getElementById("loadMoreCompanies");
  const emptyState = document.getElementById("trialEmpty");
  const modeButtons = [...document.querySelectorAll("[data-database-view]")];
  const filterPanels = [...document.querySelectorAll("[data-filter-panel]")];
  let clinicalDataset = null;
  let universeDataset = null;
  let currentView = "directory";
  let directoryLimit = 48;

  function updateHeader() {
    header?.classList.toggle("preview-condensed", window.scrollY > 20);
  }

  function syncMenuState() {
    navButton?.setAttribute("aria-expanded", String(Boolean(navToggle?.checked)));
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  navToggle?.addEventListener("change", syncMenuState);
  navButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navToggle.checked = !navToggle.checked;
    syncMenuState();
  });
  updateHeader();
  syncMenuState();

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = element("i");
    node.dataset.lucide = name;
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function fact(term, description) {
    const wrapper = element("div");
    const dt = element("dt", "", term);
    const dd = element("dd", "", description);
    wrapper.append(dt, dd);
    return wrapper;
  }

  function createDirectoryCard(company) {
    const article = element("article", "directory-company");
    const heading = element("div", "directory-company-heading");
    heading.append(
      element("span", "directory-ticker", company.ticker),
      element("span", `directory-market is-${company.marketCode.toLowerCase()}`, company.market)
    );
    const name = element("h2", "", company.company);
    const fullName = element("p", "directory-full-name", company.fullName);
    const meta = element("div", "directory-company-meta");
    if (company.listingDate) meta.append(element("span", "", `${company.market}日期 ${company.listingDate}`));
    if (company.hasClinicalEvidence) {
      const evidence = element("span", "is-verified", `${company.clinicalAssetCount} 筆臨床證據`);
      evidence.prepend(icon("badge-check"));
      meta.append(evidence);
    }
    if (company.relatedArticleCount) meta.append(element("span", "is-article", `${company.relatedArticleCount} 篇 Drugnews 分析`));

    const actions = element("div", "directory-company-actions");
    if (company.hasClinicalEvidence) {
      const detailButton = element("button", "directory-primary-action", "臨床與估值");
      detailButton.type = "button";
      detailButton.dataset.clinicalTicker = company.ticker;
      detailButton.append(icon("arrow-right"));
      actions.append(detailButton);
    }
    if (company.officialWebsite) {
      const website = element("a");
      website.href = company.officialWebsite;
      website.target = "_blank";
      website.rel = "noopener";
      website.className = "directory-website-action";
      website.title = `${company.company} 官方網站`;
      website.setAttribute("aria-label", `${company.company} 官方網站`);
      website.append(icon("external-link"));
      actions.append(website);
    }
    article.append(heading, name, fullName, meta, actions);
    return article;
  }

  function createCompany(company, trials, checkedDate) {
    const article = element("article", "trial-company");
    article.id = company.id;
    const headerNode = element("header", "trial-company-header");
    const ticker = element("span", "trial-ticker", company.ticker);
    const name = element("div", "trial-company-name");
    name.append(element("h2", "", company.company), element("p", "", `${company.companyEn} · ${company.market}`));
    const areas = element("div", "trial-areas");
    company.therapeuticAreas.forEach((area) => areas.append(element("span", "", area)));
    const status = element("span", "trial-status", trials.length > 1 ? `${trials.length} 筆資產` : trials[0].status);
    headerNode.append(ticker, name, areas, status);
    article.append(headerNode);

    trials.forEach((trial) => {
      const record = element("section", "trial-record");
      const titleRow = element("div", "trial-record-title");
      const titleCopy = element("div");
      titleCopy.append(element("h3", "", trial.asset), element("p", "", trial.indication));
      titleRow.append(titleCopy, element("span", "", `${trial.phase} · ${trial.resultStatus}`));

      const facts = element("dl", "trial-facts");
      facts.append(
        fact("目前進度", trial.status),
        fact("試驗設計", trial.design),
        fact("主要終點", trial.primaryEndpoint),
        fact("公開結果", trial.result),
        fact("終點類型", trial.endpointType),
        fact("資料日期", trial.sourceDate)
      );

      const lesson = element("div", "trial-lesson");
      const lessonTitle = element("strong");
      lessonTitle.append(icon("microscope"), document.createTextNode("投資人怎麼讀"));
      lesson.append(lessonTitle, element("p", "", trial.lesson));

      const source = element("div", "trial-source");
      const sourceLink = element("a");
      sourceLink.append(icon("external-link"), document.createTextNode(trial.sourceLabel));
      sourceLink.href = trial.sourceUrl;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener";
      source.append(sourceLink, element("span", "", `Drugnews 最後核對：${checkedDate}`));

      record.append(titleRow, facts, lesson, source);
      article.append(record);
    });

    const valuation = element("section", "trial-valuation");
    const valuationCopy = element("div", "trial-valuation-copy");
    valuationCopy.append(
      element("span", "trial-section-label", "估值接點"),
      element("h3", "", "這筆臨床資料改變了什麼假設？")
    );
    const valuationFacts = element("dl", "trial-valuation-facts");
    valuationFacts.append(
      fact("公司階段", company.valuationLens.stage),
      fact("重估問題", company.valuationLens.question),
      fact("下一批關鍵證據", company.valuationLens.nextEvidence)
    );
    valuationCopy.append(valuationFacts);

    const reading = element("div", "trial-reading");
    reading.append(element("span", "trial-section-label", "Drugnews 延伸分析"));
    if (company.relatedArticles.length) {
      const list = element("ul", "trial-reading-list");
      company.relatedArticles.forEach((item) => {
        const link = element("a");
        link.href = item.url;
        if (item.url.startsWith("http")) {
          link.target = "_blank";
          link.rel = "noopener";
        }
        const meta = element("span", "trial-reading-meta");
        meta.append(
          element("small", "", item.relation),
          element("em", item.access === "付費研究" ? "is-paid" : "", item.access)
        );
        const arrow = element("span", "trial-reading-arrow");
        arrow.append(document.createTextNode("前往閱讀"), icon(item.url.startsWith("http") ? "external-link" : "arrow-right"));
        link.append(meta, element("strong", "", item.title), arrow);
        const itemNode = element("li");
        itemNode.append(link);
        list.append(itemNode);
      });
      reading.append(list);
    } else {
      const gap = element("div", "trial-reading-gap");
      gap.append(
        element("strong", "", "尚無經編輯確認的公司估值專文"),
        element("p", "", "先用共同框架拆解成功率、市場與時間；不為了湊連結放入不相關文章。")
      );
      const guideLink = element("a");
      guideLink.append(icon("book-open"), document.createTextNode("開啟台灣生技估值框架"));
      guideLink.href = "../articles/2026-05-27-taiwan-biotech-valuation-framework.html";
      gap.append(guideLink);
      reading.append(gap);
    }
    valuation.append(valuationCopy, reading);
    article.append(valuation);
    return article;
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("zh-Hant").trim();
  }

  function trialSearchText(company, trial) {
    return normalize([
      company.ticker,
      company.company,
      company.companyEn,
      company.market,
      company.therapeuticAreas.join(" "),
      trial.asset,
      trial.indication,
      trial.phase,
      trial.status,
      trial.resultStatus,
      trial.design,
      trial.primaryEndpoint,
      trial.endpointType,
      trial.result,
      company.valuationLens?.stage,
      company.valuationLens?.question,
      company.valuationLens?.nextEvidence,
      company.relatedArticles?.map((article) => article.title).join(" ")
    ].join(" "));
  }

  function matchesPhase(value, selected) {
    if (selected === "all") return true;
    if (selected === "已核准") return value.includes("已核准");
    if (selected === "Phase I") return /Phase I(?!I)/.test(value);
    if (selected === "Phase II") return /Phase II(?!I)|\/\s*II(?!I)/.test(value);
    if (selected === "Phase III") return /Phase III|\/\s*III/.test(value);
    return false;
  }

  function directorySearchText(company) {
    const clinicalCompany = clinicalDataset.companies.find((item) => item.ticker === company.ticker);
    const clinicalText = clinicalCompany
      ? clinicalCompany.trials.map((trial) => trialSearchText(clinicalCompany, trial)).join(" ")
      : "";
    return normalize([
      company.ticker,
      company.company,
      company.fullName,
      company.market,
      company.marketCode,
      company.industry,
      clinicalText
    ].join(" "));
  }

  function renderDirectory() {
    if (!universeDataset || !clinicalDataset) return;
    const query = normalize(search.value);
    const market = marketFilter.value;
    const evidence = evidenceFilter.value;
    const matchingCompanies = universeDataset.companies.filter((company) => {
      const matchesQuery = !query || directorySearchText(company).includes(query);
      const matchesMarket = market === "all" || company.marketCode === market;
      const matchesEvidence = evidence === "all"
        || (evidence === "verified" && company.hasClinicalEvidence)
        || (evidence === "articles" && company.relatedArticleCount > 0);
      return matchesQuery && matchesMarket && matchesEvidence;
    });
    const visibleCompanies = matchingCompanies.slice(0, directoryLimit);
    companyDirectory.replaceChildren(...visibleCompanies.map(createDirectoryCard));
    resultCount.textContent = `找到 ${matchingCompanies.length} 家公司，目前顯示 ${visibleCompanies.length} 家`;
    loadMoreButton.hidden = visibleCompanies.length >= matchingCompanies.length;
    emptyState.hidden = matchingCompanies.length !== 0;
    window.lucide?.createIcons();
  }

  function render() {
    if (currentView === "directory") renderDirectory();
    else renderClinical();
  }

  function setView(view, preserveQuery = true) {
    currentView = view;
    directoryLimit = 48;
    if (!preserveQuery) search.value = "";
    modeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.databaseView === view)));
    filterPanels.forEach((panel) => { panel.hidden = panel.dataset.filterPanel !== view; });
    companyDirectory.hidden = view !== "directory";
    loadMoreButton.parentElement.hidden = view !== "directory";
    document.querySelector(".directory-source").hidden = view !== "directory";
    companyList.hidden = view !== "clinical";
    companyJumpWrap.hidden = view !== "clinical";
    sortLabel.textContent = view === "directory" ? "來源：官方生技醫療業公司清單" : "排序：股票代號";
    render();
  }

  function renderClinical() {
    if (!clinicalDataset) return;
    const query = normalize(search.value);
    const area = areaFilter.value;
    const phase = phaseFilter.value;
    const result = resultFilter.value;
    const matchingCompanies = [];
    let matchingTrials = 0;

    clinicalDataset.companies.forEach((company) => {
      const trials = company.trials.filter((trial) => {
        const matchesQuery = !query || trialSearchText(company, trial).includes(query);
        const matchesArea = area === "all" || company.therapeuticAreas.includes(area);
        const matchesSelectedPhase = matchesPhase(trial.phase, phase);
        const matchesResult = result === "all" || trial.resultStatus === result;
        return matchesQuery && matchesArea && matchesSelectedPhase && matchesResult;
      });
      if (trials.length) {
        matchingTrials += trials.length;
        matchingCompanies.push({ company, trials });
      }
    });

    matchingCompanies.sort((a, b) => Number(a.company.ticker) - Number(b.company.ticker));
    companyList.replaceChildren(...matchingCompanies.map(({ company, trials }) => createCompany(company, trials, clinicalDataset.asOf)));
    companyJump.replaceChildren(...matchingCompanies.map(({ company }) => {
      const link = element("a", "", `${company.ticker} ${company.company}`);
      link.href = `#${company.id}`;
      return link;
    }));
    resultCount.textContent = `顯示 ${matchingCompanies.length} 家公司、${matchingTrials} 筆臨床資產`;
    emptyState.hidden = matchingCompanies.length !== 0;
    window.lucide?.createIcons();
  }

  function populateFilters() {
    const areas = [...new Set(clinicalDataset.companies.flatMap((company) => company.therapeuticAreas))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    areas.forEach((area) => {
      const option = element("option", "", area);
      option.value = area;
      areaFilter.append(option);
    });
    const trialCount = clinicalDataset.companies.reduce((sum, company) => sum + company.trials.length, 0);
    document.getElementById("universeMetric").textContent = universeDataset.counts.total;
    document.getElementById("companyMetric").textContent = clinicalDataset.companies.length;
    document.getElementById("trialMetric").textContent = trialCount;
    document.getElementById("updatedMetric").textContent = universeDataset.asOf.slice(5).replace("-", ".");
    document.getElementById("directoryModeCount").textContent = universeDataset.counts.total;
    document.getElementById("clinicalModeCount").textContent = clinicalDataset.companies.length;
  }

  search.addEventListener("input", () => {
    directoryLimit = 48;
    render();
  });
  [areaFilter, phaseFilter, resultFilter, marketFilter, evidenceFilter].forEach((control) => control.addEventListener("change", () => {
    directoryLimit = 48;
    render();
  }));
  modeButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.databaseView)));
  resetButton.addEventListener("click", () => {
    search.value = "";
    areaFilter.value = "all";
    phaseFilter.value = "all";
    resultFilter.value = "all";
    render();
    search.focus();
  });
  resetDirectoryButton.addEventListener("click", () => {
    search.value = "";
    marketFilter.value = "all";
    evidenceFilter.value = "all";
    directoryLimit = 48;
    render();
    search.focus();
  });
  loadMoreButton.addEventListener("click", () => {
    directoryLimit += 48;
    renderDirectory();
  });
  companyDirectory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-clinical-ticker]");
    if (!button) return;
    search.value = button.dataset.clinicalTicker;
    setView("clinical");
    document.querySelector(".trial-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  Promise.all([
    fetch("data/taiwan-biotech-universe.json", { cache: "no-store" }),
    fetch("data/taiwan-biotech-clinical.json", { cache: "no-store" })
  ])
    .then(async ([universeResponse, clinicalResponse]) => {
      if (!universeResponse.ok) throw new Error(`Universe HTTP ${universeResponse.status}`);
      if (!clinicalResponse.ok) throw new Error(`Clinical HTTP ${clinicalResponse.status}`);
      return Promise.all([universeResponse.json(), clinicalResponse.json()]);
    })
    .then(([universe, clinical]) => {
      universeDataset = universe;
      clinicalDataset = clinical;
      populateFilters();
      setView("directory");
    })
    .catch(() => {
      resultCount.textContent = "資料載入失敗，請重新整理頁面。";
      emptyState.hidden = false;
      emptyState.querySelector("h2").textContent = "資料暫時無法載入";
      emptyState.querySelector("p").textContent = "資料檔暫時未讀取成功，請稍後重新整理。";
    });
})();
