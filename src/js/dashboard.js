function adminMenuHtml(active) {
    const m = (key) => active === key ? 'nav-item active' : 'nav-item';
    return `
    <li class="${m('dash')}" onclick="viewAdmin()"><i class="fa-solid fa-chart-pie"></i> Dashboard</li>
    <li class="${m('dist')}" onclick="renderDistributorForm()"><i class="fa-solid fa-user-plus"></i> Nuevo Distribuidor</li>
    <li class="${m('schools')}" onclick="viewGlobalSchools()"><i class="fa-solid fa-school"></i> Gestión de Colegios</li>
    <li class="${m('tests')}" onclick="viewTests()"><i class="fa-solid fa-vial-circle-check"></i> Gestión de Pruebas</li>
    <li class="${m('areas')}" onclick="viewAreasVocacionales()"><i class="fa-solid fa-briefcase"></i> Áreas Vocacionales</li>
    <li class="${m('users')}" onclick="viewUserManagement()"><i class="fa-solid fa-users-gear"></i> Gestión de Usuarios</li>
    <li class="${m('solic')}" onclick="viewSolicitudesAplicacion()"><i class="fa-solid fa-clipboard-check"></i> Solicitudes de evaluación <span id="navBadgeAdminSolic"></span></li>
    <li class="${m('reports')}" onclick="viewAdminReports()"><i class="fa-solid fa-file-invoice-chart"></i> Reportes Globales</li>`;
}

function viewAdmin() {
    document.getElementById('pageTitle').innerText = "Control Maestro";
    document.getElementById('pageDesc').innerText = "Panel global de administración y configuración del sistema.";
    
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('dash');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-2"><span class="stat-num" id="countDist">--</span><span class="stat-desc">Distribuidores</span></div>
        <div class="card span-2"><span class="stat-num" id="countCol">--</span><span class="stat-desc">Colegios Totales</span></div>
        <div class="card span-2"><span class="stat-num" id="countTestReal">--</span><span class="stat-desc">Resultados</span></div>
        
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Listado de Distribuidores</h3>
                <button class="btn-main" style="width:auto; padding: 10px 25px;" onclick="renderDistributorForm()">+ Nuevo Distribuidor</button>
            </div>
            <div id="distributorsTableContainer">Cargando...</div>
        </div>
    `;
    
    loadAdminStats();
    loadDistributorsTable();
    refreshNotifBadges();
}

async function loadAdminStats() {
    try {
        const { count: d } = await _s.from('tusuario').select('*', { count: 'exact', head: true }).eq('rol', 'distribuidor');
        const { count: c } = await _s.from('tcolegios').select('*', { count: 'exact', head: true });
        const { count: r } = await _s.from('tresultados').select('*', { count: 'exact', head: true });

        document.getElementById('countDist').innerText = (d || 0).toString().padStart(2, '0');
        document.getElementById('countCol').innerText = (c || 0).toString().padStart(2, '0');
        document.getElementById('countTestReal').innerText = (r || 0).toString().padStart(2, '0');
    } catch (e) { console.error("Error en stats:", e); }
}

async function viewAdminReports() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('reports');
    document.getElementById('pageTitle').innerText = "Reportes Globales";
    document.getElementById('pageDesc').innerText = "Visualización de resultados de todas las instituciones.";
    
    const { data: cols } = await _s.from('tcolegios').select('id, nombre').order('nombre');
    
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Seleccionar Institución</h3>
            <p style="color:var(--secondary); margin-bottom:20px;">Elige un colegio para ver sus estadísticas individuales y grupales.</p>
            <select id="adminColegioSelector" class="pill-btn" style="width:100%; height:auto; padding:12px; font-size:1rem;" onchange="viewSchoolReportsPanel(this.value, this.options[this.selectedIndex].text)">
                <option value="">-- Seleccionar Colegio --</option>
                ${(cols || []).map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}
            </select>
        </div>`;
    refreshNotifBadges();
}

async function loadDistributorsTable() {
    const { data, error } = await _s.from('tusuario').select('*').eq('rol', 'distribuidor').order('nombre', { ascending: true });
    const container = document.getElementById('distributorsTableContainer');
    
    if(error) return container.innerHTML = "Error al cargar distribuidores.";

    let html = `
        <table class="data-table">
            <thead><tr><th>Nombre</th><th>ID LogIn</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td><strong>${d.nombre || 'Sin nombre'}</strong></td>
                        <td>${d.identificacion}</td>
                        <td><span class="badge badge-success">${d.estado}</span></td>
                        <td style="display:flex; gap:8px;">
                            <button title="Editar" class="btn-main" style="padding:8px; width:40px; background:var(--secondary);" onclick="renderDistributorForm('${d.id}', '${d.nombre}', '${d.identificacion}')"><i class="fa-solid fa-pen"></i></button>
                            <button title="Eliminar" class="btn-main" style="padding:8px; width:40px; background:var(--danger);" onclick="deleteDistributor('${d.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    container.innerHTML = html;
}

function renderDistributorForm(id = null, nombre = "", identificacion = "", tipodoc = "") {
    const isEdit = (id !== null && id !== 'null');
    const titulo = isEdit ? "Editar Distribuidor" : "Nuevo Distribuidor";
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('dist');
    document.getElementById('pageTitle').innerText = titulo;
    
    const tdocOptions = ['C.C', 'TI', 'C.E', 'EXT', 'PPT'].map(opt => 
        `<option value="${opt}" ${opt === tipodoc ? 'selected' : ''}>${opt}</option>`
    ).join('');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Datos de Acceso</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-top:20px;">
                <div class="input-box" style="grid-column: span 2;"><label>Nombre Completo</label><input type="text" id="admNom" value="${nombre}"></div>
                <div class="input-box">
                    <label>Tipo de Documento</label>
                    <select id="admTipoDoc">${tdocOptions}</select>
                </div>
                <div class="input-box">
                    <label>Identificación (Login)</label>
                    <input type="text" id="admId" value="${identificacion}">
                </div>
            </div>
            <div style="display:flex; gap:15px; margin-top:20px;">
                <button class="btn-main" onclick="adminSaveDist('${id}')">${isEdit ? 'Actualizar' : 'Crear'} Distribuidor</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewAdmin()">Cancelar</button>
            </div>
        </div>`;
    refreshNotifBadges();
}

async function adminSaveDist(id) {
    const nombre = document.getElementById('admNom').value;
    const identificacion = document.getElementById('admId').value;
    const tipodoc = document.getElementById('admTipoDoc').value;
    if(!nombre || !identificacion || !tipodoc) return alert("Completa todos los campos.");

    const isEdit = (id !== "null" && id !== null);

    // Validación compuesta previa: ID + Tipo
    let checkQuery = _s.from('tusuario').select('id').eq('identificacion', identificacion).eq('tipodoc', tipodoc);
    if(isEdit) checkQuery = checkQuery.neq('id', id);
    const { data: exists } = await checkQuery.maybeSingle();
    if(exists) return alert(`Error: Ya existe un distribuidor registrado con el tipo ${tipodoc} e identificación ${identificacion}.`);

    let error;

    if(isEdit) {
        ({ error } = await _s.from('tusuario').update({ nombre, identificacion, tipodoc }).eq('id', id));
    } else {
        // Lógica original usando RPC para creación segura
        const { data, error: rpcError } = await _s.rpc('crear_usuario_sistema', {
            p_nombre: nombre, 
            p_identificacion: identificacion, 
            p_rol: 'distribuidor', 
            p_tipodoc: tipodoc
        });
        if(rpcError || (data && data.status === 'error')) error = rpcError || data;
    }

    if (error) {
        if (error.code === '23505') alert("Error: Ya existe un distribuidor registrado con este número de identificación.");
        else alert("Error: " + (error.message || "No se pudo procesar"));
    }
    else { alert("¡Éxito!"); viewAdmin(); }
}

async function deleteDistributor(id) {
    if(!confirm("¿Eliminar distribuidor? Perderá acceso al sistema.")) return;
    const { error } = await _s.from('tusuario').delete().eq('id', id);
    if(error) alert("Error: " + error.message);
    else viewAdmin();
}

