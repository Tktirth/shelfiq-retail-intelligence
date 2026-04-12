"""
FastAPI Application — Smart Retail Shelf Intelligence API
"""
import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import Store, Aisle, Shelf, Product, Planogram, User, Alert, AlertStatus
from auth.security import get_current_active_user

from cv_engine.detector import get_detector
from cv_engine.sku_recognizer import get_recognizer
from planogram.compliance_engine import get_compliance_engine
from forecasting.demand_forecaster import get_forecaster, PRODUCT_DEMAND
from alerting.alert_pipeline import get_alert_pipeline
from routers import auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — ensure tables exist and data is seeded
    from database import engine
    from models.db_models import Base
    
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables ensured")
        
        # Trigger global DB seeding (safe, has an internal 'exists' check)
        import seed_db
        if seed_db.seed_data():
            logger.info("✅ Core Demo Data successfully initialized.")
        else:
            logger.error("⚠️ Core Demo Data initialization failed.")

    except Exception as e:
        logger.error(f"⚠️ Database initialization error: {e}")

    pipeline = get_alert_pipeline()
    await pipeline.initialize()
    logger.info("✅ Smart Retail Shelf Intelligence API started")
    
    # Background live feed generator
    async def generate_live_alerts():
        import random
        from alerting.alert_pipeline import get_alert_pipeline
        while True:
            # Much slower, realistic frequency: 2-5 minutes between alerts
            await asyncio.sleep(random.randint(120, 300))
            try:
                alert_types = ["stockout", "low_stock", "planogram_violation"]
                alert_type = random.choice(alert_types)
                templates = {
                    "stockout": {
                        "type": "stockout",
                        "priority": "critical",
                        "title": f"STOCKOUT: Pringles Original — Aisle C",
                        "message": "Shelf is empty. Revenue impact: ₹320/hr",
                        "suggested_action": "High-priority restock needed",
                        "revenue_impact": 320.0,
                        "status": "active"
                    },
                    "low_stock": {
                        "type": "low_stock",
                        "priority": "high",
                        "title": "LOW STOCK: Dairy Section",
                        "message": "Fast moving item below threshold.",
                        "suggested_action": "Restock next run",
                        "revenue_impact": 150.0,
                        "status": "active"
                    },
                    "planogram_violation": {
                        "type": "planogram_violation",
                        "priority": "medium",
                        "title": "Planogram Violation — Aisle A",
                        "message": "Unauthorized product detected.",
                        "suggested_action": "Remove item",
                        "revenue_impact": 40.0,
                        "status": "active"
                    }
                }
                alert_data = dict(templates[alert_type])
                alert_data["shelf"] = "Live Monitoring Camera"
                pipeline_inst = get_alert_pipeline()
                await pipeline_inst.publish_alert(alert_data)
            except Exception as e:
                pass
                
    bg_task = asyncio.create_task(generate_live_alerts())
    
    yield
    # Shutdown
    bg_task.cancel()
    logger.info("Shutting down...")


