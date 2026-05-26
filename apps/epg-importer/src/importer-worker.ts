import { EpgImporterService } from './services/importer.service';

export class ImporterWorker {
  private readonly importerService = new EpgImporterService();

  start(): void {
    console.log('[epg-importer] importer worker ready', {
      parsers: ['XMLTV', 'CSV', 'EXTERNAL_API'],
      service: Boolean(this.importerService),
    });
  }
}
