import { v4 as uuid } from '@/shared/lib/uuid';
import { loadDb, saveDb } from './db/storage';
import { computeTotal } from '@/entities/calculation/compute';
import { canTransit } from '@/entities/calculation/workflow';
import type {
  Calculation,
  CalculationId,
  CalculationVersion,
  CalcVersionId,
  ObjectId,
  StatusCode,
  StatusTransition,
  UserId,
  RoleCode,
  Decimal,
  RDSectionId,
  RDDocumentId,
  CalcTypeId,
  TransitionId,
  Attachment,
  AttachmentId,
} from '@/shared/schemas';

export interface ListFilters {
  objectIds?: ObjectId[];
  statuses?: StatusCode[];
  calcTypeIds?: CalcTypeId[];
  sectionIds?: RDSectionId[];
  assigneeIds?: UserId[];
  search?: string;
  amountMin?: number;
  amountMax?: number;
  sentFrom?: string;
  sentTo?: string;
}

export interface CalcRowView {
  calculation: Calculation;
  currentVersion: CalculationVersion;
  versions: CalculationVersion[];
  objectName: string;
  objectColor: string;
  sectionCodes: string[];
  calcTypeName: string | null;
  assigneeName: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getDb() {
  return loadDb();
}

function buildView(
  calc: Calculation,
  versions: CalculationVersion[],
  maps: {
    objects: Map<string, { id: string; name: string; color?: string }>;
    users: Map<string, { id: string; fullName: string }>;
    ctypes: Map<string, { id: string; name: string }>;
    sections: Map<string, { id: string; code: string }>;
  },
): CalcRowView {
  const sorted = [...versions].sort((a, b) => b.versionNo - a.versionNo);
  const current = sorted.find((v) => v.id === calc.currentVersionId) ?? sorted[0];
  const obj = maps.objects.get(calc.objectId);
  return {
    calculation: calc,
    currentVersion: current,
    versions: sorted,
    objectName: obj?.name ?? '?',
    objectColor: obj?.color ?? '#6B7280',
    sectionCodes: calc.sectionIds.map((id) => maps.sections.get(id)?.code ?? '').filter(Boolean),
    calcTypeName: calc.calcTypeId ? maps.ctypes.get(calc.calcTypeId)?.name ?? null : null,
    assigneeName: calc.assigneeId ? maps.users.get(calc.assigneeId)?.fullName ?? null : null,
  };
}

export function listCalculations(filters: ListFilters = {}): CalcRowView[] {
  const db = getDb();
  const versionsByCalc = new Map<CalculationId, CalculationVersion[]>();
  for (const v of db.versions) {
    const arr = versionsByCalc.get(v.calculationId) ?? [];
    arr.push(v);
    versionsByCalc.set(v.calculationId, arr);
  }

  const maps = {
    objects: new Map(db.objects.map((o) => [o.id as string, o])),
    users: new Map(db.users.map((u) => [u.id as string, u])),
    ctypes: new Map(db.calcTypes.map((t) => [t.id as string, t])),
    sections: new Map(db.sections.map((s) => [s.id as string, s])),
  };

  const result: CalcRowView[] = [];
  for (const c of db.calculations) {
    const vers = versionsByCalc.get(c.id) ?? [];
    if (!vers.length) continue;
    const view = buildView(c, vers, maps);
    const current = view.currentVersion;

    if (filters.objectIds?.length && !filters.objectIds.includes(c.objectId)) continue;
    if (filters.statuses?.length && !filters.statuses.includes(current.status)) continue;
    if (
      filters.calcTypeIds?.length &&
      (!c.calcTypeId || !filters.calcTypeIds.includes(c.calcTypeId))
    )
      continue;
    if (filters.sectionIds?.length && !c.sectionIds.some((s) => filters.sectionIds!.includes(s)))
      continue;
    if (filters.assigneeIds?.length && (!c.assigneeId || !filters.assigneeIds.includes(c.assigneeId)))
      continue;
    if (filters.amountMin !== undefined && Number(current.totalAmount) < filters.amountMin)
      continue;
    if (filters.amountMax !== undefined && Number(current.totalAmount) > filters.amountMax)
      continue;
    if (filters.sentFrom && current.letter.sentAt && current.letter.sentAt < filters.sentFrom)
      continue;
    if (filters.sentTo && current.letter.sentAt && current.letter.sentAt > filters.sentTo) continue;

    if (filters.search) {
      const s = filters.search.toLowerCase();
      const hay = [
        c.workName,
        current.note,
        current.letter.outgoingNumber ?? '',
        current.dsNumber ?? '',
        String(c.serialNo),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(s)) continue;
    }

    result.push(view);
  }

  result.sort((a, b) =>
    b.currentVersion.updatedAt.localeCompare(a.currentVersion.updatedAt),
  );
  return result;
}

export function getCalculation(id: CalculationId): CalcRowView | null {
  const db = getDb();
  const calc = db.calculations.find((c) => c.id === id);
  if (!calc) return null;
  const versions = db.versions.filter((v) => v.calculationId === id);
  if (!versions.length) return null;
  const maps = {
    objects: new Map(db.objects.map((o) => [o.id as string, o])),
    users: new Map(db.users.map((u) => [u.id as string, u])),
    ctypes: new Map(db.calcTypes.map((t) => [t.id as string, t])),
    sections: new Map(db.sections.map((s) => [s.id as string, s])),
  };
  return buildView(calc, versions, maps);
}

export function getVersion(id: CalcVersionId): CalculationVersion | null {
  return getDb().versions.find((v) => v.id === id) ?? null;
}

export function getTransitions(versionId: CalcVersionId): StatusTransition[] {
  return getDb()
    .transitions.filter((t) => t.versionId === versionId)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

export interface CreateCalcInput {
  // Уровень расчёта
  objectId: ObjectId;
  calcTypeId: CalcTypeId | null;
  sectionIds: RDSectionId[];
  sourceRdIds: RDDocumentId[];
  workName: string;
  assigneeId: UserId | null;
  // Уровень первой версии
  directCost: Decimal;
  overheadCoeff: Decimal;
  letterNumber: string | null;
  letterSentAt: string | null;
  dsNumber: string | null;
  note: string;
  createdBy: UserId | null;
}

export function createCalculation(input: CreateCalcInput): {
  calculation: Calculation;
  version: CalculationVersion;
} {
  const result = saveDb((db) => {
    const sameObject = db.calculations.filter((c) => c.objectId === input.objectId);
    const nextSerial = sameObject.length
      ? Math.max(...sameObject.map((c) => c.serialNo)) + 1
      : 1;

    const calcId = uuid() as CalculationId;
    const versionId = uuid() as CalcVersionId;
    const total = computeTotal(input.directCost, input.overheadCoeff);
    const now = nowIso();

    const calculation: Calculation = {
      id: calcId,
      objectId: input.objectId,
      serialNo: nextSerial,
      calcTypeId: input.calcTypeId,
      sectionIds: input.sectionIds,
      sourceRdIds: input.sourceRdIds,
      workName: input.workName,
      assigneeId: input.assigneeId,
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    };

    const version: CalculationVersion = {
      id: versionId,
      calculationId: calcId,
      versionNo: 1,
      versionLabel: 'V1',
      directCost: input.directCost,
      overheadCoeff: input.overheadCoeff,
      totalAmount: total,
      letter: { outgoingNumber: input.letterNumber, sentAt: input.letterSentAt },
      attachments: [],
      status: 'PLAN',
      dsNumber: input.dsNumber,
      note: input.note,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    const transition: StatusTransition = {
      id: uuid() as TransitionId,
      versionId,
      fromStatus: null,
      toStatus: 'PLAN',
      performedBy: input.createdBy,
      performedAt: now,
      comment: 'Создан расчёт',
    };

    return {
      ...db,
      calculations: [...db.calculations, calculation],
      versions: [...db.versions, version],
      transitions: [...db.transitions, transition],
    };
  });

  const calc = result.calculations[result.calculations.length - 1];
  const ver = result.versions[result.versions.length - 1];
  return { calculation: calc, version: ver };
}

// Атрибуты расчёта (не версии)
export interface UpdateCalcInput {
  calcTypeId?: CalcTypeId | null;
  sectionIds?: RDSectionId[];
  sourceRdIds?: RDDocumentId[];
  workName?: string;
  assigneeId?: UserId | null;
}

export function updateCalculation(id: CalculationId, patch: UpdateCalcInput): Calculation {
  let updated: Calculation | null = null;
  saveDb((db) => {
    const calculations = db.calculations.map((c) => {
      if (c.id !== id) return c;
      const next: Calculation = {
        ...c,
        calcTypeId: patch.calcTypeId !== undefined ? patch.calcTypeId : c.calcTypeId,
        sectionIds: patch.sectionIds ?? c.sectionIds,
        sourceRdIds: patch.sourceRdIds ?? c.sourceRdIds,
        workName: patch.workName ?? c.workName,
        assigneeId: patch.assigneeId !== undefined ? patch.assigneeId : c.assigneeId,
        updatedAt: nowIso(),
      };
      updated = next;
      return next;
    });
    return { ...db, calculations };
  });
  if (!updated) throw new Error('Calculation not found');
  return updated;
}

// Атрибуты конкретной версии
export interface UpdateVersionInput {
  directCost?: Decimal;
  overheadCoeff?: Decimal;
  letterNumber?: string | null;
  letterSentAt?: string | null;
  dsNumber?: string | null;
  note?: string;
}

export function updateVersion(versionId: CalcVersionId, patch: UpdateVersionInput): CalculationVersion {
  let updated: CalculationVersion | null = null;
  saveDb((db) => {
    const versions = db.versions.map((v) => {
      if (v.id !== versionId) return v;
      const directCost = patch.directCost ?? v.directCost;
      const overheadCoeff = patch.overheadCoeff ?? v.overheadCoeff;
      const totalAmount =
        patch.directCost !== undefined || patch.overheadCoeff !== undefined
          ? computeTotal(directCost, overheadCoeff)
          : v.totalAmount;
      const next: CalculationVersion = {
        ...v,
        directCost,
        overheadCoeff,
        totalAmount,
        letter: {
          outgoingNumber:
            patch.letterNumber !== undefined ? patch.letterNumber : v.letter.outgoingNumber,
          sentAt: patch.letterSentAt !== undefined ? patch.letterSentAt : v.letter.sentAt,
        },
        dsNumber: patch.dsNumber !== undefined ? patch.dsNumber : v.dsNumber,
        note: patch.note !== undefined ? patch.note : v.note,
        updatedAt: nowIso(),
      };
      updated = next;
      return next;
    });
    const calculations = db.calculations.map((c) =>
      c.currentVersionId === versionId ? { ...c, updatedAt: nowIso() } : c,
    );
    return { ...db, versions, calculations };
  });
  if (!updated) throw new Error('Version not found');
  return updated;
}

export interface TransitInput {
  versionId: CalcVersionId;
  toStatus: StatusCode;
  performedBy: UserId | null;
  role: RoleCode;
  comment?: string;
}

export function transitStatus(input: TransitInput): StatusTransition {
  const db = getDb();
  const version = db.versions.find((v) => v.id === input.versionId);
  if (!version) throw new Error('Version not found');
  if (!canTransit(version.status, input.toStatus, input.role)) {
    throw new Error(`Переход ${version.status} → ${input.toStatus} запрещён для роли ${input.role}`);
  }
  const newTransition: StatusTransition = {
    id: uuid() as TransitionId,
    versionId: input.versionId,
    fromStatus: version.status,
    toStatus: input.toStatus,
    performedBy: input.performedBy,
    performedAt: nowIso(),
    comment: input.comment ?? '',
  };
  saveDb((d) => {
    const versions = d.versions.map((v) =>
      v.id === input.versionId ? { ...v, status: input.toStatus, updatedAt: nowIso() } : v,
    );
    const calculations = d.calculations.map((c) =>
      c.currentVersionId === input.versionId ? { ...c, updatedAt: nowIso() } : c,
    );
    return {
      ...d,
      versions,
      calculations,
      transitions: [...d.transitions, newTransition],
    };
  });
  return newTransition;
}

export function addAttachment(
  versionId: CalcVersionId,
  meta: Omit<Attachment, 'id' | 'uploadedAt' | 'uploadedBy'>,
  uploadedBy: UserId,
): Attachment {
  const id = uuid() as AttachmentId;
  const attachment: Attachment = { ...meta, id, uploadedAt: nowIso(), uploadedBy };
  saveDb((db) => ({
    ...db,
    versions: db.versions.map((v) =>
      v.id === versionId
        ? { ...v, attachments: [...v.attachments, attachment], updatedAt: nowIso() }
        : v,
    ),
  }));
  return attachment;
}

export function removeAttachment(versionId: CalcVersionId, attachmentId: AttachmentId): void {
  saveDb((db) => ({
    ...db,
    versions: db.versions.map((v) =>
      v.id === versionId
        ? {
            ...v,
            attachments: v.attachments.filter((a) => a.id !== attachmentId),
            updatedAt: nowIso(),
          }
        : v,
    ),
  }));
}

export function createNewVersion(calcId: CalculationId, createdBy: UserId | null): CalculationVersion {
  let created: CalculationVersion | null = null;
  saveDb((db) => {
    const calc = db.calculations.find((c) => c.id === calcId);
    if (!calc) throw new Error('Calculation not found');
    const existing = db.versions.filter((v) => v.calculationId === calcId);
    const maxNo = existing.reduce((m, v) => Math.max(m, v.versionNo), 0);
    const prev =
      existing.find((v) => v.id === calc.currentVersionId) ?? existing[existing.length - 1];
    const nextNo = maxNo + 1;
    const newVerId = uuid() as CalcVersionId;
    const now = nowIso();
    const newVersion: CalculationVersion = {
      ...prev,
      id: newVerId,
      versionNo: nextNo,
      versionLabel: `V${nextNo}`,
      status: 'PLAN',
      letter: { outgoingNumber: null, sentAt: null },
      attachments: [],
      dsNumber: null,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    created = newVersion;
    return {
      ...db,
      versions: [...db.versions, newVersion],
      calculations: db.calculations.map((c) =>
        c.id === calcId ? { ...c, currentVersionId: newVerId, updatedAt: now } : c,
      ),
      transitions: [
        ...db.transitions,
        {
          id: uuid() as TransitionId,
          versionId: newVerId,
          fromStatus: null,
          toStatus: 'PLAN',
          performedBy: createdBy,
          performedAt: now,
          comment: `Создана новая версия V${nextNo}`,
        },
      ],
    };
  });
  if (!created) throw new Error('Failed to create version');
  return created;
}

// Установить выбранную версию как текущую отображаемую для расчёта
export function setCurrentVersion(calcId: CalculationId, versionId: CalcVersionId): Calculation {
  let updated: Calculation | null = null;
  saveDb((db) => {
    const calculations = db.calculations.map((c) => {
      if (c.id !== calcId) return c;
      const next: Calculation = { ...c, currentVersionId: versionId, updatedAt: nowIso() };
      updated = next;
      return next;
    });
    return { ...db, calculations };
  });
  if (!updated) throw new Error('Calculation not found');
  return updated;
}
