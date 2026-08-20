from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


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
    role: Optional[str] = "employee"
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
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None