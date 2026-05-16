function adminMenuHtml(active) {
    const m = (key) => active === key ? 'nav-item active' : 'nav-item';
    return `
    <li class="${m('dash')}" onclick="viewAdmin()"><i class="fa-solid fa-chart-pie"></i> Dashboard</li>
    <li class="${m('dist')}" onclick="renderDistributorForm()"><i class="fa-solid fa-user-plus"></i> Nuevo Distribuidor</li>
    <li class="${m('schools')}" onclick="viewGlobalSchools()"><i class="fa-solid fa-school"></i> Gestión de Colegios</li>
    <li class="${m('eval_reports')}" onclick="viewAdminReports()"><i class="fa-solid fa-chart-line"></i> Informes de Evaluación</li>
    <li class="${m('tests')}" onclick="viewTests()"><i class="fa-solid fa-vial-circle-check"></i> Gestión de Pruebas</li>
    <li class="${m('areas')}" onclick="viewAreasVocacionales()"><i class="fa-solid fa-briefcase"></i> Áreas Vocacionales</li>
    <li class="${m('users')}" onclick="viewUserManagement()"><i class="fa-solid fa-users-gear"></i> Gestión de Usuarios</li>
    <li class="${m('solic')}" onclick="viewSolicitudesAplicacion()"><i class="fa-solid fa-clipboard-check"></i> Solicitudes de evaluación <span id="navBadgeAdminSolic"></span></li>
    <li class="${m('fact')}" onclick="viewFacturacion()"><i class="fa-solid fa-receipt"></i> Facturación</li>`;
}

function distMenuHtml(active) {
    const m = (key) => active === key ? 'nav-item active' : 'nav-item';
    return `
        <li class="${m('dash')}" onclick="viewDist()"><i class="fa-solid fa-house"></i> Dashboard <span id="navBadgeDistSolic"></span></li>
        <li class="${m('school')}" onclick="openSchoolForm()"><i class="fa-solid fa-plus-circle"></i> Nuevo Colegio</li>
        <li class="${m('reports')}" onclick="viewDistReports()"><i class="fa-solid fa-chart-bar"></i> Estado de Evaluación</li>
        <li class="${m('control')}" onclick="toggleResultadosVisibility()"><i class="fa-solid fa-eye"></i> Control de Resultados</li>
        <li class="${m('fact')}" onclick="viewFacturacion()"><i class="fa-solid fa-receipt"></i> Facturación</li>
    `;
}

function viewAdmin() {
    const board = document.getElementById('dynamicBoard');
    board.classList.add('bento-grid'); // Asegurar que el dashboard siempre use la cuadrícula

    document.getElementById('pageTitle').innerText = "Control Maestro";
    document.getElementById('pageDesc').innerText = "Panel global de administración y configuración del sistema.";
    
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('dash');

    board.innerHTML = `
        <div class="card span-2"><span class="stat-num" id="countDist">--</span><span class="stat-desc">Distribuidores</span></div>
        <div class="card span-2"><span class="stat-num" id="countCol">--</span><span class="stat-desc">Colegios Totales</span></div>
        <div class="card span-2"><span class="stat-num" id="countTestReal">--</span><span class="stat-desc">Resultados</span></div>

        <div class="fact-action-card" onclick="viewAdminReports()" style="grid-column: span 6;">
            <div style="color: var(--fact-blue); font-size: 24px;"><i class="fa-solid fa-chart-line"></i></div>
            <h3 style="margin:0; font-size: 1.2rem;">Informes de Evaluación</h3>
            <p style="color: #64708c; font-size: 0.9rem; margin:0;">Accede a los informes individuales y grupales de todos los colegios.</p>
        </div>
        
        <div class="card span-6">
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px;">
                <h3 style="min-width:0;">Listado de Distribuidores</h3>
                <button class="btn-main" style="width:auto; padding: 10px 25px; flex-shrink:0;" onclick="renderDistributorForm()">+ Nuevo Distribuidor</button>
            </div>
            <div class="card-table-wrapper" id="distributorsTableContainer">Cargando...</div>
        </div>
    `;
    
    loadAdminStats();
    loadDistributorsTable();
    refreshNotifBadges();
}

async function loadAdminStats() {
    try {
        // REFUERZO SEGURIDAD: Carga de estadísticas vía RPC segura (3 consultas en 1)
        const { data: res, error } = await _s.rpc('obtener_estadisticas_admin_seguras', {
            p_admin_id: sess.id
        });

        if (error || res.status === 'error') throw new Error(error?.message || res?.message);

        const stats = res?.data?.data || res?.data || res || {};
        document.getElementById('countDist').innerText = (stats.distribuidores || 0).toString().padStart(2, '0');
        document.getElementById('countCol').innerText = (stats.colegios || 0).toString().padStart(2, '0');
        document.getElementById('countTestReal').innerText = (stats.resultados || 0).toString().padStart(2, '0');
    } catch (e) { console.error("Error en stats:", e); }
}

async function loadDistributorsTable() {
    // REFUERZO SEGURIDAD: Carga de lista vía RPC segura en lugar de SELECT directo
    const { data: res, error: rpcError } = await _s.rpc('rpc_core_listar_distribuidores', {
        p_admin_id: sess.id
    });

    if (rpcError || !res) {
        console.error("Error en RPC Colegios:", rpcError);
        return;
    }
    const data = res.data?.data || res.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);
    const container = document.getElementById('distributorsTableContainer');
    
    if(error) return container.innerHTML = "Error al cargar distribuidores.";

    let html = `
        <table class="data-table">
            <thead><tr><th>Distribuidor</th><th>Estado</th><th style="text-align:right;">Acciones</th></tr></thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>
                            <strong>${d.nombre || 'Sin nombre'}</strong><br>
                            <span style="font-size:0.8rem; color:var(--secondary);"><i class="fa-solid fa-id-card"></i> ${d.tipodoc || ''} ${d.identificacion}</span>
                        </td>
                        <td><span class="badge badge-success">${d.estado}</span></td>
                        <td style="text-align:right;">
                            <button title="Editar" class="btn-action" onclick="renderDistributorForm('${d.id}', '${d.nombre}', '${d.identificacion}', '${d.tipodoc}')"><i class="fa-solid fa-pen"></i></button>
                            <button title="Eliminar" class="btn-action" style="background:var(--danger); color:white;" onclick="deleteDistributor('${d.id}')"><i class="fa-solid fa-trash"></i></button>
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
                <div class="input-box">
                    <label>Contraseña (Nueva o Reestablecer)</label>
                    <input type="text" id="admPass" placeholder="Opcional: Nueva clave">
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
    const password = document.getElementById('admPass').value.trim();
    if(!nombre.trim() || !identificacion.trim() || !tipodoc) return alert("Todos los campos son obligatorios.");

    const isEdit = (id !== "null" && id !== null && id !== "");
    let error;
    let finalId = id;

    if(isEdit) {
        // REFUERZO SEGURIDAD: Usar RPC en lugar de update directo
        const { data: res, error: rpcError } = await _s.rpc('editar_usuario_sistema', {
            p_usuario_id: id,
            p_nombre: nombre,
            p_identificacion: identificacion,
            p_tipodoc: tipodoc,
            p_password: password || null
        });
        if (rpcError || res.status === 'error') error = rpcError || res;
    } else {
        // Lógica original usando RPC para creación segura
        const { data: res, error: rpcError } = await _s.rpc('crear_usuario_sistema', {
            p_nombre: nombre, 
            p_identificacion: identificacion, 
            p_rol: 'distribuidor', 
            p_tipodoc: tipodoc,
            p_password: password || null
        });
        if(rpcError || (res && res.status === 'error')) error = rpcError || res;
    }

    if (error) {
        if (error.code === '23505' || error.message?.includes('unique_documento_tipo')) alert("Error: Ya existe un distribuidor registrado con este tipo y número de identificación.");
        else alert("Error: " + (error.message || "No se pudo procesar"));
    }
    else { alert("¡Éxito!"); viewAdmin(); }
}

async function deleteDistributor(id) {
    if(!confirm("¿Eliminar distribuidor? Perderá acceso al sistema.")) return;
    // REFUERZO SEGURIDAD: Eliminación via RPC con validación de rol
    const { data: res, error: rpcError } = await _s.rpc('eliminar_entidad_sistema', {
        p_tabla: 'tusuario',
        p_id_entidad: id,
        p_solicitante_id: sess.id
    });

    if(rpcError || res.status === 'error') alert("Error: " + (rpcError?.message || res?.message));
    else { alert("✅ Registro eliminado."); viewAdmin(); }
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
            <div class="card-table-wrapper" id="userManagementContainer"></div>
        </div>
    `;
    loadUserManagementTable();
}

