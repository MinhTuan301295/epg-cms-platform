import { IsISO8601, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class ImportExternalApiDto {
  @IsString()
  sourceName!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
