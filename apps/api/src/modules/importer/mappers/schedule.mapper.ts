import { Injectable } from '@nestjs/common';
import type {
  ParsedProgram,
  ScheduleImportCandidate,
  UnmappedProgram,
} from '../types/importer.types';

@Injectable()
export class ScheduleMapper {
  toCandidates(
    programs: ParsedProgram[],
    channelMap: Map<string, { id: string; name: string }>,
  ): { candidates: ScheduleImportCandidate[]; unmapped: UnmappedProgram[] } {
    const candidates: ScheduleImportCandidate[] = [];
    const unmapped: UnmappedProgram[] = [];

    for (const program of programs) {
      const channel = channelMap.get(program.externalChannelId);
      const duration = program.duration ?? Math.floor((program.stopTime.getTime() - program.startTime.getTime()) / 1000);

      if (!channel) {
        unmapped.push({
          externalChannelId: program.externalChannelId,
          title: program.title,
          startTime: program.startTime.toISOString(),
          stopTime: program.stopTime.toISOString(),
          reason: 'No internal channel mapped by epgId',
        });
        continue;
      }

      candidates.push({
        externalChannelId: program.externalChannelId,
        channelId: channel.id,
        channelName: channel.name,
        title: program.title,
        description: program.description,
        startTime: program.startTime.toISOString(),
        stopTime: program.stopTime.toISOString(),
        duration,
        assetId: program.assetId,
        assetName: program.assetName,
        metadata: program.metadata,
      });
    }

    return { candidates, unmapped };
  }
}
