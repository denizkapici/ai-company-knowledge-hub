import enum
from datetime import datetime,timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text,BigInteger,Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.sql import func 

class UserRole(str, enum.Enum):
      ADMIN = "admin"
      MANAGER = "manager"
      EMPLOYEE = "employee"

class DocumentStatus(str, enum.Enum):
    pending = "pending"       # Bekliyor
    processing = "processing" # İşleniyor (Yapay zeka tarafından)
    completed = "completed"   # Tamamlandı
    failed = "failed"         # Hata aldı
      
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # İlişki: Bir departmanın birden çok kullanıcısı olabilir (One-to-Many)
    users = relationship("User", back_populates="department", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.EMPLOYEE.value, nullable=False)  # admin, manager, employee
    is_active = Column(Boolean, default=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    
    # İlişki: Kullanıcının bağlı olduğu departman
    department = relationship("Department", back_populates="users")
    documents = relationship("Document", back_populates="uploader")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    file_path = Column(String, unique=True, nullable=False)  # Dosyanın sunucudaki veya buluttaki yolu
    file_size = Column(BigInteger, nullable=False)           # MB/GB cinsinden büyük dosyalar için BigInteger
    mime_type = Column(String, nullable=False)               # Örn: "application/pdf"
    
    # Enum kullanımımız: SQLAlchemy'e bunun bir Enum olduğunu söylüyoruz
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.pending, nullable=False)
    
    # Zaman damgaları (Loglama için çok önemlidir)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # İlişkiler (Foreign Keys)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ORM İlişki Tanımlamaları
    department = relationship("Department", back_populates="documents")
    uploader = relationship("User", back_populates="documents")