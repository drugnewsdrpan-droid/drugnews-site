import fs from "node:fs/promises";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const mode = process.argv[2] || "profile";
const arg = process.argv[3] || "https://www.facebook.com/profile.php?id=61568446257142";
const out = process.argv[4] || "/private/tmp/drugnews-facebook-latest.json";

async function cdpJson(path) {
  const res = await fetch(`${endpoint}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  close() {
    this.ws.close();
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getClient() {
  const tabs = await cdpJson("/json/list");
  const page = tabs.find((tab) => tab.type === "page" && /facebook\.com/.test(tab.url || "")) ||
    tabs.find((tab) => tab.type === "page");
  if (!page) throw new Error("No Chrome page target found. Start Chrome with --remote-debugging-port=9222 first.");
  const client = new Cdp(page.webSocketDebuggerUrl);
  await client.ready();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

async function navigate(client, url, delay = 7000) {
  await client.send("Page.navigate", { url });
  await wait(delay);
}

async function evalJson(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return result.result.value;
}

function lineClean(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^[A-Za-z0-9]$/.test(line))
    .filter((line) => !/^(讚|留言|分享|傳送|追蹤|通知|管理粉絲專頁|專業主控板|刊登廣告|查看洞察報告)$/.test(line));
}

function plausibleTitle(lines) {
  const skipped = /^(藥時事|Facebook|分享對象|顯示較少|查看更多|今天|昨天|\d+\s*(分鐘|小時)|\d+\s*月\s*\d+\s*日)/;
  return lines.find((line) =>
    line.length >= 12 &&
    line.length <= 90 &&
    !skipped.test(line) &&
    !/^https?:\/\//.test(line) &&
    !/^(DRUGNEWS\.COM\.TW|CMY\.TW|VOCUS\.CC)/i.test(line)
  ) || "";
}

function postScore(candidate) {
  const text = candidate.articleText || "";
  let score = 0;
  const reasons = [];
  if (/permalink\.php\?story_fbid=/.test(candidate.url)) {
    score += 3;
    reasons.push("permalink");
  }
  if (text.length > 900) {
    score += 3;
    reasons.push("long_text");
  }
  if (/【\d{1,2}[｜|]|##|臨床|FDA|BD|授權|估值|Biotech|生技|藥廠|臨床數據/.test(text)) {
    score += 3;
    reasons.push("analysis_terms");
  }
  if ((candidate.images || []).length) {
    score += 1;
    reasons.push("images");
  }
  if (text.length < 600 || /查看更多/.test(text)) {
    score -= 4;
    reasons.push("truncated_or_short");
  }
  if (/報名|早鳥|課程|獲利班|立即報名|cmy\.tw|官網終於上線|DRUGNEWS\.COM\.TW/i.test(text)) {
    score -= 6;
    reasons.push("promo_or_announcement");
  }
  if (/未讀|notif_id=|comment_id=|reply_comment_id=/.test(candidate.url + text.slice(0, 160))) {
    score -= 5;
    reasons.push("notification_or_comment");
  }
  return { score, reasons };
}

function normalizeCandidate(raw) {
  const lines = lineClean(raw.articleText);
  const title = plausibleTitle(lines) || raw.title || "Drugnews Facebook post";
  const published = raw.published || new Date().toISOString();
  const articleText = lines.join("\n");
  const scored = postScore({ ...raw, title, published, articleText });
  return {
    title,
    slug: raw.slug || "",
    published,
    url: raw.url,
    articleText,
    images: raw.images || [],
    cover_image: "",
    cover_image_alt: `${title} 專題封面`,
    score: scored.score,
    reasons: scored.reasons
  };
}

function isImportableCurrentPost(post) {
  const url = String(post?.url || "");
  const text = String(post?.articleText || "");
  return Boolean(text.length >= 600 && /facebook\.com/.test(url) && /permalink\.php|story_fbid=|\/posts\//.test(url));
}

async function scrapeProfile(client, url) {
  await navigate(client, url, 8000);
  const rounds = Number(process.env.FACEBOOK_SCROLL_ROUNDS || 8);
  const all = new Map();
  let pageSnapshot = {};
  for (let i = 0; i < rounds; i += 1) {
    const snapshot = await evalJson(client, `(() => {
      const uniq = (arr) => [...new Set(arr.filter(Boolean))];
      const anchors = [...document.querySelectorAll('a[href*="permalink.php?story_fbid="]')]
        .filter(a => !/notif_id=|comment_id=|reply_comment_id=/.test(a.href));
      const out = [];
      for (const anchor of anchors) {
        let node = anchor;
        let best = anchor;
        for (let i = 0; node && i < 12; i += 1, node = node.parentElement) {
          const text = node.innerText || "";
          if (text.length > (best.innerText || "").length && text.length < 20000) best = node;
        }
        const text = best.innerText || "";
        const images = uniq([...best.querySelectorAll('img')].map(img => img.currentSrc || img.src || '').filter(src =>
          /scontent|fbcdn|xx\\.fbcdn/.test(src) &&
          !/emoji|static|safe_image|profile|p40x40|s40x40/.test(src)
        ));
        out.push({
          url: anchor.href.split('&__cft__')[0].split('&__tn__')[0],
          title: document.title,
          published: "",
          articleText: text,
          images
        });
      }
      return {
        title: document.title,
        url: location.href,
        bodyPreview: (document.body.innerText || '').slice(0, 900),
        anchorCount: document.querySelectorAll('a').length,
        articleCount: document.querySelectorAll('article').length,
        roleArticleCount: document.querySelectorAll('[role="article"]').length,
        permalinkCount: anchors.length,
        candidates: out
      };
    })()`);
    pageSnapshot = snapshot;
    for (const candidate of (snapshot.candidates || []).map(normalizeCandidate)) {
      const key = candidate.url.match(/story_fbid=([^&]+)/)?.[1] || candidate.url;
      const current = all.get(key);
      if (!current || candidate.score > current.score || candidate.articleText.length > current.articleText.length) {
        all.set(key, candidate);
      }
    }
    await evalJson(client, `window.scrollBy(0, Math.max(1100, window.innerHeight * 1.4)); true`);
    await wait(1500);
  }
  const candidates = [...all.values()].sort((a, b) => b.score - a.score || b.articleText.length - a.articleText.length);
  return {
    generated_at: new Date().toISOString(),
    source: url,
    page: {
      title: pageSnapshot.title || "",
      url: pageSnapshot.url || "",
      body_preview: pageSnapshot.bodyPreview || "",
      anchor_count: pageSnapshot.anchorCount || 0,
      article_count: pageSnapshot.articleCount || 0,
      role_article_count: pageSnapshot.roleArticleCount || 0,
      permalink_count: pageSnapshot.permalinkCount || 0
    },
    selected: candidates.filter((item) => item.score >= 5).slice(0, 1),
    candidates: candidates.slice(0, 8).map((item) => ({
      title: item.title,
      url: item.url,
      score: item.score,
      reasons: item.reasons,
      text_length: item.articleText.length,
      images: item.images.length,
      preview: item.articleText.slice(0, 220)
    }))
  };
}

async function scrapePost(client, url) {
  if (url) await navigate(client, url, 7000);
  const raw = await evalJson(client, `(() => {
    const main = document.querySelector('[role="main"]') || document.body;
    const article = [...main.querySelectorAll('[role="article"], div')].sort((a,b) => (b.innerText || '').length - (a.innerText || '').length)[0] || main;
    const images = [...new Set([...article.querySelectorAll('img')].map(img => img.currentSrc || img.src || '').filter(src => /scontent|fbcdn|xx\\.fbcdn/.test(src) && !/emoji|static|profile|p40x40|s40x40/.test(src)))];
    return { url: location.href.split('&__cft__')[0].split('&__tn__')[0], title: document.title, published: "", articleText: article.innerText || "", images };
  })()`);
  return normalizeCandidate(raw);
}

const client = await getClient();
try {
  let data;
  if (mode === "profile") data = await scrapeProfile(client, arg);
  else if (mode === "post") data = [await scrapePost(client, arg)];
  else if (mode === "current") {
    const post = await scrapePost(client, "");
    data = isImportableCurrentPost(post) ? [post] : [];
  }
  else throw new Error(`Unknown mode: ${mode}`);

  const importable = Array.isArray(data) ? data : data.selected;
  await fs.writeFile(out, `${JSON.stringify(importable, null, 2)}\n`, "utf8");
  await fs.writeFile(`${out}.diagnostics.json`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    out,
    diagnostics: `${out}.diagnostics.json`,
    importable_posts: importable.length,
    selected: importable.map((item) => ({ title: item.title, url: item.url, score: item.score, images: item.images.length }))
  }, null, 2));
} finally {
  client.close();
}
