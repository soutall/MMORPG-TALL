// classes/summoner.js - Renderização do Summoner e do Ogro Guardião (Pet)

// Desenho do Ogro Guardião
window.desenharLacaio = function(lacaio) {
    if (lacaio.isJumping || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    ctx.translate(lacaio.x, lacaio.y);

    // Sombra do Ogro
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Partículas de energia da invocação orbitando o Ogro
    let tempo = Date.now() / 200;
    for (let i = 0; i < 4; i++) {
        let anguloPart = tempo + (i * Math.PI / 2);
        let px = Math.cos(anguloPart) * 22;
        let py = Math.sin(anguloPart) * 14;
        ctx.fillStyle = "rgba(46, 204, 113, 0.8)";
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pernas robustas do Ogro
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-8, 8, 5, 8);
    ctx.fillRect(3, 8, 5, 8);

    // Tronco pesado
    ctx.fillStyle = "#784212";
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Braços grossos
    ctx.fillStyle = "#6e2c00";
    ctx.fillRect(-18, -4, 6, 12);
    ctx.fillRect(12, -4, 6, 12);

    // Protetores de ombro de ferro
    ctx.fillStyle = "#566573";
    ctx.fillRect(-16, -9, 9, 6);
    ctx.fillRect(7, -9, 9, 6);

    // Cabeça
    ctx.fillStyle = "#5d4037";
    ctx.beginPath();
    ctx.arc(0, -12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Olhos brilhantes do guardião
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-4, -14, 3, 3);
    ctx.fillRect(2, -14, 3, 3);

    ctx.restore();

    // Barra de Vida do Ogro
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(lacaio.x - 18, lacaio.y - 22, lacaio.hp, lacaio.maxHp);
    }
};

// Desenho do Summoner (Personagem)
window.desenharSummoner = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    ctx.translate(x, y);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3 : 0;
    ctx.fillStyle = "#145a32";
    ctx.fillRect(7, 25, 3, 6 + legOffset);
    ctx.fillRect(14, 25, 3, 6 - legOffset);
    
    // Túnica do Invocador
    let corTunica = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#196f3d"; 
    ctx.fillStyle = corTunica;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(22, 28);
    ctx.lineTo(2, 28);
    ctx.closePath();
    ctx.fill();

    // Detalhe místico
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(11, 12, 2, 16);

    // Capuz florestal
    ctx.fillStyle = "#145a32";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 12);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();

    // Rosto e olhos esmeralda
    ctx.fillStyle = "#111";
    ctx.fillRect(8, 7, 8, 4);
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);
    
    // Orbe de invocação levitando
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(18, 0);

    let t = Date.now() / 200;
    let hoverY = Math.sin(t) * 3;

    ctx.fillStyle = "#27ae60";
    ctx.shadowColor = "#00ff00";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, hoverY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueSummoner = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomOrbe === 'function') window.tocarSomOrbe();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    let focoAlvoTipo = null, focoAlvoId = null;
    if (alvoDetectado) {
        if (alvoDetectado.slime) { focoAlvoTipo = 'slime'; focoAlvoId = alvoDetectado.slime.id; }
        else if (alvoDetectado.boss) { focoAlvoTipo = 'boss'; focoAlvoId = alvoDetectado.boss.id; }
    }
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_summoner', angulo: anguloDisparo, alvoTipo: focoAlvoTipo, alvoId: focoAlvoId })); }
};
