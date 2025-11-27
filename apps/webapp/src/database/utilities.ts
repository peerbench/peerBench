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
 * Infer any `SQLWrapper`'s expected return data type.
 * Also supports inferring an object "shape" from a `ColumnsSelection`.
 * @link https://github.com/emmnull/drizzle-orm-helpers
 */
export type InferData<T extends SQLWrapper | ColumnsSelection> =
  T extends ColumnsSelection
    ? {
        [K in keyof T]: T[K] extends SQLWrapper | ColumnsSelection
          ? InferData<T[K]>
          : T[K];
      }
    : T extends Table
      ? InferSelectModel<T>
      : T extends Column
        ? T["_"]["notNull"] extends true
          ? T["_"]["data"]
          : T["_"]["data"] | null
        : T extends View | Subquery
          ? T["_"]["selectedFields"]
          : T extends SQL<infer U>
            ? U
            : T extends SQL.Aliased<infer U>
              ? U
              : unknown;
