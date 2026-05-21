import { z } from 'zod';
import {
  ConstructionObjectSchema,
  RDSectionSchema,
  RDDocumentSchema,
  CalculationTypeSchema,
} from './dictionaries';
import { UserSchema } from './user';
import {
  CalculationSchema,
  CalculationVersionSchema,
  StatusTransitionSchema,
} from './calculation';

export const DbSnapshotSchema = z.object({
  schemaVersion: z.literal(2),
  objects: z.array(ConstructionObjectSchema),
  sections: z.array(RDSectionSchema),
  rdDocuments: z.array(RDDocumentSchema),
  calcTypes: z.array(CalculationTypeSchema),
  users: z.array(UserSchema),
  calculations: z.array(CalculationSchema),
  versions: z.array(CalculationVersionSchema),
  transitions: z.array(StatusTransitionSchema),
});
export type DbSnapshot = z.infer<typeof DbSnapshotSchema>;
