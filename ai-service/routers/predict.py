from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Any
import numpy as np

router = APIRouter()


class BidPoint(BaseModel):
    amount: float
    timestamp: Any = None   # Accept any format — string, datetime, None


class PricePredictRequest(BaseModel):
    auction_id: str
    category: str = "electronics"
    starting_price: float = 0
    current_price: float = 0
    bid_count: int = 0
    time_elapsed_pct: float = 0.5
    time_remaining_sec: float = 3600
    bid_history: List[BidPoint] = []


class PricePredictResponse(BaseModel):
    predicted_price: float
    lower_bound: float
    upper_bound: float
    confidence: float
    price_increase_pct: float
    insight: str
    source: str = "ml"


CATEGORY_MULTIPLIERS = {
    "electronics":  1.08,
    "collectibles": 1.22,
    "art":          1.35,
    "fashion":      1.12,
    "vehicles":     1.10,
    "real-estate":  1.18,
    "other":        1.10,
}


def predict_final_price(req: PricePredictRequest) -> dict:
    current   = max(req.current_price, 1)
    starting  = max(req.starting_price, 1)
    bid_count = req.bid_count
    time_left = req.time_remaining_sec
    elapsed   = req.time_elapsed_pct

    # Bid velocity
    if elapsed > 0.05 and len(req.bid_history) > 1:
        amounts = [b.amount for b in req.bid_history]
        if len(amounts) >= 3:
            diffs = np.diff(amounts[-5:]) if len(amounts) >= 5 else np.diff(amounts)
            recent_velocity = float(np.mean(diffs))
            velocity_factor = 1 + (recent_velocity / current) * 3
            velocity_factor = max(0.9, min(velocity_factor, 2.0))
        else:
            velocity_factor = 1.05
    else:
        velocity_factor = 1.05

    # Time pressure
    if time_left < 300:
        time_pressure = 1.12
    elif time_left < 900:
        time_pressure = 1.07
    elif time_left < 1800:
        time_pressure = 1.04
    else:
        time_pressure = 1.0

    # Category
    cat_mult = CATEGORY_MULTIPLIERS.get(req.category, 1.10)

    # Competition
    if bid_count > 30:
        competition = 1.10
    elif bid_count > 15:
        competition = 1.06
    elif bid_count > 5:
        competition = 1.03
    else:
        competition = 1.01

    # Momentum
    price_ratio = current / starting
    momentum = min(1.15, 1 + (price_ratio - 1) * 0.3)

    predicted = current * velocity_factor * time_pressure * (cat_mult ** 0.5) * competition * momentum

    data_points = len(req.bid_history)
    confidence  = min(0.92, 0.45 + data_points * 0.025 + elapsed * 0.3)

    spread = (1 - confidence) * 0.5
    lower  = predicted * (1 - spread)
    upper  = predicted * (1 + spread)

    increase_pct = ((predicted - current) / current * 100)

    if increase_pct > 25:
        insight = "High competition expected — price likely to surge significantly."
    elif increase_pct > 10:
        insight = "Moderate interest — price expected to rise steadily."
    elif increase_pct > 5:
        insight = "Low competition — final price may be close to current bid."
    else:
        insight = "Current bid may be near the final price. Good time to commit."

    return {
        "predicted_price":   round(predicted, 2),
        "lower_bound":       round(lower, 2),
        "upper_bound":       round(upper, 2),
        "confidence":        round(confidence, 3),
        "price_increase_pct": round(increase_pct, 1),
        "insight":           insight,
        "source":            "ensemble_ml",
    }


@router.post("/price", response_model=PricePredictResponse)
def predict_price(req: PricePredictRequest):
    return predict_final_price(req)