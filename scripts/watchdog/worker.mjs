// Independent clock and delivery observer. Only the existing main workflow can publish.
export const REPO = "drugnewsdrpan-droid/drugnews-site";
export const WORKFLOW = "306978779";
const API = "https://api.github.com/repos/" + REPO;
const SITE = "https://drugnews.com.tw/";
const ACTIVE = new Set(["queued", "in_progress", "waiting", "pending", "requested"]);
const MAX_BATCH = 3, COOLDOWN = 30 * 60 * 1000, MAX_ATTEMPTS = 2;
const encoder = new TextEncoder();
function fail(code) { throw new Error(code); }
export function configuration(text) {
  if (typeof text !== "string" || encoder.encode(text).length > 5120) fail("CONFIG_SIZE_INVALID");
  const config = JSON.parse(text);
  if (config.schema !== 1 || !Array.isArray(config.jobs) || config.jobs.length < 1 || config.jobs.length > 28) fail("CONFIG_INVALID");
  const seen = new Set();
  for (const job of config.jobs) {
    if (!/^[a-f0-9]{32}$/.test(job.id || "") || seen.has(job.id) || !/^\d{4}-\d{2}-\d{2}T08:00:00\+08:00$/.test(job.at || "") || !Number.isFinite(Date.parse(job.at)) || !/^[a-f0-9]{40}$/.test(job.blob || "") || !Array.isArray(job.paths) || job.paths.length < 1 || job.paths.length > 2) fail("CONFIG_JOB_INVALID");
    if (new Date(job.at).toISOString().slice(0, 10) !== job.at.slice(0, 10)) fail("CONFIG_CALENDAR_INVALID");
    seen.add(job.id);
    for (const p of job.paths) if (!/^articles\/\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(p) || !p.startsWith("articles/" + job.at.slice(0, 10) + "-")) fail("CONFIG_PATH_INVALID");
    if (new Set(job.paths).size !== job.paths.length) fail("CONFIG_PATH_DUPLICATE");
  }
  return config;
}

async function boundedJson(response, max = 32768) {
  const reader = response.body.getReader(); let size = 0, output = "";
  const decoder = new TextDecoder();
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); fail("RESPONSE_SIZE_LIMIT"); } output += decoder.decode(value, { stream: true }); }
  return JSON.parse(output + decoder.decode());
}

