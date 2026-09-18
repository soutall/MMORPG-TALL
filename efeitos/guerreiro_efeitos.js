// efeitos/guerreiro_efeitos.js - Efeitos Visuais do Guerreiro
// Habilidade: Grito de Provocação (Onda de pressão, fendas, poeira, detritos de terra, distorção)
// Habilidade: Cura Vital 20% (Coluna de luz, partículas ascendentes, runas e contração de energia)
// Feedback de Provocação nos Monstros e Bosses

window.ondasGritoProvocacao = [];
window.curasGuerreiro = [];

// Inicia a animação completa do Grito de Provocação
window.criarAnimacaoGritoProvocacao = function(id, x, y) {
    let pX = x;
    let pY = y;

    // 1. Onda de Choque Principal Multicamadas
    let particulasPedras = [];
    let particulasPoeira = [];
    let faiscasChoque = [];

    // Detritos de terra e rocha voando radialmente
    let qtdPedras = 22;
    for (let i = 0; i < qtdPedras; i++) {
        let ang = (i / qtdPedras) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        let vel = 3.5 + Math.random() * 6.5;
        particulasPedras.push({
            x: pX,
            y: pY,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel * 0.7 - (1.2 + Math.random() * 2.0), // leve elevação física
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.28,
            tam: 3.0 + Math.random() * 4.5,
            vida: 1.0,
            decaimento: 0.024 + Math.random() * 0.015,
            cor: ['#4a3728', '#6e5039', '#8b694b', '#2c1e13', '#a07855'][Math.floor(Math.random() * 5)]
        });
    }

    // Nuvens de poeira levantadas do chão
    let qtdPoeira = 26;
    for (let i = 0; i < qtdPoeira; i++) {
        let ang = (i / qtdPoeira) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        let vel = 2.2 + Math.random() * 5.0;
        particulasPoeira.push({
            x: pX,
            y: pY + 6,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel * 0.65,
            raio: 6 + Math.random() * 8,
            crescimento: 0.55 + Math.random() * 0.4,
            vida: 1.0,
            decaimento: 0.028 + Math.random() * 0.018,
            cor: ['rgba(215, 185, 140, ', 'rgba(180, 155, 120, ', 'rgba(195, 170, 130, '][Math.floor(Math.random() * 3)]
        });
    }

    // Faíscas e raios energéticos de alta velocidade na crista da onda
    let qtdFaiscas = 32;
    for (let i = 0; i < qtdFaiscas; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = 5.0 + Math.random() * 8.5;
        faiscasChoque.push({
            x: pX,
            y: pY,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel * 0.8,
            comprimento: 6 + Math.random() * 10,
            vida: 1.0,
            decaimento: 0.038 + Math.random() * 0.03,
            cor: (Math.random() > 0.3) ? '#f39c12' : '#ffffff'
        });
    }

    // Fendas no piso (raios angulares de rachadura)
    let fendasSolo = [];
    for (let i = 0; i < 14; i++) {
        let ang = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        let dist = 60 + Math.random() * 90;
        fendasSolo.push({
            x1: pX + Math.cos(ang) * 18,
            y1: pY + Math.sin(ang) * 12,
            x2: pX + Math.cos(ang) * dist,
            y2: pY + Math.sin(ang) * (dist * 0.65)
        });
    }

    window.ondasGritoProvocacao.push({
        id: id,
        x: pX,
        y: pY,
        progresso: 0,
        duracao: 38, // ~0.65 segundo a 60fps
        raioMax: 300,
        pedras: particulasPedras,
        poeira: particulasPoeira,
        faiscas: faiscasChoque,
        fendas: fendasSolo
    });

    // Tremor de tela dramático
    window.tremorTela = Math.max(window.tremorTela || 0, 7);

    // Texto de alerta de habilidade
    if (id === window.meuId) {
        window.floatingTexts.push({
            x: pX,
            y: pY - 36,
            text: "📢 GRITO DE PROVOCAÇÃO!",
            color: "#f39c12",
            alpha: 1.0
        });
    }
};

