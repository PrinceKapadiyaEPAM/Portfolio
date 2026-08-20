import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class UpdateStrategyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active', 'paused'])
  status?: string;
}
