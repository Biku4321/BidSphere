from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class FraudAnalyzeRequest(BaseModel):
    user_id: str
    auction_id: str
    bid_amount: float
    current_price: float
    recent_bid_count: int = 0
    time_remaining: float = 3600
    bid_increment: float = 10
    total_auction_bids: int = 0


class FraudAnalyzeResponse(BaseModel):
    risk_score: float
    risk_level: str
    flags: list
    recommendation: str


def analyze_fraud(req: FraudAnalyzeRequest) -> dict:
    flags = []
    score = 0.0

    # Signal 1: Rapid successive bids
    if req.recent_bid_count >= 5:
        score += 40
        flags.append("rapid_bidding")
    elif req.recent_bid_count >= 3:
        score += 20
        flags.append("frequent_bidding")

    # Signal 2: Minimal increment
    if req.current_price > 0:
        increment_ratio = (req.bid_amount - req.current_price) / req.current_price
        if 0 < increment_ratio < 0.005:
            score += 25
            flags.append("minimal_increment_bid")
        elif 0 < increment_ratio < 0.01:
            score += 10

    # Signal 3: Last second pattern
    if req.time_remaining < 10 and req.recent_bid_count >= 2:
        score += 30
        flags.append("last_second_bot_pattern")
    elif req.time_remaining < 30 and req.recent_bid_count >= 3:
        score += 15

    # Signal 4: Price spike
    if req.current_price > 0:
        jump_ratio = req.bid_amount / req.current_price
        if jump_ratio > 3.0:
            score += 20
            flags.append("price_spike_manipulation")

    score = min(100, score)

    if score >= 70:
        risk_level     = "high"
        recommendation = "Flag for admin review. Consider temporary bid hold."
    elif score >= 40:
        risk_level     = "medium"
        recommendation = "Monitor user activity. Warn if pattern continues."
    else:
        risk_level     = "low"
        recommendation = "Normal bidding behavior detected."

    return {
        "risk_score":     round(score, 1),
        "risk_level":     risk_level,
        "flags":          flags,
        "recommendation": recommendation,
    }


@router.post("/analyze", response_model=FraudAnalyzeResponse)
def analyze(req: FraudAnalyzeRequest):
    return analyze_fraud(req)


@router.post("/batch-analyze")
def batch_analyze(requests: List[FraudAnalyzeRequest]):
    return [analyze_fraud(r) for r in requests]