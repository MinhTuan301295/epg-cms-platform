import { AssetType } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(AssetType)
  type!: AssetType;

  @IsOptional()
  @IsUrl({ require_tld: false })
  dashUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  hlsUrl?: string;

  @IsInt()
  @Min(1)
  duration!: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  posterUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
