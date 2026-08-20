import { IsString, IsOptional, IsNumber, MaxLength, IsIn, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTradeSetupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft','active','accumulating','partially_accumulated','fully_accumulated',
         'targeting','partially_exited','closed','stopped_out','cancelled'])
  status?: string;

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
  @IsString()
  @IsIn(['active', 'triggered', 'cancelled'])
  slStatus?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
