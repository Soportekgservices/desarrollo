const TEMPLATE_PATH = 'src/templates/'; // Ruta relativa para evitar problemas de raíz en entornos locales

const AREA_TO_CODE = {
    "Administrativas y Contables": "C",
    "Ciencias de la Salud": "S",
    "Humanidades y Ciencias Sociales": "H",
    "Artes y Creatividad": "A",
    "Ingenierías y Computación": "I",
    "Defensa y Seguridad": "D",
    "Exactas y Agrarias": "E"
};

const AREA_CODE_TO_KEY = Object.fromEntries(
    Object.entries(AREA_TO_CODE).map(([key, code]) => [code, key])
);

const AREA_COLORS = {
    "C": "#1A3A5C", // Administrativas y Contables - Azul Marino
    "H": "#2B6CB0", // Humanidades y Ciencias Sociales - Azul Medio
    "A": "#9F7AEA", // Artes y Creatividad - Morado
    "S": "#38A169", // Ciencias de la Salud - Verde
    "I": "#D69E2E", // Ingenierías y Computación - Ocre
    "D": "#E53E3E", // Defensa y Seguridad - Rojo
    "E": "#3182CE"  // Exactas y Agrarias - Azul Cielo
};

const DEFAULT_AREA_INFO = {
    descripcion: "Información no disponible",
    intereses: "",
    habilidades: "",
    fortalezas: "",
    a_desarrollar: "",
    sector_laboral: "",
    carreras: []
};

const RESULT_DOMINANCE_THRESHOLD = 10;

// Las siguientes funciones fueron movidas a reports.js (cargado antes que este archivo):
// normalizeAreaCode, getAreaKeyFromCode, getAreaLabel, sortResultAreas,
// getDominantAreas, getProfileType, getVocationalLevel, generateVisuals, getNestedValue

async function fetchAreaInfos(codes) {
    if (!codes || !codes.length) return [];
    const uniqueCodes = [...new Set(codes.filter(Boolean))];
    const { data, error } = await _s.from('tareas_vocacionales').select('*').in('codigo_area', uniqueCodes);
    if (error) {
        console.error('Error loading tareas_vocacionales:', error);
        return [];
    }
    return data || [];
}

async function buildAreaInfo(areaCodes) {
    const normalized = [...new Set((areaCodes || []).map(normalizeAreaCode).filter(Boolean))];
    if (!normalized.length) return DEFAULT_AREA_INFO;

    const dbItems = await fetchAreaInfos(normalized);
    // Limpiamos posibles espacios en blanco de la base de datos (tipo character)
    const dbMap = Object.fromEntries((dbItems || []).map(item => [item.codigo_area.trim(), item]));

    const combined = normalized.map(code => {
        if (dbMap[code]) return dbMap[code];
        const key = AREA_CODE_TO_KEY[code];
        if (key && AREAS_VOCACIONALES[key]) {
            return { codigo_area: code, ...AREAS_VOCACIONALES[key] };
        }
        return null;
    }).filter(Boolean);

    if (!combined.length) return DEFAULT_AREA_INFO;
    if (combined.length === 1) return combined[0];

    return {
        // Mejoramos la legibilidad usando bloques con nombres de área y saltos de línea
        descripcion: combined.map(item => `<div class="desc-area"><strong>${getAreaLabel(item.codigo_area)}:</strong><p>${item.descripcion}</p></div>`).join(''),
        intereses: '• ' + combined.map(item => item.intereses).filter(Boolean).join(' <br>• '),
        habilidades: '• ' + combined.map(item => item.habilidades).filter(Boolean).join(' <br>• '),
        fortalezas: '• ' + combined.map(item => item.fortalezas).filter(Boolean).join(' <br>• '),
        a_desarrollar: '• ' + combined.map(item => item.a_desarrollar).filter(Boolean).join(' <br>• '),
        sector_laboral: '• ' + combined.map(item => item.sector_laboral).filter(Boolean).join(' <br>• '),
        carreras: [...new Set(combined.flatMap(item => item.carreras || []))]
    };
}

// generateVisuals movida a reports.js

// getNestedValue movida a reports.js

async function buildReportContext(resultados) {
    const sortedAreas = sortResultAreas(resultados);
    const dominantAreas = getDominantAreas(sortedAreas);
    const maxScore = sortedAreas[0]?.score || 0;
    const tipoPerfil = getProfileType(sortedAreas);
    const nivelVocacion = getVocationalLevel(maxScore);
    const dominant = dominantAreas.map(item => item.code).join(', ') || 'Sin definir';
    const dominantLabels = dominantAreas.map(item => item.label).join(' / ') || 'Sin definir';
    const dominantColor = AREA_COLORS[dominantAreas[0]?.code] || '#1A3A5C';
    const areaInfo = await buildAreaInfo(dominantAreas.map(item => item.code));
    const dominantCode = dominantAreas[0]?.code || 'C';
    const topScorePoints = Math.round((maxScore / 100) * 14);

    // Scores normalizados (0-14) para visuales
    const rawScores = {};
    sortedAreas.forEach(a => { rawScores[a.code] = Math.round((a.score / 100) * 14); });
    const visuals = generateVisuals(rawScores, dominantCode);

    // Calculamos la suma real de puntos de todas las áreas (Escala 0-98)
    const totalRawPoints = Object.values(rawScores).reduce((acc, val) => acc + val, 0);

    // Cálculos para Donas (SVG)
    const circumference = 2 * Math.PI * 40;
    const innerCircumference = 2 * Math.PI * 26;
    const donutTotalDash = Math.round((topScorePoints / 14) * circumference * 10) / 10;
    const donutAreaDash = Math.round((topScorePoints / 14) * innerCircumference * 10) / 10;

    // Tabla de resultados HTML
    const tableRowsHtml = Object.entries(rawScores).map(([code, value]) => {
        const level = value >= 10 ? 'Alto' : value >= 6 ? 'Medio' : 'Bajo';
        // Resaltamos todas las áreas dominantes que aparecen en el reporte (máximo 2)
        const rowClass = dominantAreas.some(da => da.code === code) ? 'class="area-dominante-row"' : '';
        return `<tr ${rowClass}><td style="font-weight:700; color:var(--azul-oscuro);">${code}</td><td>${getAreaLabel(code)}</td><td style="text-align:center;">${value}</td><td style="text-align:center;"><span style="color:var(--gris-suave); font-size:7.5pt;">${level}</span></td></tr>`;
    }).join('');

    const conclusionListHtml = [
        `<li><b>Fortaleza clave:</b> ${areaInfo.fortalezas || 'No especificada'}</li>`,
        `<li><b>Acción recomendada:</b> Participar en actividades relacionadas con ${escapeHtml(dominantLabels.toLowerCase())}.</li>`,
        `<li><b>Seguimiento:</b> Reevaluar al finalizar el año escolar para confirmar orientación.</li>`,
        `<li><b>Orientador:</b> Compartir resultados con familia y docentes para acompañamiento.</li>`
    ].join('');

    // Preparar colores y etiquetas para el radar (heptágono)
    const areaStyles = {};
    const codes = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];
    codes.forEach(c => {
        const isDominant = c === dominantCode;
        areaStyles[`color${c}`] = isDominant ? (AREA_COLORS[c] || '#1A3A5C') : '#4A5568';
        areaStyles[`weight${c}`] = isDominant ? '700' : '600';
        areaStyles[`label${c}`] = c + (isDominant ? ' ★' : '');
    });

    return {
        sortedAreas, dominantAreas, dominant, dominantLabels, dominantColor,
        maxScore, // Mantenemos el porcentaje (0-100)
        topScore: topScorePoints, // Puntos área dominante (0-14)
        totalRawPoints, // Suma de todos los puntos (0-98)
        tipoPerfil, nivelVocacion, areaInfo, dominantCode,
        ...rawScores, ...visuals,
        ...areaStyles,
        // Normalización de variables para la plantilla
        carrerasHtml: (Array.isArray(areaInfo.carreras) ? areaInfo.carreras : []).map(c => `<span class="carrera-tag">${escapeHtml(c)}</span>`).join(''),
        careerTags: (Array.isArray(areaInfo.carreras) ? areaInfo.carreras : []).map(c => `<span class="carrera-tag">${escapeHtml(c)}</span>`).join(''),
        interesesText: areaInfo.intereses || '',
        habilidadesText: areaInfo.habilidades || '',
        fortalezasText: areaInfo.fortalezas || '',
        aDesarrollarText: areaInfo.a_desarrollar || '',
        sectorLaboralText: areaInfo.sector_laboral || '',
        informeDescripcion: areaInfo.descripcion || '',
        tableRowsHtml,
        conclusionListHtml,
        circumference,
        innerCircumference,
        donutTotalDash,
        donutAreaDash,
        donutTotalOffset: Math.round((circumference - donutTotalDash) / 2 * 10) / 10,
        donutAreaOffset: Math.round((innerCircumference - donutAreaDash) / 2 * 10) / 10,
        percentTotal: Math.round((topScorePoints / 98) * 100),
        percentArea: Math.round((topScorePoints / 14) * 100),
        combinedProfileNote: tipoPerfil.toLowerCase() === 'combinado' ? 'Se evidencia combinación de áreas.' : 'No aplica. Diferencia clara.',
        projectionPhrase: nivelVocacion === 'Alto' ? `Alta claridad. El estudiante cuenta con un perfil ${dominantLabels.toLowerCase()} sólido.` : `Claridad moderada. El estudiante presenta un perfil ${dominantLabels.toLowerCase()} en desarrollo.`,
        vocationalSummary: nivelVocacion === 'Alto' ? 'Alta vocación confirmada' : 'Vocación en desarrollo confirmada',
        referenceTotal: 98 // El máximo total de CHASIDE es 98
    };
}

