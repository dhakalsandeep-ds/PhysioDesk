from typing import Optional
from sqlmodel import Field, SQLModel
from pydantic import BaseModel
from pydantic import BaseModel, field_validator, Field as PydanticField
import re

class Patient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone: str = Field(index=True) # Optimized database indexing for search boxes [3.3]
    age: int
    gender: str
    address: str
    condition: str
    assigned_therapist_id: Optional[int] = Field(default=None, foreign_key="therapist.id")
    package: str      
    status: str  


class PatientCreate(BaseModel):
    name: str = PydanticField(
        min_length=2, max_length=50, 
        examples=["Sandeep Sharma"], 
        description="Full legal name of the patient"
    )
    phone: str = PydanticField(
        examples=["9801234567"], 
        description="Valid Nepali mobile or contact number"
    )
    age: int = PydanticField(
        ge=1, le=120, 
        examples=[28], 
        description="Age must be between 1 and 120"
    )
    gender: str = PydanticField(
        examples=["Male"], 
        description="Supported options: Male, Female, Other"
    )
    address: str = PydanticField(
        min_length=3, 
        examples=["Manamaiju, Kathmandu"], 
        description="Residential address location"
    )
    condition: str = PydanticField(
        min_length=3, 
        examples=["Chronic Lower Back Pain"], 
        description="Primary clinical condition or diagnosis"
    )
    assigned_therapist_id: Optional[int] = PydanticField(
        default=None, 
        examples=[1]
    )
    package: str = PydanticField(
        examples=["Premium Package"], 
        description="Options: Basic Plan, Premium Package, None"
    )
    status: str = PydanticField(
        default="Active", 
        examples=["Active"], 
        description="Options: Active, Completed, On hold"
    )

    @field_validator("phone")
    @classmethod
    def validate_nepali_phone(cls, v: str) -> str:
        clean_v = v.replace(" ", "").replace("-", "")
        if not re.match(r"^(98\d{8}|97\d{8}|01\d{6,7})$", clean_v):
            raise ValueError("Invalid phone format. Please supply a valid Nepali phone number.")
        return clean_v

    @field_validator("status")
    @classmethod
    def validate_status_choices(cls, v: str) -> str:
        allowed = ["Active", "Completed", "On hold"]
        if v not in allowed:
            raise ValueError(f"Invalid status tag selection. Allowed options are: {', '.join(allowed)}")
        return v
