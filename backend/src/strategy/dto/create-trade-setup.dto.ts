import { IsString, IsOptional, IsNumber, IsPositive, IsInt, Min, Max, MaxLength, IsIn, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTradeSetupDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(20)
  symbol: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  buyRangeHigh: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  buyRangeLow: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  levelCount: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  defaultQtyPerLevel: number;

  @IsOptional()
  @IsString()
  @IsIn(['CLBS', 'WLBS', 'FIXED'])
  slType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  slValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  slReference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
