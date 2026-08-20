import { IsArray, ValidateNested, IsInt, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

class LevelDto {
  @IsInt()
  @Min(1)
  levelNum: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  triggerPrice: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  plannedQty: number;
}

export class SaveLevelsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LevelDto)
  levels: LevelDto[];
}
