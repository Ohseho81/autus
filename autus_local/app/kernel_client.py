"""
AUTUS Kernel Client
===================

AUTUS (Port 8000) → Kernel Service (Port 8001) 통신

핵심 규칙:
- AUTUS는 직접 상태 계산하지 않음
- 모션 이벤트만 생성해서 Kernel에 전달
- Kernel 응답만 렌더

Version: 1.0.0
"""

import httpx
from typing import Dict, List, Optional
from dataclasses import dataclass


KERNEL_BASE_URL = "http://localhost:8001"


@dataclass
class KernelResponse:
    """Response from Kernel Service."""
    success: bool
    data: Dict
    error: Optional[str] = None


class KernelClient:
    """
    Synchronous client for Kernel Service.
    """
    
    def __init__(self, base_url: str = KERNEL_BASE_URL):
        self.base_url = base_url
    
    def health(self) -> KernelResponse:
        """Check Kernel health."""
        try:
            with httpx.Client() as client:
                r = client.get(f"{self.base_url}/health")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def step(self, motion_id: str, params: Optional[Dict] = None) -> KernelResponse:
        """
        Execute one step on Kernel.
        
        This is the ONLY way AUTUS should trigger state changes.
        """
        try:
            with httpx.Client() as client:
                r = client.post(
                    f"{self.base_url}/kernel/step",
                    json={"motion_id": motion_id, "params": params or {}}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def get_state(self) -> KernelResponse:
        """Get current Kernel state."""
        try:
            with httpx.Client() as client:
                r = client.get(f"{self.base_url}/kernel/state")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def reset(self) -> KernelResponse:
        """Reset Kernel state."""
        try:
            with httpx.Client() as client:
                r = client.post(f"{self.base_url}/kernel/reset")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def forecast(self, motion_sequence: List[str], steps: int = 5) -> KernelResponse:
        """
        Get forecast without changing state.
        
        [NO RECOMMENDATION PROVIDED]
        """
        try:
            with httpx.Client() as client:
                r = client.post(
                    f"{self.base_url}/kernel/forecast",
                    json={"motion_sequence": motion_sequence, "steps": steps}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def gate_consent(self, motion_id: str, consent: bool = False) -> KernelResponse:
        """
        Level 3 Consent Gate.
        
        consent=False: Show prediction only
        consent=True: Execute with consent
        """
        try:
            with httpx.Client() as client:
                r = client.post(
                    f"{self.base_url}/gate/consent",
                    params={"motion_id": motion_id, "consent": consent}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def validate_llm(self, raw_text: str) -> KernelResponse:
        """
        Validate LLM output through Kernel validator.
        """
        try:
            with httpx.Client() as client:
                r = client.post(
                    f"{self.base_url}/llm/estimate",
                    json={"raw_text": raw_text}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def get_log_entries(self, start: int = 0, limit: int = 100) -> KernelResponse:
        """Get log entries from Kernel chain."""
        try:
            with httpx.Client() as client:
                r = client.get(
                    f"{self.base_url}/log/entries",
                    params={"start": start, "limit": limit}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def verify_log(self) -> KernelResponse:
        """Verify log chain integrity."""
        try:
            with httpx.Client() as client:
                r = client.get(f"{self.base_url}/log/verify")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def replay_sequence(self, motion_sequence: List[str]) -> KernelResponse:
        """Replay a motion sequence."""
        try:
            with httpx.Client() as client:
                r = client.post(
                    f"{self.base_url}/replay/sequence",
                    json={"motion_sequence": motion_sequence}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    def get_registry(self) -> KernelResponse:
        """Get motion registry."""
        try:
            with httpx.Client() as client:
                r = client.get(f"{self.base_url}/registry/motions")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))


class AsyncKernelClient:
    """
    Async client for Kernel Service.
    """
    
    def __init__(self, base_url: str = KERNEL_BASE_URL):
        self.base_url = base_url
    
    async def health(self) -> KernelResponse:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{self.base_url}/health")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    async def step(self, motion_id: str, params: Optional[Dict] = None) -> KernelResponse:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{self.base_url}/kernel/step",
                    json={"motion_id": motion_id, "params": params or {}}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    async def get_state(self) -> KernelResponse:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{self.base_url}/kernel/state")
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    async def forecast(self, motion_sequence: List[str], steps: int = 5) -> KernelResponse:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{self.base_url}/kernel/forecast",
                    json={"motion_sequence": motion_sequence, "steps": steps}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))
    
    async def gate_consent(self, motion_id: str, consent: bool = False) -> KernelResponse:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{self.base_url}/gate/consent",
                    params={"motion_id": motion_id, "consent": consent}
                )
                return KernelResponse(success=True, data=r.json())
        except Exception as e:
            return KernelResponse(success=False, data={}, error=str(e))


# Singleton
_client: Optional[KernelClient] = None

def get_kernel_client() -> KernelClient:
    global _client
    if _client is None:
        _client = KernelClient()
    return _client
