import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CRAWL_AND_FILTER_USE_CASE, CrawlAndFilterUseCase } from '../../../../application/in/CrawlAndFilter.in';
import { GetEntriesQueryDto } from './dto/GetEntriesQuery.dto';
import { GetEntriesResponseDto } from './dto/GetEntriesResponse.dto';

const TOP_ENTRIES_COUNT = 30;

@ApiTags('entries')
@Controller('entries')
export class EntriesController {
  constructor(
    @Inject(CRAWL_AND_FILTER_USE_CASE) private readonly crawlAndFilter: CrawlAndFilterUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Crawl the top 30 HN entries, optionally filtered by title length' })
  @ApiOkResponse({ type: GetEntriesResponseDto, description: 'filterApplied, a result count, and the entry list' })
  @ApiBadRequestResponse({ description: 'filter is not one of long-titles, short-titles, none' })
  async getEntries(@Query() query: GetEntriesQueryDto): Promise<GetEntriesResponseDto> {
    const { entries, filterApplied } = await this.crawlAndFilter.execute({
      entryCount: TOP_ENTRIES_COUNT,
      filter: query.filter ?? 'none',
      source: 'api',
    });

    return { filterApplied, count: entries.length, entries };
  }
}
