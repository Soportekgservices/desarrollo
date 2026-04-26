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
        <div class="card span-2"><span class="stat-num" id="totalEstudiantes">--</span><span class="stat-desc">Estudiantes Totales</span></div>
        <div class="card span-2"><span class="stat-num" id="estudiantesCompletaron">--</span><span class="stat-desc">Completaron Test</span></div>
        <div class="card span-2"><span class="stat-num" id="pruebasActivas">--</span><span class="stat-desc">Pruebas Activas</span></div>
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
        const { data: school } = await getRectorSchool();
        if (!school) return;
        const { data: groups } = await _s.from('tgrupos').select('id').eq('id_colegio', school.id);
        const groupIds = (groups || []).map(g => g.id);
        const totalEstudiantes = groupIds.length ? await _s.from('testudiantes').select('id', { count: 'exact', head: true }).in('id_grupo', groupIds) : { count: 0 };
        const estudiantesIds = groupIds.length ? (await _s.from('testudiantes').select('id').in('id_grupo', groupIds)).data.map(e => e.id) : [];
        const estudiantesCompletaron = estudiantesIds.length ? await _s.from('tresultados').select('id', { count: 'exact', head: true }).in('id_estudiante', estudiantesIds) : { count: 0 };
        const today = new Date().toISOString().split('T')[0];
        const { count: pruebasActivas } = await _s.from('tsolicitudes_aplicacion').select('id', { count: 'exact', head: true }).eq('id_colegio', school.id).eq('estado', 'aprobada').lte('fecha_inicio', today).gte('fecha_fin', today);
        
        if (document.getElementById('totalEstudiantes')) document.getElementById('totalEstudiantes').innerText = (totalEstudiantes.count || 0) || 0;
        if (document.getElementById('estudiantesCompletaron')) document.getElementById('estudiantesCompletaron').innerText = (estudiantesCompletaron.count || 0) || 0;
        if (document.getElementById('pruebasActivas')) document.getElementById('pruebasActivas').innerText = pruebasActivas || 0;
        if (document.getElementById('pruebasActivasText')) document.getElementById('pruebasActivasText').innerText = pruebasActivas || 0;
        if (document.getElementById('resultadosHabilitados')) document.getElementById('resultadosHabilitados').innerText = school.resultados_habilitados ? 'Sí' : 'No';
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
    const { data, error } = await _s.from('tsolicitudes_aplicacion').select(`
        id, fecha_inicio, fecha_fin, estado,
        tpruebas ( nombre ),
        tgrados ( nombre ),
        tgrupos ( nombre )
    `).eq('id_colegio', school.id).eq('estado', 'aprobada').lte('fecha_inicio', today).gte('fecha_fin', today);

    let content = `<div class="card span-6"><h3>Pruebas Activas</h3><div id="pruebasContainer">`;

    if (error) content += `<p style="color: var(--danger);">Error cargando pruebas: ${error.message}</p>`; // Originalmente en una línea
    else if (!data || data.length === 0) content += `<p style="text-align: center; padding: 40px; color: var(--secondary);">No hay pruebas activas en este momento.</p>`; // Originalmente en una línea
    else {
        content += `<table class="data-table"><thead><tr><th>Prueba</th><th>Grado</th><th>Grupo</th><th>Fecha Inicio</th><th>Fecha Fin</th></tr></thead><tbody>`;
        data.forEach(prueba => {
            content += `<tr><td>${prueba.tpruebas?.nombre || 'N/A'}</td><td>${prueba.tgrados?.nombre || 'N/A'}</td><td>${prueba.tgrupos?.nombre || 'N/A'}</td><td>${new Date(prueba.fecha_inicio).toLocaleDateString('es-ES')}</td><td>${new Date(prueba.fecha_fin).toLocaleDateString('es-ES')}</td></tr>`;
        });
        content += `</tbody></table>`;
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
    const { data, error } = await _s.from('tgrupos').select(`id_grado, tgrados (id, nombre, numero)`).eq('id_colegio', schoolId);
    if (error) return container.innerHTML = "Error cargando grados.";
    const uniqueGrades = []; const map = new Map();
    for (const item of data) { if(item.tgrados && !map.has(item.tgrados.id)){ map.set(item.tgrados.id, true); uniqueGrades.push(item.tgrados); } }
    uniqueGrades.sort((a, b) => a.numero - b.numero);
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
    const { data, error } = await _s.from('tgrupos').select('*').eq('id_grado', gradeId).eq('id_colegio', schoolId).order('nombre');
    if (error) return;
    if (data.length === 0) { container.innerHTML = "<p style='color:var(--secondary); font-size:0.85rem;'>No hay grupos creados para este grado.</p>"; return; }
    container.innerHTML = data.map(g => `<div class="pill-btn" id="rector-group-${g.id}" onclick="selectRectorGroup(${g.id}, this)"><span>${g.nombre}</span></div>`).join('');
}

