import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// S4 (odd/tasks/privacy-identifiers-and-copy.md): the last citizen identifier
// typed by the user is a convenience only — it never comes back from the API.
interface UiState {
  lastDni: string;
  setLastDni: (dni: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      lastDni: '',
      setLastDni: (lastDni) => set({ lastDni }),
    }),
    {
      name: 'comunasport-ui',
      partialize: (state) => ({ lastDni: state.lastDni }),
    },
  ),
);
