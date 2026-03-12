"""
Backend FastAPI para Sistema de Gestion de Alumnos.
Ejecutar con: uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from app.db import close_pool, execute, init_pool, query

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_pool()
    yield
    close_pool()


app = FastAPI(title="Sistema de Gestion de Alumnos", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Alumnos ──────────────────────────────────────────────────────────────────


@app.get("/api/alumnos")
def listar_alumnos(
    q: str = Query(default="", description="Buscar por matricula, nombre, email o ciudad"),
):
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


class AlumnoRequest(BaseModel):
    matricula: int
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    estatus: str = "Activo"


@app.post("/api/alumnos")
def crear_alumno(req: AlumnoRequest):
    result = execute(
        """INSERT INTO alumnos
           (matricula, nombre, apellido, fecha_nacimiento, genero, email,
            telefono, direccion, ciudad, estado, codigo_postal, latitud, longitud,
            fecha_ingreso, estatus)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, CURRENT_DATE, %s)
           RETURNING matricula""",
        (req.matricula, req.nombre, req.apellido, req.fecha_nacimiento,
         req.genero, req.email, req.telefono, req.direccion, req.ciudad,
         req.estado, req.codigo_postal, req.latitud, req.longitud, req.estatus),
    )
    return {"mensaje": "Alumno registrado", "matricula": result[0]["matricula"]}


@app.put("/api/alumnos/{matricula}")
def actualizar_alumno(matricula: int, req: AlumnoRequest):
    result = execute(
        """UPDATE alumnos SET nombre=%s, apellido=%s, fecha_nacimiento=%s,
           genero=%s, email=%s, telefono=%s, direccion=%s, ciudad=%s,
           estado=%s, codigo_postal=%s, latitud=%s, longitud=%s, estatus=%s
           WHERE matricula=%s RETURNING matricula""",
        (req.nombre, req.apellido, req.fecha_nacimiento, req.genero,
         req.email, req.telefono, req.direccion, req.ciudad, req.estado,
         req.codigo_postal, req.latitud, req.longitud, req.estatus, matricula),
    )
    if not result:
        raise HTTPException(404, "Alumno no encontrado")
    return {"mensaje": "Alumno actualizado"}


# ── Materias (catalogo) ─────────────────────────────────────────────────────


@app.get("/api/materias")
def listar_materias():
    return query("SELECT * FROM materias ORDER BY codigo")


class MateriaRequest(BaseModel):
    codigo: str
    nombre: str
    creditos: int


@app.post("/api/materias")
def crear_materia(req: MateriaRequest):
    execute(
        "INSERT INTO materias (codigo, nombre, creditos) VALUES (%s, %s, %s)",
        (req.codigo, req.nombre, req.creditos),
    )
    return {"mensaje": "Materia creada"}


@app.put("/api/materias/{codigo}")
def actualizar_materia(codigo: str, req: MateriaRequest):
    result = execute(
        "UPDATE materias SET nombre=%s, creditos=%s WHERE codigo=%s RETURNING codigo",
        (req.nombre, req.creditos, codigo),
    )
    if not result:
        raise HTTPException(404, "Materia no encontrada")
    return {"mensaje": "Materia actualizada"}


@app.delete("/api/materias/{codigo}")
def eliminar_materia(codigo: str):
    result = execute("DELETE FROM materias WHERE codigo=%s RETURNING codigo", (codigo,))
    if not result:
        raise HTTPException(404, "Materia no encontrada")
    return {"mensaje": "Materia eliminada"}


# ── Profesores ───────────────────────────────────────────────────────────────


@app.get("/api/profesores")
def listar_profesores():
    return query("SELECT * FROM profesores ORDER BY nombre")


class ProfesorRequest(BaseModel):
    nombre: str


@app.post("/api/profesores")
def crear_profesor(req: ProfesorRequest):
    result = execute(
        "INSERT INTO profesores (nombre) VALUES (%s) RETURNING id", (req.nombre,)
    )
    return {"mensaje": "Profesor registrado", "id": result[0]["id"]}


@app.put("/api/profesores/{profesor_id}")
def actualizar_profesor(profesor_id: int, req: ProfesorRequest):
    result = execute(
        "UPDATE profesores SET nombre=%s WHERE id=%s RETURNING id",
        (req.nombre, profesor_id),
    )
    if not result:
        raise HTTPException(404, "Profesor no encontrado")
    return {"mensaje": "Profesor actualizado"}


@app.delete("/api/profesores/{profesor_id}")
def eliminar_profesor(profesor_id: int):
    result = execute("DELETE FROM profesores WHERE id=%s RETURNING id", (profesor_id,))
    if not result:
        raise HTTPException(404, "Profesor no encontrado")
    return {"mensaje": "Profesor eliminado"}


# ── Aulas ────────────────────────────────────────────────────────────────────


@app.get("/api/aulas")
def listar_aulas():
    return query("SELECT * FROM aulas ORDER BY nombre")


class AulaRequest(BaseModel):
    nombre: str


@app.post("/api/aulas")
def crear_aula(req: AulaRequest):
    result = execute(
        "INSERT INTO aulas (nombre) VALUES (%s) RETURNING id", (req.nombre,)
    )
    return {"mensaje": "Aula creada", "id": result[0]["id"]}


@app.delete("/api/aulas/{aula_id}")
def eliminar_aula(aula_id: int):
    result = execute("DELETE FROM aulas WHERE id=%s RETURNING id", (aula_id,))
    if not result:
        raise HTTPException(404, "Aula no encontrada")
    return {"mensaje": "Aula eliminada"}


# ── Grupos del periodo activo ────────────────────────────────────────────────


@app.get("/api/grupos")
def listar_grupos(periodo_id: int | None = None, profesor_id: int | None = None):
    base = """SELECT g.id, m.codigo, m.nombre AS materia, m.creditos,
                     p.id AS profesor_id, p.nombre AS profesor,
                     a.nombre AS aula, g.horario,
                     per.id AS periodo_id, per.nombre AS periodo, g.cupo_maximo,
                     g.cupo_maximo - COUNT(i.id) AS cupo_disponible
              FROM grupos g
              JOIN materias m ON g.materia_codigo = m.codigo
              JOIN profesores p ON g.profesor_id = p.id
              JOIN aulas a ON g.aula_id = a.id
              JOIN periodos per ON g.periodo_id = per.id
              LEFT JOIN inscripciones i ON i.grupo_id = g.id"""

    group_by = """GROUP BY g.id, m.codigo, m.nombre, m.creditos,
                          p.id, p.nombre, a.nombre, g.horario,
                          per.id, per.nombre, g.cupo_maximo
                  ORDER BY m.nombre"""

    conditions = []
    params: list[int] = []

    if periodo_id:
        conditions.append("g.periodo_id = %s")
        params.append(periodo_id)
    else:
        conditions.append("per.activo = TRUE")

    if profesor_id:
        conditions.append("p.id = %s")
        params.append(profesor_id)

    sql = f"{base} WHERE {' AND '.join(conditions)} {group_by}"
    if params:
        return query(sql, tuple(params))
    return query(sql)


# ── Inscripciones ────────────────────────────────────────────────────────────


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

    # Verificar duplicado
    existing = query(
        "SELECT id FROM inscripciones WHERE alumno_matricula = %s AND grupo_id = %s",
        (req.alumno_matricula, req.grupo_id),
    )
    if existing:
        raise HTTPException(409, "El alumno ya esta inscrito en este grupo")

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
    return {"mensaje": "Inscripcion exitosa", "inscripcion": result[0]}


@app.delete("/api/inscripciones/{inscripcion_id}")
def cancelar_inscripcion(inscripcion_id: int):
    result = execute(
        "DELETE FROM inscripciones WHERE id = %s RETURNING id", (inscripcion_id,)
    )
    if not result:
        raise HTTPException(404, "Inscripcion no encontrada")
    return {"mensaje": "Inscripcion cancelada"}


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


# ── Historial academico ─────────────────────────────────────────────────────


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


# ── Estadisticas ─────────────────────────────────────────────────────────────


@app.get("/api/estadisticas")
def estadisticas():
    stats = query(
        """SELECT
             (SELECT COUNT(*) FROM alumnos) AS total_alumnos,
             (SELECT COUNT(*) FROM alumnos WHERE estatus = 'Activo') AS alumnos_activos,
             (SELECT ROUND(AVG(calificacion)::numeric, 2) FROM historial_academico) AS promedio_general"""
    )
    return stats[0]


# ── Periodos ─────────────────────────────────────────────────────────────────


@app.get("/api/periodos")
def listar_periodos():
    return query("SELECT * FROM periodos ORDER BY anio DESC, nombre DESC")


class PeriodoRequest(BaseModel):
    nombre: str
    anio: int
    activo: bool = False


@app.post("/api/periodos")
def crear_periodo(req: PeriodoRequest):
    if req.activo:
        execute("UPDATE periodos SET activo = FALSE WHERE activo = TRUE")
    result = execute(
        "INSERT INTO periodos (nombre, anio, activo) VALUES (%s, %s, %s) RETURNING id",
        (req.nombre, req.anio, req.activo),
    )
    return {"mensaje": "Periodo creado", "id": result[0]["id"]}


@app.put("/api/periodos/{periodo_id}/activar")
def activar_periodo(periodo_id: int):
    execute("UPDATE periodos SET activo = FALSE WHERE activo = TRUE")
    result = execute(
        "UPDATE periodos SET activo = TRUE WHERE id = %s RETURNING id", (periodo_id,)
    )
    if not result:
        raise HTTPException(404, "Periodo no encontrado")
    return {"mensaje": "Periodo activado"}


# ── Grupos (CRUD) ────────────────────────────────────────────────────────────


class GrupoRequest(BaseModel):
    materia_codigo: str
    profesor_id: int
    aula_id: int
    periodo_id: int
    horario: str
    cupo_maximo: int = 40


@app.post("/api/grupos")
def crear_grupo(req: GrupoRequest):
    result = execute(
        """INSERT INTO grupos (materia_codigo, profesor_id, aula_id, periodo_id, horario, cupo_maximo)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (req.materia_codigo, req.profesor_id, req.aula_id,
         req.periodo_id, req.horario, req.cupo_maximo),
    )
    return {"mensaje": "Grupo creado", "id": result[0]["id"]}


