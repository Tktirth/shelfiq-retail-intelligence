"""
Database seeder to populate realistic mock data for 100% production simulation.
"""
import sys
import traceback
from datetime import datetime
from database import SessionLocal, engine
from models import db_models
from models.db_models import (
    Base, Store, Aisle, Shelf, Product, Planogram, PlanogramItem,
    Alert, AlertType, AlertPriority, AlertStatus, User, UserRole
)
from auth.security import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    try:
        # Check if already fully seeded
        existing_store = db.query(Store).first()
        if existing_store:
            print(f"Database already fully seeded. Found store: {existing_store.name}")
            return True

        print("Seeding database...")

        # 1. Users — only seed if they don't exist
        existing_user = db.query(User).filter(User.email == "admin@shelfiq.com").first()
        if not existing_user:
            admin = User(
                email="admin@shelfiq.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                role=UserRole.ADMIN,
                is_active=True
            )
            manager = User(
                email="manager@shelfiq.com",
                hashed_password=get_password_hash("manager123"),
                full_name="Store Manager",
                role=UserRole.STORE_MANAGER,
                is_active=True
            )
            db.add(admin)
            db.add(manager)
            db.commit()
            print("  ✅ Users seeded (admin@shelfiq.com / manager@shelfiq.com)")
        else:
            print("  ✅ Users already exist, skipping user seeding.")

        # 2. Store
        store = Store(
            name="SuperMart Ahmedabad — SG Highway",
            location="602 SG Highway, Ahmedabad 380015",
            floor_plan={}
        )
        db.add(store)
        db.commit()
        db.refresh(store)
        print(f"  ✅ Store seeded: {store.name}")

        # 3. Aisles
        aisle_a = Aisle(store_id=store.id, name="A", category="Beverages")
        aisle_b = Aisle(store_id=store.id, name="B", category="Snacks")
        aisle_c = Aisle(store_id=store.id, name="C", category="Dairy")
        aisle_d = Aisle(store_id=store.id, name="D", category="Grains")
        db.add_all([aisle_a, aisle_b, aisle_c, aisle_d])
        db.commit()
        print("  ✅ Aisles seeded")

        # 4. Products
        products_data = [
            {"sku": "BEV-001", "name": "Coca-Cola 330ml", "brand": "Coca-Cola", "category": "Beverages", "unit_price": 45.0},
            {"sku": "BEV-002", "name": "Pepsi 330ml", "brand": "PepsiCo", "category": "Beverages", "unit_price": 42.0},
            {"sku": "BEV-003", "name": "Sprite 330ml", "brand": "Coca-Cola", "category": "Beverages", "unit_price": 40.0},
            {"sku": "BEV-004", "name": "Fanta Orange 330ml", "brand": "Coca-Cola", "category": "Beverages", "unit_price": 40.0},
            {"sku": "BEV-005", "name": "Mountain Dew 330ml", "brand": "PepsiCo", "category": "Beverages", "unit_price": 38.0},
            {"sku": "SNK-001", "name": "Lay's Classic 200g", "brand": "PepsiCo", "category": "Snacks", "unit_price": 30.0},
            {"sku": "SNK-002", "name": "Pringles Original 165g", "brand": "Kellogg's", "category": "Snacks", "unit_price": 85.0},
            {"sku": "SNK-003", "name": "Doritos Nacho 150g", "brand": "PepsiCo", "category": "Snacks", "unit_price": 35.0},
            {"sku": "DAI-001", "name": "Amul Full Cream Milk 1L", "brand": "Amul", "category": "Dairy", "unit_price": 62.0},
            {"sku": "DAI-002", "name": "Nestle Yogurt 400g", "brand": "Nestle", "category": "Dairy", "unit_price": 90.0},
            {"sku": "DAI-003", "name": "Mother Dairy Paneer 200g", "brand": "Mother Dairy", "category": "Dairy", "unit_price": 95.0},
            {"sku": "GRN-001", "name": "Basmati Rice 5kg", "brand": "India Gate", "category": "Grains", "unit_price": 450.0},
            {"sku": "GRN-002", "name": "Toor Dal 1kg", "brand": "Fortune", "category": "Grains", "unit_price": 120.0},
            {"sku": "GRN-003", "name": "Wheat Flour 5kg", "brand": "Aashirvaad", "category": "Grains", "unit_price": 300.0},
        ]

        products = {}
        for p in products_data:
            prod = Product(**p)
            db.add(prod)
            products[p["sku"]] = prod
        db.commit()
        print(f"  ✅ {len(products)} Products seeded")

        # 5. Planograms & Items
        p_bev = Planogram(name="Beverages Aisle Planogram", aisle_category="Beverages", spec={"id": 1, "sections": []})
        p_snk = Planogram(name="Snacks Aisle Planogram", aisle_category="Snacks", spec={"id": 2, "sections": []})
        p_dai = Planogram(name="Dairy Section Planogram", aisle_category="Dairy", spec={"id": 3, "sections": []})
        db.add_all([p_bev, p_snk, p_dai])
        db.commit()

        db.add(PlanogramItem(planogram_id=p_bev.id, product_id=products["BEV-001"].id, position_x=0.05, position_y=0.5, facings=4, expected_price=45.0))
        db.add(PlanogramItem(planogram_id=p_bev.id, product_id=products["BEV-002"].id, position_x=0.15, position_y=0.5, facings=3, expected_price=42.0))
        db.add(PlanogramItem(planogram_id=p_snk.id, product_id=products["SNK-001"].id, position_x=0.1, position_y=0.5, facings=4, expected_price=30.0))
        db.add(PlanogramItem(planogram_id=p_dai.id, product_id=products["DAI-001"].id, position_x=0.1, position_y=0.5, facings=6, expected_price=62.0))
        db.commit()
        print("  ✅ Planograms seeded")

        # 6. Shelves
        dem_shelves = [
            (aisle_a, "Aisle A — Shelf 1", 1, p_bev.id), (aisle_a, "Aisle A — Shelf 2", 2, p_bev.id), (aisle_a, "Aisle A — Shelf 3", 3, p_bev.id),
            (aisle_b, "Aisle B — Shelf 1", 1, p_snk.id), (aisle_b, "Aisle B — Shelf 2", 2, p_snk.id), (aisle_b, "Aisle B — Shelf 3", 3, p_snk.id),
            (aisle_c, "Aisle C — Shelf 1", 1, p_dai.id), (aisle_c, "Aisle C — Shelf 2", 2, p_dai.id),
            (aisle_d, "Aisle D — Shelf 1", 1, None), (aisle_d, "Aisle D — Shelf 2", 2, None),
        ]

        for aisle, name, lvl, p_id in dem_shelves:
            db.add(Shelf(store_id=store.id, aisle_id=aisle.id, name=name, level=lvl, planogram_id=p_id))
        db.commit()
        print("  ✅ Shelves seeded")

        # 7. Demo Alerts — using correct 'suggested_action' column name
        alert1 = Alert(
            type=AlertType.STOCKOUT, priority=AlertPriority.CRITICAL,
            title="STOCKOUT: Coca-Cola 330ml — Aisle A", message="Empty shelf detected",
            suggested_action="Restock immediately from warehouse",
            revenue_impact=450.0, status=AlertStatus.ACTIVE
        )
        alert2 = Alert(
            type=AlertType.LOW_STOCK, priority=AlertPriority.HIGH,
            title="LOW STOCK: Lay's Classic 200g — Aisle C", message="Only 2 units remaining",
            suggested_action="Refill from backstock",
            revenue_impact=280.0, status=AlertStatus.ACTIVE
        )
        alert3 = Alert(
            type=AlertType.PLANOGRAM_VIOLATION, priority=AlertPriority.MEDIUM,
            title="Planogram Violation — Beverages Section", message="Misplaced products detected",
            suggested_action="Rearrange to match planogram",
            revenue_impact=150.0, status=AlertStatus.ACTIVE
        )
        db.add_all([alert1, alert2, alert3])
        db.commit()
        print("  ✅ Alerts seeded")

        print("\n🎉 Database seeded successfully!")
        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding database: {e}")
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = seed_data()
    sys.exit(0 if success else 1)
