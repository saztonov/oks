import { Select, Empty, Card } from 'antd';
import { Building2 } from 'lucide-react';
import { useUiStore } from '@/app/stores/uiStore';
import { useObjects } from '@/services/hooks';
import { ObjectBadge } from './ObjectBadge';
import type { ObjectId } from '@/shared/schemas';

interface Props {
  size?: 'small' | 'middle' | 'large';
  width?: number | string;
  placeholder?: string;
  allowClear?: boolean;
}

export function ObjectScopeSelector({
  size = 'middle',
  width = 260,
  placeholder = 'Выберите объект',
  allowClear = true,
}: Props) {
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);
  const setSelectedObjectId = useUiStore((s) => s.setSelectedObjectId);
  const { data: objects = [] } = useObjects();

  return (
    <Select<ObjectId>
      size={size}
      value={(selectedObjectId as ObjectId) ?? undefined}
      onChange={(v) => setSelectedObjectId((v as string) ?? null)}
      placeholder={placeholder}
      style={{ width }}
      allowClear={allowClear}
      showSearch
      optionFilterProp="label"
      options={objects.map((o) => ({
        label: o.name,
        value: o.id,
      }))}
      optionRender={(option) => {
        const obj = objects.find((o) => o.id === option.value);
        if (!obj) return option.label;
        return <ObjectBadge name={obj.name} color={obj.color ?? '#6B7280'} size="sm" />;
      }}
    />
  );
}

interface EmptyProps {
  title?: string;
  description?: string;
}

export function ObjectScopeEmpty({
  title = 'Выберите объект',
  description = 'Чтобы увидеть расчёты, выберите строительный объект в списке выше',
}: EmptyProps) {
  return (
    <Card>
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#6B7280',
        }}
      >
        <Building2 size={48} style={{ color: '#D1D5DB', marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, maxWidth: 400, margin: '0 auto' }}>{description}</div>
      </div>
    </Card>
  );
}
