// classes/comum.js - Funções compartilhadas entre todas as classes
window.desenharBarraHp = function(x, y, hp, maxHp, stunTimer = 0, slowTimer = 0) {
    if (!window.ctx) return;
    let largura = 30, altura = 4;
    let porcentagem = Math.max(0, hp / maxHp);
    window.ctx.fillStyle = "rgba(0,0,0,0.6)";
    window.ctx.fillRect(x - 3, y - 10, largura + 6, altura + 4);
    window.ctx.fillStyle = "#e74c3c";
    window.ctx.fillRect(x, y - 8, largura * porcentagem, altura);
    window.ctx.strokeStyle = "#2c3e50";
    window.ctx.strokeRect(x, y - 8, largura, altura);
    
    // Render debuff icons above HP bar
    if (stunTimer > 0) {
        window.ctx.fillStyle = "#f1c40f";
        window.ctx.font = "bold 11px 'Rajdhani', Arial, sans-serif";
        let tempo = (stunTimer / 20).toFixed(1);
        window.ctx.fillText("💫 " + tempo + "s", x - 5, y - 15);
    }
    if (slowTimer > 0) {
        window.ctx.fillStyle = "#3498db";
        window.ctx.font = "bold 11px 'Rajdhani', Arial, sans-serif";
        let tempo = (slowTimer / 20).toFixed(1);
        window.ctx.fillText("❄️ " + tempo + "s", x + 15, y - 15);
    }
};