// Inicia o efeito visual de Cura Vital (20% HP) - Totalmente distinto da onda de choque
window.criarAnimacaoCuraGuerreiro = function(id, x, y, valorCura) {
    let pX = x;
    let pY = y;

    // Partículas de luz esmeralda e dourada subindo em espiral
    let particulasLuz = [];
    for (let i = 0; i < 28; i++) {
        let ang = Math.random() * Math.PI * 2;
        let dist = Math.random() * 26;
        particulasLuz.push({
            x: pX + Math.cos(ang) * dist,
            y: pY + 12 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 0.7,
            vy: -(1.8 + Math.random() * 2.8), // sobe em direção ao céu
            raio: 2.2 + Math.random() * 2.8,
            vida: 1.0,
            decaimento: 0.022 + Math.random() * 0.015,
            cor: (Math.random() > 0.4) ? '#2ecc71' : '#f1c40f',
            espiralOffset: Math.random() * Math.PI * 2
        });
    }

    // Runas de vitalidade ascendentes
    let runasSimbolos = ['ᛟ', '✦', '✚', '✧', 'ᛏ'];
    let runas = [];
    for (let i = 0; i < 6; i++) {
        let ang = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
        let dist = 14 + Math.random() * 18;
        runas.push({
            simbolo: runasSimbolos[i % runasSimbolos.length],
            x: pX + Math.cos(ang) * dist,
            y: pY + 14,
            vy: -(1.2 + Math.random() * 1.4),
            alpha: 1.0,
            tamanho: 13 + Math.floor(Math.random() * 4),
            cor: (i % 2 === 0) ? '#2ecc71' : '#f1c40f'
        });
    }

    // Feixes de energia em contração convergindo para o peitoral do guerreiro
    let feixesContracao = [];
    for (let i = 0; i < 10; i++) {
        let ang = (i / 10) * Math.PI * 2;
        let distOrigem = 55 + Math.random() * 25;
        feixesContracao.push({
            ang: ang,
            distAtual: distOrigem,
            velContracao: 2.8 + Math.random() * 2.2,
            tam: 3.5,
            vida: 1.0,
            decaimento: 0.035
        });
    }

    window.curasGuerreiro.push({
        id: id,
        x: pX,
        y: pY,
        tick: 0,
        duracao: 48,
        luzes: particulasLuz,
        runas: runas,
        feixes: feixesContracao
    });

    // Texto flutuante verde esmeralda de cura
    if (typeof valorCura === 'number' && valorCura > 0) {
        window.floatingTexts.push({
            x: pX,
            y: pY - 20,
            text: "+" + valorCura + " HP",
            color: "#2ecc71",
            alpha: 1.0
        });
    }
};

