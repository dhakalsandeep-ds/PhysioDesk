from collections.abc import AsyncGenerator
from sqlmodel import create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config import settings

sync_engine = create_engine(settings.DATABASE_URL, echo=True)

async_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if not "asyncpg" in settings.DATABASE_URL else settings.DATABASE_URL
sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

sync_engine = create_engine(sync_url, echo=True)
async_engine = create_async_engine(async_url, echo=True)

async_session_maker = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


def get_sync_session():
    with Session(sync_engine) as session:
        yield session

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


get_session = get_sync_session
