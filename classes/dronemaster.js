// classes/dronemaster.js - Renderização do DroneMaster (piloto + Drone Companheiro)
// Estilo: piloto de armadura azul-aço com visor ciano, holster e mochila-técnica.
// O Drone Companheiro orbita o dono e executa os modos Supressão/Assalto.
// Protocolo Titã: o piloto se funde ao drone virando um robô de guerra (forma maior).

// Órbita do Drone Companheiro em volta do dono (self) — espelha a lógica do servidor.
window.dmOrbitarDrone = function() {
    let t = Date.now() / 700;
    let cx = (window.meuX || 0) + 12;
    let cy = (window.meuY || 0) + 16;
    window.dmDroneX = cx + Math.cos(t) * 30;
    window.dmDroneY = cy - 14 + Math.sin(t) * 16;
    return { x: window.dmDroneX, y: window.dmDroneY };
};

// Desenha o Drone Companheiro (quadricóptero compacto).
window.desenharDrone = function(x, y, angulo, estado) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let t = Date.now() / 90;

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
    ctx.roundRect(-6, -5, 12, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#95a5a6";
    ctx.beginPath();
    ctx.roundRect(-8, -3, 3, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(5, -3, 3, 6, 2);
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

    // Flash de tiro (disparo do drone)
    if ((window.dmUltimoTiroEm || 0) > 0 && (Date.now() - window.dmUltimoTiroEm) < 120) {
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 1 - ((Date.now() - window.dmUltimoTiroEm) / 120);
        ctx.fillStyle = "#e8fbff";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(3, 0, 7, 0, Math.PI * 2);
        ctx.fill();
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
    ctx.roundRect(-9, 31 + legOffset, 9, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(0, 31 - legOffset, 9, 4, 2);
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
    ctx.roundRect(-8, -18, 16, 12, 3);
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
    ctx.roundRect(0, -4, 20, 8, 3);
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
        return;
    }

    // Posição do Drone Companheiro
    let droneX, droneY;
    if (ehEu) {
        window.dmOrbitarDrone();
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
};

// Ataque básico: o Drone Companheiro dispara (o dano é do servidor; o flash é visual local)
window.enviarAtaqueDronemaster = function(ang, alvoTipo, alvoId) {
    if (window.estaMorto) return;
    if (typeof window.dmOrbitarDrone === 'function') window.dmOrbitarDrone();
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
    window.dmProjeteis.push({ tipo: ehTita ? 'dm_tita_laser' : 'dm_laser', x: sx, y: sy, vx: vx, vy: vy, ang: Math.atan2(vy, vx), vida: 16, dano: ehTita ? 90 : 58 });
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

    // Caixa de ferramentas
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = "#8f5f1f";
    ctx.beginPath();
    ctx.roundRect(-11, -8, 22, 13, 3);
    ctx.fill();
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#c08a2d";
    ctx.fillRect(-9, -5, 18, 5);
    ctx.fillStyle = "#e67e22";
    ctx.fillRect(-2, -9, 4, 2);
    ctx.fillStyle = "#f8c471";
    ctx.beginPath();
    ctx.arc(-3, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};