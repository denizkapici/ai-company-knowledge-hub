from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

@app.get("/")
def read_root():
    return {
        "message": "AI Company Knowledge Hub API çalışıyor!",
        "status": "active"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}