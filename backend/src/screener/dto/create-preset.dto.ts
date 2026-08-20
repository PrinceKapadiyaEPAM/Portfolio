import { IsString, Length, IsObject } from 'class-validator';

export class CreatePresetDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsObject()
  filters: Record<string, unknown>;
}
