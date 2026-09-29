import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { configuration, tick, network, ReleaseCoordinator, default as worker } from "./watchdog/worker.mjs";
import { releaseHealth } from "./build_release_health.mjs";

const at = "2026-09-22T08:00:00+08:00", later = "2026-09-22T08:35:00+08:00", commit = "a".repeat(40);
const job = { id: "1".repeat(32), at, blob: "b".repeat(40), paths: ["articles/2026-09-22-synthetic.html", "articles/2026-09-22-synthetic-en.html"] };
const config = { schema: 1, jobs: [job] };
const health = { schema: 1, commit, generated_at: at, eligible_until: at, jobs: [{ id: job.id, at, paths: job.paths }] };
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log("PASS", name); }
function harness(overrides = {}) {
  let current = {}, dispatches = 0, saves = 0;
  const io = { health: async () => null, exists: async () => false, identity: async () => commit, runs: async () => [], dispatch: async () => { dispatches++; return 123; }, ...overrides };
  return { io, get state() { return current; }, get dispatches() { return dispatches; }, get saves() { return saves; }, run: (now = at, options = {}) => tick({ config, state: current, now, io, persist: async value => { saves++; current = structuredClone(value); }, ...options }) };
}
await test("future article makes no network request or dispatch", async () => { const h = harness({ health: async () => { throw Error("network not expected"); } }); assert.equal((await h.run("2026-09-22T07:59:59+08:00")).status, "NO_UNCONFIRMED_DUE"); assert.equal(h.dispatches, 0); });
await test("missing due article dispatches original workflow once", async () => { const h = harness(); assert.equal((await h.run()).status, "ORIGINAL_WORKFLOW_DISPATCHED_NOT_PUBLISHED"); assert.equal(h.dispatches, 1); assert.equal(h.state.lastDispatch.uncertain, false); });
await test("repeated ticks during cooldown cannot duplicate dispatch", async () => { const h = harness(); await h.run(); assert.equal((await h.run("2026-09-22T08:05:00+08:00")).status, "WAITING_RETRY_COOLDOWN"); assert.equal(h.dispatches, 1); });
for (const status of ["queued", "in_progress", "waiting", "pending", "requested"]) await test("existing " + status + " run prevents another dispatch", async () => { const h = harness({ runs: async () => [{ status }] }); assert.equal((await h.run()).status, "WAITING_EXISTING_RUN"); assert.equal(h.dispatches, 0); });
await test("healthy receipt with missing English URL is still missing", async () => { const h = harness({ health: async () => health, exists: async p => !p.endsWith("-en.html") }); assert.equal((await h.run()).status, "ORIGINAL_WORKFLOW_DISPATCHED_NOT_PUBLISHED"); });
await test("full observed delivery stops further publication checks", async () => { const h = harness({ health: async () => health, exists: async () => true }); assert.equal((await h.run()).status, "PUBLIC_DELIVERY_OBSERVED_NOT_INDEPENDENT_E4"); assert.equal((await h.run()).status, "NO_UNCONFIRMED_DUE"); assert.equal(h.dispatches, 0); });
await test("HTTP/read uncertainty fails closed without dispatch", async () => { const h = harness({ health: async () => { throw Error("network down"); } }); await assert.rejects(() => h.run()); assert.equal(h.dispatches, 0); });
await test("changed or revoked ciphertext binding prevents dispatch", async () => { const h = harness({ identity: async () => { throw Error("QUEUE_BINDING_CHANGED"); } }); await assert.rejects(() => h.run(), /QUEUE_BINDING_CHANGED/); assert.equal(h.dispatches, 0); });
await test("dispatch network ambiguity preserves durable reservation", async () => { const h = harness({ dispatch: async () => { throw Error("lost response"); } }); assert.equal((await h.run()).status, "ACTION_REQUIRED_DISPATCH_UNCERTAIN"); assert.equal(h.state.lastDispatch.uncertain, true); assert.equal((await h.run(later)).status, "ACTION_REQUIRED_DISPATCH_UNCERTAIN"); });
await test("reservation is saved before network mutation", async () => { const h = harness(); h.io.dispatch = async () => { assert.equal(h.state.lastDispatch.uncertain, true); return 123; }; await h.run(); assert(h.saves >= 3); });
await test("retry waits for an actual completed dispatch receipt", async () => { const h = harness(); await h.run(); assert.equal((await h.run(later)).status, "WAITING_DISPATCH_RECEIPT"); assert.equal(h.dispatches, 1); });
await test("bounded retry after exact failed run then persistent failure alerts", async () => { const h = harness(); await h.run(); h.io.runs = async () => [{ id: 123, head_sha: commit, event: "workflow_dispatch", created_at: at, status: "completed", conclusion: "failure" }]; assert.equal((await h.run(later)).status, "ORIGINAL_WORKFLOW_DISPATCHED_NOT_PUBLISHED"); assert.equal((await h.run("2026-09-22T09:10:00+08:00")).status, "ACTION_REQUIRED_RETRY_LIMIT"); assert.equal(h.dispatches, 2); });
await test("unrelated completed run cannot authorize a retry", async () => { const h = harness(); await h.run(); for (const wrong of [{ id: 456, head_sha: commit }, { id: 123, head_sha: "f".repeat(40) }]) { h.io.runs = async () => [{ ...wrong, event: "workflow_dispatch", created_at: at, status: "completed" }]; assert.equal((await h.run(later)).status, "WAITING_DISPATCH_RECEIPT"); } assert.equal(h.dispatches, 1); });
await test("future/malformed public receipt cannot authorize delivery", async () => { const h = harness({ health: async () => ({ ...health, generated_at: "2026-10-02T08:00:00+08:00" }) }); await assert.rejects(() => h.run(), /HEALTH_INVALID/); assert.equal(h.dispatches, 0); });
await test("config rejects unapproved origin/path and oversize secret", () => { assert.throws(() => configuration(JSON.stringify({ ...config, jobs: [{ ...job, paths: ["https://evil.invalid/"] }] })), /CONFIG_PATH_INVALID/); assert.throws(() => configuration(" ".repeat(5121)), /CONFIG_SIZE_INVALID/); assert.deepEqual(configuration(JSON.stringify(config)), config); });
await test("newly due batch cannot bypass an ambiguous previous request", async () => { const h = harness({ dispatch: async () => { throw Error("lost response"); } }); await h.run(); const changed = { schema: 1, jobs: [{ ...job, id: "2".repeat(32) }] }; assert.equal((await h.run(later, { config: changed })).status, "ACTION_REQUIRED_DISPATCH_UNCERTAIN"); });

