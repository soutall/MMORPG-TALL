// efeitos/boss_golem.js - GOLEM DE PEDRA (Boss)
// Renderização do golem gigante, pedra arremessada, marca de perigo no chão e impacto
window.marcasBoss = [];
window.impactosPedra = [];
window._pedraTrails = {};

// Fator de escala visual do golem (0.6 = 40% menor)
const BOSS_ESCALA = 0.6;

window.__golemEscudoCache = window.__golemEscudoCache || {};
window.__golemBolhaEscudoCache = window.__golemBolhaEscudoCache || {};

function obterCorEscudo(tipo) {
    if (tipo === 'vermelho') {
        return {
            r: 255,
            g: 80,
            b: 60,
            glow: 'rgba(255,80,60,1)',
            topo: 'rgba(255,255,255,0.35)',
            meio: 'rgba(255,80,60,0.16)',
            fundo: 'rgba(255,80,60,0.02)',
            contorno: 'rgba(255,80,60,0.90)'
        };
    }

    return {
        r: 60,
        g: 140,
        b: 255,
        glow: 'rgba(60,140,255,1)',
        topo: 'rgba(255,255,255,0.35)',
        meio: 'rgba(60,140,255,0.16)',
        fundo: 'rgba(60,140,255,0.02)',
        contorno: 'rgba(60,140,255,0.90)'
    };
}

function criarCacheEscudoGolem(tipo) {
    if (!window || typeof window === 'undefined') return null;

    const cor = obterCorEscudo(tipo);
    const tamanho = 320;
    const canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(tamanho, tamanho) : document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = tamanho;
    canvas.height = tamanho;

    const cx = tamanho / 2;
    const cy = tamanho / 2;

    ctx.clearRect(0, 0, tamanho, tamanho);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 45;
    ctx.shadowColor = cor.glow;

    const grad = ctx.createRadialGradient(cx, cy - 20, 8, cx, cy, 150);
    grad.addColorStop(0, 'rgba(' + cor.r + ',' + cor.g + ',' + cor.b + ',0.05)');
    grad.addColorStop(0.6, cor.meio);
    grad.addColorStop(0.95, 'rgba(' + cor.r + ',' + cor.g + ',' + cor.b + ',0.30)');
    grad.addColorStop(1, cor.fundo);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 150, 118, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = cor.topo;
    ctx.beginPath();
    ctx.ellipse(cx - 42, cy - 63, 30, 12, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = cor.contorno;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 150, 118, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const px = cx + Math.cos(ang) * 160;
        const py = cy + Math.sin(ang) * 125;
        const rrMini = 7 + Math.sin(i * 2) * 3;
        ctx.beginPath();
        ctx.ellipse(px, py, rrMini, rrMini * 0.85, ang, 0, Math.PI * 2);
        ctx.strokeStyle = cor.contorno;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
    }

    ctx.restore();
    return { canvas, tipo, cor };
}

function criarCacheBolhaEscudo(tipo) {
    if (!window || typeof window === 'undefined') return null;

    const cor = obterCorEscudo(tipo);
    const tamanho = 72;
    const canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(tamanho, tamanho) : document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = tamanho;
    canvas.height = tamanho;

    const cx = tamanho / 2;
    const cy = tamanho / 2;
    ctx.clearRect(0, 0, tamanho, tamanho);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 16;
    ctx.shadowColor = cor.glow;

    const grad = ctx.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.60)');
    grad.addColorStop(0.35, 'rgba(' + cor.r + ',' + cor.g + ',' + cor.b + ',0.45)');
    grad.addColorStop(1, 'rgba(' + cor.r + ',' + cor.g + ',' + cor.b + ',0.05)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = cor.contorno;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    return { canvas, tipo };
}

function obterCacheEscudoGolem(tipo) {
    const key = tipo || 'padrao';
    if (!window.__golemEscudoCache[key]) {
        window.__golemEscudoCache[key] = criarCacheEscudoGolem(tipo);
    }
    return window.__golemEscudoCache[key];
}

function obterCacheBolhaEscudo(tipo) {
    const key = tipo || 'padrao';
    if (!window.__golemBolhaEscudoCache[key]) {
        window.__golemBolhaEscudoCache[key] = criarCacheBolhaEscudo(tipo);
    }
    return window.__golemBolhaEscudoCache[key];
}

