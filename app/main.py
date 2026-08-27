import time
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Request  # YENİ: Request eklendi
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.logger import logger, setup_logging  # YENİ: setup_logging eklendi
from app.database import get_db
from app.api import auth, departments, users
from app.api.documents import router as documents_router

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter

# YENİ: Uygulama başlarken logları yapılandır
setup_logging()

# Swagger UI grup başlıkları ve açıklamaları
tags_metadata = [
    {
        "name": "General",
        "description": "Sistem durum kontrolü ve genel bilgi uç noktaları.",
    },
    {
        "name": "Auth",
        "description": "Kullanıcı girişi, JWT access token üretimi ve profil doğrulama işlemleri.",
    },
    {
        "name": "Departments",
        "description": "Departman oluşturma, listeleme ve detay görüntüleme işlemleri.",
    },
    {
        "name": "Users",
        "description": "Kullanıcı kayıt, listeleme ve departman atama işlemleri.",
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

# Rate Limiting (SlowAPI) Yapılandırması
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ==========================================
# 🛡️ YENİ: TÜM İSTEKLERİ KAYDEDEN MIDDLEWARE
# ==========================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # İstek işleniyor...
    response = await call_next(request)
    
    # Ne kadar sürdü?
    process_time = (time.time() - start_time) * 1000
    
    # Bize kim, nereye, hangi yöntemle geldi ve ne cevap verdik?
    client_ip = request.client.host if request.client else "Bilinmiyor"
    logger.info(
        f"{client_ip} - {request.method} {request.url.path} - "
        f"Durum: {response.status_code} - Süre: {process_time:.2f}ms"
    )
    
    return response


# CORS yapılandırması
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ların Dahil Edilmesi
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(departments.router, prefix="/departments", tags=["Departments"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(documents_router)

@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} başlatıldı ({settings.ENVIRONMENT} ortamı).")


# ==========================================
# 📌 GENEL UÇ NOKTALAR (General Endpoints)
# ==========================================

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