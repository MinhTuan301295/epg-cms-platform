import { BadRequestException, Injectable } from '@nestjs/common';
import type { Asset } from '@prisma/client';

@Injectable()
export class ScheduleValidationService {
  validateBaseScheduleInput(input: { startTime?: string; stopTime?: string; duration?: number }): void {
    if (!input.startTime) {
      throw new BadRequestException('Schedule startTime is required');
    }

    if (input.duration !== undefined && input.duration <= 0) {
      throw new BadRequestException('Schedule duration must be greater than 0');
    }
  }

  resolveDuration(input: { duration?: number; startTime: Date; stopTime?: Date }, asset?: Asset | null): number {
    if (input.duration !== undefined) {
      this.validateDuration(input.duration);
      return input.duration;
    }

    if (asset) {
      this.validateDuration(asset.duration);
      return asset.duration;
    }

    if (input.stopTime) {
      const duration = Math.floor((input.stopTime.getTime() - input.startTime.getTime()) / 1000);
      this.validateDuration(duration);
      return duration;
    }

    throw new BadRequestException('Schedule duration is required when assetId is not provided');
  }

  calculateStopTime(startTime: Date, duration: number): Date {
    this.validateDuration(duration);
    return new Date(startTime.getTime() + duration * 1000);
  }

  validateTimeRange(startTime: Date, stopTime: Date): void {
    if (stopTime <= startTime) {
      throw new BadRequestException('Schedule stopTime must be after startTime');
    }
  }

  validateDuration(duration: number): void {
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new BadRequestException('Schedule duration must be a positive integer');
    }
  }

  validateDurationMatchesRange(startTime: Date, stopTime: Date, duration: number): void {
    const rangeSeconds = Math.floor((stopTime.getTime() - startTime.getTime()) / 1000);

    if (rangeSeconds !== duration) {
      throw new BadRequestException('Schedule duration must match startTime and stopTime');
    }
  }

  parseDateTime(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return date;
  }
}
