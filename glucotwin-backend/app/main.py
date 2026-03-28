from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, glucose,glucose_sac
from app.models import user

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GlucoTwin API",
    description="Diabetes Digital Twin — Backend",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(glucose.router, prefix="/glucose", tags=["Glucose Prediction"])
app.include_router(glucose_sac.router, prefix="/glucose", tags=["Glucose Prediction"])

@app.get("/health")
def health():
    return {"status": "ok"}