"""
AUTUS Database Connection
PostgreSQL + Neo4j + Redis 연결
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
from config import settings
from loguru import logger


# ═══════════════════════════════════════════════════════════
# SQLAlchemy Base
# ═══════════════════════════════════════════════════════════

class Base(DeclarativeBase):
    """SQLAlchemy Base 클래스"""
    pass


# ═══════════════════════════════════════════════════════════
# PostgreSQL Engine
# ═══════════════════════════════════════════════════════════

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=5,
    max_overflow=10
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """DB 세션 의존성"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """DB 테이블 생성"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables created")


# ═══════════════════════════════════════════════════════════
# Neo4j Connection (Optional)
# ═══════════════════════════════════════════════════════════

_neo4j_driver = None

def get_neo4j_driver():
    """Neo4j 드라이버 (lazy initialization)"""
    global _neo4j_driver
    if _neo4j_driver is None:
        try:
            from neo4j import GraphDatabase
            _neo4j_driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            logger.info("✅ Neo4j connected")
        except Exception as e:
            logger.warning(f"⚠️ Neo4j not available: {e}")
    return _neo4j_driver


# ═══════════════════════════════════════════════════════════
# Redis Connection (Optional)
# ═══════════════════════════════════════════════════════════

_redis_client = None

def get_redis():
    """Redis 클라이언트 (lazy initialization)"""
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
            logger.info("✅ Redis connected")
        except Exception as e:
            logger.warning(f"⚠️ Redis not available: {e}")
    return _redis_client
