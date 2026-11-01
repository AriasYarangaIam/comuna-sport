import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  readingMode: boolean;
  lastUserId: string;
  lastReporterId: string;
  toggleReadingMode: () => void;
  setLastUserId: (userId: string) => void;
  setLastReporterId: (reporterId: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      readingMode: false,
      lastUserId: '',
      lastReporterId: '',
      toggleReadingMode: () =>
        set((state) => ({ readingMode: !state.readingMode })),
      setLastUserId: (lastUserId) => set({ lastUserId }),
      setLastReporterId: (lastReporterId) => set({ lastReporterId }),
    }),
    {
      name: 'comunasport-ui',
      partialize: (state) => ({
        readingMode: state.readingMode,
        lastUserId: state.lastUserId,
        lastReporterId: state.lastReporterId,
      }),
    },
  ),
);