export function network(fetcher, token) {
  if (typeof token !== "string" || token.length < 20) fail("CREDENTIAL_MISSING");
  let requests = 0;
  const request = async (url, init = {}) => {
    if (++requests > 30) fail("SUBREQUEST_BUDGET");
    const response = await fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15000) });
    return response;
  };
  const github = async (suffix, authenticated = true, max = 32768) => {
    const response = await request(API + suffix, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Drugnews-release-watchdog", "X-GitHub-Api-Version": "2026-03-10", ...(authenticated ? { Authorization: "Bearer " + token } : {}) } });
    if (response.status !== 200) fail("GITHUB_READ_FAILED");
    return boundedJson(response, max);
  };
  return {
    async health() { const r = await request(SITE + "release-health.json", { headers: { "Cache-Control": "no-cache" } }); if (r.status === 404) return null; if (r.status !== 200) fail("HEALTH_READ_FAILED"); return boundedJson(r); },
    async exists(p) { const r = await request(SITE + p, { method: "HEAD", headers: { "Cache-Control": "no-cache" } }); if (![200, 404].includes(r.status)) fail("ARTICLE_READ_FAILED"); return r.status === 200; },
    async identity(jobs) {
      const workflow = await github("/actions/workflows/" + WORKFLOW);
      if (workflow.id !== Number(WORKFLOW) || workflow.path !== ".github/workflows/pages.yml" || workflow.state !== "active") fail("WORKFLOW_IDENTITY_INVALID");
      const ref = await github("/git/ref/heads/main", false);
      const sha = ref.object?.sha; if (!/^[a-f0-9]{40}$/.test(sha || "")) fail("MAIN_INVALID");
      for (const job of jobs) {
        const response = await request(API + "/contents/content/scheduled/" + job.id + ".dnq?ref=" + sha, { headers: { Accept: "application/vnd.github.object+json", "User-Agent": "Drugnews-release-watchdog" } });
        if (response.status !== 200) fail("QUEUE_BINDING_MISSING");
        const file = await boundedJson(response);
        if (file.type !== "file" || file.sha !== job.blob || file.path !== "content/scheduled/" + job.id + ".dnq") fail("QUEUE_BINDING_CHANGED");
      }
      return sha;
    },
    async runs(previous) {
      const runs = [];
      for (const status of ACTIVE) {
        const response = await github("/actions/workflows/" + WORKFLOW + "/runs?branch=main&per_page=1&status=" + status, true, 32768);
        if (!Array.isArray(response.workflow_runs)) fail("RUNS_INVALID");
        for (const run of response.workflow_runs) {
          if (run.workflow_id !== Number(WORKFLOW) || run.head_branch !== "main" || run.path !== ".github/workflows/pages.yml") fail("RUN_IDENTITY_INVALID");
          runs.push(run);
        }
        if (runs.some(run => ACTIVE.has(run.status))) return runs;
      }
      if (previous?.run_id) {
        const run = await github("/actions/runs/" + previous.run_id);
        if (run.id !== previous.run_id || run.workflow_id !== Number(WORKFLOW) || run.head_branch !== "main" || run.path !== ".github/workflows/pages.yml") fail("RUN_IDENTITY_INVALID");
        return [run];
      }
      const completed = await github("/actions/workflows/" + WORKFLOW + "/runs?branch=main&event=workflow_dispatch&per_page=1", true, 32768);
      if (!Array.isArray(completed.workflow_runs)) fail("RUNS_INVALID");
      for (const run of completed.workflow_runs) if (run.workflow_id !== Number(WORKFLOW) || run.head_branch !== "main" || run.path !== ".github/workflows/pages.yml") fail("RUN_IDENTITY_INVALID");
      return completed.workflow_runs;
    },
    async dispatch() {
      const response = await request(API + "/actions/workflows/" + WORKFLOW + "/dispatches", { method: "POST", headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "Drugnews-release-watchdog", "X-GitHub-Api-Version": "2026-03-10" }, body: JSON.stringify({ ref: "main" }) });
      if (response.status === 200) { const body = await boundedJson(response); if (!Number.isSafeInteger(body.workflow_run_id)) fail("DISPATCH_RECEIPT_INVALID"); return body.workflow_run_id; }
      if (response.status === 204) return null;
      fail("DISPATCH_REJECTED");
    }
  };
}

