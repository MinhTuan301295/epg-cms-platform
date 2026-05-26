import type { EpgImporterProgram } from './xmltv.parser';

interface ExternalApiResponse {
  channels?: Array<{
    epgId?: string;
    programs?: Array<{
      title?: string;
      startTime?: string;
      stopTime?: string;
      description?: string;
    }>;
  }>;
}

export class ExternalApiImporterParser {
  parse(payload: unknown): EpgImporterProgram[] {
    const response = payload as ExternalApiResponse;

    return (response.channels ?? []).flatMap((channel) =>
      (channel.programs ?? []).map((program) => ({
        externalChannelId: channel.epgId ?? '',
        title: program.title ?? 'Untitled',
        description: program.description,
        startTime: new Date(program.startTime ?? '').toISOString(),
        stopTime: new Date(program.stopTime ?? '').toISOString(),
      })),
    );
  }
}
