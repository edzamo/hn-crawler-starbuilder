import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CRAWL_AND_FILTER_USE_CASE } from '../../application/in/CrawlAndFilter.in';
import { HACKER_NEWS_CRAWLER_PORT, HackerNewsCrawlerPort } from '../../application/out/HackerNewsCrawler.port';
import { USAGE_REPOSITORY_PORT, UsageRepositoryPort } from '../../application/out/UsageRepository.port';
import { CrawlAndFilterService } from '../../application/service/CrawlAndFilterService';
import { EntriesController } from '../adapter/in/rest/EntriesController';
import { HealthController } from '../adapter/in/rest/HealthController';
import { CheerioHackerNewsCrawler } from '../adapter/out/crawler/CheerioHackerNewsCrawler';
import { SqliteUsageRepository } from '../adapter/out/persistence/SqliteUsageRepository';

/**
 * Composition root: the only place that knows both NestJS and the
 * concrete application/service classes. application/service itself
 * stays framework-free (no @Injectable), so every provider here is
 * built explicitly with useFactory instead of useClass.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [EntriesController, HealthController],
  providers: [
    {
      provide: HACKER_NEWS_CRAWLER_PORT,
      useFactory: (): HackerNewsCrawlerPort => new CheerioHackerNewsCrawler(),
    },
    {
      provide: USAGE_REPOSITORY_PORT,
      useFactory: (config: ConfigService): UsageRepositoryPort =>
        new SqliteUsageRepository(config.get<string>('USAGE_DB_PATH')),
      inject: [ConfigService],
    },
    {
      provide: CRAWL_AND_FILTER_USE_CASE,
      useFactory: (crawler: HackerNewsCrawlerPort, usageRepository: UsageRepositoryPort) =>
        new CrawlAndFilterService(crawler, usageRepository),
      inject: [HACKER_NEWS_CRAWLER_PORT, USAGE_REPOSITORY_PORT],
    },
  ],
})
export class AppModule {}
