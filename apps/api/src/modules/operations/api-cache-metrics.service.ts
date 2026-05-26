import { Injectable } from '@nestjs/common';

type PublicEndpointMetricKey = 'public_channels' | 'public_schedules';

interface EndpointMetricBucket {
  cacheHits: number;
  cacheMisses: number;
  durationsMs: number[];
}

const maxDurationSamples = 1000;

@Injectable()
export class ApiCacheMetricsService {
  private readonly metrics = new Map<PublicEndpointMetricKey, EndpointMetricBucket>([
    ['public_channels', this.createBucket()],
    ['public_schedules', this.createBucket()],
  ]);

  recordRequestDuration(endpoint: PublicEndpointMetricKey, durationMs: number): void {
    const bucket = this.metrics.get(endpoint);

    if (!bucket || !Number.isFinite(durationMs) || durationMs < 0) {
      return;
    }

    bucket.durationsMs.push(durationMs);

    if (bucket.durationsMs.length > maxDurationSamples) {
      bucket.durationsMs.shift();
    }
  }

  recordCacheHit(endpoint: PublicEndpointMetricKey): void {
    const bucket = this.metrics.get(endpoint);

    if (!bucket) {
      return;
    }

    bucket.cacheHits += 1;
  }

  recordCacheMiss(endpoint: PublicEndpointMetricKey): void {
    const bucket = this.metrics.get(endpoint);

    if (!bucket) {
      return;
    }

    bucket.cacheMisses += 1;
  }

  getSnapshot() {
    return {
      generatedAt: new Date().toISOString(),
      endpoints: {
        publicChannels: this.toEndpointSnapshot('public_channels'),
        publicSchedules: this.toEndpointSnapshot('public_schedules'),
      },
    };
  }

  private toEndpointSnapshot(endpoint: PublicEndpointMetricKey) {
    const bucket = this.metrics.get(endpoint) ?? this.createBucket();
    const requests = bucket.cacheHits + bucket.cacheMisses;
    const hitRatio = requests > 0 ? bucket.cacheHits / requests : 0;

    return {
      requests,
      cacheHits: bucket.cacheHits,
      cacheMisses: bucket.cacheMisses,
      hitRatio,
      p50Ms: this.percentile(bucket.durationsMs, 0.5),
      p95Ms: this.percentile(bucket.durationsMs, 0.95),
      latestMs: bucket.durationsMs.at(-1) ?? 0,
    };
  }

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1));

    return Math.round(sorted[index] * 100) / 100;
  }

  private createBucket(): EndpointMetricBucket {
    return {
      cacheHits: 0,
      cacheMisses: 0,
      durationsMs: [],
    };
  }
}
