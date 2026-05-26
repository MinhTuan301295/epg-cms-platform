import { Alert, Empty, List, Tag, Typography } from 'antd';
import type { TimelineWarning } from '../types/schedule.type';
import { formatTimelineTime } from '../utils/timeline-time.util';

interface WarningPanelProps {
  warnings: TimelineWarning[];
}

export function WarningPanel({ warnings }: WarningPanelProps) {
  return (
    <section className="timeline-warning-panel">
      <div className="timeline-panel-title">Warnings</div>
      {warnings.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No warnings" />
      ) : (
        <List
          size="small"
          dataSource={warnings}
          renderItem={(warning) => (
            <List.Item>
              <Alert
                type={warning.type === 'OVERLAP' ? 'error' : 'warning'}
                showIcon
                message={
                  <div className="warning-title">
                    <Tag color={warning.type === 'OVERLAP' ? 'red' : 'gold'}>{warning.type}</Tag>
                    <Typography.Text>{warning.message}</Typography.Text>
                  </div>
                }
                description={
                  warning.from && warning.to
                    ? `${formatTimelineTime(warning.from)} - ${formatTimelineTime(warning.to)}`
                    : undefined
                }
              />
            </List.Item>
          )}
        />
      )}
    </section>
  );
}
