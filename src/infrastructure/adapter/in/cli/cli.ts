#!/usr/bin/env node
import { CrawlAndFilterUseCase } from '../../../../application/in/CrawlAndFilter.in';
import { CrawlAndFilterService } from '../../../../application/service/CrawlAndFilterService';
import { HackerNewsEntry } from '../../../../domain/model/HackerNewsEntry';
import { countWords } from '../../../../domain/service/WordCounter';
import { FilterApplied } from '../../../../application/out/UsageRepository.port';
import { CheerioHackerNewsCrawler } from '../../out/crawler/CheerioHackerNewsCrawler';
import { SqliteUsageRepository } from '../../out/persistence/SqliteUsageRepository';

const TOP_ENTRIES_COUNT = 30;

const FILTER_FLAGS: Record<string, FilterApplied> = {
  '--filter=long-titles': 'long-titles',
  '--filter=short-titles': 'short-titles',
};

const HELP_TEXT = `hn-crawler-starbuilder

Crawls the top 30 Hacker News front-page entries and optionally
filters them by title length.

Usage:
  npm start -- [options]

Options:
  --filter=long-titles   Titles with more than 5 words, sorted by comment count (desc)
  --filter=short-titles  Titles with 5 words or fewer, sorted by points (desc)
  -h, --help             Show this help message

Examples:
  npm start
  npm start -- --filter=long-titles
  npm start -- --filter=short-titles

Every run logs a usage row (timestamp, filter applied, result count)
to data/usage.sqlite.
`;

function parseFilter(args: string[]): FilterApplied {
  const flag = args.find((arg) => arg in FILTER_FLAGS);
  return flag ? FILTER_FLAGS[flag] : 'none';
}

function wantsHelp(args: string[]): boolean {
  return args.some((arg) => arg === '--help' || arg === '-h');
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
  const args = process.argv.slice(2);

  if (wantsHelp(args)) {
    console.log(HELP_TEXT);
    return;
  }

  const filter = parseFilter(args);
  const usageRepository = new SqliteUsageRepository();
  const useCase: CrawlAndFilterUseCase = new CrawlAndFilterService(
    new CheerioHackerNewsCrawler(),
    usageRepository,
  );

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
