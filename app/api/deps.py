from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import List
from app import crud, models, schemas
from app.core.config import settings
from app.database import get_db

# Swagger UI üzerindeki Authorize butonunun yönleneceği token URL'si
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> models.User:
    """JWT Access Token'ı doğrular ve veritabanından kullanıcı nesnesini çeker."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı, geçersiz veya süresi dolmuş token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Token şifresini çöz ve payload'dan e-postayı oku
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kullanıcı hesabı pasif durumda."
        )
    return user

def require_role(allowed_roles: List[str]):
    """
    Belirli rollere sahip kullanıcıların endpoint'e erişmesini sağlayan dependency.
    Yetkisiz erişimde 403 Forbidden hatası döner.
    """
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için yetkiniz bulunmamaktadır. Gerekli rol: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker