import sys
import os
import random
from sqlalchemy.orm import Session
from datetime import datetime

# Add backend directory to sys.path so we can import from top level
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models.db_models import Store, Aisle, Shelf, Product, Base
from passlib.context import CryptContext
from models.db_models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_database():
    db: Session = SessionLocal()
    
    # Create Default Admin
    if not db.query(User).filter(User.email == "admin@shelfiq.com").first():
        admin = User(
            email="admin@shelfiq.com",
            hashed_password=get_password_hash("admin123"),
            full_name="System Admin",
            role=UserRole.ADMIN
        )
        db.add(admin)

    # Create Store
    store = db.query(Store).filter(Store.name == "SuperMart Ahmedabad — SG Highway").first()
    if not store:
        store = Store(
            name="SuperMart Ahmedabad — SG Highway",
            location="602 SG Highway, Ahmedabad 380015",
            floor_plan={"layout": "SVG based structure"}
        )
        db.add(store)
        db.commit()
        db.refresh(store)

    # Create Aisles
    aisle_map = {}
    for a_name, a_cat in [("A", "Beverages"), ("B", "Snacks"), ("C", "Dairy"), ("D", "Grains")]:
        aisle = db.query(Aisle).filter(Aisle.name == a_name, Aisle.store_id == store.id).first()
        if not aisle:
            aisle = Aisle(store_id=store.id, name=a_name, category=a_cat)
            db.add(aisle)
            db.commit()
            db.refresh(aisle)
        aisle_map[a_name] = aisle

    # Create Products
    products = [
        {"sku": "BEV-001", "name": "Coca-Cola 330ml", "price": 45.0, "cat": "Beverages"},
        {"sku": "BEV-002", "name": "Pepsi 330ml", "price": 42.0, "cat": "Beverages"},
        {"sku": "SNK-001", "name": "Lay's Classic 200g", "price": 30.0, "cat": "Snacks"},
        {"sku": "DAI-001", "name": "Amul Full Cream Milk 1L", "price": 62.0, "cat": "Dairy"}
    ]
    for p in products:
        prod = db.query(Product).filter(Product.sku == p["sku"]).first()
        if not prod:
            db.add(Product(sku=p["sku"], name=p["name"], unit_price=p["price"], category=p["cat"]))
    
    # Create Shelves
    if db.query(Shelf).count() == 0:
        for i in range(1, 4):
            db.add(Shelf(store_id=store.id, aisle_id=aisle_map["A"].id, name=f"Aisle A — Shelf {i}", level=i))
            db.add(Shelf(store_id=store.id, aisle_id=aisle_map["B"].id, name=f"Aisle B — Shelf {i}", level=i))
    
    db.commit()
    print("Database seeding completed.")
    db.close()

if __name__ == "__main__":
    print("Seeding database...")
    seed_database()
