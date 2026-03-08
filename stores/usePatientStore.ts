import { create } from "zustand";
import type { Patient } from "@/types";

interface PatientStore {
  selected: Patient | null;
  search: string;
  setSelected: (p: Patient | null) => void;
  setSearch: (s: string) => void;
}

export const usePatientStore = create<PatientStore>()((set) => ({
  selected: null,
  search: "",
  setSelected: (p) => set({ selected: p }),
  setSearch: (s) => set({ search: s }),
}));