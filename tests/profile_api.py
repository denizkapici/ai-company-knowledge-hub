import os
from pyinstrument import Profiler
from fastapi.testclient import TestClient
from app.main import app

# Sistemi ayağa kaldırmadan test edebilmek için TestClient kullanıyoruz
client = TestClient(app)

def run_performance_profile():
    print("="*50)
    print("⏱️ PYINSTRUMENT: PERFORMANS MR'I ÇEKİLİYOR...")
    print("="*50)
    
    # 1. MR Makinesini başlat (0.001 milisaniye hassasiyetle)
    profiler = Profiler(interval=0.001, async_mode="enabled")
    profiler.start()
    
    # 2. Sistemi Yoran İşlemleri Simüle Et (İstekler atıyoruz)
    # Örneğin: Geçersiz bir login denemesi yapalım
    client.post("/auth/login", data={"username": "test", "password": "123"})
    
    # Ana sayfaya (veya başka bir endpoint'e) istek atalım
    client.get("/")
    
    # 3. MR Makinesini durdur
    profiler.stop()
    
    # 4. Raporu HTML dosyası olarak kaydet
    output_file = "profiling_report.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(profiler.output_html())
        
    print(f"✅ Röntgen başarıyla çekildi!")
    print(f"📄 Lütfen projenin ana dizinindeki '{output_file}' dosyasını tarayıcınızda açın.")
    print("="*50)

if __name__ == "__main__":
    run_performance_profile()