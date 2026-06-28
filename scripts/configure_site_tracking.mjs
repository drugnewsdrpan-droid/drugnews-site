import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SETTINGS_PATH = path.join(ROOT, "content", "site-settings.json");

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = ""] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));

function usage() {
  console.log(`Usage:
  node scripts/configure_site_tracking.mjs --ga4=G-XXXXXXXXXX --gsc=GOOGLE_SEARCH_CONSOLE_TOKEN

Notes:
  --ga4 must be a GA4 Measurement ID that starts with G-
  --gsc can be the content value from the Google Search Console HTML tag
  Either value can be omitted to keep the existing setting`);
}

function cleanGa4(value = "") {
  const id = String(value).trim();
  if (!id) return "";
  if (!/^G-[A-Z0-9]+$/i.test(id)) {
    throw new Error(`Invalid GA4 Measurement ID: ${id}. Expected format like G-XXXXXXXXXX.`);
  }
  return id.toUpperCase();
}

function cleanSearchConsole(value = "") {
  return String(value)
    .trim()
    .replace(/^<meta\s+name=["']google-site-verification["']\s+content=["']/i, "")
    .replace(/["']\s*\/?>$/i, "")
    .replace(/^google-site-verification=/i, "")
    .trim();
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

function runNode(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}`);
  }
}

async function main() {
  if (args.has("help") || args.has("h")) {
    usage();
    return;
  }

  const current = await readJson(SETTINGS_PATH);
  const next = {
    ...current,
    google_analytics_id: args.has("ga4") ? cleanGa4(args.get("ga4")) : (current.google_analytics_id || ""),
    google_search_console_verification: args.has("gsc")
      ? cleanSearchConsole(args.get("gsc"))
      : (current.google_search_console_verification || "")
  };

  next.notes = {
    ...(current.notes || {}),
    google_analytics_id: "Fill with a GA4 Measurement ID such as G-XXXXXXXXXX to enable page-view and outbound-click tracking.",
    google_search_console_verification: "Use the content value from the Google Search Console HTML-tag verification method."
  };

  await fs.writeFile(SETTINGS_PATH, `${JSON.stringify(next, null, 2)}\n`);
  runNode("scripts/inject_analytics.mjs");

  console.log(JSON.stringify({
    status: "updated",
    google_analytics_id: next.google_analytics_id ? "configured" : "missing",
    google_search_console_verification: next.google_search_console_verification ? "configured" : "missing",
    settings_path: path.relative(ROOT, SETTINGS_PATH),
    next_step: "Run npm run audit:pm, then commit and deploy the changed settings plus generated HTML."
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  usage();
  process.exitCode = 1;
});
