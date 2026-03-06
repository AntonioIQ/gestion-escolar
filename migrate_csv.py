"""
Migra los datos de los CSVs existentes a PostgreSQL.
Ejecutar una sola vez después de crear el esquema.
"""
import csv
import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "database": "bd_alumnos",
    "user": "bd_alumnos_admin",
    "password": "alumnos2026",
}


def conectar():
    return psycopg2.connect(**DB_CONFIG)


def migrar():
    conn = conectar()
    cur = conn.cursor()

    # 1. Migrar alumnos
    print("Migrando alumnos...")
    with open("datos_alumnos.csv", encoding="utf-8") as f:
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

    # 2. Extraer y migrar materias, profesores, aulas y periodos desde los CSVs
    materias = {}
    profesores = set()
    aulas = set()
    periodos = set()

    # Desde materias_actuales.csv
    with open("materias_actuales.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            materias[row["codigo_materia"]] = (row["nombre_materia"], int(row["creditos"]))
            profesores.add(row["profesor"])
            aulas.add(row["aula"])
            semestre = row["semestre"]
            anio = int(row["año"])
            periodos.add((semestre, anio))

    # Desde historial_academico.csv
    with open("historial_academico.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        historial_rows = list(reader)
        for row in historial_rows:
            codigo = row["codigo_materia"]
            if codigo not in materias:
                materias[codigo] = (row["nombre_materia"], int(row["creditos"]))
            periodo = row["periodo"]
            anio = int(row["año"])
            periodos.add((periodo, anio))

    # Insertar materias
    print("Migrando materias...")
    for codigo, (nombre, creditos) in materias.items():
        cur.execute(
            "INSERT INTO materias (codigo, nombre, creditos) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (codigo, nombre, creditos),
        )

    # Insertar profesores
    print("Migrando profesores...")
    for prof in profesores:
        cur.execute(
            "INSERT INTO profesores (nombre) VALUES (%s) ON CONFLICT DO NOTHING",
            (prof,),
        )

    # Insertar aulas
    print("Migrando aulas...")
    for aula in aulas:
        cur.execute(
            "INSERT INTO aulas (nombre) VALUES (%s) ON CONFLICT DO NOTHING",
            (aula,),
        )

    # Insertar periodos
    print("Migrando periodos...")
    for nombre_periodo, anio in periodos:
        cur.execute(
            "INSERT INTO periodos (nombre, anio) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (nombre_periodo, anio),
        )
    # Marcar el periodo más reciente como activo
    cur.execute(
        "UPDATE periodos SET activo = TRUE WHERE (anio, nombre) = (SELECT anio, nombre FROM periodos ORDER BY anio DESC, nombre DESC LIMIT 1)"
    )

    conn.commit()

    # Cargar mapas de IDs
    cur.execute("SELECT nombre, id FROM profesores")
    prof_map = dict(cur.fetchall())

    cur.execute("SELECT nombre, id FROM aulas")
    aula_map = dict(cur.fetchall())

    cur.execute("SELECT nombre, id FROM periodos")
    periodo_map = dict(cur.fetchall())

    # 3. Migrar grupos e inscripciones desde materias_actuales.csv
    print("Migrando grupos e inscripciones...")
    with open("materias_actuales.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            profesor_id = prof_map[row["profesor"]]
            aula_id = aula_map[row["aula"]]
            periodo_id = periodo_map[row["semestre"]]

            # Insertar grupo si no existe
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
                       WHERE materia_codigo = %s AND profesor_id = %s AND periodo_id = %s AND horario = %s""",
                    (row["codigo_materia"], profesor_id, periodo_id, row["horario"]),
                )
                grupo_id = cur.fetchone()[0]

            # Inscribir alumno
            cur.execute(
                """INSERT INTO inscripciones (alumno_matricula, grupo_id)
                   VALUES (%s, %s)
                   ON CONFLICT DO NOTHING""",
                (int(row["matricula"]), grupo_id),
            )

    # 4. Migrar historial académico
    print("Migrando historial académico...")
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
    for tabla in ["alumnos", "materias", "profesores", "aulas", "periodos", "grupos", "inscripciones", "historial_academico"]:
        cur.execute(f"SELECT COUNT(*) FROM {tabla}")
        print(f"  {tabla}: {cur.fetchone()[0]} registros")

    cur.close()
    conn.close()
    print("\nMigración completada.")


if __name__ == "__main__":
    migrar()
