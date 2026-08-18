import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# .env dosyasındaki değişkenleri yükle
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy Engine oluşturulması
engine = create_engine(DATABASE_URL)

# Veritabanı oturumları (Session) üreticisi
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Modellerimizin türetileceği taban sınıf
Base = declarative_base()

# FastAPI Endpoint'lerinde veritabanı oturumu sağlayan Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()