async function loadUserManagementTable() {
    const role = document.getElementById('filterUserRole').value;
    const term = document.getElementById('searchUserTerm').value.trim();
    const schoolTerm = document.getElementById('searchUserSchool').value.trim();
    
    // REFUERZO SEGURIDAD: Consulta de usuarios via RPC con filtros en servidor
    const { data: res, error: rpcError } = await _s.rpc('obtener_usuarios_sistema_seguro', {
        p_admin_id: sess.id,
        p_rol: role || null,
        p_term: term || null,
        p_school_term: schoolTerm || null
    });

    const data = res?.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);

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
                            <button title="Editar Perfil" class="btn-action" style="background:#e2e8f0; color:var(--primary); margin-right:5px;" onclick="renderUserEditForm('${u.id}')">
                                <i class="fa-solid fa-user-pen"></i>
                            </button>
                            <button class="btn-action" style="background:#fee2e2; color:#b91c1c;" onclick="deleteSystemUser('${u.id}', '${u.nombre}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

/**
 * Renderiza un formulario genérico para editar cualquier usuario del sistema
 */
// Variable para recordar adónde volver después de editar un usuario desde otra vista
let _userEditReturnFn = null;

async function renderUserEditForm(userId) {
    // REFUERZO SEGURIDAD: Obtener detalle vía RPC para saltar el bloqueo de RLS
    const { data: res, error } = await _s.rpc('obtener_detalle_usuario_seguro', {
        p_admin_id: String(sess.id),
        p_target_id: String(userId)
    });

    if (error || res?.status === 'error') return alert("Error al cargar datos del usuario.");
    const u = res.data?.data || res.data || res;

    document.getElementById('pageTitle').innerText = "Editar Usuario: " + u.rol.toUpperCase();
    document.getElementById('pageDesc').innerText = "Modificación de credenciales y acceso al sistema.";
    
    const tdocOptions = ['C.C', 'TI', 'C.E', 'EXT', 'PPT'].map(opt => 
        `<option value="${opt}" ${opt === u.tipodoc ? 'selected' : ''}>${opt}</option>`
    ).join('');

    // El botón Cancelar vuelve al origen correcto
    const cancelAction = _userEditReturnFn
        ? `(${_userEditReturnFn.toString()})()`
        : `viewUserManagement()`;

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Datos de Acceso y Perfil</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-top:20px;">
                <div class="input-box" style="grid-column: span 2;"><label>Nombre Completo</label><input type="text" id="editUserNom" value="${u.nombre || ''}"></div>
                <div class="input-box">
                    <label>Tipo de Documento</label>
                    <select id="editUserTipoDoc">${tdocOptions}</select>
                </div>
                <div class="input-box">
                    <label>Identificación (Login)</label>
                    <input type="text" id="editUserId" value="${u.identificacion || ''}">
                </div>
                <div class="input-box">
                    <label>Nueva Contraseña (Opcional)</label>
                    <input type="text" id="editUserPass" placeholder="Clave o ID para reset">
                    <small style="color:var(--secondary);">Si escribes algo, se sobreescribirá la clave actual.</small>
                </div>
            </div>
            <div style="display:flex; gap:15px; margin-top:30px;">
                <button class="btn-main" onclick="saveUserEdit('${userId}', '${u.rol}')">Guardar Cambios</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="${cancelAction}">Cancelar</button>
            </div>
        </div>`;
}

async function saveUserEdit(userId, rol) {
    const nombre = document.getElementById('editUserNom').value.trim();
    const identificacion = document.getElementById('editUserId').value.trim();
    const tipodoc = document.getElementById('editUserTipoDoc').value;
    const password = document.getElementById('editUserPass').value.trim();

    if (!nombre || !identificacion) return alert("Nombre e identificación son obligatorios.");

    // REFUERZO SEGURIDAD: Edición centralizada via RPC
    const { data: res, error: rpcError } = await _s.rpc('editar_usuario_sistema', {
        p_usuario_id: userId,
        p_nombre: nombre,
        p_identificacion: identificacion,
        p_tipodoc: tipodoc,
        p_password: password || null
    });

    if (rpcError || res.status === 'error') {
        const err = rpcError || res;
        if (err.code === '23505' || err.message?.includes('unique_documento_tipo')) {
            return alert("No se puede actualizar: El tipo y número de identificación ya pertenecen a otro usuario en el sistema.");
        }
        return alert("Error al actualizar: " + (err.message || "No se pudo procesar"));
    }

    alert("✅ Usuario actualizado correctamente!");

    // Si se llegó desde otra vista (ej: estructura de colegio), volver a ella
    if (typeof _userEditReturnFn === 'function') {
        const fn = _userEditReturnFn;
        _userEditReturnFn = null;
        fn();
    } else {
        viewUserManagement();
    }
}

async function bulkDeleteFilteredUsers() {
    const schoolTerm = document.getElementById('searchUserSchool').value.trim();
    const role = document.getElementById('filterUserRole').value;
    
    if(!confirm(`⚠️ ATENCIÓN: Estás por eliminar permanentemente todos los usuarios que coinciden con el filtro actual (Institución: ${schoolTerm || 'Cualquiera'}).\n\n¿Deseas continuar?`)) return;

    const container = document.getElementById('userManagementContainer');
    const rows = container.querySelectorAll('button[onclick^="deleteSystemUser"]');
    const ids = Array.from(rows).map(btn => btn.getAttribute('onclick').split("'")[1]);

    // REFUERZO SEGURIDAD: Borrado masivo via RPC
    const { data: res, error } = await _s.rpc('borrar_usuarios_masivo_seguro', {
        p_ids: ids,
        p_admin_id: sess.id
    });
    
    if(error) alert("Error en el borrado masivo: " + error.message);
    else {
        alert("Limpieza completada.");
        loadUserManagementTable();
    }
}

async function deleteSystemUser(id, name) {
    if(!confirm(`¿Eliminar permanentemente a "${name}"?`)) return;
    // REFUERZO SEGURIDAD: Eliminación via RPC con validación de rol
    const { data: res, error: rpcError } = await _s.rpc('eliminar_entidad_sistema', {
        p_tabla: 'tusuario',
        p_id_entidad: id,
        p_solicitante_id: sess.id
    });

    if(rpcError || res.status === 'error') alert("Error: " + (rpcError?.message || res?.message));
    else { alert("✅ Usuario eliminado."); loadUserManagementTable(); }
}

async function viewTests() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('tests');
    document.getElementById('pageTitle').innerText = "Motor de Pruebas";
    document.getElementById('pageDesc').innerText = "Crea y configura el contenido de los exámenes.";
    
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px;">
                <h3 style="min-width:0;">Pruebas Configuradas</h3>
                <button class="btn-main" style="width:auto; padding: 10px 25px; flex-shrink:0;" onclick="renderTestForm()">+ Nueva Prueba</button>
            </div>
            <div class="card-table-wrapper" id="testsTableContainer">Cargando...</div>
        </div>
    `;
    // REFUERZO SEGURIDAD: Listado de pruebas vía RPC
    const { data: res, error } = await _s.rpc('obtener_listado_pruebas_seguro', {
        p_usuario_id: sess.id
    });

    if (error || res?.status === 'error') return alert("Error al cargar pruebas.");
    const data = res.data?.data || res.data || [];
    
    let html = `
        <table class="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Tipo Respuesta</th><th>Lógica Cálculo</th><th>Preguntas</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map(t => `
                    <tr>
                        <td>#${t.id}</td>
                        <td><strong>${t.nombre}</strong></td>
                        <td>${t.tipo_respuesta === 'likert_1_5' ? 'Likert (1-5)' : 'Sí/No'}</td>
                        <td>${t.logica_calculo === 'promedio_por_area' ? 'Promedio' : 'Conteo'}</td>
                        <td><span class="badge" style="background:var(--accent); color:white;">${t.tipo_informe || 'generico'}</span></td>
                        <td>${t.cantpreguntas || 0}</td>
                        <td style="display:flex; gap:8px; align-items: center;">
                            <button title="Configurar" class="btn-main" style="padding:8px; width:40px; background:var(--primary);" onclick="manageQuestions(${t.id}, '${t.nombre}')"><i class="fa-solid fa-gear"></i></button>
                            <button title="Subir CSV" class="btn-main" style="padding:8px; width:40px; background:var(--accent);" onclick="renderBulkUpload(${t.id}, '${t.nombre}')"><i class="fa-solid fa-upload"></i></button>
                            <button title="Editar" class="btn-main" style="padding:8px; width:40px; background:var(--secondary);" onclick="renderTestForm(${t.id}, '${t.nombre}', '${t.tipo_respuesta}', '${t.logica_calculo}', '${t.tipo_informe}', ${t.popup_activo}, '${t.popup_tipo}', '${t.popup_url || ''}')"><i class="fa-solid fa-pen"></i></button>
                            <button title="Eliminar" class="btn-main" style="padding:8px; width:40px; background:var(--danger);" onclick="deleteTest(${t.id})"><i class="fa-solid fa-trash"></i></button>
                            ${t.popup_activo ? '<i class="fa-solid fa-window-restore" style="color:var(--accent);" title="Popup Activo"></i>' : ''}
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    document.getElementById('testsTableContainer').innerHTML = html;
    refreshNotifBadges();
}

