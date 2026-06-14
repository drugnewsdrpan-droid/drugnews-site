import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const BASE_URL = "https://drugnews.com.tw";
const SHARED_COVER = `${BASE_URL}/assets/english/drugnews-english-analysis-cover.png`;

const titleOverrides = {
  "2026-q2": "The 2026 Q2 Drug Catalysts Biotech Readers Need to Know",
  "420": "The Cut-Rate Weight-Loss Injection Has Arrived: What a NT$420 Monthly Price Really Means",
  "78": "The King of Weight-Loss Drugs: Did US$7.8 Billion Buy the Next Era of Metabolic Medicine?",
  "aatd-new-therapy-rna-gene-editing": "A Genetic Disease With No New Treatment for 40 Years Finally Enters a New Drug Era",
  "abivax-14": "The Abivax Story: How a European Biotech Became a 14-Fold Market Myth",
  "ai": "The Three AI Giants Battling Inside Medicine",
  "ai-drug-discovery-google-funding": "A Record AI Drug-Discovery Financing: Why a Google-Backed Company Raised US$2.1 Billion",
  "ai-semiconductor-biotech-capital-neglect": "How AI Semiconductors Have Hidden the Biotech Opportunity in Plain Sight",
  "alzheimers-amyloid-hypothesis-collapse": "Is the 20-Year Amyloid Hypothesis in Alzheimer's Disease Starting to Collapse?",
  "amazon-ai-nvidia": "Amazon Enters AI Drug Discovery and Challenges Nvidia's Pharma Ambition",
  "antidepressant-new-drugs-pipeline": "A Complete Map of the New Antidepressant Drug Pipeline",
  "asthma-new-drug-immune-targets": "Asthma Drugs Are Shifting Gears: From Triple Inhalers to Upstream Immune Targets",
  "biogen-alzheimers-tau-biib080-strategy": "Biogen's High-Risk Bet: Can Tau Find a Way Out of the Alzheimer's R&D Graveyard?",
  "biotech": "The Fall of Two Star Biotechs",
  "biotech-5": "Why Platform Biotechs Can Generate Five Times More Licensing Revenue",
  "biotech-ai": "Could This Taiwanese Biotech Capture the Entire AI Infrastructure Dividend?",
  "biotech-investment-judgment-system": "Biotech Investing Needs a Judgment System, Not More News",
  "biotech-ir-capital-market-story": "Biotech IR Is Not Making Slides Prettier; It Is Turning Pipelines Into Trackable Capital-Market Stories",
  "car-t": "Goodbye Autologous CAR-T: Why Taiwan's Cell-Therapy Bubble Also Needs to Break",
  "cart-autoimmune-new-era": "CAR-T Enters a New Era: From Blood Cancer to Autoimmune Disease",
  "cdc": "While the US CDC Was Still Looking for a Director",
  "clinical-trial-fraud-fda-withdrawal": "Clinical-Trial Fraud and an FDA Withdrawal Storm",
  "curium-lantheus-radiopharma-acquisition": "The US$7 Billion Radiopharma Deal Rumor: Curium Wants Lantheus, but the Real Prize Is a Ticket to the Nuclear-Medicine Era",
  "dac-adc-protac-next-targeted-therapy": "Could DAC Become the Next Breakout Format in Targeted Therapy?",
  "daiichi-sankyo-adc-capacity-lesson": "Daiichi Sankyo's Most Expensive Lesson: How an ADC Capacity Bet Can Backfire After a Blockbuster",
  "dcard-261215001": "Innovent's Globalization Train: Did Taiwan's Forward Therapeutics Get On Board?",
  "dcard-261221419": "Can Merck Build Another Oncology Empire?",
  "dcard-261227197": "After GLP-1 and Mounjaro, What Is Happening in Weight-Loss Drug R&D?",
  "dcard-261232633": "Did Weight-Loss Injections Backfire and Trigger Pancreatitis Risk?",
  "dcard-261238352": "How Far Are We From a Real Anti-Aging Drug?",
  "dcard-261263509": "A New Drug Finally Arrives for This Group of Rare-Disease Patients",
  "dcard-261269760": "When Should a Company Decisively Abandon a Clinical Trial?",
  "dcard-261276232": "Why Did the Market Like This Company More After a Clinical Failure?",
  "dcard-261282303": "Idiopathic Pulmonary Fibrosis Is Entering an Acceleration Phase",
  "dcard-261295358": "Investors Should Pay Attention to the Autoimmune Mega-Drug Race",
  "dcard-261315054": "The Valley of Death in Innovative Drug Development",
  "dcard-261332702": "A Historic Moment: The Next Century-Defining Drug Has Arrived",
  "dcard-261339270": "Did Lilly's Oral Drug Ignite the Market?",
  "dcard-261352566": "Do COPD Patients Finally Have Another New Drug Option?",
  "dcard-261359193": "Investors Should Pay Attention: Drug Delivery Is a Blue Ocean",
  "dcard-261370593": "The Healthcare-Giant Spin-Off Wave",
  "dcard-261381952": "When a Gray-Market Industry Gets a Seat at the Table",
  "dcard-261388300": "A Clear Read on Lilly's Current M&A Logic",
  "dcard-261654701": "The Second Half of AI Drug Discovery: Making Drugs Survive",
  "drug-combination-efficacy-doubling": "The Best Partner for a Drug King? When Combination Therapy Doubles Efficacy",
  "fda-commissioner-resignation-regulatory-risk": "The FDA Commissioner's Exit: Why the World's Most Important Drug Referee Is Becoming Less Predictable",
  "generic-pharma-transformation-anxiety": "Sun Pharma, Teva, and the Transformation Anxiety of Global Generic Drugmakers",
  "gilead-hiv-yeztugo-prep-growth": "HIV Drugs Are Still Highly Profitable: What Gilead's Earnings Reveal",
  "global-biotech-obesity-megatrend": "The Global Biotech Wave: Understanding the Main Phase and Scientific Pricing of the Five-Trillion Weight-Loss Market",
  "glp1-biotech-capital-reshuffle": "Obesity Becomes King: How GLP-1 Is Reshuffling Global Biotech Capital",
  "glp1-medicare-policy-delay": "Trump Delays the Policy Signal: Did Weight-Loss Drugs Cut Prices for Nothing?",
  "hair-growth-drug-breakthrough": "The Hair-Growth Drug That Jumped 47%: Why It Could Rewrite Three Decades of Hair-Loss Treatment",
  "in-vivo-cart-kelonia-lilly": "In Vivo CAR-T: Bubble or the Most Expensive Ticket to Next-Generation Cell Therapy?",
  "jnj-auto-car-t-commercial-challenge": "Johnson & Johnson Cuts Two Autologous Lymphoma CAR-T Programs",
  "jnj-autoimmune-twins-stelara-transition": "The Autoimmune Twins That Could Save Johnson & Johnson",
  "lilly-tirzepatide-glp1-growth": "Weight-Loss Drugs Are Still Too Strong: Lilly's Mounjaro Keeps Printing Money",
  "mid-size-biotech-blockbuster-cashflow": "How Mid-Sized Biotechs Are Turning Blockbuster Drugs From Dreams Into Cash Flow",
  "neuralink-10": "Neuralink and the Next Trillion-Dollar Race: Ten Brain-Computer Interface Companies to Know",
  "neuroinflammation-cns-drug-comeback": "Could Neuroinflammation Bring CNS Drug Development Back?",
  "next-generation-obesity-therapy-directions": "Weight-Loss Drugs Are No Longer Only About Body Weight: Where Next-Generation Therapies Are Aiming",
  "old-targets-differentiation-strategy": "Old Targets Are Crowded, but They Can Still Make Money",
  "ox2r-cns-narcolepsy-opportunity": "Why OX2R Is Heating Up: From Narcolepsy to the Next CNS Drug Opportunity",
  "pan-ras-patent-safety-war": "The Shadow Behind the Next Century-Defining Drug",
  "pfizer-vepdegestrant-strategy-mistake": "Where Pfizer Misjudged the Vepdegestrant Strategy",
  "pharma-ai-capability-future": "Drugmakers Without AI Capability May No Longer Be Called Drugmakers",
  "pharma-pipeline-bd-attraction": "What Makes a Pipeline Attractive to Big Pharma?",
  "pharmaessentia-besremi-mpn-valuation": "How PharmaEssentia's Besremi Opens a Larger Valuation Imagination",
  "pluvicto-radioligand-therapy-growth": "Pluvicto Is Selling Fast: What Radioligand Therapy Growth Really Means",
  "retatrutide-obesity-surgery-level-weight-loss": "Retatrutide Moves Toward Surgery-Level Weight Loss: Lilly's Triple-Agonist Pushes Obesity Treatment Into a New Arena",
  "sinphar-cx5461-ras-pancreatic-cancer": "RAS Targeting Opens a New Pancreatic-Cancer Window: How Senhwa's CX-5461 Positions for the Next Resistance-Management War",
  "sun-pharma-organon-acquisition": "The Ambition of an Indian Pharma Giant: Acquiring a US Drugmaker",
  "taipei-biotech-npv-workshop": "Free Taipei Workshop: Using an NPV Framework to Identify Biotech Re-Rating Points",
  "taiwan-biotech-valuation-framework": "The First Step in Valuing Taiwanese Biotech: Stop Forcing Every Company Into the Same P/E Ratio",
  "tavneos-safety-data-integrity-crisis": "The Tavneos Crisis: Death Reports, Data-Integrity Questions, and an Amgen Rare-Disease Star at the Edge of Withdrawal",
  "topical-jak-inhibitor-skin-delivery": "Starting With Ruxolitinib Cream: Why Not Every JAK Molecule Can Become a Topical Drug",
  "weight-loss-side-effect-new-track": "A New Weight-Loss Drug Side Effect Accidentally Opens a New Therapeutic Track"
};

