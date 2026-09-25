from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, model_validator

VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
VALID_SLOT_DURATIONS = [15, 30, 45, 60]

def parse_time(time_str: Optional[str]) -> Optional[datetime]:
    if not time_str:
        return None
    return datetime.strptime(time_str, "%H:%M")

class TherapistCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    specialty: str = Field(min_length=2, max_length=100)
    working_days: str
    start_time: str
    end_time: str
    slot_duration: int
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None

    @field_validator("working_days")
    @classmethod
    def validate_working_days(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("working_days cannot be empty.")
        days = [d.strip() for d in v.split(",") if d.strip()]
        if not days:
            raise ValueError("working_days must contain at least one day.")
        invalid = [d for d in days if d not in VALID_DAYS]
        if invalid:
            raise ValueError(f"Invalid day names: {', '.join(invalid)}. Allowed: {', '.join(VALID_DAYS)}")
        
        seen = set()
        normalized = [d for d in days if not (d in seen or seen.add(d))]
        return ",".join(normalized)

    @field_validator("start_time", "end_time", "break_start_time", "break_end_time")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            datetime.strptime(v, "%H:%M")
            return v
        except ValueError:
            raise ValueError(f"Invalid time '{v}'. Must be HH:MM (24-hour).")

    @field_validator("slot_duration")
    @classmethod
    def validate_slot_duration(cls, v: int) -> int:
        if v not in VALID_SLOT_DURATIONS:
            raise ValueError(f"slot_duration must be one of {VALID_SLOT_DURATIONS}")
        return v

    @model_validator(mode="after")
    def validate_time_range(self):
        start = parse_time(self.start_time)
        end = parse_time(self.end_time)

        if start and end:
            if end <= start:
                raise ValueError("end_time must be strictly after start_time.")
            if (end - start).total_seconds() > 12 * 3600:
                raise ValueError("Shift cannot exceed 12 hours.")

        break_start = parse_time(self.break_start_time)
        break_end = parse_time(self.break_end_time)

        if break_start and break_end:
            if break_end <= break_start:
                raise ValueError("break_end_time must be after break_start_time.")
            if start and end and (break_start < start or break_end > end):
                raise ValueError("Break must be within working hours.")
        elif bool(break_start) != bool(break_end):
            raise ValueError("Provide both break_start_time and break_end_time, or neither.")

        return self


class TherapistUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    specialty: Optional[str] = Field(default=None, min_length=2, max_length=100)
    working_days: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_duration: Optional[int] = None
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None

    @field_validator("working_days")
    @classmethod
    def validate_working_days(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return TherapistCreate.validate_working_days(v)

    @field_validator("start_time", "end_time", "break_start_time", "break_end_time")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return TherapistCreate.validate_time_format(v)

    @field_validator("slot_duration")
    @classmethod
    def validate_slot_duration(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v not in VALID_SLOT_DURATIONS:
            raise ValueError(f"slot_duration must be one of {VALID_SLOT_DURATIONS}")
        return v

    @model_validator(mode="after")
    def validate_partial_time_range(self):
        start = parse_time(self.start_time)
        end = parse_time(self.end_time)
        if start and end and end <= start:
            raise ValueError("end_time must be strictly after start_time.")

        break_start = parse_time(self.break_start_time)
        break_end = parse_time(self.break_end_time)
        if break_start and break_end and break_end <= break_start:
            raise ValueError("break_end_time must be after break_start_time.")

        return self


class ScheduleOverrideCreate(BaseModel):
    therapist_id: int
    date: str
    is_day_off: bool = False
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            parsed = datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.")
        if parsed < date.today():
            raise ValueError("Override date cannot be in the past.")
        return v

    @field_validator("custom_start_time", "custom_end_time", "break_start_time", "break_end_time")
    @classmethod
    def validate_custom_times(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            datetime.strptime(v, "%H:%M")
            return v
        except ValueError:
            raise ValueError(f"Invalid time '{v}'. Must be HH:MM.")

    @model_validator(mode="after")
    def validate_custom_time_range(self):
        c_start = parse_time(self.custom_start_time)
        c_end = parse_time(self.custom_end_time)

        if c_start and c_end and c_end <= c_start:
            raise ValueError("custom_end_time must be after custom_start_time.")
        if bool(c_start) != bool(c_end):
            raise ValueError("Provide both custom_start_time and custom_end_time, or neither.")

        b_start = parse_time(self.break_start_time)
        b_end = parse_time(self.break_end_time)

        if b_start and b_end and b_end <= b_start:
            raise ValueError("break_end_time must be after break_start_time.")
        if bool(b_start) != bool(b_end):
            raise ValueError("Provide both break_start_time and break_end_time, or neither.")

        return self


class TherapistRosterDetail(BaseModel):
    id: int
    name: str
    specialty: str
    working_days: list[str]
    start_time: str
    end_time: str
    slot_duration: int
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None
    daily_capacity_hours: float
    booked_hours_today: float
    utilization_today_percent: float
    patients_seen_today: int

