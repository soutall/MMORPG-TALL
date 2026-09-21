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

// ZONA CHUVA DE COMETAS (Skill 1): o céu se abre sobre a área e cometas caem por 4s
window.desenharChuvaCometas = function(z, t) {
    if (!window.ctx || !z) return;
    let ctx = window.ctx;
    let fade = Math.min(1, (z.tempo || 80) / 18);
    let base = Date.now() / 40;
    ctx.save();
    ctx.globalAlpha = 0.18 * fade;
    ctx.fillStyle = "#140f33";
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio, z.raio * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    // anel de runas estelares (tracejado girando)
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = "#8fd8ff";
    ctx.lineWidth = 1.6;
    ctx.shadowColor = "#8fd8ff";
    ctx.shadowBlur = 8;
    ctx.setLineDash([9, 11]);
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio, z.raio * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // 4 estrelas girando na borda
    for (let r = 0; r < 4; r++) {
        let a = base * 0.2 + r * 1.5708;
        let sx = z.x + Math.cos(a) * z.raio, sy = z.y + Math.sin(a) * z.raio * 0.92;
        drawEstrela(ctx, sx, sy, 2.4 * (0.6 + Math.sin(base * 0.4 + r) * 0.4), "#fff6c2");
    }
    // cometas caindo da "abóbada celeste"
    for (let k = 0; k < 6; k++) {
        let seg = k + ((base * 0.7) % 1);
        let angT = seg * 2.39996;
        let rOff = z.raio * (0.15 + 0.5 * (0.5 + 0.5 * Math.sin(seg * 3.7)));
        let cx = z.x + Math.cos(angT) * rOff;
        let cy = z.y + Math.sin(angT) * rOff * 0.9;
        let grav = 0.35 + 0.3 * Math.sin(seg * 2.1 + base);
        let len = 16 + 14 * (0.5 + 0.5 * Math.sin(base * 0.3 + k * 1.9));
        let efe = 0.5 + 0.5 * Math.sin(base + k * 1.3);
        ctx.globalAlpha = 0.55 * fade;
        ctx.strokeStyle = "#ffe66f";
        ctx.lineWidth = 1.8;
        ctx.shadowColor = "#c9ac4c";
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - len * 0.35, cy - len * grav);
        ctx.stroke();
        ctx.fillStyle = "#fff6c2";
        ctx.globalAlpha = 0.9 * fade;
        ctx.shadowColor = "#ffe66f";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.4 + efe * 1.4, 0, Math.PI * 2);
        ctx.fill();
    }
    // poeira de impactos perto do chão
    for (let p = 0; p < 5; p++) {
        let aP = p * 1.2566 + base * 0.15;
        let rP = z.raio * (0.25 + 0.2 * (0.5 + 0.5 * Math.sin(base * 0.8 + p * 2.4)));
        let px = z.x + Math.cos(aP) * rP, py = z.y + Math.sin(aP) * rP * 0.85;
        ctx.fillStyle = "#8fd8ff";
        ctx.globalAlpha = 0.4 * fade;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
};

