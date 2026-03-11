const API = '';

let alumnoSeleccionado = null;
let mapa = null;
let grafico = null;

// --- Utilidades ---

async function api(endpoint) {
    const res = await fetch(API + endpoint);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || res.statusText);
    }
    return res.json();
}

async function apiPost(endpoint, body) {
    const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
}

async function apiDelete(endpoint) {
    const res = await fetch(API + endpoint, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
    cargarEstadisticas();
    mostrarTodos();
    mostrarMensajeSeleccionar();
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarAlumno();
});

function mostrarMensajeSeleccionar() {
    const msg = '<div class="no-data">Selecciona un alumno de la lista para ver esta informacion</div>';
    document.getElementById('materiasActuales').innerHTML = msg;
    document.getElementById('historialAcademico').innerHTML = msg;
    document.getElementById('inscripcionPanel').innerHTML = msg;
}

// --- Estadísticas ---

async function cargarEstadisticas() {
    try {
        const stats = await api('/api/estadisticas');
        document.getElementById('totalAlumnos').textContent = stats.total_alumnos;
        document.getElementById('alumnosActivos').textContent = stats.alumnos_activos;
        document.getElementById('promedioGeneral').textContent = stats.promedio_general || '0.00';
    } catch (e) {
        console.error('Error cargando estadísticas:', e);
    }
}

// --- Alumnos ---

async function buscarAlumno() {
    const q = document.getElementById('searchInput').value.trim();
    try {
        const alumnos = await api('/api/alumnos?q=' + encodeURIComponent(q));
        mostrarListaAlumnos(alumnos);
    } catch (e) {
        document.getElementById('datosPersonales').innerHTML =
            '<div class="no-data">Error al buscar: ' + escapeHtml(e.message) + '</div>';
    }
}

async function mostrarTodos() {
    try {
        const alumnos = await api('/api/alumnos');
        mostrarListaAlumnos(alumnos);
    } catch (e) {
        document.getElementById('datosPersonales').innerHTML =
            '<div class="no-data">Error al cargar datos. Verifica que el backend este corriendo.</div>';
    }
}

