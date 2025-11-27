import { DbTx } from "@/types/db";
import { db } from "./client";
import { PgColumn } from "drizzle-orm/pg-core";
import {
  ColumnDataType,
  ColumnBaseConfig,
  sql,
  SQL,
  SQLWrapper,
  SQLChunk,
  ColumnsSelection,
  StringChunk,
} from "drizzle-orm";
import { InferData } from "./utilities";

/**
 * Executes the given function using the given transaction or default DB connection
 * without creating a new transaction. Mostly used if you want to fallback to the
 * default DB connection rather than creating a new transaction so the actions
 * happened in `fn` can be considered as not an atomic transaction.
 */
export function withTxOrDb<T>(
  fn: (t: DbTx) => Promise<T>,
  tx?: DbTx
): Promise<T> {
  return tx ? fn(tx) : fn(db);
}

/**
 * Executes the given function using the given transaction or in a new
 * transaction created using the default DB connection. Mostly used if you
 * want to fallback to a new transaction so the actions happened in `fn` can be
 * considered as an atomic transaction.
 */
export function withTxOrTx<T>(
  fn: (t: DbTx) => Promise<T>,
  tx?: DbTx
): Promise<T> {
  return tx ? fn(tx) : db.transaction(fn);
}

export function excluded<T extends ColumnBaseConfig<ColumnDataType, string>>(
  column: PgColumn<T>
) {
  return sql.raw(`excluded.${column.name}`);
}

/**
 * Builds the following SQL query:
 * ```sql
 * EXISTS (
 *   SELECT 1 FROM ${params.from}
 *   WHERE ${params.where} -- If given
 *   GROUP BY ${params.groupBy} -- If given
 *   HAVING ${params.having} -- If given
 * )
 * ```
 */
export function exists1<TTable extends SQLWrapper>(params: {
  from: TTable;
  where?: SQLWrapper;
  groupBy?: SQLWrapper[];
  having?: SQLWrapper;
}) {
  const chunks: SQLChunk[] = [
    new StringChunk("(exists (select 1 from "),
    params.from,
  ];

  if (params.where) {
    chunks.push(new StringChunk(" where "));
    chunks.push(params.where);
  }

  if (params.groupBy) {
    chunks.push(new StringChunk(" group by "));
    chunks.push(sql.join(params.groupBy, new StringChunk(", ")));
  }

  if (params.having) {
    chunks.push(new StringChunk(" having "));
    chunks.push(params.having);
  }

  chunks.push(new StringChunk("))"));

  return sql.join(chunks);
}

/**
 * SQL `sum` function.
 */
export function sum<T extends number = number>(value: SQLWrapper) {
  return sql<T>`sum(${value})`.mapWith(Number);
}

/**
 * SQL `avg` function.
 */
export function avg<T extends number = number>(value: SQLWrapper) {
  return sql<T>`avg(${value})`.mapWith(Number);
}

/**
 * SQL `coalesce` function.
 */
export function coalesce<T extends SQLWrapper[]>(
  ...values: T
): SQL<InferData<T[number]>> {
  return sql<InferData<T[number]>>`coalesce(${sql.join(values, sql`, `)})`;
}

/**
 * Build objects using `jsonb_build_object(k1, v1, ...kn, vn). Since it is a jsonb method, it should
 * return an object with unwrapped value types instead of SQL wrapped types.
 * @link https://github.com/emmnull/drizzle-orm-helpers
 */
export function jsonbBuildObject<T extends ColumnsSelection>(shape: T) {
  const chunks: SQLChunk[] = [];
  Object.entries(shape).forEach(([key, value]) => {
    if (chunks.length > 0) {
      chunks.push(sql.raw(`,`));
    }
    chunks.push(sql.raw(`'${key}'`));
    chunks.push(sql.raw(`,`));
    chunks.push(sql`${value}`);
  });
  return sql<InferData<T>>`jsonb_build_object(${sql.join(chunks)})`;
}