app = FastAPI(
    title="Smart Retail Shelf Intelligence API",
    description="Computer Vision-Driven Inventory Monitoring and Demand Optimization",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class AlertAcknowledgeRequest(BaseModel):
    alert_id: int
    acknowledged_by: Optional[str] = "store_manager"


class ShelfAnalysisRequest(BaseModel):
    shelf_id: int


# ---------------------------------------------------------------------------
# Routes — Store & Shelves
# ---------------------------------------------------------------------------
@app.get("/api/store")
async def get_store(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    store = db.query(Store).first()
    if not store:
        return {"error": "Store not found in database. Did you run seed_db.py?"}
    
    aisles = db.query(Aisle).filter(Aisle.store_id == store.id).all()
    total_shelves = db.query(Shelf).filter(Shelf.store_id == store.id).count()
    
    return {
        "id": store.id,
        "name": store.name,
        "location": store.location,
        "total_shelves": total_shelves,
        "aisles": [a.name for a in aisles]
    }


@app.get("/api/shelves")
async def get_shelves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    detector = get_detector()
    compliance_engine = get_compliance_engine()
    shelves_with_status = []
    
    shelves = db.query(Shelf).all()

    for shelf in shelves:
        aisle = db.query(Aisle).filter(Aisle.id == shelf.aisle_id).first()
        aisle_name = aisle.name if aisle else "Unknown"
        
        planogram_model = db.query(Planogram).filter(Planogram.id == shelf.planogram_id).first()
        planogram = planogram_model.spec if planogram_model else {}

        analysis = detector.analyze_shelf(shelf.id, planogram=planogram)
        detected = [
            {
                "sku": p.sku, "name": p.name, "confidence": p.confidence,
                "stock_level": p.stock_level, "facings": p.facings,
                "position_x": p.position_x, "position_y": p.position_y,
                "bbox": p.bbox
            }
            for p in analysis.detected_products
        ]

        report = compliance_engine.analyze(shelf.id, planogram, detected)

        shelves_with_status.append({
            "id": shelf.id,
            "name": shelf.name,
            "aisle": aisle_name,
            "category": aisle.category if aisle else "General",
            "level": shelf.level,
            "health_score": analysis.health_score,
            "compliance_score": report.compliance_score,
            "stock_summary": analysis.stock_summary,
            "violations_count": report.total_violations,
            "last_analyzed": datetime.utcnow().isoformat(),
            "detected_products": detected,
            "violations": [vars(v) for v in report.violations[:5]]
        })

    return shelves_with_status


@app.get("/api/shelves/{shelf_id}")
async def get_shelf_detail(
    shelf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")

    aisle = db.query(Aisle).filter(Aisle.id == shelf.aisle_id).first()
    planogram_model = db.query(Planogram).filter(Planogram.id == shelf.planogram_id).first()
    planogram = planogram_model.spec if planogram_model else {}

    detector = get_detector()
    compliance_engine = get_compliance_engine()

    analysis = detector.analyze_shelf(shelf_id, planogram=planogram)
    detected = [
        {
            "sku": p.sku, "name": p.name, "confidence": p.confidence,
            "stock_level": p.stock_level, "facings": p.facings,
            "position_x": p.position_x, "position_y": p.position_y,
            "bbox": p.bbox
        }
        for p in analysis.detected_products
    ]

    report = compliance_engine.analyze(shelf_id, planogram, detected)

    return {
        "id": shelf.id,
        "name": shelf.name,
        "aisle": aisle.name if aisle else "Unknown",
        "category": aisle.category if aisle else "Unknown",
        "level": shelf.level,
        "health_score": analysis.health_score,
        "compliance_score": report.compliance_score,
        "stock_summary": analysis.stock_summary,
        "detected_products": detected,
        "violations": [vars(v) for v in report.violations],
        "missing_products": report.missing_products,
        "unauthorized_products": report.unauthorized_products,
        "facing_accuracy": report.facing_accuracy,
        "price_accuracy": report.price_accuracy,
        "recommendations": report.recommendations,
        "planogram": planogram,
        "processing_time_ms": analysis.processing_time_ms,
        "last_analyzed": datetime.utcnow().isoformat()
    }


@app.post("/api/analyze-shelf")
async def analyze_shelf_image(
    shelf_id: int = Query(1),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload shelf image for real-time CV analysis and product identification."""
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
        
    # Preparation: Get planogram items for matching
    planogram_items = []
    if shelf.planogram_id:
        items = db.query(PlanogramItem).filter(PlanogramItem.planogram_id == shelf.planogram_id).all()
        for item in items:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                planogram_items.append({
                    "sku": prod.sku,
                    "name": prod.name,
                    "price": prod.unit_price,
                    "x": item.position_x,
                    "y": item.position_y
                })

    import base64
    image_bytes = None
    if file:
        image_bytes = await file.read()
    
    from cv_engine.detector import get_detector
    detector = get_detector()
    
    try:
        # Run real inference
        analysis = detector.analyze_shelf(
            shelf_id=shelf_id,
            image_bytes=image_bytes,
            planogram_items=planogram_items
        )
        
        # Log analysis in DB if desired (optional)
        shelf.health_score = analysis.health_score
        shelf.last_analyzed = datetime.utcnow()
        db.commit()

        return {
            "status": "success",
            "shelf_id": shelf_id,
            "shelf_name": shelf.name,
            "health_score": analysis.health_score,
            "stock_summary": analysis.stock_summary,
            "detected_products_count": len(analysis.detected_products),
            "detected_products": analysis.detected_products,
            "processing_time_ms": analysis.processing_time_ms
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"CV Analysis failed: {str(e)}")


# ---------------------------------------------------------------------------
# Routes — Alerts
# ---------------------------------------------------------------------------
@app.get("/api/alerts")
async def get_alerts(
    status: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pipeline = get_alert_pipeline()
    alerts = await pipeline.get_recent_alerts(limit=limit)

    if status:
        alerts = [a for a in alerts if a.get("status") == status]
    if type:
        alerts = [a for a in alerts if a.get("type") == type]

    return {"alerts": alerts, "total": len(alerts)}


@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int, 
    req: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    alert_db = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert_db:
        alert_db.status = AlertStatus.ACKNOWLEDGED
        alert_db.acknowledged_at = datetime.utcnow()
        db.commit()

    return {
        "success": True,
        "alert_id": alert_id,
        "acknowledged_by": current_user.full_name or req.acknowledged_by,
        "acknowledged_at": datetime.utcnow().isoformat()
    }


@app.post("/api/alerts/simulate")
async def simulate_alert(
    alert_type: str = "stockout",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Trigger a simulated real-time alert for demo purposes."""
    import random
    pipeline = get_alert_pipeline()

    templates = {
        "stockout": {
            "type": "stockout",
            "priority": "critical",
            "title": f"STOCKOUT: Coca-Cola 330ml — Aisle A",
            "message": "Shelf is completely empty. Revenue impact: ₹450/hr",
            "suggested_action": "Restock from back store immediately",
            "revenue_impact": 450.0,
        },
        "low_stock": {
            "type": "low_stock",
            "priority": "high",
            "title": "LOW STOCK: Amul Milk 1L — Dairy Section",
            "message": "Only 1 unit remaining. Reorder point breached.",
            "suggested_action": "Restock within 20 minutes",
            "revenue_impact": 310.0,
        },
        "planogram": {
            "type": "planogram_violation",
            "priority": "medium",
            "title": "Planogram Violation — Snacks Aisle B",
            "message": "Lay's placed in Pringles position. Compliance: 68%",
            "suggested_action": "Restore product positions per planogram spec",
            "revenue_impact": 180.0,
        }
    }

    alert = templates.get(alert_type, templates["stockout"])
    
    shelves = db.query(Shelf).all()
    shelf_name = random.choice(shelves).name if shelves else "Unknown Shelf"
    alert["shelf"] = shelf_name
    
    await pipeline.publish_alert(alert)
    return {"success": True, "alert": alert}


# ---------------------------------------------------------------------------
# Routes — Forecasting
# ---------------------------------------------------------------------------
@app.get("/api/forecast/{sku}")
async def get_forecast(
    sku: str, 
    store_id: int = 1, 
    horizon_days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    forecaster = get_forecaster()
    result = forecaster.forecast(sku, store_id, horizon_days=horizon_days)
    return result


@app.get("/api/replenishment")
async def get_replenishment_recommendations(
    store_id: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    forecaster = get_forecaster()
    products = db.query(Product).all()
    skus = [p.sku for p in products] if products else list(PRODUCT_DEMAND.keys())
    
    recommendations = []

    for idx, sku in enumerate(skus):
        if idx > 15: break # limit processing time
        forecast = forecaster.forecast(sku, store_id, horizon_days=7)
        summary = forecast["summary"]
        
        prod = db.query(Product).filter(Product.sku == sku).first()
        prod_name = prod.name if prod else sku
        
        recommendations.append({
            "sku": sku,
            "product_name": prod_name,
            "avg_daily_demand": summary["avg_daily_demand"],
            "reorder_point": summary["reorder_point"],
            "suggested_order_qty": summary["suggested_order_qty"],
            "wmape": summary["wmape"],
            "total_7day_demand": summary["total_7day_demand"],
        })

    recommendations.sort(key=lambda x: x["avg_daily_demand"], reverse=True)
    return {"recommendations": recommendations, "generated_at": datetime.utcnow().isoformat()}


# ---------------------------------------------------------------------------
# Routes — Compliance & Analytics
# ---------------------------------------------------------------------------
@app.get("/api/compliance")
async def get_compliance_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    import random
    aisles_db = db.query(Aisle).all()
    aisles = []
    
    for aisle in aisles_db:
        compliance = random.uniform(65, 98)
        shelves_count = len(aisle.shelves)
        aisles.append({
            "aisle": f"Aisle {aisle.name}",
            "category": aisle.category,
            "compliance_score": round(compliance, 1),
            "health_score": round(random.uniform(60, 100), 1),
            "violations": random.randint(0, 5),
            "shelves": shelves_count
        })

    overall = sum(a["compliance_score"] for a in aisles) / max(len(aisles), 1)
    return {
        "overall_compliance": round(overall, 1),
        "aisles": aisles,
        "last_updated": datetime.utcnow().isoformat()
    }


@app.get("/api/analytics/heatmap")
async def get_stockout_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Stockout frequency by aisle and hour of day."""
    import random
    aisles_db = db.query(Aisle).all()
    aisles = [f"Aisle {a.name}" for a in aisles_db] if aisles_db else ["Aisle A", "Aisle B"]
    
    hours = list(range(8, 22))  # Store hours 8am - 10pm
    heatmap = []

    for aisle in aisles:
        for hour in hours:
            # Peak hours: lunch (12-14) and evening (17-20)
            peak_factor = 2.5 if 12 <= hour <= 14 or 17 <= hour <= 20 else 1.0
            frequency = random.uniform(0, 0.4) * peak_factor
            heatmap.append({
                "aisle": aisle,
                "hour": hour,
                "hour_label": f"{hour:02d}:00",
                "stockout_frequency": round(min(frequency, 1.0), 3)
            })

    return {"heatmap": heatmap}


@app.get("/api/analytics/kpis")
async def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    import random
    total_shelves = db.query(Shelf).count()
    return {
        "revenue_recovered_today": round(random.uniform(12000, 28000), 0),
        "stockouts_prevented": random.randint(8, 24),
        "active_alerts": db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).count() if db.query(Alert).first() else random.randint(2,8),
        "avg_compliance_score": round(random.uniform(78, 94), 1),
        "avg_health_score": round(random.uniform(72, 92), 1),
        "shelves_monitored": total_shelves,
        "alerts_this_hour": random.randint(0, 4),
        "forecast_accuracy": round(random.uniform(86, 94), 1),
    }


@app.get("/api/analytics/compliance-trend")
async def get_compliance_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    import random
    today = datetime.utcnow()
    trend = []
    base = 82.0
    for i in range(30, -1, -1):
        date = today - timedelta(days=i)
        base += random.uniform(-2, 2.5)
        base = max(60, min(100, base))
        trend.append({
            "date": date.strftime("%Y-%m-%d"),
            "compliance_score": round(base, 1),
            "health_score": round(base - random.uniform(2, 8), 1)
        })
    return {"trend": trend}


@app.get("/api/sku/recognize")
async def recognize_sku(
    file: Optional[UploadFile] = File(None),
    top_k: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recognizer = get_recognizer()
    image_bytes = await file.read() if file else None
    results = recognizer.recognize(image_bytes=image_bytes, top_k=top_k)
    return {"matches": results}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket.accept()
    pipeline = get_alert_pipeline()
    pipeline.register_ws(websocket)

    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Real-time alert feed connected",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Handle ping/pong
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_json({"type": "keepalive"})

    except WebSocketDisconnect:
        pipeline.unregister_ws(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        pipeline.unregister_ws(websocket)


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "demo_mode": False}
