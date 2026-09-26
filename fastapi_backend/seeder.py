from datetime import date, datetime, time, timedelta
from sqlmodel import Session, select, delete, text
from database import sync_engine

from auth.models import User, RefreshTokenBlock
from auth.security import hash_password
from therapist.models import Therapist, ScheduleOverride
from patients.models import Patient
from scheduling.models import Appointment
from billing.models import Invoice


def make_password(email: str) -> str:
    prefix = email.split("@")[0]
    raw_password = f"{prefix}password123"
    return hash_password(raw_password)


def get_next_working_day(working_days_str: str, start_date: date) -> date:
    allowed_days = [d.strip().capitalize() for d in working_days_str.split(",")]
    current = start_date
    for _ in range(14):
        if current.strftime("%A") in allowed_days:
            return current
        current += timedelta(days=1)
    return start_date


def generate_time_slots(start_time_str: str, end_time_str: str, duration_minutes: int) -> list[str]:
    start_dt = datetime.strptime(start_time_str, "%H:%M")
    end_dt = datetime.strptime(end_time_str, "%H:%M")
    
    slots = []
    current_dt = start_dt
    step = timedelta(minutes=duration_minutes)
    
    while current_dt + step <= end_dt:
        slots.append(current_dt.strftime("%H:%M"))
        current_dt += step
        
    return slots


def wipe_tables_safely(session: Session):
    dialect = session.bind.dialect.name

    if dialect == "sqlite":
        session.exec(text("PRAGMA foreign_keys = OFF;"))
    elif dialect in ("postgresql", "postgres"):
        session.exec(text("SET CONSTRAINTS ALL DEFERRED;"))
    elif dialect in ("mysql", "mariadb"):
        session.exec(text("SET FOREIGN_KEY_CHECKS = 0;"))

    session.exec(delete(Invoice))
    session.exec(delete(Appointment))
    session.exec(delete(Patient))
    session.exec(delete(ScheduleOverride))
    session.exec(delete(Therapist))
    session.exec(delete(RefreshTokenBlock))
    session.exec(delete(User))
    session.commit()

    if dialect == "sqlite":
        session.exec(text("PRAGMA foreign_keys = ON;"))
    elif dialect in ("mysql", "mariadb"):
        session.exec(text("SET FOREIGN_KEY_CHECKS = 1;"))


