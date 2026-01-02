"""
Value Calculator Engine
AUTUS 핵심 물리 엔진

공식: V = M - T + S
V = 최종 가치 (Value)
M = 직접 돈 (Money) - 유입 금액 합계
T = 시간 비용 (Time) - 소요 시간 × 시급
S = 시너지 돈 (Synergy) - 연결 노드로부터의 간접 수익
"""
from typing import List, Dict, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from config import settings


class ValueCalculator:
    """
    AUTUS 가치 계산 엔진
    
    핵심 공식: V = M - T + S
    """
    
    def __init__(
        self,
        synergy_rate: float = None,
        max_depth: int = None
    ):
        self.synergy_rate = synergy_rate or settings.SYNERGY_RATE
        self.max_depth = max_depth or settings.MAX_SYNERGY_DEPTH
    
    async def calculate_value(
        self, 
        db: AsyncSession, 
        node_id: int
    ) -> Dict:
        """
        단일 노드 가치 계산
        
        V = M - T + S
        
        Returns:
            {
                "value": float,
                "direct_money": float,
                "time_cost": float,
                "synergy_money": float,
                "status": str
            }
        """
        from models import Node, Motion
        
        # 노드 조회
        result = await db.execute(select(Node).where(Node.id == node_id))
        node = result.scalar_one_or_none()
        
        if not node:
            return {"value": 0, "direct_money": 0, "time_cost": 0, "synergy_money": 0, "status": "DECAYING"}
        
        # M: 직접 돈 (유입 금액 합계)
        incoming_result = await db.execute(
            select(func.sum(Motion.amount))
            .where(Motion.target_id == node_id)
        )
        direct_money = float(incoming_result.scalar() or 0)
        
        # T: 시간 비용
        time_cost = float(node.time_cost or 0)
        
        # S: 시너지 돈
        synergy_money = await self._calculate_synergy(db, node_id)
        
        # V = M - T + S
        value = direct_money - time_cost + synergy_money
        
        # 상태 결정
        status = self._determine_status(value, direct_money)
        
        # 노드 업데이트
        node.value = value
        node.direct_money = direct_money
        node.synergy_money = synergy_money
        node.status = status
        node.calculated_at = datetime.utcnow()
        
        await db.commit()
        
        return {
            "value": value,
            "direct_money": direct_money,
            "time_cost": time_cost,
            "synergy_money": synergy_money,
            "status": status
        }
    
    async def _calculate_synergy(
        self,
        db: AsyncSession,
        node_id: int,
        depth: int = 1,
        visited: Set[int] = None
    ) -> float:
        """
        시너지 계산
        
        연결된 노드 가치의 synergy_rate%
        깊이에 따라 감쇠
        """
        from models import Node, Motion
        
        if visited is None:
            visited = {node_id}
        
        if depth > self.max_depth:
            return 0.0
        
        # 연결된 노드 찾기
        outgoing = await db.execute(
            select(Motion.target_id).where(Motion.source_id == node_id)
        )
        incoming = await db.execute(
            select(Motion.source_id).where(Motion.target_id == node_id)
        )
        
        connected_ids = set(
            [r[0] for r in outgoing.fetchall()] +
            [r[0] for r in incoming.fetchall()]
        )
        connected_ids.discard(node_id)
        connected_ids -= visited
        
        total_synergy = 0.0
        
        for cid in connected_ids:
            visited.add(cid)
            
            # 연결 노드 가치 조회
            result = await db.execute(
                select(Node.value).where(Node.id == cid, Node.is_active == True)
            )
            node_value = result.scalar()
            
            if node_value and node_value > 0:
                # 깊이에 따른 감쇠
                decay = self.synergy_rate ** depth
                total_synergy += node_value * decay
        
        return total_synergy
    
    def _determine_status(self, value: float, direct_money: float) -> str:
        """상태 결정"""
        if value <= 0:
            return "DECAYING"
        elif direct_money > 0 and value / direct_money > 1.5:
            return "OVERHEATED"
        else:
            return "STABLE"
    
    def predict_future_value(
        self,
        current_value: float,
        synergy_rate: float = None,
        months: int = 12
    ) -> List[Dict]:
        """
        복리 예측
        
        Future V = V × (1 + s)^t
        """
        rate = synergy_rate or self.synergy_rate
        predictions = []
        
        for month in range(1, months + 1):
            future_value = current_value * ((1 + rate) ** month)
            growth = ((future_value / current_value) - 1) * 100 if current_value > 0 else 0
            
            predictions.append({
                "month": month,
                "value": round(future_value, 2),
                "growth_percent": round(growth, 2)
            })
        
        return predictions
    
    async def recalculate_all(
        self,
        db: AsyncSession,
        batch_size: int = 100
    ) -> Dict:
        """전체 노드 재계산"""
        from models import Node
        
        # 총 노드 수
        total_result = await db.execute(
            select(func.count(Node.id)).where(Node.is_active == True)
        )
        total = total_result.scalar() or 0
        
        processed = 0
        errors = 0
        
        offset = 0
        while offset < total:
            result = await db.execute(
                select(Node.id)
                .where(Node.is_active == True)
                .offset(offset)
                .limit(batch_size)
            )
            node_ids = [r[0] for r in result.fetchall()]
            
            for node_id in node_ids:
                try:
                    await self.calculate_value(db, node_id)
                    processed += 1
                except Exception:
                    errors += 1
            
            offset += batch_size
        
        return {
            "total": total,
            "processed": processed,
            "errors": errors
        }





