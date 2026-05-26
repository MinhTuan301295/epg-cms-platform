import { Inject, Injectable } from '@nestjs/common';
import { IMPORTER_QUEUE } from '../queue.constants';
import type { ImporterJobType } from '../queue.constants';
import { QueueService } from '../queue.service';

export interface ImporterJobPayload {
  type: ImporterJobType;
  sourceUrl?: string;
  filePath?: string;
  sourceName?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class ImporterProducer {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

  addImportXmltvJob(sourceUrl: string) {
    return this.addJob({
      type: 'XMLTV',
      sourceUrl,
    });
  }

  addImportCsvJob(filePath: string) {
    return this.addJob({
      type: 'CSV',
      filePath,
    });
  }

  addImportExternalApiJob(sourceName: string) {
    return this.addJob({
      type: 'EXTERNAL_API',
      sourceName,
    });
  }

  addImporterJob(payload: ImporterJobPayload) {
    return this.addJob(payload);
  }

  getImporterJob(id: string) {
    return this.queueService.getJob(IMPORTER_QUEUE, id);
  }

  private addJob(payload: ImporterJobPayload) {
    return this.queueService.addJob(IMPORTER_QUEUE, payload.type, payload);
  }
}
