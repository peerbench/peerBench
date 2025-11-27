import Decimal from "decimal.js";

/**
 * Formats the given decimal as human readable USD string.
 */
export function formatUsd(d: Decimal) {
  // Human-friendly formatting like $0.0043 or $1.2
  let str: string;

  if (d.lessThan(1)) {
    str = d.toFixed(14); // Max 14 decimal places
  } else if (d.lessThan(10)) {
    str = d.toFixed(1);
  } else {
    str = d.toFixed(0);
  }

  // Remove trailing zeros and decimal point if not needed
  str = str.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return `$${str}`;
}
