// classes/ladino.js - Renderização do Ladino (assassino ágil de adagas)
// Estilo: roupa escura de couro, capuz, silhueta fina, detalhes roxos/vermelhos.
// Animações: IDLE (respiração), WALK (pernas), ATTACK (estocada rápida de adaga),
// INVISIBLE (silhueta + partículas sombrias), HIT (flash), DEATH (hp<=0).

window.desenharLadino = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    // Estado de invisibilidade (Camuflagem Sombria): silhueta bem discreta
    let invisivel = !!window.personagemInvisivelAtual;
    let alpha = invisivel ? 0.18 : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    // Partículas sombrias discretas quando invisível (poucas, vida curta)
    if (invisivel) {
        if (!window.ladinoSombras) window.ladinoSombras = [];
        if (window.ladinoSombras.length < 14 && Math.random() < 0.5) {
            window.ladinoSombras.push({
                x: 12 + (Math.random() - 0.5) * 26,
                y: 26 + (Math.random() - 0.5) * 18,
                vy: -0.5 - Math.random() * 0.6,
                alpha: 0.6 + Math.random() * 0.4,
                tamanho: 1.5 + Math.random() * 2.5
            });
        }
        for (let i = window.ladinoSombras.length - 1; i >= 0; i--) {
            let s = window.ladinoSombras[i];
            s.y += s.vy;
            s.alpha -= 0.035;
            if (s.alpha <= 0) { window.ladinoSombras.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = s.alpha * 0.5;
            ctx.fillStyle = "#8e44ad";
            ctx.beginPath(); ctx.arc(s.x, s.y, s.tamanho, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // Sombra no chão
    ctx.fillStyle = invisivel ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 8.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Postura agressiva: tronco levemente inclinado para frente
    let agachamento = Math.sin(Date.now() / 500) * (isMoving ? 1.2 : 2.2);
    let atacandoAgora = ((window.ladinoUltimoAtaqueEm || 0) > 0 && (Date.now() - window.ladinoUltimoAtaqueEm) < 260);
    let investida = atacandoAgora ? 4 : 0; // pequeno lunge para frente no golpe

    ctx.save();
    ctx.translate(12 + investida, 14 + (atacandoAgora ? 2 : 0));

    // Pernas (walk)
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3.2 : 0;
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-5, 9, 3, 7 + legOffset);
    ctx.fillRect(2, 9, 3, 7 - legOffset);
    // Botas escuras
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-6, 16 + legOffset, 5, 3);
    ctx.fillRect(1, 16 - legOffset, 5, 3);

    // Corpo: jaqueta de couro escura (silhueta fina)
    let corJaqueta = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#1e272e";
    ctx.fillStyle = corJaqueta;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, -6);
    ctx.lineTo(8, 10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    // Cinto com fivela
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-6, 4, 12, 2);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-1, 4, 2, 2);
    // Faixa roxa diagonal (assinatura do assassino)
    ctx.fillStyle = "#6c3483";
    ctx.beginPath();
    ctx.moveTo(-6, -6); ctx.lineTo(-2, -6); ctx.lineTo(2, 10); ctx.lineTo(-2, 10);
    ctx.closePath();
    ctx.fill();

    // Cabeça + capuz
    ctx.fillStyle = "#d7bde2"; // rosto
    ctx.fillRect(-4, -14, 8, 8);
    // Capuz escuro cobrindo o topo e a nuca
    ctx.fillStyle = "#17202a";
    ctx.beginPath();
    ctx.moveTo(-5, -15);
    ctx.lineTo(5, -15);
    ctx.lineTo(7, -4);
    ctx.lineTo(3, -6);
    ctx.lineTo(-3, -6);
    ctx.lineTo(-7, -4);
    ctx.closePath();
    ctx.fill();
    // Olhos brilhando no escuro do capuz (roxo)
    ctx.fillStyle = "#9b59b6";
    ctx.fillRect(-2.5, -12, 1.6, 2);
    ctx.fillRect(1, -12, 1.6, 2);
    // Máscara/tecido na boca
    ctx.fillStyle = "#212f3c";
    ctx.fillRect(-4, -8.5, 8, 2.5);

    // Braço + ADAGA de assassino (lâmina curta, metal escuro, gema vermelha)
    ctx.save();
    let anguloBraco = angulo || 0;
    // A arma acompanha a mira; quando ataca rápido, dá uma estocada (rotação extra)
    let estocada = atacandoAgora ? 0.55 : 0;
    ctx.rotate(anguloBraco + estocada);
    ctx.translate(6, 0);
    // Braço
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-4, -2, 9, 4);
    // Mão / luva
    ctx.fillStyle = "#17202a";
    ctx.fillRect(4, -2.5, 3, 5);
    // Adaga (empunhadura virada para a ponta do golpe)
    ctx.save();
    ctx.translate(7, 0);
    ctx.rotate(-0.35);
    // Cabo envolto em couro
    ctx.fillStyle = "#6e2c00";
    ctx.fillRect(-3, -1.5, 6, 3);
    // Guarda
    ctx.fillStyle = "#566573";
    ctx.fillRect(-4.5, -3, 2.6, 6);
    // Lâmina curta e afiada (metal escuro)
    ctx.fillStyle = "#85929e";
    ctx.beginPath();
    ctx.moveTo(3, -2.6);
    ctx.lineTo(11, 0);
    ctx.lineTo(3, 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f0f3f4";
    ctx.beginPath();
    ctx.moveTo(3, -1.2);
    ctx.lineTo(9.5, 0);
    ctx.lineTo(3, 1.2);
    ctx.closePath();
    ctx.fill();
    // Gema vermelha no cabo
    ctx.fillStyle = "#c0392b";
    ctx.beginPath(); ctx.arc(-1.5, 0, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Mão esquerda (postura: mão livre em guarda)
    ctx.save();
    ctx.rotate(-anguloBraco * 0.5);
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-8, -1, 4, 3.4);
    ctx.restore();
    ctx.restore();

    // Respiro do tronco (idle)
    ctx.restore();

    ctx.restore();

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// Ataque básico: adaga (o efeito visual do golpe é local; o dano é do servidor)
window.enviarAtaqueLadino = function(ang, alvoTipo, alvoId) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomAdaga === 'function') window.tocarSomAdaga();
    let msg = { action: 'ataque_ladino' };
    if (alvoTipo) { msg.alvoTipo = alvoTipo; msg.alvoId = alvoId; }
    if (ang !== undefined) msg.angulo = ang;
    window.ladinoUltimoAtaqueEm = Date.now();
    // Efeito local do corte (o servidor replica para os outros jogadores)
    if (typeof window.criarAnimacaoAdagaBasica === 'function') {
        window.criarAnimacaoAdagaBasica(window.meuX + 12, window.meuY + 16, ang !== undefined ? ang : (window.meuAngulo || 0));
    }
    if (window.ws && window.ws.readyState === 1) {
        window.ws.send(JSON.stringify(msg));
    }
};