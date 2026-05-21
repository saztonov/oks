import { z } from 'zod';
import {
  CalculationId,
  CalcVersionId,
  ObjectId,
  CalcTypeId,
  RDSectionId,
  RDDocumentId,
  UserId,
  TransitionId,
  AttachmentId,
  Decimal,
  IsoDate,
} from './branded';
import { StatusCode } from './status';

export const LetterSchema = z.object({
  outgoingNumber: z.string().max(120).nullable().default(null),
  sentAt: IsoDate.nullable().default(null),
});
export type Letter = z.infer<typeof LetterSchema>;

export const AttachmentSchema = z.object({
  id: AttachmentId,
  fileName: z.string().max(400),
  mimeType: z.string().max(200),
  size: z.number().int().nonnegative(),
  kind: z.enum(['file', 'url']),
  storageKey: z.string(),
  uploadedAt: IsoDate,
  uploadedBy: UserId,
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// Версия расчёта — только данные, специфичные для конкретной версии
// (суммы, статус, документы отправки, файлы, ДС, примечание к версии)
export const CalculationVersionSchema = z.object({
  id: CalcVersionId,
  calculationId: CalculationId,
  versionNo: z.number().int().positive(),
  versionLabel: z.string().regex(/^V\d+$/),

  directCost: Decimal,
  overheadCoeff: Decimal,
  totalAmount: Decimal,

  letter: LetterSchema,
  attachments: z.array(AttachmentSchema).default([]),

  status: StatusCode,
  dsNumber: z.string().max(120).nullable().default(null),
  note: z.string().max(8000).default(''),

  createdAt: IsoDate,
  updatedAt: IsoDate,
  createdBy: UserId.nullable().default(null),
});
export type CalculationVersion = z.infer<typeof CalculationVersionSchema>;

// Расчёт — общие атрибуты, не меняющиеся между версиями
// (объект, тип, разделы, шифры РД, наименование работ, ответственный)
export const CalculationSchema = z.object({
  id: CalculationId,
  objectId: ObjectId,
  serialNo: z.number().int().positive(),

  calcTypeId: CalcTypeId.nullable(),
  sectionIds: z.array(RDSectionId).default([]),
  sourceRdIds: z.array(RDDocumentId).default([]),
  workName: z.string().min(1).max(4000),
  assigneeId: UserId.nullable().default(null),

  currentVersionId: CalcVersionId,
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Calculation = z.infer<typeof CalculationSchema>;

export const StatusTransitionSchema = z.object({
  id: TransitionId,
  versionId: CalcVersionId,
  fromStatus: StatusCode.nullable(),
  toStatus: StatusCode,
  performedBy: UserId.nullable(),
  performedAt: IsoDate,
  comment: z.string().max(2000).default(''),
});
export type StatusTransition = z.infer<typeof StatusTransitionSchema>;
