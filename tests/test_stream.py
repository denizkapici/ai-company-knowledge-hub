import requests
import json

url = "http://127.0.0.1:8000/api/v1/chat/"

print("--- 1. SORU (Hafızaya İsim Yazdırma) ---")
payload1 = {
    "question": "Merhaba, benim ismim Deniz. Kodpit'te stajyerim.",
    "history": [] # İlk mesaj olduğu için geçmiş boş
}

with requests.post(url, json=payload1, stream=True) as r:
    for chunk in r.iter_content(chunk_size=None):
        if chunk:
            print(chunk.decode('utf-8'), end='', flush=True)

print("\n\n--- 2. SORU (Hafızayı Test Etme) ---")
payload2 = {
    "question": "Sana az önce ismimi ve pozisyonumu söylemiştim. Hatırlıyor musun? Adım neydi?",
    "history": [
        {"role": "user", "content": "Merhaba, benim ismim Deniz. Kodpit'te stajyerim."},
        {"role": "assistant", "content": "Merhaba Deniz! Sana nasıl yardımcı olabilirim?"}
    ] # Geçmişi sunucuya iletiyoruz
}

with requests.post(url, json=payload2, stream=True) as r:
    for chunk in r.iter_content(chunk_size=None):
        if chunk:
            print(chunk.decode('utf-8'), end='', flush=True)
            
print("\n\nAkış tamamlandı!")