function renderTestForm(id = null, nombre = "", tipoRespuesta = "likert_1_5", logicaCalculo = "promedio_por_area", tipoInforme = "chaside_vocacional", pActivo = false, pTipo = "imagen", pUrl = "") {
    const isEdit = (id !== null && id !== 'null');
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>${isEdit ? 'Editar Prueba' : 'Nueva Prueba'}</h3>
            <div class="input-box" style="margin-top:20px;">
                <label>Nombre de la Prueba</label>
                <input type="text" id="testName" value="${nombre}">
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:10px;">
                <div class="input-box">
                    <label>Tipo de Respuesta</label>
                    <select id="testType">
                        <option value="likert_1_5" ${tipoRespuesta === 'likert_1_5' ? 'selected' : ''}>Escala Likert (1-5)</option>
                        <option value="si_no" ${tipoRespuesta === 'si_no' ? 'selected' : ''}>Sí / No</option>
                    </select>
                </div>
            </div>

            <h3 style="margin-top:30px; border-top:1.5px solid #E2E8F0; padding-top:25px; color:var(--primary);">Configuración de Ventana Emergente (Popup)</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin-top:20px; align-items: end;">
                <div class="input-box" style="margin-bottom:0;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none;">
                        <input type="checkbox" id="testPopupActivo" ${pActivo ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer; accent-color:var(--primary);" onchange="togglePopupFields()"> 
                        Activar Popup de Bienvenida
                    </label>
                </div>
                <div class="input-box" style="margin-bottom:0;">
                    <label>Tipo de Contenido</label>
                    <select id="testPopupTipo">
                        <option value="imagen" ${pTipo === 'imagen' ? 'selected' : ''}>Imagen (Banner)</option>
                        <option value="html" ${pTipo === 'html' ? 'selected' : ''}>HTML / URL Externa</option>
                    </select>
                </div>
                <div class="input-box" style="margin-bottom:0;">
                    <label>URL de la Imagen o Recurso</label>
                    <input type="text" id="testPopupUrl" value="${pUrl}" placeholder="https://ejemplo.com/imagen.png" ${!pActivo ? 'disabled' : ''}>
                </div>
                <div class="input-box">
                    <label>Plantilla de Informe</label>
                    <select id="tipoInforme">
                        <option value="chaside_vocacional" ${tipoInforme === 'chaside_vocacional' ? 'selected' : ''}>CHASIDE Vocacional</option>
                        <option value="inteligencia_emocional" ${tipoInforme === 'inteligencia_emocional' ? 'selected' : ''}>Inteligencia Emocional</option>
                        <option value="generico" ${tipoInforme === 'generico' ? 'selected' : ''}>Informe Genérico</option>
                    </select>
                </div>
                <div class="input-box">
                    <label>Lógica de Cálculo</label>
                    <select id="testLogic">
                        <option value="promedio_por_area" ${logicaCalculo === 'promedio_por_area' ? 'selected' : ''}>Promedio por Área</option>
                        <option value="conteo" ${logicaCalculo === 'conteo' ? 'selected' : ''}>Conteo Proporcional (Sí=100%)</option>
                    </select>
                </div>
            </div>
            <div style="display:flex; gap:15px; margin-top:20px;">
                <button class="btn-main" onclick="saveTest(${id})">${isEdit ? 'Actualizar' : 'Crear'} Prueba</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewTests()">Cancelar</button>
            </div>
        </div>`;
    // Call the function once after rendering to set the initial state
    togglePopupFields();
}

// New function to toggle the disabled state of popup-related fields
function togglePopupFields() {
    const cb = document.getElementById('testPopupActivo');
    if (!cb) return;
    const popupActivo = cb.checked;
    const popupTipo = document.getElementById('testPopupTipo');
    const popupUrl = document.getElementById('testPopupUrl');

    if (popupTipo) { popupTipo.disabled = !popupActivo; popupTipo.style.opacity = popupActivo ? '1' : '0.5'; }
    if (popupUrl) { popupUrl.disabled = !popupActivo; popupUrl.style.opacity = popupActivo ? '1' : '0.5'; }
}

async function saveTest(id) {
    const nombre = document.getElementById('testName').value.trim();
    const tipo_respuesta = document.getElementById('testType').value;
    const logica_calculo = document.getElementById('testLogic').value;
    const tipo_informe = document.getElementById('tipoInforme').value;
    if(!nombre || !tipo_respuesta || !logica_calculo || !tipo_informe) {
        return alert("Todos los campos son obligatorios.");
    }

    const popup_activo = document.getElementById('testPopupActivo').checked;
    const popup_tipo = document.getElementById('testPopupTipo').value;
    const popup_url = document.getElementById('testPopupUrl').value.trim();

    const payload = { nombre, tipo_respuesta, logica_calculo, tipo_informe, popup_activo, popup_tipo, popup_url };

    // REFUERZO SEGURIDAD: Upsert via RPC
    const { data: res, error } = await _s.rpc('gestionar_prueba_sistema', {
        p_id: id && id !== 'null' ? parseInt(id) : null,
        p_nombre: nombre,
        p_tipo_respuesta: tipo_respuesta,
        p_logica_calculo: logica_calculo,
        p_tipo_informe: tipo_informe,
        p_popup_activo: popup_activo,
        p_popup_tipo: popup_tipo,
        p_popup_url: popup_url
    });

    if(error) alert("Error: " + error.message);
    else viewTests();
}

async function deleteTest(id) {
    if(!confirm("¿Eliminar prueba? Se borrarán sus preguntas asociadas.")) return;
    // REFUERZO SEGURIDAD: Eliminación via RPC (El servidor debe manejar la integridad)
    const { data: res, error: rpcError } = await _s.rpc('eliminar_entidad_sistema', {
        p_tabla: 'tpruebas',
        p_id_entidad: id.toString(),
        p_solicitante_id: sess.id
    });

    if(rpcError || res.status === 'error') alert("Error: " + (rpcError?.message || res?.message));
    else viewTests();
}

async function manageQuestions(testId, testName) {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('tests');
    document.getElementById('pageTitle').innerText = "Configuración: " + testName;
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><div class="card-table-wrapper" id="qListContainer">Cargando...</div></div>`;
    
    // REFUERZO SEGURIDAD: Usar RPC para obtener preguntas de forma segura bypassando RLS
    const { data: res, error: rpcError } = await _s.rpc('obtener_preguntas_prueba_seguro', {
        p_prueba_id: String(testId),
        p_usuario_id: sess.id
    });

    const data = res.data?.data || res.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);

    if (error) {
        document.getElementById('qListContainer').innerHTML = "Error: " + (error.message || "No tienes permiso para ver estas preguntas.");
        return;
    }
    
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
    // REFUERZO SEGURIDAD: Obtener datos de la pregunta mediante el listado seguro filtrando por ID
    const { data: res, error } = await _s.rpc('obtener_preguntas_prueba_seguro', {
        p_prueba_id: String(testId),
        p_usuario_id: sess.id
    });

    if (error || res?.status === 'error') return alert("Error al cargar datos de la pregunta.");
    
    const q = res.data.find(item => item.id === qId);
    if (!q) return alert("No se encontró la pregunta.");

    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Editar Pregunta #${q.num_pregunta}</h3><div class="input-box"><label>Área</label><input type="text" id="eqArea" value="${q.area}"></div><div class="input-box"><label>Enunciado</label><textarea id="eqEnun">${q.enunciado}</textarea></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;"><div class="input-box"><label>Opción 1</label><input type="text" id="eq1" value="${q.opt1 || ''}" placeholder="Opción 1"></div><div class="input-box"><label>Opción 2</label><input type="text" id="eq2" value="${q.opt2 || ''}" placeholder="Opción 2"></div><div class="input-box"><label>Opción 3</label><input type="text" id="eq3" value="${q.opt3 || ''}" placeholder="Opción 3"></div><div class="input-box"><label>Opción 4</label><input type="text" id="eq4" value="${q.opt4 || ''}" placeholder="Opción 4"></div><div class="input-box" style="grid-column: span 2;"><label>Opción 5</label><input type="text" id="eq5" value="${q.opt5 || ''}" placeholder="Opción 5"></div></div><div style="display:flex; gap:15px; margin-top:20px;"><button class="btn-main" onclick="updateQuestion(${qId}, ${testId})">Guardar</button><button class="btn-main" style="background:var(--secondary);" onclick="manageQuestions(${testId}, '...')">Cancelar</button></div></div>`;
}

async function updateQuestion(qId, testId) {
    // REFUERZO SEGURIDAD: Edición via RPC
    const { data: res, error } = await _s.rpc('gestionar_pregunta_sistema', {
        p_id: qId,
        p_usuario_id: sess.id, // REFUERZO: Validación de identidad en servidor
        p_area: document.getElementById('eqArea').value,
        p_enunciado: document.getElementById('eqEnun').value,
        p_opt1: document.getElementById('eq1').value,
        p_opt2: document.getElementById('eq2').value,
        p_opt3: document.getElementById('eq3').value,
        p_opt4: document.getElementById('eq4').value,
        p_opt5: document.getElementById('eq5').value
    });

    if (error) {
        alert("Error al guardar los cambios: " + error.message);
    } else {
        alert("✅ Cambios actualizados exitosamente.");
        manageQuestions(testId);
    }
}

