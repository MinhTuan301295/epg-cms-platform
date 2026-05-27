import { useQuery } from '@tanstack/react-query';
import { Alert, Skeleton, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { CSSProperties } from 'react';
import { dashboardService } from '../../services/dashboard.service';

type Tone = 'blue' | 'danger' | 'green' | 'purple' | 'warning';

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  subLabel?: string;
  tone?: Tone;
  loading?: boolean;
  badge?: string;
}

interface DonutPart {
  label: string;
  value: number;
  color: string;
}

interface DonutCardProps {
  title: string;
  parts: DonutPart[];
  centerLabel: string;
  centerValue: string;
}

const toneClassMap: Record<Tone, string> = {
  blue: 'ops-stat-value-blue',
  danger: 'ops-stat-value-danger',
  green: 'ops-stat-value-green',
  purple: 'ops-stat-value-purple',
  warning: 'ops-stat-value-warning',
};

function StatCard({ label, value, suffix, subLabel, tone = 'blue', loading, badge }: StatCardProps) {
  return (
    <Skeleton loading={Boolean(loading)} active paragraph={false}>
      <article className="ops-stat-card">
        <div className="ops-stat-label">{label}</div>
        <div className={`ops-stat-value ${toneClassMap[tone]}`}>
          <span>{value}</span>
          {suffix ? <small>{suffix}</small> : null}
          {badge ? <Tag className="ops-inline-badge">{badge}</Tag> : null}
        </div>
        {subLabel ? <div className="ops-stat-sub">{subLabel}</div> : null}
      </article>
    </Skeleton>
  );
}

