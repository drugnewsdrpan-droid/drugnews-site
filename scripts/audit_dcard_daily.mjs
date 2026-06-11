import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const month = process.argv[2] || "2026-05";
const outPath = path.join(ROOT, "content", "dcard-import-gaps.json");
const externalPath = path.join(ROOT, "content", "external-articles.json");
const publishedDir = path.join(ROOT, "content", "published");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function daysInMonth(key) {
  const [year, monthNumber] = key.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function inMonth(date) {
  return String(date || "").startsWith(month);
}

const records = [];

if (fs.existsSync(externalPath)) {
  for (const item of readJson(externalPath)) {
    if (!inMonth(item.date)) continue;
    records.push({
      date: item.date,
      title: item.title,
      source: item.source || "external",
      access: item.access || "",
      url: item.url || "",
      status: item.source === "Dcard" ? "confirmed_dcard_link" : "candidate_non_dcard_source"
    });
  }
}

for (const folder of fs.readdirSync(publishedDir)) {
  const metaPath = path.join(publishedDir, folder, "meta.json");
  if (!fs.existsSync(metaPath)) continue;
  const meta = readJson(metaPath);
  if (!inMonth(meta.date)) continue;
  records.push({
    date: meta.date,
    title: meta.title,
    source: meta.source_platform || (meta.dcard_url ? "Dcard" : "website"),
    access: meta.access || "免費文章",
    url: meta.dcard_url || meta.facebook_url || `articles/${meta.date}-${meta.slug || folder}.html`,
    slug: meta.slug || folder,
    status: meta.dcard_url && /\/post\//.test(meta.dcard_url) ? "confirmed_dcard_link" : "site_article_no_confirmed_dcard_post"
  });
}

const byDate = new Map();
for (const record of records) {
  if (!byDate.has(record.date)) byDate.set(record.date, []);
  byDate.get(record.date).push(record);
}

const daily = [];
for (let day = 1; day <= daysInMonth(month); day += 1) {
  const date = `${month}-${String(day).padStart(2, "0")}`;
  const items = byDate.get(date) || [];
  const confirmed = items.filter((item) => item.status === "confirmed_dcard_link");
  daily.push({
    date,
    expected_dcard_posts: 1,
    confirmed_dcard_posts: confirmed.length,
    status: confirmed.length ? "confirmed" : "missing_confirmed_dcard_url",
    confirmed,
    candidates_from_other_sources: items.filter((item) => item.status !== "confirmed_dcard_link")
  });
}

const report = {
  month,
  updated_at: new Date().toISOString(),
  note: "Dcard API and public profile are blocked by Cloudflare in this environment. This audit only marks Dcard posts as confirmed when a real /@drugnews/post/ URL is available from local history, source files, or metadata. Other same-day Vocus/site records are candidates, not substitutes.",
  summary: {
    expected_days: daily.length,
    confirmed_days: daily.filter((day) => day.status === "confirmed").length,
    missing_days: daily.filter((day) => day.status !== "confirmed").length,
    confirmed_dcard_posts: daily.reduce((sum, day) => sum + day.confirmed_dcard_posts, 0)
  },
  missing_dates: daily.filter((day) => day.status !== "confirmed").map((day) => day.date),
  daily
};

fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
