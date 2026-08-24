from app.database import SessionLocal
from app.models import User, Department, Document, DocumentStatus

# Veritabanı oturumumuzu başlatıyoruz
db = SessionLocal()

try:
    # 1. Geçen hafta oluşturduğumuz ilk kullanıcıyı ve departmanı bulalım
    user = db.query(User).first()
    dept = db.query(Department).first()

    if not user:
        print("Sistemde kayıtlı kullanıcı bulunamadı! Lütfen önce bir kullanıcı ekleyin.")
    else:
        # 2. Örnek bir Doküman nesnesi oluşturalım
        new_doc = Document(
            title="Q3 Yapay Zeka Strateji Raporu",
            file_path="/uploads/q3_ai_strategy.pdf",
            file_size=2500000,  # Yaklaşık 2.5 MB
            mime_type="application/pdf",
            status=DocumentStatus.pending, # Enum testimiz
            department_id=dept.id if dept else None,
            uploaded_by=user.id # Yabancı anahtar testimiz
        )

        # 3. Veritabanına ekleyip kaydedelim
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc) # Veritabanından oluşan ID'yi çekmek için

        print("BAŞARILI! Veritabanına doküman kaydedildi.")
        print(f"Doküman ID: {new_doc.id}")
        print(f"Başlık: {new_doc.title}")
        print(f"Durum: {new_doc.status.value}")
        print(f"Yükleyen Kullanıcı ID: {new_doc.uploaded_by}")

except Exception as e:
    print("BİR HATA OLUŞTU:", e)
    db.rollback() # Hata olursa işlemi geri al
finally:
    db.close() # Oturumu temizce kapat