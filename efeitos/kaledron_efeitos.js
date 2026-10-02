// efeitos/kaledron_efeitos.js — VFX do GUERREIRO KALEDRON (Magma Knight)
// Habilidades: Golpe Fulminante · Impacto Terrestre · Redemoinho de Aço · Brado de Guerra Vulcânico
(function () {
    'use strict';

    window.kaledronOndasMagma = window.kaledronOndasMagma || [];
    window.kaledronCrateras = window.kaledronCrateras || [];
    window.kaledronRedemoinhos = window.kaledronRedemoinhos || [];
    window.kaledronBrados = window.kaledronBrados || [];
    window.kaledronFlashes = window.kaledronFlashes || [];

    function _agora() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    // Flash luminoso
    window.criarFlashKaledron = function (x, y, cor, raio) {
        window.kaledronFlashes.push({
            x: x,
            y: y,
            cor: cor || '#ff5722',
            raio: raio || 12,
            inicio: _agora(),
            dur: 280
        });
    };

    /* =========================================================================
       1. GOLPE FULMINANTE (slash_strike) — Onda Cortante de Magma
       ========================================================================= */
    window.criarAnimacaoGolpeFulminanteKaledron = function (id, x, y, angulo) {
        let dur = 550;
        if (typeof window.registrarKaledronAnim === 'function') {
            window.registrarKaledronAnim(id, 'ataque', 420);
        }

        let ang = angulo || 0;
        let onda = {
            id: id,
            x: x,
            y: y,
            ang: ang,
            inicio: _agora(),
            dur: dur,
            distMax: 140,
            largura: 54,
            particulas: []
        };

        for (let i = 0; i < 18; i++) {
            onda.particulas.push({
                offset: (Math.random() - 0.5) * 40,
                tam: 1.5 + Math.random() * 2.5,
                vida: 1.0,
                cor: Math.random() > 0.4 ? '#ff5722' : '#fdcb6e'
            });
        }

        window.kaledronOndasMagma.push(onda);
        window.criarFlashKaledron(x, y, '#ff7675', 24);
    };

    /* =========================================================================
       2. IMPACTO TERRESTRE (ground_slam) — Cratera Vulcânica com Erupção (Raio 110px)
       ========================================================================= */
    window.criarAnimacaoImpactoTerrestreKaledron = function (id, x, y, raio) {
        let r = raio || 110;
        let dur = 1500;
        if (typeof window.registrarKaledronAnim === 'function') {
            window.registrarKaledronAnim(id, 'impacto', 700);
        }

        let cratera = {
            id: id,
            x: x,
            y: y,
            raio: r,
            inicio: _agora(),
            dur: dur,
            fissuras: [],
            debris: []
        };

        // Fissuras radiantes
        for (let i = 0; i < 9; i++) {
            let a = (Math.PI * 2 / 9) * i + (Math.random() - 0.5) * 0.4;
            let comp = r * (0.6 + Math.random() * 0.45);
            cratera.fissuras.push({
                ang: a,
                comp: comp,
                pontos: [
                    { r: comp * 0.3, dev: (Math.random() - 0.5) * 16 },
                    { r: comp * 0.7, dev: (Math.random() - 0.5) * 22 },
                    { r: comp, dev: (Math.random() - 0.5) * 8 }
                ]
            });
        }

        // Estilhaços de rocha incandescente ejetados
        for (let j = 0; j < 24; j++) {
            let a = Math.random() * Math.PI * 2;
            let vel = 2.5 + Math.random() * 5.0;
            cratera.debris.push({
                x: 0,
                y: 0,
                vx: Math.cos(a) * vel,
                vy: Math.sin(a) * vel - 3.5, // Salto no eixo Y
                grav: 0.18,
                tam: 2.0 + Math.random() * 3.5,
                rot: Math.random() * Math.PI,
                rotV: (Math.random() - 0.5) * 0.2,
                cor: Math.random() > 0.5 ? '#e17055' : '#2d3436'
            });
        }

        window.kaledronCrateras.push(cratera);
        window.criarFlashKaledron(x, y, '#ff5722', 38);
    };

    /* =========================================================================
       3. REDEMOINHO DE AÇO (whirlwind) — Órbita 360° em Raio 120px (3 segundos)
       ========================================================================= */
    window.criarAnimacaoRedemoinhoKaledron = function (id, x, y, durMs) {
        let dur = durMs || 3000;
        if (typeof window.registrarKaledronAnim === 'function') {
            window.registrarKaledronAnim(id, 'redemoinho', dur);
        }

        let exist = window.kaledronRedemoinhos.find(r => r.id === id);
        let agora = _agora();
        if (exist) {
            exist.inicio = agora;
            exist.dur = dur;
            return;
        }

        window.kaledronRedemoinhos.push({
            id: id,
            x: x,
            y: y,
            inicio: agora,
            dur: dur,
            raio: 120,
            particulas: []
        });
    };

    window.finalizarAnimacaoRedemoinhoKaledron = function (id) {
        let r = window.kaledronRedemoinhos.find(x => x.id === id);
        if (r) r.dur = Math.min(r.dur, 200);
        if (id === window.meuId && typeof window.registrarKaledronAnim === 'function') {
            window.registrarKaledronAnim(id, 'idle', 200);
        }
    };

    /* =========================================================================
       4. BRADO DE GUERRA VULCÂNICO (battle_cry) — Pilar de Erupção e Chamas
       ========================================================================= */
    window.criarAnimacaoBradoGuerraKaledron = function (id, x, y) {
        let dur = 1400;
        if (typeof window.registrarKaledronAnim === 'function') {
            window.registrarKaledronAnim(id, 'brado', 900);
        }

        if (id === window.meuId && window.kaledronEstadoLocal) {
            window.kaledronEstadoLocal.bradoAtivo = true;
            window.kaledronEstadoLocal.bradoExpira = _agora() + 10000; // 10s de buff
        }

        let pilar = {
            id: id,
            x: x,
            y: y,
            inicio: _agora(),
            dur: dur,
            largura: 64,
            altura: 220,
            chamas: []
        };

        for (let i = 0; i < 35; i++) {
            pilar.chamas.push({
                x: (Math.random() - 0.5) * 55,
                y: 10 - Math.random() * 200,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -3.5 - Math.random() * 5.0,
                tam: 3.0 + Math.random() * 6.0,
                vida: 1.0,
                cor: Math.random() > 0.6 ? '#fdcb6e' : (Math.random() > 0.3 ? '#ff5722' : '#d63031')
            });
        }

        window.kaledronBrados.push(pilar);
        window.criarFlashKaledron(x, y, '#ffeaa7', 45);
    };

    /* =========================================================================
       LOOP DE RENDERIZAÇÃO NO MUNDO (desenharEfeitosKaledron)
       ========================================================================= */
    window.desenharEfeitosKaledron = function () {
        let ctx = window.ctx;
        if (!ctx) return;
        let agora = _agora();

        // 1. Crateras Vulcânicas no Solo (Impacto Terrestre)
        for (let i = window.kaledronCrateras.length - 1; i >= 0; i--) {
            let crt = window.kaledronCrateras[i];
            let p = (agora - crt.inicio) / crt.dur;
            if (p >= 1) {
                window.kaledronCrateras.splice(i, 1);
                continue;
            }

            let alpha = Math.sin((1 - p) * Math.PI * 0.5);
            ctx.save();
            ctx.translate(crt.x, crt.y);

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255, 220, 130, ' + (0.85 * alpha) + ')';
            ctx.lineWidth = 7 * (1 - p) + 1;
            ctx.beginPath();
            ctx.arc(0, 0, crt.raio * (0.25 + p * 0.75), 0, Math.PI * 2);
            ctx.stroke();

            // Círculo térmico de solo quebrado
            let gradC = ctx.createRadialGradient(0, 0, 10, 0, 0, crt.raio);
            gradC.addColorStop(0, 'rgba(255, 87, 34, ' + (0.5 * alpha) + ')');
            gradC.addColorStop(0.6, 'rgba(214, 48, 49, ' + (0.35 * alpha) + ')');
            gradC.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradC;
            ctx.beginPath();
            ctx.arc(0, 0, crt.raio, 0, Math.PI * 2);
            ctx.fill();

            // Fissuras radiantes
            ctx.strokeStyle = '#ff7675';
            ctx.lineWidth = 2.4 * alpha;
            for (let f of crt.fissuras) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                let cosA = Math.cos(f.ang), senA = Math.sin(f.ang);
                let perpX = -senA, perpY = cosA;
                for (let pt of f.pontos) {
                    let rx = cosA * pt.r + perpX * pt.dev;
                    let ry = senA * pt.r + perpY * pt.dev;
                    ctx.lineTo(rx, ry);
                }
                ctx.stroke();
            }

            // Estilhaços saltando
            for (let d of crt.debris) {
                d.x += d.vx;
                d.y += d.vy;
                d.vy += d.grav;
                d.rot += d.rotV;
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.rotate(d.rot);
                ctx.fillStyle = d.cor;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.roundRect(-d.tam, -d.tam, d.tam * 2, d.tam * 2, 1);
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }

        // 2. Ondas Cortantes de Magma (Golpe Fulminante)
        for (let i = window.kaledronOndasMagma.length - 1; i >= 0; i--) {
            let onda = window.kaledronOndasMagma[i];
            let p = (agora - onda.inicio) / onda.dur;
            if (p >= 1) {
                window.kaledronOndasMagma.splice(i, 1);
                continue;
            }

            let distAtual = onda.distMax * p;
            let ox = onda.x + Math.cos(onda.ang) * distAtual;
            let oy = onda.y + Math.sin(onda.ang) * distAtual;
            let alpha = 1 - p;

            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(onda.ang);

            // Crescente de fogo cortante
            let gradOnda = ctx.createLinearGradient(0, -onda.largura * 0.5, 0, onda.largura * 0.5);
            gradOnda.addColorStop(0, 'rgba(255, 87, 34, 0)');
            gradOnda.addColorStop(0.5, 'rgba(255, 235, 150, ' + alpha + ')');
            gradOnda.addColorStop(1, 'rgba(214, 48, 49, 0)');

            ctx.fillStyle = gradOnda;
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.quadraticCurveTo(-14, -onda.largura * 0.5, -28, -onda.largura * 0.4);
            ctx.quadraticCurveTo(-6, 0, -28, onda.largura * 0.4);
            ctx.quadraticCurveTo(-14, onda.largura * 0.5, 12, 0);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 245, 190, ' + (0.8 * alpha) + ')';
            ctx.lineWidth = 2.5 * alpha;
            ctx.beginPath();
            ctx.moveTo(7, 0);
            ctx.quadraticCurveTo(-10, -onda.largura * 0.32, -25, -onda.largura * 0.28);
            ctx.moveTo(7, 0);
            ctx.quadraticCurveTo(-10, onda.largura * 0.32, -25, onda.largura * 0.28);
            ctx.stroke();

            // Rastro de brasas
            for (let pt of onda.particulas) {
                ctx.fillStyle = pt.cor;
                ctx.globalAlpha = alpha * 0.8;
                ctx.beginPath();
                ctx.arc(-10 - Math.random() * 15, pt.offset * (1 - p * 0.3), pt.tam, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // 3. Redemoinho de Aço (Whirlwind)
        for (let i = window.kaledronRedemoinhos.length - 1; i >= 0; i--) {
            let red = window.kaledronRedemoinhos[i];
            let p = (agora - red.inicio) / red.dur;
            if (p >= 1) {
                window.kaledronRedemoinhos.splice(i, 1);
                continue;
            }

            // Pega posição atual do jogador
            let px = red.x, py = red.y;
            if (red.id === window.meuId) {
                px = window.meuX + 12;
                py = window.meuY + 16;
            } else if (window.todosJogadores && window.todosJogadores[red.id]) {
                px = window.todosJogadores[red.id].x + 12;
                py = window.todosJogadores[red.id].y + 16;
            }

            ctx.save();
            ctx.translate(px, py);

            let rotBase = agora * 0.012;
            let alpha = Math.min(1.0, (1 - p) * 3);

            // Anel tempestuoso de corte com gradiente
            ctx.lineWidth = 14;
            ctx.strokeStyle = 'rgba(255, 87, 34, ' + (0.42 * alpha) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, 52 + Math.sin(agora * 0.025) * 5, 0, Math.PI * 2);
            ctx.stroke();

            ctx.setLineDash([12, 9]);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(255, 190, 90, ' + (0.55 * alpha) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, 68, -rotBase * 0.8, Math.PI * 1.55 - rotBase * 0.8);
            ctx.stroke();
            ctx.setLineDash([]);

            // Feixes cortantes em alta velocidade
            for (let s = 0; s < 4; s++) {
                let angS = rotBase + s * (Math.PI * 0.5);
                ctx.lineWidth = 5;
                ctx.strokeStyle = 'rgba(255, 235, 120, ' + (0.75 * alpha) + ')';
                ctx.beginPath();
                ctx.arc(0, 0, 48 + s * 3, angS, angS + 0.9);
                ctx.stroke();
            }

            // Brasas tangenciais
            for (let b = 0; b < 6; b++) {
                let angB = rotBase * 1.5 + b * 1.1;
                let rx = Math.cos(angB) * 58;
                let ry = Math.sin(angB) * 58;
                ctx.fillStyle = '#fdcb6e';
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // 4. Brado de Guerra Vulcânico (Pilar de Erupção)
        for (let i = window.kaledronBrados.length - 1; i >= 0; i--) {
            let brd = window.kaledronBrados[i];
            let p = (agora - brd.inicio) / brd.dur;
            if (p >= 1) {
                window.kaledronBrados.splice(i, 1);
                continue;
            }

            let px = brd.x, py = brd.y;
            if (brd.id === window.meuId) {
                px = window.meuX + 12;
                py = window.meuY + 16;
            } else if (window.todosJogadores && window.todosJogadores[brd.id]) {
                px = window.todosJogadores[brd.id].x + 12;
                py = window.todosJogadores[brd.id].y + 16;
            }

            ctx.save();
            ctx.translate(px, py);

            let alpha = 1 - p;
            let larg = brd.largura * (1 - p * 0.4);

            ctx.strokeStyle = 'rgba(255, 190, 70, ' + (0.8 * alpha) + ')';
            ctx.lineWidth = 3 * alpha + 1;
            ctx.beginPath();
            ctx.ellipse(0, 8, 30 + p * 105, 12 + p * 42, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Pilar vertical luminoso
            let gradPilar = ctx.createLinearGradient(-larg * 0.5, 0, larg * 0.5, 0);
            gradPilar.addColorStop(0, 'rgba(214, 48, 49, 0)');
            gradPilar.addColorStop(0.3, 'rgba(255, 87, 34, ' + (0.65 * alpha) + ')');
            gradPilar.addColorStop(0.5, 'rgba(255, 240, 160, ' + (0.85 * alpha) + ')');
            gradPilar.addColorStop(0.7, 'rgba(255, 87, 34, ' + (0.65 * alpha) + ')');
            gradPilar.addColorStop(1, 'rgba(214, 48, 49, 0)');

            ctx.fillStyle = gradPilar;
            ctx.beginPath();
            ctx.rect(-larg * 0.5, -brd.altura, larg, brd.altura + 15);
            ctx.fill();

            // Chamas ascendentes
            for (let ch of brd.chamas) {
                ch.x += ch.vx;
                ch.y += ch.vy;
                ctx.fillStyle = ch.cor;
                ctx.globalAlpha = alpha * 0.9;
                ctx.beginPath();
                ctx.arc(ch.x, ch.y, ch.tam, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // 5. Flashes Rápidos
        for (let i = window.kaledronFlashes.length - 1; i >= 0; i--) {
            let f = window.kaledronFlashes[i];
            let p = (agora - f.inicio) / f.dur;
            if (p >= 1) {
                window.kaledronFlashes.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = (1 - p) * 0.65;
            ctx.fillStyle = f.cor;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.raio * (1 + p * 0.6), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

})();
