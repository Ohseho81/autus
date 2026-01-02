"""
Zero Meaning Validator
의미 있는 데이터 자동 제거/차단
"""
from typing import Dict, Any, Set


class ZeroMeaningValidator:
    """
    Zero Meaning Lock 검증기
    
    허용: 위치(lat, lon), 금액(value, amount), ID
    금지: 이름, 역할, 국가, 분류, 설명 등 모든 의미
    """
    
    # 금지 키워드
    FORBIDDEN_KEYS: Set[str] = {
        # 신원
        'name', 'person_name', 'user_name', 'username', 'full_name',
        'first_name', 'last_name', 'nickname',
        
        # 역할
        'role', 'job', 'title', 'position', 'occupation', 'profession',
        'department', 'team', 'company', 'organization',
        
        # 지역 (좌표 제외)
        'country', 'nationality', 'nation', 'city', 'region', 'state',
        'address', 'location_name', 'place',
        
        # 분류
        'category', 'type', 'kind', 'class', 'group', 'tag', 'label',
        
        # 설명
        'description', 'desc', 'note', 'notes', 'comment', 'comments',
        'memo', 'remark', 'remarks',
        
        # 판단
        'rating', 'score', 'grade', 'rank', 'priority', 'importance',
        'good', 'bad', 'status_text', 'evaluation',
        
        # 이유/목적
        'reason', 'purpose', 'goal', 'objective', 'why', 'cause',
    }
    
    # 허용 키
    ALLOWED_KEYS: Set[str] = {
        'id', 'lat', 'lon', 'latitude', 'longitude',
        'value', 'amount', 'money', 'cost', 'price',
        'source_id', 'target_id', 'node_id',
        'time_cost', 'time', 'duration',
        'synergy', 'direct_money', 'synergy_money'
    }
    
    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        데이터 검증 및 정제
        금지 키 제거, 허용 키만 통과
        """
        cleaned = {}
        violations = []
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # 금지 키 검사
            if self._is_forbidden(key_lower):
                violations.append({
                    'key': key,
                    'action': 'REMOVED',
                    'reason': 'FORBIDDEN_KEY'
                })
                continue
            
            # 허용 키 검사
            if key_lower in self.ALLOWED_KEYS:
                cleaned[key] = value
            elif isinstance(value, (int, float)):
                # 숫자면 허용
                cleaned[key] = value
            else:
                violations.append({
                    'key': key,
                    'action': 'REMOVED',
                    'reason': 'NON_NUMERIC_VALUE'
                })
        
        return cleaned
    
    def _is_forbidden(self, key: str) -> bool:
        """금지 키 체크"""
        if key in self.FORBIDDEN_KEYS:
            return True
        
        # 부분 일치
        for forbidden in self.FORBIDDEN_KEYS:
            if forbidden in key:
                return True
        
        return False
    
    def is_valid_node_data(self, data: Dict[str, Any]) -> bool:
        """노드 데이터 유효성 검사"""
        required = {'lat', 'lon'}
        return required.issubset(set(data.keys()))
    
    def is_valid_motion_data(self, data: Dict[str, Any]) -> bool:
        """모션 데이터 유효성 검사"""
        required = {'source_id', 'target_id', 'amount'}
        return required.issubset(set(data.keys()))





"""
Zero Meaning Validator
의미 있는 데이터 자동 제거/차단
"""
from typing import Dict, Any, Set


class ZeroMeaningValidator:
    """
    Zero Meaning Lock 검증기
    
    허용: 위치(lat, lon), 금액(value, amount), ID
    금지: 이름, 역할, 국가, 분류, 설명 등 모든 의미
    """
    
    # 금지 키워드
    FORBIDDEN_KEYS: Set[str] = {
        # 신원
        'name', 'person_name', 'user_name', 'username', 'full_name',
        'first_name', 'last_name', 'nickname',
        
        # 역할
        'role', 'job', 'title', 'position', 'occupation', 'profession',
        'department', 'team', 'company', 'organization',
        
        # 지역 (좌표 제외)
        'country', 'nationality', 'nation', 'city', 'region', 'state',
        'address', 'location_name', 'place',
        
        # 분류
        'category', 'type', 'kind', 'class', 'group', 'tag', 'label',
        
        # 설명
        'description', 'desc', 'note', 'notes', 'comment', 'comments',
        'memo', 'remark', 'remarks',
        
        # 판단
        'rating', 'score', 'grade', 'rank', 'priority', 'importance',
        'good', 'bad', 'status_text', 'evaluation',
        
        # 이유/목적
        'reason', 'purpose', 'goal', 'objective', 'why', 'cause',
    }
    
    # 허용 키
    ALLOWED_KEYS: Set[str] = {
        'id', 'lat', 'lon', 'latitude', 'longitude',
        'value', 'amount', 'money', 'cost', 'price',
        'source_id', 'target_id', 'node_id',
        'time_cost', 'time', 'duration',
        'synergy', 'direct_money', 'synergy_money'
    }
    
    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        데이터 검증 및 정제
        금지 키 제거, 허용 키만 통과
        """
        cleaned = {}
        violations = []
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # 금지 키 검사
            if self._is_forbidden(key_lower):
                violations.append({
                    'key': key,
                    'action': 'REMOVED',
                    'reason': 'FORBIDDEN_KEY'
                })
                continue
            
            # 허용 키 검사
            if key_lower in self.ALLOWED_KEYS:
                cleaned[key] = value
            elif isinstance(value, (int, float)):
                # 숫자면 허용
                cleaned[key] = value
            else:
                violations.append({
                    'key': key,
                    'action': 'REMOVED',
                    'reason': 'NON_NUMERIC_VALUE'
                })
        
        return cleaned
    
    def _is_forbidden(self, key: str) -> bool:
        """금지 키 체크"""
        if key in self.FORBIDDEN_KEYS:
            return True
        
        # 부분 일치
        for forbidden in self.FORBIDDEN_KEYS:
            if forbidden in key:
                return True
        
        return False
    
    def is_valid_node_data(self, data: Dict[str, Any]) -> bool:
        """노드 데이터 유효성 검사"""
        required = {'lat', 'lon'}
        return required.issubset(set(data.keys()))
    
    def is_valid_motion_data(self, data: Dict[str, Any]) -> bool:
        """모션 데이터 유효성 검사"""
        required = {'source_id', 'target_id', 'amount'}
        return required.issubset(set(data.keys()))










