import { z } from 'zod';
import {
  ObjectId,
  RDSectionId,
  RDDocumentId,
  CalcTypeId,
  IsoDate,
} from './branded';

export const ConstructionObjectSchema = z.object({
  id: ObjectId,
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().default(true),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type ConstructionObject = z.infer<typeof ConstructionObjectSchema>;

export const RDSectionSchema = z.object({
  id: RDSectionId,
  code: z.string().min(1).max(16),
  name: z.string().min(1).max(200),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type RDSection = z.infer<typeof RDSectionSchema>;

export const RDDocumentSchema = z.object({
  id: RDDocumentId,
  code: z.string().min(1).max(300),
  name: z.string().max(400).default(''),
  objectId: ObjectId,
  sectionId: RDSectionId.nullable(),
  issueDate: IsoDate.nullable(),
  hasExtraWork: z.boolean().default(false),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type RDDocument = z.infer<typeof RDDocumentSchema>;

export const CalculationTypeSchema = z.object({
  id: CalcTypeId,
  code: z.string().min(1).max(300),
  name: z.string().min(1).max(300),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type CalculationType = z.infer<typeof CalculationTypeSchema>;
