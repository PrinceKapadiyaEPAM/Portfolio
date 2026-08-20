import { IsArray, ValidateNested, IsInt, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

class TargetDto {
  @IsInt()
  @Min(1)
  levelNum: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  targetPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plannedQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plannedPct?: number;
}

export class SaveTargetsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetDto)
  targets: TargetDto[];
}
