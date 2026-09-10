# Python 3.10 tabanlı hafif bir imaj kullanıyoruz (Kendi sürümüne göre 3.11 vb. yapabilirsin)
FROM python:3.12-slim

# Konteyner içindeki çalışma dizinini ayarlıyoruz
WORKDIR /app

# İşletim sistemi seviyesindeki gerekli bağımlılıkları (psycopg2 vb. için) kuruyoruz
RUN apt-get update && apt-get install -y gcc libpq-dev libmagic1 && rm -rf /var/lib/apt/lists/

# Gerekli kütüphane listesini kopyalayıp kuruyoruz
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Projedeki tüm dosyaları konteynere kopyalıyoruz
COPY . .

# FastAPI'nin çalışacağı portu açıyoruz
EXPOSE 8000

# Sunucuyu başlatma komutu
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]