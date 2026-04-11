"""
Computer Vision Engine — Shelf Analysis
Runs YOLOv8 bounding box inference purely without demo mode synthetic data.
"""
import os
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np
import cv2
# Production dependencies explicitly imported without error fallbacks
from ultralytics import YOLO
import torch


@dataclass
class DetectedProduct:
    sku: str
    name: str
    confidence: float
    bbox: List[float]         # [x1, y1, x2, y2] normalized
    stock_level: str          # full, low, empty
    facings: int
    position_x: float
    position_y: float


@dataclass
class ShelfAnalysisResult:
    shelf_id: int
    timestamp: float
    detected_products: List[DetectedProduct]
    stock_summary: Dict[str, int]
    health_score: float
    compliance_score: float
    violations: List[Dict[str, Any]]
    processing_time_ms: float


class ShelfDetector:
    """
    Main shelf analysis engine.
    Runs YOLOv8 real inference on actual images. No mocking.
    """

    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        """Loads and enforces real YOLO model for SKU-110K"""
        model_path = os.getenv("SKU_MODEL_PATH", "backend/yolov8m_sku_full.pt")
        
        # Hard halt if the model cannot be found
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}. Real inference cannot start.")
            
        self.model = YOLO(model_path)
        print(f"[CV Engine] YOLOv8 Loaded for production inference: {model_path}")

    def analyze_shelf(
        self,
        shelf_id: int,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        planogram: Optional[Dict] = None
    ) -> ShelfAnalysisResult:
        """
        Analyze a shelf image and return true detection results.
        Raises an error if image data is completely missing.
        """
        start_time = time.time()
        
        if image_path is None and image_bytes is None:
            raise ValueError("No image provided for analysis.")

        if image_bytes:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            img = cv2.imread(image_path)
            
        if img is None:
            raise ValueError("Failed to decode image.")

        # Our yolov8m_sku_full model operates optimally with SKU-110K style defaults 
        conf_thresh = 0.25
        iou_thresh = 0.45
        
        results = self.model(img, conf=conf_thresh, iou=iou_thresh)
        detected = []
        stock_counts = {"full": 0, "low": 0, "empty": 0}

        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxyn[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id] # Should typically map to 'object'

                # Estimate stock level from bbox area (proxy for facings)
                area = (x2 - x1) * (y2 - y1)
                stock = "full" if area > 0.05 else "low" if area > 0.02 else "empty"
                stock_counts[stock] += 1

                # Uses generic classification pending secondary CLIP/Resnet integration
                sku_val = "SKU-PENDING"
                name_val = "Product"

                detected.append(DetectedProduct(
                    sku=sku_val,
                    name=name_val,
                    confidence=conf,
                    bbox=[x1, y1, x2, y2],
                    stock_level=stock,
                    facings=max(1, int(area * 20)),
                    position_x=round((x1 + x2) / 2, 3),
                    position_y=round((y1 + y2) / 2, 3)
                ))

        total = max(len(detected), 1)
        # Calculate health score safely
        health_score = ((stock_counts["full"] + stock_counts["low"] * 0.5) / total) * 100

        result = ShelfAnalysisResult(
            shelf_id=shelf_id,
            timestamp=time.time(),
            detected_products=detected,
            stock_summary=stock_counts,
            health_score=round(health_score, 1),
            compliance_score=85.0,  # Placeholder until planogram engine runs
            violations=[],
            processing_time_ms=0
        )

        result.processing_time_ms = (time.time() - start_time) * 1000
        return result


# Singleton detector instance
_detector: Optional[ShelfDetector] = None

def get_detector() -> ShelfDetector:
    global _detector
    if _detector is None:
        _detector = ShelfDetector()
    return _detector
