let sess = null;
let linkTestSchoolId = null;
let notifPollTimer = null;

// Variables para motor de pruebas dinámico
let dynamicQuestions = []; // Para motor dinámico
let answers = []; // Para motor dinámico
let step = 0;

const SESSION_KEY = 'edueficiente_session';

// ==========================================
// SISTEMA DE AUTENTICACIÓN Y ACCESO
// ==========================================

async function authenticateUser() {
    const tipodoc = document.getElementById('lTipoDoc').value;
    const id = document.getElementById('lId').value.trim();
    const pass = document.getElementById('lPass').value;
    if (!tipodoc || !id || !pass)
        return alert("Por favor, completa todos los campos (Documento, Identificación y Contraseña).");
    // ---------- NUEVO BLOQUE ----------
    /* Garantizamos que el script de reCAPTCHA está cargado y listo.
       • Si el script ya está disponible usamos grecaptcha.ready().
       • Si falló en un intento previo lo volvemos a insertar una sola vez.
       • Si no carga después de un breve timeout mostramos un banner rojo. */
    await new Promise(resolve => {
        // 1️⃣ Script ya cargado y ready disponible
        if (window.grecaptcha && typeof grecaptcha.ready === 'function') {
            resolve();
            return;
        }
        // 2️⃣ Script cargado pero sin ready (carga síncrona)
        if (window.grecaptcha) {
            resolve();
            return;
        }
        // 3️⃣ El script falló antes o no está presente → lo insertamos
        if (window.recaptchaLoadFailed || !document.getElementById('recaptcha-loader')) {
            const old = document.getElementById('recaptcha-loader');
            if (old) old.remove();
            const s = document.createElement('script');
            s.id = 'recaptcha-loader';
            s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
            s.async = true;
            s.defer = true;
            s.onload = () => {
                if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.ready === 'function') {
                    grecaptcha.ready(() => resolve());
                } else {
                    resolve();
                }
            };
            s.onerror = () => showRecaptchaError();
            document.body.appendChild(s);
            return;
        }
        // 4️⃣ Último intento: esperamos brevemente por carga asíncrona
        setTimeout(() => {
            if (window.grecaptcha) resolve();
            else showRecaptchaError();
        }, 800);
    });
    // Si el banner de error está presente, abortamos el login.
    if (document.getElementById('recaptcha-error')) return;

    // Renderizamos el widget explícitamente si aún no existe
    if (window.grecaptcha && !document.querySelector('#captcha-container iframe')) {
        grecaptcha.render('captcha-container', {
            sitekey: '6LeImeUsAAAAAKp5_oCAyZ8mp8ozD64V1ArU9v4n',
            theme: 'light'
        });
    }
    // ----------------------------------
    // 1ª BARRERA: Validación de reCAPTCHA
    const captchaToken = grecaptcha.getResponse();
    if (!captchaToken) {
        return alert('Por favor, completa el captcha de seguridad para continuar.');
    }
    // 2ª BARRERA: Llamada a la RPC unificada
    const { data: res, error: rpcError } = await _s.rpc('login_unificado', {
        p_identificacion: id,
        p_tipodoc: tipodoc,
        p_password: pass,
        p_captcha_token: captchaToken
    });
    if (rpcError || res.status === 'error') {
        if (window.grecaptcha) grecaptcha.reset(); // Reiniciar para nuevo intento
        return alert(res?.message || rpcError?.message || "Error de autenticación.");
    }
    // Si el usuario es nuevo y debe cambiar la clave
    if (res.user.debe_cambiar_password) {
        const { data: pwRes, error: pwErr } = await _s.rpc('establecer_password_usuario', {
            p_usuario_id: String(res.user.id),
            p_password: pass
        });
        // Mensaje silencioso si falla; no interrumpe el flujo
        if (pwErr || pwRes?.status === 'error') { /* nada */ }
        res.user.debe_cambiar_password = false;
    }
    // Login exitoso – guardamos sesión y actualizamos UI
    sess = res.user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    document.getElementById('loginView').classList.remove('active');
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('userName').innerText = sess.nombre;
    document.getElementById('userTag').innerText = 'ID: ' + sess.identificacion;
    document.getElementById('userAvatar').innerText =
        (sess.nombre || 'U').substring(0, 2).toUpperCase();
    if (notifPollTimer) { clearInterval(notifPollTimer); notifPollTimer = null; }
    if (sess.rol === 'admin') viewAdmin();
    else if (sess.rol === 'distribuidor') viewDist();
    else if (sess.rol === 'rector') viewRector();
    else if (sess.rol === 'estudiante') await viewStudent();
    notifPollTimer = setInterval(refreshNotifBadges, 90000);
    setTimeout(() => refreshNotifBadges(), 400);
    if (window.grecaptcha) grecaptcha.reset();
}
/* Función auxiliar para mostrar el banner cuando reCAPTCHA falla */
function showRecaptchaError() {
    const login = document.getElementById('loginView');
    if (!login) return;
    const banner = document.createElement('div');
    banner.id = 'recaptcha-error';
    banner.style.cssText = `
        background:#ff4d4f; color:#fff; padding:12px;
        text-align:center; font-weight:600; animation:fadeIn .3s;
    `;
    banner.textContent = 'Error: reCAPTCHA no se cargó. Recarga la página e intenta de nuevo.';
    login.prepend(banner);
    const btn = document.getElementById('loginBtn');
    if (btn) btn.disabled = true;
}