function DonutCard({ title, parts, centerLabel, centerValue }: DonutCardProps) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  let cursor = 0;
  const gradients: string[] = [];

  for (const part of parts) {
    const next = total > 0 ? cursor + (part.value / total) * 100 : cursor;
    gradients.push(`${part.color} ${cursor}% ${next}%`);
    cursor = next;
  }

  const donutStyle: CSSProperties = {
    background: `conic-gradient(${gradients.join(', ')})`,
  };

  return (
    <section className="ops-donut-card">
      <header className="ops-donut-header">{title}</header>
      <div className="ops-donut-body">
        <div className="ops-donut-wrap">
          <div className="ops-donut-ring" style={donutStyle}>
            <div className="ops-donut-core">
              <strong>{centerValue}</strong>
              <span>{centerLabel}</span>
            </div>
          </div>
        </div>
        <ul className="ops-donut-legend">
          {parts.map((part) => {
            const percent = total > 0 ? Math.round((part.value / total) * 100) : 0;
            return (
              <li key={part.label}>
                <i style={{ background: part.color }} />
                <span>{part.label}</span>
                <b>{percent}%</b>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const snapshotQuery = useQuery({
    queryKey: ['dashboard', 'snapshot'],
    queryFn: dashboardService.getSnapshot,
    refetchInterval: 30_000,
  });

  const snapshot = snapshotQuery.data;
  const loading = snapshotQuery.isLoading;
  const generatedAt = snapshot?.generatedAt
    ? dayjs(snapshot.generatedAt).format('YYYY-MM-DD HH:mm:ss')
    : '-';

  const activeChannels = snapshot?.onAirHealth.activeChannels ?? 0;
  const onAirChannels = snapshot?.onAirHealth.onAirChannels ?? 0;
  const missingOnAir = snapshot?.onAirHealth.channelsWithoutOnAir ?? 0;
  const noCoverage = snapshot?.onAirHealth.channelsWithoutNext6hCoverage ?? 0;
  const publishQueue = snapshot?.importerQueueHealth.queueItems.find(
    (queue) => queue.name === 'schedule-publish',
  );
  const publishQueuePending = (publishQueue?.waiting ?? 0) + (publishQueue?.delayed ?? 0);

  const partialCoverage = Math.max(missingOnAir - noCoverage, 0);
  const fullyCovered = Math.max(activeChannels - partialCoverage - noCoverage, 0);
  const coveragePercent = activeChannels > 0 ? Math.round((fullyCovered / activeChannels) * 100) : 0;

  const topRiskChannels = snapshot?.scheduleIntegrity.topRiskChannels ?? [];
  const onAirChannelSet = new Set(snapshot?.channelHealth.onAirChannelIds ?? []);

  const publishDraft = snapshot?.publishPipeline.draft ?? 0;
  const publishPublished = snapshot?.publishPipeline.published ?? 0;
  const publishCancelled = snapshot?.publishPipeline.cancelled ?? 0;
  const publishScheduled = snapshot?.importerQueueHealth.activeJobs ?? 0;
  const publishFailed = snapshot?.importerQueueHealth.failedJobs ?? 0;
  const publishTotal = publishDraft + publishPublished + publishCancelled + publishScheduled + publishFailed;

  const riskRows = topRiskChannels.map((channel) => {
    const onAir = onAirChannelSet.has(channel.channelId);

    return {
      ...channel,
      onAir,
    };
  });

  return (
    <section className="ops-dashboard">
      <div className="ops-dashboard-toolbar ops-dashboard-toolbar-meta">
        <Typography.Text type="secondary">Last updated: {generatedAt}</Typography.Text>
      </div>

      {snapshotQuery.error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load dashboard data"
          description={
            snapshotQuery.error instanceof Error
              ? snapshotQuery.error.message
              : 'Please refresh the page or check API service.'
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div className="ops-dashboard-v2">
        <section className="ops-top-strip">
          <StatCard
            label="Active Channels"
            value={activeChannels}
            suffix={`/ ${snapshot?.totals.channels ?? 0}`}
            subLabel={`${snapshot?.totals.channels ?? 0} total channels`}
            tone="green"
            loading={loading}
          />
          <StatCard
            label="On-Air Now"
            value={onAirChannels}
            subLabel={`${onAirChannels} channels live`}
            tone="green"
            badge="LIVE"
            loading={loading}
          />
          <StatCard
            label="Missing On-Air Program"
            value={missingOnAir}
            subLabel={`${missingOnAir} channels`}
            tone="danger"
            loading={loading}
          />
          <StatCard
            label="Next 6h Coverage Issues"
            value={noCoverage}
            subLabel={`${noCoverage} channels at risk`}
            tone="warning"
            loading={loading}
          />
          <StatCard
            label="Schedule Publish Queue"
            value={publishQueuePending}
            subLabel="Pending to publish"
            tone="blue"
            loading={loading}
          />
        </section>

        <section className="ops-main-grid">
          <div className="ops-main-left">
            <article className="ops-panel">
              <header className="ops-panel-header">Schedule Integrity</header>
              <div className="ops-panel-grid-4">
                <StatCard label="Overlaps" value={snapshot?.scheduleIntegrity.overlaps ?? 0} tone="danger" loading={loading} />
                <StatCard label="Gaps" value={snapshot?.scheduleIntegrity.gaps ?? 0} tone="warning" loading={loading} />
                <StatCard
                  label="Invalid Time Ranges"
                  value={snapshot?.scheduleIntegrity.invalidRanges ?? 0}
                  tone="purple"
                  loading={loading}
                />
                <StatCard
                  label="Channels With Issues"
                  value={snapshot?.scheduleIntegrity.channelsWithIssues ?? 0}
                  tone="danger"
                  loading={loading}
                />
              </div>
            </article>

            <article className="ops-panel">
              <header className="ops-panel-header">Top Risk Channels</header>
              <div className="ops-risk-table-wrap">
                <table className="ops-risk-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>On-Air</th>
                      <th>Overlaps</th>
                      <th>Gaps</th>
                      {/* Hidden until backend provides real per-channel coverage/status metrics */}
                      {/* <th>Coverage (Next 6h)</th>
                      <th>Status</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {riskRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ops-risk-empty">
                          No high-risk channels detected.
                        </td>
                      </tr>
                    ) : (
                      riskRows.map((row) => (
                        <tr key={row.channelId}>
                          <td>{row.channelName}</td>
                          <td>
                            <span className={`ops-pill ${row.onAir ? 'ops-pill-green' : 'ops-pill-red'}`}>
                              {row.onAir ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>{row.overlaps}</td>
                          <td>{row.gaps}</td>
                          {/* Hidden until backend provides real per-channel coverage/status metrics */}
                          {/* <td>
                            <div className="ops-coverage-meter">
                              <span style={{ width: `${row.coverageValue}%` }} />
                            </div>
                          </td>
                          <td>
                            <span className={`ops-pill ops-pill-${row.status}`}>
                              {row.status === 'issue' ? 'Issue' : row.status === 'warning' ? 'Warning' : 'Good'}
                            </span>
                          </td> */}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <div className="ops-main-right">
            <DonutCard
              title="Coverage (Next 6h)"
              parts={[
                { label: 'Fully Covered', value: fullyCovered, color: '#22c55e' },
                { label: 'Partial', value: partialCoverage, color: '#f59e0b' },
                { label: 'No Coverage', value: noCoverage, color: '#ef4444' },
              ]}
              centerLabel="Overall Coverage"
              centerValue={`${coveragePercent}%`}
            />

            <DonutCard
              title="Publish Pipeline"
              parts={[
                { label: 'Draft', value: publishDraft, color: '#f59e0b' },
                { label: 'Published', value: publishPublished, color: '#22c55e' },
                { label: 'Scheduled', value: publishScheduled, color: '#3b82f6' },
                { label: 'Cancelled', value: publishCancelled, color: '#64748b' },
                { label: 'Failed', value: publishFailed, color: '#ef4444' },
              ]}
              centerLabel="Total"
              centerValue={String(publishTotal)}
            />
          </div>
        </section>

        <section className="ops-bottom-strip">
          <StatCard
            label="Importer Queue Failed Jobs"
            value={snapshot?.importerQueueHealth.failedJobs ?? 0}
            tone="danger"
            loading={loading}
          />
          <StatCard
            label="Importer Queue Active Jobs"
            value={snapshot?.importerQueueHealth.activeJobs ?? 0}
            tone="blue"
            loading={loading}
          />
          <StatCard
            label="Public Schedules Cache Hit"
            value={`${Math.round((snapshot?.apiCacheMetrics.publicSchedules.hitRatio ?? 0) * 100)}%`}
            tone="green"
            loading={loading}
          />
          <StatCard
            label="Public Schedules P95"
            value={`${snapshot?.apiCacheMetrics.publicSchedules.p95Ms ?? 0} ms`}
            tone={(snapshot?.apiCacheMetrics.publicSchedules.p95Ms ?? 0) > 500 ? 'danger' : 'blue'}
            loading={loading}
          />
        </section>
      </div>
    </section>
  );
}
