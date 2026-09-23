from sqlmodel import SQLModel 

# import new created models here for migrations to work
from auth.models import User, RefreshTokenBlock


metadata = SQLModel.metadata
