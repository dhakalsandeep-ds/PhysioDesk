import io
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from database import get_session
from auth.dependencies import get_current_user, require_admin
from auth.models import User
from billing.models import Invoice
from patients.models import Patient

from unified_response import SuccessResponse

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/billing", tags=["Financial & Billing Desk"])

@router.post("", response_model=SuccessResponse[Invoice], status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: Invoice, 
    session: Session = Depends(get_session), 
    current_admin: User = Depends(require_admin)
):
    patient = session.get(Patient, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Cannot generate bill. Target patient profile not found.")

    payload.total_amount = max(0.0, payload.subtotal - payload.discount)

    if not payload.invoice_number:
        serial = random.randint(1000, 9999)
        payload.invoice_number = f"INV-{datetime.now().year}-{serial}"
        
    if not payload.created_at:
        payload.created_at = datetime.now().strftime("%Y-%m-%d")

    session.add(payload)
    session.commit()
    session.refresh(payload)
    return SuccessResponse(message="Invoice receipt generated successfully.", data=payload)


@router.get("", response_model=SuccessResponse[list[dict]])
def list_invoices(
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_admin: User = Depends(require_admin)
):
    statement = select(Invoice)
    if status:
        statement = statement.where(Invoice.status == status)

    records = session.exec(statement).all()

    results = []
    for inv in records:
        inv_dict = inv.model_dump()
        patient = session.get(Patient, inv.patient_id)
        if patient:
            inv_dict["patient"] = {
                "id": patient.id,
                "name": patient.name,
                "phone": patient.phone
            }
        results.append(inv_dict)

    return SuccessResponse(message="Invoice listings retrieved successfully.", data=results)


@router.put("/{invoice_id}", response_model=SuccessResponse[Invoice])
def update_invoice(
    invoice_id: int, 
    payload: Invoice, 
    session: Session = Depends(get_session), 
    current_admin: User = Depends(require_admin)
):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record target not found.")
        
    payload.total_amount = max(0.0, payload.subtotal - payload.discount)
    
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(invoice, key, value)
        
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return SuccessResponse(message="Invoice ledger parameters updated successfully.", data=invoice)

@router.delete("/{invoice_id}", response_model=SuccessResponse[dict])
def void_invoice(
    invoice_id: int, 
    session: Session = Depends(get_session), 
    current_admin: User = Depends(require_admin)
):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice ledger target not found.")
        
    session.delete(invoice)
    session.commit()
    return SuccessResponse(message="Invoice successfully voided and deleted from financial logs.", data={"voided_id": invoice_id})

@router.get("/{invoice_id}/download-pdf", summary="Download official PDF invoice ledger")
def download_invoice_pdf(
    invoice_id: int, 
    session: Session = Depends(get_session), 
    current_admin: User = Depends(require_admin)
):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Requested invoice record target not found.")
        
    patient = session.get(Patient, invoice.patient_id)
    patient_name = patient.name if patient else "N/A"
    patient_phone = patient.phone if patient else "N/A"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36,
        title="PhysioDesk Official Invoice Ledger Statement"
    )
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'InvoiceTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=24, leading=28, textColor=colors.HexColor('#0F172A'), spaceAfter=15
    )
    meta_style = ParagraphStyle(
        'InvoiceMeta', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#475569')
    )
    
    story.append(Paragraph("PHYSIODESK CLINIC INVOICE", title_style))
    story.append(Paragraph(f"<b>Invoice No:</b> {invoice.invoice_number}", meta_style))
    story.append(Paragraph(f"<b>Issued Date:</b> {invoice.created_at}", meta_style))
    story.append(Paragraph(f"<b>Payment Status:</b> {invoice.status.upper()}", meta_style))
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("<b>BILL TO:</b>", ParagraphStyle('BillTo', parent=styles['Normal'], fontSize=11, spaceAfter=4)))
    story.append(Paragraph(f"Name: {patient_name}", meta_style))
    story.append(Paragraph(f"Contact: {patient_phone}", meta_style))
    story.append(Spacer(1, 25))
    
    table_data = [
        [Paragraph("<b>Description / Treatment Service</b>", styles['Normal']), Paragraph("<b>Total Amount (NPR)</b>", styles['Normal'])],
        [Paragraph(invoice.service_or_package, styles['Normal']), f"{invoice.subtotal:.2f}"],
        [Paragraph("<b>Subtotal Balance</b>", styles['Normal']), f"{invoice.subtotal:.2f}"],
        [Paragraph("<b>Flat Deductible Discount</b>", styles['Normal']), f"- {invoice.discount:.2f}"],
        [Paragraph("<b>GRAND TOTAL DUE</b>", styles['Normal']), f"{invoice.total_amount:.2f}"]
    ]
    
    financial_table = Table(table_data, colWidths=[400, 140])
    financial_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.HexColor('#0F172A')),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor('#0F172A')),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.HexColor('#CBD5E1')),
        ('LINEABOVE', (0, 2), (-1, 2), 1, colors.HexColor('#94A3B8')),
        ('FONTNAME', (0, 4), (1, 4), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 4), (1, 4), colors.HexColor('#F8FAFC')),
    ]))
    
    story.append(financial_table)
    story.append(Spacer(1, 40))
    story.append(Paragraph("This is a computer generated invoice statement. For transaction inquiries, email support@physiodesk.com.", meta_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"}
    )
