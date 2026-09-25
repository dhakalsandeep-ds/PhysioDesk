from pydantic import BaseModel
from typing import Optional
from patients.models import Patient

class TherapistCapacitySummary(BaseModel):
    therapist_id: int
    therapist_name: str
    booked_slots_count: int
    free_slots_count: int
    total_slots_capacity: int
    visual_slots_timeline: list[dict] 

class PatientRecentSummary(BaseModel):
    id: int
    name: str
    condition: str
    assigned_therapist_name: str
    package: str
    status: str

class DashboardStatsPayload(BaseModel):
    patients_seen_today: int
    therapists_on_duty_today: int
    revenue_collected_today: float
    open_slots_remaining_today: int
    therapist_capacity_grid: list[TherapistCapacitySummary]
    recent_patients: list[PatientRecentSummary]

