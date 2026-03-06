"""
Backend FastAPI para Sistema de Gestión de Alumnos.
Ejecutar con: uvicorn backend:app --reload
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool

DB_CONFIG = {
    "host": "localhost",
    "database": "bd_alumnos",
    "user": "bd_alumnos_admin",
    "password": "alumnos2026",
}

db_pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = pool.ThreadedConnectionPool(2, 10, **DB_CONFIG)
    yield
    db_pool.closeall()


app = FastAPI(title="Sistema de Gestión de Alumnos", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    return db_pool.getconn()


def put_conn(conn):
    db_pool.putconn(conn)


def query(sql, params=None):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        put_conn(conn)


def execute(sql, params=None):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            conn.commit()
            try:
                return cur.fetchall()
            except psycopg2.ProgrammingError:
                return []
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


# --- ALUMNOS ---

@app.get("/api/alumnos")
def listar_alumnos(q: str = Query(default="", description="Buscar por matrícula, nombre, email o ciudad")):
    if q:
        like = f"%{q}%"
        return query(
            """SELECT * FROM alumnos
               WHERE matricula::text ILIKE %s
                  OR nombre ILIKE %s
                  OR apellido ILIKE %s
                  OR (nombre || ' ' || apellido) ILIKE %s
                  OR email ILIKE %s
                  OR ciudad ILIKE %s
               ORDER BY apellido, nombre""",
            (like, like, like, like, like, like),
        )
    return query("SELECT * FROM alumnos ORDER BY apellido, nombre")


@app.get("/api/alumnos/{matricula}")
def obtener_alumno(matricula: int):
    rows = query("SELECT * FROM alumnos WHERE matricula = %s", (matricula,))
    if not rows:
        raise HTTPException(404, "Alumno no encontrado")
    return rows[0]


# --- MATERIAS (catálogo) ---

@app.get("/api/materias")
def listar_materias():
    return query("SELECT * FROM materias ORDER BY codigo")


# --- GRUPOS del periodo activo (para inscripción) ---

@app.get("/api/grupos")
def listar_grupos(periodo_id: int = None):
    if periodo_id:
        return query(
            """SELECT g.id, m.codigo, m.nombre AS materia, m.creditos,
                      p.nombre AS profesor, a.nombre AS aula, g.horario,
                      per.nombre AS periodo, g.cupo_maximo,
                      g.cupo_maximo - COUNT(i.id) AS cupo_disponible
               FROM grupos g
               JOIN materias m ON g.materia_codigo = m.codigo
               JOIN profesores p ON g.profesor_id = p.id
               JOIN aulas a ON g.aula_id = a.id
               JOIN periodos per ON g.periodo_id = per.id
               LEFT JOIN inscripciones i ON i.grupo_id = g.id
               WHERE g.periodo_id = %s
               GROUP BY g.id, m.codigo, m.nombre, m.creditos, p.nombre, a.nombre, g.horario, per.nombre, g.cupo_maximo
               ORDER BY m.nombre""",
            (periodo_id,),
        )
    # Por defecto: periodo activo
    return query(
        """SELECT g.id, m.codigo, m.nombre AS materia, m.creditos,
                  p.nombre AS profesor, a.nombre AS aula, g.horario,
                  per.nombre AS periodo, g.cupo_maximo,
                  g.cupo_maximo - COUNT(i.id) AS cupo_disponible
           FROM grupos g
           JOIN materias m ON g.materia_codigo = m.codigo
           JOIN profesores p ON g.profesor_id = p.id
           JOIN aulas a ON g.aula_id = a.id
           JOIN periodos per ON g.periodo_id = per.id
           LEFT JOIN inscripciones i ON i.grupo_id = g.id
           WHERE per.activo = TRUE
           GROUP BY g.id, m.codigo, m.nombre, m.creditos, p.nombre, a.nombre, g.horario, per.nombre, g.cupo_maximo
           ORDER BY m.nombre"""
    )


# --- INSCRIPCIONES ---

class InscripcionRequest(BaseModel):
    alumno_matricula: int
    grupo_id: int


@app.post("/api/inscripciones")
def inscribir_alumno(req: InscripcionRequest):
    # Verificar cupo
    rows = query(
        """SELECT g.cupo_maximo - COUNT(i.id) AS cupo_disponible
           FROM grupos g
           LEFT JOIN inscripciones i ON i.grupo_id = g.id
           WHERE g.id = %s
           GROUP BY g.cupo_maximo""",
        (req.grupo_id,),
    )
    if not rows:
        raise HTTPException(404, "Grupo no encontrado")
    if rows[0]["cupo_disponible"] <= 0:
        raise HTTPException(409, "No hay cupo disponible en este grupo")

    # Verificar que no esté ya inscrito
    existing = query(
        "SELECT id FROM inscripciones WHERE alumno_matricula = %s AND grupo_id = %s",
        (req.alumno_matricula, req.grupo_id),
    )
    if existing:
        raise HTTPException(409, "El alumno ya está inscrito en este grupo")

    # Verificar empalme de horarios
    empalme = query(
        """SELECT g2.horario, m.nombre AS materia
           FROM inscripciones i
           JOIN grupos g2 ON i.grupo_id = g2.id
           JOIN materias m ON g2.materia_codigo = m.codigo
           WHERE i.alumno_matricula = %s
             AND g2.periodo_id = (SELECT periodo_id FROM grupos WHERE id = %s)
             AND g2.horario = (SELECT horario FROM grupos WHERE id = %s)
             AND g2.id != %s""",
        (req.alumno_matricula, req.grupo_id, req.grupo_id, req.grupo_id),
    )
    if empalme:
        raise HTTPException(
            409,
            f"Empalme de horario con {empalme[0]['materia']} ({empalme[0]['horario']})",
        )

    result = execute(
        """INSERT INTO inscripciones (alumno_matricula, grupo_id)
           VALUES (%s, %s) RETURNING id, fecha_inscripcion""",
        (req.alumno_matricula, req.grupo_id),
    )
    return {"mensaje": "Inscripción exitosa", "inscripcion": result[0]}


@app.delete("/api/inscripciones/{inscripcion_id}")
def cancelar_inscripcion(inscripcion_id: int):
    result = execute(
        "DELETE FROM inscripciones WHERE id = %s RETURNING id", (inscripcion_id,)
    )
    if not result:
        raise HTTPException(404, "Inscripción no encontrada")
    return {"mensaje": "Inscripción cancelada"}


@app.get("/api/alumnos/{matricula}/inscripciones")
def inscripciones_alumno(matricula: int):
    return query(
        """SELECT i.id AS inscripcion_id, g.id AS grupo_id,
                  m.codigo, m.nombre AS materia, m.creditos,
                  p.nombre AS profesor, a.nombre AS aula, g.horario,
                  per.nombre AS periodo, i.fecha_inscripcion
           FROM inscripciones i
           JOIN grupos g ON i.grupo_id = g.id
           JOIN materias m ON g.materia_codigo = m.codigo
           JOIN profesores p ON g.profesor_id = p.id
           JOIN aulas a ON g.aula_id = a.id
           JOIN periodos per ON g.periodo_id = per.id
           WHERE i.alumno_matricula = %s
           ORDER BY per.anio DESC, per.nombre DESC, m.nombre""",
        (matricula,),
    )


# --- HISTORIAL ACADÉMICO ---

@app.get("/api/alumnos/{matricula}/historial")
def historial_alumno(matricula: int):
    return query(
        """SELECT h.id, m.codigo, m.nombre AS materia,
                  h.calificacion, h.creditos, per.nombre AS periodo,
                  per.anio, h.estatus
           FROM historial_academico h
           JOIN materias m ON h.materia_codigo = m.codigo
           JOIN periodos per ON h.periodo_id = per.id
           WHERE h.alumno_matricula = %s
           ORDER BY per.anio, per.nombre""",
        (matricula,),
    )


# --- ESTADÍSTICAS ---

@app.get("/api/estadisticas")
def estadisticas():
    stats = query(
        """SELECT
             (SELECT COUNT(*) FROM alumnos) AS total_alumnos,
             (SELECT COUNT(*) FROM alumnos WHERE estatus = 'Activo') AS alumnos_activos,
             (SELECT ROUND(AVG(calificacion)::numeric, 2) FROM historial_academico) AS promedio_general"""
    )
    return stats[0]


# --- PERIODOS ---

@app.get("/api/periodos")
def listar_periodos():
    return query("SELECT * FROM periodos ORDER BY anio DESC, nombre DESC")


# --- Servir frontend ---

app.mount("/static", StaticFiles(directory="."), name="static")


@app.get("/")
def index():
    return FileResponse("index.html")
