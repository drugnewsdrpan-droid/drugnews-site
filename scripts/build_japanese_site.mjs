import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const JA = path.join(ROOT, "ja");
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const SITEMAP = path.join(ROOT, "sitemap.xml");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("&#39;", "&apos;");
}

async function writeAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await fs.writeFile(temp, content, "utf8");
  await fs.rename(temp, filePath);
}

async function readRecords() {
  const records = JSON.parse(await fs.readFile(SEARCH_INDEX, "utf8"));
  return records
    .filter((item) => !item.external && item.lang !== "en")
    .sort((a, b) => String(b.publishAt || b.date).localeCompare(String(a.publishAt || a.date)));
}

function latestDate(records) {
  return records.map((item) => item.date).filter(Boolean).sort().at(-1) || "";
}

function jpCategory(category = "") {
  const map = new Map([
    ["商業分析系列", "ビジネス分析"],
    ["基本面系列", "ファンダメンタルズ"],
    ["醫學大會", "医学会議"],
    ["付費深度商業分析文章系列", "有料ディープリサーチ"],
    ["製藥巨頭系列", "大手製薬シリーズ"],
    ["公司研究", "企業分析"],
    ["生技估值", "バイオ企業評価"],
    ["IR 與資本市場", "IR・資本市場"]
  ]);
  return map.get(category) || "バイオビジネス分析";
}

const japaneseCopy = new Map(Object.entries({
  "fda-regulatory-shift-biotech-rebound": {
    title: "FDAの風向きが変わる：Biotech反攻のシグナルは規制当局側から点灯している",
    summary: "XBIの反発は単なるリスクオンではありません。FDAの審査姿勢、CRL後の再評価、規制リスクの見直しが、中小型Biotechの資本市場ストーリーを変え始めています。",
    tags: ["FDA", "Biotech", "規制", "資本市場"]
  },
  "pancreatic-cancer-ras-prmt5-mat2a-combination": {
    title: "膵臓がんの次の焦点：RAS阻害後、PRMT5/MAT2A併用療法が想像力を広げる",
    summary: "膵臓がん市場では、RAS阻害剤を治療骨格として使い、PRMT5/MAT2Aの合成致死アプローチをどう組み合わせるかが新しい評価軸になりつつあります。",
    tags: ["膵臓がん", "RAS", "PRMT5", "臨床"]
  },
  "tirzepatide-autoimmune-immunometabolism": {
    title: "Tirzepatideは自己免疫疾患へ進むのか：Lillyが狙う免疫代謝の拡張戦略",
    summary: "Zepboundを単なる肥満薬ではなく、乾癬、関節炎、IBDなど慢性炎症疾患の治療文脈に接続できるか。Lillyの次の価値仮説は免疫代謝にあります。",
    tags: ["GLP-1", "Tirzepatide", "免疫代謝", "Lilly"]
  },
  "protect-pet-medical-roche-platform": {
    title: "「ペット医療界のRoche」へ：台湾Protect Biotechのプラットフォーム仮説",
    summary: "ペットの高齢化により、がん、心疾患、自己免疫疾患など重症治療への需要が拡大しています。Protect Biotechの価値は単一製品ではなく、診断・治療・データをつなぐプラットフォームにあります。",
    tags: ["ペット医療", "Protect", "台湾バイオ", "プラットフォーム"]
  },
  "ai-zasocitinib-sotyktu": {
    title: "AI創薬の第一号は来るのか：Takeda ZasocitinibがSotyktuに直接対決で勝利",
    summary: "Zasocitinibの意義は「AIで作った」という物語だけではありません。乾癬市場でSotyktuを上回り、経口TYK2薬が生物製剤の壁にどう挑むかが焦点です。",
    tags: ["AI創薬", "Takeda", "TYK2", "乾癬"]
  },
  "obesity-drug-third-place-competition": {
    title: "肥満薬の第3勢力争い：LillyとNovo Nordiskの次に来る代謝メガプレイヤーは誰か",
    summary: "GLP-1市場は二強だけで終わりません。次世代経口薬、併用療法、差別化された代謝プロファイルを持つ企業が、第三の巨頭候補として浮上しています。",
    tags: ["GLP-1", "肥満薬", "代謝", "競争"]
  }
}));

