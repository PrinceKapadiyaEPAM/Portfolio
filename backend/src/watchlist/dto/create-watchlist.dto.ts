import { IsString, Length } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  @Length(1, 100)
  name: string;
}
