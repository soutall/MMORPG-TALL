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
        piruetaAtiva: false,
        geadaAtiva: false
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
            if (estado === 'geada') window.pikemanEstadoLocal.geadaAtiva = true;
            if (estado === 'execucao') {
                window.pikemanEstadoLocal.execucaoAtiva = true;
                window.pikemanEstadoLocal.execucaoInicio = base.inicio;
                window.pikemanEstadoLocal.execucaoDur = dur || 3000;
            }
            if (estado === 'execucao_fim') window.pikemanEstadoLocal.execucaoAtiva = false;
            if (estado === 'idle') {
                window.pikemanEstadoLocal.giroAtivo = false;
                window.pikemanEstadoLocal.piruetaAtiva = false;
                window.pikemanEstadoLocal.geadaAtiva = false;
                // FIX: fim da Execução (action_pikeman_execucao_end) registra 'idle' —
                // sem essa linha o cabeçalho execucaoAtiva ficava true para sempre,
                // bloqueando TODAS as skills e o ataque básico do Pikeman.
                window.pikemanEstadoLocal.execucaoAtiva = false;
            }
        }
    };

    // Helper global: indica se o Pikeman está executando animações de skills ativas
    window.pikemanEmAnimacaoSkill = function (pid) {
        let id = pid || window.meuId;
        if (!id) return false;
        let agora = _agora();
        let anim = window.pikemanAnims && window.pikemanAnims[id];
        if (anim && (anim.estado === 'giro' || anim.estado === 'pirueta' || anim.estado === 'geada' || anim.estado === 'execucao')) {
            let decorrido = agora - (anim.inicio || 0);
            if (decorrido >= 0 && decorrido < (anim.dur || 0)) {
                return true;
            } else {
                if (id === window.meuId && window.pikemanEstadoLocal) {
                    if (anim.estado === 'giro') window.pikemanEstadoLocal.giroAtivo = false;
                    if (anim.estado === 'pirueta') window.pikemanEstadoLocal.piruetaAtiva = false;
                    if (anim.estado === 'geada') window.pikemanEstadoLocal.geadaAtiva = false;
                    if (anim.estado === 'execucao') window.pikemanEstadoLocal.execucaoAtiva = false;
                }
            }
        }
        if (Array.isArray(window.girosPikeman) && window.girosPikeman.some(g => g.id === id && (agora - g.inicio) < g.dur)) return true;
        if (Array.isArray(window.piruetasPikeman) && window.piruetasPikeman.some(p => p.id === id && (agora - p.inicio) < p.dur)) return true;
        if (Array.isArray(window.geadasPikeman) && window.geadasPikeman.some(gd => gd.id === id && (agora - gd.inicio) < gd.dur)) return true;
        if (Array.isArray(window.execucoesPikeman) && window.execucoesPikeman.some(e => e.id === id && (agora - e.inicio) < e.dur)) return true;

        if (id === window.meuId && window.pikemanEstadoLocal) {
            if (window.pikemanEstadoLocal.execucaoAtiva) {
                let decorrido = agora - (window.pikemanEstadoLocal.execucaoInicio || 0);
                if (decorrido >= 0 && decorrido < (window.pikemanEstadoLocal.execucaoDur || 3000)) return true;
                window.pikemanEstadoLocal.execucaoAtiva = false;
            }
            if (window.pikemanEstadoLocal.giroAtivo || window.pikemanEstadoLocal.piruetaAtiva || window.pikemanEstadoLocal.geadaAtiva) {
                return true;
            }
        }
        return false;
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
    function _pernasLegacy(ctx, passo, correndo) {
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
    function _troncoLegacy(ctx, inclinacao) {
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
    function _cabecaLegacy(ctx, olhosCor, bocaAberta) {
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
    function _bracoLegacy(ctx, rotBiceps, rotAntebraco) {
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
    function _capaLegacy(ctx, vento, inclinacao) {
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

    function _placa(ctx, pontos, cor, borda) {
        ctx.beginPath();
        ctx.moveTo(pontos[0][0], pontos[0][1]);
        for (let i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i][0], pontos[i][1]);
        ctx.closePath();
        ctx.fillStyle = cor;
        ctx.strokeStyle = borda || 'rgba(158,146,151,0.85)';
        ctx.lineWidth = 0.9;
        ctx.fill();
        ctx.stroke();
    }

    function _pernas(ctx, passo, correndo) {
        const balanco = Math.sin(passo * Math.PI * 2) * (correndo ? 1.1 : 0.65);
        const retorno = Math.sin(passo * Math.PI * 2 + Math.PI) * (correndo ? 1.1 : 0.65);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#171820';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(-2.5, -13); ctx.lineTo(-3.2 + retorno * 3, -7); ctx.lineTo(-4 + retorno * 5, -1);
        ctx.moveTo(2.5, -13); ctx.lineTo(3.2 + balanco * 3, -7); ctx.lineTo(4 + balanco * 5, -1);
        ctx.stroke();
        ctx.strokeStyle = '#625a61';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-3.2 + retorno * 3, -7); ctx.lineTo(-4 + retorno * 5, -1);
        ctx.moveTo(3.2 + balanco * 3, -7); ctx.lineTo(4 + balanco * 5, -1);
        ctx.stroke();
        for (const side of [-1, 1]) {
            const movement = side < 0 ? retorno : balanco;
            ctx.save();
            ctx.translate(side * 3 + movement * 3, -9);
            _placa(ctx, [[-2.5, -3], [1.8, -3.5], [3, 1], [0, 3], [-2.8, 1]], '#29272f', '#8b8086');
            ctx.strokeStyle = '#a92b42';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-1.5, -2); ctx.lineTo(1.4, 1.5); ctx.stroke();
            ctx.translate(0, 8 + movement * 2);
            ctx.fillStyle = '#101118';
            ctx.strokeStyle = '#a69a9b';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-2.5, -2); ctx.lineTo(2.5, -2); ctx.lineTo(4.5, 0);
            ctx.lineTo(3.5, 2); ctx.lineTo(-3, 2); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#a9233b';
            ctx.fillRect(-2, -2, 4, 0.8);
            ctx.restore();
        }
    }

    function _tronco(ctx, inclinacao) {
        ctx.save();
        ctx.translate(0, inclinacao);

        // Cape silhouette, split into torn panels over the armored torso.
        ctx.fillStyle = '#11131c';
        ctx.beginPath();
        ctx.moveTo(-6, -27); ctx.lineTo(6, -27);
        ctx.quadraticCurveTo(10, -16, 7, -5);
        ctx.lineTo(2, -9); ctx.lineTo(0, -3); ctx.lineTo(-3, -9);
        ctx.lineTo(-8, -4); ctx.quadraticCurveTo(-11, -18, -6, -27);
        ctx.closePath(); ctx.fill();

        const metal = ctx.createLinearGradient(-7, -28, 7, -12);
        metal.addColorStop(0, '#554c52');
        metal.addColorStop(0.42, '#302d35');
        metal.addColorStop(1, '#171820');
        _placa(ctx, [[-7, -27], [-3, -29], [0, -26], [3, -29], [7, -27], [8, -17], [5, -12], [0, -14], [-5, -12], [-8, -17]], metal);
        _placa(ctx, [[-7, -25], [-3, -26], [-1, -20], [-5, -18], [-8, -20]], '#3b363e');
        _placa(ctx, [[7, -25], [3, -26], [1, -20], [5, -18], [8, -20]], '#302d35');
        _placa(ctx, [[-5, -18], [0, -20], [5, -18], [4, -14], [0, -12], [-4, -14]], '#1b1a22', '#81767c');

        // Red inlays, rivets and a skull-shaped belt clasp.
        ctx.strokeStyle = '#c02e47';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-4, -25); ctx.lineTo(-1, -22); ctx.lineTo(0, -18);
        ctx.lineTo(2, -22); ctx.lineTo(5, -25);
        ctx.stroke();
        ctx.fillStyle = '#d4c5b6';
        for (const [x, y] of [[-6, -23], [-4, -17], [6, -23], [4, -17]]) {
            ctx.beginPath(); ctx.arc(x, y, 0.65, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#211c22';
        ctx.fillRect(-6.5, -13, 13, 2.5);
        ctx.strokeStyle = '#b39b76';
        ctx.lineWidth = 0.9;
        ctx.strokeRect(-1.8, -13.3, 3.6, 3.1);
        ctx.fillStyle = '#d0c1ac';
        ctx.beginPath();
        ctx.arc(0, -12.4, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#251c23';
        ctx.beginPath(); ctx.arc(-0.45, -12.6, 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0.45, -12.6, 0.25, 0, Math.PI * 2); ctx.fill();

        _placa(ctx, [[-7, -27], [-11, -27], [-13, -24], [-10, -23], [-7, -24]], '#28252c');
        _placa(ctx, [[7, -27], [11, -27], [13, -24], [10, -23], [7, -24]], '#28252c');
        ctx.strokeStyle = '#b52a41';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-12, -25); ctx.lineTo(-9, -25); ctx.moveTo(9, -25); ctx.lineTo(12, -25); ctx.stroke();
        ctx.restore();
    }

    function _cabeca(ctx, olhosCor) {
        ctx.fillStyle = '#14151d';
        ctx.strokeStyle = '#716c73';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-4, -33); ctx.lineTo(4, -33);
        ctx.lineTo(5, -26); ctx.lineTo(0, -23);
        ctx.lineTo(-5, -26); ctx.closePath();
        ctx.fill(); ctx.stroke();

        const hood = ctx.createLinearGradient(-7, -53, 7, -31);
        hood.addColorStop(0, '#373843');
        hood.addColorStop(0.48, '#20212b');
        hood.addColorStop(1, '#11131a');
        ctx.fillStyle = hood;
        ctx.strokeStyle = '#827b80';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-7, -32); ctx.lineTo(-9, -40); ctx.lineTo(-6, -48);
        ctx.lineTo(0, -53); ctx.lineTo(6, -48); ctx.lineTo(9, -40);
        ctx.lineTo(7, -32); ctx.lineTo(4, -35); ctx.lineTo(0, -34);
        ctx.lineTo(-4, -35); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(8,9,14,0.95)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -45); ctx.quadraticCurveTo(-3, -41, -4, -35);
        ctx.moveTo(6, -45); ctx.quadraticCurveTo(3, -41, 4, -35);
        ctx.stroke();

        // Deep hood, engraved executioner mask and red eye slits.
        ctx.fillStyle = '#080a10';
        ctx.beginPath();
        ctx.moveTo(-5.5, -38); ctx.lineTo(5.5, -38); ctx.lineTo(4.5, -32);
        ctx.lineTo(0, -29); ctx.lineTo(-4.5, -32); ctx.closePath(); ctx.fill();
        _placa(ctx, [[-5.5, -37], [0, -39], [5.5, -37], [4.5, -33], [0, -31], [-4.5, -33]], '#403941');
        ctx.fillStyle = olhosCor || '#f23b52';
        ctx.shadowColor = '#e52343';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(-4.3, -36); ctx.lineTo(-1, -36.5); ctx.lineTo(-1.4, -35.4); ctx.lineTo(-4, -35.3); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4.3, -36); ctx.lineTo(1, -36.5); ctx.lineTo(1.4, -35.4); ctx.lineTo(4, -35.3); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#b9ada9';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(0, -34); ctx.lineTo(0, -31.5);
        ctx.moveTo(-2, -33.5); ctx.lineTo(-1, -32);
        ctx.moveTo(2, -33.5); ctx.lineTo(1, -32);
        ctx.stroke();
        ctx.fillStyle = '#d1c0ac';
        ctx.beginPath(); ctx.arc(0, -43, 2.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#282127';
        ctx.beginPath(); ctx.arc(-0.8, -43.2, 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0.8, -43.2, 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-0.35, -42.2, 0.7, 1);
    }

    function _braco(ctx, rotBiceps, rotAntebraco) {
        const side = rotBiceps < 0 ? -1 : 1;
        const shoulderX = side * 6;
        const shoulderY = -25;
        const elbowX = side * (8 + Math.sin(rotBiceps) * 2);
        const elbowY = -20 + Math.cos(rotBiceps) * 2;
        const handX = elbowX + side * (2 + Math.sin(rotAntebraco) * 2);
        const handY = elbowY + 4 + Math.cos(rotAntebraco);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#16171f';
        ctx.lineWidth = 5.6;
        ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.stroke();
        ctx.strokeStyle = '#514b53';
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.stroke();
        _placa(ctx, [[shoulderX - 2.8, shoulderY - 2], [shoulderX + side * 2, shoulderY - 3], [elbowX + side, elbowY], [elbowX - side * 2, elbowY + 1]], '#302c34');
        ctx.strokeStyle = '#a92b42';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY - 1); ctx.lineTo(elbowX, elbowY); ctx.stroke();
        ctx.strokeStyle = '#171820';
        ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
        ctx.strokeStyle = '#a69a9b';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
        ctx.fillStyle = '#c0b0a6';
        ctx.beginPath(); ctx.arc(handX, handY, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    function _capa(ctx, vento, inclinacao) {
        const sway = vento * 1.2;
        ctx.fillStyle = '#10121c';
        ctx.strokeStyle = 'rgba(115,105,116,0.85)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-5, -27 + inclinacao);
        ctx.quadraticCurveTo(-13 - sway, -20, -11 - sway * 2, -10);
        ctx.lineTo(-9 - sway * 2, -6); ctx.lineTo(-5 - sway, -11);
        ctx.lineTo(-3, -5); ctx.lineTo(0, -11); ctx.lineTo(4 + sway, -5);
        ctx.lineTo(5, -12); ctx.quadraticCurveTo(10 + sway, -20, 5, -27 + inclinacao);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2b2b37';
        ctx.beginPath();
        ctx.moveTo(-5, -25 + inclinacao);
        ctx.quadraticCurveTo(-9 - sway, -17, -8 - sway, -8);
        ctx.lineTo(-5 - sway, -12); ctx.lineTo(-3, -25 + inclinacao); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1b1b25';
        ctx.beginPath();
        ctx.moveTo(2, -25 + inclinacao);
        ctx.quadraticCurveTo(8 + sway, -18, 6 + sway, -8);
        ctx.lineTo(3, -12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#a72740';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-6, -22 + inclinacao); ctx.quadraticCurveTo(-8 - sway, -16, -8 - sway * 2, -9);
        ctx.moveTo(4, -23 + inclinacao); ctx.quadraticCurveTo(7 + sway, -16, 6 + sway, -10);
        ctx.stroke();
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
        if (anim && prog.p >= 1 && (anim.estado === 'foice' || anim.estado === 'pirueta' || anim.estado === 'geada' || anim.estado === 'giro')) {
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
        const ladoFoice = Math.cos(ang || 0) < 0 ? -1 : 1;
        const armaFlutuante = estado === 'idle' || estado === 'andando';
        if (armaFlutuante) {
            const flutuar = Math.sin(_agora() / 360) * 2.5;
            ctx.save();
            ctx.translate(ladoFoice * 27, -19 + flutuar);
            ctx.rotate(ladoFoice * (-0.18 + Math.sin(_agora() / 900) * 0.045));
            ctx.shadowColor = 'rgba(190, 25, 55, 0.72)';
            ctx.shadowBlur = 8 + Math.sin(_agora() / 300) * 2;
            _foice(ctx, 0, 0.12 + Math.sin(_agora() / 650) * 0.08, false, posX, posY);
            ctx.restore();
        }

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
                // carregando: foice na horizontal, tremendo, energia acumulando
                let tremor = Math.sin(_agora() / 30) * (0.02 + chanProg * 0.05);
                ctx.save();
                ctx.translate(0, -15);
                ctx.rotate(0.65 + tremor);
                _foice(ctx, -0.18 + Math.sin(_agora() / 120) * 0.04, chanProg, false, posX, posY);
                ctx.restore();
                _braco(ctx, 0.45, 0.8);
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
                _braco(ctx, 0.2 + Math.sin(passo * Math.PI * 2) * 0.12, 2.6);
            }
        } else {
            _braco(ctx, 0.2 + Math.sin(_agora() / 700) * 0.04, 2.6);
        }

        // (ombreiras removidas — corpo enxuto de foiceiro)

        // cabeça
        let olhos = (estado === 'execucao' && chanProg < 0.995) ? 'rgba(170,225,255,1)' : 'rgba(110,190,255,1)';
        let boca = (estado === 'giro' || estado === 'execucao') ? true : false;
        ctx.save();
        ctx.translate(0, estado === 'execucao' || estado === 'geada' ? 1.8 : 3);
        _cabeca(ctx, olhos, boca);
        ctx.restore();

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
    const t = cv.tamanho || 1;
    const l = cv.largura || 1;
    const cBase = cv.cBase || '#211a20';
    const cMeio = cv.cMeio || '#211d27';
    const cPonta = cv.cPonta || '#d12945';
    const cFio = cv.cFio || '#ded4d1';
    const energia = Math.max(0, Math.min(1, carga || 0));
    ctx.save();
    ctx.scale(t, l);
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const pulse = 0.72 + Math.sin(now / 180) * 0.08 + energia * 0.2;

    // Long, straight haft with wrapped grip, metal collars and a weighted pommel.
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#100f15';
    ctx.lineWidth = 4.2 * tam;
    ctx.beginPath(); ctx.moveTo(0, 26 * tam); ctx.lineTo(0, -29 * tam); ctx.stroke();
    ctx.strokeStyle = cBase;
    ctx.lineWidth = 2.8 * tam;
    ctx.beginPath(); ctx.moveTo(0, 25 * tam); ctx.lineTo(0, -28 * tam); ctx.stroke();
    ctx.strokeStyle = 'rgba(164,145,137,0.72)';
    ctx.lineWidth = 0.8 * tam;
    ctx.beginPath(); ctx.moveTo(-0.7 * tam, 22 * tam); ctx.lineTo(-0.7 * tam, -23 * tam); ctx.stroke();
    for (const y of [18, 14, 10, 6, 2, -2]) {
        ctx.strokeStyle = (y % 2) ? '#922239' : '#6b626a';
        ctx.lineWidth = 1.2 * tam;
        ctx.beginPath(); ctx.moveTo(-1.7 * tam, y * tam); ctx.lineTo(1.7 * tam, (y - 1.5) * tam); ctx.stroke();
    }
    for (const y of [-25, 18]) {
        ctx.fillStyle = '#777078';
        ctx.fillRect(-2.8 * tam, y * tam, 5.6 * tam, 2 * tam);
        ctx.strokeStyle = '#c9bcbc';
        ctx.lineWidth = 0.65 * tam;
        ctx.strokeRect(-2.8 * tam, y * tam, 5.6 * tam, 2 * tam);
    }
    ctx.fillStyle = '#3b343d';
    ctx.beginPath(); ctx.arc(0, 26 * tam, 2.4 * tam, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ba3046';
    ctx.lineWidth = 0.9 * tam;
    ctx.stroke();

    // Heavy crescent blade sweeps from the haft like a hooked executioner's scythe.
    ctx.fillStyle = cBase;
    ctx.beginPath();
    ctx.moveTo(-1 * tam, -25 * tam);
    ctx.quadraticCurveTo(3 * tam, -35 * tam, 15 * tam, -43 * tam);
    ctx.quadraticCurveTo(27 * tam, -50 * tam, 31 * tam, -40 * tam);
    ctx.quadraticCurveTo(35 * tam, -30 * tam, 25 * tam, -20 * tam);
    ctx.quadraticCurveTo(20 * tam, -15 * tam, 12 * tam, -15 * tam);
    ctx.quadraticCurveTo(24 * tam, -27 * tam, 24 * tam, -37 * tam);
    ctx.quadraticCurveTo(17 * tam, -33 * tam, 3 * tam, -24 * tam);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#82767c';
    ctx.lineWidth = 1.2 * tam;
    ctx.stroke();
    ctx.fillStyle = cMeio;
    ctx.beginPath();
    ctx.moveTo(1 * tam, -27 * tam);
    ctx.quadraticCurveTo(8 * tam, -36 * tam, 20 * tam, -43 * tam);
    ctx.quadraticCurveTo(28 * tam, -47 * tam, 29 * tam, -40 * tam);
    ctx.quadraticCurveTo(31 * tam, -31 * tam, 22 * tam, -23 * tam);
    ctx.quadraticCurveTo(27 * tam, -34 * tam, 23 * tam, -40 * tam);
    ctx.quadraticCurveTo(15 * tam, -37 * tam, 2 * tam, -25 * tam);
    ctx.closePath(); ctx.fill();

    // Bright sharpened edge and red vein runes make the silhouette readable at game scale.
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 1.35 * tam;
    ctx.beginPath();
    ctx.moveTo(3 * tam, -27 * tam);
    ctx.quadraticCurveTo(16 * tam, -40 * tam, 25 * tam, -44 * tam);
    ctx.quadraticCurveTo(32 * tam, -42 * tam, 28 * tam, -32 * tam);
    ctx.stroke();
    ctx.strokeStyle = cPonta;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = (1 + energia * 0.45) * tam;
    ctx.shadowColor = cPonta;
    ctx.shadowBlur = 3 + energia * 8;
    ctx.beginPath();
    ctx.moveTo(4 * tam, -28 * tam);
    ctx.lineTo(11 * tam, -31 * tam);
    ctx.lineTo(13 * tam, -36 * tam);
    ctx.moveTo(15 * tam, -32 * tam);
    ctx.lineTo(21 * tam, -37 * tam);
    ctx.stroke();

    // Blade socket and red core.
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#302b34';
    ctx.strokeStyle = '#b7a8a8';
    ctx.lineWidth = 0.9 * tam;
    ctx.beginPath(); ctx.arc(1 * tam, -26 * tam, 3.2 * tam, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cPonta;
    ctx.shadowColor = cPonta;
    ctx.shadowBlur = 4 + energia * 7;
    ctx.beginPath(); ctx.arc(1 * tam, -26 * tam, 1.5 * tam, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
};
