// classes/arqueiro.js - Renderização do Arqueiro Camuflado com Arco de Espinhos
// ---------------------------------------------------------------------------
// Visual: patrulheiro da floresta com roupa CAMUFLADA (verde-oliva/marrom/areia),
// arco de madeira retorcida com espinhos e corda engatilhada, e animações de
// caminhada/respiração/engate-da-flecha por jogador (pid).
// ---------------------------------------------------------------------------
window.desenharArqueiro = function(x, y, isMoving, angulo, hp, maxHp, pid) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    // --- Animação de TIRO (engate → soltura → recuo) por jogador ----
    let tiroEm = 0;
    if (pid === undefined || pid === window.meuId) tiroEm = window.arqueiroTiroEm || 0;
    else if (window._arqueiroTiroPorId) tiroEm = window._arqueiroTiroPorId[pid] || 0;
    let dtTiro = Date.now() - tiroEm;
    let pull = 0;     // 0..1 o quanto a corda está puxada
    let recoil = 0;   // recuo do arco após soltar
    if (dtTiro >= 0 && dtTiro < 200) {
        if (dtTiro < 90) {
            pull = Math.min(1, dtTiro / 90);
            recoil = -pull * 0.14;       // arco se inclina ao puxar
        } else {
            pull = Math.max(0, 1 - (dtTiro - 90) / 60);
            recoil = Math.sin(((dtTiro - 90) / 60) * Math.PI) * 0.20; // estalo de soltura
        }
    }

    // --- Respiração / passos ---
    let sobe = isMoving ? Math.abs(Math.sin(window.walkCycle || 0)) * 1.6 : Math.sin(t * 2.1) * 0.7 + 0.7;
    let passo = isMoving ? Math.sin(window.walkCycle || 0) : 0;

    ctx.save();
    ctx.translate(x, y);

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32 - sobe * 0.2, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (passos) com botas camufladas
    ctx.fillStyle = "#35402a";
    ctx.fillRect(7, 25, 3, 6 + passo * 2.6);
    ctx.fillRect(14, 25, 3, 6 - passo * 2.6);
    ctx.fillStyle = "#2b3322";
    ctx.fillRect(6, 31 + passo * 2.6, 4, 2.5);
    ctx.fillRect(14, 31 - passo * 2.6, 4, 2.5);

    // ===== CORPO COM PADRÃO CAMUFLADO =====
    ctx.save();
    ctx.translate(0, -sobe * 0.6);

    // Túnica base verde-oliva
    const danoFlash = (window.danoFlashTimer || 0) > 0;
    const camoBase = danoFlash ? "#e74c3c" : "#4a5634";
    ctx.fillStyle = camoBase;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 10);
    ctx.lineTo(22, 26);
    ctx.lineTo(2, 26);
    ctx.closePath();
    ctx.fill();

    // Manchas de camuflagem (verde escuro, marrom, areia)
    if (!danoFlash) {
        ctx.fillStyle = "rgba(46, 56, 32, 0.85)";
        ctx.beginPath(); ctx.ellipse(7, 13, 3, 2.2, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15, 15, 3.4, 2, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(11, 22, 4, 2.4, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(112, 96, 54, 0.8)";
        ctx.beginPath(); ctx.ellipse(9, 18, 2.6, 1.8, -0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(17, 21, 2.2, 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(146, 132, 82, 0.55)";
        ctx.beginPath(); ctx.ellipse(5, 24, 2, 1.4, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(19, 18, 1.8, 1.2, -0.2, 0, Math.PI * 2); ctx.fill();
    }

    // Cinto/fivela de couro + faca de mato
    ctx.fillStyle = "#5a4426";
    ctx.fillRect(1, 22, 22, 3);
    ctx.fillStyle = "#b8860b";
    ctx.fillRect(10, 23, 4, 2.6);
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(17, 20, 1.6, 5);

    // Capuz camuflado (borda + aba na frente)
    ctx.fillStyle = danoFlash ? "#e74c3c" : "#3f4f2c";
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(21, 12);
    ctx.lineTo(3, 12);
    ctx.closePath();
    ctx.fill();
    if (!danoFlash) {
        ctx.fillStyle = "rgba(58, 68, 36, 0.9)";
        ctx.beginPath(); ctx.ellipse(9, 6, 2.6, 1.8, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(16, 7, 2.2, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(120, 104, 60, 0.6)";
        ctx.beginPath(); ctx.ellipse(13, 4, 2, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Rosto sob a sombra (olhos de falcão — brilham ao mirar)
    ctx.fillStyle = "#0d1410";
    ctx.fillRect(8, 7, 8, 4);
    const olhoBrilho = pull > 0 ? 1 : 0.7;
    ctx.globalAlpha = olhoBrilho;
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);
    ctx.globalAlpha = 1;

    // Galhos/folhas de camuflagem pendurados nos ombros
    ctx.fillStyle = "rgba(70, 96, 44, 0.9)";
    ctx.beginPath(); ctx.ellipse(3, 12, 2.4, 1.4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(21, 13, 2.6, 1.5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); // fim sobe

    // ===== MÃO ESQUERDA puxando a corda (engate) =====
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(pull * 6 - 4, 0); // mão acompanha a corda puxada
    ctx.fillStyle = "#7a5a3c";
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ===== ARCO DE ESPINHOS =====
    let wp = window.inventario ? window.inventario.arma : null;
    let armaV = null;
    if (x === window.meuX && y === window.meuY) { 
        if (wp && wp.customVisual) armaV = wp;
    }
    if (typeof window.desenharArcoExposta === 'function') window.desenharArcoExposta(ctx, armaV, angulo, pull, recoil);

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueArqueiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomFlecha === 'function') window.tocarSomFlecha();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_arqueiro', angulo: anguloDisparo })); }
};

window.desenharArcoExposta = function(ctx, armaVisualCustom, angulo, pull, recoil) {
    let tamanho = 20;
    let largura = 3.6;
    let cBase = "#4e3322";
    let cMeio = "#33200f";
    let cPonta = "#c98f55";
    let cFio = pull > 0 ? "#f5f0e4" : "#ecf0f1";

    if (armaVisualCustom && armaVisualCustom.customVisual) {
        let cv = armaVisualCustom.customVisual;
        if (cv.tamanho) tamanho *= cv.tamanho;
        if (cv.largura) largura *= cv.largura;
        if (cv.cBase) cBase = cv.cBase;
        if (cv.cMeio) cMeio = cv.cMeio;
        if (cv.cPonta) cPonta = cv.cPonta;
        if (cv.cFio) cFio = cv.cFio;
    }

    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo + recoil);
    ctx.translate(18, 0);

    // Estrutura de madeira retorcida
    const dobra = pull * 1.5;
    ctx.strokeStyle = cBase;
    ctx.lineWidth = largura;
    ctx.beginPath();
    ctx.arc(0, 0, tamanho, -Math.PI / 2.3, Math.PI / 2.3, false);
    ctx.stroke();

    ctx.strokeStyle = cMeio;
    ctx.lineWidth = largura * (1.4 / 3.6);
    ctx.beginPath();
    ctx.arc(0, 0, tamanho * (17.5 / 20), -Math.PI / 2.4, Math.PI / 2.3, false);
    ctx.stroke();

    // EMPUNHADURA
    ctx.strokeStyle = cMeio; // default "#5a4126" in original
    ctx.lineWidth = largura * (5 / 3.6);
    ctx.beginPath();
    ctx.arc(0, 0, tamanho, -0.24, 0.24, false);
    ctx.stroke();
    for (let v = -0.16; v <= 0.16; v += 0.08) {
        ctx.strokeStyle = cPonta; // default "#7a5a38" in original
        ctx.lineWidth = largura * (1.6 / 3.6);
        ctx.beginPath();
        ctx.moveTo(Math.cos(v) * (tamanho - 1), Math.sin(v) * (tamanho - 1) + 2);
        ctx.lineTo(Math.cos(v) * (tamanho + 1), Math.sin(v) * (tamanho + 1) - 2);
        ctx.stroke();
    }

    // ESPINHOS
    for (let e = 0; e < 8; e++) {
        const ea = -Math.PI / 2.3 + (Math.PI / 2.3 * 2) * (e / 7);
        const ex = Math.cos(ea) * (tamanho + 0.5);
        const ey = Math.sin(ea) * (tamanho + 0.5);
        const dxo = Math.cos(ea);
        const dyo = Math.sin(ea);
        ctx.fillStyle = e % 2 === 0 ? cPonta : cMeio;
        ctx.beginPath();
        ctx.moveTo(ex + dxo * 2 - dyo * 1.8, ey + dyo * 2 + dxo * 1.8);
        ctx.lineTo(ex + dxo * 6, ey + dyo * 6);
        ctx.lineTo(ex + dxo * 2 + dyo * 1.8, ey + dyo * 2 - dxo * 1.8);
        ctx.closePath();
        ctx.fill();
    }

    // Corda engatilhada
    const cTopoX = Math.cos(-Math.PI / 2.3 - dobra * 0.04) * tamanho;
    const cTopoY = Math.sin(-Math.PI / 2.3 - dobra * 0.04) * tamanho;
    const cBaseX = Math.cos(Math.PI / 2.3 + dobra * 0.04) * tamanho;
    const cBaseY = Math.sin(Math.PI / 2.3 + dobra * 0.04) * tamanho;
    const nockX = -12 - pull * 10 - Math.abs(recoil) * 4;
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cTopoX, cTopoY);
    ctx.lineTo(nockX, 0);
    ctx.lineTo(cBaseX, cBaseY);
    ctx.stroke();

    // Flecha nockada
    if (pull > 0.15) {
        ctx.fillStyle = "#8a5a2a";
        ctx.fillRect(nockX, -1, 26, 2);
        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.moveTo(nockX + 26, -3.2);
        ctx.lineTo(nockX + 33, 0);
        ctx.lineTo(nockX + 26, 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#7a9c3a";
        ctx.fillRect(nockX, -3, 4, 2);
        ctx.fillRect(nockX, 1, 4, 2);
    }

    ctx.restore();
};