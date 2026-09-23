from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import func

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    
    role: str = Field(
        default="receptionist",
        sa_column_kwargs={"server_default": "receptionist"},
        nullable=False
    )
    token_version: int = Field(
        default=1,
        sa_column_kwargs={"server_default": "1"},
        nullable=False
    )
    full_name: Optional[str] = Field(default=None, nullable=True)
    
    created_at: datetime = Field(
        sa_column_kwargs={"server_default": func.now()},
        nullable=False
    )
    updated_at: datetime = Field(
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now()
        },
        nullable=False
    )


class RefreshTokenBlock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token_jti: str = Field(unique=True, index=True, nullable=False)
    expires_at: int = Field(nullable=False)
    
    created_at: datetime = Field(
        sa_column_kwargs={"server_default": func.now()},
        nullable=False
    )

