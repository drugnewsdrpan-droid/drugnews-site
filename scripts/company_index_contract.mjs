export const ENTITY_GROUPS = [
  {
    title: "台灣與亞洲生技公司",
    description: "台股、亞洲新藥與平台型公司，適合追蹤基本面、臨床里程碑與資本市場重估。",
    entities: [
      ["藥華藥 PharmaEssentia", ["藥華藥", "PharmaEssentia", "Besremi", "6446"]],
      ["生華科 Senhwa", ["生華科", "Senhwa", "CX-5461", "Pidnarulex"]],
      ["寶泰生醫 Protect Biotech", ["寶泰生醫", "Protect Biotech", "Protect", "寵物醫療"]],
      ["台康生技 EirGenix", ["台康生技", "EirGenix", "CDMO", "Herwenda"]],
      ["安宏生醫 AnHorn", ["安宏生醫", "AnHorn", "AnHorn Medicines"]],
      ["智新生物 Intellegene", ["智新生物", "Intellegene"]],
      ["圓祥生技 Forward Therapeutics", ["圓祥", "Forward Therapeutics", "信達", "Innovent"]]
    ]
  },
  {
    title: "全球大型藥廠",
    description: "大型藥廠併購、授權與管線重組，是判讀 BD、估值與產業資本流向的核心。",
    entities: [
      ["Eli Lilly 禮來", ["Eli Lilly", "Lilly", "禮來", "Mounjaro", "Zepbound", "tirzepatide", "Retatrutide"]],
      ["Novo Nordisk 諾和諾德", ["Novo Nordisk", "諾和諾德", "Ozempic", "Wegovy", "semaglutide"]],
      ["Merck 默沙東", ["Merck", "默沙東", "Keytruda", "MK-2010"]],
      ["GSK", ["GSK", "Nuvalent", "肺癌"]],
      ["Pfizer 輝瑞", ["Pfizer", "輝瑞", "Vepdegestrant"]],
      ["Johnson & Johnson 嬌生", ["Johnson", "J&J", "嬌生", "Stelara", "CAR-T"]],
      ["BMS 百時美施貴寶", ["BMS", "百時美", "Bristol", "恒瑞"]],
      ["Roche 羅氏", ["Roche", "羅氏"]],
      ["AstraZeneca 阿斯特捷利康", ["AstraZeneca", "阿斯特捷利康"]],
      ["Daiichi Sankyo 第一三共", ["Daiichi", "第一三共", "ADC"]]
    ]
  },
  {
    title: "熱門管線與投資主題",
    description: "投資人常用來查找文章的疾病、靶點、技術與估值框架。",
    entities: [
      ["GLP-1 / 肥胖藥", ["GLP-1", "肥胖", "減重", "減肥藥", "瘦瘦針", "tirzepatide", "semaglutide"]],
      ["RAS / 胰臟癌", ["RAS", "KRAS", "胰臟癌", "daraxonrasib", "PRMT5", "MAT2A"]],
      ["AI 製藥", ["AI", "人工智慧", "AI 製藥", "PROTAC", "foundation model"]],
      ["ADC", ["ADC", "抗體藥物複合體", "Daiichi"]],
      ["CAR-T / 細胞治療", ["CAR-T", "細胞治療", "自體免疫"]],
      ["BD 授權交易", ["BD", "授權", "upfront", "milestone", "royalty", "併購", "收購"]],
      ["生技估值", ["估值", "rNPV", "SOTP", "峰值銷售", "管線估值"]],
      ["FDA / CRL / 法規", ["FDA", "CRL", "PDUFA", "法規", "藥證"]]
    ]
  }
];

function haystack(article) {
  return `${article.title || ""}\n${article.summary || ""}\n${(article.tags || []).join(" ")}\n${article.topic || ""}\n${article.category || ""}`;
}

export function matchCompanyArticles(articles, aliases) {
  const regexes = aliases.map((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isShortAscii = /^[A-Za-z0-9+-]{1,4}$/.test(alias);
    return new RegExp(isShortAscii ? `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)` : escaped, "i");
  });
  return articles
    .filter((article) => article.lang !== "en" && regexes.some((re) => re.test(haystack(article))))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title), "zh-Hant"))
    .slice(0, 6);
}

export function companyIndexArticlePaths(articles) {
  return new Set(ENTITY_GROUPS.flatMap((group) => group.entities.flatMap(([, aliases]) =>
    matchCompanyArticles(articles, aliases).map((article) => String(article.url || `articles/${article.fileName || ""}`).replace(/^https:\/\/drugnews\.com\.tw\//, ""))
  )));
}
