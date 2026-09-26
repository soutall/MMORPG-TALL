/* ===== CONFIGURAÇÕES (volume central, volume BGM, volume SFX, trocar de char, sair) ===== */

window.configAberto = false;

function configScreenEl() { return document.getElementById("settings-screen"); }

function carregarConfiguracoesAudio() {
    let uid = window.meuId || localStorage.getItem("mmorpg_user_id") || "default";
    let vGeral = localStorage.getItem("mmorpg_volume_" + uid) || localStorage.getItem("mmorpg_volume");
    let vBgm = localStorage.getItem("mmorpg_volume_bgm_" + uid);
    let vSfx = localStorage.getItem("mmorpg_volume_sfx_" + uid);

    window.volumeGeral = vGeral !== null ? parseFloat(vGeral) : 0.8;
    window.volumeBgm = vBgm !== null ? parseFloat(vBgm) : 0.8;
    window.volumeSfx = vSfx !== null ? parseFloat(vSfx) : 0.8;
}

function salvarConfiguracoesAudio() {
    let uid = window.meuId || localStorage.getItem("mmorpg_user_id") || "default";
    try {
        localStorage.setItem("mmorpg_volume_" + uid, window.volumeGeral);
        localStorage.setItem("mmorpg_volume", window.volumeGeral);
        localStorage.setItem("mmorpg_volume_bgm_" + uid, window.volumeBgm);
        localStorage.setItem("mmorpg_volume_sfx_" + uid, window.volumeSfx);
    } catch (e) {}
}

function abrirConfig() {
    if (window.estaMorto) return;
    if (window.inventarioAberto && typeof fecharInventario === 'function') fecharInventario();
    if (window.skillsAberto && typeof fecharSkills === 'function') fecharSkills();
    if (typeof cancelarTodasMiras === 'function') cancelarTodasMiras();

    carregarConfiguracoesAudio();

    let vG = Math.round((window.volumeGeral !== undefined ? window.volumeGeral : 0.8) * 100);
    let vB = Math.round((window.volumeBgm !== undefined ? window.volumeBgm : 0.8) * 100);
    let vS = Math.round((window.volumeSfx !== undefined ? window.volumeSfx : 0.8) * 100);

    let sG = document.getElementById("volume-slider");
    if (sG) sG.value = vG;
    let lG = document.getElementById("volume-valor");
    if (lG) lG.innerText = vG + "%";

    let sB = document.getElementById("volume-bgm-slider");
    if (sB) sB.value = vB;
    let lB = document.getElementById("volume-bgm-valor");
    if (lB) lB.innerText = vB + "%";

    let sS = document.getElementById("volume-sfx-slider");
    if (sS) sS.value = vS;
    let lS = document.getElementById("volume-sfx-valor");
    if (lS) lS.innerText = vS + "%";

    window.configAberto = true;
    preencherAbaVisual();
    mudarAbaConfig('audio');
    let screen = configScreenEl();
    if (screen) screen.style.display = "flex";
}

function fecharConfig() {
    salvarConfiguracoesAudio();
    window.configAberto = false;
    let screen = configScreenEl();
    if (screen) screen.style.display = "none";
}

function toggleConfig() {
    if (window.configAberto) fecharConfig(); else abrirConfig();
}

function mudarVolumeGeral(valor) {
    let v = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
    window.volumeGeral = v / 100;
    if (typeof iniciarAudio === 'function') iniciarAudio();
    if (window.audioGanhoMaster) window.audioGanhoMaster.gain.value = window.volumeGeral;
    if (window.AudioManager && typeof window.AudioManager.setMasterVolume === 'function') {
        window.AudioManager.setMasterVolume(window.volumeGeral);
    }
    if (typeof window.atualizarBgmVolume === 'function') window.atualizarBgmVolume();
    let el = document.getElementById("volume-valor");
    if (el) el.innerText = v + "%";
    salvarConfiguracoesAudio();
}

function mudarVolumeBgm(valor) {
    let v = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
    window.volumeBgm = v / 100;
    if (typeof window.atualizarBgmVolume === 'function') window.atualizarBgmVolume();
    if (window.AudioManager && typeof window.AudioManager.setAmbientVolume === 'function') {
        window.AudioManager.setAmbientVolume(window.volumeBgm);
    }
    let el = document.getElementById("volume-bgm-valor");
    if (el) el.innerText = v + "%";
    salvarConfiguracoesAudio();
}

function mudarVolumeSfx(valor) {
    let v = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
    window.volumeSfx = v / 100;
    if (typeof iniciarAudio === 'function') iniciarAudio();
    if (window.audioGanhoSfx) window.audioGanhoSfx.gain.value = window.volumeSfx;
    if (window.AudioManager && typeof window.AudioManager.setSfxVolume === 'function') {
        window.AudioManager.setSfxVolume(window.volumeSfx);
    }
    let el = document.getElementById("volume-sfx-valor");
    if (el) el.innerText = v + "%";
    salvarConfiguracoesAudio();
}

