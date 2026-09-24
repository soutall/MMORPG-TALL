/* ============================================================
   PIKEMAN — Guerreiro de Foice da Morte (classe jogável)
   Desenho 100% procedural (Canvas), seguindo o padrão das
   demais classes do jogo. Nada de spritesheets.
   ============================================================ */

(function () {
    // Estado de animação por jogador (pid -> { estado, inicio, dur, ... })
    window.pikemanAnims = window.pikemanAnims || {};

    // Estado do próprio jogador (execução carregando / giro / etc.)
    window.pikemanEstadoLocal = window.pikemanEstadoLocal || {
        execucaoAtiva: false,   // canalização da Execução da Morte
        execucaoInicio: 0,
        execucaoDur: 3000,
        giroAtivo: false,
        piruetaAtiva: false
    };

    function _agora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

    // Registra/atualiza uma animação de outro jogador (multiplayer) ou de si mesmo
    window.registrarPikemanAnim = function (pid, estado, dur, dados) {
        if (!pid) return;
        let base = { estado: estado, inicio: _agora(), dur: dur || 500 };
        if (dados) Object.assign(base, dados);
        window.pikemanAnims[pid] = base;
        if (pid === window.meuId) {
            if (estado === 'giro') window.pikemanEstadoLocal.giroAtivo = true;
            if (estado === 'pirueta') window.pikemanEstadoLocal.piruetaAtiva = true;
            if (estado === 'execucao') {
                window.pikemanEstadoLocal.execucaoAtiva = true;
                window.pikemanEstadoLocal.execucaoInicio = base.inicio;
                window.pikemanEstadoLocal.execucaoDur = dur || 3000;
            }
            if (estado === 'execucao_fim') window.pikemanEstadoLocal.execucaoAtiva = false;
            if (estado === 'idle') {
                window.pikemanEstadoLocal.giroAtivo = false;
                window.pikemanEstadoLocal.piruetaAtiva = false;
                // FIX: fim da Execução (action_pikeman_execucao_end) registra 'idle' —
                // sem essa linha o cabeçalho execucaoAtiva ficava true para sempre,
                // bloqueando TODAS as skills e o ataque básico do Pikeman.
                window.pikemanEstadoLocal.execucaoAtiva = false;
            }
        }
    };

    // Progresso da animação (0..1) e se expirou
    function _prog(anim) {
        if (!anim) return { p: 0, ok: false };
        let p = Math.max(0, Math.min(1, (_agora() - anim.inicio) / anim.dur));
        return { p: p, ok: true };
    }

    /* ---------- utilitários de desenho ---------- */
    function _sombra(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 1.5, 17, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grade de curvas metálicas (brilhos) do RPG clássico — REMOVIDA no corpo novo

    function roundRectPath(ctx, x, y, w, h, r) {
        r = Math.min(r === undefined ? 3 : r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    /* ============ A FOICE DA MORTE (2 mãos) ============
       Desenhada no espaço local do personagem, rotacionada em `rot`
       (0 rad = haste diagonal subindo para a direita).
       `carga` 0..1 => brilho da energia sombria na lâmina. */
    function _foice(ctx, rot, carga, foiceCurta, x, y) {
        let tam = foiceCurta ? 0.62 : 1;
        ctx.translate(0, 0);
        ctx.rotate(rot);
            let wp = window.inventario ? window.inventario.arma : null;
    let armaV = null;
    if (x === window.meuX && y === window.meuY) { 
        if (wp && wp.customVisual) armaV = wp;
    }
    if (typeof window.desenharFoiceExposta === 'function') window.desenharFoiceExposta(ctx, armaV, tam, carga);

        ctx.rotate(-rot);
        ctx.translate(0, 0);
    }

    /* ============ FOICE CURTA (1 mão) — reuso da _foice com escala ============ */
    function _foiceCurta(ctx, rot, carga, x, y) {
        _foice(ctx, rot, carga, true, x, y);
    }

    // Cabo sobressalente decorativo nas costas quando usa a foice curta
    function _foiceNascostas(ctx, x, y) {
        ctx.save();
        _foice(ctx, -0.9, 0, false, x, y);
        ctx.restore();
    }

    /* ============ CORPO (ASSASSINO DE TOCA AZUL — ágil, leve e orgânico) ============ */
    // Pernas leves e longas, prontas para movimentos rápidos (passo 0..1 andando)
    function _pernas(ctx, passo, correndo) {
        let amp = correndo ? 1.1 : 0.72;
        let f1 = Math.sin(passo * Math.PI * 2) * amp;   // perna da frente
        let f2 = Math.sin(passo * Math.PI * 2 + Math.PI) * amp;
        // sombra leve sob o quadril
        ctx.fillStyle = 'rgba(5,8,18,0.6)';
        ctx.beginPath();
        ctx.ellipse(0, -9.5, 7.6, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // coxas finas e compridas (tecido azul-escuro)
        ctx.strokeStyle = 'rgba(19,28,56,1)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2.8, -11);
        ctx.lineTo(3 + f1 * 5, -6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3.4, -11);
        ctx.lineTo(-3.4 + f2 * 5, -6);
        ctx.stroke();
        // fio de luz na coxa (definição muscular)
        ctx.strokeStyle = 'rgba(48,68,120,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, -10.4);
        ctx.lineTo(2.2 + f1 * 5, -6.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-2.6, -10.4);
        ctx.lineTo(-2.6 + f2 * 5, -6.2);
        ctx.stroke();
        // canelas leves e longas
        ctx.strokeStyle = 'rgba(24,35,70,1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(3 + f1 * 5, -6);
        ctx.lineTo(3.4 + f1 * 8, -0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3.4 + f2 * 5, -6);
        ctx.lineTo(-3.6 + f2 * 8, -0.4);
        ctx.stroke();
        // faixa azul amarrada na canela (tecido leve)
        ctx.strokeStyle = 'rgba(58,104,182,0.95)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(2.4 + f1 * 6.3, -3.6);
        ctx.lineTo(4.6 + f1 * 6.3, -3.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4.6 + f2 * 6.3, -3.6);
        ctx.lineTo(-2.4 + f2 * 6.3, -3.6);
        ctx.stroke();
        // botas ágeis — finas, ponta leve, preto-azulado com fivela prata
        ctx.fillStyle = 'rgba(12,16,32,1)';
        ctx.strokeStyle = 'rgba(152,172,202,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-0.4 + f1 * 8, -2);
        ctx.lineTo(5 + f1 * 8, -2);
        ctx.lineTo(7 + f1 * 8, -0.7);
        ctx.lineTo(5.2 + f1 * 8, 1.3);
        ctx.lineTo(-0.6 + f1 * 8, 1.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6 + f2 * 8, -2);
        ctx.lineTo(-1.2 + f2 * 8, -2);
        ctx.lineTo(1 + f2 * 8, -0.7);
        ctx.lineTo(-0.6 + f2 * 8, 1.3);
        ctx.lineTo(-6.2 + f2 * 8, 1.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    /* Tronco: torso magro e atlético — manto leve, sem armadura, com faixa e decote V */
    function _tronco(ctx, inclinacao) {
        ctx.save();
        ctx.translate(0, inclinacao);
        // barra do manto curto — bainha irregular (recortes de tecido, nada de quadrado)
        ctx.fillStyle = 'rgba(23,32,66,0.98)';
        ctx.beginPath();
        ctx.moveTo(-7.2, -11);
        ctx.quadraticCurveTo(0, -10.2, 7.2, -11);
        ctx.lineTo(6.4, -3);
        ctx.quadraticCurveTo(3.6, -4.2, 1.8, -2.6);
        ctx.lineTo(0, -3.4);
        ctx.quadraticCurveTo(-2, -4.4, -4, -2.8);
        ctx.lineTo(-6.6, -3.2);
        ctx.closePath();
        ctx.fill();
        // sombra da barra (tecido dobrado)
        ctx.fillStyle = 'rgba(8,11,24,0.85)';
        ctx.beginPath();
        ctx.moveTo(-6.8, -3);
        ctx.quadraticCurveTo(0, -4.8, 6.8, -3);
        ctx.lineTo(6.6, -1.1);
        ctx.lineTo(-6.6, -1.1);
        ctx.closePath();
        ctx.fill();
        // pregas verticais irregulares
        ctx.strokeStyle = 'rgba(40,56,104,0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3.4, -10.6); ctx.quadraticCurveTo(-3, -6, -3.2, -3.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -10.4); ctx.quadraticCurveTo(0.2, -6, -0.4, -3.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3.4, -10.6); ctx.quadraticCurveTo(3.2, -6, 3.6, -3.4); ctx.stroke();
        // peitoral leve — trapezoide orgânico com gradiente (sem metal)
        let gradL = ctx.createLinearGradient(-6, -25, 6, -12);
        gradL.addColorStop(0, 'rgba(42,58,108,0.98)');
        gradL.addColorStop(0.45, 'rgba(26,37,74,0.98)');
        gradL.addColorStop(1, 'rgba(15,22,46,0.98)');
        ctx.fillStyle = gradL;
        ctx.beginPath();
        ctx.moveTo(-5.6, -25);
        ctx.quadraticCurveTo(0, -27.2, 5.6, -25);
        ctx.lineTo(7, -13);
        ctx.quadraticCurveTo(3.4, -11.4, 0, -13);
        ctx.quadraticCurveTo(-3.4, -11.4, -7, -13);
        ctx.closePath();
        ctx.fill();
        // recorte de sombra lateral (cintura definida)
        ctx.fillStyle = 'rgba(10,14,30,0.85)';
        ctx.beginPath();
        ctx.moveTo(3.2, -15.4);
        ctx.quadraticCurveTo(6, -14, 6.8, -13.4);
        ctx.lineTo(4.6, -12.4);
        ctx.quadraticCurveTo(3, -12.8, 3.2, -15.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3.4, -15.2);
        ctx.quadraticCurveTo(-6, -14, -6.8, -13.4);
        ctx.lineTo(-4.6, -12.4);
        ctx.quadraticCurveTo(-3.2, -12.8, -3.4, -15.2);
        ctx.closePath();
        ctx.fill();
        // faixa diagonal (obi) azul atravessando o peito — tecido leve
        ctx.fillStyle = 'rgba(34,56,108,0.95)';
        ctx.beginPath();
        ctx.moveTo(-5.6, -22.8);
        ctx.lineTo(-2.2, -22.8);
        ctx.lineTo(6.6, -13.6);
        ctx.lineTo(4.4, -12.2);
        ctx.lineTo(-5.6, -20.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(122,152,218,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // ponta solta da faixa (recorte em V)
        ctx.fillStyle = 'rgba(26,44,90,0.97)';
        ctx.beginPath();
        ctx.moveTo(4.4, -12.2);
        ctx.lineTo(6.2, -11.4);
        ctx.lineTo(6.6, -13.6);
        ctx.closePath();
        ctx.fill();
        // fivela prata discreta no ombro da faixa
        ctx.fillStyle = 'rgba(196,210,232,0.95)';
        ctx.beginPath(); ctx.arc(-4.1, -21.6, 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(122,138,168,0.9)';
        ctx.beginPath(); ctx.arc(-4.1, -21.6, 0.5, 0, Math.PI * 2); ctx.fill();
        // gola baixa do manto (decote V sob o capuz)
        ctx.fillStyle = 'rgba(10,14,30,0.92)';
        ctx.beginPath();
        ctx.moveTo(-3.4, -25.8);
        ctx.lineTo(0, -21.8);
        ctx.lineTo(3.4, -25.8);
        ctx.quadraticCurveTo(0, -27.2, -3.4, -25.8);
        ctx.closePath();
        ctx.fill();
        // borda prata discreta no decote
        ctx.strokeStyle = 'rgba(152,170,208,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3.2, -25.6);
        ctx.quadraticCurveTo(0, -21.6, 3.2, -25.6);
        ctx.stroke();
        // pequenos pontos prata (detalhes discretos na barra do peito)
        ctx.fillStyle = 'rgba(160,176,208,0.85)';
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.arc(i * 3.4, -12.2, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /* Cabeça: CAPUZ azul-escuro orgânico + MÁSCARA azul (olhos discretos) */
    function _cabeca(ctx, olhosCor, bocaAberta) {
        // pescoço enfaixado (tecido escuro, leve)
        ctx.fillStyle = 'rgba(12,16,32,1)';
        ctx.beginPath();
        ctx.moveTo(-2.2, -31.4);
        ctx.lineTo(2.2, -31.4);
        ctx.lineTo(2.6, -28.2);
        ctx.lineTo(-2.6, -28.2);
        ctx.closePath();
        ctx.fill();
        // mantilha do capuz sobre os ombros (tecido atrás)
        ctx.fillStyle = 'rgba(20,28,58,0.98)';
        ctx.beginPath();
        ctx.moveTo(-8.6, -30);
        ctx.quadraticCurveTo(-9, -36.4, -4.6, -33.4);
        ctx.lineTo(-4.2, -28.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8.6, -30);
        ctx.quadraticCurveTo(9, -36.4, 4.6, -33.4);
        ctx.lineTo(4.2, -28.4);
        ctx.closePath();
        ctx.fill();
        // CAPUZ — grande e orgânico, com gradiente e dobras
        let gradH = ctx.createLinearGradient(0, -48, 0, -32);
        gradH.addColorStop(0, 'rgba(40,56,104,0.98)');
        gradH.addColorStop(0.6, 'rgba(24,34,70,0.98)');
        gradH.addColorStop(1, 'rgba(16,23,48,0.98)');
        ctx.fillStyle = gradH;
        ctx.beginPath();
        ctx.moveTo(-7.8, -33.2);
        ctx.quadraticCurveTo(-9.8, -41, -5, -45.6);
        ctx.quadraticCurveTo(-1, -48.4, 3.4, -45.8);
        ctx.quadraticCurveTo(8.4, -41.8, 7.6, -33.4);
        ctx.quadraticCurveTo(3.8, -36.6, 0, -36.8);
        ctx.quadraticCurveTo(-3.8, -36.6, -7.8, -33.2);
        ctx.closePath();
        ctx.fill();
        // ponta do capuz esvoaçante (para trás)
        ctx.fillStyle = 'rgba(18,26,56,1)';
        ctx.beginPath();
        ctx.moveTo(0.6, -45.2);
        ctx.quadraticCurveTo(5.5, -51.2, 3.2, -54.2);
        ctx.quadraticCurveTo(-0.6, -51.6, -1.4, -45.4);
        ctx.closePath();
        ctx.fill();
        // dobras do tecido no capuz (recortes escuros orgânicos)
        ctx.strokeStyle = 'rgba(10,14,30,0.85)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-5, -43.8); ctx.quadraticCurveTo(-3.6, -40.6, -3.4, -36.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4.6, -43.6); ctx.quadraticCurveTo(3.4, -40.8, 2.8, -36.8); ctx.stroke();
        // rosto sombrio dentro do capuz (fundo escuro atrás da máscara)
        ctx.fillStyle = 'rgba(7,10,22,0.96)';
        ctx.beginPath();
        ctx.moveTo(-5.6, -34.8);
        ctx.quadraticCurveTo(0, -38.8, 5.6, -34.8);
        ctx.lineTo(5, -30.2);
        ctx.quadraticCurveTo(0, -31.4, -5, -30.2);
        ctx.closePath();
        ctx.fill();
        // OLHOS — frestas discretas, brilho contido azul-ciano
        ctx.fillStyle = olhosCor || 'rgba(130,205,255,1)';
        ctx.shadowColor = 'rgba(70,160,255,0.7)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(-4.5, -34.1);
        ctx.lineTo(-1.1, -34.1);
        ctx.lineTo(-1, -33.6);
        ctx.lineTo(-4.3, -33.6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1.1, -34.1);
        ctx.lineTo(4.5, -34.1);
        ctx.lineTo(4.3, -33.6);
        ctx.lineTo(1, -33.6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // MÁSCARA azul — cobre nariz e boca, deixa só os olhos visíveis
        ctx.fillStyle = 'rgba(36,56,110,0.98)';
        ctx.beginPath();
        ctx.moveTo(-5.6, -33.9);
        ctx.quadraticCurveTo(-5.4, -30.2, -2.6, -29.8);
        ctx.quadraticCurveTo(0, -29.2, 2.6, -29.8);
        ctx.quadraticCurveTo(5.4, -30.2, 5.6, -33.9);
        ctx.quadraticCurveTo(2.2, -33.2, 0, -33.4);
        ctx.quadraticCurveTo(-2.2, -33.2, -5.6, -33.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,175,225,0.6)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        // tiras laterais da máscara (presas à toca)
        ctx.strokeStyle = 'rgba(26,40,84,0.95)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-5.4, -32.6); ctx.lineTo(-3.6, -28.8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5.4, -32.6); ctx.lineTo(3.6, -28.8); ctx.stroke();
        // respiradouros da máscara (linhas finas azuis)
        ctx.strokeStyle = 'rgba(120,168,255,0.7)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-2.4, -31.3); ctx.lineTo(-0.9, -31.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.9, -31.3); ctx.lineTo(2.4, -31.3); ctx.stroke();
        // brilho da boca quando grita (vaza por baixo do tecido)
        if (bocaAberta) {
            ctx.fillStyle = 'rgba(150,215,255,0.9)';
            ctx.shadowColor = 'rgba(70,160,255,0.9)';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(-1.2, -30.8);
            ctx.quadraticCurveTo(0, -30.1, 1.2, -30.8);
            ctx.quadraticCurveTo(0, -31.3, -1.2, -30.8);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    /* Braço fino e definido + pulso prateado + mão sombria (agilidade) */
    function _braco(ctx, rotBiceps, rotAntebraco) {
        let ex = 12 + Math.sin(rotBiceps) * 8;
        let ey = -18 + Math.cos(rotBiceps) * 4;
        let hx = ex + Math.sin(rotBiceps + rotAntebraco) * 10;
        let hy = ey + Math.cos(rotBiceps + rotAntebraco) * 3;
        // manga fina do manto (azul-escuro)
        ctx.strokeStyle = 'rgba(22,31,62,1)';
        ctx.lineWidth = 3.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(7.4, -24);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // brilho fino na parte externa (definição do braço)
        ctx.strokeStyle = 'rgba(48,66,118,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8.4, -24);
        ctx.lineTo(ex + 0.4, ey);
        ctx.stroke();
        // antebraço enfaixado (mais fino)
        ctx.strokeStyle = 'rgba(28,40,78,1)';
        ctx.lineWidth = 3.1;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        // faixa prateada no pulso
        ctx.fillStyle = 'rgba(196,210,232,0.95)';
        ctx.beginPath();
        ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(122,138,168,0.9)';
        ctx.beginPath();
        ctx.arc(hx, hy, 0.7, 0, Math.PI * 2);
        ctx.fill();
        // mão pequena e sombria
        ctx.fillStyle = 'rgba(8,11,22,0.95)';
        ctx.beginPath();
        ctx.arc(hx + Math.sin(rotBiceps + rotAntebraco) * 2.6, hy + Math.cos(rotBiceps + rotAntebraco) * 1.1, 1.7, 0, Math.PI * 2);
        ctx.fill();
    }

    /* ombreiras REMOVIDAS (pedido do usuário: corpo enxuto de foiceiro assassino) */

    /* Manto/costas — cauda longa + faixas de tecido azul esvoaçando */
    function _capa(ctx, vento, inclinacao) {
        ctx.save();
        let w = vento * 2.4;
        // cauda principal do manto (atrás) — longa e envolvente
        ctx.fillStyle = 'rgba(16,23,50,0.95)';
        ctx.beginPath();
        ctx.moveTo(-5.6, -26 + inclinacao);
        ctx.quadraticCurveTo(-13, -14 + inclinacao + w, -11.8, -2 + inclinacao + w * 2.6);
        ctx.quadraticCurveTo(-8.6, -8 + inclinacao + w, -6.6, -5 + inclinacao);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(88,124,200,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // faixa azul 1 — acompanhando o movimento
        ctx.fillStyle = 'rgba(40,66,128,0.95)';
        ctx.beginPath();
        ctx.moveTo(-4.4, -25 + inclinacao);
        ctx.quadraticCurveTo(-10, -15 + inclinacao + w, -8.2, -4 + inclinacao + w * 2.1);
        ctx.lineTo(-6, -4.4 + inclinacao + w * 1.7);
        ctx.quadraticCurveTo(-7.6, -14 + inclinacao + w, -3.6, -24 + inclinacao);
        ctx.closePath();
        ctx.fill();
        // faixa azul 2 — mais curta, ondulada para o outro lado
        ctx.fillStyle = 'rgba(28,44,92,0.95)';
        ctx.beginPath();
        ctx.moveTo(3.2, -24 + inclinacao);
        ctx.quadraticCurveTo(7.6, -16 + inclinacao - w * 0.7, 5.8, -7 + inclinacao - w);
        ctx.quadraticCurveTo(4, -11 + inclinacao - w * 0.4, 2.4, -23 + inclinacao);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Fiapos de sombra subindo ao redor das pernas (partículas discretas)
    function _fiaposSombra(ctx, tempo) {
        for (let i = 0; i < 2; i++) {
            let t = ((tempo / 1000) + i * 0.5) % 1;
            let s = (i === 0) ? 1 : -1;
            let x = s * (7 + t * 8) + Math.sin(tempo / 210 + i * 2.4) * 2.4;
            let y = -2 - t * 10;
            let r = 3.6 * (1 - t);
            ctx.fillStyle = 'rgba(20,26,52,' + (0.22 * (1 - t)) + ')';
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * 0.6, t * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* barra de vida acima da cabeça (sutil) */
    function _hpBar(ctx, hpVal, maxHpVal) {
        if (!maxHpVal) return;
        let razao = Math.max(0, Math.min(1, (hpVal || 0) / maxHpVal));
        if (razao >= 1) return;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(-11, -58, 22, 4);
        ctx.fillStyle = razao > 0.3 ? 'rgba(90,200,120,0.95)' : 'rgba(230,60,60,0.95)';
        ctx.fillRect(-10, -57, 20 * razao, 2);
        ctx.restore();
    }

    /* ============================================================
       DESENHADOR PRINCIPAL
       assinatura igual às outras classes + extras {eu, pp} + pid
       ============================================================ */
    window.desenharPikeman = function (posX, posY, mov, ang, hpVal, maxHpVal, extras, pid) {
        let ctx = window.ctx;
        if (!ctx) return;
        let eu = !!(extras && extras.eu);
        let pp = (extras && extras.pp) || null;
        let meuId = pid || (eu ? window.meuId : (pp ? pp.id : null));

        let anim = (meuId && window.pikemanAnims[meuId]) || null;
        let prog = _prog(anim);
        if (anim && prog.p >= 1 && (anim.estado === 'foice' || anim.estado === 'pirueta' && anim.hit >= 3 || anim.estado === 'geada')) {
            // animação rápida terminou → volta ao estado neutro
            window.registrarPikemanAnim(meuId, 'idle', 1);
            anim = window.pikemanAnims[meuId];
            prog = _prog(anim);
        }

        // estado efetivo
        let estado = anim ? anim.estado : 'idle';
        let p = prog.p;

        // progresso da execução (outro jogador) para barra de carga
        let chanProg = 0;
        if (pp && pp.pikemanProgresso && pp.pikemanProgresso < 1) chanProg = Math.max(0, Math.min(1, pp.pikemanProgresso));
        if (eu && window.pikemanEstadoLocal.execucaoAtiva) {
            chanProg = Math.max(0, Math.min(1, (_agora() - window.pikemanEstadoLocal.execucaoInicio) / window.pikemanEstadoLocal.execucaoDur));
        }

        // silhueta invisível (câmera/ladino invisível compartilhado)
        let invisivel = window.personagemInvisivelAtual;
        if (invisivel) ctx.globalAlpha = 0.45;

        ctx.save();
        ctx.translate(posX + 12, posY + 12);
        _sombra(ctx);

        // espelha conforme a direção do alvo + escala uniforme (−20% de altura: 0.9 → 0.72)
        let flip = (Math.sin(ang) < 0) ? -1 : 1;
        let escPikeman = 0.72;
        ctx.scale(flip * escPikeman, escPikeman);

        // parâmetros de movimento (o jogo não diferencia walk/run: sempre animação enérgica e agressiva)
        let correndo = !!mov;
        let passo = (mov) ? (_agora() / 300) : 0;
        let inclinacao = 0;   // deslocamento do tronco para frente em corrida
        if (estado === 'idle') inclinacao = Math.sin(_agora() / 1400) * 0.6; // respiração
        if ((estado === 'andando' || estado === 'idle') && mov) inclinacao = 1.4;

        // postura do tronco por estado
        let troncoIncl = 0;
        if (estado === 'execucao') troncoIncl = -1.5;
        if (estado === 'geada') troncoIncl = -1;
        if (estado === 'giro') troncoIncl = 0;

        _capa(ctx, Math.sin(_agora() / 500) * 1.5 + 1, inclinacao);

        // pernas
        _pernas(ctx, passo, correndo);

        // tronco (+ offset da corrida)
        ctx.save();
        ctx.translate(0, troncoIncl - 2);
        _tronco(ctx, inclinacao + troncoIncl);

        // braço de trás (segura a haste na base)
        _braco(ctx, -0.5, 2.6);

        // braço da frente + foice conforme o estado
        if (estado === 'giro') {
            // gira a foice inteira ao redor do corpo
            let rot = -p * Math.PI * 2 + (anim.alvoAng || 0);
            ctx.save();
            ctx.translate(-2, -22);
            _foice(ctx, rot, 0.45, false, posX, posY);
            ctx.restore();
            _braco(ctx, rot, 3.4);
        } else if (estado === 'pirueta') {
            // 3 cortes rápidos com a foice curta; corpo gira levemente a cada hit
            let hit = anim.hit || 1;
            let faseLocal = (p * 3 - (hit - 1));
            let rot = (anim.dir || 1) * (0.4 + faseLocal * 2.6);
            ctx.save();
            ctx.translate(4, -21);
            _foiceCurta(ctx, rot, 0.5, posX, posY);
            ctx.restore();
            _braco(ctx, 0.9 + Math.sin(p * Math.PI * 3) * 1.2, 3.0);
        } else if (estado === 'geada') {
            // finca a foice no chão (punho perto da terra, lâmina para cima)
            ctx.save();
            ctx.translate(6, 2);
            _foice(ctx, -1.25, 0.7, false, posX, posY);
            ctx.restore();
            _braco(ctx, -1.3, 2.2);
        } else if (estado === 'execucao') {
            if (chanProg > 0 && chanProg < 0.995) {
                // carregando: haste erguida, tremendo, energia acumulando
                let tremor = Math.sin(_agora() / 30) * (0.02 + chanProg * 0.05);
                ctx.save();
                ctx.translate(0, -20);
                ctx.rotate(-0.5 + tremor);
                _foice(ctx, -0.9 + Math.sin(_agora() / 120) * 0.04, chanProg, false, posX, posY);
                ctx.restore();
                _braco(ctx, -1.6, 0.8);
            } else {
                // hits pesados (1,2,3)
                let hit = anim.hit || 1;
                let faseHit = (p * 3 - (hit - 1));
                let rot = -1.9 + faseHit * 3.4;
                ctx.save();
                ctx.translate(-4, -20);
                _foice(ctx, rot, 1, false, posX, posY);
                ctx.restore();
                _braco(ctx, -2.0, 2.0);
            }
        } else if (estado === 'foice' || estado === 'andando') {
            // ataque básico: dois cortes alternados
            if (estado === 'foice') {
                let rot = -0.5 + p * 2.6;
                ctx.save();
                ctx.translate(4, -21);
                _foiceCurta(ctx, rot, 0.35, posX, posY);
                ctx.restore();
                _braco(ctx, -0.5 + p * 1.4, 3.2);
            } else {
                // marchando com a foice apoiada no ombro
                ctx.save();
                ctx.translate(-2, -23);
                _foice(ctx, 0.35 + Math.sin(passo * Math.PI * 2) * 0.06, 0, false, posX, posY);
                ctx.restore();
                _braco(ctx, 0.2, 2.6);
            }
        } else {
            // idle: foice de duas mãos apoiada à frente
            ctx.save();
            ctx.translate(-2, -23);
            _foice(ctx, 0.32 + Math.sin(_agora() / 1400) * 0.02, 0.06 + Math.sin(_agora() / 1000) * 0.08, false, posX, posY);
            ctx.restore();
            _braco(ctx, 0.2, 2.6);
        }

        // (ombreiras removidas — corpo enxuto de foiceiro)

        // cabeça
        let olhos = (estado === 'execucao' && chanProg < 0.995) ? 'rgba(170,225,255,1)' : 'rgba(110,190,255,1)';
        let boca = (estado === 'giro' || estado === 'execucao') ? true : false;
        if (estado === 'execucao' || estado === 'geada') ctx.translate(0, -1.2);
        _cabeca(ctx, olhos, boca);

        // partículas de sombra ao redor das pernas (silhueta ameaçadora)
        _fiaposSombra(ctx, _agora());

        ctx.restore(); // fim da translação do corpo
        ctx.restore(); // fim do flip

        // barra de vida acima da cabeça
        ctx.save();
        ctx.translate(posX + 12, posY + 16);
        _hpBar(ctx, hpVal, maxHpVal);

        // ★ BARRA DE CARREGAMENTO DA EXECUÇÃO (0% → 100%) acima do personagem ★
        if (chanProg > 0 && chanProg < 0.995) {
            let larg = 54;
            let x = -larg / 2;
            let y = -60;
            ctx.fillStyle = 'rgba(0,0,0,0.82)';
            roundRectPath(ctx, x, y, larg, 8, 3);
            ctx.fill();
            let grad = ctx.createLinearGradient(x, 0, x + larg, 0);
            grad.addColorStop(0, '#7b1e2b');
            grad.addColorStop(1, '#ff3b4e');
            ctx.fillStyle = grad;
            roundRectPath(ctx, x + 1, y + 1, (larg - 2) * chanProg, 6, 2);
            ctx.fill();
            // faixas de energia
            if (chanProg > 0.6) {
                ctx.fillStyle = 'rgba(255,120,140,' + (0.5 + Math.sin(_agora() / 60) * 0.5) + ')';
                ctx.font = "bold 8px 'Rajdhani', Arial, sans-serif";
                ctx.textAlign = 'center';
                ctx.fillText('⚡ ' + Math.round(chanProg * 100) + '%', 0, y - 3);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1;
            roundRectPath(ctx, x, y, larg, 8, 3);
            ctx.stroke();
        }
        ctx.restore();

        if (invisivel) ctx.globalAlpha = 1;
    };

    // EXPOR utilitários para uso externo (efeitos/VFX)
    window.pikemanUtils = {
        foice: _foice,
        foiceCurta: _foiceCurta,
        prog: _prog,
        agora: _agora
    };
})();
window.desenharFoiceExposta = function(ctx, armaVisualCustom, tam, carga) {
    tam = tam || 1;
    let cv = (armaVisualCustom && armaVisualCustom.customVisual) ? armaVisualCustom.customVisual : {};
    let t = cv.tamanho || 1;
    let l = cv.largura || 1;

    let cBase = cv.cBase || 'rgba(35,22,12,0.95)';
    let cMeio = cv.cMeio || 'rgba(20,18,26,0.98)';
    let cPonta = cv.cPonta || 'rgba(200,30,60,1)';
    let cFio = cv.cFio || 'rgba(225,225,235,0.95)';

    ctx.save();
    ctx.scale(t, l);

    function _agora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

    // haste longa (madeira escura com metal)
        ctx.beginPath();
        ctx.moveTo(-20 * tam, 10 * tam);
        ctx.lineTo(30 * tam, -16 * tam);
        ctx.lineTo(31 * tam, -13 * tam);
        ctx.lineTo(-18 * tam, 13 * tam);
        ctx.closePath();
        ctx.fillStyle = cBase;
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,120,70,0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // faixa de metal na haste
        ctx.strokeStyle = 'rgba(200,200,210,0.85)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(2 * tam, -4 * tam);
        ctx.lineTo(12 * tam, -9 * tam);
        ctx.stroke();
        // anel inferior (punho)
        ctx.beginPath();
        ctx.arc(-15 * tam, 8 * tam, 3.4 * tam, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(45,45,55,0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,40,50,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // ★ A LÂMINA — crescente enorme, curva, escura com fio prateado ★
        ctx.save();
        // junção (respiroso "miolo" da foice)
        ctx.beginPath();
        ctx.arc(28 * tam, -15 * tam, 4.5 * tam, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60,60,75,1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(210,210,220,0.9)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // gema vermelho-roxo na junção
        let brilhoGema = 0.55 + (carga || 0) * 0.45 + Math.sin(_agora() / 180) * 0.12;
        ctx.beginPath();
        ctx.arc(28 * tam, -15 * tam, 2.1 * tam, 0, Math.PI * 2);
        ctx.save();
        ctx.globalAlpha = Math.min(1, brilhoGema);
        ctx.fillStyle = cPonta;
        ctx.fill();
        ctx.restore();
        ctx.shadowColor = cPonta;
        ctx.shadowBlur = 6 + 10 * (carga || 0);
        ctx.beginPath();
        ctx.arc(28 * tam, -15 * tam, 1.1 * tam, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,220,230,0.95)';
        ctx.fill();

        // corpo da lâmina: grande arco de foice
        ctx.fillStyle = cMeio;
        ctx.beginPath();
        ctx.arc(34 * tam, -34 * tam, 26 * tam, -1.05, 0.55);
        ctx.lineTo(50 * tam, -14 * tam);
        ctx.quadraticCurveTo(40 * tam, -6 * tam, 30 * tam, -8 * tam);
        ctx.closePath();
        ctx.fill();
        // fio cortante (borda externa)
        ctx.strokeStyle = cFio;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(34 * tam, -34 * tam, 26 * tam, -1.0, 0.5);
        ctx.stroke();
        // fio interno escuro
        ctx.strokeStyle = 'rgba(120,40,60,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(34 * tam, -34 * tam, 24.6 * tam, -0.9, 0.85);
        ctx.stroke();
        // runas sombrias na lâmina (brilham com a carga)
        ctx.save();
        ctx.globalAlpha = Math.min(0.95, 0.25 + (carga || 0) * 0.7);
        ctx.strokeStyle = cPonta;
        ctx.lineWidth = 1.1;
        ctx.shadowColor = cPonta;
        ctx.shadowBlur = 5 + 9 * (carga || 0);
        for (let i = 0; i < 4; i++) {
            let a = -0.85 + i * 0.34;
            ctx.beginPath();
            ctx.arc(34 * tam, -34 * tam, 22.6 * tam, a, a + 0.18);
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();

    ctx.restore();
};
