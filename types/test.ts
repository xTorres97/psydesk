export type TestStatus = "sent" | "completed" | "reviewed";

export interface PsychTest {
  id: string;
  name: string;
  short_name: string;
  category: string;
  description: string;
  questions: number;
  duration_min: number;
  is_validated: boolean;
  icon: string;
  color: string;
}

export interface SentTest {
  id: string;
  test_id: string;
  patient_id: string;
  psychologist_id: string;
  sent_at: string;
  completed_at: string | null;
  status: TestStatus;
  score: number | null;
  max_score: number | null;
  level: string | null;
  // join
  patient?: { full_name: string; initials: string; color: string };
  test?: { short_name: string; name: string };
}