export type FilterApplied = 'long-titles' | 'short-titles' | 'none';

export interface UsageRecord {
  readonly requestedAt: Date;
  readonly filterApplied: FilterApplied;
  readonly entryCount: number;
  readonly resultCount: number;
  readonly durationMs: number;
  readonly source: 'api';
}

export interface UsageRepositoryPort {
  record(usage: UsageRecord): Promise<void>;
}

/** Injection token: TS interfaces don't exist at runtime, so this is
 * what infrastructure/config binds an adapter to and what the service
 * asks for with @Inject(). */
export const USAGE_REPOSITORY_PORT = Symbol('UsageRepositoryPort');
