export interface Therapist {
  id: number;
  name: string;
  specialty: string;
  working_days: string[];
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_start_time: string | null;
  break_end_time: string | null;
  daily_capacity_hours: number;
  booked_hours_today: number;
  utilization_today_percent: number;
  patients_seen_today: number;
}

export interface TherapistCreate {
  name: string;
  specialty: string;
  working_days: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
}

export interface ScheduleOverrideCreate {
  therapist_id: number;
  date: string;
  is_day_off: boolean;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
}
