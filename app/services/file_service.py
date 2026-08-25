import os
import uuid
import logging
import pathlib
import asyncio
import aiofiles
import aiofiles.os
import magic  # pip install python-magic-bin (Windows) veya python-magic (Linux/Mac)
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

# ─── Logger Kurulumu ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ─── İzin Verilen Uzantılar (MIME ile çapraz doğrulama yapılır) ─────────────────
ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx", ".txt", ".md"}

# ─── MIME → Uzantı Eşleşme Tablosu (çapraz doğrulama için) ─────────────────────
MIME_EXTENSION_MAP: dict[str, set[str]] = {
    "application/pdf":                                                {".pdf"},
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
    "text/plain":                                                     {".txt", ".md"},
    "text/markdown":                                                  {".md"},
}

# ─── Depolama Dizini Garantisi ──────────────────────────────────────────────────
os.makedirs(settings.STORAGE_DIR, exist_ok=True)


# ────────────────────────────────────────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ────────────────────────────────────────────────────────────────────────────────

def _sanitize_extension(filename: str | None) -> str:

    if not filename:
        return ""

    # pathlib ile yol bileşenlerini (../../) temizle, sadece dosya ismini al
    safe_name = pathlib.Path(filename).name  # 'dir/../evil.pdf' → 'evil.pdf'

    # Uzantıyı küçük harfe çevirerek al
    extension = pathlib.Path(safe_name).suffix.lower()

    return extension


def _validate_extension(extension: str) -> None:

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geçersiz dosya uzantısı: '{extension}'. "
                   f"İzin verilenler: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )


def _validate_declared_mime(content_type: str | None) -> None:

    if content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Desteklenmeyen dosya türü: '{content_type}'. "
                   f"Yalnızca PDF, DOCX, TXT ve MD dosyaları kabul edilir."
        )


def _validate_real_mime(header_bytes: bytes, declared_extension: str) -> str:

    real_mime = magic.from_buffer(header_bytes, mime=True)

    # Gerçek MIME türü izin verilenler listesinde mi?
    if real_mime not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dosya içeriği geçersiz. Tespit edilen tür: '{real_mime}'."
        )

    # MIME türü ile uzantı uyumlu mu? (örn: .pdf ama içerik text/plain olamaz)
    allowed_extensions_for_mime = MIME_EXTENSION_MAP.get(real_mime, set())
    if declared_extension and declared_extension not in allowed_extensions_for_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dosya uzantısı ('{declared_extension}') içerikle "
                   f"uyuşmuyor (tespit edilen tür: '{real_mime}')."
        )

    return real_mime


async def _cleanup(file_path: str) -> None:

    try:
        if await aiofiles.os.path.exists(file_path):
            await aiofiles.os.remove(file_path)
            logger.info("Temizlendi: %s", file_path)
    except Exception as cleanup_err:
        # Temizlik hatası orijinal hatanın üstüne binmesin
        logger.warning("Dosya temizlenemedi: %s — %s", file_path, cleanup_err)


# ────────────────────────────────────────────────────────────────────────────────
# ANA FONKSİYON
# ────────────────────────────────────────────────────────────────────────────────

async def save_upload_file(file: UploadFile) -> tuple[str, int, str]:


    # ── 1. Bildirilen MIME türü ön kontrolü ─────────────────────────────────────
    _validate_declared_mime(file.content_type)

    # ── 2. Uzantı güvenlik kontrolü ─────────────────────────────────────────────
    file_extension = _sanitize_extension(file.filename)
    _validate_extension(file_extension)

    # ── 3 & 4. İçerik tabanlı gerçek MIME doğrulaması ───────────────────────────
    # Dosyanın ilk 2048 byte'ını oku (magic imzası için yeterli)
    header_bytes = await file.read(2048)
    real_mime = _validate_real_mime(header_bytes, file_extension)

    # Dosya imlecini başa sar (chunk okuma için gerekli)
    await file.seek(0)

    # ── Güvenli dosya adı ve yolu oluştur ───────────────────────────────────────
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.STORAGE_DIR, unique_filename)

    logger.info(
        "Dosya yükleme başladı | ad: %s | tür: %s | uzantı: %s",
        file.filename, real_mime, file_extension
    )

    # ── Chunk tabanlı asenkron yazma ─────────────────────────────────────────────
    file_size = 0
    chunk_size = getattr(settings, "UPLOAD_CHUNK_SIZE_BYTES", 1024 * 1024)  # Varsayılan: 1 MB

    try:
        async with aiofiles.open(file_path, "wb") as buffer:
            while chunk := await file.read(chunk_size):
                file_size += len(chunk)

                # Boyut sınırı kontrolü — chunk diske YAZILMADAN önce kontrol edilir
                if file_size > settings.MAX_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Dosya boyutu çok büyük. "
                               f"Maksimum izin verilen boyut: {settings.MAX_FILE_SIZE_MB} MB."
                    )

                await buffer.write(chunk)

    except HTTPException:
        await _cleanup(file_path)
        raise  # Orijinal HTTP hatasını olduğu gibi ilet

    except Exception as e:
        await _cleanup(file_path)
        # ⚠️ Kullanıcıya iç hata detayı (str(e)) döndürme — sistem bilgisi sızabilir!
        logger.error(
            "Dosya diske kaydedilemedi | yol: %s | hata: %s",
            file_path, str(e),
            exc_info=True  # Stack trace loglanır ama kullanıcıya gösterilmez
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dosya diske kaydedilirken beklenmeyen bir hata oluştu."
        )

    logger.info(
        "Dosya başarıyla kaydedildi | yol: %s | boyut: %d bytes | tür: %s",
        file_path, file_size, real_mime
    )

    return file_path, file_size, real_mime

