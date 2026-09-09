import logging
import mimetypes
from sqlalchemy.orm import Session
from app.models import Document, DocumentStatus
from app.database import SessionLocal
from app.services.text_extractor import extract_content  


# Yapay Zeka Servislerimiz
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

        # 1. Dosya tipinden bağımsız olarak metni çıkart
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
            
            # C. Parçalara Kimlik Kartı (Metadata) Tak
            metadatas = [
                {
                    "document_id": doc.id,
                    "department_id": doc.department_id,
                    "chunk_index": i
                } for i in range(len(text_chunks))
            ]
            
            # D. ChromaDB Vektör Veritabanına Kaydet
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

# ==========================================
# ✨ YENİ: YAPAY ZEKA DOKÜMAN ÖZETLEME FONKSİYONU
# ==========================================
async def generate_document_summary(file_path: str, title: str) -> str:
    try:
        logger.info(f"Özetleme işlemi başlatılıyor | Dosya: {title}")
        
        # 1. Dosyanın mime tipini tahmin et
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "text/plain"

        # 2. Metni çıkart 
        extracted_text = await extract_content(file_path=file_path, mime_type=mime_type)
        
        if not extracted_text or not extracted_text.strip():
            return "⚠️ Bu dokümandan metin çıkarılamadığı için özet oluşturulamadı."

        # 3. Token Sınırı Koruması 
        max_chars = 12000
        truncated_text = extracted_text[:max_chars]

        # 4. Yapay Zeka için Özel Sistem Promptu
        prompt = f"""
        Sen kıdemli bir kurumsal veri analistisin. Aşağıda içeriği verilen "{title}" başlıklı dokümanı incele.
        Lütfen bu dokümanın en kritik noktalarını, amacını ve önemli detaylarını 
        kurumsal bir dille, sadece 3-4 maddelik kısa bir 'Yönetici Özeti' (Executive Summary) olarak yaz.
        
        Doküman İçeriği:
        {truncated_text}
        
        Özet (Sadece maddeler halinde yaz, gereksiz giriş/çıkış cümleleri kullanma):
        """

        # 5. RAG Servisindeki LLM'i çağırıyoruz (Zırhlı Fallback Mekanizması)
        try:
            response = await rag_service.llm.ainvoke(prompt)
        except Exception as async_err:
            logger.warning(f"Asenkron istek başarısız oldu, normal (senkron) isteğe geçiliyor. Detay: {str(async_err)}")
            response = rag_service.llm.invoke(prompt)
        
        # 6. SİHİRLİ DOKUNUŞ: Gelen yanıtı güvenle string'e çeviriyoruz
        raw_content = response.content if hasattr(response, "content") else response
        
        if isinstance(raw_content, list):
            # Eğer cevap liste olarak geldiyse içindeki metinleri ayıkla
            texts = []
            for item in raw_content:
                if isinstance(item, dict) and "text" in item:
                    texts.append(item["text"])
                elif isinstance(item, str):
                    texts.append(item)
            summary = "\n".join(texts)
        else:
            # Standart metinse doğrudan al
            summary = str(raw_content)
        
        logger.info(f"Özetleme başarıyla tamamlandı | Dosya: {title}")
        return summary.strip()

    except Exception as e:
        hata_detayi = str(e)
        logger.error(f"Özetleme sırasında hata | Dosya: {title} | Hata: {hata_detayi}")
        return f"❌ Özet oluşturulurken bir hata meydana geldi.\n\nSistem Detayı: {hata_detayi}"