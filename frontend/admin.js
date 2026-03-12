async function refreshAdminContext(options = {}) {
    if (options.stats && typeof cargarEstadisticas === "function") {
        await cargarEstadisticas();
    }
    if (options.profesores && typeof cargarProfesoresSelector === "function") {
        await cargarProfesoresSelector();
    }
    await cargarAdminResumen();
}

async function cargarAdminResumen() {
    const container = document.getElementById("adminResumenPanel");
    if (!container) return;

    container.innerHTML = '<div class="loading">Cargando panorama operativo...</div>';

    try {
        const [materias, profesores, aulas, periodos, grupos] = await Promise.all([
            api("/api/materias"),
            api("/api/profesores"),
            api("/api/aulas"),
            api("/api/periodos"),
            api("/api/grupos"),
        ]);

        const activos = periodos.filter((periodo) => periodo.activo);
        setAdminSnapshot({
            grupos: grupos.length,
            profesores: profesores.length,
            aulas: aulas.length,
            periodosActivos: activos.length,
        });

        container.innerHTML = `
            <section class="admin-summary-grid">
                <div>
                    <section class="summary-hero">
                        <span class="panel-kicker">Estado del sistema</span>
                        <h4>Operacion centralizada sin mezclar flujos</h4>
                        <p>La administracion conserva la vista completa del ciclo, mientras alumno y profesor trabajan sobre espacios mas concretos y menos ruidosos.</p>
                    </section>

                    <section class="metric-strip">
                        <article class="metric-card">
                            <h4>Materias</h4>
                            <p>${materias.length}</p>
                            <small>Catalogo academico disponible.</small>
                        </article>
                        <article class="metric-card">
                            <h4>Aulas</h4>
                            <p>${aulas.length}</p>
                            <small>Infraestructura registrada para programacion.</small>
                        </article>
                        <article class="metric-card">
                            <h4>Periodos</h4>
                            <p>${periodos.length}</p>
                            <small>${activos.length} activo(s) en este momento.</small>
                        </article>
                    </section>
                </div>

                <aside class="admin-callout">
                    <h4>Prioridades recomendadas</h4>
                    <p>${activos.length ? `Periodo activo: ${escapeHtml(activos[0].nombre)}` : "No hay un periodo activo configurado."}</p>
                    <ul>
                        <li>Revisa que la oferta de grupos del periodo este completa.</li>
                        <li>Valida que la plantilla docente y las aulas necesarias esten registradas.</li>
                        <li>Usa la captura global solo para soporte excepcional; la operacion normal ya vive en Profesor.</li>
                    </ul>
                </aside>
            </section>
        `;
    } catch (error) {
        container.innerHTML = renderEmptyState(
            "No se pudo cargar el panorama",
            error.message
        );
    }
}

