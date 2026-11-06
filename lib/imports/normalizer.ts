import { parseISO, isValid } from "date-fns";

export function cleanText(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

export function cleanNumeric(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }

  const s = String(val).trim();
  if (
    !s ||
    ["nan", "none", "null", "-", "n/a", "na", ""].includes(s.toLowerCase())
  ) {
    return null;
  }

  // Remove commas, currency symbols, percentages, and spaces
  const sanitized = s.replace(/[,%$ ]/g, "");
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? null : parsed;
}

export function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isValid(val) ? val : null;
  }

  const s = String(val).trim();
  if (!s) return null;

  // Try ISO parse
  try {
    const isoDate = parseISO(s);
    if (isValid(isoDate)) return isoDate;
  } catch {}

  // Fallback native date parse
  const d = new Date(s);
  return isValid(d) ? d : null;
}

