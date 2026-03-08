export type PatientStatus = "active" | "waitlist" | "discharged" | "archived";
export type Modality = "presencial" | "online" | "mixto";

export interface Patient {
  id: string;
  psychologist_id: string;
  full_name: string;
  initials: string;
  color: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  age: number | null;
  diagnosis: string | null;
  status: PatientStatus;
  modality: Modality;
  session_count: number;
  since: string;
  next_session: string | null;
  last_session: string | null;
  pending_test: boolean;
  pending_note: boolean;
  created_at: string;
  updated_at: string;
}