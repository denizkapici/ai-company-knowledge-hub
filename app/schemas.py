from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict,Field
from app.models import DocumentStatus
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

# ==========================================
# DEPARTMAN ŞEMALARI (Department Schemas)
# ==========================================

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    # Pydantic v2 ORM uyumluluğu (SQLAlchemy modellerini otomatik dönüştürür)
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# KULLANICI ŞEMALARI (User Schemas)
# ==========================================

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role:UserRole = UserRole.EMPLOYEE
    is_active: Optional[bool] = True
    department_id: Optional[int] = None


class UserCreate(UserBase):
    password: str  # Kullanıcı kaydolurken ham şifreyi alırız


class UserResponse(UserBase):
    id: int
    created_at: datetime
    department: Optional[DepartmentResponse] = None  # Kullanıcının bağlı olduğu departman bilgisi

    model_config = ConfigDict(from_attributes=True)


# Departman detayında o departmana bağlı kullanıcıları listelemek için:
class DepartmentDetailResponse(DepartmentResponse):
    users: List[UserResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# AUTH & TOKEN ŞEMALARI
# ==========================================

class Token(BaseModel):
    access_token: str
    token_type: str 


class TokenData(BaseModel):
    email: Optional[str] = None


# Tüm şemaların atası (Ortak alanlar)
class DocumentBase(BaseModel):
    title: str
    file_path: str
    file_size: int
    mime_type: str
    status: DocumentStatus = DocumentStatus.pending

# Kullanıcı yeni doküman eklerken kullanılacak şema
class DocumentCreate(DocumentBase):
    department_id: Optional[int] = None
    
# API'den kullanıcıya cevap olarak dönecek şema
class DocumentResponse(DocumentBase):
    id: int
    department_id: Optional[int]
    uploaded_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # SQLAlchemy objesini JSON'a çevirmeyi sağlar


# ==========================================
# YAPAY ZEKA (RAG) ŞEMALARI
# ==========================================

class DocumentChunk(BaseModel):
    # Metnin kendisi
    page_content: str = Field(..., description="Bölünmüş metin parçasının kendisi (Chunk)")
    
    # Metadata (Kimlik Bilgileri)
    document_id: int = Field(..., description="Bu parçanın ait olduğu orijinal dokümanın ID'si")
    page_number: int = Field(..., description="Metnin bulunduğu sayfa numarası")
    department_id: Optional[int] = Field(None, description="Dokümanın ait olduğu departman ID'si (Erişim yetkisi için)")
    chunk_index: int = Field(..., description="Bu parçanın doküman içindeki sıra numarası")

    # Pydantic v2 standartlarında örnek veri gösterimi
    model_config = ConfigDict(
        json_schema_extra = {
            "example": {
                "page_content": "Şirketimizin yıllık izin prosedürü gereği, çalışanlar...",
                "document_id": 5,
                "page_number": 12,
                "department_id": 2,
                "chunk_index": 45
            }
        }
    )


class DocumentUploadResponse(BaseModel):
    status: str = Field(..., description="İşlemin başarı durumu (success/error)")
    filename: str = Field(..., description="Yüklenen dosyanın adı")
    message: str = Field(..., description="Kullanıcıya gösterilecek bilgi mesajı")
    chunk_count: int = Field(default=0, description="Dosyadan çıkarılan ve veritabanına kaydedilen parça sayısı")