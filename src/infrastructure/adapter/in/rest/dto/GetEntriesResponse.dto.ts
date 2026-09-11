import { ApiProperty } from '@nestjs/swagger';
import { FilterApplied } from '../../../../../application/out/UsageRepository.port';
import { HackerNewsEntryDto } from './HackerNewsEntry.dto';

export class GetEntriesResponseDto {
  @ApiProperty({ enum: ['long-titles', 'short-titles', 'none'] })
  filterApplied!: FilterApplied;

  @ApiProperty({ example: 20, description: 'entries.length, after filtering' })
  count!: number;

  @ApiProperty({ type: [HackerNewsEntryDto] })
  entries!: HackerNewsEntryDto[];
}
