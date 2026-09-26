from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from auth.dependencies import get_current_user, require_admin
from auth.models import User
from scheduling.models import Appointment
from scheduling.schemas import (
    GridCellDetail,
    TherapistColumnGrid,
    UnifiedCalendarGrid,
    ActiveOverrideInfo,
)
from therapist.models import Therapist, ScheduleOverride
from patients.models import Patient
from unified_response import SuccessResponse

router = APIRouter(prefix="/schedule", tags=["Clinic Calendar Grid"])

MASTER_INTERVAL_MINUTES = 30


def _build_master_timeline(therapists: list[Therapist]) -> list[str]:
    if not therapists:
        return []
    earliest = min(datetime.strptime(t.start_time, "%H:%M") for t in therapists)
    latest = max(datetime.strptime(t.end_time, "%H:%M") for t in therapists)
    slots, current = [], earliest
    while current < latest:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=MASTER_INTERVAL_MINUTES)
    return slots


def _is_available(
    therapist: Therapist,
    override: ScheduleOverride | None,
    target_date: datetime,
    slot_time: str,
) -> bool:
    """Check if therapist is working at this specific time slot."""
    day_of_week = target_date.strftime("%A")
    working_days = [d.strip() for d in therapist.working_days.split(",") if d.strip()]

    if override and override.is_day_off:
        return False

    if override and override.custom_start_time and override.custom_end_time:
        start_str, end_str = override.custom_start_time, override.custom_end_time
    else:
        if day_of_week not in working_days:
            return False
        start_str, end_str = therapist.start_time, therapist.end_time

    start = datetime.strptime(start_str, "%H:%M")
    end = datetime.strptime(end_str, "%H:%M")
    slot_dt = datetime.strptime(slot_time, "%H:%M")
    return start <= slot_dt < end


def _get_working_hours(
    therapist: Therapist, 
    override: ScheduleOverride | None
) -> tuple[datetime, datetime]:
    """Get the effective working hours for a therapist on a given day."""
    if override and override.custom_start_time and override.custom_end_time:
        start = datetime.strptime(override.custom_start_time, "%H:%M")
        end = datetime.strptime(override.custom_end_time, "%H:%M")
    else:
        start = datetime.strptime(therapist.start_time, "%H:%M")
        end = datetime.strptime(therapist.end_time, "%H:%M")
    return start, end


def _appointment_fits_in_working_hours(
    start_time: str,
    slot_duration: int,
    working_end: datetime,
) -> bool:
    """Check if the full appointment fits within working hours."""
    start_dt = datetime.strptime(start_time, "%H:%M")
    appointment_end = start_dt + timedelta(minutes=slot_duration)
    return appointment_end <= working_end


def _validate_not_past_date(date_str: str) -> None:
    """Block any operation on past dates."""
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format.")
    
    if target < datetime.now().date():
        raise HTTPException(
            status_code=400,
            detail=f"Cannot schedule for a past date ({date_str}). Please select today or a future date.",
        )



