import enum
from datetime import datetime,timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
      ADMIN = "admin"
      MANAGER = "manager"
      EMPLOYEE = "employee"
      
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # İlişki: Bir departmanın birden çok kullanıcısı olabilir (One-to-Many)
    users = relationship("User", back_populates="department", cascade="all, delete-orphan")


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

