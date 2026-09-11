import { HackerNewsEntry } from '../../domain/model/HackerNewsEntry';
import { filterLongTitlesByComments, filterShortTitlesByPoints } from '../../domain/service/FilterEntries.service';
import { CrawlAndFilterRequest, CrawlAndFilterResult, CrawlAndFilterUseCase } from '../in/CrawlAndFilter.in';
import { HackerNewsCrawlerPort } from '../out/HackerNewsCrawler.port';
import { FilterApplied, UsageRepositoryPort } from '../out/UsageRepository.port';

/**
 * Implements the CrawlAndFilter input port: crawls the top N entries,
 * applies the requested filter, and always logs the interaction
 * (timestamp, filter used, and enough context to analyze crawler
 * behavior later) regardless of whether the crawl succeeds or fails.
 */
export class CrawlAndFilterService implements CrawlAndFilterUseCase {
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