window.desenharEscudoGolemCache = function(g, x, y, t) {
    if (!g || !g.escudoTipo || !window.ctx) return;

    const cache = obterCacheEscudoGolem(g.escudoTipo);
    const cacheBolha = obterCacheBolhaEscudo(g.escudoTipo);
    if (!cache || !cacheBolha) return;

    const ctx = window.ctx;
    const cy = y - 60 * BOSS_ESCALA;
    const escudoScale = BOSS_ESCALA;
    const alpha = 0.72 + Math.sin(t * 4) * 0.18;

    ctx.save();
    ctx.translate(x, cy);
    ctx.globalAlpha = alpha;
    ctx.scale(escudoScale, escudoScale);
    ctx.drawImage(cache.canvas, -cache.canvas.width / 2, -cache.canvas.height / 2);

    const radius = 150;
    const orbitAlpha = 0.38 + Math.sin(t * 3.2) * 0.12;
    for (let i = 0; i < 6; i++) {
        const ang = t * 0.8 + (i / 6) * Math.PI * 2;
        const px = Math.cos(ang) * (radius + 10);
        const py = Math.sin(ang) * ((radius + 10) * 0.78);
        const sx = px - cacheBolha.canvas.width / 2;
        const sy = py - cacheBolha.canvas.height / 2;
        ctx.globalAlpha = orbitAlpha + (i / 6) * 0.2;
        ctx.drawImage(cacheBolha.canvas, sx, sy, cacheBolha.canvas.width, cacheBolha.canvas.height);
    }
    ctx.restore();
};

window.criarLevantarGolem = function(x, y) {
    if (typeof tocarSomAtaqueGolem === 'function') tocarSomAtaqueGolem();
    window.tremorTela = Math.max(window.tremorTela, 5);
    let particulas = [];
    for (let i = 0; i < 14; i++) {
        let ang = Math.PI + (Math.random() - 0.5) * Math.PI;
        let vel = 1 + Math.random() * 3;
        particulas.push({
            x: x + (Math.random() - 0.5) * 90,
            y: y + (Math.random() - 0.5) * 12,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 1,
            tam: 3 + Math.random() * 5,
            vida: 18 + Math.random() * 15,
            cor: "#8a9ba8"
        });
    }
    window.impactosPedra.push({ x: x, y: y + 6, tempo: 0, particulas: particulas, poeira: true });
};

window.criarMarcaBoss = function(x, y) {
    window.marcasBoss.push({ x: x, y: y, tempo: 0, dur: 55 });
};

window.criarImpactoPedra = function(x, y) {
    if (typeof tocarSomImpactoMeteoro === 'function') tocarSomImpactoMeteoro();
    if (typeof tocarSomImpactoPesado === 'function') tocarSomImpactoPesado();
    let particulas = [];
    for (let i = 0; i < 34; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = 2.5 + Math.random() * 6.5;
        let cores = ["#8a9ba8", "#5d6d7e", "#aeb6bf", "#ff9500", "#7f8c8d"];
        particulas.push({
            x: x, y: y,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 2.5,
            tam: 2 + Math.random() * 6,
            vida: 30 + Math.random() * 28,
            cor: cores[Math.floor(Math.random() * cores.length)]
        });
    }
    window.impactosPedra.push({ x: x, y: y, tempo: 0, particulas: particulas });
    window.tremorTela = Math.max(window.tremorTela, 18);
};

window.criarMorteGolem = function(x, y) {
    if (typeof tocarSomImpactoMeteoro === 'function') tocarSomImpactoMeteoro();
    let particulas = [];
    for (let i = 0; i < 52; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = 3 + Math.random() * 8;
        let cores = ["#ff9500", "#ff6b00", "#5d6d7e", "#8a9ba8", "#ffcc66", "#2e86c1"];
        particulas.push({
            x: x + (Math.random() - 0.5) * 70,
            y: y - 150 + Math.random() * 150,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 3,
            tam: 3 + Math.random() * 8,
            vida: 40 + Math.random() * 35,
            cor: cores[Math.floor(Math.random() * cores.length)]
        });
    }
    window.impactosPedra.push({ x: x, y: y - 150, tempo: 0, particulas: particulas, morte: true });
    window.tremorTela = Math.max(window.tremorTela, 24);
    window.floatingTexts.push({ x: x, y: y - 220, text: "👹 GOLEM DESTRUÍDO!", color: "#f39c12", alpha: 1.0 });
};

