from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, or_, func
from database import get_session
from auth.dependencies import get_current_user
from auth.models import User
from patients.models import Patient, PatientCreate
from scheduling.models import Appointment
from therapist.models import Therapist
from pydantic import BaseModel
from unified_response import SuccessResponse

router = APIRouter(prefix="/patients", tags=["Patient Directory"])



class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedPatientsResponse(BaseModel):
    items: list[Patient]
    pagination: PaginationMeta


class SessionHistoryItem(BaseModel):
    id: int
    date: str
    time_slot: str
    therapist_name: str
    payment_method: str
    status: str
    notes: Optional[str] = None


class BillingSummary(BaseModel):
    total_sessions: int
    completed_sessions: int
    cancelled_sessions: int
    booked_sessions: int
    payment_breakdown: dict[str, int]


@router.post("", response_model=SuccessResponse[Patient], status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if payload.assigned_therapist_id:
        therapist = session.get(Therapist, payload.assigned_therapist_id)
        if not therapist:
            raise HTTPException(status_code=404, detail="Assigned therapist not found.")

    db_patient = Patient(**payload.model_dump())
    session.add(db_patient)
    session.commit()
    session.refresh(db_patient)
    return SuccessResponse(message="Patient profile created successfully.", data=db_patient)

@router.get("", response_model=SuccessResponse[PaginatedPatientsResponse])
def list_patients(
    name_or_phone: Optional[str] = None,
    therapist_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(default=4, ge=1, le=100, description="Items per page (max 100)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Patient)
    count_statement = select(func.count(Patient.id))

    if name_or_phone:
        filter_cond = or_(
            Patient.name.contains(name_or_phone),
            Patient.phone.contains(name_or_phone),
        )
        statement = statement.where(filter_cond)
        count_statement = count_statement.where(filter_cond)

    if therapist_id:
        statement = statement.where(Patient.assigned_therapist_id == therapist_id)
        count_statement = count_statement.where(Patient.assigned_therapist_id == therapist_id)

    if status:
        statement = statement.where(Patient.status == status)
        count_statement = count_statement.where(Patient.status == status)

    total_items = session.exec(count_statement).one()
    total_pages = max(1, (total_items + page_size - 1)) 

    if page > total_pages:
        page = total_pages

    offset = (page - 1) * page_size
    statement = statement.offset(offset).limit(page_size)

    records = session.exec(statement).all()

    pagination = PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )

    return SuccessResponse(
        message="Patient directory records retrieved successfully.",
        data=PaginatedPatientsResponse(items=records, pagination=pagination),
    )


@router.get("/{patient_id}", response_model=SuccessResponse[Patient])
def get_patient_details(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Requested patient profile record not found.")
    return SuccessResponse(message="Patient record loaded successfully.", data=patient)


@router.get("/{patient_id}/sessions", response_model=SuccessResponse[list[SessionHistoryItem]])
def get_patient_sessions(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    appointments = session.exec(
        select(Appointment).where(Appointment.patient_id == patient_id)
    ).all()

    sessions = []
    for appt in appointments:
        therapist = session.get(Therapist, appt.therapist_id)
        sessions.append(
            SessionHistoryItem(
                id=appt.id,
                date=appt.date,
                time_slot=appt.time_slot,
                therapist_name=therapist.name if therapist else "Unknown",
                payment_method=appt.payment_method,
                status=appt.status,
                notes=appt.notes,
            )
        )

    sessions.sort(key=lambda x: (x.date, x.time_slot), reverse=True)

    return SuccessResponse(
        message="Patient session history retrieved successfully.",
        data=sessions,
    )


@router.get("/{patient_id}/billing", response_model=SuccessResponse[BillingSummary])
def get_patient_billing(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    appointments = session.exec(
        select(Appointment).where(Appointment.patient_id == patient_id)
    ).all()

    total = len(appointments)
    completed = sum(1 for a in appointments if a.status == "Completed")
    cancelled = sum(1 for a in appointments if a.status == "Cancelled")
    booked = sum(1 for a in appointments if a.status == "Booked")

    payment_breakdown: dict[str, int] = {}
    for appt in appointments:
        if appt.status == "Completed":
            method = appt.payment_method
            payment_breakdown[method] = payment_breakdown.get(method, 0) + 1

    summary = BillingSummary(
        total_sessions=total,
        completed_sessions=completed,
        cancelled_sessions=cancelled,
        booked_sessions=booked,
        payment_breakdown=payment_breakdown,
    )

    return SuccessResponse(
        message="Patient billing summary retrieved successfully.",
        data=summary,
    )


@router.put("/{patient_id}", response_model=SuccessResponse[Patient])
def update_patient(
    patient_id: int,
    payload: PatientCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_patient = session.get(Patient, patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Requested patient profile record not found.")

    if payload.assigned_therapist_id:
        therapist = session.get(Therapist, payload.assigned_therapist_id)
        if not therapist:
            raise HTTPException(status_code=404, detail="Assigned therapist not found.")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_patient, key, value)

    session.add(db_patient)
    session.commit()
    session.refresh(db_patient)
    return SuccessResponse(message="Patient profile updated successfully.", data=db_patient)


@router.delete("/{patient_id}", response_model=SuccessResponse[dict])
def delete_patient(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_patient = session.get(Patient, patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Requested patient profile record not found.")

    session.delete(db_patient)
    session.commit()
    return SuccessResponse(
        message="Patient profile record completely purged from system directory.",
        data={"deleted_id": patient_id},
    )
