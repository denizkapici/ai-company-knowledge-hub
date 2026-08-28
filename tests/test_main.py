from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    
    response = client.get("/")
    assert response.status_code == 200

def test_validation_error_handler():
   
    response = client.post("/auth/login", data={})
    
    # 1. HTTP kodu 422 mi?
    assert response.status_code == 422
    
    # 2. Bizim JSON şablonumuz mu dönüyor?
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert "trace_id" in data

def test_unauthorized_access_handler():
    
    response = client.get("/documents/")
    
    assert response.status_code == 401
    data = response.json()
    assert data["error_code"] == "HTTP_ERROR"
    assert "trace_id" in data