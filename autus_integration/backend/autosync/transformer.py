# backend/autosync/transformer.py
# Universal Transform - 모든 SaaS → { node_id, value, timestamp }

from typing import Dict, Any, Optional, List
from datetime import datetime
from .systems import SUPPORTED_SYSTEMS, SystemConfig


class UniversalTransformer:
    """
    Universal Transform 엔진
    
    모든 SaaS 데이터를 3가지로 압축:
    1. node_id  → 누구? (사람 ID)
    2. value    → 얼마? (돈 숫자)
    3. timestamp → 언제? (시간)
    
    제거: name, email, description, category, status, tag...
    유지: id, amount, timestamp
    """
    
    def transform(self, data: Dict[str, Any], system_id: str) -> Dict[str, Any]:
        """
        데이터 변환
        
        Args:
            data: 원본 SaaS 데이터
            system_id: 시스템 ID (stripe, toss, hubspot 등)
        
        Returns:
            { node_id, value, timestamp, source }
        """
        config = SUPPORTED_SYSTEMS.get(system_id)
        
        if config:
            return self._transform_with_config(data, config)
        else:
            return self._transform_generic(data)
    
    def _transform_with_config(self, data: Dict, config: SystemConfig) -> Dict:
        """설정 기반 변환"""
        return {
            "node_id": self._extract_id(data, config.id_fields),
            "value": self._extract_amount(data, config.amount_fields),
            "timestamp": self._extract_time(data, config.time_fields),
            "source": config.id
        }
    
    def _transform_generic(self, data: Dict) -> Dict:
        """범용 변환 (설정 없을 때)"""
        # ID 필드 후보
        id_candidates = [
            "id", "customer_id", "user_id", "member_id",
            "customer", "orderId", "order_id", "Id"
        ]
        
        # 금액 필드 후보
        amount_candidates = [
            "amount", "total", "total_price", "totalAmount",
            "price", "value", "TotalAmt", "Amount"
        ]
        
        # 시간 필드 후보
        time_candidates = [
            "created_at", "createdAt", "timestamp", "date",
            "created", "time", "approvedAt", "CreatedDate"
        ]
        
        return {
            "node_id": self._extract_id(data, id_candidates),
            "value": self._extract_amount(data, amount_candidates),
            "timestamp": self._extract_time(data, time_candidates),
            "source": "unknown"
        }
    
    def _extract_id(self, data: Dict, fields: List[str]) -> Optional[str]:
        """ID 추출"""
        for field in fields:
            value = self._get_nested(data, field)
            if value:
                return str(value)
        return None
    
    def _extract_amount(self, data: Dict, fields: List[str]) -> float:
        """금액 추출"""
        for field in fields:
            value = self._get_nested(data, field)
            if value is not None:
                try:
                    # 센트 단위 → 기본 단위 변환 (Stripe)
                    amount = float(value)
                    # Stripe는 센트 단위이므로 100으로 나눔
                    if amount > 10000 and "stripe" in str(fields).lower():
                        amount = amount / 100
                    return amount
                except (TypeError, ValueError):
                    continue
        return 0
    
    def _extract_time(self, data: Dict, fields: List[str]) -> str:
        """시간 추출"""
        for field in fields:
            value = self._get_nested(data, field)
            if value:
                # Unix timestamp
                if isinstance(value, (int, float)) and value > 1000000000:
                    return datetime.fromtimestamp(value).isoformat()
                # 문자열
                return str(value)
        return datetime.now().isoformat()
    
    def _get_nested(self, data: Dict, field: str) -> Any:
        """중첩 필드 접근 (예: customer.id)"""
        keys = field.split(".")
        value = data
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
            
            if value is None:
                return None
        
        return value
    
    def batch_transform(
        self, 
        items: List[Dict], 
        system_id: str
    ) -> List[Dict]:
        """배치 변환"""
        return [self.transform(item, system_id) for item in items]


