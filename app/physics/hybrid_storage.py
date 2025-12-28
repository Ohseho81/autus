"""
AUTUS Local-First Hybrid Storage (Bezos Edition)
=================================================

로컬 우선 하이브리드 아키텍처

기능:
1. Local Persistence - Raw 센서 로그 로컬 저장
2. Central Sync - 익명화된 벡터만 동기화
3. Data Integrity - 해시 체크, AES-256 암호화
4. Auto-Purge - 벡터 추출 후 7일 자동 삭제

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import json
import base64
import os
import secrets


# ================================================================
# ENUMS
# ================================================================

class StorageLocation(str, Enum):
    LOCAL = "LOCAL"
    CENTRAL = "CENTRAL"


class DataCategory(str, Enum):
    RAW_SENSOR = "RAW_SENSOR"
    EXTRACTED_VECTOR = "EXTRACTED_VECTOR"
    CONFIG = "CONFIG"
    HISTORY = "HISTORY"


class EncryptionStatus(str, Enum):
    ENCRYPTED = "ENCRYPTED"
    DECRYPTED = "DECRYPTED"
    PENDING = "PENDING"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class LocalStorageEntry:
    """로컬 저장소 엔트리"""
    id: str
    category: DataCategory
    data: bytes
    hash: str
    created_at: datetime
    expires_at: Optional[datetime]
    encryption_status: EncryptionStatus
    metadata: Dict = field(default_factory=dict)


@dataclass
class SyncVector:
    """동기화용 익명화 벡터"""
    member_id: str
    mass: float
    velocity: Tuple[float, float, float]
    energy_level: float
    timestamp: datetime


@dataclass
class PurgeRecord:
    """삭제 기록"""
    entry_id: str
    category: DataCategory
    purged_at: datetime
    reason: str


@dataclass
class IntegrityCheck:
    """무결성 체크 결과"""
    entry_id: str
    expected_hash: str
    actual_hash: str
    is_valid: bool
    checked_at: datetime


# ================================================================
# ENCRYPTION MODULE
# ================================================================

class EncryptionModule:
    """AES-256 암호화 모듈 (시뮬레이션)"""
    
    def __init__(self, user_key: Optional[str] = None):
        if user_key:
            self.key = self._derive_key(user_key)
        else:
            self.key = self._generate_key()
    
    def _generate_key(self) -> bytes:
        return secrets.token_bytes(32)
    
    def _derive_key(self, user_key: str) -> bytes:
        return hashlib.sha256(user_key.encode()).digest()
    
    def encrypt(self, data: bytes) -> bytes:
        nonce = secrets.token_bytes(12)
        encrypted = bytes(a ^ b for a, b in zip(data, (self.key * (len(data) // 32 + 1))[:len(data)]))
        return base64.b64encode(nonce + encrypted)
    
    def decrypt(self, encrypted_data: bytes) -> bytes:
        decoded = base64.b64decode(encrypted_data)
        nonce = decoded[:12]
        ciphertext = decoded[12:]
        return bytes(a ^ b for a, b in zip(ciphertext, (self.key * (len(ciphertext) // 32 + 1))[:len(ciphertext)]))
    
    def get_key_hash(self) -> str:
        return hashlib.sha256(self.key).hexdigest()[:16]


# ================================================================
# HASH CHECK MODULE
# ================================================================

class HashCheckModule:
    """무결성 해시 모듈"""
    
    @staticmethod
    def compute_hash(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()
    
    @staticmethod
    def verify(data: bytes, expected_hash: str) -> bool:
        actual = hashlib.sha256(data).hexdigest()
        return secrets.compare_digest(actual, expected_hash)
    
    def check_integrity(self, entry: LocalStorageEntry) -> IntegrityCheck:
        actual_hash = self.compute_hash(entry.data)
        is_valid = secrets.compare_digest(actual_hash, entry.hash)
        
        return IntegrityCheck(
            entry_id=entry.id,
            expected_hash=entry.hash,
            actual_hash=actual_hash,
            is_valid=is_valid,
            checked_at=datetime.now()
        )


# ================================================================
# LOCAL STORAGE
# ================================================================

class LocalStorage:
    """로컬 저장소 (IndexedDB/SQLite 시뮬레이션)"""
    
    RAW_DATA_TTL_DAYS = 7
    
    def __init__(self, encryption: EncryptionModule):
        self.encryption = encryption
        self.hash_check = HashCheckModule()
        self.entries: Dict[str, LocalStorageEntry] = {}
        self.purge_log: List[PurgeRecord] = []
    
    def store(
        self, 
        id: str,
        category: DataCategory,
        data: Any,
        ttl_days: Optional[int] = None
    ) -> LocalStorageEntry:
        if isinstance(data, (dict, list)):
            raw_bytes = json.dumps(data, default=str).encode()
        elif isinstance(data, str):
            raw_bytes = data.encode()
        elif isinstance(data, bytes):
            raw_bytes = data
        else:
            raw_bytes = str(data).encode()
        
        encrypted = self.encryption.encrypt(raw_bytes)
        data_hash = HashCheckModule.compute_hash(encrypted)
        
        if ttl_days is None and category == DataCategory.RAW_SENSOR:
            ttl_days = self.RAW_DATA_TTL_DAYS
        
        expires_at = datetime.now() + timedelta(days=ttl_days) if ttl_days else None
        
        entry = LocalStorageEntry(
            id=id,
            category=category,
            data=encrypted,
            hash=data_hash,
            created_at=datetime.now(),
            expires_at=expires_at,
            encryption_status=EncryptionStatus.ENCRYPTED
        )
        
        self.entries[id] = entry
        return entry
    
    def retrieve(self, id: str) -> Optional[Any]:
        entry = self.entries.get(id)
        if not entry:
            return None
        
        if entry.expires_at and datetime.now() > entry.expires_at:
            self._purge_entry(entry, "expired")
            return None
        
        integrity = self.hash_check.check_integrity(entry)
        if not integrity.is_valid:
            raise ValueError(f"Data integrity check failed for {id}")
        
        decrypted = self.encryption.decrypt(entry.data)
        
        try:
            return json.loads(decrypted.decode())
        except:
            return decrypted.decode()
    
    def delete(self, id: str, reason: str = "manual") -> bool:
        entry = self.entries.get(id)
        if entry:
            return self._purge_entry(entry, reason)
        return False
    
    def _purge_entry(self, entry: LocalStorageEntry, reason: str) -> bool:
        self.purge_log.append(PurgeRecord(
            entry_id=entry.id,
            category=entry.category,
            purged_at=datetime.now(),
            reason=reason
        ))
        
        if entry.id in self.entries:
            del self.entries[entry.id]
        
        return True
    
    def auto_purge_expired(self) -> int:
        now = datetime.now()
        expired = [
            e for e in self.entries.values()
            if e.expires_at and e.expires_at < now
        ]
        
        for entry in expired:
            self._purge_entry(entry, "auto_expired")
        
        return len(expired)
    
    def secure_wipe(self, id: str) -> bool:
        entry = self.entries.get(id)
        if not entry:
            return False
        
        entry.data = secrets.token_bytes(len(entry.data))
        return self._purge_entry(entry, "secure_wipe")
    
    def get_storage_stats(self) -> Dict:
        categories = {}
        total_size = 0
        
        for entry in self.entries.values():
            cat = entry.category.value
            if cat not in categories:
                categories[cat] = {"count": 0, "size": 0}
            categories[cat]["count"] += 1
            categories[cat]["size"] += len(entry.data)
            total_size += len(entry.data)
        
        return {
            "total_entries": len(self.entries),
            "total_size_bytes": total_size,
            "categories": categories,
            "purge_log_count": len(self.purge_log),
            "encryption_key_id": self.encryption.get_key_hash(),
        }


# ================================================================
# CENTRAL SYNC MANAGER
# ================================================================

class CentralSyncManager:
    """중앙 동기화 매니저"""
    
    def __init__(self, hub_url: str = "https://autus-hub.example.com"):
        self.hub_url = hub_url
        self.sync_queue: List[SyncVector] = []
        self.sync_history: List[Dict] = []
    
    def prepare_sync_vector(
        self,
        original_member_id: str,
        mass: float,
        velocity: Tuple[float, float, float],
        energy_level: float
    ) -> SyncVector:
        anon_id = hashlib.sha256(original_member_id.encode()).hexdigest()[:16]
        
        return SyncVector(
            member_id=anon_id,
            mass=round(mass, 4),
            velocity=tuple(round(v, 4) for v in velocity),
            energy_level=round(energy_level, 4),
            timestamp=datetime.now()
        )
    
    def queue_sync(self, vector: SyncVector) -> None:
        self.sync_queue.append(vector)
    
    def sync_to_hub(self) -> Dict:
        if not self.sync_queue:
            return {"synced": 0, "status": "empty_queue"}
        
        payload = []
        for vector in self.sync_queue:
            payload.append({
                "member_id": vector.member_id,
                "mass": vector.mass,
                "velocity": list(vector.velocity),
                "energy_level": vector.energy_level,
                "timestamp": vector.timestamp.isoformat(),
            })
        
        result = {
            "synced": len(payload),
            "status": "success",
            "hub_url": self.hub_url,
            "timestamp": datetime.now().isoformat(),
        }
        
        self.sync_history.append({
            **result,
            "vectors": len(payload)
        })
        
        self.sync_queue = []
        
        return result
    
    def get_sync_status(self) -> Dict:
        return {
            "queue_size": len(self.sync_queue),
            "total_synced": sum(h.get("synced", 0) for h in self.sync_history),
            "last_sync": self.sync_history[-1]["timestamp"] if self.sync_history else None,
        }


# ================================================================
# HYBRID STORAGE ORCHESTRATOR
# ================================================================

class HybridStorageOrchestrator:
    """하이브리드 저장소 오케스트레이터"""
    
    def __init__(self, user_key: Optional[str] = None):
        self.encryption = EncryptionModule(user_key)
        self.local = LocalStorage(self.encryption)
        self.sync = CentralSyncManager()
        self.vector_cache: Dict[str, SyncVector] = {}
    
    def store_raw_sensor_data(
        self,
        sensor_id: str,
        data_type: str,
        raw_data: Any
    ) -> str:
        entry_id = f"RAW_{sensor_id}_{datetime.now().timestamp():.0f}"
        
        self.local.store(
            id=entry_id,
            category=DataCategory.RAW_SENSOR,
            data={
                "sensor_id": sensor_id,
                "data_type": data_type,
                "raw_data": raw_data,
                "timestamp": datetime.now().isoformat(),
            },
            ttl_days=7
        )
        
        return entry_id
    
    def extract_and_sync_vector(
        self,
        member_id: str,
        raw_entry_ids: List[str]
    ) -> SyncVector:
        raw_data_list = []
        for entry_id in raw_entry_ids:
            data = self.local.retrieve(entry_id)
            if data:
                raw_data_list.append(data)
        
        mass = sum(d.get("raw_data", {}).get("mass", 0.5) for d in raw_data_list) / len(raw_data_list) if raw_data_list else 0.5
        energy = sum(d.get("raw_data", {}).get("energy", 0.5) for d in raw_data_list) / len(raw_data_list) if raw_data_list else 0.5
        velocity = (0.1, 0.05, 0.0)
        
        vector = self.sync.prepare_sync_vector(
            original_member_id=member_id,
            mass=mass,
            velocity=velocity,
            energy_level=energy
        )
        
        self.sync.queue_sync(vector)
        self.vector_cache[member_id] = vector
        
        return vector
    
    def secure_purge_after_extraction(self, entry_ids: List[str]) -> int:
        purged = 0
        for entry_id in entry_ids:
            if self.local.secure_wipe(entry_id):
                purged += 1
        return purged
    
    def run_maintenance(self) -> Dict:
        expired_count = self.local.auto_purge_expired()
        
        integrity_issues = []
        for entry_id, entry in self.local.entries.items():
            check = self.local.hash_check.check_integrity(entry)
            if not check.is_valid:
                integrity_issues.append(entry_id)
        
        sync_result = self.sync.sync_to_hub()
        
        return {
            "expired_purged": expired_count,
            "integrity_issues": len(integrity_issues),
            "synced_vectors": sync_result.get("synced", 0),
            "storage_stats": self.local.get_storage_stats(),
            "sync_status": self.sync.get_sync_status(),
        }
    
    def get_system_status(self) -> Dict:
        return {
            "local_storage": self.local.get_storage_stats(),
            "sync_status": self.sync.get_sync_status(),
            "encryption_active": True,
            "encryption_key_id": self.encryption.get_key_hash(),
            "vector_cache_size": len(self.vector_cache),
        }


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Local-First Hybrid Storage Test")
    print("=" * 70)
    
    storage = HybridStorageOrchestrator(user_key="user_secret_key_123")
    
    print("\n[1. Raw 센서 데이터 저장]")
    entry_ids = []
    for i in range(5):
        entry_id = storage.store_raw_sensor_data(
            sensor_id=f"SENSOR_{i:03d}",
            data_type="AUDIO_TONE",
            raw_data={
                "mass": 0.4 + i * 0.1,
                "energy": 0.5 + i * 0.05,
            }
        )
        entry_ids.append(entry_id)
        print(f"  • Stored: {entry_id}")
    
    print("\n[2. 저장소 통계]")
    stats = storage.local.get_storage_stats()
    print(f"  Total Entries: {stats['total_entries']}")
    
    print("\n[3. 벡터 추출 및 동기화]")
    vector = storage.extract_and_sync_vector("member_001", entry_ids)
    print(f"  Member ID (Anon): {vector.member_id}")
    print(f"  Mass: {vector.mass}")
    
    print("\n[4. 중앙 허브 동기화]")
    sync_result = storage.sync.sync_to_hub()
    print(f"  Synced: {sync_result['synced']} vectors")
    
    print("\n" + "=" * 70)
    print("✅ Local-First Storage Test Complete")



