// efeitos/arqueiro_efeitos.js - Renderização de magias e projéteis do Arqueiro
window.chuvasFlechas = [];
window.flechasPerfurantes = [];

window.criarAnimacaoChuvaFlechas = function(x, y) {
    let flechas = [];
    for (let i = 0; i < 28; i++) {
        flechas.push({
            x: x + (Math.random() * 110 - 55),
            y: y - 220 - (Math.random() * 120),
            targetY: y + (Math.random() * 60 - 30),
            velocidade: Math.random() * 4 + 11,
            caiu: false
        });
    }
    window.chuvasFlechas.push({
        x: x,
        y: y,
        duracao: 140,
        flechas: flechas
    });
    window.floatingTexts.push({ x: x, y: y - 35, text: "🏹 CHUVA DE FLECHAS!", color: "#1abc9c", alpha: 1.0 });
};

window.criarAnimacaoDisparoPerfurante = function(x, y, vx, vy, angulo) {
    window.flechasPerfurantes.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        angulo: angulo,
        vida: 40,
        rastro: []
    });
};

window.desenharEfeitosArqueiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;

    // Chuva de Flechas
    for (let i = window.chuvasFlechas.length - 1; i >= 0; i--) {
        let chuva = window.chuvasFlechas[i];
        chuva.duracao--;

        ctx.save();
        // Círculo no solo
        ctx.fillStyle = "rgba(26, 188, 156, 0.18)";
        ctx.beginPath();
        ctx.arc(chuva.x, chuva.y, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(46, 204, 113, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flechas caindo
        chuva.flechas.forEach(f => {
            if (!f.caiu) {
                f.y += f.velocidade;
                ctx.strokeStyle = "#f39c12";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(f.x, f.y);
                ctx.lineTo(f.x, f.y - 14);
                ctx.stroke();

                if (f.y >= f.targetY) {
                    f.caiu = true;
                }
            } else {
                ctx.fillStyle = "rgba(243, 156, 18, 0.4)";
                ctx.beginPath();
                ctx.arc(f.x, f.targetY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        if (chuva.duracao <= 0) {
            window.chuvasFlechas.splice(i, 1);
        }
    }

    // Disparo Perfurante
    for (let i = window.flechasPerfurantes.length - 1; i >= 0; i--) {
        let f = window.flechasPerfurantes[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vida--;

        f.rastro.push({ x: f.x, y: f.y, alpha: 1.0 });

        ctx.save();
        for (let r of f.rastro) {
            r.alpha -= 0.08;
            ctx.fillStyle = "rgba(26, 188, 156, " + r.alpha + ")";
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(f.x, f.y);
        ctx.rotate(f.angulo);
        ctx.fillStyle = "#1abc9c";
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 12;
        ctx.fillRect(-16, -2, 32, 4);
        ctx.restore();

        if (f.vida <= 0) {
            window.flechasPerfurantes.splice(i, 1);
        }
    }
};
