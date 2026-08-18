from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db  # <-- app.database olarak güncellendi

# Swagger UI üzerindeki grup başlıkları ve açıklamaları
tags_metadata = [
    {
        "name": "General",
        "description": "Sistem durum kontrolü ve genel bilgi uç noktaları.",
    },
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    ### 🧠 AI Company Knowledge Hub API
    Kurumsal dokümanların (PDF, DOCX, TXT) işlendiği, vektör tabanlı anlamsal arama (Semantic Search) 
    ve RAG (Retrieval-Augmented Generation) altyapısı sunan yapay zekâ destekli sistem.
    """,
    version=settings.VERSION,
    openapi_tags=tags_metadata,
    contact={
        "name": "AI Knowledge Hub Geliştirme Ekibi",
        "email": "dev@company.com",
    },
    license_info={
        "name": "Proprietary / Corporate",
    },
)

# CORS yapılandırması
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} başlatıldı ({settings.ENVIRONMENT} ortamı).")

@app.get("/", tags=["General"])
def read_root():
    logger.info("Kök endpoint'e istek geldi.")
    return {
        "message": f"{settings.PROJECT_NAME} API çalışıyor!",
        "version": settings.VERSION,
        "status": "active"
    }

@app.get("/health", tags=["General"])
def health_check():
    logger.info("Sistem sağlık kontrolü (Health Check) gerçekleştirildi.")
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/db-check", tags=["General"])
def db_check(db: Session = Depends(get_db)):
    """PostgreSQL veritabanı bağlantı canlılığını test eden endpoint."""
    try:
        result = db.execute(text("SELECT 1")).fetchone()
        logger.info("Veritabanı bağlantı testi başarılı.")
        return {
            "status": "success",
            "db_response": result[0],
            "message": "PostgreSQL bağlantısı sorunsuz çalışıyor!"
        }
    except Exception as e:
        logger.error(f"Veritabanı bağlantı hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {str(e)}")