import fs from "node:fs/promises";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const mode = process.argv[2] || "profile";
const arg = process.argv[3] || "https://www.dcard.tw/@drugnews";
const out = process.argv[4] || "/private/tmp/dcard-scrape.json";

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
  const page = tabs.find((tab) => tab.type === "page");
  if (!page) throw new Error("No Chrome page target found");
  const client = new Cdp(page.webSocketDebuggerUrl);
  await client.ready();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

async function navigate(client, url, delay = 4500) {
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

async function scrapeProfile(client, url) {
  await navigate(client, url, 6500);
  const rounds = Number(process.env.DCARD_SCROLL_ROUNDS || 60);
  const all = new Map();
  for (let i = 0; i < rounds; i += 1) {
    const links = await evalJson(client, `(() => {
      return [...document.querySelectorAll('a[href*="/@drugnews/post/"]')]
        .map(a => ({ href: new URL(a.getAttribute('href'), location.href).href, text: a.innerText.trim() }))
        .filter(x => x.href.includes('/@drugnews/post/'));
    })()`);
    for (const link of links) all.set(link.href.split("?")[0], link);
    await evalJson(client, `window.scrollBy(0, Math.max(900, window.innerHeight * 1.2)); true`);
    await wait(1200);
  }
  return [...all.values()];
}

async function scrapePost(client, url) {
  await navigate(client, url, 5200);
  return evalJson(client, `(() => {
    const pick = (sel, attr) => {
      const el = document.querySelector(sel);
      return el ? (attr ? el.getAttribute(attr) : el.textContent) || "" : "";
    };
    const article = document.querySelector('article') || document.querySelector('main') || document.body;
    const rawText = article.innerText || "";
    const firstLineTitle = rawText.split(/\\n+/).map(line => line.trim()).find(Boolean) || "";
    const title = (document.querySelector('h1')?.innerText || firstLineTitle || pick('meta[property="og:title"]', 'content') || document.title || '')
      .replace(/\\s*-\\s*藥時事 Drugnews \\(@drugnews\\).*$/u, '')
      .replace(/\\s*\\|\\s*$/u, '')
      .replace(/\\s*Dcard\\s*$/u, '')
      .trim();
    const published = pick('meta[property="article:published_time"]', 'content')
      || document.querySelector('time[datetime]')?.getAttribute('datetime')
      || "";
    const articleText = rawText;
    const bodyText = document.body.innerText || "";
    const images = [...article.querySelectorAll('img')]
      .map(img => img.currentSrc || img.src || img.getAttribute('src') || '')
      .filter(src => /megapx-assets\\.dcard\\.tw\\/images\\//.test(src))
      .filter(src => !/\\/160\\.(webp|jpe?g|png)($|\\?)/i.test(src))
      .map(src => src.replace(/\\?.*$/, ''));
    const uniqueImages = [...new Map(images.map(src => {
      const id = src.match(/images\\/([^/]+)\\//)?.[1] || src;
      return [id, src];
    })).values()];
    return {
      url: location.href.split("?")[0],
      title,
      published,
      articleText,
      bodyText,
      images: uniqueImages,
      htmlTitle: document.title
    };
  })()`);
}

const client = await getClient();
try {
  let data;
  if (mode === "profile") data = await scrapeProfile(client, arg);
  else if (mode === "post") data = await scrapePost(client, arg);
  else if (mode === "posts") {
    const urls = JSON.parse(await fs.readFile(arg, "utf8"));
    data = [];
    for (const url of urls) data.push(await scrapePost(client, url));
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
  await fs.writeFile(out, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(Array.isArray(data) ? { count: data.length, out } : { out, title: data.title, published: data.published, images: data.images.length }, null, 2));
} finally {
  client.close();
}
