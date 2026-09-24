// =====================================================================
// VFX — MAGO «BOLA ELEMENTAL» (v2 — refeito do zero)
// ---------------------------------------------------------------------
// Bola gigante que ROLA PELO CHÃO até o alvo:
//   • NORMAL (arcana): rola girando, núcleo energético, aura, partículas
//     orbitando, rastro luminoso e iluminação no chão durante o trajeto.
//   • GELO  (ao cruzar a área da NEVASCA): vira esfera de gelo com
//     cristais, neve caindo, rastro congelante; ao acertar: explosão de
//     gelo + círculo congelante no chão (+ reação congelante no inimigo,
//     enviada pelo servidor via `reacao_congelante`).
//   • FOGO  (ao cruzar o fogo deixado pelo METEORO): vira esfera de fogo
//     com chamas girando, brasas e fumaça; ao acertar: grande explosão,
//     expansão circular de fogo, brasas, fumaça e SCREEN SHAKE.
// Area do METeoro: fogo no chão por 5s (chamas, brasas, fumaça e
// iluminação) — o dano continua 100% server-side.
// =====================================================================

window.vfxListeners = window.vfxListeners || [];
window.vfxMagoBolas = [];
window.vfxMagoBolasHits = [];
window.vfxCirculosGelo = [];
// NOTA: o fogo deixado pelo METeoro no chão (5s) é desenhado por
// `efeitos.js` → `desenharEfeitosMeteoro` (dono legítimo de
// `window.chaoEmChamas`). NÃO usar esse array aqui — shape incompatível
// `{duracao, particulasFogo}` → causava TypeError e travava o jogo.

const PI2 = Math.PI * 2;

// Paleta por tipo de bola
const CORES_BOLA = {
    normal: {
        base: '#a44dff', alt: '#ffd6ff', escuro: '#3d0f7a',
        risco: 'rgba(232,200,255,0.9)', aura: 'rgba(168,85,247,0.22)',
        luz: 'rgba(168,85,247,0.20)', luzForte: 'rgba(230,170,255,0.30)',
        particula: 'rgba(220,150,255,'
    },
    gelo: {
        base: '#38c8ff', alt: '#eafcff', escuro: '#0e5c8a',
        risco: 'rgba(223,252,255,0.95)', aura: 'rgba(120,230,255,0.25)',
        luz: 'rgba(120,230,255,0.22)', luzForte: 'rgba(190,250,255,0.32)',
        particula: 'rgba(190,245,255,'
    },
    fogo: {
        base: '#ff6b1a', alt: '#ffe9a0', escuro: '#7a1500',
        risco: 'rgba(255,209,102,0.95)', aura: 'rgba(255,120,30,0.25)',
        luz: 'rgba(255,140,40,0.26)', luzForte: 'rgba(255,200,90,0.36)',
        particula: 'rgba(255,180,70,'
    }
};

// ---------- helpers de partícula ----------
function spawnParticulasBola(bola, n, spread) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * PI2;
        const v = (0.4 + Math.random() * 1.6) * (spread || 1);
        bola.ps.push({
            x: bola.x, y: bola.y,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: 0, max: 18 + Math.random() * 22,
            size: 2 + Math.random() * 3,
            tipo: 'trail'
        });
    }
}

