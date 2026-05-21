import type { ListFilters } from '@/services/calculations';
import type { ObjectId, StatusCode, RDSectionId, CalcTypeId, UserId } from '@/shared/schemas';

export interface RegistryFilterState {
  search: string;
  objectIds: ObjectId[];
  statuses: StatusCode[];
  calcTypeIds: CalcTypeId[];
  sectionIds: RDSectionId[];
  assigneeIds: UserId[];
  sentRange: [string, string] | null;
  amountRange: [number | null, number | null];
}

export const EMPTY_FILTERS: RegistryFilterState = {
  search: '',
  objectIds: [],
  statuses: [],
  calcTypeIds: [],
  sectionIds: [],
  assigneeIds: [],
  sentRange: null,
  amountRange: [null, null],
};

export function toServiceFilters(s: RegistryFilterState): ListFilters {
  return {
    search: s.search || undefined,
    objectIds: s.objectIds.length ? s.objectIds : undefined,
    statuses: s.statuses.length ? s.statuses : undefined,
    calcTypeIds: s.calcTypeIds.length ? s.calcTypeIds : undefined,
    sectionIds: s.sectionIds.length ? s.sectionIds : undefined,
    assigneeIds: s.assigneeIds.length ? s.assigneeIds : undefined,
    sentFrom: s.sentRange?.[0],
    sentTo: s.sentRange?.[1],
    amountMin: s.amountRange[0] ?? undefined,
    amountMax: s.amountRange[1] ?? undefined,
  };
}

export function countActiveFilters(s: RegistryFilterState): number {
  let n = 0;
  if (s.search) n++;
  if (s.objectIds.length) n++;
  if (s.statuses.length) n++;
  if (s.calcTypeIds.length) n++;
  if (s.sectionIds.length) n++;
  if (s.assigneeIds.length) n++;
  if (s.sentRange) n++;
  if (s.amountRange[0] !== null || s.amountRange[1] !== null) n++;
  return n;
}
