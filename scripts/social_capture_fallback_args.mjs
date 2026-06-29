import fs from "node:fs";

const statusPath = process.argv[2] || "/private/tmp/drugnews-codex-daily-status.json";
const fbDiagnosticsPath = "/private/tmp/drugnews-facebook-latest.json.diagnostics.json";
const dcardDiagnosticsPath = "/private/tmp/drugnews-dcard-latest.json.diagnostics.json";

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function firstUsableCandidate(diagnostics) {
  const candidates = Array.isArray(diagnostics?.candidates) ? diagnostics.candidates : [];
  return candidates.find((candidate) => {
    const url = String(candidate?.url || "").trim();
    const title = String(candidate?.title || "").trim();
    return url && title;
  });
}

const status = readJsonSafe(statusPath);
const args = [];

if (status?.requests?.facebook) {
  const mode = String(status?.capture_mode?.facebook || "");
  if (!/logged_in_chrome_(post|current_tab)/.test(mode)) {
    const candidate = firstUsableCandidate(readJsonSafe(fbDiagnosticsPath));
    if (candidate?.url) args.push(`--facebook-post=${candidate.url}`);
  }
}

if (status?.requests?.dcard) {
  const mode = String(status?.capture_mode?.dcard || "");
  if (!/logged_in_chrome_(post|current_tab)/.test(mode)) {
    const candidate = firstUsableCandidate(readJsonSafe(dcardDiagnosticsPath));
    if (candidate?.url) args.push(`--dcard-post=${candidate.url}`);
  }
}

for (const arg of args) console.log(arg);
