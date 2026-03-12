const API = "";

const WORKSPACE_META = {
    alumno: {
        eyebrow: "Espacio alumno",
        title: "Consulta de trayectoria",
        description: "Selecciona un alumno y enfoca la experiencia en avance academico, materias e inscripciones.",
        viewId: "workspaceAlumno",
        controlId: "studentControls",
        defaultPanel: "alumnoResumen",
    },
    profesor: {
        eyebrow: "Espacio profesor",
        title: "Operacion docente",
        description: "La interfaz prioriza grupos, carga academica y captura de calificaciones del profesor.",
        viewId: "workspaceProfesor",
        controlId: "professorControls",
        defaultPanel: "profesorResumen",
    },
    admin: {
        eyebrow: "Espacio administracion",
        title: "Control escolar",
        description: "Catalogos, periodos y grupos quedan en un espacio propio para no contaminar la consulta academica.",
        viewId: "workspaceAdmin",
        controlId: "adminControls",
        defaultPanel: "adminResumen",
    },
};

const state = {
    workspace: "alumno",
    panels: {
        alumno: "alumnoResumen",
        profesor: "profesorResumen",
        admin: "adminResumen",
    },
    stats: null,
    alumnos: [],
    selectedStudent: null,
    selectedStudentInsights: null,
    profesores: [],
    selectedProfessorId: null,
    selectedProfessor: null,
    profesorGroups: [],
    selectedProfessorGroupId: null,
    grafico: null,
    adminSnapshot: null,
};

window.appState = state;

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
}

