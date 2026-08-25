from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, status, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Document, DocumentStatus
from app.schemas import DocumentResponse
from app.api.deps import get_current_user
from app.services.file_service import save_upload_file
from app.services.document_processor import process_document_pipeline

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asenkron Doküman Yükleme"
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Yüklenecek belge (PDF, DOCX, TXT, MD)"),
    title: str = Form(None, description="Doküman başlığı (Opsiyonel, verilmezse dosya adı kullanılır)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Belirtilen dosyayı doğrular, güvenli şekilde diske kaydeder,
    veritabanında 'PENDING' durumunda kayıt açar ve arka planda
    işleme pipeline'ını tetikleyerek anında 202 Accepted döner.
    """
    # 1. Dosyayı doğrula ve kaydet (file_service 3 değer dönüyor)
    file_path, file_size, real_mime = await save_upload_file(file)

    # 2. Başlık belirtilmemişse orijinal dosya adını kullan
    doc_title = title if title else (file.filename or "Adsız Doküman")

    # 3. Veritabanına PENDING durumunda ekle
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

    # 4. Arka plan görevini kuyruğa ekle
    background_tasks.add_task(process_document_pipeline, new_doc.id)

    return new_doc