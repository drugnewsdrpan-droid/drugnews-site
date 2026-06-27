import fs from "node:fs/promises";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const mode = process.argv[2] || "profile";
const arg = process.argv[3] || "https://www.dcard.tw/@drugnews";
const out = process.argv[4] || "/private/tmp/drugnews-dcard-latest.json";

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
      if (!msg.id || !this.pending.has(msg.id)) return;
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
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
  const page = tabs.find((tab) => tab.type === "page" && /dcard\.tw/.test(tab.url || "")) ||
    tabs.find((tab) => tab.type === "page");
  if (!page) throw new Error("No Chrome page target found. Start Chrome with --remote-debugging-port=9222 first.");
  const client = new Cdp(page.webSocketDebuggerUrl);
  await client.ready();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

async function navigate(client, url, delay = 6000) {
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

function normalizeTitle(title = "") {
  return String(title)
    .replace(/\s*-\s*藥時事 Drugnews \(@drugnews\).*$/u, "")
    .replace(/\s*\|\s*Dcard.*$/u, "")
    .trim();
}

function postId(url = "") {
  return String(url).match(/\/(?:post|p)\/(\d+)/)?.[1] || "";
}

function parsePublished(text = "") {
  const value = String(text);
  const now = new Date();
  const year = now.getFullYear();
  const exact = value.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2}):(\d{2})/);
  if (exact) {
    const [, month, day, hour, minute] = exact;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+08:00`;
  }
  const daysAgo = value.match(/(\d+)\s*天/);
  if (daysAgo) {
    const date = new Date(now.getTime() - Number(daysAgo[1]) * 24 * 60 * 60 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T10:30:00+08:00`;
  }
  return new Date().toISOString();
}

function upgradeImage(url = "") {
  return String(url).replace(/\/160\.(webp|jpe?g|png)(\?.*)?$/i, "/1280.$1");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

async function scrapeProfile(client, url) {
  await navigate(client, url);
  const data = await evalJson(client, `(() => {
    const links = [...document.querySelectorAll('a[href*="/post/"], a[href*="/p/"]')]
      .map((a) => ({ href: a.href.split('?')[0], text: a.innerText || "" }))
      .filter((item) => /\\/(post|p)\\/\\d+/.test(item.href));
    const seen = new Set();
    const uniqueLinks = links.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    }).slice(0, 8);
    return {
      title: document.title,
      url: location.href,
      bodyPreview: (document.body.innerText || '').slice(0, 800),
      anchorCount: document.querySelectorAll('a').length,
      articleCount: document.querySelectorAll('article').length,
      links: uniqueLinks
    };
  })()`);
  return data;
}

async function scrapePost(client, url) {
  await navigate(client, url);
  const raw = await evalJson(client, `(() => {
    const articles = [...document.querySelectorAll('article')]
      .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length);
    const article = articles[0] || document.querySelector('main') || document.body;
    const text = article.innerText || '';
    const title = (article.querySelector('h1')?.innerText || document.title || '').trim();
    const images = [...article.querySelectorAll('img')]
      .map((img) => {
        const rect = img.getBoundingClientRect();
        return {
          src: img.currentSrc || img.src || '',
          alt: img.alt || '',
          width: img.naturalWidth || rect.width || 0,
          height: img.naturalHeight || rect.height || 0,
          boxWidth: rect.width || 0,
          boxHeight: rect.height || 0
        };
      })
      .filter((img) => /megapx-assets\\.dcard\\.tw/.test(img.src))
      .filter((img) => img.boxWidth > 160 || img.width > 240)
      .map((img) => img.src);
    return { title, url: location.href.split('?')[0], text, images };
  })()`);

  const title = normalizeTitle(raw.title);
  return {
    title,
    published: parsePublished(raw.text),
    url: raw.url || url,
    articleText: raw.text,
    images: uniq((raw.images || []).map(upgradeImage))
  };
}

const client = await getClient();
try {
  let posts = [];
  let diagnostics;
  if (mode === "profile") {
    const profile = await scrapeProfile(client, arg);
    const links = profile.links || [];
    const first = links.find((item) => postId(item.href));
    if (first) posts = [await scrapePost(client, first.href)];
    diagnostics = { generated_at: new Date().toISOString(), source: arg, profile, links, selected_url: first?.href || "" };
  } else if (mode === "post") {
    posts = [await scrapePost(client, arg)];
    diagnostics = { generated_at: new Date().toISOString(), source: arg, selected_url: arg };
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }

  await fs.writeFile(out, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  await fs.writeFile(`${out}.diagnostics.json`, `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    out,
    diagnostics: `${out}.diagnostics.json`,
    importable_posts: posts.length,
    selected: posts.map((post) => ({
      title: post.title,
      url: post.url,
      published: post.published,
      images: post.images.length,
      text_length: post.articleText.length
    }))
  }, null, 2));
} finally {
  client.close();
}
