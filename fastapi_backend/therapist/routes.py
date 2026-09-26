from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from database import get_session
from auth.dependencies import get_current_user, require_admin
from auth.models import User
from therapist.models import Therapist, ScheduleOverride
from therapist.validations import (
    TherapistCreate,
    TherapistUpdate,
    TherapistRosterDetail,
    ScheduleOverrideCreate,
)
from scheduling.models import Appointment
from unified_response import SuccessResponse

router = APIRouter(prefix="/therapists", tags=["Therapist Management"])


def calculate_hours(start_str: str | None, end_str: str | None) -> float:
    if not start_str or not end_str:
        return 0.0
    start = datetime.strptime(start_str, "%H:%M")
    end = datetime.strptime(end_str, "%H:%M")
    return max(0.0, (end - start).total_seconds() / 3600.0)


@router.get("", response_model=SuccessResponse[list[TherapistRosterDetail]])
def list_roster(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    day_name = today.strftime("%A")

    therapists = session.exec(
        select(Therapist).where(Therapist.is_active == True)
    ).all()

    therapist_ids = [t.id for t in therapists if t.id is not None]

    overrides = session.exec(
        select(ScheduleOverride)
        .where(ScheduleOverride.therapist_id.in_(therapist_ids))
        .where(ScheduleOverride.date == today_str)
    ).all()
    override_map = {o.therapist_id: o for o in overrides}

    appointments = session.exec(
        select(Appointment)
        .where(Appointment.therapist_id.in_(therapist_ids))
        .where(Appointment.date == today_str)
        .where(Appointment.status != "Cancelled")
    ).all()

    appointment_counts = {}
    for app in appointments:
        appointment_counts[app.therapist_id] = appointment_counts.get(app.therapist_id, 0) + 1

    roster = []
    for therapist in therapists:
        working_days = [d.strip() for d in therapist.working_days.split(",") if d.strip()]
        override = override_map.get(therapist.id)

        is_day_off = override.is_day_off if override else (day_name not in working_days)

        if is_day_off:
            capacity = 0.0
        elif override and override.custom_start_time and override.custom_end_time:
            capacity = calculate_hours(override.custom_start_time, override.custom_end_time)
        else:
            capacity = calculate_hours(therapist.start_time, therapist.end_time)

        booked_count = appointment_counts.get(therapist.id, 0)
        booked_hours = booked_count * (therapist.slot_duration / 60.0)
        utilization = round((booked_hours / capacity) * 100, 1) if capacity > 0 else 0.0

        roster.append(
            TherapistRosterDetail(
                id=therapist.id,
                name=therapist.name,
                specialty=therapist.specialty,
                working_days=working_days,
                start_time=therapist.start_time,
                end_time=therapist.end_time,
                slot_duration=therapist.slot_duration,
                daily_capacity_hours=round(capacity, 1),
                booked_hours_today=round(booked_hours, 1),
                utilization_today_percent=utilization,
                patients_seen_today=booked_count,
            )
        )

    return SuccessResponse(message="Therapist roster compiled successfully.", data=roster)


@router.post("", response_model=SuccessResponse[Therapist], status_code=status.HTTP_201_CREATED)
def create_therapist(
    payload: TherapistCreate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(require_admin),
):
    existing = session.exec(
        select(Therapist)
        .where(Therapist.name.ilike(payload.name))
        .where(Therapist.is_active == True)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Therapist '{payload.name}' already exists on active roster.",
        )

    db_therapist = Therapist(**payload.model_dump())
    session.add(db_therapist)
    session.commit()
    session.refresh(db_therapist)

    return SuccessResponse(message="Therapist created.", data=db_therapist)


@router.put("/{therapist_id}", response_model=SuccessResponse[Therapist])
def update_therapist(
    therapist_id: int,
    payload: TherapistUpdate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(require_admin),
):
    therapist = session.exec(
        select(Therapist)
        .where(Therapist.id == therapist_id)
        .where(Therapist.is_active == True)
    ).first()

    if not therapist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapist not found.")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided.")

    if "slot_duration" in update_data:
        new_slot_duration = update_data["slot_duration"]
        current_slot_duration = therapist.slot_duration
        
        if new_slot_duration != current_slot_duration:
            existing_appointments = session.exec(
                select(Appointment)
                .where(Appointment.therapist_id == therapist_id)
                .where(Appointment.status.in_(["Booked", "Completed"]))
            ).first()
            
            if existing_appointments:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot change slot duration from {current_slot_duration} to {new_slot_duration} minutes while appointments exist. Please cancel or reschedule all appointments first.",
                )

    for field, value in update_data.items():
        setattr(therapist, field, value)

    session.add(therapist)
    session.commit()
    session.refresh(therapist)

    return SuccessResponse(message="Therapist updated.", data=therapist)


@router.delete("/{therapist_id}", response_model=SuccessResponse[dict])
def delete_therapist(
    therapist_id: int,
    session: Session = Depends(get_session),
    current_admin: User = Depends(require_admin),
):
    therapist = session.exec(
        select(Therapist)
        .where(Therapist.id == therapist_id)
        .where(Therapist.is_active == True)
    ).first()

    if not therapist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapist not found.")

    therapist.is_active = False
    session.add(therapist)
    session.commit()

    return SuccessResponse(message="Therapist archived.", data={"deleted_id": therapist_id})

from scheduling.models import Appointment

@router.post("/override", response_model=SuccessResponse[ScheduleOverride], status_code=status.HTTP_201_CREATED)
def create_schedule_override(
    payload: ScheduleOverrideCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    therapist = session.get(Therapist, payload.therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found.")

    if payload.is_day_off:
        existing_appointments = session.exec(
            select(Appointment).where(
                Appointment.therapist_id == payload.therapist_id,
                Appointment.date == payload.date,
                Appointment.status == "Booked",
            )
        ).all()

        if existing_appointments:
            count = len(existing_appointments)
            raise HTTPException(
                status_code=400,
                detail=f"Cannot set Day Off: {therapist.name} has {count} appointment{'s' if count > 1 else ''} scheduled on {payload.date}. Please reschedule or cancel them first.",
            )

    existing_override = session.exec(
        select(ScheduleOverride).where(
            ScheduleOverride.therapist_id == payload.therapist_id,
            ScheduleOverride.date == payload.date,
        )
    ).first()

    if existing_override:
        existing_override.is_day_off = payload.is_day_off
        existing_override.custom_start_time = payload.custom_start_time
        existing_override.custom_end_time = payload.custom_end_time
        session.add(existing_override)
        session.commit()
        session.refresh(existing_override)
        return SuccessResponse(
            message="Schedule override updated successfully.",
            data=existing_override,
        )

    override = ScheduleOverride(**payload.model_dump())
    session.add(override)
    session.commit()
    session.refresh(override)
    return SuccessResponse(
        message="Schedule override created successfully.",
        data=override,
    )