window.desenharMarcasBoss = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;
    for (let i = window.marcasBoss.length - 1; i >= 0; i--) {
        let m = window.marcasBoss[i];
        m.tempo++;
        if (m.tempo > m.dur) {
            window.marcasBoss.splice(i, 1);
            continue;
        }

        let progIn = Math.min(1, m.tempo / 8);
        let progOut = Math.max(0, (m.dur - m.tempo) / 12);
        let alpha = Math.max(0, Math.min(progIn, progOut));
        let pulso = 0.9 + Math.sin(m.tempo * 0.45) * 0.12;
        let r = 84 * pulso;

        ctx.save();
        let g = ctx.createRadialGradient(m.x, m.y, 4, m.x, m.y, r);
        g.addColorStop(0, "rgba(255,50,20," + alpha * 0.5 + ")");
        g.addColorStop(0.7, "rgba(230,40,15," + alpha * 0.3 + ")");
        g.addColorStop(1, "rgba(120,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,70,25," + alpha + ")";
        ctx.lineWidth = 6;
        ctx.setLineDash([20, 14]);
        ctx.lineDashOffset = -m.tempo * 5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(255,215,120," + alpha * 0.9 + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 26 * pulso, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,140,70," + alpha * 0.85 + ")";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(m.x - r * 0.55, m.y);
        ctx.lineTo(m.x + r * 0.55, m.y);
        ctx.moveTo(m.x, m.y - r * 0.55);
        ctx.lineTo(m.x, m.y + r * 0.55);
        ctx.stroke();
        ctx.restore();
    }
};

window.desenharImpactosPedra = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;
    for (let i = window.impactosPedra.length - 1; i >= 0; i--) {
        let im = window.impactosPedra[i];
        im.tempo++;
        let prog = im.tempo / 42;
        if (prog >= 1) {
            window.impactosPedra.splice(i, 1);
            continue;
        }

        let raioAnel = 24 + prog * 110;
        let alphaAnel = (1 - prog) * 0.9;

        ctx.save();
        ctx.strokeStyle = im.morte ? "rgba(255,150,40," + alphaAnel + ")" : "rgba(255,130,35," + alphaAnel + ")";
        ctx.lineWidth = 7 * (1 - prog) + 2;
        ctx.beginPath();
        ctx.arc(im.x, im.y, raioAnel, 0, Math.PI * 2);
        ctx.stroke();

        if (!im.poeira) {
            ctx.fillStyle = im.morte ? "rgba(255,170,50," + (1 - prog) * 0.55 + ")" : "rgba(255,150,55," + (1 - prog) * 0.45 + ")";
            ctx.beginPath();
            ctx.arc(im.x, im.y, 46 * (1 - prog) + 10, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let p of im.particulas) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.45;
            p.vida--;
            let a = Math.max(0, Math.min(1, p.vida / 20));
            if (a <= 0) continue;
            ctx.globalAlpha = a;
            ctx.fillStyle = p.cor;
            ctx.fillRect(p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam);
        }
        ctx.restore();
    }
};

