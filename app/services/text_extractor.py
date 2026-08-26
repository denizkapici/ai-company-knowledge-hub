import re
import logging
import asyncio
import fitz  # PyMuPDF
import docx
import aiofiles

logger = logging.getLogger(__name__)

# ─── 1. Metin Temizleme (Sanitization) Fonksiyonu ─────────────────────────────
def clean_text(text: str) -> str:
    if not text:
        return ""
    

    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    

    text = re.sub(r' {2,}', ' ', text)
    
 
    text = re.sub(r'\n{3,}', '\n\n', text)
    

    return text.strip()

# ─── 2. PDF Okuma Fonksiyonu (Senkron) ────────────────────────────────────────
def _read_pdf_sync(file_path: str) -> str:
    text_parts = []
    try:
        # PyMuPDF ile dosyayı aç
        with fitz.open(file_path) as doc:
            for page_num, page in enumerate(doc, start=1):
                text = page.get_text("text")
                if text:
                    cleaned_text = clean_text(text)

                    text_parts.append(f"--- Sayfa {page_num} ---\n{cleaned_text}")
                    
        return "\n\n".join(text_parts)
    except Exception as e:
        logger.error(f"PDF okuma hatası | dosya: {file_path} | hata: {str(e)}")
        raise

# ─── 3. DOCX Okuma Fonksiyonu (Senkron) ───────────────────────────────────────
def _read_docx_sync(file_path: str) -> str:
    text_parts = []
    try:
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            cleaned_text = clean_text(para.text)
            if cleaned_text:
                text_parts.append(cleaned_text)
                
        return "\n".join(text_parts)
    except Exception as e:
        logger.error(f"DOCX okuma hatası | dosya: {file_path} | hata: {str(e)}")
        raise

# ─── 4. ANA YÖNLENDİRİCİ FONKSİYON (Asenkron) ──────────────────────────────────
async def extract_content(file_path: str, mime_type: str) -> str:
    """
    Dosyanın MIME türüne göre uygun okuyucuyu tetikler.
    İşlemciyi (CPU) yoran PDF ve DOCX okuma işlemlerini FastAPI'nin
    ana event-loop'unu kilitlememesi için ayrı bir thread'de (to_thread) çalıştırır.
    """
    logger.info(f"Metin çıkarma işlemi başladı | tür: {mime_type} | yol: {file_path}")
    
    try:
        if mime_type == "application/pdf":

            extracted_text = await asyncio.to_thread(_read_pdf_sync, file_path)
            
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # DOCX okuma
            extracted_text = await asyncio.to_thread(_read_docx_sync, file_path)
            
        elif mime_type in ["text/plain", "text/markdown"]:

            async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                content = await f.read()
                extracted_text = clean_text(content)
                
        else:
            raise ValueError(f"Desteklenmeyen dosya türü çıkarımı yapılamaz: {mime_type}")
            
        logger.info(f"Metin çıkarma başarılı | yol: {file_path} | Karakter Sayısı: {len(extracted_text)}")
        return extracted_text

    except Exception as e:
        logger.error(f"Metin çıkarma başarısız | yol: {file_path} | hata: {str(e)}")
        raise