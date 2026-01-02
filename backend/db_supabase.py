#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Supabase Database Configuration                     ║
║                          무료 PostgreSQL 클라우드 DB 연결                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Supabase 설정 가이드:
1. https://supabase.com 에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. .env 파일에 DATABASE_URL 설정

무료 티어 제한:
- 500MB 저장소
- 50,000 rows
- 무제한 API 요청
- 학원 10곳 이상 충분히 커버
"""

import os
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Supabase URL 형식: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("SUPABASE_DB_URL", "sqlite:///./autus_local.db")  # 폴백: 로컬 SQLite
)

# 환경 설정
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQLAlchemy 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 연결 풀 설정
pool_kwargs = {}

if "sqlite" in DATABASE_URL:
    # SQLite: 단일 연결
    pool_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
else:
    # PostgreSQL: 연결 풀 사용
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,           # 기본 연결 수
        "max_overflow": 10,       # 추가 허용 연결 수
        "pool_timeout": 30,       # 연결 대기 타임아웃
        "pool_recycle": 1800,     # 연결 재활용 주기 (30분)
        "pool_pre_ping": True,    # 연결 유효성 사전 체크
    }

# 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,  # SQL 로깅 (개발 환경만)
    **pool_kwargs
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 의존성 주입
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입용 DB 세션 제공자
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    컨텍스트 매니저 방식 DB 세션
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테이블 생성 및 마이그레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    데이터베이스 초기화 (테이블 생성)
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장
    """
    # 모든 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print(f"[DB] Database initialized: {DATABASE_URL[:50]}...")


def check_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    데이터베이스 정보 조회
    """
    info = {
        "url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
        "driver": engine.driver,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
        "connected": check_connection(),
    }
    
    # 테이블 수 조회
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        info["tables"] = len(inspector.get_table_names())
    except:
        info["tables"] = "N/A"
    
    return info


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Supabase 특화 기능
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SupabaseClient:
    """
    Supabase 추가 기능 (RLS, Realtime 등)
    
    Note: 기본 CRUD는 SQLAlchemy로 처리하고,
          Supabase 고유 기능만 이 클래스로 처리
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None
    
    @property
    def client(self):
        """Supabase 클라이언트 (Lazy 로딩)"""
        if self._client is None and self.url and self.key:
            try:
                from supabase import create_client
                self._client = create_client(self.url, self.key)
            except ImportError:
                print("[Supabase] supabase-py not installed. Run: pip install supabase")
        return self._client
    
    def is_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.url and self.key)
    
    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> str:
        """파일 업로드 (Storage)"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        result = self.client.storage.from_(bucket).upload(path, file_data)
        return result.get("path", "")
    
    async def get_public_url(self, bucket: str, path: str) -> str:
        """파일 공개 URL 조회"""
        if not self.client:
            raise RuntimeError("Supabase client not configured")
        
        return self.client.storage.from_(bucket).get_public_url(path)


# 싱글톤 인스턴스
supabase = SupabaseClient()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이벤트 리스너
# ═══════════════════════════════════════════════════════════════════════════════════════════

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite 연결 시 pragma 설정"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI / 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  🗄️ AUTUS-PRIME Database Configuration")
    print("=" * 60)
    
    info = get_db_info()
    
    print(f"\n  URL: {info['url']}")
    print(f"  Driver: {info['driver']}")
    print(f"  Connected: {'✅' if info['connected'] else '❌'}")
    print(f"  Tables: {info['tables']}")
    print(f"  Pool Size: {info['pool_size']}")
    
    if supabase.is_configured():
        print(f"\n  Supabase: ✅ Configured")
    else:
        print(f"\n  Supabase: ⚠️ Not configured (using direct PostgreSQL)")
    
    print("\n" + "=" * 60)


























