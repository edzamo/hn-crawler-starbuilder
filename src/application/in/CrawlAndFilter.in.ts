import { HackerNewsEntry } from '../../domain/model/HackerNewsEntry';
import { FilterApplied } from '../out/UsageRepository.port';

export interface CrawlAndFilterRequest {
  entryCount: number;
  filter: FilterApplied;
  source: 'api';
}

export interface CrawlAndFilterResult {
  entries: HackerNewsEntry[];
  filterApplied: FilterApplied;
}

/**
 * Input port: the single entry point infrastructure/adapter/in
 * (the REST controller) is allowed to call.
 */
export interface CrawlAndFilterUseCase {
  execute(request: CrawlAndFilterRequest): Promise<CrawlAndFilterResult>;
}

export const CRAWL_AND_FILTER_USE_CASE = Symbol('CrawlAndFilterUseCase');
