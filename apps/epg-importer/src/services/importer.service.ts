import { CsvImporterParser } from '../parsers/csv.parser';
import { ExternalApiImporterParser } from '../parsers/external-api.parser';
import { XmltvImporterParser } from '../parsers/xmltv.parser';

export class EpgImporterService {
  readonly xmltvParser = new XmltvImporterParser();
  readonly csvParser = new CsvImporterParser();
  readonly externalApiParser = new ExternalApiImporterParser();

  async previewExternalApi(url: string): Promise<unknown[]> {
    const response = await fetch(url);
    const payload = await response.json();

    return this.externalApiParser.parse(payload);
  }
}
