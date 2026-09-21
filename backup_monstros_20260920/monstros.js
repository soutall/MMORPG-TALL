// monstros.js - Renderização dos Slimes, Zumbis e Inimigos
var projetoAranhaDark = null;
var projetoAranhaDarkCarregando = false;

function carregarProjetoAranhaDark() {
    if (projetoAranhaDark || projetoAranhaDarkCarregando || typeof fetch !== 'function') return;
    projetoAranhaDarkCarregando = true;
    fetch('monstro/Aranha_arcana.json', { cache: 'no-store' })
        .then(function(resposta) { return resposta.ok ? resposta.json() : null; })
        .then(function(projeto) { projetoAranhaDark = projeto; })
        .catch(function(erro) { console.warn('Projeto ARANHA DARK não carregado:', erro); })
        .finally(function() { projetoAranhaDarkCarregando = false; });
}

carregarProjetoAranhaDark();

function desenharAranhaDark(ctx, slime) {
    if (!projetoAranhaDark || !Array.isArray(projetoAranhaDark.parts)) {
        desenharMonstroNovo(ctx, slime);
        return;
    }

    var t = Date.now() / 1000;
    var partes = projetoAranhaDark.parts.slice().sort(function(a, b) { return (a.z || 0) - (b.z || 0); });
    var origemX = 48;
    var origemY = 82;
    var respiracao = slime.fugindo ? 1 : Math.sin(t * 3) * 0.025;
    ctx.save();
    ctx.scale(0.72 + respiracao, 0.72 + respiracao);
    ctx.translate(-origemX, -origemY);

    partes.forEach(function(p) {
        if (p.visible === false) return;
        ctx.save();
        ctx.translate(p.x || 0, p.y || 0);
        ctx.rotate(p.rotation || 0);
        ctx.scale(p.sx == null ? 1 : p.sx, p.sy == null ? 1 : p.sy);
        ctx.globalAlpha = p.opacity == null ? 1 : p.opacity;
        ctx.fillStyle = p.fill || '#17131d';
        ctx.strokeStyle = p.stroke || '#16121a';
        ctx.lineWidth = p.strokeWidth || 1;
        ctx.shadowColor = p.shadowColor || 'transparent';
        ctx.shadowBlur = p.shadowBlur || 0;
        var pontos = p.points || [];
        ctx.beginPath();
        if (p.type === 'circle') ctx.arc(0, 0, 12, 0, Math.PI * 2);
        else if (p.type === 'ellipse') ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
        else if (p.type === 'rect') ctx.rect(-12, -10, 24, 20);
        else if (pontos.length) pontos.forEach(function(ponto, i) { i ? ctx.lineTo(ponto[0], ponto[1]) : ctx.moveTo(ponto[0], ponto[1]); });
        if (p.type === 'line') ctx.stroke();
        else if (pontos.length || p.type === 'circle' || p.type === 'ellipse' || p.type === 'rect') { ctx.closePath(); ctx.fill(); if (p.strokeWidth) ctx.stroke(); }
        ctx.restore();
    });
    ctx.restore();
}

