from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Yeni bir kullanıcı kaydeder."""
    # 1. E-posta tekillik kontrolü
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var."
        )

    # 2. Departman ID girilmişse departmanın varlık kontrolü
    if user.department_id:
        dept = crud.get_department_by_id(db, department_id=user.department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Belirtilen departman bulunamadı."
            )

    return crud.create_user(db=db, user=user)


@router.get("/", response_model=List[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Tüm kullanıcıları departman bilgileriyle birlikte listeler."""
    return crud.get_users(db=db, skip=skip, limit=limit)