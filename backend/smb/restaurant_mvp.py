"""
AUTUS 음식점 MVP v1.0
======================

End-to-End 통합 시스템
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import json
import random
import statistics

from ontology.smb_ontology import (
    OntologyEngine, ObjectType, Industry, PhysicsMapping,
    CoreObject, Relationship, RelationType
)
from agents.smb_agents import (
    AgentOrchestrator, AgentType, Industry as AgentIndustry
)


# ============================================================
# 1. 음식점 시뮬레이터
# ============================================================

class RestaurantSimulator:
    """음식점 POS 데이터 시뮬레이터"""
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        
        self.menu = [
            {"id": "M001", "name": "삼겹살", "price": 15000, "cost": 6000, "category": "main", "prep_time": 15},
            {"id": "M002", "name": "목살", "price": 14000, "cost": 5500, "category": "main", "prep_time": 15},
            {"id": "M003", "name": "된장찌개", "price": 8000, "cost": 2500, "category": "main", "prep_time": 10},
            {"id": "M004", "name": "김치찌개", "price": 8000, "cost": 2500, "category": "main", "prep_time": 10},
            {"id": "M005", "name": "공기밥", "price": 1000, "cost": 300, "category": "side", "prep_time": 1},
            {"id": "M006", "name": "소주", "price": 5000, "cost": 2000, "category": "drink", "prep_time": 0},
            {"id": "M007", "name": "맥주", "price": 5000, "cost": 2000, "category": "drink", "prep_time": 0},
            {"id": "M008", "name": "콜라", "price": 2000, "cost": 800, "category": "drink", "prep_time": 0},
        ]
        
        self.tables = [{"id": f"T{i:02d}", "capacity": 4 if i <= 8 else 6} for i in range(1, 16)]
        
        self.hourly_traffic = {
            11: 0.4, 12: 0.9, 13: 0.7, 14: 0.3,
            17: 0.5, 18: 1.0, 19: 1.0, 20: 0.8, 21: 0.6, 22: 0.3
        }
        
        self.day_weights = [0.8, 0.7, 0.8, 0.9, 1.2, 1.5, 1.3]
    
    def generate_order(self, order_time: datetime = None) -> Optional[Dict]:
        """주문 생성"""
        order_time = order_time or datetime.now()
        hour = order_time.hour
        day = order_time.weekday()
        
        traffic = self.hourly_traffic.get(hour, 0.1) * self.day_weights[day]
        
        if random.random() > traffic:
            return None
        
        table = random.choice(self.tables)
        guest_count = random.randint(2, table["capacity"])
        items = []
        
        main_count = guest_count
        for _ in range(main_count):
            menu_item = random.choice([m for m in self.menu if m["category"] == "main"])
            items.append(menu_item["id"])
        
        drink_count = random.randint(guest_count - 1, guest_count + 2)
        for _ in range(drink_count):
            menu_item = random.choice([m for m in self.menu if m["category"] == "drink"])
            items.append(menu_item["id"])
        
        for _ in range(guest_count):
            items.append("M005")
        
        item_details = []
        total = 0
        cost = 0
        for item_id in items:
            menu_item = next((m for m in self.menu if m["id"] == item_id), None)
            if menu_item:
                item_details.append(menu_item["name"])
                total += menu_item["price"]
                cost += menu_item["cost"]
        
        discount = 0
        if random.random() < 0.1:
            discount = int(total * random.uniform(0.05, 0.15))
        
        is_anomaly = random.random() < 0.01
        if is_anomaly:
            anomaly_type = random.choice(["void", "discount_abuse", "cash_only"])
            if anomaly_type == "discount_abuse":
                discount = int(total * 0.5)
        
        return {
            "order_id": f"ORD-{order_time.strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
            "order_time": order_time.isoformat(),
            "table_id": table["id"],
            "guest_count": guest_count,
            "items": items,
            "item_names": item_details,
            "subtotal": total,
            "discount": discount,
            "total": total - discount,
            "cost": cost,
            "payment_method": random.choice(["card", "card", "card", "cash"]),
            "status": "paid",
            "is_anomaly": is_anomaly
        }
    
    def generate_day_orders(self, date: datetime = None) -> List[Dict]:
        """하루치 주문 생성"""
        date = date or datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        orders = []
        
        for hour in range(11, 23):
            order_count = int(self.hourly_traffic.get(hour, 0.1) * 10 * self.day_weights[date.weekday()])
            
            for _ in range(order_count):
                order_time = date.replace(hour=hour, minute=random.randint(0, 59))
                order = self.generate_order(order_time)
                if order:
                    orders.append(order)
        
        return orders
    
    def generate_inventory(self) -> List[Dict]:
        """재고 데이터 생성"""
        return [
            {"item": "삼겹살", "unit": "kg", "current": 50, "daily_usage": 15, "unit_cost": 15000, "reorder_point": 20},
            {"item": "목살", "unit": "kg", "current": 40, "daily_usage": 12, "unit_cost": 14000, "reorder_point": 15},
            {"item": "된장", "unit": "kg", "current": 10, "daily_usage": 1, "unit_cost": 5000, "reorder_point": 3},
            {"item": "김치", "unit": "kg", "current": 30, "daily_usage": 8, "unit_cost": 8000, "reorder_point": 10},
            {"item": "소주", "unit": "병", "current": 200, "daily_usage": 50, "unit_cost": 1500, "reorder_point": 100},
            {"item": "맥주", "unit": "병", "current": 150, "daily_usage": 30, "unit_cost": 2000, "reorder_point": 80},
            {"item": "쌀", "unit": "kg", "current": 100, "daily_usage": 20, "unit_cost": 3000, "reorder_point": 30},
        ]


# ============================================================
# 2. 음식점 MVP 엔진
# ============================================================

class RestaurantMVP:
    """음식점 MVP 통합 엔진"""
    
    def __init__(self):
        self.ontology = OntologyEngine()
        self.simulator = RestaurantSimulator()
        self.agents = AgentOrchestrator(AgentIndustry.RESTAURANT)
        
        self.daily_stats = {
            "total_sales": 0,
            "order_count": 0,
            "guest_count": 0,
            "avg_order_value": 0,
            "food_cost": 0,
            "food_cost_ratio": 0,
            "anomaly_count": 0
        }
        
        self.orders_today: List[Dict] = []
        self.alerts: List[Dict] = []
    
    def initialize(self):
        """초기화"""
        for menu in self.simulator.menu:
            self.ontology.create_object(ObjectType.MENU, {
                "name": menu["name"],
                "price": menu["price"],
                "cost": menu["cost"],
                "category": menu["category"],
                "prep_time_min": menu["prep_time"],
                "margin_rate": (menu["price"] - menu["cost"]) / menu["price"] * 100,
                "is_available": True,
                "daily_sales": 0
            }, object_id=menu["id"])
        
        for table in self.simulator.tables:
            self.ontology.create_object(ObjectType.TABLE, {
                "number": int(table["id"][1:]),
                "capacity": table["capacity"],
                "status": "available",
                "daily_turnover": 0
            }, object_id=table["id"])
        
        for item in self.simulator.generate_inventory():
            self.ontology.create_object(ObjectType.INVENTORY, {
                "name": item["item"],
                "unit": item["unit"],
                "quantity": item["current"],
                "unit_cost": item["unit_cost"],
                "reorder_point": item["reorder_point"],
                "daily_usage": item["daily_usage"]
            })
    
    def process_order(self, order: Dict) -> Dict:
        """주문 처리"""
        self.ontology.create_object(ObjectType.ORDER, {
            "order_time": order["order_time"],
            "table_id": order["table_id"],
            "item_count": len(order["items"]),
            "items": json.dumps(order["item_names"]),
            "subtotal": order["subtotal"],
            "discount": order["discount"],
            "total": order["total"],
            "payment_method": order["payment_method"],
            "status": order["status"]
        }, object_id=order["order_id"])
        
        self.daily_stats["total_sales"] += order["total"]
        self.daily_stats["order_count"] += 1
        self.daily_stats["guest_count"] += order["guest_count"]
        self.daily_stats["food_cost"] += order["cost"]
        
        if self.daily_stats["total_sales"] > 0:
            self.daily_stats["food_cost_ratio"] = self.daily_stats["food_cost"] / self.daily_stats["total_sales"] * 100
            self.daily_stats["avg_order_value"] = self.daily_stats["total_sales"] / self.daily_stats["order_count"]
        
        if order.get("is_anomaly"):
            self.daily_stats["anomaly_count"] += 1
            self.alerts.append({
                "type": "anomaly",
                "level": "warning",
                "message": f"이상 거래 감지: {order['order_id']}",
                "order_id": order["order_id"],
                "timestamp": datetime.now().isoformat()
            })
        
        self.orders_today.append(order)
        
        return {
            "order_id": order["order_id"],
            "processed": True,
            "daily_stats": self.daily_stats.copy()
        }
    
    def run_daily_simulation(self, date: datetime = None) -> Dict:
        """하루 시뮬레이션"""
        date = date or datetime.now()
        
        self.orders_today = []
        self.daily_stats = {
            "total_sales": 0,
            "order_count": 0,
            "guest_count": 0,
            "avg_order_value": 0,
            "food_cost": 0,
            "food_cost_ratio": 0,
            "anomaly_count": 0
        }
        
        orders = self.simulator.generate_day_orders(date)
        
        for order in orders:
            self.process_order(order)
        
        return {
            "date": date.isoformat(),
            "orders": len(orders),
            "stats": self.daily_stats.copy()
        }
    
    def run_analysis(self) -> Dict:
        """AI 분석 실행"""
        analyzer_result = self.agents.run_agent(AgentType.ANALYZER, {
            "type": "revenue",
            "data": [{"amount": o["total"], "date": o["order_time"]} for o in self.orders_today]
        })
        
        detector_result = self.agents.run_agent(AgentType.DETECTOR, {
            "data": [
                {"amount": o["total"], "hour": datetime.fromisoformat(o["order_time"]).hour}
                for o in self.orders_today
            ]
        })
        
        predictor_result = self.agents.run_agent(AgentType.PREDICTOR, {
            "type": "demand",
            "horizon": 7
        })
        
        inventory_result = self.agents.run_agent(AgentType.PREDICTOR, {
            "type": "inventory",
            "data": self.simulator.generate_inventory()
        })
        
        optimizer_result = self.agents.run_agent(AgentType.OPTIMIZER, {
            "type": "inventory",
            "data": {"items": self.simulator.generate_inventory()}
        })
        
        coach_result = self.agents.run_agent(AgentType.COACH, {
            "kpis": {
                "객단가": self.daily_stats["avg_order_value"],
                "식재료비율": self.daily_stats["food_cost_ratio"]
            },
            "question": "오늘 매출을 분석해주세요"
        })
        
        results = {
            "analyzer": analyzer_result.to_dict(),
            "detector": detector_result.to_dict(),
            "predictor": predictor_result.to_dict(),
            "inventory": inventory_result.to_dict(),
            "optimizer": optimizer_result.to_dict(),
            "coach": coach_result.to_dict()
        }
        
        insights = []
        for name, result in results.items():
            if result.get("insights"):
                insights.extend(result["insights"])
        
        recommendations = []
        for name, result in results.items():
            if result.get("recommendations"):
                recommendations.extend(result["recommendations"])
        
        return {
            "results": results,
            "summary": {
                "insights": insights,
                "recommendations": recommendations[:5]
            }
        }
    
    def get_dashboard_data(self) -> Dict:
        """대시보드 데이터"""
        kpis = {
            "primary": [
                {"id": "sales", "label": "오늘 매출", "value": self.daily_stats["total_sales"], "format": "currency", "icon": "💰"},
                {"id": "orders", "label": "주문", "value": self.daily_stats["order_count"], "unit": "건", "icon": "📝"},
                {"id": "avg", "label": "객단가", "value": round(self.daily_stats["avg_order_value"]), "format": "currency", "icon": "🧾"},
                {"id": "guests", "label": "방문객", "value": self.daily_stats["guest_count"], "unit": "명", "icon": "👥"}
            ],
            "secondary": [
                {"id": "food_cost", "label": "식재료비율", "value": round(self.daily_stats["food_cost_ratio"], 1), "unit": "%"},
                {"id": "anomalies", "label": "이상 거래", "value": self.daily_stats["anomaly_count"], "unit": "건"}
            ]
        }
        
        hourly_sales = defaultdict(int)
        for order in self.orders_today:
            hour = datetime.fromisoformat(order["order_time"]).hour
            hourly_sales[hour] += order["total"]
        
        hourly_chart = [
            {"hour": h, "sales": hourly_sales.get(h, 0)}
            for h in range(11, 23)
        ]
        
        menu_sales = defaultdict(lambda: {"count": 0, "revenue": 0})
        for order in self.orders_today:
            for item_name in order["item_names"]:
                menu_item = next((m for m in self.simulator.menu if m["name"] == item_name), None)
                if menu_item:
                    menu_sales[item_name]["count"] += 1
                    menu_sales[item_name]["revenue"] += menu_item["price"]
        
        top_menus = sorted(
            [{"name": k, **v} for k, v in menu_sales.items()],
            key=lambda x: x["revenue"],
            reverse=True
        )[:5]
        
        return {
            "timestamp": datetime.now().isoformat(),
            "kpis": kpis,
            "hourly_chart": hourly_chart,
            "top_menus": top_menus,
            "alerts": self.alerts[-5:],
            "ontology_summary": self.ontology.summary()
        }
    
    def get_full_report(self) -> Dict:
        """전체 리포트"""
        dashboard = self.get_dashboard_data()
        analysis = self.run_analysis()
        
        return {
            "date": datetime.now().isoformat(),
            "business": "음식점 MVP",
            "dashboard": dashboard,
            "analysis": analysis["summary"],
            "detailed_results": analysis["results"]
        }

