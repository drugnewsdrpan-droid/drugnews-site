import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repoRoot, "guides", "data", "taiwan-biotech-universe.json");
const clinicalPath = path.join(repoRoot, "guides", "data", "taiwan-biotech-clinical.json");

const sources = [
  {
    marketCode: "TWSE",
    marketLabel: "上市",
    url: "https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
    industryField: "產業別",
    dateField: "出表日期",
    tickerField: "公司代號",
    nameField: "公司簡稱",
    fullNameField: "公司名稱",
    websiteField: "網址",
    listingDateField: "上市日期"
  },
  {
    marketCode: "TPEx",
    marketLabel: "上櫃",
    url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O",
    industryField: "SecuritiesIndustryCode",
    dateField: "Date",
    tickerField: "SecuritiesCompanyCode",
    nameField: "CompanyAbbreviation",
    fullNameField: "CompanyName",
    websiteField: "WebAddress",
    listingDateField: "DateOfListing"
  },
  {
    marketCode: "Emerging",
    marketLabel: "興櫃",
    url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_R",
    industryField: "SecuritiesIndustryCode",
    dateField: "Date",
    tickerField: "SecuritiesCompanyCode",
    nameField: "CompanyAbbreviation",
    fullNameField: "CompanyName",
    websiteField: "WebAddress",
    listingDateField: "DateOfListing"
  }
];

function trim(value) {
  return String(value || "").replace(/[\u3000\s]+$/g, "").trim();
}

function rocDateToIso(value) {
  const digits = trim(value).replace(/\D/g, "");
  if (digits.length !== 7) return "";
  const year = Number(digits.slice(0, 3)) + 1911;
  return `${year}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
}

function normalizeWebsite(value) {
  const cleaned = trim(value).replace(/^http：\/\//i, "http://");
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "Drugnews data index/1.0" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

const clinical = JSON.parse(await fs.readFile(clinicalPath, "utf8"));
const clinicalByTicker = new Map(clinical.companies.map((company) => [company.ticker, company]));
const sourcePayloads = await Promise.all(sources.map(async (source) => ({ source, rows: await fetchJson(source.url) })));

const companies = sourcePayloads.flatMap(({ source, rows }) => rows
  .filter((row) => trim(row[source.industryField]) === "22")
  .map((row) => {
    const ticker = trim(row[source.tickerField]);
    const clinicalCompany = clinicalByTicker.get(ticker);
    return {
      ticker,
      company: trim(row[source.nameField]),
      fullName: trim(row[source.fullNameField]),
      marketCode: source.marketCode,
      market: source.marketLabel,
      industry: "生技醫療業",
      listingDate: rocDateToIso(row[source.listingDateField]),
      officialWebsite: normalizeWebsite(row[source.websiteField]),
      hasClinicalEvidence: Boolean(clinicalCompany),
      clinicalAssetCount: clinicalCompany?.trials?.length || 0,
      relatedArticleCount: clinicalCompany?.relatedArticles?.length || 0
    };
  }));

companies.sort((a, b) => Number(a.ticker) - Number(b.ticker) || a.marketCode.localeCompare(b.marketCode));
const asOfDates = sourcePayloads.map(({ source, rows }) => rocDateToIso(rows[0]?.[source.dateField])).filter(Boolean).sort();
const counts = Object.fromEntries(sources.map((source) => [source.marketCode, companies.filter((company) => company.marketCode === source.marketCode).length]));

const output = {
  version: "1.0.0",
  asOf: asOfDates.at(-1) || new Date().toISOString().slice(0, 10),
  industryCode: "22",
  industry: "生技醫療業",
  scope: "臺灣證券交易所上市、證券櫃檯買賣中心上櫃與興櫃之生技醫療業公司母表。臨床證據欄位僅標示已由 Drugnews 逐筆核實的公司。",
  counts: { total: companies.length, ...counts },
  sources: sources.map(({ marketCode, marketLabel, url }) => ({ marketCode, market: marketLabel, url })),
  companies
};

await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${companies.length} companies to ${path.relative(repoRoot, outputPath)}`);
