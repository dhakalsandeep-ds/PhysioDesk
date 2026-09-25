export interface Patient {
  id: number;
  name: string;
  phone: string;
  age: number;
  gender: string;
  address: string;
  condition: string;
  assigned_therapist_id: number | null;
  package: string;
  status: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedPatientsResponse {
  items: Patient[];
  pagination: PaginationMeta;
}


export interface SessionHistoryItem {
  id: number;
  date: string;
  time_slot: string;
  therapist_name: string;
  payment_method: string;
  status: string;
  notes: string | null;
}

export interface BillingSummary {
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  booked_sessions: number;
  payment_breakdown: Record<string, number>;
}

