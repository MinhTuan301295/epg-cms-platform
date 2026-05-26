import { Inject, Injectable } from '@nestjs/common';
import type { Channel } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class EpgChannelMapper {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getChannelMap(externalChannelIds: string[]): Promise<Map<string, Pick<Channel, 'epgId' | 'id' | 'name'>>> {
    const uniqueEpgIds = [...new Set(externalChannelIds.filter(Boolean))];
    const channels = await this.prismaService.channel.findMany({
      where: {
        epgId: {
          in: uniqueEpgIds,
        },
      },
      select: {
        id: true,
        name: true,
        epgId: true,
      },
    });

    return new Map(channels.flatMap((channel) => (channel.epgId ? [[channel.epgId, channel]] : [])));
  }
}
