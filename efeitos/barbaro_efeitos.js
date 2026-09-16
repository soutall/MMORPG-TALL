// efeitos/barbaro_efeitos.js - Sangue, Aura de Fúria Berserker e Salto Esmagador
window.espilhosSangue = [];
window.aurasBerserker = [];
window.esmagamentosBarbaro = [];

// Efeito de espirro de sangue quando o machado atinge o monstro
window.criarAnimacaoSangue = function(x, y) {
    let gotas = [];
    for (let i = 0; i < 30; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = Math.random() * 5.2 + 1.8;
        gotas.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel,
            tamanho: Math.random() * 4.2 + 2.2,
            vida: 1.2
        });
    }
    window.espilhosSangue.push({ gotas: gotas });
};

// Efeito de ativação da Fúria Berserker (Aura avermelhada com vapores de sangue)
window.criarAnimacaoFuriaBerserker = function(id) {
    window.aurasBerserker.push({
        id: id,
        duracao: 120, // 6 segundos
        particulas: []
    });
    if (window.meuId === id) {
        window.floatingTexts.push({ x: window.meuX + 12, y: window.meuY - 35, text: "🩸 FÚRIA BERSERKER!", color: "#e74c3c", alpha: 1.0 });
        window.tremorTela = 8;
    }
};

// Efeito de impacto do Salto Esmagador (Cratera de terra e sangue)
window.criarAnimacaoEsmagamentoBarbaro = function(x, y) {
    window.esmagamentosBarbaro.push({
        x: x,
        y: y,
        raio: 8,
        raioMax: 70,
        alpha: 1.0
    });
    window.criarAnimacaoSangue(x, y);
};

window.desenharEfeitosBarbaro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;

    // 1. Desenho dos Espirros de Sangue
    for (let i = window.espilhosSangue.length - 1; i >= 0; i--) {
        let grupo = window.espilhosSangue[i];
        let vivo = false;

        ctx.save();
        for (let g of grupo.gotas) {
            g.x += g.vx;
            g.y += g.vy;
            g.vy += 0.15; // Gravidade puxando o sangue para baixo
            g.vida -= 0.04;

            if (g.vida > 0) {
                vivo = true;
                ctx.fillStyle = "rgba(180, 10, 10, " + g.vida + ")";
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        if (!vivo) {
            window.espilhosSangue.splice(i, 1);
        }
    }

    // 2. Desenho das Auras Berserker nos Guerreiros em Fúria
    for (let i = window.aurasBerserker.length - 1; i >= 0; i--) {
        let aura = window.aurasBerserker[i];
        aura.duracao--;

        let jogador = (aura.id === window.meuId) ? { x: window.meuX, y: window.meuY } : window.todosJogadores[aura.id];
        if (jogador && aura.duracao > 0) {
            ctx.save();
            let pX = jogador.x + 12;
            let pY = jogador.y + 16;

            // Pulso carmesim em volta do corpo
            let raioPulso = 20 + Math.sin(Date.now() / 100) * 5;
            ctx.fillStyle = "rgba(192, 57, 43, 0.25)";
            ctx.beginPath();
            ctx.arc(pX, pY, raioPulso, 0, Math.PI * 2);
            ctx.fill();

            // Vapores de sangue subindo
            if (Math.random() > 0.4) {
                aura.particulas.push({
                    x: pX + (Math.random() * 26 - 13),
                    y: pY + 10,
                    vy: Math.random() * 2 + 1,
                    vida: 1.0,
                    tamanho: Math.random() * 3 + 2
                });
            }

            for (let j = aura.particulas.length - 1; j >= 0; j--) {
                let part = aura.particulas[j];
                part.y -= part.vy;
                part.vida -= 0.05;
                if (part.vida <= 0) {
                    aura.particulas.splice(j, 1);
                } else {
                    ctx.fillStyle = "rgba(231, 76, 60, " + part.vida + ")";
                    ctx.shadowColor = "#c0392b";
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(part.x, part.y, part.tamanho, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        } else {
            window.aurasBerserker.splice(i, 1);
        }
    }

    // 3. Desenho do Impacto do Esmagamento
    for (let i = window.esmagamentosBarbaro.length - 1; i >= 0; i--) {
        let e = window.esmagamentosBarbaro[i];
        e.raio += 3.5;
        e.alpha -= 0.045;

        if (e.alpha <= 0) {
            window.esmagamentosBarbaro.splice(i, 1);
        } else {
            ctx.save();
            // Cratera de choque de sangue
            ctx.strokeStyle = "rgba(192, 57, 43, " + e.alpha + ")";
            ctx.lineWidth = 5;
            ctx.shadowColor = "#900c3f";
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.raio, 0, Math.PI * 2);
            ctx.stroke();

            // Rachaduras de sangue no solo
            ctx.fillStyle = "rgba(100, 10, 10, " + (e.alpha * 0.4) + ")";
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.raio * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 4. Smart Cast do Salto Esmagador (Círculo Sangrento com Mira)
    if (window.modoMiraEsmagamento && window.minhaClasse === 'barbaro' && !window.estaMorto) {
        let pX = window.meuX + 12;
        let pY = window.meuY + 16;
        let targetX = pX + Math.cos(window.meuAngulo) * 160;
        let targetY = pY + Math.sin(window.meuAngulo) * 160;

        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "rgba(192, 57, 43, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pX, pY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(192, 57, 43, 0.28)";
        ctx.beginPath();
        ctx.arc(targetX, targetY, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#e74c3c";
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px Arial";
        ctx.shadowBlur = 4;
        ctx.fillText("💀 ESMAGAR (35 DANO)", targetX - 60, targetY + 5);
        ctx.restore();
    }
};
