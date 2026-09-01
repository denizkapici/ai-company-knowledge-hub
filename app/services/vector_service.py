import os
import uuid
import chromadb
from langchain_community.embeddings import HuggingFaceEmbeddings
import logging

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        try:
            # Lokal, ücretsiz ve Türkçe destekli çok dilli model (HuggingFace)
            model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
            
            # Veritabanının kaydedileceği klasör (Proje dizininde chroma_db adında klasör açar)
            db_path = os.path.join(os.getcwd(), "chroma_db")
            
            # ChromaDB İstemcisi (Kalıcı hafıza - Sunucu kapansa bile veriler silinmez)
            self.client = chromadb.PersistentClient(path=db_path)
            
            # Koleksiyon (Veritabanı tablosu) oluştur veya mevcut olanı al
            self.collection = self.client.get_or_create_collection(name="kodpit_documents")
            
            logger.info("Vektör veritabanı (ChromaDB) ve Embedding modeli başarıyla yüklendi.")
        except Exception as e:
            logger.error(f"VectorService başlatılamadı: {str(e)}")
            raise e

    def save_chunks_to_db(self, chunks: list[str], metadatas: list[dict]):
        """
        Dünkü rag_service'ten gelen metin parçalarını vektörlere çevirip kaydeder.
        """
        try:
            # Her bir parça (chunk) için benzersiz bir ID oluşturuyoruz
            ids = [str(uuid.uuid4()) for _ in range(len(chunks))]
            
            # Verileri ChromaDB'ye ekle 
            # (Metinleri vektöre çevirme işlemini HuggingFace arka planda otomatik yapar)
            self.collection.add(
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"{len(chunks)} adet metin parçası başarıyla veritabanına kaydedildi.")
            return True
            
        except Exception as e:
            logger.error(f"Veritabanına kayıt sırasında hata oluştu: {str(e)}")
            raise e

# Servisi projede kullanmak için bir instance (örnek) oluşturuyoruz
vector_service = VectorService()