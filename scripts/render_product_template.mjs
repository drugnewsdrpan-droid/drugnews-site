import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const templates = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const paragraphs = value => String(value ?? "").split(/\n\s*\n/).filter(Boolean).map(text => `<p>${escape(text)}</p>`).join("");
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
export const payloadHash = payload => crypto.createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex");
// Consume the final generated homepage and verified citation index, not a header candidate.
export function reportsDiscoveryErrors(homepageHTML, collectionHTML, verifiedArticles, origin) {
  const urls = (text, base) => [...text.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(m => {
    const url = new URL(m[1].replaceAll("&amp;", "&"), base);
    url.hash = ""; url.search = "";
    if (url.pathname.endsWith("/index.html")) url.pathname = url.pathname.slice(0, -10);
    return url.href;
  });
  const collectionURL = origin + "/reports/";
  const homepageURLs = urls(homepageHTML, origin + "/");
  const collectionURLs = urls(collectionHTML, collectionURL);
  const reports = verifiedArticles.filter(a => a.url.startsWith(collectionURL));
  const errors = [];
  if (!homepageURLs.includes(collectionURL)) errors.push("REPORTS_ENTRY_MISSING_FROM_FINAL_HOMEPAGE");
  for (const report of reports) if (!collectionURLs.includes(report.url)) errors.push("REAL_REPORT_MISSING_FROM_COLLECTION: " + report.url);
  for (const url of collectionURLs.filter(u => u.startsWith(collectionURL) && u !== collectionURL)) {
    if (!reports.some(r => r.url === url)) errors.push("UNVERIFIED_REPORT_LINK_IN_COLLECTION: " + url);
  }
  return { errors, verifiedReportCount: reports.length };
}
function httpsURL(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Official links must use HTTPS without credentials");
  return url.href;
}
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const scoreIn = (value, min, max) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
function accept(kind, payload, qa) {
  if (qa?.independent !== true || !nonempty(qa.author_id) || !nonempty(qa.reviewer_id) || qa.reviewer_id === qa.author_id || !scoreIn(qa.score, 95, 100) || qa.p0 !== 0 || qa.p1 !== 0 || qa.payload_sha256 !== payloadHash(payload)) throw new Error("Same-version independent acceptance is required");
  for (const key of ["title", "version", "updated_at", "source_owner"]) if (!nonempty(payload[key])) throw new Error(`Missing ${key}`);
  if (kind === "report") {
    if (!["zh-Hant", "en"].includes(payload.language) || !["full", "executive_summary"].includes(payload.coverage)) throw new Error("Actual language and full-report or executive-summary coverage are required");
    if (!nonempty(payload.summary) || !Array.isArray(payload.sections) || !payload.sections.length || !Array.isArray(payload.references) || !payload.references.length || !scoreIn(qa.article_ai_feel, 0, 20)) throw new Error("Complete report and article AI Feel acceptance are required");
    if (payload.sections.some(s => !nonempty(s?.heading) || !nonempty(s?.body)) || payload.references.some(r => !nonempty(r?.title) || !nonempty(r?.date) || !nonempty(r?.url))) throw new Error("Complete nonempty sections and dated source references are required");
    if (payload.other_language && payload.other_language.version !== payload.version) throw new Error("Language links must bind the same actual report version");
    if ((payload.figures?.length || 0) !== (qa.image_ai_feel?.length || 0) || qa.image_ai_feel?.some(n => !scoreIn(n, 0, 20))) throw new Error("Each original figure needs same-version acceptance");
    if (payload.figures?.some(f => !f.alt || !f.caption || !["zh-Hant", "en", "mixed"].includes(f.language) || !/^\/assets\/reports\/[^?]+\.(?:png|jpe?g|webp)$/.test(f.src) || f.src.includes(".."))) throw new Error("Original figure paths, language, captions and alt text are required");
    const positions = payload.sections.flatMap(s => s.figure_indices || []);
    if (positions.length !== (payload.figures?.length || 0) || new Set(positions).size !== positions.length || positions.some(n => !Number.isInteger(n) || n < 0 || n >= payload.figures.length)) throw new Error("Every accepted figure needs one explicit source position");
  } else {
    if (["company", "location", "employment_type", "salary", "valid_through", "responsibilities", "requirements", "official_apply_url"].some(key => !nonempty(payload[key]))) throw new Error("Employer-confirmed job information is required");
    httpsURL(payload.official_apply_url);
    if (qa.employer_publication_confirmed !== true || !(qa.payment_verified === true || qa.included_in_existing_contract === true) || !qa.commission_evidence_ref) throw new Error("Real commission and payment or existing-contract acceptance are required");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(payload.valid_through) || !Number.isFinite(Date.parse(payload.valid_through))) throw new Error("Confirmed deadline with Taipei timezone is required");
    if (new Date(Date.parse(payload.valid_through) + 8 * 60 * 60 * 1000).toISOString().slice(0, 19) !== payload.valid_through.slice(0, 19)) throw new Error("Deadline must be a real Taipei calendar date and time");
  }
}

