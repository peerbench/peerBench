export type SortOption =
  | ""
  | "createdAt-asc"
  | "createdAt-desc"
  | "updatedAt-asc"
  | "updatedAt-desc";

export interface Filters {
  sortBy: SortOption;
  avgMin: number | "";
  avgMax: number | "";
  promptsMin: number | "";
  promptsMax: number | "";
  
}