// -------------------------------------------------
// Inicialización del reCAPTCHA (se ejecuta al cargar la página)
async function initRecaptcha() {
    // Garantizamos que el script de reCAPTCHA está presente y listo
    await new Promise(resolve => {
        if (window.grecaptcha && typeof grecaptcha.ready === 'function') {
            grecaptcha.ready(() => resolve());
            return;
        }
        if (window.grecaptcha) { resolve(); return; }
        const s = document.createElement('script');
        s.id = 'recaptcha-loader';
        s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        s.async = true;
        s.defer = true;
        s.onload = () => {
            if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.ready === 'function') {
                grecaptcha.ready(() => resolve());
            } else { resolve(); }
        };
        s.onerror = () => showRecaptchaError();
        document.body.appendChild(s);
    });
    if (document.getElementById('recaptcha-error')) return;
    // Renderizamos el widget si aún no existe
    if (window.grecaptcha && !document.querySelector('#captcha-container iframe')) {
        grecaptcha.render('captcha-container', {
            sitekey: '6LeImeUsAAAAAKp5_oCAyZ8mp8ozD64V1ArU9v4n',
            theme: 'light'
        });
    }
}

function backToSchoolList() {
    if (sess && sess.rol === 'admin') viewGlobalSchools();
    else viewDist();
}

async function logout() {
    if (!confirm("¿Estás seguro que deseas cerrar sesión?")) return;
    localStorage.removeItem(SESSION_KEY);
    location.reload();
}

/**
 * Recupera la sesión guardada en localStorage si existe
 */
async function checkPersistedSession() {
    const savedSess = localStorage.getItem(SESSION_KEY);
    if (savedSess) {
        try {
            sess = JSON.parse(savedSess);

            // Configurar Interfaz
            document.getElementById('loginView').classList.remove('active');
            document.getElementById('appContainer').style.display = 'flex';
            document.getElementById('userName').innerText = sess.nombre;
            document.getElementById('userTag').innerText = 'ID: ' + sess.identificacion;
            document.getElementById('userAvatar').innerText = (sess.nombre || 'U').substring(0, 2).toUpperCase();

            // Cargar vista según rol
            if (sess.rol === 'admin') viewAdmin();
            else if (sess.rol === 'distribuidor') viewDist();
            else if (sess.rol === 'rector') viewRector();
            else if (sess.rol === 'estudiante') await viewStudent();

            // Reiniciar polling de notificaciones
            notifPollTimer = setInterval(refreshNotifBadges, 90000);
            setTimeout(() => refreshNotifBadges(), 500);

        } catch (e) {
            console.error("Error al restaurar sesión:", e);
            localStorage.removeItem(SESSION_KEY);
        }
    }
}

// Ejecutar al cargar el archivo


/* Updated DOMContentLoaded to add touch handling */
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que Supabase y otros scripts estén listos
    setTimeout(checkPersistedSession, 100);
    // Inicializamos reCAPTCHA tan pronto como la página carga
    initRecaptcha();

    // Touch handling for login button to replace :hover on mobile
    const btnAuth = document.getElementById('btnAuth');
    if (btnAuth) {
        const addActive = () => btnAuth.classList.add('active');
        const removeActive = () => btnAuth.classList.remove('active');
        btnAuth.addEventListener('touchstart', addActive);
        btnAuth.addEventListener('touchend', removeActive);
        btnAuth.addEventListener('mousedown', addActive);
        btnAuth.addEventListener('mouseup', removeActive);
    }
});