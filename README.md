# Sistema de Gestión de Alumnos

Sistema completo con múltiples bases de datos CSV y visualización interactiva.

## 📁 Estructura de Archivos

- **datos_alumnos.csv** - Datos personales, contacto y geolocalización
- **materias_actuales.csv** - Materias inscritas en el semestre actual
- **historial_academico.csv** - Historial completo de calificaciones
- **app.py** - Aplicación web interactiva con Streamlit

## 🚀 Instalación

```bash
# Instalar dependencias
pip install -r requirements.txt
```

## 💻 Uso

### Ejecutar la aplicación web:
```bash
streamlit run app.py
```

## ✨ Características

- 🔍 **Búsqueda** por matrícula o nombre
- 📋 **Datos personales** con información de contacto
- 📚 **Materias actuales** del semestre en curso
- 📊 **Historial académico** completo con visualizaciones
- 🗺️ **Mapa interactivo** con ubicación de alumnos
- 📈 **Gráficas** de evolución y rendimiento
- 🎯 **Métricas** de promedio, créditos y más

## 📊 Bases de Datos

### datos_alumnos.csv
Contiene: matrícula, nombre, apellido, fecha_nacimiento, género, email, teléfono, dirección, ciudad, estado, código_postal, latitud, longitud, fecha_ingreso, estatus

### materias_actuales.csv
Contiene: id_inscripcion, matrícula, código_materia, nombre_materia, créditos, profesor, horario, aula, semestre, año

### historial_academico.csv
Contiene: id_historial, matrícula, código_materia, nombre_materia, calificación, créditos, periodo, año, estatus
