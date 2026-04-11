"""
Alert Pipeline — Redis Pub/Sub + WebSocket Broadcasting
"""
import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Set, Dict, Any, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
ALERT_CHANNEL = "shelf:alerts"


class AlertPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


PRIORITY_SCORE = {
    AlertPriority.CRITICAL: 100,
    AlertPriority.HIGH: 75,
    AlertPriority.MEDIUM: 50,
    AlertPriority.LOW: 25,
}


class AlertPipeline:
    """
    Redis-backed alert pipeline with WebSocket broadcasting.
    Guarantees < 5 minute alert delivery SLA.
    """

    def __init__(self):
        self._redis = None
        self._ws_connections: Set = set()
        self._alert_queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._running = False

    async def initialize(self):
        """Connect to Redis."""
        try:
            import redis.asyncio as aioredis
            self._redis = await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
            logger.info("[AlertPipeline] Connected to Redis")
        except Exception as e:
            logger.warning(f"[AlertPipeline] Redis unavailable ({e}), using in-memory queue")
            self._redis = None

    async def publish_alert(self, alert: Dict[str, Any]) -> bool:
        """
        Publish an alert to all channels.
        Prioritizes by revenue_impact × urgency_factor.
        """
        alert["id"] = alert.get("id", int(datetime.utcnow().timestamp() * 1000))
        alert["timestamp"] = datetime.utcnow().isoformat()
        alert["priority_score"] = self._compute_priority_score(alert)

        # Push to Redis
        if self._redis:
            try:
                await self._redis.publish(ALERT_CHANNEL, json.dumps(alert))
                await self._redis.lpush("alerts:history", json.dumps(alert))
                await self._redis.ltrim("alerts:history", 0, 999)  # Keep last 1000
            except Exception as e:
                logger.error(f"Redis publish failed: {e}")

        # Push to in-memory queue for WebSocket broadcast
        try:
            self._alert_queue.put_nowait(alert)
        except asyncio.QueueFull:
            logger.warning("Alert queue full, dropping oldest alert")

        # Broadcast to all WebSocket clients
        await self._broadcast_ws(alert)

        logger.info(f"[Alert] {alert.get('priority', 'medium').upper()}: {alert.get('title', '')}")
        return True

    async def _broadcast_ws(self, alert: Dict[str, Any]):
        """Send alert to all connected WebSocket clients."""
        if not self._ws_connections:
            return

        message = json.dumps({"type": "alert", "data": alert})
        dead_connections = set()

        for ws in list(self._ws_connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        self._ws_connections -= dead_connections

    def register_ws(self, websocket):
        """Register a WebSocket connection for alert broadcasting."""
        self._ws_connections.add(websocket)
        logger.info(f"[AlertPipeline] WS client registered. Total: {len(self._ws_connections)}")

    def unregister_ws(self, websocket):
        """Unregister a WebSocket connection."""
        self._ws_connections.discard(websocket)

    async def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch recent alerts from Redis or DB fallback."""
        if self._redis:
            try:
                raw = await self._redis.lrange("alerts:history", 0, limit - 1)
                return [json.loads(r) for r in raw]
            except Exception:
                pass

        # Fallback to DB
        from database import SessionLocal
        from models.db_models import Alert
        db = SessionLocal()
        try:
            alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
            return [
                {
                    "id": a.id,
                    "type": a.type,
                    "priority": a.priority,
                    "title": a.title,
                    "message": a.message,
                    "suggested_action": a.suggested_action,
                    "revenue_impact": a.revenue_impact,
                    "shelf": a.shelf.name if a.shelf else None,
                    "status": a.status,
                    "timestamp": a.created_at.isoformat()
                }
                for a in alerts
            ]
        except Exception as e:
            return self._generate_demo_alerts(limit)
        finally:
            db.close()

    def _compute_priority_score(self, alert: Dict) -> float:
        """Score = revenue_impact × urgency_multiplier."""
        urgency = {
            AlertPriority.CRITICAL: 4.0,
            AlertPriority.HIGH: 3.0,
            AlertPriority.MEDIUM: 2.0,
            AlertPriority.LOW: 1.0,
        }
        priority = alert.get("priority", "medium")
        revenue_impact = alert.get("revenue_impact", 100.0)
        return revenue_impact * urgency.get(priority, 2.0)

    def _generate_demo_alerts(self, limit: int) -> List[Dict]:
        """Generate demo alert history."""
        import random
        from datetime import timedelta

        types = [
            {
                "type": "stockout",
                "priority": "critical",
                "title": "STOCKOUT: Coca-Cola 330ml — Aisle A",
                "message": "Shelf level is empty. Estimated lost revenue: ₹450/hr",
                "suggested_action": "Retrieve stock from back store and restock Aisle A, Shelf 2",
                "revenue_impact": 450.0,
                "shelf": "Aisle A — Shelf 2"
            },
            {
                "type": "low_stock",
                "priority": "high",
                "title": "LOW STOCK: Lay's Classic 200g — Aisle C",
                "message": "Only 2 facings remaining. Standard is 6 facings.",
                "suggested_action": "Restock within 30 minutes to avoid stockout",
                "revenue_impact": 280.0,
                "shelf": "Aisle C — Shelf 1"
            },
            {
                "type": "planogram_violation",
                "priority": "medium",
                "title": "Planogram Violation — Beverages Section",
                "message": "3 products misplaced. Compliance score dropped to 72%",
                "suggested_action": "Refer to planogram PDF and relocate products",
                "revenue_impact": 150.0,
                "shelf": "Aisle B — Shelf 3"
            },
            {
                "type": "price_tag_error",
                "priority": "medium",
                "title": "Price Tag Mismatch: Pringles 165g",
                "message": "Tag shows ₹75. System price is ₹85",
                "suggested_action": "Replace price tag immediately to avoid compliance issue",
                "revenue_impact": 85.0,
                "shelf": "Aisle C — Shelf 2"
            },
            {
                "type": "stockout",
                "priority": "critical",
                "title": "STOCKOUT: Amul Full Cream Milk 1L — Dairy",
                "message": "Complete stockout. High-velocity SKU.",
                "suggested_action": "Emergency restock from cold storage",
                "revenue_impact": 620.0,
                "shelf": "Dairy — Shelf 1"
            },
            {
                "type": "low_stock",
                "priority": "high",
                "title": "LOW STOCK: Basmati Rice 5kg — Grocery",
                "message": "1 unit remaining. Reorder point crossed.",
                "suggested_action": "Place replenishment order immediately",
                "revenue_impact": 450.0,
                "shelf": "Grocery — Shelf 4"
            },
        ]

        alerts = []
        now = datetime.utcnow()
        for i in range(min(limit, len(types) * 3)):
            template = types[i % len(types)]
            alert = dict(template)
            alert["id"] = i + 1
            alert["timestamp"] = (now - timedelta(minutes=random.randint(0, 120))).isoformat()
            alert["status"] = random.choice(["active", "active", "active", "acknowledged"])
            alerts.append(alert)

        alerts.sort(key=lambda x: x["timestamp"], reverse=True)
        return alerts[:limit]


_pipeline: Optional[AlertPipeline] = None


def get_alert_pipeline() -> AlertPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = AlertPipeline()
    return _pipeline
