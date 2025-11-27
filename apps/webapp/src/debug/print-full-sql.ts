// CAUTION: Not for production use. Helpers for debugging purposes.

type HasToSQL = { toSQL: () => { sql: string; params: unknown[] } };

/**
 * Prints a Drizzle query as a fully runnable SQL string.
 * ⚠ For debugging / logging only. Do NOT execute interpolated SQL in production.
 */
export function printFullSql(qb: HasToSQL, label = "DRIZZLE QUERY") {
  const { sql, params } = qb.toSQL();
  const runnable = inlineParams(sql, params);

  console.log(`\n-- ${label}`);
  console.log(runnable + ";\n");
  return runnable;
}

function inlineParams(sql: string, params: unknown[]): string {
  // Handles Postgres-style placeholders ($1, $2, …) or "?" for SQLite/MySQL
  const isPg = /\$\d+/.test(sql);

  if (isPg) {
    return sql.replace(/\$(\d+)/g, (_, i) =>
      formatParam(params[Number(i) - 1])
    );
  }

  let idx = 0;
  return sql.replace(/\?/g, () => formatParam(params[idx++]));
}

function formatParam(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date)
    return `'${v.toISOString().replace("T", " ").replace("Z", "")}'`;
  if (Array.isArray(v)) return `ARRAY[${v.map(formatParam).join(", ")}]`;
  if (typeof v === "object") {
    try {
      const json = JSON.stringify(v);
      return `'${json.replace(/'/g, "''")}'::jsonb`;
    } catch {
      return `'[object]'`;
    }
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}
