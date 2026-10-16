// ============================================================================
// classes/florim.js — Sprites da Florin e cajado das Rosas do corpo
// ============================================================================
(function(){
'use strict';

function corDano(normal, flash) {
    return (window.danoFlashTimer && window.danoFlashTimer > 0) ? flash : normal;
}

window.florimArmas = window.florimArmas || {};
const FLORIM_BASE_SPRITES = new URL('../sprites/classes/florin/', document.currentScript.src);
const FLORIM_DIRECOES_ANDANDO = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const FLORIM_DIRECOES_PARADO = ['east', 'south', 'west', 'north'];
const florimGruposSprites = Object.create(null);
const florimDirecoesJogadores = Object.create(null);
const florimPosicoesJogadores = Object.create(null);
const florimUltimosFrames = Object.create(null);

function florimCarregarGrupo(andando, direcao) {
    const animacao = andando ? 'walking' : 'idle_breathing';
    const chave = animacao + ':' + direcao;
    if (florimGruposSprites[chave]) return florimGruposSprites[chave];

    const pasta = andando ? 'Andando/animations/walking/' : 'parado/animations/idle_breathing/';
    const grupo = { imagens: [], carregadas: 0 };
    florimGruposSprites[chave] = grupo;
    for (let i = 0; i < 8; i++) {
        const imagem = new Image();
        imagem.onload = function () { grupo.carregadas++; };
        imagem.onerror = function () {
            console.error('Falha ao carregar frame da Florin:', imagem.src);
        };
        imagem.src = new URL(pasta + direcao + '/frame_' + String(i).padStart(3, '0') + '.png', FLORIM_BASE_SPRITES).href;
        grupo.imagens.push(imagem);
    }
    return grupo;
}

function florimObterDirecaoSprite(angulo, andando, idJogador) {
    const direcoes = andando ? FLORIM_DIRECOES_ANDANDO : FLORIM_DIRECOES_PARADO;
    const passoSetor = Math.PI * 2 / direcoes.length;
    const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
    const anterior = florimDirecoesJogadores[idJogador];
    let setor = ((Math.round(anguloSeguro / passoSetor) % direcoes.length) + direcoes.length) % direcoes.length;
    if (anterior && anterior.andando === andando) {
        const centroAnterior = anterior.setor * passoSetor;
        const diferenca = Math.atan2(
            Math.sin(anguloSeguro - centroAnterior),
            Math.cos(anguloSeguro - centroAnterior)
        );
        if (Math.abs(diferenca) < passoSetor / 2 + Math.PI / 45) setor = anterior.setor;
    }
    florimDirecoesJogadores[idJogador] = { andando: andando, setor: setor };
    return direcoes[setor];
}

function florimObterFrameDisponivel(grupo, indice) {
    const atual = grupo.imagens[indice];
    if (atual && atual.complete && atual.naturalWidth > 0) return atual;
    for (let distancia = 1; distancia < grupo.imagens.length; distancia++) {
        const anterior = grupo.imagens[(indice - distancia + grupo.imagens.length) % grupo.imagens.length];
        const seguinte = grupo.imagens[(indice + distancia) % grupo.imagens.length];
        if (anterior && anterior.complete && anterior.naturalWidth > 0) return anterior;
        if (seguinte && seguinte.complete && seguinte.naturalWidth > 0) return seguinte;
    }
    return null;
}

function florimAlinharNaGrade(ctx, x, y) {
    if (typeof ctx.getTransform !== 'function') return { x: x, y: y };
    const transformacao = ctx.getTransform();
    const determinante = transformacao.a * transformacao.d - transformacao.b * transformacao.c;
    if (!Number.isFinite(determinante) || Math.abs(determinante) < 0.000001) return { x: x, y: y };
    const telaX = transformacao.a * x + transformacao.c * y + transformacao.e;
    const telaY = transformacao.b * x + transformacao.d * y + transformacao.f;
    const deltaX = Math.round(telaX) - telaX;
    const deltaY = Math.round(telaY) - telaY;
    return {
        x: x + (transformacao.d * deltaX - transformacao.c * deltaY) / determinante,
        y: y + (-transformacao.b * deltaX + transformacao.a * deltaY) / determinante
    };
}

FLORIM_DIRECOES_PARADO.forEach(function (direcao) { florimCarregarGrupo(false, direcao); });
FLORIM_DIRECOES_ANDANDO.forEach(function (direcao) { florimCarregarGrupo(true, direcao); });

window.desenharFlorim = function(x, y, isMoving, angulo, hp, maxHp, pid, anguloMovimento) {
    const ctx = window.ctx || (document.getElementById('gameCanvas') ? document.getElementById('gameCanvas').getContext('2d') : null);
    if (!ctx || hp <= 0) return;

    const idJogador = pid || '__local__';
    const posicaoAnterior = florimPosicoesJogadores[idJogador];
    let anguloCorpo = Number.isFinite(angulo) ? angulo : 0;
    if (isMoving && Number.isFinite(anguloMovimento)) {
        anguloCorpo = anguloMovimento;
    } else if (isMoving && posicaoAnterior) {
        const dx = x - posicaoAnterior.x;
        const dy = y - posicaoAnterior.y;
        if (Math.hypot(dx, dy) > 0.5) anguloCorpo = Math.atan2(dy, dx);
    }
    florimPosicoesJogadores[idJogador] = { x: x, y: y };

    ctx.save();
    // Centro horizontal padrão do MMORPG: x + 12. Ponto de pivô vertical: y + 18.
    // Chão em y + 32 (local +14), Topo da tiara em y + 2 (local -16).
    // Nickname em y - 42 fica 44px acima da tiara, sem nenhuma sobreposição!
    const posicaoRender = florimAlinharNaGrade(ctx, x, y);
    ctx.translate(posicaoRender.x + 12, posicaoRender.y + 18);

    const t = performance.now() / 1000;
    const ang = Number.isFinite(angulo) ? angulo : 0;
    const flip = Math.cos(ang) < 0 ? -1 : 1;

    const walkCycle = window.walkCycle || (t * 7.5);
    const passo = isMoving ? Math.sin(walkCycle) : 0;
    const floatOsc = Math.sin(t * 2.8) * 1.8;

    const cFolhaEscura = corDano('#133924', '#ffffff');
    const cFolhaBase = corDano('#1e5436', '#ffffff');
    const cFolhaClara = corDano('#327c52', '#ffffff');

    const cOuroEscuro = corDano('#8e6d2a', '#ffffff');
    const cOuroLuz = corDano('#f7e082', '#ffffff');

    const cRosaProfunda = corDano('#6b0615', '#ffffff');
    const cRosaBase = corDano('#b81228', '#ffffff');
    const cRosaViva = corDano('#e6223d', '#ffffff');
    const cRosaCentro = corDano('#ffe072', '#ffffff');

    const cRubiBase = corDano('#df1537', '#ffffff');
    const cRubiLuz = corDano('#ff6b84', '#ffffff');
    const cMadeiraBase = corDano('#38251b', '#ffffff');
    const cMadeiraLuz = corDano('#5e3e2c', '#ffffff');

    // =============================================================
    // HELPER: Desenha Rosa Carmesim Detalhada
    // =============================================================
    function desenharRosa(rx, ry, escala, rotacao) {
        ctx.save();
        ctx.translate(rx, ry);
        if (rotacao) ctx.rotate(rotacao);
        ctx.scale(escala, escala);

        // Sépalas verdes
        ctx.fillStyle = cFolhaEscura;
        for (let s = 0; s < 4; s++) {
            const angS = s * (Math.PI / 2) + 0.38;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angS) * 3.0, Math.sin(angS) * 3.0);
            ctx.lineTo(Math.cos(angS + 0.35) * 2.0, Math.sin(angS + 0.35) * 2.0);
            ctx.closePath();
            ctx.fill();
        }

        // Camada 1: Pétalas externas escuras
        ctx.fillStyle = cRosaProfunda;
        for (let i = 0; i < 5; i++) {
            const angP = i * 1.256;
            ctx.beginPath();
            ctx.ellipse(Math.cos(angP) * 2.2, Math.sin(angP) * 2.2, 2.4, 1.6, angP, 0, Math.PI * 2);
            ctx.fill();
        }

        // Camada 2: Pétalas médias vivas
        ctx.fillStyle = cRosaBase;
        for (let i = 0; i < 5; i++) {
            const angP = i * 1.256 + 0.62;
            ctx.beginPath();
            ctx.ellipse(Math.cos(angP) * 1.5, Math.sin(angP) * 1.5, 1.8, 1.3, angP, 0, Math.PI * 2);
            ctx.fill();
        }

        // Camada 3: Pétalas internas luminosas
        ctx.fillStyle = cRosaViva;
        for (let i = 0; i < 4; i++) {
            const angP = i * 1.57 + 0.3;
            ctx.beginPath();
            ctx.ellipse(Math.cos(angP) * 0.8, Math.sin(angP) * 0.8, 1.2, 0.9, angP, 0, Math.PI * 2);
            ctx.fill();
        }

        // Miolo
        ctx.fillStyle = cRosaCentro;
        ctx.beginPath();
        ctx.arc(0.2, -0.2, 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    const direcao = florimObterDirecaoSprite(anguloCorpo, Boolean(isMoving), idJogador);
    const grupoSprite = florimCarregarGrupo(Boolean(isMoving), direcao);
    const indiceSprite = Math.floor(Date.now() / (isMoving ? 110 : 160)) % grupoSprite.imagens.length;
    let imagemSprite = florimObterFrameDisponivel(grupoSprite, indiceSprite);
    if (imagemSprite) florimUltimosFrames[idJogador] = imagemSprite;
    else imagemSprite = florimUltimosFrames[idJogador];

    if (imagemSprite && imagemSprite.complete && imagemSprite.naturalWidth > 0) {
        const suavizacaoAnterior = ctx.imageSmoothingEnabled;
        const qualidadeSuavizacaoAnterior = ctx.imageSmoothingQuality;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        try {
            ctx.drawImage(imagemSprite, -48, -65, imagemSprite.naturalWidth, imagemSprite.naturalHeight);
        } finally {
            ctx.imageSmoothingEnabled = suavizacaoAnterior;
            ctx.imageSmoothingQuality = qualidadeSuavizacaoAnterior;
        }
    }

    // =============================================================
    // [CAMADA 4] O CAJADO DAS ROSAS FLUTUANTE (Staff das Rosas)
    // Proporção harmoniosa: ~26px de comprimento, flutuando ao lado
    // =============================================================
    ctx.save();
    const armaX = flip * 14;
    const armaY = -2 + floatOsc;
    ctx.translate(armaX, armaY);

    const angArma = Math.sin(t * 1.6) * 0.05 + (ang * 0.12);
    ctx.rotate(angArma);

    // 4.1 Haste do Cajado
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = cMadeiraBase;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.8, 15);
    ctx.bezierCurveTo(-1.5, 6, 2.0, -3, 0, -14);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = cMadeiraLuz;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-1.0, 5, 1.2, -2, 0, -13);
    ctx.stroke();

    // 4.2 Trepadeira Verde e Espinhos Dourados na Haste
    ctx.strokeStyle = cFolhaClara;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-0.8, 13); ctx.quadraticCurveTo(2.8, 9, -0.8, 6);
    ctx.quadraticCurveTo(2.8, 3, -0.8, 0);
    ctx.quadraticCurveTo(2.8, -3, 0, -6);
    ctx.quadraticCurveTo(2.0, -10, 0, -13);
    ctx.stroke();

    // Espinhos dourados
    ctx.fillStyle = cOuroLuz;
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(2.8, 8); ctx.lineTo(0.8, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-2.8, 0.5); ctx.lineTo(-0.8, 2.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(2.8, -6); ctx.lineTo(0.8, -4); ctx.fill();

    // Mini rosas na haste
    desenharRosa(0, 4.5, 0.40, 0.2);
    desenharRosa(0, -4.5, 0.44, -0.3);

    // 4.3 Ponta Inferior do Cajado (Cristal de Rubi)
    ctx.fillStyle = cOuroLuz;
    ctx.beginPath();
    ctx.moveTo(-2.0, 14); ctx.lineTo(2.0, 14); ctx.lineTo(0, 17); ctx.fill();

    ctx.fillStyle = cRubiBase;
    ctx.beginPath();
    ctx.moveTo(-1.6, 16);
    ctx.lineTo(1.6, 16);
    ctx.lineTo(0, 21);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cRubiLuz;
    ctx.beginPath();
    ctx.moveTo(-0.7, 16); ctx.lineTo(0.7, 16); ctx.lineTo(0, 19.5); ctx.fill();

    // 4.4 Topo do Cajado: Aura, Folhas, Coroa Solar e Rosa Central
    ctx.save();
    ctx.translate(0, -15);

    const pulsoTopo = Math.sin(t * 3.6) * 0.12 + 0.88;
    const gTopo = ctx.createRadialGradient(0, 0, 1, 0, 0, 14 * pulsoTopo);
    gTopo.addColorStop(0, 'rgba(85, 220, 130, 0.32)');
    gTopo.addColorStop(0.6, 'rgba(230, 34, 61, 0.15)');
    gTopo.addColorStop(1, 'rgba(30, 84, 54, 0)');
    ctx.fillStyle = gTopo;
    ctx.beginPath(); ctx.arc(0, 0, 14 * pulsoTopo, 0, Math.PI * 2); ctx.fill();

    // Folhas verdes em leque na base da coroa
    ctx.fillStyle = cFolhaBase;
    for (let f = 0; f < 5; f++) {
        const angF = (f - 2) * 0.45 + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angF - 0.2) * 6, Math.sin(angF - 0.2) * 6);
        ctx.lineTo(Math.cos(angF) * 8.5, Math.sin(angF) * 8.5);
        ctx.lineTo(Math.cos(angF + 0.2) * 6, Math.sin(angF + 0.2) * 6);
        ctx.closePath();
        ctx.fill();
    }

    // Coroa Solar de Espinhos Dourados Radiantes (8 pontas afiadas)
    ctx.fillStyle = cOuroLuz;
    ctx.strokeStyle = cOuroEscuro;
    ctx.lineWidth = 0.6;
    for (let e = 0; e < 8; e++) {
        const angE = e * (Math.PI / 4) + Math.sin(t * 0.8) * 0.05;
        const raioInt = 5.8;
        const raioExt = 11.0 + (e % 2 === 0 ? 2.5 : 0);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angE - 0.18) * raioInt, Math.sin(angE - 0.18) * raioInt);
        ctx.lineTo(Math.cos(angE) * raioExt, Math.sin(angE) * raioExt);
        ctx.lineTo(Math.cos(angE + 0.18) * raioInt, Math.sin(angE + 0.18) * raioInt);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Grande Rosa Central Carmesim do Cajado
    desenharRosa(0, 0, 1.15, Math.sin(t * 1.2) * 0.08);

    // 4.5 Três Pingentes de Rubi em Gota Suspensos por Correntes Douradas
    const pendulo = Math.sin(t * 2.5) * 0.18 + (isMoving ? passo * 0.22 : 0);
    const pingentes = [
        { x: -6, y: 4.8, len: 7.0, esc: 0.75 },
        { x: 0,  y: 6.2, len: 9.0, esc: 0.95 },
        { x: 6,  y: 4.8, len: 7.0, esc: 0.75 }
    ];

    for (let p = 0; p < pingentes.length; p++) {
        const ping = pingentes[p];
        ctx.save();
        ctx.translate(ping.x, ping.y);
        ctx.rotate(pendulo * (p === 1 ? 1.0 : 1.25));

        // Corrente dourada
        ctx.strokeStyle = cOuroLuz;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, ping.len * 0.45);
        ctx.stroke();

        // Gota de rubi
        const cryY = ping.len * 0.45;
        const rW = 2.2 * ping.esc;
        const rH = 5.2 * ping.esc;

        ctx.fillStyle = cOuroLuz;
        ctx.beginPath();
        ctx.arc(0, cryY, 1.3 * ping.esc, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cRubiBase;
        ctx.beginPath();
        ctx.moveTo(0, cryY);
        ctx.lineTo(-rW, cryY + rH * 0.4);
        ctx.lineTo(0, cryY + rH);
        ctx.lineTo(rW, cryY + rH * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = cRubiLuz;
        ctx.beginPath();
        ctx.moveTo(0, cryY);
        ctx.lineTo(-rW * 0.4, cryY + rH * 0.4);
        ctx.lineTo(0, cryY + rH * 0.85);
        ctx.lineTo(rW * 0.4, cryY + rH * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // 4.6 Pétalas cintilantes orbitando o cajado
    ctx.fillStyle = cRosaViva;
    for (let pt = 0; pt < 4; pt++) {
        const angPt = t * 1.5 + pt * 1.57;
        const rPt = 10 + Math.sin(t * 2 + pt) * 3;
        const px = Math.cos(angPt) * rPt;
        const py = Math.sin(angPt) * rPt * 0.7;
        const alphaPt = 0.35 + Math.sin(t * 3 + pt) * 0.3;

        ctx.globalAlpha = Math.max(0.1, alphaPt);
        ctx.beginPath();
        ctx.ellipse(px, py, 1.8, 1.1, angPt + 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.restore(); // Fim topo cajado
    ctx.restore(); // Fim cajado flutuante

    ctx.restore(); // Fim translate principal (x + 12, y + 18)

    // Barra de HP autoritativa no sistema padrão do jogo
    if (typeof window.desenharBarraHp === 'function') {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// ========================================================================
// DISPARO DE ATAQUE BÁSICO DA FLORIN
// ========================================================================
window.enviarAtaqueFlorim = function(anguloForcado, alvoTipo, alvoId) {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
    
    let msg = { action: 'ataque_florim' };
    
    if (anguloForcado !== undefined && anguloForcado !== null) {
        msg.angulo = anguloForcado;
    } else {
        if (Number.isFinite(window.mouseAngulo)) {
            msg.angulo = window.mouseAngulo;
        } else if (Number.isFinite(window.meuAngulo)) {
            msg.angulo = window.meuAngulo;
        } else {
            msg.angulo = 0;
        }
    }
    
    if (alvoTipo && alvoId) {
        msg.alvoTipo = alvoTipo;
        msg.alvoId = alvoId;
    }
    
    window.ws.send(JSON.stringify(msg));
};

})();