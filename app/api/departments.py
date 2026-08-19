from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=schemas.DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_new_department(department: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    """Yeni bir departman oluşturur."""
    db_dept = crud.get_department_by_name(db, name=department.name)
    if db_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu isimde bir departman zaten mevcut."
        )
    return crud.create_department(db=db, department=department)


@router.get("/", response_model=List[schemas.DepartmentResponse])
def read_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Tüm departmanları listeler."""
    return crud.get_departments(db=db, skip=skip, limit=limit)


@router.get("/{department_id}", response_model=schemas.DepartmentDetailResponse)
def read_department(department_id: int, db: Session = Depends(get_db)):
    """Departman detayını ve bağlı çalışanlarını getirir."""
    db_dept = crud.get_department_by_id(db, department_id=department_id)
    if not db_dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departman bulunamadı."
        )
    return db_dept