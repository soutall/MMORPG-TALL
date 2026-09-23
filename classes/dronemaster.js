// classes/dronemaster.js - Renderização do DroneMaster (piloto + Drone Companheiro)
// Estilo: piloto de armadura azul-aço com visor ciano, holster e mochila-técnica.
// O Drone Companheiro orbita o dono e executa os modos Supressão/Assalto.
// Protocolo Titã: o piloto se funde ao drone virando um robô de guerra (forma maior).

// Retângulo arredondado compatível com browsers/WebViews sem ctx.roundRect.
function camadaRoundRect(c, x, y, w, h, r) {
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
}

// ============================================================================
// VFX VISUAIS DO DRONEMASTER — apenas apresentação, sem alterar mecânicas.
// ============================================================================
window.dmVfx = window.dmVfx || { tirosLuz: [], caixasVoo: [], transformacoes: [], particulas: [] };

function dmLuzChao(ctx, x, y, raio, corTemplate, alpha, achatamento) {
    const ry = Math.max(2, raio * (achatamento || 0.28));
    const c0 = corTemplate.replace('ALPHA', (alpha * 0.55).toFixed(3));
    const c1 = corTemplate.replace('ALPHA', (alpha * 0.22).toFixed(3));
    const c2 = corTemplate.replace('ALPHA', '0');
    const g = ctx.createRadialGradient(x, y + 10, 0, x, y + 10, raio);
    g.addColorStop(0, c0); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y + 10, raio, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function dmParticula(x, y, vx, vy, vida, cor, tam) {
    if (window.dmVfx.particulas.length >= 90) return;
    window.dmVfx.particulas.push({ x, y, vx, vy, vida, vidaMax: vida, cor, tam });
}

function desenharMiniRoboAssalto(x, y, t, angulo) {
    const ctx = window.ctx; if (!ctx) return;
    ctx.save(); ctx.translate(x, y + 4);

    // Fumaça e chamas de superaquecimento.
    for (let i = 0; i < 5; i++) {
        const a = t * 0.9 + i * 1.7;
        const sx = -7 + Math.sin(a) * (3 + i * 0.4);
        const sy = 5 - ((t * (10 + i * 1.5) + i * 9) % 24);
        ctx.fillStyle = `rgba(65,65,70,${Math.max(0.08, 0.38 - i * 0.045)})`;
        ctx.shadowColor = '#777'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(sx, sy, 1.6 + (i % 2) * 1.2, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
        const fx = -5 + i * 4 + Math.sin(t * 2.2 + i) * 1.2;
        const fy = 5 - (i % 2) * 1.5;
        ctx.fillStyle = i === 1 ? '#ffd54a' : '#ff6b2c';
        ctx.shadowColor = '#ff5a20'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(fx, fy);
        ctx.lineTo(fx + 1.7, fy - 6 - Math.abs(Math.sin(t * 2 + i)) * 2);
        ctx.lineTo(fx + 3, fy); ctx.closePath(); ctx.fill();
    }
    dmLuzChao(ctx, 0, 4, 24, 'rgba(255,85,40,ALPHA)', 0.80 + Math.sin(t * 4) * 0.12, 0.22);

    ctx.rotate((angulo || 0) * 0.15);
    ctx.fillStyle = '#1f2b34'; ctx.fillRect(-10, 3, 20, 6);
    ctx.fillStyle = '#52616d'; ctx.fillRect(-8, 1, 16, 7);
    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-6, -5, 12, 8);
    ctx.fillStyle = '#263744'; ctx.beginPath(); camadaRoundRect(ctx, -5, -11, 10, 7, 2); ctx.fill();
    ctx.fillStyle = '#ff9d3d'; ctx.shadowColor = '#ff5a20'; ctx.shadowBlur = 7; ctx.fillRect(-3.5, -8.5, 7, 1.8); ctx.shadowBlur = 0;
    ctx.fillStyle = '#34495e'; ctx.fillRect(-11, -1, 4, 9); ctx.fillRect(7, -1, 4, 9);
    ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(-9, 8, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 8, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function dmDesenharVfxTela() {
    const ctx = window.ctx; if (!ctx) return;
    const agora = performance.now ? performance.now() : Date.now();
    const dt = Math.min(2.5, Math.max(0.35, (agora - (window._dmVfxLastTime || agora)) / 16.67));
    window._dmVfxLastTime = agora;

    // Skill 1 / Tiro: projétil com rastro e luz móvel no chão.
    for (let i = window.dmVfx.tirosLuz.length - 1; i >= 0; i--) {
        const e = window.dmVfx.tirosLuz[i];
        e.p += (1 / 14) * dt;
        if (e.p >= 1.08) { e.p = 1.08; e.alpha -= 0.12 * dt; if (e.alpha <= 0) { window.dmVfx.tirosLuz.splice(i, 1); continue; } }
        const q = Math.min(1, e.p), px = e.sx + (e.tx - e.sx) * q, py = e.sy + (e.ty - e.sy) * q;
        const cor = e.tita ? 'rgba(255,95,70,ALPHA)' : 'rgba(0,235,255,ALPHA)';
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        dmLuzChao(ctx, px, py, e.tita ? 48 : 36, cor, e.alpha, 0.20);
        const ang = Math.atan2(e.ty - e.sy, e.tx - e.sx);
        ctx.translate(px, py + 8); ctx.rotate(ang);
        const beam = ctx.createLinearGradient(-24, 0, 8, 0);
        beam.addColorStop(0, e.tita ? 'rgba(255,70,50,0)' : 'rgba(0,220,255,0)');
        beam.addColorStop(0.65, e.tita ? 'rgba(255,90,60,0.22)' : 'rgba(80,240,255,0.22)');
        beam.addColorStop(1, e.tita ? 'rgba(255,255,255,0.65)' : 'rgba(220,255,255,0.72)');
        ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-24, 3); ctx.lineTo(8, 0); ctx.lineTo(-24, -3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = e.tita ? '#ff7043' : '#e8ffff'; ctx.shadowColor = e.tita ? '#ff3d00' : '#00ffff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(5, 0, e.tita ? 3.2 : 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // Skill 3 / Caixa: paraquedas vindo do alto e caixa vermelha brilhante.
    for (let i = window.dmVfx.caixasVoo.length - 1; i >= 0; i--) {
        const c = window.dmVfx.caixasVoo[i]; c.p += 0.026 * dt;
        if (c.p >= 1.12) { window.dmVfx.caixasVoo.splice(i, 1); continue; }
        const p = Math.min(1, c.p), ease = 1 - Math.pow(1 - p, 2);
        const bx = c.sx + (c.tx - c.sx) * ease, by = c.sy + (c.ty - c.sy) * ease - (1 - p) * 130;
        const canopyY = by - 26, sway = Math.sin((agora / 250) + c.seed) * 5;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const beam = ctx.createLinearGradient(bx, canopyY - 5, bx, by + 8);
        beam.addColorStop(0, 'rgba(255,70,45,0)'); beam.addColorStop(0.55, 'rgba(255,70,45,0.08)'); beam.addColorStop(1, 'rgba(255,190,80,0.20)');
        ctx.fillStyle = beam; ctx.fillRect(bx - 12, canopyY, 24, by - canopyY + 8);
        ctx.fillStyle = 'rgba(205,45,40,0.94)'; ctx.strokeStyle = 'rgba(255,220,190,0.86)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx - 17 + sway, canopyY + 5); ctx.quadraticCurveTo(bx + sway, canopyY - 8, bx + 17 + sway, canopyY + 5); ctx.quadraticCurveTo(bx + sway, canopyY + 11, bx - 17 + sway, canopyY + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 0.75; ctx.strokeStyle = '#f4d7c7'; ctx.lineWidth = 0.7;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(bx + sway + k * 10, canopyY + 6); ctx.lineTo(bx + k * 5, by - 4); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.shadowColor = '#ff3b2f'; ctx.shadowBlur = 15; ctx.fillStyle = '#9f2020'; ctx.fillRect(bx - 8, by - 2, 16, 10);
        ctx.shadowBlur = 0; ctx.fillStyle = '#e64b3c'; ctx.fillRect(bx - 7, by - 1, 14, 3); ctx.fillStyle = '#f6d365'; ctx.fillRect(bx - 2, by - 2, 4, 10);
        ctx.restore();
    }

    // Partículas gerais.
    for (let i = window.dmVfx.particulas.length - 1; i >= 0; i--) {
        const p = window.dmVfx.particulas[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.04 * dt; p.vida -= dt;
        if (p.vida <= 0) { window.dmVfx.particulas.splice(i, 1); continue; }
        const a = Math.max(0, p.vida / p.vidaMax);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p.cor; ctx.shadowColor = p.cor; ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.tam * (0.6 + a * 0.6), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // Efeitos de transformação.
    for (let i = window.dmVfx.transformacoes.length - 1; i >= 0; i--) {
        const e = window.dmVfx.transformacoes[i]; e.vida -= dt; e.raio += 8 * dt;
        if (e.vida <= 0) { window.dmVfx.transformacoes.splice(i, 1); continue; }
        const a = Math.max(0, e.vida / e.vidaMax);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
        ctx.strokeStyle = '#53e6ff'; ctx.shadowColor = '#00d9ff'; ctx.shadowBlur = 18; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y + 8, e.raio, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
        for (let k = 0; k < 4; k++) { const aa = e.angulo + k * (Math.PI / 2); ctx.beginPath(); ctx.moveTo(e.x, e.y + 8); ctx.lineTo(e.x + Math.cos(aa) * e.raio, e.y + 8 + Math.sin(aa) * e.raio); ctx.stroke(); }
        ctx.restore();
    }
}

// Órbita do Drone Companheiro em volta do dono (self) — espelha a lógica do servidor.
window.dmOrbitarDrone = function() {
    let t = Date.now() / 700;
    let cx = (window.meuX || 0) + 12;
    let cy = (window.meuY || 0) + 16;
    window.dmDroneX = cx + Math.cos(t) * 30;
    window.dmDroneY = cy - 14 + Math.sin(t) * 16;
    return { x: window.dmDroneX, y: window.dmDroneY };
};

// MODO ASSALTO (self): o Drone se DESPRENDE do DroneMaster e vira um Mini Robô melee que
// corre atrás dos inimigos próximos a 3x a velocidade do DroneMaster (10.8 = 3 × 3.6).
// Quando a skill termina (action_dm_assalto_fim), o handler do cliente recoloca ele em cima do dono.
window.dmDroneAssaltoPasso = function(dt) {
    if (!dt) dt = window.dt || 1;
    const vel = 10.8 * dt; // 3x a velocidade base do DroneMaster (3.6)
    const cx = (window.meuX || 0) + 12;
    const cy = (window.meuY || 0) + 16;
    const leash = 340; // mesma correia do servidor (DRONE_MAX_DISTANCE_FROM_OWNER)
    if (window.dmDroneX === undefined || window.dmDroneY === undefined) { window.dmDroneX = cx; window.dmDroneY = cy - 14; }
    // busca o inimigo vivo mais próximo do robô (slimes + bosses)
    let melhor = null, melhorDist = leash * leash;
    const candidatos = (window.listaSlimes || []).concat(window.listaBosses || []);
    for (let i = 0; i < candidatos.length; i++) {
        const e = candidatos[i];
        if (!e || e.hp <= 0) continue;
        if (e.mapa && e.mapa !== window.currentMap) continue;
        if (Math.hypot(e.x - cx, e.y - cy) > leash) continue; // nunca longe demais do dono
        const d = Math.hypot(e.x - window.dmDroneX, e.y - window.dmDroneY);
        if (d < melhorDist) { melhorDist = d; melhor = e; }
    }
    if (melhor) {
        const dx = melhor.x - window.dmDroneX, dy = melhor.y - window.dmDroneY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > 40) {
            const passo = Math.min(vel, dist - 40);
            window.dmDroneX += (dx / dist) * passo;
            window.dmDroneY += (dy / dist) * passo;
        }
    } else {
        // sem alvo próximo: volta ligeiro para junto do DroneMaster (última frame vira órbita de novo)
        const dx = (cx + 26) - window.dmDroneX, dy = (cy - 16) - window.dmDroneY;
        const dist = Math.hypot(dx, dy) || 1;
        const passo = Math.min(vel, dist);
        window.dmDroneX += (dx / dist) * passo;
        window.dmDroneY += (dy / dist) * passo;
    }
    return { x: window.dmDroneX, y: window.dmDroneY };
};

// Desenha o Drone Companheiro (quadricóptero compacto).
window.desenharDrone = function(x, y, angulo, estado) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let t = Date.now() / 90;

    if ((estado || 'normal') === 'assalto') {
        // Modo Assalto: visual de mini robô no chão, com fumaça e fogo de superaquecimento.
        desenharMiniRoboAssalto(x, y, t, angulo);
        return;
    }

    ctx.save();
    ctx.translate(x, y);

    // Sombra no chão do drone
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hélices girando (4)
    for (let k = 0; k < 4; k++) {
        let a = k * 1.5708 + t;
        let bx = Math.cos(a) * 7, by = Math.sin(a) * 7;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#bdc3c7";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx - 4, by);
        ctx.lineTo(bx + 4, by);
        ctx.stroke();
        ctx.restore();
    }
    for (let k = 0; k < 4; k++) {
        let a = k * 1.5708;
        ctx.fillStyle = "#566573";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7 - 1, 1.7, 0, Math.PI * 2);
        ctx.fill();
    }

    let corCore = "#00ffff";
    let estadoAtual = estado || 'normal';
    if (estadoAtual === 'supressao') {
        corCore = "#ff4d4d"; // alvo vermelho pulsando
    } else if (estadoAtual === 'assalto') {
        corCore = "#f39c12"; // modo robô
    }
    let pulso = 1 + Math.sin(t * 1.2) * 0.15;

    // Corpo do drone
    ctx.shadowColor = corCore;
    ctx.shadowBlur = (estadoAtual === 'supressao') ? 18 : 12;
    ctx.fillStyle = "#34495e";
    ctx.beginPath();
    camadaRoundRect(ctx,-6, -5, 12, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#95a5a6";
    ctx.beginPath();
    camadaRoundRect(ctx,-8, -3, 3, 6, 2);
    ctx.fill();
    ctx.beginPath();
    camadaRoundRect(ctx,5, -3, 3, 6, 2);
    ctx.fill();
    // Núcleo de energia (canhão frontal)
    ctx.fillStyle = corCore;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(2, 0, 3.4 * pulso, 0, Math.PI * 2);
    ctx.fill();
    // Hélice superior
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(0, -6, 10, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Flash de tiro (mais forte + pequeno feixe)
    if ((window.dmUltimoTiroEm || 0) > 0 && (Date.now() - window.dmUltimoTiroEm) < 140) {
        ctx.save();
        ctx.translate(x, y);
        const tiroT = (Date.now() - window.dmUltimoTiroEm) / 140;
        const aTiro = 1 - tiroT;
        ctx.globalAlpha = aTiro;
        ctx.fillStyle = "#e8fbff";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 24;
        ctx.beginPath(); ctx.arc(5, 0, 8.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = "rgba(110,245,255," + (0.8 * aTiro).toFixed(3) + ")";
        ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(22 + (1 - tiroT) * 5, 0); ctx.stroke();
        ctx.restore();
    }

    // Rastro orbital (self)
    if (estadoAtual === 'normal' && !window.listaPlayerProjeteis) {
        window.dmDrone = window.dmDrone || { rastro: [] };
    }
};

// Forma Titã: robô de guerra (maior, olhos vermelhos, núcleo pulsante)
window.desenharTitaForm = function(x, y, isMoving, angulo, hp, maxHp) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let t = Date.now() / 120;

    ctx.save();
    ctx.translate(x, y);

    // Aura contínua da transformação: energia azul, campo no chão e microfaíscas.
    ctx.save();
    const auraPulse = 0.78 + Math.sin(t * 1.8) * 0.22;
    ctx.globalCompositeOperation = 'lighter';
    dmLuzChao(ctx, 12, 32, 58 * auraPulse, 'rgba(0,225,255,ALPHA)', 0.58, 0.20);
    ctx.strokeStyle = 'rgba(0,230,255,' + (0.36 + auraPulse * 0.25).toFixed(3) + ')';
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(12, 36, 34 * auraPulse, 10 * auraPulse, 0, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 6; k++) {
        const aa = t * 0.7 + k * (Math.PI / 3);
        const sx = 12 + Math.cos(aa) * (15 + Math.sin(t + k) * 3);
        const sy = 14 + Math.sin(aa * 1.3) * 10;
        ctx.fillStyle = k % 2 ? '#8ff3ff' : '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, 1.2 + (k % 2) * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Sombra maior
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(12, 40, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(12, 18);
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 4 : 0;

    // Pernas reforçadas
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-8, 16, 7, 15 + legOffset);
    ctx.fillRect(1, 16, 7, 15 - legOffset);
    ctx.fillStyle = "#1a252f";
    ctx.beginPath();
    camadaRoundRect(ctx,-9, 31 + legOffset, 9, 4, 2);
    ctx.fill();
    ctx.beginPath();
    camadaRoundRect(ctx,0, 31 - legOffset, 9, 4, 2);
    ctx.fill();

    // Tronco blindado
    let corRobo = (window.danoFlashTimer || 0) > 0 ? "#e74c3c" : "#3a5068";
    ctx.fillStyle = corRobo;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(10, -8);
    ctx.lineTo(13, 18);
    ctx.lineTo(-13, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7f8c8d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Placas
    ctx.fillStyle = "#526079";
    ctx.fillRect(-7, -4, 14, 4);
    ctx.fillRect(-8, 6, 16, 4);
    // Núcleo de energia pulsante
    let pulso = 1 + Math.sin(t * 2) * 0.2;
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 18 * pulso;
    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.arc(0, 3, 3.5 * pulso, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cabo-breve + viseira Titã (máquina de guerra)
    ctx.fillStyle = "#22303c";
    ctx.beginPath();
    camadaRoundRect(ctx,-8, -18, 16, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#ff4d4d";
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur = 12;
    ctx.fillRect(-5, -14, 10, 3);
    ctx.fillRect(-3, -9, 6, 1.6);
    ctx.shadowBlur = 0;

    // Braço canhoneiro (segue a mira)
    ctx.save();
    ctx.rotate(angulo || 0);
    ctx.translate(10, 4);
    ctx.fillStyle = "#34495e";
    ctx.beginPath();
    camadaRoundRect(ctx,0, -4, 20, 8, 3);
    ctx.fill();
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(20, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#85929e";
    ctx.beginPath();
    ctx.moveTo(20, 0); ctx.lineTo(30, -3); ctx.lineTo(30, 3); ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.restore();

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.desenharDronemaster = function(x, y, isMoving, angulo, hp, maxHp, extra) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    let ehEu = !!(extra && extra.eu) || !(extra && extra.pp);
    let pp = (extra && extra.pp) || null;

    let ate = Date.now() / 500;
    let tita = (pp ? !!pp.dmTitaAtivo : !!window.dmTitaAtivo);
    if (tita) {
        window.desenharTitaForm(x, y, isMoving, angulo, hp, maxHp);
        const dmFrameStamp = Math.floor((performance.now ? performance.now() : Date.now()) / 8);
        if (window._dmVfxFrameStamp !== dmFrameStamp) {
            window._dmVfxFrameStamp = dmFrameStamp;
            dmDesenharVfxTela();
        }
        return;
    }

    // Posição do Drone Companheiro
    let droneX, droneY;
    if (ehEu) {
        if (window.dmAssaltoVisual > 0) { window.dmDroneAssaltoPasso(); }
        else { window.dmOrbitarDrone(); }
        droneX = window.dmDroneX; droneY = window.dmDroneY;
    } else {
        droneX = pp ? pp.dmDroneX : (x + 26);
        droneY = pp ? pp.dmDroneY : (y - 8);
    }
    let estadoDrone = 'normal';
    if (pp) {
        if (pp.dmSupressaoAtivo) estadoDrone = 'supressao';
        else if (pp.dmAssaltoAtivo) estadoDrone = 'assalto';
    } else {
        if (window.dmSupressaoVisual) estadoDrone = 'supressao';
        else if (window.dmAssaltoVisual) estadoDrone = 'assalto';
    }

    ctx.save();
    ctx.translate(x, y);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 8.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabo / feixe de controle que liga o piloto ao drone
    ctx.strokeStyle = (estadoDrone === 'supressao') ? "rgba(255,77,77,0.6)" : "rgba(0,255,255,0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(droneX - x, droneY - y);
    ctx.stroke();

    let agachamento = Math.sin(ate) * (isMoving ? 1.2 : 2.2);
    ctx.save();
    ctx.translate(12, 14 + agachamento * 0.4);

    // Pernas blindadas
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3.2 : 0;
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-5, 9, 3.4, 7 + legOffset);
    ctx.fillRect(2, 9, 3.4, 7 - legOffset);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-6, 16 + legOffset, 5.4, 3);
    ctx.fillRect(1, 16 - legOffset, 5.4, 3);

    // Corpo: armadura azul-aço
    let corBlindagem = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#3b5998";
    ctx.fillStyle = corBlindagem;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, -6);
    ctx.lineTo(8, 10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    // Peitoral técnico
    ctx.fillStyle = "#5d6d7e";
    ctx.fillRect(-5, -2, 10, 3);
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Cinto de ferramentas (bolsos)
    ctx.fillStyle = "#4a5a63";
    ctx.fillRect(-7, 4, 14, 2);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(3, 4, 3, 2);

    // Mochila técnica / jets
    ctx.fillStyle = "#4a5e70";
    ctx.fillRect(-8, -8, 3, 16);
    ctx.fillRect(5, -8, 3, 16);

    // Cabeça com viseira
    ctx.fillStyle = "#cfc6d8"; // pele
    ctx.fillRect(-4, -15, 8, 6);
    ctx.fillStyle = "#22303c"; // capacete
    ctx.beginPath();
    ctx.moveTo(-5, -16);
    ctx.lineTo(5, -16);
    ctx.lineTo(6, -8);
    ctx.lineTo(-6, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#00e5ff"; // viseira ciano
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 8;
    ctx.fillRect(-3.6, -13, 7.2, 2.6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#85929e"; // respirador
    ctx.fillRect(-3, -9.4, 6, 1.6);

    // Braço + canhão de pulso (segue a mira)
    ctx.save();
    ctx.rotate(angulo || 0);
    ctx.translate(6, 1);
    ctx.fillStyle = "#4a5e70";
    ctx.fillRect(-3, -2, 8, 4);
    ctx.fillStyle = "#34495e";
    ctx.fillRect(4, -2.5, 7, 5);
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(11, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.restore();

    // Drone Companheiro por cima do personagem (desenhado depois)
    if (typeof window.desenharDrone === "function") {
        window.desenharDrone(droneX, droneY, angulo, estadoDrone);
    }

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }

    // Renderiza os VFX locais uma vez por fatia de frame, evitando duplicação com múltiplos jogadores.
    const dmFrameStampNormal = Math.floor((performance.now ? performance.now() : Date.now()) / 8);
    if (window._dmVfxFrameStampNormal !== dmFrameStampNormal) {
        window._dmVfxFrameStampNormal = dmFrameStampNormal;
        dmDesenharVfxTela();
    }
};

// Ataque básico: o Drone Companheiro dispara (o dano é do servidor; o flash é visual local)
window.enviarAtaqueDronemaster = function(ang, alvoTipo, alvoId) {
    if (window.estaMorto) return;
    if (window.tocarSonoro) window.tocarSonoro('dronemaster_atk');
    if (typeof window.dmOrbitarDrone === 'function' && !window.dmAssaltoVisual) window.dmOrbitarDrone();
    window.dmUltimoTiroEm = Date.now();
    let msg = { action: 'ataque_dronemaster' };
    if (alvoTipo) { msg.alvoTipo = alvoTipo; msg.alvoId = alvoId; }
    if (ang !== undefined) msg.angulo = ang;
    if (window.ws && window.ws.readyState === 1) {
        window.ws.send(JSON.stringify(msg));
    }
};

// Caixa de ferramentas voando até o local (visual otimista local)
window.criarCaixaVoo = function(sx, sy, tx, ty) {
    if (!window.dmCaixasVoo) window.dmCaixasVoo = [];
    window.dmCaixasVoo.push({ x: sx, y: sy - 6, tx: tx, ty: ty, vx: (tx - sx) / 18, vy: (ty - sy) / 18, vida: 18 });
    if (window.dmVfx.caixasVoo.length < 8) {
        window.dmVfx.caixasVoo.push({ sx, sy: sy - 6, tx, ty, p: 0, seed: Math.random() * 6.28 });
    }
};

// Explosão de partículas do Protocolo Titã (visual local)
window.criarTransformacaoTita = function(x, y) {
    if (!window.dmTransformacoes) window.dmTransformacoes = [];
    for (let i = 0; i < 14; i++) {
        const a = i * 0.45;
        window.dmTransformacoes.push({ x: x, y: y + 8, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2 - 0.6, vida: 26 });
    }
};

// Projétil do laser do drone (visual local p/ broadcast action_dm_tiro / action_dm_tiro_tita)
window.criarProjetilDrone = function(sx, sy, tx, ty, ehTita) {
    if (!window.dmProjeteis) window.dmProjeteis = [];
    let d = Math.hypot(tx - sx, ty - sy) || 1;
    let vx = (tx - sx) / 14, vy = (ty - sy) / 14;
    window.dmProjeteis.push({ tipo: ehTita ? 'dm_tita_laser' : 'dm_laser', x: sx, y: sy, vx: vx, vy: vy, ang: Math.atan2(vy, vx), vida: 16, dano: ehTita ? 90 : 58, vfxLuz: true });
    if (window.dmVfx.tirosLuz.length < 18) window.dmVfx.tirosLuz.push({ sx, sy, tx, ty, p: 0, alpha: 1, tita: !!ehTita });
};

// Zona CAIXA DE FERRAMENTAS (escudo 50% vida máx para aliados)
window.desenharCaixaFerramentas = function(c, t) {
    if (!window.ctx || !c) return;
    let ctx = window.ctx;
    let p = Math.sin(t / 220) * 0.5 + 0.5;

    ctx.save();
    ctx.globalAlpha = 0.16 + p * 0.1;
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.raio, c.raio, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + p * 0.35;
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.raio, c.raio, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Caixa de suprimentos vermelha, com brilho forte.
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 18 + p * 8;
    ctx.fillStyle = "#7e1f24";
    ctx.beginPath(); camadaRoundRect(ctx,-11, -8, 22, 13, 3); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = "#d9a33a"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#d9362e"; ctx.fillRect(-9, -5, 18, 5);
    ctx.fillStyle = "#f2b134"; ctx.fillRect(-2, -9, 4, 2); ctx.fillRect(-2, -5, 4, 10);
    ctx.fillStyle = "#ffe4a8"; ctx.shadowColor = '#fff0b8'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(-3, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
};