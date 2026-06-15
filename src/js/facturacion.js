// =====================================================
// MÓDULO DE FACTURACIÓN - EDUEFICIENTE
// Implementación Frontend para gestión de facturas
// =====================================================

const TEMPLATE_BILLING_PATH = 'src/templates/';

/**
 * Carga una plantilla HTML y la renderiza con los datos proporcionados
 */
async function renderizarFacturaVisual(nombreTemplate, data, facturaId = null, solicitudId = null) {
    const board = document.getElementById('dynamicBoard');
    board.classList.remove('bento-grid'); // Permitir flujo vertical del reporte

    try {
        const response = await fetch(`${TEMPLATE_BILLING_PATH}${nombreTemplate}.html`);
        if (!response.ok) throw new Error(`No se encontró la plantilla ${nombreTemplate}`);
        const template = await response.text();

        // Procesar anexo de estudiantes para factura de grupo
        if (nombreTemplate === 'Facturacion_grupo' && facturaId && solicitudId) {
            data.estudiantesHtml = await obtenerHtmlListaEstudiantes(solicitudId);
        }

        board.innerHTML = renderTemplate(template, data);

        // Inyectar controles administrativos después del renderizado si es necesario
        if (facturaId && nombreTemplate === 'Facturacion_grupo') {
            agregarControlesAdminFactura(facturaId);
            await cargarHistorialAbonosYAuditoria(facturaId);
        }

        // Vincular botón de volver
        const btnBack = document.getElementById('btnVolverFacturacion');
        if (btnBack) {
            btnBack.onclick = () => {
                board.classList.add('bento-grid');
                viewListadoFacturas();
            };
        }
    } catch (err) {
        console.error("Error al renderizar factura:", err);
        board.innerHTML = `<div class="card span-6"><h3>Error</h3><p>No se pudo cargar la vista de factura.</p></div>`;
    }
}

// ==========================================
// 1️⃣ MENÚ Y VISTA PRINCIPAL DE FACTURACIÓN
// ==========================================

function agregarOpcionFacturacion() {
    const roleMenu = document.getElementById('roleMenu');
    if (!roleMenu) return;
    
    // Agregar opción de facturación al menú admin si no existe
    if (!document.querySelector('[onclick="viewFacturacion()"]')) {
        const newItem = document.createElement('li');
        newItem.className = 'nav-item';
        newItem.onclick = () => viewFacturacion();
        newItem.innerHTML = '<i class="fa-solid fa-receipt"></i> Facturación';
        roleMenu.appendChild(newItem);
    }
}

async function viewFacturacion() {
    if (!sess || (sess.rol !== 'admin' && sess.rol !== 'distribuidor')) {
        return alert('Acceso denegado.');
    }
    const board = document.getElementById('dynamicBoard');
    board.classList.add('bento-grid'); // Restaurar cuadrícula para la vista principal
    
    document.getElementById('pageTitle').innerText = "Módulo de Facturación";
    document.getElementById('pageDesc').innerText = sess.rol === 'admin' ? "Gestión comercial y control de ingresos." : "Consulta de facturación y estados financieros.";

    // Actualizar menú
    if (sess.rol === 'admin') {
        document.getElementById('roleMenu').innerHTML = adminMenuHtml('fact');
    } else if (sess.rol === 'distribuidor') {
        document.getElementById('roleMenu').innerHTML = distMenuHtml('fact');
    }

     board.innerHTML = `
        <div class="span-6" id="billingMainContainer">
            <div class="fact-section-header">
                <div class="fact-header-icon"><i class="fa-solid fa-receipt"></i></div>
                <div>
                    <h2 style="font-weight: 700; color: #12213f; margin:0;">Centro de Facturación</h2>
                    <p style="color: #7b88a8; margin:0;">
                        ${sess.rol === 'admin' ? 'Gestión comercial y control de ingresos' : 'Consulta de estados financieros y facturación'}
                    </p>
                </div>
            </div>
            
            <div class="fact-grid">
                <div class="fact-action-card" onclick="viewGestionPrecios()" ${sess.rol !== 'admin' ? 'style="display:none;"' : ''}>
                    <div style="color: var(--fact-blue); font-size: 24px;"><i class="fa-solid fa-tag"></i></div>
                    <h3 style="margin:0; font-size: 1.2rem;">Gestión de Precios</h3>
                    <p style="color: #64708c; font-size: 0.9rem; margin:0;">Configura valores, tarifas y vigencias del servicio.</p>
                </div>
                
                <div class="fact-action-card" onclick="viewListadoFacturas()">
                    <div style="color: var(--fact-green); font-size: 24px;"><i class="fa-solid fa-receipt"></i></div>
                    <h3 style="margin:0; font-size: 1.2rem;">Listado de Facturas</h3>
                    <p style="color: #64708c; font-size: 0.9rem; margin:0;">${sess.rol === 'admin' ? 'Consulta y gestiona el histórico de facturas emitidas.' : 'Consulta tus facturas y el estado de tus pagos.'}</p>
                </div>
                
                <div class="fact-action-card" onclick="viewReportesFacturacion()" ${sess.rol !== 'admin' ? 'style="display:none;"' : ''}>
                    <div style="color: var(--fact-orange); font-size: 24px;"><i class="fa-solid fa-chart-bar"></i></div>
                    <h3 style="margin:0; font-size: 1.2rem;">Reportes e Ingresos</h3>
                    <p style="color: #64708c; font-size: 0.9rem; margin:0;">Análisis detallado de recaudo y proyecciones.</p>
                </div>
                
                <div class="fact-action-card" onclick="viewAuditoriaFacturacion()" ${sess.rol !== 'admin' ? 'style="display:none;"' : ''}>
                    <div style="color: var(--fact-purple); font-size: 24px;"><i class="fa-solid fa-clipboard-list"></i></div>
                    <h3 style="margin:0; font-size: 1.2rem;">Auditoría</h3>
                    <p style="color: #64708c; font-size: 0.9rem; margin:0;">Registro de trazabilidad y logs del sistema.</p>
                </div>
            </div>

            <div id="facturacionStats" class="fact-grid" style="${sess.rol !== 'admin' ? 'display:none;' : ''}">
                <div class="fact-stat-card">
                    <div style="color: #7d88a3; font-size: 0.9rem;">Facturas Emitidas</div>
                    <div class="val" id="statFacturasEmitidas">--</div>
                </div>
                <div class="fact-stat-card green">
                    <div style="color: #7d88a3; font-size: 0.9rem;">Ingresos Totales</div>
                    <div class="val" id="statIngresos">$--</div>
                </div>
                <div class="fact-stat-card orange">
                    <div style="color: #7d88a3; font-size: 0.9rem;">Pagos Recibidos</div>
                    <div class="val" id="statPagos">$--</div>
                </div>
            </div>
        </div>
    `;

    cargarEstadisticasFacturacion();
}

// ==========================================
// 2️⃣ GESTIÓN DE PRECIOS
// ==========================================

