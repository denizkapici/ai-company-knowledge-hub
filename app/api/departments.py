from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.api.deps import get_current_user, require_role
from app.database import get_db

router = APIRouter()

@router.post(
    "/",
    response_model=schemas.DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni departman oluştur (Admin & Manager)"
)
def create_new_department(
    department: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "manager"]))
):
    db_dept = crud.get_department_by_name(db, name=department.name)
    if db_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu isimde bir departman zaten mevcut."
        )
    return crud.create_department(db=db, department=department)


@router.get(
    "/",
    response_model=List[schemas.DepartmentResponse],
    summary="Tüm departmanları listele"
)
def read_departments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_departments(db=db, skip=skip, limit=limit)


@router.get(
    "/{department_id}",
    response_model=schemas.DepartmentDetailResponse,  # Senin yazdığın detaylı şemayı burada kullanıyoruz
    summary="Departman detayını getir"
)
def read_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_dept = crud.get_department(db, department_id=department_id)
    if not db_dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departman bulunamadı."
        )
    return db_dept