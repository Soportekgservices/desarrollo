// =============================================================================
// reports.js — Motor de Informes Reutilizable — Edueficiente
// =============================================================================
// FASE 2: Implementación completa de funciones grupales.
// Las funciones copiadas de test.js SIGUEN existiendo en test.js también.
// Duplicación intencional hasta validación completa (Fase 3 limpiará test.js).
//
// DEPENDENCIAS EXTERNAS (deben cargarse antes que este archivo):
//   - _s               : cliente Supabase  (supabaseClient.js)
//   - sess             : sesión activa      (auth.js)
//   - AREAS_VOCACIONALES : fallback de áreas (utils.js)
//   - AREA_TO_CODE, AREA_CODE_TO_KEY, AREA_COLORS, DEFAULT_AREA_INFO,
//     RESULT_DOMINANCE_THRESHOLD : constantes globales declaradas en test.js
// =============================================================================


// =============================================================================
// SECCIÓN 2 — UTILIDADES DE TEXTO  (copiadas de test.js, sin modificar)
// =============================================================================

/** Escapa caracteres HTML especiales. COPIA EXACTA de test.js. */
function escapeHtml(value) {
    const text = value == null ? '' : String(value);
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Obtiene valor anidado por ruta de puntos. COPIA EXACTA de test.js. */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Motor de plantillas: reemplaza {{{ }}} (HTML crudo) y {{ }} (texto escapado).
 * COPIA EXACTA de test.js.
 */
function renderTemplate(template, data) {
    return template
        .replace(/{{{\s*([\w.]+)\s*}}}/g, (_, path) => {
            const val = getNestedValue(data, path);
            return val == null ? '' : String(val);
        })
        .replace(/{{\s*([\w.]+)\s*}}/g, (_, path) => {
            const val = getNestedValue(data, path);
            return escapeHtml(val);
        });
}


// =============================================================================
// SECCIÓN 3 — UTILIDADES DE ÁREAS VOCACIONALES  (copiadas de test.js)
// =============================================================================

/** Normaliza área a código de una letra. COPIA EXACTA de test.js. */
function normalizeAreaCode(area) {
    if (!area) return null;
    const raw = String(area).trim();
    if (AREA_CODE_TO_KEY[raw]) return raw;
    if (AREA_TO_CODE[raw]) return AREA_TO_CODE[raw];
    const upper = raw.toUpperCase();
    if (AREA_CODE_TO_KEY[upper]) return upper;
    return Object.keys(AREA_TO_CODE).find(key => key.toLowerCase() === raw.toLowerCase()) || null;
}

/** Nombre completo del área desde su código. COPIA EXACTA de test.js. */
function getAreaKeyFromCode(code) {
    return AREA_CODE_TO_KEY[code] || code;
}

/** Alias de getAreaKeyFromCode. COPIA EXACTA de test.js. */
function getAreaLabel(code) {
    return getAreaKeyFromCode(code);
}

/** Ordena áreas de mayor a menor score. COPIA EXACTA de test.js. */
function sortResultAreas(resultados) {
    return Object.entries(resultados || {}).map(([area, value]) => {
        const code = normalizeAreaCode(area) || String(area).trim();
        return { code, label: getAreaLabel(code), score: Number(value) || 0 };
    }).sort((a, b) => b.score - a.score);
}

/** Determina áreas dominantes (máx. 2). COPIA EXACTA de test.js. */
function getDominantAreas(sortedAreas) {
    if (!sortedAreas.length) return [];
    const topScore = sortedAreas[0].score;
    const winners = sortedAreas.filter(a => topScore - a.score <= RESULT_DOMINANCE_THRESHOLD && a.score > 0);
    return winners.length ? winners.slice(0, 2) : [sortedAreas[0]];
}

/** Perfil 'Simple' o 'Combinado'. COPIA EXACTA de test.js. */
function getProfileType(sortedAreas) {
    if (!sortedAreas.length) return 'Sin definir';
    const top = sortedAreas[0].score;
    const second = sortedAreas[1]?.score || 0;
    return (top - second) < RESULT_DOMINANCE_THRESHOLD ? 'Combinado' : 'Simple';
}

/** Nivel vocacional 'Alto' / 'Medio' / 'Bajo'. COPIA EXACTA de test.js. */
function getVocationalLevel(score) {
    if (score >= 75) return 'Alto';
    if (score > 45) return 'Medio';
    return 'Bajo';
}


// =============================================================================
// SECCIÓN 4 — GENERACIÓN DE VISUALES SVG  (copiada de test.js)
// =============================================================================

/**
 * Genera barras SVG + radar SVG para plantillas de informe.
 * Recibe scores en escala 0-14. COPIA EXACTA de test.js.
 * @param {Object} scores       - { C: n, H: n, A: n, S: n, I: n, D: n, E: n } escala 0-14
 * @param {string} dominantCode - Código del área dominante ('A', 'C', etc.)
 * @returns {{ barSvg: string, radarPoints: string, radarDots: string }}
 */
function generateVisuals(scores, dominantCode) {
    const barPositions = [30, 74, 118, 162, 206, 250, 294];
    const codes = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];

    const barSvg = codes.map((code, index) => {
        const value = scores[code] || 0;
        const height = Math.round((value / 14) * 200);
        const y = 220 - height;
        const isDominant = code === dominantCode;
        const color = AREA_COLORS[code] || '#A0B9CF';
        const labelColor = isDominant ? color : '#2D3748';
        return `<rect x="${barPositions[index]}" y="${y}" width="34" height="${height}" fill="${color}" fill-opacity="${isDominant ? '1' : '0.3'}" rx="2"/>
                <text x="${barPositions[index] + 17}" y="${y - 4}" text-anchor="middle" font-size="10" fill="${labelColor}" font-weight="700">${value}</text>
                <text x="${barPositions[index] + 17}" y="233" text-anchor="middle" font-size="9" fill="${labelColor}" font-weight="600">${code}</text>`;
    }).join('');

    const maxRadius = 110;
    const radarPositions = { C: -90, H: -38.57, A: 12.28, S: 63.14, I: 114, D: 164.85, E: 215.71 };
    const chartPoints = Object.entries(radarPositions).map(([code, angle]) => {
        const radius = ((scores[code] || 0) / 14) * maxRadius;
        const rad = (angle * Math.PI) / 180;
        return { x: 175 + Math.cos(rad) * radius, y: 145 + Math.sin(rad) * radius, code };
    });

    const radarPoints = chartPoints.map(p => `${p.x},${p.y}`).join(' ');
    const radarDots = chartPoints.map(p => {
        const isDominant = p.code === dominantCode;
        const color = AREA_COLORS[p.code] || '#2563A8';
        return `<circle cx="${p.x}" cy="${p.y}" r="${isDominant ? 4 : 2.5}" fill="${color}" fill-opacity="${isDominant ? '1' : '0.6'}"/>`;
    }).join('');

    return { barSvg, radarPoints, radarDots };
}


