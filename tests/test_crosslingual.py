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
    print(f"🌍 CROSS-LINGUAL TEST: {step_name}")
    print(f"👤 Soru (İngilizce): {question_text}")
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

print("=== KODPİT ÇOK DİLLİ (CROSS-LINGUAL) RAG TESTİ BAŞLIYOR ===")

# --- 1. AŞAMA: Basit İngilizce Veri Çekme ---
# Sistemden Türkçe belgedeki "Standart Paket" limitini bulup İngilizce cevaplamasını istiyoruz.
ask_question(
    "Based on the API pricing document, what is the rate limit for the Free Tier (Standart Paket) per minute? Please answer in English.", 
    "1. Adım: Basit İngilizce Sorgu (Simple Retrieval)"
)

# --- 2. AŞAMA: Çapraz Belge ve İngilizce Analiz ---
# Sistemden Omega A.Ş.'nin SLA sözleşmesindeki 4 saniye garantisini bulmasını istiyoruz.
ask_question(
    "According to the SLA contract, what is the maximum guaranteed response time for Omega A.Ş.'s chat requests? Please answer in English.", 
    "2. Adım: Özel Kuralı İngilizce Yakalama"
)

# --- 3. AŞAMA: İngilizce Matematik ve Sentez ---
# Sistemden hem maliyetleri bilmesini hem de bunu İngilizce hesaplamasını istiyoruz.
ask_question(
    "Considering both documents, calculate the total credit cost if Omega A.Ş. uploads 2 documents and makes 10 chat requests. Please explain your calculation in English step by step.", 
    "3. Adım: Çok Dilli Matematiksel Çıkarım (Cross-Lingual Reasoning)"
)

# --- 4. AŞAMA: Hafıza ve Dil Değişimi ---
# 3 soru İngilizceştikten sonra aniden Türkçeye dönüp hafızasını test ediyoruz.
ask_question(
    "Az önce İngilizce olarak hesapladığın kredi maliyeti hangi firmaya aitti? Türkçe cevap verir misin?", 
    "4. Adım: Dil Değişimi ve Hafıza (Language Switch & Memory)"
)

print("\n" + "="*75)
print("✅ ÇOK DİLLİ TEST TAMAMLANDI!")
print("="*75)