function localizeArticle(item) {
  const copy = japaneseCopy.get(item.slug);
  if (!copy) return item;
  return {
    ...item,
    title: copy.title,
    summary: copy.summary,
    tags: copy.tags
  };
}

function articleCard(item) {
  const localized = localizeArticle(item);
  const tags = (localized.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `<a class="article-card" href="../${escapeHtml(item.url)}">
    <div class="article-card-body">
      <div class="meta"><span>${escapeHtml(item.date)}</span><span>${escapeHtml(jpCategory(item.category))}</span></div>
      <h3>${escapeHtml(localized.title)}</h3>
      <p>${escapeHtml(localized.summary || "")}</p>
      <div class="tag-row">${tags}</div>
    </div>
  </a>`;
}

function page(records) {
  const latest = records.slice(0, 6);
  const itemList = latest.map((item, index) => {
    const localized = localizeArticle(item);
    return {
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/${item.url}`,
      name: localized.title
    };
  });
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Drugnews｜藥時事",
        alternateName: ["Drugnews", "藥時事", "台湾バイオビジネス分析メディア"],
        url: `${BASE_URL}/`,
        logo: `${BASE_URL}/favicon.svg`,
        description: "Drugnewsは台湾のバイオテック、製薬、臨床データ、ライセンス取引、企業価値評価、資本市場シグナルを分析するメディアです。",
        sameAs: [
          "https://www.facebook.com/profile.php?id=61568446257142",
          "https://www.dcard.tw/@drugnews",
          "https://vocus.cc/user/@Drugnews",
          "https://www.cmoney.tw/app/expert/drugnews?ca=1",
          "https://www.instagram.com/drugnews.com.tw/"
        ]
      },
      {
        "@type": "WebPage",
        name: "Drugnews 日本語｜台湾バイオ・製薬ビジネス分析",
        url: `${BASE_URL}/ja/`,
        inLanguage: "ja-JP",
        description: "日本の投資家・事業開発担当者向けに、台湾バイオ企業の臨床、BD、評価、資本市場ストーリーを理解するための入口です。",
        isPartOf: { "@type": "WebSite", name: "Drugnews｜藥時事", url: `${BASE_URL}/` },
        publisher: { "@type": "Organization", name: "Drugnews｜藥時事" }
      },
      {
        "@type": "ItemList",
        name: "Drugnews 最新の台湾バイオ分析",
        itemListElement: itemList
      }
    ]
  };

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Drugnews 日本語｜台湾バイオ・製薬ビジネス分析</title>
  <meta name="description" content="Drugnews日本語入口。日本の投資家・事業開発担当者向けに、台湾バイオ企業の臨床データ、BD、企業価値評価、資本市場シグナルを整理します。">
  <meta name="keywords" content="台湾バイオ, 台湾製薬, バイオ投資, 台湾バイオ企業, biotech Taiwan, Drugnews, 藥時事, ライセンス取引, 臨床データ, 企業価値評価">
  <link rel="canonical" href="${BASE_URL}/ja/">
  <link rel="alternate" hreflang="ja" href="${BASE_URL}/ja/">
  <link rel="alternate" hreflang="zh-Hant" href="${BASE_URL}/">
  <link rel="alternate" hreflang="en" href="${BASE_URL}/en/">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/">
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <meta property="og:title" content="Drugnews 日本語｜台湾バイオ・製薬ビジネス分析">
  <meta property="og:description" content="台湾バイオ企業の臨床、BD、評価、資本市場ストーリーを日本の読者向けに整理するDrugnewsの日本語入口。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/ja/">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body class="ja-page">
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="../index.html"><img src="../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
      <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
      <label class="nav-menu-button" for="site-nav-toggle">Menu</label>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="../index.html">中文</a>
        <a href="../en/">English</a>
        <a href="index.html" aria-current="page">日本語</a>
        <a href="../articles/">Articles</a>
        <a href="../services.html">Company Services</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="home-hero">
      <div class="container masthead">
        <div>
          <p class="eyebrow">Japanese Gateway</p>
          <h1><span class="hero-title-unit">Drugnews 日本語｜</span><span class="hero-title-unit">台湾バイオ・製薬ビジネス分析</span></h1>
        </div>
        <div>
          <p>Drugnewsは、台湾のバイオテック企業を「科学」「臨床」「BD」「企業価値評価」「資本市場」の接点から読むための分析メディアです。日本の投資家、事業開発担当者、製薬・医療関係者が台湾企業を理解するための入口を整備しています。</p>
          <div class="audience-proof">
            <strong>37,000+</strong>
            <span>台湾のバイオビジネス分析コミュニティでフォローされているDrugnewsの読者基盤。</span>
          </div>
        </div>
      </div>
      <div class="container issue-bar" aria-label="日本語読者向け入口">
        <a href="../en/">English Edition</a>
        <a href="../articles/">最新分析</a>
        <a href="../topics/">Topic Hubs</a>
        <a href="../services.html">企業向けサービス</a>
      </div>
    </section>
    <section class="section white">
      <div class="container section-head">
        <div>
          <p class="eyebrow">For Japanese Investors</p>
          <h2>台湾バイオ企業を見るための3つの視点</h2>
        </div>
        <p>完全な日本語記事版は段階的に整備します。まずは、台湾企業を評価する時に重要な論点を入口として整理します。</p>
      </div>
      <div class="container grid three">
        <div class="card"><h3>臨床データ</h3><p>主要評価項目、対照群、安全性、規制パスを読み、データが企業価値を変えるほど強いかを確認します。</p></div>
        <div class="card"><h3>BD・ライセンス</h3><p>upfront、milestone、royalty、地域権利を通じて、買い手と売り手の力関係を読み解きます。</p></div>
        <div class="card"><h3>資本市場ストーリー</h3><p>臨床、CMC、商業化、資金調達を一つの投資家向けストーリーとして追跡します。</p></div>
      </div>
    </section>
    <section class="section">
      <div class="container section-head">
        <div>
          <p class="eyebrow">Latest Analysis</p>
          <h2>最新の台湾バイオ分析</h2>
        </div>
        <p>最新分析はまず中国語原文と英語版で公開し、日本語入口では投資判断に必要なテーマから順次整理します。</p>
      </div>
      <div class="container article-list">${latest.map(articleCard).join("")}</div>
    </section>
    <section class="section service-strip">
      <div class="container service-strip-inner">
        <div>
          <p class="eyebrow">Company Services</p>
          <h2>日本市場・海外投資家向けのIR/コンテンツ支援</h2>
        </div>
        <p>台湾バイオ企業が海外投資家、製薬会社、事業開発パートナーに向けてストーリーを伝える際、Drugnewsは臨床・商業・資本市場の言葉に翻訳します。</p>
        <a class="button secondary" href="../services.html">サービスを見る</a>
      </div>
    </section>
  </main>
  <footer class="site-footer"><div class="container">© 2026 Drugnews. This Japanese gateway is for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.</div></footer>
</body>
</html>
`;
}

async function updateSitemap(records) {
  let xml = await fs.readFile(SITEMAP, "utf8");
  xml = xml.replace(/\n?<\/urlset>\s*$/u, "");
  const latest = latestDate(records);
  const loc = `${BASE_URL}/ja/`;
  xml = xml.split("\n").filter((line) => !line.includes(`<loc>${loc}</loc>`)).join("\n");
  const entry = `  <url><loc>${loc}</loc>${latest ? `<lastmod>${escapeXml(latest)}</lastmod>` : ""}<priority>0.75</priority></url>`;
  await writeAtomic(SITEMAP, `${xml.trimEnd()}\n${entry}\n</urlset>\n`);
}

async function main() {
  const records = await readRecords();
  await writeAtomic(path.join(JA, "index.html"), page(records));
  await updateSitemap(records);
  console.log("Built Japanese gateway under /ja.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
