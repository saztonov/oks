import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleCode, UserId } from '@/shared/schemas';
import { loadDb } from '@/services/db/storage';

interface UiState {
  role: RoleCode;
  currentUserId: UserId | null;
  selectedObjectId: string | null;
  setRole: (role: RoleCode) => void;
  setCurrentUserId: (id: UserId | null) => void;
  setSelectedObjectId: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: 'EMPLOYEE',
      currentUserId: null,
      selectedObjectId: null,
      setRole: (role) => {
        const db = loadDb();
        const fallback = db.users.find((u) => u.role === role);
        set({
          role,
          currentUserId: (fallback?.id as UserId) ?? null,
        });
      },
      setCurrentUserId: (id) => set({ currentUserId: id }),
      setSelectedObjectId: (id) => set({ selectedObjectId: id }),
    }),
    {
      name: 'oks:ui:v1',
    },
  ),
);

export function useCurrentUser() {
  const userId = useUiStore((s) => s.currentUserId);
  const db = loadDb();
  if (userId) {
    const found = db.users.find((u) => u.id === userId);
    if (found) return found;
  }
  const role = useUiStore.getState().role;
  return db.users.find((u) => u.role === role) ?? db.users[0] ?? null;
}