async function apiDelete(endpoint) {
    const res = await fetch(API + endpoint, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
}

async function apiPut(endpoint, body = null) {
    const options = { method: "PUT", headers: {} };
    if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }
    const res = await fetch(API + endpoint, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
}

function escapeHtml(text) {
    if (text == null) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

function formatPromedio(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function renderEmptyState(title, body) {
    return `
        <div class="empty-state">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body)}</p>
        </div>
    `;
}

function renderTable(content) {
    return `<div class="table-shell"><table>${content}</table></div>`;
}

function renderStatusBadge(status) {
    const klass = status === "Activo" ? "badge-activo" : "badge-inactivo";
    return `<span class="badge ${klass}">${escapeHtml(status || "Sin estatus")}</span>`;
}

function abrirResumenAlumno() {
    state.workspace = "alumno";
    state.panels.alumno = "alumnoResumen";
    updatePageChrome();
}

function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
}

function updatePageChrome() {
    const meta = WORKSPACE_META[state.workspace];
    document.getElementById("pageEyebrow").textContent = meta.eyebrow;
    document.getElementById("pageTitle").textContent = meta.title;
    document.getElementById("pageDescription").textContent = meta.description;

    document.getElementById("chipAlumno").classList.toggle("active", state.workspace === "alumno");
    document.getElementById("chipProfesor").classList.toggle("active", state.workspace === "profesor");
    document.getElementById("chipAdmin").classList.toggle("active", state.workspace === "admin");

    document.querySelectorAll(".nav-group").forEach((group) => {
        group.classList.toggle("active", group.dataset.workspace === state.workspace);
    });

    document.querySelectorAll(".control-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === meta.controlId);
    });

    Object.values(WORKSPACE_META).forEach((workspaceMeta) => {
        document.getElementById(workspaceMeta.viewId)?.classList.remove("active");
    });
    document.getElementById(meta.viewId)?.classList.add("active");

    document.querySelectorAll(".workspace-panel").forEach((panel) => {
        panel.classList.remove("active");
    });
    document.getElementById(state.panels[state.workspace])?.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((item) => {
        const isActive =
            item.dataset.workspace === state.workspace &&
            item.dataset.panel === state.panels[state.workspace];
        item.classList.toggle("active", isActive);
    });

    renderOverview();
    updateAlumnoIndicator();
    updateProfesorIndicator();
    updateAdminIndicator();
}

function renderOverviewCards(items) {
    document.getElementById("overviewGrid").innerHTML = items
        .map(
            (item) => `
                <article class="overview-card">
                    <span class="overview-label">${escapeHtml(item.label)}</span>
                    <span class="overview-value">${escapeHtml(item.value)}</span>
                    <p class="overview-help">${escapeHtml(item.help)}</p>
                </article>
            `
        )
        .join("");
}

function renderOverview() {
    if (state.workspace === "alumno") {
        renderOverviewCards(getAlumnoOverview());
        return;
    }
    if (state.workspace === "profesor") {
        renderOverviewCards(getProfesorOverview());
        return;
    }
    renderOverviewCards(getAdminOverview());
}

function getAlumnoOverview() {
    if (state.selectedStudent && state.selectedStudentInsights) {
        return [
            {
                label: "Alumno",
                value: `${state.selectedStudent.nombre} ${state.selectedStudent.apellido}`,
                help: `Matricula ${state.selectedStudent.matricula} · ${state.selectedStudent.estatus || "Activo"}`,
            },
            {
                label: "Materias inscritas",
                value: String(state.selectedStudentInsights.inscripciones.length),
                help: "Carga del periodo activa en la vista del alumno.",
            },
            {
                label: "Promedio acumulado",
                value: formatPromedio(state.selectedStudentInsights.promedio),
                help: `${state.selectedStudentInsights.creditosAprobados} creditos aprobados en historial.`,
            },
        ];
    }

    return [
        {
            label: "Expedientes",
            value: String(state.stats?.total_alumnos || 0),
            help: "Consulta general de expedientes disponibles.",
        },
        {
            label: "Activos",
            value: String(state.stats?.alumnos_activos || 0),
            help: "Alumnos con estatus activo en el sistema.",
        },
        {
            label: "Promedio general",
            value: formatPromedio(state.stats?.promedio_general),
            help: "Referencia institucional mientras no hay un alumno seleccionado.",
        },
    ];
}

function getProfesorOverview() {
    if (!state.selectedProfessor) {
        return [
            {
                label: "Docentes",
                value: String(state.profesores.length),
                help: "Selecciona un profesor para activar su espacio operativo.",
            },
            {
                label: "Grupos visibles",
                value: "0",
                help: "La vista docente queda vacia hasta elegir al profesor.",
            },
            {
                label: "Foco",
                value: "Grupos",
                help: "Esta interfaz se centra en grupos y calificaciones, no en expedientes globales.",
            },
        ];
    }

    const inscritos = state.profesorGroups.reduce(
        (total, group) => total + (Number(group.cupo_maximo) - Number(group.cupo_disponible)),
        0
    );
    const cupoDisponible = state.profesorGroups.reduce(
        (total, group) => total + Number(group.cupo_disponible),
        0
    );

    return [
        {
            label: "Profesor",
            value: state.selectedProfessor.nombre,
            help: "Contexto docente actualmente seleccionado.",
        },
        {
            label: "Grupos activos",
            value: String(state.profesorGroups.length),
            help: `${inscritos} estudiantes distribuidos en la carga actual.`,
        },
        {
            label: "Cupo disponible",
            value: String(cupoDisponible),
            help: "Lugares libres sumados en todos los grupos del profesor.",
        },
    ];
}

function getAdminOverview() {
    return [
        {
            label: "Alumnos",
            value: String(state.stats?.total_alumnos || 0),
            help: "Control general de expedientes y actividad academica.",
        },
        {
            label: "Grupos",
            value: String(state.adminSnapshot?.grupos || 0),
            help: "Oferta academica del periodo activo.",
        },
        {
            label: "Profesores",
            value: String(state.adminSnapshot?.profesores || 0),
            help: "Plantilla docente disponible para asignacion.",
        },
    ];
}

function buildStudentInsights(inscripciones, historial) {
    const promedio = historial.length
        ? historial.reduce((sum, item) => sum + Number(item.calificacion || 0), 0) / historial.length
        : 0;
    const creditosAprobados = historial
        .filter((item) => item.estatus === "Aprobado")
        .reduce((sum, item) => sum + Number(item.creditos || 0), 0);
    return {
        inscripciones,
        historial,
        promedio,
        creditosAprobados,
    };
}

function setAdminSnapshot(snapshot) {
    state.adminSnapshot = snapshot;
    if (state.workspace === "admin") renderOverview();
    updateAdminIndicator();
}

window.setAdminSnapshot = setAdminSnapshot;
window.api = api;
window.apiPost = apiPost;
window.apiDelete = apiDelete;
window.apiPut = apiPut;
window.escapeHtml = escapeHtml;
window.renderEmptyState = renderEmptyState;
window.renderTable = renderTable;
window.renderStatusBadge = renderStatusBadge;
window.formatPromedio = formatPromedio;

async function cargarEstadisticas() {
    try {
        state.stats = await api("/api/estadisticas");
    } catch (error) {
        console.error("Error cargando estadisticas:", error);
        state.stats = { total_alumnos: 0, alumnos_activos: 0, promedio_general: 0 };
    }
    renderOverview();
    updateAdminIndicator();
}

async function cargarProfesoresSelector() {
    try {
        state.profesores = await api("/api/profesores");
    } catch (error) {
        console.error("Error cargando profesores:", error);
        state.profesores = [];
    }

    const selector = document.getElementById("profesorSelector");
    selector.innerHTML = `
        <option value="">Selecciona un profesor</option>
        ${state.profesores
            .map((profesor) => `<option value="${profesor.id}">${escapeHtml(profesor.nombre)}</option>`)
            .join("")}
    `;

    const profesorActual = state.profesores.find((profesor) => profesor.id === state.selectedProfessorId) || null;
    state.selectedProfessor = profesorActual;
    if (profesorActual) {
        selector.value = String(profesorActual.id);
    } else {
        selector.value = "";
        state.selectedProfessorId = null;
        state.profesorGroups = [];
        state.selectedProfessorGroupId = null;
    }

    renderOverview();
    updateProfesorIndicator();
    renderProfesorResumen();
    renderProfesorGrupos();
    if (!state.selectedProfessor) {
        document.getElementById("profesorCalificacionesPanel").innerHTML = renderEmptyState(
            "Selecciona un profesor",
            "La captura de calificaciones se activa cuando eliges un docente."
        );
    }
}

function cambiarEspacio(workspace) {
    if (!WORKSPACE_META[workspace]) return;
    state.workspace = workspace;
    if (!state.panels[workspace]) {
        state.panels[workspace] = WORKSPACE_META[workspace].defaultPanel;
    }
    updatePageChrome();
    loadCurrentPanel();
    closeSidebar();
}

function navegar(workspace, panelId) {
    if (!WORKSPACE_META[workspace]) return;
    state.workspace = workspace;
    state.panels[workspace] = panelId;
    updatePageChrome();
    loadCurrentPanel();
    closeSidebar();
}

function toggleSidebar() {
    document.getElementById("sidebar")?.classList.toggle("open");
}

function updateAlumnoIndicator() {
    const node = document.getElementById("alumnoIndicador");
    if (!node) return;

    if (!state.selectedStudent) {
        node.innerHTML = "";
        return;
    }

    const alumno = state.selectedStudent;
    node.innerHTML = `
        <div class="selection-banner">
            <div>
                <strong>${escapeHtml(alumno.nombre)} ${escapeHtml(alumno.apellido)}</strong>
                <span>Matricula ${alumno.matricula} · ${escapeHtml(alumno.ciudad || "Sin ciudad")} · ${escapeHtml(alumno.estatus || "Activo")}</span>
            </div>
            <button class="btn-secondary" onclick="deseleccionarAlumno()">Cambiar alumno</button>
        </div>
    `;
}

function updateProfesorIndicator() {
    const node = document.getElementById("profesorIndicador");
    if (!node) return;

    if (!state.selectedProfessor) {
        node.innerHTML = "";
        return;
    }

    node.innerHTML = `
        <div class="selection-banner">
            <div>
                <strong>${escapeHtml(state.selectedProfessor.nombre)}</strong>
                <span>${state.profesorGroups.length} grupo(s) activos listos para operar.</span>
            </div>
            <button class="btn-secondary" onclick="recargarProfesor()">Recargar</button>
        </div>
    `;
}

function updateAdminIndicator() {
    const node = document.getElementById("adminIndicador");
    if (!node) return;

    const periodosActivos = state.adminSnapshot?.periodosActivos ?? 0;
    const grupos = state.adminSnapshot?.grupos ?? 0;
    const alumnos = state.stats?.total_alumnos ?? 0;

    node.innerHTML = `
        <div class="selection-banner">
            <div>
                <strong>Resumen operativo</strong>
                <span>${alumnos} alumnos · ${grupos} grupos · ${periodosActivos} periodo(s) activos</span>
            </div>
            <button class="btn-secondary" onclick="navegar('admin', 'adminResumen')">Ver panorama</button>
        </div>
    `;
}

async function loadCurrentPanel() {
    const panelId = state.panels[state.workspace];

    if (state.workspace === "alumno") {
        if (panelId === "alumnoResumen") {
            if (state.selectedStudent) {
                mostrarDatosAlumno();
            } else if (state.alumnos.length) {
                renderListaAlumnos(state.alumnos, false);
            }
            return;
        }
        if (panelId === "alumnoMaterias") {
            await cargarMateriasAlumno();
            return;
        }
        if (panelId === "alumnoHistorial") {
            await cargarHistorialAlumno();
            return;
        }
        if (panelId === "alumnoInscripcion") {
            await cargarInscripcionAlumno();
        }
        return;
    }

    if (state.workspace === "profesor") {
        if (panelId === "profesorResumen") {
            renderProfesorResumen();
            return;
        }
        if (panelId === "profesorGrupos") {
            renderProfesorGrupos();
            return;
        }
        if (panelId === "profesorCalificaciones") {
            await renderProfesorCalificaciones();
        }
        return;
    }

    const adminLoaders = {
        adminResumen: typeof cargarAdminResumen === "function" ? cargarAdminResumen : null,
        adminAlumnos: typeof cargarAdminAlumnos === "function" ? cargarAdminAlumnos : null,
        adminMaterias: typeof cargarAdminMaterias === "function" ? cargarAdminMaterias : null,
        adminProfesores: typeof cargarAdminProfesores === "function" ? cargarAdminProfesores : null,
        adminAulas: typeof cargarAdminAulas === "function" ? cargarAdminAulas : null,
        adminPeriodos: typeof cargarAdminPeriodos === "function" ? cargarAdminPeriodos : null,
        adminGrupos: typeof cargarAdminGrupos === "function" ? cargarAdminGrupos : null,
        adminCalificaciones: typeof cargarAdminCalificaciones === "function" ? cargarAdminCalificaciones : null,
    };

    if (adminLoaders[panelId]) {
        await adminLoaders[panelId]();
    }
}

function mostrarMensajeSeleccionar() {
    const message = renderEmptyState(
        "Selecciona un alumno",
        "Primero elige un expediente en el espacio de alumno para consultar materias, historial o movimientos de inscripcion."
    );
    document.getElementById("materiasActuales").innerHTML = message;
    document.getElementById("historialAcademico").innerHTML = message;
    document.getElementById("inscripcionPanel").innerHTML = message;
}

async function buscarAlumno() {
    const q = document.getElementById("searchInput").value.trim();
    abrirResumenAlumno();
    if (!q) {
        await mostrarTodos();
        return;
    }

    try {
        const alumnos = await api(`/api/alumnos?q=${encodeURIComponent(q)}`);
        renderListaAlumnos(alumnos);
    } catch (error) {
        document.getElementById("datosPersonales").innerHTML = renderEmptyState(
            "No se pudo buscar",
            error.message
        );
    }
}

async function mostrarTodos() {
    abrirResumenAlumno();
    try {
        const alumnos = await api("/api/alumnos");
        renderListaAlumnos(alumnos);
    } catch (_error) {
        document.getElementById("datosPersonales").innerHTML = renderEmptyState(
            "No hay conexion con el backend",
            "Verifica que FastAPI este corriendo para cargar los expedientes."
        );
    }
}

function resetStudentSelection() {
    state.selectedStudent = null;
    state.selectedStudentInsights = null;
    if (state.grafico) {
        state.grafico.destroy();
        state.grafico = null;
    }
    updateAlumnoIndicator();
    renderOverview();
    mostrarMensajeSeleccionar();
}

function renderListaAlumnos(lista, shouldResetSelection = true) {
    state.alumnos = Array.isArray(lista) ? lista : [];
    if (shouldResetSelection) {
        resetStudentSelection();
    }

    if (!state.alumnos.length) {
        document.getElementById("datosPersonales").innerHTML = renderEmptyState(
            "Sin resultados",
            "No hay alumnos que coincidan con la busqueda actual."
        );
        return;
    }

    const table = renderTable(`
        <thead>
            <tr>
                <th>Matricula</th>
                <th>Nombre</th>
                <th>Ciudad</th>
                <th>Estatus</th>
            </tr>
        </thead>
        <tbody>
            ${state.alumnos
                .map(
                    (alumno) => `
                        <tr class="clickable-row" onclick="seleccionarAlumno(${alumno.matricula})">
                            <td><strong>${alumno.matricula}</strong></td>
                            <td>${escapeHtml(alumno.nombre)} ${escapeHtml(alumno.apellido)}</td>
                            <td>${escapeHtml(alumno.ciudad || "Sin ciudad")}</td>
                            <td>${renderStatusBadge(alumno.estatus)}</td>
                        </tr>
                    `
                )
                .join("")}
        </tbody>
    `);

    document.getElementById("datosPersonales").innerHTML = `
        <div class="result-bar">
            <strong>${state.alumnos.length} expediente(s)</strong> listos para consulta. Se redujo la informacion sensible en la tabla para que la seleccion sea mas segura y rapida.
        </div>
        ${table}
    `;
}

async function seleccionarAlumno(matricula) {
    try {
        const [alumno, inscripciones, historial] = await Promise.all([
            api(`/api/alumnos/${matricula}`),
            api(`/api/alumnos/${matricula}/inscripciones`),
            api(`/api/alumnos/${matricula}/historial`),
        ]);

        state.selectedStudent = alumno;
        state.selectedStudentInsights = buildStudentInsights(inscripciones, historial);

        updateAlumnoIndicator();
        renderOverview();

        if (state.workspace === "alumno" && state.panels.alumno !== "alumnoResumen") {
            await loadCurrentPanel();
            return;
        }

        mostrarDatosAlumno();
    } catch (error) {
        alert(`Error al cargar alumno: ${error.message}`);
    }
}

async function recargarAlumnoSeleccionado() {
    if (!state.selectedStudent) return;
    await seleccionarAlumno(state.selectedStudent.matricula);
}

function mostrarDatosAlumno() {
    if (!state.selectedStudent) return;

    const alumno = state.selectedStudent;
    const insights = state.selectedStudentInsights || buildStudentInsights([], []);

    document.getElementById("datosPersonales").innerHTML = `
        <section class="summary-hero">
            <span class="panel-kicker">Alumno seleccionado</span>
            <h4>${escapeHtml(alumno.nombre)} ${escapeHtml(alumno.apellido)}</h4>
            <p>Esta vista prioriza progreso academico y datos operativos. La direccion completa y la geolocalizacion salen del flujo principal para evitar sobreexposicion.</p>
        </section>

        <section class="metric-strip">
            <article class="metric-card">
                <h4>Promedio</h4>
                <p>${formatPromedio(insights.promedio)}</p>
                <small>Calculado sobre el historial registrado.</small>
            </article>
            <article class="metric-card">
                <h4>Creditos aprobados</h4>
                <p>${insights.creditosAprobados}</p>
                <small>Solo materias con estatus aprobado.</small>
            </article>
            <article class="metric-card">
                <h4>Materias actuales</h4>
                <p>${insights.inscripciones.length}</p>
                <small>Carga inscrita para el periodo activo.</small>
            </article>
        </section>

        <section class="profile-grid">
            <article class="soft-card">
                <label>Matricula</label>
                <strong>${alumno.matricula}</strong>
                <span>Identificador unico del expediente.</span>
            </article>
            <article class="soft-card">
                <label>Correo</label>
                <strong>${escapeHtml(alumno.email || "Sin correo")}</strong>
                <span>Canal primario de contacto.</span>
            </article>
            <article class="soft-card">
                <label>Telefono</label>
                <strong>${escapeHtml(alumno.telefono || "Sin telefono")}</strong>
                <span>Disponible solo en la ficha detallada.</span>
            </article>
            <article class="soft-card">
                <label>Ciudad</label>
                <strong>${escapeHtml([alumno.ciudad, alumno.estado].filter(Boolean).join(", ") || "Sin ubicacion")}</strong>
                <span>Resumen territorial sin mostrar direccion completa.</span>
            </article>
            <article class="soft-card">
                <label>Ingreso</label>
                <strong>${escapeHtml(alumno.fecha_ingreso || "Sin fecha")}</strong>
                <span>Sirve para contextualizar antiguedad academica.</span>
            </article>
            <article class="soft-card">
                <label>Estatus</label>
                <strong>${escapeHtml(alumno.estatus || "Activo")}</strong>
                <span>Condicion actual del alumno en el sistema.</span>
            </article>
        </section>

        <div class="inline-note">
            Para revisar materias, historial o movimientos, usa la navegacion lateral del espacio alumno.
        </div>
    `;
}

function deseleccionarAlumno() {
    abrirResumenAlumno();
    resetStudentSelection();
    if (state.alumnos.length) {
        renderListaAlumnos(state.alumnos, false);
        return;
    }
    mostrarTodos();
}

async function cargarMateriasAlumno() {
    const container = document.getElementById("materiasActuales");
    if (!state.selectedStudent) {
        container.innerHTML = renderEmptyState(
            "Sin alumno seleccionado",
            "Elige primero un expediente para revisar la carga academica."
        );
        return;
    }

    container.innerHTML = '<div class="loading">Cargando materias del periodo...</div>';
    const inscripciones =
        state.selectedStudentInsights?.inscripciones ||
        (await api(`/api/alumnos/${state.selectedStudent.matricula}/inscripciones`));

    if (!inscripciones.length) {
        container.innerHTML = renderEmptyState(
            "Sin materias en el periodo",
            "Este alumno no tiene grupos inscritos en el periodo activo."
        );
        return;
    }

    const totalCreditos = inscripciones.reduce((sum, item) => sum + Number(item.creditos || 0), 0);
    container.innerHTML = `
        <section class="metric-strip">
            <article class="metric-card">
                <h4>Materias</h4>
                <p>${inscripciones.length}</p>
                <small>Total de grupos activos para el alumno.</small>
            </article>
            <article class="metric-card">
                <h4>Creditos</h4>
                <p>${totalCreditos}</p>
                <small>Suma de creditos de la carga actual.</small>
            </article>
        </section>
        ${renderTable(`
            <thead>
                <tr>
                    <th>Codigo</th>
                    <th>Materia</th>
                    <th>Profesor</th>
                    <th>Horario</th>
                    <th>Aula</th>
                </tr>
            </thead>
            <tbody>
                ${inscripciones
                    .map(
                        (item) => `
                            <tr>
                                <td>${escapeHtml(item.codigo)}</td>
                                <td>${escapeHtml(item.materia)}</td>
                                <td>${escapeHtml(item.profesor)}</td>
                                <td>${escapeHtml(item.horario)}</td>
                                <td>${escapeHtml(item.aula)}</td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function cargarHistorialAlumno() {
    const container = document.getElementById("historialAcademico");
    if (!state.selectedStudent) {
        container.innerHTML = renderEmptyState(
            "Sin alumno seleccionado",
            "Elige primero un expediente para revisar el historial academico."
        );
        return;
    }

    container.innerHTML = '<div class="loading">Cargando historial academico...</div>';
    const historial =
        state.selectedStudentInsights?.historial ||
        (await api(`/api/alumnos/${state.selectedStudent.matricula}/historial`));

    if (!historial.length) {
        container.innerHTML = renderEmptyState(
            "Historial vacio",
            "Todavia no hay calificaciones registradas para este alumno."
        );
        return;
    }

    const promedio = historial.reduce((sum, item) => sum + Number(item.calificacion || 0), 0) / historial.length;
    const creditosAprobados = historial
        .filter((item) => item.estatus === "Aprobado")
        .reduce((sum, item) => sum + Number(item.creditos || 0), 0);

    container.innerHTML = `
        <section class="metric-strip">
            <article class="metric-card">
                <h4>Promedio</h4>
                <p>${formatPromedio(promedio)}</p>
                <small>Promedio acumulado sobre materias cursadas.</small>
            </article>
            <article class="metric-card">
                <h4>Creditos aprobados</h4>
                <p>${creditosAprobados}</p>
                <small>Creditos consolidados en historial.</small>
            </article>
            <article class="metric-card">
                <h4>Materias cursadas</h4>
                <p>${historial.length}</p>
                <small>Registros almacenados en el historial academico.</small>
            </article>
        </section>
        ${renderTable(`
            <thead>
                <tr>
                    <th>Periodo</th>
                    <th>Materia</th>
                    <th>Calificacion</th>
                    <th>Creditos</th>
                    <th>Estatus</th>
                </tr>
            </thead>
            <tbody>
                ${historial
                    .map(
                        (item) => `
                            <tr>
                                <td>${escapeHtml(item.periodo)}-${escapeHtml(item.anio)}</td>
                                <td>${escapeHtml(item.materia)}</td>
                                <td><strong>${escapeHtml(item.calificacion)}</strong></td>
                                <td>${escapeHtml(item.creditos)}</td>
                                <td>${escapeHtml(item.estatus)}</td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
        <canvas id="graficoHistorial"></canvas>
    `;

    crearGrafico(historial);
}

function crearGrafico(historial) {
    const canvas = document.getElementById("graficoHistorial");
    if (!canvas) return;
    if (state.grafico) state.grafico.destroy();

    state.grafico = new Chart(canvas, {
        type: "line",
        data: {
            labels: historial.map((item) => `${item.periodo}-${item.anio}`),
            datasets: [
                {
                    label: "Calificaciones",
                    data: historial.map((item) => Number(item.calificacion)),
                    borderColor: "#2f5b53",
                    backgroundColor: "rgba(47, 91, 83, 0.12)",
                    pointBackgroundColor: "#c7694d",
                    tension: 0.35,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "Evolucion del rendimiento academico",
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                },
            },
        },
    });
}

async function cargarInscripcionAlumno() {
    const container = document.getElementById("inscripcionPanel");
    if (!state.selectedStudent) {
        container.innerHTML = renderEmptyState(
            "Sin alumno seleccionado",
            "Elige primero un expediente para operar inscripciones."
        );
        return;
    }

    container.innerHTML = '<div class="loading">Cargando oferta del periodo...</div>';

    const [grupos, inscripciones] = await Promise.all([
        api("/api/grupos"),
        api(`/api/alumnos/${state.selectedStudent.matricula}/inscripciones`),
    ]);

    const inscritos = new Set(inscripciones.map((item) => item.grupo_id));
    const disponibles = grupos.filter((group) => !inscritos.has(group.id) && Number(group.cupo_disponible) > 0);

    const bloques = [];

    if (inscripciones.length) {
        bloques.push(`
            <h4 class="section-subtitle">Materias inscritas</h4>
            ${renderTable(`
                <thead>
                    <tr>
                        <th>Materia</th>
                        <th>Profesor</th>
                        <th>Horario</th>
                        <th>Aula</th>
                        <th>Accion</th>
                    </tr>
                </thead>
                <tbody>
                    ${inscripciones
                        .map(
                            (item) => `
                                <tr>
                                    <td>${escapeHtml(item.materia)}</td>
                                    <td>${escapeHtml(item.profesor)}</td>
                                    <td>${escapeHtml(item.horario)}</td>
                                    <td>${escapeHtml(item.aula)}</td>
                                    <td><button class="btn-danger" onclick="cancelarInscripcion(${item.inscripcion_id}, ${state.selectedStudent.matricula})">Dar de baja</button></td>
                                </tr>
                            `
                        )
                        .join("")}
                </tbody>
            `)}
        `);
    }

    if (disponibles.length) {
        bloques.push(`
            <h4 class="section-subtitle">Grupos disponibles</h4>
            ${renderTable(`
                <thead>
                    <tr>
                        <th>Materia</th>
                        <th>Creditos</th>
                        <th>Profesor</th>
                        <th>Horario</th>
                        <th>Aula</th>
                        <th>Cupo</th>
                        <th>Accion</th>
                    </tr>
                </thead>
                <tbody>
                    ${disponibles
                        .map(
                            (group) => `
                                <tr>
                                    <td>${escapeHtml(group.materia)}</td>
                                    <td>${escapeHtml(group.creditos)}</td>
                                    <td>${escapeHtml(group.profesor)}</td>
                                    <td>${escapeHtml(group.horario)}</td>
                                    <td>${escapeHtml(group.aula)}</td>
                                    <td>${group.cupo_disponible}/${group.cupo_maximo}</td>
                                    <td><button class="btn-success" onclick="inscribir(${state.selectedStudent.matricula}, ${group.id})">Inscribir</button></td>
                                </tr>
                            `
                        )
                        .join("")}
                </tbody>
            `)}
        `);
    } else {
        bloques.push(
            renderEmptyState(
                "No hay grupos disponibles",
                "La oferta del periodo no tiene cupo libre para este alumno."
            )
        );
    }

    container.innerHTML = `
        <div class="inline-note">
            Este modulo esta separado del resumen del alumno para reducir errores operativos al momento de dar altas y bajas.
        </div>
        ${bloques.join("")}
    `;
}

async function inscribir(matricula, grupoId) {
    try {
        const result = await apiPost("/api/inscripciones", {
            alumno_matricula: matricula,
            grupo_id: grupoId,
        });
        alert(result.mensaje);
        await recargarAlumnoSeleccionado();
        await cargarInscripcionAlumno();
        renderOverview();
        if (state.panels.alumno === "alumnoMaterias") {
            await cargarMateriasAlumno();
        }
        await cargarEstadisticas();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cancelarInscripcion(inscripcionId, matricula) {
    if (!confirm("Seguro que deseas dar de baja esta materia?")) return;
    try {
        const result = await apiDelete(`/api/inscripciones/${inscripcionId}`);
        alert(result.mensaje);
        await recargarAlumnoSeleccionado();
        await cargarInscripcionAlumno();
        if (state.panels.alumno === "alumnoMaterias") {
            await cargarMateriasAlumno();
        }
        await cargarEstadisticas();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function seleccionarProfesor(profesorId) {
    const id = Number(profesorId);
    if (!id) {
        state.selectedProfessorId = null;
        state.selectedProfessor = null;
        state.profesorGroups = [];
        state.selectedProfessorGroupId = null;
        renderOverview();
        renderProfesorResumen();
        renderProfesorGrupos();
        document.getElementById("profesorCalificacionesPanel").innerHTML = renderEmptyState(
            "Selecciona un profesor",
            "Primero elige un docente para capturar calificaciones."
        );
        updateProfesorIndicator();
        return;
    }

    state.selectedProfessorId = id;
    state.selectedProfessor = state.profesores.find((profesor) => profesor.id === id) || null;
    await cargarDatosProfesor();
}

async function recargarProfesor() {
    if (!state.selectedProfessorId) return;
    await cargarDatosProfesor();
}

async function cargarDatosProfesor() {
    if (!state.selectedProfessorId) return;

    try {
        state.profesorGroups = await api(`/api/grupos?profesor_id=${state.selectedProfessorId}`);
        if (
            !state.selectedProfessorGroupId ||
            !state.profesorGroups.some((group) => group.id === state.selectedProfessorGroupId)
        ) {
            state.selectedProfessorGroupId = state.profesorGroups[0]?.id || null;
        }
    } catch (error) {
        console.error("Error cargando grupos del profesor:", error);
        state.profesorGroups = [];
        state.selectedProfessorGroupId = null;
    }

    renderOverview();
    updateProfesorIndicator();
    await loadCurrentPanel();
}

function renderProfesorResumen() {
    const container = document.getElementById("profesorResumenPanel");

    if (!state.selectedProfessor) {
        container.innerHTML = renderEmptyState(
            "Selecciona un profesor",
            "Al elegir un docente se activa su panorama, sus grupos y la captura de calificaciones."
        );
        return;
    }

    if (!state.profesorGroups.length) {
        container.innerHTML = renderEmptyState(
            "Sin grupos activos",
            "El profesor seleccionado no tiene grupos en el periodo activo."
        );
        return;
    }

    const inscritos = state.profesorGroups.reduce(
        (total, group) => total + (Number(group.cupo_maximo) - Number(group.cupo_disponible)),
        0
    );
    const ocupacion = state.profesorGroups.reduce((total, group) => total + Number(group.cupo_maximo), 0);

    container.innerHTML = `
        <section class="summary-hero">
            <span class="panel-kicker">Docente activo</span>
            <h4>${escapeHtml(state.selectedProfessor.nombre)}</h4>
            <p>Esta vista concentra los grupos del periodo activo y las acciones que el profesor necesita ejecutar sin entrar al espacio administrativo.</p>
        </section>

        <section class="metric-strip">
            <article class="metric-card">
                <h4>Grupos</h4>
                <p>${state.profesorGroups.length}</p>
                <small>Carga vigente del profesor.</small>
            </article>
            <article class="metric-card">
                <h4>Estudiantes</h4>
                <p>${inscritos}</p>
                <small>Inscritos sumados en todos sus grupos.</small>
            </article>
            <article class="metric-card">
                <h4>Ocupacion</h4>
                <p>${ocupacion ? Math.round((inscritos / ocupacion) * 100) : 0}%</p>
                <small>Relacion entre inscritos y cupo disponible.</small>
            </article>
        </section>

        <section class="group-grid">
            ${state.profesorGroups
                .slice(0, 3)
                .map((group) => renderProfesorGroupCard(group))
                .join("")}
        </section>
    `;
}

function renderProfesorGroupCard(group) {
    const inscritos = Number(group.cupo_maximo) - Number(group.cupo_disponible);
    return `
        <article class="group-card">
            <div class="group-card-top">
                <div>
                    <span class="badge badge-neutral">${escapeHtml(group.codigo)}</span>
                    <h4>${escapeHtml(group.materia)}</h4>
                </div>
                <span class="badge badge-activo">${inscritos}/${group.cupo_maximo}</span>
            </div>
            <p>${escapeHtml(group.horario)} · ${escapeHtml(group.aula)} · ${escapeHtml(group.periodo)}</p>
            <div class="group-meta">
                <div class="group-meta-item">
                    <label>Inscritos</label>
                    <strong>${inscritos}</strong>
                </div>
                <div class="group-meta-item">
                    <label>Cupo disponible</label>
                    <strong>${group.cupo_disponible}</strong>
                </div>
            </div>
            <div class="group-actions">
                <button class="btn-secondary" onclick="navegar('profesor', 'profesorGrupos')">Ver detalle</button>
                <button onclick="abrirGrupoProfesor(${group.id})">Capturar</button>
            </div>
        </article>
    `;
}

function renderProfesorGrupos() {
    const container = document.getElementById("profesorGruposPanel");

    if (!state.selectedProfessor) {
        container.innerHTML = renderEmptyState(
            "Sin profesor seleccionado",
            "Elige un docente para listar sus grupos asignados."
        );
        return;
    }

    if (!state.profesorGroups.length) {
        container.innerHTML = renderEmptyState(
            "Sin grupos en el periodo",
            "No hay grupos asignados al profesor en el periodo activo."
        );
        return;
    }

    container.innerHTML = `
        <section class="group-grid">
            ${state.profesorGroups.map((group) => renderProfesorGroupCard(group)).join("")}
        </section>
    `;
}

function abrirGrupoProfesor(grupoId) {
    state.selectedProfessorGroupId = Number(grupoId);
    navegar("profesor", "profesorCalificaciones");
}

async function renderProfesorCalificaciones() {
    const container = document.getElementById("profesorCalificacionesPanel");

    if (!state.selectedProfessor) {
        container.innerHTML = renderEmptyState(
            "Selecciona un profesor",
            "La captura de calificaciones necesita un contexto docente activo."
        );
        return;
    }

    if (!state.profesorGroups.length) {
        container.innerHTML = renderEmptyState(
            "Sin grupos para capturar",
            "El profesor no tiene grupos en el periodo activo."
        );
        return;
    }

    const selectedGroup =
        state.profesorGroups.find((group) => group.id === state.selectedProfessorGroupId) ||
        state.profesorGroups[0];
    state.selectedProfessorGroupId = selectedGroup.id;

    container.innerHTML = '<div class="loading">Cargando captura de calificaciones...</div>';

    const [alumnos, periodos] = await Promise.all([
        api(`/api/grupos/${selectedGroup.id}/alumnos`),
        api("/api/periodos"),
    ]);

    if (!alumnos.length) {
        container.innerHTML = renderEmptyState(
            "Sin alumnos inscritos",
            "No hay estudiantes inscritos en este grupo para capturar calificaciones."
        );
        return;
    }

    container.innerHTML = `
        <section class="grade-shell">
            <div class="grade-toolbar">
                <div class="field-stack">
                    <label>Grupo</label>
                    <select id="profCalGrupo" onchange="seleccionarGrupoProfesor(this.value)">
                        ${state.profesorGroups
                            .map(
                                (group) => `
                                    <option value="${group.id}" ${group.id === selectedGroup.id ? "selected" : ""}>
                                        ${escapeHtml(group.materia)} · ${escapeHtml(group.horario)}
                                    </option>
                                `
                            )
                            .join("")}
                    </select>
                </div>
                <div class="field-stack">
                    <label>Periodo</label>
                    <select id="profCalPeriodo">
                        ${periodos
                            .map(
                                (periodo) => `
                                    <option value="${periodo.id}" ${periodo.id === selectedGroup.periodo_id ? "selected" : ""}>
                                        ${escapeHtml(periodo.nombre)}
                                    </option>
                                `
                            )
                            .join("")}
                    </select>
                </div>
                <button class="btn-success" onclick="guardarCalificacionesProfesor(${selectedGroup.id}, [${alumnos
                    .map((alumno) => alumno.matricula)
                    .join(",")}])">Guardar calificaciones</button>
            </div>

            <div class="inline-note">
                ${escapeHtml(selectedGroup.materia)} · ${escapeHtml(selectedGroup.horario)} · ${escapeHtml(selectedGroup.aula)}
            </div>

            ${renderTable(`
                <thead>
                    <tr>
                        <th>Matricula</th>
                        <th>Alumno</th>
                        <th>Calificacion</th>
                    </tr>
                </thead>
                <tbody>
                    ${alumnos
                        .map(
                            (alumno) => `
                                <tr>
                                    <td>${alumno.matricula}</td>
                                    <td>${escapeHtml(alumno.nombre)} ${escapeHtml(alumno.apellido)}</td>
                                    <td><input class="grade-input" type="number" id="prof_cal_${alumno.matricula}" min="0" max="10" step="0.1"></td>
                                </tr>
                            `
                        )
                        .join("")}
                </tbody>
            `)}
        </section>
    `;
}

async function seleccionarGrupoProfesor(grupoId) {
    state.selectedProfessorGroupId = Number(grupoId);
    await renderProfesorCalificaciones();
}

async function guardarCalificacionesProfesor(grupoId, matriculas) {
    const periodoId = Number(document.getElementById("profCalPeriodo")?.value);
    const calificaciones = [];

    matriculas.forEach((matricula) => {
        const input = document.getElementById(`prof_cal_${matricula}`);
        if (!input || input.value === "") return;
        calificaciones.push({
            matricula,
            calificacion: Number(input.value),
        });
    });

    if (!calificaciones.length) {
        alert("No hay calificaciones capturadas");
        return;
    }

    try {
        const result = await apiPost("/api/calificaciones/grupo", {
            grupo_id: grupoId,
            periodo_id: periodoId,
            calificaciones,
        });
        alert(result.mensaje);
        await renderProfesorCalificaciones();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("searchInput").addEventListener("keypress", (event) => {
        if (event.key === "Enter") buscarAlumno();
    });

    updatePageChrome();
    mostrarMensajeSeleccionar();

    await Promise.all([
        cargarEstadisticas(),
        cargarProfesoresSelector(),
        mostrarTodos(),
    ]);

    if (typeof cargarAdminResumen === "function") {
        await cargarAdminResumen();
    }

    renderProfesorResumen();
    renderProfesorGrupos();
    document.getElementById("profesorCalificacionesPanel").innerHTML = renderEmptyState(
        "Selecciona un profesor",
        "La captura de calificaciones se activa cuando eliges un docente."
    );
});

window.buscarAlumno = buscarAlumno;
window.mostrarTodos = mostrarTodos;
window.seleccionarAlumno = seleccionarAlumno;
window.deseleccionarAlumno = deseleccionarAlumno;
window.inscribir = inscribir;
window.cancelarInscripcion = cancelarInscripcion;
window.cambiarEspacio = cambiarEspacio;
window.navegar = navegar;
window.toggleSidebar = toggleSidebar;
window.seleccionarProfesor = seleccionarProfesor;
window.recargarProfesor = recargarProfesor;
window.abrirGrupoProfesor = abrirGrupoProfesor;
window.seleccionarGrupoProfesor = seleccionarGrupoProfesor;
window.guardarCalificacionesProfesor = guardarCalificacionesProfesor;
window.cargarEstadisticas = cargarEstadisticas;
window.cargarProfesoresSelector = cargarProfesoresSelector;