// =============================================================================
// SECCIÓN 5 — GENERADORES PUROS PARA INFORME GRUPAL  (nuevos en Fase 2)
// Todas las funciones de esta sección son PURAS: sin DOM, sin async, sin _s.
// =============================================================================

/**
 * Genera los textos interpretativos del informe grupal.
 * Función PURA. Sin DOM, sin async, sin _s.
 *
 * @param {Object} stats
 * @param {string} stats.topAreaLabel   - Nombre completo del área dominante
 * @param {string} stats.dominantCode   - Código del área dominante ('A', 'C', etc.)
 * @param {number} stats.population     - Total de estudiantes evaluados
 * @param {number} stats.riskPercent    - % de estudiantes con baja claridad
 * @param {number} stats.avgScore       - Promedio total grupal (sobre 98)
 * @param {string} stats.maturityLabel  - 'Alta' | 'Media' | 'En Desarrollo'
 * @param {string} stats.tipoPerfil     - 'Simple' | 'Combinado'
 * @param {Object} stats.areaInfo       - Objeto de buildAreaInfo (intereses, fortalezas, etc.)
 * @param {Object} stats.interestLevels - { Alto: n, Medio: n, Bajo: n }
 * @returns {Object} Siete strings de texto para los placeholders de la plantilla grupal
 */
function generateGroupTexts(stats) {
    const {
        topAreaLabel, dominantCode, population, riskPercent,
        avgScore, maturityLabel, tipoPerfil, tipoCohorte,
        tienePerfilesCombinados = false, pctPerfilesCombinados = 0,
        areaInfo, interestLevels,
        highVocPercent = 0, midVocPercent = 0, lowVocPercent = 0,
        dominantCohesionPercent = 0
    } = stats;

    const areaEsc = escapeHtml(topAreaLabel || 'Sin definir');
    // Limpiar punto final de los campos de areaInfo para evitar puntos dobles en el texto
    const interesesEsc = escapeHtml((areaInfo?.intereses || 'diversas áreas del conocimiento').replace(/\.\s*$/, ''));
    const fortalezasEsc = escapeHtml((areaInfo?.fortalezas || 'habilidades en desarrollo').replace(/\.\s*$/, ''));
    const sectorEsc = escapeHtml((areaInfo?.sector_laboral || 'múltiples sectores productivos').replace(/\.\s*$/, ''));
    const alto = interestLevels?.Alto || 0;
    const medio = interestLevels?.Medio || 0;
    const bajo = interestLevels?.Bajo || 0;

    // ── Resumen ejecutivo ────────────────────────────────────────────────────
    // Enfoque: cohesión con área dominante + distribución de niveles.
    // El promedio grupal NO es el protagonista narrativo.
    const executiveSummary =
        `El análisis vocacional del grupo evidencia una tendencia predominante hacia el área de ` +
        `<strong>${areaEsc}</strong>. El <strong>${dominantCohesionPercent}%</strong> de los ` +
        `<strong>${population}</strong> estudiantes evaluados coincide con esta área dominante, ` +
        `reflejando una cohorte <strong>${escapeHtml(tipoCohorte || 'con tendencia definida')}</strong>. ` +
        `En cuanto a la claridad vocacional individual: el <strong>${highVocPercent}%</strong> ` +
        `presenta alta claridad, el <strong>${midVocPercent}%</strong> mantiene intereses en ` +
        `consolidación` +
        (lowVocPercent > 0
            ? ` y el <strong>${lowVocPercent}%</strong> requiere acompañamiento para fortalecer su definición vocacional`
            : '') +
        `. El perfil grupal es de tipo <strong>${escapeHtml(tipoPerfil)}</strong>.`;

    // ── Lectura institucional ────────────────────────────────────────────────
    // Usa el nivel vocacional real (maturityLabel) sin texto genérico fijo.
    const nivelDesc = maturityLabel === 'Alto'
        ? 'un nivel de claridad vocacional alto, lo que indica una cohorte con orientación bien definida'
        : maturityLabel === 'Medio'
            ? 'un nivel de claridad vocacional en consolidación, con intereses en proceso de definición'
            : 'un nivel de claridad vocacional en desarrollo, que requiere estrategias de acompañamiento';

    const institutionalInterpretation =
        `La cohorte evaluada muestra una inclinación colectiva hacia <strong>${areaEsc}</strong>, ` +
        `con intereses orientados a ${interesesEsc}. Este perfil sugiere que la institución puede ` +
        `fortalecer sus estrategias curriculares en esta dirección, aprovechando las fortalezas ` +
        `identificadas: ${fortalezasEsc}. El grupo presenta ${nivelDesc}.`;

    // ── Análisis de cohorte ──────────────────────────────────────────────────
    const cohortAnalysis =
        `La distribución de niveles de claridad vocacional es: ` +
        `${alto} estudiante${alto !== 1 ? 's' : ''} con alta claridad (≥75%), ` +
        `${medio} con claridad media (46–74%) y ` +
        `${bajo} con baja claridad (≤45%). ` +
        (tienePerfilesCombinados
            ? `El ${pctPerfilesCombinados}% de los estudiantes presenta perfiles ` +
            `individuales combinados: aunque comparten el área dominante principal ` +
            `(${areaEsc}), cada estudiante tiene una segunda área de interés ` +
            `significativa diferente. Esto enriquece la diversidad vocacional interna de la cohorte.`
            : tipoPerfil === 'Combinado'
                ? `El perfil grupal combinado indica que el área dominante comparte protagonismo ` +
                `con una segunda área de interés significativa a nivel de promedios grupales.`
                : `El perfil grupal simple indica una concentración clara de intereses en el área de ` +
                `${areaEsc}, lo que facilita el diseño de estrategias de orientación colectiva.`);

    // ── Análisis de riesgos ──────────────────────────────────────────────────
    // Completamente condicional: si no hay riesgo, no se menciona.
    const riskAnalysis = bajo > 0
        ? `Se identificaron <strong>${bajo}</strong> estudiante${bajo !== 1 ? 's' : ''} ` +
        `(${lowVocPercent}%) con baja claridad vocacional. ` +
        `Estos estudiantes no presentan un área dominante definida, lo que puede indicar ` +
        `indecisión, falta de exploración de intereses o necesidad de mayor acompañamiento ` +
        `por parte del orientador escolar. Se recomienda realizar entrevistas individuales ` +
        `y actividades de exploración vocacional complementarias.`
        : `La totalidad de la cohorte evaluada presenta claridad vocacional media o alta. ` +
        `No se identificaron estudiantes en situación de riesgo vocacional. ` +
        `Este resultado refleja una cohorte con intereses definidos que facilita ` +
        `el trabajo de orientación institucional.`;

    // ── Potenciales académicos ───────────────────────────────────────────────
    // Usa datos reales; ajusta el texto según si hay o no estudiantes de alta claridad.
    const potentialAnalysis = alto > 0
        ? `Las fortalezas colectivas identificadas incluyen: ${fortalezasEsc}. ` +
        `El grupo presenta potencial para desarrollarse en el sector de ${sectorEsc}. ` +
        `${alto} estudiante${alto !== 1 ? 's' : ''} con alta claridad ` +
        `vocacional constituyen un núcleo de referencia que puede servir como modelo para ` +
        `sus pares en proceso de definición. Se recomienda aprovechar este potencial mediante ` +
        `proyectos de orientación entre pares y actividades de exploración profesional.`
        : `Las fortalezas colectivas identificadas incluyen: ${fortalezasEsc}. ` +
        `El grupo presenta potencial para desarrollarse en el sector de ${sectorEsc}. ` +
        `Se recomienda implementar actividades de exploración vocacional que permitan ` +
        `a los estudiantes consolidar sus intereses y avanzar hacia una mayor claridad.`;

    // ── Conclusión general ───────────────────────────────────────────────────
    // Sin mención de promedio grupal. Enfocada en cohesión, distribución y perfiles reales.
    const conclusionRiesgo = bajo > 0
        ? ` El ${lowVocPercent}% de la cohorte requiere seguimiento prioritario.`
        : ` La cohorte no presenta estudiantes en riesgo vocacional.`;

    const conclusionPerfiles = tienePerfilesCombinados
        ? ` El ${pctPerfilesCombinados}% de los estudiantes presenta perfiles individuales combinados con áreas secundarias diversas.`
        : '';

    const generalConclusion =
        `El grupo presenta un perfil vocacional <strong>${escapeHtml(tipoPerfil.toLowerCase())}</strong> ` +
        `con tendencia predominante hacia <strong>${areaEsc}</strong>. ` +
        `El ${dominantCohesionPercent}% de los estudiantes coincide con el área dominante grupal, ` +
        `configurando una cohorte ${escapeHtml(tipoCohorte || 'con tendencia definida')}.` +
        conclusionPerfiles +
        conclusionRiesgo +
        ` Se recomienda continuar el proceso de orientación fortaleciendo las estrategias ` +
        `curriculares alineadas con el perfil identificado.`;

    // ── Notas metodológicas ──────────────────────────────────────────────────
    const methodologicalNotes =
        `Los resultados presentados corresponden al análisis agregado de ${population} respuesta${population !== 1 ? 's' : ''} ` +
        `individuales al Test CHASIDE (98 ítems, escala Sí/No). Los promedios grupales se calcularon ` +
        `como la media aritmética de los puntajes individuales por área, aplicando redondeo matemático ` +
        `estándar (0.5 o superior sube, menor baja). La clasificación de niveles vocacionales ` +
        `(Alto ≥75%, Medio 46–74%, Bajo ≤45%) se determinó sobre los puntajes individuales ya redondeados. ` +
        `El área dominante grupal corresponde al área con el mayor promedio. ` +
        `Este informe no reemplaza la evaluación psicopedagógica individual.`;

    return {
        executiveSummary,
        institutionalInterpretation,
        cohortAnalysis,
        riskAnalysis,
        potentialAnalysis,
        generalConclusion,
        methodologicalNotes
    };
}


