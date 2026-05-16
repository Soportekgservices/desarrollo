// ==========================================
// DESCRIPCIONES Y CARRERAS VOCACIONALES
// ==========================================
const AREAS_VOCACIONALES = {
    "Administrativas y Contables": {
        descripcion: "Te interesan la gestión, organización y los negocios. Tienes habilidades para la administración empresarial, análisis de datos financieros y liderazgo estratégico. Disfrutas trabajando en contextos empresariales y tomando decisiones basadas en información cuantitativa.",
        carreras: ["Contaduría", "Administración de Empresas", "Mercadeo", "Finanzas", "Economía", "Comercio Internacional", "Gestión de Recursos Humanos"],
        intereses: "Gestión, organización y negocios.",
        habilidades: "Análisis financiero y liderazgo.",
        fortalezas: "Toma de decisiones basada en datos.",
        a_desarrollar: "Pensamiento creativo disruptivo.",
        sector_laboral: "Banca, consultoría y PyMEs."
    },
    "Artes y Creatividad": {
        descripcion: "Tienes un perfil creativo y artístico con capacidad de expresarte a través de diferentes medios visuales, auditivos o corporales. Disfrutas diseñando, creando soluciones innovadoras y comunicando ideas de forma original. Te destacas en ambientes que valoren la expresión personal y la innovación.",
        carreras: ["Diseño Gráfico", "Arquitectura", "Artes Plásticas", "Comunicación Social", "Música", "Diseño Industrial", "Cinematografía y Audiovisuales"],
        intereses: "Expresión visual y auditiva.",
        habilidades: "Creatividad y diseño original.",
        fortalezas: "Innovación y comunicación estética.",
        a_desarrollar: "Gestión administrativa de proyectos.",
        sector_laboral: "Agencias, estudios de arquitectura y medios."
    },
    "Ciencias de la Salud": {
        descripcion: "Te apasionan las ciencias naturales, la investigación científica y el cuidado de la salud. Disfrutas resolviendo problemas mediante el método científico y aplicando conocimientos exactos. Tu vocación está dirigida a mejorar la calidad de vida de las personas.",
        carreras: ["Medicina", "Enfermería", "Fisioterapia", "Odontología", "Psicología", "Biología", "Farmacia"],
        intereses: "Cuidado de la vida y ciencia aplicada.",
        habilidades: "Empatía y precisión científica.",
        fortalezas: "Resolución de problemas complejos.",
        a_desarrollar: "Manejo de estrés en entornos críticos.",
        sector_laboral: "Hospitales, centros de investigación y laboratorios."
    },
    "Defensa y Seguridad": {
        descripcion: "Te interesa proteger, servir y mantener el orden social. Tienes disposición para trabajar en ambientes estructurados con protocolos claros y objetivos colectivos. Tu vocación se orienta hacia carreras que requieren disciplina, responsabilidad y compromiso con la comunidad.",
        carreras: ["Fuerzas Militares", "Policía Nacional", "Bomberos", "Seguridad y Salud en el Trabajo", "Administración de Defensa", "Tecnologías de Seguridad"],
        intereses: "Servicio a la comunidad y orden social.",
        habilidades: "Disciplina y trabajo bajo protocolo.",
        fortalezas: "Responsabilidad y compromiso ético.",
        a_desarrollar: "Flexibilidad ante cambios no estructurados.",
        sector_laboral: "Instituciones públicas y seguridad corporativa."
    },
    "Humanidades y Ciencias Sociales": {
        descripcion: "Te apasiona comprender el comportamiento humano, la sociedad y las cuestiones legales. Disfrutas del análisis crítico, el debate de ideas y la defensa de causas justas. Tu interés se centra en cómo funcionan las sociedades y cómo mejorarlas.",
        carreras: ["Derecho", "Ciencia Política", "Trabajo Social", "Sociología", "Antropología", "Filosofía", "Historia"],
        intereses: "Justicia social y comportamiento humano.",
        habilidades: "Análisis crítico y debate.",
        fortalezas: "Comunicación asertiva y empatía social.",
        a_desarrollar: "Competencias digitales avanzadas.",
        sector_laboral: "ONGs, entidades gubernamentales y justicia."
    },
    "Ingenierías y Computación": {
        descripcion: "Te fascina el diseño, la construcción y la tecnología. Disfrutas resolviendo problemas técnicos complejos y creando soluciones innovadoras. Tu pensamiento lógico y analítico te permite sobresalir en campos que requieren precisión y creatividad tecnológica.",
        carreras: ["Ingeniería Civil", "Ingeniería de Sistemas", "Ingeniería Industrial", "Ingeniería Biomédica", "Tecnologías de la Información", "Ingeniería Mecánica", "Electrónica"],
        intereses: "Tecnología, construcción e innovación.",
        habilidades: "Pensamiento lógico y resolución técnica.",
        fortalezas: "Precisión y diseño de sistemas.",
        a_desarrollar: "Habilidades de comunicación interpersonal.",
        sector_laboral: "Industria tecnológica, construcción y software."
    }
};

