import { BadRequestException, Injectable } from '@nestjs/common';
import type { ParsedProgram } from '../types/importer.types';

interface ExternalApiResponse {
  channels?: Array<{
    epgId?: string;
    programs?: ExternalProgram[];
  }>;
}

interface ExternalProgram {
  title?: string;
  startTime?: string;
  stopTime?: string;
  description?: string;
}

@Injectable()
export class ExternalApiParser {
  parse(payload: unknown, sourceName: string): ParsedProgram[] {
    const response = payload as ExternalApiResponse;

    if (!Array.isArray(response.channels)) {
      throw new BadRequestException('External EPG response must contain channels array');
    }

    return response.channels.flatMap((channel) => {
      if (!channel.epgId) {
        return [];
      }

      return (channel.programs ?? []).map((program) => this.parseProgram(channel.epgId as string, program, sourceName));
    });
  }

  private parseProgram(
    externalChannelId: string,
    program: ExternalProgram,
    sourceName: string,
  ): ParsedProgram {
    if (!program.title || !program.startTime || !program.stopTime) {
      throw new BadRequestException('External EPG program is missing required fields');
    }

    const startTime = new Date(program.startTime);
    const stopTime = new Date(program.stopTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(stopTime.getTime()) || stopTime <= startTime) {
      throw new BadRequestException('External EPG program has invalid time range');
    }

    return {
      externalChannelId,
      title: program.title,
      description: program.description,
      startTime,
      stopTime,
      metadata: {
        source: 'EXTERNAL_API',
        sourceName,
      },
    };
  }
}
