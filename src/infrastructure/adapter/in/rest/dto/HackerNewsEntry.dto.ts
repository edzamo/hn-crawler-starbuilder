import { ApiProperty } from '@nestjs/swagger';
import { HackerNewsEntry } from '../../../../../domain/model/HackerNewsEntry';

export class HackerNewsEntryDto implements HackerNewsEntry {
  @ApiProperty({ example: 1, description: 'Position on the HN front page' })
  rank!: number;

  @ApiProperty({ example: 'Show HN: a small crawler' })
  title!: string;

  @ApiProperty({ example: 120 })
  points!: number;

  @ApiProperty({ example: 45 })
  commentCount!: number;
}
