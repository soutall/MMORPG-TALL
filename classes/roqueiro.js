// classes/roqueiro.js - Renderização do Roqueiro PUNK com GUITARRA e sua Banda
// ---------------------------------------------------------------------------
// Visual: punk com moicano gigante, jaqueta de couro cravejada, correntes,
// botas pesadas e uma GUITARRA de rock na mão (como arma). A guitarra acompanha
// a mira (angulo), dá um golpe ao atacar e "toca" sola quando a bateria riffs.
// ---------------------------------------------------------------------------
window.desenharRoqueiro = function(x, y, isMoving, angulo, hp, maxHp, pid) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    ctx.save();
    ctx.translate(x, y);

    // Aura passiva de notas musicais
    if (!window.notasMusicais) window.notasMusicais = [];
    let chanceNota = window.roqueiroBateriaLigada ? 0.6 : 0.10;
    if (Math.random() < chanceNota) {
        window.notasMusicais.push({
            x: 12 + (Math.random() - 0.5) * 40,
            y: 16 + (Math.random() - 0.5) * 40,
            vy: -1.0 - Math.random(),
            alpha: 1.0,
            char: ['🎵', '🎶', '🎸', '🤘', '⚡'][Math.floor(Math.random() * 5)],
            escala: window.roqueiroBateriaLigada ? 1.6 : 1.0
        });
    }
    window.notasMusicais.forEach((nota, index) => {
        ctx.save();
        ctx.globalAlpha = nota.alpha;
        ctx.font = Math.floor(12 * nota.escala) + "px Arial";
        ctx.fillStyle = window.roqueiroBateriaLigada ? "#f1c40f" : "#ecf0f1";
        ctx.fillText(nota.char, nota.x, nota.y);
        ctx.restore();
        nota.y += nota.vy;
        nota.alpha -= 0.03;
        if (nota.alpha <= 0) window.notasMusicais.splice(index, 1);
    });

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (animação de caminhada zerada se a bateria estiver ativa)
    let legOffset = (isMoving && !window.roqueiroBateriaLigada) ? Math.sin(window.walkCycle || 0) * 3 : 0;
    ctx.fillStyle = "#1b2631";
    ctx.fillRect(7, 25, 3, 6 + legOffset);
    ctx.fillRect(14, 25, 3, 6 - legOffset);
    // Botas pesadas de couro (maiores, estilo punk)
    ctx.fillStyle = "#0f141a";
    ctx.fillRect(5, 31 + legOffset, 5, 3);
    ctx.fillRect(14, 31 - legOffset, 5, 3);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(7, 33 + legOffset, 2, 1);
    ctx.fillRect(16, 33 - legOffset, 2, 1);

    // ===== CORPO: Jaqueta de Couro Preta PUNK =====
    let corJaqueta = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#161b22";
    ctx.fillStyle = corJaqueta;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(20, 26);
    ctx.lineTo(4, 26);
    ctx.closePath();
    ctx.fill();

    // Camisa por baixo (listras diagonais punk)
    ctx.fillStyle = "#1c2833";
    ctx.fillRect(10, 10, 4, 16);
    ctx.fillStyle = "#e67e22";
    ctx.fillRect(10, 11, 4, 1.6);
    ctx.fillRect(10, 15, 4, 1.6);
    ctx.fillRect(10, 19, 4, 1.6);
    ctx.fillRect(10, 23, 4, 1.6);

    // Corrente de metal pendurada no pescoço/peito
    ctx.strokeStyle = "#95a5a6";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(7, 11);
    ctx.quadraticCurveTo(12, 16, 18, 11);
    ctx.stroke();
    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath(); ctx.arc(12, 15, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath(); ctx.arc(12, 15, 0.6, 0, Math.PI * 2); ctx.fill(); // medalhão

    // Rebites/cravo na jaqueta (estudded leather)
    ctx.fillStyle = "#aab2bd";
    for (let rx = 5; rx <= 19; rx += 4.5) {
        ctx.beginPath(); ctx.arc(rx, 12.5, 1, 0, Math.PI * 2); ctx.fill();
    }
    for (let rx = 6; rx <= 18; rx += 4) {
        ctx.beginPath(); ctx.arc(rx, 24, 1, 0, Math.PI * 2); ctx.fill();
    }

    // Cinto com fivela de caveira
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(1, 22, 22, 3);
    ctx.fillStyle = "#e8e4da";
    ctx.beginPath();
    ctx.arc(12, 23.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(11.3, 22.7, 1.4, 1.1);
    ctx.fillRect(12.7, 22.7, 1.4, 1.1);
    ctx.fillRect(11.8, 24.3, 0.6, 0.8);
    ctx.fillRect(12.5, 24.3, 0.6, 0.8);

    // Espinhos de ombro na jaqueta
    ctx.fillStyle = "#aab2bd";
    ctx.beginPath(); ctx.moveTo(4, 10); ctx.lineTo(2, 7.5); ctx.lineTo(6, 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(22, 7.5); ctx.lineTo(18, 10); ctx.closePath(); ctx.fill();

    // ===== CABEÇA: Moicano ENORME + cabelo espetado =====
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath(); ctx.moveTo(9, 7); ctx.lineTo(8, 2); ctx.lineTo(11, 5); ctx.lineTo(12, -1); ctx.lineTo(14, 4); ctx.lineTo(16, -2); ctx.lineTo(17, 4); ctx.lineTo(16, 7); ctx.closePath(); ctx.fill();
    // Moicano alto (crista vermelha)
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(11, 5); ctx.lineTo(12, -8); ctx.lineTo(13, -2); ctx.lineTo(14.5, -9); ctx.lineTo(15.5, -3); ctx.lineTo(17, -6); ctx.lineTo(16, 5);
    ctx.closePath();
    ctx.fill();
    // Topete lateral espetado
    ctx.fillStyle = "#8a2a1d";
    ctx.beginPath();
    ctx.moveTo(8, 4); ctx.lineTo(4, 1); ctx.lineTo(7, 4); ctx.lineTo(5, 6); ctx.lineTo(8, 7); ctx.closePath();
    ctx.fill();

    // Rosto
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(8, 5, 8, 6);
    ctx.fillStyle = "#e6a817";
    ctx.fillRect(8, 9, 8, 2);

    // Tiara de spikes na testa
    ctx.fillStyle = "#bdc3c7";
    ctx.fillRect(7, 4, 10, 1.4);
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(8, 2); ctx.lineTo(9, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(10, 1.5); ctx.lineTo(11, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(12, 1.5); ctx.lineTo(13, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(14, 2); ctx.lineTo(15, 4); ctx.fill();

    // Óculos escuros (metal com lentes vermelhas)
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(8, 6, 3.4, 2.4);
    ctx.fillRect(12.6, 6, 3.4, 2.4);
    ctx.fillRect(11.4, 6.6, 1.2, 1.2);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(8.3, 6.4, 2.8, 1.6);
    ctx.fillRect(12.9, 6.4, 2.8, 1.6);

    // Brinco de argola no rosto
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(6.4, 9, 1.1, 0.3, Math.PI * 1.7); ctx.stroke();

    // ===== GUITARRA ELÉTRICA (arma principal) na direção da mira =====
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);

    // Golpe com a guitarra (recente) → a guitarra dá um "swing"
    let golpeEm = 0;
    if (pid === undefined || pid === window.meuId) golpeEm = window.roqueiroGuitarraGolpeEm || 0;
    else if (window._roqueiroGolpePorId) golpeEm = window._roqueiroGolpePorId[pid] || 0;
    let dtGolpe = Date.now() - golpeEm;
    let golpeSwing = 0;
    if (dtGolpe >= 0 && dtGolpe < 200) {
        golpeSwing = Math.sin((dtGolpe / 200) * Math.PI) * 0.9;
    }
    ctx.rotate(golpeSwing);

    // Strum quando a bateria/riff está ligada (movimento vibratório)
    let strum = window.roqueiroBateriaLigada ? Math.sin(Date.now() / 55) * 0.18 : Math.sin(t * 2.2) * 0.06;

    ctx.translate(14, 0);

    // BRAÇO direito (segura o braço da guitarra)
    ctx.save();
    ctx.rotate(-0.25 + strum * 0.5);
    ctx.fillStyle = window.personagemInvisivelAtual === false ? "#8d6e63" : "#8d6e63";
    ctx.fillRect(0, -2, 18, 4);
    // Pulseira de spikes no pulso
    ctx.fillStyle = "#bdc3c7";
    ctx.fillRect(15, -3.4, 3, 6);
    ctx.fillStyle = "#111";
    ctx.fillRect(16.5, -3, 1, 5);
    ctx.restore();

    // ===== CORPO DA GUITARRA (double-cutaway agressivo) =====
    ctx.save();
    ctx.translate(-5, 0);

    // Asa superior pontuda (horn)
    ctx.fillStyle = "#101418";
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-2, -12);
    ctx.lineTo(1, -6);
    ctx.closePath();
    ctx.fill();
    // Asa inferior pontuda (horn)
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.lineTo(-8, 6);
    ctx.lineTo(-10, 14);
    ctx.lineTo(-2, 12);
    ctx.lineTo(1, 6);
    ctx.closePath();
    ctx.fill();

    // Seio central (round body)
    ctx.fillStyle = "#101418";
    ctx.beginPath();
    ctx.moveTo(-1, -7);
    ctx.quadraticCurveTo(-16, -9, -18, 0);
    ctx.quadraticCurveTo(-15, 9, -1, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2c2f35";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Contorno vermelho (binding hot rod)
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.quadraticCurveTo(-15, -7.5, -16.5, 0);
    ctx.quadraticCurveTo(-14, 7, -2, 6);
    ctx.stroke();

    // Decalque de raio/estrela punk no corpo
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-15, -2); ctx.lineTo(-11, -4); ctx.lineTo(-9, -2); ctx.lineTo(-13, 1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-15, 3); ctx.lineTo(-12, 1); ctx.lineTo(-9, 3); ctx.lineTo(-12, 5); ctx.stroke();

    // Escudo de captador (pickguard) + humbucker
    ctx.fillStyle = "#e8e4da";
    ctx.beginPath();
    ctx.moveTo(-1, -3.5);
    ctx.quadraticCurveTo(-9, -5, -12, -1);
    ctx.quadraticCurveTo(-8, 1, -1, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2c2f35";
    ctx.fillRect(-8.5, -3.6, 2.2, 3.4);
    // Botões/knobs
    ctx.fillStyle = "#95a5a6";
    ctx.beginPath(); ctx.arc(-3.5, -3, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-1.8, -2.6, 0.9, 0, Math.PI * 2); ctx.fill();

    // Ponte (bridge) com cordas
    ctx.fillStyle = "#bdc3c7";
    ctx.fillRect(-5.5, 1.2, 4, 1.2);
    for (let s = 0; s < 4; s++) {
        ctx.strokeStyle = "#d7dbdd";
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-3.5, 1.6 + s * 0.5);
        ctx.lineTo(20 + Math.sin(Date.now() / 90 + s) * 0.6, 1.6 + s * 0.5);
        ctx.stroke();
    }

    // Correia (strap) subindo até o ombro do músico
    ctx.strokeStyle = "#3a2a18";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.quadraticCurveTo(-22, -14, -14, -20);
    ctx.stroke();

    ctx.restore(); // fim corpo guitarra

    // BRAÇO da guitarra (neck) + escala + trastes + headstock
    ctx.save();
    ctx.rotate(-0.04);
    ctx.fillStyle = "#8a5a30";
    ctx.fillRect(0, -1.6, 20, 3.2);
    ctx.fillStyle = "#f4e8d8";
    ctx.fillRect(2, -1.2, 18, 2.4);
    // Trastes
    ctx.strokeStyle = "#7a6a55";
    ctx.lineWidth = 0.5;
    for (let f = 4; f <= 18; f += 3.5) {
        ctx.beginPath(); ctx.moveTo(f, -1.2); ctx.lineTo(f, 1.2); ctx.stroke();
    }
    // Headstock inclinado + tarraxas
    ctx.fillStyle = "#101418";
    ctx.beginPath();
    ctx.moveTo(20, -1.6); ctx.lineTo(26, -3.4); ctx.lineTo(27, 0); ctx.lineTo(26, 3.2); ctx.lineTo(20, 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath(); ctx.arc(24, -2.6, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24.6, 2.8, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(21.6, -3, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(22.2, 3.2, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore(); // fim guitarra/mira

    ctx.restore(); // fim translate principal

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// Último golpe de guitarra (local e de outros jogadores) para o swing da arma

// NOVA FUNÇÃO: Desenha os Integrantes da Banda ao Vivo (guitarristas PUNK)
window.desenharBandaRoqueiro = function(listaBanda) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    for (let bId in listaBanda) {
        let banda = listaBanda[bId];
        if (banda && banda.membros) {
            banda.membros.forEach(membro => {
                ctx.save();
                ctx.translate(membro.x, membro.y);

                // Sombra do integrante
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                ctx.beginPath(); ctx.ellipse(0, 16, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

                // Pernas (jeans rasgado)
                ctx.fillStyle = "#1c2833";
                ctx.fillRect(-3.5, 8, 3, 7);
                ctx.fillRect(0.5, 8, 3, 7);
                ctx.fillStyle = "#111";
                ctx.fillRect(-3.5, 9.5, 1.2, 2);
                ctx.fillRect(0.5, 11, 1.2, 2);

                // Colete/jaqueta punk (estudded)
                ctx.fillStyle = "#21262d";
                ctx.fillRect(-5, -2, 10, 12);
                ctx.fillStyle = "#aab2bd";
                ctx.fillRect(-4.5, 1, 1, 1); ctx.fillRect(-1, 3, 1, 1); ctx.fillRect(2.5, 1, 1, 1);
                ctx.fillRect(3.5, 6, 1, 1); ctx.fillRect(-4.5, 6, 1, 1);

                // Corrente no pescoço
                ctx.strokeStyle = "#95a5a6";
                ctx.lineWidth = 0.9;
                ctx.beginPath(); ctx.moveTo(-4, -1); ctx.quadraticCurveTo(0, 1.5, 4, -1); ctx.stroke();

                // Cabeça punk com moicano
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(-4, -10, 8, 7);
                ctx.fillStyle = "#c0392b";
                ctx.beginPath();
                ctx.moveTo(-1, -9); ctx.lineTo(0, -15); ctx.lineTo(1, -9);
                ctx.lineTo(2, -16); ctx.lineTo(3, -9); ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "#111";
                ctx.fillRect(-4, -10, 8, 2.2);
                ctx.fillRect(-5, -8.5, 2, 3);
                ctx.fillRect(3, -8.5, 2, 3);
                // Óculos escuros
                ctx.fillStyle = "#111";
                ctx.fillRect(-3.5, -7, 3, 2);
                ctx.fillRect(0.5, -7, 3, 2);
                ctx.fillRect(-0.5, -6.8, 1, 1.4);
                ctx.fillStyle = "#c0392b";
                ctx.fillRect(-3, -6.8, 2, 1.2);
                ctx.fillRect(1, -6.8, 2, 1.2);

                // GUITARRA do integrante (melhorada com braço, cordas e strum)
                const giroGuitarra = Math.sin(t * 3 + membro.x * 0.1) * 0.5;
                ctx.save();
                ctx.translate(4, 2);
                ctx.rotate(giroGuitarra);
                // Corpo da guitarra
                ctx.fillStyle = "#101418";
                ctx.beginPath();
                ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2);
                ctx.moveTo(-3, -2); ctx.lineTo(-7, -5); ctx.lineTo(-4, 0);
                ctx.moveTo(-3, 2); ctx.lineTo(-7, 5); ctx.lineTo(-4, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "#c0392b";
                ctx.strokeStyle = "#c0392b";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0.4, Math.PI * 1.6); ctx.stroke();
                ctx.fillStyle = "#e8e4da";
                ctx.fillRect(-2.5, -1.6, 3, 3.2);
                // Braço + headstock
                ctx.fillStyle = "#8a5a30";
                ctx.fillRect(2, -1.2, 11, 2.4);
                ctx.fillStyle = "#f4e8d8";
                ctx.fillRect(3, -0.8, 10, 1.6);
                ctx.strokeStyle = "#7a6a55";
                ctx.lineWidth = 0.4;
                for (let f = 5; f <= 12; f += 2.5) { ctx.beginPath(); ctx.moveTo(f, -0.8); ctx.lineTo(f, 0.8); ctx.stroke(); }
                ctx.fillStyle = "#101418";
                ctx.fillRect(12, -1.6, 4, 3.2);
                ctx.fillStyle = "#bdc3c7";
                ctx.beginPath(); ctx.arc(14.5, -1, 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(14.5, 1, 0.6, 0, Math.PI * 2); ctx.fill();
                // Cordas vibrantes
                ctx.strokeStyle = "#d7dbdd";
                ctx.lineWidth = 0.4;
                for (let s = 0; s < 3; s++) {
                    const w = Math.sin(t * 14 + s * 2 + membro.x) * 0.7;
                    ctx.beginPath();
                    ctx.moveTo(-3, -0.6 + s * 0.6);
                    ctx.quadraticCurveTo(4 + w, -0.6 + s * 0.6 + w, 13, -0.6 + s * 0.6);
                    ctx.stroke();
                }
                ctx.restore();

                // BRAÇO do integrante (segurando a guitarra)
                ctx.strokeStyle = "#8d6e63";
                ctx.lineWidth = 2.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-3, 0);
                ctx.quadraticCurveTo(0, 2, 4, 3);
                ctx.stroke();

                ctx.restore();  // fecha o save() da linha 325 (membro inteiro)
            });
        }
    }
};

window.enviarAtaqueRoqueiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomMagiaBasica === 'function') window.tocarSomMagiaBasica();
    window.roqueiroGuitarraGolpeEm = Date.now();
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_roqueiro' })); }
};