export interface GridCellDetail {
  time_slot: string;
  status: "open" | "booked" | "therapist-off" | "on-break";
  patient_name?: string | null;
  appointment_id?: number | null;
  payment_method?: string | null;
  notes?: string | null;
  duration_minutes?: number;
}

export interface TherapistColumnGrid {
  therapist_id: number;
  therapist_name: string;
  specialty: string;
  slots: GridCellDetail[];
}

export interface ActiveOverrideInfo {
  therapist_id: number;
  therapist_name: string;
  override_id: number;
  is_day_off: boolean;
  custom_start_time: string | null;
  custom_end_time: string | null;
  normal_start_time?: string | null;
  normal_end_time?: string | null;
  working_days?: string[] | null;
}

export interface UnifiedCalendarGrid {
  master_time_slots: string[];
  master_interval_minutes: number;
  therapist_columns: TherapistColumnGrid[];
  active_overrides: ActiveOverrideInfo[]; 
}

export interface AppointmentCreate {
  patient_id: number;
  therapist_id: number;
  date: string;
  time_slot: string;
  payment_method: string;
  status?: string;
  notes?: string;
}
