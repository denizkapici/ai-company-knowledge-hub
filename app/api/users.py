from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.api.deps import require_role
from app.database import get_db

router = APIRouter()

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