const categoryLabels = {
  "商業分析系列": "Business Analysis",
  "基本面系列": "Fundamental Analysis",
  "醫學大會": "Medical Conference",
  "付費深度商業分析文章系列": "Paid Deep-Dive Analysis",
  "製藥巨頭系列": "Big Pharma",
  "公司研究": "Company Research",
  "BD / 授權": "BD and Licensing",
  "臨床與 CMC": "Clinical and CMC",
  "IR 與資本市場": "IR and Capital Markets",
  "生技估值": "Biotech Valuation",
  "活動紀錄": "Events"
};

const tagRules = [
  [/ai|nvidia|google|amazon|artificial/i, "AI drug discovery"],
  [/glp|obesity|weight|retatrutide|tirzepatide|mounjaro|減肥|瘦/i, "Obesity medicine"],
  [/car-t|cart/i, "CAR-T"],
  [/adc|dac|protac/i, "Targeted therapy"],
  [/alzheim|amyloid|tau|cns|neuro|ox2r|depress|brain|neuralink/i, "CNS"],
  [/radiopharma|pluvicto|lantheus|curium|核藥/i, "Radiopharma"],
  [/fda|withdrawal|regulatory|cdc/i, "Regulatory risk"],
  [/lilly|pfizer|merck|johnson|gilead|biogen|takeda|daiichi|sun pharma/i, "Big Pharma"],
  [/bd|licensing|acquisition|m&a|deal|授權|併購/i, "Business development"],
  [/valuation|capital|ir|npv|估值|資本/i, "Capital markets"],
  [/asthma|copd|immune|autoimmune|aatd|rare|罕見|自體免疫/i, "Immunology"],
  [/clinical|phase|trial|pivotal|臨床/i, "Clinical development"]
];

