import { HackerNewsEntry } from '../../domain/model/HackerNewsEntry';

export interface HackerNewsCrawlerPort {
  /**
   * Fetches and parses the requested number of entries from the
   * Hacker News front page(s), in the site's original ranking order.
   */
  fetchTopEntries(count: number): Promise<HackerNewsEntry[]>;
}
