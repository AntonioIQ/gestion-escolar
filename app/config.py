import os

from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "database": os.environ.get("DB_NAME", "bd_alumnos"),
    "user": os.environ.get("DB_USER", "bd_alumnos_admin"),
    "password": os.environ["DB_PASSWORD"],
}

DB_POOL_MIN = int(os.environ.get("DB_POOL_MIN", "2"))
DB_POOL_MAX = int(os.environ.get("DB_POOL_MAX", "10"))
