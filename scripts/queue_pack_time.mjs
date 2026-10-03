// Recovery is an explicit operator action bound to the complete validated input.
// Normal packing still requires a future target; overdue recovery never changes it.
export function checkPackTime(publishAt, manifestSha, recoveryManifestSha = '', now = Date.now()) {
  const target = Date.parse(publishAt);
  if (recoveryManifestSha && (!/^[a-f0-9]{64}$/.test(recoveryManifestSha) || recoveryManifestSha !== manifestSha)) {
    throw new Error('RECOVERY_INPUT_BINDING_INVALID');
  }
  if (target > now) return;
  if (!recoveryManifestSha || !Number.isFinite(target) || now - target > 24 * 60 * 60 * 1000) {
    throw new Error('TARGET_NOT_FUTURE_STOP_FOR_GM');
  }
}
