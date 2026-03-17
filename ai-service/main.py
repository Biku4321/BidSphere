from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from routers import predict, fraud, strategy

app = FastAPI(
    title="BidSphere AI Service",
    description="Price prediction, fraud detection, and bidding strategy APIs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router,  prefix="/predict",  tags=["Price Prediction"])
app.include_router(fraud.router,    prefix="/fraud",    tags=["Fraud Detection"])
app.include_router(strategy.router, prefix="/strategy", tags=["Bidding Strategy"])


@app.get("/", include_in_schema=False)
def root():
    # Auto redirect to docs
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok", "service": "BidSphere AI", "version": "1.0.0"}