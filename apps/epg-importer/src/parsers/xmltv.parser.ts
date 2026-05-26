import { XMLParser } from 'fast-xml-parser';

export interface EpgImporterProgram {
  externalChannelId: string;
  title: string;
  description?: string;
  startTime: string;
  stopTime: string;
}

export class XmltvImporterParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'text',
  });

  parse(xmlContent: string): EpgImporterProgram[] {
    const document = this.parser.parse(xmlContent) as Record<string, { programme?: unknown }>;
    const programmes = this.toArray(document.tv?.programme);

    return programmes.map((programme) => {
      const value = programme as Record<string, unknown>;

      return {
        externalChannelId: String(value.channel),
        title: this.extractText(value.title) ?? 'Untitled',
        description: this.extractText(value.desc),
        startTime: parseXmltvDate(String(value.start)).toISOString(),
        stopTime: parseXmltvDate(String(value.stop)).toISOString(),
      };
    });
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

function parseXmltvDate(value: string): Date {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?$/);

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second, offset = '+0000'] = match;
  const isoOffset = `${offset.slice(0, 3)}:${offset.slice(3)}`;

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${isoOffset}`);
}
