// classes/mago.js - Renderização completa do Mago
window.desenharMago = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    ctx.translate(x, y);

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (passos)
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3 : 0;
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(7, 25, 3, 6 + legOffset);
    ctx.fillRect(14, 25, 3, 6 - legOffset);
    
    // Túnica do Mago (com efeito de dano se atingido)
    let corTunica = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#6c3483"; 
    ctx.fillStyle = corTunica;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(22, 28);
    ctx.lineTo(2, 28);
    ctx.closePath();
    ctx.fill();

    // Faixa dourada na túnica
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(11, 12, 2, 16);

    // Capuz arcano
    ctx.fillStyle = "#4a235a";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 12);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();

    // Rosto sob a sombra do capuz e olhos luminosos
    ctx.fillStyle = "#111";
    ctx.fillRect(8, 7, 8, 4);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);
    
    // Cajado místico
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(16, 0);

    // Haste de madeira do cajado
    ctx.fillStyle = "#795548";
    ctx.fillRect(-2, -14, 3, 28);

    // Cristal arcano no topo (Muda de cor conforme a magia que está na mira)
    let corCristal = "#9b59b6";
    if (window.modoMiraMeteoro) corCristal = "#e74c3c";
    if (window.modoMiraNevasca) corCristal = "#00ffff";

    ctx.fillStyle = corCristal;
    ctx.shadowColor = corCristal;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, -16, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueMago = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomMagiaBasica === 'function') window.tocarSomMagiaBasica();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_mago', angulo: anguloDisparo })); }
};
