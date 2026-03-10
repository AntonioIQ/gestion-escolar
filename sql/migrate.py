"""
Migra los datos de los CSVs a PostgreSQL.
Ejecutar una sola vez despues de crear el esquema:
    python -m sql.migrate
"""
import csv
import sys
from pathlib import Path

import psycopg2

# Permitir importar app.config al ejecutar desde la raiz del proyecto
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.config import DB_CONFIG

DATA_DIR = ROOT_DIR / "data"


def conectar():
    return psycopg2.connect(**DB_CONFIG)


def migrar():
    conn = conectar()
    cur = conn.cursor()

    # 1. Migrar alumnos
    print("Migrando alumnos...")
    with open(DATA_DIR / "datos_alumnos.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cur.execute(
                """INSERT INTO alumnos
                   (matricula, nombre, apellido, fecha_nacimiento, genero, email,
                    telefono, direccion, ciudad, estado, codigo_postal,
                    latitud, longitud, fecha_ingreso, estatus)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (matricula) DO NOTHING""",
                (
                    int(row["matricula"]),
                    row["nombre"],
                    row["apellido"],
                    row["fecha_nacimiento"],
                    row["genero"],
                    row["email"],
                    row["telefono"],
                    row["direccion"],
                    row["ciudad"],
                    row["estado"],
                    row["codigo_postal"],
                    float(row["latitud"]),
                    float(row["longitud"]),
                    row["fecha_ingreso"],
                    row["estatus"],
                ),
            )
    print(f"  -> {cur.rowcount} alumnos insertados")

    # 2. Extraer catalogos desde los CSVs
    materias = {}
    profesores = set()
    aulas = set()
    periodos = set()

    with open(DATA_DIR / "materias_actuales.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            materias[row["codigo_materia"]] = (row["nombre_materia"], int(row["creditos"]))
            profesores.add(row["profesor"])
            aulas.add(row["aula"])
            periodos.add((row["semestre"], int(row["año"])))

    with open(DATA_DIR / "historial_academico.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        historial_rows = list(reader)
        for row in historial_rows:
            codigo = row["codigo_materia"]
            if codigo not in materias:
                materias[codigo] = (row["nombre_materia"], int(row["creditos"]))
            periodos.add((row["periodo"], int(row["año"])))

    # Insertar catalogos
    print("Migrando materias...")
    for codigo, (nombre, creditos) in materias.items():
        cur.execute(
            "INSERT INTO materias (codigo, nombre, creditos) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (codigo, nombre, creditos),
        )

    print("Migrando profesores...")
    for prof in profesores:
        cur.execute(
            "INSERT INTO profesores (nombre) VALUES (%s) ON CONFLICT DO NOTHING",
            (prof,),
        )

    print("Migrando aulas...")
    for aula in aulas:
        cur.execute(
            "INSERT INTO aulas (nombre) VALUES (%s) ON CONFLICT DO NOTHING",
            (aula,),
        )

    print("Migrando periodos...")
    for nombre_periodo, anio in periodos:
        cur.execute(
            "INSERT INTO periodos (nombre, anio) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (nombre_periodo, anio),
        )

    # Marcar el periodo mas reciente como activo
    cur.execute(
        """UPDATE periodos SET activo = TRUE
           WHERE (anio, nombre) = (
               SELECT anio, nombre FROM periodos ORDER BY anio DESC, nombre DESC LIMIT 1
           )"""
    )

    conn.commit()

    # Cargar mapas de IDs
    cur.execute("SELECT nombre, id FROM profesores")
    prof_map = dict(cur.fetchall())
    cur.execute("SELECT nombre, id FROM aulas")
    aula_map = dict(cur.fetchall())
    cur.execute("SELECT nombre, id FROM periodos")
    periodo_map = dict(cur.fetchall())

    # 3. Migrar grupos e inscripciones
    print("Migrando grupos e inscripciones...")
    with open(DATA_DIR / "materias_actuales.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            profesor_id = prof_map[row["profesor"]]
            aula_id = aula_map[row["aula"]]
            periodo_id = periodo_map[row["semestre"]]

            cur.execute(
                """INSERT INTO grupos (materia_codigo, profesor_id, aula_id, periodo_id, horario)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (materia_codigo, profesor_id, periodo_id, horario) DO NOTHING
                   RETURNING id""",
                (row["codigo_materia"], profesor_id, aula_id, periodo_id, row["horario"]),
            )
            result = cur.fetchone()
            if result:
                grupo_id = result[0]
            else:
                cur.execute(
                    """SELECT id FROM grupos
                       WHERE materia_codigo = %s AND profesor_id = %s
                         AND periodo_id = %s AND horario = %s""",
                    (row["codigo_materia"], profesor_id, periodo_id, row["horario"]),
                )
                grupo_id = cur.fetchone()[0]

            cur.execute(
                """INSERT INTO inscripciones (alumno_matricula, grupo_id)
                   VALUES (%s, %s) ON CONFLICT DO NOTHING""",
                (int(row["matricula"]), grupo_id),
            )

    # 4. Migrar historial academico
    print("Migrando historial academico...")
    for row in historial_rows:
        periodo_id = periodo_map[row["periodo"]]
        cur.execute(
            """INSERT INTO historial_academico
               (alumno_matricula, materia_codigo, calificacion, creditos, periodo_id, estatus)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                int(row["matricula"]),
                row["codigo_materia"],
                float(row["calificacion"]),
                int(row["creditos"]),
                periodo_id,
                row["estatus"],
            ),
        )

    conn.commit()

    # Resumen
    for tabla in [
        "alumnos", "materias", "profesores", "aulas",
        "periodos", "grupos", "inscripciones", "historial_academico",
    ]:
        cur.execute(f"SELECT COUNT(*) FROM {tabla}")
        print(f"  {tabla}: {cur.fetchone()[0]} registros")

    cur.close()
    conn.close()
    print("\nMigracion completada.")


if __name__ == "__main__":
    migrar()
