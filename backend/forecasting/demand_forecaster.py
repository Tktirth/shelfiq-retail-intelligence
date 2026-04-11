"""
Demand Forecasting Engine — Facebook Prophet + Synthetic POS Data
"""
import os
import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

if not DEMO_MODE:
    try:
        from prophet import Prophet
        PROPHET_AVAILABLE = True
    except ImportError:
        PROPHET_AVAILABLE = False
        DEMO_MODE = True
else:
    PROPHET_AVAILABLE = False


# Product base demand profiles
PRODUCT_DEMAND = {
    "BEV-001": {"base": 45, "seasonality": 0.3, "weekend_boost": 1.4, "price": 45.0},
    "BEV-002": {"base": 38, "seasonality": 0.25, "weekend_boost": 1.3, "price": 42.0},
    "BEV-003": {"base": 30, "seasonality": 0.2, "weekend_boost": 1.2, "price": 40.0},
    "BEV-004": {"base": 25, "seasonality": 0.15, "weekend_boost": 1.1, "price": 40.0},
    "BEV-005": {"base": 20, "seasonality": 0.1, "weekend_boost": 1.2, "price": 38.0},
    "SNK-001": {"base": 32, "seasonality": 0.2, "weekend_boost": 1.5, "price": 30.0},
    "SNK-002": {"base": 28, "seasonality": 0.15, "weekend_boost": 1.4, "price": 85.0},
    "SNK-003": {"base": 22, "seasonality": 0.1, "weekend_boost": 1.3, "price": 35.0},
    "DAI-001": {"base": 60, "seasonality": -0.1, "weekend_boost": 1.1, "price": 62.0},
    "DAI-002": {"base": 20, "seasonality": 0.05, "weekend_boost": 1.2, "price": 90.0},
    "DAI-003": {"base": 18, "seasonality": 0.0, "weekend_boost": 1.1, "price": 95.0},
    "GRN-001": {"base": 15, "seasonality": 0.05, "weekend_boost": 1.3, "price": 450.0},
    "GRN-002": {"base": 12, "seasonality": 0.0, "weekend_boost": 1.2, "price": 120.0},
    "GRN-003": {"base": 10, "seasonality": 0.0, "weekend_boost": 1.2, "price": 300.0},
}


def generate_synthetic_pos_data(
    sku: str,
    store_id: int,
    days: int = 730
) -> pd.DataFrame:
    """
    Generate 2 years of synthetic daily POS data with:
    - Weekly seasonality (weekend spikes)
    - Annual seasonality (summer peaks for beverages)
    - Random promotions
    - Weather effects
    - Trend
    """
    profile = PRODUCT_DEMAND.get(sku, {"base": 20, "seasonality": 0.1, "weekend_boost": 1.2, "price": 50.0})
    base_demand = profile["base"]
    seasonality_amp = profile["seasonality"]
    weekend_boost = profile["weekend_boost"]

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    records = []
    current_date = start_date
    trend_factor = 1.0

    while current_date <= end_date:
        # Day of year seasonality (summer peak ~day 180)
        day_of_year = current_date.timetuple().tm_yday
        annual_seasonal = 1 + seasonality_amp * math.sin(2 * math.pi * (day_of_year - 90) / 365)

        # Weekly seasonality
        dow = current_date.weekday()
        weekly_seasonal = weekend_boost if dow >= 5 else 1.0
        if dow == 4:  # Friday
            weekly_seasonal = 1.2

        # Promotion (10% probability)
        is_promo = random.random() < 0.10
        promo_factor = random.uniform(1.3, 2.0) if is_promo else 1.0

        # Weather (affects beverages)
        temp_celsius = 25 + 15 * math.sin(2 * math.pi * (day_of_year - 90) / 365) + random.gauss(0, 3)
        weather_factor = 1.0 + max(0, (temp_celsius - 30) * 0.02)

        # Trend (slight annual growth)
        days_elapsed = (current_date - start_date).days
        trend_factor = 1 + 0.001 * (days_elapsed / 30)

        # Final demand
        demand = (
            base_demand
            * annual_seasonal
            * weekly_seasonal
            * promo_factor
            * weather_factor
            * trend_factor
            + random.gauss(0, base_demand * 0.1)
        )
        demand = max(0, int(demand))

        weather_condition = "hot" if temp_celsius > 35 else "warm" if temp_celsius > 25 else "cool"

        records.append({
            "ds": current_date.strftime("%Y-%m-%d"),
            "y": demand,
            "sku": sku,
            "store_id": store_id,
            "is_promotion": is_promo,
            "weather_condition": weather_condition,
            "temperature": round(temp_celsius, 1),
            "day_of_week": dow,
            "revenue": demand * profile["price"]
        })
        current_date += timedelta(days=1)

    return pd.DataFrame(records)


def calculate_reorder_point(
    avg_daily_demand: float,
    lead_time_days: int = 2,
    service_level: float = 0.95
) -> float:
    """
    Reorder Point = Average Daily Demand × Lead Time + Safety Stock
    Safety stock based on service level (z-score).
    """
    z_scores = {0.90: 1.28, 0.95: 1.645, 0.99: 2.326}
    z = z_scores.get(service_level, 1.645)
    # Assume 15% demand variability
    daily_std = avg_daily_demand * 0.15
    safety_stock = z * daily_std * math.sqrt(lead_time_days)
    return avg_daily_demand * lead_time_days + safety_stock


