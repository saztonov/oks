import { Tabs } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ObjectsTab } from './tabs/ObjectsTab';
import { SectionsTab } from './tabs/SectionsTab';
import { RdCodesTab } from './tabs/RdCodesTab';
import { CalcTypesTab } from './tabs/CalcTypesTab';
import { EmployeesTab } from './tabs/EmployeesTab';

const VALID_TABS = ['objects', 'sections', 'rd', 'calc-types', 'employees'] as const;
type TabKey = (typeof VALID_TABS)[number];

export function DictionariesPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const active: TabKey = (VALID_TABS as readonly string[]).includes(tab ?? '')
    ? (tab as TabKey)
    : 'objects';

  return (
    <>
      <PageHeader title="Справочники" subtitle="Управление общими данными портала" />
      <Tabs
        activeKey={active}
        onChange={(k) => navigate(`/dictionaries/${k}`)}
        destroyInactiveTabPane
        items={[
          { key: 'objects', label: 'Объекты', children: <ObjectsTab /> },
          { key: 'sections', label: 'Разделы РД', children: <SectionsTab /> },
          { key: 'rd', label: 'Шифры РД', children: <RdCodesTab /> },
          { key: 'calc-types', label: 'Типы расчётов', children: <CalcTypesTab /> },
          { key: 'employees', label: 'Сотрудники', children: <EmployeesTab /> },
        ]}
      />
    </>
  );
}
