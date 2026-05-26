import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Asset, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleCacheService } from '../schedules/cache/schedule-cache.service';
import type { AssetResponseDto, AssetsListResponseDto } from './dto/asset-response.dto';
import type { CreateAssetDto } from './dto/create-asset.dto';
import type { QueryAssetsDto } from './dto/query-assets.dto';
import type { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ScheduleCacheService) private readonly scheduleCacheService: ScheduleCacheService,
  ) {}

  async findAll(query: QueryAssetsDto): Promise<AssetsListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [assets, total] = await this.prismaService.$transaction([
      this.prismaService.asset.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prismaService.asset.count({ where }),
    ]);

    return {
      data: assets.map((asset) => this.toResponse(asset)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AssetResponseDto> {
    const asset = await this.findAssetById(id);
    return this.toResponse(asset);
  }

  async create(dto: CreateAssetDto): Promise<AssetResponseDto> {
    this.assertPlayableAsset(dto);

    const asset = await this.prismaService.asset.create({
      data: {
        name: dto.name,
        type: dto.type,
        dashUrl: dto.dashUrl,
        hlsUrl: dto.hlsUrl,
        duration: dto.duration,
        posterUrl: dto.posterUrl,
        thumbnailUrl: dto.thumbnailUrl,
        metadata: this.toJsonInput(dto.metadata),
      },
    });

    return this.toResponse(asset);
  }

  async update(id: string, dto: UpdateAssetDto): Promise<AssetResponseDto> {
    const existingAsset = await this.findAssetById(id);
    this.assertPlayableAsset({
      dashUrl: dto.dashUrl ?? existingAsset.dashUrl ?? undefined,
      hlsUrl: dto.hlsUrl ?? existingAsset.hlsUrl ?? undefined,
    });

    const asset = await this.prismaService.asset.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        dashUrl: dto.dashUrl,
        hlsUrl: dto.hlsUrl,
        duration: dto.duration,
        posterUrl: dto.posterUrl,
        thumbnailUrl: dto.thumbnailUrl,
        metadata: this.toJsonInput(dto.metadata),
      },
    });

    await this.invalidateScheduleCachesForAsset(id);

    return this.toResponse(asset);
  }

  async remove(id: string): Promise<AssetResponseDto> {
    const asset = await this.findAssetById(id);
    const referencedSchedules = await this.prismaService.schedule.count({
      where: { assetId: id },
    });

    if (referencedSchedules > 0) {
      throw new BadRequestException('Asset is used by schedules and cannot be deleted');
    }

    const deletedAsset = await this.prismaService.asset.delete({
      where: { id },
    });

    return this.toResponse(deletedAsset ?? asset);
  }

  private buildWhere(query: QueryAssetsDto): Prisma.AssetWhereInput {
    const where: Prisma.AssetWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    const search = query.search?.trim();

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return where;
  }

  private async findAssetById(id: string): Promise<Asset> {
    const asset = await this.prismaService.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private assertPlayableAsset(data: Pick<CreateAssetDto, 'dashUrl' | 'hlsUrl'>): void {
    if (!data.dashUrl && !data.hlsUrl) {
      throw new BadRequestException('At least one of dashUrl or hlsUrl is required');
    }
  }

  private toJsonInput(metadata?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
    return metadata as Prisma.InputJsonValue | undefined;
  }

  private async invalidateScheduleCachesForAsset(assetId: string): Promise<void> {
    const schedules = await this.prismaService.schedule.findMany({
      where: {
        assetId,
      },
      distinct: ['channelId'],
      select: {
        channelId: true,
      },
    });

    await Promise.all(
      schedules.map((schedule) => this.scheduleCacheService.invalidateChannel(schedule.channelId)),
    );
  }

  private toResponse(asset: Asset): AssetResponseDto {
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      dashUrl: asset.dashUrl,
      hlsUrl: asset.hlsUrl,
      duration: asset.duration,
      posterUrl: asset.posterUrl,
      thumbnailUrl: asset.thumbnailUrl,
      metadata: asset.metadata,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
