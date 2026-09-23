import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing_extensions import Literal

class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=20)
    role: Literal["admin", "receptionist"] = "receptionist"

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$"
        if not re.match(pattern, v):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, one number, and one special character."
            )
        return v 
    
    @field_validator("email", mode="before")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator("email", mode="before")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)

