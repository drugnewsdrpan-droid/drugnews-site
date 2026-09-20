// Private stdin pipe from queue_v3_keychain.py; never accept a key in argv/env.
// This calls the existing publisher's pack function, not a second publisher.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packBundle, payloadFromInput, parseEnvelope, decryptEnvelope, validatePayload } from "./scheduled_queue.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const chunks = [];
let key;
try {
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > 32) throw new Error("KEY_LENGTH_INVALID");
    chunks.push(chunk);
  }
  key = Buffer.concat(chunks);
  if (key.length !== 32 || process.argv.length !== 4) throw new Error("PACK_ARGUMENTS_INVALID");
  const inputRoot = await fs.realpath(process.argv[2]);
  const outputPath = path.resolve(process.argv[3]);
  if (inputRoot === root || inputRoot.startsWith(root + path.sep)) throw new Error("PRIVATE_INPUT_MUST_BE_OUTSIDE_REPO");
  if (outputPath !== path.join(root, "content/scheduled")) throw new Error("EXACT_QUEUE_OUTPUT_REQUIRED");
  const payload = await payloadFromInput(inputRoot);
  if (Date.parse(payload.publish_at) <= Date.now()) throw new Error("TARGET_NOT_FUTURE_STOP_FOR_GM");
  const finalPath = path.join(outputPath, `${payload.job_id}.dnq`);
  try { await fs.access(finalPath); throw new Error("QUEUE_JOB_ALREADY_EXISTS"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const receipt = await packBundle({ inputRoot, outputPath, key, keyId: "v3", repoRoot: root });
  const bytes = await fs.readFile(receipt.output);
  if (parseEnvelope(bytes, payload.job_id).keyId !== "v3") throw new Error("V3_ENVELOPE_ID_MISMATCH");
  const opened = decryptEnvelope(bytes, key, payload.job_id);
  try {
    const decoded = JSON.parse(opened.plaintext.toString("utf8"));
    validatePayload(decoded, payload.job_id);
    if (decoded.approved_content_hash !== payload.approved_content_hash || decoded.publish_at !== payload.publish_at) throw new Error("ROUNDTRIP_MISMATCH");
  } finally { opened.plaintext.fill(0); }
  console.log(JSON.stringify({ status: "V3_PACKED_NATIVE_GATES_PASS", key_id: "v3", ...receipt,
    approved_content_hash: payload.approved_content_hash, publish_at: payload.publish_at }));
} catch {
  // Never print payload, crypto errors, or process environment.
  console.log(JSON.stringify({ status: "FAIL_CLOSED", reason: "V3_PACK_FAILED" }));
  process.exitCode = 1;
} finally {
  key?.fill(0);
  for (const chunk of chunks) chunk.fill(0);
}