/**
 * NUEVO MOTOR DE INFORMES DINÁMICO
 * Carga plantillas HTML externas basadas en tipo_informe
 */
async function renderInforme(d, funcionVolver) {
    const tipo = (d.pruebaConfig?.tipo_informe || 'default').toLowerCase();
    const board = document.getElementById("dynamicBoard");

    // Quitamos la cuadrícula de Dashboard para que el informe fluya verticalmente
    board.classList.remove('bento-grid');

    try {
        // Cargamos la plantilla física desde la carpeta de templates
        const response = await fetch(`${TEMPLATE_PATH}${tipo}.html`);
        if (!response.ok) throw new Error(`Archivo de plantilla no encontrado: ${tipo}.html`);
        const template = await response.text();

        const context = {
            ...d,
            studentName: d.st?.nombre || 'Estudiante',
            studentId: d.st?.identificacion || d.st?.tusuario?.identificacion || 'N/A',
            gradeLabel: d.st?.tgrados?.nombre || 'N/A',
            colegioNombre: d.colegioNombre || 'N/A',
            fechaAplicacion: d.fechaActual || new Date().toLocaleDateString(),
            year: new Date().getFullYear()
        };

        board.innerHTML = renderTemplate(template, context);

        // Vincular botón de volver si existe en la plantilla
        const backBtn = document.getElementById('reportBackButton');
        if (backBtn) {
            backBtn.onclick = () => {
                board.classList.add('bento-grid'); // Restaurar grid al volver
                if (typeof funcionVolver === 'function') funcionVolver();
            };
        }
    } catch (err) {
        console.error("Error en renderInforme:", err);
        board.innerHTML = `<div class="card span-6"><h3>Error</h3><p>No se pudo cargar la plantilla "${tipo}". Verifique que exista el archivo en ${TEMPLATE_PATH}.</p></div>`;
    }
}

// Variables de configuración para motor dinámico
let tipoRespuesta = 'likert_1_5';
let logicaCalculo = 'promedio_por_area';
let activeTestMetadata = null; // Almacena metadatos para volver a ver el popup

async function viewRector() {
    document.getElementById('pageTitle').innerText = "Panel Institucional";
    document.getElementById('pageDesc').innerText = "Gestión académica y seguimiento de evaluaciones.";
    document.getElementById('roleMenu').innerHTML = `
        <li class="nav-item active" onclick="viewRector()"><i class="fa-solid fa-building"></i> Dashboard</li>
        <li class="nav-item" onclick="viewRectorPruebas()"><i class="fa-solid fa-clipboard-list"></i> Pruebas Vinculadas</li>
        <li class="nav-item" onclick="viewRectorEstudiantes()"><i class="fa-solid fa-users"></i> Estudiantes por Grado</li>
        <li class="nav-item" onclick="viewRectorInformes()"><i class="fa-solid fa-chart-bar"></i> Progreso, Informes y resultados</li>`;

    const { data: colegioData, error: colegioError } = await getRectorSchool();
    if (colegioError) {
        console.error('Error obteniendo colegio del rector:', colegioError);
        return;
    }

    if (!colegioData) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Sin Colegio Asignado</h3>
                <p style="color: var(--secondary);">Tu usuario rector aún no está vinculado a una institución. Contacta al distribuidor para asignar el colegio correspondiente.</p>
            </div>
        `;
        return;
    }

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="span-6" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
            <div class="card" style="padding: 15px; min-height: 110px;"><span class="stat-num" id="totalEstudiantes" style="font-size: 2rem;">--</span><span class="stat-desc">Estudiantes Totales</span></div>
            <div class="card" style="border-bottom: 4px solid var(--success); padding: 15px; min-height: 110px;"><span class="stat-num" id="estudiantesCompletaron" style="color: var(--success); font-size: 2rem;">--</span><span class="stat-desc">Completaron Test</span></div>
            <div class="card" style="border-bottom: 4px solid var(--accent); padding: 15px; min-height: 110px;"><span class="stat-num" id="estudiantesEnProgreso" style="color: var(--accent); font-size: 2rem;">--</span><span class="stat-desc">En Progreso</span></div>
            <div class="card" style="padding: 15px; min-height: 110px;"><span class="stat-num" id="pruebasActivas" style="font-size: 2rem;">--</span><span class="stat-desc">Pruebas Activas</span></div>
        </div>
        <div class="card span-6">
            <h3>Información Institucional</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div><h4 style="color: var(--primary); margin-bottom: 10px;">Colegio</h4><p style="margin: 5px 0;"><strong>Nombre:</strong> ${colegioData.nombre}</p><p style="margin: 5px 0;"><strong>DANE:</strong> ${colegioData.dane || 'N/A'}</p></div>
                <div><h4 style="color: var(--primary); margin-bottom: 10px;">Estado de Evaluaciones</h4><p style="margin: 5px 0;"><strong>Pruebas Activas:</strong> <span id="pruebasActivasText">Cargando...</span></p><p style="margin: 5px 0;"><strong>Resultados Habilitados:</strong> <span id="resultadosHabilitados">Cargando...</span></p></div>
            </div>
        </div>
    `;

    loadRectorStats();
    refreshNotifBadges();
}

