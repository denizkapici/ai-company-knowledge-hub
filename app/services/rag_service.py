import pymupdf
import re  # YENİ: Regex için Python'un yerleşik kütüphanesini ekliyoruz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.schemas import DocumentChunk

class RAGService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            model_name="gpt-3.5-turbo",
            chunk_size=1000,
            chunk_overlap=100
        )

    # YENİ EKLENEN FONKSİYON: Veri Maskeleme Motoru
    def mask_pii(self, text: str) -> str:
        """
        Metin içindeki hassas kişisel verileri (KVKK) maskeler.
        """
        # 1. T.C. Kimlik No Maskeleme (11 haneli rakamlar)
        text = re.sub(r'\b[1-9][0-9]{10}\b', '[TC_KIMLIK_GİZLENDİ]', text)
        
        # 2. IBAN Maskeleme (TR ile başlayan 26 karakter)
        text = re.sub(r'\bTR\d{24}\b', '[IBAN_GİZLENDI]', text)
        
        # 3. Kredi Kartı Maskeleme (16 haneli, tireli veya boşluklu)
        text = re.sub(r'\b(?:\d{4}[-\s]?){4}\b', '[KREDI_KARTI_GİZLENDI]', text)
        
        return text

    def process_pdf_to_chunks(self, file_path: str, document_id: int, department_id: int = None) -> list[DocumentChunk]:
        doc = pymupdf.open(file_path)
        document_chunks = []
        global_chunk_index = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            
            if not text.strip():
                continue

            # YENİ EKLENEN KISIM: Metni parçalamadan önce sansürden geçir!
            text = self.mask_pii(text)

            chunks = self.text_splitter.split_text(text)

            for chunk_content in chunks:
                chunk = DocumentChunk(
                    page_content=chunk_content,
                    document_id=document_id,
                    page_number=page_num + 1,
                    department_id=department_id,
                    chunk_index=global_chunk_index
                )
                document_chunks.append(chunk)
                global_chunk_index += 1

        return document_chunks

rag_service = RAGService()