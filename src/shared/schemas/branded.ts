import { z } from 'zod';

export const ObjectId = z.string().uuid().brand<'ObjectId'>();
export const RDSectionId = z.string().uuid().brand<'RDSectionId'>();
export const RDDocumentId = z.string().uuid().brand<'RDDocumentId'>();
export const CalcTypeId = z.string().uuid().brand<'CalcTypeId'>();
export const UserId = z.string().uuid().brand<'UserId'>();
export const CalculationId = z.string().uuid().brand<'CalculationId'>();
export const CalcVersionId = z.string().uuid().brand<'CalcVersionId'>();
export const TransitionId = z.string().uuid().brand<'TransitionId'>();
export const AttachmentId = z.string().uuid().brand<'AttachmentId'>();

export type ObjectId = z.infer<typeof ObjectId>;
export type RDSectionId = z.infer<typeof RDSectionId>;
export type RDDocumentId = z.infer<typeof RDDocumentId>;
export type CalcTypeId = z.infer<typeof CalcTypeId>;
export type UserId = z.infer<typeof UserId>;
export type CalculationId = z.infer<typeof CalculationId>;
export type CalcVersionId = z.infer<typeof CalcVersionId>;
export type TransitionId = z.infer<typeof TransitionId>;
export type AttachmentId = z.infer<typeof AttachmentId>;

export const Decimal = z.string().regex(/^-?\d+(\.\d{1,4})?$/, 'Invalid decimal');
export type Decimal = z.infer<typeof Decimal>;

export const IsoDate = z.string().datetime({ offset: true });
export type IsoDate = z.infer<typeof IsoDate>;
