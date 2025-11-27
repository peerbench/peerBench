export type SortOption =
  | ""
  | "createdAt-asc"
  | "createdAt-desc"
  | "updatedAt-asc"
  | "updatedAt-desc";

export interface Filters {
  sortBy: SortOption;
  avgMin: string;
  avgMax: string;
  promptsMin: string;
  promptsMax: string;
}
