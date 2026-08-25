import asyncio
import logging
from app.database import SessionLocal
from app.models import Document, DocumentStatus

logger = logging.getLogger(__name__)


async def process_document_pipeline(document_id: int) -> None:
    """
    Arka planda çalışacak doküman işleme pipeline'ı.
    Yarınki (8. Gün) metin çıkarma ve embedding adımları buraya bağlanacaktır.
    """
    logger.info("Doküman işleme başladı | ID: %d", document_id)

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error("Doküman bulunamadı | ID: %d", document_id)
            return

        # 1. Durumu PROCESSING yap
        doc.status = DocumentStatus.processing
        db.commit()
        logger.info("Doküman durumu güncellendi: PROCESSING | ID: %d", document_id)

        # İşlem simülasyonu (8. Günde buraya metin çıkarma fonksiyonu gelecek)
        await asyncio.sleep(2)

        # 2. İşlem tamamlandı: Durumu COMPLETED yap
        doc.status = DocumentStatus.completed
        db.commit()
        logger.info("Doküman işleme tamamlandı: COMPLETED | ID: %d", document_id)

    except Exception as e:
        db.rollback()
        logger.error("Doküman işleme hatası | ID: %d | Hata: %s", document_id, str(e), exc_info=True)
        # Hata durumunda statüyü FAILED yap
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.failed
            db.commit()
    finally:
        db.close()