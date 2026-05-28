/* ============================================================
   LOGIN PARTICLES — Constelación futurista
   ============================================================
   Solo se activa cuando .login-screen está visible.
   Se detiene automáticamente al entrar al dashboard.
   No toca ningún otro elemento de la página.

   CONFIGURACIÓN RÁPIDA (edita estos valores):
   ============================================================ */
const PARTICLES_CONFIG = {
    count:        72,          // ← Número de partículas (menos = más rápido)
    speed:        0.35,        // ← Velocidad de movimiento (0.1 lento — 1.0 rápido)
    radius:       2.0,         // ← Tamaño de cada partícula en px
    mouseRadius:  130,         // ← Radio de influencia del cursor en px
    mouseForce:   18,          // ← Fuerza con que el cursor las repele
    lineDistance: 110,         // ← Distancia máxima para dibujar línea entre partículas
    colorCyan:    '0, 212, 255',   // ← Color cyan (R, G, B)
    colorBlue:    '37, 99, 255',   // ← Color azul (R, G, B)
    colorViolet:  '167, 139, 250', // ← Color violeta (R, G, B)
    bgAlpha:      0.18,        // ← Opacidad del rastro (0 = sin rastro, 1 = sin rastro también)
};

/* ============================================================
   NÚCLEO — no necesitas editar debajo de esta línea
   ============================================================ */
(function () {
    'use strict';

    let canvas, ctx, animId, particles = [];
    let W = 0, H = 0;
    let mouse = { x: -9999, y: -9999 };
    let running = false;

    /* ── Paleta de colores ── */
    const PALETTE = [
        PARTICLES_CONFIG.colorCyan,
        PARTICLES_CONFIG.colorBlue,
        PARTICLES_CONFIG.colorViolet,
        PARTICLES_CONFIG.colorBlue,
        PARTICLES_CONFIG.colorCyan,
    ];

    function randomColor() {
        return PALETTE[Math.floor(Math.random() * PALETTE.length)];
    }

    /* ── Partícula ── */
    function Particle() {
        this.reset();
    }

    Particle.prototype.reset = function () {
        this.x    = Math.random() * W;
        this.y    = Math.random() * H;
        this.vx   = (Math.random() - 0.5) * PARTICLES_CONFIG.speed;
        this.vy   = (Math.random() - 0.5) * PARTICLES_CONFIG.speed;
        this.r    = PARTICLES_CONFIG.radius * (0.6 + Math.random() * 0.8);
        this.color = randomColor();
        this.alpha = 0.4 + Math.random() * 0.6;
    };

    Particle.prototype.update = function () {
        /* Repulsión del cursor */
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PARTICLES_CONFIG.mouseRadius && dist > 0) {
            const force = (PARTICLES_CONFIG.mouseRadius - dist) / PARTICLES_CONFIG.mouseRadius;
            this.x += (dx / dist) * force * PARTICLES_CONFIG.mouseForce * 0.05;
            this.y += (dy / dist) * force * PARTICLES_CONFIG.mouseForce * 0.05;
        }

        this.x += this.vx;
        this.y += this.vy;

        /* Rebote suave en bordes */
        if (this.x < 0)  { this.x = 0;  this.vx *= -1; }
        if (this.x > W)  { this.x = W;  this.vx *= -1; }
        if (this.y < 0)  { this.y = 0;  this.vy *= -1; }
        if (this.y > H)  { this.y = H;  this.vy *= -1; }
    };

    Particle.prototype.draw = function () {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.fill();
    };

    /* ── Líneas entre partículas cercanas ── */
    function drawLines() {
        const maxD = PARTICLES_CONFIG.lineDistance;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < maxD) {
                    const alpha = (1 - d / maxD) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${particles[i].color}, ${alpha})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }
        }
    }

    /* ── Loop de animación ── */
    function loop() {
        if (!running) return;

        /* Limpia con fade para efecto de rastro suave */
        ctx.fillStyle = `rgba(6, 13, 31, ${PARTICLES_CONFIG.bgAlpha})`;
        ctx.fillRect(0, 0, W, H);

        drawLines();
        particles.forEach(p => { p.update(); p.draw(); });

        animId = requestAnimationFrame(loop);
    }

    /* ── Resize ── */
    function resize() {
        const loginScreen = document.querySelector('.login-screen');
        if (!loginScreen) return;
        W = canvas.width  = loginScreen.offsetWidth;
        H = canvas.height = loginScreen.offsetHeight;
    }

    /* ── Iniciar ── */
    function start() {
        if (running) return;
        running = true;
        resize();
        particles = Array.from({ length: PARTICLES_CONFIG.count }, () => new Particle());
        loop();
    }

    /* ── Detener ── */
    function stop() {
        running = false;
        if (animId) cancelAnimationFrame(animId);
    }

    /* ── Observa si el login está visible ── */
    function observeLoginVisibility() {
        const loginScreen = document.querySelector('.login-screen');
        if (!loginScreen) return;

        const observer = new MutationObserver(() => {
            const isActive = loginScreen.classList.contains('active');
            if (isActive && !running) start();
            if (!isActive && running) stop();
        });

        observer.observe(loginScreen, { attributes: true, attributeFilter: ['class'] });

        /* Estado inicial */
        if (loginScreen.classList.contains('active')) start();
    }

    /* ── Eventos del cursor ── */
    function bindMouse() {
        document.addEventListener('mousemove', e => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });
        document.addEventListener('mouseleave', () => {
            mouse.x = -9999;
            mouse.y = -9999;
        });
    }

    /* ── Montaje del canvas ── */
    function mount() {
        canvas = document.getElementById('login-particles');
        if (!canvas) {
            console.warn('[login-particles] No se encontró #login-particles en el HTML.');
            return;
        }
        ctx = canvas.getContext('2d');

        bindMouse();
        window.addEventListener('resize', () => { resize(); });
        observeLoginVisibility();
    }

    /* ── Arranque ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }

})();
