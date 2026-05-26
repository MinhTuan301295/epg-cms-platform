import { IsOptional, IsString } from 'class-validator';

export class ImportPreviewDto {
  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
