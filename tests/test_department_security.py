import requests

# API Adresimiz
BASE_URL = "http://127.0.0.1:8000"

# Test Kullanıcısı Bilgileri
LOGIN_DATA = {
    "username": "zeynep.demir@company.com",
    "password": "ZeynepSecure2026!"
}

def run_advanced_tests():
    print("🕵️‍♂️ Gelişmiş Güvenlik (IDOR) ve Arama Testleri Başlıyor...\n")

    # --- 1. LOGIN VE TOKEN ALMA ---
    login_response = requests.post(f"{BASE_URL}/auth/login", data=LOGIN_DATA)
    if login_response.status_code != 200:
        print("❌ Login başarısız! Sunucu açık mı?")
        return
        
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login başarılı, Token alındı.\n")

    # --- 2. HACKER TESTİ (IDOR - Unhappy Path) ---
    print("1. Siber Güvenlik Testi: Yetkisiz bir dosyaya (ID: 9999) erişim deneniyor...")
    # Zeynep, 9999 ID'li (ona ait olmayan veya olmayan) bir dosyayı indirmeye çalışıyor!
    idor_response = requests.get(f"{BASE_URL}/documents/9999/download", headers=headers)
    
    # Beklentimiz 403 (Erişim Reddedildi) veya 404 (Bulunamadı) almasıdır.
    if idor_response.status_code in [403, 404]:
        print(f"✅ GÜVENLİK TESTİ BAŞARILI! Sistem erişimi engelledi. (Dönen Kod: {idor_response.status_code})")
        print(f"   Sistem Mesajı: {idor_response.json().get('detail')}\n")
    else:
        print(f"❌ GÜVENLİK AÇIĞI (IDOR) TESPİT EDİLDİ! Sistem {idor_response.status_code} kodu döndürdü!\n")

    # --- 3. KELİME İLE ARAMA MOTORU TESTİ ---
    search_word = "rapor" # Veritabanında olabilecek bir kelime veya rastgele bir şey
    print(f"2. Arama Motoru Testi: Başlığında '{search_word}' geçen belgeler aranıyor...")
    
    search_response = requests.get(f"{BASE_URL}/documents/?search_title={search_word}", headers=headers)
    
    if search_response.status_code == 200:
        results = search_response.json()
        print(f"✅ Arama başarılı! '{search_word}' kelimesiyle eşleşen {len(results)} belge bulundu.\n")
    else:
        print(f"❌ Arama motoru hata verdi: {search_response.status_code}\n")

    print("🎉 Tüm gelişmiş testler tamamlandı!")

if __name__ == "__main__":
    run_advanced_tests()