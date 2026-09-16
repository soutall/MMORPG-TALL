// classes/roqueiro.js - Renderização do Roqueiro e sua Banda
window.desenharRoqueiro = function(x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

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
            char: ['🎵', '🎶', '🎸', '🥁', '⚡'][Math.floor(Math.random() * 5)],
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
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(7, 25, 3, 6 + legOffset);
    ctx.fillRect(14, 25, 3, 6 - legOffset);

    // Corpo - Jaqueta de Couro Preta
    let corJaqueta = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#1e272e";
    ctx.fillStyle = corJaqueta;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(20, 26);
    ctx.lineTo(4, 26);
    ctx.closePath();
    ctx.fill();

    // Detalhe da camisa por baixo
    ctx.fillStyle = "#e67e22";
    ctx.fillRect(10, 10, 4, 16);

    // Cabeça e Cabelo (Moicano vermelho)
    ctx.fillStyle = "#f1c40f"; 
    ctx.fillRect(8, 2, 8, 8);
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(12, -4);
    ctx.lineTo(16, 2);
    ctx.closePath();
    ctx.fill();

    // Óculos escuros
    ctx.fillStyle = "#111";
    ctx.fillRect(8, 4, 3, 2); 
    ctx.fillRect(13, 4, 3, 2); 
    ctx.fillRect(11, 4, 2, 1); 

    // Arma (Bateria de Rock) acompanhando a mira do joystick
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(15, 0);

    // Braço segurando a baqueta
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(-9, -2, 14, 4);

    // Baqueta atacando o tambor
    ctx.save();
    let batidaBaqueta = Math.sin(Date.now() / 120) * 0.35;
    ctx.translate(2, 0);
    ctx.rotate(-0.8 + batidaBaqueta);
    ctx.fillStyle = "#d68910";
    ctx.fillRect(0, -14, 2.5, 16);
    ctx.fillStyle = "#ecf0f1";
    ctx.beginPath(); ctx.arc(1.2, -14, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Tambor (corpo da bateria)
    ctx.fillStyle = "#922b21";
    ctx.beginPath(); ctx.arc(0, 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#b03a2e"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#f9e79f"; // Pele do tambor
    ctx.beginPath(); ctx.arc(0, 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7f8c8d"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 2, 4, 0, Math.PI * 2); ctx.stroke();

    // Prato (cymbal) rodando acima
    ctx.save();
    ctx.translate(7, -7);
    ctx.rotate(Date.now() / 250);
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore(); 

    ctx.restore(); 

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// NOVA FUNÇÃO: Desenha os Integrantes da Banda ao Vivo!
window.desenharBandaRoqueiro = function(listaBanda) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    
    for (let bId in listaBanda) {
        let banda = listaBanda[bId];
        if (banda && banda.membros) {
            banda.membros.forEach(membro => {
                ctx.save();
                ctx.translate(membro.x, membro.y);
                
                // Sombra do integrante
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                ctx.beginPath(); ctx.ellipse(0, 16, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

                // Corpo do integrante (Colete Verde)
                ctx.fillStyle = "#2c3e50"; // Calça
                ctx.fillRect(-3, 8, 3, 8);
                ctx.fillRect(1, 8, 3, 8);
                ctx.fillStyle = "#27ae60"; // Colete
                ctx.fillRect(-5, -2, 10, 12);

                // Cabeça e Cabelo (Cabelo preto estilo Rock)
                ctx.fillStyle = "#f1c40f"; // Rosto
                ctx.fillRect(-4, -10, 8, 8);
                ctx.fillStyle = "#111"; // Cabelo
                ctx.fillRect(-4, -10, 8, 3);
                ctx.fillRect(-5, -8, 2, 4);
                ctx.fillRect(3, -8, 2, 4);

                // Guitarra na mão do integrante (rodando violentamente)
                ctx.save();
                ctx.rotate(membro.angulo * 2.5);
                ctx.fillStyle = "#8d6e63"; // Braço
                ctx.fillRect(-8, -2, 16, 4);
                ctx.fillStyle = "#c0392b"; // Corpo
                ctx.beginPath(); ctx.arc(-3, 0, 6, 0, Math.PI * 2); ctx.arc(-9, 0, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#ecf0f1"; // Detalhe central
                ctx.beginPath(); ctx.arc(-3, 0, 3, 0, Math.PI * 2); ctx.fill();
                ctx.restore();

                ctx.restore();
            });
        }
    }
};

window.enviarAtaqueRoqueiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomMagiaBasica === 'function') window.tocarSomMagiaBasica(); 
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_roqueiro' })); }
};
