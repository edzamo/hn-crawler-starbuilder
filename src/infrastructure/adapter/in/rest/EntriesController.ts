import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CRAWL_AND_FILTER_USE_CASE, CrawlAndFilterUseCase } from '../../../../application/in/CrawlAndFilter.in';
import { GetEntriesQueryDto } from './dto/GetEntriesQuery.dto';

const TOP_ENTRIES_COUNT = 30;

@ApiTags('entries')
@Controller('entries')
export class EntriesController {
  constructor(
    @Inject(CRAWL_AND_FILTER_USE_CASE) private readonly crawlAndFilter: CrawlAndFilterUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Crawl the top 30 HN entries, optionally filtered by title length' })
  @ApiOkResponse({ description: 'filterApplied, a result count, and the entry list' })
  async getEntries(@Query() query: GetEntriesQueryDto) {
    const { entries, filterApplied } = await this.crawlAndFilter.execute({
      entryCount: TOP_ENTRIES_COUNT,
      filter: query.filter ?? 'none',
      source: 'api',
    });

    return { filterApplied, count: entries.length, entries };
  }
}