function mostrarListaAlumnos(lista) {
    alumnoSeleccionado = null;
    actualizarIndicadorAlumno();
    mostrarMensajeSeleccionar();

    const html = `
        <div class="result-bar">
            <strong>${lista.length} resultado(s) encontrado(s)</strong> — Haz clic en un alumno para ver su informacion completa
        </div>
        <table>
            <thead>
                <tr>
                    <th>Matricula</th>
                    <th>Nombre Completo</th>
                    <th>Email</th>
                    <th>Telefono</th>
                    <th>Ciudad</th>
                    <th>Estatus</th>
                </tr>
            </thead>
            <tbody>
                ${lista.map(a => `
                    <tr onclick="seleccionarAlumno(${a.matricula})" style="cursor: pointer;">
                        <td><strong>${a.matricula}</strong></td>
                        <td>${escapeHtml(a.nombre + ' ' + a.apellido)}</td>
                        <td>${escapeHtml(a.email)}</td>
                        <td>${a.telefono}</td>
                        <td>${escapeHtml(a.ciudad)}</td>
                        <td><span class="badge ${a.estatus === 'Activo' ? 'badge-activo' : 'badge-inactivo'}">${escapeHtml(a.estatus)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('datosPersonales').innerHTML = html;
    mostrarMapaTodos(lista);
}

async function seleccionarAlumno(matricula) {
    try {
        alumnoSeleccionado = await api('/api/alumnos/' + matricula);
        actualizarIndicadorAlumno();
        mostrarDatosAlumno();
        // Cargar el tab activo actual
        const tabActivo = document.querySelector('.tab-content.active')?.id;
        cargarContenidoTab(tabActivo);
    } catch (e) {
        console.error('Error seleccionando alumno:', e);
        alert('Error al cargar alumno: ' + e.message);
    }
}

function actualizarIndicadorAlumno() {
    let indicador = document.getElementById('alumnoIndicador');
    if (!indicador) {
        indicador = document.createElement('div');
        indicador.id = 'alumnoIndicador';
        document.querySelector('.topbar').appendChild(indicador);
    }
    if (alumnoSeleccionado) {
        indicador.innerHTML = `
            <div class="alumno-selected-bar">
                <strong>Alumno seleccionado:</strong> ${escapeHtml(alumnoSeleccionado.nombre + ' ' + alumnoSeleccionado.apellido)} (${alumnoSeleccionado.matricula})
                <button onclick="deseleccionarAlumno()">Deseleccionar</button>
            </div>`;
    } else {
        indicador.innerHTML = '';
    }
}

function deseleccionarAlumno() {
    alumnoSeleccionado = null;
    actualizarIndicadorAlumno();
    mostrarTodos();
    mostrarMensajeSeleccionar();
}

function mostrarDatosAlumno() {
    if (!alumnoSeleccionado) return;
    const alumno = alumnoSeleccionado;

    document.getElementById('datosPersonales').innerHTML = `
        <div class="alumno-card">
            <h2>${escapeHtml(alumno.nombre + ' ' + alumno.apellido)}</h2>
            <div class="alumno-info">
                <div class="info-item"><label>Matricula</label><span>${alumno.matricula}</span></div>
                <div class="info-item"><label>Email</label><span>${escapeHtml(alumno.email)}</span></div>
                <div class="info-item"><label>Telefono</label><span>${alumno.telefono}</span></div>
                <div class="info-item"><label>Fecha de Nacimiento</label><span>${alumno.fecha_nacimiento}</span></div>
                <div class="info-item"><label>Genero</label><span>${alumno.genero}</span></div>
                <div class="info-item"><label>Direccion</label><span>${escapeHtml(alumno.direccion)}</span></div>
                <div class="info-item"><label>Ciudad</label><span>${escapeHtml(alumno.ciudad + ', ' + alumno.estado)}</span></div>
                <div class="info-item"><label>Fecha de Ingreso</label><span>${alumno.fecha_ingreso}</span></div>
                <div class="info-item"><label>Estatus</label><span>${escapeHtml(alumno.estatus)}</span></div>
            </div>
        </div>
        <button onclick="deseleccionarAlumno()" style="margin-top: 15px;">&#8592; Volver a la lista</button>
    `;
}

// --- Cargar contenido por tab ---

async function cargarContenidoTab(tabName) {
    if (!alumnoSeleccionado) return;
    const matricula = alumnoSeleccionado.matricula;

    try {
        if (tabName === 'datos') {
            mostrarDatosAlumno();
        } else if (tabName === 'materias') {
            await cargarMateriasAlumno(matricula);
        } else if (tabName === 'historial') {
            await cargarHistorialAlumno(matricula);
        } else if (tabName === 'inscripcion') {
            await cargarInscripcionAlumno(matricula);
        } else if (tabName === 'mapa') {
            mostrarMapaAlumno(alumnoSeleccionado);
        }
    } catch (e) {
        console.error('Error cargando tab ' + tabName + ':', e);
    }
}

// --- Materias actuales del alumno ---

async function cargarMateriasAlumno(matricula) {
    const container = document.getElementById('materiasActuales');
    container.innerHTML = '<div class="loading">Cargando materias...</div>';

    const inscripciones = await api('/api/alumnos/' + matricula + '/inscripciones');
    const alumno = alumnoSeleccionado;

    if (inscripciones.length === 0) {
        container.innerHTML = `
            <div class="alumno-header"><h3>${escapeHtml(alumno.nombre + ' ' + alumno.apellido)} (${alumno.matricula})</h3></div>
            <div class="no-data">No hay materias registradas para este semestre</div>`;
        return;
    }

    const totalCreditos = inscripciones.reduce((sum, m) => sum + (m.creditos || 0), 0);

    container.innerHTML = `
        <div class="alumno-header"><h3>${escapeHtml(alumno.nombre + ' ' + alumno.apellido)} (${alumno.matricula})</h3></div>
        <div class="metric-box">
            <div class="metric"><h4>Total de Materias</h4><p>${inscripciones.length}</p></div>
            <div class="metric"><h4>Total de Creditos</h4><p>${totalCreditos}</p></div>
        </div>
        <table>
            <thead><tr><th>Codigo</th><th>Materia</th><th>Creditos</th><th>Profesor</th><th>Horario</th><th>Aula</th></tr></thead>
            <tbody>
                ${inscripciones.map(m => `
                    <tr>
                        <td>${escapeHtml(m.codigo)}</td>
                        <td>${escapeHtml(m.materia)}</td>
                        <td>${m.creditos}</td>
                        <td>${escapeHtml(m.profesor)}</td>
                        <td>${escapeHtml(m.horario)}</td>
                        <td>${escapeHtml(m.aula)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- Historial académico ---

async function cargarHistorialAlumno(matricula) {
    const container = document.getElementById('historialAcademico');
    container.innerHTML = '<div class="loading">Cargando historial...</div>';

    const historial = await api('/api/alumnos/' + matricula + '/historial');
    const alumno = alumnoSeleccionado;

    if (historial.length === 0) {
        container.innerHTML = `
            <div class="alumno-header"><h3>${escapeHtml(alumno.nombre + ' ' + alumno.apellido)} (${alumno.matricula})</h3></div>
            <div class="no-data">No hay historial academico registrado</div>`;
        return;
    }

    const promedio = (historial.reduce((s, h) => s + Number(h.calificacion), 0) / historial.length).toFixed(2);
    const creditosAprobados = historial.filter(h => h.estatus === 'Aprobado').reduce((s, h) => s + h.creditos, 0);

    container.innerHTML = `
        <div class="alumno-header"><h3>${escapeHtml(alumno.nombre + ' ' + alumno.apellido)} (${alumno.matricula})</h3></div>
        <div class="metric-box">
            <div class="metric"><h4>Promedio General</h4><p>${promedio}</p></div>
            <div class="metric"><h4>Creditos Aprobados</h4><p>${creditosAprobados}</p></div>
            <div class="metric"><h4>Materias Cursadas</h4><p>${historial.length}</p></div>
        </div>
        <table>
            <thead><tr><th>Periodo</th><th>Materia</th><th>Calificacion</th><th>Creditos</th><th>Estatus</th></tr></thead>
            <tbody>
                ${historial.map(h => `
                    <tr>
                        <td>${escapeHtml(h.periodo)}-${h.anio}</td>
                        <td>${escapeHtml(h.materia)}</td>
                        <td style="color: ${Number(h.calificacion) >= 8 ? '#3d7a5f' : Number(h.calificacion) >= 7 ? '#c08a30' : '#b5403a'}; font-weight: bold;">
                            ${h.calificacion}
                        </td>
                        <td>${h.creditos}</td>
                        <td>${escapeHtml(h.estatus)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <canvas id="graficoHistorial"></canvas>
    `;

    crearGrafico(historial);
}

function crearGrafico(historial) {
    const ctx = document.getElementById('graficoHistorial');
    if (!ctx) return;
    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historial.map(h => h.periodo + '-' + h.anio),
            datasets: [{
                label: 'Calificaciones',
                data: historial.map(h => Number(h.calificacion)),
                borderColor: '#c86753',
                backgroundColor: 'rgba(200, 103, 83, 0.12)',
                tension: 0.4,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Evolucion de Calificaciones' } },
            scales: { y: { beginAtZero: true, max: 10 } },
        },
    });
}

// --- Inscripción ---

async function cargarInscripcionAlumno(matricula) {
    const container = document.getElementById('inscripcionPanel');
    container.innerHTML = '<div class="loading">Cargando grupos...</div>';

    const [grupos, inscripciones] = await Promise.all([
        api('/api/grupos'),
        api('/api/alumnos/' + matricula + '/inscripciones'),
    ]);
    const alumno = alumnoSeleccionado;
    const gruposInscritos = new Set(inscripciones.map(i => i.grupo_id));

    let html = `<div class="alumno-header"><h3>Inscripcion: ${escapeHtml(alumno.nombre + ' ' + alumno.apellido)} (${alumno.matricula})</h3></div>`;

    if (inscripciones.length > 0) {
        html += `
            <h3 style="margin: 20px 0 10px;">Materias inscritas</h3>
            <table>
                <thead><tr><th>Materia</th><th>Profesor</th><th>Horario</th><th>Aula</th><th>Accion</th></tr></thead>
                <tbody>
                    ${inscripciones.map(i => `
                        <tr>
                            <td>${escapeHtml(i.materia)}</td>
                            <td>${escapeHtml(i.profesor)}</td>
                            <td>${escapeHtml(i.horario)}</td>
                            <td>${escapeHtml(i.aula)}</td>
                            <td><button onclick="cancelarInscripcion(${i.inscripcion_id}, ${alumno.matricula})" class="btn-danger">Dar de baja</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    const disponibles = grupos.filter(g => !gruposInscritos.has(g.id) && g.cupo_disponible > 0);

    if (disponibles.length > 0) {
        html += `
            <h3 style="margin: 20px 0 10px;">Grupos disponibles</h3>
            <table>
                <thead><tr><th>Materia</th><th>Creditos</th><th>Profesor</th><th>Horario</th><th>Aula</th><th>Cupo</th><th>Accion</th></tr></thead>
                <tbody>
                    ${disponibles.map(g => `
                        <tr>
                            <td>${escapeHtml(g.materia)}</td>
                            <td>${g.creditos}</td>
                            <td>${escapeHtml(g.profesor)}</td>
                            <td>${escapeHtml(g.horario)}</td>
                            <td>${escapeHtml(g.aula)}</td>
                            <td>${g.cupo_disponible}/${g.cupo_maximo}</td>
                            <td><button onclick="inscribir(${alumno.matricula}, ${g.id})" class="btn-success">Inscribir</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        html += '<div class="no-data">No hay grupos disponibles en este periodo</div>';
    }

    container.innerHTML = html;
}

async function inscribir(matricula, grupoId) {
    try {
        const result = await apiPost('/api/inscripciones', {
            alumno_matricula: matricula,
            grupo_id: grupoId,
        });
        alert(result.mensaje);
        cargarInscripcionAlumno(matricula);
        cargarMateriasAlumno(matricula);
        cargarEstadisticas();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function cancelarInscripcion(inscripcionId, matricula) {
    if (!confirm('Seguro que deseas dar de baja esta materia?')) return;
    try {
        const result = await apiDelete('/api/inscripciones/' + inscripcionId);
        alert(result.mensaje);
        cargarInscripcionAlumno(matricula);
        cargarMateriasAlumno(matricula);
        cargarEstadisticas();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// --- Mapa ---

function mostrarMapaAlumno(alumno) {
    if (mapa) mapa.remove();
    mapa = L.map('mapContainer').setView([alumno.latitud, alumno.longitud], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapa);
    L.marker([alumno.latitud, alumno.longitud])
        .addTo(mapa)
        .bindPopup('<b>' + escapeHtml(alumno.nombre + ' ' + alumno.apellido) + '</b><br>' + escapeHtml(alumno.direccion))
        .openPopup();
}

function mostrarMapaTodos(lista) {
    if (mapa) mapa.remove();
    const center = [25.6866, -100.3161];
    mapa = L.map('mapContainer').setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapa);
    lista.forEach(a => {
        if (a.latitud && a.longitud) {
            L.marker([a.latitud, a.longitud])
                .addTo(mapa)
                .bindPopup('<b>' + escapeHtml(a.nombre + ' ' + a.apellido) + '</b><br>' + escapeHtml(a.direccion));
        }
    });
}

// --- Tabs (legacy compat) ---

function cambiarTab(tabName, btn) {
    navegar('consultas', tabName);
}

// --- Sidebar Navigation ---

function navegar(modo, tabName, navEl) {
    // Show/hide modes
    document.getElementById('modoConsultas').style.display = modo === 'consultas' ? '' : 'none';
    document.getElementById('modoAdmin').style.display = modo === 'admin' ? '' : 'none';

    // Hide all tab-content in both modes
    const container = document.getElementById(modo === 'consultas' ? 'modoConsultas' : 'modoAdmin');
    container.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');

    // Load admin data if needed
    if (modo === 'admin') {
        const loaders = {
            adminAlumnos: typeof cargarAdminAlumnos !== 'undefined' ? cargarAdminAlumnos : null,
            adminMaterias: typeof cargarAdminMaterias !== 'undefined' ? cargarAdminMaterias : null,
            adminProfesores: typeof cargarAdminProfesores !== 'undefined' ? cargarAdminProfesores : null,
            adminAulas: typeof cargarAdminAulas !== 'undefined' ? cargarAdminAulas : null,
            adminPeriodos: typeof cargarAdminPeriodos !== 'undefined' ? cargarAdminPeriodos : null,
            adminGrupos: typeof cargarAdminGrupos !== 'undefined' ? cargarAdminGrupos : null,
            adminCalificaciones: typeof cargarAdminCalificaciones !== 'undefined' ? cargarAdminCalificaciones : null,
        };
        if (loaders[tabName]) loaders[tabName]();
    }

    // Load consultas content for selected alumno
    if (modo === 'consultas' && alumnoSeleccionado) {
        cargarContenidoTab(tabName);
    }

    if (tabName === 'mapa' && mapa) {
        setTimeout(() => mapa.invalidateSize(), 100);
    }

    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Legacy compat for admin.js
function cambiarModo(modo) {
    const firstTab = modo === 'admin' ? 'adminAlumnos' : 'datos';
    navegar(modo, firstTab);
}

function cambiarTabAdmin(tabName, btn) {
    navegar('admin', tabName);
}
