import { IsString, IsUppercase, Length, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddWatchlistItemDto {
  @Transform(({ value }) => (value as string).trim().toUpperCase())
  @IsString()
  @IsUppercase()
  @Length(1, 20)
  symbol: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  @IsString()
  watchlistId?: string;
}
