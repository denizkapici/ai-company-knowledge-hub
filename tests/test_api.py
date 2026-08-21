from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_users_without_token():
    """
    1. Senaryo: Token olmadan /users/ listesine erişmeye çalışmak (401 Bekleniyor)
    """
    response = client.get("/users/")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}

def test_get_departments_requires_token():
    """
    2. Senaryo: Departmanları listeleme uç noktasının güvenli olduğunu test etme (401 Bekleniyor)
    """
    response = client.get("/departments/")
    # Sistem doğru bir şekilde kodlanmış ve departmanları da dışarıya kapatmış!
    assert response.status_code == 401

def test_rbac_employee_cannot_view_users():
    """
    3. Senaryo: Admin olmayan bir çalışanın kullanıcıları görmesinin engellenmesi (403 Bekleniyor)
    """
    login_data = {
        "username": "test@company.com",
        "password": "TestPassword123!"
    }
    login_response = client.post("/auth/login", data=login_data)
    assert login_response.status_code == 200
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    users_response = client.get("/users/", headers=headers)
    assert users_response.status_code == 403
    assert users_response.json() == {"detail": "Bu işlem için yetkiniz bulunmamaktadır. Gerekli rol: admin"}