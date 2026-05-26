import { ThunderboltOutlined } from '@ant-design/icons';
import { Button, Empty, List, Tag, Typography } from 'antd';
import type { TimelineWarning } from '../types/schedule.type';
import { formatTimelineTime } from '../utils/timeline-time.util';

interface WarningPanelProps {
  warnings: TimelineWarning[];
  onSnapAfterPrevious?: (scheduleId: string) => void;
}

function getActionLabel(type: string): string {
  if (type === 'GAP_BEFORE') return 'Snap to previous';
  return 'Try snap to previous';
}

function canSnap(warning: TimelineWarning): boolean {
  return (warning.type === 'OVERLAP' || warning.type === 'GAP_BEFORE') && Boolean(warning.scheduleId);
}

function getTagClass(type: string): string {
  if (type === 'OVERLAP') return 'warning-tag warning-tag-overlap';
  return 'warning-tag warning-tag-gap';
}

function getAlertClass(type: string): string {
  if (type === 'OVERLAP') return 'warning-alert warning-alert-overlap';
  return 'warning-alert warning-alert-gap';
}

const overlapCount = (warnings: TimelineWarning[]) =>
  warnings.filter((w) => w.type === 'OVERLAP').length;

const gapCount = (warnings: TimelineWarning[]) =>
  warnings.filter((w) => w.type === 'GAP_BEFORE' || w.type === 'GAP').length;

export function WarningPanel({ warnings, onSnapAfterPrevious }: WarningPanelProps) {
  const hasWarnings = warnings.length > 0;

  return (
    <section className="timeline-warning-panel">
      <div className="warning-panel-header">
        <div className="timeline-panel-title" style={{ marginBottom: 0 }}>Warnings</div>
        {hasWarnings && (
          <div className="warning-panel-summary">
            <span className="warning-count-badge warning-count-overlap">{overlapCount(warnings)} overlap</span>
            <span className="warning-count-badge warning-count-gap">{gapCount(warnings)} gap</span>
          </div>
        )}
      </div>

      {!hasWarnings ? (
        <div className="warning-empty-body">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#94a3b8' }}>No active warnings</span>}
          />
          <p className="warning-empty-hint">0 overlaps · 0 gaps</p>
        </div>
      ) : (
        <List
          size="small"
          dataSource={warnings}
          style={{ marginTop: 8 }}
          renderItem={(warning) => (
            <List.Item style={{ padding: '4px 0', border: 'none' }}>
              <div className={`warning-alert ${getAlertClass(warning.type)}`} style={{ width: '100%', borderRadius: 10, padding: '8px 12px' }}>
                <div className="warning-title" style={{ marginBottom: 4 }}>
                  <Tag className={getTagClass(warning.type)}>{warning.type}</Tag>
                  <Typography.Text style={{ color: '#e2e8f0', fontSize: 12 }}>
                    {warning.message}
                  </Typography.Text>
                </div>
                {warning.from && warning.to && (
                  <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: canSnap(warning) && onSnapAfterPrevious ? 6 : 0 }}>
                    {formatTimelineTime(warning.from)} – {formatTimelineTime(warning.to)}
                  </div>
                )}
                {warning.type === 'OVERLAP' && warning.to ? (
                  <div style={{ color: '#fca5a5', fontSize: 11, marginBottom: canSnap(warning) && onSnapAfterPrevious ? 6 : 0 }}>
                    Suggested: around {formatTimelineTime(warning.to)}
                  </div>
                ) : null}
                {canSnap(warning) && onSnapAfterPrevious && (
                  <Button
                    size="small"
                    type="primary"
                    danger={warning.type === 'OVERLAP'}
                    icon={<ThunderboltOutlined />}
                    style={{ marginTop: 2 }}
                    onClick={() => onSnapAfterPrevious(warning.scheduleId!)}
                  >
                    {getActionLabel(warning.type)}
                  </Button>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </section>
  );
}
