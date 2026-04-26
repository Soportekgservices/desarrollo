let sess = null;
let linkTestSchoolId = null;
let notifPollTimer = null;

// Variables para motor de pruebas dinámico
let dynamicQuestions = []; // Para motor dinámico
let answers = []; // Para motor dinámico
let step = 0;

// ==========================================
// SISTEMA DE AUTENTICACIÓN Y ACCESO
// ==========================================

async function authStepOne() {
    const tipodoc = document.getElementById('lTipoDoc').value;
    const id = document.getElementById('lId').value;

    if (!tipodoc || !id) return alert("Selecciona tu tipo de documento e ingresa tu identificación.");

    // Consultamos la VISTA para obtener datos del perfil e institución en un solo viaje
    const { data, error } = await _s.from('v_perfil_usuario')
        .select('*')
        .eq('identificacion', id)
        .eq('tipodoc', tipodoc)
        .maybeSingle();

    if (error) {
        return alert("Error de acceso: " + error.message);
    }
    if (!data) {
        return alert("Usuario no encontrado. Verifique sus datos.");
    }

    // Guardamos el usuario encontrado temporalmente
    window.tempUser = data;

    // Mostramos información de bienvenida
    const welcomeDiv = document.getElementById('userWelcomeInfo');
    welcomeDiv.innerHTML = '👋 Hola, <strong>' + data.nombre + '</strong>.<br>Vas a ingresar como <strong>' + data.rol.toUpperCase() + '</strong> de <strong>' + data.nombre_institucion + '</strong>.';

    // Si el usuario no tiene contraseña, le avisamos que debe crear una
    if (!data.password_hash || data.debe_cambiar_password) {
        document.getElementById('lPass').placeholder = "Crea tu nueva contraseña";
        welcomeDiv.innerHTML += '<br><span style="color:var(--danger); font-weight:600;">⚠️ Debes establecer tu contraseña para continuar.</span>';
    }

    // Cambiamos la UI para el paso de contraseña
    document.getElementById('passwordArea').style.display = 'block';
    document.getElementById('lTipoDoc').disabled = true;
    document.getElementById('lId').disabled = true;
    
    const btn = document.getElementById('btnAuth');
    btn.innerText = "INGRESAR AL SISTEMA";
    btn.setAttribute('onclick', 'authStepTwo()');
}

async function authStepTwo() {
    const pass = document.getElementById('lPass').value;
    const user = window.tempUser;

    if (!pass) return alert("Por favor, ingresa tu contraseña.");

    // Caso 1: Usuario nuevo o debe cambiar clave
    if (!user.password_hash || user.debe_cambiar_password) {
        const { error: updateErr } = await _s.from('tusuario')
            .update({ password_hash: pass, debe_cambiar_password: false })
            .eq('id', user.id);
        
        if (updateErr) return alert("Error al guardar clave: " + updateErr.message);
        alert("¡Contraseña establecida con éxito! Bienvenido.");
    } 
    // Caso 2: Validación normal
    else if (pass !== user.password_hash) {
        return alert("Contraseña incorrecta. Inténtalo de nuevo.");
    }

    // Login Exitoso
    sess = user;
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
    location.reload();
}