export async function tick({ config, state, now, io, persist }) {
  const time = new Date(now).getTime(); if (!Number.isFinite(time)) fail("CLOCK_INVALID");
  const fingerprint = JSON.stringify(config.jobs);
  if (state.fingerprint !== fingerprint) state = { fingerprint, confirmed: {}, attempts: state.attempts || {}, lastDispatch: state.lastDispatch };
  const due = config.jobs.filter(job => Date.parse(job.at) <= time && !state.confirmed[job.id]).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX_BATCH);
  if (!due.length) return { status: "NO_UNCONFIRMED_DUE", state };
  const health = await io.health();
  if (health && (health.schema !== 1 || !/^[a-f0-9]{40}$/.test(health.commit || "") || !Array.isArray(health.jobs) || health.jobs.length > 28 || !Number.isFinite(Date.parse(health.generated_at)) || Date.parse(health.generated_at) > time + 60000 || !Number.isFinite(Date.parse(health.eligible_until)) || Date.parse(health.eligible_until) > time + 60000)) fail("HEALTH_INVALID");
  if (health) for (const item of health.jobs) if (!/^[a-f0-9]{32}$/.test(item.id || "") || !Number.isFinite(Date.parse(item.at)) || Date.parse(item.at) > time || !Array.isArray(item.paths)) fail("HEALTH_INVALID");
  const missing = [];
  for (const job of due) {
    const matches = health?.jobs.filter(item => item.id === job.id && item.at === job.at && JSON.stringify(item.paths) === JSON.stringify(job.paths)) || [];
    const present = matches.length === 1 && (await Promise.all(job.paths.map(p => io.exists(p)))).every(Boolean);
    if (present) state.confirmed[job.id] = { at: new Date(time).toISOString(), commit: health.commit };
    else missing.push(job);
  }
  await persist(state);
  if (!missing.length) return { status: "PUBLIC_DELIVERY_OBSERVED_NOT_INDEPENDENT_E4", count: due.length, state };
  const sha = await io.identity(missing);
  const key = missing.map(job => job.id).sort().join(":");
  const previous = state.attempts[key];
  const runs = await io.runs(previous);
  if (runs.some(run => ACTIVE.has(run.status))) return { status: "WAITING_EXISTING_RUN", state };
  if (state.lastDispatch?.uncertain) return { status: "ACTION_REQUIRED_DISPATCH_UNCERTAIN", state };
  if (state.lastDispatch && time - state.lastDispatch.at < COOLDOWN) return { status: "WAITING_RETRY_COOLDOWN", state };
  if (previous?.count >= MAX_ATTEMPTS) return { status: "ACTION_REQUIRED_RETRY_LIMIT", state };
  if (previous && time - previous.at < COOLDOWN) return { status: "WAITING_RETRY_COOLDOWN", state };
  if (previous && !runs.some(run => run.event === "workflow_dispatch" && run.head_sha === previous.sha && (previous.run_id ? run.id === previous.run_id : (Date.parse(run.created_at) >= previous.at && Date.parse(run.created_at) <= previous.at + 120000)) && run.status === "completed")) return { status: "WAITING_DISPATCH_RECEIPT", state };
  // Persist reservation before the external effect. Ambiguous responses never auto-repeat.
  state.attempts[key] = { at: time, count: (previous?.count || 0) + 1, sha, uncertain: true };
  state.lastDispatch = state.attempts[key];
  await persist(state);
  try { const runId = await io.dispatch(); state.attempts[key].run_id = runId; state.attempts[key].uncertain = false; await persist(state); }
  catch { return { status: "ACTION_REQUIRED_DISPATCH_UNCERTAIN", state }; }
  return { status: "ORIGINAL_WORKFLOW_DISPATCHED_NOT_PUBLISHED", count: missing.length, state };
}

export class ReleaseCoordinator {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.serial = Promise.resolve(); }
  fetch(request) {
    const result = this.serial.then(() => this.run(request));
    this.serial = result.catch(() => {});
    return result;
  }
  async run(request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/tick") return new Response("Not found", { status: 404 });
    try {
      if (this.env.WATCHDOG_ENABLED !== "true") return Response.json({ status: "DISABLED" });
      const config = configuration(this.env.RELEASE_EXPECTATIONS);
      const state = (await this.ctx.storage.get("state")) || {};
      const result = await tick({ config, state, now: new Date(), io: network(fetch, this.env.GITHUB_ACTIONS_TOKEN), persist: value => this.ctx.storage.put("state", value) });
      const safe = { status: result.status, count: result.count || 0, at: new Date().toISOString() };
      await this.ctx.storage.put("last_result", safe);
      if (safe.status.startsWith("ACTION_REQUIRED")) console.error(JSON.stringify(safe));
      return Response.json(safe);
    } catch { const safe = { status: "ACTION_REQUIRED_WATCHDOG_FAILED_CLOSED", at: new Date().toISOString() }; await this.ctx.storage.put("last_result", safe); console.error(JSON.stringify(safe)); return Response.json(safe, { status: 500 }); }
  }
}

export default {
  fetch() { return new Response("Not found", { status: 404 }); },
  async scheduled(_event, env) {
    if (env.WATCHDOG_ENABLED !== "true") return;
    const id = env.COORDINATOR.idFromName("drugnews-original-publisher");
    const response = await env.COORDINATOR.get(id).fetch("https://internal/tick", { method: "POST" });
    if (!response.ok) throw new Error("WATCHDOG_FAILED_CLOSED");
  }
};