function esc(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function notifKey(part) {
    return 'chaside_notif_' + String(sess?.identificacion || 'anon') + '_' + part;
}

function setBadgeText(id, n, variant) {
    const el = document.getElementById(id);
    if (!el) return;
    variant = variant || 'danger';
    if (n > 0) {
        el.textContent = n > 99 ? '99+' : String(n);
        el.style.display = 'inline-flex';
        el.classList.add('menu-badge');
        el.classList.remove('menu-badge--muted', 'menu-badge--ok');
        if (variant === 'muted') el.classList.add('menu-badge--muted');
        if (variant === 'ok') el.classList.add('menu-badge--ok');
    } else {
        el.textContent = '';
        el.style.display = 'none';
        el.classList.remove('menu-badge', 'menu-badge--muted', 'menu-badge--ok');
    }
}

/**
 * Convierte un número a letras (Formato para facturación COP)
 */
function numeroALetras(num) {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = { 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE' };

    if (num === 0) return 'CERO PESOS M/CTE';
    
    // Versión simplificada para el rango de precios del sistema (miles y millones)
    const format = (v) => {
        if (v >= 1000000) {
            const mill = Math.floor(v / 1000000);
            return (mill === 1 ? 'UN MILLÓN ' : format(mill) + ' MILLONES ') + format(v % 1000000);
        }
        if (v >= 1000) {
            const mil = Math.floor(v / 1000);
            return (mil === 1 ? 'MIL ' : format(mil) + ' MIL ') + format(v % 1000);
        }
        if (v >= 100) {
            const cent = Math.floor(v / 100);
            const nombres = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETENCIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
            return (v === 100 ? 'CIENTO' : nombres[cent]) + ' ' + format(v % 100);
        }
        if (v >= 10 && v <= 19) return (especiales[v] || 'DIECI' + unidades[v % 10]) + ' ';
        if (v >= 20) return decenas[Math.floor(v / 10)] + (v % 10 > 0 ? ' Y ' + unidades[v % 10] : '') + ' ';
        return unidades[v] + ' ';
    };

    const resultado = format(Math.floor(num)).trim();
    return `SON ${resultado} PESOS M/CTE.`.toUpperCase();
}

async function refreshNotifBadges() {
    const wrap = document.getElementById('headerNotifWrap');
    const hCount = document.getElementById('headerNotifCount');
    if (!sess) {
        if (wrap) wrap.style.display = 'none';
        return;
    }
    let headerTotal = 0;
    try {
        if (wrap) wrap.style.display = 'flex';

        // CORRECCIÓN RLS: Las consultas directas a tcolegios y tsolicitudes_aplicacion
        // fallan con auth custom porque auth.uid()=null. Se usa RPC SECURITY DEFINER
        // que salta el RLS y aplica la lógica de acceso por rol en el servidor.
        const seen = localStorage.getItem(notifKey('admin_sol_seen')) || '1970-01-01T00:00:00.000Z';
        const { data: res, error } = await _s.rpc('obtener_conteos_notificaciones_seguro', {
            p_usuario_id: String(sess.id),
            p_rol: sess.rol,
            p_seen_timestamp: seen,
            p_hoy: todayLocalISODate()
        });

        if (error || res?.status === 'error') {
            console.warn('refreshNotifBadges RPC error:', error?.message || res?.message);
            return;
        }

        const c = res.data || {};

        if (sess.rol === 'admin') {
            setBadgeText('navBadgeAdminSolic', c.unread_sol || 0, 'danger');
            headerTotal = c.pend_sol || 0;
        } else if (sess.rol === 'distribuidor') {
            setBadgeText('navBadgeDistSolic', c.pend_dist || 0, 'danger');
            headerTotal = c.pend_dist || 0;
        } else if (sess.rol === 'estudiante') {
            if ((c.pend_grupo || 0) > 0) {
                setBadgeText('navBadgeStudent', c.pend_grupo, 'danger');
                headerTotal = c.pend_grupo;
            } else if ((c.can_take || 0) > 0) {
                setBadgeText('navBadgeStudent', 1, 'ok');
                headerTotal = 1;
            } else {
                setBadgeText('navBadgeStudent', 0, 'danger');
            }
        } else {
            setBadgeText('navBadgeRector', 0, 'danger');
            headerTotal = 0;
        }

        if (hCount && wrap) {
            if (headerTotal > 0) {
                hCount.textContent = headerTotal > 99 ? '99+' : String(headerTotal);
                hCount.style.display = 'flex';
            } else {
                hCount.style.display = 'none';
            }
        }
    } catch (e) {
        console.warn('refreshNotifBadges', e);
    }
}

async function loadDepts() {
    // REFUERZO SEGURIDAD: Usar RPC unificada para departamentos
    const { data: res } = await _s.rpc('obtener_departamentos_sistema_seguro');
    const data = res?.data || [];
    return data.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
}

async function getRectorSchool() {
    if (!sess || !sess.id) return { data: null, error: 'Sesión no iniciada' };
    
    // REFUERZO SEGURIDAD: Asegurar conversión a String para evitar errores de candidatos en PostgREST
    const { data: res, error } = await _s.rpc('fn_obtener_colegio_rector', {
        p_rector_id: String(sess.id)
    });

    // Estandarización: Obtenemos el objeto 'data' dentro de la respuesta
    const result = res?.data?.data || res?.data || res || null;
    return { data: result, error: null };
}

function todayLocalISODate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchStudentGroupId() {
    if (!sess?.id) return null;
    // REFUERZO SEGURIDAD: Usar RPC para saltar bloqueo RLS en consulta directa (Problema de auth custom)
    const { data: res, error } = await _s.rpc('obtener_datos_estudiante_seguro', {
        p_estudiante_id: String(sess.id)
    });

    if (error || (res && res.status === 'error')) {
        const errObj = error || res;
        console.error('Detalle del Error RPC:', {
            mensaje: errObj.message,
            detalles: errObj.details,
            pista: errObj.hint,
            codigo: errObj.code
        });
        alert("Error de conexión con la base de datos: " + (errObj.message || "Desconocido"));
        return null;
    }
    // Estandarización: Intentamos obtener el ID del grupo de la ruta segura
    const result = res.data?.data || res.data || res;
    return result?.id_grupo || null;
}

function renderStudentBlocked(title, message) {
    document.getElementById('dynamicBoard').innerHTML = `
        <div class="card span-6" style="text-align:center; padding:40px; max-width:640px; margin:0 auto;">
            <i class="fa-solid fa-calendar-xmark" style="font-size:3rem; color:var(--secondary); margin-bottom:20px;"></i>
            <h2 style="margin-bottom:15px;">${esc(title)}</h2>
            <p style="color:var(--secondary); line-height:1.6;">${esc(message)}</p>
            <button class="btn-main" style="width:auto; margin-top:28px;" onclick="logout()">Cerrar sesión</button>
        </div>`;
    setTimeout(() => { refreshNotifBadges(); }, 0);
}