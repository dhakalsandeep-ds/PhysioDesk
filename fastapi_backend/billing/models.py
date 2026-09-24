from typing import Optional
from sqlmodel import Field, SQLModel

class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patient.id", index=True) 
    invoice_number: str = Field(unique=True, index=True)          
    service_or_package: str                                      
    subtotal: float                                            
    discount: float = Field(default=0.0)                      
    total_amount: float                                      
    payment_method: str                                     
    status: str                                            
    created_at: str                                       

