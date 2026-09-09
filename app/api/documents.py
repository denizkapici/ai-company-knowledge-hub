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
from app.services.document_processor import process_document_pipeline, generate_document_summary
from app import crud

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
MAX_FILE_SIZE_MB = 20  
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


# --- 1. ASENKRON ÇOKLU DOKÜMAN YÜKLEME ---
@router.post(
    "/upload",
    response_model=List[DocumentResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asenkron Çoklu Doküman Yükleme (Limit ve Departman Korumalı)"
)
async def upload_document(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description=f"Yüklenecek belgeler (Maks {MAX_FILE_SIZE_MB}MB - PDF, DOCX, TXT, MD)"),
    title: str = Form(None, description="Doküman başlığı (Birden fazla dosya varsa dosya adları kullanılır)"),
    # ✨ YENİ: Hangi departmana ait olduğunu arayüzden alıyoruz (Boşsa Global olur)
    department_id: Optional[int] = Form(None, description="Hedef Departman ID. Boş bırakılırsa Tüm Şirkete Açık (Global) olur."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Belirtilen dosyaları doğrular, diske kaydeder ve arka plan işlemine gönderir.
    Eklenen Hedef Departman özelliği ile dosyaların kimlere ait olacağı seçilebilir.
    """
    
    # 🛡️ YENİ GÜVENLİK (IDOR KORUMASI): Çalışanlar başkasının klasörüne dosya sızdıramaz!
    if current_user.role != "admin":
        if department_id is not None and department_id != current_user.department_id:
            raise DepartmentNotMatchError(
                detail="Sadece kendi departmanınıza veya 'Tüm Şirket' (Global) panosuna dosya yükleyebilirsiniz!"
            )

    uploaded_documents = []

    for file in files:
        # 1. UZANTI (EXTENSION) KONTROLÜ
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise InvalidFileTypeError(
                detail=f"Desteklenmeyen dosya türü ({file.filename})! Sadece şu formatlara izin verilmektedir: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # 2. BOYUT (SIZE) KONTROLÜ
        if file.size and file.size > MAX_FILE_SIZE_BYTES:
            raise FileSizeLimitExceededError(
                detail=f"Dosya boyutu çok büyük ({file.filename})! Maksimum izin verilen boyut: {MAX_FILE_SIZE_MB} MB."
            )

        # 3. Dosyayı doğrula ve kaydet
        file_path, file_size, real_mime = await save_upload_file(file)
        
        # Ekstra Boyut Kontrolü
        if file_size > MAX_FILE_SIZE_BYTES:
            os.remove(file_path)
            raise FileSizeLimitExceededError(
                detail=f"Dosya boyutu çok büyük ({file.filename})! Maksimum izin verilen boyut: {MAX_FILE_SIZE_MB} MB."
            )

        # 4. Başlık belirleme
        doc_title = title if title and len(files) == 1 else (file.filename or "Adsız Doküman")

        # 5. Veritabanına PENDING durumunda ekle
        new_doc = Document(
            title=doc_title,
            file_path=file_path,
            file_size=file_size,
            mime_type=real_mime,
            status=DocumentStatus.pending,
            uploaded_by=current_user.id,
            # ✨ YENİ: Artık kullanıcının zorunlu ID'si yerine, arayüzden seçilen ID'yi kullanıyoruz
            department_id=department_id 
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        uploaded_documents.append(new_doc)

        print(f"")
        print(f"🚀 [YÜKLEME BAŞARILI] Dosya sunucuya alındı: {new_doc.title} (Departman: {'Global' if department_id is None else department_id})")
        print(f"⏳ [ARKA PLAN GÖREVİ] AI Vektörizasyon kuyruğuna aktarıldı (Durum: PENDING)")
        print(f"")

        # 6. Arka plan görevini kuyruğa ekle
        background_tasks.add_task(process_document_pipeline, new_doc.id)

    return uploaded_documents


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
    documents = crud.get_documents_by_department(
        db=db,
        current_user=current_user,  # 🛠️ GÜNCELLENDİ: Artık yetki kontrolü için direkt kullanıcıyı yolluyoruz
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
    document = crud.get_document_by_id_and_department(
        db=db, 
        document_id=document_id, 
        current_user=current_user  # 🛠️ GÜNCELLENDİ
    )
    
    if not document:
        raise DepartmentNotMatchError(detail="Bu doküman bulunamadı veya indirmek için erişim yetkiniz yok!")
    
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
    document = crud.get_document_by_id_and_department(
        db=db, 
        document_id=document_id, 
        current_user=current_user  # 🛠️ GÜNCELLENDİ
    )
    
    if not document:
        raise DepartmentNotMatchError(detail="Silmek istediğiniz doküman bulunamadı veya buna yetkiniz yok!")
        
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
        
    db.delete(document)
    db.commit()
    
    print(f"🗑️ [SİLİNDİ] Doküman sistemden temizlendi: {document.title}")
    return


# --- 5. AI DOKÜMAN ÖZETLEME ENDPOINT'İ ---
@router.get("/{document_id}/summary", summary="Yapay Zeka ile Yönetici Özeti Çıkar")
async def summarize_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = crud.get_document_by_id_and_department(
        db=db, 
        document_id=document_id, 
        current_user=current_user  # 🛠️ GÜNCELLENDİ
    )
    
    if not document:
        raise DepartmentNotMatchError(detail="Özetini çıkarmak istediğiniz doküman bulunamadı veya buna yetkiniz yok!")
        
    if not os.path.exists(document.file_path):
         raise DocumentNotFoundError(detail="Özetlenecek fiziksel dosya diskte bulunamadı.")

    summary_text = await generate_document_summary(document.file_path, document.title)
    
    return {
        "document_id": document.id, 
        "title": document.title, 
        "summary": summary_text
    }