window.desenharBossGolem = function(g) {
    if (!window.ctx || g.hp <= 0) return;
    let ctx = window.ctx;
    let x = g.x, y = g.y;
    let t = Date.now() / 320;

    let trails = window._pedraTrails[g.id];
    if (!trails) { trails = window._pedraTrails[g.id] = []; }

    let lado = (Math.cos(g.angulo) >= 0) ? 1 : -1;
    let agitado = (g.fase === 'levantar' || g.fase === 'lancar');
    let alerta = (g.fase === 'marcar');

    let trailsObj = trails;
    if (g.fase === 'lancar' || g.fase === 'retorno') {
        if (g._trailTick === undefined) g._trailTick = 0; else g._trailTick++;
        if (g._trailTick % 2 === 0) {
            trailsObj.push({ x: g.pedraX, y: g.pedraY, a: 0.45 });
            if (trailsObj.length > 8) trailsObj.shift();
        }
    } else {
        trailsObj.length = 0;
    }

    // ===== SOMBRA DO GOLEM =====
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 100 * BOSS_ESCALA, 30 * BOSS_ESCALA, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ===== ESCUDO CACHEADO =====
    if (g.escudoTipo) {
        window.desenharEscudoGolemCache(g, x, y, t);
    }

    // ===== POEIRA AMBIENTE =====
    ctx.save();
    ctx.fillStyle = "rgba(180,190,200,0.4)";
    for (let i = 0; i < 4; i++) {
        let pxx = x + Math.sin(t + i * 1.7) * 88 * BOSS_ESCALA;
        let pyy = y - 40 * BOSS_ESCALA + ((t * 5 + i * 45) % (170 * BOSS_ESCALA));
        ctx.fillRect(pxx - 2, pyy - 2, 4, 4);
    }
    ctx.restore();

    let shake = (agitado || alerta) ? Math.sin(t * 30) * 1.7 : 0;

    ctx.save();
    ctx.translate(x + shake, y);
    ctx.scale(BOSS_ESCALA, BOSS_ESCALA);

    // ===== TRONCO DO GOLEM (monólito de pedra rígida) =====
    let grad = ctx.createLinearGradient(-70, -256, 70, -8);
    grad.addColorStop(0, "#93a5b6");
    grad.addColorStop(0.5, "#66798c");
    grad.addColorStop(1, "#46576a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-70, -254);
    ctx.lineTo(-60, -208);
    ctx.lineTo(-64, -168);
    ctx.lineTo(-48, -124);
    ctx.lineTo(-54, -74);
    ctx.lineTo(-44, -30);
    ctx.lineTo(-58, -16);
    ctx.lineTo(58, -16);
    ctx.lineTo(44, -30);
    ctx.lineTo(54, -74);
    ctx.lineTo(48, -124);
    ctx.lineTo(64, -168);
    ctx.lineTo(60, -208);
    ctx.lineTo(70, -254);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3f4c57";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Base de pedra assentada no chão
    ctx.fillStyle = "#4f5d6b";
    ctx.fillRect(-66, -18, 132, 18);
    ctx.strokeStyle = "rgba(40,52,63,0.85)";
    ctx.lineWidth = 4;
    ctx.strokeRect(-66, -18, 132, 18);

    // Placas de rocha facetadas (rigidez)
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(-60, -238); ctx.lineTo(-28, -214); ctx.lineTo(-40, -174); ctx.lineTo(-64, -188); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(10,20,30,0.16)";
    ctx.beginPath();
    ctx.moveTo(36, -224); ctx.lineTo(62, -202); ctx.lineTo(52, -156); ctx.lineTo(28, -172); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(-30, -120); ctx.lineTo(-6, -96); ctx.lineTo(-14, -52); ctx.lineTo(-38, -70); ctx.closePath(); ctx.fill();

    // Fissuras e rachaduras (marcas de pedra)
    ctx.strokeStyle = "rgba(30,42,54,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-56, -226); ctx.lineTo(-22, -198); ctx.lineTo(-34, -162); ctx.lineTo(-8, -130);
    ctx.moveTo(-30, -212); ctx.lineTo(16, -190);
    ctx.moveTo(42, -218); ctx.lineTo(24, -170); ctx.lineTo(38, -122); ctx.lineTo(12, -92);
    ctx.moveTo(-44, -96); ctx.lineTo(-16, -58); ctx.lineTo(6, -84);
    ctx.moveTo(8, -44); ctx.lineTo(-14, -16); ctx.lineTo(8, -18);
    ctx.stroke();

    // ===== MUSGO =====
    ctx.fillStyle = "rgba(52,132,63,0.55)";
    ctx.beginPath(); ctx.ellipse(-52, -186, 16, 9, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(40, -160, 12, 7, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, -246, 10, 5, 0, 0, Math.PI * 2); ctx.fill();

    // ===== RUNAS ENERGÉTICAS NO PEITO =====
    let pulsoRuna = alerta ? 1.0 : (0.55 + Math.sin(t * 2) * 0.35);
    ctx.shadowColor = alerta ? "#ff2d00" : "#ff8c00";
    ctx.shadowBlur = 30 * pulsoRuna;
    ctx.strokeStyle = alerta ? "#ff3b00" : "rgba(255,150,0," + (0.5 + pulsoRuna * 0.4) + ")";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, -196, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -220); ctx.lineTo(0, -172);
    ctx.moveTo(-25, -196); ctx.lineTo(25, -196);
    ctx.moveTo(-16, -212); ctx.lineTo(16, -180);
    ctx.moveTo(-16, -180); ctx.lineTo(16, -212);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ===== GOLA DE PEDRA (pescoço) =====
    ctx.fillStyle = "#5d6d7e";
    ctx.fillRect(-56, -262, 112, 14);
    ctx.strokeStyle = "#3f4c57";
    ctx.lineWidth = 4;
    ctx.strokeRect(-56, -262, 112, 14);
    ctx.fillStyle = "rgba(30,42,54,0.6)";
    ctx.fillRect(-38, -258, 76, 3);

    // ===== CABEÇA (bloco rígido) =====
    ctx.fillStyle = "#7d8e9f";
    ctx.beginPath();
    ctx.moveTo(-46, -326);
    ctx.lineTo(-38, -266);
    ctx.lineTo(38, -266);
    ctx.lineTo(46, -326);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3f4c57";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(30,42,54,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, -316); ctx.lineTo(-18, -300); ctx.lineTo(-26, -286);
    ctx.moveTo(16, -318); ctx.lineTo(26, -294);
    ctx.stroke();

    // Sobrancelha de pedra (capacete)
    ctx.fillStyle = "#55636f";
    ctx.fillRect(-48, -334, 96, 16);
    ctx.strokeStyle = "#3f4c57";
    ctx.lineWidth = 4;
    ctx.strokeRect(-48, -334, 96, 16);

    // Olhos brilhantes
    let corOlho = alerta ? "#ff2d00" : "#ff9a3c";
    ctx.shadowColor = corOlho;
    ctx.shadowBlur = alerta ? 24 : 12;
    ctx.fillStyle = corOlho;
    ctx.fillRect(-22, -298, 14, 8);
    ctx.fillRect(8, -298, 14, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-20, -296, 5, 3);
    ctx.fillRect(10, -296, 5, 3);

    // Boca rachada
    ctx.strokeStyle = "#3f4c57";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-16, -276); ctx.lineTo(0, -270); ctx.lineTo(16, -276);
    ctx.stroke();

    ctx.restore();

    // ===== RASTRO DA PEDRA =====
    ctx.save();
    for (let i = 0; i < trailsObj.length; i++) {
        let tr = trailsObj[i];
        ctx.globalAlpha = tr.a * ((i + 1) / trailsObj.length) * 0.7;
        ctx.fillStyle = "#4d5960";
        let trLarg = 44 * BOSS_ESCALA, trAlt = 110 * BOSS_ESCALA;
        ctx.fillRect(tr.x - trLarg / 2, tr.y - trAlt / 2, trLarg, trAlt);
    }
    ctx.restore();

    // ===== PEDRA FLUTUANTE =====
    window.desenharPedraGolem(g, t, alerta);

    // ===== NOME + BARRA DE VIDA =====
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 17px Arial";
    ctx.fillStyle = "#f39c12";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 6;
    ctx.fillText(g.nome || "GOLEM DE PEDRA", x, y - 358 * BOSS_ESCALA);
    ctx.shadowBlur = 0;
    let barW = 170 * BOSS_ESCALA, barH = 11;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - barW / 2, y - 351 * BOSS_ESCALA, barW, barH);
    let ratio = Math.max(0, g.hp / g.maxHp);
    ctx.fillStyle = ratio > 0.3 ? "#e74c3c" : "#ff2d00";
    ctx.fillRect(x - barW / 2 + 1, y - 350 * BOSS_ESCALA, (barW - 2) * ratio, barH - 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x - barW / 2 + 1, y - 350 * BOSS_ESCALA, (barW - 2) * ratio, 3);
    ctx.restore();
};

