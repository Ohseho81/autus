"""
Zero Meaning 정제 엔진
의미 데이터 완전 제거 → 숫자만 남김
"""

from typing import Dict, Any, List
from datetime import datetime


class ZeroMeaning:
    """
    Zero Meaning 정제기
    
    철학: "모든 개체는 사람, 모든 액션은 돈"
    
    규칙:
    - 허용: ID, 금액, 타임스탬프, 수량
    - 금지: 이름, 이메일, 주소, 설명, 태그, 메모
    """
    
    # 허용 필드 (정규화 매핑)
    ALLOWED_FIELDS = {
        # ID 계열
        'id': 'node_id',
        'customer': 'node_id',
        'customer_id': 'node_id',
        'user_id': 'node_id',
        'vendor_id': 'node_id',
        'account_id': 'node_id',
        
        # 금액 계열
        'amount': 'value',
        'total': 'value',
        'total_price': 'value',
        'totalAmount': 'value',
        'revenue': 'value',
        'price': 'value',
        'balance': 'value',
        'amount_paid': 'value',
        
        # 시간 계열
        'created_at': 'timestamp',
        'updated_at': 'timestamp',
        'occurred_at': 'timestamp',
        'approvedAt': 'timestamp',
    }
    
    # 금지 필드 (의미 데이터)
    FORBIDDEN_FIELDS = [
        # 신원
        'name', 'first_name', 'last_name', 'full_name',
        'email', 'phone', 'address', 'city', 'country', 'zip',
        
        # 설명
        'description', 'note', 'notes', 'memo', 'comment',
        'title', 'subject', 'message', 'body',
        
        # 분류 (의미 부여)
        'type', 'category', 'tag', 'tags', 'label', 'labels',
        'status', 'state', 'stage',
        
        # 조직
        'company', 'organization', 'department', 'team',
        
        # 상품 (의미)
        'product_name', 'item_name', 'sku', 'variant',
        
        # 주소
        'shipping_address', 'billing_address', 'line1', 'line2',
    ]
    
    def cleanse(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        범용 Zero Meaning 정제
        
        Returns:
            node_id, value, timestamp만 포함된 딕셔너리
        """
        result = {
            'node_id': None,
            'value': 0,
            'timestamp': datetime.now().isoformat()
        }
        
        for key, value in data.items():
            lower_key = key.lower()
            
            # 금지 필드 스킵
            if lower_key in self.FORBIDDEN_FIELDS:
                continue
            
            # 허용 필드 매핑
            if lower_key in self.ALLOWED_FIELDS:
                mapped_key = self.ALLOWED_FIELDS[lower_key]
                result[mapped_key] = self._normalize_value(value, mapped_key)
                continue
            
            # 숫자 값만 허용
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                result[key] = value
        
        return result
    
    def cleanse_stripe(self, data: Dict, event_type: str = "") -> Dict:
        """
        Stripe 데이터 정제
        
        특이사항:
        - 금액은 센트 단위 → 원 단위 변환 (÷100)
        - customer 필드가 ID
        """
        # 기본 정제
        cleaned = self.cleanse(data)
        
        # Stripe 특수 처리
        if data.get('customer'):
            cleaned['node_id'] = str(data['customer'])
        elif data.get('id'):
            cleaned['node_id'] = str(data['id'])
        
        # 센트 → 기본 단위 변환
        for amount_field in ['amount', 'amount_paid', 'amount_refunded']:
            if data.get(amount_field):
                cleaned['value'] = data[amount_field] / 100
                break
        
        return cleaned
    
    def cleanse_shopify(self, data: Dict, topic: str = "") -> Dict:
        """
        Shopify 데이터 정제
        
        특이사항:
        - customer.id가 실제 ID
        - total_price는 문자열
        - 게스트 주문 처리
        """
        cleaned = self.cleanse(data)
        
        # 고객 ID 추출
        if data.get('customer') and data['customer'].get('id'):
            cleaned['node_id'] = str(data['customer']['id'])
        elif data.get('id'):
            cleaned['node_id'] = f"shopify_order_{data['id']}"
        
        # 금액 추출
        if data.get('total_price'):
            cleaned['value'] = float(data['total_price'])
        elif data.get('subtotal_price'):
            cleaned['value'] = float(data['subtotal_price'])
        
        return cleaned
    
    def cleanse_toss(self, data: Dict) -> Dict:
        """
        토스페이먼츠 데이터 정제
        
        특이사항:
        - orderId에 고객ID 포함 가능 (prefix_customerId)
        - totalAmount가 금액
        """
        cleaned = self.cleanse(data)
        
        # orderId에서 고객ID 추출
        order_id = data.get('orderId', '')
        if '_' in order_id:
            cleaned['node_id'] = order_id.split('_')[0]
        else:
            cleaned['node_id'] = order_id or f"toss_{data.get('paymentKey', 'unknown')}"
        
        # 금액
        if data.get('totalAmount'):
            cleaned['value'] = float(data['totalAmount'])
        
        return cleaned
    
    def cleanse_quickbooks(self, data: Dict) -> Dict:
        """
        QuickBooks 데이터 정제
        
        특이사항:
        - CustomerRef.value가 ID
        - TotalAmt가 금액
        """
        cleaned = self.cleanse(data)
        
        # 고객 ID
        if data.get('CustomerRef') and data['CustomerRef'].get('value'):
            cleaned['node_id'] = f"qb_{data['CustomerRef']['value']}"
        elif data.get('VendorRef') and data['VendorRef'].get('value'):
            cleaned['node_id'] = f"qb_vendor_{data['VendorRef']['value']}"
        
        # 금액
        if data.get('TotalAmt'):
            cleaned['value'] = float(data['TotalAmt'])
        
        return cleaned
    
    def cleanse_universal(self, data: Dict, source: str = "unknown") -> Dict:
        """
        범용 정제 (소스별 분기)
        """
        if source == 'stripe':
            return self.cleanse_stripe(data)
        elif source == 'shopify':
            return self.cleanse_shopify(data)
        elif source == 'toss':
            return self.cleanse_toss(data)
        elif source == 'quickbooks':
            return self.cleanse_quickbooks(data)
        else:
            return self.cleanse(data)
    
    def _normalize_value(self, value: Any, target_type: str) -> Any:
        """값 정규화"""
        if target_type == 'node_id':
            return str(value) if value else None
        elif target_type == 'value':
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0
        elif target_type == 'timestamp':
            if isinstance(value, datetime):
                return value.isoformat()
            return str(value)
        return value



"""
Zero Meaning 정제 엔진
의미 데이터 완전 제거 → 숫자만 남김
"""

from typing import Dict, Any, List
from datetime import datetime


class ZeroMeaning:
    """
    Zero Meaning 정제기
    
    철학: "모든 개체는 사람, 모든 액션은 돈"
    
    규칙:
    - 허용: ID, 금액, 타임스탬프, 수량
    - 금지: 이름, 이메일, 주소, 설명, 태그, 메모
    """
    
    # 허용 필드 (정규화 매핑)
    ALLOWED_FIELDS = {
        # ID 계열
        'id': 'node_id',
        'customer': 'node_id',
        'customer_id': 'node_id',
        'user_id': 'node_id',
        'vendor_id': 'node_id',
        'account_id': 'node_id',
        
        # 금액 계열
        'amount': 'value',
        'total': 'value',
        'total_price': 'value',
        'totalAmount': 'value',
        'revenue': 'value',
        'price': 'value',
        'balance': 'value',
        'amount_paid': 'value',
        
        # 시간 계열
        'created_at': 'timestamp',
        'updated_at': 'timestamp',
        'occurred_at': 'timestamp',
        'approvedAt': 'timestamp',
    }
    
    # 금지 필드 (의미 데이터)
    FORBIDDEN_FIELDS = [
        # 신원
        'name', 'first_name', 'last_name', 'full_name',
        'email', 'phone', 'address', 'city', 'country', 'zip',
        
        # 설명
        'description', 'note', 'notes', 'memo', 'comment',
        'title', 'subject', 'message', 'body',
        
        # 분류 (의미 부여)
        'type', 'category', 'tag', 'tags', 'label', 'labels',
        'status', 'state', 'stage',
        
        # 조직
        'company', 'organization', 'department', 'team',
        
        # 상품 (의미)
        'product_name', 'item_name', 'sku', 'variant',
        
        # 주소
        'shipping_address', 'billing_address', 'line1', 'line2',
    ]
    
    def cleanse(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        범용 Zero Meaning 정제
        
        Returns:
            node_id, value, timestamp만 포함된 딕셔너리
        """
        result = {
            'node_id': None,
            'value': 0,
            'timestamp': datetime.now().isoformat()
        }
        
        for key, value in data.items():
            lower_key = key.lower()
            
            # 금지 필드 스킵
            if lower_key in self.FORBIDDEN_FIELDS:
                continue
            
            # 허용 필드 매핑
            if lower_key in self.ALLOWED_FIELDS:
                mapped_key = self.ALLOWED_FIELDS[lower_key]
                result[mapped_key] = self._normalize_value(value, mapped_key)
                continue
            
            # 숫자 값만 허용
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                result[key] = value
        
        return result
    
    def cleanse_stripe(self, data: Dict, event_type: str = "") -> Dict:
        """
        Stripe 데이터 정제
        
        특이사항:
        - 금액은 센트 단위 → 원 단위 변환 (÷100)
        - customer 필드가 ID
        """
        # 기본 정제
        cleaned = self.cleanse(data)
        
        # Stripe 특수 처리
        if data.get('customer'):
            cleaned['node_id'] = str(data['customer'])
        elif data.get('id'):
            cleaned['node_id'] = str(data['id'])
        
        # 센트 → 기본 단위 변환
        for amount_field in ['amount', 'amount_paid', 'amount_refunded']:
            if data.get(amount_field):
                cleaned['value'] = data[amount_field] / 100
                break
        
        return cleaned
    
    def cleanse_shopify(self, data: Dict, topic: str = "") -> Dict:
        """
        Shopify 데이터 정제
        
        특이사항:
        - customer.id가 실제 ID
        - total_price는 문자열
        - 게스트 주문 처리
        """
        cleaned = self.cleanse(data)
        
        # 고객 ID 추출
        if data.get('customer') and data['customer'].get('id'):
            cleaned['node_id'] = str(data['customer']['id'])
        elif data.get('id'):
            cleaned['node_id'] = f"shopify_order_{data['id']}"
        
        # 금액 추출
        if data.get('total_price'):
            cleaned['value'] = float(data['total_price'])
        elif data.get('subtotal_price'):
            cleaned['value'] = float(data['subtotal_price'])
        
        return cleaned
    
    def cleanse_toss(self, data: Dict) -> Dict:
        """
        토스페이먼츠 데이터 정제
        
        특이사항:
        - orderId에 고객ID 포함 가능 (prefix_customerId)
        - totalAmount가 금액
        """
        cleaned = self.cleanse(data)
        
        # orderId에서 고객ID 추출
        order_id = data.get('orderId', '')
        if '_' in order_id:
            cleaned['node_id'] = order_id.split('_')[0]
        else:
            cleaned['node_id'] = order_id or f"toss_{data.get('paymentKey', 'unknown')}"
        
        # 금액
        if data.get('totalAmount'):
            cleaned['value'] = float(data['totalAmount'])
        
        return cleaned
    
    def cleanse_quickbooks(self, data: Dict) -> Dict:
        """
        QuickBooks 데이터 정제
        
        특이사항:
        - CustomerRef.value가 ID
        - TotalAmt가 금액
        """
        cleaned = self.cleanse(data)
        
        # 고객 ID
        if data.get('CustomerRef') and data['CustomerRef'].get('value'):
            cleaned['node_id'] = f"qb_{data['CustomerRef']['value']}"
        elif data.get('VendorRef') and data['VendorRef'].get('value'):
            cleaned['node_id'] = f"qb_vendor_{data['VendorRef']['value']}"
        
        # 금액
        if data.get('TotalAmt'):
            cleaned['value'] = float(data['TotalAmt'])
        
        return cleaned
    
    def cleanse_universal(self, data: Dict, source: str = "unknown") -> Dict:
        """
        범용 정제 (소스별 분기)
        """
        if source == 'stripe':
            return self.cleanse_stripe(data)
        elif source == 'shopify':
            return self.cleanse_shopify(data)
        elif source == 'toss':
            return self.cleanse_toss(data)
        elif source == 'quickbooks':
            return self.cleanse_quickbooks(data)
        else:
            return self.cleanse(data)
    
    def _normalize_value(self, value: Any, target_type: str) -> Any:
        """값 정규화"""
        if target_type == 'node_id':
            return str(value) if value else None
        elif target_type == 'value':
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0
        elif target_type == 'timestamp':
            if isinstance(value, datetime):
                return value.isoformat()
            return str(value)
        return value









