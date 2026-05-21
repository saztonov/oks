import { Card, Select, DatePicker, Tag } from 'antd';
import dayjs from 'dayjs';
import { useObjects, useUsers } from '@/services/hooks';
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_COLOR,
  type ObjectId,
  type StatusCode,
  type UserId,
} from '@/shared/schemas';
import type { AnalyticsFilters } from './types';
import { countActiveAnalyticsFilters } from './types';

interface Props {
  value: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
}

export function AnalyticsFiltersPanel({ value, onChange }: Props) {
  const { data: objects = [] } = useObjects();
  const { data: users = [] } = useUsers();
  const active = countActiveAnalyticsFilters(value);

  function patch(p: Partial<AnalyticsFilters>) {
    onChange({ ...value, ...p });
  }

  return (
    <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Select
          mode="multiple"
          placeholder="Объекты"
          value={value.objectIds}
          onChange={(v) => patch({ objectIds: v as ObjectId[] })}
          options={objects.map((o) => ({ label: o.name, value: o.id, color: o.color }))}
          optionRender={(opt) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: (opt.data as { color?: string }).color ?? '#6B7280',
                  display: 'inline-block',
                }}
              />
              {opt.label}
            </span>
          )}
          maxTagCount="responsive"
          showSearch
          optionFilterProp="label"
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Сотрудники"
          value={value.assigneeIds}
          onChange={(v) => patch({ assigneeIds: v as UserId[] })}
          options={users.map((u) => ({ label: u.fullName, value: u.id }))}
          maxTagCount="responsive"
          showSearch
          optionFilterProp="label"
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Статусы"
          value={value.statuses}
          onChange={(v) => patch({ statuses: v as StatusCode[] })}
          options={STATUS_ORDER.map((s) => ({
            label: STATUS_LABEL[s],
            value: s,
            color: STATUS_COLOR[s].text,
          }))}
          optionRender={(opt) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: (opt.data as { color?: string }).color ?? '#6B7280',
                  display: 'inline-block',
                }}
              />
              {opt.label}
            </span>
          )}
          maxTagCount="responsive"
          allowClear
        />
        <DatePicker.RangePicker
          placeholder={['Отправлено с', 'по']}
          value={
            value.sentRange ? [dayjs(value.sentRange[0]), dayjs(value.sentRange[1])] : null
          }
          onChange={(dates) => {
            if (!dates || !dates[0] || !dates[1]) patch({ sentRange: null });
            else patch({ sentRange: [dates[0].toISOString(), dates[1].toISOString()] });
          }}
          format="DD.MM.YYYY"
          style={{ width: '100%' }}
        />
      </div>

      {active > 0 && (
        <div style={{ marginTop: 12 }}>
          <Tag color="blue" style={{ borderRadius: 6 }}>
            Активных фильтров: {active}
          </Tag>
        </div>
      )}
    </Card>
  );
}
