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

    // Aura passiva de notas musicais
    if (!window.notasMusicais) window.notasMusicais = [];
    // FIX tela verde: com a Bateria ligada a taxa de spawn 0.6/frame estourava o canvas
    // (centenas de fillText + filtros). Reduzimos a taxa e limitamos a pilha de notas.
    let chanceNota = window.roqueiroBateriaLigada ? 0.22 : 0.10;
    if (window.notasMusicais.length < 40 && Math.random() < chanceNota) {
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
    
    // Cabelo comprido (preto, estilo rock anos 80)
    ctx.fillStyle = "#1a1a1a";
    
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
    ctx.fillStyle = "#0d0d0d";
    ctx.beginPath();
    ctx.arc(8, 5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, 5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Franja (cabelo na testa)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.lineTo(8, 7);
    ctx.lineTo(12, 5.5);
    ctx.lineTo(16, 7);
    ctx.lineTo(15, 4);
    ctx.closePath();
    ctx.fill();

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

    // ===== GUITARRA ELÉTRICA (vermelha e preta) =====
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);

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
    ctx.translate(14, 0);

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

// ===== FUNÇÃO: Desenha os Integrantes da Banda (MANTÉM COMO ESTÁ) =====
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

                // GUITARRA do integrante
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
