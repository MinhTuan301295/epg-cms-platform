import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ImportCsvDto {
  @IsOptional()
  @IsString()
  csvContent?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  sourceUrl?: string;
}
