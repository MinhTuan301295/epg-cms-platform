import { AssetType, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const passwordSaltRounds = 12;

const adminUser = {
  email: 'admin@epg.local',
  password: 'admin123',
  name: 'EPG Admin',
};

const channels = [
  {
    name: 'VTV1',
    epgId: 'vtv1_hd',
    logoUrl: 'https://static.epg.local/logos/vtv1.png',
  },
  {
    name: 'VTV3',
    epgId: 'vtv3_hd',
    logoUrl: 'https://static.epg.local/logos/vtv3.png',
  },
  {
    name: 'HBO HD',
    epgId: 'hbo_hd',
    logoUrl: 'https://static.epg.local/logos/hbo-hd.png',
  },
  {
    name: 'Cartoon Network',
    epgId: 'cartoon_network',
    logoUrl: 'https://static.epg.local/logos/cartoon-network.png',
  },
  {
    name: 'Discovery',
    epgId: 'discovery_hd',
    logoUrl: 'https://static.epg.local/logos/discovery.png',
  },
] as const;

const assets = [
  {
    name: 'Thời sự 19h',
    type: AssetType.VOD,
    dashUrl: 'https://media.epg.local/vod/thoi-su-19h/manifest.mpd',
    hlsUrl: 'https://media.epg.local/vod/thoi-su-19h/master.m3u8',
    duration: 1800,
    posterUrl: 'https://static.epg.local/posters/thoi-su-19h.jpg',
    thumbnailUrl: 'https://static.epg.local/thumbnails/thoi-su-19h.jpg',
  },
  {
    name: 'Phim Hành Động',
    type: AssetType.VOD,
    dashUrl: 'https://media.epg.local/vod/phim-hanh-dong/manifest.mpd',
    hlsUrl: 'https://media.epg.local/vod/phim-hanh-dong/master.m3u8',
    duration: 7200,
    posterUrl: 'https://static.epg.local/posters/phim-hanh-dong.jpg',
    thumbnailUrl: 'https://static.epg.local/thumbnails/phim-hanh-dong.jpg',
  },
  {
    name: 'Champions League Live',
    type: AssetType.LIVE,
    dashUrl: 'https://live.epg.local/champions-league/manifest.mpd',
    hlsUrl: 'https://live.epg.local/champions-league/master.m3u8',
    duration: 7200,
    posterUrl: 'https://static.epg.local/posters/champions-league-live.jpg',
    thumbnailUrl: 'https://static.epg.local/thumbnails/champions-league-live.jpg',
  },
  {
    name: 'Doraemon Tập 1',
    type: AssetType.VOD,
    dashUrl: 'https://media.epg.local/vod/doraemon-tap-1/manifest.mpd',
    hlsUrl: 'https://media.epg.local/vod/doraemon-tap-1/master.m3u8',
    duration: 1500,
    posterUrl: 'https://static.epg.local/posters/doraemon-tap-1.jpg',
    thumbnailUrl: 'https://static.epg.local/thumbnails/doraemon-tap-1.jpg',
  },
  {
    name: 'Discovery Documentary',
    type: AssetType.VOD,
    dashUrl: 'https://media.epg.local/vod/discovery-documentary/manifest.mpd',
    hlsUrl: 'https://media.epg.local/vod/discovery-documentary/master.m3u8',
    duration: 3600,
    posterUrl: 'https://static.epg.local/posters/discovery-documentary.jpg',
    thumbnailUrl: 'https://static.epg.local/thumbnails/discovery-documentary.jpg',
  },
] as const;

async function seedUsers(): Promise<void> {
  console.log('seeding admin user...');

  const password = await bcrypt.hash(adminUser.password, passwordSaltRounds);

  await prisma.user.upsert({
    where: { email: adminUser.email },
    update: {
      password,
      name: adminUser.name,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: adminUser.email,
      password,
      name: adminUser.name,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
}

async function seedChannels(): Promise<void> {
  console.log('seeding channels...');

  for (const channel of channels) {
    await prisma.channel.upsert({
      where: { epgId: channel.epgId },
      update: {
        name: channel.name,
        logoUrl: channel.logoUrl,
        isActive: true,
      },
      create: {
        name: channel.name,
        epgId: channel.epgId,
        logoUrl: channel.logoUrl,
        isActive: true,
      },
    });
  }
}

async function seedAssets(): Promise<void> {
  console.log('seeding assets...');

  for (const asset of assets) {
    const existingAsset = await prisma.asset.findFirst({
      where: {
        name: asset.name,
        type: asset.type,
      },
    });

    const data = {
      name: asset.name,
      type: asset.type,
      dashUrl: asset.dashUrl,
      hlsUrl: asset.hlsUrl,
      duration: asset.duration,
      posterUrl: asset.posterUrl,
      thumbnailUrl: asset.thumbnailUrl,
      metadata: {
        seeded: true,
        source: 'phase-2-seed',
      },
    };

    if (existingAsset) {
      await prisma.asset.update({
        where: { id: existingAsset.id },
        data,
      });
      continue;
    }

    await prisma.asset.create({ data });
  }
}

async function main(): Promise<void> {
  await seedUsers();
  await seedChannels();
  await seedAssets();

  console.log('seed completed successfully');
}

async function bootstrap(): Promise<void> {
  try {
    await main();
  } catch (error) {
    console.error('seed failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void bootstrap();
