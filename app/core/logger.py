import sys
import os
from loguru import logger

# Logların kaydedileceği klasör
LOG_DIR = "storage/logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Günlük log dosyası formatı (Örn: api_2026-08-27.log)
LOG_FILE_PATH = os.path.join(LOG_DIR, "api_{time:YYYY-MM-DD}.log")

def setup_logging():
    """Loguru ayarlarını yapılandırır."""
    # FastAPI/Uvicorn'un varsayılan karmaşık loglarını ezmek için temizlik yapıyoruz
    logger.remove()
    
    # 1. Terminal Çıktısı (Renkli ve Okunaklı)
    logger.add(
        sys.stdout, 
        colorize=True, 
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    
    # 2. Dosya Çıktısı (Kalıcı Kayıt - Her gece yarısı yeni dosya açar, 10 gün eskileri siler)
    logger.add(
        LOG_FILE_PATH, 
        rotation="00:00", 
        retention="10 days", 
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} - {message}"
    )
    
    logger.info("🚀 AI Company Knowledge Hub Loglama Sistemi Başlatıldı!")