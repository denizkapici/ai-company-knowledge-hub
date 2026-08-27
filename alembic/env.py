import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# Projenin ana dizinini Python yoluna ekliyoruz (app modülünü bulabilmesi için)
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

# Çevresel değişkenleri (.env) yükle
load_dotenv()

# Base metadata ve Veritabanı URL'sini projeden çekiyoruz
from app.database import Base, DATABASE_URL

# GÜVENLİK/GARANTİ: Alembic'in tabloları algılayabilmesi için modelleri AÇIKÇA import ediyoruz
from app.models import User, Department, Document 

# Alembic Config objesi
config = context.config

# alembic.ini içindeki statik URL'yi, projemizdeki dinamik DATABASE_URL ile eziyoruz
config.set_main_option("sqlalchemy.url", str(DATABASE_URL))

# Loglama ayarlarını kuruyoruz
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alembic'in değişiklikleri takip edeceği yer (Bizim tablolarımız)
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()