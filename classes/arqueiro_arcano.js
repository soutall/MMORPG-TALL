// classes/arqueiro_arcano.js - Renderização do Arqueiro Astral (ARQUEIRO ASTRAL)
// Estilo: arqueiro esguio de túnica cósmica, arco de luz estelar e flechas-cometa.
// As skills marcam zonas no chão: Chuva de Cometas (zona), Orbe de Constelação
// (cativeiro + implosão) e Cascata Estelar (cone). Os danos e efeitos são do servidor.

// Cores cósmicas (compartilhadas com projéteis e zonas)
window.ARCANO_CORES = ['#fff6c2', '#c39bff', '#8fd8ff'];

// Estrelinha de 4 pontas (borda do universo astral)
function drawEstrela(ctx, x, y, r, cor) {
    ctx.save();
    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.32, y - r * 0.32);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.32, y + r * 0.32);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.32, y + r * 0.32);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.32, y - r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

window.desenharArqueiroArcano = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    let t = Date.now() / 450;

    ctx.save();
    ctx.translate(x, y);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 8, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    let agachamento = Math.sin(Date.now() / 520) * (isMoving ? 1.2 : 2.2);
    ctx.save();
    ctx.translate(12, 14 + agachamento * 0.3);

    // Pernas (botas escuras com brilho estelar no topo)
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3.4 : 0;
    ctx.fillStyle = "#3a3358";
    ctx.fillRect(-5, 9, 3.2, 7 + legOffset);
    ctx.fillRect(2, 9, 3.2, 7 - legOffset);
    ctx.fillStyle = "#241e3d";
    ctx.fillRect(-6, 16 + legOffset, 5, 3);
    ctx.fillRect(1, 16 - legOffset, 5, 3);
    ctx.fillStyle = "rgba(197,160,255,0.8)";
    ctx.beginPath();
    ctx.arc(-3.4, 9 + legOffset * 0.3, 0.7, 0, Math.PI * 2);
    ctx.arc(3.6, 9 - legOffset * 0.3, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Corpo: túnica cósmica (índigo profundo) com aparo dourado
    let corDano = ((window.danoFlashTimer || 0) > 0);
    let corTunica = corDano ? "#e74c3c" : "#2c2550";
    let corAparo = corDano ? "#ffb3ad" : "#c9ac4c";
    ctx.fillStyle = corTunica;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(7, -7);
    ctx.lineTo(9, 9);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = corAparo;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, 3); ctx.lineTo(7, 3);
    ctx.stroke();
    // Constelação no peito (3 nós conectados)
    ctx.strokeStyle = "rgba(255,246,194,0.85)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3, -4); ctx.lineTo(1, -1); ctx.lineTo(3, -4);
    ctx.stroke();
    ctx.fillStyle = "#fff6c2";
    ctx.shadowColor = "#fff6c2";
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(-3, -4, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -1, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -4, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Faixa com gema cósmica pulsante
    ctx.fillStyle = "#4a3f7c";
    ctx.fillRect(-7, 2, 14, 2);
    let pulsoGema = 0.6 + Math.sin(t * 1.4) * 0.4;
    ctx.fillStyle = "#c39bff";
    ctx.shadowColor = "#c39bff";
    ctx.shadowBlur = 8;
    ctx.fillRect(4, 1.6, 2.4, 2.8);
    ctx.shadowBlur = 0;

    // Capa estrelada (céu noturno com estrelas fixas)
    ctx.fillStyle = "#1e1b38";
    ctx.beginPath();
    ctx.moveTo(6, -7);
    ctx.lineTo(14, 14);
    ctx.lineTo(8, 14);
    ctx.lineTo(3, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff6c2";
    for (let s = 0; s < 4; s++) {
        let sx = 4.5 + ((s * 37) % 9), sy = -3 + ((s * 53) % 14);
        let tw = 0.5 + Math.sin(t * 2 + s * 2.1) * 0.35;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, tw), 0, Math.PI * 2);
        ctx.fill();
    }

    // Cabeça (rosto + cabelo prateado)
    ctx.fillStyle = "#e8dcc9";
    ctx.beginPath();
    ctx.arc(0, -11, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cfd4de";
    ctx.beginPath();
    ctx.arc(0, -12.5, 4.5, Math.PI, 0);
    ctx.fill();
    // Tiara de estrela
    ctx.fillStyle = "#fff6c2";
    ctx.shadowColor = "#fff6c2";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(0, -16.6); ctx.lineTo(0.9, -14.9); ctx.lineTo(2.7, -14.9); ctx.lineTo(1.35, -13.6); ctx.lineTo(1.8, -11.9); ctx.lineTo(0, -12.9); ctx.lineTo(-1.8, -11.9); ctx.lineTo(-1.35, -13.6); ctx.lineTo(-2.7, -14.9); ctx.lineTo(-0.9, -14.9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Olhos cósmicos
    ctx.fillStyle = "#8fd8ff";
    ctx.shadowColor = "#8fd8ff";
    ctx.shadowBlur = 6;
    ctx.fillRect(-2.4, -11.6, 1.6, 2);
    ctx.fillRect(0.8, -11.6, 1.6, 2);
    ctx.shadowBlur = 0;

    // Aljava estelar (escura com pontas douradas)
    ctx.fillStyle = "rgba(30,27,56,0.85)";
    ctx.strokeStyle = "#c9ac4c";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-10, -9, 4, 15, 2);
    ctx.fill();
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
        let flechaY = -7 + k * 4;
        ctx.strokeStyle = "#fff6c2";
        ctx.beginPath();
        ctx.moveTo(-11.4, flechaY);
        ctx.lineTo(-11.4, flechaY + 2.2);
        ctx.stroke();
        ctx.strokeStyle = "#c9ac4c";
        ctx.beginPath();
        ctx.moveTo(-12.2, flechaY + 2.2);
        ctx.lineTo(-10.6, flechaY + 2.2);
        ctx.stroke();
    }

    // Braço + ARCO DE LUZ ESTELAR (segue a mira)
    ctx.save();
    ctx.rotate(angulo || 0);
    ctx.translate(7, 0);
    ctx.fillStyle = "#4a3f7c";
    ctx.fillRect(-3, -2, 7, 4);
    // Arco de energia: arco dourado com nós estelares nas pontas
    ctx.shadowColor = "#c9ac4c";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#e8c96a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(9, 0, 9, -1.1, 1.1);
    ctx.stroke();
    // corda
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#fff6c2";
    ctx.beginPath();
    ctx.moveTo(9 + 9 * Math.cos(-1.1), 9 * Math.sin(-1.1));
    ctx.lineTo(9 + 9 * Math.cos(1.1), 9 * Math.sin(1.1));
    ctx.stroke();
    // nó de estrela na ponta do arco
    ctx.fillStyle = "#fff6c2";
    ctx.shadowColor = "#fff6c2";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(18, -8.2, 1.3, 0, Math.PI * 2);
    ctx.arc(18, 8.2, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Flecha-cometa nockada com brilho estelar
    let pu = 1 + Math.sin(t * 1.5) * 0.15;
    ctx.fillStyle = "#e8dcc9";
    ctx.fillRect(7, -1, 4, 1.6);
    ctx.fillStyle = "#fff6c2";
    ctx.shadowColor = "#ffe66f";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(19, 0, 2.6 * pu, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Aura de poeira estelar orbitando
    for (let o = 0; o < 3; o++) {
        let oa = t * 0.7 + o * 2.094;
        let orx = 15 * Math.cos(oa), ory = 17 * Math.sin(oa) * 0.6;
        ctx.fillStyle = "rgba(197,160,255,0.5)";
        ctx.beginPath();
        ctx.arc(orx, ory, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    ctx.restore();

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// Ataque básico: Disparo Estelar (o dano é do servidor; o projétil vem via broadcast)
window.enviarAtaqueArcano = function(ang, alvoTipo, alvoId) {
    if (window.estaMorto) return;
    let msg = { action: 'ataque_arqueiro_arcano' };
    if (alvoTipo) { msg.alvoTipo = alvoTipo; msg.alvoId = alvoId; }
    if (ang !== undefined) msg.angulo = ang;
    if (window.ws && window.ws.readyState === 1) {
        window.ws.send(JSON.stringify(msg));
    }
};

// Flecha-cometa voando até o alvo (visual otimista local ao conjurar skill)
window.criarFlechaArcanoVoo = function(sx, sy, tx, ty, cor) {
    if (!window.arcanoFlechasVoo) window.arcanoFlechasVoo = [];
    window.arcanoFlechasVoo.push({ x: sx, y: sy, tx: tx, ty: ty, vx: (tx - sx) / 16, vy: (ty - sy) / 16, cor: cor || '#fff6c2', vida: 16 });
};

// Projétil do Disparo Estelar (visual local p/ broadcast action_arcano_flecha)
window.criarFlechaArcanoBasica = function(sx, sy, tx, ty) {
    if (!window.arcanoProjeteis) window.arcanoProjeteis = [];
    let vx = (tx - sx) / 14, vy = (ty - sy) / 14;
    let cor = window.ARCANO_CORES ? window.ARCANO_CORES[Math.floor(Math.random() * window.ARCANO_CORES.length)] : '#fff6c2';
    window.arcanoProjeteis.push({ tipo: 'flecha_astral', x: sx, y: sy, vx: vx, vy: vy, ang: Math.atan2(vy, vx), vida: 16, cor: cor });
};

// ============================================================================
// VFX REWORK — ARQUEIRO ASTRAL
// Somente visual. NÃO altera dano, cooldown, duração, mana ou regras de servidor.
// ============================================================================

function arcanoCos(t, velocidade, fase) {
    return Math.cos(t * velocidade + fase);
}

function arcanoSin(t, velocidade, fase) {
    return Math.sin(t * velocidade + fase);
}

function desenharHaloAstral(ctx, x, y, raio, corA, corB, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, corA.replace('ALPHA', (alpha * 0.22).toFixed(3)));
    g.addColorStop(0.35, corB.replace('ALPHA', (alpha * 0.12).toFixed(3)));
    g.addColorStop(1, corB.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, raio, 0, Math.PI * 2);
    ctx.fill();
}

function desenharEstouroAstral(ctx, x, y, raio, alpha, t) {
    // Núcleo branco-azulado extremamente brilhante.
    const core = ctx.createRadialGradient(x, y, 0, x, y, raio);
    core.addColorStop(0, `rgba(255,255,255,${Math.min(1, alpha)})`);
    core.addColorStop(0.18, `rgba(201,245,255,${0.72 * alpha})`);
    core.addColorStop(0.48, `rgba(165,125,255,${0.34 * alpha})`);
    core.addColorStop(1, 'rgba(80,40,180,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, raio, 0, Math.PI * 2);
    ctx.fill();

    // Quatro ondas de choque cósmicas.
    for (let q = 0; q < 4; q++) {
        const rq = raio * (0.55 + q * 0.28) + Math.sin(t * 2.4 + q) * 2;
        ctx.globalAlpha = alpha * (0.48 - q * 0.08);
        ctx.strokeStyle = q % 2 === 0 ? '#fff6c2' : '#8fd8ff';
        ctx.lineWidth = 2.4 - q * 0.35;
        ctx.shadowColor = q % 2 === 0 ? '#ffe66f' : '#8fd8ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, rq, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Fragmentos/estrelas explodindo radialmente.
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + t * 0.18;
        const r = raio * (0.85 + 0.8 * Math.abs(Math.sin(t * 1.8 + i * 1.7)));
        const sx = x + Math.cos(a) * r;
        const sy = y + Math.sin(a) * r;
        const c = i % 3 === 0 ? '#fff6c2' : (i % 3 === 1 ? '#c39bff' : '#8fd8ff');
        drawEstrela(ctx, sx, sy, 1.4 + (i % 3) * 0.45, c);
    }

    // Feixes cruzados para um final "ultimate".
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = '#fff6c2';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#fff6c2';
    ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i++) {
        const a = t * 0.45 + i * Math.PI / 4;
        const len = raio * 1.9;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

// ============================================================================
// SKILL 1 — CHUVA DE COMETAS
// Céu cósmico + cometas multicoloridos + iluminação no chão + impactos.
// ============================================================================
window.desenharChuvaCometas = function(z, t) {
    if (!window.ctx || !z) return;
    const ctx = window.ctx;
    const tempo = z.tempo || 80;
    const dur = z.tempoMax || 80;
    const vida = Math.max(0, Math.min(1, tempo / dur));
    const intensidade = 0.75 + Math.sin(t * 2.2) * 0.12;
    const base = Date.now() / 1000;

    ctx.save();

    // Atmosfera/nébula sobre o chão.
    desenharHaloAstral(
        ctx, z.x, z.y, z.raio * 1.08,
        `rgba(115,70,255,ALPHA)`,
        `rgba(20,10,65,ALPHA)`,
        1.8 * vida
    );

    // Halo interno colorido pulsante.
    const gCampo = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.raio);
    gCampo.addColorStop(0, `rgba(170,95,255,${0.18 * vida})`);
    gCampo.addColorStop(0.38, `rgba(70,180,255,${0.10 * vida})`);
    gCampo.addColorStop(0.72, `rgba(240,100,255,${0.07 * vida})`);
    gCampo.addColorStop(1, 'rgba(20,10,60,0)');
    ctx.fillStyle = gCampo;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio, z.raio * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Anel principal.
    ctx.globalAlpha = 0.75 * vida;
    ctx.strokeStyle = '#8fd8ff';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#8fd8ff';
    ctx.shadowBlur = 11;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio, z.raio * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Segundo anel quebrado.
    ctx.globalAlpha = 0.45 * vida;
    ctx.strokeStyle = '#c39bff';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([7, 10]);
    ctx.lineDashOffset = -base * 18;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio * 0.78, z.raio * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pequenos corpos celestes orbitando o perímetro.
    for (let i = 0; i < 8; i++) {
        const a = base * (0.35 + (i % 2) * 0.08) + i * Math.PI / 4;
        const rr = z.raio * (0.78 + (i % 3) * 0.035);
        const sx = z.x + Math.cos(a) * rr;
        const sy = z.y + Math.sin(a) * rr * 0.9;
        const cor = ['#fff6c2', '#c39bff', '#8fd8ff', '#ff8de1'][i % 4];
        drawEstrela(ctx, sx, sy, 1.6 + (i % 3) * 0.4, cor);
    }

    // "Céu" acima da zona: muitos pontos estelares.
    for (let i = 0; i < 26; i++) {
        const a = i * 2.39996 + base * 0.12;
        const rr = z.raio * (0.18 + ((i * 37) % 100) / 100 * 0.88);
        const sx = z.x + Math.cos(a) * rr;
        const sy = z.y + Math.sin(a) * rr * 0.85;
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(base * (1.5 + (i % 3) * 0.5) + i));
        const cor = i % 4 === 0 ? '#fff6c2' : (i % 4 === 1 ? '#c39bff' : (i % 4 === 2 ? '#8fd8ff' : '#ff8de1'));
        ctx.globalAlpha = (0.18 + twinkle * 0.38) * vida;
        ctx.fillStyle = cor;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 4 + twinkle * 5;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7 + twinkle * 0.85, 0, Math.PI * 2);
        ctx.fill();
    }

    // Chuva de cometas — múltiplos vetores, cada um com cor diferente.
    const paleta = ['#fff6c2', '#8fd8ff', '#c39bff', '#ff8de1', '#7fffd4'];
    for (let k = 0; k < 10; k++) {
        const p = ((base * (0.42 + (k % 3) * 0.08)) + k * 0.173) % 1;
        const ang = k * 2.39996 + Math.sin(k * 3.1) * 0.6;
        const radial = z.raio * (0.10 + p * 0.86);
        const cx = z.x + Math.cos(ang) * radial;
        const cy = z.y + Math.sin(ang) * radial * 0.88;
        const queda = 18 + p * 24;
        const tail = 12 + p * 20;
        const cor = paleta[k % paleta.length];

        // Cabeça.
        ctx.globalAlpha = (0.35 + p * 0.62) * vida;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = cor;
        ctx.shadowBlur = 13;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.4 + p * 1.9, 0, Math.PI * 2);
        ctx.fill();

        // Cauda.
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.4 + p * 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
            cx - Math.cos(ang + 0.42) * tail,
            cy - Math.sin(ang + 0.42) * tail - queda * 0.18
        );
        ctx.stroke();

        // Pequenas partículas na cauda.
        for (let q = 1; q <= 3; q++) {
            const px = cx - Math.cos(ang + 0.42) * q * 5;
            const py = cy - Math.sin(ang + 0.42) * q * 5 - q * 1.2;
            ctx.globalAlpha = (0.28 / q) * vida;
            ctx.fillStyle = cor;
            ctx.beginPath();
            ctx.arc(px, py, 0.8 + p * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Iluminação localizada no chão de cada cometa.
        const glow = ctx.createRadialGradient(cx, cy + 5, 0, cx, cy + 5, 20 + p * 16);
        glow.addColorStop(0, cor === '#ff8de1'
            ? `rgba(255,141,225,${0.16 * vida})`
            : cor === '#7fffd4'
                ? `rgba(127,255,212,${0.14 * vida})`
                : cor === '#8fd8ff'
                    ? `rgba(143,216,255,${0.14 * vida})`
                    : cor === '#c39bff'
                        ? `rgba(195,155,255,${0.14 * vida})`
                        : `rgba(255,246,194,${0.14 * vida})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 21 + p * 15, 7 + p * 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ilhas de impacto no solo, pulsando em vários pontos.
    for (let p = 0; p < 7; p++) {
        const a = p * 2.17 + base * 0.25;
        const rr = z.raio * (0.22 + ((p * 31) % 50) / 100 * 0.52);
        const ix = z.x + Math.cos(a) * rr;
        const iy = z.y + Math.sin(a) * rr * 0.86;
        const pulse = 0.6 + 0.4 * Math.sin(base * 3.2 + p * 2.7);

        ctx.globalAlpha = 0.18 + pulse * 0.16;
        ctx.fillStyle = p % 3 === 0 ? '#ff8de1' : (p % 3 === 1 ? '#8fd8ff' : '#c39bff');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(ix, iy + 3, 8 + pulse * 6, 3 + pulse * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.65 + pulse * 0.25;
        ctx.strokeStyle = '#fff6c2';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(ix, iy, 4 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
};

// ============================================================================
// SKILL 2 — ORBE DE CONSTELAÇÃO
// Mantém a prisão/constelação atual e transforma APENAS o FIM em uma
// explosão astral massiva de energia, anéis e estrelas.
// ============================================================================
window.desenharOrbeConstelacao = function(z, t) {
    if (!window.ctx || !z) return;
    const ctx = window.ctx;
    const tempo = z.tempo || 40;
    const dur = z.tempoMax || 40;
    const f = Math.max(0, Math.min(1, tempo / dur));
    const base = Date.now() / 1000;

    ctx.save();

    // Campo cósmico escuro que pulsa lentamente.
    const grad = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.raio * 1.15);
    grad.addColorStop(0, `rgba(255,255,255,${0.06 + 0.05 * Math.sin(base * 2)})`);
    grad.addColorStop(0.18, `rgba(120,70,220,${0.26 + 0.08 * Math.sin(base * 2.5)})`);
    grad.addColorStop(0.55, `rgba(38,18,88,0.56)`);
    grad.addColorStop(1, 'rgba(10,5,30,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio * 1.06, z.raio * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();

    // Constelação ainda presente durante a prisão.
    const rConst = z.raio * (0.80 + 0.12 * f);
    ctx.strokeStyle = `rgba(197,160,255,${0.62 + 0.18 * f})`;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#c39bff';
    ctx.shadowBlur = 7;

    for (let n = 0; n < 8; n++) {
        const a = n * Math.PI / 4 + base * 0.16;
        const nx = z.x + Math.cos(a) * rConst;
        const ny = z.y + Math.sin(a) * rConst * 0.9;
        const a2 = (n + 2) * Math.PI / 4 + base * 0.16;
        const nx2 = z.x + Math.cos(a2) * rConst;
        const ny2 = z.y + Math.sin(a2) * rConst * 0.9;
        ctx.globalAlpha = 0.56 + 0.22 * f;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx2, ny2);
        ctx.stroke();

        ctx.globalAlpha = 0.8;
        drawEstrela(ctx, nx, ny, 2.1 + 0.8 * Math.sin(base * 3 + n), n % 2 ? '#8fd8ff' : '#fff6c2');
    }

    // Núcleo comprimindo-se.
    const compress = 1 + (1 - f) * 1.8;
    const coreRadius = 4 + compress * 2.6;
    const core = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, coreRadius * 4);
    core.addColorStop(0, `rgba(255,255,255,${0.98})`);
    core.addColorStop(0.15, `rgba(226,242,255,${0.80})`);
    core.addColorStop(0.42, `rgba(195,155,255,${0.40})`);
    core.addColorStop(1, 'rgba(80,40,180,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(z.x, z.y, coreRadius * 4, 0, Math.PI * 2);
    ctx.fill();

    // Anel de cativeiro.
    ctx.globalAlpha = 0.66 * (0.55 + 0.45 * f);
    ctx.strokeStyle = '#8fd8ff';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 7]);
    ctx.lineDashOffset = base * 10;
    const rAnel = z.raio * (0.56 * f + 0.10);
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, rAnel, rAnel * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pré-final: tudo é puxado violentamente para o núcleo.
    if (f < 0.34) {
        const fim = 1 - (f / 0.34);
        const finalAlpha = Math.min(1, fim * 1.35);

        for (let i = 0; i < 22; i++) {
            const a = i * 0.61 + base * 0.35;
            const dist = z.raio * (0.18 + fim * 0.92);
            const sx = z.x + Math.cos(a) * dist;
            const sy = z.y + Math.sin(a) * dist * 0.86;

            ctx.globalAlpha = finalAlpha * (0.42 + (i % 3) * 0.18);
            ctx.strokeStyle = i % 3 === 0 ? '#fff6c2' : (i % 3 === 1 ? '#8fd8ff' : '#c39bff');
            ctx.lineWidth = 1.3 + fim * 0.8;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(z.x, z.y);
            ctx.stroke();
        }
    }

    ctx.restore();

    // FINAL DA SKILL — explosão astral.
    // Executa somente no trecho final, sem alterar a duração/ação da skill.
    if (f < 0.17) {
        const fim = 1 - (f / 0.17);
        const alpha = Math.max(0, Math.min(1, fim * 1.18));
        desenharEstouroAstral(ctx, z.x, z.y, z.raio * (0.32 + fim * 0.55), alpha, base);

        // Flash final no chão.
        ctx.save();
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#c39bff';
        ctx.shadowBlur = 28;
        ctx.beginPath();
        ctx.ellipse(z.x, z.y + 4, z.raio * (0.55 + fim * 0.5), z.raio * (0.28 + fim * 0.22), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};

// ============================================================================
// SKILL 3 — CASCATA ESTELAR
// Refeito do zero: uma "maré" de estrelas que atravessa o cone, com rios
// luminosos no chão, arcos celestes e dezenas de estrelas em velocidades
// diferentes.
// ============================================================================
window.desenharCascataEstelar = function(z, t) {
    if (!window.ctx || !z) return;
    const ctx = window.ctx;
    const tempo = z.tempo || 34;
    const dur = z.tempoMax || 34;
    const progresso = 1 - Math.max(0, Math.min(1, tempo / dur));
    if (progresso <= 0) return;

    const ang = z.ang || z.angulo || 0;
    const base = Date.now() / 1000;

    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(ang);

    // Grande trilho luminoso no chão.
    const largura = z.raio || 110;
    const comprimento = 190 * progresso + 40;

    const trilho = ctx.createLinearGradient(0, 0, comprimento, 0);
    trilho.addColorStop(0, 'rgba(120,70,255,0)');
    trilho.addColorStop(0.45, 'rgba(143,216,255,0.10)');
    trilho.addColorStop(0.72, 'rgba(195,155,255,0.18)');
    trilho.addColorStop(1, 'rgba(255,246,194,0)');
    ctx.fillStyle = trilho;
    ctx.beginPath();
    ctx.moveTo(0, -largura * 0.48);
    ctx.lineTo(comprimento, -largura * 0.28);
    ctx.lineTo(comprimento + 10, 0);
    ctx.lineTo(comprimento, largura * 0.28);
    ctx.lineTo(0, largura * 0.48);
    ctx.closePath();
    ctx.fill();

    // Dois rios de luz curvos nas laterais do cone.
    for (let side = -1; side <= 1; side += 2) {
        ctx.globalAlpha = 0.54;
        ctx.strokeStyle = side < 0 ? '#8fd8ff' : '#c39bff';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.moveTo(2, side * 8);
        for (let p = 1; p <= 8; p++) {
            const q = p / 8;
            const px = q * comprimento;
            const py = side * (10 + q * largura * 0.42) + Math.sin(base * 2.6 + q * 9) * (3 + q * 4);
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // Arcos celestes abrindo para frente.
    for (let a = 0; a < 4; a++) {
        const shift = a * 0.28 + progresso * 0.25;
        const rx = 35 + a * 38;
        const ry = 16 + a * 17;
        ctx.globalAlpha = (0.36 - a * 0.05) * (0.55 + progresso * 0.5);
        ctx.strokeStyle = a % 2 === 0 ? '#fff6c2' : '#8fd8ff';
        ctx.lineWidth = 1.4 + a * 0.15;
        ctx.beginPath();
        ctx.ellipse(30 + a * 30, 0, rx, ry, shift, -Math.PI * 0.85, Math.PI * 0.85);
        ctx.stroke();
    }

    // Estrelas em múltiplas velocidades.
    const faixas = [
        { quantidade: 10, cor: '#fff6c2', vel: 1.35, tamanho: 1.8 },
        { quantidade: 10, cor: '#8fd8ff', vel: 1.05, tamanho: 1.5 },
        { quantidade: 9,  cor: '#c39bff', vel: 0.78, tamanho: 1.35 },
        { quantidade: 8,  cor: '#ff8de1', vel: 1.62, tamanho: 1.25 }
    ];

    for (let f = 0; f < faixas.length; f++) {
        const camada = faixas[f];
        for (let i = 0; i < camada.quantidade; i++) {
            const q = ((base * camada.vel + i * 0.29 + f * 0.13) % 1);
            const px = 18 + q * (comprimento + 22);
            const spread = largura * (0.10 + q * 0.50);
            const py = (i % 2 === 0 ? 1 : -1) *
                (spread * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + f))));
            const oscilacao = Math.sin(base * 3 + i * 1.8) * (2 + q * 5);

            ctx.globalAlpha = (0.18 + 0.78 * q) * (0.55 + 0.45 * progresso);
            ctx.fillStyle = camada.cor;
            ctx.shadowColor = camada.cor;
            ctx.shadowBlur = 5 + q * 7;

            // Trail curto.
            ctx.strokeStyle = camada.cor;
            ctx.lineWidth = 0.9 + q * 1.2;
            ctx.beginPath();
            ctx.moveTo(px - 9 - q * 7, py - oscilacao * 0.3);
            ctx.lineTo(px, py + oscilacao);
            ctx.stroke();

            drawEstrela(ctx, px, py + oscilacao, camada.tamanho + q * 1.3, camada.cor);
        }
    }

    // Cascata maior: colunas verticais de estrelas caindo do "céu".
    for (let i = 0; i < 14; i++) {
        const q = ((base * 0.85 + i * 0.17) % 1);
        const px = 34 + q * comprimento;
        const py = Math.sin(i * 2.2 + base) * largura * (0.16 + q * 0.34);
        const fall = 8 + q * 18;
        const cor = i % 3 === 0 ? '#fff6c2' : (i % 3 === 1 ? '#8fd8ff' : '#c39bff');

        ctx.globalAlpha = 0.20 + q * 0.60;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py - fall);
        ctx.lineTo(px, py);
        ctx.stroke();

        drawEstrela(ctx, px, py, 1.3 + q * 1.0, cor);
    }

    // Grande foco no final do cone.
    if (progresso > 0.72) {
        const fim = (progresso - 0.72) / 0.28;
        ctx.globalAlpha = fim * 0.75;
        const fx = comprimento;
        const gFim = ctx.createRadialGradient(fx, 0, 0, fx, 0, 34 + fim * 28);
        gFim.addColorStop(0, 'rgba(255,255,255,0.65)');
        gFim.addColorStop(0.18, 'rgba(143,216,255,0.26)');
        gFim.addColorStop(0.55, 'rgba(195,155,255,0.12)');
        gFim.addColorStop(1, 'rgba(80,40,180,0)');
        ctx.fillStyle = gFim;
        ctx.beginPath();
        ctx.arc(fx, 0, 34 + fim * 28, 0, Math.PI * 2);
        ctx.fill();
        drawEstrela(ctx, fx, 0, 3.6 + fim * 3, '#fff6c2');
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
};

// ============================================================================
// IMPACTOS CÓSMICOS
// Impacto de cometa = explosão colorida no chão.
// Dano periódico = pequena estrela/meteoro.
// Implosão = utilizado pelo final da Skill 2.
// ============================================================================
window.desenharImpactoCometa = function(z, t) {
    if (!window.ctx || !z) return;
    const ctx = window.ctx;
    const f = Math.max(0, Math.min(1, (z.tempo || 16) / (z.tempoMax || 16)));
    const tipo = z.tipo || 'impacto';
    const base = Date.now() / 1000;

    ctx.save();

    if (tipo === 'implosao') {
        // O final detalhado da Skill 2 também pode passar por aqui.
        const fim = 1 - f;
        desenharEstouroAstral(ctx, z.x, z.y, 12 + fim * 42, Math.min(1, fim * 1.15), base);

    } else if (tipo === 'dano') {
        // Pingo de cometa / DoT.
        ctx.globalAlpha = f * 0.9;
        ctx.fillStyle = '#fff6c2';
        ctx.shadowColor = '#8fd8ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(z.x, z.y, 2 + Math.sin(base * 8) * 0.8 + (1 - f) * 1.2, 0, Math.PI * 2);
        ctx.fill();

        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + base * 0.7;
            const rr = 4 + (1 - f) * 10;
            drawEstrela(
                ctx,
                z.x + Math.cos(a) * rr,
                z.y + Math.sin(a) * rr,
                0.9 + (1 - f) * 0.7,
                k % 2 ? '#c39bff' : '#8fd8ff'
            );
        }

    } else {
        // Impacto de chegada do cometa.
        const impacto = 1 - f;
        const raio = 8 + impacto * 28;

        ctx.globalAlpha = f;
        const glow = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, raio * 1.8);
        glow.addColorStop(0, `rgba(255,255,255,${0.55 * f})`);
        glow.addColorStop(0.2, `rgba(255,141,225,${0.28 * f})`);
        glow.addColorStop(0.5, `rgba(143,216,255,${0.16 * f})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(z.x, z.y, raio * 1.8, 0, Math.PI * 2);
        ctx.fill();

        for (let k = 0; k < 14; k++) {
            const a = (k / 14) * Math.PI * 2 + base * 0.2;
            const rr = 6 + impacto * (30 + (k % 4) * 7);
            const cor = k % 4 === 0 ? '#fff6c2' : (k % 4 === 1 ? '#8fd8ff' : (k % 4 === 2 ? '#c39bff' : '#ff8de1'));
            drawEstrela(ctx, z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.88, 1.1 + impacto * 1.6, cor);
        }

        ctx.globalAlpha = f * 0.7;
        ctx.strokeStyle = '#fff6c2';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#fff6c2';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(z.x, z.y + 4, 12 + impacto * 28, 4 + impacto * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
};

