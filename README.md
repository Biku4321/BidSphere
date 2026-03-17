<div align="center">

# 🏆 BidSphere
### AI-Powered Intelligent Real-Time Auction Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-white?style=flat-square&logo=socket.io&logoColor=black)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**Built for CodeBidz 2026** · Full-Stack · Real-Time · AI/ML

[🌐 Live Demo](https://bid-sphere-green.vercel.app) · [📡 API](https://bidsphere-server.onrender.com/health) · [🤖 AI Docs](https://bidsphere-ai.onrender.com/docs)

</div>

---

## 📸 What is BidSphere?

BidSphere is a **production-grade online auction platform** that solves three major problems with traditional auction systems:

| Problem | BidSphere Solution |
|---------|-------------------|
| Delayed bid updates require page refresh | WebSocket real-time engine — zero refresh |
| No insight into expected final prices | AI ensemble price prediction with confidence |
| Fraudulent shill bidding goes undetected | Multi-signal ML fraud scoring per bid |

---

## 🎯 Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| 🔐 Admin | `admin@bidsphere.com` | `Admin@123` | Full platform control |
| 👤 User 1 | `rahul@test.com` | `Test@123` | Bidding, wallet |
| 👤 User 2 | `priya@test.com` | `Test@123` | Bidding, wallet |

> 💡 All new users receive **100 free credits** on registration.

---

## ✨ Features

### 🔴 Core — Real-Time Bidding Engine
- **WebSocket bidding** via Socket.IO — bids broadcast instantly to all participants
- **Anti-snipe protection** — auction auto-extends 30s if bid placed in final 30 seconds
- **Auto-bidding agent** — set a max limit, system bids automatically to keep you winning
- **Live leaderboard** — top 10 bidders updated in real-time without any refresh
- **Bid refund system** — outbid? credits returned to wallet instantly

### 🧠 AI — Three Intelligent Modules

**1. Price Prediction** (`/predict/price`)
Ensemble model using 5 signals:
- Bid velocity analysis (recent bid acceleration)
- Time pressure curves (bids accelerate near end)
- Category multipliers (electronics vs art vs collectibles)
- Competition intensity scoring (bid count thresholds)
- Price momentum detection (price-to-start ratio)

Returns: `predicted_price`, `confidence` (0–1), `lower_bound`, `upper_bound`, human-readable `insight`

**2. Fraud Detection** (`/fraud/analyze`)
Per-bid risk scoring 0–100:
- Rapid successive bidding (5+ bids/60s = +40 score)
- Minimal increment manipulation (<0.5% above current = +25)
- Last-second bot patterns (<10s remaining + repeat = +30)
- Price spike manipulation (3x jump = +20)

Auto-flags high-risk (70+) bids for admin review.

**3. Strategy Advisor** (`/strategy/recommend`)
5 strategy modes based on real-time analysis:
- `wait` — you're winning, competition is low
- `bid_now` — competition heating up, act soon
- `bid_soon` — moderate urgency
- `aggressive` — critical time, need decisive action
- `snipe` — final seconds, defend your lead

### 🛡️ Security & Fairness
- JWT authentication with bcrypt password hashing
- Rate limiting per route (general + bid-specific + AI-specific)
- Wallet-based credit system — no real money, controlled bidding
- Admin can suspend users, resolve fraud flags, cancel auctions

### 🎮 Gamification
- Real-time leaderboard with 🥇🥈🥉 rankings
- Bid count tracking per user
- Achievement badges: `first_bid`, `top_bidder`, `auction_winner`, `power_bidder`, `legend`
- Win count tracking

### 🔐 Admin Dashboard
- Platform stats: users, auctions, bids, revenue, fraud flags
- Create auctions with image preview
- **Edit any auction**: change title, extend time (+1h to +24h quick buttons), change status
- User management: suspend/activate accounts
- Fraud log review: risk score visualization, resolve/dismiss flags

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Users (Browser)                     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────┐
│          Frontend — Next.js 14 + Tailwind            │
│    Zustand State · Socket.IO Client · Axios          │
└──────────────────────┬──────────────────────────────┘
                       │ REST API + Socket.IO
┌──────────────────────▼──────────────────────────────┐
│         Backend — Node.js + Express                  │
│   Auth · Auctions · Bids · Wallet · Admin            │
│   Socket.IO Server · Rate Limiting · JWT             │
└──────┬────────────────┬────────────────┬────────────┘
       │                │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
│   MongoDB   │  │    Redis    │  │  AI Service     │
│   Atlas     │  │  (Upstash)  │  │  FastAPI/Python │
│ Users/Bids  │  │  Leaderboard│  │  predict/fraud  │
│ Auctions    │  │  Sessions   │  │  strategy       │
└─────────────┘  └─────────────┘  └────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + TypeScript | App Router, SSR/CSR |
| **Styling** | Tailwind CSS v4 | Dark theme UI |
| **State** | Zustand + persist | Global auth + auction state |
| **Real-Time** | Socket.IO | WebSocket bidding engine |
| **Backend** | Node.js + Express | REST API + WS server |
| **Auth** | JWT + bcrypt | Secure sessions |
| **Database** | MongoDB Atlas + Mongoose | Users, auctions, bids |
| **Cache** | Redis (Upstash) | Live bids + leaderboard |
| **AI Service** | Python + FastAPI | ML microservice |
| **ML** | Scikit-learn + NumPy | Prediction + fraud models |
| **Deploy FE** | Vercel | Auto CI/CD from GitHub |
| **Deploy BE** | Render | Node.js + Python services |

---

## 📁 Project Structure

```
bidsphere/
├── client/                          → Next.js 14 Frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx             → Landing page
│       │   ├── auctions/            → Auction listing
│       │   │   └── [id]/page.tsx    → Live auction room ⚡
│       │   ├── auth/                → Login + Register
│       │   ├── wallet/              → Credits + transactions
│       │   └── admin/               → Admin dashboard 🔐
│       ├── components/
│       │   ├── BidPanel.tsx         → Manual + Auto bidding
│       │   ├── AIInsightPanel.tsx   → AI predictions 🧠
│       │   ├── Leaderboard.tsx      → Live top bidders
│       │   ├── CountdownTimer.tsx   → Anti-snipe timer
│       │   ├── Navbar.tsx
│       │   └── Footer.tsx
│       ├── hooks/useAuctionSocket.ts → Socket.IO hook
│       ├── store/index.ts           → Zustand stores
│       └── lib/
│           ├── api.ts               → Axios + interceptors
│           └── socket.ts            → Socket singleton
│
├── server/                          → Node.js Backend
│   └── src/
│       ├── models/                  → MongoDB schemas
│       │   ├── User.js              → Auth + gamification
│       │   ├── Auction.js           → Full auction lifecycle
│       │   ├── Bid.js               → Bid + fraud fields
│       │   ├── Wallet.js            → Credits + transactions
│       │   └── FraudLog.js          → Fraud reports
│       ├── routes/                  → REST API endpoints
│       ├── sockets/                 → Socket.IO handlers
│       │   ├── bidSocket.js         → Real-time bidding + auto-bid
│       │   └── auctionSocket.js     → Timer + room management
│       ├── middleware/auth.js       → JWT protect + adminOnly
│       ├── config/                  → DB + Redis connections
│       └── utils/seed.js            → Demo data seeder
│
└── ai-service/                      → Python FastAPI
    ├── main.py                      → App + CORS + routing
    ├── routers/
    │   ├── predict.py               → Ensemble price prediction
    │   ├── fraud.py                 → Multi-signal fraud scoring
    │   └── strategy.py              → Strategy advisor agent
    └── requirements.txt
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas URI)
- Redis (local or Upstash URL)

### 1. Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/bidsphere.git
cd bidsphere
cp .env.example server/.env
```

Edit `server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/bidsphere
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
```

Create `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 2. Run All Services

**Terminal 1 — Backend**
```bash
cd server
npm install
npm run seed       # Creates demo users + 4 sample auctions
npm run dev        # → http://localhost:5000
```

**Terminal 2 — AI Service**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → Swagger: http://127.0.0.1:8000/docs
```

**Terminal 3 — Frontend**
```bash
cd client
npm install
npm run dev        # → http://localhost:3000
```

### 3. Docker (optional)
```bash
docker-compose up --build
```

---

## 📡 API Reference

### Authentication
```
POST /api/auth/register     → { name, email, password }
POST /api/auth/login        → { email, password }
GET  /api/auth/me           → (requires Bearer token)
```

### Auctions
```
GET    /api/auctions              → ?status=live&category=electronics&page=1
GET    /api/auctions/:id          → Single auction + topBids + AI prediction
POST   /api/auctions              → Create (admin only)
PATCH  /api/auctions/:id          → Update title/endTime/status (admin only)
DELETE /api/auctions/:id          → Cancel auction (admin only)
```

### Bids
```
POST /api/bids                    → { auctionId, amount }
GET  /api/bids/auction/:id        → Bid history for auction
GET  /api/bids/my                 → My bid history
```

### Wallet
```
GET  /api/wallet                  → Balance + lockedBalance
POST /api/wallet/add-credits      → { amount }
GET  /api/wallet/transactions     → Last 50 transactions
```

### Admin (requires admin role)
```
GET   /api/admin/dashboard              → Platform stats
GET   /api/admin/users                  → All users
PATCH /api/admin/users/:id/toggle       → Suspend/activate
GET   /api/admin/fraud-logs             → All fraud reports
PATCH /api/admin/fraud-logs/:id/resolve → Resolve flag
POST  /api/admin/credits/:userId        → Add credits manually
```

### AI Service (port 8000)
```
POST /predict/price       → Price prediction
POST /fraud/analyze       → Fraud risk score
POST /strategy/recommend  → Bidding strategy
GET  /health              → Service status
GET  /docs                → Swagger UI
```

---

## 📡 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `auction:join` | `{ auctionId }` | Join auction room |
| `auction:leave` | `{ auctionId }` | Leave auction room |
| `auction:subscribe-timer` | `{ auctionId }` | Start 1s countdown ticks |
| `bid:place` | `{ auctionId, amount }` | Place real-time bid |
| `autobid:set` | `{ auctionId, maxAmount }` | Enable auto-bidding |
| `auction:state` | `{ auctionId }` | Get current state snapshot |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `bid:new` | `{ bid, currentPrice, bidCount, endTime, antiSnipeExtended }` | Bid placed |
| `leaderboard:update` | `{ topBids }` | Top 10 refreshed |
| `timer:tick` | `{ secondsLeft, endTime, currentPrice }` | Every 1 second |
| `auction:ended` | `{ winner, finalPrice }` | Auction concluded |
| `auction:cancelled` | `{ auctionId }` | Auction voided |
| `auction:started` | `{ auctionId }` | Auction went live |

---

## 🚀 Deployment

### Frontend → Vercel
1. Push to GitHub
2. vercel.com → Import repo → Root Directory: `client`
3. Add env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
4. Deploy ✅

### Backend → Render
1. New Web Service → Root Directory: `server`
2. Build: `npm install` · Start: `node src/index.js`
3. Add all env vars from `.env.example`

### AI Service → Render
1. New Web Service → Root Directory: `ai-service`
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### After Deploy — Seed Database
```bash
# In Render shell or locally with production MONGO_URI:
cd server && node src/utils/seed.js
```

---

## 🔮 Future Improvements

- [ ] Blockchain-based bid verification for complete transparency
- [ ] Live auction video streaming
- [ ] Mobile app (React Native)
- [ ] Stripe/Razorpay real payment integration
- [ ] Multi-language support
- [ ] Email notifications for outbid/win events
- [ ] Advanced ML model trained on real auction datasets
- [ ] Auction categories with custom fields

---

## 📄 License

MIT License — free to use for educational and hackathon purposes.

---

<div align="center">

**Built with ❤️ for CodeBidz 2026**

*BidSphere — Where every bid is smarter*

</div>
