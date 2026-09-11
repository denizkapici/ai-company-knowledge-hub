================================================================================
                            AI COMPANY KNOWLEDGE HUB
================================================================================

Kurumsal dokumanlarin (PDF, DOCX, TXT) islendigi, vektor tabanli anlamsal 
arama (Semantic Search) ve RAG (Retrieval-Augmented Generation) altyapisi 
sunan yapay zeka destekli kurumsal bilgi yonetim sistemi.

Bu proje, kurum ici bilgi silolarini yikarak calisanlarin dogal dil 
sorgulariyla sirket belgeleri, politikalari ve teknik dokumanlari icerisinde 
saniyeler icinde akilli arama yapabilmesini saglar.

--------------------------------------------------------------------------------
 1. TEMEL OZELLIKLER
--------------------------------------------------------------------------------

  * Vektor Tabanli Akilli Arama (Semantic Search): Klasik kelime eslestirme 
    yerine anlamsal butunluge dayali arama altyapisi (ChromaDB & LangChain).

  * RAG (Retrieval-Augmented Generation): Sirket belgelerini LLM (Buyuk Dil 
    Modelleri) ile harmanlayarak halusinasyonsuz, kuruma ozel cevaplar uretme.

  * Coklu Dokuman Destegi: PDF, DOCX ve TXT formatlarindaki belgelerin otomatik 
    ayristirilmasi ve vektor veritabanina islenmesi.

  * Kurumsal Duzeyde Guvenlik: Disa kapali sistem tasarimi, JWT tabanli kimlik 
    dogrulama, bcrypt sifreleme ve rol bazli erisim denetimi (RBAC).

  * Gelismis Hata Yonetimi & Loglama: Tum isteklerin 'TraceID' ile takip 
    edildigi, merkezi loglama ve rate-limiting (SlowAPI) korumasi.


--------------------------------------------------------------------------------
 2. TEKNOLOJI YIGINI
--------------------------------------------------------------------------------

  [ Backend / Arka Uc ]
  - Framework            : FastAPI (Python 3.12)
  - Veritabani           : PostgreSQL
  - ORM & Migrations     : SQLAlchemy 2.0, Alembic
  - Yapay Zeka & NLP     : LangChain, ChromaDB, HuggingFace, PyTorch
  - Guvenlik             : Passlib (Bcrypt), PyJWT, SlowAPI

  [ Frontend / On Yuz ]
  - Kutuphane            : React (Node.js 22)
  - Derleyici            : Vite

  [ DevOps & Dagitim ]
  - Konteynerizasyon     : Docker & Docker Compose
  - Sunucu               : Oracle Cloud (Ubuntu)


--------------------------------------------------------------------------------
 3. KURULUM VE CALISTIRMA (DOCKER ILE)
--------------------------------------------------------------------------------

Sistem tamamen Dockerize edilmistir. Sunucuda veya yerel bilgisayarda ayaga 
kaldirmak icin asagidaki adimlari izleyin:

  ADIM 1: Projeyi Klonlayin ve Ayaga Kaldirin
  > git clone <repo_url>
  > cd ai-company-knowledge-hub
  > docker compose up -d --build

  ADIM 2: Veritabani Tablolarini Olusturun
  Konteynerler calistiktan sonra, PostgreSQL tablolarini Alembic ile kurun:
  > docker exec -it knowledge_hub_api alembic upgrade head

  ADIM 3: Baslangic (Admin) Kullanicisini Ekleyin
  Sistem disaridan kayitlara (register) kapalidir. Kurucu admin hesabini 
  olusturmak icin baslangic betigini calistirin:
  > docker exec -it knowledge_hub_api python add_zeynep.py


--------------------------------------------------------------------------------
 4. KULLANIM BILGILERI
--------------------------------------------------------------------------------

Sistem basariyla ayaga kalktiktan sonra asagidaki adreslerden erisim 
saglayabilirsiniz:

  - Frontend Arayuzu     : http://<SUNUCU_IP>:5173
  - Backend API          : http://<SUNUCU_IP>:8000
  - API Dokumantasyonu   : http://<SUNUCU_IP>:8000/docs

  Varsayilan Admin Giris Bilgileri:
  - E-posta              : zeynep.demir@company.com
  - Sifre                : ZeynepSecure2026!


--------------------------------------------------------------------------------
 5. MIMARI NOTLAR
--------------------------------------------------------------------------------

  * API, mikroservis mimarisine uygun olarak moduler (/api/v1/...) tasarlanmistir.
  * add_zeynep.py betigi, PostgreSQL'deki "NOT NULL constraint" gibi kati veri 
    butunlugu kurallarina tam uyumlu hazirlanmistir.
  * Ortam degiskenleri (.env) Docker Compose uzerinden yonetilmektedir. 
    Arayuzun backend'e erisebilmesi icin dinamik IP yonlendirmesi ("grep/sed" 
    ile) yapilandirilmistir.

================================================================================
