'use strict';

(function (global) {
    function desenharSombraSolarJogador(ctx, x, y, horaDecimal) {
        const hora = Number(horaDecimal);
        if (!ctx || !Number.isFinite(hora) || hora < 6 || hora >= 18) return false;

        const progresso = (hora - 6) / 12;
        const elevacaoSolar = Math.sin(progresso * Math.PI);
        const comprimento = 32 + (1 - elevacaoSolar) * 58;
        const angulo = progresso * Math.PI;
        const transicao = Math.min(1, progresso * 2, (1 - progresso) * 2);
        const deslocamentoX = Math.cos(angulo) * comprimento;
        const deslocamentoY = Math.sin(angulo) * comprimento * 1.5;

        ctx.save();
        ctx.globalAlpha = transicao * (0.48 + (1 - elevacaoSolar) * 0.2);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(
            x + deslocamentoX,
            y + deslocamentoY,
            26 + comprimento * 0.22,
            9 + comprimento * 0.11,
            angulo,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
        return true;
    }

    global.desenharSombraSolarJogador = desenharSombraSolarJogador;
})(window);
