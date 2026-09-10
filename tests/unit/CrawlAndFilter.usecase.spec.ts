import { HackerNewsEntry } from '../../src/domain/entities/HackerNewsEntry';
import { HackerNewsCrawlerPort } from '../../src/domain/ports/HackerNewsCrawler.port';
import { UsageRecord, UsageRepositoryPort } from '../../src/domain/ports/UsageRepository.port';
import { CrawlAndFilterUseCase } from '../../src/application/use-cases/CrawlAndFilter.usecase';

class FakeCrawler implements HackerNewsCrawlerPort {
  constructor(private readonly entries: HackerNewsEntry[]) {}
  async fetchTopEntries(): Promise<HackerNewsEntry[]> {
    return this.entries;
  }
}

class FailingCrawler implements HackerNewsCrawlerPort {
  async fetchTopEntries(): Promise<HackerNewsEntry[]> {
    throw new Error('network down');
  }
}

class RecordingUsageRepository implements UsageRepositoryPort {
  readonly records: UsageRecord[] = [];
  async record(usage: UsageRecord): Promise<void> {
    this.records.push(usage);
  }
}

const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

function entry(overrides: Partial<HackerNewsEntry>): HackerNewsEntry {
  return { rank: 1, title: 'Short title', points: 0, commentCount: 0, ...overrides };
}

describe('CrawlAndFilterUseCase', () => {
  it('applies the long-titles filter and logs the usage', async () => {
    const entries = [
      entry({ rank: 1, title: 'One two three four five', commentCount: 5 }),
      entry({ rank: 2, title: 'One two three four five six', commentCount: 20 }),
    ];
    const usageRepository = new RecordingUsageRepository();
    const useCase = new CrawlAndFilterUseCase(
      new FakeCrawler(entries),
      usageRepository,
      () => FIXED_DATE,
    );

    const result = await useCase.execute({ entryCount: 2, filter: 'long-titles', source: 'cli' });

    expect(result.entries.map((e) => e.rank)).toEqual([2]);
    expect(usageRepository.records).toHaveLength(1);
    expect(usageRepository.records[0]).toMatchObject({
      requestedAt: FIXED_DATE,
      filterApplied: 'long-titles',
      entryCount: 2,
      resultCount: 1,
      source: 'cli',
    });
  });

  it('applies the short-titles filter ordered by points', async () => {
    const entries = [
      entry({ rank: 1, title: 'A short one', points: 10 }),
      entry({ rank: 2, title: 'Another short title', points: 99 }),
    ];
    const usageRepository = new RecordingUsageRepository();
    const useCase = new CrawlAndFilterUseCase(new FakeCrawler(entries), usageRepository);

    const result = await useCase.execute({ entryCount: 2, filter: 'short-titles', source: 'cli' });

    expect(result.entries.map((e) => e.rank)).toEqual([2, 1]);
  });

  it('returns entries unfiltered when filter is "none"', async () => {
    const entries = [entry({ rank: 1 }), entry({ rank: 2 })];
    const usageRepository = new RecordingUsageRepository();
    const useCase = new CrawlAndFilterUseCase(new FakeCrawler(entries), usageRepository);

    const result = await useCase.execute({ entryCount: 2, filter: 'none', source: 'api' });

    expect(result.entries).toHaveLength(2);
  });

  it('still logs usage (with zero counts) when the crawler fails', async () => {
    const usageRepository = new RecordingUsageRepository();
    const useCase = new CrawlAndFilterUseCase(new FailingCrawler(), usageRepository, () => FIXED_DATE);

    await expect(
      useCase.execute({ entryCount: 30, filter: 'none', source: 'cli' }),
    ).rejects.toThrow('network down');

    expect(usageRepository.records).toHaveLength(1);
    expect(usageRepository.records[0]).toMatchObject({
      filterApplied: 'none',
      entryCount: 0,
      resultCount: 0,
    });
  });
});
