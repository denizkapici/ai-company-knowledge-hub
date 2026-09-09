from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_ # ✨ YENİ EKLENDİ: "Veya" sorguları için (Global dokümanlar)
from app import models, schemas
from app.core.security import get_password_hash, verify_password
from app.models import Document, User


# ==========================================
# 🏢 DEPARTMAN CRUD İŞLEMLERİ
# ==========================================

def get_department_by_name(db: Session, name: str) -> Optional[models.Department]:
    """İsme göre departman sorgular."""
    return db.query(models.Department).filter(models.Department.name == name).first()


def get_department_by_id(db: Session, department_id: int) -> Optional[models.Department]:
    """ID'ye göre departman ve bağlı kullanıcıları getirir."""
    return db.query(models.Department).filter(models.Department.id == department_id).first()


def get_departments(db: Session, skip: int = 0, limit: int = 100) -> List[models.Department]:
    """Tüm departmanları listeler."""
    return db.query(models.Department).offset(skip).limit(limit).all()


def create_department(db: Session, department: schemas.DepartmentCreate) -> models.Department:
    """Yeni departman kaydı oluşturur."""
    db_dept = models.Department(
        name=department.name,
        description=department.description
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept


# ==========================================
# 👤 KULLANICI & AUTH CRUD İŞLEMLERİ
# ==========================================

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """E-posta adresine göre kullanıcı arar."""
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """ID'ye göre kullanıcı arar."""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    """Tüm kullanıcıları departman bilgileriyle birlikte listeler."""
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Yeni kullanıcı oluşturur ve parolasını Bcrypt ile hashleyerek kaydeder."""
    hashed_pwd = get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role or "employee",
        is_active=user.is_active,
        department_id=user.department_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    """Kullanıcının e-posta ve parola doğruluğunu kontrol eder."""
    user = get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ==========================================
# 📄 DOKÜMAN CRUD İŞLEMLERİ (GÜVENLİ MULTI-TENANCY)
# ==========================================

# --- DOKÜMAN LİSTELEME VE FİLTRELEME (DEPARTMAN VE ROL BAZLI) ---
def get_documents_by_department(
    db: Session, 
    current_user: models.User, # 🛠️ DÜZELTME: Sadece departman_id değil, artık tüm kullanıcıyı alıyoruz (Rolünü bilmek için)
    skip: int = 0, 
    limit: int = 50,
    search_title: Optional[str] = None,
    status_filter: Optional[str] = None
) -> List[Document]:
    """
    Kullanıcının rolüne göre dokümanları getirir (Veri İzolasyonu).
    Admin: Tüm dokümanları görür.
    Çalışan: Sadece kendi departmanını VE Tüm Şirkete Açık (Global/NULL) olanları görür.
    """
    query = db.query(Document)

    # 🛡️ GÜVENLİK: Admin değilse filtre uygula (Admin ise her şeyi görür)
    if current_user.role != "admin":
        query = query.filter(
            or_(
                Document.department_id == current_user.department_id,
                Document.department_id == None  # Genel/Global Belgeler
            )
        )

    # Arama Motoru
    if search_title:
        query = query.filter(Document.title.ilike(f"%{search_title}%"))
        
    # Durum Filtresi
    if status_filter:
        query = query.filter(Document.status == status_filter)

    return query.offset(skip).limit(limit).all()


# --- TEKİL DOKÜMAN GETİRME (GÜVENLİ İNDİRME/SİLME İÇİN) ---
def get_document_by_id_and_department(db: Session, document_id: int, current_user: models.User) -> Optional[Document]:
    """
    Güvenlik Kontrolü (IDOR): Dosya indirme, silme ve özetleme işlemleri için koruma.
    Admin her dosyaya erişebilir, çalışan sadece kendi departmanına veya Global belgelere erişebilir.
    """
    query = db.query(Document).filter(Document.id == document_id)
    
    # 🛡️ GÜVENLİK: Admin değilse erişimi kısıtla
    if current_user.role != "admin":
        query = query.filter(
            or_(
                Document.department_id == current_user.department_id,
                Document.department_id == None
            )
        )
        
    return query.first()