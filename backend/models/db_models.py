"""
SQLAlchemy ORM Models for Smart Retail Shelf Intelligence
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STORE_MANAGER = "store_manager"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(300), nullable=False)
    full_name = Column(String(150))
    role = Column(SAEnum(UserRole), default=UserRole.STORE_MANAGER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StockLevel(str, enum.Enum):
    FULL = "full"
    LOW = "low"
    EMPTY = "empty"
    UNKNOWN = "unknown"


class AlertType(str, enum.Enum):
    STOCKOUT = "stockout"
    LOW_STOCK = "low_stock"
    PLANOGRAM_VIOLATION = "planogram_violation"
    PRICE_TAG_ERROR = "price_tag_error"
    UNAUTHORIZED_PRODUCT = "unauthorized_product"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class AlertPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(500))
    floor_plan = Column(JSON)  # SVG layout data
    created_at = Column(DateTime, default=datetime.utcnow)

    aisles = relationship("Aisle", back_populates="store")
    shelves = relationship("Shelf", back_populates="store")


class Aisle(Base):
    __tablename__ = "aisles"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(100))
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)

    store = relationship("Store", back_populates="aisles")
    shelves = relationship("Shelf", back_populates="aisle")


class Shelf(Base):
    __tablename__ = "shelves"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    aisle_id = Column(Integer, ForeignKey("aisles.id"), nullable=False)
    name = Column(String(100), nullable=False)
    level = Column(Integer, default=1)  # shelf level (1=bottom)
    camera_id = Column(String(50))
    planogram_id = Column(Integer, ForeignKey("planograms.id"), nullable=True)
    health_score = Column(Float, default=100.0)
    compliance_score = Column(Float, default=100.0)
    last_analyzed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="shelves")
    aisle = relationship("Aisle", back_populates="shelves")
    planogram = relationship("Planogram", back_populates="shelves")
    snapshots = relationship("ShelfSnapshot", back_populates="shelf")
    alerts = relationship("Alert", back_populates="shelf")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(300), nullable=False)
    brand = Column(String(100))
    category = Column(String(100))
    subcategory = Column(String(100))
    unit_price = Column(Float, nullable=False)
    unit_cost = Column(Float)
    image_url = Column(String(500))
    embedding = Column(JSON)  # CLIP embedding vector
    created_at = Column(DateTime, default=datetime.utcnow)

    sales_records = relationship("SalesRecord", back_populates="product")
    planogram_items = relationship("PlanogramItem", back_populates="product")


class Planogram(Base):
    __tablename__ = "planograms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    aisle_category = Column(String(100))
    spec = Column(JSON)  # Full planogram specification
    created_at = Column(DateTime, default=datetime.utcnow)

    shelves = relationship("Shelf", back_populates="planogram")
    items = relationship("PlanogramItem", back_populates="planogram")


class PlanogramItem(Base):
    __tablename__ = "planogram_items"
    id = Column(Integer, primary_key=True, index=True)
    planogram_id = Column(Integer, ForeignKey("planograms.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    facings = Column(Integer, default=1)
    expected_price = Column(Float)

    planogram = relationship("Planogram", back_populates="items")
    product = relationship("Product", back_populates="planogram_items")


class ShelfSnapshot(Base):
    __tablename__ = "shelf_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    shelf_id = Column(Integer, ForeignKey("shelves.id"), nullable=False)
    image_url = Column(String(500))
    detected_products = Column(JSON)   # List of detected products with positions
    stock_levels = Column(JSON)         # Per-product stock levels
    compliance_score = Column(Float)
    health_score = Column(Float)
    violations = Column(JSON)           # List of compliance violations
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    shelf = relationship("Shelf", back_populates="snapshots")


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    shelf_id = Column(Integer, ForeignKey("shelves.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    type = Column(SAEnum(AlertType), nullable=False)
    priority = Column(SAEnum(AlertPriority), nullable=False)
    status = Column(SAEnum(AlertStatus), default=AlertStatus.ACTIVE)
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    suggested_action = Column(Text)
    revenue_impact = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    shelf = relationship("Shelf", back_populates="alerts")


class SalesRecord(Base):
    __tablename__ = "sales_records"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    sale_date = Column(DateTime, nullable=False)
    day_of_week = Column(Integer)
    is_promotion = Column(Boolean, default=False)
    weather_condition = Column(String(50))

    product = relationship("Product", back_populates="sales_records")


class ForecastRecord(Base):
    __tablename__ = "forecast_records"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    forecast_date = Column(DateTime, nullable=False)
    predicted_quantity = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    reorder_point = Column(Float)
    suggested_order_qty = Column(Integer)
    wmape = Column(Float)
    generated_at = Column(DateTime, default=datetime.utcnow)