async function selectRectorGroup(groupId, el) {
    document.querySelectorAll('.pill-btn').forEach(i => i.classList.remove('active')); el.classList.add('active');
    document.getElementById('rectorStudentCard').style.display = "block"; loadRectorStudents(groupId);
}

async function loadRectorStudents(groupId) {
    const container = document.getElementById('rectorStudentsTableContainer');
    const { data: estudiantes, error: estError } = await _s.from('testudiantes').select(`id, nombre, tipodoc, tusuario (identificacion, tipodoc)`).eq('id_grupo', groupId).order('nombre');
    if (estError) { container.innerHTML = `<p style="color: var(--danger);">Error cargando estudiantes: ${estError.message}</p>`; return; }
    if (!estudiantes || estudiantes.length === 0) { container.innerHTML = `<p style="text-align: center; padding: 30px; color: var(--secondary);">Este grupo no tiene estudiantes cargados.</p>`; return; }
    container.innerHTML = `<table class="student-table"><thead><tr><th>Tipo</th><th>Documento</th><th>Nombre Completo</th></tr></thead><tbody>${estudiantes.map(est => `<tr><td><span class="badge" style="background:#e2e8f0; color:#475569;">${est.tusuario?.tipodoc || est.tipodoc || '—'}</span></td><td><span class="badge badge-pending" style="font-family:monospace;">${est.tusuario?.identificacion || 'S/N'}</span></td><td><strong>${est.nombre}</strong></td></tr>`).join('')}</tbody></table>`;
}

async function viewRectorInformes() {
    document.getElementById('pageTitle').innerText = "Informes y Resultados";
    document.getElementById('pageDesc').innerText = "Informes individuales y grupales.";
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Panel de Informes</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;"><div style="text-align: center; padding: 30px; border: 2px solid var(--primary); border-radius: 8px; cursor: pointer;" onclick="viewIndividualReports()"><i class="fa-solid fa-user" style="font-size: 3rem; color: var(--primary); margin-bottom: 15px;"></i><h4>Informes Individuales</h4><p style="color: var(--secondary); margin-top: 10px;">Ver resultados de estudiantes específicos</p></div><div style="text-align: center; padding: 30px; border: 2px solid var(--success); border-radius: 8px; cursor: pointer;" onclick="viewGroupReports()"><i class="fa-solid fa-users" style="font-size: 3rem; color: var(--success); margin-bottom: 15px;"></i><h4>Informes Grupales</h4><p style="color: var(--secondary); margin-top: 10px;">Análisis estadístico por grado/grupo</p></div></div></div>`;
}

let currentReportSchoolId = null;

