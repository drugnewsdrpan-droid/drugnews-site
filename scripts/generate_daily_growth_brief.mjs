import fsp from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const STATUS_FILE = process.env.DRUGNEWS_DAILY_STATUS_FILE || "/private/tmp/drugnews-codex-daily-status.json";
const OUT_JSON = process.env.DRUGNEWS_GROWTH_BRIEF_JSON || "/private/tmp/drugnews-growth-brief.json";
const OUT_MD = process.env.DRUGNEWS_GROWTH_BRIEF_MD || "/private/tmp/drugnews-growth-brief.md";

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function absoluteUrl(url = "") {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}/${String(url).replace(/^\/+/, "")}`;
}

function latestChineseArticle(records = []) {
  return [...records]
    .filter((item) => item && !item.external && item.fileName && /^zh/i.test(item.lang || "zh"))
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))[0] || null;
}

function cleanTag(tag = "") {
  return String(tag)
    .replace(/^(商業分析系列|免費文章|付費文章)$/u, "")
    .trim();
}

function uniq(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function extractTitleTerms(title = "") {
  const value = String(title);
  const ascii = [...value.matchAll(/[A-Za-z][A-Za-z0-9+-]{1,}/g)].map((match) => match[0]);
  const chinese = [...value.matchAll(/[\u4e00-\u9fff]{2,8}/g)].map((match) => match[0]);
  return [...ascii, ...chinese]
    .filter((term) => !/^(Drugnews)$/i.test(term))
    .filter((term) => !/^(正在|從監管端|正在從監管端亮起|風向變了|只差臨門一腳|終於要來了嗎)$/u.test(term))
    .slice(0, 10);
}

function keywordsFor(article) {
  const tags = (article.tags || []).map(cleanTag).filter(Boolean);
  const terms = extractTitleTerms(article.title);
  const text = `${article.title}\n${article.summary || ""}\n${(article.tags || []).join(" ")}`;
  const intent = [
    [/FDA|CRL|BLA|NDA|PDUFA/i, "FDA 審查風向"],
    [/XBI/i, "XBI"],
    [/Biotech|生技/i, "Biotech"],
    [/XBI|Biotech|資本市場|生技投資/i, "生技投資"],
    [/RAS|KRAS|PRMT5|MAT2A|胰臟癌/i, "腫瘤精準治療"],
    [/GLP-1|Tirzepatide|肥胖|減重/i, "GLP-1 投資"],
    [/BD|授權|併購|M&A|upfront|milestone/i, "生技 BD 授權"],
    [/CMC|製造|產能|CDMO/i, "CMC 風險"]
  ]
    .filter(([re]) => re.test(text))
    .map(([, keyword]) => keyword);
  return uniq([...terms, ...tags, ...intent]).slice(0, 14);
}

function relatedArticles(records, article, limit = 5) {
  const sourceTags = new Set((article.tags || []).map(cleanTag).filter(Boolean));
  return records
    .filter((item) => item.fileName && item.url !== article.url && !item.external)
    .map((item) => {
      const tags = (item.tags || []).map(cleanTag).filter(Boolean);
      const shared = tags.filter((tag) => sourceTags.has(tag));
      const sameCategory = item.category && item.category === article.category ? 1 : 0;
      const sameAccess = item.access && item.access === article.access ? 0.25 : 0;
      const recency = Math.max(0, 1 - Math.abs(new Date(article.date) - new Date(item.date)) / 1000 / 86400 / 45);
      return {
        title: item.title,
        date: item.date,
        url: absoluteUrl(item.url),
        tags: shared,
        score: shared.length * 3 + sameCategory + sameAccess + recency
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);
}

function submissionUrls(article) {
  const urls = [
    absoluteUrl(article.url),
    article.translations?.en ? `${BASE_URL}/articles/${article.translations.en}` : "",
    `${BASE_URL}/feed.xml`,
    `${BASE_URL}/feed.json`,
    `${BASE_URL}/news-sitemap.xml`,
    `${BASE_URL}/sitemap.xml`,
    `${BASE_URL}/ai-index.json`,
    `${BASE_URL}/market-radar.html`
  ];
  return uniq(urls);
}

function socialDrafts(article, keywords) {
  const url = absoluteUrl(article.url);
  const hook = cleanSnippet(article);
  const keywordLine = keywords.slice(0, 5).join("、");
  return {
    facebook: `${article.title}\n\n${hook}\n\n這篇重點不是新聞本身，而是它如何改變臨床、BD 與資本市場的判斷。\n\n閱讀全文：${url}`,
    dcard: `${article.title}\n\n這篇用比較好讀的方式拆：\n\n1. 事件真正代表什麼\n2. 對公司估值或產業競爭的影響\n3. 投資人應該追蹤哪些後續訊號\n\n關鍵字：${keywordLine}\n\n全文：${url}`,
    cmoney: `${article.title}｜${keywordLine}\n\n藥時事今天整理：${hook}\n\n全文：${url}`,
    linkedin: `${article.title}\n\nDrugnews breaks down why this matters for biotech investors, BD teams, and capital-market storytelling.\n\nRead: ${url}`
  };
}

function cleanSnippet(article) {
  const source = String(article.summary || "").trim();
  if (source && /[。！？.!?]$/.test(source)) return source;
  const text = String(article.text || "")
    .replace(article.title || "", "")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = text.match(/^(.{40,220}?[。！？.!?])/u)?.[1];
  if (sentence) return sentence;
  return source.replace(/[，,、而與和及]$/u, "") || article.title;
}

function markdown(brief) {
  const related = brief.internal_link_opportunities.length
    ? brief.internal_link_opportunities.map((item) => `- ${item.title}：${item.url}`).join("\n")
    : "- 暫無足夠相關文章";
  const urls = brief.search_submission_urls.map((url) => `- ${url}`).join("\n");
  const keywords = brief.target_keywords.map((keyword) => `- ${keyword}`).join("\n");
  return `# Drugnews 每日搜尋曝光行動清單