async function cargarAdminAlumnos() {
    const container = document.getElementById("panelAdminAlumnos");
    const alumnos = await api("/api/alumnos");

    container.innerHTML = `
        <div class="admin-form">
            <h3>Registrar alumno</h3>
            <div class="form-grid">
                <div class="form-group"><label>Matricula</label><input type="number" id="alumnoMatricula"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="alumnoNombre"></div>
                <div class="form-group"><label>Apellido</label><input type="text" id="alumnoApellido"></div>
                <div class="form-group"><label>Fecha nacimiento</label><input type="date" id="alumnoFechaNac"></div>
                <div class="form-group">
                    <label>Genero</label>
                    <select id="alumnoGenero">
                        <option value="M">M</option>
                        <option value="F">F</option>
                    </select>
                </div>
                <div class="form-group"><label>Email</label><input type="email" id="alumnoEmail"></div>
                <div class="form-group"><label>Telefono</label><input type="text" id="alumnoTelefono"></div>
                <div class="form-group"><label>Direccion</label><input type="text" id="alumnoDireccion"></div>
                <div class="form-group"><label>Ciudad</label><input type="text" id="alumnoCiudad"></div>
                <div class="form-group"><label>Estado</label><input type="text" id="alumnoEstado"></div>
                <div class="form-group"><label>Codigo postal</label><input type="text" id="alumnoCP"></div>
            </div>
            <button onclick="guardarAlumno()">Registrar alumno</button>
        </div>

        <h3 class="section-subtitle">Expedientes registrados (${alumnos.length})</h3>
        ${renderTable(`
            <thead>
                <tr>
                    <th>Matricula</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Ciudad</th>
                    <th>Estatus</th>
                </tr>
            </thead>
            <tbody>
                ${alumnos
                    .map(
                        (alumno) => `
                            <tr>
                                <td>${alumno.matricula}</td>
                                <td>${escapeHtml(alumno.nombre)} ${escapeHtml(alumno.apellido)}</td>
                                <td>${escapeHtml(alumno.email || "Sin correo")}</td>
                                <td>${escapeHtml(alumno.ciudad || "Sin ciudad")}</td>
                                <td>${renderStatusBadge(alumno.estatus)}</td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function guardarAlumno() {
    const matricula = Number(document.getElementById("alumnoMatricula").value);
    const nombre = document.getElementById("alumnoNombre").value.trim();
    const apellido = document.getElementById("alumnoApellido").value.trim();

    if (!matricula || !nombre || !apellido) {
        alert("Matricula, nombre y apellido son obligatorios");
        return;
    }

    try {
        await apiPost("/api/alumnos", {
            matricula,
            nombre,
            apellido,
            fecha_nacimiento: document.getElementById("alumnoFechaNac").value || null,
            genero: document.getElementById("alumnoGenero").value,
            email: document.getElementById("alumnoEmail").value,
            telefono: document.getElementById("alumnoTelefono").value,
            direccion: document.getElementById("alumnoDireccion").value,
            ciudad: document.getElementById("alumnoCiudad").value,
            estado: document.getElementById("alumnoEstado").value,
            codigo_postal: document.getElementById("alumnoCP").value,
        });
        alert("Alumno registrado");
        await Promise.all([
            cargarAdminAlumnos(),
            refreshAdminContext({ stats: true }),
        ]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cargarAdminMaterias() {
    const container = document.getElementById("panelAdminMaterias");
    const materias = await api("/api/materias");

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nueva materia</h3>
            <div class="form-grid">
                <div class="form-group"><label>Codigo</label><input type="text" id="materiaCodigo" placeholder="MAT101"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="materiaNombre"></div>
                <div class="form-group"><label>Creditos</label><input type="number" id="materiaCreditos" min="1" value="6"></div>
            </div>
            <button onclick="guardarMateria()">Agregar materia</button>
        </div>

        <h3 class="section-subtitle">Catalogo (${materias.length})</h3>
        ${renderTable(`
            <thead>
                <tr>
                    <th>Codigo</th>
                    <th>Nombre</th>
                    <th>Creditos</th>
                    <th>Accion</th>
                </tr>
            </thead>
            <tbody>
                ${materias
                    .map(
                        (materia) => `
                            <tr>
                                <td>${escapeHtml(materia.codigo)}</td>
                                <td>${escapeHtml(materia.nombre)}</td>
                                <td>${materia.creditos}</td>
                                <td><button class="btn-danger" onclick="eliminarMateria('${materia.codigo}')">Eliminar</button></td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function guardarMateria() {
    const codigo = document.getElementById("materiaCodigo").value.trim();
    const nombre = document.getElementById("materiaNombre").value.trim();
    const creditos = Number(document.getElementById("materiaCreditos").value);

    if (!codigo || !nombre || !creditos) {
        alert("Codigo, nombre y creditos son obligatorios");
        return;
    }

    try {
        await apiPost("/api/materias", { codigo, nombre, creditos });
        alert("Materia creada");
        await Promise.all([cargarAdminMaterias(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function eliminarMateria(codigo) {
    if (!confirm(`Eliminar materia ${codigo}?`)) return;
    try {
        await apiDelete(`/api/materias/${codigo}`);
        await Promise.all([cargarAdminMaterias(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cargarAdminProfesores() {
    const container = document.getElementById("panelAdminProfesores");
    const profesores = await api("/api/profesores");

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo profesor</h3>
            <div class="form-grid">
                <div class="form-group"><label>Nombre completo</label><input type="text" id="profesorNombre"></div>
            </div>
            <button onclick="guardarProfesor()">Agregar profesor</button>
        </div>

        <h3 class="section-subtitle">Docentes (${profesores.length})</h3>
        ${renderTable(`
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Accion</th>
                </tr>
            </thead>
            <tbody>
                ${profesores
                    .map(
                        (profesor) => `
                            <tr>
                                <td>${profesor.id}</td>
                                <td>${escapeHtml(profesor.nombre)}</td>
                                <td><button class="btn-danger" onclick="eliminarProfesor(${profesor.id})">Eliminar</button></td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function guardarProfesor() {
    const nombre = document.getElementById("profesorNombre").value.trim();
    if (!nombre) {
        alert("El nombre del profesor es obligatorio");
        return;
    }

    try {
        await apiPost("/api/profesores", { nombre });
        alert("Profesor registrado");
        await Promise.all([
            cargarAdminProfesores(),
            refreshAdminContext({ profesores: true }),
        ]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function eliminarProfesor(id) {
    if (!confirm("Eliminar profesor?")) return;
    try {
        await apiDelete(`/api/profesores/${id}`);
        await Promise.all([
            cargarAdminProfesores(),
            refreshAdminContext({ profesores: true }),
        ]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cargarAdminAulas() {
    const container = document.getElementById("panelAdminAulas");
    const aulas = await api("/api/aulas");

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nueva aula</h3>
            <div class="form-grid">
                <div class="form-group"><label>Nombre o numero</label><input type="text" id="aulaNombre" placeholder="A-101"></div>
            </div>
            <button onclick="guardarAula()">Agregar aula</button>
        </div>

        <h3 class="section-subtitle">Aulas (${aulas.length})</h3>
        ${renderTable(`
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Accion</th>
                </tr>
            </thead>
            <tbody>
                ${aulas
                    .map(
                        (aula) => `
                            <tr>
                                <td>${aula.id}</td>
                                <td>${escapeHtml(aula.nombre)}</td>
                                <td><button class="btn-danger" onclick="eliminarAula(${aula.id})">Eliminar</button></td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function guardarAula() {
    const nombre = document.getElementById("aulaNombre").value.trim();
    if (!nombre) {
        alert("El nombre del aula es obligatorio");
        return;
    }

    try {
        await apiPost("/api/aulas", { nombre });
        alert("Aula creada");
        await Promise.all([cargarAdminAulas(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function eliminarAula(id) {
    if (!confirm("Eliminar aula?")) return;
    try {
        await apiDelete(`/api/aulas/${id}`);
        await Promise.all([cargarAdminAulas(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cargarAdminPeriodos() {
    const container = document.getElementById("panelAdminPeriodos");
    const periodos = await api("/api/periodos");

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo periodo</h3>
            <div class="form-grid">
                <div class="form-group"><label>Nombre</label><input type="text" id="periodoNombre" placeholder="2026-1"></div>
                <div class="form-group"><label>Anio</label><input type="number" id="periodoAnio" value="2026"></div>
                <div class="form-group">
                    <label>Activo</label>
                    <select id="periodoActivo">
                        <option value="false">No</option>
                        <option value="true">Si</option>
                    </select>
                </div>
            </div>
            <button onclick="guardarPeriodo()">Crear periodo</button>
        </div>

        <h3 class="section-subtitle">Periodos</h3>
        ${renderTable(`
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Anio</th>
                    <th>Estado</th>
                    <th>Accion</th>
                </tr>
            </thead>
            <tbody>
                ${periodos
                    .map(
                        (periodo) => `
                            <tr>
                                <td>${periodo.id}</td>
                                <td>${escapeHtml(periodo.nombre)}</td>
                                <td>${periodo.anio}</td>
                                <td>${periodo.activo ? '<span class="badge badge-activo">Activo</span>' : '<span class="badge badge-inactivo">Inactivo</span>'}</td>
                                <td>${periodo.activo ? "" : `<button class="btn-activate" onclick="activarPeriodo(${periodo.id})">Activar</button>`}</td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function guardarPeriodo() {
    const nombre = document.getElementById("periodoNombre").value.trim();
    const anio = Number(document.getElementById("periodoAnio").value);
    const activo = document.getElementById("periodoActivo").value === "true";

    if (!nombre || !anio) {
        alert("Nombre y anio son obligatorios");
        return;
    }

    try {
        await apiPost("/api/periodos", { nombre, anio, activo });
        alert("Periodo creado");
        await Promise.all([cargarAdminPeriodos(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function activarPeriodo(id) {
    try {
        await apiPut(`/api/periodos/${id}/activar`);
        alert("Periodo activado");
        await Promise.all([cargarAdminPeriodos(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cargarAdminGrupos() {
    const container = document.getElementById("panelAdminGrupos");
    const [materias, profesores, aulas, periodos, grupos] = await Promise.all([
        api("/api/materias"),
        api("/api/profesores"),
        api("/api/aulas"),
        api("/api/periodos"),
        api("/api/grupos"),
    ]);

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo grupo</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Materia</label>
                    <select id="grupoMateria">
                        ${materias.map((materia) => `<option value="${materia.codigo}">${escapeHtml(`${materia.codigo} · ${materia.nombre}`)}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group">
                    <label>Profesor</label>
                    <select id="grupoProfesor">
                        ${profesores.map((profesor) => `<option value="${profesor.id}">${escapeHtml(profesor.nombre)}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group">
                    <label>Aula</label>
                    <select id="grupoAula">
                        ${aulas.map((aula) => `<option value="${aula.id}">${escapeHtml(aula.nombre)}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group">
                    <label>Periodo</label>
                    <select id="grupoPeriodo">
                        ${periodos.map((periodo) => `<option value="${periodo.id}" ${periodo.activo ? "selected" : ""}>${escapeHtml(periodo.nombre)}${periodo.activo ? " (activo)" : ""}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group"><label>Horario</label><input type="text" id="grupoHorario" placeholder="Lun-Mie 10:00-12:00"></div>
                <div class="form-group"><label>Cupo maximo</label><input type="number" id="grupoCupo" value="40"></div>
            </div>
            <button onclick="guardarGrupo()">Crear grupo</button>
        </div>

        <h3 class="section-subtitle">Grupos del periodo activo (${grupos.length})</h3>
        ${renderTable(`
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Materia</th>
                    <th>Profesor</th>
                    <th>Horario</th>
                    <th>Aula</th>
                    <th>Cupo</th>
                    <th>Accion</th>
                </tr>
            </thead>
            <tbody>
                ${grupos
                    .map(
                        (grupo) => `
                            <tr>
                                <td>${grupo.id}</td>
                                <td>${escapeHtml(grupo.materia)}</td>
                                <td>${escapeHtml(grupo.profesor)}</td>
                                <td>${escapeHtml(grupo.horario)}</td>
                                <td>${escapeHtml(grupo.aula)}</td>
                                <td>${grupo.cupo_disponible}/${grupo.cupo_maximo}</td>
                                <td><button class="btn-danger" onclick="eliminarGrupo(${grupo.id})">Eliminar</button></td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        `)}
    `;
}

async function guardarGrupo() {
    try {
        await apiPost("/api/grupos", {
            materia_codigo: document.getElementById("grupoMateria").value,
            profesor_id: Number(document.getElementById("grupoProfesor").value),
            aula_id: Number(document.getElementById("grupoAula").value),
            periodo_id: Number(document.getElementById("grupoPeriodo").value),
            horario: document.getElementById("grupoHorario").value,
            cupo_maximo: Number(document.getElementById("grupoCupo").value),
        });
        alert("Grupo creado");
        await Promise.all([cargarAdminGrupos(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function eliminarGrupo(id) {
    if (!confirm("Eliminar grupo?")) return;
    try {
        await apiDelete(`/api/grupos/${id}`);
        await Promise.all([cargarAdminGrupos(), refreshAdminContext()]);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function cargarAdminCalificaciones() {
    const container = document.getElementById("panelAdminCalificaciones");
    const grupos = await api("/api/grupos");

    container.innerHTML = `
        <div class="admin-form">
            <h3>Captura global de calificaciones</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Grupo</label>
                    <select id="adminCalGrupo" onchange="cargarAlumnosGrupoAdmin()">
                        <option value="">Selecciona un grupo</option>
                        ${grupos
                            .map(
                                (grupo) => `
                                    <option value="${grupo.id}">
                                        ${escapeHtml(`${grupo.materia} · ${grupo.profesor} · ${grupo.horario}`)}
                                    </option>
                                `
                            )
                            .join("")}
                    </select>
                </div>
            </div>
        </div>
        <div id="adminCalificacionesForm"></div>
    `;
}

async function cargarAlumnosGrupoAdmin() {
    const grupoId = Number(document.getElementById("adminCalGrupo").value);
    const container = document.getElementById("adminCalificacionesForm");

    if (!grupoId) {
        container.innerHTML = "";
        return;
    }

    const [alumnos, periodos] = await Promise.all([
        api(`/api/grupos/${grupoId}/alumnos`),
        api("/api/periodos"),
    ]);

    if (!alumnos.length) {
        container.innerHTML = renderEmptyState(
            "Grupo sin alumnos",
            "No hay estudiantes inscritos para capturar calificaciones."
        );
        return;
    }

    container.innerHTML = `
        <section class="grade-shell">
            <div class="grade-toolbar">
                <div class="field-stack">
                    <label>Periodo</label>
                    <select id="adminCalPeriodo">
                        ${periodos
                            .map(
                                (periodo) => `
                                    <option value="${periodo.id}" ${periodo.activo ? "selected" : ""}>
                                        ${escapeHtml(periodo.nombre)}
                                    </option>
                                `
                            )
                            .join("")}
                    </select>
                </div>
                <div></div>
                <button class="btn-success" onclick="guardarCalificacionesAdmin(${grupoId}, [${alumnos
                    .map((alumno) => alumno.matricula)
                    .join(",")}])">Guardar calificaciones</button>
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
                                    <td><input class="grade-input" type="number" id="admin_cal_${alumno.matricula}" min="0" max="10" step="0.1"></td>
                                </tr>
                            `
                        )
                        .join("")}
                </tbody>
            `)}
        </section>
    `;
}

async function guardarCalificacionesAdmin(grupoId, matriculas) {
    const periodoId = Number(document.getElementById("adminCalPeriodo")?.value);
    const calificaciones = [];

    matriculas.forEach((matricula) => {
        const input = document.getElementById(`admin_cal_${matricula}`);
        if (!input || input.value === "") return;
        calificaciones.push({ matricula, calificacion: Number(input.value) });
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
        await cargarAlumnosGrupoAdmin();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.cargarAdminResumen = cargarAdminResumen;
window.cargarAdminAlumnos = cargarAdminAlumnos;
window.guardarAlumno = guardarAlumno;
window.cargarAdminMaterias = cargarAdminMaterias;
window.guardarMateria = guardarMateria;
window.eliminarMateria = eliminarMateria;
window.cargarAdminProfesores = cargarAdminProfesores;
window.guardarProfesor = guardarProfesor;
window.eliminarProfesor = eliminarProfesor;
window.cargarAdminAulas = cargarAdminAulas;
window.guardarAula = guardarAula;
window.eliminarAula = eliminarAula;
window.cargarAdminPeriodos = cargarAdminPeriodos;
window.guardarPeriodo = guardarPeriodo;
window.activarPeriodo = activarPeriodo;
window.cargarAdminGrupos = cargarAdminGrupos;
window.guardarGrupo = guardarGrupo;
window.eliminarGrupo = eliminarGrupo;
window.cargarAdminCalificaciones = cargarAdminCalificaciones;
window.cargarAlumnosGrupoAdmin = cargarAlumnosGrupoAdmin;
window.guardarCalificacionesAdmin = guardarCalificacionesAdmin;