// Loop principal de renderização de todos os efeitos visuais do Guerreiro
window.desenharEfeitosGuerreiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;

    // =========================================================================
    // 1. RENDERIZAÇÃO DAS ONDAS DE PRESSÃO E CHOQUE DO GRITO
    // =========================================================================
    for (let i = window.ondasGritoProvocacao.length - 1; i >= 0; i--) {
        let onda = window.ondasGritoProvocacao[i];
        onda.progresso += 1 / onda.duracao;

        if (onda.progresso >= 1.0) {
            window.ondasGritoProvocacao.splice(i, 1);
            continue;
        }

        let p = onda.progresso;
        let alphaGeral = 1.0 - p;
        let easeOut = 1 - Math.pow(1 - p, 3); // Expansão explosiva rápida que desacelera
        let raioAtual = easeOut * onda.raioMax;

        ctx.save();

        // 1.1 Fendas no solo desenhadas sob perspectiva do piso
        if (onda.fendas && p < 0.75) {
            let alphaFendas = (1.0 - (p / 0.75)) * 0.85;
            ctx.strokeStyle = "rgba(40, 25, 12, " + alphaFendas + ")";
            ctx.lineWidth = Math.max(1, 3.0 * (1 - p));
            ctx.beginPath();
            for (let f of onda.fendas) {
                ctx.moveTo(f.x1, f.y1);
                ctx.lineTo(f.x2, f.y2);
            }
            ctx.stroke();

            // Brilho alaranjado dentro das fendas recém-abertas
            if (p < 0.45) {
                ctx.strokeStyle = "rgba(243, 156, 18, " + (alphaFendas * 0.7) + ")";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // 1.2 Onda de Choque Interna (Distorção & Pressão Sônica)
        let raioInterno = raioAtual * 0.72;
        if (raioInterno > 8) {
            ctx.beginPath();
            ctx.ellipse(onda.x, onda.y + 4, raioInterno, raioInterno * 0.62, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(243, 156, 18, " + (alphaGeral * 0.45) + ")";
            ctx.lineWidth = 4 * (1 - p);
            ctx.stroke();
        }

        // 1.3 Onda de Choque Principal (Crista de Alta Pressão)
        ctx.beginPath();
        ctx.ellipse(onda.x, onda.y + 6, raioAtual, raioAtual * 0.65, 0, 0, Math.PI * 2);
        
        // Borda externa viva dourada e quente
        ctx.strokeStyle = "rgba(255, 215, 0, " + (alphaGeral * 0.9) + ")";
        ctx.lineWidth = Math.max(1.5, 8.0 * (1 - p));
        ctx.stroke();

        // Núcleo branco puro na frente de expansão
        ctx.beginPath();
        ctx.ellipse(onda.x, onda.y + 6, raioAtual - 2, (raioAtual - 2) * 0.65, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, " + (alphaGeral * 0.95) + ")";
        ctx.lineWidth = Math.max(1, 3.5 * (1 - p));
        ctx.stroke();

        // Anel concêntrico extra de reverberação sonora
        let raioEco = raioAtual * 0.45;
        if (raioEco > 5) {
            ctx.beginPath();
            ctx.ellipse(onda.x, onda.y + 4, raioEco, raioEco * 0.62, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(230, 126, 34, " + (alphaGeral * 0.5) + ")";
            ctx.lineWidth = 2.5 * (1 - p);
            ctx.stroke();
        }

        // 1.4 Raios de pressão sônica explodindo do centro
        if (p < 0.4) {
            let alphaRaios = (1 - (p / 0.4)) * 0.7;
            ctx.strokeStyle = "rgba(255, 230, 120, " + alphaRaios + ")";
            ctx.lineWidth = 2.2;
            let qtdRaios = 12;
            ctx.beginPath();
            for (let r = 0; r < qtdRaios; r++) {
                let angRaio = (r / qtdRaios) * Math.PI * 2;
                let r1 = 12;
                let r2 = raioAtual * 0.85;
                ctx.moveTo(onda.x + Math.cos(angRaio) * r1, onda.y + Math.sin(angRaio) * (r1 * 0.65));
                ctx.lineTo(onda.x + Math.cos(angRaio) * r2, onda.y + Math.sin(angRaio) * (r2 * 0.65));
            }
            ctx.stroke();
        }

        // 1.5 Renderização das Nuvens de Poeira
        for (let j = onda.poeira.length - 1; j >= 0; j--) {
            let poe = onda.poeira[j];
            poe.x += poe.vx;
            poe.y += poe.vy;
            poe.vx *= 0.92; // atrito do ar
            poe.vy *= 0.92;
            poe.raio += poe.crescimento;
            poe.vida -= poe.decaimento;

            if (poe.vida > 0) {
                ctx.fillStyle = poe.cor + (poe.vida * 0.45) + ")";
                ctx.beginPath();
                ctx.arc(poe.x, poe.y, poe.raio, 0, Math.PI * 2);
                ctx.fill();
            } else {
                onda.poeira.splice(j, 1);
            }
        }

        // 1.6 Renderização dos Fragmentos e Detritos de Rocha/Terra
        for (let j = onda.pedras.length - 1; j >= 0; j--) {
            let ped = onda.pedras[j];
            ped.x += ped.vx;
            ped.y += ped.vy;
            ped.vy += 0.24; // Gravidade puxando para baixo
            ped.vx *= 0.96;
            ped.rot += ped.vRot;
            ped.vida -= ped.decaimento;

            if (ped.vida > 0) {
                ctx.save();
                ctx.translate(ped.x, ped.y);
                ctx.rotate(ped.rot);
                ctx.globalAlpha = Math.min(1.0, ped.vida * 1.5);
                ctx.fillStyle = ped.cor;

                // Forma facetada de pedra
                let t = ped.tam;
                ctx.beginPath();
                ctx.moveTo(-t * 0.6, -t * 0.5);
                ctx.lineTo(t * 0.7, -t * 0.4);
                ctx.lineTo(t * 0.5, t * 0.6);
                ctx.lineTo(-t * 0.5, t * 0.5);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            } else {
                onda.pedras.splice(j, 1);
            }
        }

        // 1.7 Faíscas energéticas de choque
        for (let j = onda.faiscas.length - 1; j >= 0; j--) {
            let f = onda.faiscas[j];
            f.x += f.vx;
            f.y += f.vy;
            f.vx *= 0.94;
            f.vy *= 0.94;
            f.vida -= f.decaimento;

            if (f.vida > 0) {
                ctx.strokeStyle = f.cor;
                ctx.globalAlpha = f.vida;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(f.x, f.y);
                ctx.lineTo(f.x - f.vx * 1.6, f.y - f.vy * 1.6);
                ctx.stroke();
            } else {
                onda.faiscas.splice(j, 1);
            }
        }

        ctx.restore();
    }

    // =========================================================================
    // 2. RENDERIZAÇÃO DO EFEITO DE CURA VITAL (20% HP)
    // =========================================================================
    for (let i = window.curasGuerreiro.length - 1; i >= 0; i--) {
        let cura = window.curasGuerreiro[i];
        cura.tick++;

        // Atualiza posição dinamicamente com o jogador se ele estiver andando
        let guerreiroRef = (cura.id === window.meuId) ? { x: window.meuX + 12, y: window.meuY + 16 } : (window.todosJogadores && window.todosJogadores[cura.id] ? { x: window.todosJogadores[cura.id].x + 12, y: window.todosJogadores[cura.id].y + 16 } : null);
        if (guerreiroRef) {
            cura.x = guerreiroRef.x;
            cura.y = guerreiroRef.y;
        }

        if (cura.tick >= cura.duracao) {
            window.curasGuerreiro.splice(i, 1);
            continue;
        }

        let prog = cura.tick / cura.duracao;
        let alpha = Math.sin(prog * Math.PI); // fade in e fade out suave

        ctx.save();

        // 2.1 Coluna de luz vital vertical ascendente
        let grad = ctx.createLinearGradient(cura.x, cura.y + 20, cura.x, cura.y - 48);
        grad.addColorStop(0, "rgba(46, 204, 113, " + (alpha * 0.45) + ")");
        grad.addColorStop(0.5, "rgba(241, 196, 15, " + (alpha * 0.3) + ")");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cura.x, cura.y - 12, 22, 38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Brilho no chão na base da coluna de cura
        ctx.fillStyle = "rgba(46, 204, 113, " + (alpha * 0.4) + ")";
        ctx.beginPath();
        ctx.ellipse(cura.x, cura.y + 14, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2.2 Feixes de energia convergindo para o centro (contração vital)
        for (let fb of cura.feixes) {
            fb.distAtual -= fb.velContracao;
            fb.vida -= fb.decaimento;
            if (fb.distAtual > 4 && fb.vida > 0) {
                let fx = cura.x + Math.cos(fb.ang) * fb.distAtual;
                let fy = cura.y + Math.sin(fb.ang) * (fb.distAtual * 0.7);
                ctx.fillStyle = "rgba(46, 204, 113, " + (fb.vida * 0.85) + ")";
                ctx.beginPath();
                ctx.arc(fx, fy, fb.tam, 0, Math.PI * 2);
                ctx.fill();

                // Rastro do feixe convergente
                let fxAnt = cura.x + Math.cos(fb.ang) * (fb.distAtual + 8);
                let fyAnt = cura.y + Math.sin(fb.ang) * ((fb.distAtual + 8) * 0.7);
                ctx.strokeStyle = "rgba(241, 196, 15, " + (fb.vida * 0.6) + ")";
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.lineTo(fxAnt, fyAnt);
                ctx.stroke();
            }
        }

        // 2.3 Partículas de luz subindo em espiral
        for (let j = cura.luzes.length - 1; j >= 0; j--) {
            let p = cura.luzes[j];
            p.y += p.vy;
            p.x += p.vx + Math.sin((cura.tick * 0.2) + p.espiralOffset) * 0.8;
            p.vida -= p.decaimento;

            if (p.vida > 0) {
                ctx.fillStyle = p.cor;
                ctx.globalAlpha = p.vida * alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
                ctx.fill();
            } else {
                cura.luzes.splice(j, 1);
            }
        }

        // 2.4 Runas místicas de vitalidade subindo
        ctx.textAlign = "center";
        for (let r of cura.runas) {
            r.y += r.vy;
            r.alpha -= 0.022;
            if (r.alpha > 0) {
                ctx.font = "bold " + r.tamanho + "px 'Cinzel', serif, sans-serif";
                ctx.fillStyle = r.cor;
                ctx.globalAlpha = Math.max(0, r.alpha * alpha);
                ctx.fillText(r.simbolo, r.x, r.y);
            }
        }

        ctx.restore();
    }

    // =========================================================================
    // 3. FEEDBACK VISUAL DE PROVOCAÇÃO NOS MONSTROS E BOSSES
    // =========================================================================
    desenharMarcadoresProvocacao(ctx);
};

// Renderiza anel de aggro e marcador de fúria nos mobs/bosses provocados
function desenharMarcadoresProvocacao(ctx) {
    let agora = Date.now();

    // 1. Monstros comuns (slimes)
    if (window.listaSlimes && window.listaSlimes.length > 0) {
        for (let s of window.listaSlimes) {
            if (s.hp > 0 && s.tauntTimer > 0) {
                desenharAuraAggroMonstro(ctx, s.x, s.y, 16, s.tauntTimer, 200, agora, false);
            }
        }
    }

    // 2. Bosses (ex: Golem de Pedra)
    if (window.bosses && window.bosses.length > 0) {
        for (let b of window.bosses) {
            if (b.hp > 0 && b.tauntTimer > 0) {
                desenharAuraAggroMonstro(ctx, b.x, b.y, 44, b.tauntTimer, 100, agora, true);
            }
        }
    }
}

// Desenha o marcador de aggro 💢 e anel no solo
function desenharAuraAggroMonstro(ctx, x, y, raioBase, tauntAtual, tauntTotal, agora, isBoss) {
    ctx.save();

    let pulso = Math.sin(agora / 90) * 3;
    let raio = (raioBase + 8) + pulso;
    let alpha = 0.75 + Math.sin(agora / 110) * 0.25;

    // Anel carmesim de provocação no solo sob o monstro
    ctx.beginPath();
    ctx.ellipse(x, y + (isBoss ? 16 : 10), raio, raio * 0.55, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(231, 76, 60, " + alpha + ")";
    ctx.lineWidth = isBoss ? 3.5 : 2.2;
    ctx.stroke();

    // Pontas de seta/garras de aggro no anel
    let qtdPontas = isBoss ? 6 : 4;
    let angRot = agora / 400;
    ctx.fillStyle = "#e74c3c";
    for (let i = 0; i < qtdPontas; i++) {
        let a = angRot + (i / qtdPontas) * Math.PI * 2;
        let px = x + Math.cos(a) * raio;
        let py = y + (isBoss ? 16 : 10) + Math.sin(a) * (raio * 0.55);
        ctx.beginPath();
        ctx.arc(px, py, isBoss ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Marcador overhead de provocação (ícone 💢 pulsante)
    let altY = isBoss ? (y - 85) : (y - 32);
    let flutua = Math.sin(agora / 130) * 3;
    
    ctx.textAlign = "center";
    ctx.font = isBoss ? "bold 20px Arial" : "bold 15px Arial";
    ctx.fillStyle = "#e74c3c";
    ctx.fillText("💢", x, altY + flutua);

    // Barra minúscula de tempo restante de provocação logo abaixo do ícone
    let larguraBarra = isBoss ? 32 : 22;
    let pctRestante = Math.max(0, Math.min(1.0, tauntAtual / tauntTotal));
    let bx = x - larguraBarra / 2;
    let by = altY + flutua + 4;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(bx, by, larguraBarra, 3);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(bx, by, larguraBarra * pctRestante, 3);

    ctx.restore();
}