/**
 * Genera la tabla HTML de promedios grupales por área.
 * Función PURA. Sin DOM, sin async, sin _s.
 * Se inyecta en {{{ quantitativeTableHtml }}} (página 2 de la plantilla grupal).
 *
 * @param {Array}  sortedAreas    - [{ code, label, score }] ordenado desc (score en %)
 * @param {Object} groupRawScores - { C: n, H: n, ... } escala 0-14
 * @param {Object} studentsByArea - { C: ['Juan',...], H: ['Ana',...], ... }
 * @param {Array}  dominantAreas  - resultado de getDominantAreas()
 * @param {number} population     - total de estudiantes evaluados
 * @returns {string} HTML completo de la tabla
 */
function generateQuantitativeTableHtml(sortedAreas, groupRawScores, studentsByArea, dominantAreas, population) {
    const dominantCodes = new Set((dominantAreas || []).map(a => a.code));

    const rows = sortedAreas.map(({ code, label }) => {
        const raw = groupRawScores[code] || 0;
        const count = (studentsByArea[code] || []).length;
        const pct = population > 0 ? Math.round((count / population) * 100) : 0;
        const levelClass = raw >= 10 ? 'nivel-alto' : raw >= 6 ? 'nivel-medio' : 'nivel-bajo';
        const levelLabel = raw >= 10 ? 'Alto' : raw >= 6 ? 'Medio' : 'Bajo';
        const isDominant = dominantCodes.has(code);
        const rowClass = isDominant ? 'class="area-dominante-row"' : '';

        return `<tr ${rowClass}>
            <td class="codigo-col" style="font-weight:700; color:var(--azul-oscuro); text-align:center;">${escapeHtml(code)}</td>
            <td>${escapeHtml(label)}</td>
            <td style="text-align:center; font-weight:600;">${raw}</td>
            <td style="text-align:center;"><span class="${levelClass}">${levelLabel}</span></td>
            <td style="text-align:center;">${count}</td>
            <td style="text-align:center;">${pct}%</td>
        </tr>`;
    }).join('');

    return `<table class="tabla-resultados estudiantes-area-tabla">
        <thead>
            <tr>
                <th style="text-align:center;">Cód.</th>
                <th>Área vocacional</th>
                <th style="text-align:center;">Promedio (0-14)</th>
                <th style="text-align:center;">Nivel</th>
                <th style="text-align:center;">Est. dominantes</th>
                <th style="text-align:center;">% del grupo</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Genera el SVG de barras de distribución de estudiantes por área dominante.
 * Función PURA. Sin DOM, sin async, sin _s.
 * DIFERENCIA con generateVisuals(): el eje Y representa CONTEO de estudiantes,
 * no puntajes. Se inyecta en {{{ distributionBarsSvg }}} (página 2).
 *
 * @param {Object} studentsByArea - { C: ['Juan', 'Ana'], H: ['Pedro'], ... }
 * @param {number} population     - total de estudiantes (escala máxima del eje Y)
 * @param {string} dominantCode   - código del área dominante para resaltar
 * @returns {string} SVG completo como string
 */
function generateGroupBarsSvg(studentsByArea, population, dominantCode) {
    const barPositions = [30, 74, 118, 162, 206, 250, 294];
    const codes = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];
    const maxVal = population > 0 ? population : 1;

    // Marcas del eje Y: 0, 25%, 50%, 75%, 100% de la población
    const yMarks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
        val: Math.round(f * maxVal),
        y: Math.round(220 - f * 200)
    }));

    const gridLines = yMarks.map(m =>
        `<line x1="28" y1="${m.y}" x2="336" y2="${m.y}" stroke="${m.val === 0 ? '#CBD5E0' : '#E2E8F0'}" stroke-width="${m.val === 0 ? '1' : '0.8'}" stroke-dasharray="${m.val === 0 ? '' : '3,3'}"/>
         <text x="22" y="${m.y + 3}" text-anchor="end" font-size="7" fill="#718096">${m.val}</text>`
    ).join('');

    const bars = codes.map((code, index) => {
        const count = (studentsByArea[code] || []).length;
        const height = maxVal > 0 ? Math.round((count / maxVal) * 200) : 0;
        const y = 220 - height;
        const isDominant = code === dominantCode;
        const color = AREA_COLORS[code] || '#A0B9CF';
        const labelColor = isDominant ? color : '#2D3748';

        return `<rect x="${barPositions[index]}" y="${y}" width="34" height="${height}" fill="${color}" fill-opacity="${isDominant ? '1' : '0.35'}" rx="2"/>
                <text x="${barPositions[index] + 17}" y="${y - 4}" text-anchor="middle" font-size="10" fill="${labelColor}" font-weight="700">${count}</text>
                <text x="${barPositions[index] + 17}" y="233" text-anchor="middle" font-size="9" fill="${labelColor}" font-weight="600">${code}</text>`;
    }).join('');

    return `<svg viewBox="0 0 360 270" xmlns="http://www.w3.org/2000/svg" style="font-family:'DM Sans',sans-serif;">
        ${gridLines}
        <text transform="rotate(-90,11,135)" x="11" y="135" text-anchor="middle" font-size="7" fill="#718096">Estudiantes</text>
        ${bars}
        <line x1="28" y1="220" x2="28" y2="224" stroke="#718096" stroke-width="1"/>
        <rect x="30" y="248" width="10" height="7" fill="${AREA_COLORS[dominantCode] || '#1A3A5C'}" rx="1"/>
        <text x="44" y="255" font-size="7" fill="${AREA_COLORS[dominantCode] || '#1A3A5C'}" font-weight="700">Área dominante (${escapeHtml(dominantCode)})</text>
        <rect x="160" y="248" width="10" height="7" fill="#A0B9CF" rx="1"/>
        <text x="174" y="255" font-size="7" fill="#2D3748">Otras áreas</text>
    </svg>`;
}


/**
 * Genera la tabla HTML de clasificación de estudiantes por área dominante.
 * Función PURA. Sin DOM, sin async, sin _s.
 * Se inyecta en {{{ studentsByAreaHtml }}} (página 5 de la plantilla grupal).
 *
 * @param {Object} studentsByArea - { C: ['Juan Pérez', 'Ana López'], H: ['Pedro'], ... }
 * @param {Array}  dominantAreas  - resultado de getDominantAreas() para resaltar filas
 * @returns {string} HTML de tabla con clases CSS de la plantilla grupal
 */
function generateStudentsByAreaHtml(studentsByArea, dominantAreas) {
    const dominantCodes = new Set((dominantAreas || []).map(a => a.code));
    const codes = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];

    const rows = codes
        .filter(code => (studentsByArea[code] || []).length > 0)
        .map(code => {
            const names = studentsByArea[code] || [];
            const isDominant = dominantCodes.has(code);
            const rowBg = isDominant ? 'background:var(--azul-palido);' : '';
            const namesHtml = names
                .map(n => `<span style="display:inline-block; margin:1px 3px; font-size:7.5pt;">${escapeHtml(n)}</span>`)
                .join('');

            return `<tr style="${rowBg}">
                <td class="codigo-col" style="font-weight:700; color:var(--azul-oscuro); text-align:center; white-space:nowrap;">
                    ${escapeHtml(code)}${isDominant ? ' ★' : ''}
                </td>
                <td style="font-size:8pt;">${escapeHtml(getAreaLabel(code))}</td>
                <td style="font-size:7.5pt; line-height:1.6;">${namesHtml}</td>
                <td style="text-align:center; font-weight:700; font-size:9pt;">${names.length}</td>
            </tr>`;
        }).join('');

    if (!rows) {
        return '<p style="color:var(--gris-suave); font-style:italic; font-size:8pt;">No hay estudiantes clasificados por área dominante.</p>';
    }

    return `<table class="estudiantes-area-tabla">
        <thead>
            <tr>
                <th style="text-align:center; width:50px;">Cód.</th>
                <th>Área vocacional</th>
                <th>Estudiantes</th>
                <th style="text-align:center; width:60px;">Total</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Genera los tres bloques HTML de recomendaciones institucionales.
 * Función PURA. Sin DOM, sin async, sin _s.
 *
 * @param {string} dominantCode - Código del área dominante ('A', 'C', etc.)
 * @param {Object} areaInfo     - Objeto de buildAreaInfo()
 * @param {number} riskPercent  - % de estudiantes en riesgo vocacional
 * @returns {{ recommendationsHtml, curricularStrategiesHtml, strengtheningAreasHtml }}
 */
function generateRecommendationsHtml(dominantCode, areaInfo, riskPercent) {
    const areaLabel = escapeHtml(getAreaLabel(dominantCode));
    const carreras = Array.isArray(areaInfo?.carreras) ? areaInfo.carreras : [];
    const sector = escapeHtml((areaInfo?.sector_laboral || 'múltiples sectores').replace(/\.\s*$/, ''));

    // ── Recomendaciones institucionales ──────────────────────────────────────
    const recItems = [
        {
            titulo: 'Orientación vocacional colectiva',
            desc: `Implementar talleres grupales de exploración vocacional enfocados en el área de ${areaLabel}, ` +
                `aprovechando la tendencia predominante de la cohorte.`
        },
        {
            titulo: 'Acompañamiento individualizado',
            desc: riskPercent > 0
                ? `Priorizar el seguimiento psicopedagógico del ${riskPercent}% de estudiantes con baja claridad ` +
                `vocacional mediante entrevistas individuales y actividades de autoconocimiento.`
                : `Mantener el seguimiento continuo para consolidar la claridad vocacional ya evidenciada en el grupo.`
        },
        {
            titulo: 'Vinculación con el sector productivo',
            desc: `Gestionar visitas, charlas y pasantías con instituciones del sector de ${sector}, ` +
                `alineadas con el perfil vocacional predominante del grupo.`
        },
        {
            titulo: 'Comunicación con familias',
            desc: `Compartir los resultados grupales con padres y acudientes en reunión institucional, ` +
                `orientando sobre las opciones de educación superior y técnica disponibles.`
        }
    ];

    const recommendationsHtml = recItems.map(item => `
        <div class="recomendacion-item">
            <div class="rec-titulo">${item.titulo}</div>
            <div class="rec-desc">${item.desc}</div>
        </div>`).join('');

    // ── Estrategias curriculares ──────────────────────────────────────────────
    const estrategias = [
        {
            titulo: 'Proyectos transversales',
            desc: `Diseñar proyectos de aula que integren competencias del área de ${areaLabel} ` +
                `con las asignaturas del plan de estudios vigente.`
        },
        {
            titulo: 'Ferias y eventos vocacionales',
            desc: `Organizar ferias de orientación profesional con participación de egresados y ` +
                `representantes de programas académicos afines al perfil grupal.`
        },
        {
            titulo: 'Uso de resultados en consejería',
            desc: `Incorporar los resultados del Test CHASIDE como insumo en las sesiones de ` +
                `consejería escolar y en la construcción del proyecto de vida de cada estudiante.`
        }
    ];

    const curricularStrategiesHtml = estrategias.map(e => `
        <div class="recomendacion-item">
            <div class="rec-titulo">${e.titulo}</div>
            <div class="rec-desc">${e.desc}</div>
        </div>`).join('');

    // ── Áreas de fortalecimiento ──────────────────────────────────────────────
    const codesAll = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];
    const areaTags = codesAll.map(c => {
        const isMain = c === dominantCode;
        const style = isMain
            ? 'background:var(--azul-oscuro); color:white; border-color:var(--azul-oscuro);'
            : '';
        return `<span class="area-tag" style="${style}">${escapeHtml(c)} – ${escapeHtml(getAreaLabel(c))}</span>`;
    }).join('');

    const carrerasTags = carreras.slice(0, 6).map(c =>
        `<span class="carrera-tag">${escapeHtml(c)}</span>`
    ).join('');

    const strengtheningAreasHtml = `
        <div style="margin-bottom:8px;">
            <p style="font-size:8pt; color:var(--gris-suave); margin-bottom:5px;">
                Área de mayor fortalecimiento (resaltada):
            </p>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">${areaTags}</div>
        </div>
        <div style="margin-top:8px;">
            <p style="font-size:8pt; color:var(--gris-suave); margin-bottom:5px;">
                Carreras recomendadas para el perfil grupal:
            </p>
            <div class="carreras-lista">${carrerasTags}</div>
        </div>`;

    return { recommendationsHtml, curricularStrategiesHtml, strengtheningAreasHtml };
}


