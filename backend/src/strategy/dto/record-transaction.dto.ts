import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordTransactionDto {
  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qty: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsDateString()
  executedAt: string;

  @IsString()
  @IsIn(['ACCUMULATION', 'TARGET', 'STOP_LOSS', 'MANUAL'])
  txnType: string;

  @IsOptional()
  @IsString()
  accumulationLevelId?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  charges?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
