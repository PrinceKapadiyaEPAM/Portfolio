import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
