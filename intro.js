/* ============================================================
   intro.js — TELA DE ABERTURA / INTRODUÇÃO CINEMATOGRÁFICA
   ------------------------------------------------------------
   Sequência (≈5s):
     1. Tela preta
     2. Áudio "tela de entrada/logotall.ogg" (1x, via AudioManager)
     3. Nome do estúdio (fade in → permanece → fade out)
     4. Transição cinematográfica (pulso de brilho)
     5. LOADING fake com barra 0% → 100% (curva com "degraus")
     6. Pausa → fade out → remove do DOM (zero vazamentos)

   Segurança: roda UMA vez por carregamento; nunca trava o jogo
   (áudio falhou/sem arquivo/autoplay bloqueado → intro segue).
   ============================================================ */
(function (global) {
    'use strict';

    /* ===================== CONFIGURAÇÕES (edite aqui) ===================== */
    var INTRO_STUDIO_NAME = 'Tall Games Production';   // nome do estúdio (fácil de alterar)
    var INTRO_AUDIO_SRC = 'Sonoro/tela%20de%20entrada/logotall.ogg';
    var INTRO_AUDIO_VOLUME = 0.85;

    var INTRO_DURACAO_TOTAL = 5700;   // ms — duração total (aproximadamente 5-6s)
    var INTRO_LOGO_INICIO  = 150;     // fade-in do estúdio
    var INTRO_LOGO_SAIDA   = 1950;    // fade-out do estúdio
    var INTRO_TRANSICAO    = 2150;    // pulso de transição
    var INTRO_LOADING_INI  = 2400;    // LOADING aparece (barra em 0%)
    var INTRO_LOADING_FIM  = 4950;    // barra chega a 100%
    var INTRO_COMPLETO     = 5100;    // pausa com 100% + "INICIANDO..."
    var INTRO_SAIDA        = 5250;    // fade out da tela
    var INTRO_MAX_SEGURANCA = 7000;   // trava de segurança (sempre termina)

    /* ============================ Estado ============================ */
    var INTRO_RODOU = false;          // executa apenas 1x por carregamento

    var raiz = null;
    var fillBarra = null;
    var pctEl = null;
    var rafId = 0;
    var inicio = 0;
    var audioEl = null;
    var audioIniciado = false;
    var audioTentativas = 0;
    var removiveis = [];
    var timerSeguranca = 0;

    var FASES = [
        'intro-fase-logo',
        'intro-fase-saida-logo',
        'intro-fase-transicao',
        'intro-fase-loading',
        'intro-fase-completo'
    ];

    /* ============================ Helpers ============================ */
    function registrarListener(alvo, tipo, fn) {
        alvo.addEventListener(tipo, fn, { passive: true });
        removiveis.push(function () { alvo.removeEventListener(tipo, fn, { passive: true }); });
    }

    function estado(novaClasse) {
        if (!raiz) return;
        for (var i = 0; i < FASES.length; i++) {
            if (FASES[i] !== novaClasse) raiz.classList.remove(FASES[i]);
        }
        if (novaClasse) raiz.classList.add(novaClasse);
    }

    /* ===================== Construção do DOM ===================== */
    function criarDOM() {
        raiz = document.createElement('div');
        raiz.id = 'intro-overlay';
        raiz.innerHTML =
            '<div class="intro-vinheta"></div>' +
            '<div class="intro-brilho"></div>' +
            '<div class="intro-estudio">' +
                '<div class="intro-estudio-nome">' + INTRO_STUDIO_NAME + '</div>' +
                '<div class="intro-estudio-linha"></div>' +
                '<div class="intro-estudio-sub">apresenta</div>' +
            '</div>' +
            '<div class="intro-loading">' +
                '<div class="intro-loading-titulo">LOADING</div>' +
                '<div class="intro-barracao">' +
                    '<div class="intro-barra-trilho"><div class="intro-barra-preenchimento"></div></div>' +
                    '<div class="intro-barra-pct">0%</div>' +
                '</div>' +
                '<div class="intro-loading-sub">INICIANDO...</div>' +
            '</div>';
        document.body.insertBefore(raiz, document.body.firstChild);
        fillBarra = raiz.querySelector('.intro-barra-preenchimento');
        pctEl = raiz.querySelector('.intro-barra-pct');
    }

    /* ===================== ÁUDIO (via AudioManager) ===================== */
    function marcarAudio(el) {
        audioEl = el;
        el.addEventListener('playing', function () { audioIniciado = true; }, { once: true });
        el.addEventListener('error', function () {
            if (!audioIniciado) console.warn('[intro] logotall.ogg não pôde ser carregado/reproduzido; introdução segue sem áudio.');
        }, { once: true });
    }

    function tocarAudioIntro() {
        if (audioIniciado || audioTentativas >= 2 || !raiz) return;
        audioTentativas++;

        try {
            // Retry pós-desbloqueio: reutiliza o elemento existente (nunca som duplo)
            if (audioEl) {
                audioEl.play().catch(function () { /* autoplay ainda bloqueado */ });
                return;
            }

            // 1) Reutiliza o AudioManager do jogo (nunca cria um segundo sistema)
            if (global.AudioManager && typeof global.AudioManager.playGlobalSound === 'function' && global.AudioManager.CATEGORY) {
                var voz = global.AudioManager.playGlobalSound('intro_logotall', {
                    src: INTRO_AUDIO_SRC,
                    volume: INTRO_AUDIO_VOLUME,
                    loop: false,
                    category: global.AudioManager.CATEGORY.IMPORTANT
                });
                if (voz && voz.element) {
                    marcarAudio(voz.element);
                    return;
                }
                // voz nula = mudo/limite/recusa — segue sem áudio (pode retentar no gesto)
                return;
            }
            // 2) Fallback simples (só se o AudioManager não existir)
            if (typeof global.Audio === 'function') {
                var a = new global.Audio(INTRO_AUDIO_SRC);
                a.loop = false;
                a.volume = Math.max(0, Math.min(1, (Number(global.volumeGeral) || 0.8) * INTRO_AUDIO_VOLUME));
                marcarAudio(a);
                a.play().catch(function () { /* autoplay bloqueado — retenta no gesto */ });
            } else {
                console.warn('[intro] sem suporte a áudio; introdução segue em silêncio.');
            }
        } catch (err) {
            console.warn('[intro] falha ao iniciar áudio do logo:', err);
        }
    }

    // Estratégia mobile/autoplay: no primeiro toque/clique/o tecla durante a
    // intro, desbloqueia o áudio e tenta mais uma vez (no máximo 2 tentativas).
    function gestoDesbloqueio() {
        try {
            if (global.AudioManager && typeof global.AudioManager.unlock === 'function') global.AudioManager.unlock();
        } catch (e) {}
        tocarAudioIntro();
    }

    function registrarGesto() {
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (tipo) {
            registrarListener(global, tipo, gestoDesbloqueio);
        });
    }

    /* ===================== Timeline (1 rAF, leve) ===================== */
    function curvaProgresso(p) {
        var suave = p * p * (3 - 2 * p);          // smoothstep
        var degrau = Math.floor(suave * 10) / 10; // 10 "degraus" (0,10,...,100)
        var v = degrau + (suave - degrau) * 0.35; // segue perto dos degraus (cinematográfico)
        return Math.max(0, Math.min(1, v));
    }

    function atualizarFase(t) {
        if (t < INTRO_LOGO_INICIO) estado('');                       // FASE 1: tela preta pura
        else if (t < INTRO_LOGO_SAIDA) estado('intro-fase-logo');    // FASE 2/3: áudio + estúdio
        else if (t < INTRO_TRANSICAO) estado('intro-fase-saida-logo');
        else if (t < INTRO_LOADING_INI) estado('intro-fase-transicao');
        else if (t < INTRO_LOADING_FIM) estado('intro-fase-loading');
        else estado('intro-fase-completo');

        if (t >= INTRO_LOADING_INI && fillBarra) {
            var p = Math.max(0, Math.min(1, (t - INTRO_LOADING_INI) / (INTRO_LOADING_FIM - INTRO_LOADING_INI)));
            var v = curvaProgresso(p);
            fillBarra.style.transform = 'scaleX(' + v.toFixed(4) + ')';
            if (pctEl) pctEl.textContent = Math.round(v * 100) + '%';
        }

        if (t >= INTRO_SAIDA && !raiz.classList.contains('intro-saindo')) raiz.classList.add('intro-saindo');
        if (t >= INTRO_DURACAO_TOTAL) destruirIntro();
    }

    function quadro(agora) {
        var t = agora - inicio;
        atualizarFase(t);
        if (t < INTRO_DURACAO_TOTAL) rafId = global.requestAnimationFrame(quadro);
    }

    function iniciarTimeline() {
        inicio = performance.now();
        rafId = global.requestAnimationFrame(quadro);
        timerSeguranca = global.setTimeout(travadoSeguranca, INTRO_MAX_SEGURANCA);
    }

    // Garantia absoluta: mesmo que algo falhe (rAF pausado em aba em segundo
    // plano, erro de áudio etc.), a intro SEMPRE termina sozinha.
    function travadoSeguranca() {
        timerSeguranca = 0;
        if (!raiz) return;
        try { cancelAnimationFrame(rafId); rafId = 0; } catch (e) {}
        raiz.classList.add('intro-saindo');
        var alvo = raiz;
        global.setTimeout(function () { if (alvo && alvo.parentNode) { destruirIntro(); } }, 600);
    }

    function destruirIntro() {
        if (!raiz) return;
        if (rafId) { try { cancelAnimationFrame(rafId); } catch (e) {} rafId = 0; }
        if (timerSeguranca) { try { clearTimeout(timerSeguranca); } catch (e) {} timerSeguranca = 0; }
        for (var i = 0; i < removiveis.length; i++) { try { removiveis[i](); } catch (e) {} }
        removiveis.length = 0;
        try {
            if (audioEl) { audioEl.pause(); audioEl.src = ''; audioEl = null; }
        } catch (e) {}
        var h = document.documentElement, b = document.body;
        if (h) h.classList.remove('intro-ativa');
        if (b) b.classList.remove('intro-ativa');
        if (raiz.parentNode) raiz.parentNode.removeChild(raiz);
        raiz = null; fillBarra = null; pctEl = null;
        console.info('[intro] introdução encerrada e removida (sem recursos pendentes).');
    }

    /* ===================== Inicialização ===================== */
    function bootIntro() {
        if (INTRO_RODOU) return;
        INTRO_RODOU = true;
        global.INTRO_RODOU_FLAG = true;   // informa o watchdog inline que a intro assumiu
        console.info('[intro] iniciando introdução cinematográfica (' + INTRO_STUDIO_NAME + ').');
        try {
            criarDOM();
            registrarGesto();
            tocarAudioIntro();                // 1ª tentativa (autoplay pode bloquear — seguro)
            iniciarTimeline();
        } catch (erro) {
            console.error('[intro] erro ao inicializar:', erro);
            destruirIntro();  // desfaz se houver erro
        }
    }

    // Roda assim que o DOM estiver disponível (scripts do jogo continuam
    // carregando normalmente em segundo plano durante toda a intro).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootIntro, { once: true });
    } else {
        bootIntro();
    }

    // API pública (opcional — útil para testes/depuração no console)
    global.INTRO_API = {
        nomeEstudio: INTRO_STUDIO_NAME,
        duracaoTotal: INTRO_DURACAO_TOTAL,
        terminar: destruirIntro,
        reiniciar: bootIntro
    };
})(window);