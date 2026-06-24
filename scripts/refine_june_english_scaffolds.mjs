import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");

const refinements = {
  "pluvicto-radioligand-therapy-growth-en": {
    summary: "Pluvicto's rapid growth shows radioligand therapy moving from specialist science into a real commercial infrastructure story, where isotope supply, hospital workflow, and patient selection become strategic assets.",
    thesis: "Pluvicto is not only a fast-selling oncology product. It is a signal that radioligand therapy is becoming an industrial system: isotope sourcing, manufacturing, logistics, imaging, physician workflow, and reimbursement must all work together before the market can scale.",
    matters: "For investors, radiopharma should be analyzed less like a normal oncology pill and more like a complex healthcare infrastructure business. The winners are likely to be companies that control supply chains, clinical evidence, hospital access, and commercial execution at the same time."
  },
  "biogen-alzheimers-tau-biib080-strategy-en": {
    summary: "Biogen's BIIB080 tau program reflects a broader Alzheimer's reset: the field is no longer only asking whether amyloid matters, but whether tau biology can produce measurable disease-modifying benefit.",
    thesis: "Biogen's tau bet is important because Alzheimer's drug development is searching for the next credible axis after years of amyloid controversy. BIIB080 can only change the story if biomarker movement translates into clinical slowing that physicians, regulators, and payers can trust.",
    matters: "The investment question is not simply whether tau is a famous target. It is whether the study design, endpoints, patient selection, biomarker logic, safety profile, and competitive context can create a product that is meaningfully differentiated from existing Alzheimer's approaches."
  },
  "aatd-new-therapy-rna-gene-editing-en": {
    summary: "AATD is entering a new treatment cycle after decades of limited options, with RNA and gene-based approaches trying to move the field beyond symptom control and protein replacement.",
    thesis: "The AATD story matters because it shows how rare respiratory and liver diseases are becoming addressable through newer genetic-medicine tools. The key question is whether these approaches can deliver durable biological correction without creating new long-term safety risks.",
    matters: "For biotech readers, AATD should be watched as a translation case: mechanism, tissue delivery, durability, manufacturing, regulatory endpoints, and payer logic all have to align before a rare-disease scientific breakthrough becomes a commercial drug."
  },
  "retatrutide-obesity-surgery-level-weight-loss-en": {
    summary: "Retatrutide pushes obesity-drug efficacy toward surgery-level territory, but the real competitive battle will be durability, tolerability, body composition, comorbidity benefit, and access.",
    thesis: "Retatrutide is not just another GLP-1-related product. Its triple-agonist design suggests that obesity treatment is moving toward broader metabolic regulation, where weight loss, liver fat, cardiometabolic risk, and long-term maintenance may all matter.",
    matters: "Investors should avoid judging the asset only by peak weight-loss percentage. The next phase of obesity medicine will be decided by sustained outcomes, gastrointestinal tolerability, muscle preservation, dosing convenience, supply, reimbursement, and the ability to defend a differentiated label."
  },
  "topical-jak-inhibitor-skin-delivery-en": {
    summary: "Topical JAK drugs are not won by target biology alone. The real value lies in skin delivery, local exposure, systemic safety, indication choice, and whether the product can fit daily dermatology practice.",
    thesis: "Ruxolitinib cream proved that a JAK mechanism can become a dermatology product, but that does not mean every JAK molecule can succeed topically. Formulation, tissue exposure, safety margin, and patient convenience are part of the drug's actual value.",
    matters: "For biotech investors, topical delivery is a reminder that modality value depends on execution details. A familiar target can still produce a differentiated product if the company solves route of administration, tolerability, label strategy, and commercial positioning."
  },
  "old-targets-differentiation-strategy-en": {
    summary: "Crowded drug targets can still create value when companies differentiate through patient selection, formulation, route of administration, clinical design, pricing, or commercial channel strategy.",
    thesis: "An old target is not automatically a bad target. It becomes unattractive only when the new product cannot explain why it deserves a place against existing therapies. Differentiation may come from convenience, safety, combination logic, biomarker segmentation, or market access.",
    matters: "The business lesson is that novelty and value are not the same thing. Investors should ask whether a company has a clear wedge into an existing market, not whether the mechanism sounds brand new."
  },
  "pharma-ai-capability-future-en": {
    summary: "AI is becoming a core operating capability for pharma, but its value comes from improving discovery, translation, trial design, and portfolio decisions rather than from marketing language alone.",
    thesis: "Drugmakers without real AI capability may struggle because AI is moving from a slide-deck buzzword into the operating system of R&D. The important question is whether AI improves decisions that used to be slow, expensive, and failure-prone.",
    matters: "For readers, the test is practical. Does AI help a company choose better targets, design better molecules, run smarter experiments, identify responders, reduce clinical failure, or allocate capital more effectively? If not, it is not yet a moat."
  },
  "cart-autoimmune-new-era-en": {
    summary: "CAR-T's move from blood cancer into autoimmune disease could redefine cell therapy, but the value depends on whether deep immune reset can justify manufacturing complexity, safety risk, and cost.",
    thesis: "Autoimmune CAR-T is important because it changes the purpose of cell therapy. The goal is no longer only killing cancer cells, but potentially resetting pathogenic immune memory in diseases such as lupus and other antibody-driven disorders.",
    matters: "Investors should focus on durability of remission, steroid-free outcomes, relapse patterns, safety, manufacturing scalability, and whether the therapy can move from elite centers into a repeatable clinical model."
  },
  "biotech-ir-capital-market-story-en": {
    summary: "Biotech IR is not cosmetic storytelling. Good IR turns clinical, CMC, regulatory, commercial, and financing milestones into a capital-market narrative that investors can actually track.",
    thesis: "Biotech companies often fail to communicate because they present data points without explaining why those data points change value. Strong IR translates pipeline progress into an investable sequence of risks, milestones, and valuation drivers.",
    matters: "For listed biotech companies, IR is a strategic function. It helps the market understand what to watch, how to interpret clinical and regulatory events, and why the company deserves attention before the obvious catalyst arrives."
  }
};