function desenharParticulas(ctx, lista, C) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = lista.length - 1; i >= 0; i--) {
        const p = lista[i];
        p.life++;
        if (p.life >= p.max) { lista.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy;
        // brasa/fumaça têm física própria (chamadas setam vx/vy antes)
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = k;
        ctx.fillStyle = (C && C.particula) ? C.particula + (0.85 * k) + ')' : `rgba(220,150,255,${0.85 * k})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.8), 0, PI2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ---------- escuta os eventos do servidor ----------
window.vfxListeners.push(function (dados) {
    const now = Date.now();
    if (dados.type === 'action_mago_bola_elemental') {
        const speed = dados.speed || 12;
        const dist = dados.dist || 400;
        window.vfxMagoBolas.push({
            id: dados.id,
            x: dados.x, y: dados.y,
            startX: dados.x, startY: dados.y,
            targetX: dados.targetX, targetY: dados.targetY,
            ang: Math.atan2(dados.targetY - dados.y, dados.targetX - dados.x),
            speed: speed, dist: dist,
            ballType: 'normal',
            startTime: now,
            duration: (dist / speed) * 50, // casa com o tick de 50ms do servidor
            ps: []
        });
        spawnParticulasBola(window.vfxMagoBolas[window.vfxMagoBolas.length - 1], 10, 1);
    }
    else if (dados.type === 'action_mago_bola_transform') {
        const bola = window.vfxMagoBolas.find(b => b.id === dados.id);
        if (!bola) return;
        bola.ballType = dados.newType;
        // ancora na posição autoritativa do servidor e re-anima o resto do caminho
        bola.x = dados.x; bola.y = dados.y;
        bola.startX = dados.x; bola.startY = dados.y;
        const restante = Math.hypot(bola.targetX - dados.x, bola.targetY - dados.y);
        bola.duration = (restante / bola.speed) * 50;
        bola.startTime = now;
        // rajada de transformação (cristais/neve OU brasas/cinzas)
        const n = dados.newType === 'gelo' ? 22 : 28;
        for (let i = 0; i < n; i++) {
            const a = Math.random() * PI2;
            const v = 1 + Math.random() * 3.2;
            bola.ps.push({
                x: dados.x, y: dados.y,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1,
                life: 0, max: 24 + Math.random() * 26,
                size: 2 + Math.random() * 4,
                tipo: 'transform'
            });
        }
    }
    else if (dados.type === 'action_mago_bola_hit') {
        window.vfxMagoBolasHits.push({
            x: dados.x, y: dados.y,
            ballType: dados.ballType || 'normal',
            radius: dados.radius || 60,
            startTime: now,
            duration: dados.ballType === 'fogo' ? 950 : (dados.ballType === 'gelo' ? 1300 : 500),
            ps: [],
            crystals: [],
            braseiro: []
        });
        if (dados.ballType === 'fogo') {
            // SCREEN SHAKE na explosão
            window.tremorTela = Math.max(window.tremorTela || 0, 34);
            // expande o círculo congelante? não — fogo só braseira/fumaça
        }
        if (dados.ballType === 'gelo') {
            // círculo congelante no chão (fica ~1.4s)
            window.vfxCirculosGelo.push({
                x: dados.x, y: dados.y,
                raioMax: dados.radius || 85,
                startTime: now,
                duration: 1400
            });
        }
    }
    });

// ---------- desenho da bola rolante ----------
function desenharBolaElemental(ctx, bola, now) {
    const C = CORES_BOLA[bola.ballType];
    const R = 22;
    const ep = now - bola.startTime;

    if (ep < bola.duration) {
        const t = Math.min(ep / bola.duration, 1);
        bola.x = bola.startX + (bola.targetX - bola.startX) * t;
        bola.y = bola.startY + (bola.targetY - bola.startY) * t;
    }

    // 1) iluminação no chão durante o trajeto
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const luz = ctx.createRadialGradient(bola.x, bola.y + 6, 2, bola.x, bola.y + 6, R * 2.7);
    luz.addColorStop(0, C.luzForte);
    luz.addColorStop(0.45, C.luz);
    luz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = luz;
    ctx.beginPath();
    ctx.ellipse(bola.x, bola.y + 6, R * 2.7, R * 1.2, 0, 0, PI2);
    ctx.fill();
    ctx.restore();

    // 2) sombra de contato (a bola ROELA PELO CHÃO)
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(bola.x, bola.y + R * 0.6, R * 1.15, R * 0.45, 0, 0, PI2);
    ctx.fill();

    // 3) rastro luminoso atrás
    if (Math.random() > 0.25) {
        bola.ps.push({
            x: bola.x - Math.cos(bola.ang) * R * 0.6 + (Math.random() - 0.5) * 8,
            y: bola.y - Math.sin(bola.ang) * R * 0.6 + (Math.random() - 0.5) * 8,
            vx: -Math.cos(bola.ang) * 0.6 + (Math.random() - 0.5) * 0.4,
            vy: -Math.sin(bola.ang) * 0.6 + (Math.random() - 0.5) * 0.4,
            life: 0, max: 14 + Math.random() * 10,
            size: 2.5 + Math.random() * 3,
            tipo: 'trail'
        });
    }

    // 4) partículas específicas por tipo
    if (bola.ballType === 'gelo' && Math.random() > 0.5) {
        // neve caindo
        bola.ps.push({
            x: bola.x + (Math.random() - 0.5) * R * 1.6,
            y: bola.y + (Math.random() - 0.5) * R * 1.4 - 8,
            vx: (Math.random() - 0.5) * 0.3,
            vy: 0.5 + Math.random() * 0.5,
            life: 0, max: 26 + Math.random() * 12,
            size: 1.5 + Math.random() * 2,
            tipo: 'neve'
        });
    }
    if (bola.ballType === 'fogo') {
        if (Math.random() > 0.65) {
            // brasas subindo
            bola.ps.push({
                x: bola.x + (Math.random() - 0.5) * R,
                y: bola.y - 6,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -1 - Math.random(),
                life: 0, max: 20 + Math.random() * 14,
                size: 1.8 + Math.random() * 2.4,
                tipo: 'brasa'
            });
        }
        if (Math.random() > 0.88) {
            // fumaça
            bola.ps.push({
                x: bola.x + (Math.random() - 0.5) * R * 0.8,
                y: bola.y - 4,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.8 - Math.random() * 0.5,
                life: 0, max: 34 + Math.random() * 20,
                size: 5 + Math.random() * 5,
                tipo: 'fumaca'
            });
        }
    }

    // 5) partículas
    desenharParticulas(ctx, bola.ps, C);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = bola.ps.length - 1; i >= 0; i--) {
        const p = bola.ps[i];
        if (p.tipo === 'brasa') { const k = 1 - p.life / p.max; ctx.fillStyle = `rgba(255,${Math.round(120 + 120 * k)},50,${0.8 * k})`; }
        else if (p.tipo === 'fumaca') { const k = 1 - p.life / p.max; ctx.fillStyle = `rgba(120,120,130,${0.25 * k})`; }
        else if (p.tipo === 'neve') { const k = 1 - p.life / p.max; ctx.fillStyle = `rgba(235,252,255,${0.85 * k})`; }
        if (p.tipo === 'brasa' || p.tipo === 'fumaca' || p.tipo === 'neve') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.5 + (1 - p.life / p.max)), 0, PI2);
            ctx.fill();
        }
    }
    ctx.restore();

    // 6) corpo da esfera (gira pelo chão)
    ctx.save();
    ctx.translate(bola.x, bola.y);

    // aura
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.9);
    aura.addColorStop(0, C.aura);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, PI2); ctx.fill();
    ctx.restore();

    // esfera base 3D
    const g = ctx.createRadialGradient(-R * 0.32, -R * 0.34, R * 0.12, 0, 0, R);
    g.addColorStop(0, C.alt);
    g.addColorStop(0.5, C.base);
    g.addColorStop(1, C.escuro);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.fill();

    // padrão rolante: meridianos girando no eixo do movimento (leitura de "rola")
    ctx.save();
    ctx.rotate(bola.ang);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.clip();
    const passo = R * 0.55;
    const viaja = (now * 0.012) % (passo * 3);
    ctx.lineWidth = Math.max(2, R * 0.085);
    for (let k = 0; k < 4; k++) {
        const cx = k * passo - viaja - passo;
        if (Math.abs(cx) > R) continue;
        const half = Math.sqrt(Math.max(0, R * R - cx * cx));
        ctx.strokeStyle = C.risco;
        ctx.globalAlpha = 0.6 * (1 - Math.abs(cx) / R * 0.5);
        ctx.beginPath();
        ctx.ellipse(cx, 0, 2, half, 0, 0, PI2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // detalhes por tipo
    if (bola.ballType === 'normal') {
        // anéis arcanos contra-rotativos + brilho do núcleo
        ctx.strokeStyle = 'rgba(255,190,255,0.65)';
        ctx.lineWidth = 2;
        const r1 = R * 1.45, rot1 = now * 0.0016;
        ctx.beginPath(); ctx.ellipse(0, 0, r1, r1 * 0.42, rot1, 0, PI2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, r1 * 0.92, r1 * 0.42, -rot1 * 1.4, 0, PI2); ctx.stroke();
        // núcleo energético brilhante
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const nc = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.55);
        nc.addColorStop(0, 'rgba(255,240,255,0.95)');
        nc.addColorStop(0.5, 'rgba(220,120,255,0.55)');
        nc.addColorStop(1, 'rgba(140,40,255,0)');
        ctx.fillStyle = nc;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, PI2); ctx.fill();
        ctx.restore();
    } else if (bola.ballType === 'gelo') {
        // cristais de gelo ao redor
        for (let k2 = 0; k2 < 5; k2++) {
            const a2 = now * 0.0012 + k2 * (PI2 / 5);
            const dx = Math.cos(a2) * R * 1.3, dy = Math.sin(a2) * R * 1.3;
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(a2 + Math.PI / 3);
            ctx.fillStyle = 'rgba(220,250,255,0.9)';
            ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(3.8, 4); ctx.lineTo(-3.8, 4); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(180,240,255,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 4); ctx.stroke();
            ctx.restore();
        }
        // brilho gélido central
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ncg = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.5);
        ncg.addColorStop(0, 'rgba(255,255,255,0.95)');
        ncg.addColorStop(0.5, 'rgba(160,245,255,0.5)');
        ncg.addColorStop(1, 'rgba(80,200,255,0)');
        ctx.fillStyle = ncg;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, PI2); ctx.fill();
        ctx.restore();
    } else {
        // chamas girando ao redor da esfera de fogo
        for (let k2 = 0; k2 < 7; k2++) {
            const a2 = now * 0.008 + k2 * (PI2 / 7);
            const dx = Math.cos(a2) * R * 0.9, dy = Math.sin(a2) * R * 0.9;
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(a2 + Math.PI / 2);
            const fl = ctx.createLinearGradient(0, -11, 0, 6);
            fl.addColorStop(0, 'rgba(255,235,130,0.95)');
            fl.addColorStop(0.6, 'rgba(255,95,0,0.85)');
            fl.addColorStop(1, 'rgba(170,25,0,0.15)');
            ctx.fillStyle = fl;
            ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(5, 2); ctx.lineTo(0, 6.5); ctx.lineTo(-5, 2); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        // brilho do magma central
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ncf = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.6);
        ncf.addColorStop(0, 'rgba(255,250,210,0.95)');
        ncf.addColorStop(0.5, 'rgba(255,170,60,0.55)');
        ncf.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = ncf;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, PI2); ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

// ---------- impacto: explosão de fogo ----------
function desenharHitFogo(ctx, hit, now) {
    const e = now - hit.startTime;
    const t = Math.min(e / hit.duration, 1); // 0→1
    const k = 1 - t;

    ctx.save();
    ctx.translate(hit.x, hit.y);

    // flash
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flash = ctx.createRadialGradient(0, 0, 2, 0, 0, hit.radius * (0.6 + t * 0.4));
    flash.addColorStop(0, `rgba(255,250,215,${0.85 * k})`);
    flash.addColorStop(0.35, `rgba(255,160,60,${0.55 * k})`);
    flash.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = flash;
    ctx.beginPath(); ctx.arc(0, 0, hit.radius * (0.6 + t * 0.4), 0, PI2); ctx.fill();
    ctx.restore();

    // expansão circular de fogo no chão (anéis)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 3; r++) {
        const rr = hit.radius * (0.25 + t * 0.75) * (0.72 + r * 0.16);
        ctx.strokeStyle = r === 0 ? `rgba(255,235,150,${0.7 * k})` : `rgba(255,${Math.round(120 - r * 25)},30,${0.45 * k})`;
        ctx.lineWidth = (4 - r) * 1.4 * k + 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 4, rr, rr * 0.4, 0, 0, PI2);
        ctx.stroke();
    }
    ctx.restore();

    // brasas com gravidade + fumaça subindo
    if (hit.ps.length === 0) {
        for (let i = 0; i < 26; i++) {
            const a = Math.random() * PI2;
            const v = 1.5 + Math.random() * 5;
            hit.ps.push({ x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 0, max: 18 + Math.random() * 26, size: 2 + Math.random() * 3.5 });
        }
        for (let i = 0; i < 10; i++) {
            const a = Math.random() * PI2;
            const v = 0.4 + Math.random() * 1.2;
            hit.braseiro.push({ x: 0, y: 0, vx: Math.cos(a) * v * 0.6, vy: -1.2 - Math.random() * 1.6, life: 0, max: 30 + Math.random() * 24, size: 5 + Math.random() * 6 });
        }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = hit.ps.length - 1; i >= 0; i--) {
        const p = hit.ps[i];
        p.life++;
        if (p.life >= p.max) { hit.ps.splice(i, 1); continue; }
        p.vy += 0.09;
        p.x += p.vx; p.y += p.vy;
        const kk = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(255,${Math.round(120 + 120 * kk)},40,${0.9 * kk})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * kk, 0, PI2); ctx.fill();
    }
    ctx.restore();
    ctx.save();
    for (let i = hit.braseiro.length - 1; i >= 0; i--) {
        const p = hit.braseiro[i];
        p.life++;
        if (p.life >= p.max) { hit.braseiro.splice(i, 1); continue; }
        p.vy -= 0.015;
        p.x += p.vx; p.y += p.vy;
        p.size += 0.12;
        const kk = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(130,130,140,${0.28 * kk})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, PI2); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
}

// ---------- impacto: explosão de gelo ----------
function desenharHitGelo(ctx, hit, now) {
    const e = now - hit.startTime;
    const t = Math.min(e / hit.duration, 1);
    const k = 1 - t;

    ctx.save();
    ctx.translate(hit.x, hit.y);

    // anel de gelo expandindo (frost nova)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 2; r++) {
        const rr = hit.radius * (0.2 + t * 0.8) * (0.8 + r * 0.2);
        ctx.strokeStyle = r === 0 ? `rgba(235,255,255,${0.8 * k})` : `rgba(120,230,255,${0.5 * k})`;
        ctx.lineWidth = (3 - r) * 1.3 * k + 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 4, rr, rr * 0.4, 0, 0, PI2);
        ctx.stroke();
    }
    ctx.restore();

    // estilhaços de gelo
    if (hit.ps.length === 0) {
        for (let i = 0; i < 18; i++) {
            const a = Math.random() * PI2;
            const v = 1 + Math.random() * 4.5;
            hit.ps.push({
                x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                life: 0, max: 20 + Math.random() * 26, size: 2.5 + Math.random() * 3.5, rot: Math.random() * Math.PI
            });
        }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = hit.ps.length - 1; i >= 0; i--) {
        const p = hit.ps[i];
        p.life++;
        if (p.life >= p.max) { hit.ps.splice(i, 1); continue; }
        p.vy += 0.14;
        p.x += p.vx; p.y += p.vy;
        p.rot += 0.15;
        const kk = 1 - p.life / p.max;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(210,250,255,${0.9 * kk})`;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size * 0.7, p.size);
        ctx.restore();
    }
    ctx.restore();
    ctx.restore();
}

