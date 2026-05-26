import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ImporterModule } from './modules/importer/importer.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { UsersModule } from './modules/users/users.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.development', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    RedisModule,
    CacheModule,
    QueuesModule,
    EventsModule,
    AuthModule,
    UsersModule,
    ChannelsModule,
    AssetsModule,
    SchedulesModule,
    ImporterModule,
    PublicApiModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
