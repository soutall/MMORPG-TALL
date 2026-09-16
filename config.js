/* ===== CONFIGURAÇÕES (volume central, trocar de char, sair) ===== */

window.configAberto = false;

function configScreenEl() { return document.getElementById("settings-screen"); }
function volumeSliderEl() { return document.getElementById("volume-slider"); }
function volumeValorEl() { return document.getElementById("volume-valor"); }

function abrirConfig() {
    if (window.estaMorto) return;
    if (window.inventarioAberto) fecharInventario();
    if (window.skillsAberto) fecharSkills();
    if (typeof cancelarTodasMiras === 'function') cancelarTodasMiras();

    let v = Math.round((window.volumeGeral || 0.8) * 100);
    if (volumeSliderEl()) volumeSliderEl().value = v;
    if (volumeValorEl()) volumeValorEl().innerText = v + "%";

    window.configAberto = true;
    let screen = configScreenEl();
    if (screen) screen.style.display = "flex";
}

function fecharConfig() {
    window.configAberto = false;
    let screen = configScreenEl();
    if (screen) screen.style.display = "none";
}

function toggleConfig() {
    if (window.configAberto) fecharConfig(); else abrirConfig();
}

function mudarVolume(valor) {
    let v = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
    window.volumeGeral = v / 100;
    if (typeof iniciarAudio === 'function') iniciarAudio();
    if (window.audioGanhoMaster) window.audioGanhoMaster.gain.value = window.volumeGeral;
    try { localStorage.setItem("mmorpg_volume", window.volumeGeral); } catch (e) {}
    if (volumeValorEl()) volumeValorEl().innerText = v + "%";
}

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

    // Desloga o personagem atual: fecha o socket para o servidor removê-lo do mundo.
    // Ele só volta a aparecer quando a nova classe for escolhida (novo login).
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