async function loadRectorStats() {
    try {
        // REFUERZO SEGURIDAD: Carga de estadísticas institucionales vía RPC segura (p_rector_id como String)
        const { data: res, error } = await _s.rpc('obtener_estadisticas_rector_seguras', {
            p_rector_id: String(sess.id)
        });

        if (error || res.status === 'error') throw new Error(res?.message || "Error stats");
        const s = res.data?.data || res.data || res;

        if (document.getElementById('totalEstudiantes')) document.getElementById('totalEstudiantes').innerText = s.estudiantes || 0;
        if (document.getElementById('estudiantesCompletaron')) document.getElementById('estudiantesCompletaron').innerText = s.finalizados || 0;
        if (document.getElementById('estudiantesEnProgreso')) document.getElementById('estudiantesEnProgreso').innerText = s.en_proceso || 0;
        if (document.getElementById('pruebasActivas')) document.getElementById('pruebasActivas').innerText = s.pruebas || 0;
        if (document.getElementById('pruebasActivasText')) document.getElementById('pruebasActivasText').innerText = s.pruebas || 0;
        if (document.getElementById('resultadosHabilitados')) document.getElementById('resultadosHabilitados').innerText = s.resultados_habilitados ? 'Sí' : 'No';
    } catch (e) { console.error(e); }
}

async function viewRectorPruebas() {
    document.getElementById('pageTitle').innerText = "Pruebas Vinculadas";
    document.getElementById('pageDesc').innerText = "Evaluaciones activas en la institución.";
    const { data: school } = await getRectorSchool();
    if (!school) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Sin Colegio Asignado</h3>
                <p style="color: var(--secondary);">No se encontró el colegio vinculado a tu usuario rector.</p>
            </div>
        `;
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    // CORRECCIÓN RLS: La consulta directa a tsolicitudes_aplicacion con join a tgrupos
    // falla porque auth.uid()=null bloquea ambas policies. Se usa RPC SECURITY DEFINER
    // que ya existe en el sistema para este propósito.
    const { data: rpcRes, error } = await _s.rpc('fn_obtener_pruebas_rector', {
        p_rector_id: sess.id
    });

    const data = rpcRes?.data?.data || rpcRes?.data || [];

    let content = `<div class="card span-6"><h3>Pruebas Activas</h3><div id="pruebasContainer">`;

    if (error) content += `<p style="color: var(--danger);">Error cargando pruebas: ${error.message}</p>`;
    else if (!data || data.length === 0) content += `<p style="text-align: center; padding: 40px; color: var(--secondary);">No hay pruebas activas en este momento.</p>`;
    else {
        // Filtrar en cliente las que están activas hoy (la RPC devuelve todas las aprobadas)
        const activas = data.filter(s => s.fecha_inicio <= today && s.fecha_fin >= today);
        if (!activas.length) {
            content += `<p style="text-align: center; padding: 40px; color: var(--secondary);">No hay pruebas activas en este momento.</p>`;
        } else {
            content += `<table class="data-table"><thead><tr><th>Prueba</th><th>Grado</th><th>Grupo</th><th>Fecha Inicio</th><th>Fecha Fin</th></tr></thead><tbody>`;
            activas.forEach(prueba => {
                content += `<tr><td>${prueba.prueba_nombre || 'N/A'}</td><td>${prueba.grado_nombre || 'N/A'}</td><td>${prueba.grupo_nombre || 'N/A'}</td><td>${new Date(prueba.fecha_inicio).toLocaleDateString('es-ES')}</td><td>${new Date(prueba.fecha_fin).toLocaleDateString('es-ES')}</td></tr>`;
            });
            content += `</tbody></table>`;
        }
    }
    content += `</div></div>`;
    document.getElementById('dynamicBoard').innerHTML = content;
    refreshNotifBadges();
}

async function viewRectorEstudiantes() {
    document.getElementById('pageTitle').innerText = "Estudiantes por Grado";
    const { data: school } = await getRectorSchool();
    if (!school) {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6">
                <h3>Sin Colegio Asignado</h3>
                <p style="color: var(--secondary);">No se encontró el colegio vinculado a tu usuario rector.</p>
            </div>
        `;
        return;
    }
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>1. Selecciona el Grado</h3>
            </div>
            <div id="rectorGradesPicker" class="horizontal-picker"></div>
        </div>
        <div class="card span-6" id="rectorGroupCard" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>2. Selecciona el Grupo</h3>
            </div>
            <div id="rectorGroupsPicker" class="horizontal-picker"></div>
        </div>
        <div class="card span-6" id="rectorStudentCard" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 id="rectorStudentTitle">3. Estudiantes del Grupo</h3>
            </div>
            <div id="rectorStudentsTableContainer"></div>
        </div>
        <div class="card span-6" style="text-align:right; background:transparent; box-shadow:none; border:none;">
            <button class="btn-main" style="width:auto; padding:12px 30px; background:var(--secondary);" onclick="viewRector()">Volver al Dashboard</button>
        </div>
    `;
    loadRectorGrades(school.id);
}

async function loadRectorGrades(schoolId) {
    const container = document.getElementById('rectorGradesPicker');
    // REFUERZO SEGURIDAD: Obtener grados vía RPC segura (reutilizada)
    const { data: res, error } = await _s.rpc('obtener_grados_colegio_seguro', { // p_colegio_id como String
        p_colegio_id: String(schoolId)
    });

    if (error || res.status === 'error') return container.innerHTML = "Error cargando grados.";
    const uniqueGrades = res.data?.data || res.data || [];
    if (uniqueGrades.length === 0) { container.innerHTML = `<p style="color:var(--secondary); font-size:0.85rem; padding:10px; border:1px dashed #ccc; border-radius:10px; width:100%; text-align:center;">No hay grados con estudiantes en tu colegio.</p>`; return; }
    container.innerHTML = uniqueGrades.map(g => `<div class="circle-btn" id="rector-grade-${g.id}" onclick="selectRectorGrade(${g.id}, ${schoolId}, this)">${g.nombre}</div>`).join('');
}

async function selectRectorGrade(gradeId, schoolId, el) {
    document.querySelectorAll('.circle-btn').forEach(i => i.classList.remove('active')); el.classList.add('active');
    document.getElementById('rectorGroupCard').style.display = "block"; document.getElementById('rectorStudentCard').style.display = "none";
    loadRectorGroups(gradeId, schoolId);
}

async function loadRectorGroups(gradeId, schoolId) {
    const container = document.getElementById('rectorGroupsPicker');
    // REFUERZO SEGURIDAD: Usar RPC unificada para grupos del rector
    const { data: res, error } = await _s.rpc('obtener_grupos_grado_seguro', {
        p_grado_id: String(gradeId),
        p_colegio_id: String(schoolId)
    });

    if (error || res?.status === 'error') return;
    const data = res.data?.data || res.data || [];

    if (data.length === 0) { container.innerHTML = "<p style='color:var(--secondary); font-size:0.85rem;'>No hay grupos creados para este grado.</p>"; return; }
    container.innerHTML = data.map(g => `<div class="pill-btn" id="rector-group-${g.id}" onclick="selectRectorGroup(${g.id}, this)"><span>${g.nombre}</span></div>`).join('');
}

async function selectRectorGroup(groupId, el) {
    document.querySelectorAll('.pill-btn').forEach(i => i.classList.remove('active')); el.classList.add('active');
    document.getElementById('rectorStudentCard').style.display = "block"; loadRectorStudents(groupId);
}

async function loadRectorStudents(groupId) {
    const container = document.getElementById('rectorStudentsTableContainer');
    // REFUERZO SEGURIDAD: Obtener estudiantes vía RPC segura (reutilizada)
    const { data: res, error } = await _s.rpc('obtener_estudiantes_grupo_seguro', { // p_grupo_id como String
        p_grupo_id: String(groupId)
    });

    if (error || res.status === 'error') { container.innerHTML = `<p style="color: var(--danger);">Error cargando estudiantes.</p>`; return; }
    const estudiantes = res.data || [];
    if (estudiantes.length === 0) { container.innerHTML = `<p style="text-align: center; padding: 30px; color: var(--secondary);">Este grupo no tiene estudiantes cargados.</p>`; return; }
    container.innerHTML = `<table class="student-table"><thead><tr><th>Tipo</th><th>Documento</th><th>Nombre Completo</th></tr></thead><tbody>${estudiantes.map(est => `<tr><td><span class="badge" style="background:#e2e8f0; color:#475569;">${est.tusuario?.tipodoc || est.tipodoc || '—'}</span></td><td><span class="badge badge-pending" style="font-family:monospace;">${est.tusuario?.identificacion || 'S/N'}</span></td><td><strong>${est.nombre}</strong></td></tr>`).join('')}</tbody></table>`;
}

async function viewRectorInformes() {
    document.getElementById('pageTitle').innerText = "Informes y Resultados";
    document.getElementById('pageDesc').innerText = "Informes individuales y grupales.";
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Panel de Informes</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;"><div style="text-align: center; padding: 30px; border: 2px solid var(--primary); border-radius: 8px; cursor: pointer;" onclick="viewInformesIndividuales()"><i class="fa-solid fa-user" style="font-size: 3rem; color: var(--primary); margin-bottom: 15px;"></i><h4>Informes Individuales</h4><p style="color: var(--secondary); margin-top: 10px;">Ver resultados de estudiantes específicos</p></div><div style="text-align: center; padding: 30px; border: 2px solid var(--success); border-radius: 8px; cursor: pointer;" onclick="viewInformesGrupales()"><i class="fa-solid fa-users" style="font-size: 3rem; color: var(--success); margin-bottom: 15px;"></i><h4>Informes Grupales</h4><p style="color: var(--secondary); margin-top: 10px;">Análisis estadístico por grado/grupo</p></div></div></div>`;
}

