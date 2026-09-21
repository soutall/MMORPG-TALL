// classes/barbaro.js - BERSERKER: corpo bruto com GRANDE MACHADO DE GUERRA
// ============================================================================
// O bárbaro agora é um Berserker: torso massivo, pelagem de lobo, olhos em
// fúria e um GRANDE MACHADO segurado com as duas mãos. O controle da raiva
// (aura vermelha + brasas + tremores) cresce conforme a vida cai.
//
// INTERFACES PÚBLICAS (INALTERADAS + pid extra opcional):
//     window.desenharBarbaro(x, y, isMoving, angulo, hp, maxHp [, pid])
//     window.enviarAtaqueBarbaro(ws)
//     window.registrarMachadadaBarbaro(id)  -> anima o swing do machado
// ============================================================================

const BARBARO_COR = {
    pele: '#d7996c',
    peleSombra: '#b07050',
    cabelo: '#3a1709',
    cabeloClaro: '#5c2a12',
    barba: '#2c1206',
    couro: '#4a2311',
    couroClaro: '#784212',
    peloLobo: '#8a6a4a',
    peloLoboEscuro: '#63482e',
    ferro: '#3a4658',
    ferroClaro: '#6b7b8f',
    aco: '#aeb6bf',
    acoBrilho: '#e8edf2',
    sangue: '#c0392b',
    sangueEscuro: '#900c3f',
    fogo: '#e74c3c',
    ouro: '#d4af37',
    osso: '#e5dcc8'
};

// Registro de golpes (id do jogador -> momento do golpe) para o swing do machado
window.machadadasBarbaro = window.machadadasBarbaro || {};
window.registrarMachadadaBarbaro = function (id) {
    window.machadadasBarbaro[id] = Date.now();
};

