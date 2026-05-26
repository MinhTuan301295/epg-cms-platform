import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { ParsedProgram } from '../types/importer.types';

interface CsvRow {
  channel_epg_id?: string;
  title?: string;
  start_time?: string;
  stop_time?: string;
  duration_seconds?: string;
  asset_name?: string;
  asset_id?: string;
  description?: string;
}

@Injectable()
export class CsvParser {
  parse(csvContent: string): ParsedProgram[] {
    if (!csvContent.trim()) {
      throw new BadRequestException('CSV content is required');
    }

    const rows = parse(csvContent, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];

    return rows.map((row, index) => this.parseRow(row, index + 2));
  }

  private parseRow(row: CsvRow, rowNumber: number): ParsedProgram {
    if (!row.channel_epg_id || !row.title || !row.start_time) {
      throw new BadRequestException(`CSV row ${rowNumber} is missing required fields`);
    }

    const startTime = this.parseDate(row.start_time, `CSV row ${rowNumber} start_time`);
    const stopTime = row.stop_time
      ? this.parseDate(row.stop_time, `CSV row ${rowNumber} stop_time`)
      : this.calculateStopTime(startTime, row.duration_seconds, rowNumber);
    const duration = row.duration_seconds
      ? Number(row.duration_seconds)
      : Math.floor((stopTime.getTime() - startTime.getTime()) / 1000);

    if (!Number.isInteger(duration) || duration <= 0 || stopTime <= startTime) {
      throw new BadRequestException(`CSV row ${rowNumber} has invalid duration or stop_time`);
    }

    return {
      externalChannelId: row.channel_epg_id,
      title: row.title,
      description: row.description,
      startTime,
      stopTime,
      duration,
      assetId: row.asset_id || undefined,
      assetName: row.asset_name || undefined,
      metadata: {
        source: 'CSV',
      },
    };
  }

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return date;
  }

  private calculateStopTime(startTime: Date, durationSeconds: string | undefined, rowNumber: number): Date {
    if (!durationSeconds) {
      throw new BadRequestException(`CSV row ${rowNumber} requires stop_time or duration_seconds`);
    }

    const duration = Number(durationSeconds);

    if (!Number.isInteger(duration) || duration <= 0) {
      throw new BadRequestException(`CSV row ${rowNumber} duration_seconds must be positive integer`);
    }

    return new Date(startTime.getTime() + duration * 1000);
  }
}
