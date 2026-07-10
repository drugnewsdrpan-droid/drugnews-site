(() => {
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const search = document.getElementById("trialSearch");
  const areaFilter = document.getElementById("areaFilter");
  const phaseFilter = document.getElementById("phaseFilter");
  const resultFilter = document.getElementById("resultFilter");
  const resetButton = document.getElementById("resetFilters");
  const resultCount = document.getElementById("trialResultCount");
  const companyJump = document.getElementById("trialCompanyJump");
  const companyList = document.getElementById("trialCompanyList");
  const emptyState = document.getElementById("trialEmpty");
  let dataset = null;

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

  function render() {
    if (!dataset) return;
    const query = normalize(search.value);
    const area = areaFilter.value;
    const phase = phaseFilter.value;
    const result = resultFilter.value;
    const matchingCompanies = [];
    let matchingTrials = 0;

    dataset.companies.forEach((company) => {
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
    companyList.replaceChildren(...matchingCompanies.map(({ company, trials }) => createCompany(company, trials, dataset.asOf)));
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
    const areas = [...new Set(dataset.companies.flatMap((company) => company.therapeuticAreas))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    areas.forEach((area) => {
      const option = element("option", "", area);
      option.value = area;
      areaFilter.append(option);
    });
    const trialCount = dataset.companies.reduce((sum, company) => sum + company.trials.length, 0);
    document.getElementById("companyMetric").textContent = dataset.companies.length;
    document.getElementById("trialMetric").textContent = trialCount;
    document.getElementById("updatedMetric").textContent = dataset.asOf.slice(5).replace("-", ".");
  }

  [search, areaFilter, phaseFilter, resultFilter].forEach((control) => control.addEventListener(control === search ? "input" : "change", render));
  resetButton.addEventListener("click", () => {
    search.value = "";
    areaFilter.value = "all";
    phaseFilter.value = "all";
    resultFilter.value = "all";
    render();
    search.focus();
  });

  fetch("data/taiwan-biotech-clinical.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      dataset = data;
      populateFilters();
      render();
    })
    .catch(() => {
      resultCount.textContent = "資料載入失敗，請重新整理頁面。";
      emptyState.hidden = false;
      emptyState.querySelector("h2").textContent = "資料暫時無法載入";
      emptyState.querySelector("p").textContent = "資料檔暫時未讀取成功，請稍後重新整理。";
    });
})();