function renderBulkUpload(testId, testName) {
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Cargar CSV: ${testName}</h3>
            <p style="color:var(--secondary); margin-bottom:20px;">Formato: <strong>num; area; enunciado; opt1; opt2; opt3; opt4; opt5</strong></p>
            <div style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">
                <a href="src/Cargamasiva/plantilla_preguntas.csv" class="btn-main" style="width:auto; text-decoration:none; text-align:center; background:var(--accent);" download>
                    <i class="fa-solid fa-file-csv"></i> Descargar Plantilla de Preguntas (.csv)
                </a>
                <input type="file" id="csvFile" accept=".csv">
            </div>
            <div style="display:flex; gap:15px;">
                <button class="btn-main" onclick="processCSV(${testId})">Procesar</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewTests()">Cancelar</button>
            </div>
        </div>`;
}

async function processCSV(testId) {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return alert("Por favor, selecciona un archivo CSV.");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target.result;
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) throw new Error("El archivo está vacío o solo contiene encabezados.");

            // 1. Detectar Separador y Validar Encabezados
            const firstLine = lines[0];
            const separator = firstLine.includes(';') ? ';' : ',';
            // Limpiar BOM (caracteres invisibles de Excel) y normalizar a minúsculas
            const headers = firstLine.replace(/^\uFEFF/, '').split(separator).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
            
            const required = ['num_pregunta', 'area', 'enunciado', 'opt1', 'opt2'];
            const missing = required.filter(r => !headers.includes(r));
            
            if (missing.length > 0) {
                throw new Error(`La plantilla CSV es inválida o ha sido modificada. Faltan columnas obligatorias: ${missing.join(', ')}`);
            }

            // Función para obtener el índice de una columna por su nombre
            const idx = (name) => headers.indexOf(name);

            // 2. Procesar Datos con Mapeo Dinámico
            const toInsert = lines.slice(1).map((row, lIdx) => {
                const cols = row.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
                if (cols.length < 3) return null; // Saltar líneas vacías o corruptas

                return {
                    id_prueba: testId,
                    num_pregunta: parseInt(cols[idx('num_pregunta')]) || (lIdx + 1),
                    area: cols[idx('area')] || 'N/A',
                    enunciado: cols[idx('enunciado')] || '',
                    opt1: cols[idx('opt1')] || '',
                    opt2: cols[idx('opt2')] || '',
                    opt3: cols[idx('opt3')] || '',
                    opt4: cols[idx('opt4')] || '',
                    opt5: cols[idx('opt5')] || ''
                };
            }).filter(Boolean);

            if (toInsert.length === 0) throw new Error("No se encontraron registros válidos para cargar.");

            // REFUERZO SEGURIDAD: Inserción Masiva via RPC
            const { data: res, error } = await _s.rpc('importar_preguntas_sistema', {
                p_prueba_id: testId,
                p_preguntas: toInsert,
                p_usuario_id: sess.id // REFUERZO: Validación de identidad
            });
            if (error) throw error;

            alert(`¡Carga exitosa! Se han importado ${toInsert.length} preguntas correctamente.`);
            viewTests();

        } catch (err) {
            console.error("Fallo en Carga CSV:", err);
            alert("Error: " + err.message);
        }
    };
    reader.readAsText(file);
}

function viewDist() {
    document.getElementById('pageTitle').innerText = "Panel Operativo";
    document.getElementById('pageDesc').innerText = "Gestión comercial y vinculación de instituciones.";
    
    document.getElementById('roleMenu').innerHTML = distMenuHtml('dash');

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-3"><span class="stat-num" id="schoolCount">--</span><span class="stat-desc">Colegios Vinculados</span></div>
        <div class="card span-3"><span class="stat-num" id="studentCount">--</span><span class="stat-desc">Estudiantes Totales</span></div>
        <div class="card span-6">
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px;">
                <h3 style="min-width:0;">Mis Instituciones</h3>
                <button class="btn-main" style="width:auto; padding: 10px 25px; flex-shrink:0;" onclick="openSchoolForm()">+ Vincular Colegio</button>
            </div>
            <div class="card-table-wrapper" id="schoolsTableContainer">Cargando lista de colegios...</div>
        </div>
    `;
    loadDistStats();
    loadSchools();
    refreshNotifBadges();
}

async function loadDistStats() {
    // REFUERZO SEGURIDAD: Carga de estadísticas vía RPC segura
    const { data: res, error } = await _s.rpc('obtener_estadisticas_distribuidor_seguras', {
        p_dist_id: sess.id
    });
    
    if (error || res?.status === 'error') return;
    const s = res?.data?.data || res?.data || res || {};
    document.getElementById('schoolCount').innerText = (s.colegios || 0).toString().padStart(2, '0');
    document.getElementById('studentCount').innerText = (s.estudiantes || 0).toString().toLocaleString();
}

async function loadSchools() {
    const container = document.getElementById('schoolsTableContainer');
    // REFUERZO SEGURIDAD: Uso de función global compartida para consistencia entre Admin y Distribuidor
    const { data: res, error: rpcError } = await _s.rpc('obtener_listado_colegios_global_seguro', {
        p_admin_id: sess.id
    });

    const data = res?.data?.data || res?.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);
    
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
                            <button class="btn-action" style="background:#6366f1; color:white;" onclick='viewDistCollegeReports(${s.id}, ${JSON.stringify(s.nombre)})' title="Ver Informes"><i class="fa-solid fa-chart-column"></i></button>
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
    // REFUERZO SEGURIDAD: Obtener datos del rector vía RPC para saltar bloqueo RLS que afecta a distribuidores
    if (isEdit && schoolData.id_rector) { // Solo intentar obtener si hay un rector asignado
        const { data: res, error: recError } = await _s.rpc('obtener_detalle_usuario_seguro', {
            p_admin_id: String(sess.id),
            p_target_id: String(schoolData.id_rector)
        });
        if (!recError && res?.status === 'success') rectorInfo = res.data;
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
    // REFUERZO SEGURIDAD: Obtener detalle vía RPC para saltar bloqueo RLS
    const { data: res, error } = await _s.rpc('obtener_detalle_colegio_seguro', {
        p_usuario_id: String(sess.id),
        p_colegio_id: String(id)
    });

    if (error || res?.status === 'error') return alert("Error al cargar colegio.");
    openSchoolForm(res.data);
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

    // REFUERZO SEGURIDAD: Gestión transaccional via RPC (Crea o Edita Colegio + Rector)
    const { data: res, error: rpcError } = await _s.rpc('gestionar_colegio_sistema', {
        p_colegio_id: schoolId ? parseInt(schoolId) : null,
        p_nombre: payload.p_nombre,
        p_dane: payload.p_dane,
        p_ciudad: payload.p_ciudad,
        p_direccion: payload.p_direccion,
        p_id_departamento: payload.p_depto_id,
        p_telefono: payload.p_telefono,
        p_id_distribuidor: sess.id,
        p_rector_id: rectorId || null,
        p_rector_nombre: (rNom && rNom !== "") ? rNom : null,
        p_rector_identificacion: (rIdNum && rIdNum !== "") ? rIdNum : null,
        p_rector_tipodoc: (rTipoDoc && rTipoDoc !== "") ? rTipoDoc : null
    });

    if (rpcError || res?.status === 'error') {
        return alert("Error al procesar: " + (rpcError?.message || res?.message));
    }

    alert("¡Institución y Rector guardados correctamente!");
    backToSchoolList();
}

async function loadDepts() {
    // REFUERZO SEGURIDAD: Obtener departamentos via RPC
    const { data: res } = await _s.rpc('obtener_departamentos_sistema_seguro');
    const data = res?.data || [];
    return data.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
}

async function deleteSchool(id) {
    if(!confirm("¿Estás seguro de eliminar esta institución? Esta acción borrará permanentemente todos los grupos, estudiantes y resultados asociados.")) return;
    
    // REFUERZO SEGURIDAD: Eliminación via RPC con validación de rol
    const { data: res, error: rpcError } = await _s.rpc('eliminar_entidad_sistema', {
        p_tabla: 'tcolegios',
        p_id_entidad: id.toString(),
        p_solicitante_id: sess.id
    });

    if(rpcError || res.status === 'error') alert("Error: " + (rpcError?.message || res?.message));
    else { alert("✅ Institución eliminada correctamente."); backToSchoolList(); }
}

