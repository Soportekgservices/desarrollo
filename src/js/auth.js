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

async function authStepOne() {
    const tipodoc = document.getElementById('lTipoDoc').value;
    const id = document.getElementById('lId').value;

    if (!tipodoc || !id) return alert("Selecciona tu tipo de documento e ingresa tu identificación.");

    // Consultamos la VISTA para obtener datos del perfil e institución en un solo viaje
    // REFUERZO SEGURIDAD: Usar RPC para obtener perfil público sin password_hash
    const { data: rpcRes, error: rpcError } = await _s.rpc('obtener_perfil_usuario_publico', {
        p_identificacion: id,
        p_tipodoc: tipodoc
    });

    if (rpcError || rpcRes.status === 'error') {
        return alert(rpcRes?.message || "Error de acceso: " + rpcError?.message);
    }

    const data = rpcRes.user;

    if (!data) { // Aunque el RPC ya maneja esto, es una doble verificación
        return alert("Usuario no encontrado. Verifique sus datos.");
    }

    // Guardamos el usuario encontrado temporalmente
    window.tempUser = data;

    // Mostramos información de bienvenida
    const welcomeDiv = document.getElementById('userWelcomeInfo');
    welcomeDiv.innerHTML = '👋 Hola, <strong>' + data.nombre + '</strong>.<br>Vas a ingresar como <strong>' + data.rol.toUpperCase() + '</strong> de <strong>' + data.nombre_institucion + '</strong>.';

    // Si el usuario no tiene contraseña, le avisamos que debe crear una
    if (data.tiene_password === false || data.debe_cambiar_password === true) {
        document.getElementById('lPass').placeholder = "Crea tu nueva contraseña";
        welcomeDiv.innerHTML += '<br><span style="color:var(--danger); font-weight:600;">⚠️ Debes establecer tu contraseña para continuar.</span>';
    }

    // Cambiamos la UI para el paso de contraseña
    document.getElementById('passwordArea').style.display = 'block';
    document.getElementById('lTipoDoc').disabled = true;
    document.getElementById('lId').disabled = true;
    
    // Mostrar y resetear el Captcha
    /* DESHABILITADO PARA PRUEBAS LOCALES: Descomenta este bloque para mostrar el captcha al identificar el usuario
    const captchaCont = document.getElementById('captcha-container');
    if (captchaCont) {
        captchaCont.style.display = 'block';
        if (window.grecaptcha) grecaptcha.reset();
    }
    */
    
    const btn = document.getElementById('btnAuth');
    btn.innerText = "INGRESAR AL SISTEMA";
    btn.setAttribute('onclick', 'authStepTwo()');
}

async function authStepTwo() {
    const pass = document.getElementById('lPass').value;
    const user = window.tempUser;

    if (!pass) return alert("Por favor, ingresa tu contraseña.");

    // Validación de Google reCAPTCHA
    /* DESHABILITADO PARA PRUEBAS LOCALES: Descomenta este bloque para obligar la resolución del captcha antes de entrar
    if (window.grecaptcha) {
        const response = grecaptcha.getResponse();
        if (!response) {
            return alert("Por favor, completa el captcha de seguridad para continuar.");
        }
    }
    */

    // REFUERZO SEGURIDAD: Validación en servidor mediante RPC
    const { data: res, error: rpcError } = await _s.rpc('validar_acceso_sistema', {
        p_identificacion: user.identificacion,
        p_tipodoc: user.tipodoc,
        p_password: pass
    });

    if (rpcError || res.status === 'error') {
        return alert(res?.message || "Error de autenticación.");
    }

    // Si el usuario es nuevo, marcamos que ya estableció su clave
    if (res.user.debe_cambiar_password) {
        // REFUERZO SEGURIDAD: Usar RPC para guardar contraseña sin permisos de tabla
        await _s.rpc('establecer_password_usuario', { p_usuario_id: String(res.user.id), p_password: pass });
        res.user.debe_cambiar_password = false;
    }

    // Login Exitoso: Usamos el objeto devuelto por el servidor (ya no contiene el hash)
    sess = res.user;
    // Guardar en el almacenamiento local para persistencia (F5)
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