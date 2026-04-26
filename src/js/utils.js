// ==========================================
// DESCRIPCIONES Y CARRERAS VOCACIONALES
// ==========================================
const AREAS_VOCACIONALES = {
    "Administrativas y Contables": {
        descripcion: "Te interesan la gestión, organización y los negocios. Tienes habilidades para la administración empresarial, análisis de datos financieros y liderazgo estratégico. Disfrutas trabajando en contextos empresariales y tomando decisiones basadas en información cuantitativa.",
        carreras: ["Contaduría", "Administración de Empresas", "Mercadeo", "Finanzas", "Economía", "Comercio Internacional", "Gestión de Recursos Humanos"]
    },
    "Artes y Creatividad": {
        descripcion: "Tienes un perfil creativo y artístico con capacidad de expresarte a través de diferentes medios visuales, auditivos o corporales. Disfrutas diseñando, creando soluciones innovadoras y comunicando ideas de forma original. Te destacas en ambientes que valoren la expresión personal y la innovación.",
        carreras: ["Diseño Gráfico", "Arquitectura", "Artes Plásticas", "Comunicación Social", "Música", "Diseño Industrial", "Cinematografía y Audiovisuales"]
    },
    "Ciencias de la Salud": {
        descripcion: "Te apasionan las ciencias naturales, la investigación científica y el cuidado de la salud. Disfrutas resolviendo problemas mediante el método científico y aplicando conocimientos exactos. Tu vocación está dirigida a mejorar la calidad de vida de las personas.",
        carreras: ["Medicina", "Enfermería", "Fisioterapia", "Odontología", "Psicología", "Biología", "Farmacia"]
    },
    "Defensa y Seguridad": {
        descripcion: "Te interesa proteger, servir y mantener el orden social. Tienes disposición para trabajar en ambientes estructurados con protocolos claros y objetivos colectivos. Tu vocación se orienta hacia carreras que requieren disciplina, responsabilidad y compromiso con la comunidad.",
        carreras: ["Fuerzas Militares", "Policía Nacional", "Bomberos", "Seguridad y Salud en el Trabajo", "Administración de Defensa", "Tecnologías de Seguridad"]
    },
    "Humanidades y Ciencias Sociales": {
        descripcion: "Te apasiona comprender el comportamiento humano, la sociedad y las cuestiones legales. Disfrutas del análisis crítico, el debate de ideas y la defensa de causas justas. Tu interés se centra en cómo funcionan las sociedades y cómo mejorarlas.",
        carreras: ["Derecho", "Ciencia Política", "Trabajo Social", "Sociología", "Antropología", "Filosofía", "Historia"]
    },
    "Ingenierías y Computación": {
        descripcion: "Te fascina el diseño, la construcción y la tecnología. Disfrutas resolviendo problemas técnicos complejos y creando soluciones innovadoras. Tu pensamiento lógico y analítico te permite sobresalir en campos que requieren precisión y creatividad tecnológica.",
        carreras: ["Ingeniería Civil", "Ingeniería de Sistemas", "Ingeniería Industrial", "Ingeniería Biomédica", "Tecnologías de la Información", "Ingeniería Mecánica", "Electrónica"]
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

async function refreshNotifBadges() {
    const wrap = document.getElementById('headerNotifWrap');
    const hCount = document.getElementById('headerNotifCount');
    if (!sess) {
        if (wrap) wrap.style.display = 'none';
        return;
    }
    let headerTotal = 0;
    try {
        if (sess.rol === 'admin') {
            if (wrap) wrap.style.display = 'flex';
            const seen = localStorage.getItem(notifKey('admin_sol_seen')) || '1970-01-01T00:00:00.000Z';
            const { count: unreadSol } = await _s.from('tsolicitudes_aplicacion').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente').gt('created_at', seen);
            const { count: pendSol } = await _s.from('tsolicitudes_aplicacion').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente');
            setBadgeText('navBadgeAdminSolic', unreadSol || 0, 'danger');
            headerTotal = pendSol || 0;
        } else if (sess.rol === 'distribuidor') {
            if (wrap) wrap.style.display = 'flex';
            const { data: mySch } = await _s.from('tcolegios').select('id').eq('id_dist', sess.id);
            const ids = (mySch || []).map(x => x.id);
            let pendMine = 0;
            if (ids.length) {
                const { count: pm } = await _s.from('tsolicitudes_aplicacion').select('*', { count: 'exact', head: true }).in('id_colegio', ids).eq('estado', 'pendiente');
                pendMine = pm || 0;
            }
            setBadgeText('navBadgeDistSolic', pendMine, 'danger');
            headerTotal = pendMine;
        } else if (sess.rol === 'estudiante') {
            if (wrap) wrap.style.display = 'flex';
            const gid = await fetchStudentGroupId();
            let pendG = 0, canTake = 0;
            if (gid) {
                const { count: p } = await _s.from('tsolicitudes_aplicacion').select('*', { count: 'exact', head: true }).eq('id_grupo', gid).eq('estado', 'pendiente');
                pendG = p || 0;
                const t = todayLocalISODate();
                const { count: c } = await _s.from('tsolicitudes_aplicacion').select('*', { count: 'exact', head: true }).eq('id_grupo', gid).eq('estado', 'aprobada').lte('fecha_inicio', t).gte('fecha_fin', t);
                canTake = c || 0;
            }
            if (pendG > 0) {
                setBadgeText('navBadgeStudent', pendG, 'danger');
                headerTotal = pendG;
            } else if (canTake > 0) {
                setBadgeText('navBadgeStudent', 1, 'ok');
                headerTotal = 1;
            } else {
                setBadgeText('navBadgeStudent', 0, 'danger');
            }
        } else {
            if (wrap) wrap.style.display = 'flex';
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
    const { data } = await _s.from('tdepartamentos').select('id, nombre').order('nombre');
    return (data || []).map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
}

async function getRectorSchool() {
    const { data, error } = await _s.from('tcolegios').select('id, nombre, dane, resultados_habilitados').eq('id_rector', sess.id).single();
    if (error && error.message && error.message.toLowerCase().includes('resultados_habilitados')) {
        const fallback = await _s.from('tcolegios').select('id, nombre, dane').eq('id_rector', sess.id).single();
        return { data: fallback.data, error: fallback.error };
    }
    return { data, error };
}

function todayLocalISODate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchStudentGroupId() {
    if (!sess?.id) return null;
    const { data, error } = await _s.from('testudiantes').select('id_grupo').eq('id', sess.id).maybeSingle();
    if (error) { console.warn('fetchStudentGroupId', error); return null; }
    return data?.id_grupo || null;
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