"""
AUTUS 소상공인 Ontology 엔진 v1.0
==================================

Palantir Foundry 스타일 객체 모델링
- 업종별 객체 타입 (교육/음식점/사우나)
- Physics 매핑
- 관계 정의
- KPI 계산
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from datetime import datetime
from collections import defaultdict
import json
import uuid
import statistics


# ============================================================
# 1. 열거형 정의
# ============================================================

class Industry(Enum):
    """업종"""
    EDUCATION = "education"
    RESTAURANT = "restaurant"
    SAUNA = "sauna"


class ObjectType(Enum):
    """객체 타입"""
    # 교육
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    COURSE = "course"
    ENROLLMENT = "enrollment"
    
    # 음식점
    MENU = "menu"
    ORDER = "order"
    TABLE = "table"
    INVENTORY = "inventory"
    
    # 사우나
    FACILITY = "facility"
    BOOKING = "booking"
    UTILITY = "utility"
    MEMBERSHIP = "membership"
    
    # 공통
    PAYMENT = "payment"
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    ALERT = "alert"


class PhysicsMapping(Enum):
    """Physics 매핑"""
    FINANCIAL_HEALTH = "financial_health"
    CAPITAL_RISK = "capital_risk"
    COMPLIANCE_IQ = "compliance_iq"
    CONTROL_ENV = "control_env"
    REPUTATION = "reputation"
    STAKEHOLDER = "stakeholder"


class RelationType(Enum):
    """관계 타입"""
    HAS = "has"
    BELONGS_TO = "belongs_to"
    ORDERED = "ordered"
    TEACHES = "teaches"
    ENROLLED_IN = "enrolled_in"
    USES = "uses"
    PRODUCES = "produces"


# ============================================================
# 2. 스키마 정의
# ============================================================

OBJECT_SCHEMAS = {
    # 교육
    ObjectType.STUDENT: {
        "industry": Industry.EDUCATION,
        "physics": PhysicsMapping.STAKEHOLDER,
        "required": ["enrollment_date", "status"],
        "optional": ["attendance_rate", "performance_score", "monthly_fee", "payment_status"],
        "description": "학생 객체"
    },
    ObjectType.INSTRUCTOR: {
        "industry": Industry.EDUCATION,
        "physics": PhysicsMapping.CONTROL_ENV,
        "required": ["subject", "employment_type"],
        "optional": ["monthly_salary", "rating", "student_count"],
        "description": "강사 객체"
    },
    ObjectType.COURSE: {
        "industry": Industry.EDUCATION,
        "physics": PhysicsMapping.FINANCIAL_HEALTH,
        "required": ["name", "subject", "fee"],
        "optional": ["capacity", "enrolled", "completion_rate", "duration_weeks"],
        "description": "과정 객체"
    },
    
    # 음식점
    ObjectType.MENU: {
        "industry": Industry.RESTAURANT,
        "physics": PhysicsMapping.FINANCIAL_HEALTH,
        "required": ["name", "price"],
        "optional": ["cost", "category", "margin_rate", "prep_time_min", "is_available", "daily_sales"],
        "description": "메뉴 객체"
    },
    ObjectType.ORDER: {
        "industry": Industry.RESTAURANT,
        "physics": PhysicsMapping.FINANCIAL_HEALTH,
        "required": ["order_time", "total"],
        "optional": ["table_id", "item_count", "items", "discount", "payment_method", "status"],
        "description": "주문 객체"
    },
    ObjectType.TABLE: {
        "industry": Industry.RESTAURANT,
        "physics": PhysicsMapping.CONTROL_ENV,
        "required": ["number", "capacity"],
        "optional": ["status", "daily_turnover", "avg_spend"],
        "description": "테이블 객체"
    },
    ObjectType.INVENTORY: {
        "industry": Industry.RESTAURANT,
        "physics": PhysicsMapping.CAPITAL_RISK,
        "required": ["name", "quantity"],
        "optional": ["unit", "unit_cost", "reorder_point", "daily_usage", "expiry_date"],
        "description": "재고 객체"
    },
    
    # 사우나
    ObjectType.FACILITY: {
        "industry": Industry.SAUNA,
        "physics": PhysicsMapping.CONTROL_ENV,
        "required": ["name", "type"],
        "optional": ["capacity", "utilization_rate", "status", "maintenance_date"],
        "description": "시설 객체"
    },
    ObjectType.BOOKING: {
        "industry": Industry.SAUNA,
        "physics": PhysicsMapping.FINANCIAL_HEALTH,
        "required": ["booking_time", "guest_count"],
        "optional": ["package", "total", "status", "duration_hours"],
        "description": "예약 객체"
    },
    ObjectType.UTILITY: {
        "industry": Industry.SAUNA,
        "physics": PhysicsMapping.CAPITAL_RISK,
        "required": ["type", "amount"],
        "optional": ["period_start", "period_end", "unit_price"],
        "description": "유틸리티 비용 객체"
    },
    
    # 공통
    ObjectType.PAYMENT: {
        "industry": None,
        "physics": PhysicsMapping.FINANCIAL_HEALTH,
        "required": ["amount", "payment_date"],
        "optional": ["method", "status", "reference_id"],
        "description": "결제 객체"
    },
    ObjectType.CUSTOMER: {
        "industry": None,
        "physics": PhysicsMapping.STAKEHOLDER,
        "required": ["created_date"],
        "optional": ["visit_count", "total_spend", "last_visit", "tier"],
        "description": "고객 객체"
    },
}


# ============================================================
# 3. 코어 객체
# ============================================================

@dataclass
class CoreObject:
    """코어 객체"""
    id: str
    object_type: ObjectType
    properties: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Physics 연결
    physics_values: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.object_type.value,
            "properties": self.properties,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "physics": self.physics_values
        }
    
    def update(self, properties: Dict[str, Any]):
        self.properties.update(properties)
        self.updated_at = datetime.now()


@dataclass
class Relationship:
    """관계"""
    id: str
    source_id: str
    target_id: str
    relation_type: RelationType
    properties: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "source": self.source_id,
            "target": self.target_id,
            "type": self.relation_type.value,
            "properties": self.properties
        }


# ============================================================
# 4. Ontology 엔진
# ============================================================

class OntologyEngine:
    """
    Palantir 스타일 Ontology 엔진
    
    - 객체 CRUD
    - 관계 관리
    - 쿼리/집계
    - KPI 계산
    """
    
    def __init__(self):
        self.objects: Dict[str, CoreObject] = {}
        self.relationships: Dict[str, Relationship] = {}
        
        # 인덱스
        self._type_index: Dict[ObjectType, List[str]] = defaultdict(list)
        self._relation_index: Dict[str, List[str]] = defaultdict(list)
    
    def create_object(
        self,
        object_type: ObjectType,
        properties: Dict[str, Any],
        object_id: str = None
    ) -> CoreObject:
        """객체 생성"""
        obj_id = object_id or f"{object_type.value}_{uuid.uuid4().hex[:8]}"
        
        # 스키마 검증
        schema = OBJECT_SCHEMAS.get(object_type, {})
        required = schema.get("required", [])
        for field in required:
            if field not in properties:
                properties[field] = None  # 기본값
        
        # 객체 생성
        obj = CoreObject(
            id=obj_id,
            object_type=object_type,
            properties=properties
        )
        
        # Physics 값 초기화
        physics = schema.get("physics")
        if physics:
            obj.physics_values[physics.value] = self._calculate_physics_value(obj)
        
        # 저장
        self.objects[obj_id] = obj
        self._type_index[object_type].append(obj_id)
        
        return obj
    
    def get_object(self, object_id: str) -> Optional[CoreObject]:
        """객체 조회"""
        return self.objects.get(object_id)
    
    def update_object(self, object_id: str, properties: Dict[str, Any]) -> Optional[CoreObject]:
        """객체 업데이트"""
        obj = self.objects.get(object_id)
        if obj:
            obj.update(properties)
            # Physics 재계산
            schema = OBJECT_SCHEMAS.get(obj.object_type, {})
            physics = schema.get("physics")
            if physics:
                obj.physics_values[physics.value] = self._calculate_physics_value(obj)
        return obj
    
    def delete_object(self, object_id: str) -> bool:
        """객체 삭제"""
        obj = self.objects.get(object_id)
        if obj:
            del self.objects[object_id]
            self._type_index[obj.object_type].remove(object_id)
            return True
        return False
    
    def create_relationship(
        self,
        source_id: str,
        target_id: str,
        relation_type: RelationType,
        properties: Dict[str, Any] = None
    ) -> Optional[Relationship]:
        """관계 생성"""
        if source_id not in self.objects or target_id not in self.objects:
            return None
        
        rel_id = f"rel_{uuid.uuid4().hex[:8]}"
        rel = Relationship(
            id=rel_id,
            source_id=source_id,
            target_id=target_id,
            relation_type=relation_type,
            properties=properties or {}
        )
        
        self.relationships[rel_id] = rel
        self._relation_index[source_id].append(rel_id)
        self._relation_index[target_id].append(rel_id)
        
        return rel
    
    def query(
        self,
        object_type: ObjectType = None,
        filters: Dict[str, Any] = None,
        limit: int = 100
    ) -> List[CoreObject]:
        """쿼리"""
        results = []
        
        # 타입 필터
        if object_type:
            obj_ids = self._type_index.get(object_type, [])
            candidates = [self.objects[oid] for oid in obj_ids if oid in self.objects]
        else:
            candidates = list(self.objects.values())
        
        # 속성 필터
        if filters:
            for obj in candidates:
                match = True
                for key, value in filters.items():
                    if obj.properties.get(key) != value:
                        match = False
                        break
                if match:
                    results.append(obj)
        else:
            results = candidates
        
        return results[:limit]
    
    def aggregate(
        self,
        object_type: ObjectType,
        group_by: str,
        agg_field: str,
        agg_func: str = "sum"
    ) -> Dict[str, Any]:
        """집계"""
        objects = self.query(object_type=object_type)
        
        groups = defaultdict(list)
        for obj in objects:
            key = obj.properties.get(group_by, "unknown")
            value = obj.properties.get(agg_field)
            if value is not None:
                try:
                    groups[key].append(float(value))
                except (ValueError, TypeError):
                    pass
        
        result = {}
        for key, values in groups.items():
            if not values:
                continue
            if agg_func == "sum":
                result[key] = sum(values)
            elif agg_func == "avg":
                result[key] = statistics.mean(values)
            elif agg_func == "count":
                result[key] = len(values)
            elif agg_func == "max":
                result[key] = max(values)
            elif agg_func == "min":
                result[key] = min(values)
        
        return result
    
    def calculate_kpis(self, industry: Industry) -> Dict[str, Any]:
        """업종별 KPI 계산"""
        if industry == Industry.EDUCATION:
            return self._calculate_education_kpis()
        elif industry == Industry.RESTAURANT:
            return self._calculate_restaurant_kpis()
        elif industry == Industry.SAUNA:
            return self._calculate_sauna_kpis()
        return {}
    
    def _calculate_education_kpis(self) -> Dict[str, Any]:
        """교육 KPI"""
        students = self.query(object_type=ObjectType.STUDENT)
        courses = self.query(object_type=ObjectType.COURSE)
        
        active_students = [s for s in students if s.properties.get("status") == "active"]
        
        total_revenue = sum(
            s.properties.get("monthly_fee", 0) 
            for s in active_students 
            if s.properties.get("payment_status") == "paid"
        )
        
        avg_attendance = statistics.mean([
            s.properties.get("attendance_rate", 0) 
            for s in active_students
        ]) if active_students else 0
        
        return {
            "total_students": len(students),
            "active_students": len(active_students),
            "monthly_revenue": total_revenue,
            "avg_attendance": round(avg_attendance, 1),
            "course_count": len(courses)
        }
    
    def _calculate_restaurant_kpis(self) -> Dict[str, Any]:
        """음식점 KPI"""
        orders = self.query(object_type=ObjectType.ORDER)
        menus = self.query(object_type=ObjectType.MENU)
        tables = self.query(object_type=ObjectType.TABLE)
        
        total_sales = sum(o.properties.get("total", 0) for o in orders)
        order_count = len(orders)
        avg_order = total_sales / order_count if order_count > 0 else 0
        
        # 테이블 회전율
        avg_turnover = statistics.mean([
            t.properties.get("daily_turnover", 0) for t in tables
        ]) if tables else 0
        
        return {
            "total_sales": total_sales,
            "order_count": order_count,
            "avg_order_value": round(avg_order),
            "menu_count": len(menus),
            "table_count": len(tables),
            "avg_turnover": round(avg_turnover, 1)
        }
    
    def _calculate_sauna_kpis(self) -> Dict[str, Any]:
        """사우나 KPI"""
        bookings = self.query(object_type=ObjectType.BOOKING)
        facilities = self.query(object_type=ObjectType.FACILITY)
        utilities = self.query(object_type=ObjectType.UTILITY)
        
        total_revenue = sum(b.properties.get("total", 0) for b in bookings)
        total_guests = sum(b.properties.get("guest_count", 0) for b in bookings)
        
        avg_utilization = statistics.mean([
            f.properties.get("utilization_rate", 0) for f in facilities
        ]) if facilities else 0
        
        total_utility_cost = sum(u.properties.get("amount", 0) for u in utilities)
        
        return {
            "total_revenue": total_revenue,
            "total_guests": total_guests,
            "booking_count": len(bookings),
            "avg_utilization": round(avg_utilization, 1),
            "facility_count": len(facilities),
            "utility_cost": total_utility_cost
        }
    
    def _calculate_physics_value(self, obj: CoreObject) -> float:
        """Physics 값 계산"""
        props = obj.properties
        
        # 간단한 휴리스틱
        if obj.object_type == ObjectType.ORDER:
            total = props.get("total", 0)
            return min(1.0, total / 100000)  # 10만원 = 1.0
        
        elif obj.object_type == ObjectType.STUDENT:
            attendance = props.get("attendance_rate", 0)
            return attendance / 100
        
        elif obj.object_type == ObjectType.INVENTORY:
            quantity = props.get("quantity", 0)
            reorder = props.get("reorder_point", 10)
            return min(1.0, quantity / (reorder * 3))
        
        return 0.5
    
    def summary(self) -> Dict[str, Any]:
        """요약"""
        by_type = defaultdict(int)
        for obj in self.objects.values():
            by_type[obj.object_type.value] += 1
        
        return {
            "total_objects": len(self.objects),
            "total_relationships": len(self.relationships),
            "by_type": dict(by_type)
        }
    
    def export_json(self) -> str:
        """JSON 내보내기"""
        return json.dumps({
            "objects": [obj.to_dict() for obj in self.objects.values()],
            "relationships": [rel.to_dict() for rel in self.relationships.values()]
        }, ensure_ascii=False, indent=2, default=str)

