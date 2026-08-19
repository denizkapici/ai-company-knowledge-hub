import hashlib
from typing import List, Optional
from sqlalchemy.orm import Session
from app import models, schemas


# ==========================================
# YARDIMCI GÜVENLİK FONKSİYONLARI
# ==========================================

def get_password_hash(password: str) -> str:
    """Geçici parola hashleme (İlerleyen aşamada bcrypt/passlib entegre edilebilir)."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ==========================================
# DEPARTMAN CRUD İŞLEMLERİ
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
# KULLANICI CRUD İŞLEMLERİ
# ==========================================

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """E-posta adresine göre kullanıcı arar."""
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    """Tüm kullanıcıları departman bilgileriyle birlikte listeler."""
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Yeni kullanıcı oluşturur ve şifresini hashleyerek kaydeder."""
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