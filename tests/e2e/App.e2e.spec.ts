import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HackerNewsEntry } from '../../src/domain/model/HackerNewsEntry';
import { HACKER_NEWS_CRAWLER_PORT, HackerNewsCrawlerPort } from '../../src/application/out/HackerNewsCrawler.port';
import { USAGE_REPOSITORY_PORT, UsageRecord, UsageRepositoryPort } from '../../src/application/out/UsageRepository.port';
import { AppModule } from '../../src/infrastructure/config/AppModule';

class FakeCrawler implements HackerNewsCrawlerPort {
  async fetchTopEntries(): Promise<HackerNewsEntry[]> {
    return [
      { rank: 1, title: 'One two three four five', points: 10, commentCount: 100 },
      { rank: 2, title: 'One two three four five six', points: 50, commentCount: 5 },
    ];
  }
}

class RecordingUsageRepository implements UsageRepositoryPort {
  readonly records: UsageRecord[] = [];
  async record(usage: UsageRecord): Promise<void> {
    this.records.push(usage);
  }
}

describe('AppModule (e2e)', () => {
  let app: INestApplication;
  let usageRepository: RecordingUsageRepository;

  beforeAll(async () => {
    usageRepository = new RecordingUsageRepository();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HACKER_NEWS_CRAWLER_PORT)
      .useClass(FakeCrawler)
      .overrideProvider(USAGE_REPOSITORY_PORT)
      .useValue(usageRepository)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports ok without touching the crawler or usage repo', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    expect(usageRepository.records).toHaveLength(0);
  });

  it('GET /entries returns unfiltered entries by default and logs usage', async () => {
    const response = await request(app.getHttpServer()).get('/entries').expect(200);

    expect(response.body).toMatchObject({ filterApplied: 'none', count: 2 });
    expect(usageRepository.records).toHaveLength(1);
    expect(usageRepository.records[0]).toMatchObject({ filterApplied: 'none', source: 'api' });
  });

  it('GET /entries?filter=long-titles applies the filter', async () => {
    const response = await request(app.getHttpServer())
      .get('/entries?filter=long-titles')
      .expect(200);

    expect(response.body.filterApplied).toBe('long-titles');
    expect(response.body.entries.map((e: HackerNewsEntry) => e.rank)).toEqual([2]);
  });

  it('GET /entries?filter=bogus is rejected by the validation pipe', async () => {
    await request(app.getHttpServer()).get('/entries?filter=bogus').expect(400);
  });
});