// ---------------------------------------------------------------------------
// GRANDE MACHADO DE GUERRA — segurado com as duas mãos (referencial local:
// pivô na mão de cima, cabo descendo e lâmina em meia-lua gigante acima).
// ---------------------------------------------------------------------------
function desenharGrandeMachado(ctx, angulo, isMoving, ciclo, swingT, t, furyStage, giroSpin) {
    ctx.save();
    if (giroSpin > 0) {
        // GIRO DESCONTROLADO: pivô no centro do corpo → o machado varre em volta
        // do Berserker numa rotação contínua e rápida (casada com o efeito do GIRO)
        ctx.translate(12, 16);
        ctx.rotate(angulo + giroSpin);
    } else {
        ctx.translate(22, 13);      // ombro direito do personagem
        ctx.rotate(angulo);
    }

    let swing = 0;
    if (giroSpin > 0) {
        // micro-tremedeira enquanto gira nas altas velocidades
        swing = Math.sin(giroSpin * 3 + t * 2) * 0.05;
    } else if (swingT > 0) {
        // Golpe: de cima (erguido atrás) até o seguimento, com easing
        let p = 1 - swingT;
        let ease = 1 - Math.pow(1 - p, 2);
        swing = -2.1 + ease * 2.9;
    } else {
        let sway = isMoving ? Math.sin(ciclo) * 0.16 : Math.sin(t * 2.0) * 0.05;
        swing = -0.9 + sway;    // erguido sobre o ombro
        if (furyStage === 3) swing += Math.sin(t * 9) * 0.06; // tremor da raiva
    }
    ctx.rotate(swing);

    // ---------- CABO de madeira ----------
    const gCabo = ctx.createLinearGradient(-2, -6, 2, 26);
    gCabo.addColorStop(0, '#6d4c2f');
    gCabo.addColorStop(1, '#3b2414');
    ctx.fillStyle = gCabo;
    ctx.fillRect(-2, -6, 4, 32);
    ctx.strokeStyle = 'rgba(20,10,5,0.5)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-2, -6, 4, 32);

    // enrolamento de couro no cabo (punho)
    ctx.fillStyle = BARBARO_COR.couroClaro;
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(-2.5, 2 + i * 3, 5, 1.6);
    }

    // pomo de metal na ponta do cabo
    ctx.fillStyle = BARBARO_COR.ferroClaro;
    ctx.beginPath();
    ctx.arc(0, 26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BARBARO_COR.ferro;
    ctx.beginPath();
    ctx.arc(0, 26, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // colar de metal entre cabo e lâmina
    ctx.fillStyle = BARBARO_COR.ferro;
    ctx.fillRect(-4, -7, 8, 3.5);
    ctx.fillStyle = BARBARO_COR.ferroClaro;
    ctx.fillRect(-4, -7, 8, 1.2);

    // ---------- LÂMINA em meia-lua gigante ----------
    ctx.save();
    ctx.shadowColor = furyStage > 0 ? 'rgba(230,60,40,0.8)' : 'rgba(20,25,35,0.7)';
    ctx.shadowBlur = 10 + furyStage * 4;
    const gLamin = ctx.createLinearGradient(0, -42, 0, -8);
    gLamin.addColorStop(0, BARBARO_COR.acoBrilho);
    gLamin.addColorStop(0.5, BARBARO_COR.aco);
    gLamin.addColorStop(1, BARBARO_COR.ferro);
    ctx.fillStyle = gLamin;
    ctx.strokeStyle = BARBARO_COR.ferro;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(-22, -14, -26, -26);
    ctx.quadraticCurveTo(-28, -38, -14, -40);
    ctx.quadraticCurveTo(-4, -42, 2, -40);
    ctx.quadraticCurveTo(10, -41, 18, -37);
    ctx.quadraticCurveTo(25, -32, 23, -22);
    ctx.quadraticCurveTo(20, -12, 0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // brilho dos fios de corte (superior esquerdo e direito)
    ctx.strokeStyle = BARBARO_COR.acoBrilho;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, -40);
    ctx.quadraticCurveTo(-4, -41, -14, -39);
    ctx.quadraticCurveTo(-27, -37, -25, -26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, -40);
    ctx.quadraticCurveTo(10, -40, 18, -36);
    ctx.quadraticCurveTo(24, -31, 22, -22);
    ctx.stroke();

    // runas de fúria na lâmina
    if (furyStage > 0) {
        ctx.strokeStyle = 'rgba(255,120,80,' + (0.4 + Math.sin(t * 6) * 0.3).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-8, -30); ctx.lineTo(-4, -26); ctx.lineTo(-10, -22);
        ctx.moveTo(6, -28); ctx.lineTo(10, -24); ctx.lineTo(5, -20);
        ctx.stroke();
    }

    // respingos de sangue antigos na lâmina
    ctx.fillStyle = 'rgba(150,20,20,0.55)';
    ctx.beginPath();
    ctx.ellipse(-12, -20, 2.4, 1.3, 0.6, 0, Math.PI * 2);
    ctx.ellipse(14, -14, 2, 1.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---------- BRAÇOS que seguram o cabo (mãos por cima da madeira) ----------
    ctx.lineCap = 'round';
    // braço direito (segura o cabo perto da lâmina)
    ctx.strokeStyle = BARBARO_COR.pele;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.quadraticCurveTo(-6, -4, 0, -4);
    ctx.stroke();
    // braço esquerdo (segura mais embaixo)
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.quadraticCurveTo(-4, 7, 0, 7);
    ctx.stroke();
    // punhos de couro + mãos
    ctx.fillStyle = BARBARO_COR.couroClaro;
    ctx.fillRect(-1.2, -5.6, 2.6, 3.2);
    ctx.fillRect(-1.2, 5.8, 2.6, 2.8);
    ctx.fillStyle = BARBARO_COR.pele;
    ctx.beginPath(); ctx.arc(0, -4, 2.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    // dedos apertando o cabo
    ctx.strokeStyle = 'rgba(60,30,15,0.7)';
    ctx.lineWidth = 0.8;
    for (let d = 0; d < 3; d++) {
        ctx.beginPath();
        ctx.arc(0, -4, 2.7, Math.PI * 0.2 + d * 0.5, Math.PI * 0.8 + d * 0.5);
        ctx.stroke();
    }

    ctx.restore();
}

// ---------------------------------------------------------------------------
// BERSERKER (personagem) — corpo massivo + grande machado de guerra
// ---------------------------------------------------------------------------
window.desenharBarbaro = function (x, y, isMoving, angulo, hp, maxHp, pid) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    // ---------- Fúria (cresce quando a vida cai) ----------
    let pctHp = maxHp > 0 ? hp / maxHp : 1;
    let furyStage = pctHp <= 0.2 ? 3 : pctHp <= 0.4 ? 2 : pctHp <= 0.6 ? 1 : 0;
    let furyScale = furyStage === 3 ? 0.18 : furyStage === 2 ? 0.09 : furyStage === 1 ? 0.04 : 0;

    // ---------- Swing do machado (golpe) ----------
    let swingT = 0;
    const atqInicio = (typeof pid !== 'undefined' && window.machadadasBarbaro[pid]) || 0;
    if (atqInicio) {
        const dtSwing = Date.now() - atqInicio;
        if (dtSwing < 280) swingT = 1 - dtSwing / 280;
        else window.machadadasBarbaro[pid] = 0;
    }

    const dano = (window.danoFlashTimer || 0) > 0;
    const cor = (normal, flash) => (dano ? flash : normal);

    // ---------- GIRO DESCONTROLADO: machado girando com a velocidade do efeito ----------
    let giroSpin = 0;
    let giroAtivo = (pid === window.meuId) ? !!window.giroDescontroladoLigado
        : !!(window.girosBarbaro && window.girosBarbaro.some(function (g) { return g.id === pid && g.ativo && !g.encerrando; }));
    if (!giroAtivo && pid === window.meuId && window.girosBarbaro) {
        // também vale pelo efeito local do giro
        giroAtivo = window.girosBarbaro.some(function (g) { return g.id === pid && g.ativo && !g.encerrando; });
    }
    if (giroAtivo) {
        // ~2.4 giros/s → 15 rad/s (mesma cadência dos arcos do efeito do GIRO)
        giroSpin = (Date.now() / 1000) * 15.5;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + furyScale, 1 + furyScale);

    const ciclo = window.walkCycle || 0;
    const passo = isMoving ? Math.sin(ciclo) : 0;
    const sobe = isMoving ? Math.abs(passo) * 1.4 : Math.sin(t * 2.1) * 0.5 + 0.5;

    // ---------- sombra ----------
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 12, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---------- aura de fúria + brasas ----------
    if (furyStage > 0) {
        const raioAura = 24 + furyStage * 9 + Math.sin(t * 3.2) * 3;
        ctx.save();
        const gAura = ctx.createRadialGradient(12, 16, 4, 12, 16, raioAura);
        const alphaAura = furyStage === 3 ? 0.4 : furyStage === 2 ? 0.27 : 0.16;
        gAura.addColorStop(0, 'rgba(220,30,30,' + alphaAura + ')');
        gAura.addColorStop(1, 'rgba(220,30,30,0)');
        ctx.fillStyle = gAura;
        ctx.beginPath();
        ctx.arc(12, 16, raioAura, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4 + furyStage * 3; i++) {
            const a = t * 1.7 + i * 1.9;
            const px = 12 + Math.cos(a) * (10 + furyStage * 5);
            const py = 25 - ((t * 20 + i * 31) % 48);
            const br = 0.25 + ((Math.sin(t * 4 + i * 2) + 1) / 2) * 0.3;
            ctx.fillStyle = 'rgba(255,110,50,' + br.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(px, py, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ---------- MACHADO DE GUERRA (atrás do corpo; mãos desenhadas na função) ----------
    desenharGrandeMachado(ctx, angulo || 0, isMoving, ciclo, swingT, t, furyStage, giroSpin);

    // ---------- CORPO ----------
    ctx.save();
    ctx.translate(0, -sobe * 0.8);

    // pernas grossas + faixas de couro + pés
    ctx.fillStyle = cor(BARBARO_COR.peleSombra, '#ff9d8a');
    ctx.fillRect(6, 24 + passo * 2.4, 5, 8 - passo * 0.6);
    ctx.fillRect(13, 24 - passo * 2.4, 5, 8 + passo * 0.6);
    ctx.fillStyle = BARBARO_COR.couroClaro;
    ctx.fillRect(6, 29 + passo * 2.4, 5, 2.4);
    ctx.fillRect(13, 29 - passo * 2.4, 5, 2.4);
    ctx.fillStyle = BARBARO_COR.couro;
    ctx.fillRect(5, 32 + passo * 2.4, 7, 2.2);
    ctx.fillRect(12, 32 - passo * 2.4, 7, 2.2);

    // ---------- tronco massivo ----------
    const gTronco = ctx.createLinearGradient(2, 6, 22, 22);
    gTronco.addColorStop(0, cor(BARBARO_COR.pele, '#ffa38d'));
    gTronco.addColorStop(0.6, cor(BARBARO_COR.pele, '#f78d76'));
    gTronco.addColorStop(1, cor(BARBARO_COR.peleSombra, '#e05f4a'));
    ctx.fillStyle = gTronco;
    ctx.strokeStyle = 'rgba(40,20,10,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(21, 9);
    ctx.lineTo(23, 22);
    ctx.lineTo(1, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // peitoral e abdômen
    ctx.strokeStyle = 'rgba(120,60,35,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3, 13); ctx.lineTo(21, 13);
    ctx.moveTo(7, 13); ctx.quadraticCurveTo(10, 21, 9, 23);
    ctx.moveTo(17, 13); ctx.quadraticCurveTo(14, 21, 15, 23);
    ctx.stroke();

    // pintura tribal de guerra no peito + cicatrizes
    ctx.fillStyle = 'rgba(160,20,20,0.8)';
    ctx.beginPath();
    ctx.moveTo(4, 15); ctx.lineTo(20, 15); ctx.lineTo(12, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,200,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6, 16); ctx.lineTo(11, 17);
    ctx.moveTo(16, 20); ctx.lineTo(19, 18.5);
    ctx.stroke();

    // ---------- cinto de couro + fivela de caveira ----------
    ctx.fillStyle = BARBARO_COR.couro;
    ctx.fillRect(1, 22, 22, 3.4);
    ctx.fillStyle = BARBARO_COR.osso;
    ctx.beginPath();
    ctx.arc(12, 23.5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1016';
    ctx.fillRect(11.2, 22.6, 1.5, 1.2);
    ctx.fillRect(12.6, 22.6, 1.5, 1.2);
    ctx.fillRect(11.7, 24.4, 0.8, 1);
    ctx.fillRect(12.3, 24.4, 0.8, 1);

    // ---------- ombreira de lobo (ombro esquerdo) ----------
    ctx.fillStyle = BARBARO_COR.peloLobo;
    ctx.beginPath();
    ctx.arc(2, 10, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BARBARO_COR.peloLoboEscuro;
    ctx.beginPath();
    ctx.arc(2, 10, 5.4, 0, Math.PI);
    ctx.fill();
    // penduricalhos de ossos/garras
    ctx.fillStyle = BARBARO_COR.osso;
    ctx.beginPath();
    ctx.moveTo(0, 14.5); ctx.lineTo(1.8, 17.5); ctx.lineTo(-0.4, 16.8); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 14.5); ctx.lineTo(5.5, 17.5); ctx.lineTo(3.4, 16.7); ctx.closePath();
    ctx.fill();

    // ---------- colar de pelo no pescoço ----------
    ctx.fillStyle = BARBARO_COR.peloLobo;
    ctx.strokeStyle = BARBARO_COR.peloLoboEscuro;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(3, 10);
    ctx.lineTo(6, 6.8); ctx.lineTo(8, 10);
    ctx.lineTo(11, 6.2); ctx.lineTo(14, 10);
    ctx.lineTo(17, 6.4); ctx.lineTo(20, 10);
    ctx.lineTo(21, 12); ctx.lineTo(3, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ---------- cabeça de guerra ----------
    ctx.fillStyle = cor(BARBARO_COR.pele, '#ff9d8a');
    ctx.strokeStyle = 'rgba(40,20,10,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(18, 1);
    ctx.lineTo(20, 5);
    ctx.quadraticCurveTo(21, 8, 19, 10);
    ctx.lineTo(12, 11);
    ctx.lineTo(5, 10);
    ctx.quadraticCurveTo(3, 8, 4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // cabelo selvagem espetado
    ctx.fillStyle = cor(BARBARO_COR.cabelo, '#8a4a22');
    ctx.beginPath();
    ctx.moveTo(5, 6);
    ctx.lineTo(4, 0); ctx.lineTo(7, 3);
    ctx.lineTo(8, -2); ctx.lineTo(11, 2);
    ctx.lineTo(12, -3); ctx.lineTo(15, 2);
    ctx.lineTo(16, -1); ctx.lineTo(19, 4);
    ctx.lineTo(19, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cor(BARBARO_COR.cabeloClaro, '#a96430');
    ctx.beginPath();
    ctx.moveTo(6, 4); ctx.lineTo(18, 4); ctx.lineTo(16, 1); ctx.lineTo(8, 1);
    ctx.closePath();
    ctx.fill();

    // barba feroz
    ctx.fillStyle = cor(BARBARO_COR.barba, '#5c2a12');
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.quadraticCurveTo(8, 12, 12, 11.4);
    ctx.quadraticCurveTo(16, 12, 18, 8);
    ctx.lineTo(12, 12.8);
    ctx.closePath();
    ctx.fill();

    // olhos vermelhos brilhantes (mais intensos com raiva)
    ctx.save();
    ctx.shadowColor = '#ff2d2d';
    ctx.shadowBlur = 5 + furyStage * 4;
    ctx.fillStyle = furyStage > 0 ? '#ff3b3b' : '#c0392b';
    ctx.fillRect(8.2, 5.2, 2, 1.7);
    ctx.fillRect(13.8, 5.2, 2, 1.7);
    ctx.restore();

    // faixa de guerra na testa
    ctx.fillStyle = BARBARO_COR.sangue;
    ctx.fillRect(6, 4.2, 12, 1.4);

    ctx.restore(); // fim do corpo

    ctx.restore(); // fim do scale/translate

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueBarbaro = function (ws) {
    if (window.estaMorto) return;
    window.registrarMachadadaBarbaro(window.meuId);
    if (typeof window.tocarSomMachado === 'function') window.tocarSomMachado();
    let pX = window.meuX + 12; let pY = window.meuY + 16;
    let tx = pX + Math.cos(window.meuAngulo) * 35; let ty = pY + Math.sin(window.meuAngulo) * 35;
    if (typeof window.criarAnimacaoSangue === 'function') window.criarAnimacaoSangue(tx, ty);
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_barbaro', angulo: window.meuAngulo })); }
};