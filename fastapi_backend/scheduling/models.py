from typing import Optional
from sqlmodel import Field, SQLModel

class Appointment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patient.id")
    therapist_id: int = Field(foreign_key="therapist.id")
    date: str             
    time_slot: str         
    payment_method: str     
    status: str = Field(default="Booked")  
    notes: Optional[str] = None

