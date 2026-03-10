-- Esquema de base de datos: Sistema de Gestión de Alumnos
-- PostgreSQL

BEGIN;

-- Catálogo de materias
CREATE TABLE materias (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    creditos INTEGER NOT NULL CHECK (creditos > 0)
);

-- Catálogo de profesores
CREATE TABLE profesores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE
);

-- Catálogo de aulas
CREATE TABLE aulas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Periodos académicos (trimestres)
CREATE TABLE periodos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,  -- ej: "2024-2"
    anio INTEGER NOT NULL,
    activo BOOLEAN DEFAULT FALSE
);

-- Alumnos
CREATE TABLE alumnos (
    matricula INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero VARCHAR(1),
    email VARCHAR(200) UNIQUE,
    telefono VARCHAR(20),
    direccion VARCHAR(300),
    ciudad VARCHAR(100),
    estado VARCHAR(100),
    codigo_postal VARCHAR(10),
    latitud NUMERIC(10, 6),
    longitud NUMERIC(10, 6),
    fecha_ingreso DATE,
    estatus VARCHAR(20) DEFAULT 'Activo'
);

-- Grupos: una materia ofertada en un periodo con profesor, horario y aula
CREATE TABLE grupos (
    id SERIAL PRIMARY KEY,
    materia_codigo VARCHAR(20) NOT NULL REFERENCES materias(codigo),
    profesor_id INTEGER NOT NULL REFERENCES profesores(id),
    aula_id INTEGER NOT NULL REFERENCES aulas(id),
    periodo_id INTEGER NOT NULL REFERENCES periodos(id),
    horario VARCHAR(100) NOT NULL,
    cupo_maximo INTEGER NOT NULL DEFAULT 40,
    UNIQUE (materia_codigo, profesor_id, periodo_id, horario)
);

-- Inscripciones: alumno inscrito en un grupo
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    alumno_matricula INTEGER NOT NULL REFERENCES alumnos(matricula),
    grupo_id INTEGER NOT NULL REFERENCES grupos(id),
    fecha_inscripcion TIMESTAMP DEFAULT NOW(),
    UNIQUE (alumno_matricula, grupo_id)
);

-- Historial académico: calificaciones de periodos anteriores
CREATE TABLE historial_academico (
    id SERIAL PRIMARY KEY,
    alumno_matricula INTEGER NOT NULL REFERENCES alumnos(matricula),
    materia_codigo VARCHAR(20) NOT NULL REFERENCES materias(codigo),
    calificacion NUMERIC(4, 1) CHECK (calificacion >= 0 AND calificacion <= 10),
    creditos INTEGER NOT NULL,
    periodo_id INTEGER NOT NULL REFERENCES periodos(id),
    estatus VARCHAR(20) DEFAULT 'Aprobado'
);

-- Índices para consultas frecuentes
CREATE INDEX idx_inscripciones_alumno ON inscripciones(alumno_matricula);
CREATE INDEX idx_inscripciones_grupo ON inscripciones(grupo_id);
CREATE INDEX idx_historial_alumno ON historial_academico(alumno_matricula);
CREATE INDEX idx_grupos_periodo ON grupos(periodo_id);
CREATE INDEX idx_alumnos_estatus ON alumnos(estatus);
CREATE INDEX idx_alumnos_nombre ON alumnos(nombre, apellido);

-- Vista: cupo disponible por grupo
CREATE VIEW vista_cupo_grupos AS
SELECT
    g.id AS grupo_id,
    m.codigo,
    m.nombre AS materia,
    p.nombre AS profesor,
    a.nombre AS aula,
    g.horario,
    per.nombre AS periodo,
    g.cupo_maximo,
    g.cupo_maximo - COUNT(i.id) AS cupo_disponible
FROM grupos g
JOIN materias m ON g.materia_codigo = m.codigo
JOIN profesores p ON g.profesor_id = p.id
JOIN aulas a ON g.aula_id = a.id
JOIN periodos per ON g.periodo_id = per.id
LEFT JOIN inscripciones i ON i.grupo_id = g.id
GROUP BY g.id, m.codigo, m.nombre, p.nombre, a.nombre, g.horario, per.nombre, g.cupo_maximo;

COMMIT;
