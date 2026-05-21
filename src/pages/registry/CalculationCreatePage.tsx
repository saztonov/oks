import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import dayjs from 'dayjs';
import {
  CalculationForm,
  EMPTY_VALUES,
  type CalculationFormValues,
} from '@/features/calculation-form/CalculationForm';
import {
  useCreateCalculation,
  useUpdateVersion,
  useUpdateCalculation,
} from '@/services/hooks';
import { useCurrentUser } from '@/app/stores/uiStore';
import { loadDb } from '@/services/db/storage';
import type { CalculationId, Decimal, UserId } from '@/shared/schemas';

type Mode = 'create' | 'edit';

export function CalculationCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editCalcId = params.get('edit') as CalculationId | null;
  const mode: Mode = editCalcId ? 'edit' : 'create';

  const create = useCreateCalculation();
  const updateCalc = useUpdateCalculation();
  const updateVer = useUpdateVersion();
  const user = useCurrentUser();
  const { message } = App.useApp();

  const initial = useMemo<CalculationFormValues>(() => {
    if (mode === 'create') {
      return { ...EMPTY_VALUES, assigneeId: (user?.id ?? null) as UserId | null };
    }
    const db = loadDb();
    const calc = db.calculations.find((c) => c.id === editCalcId);
    if (!calc) return EMPTY_VALUES;
    const v = db.versions.find((x) => x.id === calc.currentVersionId);
    if (!v) return EMPTY_VALUES;
    return {
      objectId: calc.objectId,
      calcTypeId: calc.calcTypeId,
      sectionIds: calc.sectionIds,
      sourceRdIds: calc.sourceRdIds,
      workName: calc.workName,
      assigneeId: calc.assigneeId,
      directCost: Number(v.directCost),
      overheadCoeff: Number(v.overheadCoeff),
      letterNumber: v.letter.outgoingNumber ?? '',
      letterSentAt: v.letter.sentAt ? dayjs(v.letter.sentAt) : null,
      dsNumber: v.dsNumber ?? '',
      note: v.note,
    };
  }, [mode, editCalcId, user]);

  function onSubmit(values: CalculationFormValues) {
    if (mode === 'edit' && editCalcId) {
      const db = loadDb();
      const calc = db.calculations.find((c) => c.id === editCalcId);
      if (!calc) {
        message.error('Расчёт не найден');
        return;
      }
      // 1) Обновить атрибуты расчёта
      updateCalc.mutate(
        {
          calcId: editCalcId,
          patch: {
            calcTypeId: values.calcTypeId,
            sectionIds: values.sectionIds,
            sourceRdIds: values.sourceRdIds,
            workName: values.workName,
            assigneeId: values.assigneeId,
          },
        },
        {
          onError: () => message.error('Ошибка сохранения атрибутов расчёта'),
        },
      );
      // 2) Обновить текущую версию
      updateVer.mutate(
        {
          versionId: calc.currentVersionId,
          patch: {
            directCost: values.directCost.toFixed(2) as Decimal,
            overheadCoeff: values.overheadCoeff.toFixed(4) as Decimal,
            letterNumber: values.letterNumber || null,
            letterSentAt: values.letterSentAt ? values.letterSentAt.toISOString() : null,
            dsNumber: values.dsNumber || null,
            note: values.note,
          },
        },
        {
          onSuccess: () => {
            message.success('Расчёт обновлён');
            navigate(`/registry/${editCalcId}`);
          },
          onError: () => message.error('Ошибка сохранения версии'),
        },
      );
    } else {
      if (!values.objectId) return;
      create.mutate(
        {
          objectId: values.objectId,
          calcTypeId: values.calcTypeId,
          sectionIds: values.sectionIds,
          sourceRdIds: values.sourceRdIds,
          workName: values.workName,
          assigneeId: values.assigneeId,
          directCost: values.directCost.toFixed(2) as Decimal,
          overheadCoeff: values.overheadCoeff.toFixed(4) as Decimal,
          letterNumber: values.letterNumber || null,
          letterSentAt: values.letterSentAt ? values.letterSentAt.toISOString() : null,
          dsNumber: values.dsNumber || null,
          note: values.note,
          createdBy: user?.id ?? null,
        },
        {
          onSuccess: (res) => {
            message.success('Расчёт создан');
            navigate(`/registry/${res.calculation.id}`);
          },
        },
      );
    }
  }

  return (
    <CalculationForm
      mode={mode}
      initial={initial}
      onSubmit={onSubmit}
      submitting={create.isPending || updateCalc.isPending || updateVer.isPending}
    />
  );
}