// ---------- impacto: normal (arcana) ----------
function desenharHitNormal(ctx, hit, now) {
    const e = now - hit.startTime;
    const t = Math.min(e / hit.duration, 1);
    const k = 1 - t;

    ctx.save();
    ctx.translate(hit.x, hit.y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rr = hit.radius * (0.3 + t * 0.7);
    ctx.strokeStyle = `rgba(210,140,255,${0.75 * k})`;
    ctx.lineWidth = 3 * k + 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 4, rr, rr * 0.4, 0, 0, PI2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
}

// ---------- círculos congelantes no chão (hit gelo) ----------
function desenharCirculosGelo(ctx, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = window.vfxCirculosGelo.length - 1; i >= 0; i--) {
        const c = window.vfxCirculosGelo[i];
        const e = now - c.startTime;
        if (e >= c.duration) { window.vfxCirculosGelo.splice(i, 1); continue; }
        const t = e / c.duration;
        const expande = Math.min(1, t * 2.2);        // cresce rápido
        const some = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1; // some no final
        const raioAtual = c.raioMax * expande;

        // geada no chão
        const frost = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, raioAtual);
        frost.addColorStop(0, `rgba(220,250,255,${0.34 * some})`);
        frost.addColorStop(0.7, `rgba(120,225,255,${0.20 * some})`);
        frost.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = frost;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 4, raioAtual, raioAtual * 0.42, 0, 0, PI2);
        ctx.fill();

        // cristais quebrados na borda
        if (expande >= 1) {
            for (let ck = 0; ck < 7; ck++) {
                const a = now * 0.0009 + ck * (PI2 / 7);
                const dx = Math.cos(a) * raioAtual * 0.9;
                const dy = Math.sin(a) * raioAtual * 0.4;
                ctx.fillStyle = `rgba(225,250,255,${0.5 * some})`;
                ctx.beginPath();
                ctx.arc(c.x + dx, c.y + 4 + dy, 2.4, 0, PI2);
                ctx.fill();
            }
        }
    }
    ctx.restore();
}

// ---------- dispatcher principal ----------
window.desenharVfxMagoBola = function (ctx) {
    const now = Date.now();

    // círculos congelantes do hit de gelo
    desenharCirculosGelo(ctx, now);

    // bolas ativas
    for (let i = window.vfxMagoBolas.length - 1; i >= 0; i--) {
        const bola = window.vfxMagoBolas[i];
        if (now - bola.startTime >= bola.duration) {
            // explodiu no fim do trajeto sem acertar nada — visual de dissipação
            window.vfxMagoBolas.splice(i, 1);
            continue;
        }
        desenharBolaElemental(ctx, bola, now);
    }

    // impactos
    for (let i = window.vfxMagoBolasHits.length - 1; i >= 0; i--) {
        const hit = window.vfxMagoBolasHits[i];
        if (now - hit.startTime >= hit.duration) { window.vfxMagoBolasHits.splice(i, 1); continue; }
        if (hit.ballType === 'fogo') desenharHitFogo(ctx, hit, now);
        else if (hit.ballType === 'gelo') desenharHitGelo(ctx, hit, now);
        else desenharHitNormal(ctx, hit, now);
    }
};