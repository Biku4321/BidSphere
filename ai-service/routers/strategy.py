from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class RecentBid(BaseModel):
    amount: float
    timestamp: str


class StrategyRequest(BaseModel):
    auction_id: str
    current_price: float
    starting_price: float
    bid_increment: float
    bid_count: int
    time_remaining_sec: float
    my_highest_bid: float = 0
    recent_bids: List[RecentBid] = []
    user_id: str


class StrategyResponse(BaseModel):
    recommendation: str          # wait / bid_now / bid_soon / aggressive / snipe
    suggested_bid: Optional[float]
    max_recommended_bid: Optional[float]
    winning_probability: Optional[float]
    urgency: str                 # low / medium / high / critical
    message: str
    tips: List[str]


def generate_strategy(req: StrategyRequest) -> dict:
    """
    Intelligent bidding strategy advisor considering:
    - Time remaining
    - Competition intensity
    - User's current position
    - Bid velocity patterns
    """
    tips = []
    time_left = req.time_remaining_sec
    current = req.current_price
    my_bid = req.my_highest_bid
    bid_count = req.bid_count

    # ── Bid velocity ───────────────────────────────────────
    velocity = 0
    if len(req.recent_bids) >= 2:
        amounts = [b.amount for b in req.recent_bids[-5:]]
        velocity = len(amounts) / max(1, time_left / 60)  # bids per minute

    # ── Am I currently winning? ────────────────────────────
    is_winning = my_bid >= current and my_bid > 0

    # ── Competition level ──────────────────────────────────
    if bid_count > 30 or velocity > 3:
        competition = "high"
    elif bid_count > 10 or velocity > 1:
        competition = "medium"
    else:
        competition = "low"

    # ── Time pressure ──────────────────────────────────────
    if time_left < 30:
        urgency = "critical"
    elif time_left < 120:
        urgency = "high"
    elif time_left < 600:
        urgency = "medium"
    else:
        urgency = "low"

    # ── Strategy logic ─────────────────────────────────────
    suggestion = current + req.bid_increment

    if is_winning and urgency in ("low", "medium"):
        recommendation = "wait"
        suggested_bid = None
        message = "You're in the lead! Hold your position and wait."
        tips.append("Only bid again if someone outbids you.")
        tips.append("Set an auto-bid to protect your position automatically.")
        winning_probability = 0.72 if competition == "low" else 0.55

    elif is_winning and urgency == "high":
        recommendation = "bid_soon"
        suggested_bid = current + req.bid_increment * 2
        message = "You're winning but time is short — be ready to defend."
        tips.append("Someone may snipe in the final seconds. Stay alert!")
        winning_probability = 0.65

    elif is_winning and urgency == "critical":
        recommendation = "snipe"
        suggested_bid = current + req.bid_increment * 3
        message = "Final seconds! Defend your lead decisively."
        tips.append("Place a bid higher than the minimum increment to deter others.")
        winning_probability = 0.60

    elif not is_winning and urgency == "low" and competition == "low":
        recommendation = "wait"
        suggested_bid = current + req.bid_increment
        message = "Plenty of time left and low competition. No need to rush."
        tips.append("Wait until the auction enters the final 5 minutes to bid.")
        tips.append("Early bidding signals your interest and drives up the price.")
        winning_probability = 0.68

    elif not is_winning and urgency in ("medium", "high"):
        recommendation = "bid_now"
        suggested_bid = round(current * 1.03, -1)   # 3% above, rounded to 10s
        message = f"Competition is {'heating up' if competition == 'high' else 'moderate'}. Time to place a strategic bid."
        tips.append("Bid in odd numbers (e.g. ₹82,100) to edge out round-number bidders.")
        if competition == "high":
            tips.append("Consider jumping above the next round number to discourage rivals.")
        winning_probability = 0.48 if competition == "high" else 0.58

    elif urgency == "critical" and not is_winning:
        recommendation = "aggressive"
        suggested_bid = round(current * 1.06, -1)
        message = "Critical! You need a decisive bid NOW to have a chance."
        tips.append("Bid 5-8% above the current price to create a strong lead.")
        tips.append("A weak increment now will just start a bidding war.")
        winning_probability = 0.40

    else:
        recommendation = "bid_soon"
        suggested_bid = current + req.bid_increment * 2
        message = "Moderate competition. A measured bid is advisable soon."
        tips.append("Watch bid velocity — if bids are accelerating, act before the rush.")
        winning_probability = 0.52

    # Max recommended bid cap
    max_bid = round(current * 1.25, -2)  # 25% above current, rounded to 100s

    return {
        "recommendation": recommendation,
        "suggested_bid": round(suggested_bid, 2) if suggested_bid else None,
        "max_recommended_bid": max_bid,
        "winning_probability": winning_probability,
        "urgency": urgency,
        "message": message,
        "tips": tips[:3],
    }


@router.post("/recommend", response_model=StrategyResponse)
def recommend(req: StrategyRequest):
    return generate_strategy(req)
