// classes/guerreiro_kaledron.js â€” RenderizaÃ§Ã£o completa do Guerreiro Kaledron (Magma Knight)
// 100% procedural em Canvas 2D (conforme GDD: GUERREIRO_KALEDRON.gdd e VISUAL_CLASSES_GUIDE.gdd).
(function () {
    'use strict';

    function _agora() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    // Estados de animaÃ§Ã£o e posiÃ§Ãµes inerciais de espada por jogador (pid -> dados)
    window.kaledronAnims = window.kaledronAnims || {};
    window.kaledronEspadas = window.kaledronEspadas || {}; // LERP e inÃ©rcia do montante flutuante
    window.kaledronParticulas = window.kaledronParticulas || {}; // Brasas, poeira e fumaÃ§a por jogador

    // Estado local para o prÃ³prio jogador
    window.kaledronEstadoLocal = window.kaledronEstadoLocal || {
        redemoinhoAtivo: false,
        redemoinhoInicio: 0,
        redemoinhoDur: 3000,
        bradoAtivo: false,
        bradoExpira: 0
    };

    // Registra animaÃ§Ãµes de ataque ou skills
    window.registrarKaledronAnim = function (pid, estado, dur, dados) {
        if (!pid) return;
        let base = { estado: estado, inicio: _agora(), dur: dur || 420 };
        if (dados) Object.assign(base, dados);
        window.kaledronAnims[pid] = base;

        if (pid === window.meuId) {
            if (estado === 'redemoinho') {
                window.kaledronEstadoLocal.redemoinhoAtivo = true;
                window.kaledronEstadoLocal.redemoinhoInicio = base.inicio;
                window.kaledronEstadoLocal.redemoinhoDur = dur || 3000;
            }
            if (estado === 'idle') {
                window.kaledronEstadoLocal.redemoinhoAtivo = false;
            }
        }
    };

    // Helper que verifica se o Kaledron estÃ¡ travado em animaÃ§Ã£o de skill (ex: redemoinho ou impacto)
    window.kaledronEmAnimacaoSkill = function (pid) {
        let id = pid || window.meuId;
        if (!id) return false;
        let agora = _agora();
        let anim = window.kaledronAnims && window.kaledronAnims[id];
        if (anim && (anim.estado === 'impacto' || anim.estado === 'redemoinho' || anim.estado === 'brado')) {
            let decorrido = agora - (anim.inicio || 0);
            if (decorrido >= 0 && decorrido < (anim.dur || 0)) {
                return true;
            } else {
                if (id === window.meuId && window.kaledronEstadoLocal) {
                    if (anim.estado === 'redemoinho') window.kaledronEstadoLocal.redemoinhoAtivo = false;
                }
            }
        }
        if (id === window.meuId && window.kaledronEstadoLocal && window.kaledronEstadoLocal.redemoinhoAtivo) {
            let decorrido = agora - (window.kaledronEstadoLocal.redemoinhoInicio || 0);
            if (decorrido >= 0 && decorrido < (window.kaledronEstadoLocal.redemoinhoDur || 3000)) return true;
            window.kaledronEstadoLocal.redemoinhoAtivo = false;
        }
        return false;
    };

    // UtilitÃ¡rio de gradiente
    function _grad(ctx, x1, y1, x2, y2, stops) {
        let g = ctx.createLinearGradient(x1, y1, x2, y2);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        return g;
    }

    // Inicializa sistema de partÃ­culas locais por jogador
    function obterParticulas(pid) {
        if (!window.kaledronParticulas[pid]) {
            window.kaledronParticulas[pid] = {
                embers: [],
                smoke: [],
                sparks: [],
                lavaShards: [],
                lastEmber: 0,
                lastSmoke: 0,
                lastLavaShard: 0,
                walkCycle: 0,
                lastX: 0,
                lastY: 0
            };
        }
        return window.kaledronParticulas[pid];
    }

    /* =========================================================================
       RENDERIZAÃ‡ÃƒO PROCEDURAL DO GUERREIRO KALEDRON (Canvas 2D)
       ========================================================================= */
    /* =========================================================================
       RENDERIZACAO — KALEDRON, CAVALEIRO DO ABISMO
       -------------------------------------------------------------------------
       O desenho em si mora em classes/kaledron_visual.js. Aqui fica apenas a
       traducao do estado de animacao (que a logica de combate preenche) para o
       formato que o visual espera.
       ========================================================================= */
    window.desenharKaledron = function (x, y, isMoving, anguloBase, hp, maxHp, pid, opcoes) {
        if (!window.ctx) return;
        if (hp <= 0) return;
        // Se o modulo de visual nao carregou (404, ordem de script, cache),
        // o desenho some em vez de estourar dentro do loop de render.
        if (!window.KaledronVisual || typeof window.KaledronVisual.desenhar !== 'function') return;

        const id = pid || 'kaledron_local';
        const anim = (window.kaledronAnims && window.kaledronAnims[id]) || null;
        const agora = _agora();

        let prog = 0;
        let estado = '';
        let anguloAtaque = anguloBase || 0;

        if (anim) {
            const decorrido = agora - anim.inicio;
            if (decorrido < anim.dur) {
                prog = decorrido / anim.dur;
                estado = anim.estado || '';
                if (Number.isFinite(anim.angulo)) anguloAtaque = anim.angulo;
            } else {
                delete window.kaledronAnims[id];
            }
        }

        // O redemoinho e a unica skill com estado global (alastra o tempo todo
        // enquanto dura), entao ele nao vem de kaledronAnims.
        const est = window.kaledronEstadoLocal;
        if (est && est.redemoinhoAtivo && !estado) {
            const decorrido = agora - (est.redemoinhoInicio || agora);
            if (decorrido >= 0 && decorrido < (est.redemoinhoDur || 3000)) {
                estado = 'redemoinho';
                prog = decorrido / (est.redemoinhoDur || 3000);
            }
        }

        window.KaledronVisual.desenhar(x, y, isMoving, anguloBase, hp, maxHp, id, {
            agora: agora,
            prog: prog,
            estado: estado,
            anguloAtaque: anguloAtaque
        });
    };

    /* =========================================================================
       DISPARADOR DE AUTO-ATAQUE / ATAQUE BÃSICO DO KALEDRON
       ========================================================================= */
    window.enviarAtaqueKaledron = function (ang, alvoTipo, alvoId) {
        if (window.estaMorto) return;
        if (window.kaledronEmAnimacaoSkill && window.kaledronEmAnimacaoSkill(window.meuId)) return;

        // Registra animaÃ§Ã£o local de 420ms
        window.registrarKaledronAnim(window.meuId, 'ataque', 650, { angulo: Number.isFinite(Number(ang)) ? Number(ang) : (window.meuAngulo || 0) });

        // Ãudio
        if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('kaledron_espada');
        } else if (typeof window.tocarSomEspada === 'function') {
            window.tocarSomEspada();
        }

        // Envia mensagem ao servidor
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            let msg = { action: 'ataque_kaledron', angulo: Number.isFinite(Number(ang)) ? Number(ang) : (window.meuAngulo || 0) };
            if (alvoTipo && alvoId) {
                msg.alvoTipo = alvoTipo;
                msg.alvoId = alvoId;
            }
            window.ws.send(JSON.stringify(msg));
        }
    };

})();