async function viewIndividualReports(forcedSchoolId = null) {
    currentReportSchoolId = forcedSchoolId;
    document.getElementById('pageTitle').innerText = "Informes Individuales";
    document.getElementById('pageDesc').innerText = "Selecciona un alumno por grado para ver su informe.";
    
    let schoolId, schoolName = "Institución";
    if (forcedSchoolId) {
        schoolId = forcedSchoolId;
        const { data: col } = await _s.from('tcolegios').select('nombre').eq('id', schoolId).single();
        if(col) schoolName = col.nombre;
    } else {
        const { data: school } = await getRectorSchool();
        if (!school) { document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Sin Colegio Asignado</h3></div>`; return; }
        schoolId = school.id;
        schoolName = school.nombre;
    }

    const backBtnHtml = forcedSchoolId 
        ? `<button class="btn-main" style="width:auto; padding:8px 15px; background:var(--secondary);" onclick="viewSchoolReportsPanel('${schoolId}', '${schoolName}')">Volver al Panel</button>`
        : `<button class="btn-main" style="width:auto; padding:8px 15px; background:var(--secondary);" onclick="viewRectorInformes()">Volver</button>`;

    const { data: assignments } = await _s.from('tsolicitudes_aplicacion').select(`id_grado, id_grupo, tgrados ( nombre ), tgrupos ( nombre )`).eq('id_colegio', schoolId).eq('estado', 'aprobada').order('id_grado', { ascending: true });
    if (!assignments || assignments.length === 0) { document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><h3>Sin pruebas asignadas</h3></div>`; return; }
    const gradeMap = new Map(); const assignedGroupIds = new Set();
    assignments.forEach(assign => { if (!assign.id_grado) return; if (!gradeMap.has(assign.id_grado)) { gradeMap.set(assign.id_grado, { id: assign.id_grado, nombre: assign.tgrados?.nombre || `Grado ${assign.id_grado}`, grupos: new Map() }); } const gradeEntry = gradeMap.get(assign.id_grado); if (assign.id_grupo) { assignedGroupIds.add(assign.id_grupo); gradeEntry.grupos.set(assign.id_grupo, assign.tgrupos?.nombre || `Grupo ${assign.id_grupo}`); } }); // Originalmente en una línea
    const groupIds = Array.from(assignedGroupIds);
    const { data: estudiantes } = groupIds.length ? await _s.from('testudiantes').select(`id, nombre, id_grado, id_grupo, tgrupos ( nombre ), tgrados ( nombre )`).in('id_grupo', groupIds) : { data: [] };
    const studentIds = (estudiantes || []).map(e => e.id).filter(Boolean); const completedSet = new Set(); // Originalmente en una línea
    if (studentIds.length) { const { data: resultados } = await _s.from('tresultados').select('id, id_estudiante').in('id_estudiante', studentIds); (resultados || []).forEach(r => completedSet.add(r.id_estudiante)); }
    const studentsByGrade = new Map(); (estudiantes || []).forEach(est => { if (!studentsByGrade.has(est.id_grado)) { studentsByGrade.set(est.id_grado, []); } studentsByGrade.get(est.id_grado).push(est); });
    let content = `<div class="card span-6"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h3>Estudiantes con prueba asignada</h3>${backBtnHtml}</div><div style="margin-top: 20px;">`;
    for (const [gradeId, gradeEntry] of gradeMap.entries()) {
        const gradeStudents = studentsByGrade.get(gradeId) || []; const total = gradeStudents.length; const completed = gradeStudents.filter(s => completedSet.has(s.id)).length; const pending = total - completed;
        const groupDetails = Array.from(gradeEntry.grupos.entries()).map(([groupId, groupName]) => { const groupStudents = gradeStudents.filter(s => s.id_grupo === groupId); if (!groupStudents.length) return ''; return `<div style="margin-bottom: 20px;"><h5 style="margin-bottom: 10px; color: var(--primary);">Grupo ${groupName}</h5>${groupStudents.map(st => `<div style="padding: 12px; margin-bottom: 8px; border: 1px solid #e0e0e0; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; background:#fff; ${completedSet.has(st.id) ? 'cursor:pointer;' : ''}" ${completedSet.has(st.id) ? `onclick="viewInformeEstudiante('${st.id}')"` : ''}><div><strong>${st.nombre || 'Sin nombre'}</strong><br><small style="color: var(--secondary);">${st.tgrados?.nombre || 'Sin grado'}</small></div><span style="padding: 4px 10px; border-radius: 999px; font-size:0.8rem; ${completedSet.has(st.id) ? 'background: var(--success); color: white;' : 'background: var(--danger); color: white;'}">${completedSet.has(st.id) ? 'Completado' : 'Pendiente'}</span></div>`).join('')}</div>`; }).join('');
        content += `<details style="margin-bottom:18px; border:1px solid #d1d5db; border-radius:10px; overflow:hidden; background:#fff;"><summary style="padding:18px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:600; background:#f9fafb;"><span>${gradeEntry.nombre} - ${total} asignados / ${completed} completados / ${pending} pendientes</span><span style="font-size:0.9rem; color:var(--secondary);">Ver</span></summary><div style="padding:20px; border-top:1px solid #e5e7eb;">${groupDetails || '<p style="color: var(--secondary);">No hay estudiantes.</p>'}</div></details>`;
    }
    document.getElementById('dynamicBoard').innerHTML = content + `</div></div>`;
}

async function viewInformeEstudiante(eid) {
    const { data: studentDataPreview } = await _s.from('testudiantes').select('id, id_grupo, tgrupos ( id_colegio )').eq('id', eid).single();
    const colegioId = studentDataPreview.tgrupos?.id_colegio;
    const { data: colegioData } = await _s.from('tcolegios').select('resultados_habilitados').eq('id', colegioId).single();
    if (!colegioData?.resultados_habilitados && sess.rol !== 'admin' && sess.rol !== 'distribuidor') return alert("Los resultados no están disponibles. El distribuidor debe habilitar la visualización.");
    const { data: res } = await _s.from('tresultados').select('*, tpruebas(nombre)').eq('id_estudiante', eid).single(); // Originalmente en una línea
    const { data: st } = await _s.from('testudiantes').select('*, tcolegios(nombre), tgrados(nombre), tgrupos(nombre), tusuario(identificacion)').eq('id', eid).single(); // Originalmente en una línea
    const resultados = JSON.parse(res.respuestas || '{}'); const areas = Object.keys(resultados); const puntuaciones = areas.map(a => resultados[a]); // Originalmente en una línea
    const maxScore = Math.max(...puntuaciones); const dominant = areas[puntuaciones.indexOf(maxScore)]; const areaInfo = AREAS_VOCACIONALES[dominant]; // Originalmente en una línea
    const colegio = st?.tcolegios?.nombre || 'No especificado';
    document.getElementById('dynamicBoard').innerHTML = `
        <div id="informe-visual" class="span-6">
            <header><div class="logo"><h2 style="margin:0; color:white; font-size:24px;">EduEficiente</h2></div><div class="titulo-informe"><h1>INFORME DE ORIENTACIÓN VOCACIONAL</h1><p>${colegio}</p><p style="margin-top:8px; font-size:0.9rem; opacity:0.85;">Fecha: ${new Date().toLocaleDateString('es-ES')}</p></div></header>
            <section class="info-estudiante" style="display: flex; justify-content: space-between; padding: 20px 40px; background: var(--color-gris-claro); border-bottom: 1px solid #e0e0e0;"><div style="flex: 1;"><p style="margin: 0 0 8px 0;"><strong>Nombre:</strong> ${st?.nombre}</p><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;"><div><p style="margin: 0; font-size: 0.85rem;"><strong>ID:</strong> ${st?.tusuario?.identificacion}</p></div><div><p style="margin: 0; font-size: 0.85rem;"><strong>Grado:</strong> ${st?.tgrados?.nombre}</p></div><div><p style="margin: 0; font-size: 0.85rem;"><strong>Grupo:</strong> ${st?.tgrupos?.nombre}</p></div></div></div></section>
            <main><div class="columna-izquierda"><table><thead><tr><th>Área</th><th>Puntaje</th></tr></thead><tbody>${areas.map((a, i) => `<tr><td>${a}</td><td>${puntuaciones[i]}%</td></tr>`).join('')}</tbody></table><div class="area-dominante"><div class="seccion-titulo">Área dominante:</div><div class="seccion-contenido"><p><strong>${dominant}</strong> (${maxScore}%)</p></div></div><div class="descripcion"><div class="seccion-titulo">Descripción:</div><div class="seccion-contenido"><p>${areaInfo ? areaInfo.descripcion : ''}</p></div></div></div><div class="columna-derecha"><div class="grafico-container"><canvas id="radarChartRector"></canvas></div><div class="carreras-sugeridas"><div class="seccion-titulo">Carreras sugeridas:</div><div class="seccion-contenido"><ul>${areaInfo ? areaInfo.carreras.map(c => `<li>${c}</li>`).join('') : ''}</ul></div></div></div></main>
            <footer>En EduEficiente acompañamos tu descubrimiento.</footer>
        </div>
        <div style="text-align:center; margin-top:20px;"><button onclick="viewIndividualReports('${currentReportSchoolId || ''}')" class="btn-main" style="width:auto; padding:12px 30px;">Volver</button></div>`;
    const ctx = document.getElementById('radarChartRector').getContext('2d');
    new Chart(ctx, { 
        type: 'radar', 
        data: { labels: areas, datasets: [{ data: puntuaciones, fill: true, backgroundColor: 'rgba(30, 58, 95, 0.3)', borderColor: 'rgb(30, 58, 95)' }] }, 
        options: { 
            maintainAspectRatio: false, 
            animation: { duration: 1000, easing: 'easeInOutQuart' },
            scales: { r: { suggestedMin: 0, suggestedMax: 100, pointLabels: { font: { size: 12, family: 'Montserrat, sans-serif' } } } }, 
            plugins: { 
                legend: { display: false }, 
                datalabels: { 
                    color: '#333', 
                    font: { weight: 'bold' },
                    formatter: (v) => v + '%' 
                } 
            } 
        } 
    });
}

async function viewRectorInformesGrupales() {
    document.getElementById('pageTitle').innerText = "Informes Grupales";
    const { data: school } = await getRectorSchool();
    document.getElementById('dynamicBoard').innerHTML = `<div class="card span-6"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h3>Análisis por Grado y Grupo</h3><div id="rectorGroupSelectorContainer"></div></div><div id="groupReportContent"><p style="text-align:center; color:var(--secondary); padding:40px;">Selecciona un grado para ver estadísticas.</p></div></div>`;
    const { data: gradRows } = await _s.from('tgrupos').select('id_grado, tgrados(id, nombre, numero)').eq('id_colegio', school.id);
    const uniqueGrades = [...new Map(gradRows.filter(r => r.tgrados).map(r => [r.id_grado, r.tgrados])).values()].sort((a,b) => a.numero - b.numero);
    document.getElementById('rectorGroupSelectorContainer').innerHTML = `<select id="selReportGrade" class="pill-btn" style="width:auto; height:auto; padding:8px 15px;" onchange="loadGroupReportData(${school.id})"><option value="">Seleccionar Grado</option>${uniqueGrades.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('')}</select>`;
}

async function loadGroupReportData(schoolId) {
    const gradeId = document.getElementById('selReportGrade').value;
    const container = document.getElementById('groupReportContent');
    if(!gradeId) return;
    container.innerHTML = `<div class="empty-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Calculando métricas...</div>`;
    const { data: students } = await _s.from('testudiantes').select('id, nombre').eq('id_grado', gradeId).eq('id_colegio', schoolId); // Originalmente en una línea
    if(!students?.length) { container.innerHTML = `<p class="empty-msg">No hay estudiantes.</p>`; return; } // Originalmente en una línea
    const studentIds = students.map(s => s.id); const studentMap = Object.fromEntries(students.map(s => [s.id, s.nombre])); // Originalmente en una línea
    const { data, error } = await _s.from('tresultados').select('respuestas, id_estudiante').in('id_estudiante', studentIds); // Originalmente en una línea
    if(!data?.length) { container.innerHTML = `<p class="empty-msg">Sin datos suficientes.</p>`; return; } // Originalmente en una línea
    const areaTotals = {}; const areaCounts = {}; const studentsByArea = {}; const interestLevels = { Alto: 0, Medio: 0, Bajo: 0 }; // Originalmente en una línea
    let highScoresSum = 0; let studentsAtRisk = 0; // Originalmente en una línea
    Object.keys(AREAS_VOCACIONALES).forEach(a => { areaTotals[a] = 0; areaCounts[a] = 0; studentsByArea[a] = []; }); // Originalmente en una línea
    data.forEach(r => { try { const res = typeof r.respuestas === 'string' ? JSON.parse(r.respuestas) : r.respuestas; let studentMax = -1; let dominantArea = ""; Object.entries(res).forEach(([area, val]) => { if (typeof val === 'number') { areaTotals[area] += val; areaCounts[area]++; if(val > studentMax) { studentMax = val; dominantArea = area; } } }); if(dominantArea) studentsByArea[dominantArea].push(studentMap[r.id_estudiante]); highScoresSum += studentMax; if(studentMax >= 75) interestLevels.Alto++; else if(studentMax >= 40) interestLevels.Medio++; else { interestLevels.Bajo++; studentsAtRisk++; } } catch(e){} }); // Originalmente en una línea
    const averages = Object.keys(areaTotals).map(area => ({ area, score: Math.round(areaTotals[area] / (areaCounts[area] || 1)) })).sort((a,b) => b.score - a.score); // Originalmente en una línea
    const topArea = averages[0]?.area || "N/A"; const avgMaturity = Math.round(highScoresSum / (data.length || 1)); const maturityLabel = avgMaturity > 70 ? "Alta" : (avgMaturity > 45 ? "Media" : "En Desarrollo"); const riskPercent = Math.round((studentsAtRisk / (data.length || 1)) * 100); // Originalmente en una línea
    container.innerHTML = `
        <div id="fullStrategicReport" style="background:white; color:#333; font-family:'Outfit', sans-serif;">
            <div class="report-page" style="padding:40px; min-height:1000px; border-bottom:2px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid var(--primary); padding-bottom:20px; margin-bottom:40px;"><div><h1 style="font-size:2.2rem; color:var(--primary); margin:0;">INFORME ESTRATÉGICO GRUPAL</h1><p style="font-weight:600; margin-top:5px;">Grado: ${document.getElementById('selReportGrade').options[document.getElementById('selReportGrade').selectedIndex].text}</p></div><button class="btn-main" style="width:auto; padding:12px 25px;" onclick="exportGroupPDF()">Descargar PDF</button></div>
                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:40px;"><div class="card" style="text-align:center; padding:20px; background:#f8fafc;"><small>Población</small><strong style="display:block; font-size:2rem; color:var(--primary);">${data.length}</strong></div><div class="card" style="text-align:center; padding:20px; background:#f8fafc; border-bottom:4px solid var(--success);"><small>Área Top</small><strong style="display:block; font-size:1rem; color:var(--success);">${topArea}</strong></div><div class="card" style="text-align:center; padding:20px; background:#f8fafc;"><small>Madurez</small><strong style="display:block; font-size:1.5rem; color:var(--accent);">${maturityLabel}</strong></div><div class="card" style="text-align:center; padding:20px; background:#f8fafc; border-bottom:4px solid var(--danger);"><small>Riesgo</small><strong style="display:block; font-size:2rem; color:var(--danger);">${riskPercent}%</strong></div></div>
                <h2 style="color:var(--primary); border-left:5px solid var(--accent); padding-left:15px; margin-bottom:20px;">1. Resumen Ejecutivo</h2><div style="background:#f1f5f9; padding:25px; border-radius:15px; line-height:1.8; text-align:justify;">El análisis revela tendencia marcada hacia <strong>${topArea}</strong>. Nivel de madurez <strong>${maturityLabel}</strong>.</div>
                <h2 style="color:var(--primary); border-left:5px solid var(--success); padding-left:15px; margin:40px 0 20px 0;">2. Top 5 Carreras</h2><div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px;">${(AREAS_VOCACIONALES[topArea]?.carreras || []).slice(0,5).map(c => `<div style="background:linear-gradient(135deg, var(--primary), var(--secondary)); color:white; padding:15px; border-radius:10px; text-align:center; font-size:0.8rem; font-weight:600;">${c}</div>`).join('')}</div>
            </div>
            <div class="report-page" style="padding:40px; min-height:1000px; border-bottom:2px solid #eee; page-break-before:always;"><h2 style="color:var(--primary); margin-bottom:30px;">3. Distribución por Área</h2><div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:40px;"><div><canvas id="chartDistribution" style="max-height:350px;"></canvas></div><div style="background:#f8fafc; padding:25px; border-radius:20px;"><h4 style="margin-bottom:15px; color:var(--primary);">Dinámica</h4><p>El dominio de ${topArea} indica inclinación colectiva.</p></div></div><h2 style="color:var(--primary); margin:60px 0 30px 0;">4. Perfil Radar Grupal</h2><div style="display:flex; justify-content:center; background:white; padding:25px; border-radius:20px; border:1px solid #eee;"><canvas id="chartAverageProfile" style="max-width:550px; max-height:550px;"></canvas></div></div>
            <div class="report-page" style="padding:40px; min-height:1000px; border-bottom:2px solid #eee; page-break-before:always;"><h2 style="color:var(--primary); margin-bottom:30px;">5. Niveles de Interés</h2><div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:25px;"><div style="text-align:center; border:2px solid var(--success); padding:25px; border-radius:20px; background:#f0fdf4;"><span style="color:var(--success); font-weight:800; font-size:2rem;">${interestLevels.Alto}</span><br><small>Alto (>75%)</small></div><div style="text-align:center; border:2px solid var(--accent); padding:25px; border-radius:20px; background:#fffaf5;"><span style="color:var(--accent); font-weight:800; font-size:2rem;">${interestLevels.Medio}</span><br><small>Medio (40-75%)</small></div><div style="text-align:center; border:2px solid var(--danger); padding:25px; border-radius:20px; background:#fef2f2;"><span style="color:var(--danger); font-weight:800; font-size:2rem;">${interestLevels.Bajo}</span><br><small>Indecisos (<40%)</small></div></div><h2 style="color:var(--primary); margin:60px 0 30px 0;">6. Métricas por Área</h2><table style="width:100%; border-collapse:collapse; border-radius:15px; overflow:hidden;"><thead style="background:var(--primary); color:white;"><tr><th style="padding:15px; text-align:left;">Área</th><th style="padding:15px; text-align:center;">Promedio</th><th style="padding:15px; text-align:right;">Dominantes</th></tr></thead><tbody>${averages.map(a => `<tr style="border-bottom:1px solid #eee;"><td style="padding:12px; font-weight:600;">${a.area}</td><td style="padding:12px; text-align:center;">${a.score}%</td><td style="padding:12px; text-align:right; font-weight:700;">${studentsByArea[a.area]?.length || 0}</td></tr>`).join('')}</tbody></table></div>
            <div class="report-page" style="padding:40px; min-height:1000px; page-break-before:always;"><h2 style="color:var(--primary); margin-bottom:30px;">7. Clasificación por Área Dominante</h2><div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">${Object.entries(studentsByArea).filter(([a, list]) => list.length > 0).map(([area, list]) => `<div style="background:#f8fafc; padding:25px; border-radius:20px; border-top:5px solid var(--primary);"><h4 style="color:var(--primary); margin-bottom:15px; display:flex; justify-content:space-between;">${area} <span>${list.length} Est.</span></h4><ul style="font-size:0.8rem; color:#444; padding-left:20px;">${list.map(name => `<li style="margin-bottom:4px;">${name}</li>`).join('')}</ul></div>`).join('')}</div></div>
        </div>`;
    setTimeout(() => {
        new Chart(document.getElementById('chartDistribution'), { type: 'bar', data: { labels: averages.map(a => a.area.substring(0, 10) + '...'), datasets: [{ label: 'Estudiantes', data: averages.map(a => studentsByArea[a.area]?.length || 0), backgroundColor: '#46B4A8', borderRadius: 8 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
        new Chart(document.getElementById('chartAverageProfile'), { type: 'radar', data: { labels: averages.map(a => a.area), datasets: [{ label: 'Promedio %', data: averages.map(a => a.score), fill: true, backgroundColor: 'rgba(246, 177, 122, 0.4)', borderColor: '#F6B17A', borderWidth: 3 }] }, options: { scales: { r: { suggestedMin: 0, suggestedMax: 100 } } } });
    }, 600);
}

function exportGroupPDF() {
    const element = document.getElementById('fullStrategicReport'); // Originalmente en una línea
    if(!element) return alert("Error: No se encontró el informe."); // Originalmente en una línea
    const opt = { margin: 0, filename: 'Informe_Estrategico_Grupal.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; // Originalmente en una línea
    html2pdf().set(opt).from(element).save(); // Originalmente en una línea
}

async function viewStudent() {
    document.getElementById('roleMenu').innerHTML = `<li class="nav-item active"><i class="fa-solid fa-pen-to-square"></i> Mi evaluación <span id="navBadgeStudent"></span></li><li class="nav-item" onclick="consultarResultado()" style="color: var(--success);"><i class="fa-solid fa-chart-line"></i> Consultar mi resultado</li>`;
    document.getElementById('pageTitle').innerText = "Mi Prueba Vocacional";
    document.getElementById('pageDesc').innerText = "Acceso según calendario aprobado por tu institución.";
    
    const idGrupo = await fetchStudentGroupId();
    if (!idGrupo) { renderStudentBlocked("Sin grupo asignado", "Tu usuario no aparece vinculado a un grupo en el sistema. Verifica que la carga masiva haya registrado tu documento correctamente o contacta a tu colegio."); return; }
    const { data: resultDone } = await _s.from('tresultados').select('id').eq('id_estudiante', sess.id).maybeSingle(); // Originalmente en una línea
    if (resultDone) {
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
    
    const { data: groupData } = await _s.from('tgrupos').select('nombre, id_colegio, tgrados (nombre), tcolegios (nombre)').eq('id', idGrupo).single(); // Originalmente en una línea
    if (!groupData) { renderStudentBlocked("Error en datos del grupo", "No se pudieron cargar los datos de tu colegio, grado o grupo."); return; } // Originalmente en una línea
    const { count: pendCola } = await _s.from('tsolicitudes_aplicacion').select('*', { count: 'exact', head: true }).eq('id_grupo', idGrupo).eq('estado', 'pendiente'); // Originalmente en una línea
    const today = todayLocalISODate(); // Originalmente en una línea
    const { data: sols } = await _s.from('tsolicitudes_aplicacion').select('id_prueba, fecha_inicio, fecha_fin').eq('id_grupo', idGrupo).eq('estado', 'aprobada').lte('fecha_inicio', today).gte('fecha_fin', today).order('id', { ascending: false }).limit(1); // Originalmente en una línea
    if (!sols?.length) { if ((pendCola || 0) > 0) { renderStudentBlocked("Evaluación en revisión", "Tu institución ya envió una solicitud para aplicar la evaluación a tu grupo. Aún está pendiente de aprobación por el administrador."); return; } renderStudentBlocked("Evaluación no disponible por fechas", "No hay una aplicación de prueba aprobada y vigente para tu grupo hoy."); return; } // Originalmente en una línea
    const { data: qData } = await _s.from('tpreguntas').select('*').eq('id_prueba', sols[0].id_prueba).order('num_pregunta', { ascending: true }); // Originalmente en una línea
    if (!qData?.length) { renderStudentBlocked("Contenido no disponible", "La prueba asignada aún no tiene preguntas cargadas."); return; } // Originalmente en una línea
    document.getElementById('pageTitle').innerText = `Mi Prueba Vocacional - ${groupData.tcolegios?.nombre || 'Colegio'}`; // Originalmente en una línea
    document.getElementById('pageDesc').innerText = `Grado: ${groupData.tgrados?.nombre || ''} | Grupo: ${groupData.nombre || ''} | Ventana autorizada: del ${sols[0].fecha_inicio} al ${sols[0].fecha_fin}.`; // Originalmente en una línea
    dynamicQuestions = qData;
    answers = new Array(dynamicQuestions.length).fill(null);
    step = 0;
    renderStudentTest();
    refreshNotifBadges();
}

function renderStudentTest() {
    const q = dynamicQuestions[step];
    const progress = Math.round((step / dynamicQuestions.length) * 100);
    let optsHtml = '';
    
    for(let i=1; i<=5; i++) {
        const text = q[`opt${i}`];
        if(text && text.trim() !== "") {
            optsHtml += `
                <div class="likert-option">
                    <input type="radio" name="qs" id="o${i}" ${answers[step] === i ? 'checked' : ''} onclick="setR(${i})">
                    <label for="o${i}">${text}</label>
                </div>`;
        }
    }

    document.getElementById('dynamicBoard').innerHTML = `
        <div class="span-6 test-container">
            <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
            <div class="question-card">
                <span style="font-weight:700; color:var(--accent);">PREGUNTA ${q.num_pregunta} DE ${dynamicQuestions.length}</span>
                <h2 style="margin-top:10px;">${q.enunciado}</h2>
                <div class="likert">${optsHtml}</div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button class="btn-main" style="width:160px; background:var(--secondary);" onclick="nav(-1)" ${step === 0 ? 'disabled' : ''}>Anterior</button>
                ${step < dynamicQuestions.length - 1 
                    ? `<button class="btn-main" style="width:160px;" onclick="nav(1)">Siguiente</button>`
                    : `<button class="btn-main" style="width:180px; background:var(--success);" onclick="finish()">Finalizar</button>`
                }
            </div>
        </div>`;
}

function setR(v) { 
    answers[step] = v; 
    setTimeout(() => { if(step < dynamicQuestions.length -1) nav(1); else renderStudentTest(); }, 300);
}

function nav(d) { 
    if(d > 0 && answers[step] === null) return alert("Elige una respuesta.");
    step += d; 
    window.scrollTo(0,0); renderStudentTest();
}

async function finish() {
    if(answers.includes(null)) return alert("Completa todas las preguntas.");
    const scores = {}; const maxScores = {}; dynamicQuestions.forEach((q, i) => { const area = q.area; if(!scores[area]) { scores[area] = 0; maxScores[area] = 0; } scores[area] += answers[i]; maxScores[area] += 5; }); const results = {}; Object.keys(scores).forEach(a => results[a] = Math.round((scores[a] / maxScores[a]) * 100)); const { error } = await _s.from('tresultados').insert([{ id_estudiante: sess.id, id_prueba: dynamicQuestions[0].id_prueba, totalpreg: dynamicQuestions.length, respuestas: JSON.stringify(results), estado: 'Finalizado' }]); if(error) alert("Error: " + error.message); else { alert("¡Test Finalizado! Tus respuestas han sido enviadas correctamente."); viewStudent(); }
}

async function consultarResultado() {
    const { data: colegioData } = await _s.from('tcolegios').select('resultados_habilitados').limit(1).single();
    if (!colegioData?.resultados_habilitados) return alert("Los resultados aún no están disponibles. Serán visibles una vez sean autorizados.");
    const { data, error } = await _s.from('tresultados').select('*, tpruebas(nombre)').eq('id_estudiante', sess.id).single();
    if (error || !data) return alert("Aún no has completado la evaluación.");
    const resultados = JSON.parse(data.respuestas || '{}'); const areas = Object.keys(resultados); const puntuaciones = areas.map(area => resultados[area]); // Originalmente en una línea
    const maxScore = Math.max(...puntuaciones); const dominant = areas[puntuaciones.indexOf(maxScore)]; const areaInfo = AREAS_VOCACIONALES[dominant]; // Originalmente en una línea
    const { data: st } = await _s.from('testudiantes').select('*, tcolegios(nombre), tgrados(nombre), tgrupos(nombre), tusuario(identificacion)').eq('id', sess.id).single(); // Originalmente en una línea
    document.getElementById('dynamicBoard').innerHTML = `
        <div id="informe-visual" class="span-6">
            <header><div class="logo"><h2 style="margin:0; color:white; font-size:24px;">Edueficiente</h2></div><div class="titulo-informe"><h1>INFORME DE ORIENTACIÓN VOCACIONAL</h1><p>${st?.tcolegios?.nombre || ''}</p><p style="margin-top:8px; font-size:0.9rem; opacity:0.85;">Fecha del informe: ${new Date().toLocaleDateString('es-ES')}</p></div></header>
            <section class="info-estudiante" style="display: flex; justify-content: space-between; padding: 20px 40px; background: var(--color-gris-claro); border-bottom: 1px solid #e0e0e0;"><div style="flex: 1;"><p style="margin: 0 0 8px 0;"><strong>Estudiante:</strong> ${st?.nombre || sess.nombre}</p><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;"><div><p style="margin: 0; font-size: 0.85rem;"><strong>ID:</strong> ${st?.tusuario?.identificacion}</p></div><div><p style="margin: 0; font-size: 0.85rem;"><strong>Grado:</strong> ${st?.tgrados?.nombre}</p></div><div><p style="margin: 0; font-size: 0.85rem;"><strong>Grupo:</strong> ${st?.tgrupos?.nombre}</p></div></div></div><div style="text-align: right;"><p style="margin: 0;"><strong>Prueba aplicada:</strong></p><p style="margin: 0; font-size: 1.1rem; color: var(--primary); font-weight: 600;">${data.tpruebas?.nombre || 'Prueba Vocacional'}</p></div></section>
            <main><div class="columna-izquierda"><table><thead><tr><th>Área vocacional</th><th>Puntuación</th></tr></thead><tbody>${areas.map((a, i) => `<tr><td>${a}</td><td>${puntuaciones[i]}%</td></tr>`).join('')}</tbody></table><div class="area-dominante"><div class="seccion-titulo">Tu área vocacional dominante:</div><div class="seccion-contenido"><p>Área de mayor interés: <strong>${dominant}</strong></p><p>Puntuación obtenida: <strong>${maxScore}%</strong></p></div></div><div class="descripcion"><div class="seccion-titulo">Descripción:</div><div class="seccion-contenido"><p>${areaInfo ? areaInfo.descripcion : ''}</p></div></div></div><div class="columna-derecha"><div class="grafico-container"><canvas id="radarChart"></canvas></div><div class="carreras-sugeridas"><div class="seccion-titulo">Carreras sugeridas:</div><div class="seccion-contenido"><ul>${areaInfo ? areaInfo.carreras.map(c => `<li>${c}</li>`).join('') : ''}</ul></div></div></div></main>
            <footer>En EduEficiente creemos que la vocación es el punto de encuentro entre lo que amas y lo que haces bien. Acompañamos a cada estudiante en el descubrimiento de sus fortalezas e intereses, guiándolo hacia un futuro donde pueda crecer con pasión y propósito.</footer>
        </div>
        <div style="text-align:center; margin-top:20px;"><button onclick="viewStudent()" class="btn-main" style="width:auto; padding:12px 30px; background:#1E3A5F;">Volver al Panel</button></div>`;
    const ctx = document.getElementById('radarChart').getContext('2d');
    new Chart(ctx, { type: 'radar', data: { labels: areas, datasets: [{ data: puntuaciones, fill: true, backgroundColor: 'rgba(30, 58, 95, 0.3)', borderColor: 'rgb(30, 58, 95)' }] }, options: { maintainAspectRatio: false, animation: { duration: 1000, easing: 'easeInOutQuart' }, scales: { r: { suggestedMin: 0, suggestedMax: 100, pointLabels: { font: { size: 12, family: 'Montserrat, sans-serif' } } } }, plugins: { legend: { display: false }, datalabels: { color: '#333', font: { weight: 'bold' }, formatter: (v) => v + '%' } } } });
    refreshNotifBadges();
}