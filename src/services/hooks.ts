import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as calc from './calculations';
import * as dict from './dictionaries';
import { resetDb } from './db/storage';
import type {
  ObjectId,
  CalculationId,
  CalcVersionId,
  StatusCode,
  RoleCode,
  UserId,
  AttachmentId,
} from '@/shared/schemas';

const KEYS = {
  calcs: (filters?: calc.ListFilters) => ['calcs', filters ?? {}] as const,
  calc: (id: CalculationId) => ['calc', id] as const,
  version: (id: CalcVersionId) => ['version', id] as const,
  transitions: (id: CalcVersionId) => ['transitions', id] as const,
  objects: ['dict', 'objects'] as const,
  sections: ['dict', 'sections'] as const,
  rdDocs: ['dict', 'rdDocs'] as const,
  calcTypes: ['dict', 'calcTypes'] as const,
  users: ['dict', 'users'] as const,
};

export function useCalculations(filters: calc.ListFilters = {}) {
  return useQuery({
    queryKey: KEYS.calcs(filters),
    queryFn: () => calc.listCalculations(filters),
    staleTime: 1000,
  });
}

export function useCalculation(id: CalculationId | undefined) {
  return useQuery({
    queryKey: id ? KEYS.calc(id) : ['calc', null],
    queryFn: () => (id ? calc.getCalculation(id) : null),
    enabled: !!id,
  });
}

export function useTransitions(versionId: CalcVersionId | undefined) {
  return useQuery({
    queryKey: versionId ? KEYS.transitions(versionId) : ['transitions', null],
    queryFn: () => (versionId ? calc.getTransitions(versionId) : []),
    enabled: !!versionId,
  });
}

export function useObjects() {
  return useQuery({ queryKey: KEYS.objects, queryFn: () => dict.listObjects() });
}
export function useSections() {
  return useQuery({ queryKey: KEYS.sections, queryFn: () => dict.listSections() });
}
export function useRdDocuments() {
  return useQuery({ queryKey: KEYS.rdDocs, queryFn: () => dict.listRdDocuments() });
}
export function useCalcTypes() {
  return useQuery({ queryKey: KEYS.calcTypes, queryFn: () => dict.listCalcTypes() });
}
export function useUsers() {
  return useQuery({ queryKey: KEYS.users, queryFn: () => dict.listUsers() });
}

export function useCreateCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: calc.CreateCalcInput) => Promise.resolve(calc.createCalculation(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calcs'] });
    },
  });
}

export function useUpdateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { versionId: CalcVersionId; patch: calc.UpdateVersionInput }) =>
      Promise.resolve(calc.updateVersion(args.versionId, args.patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calcs'] });
      qc.invalidateQueries({ queryKey: ['calc'] });
      qc.invalidateQueries({ queryKey: ['version'] });
    },
  });
}

export function useUpdateCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { calcId: CalculationId; patch: calc.UpdateCalcInput }) =>
      Promise.resolve(calc.updateCalculation(args.calcId, args.patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calcs'] });
      qc.invalidateQueries({ queryKey: ['calc'] });
    },
  });
}

export function useSetCurrentVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { calcId: CalculationId; versionId: CalcVersionId }) =>
      Promise.resolve(calc.setCurrentVersion(args.calcId, args.versionId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calcs'] });
      qc.invalidateQueries({ queryKey: ['calc'] });
    },
  });
}

export function useTransit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      versionId: CalcVersionId;
      toStatus: StatusCode;
      performedBy: UserId | null;
      role: RoleCode;
      comment?: string;
    }) => Promise.resolve(calc.transitStatus(args)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calcs'] });
      qc.invalidateQueries({ queryKey: ['calc'] });
      qc.invalidateQueries({ queryKey: ['transitions'] });
    },
  });
}

export function useCreateNewVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { calcId: CalculationId; createdBy: UserId | null }) =>
      Promise.resolve(calc.createNewVersion(args.calcId, args.createdBy)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calcs'] });
      qc.invalidateQueries({ queryKey: ['calc'] });
    },
  });
}

export function useResetDb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => Promise.resolve(resetDb()),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useAddAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      versionId: CalcVersionId;
      attachment: Parameters<typeof calc.addAttachment>[1];
      uploadedBy: UserId;
    }) => Promise.resolve(calc.addAttachment(args.versionId, args.attachment, args.uploadedBy)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calc'] });
      qc.invalidateQueries({ queryKey: ['version'] });
    },
  });
}

export function useRemoveAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { versionId: CalcVersionId; attachmentId: AttachmentId }) =>
      Promise.resolve(calc.removeAttachment(args.versionId, args.attachmentId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calc'] });
      qc.invalidateQueries({ queryKey: ['version'] });
    },
  });
}

export function useUpsertObject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dict.upsertObject>[0]) =>
      Promise.resolve(dict.upsertObject(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dict', 'objects'] }),
  });
}
export function useUpsertSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dict.upsertSection>[0]) =>
      Promise.resolve(dict.upsertSection(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dict', 'sections'] }),
  });
}
export function useUpsertCalcType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dict.upsertCalcType>[0]) =>
      Promise.resolve(dict.upsertCalcType(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dict', 'calcTypes'] }),
  });
}
export function useUpsertUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dict.upsertUser>[0]) =>
      Promise.resolve(dict.upsertUser(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dict', 'users'] }),
  });
}

export function useObjectMap() {
  const { data: objects = [] } = useObjects();
  return new Map(objects.map((o) => [o.id as ObjectId, o]));
}
