# Sistema de Gestion de Alumnos

Aplicacion web para gestionar alumnos, inscripciones y historial academico de una escuela.

**Stack:** FastAPI + PostgreSQL + HTML/JS/CSS (vanilla)

## Estructura del proyecto

```
BD_alumnos/
├── app/                  # Backend FastAPI
│   ├── main.py           # Rutas y punto de entrada
│   ├── config.py         # Configuracion desde .env
│   └── db.py             # Pool de conexiones PostgreSQL
├── frontend/             # Interfaz web
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── sql/                  # Base de datos
│   ├── schema.sql        # Esquema (tablas, indices, vistas)
│   └── migrate.py        # Migracion de CSVs a PostgreSQL
├── data/                 # Datos iniciales (CSVs)
│   ├── datos_alumnos.csv
│   ├── materias_actuales.csv
│   └── historial_academico.csv
├── sync/                 # Sincronizacion con Google Forms
│   ├── google_sheets.py  # Script de importacion
│   └── SETUP_GOOGLE.md   # Guia de configuracion paso a paso
├── .env.example          # Variables de entorno (plantilla)
├── .gitignore
├── gestion-escolar.service  # Servicio systemd (arranque automatico)
├── requirements.txt
└── README.md
```

## Instalacion

### 1. Dependencias Python

```bash
pip install -r requirements.txt
```

### 2. Base de datos

Crear la base de datos y el usuario en PostgreSQL:

```sql
CREATE USER bd_alumnos_admin WITH PASSWORD 'tu_password';
CREATE DATABASE bd_alumnos OWNER bd_alumnos_admin;
```

Aplicar el esquema:

```bash
psql -U bd_alumnos_admin -d bd_alumnos -f sql/schema.sql
```

### 3. Configuracion

Copiar `.env.example` a `.env` y ajustar las credenciales:

```bash
cp .env.example .env
```

### 4. Migrar datos iniciales (opcional)

```bash
python -m sql.migrate
```

## Ejecucion

```bash
uvicorn app.main:app --reload --port 8001
```

Abrir http://localhost:8001 en el navegador.

### Arranque automatico (servidor dedicado)

Para que el sistema inicie automaticamente al encender la maquina:

```bash
sudo cp gestion-escolar.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gestion-escolar
sudo systemctl start gestion-escolar
```

Verificar estado: `sudo systemctl status gestion-escolar`

### Sincronizacion con Google Forms (opcional)

Permite capturar datos de alumnos via Google Forms.
Ver instrucciones completas en [sync/SETUP_GOOGLE.md](sync/SETUP_GOOGLE.md).

## API

| Metodo   | Ruta                                  | Descripcion                        |
|----------|---------------------------------------|------------------------------------|
| `GET`    | `/api/alumnos?q=`                     | Listar/buscar alumnos              |
| `GET`    | `/api/alumnos/{matricula}`            | Detalle de un alumno               |
| `GET`    | `/api/alumnos/{matricula}/inscripciones` | Inscripciones del alumno        |
| `GET`    | `/api/alumnos/{matricula}/historial`  | Historial academico                |
| `GET`    | `/api/materias`                       | Catalogo de materias               |
| `GET`    | `/api/grupos?periodo_id=`             | Grupos disponibles                 |
| `POST`   | `/api/inscripciones`                  | Inscribir alumno a grupo           |
| `DELETE` | `/api/inscripciones/{id}`             | Cancelar inscripcion               |
| `GET`    | `/api/estadisticas`                   | Estadisticas generales             |
| `GET`    | `/api/periodos`                       | Lista de periodos academicos       |