window.desenharPedraGolem = function(g, t, alerta) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let largura = 78 * BOSS_ESCALA, altura = 200 * BOSS_ESCALA;
    let w = largura / 2, h = altura / 2;

    // Sombra no chão sob a pedra (formato da laje vertical)
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(g.pedraX, g.pedraY + h + 18, largura * 0.5, largura * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    let rot = (g.fase === 'lancar' || g.fase === 'retorno') ? t * 4 : t * 0.5;
    ctx.save();
    ctx.translate(g.pedraX, g.pedraY);
    ctx.rotate(Math.sin(rot) * 0.16);

    // Bloco retangular vertical (laje de pedra)
    let g2 = ctx.createLinearGradient(-w, -h, w * 0.8, h * 0.6);
    g2.addColorStop(0, "#c3c9cd");
    g2.addColorStop(0.5, "#7d8e9f");
    g2.addColorStop(1, "#4d5960");
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(-w + 12, -h - 8);
    ctx.lineTo(-w, -h + 16);
    ctx.lineTo(-w + 6, 0);
    ctx.lineTo(-w, h - 14);
    ctx.lineTo(-w + 14, h + 6);
    ctx.lineTo(w - 14, h + 6);
    ctx.lineTo(w, h - 14);
    ctx.lineTo(w - 6, 0);
    ctx.lineTo(w, -h + 16);
    ctx.lineTo(w - 12, -h - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3f4c57";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Facetas de rocha do bloco
    ctx.strokeStyle = "rgba(63,76,87,0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w + 14, -h + 22); ctx.lineTo(-20, -h + 58); ctx.lineTo(-w + 18, -h + 98);
    ctx.moveTo(22, -h + 16); ctx.lineTo(w - 12, -h + 46); ctx.lineTo(18, -h + 88);
    ctx.moveTo(-26, -18); ctx.lineTo(8, 16); ctx.lineTo(-30, 54);
    ctx.moveTo(14, 40); ctx.lineTo(w - 10, 76); ctx.lineTo(24, 116);
    ctx.stroke();

    // Fissuras verticais
    ctx.strokeStyle = "rgba(30,42,54,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w + 20, -h + 34); ctx.lineTo(-w + 32, 12); ctx.lineTo(-w + 20, h - 34);
    ctx.moveTo(0, -h + 10); ctx.lineTo(-8, -6); ctx.lineTo(10, -h * 0.4);
    ctx.moveTo(4, h * 0.3); ctx.lineTo(16, h - 40); ctx.lineTo(-2, h - 16);
    ctx.stroke();

    // Núcleo de lava quente pulsando (vertical)
    let quente = alerta ? 1.0 : (0.6 + Math.sin(t * 3) * 0.3);
    ctx.shadowColor = "#ff6b00";
    ctx.shadowBlur = 30 * quente;
    ctx.fillStyle = "rgba(255,120,20," + (0.5 + 0.3 * quente) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fagulhas girando em volta (órbita vertical)
    ctx.fillStyle = "#ffd27a";
    for (let i = 0; i < 6; i++) {
        let aa = t * 2 + i * 1.05;
        let rrx = w * 0.8 + Math.sin(t * 4 + i * 2) * 8;
        let rry = h * 0.62 + Math.cos(t * 3 + i * 1.7) * 14;
        ctx.fillRect(Math.cos(aa) * rrx - 2, Math.sin(aa) * rry - 2, 4, 4);
    }
    ctx.restore();
};

window.ativarEscudoGolem = function(x, y, tipo) {
    let cor = (tipo === 'vermelho') ? "#ff503c" : "#3c8cff";
    let txt = (tipo === 'vermelho') ? "ESCUDO VERMELHO! (básicos refletem)" : "ESCUDO AZUL! (skills refletem)";
    if (window.floatingTexts) {
        window.floatingTexts.push({ x: x, y: y - 150, text: txt, color: cor, alpha: 1.0 });
    }
};

window.criarReflexoGolem = function(x, y, cor) {
    if (window.floatingTexts) {
        let c = (cor === 'vermelho') ? "#ff503c" : "#3c8cff";
        window.floatingTexts.push({ x: x, y: y - 190, text: "REFLETIDO!", color: c, alpha: 1.0 });
    }
};