window.desenharSlime = function(slime) {
    if (slime.hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    // Posição fixa no solo (sem elevação vertical)
    ctx.translate(slime.x, slime.y);

    // Zumbi usa o próprio corpo ereto + efeito de fedido
    if (slime.tipo === 'zumbi') {
        desenharZumbi(ctx, slime);
        ctx.restore();
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(slime.x - 15, slime.y - 24, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
        }
        return;
    }

    // Besouro Negro: rinoceronte preto blindado do deserto
    if (slime.tipo === 'besouro_negro') {
        desenharBesouroNegro(ctx, slime);
        ctx.restore();
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(slime.x - 15, slime.y - 24, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
        }
        return;
    }

    // Morcego: voador rápido da caverna
    if (slime.tipo === 'morcego') {
        desenharMorcego(ctx, slime);
        ctx.restore();
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(slime.x - 15, slime.y - 24, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
        }
        return;
    }

    // Monstro criado pelo Character Forge: as partes são carregadas do JSON exportado.
    if (slime.tipo === 'aranha_dark') {
        desenharAranhaDark(ctx, slime);
        ctx.restore();
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(slime.x - 28, slime.y - 38, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
        }
        return;
    }

    if (slime.arquetipo) {
        desenharMonstroNovo(ctx, slime);
        ctx.restore();
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(slime.x - 18, slime.y - 30, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
        }
        return;
    }

    // ---- SLIME padrão ----
    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Definição de cores de estado
    let corSlime = (slime.tipo === 'ranged') ? "#8e44ad" : "#27ae60";
    if (slime.stunTimer > 0) corSlime = "#f1c40f"; // Fica amarelo quando atordoado
    if (slime.slowTimer > 0 && slime.stunTimer <= 0) corSlime = "#00ffff"; // Fica ciano na lentidão

    // Corpo do monstro achatado no chão
    ctx.fillStyle = corSlime;
    ctx.beginPath();
    ctx.arc(0, 0, 16, Math.PI, 0, false);
    ctx.lineTo(16, 12);
    ctx.lineTo(-16, 12);
    ctx.closePath();
    ctx.fill();

    // Olhos normais ou olhos de atordoamento (X X) quando em Stun
    if (slime.stunTimer > 0) {
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        // Olho esquerdo em X
        ctx.beginPath();
        ctx.moveTo(-7, -4); ctx.lineTo(-3, 0);
        ctx.moveTo(-3, -4); ctx.lineTo(-7, 0);
        // Olho direito em X
        ctx.moveTo(3, -4); ctx.lineTo(7, 0);
        ctx.moveTo(7, -4); ctx.lineTo(3, 0);
        ctx.stroke();

        // Estrelinhas girando sobre a cabeça indicando Stun
        let tempoStun = Date.now() / 150;
        let starX = Math.cos(tempoStun) * 12;
        let starY = Math.sin(tempoStun) * 5 - 18;
        ctx.fillStyle = "#f1c40f";
        ctx.font = "12px Arial";
        ctx.fillText("💫", starX - 6, starY);
    } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-6, -4, 4, 5);
        ctx.fillRect(2, -4, 4, 5);
        ctx.fillStyle = "#000";
        ctx.fillRect(-5, -3, 2, 3);
        ctx.fillRect(3, -3, 2, 3);
    }

    ctx.restore();

    // Barra de HP do monstro
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(slime.x - 15, slime.y - 20, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
    }
};

