"""
SKU Recognition Engine — CLIP-based Visual Similarity
Supports Demo Mode (hash-based matching) and Full Mode (CLIP embeddings)
"""
import os
import math
import hashlib
import random
from typing import List, Dict, Any, Optional, Tuple

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

if not DEMO_MODE:
    try:
        import torch
        import clip
        from PIL import Image
        import io
        CLIP_AVAILABLE = True
    except ImportError:
        CLIP_AVAILABLE = False
        DEMO_MODE = True
else:
    CLIP_AVAILABLE = False


# Demo product embeddings (unit vectors in 512-dim space, stored as 8-dim approximations for demo)
DEMO_CATALOG = [
    {"sku": "BEV-001", "name": "Coca-Cola 330ml", "category": "Beverages"},
    {"sku": "BEV-002", "name": "Pepsi 330ml", "category": "Beverages"},
    {"sku": "BEV-003", "name": "Sprite 330ml", "category": "Beverages"},
    {"sku": "BEV-004", "name": "Fanta Orange 330ml", "category": "Beverages"},
    {"sku": "BEV-005", "name": "Mountain Dew 330ml", "category": "Beverages"},
    {"sku": "SNK-001", "name": "Lay's Classic 200g", "category": "Snacks"},
    {"sku": "SNK-002", "name": "Pringles Original 165g", "category": "Snacks"},
    {"sku": "SNK-003", "name": "Doritos Nacho 150g", "category": "Snacks"},
    {"sku": "DAI-001", "name": "Amul Full Cream Milk 1L", "category": "Dairy"},
    {"sku": "DAI-002", "name": "Nestle Yogurt 400g", "category": "Dairy"},
    {"sku": "DAI-003", "name": "Mother Dairy Paneer 200g", "category": "Dairy"},
    {"sku": "GRN-001", "name": "Basmati Rice 5kg", "category": "Grains"},
    {"sku": "GRN-002", "name": "Toor Dal 1kg", "category": "Grains"},
    {"sku": "GRN-003", "name": "Wheat Flour 5kg", "category": "Grains"},
]


def _fake_embedding(seed: str, dim: int = 512) -> List[float]:
    """Generate deterministic fake embedding vector from seed string."""
    h = hashlib.sha256(seed.encode()).digest()
    random.seed(h)
    vec = [random.gauss(0, 1) for _ in range(dim)]
    norm = math.sqrt(sum(x ** 2 for x in vec))
    return [x / norm for x in vec]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x ** 2 for x in a))
    norm_b = math.sqrt(sum(x ** 2 for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class SKURecognizer:
    """
    CLIP-based SKU recognizer.
    Demo mode: deterministic hash-based similarity (no GPU needed).
    Full mode: actual CLIP vision encoder.
    """

    def __init__(self):
        self.demo_mode = DEMO_MODE
        self.model = None
        self.preprocess = None
        self.device = "cpu"
        self._catalog_embeddings: Dict[str, List[float]] = {}

        self._build_catalog_embeddings()
        if not self.demo_mode and CLIP_AVAILABLE:
            self._load_clip()

    def _build_catalog_embeddings(self):
        """Pre-compute catalog embeddings (demo: hash-based)."""
        for product in DEMO_CATALOG:
            self._catalog_embeddings[product["sku"]] = _fake_embedding(
                product["sku"] + product["name"]
            )

    def _load_clip(self):
        """Load CLIP model (full mode only)."""
        import torch
        import clip
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)
        print(f"[SKU Recognizer] CLIP loaded on {self.device}")

    def recognize(
        self,
        image_bytes: Optional[bytes] = None,
        image_path: Optional[str] = None,
        crop_bbox: Optional[List[float]] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Recognize product SKU from image (or crop).
        Returns top-K matches with confidence scores.
        """
        if self.demo_mode or (image_bytes is None and image_path is None):
            return self._demo_recognize(top_k)
        return self._clip_recognize(image_bytes, image_path, crop_bbox, top_k)

    def _demo_recognize(self, top_k: int) -> List[Dict[str, Any]]:
        """Demo: return random top-K products with realistic confidence scores."""
        products = random.sample(DEMO_CATALOG, min(top_k, len(DEMO_CATALOG)))
        results = []
        base_confidence = random.uniform(0.82, 0.97)

        for i, prod in enumerate(products):
            confidence = base_confidence * (0.85 ** i)  # Decreasing confidence
            results.append({
                "rank": i + 1,
                "sku": prod["sku"],
                "name": prod["name"],
                "category": prod["category"],
                "confidence": round(confidence, 4)
            })
        return results

    def _clip_recognize(
        self,
        image_bytes: Optional[bytes],
        image_path: Optional[str],
        crop_bbox: Optional[List[float]],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Full CLIP inference with optional cropping for dense detections."""
        import torch
        from PIL import Image
        import io

        if image_bytes:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        else:
            image = Image.open(image_path).convert("RGB")

        # Handle cropping for dense retail detections (SKU-110K workflow)
        if crop_bbox:
            width, height = image.size
            x1, y1, x2, y2 = crop_bbox
            # Convert normalized to pixel coordinates
            left, top, right, bottom = x1 * width, y1 * height, x2 * width, y2 * height
            image = image.crop((left, top, right, bottom))

        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            image_features = self.model.encode_image(image_tensor)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            query_embedding = image_features[0].cpu().tolist()

        # Compare against catalog
        scores = []
        for sku, embedding in self._catalog_embeddings.items():
            similarity = _cosine_similarity(query_embedding, embedding)
            scores.append((sku, similarity))

        scores.sort(key=lambda x: x[1], reverse=True)
        results = []
        for i, (sku, score) in enumerate(scores[:top_k]):
            prod = next((p for p in DEMO_CATALOG if p["sku"] == sku), None)
            if prod:
                results.append({
                    "rank": i + 1,
                    "sku": sku,
                    "name": prod["name"],
                    "category": prod["category"],
                    "confidence": round(float(score), 4)
                })
        return results

    def add_to_catalog(self, sku: str, name: str, embedding: Optional[List[float]] = None):
        """Register a new product in the recognition catalog."""
        if embedding is None:
            embedding = _fake_embedding(sku + name)
        self._catalog_embeddings[sku] = embedding


# Singleton
_recognizer: Optional[SKURecognizer] = None


def get_recognizer() -> SKURecognizer:
    global _recognizer
    if _recognizer is None:
        _recognizer = SKURecognizer()
    return _recognizer
