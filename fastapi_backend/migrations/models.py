from sqlmodel import SQLModel 

# import new created models here for migrations to work
from auth.models import User, RefreshTokenBlock
from therapist.models import Therapist, ScheduleOverride
from scheduling.models import Appointment
from patients.models import Patient
from billing.models import Invoice

metadata = SQLModel.metadata
