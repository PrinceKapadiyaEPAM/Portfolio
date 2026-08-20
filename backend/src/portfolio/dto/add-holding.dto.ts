import { IsString, IsUppercase, Length, IsNumber, IsPositive, IsDateString, IsOptional, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddHoldingDto {
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  @IsString()
  @IsUppercase()
  @Length(1, 20)
  symbol: string;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsNumber()
  @Min(0)
  avgBuyPrice: number;

  @IsDateString()
  buyDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  tags?: string[];
}
