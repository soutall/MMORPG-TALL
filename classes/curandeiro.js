// classes/curandeiro.js - Renderização do Curandeiro (Healer)
window.desenharCurandeiro = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    ctx.translate(x, y);

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (animação de caminhada)
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3 : 0;
    ctx.fillStyle = "#34495e";
    ctx.fillRect(7, 25, 3, 6 + legOffset);
    ctx.fillRect(14, 25, 3, 6 - legOffset);

    // Túnica Sagrada Branca com acabamento dourado
    let corTunica = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#fdfefe";
    ctx.fillStyle = corTunica;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(22, 28);
    ctx.lineTo(2, 28);
    ctx.closePath();
    ctx.fill();

    // Faixa e Cruz Dourada no peitoral
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(11, 13, 2, 14); // Linha vertical da estola
    // Cruz no peito
    ctx.fillRect(10, 15, 4, 2);
    ctx.fillRect(11, 14, 2, 4);

    // Capuz Sacerdotal
    ctx.fillStyle = "#eaeded";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 12);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();

    // Rosto sob o capuz e olhos esmeralda sagrados
    ctx.fillStyle = "#111";
    ctx.fillRect(8, 7, 8, 4);
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);

    // Cajado Sagrado na mão
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(16, 0);

    // Haste dourada/madeira clara
    ctx.fillStyle = "#d4ac0d";
    ctx.fillRect(-2, -14, 3, 28);

    // Cruz/Ankh solar no topo com pulso de luz
    let pulsoLuz = 6 + Math.sin(Date.now() / 150) * 1.5;
    ctx.fillStyle = "#f1c40f";
    ctx.shadowColor = "#f39c12";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, -15, pulsoLuz, 0, Math.PI * 2);
    ctx.fill();

    // Centro brilhante branco
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueCurandeiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomLuzSagrada === 'function') window.tocarSomLuzSagrada();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_curandeiro', angulo: anguloDisparo })); }
};
