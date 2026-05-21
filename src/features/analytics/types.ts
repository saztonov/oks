import type { ListFilters } from '@/services/calculations';
import type { ObjectId, StatusCode, UserId } from '@/shared/schemas';

export type AnalyticsMode = 'objects' | 'employees' | 'statuses';

export interface AnalyticsFilters {
  objectIds: ObjectId[];
  assigneeIds: UserId[];
  statuses: StatusCode[];
  sentRange: [string, string] | null;
}

export const EMPTY_ANALYTICS_FILTERS: AnalyticsFilters = {
  objectIds: [],
  assigneeIds: [],
  statuses: [],
  sentRange: null,
};

export function toServiceFilters(f: AnalyticsFilters): ListFilters {
  return {
    objectIds: f.objectIds.length ? f.objectIds : undefined,
    assigneeIds: f.assigneeIds.length ? f.assigneeIds : undefined,
    statuses: f.statuses.length ? f.statuses : undefined,
    sentFrom: f.sentRange?.[0],
    sentTo: f.sentRange?.[1],
  };
}

export function countActiveAnalyticsFilters(f: AnalyticsFilters): number {
  return [
    f.objectIds.length,
    f.assigneeIds.length,
    f.statuses.length,
    f.sentRange ? 1 : 0,
  ].filter(Boolean).length;
}
