export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

export interface Appointment {
  id: string;
  patient_id: string;
  psychologist_id: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  status: AppointmentStatus;
  modality: "presencial" | "online";
  notes: string | null;
  session_num: number;
  created_at: string;
  // join
  patient?: {
    full_name: string;
    initials: string;
    color: string;
    diagnosis: string | null;
  };
}