function desenharMonstroNovo(ctx, slime) {
    var t = Date.now() / 1000;
    var arqu = slime.arquetipo;
    var fase = Math.sin(t * (slime.fugindo ? 14 : 8));
    var escala = (arqu === 'tank_melee' ? 1.45 : (arqu === 'void_laser' ? 1.3 : 1));
    ctx.save();
    ctx.scale(escala, escala);
    if (arqu === 'assassin' && slime.invisivel) ctx.globalAlpha = 0.18 + Math.sin(t * 5) * 0.06;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 15, 17, 5, 0, 0, Math.PI * 2); ctx.fill();

    if (arqu === 'ranged') {
        ctx.fillStyle = '#6f6252'; ctx.fillRect(-6, -7, 12, 20);
        ctx.fillStyle = '#b9aa87'; ctx.beginPath(); ctx.arc(0, -15, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#241b1b'; ctx.beginPath(); ctx.moveTo(-10, -17); ctx.lineTo(10, -17); ctx.lineTo(6, -8); ctx.lineTo(-7, -8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff7b35'; ctx.shadowColor = '#ff4b20'; ctx.shadowBlur = 7; ctx.fillRect(-4, -16, 2, 2); ctx.fillRect(2, -16, 2, 2); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#4a2c1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(12, -4, 12, -1.2, 1.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(13, -14); ctx.lineTo(13, 7); ctx.stroke();
    } else if (arqu === 'melee') {
        ctx.fillStyle = '#3f454b'; ctx.fillRect(-11, -10, 22, 23); ctx.fillStyle = '#b9aa87'; ctx.beginPath(); ctx.arc(0, -17, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6b35'; ctx.shadowColor = '#ff3d00'; ctx.shadowBlur = 7; ctx.fillRect(3, -19, 3, 3); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#9d9a8b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(19 + fase * 3, -18); ctx.stroke();
    } else if (arqu === 'web') {
        ctx.strokeStyle = '#24152f'; ctx.lineWidth = 3;
        for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, 0); ctx.lineTo(i * 13 - 5, 15 + Math.abs(i) * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 5, -2); ctx.lineTo(i * 13 + 5, -15 - Math.abs(i) * 2); ctx.stroke(); }
        ctx.fillStyle = '#17131d'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#552764'; ctx.beginPath(); ctx.ellipse(0, 6, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff384d'; for (var o = -1; o <= 1; o++) { ctx.beginPath(); ctx.arc(o * 5, -6 + Math.abs(o) * 2, 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (arqu === 'poison_melee') {
        ctx.fillStyle = '#3d5535'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#293323'; ctx.lineWidth = 3; for (var p = -1; p <= 1; p++) { ctx.beginPath(); ctx.moveTo(p * 6, -4); ctx.lineTo(p * 13, -14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p * 6, 4); ctx.lineTo(p * 13, 14); ctx.stroke(); }
        ctx.strokeStyle = '#6d3aa0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-4, -1, 20, 0.2, 2.3); ctx.stroke(); ctx.fillStyle = '#7dff65'; ctx.beginPath(); ctx.arc(14, -4, 2, 0, Math.PI * 2); ctx.fill();
    } else if (arqu === 'goblin') {
        ctx.fillStyle = '#3c7138'; ctx.beginPath(); ctx.arc(0, -9, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#719c3c'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-16, -20); ctx.lineTo(-7, -7); ctx.moveTo(6, -14); ctx.lineTo(16, -20); ctx.lineTo(7, -7); ctx.fill();
        ctx.fillStyle = '#f4d03f'; ctx.fillRect(-4, -11, 2, 3); ctx.fillRect(2, -11, 2, 3); ctx.fillStyle = '#6e4935'; ctx.fillRect(-7, 0, 14, 13); ctx.fillStyle = '#a77b42'; ctx.beginPath(); ctx.arc(12, 1 + fase * 2, 4, 0, Math.PI * 2); ctx.fill();
    } else if (arqu === 'meteor') {
        ctx.fillStyle = '#24264c'; ctx.beginPath(); ctx.moveTo(-11, 11); ctx.lineTo(0, -16); ctx.lineTo(11, 11); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#3153a4'; ctx.beginPath(); ctx.arc(0, -18, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#59d8ff'; ctx.shadowColor = '#59d8ff'; ctx.shadowBlur = 9; ctx.fillRect(-3, -20, 2, 2); ctx.fillRect(2, -20, 2, 2); ctx.shadowBlur = 0; ctx.strokeStyle = '#b56cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(18, 13); ctx.stroke();
    } else if (arqu === 'assassin') {
        ctx.fillStyle = '#12121c'; ctx.fillRect(-8, -10, 16, 23); ctx.beginPath(); ctx.arc(0, -17, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e5e5ef'; ctx.fillRect(-5, -18, 3, 2); ctx.fillRect(2, -18, 3, 2); ctx.strokeStyle = '#bfc4d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-18, -10 + fase * 2); ctx.moveTo(8, 0); ctx.lineTo(18, -10 - fase * 2); ctx.stroke();
    } else if (arqu === 'void_laser') {
        ctx.fillStyle = '#171020'; ctx.shadowColor = '#8d4dff'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#4f287b'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d9a7ff'; ctx.beginPath(); ctx.arc(0, 0, 6 + (slime.skillCharging ? Math.sin(t * 9) : 0), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#050309'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (arqu === 'gargoyle') {
        ctx.fillStyle = '#59616c'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(12, 10); ctx.lineTo(0, 14); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#737f8e'; ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-23, -17); ctx.lineTo(-16, 4); ctx.closePath(); ctx.moveTo(8, -5); ctx.lineTo(23, -17); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffbf3c'; ctx.fillRect(-5, -8, 3, 3); ctx.fillRect(2, -8, 3, 3);
    } else if (slime.tipo === 'ogro') {
        ctx.fillStyle = '#68734b'; ctx.beginPath(); ctx.ellipse(0, 0, 23, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#87935d'; ctx.fillRect(-18, 7, 10, 16); ctx.fillRect(8, 7, 10, 16);
        ctx.fillStyle = '#4c573b'; ctx.beginPath(); ctx.arc(0, -17, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8d6aa'; ctx.beginPath(); ctx.moveTo(-8, -19); ctx.lineTo(-20, -32); ctx.lineTo(-10, -13); ctx.moveTo(8, -19); ctx.lineTo(20, -32); ctx.lineTo(10, -13); ctx.fill();
        ctx.fillStyle = '#453524'; ctx.fillRect(16, -3, 5, 27); ctx.fillStyle = '#776044'; ctx.beginPath(); ctx.arc(18, -7 + fase * 2, 9, 0, Math.PI * 2); ctx.fill();
    } else if (slime.tipo === 'mamute') {
        ctx.fillStyle = '#6e6254'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#817364'; ctx.fillRect(-19, 7, 8, 18); ctx.fillRect(-5, 8, 8, 18); ctx.fillRect(9, 7, 8, 18);
        ctx.fillStyle = '#786b5c'; ctx.beginPath(); ctx.arc(19, -10, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8f8170'; ctx.beginPath(); ctx.arc(28, -8, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e7d2a4'; ctx.beginPath(); ctx.moveTo(24, -13); ctx.quadraticCurveTo(37, -25, 34, -5); ctx.lineTo(27, -8); ctx.moveTo(25, -7); ctx.quadraticCurveTo(39, 2, 35, 10); ctx.lineTo(27, -3); ctx.fill();
        ctx.strokeStyle = '#51483e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-19, -10); ctx.lineTo(8, -15); ctx.stroke();
    } else {
        ctx.fillStyle = '#777'; ctx.beginPath(); ctx.ellipse(0, 0, 19, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#aaa'; ctx.fillRect(-14, 5, 7, 13); ctx.fillRect(7, 5, 7, 13);
    }

    if (slime.skillCharging && slime.skillAim) {
        var ax = slime.skillAim.x - slime.x, ay = slime.skillAim.y - slime.y;
        ctx.globalAlpha = 0.35 + Math.sin(t * 8) * 0.12;
        ctx.strokeStyle = slime.skillKind === 'web' ? '#d9f7ff' : (slime.skillKind === 'void_laser' ? '#b56cff' : '#ff9f43');
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, slime.skillKind === 'meteor' ? 42 : 28, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

function desenharZumbi(ctx, slime) {
    let t = Date.now() / 1000;
    let carregando = !!slime.skillCharging;
    let intensidade = carregando ? 3 : 1; // fedido 3x enquanto carrega a skill

    // ============ EFEITO DE FEDIDO ============
    // 1) Aura de gás verde tóxico pulsante (mais forte/carregando)
    let pulsar = (0.6 + Math.sin(t * 3) * 0.15) * (carregando ? 1.6 : 1);
    for (let i = 0; i < 3 * intensidade; i++) {
        let ang = t * 0.8 + i * (Math.PI * 2 / (3 * intensidade));
        let gx = Math.cos(ang) * (16 + Math.sin(t * 1.5 + i) * 3);
        let gy = -4 + Math.sin(ang * 1.3) * 6;
        let raio = (8 + Math.sin(t * 2 + i * 2) * 3) * (carregando ? 1.4 : 1);
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, (0.22 * pulsar) * (carregando ? 1.5 : 1));
        ctx.fillStyle = "#7fff57";
        ctx.shadowColor = "#3fbf2f";
        ctx.shadowBlur = 10 * pulsar;
        ctx.beginPath();
        ctx.arc(gx, gy, raio, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 2) Bolhas de gás subindo do corpo (cheiro tóxico) - triplica ao carregar
    ctx.save();
    for (let i = 0; i < 5 * intensidade; i++) {
        let bx = Math.sin(t * (1 + intensidade * 0.4) + i * 2.1) * (14 + intensidade * 4);
        let by = -22 - ((t * (14 * intensidade) + i * (9 / intensidade + 4)) % 30);
        ctx.globalAlpha = Math.min(0.9, (0.5 + Math.sin(t * 6 + i) * 0.2) * intensidade * 0.6);
        ctx.fillStyle = (i % 2) ? "#aaff88" : "#66ff44";
        ctx.beginPath();
        ctx.arc(bx, by, (carregando ? 2.6 : 1.8), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3) Linha de odor retorcida acima da cabeça (fica mais forte ao carregar)
    ctx.save();
    ctx.globalAlpha = carregando ? 0.9 : 0.55;
    ctx.strokeStyle = "#8aff5e";
    ctx.lineWidth = carregando ? 2.5 : 1.5;
    ctx.shadowColor = "#7fff57";
    ctx.shadowBlur = carregando ? 8 : 0;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
        let lx = (i - 4) * 3;
        let ly = -34 + Math.sin(t * (carregando ? 9 : 5) + i * 0.9) * 3;
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    ctx.restore();

    // Marcador de mira da habilidade no chão (onde a cuspida vai atingir)
    if (carregando && slime.skillAim) {
        let ax = slime.skillAim.x - slime.x;
        let ay = slime.skillAim.y - slime.y;
        let pulsarMira = 0.6 + Math.sin(t * 6) * 0.4;
        ctx.save();
        ctx.globalAlpha = 0.35 * pulsarMira + 0.2;
        ctx.fillStyle = "#66ff44";
        ctx.shadowColor = "#33cc22";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(ax, ay, 20 + pulsarMira * 6, 20 + pulsarMira * 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ============ BARRA DE CARREGAMENTO (skill) ============
    if (carregando && slime.skillChargeMax) {
        let prog = 1 - (slime.skillChargeTimer / slime.skillChargeMax);
        if (prog > 1) prog = 1;
        let bx = -14, by = -40, larg = 28, alt = 4;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(bx - 1, by - 1, larg + 2, alt + 2);
        ctx.fillStyle = "#2e7d32";
        ctx.fillRect(bx, by, larg * prog, alt);
        ctx.fillStyle = "#b9ff5e";
        ctx.fillRect(bx, by, larg * prog, alt * 0.5);
        ctx.strokeStyle = "#d4ffb0";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, larg, alt);
        ctx.restore();
    }

    // ============ CORPO ============
    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animação das pernas: passadas ao andar, perninhas paradas ao carregar
    let ritmoAndar = carregando ? 0.35 : 1; // quase imóvel enquanto carrega
    let fase = Math.sin(t * 9 * ritmoAndar + 0.5);
    let pernaEsq = Math.sin(t * 9 * ritmoAndar) * 0.45 * (carregando ? 0.15 : 1);
    let pernaDir = Math.sin(t * 9 * ritmoAndar + Math.PI) * 0.45 * (carregando ? 0.15 : 1);

    // Pernas tortas (zumbi manco) com passada
    ctx.fillStyle = "#6b7c3a";
    ctx.save();
    ctx.translate(-6 - pernaEsq * 4, 4);
    ctx.rotate(pernaEsq);
    ctx.fillRect(-3, 0, 6, 13);
    ctx.fillStyle = "#4a3a20"; // sapato velho
    ctx.fillRect(-4, 10, 8, 4);
    ctx.restore();
    ctx.save();
    ctx.translate(6 - pernaDir * 4, 5);
    ctx.rotate(pernaDir + 0.08);
    ctx.fillRect(-3, 0, 6, 13);
    ctx.fillStyle = "#4a3a20";
    ctx.fillRect(-4, 10, 8, 4);
    ctx.restore();

    // Tronco (camisa rasgada verde musgo) levemente balançando ao andar
    let inclinacao = carregando ? 0 : fase * 0.04;
    ctx.fillStyle = slime.stunTimer > 0 ? "#b8a848" : (slime.slowTimer > 0 ? "#2ab8a8" : "#7d9b4a");
    ctx.beginPath();
    ctx.moveTo(-9, -12 + inclinacao * 6);
    ctx.lineTo(9, -12 - inclinacao * 6);
    ctx.lineTo(11, 9 + inclinacao * 4);
    ctx.lineTo(-11, 9 - inclinacao * 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4c5e2c";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rasgo da camisa mostrando a carne
    ctx.fillStyle = "#5d6f3a";
    ctx.beginPath();
    ctx.moveTo(-2, -12); ctx.lineTo(3, -6); ctx.lineTo(-1, 2); ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();

    // Feridas/sangue
    ctx.fillStyle = "#8c1a1a";
    ctx.beginPath();
    ctx.arc(5, 4, 2.4, 0, Math.PI * 2);
    ctx.arc(-4, 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Braços esticados para frente (abanando ao andar)
    let balancaoBraco = carregando ? 1 : fase;
    ctx.fillStyle = "#86a04a";
    ctx.save();
    ctx.rotate(-0.4 + balancaoBraco * 0.08);
    ctx.fillRect(-4, -13, 17, 5);
    ctx.restore();
    ctx.fillStyle = "#7c9444";
    ctx.save();
    ctx.rotate(0.4 - balancaoBraco * 0.08);
    ctx.fillRect(-13, -13, 17, 5);
    ctx.restore();

    // Mãos sangrentas
    ctx.fillStyle = "#94ad58";
    ctx.beginPath(); ctx.arc(-13, -15, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12.5, -15, 2.6, 0, Math.PI * 2); ctx.fill();

    // Cabeça (verde podre, balançando)
    let cabecaY = -18 + Math.sin(t * 1.6) * 0.5;
    ctx.save();
    ctx.translate(0, cabecaY);
    ctx.rotate(aberto(t) * 0.12);

    ctx.fillStyle = "#93ad52";
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a6e35";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Costura de frankenstein no topo do crânio
    ctx.strokeStyle = "#3a2d18";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, 4); ctx.lineTo(-1, 6);
    ctx.moveTo(0, 3); ctx.lineTo(2, 5);
    ctx.moveTo(3, 2); ctx.lineTo(5, 4);
    ctx.stroke();

    // Olhos vermelhos brilhantes (pulsam) - intensificam ao carregar
    let brilho = (0.6 + Math.sin(t * 4) * 0.35) * (carregando ? 1.6 : 1);
    ctx.fillStyle = "#ff3b3b";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 7 * brilho;
    ctx.beginPath();
    ctx.arc(-3, -3, carregando ? 2.4 : 1.9, 0, Math.PI * 2);
    ctx.arc(3, -3, carregando ? 2.4 : 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Boca aberta caída
    ctx.fillStyle = "#2d2116";
    ctx.beginPath();
    ctx.ellipse(0, 3, 3.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dente quebrado
    ctx.fillStyle = "#e8e4d0";
    ctx.fillRect(-2, 1.5, 1.6, 2.4);

    ctx.restore();

    // Estrelinha de atordoamento
    if (slime.stunTimer > 0) {
        let tempoStun = Date.now() / 150;
        ctx.fillStyle = "#f1c40f";
        ctx.font = "12px Arial";
        ctx.fillText("💫", Math.cos(tempoStun) * 12 - 6, -38);
    }
}

function aberto(t) {
    return Math.sin(t * 1.2);
}

// ============ BESOURO NEGRO ============
var trailBesouro = {};

function desenharBesouroNegro(ctx, slime) {
    let t = Date.now() / 1000;
    let carregando = !!slime.skillCharging;
    let voando = !!slime.dashing;

    // Sombra no chão (some durante o voo)
    if (!voando) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.ellipse(0, 15, 17, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ===== RASTRO DO VOO (afterimages) =====
    if (voando) {
        let arr = trailBesouro[slime.id] || (trailBesouro[slime.id] = []);
        arr.push({ x: slime.x, y: slime.y });
        if (arr.length > 8) arr.shift();
        for (let i = 0; i < arr.length; i++) {
            let e = arr[i];
            ctx.save();
            ctx.globalAlpha = (i / arr.length) * 0.4;
            ctx.fillStyle = "#0b0b0f";
            ctx.beginPath();
            ctx.ellipse(e.x - slime.x, e.y - slime.y, 15, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    } else if (trailBesouro[slime.id]) {
        trailBesouro[slime.id] = [];
    }

    // ===== FEIXES DE VELOCIDADE enquanto voa =====
    if (voando) {
        ctx.save();
        ctx.strokeStyle = "rgba(150, 120, 255, 0.4)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            let sy = (i - 1) * 8;
            ctx.beginPath();
            ctx.moveTo(-26, sy);
            ctx.lineTo(-8, sy);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ===== AURA DE CARREGAMENTO =====
    if (carregando) {
        let pulso = 0.5 + Math.sin(t * 10) * 0.3;
        ctx.save();
        ctx.globalAlpha = 0.35 + pulso * 0.25;
        ctx.fillStyle = "#9b59b6";
        ctx.shadowColor = "#9b59b6";
        ctx.shadowBlur = 18 * (1 + pulso);
        ctx.beginPath();
        ctx.ellipse(0, 0, 22 + pulso * 6, 17 + pulso * 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Asas vibrando (prontas pra decolar)
        let bat = Math.sin(t * 40) * 0.6;
        ctx.save();
        ctx.fillStyle = "rgba(220, 220, 240, 0.35)";
        ctx.beginPath();
        ctx.ellipse(-18, -6 + bat * 3, 8, 5, -0.5 + bat * 0.4, 0, Math.PI * 2);
        ctx.ellipse(18, -6 - bat * 3, 8, 5, 0.5 - bat * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Marcador da mira no chão (vai atravessar voando)
        if (slime.skillAim) {
            let ax = slime.skillAim.x - slime.x;
            let ay = slime.skillAim.y - slime.y;
            let pulsarMira = 0.6 + Math.sin(t * 7) * 0.4;
            ctx.save();
            ctx.globalAlpha = 0.3 + pulsarMira * 0.2;
            ctx.fillStyle = "#b354f0";
            ctx.shadowColor = "#9b59b6";
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.ellipse(ax, ay, 18 + pulsarMira * 5, 18 + pulsarMira * 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ===== BARRA DE CARREGAMENTO (skill) =====
    if (carregando && slime.skillChargeMax) {
        let prog = 1 - (slime.skillChargeTimer / slime.skillChargeMax);
        if (prog > 1) prog = 1;
        let bx = -16, by = -40, larg = 32, alt = 5;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(bx - 1, by - 1, larg + 2, alt + 2);
        ctx.fillStyle = "#4a1a6e";
        ctx.fillRect(bx, by, larg * prog, alt);
        ctx.fillStyle = "#b354f0";
        ctx.fillRect(bx, by, larg * prog, alt * 0.6);
        ctx.strokeStyle = "#e0c3ff";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, larg, alt);
        ctx.restore();
    }

    // ===== CORPO =====
    // Corpo: carapaça preta achatada e blindada
    let corCorpo = (slime.stunTimer > 0) ? "#8a7a2a" : (slime.slowTimer > 0 ? "#20504a" : "#141419");
    ctx.fillStyle = corCorpo;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brilho metalizado no dorso
    let grad = ctx.createLinearGradient(0, -12, 0, 12);
    grad.addColorStop(0, "#3a3a45");
    grad.addColorStop(0.5, "#141419");
    grad.addColorStop(1, "#09090c");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Linha central do élitro
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 12);
    ctx.stroke();

    // Listras das placas (élitros)
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, -9);
        ctx.lineTo(i * 4 + (i > 0 ? 4 : 0), 10);
        ctx.stroke();
    }

    // Chifres (mandíbulas) na frente - rinoceronte
    ctx.fillStyle = "#0e0e12";
    ctx.beginPath();
    ctx.moveTo(14, -7);
    ctx.quadraticCurveTo(24, -10, 27, -4);
    ctx.quadraticCurveTo(22, -3, 15, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.quadraticCurveTo(24, 10, 27, 4);
    ctx.quadraticCurveTo(22, 3, 15, 2);
    ctx.closePath();
    ctx.fill();

    // Pernas (3 de cada lado)
    ctx.strokeStyle = "#0c0c10";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
        let lx = -10 + i * 7;
        ctx.beginPath();
        ctx.moveTo(lx, 8);
        ctx.lineTo(lx - 4 - i, 15);
        ctx.lineTo(lx - 7 - i, 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx + 4, 8);
        ctx.lineTo(lx + 7 + i, 15);
        ctx.lineTo(lx + 10 + i, 14);
        ctx.stroke();
    }

    // Olhos vermelhos brilhantes (pulsam; ficam intensos ao carregar/voar)
    let brilhoOlho = (0.6 + Math.sin(t * 5) * 0.35) * (carregando || voando ? 1.7 : 1);
    ctx.save();
    if (slime.stunTimer > 0) {
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -4); ctx.lineTo(-6, 0);
        ctx.moveTo(-6, -4); ctx.lineTo(-10, 0);
        ctx.stroke();
    } else {
        ctx.fillStyle = "#ff2d2d";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 8 * brilhoOlho;
        ctx.beginPath();
        ctx.arc(-8, -3, carregando ? 2.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    ctx.save();
    if (slime.stunTimer > 0) {
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, -4); ctx.lineTo(10, 0);
        ctx.moveTo(10, -4); ctx.lineTo(6, 0);
        ctx.stroke();
    } else {
        ctx.fillStyle = "#ff2d2d";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 8 * brilhoOlho;
        ctx.beginPath();
        ctx.arc(8, -3, carregando ? 2.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Estrelinha de atordoamento
    if (slime.stunTimer > 0) {
        let tempoStun = Date.now() / 150;
        ctx.fillStyle = "#f1c40f";
        ctx.font = "12px Arial";
        ctx.fillText("💫", Math.cos(tempoStun) * 12 - 6, -38);
    }
}
// ============ MORCEGO (voador da caverna) ============
function desenharMorcego(ctx, slime) {
    let t = Date.now() / 1000;
    let atordoado = slime.stunTimer > 0;
    let lento = slime.slowTimer > 0;

    // Sombra no chão (pulsa com o voo)
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Altura do voo (oscila suavemente)
    let alturaVoo = -13 + Math.sin(t * 2.2 + slime.x * 0.01) * 3;

    // Batimento das asas (mais lento se atordoado/lento)
    let flap = atordoado ? 0.15 : (lento ? Math.sin(t * 3) * 0.5 : Math.sin(t * 11));
    let abrir = Math.abs(flap);
    let abertura = 13 + abrir * 17;

    // ===== ASAS (membrana) =====
    let corAsa = atordoado ? "rgba(138,122,42,0.85)" : (lento ? "rgba(40,80,150,0.8)" : "rgba(75,60,100,0.92)");

    // Asa esquerda
    ctx.fillStyle = corAsa;
    ctx.beginPath();
    ctx.moveTo(0, alturaVoo);
    ctx.quadraticCurveTo(-abertura * 0.55, alturaVoo - 8 * abrir, -abertura, alturaVoo - 1);
    ctx.quadraticCurveTo(-abertura * 0.6, alturaVoo + 7 * abrir, -2, alturaVoo + 3);
    ctx.closePath();
    ctx.fill();

    // Asa direita
    ctx.fillStyle = corAsa;
    ctx.beginPath();
    ctx.moveTo(0, alturaVoo);
    ctx.quadraticCurveTo(abertura * 0.55, alturaVoo - 8 * abrir, abertura, alturaVoo - 1);
    ctx.quadraticCurveTo(abertura * 0.6, alturaVoo + 7 * abrir, 2, alturaVoo + 3);
    ctx.closePath();
    ctx.fill();

    // Veias das asas
    ctx.strokeStyle = "rgba(35,28,50,0.55)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, alturaVoo);
        ctx.lineTo(-abertura * (i / 3), alturaVoo + ((i % 2) ? 0 : -2));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, alturaVoo);
        ctx.lineTo(abertura * (i / 3), alturaVoo + ((i % 2) ? -2 : 0));
        ctx.stroke();
    }

    // ===== CORPO =====
    let corCorpo = atordoado ? "#8a7a2a" : (lento ? "#2860a0" : "#241c2e");
    ctx.fillStyle = corCorpo;
    ctx.beginPath();
    ctx.ellipse(0, alturaVoo + 1, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Orelhas pontudas
    ctx.beginPath();
    ctx.moveTo(-4, alturaVoo - 3);
    ctx.lineTo(-6, alturaVoo - 9);
    ctx.lineTo(-1, alturaVoo - 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, alturaVoo - 3);
    ctx.lineTo(6, alturaVoo - 9);
    ctx.lineTo(1, alturaVoo - 5);
    ctx.closePath();
    ctx.fill();

    // Olhos vermelhos brilhantes
    let brilhoOlho = 0.6 + Math.sin(t * 5) * 0.3;
    ctx.fillStyle = "#ff2d2d";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 7 * brilhoOlho;
    ctx.beginPath();
    ctx.arc(-2, alturaVoo - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(2, alturaVoo - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Presas
    ctx.fillStyle = "#e8e4d0";
    ctx.beginPath();
    ctx.moveTo(-2.5, alturaVoo + 5);
    ctx.lineTo(-1.5, alturaVoo + 8);
    ctx.lineTo(-0, alturaVoo + 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, alturaVoo + 5);
    ctx.lineTo(1.5, alturaVoo + 8);
    ctx.lineTo(2.5, alturaVoo + 5);
    ctx.closePath();
    ctx.fill();

    // Estrelinha de atordoamento
    if (atordoado) {
        let tempoStun = Date.now() / 150;
        ctx.fillStyle = "#f1c40f";
        ctx.font = "12px Arial";
        ctx.fillText("💫", Math.cos(tempoStun) * 12 - 6, alturaVoo - 26);
    }
}
