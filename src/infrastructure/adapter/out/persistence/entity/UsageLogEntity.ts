/**
 * Shape of a row in the `usage_log` table — snake_case, SQLite's
 * column types (no native boolean/Date). Kept separate from
 * UsageRecord (the application/out port's type) so the table's
 * physical shape can drift from the port's contract without the two
 * being forced to match column-for-column.
 */
export interface UsageLogEntity {
  readonly requested_at: string;
  readonly filter_applied: string;
  readonly entry_count: number;
  readonly result_count: number;
  readonly duration_ms: number;
  readonly source: string;
}
