#!/usr/bin/env node
import { CrawlAndFilterUseCase } from './application/use-cases/CrawlAndFilter.usecase';
import { HackerNewsEntry } from './domain/entities/HackerNewsEntry';
import { countWords } from './domain/services/WordCounter';
import { FilterApplied } from './domain/ports/UsageRepository.port';
import { CheerioHackerNewsCrawler } from './infrastructure/crawler/CheerioHackerNewsCrawler';
import { SqliteUsageRepository } from './infrastructure/persistence/SqliteUsageRepository';

const TOP_ENTRIES_COUNT = 30;

const FILTER_FLAGS: Record<string, FilterApplied> = {
  '--filter=long-titles': 'long-titles',
  '--filter=short-titles': 'short-titles',
};

function parseFilter(args: string[]): FilterApplied {
  const flag = args.find((arg) => arg in FILTER_FLAGS);
  return flag ? FILTER_FLAGS[flag] : 'none';
}

function printEntries(entries: HackerNewsEntry[]): void {
  if (entries.length === 0) {
    console.log('(no entries matched)');
    return;
  }

  entries.forEach((entry) => {
    console.log(
      `#${entry.rank}\t${entry.points} pts\t${entry.commentCount} comments\t` +
        `(${countWords(entry.title)} words)\t${entry.title}`,
    );
  });
}

async function main(): Promise<void> {
  const filter = parseFilter(process.argv.slice(2));
  const usageRepository = new SqliteUsageRepository();
  const useCase = new CrawlAndFilterUseCase(new CheerioHackerNewsCrawler(), usageRepository);

  try {
    const { entries, filterApplied } = await useCase.execute({
      entryCount: TOP_ENTRIES_COUNT,
      filter,
      source: 'cli',
    });

    console.log(`Filter applied: ${filterApplied}`);
    console.log(`Results: ${entries.length}\n`);
    printEntries(entries);
  } finally {
    usageRepository.close();
  }
}

main().catch((error) => {
  console.error('Crawl failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
