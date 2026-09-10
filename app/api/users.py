from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel # YENİ EKLENDİ: Role güncellemesi için
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.api.deps import require_role
from app.database import get_db

router = APIRouter()

# ==========================================
# 🛡️ YARDIMCI ŞEMA (Sadece yetki güncellemek için)
# ==========================================
class RoleUpdateRequest(BaseModel):
    role: str


@router.post(
    "/",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kullanıcı kaydet (Yalnızca Admin)"
)
def create_new_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut."
        )
    return crud.create_user(db=db, user=user)


@router.get(
    "/",
    response_model=List[schemas.UserResponse],
    summary="Tüm kullanıcıları listele (Yalnızca Admin)"
)
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    return crud.get_users(db=db, skip=skip, limit=limit)


# ==========================================
# 🗑️ KULLANICI SİLME ENDPOINT'İ
# ==========================================
@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Kullanıcıyı sistemden sil (Yalnızca Admin)"
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    # 1. Güvenlik: Admin'in yanlışlıkla kendini silmesini engelle
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kendi hesabınızı silemezsiniz!"
        )

    # 2. Kullanıcıyı bul
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı.")

    # 3. Veritabanından sil ve kaydet
    db.delete(user)
    db.commit()
    return


# ==========================================
# 👑 KULLANICI YETKİSİ (ROLE) GÜNCELLEME
# ==========================================
@router.put(
    "/{user_id}/role",
    response_model=schemas.UserResponse,
    summary="Kullanıcı yetkisini güncelle (Yalnızca Admin)"
)
def update_user_role(
    user_id: int,
    role_data: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    # 1. Güvenlik: Admin'in kazara kendi yetkisini düşürmesini engelle
    if current_user.id == user_id and role_data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kendi admin yetkinizi düşüremezsiniz!"
        )

    # 2. Kullanıcıyı bul
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı.")

    # 3. Geçerli rol kontrolü
    valid_roles = ["employee", "manager", "admin"]
    if role_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geçersiz yetki! Geçerli yetkiler: {', '.join(valid_roles)}"
        )

    # 4. Yetkiyi güncelle ve kaydet
    user.role = role_data.role
    db.commit()
    db.refresh(user)
    
    return user


# ==========================================
# 📊 YENİ: SİSTEM İSTATİSTİKLERİ (DASHBOARD)
# ==========================================
@router.get(
    "/stats",
    summary="Dashboard için sistem istatistiklerini getir (Yalnızca Admin)"
)
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    """
    Tüm sistem verilerini toparlayıp React arayüzündeki Dashboard grafikleri 
    için JSON olarak döner.
    """
    # Tablolardaki toplam kayıt sayılarını alıyoruz
    total_users = db.query(models.User).count()
    
    # DİKKAT: Aşağıdaki modeller senin 'models.py' dosyasında nasıl geçiyorsa öyle kalmalı.
    # Örn: Eğer ChatSession ismi farklıysa (örn: ChatHistory), onu değiştirmelisin.
    total_docs = db.query(models.Document).count()
    total_chats = db.query(models.ChatSession).count()
    total_departments = db.query(models.Department).count()

    # Departmanlara göre kullanıcı dağılımı (Grafik Verisi)
    department_stats = []
    departments = db.query(models.Department).all()
    
    for dept in departments:
        # Bu departmana ait kaç kullanıcı var buluyoruz
        user_count = db.query(models.User).filter(models.User.department_id == dept.id).count()
        department_stats.append({
            "name": dept.name,
            "kullaniciSayisi": user_count
        })

    return {
        "summary": {
            "total_users": total_users,
            "total_docs": total_docs,
            "total_chats": total_chats,
            "total_departments": total_departments
        },
        "chart_data": department_stats
    }