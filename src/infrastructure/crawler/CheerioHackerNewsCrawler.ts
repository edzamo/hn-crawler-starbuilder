import axios from 'axios';
import * as cheerio from 'cheerio';
import { HackerNewsEntry } from '../../domain/entities/HackerNewsEntry';
import { HackerNewsCrawlerPort } from '../../domain/ports/HackerNewsCrawler.port';

const HN_BASE_URL = 'https://news.ycombinator.com/';
const ENTRIES_PER_PAGE = 30;

/**
 * Scrapes the Hacker News front page(s) with cheerio.
 *
 * HN's classic front end renders 30 stories per page and paginates
 * via `?p=N`, so fetching more than 30 entries means walking pages
 * sequentially. Each story lives in a `tr.athing` row (id, rank,
 * title/link) immediately followed by a `tr` holding its subtext
 * (points, age, comment count) — that pairing is why they are parsed
 * together rather than with two independent selectors.
 */
export class CheerioHackerNewsCrawler implements HackerNewsCrawlerPort {
  constructor(
    private readonly baseUrl: string = HN_BASE_URL,
    private readonly httpClient = axios,
  ) {}

  async fetchTopEntries(count: number): Promise<HackerNewsEntry[]> {
    const entries: HackerNewsEntry[] = [];
    let page = 1;

    while (entries.length < count) {
      const pageEntries = await this.fetchPage(page);
      if (pageEntries.length === 0) {
        break;
      }
      entries.push(...pageEntries);
      page += 1;
    }

    return entries.slice(0, count);
  }

  private async fetchPage(page: number): Promise<HackerNewsEntry[]> {
    const url = page === 1 ? this.baseUrl : `${this.baseUrl}?p=${page}`;
    const response = await this.httpClient.get<string>(url, {
      responseType: 'text',
      headers: { 'User-Agent': 'hn-crawler-starbuilder (technical exercise)' },
    });

    return this.parseEntries(response.data);
  }

  private parseEntries(html: string): HackerNewsEntry[] {
    const $ = cheerio.load(html);
    const entries: HackerNewsEntry[] = [];

    $('tr.athing').each((_, storyRow) => {
      const $story = $(storyRow);

      const rank = this.parseRank($story.find('.rank').text());
      const title = $story.find('.titleline > a').first().text().trim();

      const $subtext = $story.next('tr').find('.subtext');
      const points = this.parseLeadingInt($subtext.find('.score').text());
      const commentCount = this.parseCommentCount($subtext.find('a').last().text());

      if (title) {
        entries.push({ rank, title, points, commentCount });
      }
    });

    return entries;
  }

  private parseRank(rawRank: string): number {
    return this.parseLeadingInt(rawRank);
  }

  private parseCommentCount(rawLabel: string): number {
    if (/discuss/i.test(rawLabel)) {
      return 0;
    }
    return this.parseLeadingInt(rawLabel);
  }

  private parseLeadingInt(raw: string): number {
    const match = raw.replace(/,/g, '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}

export { ENTRIES_PER_PAGE };