function slugify(input, fallback) {
  const slug = String(input || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
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
  return `${meta.date}-${meta.slug || slugify(meta.title, "article")}.html`;
}

function titleFor(slug, sourceTitle) {
  return titleOverrides[slug] || slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1))
    .join(" ") || sourceTitle;
}

function tagsFor(meta, englishTitle) {
  const haystack = `${meta.slug || ""} ${meta.title || ""} ${englishTitle} ${(meta.tags || []).join(" ")}`;
  const tags = new Set([categoryLabels[meta.category] || "Biotech analysis"]);
  for (const [rule, tag] of tagRules) {
    if (rule.test(haystack)) tags.add(tag);
  }
  tags.add("Biotech business analysis");
  tags.add("Drug development");
  return [...tags].slice(0, 8);
}

function summaryFor(meta, englishTitle, tags) {
  const topic = categoryLabels[meta.category] || "biotech business analysis";
  const theme = tags.find((tag) => !["Biotech business analysis", "Drug development", topic].includes(tag)) || "company strategy";
  return `A Drugnews English brief on ${englishTitle}, focusing on ${theme.toLowerCase()}, clinical evidence, company strategy, business development, and biotech capital-market implications.`;
}

function bodyFor(meta, englishTitle, englishSummary, tags, sourceUrl) {
  const topic = categoryLabels[meta.category] || "Biotech Business Analysis";
  const primaryTag = tags.find((tag) => tag !== topic) || "Drug development";
  return `# ${englishTitle}

This English edition is adapted from Drugnews' Chinese analysis for global biotech, pharmaceutical, investor-relations, and capital-market readers.

## Core Thesis

${englishSummary}

The central question is not whether the headline looks exciting. The real question is what the event changes about asset value, clinical risk, commercialization strategy, business-development optionality, and the way capital markets may reprice the company or therapeutic area.

## Why It Matters

For professional readers, ${primaryTag.toLowerCase()} should be read through a business-analysis lens. A single news event can reflect several layers at the same time: scientific plausibility, clinical execution, regulatory uncertainty, manufacturing and CMC risk, competitive positioning, financing pressure, and the possibility of future partnership or acquisition interest.

Drugnews reads these events by asking three practical questions. First, what evidence has actually improved? Second, which uncertainty remains unresolved? Third, does the new information make the asset, company, or sector more investable, more tradable, or simply more visible?

## Reading Framework

This article should be read as part of the Drugnews framework for biotech judgment:

- Scientific logic: whether the mechanism, modality, and disease setting make sense.
- Clinical translation: whether the evidence can move from data into patient benefit.
- Commercial value: whether differentiation, market size, pricing, and reimbursement can support a real product.
- BD relevance: whether the asset could become attractive to pharma partners or strategic buyers.
- Capital-market signal: whether the event changes expectations, timing, or valuation.

## What To Watch Next

The next layer of judgment depends on follow-up evidence. Readers should watch for clinical milestones, durability of data, safety signals, regulatory feedback, financing activity, peer readouts, competitive entrants, manufacturing readiness, and any licensing or M&A activity that confirms strategic value.

## Original Chinese Edition

This English page is designed to make Drugnews analysis searchable and readable for English-language audiences while preserving the Chinese original as the primary source edition.

Read the original Chinese article: [${meta.title}](${sourceUrl})

---

This article is intended for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.`;
}

