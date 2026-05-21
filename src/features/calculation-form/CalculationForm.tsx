import { useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Divider,
  App,
} from 'antd';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  useObjects,
  useCalcTypes,
  useSections,
  useRdDocuments,
  useUsers,
} from '@/services/hooks';
import { PageHeader } from '@/shared/ui/PageHeader';
import type {
  ObjectId,
  CalcTypeId,
  RDSectionId,
  RDDocumentId,
  UserId,
  Decimal,
} from '@/shared/schemas';
import { computeTotal, formatMoney } from '@/entities/calculation/compute';

export interface CalculationFormValues {
  objectId: ObjectId | null;
  calcTypeId: CalcTypeId | null;
  sectionIds: RDSectionId[];
  sourceRdIds: RDDocumentId[];
  workName: string;
  directCost: number;
  overheadCoeff: number;
  letterNumber: string;
  letterSentAt: Dayjs | null;
  dsNumber: string;
  assigneeId: UserId | null;
  note: string;
}

export const EMPTY_VALUES: CalculationFormValues = {
  objectId: null,
  calcTypeId: null,
  sectionIds: [],
  sourceRdIds: [],
  workName: '',
  directCost: 0,
  overheadCoeff: 1.22,
  letterNumber: '',
  letterSentAt: null,
  dsNumber: '',
  assigneeId: null,
  note: '',
};

interface Props {
  mode: 'create' | 'edit';
  initial: CalculationFormValues;
  onSubmit: (v: CalculationFormValues) => void;
  submitting?: boolean;
  title?: string;
}

