import {
  Column,
  ColumnsSelection,
  InferSelectModel,
  SQL,
  SQLWrapper,
  Subquery,
  Table,
  View,
} from "drizzle-orm";

/**
 * Infers the data type of the given column. If `IsNonNullable` is `true`, then
 * the data type inferred as non-nullable. Otherwise it leaves it as it is.
 */
export type InferColumn<
  T extends Column,
  IsNonNullable extends boolean = false,
> = IsNonNullable extends true
  ? T["_"]["data"]
  : T["_"]["notNull"] extends true
    ? NonNullable<T["_"]["data"]>
    : T["_"]["data"] | null;

/**
 * Infer any `SQLWrapper`'s expected return data type.
 * Also supports inferring an object "shape" from a `ColumnsSelection`.
 * @link https://github.com/emmnull/drizzle-orm-helpers
 */
export type InferData<
  T extends SQLWrapper | ColumnsSelection,
  IsNonNullable extends boolean = false,
> = T extends ColumnsSelection
  ? {
      [K in keyof T]: T[K] extends SQLWrapper | ColumnsSelection
        ? InferData<T[K]>
        : T[K];
    }
  : T extends Table
    ? InferSelectModel<T>
    : T extends Column
      ? IsNonNullable extends true
        ? T["_"]["data"]
        : T["_"]["notNull"] extends true
          ? T["_"]["data"]
          : T["_"]["data"] | null
      : T extends View | Subquery
        ? T["_"]["selectedFields"]
        : T extends SQL<infer U>
          ? U
          : T extends SQL.Aliased<infer U>
            ? U
            : unknown;
