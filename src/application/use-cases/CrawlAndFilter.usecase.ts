import { HackerNewsEntry } from '../../domain/entities/HackerNewsEntry';
import { HackerNewsCrawlerPort } from '../../domain/ports/HackerNewsCrawler.port';
import { FilterApplied, UsageRepositoryPort } from '../../domain/ports/UsageRepository.port';
import { filterLongTitlesByComments, filterShortTitlesByPoints } from './FilterEntries.usecase';

export interface CrawlAndFilterRequest {
  entryCount: number;
  filter: FilterApplied;
  source: 'cli' | 'api';
}

export interface CrawlAndFilterResult {
  entries: HackerNewsEntry[];
  filterApplied: FilterApplied;
}

/**
 * Orchestrates a single "user interaction": crawl the top N entries,
 * apply the requested filter, and log the interaction (timestamp,
 * filter used, and enough context to analyze crawler behavior later)
 * regardless of whether the crawl succeeds or fails.
 */
export class CrawlAndFilterUseCase {
  constructor(
    private readonly crawler: HackerNewsCrawlerPort,
    private readonly usageRepository: UsageRepositoryPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(request: CrawlAndFilterRequest): Promise<CrawlAndFilterResult> {
    const requestedAt = this.clock();
    const startedAt = Date.now();

    try {
      const entries = await this.crawler.fetchTopEntries(request.entryCount);
      const filtered = this.applyFilter(entries, request.filter);

      await this.usageRepository.record({
        requestedAt,
        filterApplied: request.filter,
        entryCount: entries.length,
        resultCount: filtered.length,
        durationMs: Date.now() - startedAt,
        source: request.source,
      });

      return { entries: filtered, filterApplied: request.filter };
    } catch (error) {
      await this.usageRepository.record({
        requestedAt,
        filterApplied: request.filter,
        entryCount: 0,
        resultCount: 0,
        durationMs: Date.now() - startedAt,
        source: request.source,
      });
      throw error;
    }
  }

  private applyFilter(
    entries: HackerNewsEntry[],
    filter: FilterApplied,
  ): HackerNewsEntry[] {
    switch (filter) {
      case 'long-titles':
        return filterLongTitlesByComments(entries);
      case 'short-titles':
        return filterShortTitlesByPoints(entries);
      case 'none':
        return entries;
    }
  }
}
