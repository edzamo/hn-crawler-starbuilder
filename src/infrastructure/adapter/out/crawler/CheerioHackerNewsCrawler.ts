import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { HackerNewsEntry } from '../../../../domain/model/HackerNewsEntry';
import { HackerNewsCrawlerPort } from '../../../../application/out/HackerNewsCrawler.port';

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
 *
 * Wired in infrastructure/config via useFactory (its constructor
 * takes plain defaults, not injectable tokens), but still marked
 * @Injectable() to document that it's a DI-managed adapter.
 */
@Injectable()
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

    return $('tr.athing')
      .toArray()
      .map((storyRow) => this.parseEntry($, storyRow))
      .filter((entry): entry is HackerNewsEntry => entry !== null);
  }

  private parseEntry($: cheerio.CheerioAPI, storyRow: Element): HackerNewsEntry | null {
    const $story = $(storyRow);

    const rank = this.parseRank($story.find('.rank').text());
    const title = $story.find('.titleline > a').first().text().trim();
    if (!title) {
      return null;
    }

    const $subtext = $story.next('tr').find('.subtext');
    const points = this.parseLeadingInt($subtext.find('.score').text());
    const commentCount = this.parseCommentCount($subtext.find('a').last().text());

    return { rank, title, points, commentCount };
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