// ZONA ORBE DE CONSTELAÇÃO (Skill 2): constelação captura 2s e implode
window.desenharOrbeConstelacao = function(z, t) {
    if (!window.ctx || !z) return;
    let ctx = window.ctx;
    let fade = Math.min(1, (z.tempo || 40) / 14);
    let fim = (z.tempo || 40) / 40; // 1 (início) -> 0 (implosão)
    let base = Date.now() / 90;
    ctx.save();
    // campo gravitacional (vazio escuro com brilho nébula)
    let grad = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.raio);
    grad.addColorStop(0, "rgba(24,18,54," + (0.9 * fade) + ")");
    grad.addColorStop(0.72, "rgba(62,44,110," + (0.55 * fade) + ")");
    grad.addColorStop(1, "rgba(24,18,54," + (0.15 * fade) + ")");
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.raio, z.raio * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // constelação: 8 nós conectados (linhas de luz entre cada 2 nós)
    ctx.strokeStyle = "rgba(197,160,255," + (0.75 * fade) + ")";
    ctx.lineWidth = 1.4;
    ctx.shadowColor = "#c39bff";
    ctx.shadowBlur = 6;
    for (let n = 0; n < 8; n++) {
        let a = n * 0.7854 + base * 0.1;
        let rx = z.raio * 0.82 * (0.85 + 0.15 * fim), ry = z.raio * 0.82 * 0.9;
        let nx = z.x + Math.cos(a) * rx, ny = z.y + Math.sin(a) * ry;
        let a2 = (n + 2) * 0.7854 + base * 0.1;
        let nx2 = z.x + Math.cos(a2) * rx, ny2 = z.y + Math.sin(a2) * ry;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx2, ny2);
        ctx.stroke();
    }
    // nós pulsantes das estrelas da constelação
    for (let n = 0; n < 8; n++) {
        let a = n * 0.7854 + base * 0.1;
        let rx = z.raio * 0.82 * (0.85 + 0.15 * fim), ry = z.raio * 0.82 * 0.9;
        let nx = z.x + Math.cos(a) * rx, ny = z.y + Math.sin(a) * ry;
        let br = 0.7 + Math.sin(base * 0.8 + n * 1.9) * 0.3;
        ctx.fillStyle = "rgba(197,160,255," + (0.4 * fade) + ")";
        ctx.beginPath();
        ctx.arc(nx, ny, 3 + br * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,246,194," + (0.9 * fade * br) + ")";
        ctx.beginPath();
        ctx.arc(nx, ny, 1.6 + br, 0, Math.PI * 2);
        ctx.fill();
    }
    // anel de cativeiro (correntes de luz pulsando, se fechando no fim)
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = "#8fd8ff";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    let rAnel = z.raio * 0.6 * fim + 8;
    ctx.ellipse(z.x, z.y, rAnel, rAnel * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    // espirais se contraindo no fim (pré-implosão)
    for (let s = 0; s < 3; s++) {
        let aS = -base * 0.5 + s * 2.094;
        let rS = z.raio * (0.3 + 0.5 * fim);
        let sx = z.x + Math.cos(aS) * rS, sy = z.y + Math.sin(aS) * rS * 0.9;
        ctx.fillStyle = "rgba(143,216,255," + (0.7 * fade) + ")";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
};

// CASCATA ESTELAR (Skill 3): onda de estrelas em cone varrendo o chão (root 2s)
window.desenharCascataEstelar = function(z, t) {
    if (!window.ctx || !z) return;
    let ctx = window.ctx;
    let prog = Math.min(1, Math.max(0, 1 - (z.tempo || 20) / 34));
    if (prog <= 0) return;
    let ang = z.ang || z.angulo || 0;
    let base = Date.now() / 60;
    ctx.save();
    ctx.translate(z.x + Math.cos(ang) * 160 * (1 - prog), z.y + Math.sin(ang) * 160 * (1 - prog));
    ctx.rotate(ang);
    // leque de estrelas varrendo de trás para a frente
    let aberturas = [-0.78, -0.5, -0.22, 0, 0.22, 0.5, 0.78];
    for (let r = 0; r < aberturas.length; r++) {
        let sway = Math.sin(aberturas[r] * 5 + base * 0.4);
        for (let st = 0; st < 7; st++) {
            let along = st * 26;
            let lateral = sway * (8 + st * 2);
            let dx = along;
            let dy = Math.sin(aberturas[r]) * (70 + (1 - prog) * 110) * 0.6 + lateral * 0.5;
            let tw = 0.5 + Math.sin(base + r * 2 + st) * 0.5;
            ctx.globalAlpha = (0.78 - st * 0.07) * (1 - prog) + 0.12;
            ctx.fillStyle = (st % 2 === 0) ? "#fff6c2" : "#c39bff";
            ctx.shadowColor = "#fff6c2";
            ctx.shadowBlur = 7;
            ctx.beginPath();
            ctx.arc(dx, dy, 1.1 + tw, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // caudas de luz ao longo de cada raio do leque
    ctx.strokeStyle = "#8fd8ff";
    ctx.lineWidth = 1.2;
    for (let r = 0; r < aberturas.length; r++) {
        let along = 26 + 46 * (1 - prog);
        let dx = along, dy = Math.sin(aberturas[r]) * (70 + (1 - prog) * 110) * 0.6;
        ctx.globalAlpha = 0.28 * (1 - prog);
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx - 10, dy - 4);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
};

// Impactos cósmicos: explosão da Chuva de Cometas ('impacto'), pingo do DoT ('dano')
// e implosão do Orbe de Constelação ('implosao').
window.desenharImpactoCometa = function(z, t) {
    if (!window.ctx || !z) return;
    let ctx = window.ctx;
    let f = Math.min(1, (z.tempo || 16) / (z.tempoMax || 16));
    let tipo = z.tipo || 'impacto';
    ctx.save();
    if (tipo === 'implosao') {
        // implosão: o anel se contrai para o núcleo brilhante
        let rEI = 12 + (1 - f) * 60;
        ctx.globalAlpha = f;
        ctx.fillStyle = "#c39bff";
        ctx.shadowColor = "#c39bff";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(z.x, z.y, 4 + (1 - f) * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6c2";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(z.x, z.y, rEI, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 8; k++) {
            let a = (k / 8) * Math.PI * 2 + t * 0.25;
            let r = 8 + (1 - f) * 46;
            ctx.fillStyle = "rgba(255,246,194," + (0.9 * f) + ")";
            ctx.beginPath();
            ctx.arc(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (tipo === 'dano') {
        // pingo de um cometa do DoT
        ctx.globalAlpha = f * 0.85;
        ctx.fillStyle = "#fff6c2";
        ctx.shadowColor = "#ffe66f";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(z.x, z.y, 2 + Math.sin(t * 0.5) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = f * 0.5;
        for (let k = 0; k < 4; k++) {
            let a = (k / 4) * Math.PI * 2 + t * 0.3;
            ctx.fillStyle = "#8fd8ff";
            ctx.beginPath();
            ctx.arc(z.x + Math.cos(a) * (8 - f * 6), z.y + Math.sin(a) * (8 - f * 6), 1, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // impacto da chegada do cometa
        ctx.globalAlpha = f;
        for (let k = 0; k < 9; k++) {
            let a = (k / 9) * Math.PI * 2 + t * 0.2;
            let r = 6 + (1 - f) * 42;
            ctx.fillStyle = (k % 3 === 0) ? "#fff6c2" : "rgba(143,216,255,0.8)";
            ctx.shadowColor = "#ffe66f";
            ctx.shadowBlur = 9;
            ctx.beginPath();
            ctx.arc(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 1.3 + f * 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = f * 0.8;
        ctx.fillStyle = "#fff6c2";
        ctx.shadowColor = "#fff6c2";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(z.x, z.y, 3 + (1 - f) * 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
};