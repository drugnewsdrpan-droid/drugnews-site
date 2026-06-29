import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const EN = path.join(ROOT, "en");
const PUBLISHED = path.join(ROOT, "content", "published");
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

function campaignUrl(url, content, campaign = "paid_research") {
  const next = new URL(url);
  next.searchParams.set("utm_source", "drugnews_site");
  next.searchParams.set("utm_medium", "referral");
  next.searchParams.set("utm_campaign", campaign);
  if (content) next.searchParams.set("utm_content", content);
  return next.toString();
}

function englishHomeSchema(records = []) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "NewsMediaOrganization"],
        "@id": `${BASE_URL}/#organization`,
        name: "Drugnews｜藥時事",
        alternateName: ["Drugnews", "藥時事", "Drugnews English"],
        url: `${BASE_URL}/`,
        logo: `${BASE_URL}/favicon.svg`,
        description: "Drugnews is a biotech and pharmaceutical business-analysis media platform covering clinical data, company strategy, licensing, valuation, and capital-market signals.",
        slogan: "Biotech and pharmaceutical business analysis media",
        publishingPrinciples: `${BASE_URL}/en/about.html`,
        areaServed: ["Taiwan", "Global biotech and pharmaceutical capital markets"],
        sameAs: [
          "https://www.facebook.com/profile.php?id=61568446257142",
          "https://www.dcard.tw/@drugnews",
          "https://vocus.cc/user/@Drugnews",
          "https://www.cmoney.tw/app/expert/drugnews?ca=1",
          "https://www.instagram.com/drugnews.com.tw/"
        ],
        email: "drugnews.dr.pan@gmail.com",
        contactPoint: {
          "@type": "ContactPoint",
          email: "drugnews.dr.pan@gmail.com",
          contactType: "business collaboration"
        },
        knowsAbout: [
          "biotech business analysis",
          "pharmaceutical business analysis",
          "clinical data interpretation",
          "biotech valuation",
          "BD licensing",
          "capital markets",
          "CMC risk",
          "drug development",
          "Taiwan biotech media"
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Drugnews paid research and biotech IR services",
          itemListElement: [
            {
              "@type": "Offer",
              name: "Drugnews paid research subscription",
              url: `${BASE_URL}/en/subscribe.html`,
              category: "Paid biotech and pharmaceutical business analysis"
            },
            {
              "@type": "Offer",
              name: "Biotech IR content and capital-market narrative service",
              url: `${BASE_URL}/en/services.html`,
              category: "Company IR content service"
            }
          ]
        },
        potentialAction: [
          {
            "@type": "SubscribeAction",
            target: `${BASE_URL}/en/subscribe.html`,
            name: "Subscribe to Drugnews paid research"
          },
          {
            "@type": "CommunicateAction",
            target: "mailto:drugnews.dr.pan@gmail.com",
            name: "Contact Drugnews for company collaboration"
          }
        ]
      },
      {
        "@type": "WebSite",
        name: "Drugnews English",
        alternateName: ["Drugnews Biotech Business Analysis", "Drugnews｜藥時事 English"],
        url: `${BASE_URL}/en/`,
        inLanguage: "en",
        description: "English edition of Drugnews biotech and pharmaceutical business analysis.",
        publisher: { "@id": `${BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE_URL}/en/articles/?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ItemList",
        name: "Latest Drugnews English Analysis",
        itemListElement: records.slice(0, 5).map((record, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${BASE_URL}/${record.url}`,
          name: record.title
        }))
      }
    ]
  };
  return `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

async function writeAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await fs.writeFile(temp, content);
  await fs.rename(temp, filePath);
}

function header(current, depth = 1) {
  const root = "../".repeat(depth);
  const currentAttr = (key) => current === key ? ' aria-current="page"' : "";
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="${depth === 0 ? "index.html" : "../".repeat(depth - 1) + "index.html"}"><img src="${root}favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
    <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
    <label class="nav-menu-button" for="site-nav-toggle">Menu</label>
    <nav class="nav-links" aria-label="Main navigation">
      <a href="${depth === 0 ? "index.html" : "../".repeat(depth - 1) + "index.html"}"${currentAttr("home")}>Home</a>
      <a href="${depth === 0 ? "articles/" : "../".repeat(depth - 1) + "articles/"}"${currentAttr("articles")}>Articles</a>
      <a href="${depth === 0 ? "guides/" : "../".repeat(depth - 1) + "guides/"}"${currentAttr("guides")}>Guides</a>
      <a href="${depth === 0 ? "subscribe.html" : "../".repeat(depth - 1) + "subscribe.html"}"${currentAttr("subscribe")}>Paid Research</a>
      <a href="${depth === 0 ? "services.html" : "../".repeat(depth - 1) + "services.html"}"${currentAttr("services")}>Company Services</a>
      <a href="${root}index.html">中文</a>
    </nav>
  </div>
</header>`;
}