async function renderRectorForm(schoolId, schoolName, rectorId = '') {
    document.getElementById('pageTitle').innerText = rectorId ? 'Editar Rector' : 'Crear Rector';
    document.getElementById('pageDesc').innerText = `Institución: ${schoolName}`;

    let rectorData = { nombre: '', identificacion: '', tipodoc: '' };
    if (rectorId) {
        const { data, error } = await _s.from('tusuario').select('id, nombre, identificacion, tipodoc').eq('id', rectorId).single();
        if (!error && data) rectorData = data;
        // REFUERZO SEGURIDAD: Obtener datos del rector vía RPC para saltar bloqueo RLS
        const { data: res, error: recError } = await _s.rpc('obtener_detalle_usuario_seguro', {
            p_admin_id: String(sess.id),
            p_target_id: String(rectorId)
        });
        if (!recError && res?.status === 'success') rectorData = res.data;
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

    // REFUERZO SEGURIDAD: Usar RPC de gestión de colegio para actualizar Rector de forma atómica
    const { data: res, error } = await _s.rpc('gestionar_colegio_sistema', {
        p_colegio_id: parseInt(schoolId),
        p_rector_id: rectorId || null,
        p_rector_nombre: nombre,
        p_rector_identificacion: identificacion,
        p_rector_tipodoc: tipodoc
    });

    if (error || res?.status === 'error') return alert("Error: " + (error?.message || res?.message));

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
            <div class="card-table-wrapper" id="solicitudesContainer">Cargando...</div>
        </div>`;
    
    // REFUERZO SEGURIDAD: Usar RPC para obtener solicitudes de aplicación para el admin
    const { data: res, error: rpcError } = await _s.rpc('obtener_solicitudes_admin_seguro', {
        p_admin_id: sess.id
    });

    const data = res?.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);

    const box = document.getElementById('solicitudesContainer');
    if (error) {
        console.error("Error al cargar solicitudes de aplicación:", error);
        box.innerHTML = `
            <p style="color:var(--danger);">
                Error al cargar las solicitudes: ${esc(error.message || 'Desconocido')}.
                Asegúrate de que la función RPC 'obtener_solicitudes_admin_seguro' exista y esté actualizada.
            </p>
        `;

        refreshNotifBadges();
        return;
    }
    if (!data.length) {
        box.innerHTML = "<p style=\"text-align:center; padding:30px; color:var(--secondary);\">No hay solicitudes registradas.</p>";
        localStorage.setItem(notifKey('admin_sol_seen'), new Date().toISOString());
        refreshNotifBadges();
        return;
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
                    const badge = 
                        s.estado === 'pendiente' ? 'badge-pending' : 
                        s.estado === 'aprobada' ? 'badge-success' : 
                        s.estado === 'finalizada' ? 'badge-finalized' : 
                        'badge';
                        
                    const fi = s.fecha_inicio || '';
                    const ff = s.fecha_fin || '';
                    return ` 
                    <tr>
                        <td style="font-size:0.8rem;">${s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                        <td><strong>${s.colegio_nombre || 'N/A'}</strong></td>
                        <td style="font-size:0.85rem;">${s.distribuidor_nombre || '—'}</td>
                        <td>${s.prueba_nombre || '#' + s.id_prueba}</td>
                        <td>${s.grado_nombre || '—'} / ${s.grupo_nombre || '—'}</td>
                        <td style="font-size:0.8rem;">${fi} → ${ff}</td>
                        <td><span class="badge ${badge}">${s.estado}</span></td>
                        <td style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${pend ? `
                                <button class="btn-main" style="padding:6px 12px; font-size:0.75rem; width:auto; background:var(--success);" onclick="resolverSolicitudAplicacion(${s.id}, true)">Aprobar</button>
                                <button class="btn-main" style="padding:6px 12px; font-size:0.75rem; width:auto; background:var(--danger);" onclick="resolverSolicitudAplicacion(${s.id}, false)">Rechazar</button>
                            ` : `<span style="font-size:0.75rem; color:var(--secondary); margin-right:10px;">${s.motivo_rechazo ? esc(s.motivo_rechazo) : '—'}</span>`}
                            <button class="btn-action" style="background:var(--primary); color:white;" title="Edición Administrativa" onclick="renderEditSolicitudForm(${s.id})">
                                <i class="fa-solid fa-gears"></i>
                            </button>
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
    // REFUERZO SEGURIDAD: Decisión via RPC
    const { data: s, error } = await _s.rpc('gestionar_solicitud_aplicacion_segura', {
        p_solicitud_id: String(id), // Convertir a String para bigint
        p_estado: aprobar ? 'aprobada' : 'rechazada',
        p_motivo_rechazo: motivo || null, // Asegurar null si vacío
        p_admin_id: String(sess.id) // Convertir a String para uuid
    });
    if (error) alert('Error: ' + error.message);
    else { alert(aprobar ? 'Solicitud aprobada.' : 'Solicitud rechazada.'); viewSolicitudesAplicacion(); }
}

/**
 * Renderiza el formulario de edición administrativa avanzada para una solicitud
 */
async function renderEditSolicitudForm(id) {
    // REFUERZO SEGURIDAD: Obtener detalle vía RPC para evitar error 406 por bloqueo RLS en Joins
    const { data: rpcRes, error: rpcErr } = await _s.rpc('obtener_detalle_solicitud_seguro', {
        p_solicitud_id: id,
        p_usuario_id: sess.id
    });

    if (rpcErr || rpcRes?.status === 'error') return alert("No se pudo cargar la información de la solicitud.");
    const s = rpcRes.data;

    document.getElementById('pageTitle').innerText = "Gestión Administrativa de Solicitud";
    document.getElementById('pageDesc').innerText = `Editando ID #${id} - ${s.tcolegios?.nombre}`;

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Panel de Control Avanzado</h3>
            <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:25px;">
                Utiliza esta sección para corregir errores operativos o ajustar ventanas de tiempo sin repetir el flujo de solicitud.
            </p>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px; background:#f8fafc; padding:25px; border-radius:15px; border:1px solid #e2e8f0;">
                <div class="input-box" style="margin:0;">
                    <label>Estado Administrativo</label>
                    <select id="admEditEstado">
                        <option value="pendiente" ${s.estado === 'pendiente' ? 'selected' : ''}>Pendiente (Reiniciar flujo)</option>
                        <option value="aprobada" ${s.estado === 'aprobada' ? 'selected' : ''}>Aprobada (Forzar activación)</option>
                        <option value="rechazada" ${s.estado === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                        <option value="finalizada" ${s.estado === 'finalizada' ? 'selected' : ''}>Finalizada (Cerrar proceso)</option>
                    </select>
                    <small style="color:var(--secondary); display:block; margin-top:5px;">Si cambia a "Pendiente", la factura existente (si hay) debe ser gestionada en el módulo de facturación.</small>
                </div>
                
                <div class="input-box" style="margin:0;">
                    <label>Fecha de Inicio</label>
                    <input type="date" id="admEditFini" value="${s.fecha_inicio}">
                </div>
                
                <div class="input-box" style="margin:0;">
                    <label>Fecha de Finalización</label>
                    <input type="date" id="admEditFfin" value="${s.fecha_fin}">
                </div>

                <div class="input-box" style="grid-column: span 2; margin:0;">
                    <label>Notas de la Operación / Motivo de Rechazo</label>
                    <textarea id="admEditNotas" style="height:80px; resize:none;">${s.motivo_rechazo || ''}</textarea>
                </div>
            </div>

            <div style="display:flex; gap:15px; margin-top:30px;">
                <button class="btn-main" onclick="saveAdministrativeSolicitudEdit(${id})">Guardar Cambios Administrativos</button>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewSolicitudesAplicacion()">Cancelar</button>
            </div>
        </div>
    `;
}

/**
 * Ejecuta la actualización administrativa segura
 */
async function saveAdministrativeSolicitudEdit(id) {
    const estado = document.getElementById('admEditEstado').value;
    const fecha_inicio = document.getElementById('admEditFini').value;
    const fecha_fin = document.getElementById('admEditFfin').value;
    const motivo = document.getElementById('admEditNotas').value.trim();

    if (!fecha_inicio || !fecha_fin) return alert("Las fechas son obligatorias.");
    if (fecha_fin < fecha_inicio) return alert("La fecha de finalización no puede ser anterior a la de inicio.");

    // REFUERZO SEGURIDAD: Sincronización de tipos para evitar Schema Cache Error
    const { data: res, error } = await _s.rpc('gestionar_solicitud_aplicacion_segura', {
        p_solicitud_id: String(id), // Convertir a String para bigint
        p_estado: estado,
        p_fecha_inicio: fecha_inicio || null, // Asegurar null si vacío
        p_fecha_fin: fecha_fin || null,     // Asegurar null si vacío
        p_motivo_rechazo: motivo && motivo.trim() !== "" ? motivo.trim() : null,
        p_admin_id: String(sess.id) // Convertir a String para uuid
    });

    if (error) return alert("Error al actualizar: " + error.message);

    alert("✅ Solicitud actualizada correctamente por administración.");
    viewSolicitudesAplicacion();
}

async function viewGlobalSchools() {
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('schools');
    document.getElementById('pageTitle').innerText = "Gestión Global de Colegios";
    document.getElementById('pageDesc').innerText = "Supervisión de todas las instituciones registradas en la plataforma.";
    
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Instituciones en el Sistema</h3>
            <div class="card-table-wrapper" id="globalSchoolsContainer">Cargando todas las instituciones...</div>
        </div>
    `;

    // REFUERZO SEGURIDAD: Listado global via RPC
    const { data: res, error: rpcError } = await _s.rpc('obtener_listado_colegios_global_seguro', {
        p_admin_id: sess.id
    });

    const schools = res?.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);

    const box = document.getElementById('globalSchoolsContainer');

    if (error) {
        box.innerHTML = `<p style="color:var(--danger); margin-bottom:12px;"><strong>Error al cargar colegios.</strong><br>${esc(error.message)}</p>`;
        refreshNotifBadges();
        return;
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
                        <td style="color:var(--secondary); font-size:0.8rem;">${esc(c.distribuidor_nombre || '—')}</td>
                        <td>
                            <button class="btn-action" onclick="editSchool(${c.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-action btn-struct" onclick='viewSchoolStructure(${c.id}, ${JSON.stringify(c.nombre)})' title="Grados y Grupos"><i class="fa-solid fa-sitemap"></i></button>
                            <button class="btn-action btn-users" onclick='viewLoadStudents(${c.id}, ${JSON.stringify(c.nombre)})' title="Cargar Estudiantes"><i class="fa-solid fa-users"></i></button>
                            <button class="btn-action btn-rector-assign" onclick='renderRectorForm(${c.id}, ${JSON.stringify(c.nombre)}, ${JSON.stringify(c.id_rector || '')})' title="Asignar Rector"><i class="fa-solid fa-user-tie"></i></button>
                            <button class="btn-action btn-link-test" onclick='openLinkTestForm(${c.id}, ${JSON.stringify(c.nombre)})' title="Vincular evaluación"><i class="fa-solid fa-link"></i></button>
                            <button class="btn-action" style="background:#6366f1; color:white;" onclick='viewDistCollegeReports(${c.id}, ${JSON.stringify(c.nombre)})' title="Ver Informes"><i class="fa-solid fa-chart-column"></i></button>
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
    document.getElementById('pageDesc').innerText = "Control de visibilidad de informes por cada aplicación de grado y grupo.";

    // REFUERZO SEGURIDAD: Usar RPC para saltar bloqueo RLS al unir con tcolegios
    const { data: res, error } = await _s.rpc('obtener_gestion_resultados_distribuidor_seguro', {
        p_dist_id: sess.id
    });
    const sols = res?.data || [];

    if (error) {
        // Manejo elegante: Si las columnas no existen aún en la API, mostramos un mensaje amigable
        const msg = error.message.includes('not exist') 
            ? "La configuración de fechas está siendo sincronizada. Por favor, recarga la página en un momento o contacta a soporte."
            : error.message;
            
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--fact-orange);"></i> Configuración pendiente</h3>
                <p style="color: var(--secondary); margin-top:10px;">${msg}</p>
            </div>
        `;
        return;
    }

    let content = `
        <div class="card span-6">
            <h3>Habilitación de Informes por Aplicación</h3>
            <p style="color: var(--secondary); margin-bottom: 20px;">
                Gestiona cuándo los estudiantes de cada grupo pueden consultar sus resultados individuales.
            </p>
    `;

    if (!sols || sols.length === 0) {
        content += `<p style="color: var(--secondary); text-align: center; padding: 40px;">No hay aplicaciones de prueba aprobadas para gestionar.</p>`;
    } else {
        sols.forEach(sol => {
            const estadoActual = sol.resultados_habilitados ? 'Habilitado' : 'Deshabilitado';
            const colorEstado = sol.resultados_habilitados ? 'var(--success)' : 'var(--danger)';
            const iconoEstado = sol.resultados_habilitados ? 'fa-eye' : 'fa-eye-slash';

            content += `
                <div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 150px; gap: 15px; align-items: end;">
                        <div style="align-self: center;">
                            <h4 style="margin: 0; color: var(--primary);">${sol.tcolegios?.nombre}</h4>
                            <p style="margin:2px 0; font-size:0.85rem;"><strong>${sol.tpruebas?.nombre}</strong>: ${sol.tgrados?.nombre} / ${sol.tgrupos?.nombre}</p>
                            <p style="margin: 5px 0 0 0; color: var(--secondary); font-size: 0.9rem;">
                                Estado: <span style="color: ${colorEstado}; font-weight: bold;">
                                    <i class="fa-solid ${iconoEstado}"></i> ${estadoActual}
                                </span>
                            </p>
                        </div>
                        <div class="input-box" style="margin:0;">
                            <label>Fecha Inicio</label>
                            <input type="date" id="start-${sol.id}" value="${sol.resultados_fecha_inicio || ''}">
                        </div>
                        <div class="input-box" style="margin:0;">
                            <label>Fecha Fin</label>
                            <input type="date" id="end-${sol.id}" value="${sol.resultados_fecha_fin || ''}">
                        </div>
                        <button onclick="guardarConfiguracionResultados('${sol.id}')"
                                class="btn-main" style="padding: 12px; height: 48px;">
                            <i class="fa-solid fa-save"></i> Guardar
                        </button>
                    </div>
                    <div style="margin-top: 15px; background: #f8f9fa; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
                            <strong>Nota:</strong> Los resultados serán visibles solo si el interruptor está activo y hoy está dentro del rango de fechas.
                        </p>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700; color:var(--primary);">
                            <input type="checkbox" id="check-${sol.id}" ${sol.resultados_habilitados ? 'checked' : ''} style="width:18px; height:18px;">
                            Habilitar Visibilidad
                        </label>
                    </div>
                </div>
            `;
        });
    }

    content += `</div>`;
    document.getElementById('dynamicBoard').innerHTML = content;
}

async function guardarConfiguracionResultados(solicitudId) {
    const habilitado = document.getElementById(`check-${solicitudId}`).checked;
    const fInicio = document.getElementById(`start-${solicitudId}`).value;
    const fFin = document.getElementById(`end-${solicitudId}`).value;

    if (habilitado && (!fInicio || !fFin)) return alert("Si habilita los resultados, debe definir ambas fechas.");

    // REFUERZO SEGURIDAD: Configuración via RPC segura
    const { data: res, error } = await _s.rpc('gestionar_visibilidad_resultados_segura', {
        p_solicitud_id: solicitudId,
        p_habilitado: habilitado,
        p_fecha_inicio: fInicio || null,
        p_fecha_fin: fFin || null,
        p_usuario_id: sess.id
    });

    if (error) return alert(`Error: ${error.message}`);

    alert("✅ Configuración de resultados actualizada correctamente.");
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
            <div class="card-table-wrapper" id="studentsTableContainer"></div>
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
    
    // REFUERZO SEGURIDAD: Eliminación via RPC
    const { data: res, error: rpcError } = await _s.rpc('eliminar_entidad_sistema', {
        p_tabla: 'tgrupos',
        p_id_entidad: groupId.toString(),
        p_solicitante_id: sess.id
    });

    if(rpcError || res.status === 'error') alert("Error: " + (rpcError?.message || res?.message));
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
    
    // REFUERZO SEGURIDAD: Vaciado masivo via RPC
    const { data: res, error } = await _s.rpc('vaciar_entidad_sistema', {
        p_tipo: 'estudiantes_grupo',
        p_id_padre: selectedGroupId,
        p_solicitante_id: sess.id
    });

    if (error) alert("Error: " + error.message);
    else {
        alert("Grupo vaciado correctamente.");
        loadStudents(selectedGroupId);
    }
}

async function deleteGradeGroups(gradeId, schoolId, event) {
    if(event) event.stopPropagation();
    if (!confirm("¿Deseas eliminar EL GRADO COMPLETO? Esto borrará todos los grupos y estudiantes de este grado en este colegio.")) return;
    
    // REFUERZO SEGURIDAD: Vaciado masivo via RPC
    const { data: res, error } = await _s.rpc('vaciar_entidad_sistema', {
        p_tipo: 'grupos_grado',
        p_id_padre: gradeId,
        p_solicitante_id: sess.id
    });

    if(error) alert("Error: " + error.message);
    else { 
        alert("Grado eliminado de la vista del colegio."); 
        selectedGradeId = null; 
        document.getElementById('groupCard').style.display = "none"; 
        document.getElementById('studentCard').style.display = "none"; 
        loadGrades(schoolId); 
    }
}

async function loadGrades(schoolId) {
    const container = document.getElementById('gradesPicker');
    // REFUERZO SEGURIDAD: Obtener grados vía RPC segura
    const { data: res, error } = await _s.rpc('obtener_grados_colegio_seguro', {
        p_colegio_id: schoolId
    });

    if (error || res.status === 'error') return container.innerHTML = "Error.";
    const uniqueGrades = res.data?.data || res.data || [];
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
    if (!gradeId || !schoolId) return;

    // REFUERZO SEGURIDAD: Usar RPC en lugar de SELECT directo (bloqueado por RLS)
    const { data: res, error } = await _s.rpc('obtener_grupos_grado_seguro', {
        p_grado_id: String(gradeId),
        p_colegio_id: String(schoolId)
    });

    if (error || res?.status === 'error') return container.innerHTML = "<p>Error al cargar grupos.</p>";
    const data = res.data?.data || res.data || [];

    if (data.length === 0) { container.innerHTML = "<p>No hay grupos.</p>"; return; }
    container.innerHTML = data.map(g => `<div class="pill-btn" id="group-${g.id}" onclick="selectGroup(${g.id}, '${g.nombre}', this)"><span>${g.nombre}</span><i class="fa-solid fa-trash-can delete-icon" onclick="deleteGroup(${g.id}, ${gradeId}, ${schoolId}, event)"></i></div>`).join('');
}

async function selectGroup(id, name, el) {
    document.querySelectorAll('.pill-btn').forEach(i => i.classList.remove('active')); el.classList.add('active');
    selectedGroupId = id; document.getElementById('studentCard').style.display = "block"; loadStudents(id);
}
// Originalmente en una línea
async function loadStudents(groupId) {
    const container = document.getElementById('studentsTableContainer');
    if (!groupId) return;
    // REFUERZO SEGURIDAD: Obtener estudiantes vía RPC segura
    const { data: res, error } = await _s.rpc('obtener_estudiantes_grupo_seguro', {
        p_grupo_id: String(groupId)
    });

    if (error || res.status === 'error') return;
    const data = res.data?.data || res.data || [];
    if (!data.length) { container.innerHTML = "<p>Sin estudiantes.</p>"; return; }
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
                    <button class="btn-action" style="background:#e0f2fe; color:var(--primary);" onclick="darProrrogaEstudiante('${est.id}', '${est.nombre}')" title="Dar prórroga resultados"><i class="fa-solid fa-clock"></i></button>
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
    
    // REFUERZO SEGURIDAD: Creación via RPC
    const { data: res, error } = await _s.rpc('gestionar_estudiante_sistema', {
        p_nombre: nom,
        p_identificacion: iden,
        p_tipodoc: tipodoc,
        p_id_colegio: selectedSchoolId,
        p_id_grado: selectedGradeId,
        p_id_grupo: selectedGroupId
    });

    if (error || res.status === 'error') {
        const err = error || res;
        if (err.code === '23505' || err.message?.includes('unique_documento_tipo')) {
            alert("Error: Ya existe un estudiante registrado con este tipo y número de identificación.");
        } else alert("Error: " + (err.message || "No se pudo procesar"));
    } else { alert("✅ Estudiante creado."); loadStudents(selectedGroupId); }
}

async function deleteStudent(studentId) {
    if (!confirm("¿Esta seguro que se desea eliminar este estudiante?")) return;
    
    // REFUERZO SEGURIDAD: Eliminación via RPC
    const { data: res, error: rpcError } = await _s.rpc('eliminar_entidad_sistema', {
        p_tabla: 'testudiantes',
        p_id_entidad: studentId,
        p_solicitante_id: sess.id
    });

    if(rpcError || res.status === 'error') alert("Error: " + (rpcError?.message || res?.message));
    else loadStudents(selectedGroupId);
}

function toggleEditStudent(sid, uid, tdoc) {
    // Capturar el nombre del colegio antes de navegar al formulario
    const schoolName = document.getElementById('pageTitle').innerText;
    // Al guardar o cancelar, volver a la estructura del colegio actual
    _userEditReturnFn = () => viewSchoolStructure(selectedSchoolId, schoolName);
    renderUserEditForm(uid);
}

async function saveEditStudent(sid, uid) {
    const nIden = document.getElementById(`edit-iden-${sid}`).value.trim();
    const nNom = document.getElementById(`edit-nom-${sid}`).value.trim();
    const nTdoc = document.getElementById(`edit-tdoc-${sid}`).value;

    if (!nIden || !nNom) return alert("Por favor, completa todos los campos.");
    
    // REFUERZO SEGURIDAD: Edición via RPC
    const { data: res, error } = await _s.rpc('gestionar_estudiante_sistema', {
        p_estudiante_id: sid,
        p_nombre: nNom,
        p_identificacion: nIden,
        p_tipodoc: nTdoc
    });

    if (error || res.status === 'error') {
        const err = error || res;
        if (err.code === '23505' || err.message?.includes('unique_documento_tipo')) {
            alert("Error al actualizar: El tipo y número de identificación ya están en uso por otro usuario.");
        } else alert("Error al actualizar: " + (err.message || "No se pudo procesar"));
    }
    else loadStudents(selectedGroupId);
}

/**
 * Habilita individualmente los resultados para un alumno (Prórroga de 48 horas)
 */
async function darProrrogaEstudiante(sid, name) {
    const confirmacion = confirm(`¿Deseas habilitar el acceso a los resultados para ${name} por las próximas 48 horas independientemente de la fecha del colegio?`);
    if (!confirmacion) return;

    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() + 48);

    // REFUERZO SEGURIDAD: Prórroga via RPC
    const { data: res, error } = await _s.rpc('gestionar_prorroga_estudiante_segura', {
        p_estudiante_id: sid,
        p_fecha_limite: fechaLimite.toISOString(),
        p_usuario_id: sess.id
    });
    
    if (error) alert("Error al dar prórroga: " + error.message);
    else alert(`✅ Prórroga activada para ${name} hasta el ${fechaLimite.toLocaleString()}`);
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

async function viewLoadStudents(schoolId, schoolName) {
    document.getElementById('pageTitle').innerText = "Carga Masiva de Estudiantes";
    document.getElementById('pageDesc').innerText = "Institución: " + schoolName;
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-4">
            <h3>Subir Base de Datos Única</h3>
            <div class="dropzone" onclick="document.getElementById('fileInput').click()">
                <p id="fileName">Haz clic para seleccionar el Excel (.xlsx)</p>
                <input type="file" id="fileInput" style="display:none;" accept=".xlsx" onchange="processExcelInteligente(event, ${schoolId})">
            </div>
            <div id="statusCarga" style="display:none;">Procesando...</div>
        </div>
        <div class="card span-2">
            <h3>Estructura</h3>
            <p style="margin-bottom:15px; font-size:0.9rem;">Columnas requeridas: <strong>grado, grupo, nombre, identificacion, tipodoc.</strong></p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="src/Cargamasiva/plantilla_estudiantes.xlsx" class="btn-main" style="text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--success);" download>
                    <i class="fa-solid fa-file-download"></i> Descargar Plantilla
                </a>
                <button class="btn-main" style="background:var(--secondary);" onclick="viewSchoolStructure(${schoolId}, ${JSON.stringify(schoolName)})">
                    Volver a Estructura
                </button>
            </div>
        </div>`;
}

async function processExcelInteligente(event, schoolId) {
    const file = event.target.files[0]; 
    if(!file) return;

    const status = document.getElementById('statusCarga');
    status.style.display = "block";
    status.style.background = "#ebf8ff";
    status.style.color = "#2c5282";
    status.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analizando archivo...`;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Obtener el JSON crudo
            let json = XLSX.utils.sheet_to_json(worksheet);
            if (json.length === 0) throw new Error("El archivo está vacío.");

            // 1. Validar Encabezados Requeridos
            const headers = Object.keys(json[0]);
            const required = ['grado', 'grupo', 'nombre', 'identificacion', 'tipodoc'];
            const missing = required.filter(h => !headers.some(actual => actual.toLowerCase() === h));
            
            if (missing.length > 0) {
                throw new Error(`La plantilla ha sido modificada. Faltan las columnas: ${missing.join(', ')}`);
            }

            // 2. Normalización de Datos (Limpieza de identificación y normalización de llaves)
            json = json.map(row => {
                const newRow = {};
                // Convertimos todas las llaves a minúsculas para evitar "Nombre" vs "nombre"
                Object.keys(row).forEach(k => newRow[k.toLowerCase()] = row[k]);
                
                // Limpiamos la identificación de puntos, comas y espacios
                if (newRow.identificacion) {
                    newRow.identificacion = String(newRow.identificacion).replace(/[.,\s]/g, '');
                }
                
                return newRow;
            });

            // 1. Llamar a la validación rigurosa
            const { data: validacion, error } = await _s.rpc('validar_estudiantes_masivo', {
                p_estudiantes: json,
                p_colegio_id: schoolId
            });

            if (error) throw error;

            // 2. Verificar si hay conflictos
            if (validacion.hay_conflictos) {
                renderPanelDepuracion(json, validacion.conflictos, schoolId);
            } else {
                // Si todo está limpio, procedemos directamente
                procederConCargaFinal(json, schoolId);
            }

        } catch (err) {
            console.error(err);
            status.style.background = "#FFF5F5";
            status.style.color = "#C53030";
            status.innerHTML = `<strong>Error:</strong> ${err.message}`;
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Renderiza el Panel de Depuración con los errores encontrados
 */
function renderPanelDepuracion(originalJson, conflictos, schoolId) {
    const board = document.getElementById('dynamicBoard');
    const totalErrores = conflictos.length;
    const totalValidos = originalJson.length - totalErrores;

    // Filtrar los datos originales para quitar los IDs que tienen conflicto
    const IDsConflictivos = new Set(conflictos.map(c => String(c.identificacion)));
    const datosLimpios = originalJson.filter(row => !IDsConflictivos.has(String(row.identificacion)));

    board.innerHTML = `
        <div class="card span-6" style="border: 2px solid var(--danger);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h3 style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Panel de Depuración de Carga</h3>
                    <p>Se han detectado <strong>${totalErrores}</strong> registros duplicados o con conflictos de institución.</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-main" style="width:auto; background:var(--success);" onclick='procederConCargaFinal(${JSON.stringify(datosLimpios)}, ${schoolId})'>
                        Cargar registros válidos (${totalValidos})
                    </button>
                    <button class="btn-main" style="width:auto; background:var(--secondary);" onclick="location.reload()">
                        Cancelar todo
                    </button>
                </div>
            </div>

            <div class="card-table-wrapper" style="max-height:400px; overflow-y:auto; margin:0; border:1px solid #fed7d7; border-radius:12px;">
                <table class="data-table">
                    <thead>
                        <tr style="background:#fff5f5;">
                            <th>Estudiante en Excel</th>
                            <th>Identificación</th>
                            <th>Conflicto Detectado</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conflictos.map(c => `
                            <tr>
                                <td><strong>${c.nombre}</strong></td>
                                <td><code style="background:#eee; padding:2px 5px; border-radius:4px;">${c.identificacion}</code></td>
                                <td style="color:var(--danger); font-weight:600;">
                                    <i class="fa-solid fa-hotel"></i> Ya existe en: ${c.colegio_actual || 'Este mismo colegio'}
                                </td>
                                <td><span class="badge badge-pending">Omitido</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p style="margin-top:15px; font-size:0.85rem; color:var(--secondary);">* Los registros mostrados arriba NO serán cargados para evitar corrupción de datos.</p>
        </div>`;
}

/**
 * Ejecuta la inserción real en la base de datos después de la validación
 */
async function procederConCargaFinal(datosLimpios, schoolId) {
    const status = document.getElementById('statusCarga');
    if (status) {
        status.style.display = "block";
        status.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Cargando ${datosLimpios.length} estudiantes...`;
    }

    const { data, error } = await _s.rpc('importar_estudiantes_final', {
        p_estudiantes: datosLimpios,
        p_colegio_id: schoolId
    });

    if (error) {
        alert("Error en la carga final: " + error.message);
    } else {
        alert(`¡Carga exitosa! Se registraron ${data.procesados} estudiantes nuevos.`);
        // Pequeña pausa para que el usuario lea el mensaje antes de refrescar
        setTimeout(() => {
            viewSchoolStructure(schoolId, document.getElementById('pageDesc').innerText);
        }, 1500);
    }
}

async function viewDistReports() {
    const { data: res, error } = await _s.rpc('obtener_listado_colegios_global_seguro', { p_admin_id: sess.id });
    const cols = res?.data || [];
    
    let optionsHtml = '<option value="">-- Seleccionar Colegio --</option>';
    if (cols && cols.length > 0) {
        optionsHtml += cols.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    } else {
        optionsHtml = '<option value="">No hay colegios asignados</option>';
    }

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Estado de Evaluación por Colegio</h3>
            <div class="input-box" style="margin-top: 20px;">
                <label>Seleccionar Colegio</label>
                <select id="distColegioSelector" class="form-select" onchange="viewDistCollegeReports(this.value, this.options[this.selectedIndex].text)">
                    ${optionsHtml}
                </select>
            </div>
            <div id="distReportsContent" style="margin-top: 20px;">
                <p style="text-align: center; color: var(--secondary);">Selecciona un colegio para ver sus informes.</p>
            </div>
        </div>
    `;
}

async function viewDistCollegeReports(id, nom) {
    if (!id) return;
    document.getElementById('pageTitle').innerText = "Informes: " + nom;
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Análisis de Resultados</h3>
                <button class="btn-main" style="width:auto; background:var(--secondary);" onclick="${sess.rol === 'admin' ? 'viewGlobalSchools()' : 'viewDistReports()'}">Volver</button>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-top:20px;">
                <div class="fact-action-card" style="cursor:pointer;" onclick="viewInformesIndividuales('${id}', '${nom}')">
                    <div style="color: var(--primary); font-size: 2.5rem;"><i class="fa-solid fa-user"></i></div>
                    <h4 style="margin:15px 0 5px 0; font-size: 1.2rem;">Informes Individuales</h4>
                    <p style="color: var(--secondary); font-size: 0.85rem; margin:0;">Resultados detallados por cada estudiante.</p>
                </div>
                <div class="fact-action-card" style="cursor:pointer;" onclick="viewInformesGrupales('${id}', '${nom}')">
                    <div style="color: var(--success); font-size: 2.5rem;"><i class="fa-solid fa-users"></i></div>
                    <h4 style="margin:15px 0 5px 0; font-size: 1.2rem;">Informes Grupales</h4>
                    <p style="color: var(--secondary); font-size: 0.85rem; margin:0;">Análisis estadístico y comparativo por grado.</p>
                </div>
            </div>
        </div>`;
}

async function viewAdminReports() {
    document.getElementById('pageTitle').innerText = "Informes de Evaluación (Admin)";
    document.getElementById('pageDesc').innerText = "Consulta los resultados individuales y grupales de cualquier colegio del sistema.";
    document.getElementById('roleMenu').innerHTML = adminMenuHtml('eval_reports');

    // REFUERZO SEGURIDAD: Obtener listado global de colegios vía RPC
    const { data: res, error } = await _s.rpc('obtener_listado_colegios_global_seguro', {
        p_admin_id: String(sess.id)
    });
    if (error || res?.status === 'error') {
        console.error("Error cargando colegios para reportes:", error?.message || res?.message);
    }
    const schools = res.data?.data || res.data || [];

    if (error) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Error</h3>
                <p style="color: var(--danger);">Error cargando colegios: ${error.message}</p>
            </div>
        `;
        return;
    }

    let optionsHtml = '<option value="">-- Seleccionar Colegio --</option>';
    if (schools && schools.length > 0) {
        optionsHtml += schools.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    } else {
        optionsHtml = '<option value="">No hay colegios registrados</option>';
    }

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Informes de Evaluación por Colegio</h3>
            <div class="input-box" style="margin-top: 20px;">
                <label>Seleccionar Colegio</label>
                <select id="adminColegioSelector" class="form-select" onchange="viewDistCollegeReports(this.value, this.options[this.selectedIndex].text)">
                    ${optionsHtml}
                </select>
            </div>
            <div id="adminReportsContent" style="margin-top: 20px;">
                <p style="text-align: center; color: var(--secondary);">Selecciona un colegio para ver sus informes.</p>
            </div>
        </div>
    `;
}

async function openLinkTestForm(schoolId, schoolName) {
    linkTestSchoolId = schoolId;
    document.getElementById('pageTitle').innerText = "Vincular evaluación";
    document.getElementById('pageDesc').innerText = schoolName;
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><p>Cargando...</p></div>`;

    // REFUERZO SEGURIDAD: Obtener pruebas vía RPC
    const { data: resPruebas, error: e1 } = await _s.rpc('obtener_listado_pruebas_seguro', { p_usuario_id: String(sess.id) });
    const pruebas = resPruebas.data?.data || resPruebas.data || [];

    // REFUERZO SEGURIDAD: Obtener grados del colegio vía RPC
    const { data: resGrados, error: e2 } = await _s.rpc('obtener_grados_colegio_seguro', { p_colegio_id: String(schoolId) });
    const uniqueGrades = resGrados.data?.data || resGrados.data || [];


    if (e1 || e2) {
        document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><p style="color:var(--danger);">Error al cargar datos.</p></div>`;
        return;
    }

    if (uniqueGrades.length === 0) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Vincular evaluación</h3>
                <p style="color:var(--secondary);">Primero configura <strong>grados y grupos</strong> para esta institución (botón de estructura). Luego podrás solicitar la aplicación de una prueba.</p>
                <button class="btn-main" style="background:var(--secondary);" onclick="backToSchoolList()">Volver</button>
            </div>`;
        return;
    }

    const pruebasOpts = (pruebas || []).map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join(''); // Ya vienen del RPC
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
    // REFUERZO SEGURIDAD: Usar RPC unificada para cargar grupos con RLS activo
    const { data: res, error } = await _s.rpc('obtener_grupos_grado_seguro', {
        p_grado_id: String(gradeId),
        p_colegio_id: String(schoolId)
    });

    if (error || res?.status === 'error') {
        groupEl.innerHTML = '<option value="">Error</option>';
        return;
    }
    groupEl.innerHTML = '<option value="">Seleccione grupo</option>' + (res.data?.data || res.data || []).map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('');
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
    
    // REFUERZO SEGURIDAD: Envío via RPC validada en servidor
    const { data: res, error } = await _s.rpc('crear_solicitud_aplicacion_segura', {
        p_solicitante_id: String(sess.id),
        p_id_colegio: String(linkTestSchoolId),
        p_id_prueba: String(id_prueba),
        p_id_grado: String(id_grado),
        p_id_grupo: String(id_grupo),
        p_fecha_inicio: fecha_inicio,
        p_fecha_fin: fecha_fin
    });

    if (error || res?.status === 'error') {
        console.error(error);
        return alert('Error al guardar: ' + error.message + ' (¿Creaste la tabla tsolicitudes_aplicacion en Supabase?)');
    }
    alert('Solicitud enviada. Un administrador la revisará.');
    backToSchoolList();
}