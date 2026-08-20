import { IsString, Length } from 'class-validator';

export class UpdateWatchlistDto {
  @IsString()
  @Length(1, 100)
  name: string;
}