# 싱글톤
transformer = UniversalTransformer()



# backend/autosync/transformer.py
# Universal Transform - 모든 SaaS → { node_id, value, timestamp }

from typing import Dict, Any, Optional, List
from datetime import datetime
from .systems import SUPPORTED_SYSTEMS, SystemConfig


class UniversalTransformer:
    """
    Universal Transform 엔진
    
    모든 SaaS 데이터를 3가지로 압축:
    1. node_id  → 누구? (사람 ID)
    2. value    → 얼마? (돈 숫자)
    3. timestamp → 언제? (시간)
    
    제거: name, email, description, category, status, tag...
    유지: id, amount, timestamp
    """
    
    def transform(self, data: Dict[str, Any], system_id: str) -> Dict[str, Any]:
        """
        데이터 변환
        
        Args:
            data: 원본 SaaS 데이터
            system_id: 시스템 ID (stripe, toss, hubspot 등)
        
        Returns:
            { node_id, value, timestamp, source }
        """
        config = SUPPORTED_SYSTEMS.get(system_id)
        
        if config:
            return self._transform_with_config(data, config)
        else:
            return self._transform_generic(data)
    
    def _transform_with_config(self, data: Dict, config: SystemConfig) -> Dict:
        """설정 기반 변환"""
        return {
            "node_id": self._extract_id(data, config.id_fields),
            "value": self._extract_amount(data, config.amount_fields),
            "timestamp": self._extract_time(data, config.time_fields),
            "source": config.id
        }
    
    def _transform_generic(self, data: Dict) -> Dict:
        """범용 변환 (설정 없을 때)"""
        # ID 필드 후보
        id_candidates = [
            "id", "customer_id", "user_id", "member_id",
            "customer", "orderId", "order_id", "Id"
        ]
        
        # 금액 필드 후보
        amount_candidates = [
            "amount", "total", "total_price", "totalAmount",
            "price", "value", "TotalAmt", "Amount"
        ]
        
        # 시간 필드 후보
        time_candidates = [
            "created_at", "createdAt", "timestamp", "date",
            "created", "time", "approvedAt", "CreatedDate"
        ]
        
        return {
            "node_id": self._extract_id(data, id_candidates),
            "value": self._extract_amount(data, amount_candidates),
            "timestamp": self._extract_time(data, time_candidates),
            "source": "unknown"
        }
    
    def _extract_id(self, data: Dict, fields: List[str]) -> Optional[str]:
        """ID 추출"""
        for field in fields:
            value = self._get_nested(data, field)
            if value:
                return str(value)
        return None
    
    def _extract_amount(self, data: Dict, fields: List[str]) -> float:
        """금액 추출"""
        for field in fields:
            value = self._get_nested(data, field)
            if value is not None:
                try:
                    # 센트 단위 → 기본 단위 변환 (Stripe)
                    amount = float(value)
                    # Stripe는 센트 단위이므로 100으로 나눔
                    if amount > 10000 and "stripe" in str(fields).lower():
                        amount = amount / 100
                    return amount
                except (TypeError, ValueError):
                    continue
        return 0
    
    def _extract_time(self, data: Dict, fields: List[str]) -> str:
        """시간 추출"""
        for field in fields:
            value = self._get_nested(data, field)
            if value:
                # Unix timestamp
                if isinstance(value, (int, float)) and value > 1000000000:
                    return datetime.fromtimestamp(value).isoformat()
                # 문자열
                return str(value)
        return datetime.now().isoformat()
    
    def _get_nested(self, data: Dict, field: str) -> Any:
        """중첩 필드 접근 (예: customer.id)"""
        keys = field.split(".")
        value = data
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
            
            if value is None:
                return None
        
        return value
    
    def batch_transform(
        self, 
        items: List[Dict], 
        system_id: str
    ) -> List[Dict]:
        """배치 변환"""
        return [self.transform(item, system_id) for item in items]


# 싱글톤
transformer = UniversalTransformer()









