import { IsNumber, IsPositive, IsDateString, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateHoldingDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avgBuyPrice?: number;

  @IsOptional()
  @IsDateString()
  buyDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  tags?: string[];
}
