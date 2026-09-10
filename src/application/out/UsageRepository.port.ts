export type FilterApplied = 'long-titles' | 'short-titles' | 'none';

export interface UsageRecord {
  readonly requestedAt: Date;
  readonly filterApplied: FilterApplied;
  readonly entryCount: number;
  readonly resultCount: number;
  readonly durationMs: number;
  readonly source: 'cli' | 'api';
}

export interface UsageRepositoryPort {
  record(usage: UsageRecord): Promise<void>;
}
