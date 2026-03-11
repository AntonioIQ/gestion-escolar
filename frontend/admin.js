// ═══ MODO CONSULTAS / ADMIN ═══

function cambiarModo(modo) {
    document.getElementById('modoConsultas').style.display = modo === 'consultas' ? '' : 'none';
    document.getElementById('modoAdmin').style.display = modo === 'admin' ? '' : 'none';
    document.getElementById('btnConsultas').classList.toggle('active', modo === 'consultas');
    document.getElementById('btnAdmin').classList.toggle('active', modo === 'admin');

    if (modo === 'admin') {
        cargarAdminAlumnos();
    }
}

function cambiarTabAdmin(tabName, btn) {
    document.querySelectorAll('#modoAdmin .tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#modoAdmin .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    btn.classList.add('active');

    const loaders = {
        adminAlumnos: cargarAdminAlumnos,
        adminMaterias: cargarAdminMaterias,
        adminProfesores: cargarAdminProfesores,
        adminAulas: cargarAdminAulas,
        adminPeriodos: cargarAdminPeriodos,
        adminGrupos: cargarAdminGrupos,
        adminCalificaciones: cargarAdminCalificaciones,
    };
    if (loaders[tabName]) loaders[tabName]();
}

// ═══ ALUMNOS ═══

async function cargarAdminAlumnos() {
    const container = document.getElementById('panelAdminAlumnos');
    const alumnos = await api('/api/alumnos');

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo Alumno</h3>
            <div class="form-grid">
                <div class="form-group"><label>Matricula</label><input type="number" id="alumnoMatricula"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="alumnoNombre"></div>
                <div class="form-group"><label>Apellido</label><input type="text" id="alumnoApellido"></div>
                <div class="form-group"><label>Fecha Nacimiento</label><input type="date" id="alumnoFechaNac"></div>
                <div class="form-group"><label>Genero</label>
                    <select id="alumnoGenero"><option value="M">M</option><option value="F">F</option></select>
                </div>
                <div class="form-group"><label>Email</label><input type="email" id="alumnoEmail"></div>
                <div class="form-group"><label>Telefono</label><input type="text" id="alumnoTelefono"></div>
                <div class="form-group"><label>Direccion</label><input type="text" id="alumnoDireccion"></div>
                <div class="form-group"><label>Ciudad</label><input type="text" id="alumnoCiudad"></div>
                <div class="form-group"><label>Estado</label><input type="text" id="alumnoEstado"></div>
                <div class="form-group"><label>Codigo Postal</label><input type="text" id="alumnoCP"></div>
            </div>
            <button onclick="guardarAlumno()">Registrar Alumno</button>
        </div>
        <h3 style="margin-top:30px">Alumnos registrados (${alumnos.length})</h3>
        <table>
            <thead><tr><th>Matricula</th><th>Nombre</th><th>Email</th><th>Ciudad</th><th>Estatus</th></tr></thead>
            <tbody>
                ${alumnos.map(a => `<tr>
                    <td>${a.matricula}</td>
                    <td>${escapeHtml(a.nombre + ' ' + a.apellido)}</td>
                    <td>${escapeHtml(a.email || '')}</td>
                    <td>${escapeHtml(a.ciudad || '')}</td>
                    <td><span class="badge ${a.estatus === 'Activo' ? 'badge-activo' : 'badge-inactivo'}">${a.estatus}</span></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function guardarAlumno() {
    try {
        await apiPost('/api/alumnos', {
            matricula: parseInt(document.getElementById('alumnoMatricula').value),
            nombre: document.getElementById('alumnoNombre').value,
            apellido: document.getElementById('alumnoApellido').value,
            fecha_nacimiento: document.getElementById('alumnoFechaNac').value || null,
            genero: document.getElementById('alumnoGenero').value,
            email: document.getElementById('alumnoEmail').value,
            telefono: document.getElementById('alumnoTelefono').value,
            direccion: document.getElementById('alumnoDireccion').value,
            ciudad: document.getElementById('alumnoCiudad').value,
            estado: document.getElementById('alumnoEstado').value,
            codigo_postal: document.getElementById('alumnoCP').value,
        });
        alert('Alumno registrado');
        cargarAdminAlumnos();
        cargarEstadisticas();
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══ MATERIAS ═══

async function cargarAdminMaterias() {
    const container = document.getElementById('panelAdminMaterias');
    const materias = await api('/api/materias');

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nueva Materia</h3>
            <div class="form-grid">
                <div class="form-group"><label>Codigo</label><input type="text" id="materiaCodigo" placeholder="MAT101"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="materiaNombre"></div>
                <div class="form-group"><label>Creditos</label><input type="number" id="materiaCreditos" min="1" value="6"></div>
            </div>
            <button onclick="guardarMateria()">Agregar Materia</button>
        </div>
        <h3 style="margin-top:30px">Catalogo (${materias.length})</h3>
        <table>
            <thead><tr><th>Codigo</th><th>Nombre</th><th>Creditos</th><th>Accion</th></tr></thead>
            <tbody>
                ${materias.map(m => `<tr>
                    <td>${escapeHtml(m.codigo)}</td>
                    <td>${escapeHtml(m.nombre)}</td>
                    <td>${m.creditos}</td>
                    <td><button onclick="eliminarMateria('${m.codigo}')" class="btn-danger">Eliminar</button></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function guardarMateria() {
    try {
        await apiPost('/api/materias', {
            codigo: document.getElementById('materiaCodigo').value,
            nombre: document.getElementById('materiaNombre').value,
            creditos: parseInt(document.getElementById('materiaCreditos').value),
        });
        alert('Materia creada');
        cargarAdminMaterias();
    } catch (e) { alert('Error: ' + e.message); }
}

async function eliminarMateria(codigo) {
    if (!confirm('Eliminar materia ' + codigo + '?')) return;
    try {
        await apiDelete('/api/materias/' + codigo);
        cargarAdminMaterias();
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══ PROFESORES ═══

async function cargarAdminProfesores() {
    const container = document.getElementById('panelAdminProfesores');
    const profesores = await api('/api/profesores');

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo Profesor</h3>
            <div class="form-grid">
                <div class="form-group"><label>Nombre completo</label><input type="text" id="profesorNombre"></div>
            </div>
            <button onclick="guardarProfesor()">Agregar Profesor</button>
        </div>
        <h3 style="margin-top:30px">Profesores (${profesores.length})</h3>
        <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Accion</th></tr></thead>
            <tbody>
                ${profesores.map(p => `<tr>
                    <td>${p.id}</td>
                    <td>${escapeHtml(p.nombre)}</td>
                    <td><button onclick="eliminarProfesor(${p.id})" class="btn-danger">Eliminar</button></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function guardarProfesor() {
    try {
        await apiPost('/api/profesores', { nombre: document.getElementById('profesorNombre').value });
        alert('Profesor registrado');
        cargarAdminProfesores();
    } catch (e) { alert('Error: ' + e.message); }
}

async function eliminarProfesor(id) {
    if (!confirm('Eliminar profesor?')) return;
    try {
        await apiDelete('/api/profesores/' + id);
        cargarAdminProfesores();
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══ AULAS ═══

async function cargarAdminAulas() {
    const container = document.getElementById('panelAdminAulas');
    const aulas = await api('/api/aulas');

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nueva Aula</h3>
            <div class="form-grid">
                <div class="form-group"><label>Nombre / Numero</label><input type="text" id="aulaNombre" placeholder="A-101"></div>
            </div>
            <button onclick="guardarAula()">Agregar Aula</button>
        </div>
        <h3 style="margin-top:30px">Aulas (${aulas.length})</h3>
        <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Accion</th></tr></thead>
            <tbody>
                ${aulas.map(a => `<tr>
                    <td>${a.id}</td>
                    <td>${escapeHtml(a.nombre)}</td>
                    <td><button onclick="eliminarAula(${a.id})" class="btn-danger">Eliminar</button></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function guardarAula() {
    try {
        await apiPost('/api/aulas', { nombre: document.getElementById('aulaNombre').value });
        alert('Aula creada');
        cargarAdminAulas();
    } catch (e) { alert('Error: ' + e.message); }
}

async function eliminarAula(id) {
    if (!confirm('Eliminar aula?')) return;
    try {
        await apiDelete('/api/aulas/' + id);
        cargarAdminAulas();
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══ PERIODOS ═══

async function cargarAdminPeriodos() {
    const container = document.getElementById('panelAdminPeriodos');
    const periodos = await api('/api/periodos');

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo Periodo</h3>
            <div class="form-grid">
                <div class="form-group"><label>Nombre</label><input type="text" id="periodoNombre" placeholder="2026-1"></div>
                <div class="form-group"><label>Ano</label><input type="number" id="periodoAnio" value="2026"></div>
                <div class="form-group"><label><input type="checkbox" id="periodoActivo"> Marcar como activo</label></div>
            </div>
            <button onclick="guardarPeriodo()">Crear Periodo</button>
        </div>
        <h3 style="margin-top:30px">Periodos</h3>
        <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Ano</th><th>Estado</th><th>Accion</th></tr></thead>
            <tbody>
                ${periodos.map(p => `<tr>
                    <td>${p.id}</td>
                    <td>${escapeHtml(p.nombre)}</td>
                    <td>${p.anio}</td>
                    <td>${p.activo ? '<span class="badge badge-activo">Activo</span>' : 'Inactivo'}</td>
                    <td>${!p.activo ? `<button onclick="activarPeriodo(${p.id})" class="btn-activate">Activar</button>` : ''}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function guardarPeriodo() {
    try {
        await apiPost('/api/periodos', {
            nombre: document.getElementById('periodoNombre').value,
            anio: parseInt(document.getElementById('periodoAnio').value),
            activo: document.getElementById('periodoActivo').checked,
        });
        alert('Periodo creado');
        cargarAdminPeriodos();
    } catch (e) { alert('Error: ' + e.message); }
}

async function activarPeriodo(id) {
    try {
        const res = await fetch(API + '/api/periodos/' + id + '/activar', { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || res.statusText);
        alert('Periodo activado');
        cargarAdminPeriodos();
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══ GRUPOS ═══

async function cargarAdminGrupos() {
    const container = document.getElementById('panelAdminGrupos');
    const [materias, profesores, aulas, periodos, grupos] = await Promise.all([
        api('/api/materias'),
        api('/api/profesores'),
        api('/api/aulas'),
        api('/api/periodos'),
        api('/api/grupos'),
    ]);

    container.innerHTML = `
        <div class="admin-form">
            <h3>Nuevo Grupo</h3>
            <div class="form-grid">
                <div class="form-group"><label>Materia</label>
                    <select id="grupoMateria">
                        ${materias.map(m => `<option value="${m.codigo}">${escapeHtml(m.codigo + ' - ' + m.nombre)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Profesor</label>
                    <select id="grupoProfesor">
                        ${profesores.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Aula</label>
                    <select id="grupoAula">
                        ${aulas.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Periodo</label>
                    <select id="grupoPeriodo">
                        ${periodos.map(p => `<option value="${p.id}" ${p.activo ? 'selected' : ''}>${escapeHtml(p.nombre)} ${p.activo ? '(activo)' : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Horario</label><input type="text" id="grupoHorario" placeholder="Lun-Mie 10:00-12:00"></div>
                <div class="form-group"><label>Cupo maximo</label><input type="number" id="grupoCupo" value="40"></div>
            </div>
            <button onclick="guardarGrupo()">Crear Grupo</button>
        </div>
        <h3 style="margin-top:30px">Grupos del periodo activo (${grupos.length})</h3>
        <table>
            <thead><tr><th>ID</th><th>Materia</th><th>Profesor</th><th>Horario</th><th>Aula</th><th>Cupo</th><th>Accion</th></tr></thead>
            <tbody>
                ${grupos.map(g => `<tr>
                    <td>${g.id}</td>
                    <td>${escapeHtml(g.materia)}</td>
                    <td>${escapeHtml(g.profesor)}</td>
                    <td>${escapeHtml(g.horario)}</td>
                    <td>${escapeHtml(g.aula)}</td>
                    <td>${g.cupo_disponible}/${g.cupo_maximo}</td>
                    <td><button onclick="eliminarGrupo(${g.id})" class="btn-danger">Eliminar</button></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function guardarGrupo() {
    try {
        await apiPost('/api/grupos', {
            materia_codigo: document.getElementById('grupoMateria').value,
            profesor_id: parseInt(document.getElementById('grupoProfesor').value),
            aula_id: parseInt(document.getElementById('grupoAula').value),
            periodo_id: parseInt(document.getElementById('grupoPeriodo').value),
            horario: document.getElementById('grupoHorario').value,
            cupo_maximo: parseInt(document.getElementById('grupoCupo').value),
        });
        alert('Grupo creado');
        cargarAdminGrupos();
    } catch (e) { alert('Error: ' + e.message); }
}

async function eliminarGrupo(id) {
    if (!confirm('Eliminar grupo?')) return;
    try {
        await apiDelete('/api/grupos/' + id);
        cargarAdminGrupos();
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══ CALIFICACIONES ═══

async function cargarAdminCalificaciones() {
    const container = document.getElementById('panelAdminCalificaciones');
    const grupos = await api('/api/grupos');

    container.innerHTML = `
        <div class="admin-form">
            <h3>Selecciona un grupo para capturar calificaciones</h3>
            <div class="form-grid">
                <div class="form-group"><label>Grupo</label>
                    <select id="calGrupo" onchange="cargarAlumnosGrupo()">
                        <option value="">-- Seleccionar --</option>
                        ${grupos.map(g => `<option value="${g.id}" data-periodo="${g.periodo}">${escapeHtml(g.materia + ' - ' + g.profesor + ' (' + g.horario + ')')}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        <div id="calificacionesForm"></div>
    `;
}

async function cargarAlumnosGrupo() {
    const grupoId = document.getElementById('calGrupo').value;
    const container = document.getElementById('calificacionesForm');
    if (!grupoId) { container.innerHTML = ''; return; }

    const alumnos = await api('/api/grupos/' + grupoId + '/alumnos');
    const periodos = await api('/api/periodos');

    if (alumnos.length === 0) {
        container.innerHTML = '<div class="no-data">No hay alumnos inscritos en este grupo</div>';
        return;
    }

    container.innerHTML = `
        <div class="admin-form" style="margin-top:20px">
            <div class="form-grid">
                <div class="form-group"><label>Periodo</label>
                    <select id="calPeriodo">
                        ${periodos.map(p => `<option value="${p.id}" ${p.activo ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <table>
                <thead><tr><th>Matricula</th><th>Nombre</th><th>Calificacion</th></tr></thead>
                <tbody>
                    ${alumnos.map(a => `<tr>
                        <td>${a.matricula}</td>
                        <td>${escapeHtml(a.nombre + ' ' + a.apellido)}</td>
                        <td><input type="number" id="cal_${a.matricula}" min="0" max="10" step="0.1" style="width:80px;padding:8px;text-align:center;font-size:16px;"></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <button onclick="guardarCalificaciones(${grupoId}, [${alumnos.map(a => a.matricula).join(',')}])" class="btn-success" style="margin-top:15px;">Guardar Calificaciones</button>
        </div>
    `;
}

async function guardarCalificaciones(grupoId, matriculas) {
    const periodoId = parseInt(document.getElementById('calPeriodo').value);
    const calificaciones = [];

    for (const m of matriculas) {
        const input = document.getElementById('cal_' + m);
        if (input.value === '') continue;
        calificaciones.push({ matricula: m, calificacion: parseFloat(input.value) });
    }

    if (calificaciones.length === 0) {
        alert('No hay calificaciones capturadas');
        return;
    }

    try {
        const result = await apiPost('/api/calificaciones/grupo', {
            grupo_id: grupoId,
            periodo_id: periodoId,
            calificaciones: calificaciones,
        });
        alert(result.mensaje);
        cargarAlumnosGrupo();
    } catch (e) { alert('Error: ' + e.message); }
}