時間：${new Date(brief.generated_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}

## 今日主推文章

- ${brief.latest_article.date}｜${brief.latest_article.title}
- ${brief.latest_article.url}

## 搜尋關鍵字

${keywords}

## Search Console / AI 索引優先檢查 URL

${urls}

## 內鏈機會

${related}

## 社群導流草稿

### Facebook

${brief.social_drafts.facebook}

### Dcard

${brief.social_drafts.dcard}

### 股市爆料同學會

${brief.social_drafts.cmoney}

## 轉換 CTA

- 讀者：引導追蹤 Facebook、Dcard、股市爆料同學會，並訂閱方格子付費專欄。
- 公司客戶：若文章涉及公司策略、BD、臨床數據或資本市場敘事，可導向公司合作頁，主打「把科學與商業判斷翻譯成投資人聽得懂的故事」。
- 國際曝光：英文版文章放入搜尋提交清單，優先把英文站品質做好，再視內容量決定是否重新開放其他語言入口。
`;
}

async function main() {
  const records = await readJson(SEARCH_INDEX, []);
  const status = await readJson(STATUS_FILE, {});
  const latest = latestChineseArticle(records);
  if (!latest) throw new Error("No latest Chinese article found in search-index.json");
  const keywords = keywordsFor(latest);
  const brief = {
    generated_at: new Date().toISOString(),
    daily_status: status.status || "unknown",
    latest_article: {
      title: latest.title,
      date: latest.date,
      url: absoluteUrl(latest.url),
      category: latest.category,
      access: latest.access,
      source: latest.source,
      translations: latest.translations || {}
    },
    target_keywords: keywords,
    search_submission_urls: submissionUrls(latest),
    internal_link_opportunities: relatedArticles(records, latest),
    social_drafts: socialDrafts(latest, keywords)
  };

  await fsp.writeFile(OUT_JSON, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  await fsp.writeFile(OUT_MD, markdown(brief), "utf8");
  console.log(JSON.stringify({
    status: "ok",
    latest_article: brief.latest_article.title,
    keywords: brief.target_keywords.slice(0, 8),
    internal_links: brief.internal_link_opportunities.length,
    json: OUT_JSON,
    markdown: OUT_MD
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
