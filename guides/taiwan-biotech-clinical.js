(() => {
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const search = document.getElementById("trialSearch");
  const areaFilter = document.getElementById("areaFilter");
  const indicationFilter = document.getElementById("indicationFilter");
  const modalityFilter = document.getElementById("modalityFilter");
  const phaseFilter = document.getElementById("phaseFilter");
  const resultFilter = document.getElementById("resultFilter");
  const articleFilter = document.getElementById("articleFilter");
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
  let currentView = "clinical";
  let directoryLimit = 48;

  const evidenceRubric = {
    A: "核准基礎或完整樞紐資料可核對；研究設計另列，不代表一定是隨機對照",
    B: "正向 topline 或關鍵結果已公布，但細節、成熟度或外推仍需追蹤",
    C: "早期、單臂、探索性或 subgroup 訊號",
    D: "尚未讀出，主要看設計、進度與下一個催化事件"
  };

  const researchProfiles = {
    "4147": {
      companyType: "商業化感染症新藥公司",
      businessModel: "自有抗 HIV 資產與授權／區域商業化",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["感染", "HIV"],
      diseasePath: ["感染", "HIV", "多重抗藥性 HIV-1"],
      modality: "單株抗體",
      mechanism: "CD4 post-attachment inhibitor",
      trial: {
        verdict: "Trogarzo 的價值不在早期想像，而在已核准產品能否延長生命週期、擴大給藥便利性與區域市場。",
        maturity: "A",
        valuationVariables: ["peak sales", "權利經濟", "上市時間", "成本／現金需求"],
        keyRisks: ["給付", "適用族群", "競品", "區域銷售"],
        nextCatalyst: { event: "商業化進展與後續標籤／市場拓展", timing: "依公司公告", status: "追蹤中" },
        comparators: ["多重抗藥性 HIV salvage regimen", "其他後線 HIV 療法"],
        updateChange: "無變化：先作為已核准感染症產品的商業化基準案例。"
      }
    },
    "4162": {
      companyType: "腫瘤新藥開發公司",
      businessModel: "自有管線與授權合作",
      dataDepth: "部分核實",
      therapeuticAreas: ["腫瘤", "實體瘤"],
      diseasePath: ["腫瘤", "實體瘤", "晚期／轉移性實體瘤"],
      modality: "小分子／抗癌管線",
      mechanism: "依具體資產與試驗公告核對",
      trial: {
        verdict: "智擎的判讀重點不是『有腫瘤管線』，而是每個資產是否能在特定癌別、治療線別與合併策略中找到可商業化的位置。",
        maturity: "D",
        valuationVariables: ["PoS", "上市時間", "peak sales", "權利經濟"],
        keyRisks: ["終點", "競品", "授權權利", "試驗設計"],
        nextCatalyst: { event: "下一個臨床或授權進度更新", timing: "未知", status: "等待公司或登錄資料" },
        comparators: ["同癌別標準治療", "同機制競品", "合併治療方案"],
        updateChange: "新增：以未特定癌別的實體瘤管線示範如何避免硬塞疾病分類。"
      }
    },
    "4174": {
      companyType: "臨床期 ADC 新藥與平台公司",
      businessModel: "自有 ADC 資產、平台授權與國際合作",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["腫瘤", "實體瘤"],
      diseasePath: ["腫瘤", "實體瘤", "TROP2 陽性晚期實體瘤"],
      modality: "抗體藥物複合體 ADC",
      mechanism: "TROP2 ADC／GlycOBI 定點醣基接合平台",
      trial: {
        verdict: "浩鼎目前最重要的不是再多一個 ADC 故事，而是 OBI-902 能否在一期建立安全窗、RP2D 與可重複的早期療效，讓 GlycOBI 從平台敘事變成可授權的臨床資產。",
        maturity: "D",
        valuationVariables: ["PoS", "上市時間", "平台選擇權", "權利經濟", "成本／現金需求"],
        keyRisks: ["安全性", "劑量選擇", "TROP2 競爭", "平台轉譯", "募資"],
        nextCatalyst: { event: "OBI-902 Phase 1a 劑量遞增與初步臨床資料", timing: "公司目標 2027 上半年完成 Phase 1a", status: "招募中" },
        comparators: ["已上市 TROP2 ADC", "其他次世代 TROP2 ADC", "同類 TOP1 payload ADC"],
        updateChange: "新增：OBI-902 已進入美國與台灣 Phase 1/2；現階段只提高平台可驗證性，不預設臨床成功。"
      }
    },
    "4743": {
      companyType: "創新傷口照護／代謝併發症公司",
      businessModel: "自有產品、區域授權與商業化",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["代謝／內分泌", "傷口照護"],
      diseasePath: ["代謝／內分泌", "糖尿病併發症", "糖尿病足潰瘍"],
      modality: "外用新藥",
      mechanism: "調節發炎與傷口修復微環境",
      trial: {
        verdict: "ON101 要看的不是單一癒合率，而是能否在 DFU 標準照護、給付與地區商業化中證明可重複放大。",
        maturity: "B",
        valuationVariables: ["可治療人口", "peak sales", "上市時間", "給付／價格"],
        keyRisks: ["給付", "標準照護差異", "真實世界使用", "區域授權"],
        nextCatalyst: { event: "海外市場拓展與給付／銷售進展", timing: "依公司公告", status: "追蹤中" },
        comparators: ["標準傷口照護", "先進敷料", "負壓治療", "其他 DFU 輔助療法"],
        updateChange: "無變化：先作為糖尿病併發症與傷口照護交叉分類示範。"
      }
    },
    "6446": {
      companyType: "商業化血液疾病新藥公司",
      businessModel: "自有產品、全球法規與商業化",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["血液", "罕病"],
      diseasePath: ["血液", "骨髓增生性腫瘤 MPN", "原發性血小板增多症 ET"],
      modality: "長效干擾素",
      mechanism: "interferon alfa 訊號調節",
      trial: {
        verdict: "ET 資料若能轉成標籤與長期治療定位，改變的是可治療人口、產品生命週期與血液疾病平台敘事。",
        maturity: "B",
        valuationVariables: ["PoS", "可治療人口", "peak sales", "上市時間", "產品生命週期"],
        keyRisks: ["標籤", "給付", "長期安全性", "競品", "醫師採用"],
        nextCatalyst: { event: "ET 後續法規進度與完整資料揭露", timing: "依公司公告", status: "追蹤中" },
        comparators: ["hydroxyurea", "anagrelide", "既有 interferon 類療法"],
        updateChange: "新增：把 ET 從單一試驗結果連回可治療人口與產品生命週期。"
      }
    },
    "6535": {
      companyType: "神經／急重症新藥公司",
      businessModel: "自有臨床資產與授權合作",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["神經", "腦血管"],
      diseasePath: ["神經", "腦血管疾病", "急性缺血性中風"],
      modality: "胜肽／急性期治療",
      mechanism: "再灌流與神經保護相關機制，需依試驗設計核對",
      trial: {
        verdict: "急性中風資產最難的是把治療時間窗、標準治療差異與功能性終點同時說清楚；讀出前不應只看市場規模。",
        maturity: "D",
        valuationVariables: ["PoS", "上市時間", "可治療人口", "成本／現金需求"],
        keyRisks: ["時間窗", "對照組", "功能性終點", "收案速度", "安全性"],
        nextCatalyst: { event: "關鍵臨床資料讀出或試驗進度更新", timing: "未知", status: "等待公開資料" },
        comparators: ["血栓溶解治療", "機械取栓", "急性中風標準照護"],
        updateChange: "無變化：目前先按未讀出資產處理，不預設成功率提升。"
      }
    },
    "6550": {
      companyType: "腫瘤代謝新藥公司",
      businessModel: "自有管線與國際授權",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["腫瘤", "胸腔腫瘤"],
      diseasePath: ["腫瘤", "胸腔腫瘤", "非上皮型惡性胸膜間皮瘤"],
      modality: "腫瘤代謝療法",
      mechanism: "arginine deprivation / ADI-PEG20",
      trial: {
        verdict: "胸膜間皮瘤資料若成立，價值在於罕見但高度未滿足需求族群；但外推必須嚴格看 histology、OS 與安全性。",
        maturity: "B",
        valuationVariables: ["PoS", "可治療人口", "peak sales", "權利經濟"],
        keyRisks: ["OS 成熟度", "subgroup", "安全性", "標準治療變化"],
        nextCatalyst: { event: "完整臨床資料、法規互動或授權進展", timing: "依公司公告", status: "追蹤中" },
        comparators: ["免疫檢查點抑制劑", "化療", "同適應症後線療法"],
        updateChange: "新增：把資料判讀限定在非上皮型胸膜間皮瘤，不過度外推到全部實體瘤。"
      }
    },
    "6576": {
      companyType: "長效注射劑與內分泌新藥公司",
      businessModel: "特殊劑型平台與區域授權",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["代謝／內分泌", "兒童內分泌"],
      diseasePath: ["代謝／內分泌", "兒童內分泌", "中樞性性早熟 CPP"],
      modality: "長效 GnRH agonist",
      mechanism: "GnRH receptor 調節／抑制性腺軸",
      trial: {
        verdict: "CPP 資產的商業價值取決於長效劑型能否換到依從性、醫師採用與區域授權，而不是只看單一荷爾蒙指標。",
        maturity: "B",
        valuationVariables: ["peak sales", "上市時間", "權利經濟", "給付／價格"],
        keyRisks: ["單臂資料", "標籤", "兒科安全", "競品長效劑型"],
        nextCatalyst: { event: "法規審查、上市或授權進展", timing: "依公司公告", status: "追蹤中" },
        comparators: ["leuprolide depot", "其他 GnRH 長效製劑"],
        updateChange: "無變化：先作為兒童內分泌與長效劑型平台示範。"
      }
    },
    "6589": {
      companyType: "生物相似藥／CDMO 平台公司",
      businessModel: "biosimilar、CDMO 與授權合作",
      dataDepth: "Drugnews 編輯核實",
      therapeuticAreas: ["腫瘤", "乳癌"],
      diseasePath: ["腫瘤", "乳癌", "HER2+ 早期乳癌"],
      modality: "生物相似藥",
      mechanism: "trastuzumab biosimilar / HER2",
      trial: {
        verdict: "台康要看的不是創新藥勝率，而是相似性證據、製造品質、法規路徑與商業權利能否轉成穩定現金流。",
        maturity: "B",
        valuationVariables: ["上市時間", "peak sales", "權利經濟", "成本／現金需求"],
        keyRisks: ["CMC", "法規", "價格競爭", "合作夥伴銷售"],
        nextCatalyst: { event: "主要市場法規／商業化進展", timing: "依公司公告", status: "追蹤中" },
        comparators: ["原廠 trastuzumab", "其他 trastuzumab biosimilar"],
        updateChange: "新增：把生物相似藥從治療領域移到 modality 與商業模式。"
      }
    }
  };

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

  function chipList(items, className = "trial-chip-list") {
    const list = element("ul", className);
    (items || []).forEach((item) => {
      const li = element("li", "", item);
      list.append(li);
    });
    return list;
  }

  function formatCatalyst(catalyst) {
    if (!catalyst) return "未知，等待公司或登錄資料更新。";
    return `${catalyst.event || "下一個公開事件"}｜${catalyst.timing || "時間未知"}｜${catalyst.status || "追蹤中"}`;
  }

  function displayAccess(access) {
    if (/付費|深度/.test(access || "")) return "深度分析";
    if (/免費|全文/.test(access || "")) return "商業分析文";
    return access || "文章";
  }

  function createReadingSummary(company) {
    const block = element("div", "trial-reading-summary");
    block.append(element("span", "trial-section-label", "相關 Drugnews 分析"));
    if (!company.relatedArticles.length) {
      block.append(element("p", "trial-reading-empty", "目前尚無此公司／資產直接專文。"));
      const link = element("a");
      link.href = "../articles/2026-05-27-taiwan-biotech-valuation-framework.html";
      link.append(element("small", "", "方法延伸閱讀"), element("strong", "", "台灣生技估值第一步"));
      block.append(link);
      return block;
    }
    company.relatedArticles.slice(0, 2).forEach((item) => {
      const link = element("a");
      link.href = item.url;
      if (item.url.startsWith("http")) { link.target = "_blank"; link.rel = "noopener"; }
      link.append(element("small", "", item.relation || "相關分析"), element("strong", "", item.title));
      block.append(link);
    });
    return block;
  }

  function enrichClinicalDataset(dataset) {
    return {
      ...dataset,
      companies: dataset.companies.map((company) => {
        const profile = researchProfiles[company.ticker] || {};
        const enrichedTrials = company.trials.map((trial) => ({
          ...trial,
          drugnewsVerdict: profile.trial?.verdict || trial.lesson,
          evidenceMaturity: profile.trial?.maturity || "D",
          valuationVariables: profile.trial?.valuationVariables || [],
          keyRisks: profile.trial?.keyRisks || [],
          nextCatalyst: profile.trial?.nextCatalyst || null,
          comparators: profile.trial?.comparators || [],
          updateChange: profile.trial?.updateChange || "無變化。",
          diseasePath: profile.diseasePath || company.therapeuticAreas || [],
          modality: profile.modality || "待核實",
          mechanism: profile.mechanism || "待核實"
        }));
        return {
          ...company,
          companyType: profile.companyType || "尚未完成分類",
          businessModel: profile.businessModel || "尚未完成編輯核實",
          dataDepth: profile.dataDepth || (company.hasClinicalEvidence ? "部分核實" : "官方母表，尚未完成 Drugnews 編輯核實"),
          therapeuticAreas: profile.therapeuticAreas || company.therapeuticAreas,
          diseasePath: profile.diseasePath || company.therapeuticAreas,
          modality: profile.modality || "待核實",
          mechanism: profile.mechanism || "待核實",
          trials: enrichedTrials
        };
      })
    };
  }

  function enrichUniverseDataset(dataset) {
    return {
      ...dataset,
      companies: dataset.companies.map((company) => {
        const profile = researchProfiles[company.ticker] || {};
        return {
          ...company,
          companyType: profile.companyType || "公司類型待核實",
          businessModel: profile.businessModel || "主要業務待核實",
          dataDepth: profile.dataDepth || "官方母表，尚未完成 Drugnews 編輯核實",
          therapeuticAreas: profile.therapeuticAreas || [],
          diseasePath: profile.diseasePath || [],
          modality: profile.modality || "",
          mechanism: profile.mechanism || ""
        };
      })
    };
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
    const intelligence = element("div", "directory-intelligence");
    intelligence.append(
      element("span", "", company.companyType || "公司類型待核實"),
      element("span", "", company.businessModel || "主要業務待核實"),
      element("span", company.hasClinicalEvidence ? "is-verified" : "", company.dataDepth || "官方母表，尚未完成 Drugnews 編輯核實")
    );

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
    article.append(heading, name, fullName, meta, intelligence, actions);
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
    (company.diseasePath || company.therapeuticAreas).forEach((area) => areas.append(element("span", "", area)));
    const status = element("span", "trial-status", trials.length > 1 ? `${trials.length} 筆資產` : trials[0].status);
    headerNode.append(ticker, name, areas, status);
    article.append(headerNode);

    trials.forEach((trial) => {
      const record = element("section", "trial-record");
      const titleRow = element("div", "trial-record-title");
      const titleCopy = element("div");
      titleCopy.append(element("h3", "", trial.asset), element("p", "", trial.indication));
      titleRow.append(titleCopy, element("span", "", `${trial.phase} · ${trial.resultStatus}`));

      const verdict = element("div", "trial-verdict");
      verdict.append(
        element("span", "trial-section-label", "30 秒判斷"),
        element("p", "", trial.drugnewsVerdict || trial.lesson)
      );

      const intelligence = element("div", "trial-intelligence-grid");
      const maturity = element("section", "trial-intelligence-card");
      maturity.append(
        element("span", "trial-section-label", "證據成熟度"),
        element("strong", "", `${trial.evidenceMaturity || "D"}｜${evidenceRubric[trial.evidenceMaturity] || evidenceRubric.D}`),
        element("p", "trial-design-summary", `研究設計：${summarizeDesign(trial.design)}`)
      );
      const variables = element("section", "trial-intelligence-card");
      variables.append(element("span", "trial-section-label", "這次改變的估值變數"), chipList(trial.valuationVariables));
      const risks = element("section", "trial-intelligence-card");
      risks.append(element("span", "trial-section-label", "關鍵風險"), chipList(trial.keyRisks));
      const catalyst = element("section", "trial-intelligence-card");
      catalyst.append(element("span", "trial-section-label", "下一個催化事件"), element("p", "", formatCatalyst(trial.nextCatalyst)));
      intelligence.append(maturity, variables, risks, catalyst);

      const facts = element("dl", "trial-facts");
      facts.append(
        fact("疾病分類", (trial.diseasePath || []).join(" > ")),
        fact("Modality", trial.modality),
        fact("Target / mechanism", trial.mechanism),
        fact("目前進度", trial.status),
        fact("試驗設計", trial.design),
        fact("主要終點", trial.primaryEndpoint),
        fact("公開結果", trial.result),
        fact("終點類型", trial.endpointType),
        fact("資料日期", trial.sourceDate)
      );

      const lesson = element("div", "trial-lesson");
      const lessonTitle = element("strong");
      lessonTitle.append(icon("microscope"), document.createTextNode("比較基準"));
      lesson.append(lessonTitle, element("p", "", trial.lesson));

      const comparator = element("div", "trial-comparator");
      comparator.append(
        element("strong", "", "競爭／標準治療 read-through"),
        chipList(trial.comparators, "trial-chip-list is-compact"),
        element("p", "", `上次更新後改變：${trial.updateChange}`)
      );

      const source = element("div", "trial-source");
      const sourceLink = element("a");
      sourceLink.append(icon("external-link"), document.createTextNode(trial.sourceLabel));
      sourceLink.href = trial.sourceUrl;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener";
      source.append(sourceLink, element("span", "", `Drugnews 最後核對：${checkedDate}`));

      const detail = element("details", "trial-record-detail");
      detail.append(element("summary", "", "展開臨床設計、比較基準與來源"), facts, lesson, comparator, source);
      record.append(titleRow, verdict, intelligence, createReadingSummary(company), detail);
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
          element("em", /付費|深度/.test(item.access || "") ? "is-paid" : "", displayAccess(item.access))
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
    const valuationDetail = element("details", "trial-valuation-detail");
    valuationDetail.append(element("summary", "", "展開完整估值接點與全部文章"), valuation);
    article.append(valuationDetail);
    return article;
  }

  function summarizeDesign(design) {
    if (/隨機.*雙盲|雙盲.*隨機/.test(design)) return "隨機、雙盲、對照";
    if (/劑量遞增/.test(design) && /隨機.*劑量/.test(design)) return "早期劑量遞增；後續隨機劑量最佳化";
    if (/3\+3|劑量遞增|加速滴定/.test(design)) return "早期劑量遞增";
    if (/隨機/.test(design)) return "隨機對照";
    if (/單臂/.test(design)) return "單臂（無隨機對照）";
    if (/探索性/.test(design)) return "探索性試驗";
    return "依原始試驗登錄";
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("zh-Hant").trim();
  }

  const exactSearchTokens = new Set(["os", "pfs", "orr", "hr", "dcr", "ae", "sae", "dlt", "cmc", "et", "cpp", "hiv"]);
  function searchMatches(text, query, exactText = text) {
    if (!query) return true;
    if (exactSearchTokens.has(query) || /^\d{4}$/.test(query)) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(exactText);
    }
    return text.includes(query);
  }

  function trialExactTokenText(company, trial) {
    return normalize([
      company.ticker,
      company.company,
      company.companyEn,
      trial.asset,
      trial.indication,
      trial.phase,
      trial.status,
      trial.resultStatus,
      trial.design,
      trial.primaryEndpoint,
      trial.endpointType,
      trial.result,
      trial.diseasePath?.join(" "),
      trial.modality,
      trial.mechanism
    ].join(" "));
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
      trial.drugnewsVerdict,
      trial.evidenceMaturity,
      trial.valuationVariables?.join(" "),
      trial.keyRisks?.join(" "),
      trial.comparators?.join(" "),
      trial.diseasePath?.join(" "),
      trial.modality,
      trial.mechanism,
      trial.nextCatalyst?.event,
      trial.nextCatalyst?.timing,
      trial.updateChange,
      company.valuationLens?.stage,
      company.valuationLens?.question,
      company.valuationLens?.nextEvidence
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
      company.companyType,
      company.businessModel,
      company.dataDepth,
      company.therapeuticAreas?.join(" "),
      company.diseasePath?.join(" "),
      company.modality,
      company.mechanism,
      clinicalText
    ].join(" "));
  }

  function renderDirectory() {
    if (!universeDataset || !clinicalDataset) return;
    const query = normalize(search.value);
    const market = marketFilter.value;
    const evidence = evidenceFilter.value;
    const matchingCompanies = universeDataset.companies.filter((company) => {
      const matchesQuery = searchMatches(directorySearchText(company), query);
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
    const indication = indicationFilter.value;
    const modality = modalityFilter.value;
    const phase = phaseFilter.value;
    const result = resultFilter.value;
    const articleState = articleFilter.value;
    const matchingCompanies = [];
    let matchingTrials = 0;

    clinicalDataset.companies.forEach((company) => {
      const trials = company.trials.filter((trial) => {
        const matchesQuery = searchMatches(
          trialSearchText(company, trial),
          query,
          trialExactTokenText(company, trial)
        );
        const path = trial.diseasePath || company.diseasePath || [];
        const matchesArea = area === "all" || path[0] === area;
        const matchesIndication = indication === "all" || path.slice(1).includes(indication);
        const matchesModality = modality === "all" || trial.modality === modality;
        const matchesSelectedPhase = matchesPhase(trial.phase, phase);
        const matchesResult = result === "all" || trial.resultStatus === result;
        const matchesArticle = articleState === "all" || company.relatedArticles.length > 0;
        return matchesQuery && matchesArea && matchesIndication && matchesModality && matchesSelectedPhase && matchesResult && matchesArticle;
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
    const allTrials = clinicalDataset.companies.flatMap((company) => company.trials);
    const areas = [...new Set(allTrials.map((trial) => trial.diseasePath?.[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    areas.forEach((area) => {
      const option = element("option", "", area);
      option.value = area;
      areaFilter.append(option);
    });
    refreshIndicationFilter();
    const modalities = [...new Set(allTrials.map((trial) => trial.modality).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    modalities.forEach((modality) => {
      const option = element("option", "", modality);
      option.value = modality;
      modalityFilter.append(option);
    });
    const trialCount = clinicalDataset.companies.reduce((sum, company) => sum + company.trials.length, 0);
    document.getElementById("universeMetric").textContent = universeDataset.counts.total;
    document.getElementById("companyMetric").textContent = clinicalDataset.companies.length;
    document.getElementById("trialMetric").textContent = trialCount;
    const latestAsOf = [universeDataset.asOf, clinicalDataset.asOf].sort().at(-1);
    document.getElementById("updatedMetric").textContent = latestAsOf.slice(5).replace("-", ".");
    document.getElementById("directoryModeCount").textContent = universeDataset.counts.total;
    document.getElementById("clinicalModeCount").textContent = clinicalDataset.companies.length;
  }

  function refreshIndicationFilter() {
    const selected = indicationFilter.value;
    const area = areaFilter.value;
    const trials = clinicalDataset.companies.flatMap((company) => company.trials)
      .filter((trial) => area === "all" || trial.diseasePath?.[0] === area);
    const indications = [...new Set(trials.flatMap((trial) => (trial.diseasePath || []).slice(1)))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    indicationFilter.replaceChildren(new Option("全部疾病", "all"), ...indications.map((value) => new Option(value, value)));
    indicationFilter.value = indications.includes(selected) ? selected : "all";
  }

  function syncFilterUrl() {
    const url = new URL(location.href);
    url.hash = "";
    const values = {
      view: currentView,
      q: search.value.trim(),
      area: areaFilter.value,
      disease: indicationFilter.value,
      modality: modalityFilter.value,
      phase: phaseFilter.value,
      result: resultFilter.value
      ,articles: articleFilter.value
    };
    Object.entries(values).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "view" && value === "clinical")) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    history.replaceState(values, "", url);
  }

  function restoreFilterUrl() {
    const params = new URLSearchParams(location.search);
    search.value = params.get("q") || "";
    areaFilter.value = params.get("area") || "all";
    refreshIndicationFilter();
    indicationFilter.value = params.get("disease") || "all";
    modalityFilter.value = params.get("modality") || "all";
    phaseFilter.value = params.get("phase") || "all";
    resultFilter.value = params.get("result") || "all";
    articleFilter.value = params.get("articles") || "all";
    setView(params.get("view") === "directory" ? "directory" : "clinical");
  }

  search.addEventListener("input", () => {
    directoryLimit = 48;
    render();
    syncFilterUrl();
  });
  areaFilter.addEventListener("change", refreshIndicationFilter);
  [areaFilter, indicationFilter, modalityFilter, phaseFilter, resultFilter, articleFilter, marketFilter, evidenceFilter].forEach((control) => control.addEventListener("change", () => {
    directoryLimit = 48;
    render();
    syncFilterUrl();
  }));
  modeButtons.forEach((button) => button.addEventListener("click", () => { setView(button.dataset.databaseView); syncFilterUrl(); }));
  resetButton.addEventListener("click", () => {
    search.value = "";
    areaFilter.value = "all";
    indicationFilter.value = "all";
    modalityFilter.value = "all";
    phaseFilter.value = "all";
    resultFilter.value = "all";
    articleFilter.value = "all";
    render();
    syncFilterUrl();
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
  window.addEventListener("popstate", restoreFilterUrl);
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
      universeDataset = enrichUniverseDataset(universe);
      clinicalDataset = enrichClinicalDataset(clinical);
      populateFilters();
      restoreFilterUrl();
    })
    .catch(() => {
      resultCount.textContent = "資料載入失敗，請重新整理頁面。";
      emptyState.hidden = false;
      emptyState.querySelector("h2").textContent = "資料暫時無法載入";
      emptyState.querySelector("p").textContent = "資料檔暫時未讀取成功，請稍後重新整理。";
    });
})();
