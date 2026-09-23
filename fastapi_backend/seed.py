from sqlmodel import Session, select
from database import sync_engine  
from auth.models import User
from auth.security import hash_password

def seed_users_only():
    with Session(sync_engine) as session:
        existing_admin = session.exec(select(User).where(User.email == "admin@physiodesk.com")).first()
        if not existing_admin:
            admin_user = User(
                email="admin@physiodesk.com",
                hashed_password=hash_password("adminpassword123"), 
                role="admin",
                full_name="Master Admin"
            )
            session.add(admin_user)
        else:
        existing_staff = session.exec(select(User).where(User.email == "staff@physiodesk.com")).first()
        if not existing_staff:
            staff_user = User(
                email="staff@physiodesk.com",
                hashed_password=hash_password("staffpassword123"),
                role="receptionist",
                full_name="Front Desk Receptionist"
            )
            session.add(staff_user)
        else:
        session.commit()

if __name__ == "__main__":
    seed_users_only()

