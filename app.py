import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Configuración de la página
st.set_page_config(page_title="Sistema de Gestión de Alumnos", layout="wide")

# Cargar datos
@st.cache_data
def cargar_datos():
    alumnos = pd.read_csv('datos_alumnos.csv')
    materias_actuales = pd.read_csv('materias_actuales.csv')
    historial = pd.read_csv('historial_academico.csv')
    return alumnos, materias_actuales, historial

alumnos, materias_actuales, historial = cargar_datos()

# Título
st.title("🎓 Sistema de Gestión de Alumnos")

# Sidebar para búsqueda
st.sidebar.header("🔍 Búsqueda")
tipo_busqueda = st.sidebar.radio("Buscar por:", ["Matrícula", "Nombre", "Ver Todos"])

alumno_seleccionado = None

if tipo_busqueda == "Matrícula":
    matricula = st.sidebar.text_input("Ingresa la matrícula:")
    if matricula:
        alumno_seleccionado = alumnos[alumnos['matricula'] == int(matricula)] if matricula.isdigit() else pd.DataFrame()

elif tipo_busqueda == "Nombre":
    nombre = st.sidebar.text_input("Ingresa el nombre o apellido:")
    if nombre:
        alumno_seleccionado = alumnos[
            alumnos['nombre'].str.contains(nombre, case=False, na=False) | 
            alumnos['apellido'].str.contains(nombre, case=False, na=False)
        ]

else:
    alumno_seleccionado = alumnos

# Mostrar resultados
if alumno_seleccionado is not None and not alumno_seleccionado.empty:
    
    # Tabs principales
    tab1, tab2, tab3, tab4 = st.tabs(["📋 Datos Personales", "📚 Materias Actuales", "📊 Historial Académico", "🗺️ Mapa"])
    
    with tab1:
        st.header("Datos Personales")
        
        # Mostrar tabla con drag and drop
        st.dataframe(
            alumno_seleccionado[['matricula', 'nombre', 'apellido', 'email', 'telefono', 
                                  'ciudad', 'estado', 'estatus']],
            use_container_width=True,
            hide_index=True
        )
        
        # Detalles del alumno seleccionado
        if len(alumno_seleccionado) == 1:
            col1, col2, col3 = st.columns(3)
            alumno = alumno_seleccionado.iloc[0]
            
            with col1:
                st.metric("Matrícula", alumno['matricula'])
                st.metric("Género", alumno['genero'])
            with col2:
                st.metric("Nombre Completo", f"{alumno['nombre']} {alumno['apellido']}")
                st.metric("Fecha de Ingreso", alumno['fecha_ingreso'])
            with col3:
                st.metric("Email", alumno['email'])
                st.metric("Estatus", alumno['estatus'])
    
    with tab2:
        st.header("Materias del Semestre Actual")
        
        if len(alumno_seleccionado) == 1:
            matricula_sel = alumno_seleccionado.iloc[0]['matricula']
            materias_alumno = materias_actuales[materias_actuales['matricula'] == matricula_sel]
            
            if not materias_alumno.empty:
                st.dataframe(
                    materias_alumno[['codigo_materia', 'nombre_materia', 'creditos', 
                                     'profesor', 'horario', 'aula']],
                    use_container_width=True,
                    hide_index=True
                )
                
                # Resumen de créditos
                total_creditos = materias_alumno['creditos'].sum()
                st.metric("Total de Créditos", total_creditos)
            else:
                st.info("No hay materias registradas para este semestre")
        else:
            st.info("Selecciona un alumno específico para ver sus materias")
    
    with tab3:
        st.header("Historial Académico")
        
        if len(alumno_seleccionado) == 1:
            matricula_sel = alumno_seleccionado.iloc[0]['matricula']
            historial_alumno = historial[historial['matricula'] == matricula_sel]
            
            if not historial_alumno.empty:
                # Tabla de historial
                st.dataframe(
                    historial_alumno[['periodo', 'año', 'nombre_materia', 'calificacion', 
                                      'creditos', 'estatus']],
                    use_container_width=True,
                    hide_index=True
                )
                
                # Métricas
                col1, col2, col3 = st.columns(3)
                with col1:
                    promedio = historial_alumno['calificacion'].mean()
                    st.metric("Promedio General", f"{promedio:.2f}")
                with col2:
                    creditos_aprobados = historial_alumno[historial_alumno['estatus'] == 'Aprobado']['creditos'].sum()
                    st.metric("Créditos Aprobados", creditos_aprobados)
                with col3:
                    materias_cursadas = len(historial_alumno)
                    st.metric("Materias Cursadas", materias_cursadas)
                
                # Gráfica de evolución
                st.subheader("Evolución del Promedio")
                historial_ordenado = historial_alumno.sort_values(['año', 'periodo'])
                fig = px.line(historial_ordenado, x='periodo', y='calificacion', 
                             markers=True, title='Calificaciones por Periodo')
                st.plotly_chart(fig, use_container_width=True)
                
                # Gráfica de barras por materia
                st.subheader("Calificaciones por Materia")
                fig2 = px.bar(historial_alumno, x='nombre_materia', y='calificacion',
                             color='calificacion', color_continuous_scale='RdYlGn')
                fig2.update_layout(xaxis_tickangle=-45)
                st.plotly_chart(fig2, use_container_width=True)
            else:
                st.info("No hay historial académico registrado")
        else:
            st.info("Selecciona un alumno específico para ver su historial")
    
    with tab4:
        st.header("Ubicación Geográfica")
        
        # Mapa con todos los alumnos o el seleccionado
        datos_mapa = alumno_seleccionado.copy()
        datos_mapa['info'] = datos_mapa['nombre'] + ' ' + datos_mapa['apellido'] + ' (' + datos_mapa['matricula'].astype(str) + ')'
        
        fig_mapa = px.scatter_mapbox(
            datos_mapa,
            lat='latitud',
            lon='longitud',
            hover_name='info',
            hover_data={'direccion': True, 'ciudad': True, 'latitud': False, 'longitud': False},
            zoom=11,
            height=500
        )
        fig_mapa.update_layout(mapbox_style="open-street-map")
        st.plotly_chart(fig_mapa, use_container_width=True)

else:
    st.info("👆 Usa el panel lateral para buscar alumnos")
    
    # Estadísticas generales
    st.header("📊 Estadísticas Generales")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total de Alumnos", len(alumnos))
    with col2:
        activos = len(alumnos[alumnos['estatus'] == 'Activo'])
        st.metric("Alumnos Activos", activos)
    with col3:
        promedio_general = historial['calificacion'].mean()
        st.metric("Promedio General", f"{promedio_general:.2f}")
    with col4:
        total_materias = len(materias_actuales)
        st.metric("Inscripciones Actuales", total_materias)
    
    # Distribución por ciudad
    st.subheader("Distribución de Alumnos por Ciudad")
    ciudad_counts = alumnos['ciudad'].value_counts()
    fig = px.pie(values=ciudad_counts.values, names=ciudad_counts.index, 
                 title='Alumnos por Ciudad')
    st.plotly_chart(fig, use_container_width=True)
