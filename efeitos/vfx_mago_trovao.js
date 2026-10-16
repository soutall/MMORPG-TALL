(function (global) {
    'use strict';

    const impactos = [];
    const DURACAO = 760;

    function criarRaio(inicio, fim, seed) {
        const dx = fim.x - inicio.x;
        const dy = fim.y - inicio.y;
        const distancia = Math.hypot(dx, dy) || 1;
        const normalX = -dy / distancia;
        const normalY = dx / distancia;
        let valor = seed >>> 0;
        const rand = function () {
            valor = (Math.imul(valor, 1664525) + 1013904223) >>> 0;
            return valor / 4294967296;
        };
        const pontos = [];
        const segmentos = Math.max(5, Math.min(12, Math.ceil(distancia / 28)));
        for (let i = 0; i <= segmentos; i++) {
            const t = i / segmentos;
            const desvio = i === 0 || i === segmentos ? 0 : (rand() - 0.5) * Math.min(42, distancia * 0.2);
            pontos.push({
                x: inicio.x + dx * t + normalX * desvio,
                y: inicio.y + dy * t + normalY * desvio
            });
        }
        return pontos;
    }

    global.criarVfxMagoTrovao = function (alvos) {
        if (!Array.isArray(alvos) || !alvos.length) return;
        const validos = alvos.filter(alvo => Number.isFinite(alvo.x) && Number.isFinite(alvo.y)).slice(0, 4);
        if (!validos.length) return;
        const raios = [];
        const primeiro = validos[0];
        raios.push(criarRaio({ x: primeiro.x, y: primeiro.y - 190 }, primeiro, Date.now()));
        for (let i = 1; i < validos.length; i++) {
            raios.push(criarRaio(validos[i - 1], validos[i], Date.now() + i * 997));
        }
        const particulas = [];
        validos.forEach((alvo, alvoIndex) => {
            for (let i = 0; i < 16; i++) {
                const angulo = Math.random() * Math.PI * 2;
                const velocidade = 0.035 + Math.random() * 0.12;
                particulas.push({
                    x: alvo.x, y: alvo.y - 8,
                    vx: Math.cos(angulo) * velocidade,
                    vy: Math.sin(angulo) * velocidade - 0.045,
                    tamanho: 1.5 + Math.random() * 3,
                    fase: Math.random() * Math.PI * 2,
                    alvoIndex: alvoIndex
                });
            }
        });
        impactos.push({ inicio: performance.now(), alvos: validos, raios: raios, particulas: particulas });
    };

    global.desenharVfxMagoTrovao = function (ctx) {
        const agora = performance.now();
        for (let i = impactos.length - 1; i >= 0; i--) {
            const impacto = impactos[i];
            const idade = agora - impacto.inicio;
            if (idade >= DURACAO) {
                impactos.splice(i, 1);
                continue;
            }
            const progresso = idade / DURACAO;
            const alpha = Math.min(1, (1 - progresso) * 1.8);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha;
            impacto.alvos.forEach(alvo => {
                const raio = 16 + progresso * 34;
                ctx.strokeStyle = 'rgba(255,224,112,' + (0.65 * (1 - progresso)) + ')';
                ctx.lineWidth = 3 - progresso * 2;
                ctx.shadowColor = '#ffd54a';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.ellipse(alvo.x, alvo.y, raio, raio * 0.38, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,246,190,' + (0.48 * (1 - progresso)) + ')';
                ctx.beginPath();
                ctx.arc(alvo.x, alvo.y - 8, Math.max(1, 13 - progresso * 13), 0, Math.PI * 2);
                ctx.fill();
            });
            impacto.raios.forEach((pontos, raioIndex) => {
                if (progresso > 0.58 && raioIndex > 0) return;
                ctx.beginPath();
                pontos.forEach((ponto, pontoIndex) => {
                    if (pontoIndex === 0) ctx.moveTo(ponto.x, ponto.y);
                    else ctx.lineTo(ponto.x, ponto.y);
                });
                ctx.strokeStyle = '#ffc928';
                ctx.lineWidth = 8 - progresso * 5;
                ctx.shadowColor = '#ffb300';
                ctx.shadowBlur = 26;
                ctx.stroke();
                ctx.strokeStyle = '#fff8d1';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#fff3b0';
                ctx.shadowBlur = 12;
                ctx.stroke();
            });
            impacto.particulas.forEach(particula => {
                const destino = impacto.alvos[particula.alvoIndex];
                const tempo = idade * 0.18;
                const x = destino.x + particula.vx * tempo * 4;
                const y = destino.y - 8 + particula.vy * tempo * 4 + (tempo * tempo * 0.015);
                ctx.fillStyle = particula.fase < progresso * Math.PI * 2 ? '#fff8d1' : '#ffc928';
                ctx.shadowColor = '#ffbf28';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(x, y, particula.tamanho * (1 - progresso * 0.55), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
    };
})(window);
