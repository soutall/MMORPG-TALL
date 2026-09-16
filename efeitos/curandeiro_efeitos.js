// efeitos/curandeiro_efeitos.js - Habilidades de Cura e Julgamento Divino
window.curasAtivas = [];
window.julgamentosAtivos = [];

// Efeito da Cura Divina
window.criarAnimacaoCuraDivina = function(x, y, valor) {
    let particulasLuz = [];
    for (let i = 0; i < 20; i++) {
        particulasLuz.push({
            x: x + (Math.random() * 40 - 20),
            y: y + (Math.random() * 20 - 5),
            vy: Math.random() * 1.5 + 1.2,
            vida: 1.0,
            tamanho: Math.random() * 3 + 2
        });
    }

    window.curasAtivas.push({
        x: x,
        y: y,
        raio: 15,
        raioMax: 70,
        alpha: 1.0,
        particulas: particulasLuz
    });

    if (valor !== undefined && valor !== null) {
        window.floatingTexts.push({ x: x, y: y - 25, text: "+" + valor + " HP ✨", color: "#2ecc71", alpha: 1.0 });
    }
};

// Efeito do Julgamento Sagrado (Coluna de Luz)
window.criarAnimacaoJulgamentoSagrado = function(x, y) {
    window.julgamentosAtivos.push({
        x: x,
        y: y,
        alturaRaio: 450,
        largura: 60,
        duracao: 35,
        alpha: 1.0
    });
};

window.desenharEfeitosCurandeiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;

    // Desenha Efeito de Cura
    for (let i = window.curasAtivas.length - 1; i >= 0; i--) {
        let c = window.curasAtivas[i];
        c.raio += 2.0;
        c.alpha -= 0.035;

        if (c.alpha <= 0) {
            window.curasAtivas.splice(i, 1);
        } else {
            ctx.save();
            ctx.strokeStyle = "rgba(46, 204, 113, " + c.alpha + ")";
            ctx.lineWidth = 4;
            ctx.shadowColor = "#2ecc71";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.raio, 0, Math.PI * 2);
            ctx.stroke();

            // Partículas flutuando para o céu
            for (let p of c.particulas) {
                p.y -= p.vy;
                p.vida -= 0.04;
                ctx.fillStyle = "rgba(241, 196, 15, " + Math.max(0, p.vida) + ")";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // Desenha Coluna de Julgamento Celeste
    for (let i = window.julgamentosAtivos.length - 1; i >= 0; i--) {
        let j = window.julgamentosAtivos[i];
        j.duracao--;
        j.alpha = j.duracao / 35;

        if (j.duracao <= 0) {
            window.julgamentosAtivos.splice(i, 1);
        } else {
            ctx.save();
            // Coluna de luz caindo do topo da tela
            let grad = ctx.createLinearGradient(j.x, j.y - j.alturaRaio, j.x, j.y);
            grad.addColorStop(0, "rgba(255, 255, 255, 0)");
            grad.addColorStop(0.3, "rgba(241, 196, 15, " + (j.alpha * 0.7) + ")");
            grad.addColorStop(1, "rgba(255, 255, 255, " + j.alpha + ")");

            ctx.fillStyle = grad;
            ctx.shadowColor = "#f1c40f";
            ctx.shadowBlur = 20;
            ctx.fillRect(j.x - j.largura / 2, j.y - j.alturaRaio, j.largura, j.alturaRaio);

            // Círculo sagrado no ponto de impacto no chão
            ctx.fillStyle = "rgba(241, 196, 15, " + (j.alpha * 0.4) + ")";
            ctx.beginPath();
            ctx.ellipse(j.x, j.y, 45, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, " + j.alpha + ")";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.restore();
        }
    }
};
