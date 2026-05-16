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
        if (facturaId && nombreTemplate === 'Facturacion_grupo') agregarControlesAdminFactura(facturaId);

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
                <button class="btn-main" onclick="mostrarFormularioPrecio()" style="width: auto;">+ Nuevo Precio</button>
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
                                <button class="btn-main" style="padding: 6px 12px; background: var(--danger);" onclick="cambiarEstatusoPrecio(${p.id}, '${p.estado}')">
                                    <i class="fa-solid fa-${p.estado === 'Activo' ? 'ban' : 'check'}"></i>
                                </button>
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
        const { data } = await _s.from('tprecios').select('*').eq('id', precioId).single();
        precioData = data;
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
    if (precioId !== 'null' && precioId !== null) {
        result = await _s.from('tprecios').update(datos).eq('id', precioId);
    } else {
        result = await _s.from('tprecios').insert(datos);
    }

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
 * Lógica para registrar pago o abono
 */
async function registrarPagoFactura(facturaId) {
    const ref = prompt("Ingrese referencia de pago o detalle de abono:");
    if (ref === null) return;

    const confirmacion = confirm("¿Desea marcar esta factura como PAGADA totalmente?");
    
    const updates = {
        referencia_pago: ref,
        pagada: confirmacion,
        fecha_pago: confirmacion ? new Date().toISOString().split('T')[0] : null
    };

    const { error } = await _s.from('tfacturas').update(updates).eq('id', facturaId);
    
    if (error) alert("Error al registrar: " + error.message);
    else {
        alert("Información de pago actualizada.");
        verFacturaDetalle(facturaId);
    }
}

/**
 * Lógica para edición manual de valores (Cierre de evaluación)
 */
async function abrirEditorFactura(facturaId) {
    const { data } = await _s.from('tfacturas').select('*').eq('id', facturaId).single();
    
    const nuevaCant = prompt("Cantidad real de estudiantes a facturar:", data.cantidad_estudiantes);
    if (nuevaCant === null) return;
    
    const nuevoPrecio = prompt("Precio unitario por estudiante (COP):", data.precio_unitario_calculado);
    if (nuevoPrecio === null) return;

    const nuevoDescuento = prompt("Valor del descuento a asignar (Monto en COP):", data.descuento || "0");
    if (nuevoDescuento === null) return;

    const notas = prompt("Notas administrativas sobre este ajuste:", data.notas_admin || "");
    
    const cant = parseInt(nuevaCant) || 0;
    const prec = parseFloat(nuevoPrecio) || 0;
    const desc = parseFloat(nuevoDescuento) || 0;
    const pBase = parseFloat(data.precio_base_at_emission) || 0;
    const porcImp = (parseFloat(data.impuesto_porcentaje_at_emission) || 0) / 100;

    const subtotal = Math.round((pBase + (cant * prec)) * 100) / 100;
    const imp = Math.round(((subtotal - desc) * porcImp) * 100) / 100;
    const total = Math.round(((subtotal - desc) + imp) * 100) / 100;

    if (confirm(`Nuevo Total Calculado: $${formatoMoneda(total)}\n¿Confirmar cambios?`)) {
        const { error } = await _s.from('tfacturas').update({
            cantidad_estudiantes_real: cant,
            precio_unitario_real: prec,
            subtotal_real: subtotal,
            descuento_real: desc,
            impuesto_real: imp,
            total_real: total,
            // Actualizar campos finales
            subtotal: subtotal,
            descuento: desc,
            impuesto: imp,
            total: total,
            cantidad_estudiantes: cant,
            notas_admin: notas,
            updated_at: new Date().toISOString()
        }).eq('id', facturaId);

        if (error) alert("Error al actualizar: " + error.message);
        else {
            alert("Factura ajustada correctamente.");
            verFacturaDetalle(facturaId);
        }
    }
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

        const pBase = parseFloat(fDetalle.precio_base_at_emission !== null ? fDetalle.precio_base_at_emission : (preciosActivos?.precio_base || 0));
        const pUnit = parseFloat(fDetalle.precio_unitario_calculado !== null ? fDetalle.precio_unitario_calculado : (preciosActivos?.precio_por_estudiante || 0));
        const taxRate = (fDetalle.impuesto_porcentaje_at_emission !== null ? fDetalle.impuesto_porcentaje_at_emission : 0) / 100;
        
        const subtotalReal = pBase + (pUnit * realCant);
        const totalReal = subtotalReal + (subtotalReal * taxRate);
        
        processedFacturas.push({
            ...fDetalle,
            realCant,
            totalReal
        });
    }

    if (processedFacturas.length === 0) return alert('No se pudo obtener el detalle de las facturas.');

    const info = processedFacturas[0].colegio;
    const totalConsolidado = processedFacturas.reduce((sum, f) => sum + f.totalReal, 0);
    const totalEstudiantes = processedFacturas.reduce((sum, f) => sum + f.realCant, 0);

    const context = {
        numeroReferencia: `CONSOL-${new Date().getFullYear()}-${colegioId}`,
        fechaEmision: new Date().toLocaleDateString('es-CO'),
        distribuidorNombre: processedFacturas[0].distribuidor?.nombre || 'Consultor Independiente',
        colegioNombre: info?.nombre || 'Institución',
        colegioUbicacion: info?.ciudad || 'Ciudad',
        totalEstudiantes: totalEstudiantes,
        gruposAsignados: processedFacturas.length,
        pruebasAplicadas: processedFacturas.length, 
        totalConsolidado: formatoMoneda(totalConsolidado),
        totalLetras: numeroALetras(totalConsolidado),
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
    data?.forEach(f => {
        // El RPC retorna el nombre del distribuidor directamente como 'distribuidor_nombre'
        const distNombre = f.distribuidor_nombre || 'Desconocido';
        const distId = distNombre; // Usamos el nombre como clave de agrupación
        
        if (!reportes[distId]) {
            reportes[distId] = {
                nombre: distNombre,
                totalFacturado: 0,
                totalPagado: 0,
                facturas: 0
            };
        }
        reportes[distId].totalFacturado += parseFloat(f.total || 0);
        if (f.pagada) reportes[distId].totalPagado += parseFloat(f.total || 0);
        reportes[distId].facturas += 1;
    });

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

    facturas.forEach(f => {
        const monto = parseFloat(f.total || 0);
        totalIngresos += monto;
        if (f.pagada) {
            totalPagos += monto;
        }
    });

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