// Retrocompatibilidade
window.mudarVolume = mudarVolumeGeral;
window.mudarVolumeGeral = mudarVolumeGeral;
window.mudarVolumeBgm = mudarVolumeBgm;
window.mudarVolumeSfx = mudarVolumeSfx;

/* ===== ABA VISUAL (configurações de interface) ===== */
var VISUAL_PREF = "mmorpg_visual_";

function chaveVisual() {
    var uid = window.meuId || localStorage.getItem("mmorpg_user_id") || "default";
    return VISUAL_PREF + uid;
}

function carregarConfigVisual() {
    var padrao = { hpBar: 'max', mpBar: 'max', xpBar: 'pct', tela: 'fullscreen' };
    window.configVisual = padrao;
    try {
        var s = localStorage.getItem(chaveVisual());
        if (s) {
            var d = JSON.parse(s);
            if (d && typeof d === 'object') {
                for (var k in padrao) if (d[k] !== undefined) padrao[k] = d[k];
            }
        }
    } catch (e) {}
}

function salvarConfigVisual() {
    try { localStorage.setItem(chaveVisual(), JSON.stringify(window.configVisual || {})); } catch (e) {}
}

carregarConfigVisual();

window.mudarAbaConfig = function (aba) {
    var bA = document.getElementById("btn-aba-audio");
    var bV = document.getElementById("btn-aba-visual");
    if (bA) bA.classList.toggle("ativo", aba === 'audio');
    if (bV) bV.classList.toggle("ativo", aba === 'visual');
    var tA = document.getElementById("settings-tab-audio");
    var tV = document.getElementById("settings-tab-visual");
    if (tA) tA.style.display = aba === 'audio' ? 'block' : 'none';
    if (tV) tV.style.display = aba === 'visual' ? 'block' : 'none';
};

function refrescarBarrasHud() {
    if (typeof atualizarHudHp === 'function') atualizarHudHp();
    if (typeof atualizarHudMp === 'function') atualizarHudMp();
    if (typeof atualizarHudXp === 'function') atualizarHudXp();
}

window.mudarVisualHpBar = function (val) {
    window.configVisual = window.configVisual || {};
    window.configVisual.hpBar = val;
    salvarConfigVisual();
    refrescarBarrasHud();
};

window.mudarVisualMpBar = function (val) {
    window.configVisual = window.configVisual || {};
    window.configVisual.mpBar = val;
    salvarConfigVisual();
    refrescarBarrasHud();
};

window.mudarVisualXpBar = function (val) {
    window.configVisual = window.configVisual || {};
    window.configVisual.xpBar = val;
    salvarConfigVisual();
    refrescarBarrasHud();
};

/* ===== MODO DE TELA — JANELA vs FULL JANELA (SOMENTE PC) =====
   O navegador NÃO deixa uma aba comum redimensionar a janela do sistema, então
   aqui a opção controla a Fullscreen API:
     - "Modo Janela"       -> sai da tela cheia (jogo na janela do navegador)
     - "Modo Full Janela"  -> tela cheia real (sem barra de navegador)
   A escolha é salva POR ID DO PERSONAGEM (mesma chave dos demais ajustes visuais:
   mmorpg_visual_<id>) e num espelho global (mmorpg_tela) usado antes do login,
   já que o id do personagem só é conhecido depois do 'init' do servidor.
   No MOBILE a opção fica oculta: lá a tela cheia é obrigatória (jogo em
   paisagem), então o 'fullscreen' automático continua valendo. */

var TELA_CHAVE_GLOBAL = "mmorpg_tela";

// Detecta a PLATAFORMA (não o tamanho da janela): uma janela de PC pequena
// continua sendo PC e por isso o seletor não pode sumir quando o jogador
// escolhe "Modo Janela" e encolhe o navegador.
function plataformaEhPC() {
    if (window.__forcarDispositivo === 'mobile') return false;
    if (window.__forcarDispositivo === 'pc') return true;
    try {
        var ua = navigator.userAgent || '';
        if (/Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|Mobile|Silk/i.test(ua)) return false;
        // iPadOS 13+ se apresenta como "Macintosh", mas tem vários pontos de toque.
        if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return false;
    } catch (e) {}
    return true;
}

function telaEstaFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.mozFullScreenElement || document.msFullscreenElement);
}

function telaPreferida() {
    var cfg = window.configVisual || {};
    if (cfg.tela === 'janela' || cfg.tela === 'fullscreen') return cfg.tela;
    try {
        var g = localStorage.getItem(TELA_CHAVE_GLOBAL);
        if (g === 'janela' || g === 'fullscreen') return g;
    } catch (e) {}
    return 'fullscreen';
}

