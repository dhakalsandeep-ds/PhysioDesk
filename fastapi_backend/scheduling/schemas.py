from typing import Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class GridCellDetail(BaseModel):
    time_slot: str = Field(..., examples=["09:30"])
    status: str = Field(..., examples=["booked"])
    patient_name: Optional[str] = None
    appointment_id: Optional[int] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None

    @field_validator("status")
    @classmethod
    def validate_ui_status_tags(cls, v: str) -> str:
        allowed = ["open", "booked", "therapist-off", "continuation"]
        if v not in allowed:
            raise ValueError(f"Invalid status. Allowed: {', '.join(allowed)}")
        return v

    @field_validator("time_slot")
    @classmethod
    def validate_real_clock_time(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%H:%M")
            return v
        except ValueError:
            raise ValueError("Time must be HH:MM format.")


class TherapistColumnGrid(BaseModel):
    therapist_id: int
    therapist_name: str
    specialty: str = ""
    slots: list[GridCellDetail]


class ActiveOverrideInfo(BaseModel):
    therapist_id: int
    therapist_name: str
    override_id: int
    is_day_off: bool
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    normal_start_time: Optional[str] = None
    normal_end_time: Optional[str] = None
    working_days: Optional[list[str]] = None


class UnifiedCalendarGrid(BaseModel):
    master_time_slots: list[str]
    master_interval_minutes: int = 30
    therapist_columns: list[TherapistColumnGrid]
    active_overrides: list[ActiveOverrideInfo] = Field(default_factory=list)
