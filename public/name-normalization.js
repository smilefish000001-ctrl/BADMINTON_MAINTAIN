export function normalizeEntityName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/gu, " ");
}

export function entityNameKey(value) {
  return normalizeEntityName(value)
    .normalize("NFKC")
    .replace(/\s/gu, "")
    .toLocaleLowerCase("zh-Hant");
}

export function sameEntityName(left, right) {
  const leftKey = entityNameKey(left);
  return leftKey !== "" && leftKey === entityNameKey(right);
}