// =============================================================================
// SECCIÓN 6 — FUNCIÓN PRINCIPAL: buildGroupReportContext
// Async. Usa _s y sess. Sin DOM.
// =============================================================================

/**
 * Construye el objeto de datos completo para el informe grupal.
 * Equivalente a buildReportContext() del informe individual, pero para datos
 * agregados de un grupo/grado completo.
 *
 * Requiere que la RPC `obtener_resultados_grupo_seguro` exista en Supabase con:
 *   Parámetros: p_colegio_id integer, p_grado_id bigint, p_usuario_id uuid
 *   Retorna:    { status, data: [{ id_estudiante, nombre, respuestas }] }
 *
 * Si la RPC no existe aún, cae en fallback a consultas directas (solo para
 * desarrollo/pruebas locales — NO usar en producción).
 *
 * @param {number|string} schoolId   - ID del colegio
 * @param {number|string} gradeId    - ID del grado
 * @param {string}        gradeName  - Nombre legible del grado (ej: "Grado 11")
 * @param {string}        schoolName - Nombre del colegio
 * @returns {Object|null} groupReportData listo para renderTemplate(), o null si no hay datos
 */
async function buildGroupReportContext(schoolId, gradeId, gradeName, schoolName) {

    // ── 1. Obtener resultados del grupo ──────────────────────────────────────
    let rawResults = [];

    // Intentar primero con la RPC segura
    const { data: rpcRes, error: rpcErr } = await _s.rpc('obtener_resultados_grupo_seguro', {
        p_colegio_id: parseInt(schoolId),
        p_grado_id: parseInt(gradeId),
        p_usuario_id: String(sess.id)
    });

    if (!rpcErr && rpcRes?.status !== 'error') {
        // RPC nueva existe y respondió correctamente
        rawResults = rpcRes?.data || [];
    } else {
        // Fallback: usar obtener_informe_estrategico_grupal (SECURITY DEFINER, salta RLS)
        // Esta RPC ya existe en la DB y retorna { status, students, results }
        console.warn('[reports.js] RPC obtener_resultados_grupo_seguro no disponible. Usando fallback obtener_informe_estrategico_grupal.');

        const { data: fallbackRes, error: fallbackErr } = await _s.rpc('obtener_informe_estrategico_grupal', {
            p_colegio_id: parseInt(schoolId),
            p_grado_id: parseInt(gradeId),
            p_usuario_id: sess.id
        });

        if (fallbackErr || fallbackRes?.status === 'error') {
            console.error('[reports.js] Fallback RPC también falló:', fallbackErr || fallbackRes?.message);
            return null;
        }

        // La RPC retorna students:[{id, nombre}] y results:[{id_estudiante, respuestas}]
        // Cruzamos ambos arrays para construir rawResults con nombre + respuestas
        const students = fallbackRes?.students || [];
        const results = fallbackRes?.results || [];

        if (!students.length || !results.length) {
            console.warn('[reports.js] Fallback: sin estudiantes o sin resultados para colegio=' + schoolId + ' grado=' + gradeId);
            return null;
        }

        const studentMap = Object.fromEntries(students.map(s => [String(s.id), s.nombre]));

        rawResults = results
            .filter(r => {
                if (r.respuestas == null) return false;
                // Descartar respuestas vacías: "{}" o {} no aportan datos al agregado
                try {
                    const parsed = typeof r.respuestas === 'string'
                        ? JSON.parse(r.respuestas)
                        : r.respuestas;
                    return parsed && Object.keys(parsed).length > 0;
                } catch (e) {
                    return false;
                }
            })
            .map(r => ({
                id_estudiante: r.id_estudiante,
                nombre: studentMap[String(r.id_estudiante)] || 'Estudiante',
                respuestas: r.respuestas
            }));
    }

    if (!rawResults.length) return null;

    // ── 2. Calcular métricas de agregación ───────────────────────────────────
    const codes = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];
    const areaTotals = Object.fromEntries(codes.map(c => [c, 0]));
    const areaCounts = Object.fromEntries(codes.map(c => [c, 0]));
    const studentsByArea = Object.fromEntries(codes.map(c => [c, []]));
    const interestLevels = { Alto: 0, Medio: 0, Bajo: 0 };
    let highScoresSum = 0;
    let studentsAtRisk = 0;

    rawResults.forEach(r => {
        try {
            const res = typeof r.respuestas === 'string'
                ? JSON.parse(r.respuestas)
                : (r.respuestas || {});

            let studentMax = -1;
            let dominantAreaForStudent = '';

            Object.entries(res).forEach(([area, val]) => {
                const code = normalizeAreaCode(area);
                if (!code) return;
                const numVal = Number(val) || 0;
                areaTotals[code] = (areaTotals[code] || 0) + numVal;
                areaCounts[code] = (areaCounts[code] || 0) + 1;
                if (numVal > studentMax) {
                    studentMax = numVal;
                    dominantAreaForStudent = code;
                }
            });

            if (dominantAreaForStudent && r.nombre) {
                if (!studentsByArea[dominantAreaForStudent]) {
                    studentsByArea[dominantAreaForStudent] = [];
                }
                studentsByArea[dominantAreaForStudent].push(r.nombre);
            }

            // Solo sumar si se encontró al menos un área válida
            if (studentMax >= 0) {
                highScoresSum += studentMax;
                const level = getVocationalLevel(studentMax);
                if (level === 'Alto') interestLevels.Alto++;
                else if (level === 'Medio') interestLevels.Medio++;
                else { interestLevels.Bajo++; studentsAtRisk++; }
            }

        } catch (e) {
            console.warn('[reports.js] Error parseando respuestas de estudiante:', e);
        }
    });

    const population = rawResults.length;

    // ── 3. Construir promedios grupales (escala 0-100) ───────────────────────
    // Redondeo matemático estándar uniforme: 0.5 o superior → sube, menor → baja.
    // Se usa Math.round() que en JS implementa "round half away from zero" para
    // valores positivos, equivalente al redondeo matemático estándar.
    const groupAverages = Object.fromEntries(
        codes.map(c => [c, areaCounts[c] > 0 ? Math.round(areaTotals[c] / areaCounts[c]) : 0])
    );

    // ── 4. Normalizar a escala 0-14 para los visuales SVG ───────────────────
    // Mismo redondeo matemático estándar. Se aplica DESPUÉS del promedio,
    // garantizando que la clasificación use el valor ya redondeado.
    const groupRawScores = Object.fromEntries(
        codes.map(c => [c, Math.round((groupAverages[c] / 100) * 14)])
    );

    // ── 5. Análisis de dominancia ────────────────────────────────────────────
    const sortedAreas = sortResultAreas(groupAverages);
    const dominantAreas = getDominantAreas(sortedAreas);
    const dominantCode = dominantAreas[0]?.code || 'C';
    const dominantLabels = dominantAreas.map(a => a.label).join(' / ') || 'Sin definir';
    const dominantColor = AREA_COLORS[dominantCode] || '#1A3A5C';
    const maxScore = sortedAreas[0]?.score || 0;

    // tipoPerfil grupal: basado en los promedios grupales (Simple/Combinado).
    const tipoPerfil = getProfileType(sortedAreas);

    // Detectar si la mayoría de estudiantes tienen perfiles combinados individualmente.
    // Esto permite identificar cohortes donde todos comparten el dominante principal
    // pero cada uno tiene una segunda área distinta.
    let estudiantesConPerfilCombinado = 0;
    rawResults.forEach(r => {
        try {
            const res = typeof r.respuestas === 'string' ? JSON.parse(r.respuestas) : (r.respuestas || {});
            const sorted = sortResultAreas(res);
            if (getProfileType(sorted) === 'Combinado') estudiantesConPerfilCombinado++;
        } catch (e) { /* ignorar */ }
    });
    const pctPerfilesCombinados = population > 0
        ? Math.round((estudiantesConPerfilCombinado / population) * 100)
        : 0;
    const tienePerfilesCombinados = pctPerfilesCombinados >= 50;

    // Cohesión interna: % de estudiantes cuya área dominante individual
    // coincide con la dominante grupal.
    const dominantCohesionCount = (studentsByArea[dominantCode] || []).length;
    const dominantCohesionPercent = population > 0
        ? Math.round((dominantCohesionCount / population) * 100)
        : 0;

    // tipoCohorte: descripción precisa que combina cohesión y perfiles individuales.
    let tipoCohorte;
    if (dominantCohesionPercent >= 70 && !tienePerfilesCombinados) {
        tipoCohorte = 'homogénea';
    } else if (dominantCohesionPercent >= 70 && tienePerfilesCombinados) {
        tipoCohorte = 'homogénea en área principal con perfiles secundarios diversos';
    } else if (dominantCohesionPercent >= 40) {
        tipoCohorte = 'con tendencia vocacional definida';
    } else {
        tipoCohorte = 'heterogénea';
    }

    // Nivel vocacional del área dominante grupal — sobre el promedio ya redondeado.
    const nivelVocacion = getVocationalLevel(maxScore);
    const maturityLabel = nivelVocacion;

    // avgScore: promedio de los puntajes máximos individuales (dato técnico interno).
    const avgScore = population > 0 ? Math.round(highScoresSum / population) : 0;
    const riskPercent = Math.round((studentsAtRisk / population) * 100);

    // Porcentajes de niveles vocacionales — suman exactamente 100%.
    const highVocPercent = Math.round((interestLevels.Alto / population) * 100);
    const midVocPercent = Math.round((interestLevels.Medio / population) * 100);
    const lowVocPercent = 100 - highVocPercent - midVocPercent;

    // ── 6. Información del área dominante ────────────────────────────────────
    const areaInfo = await buildAreaInfo([dominantCode]);

    // ── 7. Visuales SVG (reutiliza generateVisuals del informe individual) ───
    const visuals = generateVisuals(groupRawScores, dominantCode);

    // SVG completo del radar grupal para {{{groupRadarSvg}}} en la plantilla.
    // La plantilla grupal espera el SVG entero (no radarPoints/radarDots sueltos).
    const groupRadarSvg = `<svg viewBox="0 0 350 285" xmlns="http://www.w3.org/2000/svg" style="font-family:'DM Sans',sans-serif;">
        <polygon points="175,117.5 196.5,127.9 201.8,151.1 186.9,169.8 163.1,169.8 148.2,151.1 153.5,127.9" fill="none" stroke="#E2E8F0" stroke-width="0.8"/>
        <polygon points="175,90 218,110.7 228.6,157.3 198.9,194.6 151.1,194.6 121.4,157.3 132,110.7" fill="none" stroke="#CBD5E0" stroke-width="0.8"/>
        <polygon points="175,62.5 239.5,93.6 255.4,163.4 210.8,219.3 139.2,219.3 94.6,163.4 110.5,93.6" fill="none" stroke="#CBD5E0" stroke-width="0.8"/>
        <polygon points="175,35 261,76.4 282.2,169.5 222.7,244.1 127.3,244.1 67.8,169.5 89,76.4" fill="none" stroke="#A0AEC0" stroke-width="1"/>
        <line x1="175" y1="145" x2="175"   y2="35"    stroke="#CBD5E0" stroke-width="0.8"/>
        <line x1="175" y1="145" x2="261"   y2="76.4"  stroke="#CBD5E0" stroke-width="0.8"/>
        <line x1="175" y1="145" x2="282.2" y2="169.5" stroke="#CBD5E0" stroke-width="0.8"/>
        <line x1="175" y1="145" x2="222.7" y2="244.1" stroke="#CBD5E0" stroke-width="0.8"/>
        <line x1="175" y1="145" x2="127.3" y2="244.1" stroke="#CBD5E0" stroke-width="0.8"/>
        <line x1="175" y1="145" x2="67.8"  y2="169.5" stroke="#CBD5E0" stroke-width="0.8"/>
        <line x1="175" y1="145" x2="89"    y2="76.4"  stroke="#CBD5E0" stroke-width="0.8"/>
        <polygon points="${visuals.radarPoints}" fill="rgba(37,99,168,0.18)" stroke="#2563A8" stroke-width="1.8" stroke-linejoin="round"/>
        ${visuals.radarDots}
        <text x="175" y="28"  text-anchor="middle" font-size="8.5" fill="${AREA_COLORS['C']}" font-weight="${dominantCode === 'C' ? '700' : '600'}">${'C' + (dominantCode === 'C' ? ' ★' : '')}</text>
        <text x="269" y="74"  text-anchor="start"  font-size="8.5" fill="${AREA_COLORS['H']}" font-weight="${dominantCode === 'H' ? '700' : '600'}">${'H' + (dominantCode === 'H' ? ' ★' : '')}</text>
        <text x="289" y="172" text-anchor="start"  font-size="8.5" fill="${AREA_COLORS['A']}" font-weight="${dominantCode === 'A' ? '700' : '600'}">${'A' + (dominantCode === 'A' ? ' ★' : '')}</text>
        <text x="224" y="255" text-anchor="middle" font-size="8.5" fill="${AREA_COLORS['S']}" font-weight="${dominantCode === 'S' ? '700' : '600'}">${'S' + (dominantCode === 'S' ? ' ★' : '')}</text>
        <text x="118" y="255" text-anchor="middle" font-size="8.5" fill="${AREA_COLORS['I']}" font-weight="${dominantCode === 'I' ? '700' : '600'}">${'I' + (dominantCode === 'I' ? ' ★' : '')}</text>
        <text x="56"  y="172" text-anchor="end"    font-size="8.5" fill="${AREA_COLORS['D']}" font-weight="${dominantCode === 'D' ? '700' : '600'}">${'D' + (dominantCode === 'D' ? ' ★' : '')}</text>
        <text x="80"  y="74"  text-anchor="end"    font-size="8.5" fill="${AREA_COLORS['E']}" font-weight="${dominantCode === 'E' ? '700' : '600'}">${'E' + (dominantCode === 'E' ? ' ★' : '')}</text>
        <text x="177" y="103" font-size="6.5" fill="#A0AEC0">5</text>
        <text x="177" y="73"  font-size="6.5" fill="#A0AEC0">10</text>
        <text x="177" y="34"  font-size="6.5" fill="#A0AEC0">14</text>
    </svg>`;

    // Colores y pesos para etiquetas del radar (misma lógica que buildReportContext)
    const areaStyles = {};
    codes.forEach(c => {
        const isDominant = c === dominantCode;
        areaStyles[`color${c}`] = isDominant ? (AREA_COLORS[c] || '#1A3A5C') : '#4A5568';
        areaStyles[`weight${c}`] = isDominant ? '700' : '600';
        areaStyles[`label${c}`] = c + (isDominant ? ' ★' : '');
    });

    // ── 8. Textos interpretativos ────────────────────────────────────────────
    const texts = generateGroupTexts({
        topAreaLabel: dominantLabels,
        dominantCode,
        population,
        riskPercent,
        avgScore,
        maturityLabel,
        tipoPerfil,
        tipoCohorte,
        tienePerfilesCombinados,
        pctPerfilesCombinados,
        areaInfo,
        interestLevels,
        highVocPercent,
        midVocPercent,
        lowVocPercent,
        dominantCohesionPercent
    });

    // ── 9. Componentes HTML/SVG ──────────────────────────────────────────────
    const quantitativeTableHtml = generateQuantitativeTableHtml(
        sortedAreas, groupRawScores, studentsByArea, dominantAreas, population
    );

    const distributionBarsSvg = generateGroupBarsSvg(
        studentsByArea, population, dominantCode
    );

    const studentsByAreaHtml = generateStudentsByAreaHtml(
        studentsByArea, dominantAreas
    );

    const { recommendationsHtml, curricularStrategiesHtml, strengtheningAreasHtml } =
        generateRecommendationsHtml(dominantCode, areaInfo, riskPercent);

    // ── 10. Ensamblar objeto final ───────────────────────────────────────────
    return {
        // Identidad del informe
        pruebaConfig: { tipo_informe: 'Grupal_chaside_vocacional' },
        institutionName: schoolName || 'Institución',
        gradeName: gradeName || 'Grado',
        generatedDate: new Date().toLocaleDateString('es-CO'),
        instrumentName: 'Test CHASIDE – 98 ítems',
        year: new Date().getFullYear(),

        // KPIs
        population,
        avgScore,
        riskPercent,
        topArea: dominantLabels,
        maturityLabel,
        highVocPercent,
        midVocPercent,
        lowVocPercent,
        dominantCohesionPercent,
        tipoCohorte,

        // Análisis vocacional
        sortedAreas,
        dominantAreas,
        dominantCode,
        dominantLabels,
        dominantColor,
        maxScore,
        tipoPerfil,
        nivelVocacion,
        areaInfo,

        // Scores grupales (spread para acceso directo en plantilla si se necesita)
        ...groupRawScores,
        ...areaStyles,

        // Visuales SVG (radar y barras de puntaje — reutilizados del individual)
        ...visuals,

        // SVG completo del radar grupal para {{{groupRadarSvg}}}
        groupRadarSvg,

        // SVG de distribución de estudiantes (nuevo, exclusivo del grupal)
        distributionBarsSvg,

        // Textos interpretativos
        ...texts,

        // Textos condicionales para la plantilla (no pueden ser ternarios en el motor)
        areaDesarrollarGrupalText: lowVocPercent === 0
            ? 'La totalidad del grupo presenta claridad vocacional media o alta. No se identificaron estudiantes con baja claridad.'
            : `${lowVocPercent}% de la cohorte presenta baja claridad vocacional, requiriendo acompañamiento individualizado y exploración de intereses.`,
        notaGrupalText: lowVocPercent === 0
            ? 'Este perfil representa la tendencia predominante de la cohorte. No se identificaron estudiantes en riesgo vocacional en esta evaluación.'
            : 'Este perfil representa la tendencia predominante de la cohorte. Se recomienda complementar con seguimiento individual para estudiantes con baja claridad vocacional.',

        // Componentes HTML
        quantitativeTableHtml,
        studentsByAreaHtml,
        recommendationsHtml,
        curricularStrategiesHtml,
        strengtheningAreasHtml,

        // Datos internos (útiles para debug y para la función de volver)
        _schoolId: schoolId,
        _gradeId: gradeId,
        _interestLevels: interestLevels,
        _studentsByArea: studentsByArea
    };
}


