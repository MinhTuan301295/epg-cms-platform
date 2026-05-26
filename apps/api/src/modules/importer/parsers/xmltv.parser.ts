import { BadRequestException, Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import type { ParsedChannel, ParsedProgram } from '../types/importer.types';

interface XmltvParseResult {
  channels: ParsedChannel[];
  programs: ParsedProgram[];
}

@Injectable()
export class XmltvParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'text',
  });

  parse(xmlContent: string): XmltvParseResult {
    if (!xmlContent.trim()) {
      throw new BadRequestException('XMLTV content is required');
    }

    const document = this.parser.parse(xmlContent) as Record<string, unknown>;
    const tv = document.tv as Record<string, unknown> | undefined;

    if (!tv) {
      throw new BadRequestException('Invalid XMLTV document');
    }

    const channels = this.toArray(tv.channel).map((channel) => this.parseChannel(channel));
    const programs = this.toArray(tv.programme).map((programme) => this.parseProgramme(programme));

    return {
      channels,
      programs,
    };
  }

  private parseChannel(value: unknown): ParsedChannel {
    const channel = value as Record<string, unknown>;

    return {
      externalChannelId: String(channel.id),
      displayName: this.extractText(channel['display-name']),
    };
  }

  private parseProgramme(value: unknown): ParsedProgram {
    const programme = value as Record<string, unknown>;
    const startTime = parseXmltvDate(String(programme.start));
    const stopTime = parseXmltvDate(String(programme.stop));
    const title = this.extractText(programme.title);

    if (!title) {
      throw new BadRequestException('XMLTV programme title is required');
    }

    return {
      externalChannelId: String(programme.channel),
      title,
      description: this.extractText(programme.desc),
      startTime,
      stopTime,
      metadata: {
        source: 'XMLTV',
      },
    };
  }

  private toArray(value: unknown): unknown[] {
    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private extractText(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return objectValue.text ? String(objectValue.text) : undefined;
    }

    return String(value);
  }
}

export function parseXmltvDate(value: string): Date {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?$/);

  if (!match) {
    throw new BadRequestException(`Invalid XMLTV date: ${value}`);
  }

  const [, year, month, day, hour, minute, second, offset = '+0000'] = match;
  const isoOffset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${isoOffset}`);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid XMLTV date: ${value}`);
  }

  return date;
}