def seed_database():
    with Session(sync_engine) as session:
        print("Starting PhysioDesk clean dataset generation...")

        wipe_tables_safely(session)
        print("All existing tables wiped clean.")

        therapist_names = [
            "Dr. Rajesh Bhattarai", "Dr. Sunita Karki", "Dr. Manish Shrestha",
            "Dr. Pooja Joshi", "Dr. Bibek Thapa", "Dr. Prashant Gurung",
            "Dr. Nisha Adhikari", "Dr. Rohan Maharjan", "Dr. Archana Sharma",
            "Dr. Suman KC", "Dr. Kriti Tuladhar", "Dr. Dipendra Rai",
            "Dr. Sarita Tamang", "Dr. Anil Giri", "Dr. Sneha Dahal",
            "Dr. Ramesh Bogati", "Dr. Kabita Pokharel", "Dr. Prabhat Subedi",
            "Dr. Menuka Khadka", "Dr. Ashok Chaudhary", "Dr. Reema Regmi",
            "Dr. Suraj Pandit", "Dr. Kamala Basnet", "Dr. Bikash Bista",
            "Dr. Jamuna Gautam", "Dr. Roshan Poudel", "Dr. Shristi Lamichhane",
            "Dr. Nabin Ghimire", "Dr. Smriti Ale", "Dr. Dinesh Bhandari"
        ]

        patient_names = [
            "Sandeep Sharma", "Anjali Thapa", "Bikram Maharjan", "Riya Tuladhar",
            "Kiran Pokharel", "Maya Tamang", "Deepak Rai", "Nirupama Basnet",
            "Prakash Karki", "Sujata Shrestha", "Aayush Bhattarai", "Bina Gurung",
            "Subash Adhikari", "Pooja Dahal", "Ramesh Kumar KC", "Gita Joshi",
            "Sanjay Gautam", "Saraswati Khadka", "Hari Bahadur Thapa", "Kabita Ghimire",
            "Niraj Chhetri", "Sunita Bhandari", "Rajendra Poudel", "Manju Giri",
            "Dhiraj Chaudhary", "Sushma Regmi", "Amrit Bista", "Laxmi Subedi",
            "Roshan Ale", "Anita Bogati"
        ]

        kathmandu_addresses = [
            "Manamaiju, Kathmandu", "Jhamsikhel, Lalitpur", "Baneshwor, Kathmandu",
            "Patan, Lalitpur", "Lazimpat, Kathmandu", "Thamel, Kathmandu",
            "Chabahil, Kathmandu", "Kirtipur, Kathmandu", "Balaju, Kathmandu",
            "Maharajgunj, Kathmandu", "Gongabu, Kathmandu", "Kalanki, Kathmandu"
        ]

        users = [
            User(email="admin@physiodesk.com", hashed_password=make_password("admin@physiodesk.com"), role="admin", full_name="Admin User"),
            User(email="staff@physiodesk.com", hashed_password=make_password("staff@physiodesk.com"), role="receptionist", full_name="Staff User")
        ]

        session.add_all(users)
        session.commit()
        print(f"{len(users)} Users seeded")

        specialties = [
            "Orthopedic & Sports Rehab", "Neurological Rehabilitation",
            "Pediatric & Geriatric Care", "Post-Surgical Recovery",
            "Cardiopulmonary Physio", "Spine & Pain Management"
        ]
        schedules = [
            "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday",
            "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday"
        ]

        for i in range(30):
            slot_duration = 30 if i % 2 == 0 else 60
            session.add(Therapist(
                name=therapist_names[i],
                specialty=specialties[i % len(specialties)],
                working_days=schedules[i % len(schedules)],
                start_time="08:00" if i % 2 == 0 else "09:00",
                end_time="16:00" if i % 2 == 0 else "17:00",
                slot_duration=slot_duration,
                is_active=True
            ))
        
        session.commit()
        therapists = session.exec(select(Therapist)).all()
        print(f"{len(therapists)} Therapists seeded")

        today = date.today()
        overrides = []
        for i in range(30):
            t_id = therapists[i % len(therapists)].id
            override_date = today + timedelta(days=(i * 2) - 15)
            overrides.append(ScheduleOverride(
                therapist_id=t_id,
                date=override_date.strftime("%Y-%m-%d"),
                is_off=True if i % 2 == 0 else False,
                reason="Medical Conference" if i % 2 == 0 else "Extended Hours Shift"
            ))

        session.add_all(overrides)
        session.commit()
        print(f"{len(overrides)} Schedule Overrides seeded")

        conditions = [
            "Lumbar Disc Herniation", "ACL Tear Post-Op", "Cervical Spondylosis",
            "Stroke Hemiparesis Rehab", "Rotator Cuff Tendinitis", "Frozen Shoulder",
            "Scoliosis Postural Correction", "Total Knee Replacement Rehab", "Plantar Fasciitis"
        ]
        packages = ["Premium Package", "Basic Plan", "None"]

        for i in range(30):
            assigned_t = therapists[i % len(therapists)]
            session.add(Patient(
                name=patient_names[i],
                phone=f"9801{i+10:06d}",
                age=18 + ((i * 3) % 52),
                gender="Male" if i % 2 == 0 else "Female",
                address=kathmandu_addresses[i % len(kathmandu_addresses)],
                condition=conditions[i % len(conditions)],
                assigned_therapist_id=assigned_t.id,
                package=packages[i % len(packages)],
                status="Active" if i <= 24 else "Completed"
            ))

        session.commit()
        patients = session.exec(select(Patient)).all()
        print(f"{len(patients)} Patients seeded")

        payment_methods = ["eSewa", "Khalti", "Fonepay", "Cash"]

        for i in range(30):
            patient = patients[i]
            therapist = next((t for t in therapists if t.id == patient.assigned_therapist_id), therapists[i % len(therapists)])
            
            valid_slots = generate_time_slots(therapist.start_time, therapist.end_time, therapist.slot_duration)
            time_slot = valid_slots[i % len(valid_slots)]

            if i < 10:
                appt_date = today
            else:
                base_date = today + timedelta(days=(i - 15))
                appt_date = get_next_working_day(therapist.working_days, base_date)

            session.add(Appointment(
                patient_id=patient.id,
                therapist_id=therapist.id,
                date=appt_date.strftime("%Y-%m-%d"),
                time_slot=time_slot,
                payment_method=payment_methods[i % len(payment_methods)],
                notes=f"Physical therapy progress note for {patient.name} - session {i+1}."
            ))

        session.commit()
        appointments = session.exec(select(Appointment)).all()
        print(f"{len(appointments)} Appointments committed to DB with dynamic slot intervals")

        inv_statuses = ["Paid", "Due"]

        for i in range(30):
            patient = patients[i]
            subtotal = 2000.0 * (1 + (i % 5))
            discount = 500.0 if i % 3 == 0 else 0.0
            created_d = today - timedelta(days=30 - i)
            status = inv_statuses[i % 2]

            session.add(Invoice(
                patient_id=patient.id,
                invoice_number=f"INV-2026-{(i+1):03d}",
                service_or_package=f"Treatment Session - {patient.condition}",
                subtotal=subtotal,
                discount=discount,
                total_amount=subtotal - discount,
                payment_method=payment_methods[i % len(payment_methods)],
                status=status,
                created_at=created_d.strftime("%Y-%m-%d")
            ))

        session.commit()
        invoices = session.exec(select(Invoice)).all()
        print(f"{len(invoices)} Invoices committed to DB (Statuses: 'Paid' and 'Due' only)")

        print("\nDatabase seeding completed successfully! All entities, appointments, and invoices are active and synchronized.")


if __name__ == "__main__":
    seed_database()
