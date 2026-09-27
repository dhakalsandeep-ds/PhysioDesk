from collections.abc import AsyncGenerator, Generator
from sqlmodel import create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from config import settings

raw_url = settings.DATABASE_URL

if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)

sync_url = raw_url.replace("postgresql+asyncpg://", "postgresql://")
async_url = raw_url if "+asyncpg" in raw_url else raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

sync_engine = create_engine(sync_url, echo=True)
async_engine = create_async_engine(async_url, echo=True)


AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

def get_sync_session() -> Generator[Session, None, None]:
    with Session(sync_engine) as session:
        yield session

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

get_session = get_sync_session
