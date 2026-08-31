import pymupdf
import os
from app.services.rag_service import rag_service

pdf_path = "kodpit_gizlilik_testi.pdf"
doc = pymupdf.open()

# Kutuya sığması için çarpı 20 yerine sadece çarpı 3 yapıyoruz!
sayfa_metni = (
    "Sirket personeli Ali Yilmaz'in TC Kimlik Numarasi 12345678901, "
    "maas yatirilacak IBAN numarasi TR123456789012345678901234 ve "
    "kullandigi sirket kredi karti 4545-4545-4545-4545'tir. Bu bilgiler cok gizlidir.\n\n"
) * 3 

for i in range(1): # Tek sayfa test için yeterli
    page = doc.new_page()
    # Metni sayfaya basıyoruz
    page.insert_textbox(pymupdf.Rect(50, 50, 500, 800), sayfa_metni, fontsize=12)

doc.save(pdf_path)
doc.close()

print(f"📄 '{pdf_path}' oluşturuldu. Güvenlik Duvarı (PII Masking) test ediliyor...\n")

chunks = rag_service.process_pdf_to_chunks(file_path=pdf_path, document_id=2, department_id=1)

print(f"✅ Başarılı! Metin bölündü. Şimdi yapay zekaya gidecek metne (sansüre) bakalım:\n")

for chunk in chunks:
    print(f"📝 SANSÜRLÜ İÇERİK | {chunk.page_content} \n")
    print("-" * 80)

if os.path.exists(pdf_path):
    os.remove(pdf_path)