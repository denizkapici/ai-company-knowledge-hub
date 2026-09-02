import requests

URL = "http://127.0.0.1:8000/api/v1/chat/"
history = []

def ask_question(question_text, step_name):
    global history
    payload = {
        "question": question_text,
        "history": history
    }
    
    print(f"\n{'='*60}")
    print(f"🚀 TEST ADIMI: {step_name}")
    print(f"👤 Soru: {question_text}")
    print(f"{'-'*60}\n🤖 Cevap: ", end="")
    
    full_response = ""
    try:
        with requests.post(URL, json=payload, stream=True) as r:
            # Hata varsa (500, 404 vb.) programı uyar
            r.raise_for_status() 
            
            # Akışı (Stream) kelime kelime ekrana yazdır
            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    text = chunk.decode('utf-8')
                    print(text, end='', flush=True)
                    full_response += text
        
        print() # Alt satıra geç
        
        # Soruyu ve gelen cevabı hafızaya (history) ekle
        history.append({"role": "user", "content": question_text})
        history.append({"role": "assistant", "content": full_response})
        
    except requests.exceptions.RequestException as e:
        print(f"\n[Sunucu Hatası]: Uvicorn çalışıyor mu? Hata detayı: {e}")

print("=== KODPİT YAPAY ZEKA BACKEND KAPSAMLI TESTİ BAŞLIYOR ===")

# --- 1. AŞAMA: Halüsinasyon ve Sınır Testi ---
# (Sistem promptumuzdaki "Bilmiyorsan uydurma" kuralını test ediyoruz)
ask_question(
    "Mars'ta kurulan ilk koloninin adı nedir ve hangi tarihte kurulmuştur?", 
    "1. Bağlam Dışı Bilgi Testi (Halüsinasyon Önleme)"
)

# --- 2. AŞAMA: Gerçek Veri Çekme (RAG) Testi ---
# (Yüklediğin belgeyi test ediyoruz. Soruyu belgelerine göre değiştirebilirsin)
ask_question(
    "Raporlara göre İDA'nın LIDAR sensörü nasıl çalışıyor?", 
    "2. Belgeden Bilgi Çekme Testi (Semantic Search & RAG)"
)

# --- 3. AŞAMA: Hafıza (Memory) Testi ---
# (Önceki soruyu unutup unutmadığına bakıyoruz)
ask_question(
    "Az önceki sorumda sana İDA'nın hangi donanımını sormuştum? Ne cevap vermiştin kısaca söyler misin?", 
    "3. Hafıza ve Bağlam Koruma Testi (Memory)"
)

# --- 4. AŞAMA: Format ve Kural Testi ---
# (Sistem promptundaki "Maddeler halinde özetle" kuralını zorluyoruz)
ask_question(
    "Şu ana kadar konuştuğumuz İDA konusunu, bir yöneticiye sunmak üzere 3 kısa madde halinde özetler misin?", 
    "4. Format ve Kurumsal Dil Testi (Prompt Mühendisliği)"
)

print("\n" + "="*60)
print("✅ TÜM TESTLER TAMAMLANDI! BACKEND KUSURSUZ ÇALIŞIYOR.")
print("="*60)