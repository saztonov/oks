import { useMemo } from 'react';
import { Card, Row, Col, Empty } from 'antd';
import { Bar, Pie } from '@ant-design/plots';
import ReactECharts from 'echarts-for-react';
import type { CalcRowView } from '@/services/calculations';
import {
  bucketByStatus,
  buildSankeyByStatus,
  funnelByStatus,
} from '../computeKpis';
import { STATUS_LABEL, STATUS_ORDER, STATUS_COLOR } from '@/shared/schemas';

interface Props {
  rows: CalcRowView[];
}

export function StatusesView({ rows }: Props) {
  const byStatus = useMemo(() => bucketByStatus(rows), [rows]);
  const funnel = useMemo(() => funnelByStatus(rows), [rows]);

  const funnelOption = useMemo(() => {
    const data = funnel.map((s) => ({ name: s.label, value: s.count }));
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: { name?: string; value?: number; dataIndex?: number }) => {
          const stage = funnel[p.dataIndex ?? 0];
          if (!stage) return p.name ?? '';
          return `<b>${stage.label}</b><br/>${stage.count} расчётов<br/>${(stage.sum / 1_000_000).toFixed(1)} млн ₽`;
        },
      },
      series: [
        {
          type: 'funnel',
          left: 16,
          right: 16,
          top: 16,
          bottom: 16,
          sort: 'none',
          gap: 2,
          label: { show: true, position: 'inside', color: 'white', fontWeight: 600 },
          labelLine: { show: false },
          itemStyle: { borderColor: 'white', borderWidth: 2 },
          data,
          color: ['#9CA3AF', '#0EA5E9', '#3730A3', '#16A34A', '#DC2626'],
        },
      ],
    };
  }, [funnel]);

  const sankeyOption = useMemo(() => {
    const { nodes, links } = buildSankeyByStatus(rows);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: {
          name?: string;
          data?: { source?: string; target?: string; value?: number };
        }) => {
          if (p.data?.source) {
            return `${p.data.source} → <b>${p.data.target}</b><br/>${((p.data.value ?? 0) / 1_000_000).toFixed(1)} млн ₽`;
          }
          return p.name ?? '';
        },
      },
      series: [
        {
          type: 'sankey',
          left: 16,
          right: 100,
          top: 12,
          bottom: 12,
          emphasis: { focus: 'adjacency' },
          data: nodes.map((n) => {
            const status = STATUS_ORDER.find((s) => STATUS_LABEL[s] === n.name);
            return status
              ? { name: n.name, itemStyle: { color: STATUS_COLOR[status].text } }
              : { name: n.name };
          }),
          links,
          lineStyle: { color: 'gradient', curveness: 0.5 },
          label: { fontSize: 12 },
        },
      ],
    };
  }, [rows]);

  const sectionShareData = useMemo(() => {
    const m = new Map<string, { signed: number; refused: number; active: number }>();
    for (const r of rows) {
      for (const code of r.sectionCodes) {
        const cur = m.get(code) ?? { signed: 0, refused: 0, active: 0 };
        const s = r.currentVersion.status;
        if (s === 'DS_SIGNED') cur.signed += 1;
        else if (s === 'REJECTED') cur.refused += 1;
        else cur.active += 1;
        m.set(code, cur);
      }
    }
    const list: Array<{ section: string; status: string; share: number }> = [];
    for (const [sec, v] of m) {
      const total = v.signed + v.refused + v.active;
      if (total === 0) continue;
      list.push({ section: sec, status: 'Подписан', share: v.signed / total });
      list.push({ section: sec, status: 'В работе', share: v.active / total });
      list.push({ section: sec, status: 'Отказ', share: v.refused / total });
    }
    return list.sort((a, b) => a.section.localeCompare(b.section));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <Card>
        <Empty description="Нет данных по выбранным фильтрам" />
      </Card>
    );
  }

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="Воронка статусов" styles={{ body: { padding: 8 } }}>
            <ReactECharts option={funnelOption} style={{ height: 360 }} notMerge lazyUpdate />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Поток денег по статусам" styles={{ body: { padding: 8 } }}>
            <ReactECharts option={sankeyOption} style={{ height: 360 }} notMerge lazyUpdate />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Доля статусов по разделам РД">
            {sectionShareData.length === 0 ? (
              <Empty />
            ) : (
              <Bar
                data={sectionShareData}
                xField="share"
                yField="section"
                colorField="status"
                stack
                normalize
                height={Math.max(280, sectionShareData.length * 8)}
                legend={{ position: 'bottom' }}
                scale={{
                  color: {
                    domain: ['Подписан', 'В работе', 'Отказ'],
                    range: ['#16A34A', '#0EA5E9', '#DC2626'],
                  },
                }}
                axis={{ x: { labelFormatter: (v: number) => `${(v * 100).toFixed(0)}%` } }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Распределение по статусам">
            {byStatus.length === 0 ? (
              <Empty />
            ) : (
              <Pie
                data={byStatus.map((b) => ({ ...b, label: b.label }))}
                angleField="count"
                colorField="label"
                innerRadius={0.55}
                height={300}
                legend={{ position: 'right' }}
                label={{
                  text: 'count',
                  position: 'inside',
                  style: { fill: '#fff', fontWeight: 600 },
                }}
                scale={{
                  color: {
                    domain: STATUS_ORDER.map((s) => STATUS_LABEL[s]),
                    range: STATUS_ORDER.map((s) => STATUS_COLOR[s].text),
                  },
                }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
