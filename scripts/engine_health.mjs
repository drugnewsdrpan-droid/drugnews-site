#!/usr/bin/env node
// 藥時事引擎健康檢查（第 1 層：程式，不含 AI）。
// 只認結果：文章 URL 是否 200、首頁第一篇是否今天、明天的包在不在、存量幾天、有沒有退件。
// 輸出 status.json；任一「嚴重」項失敗時以非零碼結束，讓工作流程決定要不要再部署或開 issue。
//
//   node scripts/engine_health.mjs [--out content/engine/status.json] [--site https://drugnews.com.tw]
//                                  [--log content/engine/inbox-log.json] [--date YYYY-MM-DD] [--offline]

import fs from "node:fs";
import path from "node:path";

const args = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const m = argv[i].match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    if (m[2] !== undefined) args[m[1]] = m[2];
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) args[m[1]] = argv[++i];
    else args[m[1]] = "1";
  }
}

const ROOT = process.cwd();
const SITE = (args.site || process.env.DRUGNEWS_SITE || "https://drugnews.com.tw").replace(/\/$/, "");
const LOG = path.resolve(ROOT, args.log || "content/engine/inbox-log.json");
const OUT = path.resolve(ROOT, args.out || "content/engine/status.json");
const OFFLINE = args.offline === "1";
const STOCK_TARGET = Number(args.stock || 4);

function taipeiNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")), minute: Number(g("minute")) };
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const now = taipeiNow();
const TODAY = args.date || now.date;
const TOMORROW = addDays(TODAY, 1);
const EVENING = !args.date && now.hour >= 20; // 20:00 後「明天沒有包」升級為嚴重

async function head(url) {
  if (OFFLINE) return { status: null, skipped: true };
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", headers: { "user-agent": "drugnews-engine-health/1" } });
    return { status: r.status, text: r.ok ? await r.text() : "" };
  } catch (e) {
    return { status: 0, error: String(e.message || e) };
  }
}

const checks = [];
function add(id, ok, severity, value, detail) {
  checks.push({ id, ok: Boolean(ok), severity, value: value ?? null, detail: detail ?? "" });
}

let log;
try {
  log = JSON.parse(fs.readFileSync(LOG, "utf8"));
} catch (e) {
  add("inbox_log_readable", false, "critical", null, `讀不到 ${LOG}: ${e.message}`);
}

const packages = Object.entries(log?.packages || {}).map(([key, v]) => {
  const m = key.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  return { key, date: m?.[1] || null, slug: m?.[2] || v.slug || key, en: /-en$/.test(m?.[2] || v.slug || ""), ...v };
});
const zh = packages.filter((p) => p.date && p.kind !== "unknown" && !p.en);

// 1. 今天的中文文章
const todayZh = zh.filter((p) => p.date === TODAY);
const todayPub = todayZh.find((p) => p.status === "published" && p.url);
if (!todayZh.length) {
  add("today_article_exists", false, "critical", null, `投遞箱沒有 ${TODAY} 的中文文章包`);
} else if (!todayPub) {
  add("today_article_exists", false, "critical", todayZh.map((p) => `${p.key}:${p.status}`).join(","), "今天的包還不是 published");
} else {
  add("today_article_exists", true, "critical", todayPub.url, "");
  const r = await head(todayPub.url);
  add("today_article_200", r.skipped || r.status === 200, "critical", r.status, r.error || "");
  const enPkg = packages.find((p) => p.date === TODAY && p.en && p.status === "published" && p.url);
  if (enPkg) {
    const re = await head(enPkg.url);
    add("today_en_200", re.skipped || re.status === 200, "warn", re.status, re.error || "");
  } else {
    add("today_en_200", false, "warn", null, "沒有今天的英文版包");
  }
}

// 2. 首頁第一篇是今天
{
  const r = await head(`${SITE}/`);
  if (r.skipped) add("homepage_first_is_today", true, "critical", "skipped(offline)", "");
  else if (r.status !== 200) add("homepage_first_is_today", false, "critical", r.status, "首頁不是 200");
  else {
    const m = r.text.match(/href="(articles\/[^"]+)"/);
    const first = m?.[1] || "";
    add("homepage_first_is_today", first.startsWith(`articles/${TODAY}-`), "critical", first, first ? "" : "首頁找不到 articles/ 連結");
  }
}

// 3. 明天的包
{
  const t = zh.filter((p) => p.date === TOMORROW && (p.status === "pending" || p.status === "published"));
  add("tomorrow_package_ready", t.length > 0, EVENING ? "critical" : "warn", t.map((p) => p.key).join(",") || null, t.length ? "" : `投遞箱沒有 ${TOMORROW} 的中文包`);
}

// 4. 存量天數
{
  const future = new Set(zh.filter((p) => p.date > TODAY && (p.status === "pending" || p.status === "published")).map((p) => p.date));
  // 老闆原則：文章四天前寫好。少於 2 天＝嚴重（會叫人），少於 4 天＝缺（寫補單）。
  add("stock_days", future.size >= STOCK_TARGET, future.size < 2 ? "critical" : "warn", future.size, `目標 ≥${STOCK_TARGET}（<2 嚴重）；未來日期：${[...future].sort().join(",") || "無"}`);
}

// 5. 退件
{
  const rej = packages.filter((p) => p.status === "rejected" && p.kind !== "unknown");
  add("no_rejected_packages", rej.length === 0, "warn", rej.length, rej.map((p) => `${p.key}: ${p.reason || ""}`).join(" | "));
}

const failedCritical = checks.filter((c) => !c.ok && c.severity === "critical");
const failedWarn = checks.filter((c) => !c.ok && c.severity === "warn");
const status = {
  schema: 1,
  generated_at: new Date().toISOString(),
  taipei_date: TODAY,
  site: SITE,
  ok: failedCritical.length === 0,
  failed_critical: failedCritical.map((c) => c.id),
  failed_warn: failedWarn.map((c) => c.id),
  checks,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(status, null, 2) + "\n");

const lines = checks.map((c) => `${c.ok ? "✅" : c.severity === "critical" ? "❌" : "⚠️"} ${c.id} = ${JSON.stringify(c.value)}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(`[engine-health] ${TODAY} ${status.ok ? "OK" : "FAIL"}\n` + lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 引擎健康檢查 ${TODAY}：${status.ok ? "正常" : "失敗"}\n\n` + lines.map((l) => `- ${l}`).join("\n") + "\n");
}
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `ok=${status.ok ? 1 : 0}\nfailed_critical=${status.failed_critical.join(",")}\nfailed_warn=${status.failed_warn.join(",")}\n`);
}
process.exit(status.ok ? 0 : 2);