// =============================================================================
// SECCIÓN 7 — FUNCIÓN DE DEBUG  (solo para Fase 2 — se eliminará en Fase 4)
// =============================================================================

/**
 * Función temporal de prueba para verificar buildGroupReportContext desde consola.
 * Llama a buildGroupReportContext y loguea el objeto resultante.
 * NO conecta con el DOM ni con renderInforme.
 *
 * Uso desde consola del navegador:
 *   const data = await debugGroupReport(schoolId, gradeId, 'Grado 11', 'Mi Colegio');
 *   console.log(data);
 *
 * @param {number|string} schoolId   - ID del colegio (ver tcolegios.id)
 * @param {number|string} gradeId    - ID del grado (ver tgrados.id)
 * @param {string}        gradeName  - Nombre del grado para el informe
 * @param {string}        schoolName - Nombre del colegio para el informe
 * @returns {Object|null} El objeto groupReportData completo, o null si no hay datos
 */
async function debugGroupReport(schoolId, gradeId, gradeName, schoolName) {
    console.group('[debugGroupReport] ══ DIAGNÓSTICO PASO A PASO ══');
    console.log('Parámetros recibidos:', { schoolId, gradeId, gradeName, schoolName });
    console.log('sess.id activo:', sess?.id);

    // ── PASO 1: Verificar RPC ────────────────────────────────────────────────
    console.group('PASO 1 — Intentando RPC obtener_resultados_grupo_seguro...');
    const { data: rpcRes, error: rpcErr } = await _s.rpc('obtener_resultados_grupo_seguro', {
        p_colegio_id: parseInt(schoolId),
        p_grado_id: parseInt(gradeId),
        p_usuario_id: String(sess.id)
    });
    console.log('rpcErr:', rpcErr);
    console.log('rpcRes:', rpcRes);
    console.groupEnd();

    // ── PASO 2: Fallback — RPC obtener_informe_estrategico_grupal ───────────
    // (testudiantes y tresultados están bloqueadas por RLS para el cliente anon)
    console.group('PASO 2 — Fallback: llamando obtener_informe_estrategico_grupal...');
    const { data: fallbackRes, error: fallbackErr } = await _s.rpc('obtener_informe_estrategico_grupal', {
        p_colegio_id: parseInt(schoolId),
        p_grado_id: parseInt(gradeId),
        p_usuario_id: sess.id
    });
    console.log('fallbackErr:', fallbackErr);
    console.log('fallbackRes.status:', fallbackRes?.status);
    console.log('students count:', fallbackRes?.students?.length);
    console.log('results count:', fallbackRes?.results?.length);

    if (fallbackErr || fallbackRes?.status === 'error') {
        console.error('❌ FALLA AQUÍ: RPC rechazó acceso —', fallbackErr?.message || fallbackRes?.message);
        console.groupEnd(); console.groupEnd();
        return null;
    }
    const fbStudents = fallbackRes?.students || [];
    const fbResults = fallbackRes?.results || [];
    if (!fbStudents.length) {
        console.error('❌ FALLA AQUÍ: students vacío — colegio=' + schoolId + ' grado=' + gradeId);
        console.groupEnd(); console.groupEnd();
        return null;
    }
    if (!fbResults.length) {
        console.error('❌ FALLA AQUÍ: results vacío — no hay resultados para estos estudiantes');
        console.groupEnd(); console.groupEnd();
        return null;
    }
    console.log('students (primeros 3):', fbStudents.slice(0, 3));
    console.log('results (primeros 3):', fbResults.slice(0, 3));
    console.groupEnd();

    // ── PASO 3: Verificar formato de respuestas ──────────────────────────────
    console.group('PASO 3 — Verificando formato de respuestas...');
    const sampleResult = fbResults[0];
    console.log('respuestas[0] tipo:', typeof sampleResult.respuestas);
    console.log('respuestas[0] valor crudo:', sampleResult.respuestas);
    let sampleParsed = {};
    try {
        sampleParsed = typeof sampleResult.respuestas === 'string'
            ? JSON.parse(sampleResult.respuestas)
            : (sampleResult.respuestas || {});
        console.log('respuestas[0] parseado:', sampleParsed);
        console.log('Claves:', Object.keys(sampleParsed));
        console.log('Valores:', Object.values(sampleParsed));
    } catch (e) {
        console.error('❌ Error al parsear respuestas[0]:', e.message);
    }
    console.groupEnd();

    // ── PASO 4: Verificar normalizeAreaCode con las claves reales ────────────
    console.group('PASO 4 — Verificando normalizeAreaCode con claves reales...');
    const clavesReales = Object.keys(sampleParsed || {});
    console.log('Claves en respuestas[0]:', clavesReales);
    clavesReales.forEach(k => {
        const norm = normalizeAreaCode(k);
        console.log(`  normalizeAreaCode("${k}") → "${norm}" ${norm ? '✅' : '❌ NO RECONOCIDA'}`);
    });
    console.groupEnd();

    // ── PASO 5: Llamar buildGroupReportContext completo ──────────────────────
    console.group('PASO 5 — Llamando buildGroupReportContext completo...');
    const data = await buildGroupReportContext(schoolId, gradeId, gradeName, schoolName);
    console.log('Resultado de buildGroupReportContext:', data);
    if (!data) {
        console.error('❌ buildGroupReportContext retornó null. Revisar pasos anteriores.');
        console.groupEnd(); console.groupEnd();
        return null;
    }
    console.groupEnd();

    // ── PASO 6: Verificar placeholders ──────────────────────────────────────
    console.group('PASO 6 — Verificando placeholders de la plantilla grupal...');
    const checkKeys = [
        'institutionName', 'gradeName', 'generatedDate', 'population',
        'instrumentName', 'topArea', 'avgScore', 'riskPercent', 'executiveSummary',
        'quantitativeTableHtml', 'distributionBarsSvg',
        'radarPoints', 'radarDots', 'barSvg',
        'institutionalInterpretation', 'cohortAnalysis', 'riskAnalysis', 'potentialAnalysis',
        'recommendationsHtml', 'curricularStrategiesHtml', 'strengtheningAreasHtml',
        'generalConclusion', 'methodologicalNotes', 'studentsByAreaHtml'
    ];
    const missing = checkKeys.filter(k => data[k] == null || data[k] === '');
    if (missing.length > 0) {
        console.warn('⚠️ Placeholders vacíos o null:', missing);
    } else {
        console.log('✅ Todos los placeholders tienen valor.');
    }
    console.log('GROUP REPORT DATA completo:', data);
    console.groupEnd();

    console.groupEnd(); // cierre grupo principal
    return data;
}