// Renders a staging artifact only. Receipts never grant publication authority.
// Production publication remains with the original publisher and its live E4 gate.
export async function renderProductTemplate(kind, payload = {}, { preview = true, acceptance, now = new Date() } = {}) {
  if (!["report", "job"].includes(kind)) throw new Error("Unknown template kind");
  if (!preview) accept(kind, payload, acceptance);
  const english = kind === "report" && payload.language === "en";
  const banner = preview ? `<p class="preview">${english ? "Layout preview, not a published research report." : "版型預覽，非已發布研究報告或真實付費職缺。"}</p>` : "";
  const fields = { TITLE: escape(payload.title || (kind === "report" ? "產業研究報告｜版型預覽" : "職缺名稱（版型預覽）")), ROBOTS: preview ? '<meta name="robots" content="noindex,nofollow">' : "", PREVIEW_BANNER: banner };
  if (kind === "report") {
    const sections = payload.sections || (english ? [
      { heading: "Scientific and clinical evidence", body: "Placeholder for the original author's judgement, evidence and data dates.", figure: true },
      { heading: "Commercial structure and next evidence", body: "Placeholder for delivery, competition and the next observable milestone.", figure: true }
    ] : [
      { heading: "科學機制與臨床證據", body: "內容版位：研究作者的核心判斷、比較範圍、證據與資料日期。", figure: true },
      { heading: "商業結構與下一個追蹤點", body: "內容版位：交付、競爭、商業假設及下一個需驗證的節點。", figure: true }
    ]);
    const figureHTML = (figure, placeholder) => figure ? `<figure class="figure"><img src="${escape(figure.src)}" alt="${escape(figure.alt)}"><figcaption class="caption">${escape(figure.caption)} · ${english ? "Chart language" : "圖表語言"}：${escape(figure.language)}${figure.source_url ? ` · <a href="${escape(httpsURL(figure.source_url))}">${english ? "Original source" : "原始資料"}</a>` : ""}</figcaption></figure>` : placeholder ? `<figure class="figure"><div class="figure-space">${english ? "Original figure and reproducible data placeholder" : "原圖表與可重算資料版位"}</div><figcaption class="caption">${english ? "Caption, source, data date and original figure version" : "圖說、來源、資料日與原圖版本版位"}</figcaption></figure>` : "";
    Object.assign(fields, {
      LANG: english ? "en" : "zh-Hant", BRAND_LABEL: english ? "Drugnews | Industry research" : "Drugnews｜產業研究與報告解析",
      COVERAGE: payload.coverage === "executive_summary" ? "Executive Summary" : english ? "Full report" : "繁體中文完整報告",
      SUBTITLE: escape(payload.subtitle || (english ? "Same-version HTML and A4 print layout" : "HTML與A4列印版共用同版內容")),
      META: escape(english ? `Author: ${payload.author || "Original author pending"} · Data date: ${payload.updated_at || "Pending"} · Version: ${payload.version || "Preview"}` : `研究作者：${payload.author || "待原作者交稿"} · 資料日：${payload.updated_at || "待同版資料"} · 版本：${payload.version || "模板預覽"}`),
      SUMMARY_LABEL: english ? "Summary and core judgements" : "摘要與核心判斷", SOURCES_LABEL: english ? "Sources and data dates" : "來源與資料日期",
      FOOTER: english ? "Drugnews | Industry research and knowledge sharing. See the stated research and figure versions." : "Drugnews｜藥時事 · 產業研究與知識分享。研究與圖表版本以本頁註記為準。",
      LANGUAGE_LINK: payload.other_language?.href ? `<p><a href="${escape(httpsURL(payload.other_language.href))}" hreflang="${escape(payload.other_language.language)}">${escape(payload.other_language.label)}</a></p>` : "",
      SUMMARY: paragraphs(payload.summary || (english ? "Placeholder for a self-contained executive summary and usable judgement." : "內容版位：自成一篇的摘要，以及讀者看完後可以使用的核心判斷。")),
      CONTENTS: `<nav class="contents" aria-label="${english ? "Report contents" : "報告目錄"}"><h2>${english ? "Contents" : "目錄"}</h2><ol>${sections.map((section, i) => `<li><a href="#report-section-${i + 1}">${escape(section.heading)}</a></li>`).join("")}</ol></nav>`,
      SECTIONS: sections.map((section, i) => `<section class="report-section" id="report-section-${i + 1}"><h2>${escape(section.heading)}</h2>${paragraphs(section.body)}${(section.figure_indices || []).map(i => figureHTML(payload.figures[i], false)).join("")}${figureHTML(null, preview && section.figure)}</section>`).join(""),
      REFERENCES: payload.references?.length ? `<ol>${payload.references.map(r => `<li><a href="${escape(httpsURL(r.url))}">${escape(r.title)}</a>${r.date ? ` · ${escape(r.date)}` : ""}</li>`).join("")}</ol>` : english ? "<p>Placeholders for original sources, URLs, dates and checked versions.</p>" : "<p>來源名稱、原始網址、資料日期與查核版本版位。</p>",
      DOWNLOAD: ""
    });
    // A PDF link is omitted until a real file and its exact independent hash exist.
    if (!preview && payload.pdf) {
      if (payload.pdf.version !== payload.version) throw new Error("PDF must bind the same actual report version");
      const bytes = await fs.readFile(payload.pdf.path);
      if (crypto.createHash("sha256").update(bytes).digest("hex") !== acceptance.pdf_sha256 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Actual same-version accepted PDF is required");
      const href = String(payload.pdf.public_href);
      if (!href.startsWith("/assets/reports/") || href.includes("..") || !href.endsWith(".pdf")) throw new Error("PDF must use the original site's public report asset path");
      if (!["zh-Hant", "en"].includes(payload.pdf.language) || !acceptance.pdf_language || acceptance.pdf_language !== payload.pdf.language) throw new Error("Actual PDF language must be independently bound");
      const label = english ? `Download free PDF (${payload.pdf.language === "en" ? "English" : "Traditional Chinese"})` : `下載免費PDF（${payload.pdf.language === "en" ? "英文" : "繁體中文"}）`;
      fields.DOWNLOAD = `<p><a href="${escape(href)}" download>${label}</a></p>`;
    }
  } else {
    const expired = !preview && Date.parse(payload.valid_through) <= new Date(now).getTime();
    Object.assign(fields, {
      COMPANY: escape(payload.company || "企業名稱（待企業核可）"), LOCATION: escape(payload.location || "待企業提供"), EMPLOYMENT: escape(payload.employment_type || "待企業提供"), SALARY: escape(payload.salary || "待企業提供"), DEADLINE: escape(payload.valid_through || "待企業確認截止日期與台北時區"),
      RESPONSIBILITIES: paragraphs(payload.responsibilities || "企業核可的工作內容版位。"), REQUIREMENTS: paragraphs(payload.requirements || "企業核可的資格與條件版位。"),
      APPLY: preview ? '<p class="inactive">企業官方Apply入口版位，預覽不受理應徵。</p>' : expired ? '<p class="inactive">此職缺已截止。</p>' : `<a class="apply" href="${escape(httpsURL(payload.official_apply_url))}" target="_blank" rel="noopener">前往企業官方入口應徵</a>`
    });
  }
  return (await fs.readFile(path.join(templates, kind === "report" ? "research-report.html.tmpl" : "paid-job.html.tmpl"), "utf8")).replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => fields[key] ?? "");
}
