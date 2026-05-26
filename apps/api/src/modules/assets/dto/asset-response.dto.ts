import type { AssetType, Prisma } from '@prisma/client';

export class AssetResponseDto {
  id!: string;
  name!: string;
  type!: AssetType;
  dashUrl!: string | null;
  hlsUrl!: string | null;
  duration!: number;
  posterUrl!: string | null;
  thumbnailUrl!: string | null;
  metadata!: Prisma.JsonValue | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AssetsListResponseDto {
  data!: AssetResponseDto[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