export function CalculationForm({ mode, initial, onSubmit, submitting, title }: Props) {
  const navigate = useNavigate();
  const [form] = Form.useForm<CalculationFormValues>();
  const { data: objects = [] } = useObjects();
  const { data: types = [] } = useCalcTypes();
  const { data: sections = [] } = useSections();
  const { data: rdDocs = [] } = useRdDocuments();
  const { data: users = [] } = useUsers();
  const { message } = App.useApp();

  useEffect(() => {
    form.setFieldsValue(initial);
  }, [initial, form]);

  const objectId = Form.useWatch('objectId', form);
  const directCost = Form.useWatch('directCost', form);
  const overheadCoeff = Form.useWatch('overheadCoeff', form);
  const sectionIds = Form.useWatch('sectionIds', form);

  const total = useMemo(() => {
    const dc = String(directCost ?? 0) as Decimal;
    const k = String(overheadCoeff ?? 1) as Decimal;
    return computeTotal(dc, k);
  }, [directCost, overheadCoeff]);

  const rdOptions = useMemo(() => {
    const filtered = objectId
      ? rdDocs.filter((d) => d.objectId === objectId)
      : rdDocs;
    return filtered.map((d) => ({
      label: d.code,
      value: d.id,
      meta: d,
    }));
  }, [rdDocs, objectId]);

  function handleFinish(v: CalculationFormValues) {
    if (!v.objectId) {
      message.error('Выберите объект');
      return;
    }
    if (!v.workName?.trim()) {
      message.error('Заполните наименование работ');
      return;
    }
    onSubmit(v);
  }

  return (
    <>
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        Назад
      </Button>
      <PageHeader title={title ?? (mode === 'create' ? 'Новый расчёт' : 'Редактирование расчёта')} />

      <Form<CalculationFormValues>
        form={form}
        layout="vertical"
        initialValues={initial}
        onFinish={handleFinish}
        onValuesChange={(changed) => {
          if (changed.objectId !== undefined) {
            form.setFieldValue('sourceRdIds', []);
          }
        }}
        scrollToFirstError
      >
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <Card title="Идентификация" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Объект"
                    name="objectId"
                    rules={[{ required: true, message: 'Выберите объект' }]}
                  >
                    <Select
                      placeholder="Выберите объект"
                      options={objects.map((o) => ({ label: o.name, value: o.id }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Тип расчёта" name="calcTypeId">
                    <Select
                      placeholder="Тип расчёта"
                      options={types.map((t) => ({ label: t.name, value: t.id }))}
                      showSearch
                      optionFilterProp="label"
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Разделы и шифры" style={{ marginBottom: 16 }}>
              <Form.Item label="Разделы РД" name="sectionIds">
                <Select
                  mode="multiple"
                  placeholder="Например: АР, КЖ"
                  options={sections.map((s) => ({ label: s.code, value: s.id }))}
                  maxTagCount="responsive"
                />
              </Form.Item>
              <Form.Item
                label={
                  <span>
                    Шифры РД
                    {!objectId && (
                      <span style={{ color: '#9CA3AF', marginLeft: 8, fontSize: 12 }}>
                        — выберите объект для фильтрации
                      </span>
                    )}
                  </span>
                }
                name="sourceRdIds"
              >
                <Select
                  mode="multiple"
                  placeholder="Выберите шифры РД (можно несколько)"
                  options={rdOptions}
                  maxTagCount="responsive"
                  showSearch
                  optionFilterProp="label"
                  disabled={!objectId}
                />
              </Form.Item>
            </Card>

            <Card title="Описание работ" style={{ marginBottom: 16 }}>
              <Form.Item
                label="Наименование доп. работ"
                name="workName"
                rules={[{ required: true, message: 'Введите наименование' }]}
              >
                <Input.TextArea
                  placeholder="Например: Дополнительные выпуска секция 1.1-1.2"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={4000}
                  showCount
                />
              </Form.Item>
              <Form.Item label="Примечание" name="note">
                <Input.TextArea
                  placeholder="Контекст, ссылки, обоснования"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={8000}
                  showCount
                />
              </Form.Item>
            </Card>

            <Card title="Расчёт суммы" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Прямые затраты (ПЗ), ₽"
                    name="directCost"
                    rules={[{ required: true, message: 'Укажите прямые затраты' }]}
                  >
                    <InputNumber<number>
                      style={{ width: '100%' }}
                      min={0}
                      step={1000}
                      formatter={(v) =>
                        v === undefined || v === null
                          ? ''
                          : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                      }
                      parser={(v) => Number((v ?? '').replace(/\s/g, '')) as 0}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Коэф. накладных"
                    name="overheadCoeff"
                    rules={[{ required: true, message: 'Укажите коэффициент' }]}
                    tooltip="ПЗ × коэф = Итог. Включает накладные, плановые накопления, НДС."
                  >
                    <InputNumber<number>
                      style={{ width: '100%' }}
                      min={0}
                      max={5}
                      step={0.01}
                      precision={4}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '4px 0 16px' }} />
              <Statistic
                title="Итоговая сумма к подаче"
                value={Number(total)}
                precision={0}
                formatter={(v) => formatMoney(v as number)}
                valueStyle={{ color: '#2F6FEB', fontWeight: 700 }}
              />
            </Card>

            <Card title="Документы">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Исх. номер письма" name="letterNumber">
                    <Input placeholder="ИНДЖ-ИСХ-2602-0003" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Дата отправки" name="letterSentAt">
                    <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Номер ДС (если подписан)" name="dsNumber">
                <Input placeholder="142-ДС-7" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Ответственный" style={{ marginBottom: 16 }}>
              <Form.Item label="ФИО исполнителя" name="assigneeId">
                <Select
                  placeholder="Выберите сотрудника"
                  options={users.map((u) => ({ label: u.fullName, value: u.id }))}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
            </Card>

            <Card title="Краткая сводка" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ color: '#6B7280', fontSize: 12 }}>Разделов</div>
                <div>{sectionIds?.length ?? 0}</div>
                <div style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>Прямые затраты</div>
                <div style={{ fontWeight: 500 }}>{formatMoney(directCost ?? 0)}</div>
                <div style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>Коэффициент</div>
                <div style={{ fontWeight: 500 }}>×{Number(overheadCoeff ?? 1).toFixed(4)}</div>
                <div style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>Итог</div>
                <div style={{ fontWeight: 700, color: '#2F6FEB', fontSize: 18 }}>
                  {formatMoney(total)}
                </div>
              </Space>
            </Card>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)}>Отмена</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<Save size={14} />}
                loading={submitting}
              >
                {mode === 'create' ? 'Создать расчёт' : 'Сохранить'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </>
  );
}
