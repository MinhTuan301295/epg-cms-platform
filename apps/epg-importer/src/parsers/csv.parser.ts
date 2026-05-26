import { parse } from 'csv-parse/sync';
import type { EpgImporterProgram } from './xmltv.parser';

interface CsvRow {
  channel_epg_id?: string;
  title?: string;
  start_time?: string;
  stop_time?: string;
  duration_seconds?: string;
  description?: string;
}

export class CsvImporterParser {
  parse(csvContent: string): EpgImporterProgram[] {
    const rows = parse(csvContent, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];

    return rows.map((row) => {
      const startTime = new Date(row.start_time ?? '');
      const stopTime = row.stop_time
        ? new Date(row.stop_time)
        : new Date(startTime.getTime() + Number(row.duration_seconds ?? 0) * 1000);

      return {
        externalChannelId: row.channel_epg_id ?? '',
        title: row.title ?? 'Untitled',
        description: row.description,
        startTime: startTime.toISOString(),
        stopTime: stopTime.toISOString(),
      };
    });
  }
}
