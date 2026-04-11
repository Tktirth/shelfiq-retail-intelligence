"""
Planogram Compliance Engine
Compares detected shelf state against planogram specification.
"""
import json
import math
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ComplianceViolation:
    type: str          # misplaced, missing_facing, wrong_price, unauthorized
    severity: str      # high, medium, low
    product_sku: str
    product_name: str
    description: str
    expected: Optional[str] = None
    actual: Optional[str] = None
    position_x: float = 0.0
    position_y: float = 0.0
    revenue_impact: float = 0.0


@dataclass
class ComplianceReport:
    shelf_id: int
    planogram_id: int
    compliance_score: float
    health_score: float
    total_violations: int
    violations_by_severity: Dict[str, int]
    violations: List[ComplianceViolation]
    missing_products: List[str]
    unauthorized_products: List[str]
    correctly_placed: int
    total_expected: int
    facing_accuracy: float
    price_accuracy: float
    recommendations: List[str]


class PlanogramComplianceEngine:
    """
    Compares actual detected shelf state against planogram specification.

    Planogram JSON format:
    {
        "id": 1,
        "name": "Beverages Aisle A",
        "sections": [
            {
                "section_id": "A1",
                "position_x": 0.0,
                "position_y": 0.0,
                "width": 0.33,
                "products": [
                    {
                        "sku": "BEV-001",
                        "name": "Coca-Cola 330ml",
                        "expected_facings": 3,
                        "expected_price": 45.00,
                        "position_x": 0.05,
                        "position_y": 0.5
                    },
                    ...
                ]
            }
        ]
    }
    """

    REVENUE_IMPACT = {
        "BEV-001": 450.0,
        "BEV-002": 380.0,
        "BEV-003": 320.0,
        "SNK-001": 280.0,
        "SNK-002": 310.0,
        "DAI-001": 520.0,
    }

    def analyze(
        self,
        shelf_id: int,
        planogram: Dict[str, Any],
        detected_products: List[Dict[str, Any]]
    ) -> ComplianceReport:
        """
        Run compliance check and return a detailed report.
        """
        planogram_id = planogram.get("id", 0)
        expected_items = self._extract_expected_items(planogram)
        violations: List[ComplianceViolation] = []

        # Build detected lookup
        detected_map = {p["sku"]: p for p in detected_products}
        expected_skus = {item["sku"] for item in expected_items}
        detected_skus = set(detected_map.keys())

        # 1. Missing products
        missing_skus = expected_skus - detected_skus
        for sku in missing_skus:
            expected_item = next(i for i in expected_items if i["sku"] == sku)
            violations.append(ComplianceViolation(
                type="missing_product",
                severity="high",
                product_sku=sku,
                product_name=expected_item.get("name", sku),
                description=f"{expected_item.get('name', sku)} is missing from the shelf",
                expected="present",
                actual="absent",
                position_x=expected_item.get("position_x", 0),
                position_y=expected_item.get("position_y", 0),
                revenue_impact=self.REVENUE_IMPACT.get(sku, 100.0)
            ))

        # 2. Unauthorized products
        unauthorized_skus = detected_skus - expected_skus
        for sku in unauthorized_skus:
            det = detected_map[sku]
            violations.append(ComplianceViolation(
                type="unauthorized_product",
                severity="medium",
                product_sku=sku,
                product_name=det.get("name", sku),
                description=f"{det.get('name', sku)} is not in the approved planogram",
                expected="not present",
                actual="found",
                position_x=det.get("position_x", 0),
                position_y=det.get("position_y", 0),
                revenue_impact=0.0
            ))

        # 3. Facing violations for products that are present
        correctly_placed = 0
        total_facings_expected = 0
        total_facings_actual = 0
        price_correct = 0
        price_total = 0

        for expected_item in expected_items:
            sku = expected_item["sku"]
            if sku not in detected_map:
                continue

            det = detected_map[sku]
            exp_facings = expected_item.get("expected_facings", 2)
            act_facings = det.get("facings", 1)
            total_facings_expected += exp_facings
            total_facings_actual += act_facings

            # Facing violation
            if act_facings < exp_facings:
                severity = "high" if act_facings == 0 else "medium"
                violations.append(ComplianceViolation(
                    type="missing_facing",
                    severity=severity,
                    product_sku=sku,
                    product_name=expected_item.get("name", sku),
                    description=f"{expected_item.get('name', sku)}: expected {exp_facings} facings, found {act_facings}",
                    expected=str(exp_facings),
                    actual=str(act_facings),
                    position_x=det.get("position_x", 0),
                    position_y=det.get("position_y", 0),
                    revenue_impact=self.REVENUE_IMPACT.get(sku, 50.0) * 0.3
                ))

            # Position check
            exp_x = expected_item.get("position_x", 0.5)
            exp_y = expected_item.get("position_y", 0.5)
            act_x = det.get("position_x", 0.5)
            act_y = det.get("position_y", 0.5)
            dist = math.sqrt((exp_x - act_x) ** 2 + (exp_y - act_y) ** 2)

            if dist > 0.15:  # More than 15% of shelf width off
                violations.append(ComplianceViolation(
                    type="misplaced_product",
                    severity="medium",
                    product_sku=sku,
                    product_name=expected_item.get("name", sku),
                    description=f"{expected_item.get('name', sku)} is misplaced (offset {dist:.2f})",
                    expected=f"x={exp_x:.2f}, y={exp_y:.2f}",
                    actual=f"x={act_x:.2f}, y={act_y:.2f}",
                    position_x=act_x,
                    position_y=act_y,
                    revenue_impact=self.REVENUE_IMPACT.get(sku, 30.0) * 0.2
                ))
            else:
                correctly_placed += 1

            # Price check
            if expected_item.get("expected_price"):
                price_total += 1
                price_correct += 1  # Demo: assume price correct unless violation added elsewhere

        # Scoring
        total_expected = len(expected_items)
        facing_accuracy = (total_facings_actual / max(total_facings_expected, 1)) * 100
        price_accuracy = (price_correct / max(price_total, 1)) * 100

        # Compliance score: weighted sum
        presence_score = (len(detected_skus & expected_skus) / max(total_expected, 1)) * 40
        facing_score = min(facing_accuracy / 100, 1.0) * 30
        position_score = (correctly_placed / max(total_expected, 1)) * 20
        price_score = (price_accuracy / 100) * 10
        compliance_score = presence_score + facing_score + position_score + price_score

        # Health score (stock-based)
        full_count = sum(1 for d in detected_products if d.get("stock_level") == "full")
        low_count = sum(1 for d in detected_products if d.get("stock_level") == "low")
        total_detected = max(len(detected_products), 1)
        health_score = ((full_count * 1.0 + low_count * 0.5) / total_detected) * 100

        severity_counts = {"high": 0, "medium": 0, "low": 0}
        for v in violations:
            severity_counts[v.severity] = severity_counts.get(v.severity, 0) + 1

        recommendations = self._generate_recommendations(violations, missing_skus)

        return ComplianceReport(
            shelf_id=shelf_id,
            planogram_id=planogram_id,
            compliance_score=round(compliance_score, 1),
            health_score=round(health_score, 1),
            total_violations=len(violations),
            violations_by_severity=severity_counts,
            violations=[v for v in violations],
            missing_products=list(missing_skus),
            unauthorized_products=list(unauthorized_skus),
            correctly_placed=correctly_placed,
            total_expected=total_expected,
            facing_accuracy=round(facing_accuracy, 1),
            price_accuracy=round(price_accuracy, 1),
            recommendations=recommendations
        )

    def _extract_expected_items(self, planogram: Dict) -> List[Dict]:
        items = []
        for section in planogram.get("sections", []):
            for product in section.get("products", []):
                items.append(product)
        return items

    def _generate_recommendations(
        self,
        violations: List[ComplianceViolation],
        missing_skus: set
    ) -> List[str]:
        recs = []
        high_violations = [v for v in violations if v.severity == "high"]

        if missing_skus:
            skus_str = ", ".join(list(missing_skus)[:3])
            recs.append(f"Immediately restock missing products: {skus_str}")
        if any(v.type == "missing_facing" for v in high_violations):
            recs.append("Restore facings for high-revenue products to planogram specification")
        if any(v.type == "misplaced_product" for v in violations):
            recs.append("Relocate misplaced products to their designated shelf positions")
        if any(v.type == "unauthorized_product" for v in violations):
            recs.append("Remove unauthorized products and return them to storage")
        if not violations:
            recs.append("Shelf is fully compliant — no action required")

        return recs


_engine: Optional[PlanogramComplianceEngine] = None


def get_compliance_engine() -> PlanogramComplianceEngine:
    global _engine
    if _engine is None:
        _engine = PlanogramComplianceEngine()
    return _engine
