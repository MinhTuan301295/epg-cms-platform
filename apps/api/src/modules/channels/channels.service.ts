import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Channel, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleCacheService } from '../schedules/cache/schedule-cache.service';
import type { ChannelResponseDto, ChannelsListResponseDto } from './dto/channel-response.dto';
import type { CreateChannelDto } from './dto/create-channel.dto';
import type { QueryChannelsDto } from './dto/query-channels.dto';
import type { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ScheduleCacheService) private readonly scheduleCacheService: ScheduleCacheService,
  ) {}

  async findAll(query: QueryChannelsDto): Promise<ChannelsListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [channels, total] = await this.prismaService.$transaction([
      this.prismaService.channel.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prismaService.channel.count({ where }),
    ]);

    return {
      data: channels.map((channel) => this.toResponse(channel)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ChannelResponseDto> {
    const channel = await this.findChannelById(id);
    return this.toResponse(channel);
  }

  async create(dto: CreateChannelDto): Promise<ChannelResponseDto> {
    await this.assertEpgIdAvailable(dto.epgId);

    const channel = await this.prismaService.channel.create({
      data: {
        name: dto.name,
        epgId: dto.epgId,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive ?? true,
      },
    });

    await this.scheduleCacheService.invalidatePublicChannels();

    return this.toResponse(channel);
  }

  async update(id: string, dto: UpdateChannelDto): Promise<ChannelResponseDto> {
    await this.findChannelById(id);
    await this.assertEpgIdAvailable(dto.epgId, id);

    const channel = await this.prismaService.channel.update({
      where: { id },
      data: {
        name: dto.name,
        epgId: dto.epgId,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive,
      },
    });

    await Promise.all([
      this.scheduleCacheService.invalidatePublicChannels(),
      this.scheduleCacheService.invalidateChannel(id),
    ]);

    return this.toResponse(channel);
  }

  async remove(id: string): Promise<ChannelResponseDto> {
    const channel = await this.findChannelById(id);

    if (!('isActive' in channel)) {
      throw new BadRequestException('Channel cannot be deleted safely');
    }

    const deletedChannel = await this.prismaService.channel.update({
      where: { id },
      data: { isActive: false },
    });

    await Promise.all([
      this.scheduleCacheService.invalidatePublicChannels(),
      this.scheduleCacheService.invalidateChannel(id),
    ]);

    return this.toResponse(deletedChannel);
  }

  private buildWhere(query: QueryChannelsDto): Prisma.ChannelWhereInput {
    const where: Prisma.ChannelWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const search = query.search?.trim();

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          epgId: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  private async findChannelById(id: string): Promise<Channel> {
    const channel = await this.prismaService.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  private async assertEpgIdAvailable(epgId?: string, excludeId?: string): Promise<void> {
    if (!epgId) {
      return;
    }

    const existingChannel = await this.prismaService.channel.findUnique({
      where: { epgId },
    });

    if (existingChannel && existingChannel.id !== excludeId) {
      throw new ConflictException('Channel epgId already exists');
    }
  }

  private toResponse(channel: Channel): ChannelResponseDto {
    return {
      id: channel.id,
      name: channel.name,
      epgId: channel.epgId,
      logoUrl: channel.logoUrl,
      isActive: channel.isActive,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }
}