async function viewUserManagement() {
    document.getElementById('pageTitle').innerText = "Gestión de Usuarios y Cuentas";
    document.getElementById('pageDesc').innerText = "Busca, filtra y depura usuarios de todas las instituciones.";
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('users');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; flex-direction:column; gap:20px; margin-bottom:20px;">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; background:#f8fafc; padding:20px; border-radius:15px;">
                    <div class="input-box" style="margin:0;">
                        <label>Búsqueda (Nombre o ID)</label>
                        <input type="text" id="searchUserTerm" placeholder="Ej: 6444..." onkeyup="if(event.key==='Enter') loadUserManagementTable()">
                    </div>
                    <div class="input-box" style="margin:0;">
                        <label>Institución / Colegio</label>
                        <input type="text" id="searchUserSchool" placeholder="Ej: SISTEMA CENTRAL..." onkeyup="if(event.key==='Enter') loadUserManagementTable()">
                    </div>
                    <div class="input-box" style="margin:0;">
                        <label>Rol</label>
                        <select id="filterUserRole" onchange="loadUserManagementTable()">
                            <option value="">Todos los roles</option>
                            <option value="admin">Administrador</option>
                            <option value="distribuidor">Distribuidor</option>
                            <option value="rector">Rector</option>
                            <option value="estudiante">Estudiante</option>
                        </select>
                    </div>
                    <div style="display:flex; align-items:flex-end; gap:10px;">
                        <button class="btn-main" style="width:auto; padding:12px 20px;" onclick="loadUserManagementTable()">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                        <button id="btnBulkDelete" class="btn-main" style="width:auto; padding:12px 20px; background:var(--danger); display:none;" onclick="bulkDeleteFilteredUsers()">
                            <i class="fa-solid fa-trash-can"></i> Vaciar Filtro
                        </button>
                    </div>
                </div>
                <div id="userStatsHeader" style="font-size:0.85rem; color:var(--secondary); font-weight:600;"></div>
            </div>
            <div id="userManagementContainer"></div>
        </div>
    `;
    loadUserManagementTable();
}

async function loadUserManagementTable() {
    const role = document.getElementById('filterUserRole').value;
    const term = document.getElementById('searchUserTerm').value.trim();
    const schoolTerm = document.getElementById('searchUserSchool').value.trim();
    
    // Usamos la vista v_perfil_usuario que ya consolida la información de la institución
    let query = _s.from('v_perfil_usuario').select('*');
    
    if(role) query = query.eq('rol', role);
    if(term) query = query.or(`nombre.ilike.%${term}%,identificacion.ilike.%${term}%`);
    if(schoolTerm) query = query.ilike('nombre_institucion', `%${schoolTerm}%`);
    
    const { data, error } = await query.order('nombre', { ascending: true }).limit(100);
    const container = document.getElementById('userManagementContainer');
    if(error) return container.innerHTML = "Error: " + error.message;

    // Mapeamos los datos para que la tabla sea legible (Copia literal de la lógica original)
    const formattedData = data.map(u => ({
        ...u,
        nombre_institucion: u.nombre_institucion || 'SISTEMA CENTRAL / SIN VÍNCULO'
    }));
    document.getElementById('userStatsHeader').innerText = `Se encontraron ${formattedData.length} usuarios.`;

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Institución (Vínculo Académico)</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th style="text-align:right;">Acción</th>
                </tr>
            </thead>
            <tbody>
                ${formattedData.map(u => `
                    <tr>
                        <td>
                            <strong>${u.nombre || '—'}</strong><br>
                            <code style="font-size:0.8rem; color:var(--secondary);">${u.identificacion}</code>
                            <span style="${!u.tipodoc || u.tipodoc === 'null' ? 'color:var(--danger); font-weight:bold;' : ''}">
                                (${u.tipodoc || '⚠️ SIN TIPO'})
                            </span>
                        </td>
                        <td>
                            <span style="font-size:0.85rem; color: ${u.nombre_institucion.includes('SIN VÍNCULO') ? 'var(--danger)' : 'inherit'}">
                                ${u.nombre_institucion}
                            </span>
                        </td>
                        <td><span class="badge" style="background:var(--secondary); color:white;">${u.rol}</span></td>
                        <td><span class="badge ${u.estado==='Activo'?'badge-success':'badge-pending'}">${u.estado}</span></td>
                        <td style="text-align:right;">
                            <button class="btn-action" style="background:#fee2e2; color:#b91c1c;" onclick="deleteSystemUser('${u.id}', '${u.nombre}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

async function bulkDeleteFilteredUsers() {
    const schoolTerm = document.getElementById('searchUserSchool').value.trim();
    const role = document.getElementById('filterUserRole').value;
    
    if(!confirm(`⚠️ ATENCIÓN: Estás por eliminar permanentemente todos los usuarios que coinciden con el filtro actual (Institución: ${schoolTerm || 'Cualquiera'}).\n\n¿Deseas continuar?`)) return;

    const container = document.getElementById('userManagementContainer');
    const rows = container.querySelectorAll('button[onclick^="deleteSystemUser"]');
    const ids = Array.from(rows).map(btn => btn.getAttribute('onclick').split("'")[1]);

    const { error } = await _s.from('tusuario').delete().in('id', ids);
    
    if(error) alert("Error en el borrado masivo: " + error.message);
    else {
        alert("Limpieza completada.");
        loadUserManagementTable();
    }
}

async function deleteSystemUser(id, name) {
    if(!confirm(`¿Eliminar permanentemente a "${name}"?`)) return;
    const { error } = await _s.from('tusuario').delete().eq('id', id);
    if(error) alert("Error: " + error.message);
    else loadUserManagementTable();
}

async function viewTests() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('tests');
    document.getElementById('pageTitle').innerText = "Motor de Pruebas";
    document.getElementById('pageDesc').innerText = "Crea y configura el contenido de los exámenes.";
    
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Pruebas Configuradas</h3>
                <button class="btn-main" style="width:auto; padding: 10px 25px;" onclick="renderTestForm()">+ Nueva Prueba</button>
            </div>
            <div id="testsTableContainer">Cargando...</div>
        </div>
    `;
    const { data } = await _s.from('tpruebas').select('*').order('id', { ascending: true });
    
    let html = `
        <table class="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Preguntas</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map(t => `
                    <tr>
                        <td>#${t.id}</td>
                        <td><strong>${t.nombre}</strong></td>
                        <td>${t.cantpreguntas || 0}</td>
                        <td style="display:flex; gap:8px;">
                            <button title="Configurar" class="btn-main" style="padding:8px; width:40px; background:var(--primary);" onclick="manageQuestions(${t.id}, '${t.nombre}')"><i class="fa-solid fa-gear"></i></button>
                            <button title="Subir CSV" class="btn-main" style="padding:8px; width:40px; background:var(--accent);" onclick="renderBulkUpload(${t.id}, '${t.nombre}')"><i class="fa-solid fa-upload"></i></button>
                            <button title="Editar" class="btn-main" style="padding:8px; width:40px; background:var(--secondary);" onclick="renderTestForm(${t.id}, '${t.nombre}')"><i class="fa-solid fa-pen"></i></button>
                            <button title="Eliminar" class="btn-main" style="padding:8px; width:40px; background:var(--danger);" onclick="deleteTest(${t.id})"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    document.getElementById('testsTableContainer').innerHTML = html;
    refreshNotifBadges();
}

function renderTestForm(id = null, nombre = "") {
    const isEdit = (id !== null);
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>${isEdit ? 'Editar Prueba' : 'Nueva Prueba'}</h3>
            <div class="input-box" style="margin-top:20px;">
                <label>Nombre de la Prueba</label>
                <input type="text" id="testName" value="${nombre}">
            </div>
            <div style="display:flex; gap:15px;">
                <button class="btn-main" onclick="saveTest(${id})">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewTests()">Cancelar</button>
            </div>
        </div>`;
}

async function saveTest(id) {
    const nombre = document.getElementById('testName').value;
    if(!nombre) return alert("El nombre es necesario.");
    let error;
    if(id) ({ error } = await _s.from('tpruebas').update({ nombre }).eq('id', id));
    else ({ error } = await _s.from('tpruebas').insert([{ nombre, estado: 'Activo' }]));
    if(error) alert("Error: " + error.message);
    else viewTests();
}

async function deleteTest(id) {
    if(!confirm("¿Eliminar prueba? Se borrarán sus preguntas asociadas.")) return;
    await _s.from('tpreguntas').delete().eq('id_prueba', id);
    const { error } = await _s.from('tpruebas').delete().eq('id', id);
    if(error) alert("Error: " + error.message);
    else viewTests();
}

async function manageQuestions(testId, testName) {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('tests');
    document.getElementById('pageTitle').innerText = "Configuración: " + testName;
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><div id="qListContainer">Cargando...</div></div>`;
    
    const { data } = await _s.from('tpreguntas').select('*').eq('id_prueba', testId).order('num_pregunta', { ascending: true });
    
    let html = `
        <button class="btn-main" style="width:auto; padding:10px 20px; margin-bottom:20px;" onclick="viewTests()"><i class="fa-solid fa-arrow-left"></i> Volver</button>
        <table class="data-table">
            <thead>
                <tr><th>#</th><th>Área</th><th>Enunciado</th><th>Acción</th></tr>
            </thead>
            <tbody>
                ${data.map(q => `<tr><td>${q.num_pregunta}</td><td>${q.area}</td><td>${q.enunciado.substring(0, 50)}...</td><td><button class="btn-main" style="padding:5px 10px; font-size:0.7rem;" onclick="editQuestion(${q.id}, ${testId})">Editar</button></td></tr>`).join('')}
            </tbody></table>`;
    document.getElementById('qListContainer').innerHTML = html;
    refreshNotifBadges();
}

async function editQuestion(qId, testId) {
    const { data: q } = await _s.from('tpreguntas').select('*').eq('id', qId).single();
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Editar Pregunta #${q.num_pregunta}</h3><div class="input-box"><label>Área</label><input type="text" id="eqArea" value="${q.area}"></div><div class="input-box"><label>Enunciado</label><textarea id="eqEnun">${q.enunciado}</textarea></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;"><div class="input-box"><label>Opción 1</label><input type="text" id="eq1" value="${q.opt1}" placeholder="Opción 1"></div><div class="input-box"><label>Opción 2</label><input type="text" id="eq2" value="${q.opt2}" placeholder="Opción 2"></div><div class="input-box"><label>Opción 3</label><input type="text" id="eq3" value="${q.opt3}" placeholder="Opción 3"></div><div class="input-box"><label>Opción 4</label><input type="text" id="eq4" value="${q.opt4}" placeholder="Opción 4"></div><div class="input-box" style="grid-column: span 2;"><label>Opción 5</label><input type="text" id="eq5" value="${q.opt5}" placeholder="Opción 5"></div></div><div style="display:flex; gap:15px; margin-top:20px;"><button class="btn-main" onclick="updateQuestion(${qId}, ${testId})">Guardar</button><button class="btn-main" style="background:var(--secondary);" onclick="manageQuestions(${testId})">Cancelar</button></div></div>`;
}

async function updateQuestion(qId, testId) {
    const p = { area: document.getElementById('eqArea').value, enunciado: document.getElementById('eqEnun').value, opt1: document.getElementById('eq1').value, opt2: document.getElementById('eq2').value, opt3: document.getElementById('eq3').value, opt4: document.getElementById('eq4').value, opt5: document.getElementById('eq5').value };
    await _s.from('tpreguntas').update(p).eq('id', qId);
    manageQuestions(testId);
}

