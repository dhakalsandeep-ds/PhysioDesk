from pydantic import BaseModel, EmailStr
from typing_extensions import Literal

class TokenDataResponse(BaseModel): 
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class UserDataResponse(BaseModel):
    id: int
    email: EmailStr
    role: str


class UserProfileResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str