const auditJob = { job_id: job.id, state: "due", publish_at: at, title: "MUST_NOT_EXPORT", needles: ["PRIVATE"], articles: job.paths.map(url_path => ({ url_path, title: "SECRET_TITLE" })) };
const audit = { schema_version: 1, clock: at, jobs: [auditJob] };
await test("public health exports only required due fields", () => { const result = releaseHealth(audit, commit, at); assert.deepEqual(result.jobs[0], { id: job.id, at, paths: job.paths }); assert(!JSON.stringify(result).includes("PRIVATE")); assert(!JSON.stringify(result).includes("TITLE")); });
await test("future/revoked/held/superseded jobs never enter public health", () => { for (const state of ["validated_pending", "validated_revoked", "validated_superseded", "held"]) assert.equal(releaseHealth({ ...audit, jobs: [{ ...auditJob, state, publish_at: "2026-10-02T08:00:00+08:00" }] }, commit, at).jobs.length, 0); });
await test("future due or forged future clock fails closed", () => { assert.throws(() => releaseHealth({ ...audit, clock: "2026-10-02T08:00:00+08:00" }, commit, at)); assert.throws(() => releaseHealth({ ...audit, jobs: [{ ...auditJob, publish_at: "2026-10-02T08:00:00+08:00" }] }, commit, at)); });
await test("duplicate public job or wrong date URL fails closed", () => { assert.throws(() => releaseHealth({ ...audit, jobs: [auditJob, auditJob] }, commit, at)); assert.throws(() => releaseHealth({ ...audit, jobs: [{ ...auditJob, articles: [{ url_path: "articles/2026-09-23-wrong.html" }] }] }, commit, at)); });
await test("public HTTP endpoint cannot trigger a workflow", async () => assert.equal((await worker.fetch(new Request("https://worker.invalid/tick", { method: "POST" }))).status, 404));
await test("disabled coordinator never reads credentials or makes network calls", async () => { const c = new ReleaseCoordinator({}, { WATCHDOG_ENABLED: "false" }); assert.deepEqual(await (await c.fetch(new Request("https://internal/tick", { method: "POST" }))).json(), { status: "DISABLED" }); });
await test("transport posts only fixed workflow/main and contains no payload data", async () => { const requests = []; const io = network(async (url, options) => { requests.push({ url, options }); return Response.json({ workflow_run_id: 456 }); }, "test-only-not-real-token-value"); assert.equal(await io.dispatch(), 456); assert.equal(requests[0].url, "https://api.github.com/repos/drugnewsdrpan-droid/drugnews-site/actions/workflows/306978779/dispatches"); assert.equal(requests[0].options.body, '{"ref":"main"}'); assert.equal(requests[0].options.redirect, "error"); });
await test("bounded network response rejects a giant index-like body", async () => { const io = network(async () => new Response("x".repeat(32769)), "test-only-not-real-token-value"); await assert.rejects(() => io.health(), /RESPONSE_SIZE_LIMIT/); });
await test("run inventory requests one realistic-size result per filter and exact receipt", async () => { const calls = []; const run = { id: 123, workflow_id: 306978779, head_branch: "main", path: ".github/workflows/pages.yml", status: "completed", padding: "x".repeat(15000) }; const io = network(async url => { calls.push(url); return Response.json(url.endsWith("/actions/runs/123") ? run : { workflow_runs: [] }); }, "test-only-not-real-token-value"); assert.deepEqual(await io.runs({ run_id: 123 }), [run]); assert.equal(calls.length, 6); assert(calls.slice(0, 5).every(url => url.includes("per_page=1&status="))); });
await test("invalid calendar dates fail configuration and health", () => { assert.throws(() => configuration(JSON.stringify({ ...config, jobs: [{ ...job, at: "2026-02-30T08:00:00+08:00" }] })), /CALENDAR/); assert.throws(() => releaseHealth({ ...audit, clock: "2026-03-02T08:00:00+08:00", jobs: [{ ...auditJob, publish_at: "2026-02-30T08:00:00+08:00" }] }, commit, "2026-03-02T08:00:00+08:00"), /CALENDAR/); });
await test("configuration permits exact 08:00 and 20:00 only with unchanged size and identity guards", () => {
  for (const hour of ["08", "20"]) assert.equal(configuration(JSON.stringify({ ...config, jobs: [{ ...job, at: `2026-09-22T${hour}:00:00+08:00` }] })).jobs[0].at, `2026-09-22T${hour}:00:00+08:00`);
  for (const time of ["07:00:00+08:00", "09:00:00+08:00", "19:00:00+08:00", "21:00:00+08:00", "20:01:00+08:00", "20:00:01+08:00", "20:00:00Z", "20:00:00+09:00"]) assert.throws(() => configuration(JSON.stringify({ ...config, jobs: [{ ...job, at: `2026-09-22T${time}` }] })), /CONFIG_JOB_INVALID/);
  assert.throws(() => configuration(JSON.stringify({ ...config, jobs: [{ ...job, at: "2026-02-30T20:00:00+08:00" }] })), /CONFIG_CALENDAR_INVALID/);
  assert.throws(() => configuration(JSON.stringify({ ...config, jobs: [job, job] })), /CONFIG_JOB_INVALID/);
  assert.throws(() => configuration(" ".repeat(5121)), /CONFIG_SIZE_INVALID/);
});
await test("thirty queue health jobs pass and thirty-one fail closed at producer and observer", async () => {
  const jobs = Array.from({ length: 30 }, (_, index) => ({ ...auditJob, job_id: (index + 1).toString(16).padStart(32, "0") }));
  jobs[0].job_id = job.id;
  const result = releaseHealth({ ...audit, jobs }, commit, at);
  assert.equal(result.jobs.length, 30);
  const h = harness({ health: async () => result, exists: async () => true });
  assert.equal((await h.run()).status, "PUBLIC_DELIVERY_OBSERVED_NOT_INDEPENDENT_E4");
  assert.equal(h.dispatches, 0);
  assert.throws(() => releaseHealth({ ...audit, jobs: [...jobs, { ...auditJob, job_id: "f".repeat(32) }] }, commit, at), /HEALTH_INPUT_INVALID/);
  const oversized = harness({ health: async () => ({ ...result, jobs: [...result.jobs, { ...result.jobs[0], id: "f".repeat(32) }] }) });
  await assert.rejects(() => oversized.run(), /HEALTH_INVALID/);
  assert.equal(oversized.dispatches, 0);
  const compactJobs = Array.from({ length: 30 }, (_, index) => ({ ...job, id: (index + 1).toString(16).padStart(32, "0"), paths: ["articles/2026-09-22-a.html"] }));
  assert.equal(configuration(JSON.stringify({ schema: 1, jobs: compactJobs })).jobs.length, 30);
  assert.throws(() => configuration(JSON.stringify({ schema: 1, jobs: [...compactJobs, { ...job, id: "f".repeat(32), paths: [] }] })), /CONFIG_(INVALID|SIZE_INVALID)/);
});
await test("evening health is withheld before 20:00 and retains the morning delivery", () => {
  const eveningAudit = { ...auditJob, job_id: "2".repeat(32), publish_at: "2026-09-22T20:00:00+08:00" };
  const before = "2026-09-22T19:59:59+08:00";
  assert.deepEqual(releaseHealth({ ...audit, clock: before, jobs: [auditJob, { ...eveningAudit, state: "validated_pending" }] }, commit, before).jobs.map(j => j.id), [job.id]);
  assert.throws(() => releaseHealth({ ...audit, clock: before, jobs: [auditJob, eveningAudit] }, commit, before), /HEALTH_PUBLIC_JOB_INVALID/);
  assert.equal(releaseHealth({ ...audit, clock: eveningAudit.publish_at, jobs: [auditJob, eveningAudit] }, commit, eveningAudit.publish_at).jobs.length, 2);
  for (const time of ["19:00:00", "21:00:00", "20:01:00"]) assert.throws(() => releaseHealth({ ...audit, clock: "2026-09-23T08:00:00+08:00", jobs: [{ ...eveningAudit, publish_at: `2026-09-22T${time}+08:00` }] }, commit, "2026-09-23T08:00:00+08:00"), /HEALTH_PUBLIC_JOB_INVALID/);
});
await test("existing five-minute cron routes a 20:00 event to the original coordinator and publisher", async () => {
  const wrangler = JSON.parse(await fs.readFile(new URL("./watchdog/wrangler.jsonc", import.meta.url), "utf8"));
  assert.deepEqual(wrangler.triggers.crons, ["*/5 * * * *"]);
  const evening = { ...job, at: "2026-09-22T20:00:00+08:00" };
  const h = harness();
  let calls = 0;
  const event = { cron: wrangler.triggers.crons[0], scheduledTime: Date.parse(evening.at) };
  const env = { WATCHDOG_ENABLED: "true", COORDINATOR: {
    idFromName(name) { assert.equal(name, "drugnews-original-publisher"); return "original-coordinator"; },
    get(id) { assert.equal(id, "original-coordinator"); return { async fetch(url, options) {
      calls++; assert.equal(url, "https://internal/tick"); assert.equal(options.method, "POST");
      return Response.json(await h.run(new Date(event.scheduledTime), { config: { schema: 1, jobs: [evening] } }));
    } }; }
  } };
  await worker.scheduled(event, env);
  assert.equal(h.dispatches, 1);
  await worker.scheduled(event, env);
  assert.equal(calls, 2); assert.equal(h.dispatches, 1);
});
await test("same-day evening dispatch waits until 20:00 and repeated ticks never duplicate it", async () => {
  const evening = { ...job, id: "2".repeat(32), at: "2026-09-22T20:00:00+08:00", paths: ["articles/2026-09-22-evening.html"] };
  const both = configuration(JSON.stringify({ schema: 1, jobs: [job, evening] }));
  const requested = [];
  const h = harness({ health: async () => health, exists: async () => true, identity: async jobs => { requested.push(...jobs.map(j => j.id)); return commit; } });
  assert.equal((await h.run("2026-09-22T07:59:59+08:00", { config: both })).status, "NO_UNCONFIRMED_DUE");
  assert.equal((await h.run(at, { config: both })).status, "PUBLIC_DELIVERY_OBSERVED_NOT_INDEPENDENT_E4");
  assert.equal((await h.run("2026-09-22T19:59:59+08:00", { config: both })).status, "NO_UNCONFIRMED_DUE");
  assert.equal(h.dispatches, 0);
  assert.equal((await h.run(evening.at, { config: both })).status, "ORIGINAL_WORKFLOW_DISPATCHED_NOT_PUBLISHED");
  assert.deepEqual(requested, [evening.id]);
  assert.equal((await h.run("2026-09-22T20:00:01+08:00", { config: both })).status, "WAITING_RETRY_COOLDOWN");
  assert.equal(h.dispatches, 1);
  h.io.health = async () => ({ ...health, generated_at: evening.at, eligible_until: evening.at, jobs: [health.jobs[0], { id: evening.id, at: evening.at, paths: evening.paths }] });
  assert.equal((await h.run("2026-09-22T20:05:00+08:00", { config: both })).status, "PUBLIC_DELIVERY_OBSERVED_NOT_INDEPENDENT_E4");
  assert.equal((await h.run("2026-09-22T20:10:00+08:00", { config: both })).status, "NO_UNCONFIRMED_DUE");
  assert.equal(h.dispatches, 1);
  const ambiguous = harness({ dispatch: async () => { throw Error("lost response"); } });
  await ambiguous.run(at, { config: both });
  assert.equal((await ambiguous.run(evening.at, { config: both })).status, "ACTION_REQUIRED_DISPATCH_UNCERTAIN");
});
console.log(JSON.stringify({ suite: "automatic-release-watchdog-and-due-health", tests: passed, passed, failed: 0 }));
