import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.logger import logger, setup_logging
from app.database import get_db
from app.api import auth, departments, users, chat
from app.api.documents import router as documents_router
from app.core.limiter import limiter
from app.core.exceptions import AppException
from app.services.vector_service import vector_service

# ==========================================
# 🔐 GÜVENLİK İÇİN GEREKLİ IMPORTLAR
# ==========================================
from app.models import User 
from app.api.deps import get_current_user # Güvenlik görevlimizi çağırdık


# Uygulama başlarken logları yapılandır
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

# ==========================================
# 🌐 CORS AYARLARI (React Frontend Bağlantısı)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting (SlowAPI) Yapılandırması
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ==========================================
# 🛡️ TÜM İSTEKLERİ KAYDEDEN MIDDLEWARE
# ==========================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    trace_id = str(uuid.uuid4())
    request.state.trace_id = trace_id
    
    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Trace-ID"] = trace_id
    
    process_time = (time.time() - start_time) * 1000
    client_ip = request.client.host if request.client else "Bilinmiyor"
    
    logger.info(
        f"[TraceID: {trace_id}] {client_ip} - {request.method} {request.url.path} - "
        f"Durum: {response.status_code} - Süre: {process_time:.2f}ms"
    )
    
    return response


# ==========================================
# 🚨 GLOBAL EXCEPTION HANDLERS (HATA YAKALAYICILAR)
# ==========================================
@app.exception_handler(AppException)
async def custom_app_exception_handler(request: Request, exc: AppException):
    trace_id = getattr(request.state, "trace_id", "Bilinmiyor")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "detail": exc.detail,
            "trace_id": trace_id
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    trace_id = getattr(request.state, "trace_id", "Bilinmiyor")
    errors = [{"field": e["loc"][-1], "msg": e["msg"]} for e in exc.errors()]
    
    return JSONResponse(
        status_code=422,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Gönderilen verilerde format veya doğrulama hatası var.",
            "detail": errors,
            "trace_id": trace_id
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    trace_id = getattr(request.state, "trace_id", "Bilinmiyor")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": "HTTP_ERROR",
            "message": "İşlem sırasında bir hata oluştu.",
            "detail": exc.detail,
            "trace_id": trace_id
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    trace_id = getattr(request.state, "trace_id", "Bilinmiyor")
    logger.error(f"[TraceID: {trace_id}] Beklenmeyen Sistem Hatası: {str(exc)}")
    logger.exception(exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "Sunucu tarafında beklenmeyen bir hata oluştu. Lütfen teknik ekiple iletişime geçin.",
            "detail": "Kritik sistem hatası.",
            "trace_id": trace_id
        }
    )


# ==========================================
# 🚀 ROUTER'LARIN DAHİL EDİLMESİ
# ==========================================
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(departments.router, prefix="/departments", tags=["Departments"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(documents_router)
app.include_router(chat.router)


@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} başlatıldı ({settings.ENVIRONMENT} ortamı).")


# ==========================================
# 📌 GENEL UÇ NOKTALAR
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


# 🔒 İŞTE KORUMAYA ALDIĞIMIZ ENDPOINT 🔒
@app.get("/api/v1/documents/db-check", tags=["AI Test"])
async def check_database(
    current_user: User = Depends(get_current_user) # KAPI KİLİDİ!
):
    """Sadece giriş yapmış kullanıcıların görebileceği veritabanı kontrolü."""
    data = vector_service.collection.get(limit=5)
    return {
        "istegi_yapan": current_user.email,
        "kullanici_rolu": current_user.role,
        "veritabani_durumu": "Aktif",
        "toplam_kayit": len(data["documents"]),
        "kaydedilen_metinler": data["documents"]
    }