function renderBulkUpload(testId, testName) {
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Cargar CSV: ${testName}</h3><p style="color:var(--secondary); margin-bottom:20px;">Formato: num; area; enunciado; opt1; opt2; opt3; opt4; opt5</p><input type="file" id="csvFile" accept=".csv" style="margin-bottom:20px;"><div style="display:flex; gap:15px;"><button class="btn-main" onclick="processCSV(${testId})">Procesar</button><button class="btn-main" style="background:var(--secondary);" onclick="viewTests()">Cancelar</button></div></div>`;
}

async function processCSV(testId) {
    const file = document.getElementById('csvFile').files[0]; if(!file) return alert("Selecciona un archivo.");
    const reader = new FileReader(); reader.onload = async (e) => {
        const rows = e.target.result.split('\n').filter(r => r.trim() !== "").slice(1);
        const toInsert = rows.map(row => { let c = row.split(';'); if (c.length < 3) c = row.split(','); const cl = (v) => v ? v.trim().replace(/^"|"$/g, '') : ''; return { id_prueba: testId, num_pregunta: parseInt(cl(c[0])), area: cl(c[1]), enunciado: cl(c[2]), opt1: cl(c[3]), opt2: cl(c[4]), opt3: cl(c[5]), opt4: cl(c[6]), opt5: cl(c[7]) }; });
        
        await _s.from('tpreguntas').insert(toInsert);
        await _s.from('tpruebas').update({ cantpreguntas: toInsert.length }).eq('id', testId);
        alert("¡Carga completa!"); viewTests(); }; reader.readAsText(file);
}

function viewDist() {
    document.getElementById('pageTitle').innerText = "Panel Operativo";
    document.getElementById('pageDesc').innerText = "Gestión comercial y vinculación de instituciones.";
    
    document.getElementById('roleMenu').innerHTML = `
        <li class="nav-item active" onclick="viewDist()"><i class="fa-solid fa-house"></i> Dashboard <span id="navBadgeDistSolic"></span></li>
        <li class="nav-item" onclick="openSchoolForm()"><i class="fa-solid fa-plus-circle"></i> Nuevo Colegio</li>
        <li class="nav-item" onclick="viewDistReports()"><i class="fa-solid fa-chart-bar"></i> Estado de Evaluación</li>
        <li class="nav-item" onclick="toggleResultadosVisibility()"><i class="fa-solid fa-eye"></i> Control de Resultados</li>
    `;

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-3"><span class="stat-num" id="schoolCount">--</span><span class="stat-desc">Colegios Vinculados</span></div>
        <div class="card span-3"><span class="stat-num" id="studentCount">--</span><span class="stat-desc">Estudiantes Totales</span></div>
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Mis Instituciones</h3>
                <button class="btn-main" style="width:auto; padding: 10px 25px;" onclick="openSchoolForm()">+ Vincular Colegio</button>
            </div>
            <div id="schoolsTableContainer">Cargando lista de colegios...</div>
        </div>
    `;
    loadDistStats();
    loadSchools();
    refreshNotifBadges();
}

async function loadDistStats() {
    const { count: sCount } = await _s.from('tcolegios').select('*', { count: 'exact', head: true }).eq('id_dist', sess.id);
    const { count: eCount } = await _s.from('testudiantes').select('*, tcolegios!inner(id_dist)', { count: 'exact', head: true }).eq('tcolegios.id_dist', sess.id);
    
    document.getElementById('schoolCount').innerText = (sCount || 0).toString().padStart(2, '0');
    document.getElementById('studentCount').innerText = (eCount || 0).toString().toLocaleString();
}

