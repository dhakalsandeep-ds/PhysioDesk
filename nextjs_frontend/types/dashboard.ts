export interface SlotTimelineEntry {
  time: string;
  status: "booked" | "free";
}

export interface TherapistCapacitySummary {
  therapist_id: number;
  therapist_name: string;
  booked_slots_count: number;
  free_slots_count: number;
  total_slots_capacity: number;
  visual_slots_timeline: SlotTimelineEntry[];
}

export interface PatientRecentSummary {
  id: number;
  name: string;
  condition: string;
  assigned_therapist_name: string;
  package: string;
  status: string;
}

export interface DashboardStats {
  patients_seen_today: number;
  therapists_on_duty_today: number;
  revenue_collected_today: number;
  open_slots_remaining_today: number;
  therapist_capacity_grid: TherapistCapacitySummary[];
  recent_patients: PatientRecentSummary[];
}
