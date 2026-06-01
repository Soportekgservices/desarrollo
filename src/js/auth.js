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

    if (!tipodoc || !id || !pass) return alert("Por favor, completa todos los campos (Documento, Identificación y Contraseña).");

    // 1ra BARRERA: Validación de Google reCAPTCHA en el cliente
    let captchaToken = null;
    if (window.grecaptcha) {
        captchaToken = grecaptcha.getResponse();
        if (!captchaToken) {
            return alert("Por favor, completa el captcha de seguridad para continuar.");
        }
    } else {
        return alert("El sistema de seguridad reCAPTCHA no se ha cargado correctamente.");
    }

    // 2da BARRERA: Llamada a la RPC unificada
    const { data: res, error: rpcError } = await _s.rpc('login_unificado', {
        p_identificacion: id,
        p_tipodoc: tipodoc,
        p_password: pass,
        p_captcha_token: captchaToken
    });

    if (rpcError || res.status === 'error') {
        if (window.grecaptcha) grecaptcha.reset(); // Reiniciar para un nuevo intento
        return alert(res?.message || rpcError?.message || "Error de autenticación.");
    }

    // Si el usuario es nuevo y no tenía contraseña, la base de datos devuelve debe_cambiar_password = true
    if (res.user.debe_cambiar_password) {
        // Guardamos la contraseña que acaba de escribir
        const { data: pwRes, error: pwErr } = await _s.rpc('establecer_password_usuario', {
            p_usuario_id: String(res.user.id),
            p_password: pass
        });
        if (pwErr || pwRes?.status === 'error') {
            // Silenciado: mensaje informativo no relevante para el flujo de login
        }
        res.user.debe_cambiar_password = false;
    }

    // Login Exitoso
    sess = res.user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    
    document.getElementById('loginView').classList.remove('active');
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('userName').innerText = sess.nombre;
    document.getElementById('userTag').innerText = 'ID: ' + sess.identificacion;
    document.getElementById('userAvatar').innerText = (sess.nombre || 'U').substring(0,2).toUpperCase();
    
    if (notifPollTimer) { clearInterval(notifPollTimer); notifPollTimer = null; }
    if(sess.rol === 'admin') viewAdmin();
    else if(sess.rol === 'distribuidor') viewDist();
    else if(sess.rol === 'rector') viewRector();
    else if(sess.rol === 'estudiante') await viewStudent();
    
    notifPollTimer = setInterval(refreshNotifBadges, 90000);
    setTimeout(() => refreshNotifBadges(), 400);

    if (window.grecaptcha) grecaptcha.reset();
}

function backToSchoolList() {
    if (sess && sess.rol === 'admin') viewGlobalSchools();
    else viewDist();
}

async function logout() {
    if(!confirm("¿Estás seguro que deseas cerrar sesión?")) return;
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
            document.getElementById('userAvatar').innerText = (sess.nombre || 'U').substring(0,2).toUpperCase();

            // Cargar vista según rol
            if(sess.rol === 'admin') viewAdmin();
            else if(sess.rol === 'distribuidor') viewDist();
            else if(sess.rol === 'rector') viewRector();
            else if(sess.rol === 'estudiante') await viewStudent();
            
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
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que Supabase y otros scripts estén listos
    setTimeout(checkPersistedSession, 100);
});