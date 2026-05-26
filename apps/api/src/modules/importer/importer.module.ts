import { Module } from '@nestjs/common';
import { QueuesModule } from '../../queues/queues.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ScheduleCacheService } from '../schedules/cache/schedule-cache.service';
import { ImporterController } from './importer.controller';
import { ImporterService } from './importer.service';
import { EpgChannelMapper } from './mappers/epg-channel.mapper';
import { ScheduleMapper } from './mappers/schedule.mapper';
import { CsvParser } from './parsers/csv.parser';
import { ExternalApiParser } from './parsers/external-api.parser';
import { XmltvParser } from './parsers/xmltv.parser';
import { ImportConflictValidator } from './validators/import-conflict.validator';

@Module({
  imports: [AuditLogsModule, QueuesModule],
  controllers: [ImporterController],
  providers: [
    ImporterService,
    XmltvParser,
    CsvParser,
    ExternalApiParser,
    EpgChannelMapper,
    ScheduleMapper,
    ImportConflictValidator,
    ScheduleCacheService,
  ],
})
export class ImporterModule {}
