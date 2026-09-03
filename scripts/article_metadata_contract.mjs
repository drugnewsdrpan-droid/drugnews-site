export function strictCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function publicDateValidationError(meta) {
  if (!Object.hasOwn(meta || {}, "public_date")) return "";
  if (!strictCalendarDate(meta.public_date)) {
    return "meta.json field `public_date` is not a valid Gregorian YYYY-MM-DD date";
  }
  if (meta.public_date !== String(meta.publish_at || "").slice(0, 10)) {
    return "meta.json field `public_date` must match the Asia/Taipei date of `publish_at`";
  }
  return "";
}

export function validateSocialCoverPolicy(meta) {
  const errors = [];
  if (/^facebook$/i.test(meta?.source_platform || "")) {
    if (!meta.cover_image) {
      errors.push("Facebook article cover_image must be set to a generated website cover");
    } else if (/(^|\/)facebook-\d{2}\./i.test(meta.cover_image)) {
      errors.push("Facebook article cover_image must be a generated website cover, not an original facebook-XX body image");
    }
  }
  return errors;
}