// =============================================================================
// FIN DE reports.js — FASE 4 (LIMPIEZA COMPLETADA)
// =============================================================================
// Estado final:
//   ✅ escapeHtml, getNestedValue, renderTemplate          — activas aquí
//   ✅ normalizeAreaCode, getAreaKeyFromCode, getAreaLabel  — activas aquí
//   ✅ sortResultAreas, getDominantAreas, getProfileType    — activas aquí
//   ✅ getVocationalLevel, generateVisuals                  — activas aquí
//   ✅ generateGroupTexts                                   — activa aquí
//   ✅ generateQuantitativeTableHtml                        — activa aquí
//   ✅ generateGroupBarsSvg                                 — activa aquí
//   ✅ generateStudentsByAreaHtml                           — activa aquí
//   ✅ generateRecommendationsHtml                          — activa aquí
//   ✅ buildGroupReportContext                              — activa aquí
//   ✅ debugGroupReport                                     — activa aquí (debug)
//
//   ✅ Duplicados eliminados de test.js
//   ✅ exportGroupPDF eliminada de test.js
//   ✅ Chart.js eliminado de index.html
//   ✅ html2pdf eliminado de index.html
//   ✅ Chart.register eliminado de supabaseClient.js
//
//   ⏳ debugGroupReport: eliminar en producción cuando ya no se necesite
//   ⏳ RPC obtener_resultados_grupo_seguro: crear en Supabase para reemplazar
//      el fallback a obtener_informe_estrategico_grupal
// =============================================================================