@app.delete("/api/grupos/{grupo_id}")
def eliminar_grupo(grupo_id: int):
    result = execute("DELETE FROM grupos WHERE id=%s RETURNING id", (grupo_id,))
    if not result:
        raise HTTPException(404, "Grupo no encontrado")
    return {"mensaje": "Grupo eliminado"}


# ── Calificaciones (captura por profesor) ────────────────────────────────────


class CalificacionRequest(BaseModel):
    alumno_matricula: int
    materia_codigo: str
    calificacion: float
    periodo_id: int


@app.post("/api/calificaciones")
def registrar_calificacion(req: CalificacionRequest):
    # Obtener creditos de la materia
    mat = query("SELECT creditos FROM materias WHERE codigo = %s", (req.materia_codigo,))
    if not mat:
        raise HTTPException(404, "Materia no encontrada")
    creditos = mat[0]["creditos"]
    estatus = "Aprobado" if req.calificacion >= 7 else "Reprobado"

    result = execute(
        """INSERT INTO historial_academico
           (alumno_matricula, materia_codigo, calificacion, creditos, periodo_id, estatus)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (req.alumno_matricula, req.materia_codigo, req.calificacion,
         creditos, req.periodo_id, estatus),
    )
    return {"mensaje": "Calificacion registrada", "id": result[0]["id"]}


class CalificacionesBulkRequest(BaseModel):
    grupo_id: int
    periodo_id: int
    calificaciones: list[dict]  # [{matricula: int, calificacion: float}]


@app.post("/api/calificaciones/grupo")
def registrar_calificaciones_grupo(req: CalificacionesBulkRequest):
    # Obtener materia y creditos del grupo
    grupo = query(
        "SELECT materia_codigo FROM grupos WHERE id = %s", (req.grupo_id,)
    )
    if not grupo:
        raise HTTPException(404, "Grupo no encontrado")
    materia_codigo = grupo[0]["materia_codigo"]

    mat = query("SELECT creditos FROM materias WHERE codigo = %s", (materia_codigo,))
    creditos = mat[0]["creditos"]

    insertados = 0
    for cal in req.calificaciones:
        estatus = "Aprobado" if cal["calificacion"] >= 7 else "Reprobado"
        execute(
            """INSERT INTO historial_academico
               (alumno_matricula, materia_codigo, calificacion, creditos, periodo_id, estatus)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (cal["matricula"], materia_codigo, cal["calificacion"],
             creditos, req.periodo_id, estatus),
        )
        insertados += 1

    return {"mensaje": f"{insertados} calificaciones registradas"}


# ── Alumnos inscritos en un grupo ────────────────────────────────────────────


@app.get("/api/grupos/{grupo_id}/alumnos")
def alumnos_del_grupo(grupo_id: int):
    return query(
        """SELECT a.matricula, a.nombre, a.apellido
           FROM inscripciones i
           JOIN alumnos a ON i.alumno_matricula = a.matricula
           WHERE i.grupo_id = %s
           ORDER BY a.apellido, a.nombre""",
        (grupo_id,),
    )


# ── Servir frontend ──────────────────────────────────────────────────────────

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")