async function viewInformesIndividuales(schoolId = null, schoolName = null) {
    document.getElementById('pageTitle').innerText = "Informes Individuales";
    document.getElementById('pageDesc').innerText = schoolName ? `Institución: ${schoolName}` : "Selecciona un alumno por grado para ver su informe.";

    let school;
    if (schoolId) {
        school = { id: schoolId, nombre: schoolName };
    } else {
        const { data: schoolData } = await getRectorSchool();
        school = schoolData;
    }

    if (!school) { document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Sin Colegio Asignado</h3></div>`; return; }

    // REFUERZO SEGURIDAD: Usar RPC en lugar de SELECT directo
    // Nota: Esta RPC debe modificarse en la DB para incluir estado = 'finalizada'
    const { data: rpcAssign, error: errAssign } = await _s.rpc('rpc_core_listar_pruebas_aprobadas', {
        p_colegio_id: parseInt(school.id)
    });

    const assignments = rpcAssign?.data || [];
    if (errAssign || !assignments.length) { document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Sin pruebas asignadas</h3></div>`; return; }

    const gradeMap = new Map(); const assignedGroupIds = new Set();

    assignments.forEach(assign => {
        if (!assign.id_grado) return;
        if (!gradeMap.has(assign.id_grado)) {
            gradeMap.set(assign.id_grado, { id: assign.id_grado, nombre: assign.grado_nombre || `Grado ${assign.id_grado}`, grupos: new Map() });
        }
        const gradeEntry = gradeMap.get(assign.id_grado);
        if (assign.id_grupo) {
            assignedGroupIds.add(assign.id_grupo);
            gradeEntry.grupos.set(assign.id_grupo, assign.grupo_nombre || `Grupo ${assign.id_grupo}`);
        }
    });

    const groupIds = Array.from(assignedGroupIds);

    // REFUERZO SEGURIDAD: Carga de estudiantes y completados vía RPC
    const { data: rpcEst, error: errEst } = await _s.rpc('rpc_core_listar_estudiantes', {
        p_colegio_id: parseInt(school.id)
    });

    if (errEst || rpcEst?.status === 'error') {
        console.error("Error cargando estudiantes:", errEst || rpcEst);
        alert("Error al cargar lista de estudiantes: " + (errEst?.message || rpcEst?.message));
        return;
    }

    // Obtenemos los completados de TODO el colegio para este listado global
    const { data: rpcComp, error: errComp } = await _s.rpc('obtener_estudiantes_completados_seguro', {
        p_colegio_id: parseInt(school.id)
    });

    if (errComp || rpcComp?.status === 'error') {
        console.error("Error cargando completados:", errComp || rpcComp);
        alert("Error al cargar completados: " + (errComp?.message || rpcComp?.message));
        return;
    }

    const estudiantes = rpcEst?.data?.data || rpcEst?.data || [];
    // La RPC de completados devuelve un objeto estandarizado
    const completedSet = new Set(rpcComp?.data?.data || rpcComp?.data || []);

    const studentsByGrade = new Map(); (estudiantes || []).forEach(est => { if (!studentsByGrade.has(est.id_grado)) { studentsByGrade.set(est.id_grado, []); } studentsByGrade.get(est.id_grado).push(est); });
    let content = `<div class="card span-6">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3>Estudiantes con prueba asignada</h3>
            <button class="btn-main" style="width:auto; padding:8px 20px; background:var(--secondary);" onclick="${sess.rol === 'rector' ? 'viewRectorInformes()' : `viewDistCollegeReports('${school.id}', '${school.nombre}')`}">Volver</button>
        </div>
        <div style="margin-top: 20px;">`;
    for (const [gradeId, gradeEntry] of gradeMap.entries()) {
        const gradeStudents = studentsByGrade.get(gradeId) || [];
        const assignedGroupIds = Array.from(gradeEntry.grupos.keys());
        const filteredStudents = gradeStudents.filter(s => assignedGroupIds.includes(s.id_grupo));
        const total = filteredStudents.length;
        const completed = filteredStudents.filter(s => completedSet.has(s.id)).length;
        const pending = total - completed;

        const groupDetails = Array.from(gradeEntry.grupos.entries()).map(([groupId, groupName]) => {
            const groupStudents = gradeStudents.filter(s => s.id_grupo === groupId);
            if (!groupStudents.length) return '';
            return `<div style="margin-bottom: 20px;"><h5 style="margin-bottom: 10px; color: var(--primary);">Grupo ${groupName}</h5>${groupStudents.map(st => `<div style="padding: 12px; margin-bottom: 8px; border: 1px solid #e0e0e0; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; background:#fff; ${completedSet.has(st.id) ? 'cursor:pointer;' : ''}" ${completedSet.has(st.id) ? `onclick="viewInformeEstudiante('${st.id}')"` : ''}><div><strong>${st.nombre || 'Sin nombre'}</strong><br><small style="color: var(--secondary);">${st.grado_nombre || st.tgrados?.nombre || 'Sin grado'} - ${st.grupo_nombre || st.tgrupos?.nombre || 'Sin grupo'}</small></div><span style="padding: 4px 10px; border-radius: 999px; font-size:0.8rem; ${completedSet.has(st.id) ? 'background: var(--success); color: white;' : 'background: var(--danger); color: white;'}">${completedSet.has(st.id) ? 'Completado' : 'Pendiente'}</span></div>`).join('')}</div>`;
        }).join('');

        content += `<details style="margin-bottom:18px; border:1px solid #d1d5db; border-radius:10px; overflow:hidden; background:#fff;"><summary style="padding:18px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:600; background:#f9fafb;"><span>${gradeEntry.nombre} - ${total} asignados / ${completed} completados / ${pending} pendientes</span><span style="font-size:0.9rem; color:var(--secondary);">Ver</span></summary><div style="padding:20px; border-top:1px solid #e5e7eb;">${groupDetails || '<p style="color: var(--secondary);">No hay estudiantes asignados en este grado.</p>'}</div></details>`;
    }
    document.getElementById('dynamicBoard').innerHTML = content + `</div></div>`;
}

