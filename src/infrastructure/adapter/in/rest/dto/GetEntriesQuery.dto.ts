import { IsIn, IsOptional } from 'class-validator';
import { FilterApplied } from '../../../../../application/out/UsageRepository.port';

const VALID_FILTERS: FilterApplied[] = ['long-titles', 'short-titles', 'none'];

export class GetEntriesQueryDto {
  @IsOptional()
  @IsIn(VALID_FILTERS)
  filter?: FilterApplied;
}