/**
 * SQL `jsonb_agg` function.
 */
export function jsonbAgg<
  T extends SQLWrapper,
  NthItem extends number | undefined = undefined,
>(
  value: T,
  options?: {
    /**
     * Marks the aggregation as distinct.
     */
    distinct?: boolean;

    /**
     * If true then the query will be wrapped in a `coalesce` function
     * with a fallback to an empty jsonb array.
     */
    fallbackEmptyArray?: boolean;

    /**
     * Appends the given `where` statement to the aggregation as a `filter` clause.
     */
    filterWhere?: SQLWrapper;

    /**
     * Selects the given nth item from the result array of the aggregation.
     * e.g `jsonb_agg(value)->0`
     */
    nthItem?: NthItem;
  }
) {
  const chunks: SQLChunk[] = [];

  if (options?.fallbackEmptyArray) {
    chunks.push(new StringChunk("coalesce("));
  }
  chunks.push(new StringChunk("jsonb_agg("));
  if (options?.distinct) {
    chunks.push(new StringChunk("distinct "));
  }
  chunks.push(value);
  chunks.push(new StringChunk(")"));

  if (options?.filterWhere) {
    chunks.push(new StringChunk(" filter (where "));
    chunks.push(options.filterWhere);
    chunks.push(new StringChunk(")"));
  }

  if (options?.fallbackEmptyArray) {
    chunks.push(new StringChunk(","));
    chunks.push(emptyJsonbArrayValue<InferData<T>[]>());
    chunks.push(new StringChunk(")"));
  }

  if (options?.nthItem !== undefined) {
    chunks.push(new StringChunk(`->${options.nthItem}`));
  }

  return sql.join(chunks) as SQL<
    NthItem extends undefined ? InferData<T>[] : InferData<T> | null
  >;
}

/**
 * Empty jsonb array.
 */
export function emptyJsonbArrayValue<T = unknown>() {
  return sql.raw("'[]'::jsonb") as SQL<T[]>;
}

/**
 * Converts the given values to an interval string like below:
 * ```sql
 * INTERVAL '${values.years} years' + INTERVAL '${values.months} months' -- ....
 * ```
 */
export function intervalValue(values: {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}) {
  const chunks: SQLChunk[] = [];
  if (values.years) {
    if (chunks.length > 0) {
      chunks.push(new StringChunk(" + "));
    }
    chunks.push(new StringChunk(`INTERVAL '${values.years} years'`));
  }
  if (values.months) {
    if (chunks.length > 0) {
      chunks.push(new StringChunk(" + "));
    }
    chunks.push(new StringChunk(`INTERVAL '${values.months} months'`));
  }
  if (values.days) {
    if (chunks.length > 0) {
      chunks.push(new StringChunk(" + "));
    }
    chunks.push(new StringChunk(`INTERVAL '${values.days} days'`));
  }
  if (values.hours) {
    if (chunks.length > 0) {
      chunks.push(new StringChunk(" + "));
    }
    chunks.push(new StringChunk(`INTERVAL '${values.hours} hours'`));
  }
  if (values.minutes) {
    if (chunks.length > 0) {
      chunks.push(new StringChunk(" + "));
    }
    chunks.push(new StringChunk(`INTERVAL '${values.minutes} minutes'`));
  }
  if (values.seconds) {
    if (chunks.length > 0) {
      chunks.push(new StringChunk(" + "));
    }
    chunks.push(new StringChunk(`INTERVAL '${values.seconds} seconds'`));
  }

  return sql.join(chunks);
}

/**
 * Builds an SQL statement that takes the difference between the
 * two given values and returns it as an interval:
 * ```sql
 * (${value1} - ${value2})::interval
 * ```
 */
export function dateDiff(value1: SQLWrapper, value2: SQLWrapper) {
  return sql`(${value1} - ${value2})::interval`;
}
