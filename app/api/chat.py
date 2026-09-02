from typing import List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Servislerimizi ve LangChain sarmalayıcısını içeri aktarıyoruz
from app.services.chat_service import get_chat_response_stream
from app.services.vector_service import vector_service  
from langchain_community.vectorstores import Chroma

router = APIRouter(
    prefix="/api/v1/chat",
    tags=["Chat API"]
)

# 1. Hafıza için Mesaj Modelini tanımlıyoruz
class Message(BaseModel):
    role: str      # "user" (kullanıcı) veya "assistant" (yapay zeka)
    content: str   # Mesajın içeriği

# 2. Chat İstek modeline history'i ekliyoruz
class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Message]] = []  # Varsayılan olarak boş liste (Geçmiş yoksa hata vermez)

@router.post("/")
async def chat_with_documents(request: ChatRequest):
    try:
        # İsteği alıyoruz
        question = request.question
        history = request.history  # <-- Yeni eklenen geçmiş verisi
        
        # İŞTE SİHİRLİ KISIM: ChromaDB'yi LangChain formatına çeviriyoruz
        langchain_vector_store = Chroma(
            client=vector_service.client,
            collection_name="kodpit_documents",
            embedding_function=vector_service.embeddings
        )
        
        # 3. History parametresini servise gönderiyoruz
        generator = get_chat_response_stream(
            question=question, 
            history=history, 
            vector_store=langchain_vector_store
        )
        
        # Akışı başlat
        return StreamingResponse(generator, media_type="text/event-stream")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sohbet sırasında bir hata oluştu: {str(e)}")