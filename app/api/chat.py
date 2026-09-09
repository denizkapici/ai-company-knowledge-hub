import os
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

# Servislerimiz ve LangChain
from app.services.chat_service import get_chat_response_stream
from app.services.vector_service import vector_service  
from langchain_community.vectorstores import Chroma

# Veritabanı ve Modeller
from app.database import get_db
from app.api.deps import get_current_user
# ✨ DÜZELTME 1: Document modelini veritabanından isim çekmek için import ettik
from app.models import User, ChatSession, ChatMessage, Document
from app.schemas import ChatSessionResponse, ChatMessageResponse

router = APIRouter(
    prefix="/api/v1/chat",
    tags=["Chat API"]
)

# 🛠️ DÜZELTME 1: LangChain'in aradığı Message modelini geri getirdik
class Message(BaseModel):
    role: str
    content: str

# İstek Modeli
class ChatRequest(BaseModel):
    session_id: int
    question: str

# ==========================================
# 1. YENİ SOHBET OLUŞTURMA (NEW CHAT)
# ==========================================
@router.post("/sessions", response_model=ChatSessionResponse)
def create_chat_session(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_session = ChatSession(
        user_id=current_user.id, 
        title="Yeni Sohbet"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

# ==========================================
# 2. GEÇMİŞ SOHBETLERİ GETİRME (SOL MENÜ)
# ==========================================
@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_user_chat_sessions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(ChatSession)\
        .filter(ChatSession.user_id == current_user.id)\
        .order_by(ChatSession.created_at.desc())\
        .all()
    return sessions

# ==========================================
# 3. SOHBETİN İÇİNDEKİ GEÇMİŞ MESAJLARI GETİRME
# ==========================================
@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, 
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı.")
    
    messages = db.query(ChatMessage)\
        .filter(ChatMessage.session_id == session_id)\
        .order_by(ChatMessage.created_at.asc())\
        .all()
    return messages


# ==========================================
# 5. SOHBET SİLME (DELETE CHAT) - YENİ EKLENDİ
# ==========================================
@router.delete("/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, 
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı.")

    # Önce sohbete bağlı tüm mesajları siliyoruz (Veritabanı ilişkisi hatası almamak için)
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    
    # Sonra sohbetin kendisini siliyoruz
    db.delete(session)
    db.commit()

    return {"message": "Sohbet başarıyla silindi."}


# ==========================================
# 4. ANA SOHBET (CHAT) ENDPOINT'İ
# ==========================================
@router.post("/")
async def chat_with_documents(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Oturum (Session) güvenlik kontrolü
        session = db.query(ChatSession).filter(
            ChatSession.id == request.session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Geçerli bir sohbet oturumu bulunamadı.")

        # 2. Kullanıcının sorusunu veritabanına kaydet
        user_msg = ChatMessage(session_id=session.id, role="user", content=request.question)
        db.add(user_msg)
        
        if session.title == "Yeni Sohbet":
            session.title = request.question[:30] + "..." if len(request.question) > 30 else request.question
        
        db.commit()

        # 3. Geçmiş mesajları LangChain'in anlayacağı "Message" nesnesine çeviriyoruz
        db_messages = db.query(ChatMessage)\
            .filter(ChatMessage.session_id == session.id)\
            .order_by(ChatMessage.created_at.asc())\
            .all()
        
        history_list = [Message(role=m.role, content=m.content) for m in db_messages[:-1]] 

        # 4. ChromaDB'yi hazırla
        langchain_vector_store = Chroma(
            client=vector_service.client,
            collection_name="kodpit_documents",
            embedding_function=vector_service.embeddings
        )

        # ==========================================
        # 🚀 SİHİRLİ DÜZELTME: KESİN DOKÜMAN EŞLEŞTİRME VE İZOLASYON
        # ==========================================
        ref_data = None
        try:
            # 1. Arama Filtresi (Yapay Zeka kalkanımızı buraya da ekliyoruz)
            search_filter = None
            if current_user.role != "admin":
                search_filter = {
                    "$or": [
                        {"department_id": current_user.department_id},
                        {"department_id": None}
                    ]
                }

            # 2. Soruya en uygun parçayı (chunk) bul
            docs = langchain_vector_store.similarity_search(
                request.question, 
                k=1,
                filter=search_filter
            )
            
            if docs and len(docs) > 0:
                metadata = docs[0].metadata
                
                # 3. Parçanın hangi dokümana ait olduğunu ID'sinden bul
                doc_id = metadata.get("document_id")
                file_name = "Bilinmeyen Doküman"
                
                if doc_id:
                    # 4. Veritabanına gidip dokümanın GERÇEK adını çekiyoruz!
                    matched_db_doc = db.query(Document).filter(Document.id == doc_id).first()
                    if matched_db_doc:
                        file_name = matched_db_doc.title or "Belge"
                
                page_no = metadata.get("chunk_index", 0) + 1 
                
                # 5. Arayüze (React) nokta atışı tam ismi gönder
                ref_data = {"page": page_no, "source": file_name, "document_id": doc_id}
        except Exception as e:
            pass 
        # ==========================================

        # 5. LangChain servisine soruyu ve geçmişi yolla
        generator = get_chat_response_stream(
            question=request.question, 
            history=history_list, 
            vector_store=langchain_vector_store,
            current_user=current_user
        )
        
        # 6. SİHİRLİ KISIM: Async Akış ve Gizli Kod Gönderimi
        async def stream_and_save():
            full_ai_response = ""
            
            if ref_data:
                yield f"[[REF:{json.dumps(ref_data)}]]"
                
            async for chunk in generator:
                if chunk:
                    full_ai_response += chunk
                    yield chunk

            ai_msg = ChatMessage(session_id=session.id, role="assistant", content=full_ai_response)
            db.add(ai_msg)
            db.commit()

        return StreamingResponse(stream_and_save(), media_type="text/event-stream")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sistem Hatası: Yapay Zeka yanıt üretirken bir sorun yaşadı -> {str(e)}")