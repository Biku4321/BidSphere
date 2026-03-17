# 🏆 BidSphere — AI-Powered Real-Time Auction Platform

> National Hackathon Project | Full-Stack · Real-Time · AI/ML

---

## 🚀 Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Real-Time   | Socket.IO (WebSockets)              |
| Backend     | Node.js, Express.js                 |
| Database    | MongoDB Atlas + Mongoose            |
| Cache       | Redis (bids, leaderboard, sessions) |
| AI Service  | Python, FastAPI, Scikit-learn       |
| Auth        | JWT + bcrypt                        |
| Deploy      | Vercel (FE) · Railway (BE + AI)     |

---

## 📁 Project Structure

```
bidsphere/
├── client/          → Next.js 14 frontend
├── server/          → Node.js + Express + Socket.IO backend
├── ai-service/      → Python FastAPI AI microservice
├── docker-compose.yml
└── .env.example
```

---

## ⚡ Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB running locally or Atlas URI
- Redis running locally

### 1. Clone & Setup Environment

```bash
git clone <your-repo>
cd bidsphere
cp .env.example server/.env
```

Edit `server/.env` with your MongoDB URI and other values.

---

### 2. Backend (Terminal 1)

```bash
cd server
npm install
npm run seed          # Create demo users + auctions
npm run dev           # → http://localhost:5000
```

---

### 3. AI Service (Terminal 2)

```bash
cd ai-service
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

---

### 4. Frontend (Terminal 3)

```bash
cd client
npm install
npm run dev           # → http://localhost:3000
```

---

### 5. Docker (All-in-one)

```bash
docker-compose up --build
```

---

## 🔑 Demo Credentials

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@bidsphere.com      | Admin@123  |
| User  | rahul@test.com           | Test@123   |
| User  | priya@test.com           | Test@123   |

All new users get **100 free credits** on signup.

---

## 🌐 API Endpoints

### Auth
| Method | Route                    | Description         |
|--------|--------------------------|---------------------|
| POST   | `/api/auth/register`     | Register new user   |
| POST   | `/api/auth/login`        | Login               |
| GET    | `/api/auth/me`           | Get current user    |

### Auctions
| Method | Route                    | Description         |
|--------|--------------------------|---------------------|
| GET    | `/api/auctions`          | List auctions       |
| GET    | `/api/auctions/:id`      | Single auction      |
| POST   | `/api/auctions`          | Create (admin)      |
| PATCH  | `/api/auctions/:id`      | Update (admin)      |
| DELETE | `/api/auctions/:id`      | Cancel (admin)      |

### Bids
| Method | Route                    | Description         |
|--------|--------------------------|---------------------|
| POST   | `/api/bids`              | Place a bid         |
| GET    | `/api/bids/auction/:id`  | Bid history         |
| GET    | `/api/bids/my`           | My bids             |

### Wallet
| Method | Route                        | Description         |
|--------|------------------------------|---------------------|
| GET    | `/api/wallet`                | My wallet balance   |
| POST   | `/api/wallet/add-credits`    | Add credits         |
| GET    | `/api/wallet/transactions`   | Tx history          |

### AI Service
| Method | Route                        | Description               |
|--------|------------------------------|---------------------------|
| POST   | `/predict/price`             | Price prediction          |
| POST   | `/fraud/analyze`             | Fraud risk scoring        |
| POST   | `/strategy/recommend`        | Bidding strategy advice   |

---

## 📡 Socket.IO Events

### Client → Server
| Event                    | Payload                     | Description              |
|--------------------------|-----------------------------|--------------------------|
| `auction:join`           | `{ auctionId }`             | Join auction room        |
| `auction:leave`          | `{ auctionId }`             | Leave auction room       |
| `auction:subscribe-timer`| `{ auctionId }`             | Start timer broadcasts   |
| `bid:place`              | `{ auctionId, amount }`     | Place a bid via socket   |
| `autobid:set`            | `{ auctionId, maxAmount }`  | Set auto-bid limit       |
| `auction:state`          | `{ auctionId }`             | Get current state        |

### Server → Client
| Event                 | Payload                              | Description              |
|-----------------------|--------------------------------------|--------------------------|
| `bid:new`             | `{ bid, currentPrice, endTime, ... }`| New bid placed           |
| `leaderboard:update`  | `{ topBids }`                        | Top 10 updated           |
| `timer:tick`          | `{ secondsLeft, endTime }`           | Countdown tick (1/sec)   |
| `auction:ended`       | `{ winner, finalPrice }`             | Auction concluded        |
| `auction:cancelled`   | `{ auctionId }`                      | Auction cancelled        |
| `auction:started`     | `{ auctionId }`                      | Auction went live        |

---

## 🤖 AI Features

### Price Prediction (`/predict/price`)
Ensemble model combining:
- Bid velocity analysis
- Time pressure curves
- Category multipliers
- Competition intensity scoring
- Price momentum detection

Returns: predicted price, confidence score, lower/upper bounds, human insight.

### Fraud Detection (`/fraud/analyze`)
Multi-signal scoring (0–100 risk score):
- Rapid successive bidding
- Minimal increment detection
- Last-second bot patterns
- Price spike manipulation
- Returns: risk level (low/medium/high), flags, recommended action

### Strategy Agent (`/strategy/recommend`)
Recommendations: `wait` · `bid_now` · `bid_soon` · `aggressive` · `snipe`
Considers: time remaining, competition level, your current position, bid velocity

---

## 🎮 Key Features

- ✅ **Real-Time Bidding** — WebSocket-powered, zero refresh
- ✅ **Anti-Snipe Timer** — Auto-extends by 30s if bid placed in last 30s
- ✅ **Auto-Bidding** — Set max and let BidSphere bid for you
- ✅ **AI Price Prediction** — ML ensemble with confidence intervals
- ✅ **Fraud Detection** — Per-bid risk scoring + admin flagging
- ✅ **Strategy Advisor** — Real-time AI recommendations
- ✅ **Wallet System** — Credits with full transaction history
- ✅ **Live Leaderboard** — Top 10 bidders updated in real-time
- ✅ **Admin Dashboard** — Manage auctions, users, fraud logs
- ✅ **Gamification** — Badges, bid counts, win tracking
- ✅ **Bid Refund** — Outbid? Credits returned automatically

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd client
npx vercel --prod
```

### Backend (Railway)
Push to GitHub → Connect Railway → Set environment variables.

### AI Service (Railway / Render)
Same as backend — Railway supports Python automatically.

---

## 📌 Future Improvements
- Blockchain-based bid verification
- Live auction video streaming
- Mobile app (React Native)
- Stripe/Razorpay real payment integration
- International multi-currency support