function footer(depth = 1) {
  return `<footer class="site-footer"><div class="container">© 2026 Drugnews. This site is for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.</div></footer>`;
}

function head({ title, description, canonicalPath, image, depth = 1, extraHead = "", homeRecords = [] }) {
  const root = "../".repeat(depth);
  const canonical = `${BASE_URL}/${canonicalPath}`;
  const zhPath = canonicalPath.startsWith("en/") ? canonicalPath.replace(/^en\//, "") : canonicalPath;
  const homeSchema = canonicalPath === "en/" ? `
  <meta name="keywords" content="Drugnews, biotech business analysis, pharmaceutical business analysis, biotech investing, clinical data, licensing, BD, valuation, capital markets, Taiwan biotech media">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
${englishHomeSchema(homeRecords)}` : "";
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${canonical}">
  <link rel="alternate" hreflang="zh-Hant" href="${BASE_URL}/${zhPath}">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/${zhPath}">
  <link rel="icon" href="${root}favicon.svg">
  <link rel="stylesheet" href="${root}styles.css?v=en-20260616-1">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  <meta property="og:locale" content="en_US">
${image ? `  <meta property="og:image" content="${escapeHtml(image)}">` : ""}
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
${homeSchema}${extraHead ? `\n${extraHead}` : ""}
</head>`;
}

function page({ title, description, canonicalPath, image, current, depth = 1, main, extraHead = "", homeRecords = [] }) {
  return `<!doctype html>
<html lang="en">
${head({ title, description, canonicalPath, image, depth, extraHead, homeRecords })}
<body>
${header(current, depth)}
${main}
${footer(depth)}
</body>
</html>
`;
}

function researchPackOfferCatalog() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "name": "Drugnews Paid Research Packs",
    "url": `${BASE_URL}/en/subscribe.html`,
    "description": "Buyable biotech and pharmaceutical business-analysis research packs and IR content services from Drugnews.",
    "provider": {
      "@type": "Organization",
      "name": "Drugnews｜藥時事",
      "url": BASE_URL
    },
    "itemListElement": [
      {
        "@type": "Offer",
        "availability": "https://schema.org/PreOrder",
        "url": campaignUrl("https://vocus.cc/user/@Drugnews", "english_glp1_research_pack", "paid_research_pack"),
        "itemOffered": {
          "@type": "CreativeWork",
          "name": "GLP-1 and Obesity Drug Competition Map",
          "description": "A focused research pack on Novo Nordisk, Lilly, oral GLP-1s, combination therapies, and next-generation obesity-drug competition."
        }
      },
      {
        "@type": "Offer",
        "availability": "https://schema.org/PreOrder",
        "url": campaignUrl("https://vocus.cc/user/@Drugnews", "english_bd_valuation_pack", "paid_research_pack"),
        "itemOffered": {
          "@type": "CreativeWork",
          "name": "Pipeline Valuation and Licensing-Terms Pack",
          "description": "A practical research pack for rNPV, upfront payments, milestones, royalties, territorial rights, and biotech asset valuation."
        }
      },
      {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "url": "https://forms.gle/rvDm93vkUx3E7Rci7?utm_source=drugnews_site&utm_medium=referral&utm_campaign=company_services&utm_content=english_ir_content_audit",
        "itemOffered": {
          "@type": "Service",
          "name": "Biotech IR Content Audit",
          "description": "A focused review of biotech company websites, investor decks, press releases, and investor communication materials."
        }
      }
    ]
  };
  return `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function imagePath(record, depth = 1) {
  if (!record.image) return "";
  if (/^https?:\/\//i.test(record.image)) return record.image;
  return `${"../".repeat(depth)}${record.image.replace(/^\.\.\//, "")}`;
}

function articleCard(record, depth = 1) {
  const image = imagePath(record, depth);
  const href = record.external ? record.url : `${"../".repeat(depth)}${record.url}`;
  const target = record.external ? ' target="_blank" rel="noopener"' : "";
  const tags = (record.tags || []).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `<a class="article-card${image ? " with-image" : ""}${record.external ? " external-card" : ""}" href="${escapeHtml(href)}"${target}>
    ${image ? `<div class="thumb-wrap"><img class="card-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(record.imageAlt || record.title)}" loading="lazy"></div>` : ""}
    <div class="article-card-body">
      <div class="meta"><span>${escapeHtml(record.date)}</span><span>${escapeHtml(englishCategory(record.category))}</span><span>${escapeHtml(englishAccess(record.access))}</span></div>
      <h3>${escapeHtml(record.title)}</h3>
      <p>${escapeHtml(record.summary)}</p>
      <div class="tag-row">${tags}</div>
    </div>
  </a>`;
}

function englishCategory(category = "") {
  const map = new Map([
    ["商業分析系列", "Business Analysis"],
    ["基本面系列", "Fundamentals"],
    ["醫學大會", "Medical Conferences"],
    ["付費深度商業分析文章系列", "In-depth Business Analysis"],
    ["製藥巨頭系列", "Big Pharma"],
    ["公司研究", "Company Research"],
    ["生技估值", "Biotech Valuation"],
    ["IR 與資本市場", "IR and Capital Markets"]
  ]);
  return map.get(category) || category || "Business Analysis";
}

function englishAccess(access = "") {
  if (access === "免費文章") return "Free Article";
  if (access === "付費文章") return "Paid Research";
  return access || "Free Article";
}

function compactArticleLink(record, depth = 1) {
  const href = record.external ? record.url : `${"../".repeat(depth)}${record.url}`;
  const target = record.external ? ' target="_blank" rel="noopener"' : "";
  return `<a class="briefing-link english-latest-link" href="${escapeHtml(href)}"${target}>
    <span>${escapeHtml(record.date)} · ${escapeHtml(englishCategory(record.category))}</span>
    <strong>${escapeHtml(record.title)}</strong>
  </a>`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function articleFileName(meta) {
  return `${meta.date}-${meta.slug}.html`;
}

function publishedImage(meta) {
  if (!meta.cover_image) return "";
  if (/^https?:\/\//i.test(meta.cover_image)) return meta.cover_image;
  return `../assets/articles/${meta.slug}/${path.basename(meta.cover_image)}`;
}

function publishedRecord(meta) {
  return {
    title: meta.title,
    slug: meta.slug,
    date: meta.date,
    publishAt: meta.publish_at || `${meta.date}T00:00:00+08:00`,
    category: meta.category || meta.series || "Business Analysis",
    access: meta.access || "免費文章",
    lang: meta.lang || "zh-Hant",
    tags: meta.tags || [],
    summary: meta.summary || "",
    image: publishedImage(meta),
    imageAlt: meta.cover_image_alt || meta.title,
    url: `articles/${articleFileName(meta)}`
  };
}

async function loadEnglishRecords() {
  if (!(await exists(PUBLISHED))) return [];
  const entries = await fs.readdir(PUBLISHED, { withFileTypes: true });
  const records = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(PUBLISHED, entry.name, "meta.json");
    if (!(await exists(metaPath))) continue;
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    if (meta.lang === "en") records.push(publishedRecord(meta));
  }
  return records.sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt) || b.title.localeCompare(a.title, "en"));
}

function homePage(records) {
  const englishRecords = records.filter((item) => item.lang === "en");
  const lead = englishRecords.find((item) => !/anhorn|安宏/i.test(`${item.slug || ""} ${item.title || ""} ${(item.tags || []).join(" ")}`)) || englishRecords[0];
  const latestLinks = englishRecords.filter((item) => item !== lead).slice(0, 4).map((item) => compactArticleLink(item, 1)).join("");
  const homeRecords = lead ? [lead, ...englishRecords.filter((item) => item !== lead).slice(0, 4)] : englishRecords.slice(0, 5);
  const leadImage = lead ? imagePath(lead, 1) : "";
  return page({
    title: "Drugnews English｜Biotech and Pharmaceutical Business Analysis",
    description: "Drugnews English is a biotech and pharmaceutical business-analysis media platform covering clinical data, company strategy, licensing, valuation, and capital-market signals.",
    canonicalPath: "en/",
    image: `${BASE_URL}/assets/english/drugnews-english-analysis-cover.png`,
    current: "home",
    depth: 1,
    homeRecords,
    main: `<main>
  <section class="home-hero">
    <div class="container masthead">
      <div>
        <p class="eyebrow">Official Site</p>
        <h1><span class="hero-title-unit">Drugnews｜</span><span class="hero-title-unit">Biotech Business Analysis</span></h1>
      </div>
      <div>
        <p>Drugnews turns clinical data, company strategy, licensing activity, and capital-market signals into clear business judgment for biotech and pharmaceutical readers.</p>
        <div class="audience-proof"><strong>37,000+</strong><span>Facebook followers across Taiwan's biotech investment and business-analysis community.</span></div>
      </div>
    </div>
    <div class="container issue-bar" aria-label="Reading entry points">
      <a href="articles/">Latest English Articles</a>
      <a href="articles/">Business Analysis</a>
      <a href="articles/">AI Drug Development</a>
      <a href="guides/">Research Guides</a>
      <a href="subscribe.html">Paid Research</a>
      <a href="../articles/">Chinese Archive</a>
    </div>
    <div class="container english-home-grid">
      ${lead ? `<a class="english-lead-story" href="../${escapeHtml(lead.url)}">
        <div class="english-lead-copy">
          <div class="meta"><span>Featured English Analysis</span><span>${escapeHtml(englishCategory(lead.category))}</span><span>${escapeHtml(englishAccess(lead.access))}</span></div>
          <h2>${escapeHtml(lead.title)}</h2>
          <p>${escapeHtml(lead.summary)}</p>
          <div class="english-proof-points" aria-label="Why this article matters">
            <span>Clinical data</span>
            <span>Company strategy</span>
            <span>Capital-market judgment</span>
          </div>
          <span class="text-link">Read full analysis</span>
        </div>
        ${leadImage ? `<div class="english-lead-media"><img src="${escapeHtml(leadImage)}" alt="${escapeHtml(lead.imageAlt || lead.title)}"></div>` : ""}
      </a>` : ""}
      <aside class="english-briefing-panel" aria-label="Latest English articles">
        <p class="eyebrow">English Edition</p>
        <h2>Latest Analysis</h2>
        <p>Professional English versions of Drugnews analysis for global biotech, pharma, investor-relations, and capital-market readers.</p>
        <div class="english-panel-actions"><a class="button primary" href="articles/">Go to English Articles</a><a class="button secondary" href="services.html">Company Services</a></div>
        <div class="english-latest-list">
          <p class="eyebrow">Recent Articles</p>
          ${latestLinks || '<p class="notice">Additional English analysis is coming soon.</p>'}
        </div>
      </aside>
      <div class="editorial-note english-trust-strip">
        <div><p class="eyebrow">Editorial Standard</p><h2>From science to market judgment.</h2></div>
        <p class="coverage-copy">We cover company research, clinical and CMC risks, licensing and BD, valuation, and capital-market signals. The goal is not to summarize news, but to explain which evidence can change business value.</p>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="container section-head">
      <div>
        <p class="eyebrow">Reading Paths</p>
        <h2>Follow Drugnews by research need</h2>
        <p>Start from timely English analysis, then move into research frameworks, paid deeper work, or company-service collaborations when needed.</p>
      </div>
    </div>
    <div class="container topic-guide">
      <div class="topic-guide-main">
        <a class="topic-row" href="articles/"><span>01</span><div><h3>Latest English Articles</h3><p>Reader-first biotech and pharmaceutical business analysis translated and edited for professional English readers.</p></div></a>
        <a class="topic-row" href="guides/"><span>02</span><div><h3>Research Guides</h3><p>Short frameworks for reading clinical endpoints, valuation, BD terms, safety, CMC, market sizing, patents, and cash runway.</p></div></a>
        <a class="topic-row" href="subscribe.html"><span>03</span><div><h3>Paid Research</h3><p>Deeper company tracking and industry context for readers who need repeatable biotech business judgment.</p></div></a>
        <a class="topic-row" href="services.html"><span>04</span><div><h3>Company Services</h3><p>Investor-facing biotech content, market storytelling, and English communication support for company teams.</p></div></a>
      </div>
      <aside class="topic-guide-aside">
        <p class="eyebrow">Chinese Archive</p>
        <h3>Full Chinese site remains the main editorial archive.</h3>
        <p>English pages help global readers discover selected Drugnews analysis, while the Chinese site keeps the complete daily media flow.</p>
        <a class="text-link" href="../articles/">Browse Chinese articles</a>
      </aside>
    </div>
  </section>
  <section class="section white">
    <div class="container newsletter">
      <div><p class="eyebrow">Company Services</p><h2>Investor-facing biotech content and market storytelling</h2><p>For public companies, biotech startups, pharma companies, CDMOs, and medical-technology teams, Drugnews helps translate science, clinical evidence, and business strategy into professional content that investors and industry readers can understand.</p></div>
      <div class="actions"><a class="button primary" href="services.html">Explore company services</a><a class="button secondary" href="team.html">Meet the team</a></div>
    </div>
  </section>
</main>`
  });
}

function articlesPage(records) {
  const english = records.filter((item) => item.lang === "en");
  const cards = english.map((item) => articleCard(item, 2)).join("");
  return page({
    title: "English Articles｜Drugnews",
    description: "Native-English Drugnews articles on biotech business analysis, AI drug development, clinical assets, and pharmaceutical strategy.",
    canonicalPath: "en/articles/",
    current: "articles",
    depth: 2,
    main: `<main>
  <section class="page-title"><div class="container"><p class="eyebrow">English Edition</p><h1>English Articles</h1><p>Native-English Drugnews analysis for global biotech, pharma, investor-relations, and capital-market readers.</p></div></section>
  <section class="section"><div class="container article-list">${cards || '<p class="notice">No English articles have been published yet.</p>'}</div></section>
</main>`
  });
}

function servicesPage() {
  return page({
    title: "Drugnews｜Company Services for Biotech and Pharma",
    description: "Drugnews helps biotech and pharmaceutical companies translate science, clinical evidence, business development, and capital-market narratives into professional investor-facing content.",
    canonicalPath: "en/services.html",
    image: `${BASE_URL}/assets/team/drugnews-team.jpg`,
    current: "services",
    depth: 1,
    main: `<main>
  <section class="page-title"><div class="container"><p class="eyebrow">Company Services</p><h1>Make your science, clinical progress, and business strategy understandable to professional readers.</h1><p>Drugnews is a reader-first biotech business-analysis media platform. We also work with public companies, biotech startups, pharma companies, CDMOs, and medical-technology teams to turn R&D progress, clinical evidence, licensing logic, and capital-market stories into clear company narratives.</p></div></section>
  <section class="section compact client-proof"><div class="container client-proof-grid"><div><p class="eyebrow">Client Experience</p><h2>Past collaborators</h2></div><div class="client-logo-marquee" aria-label="Past collaborators"><div class="client-logo-track"><span class="client-logo"><img src="../assets/clients/libo-official.png" alt="Libo Pharma logo"></span><span class="client-logo"><img src="../assets/clients/senhwa-official.png" alt="Senhwa Biosciences logo"></span><span class="client-logo"><img src="../assets/clients/protect-official.png" alt="PROTECT Companion Pet Care logo"></span><span class="client-logo"><img src="../assets/clients/anhorn-official.png" alt="AnHorn Medicines logo"></span><span class="client-logo"><img src="../assets/clients/intelligene-logo-20260610.png" alt="Intelligene logo"></span><span class="client-logo"><img src="../assets/clients/globalbio-logo-20260610.png" alt="Global Bio & Investment logo"></span></div></div></div></section>
  <section class="section"><div class="container section-head"><div><h2>How we help</h2><p>All collaboration content is built on public information, company-approved disclosure, and professional research frameworks.</p></div></div><div class="container grid two"><div class="card"><h3>Company research and feature articles</h3><p>We turn pipelines, platforms, clinical positioning, competitive landscapes, and business models into long-form analysis that supports reader judgment.</p></div><div class="card"><h3>IR and capital-market narratives</h3><p>We translate clinical, CMC, regulatory, commercialization, and peer-comparison information into value logic investors can follow.</p></div><div class="card"><h3>Social content and distribution</h3><p>We adapt long-form analysis into readable social summaries, visual posts, and key-message cards that lead back to clear business judgment.</p></div><div class="card"><h3>Events and interviews</h3><p>We design interviews, online briefings, event recaps, and follow-up articles that help professional readers understand a company's market position.</p></div></div></section>
  <section class="section white"><div class="container newsletter"><div><h2>Start a company-services conversation</h2><p>Tell us what you need, or email us directly at drugnews.dr.pan@gmail.com.</p></div><a class="button primary" href="https://forms.gle/rvDm93vkUx3E7Rci7" target="_blank" rel="noopener">Submit a collaboration request</a></div></section>
</main>`
  });
}

function subscribePage() {
  return page({
    title: "Drugnews｜Paid Biotech Research",
    description: "Subscribe to Drugnews paid research for deeper biotech company research, industry context, valuation frameworks, and capital-market judgment.",
    canonicalPath: "en/subscribe.html",
    image: `${BASE_URL}/assets/articles/sinphar-cx5461-ras-pancreatic-cancer/cover-cancer-cell.png`,
    current: "subscribe",
    depth: 1,
    extraHead: researchPackOfferCatalog(),
    main: `<main>
  <section class="page-title paid-hero"><div class="container"><p class="eyebrow">Paid Research</p><h1>Read biotech company change as a repeatable business-judgment framework.</h1><p>Free articles help readers understand public events. Drugnews paid research goes deeper into company tracking, industry context, valuation thinking, and capital-market interpretation.</p><div class="actions"><a class="button primary" href="${escapeHtml(campaignUrl("https://vocus.cc/user/@Drugnews", "english_subscribe_hero"))}" target="_blank" rel="noopener">Subscribe on Vocus</a><a class="button secondary" href="../articles/type/paid.html">View paid article series</a></div></div></section>
  <section class="section white"><div class="container section-head"><div><h2>Who it is for</h2><p>Paid research is designed for readers who want to connect individual news events into company fundamentals, clinical milestones, BD logic, and valuation change.</p></div></div><div class="container grid"><div class="card"><h3>Long-term biotech company followers</h3><p>Readers who want each event to connect back to pipeline value, clinical catalysts, and commercialization paths.</p></div><div class="card"><h3>Investors who need industry context</h3><p>Readers who follow BD, licensing, competitive dynamics, clinical risk, and capital-market repricing.</p></div><div class="card"><h3>Biotech and pharma professionals</h3><p>Industry readers who want a more commercial lens on pipelines, platforms, clinical data, and company positioning.</p></div></div></section>
  <section class="section white"><div class="container section-head"><div><p class="eyebrow">Buyable Research Packs</p><h2>Turn single articles into reusable biotech research tools.</h2><p>Drugnews can package high-demand topics into focused research packs for readers and teams who need a faster way to understand a market, valuation question, or BD decision.</p></div></div><div class="container product-grid"><article class="product-card"><span class="product-tag">Investment Framework</span><h3>GLP-1 and Obesity Drug Competition Map</h3><p>A structured view of Novo Nordisk, Lilly, oral GLP-1s, combination therapies, and next-generation obesity pipelines, focused on product, supply-chain, and commercialization advantage.</p><div class="product-meta"><span>PDF / chart pack</span><span>For investors and industry readers</span></div><a class="button primary" href="${escapeHtml(campaignUrl("https://vocus.cc/user/@Drugnews", "english_glp1_research_pack", "paid_research_pack"))}" target="_blank" rel="noopener">View related paid research</a></article><article class="product-card"><span class="product-tag">BD / Licensing</span><h3>Pipeline Valuation and Licensing-Terms Pack</h3><p>A practical framework for rNPV, upfront payments, milestones, royalties, territorial rights, and how buyers price an asset before it reaches the market.</p><div class="product-meta"><span>Valuation framework</span><span>For research and BD teams</span></div><a class="button primary" href="${escapeHtml(campaignUrl("https://vocus.cc/user/@Drugnews", "english_bd_valuation_pack", "paid_research_pack"))}" target="_blank" rel="noopener">View related paid research</a></article><article class="product-card"><span class="product-tag">Company Service</span><h3>Biotech IR Content Audit</h3><p>A focused review of a company's website, deck, press releases, and investor materials to clarify clinical evidence, commercialization path, competitor positioning, and catalysts.</p><div class="product-meta"><span>30-minute consultation</span><span>For company and IR teams</span></div><a class="button secondary" href="https://forms.gle/rvDm93vkUx3E7Rci7?utm_source=drugnews_site&amp;utm_medium=referral&amp;utm_campaign=company_services&amp;utm_content=english_ir_content_audit" target="_blank" rel="noopener">Book an audit</a></article></div></section>
  <section class="section"><div class="container newsletter"><div><h2>Turn Drugnews into your biotech research radar</h2><p>Follow free posts, paid research, and community discussions together to build a complete reading path.</p></div><div class="actions"><a class="button secondary" href="https://www.facebook.com/profile.php?id=61568446257142" target="_blank" rel="noopener">Facebook</a><a class="button secondary" href="https://www.dcard.tw/@drugnews" target="_blank" rel="noopener">Dcard</a><a class="button secondary" href="${escapeHtml(campaignUrl("https://vocus.cc/user/@Drugnews", "english_subscribe_follow_bar"))}" target="_blank" rel="noopener">Vocus</a></div></div></section>
</main>`
  });
}

function teamPage() {
  return page({
    title: "Drugnews｜Team",
    description: "Drugnews is built by Dr. Jo-Fan Pan and Dr. Chuan-Sheng Lin, combining clinical, scientific, business-development, and capital-market perspectives.",
    canonicalPath: "en/team.html",
    image: `${BASE_URL}/assets/team/drugnews-team.jpg`,
    current: "team",
    depth: 1,
    main: `<main>
  <section class="page-title"><div class="container team-hero"><div><p class="eyebrow">Team</p><h1>Two biomedical PhDs translating science into business analysis readers can judge.</h1><p>Drugnews combines clinical medicine, biotech R&D, business development, and capital-market perspectives. Our goal is to make biotech and pharma content more than news summary: it should become research material readers can inspect, compare, and track.</p></div><figure class="team-photo"><img src="../assets/team/drugnews-team.jpg" alt="Drugnews team photo: Dr. Jo-Fan Pan and Dr. Chuan-Sheng Lin"><figcaption>Drugnews｜Dr. Jo-Fan Pan × Dr. Chuan-Sheng Lin</figcaption></figure></div></section>
  <section class="section"><div class="container team-grid"><article class="profile-card"><div class="profile-kicker">Founder / Editor-in-Chief</div><h2>Dr. Jo-Fan Pan</h2><p>PhD, University of Manchester; BSN, National Taiwan University. Former frontline emergency department clinician with experience in pharmaceutical international trade, medical-device distribution, and content entrepreneurship.</p><ul class="credential-list"><li>Specializes in asset value through business development and licensing logic</li><li>Tracks pharma dealmaking, clinical milestones, and capital-market narratives</li><li>Leads Drugnews editorial strategy, long-form structure, and reader communication</li></ul></article><article class="profile-card"><div class="profile-kicker">Partner / Scientific Strategy</div><h2>Dr. Chuan-Sheng Lin</h2><p>Biomedical dual-PhD background from Chang Gung University and Europe, with more than 15 years of biotech and pharmaceutical experience across the R&D value chain.</p><ul class="credential-list"><li>Experienced in drug development, technology platforms, patents, and international collaboration</li><li>Has worked with global pharma companies including Novo Nordisk and Merck</li><li>Helps the team examine scientific evidence, technical barriers, and development risk</li></ul></article></div></section>
  <section class="section white"><div class="container team-belief"><div><p class="eyebrow">Differentiation</p><h2>How Drugnews is different</h2></div><p>We do not only collect news or make social-media summaries. Drugnews places mechanism, clinical evidence, CMC and regulatory risk, competitive dynamics, licensing, and valuation logic into one judgment framework.</p></div><div class="container principle-grid"><div class="principle"><span>Science</span><strong>Understand mechanism and evidence</strong></div><div class="principle"><span>Industry</span><strong>Interpret R&D and commercialization</strong></div><div class="principle"><span>Capital</span><strong>Track valuation and catalysts</strong></div></div></section>
</main>`
  });
}

const guides = [
  ["clinical-endpoints.html", "Clinical Endpoints", "How to read biotech clinical endpoints", "Clinical endpoints define what a trial is trying to prove. For investors and industry readers, the key question is not only whether a p-value is positive, but whether the endpoint reflects meaningful patient benefit, regulatory relevance, and commercial differentiation."],
  ["regulatory-milestones.html", "Regulatory Milestones", "How regulatory events change company value", "IND clearance, Phase II data, pivotal trial design, NDA/BLA submission, advisory committees, and approval decisions each change the evidence package in different ways. Good analysis asks what uncertainty has been reduced, and what risk remains."],
  ["biotech-valuation.html", "Biotech Valuation", "A practical framework for biotech valuation", "Biotech valuation is a probability-weighted reading of clinical risk, market size, competitive positioning, financing needs, and strategic value. The goal is not precision for its own sake, but a disciplined map of assumptions."],
  ["bd-licensing-terms.html", "BD and Licensing Terms", "How to read biotech licensing deals", "Upfront payments, milestones, royalties, option structures, territory rights, and development responsibilities reveal how partners allocate risk and value. The headline number is rarely the full story."],
  ["safety-cmc-risk.html", "Safety and CMC Risk", "Why safety and manufacturing can change everything", "A strong efficacy signal can still fail if safety, exposure, dosing, durability, or manufacturing cannot support clinical and commercial use. CMC is often where a scientific idea becomes an investable product or stalls."],
  ["market-sizing.html", "Market Sizing", "How to size biotech markets without fooling yourself", "Good market sizing separates epidemiology, diagnosed patients, treatable patients, eligible patients, pricing, reimbursement, duration, and competitive share. The useful number is not the biggest number; it is the defensible number."],
  ["patent-competition.html", "Patent and Competition", "How patents and competition shape drug value", "A drug's value depends not only on clinical data, but also on exclusivity, composition-of-matter protection, formulation and method patents, lifecycle strategy, and the competitive products arriving before or after it."],
  ["cash-runway.html", "Cash Runway", "How to read biotech cash runway", "Cash runway determines whether a company can reach its next value-changing milestone without dilutive financing. The important question is whether the cash balance matches the clinical plan and catalyst timeline."]
];

function guidesIndexPage() {
  const rows = guides.map(([file, label, title, text], index) => `<a class="topic-row" href="${file}"><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(label)}</h3><p>${escapeHtml(text)}</p></div></a>`).join("");
  return page({
    title: "Research Guides｜Drugnews",
    description: "Drugnews research guides for reading biotech clinical data, valuation, BD, CMC risk, market sizing, patents, and cash runway.",
    canonicalPath: "en/guides/",
    current: "guides",
    depth: 2,
    main: `<main><section class="page-title"><div class="container"><p class="eyebrow">Guides</p><h1>Research Guides</h1><p>Short frameworks for reading biotech and pharmaceutical companies with more discipline.</p></div></section><section class="section"><div class="container topic-guide"><div class="topic-guide-main">${rows}</div></div></section></main>`
  });
}

function guidePage(file, label, title, text) {
  return page({
    title: `${label}｜Drugnews Guides`,
    description: text,
    canonicalPath: `en/guides/${file}`,
    current: "guides",
    depth: 2,
    main: `<main><section class="page-title"><div class="container"><p class="eyebrow">Research Guide</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p></div></section><section class="section"><div class="container grid two"><div class="card"><h2>What to check first</h2><p>Start with the evidence that can change value: clinical relevance, regulatory path, competitive context, financing needs, and whether the company can reach the next milestone.</p></div><div class="card"><h2>How Drugnews uses this guide</h2><p>We apply these frameworks when writing company research, paid analysis, and client-facing content so that readers can follow the logic behind each judgment.</p></div></div></section></main>`
  });
}

function latestRecordDate(records) {
  return records
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

async function updateSitemap(records) {
  let xml = await fs.readFile(SITEMAP, "utf8");
  xml = xml.replace(/\n?<\/urlset>\s*$/u, "");
  const latest = latestRecordDate(records.filter((item) => item.lang === "en"));
  const enUrls = [
    ["en/", "0.9"],
    ["en/articles/", "0.8"],
    ["en/guides/", "0.8"],
    ["en/services.html", "0.8"],
    ["en/subscribe.html", "0.7"],
    ["en/team.html", "0.7"],
    ...guides.map(([file]) => [`en/guides/${file}`, "0.7"])
  ];
  const enLocs = new Set(enUrls.map(([loc]) => `${BASE_URL}/${loc}`));
  if ([...enLocs].every((loc) => xml.includes(`<loc>${loc}</loc>`))) return;
  xml = xml
    .split("\n")
    .filter((line) => ![...enLocs].some((loc) => line.includes(`<loc>${loc}</loc>`)))
    .join("\n");
  const additions = enUrls
    .map(([loc, priority]) => `  <url><loc>${BASE_URL}/${escapeXml(loc)}</loc>${latest ? `<lastmod>${latest}</lastmod>` : ""}<priority>${priority}</priority></url>`);
  const body = xml.trimEnd();
  await writeAtomic(SITEMAP, `${body}${additions.length ? `\n${additions.join("\n")}` : ""}\n</urlset>\n`);
}

async function main() {
  const records = await loadEnglishRecords();
  await writeAtomic(path.join(EN, "index.html"), homePage(records));
  await writeAtomic(path.join(EN, "articles", "index.html"), articlesPage(records));
  await writeAtomic(path.join(EN, "services.html"), servicesPage());
  await writeAtomic(path.join(EN, "subscribe.html"), subscribePage());
  await writeAtomic(path.join(EN, "team.html"), teamPage());
  await writeAtomic(path.join(EN, "guides", "index.html"), guidesIndexPage());
  for (const guide of guides) {
    await writeAtomic(path.join(EN, "guides", guide[0]), guidePage(...guide));
  }
  await writeAtomic(path.join(EN, "search-index.json"), JSON.stringify(records.filter((item) => item.lang === "en"), null, 2));
  await updateSitemap(records);
  console.log("Built English site under /en.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