async function loadSchools() {
    const container = document.getElementById('schoolsTableContainer');
    const { data, error } = await _s.from('tcolegios').select('*').eq('id_dist', sess.id).order('nombre');
    
    if (error) {
        container.innerHTML = "Error al cargar colegios.";
        refreshNotifBadges();
        return;
    }
    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:40px; color:var(--secondary);">No hay colegios registrados.</p>`;
        refreshNotifBadges();
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Institución</th><th>DANE / Ciudad</th><th>Acciones de Gestión</th></tr></thead>
            <tbody>
                ${data.map(s => `
                    <tr>
                        <td>
                            <strong>${s.nombre}</strong><br>
                            <span style="font-size:0.8rem; color:var(--secondary);"><i class="fa-solid fa-map-pin"></i> ${s.direccion || 'Sin dirección'}</span>
                        </td>
                        <td><strong>${s.dane}</strong><br><span style="font-size:0.8rem;">${s.ciudad}</span></td>
                        <td>
                            <button class="btn-action" onclick="editSchool(${s.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-action btn-struct" onclick='viewSchoolStructure(${s.id}, ${JSON.stringify(s.nombre)})' title="Grados y Grupos"><i class="fa-solid fa-sitemap"></i></button>
                            <button class="btn-action btn-users" onclick='viewLoadStudents(${s.id}, ${JSON.stringify(s.nombre)})' title="Cargar Estudiantes"><i class="fa-solid fa-users"></i></button>
                            <button class="btn-action btn-rector-assign" onclick='renderRectorForm(${s.id}, ${JSON.stringify(s.nombre)}, ${JSON.stringify(s.id_rector || '')})' title="Asignar Rector"><i class="fa-solid fa-user-tie"></i></button>
                            <button class="btn-action btn-link-test" onclick='openLinkTestForm(${s.id}, ${JSON.stringify(s.nombre)})' title="Vincular evaluación"><i class="fa-solid fa-link"></i></button>
                            <button class="btn-action" style="background:var(--danger); color:white;" onclick="deleteSchool(${s.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    refreshNotifBadges();
}

async function openSchoolForm(schoolData = null) {
    const depts = await loadDepts();
    const isEdit = schoolData !== null;

    let rectorInfo = { nombre: '', identificacion: '', tipodoc: '' };
    if (isEdit && schoolData.id_rector) {
        const { data: recData } = await _s.from('tusuario').select('nombre, identificacion, tipodoc').eq('id', schoolData.id_rector).single();
        if (recData) rectorInfo = recData;
    }

    document.getElementById('pageTitle').innerText = isEdit ? "Editar Institución" : "Vincular Institución";

    const tdocOptions = ['C.C', 'TI', 'C.E', 'EXT', 'PPT'].map(opt => 
        `<option value="${opt}" ${opt === rectorInfo.tipodoc ? 'selected' : ''}>${opt}</option>`
    ).join('');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>${isEdit ? 'Actualizar Datos del Colegio' : 'Registro de Nueva Institución'}</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
                <input type="hidden" id="fId" value="${isEdit ? schoolData.id : ''}">
                <input type="hidden" id="fIdRector" value="${isEdit ? (schoolData.id_rector || '') : ''}">
                <div class="input-box"><label>Nombre del Colegio</label><input type="text" id="fNom" value="${isEdit ? schoolData.nombre : ''}"></div>
                <div class="input-box"><label>Código DANE</label><input type="text" id="fDane" value="${isEdit ? schoolData.dane : ''}"></div>
                <div class="input-box"><label>Ciudad</label><input type="text" id="fCiudad" value="${isEdit ? schoolData.ciudad : ''}"></div>
                <div class="input-box"><label>Dirección</label><input type="text" id="fDir" value="${isEdit ? schoolData.direccion : ''}"></div>
                <div class="input-box"><label>Departamento</label><select id="fDep">${depts}</select></div>
                <div class="input-box"><label>Teléfono de Contacto</label><input type="text" id="fTel" value="${isEdit ? (schoolData.telefono || '') : ''}" placeholder="Ej: 3001234567"></div>
            </div>

            <h3 style="margin-top:30px; border-top:1.5px solid #E2E8F0; padding-top:25px; color:var(--primary);">Información del Rector (Acceso)</h3>
            <p style="color:var(--secondary); font-size:0.85rem; margin-bottom:20px;">Puedes crear o actualizar los datos del rector directamente aquí.</p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div class="input-box" style="grid-column: span 2;"><label>Nombre Completo del Rector</label><input type="text" id="fRectorNom" value="${rectorInfo.nombre}" placeholder="Ej: Juan Pérez"></div>
                <div class="input-box">
                    <label>Tipo de Documento</label>
                    <select id="fRectorTipoDoc">${tdocOptions}</select>
                </div>
                <div class="input-box"><label>Identificación (Login)</label><input type="text" id="fRectorId" value="${rectorInfo.identificacion}" placeholder="Documento para el ingreso"></div>
            </div>

            <div style="display:flex; gap:15px; margin-top:30px;">
                <button class="btn-main" onclick="saveSchool()">Finalizar y Guardar</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="backToSchoolList()">Cancelar</button>
            </div>
        </div>`;
    
    if(isEdit) document.getElementById('fDep').value = schoolData.id_departamento;
}

async function editSchool(id) {
    const { data } = await _s.from('tcolegios').select('*').eq('id', id).single();
    if(data) openSchoolForm(data);
}

async function saveSchool() {
    const schoolId = document.getElementById('fId').value;
    const rectorId = document.getElementById('fIdRector').value;
    const rTipoDoc = document.getElementById('fRectorTipoDoc').value;
    const payload = {
        p_nombre: document.getElementById('fNom').value.trim(),
        p_dane: document.getElementById('fDane').value.trim(),
        p_ciudad: document.getElementById('fCiudad').value,
        p_direccion: document.getElementById('fDir').value,
        p_depto_id: parseInt(document.getElementById('fDep').value),
        p_distribuidor_id: sess.id,
        p_telefono: document.getElementById('fTel').value.trim()
    };

    const rNom = document.getElementById('fRectorNom').value.trim();
    const rIdNum = document.getElementById('fRectorId').value.trim();

    if(!payload.p_nombre || !payload.p_dane) return alert("Nombre y DANE son obligatorios.");

    let result;
    let finalSchoolId = schoolId;

    if(schoolId) {
        result = await _s.from('tcolegios').update({
            nombre: payload.p_nombre,
            dane: payload.p_dane,
            ciudad: payload.p_ciudad,
            direccion: payload.p_direccion,
            id_departamento: payload.p_depto_id,
            telefono: payload.p_telefono
        }).eq('id', schoolId);
    } else {
        // Lógica original: usa RPC para registro transaccional
        result = await _s.rpc('registrar_colegio_seguro', payload);
        if (!result.error) {
            const { data: newCol } = await _s.from('tcolegios').select('id').eq('dane', payload.p_dane).single();
            finalSchoolId = newCol?.id;
        }
    }

    if (result.error) {
        alert("Error al procesar la institución: " + result.error.message);
        return;
    }

    if (rNom && rIdNum) {
        let finalRectorId = rectorId;

        // Validación compuesta previa para Rector
        let checkQuery = _s.from('tusuario').select('id').eq('identificacion', rIdNum).eq('tipodoc', rTipoDoc);
        if(rectorId) checkQuery = checkQuery.neq('id', rectorId);
        const { data: exists } = await checkQuery.maybeSingle();
        if(exists) return alert(`Error: Ya existe un usuario registrado con el tipo ${rTipoDoc} e identificación ${rIdNum}.`);

        if (rectorId) {
            const { error: errUpd } = await _s.from('tusuario').update({ nombre: rNom, identificacion: rIdNum, tipodoc: rTipoDoc }).eq('id', rectorId);
            if (errUpd && errUpd.code === '23505') return alert("Error: La identificación del rector ya está en uso por otro usuario.");
        } else {
            const { data: newRec, error: recErr } = await _s.from('tusuario').insert({ 
                nombre: rNom, 
                identificacion: rIdNum,
                tipodoc: rTipoDoc,
                rol: 'rector' 
            }).select('id').single();
            
            if (recErr) {
                if (recErr.code === '23505') return alert("Error: La identificación del rector ya está en uso por otro usuario.");
                return alert("Error al crear rector: " + recErr.message);
            }
            if (newRec) finalRectorId = newRec.id;
        }

        if (finalRectorId && finalSchoolId) {
            await _s.from('tcolegios').update({ id_rector: finalRectorId }).eq('id', finalSchoolId);
        }
    }

    alert("¡Institución y Rector guardados correctamente!");
    backToSchoolList();
}

async function loadDepts() {
    const { data } = await _s.from('tdepartamentos').select('id, nombre').order('nombre');
    return (data || []).map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
}

async function deleteSchool(id) {
    if(!confirm("¿Estás seguro de eliminar esta institución? Esta acción borrará permanentemente todos los grupos, estudiantes y resultados asociados.")) return;
    
    const { error } = await _s.from('tcolegios').delete().eq('id', id);
    
    if(error) {
        if(error.code === "23503") {
            alert("Error de integridad: El colegio tiene datos asociados. Asegúrate de haber ejecutado el script SQL de 'Borrado en Cascada' en Supabase.");
        } else {
            alert("Error al eliminar: " + error.message);
        }
    } else {
        alert("Institución eliminada correctamente.");
        backToSchoolList();
    }
}

async function renderRectorForm(schoolId, schoolName, rectorId = '') {
    document.getElementById('pageTitle').innerText = rectorId ? 'Editar Rector' : 'Crear Rector';
    document.getElementById('pageDesc').innerText = `Institución: ${schoolName}`;

    let rectorData = { nombre: '', identificacion: '', tipodoc: '' };
    if (rectorId) {
        const { data, error } = await _s.from('tusuario').select('id, nombre, identificacion, tipodoc').eq('id', rectorId).single();
        if (!error && data) rectorData = data;
    }

    const tdocOptions = ['C.C', 'TI', 'C.E', 'EXT', 'PPT'].map(opt => 
        `<option value="${opt}" ${opt === rectorData.tipodoc ? 'selected' : ''}>${opt}</option>`
    ).join('');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>${rectorId ? 'Editar Rector Asociado' : 'Crear Rector para el Colegio'}</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
                <input type="hidden" id="rectorSchoolId" value="${schoolId}">
                <input type="hidden" id="rectorId" value="${rectorId}">
                <div class="input-box" style="grid-column: span 2;"><label>Nombre completo del rector</label><input type="text" id="rectorName" value="${rectorData.nombre || ''}"></div>
                <div class="input-box">
                    <label>Tipo de Documento</label>
                    <select id="rectorTipoDoc">${tdocOptions}</select>
                </div>
                <div class="input-box"><label>Identificación (Login)</label><input type="text" id="rectorIdNumber" value="${rectorData.identificacion || ''}"></div>
            </div>
            <div style="display:flex; gap:15px; margin-top:10px;">
                <button class="btn-main" onclick="saveRectorForSchool()">${rectorId ? 'Actualizar' : 'Crear'} Rector</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="backToSchoolList()">Cancelar</button>
            </div>
        </div>`;
}

async function saveRectorForSchool() {
    const schoolId = document.getElementById('rectorSchoolId').value;
    const rectorId = document.getElementById('rectorId').value;
    const nombre = document.getElementById('rectorName').value.trim();
    const tipodoc = document.getElementById('rectorTipoDoc').value;
    const identificacion = document.getElementById('rectorIdNumber').value.trim();

    if (!nombre || !identificacion || !tipodoc) return alert('Completa todos los campos.');

    // Validación compuesta previa
    let checkQuery = _s.from('tusuario').select('id').eq('identificacion', identificacion).eq('tipodoc', tipodoc);
    if(rectorId) checkQuery = checkQuery.neq('id', rectorId);
    const { data: exists } = await checkQuery.maybeSingle();
    if(exists) return alert(`Error: Ya existe un usuario registrado con el tipo ${tipodoc} e identificación ${identificacion}.`);

    let userId = rectorId;
    if (rectorId) {
        const { error } = await _s.from('tusuario').update({ nombre, identificacion, tipodoc }).eq('id', rectorId);
        if (error) {
            if (error.code === '23505') return alert("Error: Ya existe un usuario con este documento de identidad.");
            return alert('Error actualizando rector: ' + error.message);
        }
    } else {
        const { data, error } = await _s.from('tusuario').insert({ nombre, identificacion, tipodoc, rol: 'rector' }).select('id').single();
        if (error) {
            if (error.code === '23505') return alert("Error: Ya existe un usuario con este documento de identidad.");
            return alert('Error creando rector: ' + error.message);
        }
        userId = data.id;
    }

    const { error: updateError } = await _s.from('tcolegios').update({ id_rector: userId }).eq('id', schoolId);
    if (updateError) return alert('Error asociando el rector al colegio: ' + updateError.message);

    alert('Rector asociado correctamente.');
    backToSchoolList();
}

function viewAreasVocacionales() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('areas');
    document.getElementById('pageTitle').innerText = "Gestión de Áreas Vocacionales";
    document.getElementById('pageDesc').innerText = "Edita descripciones y carreras sugeridas para cada área.";
    
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6" style="max-width:1000px; margin:0 auto;">
            <h3>Áreas Vocacionales</h3>
            <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:20px;">Actualiza la información de cada área para personalizar los resultados de los estudiantes.</p>
            <div id="areasContainer" style="display:grid; gap:20px;"></div>
        </div>
    `;
    
    renderAreasVocacionales();
}

function renderAreasVocacionales() {
    const container = document.getElementById('areasContainer');
    if (!container) return;
    
    container.innerHTML = Object.entries(AREAS_VOCACIONALES).map(([area, data], idx) => `
        <div style="border:2px solid var(--light-border); border-radius:12px; padding:20px; background:#fafafa; transition:all 0.3s;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h4 style="color:var(--primary); margin:0; flex:1;">${area}</h4>
                <button onclick="toggleEditArea(${idx})" style="background:var(--secondary); color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.9rem; font-weight:600;">
                    <i class="fa-solid fa-edit"></i> Editar
                </button>
            </div>
            <div id="view-area-${idx}" style="display:block;">
                <div style="background:white; padding:15px; border-radius:8px; margin-bottom:15px;">
                    <p style="color:#555; line-height:1.8; font-size:14px; margin:0;">${data.descripcion}</p>
                </div>
                <div>
                    <strong style="color:var(--primary); display:block; margin-bottom:10px;">Carreras Sugeridas:</strong>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px;">
                        ${data.carreras.map(c => `<span style="background:var(--light-bg); padding:8px 12px; border-radius:6px; text-align:center; font-size:13px;">${c}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div id="edit-area-${idx}" style="display:none;">
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--primary);">Descripción:</label>
                    <textarea id="desc-${idx}" style="width:100%; height:100px; border:1.5px solid #ddd; border-radius:8px; padding:12px; font-family:inherit; font-size:14px; resize:vertical;">${data.descripcion}</textarea>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--primary);">Carreras (una por línea):</label>
                    <textarea id="carr-${idx}" style="width:100%; height:120px; border:1.5px solid #ddd; border-radius:8px; padding:12px; font-family:mono; font-size:13px; resize:vertical;">${data.carreras.join('\n')}</textarea>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="guardarArea(${idx}, '${area}')" style="background:var(--success); color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:600; flex:1;">
                        <i class="fa-solid fa-check"></i> Guardar
                    </button>
                    <button onclick="toggleEditArea(${idx})" style="background:#999; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:600; flex:1;">
                        <i class="fa-solid fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleEditArea(idx) {
    const viewEl = document.getElementById(`view-area-${idx}`);
    const editEl = document.getElementById(`edit-area-${idx}`);
    if (!viewEl || !editEl) return;
    const isShowing = viewEl.style.display !== 'none';
    viewEl.style.display = isShowing ? 'none' : 'block';
    editEl.style.display = isShowing ? 'block' : 'none';
}

function guardarArea(idx, areaNombre) {
    const desc = document.getElementById(`desc-${idx}`).value.trim();
    const carrText = document.getElementById(`carr-${idx}`).value.trim();
    
    if (!desc) return alert('La descripción no puede estar vacía.');
    if (!carrText) return alert('Debe haber al menos una carrera.');
    
    const carreras = carrText.split('\n').map(c => c.trim()).filter(c => c);
    
    AREAS_VOCACIONALES[areaNombre] = {
        descripcion: desc,
        carreras: carreras
    };
    
    localStorage.setItem('AREAS_VOCACIONALES', JSON.stringify(AREAS_VOCACIONALES));
    
    alert('✅ Área actualizada correctamente. Los cambios se reflejarán en los próximos resultados.');
    renderAreasVocacionales();
}

async function viewSolicitudesAplicacion() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('solic');
    document.getElementById('pageTitle').innerText = "Solicitudes de evaluación";
    document.getElementById('pageDesc').innerText = "Vinculaciones de pruebas solicitadas por distribuidores. Aprueba o rechaza cada solicitud.";
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Solicitudes</h3>
            <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:16px;">Las solicitudes en estado pendiente requieren tu decisión.</p>
            <div id="solicitudesContainer">Cargando...</div>
        </div>`;

    const { data, error } = await _s.from('tsolicitudes_aplicacion').select(`
        id, id_colegio, id_prueba, id_grado, id_grupo, fecha_inicio, fecha_fin, estado, motivo_rechazo, created_at,
        tcolegios ( nombre, id_dist ),
        tpruebas ( nombre ),
        tgrados ( nombre ),
        tgrupos ( nombre )
    `).order('created_at', { ascending: false });

    const box = document.getElementById('solicitudesContainer');
    if (error) {
        console.error(error);
        box.innerHTML = `<p style="color:var(--danger);">No se pudieron cargar las solicitudes. ¿Ejecutaste el SQL de la tabla <code>tsolicitudes_aplicacion</code> en Supabase? (${esc(error.message)})</p>`;
        refreshNotifBadges();
        return;
    }
    if (!data.length) {
        box.innerHTML = "<p style=\"text-align:center; padding:30px; color:var(--secondary);\">No hay solicitudes registradas.</p>";
        localStorage.setItem(notifKey('admin_sol_seen'), new Date().toISOString());
        refreshNotifBadges();
        return;
    }

    const distIds = [...new Set(data.map(s => s.tcolegios?.id_dist).filter(Boolean))];
    let distMap = {};
    if (distIds.length) {
        const { data: dists } = await _s.from('tusuario').select('id, nombre').in('id', distIds);
        if (dists) dists.forEach(d => { distMap[d.id] = d.nombre; });
    }

    box.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fecha</th><th>Colegio</th><th>Distribuidor</th><th>Prueba</th><th>Grado / Grupo</th><th>Ventana</th><th>Estado</th><th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(s => {
                    const pend = s.estado === 'pendiente';
                    const badge = s.estado === 'pendiente' ? 'badge-pending' : (s.estado === 'aprobada' ? 'badge-success' : 'badge');
                    const distNom = distMap[s.tcolegios?.id_dist] || '—';
                    const fi = s.fecha_inicio || '';
                    const ff = s.fecha_fin || '';
                    return `
                    <tr>
                        <td style="font-size:0.8rem;">${s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                        <td><strong>${s.tcolegios?.nombre || '#' + s.id_colegio}</strong></td>
                        <td style="font-size:0.85rem;">${distNom}</td>
                        <td>${s.tpruebas?.nombre || '#' + s.id_prueba}</td>
                        <td>${s.tgrados?.nombre || '—'} / ${s.tgrupos?.nombre || '—'}</td>
                        <td style="font-size:0.8rem;">${fi} → ${ff}</td>
                        <td><span class="badge ${badge}">${s.estado}</span></td>
                        <td style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${pend ? `
                                <button class="btn-main" style="padding:6px 12px; font-size:0.75rem; width:auto; background:var(--success);" onclick="resolverSolicitudAplicacion(${s.id}, true)">Aprobar</button>
                                <button class="btn-main" style="padding:6px 12px; font-size:0.75rem; width:auto; background:var(--danger);" onclick="resolverSolicitudAplicacion(${s.id}, false)">Rechazar</button>
                            ` : `<span style="font-size:0.75rem; color:var(--secondary);">${s.motivo_rechazo ? esc(s.motivo_rechazo) : '—'}</span>`}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    localStorage.setItem(notifKey('admin_sol_seen'), new Date().toISOString());
    refreshNotifBadges();
}

async function resolverSolicitudAplicacion(id, aprobar) {
    let motivo = null;
    if (!aprobar) {
        motivo = prompt('Motivo del rechazo (opcional):');
        if (motivo === null) return;
    }
    const { error } = await _s.from('tsolicitudes_aplicacion').update({
        estado: aprobar ? 'aprobada' : 'rechazada',
        id_admin_respuesta: sess.id,
        motivo_rechazo: motivo && motivo.trim() ? motivo.trim() : null
    }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else { alert(aprobar ? 'Solicitud aprobada.' : 'Solicitud rechazada.'); viewSolicitudesAplicacion(); }
}

async function viewGlobalSchools() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('schools');
    document.getElementById('pageTitle').innerText = "Gestión Global de Colegios";
    document.getElementById('pageDesc').innerText = "Supervisión de todas las instituciones registradas en la plataforma.";
    
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Instituciones en el Sistema</h3>
            <div id="globalSchoolsContainer">Cargando todas las instituciones...</div>
        </div>
    `;

    const { data: schools, error } = await _s.from('tcolegios').select('*').order('nombre');
    const box = document.getElementById('globalSchoolsContainer');

    if (error) {
        box.innerHTML = `<p style="color:var(--danger); margin-bottom:12px;"><strong>Error al cargar colegios.</strong><br>${esc(error.message)}</p>
            <p style="color:var(--secondary); font-size:0.88rem; line-height:1.5;">Si el mensaje menciona <code>schema cache</code> o relaciones, el embed <code>tusuario(nombre)</code> falló: se carga el colegio sin join y el nombre del distribuidor se consulta aparte.</p>`;
        refreshNotifBadges();
        return;
    }

    const distIds = [...new Set((schools || []).map(c => c.id_dist).filter(Boolean))];
    let distMap = {};
    if (distIds.length) {
        const { data: dists, error: de } = await _s.from('tusuario').select('id, nombre').in('id', distIds);
        if (de) console.warn('Distribuidores (secundario):', de);
        if (dists) dists.forEach(d => { distMap[d.id] = d.nombre; });
    }

    if (!schools?.length) {
        box.innerHTML = "<p style=\"text-align:center; padding:40px; color:var(--secondary);\">No hay colegios registrados.</p>";
        refreshNotifBadges();
        return;
    }

    let html = `
        <table class="data-table">
            <thead><tr><th>Colegio</th><th>DANE / Ciudad</th><th>Distribuidor Responsable</th><th>Acciones</th></tr></thead>
            <tbody>
                ${schools.map(c => `
                    <tr>
                        <td>
                            <strong>${esc(c.nombre || '')}</strong><br>
                            <span style="font-size:0.8rem; color:var(--secondary);"><i class="fa-solid fa-map-pin"></i> ${esc(c.direccion || 'Sin dirección')}</span>
                        </td>
                        <td><strong>${esc(String(c.dane || ''))}</strong><br><span style="font-size:0.8rem;">${esc(c.ciudad || '')}</span></td>
                        <td style="color:var(--secondary); font-size:0.8rem;">${esc(distMap[c.id_dist] || '—')}</td>
                        <td>
                            <button class="btn-action" onclick="editSchool(${c.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-action btn-struct" onclick='viewSchoolStructure(${c.id}, ${JSON.stringify(c.nombre)})' title="Grados y Grupos"><i class="fa-solid fa-sitemap"></i></button>
                            <button class="btn-action btn-users" onclick='viewLoadStudents(${c.id}, ${JSON.stringify(c.nombre)})' title="Cargar Estudiantes"><i class="fa-solid fa-users"></i></button>
                            <button class="btn-action btn-rector-assign" onclick='renderRectorForm(${c.id}, ${JSON.stringify(c.nombre)}, ${JSON.stringify(c.id_rector || '')})' title="Asignar Rector"><i class="fa-solid fa-user-tie"></i></button>
                            <button class="btn-action btn-link-test" onclick='openLinkTestForm(${c.id}, ${JSON.stringify(c.nombre)})' title="Vincular evaluación"><i class="fa-solid fa-link"></i></button>
                            <button class="btn-action" style="background:var(--danger); color:white;" onclick="deleteSchool(${c.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    box.innerHTML = html;
    refreshNotifBadges();
}

async function toggleResultadosVisibility() {
    document.getElementById('pageTitle').innerText = "Control de Resultados";
    document.getElementById('pageDesc').innerText = "Habilitar o deshabilitar la visualización de resultados para rectores y estudiantes.";

    const { data: colegioData, error } = await _s.from('tcolegios').select('id, nombre, resultados_habilitados').eq('id_dist', sess.id);

    if (error) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Error</h3>
                <p style="color: var(--danger);">Error cargando colegios: ${error.message}</p>
            </div>
        `;
        return;
    }

    let content = `
        <div class="card span-6">
            <h3>Control de Visualización de Resultados</h3>
            <p style="color: var(--secondary); margin-bottom: 20px;">
                Desde aquí puedes controlar si los rectores y estudiantes pueden ver los resultados de las evaluaciones.
                Cuando está deshabilitado, solo los administradores pueden acceder a los informes.
            </p>
    `;

    if (!colegioData || colegioData.length === 0) {
        content += `<p style="color: var(--secondary); text-align: center; padding: 40px;">No tienes colegios asignados.</p>`;
    } else {
        colegioData.forEach(colegio => {
            const estadoActual = colegio.resultados_habilitados ? 'Habilitado' : 'Deshabilitado';
            const colorEstado = colegio.resultados_habilitados ? 'var(--success)' : 'var(--danger)';
            const iconoEstado = colegio.resultados_habilitados ? 'fa-eye' : 'fa-eye-slash';
            const textoBoton = colegio.resultados_habilitados ? 'Deshabilitar' : 'Habilitar';

            content += `
                <div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <h4 style="margin: 0; color: var(--primary);">${colegio.nombre}</h4>
                            <p style="margin: 5px 0 0 0; color: var(--secondary); font-size: 0.9rem;">
                                Estado actual: <span style="color: ${colorEstado}; font-weight: bold;">
                                    <i class="fa-solid ${iconoEstado}"></i> ${estadoActual}
                                </span>
                            </p>
                        </div>
                        <button onclick="cambiarEstadoResultados('${colegio.id}', ${!colegio.resultados_habilitados})"
                                style="background: ${colegio.resultados_habilitados ? 'var(--danger)' : 'var(--success)'};
                                       color: white; border: none; padding: 10px 20px; border-radius: 6px;
                                       cursor: pointer; font-weight: 600;">
                            <i class="fa-solid ${colegio.resultados_habilitados ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            ${textoBoton}
                        </button>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
                            <strong>Impacto:</strong> ${colegio.resultados_habilitados ?
                                'Los rectores y estudiantes de este colegio pueden ver sus resultados de evaluación.' :
                                'Los rectores y estudiantes de este colegio NO pueden ver sus resultados. Solo los administradores tienen acceso.'}
                        </p>
                    </div>
                </div>
            `;
        });
    }

    content += `</div>`;
    document.getElementById('dynamicBoard').innerHTML = content;
}

async function cambiarEstadoResultados(colegioId, nuevoEstado) {
    const { error } = await _s.from('tcolegios').update({
        resultados_habilitados: nuevoEstado
    }).eq('id', colegioId);

    if (error) {
        alert(`Error al cambiar el estado: ${error.message}`);
        return;
    }

    const mensaje = nuevoEstado ?
        'Resultados habilitados correctamente. Los rectores y estudiantes ahora pueden ver los informes.' :
        'Resultados deshabilitados correctamente. Solo los administradores pueden acceder a los informes.';

    alert(mensaje);
    toggleResultadosVisibility();
}

let selectedGradeId = null;
let selectedGroupId = null;
let selectedSchoolId = null;

async function viewSchoolStructure(schoolId, schoolName) {
    selectedSchoolId = schoolId;
    selectedGradeId = null;
    selectedGroupId = null;
    document.getElementById('pageTitle').innerText = "Gestión de Estudiantes";
    document.getElementById('pageDesc').innerText = schoolName;

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>1. Selecciona el Grado</h3>
                <div style="display:flex; gap:10px;">
                    <button class="btn-main" style="width:auto; padding:5px 15px;" onclick="addGrade(${schoolId})">+ Nuevo</button>
                    <button class="btn-main" style="width:auto; padding:5px 15px; background:var(--accent);" onclick='viewLoadStudents(${schoolId}, ${JSON.stringify(schoolName)})'>
                        <i class="fa-solid fa-file-excel"></i> Carga Masiva
                    </button>
                </div>
            </div>
            <div id="gradesPicker" class="horizontal-picker"></div>
        </div>
        <div class="card span-6" id="groupCard" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>2. Selecciona el Grupo</h3>
                <button class="btn-main" style="width:auto; padding:5px 15px; background:var(--success);" onclick="addGroup(${schoolId})">+ Añadir Grupo</button>
            </div>
            <div id="groupsPicker" class="horizontal-picker"></div>
        </div>
        <div class="card span-6" id="studentCard" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>3. Estudiantes del Grupo</h3>
                <div style="display:flex; gap:10px;">
                    <button class="btn-main" style="width:auto; padding:10px 20px; background:var(--success);" onclick="showAddStudentForm()">
                        <i class="fa-solid fa-user-plus"></i> Nuevo Estudiante
                    </button>
                    <button class="btn-main" style="width:auto; padding:10px 20px; background:var(--danger);" onclick="bulkDeleteStudents()">
                        <i class="fa-solid fa-trash-can"></i> Vaciar Grupo
                    </button>
                </div>
            </div>
            <div id="studentsTableContainer"></div>
        </div>
        <div class="card span-6" style="text-align:right; background:transparent; box-shadow:none; border:none;">
            <button class="btn-main" style="width:auto; padding:12px 30px; background:var(--secondary);" onclick="backToSchoolList()">Volver al Dashboard</button>
        </div>
    `;
    loadGrades(schoolId);
}

async function deleteGroup(groupId, gradeId, schoolId, ev) {
    if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    if(!confirm("¿Estás seguro de eliminar este GRUPO? Se borrarán también todos los estudiantes inscritos en él.")) return;
    const { error } = await _s.from('tgrupos').delete().eq('id', groupId);
    if(error) alert("Error al eliminar: " + error.message);
    else { 
        alert("Grupo eliminado."); 
        if (selectedGroupId === groupId) { 
            selectedGroupId = null; 
            document.getElementById('studentCard').style.display = "none"; 
        } 
        loadGrades(schoolId); 
        loadGroups(gradeId, schoolId); 
    }
}

async function bulkDeleteStudents() {
    if (!selectedGroupId) return alert("Selecciona un grupo.");
    if (!confirm("¿Eliminar todos los estudiantes de este grupo? Esta acción no se puede deshacer.")) return;
    const { error } = await _s.from('testudiantes').delete().eq('id_grupo', selectedGroupId);
    if (error) alert("Error: " + error.message);
    else {
        alert("Grupo vaciado correctamente.");
        loadStudents(selectedGroupId);
    }
}

async function deleteGradeGroups(gradeId, schoolId, event) {
    if(event) event.stopPropagation();
    if (!confirm("¿Deseas eliminar EL GRADO COMPLETO? Esto borrará todos los grupos y estudiantes de este grado en este colegio.")) return;
    const { error } = await _s.from('tgrupos').delete().eq('id_grado', gradeId).eq('id_colegio', schoolId);
    if(error) alert("Error: " + error.message);
    else { alert("Grado eliminado de la vista del colegio."); selectedGradeId = null; document.getElementById('groupCard').style.display = "none"; document.getElementById('studentCard').style.display = "none"; loadGrades(schoolId); }
}

async function loadGrades(schoolId) {
    const container = document.getElementById('gradesPicker');
    const { data, error } = await _s.from('tgrupos').select(`id_grado, tgrados (id, nombre, numero)`).eq('id_colegio', schoolId);
    if (error) return container.innerHTML = "Error.";
    const uniqueGrades = []; const map = new Map();
    for (const item of data) { if(item.tgrados && !map.has(item.tgrados.id)){ map.set(item.tgrados.id, true); uniqueGrades.push(item.tgrados); } } // Originalmente en una línea
    uniqueGrades.sort((a, b) => a.numero - b.numero);
    if (uniqueGrades.length === 0) { container.innerHTML = `<p style="color:var(--secondary); font-size:0.85rem; padding:10px; border:1px dashed #ccc; border-radius:10px; width:100%; text-align:center;">No hay grados configurados. Usa el botón "+" para empezar.</p>`; return; }
    container.innerHTML = uniqueGrades.map(g => `<div class="circle-btn" id="grade-${g.id}" onclick="selectGrade(${g.id}, '${g.nombre}', ${schoolId}, this)">${g.nombre}<div class="delete-grade-btn" onclick="deleteGradeGroups(${g.id}, ${schoolId}, event)"><i class="fa-solid fa-xmark"></i></div></div>`).join('');
}

async function selectGrade(id, name, schoolId, el) {
    document.querySelectorAll('.circle-btn').forEach(i => i.classList.remove('active')); el.classList.add('active');
    selectedGradeId = id; selectedSchoolId = schoolId; document.getElementById('groupCard').style.display = "block"; document.getElementById('studentCard').style.display = "none"; loadGroups(id, schoolId);
}
// Originalmente en una línea
async function loadGroups(gradeId, schoolId) {
    const container = document.getElementById('groupsPicker');
    const { data } = await _s.from('tgrupos').select('*').eq('id_grado', gradeId).eq('id_colegio', selectedSchoolId).order('nombre');
    if (data?.length === 0) { container.innerHTML = "<p>No hay grupos.</p>"; return; }
    container.innerHTML = data.map(g => `<div class="pill-btn" id="group-${g.id}" onclick="selectGroup(${g.id}, '${g.nombre}', this)"><span>${g.nombre}</span><i class="fa-solid fa-trash-can delete-icon" onclick="deleteGroup(${g.id}, ${gradeId}, ${schoolId}, event)"></i></div>`).join('');
}

async function selectGroup(id, name, el) {
    document.querySelectorAll('.pill-btn').forEach(i => i.classList.remove('active')); el.classList.add('active');
    selectedGroupId = id; document.getElementById('studentCard').style.display = "block"; loadStudents(id);
}
// Originalmente en una línea
async function loadStudents(groupId) {
    const container = document.getElementById('studentsTableContainer');
    const { data } = await _s.from('testudiantes').select(`id, nombre, tipodoc, tusuario (id, identificacion, tipodoc)`).eq('id_grupo', groupId).order('nombre');
    if (!data?.length) { container.innerHTML = "<p>Sin estudiantes.</p>"; return; }
    container.innerHTML = `<table class="student-table"><thead><tr><th>Tipo</th><th>Documento</th><th>Nombre</th><th style="text-align:right;">Acciones</th></tr></thead>
        <tbody>${data.map(est => {
            const uid = est.tusuario?.id || est.id;
            const iden = est.tusuario?.identificacion || 'S/N';
            const tdoc = est.tusuario?.tipodoc || est.tipodoc || '—';
            return `<tr id="row-${est.id}">
                <td id="tdoc-cell-${est.id}"><span class="badge" style="background:#e2e8f0; color:#475569;">${tdoc}</span></td>
                <td id="id-cell-${est.id}"><span class="badge badge-pending" style="font-family:monospace;">${iden}</span></td>
                <td id="name-cell-${est.id}"><strong>${est.nombre}</strong></td>
                <td style="text-align:right;" id="actions-${est.id}">
                    <button class="btn-action" onclick="toggleEditStudent('${est.id}', '${uid}', '${tdoc}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-action" style="background:#fee2e2; color:#b91c1c;" onclick="deleteStudent('${est.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('')}</tbody></table>`;
}

function showAddStudentForm() {
    const container = document.getElementById('studentsTableContainer'); // Originalmente en una línea
    container.innerHTML = `<div style="background:#f8fafc; padding:25px; border-radius:15px; border:1px solid #e2e8f0; margin-bottom:20px;"><h4>Registrar Nuevo Estudiante</h4><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px;"><div class="input-box"><label>Tipo Doc</label><select id="newEstTipoDoc"><option value="C.C">C.C</option><option value="TI">TI</option><option value="C.E">C.E</option><option value="EXT">EXT</option><option value="PPT">PPT</option></select></div><div class="input-box"><label>Documento</label><input type="text" id="newEstId"></div><div class="input-box"><label>Nombre</label><input type="text" id="newEstNombre"></div></div><div style="display:flex; gap:10px; margin-top:10px;"><button class="btn-main" onclick="saveNewStudent()">Crear</button><button class="btn-main" style="background:var(--secondary);" onclick="loadStudents(selectedGroupId)">Cancelar</button></div></div>` + container.innerHTML; // Originalmente en una línea
}

async function saveNewStudent() {
    const tipodoc = document.getElementById('newEstTipoDoc').value; const iden = document.getElementById('newEstId').value.trim(); const nom = document.getElementById('newEstNombre').value.trim();
    if(!iden || !nom) return alert("Completa campos.");

    // Validación compuesta previa
    const { data: exists } = await _s.from('tusuario').select('id').eq('identificacion', iden).eq('tipodoc', tipodoc).maybeSingle();
    if(exists) return alert(`Error: Ya existe un estudiante registrado con el tipo ${tipodoc} e identificación ${iden}.`);

    const { data: u, error: e1 } = await _s.from('tusuario').insert({ nombre: nom, identificacion: iden, tipodoc: tipodoc, rol: 'estudiante', estado: 'Activo', debe_cambiar_password: true }).select('id').single();
    if (e1) return alert("Error: " + e1.message);
    const { error: e2 } = await _s.from('testudiantes').insert({ id: u.id, nombre: nom, tipodoc: tipodoc, id_colegio: selectedSchoolId, id_grado: selectedGradeId, id_grupo: selectedGroupId, estado: 'Activo' }); // Originalmente en una línea
    if (e2) alert("Error: " + e2.message); else { alert("Creado."); loadStudents(selectedGroupId); } // Originalmente en una línea
}

async function deleteStudent(studentId) {
    if (!confirm("¿Eliminar?")) return;
    const { error } = await _s.from('testudiantes').delete().eq('id', studentId); // Originalmente en una línea
    if (error) alert("Error: " + error.message); else loadStudents(selectedGroupId); // Originalmente en una línea
}

function toggleEditStudent(sid, uid, tdoc) {
    const tdIden = document.getElementById(`id-cell-${sid}`);
    const tdNom = document.getElementById(`name-cell-${sid}`);
    const tdTdoc = document.getElementById(`tdoc-cell-${sid}`);
    if (!tdIden || !tdNom || !tdTdoc) return;

    const currentIden = tdIden.innerText.trim();
    const currentNom = tdNom.innerText.trim();

    tdTdoc.innerHTML = `<select id="edit-tdoc-${sid}" style="width:70px;"><option value="C.C" ${tdoc==='C.C'?'selected':''}>C.C</option><option value="TI" ${tdoc==='TI'?'selected':''}>TI</option><option value="C.E" ${tdoc==='C.E'?'selected':''}>C.E</option><option value="EXT" ${tdoc==='EXT'?'selected':''}>EXT</option><option value="PPT" ${tdoc==='PPT'?'selected':''}>PPT</option></select>`;
    tdIden.innerHTML = `<input type="text" id="edit-iden-${sid}" value="${currentIden}" style="width:100px;">`;
    tdNom.innerHTML = `<input type="text" id="edit-nom-${sid}" value="${currentNom}" style="width:100%;">`;
    
    const actionTd = document.getElementById(`actions-${sid}`);
    actionTd.innerHTML = `
        <button class="btn-action" style="background:var(--success); color:white;" onclick="saveEditStudent('${sid}', '${uid}')"><i class="fa-solid fa-check"></i></button>
        <button class="btn-action" style="background:var(--secondary); color:white;" onclick="loadStudents(selectedGroupId)"><i class="fa-solid fa-xmark"></i></button>
    `;
}

async function saveEditStudent(sid, uid) {
    const nIden = document.getElementById(`edit-iden-${sid}`).value.trim();
    const nNom = document.getElementById(`edit-nom-${sid}`).value.trim();
    const nTdoc = document.getElementById(`edit-tdoc-${sid}`).value;

    if (!nIden || !nNom) return alert("Por favor, completa todos los campos.");

    // Validación compuesta previa
    const { data: exists } = await _s.from('tusuario').select('id').eq('identificacion', nIden).eq('tipodoc', nTdoc).neq('id', uid).maybeSingle();
    if(exists) return alert(`Error: Ya existe otro usuario registrado con el tipo ${nTdoc} e identificación ${nIden}.`);

    const { error: e1 } = await _s.from('tusuario').update({ nombre: nNom, identificacion: nIden, tipodoc: nTdoc }).eq('id', uid); // Originalmente en una línea
    const { error: e2 } = await _s.from('testudiantes').update({ nombre: nNom, tipodoc: nTdoc }).eq('id', sid); // Originalmente en una línea

    if (e1 || e2) alert("Error al actualizar los datos."); // Originalmente en una línea
    else loadStudents(selectedGroupId); // Originalmente en una línea
}

async function addGrade(schoolId) {
    const nombre = prompt("Número del Grado (Ej: 1, 11):"); if (!nombre) return;
    const { data: grado } = await _s.from('tgrados').select('id').eq('nombre', nombre).single();
    if (!grado) return alert("Grado no válido.");
    const grupoNom = prompt(`Habilitando Grado ${nombre}. Nombre del primer grupo:`, "A"); if (!grupoNom) return; // Originalmente en una línea
    const { error } = await _s.rpc('crear_grupo', { p_nombre: grupoNom, p_grado_id: grado.id, p_colegio_id: schoolId }); // Originalmente en una línea
    if (error) alert("Error: " + error.message); else { alert("Grado habilitado."); loadGrades(schoolId); } // Originalmente en una línea
}

async function addGroup(schoolId) {
    if (!selectedGradeId) return alert("Selecciona un grado.");
    const nombre = prompt("Nombre del nuevo grupo:"); if (!nombre) return;
    const { error } = await _s.rpc('crear_grupo', { p_nombre: nombre, p_grado_id: selectedGradeId, p_colegio_id: schoolId }); // Originalmente en una línea
    if (error) alert("Error: " + error.message); else loadGroups(selectedGradeId, schoolId); // Originalmente en una línea
}

let bulkUploadRows = [];
let bulkUploadConflicts = [];

async function viewLoadStudents(schoolId, schoolName) {
    bulkUploadRows = [];
    bulkUploadConflicts = [];
    document.getElementById('pageTitle').innerText = "Carga Masiva de Estudiantes";
    document.getElementById('pageDesc').innerText = "Institución: " + schoolName;
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-4">
            <h3>Subir Base de Datos Única</h3>
            <div class="dropzone" onclick="document.getElementById('fileInput').click()">
                <p id="fileName">Haz clic para seleccionar el Excel (.xlsx)</p>
                <input type="file" id="fileInput" style="display:none;" accept=".xlsx" onchange="processExcelInteligente(event, ${schoolId})">
            </div>
            <div id="statusCarga" style="display:none; margin-top:15px; padding:12px; border-radius:8px; background:#f0f7ff; font-size:0.9rem; border:1px solid #dbeafe;">Procesando...</div>
        </div>
        <div class="card span-2">
            <h3>Estructura</h3>
            <p style="margin-bottom:15px; font-size:0.9rem;">Columnas requeridas: <strong>grado, grupo, nombre, identificacion, tipodoc.</strong></p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="https://github.com/TU_USUARIO/TU_REPO/raw/main/plantilla_estudiantes.xlsx" class="btn-main" style="text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--success);" download>
                    <i class="fa-solid fa-file-download"></i> Descargar Plantilla
                </a>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewSchoolStructure(${schoolId}, ${JSON.stringify(schoolName)})">
                    Volver a Estructura
                </button>
            </div>
        </div>
        <div id="diagnosticArea" class="span-6"></div>`;
}

async function processExcelInteligente(event, schoolId) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const schoolName = document.getElementById('pageDesc').innerText.replace('Institución: ', '');
        
        // Asignar ID temporal para gestión de limpieza en la UI
        bulkUploadRows = json.map((r, i) => ({ ...r, _tempId: i }));
        await runBulkDiagnostic(schoolId, schoolName);
    };
    reader.readAsArrayBuffer(file);
}

async function runBulkDiagnostic(schoolId, schoolName) {
    const status = document.getElementById('statusCarga');
    status.style.display = "block";
    status.innerText = "Iniciando diagnóstico de seguridad...";
    
    const validDocTypes = ['C.C', 'TI', 'C.E', 'EXT', 'PPT'];
    bulkUploadConflicts = [];
    let seenInExcel = new Set();
    
    // 1. Validación de Formato y Duplicidad Interna (Excel)
    bulkUploadRows.forEach(row => {
        const iden = String(row.identificacion || '').trim();
        const tdoc = String(row.tipodoc || '').trim().toUpperCase().replace(/\./g, '');
        if (!iden || !row.nombre) { bulkUploadConflicts.push({ tempId: row._tempId, row, error: "Datos incompletos en la fila" }); return; }
        if (seenInExcel.has(iden)) { bulkUploadConflicts.push({ tempId: row._tempId, row, error: "Documento duplicado dentro del mismo Excel" }); }
        seenInExcel.add(iden);
        const normalizedTdoc = tdoc === 'CC' ? 'C.C' : (tdoc === 'TI' ? 'TI' : (tdoc === 'CE' ? 'C.E' : row.tipodoc));
        if (!validDocTypes.includes(normalizedTdoc)) { bulkUploadConflicts.push({ tempId: row._tempId, row, error: `Tipo de documento inválido: ${row.tipodoc}` }); }
    });
    
    // 2. Validación de Duplicidad Externa (Base de Datos Global)
    const idsToCheck = bulkUploadRows.map(r => String(r.identificacion || '').trim()).filter(id => id);
    if (idsToCheck.length > 0) {
        const { data: existing, error } = await _s.from('v_perfil_usuario').select('identificacion, tipodoc, nombre_institucion').in('identificacion', idsToCheck);
        if (!error && existing) {
            bulkUploadRows.forEach(row => {
                const iden = String(row.identificacion || '').trim();
                const tdocRaw = String(row.tipodoc || '').trim().toUpperCase().replace(/\./g, '');
                
                const match = existing.find(u => 
                    String(u.identificacion).trim() === iden && 
                    String(u.tipodoc || '').trim().toUpperCase().replace(/\./g, '') === tdocRaw
                );
                if (match) {
                    if (!bulkUploadConflicts.find(c => c.tempId === row._tempId)) {
                        bulkUploadConflicts.push({ tempId: row._tempId, row, error: `Ya registrado con tipo ${match.tipodoc} en: ${match.nombre_institucion || 'Otra Institución'}` });
                    }
                }
            });
        }
    }
    renderBulkDiagnosticUI(schoolId, schoolName);
}

function renderBulkDiagnosticUI(schoolId, schoolName) {
    const area = document.getElementById('diagnosticArea');
    const status = document.getElementById('statusCarga');
    if (bulkUploadConflicts.length > 0) {
        status.innerHTML = `<span style="color:#b91c1c; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Se detectaron ${bulkUploadConflicts.length} registros con conflictos.</span>`;
        area.innerHTML = `<div class="card span-6" style="border: 2px solid var(--danger); background: #fff5f5; margin-top:20px;"><h3 style="color:#b91c1c;"><i class="fa-solid fa-shield-halved"></i> Panel de Resolución de Conflictos</h3><p style="font-size:0.9rem; color:#7f1d1d; margin-bottom:20px;">Los siguientes estudiantes ya existen en el sistema o tienen datos erróneos. <strong>Debes omitirlos</strong> de esta carga para poder continuar.</p><div style="max-height: 350px; overflow-y: auto; border-radius: 10px; border: 1px solid #fecaca;"><table class="data-table" style="margin:0;"><thead style="position: sticky; top: 0; z-index: 10; background: #fee2e2;"><tr><th>Estudiante</th><th>ID / Doc</th><th>Motivo</th><th style="text-align:right;">Acción</th></tr></thead><tbody>${bulkUploadConflicts.map(c => `<tr><td><strong>${c.row.nombre || '—'}</strong></td><td><code>${c.row.identificacion} (${c.row.tipodoc})</code></td><td><span style="color:#b91c1c; font-size:0.85rem; font-weight:600;">${c.error}</span></td><td style="text-align:right;"><button class="btn-main" style="width:auto; padding:6px 15px; background:#ef4444;" onclick="omitirFilaConflicto(${c.tempId}, ${schoolId}, '${schoolName}')"><i class="fa-solid fa-user-minus"></i> Omitir</button></td></tr>`).join('')}</tbody></table></div></div>`;
    } else {
        const total = bulkUploadRows.length;
        if (total === 0) { status.innerHTML = `<span style="color:var(--secondary);">No hay registros válidos para cargar.</span>`; area.innerHTML = ''; }
        else {
            status.innerHTML = `<span style="color:#15803d; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ¡Archivo Validado! Registros listos: ${total}</span>`;
            area.innerHTML = `<div style="text-align:center; padding:40px; background:#f0fdf4; border: 2px dashed #22c55e; border-radius:15px; margin-top:20px;"><i class="fa-solid fa-file-circle-check" style="font-size:3.5rem; color:#22c55e; margin-bottom:15px;"></i><h3 style="color:#166534;">Carga Segura Habilitada</h3><p style="margin-bottom:25px; color:#166534;">Todos los conflictos han sido resueltos. Los datos están listos para ser insertados.</p><button class="btn-main" style="width:auto; padding:18px 50px; font-size:1.1rem; background:#16a34a;" onclick="ejecutarCargaLimpia(${schoolId})"><i class="fa-solid fa-cloud-arrow-up"></i> REALIZAR CARGA MASIVA</button></div>`;
        }
    }
}

function omitirFilaConflicto(tempId, schoolId, schoolName) {
    bulkUploadRows = bulkUploadRows.filter(r => r._tempId !== tempId);
    runBulkDiagnostic(schoolId, schoolName);
}

async function ejecutarCargaLimpia(schoolId) {
    const status = document.getElementById('statusCarga');
    status.innerText = "Insertando datos validados...";
    const finalData = bulkUploadRows.map(({ _tempId, ...rest }) => rest);
    const { data: res, error } = await _s.rpc('importar_estudiantes_inteligente', { p_estudiantes: finalData, p_colegio_id: schoolId });
    if (error) alert("Error en la carga: " + error.message);
    else { alert(`¡Carga completada con éxito! Se procesaron ${res.procesados} estudiantes.`); backToSchoolList(); }
}

async function viewDistReports() {
    const { data: cols } = await _s.from('tcolegios').select('id, nombre').eq('id_dist', sess.id).order('nombre');
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Estado de Evaluación</h3>
            <p style="color:var(--secondary); margin-bottom:20px;">Selecciona una de tus instituciones para consultar los informes de resultados.</p>
            <select id="distColegioSelector" class="pill-btn" style="width:100%; height:auto; padding:12px; font-size:1rem;" onchange="viewSchoolReportsPanel(this.value, this.options[this.selectedIndex].text)">
                <option value="">-- Seleccionar Institución --</option>
                ${(cols || []).map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}
            </select>
        </div>`;
}

async function viewSchoolReportsPanel(id, nom) {
    if (!id) return;
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Informes: ${nom}</h3>
                <button class="btn-main" style="width:auto; padding:10px 20px; background:var(--secondary);" onclick="${sess.rol==='admin'?'viewAdminReports()':'viewDistReports()'}">Volver</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="text-align: center; padding: 30px; border: 2px solid var(--primary); border-radius: 8px; cursor: pointer;" onclick="viewIndividualReports('${id}')">
                    <i class="fa-solid fa-user" style="font-size: 3rem; color: var(--primary); margin-bottom: 15px;"></i>
                    <h4>Informes Individuales</h4>
                    <p style="color: var(--secondary); margin-top: 10px;">Ver resultados por estudiante</p>
                </div>
                <div style="text-align: center; padding: 30px; border: 2px solid var(--success); border-radius: 8px; cursor: pointer;" onclick="viewGroupReports('${id}')">
                    <i class="fa-solid fa-users" style="font-size: 3rem; color: var(--success); margin-bottom: 15px;"></i>
                    <h4>Informes Grupales</h4>
                    <p style="color: var(--secondary); margin-top: 10px;">Análisis estadístico grupal</p>
                </div>
            </div>
        </div>`;
}

async function openLinkTestForm(schoolId, schoolName) {
    linkTestSchoolId = schoolId;
    document.getElementById('pageTitle').innerText = "Vincular evaluación";
    document.getElementById('pageDesc').innerText = schoolName;
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><p>Cargando...</p></div>`;

    const { data: pruebas, error: e1 } = await _s.from('tpruebas').select('id, nombre').order('nombre');
    const { data: grRows, error: e2 } = await _s.from('tgrupos').select(`id_grado, tgrados (id, nombre, numero)`).eq('id_colegio', schoolId);

    if (e1 || e2) {
        document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><p style="color:var(--danger);">Error al cargar datos.</p></div>`;
        return;
    }

    const uniqueGrades = [];
    const gmap = new Map();
    for (const item of (grRows || [])) {
        if (item.tgrados && !gmap.has(item.tgrados.id)) {
            gmap.set(item.tgrados.id, true);
            uniqueGrades.push(item.tgrados);
        }
    }
    uniqueGrades.sort((a, b) => a.numero - b.numero);

    if (uniqueGrades.length === 0) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Vincular evaluación</h3>
                <p style="color:var(--secondary);">Primero configura <strong>grados y grupos</strong> para esta institución (botón de estructura). Luego podrás solicitar la aplicación de una prueba.</p>
                <button class="btn-main" style="background:var(--secondary);" onclick="backToSchoolList()">Volver</button>
            </div>`;
        return;
    }

    const pruebasOpts = (pruebas || []).map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
    const gradeOpts = uniqueGrades.map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Solicitar aplicación de prueba</h3>
            <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:20px;">La solicitud quedará <strong>pendiente</strong> hasta que un administrador la apruebe.</p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div class="input-box"><label>Prueba / evaluación</label>
                    <select id="linkPrueba"><option value="">Seleccione</option>${pruebasOpts}</select></div>
                <div class="input-box"><label>Grado</label>
                    <select id="linkGrade" onchange="linkTestLoadGroups(${schoolId})"><option value="">Seleccione</option>${gradeOpts}</select></div>
                <div class="input-box"><label>Grupo</label>
                    <select id="linkGroup"><option value="">— Elija grado primero —</option></select></div>
                <div class="input-box"><label>Fecha inicial</label>
                    <input type="date" id="linkFechaIni"></div>
                <div class="input-box"><label>Fecha final</label>
                    <input type="date" id="linkFechaFin"></div>
            </div>
            <div style="display:flex; gap:15px; margin-top:28px;">
                <button class="btn-main" onclick="submitLinkTestRequest()">Enviar solicitud</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="backToSchoolList()">Volver</button>
            </div>
        </div>`;
}

async function linkTestLoadGroups(schoolId) {
    const gradeEl = document.getElementById('linkGrade');
    const groupEl = document.getElementById('linkGroup');
    if (!gradeEl || !groupEl) return;
    const gradeId = parseInt(gradeEl.value, 10);
    if (!gradeId) {
        groupEl.innerHTML = '<option value="">— Elija grado primero —</option>';
        return;
    }
    const { data, error } = await _s.from('tgrupos').select('id, nombre').eq('id_grado', gradeId).eq('id_colegio', schoolId).order('nombre');
    if (error) {
        groupEl.innerHTML = '<option value="">Error</option>';
        return;
    }
    groupEl.innerHTML = '<option value="">Seleccione grupo</option>' + (data || []).map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('');
}

async function submitLinkTestRequest() {
    const id_prueba = parseInt(document.getElementById('linkPrueba').value, 10);
    const id_grado = parseInt(document.getElementById('linkGrade').value, 10);
    const id_grupo = parseInt(document.getElementById('linkGroup').value, 10);
    const fecha_inicio = document.getElementById('linkFechaIni').value;
    const fecha_fin = document.getElementById('linkFechaFin').value;

    if (!id_prueba || !id_grado || !id_grupo || !fecha_inicio || !fecha_fin) return alert('Complete todos los campos.');
    if (fecha_fin < fecha_inicio) return alert('La fecha final debe ser mayor o igual a la inicial.');
    if (!linkTestSchoolId) return alert('Error interno: colegio no definido.');

    const { data: col, error: ce } = await _s.from('tcolegios').select('id_dist').eq('id', linkTestSchoolId).single();
    if (ce || !col) return alert('Error al verificar el colegio.');
    
    // Seguridad básica de cliente
    if (sess.rol !== 'admin' && col.id_dist !== sess.id) return alert('No tienes permiso para este colegio.');

    const { error } = await _s.from('tsolicitudes_aplicacion').insert([{
        id_colegio: linkTestSchoolId,
        id_prueba,
        id_grado,
        id_grupo,
        fecha_inicio,
        fecha_fin,
        estado: 'pendiente'
    }]);

    if (error) {
        console.error(error);
        return alert('Error al guardar: ' + error.message + ' (¿Creaste la tabla tsolicitudes_aplicacion en Supabase?)');
    }
    alert('Solicitud enviada. Un administrador la revisará.');
    backToSchoolList();
}