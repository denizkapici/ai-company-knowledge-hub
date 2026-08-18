import logging
import sys

# Log formatı: Zaman - Log Seviyesi - Modül Adı - Mesaj
LOG_FORMAT = "%(asctime)s - %(levelname)s - [%(name)s] - %(message)s"

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("knowledge_hub")