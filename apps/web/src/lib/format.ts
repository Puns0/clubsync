// ─── Format & Helper Utilities ───

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes cleanly with clsx and twMerge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`
): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

/**
 * Convert number to ordinal string (1 -> "1st", 2 -> "2nd", etc.)
 */
export function formatOrdinal(n: number): string {
  const pr = new Intl.PluralRules("en-US", { type: "ordinal" });
  const suffixes: Record<string, string> = {
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
  };
  return `${n}${suffixes[pr.select(n)] || "th"}`;
}

/**
 * Format college year (e.g. 3 -> "3rd Year")
 */
export function formatCollegeYear(year: number): string {
  return `${formatOrdinal(year)} Year`;
}