async function loadCandidates() {
  const entries = await fs.readdir(PUBLISHED, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(PUBLISHED, entry.name);
    const metaPath = path.join(dir, "meta.json");
    const articlePath = path.join(dir, "article.md");
    if (!(await exists(metaPath)) || !(await exists(articlePath))) continue;
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    if (/^en\b/i.test(meta.lang || "")) continue;
    const sourceSlug = meta.slug || entry.name;
    const englishSlug = `${sourceSlug}-en`;
    if (meta.translations?.en || await exists(path.join(PUBLISHED, englishSlug))) continue;
    candidates.push({ dir, entryName: entry.name, meta, metaPath, sourceSlug, englishSlug });
  }
  return candidates.sort((a, b) => new Date(b.meta.publish_at || b.meta.date) - new Date(a.meta.publish_at || a.meta.date));
}

async function writeEnglishArticle(candidate) {
  const sourceMeta = candidate.meta;
  const englishTitle = titleFor(candidate.sourceSlug, sourceMeta.title);
  const tags = tagsFor({ ...sourceMeta, slug: candidate.sourceSlug }, englishTitle);
  const summary = summaryFor(sourceMeta, englishTitle, tags);
  const targetDir = path.join(PUBLISHED, candidate.englishSlug);
  const sourceUrl = `${BASE_URL}/articles/${articleFileName({ ...sourceMeta, slug: candidate.sourceSlug })}`;
  await fs.mkdir(targetDir, { recursive: true });

  const englishMeta = {
    title: englishTitle,
    slug: candidate.englishSlug,
    date: sourceMeta.date,
    publish_at: sourceMeta.publish_at,
    category: sourceMeta.category,
    series: sourceMeta.series || sourceMeta.category,
    access: sourceMeta.access || "免費文章",
    lang: "en",
    translations: {
      "zh-Hant": articleFileName({ ...sourceMeta, slug: candidate.sourceSlug })
    },
    tags,
    summary,
    cover_image: SHARED_COVER,
    cover_image_alt: "Drugnews English biotech and pharmaceutical business analysis cover",
    source_platform: "Website",
    editorial_note: "No-API English scaffold. Upgrade manually or with the API translator for full paragraph-by-paragraph translation."
  };

  await fs.writeFile(path.join(targetDir, "meta.json"), `${JSON.stringify(englishMeta, null, 2)}\n`);
  await fs.writeFile(path.join(targetDir, "article.md"), `${bodyFor(sourceMeta, englishTitle, summary, tags, sourceUrl)}\n`);

  sourceMeta.lang = sourceMeta.lang || "zh-Hant";
  sourceMeta.slug = candidate.sourceSlug;
  sourceMeta.translations = {
    ...(sourceMeta.translations || {}),
    en: `${sourceMeta.date}-${candidate.englishSlug}.html`
  };
  await fs.writeFile(candidate.metaPath, `${JSON.stringify(sourceMeta, null, 2)}\n`);

  return { source: candidate.sourceSlug, target: candidate.englishSlug, title: englishTitle };
}

async function main() {
  const candidates = await loadCandidates();
  const report = {
    generated_at: new Date().toISOString(),
    mode: "no_api_english_scaffold",
    cover_image: SHARED_COVER,
    total_created: 0,
    created: []
  };
  for (const candidate of candidates) {
    const created = await writeEnglishArticle(candidate);
    report.created.push(created);
    console.log(`Created ${created.target}`);
  }
  report.total_created = report.created.length;
  await fs.writeFile(path.join(ROOT, "content", "english-scaffold-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Created ${report.total_created} English scaffold article(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
