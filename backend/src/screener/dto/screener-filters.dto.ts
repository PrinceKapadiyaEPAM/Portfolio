import { IsOptional, IsNumber, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ScreenerFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  change_gt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  change_lt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  volume_gt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  volume_lt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  per_change_365d_gt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  per_change_365d_lt?: number;

  @IsOptional()
  @IsIn(['changePct', 'volume', 'ltp', 'perChange365d'])
  sort_by?: 'changePct' | 'volume' | 'ltp' | 'perChange365d';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
