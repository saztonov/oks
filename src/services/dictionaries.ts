import { loadDb, saveDb } from './db/storage';
import { v4 as uuid } from '@/shared/lib/uuid';
import type {
  ConstructionObject,
  RDSection,
  RDDocument,
  CalculationType,
  User,
  ObjectId,
  RDSectionId,
  RDDocumentId,
  CalcTypeId,
  UserId,
} from '@/shared/schemas';

const nowIso = () => new Date().toISOString();

export const listObjects = (): ConstructionObject[] => loadDb().objects;
export const listSections = (): RDSection[] => loadDb().sections;
export const listRdDocuments = (): RDDocument[] => loadDb().rdDocuments;
export const listCalcTypes = (): CalculationType[] => loadDb().calcTypes;
export const listUsers = (): User[] => loadDb().users;

export const getObject = (id: ObjectId): ConstructionObject | undefined =>
  loadDb().objects.find((o) => o.id === id);
export const getSection = (id: RDSectionId): RDSection | undefined =>
  loadDb().sections.find((s) => s.id === id);
export const getRdDocument = (id: RDDocumentId): RDDocument | undefined =>
  loadDb().rdDocuments.find((d) => d.id === id);
export const getCalcType = (id: CalcTypeId): CalculationType | undefined =>
  loadDb().calcTypes.find((t) => t.id === id);
export const getUser = (id: UserId): User | undefined => loadDb().users.find((u) => u.id === id);

export function upsertObject(input: Omit<ConstructionObject, 'createdAt' | 'updatedAt'>): ConstructionObject {
  const now = nowIso();
  let result: ConstructionObject = { ...input, createdAt: now, updatedAt: now };
  saveDb((db) => {
    const exists = db.objects.find((o) => o.id === input.id);
    const objects = exists
      ? db.objects.map((o) => (o.id === input.id ? { ...o, ...input, updatedAt: now } : o))
      : [...db.objects, result];
    result = objects.find((o) => o.id === input.id) ?? result;
    return { ...db, objects };
  });
  return result;
}

export function upsertSection(input: Omit<RDSection, 'createdAt' | 'updatedAt'>): RDSection {
  const now = nowIso();
  let result: RDSection = { ...input, createdAt: now, updatedAt: now };
  saveDb((db) => {
    const exists = db.sections.find((s) => s.id === input.id);
    const sections = exists
      ? db.sections.map((s) => (s.id === input.id ? { ...s, ...input, updatedAt: now } : s))
      : [...db.sections, result];
    result = sections.find((s) => s.id === input.id) ?? result;
    return { ...db, sections };
  });
  return result;
}

export function upsertCalcType(input: Omit<CalculationType, 'createdAt' | 'updatedAt'>): CalculationType {
  const now = nowIso();
  let result: CalculationType = { ...input, createdAt: now, updatedAt: now };
  saveDb((db) => {
    const exists = db.calcTypes.find((t) => t.id === input.id);
    const calcTypes = exists
      ? db.calcTypes.map((t) => (t.id === input.id ? { ...t, ...input, updatedAt: now } : t))
      : [...db.calcTypes, result];
    result = calcTypes.find((t) => t.id === input.id) ?? result;
    return { ...db, calcTypes };
  });
  return result;
}

export function upsertUser(input: Omit<User, 'createdAt' | 'updatedAt'>): User {
  const now = nowIso();
  let result: User = { ...input, createdAt: now, updatedAt: now };
  saveDb((db) => {
    const exists = db.users.find((u) => u.id === input.id);
    const users = exists
      ? db.users.map((u) => (u.id === input.id ? { ...u, ...input, updatedAt: now } : u))
      : [...db.users, result];
    result = users.find((u) => u.id === input.id) ?? result;
    return { ...db, users };
  });
  return result;
}

export function createObject(input: { code: string; name: string; color?: string }): ConstructionObject {
  return upsertObject({
    id: uuid() as ObjectId,
    code: input.code,
    name: input.name,
    color: input.color,
    isActive: true,
  });
}

export function createSection(input: { code: string; name: string }): RDSection {
  return upsertSection({
    id: uuid() as RDSectionId,
    code: input.code,
    name: input.name,
  });
}

export function createCalcType(input: { code: string; name: string }): CalculationType {
  return upsertCalcType({
    id: uuid() as CalcTypeId,
    code: input.code,
    name: input.name,
  });
}

export function createUser(input: { fullName: string; email?: string | null; role: User['role'] }): User {
  return upsertUser({
    id: uuid() as UserId,
    fullName: input.fullName,
    email: input.email ?? null,
    role: input.role,
    isActive: true,
  });
}