"""
Value Calculator Engine
AUTUS 핵심 물리 엔진

공식: V = M - T + S
V = 최종 가치 (Value)
M = 직접 돈 (Money) - 유입 금액 합계
T = 시간 비용 (Time) - 소요 시간 × 시급
S = 시너지 돈 (Synergy) - 연결 노드로부터의 간접 수익
"""
from typing import List, Dict, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from config import settings


class ValueCalculator:
    """
    AUTUS 가치 계산 엔진
    
    핵심 공식: V = M - T + S
    """
    
    def __init__(
        self,
        synergy_rate: float = None,
        max_depth: int = None
    ):
        self.synergy_rate = synergy_rate or settings.SYNERGY_RATE
        self.max_depth = max_depth or settings.MAX_SYNERGY_DEPTH
    
    async def calculate_value(
        self, 
        db: AsyncSession, 
        node_id: int
    ) -> Dict:
        """
        단일 노드 가치 계산
        
        V = M - T + S
        
        Returns:
            {
                "value": float,
                "direct_money": float,
                "time_cost": float,
                "synergy_money": float,
                "status": str
            }
        """
        from models import Node, Motion
        
        # 노드 조회
        result = await db.execute(select(Node).where(Node.id == node_id))
        node = result.scalar_one_or_none()
        
        if not node:
            return {"value": 0, "direct_money": 0, "time_cost": 0, "synergy_money": 0, "status": "DECAYING"}
        
        # M: 직접 돈 (유입 금액 합계)
        incoming_result = await db.execute(
            select(func.sum(Motion.amount))
            .where(Motion.target_id == node_id)
        )
        direct_money = float(incoming_result.scalar() or 0)
        
        # T: 시간 비용
        time_cost = float(node.time_cost or 0)
        
        # S: 시너지 돈
        synergy_money = await self._calculate_synergy(db, node_id)
        
        # V = M - T + S
        value = direct_money - time_cost + synergy_money
        
        # 상태 결정
        status = self._determine_status(value, direct_money)
        
        # 노드 업데이트
        node.value = value
        node.direct_money = direct_money
        node.synergy_money = synergy_money
        node.status = status
        node.calculated_at = datetime.utcnow()
        
        await db.commit()
        
        return {
            "value": value,
            "direct_money": direct_money,
            "time_cost": time_cost,
            "synergy_money": synergy_money,
            "status": status
        }
    
    async def _calculate_synergy(
        self,
        db: AsyncSession,
        node_id: int,
        depth: int = 1,
        visited: Set[int] = None
    ) -> float:
        """
        시너지 계산
        
        연결된 노드 가치의 synergy_rate%
        깊이에 따라 감쇠
        """
        from models import Node, Motion
        
        if visited is None:
            visited = {node_id}
        
        if depth > self.max_depth:
            return 0.0
        
        # 연결된 노드 찾기
        outgoing = await db.execute(
            select(Motion.target_id).where(Motion.source_id == node_id)
        )
        incoming = await db.execute(
            select(Motion.source_id).where(Motion.target_id == node_id)
        )
        
        connected_ids = set(
            [r[0] for r in outgoing.fetchall()] +
            [r[0] for r in incoming.fetchall()]
        )
        connected_ids.discard(node_id)
        connected_ids -= visited
        
        total_synergy = 0.0
        
        for cid in connected_ids:
            visited.add(cid)
            
            # 연결 노드 가치 조회
            result = await db.execute(
                select(Node.value).where(Node.id == cid, Node.is_active == True)
            )
            node_value = result.scalar()
            
            if node_value and node_value > 0:
                # 깊이에 따른 감쇠
                decay = self.synergy_rate ** depth
                total_synergy += node_value * decay
        
        return total_synergy
    
    def _determine_status(self, value: float, direct_money: float) -> str:
        """상태 결정"""
        if value <= 0:
            return "DECAYING"
        elif direct_money > 0 and value / direct_money > 1.5:
            return "OVERHEATED"
        else:
            return "STABLE"
    
    def predict_future_value(
        self,
        current_value: float,
        synergy_rate: float = None,
        months: int = 12
    ) -> List[Dict]:
        """
        복리 예측
        
        Future V = V × (1 + s)^t
        """
        rate = synergy_rate or self.synergy_rate
        predictions = []
        
        for month in range(1, months + 1):
            future_value = current_value * ((1 + rate) ** month)
            growth = ((future_value / current_value) - 1) * 100 if current_value > 0 else 0
            
            predictions.append({
                "month": month,
                "value": round(future_value, 2),
                "growth_percent": round(growth, 2)
            })
        
        return predictions
    
    async def recalculate_all(
        self,
        db: AsyncSession,
        batch_size: int = 100
    ) -> Dict:
        """전체 노드 재계산"""
        from models import Node
        
        # 총 노드 수
        total_result = await db.execute(
            select(func.count(Node.id)).where(Node.is_active == True)
        )
        total = total_result.scalar() or 0
        
        processed = 0
        errors = 0
        
        offset = 0
        while offset < total:
            result = await db.execute(
                select(Node.id)
                .where(Node.is_active == True)
                .offset(offset)
                .limit(batch_size)
            )
            node_ids = [r[0] for r in result.fetchall()]
            
            for node_id in node_ids:
                try:
                    await self.calculate_value(db, node_id)
                    processed += 1
                except Exception:
                    errors += 1
            
            offset += batch_size
        
        return {
            "total": total,
            "processed": processed,
            "errors": errors
        }