async function viewGestionPrecios() {
    document.getElementById('pageTitle').innerText = "Gestión de Precios";
    document.getElementById('pageDesc').innerText = "Configura los precios y períodos de vigencia.";

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Configuración de Precios</h3>
                ${/* Botón deshabilitado temporalmente: <button class="btn-main" onclick="mostrarFormularioPrecio()" style="width: auto;">+ Nuevo Precio</button> */''}
            </div>
            <div id="preciosTableContainer">Cargando...</div>
        </div>
    `;

    await cargarTablaPreciosAdmin();
}

async function cargarTablaPreciosAdmin() {
    // REFUERZO SEGURIDAD: Carga de precios vía RPC
    const { data: res, error: rpcError } = await _s.rpc('obtener_precios_sistema_seguro', {
        p_admin_id: String(sess.id) // Asegurar que se envía como string
    });

    const data = res?.data?.data || res?.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);

    const container = document.getElementById('preciosTableContainer');
    if (error) return container.innerHTML = `<p style="color: red;">Error: ${error.message || error}</p>`;

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--secondary);">
                <p>No hay configuraciones de precio registradas.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Precio Base</th>
                    <th>Por Estudiante</th>
                    <th>Descuento %</th>
                    <th>Impuesto %</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(p => {
                    const esActivo = p.estado === 'Activo' ? 'badge-success' : 'badge-pending';
                    const vigenciaHasta = p.fecha_vigencia_hasta ? new Date(p.fecha_vigencia_hasta).toLocaleDateString('es-CO') : '∞';
                    const vigenciaDesde = new Date(p.fecha_vigencia_desde).toLocaleDateString('es-CO');
                    
                    return `
                        <tr>
                            <td><strong>${p.nombre_configuracion}</strong></td>
                            <td>$${formatoMoneda(p.precio_base)}</td>
                            <td>$${formatoMoneda(p.precio_por_estudiante)}</td>
                            <td>${p.descuento_porcentaje}%</td>
                            <td>${p.impuesto_porcentaje}%</td>
                            <td style="font-size: 0.85rem;">
                                ${vigenciaDesde} → ${vigenciaHasta}
                            </td>
                            <td><span class="badge ${esActivo}">${p.estado}</span></td>
                            <td style="display: flex; gap: 8px;">
                                <button class="btn-main" style="padding: 6px 12px; background: var(--secondary);" onclick="editarPrecio(${p.id})">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                ${/* Botón deshabilitado temporalmente: <button class="btn-main" style="padding: 6px 12px; background: var(--danger);" onclick="cambiarEstatusoPrecio(${p.id}, '${p.estado}')"><i class="fa-solid fa-${p.estado === 'Activo' ? 'ban' : 'check'}"></i></button> */''}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function mostrarFormularioPrecio(precioId = null) {
    let precioData = null;
    
    if (precioId) {
        const { data: _res } = await _s.rpc('obtener_precio_detalle_seguro', { p_precio_id: precioId, p_usuario_id: sess.id });
        precioData = _res?.data || null;
    }

    const isEdit = precioId !== null;
    const titulo = isEdit ? "Editar Configuración de Precio" : "Nueva Configuración de Precio";

    const board = document.getElementById('dynamicBoard');
    
    board.innerHTML = `
        <div class="card span-4">
            <h3>${titulo}</h3>
            
            <div style="display: grid; gap: 15px; margin-top: 20px;">
                <div class="input-box">
                    <label>Nombre de Configuración</label>
                    <input type="text" id="pNombre" placeholder="Ej: Tarifa 2026" value="${precioData?.nombre_configuracion || ''}">
                </div>
                
                <div class="input-box">
                    <label>Descripción (Opcional)</label>
                    <textarea id="pDescripcion" placeholder="Detalles sobre esta tarifa" style="height: 60px;">${precioData?.descripcion || ''}</textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="input-box">
                        <label>Precio Base (COP)</label>
                        <input type="number" id="pBase" placeholder="50000" value="${precioData?.precio_base || ''}">
                        <small style="color: var(--secondary);">Precio fijo por solicitud aprobada</small>
                    </div>
                    
                    <div class="input-box">
                        <label>Precio por Estudiante (COP)</label>
                        <input type="number" id="pEstudiante" placeholder="3000" value="${precioData?.precio_por_estudiante || ''}">
                        <small style="color: var(--secondary);">Se multiplica por cantidad de alumnos</small>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="input-box">
                        <label>Descuento (%)</label>
                        <input type="number" id="pDescuento" placeholder="0" min="0" max="100" value="${precioData?.descuento_porcentaje || '0'}">
                    </div>
                    
                    <div class="input-box">
                        <label>Impuesto IVA (%)</label>
                        <input type="number" id="pImpuesto" placeholder="8" min="0" max="100" value="${precioData?.impuesto_porcentaje || '8'}">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="input-box">
                        <label>Vigencia Desde</label>
                        <input type="date" id="pDesde" value="${precioData?.fecha_vigencia_desde || nuevaFecha()}">
                    </div>
                    
                    <div class="input-box">
                        <label>Vigencia Hasta (Opcional)</label>
                        <input type="date" id="pHasta" value="${precioData?.fecha_vigencia_hasta || ''}">
                        <small style="color: var(--secondary);">Dejar vacío = vigencia indefinida</small>
                    </div>
                </div>
                
                <div class="input-box">
                    <label>Estado</label>
                    <select id="pEstado">
                        <option value="Activo" ${precioData?.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                        <option value="Inactivo" ${precioData?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                        <option value="Archivado" ${precioData?.estado === 'Archivado' ? 'selected' : ''}>Archivado</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 25px;">
                <button class="btn-main" onclick="guardarPrecio(${precioId || 'null'})">
                    ${isEdit ? 'Actualizar' : 'Crear'} Precio
                </button>
                <button class="btn-main" style="background: var(--secondary);" onclick="viewGestionPrecios()">
                    Cancelar
                </button>
            </div>
        </div>
    `;
}

async function guardarPrecio(precioId) {
    const nombre = document.getElementById('pNombre').value.trim();
    const descripcion = document.getElementById('pDescripcion').value.trim();
    const precioBase = parseFloat(document.getElementById('pBase').value);
    const precioPorEstudiante = parseFloat(document.getElementById('pEstudiante').value);
    const descuento = parseFloat(document.getElementById('pDescuento').value) || 0;
    const impuesto = parseFloat(document.getElementById('pImpuesto').value) || 0;
    const desde = document.getElementById('pDesde').value;
    const hasta = document.getElementById('pHasta').value || null;
    const estado = document.getElementById('pEstado').value;

    if (!nombre || isNaN(precioBase) || isNaN(precioPorEstudiante)) {
        return alert('Por favor completa todos los campos obligatorios.');
    }

    if (descuento < 0 || descuento > 100) {
        return alert('El descuento debe estar entre 0 y 100%.');
    }

    const datos = {
        nombre_configuracion: nombre,
        descripcion,
        precio_base: precioBase,
        precio_por_estudiante: precioPorEstudiante,
        descuento_porcentaje: descuento,
        impuesto_porcentaje: impuesto,
        fecha_vigencia_desde: desde,
        fecha_vigencia_hasta: hasta,
        estado
    };

    let result;
    result = await _s.rpc('gestionar_precio_sistema', {
        p_precio_id: (precioId !== 'null' && precioId !== null) ? precioId : null,
        p_datos: datos,
        p_usuario_id: sess.id
    });

    if (result.error) {
        alert('Error: ' + result.error.message);
    } else {
        alert('✅ Precio guardado exitosamente.');
        viewGestionPrecios();
    }
}

async function cambiarEstatusoPrecio(precioId, estadoActual) {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    const { error } = await _s.from('tprecios')
        .update({ estado: nuevoEstado })
        .eq('id', precioId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert(`✅ Precio cambió a: ${nuevoEstado}`);
        cargarTablaPreciosAdmin();
    }
}

// ==========================================
// 3️⃣ LISTADO DE FACTURAS
// ==========================================

async function viewListadoFacturas() {
    document.getElementById('pageTitle').innerText = "Listado de Facturas";
    document.getElementById('pageDesc').innerText = "Consulta todas las facturas emitidas en el sistema.";

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px;">
                <div style="${sess.rol !== 'admin' ? 'display:none;' : 'display: flex; gap: 15px;'}">
                <div class="input-box" style="margin: 0; flex: 1;">
                    <label>Distribuidor</label>
                    <select id="fFiltroDistribuidor" onchange="cargarSelectColegiosFiltro()">
                        <option value="">Todos</option>
                        <option value="___cargando">Cargando...</option>
                    </select>
                </div>
                <div class="input-box" style="margin: 0; flex: 1;">
                    <label>Colegio Específico</label>
                    <select id="fFiltroColegio" onchange="cargarListadoFacturas()">
                        <option value="">Todos los colegios</option>
                    </select>
                </div>
                </div>
                
                <div style="display: flex; gap: 15px;">
                <div class="input-box" style="margin: 0; flex: 1;">
                    <label>Estado</label>
                    <select id="fFiltroEstado" onchange="cargarListadoFacturas()">
                        <option value="">Todos</option>
                        <option value="Emitida">Emitida</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="Anulada">Anulada</option>
                    </select>
                </div>
                <div class="input-box" style="margin: 0; flex: 1;">
                    <label>Rango Fecha</label>
                    <input type="date" id="fFechaDesde" onchange="cargarListadoFacturas()">
                </div>
                <div class="input-box" style="margin: 0; flex: 1;">
                    <label>&nbsp;</label>
                    <input type="date" id="fFechaHasta" onchange="cargarListadoFacturas()">
                </div>
                </div>

                <div id="consolidadoBtnContainer" style="display: none; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 10px; text-align: right;">
                    <button class="btn-main" style="width: auto; background: var(--primary); box-shadow: var(--shadow);" onclick="prepararConsolidado()">
                        <i class="fa-solid fa-file-contract"></i> Generar Consolidado Institucional
                    </button>
                </div>
            </div>
            
            <div id="facturasTableContainer">Cargando facturas...</div>
        </div>
    `;

    // Cargar distribuidores en el select
    // REFUERZO SEGURIDAD: Usar RPC para cargar distribuidores para el filtro
    const { data: resDist, error: errDist } = await _s.rpc('rpc_core_listar_distribuidores', {
        p_admin_id: sess.id
    });

    if (errDist || resDist?.status === 'error') {
        console.error("Error al cargar distribuidores para filtro:", errDist || resDist);
    }
    const distribuidores = resDist?.data || [];
    const selectDist = document.getElementById('fFiltroDistribuidor');
    selectDist.innerHTML = '<option value="">Todos</option>' +
        (distribuidores?.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('') || '');

    await cargarSelectColegiosFiltro();
}

/**
 * Carga los colegios del distribuidor seleccionado para habilitar consolidación
 */
async function cargarSelectColegiosFiltro() {
    const distId = document.getElementById('fFiltroDistribuidor').value;
    const selectCol = document.getElementById('fFiltroColegio');
    
    if (!distId && sess.rol !== 'admin') {
        selectCol.innerHTML = '<option value="">Todos los colegios</option>';
        cargarListadoFacturas();
        return;
    }

    let colegiosData = [];
    
    if (sess.rol === 'admin') {
        // Para el administrador, cargamos TODOS los colegios y filtramos en JS si hay un distribuidor seleccionado
        const { data: resCol, error: errCol } = await _s.rpc('obtener_listado_colegios_global_seguro', { p_admin_id: sess.id });
        if (errCol || resCol?.status === 'error') console.error("Error al cargar todos los colegios:", errCol || resCol);
        
        const allCols = Array.isArray(resCol) ? resCol : (resCol?.data || []);
        if (distId) {
            colegiosData = allCols.filter(c => c.id_dist === distId);
        } else {
            colegiosData = allCols;
        }
    } else if (distId) {
        // REFUERZO SEGURIDAD: Usar RPC específico para distribuidores
        const { data: resCol, error: errCol } = await _s.rpc('obtener_listado_colegios_global_seguro', {
            p_admin_id: distId
        });
        if (errCol || resCol?.status === 'error') console.error("Error al cargar colegios por distribuidor:", errCol || resCol);
        colegiosData = Array.isArray(resCol) ? resCol : (resCol?.data || []);
    }
    selectCol.innerHTML = '<option value="">Todos los colegios</option>' +
        (colegiosData?.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('') || '');

    // If there's only one college, pre-select it to make the consolidated button appear faster
    if (colegiosData && colegiosData.length === 1) {
        selectCol.value = colegiosData[0].id;
    } else if (colegiosData && colegiosData.length > 0 && !selectCol.value) {
        // Si no hay selección, pero hay datos, dejamos "Todos"
    }

    cargarListadoFacturas();
}

async function cargarListadoFacturas() {
    const distribuidor = sess.rol === 'admin' ? document.getElementById('fFiltroDistribuidor')?.value : sess.id;
    const colegio = document.getElementById('fFiltroColegio')?.value;
    const estado = document.getElementById('fFiltroEstado')?.value;
    const fechaDesde = document.getElementById('fFechaDesde')?.value;
    const fechaHasta = document.getElementById('fFechaHasta')?.value;

    // REFUERZO SEGURIDAD: Listado vía RPC con filtros en servidor
    const { data: res, error: rpcError } = await _s.rpc('obtener_listado_facturas_seguro', {
        p_usuario_id: sess.id,
        p_distribuidor_id: (distribuidor && distribuidor !== sess.id) ? distribuidor : null,
        p_colegio_id: colegio ? parseInt(colegio) : null,
        p_estado: estado || null,
        p_fecha_desde: fechaDesde || null,
        p_fecha_hasta: fechaHasta || null
    });

    // Mostrar botón de consolidado solo si hay un colegio seleccionado
    const btnConsol = document.getElementById('consolidadoBtnContainer');
    if (btnConsol) btnConsol.style.display = (colegio && colegio !== "" && colegio !== "null") ? 'block' : 'none';

    const data = res?.data?.data || res?.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);
    const container = document.getElementById('facturasTableContainer');

    if (error) {
        container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--secondary);">No hay facturas que coincidan con los filtros.</p>`;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Factura</th>
                    <th>Distribuidor</th>
                    <th>Institución</th>
                    <th>Fecha</th>
                    <th>Grado</th>
                    <th>Grupo</th>
                    <th>Estado</th>
                    <th>Pago</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(f => {
                    return `
                    <tr>
                        <td><strong>${f.numero_factura}</strong></td>
                        <td>${f.distribuidor_nombre || 'N/A'}</td>
                        <td>${f.colegio_nombre || 'N/A'}</td>
                        <td>${new Date(f.fecha_emision).toLocaleDateString('es-CO')}</td>
                        <td>${f.grado_nombre || '—'}</td>
                        <td>${f.grupo_nombre || '—'}</td>
                        <td><span class="badge ${f.estado === 'Emitida' ? 'badge-pending' : 'badge-success'}">${f.estado}</span></td>
                        <td>${f.pagada ? '✅ Sí' : '⏳ No'}</td>
                        <td>
                            <button class="btn-main" style="padding: 6px 12px; background: #3b82f6;" onclick="verFacturaDetalle(${f.id})">
                                <i class="fa-solid fa-eye"></i> Ver
                            </button>
                        </td>
                    </tr>
                `; }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function prepararConsolidado() {
    const colegioId = document.getElementById('fFiltroColegio').value;
    if (!colegioId) return;
    verFacturaInstitucional(colegioId);
}

async function verFacturaDetalle(facturaId) {
    // REFUERZO SEGURIDAD: Detalle vía RPC con validación de propiedad
    const { data: res, error: rpcError } = await _s.rpc('obtener_detalle_factura_seguro', {
        p_factura_id: facturaId.toString().trim(),
        p_usuario_id: sess.id
    });

    if (rpcError || res?.status === 'error') {
        alert('Error al cargar factura: ' + (rpcError?.message || res?.message || 'Desconocido'));
        return;
    }

    const data = res.data;
    const solId = data.id_solicitud_origen;

    // OBTENER CONTEO REAL EN TIEMPO REAL
    let realCompletados = data.cantidad_estudiantes_completaron || 0;
    if (solId) {
        const { data: resReal } = await _s.rpc('obtener_estudiantes_completados_solicitud_seguro', {
            p_solicitud_id: parseInt(solId),
            p_usuario_id: sess.id
        });
        const s = resReal?.data?.data || resReal?.data || resReal || {};
        if (s.status === 'success') {
            realCompletados = s.data?.length || 0;
        } else if (Array.isArray(s)) {
            realCompletados = s.length;
        }
    }

    const { data: preciosActivos } = await _s.from('tprecios')
        .select('precio_base, precio_por_estudiante')
        .eq('estado', 'Activo')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const pBase = (data.precio_base_at_emission !== null && data.precio_base_at_emission !== undefined) ? data.precio_base_at_emission : (preciosActivos?.precio_base || 0);
    const pUnit = (data.precio_unitario_calculado !== null && data.precio_unitario_calculado !== undefined) ? data.precio_unitario_calculado : (preciosActivos?.precio_por_estudiante || 0);
    const displayTaxPercent = (data.impuesto_porcentaje_at_emission !== null && data.impuesto_porcentaje_at_emission !== undefined) ? data.impuesto_porcentaje_at_emission : 8;
    const taxRate = displayTaxPercent / 100;

    // CÁLCULO DINÁMICO EN TIEMPO REAL
    const subtotalCalc = pBase + (pUnit * realCompletados);
    const descuentoCalc = data.descuento || 0; // Se mantiene el descuento manual si existe
    const impuestoCalc = (subtotalCalc - descuentoCalc) * taxRate;
    const totalCalc = (subtotalCalc - descuentoCalc) + impuestoCalc;

    // Obtener abonos para desglose contable en plantilla
    const { data: resData } = await _s.rpc('obtener_abonos_y_auditoria_seguro', {
        p_factura_id: facturaId,
        p_usuario_id: sess.id
    });
    const abonos = resData?.abonos || [];
    const totalAbonado = abonos
        .filter(a => a.estado === 'Aplicado')
        .reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
    const saldoPendiente = Math.max(0, totalCalc - totalAbonado);

    const fechaEmision = new Date(data.fecha_emision).toLocaleDateString('es-CO');

    const context = {
        numeroFactura: data.numero_factura,
        fechaEmision: fechaEmision,
        distribuidorNombre: data.distribuidor?.nombre,
        distribuidorId: data.distribuidor?.identificacion,
        colegioNombre: data.colegio?.nombre,
        colegioUbicacion: `${data.colegio?.ciudad || 'N/A'}`,
        grado: data.solicitud?.tgrados?.nombre || 'N/A',
        grupo: data.solicitud?.tgrupos?.nombre || 'N/A',
        estudiantesAutorizados: data.cantidad_estudiantes_premarcados || 0, // Solo informativo
        realCant: realCompletados,
        costoPorEstudiante: formatoMoneda(pUnit),
        subtotalReal: formatoMoneda(subtotalCalc),
        descuentoReal: formatoMoneda(descuentoCalc),
        impuestoReal: formatoMoneda(impuestoCalc),
        impuestoPorc: displayTaxPercent,
        realTotal: formatoMoneda(totalCalc),
        totalAbonadoReal: formatoMoneda(totalAbonado),
        saldoPendienteReal: formatoMoneda(saldoPendiente),
        notasAdmin: data.notas_admin || '',
        descripcion: data.descripcion || 'N/A'
    };

    await renderizarFacturaVisual('Facturacion_grupo', context, facturaId, data.id_solicitud_origen);
}

/**
 * Inyecta botones de acción para el Administrador en la vista de detalle
 */
function agregarControlesAdminFactura(facturaId) {
    if (sess.rol !== 'admin') return; // Seguridad de UI: Solo el admin ve botones de edición

    const container = document.querySelector('.no-print');
    if (!container) return;

    const adminPanel = document.createElement('div');
    adminPanel.style.display = 'flex';
    adminPanel.style.gap = '10px';
    
    adminPanel.innerHTML = `
        <button onclick="abrirEditorFactura(${facturaId})" style="padding: 10px 20px; cursor: pointer; background: var(--azul-medio); color: white; border: none; border-radius: 5px; font-weight: bold;">
            <i class="fa-solid fa-file-pen"></i> Ajuste Manual
        </button>
        <button onclick="registrarPagoFactura(${facturaId})" style="padding: 10px 20px; cursor: pointer; background: #059669; color: white; border: none; border-radius: 5px; font-weight: bold;">
            <i class="fa-solid fa-cash-register"></i> Registrar Pago/Abono
        </button>
    `;
    container.appendChild(adminPanel);
}

/**
 * Calcula de forma dinámica el total y desglose heredado de facturas legacy sin conciliar
 */
async function obtenerCalculoLegacyFactura(f) {
    let realCompletados = f.cantidad_estudiantes_completaron || 0;
    if (f.id_solicitud_origen) {
        const { data: resReal } = await _s.rpc('obtener_estudiantes_completados_solicitud_seguro', {
            p_solicitud_id: parseInt(f.id_solicitud_origen),
            p_usuario_id: sess.id
        });
        const s = resReal?.data?.data || resReal?.data || resReal || {};
        if (s.status === 'success') {
            realCompletados = s.data?.length || 0;
        } else if (Array.isArray(s)) {
            realCompletados = s.length;
        }
    }

    const { data: preciosActivos } = await _s.from('tprecios')
        .select('precio_base, precio_por_estudiante')
        .eq('estado', 'Activo')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const pBase = (f.precio_base_at_emission !== null && f.precio_base_at_emission !== undefined) ? f.precio_base_at_emission : (preciosActivos?.precio_base || 0);
    const pUnit = (f.precio_unitario_calculado !== null && f.precio_unitario_calculado !== undefined) ? f.precio_unitario_calculado : (preciosActivos?.precio_por_estudiante || 0);
    const displayTaxPercent = (f.impuesto_porcentaje_at_emission !== null && f.impuesto_porcentaje_at_emission !== undefined) ? f.impuesto_porcentaje_at_emission : 8;
    const taxRate = displayTaxPercent / 100;

    const subtotalCalc = pBase + (pUnit * realCompletados);
    const descuentoCalc = f.descuento || 0;
    const impuestoCalc = (subtotalCalc - descuentoCalc) * taxRate;
    const totalCalc = (subtotalCalc - descuentoCalc) + impuestoCalc;

    return {
        cantidadEstudiantes: realCompletados,
        precioUnitario: pUnit,
        subtotal: subtotalCalc,
        descuento: descuentoCalc,
        impuesto: impuestoCalc,
        total: totalCalc
    };
}

/**
 * Lógica para registrar abonos parciales y pagos
 */
async function registrarPagoFactura(facturaId) {
    try {
        // Cargar detalles de la factura actual de forma segura vía RPC (bypass RLS)
        const { data: res, error: fError } = await _s.rpc('obtener_detalle_factura_seguro', {
            p_factura_id: facturaId.toString().trim(),
            p_usuario_id: sess.id
        });
        if (fError || res?.status === 'error') {
            return alert("Error al cargar datos de factura: " + (fError?.message || res?.message || "Desconocido"));
        }
        const f = res.data;

        // Calcular total real de la factura (con fallback a legacy)
        let totalFactura = parseFloat(f.total_real || f.total) || 0;
        if (totalFactura === 0) {
            const calculo = await obtenerCalculoLegacyFactura(f);
            totalFactura = calculo.total;
        }

        // Obtener la sumatoria de abonos registrados aplicados
        const { data: abonos } = await _s.from('tabonos_factura').select('monto').eq('id_factura', facturaId).eq('estado', 'Aplicado');
        const totalAbonado = abonos?.reduce((acc, curr) => acc + parseFloat(curr.monto), 0) || 0;
        const saldoPendiente = Math.max(0, totalFactura - totalAbonado);

        // Asegurar carga de estilos premium
        inyectarEstilosModalesFinancieros();

        const modalHtml = `
            <div id="modalFinancialOverlay" class="modal-financial-overlay">
                <div class="modal-financial-card">
                    <h3><i class="fa-solid fa-cash-register" style="color: #10b981;"></i> Registrar Pago / Abono</h3>
                    
                    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 10px 14px; border-radius: 6px; margin-bottom: 18px; font-size: 0.85rem;">
                        <span style="color: #047857; display: block; font-weight: 600;">Saldo Pendiente:</span>
                        <strong style="font-size: 1.1rem; color: #065f46;">$${formatoMoneda(saldoPendiente)}</strong>
                    </div>

                    <div class="financial-input-group">
                        <label>Monto del Abono (COP):</label>
                        <input type="number" id="abonoMonto" value="${saldoPendiente}" min="1" step="any" required>
                    </div>

                    <div class="financial-input-group">
                        <label>Método de Pago:</label>
                        <select id="abonoMetodo">
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="CONSIGNACION">Consignación Bancaria</option>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="OTRO">Otro Método</option>
                        </select>
                    </div>

                    <div class="financial-input-group">
                        <label>Referencia de Pago / Comprobante:</label>
                        <input type="text" id="abonoReferencia" placeholder="Ej: TX-98471" required>
                    </div>

                    <div class="financial-input-group">
                        <label>Justificación / Notas de Auditoría:</label>
                        <input type="text" id="abonoMotivo" placeholder="Ej: Pago primer abono 50%" required>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                        <button class="btn-financial btn-financial-cancel" onclick="cerrarModalFinanciero()">Cancelar</button>
                        <button class="btn-financial btn-financial-submit" onclick="procesarAbonoIncremental(${facturaId})">
                            <i class="fa-solid fa-check"></i> Registrar Abono
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (err) {
        console.error("Error al abrir modal abono:", err);
    }
}

/**
 * Lógica para la conciliación manual de valores
 */
async function abrirEditorFactura(facturaId) {
    try {
        // Cargar detalles de la factura actual de forma segura vía RPC (bypass RLS)
        const { data: res, error: fError } = await _s.rpc('obtener_detalle_factura_seguro', {
            p_factura_id: facturaId.toString().trim(),
            p_usuario_id: sess.id
        });
        if (fError || res?.status === 'error') {
            return alert("Error al cargar datos de factura: " + (fError?.message || res?.message || "Desconocido"));
        }
        const f = res.data;

        // Calcular valores reales u obtener estimación legacy para autocompletar
        let cantReal = f.cantidad_estudiantes_real || f.cantidad_estudiantes || 0;
        let precioReal = f.precio_unitario_real || f.precio_unitario_calculado || 0;
        let descuentoReal = f.descuento_real || f.descuento || 0;

        if (cantReal === 0) {
            const calculo = await obtenerCalculoLegacyFactura(f);
            cantReal = calculo.cantidadEstudiantes;
            if (precioReal === 0) precioReal = calculo.precioUnitario;
        }

        inyectarEstilosModalesFinancieros();

        const modalHtml = `
            <div id="modalFinancialOverlay" class="modal-financial-overlay">
                <div class="modal-financial-card">
                    <h3><i class="fa-solid fa-file-pen" style="color: #3b82f6;"></i> Conciliar Factura</h3>

                    <div class="financial-input-group">
                        <label>Cantidad de Estudiantes Real:</label>
                        <input type="number" id="conciliaCant" value="${cantReal}" min="0">
                    </div>

                    <div class="financial-input-group">
                        <label>Precio Unitario por Alumno (COP):</label>
                        <input type="number" id="conciliaPrecio" value="${precioReal}" min="0" step="any">
                    </div>

                    <div class="financial-input-group">
                        <label>Descuento Especial (Monto en COP):</label>
                        <input type="number" id="conciliaDescuento" value="${descuentoReal}" min="0" step="any">
                    </div>

                    <div class="financial-input-group">
                        <label>Notas Administrativas:</label>
                        <textarea id="conciliaNotas" style="height: 60px; resize: none;">${f.notes_admin || f.notas_admin || ''}</textarea>
                    </div>

                    <div class="financial-input-group">
                        <label>Justificación del Ajuste (Obligatorio):</label>
                        <input type="text" id="conciliaMotivo" placeholder="Ej: Ajuste por exoneración de becas" required>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                        <button class="btn-financial btn-financial-cancel" onclick="cerrarModalFinanciero()">Cancelar</button>
                        <button class="btn-financial btn-financial-adjust" onclick="procesarConciliacionIncremental(${facturaId})">
                            <i class="fa-solid fa-floppy-disk"></i> Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (err) {
        console.error("Error al abrir modal conciliación:", err);
    }
}

/**
 * Carga el historial de abonos y la bitácora de auditoría financiera
 */
async function cargarHistorialAbonosYAuditoria(facturaId) {
    const board = document.getElementById('dynamicBoard');
    if (!board) return;

    // Crear un contenedor de auditoría y abonos que no se imprima
    let auditContainer = document.getElementById('auditAndAbonosSection');
    if (!auditContainer) {
        auditContainer = document.createElement('div');
        auditContainer.id = 'auditAndAbonosSection';
        auditContainer.className = 'no-print';
        auditContainer.style.marginTop = '30px';
        auditContainer.style.display = 'grid';
        auditContainer.style.gridTemplateColumns = '1fr';
        auditContainer.style.gap = '25px';
        board.appendChild(auditContainer);
    }

    try {
        // 1. Obtener los abonos y auditoría de forma segura vía RPC (bypass RLS)
        const { data: resData, error: rpcError } = await _s.rpc('obtener_abonos_y_auditoria_seguro', {
            p_factura_id: facturaId,
            p_usuario_id: sess.id
        });

        if (rpcError || resData?.status === 'error') {
            console.error("Error al cargar abonos y auditoría:", rpcError || resData?.message);
            return;
        }

        const abonos = resData.abonos || [];
        const auditoria = resData.auditoria || [];

        // Obtener la factura para calcular saldo pendiente real de forma segura vía RPC (bypass RLS)
        const { data: resFactura, error: resFacturaError } = await _s.rpc('obtener_detalle_factura_seguro', {
            p_factura_id: facturaId.toString().trim(),
            p_usuario_id: sess.id
        });
        if (resFacturaError || resFactura?.status === 'error') {
            console.error("Error al cargar datos de factura para balance:", resFacturaError || resFactura?.message);
            return;
        }
        const factura = resFactura.data;

        let totalAbonado = 0;
        let abonosHtml = '';

        if (abonos && abonos.length > 0) {
            totalAbonado = abonos
                .filter(a => a.estado === 'Aplicado')
                .reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

            abonosHtml = `
                <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <thead>
                        <tr style="background: #f1f5f9; color: #475569; text-align: left; font-size: 0.9rem;">
                            <th style="padding: 12px 16px;">Fecha</th>
                            <th style="padding: 12px 16px;">Monto</th>
                            <th style="padding: 12px 16px;">Método</th>
                            <th style="padding: 12px 16px;">Referencia</th>
                            <th style="padding: 12px 16px;">Estado</th>
                            ${sess.rol === 'admin' ? '<th style="padding: 12px 16px; text-align: center;">Acciones</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${abonos.map(a => {
                            const isReversado = a.estado === 'Reversado';
                            const badgeColor = isReversado ? 'background: #fee2e2; color: #ef4444;' : 'background: #d1fae5; color: #065f46;';
                            return `
                                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; color: #334155;">
                                    <td style="padding: 12px 16px;">${new Date(a.fecha_abono).toLocaleDateString('es-CO')}</td>
                                    <td style="padding: 12px 16px; font-weight: 600; ${isReversado ? 'text-decoration: line-through; color: #94a3b8;' : ''}">$${formatoMoneda(a.monto)}</td>
                                    <td style="padding: 12px 16px;"><span style="font-size: 0.8rem; background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold; color: #475569;">${a.metodo_pago}</span></td>
                                    <td style="padding: 12px 16px;">${a.referencia_pago}</td>
                                    <td style="padding: 12px 16px;"><span style="font-size: 0.8rem; padding: 4px 10px; border-radius: 9999px; font-weight: bold; ${badgeColor}">${a.estado}</span></td>
                                    ${sess.rol === 'admin' ? `
                                        <td style="padding: 12px 16px; text-align: center;">
                                            ${!isReversado ? `
                                                <button onclick="reversarAbonoFactura(${a.id}, ${facturaId})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;">
                                                    <i class="fa-solid fa-arrow-rotate-left"></i> Reversar
                                                </button>
                                            ` : `<small style="color: #94a3b8;">Reversado</small>`}
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            abonosHtml = `<p style="color: #64748b; font-style: italic; margin-top: 15px;">No se han registrado abonos parciales para esta factura.</p>`;
        }

        let totalFactura = parseFloat(factura?.total_real || factura?.total) || 0;
        if (totalFactura === 0) {
            const calculo = await obtenerCalculoLegacyFactura(factura);
            totalFactura = calculo.total;
        }
        const saldoPendiente = Math.max(0, totalFactura - totalAbonado);

        let abonosCardHtml = `
            <div class="card" style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-top: 20px;">
                <h3 style="margin-top: 0; color: #0f172a; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-cash-register" style="color: #10b981;"></i> Control de Abonos y Pagos Parciales
                </h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-top: 15px; margin-bottom: 10px;">
                    <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <span style="font-size: 0.8rem; color: #64748b; display: block; font-weight: 500;">Total Factura</span>
                        <strong style="font-size: 1.25rem; color: #0f172a; font-weight: 700;">$${formatoMoneda(totalFactura)}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <span style="font-size: 0.8rem; color: #64748b; display: block; font-weight: 500;">Total Recaudado</span>
                        <strong style="font-size: 1.25rem; color: #10b981; font-weight: 700;">$${formatoMoneda(totalAbonado)}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid ${saldoPendiente > 0 ? '#f59e0b' : '#10b981'};">
                        <span style="font-size: 0.8rem; color: #64748b; display: block; font-weight: 500;">Saldo Pendiente</span>
                        <strong style="font-size: 1.25rem; color: ${saldoPendiente > 0 ? '#d97706' : '#10b981'}; font-weight: 700;">$${formatoMoneda(saldoPendiente)}</strong>
                    </div>
                </div>

                ${abonosHtml}
            </div>
        `;

        auditContainer.innerHTML = abonosCardHtml;

        // 2. Si el usuario es Administrador, inyectar el timeline de auditoría financiera
        if (sess.rol === 'admin') {
            let auditHtml = '';
            if (auditoria && auditoria.length > 0) {
                auditHtml = `
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px; max-height: 350px; overflow-y: auto; padding-right: 8px;">
                        ${auditoria.map(log => {
                            let icon = '<i class="fa-solid fa-circle-info" style="color: #3b82f6;"></i>';
                            let bg = '#f0fdf4';
                            if (log.tipo_evento === 'CONCILIACION') {
                                icon = '<i class="fa-solid fa-sliders" style="color: #6366f1;"></i>';
                                bg = '#eff6ff';
                            } else if (log.tipo_evento === 'REVERSO_ABONO') {
                                icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>';
                                bg = '#fef2f2';
                            } else if (log.tipo_evento === 'REGISTRO_ABONO') {
                                icon = '<i class="fa-solid fa-receipt" style="color: #10b981;"></i>';
                                bg = '#ecfdf5';
                            }

                            return `
                                <div style="background: ${bg}; border-radius: 8px; padding: 12px 16px; border: 1px solid #e2e8f0; display: flex; gap: 12px; align-items: flex-start; font-size: 0.85rem;">
                                    <div style="font-size: 1.1rem; margin-top: 2px;">${icon}</div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <strong style="color: #1e293b; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">${log.tipo_evento}</strong>
                                            <span style="color: #64748b; font-size: 0.75rem;">${new Date(log.created_at).toLocaleString('es-CO')}</span>
                                        </div>
                                        <p style="margin: 0 0 6px 0; color: #475569;"><strong>Motivo:</strong> ${log.motivo}</p>
                                        <div style="display: flex; gap: 10px; font-size: 0.75rem; color: #64748b; border-top: 1px dashed rgba(0,0,0,0.05); padding-top: 4px;">
                                            <span><strong>Usuario:</strong> ${log.id_usuario_accion.substring(0, 8)}...</span>
                                            ${log.valores_nuevos?.total ? `<span><strong>Total:</strong> $${formatoMoneda(log.valores_nuevos.total)}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                auditHtml = `<p style="color: #64748b; font-style: italic; margin-top: 15px;">No hay registros de auditoría financiera para esta factura.</p>`;
            }

            const auditCardHtml = `
                <div class="card" style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0; color: #0f172a; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-shield-halved" style="color: #6366f1;"></i> Bitácora de Auditoría Financiera
                    </h3>
                    ${auditHtml}
                </div>
            `;
            auditContainer.appendChild(document.createRange().createContextualFragment(auditCardHtml));
        }

    } catch (err) {
        console.error("Error en render de abonos y auditoría:", err);
    }
}

/**
 * Reversa un abono financiero
 */
async function reversarAbonoFactura(abonoId, facturaId) {
    const motivo = prompt("Ingrese el motivo o justificación de la reversión (Obligatorio para auditoría):");
    if (motivo === null) return;
    if (motivo.trim() === "") {
        alert("La justificación es obligatoria para reversar un abono.");
        return;
    }

    try {
        const { data, error } = await _s.rpc('reversar_abono_incremental', {
            p_abono_id: abonoId,
            p_motivo: motivo.trim(),
            p_usuario_id: sess.id
        });

        if (error || data?.status === 'error') {
            alert("Error al reversar: " + (error?.message || data?.message || "Desconocido"));
        } else {
            alert("✅ Abono reversado correctamente.");
            verFacturaDetalle(facturaId);
        }
    } catch (err) {
        console.error("Error al reversar abono:", err);
        alert("Ocurrió un error inesperado al reversar.");
    }
}

/**
 * Cierra el modal financiero overlay
 */
function cerrarModalFinanciero() {
    document.getElementById('modalFinancialOverlay')?.remove();
}

/**
 * Procesa el abono mediante RPC seguro
 */
async function procesarAbonoIncremental(facturaId) {
    const monto = parseFloat(document.getElementById('abonoMonto').value);
    const metodo = document.getElementById('abonoMetodo').value;
    const referencia = document.getElementById('abonoReferencia').value.trim();
    const motivo = document.getElementById('abonoMotivo').value.trim();

    if (isNaN(monto) || monto <= 0) return alert("Por favor ingrese un monto de abono válido.");
    if (!referencia) return alert("Por favor ingrese la referencia o comprobante de pago.");
    if (!motivo) return alert("La justificación/notas de auditoría son obligatorias.");

    // Deshabilitar botón para evitar doble envío por doble clic
    const btnSubmit = document.querySelector('.btn-financial-submit');
    if (btnSubmit) {
        if (btnSubmit.disabled) return;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';
    }

    try {
        const { data, error } = await _s.rpc('registrar_abono_incremental', {
            p_factura_id: facturaId,
            p_monto: monto,
            p_metodo: metodo,
            p_referencia: referencia,
            p_usuario_id: sess.id,
            p_motivo: motivo
        });

        if (error || data?.status === 'error') {
            alert("Error al registrar abono: " + (error?.message || data?.message || "Desconocido"));
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Registrar Abono';
            }
        } else {
            alert("✅ Abono registrado con éxito.");
            cerrarModalFinanciero();
            verFacturaDetalle(facturaId);
        }
    } catch (err) {
        console.error("Error al procesar abono:", err);
        alert("Ocurrió un error inesperado al procesar.");
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Registrar Abono';
        }
    }
}

/**
 * Procesa la conciliación mediante RPC seguro
 */
async function procesarConciliacionIncremental(facturaId) {
    const cant = parseInt(document.getElementById('conciliaCant').value) || 0;
    const precio = parseFloat(document.getElementById('conciliaPrecio').value) || 0;
    const desc = parseFloat(document.getElementById('conciliaDescuento').value) || 0;
    const notas = document.getElementById('conciliaNotas').value.trim();
    const motivo = document.getElementById('conciliaMotivo').value.trim();

    if (cant < 0 || precio < 0 || desc < 0) return alert("Los valores numéricos no pueden ser negativos.");
    if (!motivo) return alert("La justificación del ajuste es estrictamente obligatoria.");

    // Deshabilitar botón para evitar doble envío por doble clic
    const btnAdjust = document.querySelector('.btn-financial-adjust');
    if (btnAdjust) {
        if (btnAdjust.disabled) return;
        btnAdjust.disabled = true;
        btnAdjust.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    }

    try {
        const { data, error } = await _s.rpc('conciliar_factura_incremental', {
            p_factura_id: facturaId,
            p_cant_real: cant,
            p_precio_real: precio,
            p_descuento_real: desc,
            p_notas: notas,
            p_usuario_id: sess.id,
            p_motivo: motivo
        });

        if (error || data?.status === 'error') {
            alert("Error al conciliar factura: " + (error?.message || data?.message || "Desconocido"));
            if (btnAdjust) {
                btnAdjust.disabled = false;
                btnAdjust.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
            }
        } else {
            alert("✅ Factura conciliada y valores ajustados correctamente.");
            cerrarModalFinanciero();
            verFacturaDetalle(facturaId);
        }
    } catch (err) {
        console.error("Error al conciliar factura:", err);
        alert("Ocurrió un error inesperado al procesar la conciliación.");
        if (btnAdjust) {
            btnAdjust.disabled = false;
            btnAdjust.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
        }
    }
}

/**
 * Inyecta dinámicamente los estilos CSS para modales financieros
 */
function inyectarEstilosModalesFinancieros() {
    if (document.getElementById('financialModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'financialModalStyles';
    style.innerHTML = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .modal-financial-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(5px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; animation: fadeIn 0.2s ease-out;
        }
        .modal-financial-card {
            background: #ffffff; border-radius: 16px; width: 500px; max-width: 90vw;
            padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
            border: 1px solid #e2e8f0; animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: 'Outfit', 'Inter', sans-serif;
        }
        .modal-financial-card h3 {
            margin-top: 0; color: #0f172a; font-size: 1.3rem; font-weight: 700; margin-bottom: 20px;
            display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;
        }
        .financial-input-group {
            margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px;
        }
        .financial-input-group label {
            font-size: 0.85rem; font-weight: 600; color: #475569; text-align: left;
        }
        .financial-input-group input, .financial-input-group select, .financial-input-group textarea {
            padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;
            color: #1e293b; transition: all 0.2s; outline: none; background: #f8fafc;
        }
        .financial-input-group input:focus, .financial-input-group select:focus, .financial-input-group textarea:focus {
            border-color: #3b82f6; background: #ffffff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .btn-financial {
            padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer;
            border: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;
        }
        .btn-financial-cancel {
            background: #e2e8f0; color: #475569;
        }
        .btn-financial-cancel:hover {
            background: #cbd5e1; color: #334155;
        }
        .btn-financial-submit {
            background: #10b981; color: white;
        }
        .btn-financial-submit:hover {
            background: #059669; transform: translateY(-1px);
        }
        .btn-financial-adjust {
            background: #3b82f6; color: white;
        }
        .btn-financial-adjust:hover {
            background: #2563eb; transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Obtiene el HTML de la lista de estudiantes para inyectar en el template
 */
async function obtenerHtmlListaEstudiantes(solicitudId) {
    if (!solicitudId) {
        return '<p>No hay solicitud asociada.</p>';
    }

    try {
        // Usamos la nueva RPC segura para saltar el RLS
        const { data: res, error } = await _s.rpc('obtener_estudiantes_completados_solicitud_seguro', {
            p_solicitud_id: parseInt(solicitudId),
            p_usuario_id: sess.id
        });

        if (error || res?.status === 'error') {
            console.error("Error cargando lista factura:", error || res);
            return '<p>Error cargando lista.</p>';
        }

        const estudiantes = res?.data?.data || res?.data || [];

        if (estudiantes.length === 0) {
            return '<p>Sin estudiantes registrados como completados.</p>';
        }

        return estudiantes.map((est, i) => {
            return `
                <div class="estudiante-item">
                    <div class="dot dot-real"></div>
                    <span class="nombre-est">${i + 1}. ${est.nombre}</span>
                    <span class="status-text" style="color: var(--acento-verde);">OK</span>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Excepción en lista factura:", e);
        return '<p>Error cargando lista.</p>';
    }
}

async function verFacturaInstitucional(colegioId) {
    // REFUERZO SEGURIDAD: Obtener facturas mediante RPC seguro para eludir el bloqueo RLS de tfacturas
    const { data: resList, error } = await _s.rpc('obtener_listado_facturas_seguro', {
        p_usuario_id: sess.id,
        p_colegio_id: parseInt(colegioId),
        p_estado: 'Emitida'
    });

    if (error || resList?.status === 'error' || !resList?.data?.length) {
        return alert('No hay facturas vigentes para este colegio.');
    }

    const listadoFacturas = resList?.data?.data || resList?.data || [];

    // Fetch current active prices for fallback
    const { data: preciosActivos } = await _s.from('tprecios')
        .select('precio_base, precio_por_estudiante')
        .eq('estado', 'Activo')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const processedFacturas = [];
    
    // Obtenemos los detalles seguros de cada factura
    for (const f of listadoFacturas) {
        const { data: resDet, error: detError } = await _s.rpc('obtener_detalle_factura_seguro', {
            p_factura_id: String(f.id),
            p_usuario_id: sess.id
        });
        
        if (detError || resDet?.status === 'error') continue;
        
        const fDetalle = resDet?.data?.data || resDet?.data || resDet || {};
        
        // REFUERZO SEGURIDAD: Obtener conteo real dinámico para cada sub-factura vía RPC
        let realCant = 0;
        if (fDetalle.id_solicitud_origen) {
            const { data: resReal } = await _s.rpc('obtener_estudiantes_completados_solicitud_seguro', {
                p_solicitud_id: parseInt(fDetalle.id_solicitud_origen),
                p_usuario_id: sess.id
            });
            realCant = resReal?.data?.length || resReal?.data?.data?.length || 0;
        }

        const pBase = parseFloat(fDetalle.precio_base_at_emission !== null && fDetalle.precio_base_at_emission !== undefined ? fDetalle.precio_base_at_emission : (preciosActivos?.precio_base || 0));
        const pUnit = parseFloat(fDetalle.precio_unitario_calculado !== null && fDetalle.precio_unitario_calculado !== undefined ? fDetalle.precio_unitario_calculado : (preciosActivos?.precio_por_estudiante || 0));
        const taxRate = (fDetalle.impuesto_porcentaje_at_emission !== null && fDetalle.impuesto_porcentaje_at_emission !== undefined ? fDetalle.impuesto_porcentaje_at_emission : 8) / 100;
        const descFlat = parseFloat(fDetalle.descuento || fDetalle.descuento_real || 0);
        
        const subtotalReal = pBase + (pUnit * realCant);
        const totalAntesDesc = subtotalReal * (1 + taxRate);
        const descConIva = descFlat * (1 + taxRate);
        const totalReal = Math.max(0, (subtotalReal - descFlat) * (1 + taxRate));
        
        processedFacturas.push({
            ...fDetalle,
            realCant,
            totalAntesDesc,
            descConIva,
            totalReal,
            totalAbonado: parseFloat(f.total_abonado || 0)
        });
    }

    if (processedFacturas.length === 0) return alert('No se pudo obtener el detail de las facturas.');

    const info = processedFacturas[0].colegio;
    const totalAntesDescConsolidado = processedFacturas.reduce((sum, f) => sum + f.totalAntesDesc, 0);
    const totalDescuentosConsolidado = processedFacturas.reduce((sum, f) => sum + f.descConIva, 0);
    const totalConsolidado = processedFacturas.reduce((sum, f) => sum + f.totalReal, 0);
    const totalEstudiantes = processedFacturas.reduce((sum, f) => sum + f.realCant, 0);
    const totalAbonadoConsolidado = processedFacturas.reduce((sum, f) => sum + f.totalAbonado, 0);
    const saldoPendienteConsolidado = Math.max(0, totalConsolidado - totalAbonadoConsolidado);

    const context = {
        numeroReferencia: `CONSOL-${new Date().getFullYear()}-${colegioId}`,
        fechaEmision: new Date().toLocaleDateString('es-CO'),
        distribuidorNombre: processedFacturas[0].distribuidor?.nombre || 'Consultor Independiente',
        colegioNombre: info?.nombre || 'Institución',
        colegioUbicacion: info?.ciudad || 'Ciudad',
        totalEstudiantes: totalEstudiantes,
        gruposAsignados: processedFacturas.length,
        pruebasAplicadas: processedFacturas.length, 
        totalAntesDescuentoConsolidado: formatoMoneda(totalAntesDescConsolidado),
        totalDescuentosConsolidado: formatoMoneda(totalDescuentosConsolidado),
        totalConsolidado: formatoMoneda(totalConsolidado),
        totalAbonadoConsolidado: formatoMoneda(totalAbonadoConsolidado),
        saldoPendienteConsolidado: formatoMoneda(saldoPendienteConsolidado),
        totalLetras: numeroALetras(saldoPendienteConsolidado),
        filasHtml: processedFacturas.map(f => `
            <tr>
                <td><strong>${f.solicitud?.tgrados?.nombre || 'N/A'} - ${f.solicitud?.tgrupos?.nombre || ''}</strong></td>
                <td>${(f.descripcion || 'Servicio evaluativo').split('-')[0]} (Ref: ${f.numero_factura || 'N/A'})</td>
                <td style="text-align: center;">${f.realCant}</td>
                <td style="text-align: right;">$${formatoMoneda(f.totalReal / (f.realCant || 1))}</td>
                <td style="text-align: right;">$${formatoMoneda(f.totalReal)}</td>
            </tr>`).join('')
    };

    await renderizarFacturaVisual('Facturacion_Institucional', context);
}

async function exportarReporteEstudiantes(facturaId, solicitudId) {
    try {
        // Similar a cargarReporteEstudiantesFactura pero para exportar
        const { data: grupo } = await _s.from('tsolicitudes_aplicacion').select('id_grupo').eq('id', solicitudId).single();
        const { data: premarcados } = await _s.from('testudiantes').select('id, nombre').eq('id_grupo', grupo.id_grupo).order('nombre');
        const { data: completados } = await _s.from('tcompletados_pruebas').select(`
            id_estudiante, timestamp_completado, testudiantes!inner(nombre)
        `).eq('id_solicitud', solicitudId).order('timestamp_completado');

        const completadosMap = new Map();
        completados?.forEach(c => completadosMap.set(c.id_estudiante, c.timestamp_completado));

        // Crear datos para Excel
        const datos = [
            ['Estudiante', 'Estado', 'Fecha Completado', 'Hora Completado']
        ];

        premarcados?.forEach(est => {
            const timestamp = completadosMap.get(est.id);
            datos.push([
                est.nombre,
                timestamp ? 'Completado' : 'No completado',
                timestamp ? new Date(timestamp).toLocaleDateString('es-CO') : '',
                timestamp ? new Date(timestamp).toLocaleTimeString('es-CO') : ''
            ]);
        });

        // Usar SheetJS para exportar
        const ws = XLSX.utils.aoa_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Estudiantes');
        XLSX.writeFile(wb, `reporte_estudiantes_factura_${facturaId}.xlsx`);

        alert('✅ Reporte exportado correctamente.');
        
    } catch (error) {
        alert('Error al exportar: ' + error.message);
    }
}

// ==========================================
// 4️⃣ REPORTES E INGRESOS
// ==========================================

async function viewReportesFacturacion() {
    document.getElementById('pageTitle').innerText = "Reportes e Ingresos";
    document.getElementById('pageDesc').innerText = "Análisis financiero por distribuidor y período.";

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <h3>Ingresos por Distribuidor</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="input-box">
                    <label>Desde</label>
                    <input type="date" id="rFechaDesde" onchange="cargarReportesFacturacion()">
                </div>
                <div class="input-box">
                    <label>Hasta</label>
                    <input type="date" id="rFechaHasta" onchange="cargarReportesFacturacion()">
                </div>
            </div>
            
            <div id="reportesContainer">Cargando...</div>
        </div>
    `;

    // Establecer fechas por defecto (últimos 30 días)
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    document.getElementById('rFechaDesde').value = hace30.toISOString().split('T')[0];
    document.getElementById('rFechaHasta').value = hoy.toISOString().split('T')[0];

    await cargarReportesFacturacion();
}

async function cargarReportesFacturacion() {
    const desde = document.getElementById('rFechaDesde')?.value;
    const hasta = document.getElementById('rFechaHasta')?.value;

    // REFUERZO SEGURIDAD: Reemplazamos la consulta directa a 'tfacturas' por el RPC seguro
    const { data: res, error } = await _s.rpc('obtener_listado_facturas_seguro', {
        p_usuario_id: sess.id,
        p_fecha_desde: desde || null,
        p_fecha_hasta: hasta || null
    });

    if (error || res?.status === 'error') {
        const errMsg = error?.message || res?.message || 'Error desconocido';
        document.getElementById('reportesContainer').innerHTML = `<p style="color: red;">Error: ${errMsg}</p>`;
        return;
    }

    const data = res.data?.data || res.data || [];

    // Agrupar por distribuidor
    const reportes = {};
    for (const f of (data || [])) {
        const distNombre = f.distribuidor_nombre || 'Desconocido';

        if (!reportes[distNombre]) {
            reportes[distNombre] = { nombre: distNombre, totalFacturado: 0, totalPagado: 0, facturas: 0 };
        }

        // Obtener detalle real de la factura (precios)
        const { data: resDet } = await _s.rpc('obtener_detalle_factura_seguro', {
            p_factura_id: String(f.id),
            p_usuario_id: sess.id
        });
        const fDet = resDet?.data?.data || resDet?.data || {};
        const pBase = parseFloat(fDet.precio_base_at_emission || 0);
        const pUnit = parseFloat(fDet.precio_unitario_calculado || 0);

        // Obtener completados reales
        let realCant = 0;
        if (f.id_solicitud_origen) {
            const { data: resReal } = await _s.rpc('obtener_estudiantes_completados_solicitud_seguro', {
                p_solicitud_id: parseInt(f.id_solicitud_origen),
                p_usuario_id: sess.id
            });
            realCant = resReal?.data?.length || resReal?.data?.data?.length || 0;
        }

        reportes[distNombre].totalFacturado += pBase + (realCant * pUnit);
        reportes[distNombre].totalPagado += parseFloat(f.total_abonado || 0);
        reportes[distNombre].facturas += 1;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Distribuidor</th>
                    <th style="text-align: right;">Facturas</th>
                    <th style="text-align: right;">Total Facturado</th>
                    <th style="text-align: right;">Pagado</th>
                    <th style="text-align: right;">Pendiente</th>
                    <th style="text-align: center;">% Pago</th>
                </tr>
            </thead>
            <tbody>
                ${Object.values(reportes).map(r => {
                    const porcentajePago = r.totalFacturado > 0 ? Math.round((r.totalPagado / r.totalFacturado) * 100) : 0;
                    const pendiente = r.totalFacturado - r.totalPagado;
                    
                    return `
                        <tr>
                            <td><strong>${r.nombre}</strong></td>
                            <td style="text-align: right;">${r.facturas}</td>
                            <td style="text-align: right; color: #667eea; font-weight: bold;">$${formatoMoneda(r.totalFacturado)}</td>
                            <td style="text-align: right; color: #10b981; font-weight: bold;">$${formatoMoneda(r.totalPagado)}</td>
                            <td style="text-align: right; color: #f59e0b; font-weight: bold;">$${formatoMoneda(pendiente)}</td>
                            <td style="text-align: center;">
                                <span class="badge ${porcentajePago >= 100 ? 'badge-success' : porcentajePago >= 50 ? 'badge-warning' : 'badge-pending'}">
                                    ${porcentajePago}%
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    const totalFacturado = Object.values(reportes).reduce((sum, r) => sum + r.totalFacturado, 0);
    const totalPagado = Object.values(reportes).reduce((sum, r) => sum + r.totalPagado, 0);

    html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <small style="color: #1e40af;">Total Facturado</small>
                <p style="margin: 5px 0; font-size: 1.5rem; font-weight: bold; color: #3b82f6;">$${formatoMoneda(totalFacturado)}</p>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <small style="color: #065f46;">Total Pagado</small>
                <p style="margin: 5px 0; font-size: 1.5rem; font-weight: bold; color: #10b981;">$${formatoMoneda(totalPagado)}</p>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <small style="color: #92400e;">Pendiente de Cobro</small>
                <p style="margin: 5px 0; font-size: 1.5rem; font-weight: bold; color: #f59e0b;">$${formatoMoneda(totalFacturado - totalPagado)}</p>
            </div>
        </div>
    ` + html;

    document.getElementById('reportesContainer').innerHTML = html;
}

// ==========================================
// 5️⃣ AUDITORÍA DE FACTURACIÓN
// ==========================================

async function viewAuditoriaFacturacion() {
    document.getElementById('pageTitle').innerText = "Auditoría de Facturación";
    document.getElementById('pageDesc').innerText = "Logs de intentos de facturación y cambios en el sistema.";

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px;">
                <div class="input-box" style="margin: 0;">
                    <label>Tipo de Acción</label>
                    <select id="aFiltroAccion" onchange="cargarAuditoriaFacturacion()">
                        <option value="">Todas</option>
                        <option value="FACTURACION_EXITOSA">Exitosa</option>
                        <option value="INTENTO_FACTURACION_FALLIDO">Fallida</option>
                    </select>
                </div>
                <div class="input-box" style="margin: 0;">
                    <label>Desde</label>
                    <input type="date" id="aFechaDesde" onchange="cargarAuditoriaFacturacion()">
                </div>
                <div class="input-box" style="margin: 0;">
                    <label>Hasta</label>
                    <input type="date" id="aFechaHasta" onchange="cargarAuditoriaFacturacion()">
                </div>
            </div>
            
            <div id="auditoriaContainer">Cargando...</div>
        </div>
    `;

    await cargarAuditoriaFacturacion();
}

async function cargarAuditoriaFacturacion() {
    const accion = document.getElementById('aFiltroAccion')?.value;
    const desde = document.getElementById('aFechaDesde')?.value;
    const hasta = document.getElementById('aFechaHasta')?.value;

    // REFUERZO SEGURIDAD: Carga de auditoría vía RPC
    // Usamos NULLIF para no enviar strings vacíos como fechas
    const { data: res, error: rpcError } = await _s.rpc('obtener_auditoria_facturacion_segura', {
        p_admin_id: String(sess.id), // Asegurar que se envía como string
        p_accion: accion || null,
        p_desde: (desde && desde !== "") ? new Date(desde).toISOString() : null,
        p_hasta: (hasta && hasta !== "") ? new Date(hasta).toISOString() : null
    });

    const data = res.data?.data || res.data || [];
    const error = rpcError || (res?.status === 'error' ? res : null);

    if (error) {
        document.getElementById('auditoriaContainer').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        document.getElementById('auditoriaContainer').innerHTML = `<p style="text-align: center; color: var(--secondary);">No hay registros de auditoría.</p>`;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fecha/Hora</th>
                    <th>ID Solicitud</th>
                    <th>Acción</th>
                    <th>Estado</th>
                    <th>Detalles</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(a => {
                    const esExitosa = a.accion.includes('EXITOSA');
                    const resultado = JSON.parse(a.resultado || '{}');
                    
                    return `
                        <tr style="background: ${esExitosa ? '#f0fdf4' : '#fef2f2'};">
                            <td>${new Date(a.timestamp).toLocaleString('es-CO')}</td>
                            <td><code>${a.id_solicitud}</code></td>
                            <td><span class="badge ${esExitosa ? 'badge-success' : 'badge-pending'}">${a.accion}</span></td>
                            <td>${resultado.status || 'N/A'}</td>
                            <td style="font-size: 0.85rem; color: var(--secondary);">
                                ${resultado.message || resultado.error_detail || 'Sin detalles'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('auditoriaContainer').innerHTML = html;
}

// ==========================================
// 6️⃣ FUNCIONES HELPER
// ==========================================

function formatoMoneda(valor) {
    return Math.round(valor).toLocaleString('es-CO');
}

function nuevaFecha() {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
}

async function cargarEstadisticasFacturacion() {
    // REFUERZO SEGURIDAD: Usamos el listado general de facturas (RPC seguro)
    // para calcular las estadísticas sin romper RLS ni debilitar políticas.
    const { data: res, error } = await _s.rpc('obtener_listado_facturas_seguro', {
        p_usuario_id: sess.id
    });

    if (error || res?.status === 'error' || !res?.data) return;

    const facturas = res?.data?.data || res?.data || [];
    const totalFacturas = facturas.length;
    let totalIngresos = 0;
    let totalPagos = 0;

    for (const f of facturas) {
        // Obtener detalle de la factura para precios reales (igual que el consolidado)
        const { data: resDet } = await _s.rpc('obtener_detalle_factura_seguro', {
            p_factura_id: String(f.id),
            p_usuario_id: sess.id
        });
        const fDet = resDet?.data?.data || resDet?.data || {};
        const pBase = parseFloat(fDet.precio_base_at_emission || 0);
        const pUnit = parseFloat(fDet.precio_unitario_calculado || 0);

        // Obtener completados reales desde tcompletados_pruebas
        let realCant = 0;
        if (f.id_solicitud_origen) {
            const { data: resReal } = await _s.rpc('obtener_estudiantes_completados_solicitud_seguro', {
                p_solicitud_id: parseInt(f.id_solicitud_origen),
                p_usuario_id: sess.id
            });
            realCant = resReal?.data?.length || resReal?.data?.data?.length || 0;
        }

        totalIngresos += pBase + (realCant * pUnit);
        totalPagos += parseFloat(f.total_abonado || 0);
    }

    const elFacturas = document.getElementById('statFacturasEmitidas');
    const elIngresos = document.getElementById('statIngresos');
    const elPagos = document.getElementById('statPagos');

    if (elFacturas) elFacturas.innerText = totalFacturas;
    if (elIngresos) elIngresos.innerText = '$' + formatoMoneda(totalIngresos);
    if (elPagos) elPagos.innerText = '$' + formatoMoneda(totalPagos);
}

function editarPrecio(precioId) {
    mostrarFormularioPrecio(precioId);
}

async function descargarFacturaPDF(facturaId) {
    alert('Función de descarga PDF en desarrollo. Por ahora puedes hacer captura de pantalla.');
}

// ==========================================
// 7️⃣ VALIDACIÓN: ESTUDIANTES QUE COMPLETARON TEST
// ==========================================

async function validarEstudiantesConTestCompletado(grupoId) {
    /**
     * Valida cuántos estudiantes en un grupo completaron la prueba
     * @param {number} grupoId - ID del grupo de estudiantes
     * @returns {Promise<Array>} Lista de estudiantes con estado de completitud
     */
    
    const { data: estudiantes, error: errorEst } = await _s
        .from('testudiantes')
        .select('id, nombre')
        .eq('id_grupo', grupoId);

    if (errorEst) {
        console.error('Error al cargar estudiantes:', errorEst);
        return [];
    }

    // Buscar solicitudes activas para este grupo
    const { data: solicitudes, error: errorSol } = await _s
        .from('tsolicitudes_aplicacion')
        .select('id')
        .eq('id_grupo', grupoId)
        .eq('estado', 'aprobada');

    if (errorSol) {
        console.error('Error al cargar solicitudes:', errorSol);
        return [];
    }

    if (!solicitudes || solicitudes.length === 0) {
        return estudiantes?.map(est => ({
            id: est.id,
            nombre: est.nombre,
            completoTest: false,
            timestamp: null
        })) || [];
    }

    // Cargar completados de todas las solicitudes activas del grupo
    const idsSolicitudes = solicitudes.map(s => s.id);
    const { data: completados, error: errorComp } = await _s
        .from('tcompletados_pruebas')
        .select('id_estudiante, timestamp_completado')
        .in('id_solicitud', idsSolicitudes);

    if (errorComp) {
        console.error('Error al cargar completados:', errorComp);
        return [];
    }

    const completadosMap = new Map();
    completados?.forEach(c => completadosMap.set(c.id_estudiante, c.timestamp_completado));

    return estudiantes?.map(est => ({
        id: est.id,
        nombre: est.nombre,
        completoTest: completadosMap.has(est.id),
        timestamp: completadosMap.get(est.id) || null
    })) || [];
}

// =====================================================
// FIN DEL MÓDULO DE FACTURACIÓN
// =====================================================
