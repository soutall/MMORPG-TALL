// classes/guerreiro.js - Renderização completa do Guerreiro
window.desenharGuerreiro = function(x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    ctx.translate(x, y);

    let angulo = anguloBase;
    let progressoGiro = 0;
    if (isSpinning) {
        progressoGiro = (30 - (spinTimer || 0)) / 30;
        angulo = anguloBase + (progressoGiro * Math.PI * 10);
    }
    
    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (Animação de corrida)
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 4 : 0;
    ctx.fillStyle = "#333";
    ctx.fillRect(7, 24, 3, 7 + legOffset);
    ctx.fillRect(14, 24, 3, 7 - legOffset);

    // Capa traseira
    ctx.fillStyle = corCapa;
    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(20, 10);
    ctx.lineTo(24, 28);
    ctx.lineTo(0, 28);
    ctx.closePath();
    ctx.fill();
    
    // Peitoral da armadura
    let corArmadura = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#8a9ea7";
    ctx.fillStyle = corArmadura;
    ctx.fillRect(4, 10, 16, 14);

    // Detalhe dourado na armadura
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(10, 12, 4, 10);

    // Ombreiras
    ctx.fillStyle = "#5d6d7e";
    ctx.fillRect(2, 9, 6, 5);
    ctx.fillRect(16, 9, 6, 5);

    // Elmo e fenda do visor
    ctx.fillStyle = "#566573";
    ctx.fillRect(5, 2, 14, 10);
    ctx.fillStyle = "#111";
    ctx.fillRect(7, 5, 10, 3);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(9, 6, 2, 1);
    ctx.fillRect(13, 6, 2, 1);

    // Pluma do elmo
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(12, -4);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();

    // Efeito circular do Tornado (quando ativo)
    if (isSpinning) {
        ctx.save();
        ctx.translate(12, 16);
        ctx.rotate(angulo);
        ctx.globalAlpha = 1.0 - (progressoGiro * 0.3);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 6;
        ctx.shadowColor = "#3498db";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25, Math.PI, Math.PI * 2.5);
        ctx.stroke();
        ctx.restore();
    }

    // Espada na mão direita
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(isSpinning ? 22 : 18, 0);
    ctx.fillStyle = "#795548";
    ctx.fillRect(-6, -2, 6, 4);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillStyle = "#ecf0f1";
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.lineTo(22, 0);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3498db";
    ctx.fillRect(2, -1, 14, 2);
    ctx.restore();

    // Escudo na mão esquerda
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo + Math.PI);
    ctx.translate(isSpinning ? 22 : 16, 0);
    ctx.fillStyle = "#7f8c8d";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillRect(-6, -2, 12, 4);
    ctx.restore();

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueGuerreiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomCorte === 'function') window.tocarSomCorte();
    if (typeof window.criarEfeitoCorte === 'function') window.criarEfeitoCorte(window.meuX + 12, window.meuY + 16, window.meuAngulo);
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'corte' })); }
};
