// ============================================================================
// classes/florim.js — Florin v3.1: "Classe das Rosas"
// Proporções oficiais ajustadas para o padrão do jogo (~32px de altura, centro X+12):
// - Donzela das rosas em escala chibi/proporcional idêntica aos outros personagens
// - Cabeça, tiara e cajado perfeitamente alinhados abaixo do Nickname e barra de HP
// - Cabelos loiro-caramelo longos e ondulados com vento suave
// - Tiara de rosas carmesim e espinhos dourados
// - Vestido elegante de folhas verde-esmeralda pontiagudas com espartilho dourado
// - Trepadeiras douradas nas pernas e calçados com salto de espinho
// - Cajado das Rosas flutuante em escala harmoniosa ao lado do corpo
// ============================================================================
(function(){
'use strict';

function corDano(normal, flash) {
    return (window.danoFlashTimer && window.danoFlashTimer > 0) ? flash : normal;
}

window.florimArmas = window.florimArmas || {};

window.desenharFlorim = function(x, y, isMoving, angulo, hp, maxHp, pid) {
    const ctx = window.ctx || (document.getElementById('gameCanvas') ? document.getElementById('gameCanvas').getContext('2d') : null);
    if (!ctx || hp <= 0) return;

    ctx.save();
    // Centro horizontal padrão do MMORPG: x + 12. Ponto de pivô vertical: y + 18.
    // Chão em y + 32 (local +14), Topo da tiara em y + 2 (local -16).
    // Nickname em y - 42 fica 44px acima da tiara, sem nenhuma sobreposição!
    ctx.translate(x + 12, y + 18);

    const t = performance.now() / 1000;
    const ang = Number.isFinite(angulo) ? angulo : 0;
    const flip = Math.cos(ang) < 0 ? -1 : 1;
    const olhandoCostas = Math.sin(ang) < -0.45;

    // Animações de ciclo
    const walkCycle = window.walkCycle || (t * 7.5);
    const passo = isMoving ? Math.sin(walkCycle) : 0;
    const passoCos = isMoving ? Math.cos(walkCycle) : 0;
    const breath = Math.sin(t * 2.2) * 0.45;
    const floatOsc = Math.sin(t * 2.8) * 1.8;
    const ventoCabelo = Math.sin(t * 3.2) * 1.1 + (isMoving ? -passo * 1.6 : 0);

    // ========================================================================
    // PALETA OFICIAL DA FLORIN
    // ========================================================================
    const cPele = corDano('#fbede6', '#ffffff');
    const cPeleSombra = corDano('#eac8bc', '#ffffff');
    const cPeleBlush = 'rgba(230, 70, 90, 0.32)';

    const cCabeloBase = corDano('#cbb396', '#ffffff');
    const cCabeloLuz = corDano('#ebdcc7', '#ffffff');
    const cCabeloSombra = corDano('#987c5c', '#ffffff');
    const cCabeloProfundo = corDano('#745b40', '#ffffff');

    const cFolhaEscura = corDano('#133924', '#ffffff');
    const cFolhaBase = corDano('#1e5436', '#ffffff');
    const cFolhaClara = corDano('#327c52', '#ffffff');

    const cOuroEscuro = corDano('#8e6d2a', '#ffffff');
    const cOuroBase = corDano('#cfa448', '#ffffff');
    const cOuroLuz = corDano('#f7e082', '#ffffff');

    const cRosaProfunda = corDano('#6b0615', '#ffffff');
    const cRosaBase = corDano('#b81228', '#ffffff');
    const cRosaViva = corDano('#e6223d', '#ffffff');
    const cRosaRealce = corDano('#ff6078', '#ffffff');
    const cRosaCentro = corDano('#ffe072', '#ffffff');

    const cRubiEscuro = corDano('#80001a', '#ffffff');
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

    // -------------------------------------------------------------
    // [CAMADA 1] SOMBRAS NO SOLO (Chão em Y = 14)
    // -------------------------------------------------------------
    ctx.save();
    ctx.fillStyle = 'rgba(10, 18, 12, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 8.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sombra do cajado flutuante
    const armaOffsetBaseX = flip * 14;
    ctx.fillStyle = 'rgba(10, 18, 12, 0.28)';
    ctx.beginPath();
    ctx.ellipse(armaOffsetBaseX, 14, 4.5, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // [CAMADA 2] AURA SUAVE DA CLASSE DAS ROSAS
    // -------------------------------------------------------------
    ctx.save();
    const pulsoAura = Math.sin(t * 3.0) * 0.1 + 0.9;
    const gradAura = ctx.createRadialGradient(0, -6, 2, 0, -6, 20 * pulsoAura);
    gradAura.addColorStop(0, 'rgba(85, 170, 117, 0.16)');
    gradAura.addColorStop(0.6, 'rgba(230, 34, 61, 0.06)');
    gradAura.addColorStop(1, 'rgba(30, 84, 54, 0)');
    ctx.fillStyle = gradAura;
    ctx.beginPath();
    ctx.arc(0, -6, 20 * pulsoAura, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // =============================================================
    // [CAMADA 3] CORPO DA FLORIN (Proporção equilibrada ~30px)
    // =============================================================
    ctx.save();
    ctx.scale(flip, 1);

    // -------------------------------------------------------------
    // 3.1 Cabelo Traseiro Longo Ondulado
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(0, -10 + breath);

    ctx.fillStyle = cCabeloProfundo;
    ctx.beginPath();
    ctx.moveTo(-4.5, -2);
    ctx.bezierCurveTo(-8 + ventoCabelo * 0.5, 4, -8 + ventoCabelo * 0.7, 10, -5 + ventoCabelo * 0.8, 17);
    ctx.bezierCurveTo(-1 + ventoCabelo * 0.6, 18, 3 + ventoCabelo * 0.6, 17, 6 + ventoCabelo * 0.8, 16);
    ctx.bezierCurveTo(8 + ventoCabelo * 0.6, 10, 8 + ventoCabelo * 0.4, 4, 4.5, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cCabeloBase;
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.bezierCurveTo(-7 + ventoCabelo * 0.4, 4, -6 + ventoCabelo * 0.6, 9, -4 + ventoCabelo * 0.7, 15);
    ctx.bezierCurveTo(0 + ventoCabelo * 0.5, 16, 2 + ventoCabelo * 0.5, 15, 5 + ventoCabelo * 0.7, 14);
    ctx.bezierCurveTo(7 + ventoCabelo * 0.5, 9, 6 + ventoCabelo * 0.3, 4, 4, -1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = cCabeloLuz;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.5, 0);
    ctx.bezierCurveTo(-5 + ventoCabelo * 0.3, 5, -4 + ventoCabelo * 0.5, 10, -2.5 + ventoCabelo * 0.6, 13);
    ctx.moveTo(2, 0);
    ctx.bezierCurveTo(4 + ventoCabelo * 0.3, 5, 4 + ventoCabelo * 0.5, 10, 2.5 + ventoCabelo * 0.6, 13);
    ctx.stroke();

    if (olhandoCostas) {
        desenharRosa(-2, 4, 0.55, 0.2);
        desenharRosa(2.5, 5, 0.6, -0.3);
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 3.2 Pernas Delicadas com Trepadeiras e Saltos de Espinho
    // -------------------------------------------------------------
    const pernaChaoY = 13.5;

    // Perna Esquerda (traseira)
    ctx.save();
    ctx.translate(-2.5, 2);
    const pY1 = 11.5 + passo * 2.2;
    ctx.fillStyle = cPeleSombra;
    ctx.beginPath();
    ctx.moveTo(-1.4, 0);
    ctx.lineTo(1.4, 0);
    ctx.lineTo(1.2 + passo, pY1);
    ctx.lineTo(-1.2 + passo, pY1);
    ctx.closePath();
    ctx.fill();

    // Trepadeira dourada
    ctx.strokeStyle = cOuroBase;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.2, 1);
    ctx.quadraticCurveTo(1.4, 4 + passo, -0.8, 7 + passo * 1.5);
    ctx.stroke();

    // Sapato esmeralda com salto de espinho
    ctx.fillStyle = cFolhaEscura;
    ctx.beginPath();
    ctx.moveTo(-1.3 + passo, pY1);
    ctx.lineTo(2.0 + passo, pY1);
    ctx.lineTo(1.5 + passo, pY1 + 2);
    ctx.lineTo(-1.3 + passo, pY1 + 2);
    ctx.closePath();
    ctx.fill();
    // Espinho do salto
    ctx.fillStyle = cOuroLuz;
    ctx.beginPath();
    ctx.moveTo(-1.3 + passo, pY1 + 0.6);
    ctx.lineTo(-3.0 + passo, pY1 + 1.4);
    ctx.lineTo(-1.3 + passo, pY1 + 2);
    ctx.fill();
    ctx.restore();

    // Perna Direita (frontal com fenda do vestido)
    ctx.save();
    ctx.translate(2.2, 2);
    const pY2 = 11.5 - passo * 2.2;
    ctx.fillStyle = cPele;
    ctx.beginPath();
    ctx.moveTo(-1.5, 0);
    ctx.lineTo(1.5, 0);
    ctx.lineTo(1.3 - passo, pY2);
    ctx.lineTo(-1.3 - passo, pY2);
    ctx.closePath();
    ctx.fill();

    // Trepadeira espiralando
    ctx.strokeStyle = cOuroLuz;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.3, 1);
    ctx.quadraticCurveTo(1.6, 3 - passo, -1.0, 6 - passo * 1.5);
    ctx.quadraticCurveTo(1.5, 8 - passo * 1.8, 0, pY2);
    ctx.stroke();

    // Mini botão de rosa na perna
    desenharRosa(0.7, 4 - passo, 0.35, 0.3);

    // Sapato frontal
    ctx.fillStyle = cFolhaBase;
    ctx.beginPath();
    ctx.moveTo(-1.4 - passo, pY2);
    ctx.lineTo(2.4 - passo, pY2);
    ctx.lineTo(2.0 - passo, pY2 + 2);
    ctx.lineTo(-1.4 - passo, pY2 + 2);
    ctx.closePath();
    ctx.fill();
    // Espinho dourado frontal
    ctx.fillStyle = cOuroLuz;
    ctx.beginPath();
    ctx.moveTo(2.4 - passo, pY2);
    ctx.lineTo(4.0 - passo, pY2 + 1.2);
    ctx.lineTo(2.0 - passo, pY2 + 2);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // 3.3 Saia Elegante de Folhas Esmeralda Pontiagudas
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(0, 0 + breath * 0.3);

    // Folhas traseiras
    ctx.fillStyle = cFolhaEscura;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-7.5 - passoCos * 0.8, 5.5);
    ctx.lineTo(-5.5, 4);
    ctx.lineTo(-4 - passoCos * 0.5, 6.5);
    ctx.lineTo(-2, 4);
    ctx.lineTo(0.5, 6.5);
    ctx.lineTo(2.5, 4);
    ctx.lineTo(5.5 + passoCos * 0.8, 5.5);
    ctx.lineTo(4.5, 0);
    ctx.closePath();
    ctx.fill();

    // Folhas frontais
    ctx.fillStyle = cFolhaBase;
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(-6.5, 3.5);
    ctx.lineTo(-4.5, 2.5);
    ctx.lineTo(-2.8, 5.5);
    ctx.lineTo(-1.4, 2.5);
    ctx.lineTo(0, 4.8);
    ctx.lineTo(2, 2.0);
    ctx.lineTo(4.2, 4.0);
    ctx.lineTo(3.8, 0);
    ctx.closePath();
    ctx.fill();

    // Nervuras douradas
    ctx.strokeStyle = cOuroLuz;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2.8, 0); ctx.lineTo(-2.8, 4.5);
    ctx.moveTo(0, 0); ctx.lineTo(0, 4.0);
    ctx.moveTo(2, 0); ctx.lineTo(2.8, 3.2);
    ctx.stroke();

    // Rosas na saia
    desenharRosa(-4.2, 1.8, 0.5, 0.2);
    desenharRosa(3.6, 1.2, 0.55, -0.2);
    ctx.restore();

    // -------------------------------------------------------------
    // 3.4 Torso / Corpete de Folhas e Vinhas Douradas
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(0, -6 + breath);

    // Colo de pele visível no decote
    if (!olhandoCostas) {
        ctx.fillStyle = cPele;
        ctx.beginPath();
        ctx.moveTo(-3.8, -4.5);
        ctx.lineTo(3.8, -4.5);
        ctx.lineTo(2.2, 0);
        ctx.lineTo(-2.2, 0);
        ctx.closePath();
        ctx.fill();
    }

    // Corpete vegetal
    ctx.fillStyle = cFolhaBase;
    ctx.beginPath();
    ctx.moveTo(-4.0, 2);
    ctx.bezierCurveTo(-5.0, -1.5, -4.5, -4.5, -3.8, -6);
    ctx.bezierCurveTo(-1.2, -6.8, 1.2, -6.8, 3.8, -6);
    ctx.bezierCurveTo(4.5, -4.5, 5.0, -1.5, 4.0, 2);
    ctx.closePath();
    ctx.fill();

    // Sombra do corpete
    ctx.fillStyle = cFolhaEscura;
    ctx.beginPath();
    ctx.moveTo(-4.0, 2);
    ctx.lineTo(-1.5, 2);
    ctx.lineTo(-3.0, -4.5);
    ctx.lineTo(-3.8, -6);
    ctx.closePath();
    ctx.fill();

    // Espartilho de vinhas douradas
    ctx.strokeStyle = cOuroLuz;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3.5, -4); ctx.lineTo(2.2, 0.5);
    ctx.moveTo(3.5, -4); ctx.lineTo(-2.2, 0.5);
    ctx.moveTo(-2.8, -1); ctx.lineTo(2.8, -1);
    ctx.stroke();

    // Espinhos dourados saindo da cintura
    ctx.fillStyle = cOuroLuz;
    ctx.beginPath();
    ctx.moveTo(-4.0, -1.5); ctx.lineTo(-6.0, -2.2); ctx.lineTo(-4.3, -0.8); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.0, -1.5); ctx.lineTo(6.0, -2.2); ctx.lineTo(4.3, -0.8); ctx.fill();

    // Rosas no decote
    if (!olhandoCostas) {
        desenharRosa(-2.2, -4.0, 0.55, -0.2);
        desenharRosa(2.5, -3.6, 0.6, 0.2);
        desenharRosa(0, 0.8, 0.48, 0.0);
    } else {
        desenharRosa(0, -2.5, 0.55, 0.0);
    }
    ctx.restore(); // Restaura Torso

    // -------------------------------------------------------------
    // 3.5 Braço Esquerdo (traseiro)
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(-4.2, -10.5 + breath);
    ctx.rotate(-0.12 + Math.sin(t * 2.2) * 0.08);

    ctx.strokeStyle = cPeleSombra;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-2.8, 4.5, -1.5, 8.5);
    ctx.stroke();

    // Manguito de folha e rosa
    ctx.fillStyle = cFolhaBase;
    ctx.beginPath();
    ctx.moveTo(-2.8, 5); ctx.lineTo(-0.8, 4.2); ctx.lineTo(-1.5, 7.8); ctx.lineTo(-3.5, 7.8); ctx.fill();
    desenharRosa(-2.2, 6.5, 0.4, -0.2);

    ctx.fillStyle = cPeleSombra;
    ctx.beginPath();
    ctx.arc(-1.5, 9.2, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // 3.6 Braço Direito (frontal)
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(4.2, -10.5 + breath);
    ctx.rotate(0.14 + Math.cos(t * 2.2) * 0.09);

    ctx.strokeStyle = cPele;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(2.2, 4.0, 1.5, 8.5);
    ctx.stroke();

    // Manguito com espinho e rosa
    ctx.fillStyle = cFolhaClara;
    ctx.beginPath();
    ctx.moveTo(0.8, 4.5); ctx.lineTo(3.0, 5.2); ctx.lineTo(2.2, 8.0); ctx.lineTo(0.0, 7.2); ctx.fill();
    ctx.strokeStyle = cOuroLuz;
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, 6.5); ctx.lineTo(3.5, 6.0); ctx.stroke();
    desenharRosa(1.5, 6.8, 0.42, 0.3);

    ctx.fillStyle = cPele;
    ctx.beginPath();
    ctx.arc(1.5, 9.2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // 3.7 Cabeça, Rosto Belo, Cabelos e Tiara de Rosas
    // Centro da cabeça em Y = -11.5, Topo da tiara em Y = -16.5
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(0, -11.5 + breath);

    // Formato oval gracioso do rosto
    ctx.fillStyle = cPele;
    ctx.beginPath();
    ctx.moveTo(-3.8, -3.8);
    ctx.bezierCurveTo(-5.0, -0.8, -4.2, 3.0, 0, 4.4);
    ctx.bezierCurveTo(4.2, 3.0, 5.0, -0.8, 3.8, -3.8);
    ctx.bezierCurveTo(3.0, -6.0, -3.0, -6.0, -3.8, -3.8);
    ctx.closePath();
    ctx.fill();

    // Detalhes faciais refinados
    if (!olhandoCostas) {
        // Blush rosado
        ctx.fillStyle = cPeleBlush;
        ctx.beginPath();
        ctx.arc(-2.4, 0.3, 1.5, 0, Math.PI * 2);
        ctx.arc(2.4, 0.3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        const olhOffX = 0.3;
        // Olho esquerdo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(-2.1 + olhOffX, -0.8, 1.3, 0.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8b2035';
        ctx.beginPath(); ctx.arc(-2.0 + olhOffX, -0.8, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-2.2 + olhOffX, -1.0, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a1e16'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(-3.0 + olhOffX, -1.4); ctx.lineTo(-1.2 + olhOffX, -1.3); ctx.stroke();

        // Olho direito
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(1.9 + olhOffX, -0.8, 1.3, 0.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8b2035';
        ctx.beginPath(); ctx.arc(2.0 + olhOffX, -0.8, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(1.8 + olhOffX, -1.0, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a1e16'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(1.1 + olhOffX, -1.3); ctx.lineTo(2.9 + olhOffX, -1.4); ctx.stroke();

        // Narizinho delicado
        ctx.fillStyle = cPeleSombra;
        ctx.beginPath(); ctx.arc(0.1, 0.8, 0.4, 0, Math.PI * 2); ctx.fill();

        // Lábios rosados
        ctx.fillStyle = '#d43b56';
        ctx.beginPath();
        ctx.ellipse(0.1, 2.3, 1.0, 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f58296';
        ctx.beginPath();
        ctx.ellipse(0.1, 2.1, 0.55, 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Franja e cabelos frontais ondulados
    ctx.fillStyle = cCabeloBase;
    ctx.beginPath();
    ctx.moveTo(-4.5, -3.8);
    ctx.quadraticCurveTo(-3.0, -0.8, -1.8, -3.0);
    ctx.quadraticCurveTo(1.5, -0.8, 4.5, -3.8);
    ctx.quadraticCurveTo(0.8, -6.8, -3.0, -6.0);
    ctx.closePath();
    ctx.fill();

    // Mecha frontal caindo sobre o ombro
    ctx.fillStyle = cCabeloLuz;
    ctx.beginPath();
    ctx.moveTo(3.0, -3.0);
    ctx.quadraticCurveTo(4.5 + ventoCabelo * 0.4, 2, 3.8 + ventoCabelo * 0.6, 7.5);
    ctx.quadraticCurveTo(2.2 + ventoCabelo * 0.4, 4, 1.5, -0.8);
    ctx.closePath();
    ctx.fill();

    // -------------------------------------------------------------
    // Tiara / Arranjo de Rosas Carmesim e Espinhos Dourados
    // -------------------------------------------------------------
    // Arco dourado
    ctx.strokeStyle = cOuroLuz;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, -4.5, 5.6, Math.PI + 0.3, -0.3);
    ctx.stroke();

    // Espinhos dourados saindo da tiara
    ctx.fillStyle = cOuroLuz;
    ctx.beginPath();
    ctx.moveTo(-3.8, -6.8); ctx.lineTo(-6.0, -9.8); ctx.lineTo(-3.0, -7.5); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2.4, -6.8); ctx.lineTo(4.6, -9.8); ctx.lineTo(3.2, -7.5); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.8, -8.2); ctx.lineTo(0.0, -11.2); ctx.lineTo(0.8, -8.2); ctx.fill();

    // Três rosas na tiara
    desenharRosa(-3.0, -5.8, 0.62, -0.25);
    desenharRosa(0.3, -7.2, 0.78, 0.15);
    desenharRosa(3.4, -5.4, 0.60, 0.3);

    ctx.restore(); // Restaura Cabeça

    ctx.restore(); // Restaura flip do corpo

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