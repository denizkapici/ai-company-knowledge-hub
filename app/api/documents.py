import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, Document, DocumentStatus
from app.schemas import DocumentResponse
from app.api.deps import get_current_user
from app.services.file_service import save_upload_file
from app.services.document_processor import process_document_pipeline
from app import crud

# YENİ: Özel Hata Sınıflarımızı İçeri Aktarıyoruz
from app.core.exceptions import (
    DocumentNotFoundError, 
    DepartmentNotMatchError, 
    InvalidFileTypeError, 
    FileSizeLimitExceededError
)

router = APIRouter(prefix="/documents", tags=["Documents"])

# ==========================================
# 🛡️ GÜVENLİK SINIRLARI (HARD LIMITS)
# ==========================================
MAX_FILE_SIZE_MB = 20  # Maksimum dosya boyutu (20 MB)
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


# --- 1. ASENKRON DOKÜMAN YÜKLEME ---
@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asenkron Doküman Yükleme (Limit Korumalı)"
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description=f"Yüklenecek belge (Maks {MAX_FILE_SIZE_MB}MB - PDF, DOCX, TXT, MD)"),
    title: str = Form(None, description="Doküman başlığı (Opsiyonel, verilmezse dosya adı kullanılır)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Belirtilen dosyayı boyut ve uzantı limitlerine göre doğrular,
    güvenli şekilde diske kaydeder ve arka plan işlemine gönderir.
    """
    # 1. UZANTI (EXTENSION) KONTROLÜ
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        # TERTEMİZ HATA FIRLATMA
        raise InvalidFileTypeError(
            detail=f"Desteklenmeyen dosya türü! Sadece şu formatlara izin verilmektedir: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. BOYUT (SIZE) KONTROLÜ
    if file.size and file.size > MAX_FILE_SIZE_BYTES:
        # TERTEMİZ HATA FIRLATMA
        raise FileSizeLimitExceededError(
            detail=f"Dosya boyutu çok büyük! Maksimum izin verilen boyut: {MAX_FILE_SIZE_MB} MB."
        )

    # 3. Dosyayı doğrula ve kaydet
    file_path, file_size, real_mime = await save_upload_file(file)

    # 4. Başlık belirtilmemişse orijinal dosya adını kullan
    doc_title = title if title else (file.filename or "Adsız Doküman")

    # 5. Veritabanına PENDING durumunda ekle
    new_doc = Document(
        title=doc_title,
        file_path=file_path,
        file_size=file_size,
        mime_type=real_mime,
        status=DocumentStatus.pending,
        uploaded_by=current_user.id,
        department_id=current_user.department_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 6. Arka plan görevini kuyruğa ekle
    background_tasks.add_task(process_document_pipeline, new_doc.id)

    return new_doc


# --- 2. DEPARTMANA ÖZEL LİSTELEME VE ARAMA ENDPOINT'İ ---
@router.get(
    "/",
    response_model=List[DocumentResponse],
    summary="Departmana ait dokümanları listele ve filtrele"
)
def get_department_documents(
    skip: int = Query(0, ge=0, description="Atlanacak kayıt sayısı"),
    limit: int = Query(50, le=100, description="Getirilecek maksimum kayıt"),
    search_title: Optional[str] = Query(None, description="Dosya adında geçen kelimeye göre ara"),
    status_filter: Optional[str] = Query(None, description="Örn: PENDING, PROCESSED, FAILED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sisteme giriş yapmış kullanıcının sadece kendi departmanına ait belgeleri getirir.
    """
    documents = crud.get_documents_by_department(
        db=db,
        department_id=current_user.department_id,
        skip=skip,
        limit=limit,
        search_title=search_title,
        status_filter=status_filter
    )
    return documents


# --- 3. GÜVENLİ DOSYA İNDİRME ENDPOINT'İ ---
@router.get("/{document_id}/download", summary="Dokümanı güvenli bir şekilde indir")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kullanıcı ID'sini bildiği bir dosyayı indirmek istediğinde, dosyanın kendi 
    departmanına ait olup olmadığı kontrol edilir (IDOR Koruması).
    """
    document = crud.get_document_by_id_and_department(
        db=db, 
        document_id=document_id, 
        department_id=current_user.department_id
    )
    
    # Eğer belge yoksa veya BAŞKA BİR DEPARTMANA aitse
    if not document:
        raise DepartmentNotMatchError(detail="Bu doküman bulunamadı veya indirmek için erişim yetkiniz yok!")
    
    # Dosyanın diskte gerçekten var olup olmadığını kontrol et
    if not os.path.exists(document.file_path):
         raise DocumentNotFoundError(detail="Fiziksel dosya diskte bulunamadı, muhtemelen silinmiş.")
    
    return FileResponse(
        path=document.file_path, 
        filename=document.title,
        media_type=document.mime_type
    )


# --- 4. GÜVENLİ DOSYA SİLME ENDPOINT'İ ---
@router.delete(
    "/{document_id}", 
    status_code=status.HTTP_204_NO_CONTENT, 
    summary="Dokümanı güvenli bir şekilde sil"
)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kullanıcının sadece kendi departmanına ait olan dosyaları silebilmesini sağlar.
    Ayrıca dosyayı fiziksel olarak sunucu diskinden de temizler.
    """
    document = crud.get_document_by_id_and_department(
        db=db, 
        document_id=document_id, 
        department_id=current_user.department_id
    )
    
    if not document:
        raise DepartmentNotMatchError(detail="Silmek istediğiniz doküman bulunamadı veya buna yetkiniz yok!")
        
    # 1. Fiziksel dosyayı diskten sil (Yer tasarrufu ve temizlik)
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
        
    # 2. Veritabanından kaydı sil
    db.delete(document)
    db.commit()
    
    return