from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, fraud, strategy
import uvicorn

app = FastAPI(
    title="BidSphere AI Service",
    description="Price prediction, fraud detection, and bidding strategy APIs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/predict", tags=["Price Prediction"])
app.include_router(fraud.router, prefix="/fraud", tags=["Fraud Detection"])
app.include_router(strategy.router, prefix="/strategy", tags=["Bidding Strategy"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "BidSphere AI"}


@app.get("/")
def root():
    return {"message": "BidSphere AI Service v1.0", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
