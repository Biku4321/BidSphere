from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Any

router = APIRouter()


class RecentBid(BaseModel):
    amount: float
    timestamp: Any = None   # Accept any format


class StrategyRequest(BaseModel):
    auction_id: str
    current_price: float
    starting_price: float
    bid_increment: float = 10
    bid_count: int = 0
    time_remaining_sec: float
    my_highest_bid: float = 0
    recent_bids: List[RecentBid] = []
    user_id: str = ""


class StrategyResponse(BaseModel):
    recommendation: str
    suggested_bid: Optional[float]
    max_recommended_bid: Optional[float]
    winning_probability: Optional[float]
    urgency: str
    message: str
    tips: List[str]


def generate_strategy(req: StrategyRequest) -> dict:
    time_left   = req.time_remaining_sec
    current     = req.current_price
    my_bid      = req.my_highest_bid
    bid_count   = req.bid_count

    # Velocity
    velocity = 0
    if len(req.recent_bids) >= 2:
        velocity = len(req.recent_bids[-5:]) / max(1, time_left / 60)

    is_winning = my_bid >= current and my_bid > 0

    # Competition
    if bid_count > 30 or velocity > 3:
        competition = "high"
    elif bid_count > 10 or velocity > 1:
        competition = "medium"
    else:
        competition = "low"

    # Urgency
    if time_left < 30:
        urgency = "critical"
    elif time_left < 120:
        urgency = "high"
    elif time_left < 600:
        urgency = "medium"
    else:
        urgency = "low"

    suggestion = current + req.bid_increment

    if is_winning and urgency in ("low", "medium"):
        recommendation = "wait"
        suggested_bid  = None
        message        = "You're in the lead! Hold your position and wait."
        tips           = ["Only bid again if someone outbids you.", "Set an auto-bid to protect your position."]
        win_prob       = 0.72 if competition == "low" else 0.55

    elif is_winning and urgency == "high":
        recommendation = "bid_soon"
        suggested_bid  = current + req.bid_increment * 2
        message        = "You're winning but time is short — be ready to defend."
        tips           = ["Someone may snipe in the final seconds. Stay alert!"]
        win_prob       = 0.65

    elif is_winning and urgency == "critical":
        recommendation = "snipe"
        suggested_bid  = current + req.bid_increment * 3
        message        = "Final seconds! Defend your lead decisively."
        tips           = ["Place a bid higher than minimum to deter others."]
        win_prob       = 0.60

    elif not is_winning and urgency == "low" and competition == "low":
        recommendation = "wait"
        suggested_bid  = current + req.bid_increment
        message        = "Plenty of time and low competition. No need to rush."
        tips           = ["Wait until the final 5 minutes.", "Early bids signal interest and drive up the price."]
        win_prob       = 0.68

    elif not is_winning and urgency in ("medium", "high"):
        recommendation = "bid_now"
        suggested_bid  = round(current * 1.03, -1)
        message        = f"Competition is {'heating up' if competition == 'high' else 'moderate'}. Time to bid strategically."
        tips           = ["Bid in odd numbers to edge out round-number bidders."]
        if competition == "high":
            tips.append("Consider jumping above the next round number.")
        win_prob       = 0.48 if competition == "high" else 0.58

    elif urgency == "critical" and not is_winning:
        recommendation = "aggressive"
        suggested_bid  = round(current * 1.06, -1)
        message        = "Critical! You need a decisive bid NOW."
        tips           = ["Bid 5-8% above current price.", "A weak increment will just start a bidding war."]
        win_prob       = 0.40

    else:
        recommendation = "bid_soon"
        suggested_bid  = current + req.bid_increment * 2
        message        = "Moderate competition. A measured bid is advisable."
        tips           = ["Watch bid velocity — act before the rush."]
        win_prob       = 0.52

    max_bid = round(current * 1.25, -2)

    return {
        "recommendation":      recommendation,
        "suggested_bid":       round(suggested_bid, 2) if suggested_bid else None,
        "max_recommended_bid": max_bid,
        "winning_probability": win_prob,
        "urgency":             urgency,
        "message":             message,
        "tips":                tips[:3],
    }


@router.post("/recommend", response_model=StrategyResponse)
def recommend(req: StrategyRequest):
    return generate_strategy(req)