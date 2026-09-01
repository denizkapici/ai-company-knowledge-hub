import logging
from sqlalchemy.orm import Session
from app.models import Document, DocumentStatus
from app.database import SessionLocal
from app.services.text_extractor import extract_content  

# YENİ EKLENEN IMPORTLAR: Yapay Zeka Servislerimiz
from app.services.rag_service import rag_service
from app.services.vector_service import vector_service
from loguru import logger


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

        # 1. Dosya tipinden bağımsız olarak metni çıkart (Senin yazdığın kısım)
        extracted_text = await extract_content(file_path=doc.file_path, mime_type=doc.mime_type)
        logger.info("Çıkarılan net metin boyutu | ID: %s | Karakter: %d", document_id, len(extracted_text))
        
        # ==========================================
        # 🧠 YAPAY ZEKA (RAG & VECTOR) ENTEGRASYONU
        # ==========================================
        if extracted_text and extracted_text.strip():
            # A. Metni KVKK (PII) Sansüründen Geçir
            masked_text = rag_service.mask_pii(extracted_text)
            
            # B. Metni LangChain ile Anlamlı Parçalara (Chunk) Böl
            text_chunks = rag_service.text_splitter.split_text(masked_text)
            
            # C. Parçalara Kimlik Kartı (Metadata) Tak (Hangi doküman, hangi departman?)
            metadatas = [
                {
                    "document_id": doc.id,
                    "department_id": doc.department_id,
                    "chunk_index": i
                } for i in range(len(text_chunks))
            ]
            
            # D. ChromaDB Vektör Veritabanına Kaydet (Uzun Süreli Hafıza)
            vector_service.save_chunks_to_db(chunks=text_chunks, metadatas=metadatas)
            logger.info("Vektör veritabanına %d parça başarıyla eklendi | ID: %s", len(text_chunks), document_id)
        # ==========================================

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