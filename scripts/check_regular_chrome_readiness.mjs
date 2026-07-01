import { spawnSync } from "node:child_process";

function runAppleScript(lines) {
  const args = lines.flatMap((line) => ["-e", line]);
  const result = spawnSync("/usr/bin/osascript", args, { encoding: "utf8" });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim()
  };
}

function json(status, detail = {}) {
  console.log(JSON.stringify({ status, ...detail }, null, 2));
}

function runChromeAppleScript(action) {
  const byId = runAppleScript([`tell application id "com.google.Chrome" to ${action}`]);
  if (byId.ok || !/無法取得|Can’t get|Can't get|application id/i.test(byId.stderr || byId.stdout)) return byId;
  return runAppleScript([`tell application "Google Chrome" to ${action}`]);
}

const windows = runChromeAppleScript("get count of windows");

if (!windows.ok) {
  json("unavailable", {
    reason: "regular_chrome_not_scriptable",
    detail: windows.stderr || windows.stdout || "Cannot query Google Chrome by bundle id."
  });
  process.exit(0);
}

const windowCount = Number(windows.stdout || 0);
if (!windowCount) {
  json("unavailable", {
    reason: "regular_chrome_has_no_windows",
    window_count: 0
  });
  process.exit(0);
}

const probe = runChromeAppleScript('execute active tab of front window javascript "JSON.stringify({title:document.title,url:location.href,bodyLength:(document.body.innerText||\'\').length})"');

if (!probe.ok) {
  const message = probe.stderr || probe.stdout;
  const disabled = /AppleScript.*JavaScript|Apple 事件的 JavaScript|Allow JavaScript from Apple Events|功能已關閉/i.test(message);
  json("needs_chrome_permission", {
    reason: disabled ? "allow_javascript_from_apple_events_disabled" : "regular_chrome_dom_probe_failed",
    window_count: windowCount,
    next_step: "Chrome 選單列 -> 檢視 -> 開發人員 -> 允許 Apple 事件的 JavaScript。開啟後，Codex 才能從你平常已登入的 Chrome 直接讀 FB / Dcard 貼文正文與圖片。",
    detail: message
  });
  process.exit(0);
}

try {
  const page = JSON.parse(probe.stdout);
  json("ready", {
    window_count: windowCount,
    active_tab: page,
    note: "Regular Chrome can be read by local Apple Events. Daily social capture can use the logged-in page after the actual post tab is open."
  });
} catch {
  json("needs_attention", {
    reason: "regular_chrome_probe_returned_non_json",
    window_count: windowCount,
    detail: probe.stdout
  });
}