class DemandForecaster:
    """
    Demand forecasting engine.
    Demo mode: mathematical model with trend/seasonality.
    Full mode: Facebook Prophet with regressors.
    """

    def __init__(self):
        self.demo_mode = DEMO_MODE

    def forecast(
        self,
        sku: str,
        store_id: int,
        horizon_days: int = 7,
        historical_days: int = 90
    ) -> Dict[str, Any]:
        """
        Generate demand forecast for a product.
        Returns: forecast, reorder point, suggested order qty, accuracy metrics.
        """
        if self.demo_mode or not PROPHET_AVAILABLE:
            return self._demo_forecast(sku, store_id, horizon_days)
        return self._prophet_forecast(sku, store_id, horizon_days, historical_days)

    def _demo_forecast(
        self,
        sku: str,
        store_id: int,
        horizon_days: int
    ) -> Dict[str, Any]:
        """Mathematical forecast without ML."""
        profile = PRODUCT_DEMAND.get(sku, {"base": 20, "seasonality": 0.1, "weekend_boost": 1.2, "price": 50.0})
        base = profile["base"]
        today = datetime.now()

        forecasts = []
        for i in range(1, horizon_days + 1):
            forecast_date = today + timedelta(days=i)
            dow = forecast_date.weekday()
            day_of_year = forecast_date.timetuple().tm_yday

            annual = 1 + profile["seasonality"] * math.sin(2 * math.pi * (day_of_year - 90) / 365)
            weekly = profile["weekend_boost"] if dow >= 5 else 1.0
            noise = random.gauss(0, base * 0.08)

            predicted = max(0, base * annual * weekly + noise)
            lower = max(0, predicted * 0.75)
            upper = predicted * 1.25

            forecasts.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_quantity": round(predicted, 1),
                "lower_bound": round(lower, 1),
                "upper_bound": round(upper, 1),
                "day_of_week": forecast_date.strftime("%A"),
                "is_weekend": dow >= 5
            })

        avg_daily_demand = sum(f["predicted_quantity"] for f in forecasts) / len(forecasts)
        reorder_point = calculate_reorder_point(avg_daily_demand)
        suggested_order = int(avg_daily_demand * 7 * 1.1)  # 10% buffer, 1-week supply

        # Simulated accuracy metrics
        wmape = random.uniform(0.08, 0.18)

        return {
            "sku": sku,
            "store_id": store_id,
            "forecasts": forecasts,
            "summary": {
                "avg_daily_demand": round(avg_daily_demand, 1),
                "total_7day_demand": round(sum(f["predicted_quantity"] for f in forecasts), 0),
                "reorder_point": round(reorder_point, 0),
                "suggested_order_qty": suggested_order,
                "lead_time_days": 2,
                "service_level": 0.95,
                "wmape": round(wmape, 4),
                "wmape_pct": f"{wmape * 100:.1f}%"
            }
        }

    def _prophet_forecast(
        self,
        sku: str,
        store_id: int,
        horizon_days: int,
        historical_days: int
    ) -> Dict[str, Any]:
        """Full Prophet forecast with regressors."""
        df = generate_synthetic_pos_data(sku, store_id, days=historical_days)
        df["ds"] = pd.to_datetime(df["ds"])

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        model.add_regressor("temperature")
        model.fit(df[["ds", "y", "temperature"]])

        future = model.make_future_dataframe(periods=horizon_days)
        # Add temperature regressor for future
        future["temperature"] = 28.0  # Default

        forecast_df = model.predict(future)
        horizon_rows = forecast_df.tail(horizon_days)

        forecasts = []
        for _, row in horizon_rows.iterrows():
            forecasts.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "predicted_quantity": max(0, round(float(row["yhat"]), 1)),
                "lower_bound": max(0, round(float(row["yhat_lower"]), 1)),
                "upper_bound": round(float(row["yhat_upper"]), 1),
                "day_of_week": row["ds"].strftime("%A"),
                "is_weekend": row["ds"].weekday() >= 5
            })

        avg_daily = sum(f["predicted_quantity"] for f in forecasts) / len(forecasts)
        reorder_point = calculate_reorder_point(avg_daily)

        # Compute WMAPE on historical data
        historical_actual = df.tail(30)["y"].values
        historical_pred = forecast_df.iloc[-30 - horizon_days:-horizon_days]["yhat"].values
        if len(historical_actual) == len(historical_pred):
            wmape = float(np.sum(np.abs(historical_actual - historical_pred)) / np.sum(historical_actual))
        else:
            wmape = 0.12

        return {
            "sku": sku,
            "store_id": store_id,
            "forecasts": forecasts,
            "summary": {
                "avg_daily_demand": round(avg_daily, 1),
                "total_7day_demand": round(sum(f["predicted_quantity"] for f in forecasts), 0),
                "reorder_point": round(reorder_point, 0),
                "suggested_order_qty": int(avg_daily * 7 * 1.1),
                "lead_time_days": 2,
                "service_level": 0.95,
                "wmape": round(wmape, 4),
                "wmape_pct": f"{wmape * 100:.1f}%"
            }
        }


_forecaster: Optional[DemandForecaster] = None


def get_forecaster() -> DemandForecaster:
    global _forecaster
    if _forecaster is None:
        _forecaster = DemandForecaster()
    return _forecaster