async function viewInformeEstudiante(eid) {
    console.log("Iniciando vista de informe para ID:", eid);

    // Llamadas sincronizadas con la nueva firma de seguridad
    const { data: resData, error: rpcErr } = await _s.rpc('obtener_mi_resultado_seguro', { p_estudiante_id: eid });
    const { data: estData, error: errEst } = await _s.rpc('obtener_datos_estudiante_seguro', {
        p_estudiante_id: eid,
        p_solicitante_id: sess.id
    });

    if (rpcErr || errEst || !resData || !estData) {
        console.error("Error cargando informe:", rpcErr || errEst);
        return alert("No se pudieron cargar los datos del informe.");
    }

    // Estandarización: Obtenemos el objeto 'data' dentro de la respuesta
    const res = resData?.data?.data || resData?.data || resData || {};
    const st = estData?.data?.data || estData?.data || estData || {};

    if (!st || !res) {
        return alert("El estudiante no tiene resultados o datos vinculados.");
    }

    // EXTRAER CONFIGURACIÓN DE PRUEBA (Vital para la plantilla)
    const pruebaConfig = {
        nombre: res.prueba_nombre || 'Prueba no especificada',
        tipo_respuesta: res.tipo_respuesta,
        logica_calculo: res.logica_calculo,
        tipo_informe: res.tipo_informe
    };

    tipoRespuesta = pruebaConfig.tipo_respuesta || tipoRespuesta;
    logicaCalculo = pruebaConfig.logica_calculo || logicaCalculo;

    const resultados = JSON.parse(res.respuestas || '{}');
    const areas = Object.keys(resultados);
    const puntuaciones = areas.map(a => resultados[a]);
    const reportContext = await buildReportContext(resultados);
    const fechaActual = new Date().toLocaleDateString('es-ES');

    const datosParaInforme = {
        st: {
            ...st,
            nombre: st.nombre || 'Estudiante',
            identificacion: st.identificacion || 'N/A',
            tgrados: { nombre: st.grado_nombre || 'N/A' },
            tgrupos: { nombre: st.grupo_nombre || 'N/A' },
            tcolegios: {
                nombre: st.colegio_nombre || 'No especificado',
                tdepartamentos: { nombre: st.departamento_nombre || 'No especificado' }
            }
        },
        res,
        pruebaConfig: pruebaConfig, // Usamos la configuración extraída
        resultados,
        areas,
        puntuaciones,
        colegioNombre: st.colegio_nombre || 'No especificado',
        departamentoNombre: st.departamento_nombre || 'No especificado',
        fechaActual,
        ...reportContext
    };

    await renderInforme(datosParaInforme, () => viewInformesIndividuales(st.id_colegio, st.colegio_nombre));
}

