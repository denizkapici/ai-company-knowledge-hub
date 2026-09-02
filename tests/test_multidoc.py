import requests

URL = "http://127.0.0.1:8000/api/v1/chat/"
history = []

def ask_question(question_text, step_name):
    global history
    payload = {
        "question": question_text,
        "history": history
    }
    
    print(f"\n{'='*75}")
    print(f"🧪 SAĞLAM TEST: {step_name}")
    print(f"👤 Soru: {question_text}")
    print(f"{'-'*75}\n🤖 Cevap: \n", end="")
    
    full_response = ""
    try:
        with requests.post(URL, json=payload, stream=True) as r:
            r.raise_for_status() 
            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    text = chunk.decode('utf-8')
                    print(text, end='', flush=True)
                    full_response += text
        
        print() 
        history.append({"role": "user", "content": question_text})
        history.append({"role": "assistant", "content": full_response})
        
    except Exception as e:
        print(f"\n[Sunucu Hatası]: {e}")

print("=== KODPİT ÇAPRAZ SORGULAMA VE MANTIK TESTİ BAŞLIYOR ===")

# 1. AŞAMA: Sadece Fiyatlandırma Belgesi
ask_question(
    "Genel API fiyatlandırma politikasına göre, sisteme 1 adet belge yükleyip, ardından 4 tane chat (sohbet) sorusu soran standart bir kullanıcının toplam kaç kredisi gider?", 
    "1. Adım: Basit Matematik ve RAG"
)

# 2. AŞAMA: Çelişki ve Kural Ezme Testi (Cross-Document)
ask_question(
    "Omega A.Ş. normalde Kurumsal Paket kullanıcısı. Genel kurallara göre kurumsal paketin hız limiti dakikada 5000 istek. Peki SLA sözleşmesini de dikkate aldığında, Omega A.Ş. saniyede kaç chat isteği yapabilir? SLA anlaşması genel kuralları nasıl değiştiriyor?", 
    "2. Adım: Kural Ezme (İstisna Yakalama)"
)

# 3. AŞAMA: Çapraz Sentez ve Performans
ask_question(
    "Genel API kurallarında belirtilen maksimum 'Timeout' süresi ile Omega A.Ş.'ye verilen yanıt süresi garantisini (SLA) karşılaştırır mısın? Aradaki fark nedir?", 
    "3. Adım: Çapraz Belge Karşılaştırması"
)

# 4. AŞAMA: Hafıza Testi
ask_question(
    "Şu ana kadar konuştuğumuz, özel sınırlandırmaları olan bu kurumsal firmanın adı neydi?", 
    "4. Adım: Hafıza (Memory) Testi"
)

print("\n" + "="*75)
print("✅ TÜM TESTLER TAMAMLANDI!")
print("="*75)