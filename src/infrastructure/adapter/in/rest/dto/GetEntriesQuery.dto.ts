import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { FilterApplied } from '../../../../../application/out/UsageRepository.port';

const VALID_FILTERS: FilterApplied[] = ['long-titles', 'short-titles', 'none'];

export class GetEntriesQueryDto {
  @ApiPropertyOptional({
    enum: VALID_FILTERS,
    description:
      'long-titles: >5-word titles sorted by comments desc. short-titles: <=5-word titles sorted by points desc. Omit for no filter.',
  })
  @IsOptional()
  @IsIn(VALID_FILTERS)
  filter?: FilterApplied;
}
