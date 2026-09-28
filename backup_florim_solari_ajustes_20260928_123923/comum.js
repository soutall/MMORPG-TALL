// classes/comum.js - Funções compartilhadas entre todas as classes
window.desenharBarraHp = function(x, y, hp, maxHp, stunTimer = 0, slowTimer = 0, larguraCustom = 0, slime = null) {
    if (!window.ctx) return;
    let largura = larguraCustom || 30, altura = 4;
    let porcentagem = Math.max(0, hp / maxHp);
    window.ctx.fillStyle = "rgba(0,0,0,0.6)";
    window.ctx.fillRect(x - 3, y - 10, largura + 6, altura + 4);
    window.ctx.fillStyle = "#e74c3c";
    window.ctx.fillRect(x, y - 8, largura * porcentagem, altura);
    window.ctx.strokeStyle = "#2c3e50";
    window.ctx.strokeRect(x, y - 8, largura, altura);

    // FIX tela trava: hordas stunadas pela Bateria desenhavam o emoji 💫/❄️ + texto
    // TODO FRAME por monstro (custoso em canvas). Agora o ícone só re-renderiza a cada
    // 350ms por monstro — visual idêntico, custo ~3x menor.
    let agora = 0;
    let ultimoDraw = 0;
    if (slime && slime.id) {
        if (!window._debuffIconCache) window._debuffIconCache = {};
        if (Object.keys(window._debuffIconCache).length > 600) window._debuffIconCache = {};
        agora = performance.now() || Date.now();
        ultimoDraw = window._debuffIconCache[slime.id] || 0;
    }
    let posso = !slime || (agora - ultimoDraw > 350);

    // Render debuff icons above HP bar
    if (stunTimer > 0) {
        window.ctx.fillStyle = "#f1c40f";
        window.ctx.font = "bold 11px 'Rajdhani', Arial, sans-serif";
        let tempo = (stunTimer / 20).toFixed(1);
        if (posso) {
            if (slime && slime.id) window._debuffIconCache[slime.id] = agora;
            window.ctx.fillText("💫 " + tempo + "s", x - 5, y - 15);
        }
    }
    if (slowTimer > 0) {
        window.ctx.fillStyle = "#3498db";
        window.ctx.font = "bold 11px 'Rajdhani', Arial, sans-serif";
        let tempo = (slowTimer / 20).toFixed(1);
        if (posso) {
            if (slime && slime.id && !(stunTimer > 0)) window._debuffIconCache[slime.id] = agora;
            window.ctx.fillText("❄️ " + tempo + "s", x + 15, y - 15);
        }
    }
};
