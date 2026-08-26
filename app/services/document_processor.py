import logging
from sqlalchemy.orm import Session
from app.models import Document, DocumentStatus
from app.database import SessionLocal
from app.services.text_extractor import extract_content  

logger = logging.getLogger(__name__)

async def process_document_pipeline(document_id: int):
    db: Session = SessionLocal()
    
    try:

        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error("Doküman bulunamadı | ID: %s", document_id)
            return

       
        doc.status = DocumentStatus.processing
        db.commit()
        logger.info("Doküman işlenmeye başlandı | ID: %s", document_id)


        extracted_text = await extract_content(file_path=doc.file_path, mime_type=doc.mime_type)
        
       
        logger.info("Çıkarılan net metin boyutu | ID: %s | Karakter: %d", document_id, len(extracted_text))
        


        
        doc.status = DocumentStatus.completed
        db.commit()
        logger.info("Doküman işleme başarıyla tamamlandı | ID: %s", document_id)

    except Exception as e:
        db.rollback()
        logger.error("Arka plan işleminde hata | ID: %s | Hata: %s", document_id, str(e), exc_info=True)
        
        
        failed_doc = db.query(Document).filter(Document.id == document_id).first()
        if failed_doc:
            failed_doc.status = DocumentStatus.failed
            db.commit()
            
    finally:
       
        db.close()