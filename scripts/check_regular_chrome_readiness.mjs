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
  console.log(JSON.stringify({ status, generated_at: new Date().toISOString(), ...detail }, null, 2));
}

function runChromeAppleScript(action) {
  const byId = runAppleScript([`tell application id "com.google.Chrome" to ${action}`]);
  if (byId.ok || !/無法取得|Can’t get|Can't get|application id/i.test(byId.stderr || byId.stdout)) return byId;
  return runAppleScript([`tell application "Google Chrome" to ${action}`]);
}

function unsafeSocialEditorReason(url = "") {
  const value = String(url || "");
  if (/dcard\.tw\/new-post/i.test(value)) return "dcard_new_post_editor";
  if (/dcard\.tw\/my\/scheduled-posts/i.test(value)) return "dcard_scheduled_posts";
  if (/dcard\.tw\/f\/persona_drugnews\/postTask\//i.test(value)) return "dcard_post_task_editor";
  if (/facebook\.com\/.*(?:composer|stories\/create|posts\/creation|photo\/upload)/i.test(value)) return "facebook_editor_or_upload";
  return "";
}

function socialCaptureGuidance(url = "") {
  const unsafeReason = unsafeSocialEditorReason(url);
  if (unsafeReason) {
    return {
      unsafeReason,
      next_step: "目前 Chrome 停在發文 / 排程 / 編輯頁，不能匯入，避免未發布內容誤上官網。請改開已公開的 FB 或 Dcard 單篇貼文頁，再執行 /bin/zsh scripts/codex_daily_start.sh --facebook-regular-current 或 --dcard-regular-current。"
    };
  }
  if (/dcard\.tw\/(?:@drugnews\/post\/|f\/persona_drugnews\/p\/)\d+/i.test(url)) {
    return {
      unsafeReason: "",
      next_step: "目前看起來是 Dcard 公開單篇頁，可用 /bin/zsh scripts/codex_daily_start.sh --dcard-regular-current 匯入。"
    };
  }
  if (/facebook\.com\/.*(?:permalink\.php|\/posts\/|story_fbid=)/i.test(url)) {
    return {
      unsafeReason: "",
      next_step: "目前看起來是 Facebook 公開單篇頁，可用 /bin/zsh scripts/codex_daily_start.sh --facebook-regular-current 匯入。"
    };
  }
  return {
    unsafeReason: "",
    next_step: "若要匯入今日文章，請把平常 Chrome 切到已公開的 FB 或 Dcard 單篇貼文頁，再執行對應 regular-current 指令。"
  };
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
    next_step: "Chrome 選單列 -> 顯示方式 / View -> 開發人員選項 / Developer -> 允許 Apple 事件的 JavaScript / Allow JavaScript from Apple Events。開啟後，Codex 才能從你平常已登入的 Chrome 直接讀 FB / Dcard 貼文正文與圖片；若該選項是灰色不可點，改用社群擷取 Chrome 或提供貼文全文＋圖片。",
    detail: message
  });
  process.exit(0);
}

try {
  const page = JSON.parse(probe.stdout);
  const guidance = socialCaptureGuidance(page.url);
  if (guidance.unsafeReason) {
    json("unsafe_social_editor_tab", {
      reason: guidance.unsafeReason,
      window_count: windowCount,
      active_tab: page,
      next_step: guidance.next_step
    });
    process.exit(0);
  }
  json("ready", {
    window_count: windowCount,
    active_tab: page,
    next_step: guidance.next_step,
    note: "Regular Chrome can be read by local Apple Events. Daily social capture can use the logged-in page after the actual public post tab is open."
  });
} catch {
  const activeUrl = runChromeAppleScript("get URL of active tab of front window");
  const activeTitle = runChromeAppleScript("get title of active tab of front window");
  const guidance = socialCaptureGuidance(activeUrl.stdout);
  if (guidance.unsafeReason) {
    json("unsafe_social_editor_tab", {
      reason: guidance.unsafeReason,
      window_count: windowCount,
      active_tab: {
        title: activeTitle.stdout || "",
        url: activeUrl.stdout || "",
        bodyLength: null
      },
      next_step: guidance.next_step,
      detail: probe.stdout
    });
    process.exit(0);
  }
  json("needs_attention", {
    reason: "regular_chrome_probe_returned_non_json",
    window_count: windowCount,
    active_tab: {
      title: activeTitle.stdout || "",
      url: activeUrl.stdout || "",
      bodyLength: null
    },
    next_step: guidance.next_step,
    detail: probe.stdout
  });
}