function disclaimer() {
  return "This article is intended for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.";
}

function buildBody(meta, item, originalUrl, originalTitle) {
  return `# ${meta.title}

This English edition is adapted from Drugnews' Chinese analysis for global biotech, pharmaceutical, investor-relations, and capital-market readers.

## Core Thesis

${item.thesis}

## Why It Matters

${item.matters}

## Reading Framework

Drugnews reads this topic through five practical questions:

- What new evidence or business signal has actually changed?
- Which risks remain unresolved in clinical development, CMC, regulation, or commercialization?
- Does the event improve strategic optionality for partnership, licensing, financing, or M&A?
- Can the company convert scientific progress into durable market position?
- Does the information change valuation, or only create short-term attention?

## What To Watch Next

Readers should watch for follow-up data, trial design changes, safety signals, regulatory feedback, manufacturing readiness, payer response, competitive readouts, partnership activity, and whether management can turn the story into measurable execution.

## Original Chinese Edition

This English page is designed to make Drugnews analysis searchable and readable for English-language audiences while preserving the Chinese original as the primary source edition.

Read the original Chinese article: [${originalTitle}](${originalUrl})

${disclaimer()}
`;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const changed = [];
  for (const [slug, item] of Object.entries(refinements)) {
    const dir = path.join(PUBLISHED, slug);
    const metaPath = path.join(dir, "meta.json");
    const articlePath = path.join(dir, "article.md");
    const meta = await readJson(metaPath);
    const zhHref = meta.translations?.["zh-Hant"] || `${meta.date}-${String(slug).replace(/-en$/, "")}.html`;
    const originalUrl = `https://drugnews.com.tw/articles/${zhHref}`;
    let originalTitle = meta.title;
    try {
      const zhSlug = String(zhHref).replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.html$/, "");
      const zhMeta = await readJson(path.join(PUBLISHED, zhSlug, "meta.json"));
      originalTitle = zhMeta.title || originalTitle;
    } catch {
      // Keep the English title when a paired Chinese source folder is not obvious.
    }
    meta.summary = item.summary;
    meta.editorial_note = "Refined English editorial page with reader-facing analysis summary and SEO description.";
    meta.translation_status = "english_editorial_refined";
    meta.translation_updated_at = new Date().toISOString();
    await writeJson(metaPath, meta);
    await fs.writeFile(articlePath, buildBody(meta, item, originalUrl, originalTitle));
    changed.push(slug);
  }
  console.log(`Refined ${changed.length} June English scaffold page(s).`);
  console.log(changed.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
