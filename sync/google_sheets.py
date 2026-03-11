"""
Sincroniza respuestas de un Google Form (via Google Sheets) con la BD.

Uso:
    python -m sync.google_sheets

Requiere:
    1. Un archivo credentials.json de cuenta de servicio en sync/
    2. Compartir la hoja de Google Sheets con el email de la cuenta de servicio
    3. Variables GOOGLE_SHEET_ID en .env
"""
import sys
from pathlib import Path

import gspread
from google.oauth2.service_account import Credentials

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.config import DB_CONFIG

import psycopg2

# Mapeo flexible: busca la columna por multiples nombres posibles
def col(row, *keys):
    """Busca un valor en el registro probando multiples nombres de columna."""
    for k in keys:
        val = row.get(k)
        if val is not None and val != "":
            return val
    # Buscar sin importar espacios extra
    for k in keys:
        for row_key in row:
            if row_key.strip().lower() == k.strip().lower():
                val = row[row_key]
                if val is not None and val != "":
                    return val
    return None


def parsear_fecha(valor):
    """Convierte formatos de fecha comunes a YYYY-MM-DD."""
    if not valor:
        return None
    from datetime import datetime
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(valor), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
]

CREDENTIALS_FILE = ROOT_DIR / "sync" / "credentials.json"


def conectar_sheets():
    creds = Credentials.from_service_account_file(str(CREDENTIALS_FILE), scopes=SCOPES)
    client = gspread.authorize(creds)
    return client


def obtener_sheet_id():
    import os
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        print("Error: GOOGLE_SHEET_ID no esta definido en .env")
        sys.exit(1)
    return sheet_id


def sincronizar():
    print("Conectando con Google Sheets...")
    client = conectar_sheets()
    sheet_id = obtener_sheet_id()
    sheet = client.open_by_key(sheet_id).sheet1
    registros = sheet.get_all_records()

    if not registros:
        print("No hay registros en la hoja.")
        return

    print(f"Encontrados {len(registros)} registros en la hoja.")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    insertados = 0
    existentes = 0
    errores = 0

    for row in registros:
        try:
            matricula = int(row.get("Matricula", 0))
            if not matricula:
                continue

            cur.execute("SELECT 1 FROM alumnos WHERE matricula = %s", (matricula,))
            if cur.fetchone():
                existentes += 1
                continue

            fecha_nac = parsear_fecha(
                col(row, "Fecha de nacimiento", "Fecha Nacimiento", "Fecha_nacimiento")
            )
            fecha_ing = parsear_fecha(
                col(row, "Fecha de ingreso", "Fecha Ingreso", "Fecha_ingreso")
            )

            cur.execute(
                """INSERT INTO alumnos
                   (matricula, nombre, apellido, fecha_nacimiento, genero,
                    email, telefono, direccion, ciudad, estado, codigo_postal,
                    fecha_ingreso, estatus)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Activo')""",
                (
                    matricula,
                    col(row, "Nombre") or "",
                    col(row, "Apellido") or "",
                    fecha_nac,
                    col(row, "Genero", "Género") or "",
                    col(row, "Email", "Correo") or "",
                    col(row, "Telefono", "Teléfono") or "",
                    col(row, "Direccion", "Dirección") or "",
                    col(row, "Ciudad") or "",
                    col(row, "Estado") or "",
                    col(row, "Codigo Postal", "Código Postal", "CP") or "",
                    fecha_ing,
                ),
            )
            insertados += 1

        except Exception as e:
            errores += 1
            print(f"  Error en matricula {row.get('Matricula', '?')}: {e}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nResultado:")
    print(f"  Insertados: {insertados}")
    print(f"  Ya existentes: {existentes}")
    print(f"  Errores: {errores}")


if __name__ == "__main__":
    sincronizar()
