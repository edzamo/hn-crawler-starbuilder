import * as fs from 'fs';
import * as path from 'path';
import { CheerioHackerNewsCrawler } from '../../src/infrastructure/adapter/out/crawler/CheerioHackerNewsCrawler';

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, '../fixtures/hn-front-page.html'),
  'utf8',
);

function fakeHttpClient(html: string) {
  return {
    get: jest.fn().mockResolvedValue({ data: html }),
  };
}

describe('CheerioHackerNewsCrawler', () => {
  it('parses rank, title, points and comment count from the front page', async () => {
    const httpClient = fakeHttpClient(fixtureHtml);
    const crawler = new CheerioHackerNewsCrawler('https://news.ycombinator.com/', httpClient as any);

    const entries = await crawler.fetchTopEntries(30);

    expect(entries).toHaveLength(30);
    expect(entries[0]).toEqual({
      rank: 1,
      title: expect.any(String),
      points: expect.any(Number),
      commentCount: expect.any(Number),
    });
    entries.forEach((entry) => {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.points).toBeGreaterThanOrEqual(0);
      expect(entry.commentCount).toBeGreaterThanOrEqual(0);
    });
  });

  it('preserves the site ranking order', async () => {
    const httpClient = fakeHttpClient(fixtureHtml);
    const crawler = new CheerioHackerNewsCrawler('https://news.ycombinator.com/', httpClient as any);

    const entries = await crawler.fetchTopEntries(30);

    expect(entries.map((e) => e.rank)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });

  it('requests a second page only when more than 30 entries are needed', async () => {
    const httpClient = fakeHttpClient(fixtureHtml);
    const crawler = new CheerioHackerNewsCrawler('https://news.ycombinator.com/', httpClient as any);

    await crawler.fetchTopEntries(10);

    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('treats a "discuss" link (no comments yet) as zero comments', async () => {
    const html = `
      <table><tbody>
      <tr class="athing" id="1"><td class="title"><span class="rank">1.</span></td>
        <td class="title"><span class="titleline"><a href="#">No comments yet</a></span></td></tr>
      <tr><td class="subtext"><span class="score">1 point</span> | <a href="#">discuss</a></td></tr>
      </tbody></table>
    `;
    const httpClient = fakeHttpClient(html);
    const crawler = new CheerioHackerNewsCrawler('https://news.ycombinator.com/', httpClient as any);

    const [entry] = await crawler.fetchTopEntries(1);

    expect(entry.commentCount).toBe(0);
    expect(entry.points).toBe(1);
  });
});
