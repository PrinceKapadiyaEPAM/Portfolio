import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  orgId?: string;

  @IsIn(['admin', 'manager', 'viewer'])
  role: string;
}