@router.get("/grid", response_model=SuccessResponse[UnifiedCalendarGrid])
def get_calendar_grid(
    date: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.")

    therapists = session.exec(
        select(Therapist).where(Therapist.is_active == True)
    ).all()
    master_time_slots = _build_master_timeline(therapists)

    appointments = session.exec(
        select(Appointment).where(
            Appointment.date == date,
            Appointment.status != "Cancelled"
        )
    ).all()
    bookings_map = {(a.therapist_id, a.time_slot): a for a in appointments}

    active_overrides: list[ActiveOverrideInfo] = []
    therapist_columns: list[TherapistColumnGrid] = []

    for t in therapists:
        override = session.exec(
            select(ScheduleOverride)
            .where(ScheduleOverride.therapist_id == t.id)
            .where(ScheduleOverride.date == date)
        ).first()

        if override:
            working_days_list = [d.strip() for d in t.working_days.split(",") if d.strip()]
            active_overrides.append(ActiveOverrideInfo(
                therapist_id=t.id,
                therapist_name=t.name,
                override_id=override.id,
                is_day_off=override.is_day_off,
                custom_start_time=override.custom_start_time,
                custom_end_time=override.custom_end_time,
                normal_start_time=t.start_time,
                normal_end_time=t.end_time,
                working_days=working_days_list,
            ))

        working_start, working_end = _get_working_hours(t, override)

        slots: list[GridCellDetail] = []
        blocked_until = None
        blocked_appt = None

        for slot_time in master_time_slots:
            slot_dt = datetime.strptime(slot_time, "%H:%M")

            appt = bookings_map.get((t.id, slot_time))

            if appt:
                patient = session.get(Patient, appt.patient_id)
                blocked_until = slot_dt + timedelta(minutes=t.slot_duration)
                blocked_appt = GridCellDetail(
                    time_slot=slot_time,
                    status="booked",
                    patient_name=patient.name if patient else "Unknown",
                    appointment_id=appt.id,
                    payment_method=appt.payment_method,
                    notes=appt.notes,
                    duration_minutes=t.slot_duration,   
                )
                slots.append(blocked_appt)
                continue

            if blocked_until and slot_dt < blocked_until:
                slots.append(GridCellDetail(
                    time_slot=slot_time,
                    status="continuation",
                    patient_name=blocked_appt.patient_name if blocked_appt else None,
                    appointment_id=blocked_appt.appointment_id if blocked_appt else None,
                ))
                continue

            if blocked_until and slot_dt >= blocked_until:
                blocked_until = None
                blocked_appt = None

            if not _is_available(t, override, target_date, slot_time):
                slots.append(GridCellDetail(time_slot=slot_time, status="therapist-off"))
                continue

            if not _appointment_fits_in_working_hours(slot_time, t.slot_duration, working_end):
                slots.append(GridCellDetail(time_slot=slot_time, status="therapist-off"))
                continue

            slots.append(GridCellDetail(time_slot=slot_time, status="open"))

        therapist_columns.append(TherapistColumnGrid(
            therapist_id=t.id,
            therapist_name=t.name,
            specialty=t.specialty,
            slots=slots,
        ))

    return SuccessResponse(
        message="Unified calendar grid generated successfully.",
        data=UnifiedCalendarGrid(
            master_time_slots=master_time_slots,
            master_interval_minutes=MASTER_INTERVAL_MINUTES,
            therapist_columns=therapist_columns,
            active_overrides=active_overrides,
        ),
    )



@router.post("", response_model=SuccessResponse[Appointment], status_code=status.HTTP_201_CREATED)
def book_appointment(
    payload: Appointment,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not session.get(Patient, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found.")

    therapist = session.query(Therapist).filter(
        Therapist.id == payload.therapist_id,
        Therapist.is_active == True,
    ).first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found.")

    try:
        target_date = datetime.strptime(payload.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date.")

    _validate_not_past_date(payload.date)

    override = session.exec(
        select(ScheduleOverride)
        .where(ScheduleOverride.therapist_id == payload.therapist_id)
        .where(ScheduleOverride.date == payload.date)
    ).first()

    
    working_start, working_end = _get_working_hours(therapist, override)

    if not _is_available(therapist, override, target_date, payload.time_slot):
        raise HTTPException(
            status_code=400,
            detail="Booking Denied: Therapist is not available at this time.",
        )

    if not _appointment_fits_in_working_hours(payload.time_slot, therapist.slot_duration, working_end):
        start_dt = datetime.strptime(payload.time_slot, "%H:%M")
        appointment_end = start_dt + timedelta(minutes=therapist.slot_duration)
        raise HTTPException(
            status_code=400,
            detail=f"Booking Denied: Appointment would end at {appointment_end.strftime('%H:%M')} but therapist finishes at {working_end.strftime('%H:%M')}. Choose an earlier time slot.",
        )

    slots_to_check = therapist.slot_duration 
    current_slot_dt = datetime.strptime(payload.time_slot, "%H:%M")

    for _ in range(slots_to_check):
        check_time = current_slot_dt.strftime("%H:%M")
        collision = session.exec(
            select(Appointment)
            .where(
                Appointment.therapist_id == payload.therapist_id,
                Appointment.date == payload.date,
                Appointment.time_slot == check_time,
                Appointment.status == "Booked",
            )
        ).first()
        if collision:
            raise HTTPException(
                status_code=400,
                detail=f"Double-Booking Conflict: The time slot {check_time} is already occupied.",
            )
        current_slot_dt += timedelta(minutes=MASTER_INTERVAL_MINUTES)

    session.add(payload)
    session.commit()
    session.refresh(payload)
    return SuccessResponse(message="Appointment booked successfully.", data=payload)


class ReschedulePayload(BaseModel):
    date: str
    time_slot: str


@router.put("/{appointment_id}", response_model=SuccessResponse[Appointment])
def reschedule_appointment(
    appointment_id: int,
    payload: ReschedulePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    appt = session.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    try:
        target_date = datetime.strptime(payload.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date.")

    _validate_not_past_date(payload.date)

    therapist = session.get(Therapist, appt.therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found.")

    override = session.exec(
        select(ScheduleOverride)
        .where(ScheduleOverride.therapist_id == therapist.id)
        .where(ScheduleOverride.date == payload.date)
    ).first()

    working_start, working_end = _get_working_hours(therapist, override)

    if not _is_available(therapist, override, target_date, payload.time_slot):
        raise HTTPException(
            status_code=400,
            detail="Reschedule Denied: Therapist is not available at target time.",
        )

    if not _appointment_fits_in_working_hours(payload.time_slot, therapist.slot_duration, working_end):
        start_dt = datetime.strptime(payload.time_slot, "%H:%M")
        appointment_end = start_dt + timedelta(minutes=therapist.slot_duration)
        raise HTTPException(
            status_code=400,
            detail=f"Reschedule Denied: Appointment would end at {appointment_end.strftime('%H:%M')} but therapist finishes at {working_end.strftime('%H:%M')}. Choose an earlier time slot.",
        )

    slots_to_check = therapist.slot_duration 
    current_slot_dt = datetime.strptime(payload.time_slot, "%H:%M")

    for _ in range(slots_to_check):
        check_time = current_slot_dt.strftime("%H:%M")
        collision = session.exec(
            select(Appointment)
            .where(
                Appointment.therapist_id == appt.therapist_id,
                Appointment.date == payload.date,
                Appointment.time_slot == check_time,
                Appointment.status == "Booked",
                Appointment.id != appointment_id,
            )
        ).first()
        if collision:
            raise HTTPException(
                status_code=400,
                detail=f"Reschedule Denied: The time slot {check_time} is already booked.",
            )
        current_slot_dt += timedelta(minutes=MASTER_INTERVAL_MINUTES)

    appt.date = payload.date
    appt.time_slot = payload.time_slot
    session.add(appt)
    session.commit()
    session.refresh(appt)
    return SuccessResponse(message="Appointment rescheduled successfully.", data=appt)



@router.delete("/{appointment_id}", response_model=SuccessResponse[dict])
def cancel_appointment(
    appointment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    appt = session.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt.status = "Cancelled"
    session.add(appt)
    session.commit()
    return SuccessResponse(
        message="Appointment cancelled successfully.",
        data={"cancelled_id": appointment_id},
    )



@router.delete("/override/{override_id}", response_model=SuccessResponse[dict])
def delete_override(
    override_id: int,
    session: Session = Depends(get_session),
    current_admin: User = Depends(require_admin),
):
    override = session.get(ScheduleOverride, override_id)
    if not override:
        raise HTTPException(status_code=404, detail="Override not found.")

    session.delete(override)
    session.commit()
    return SuccessResponse(
        message="Schedule override removed successfully.",
        data={"deleted_id": override_id},
    )