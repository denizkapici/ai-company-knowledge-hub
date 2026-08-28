from fastapi import status

class AppException(Exception):
    """
    Tüm özel hatalarımızın türeyeceği 'Ana Hata' sınıfı.
    Bu sayede tüm hatalarımız aynı standart şablona (error_code, message, detail) sahip olacak.
    """
    def __init__(self, status_code: int, error_code: str, message: str, detail: str = None):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.detail = detail


# ==========================================
# 📄 DOKÜMAN VE YETKİ HATALARI
# ==========================================

class DocumentNotFoundError(AppException):
    def __init__(self, detail: str = "İstenen doküman veritabanında veya diskte bulunamadı."):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="DOC_NOT_FOUND",
            message="Doküman Bulunamadı",
            detail=detail
        )

class DepartmentNotMatchError(AppException):
    def __init__(self, detail: str = "Bu dokümana erişim veya işlem yapma yetkiniz (departmanınız) bulunmamaktadır."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="DEPT_NOT_MATCH",
            message="Yetkisiz Departman Erişimi",
            detail=detail
        )

class InvalidFileTypeError(AppException):
    def __init__(self, detail: str = "Desteklenmeyen dosya formatı yüklendi."):
        super().__init__(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            error_code="INVALID_FILE_TYPE",
            message="Geçersiz Dosya Formatı",
            detail=detail
        )

class FileSizeLimitExceededError(AppException):
    def __init__(self, detail: str = "Yüklenen dosya boyutu izin verilen sınırı aşıyor."):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            error_code="FILE_SIZE_EXCEEDED",
            message="Dosya Boyutu Sınırı Aşıldı",
            detail=detail
        )