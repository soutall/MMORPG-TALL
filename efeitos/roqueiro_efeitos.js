window.roqueiroEfeitosAtivos = [];

window.criarAnimacaoBateriaSolo = function(x, y) {
    window.roqueiroEfeitosAtivos.push({ tipo: 'bateria', x: x, y: y, raio: 10, alpha: 1.0 });
    window.tremorTela = Math.max(window.tremorTela, 5);
};

window.criarAnimacaoTeleporteRoqueiro = function(x, y) {
    window.roqueiroEfeitosAtivos.push({ tipo: 'teleporte', x: x, y: y, raio: 45, alpha: 1.0 });
};

window.criarAnimacaoGritoGuerra = function(id, x, y, raio) {
    window.roqueiroEfeitosAtivos.push({ tipo: 'gritoGuerra', x: x, y: y, raio: 20, maxRaio: raio || 220, alpha: 1.0, id: id });
    window.tremorTela = Math.max(window.tremorTela || 0, 6);
};

window.desenharEfeitosRoqueiro = function() {
    // 1. Desenha a mira do Teleporte (Stage Dive)
    if (window.modoMiraTeleporteRoqueiro) {
        let tx = window.meuX + 12 + Math.cos(window.meuAngulo) * 160;
        let ty = window.meuY + 16 + Math.sin(window.meuAngulo) * 160;
        ctx.save();
        ctx.beginPath();
        ctx.arc(tx, ty, 20, 0, Math.PI * 2);
        ctx.strokeStyle = "#9b59b6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.fillStyle = "rgba(155, 89, 182, 0.3)";
        ctx.fill();
        ctx.restore();
    }

    // 2. Efeitos de Partículas da Bateria e Teleporte
    for (let i = window.roqueiroEfeitosAtivos.length - 1; i >= 0; i--) {
        let ef = window.roqueiroEfeitosAtivos[i];
        ctx.save();
        if (ef.tipo === 'bateria') {
            ef.raio += 4.5;
            ef.alpha -= 0.04;
            if (ef.alpha <= 0) { window.roqueiroEfeitosAtivos.splice(i, 1); ctx.restore(); continue; }
            ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.raio, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(230, 126, 34, " + ef.alpha + ")";
            ctx.lineWidth = 6; ctx.shadowColor = "#e67e22"; ctx.shadowBlur = 15; ctx.stroke();
        } else if (ef.tipo === 'teleporte') {
            ef.raio -= 3;
            ef.alpha -= 0.06;
            if (ef.alpha <= 0) { window.roqueiroEfeitosAtivos.splice(i, 1); ctx.restore(); continue; }
            ctx.beginPath(); ctx.arc(ef.x, ef.y, Math.abs(ef.raio), 0, Math.PI * 2);
            ctx.fillStyle = "rgba(155, 89, 182, " + (ef.alpha * 0.8) + ")";
            ctx.shadowColor = "#9b59b6"; ctx.shadowBlur = 20; ctx.fill();
        } else if (ef.tipo === 'gritoGuerra') {
            ef.raio += 5;
            ef.alpha -= 0.045;
            if (ef.alpha <= 0) { window.roqueiroEfeitosAtivos.splice(i, 1); ctx.restore(); continue; }
            ctx.beginPath(); ctx.arc(ef.x, ef.y, Math.min(ef.raio, ef.maxRaio || ef.raio), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(241, 196, 15, " + ef.alpha + ")";
            ctx.lineWidth = 4;
            ctx.shadowColor = "#f1c40f"; ctx.shadowBlur = 18;
            ctx.stroke();

            ctx.beginPath(); ctx.arc(ef.x, ef.y, Math.min(ef.raio * 0.72, (ef.maxRaio || ef.raio) * 0.72), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, " + (ef.alpha * 0.8) + ")";
            ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
    }
};
