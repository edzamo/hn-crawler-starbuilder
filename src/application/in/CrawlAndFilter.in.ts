import { HackerNewsEntry } from '../../domain/model/HackerNewsEntry';
import { FilterApplied } from '../out/UsageRepository.port';

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
 * Input port: the single entry point infrastructure/adapter/in
 * (the CLI today, an HTTP controller tomorrow) is allowed to call.
 */
export interface CrawlAndFilterUseCase {
  execute(request: CrawlAndFilterRequest): Promise<CrawlAndFilterResult>;
}
