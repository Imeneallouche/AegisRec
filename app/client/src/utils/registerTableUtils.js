/**
 * Format register cell values (arrays, objects, nested) for table display.
 */
export function formatRegisterCellValue(value) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "object" && value[0] !== null) {
      return JSON.stringify(value);
    }
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Union of all keys from row objects, stable sort for predictable column order.
 */
export function collectColumnKeys(rows) {
  if (!rows || !rows.length) return [];
  const keys = new Set();
  rows.forEach((row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((k) => keys.add(k));
    }
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

/**
 * Human-readable label from snake_case key.
 */
export function humanizeKey(key) {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