function salvarTelaPreferida(modo) {
    var cfg = window.configVisual = window.configVisual || {};
    cfg.tela = modo;
    salvarConfigVisual();
    try { localStorage.setItem(TELA_CHAVE_GLOBAL, modo); } catch (e) {}
}

function aplicarModoTela(modo) {
    var querFull = (modo !== 'janela');
    if (querFull === telaEstaFullscreen()) return;
    try {
        if (querFull) {
            var el = document.documentElement;
            var req = el.requestFullscreen || el.webkitRequestFullscreen ||
                      el.mozRequestFullScreen || el.msRequestFullscreen;
            if (req) { var p = req.call(el); if (p && p.catch) p.catch(function () {}); }
        } else {
            var sai = document.exitFullscreen || document.webkitExitFullscreen ||
                      document.mozCancelFullScreen || document.msExitFullscreen;
            if (sai) { var q = sai.call(document); if (q && q.catch) q.catch(function () {}); }
        }
    } catch (e) {}
    if (typeof redimensionarCanvas === 'function') setTimeout(redimensionarCanvas, 150);
}

function atualizarSeletorTela() {
    var linha = document.getElementById("vis-tela-linha");
    if (linha) linha.style.display = plataformaEhPC() ? "" : "none";
    var sel = document.getElementById("vis-tela-modo");
    if (sel) sel.value = telaPreferida();
}

window.mudarVisualTela = function (val) {
    var modo = (val === 'janela') ? 'janela' : 'fullscreen';
    salvarTelaPreferida(modo);
    aplicarModoTela(modo);
};

// O auto-fullscreen do 1º clique (index.html) consulta isto: no PC ele só
// entra em tela cheia se o jogador escolheu "Full Janela"; no mobile sempre.
window.autoFullscreenPermitido = function () {
    if (!plataformaEhPC()) return true;
    return telaPreferida() === 'fullscreen';
};

// Se o jogador sair/entrar da tela cheia por fora (Esc, F11), a preferência
// passa a refletir a realidade — o seletor nunca mente sobre o estado atual.
function sincronizarTelaReal() {
    var modo = telaEstaFullscreen() ? 'fullscreen' : 'janela';
    if (telaPreferida() !== modo) salvarTelaPreferida(modo);
    atualizarSeletorTela();
    if (typeof redimensionarCanvas === 'function') setTimeout(redimensionarCanvas, 150);
}
if (document.addEventListener) {
    document.addEventListener('fullscreenchange', sincronizarTelaReal);
    document.addEventListener('webkitfullscreenchange', sincronizarTelaReal);
}

function preencherAbaVisual() {
    var cfg = window.configVisual || {};
    var sh = document.getElementById("vis-hp-modo");
    if (sh) sh.value = cfg.hpBar || 'max';
    var sm = document.getElementById("vis-mp-modo");
    if (sm) sm.value = cfg.mpBar || 'max';
    var sx = document.getElementById("vis-xp-modo");
    if (sx) sx.value = cfg.xpBar || 'pct';
    atualizarSeletorTela();
}

window.requerProximidade = function (px, py, raio) {
    if (typeof window.meuX !== 'number' || typeof window.meuY !== 'number') return false;
    return Math.hypot(window.meuX - px, window.meuY - py) <= (raio || 130);
};

window.avisoProximidade = function () {
    if (window.floatingTexts) {
        window.floatingTexts.push({ x: (window.meuX || 0) + 14, y: (window.meuY || 0) - 34, text: '⚠️ Chegue mais perto!', color: '#e74c3c', alpha: 1.0 });
    }
};

function trocarDePersonagem() {
    fecharConfig();
    if (typeof fecharInventario === 'function') fecharInventario();
    if (typeof fecharSkills === 'function') fecharSkills();
    if (typeof cancelarTodasMiras === 'function') cancelarTodasMiras();
    autofarmLigado = false;
    if (btnAutofarm) btnAutofarm.classList.remove("active");
    if (statusText) statusText.innerText = "Status: Escolha a nova classe para logar";
    if (window.estaMorto) { window.estaMorto = false; if (deathScreen) deathScreen.style.display = "none"; }
    window.meuStunTimer = 0;

    try { if (typeof ws !== 'undefined' && ws) { ws.onclose = null; ws.close(); ws = null; } } catch (e) {}
    window.meuId = null;

    if (charSelectScreen) charSelectScreen.style.display = "flex";
}

function sairDoJogo() {
    try { if (typeof ws !== 'undefined' && ws) { ws.onclose = null; ws.close(); } } catch (e) {}
    if (typeof fecharConfig === 'function') fecharConfig();
    location.reload();
}

if (configScreenEl()) configScreenEl().addEventListener("click", function(e) { if (e.target === configScreenEl()) fecharConfig(); });