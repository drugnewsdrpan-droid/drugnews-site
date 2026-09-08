import assert from "node:assert/strict";
import {safeForwardInventory, safeForwardFailures} from "./diagnose_scheduled_forward.mjs";
const fixture = () => ({schema_version:1, queue_digest:"a".repeat(64), jobs:[{job_id:"b".repeat(32), state:"validated_pending", publish_at:"2026-09-09T08:00:00+08:00", approved_content_hash:"c".repeat(64), needles:["PRIVATE_TITLE"], articles:[{lang:"zh", title:"PRIVATE_TITLE", slug:"PRIVATE_SLUG", body_sha256:"d".repeat(64), images:[1,2,3,4].map(order => ({order,sha256:"e".repeat(64),path:"PRIVATE_PATH"}))}]}]});
assert.doesNotMatch(JSON.stringify(safeForwardInventory(fixture())), /PRIVATE/);
for (const mutate of [
  value => {value.queue_digest="PRIVATE_DIGEST";},
  value => {value.jobs[0].job_id="PRIVATE_ID";},
  value => {value.jobs[0].state="PRIVATE_STATE";},
  value => {value.jobs[0].publish_at="PRIVATE_DATE";},
  value => {value.jobs[0].approved_content_hash="PRIVATE_HASH";},
  value => {value.jobs[0].articles[0].lang="PRIVATE_LANG";},
  value => {value.jobs[0].articles[0].images[0].order=4;},
  value => {value.jobs[0].articles[0].images[0].sha256="PRIVATE_HASH";},
  value => {value.jobs[0].articles[0].body_sha256="PRIVATE_BODY";},
]) {const value=fixture(); mutate(value); assert.throws(() => safeForwardInventory(value), /^Error: INVENTORY_INVALID$/);}
const safe = safeForwardFailures({message:"PRIVATE_MESSAGE", failures:[{job_id:"PRIVATE_ID",reason:"PRIVATE_REASON",surface:"PRIVATE_SURFACE"}]});
assert.doesNotMatch(JSON.stringify(safe), /PRIVATE/);
assert.deepEqual(safeForwardFailures({failures:[{job_id:"b".repeat(32),reason:"ENTRYPOINT_ZERO",surface:"companies.html"}]}), [{job_id:"b".repeat(32),code:"ENTRYPOINT_ZERO",surface:"companies.html"}]);
console.log(JSON.stringify({suite:"forward-summary-allowlist",status:"pass",checks:12}));
