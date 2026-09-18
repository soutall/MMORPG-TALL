// efeitos/barbaro_efeitos.js - Sangue, Aura de Fúria Berserker e Salto Esmagador
window.espilhosSangue = [];
window.aurasBerserker = [];
window.esmagamentosBarbaro = [];
window.girosBarbaro = [];
window.fragmentosBarbaro = [];

window.criarAnimacaoGiroBarbaro = function(id, x, y) {
    let giro = {
        id: id,
        x: x || 0,
        y: y || 0,
        vida: 200,
        tempo: 0,
        trails: [],
        arcos: [],
        particulas: [],
        poeira: [],
        flash: 1,
        ativo: true
    };

    for (let i = 0; i < 18; i++) {
        giro.arcos.push({
            ang: (Math.PI * 2 / 18) * i + Math.random() * 0.9,
            raio: 36 + Math.random() * 52,
            largura: 10 + Math.random() * 18,
            alpha: 0.15 + Math.random() * 0.4,
            fase: Math.random() * 100,
            alongado: Math.random() > 0.5,
            arrasto: Math.random() * 0.8 + 0.2,
            brilho: 0.8 + Math.random() * 1.5
        });
    }

    for (let i = 0; i < 42; i++) {
        giro.particulas.push({
            x: giro.x + (Math.random() - 0.5) * 22,
            y: giro.y + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 4.5,
            vy: (Math.random() - 0.5) * 3.5,
            life: 1,
            maxLife: 1,
            size: 1.5 + Math.random() * 3.5,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.25,
            alpha: 0.7 + Math.random() * 0.3,
            cor: Math.random() > 0.7 ? '#fff0d6' : Math.random() > 0.45 ? '#ff7a4d' : '#9d0b0f'
        });
    }

    for (let i = 0; i < 18; i++) {
        giro.poeira.push({
            x: giro.x + (Math.random() - 0.5) * 14,
            y: giro.y + 18 + Math.random() * 9,
            vx: (Math.random() - 0.5) * 2.2,
            vy: -Math.random() * 1.8,
            r: 5 + Math.random() * 8,
            life: 0.7 + Math.random() * 0.8,
            maxLife: 0.7 + Math.random() * 0.8,
            alpha: 0.6 + Math.random() * 0.3,
            cor: 'rgba(118, 74, 48, '
        });
    }

    window.girosBarbaro.push(giro);
};

window.finalizarAnimacaoGiroBarbaro = function(id) {
    let giro = window.girosBarbaro.find(g => g.id === id);
    if (giro) {
        giro.vida = 30;
        giro.flash = 1.4;
    }
};

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

    for (let i = window.girosBarbaro.length - 1; i >= 0; i--) {
        let giro = window.girosBarbaro[i];
        giro.tempo += 1;
        giro.vida -= 1;
        giro.flash = Math.max(0, giro.flash - 0.02);

        let pj = (giro.id === window.meuId) ? { x: window.meuX, y: window.meuY } : (window.todosJogadores && window.todosJogadores[giro.id] ? window.todosJogadores[giro.id] : null);
        if (pj) {
            giro.x = pj.x + 12;
            giro.y = pj.y + 16;
        }

        ctx.save();
        ctx.translate(giro.x, giro.y);

        let t = giro.tempo * 0.18;
        for (let a of giro.arcos) {
            let ang = a.ang + t * (a.alongado ? 1.8 : 1.2);
            let raio = a.raio + Math.sin(t + a.fase) * 12;
            let pulse = 1 + Math.sin((giro.tempo + a.fase) * 0.25) * 0.16;
            ctx.beginPath();
            ctx.arc(0, 0, raio * pulse, ang - 0.18, ang + (a.alongado ? 0.65 : 0.42));
            ctx.strokeStyle = 'rgba(115, 8, 8, ' + a.alpha + ')';
            ctx.lineWidth = a.largura * 0.9;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, raio * 0.72, ang + 0.05, ang + (a.alongado ? 0.52 : 0.36));
            ctx.strokeStyle = 'rgba(255, 69, 38, ' + (a.alpha * 1.3) + ')';
            ctx.lineWidth = Math.max(1.2, a.largura * 0.45);
            ctx.stroke();
        }

        let trailCount = 6;
        for (let j = 0; j < trailCount; j++) {
            let ang = t * (1.5 + j * 0.5) + j * 0.7;
            let len = 20 + j * 12 + Math.sin(giro.tempo * 0.12 + j) * 8;
            let x1 = Math.cos(ang) * (18 + j * 2);
            let y1 = Math.sin(ang) * (12 + j * 2);
            let x2 = Math.cos(ang) * (len + 18 + j * 2);
            let y2 = Math.sin(ang) * (len * 0.35 + 12 + j * 2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(x1 + (x2 - x1) * 0.5, y1 + (y2 - y1) * 0.5, x2, y2);
            ctx.strokeStyle = 'rgba(' + (j < 2 ? '255,120,80' : '160,18,18') + ', ' + (0.2 + j * 0.08) + ')';
            ctx.lineWidth = 6 - j;
            ctx.stroke();
        }

        for (let p of giro.particulas) {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.025;
            p.rot += p.rotSpeed;
            p.vy += 0.02;
            if (p.life <= 0) continue;
            ctx.save();
            ctx.translate(p.x - giro.x, p.y - giro.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.cor.replace(')', ', ' + (Math.max(0.08, p.life * 0.7)) + ')');
            ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 2.2);
            ctx.restore();
        }

        for (let p of giro.poeira) {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.012;
            p.alpha -= 0.005;
            if (p.life <= 0) continue;
            ctx.fillStyle = p.cor + p.alpha + ')';
            ctx.beginPath();
            ctx.arc(p.x - giro.x, p.y - giro.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        if (giro.vida <= 0 || !giro.ativo) {
            window.girosBarbaro.splice(i, 1);
        }
    }

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
