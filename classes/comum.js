// classes/comum.js - Funções compartilhadas entre todas as classes
window.desenharBarraHp = function(x, y, hp, maxHp, stunTimer = 0, slowTimer = 0, larguraCustom = 0, slime = null) {
    if (!window.ctx) return;

    // REGRA GERAL: Retira a barra de HP em cima do personagem para TODAS as classes de heróis!
    // A barra só é renderizada para monstros/slimes/bosses (onde slime é passado).
    if (!slime) return;

    let largura = larguraCustom || 30, altura = 4;
    let porcentagem = Math.max(0, hp / maxHp);

    window.ctx.fillStyle = "rgba(0,0,0,0.6)";
    window.ctx.fillRect(x - 3, y - 10, largura + 6, altura + 4);
    window.ctx.fillStyle = "#e74c3c";
    window.ctx.fillRect(x, y - 8, largura * porcentagem, altura);
    window.ctx.strokeStyle = "#2c3e50";
    window.ctx.strokeRect(x, y - 8, largura, altura);

    // Cache para otimizar render de texto/emojis
    let agora = 0;
    let ultimoDraw = 0;
    if (slime && slime.id) {
        if (!window._debuffIconCache) window._debuffIconCache = {};
        if (Object.keys(window._debuffIconCache).length > 600) window._debuffIconCache = {};
        agora = performance.now() || Date.now();
        ultimoDraw = window._debuffIconCache[slime.id] || 0;
    }
    let posso = !slime || (agora - ultimoDraw > 250);

    // 1. Debuffs de Stun e Slow
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

    // 2. Debuffs da Florim (Skill 3: Espinhos de Rosa - Redução de Defesa e Ataque)
    let temReducaoDef = false, temReducaoAtk = false;
    if (slime.efeitos && Array.isArray(slime.efeitos)) {
        temReducaoDef = slime.efeitos.some(e => e && (e.tipo === 'reducaoDef' || e.nome === 'reducaoDef'));
        temReducaoAtk = slime.efeitos.some(e => e && (e.tipo === 'reducaoAtk' || e.nome === 'reducaoAtk'));
    } else if (slime.reducaoDefTimer > 0 || slime.reducaoAtkTimer > 0) {
        temReducaoDef = (slime.reducaoDefTimer > 0);
        temReducaoAtk = (slime.reducaoAtkTimer > 0);
    }

    if (temReducaoDef || temReducaoAtk) {
        window.ctx.font = "bold 10px 'Rajdhani', Arial, sans-serif";
        let offY = (stunTimer > 0 || slowTimer > 0) ? -28 : -16;
        if (temReducaoDef && temReducaoAtk) {
            window.ctx.fillStyle = "#e74c3c";
            window.ctx.fillText("🛡️-20%", x - 12, y + offY);
            window.ctx.fillStyle = "#e67e22";
            window.ctx.fillText("⚔️-20%", x + 16, y + offY);
        } else if (temReducaoDef) {
            window.ctx.fillStyle = "#e74c3c";
            window.ctx.fillText("🛡️-20% DEF", x, y + offY);
        } else {
            window.ctx.fillStyle = "#e67e22";
            window.ctx.fillText("⚔️-20% ATK", x, y + offY);
        }
    }
};
