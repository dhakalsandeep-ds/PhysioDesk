from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, desc
from database import get_session
from auth.dependencies import get_current_user
from auth.models import User

from unified_response import SuccessResponse

from therapist.models import Therapist, ScheduleOverride
from patients.models import Patient
from scheduling.models import Appointment
from billing.models import Invoice
from dashboard.schemas import DashboardStatsPayload, TherapistCapacitySummary, PatientRecentSummary

router = APIRouter(prefix="/dashboard", tags=["Clinic Dashboard Intelligence"])

@router.get("/stats", response_model=SuccessResponse[DashboardStatsPayload])
def get_live_dashboard_metrics(
    limit: int = 5, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    day_name = datetime.now().strftime("%A")

    therapists = session.exec(select(Therapist).where(Therapist.is_active == True)).all()
    appointments = session.exec(select(Appointment).where(Appointment.date == today_str)).all()
    invoices = session.exec(select(Invoice).where(Invoice.created_at == today_str)).all()

    active_appointments = [a for a in appointments if a.status != "Cancelled"]
    bookings_map = {(a.therapist_id, a.time_slot): a.patient_id for a in active_appointments}

    patients_seen_today = len([a for a in active_appointments if a.status in ("Completed", "Booked")])
    revenue_collected_today = sum(inv.total_amount for inv in invoices if inv.status.lower() == "paid")
    
    therapists_on_duty_count = 0
    open_slots_remaining_today = 0
    capacity_grid = []

    for t in therapists:
        override = session.exec(
            select(ScheduleOverride)
            .where(ScheduleOverride.therapist_id == t.id)
            .where(ScheduleOverride.date == today_str)
        ).first()

        is_working_day = day_name in [d.strip() for d in t.working_days.split(",")]
        is_day_off = override.is_day_off if override else not is_working_day

        if is_day_off:
            continue

        therapists_on_duty_count += 1

        start_str = override.custom_start_time if (override and override.custom_start_time) else t.start_time
        end_str = override.custom_end_time if (override and override.custom_end_time) else t.end_time

        try:
            curr = datetime.strptime(start_str, "%H:%M")
            end = datetime.strptime(end_str, "%H:%M")
            delta = timedelta(minutes=t.slot_duration)
        except ValueError:
            continue

        booked_slots = 0
        free_slots = 0
        timeline = []

        while curr < end:
            slot_str = curr.strftime("%H:%M")
            
            if (t.id, slot_str) in bookings_map:
                booked_slots += 1
                timeline.append({"time": slot_str, "status": "booked"})
            else:
                free_slots += 1
                open_slots_remaining_today += 1
                timeline.append({"time": slot_str, "status": "free"})
                
            curr += delta

        capacity_grid.append(
            TherapistCapacitySummary(
                therapist_id=t.id,
                therapist_name=t.name,
                booked_slots_count=booked_slots,
                free_slots_count=free_slots,
                total_slots_capacity=booked_slots + free_slots,
                visual_slots_timeline=timeline
            )
        )

    recent_records = session.exec(
        select(Patient).order_by(desc(Patient.id)).limit(limit)
    ).all()

    recent_summary = []
    for p in recent_records:
        therapist_name = "Unassigned"
        if p.assigned_therapist_id:
            th = session.get(Therapist, p.assigned_therapist_id)
            if th:
                therapist_name = th.name

        recent_summary.append(
            PatientRecentSummary(
                id=p.id,
                name=p.name,
                condition=p.condition,
                assigned_therapist_name=therapist_name,
                package=p.package,
                status=p.status
            )
        )

    payload = DashboardStatsPayload(
        patients_seen_today=patients_seen_today,
        therapists_on_duty_today=therapists_on_duty_count,
        revenue_collected_today=revenue_collected_today,
        open_slots_remaining_today=open_slots_remaining_today,
        therapist_capacity_grid=capacity_grid,
        recent_patients=recent_summary
    )

    return SuccessResponse(
        message="Live clinic dashboard summary metrics compiled successfully.",
        data=payload
    )
