from worker import celery_app
from cv_engine.detector import get_detector
import base64
import json
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.cv_tasks.analyze_shelf_image")
def analyze_shelf_image_task(shelf_id: int, image_bytes_b64: str = None, planogram: dict = None):
    """
    Background Task to analyze shelf image.
    Sends output via WebSocket / Redis pipeline automatically inside the analyzer.
    """
    logger.info(f"Starting async computer vision analysis for shelf {shelf_id}")
    try:
        detector = get_detector()
        
        image_bytes = None
        if image_bytes_b64:
            image_bytes = base64.b64decode(image_bytes_b64)
            
        analysis_result = detector.analyze_shelf(
            shelf_id=shelf_id,
            image_bytes=image_bytes,
            planogram=planogram
        )
        
        # Depending on how the alert_pipeline is structured, 
        # we would dispatch the updated shelf status to WebSockets here.
        logger.info(f"Analysis completed successfully for shelf {shelf_id}. Score: {analysis_result.health_score}")
        
        # Serialize result for Celery backend
        return {
            "shelf_id": analysis_result.shelf_id,
            "health_score": analysis_result.health_score,
            "stock_summary": analysis_result.stock_summary,
            "violations_count": len(analysis_result.violations)
        }
    except Exception as e:
        logger.error(f"Error during CV analysis for shelf {shelf_id}: {str(e)}")
        raise e