async function viewInformesGrupales(schoolId = null, schoolName = null) {
    document.getElementById('pageTitle').innerText = "Informes Grupales";
    document.getElementById('pageDesc').innerText = schoolName || '';

    let school;
    if (schoolId) {
        school = { id: schoolId, nombre: schoolName };
    } else {
        const { data: schoolData } = await getRectorSchool();
        school = schoolData;
    }

    if (!school) {
        document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Sin Colegio Asignado</h3></div>`;
        return;
    }

    const volverFn = sess.rol === 'rector'
        ? 'viewRectorInformes()'
        : `viewDistCollegeReports('${school.id}', '${school.nombre}')`;

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6" data-school-name="${escapeHtml(school.nombre)}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Análisis por Grado</h3>
                <div style="display:flex; gap:15px; align-items:center;">
                    <div id="rectorGroupSelectorContainer"></div>
                    <button class="btn-main" style="width:auto; padding:8px 20px; background:var(--secondary);"
                        onclick="${volverFn}">Volver</button>
                </div>
            </div>
            <div id="groupReportContent">
                <p style="text-align:center; color:var(--secondary); padding:40px;">
                    Selecciona un grado para generar el informe.
                </p>
            </div>
        </div>`;

    // Usar RPC segura en lugar de consulta directa a tgrupos (bloqueada por RLS)
    const { data: res, error } = await _s.rpc('obtener_grados_colegio_seguro', {
        p_colegio_id: String(school.id)
    });

    if (error || res?.status === 'error') {
        document.getElementById('rectorGroupSelectorContainer').innerHTML =
            `<span style="color:var(--danger); font-size:0.85rem;">Error cargando grados</span>`;
        return;
    }

    const uniqueGrades = res?.data?.data || res?.data || [];

    if (!uniqueGrades.length) {
        document.getElementById('rectorGroupSelectorContainer').innerHTML =
            `<span style="color:var(--secondary); font-size:0.85rem;">Sin grados disponibles</span>`;
        return;
    }

    const options = uniqueGrades
        .map(g => `<option value="${g.id}">${escapeHtml(g.nombre)}</option>`)
        .join('');

    document.getElementById('rectorGroupSelectorContainer').innerHTML =
        `<select id="selReportGrade" class="pill-btn"
            style="width:auto; height:auto; padding:8px 15px;"
            onchange="loadGroupReportData(${school.id})">
            <option value="">Seleccionar Grado</option>
            ${options}
        </select>`;
}

async function loadGroupReportData(schoolId) {
    const sel = document.getElementById('selReportGrade');
    const gradeId = sel?.value;
    const gradeName = sel?.options[sel.selectedIndex]?.text || 'Grado';
    const container = document.getElementById('groupReportContent');
    if (!gradeId) return;

    // Obtener el nombre del colegio desde el título de la página (ya está seteado por viewInformesGrupales)
    const schoolName = document.getElementById('pageTitle')?.innerText?.replace('Informes Grupales', '').trim()
        || document.getElementById('pageDesc')?.innerText?.trim()
        || 'Institución';

    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--secondary);">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; margin-bottom:15px;"></i>
        <p>Generando informe grupal...</p>
    </div>`;

    // ── Nueva arquitectura: buildGroupReportContext → renderInforme ──────────
    const groupData = await buildGroupReportContext(
        schoolId, gradeId, gradeName,
        // Recuperar el nombre del colegio desde el atributo data guardado en el selector
        sel?.closest('[data-school-name]')?.dataset?.schoolName || schoolName
    );

    if (!groupData) {
        container.innerHTML = `<div class="card span-6" style="text-align:center; padding:40px;">
            <i class="fa-solid fa-circle-exclamation" style="font-size:2.5rem; color:var(--secondary); margin-bottom:15px;"></i>
            <h3>Sin datos disponibles</h3>
            <p style="color:var(--secondary); margin-top:10px;">
                No hay resultados finalizados para el grado seleccionado.<br>
                Verifica que los estudiantes hayan completado la prueba.
            </p>
        </div>`;
        return;
    }

    // renderInforme escribe directamente en #dynamicBoard y vincula el botón Volver
    // Necesitamos restaurar el board completo antes de renderizar
    const board = document.getElementById('dynamicBoard');
    board.classList.add('bento-grid'); // renderInforme lo quitará internamente

    // Función de volver: regresa al selector de grado
    const funcionVolver = () => {
        // Reconstruir la vista de selección de grado
        viewInformesGrupales(schoolId, groupData.institutionName);
    };

    await renderInforme(groupData, funcionVolver);
}

// exportGroupPDF eliminada — el PDF ahora se genera con window.print()
// desde el botón de la plantilla Grupal_chaside_vocacional.html

async function viewStudent() {
    document.getElementById('roleMenu').innerHTML = `<li class="nav-item active"><i class="fa-solid fa-pen-to-square"></i> Mi evaluación <span id="navBadgeStudent"></span></li><li class="nav-item" onclick="consultarResultado()" style="color: var(--success);"><i class="fa-solid fa-chart-line"></i> Consultar mi resultado</li>`;

    const idGrupo = await fetchStudentGroupId();
    if (!idGrupo) { renderStudentBlocked("Sin grupo asignado", "Tu usuario no aparece vinculado a un grupo en el sistema. Verifica que la carga masiva haya registrado tu documento correctamente o contacta a tu colegio."); return; }

    // REFUERZO SEGURIDAD: Obtener datos del grupo vía RPC segura
    const { data: rpcRes, error: rpcErr } = await _s.rpc('obtener_info_grupo_seguro', { p_grupo_id: idGrupo });
    if (rpcErr || rpcRes?.status === 'error') { renderStudentBlocked("Error en datos del grupo", "No se pudieron cargar los datos de tu colegio, grado o grupo."); return; }
    const groupData = rpcRes.data?.data || rpcRes.data || rpcRes;

    // Configurar información básica del encabezado (Colegio, Grado, Grupo) siempre visible
    document.getElementById('pageTitle').innerHTML = `Mi Prueba Vocacional - <span style="font-size: 0.7em; font-weight: 400; opacity: 0.9;">${groupData.colegio_nombre || 'Colegio'}</span>`;
    document.getElementById('pageDesc').innerText = `Grado: ${groupData.grado_nombre || ''} | Grupo: ${groupData.nombre || ''}`;

    // Asegurar visualización de herramientas de soporte y ocultar botón portada por defecto
    const tools = document.getElementById('studentHelpTools');
    if (tools) tools.style.display = 'flex';
    const btnPop = document.getElementById('btnVerBienvenida');
    if (btnPop) btnPop.style.display = 'none';

    // REFUERZO SEGURIDAD: Carga unificada de examen vía RPC para evitar bloqueos RLS y múltiples viajes
    const { data: examData, error: exErr } = await _s.rpc('obtener_examen_estudiante_seguro', {
        p_estudiante_id: String(sess.id),
        p_grupo_id: idGrupo
    });

    if (exErr || examData?.status === 'error') {
        renderStudentBlocked("Error de Acceso", "No se pudo cargar la configuración de la prueba de forma segura.");
        return;
    }

    const existingResult = examData.resultado_previo;
    const solActiva = examData.solicitud_activa;
    const qData = examData.preguntas;
    const hasPending = examData.tiene_pendientes;

    // Si el estado es "Proceso", cargamos el progreso desde la DB para continuar
    if (existingResult && existingResult.estado === 'Proceso') {
        const recovery = JSON.parse(existingResult.respuestas_raw || '{}');
        if (recovery.answers) {
            answers = recovery.answers;
            step = recovery.step || 0;
            console.log("Sistema: Progreso recuperado desde la base de datos.");
        }
    }
    else if (existingResult && existingResult.estado === 'Finalizado') {
        document.getElementById('dynamicBoard').innerHTML = `
            <div class="card span-6" style="text-align:center; padding:50px; max-width:650px; margin:40px auto; border: 2.5px solid var(--success); background: #f0fdf4;">
                <i class="fa-solid fa-circle-check" style="font-size:4.5rem; color:var(--success); margin-bottom:25px;"></i>
                <h1 style="color:var(--primary); margin-bottom:15px; font-weight:800;">¡Felicitaciones!</h1>
                <p style="font-size:1.15rem; color:var(--secondary); margin-bottom:30px; line-height:1.6;">
                    Ya has realizado tu test de evaluación vocacional satisfactoriamente.
                </p>
                <button class="btn-main" style="width:auto; padding:18px 40px; background:var(--success); font-size:1.1rem;" onclick="consultarResultado()">
                    <i class="fa-solid fa-chart-line"></i> Consultar mi resultado aquí
                </button>
            </div>`;
        refreshNotifBadges();
        return;
    }

    if (!solActiva) {
        if (hasPending) {
            renderStudentBlocked("Evaluación en revisión", "Tu institución ya envió una solicitud para aplicar la evaluación a tu grupo. Aún está pendiente de aprobación por el administrador.");
            return;
        }
        renderStudentBlocked("Evaluación no disponible por fechas", "No hay una aplicación de prueba aprobada y vigente para tu grupo hoy.");
        return;
    }

    activeTestMetadata = solActiva.metadata_prueba;
    tipoRespuesta = activeTestMetadata?.tipo_respuesta || 'likert_1_5';
    logicaCalculo = activeTestMetadata?.logica_calculo || 'promedio_por_area';
    if (!qData?.length) { renderStudentBlocked("Contenido no disponible", "La prueba asignada aún no tiene preguntas cargadas."); return; } // Originalmente en una línea

    // Complementar descripción con fechas y franja horaria de la ventana autorizada
    const formatFecha = (fechaStr) => {
        const [y, m, d] = fechaStr.split('-');
        return `${d}/${m}/${y}`;
    };
    const formatHora = (horaStr) => {
        if (!horaStr) return '';
        const [h, min] = horaStr.substring(0, 5).split(':');
        const hora = parseInt(h);
        const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
        const hora12 = hora % 12 || 12;
        return `${hora12}:${min} ${ampm}`;
    };

    let ventanaTexto;
    if (solActiva.hora_inicio && solActiva.hora_fin) {
        ventanaTexto = `del ${formatFecha(solActiva.fecha_inicio)} a las ${formatHora(solActiva.hora_inicio)} al ${formatFecha(solActiva.fecha_fin)} a las ${formatHora(solActiva.hora_fin)}`;
    } else {
        ventanaTexto = `del ${formatFecha(solActiva.fecha_inicio)} al ${formatFecha(solActiva.fecha_fin)}`;
    }
    document.getElementById('pageDesc').innerText += ` | Ventana autorizada: ${ventanaTexto}.`;

    if (btnPop) btnPop.style.display = activeTestMetadata.popup_activo ? 'block' : 'none';

    dynamicQuestions = qData;

    // Si no se recuperó progreso de la base de datos, inicializamos y buscamos en local
    if (!answers || answers.length === 0 || step === 0) {
        answers = new Array(dynamicQuestions.length).fill(null);
        step = 0;
        const savedProgress = localStorage.getItem(`autosave_${sess.id}_${solActiva.id_prueba}`);
        if (savedProgress) {
            const recovery = JSON.parse(savedProgress);
            if (confirm(`Tienes un avance guardado localmente (${Math.round((recovery.step / dynamicQuestions.length) * 100)}%). ¿Deseas continuar?`)) {
                answers = recovery.answers;
                step = recovery.step;
            }
        }
    }


    // Intercepción para Popup Dinámico
    const p = activeTestMetadata;

    // Eliminamos la restricción de sessionStorage para que el popup siempre se muestre al cargar la vista
    if (p.popup_activo && p.popup_url) {
        renderPopupModal(p);
    } else {
        renderStudentTest();
    }

    refreshNotifBadges();
}

/**
 * Renderiza el modal informativo antes de iniciar la prueba
 */
function renderPopupModal(prueba) {
    const board = document.getElementById('dynamicBoard');

    let contentHtml = '';
    if (prueba.popup_tipo === 'imagen') {
        contentHtml = `<img src="${prueba.popup_url}" class="modal-img-fluid" onerror="this.parentElement.innerHTML='<p>Error al cargar la imagen informativa.</p>'">`;
    } else {
        contentHtml = `<iframe src="${prueba.popup_url}" class="test-modal-iframe"></iframe>`;
    }

    // El modal ahora se inyecta directamente al body para evitar recortes de contenedores padres
    const modal = document.createElement('div');
    modal.id = 'activeTestModal';
    modal.className = 'test-modal-overlay';
    modal.innerHTML = `
            <div class="test-modal-content">
                <div class="test-modal-body">
                    ${contentHtml}
                </div>
                <div class="test-modal-footer">
                    <button class="btn-main" onclick="closePopupAndStart(${prueba.id})">
                        CONTINUAR A LA PRUEBA <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Permite al estudiante volver a observar la ventana de bienvenida
 */
function showWelcomeAgain() {
    if (activeTestMetadata) renderPopupModal(activeTestMetadata);
}

/**
 * Cierra la ventana emergente y lanza el motor de preguntas
 */
function closePopupAndStart(pruebaId) {
    const modal = document.getElementById('activeTestModal');
    if (modal) modal.remove();
    renderStudentTest();
}

function renderOpciones(pregunta, tipo) {
    if (tipo === 'si_no') {
        return `
            <div class="si-no-container" style="display:flex; gap:15px; margin-top:15px;">
                <button class="btn-main" style="width: 120px; flex: none; background: var(--primary); opacity: ${answers[step] === null || answers[step] === 1 ? '1' : '0.4'};" onclick="setR(1)">Sí</button>
                <button class="btn-main" style="width: 120px; flex: none; background: var(--primary); opacity: ${answers[step] === null || answers[step] === 0 ? '1' : '0.4'};" onclick="setR(0)">No</button>
            </div>
        `;
    }

    let html = '';

    for (let i = 1; i <= 5; i++) {
        const text = pregunta[`opt${i}`];

        if (text && text.trim() !== "") {
            html += `
                <div class="likert-option">
                    <input type="radio" name="qs" id="o${i}" ${answers[step] === i ? 'checked' : ''} onclick="setR(${i})">
                    <label for="o${i}">${text}</label>
                </div>
            `;
        }
    }

    return html;
}

function renderStudentTest() {
    const q = dynamicQuestions[step];
    const progress = Math.round((step / dynamicQuestions.length) * 100);
    const optsHtml = renderOpciones(q, tipoRespuesta);

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="span-6 test-container">
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>

            <div class="question-card">
                <span style="font-weight:700; color:var(--accent);">
                    PREGUNTA ${q.num_pregunta} DE ${dynamicQuestions.length}
                </span>

                <h2 style="margin-top:10px;">${q.enunciado}</h2>

                <div class="likert">
                    ${optsHtml}
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button class="btn-main" style="width:160px; background:var(--secondary);" onclick="nav(-1)" ${step === 0 ? 'disabled' : ''}>
                    Anterior
                </button>

                ${step < dynamicQuestions.length - 1
            ? `<button class="btn-main" style="width:160px;" onclick="nav(1)">Siguiente</button>`
            : `<button class="btn-main" style="width:180px; background:var(--success);" onclick="finish()">Finalizar</button>`
        }
            </div>
        </div>
    `;
}

function setR(v) {
    answers[step] = v;

    // Guardar progreso localmente en cada respuesta
    localStorage.setItem(`autosave_${sess.id}_${dynamicQuestions[0].id_prueba}`, JSON.stringify({
        step: step,
        answers: answers
    }));

    // Autoguardado en Base de Datos cada 15 preguntas para asegurar persistencia remota
    if ((step + 1) % 15 === 0) {
        syncProgressToDB();
    }

    setTimeout(() => {
        if (step < dynamicQuestions.length - 1) nav(1);
        else renderStudentTest();
    }, 300);
}

/**
 * Guarda el progreso actual en la BD con estado 'En Proceso'.
 * Se llama cada 15 preguntas desde setR().
 * Falla silenciosamente para no interrumpir al estudiante.
 * Al recuperar sesión desde otro dispositivo, obtener_examen_estudiante_seguro
 * devuelve este registro y viewStudent() restaura step y answers.
 */
async function syncProgressToDB() {
    if (!dynamicQuestions?.length || !sess?.id) return;
    const prueba_id = dynamicQuestions[0]?.id_prueba;
    if (!prueba_id) return;
    try {
        await _s.rpc('guardar_progreso_estudiante_seguro', {
            p_estudiante_id: String(sess.id),
            p_prueba_id: prueba_id,
            p_total_preg: dynamicQuestions.length,
            p_respuestas: '{}',
            p_respuestas_raw: JSON.stringify({ step, answers }),
            p_estado: 'En Proceso'
        });
    } catch (e) {
        console.warn('syncProgressToDB:', e?.message);
    }
}

function nav(d) {
    if (d > 0 && answers[step] === null) return alert("Elige una respuesta.");
    step += d;
    window.scrollTo(0, 0); renderStudentTest();
}

async function finish() {
    if (answers.includes(null)) return alert("Completa todas las preguntas.");

    const resultadosPorArea = {};
    dynamicQuestions.forEach((q, index) => {
        const areaCode = normalizeAreaCode(q.area) || String(q.area).trim();
        if (!areaCode) return;

        if (!resultadosPorArea[areaCode]) {
            resultadosPorArea[areaCode] = { suma: 0, total: 0 };
        }

        const value = Number(answers[index]);
        if (Number.isFinite(value)) {
            resultadosPorArea[areaCode].suma += value;
            resultadosPorArea[areaCode].total += 1;
        }
    });

    const escalaMax = tipoRespuesta === 'si_no' ? 1 : 5;
    const resultadosFinales = {};

    Object.entries(resultadosPorArea).forEach(([areaCode, { suma, total }]) => {
        if (logicaCalculo === 'conteo') {
            resultadosFinales[areaCode] = total > 0 ? Math.round((suma / total) * 100) : 0;
        } else {
            resultadosFinales[areaCode] = total > 0 ? Math.round((suma / (total * escalaMax)) * 100) : 0;
        }
    });

    // REFUERZO SEGURIDAD: Registro via RPC segura
    const { data: res, error } = await _s.rpc('registrar_resultado_seguro', {
        p_estudiante_id: String(sess.id),
        p_prueba_id: dynamicQuestions[0]?.id_prueba,
        p_total_preg: dynamicQuestions.length,
        p_respuestas: JSON.stringify(resultadosFinales),
        p_respuestas_raw: JSON.stringify({ step, answers }),
        p_estado: 'Finalizado'
    });

    if (error || res?.status === 'error') {
        alert("Error al enviar: " + (error?.message || res?.message));
    } else {
        // Limpiar autoguardado al finalizar con éxito
        localStorage.removeItem(`autosave_${sess.id}_${dynamicQuestions[0].id_prueba}`);
        alert("¡Test Finalizado! Tus respuestas han sido enviadas correctamente.");
        viewStudent();
    }
}

async function consultarResultado() {
    // 1. Obtener el resultado de forma segura vía RPC (Bypassa RLS)
    const { data: rpcRes, error: rpcErr } = await _s.rpc('obtener_mi_resultado_seguro', {
        p_estudiante_id: String(sess.id)
    });

    if (rpcErr || rpcRes?.status === 'error' || !rpcRes?.data) {
        return alert("Aún no has completado ninguna evaluación.");
    }

    const data = rpcRes?.data?.data || rpcRes?.data || rpcRes || {};
    const resInfo = { id_prueba: data.id_prueba };

    // 2. Obtener datos de la ficha académica de forma segura
    const { data: rpcEst, error: errEst } = await _s.rpc('obtener_datos_estudiante_seguro', {
        p_estudiante_id: sess.id,
        p_solicitante_id: sess.id  // El estudiante consulta sus propios datos
    });

    if (errEst || rpcEst?.status === 'error' || !rpcEst?.data) {
        return alert("No se pudo obtener la información de tu grupo.");
    }
    const stData = rpcEst?.data?.data || rpcEst?.data || rpcEst || {};

    // 3. Obtener visibilidad desde la SOLICITUD (Intentar RPC si falla el select)
    const { data: solData, error: solError } = await _s.from('tsolicitudes_aplicacion')
        .select('resultados_habilitados, resultados_fecha_inicio, resultados_fecha_fin')
        .eq('id_grupo', stData.id_grupo)
        .eq('id_prueba', resInfo.id_prueba)
        .eq('estado', 'aprobada')
        .maybeSingle();

    if (solError) {
        console.error("Error al consultar permisos de resultados:", solError);
        return alert("Error al verificar permisos. Intenta de nuevo en unos minutos.");
    }

    const canBypass = (sess.rol === 'admin' || sess.rol === 'distribuidor');
    const sol = solData;
    const today = new Date().toISOString().split('T')[0];

    // 4. Lógica de Validación de Fechas y Habilitación
    let permitido = false;

    if (canBypass) permitido = true;
    // Prioridad 1: Prórroga individual activa
    else if (stData.acceso_resultados_hasta && new Date(stData.acceso_resultados_hasta) > new Date()) permitido = true;
    // Prioridad 2: Rango de la solicitud aprobada
    else if (sol?.resultados_habilitados && sol.resultados_fecha_inicio <= today && sol.resultados_fecha_fin >= today) permitido = true;

    if (!permitido) {
        return alert("Los resultados no están disponibles en este momento.\n\n" +
            (sol?.resultados_fecha_inicio ? `Estarán habilitados del ${sol.resultados_fecha_inicio} al ${sol.resultados_fecha_fin}` : "Consulta con tu institución la fecha de publicación de resultados."));
    }

    // Ya tenemos 'data' definido arriba vía rpcRes.data

    const resultados = JSON.parse(data.respuestas || '{}');
    const areas = Object.keys(resultados);
    const puntuaciones = areas.map(area => resultados[area]);

    const { data: st } = await _s.from('testudiantes').select('*, tcolegios(nombre, ciudad, tdepartamentos(nombre)), tgrados(nombre), tgrupos(nombre), tusuario(identificacion)').eq('id', sess.id).single();

    // Asegurar que el encabezado y soporte sean visibles al consultar resultados
    const tools = document.getElementById('studentHelpTools');
    if (tools) tools.style.display = 'flex';
    document.getElementById('pageTitle').innerHTML = `Mi Prueba Vocacional - <span style="font-size: 0.7em; font-weight: 400; opacity: 0.9;">${st?.tcolegios?.nombre || 'Colegio'}</span>`;
    document.getElementById('pageDesc').innerText = `Grado: ${st?.tgrados?.nombre || ''} | Grupo: ${st?.tgrupos?.nombre || ''}`;
    const btnPop = document.getElementById('btnVerBienvenida');
    if (btnPop) btnPop.style.display = 'none';

    tipoRespuesta = data.tpruebas?.tipo_respuesta || tipoRespuesta;
    logicaCalculo = data.tpruebas?.logica_calculo || logicaCalculo;

    const reportContext = await buildReportContext(resultados);

    const colegioNombre = st?.tcolegios?.nombre || 'No especificado';
    const departamentoNombre = st?.tcolegios?.tdepartamentos?.nombre || 'No especificado';
    const fechaActual = new Date().toLocaleDateString('es-ES');

    const datosParaInforme = {
        st,
        data,
        pruebaConfig: data.tpruebas,
        resultados,
        areas,
        puntuaciones,
        colegioNombre,
        departamentoNombre,
        fechaActual,
        ...reportContext
    };

    await renderInforme(datosParaInforme, () => viewStudent());
}

// escapeHtml movida a reports.js
// renderTemplate movida a reports.js