import { Card, Input, Select, DatePicker, InputNumber, Space, Button, Tag } from 'antd';
import { Search as SearchIcon, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { useCalcTypes, useSections, useUsers } from '@/services/hooks';
import { STATUS_LABEL, STATUS_ORDER, type StatusCode, type CalcTypeId, type RDSectionId, type UserId } from '@/shared/schemas';
import type { RegistryFilterState } from './filters';
import { EMPTY_FILTERS, countActiveFilters } from './filters';

interface Props {
  value: RegistryFilterState;
  onChange: (v: RegistryFilterState) => void;
}

export function FiltersPanel({ value, onChange }: Props) {
  const { data: types = [] } = useCalcTypes();
  const { data: sections = [] } = useSections();
  const { data: users = [] } = useUsers();
  const active = countActiveFilters({ ...value, objectIds: [] });

  function patch(p: Partial<RegistryFilterState>) {
    onChange({ ...value, ...p });
  }

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: 16 } }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Input
          placeholder="Поиск по номеру, наименованию, ДС…"
          prefix={<SearchIcon size={14} style={{ color: '#9CA3AF' }} />}
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Статус"
          value={value.statuses}
          onChange={(v) => patch({ statuses: v as StatusCode[] })}
          options={STATUS_ORDER.map((s) => ({ label: STATUS_LABEL[s], value: s }))}
          maxTagCount="responsive"
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Тип расчёта"
          value={value.calcTypeIds}
          onChange={(v) => patch({ calcTypeIds: v as CalcTypeId[] })}
          options={types.map((t) => ({ label: t.name, value: t.id }))}
          maxTagCount="responsive"
          showSearch
          optionFilterProp="label"
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Раздел РД"
          value={value.sectionIds}
          onChange={(v) => patch({ sectionIds: v as RDSectionId[] })}
          options={sections.map((s) => ({ label: s.code, value: s.id }))}
          maxTagCount="responsive"
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Ответственный"
          value={value.assigneeIds}
          onChange={(v) => patch({ assigneeIds: v as UserId[] })}
          options={users.map((u) => ({ label: u.fullName, value: u.id }))}
          maxTagCount="responsive"
          showSearch
          optionFilterProp="label"
          allowClear
        />
        <DatePicker.RangePicker
          placeholder={['С даты', 'По дату']}
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
        <Space.Compact style={{ width: '100%' }}>
          <InputNumber
            placeholder="Сумма от"
            value={value.amountRange[0]}
            onChange={(v) => patch({ amountRange: [v ?? null, value.amountRange[1]] })}
            style={{ width: '50%' }}
            formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')}
            parser={(v) => Number((v ?? '').replace(/\s/g, '')) as 0}
          />
          <InputNumber
            placeholder="до"
            value={value.amountRange[1]}
            onChange={(v) => patch({ amountRange: [value.amountRange[0], v ?? null] })}
            style={{ width: '50%' }}
            formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')}
            parser={(v) => Number((v ?? '').replace(/\s/g, '')) as 0}
          />
        </Space.Compact>
      </div>

      {active > 0 && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag color="blue" style={{ borderRadius: 6 }}>
            Активных фильтров: {active}
          </Tag>
          <Button
            size="small"
            type="text"
            icon={<RotateCcw size={12} />}
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Сбросить
          </Button>
        </div>
      )}
    </Card>
  );
}
