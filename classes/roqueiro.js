// classes/roqueiro.js - Renderização do Roqueiro CANTOR DE ROCK AND ROLL
// ---------------------------------------------------------------------------
// Visual: Humano carismático, cantor de rock, roupas pretas elegantes,
// cabelo comprido/penteado estilo rock, guitarra elétrica vermelha/preta.
// Aura de notas musicais ao seu redor. Movimento elegante e dinâmico.
// ---------------------------------------------------------------------------
window.desenharRoqueiro = function(x, y, isMoving, angulo, hp, maxHp, pid) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    ctx.save();
    ctx.translate(x, y);

    // Aura passiva de notas musicais (isolada por jogador / pid)
    if (!window.notasMusicaisPorPid) window.notasMusicaisPorPid = {};
    let safePid = pid || 'local';
    if (!window.notasMusicaisPorPid[safePid]) window.notasMusicaisPorPid[safePid] = [];
    let notas = window.notasMusicaisPorPid[safePid];
    let isBateria = (safePid === 'local' || safePid === window.meuId) ? !!window.roqueiroBateriaLigada : false;
    let chanceNota = isBateria ? 0.22 : 0.10;
    if (notas.length < 20 && Math.random() < chanceNota) {
        notas.push({
            x: 12 + (Math.random() - 0.5) * 40,
            y: 16 + (Math.random() - 0.5) * 40,
            vy: -1.0 - Math.random(),
            alpha: 1.0,
            char: ['🎵', '🎶', '🎸', '🤘', '⚡'][Math.floor(Math.random() * 5)],
            escala: isBateria ? 1.6 : 1.0
        });
    }
    notas.forEach((nota, index) => {
        ctx.save();
        ctx.globalAlpha = nota.alpha;
        ctx.font = Math.floor(12 * nota.escala) + "px Arial";
        ctx.fillStyle = isBateria ? "#f1c40f" : "#ecf0f1";
        ctx.fillText(nota.char, nota.x, nota.y);
        ctx.restore();
        nota.y += nota.vy;
        nota.alpha -= 0.03;
        if (nota.alpha <= 0) notas.splice(index, 1);
    });

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== PERNAS: Calça preta apertada (estilo rock) =====
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3 : 0;
    
    // Coxas (calça preta)
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(6, 24, 4, 8 + legOffset);
    ctx.fillRect(14, 24, 4, 8 - legOffset);
    
    // Botas de couro preto com zíperes
    ctx.fillStyle = "#000";
    ctx.fillRect(5, 31 + legOffset, 6, 3);
    ctx.fillRect(13, 31 - legOffset, 6, 3);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(7, 31.5 + legOffset);
    ctx.lineTo(7, 34 + legOffset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, 31.5 - legOffset);
    ctx.lineTo(15, 34 - legOffset);
    ctx.stroke();

    // ===== CORPO: Jaqueta de couro preta elegante =====
    let danoFlash = (window.danoFlashTimer || 0) > 0;
    let corJaqueta = danoFlash ? "#e74c3c" : "#0f0f0f";
    
    ctx.fillStyle = corJaqueta;
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 12);
    ctx.lineTo(20, 24);
    ctx.lineTo(4, 24);
    ctx.closePath();
    ctx.fill();
    
    // Contorno da jaqueta
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // Zíperes laterais da jaqueta
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(4.5, 14);
    ctx.lineTo(4.5, 23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(19.5, 14);
    ctx.lineTo(19.5, 23);
    ctx.stroke();
    
    // Botões de metal na jaqueta
    ctx.fillStyle = "#999";
    for (let by = 16; by <= 21; by += 2.5) {
        ctx.beginPath();
        ctx.arc(4, by, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20, by, 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Camisa preta por baixo (visível no meio)
    ctx.fillStyle = "#000";
    ctx.fillRect(10, 12, 4, 12);

    // ===== CABEÇA: Rosto humano com cabelo comprido estilo rock =====
    
    // Pescoço
    ctx.fillStyle = "#d4a574";
    ctx.fillRect(10, 10, 4, 3);
    
    // Cabeça (rosto)
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(12, 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Cabelo vermelho em mechas, com silhueta de vocalista de palco.
    ctx.fillStyle = "#971f32";
    
    // Topo e lateral esquerda
    ctx.beginPath();
    ctx.moveTo(8.5, 3);
    ctx.quadraticCurveTo(5, 4, 4, 8);
    ctx.quadraticCurveTo(3.5, 12, 5, 15);
    ctx.lineTo(9, 9);
    ctx.closePath();
    ctx.fill();
    
    // Lado direito
    ctx.beginPath();
    ctx.moveTo(15.5, 3);
    ctx.quadraticCurveTo(19, 4, 20, 8);
    ctx.quadraticCurveTo(20.5, 12, 19, 15);
    ctx.lineTo(15, 9);
    ctx.closePath();
    ctx.fill();
    
    // Topo do cabelo (mais comprido atrás)
    ctx.beginPath();
    ctx.ellipse(12, 2, 3.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ondas/volume no cabelo
    ctx.fillStyle = "#d12b42";
    ctx.beginPath();
    ctx.arc(8, 5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, 5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Franja (cabelo na testa)
    ctx.fillStyle = "#bd263c";
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.lineTo(8, 7);
    ctx.lineTo(12, 5.5);
    ctx.lineTo(16, 7);
    ctx.lineTo(15, 4);
    ctx.closePath();
    ctx.fill();

    // Fones de palco com aro e conchas metálicas.
    ctx.strokeStyle = "#17151b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(12, 5.7, 5.2, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    ctx.fillStyle = "#211922";
    ctx.beginPath(); ctx.ellipse(7.2, 7, 1.5, 2.6, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16.8, 7, 1.5, 2.6, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#d5a13c";
    ctx.lineWidth = 0.65;
    ctx.beginPath(); ctx.arc(7.2, 7, 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(16.8, 7, 0.8, 0, Math.PI * 2); ctx.stroke();

    // ===== ROSTO: Olhos e expressão rock =====
    
    // Olhos (intensos, estilo rock)
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(10, 5.5, 1, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 5.5, 1, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Brilho nos olhos (expressão viva)
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(10.3, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(14.3, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Sobrancelhas (expressão intensa)
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.lineTo(11, 3.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, 3.5);
    ctx.lineTo(13, 4);
    ctx.stroke();
    
    // Nariz
    ctx.strokeStyle = "#b8855f";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(12, 5);
    ctx.lineTo(12, 7);
    ctx.stroke();
    
    // Boca (sorriso confiante de rockstar)
    ctx.strokeStyle = "#8b3a3a";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(12, 8.5, 1.5, 0, Math.PI);
    ctx.stroke();

    // ===== BRAÇO DIREITO (segura guitarra) =====
    let armRotation = Math.sin(t * 1.5) * 0.1;
    
    ctx.save();
    ctx.translate(16, 16);
    ctx.rotate(armRotation);
    
    // Bíceps
    ctx.fillStyle = "#d4a574";
    ctx.fillRect(0, -1.5, 5, 3);
    ctx.beginPath();
    ctx.arc(5, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Mão (dedos)
    ctx.fillStyle = "#d4a574";
    ctx.fillRect(5, -2, 2, 4);
    
    ctx.restore();

    // ===== BRAÇO ESQUERDO =====
    ctx.save();
    ctx.translate(8, 16);
    ctx.rotate(-armRotation);
    
    ctx.fillStyle = "#d4a574";
    ctx.fillRect(-5, -1.5, 5, 3);
    ctx.beginPath();
    ctx.arc(-5, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#d4a574";
    ctx.fillRect(-7, -2, 2, 4);
    
    ctx.restore();

    // Alça diagonal no peito, por baixo da guitarra.
    ctx.strokeStyle = "#57423e";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(5, 12);
    ctx.lineTo(19, 24);
    ctx.stroke();
    ctx.strokeStyle = "#c99748";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(5, 12);
    ctx.lineTo(19, 24);
    ctx.stroke();

    // ===== GUITARRA ELÉTRICA PRESA AO PEITO =====
    ctx.save();
    const ladoGuitarra = Math.cos(angulo || 0) < 0 ? -1 : 1;
    ctx.translate(12, 17);
    ctx.scale(ladoGuitarra, 1);
    ctx.rotate(-0.48);

    // Animação de golpe (swing da guitarra)
    let golpeEm = 0;
    if (pid === undefined || pid === window.meuId) golpeEm = window.roqueiroGuitarraGolpeEm || 0;
    else if (window._roqueiroGolpePorId) golpeEm = window._roqueiroGolpePorId[pid] || 0;
    let dtGolpe = Date.now() - golpeEm;
    let golpeSwing = 0;
    if (dtGolpe >= 0 && dtGolpe < 200) {
        golpeSwing = Math.sin((dtGolpe / 200) * Math.PI) * 0.9;
    }
    ctx.rotate(golpeSwing);

    // Strum vibratório quando bateria está ligada
    let strum = window.roqueiroBateriaLigada ? Math.sin(Date.now() / 55) * 0.18 : Math.sin(t * 2.2) * 0.06;
    let wp = window.inventario ? window.inventario.arma : null;
    let armaV = null;
    if (x === window.meuX && y === window.meuY) { 
        if (wp && wp.customVisual) armaV = wp;
    }
    if (typeof window.desenharGuitarraExposta === 'function') window.desenharGuitarraExposta(ctx, armaV);

    ctx.restore(); // fim guitarra/mira

    ctx.restore(); // fim translate principal

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// ===== FUNÇÃO: LACAIO VOCALISTA DA BANDA =====
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

                const pulse = 0.5 + Math.sin(t * 8 + (membro.x || 0) * 0.03) * 0.5;
                const cantando = Math.sin(t * 7 + (membro.y || 0) * 0.02);
                const passoVocalista = Math.sin(t * 5 + (membro.x || 0) * 0.04) * 1.2;

                // Calca escura, botas e casaco de palco com abas vermelhas.
                ctx.fillStyle = "#16151c";
                ctx.fillRect(-3.4, 8 + passoVocalista, 2.8, 7);
                ctx.fillRect(0.6, 8 - passoVocalista, 2.8, 7);
                ctx.fillStyle = "#6f202b";
                ctx.fillRect(-4, 14 + passoVocalista, 4, 2);
                ctx.fillRect(0, 14 - passoVocalista, 4, 2);
                ctx.fillStyle = "#211923";
                ctx.beginPath();
                ctx.moveTo(-5, -2); ctx.lineTo(5, -2); ctx.lineTo(6, 10);
                ctx.lineTo(2, 8); ctx.lineTo(0, 12); ctx.lineTo(-2, 8); ctx.lineTo(-6, 10);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "#a52d3d"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 7); ctx.stroke();
                ctx.fillStyle = "#d5b06b";
                ctx.beginPath(); ctx.arc(0, 4, 1.1, 0, Math.PI * 2); ctx.fill();

                // Rosto aquecido pelo palco, cabelo vermelho e boca em canto.
                ctx.fillStyle = "#c98768";
                ctx.beginPath(); ctx.ellipse(0, -7, 4.1, 4.8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#8f1f32";
                ctx.beginPath();
                ctx.moveTo(-4, -8); ctx.lineTo(-6, -13); ctx.lineTo(-1, -11);
                ctx.lineTo(1, -15); ctx.lineTo(2, -11); ctx.lineTo(6, -12);
                ctx.lineTo(4, -7); ctx.lineTo(3, -4); ctx.lineTo(-3, -5);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#27141a";
                ctx.fillRect(-2.5, -8, 1.4, 0.8);
                ctx.fillRect(1.2, -8, 1.4, 0.8);
                ctx.fillStyle = "#45121d";
                ctx.beginPath(); ctx.ellipse(0.5, -4.5, 1.1, 1.6 + Math.abs(cantando) * 0.8, 0, 0, Math.PI * 2); ctx.fill();

                // Microfone erguido na mao e ondas sonoras do vocal.
                ctx.strokeStyle = "#c98768"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(3, 1); ctx.quadraticCurveTo(6, -1, 5, -5); ctx.stroke();
                ctx.strokeStyle = "#bfc6d2"; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(6.5, -11); ctx.stroke();
                ctx.fillStyle = "#181a22";
                ctx.beginPath(); ctx.ellipse(6.7, -12, 2, 2.8, -0.2, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#c33b52"; ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.arc(0, -9, 10 + pulse * 2, -2.5, -0.6); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, -9, 14 + pulse * 3, -2.45, -0.65); ctx.stroke();

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

window.desenharGuitarraExposta = function(ctx, armaVisualCustom) {
    let t = Date.now() / 1000;
    let strum = window.roqueiroBateriaLigada ? Math.sin(Date.now() / 55) * 0.18 : Math.sin(t * 2.2) * 0.06;

    let cv = armaVisualCustom && armaVisualCustom.customVisual ? armaVisualCustom.customVisual : {};
    let tamanho = cv.tamanho || 1.0;
    let largura = cv.largura || 1.0;
    let cBase = cv.cBase || "#b30000";
    let cMeio = cv.cMeio || "#c0392b";
    let cPonta = cv.cPonta || "#000";
    let cFio = cv.cFio || "#daa520";

    ctx.save();
    // Diminui 10% geral (0.9) e move um pouco para baixo (+1.5 no eixo Y)
    ctx.translate(0, 1.5);
    ctx.scale(tamanho * 0.9, largura * 0.9);

    // ===== CORPO DA GUITARRA =====
    ctx.save();
    ctx.translate(-5, 0);

    // Asa superior (horn) da guitarra
    ctx.fillStyle = cMeio;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-2, -10);
    ctx.lineTo(1, -5);
    ctx.closePath();
    ctx.fill();

    // Asa inferior (horn) da guitarra
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.lineTo(-6, 5);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-2, 10);
    ctx.lineTo(1, 5);
    ctx.closePath();
    ctx.fill();

    // Corpo central (round body elétrico)
    ctx.fillStyle = cBase;
    ctx.beginPath();
    ctx.moveTo(-1, -7);
    ctx.quadraticCurveTo(-15, -9, -16, 0);
    ctx.quadraticCurveTo(-15, 9, -1, 7);
    ctx.closePath();
    ctx.fill();

    // Contorno preto na guitarra
    ctx.strokeStyle = cPonta;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Binding dourado (borda)
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-1, -6);
    ctx.quadraticCurveTo(-14, -7.5, -15, 0);
    ctx.quadraticCurveTo(-14, 7.5, -1, 6);
    ctx.stroke();

    // Pickups (captadores) - pretos
    ctx.fillStyle = "#000";
    ctx.fillRect(-6, -2, 4, 1.2);
    ctx.fillRect(-6, 1, 4, 1.2);

    // Buraco do som
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-8, 0, 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Ponte (bridge)
    ctx.fillStyle = "#999";
    ctx.fillRect(-7, -0.5, 3, 1);

    ctx.restore();

    // ===== BRAÇO DA GUITARRA (neck) =====
    ctx.save();
    ctx.rotate(-0.04 + strum * 0.5);
    
    // Neck de madeira
    ctx.fillStyle = "#8b6914";
    ctx.fillRect(0, -1.4, 20, 2.8);
    
    // Escala (fretboard)
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(1.5, -1.2, 18, 2.4);
    
    // Trastes (frets)
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 0.4;
    for (let fret = 3; fret <= 19; fret += 2.2) {
        ctx.beginPath();
        ctx.moveTo(fret, -1.2);
        ctx.lineTo(fret, 1.2);
        ctx.stroke();
    }
    
    // Headstock (cabeçalho)
    ctx.fillStyle = cPonta;
    ctx.beginPath();
    ctx.moveTo(20, -1.4);
    ctx.lineTo(25, -2.8);
    ctx.lineTo(26, 0);
    ctx.lineTo(25, 2.8);
    ctx.lineTo(20, 1.4);
    ctx.closePath();
    ctx.fill();
    
    // Tuners (tarraxas)
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(23, -2.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, 0, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(23, 2.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    ctx.restore();
};
