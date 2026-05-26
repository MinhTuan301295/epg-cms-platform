import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ImportXmltvDto {
  @IsOptional()
  @IsString()
  xmlContent?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  sourceUrl?: string;
}
