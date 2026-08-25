import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Company Knowledge Hub"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Veritabanı Bağlantı Ayarı
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/staj_db"

    # JWT Kimlik Doğrulama Ayarları
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Dosya Yükleme & Depolama Ayarları
    MAX_FILE_SIZE_MB: int = 10
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    STORAGE_DIR: str = os.path.join("storage", "documents")
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",                                                        # .pdf
        "text/plain",                                                             # .txt
        "text/markdown",                                                          # .md
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" # .docx
    ]

    # .env dosyasını otomatik yükleme yapılandırması
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()