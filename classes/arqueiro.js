// classes/arqueiro.js - Renderização do Arqueiro com Arco Longo e Aljava de Flechas
window.desenharArqueiro = function(x, y, isMoving, angulo, hp, maxHp) {
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
    ctx.fillStyle = "#273746";
    ctx.fillRect(7, 25, 3, 6 + legOffset);
    ctx.fillRect(14, 25, 3, 6 - legOffset);

    // Aljava de flechas (Quiver) nas costas
    ctx.save();
    ctx.translate(6, 12);
    ctx.rotate(-0.35);
    // Bainha de couro da aljava
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-3, -12, 6, 18);
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;
    ctx.strokeRect(-3, -12, 6, 18);
    // Pontas e penas das flechas sobressaindo na aljava
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-3, -17, 2, 5);
    ctx.fillRect(0, -19, 2, 7);
    ctx.fillRect(2, -16, 2, 4);
    ctx.restore();
    
    // Roupa de caçador florestal
    let corRoupa = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#117864"; 
    ctx.fillStyle = corRoupa;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(22, 28);
    ctx.lineTo(2, 28);
    ctx.closePath();
    ctx.fill();
    
    // Cinto/fivela de couro
    ctx.fillStyle = "#d4ac0d";
    ctx.fillRect(10, 13, 4, 3);

    // Capuz de patrulheiro
    ctx.fillStyle = "#0e6251";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 12);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();

    // Rosto sob a sombra do capuz e olhos de falcão
    ctx.fillStyle = "#111";
    ctx.fillRect(8, 7, 8, 4);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);

    // Mão esquerda puxando a flecha engatilhada (tensão na corda)
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.fillStyle = "#795548";
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Braço direito segurando o Arco Longo
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(18, 0);

    // Estrutura de madeira curvada do Arco Longo (Maior e recurvo)
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Curvatura profunda de arco longo com pontas finas recurvas
    ctx.arc(0, 0, 20, -Math.PI / 2.3, Math.PI / 2.3, false);
    ctx.stroke();

    // Detalhes reforçados de empunhadura central
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 20, -0.22, 0.22, false);
    ctx.stroke();

    // Corda esticada do arco (ligando as duas extremidades)
    ctx.strokeStyle = "#ecf0f1";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let cordaTopoX = Math.cos(-Math.PI / 2.3) * 20;
    let cordaTopoY = Math.sin(-Math.PI / 2.3) * 20;
    let cordaBaseX = Math.cos(Math.PI / 2.3) * 20;
    let cordaBaseY = Math.sin(Math.PI / 2.3) * 20;
    
    // Ponto puxado no centro onde a flecha apoia
    ctx.moveTo(cordaTopoX, cordaTopoY);
    ctx.lineTo(-12, 0);
    ctx.lineTo(cordaBaseX, cordaBaseY);
    ctx.stroke();

    // Flecha longa de combate sobreposta no arco
    ctx.fillStyle = "#d35400";
    ctx.fillRect(-12, -1, 26, 2); // Haste da flecha

    // Ponta pontiaguda de ferro
    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath();
    ctx.moveTo(14, -3);
    ctx.lineTo(21, 0);
    ctx.lineTo(14, 3);
    ctx.closePath();
    ctx.fill();

    // Penas traseiras da flecha
    ctx.fillStyle = "#1abc9c";
    ctx.fillRect(-12, -3, 4, 2);
    ctx.fillRect(-12, 1, 4, 2);

    ctx.restore();

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueArqueiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomFlecha === 'function') window.tocarSomFlecha();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_arqueiro', angulo: anguloDisparo })); }
};
