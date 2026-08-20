import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending','triggered','partially_filled','filled','cancelled','skipped'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  executedPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  executedQty?: number;

  @IsOptional()
  @IsDateString()
  executedAt?: string;
}
