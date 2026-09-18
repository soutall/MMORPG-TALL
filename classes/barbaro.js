// classes/barbaro.js - Renderização do Bárbaro com Machados Duplos (Dual Wield)
window.desenharBarbaro = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    let pctHp = maxHp > 0 ? hp / maxHp : 1;
    let furyStage = 0;
    if (pctHp <= 0.2) furyStage = 3;
    else if (pctHp <= 0.4) furyStage = 2;
    else if (pctHp <= 0.6) furyStage = 1;
    let furyScale = furyStage === 3 ? 0.2 : furyStage === 2 ? 0.1 : furyStage === 1 ? 0.05 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + furyScale, 1 + furyScale);

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (furyStage > 0) {
        let auraRadius = 24 + furyStage * 8;
        let auraAlpha = furyStage === 3 ? 0.42 : furyStage === 2 ? 0.28 : 0.18;
        let auraColor = furyStage === 3 ? "rgba(220, 30, 30, " + auraAlpha + ")" : furyStage === 2 ? "rgba(180, 22, 22, " + auraAlpha + ")" : "rgba(150, 18, 18, " + auraAlpha + ")";
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(12, 18, auraRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 150, 110, " + (0.18 + furyStage * 0.12) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(12, 18, auraRadius + 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Pernas grossas com passos
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 4 : 0;
    ctx.fillStyle = "#4a2311";
    ctx.fillRect(6, 24, 4, 8 + legOffset);
    ctx.fillRect(14, 24, 4, 8 - legOffset);

    // Faixas de couro nos tornozelos
    ctx.fillStyle = "#784212";
    ctx.fillRect(6, 29 + legOffset, 4, 2);
    ctx.fillRect(14, 29 - legOffset, 4, 2);

    // Tronco robusto e pele marcada por guerra
    let corPele = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#d7996c";
    ctx.fillStyle = corPele;
    ctx.fillRect(4, 10, 16, 14);

    // Pinturas tribais de sangue no peito
    ctx.fillStyle = "#900c3f";
    ctx.fillRect(6, 12, 12, 2);
    ctx.fillRect(11, 11, 2, 8);

    // Cinto de ferro com caveira/fivela
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(4, 21, 16, 4);
    ctx.fillStyle = "#bdc3c7";
    ctx.fillRect(10, 21, 4, 4);

    // Ombreiras de pele de lobo
    ctx.fillStyle = "#512e17";
    ctx.beginPath();
    ctx.arc(4, 11, 5, 0, Math.PI * 2);
    ctx.arc(20, 11, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.fillStyle = corPele;
    ctx.beginPath();
    ctx.arc(12, 6, 6, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo selvagem
    ctx.fillStyle = "#1c110a";
    ctx.fillRect(7, 0, 10, 4);
    ctx.fillRect(5, 3, 3, 5);
    ctx.fillRect(16, 3, 3, 5);

    // Olhos vermelhos furiosos
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(9, 6, 2, 2);
    ctx.fillRect(13, 6, 2, 2);

    // ==========================================
    // FUNÇÃO AUXILIAR PARA DESENHAR CADA MACHADO
    // ==========================================
    function desenharMachado(lado) {
        ctx.save();
        // lado: 1 para mão direita, -1 para mão esquerda
        ctx.translate(12, 16);
        ctx.rotate(angulo);

        // Desloca para o lado do corpo e posiciona a mão
        let offsetY = lado * 9;
        ctx.translate(14, offsetY);
        ctx.rotate(lado * 0.25); // Leve inclinação agressiva para fora

        // Punho/mão do bárbaro
        ctx.fillStyle = "#784212";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Cabo de madeira reforçado
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(-6, -1.5, 18, 3);

        // Fita de couro no cabo
        ctx.fillStyle = "#d35400";
        ctx.fillRect(2, -1.5, 3, 3);

        // Cabeça do machado (aço escuro)
        ctx.fillStyle = "#34495e";
        ctx.beginPath();
        ctx.moveTo(10, -1.5);
        ctx.lineTo(16, -9 * lado);
        ctx.lineTo(18, 0);
        ctx.lineTo(16, 9 * lado);
        ctx.closePath();
        ctx.fill();

        // Lâmina curvada e afiada
        ctx.fillStyle = "#7f8c8d";
        ctx.beginPath();
        ctx.moveTo(16, -9 * lado);
        ctx.quadraticCurveTo(21, 0, 16, 9 * lado);
        ctx.lineTo(14, 0);
        ctx.closePath();
        ctx.fill();

        // Fio ensanguentado na lâmina
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, -9 * lado);
        ctx.quadraticCurveTo(21, 0, 16, 9 * lado);
        ctx.stroke();

        ctx.restore();
    }

    // 1. Machado da mão esquerda
    desenharMachado(-1);

    // 2. Machado da mão direita
    desenharMachado(1);

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueBarbaro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomMachado === 'function') window.tocarSomMachado();
    let pX = window.meuX + 12; let pY = window.meuY + 16;
    let tx = pX + Math.cos(window.meuAngulo) * 35; let ty = pY + Math.sin(window.meuAngulo) * 35;
    if (typeof window.criarAnimacaoSangue === 'function') window.criarAnimacaoSangue(tx, ty);
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_barbaro', angulo: window.meuAngulo })); }
};
