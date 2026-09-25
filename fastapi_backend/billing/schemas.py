from pydantic import BaseModel

class PrintableInvoiceView(BaseModel):
    invoice_id: int
    invoice_number: str
    date: str
    patient_name: str
    patient_phone: str
    service_or_package: str
    payment_method: str
    status: str
    financial_breakdown: str 
    printable_raw_ascii: str  

