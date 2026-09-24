from typing import Optional
from sqlmodel import Field, SQLModel

class Therapist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    specialty: str
    working_days: str
    start_time: str
    end_time: str
    slot_duration: int
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None
    is_active: bool = Field(default=True)

class ScheduleOverride(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    therapist_id: int = Field(foreign_key="therapist.id", index=True)
    date: str
    is_day_off: bool = Field(default=False)
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None

