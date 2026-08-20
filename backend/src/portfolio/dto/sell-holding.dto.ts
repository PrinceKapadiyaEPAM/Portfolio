import { IsNumber, IsPositive, IsOptional, Min } from 'class-validator';

export class SellHoldingDto {
  @IsNumber()
  @IsPositive()
  qty: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  charges?: number;

  @IsOptional()
  notes?: string;
}
