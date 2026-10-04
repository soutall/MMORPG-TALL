// efeitos/vfx_summoner_upgrades.js — Efeitos Visuais Exclusivos dos Upgrades da Invocadora (Summoner)
// ================================================================================================
// Renderização em Canvas 2D de alta performance (60 FPS, PC e Mobile) para todos os Upgrades da Summoner:
// 1. Fenda Persistente (fissura profunda com lava mágica violeta e névoa)
// 2. Impacto Duplo (implosão subterrânea atrasada com estilhaços e tela tremendo)
// 3. Colisão Tectônica (pulsos magnéticos de atração em vórtice)
// 4. Terremoto Devastador (3 falhas telúricas em 120° rasgando o solo)
// 5. Cratera de Impacto (depressão afundada com borda rochosa e fumaça por 5s)
// 6. Marca da Presa (retículo arcano holográfico pulsante sobre a presa + feixe tether de caça)
// 7. Choque Trovejante (onda de choque sônica com raios elétricos violetas)
// 8. Barreira de Impacto (cúpula de cristal ametista com 3 escudos rúnicos orbitando a Invocadora)
// 9. Presa Inescapável / Garras da Terra (estalagmites e garras de pedra prendendo o alvo)
// 10. Meteoros Sísmicos (meteoritos de cristal violeta cadentes do céu)
// 11. Colapso Final (supernova cataclímica implosiva ao término do Golem Sísmico)
// 12. Último Bastião (cúpula celestial divina dourada/ametista na sobrevivência letal)
// ================================================================================================

(function () {
    'use strict';

    window.vfxSummonerFendas = [];
    window.vfxSummonerImpactosDuplos = [];
    window.vfxSummonerPulsosMagneticos = [];
    window.vfxSummonerTerremotos = [];
    window.vfxSummonerCrateras = [];
    window.vfxSummonerMarcasPresa = [];
    window.vfxSummonerOndasChoque = [];
    window.vfxSummonerEscudosInvocadora = [];
    window.vfxSummonerGarrasTerra = [];
    window.vfxSummonerMeteoros = [];
    window.vfxSummonerColapsos = [];
    window.vfxSummonerBastoes = [];
    window.vfxSummonerPrisaoPlacas = [];
    window.vfxSummonerMartelosColosso = [];
    window.vfxSummonerColapsosTerritoriais = [];

    const COR_VIOLETA = {
        claro: '#f3e8ff',
        brilho: '#e9ccff',
        magia: '#c084fc',
        primaria: '#a855f7',
        escuro: '#7e22ce',
        profundo: '#3b0764',
        fissura: '#170526',
        lajes: '#4c1d95',
        fogo: '#ec4899',
        ouro: '#f59e0b'
    };

    // Helper: Gera ramos de fratura orgânica
    function _gerarRamosFissura(cx, cy, raio, numRamos) {
        const ramos = [];
        const n = numRamos || 7;
        for (let i = 0; i < n; i++) {
            const angBase = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const len = raio * (0.65 + Math.random() * 0.45);
            const pts = [{ x: cx, y: cy }];
            let curX = cx, curY = cy, curDist = 0, curAng = angBase;
            while (curDist < len) {
                const step = 8 + Math.random() * 10;
                curDist += step;
                curAng += (Math.random() - 0.5) * 0.55;
                curX += Math.cos(curAng) * step;
                curY += Math.sin(curAng) * step * 0.70;
                pts.push({ x: curX, y: curY });
            }
            ramos.push(pts);
        }
        return ramos;
    }

    // 1. FENDA PERSISTENTE (Esmagamento 1A)
    window.criarVfxSummonerFenda = function (x, y, raio, duracao) {
        raio = raio || 90;
        duracao = duracao || 4000;
        const ramos = _gerarRamosFissura(x, y, raio, 8);
        const particulas = [];
        for (let i = 0; i < 18; i++) {
            particulas.push({
                x: x + (Math.random() - 0.5) * raio * 1.2,
                y: y + (Math.random() - 0.5) * raio * 0.8,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.6 - Math.random() * 0.8,
                raio: 1.5 + Math.random() * 2.5,
                alpha: 0.3 + Math.random() * 0.6,
                fase: Math.random() * Math.PI * 2
            });
        }
        window.vfxSummonerFendas.push({
            x: x,
            y: y,
            raio: raio,
            duracao: duracao,
            criadoEm: performance.now(),
            ramos: ramos,
            particulas: particulas
        });
    };

    // 2. IMPACTO DUPLO (Esmagamento 1B)
    window.criarVfxSummonerImpactoDuplo = function (x, y, raio) {
        raio = raio || 110;
        window.tremorTela = Math.max(window.tremorTela || 0, 18);
        const fragmentos = [];
        for (let i = 0; i < 22; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 2.5 + Math.random() * 5.0;
            fragmentos.push({
                x: x,
                y: y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd * 0.7 - (2.0 + Math.random() * 3.5),
                grav: 0.22,
                tam: 4 + Math.random() * 7,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.2,
                cor: i % 3 === 0 ? COR_VIOLETA.magia : (i % 2 === 0 ? COR_VIOLETA.lajes : '#2b1b3d')
            });
        }
        window.vfxSummonerImpactosDuplos.push({
            x: x,
            y: y,
            raioMax: raio,
            raioAtual: 10,
            criadoEm: performance.now(),
            duracao: 750,
            fragmentos: fragmentos
        });
    };

    // 3. PULSO MAGNÉTICO (Esmagamento 2A / 2B)
    window.criarVfxSummonerPulsoMagnetico = function (x, y, raio) {
        raio = raio || 160;
        window.vfxSummonerPulsosMagneticos.push({
            x: x,
            y: y,
            raioInicial: raio,
            raioAtual: raio,
            criadoEm: performance.now(),
            duracao: 650
        });
    };

    // 4. TERREMOTO EM 3 DIREÇÕES (Esmagamento 4B)
    window.criarVfxSummonerTerremoto3Way = function (x, y) {
        window.tremorTela = Math.max(window.tremorTela || 0, 20);
        const direcoes = [];
        for (let i = 0; i < 3; i++) {
            const ang = i * ((Math.PI * 2) / 3);
            direcoes.push({
                ang: ang,
                compMax: 180,
                ramos: _gerarRamosFissura(x, y, 180, 1)
            });
        }
        window.vfxSummonerTerremotos.push({
            x: x,
            y: y,
            criadoEm: performance.now(),
            duracao: 900,
            direcoes: direcoes
        });
    };

    // 5. CRATERA DE IMPACTO (Salto 1B)
    window.criarVfxSummonerCratera = function (x, y, raio, duracao) {
        raio = raio || 80;
        duracao = duracao || 5000;
        const fissuras = _gerarRamosFissura(x, y, raio * 1.15, 10);
        window.vfxSummonerCrateras.push({
            x: x,
            y: y,
            raio: raio,
            duracao: duracao,
            criadoEm: performance.now(),
            fissuras: fissuras
        });
    };

    // 6. MARCA DA PRESA (Salto 1A)
    window.criarVfxSummonerMarcaPresa = function (alvoId, alvoTipo, x, y, duracao, golemX, golemY) {
        duracao = duracao || 6000;
        // Se já existe marca para esse alvo, apenas renova
        const existente = window.vfxSummonerMarcasPresa.find(m => m.alvoId === alvoId);
        if (existente) {
            existente.criadoEm = performance.now();
            existente.duracao = duracao;
            existente.x = x;
            existente.y = y;
            existente.golemX = golemX;
            existente.golemY = golemY;
            return;
        }
        window.vfxSummonerMarcasPresa.push({
            alvoId: alvoId,
            alvoTipo: alvoTipo,
            x: x,
            y: y,
            golemX: golemX,
            golemY: golemY,
            duracao: duracao,
            criadoEm: performance.now(),
            anguloRot: 0
        });
    };

    // 7. ONDA DE CHOQUE TROVEJANTE (Salto 2B)
    window.criarVfxSummonerOndaChoque = function (x, y, raio) {
        raio = raio || 180;
        window.tremorTela = Math.max(window.tremorTela || 0, 15);
        const centelhas = [];
        for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2;
            const dist = raio * (0.4 + Math.random() * 0.6);
            centelhas.push({
                x1: x + Math.cos(a) * (dist * 0.7),
                y1: y + Math.sin(a) * (dist * 0.7) * 0.7,
                x2: x + Math.cos(a + (Math.random() - 0.5) * 0.4) * dist,
                y2: y + Math.sin(a + (Math.random() - 0.5) * 0.4) * dist * 0.7
            });
        }
        window.vfxSummonerOndasChoque.push({
            x: x,
            y: y,
            raioMax: raio,
            raioAtual: 20,
            criadoEm: performance.now(),
            duracao: 500,
            centelhas: centelhas
        });
    };

    // 8. ESCUDO DA INVOCADORA / BARREIRA DE IMPACTO (Salto 3A / 3B)
    window.criarVfxSummonerEscudoInvocadora = function (x, y, duracao) {
        duracao = duracao || 4000;
        window.vfxSummonerEscudosInvocadora.push({
            x: x,
            y: y,
            duracao: duracao,
            criadoEm: performance.now(),
            rotacao: 0
        });
    };

    // 9. GARRAS DA TERRA / PRESA INESCAPÁVEL (Salto 4A)
    window.criarVfxSummonerGarrasTerra = function (x, y, duracao) {
        duracao = duracao || 2500;
        const garras = [];
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            garras.push({
                ang: ang,
                dist: 26,
                alt: 22 + Math.random() * 8,
                larg: 9 + Math.random() * 4
            });
        }
        window.vfxSummonerGarrasTerra.push({
            x: x,
            y: y,
            duracao: duracao,
            criadoEm: performance.now(),
            garras: garras
        });
    };

    // 10. METEORO SÍSMICO (Sísmico 2B)
    window.criarVfxSummonerMeteoroSismico = function (x, y) {
        const startX = x - 70 - Math.random() * 40;
        const startY = y - 280 - Math.random() * 60;
        window.vfxSummonerMeteoros.push({
            sx: startX,
            sy: startY,
            tx: x,
            ty: y,
            cx: startX,
            cy: startY,
            criadoEm: performance.now(),
            duracao: 420,
            atingiuChao: false
        });
    };

    // 11. COLAPSO FINAL (Sísmico 4B)
    window.criarVfxSummonerColapsoFinal = function (x, y, raio) {
        raio = raio || 260;
        window.tremorTela = Math.max(window.tremorTela || 0, 32);
        const estilhaços = [];
        for (let i = 0; i < 45; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 4.0 + Math.random() * 7.5;
            estilhaços.push({
                x: x,
                y: y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd * 0.7 - (1.5 + Math.random() * 4.5),
                tam: 5 + Math.random() * 10,
                cor: i % 2 === 0 ? COR_VIOLETA.magia : COR_VIOLETA.claro
            });
        }
        window.vfxSummonerColapsos.push({
            x: x,
            y: y,
            raioMax: raio,
            raioAtual: 10,
            criadoEm: performance.now(),
            duracao: 1100,
            estilhacos: estilhaços
        });
    };

    // 12. ÚLTIMO BASTIÃO (Colossal 4A)
    window.criarVfxSummonerUltimoBastiao = function (x, y, duracao) {
        duracao = duracao || 1200;
        window.tremorTela = Math.max(window.tremorTela || 0, 24);
        window.vfxSummonerBastoes.push({
            x: x,
            y: y,
            duracao: duracao,
            criadoEm: performance.now()
        });
    };

    // 13. PRISÃO DE PLACAS (Esmagamento 3A — Ao fechar a fenda, placas pontiagudas erguem violentamente do solo)
    window.criarVfxSummonerPrisaoPlacas = function (x, y, raio, duracao) {
        raio = raio || 90;
        duracao = duracao || 700;
        window.tremorTela = Math.max(window.tremorTela || 0, 14);

        // Gera 14 placas rochosas pontiagudas espalhadas em anel e interior
        const placas = [];
        const qtdPlacas = 14;
        for (let i = 0; i < qtdPlacas; i++) {
            const ang = (i / qtdPlacas) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const dist = raio * (0.45 + Math.random() * 0.55);
            placas.push({
                px: x + Math.cos(ang) * dist,
                py: y + Math.sin(ang) * (dist * 0.65),
                alturaMax: 28 + Math.random() * 22,
                largura: 14 + Math.random() * 8,
                inclinacao: (Math.random() - 0.5) * 0.35,
                cor: i % 2 === 0 ? '#3b0764' : '#2e1065',
                corBorda: i % 2 === 0 ? '#c084fc' : '#a855f7',
                semente: Math.random()
            });
        }

        // Partículas de poeira e cascalho subindo
        const poeira = [];
        for (let p = 0; p < 24; p++) {
            poeira.push({
                x: x + (Math.random() - 0.5) * raio * 1.5,
                y: y + (Math.random() - 0.5) * raio * 0.9,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1.2 - Math.random() * 2.2,
                tam: 2 + Math.random() * 3,
                cor: Math.random() > 0.4 ? '#a855f7' : '#e9d5ff'
            });
        }

        window.vfxSummonerPrisaoPlacas.push({
            x: x,
            y: y,
            raio: raio,
            duracao: duracao,
            criadoEm: performance.now(),
            placas: placas,
            poeira: poeira
        });
    };

    // 14. MARTELO DO COLOSSO (Esmagamento 4B — Punho carregado e impacto massivo)
    window.criarVfxSummonerMarteloColossoReady = function (pid, x, y) {
        window.golemMarteloColossoAtivo = window.golemMarteloColossoAtivo || {};
        if (pid) window.golemMarteloColossoAtivo[pid] = true;
        if (window.floatingTexts) {
            window.floatingTexts.push({ x: x, y: y - 55, text: '🔨 MARTELO CARREGADO!', color: '#f59e0b', alpha: 1.0 });
        }
    };

    window.criarVfxSummonerMarteloColossoHit = function (x, y, dano, pid) {
        if (pid && window.golemMarteloColossoAtivo) delete window.golemMarteloColossoAtivo[pid];
        window.tremorTela = Math.max(window.tremorTela || 0, 24);

        if (window.floatingTexts && dano) {
            window.floatingTexts.push({ x: x, y: y - 40, text: '💥 ' + dano + ' (MARTELO DO COLOSSO)', color: '#fbbf24', alpha: 1.0 });
        }

        // Estilhaços dourados/violetas explodindo em alta velocidade
        const estilhacos = [];
        for (let i = 0; i < 22; i++) {
            const ang = Math.random() * Math.PI * 2;
            const vel = 3.0 + Math.random() * 6.0;
            estilhacos.push({
                x: x,
                y: y,
                vx: Math.cos(ang) * vel,
                vy: Math.sin(ang) * vel * 0.7 - 2.5,
                tam: 3 + Math.random() * 5,
                cor: i % 3 === 0 ? '#fde047' : (i % 3 === 1 ? '#f59e0b' : '#c084fc')
            });
        }

        window.vfxSummonerMartelosColosso.push({
            x: x,
            y: y,
            raioMax: 95,
            criadoEm: performance.now(),
            duracao: 800,
            estilhacos: estilhacos
        });
    };

    // 15. COLAPSO TERRITORIAL (Esmagamento 4A — Zona instável 3s e implosão)
    window.criarVfxSummonerColapsoTerritorial = function (x, y, raio, duracao) {
        raio = raio || 110;
        duracao = duracao || 3000;
        window.tremorTela = Math.max(window.tremorTela || 0, 10);
        window.vfxSummonerColapsosTerritoriais.push({
            x: x,
            y: y,
            raio: raio,
            duracao: duracao,
            criadoEm: performance.now()
        });
    };

    window.criarVfxSummonerColapsoTerritorialImplosao = function (x, y, raio) {
        raio = raio || 110;
        window.tremorTela = Math.max(window.tremorTela || 0, 20);
        if (typeof window.criarVfxSummonerColapsoFinal === 'function') {
            window.criarVfxSummonerColapsoFinal(x, y, raio);
        }
    };

    // =========================================================================
    // LOOP PRINCIPAL DE RENDERIZAÇÃO
    // =========================================================================
    window.desenharEfeitosSummonerUpgrades = function () {
        if (!window.ctx) return;
        const ctx = window.ctx;
        const agora = performance.now();

        // -------------------------------------------------------------
        // 1. RENDERIZAR CRATERAS (Salto 1B) — No solo sob tudo
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerCrateras.length - 1; i >= 0; i--) {
            const c = window.vfxSummonerCrateras[i];
            const decorrido = agora - c.criadoEm;
            if (decorrido >= c.duracao) {
                window.vfxSummonerCrateras.splice(i, 1);
                continue;
            }
            const progresso = decorrido / c.duracao;
            const alpha = progresso > 0.8 ? (1 - progresso) / 0.2 : 1.0;

            ctx.save();
            ctx.translate(c.x, c.y);

            // Sombra côncava interior
            const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, c.raio);
            grad.addColorStop(0, `rgba(18, 8, 30, ${(0.85 * alpha).toFixed(3)})`);
            grad.addColorStop(0.65, `rgba(45, 18, 75, ${(0.60 * alpha).toFixed(3)})`);
            grad.addColorStop(0.92, `rgba(90, 40, 140, ${(0.35 * alpha).toFixed(3)})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.raio, c.raio * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();

            // Borda de pedra trincada levantada
            ctx.strokeStyle = `rgba(168, 85, 247, ${(0.55 * alpha).toFixed(3)})`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.raio * 0.88, c.raio * 0.58, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Fissuras radiantes
            if (c.fissuras) {
                ctx.strokeStyle = `rgba(192, 132, 252, ${(0.65 * alpha).toFixed(3)})`;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                for (const r of c.fissuras) {
                    if (!r || r.length === 0) continue;
                    ctx.moveTo(r[0].x - c.x, r[0].y - c.y);
                    for (let k = 1; k < r.length; k++) {
                        ctx.lineTo(r[k].x - c.x, r[k].y - c.y);
                    }
                }
                ctx.stroke();
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 2. RENDERIZAR FENDAS PERSISTENTES (Esmagamento 1A)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerFendas.length - 1; i >= 0; i--) {
            const f = window.vfxSummonerFendas[i];
            const decorrido = agora - f.criadoEm;
            if (decorrido >= f.duracao) {
                window.vfxSummonerFendas.splice(i, 1);
                continue;
            }
            const prog = decorrido / f.duracao;
            const alpha = prog > 0.8 ? (1 - prog) / 0.2 : 1.0;
            const pulso = Math.sin(decorrido * 0.006) * 0.25 + 0.75;

            ctx.save();
            ctx.translate(f.x, f.y);

            // Aura de energia telúrica pulsante
            const gradFenda = ctx.createRadialGradient(0, 0, 10, 0, 0, f.raio * 0.9);
            gradFenda.addColorStop(0, `rgba(168, 85, 247, ${(0.45 * alpha * pulso).toFixed(3)})`);
            gradFenda.addColorStop(0.7, `rgba(59, 7, 100, ${(0.25 * alpha).toFixed(3)})`);
            gradFenda.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradFenda;
            ctx.beginPath();
            ctx.ellipse(0, 0, f.raio, f.raio * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ramos da fenda (profundidade em 2 passes)
            // Passe 1: Trincheira funda escura
            ctx.strokeStyle = `rgba(23, 5, 38, ${(0.92 * alpha).toFixed(3)})`;
            ctx.lineWidth = 4.8;
            ctx.beginPath();
            for (const r of f.ramos) {
                ctx.moveTo(r[0].x - f.x, r[0].y - f.y);
                for (let k = 1; k < r.length; k++) ctx.lineTo(r[k].x - f.x, r[k].y - f.y);
            }
            ctx.stroke();

            // Passe 2: Núcleo violeta incandescente
            ctx.strokeStyle = `rgba(216, 180, 254, ${(0.88 * alpha * pulso).toFixed(3)})`;
            ctx.lineWidth = 1.8;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 8 * alpha;
            ctx.beginPath();
            for (const r of f.ramos) {
                ctx.moveTo(r[0].x - f.x, r[0].y - f.y);
                for (let k = 1; k < r.length; k++) ctx.lineTo(r[k].x - f.x, r[k].y - f.y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Partículas de fumaça/vapor subindo
            for (const p of f.particulas) {
                p.y += p.vy;
                p.x += p.vx + Math.sin(agora * 0.004 + p.fase) * 0.3;
                if (p.y < -f.raio * 0.7) {
                    p.y = (Math.random() - 0.5) * f.raio * 0.4;
                    p.x = (Math.random() - 0.5) * f.raio * 0.8;
                }
                ctx.fillStyle = `rgba(192, 132, 252, ${(p.alpha * alpha * 0.6).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 3. RENDERIZAR IMPACTOS DUPLOS (Esmagamento 1B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerImpactosDuplos.length - 1; i >= 0; i--) {
            const imp = window.vfxSummonerImpactosDuplos[i];
            const decorrido = agora - imp.criadoEm;
            if (decorrido >= imp.duracao) {
                window.vfxSummonerImpactosDuplos.splice(i, 1);
                continue;
            }
            const prog = decorrido / imp.duracao;
            const alpha = 1.0 - prog;
            imp.raioAtual = imp.raioMax * Math.min(1, prog * 1.4);

            ctx.save();
            ctx.translate(imp.x, imp.y);

            // Anel de choque secundário violento
            ctx.strokeStyle = `rgba(233, 204, 255, ${(0.85 * alpha).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, 4.5 * (1 - prog));
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 12 * alpha;
            ctx.beginPath();
            ctx.ellipse(0, 0, imp.raioAtual, imp.raioAtual * 0.62, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Segundo anel interno
            ctx.strokeStyle = `rgba(168, 85, 247, ${(0.6 * alpha).toFixed(3)})`;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, imp.raioAtual * 0.65, imp.raioAtual * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Fragmentos balísticos quicando
            for (const frag of imp.fragmentos) {
                frag.x += frag.vx;
                frag.y += frag.vy;
                frag.vy += frag.grav;
                frag.rot += frag.vrot;

                ctx.save();
                ctx.translate(frag.x - imp.x, frag.y - imp.y);
                ctx.rotate(frag.rot);
                ctx.fillStyle = frag.cor;
                ctx.globalAlpha = alpha;
                ctx.fillRect(-frag.tam / 2, -frag.tam / 2, frag.tam, frag.tam * 0.7);
                ctx.restore();
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 4. RENDERIZAR PULSO MAGNÉTICO (Esmagamento 2A / 2B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerPulsosMagneticos.length - 1; i >= 0; i--) {
            const p = window.vfxSummonerPulsosMagneticos[i];
            const decorrido = agora - p.criadoEm;
            if (decorrido >= p.duracao) {
                window.vfxSummonerPulsosMagneticos.splice(i, 1);
                continue;
            }
            const prog = decorrido / p.duracao;
            // O raio contrai em direção ao centro (puxão centrípeto)
            const raioContracao = p.raioInicial * (1 - prog);
            const alpha = Math.sin(prog * Math.PI);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.strokeStyle = `rgba(192, 132, 252, ${(0.75 * alpha).toFixed(3)})`;
            ctx.lineWidth = 2.4;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 10 * alpha;
            ctx.beginPath();
            ctx.ellipse(0, 0, raioContracao, raioContracao * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // -------------------------------------------------------------
        // 5. RENDERIZAR TERREMOTO EM 3 DIREÇÕES (Esmagamento 4B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerTerremotos.length - 1; i >= 0; i--) {
            const t = window.vfxSummonerTerremotos[i];
            const decorrido = agora - t.criadoEm;
            if (decorrido >= t.duracao) {
                window.vfxSummonerTerremotos.splice(i, 1);
                continue;
            }
            const prog = decorrido / t.duracao;
            const alpha = 1.0 - prog;
            const distProg = Math.min(1, prog * 1.8);

            ctx.save();
            ctx.translate(t.x, t.y);

            for (const dir of t.direcoes) {
                const len = dir.compMax * distProg;
                const endX = Math.cos(dir.ang) * len;
                const endY = Math.sin(dir.ang) * len * 0.65;

                ctx.strokeStyle = `rgba(168, 85, 247, ${(0.85 * alpha).toFixed(3)})`;
                ctx.lineWidth = Math.max(1.5, 4.0 * (1 - prog));
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Fagulhas e rochas levantadas nas pontas das fissuras
                ctx.fillStyle = `rgba(233, 204, 255, ${(0.9 * alpha).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 6. RENDERIZAR MARCA DA PRESA (Salto 1A)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerMarcasPresa.length - 1; i >= 0; i--) {
            const m = window.vfxSummonerMarcasPresa[i];
            const decorrido = agora - m.criadoEm;
            if (decorrido >= m.duracao) {
                window.vfxSummonerMarcasPresa.splice(i, 1);
                continue;
            }

            // Atualiza posição da entidade se ainda existir no mundo
            if (m.alvoTipo === 'slime' && window.listaSlimes) {
                const s = window.listaSlimes.find(sl => sl.id === m.alvoId);
                if (s && s.hp > 0) { m.x = s.x; m.y = s.y; }
                else if (s && s.hp <= 0) { window.vfxSummonerMarcasPresa.splice(i, 1); continue; }
            } else if (m.alvoTipo === 'boss' && window.boss) {
                if (window.boss.id === m.alvoId && window.boss.hp > 0) { m.x = window.boss.x; m.y = window.boss.y; }
            }

            m.anguloRot += 0.035;
            const pulso = Math.sin(agora * 0.008) * 0.2 + 0.9;

            ctx.save();
            ctx.translate(m.x, m.y - 48); // Acima da cabeça da presa

            // Retículo holográfico arcano com lâminas cruzadas
            ctx.rotate(m.anguloRot);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.0;
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 8;

            // Anel central do retículo
            ctx.beginPath();
            ctx.arc(0, 0, 14 * pulso, 0, Math.PI * 2);
            ctx.stroke();

            // 4 Cruzetas de mira
            const rArm = 20 * pulso;
            ctx.beginPath();
            ctx.moveTo(0, -rArm); ctx.lineTo(0, -8);
            ctx.moveTo(0, 8); ctx.lineTo(0, rArm);
            ctx.moveTo(-rArm, 0); ctx.lineTo(-8, 0);
            ctx.moveTo(8, 0); ctx.lineTo(rArm, 0);
            ctx.stroke();

            // Ponto central vermelho rubro
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();

            // Feixe de caça do Golem até a presa (se as coordenadas estiverem disponíveis)
            if (typeof window.meuLacaio === 'object' && window.meuLacaio) {
                const gx = window.meuLacaio.x;
                const gy = window.meuLacaio.y;
                ctx.save();
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.28)';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(gx, gy - 15);
                ctx.lineTo(m.x, m.y - 20);
                ctx.stroke();
                ctx.restore();
            }
        }

        // -------------------------------------------------------------
        // 7. RENDERIZAR ONDA DE CHOQUE SÍSMICA (Salto 2B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerOndasChoque.length - 1; i >= 0; i--) {
            const o = window.vfxSummonerOndasChoque[i];
            const decorrido = agora - o.criadoEm;
            if (decorrido >= o.duracao) {
                window.vfxSummonerOndasChoque.splice(i, 1);
                continue;
            }
            const prog = decorrido / o.duracao;
            const alpha = 1.0 - prog;
            o.raioAtual = o.raioMax * Math.min(1, prog * 1.2);

            ctx.save();
            ctx.translate(o.x, o.y);

            // Anel sônico trovejante
            ctx.strokeStyle = `rgba(192, 132, 252, ${(0.85 * alpha).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, 3.8 * (1 - prog));
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 10 * alpha;
            ctx.beginPath();
            ctx.ellipse(0, 0, o.raioAtual, o.raioAtual * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Raios elétricos ziguezagueando na onda
            ctx.strokeStyle = `rgba(243, 232, 255, ${(0.9 * alpha).toFixed(3)})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (const spk of o.centelhas) {
                ctx.moveTo(spk.x1 - o.x, spk.y1 - o.y);
                ctx.lineTo(spk.x2 - o.x, spk.y2 - o.y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 8. RENDERIZAR ESCUDO DA INVOCADORA (Salto 3A / 3B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerEscudosInvocadora.length - 1; i >= 0; i--) {
            const e = window.vfxSummonerEscudosInvocadora[i];
            const decorrido = agora - e.criadoEm;
            if (decorrido >= e.duracao) {
                window.vfxSummonerEscudosInvocadora.splice(i, 1);
                continue;
            }

            // Segue a Invocadora em tempo real
            if (typeof window.meuX === 'number' && typeof window.meuY === 'number') {
                e.x = window.meuX;
                e.y = window.meuY;
            }

            e.rotacao += 0.025;
            const prog = decorrido / e.duracao;
            const alpha = prog > 0.8 ? (1 - prog) / 0.2 : 1.0;
            const pulso = Math.sin(agora * 0.005) * 0.08 + 1.0;

            ctx.save();
            ctx.translate(e.x, e.y - 12);

            // Esfera translúcida ametista
            const gradEsc = ctx.createRadialGradient(0, 0, 10, 0, 0, 34 * pulso);
            gradEsc.addColorStop(0, `rgba(192, 132, 252, ${(0.15 * alpha).toFixed(3)})`);
            gradEsc.addColorStop(0.75, `rgba(147, 51, 234, ${(0.35 * alpha).toFixed(3)})`);
            gradEsc.addColorStop(1, `rgba(233, 204, 255, ${(0.75 * alpha).toFixed(3)})`);
            ctx.fillStyle = gradEsc;
            ctx.strokeStyle = `rgba(233, 204, 255, ${(0.85 * alpha).toFixed(3)})`;
            ctx.lineWidth = 2.0;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10 * alpha;
            ctx.beginPath();
            ctx.arc(0, 0, 32 * pulso, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 3 Escudos rúnicos orbitando
            for (let k = 0; k < 3; k++) {
                const angO = e.rotacao + k * ((Math.PI * 2) / 3);
                const ox = Math.cos(angO) * (36 * pulso);
                const oy = Math.sin(angO) * (20 * pulso);

                ctx.save();
                ctx.translate(ox, oy);
                ctx.fillStyle = '#f59e0b';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(0, -6); ctx.lineTo(5, -2); ctx.lineTo(4, 5); ctx.lineTo(0, 8); ctx.lineTo(-4, 5); ctx.lineTo(-5, -2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // -------------------------------------------------------------
        // 9. RENDERIZAR GARRAS DA TERRA / PRESA INESCAPÁVEL (Salto 4A)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerGarrasTerra.length - 1; i >= 0; i--) {
            const g = window.vfxSummonerGarrasTerra[i];
            const decorrido = agora - g.criadoEm;
            if (decorrido >= g.duracao) {
                window.vfxSummonerGarrasTerra.splice(i, 1);
                continue;
            }
            const prog = decorrido / g.duracao;
            const alpha = prog > 0.85 ? (1 - prog) / 0.15 : 1.0;

            ctx.save();
            ctx.translate(g.x, g.y);

            // Garras de pedra projetadas para dentro aprisionando o alvo
            for (const garra of g.garras) {
                const gx = Math.cos(garra.ang) * garra.dist;
                const gy = Math.sin(garra.ang) * (garra.dist * 0.7);

                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(garra.ang + Math.PI); // Apontadas para o centro

                ctx.fillStyle = '#4c1d95';
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(0, -garra.alt);
                ctx.lineTo(garra.larg / 2, 0);
                ctx.lineTo(-garra.larg / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }

            // Anel de contenção no chão
            ctx.strokeStyle = `rgba(168, 85, 247, ${(0.6 * alpha).toFixed(3)})`;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, 32, 22, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 10. RENDERIZAR METEOROS SÍSMICOS (Sísmico 2B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerMeteoros.length - 1; i >= 0; i--) {
            const m = window.vfxSummonerMeteoros[i];
            const decorrido = agora - m.criadoEm;
            const prog = Math.min(1, decorrido / m.duracao);

            m.cx = m.sx + (m.tx - m.sx) * prog;
            m.cy = m.sy + (m.ty - m.sy) * prog;

            ctx.save();

            // Rastro de fogo violeta
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.75)';
            ctx.lineWidth = 4.0;
            ctx.beginPath();
            ctx.moveTo(m.sx, m.sy);
            ctx.lineTo(m.cx, m.cy);
            ctx.stroke();

            // Cabeça incandescente do meteoro
            ctx.fillStyle = '#f3e8ff';
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(m.cx, m.cy, 7.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();

            if (prog >= 1) {
                // Impacto no chão: tremor e estilhaços
                window.tremorTela = Math.max(window.tremorTela || 0, 10);
                window.criarVfxSummonerImpactoDuplo(m.tx, m.ty, 45);
                window.vfxSummonerMeteoros.splice(i, 1);
            }
        }

        // -------------------------------------------------------------
        // 11. RENDERIZAR COLAPSO FINAL (Sísmico 4B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerColapsos.length - 1; i >= 0; i--) {
            const col = window.vfxSummonerColapsos[i];
            const decorrido = agora - col.criadoEm;
            if (decorrido >= col.duracao) {
                window.vfxSummonerColapsos.splice(i, 1);
                continue;
            }
            const prog = decorrido / col.duracao;
            const alpha = 1.0 - prog;
            col.raioAtual = col.raioMax * Math.min(1, prog * 1.5);

            ctx.save();
            ctx.translate(col.x, col.y);

            // Flash central inicial ofuscante
            if (prog < 0.25) {
                const flashAlpha = (1 - prog / 0.25);
                ctx.fillStyle = `rgba(255, 255, 255, ${(0.8 * flashAlpha).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(0, 0, 70 * flashAlpha, 0, Math.PI * 2);
                ctx.fill();
            }

            // Grande onda de choque implosiva/cataclímica
            ctx.strokeStyle = `rgba(233, 204, 255, ${(0.95 * alpha).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.5, 6.0 * (1 - prog));
            ctx.shadowColor = '#b878ff';
            ctx.shadowBlur = 18 * alpha;
            ctx.beginPath();
            ctx.ellipse(0, 0, col.raioAtual, col.raioAtual * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Segundo anel externo ardente
            ctx.strokeStyle = `rgba(236, 72, 153, ${(0.7 * alpha).toFixed(3)})`;
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, col.raioAtual * 0.85, col.raioAtual * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Estilhaços telúricos arremessados
            for (const est of col.estilhacos) {
                est.x += est.vx;
                est.y += est.vy;
                est.vy += 0.25;

                ctx.fillStyle = est.cor;
                ctx.globalAlpha = alpha;
                ctx.fillRect(est.x - col.x, est.y - col.y, est.tam, est.tam * 0.7);
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 12. RENDERIZAR ÚLTIMO BASTIÃO (Colossal 4A)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerBastoes.length - 1; i >= 0; i--) {
            const b = window.vfxSummonerBastoes[i];
            const decorrido = agora - b.criadoEm;
            if (decorrido >= b.duracao) {
                window.vfxSummonerBastoes.splice(i, 1);
                continue;
            }
            const prog = decorrido / b.duracao;
            const alpha = 1.0 - prog * 0.3;
            const pulso = Math.sin(agora * 0.02) * 0.1 + 1.0;

            ctx.save();
            ctx.translate(b.x, b.y);

            // Cúpula inquebrável celestial
            ctx.fillStyle = `rgba(245, 158, 11, ${(0.35 * alpha).toFixed(3)})`;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, 48 * pulso, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 13. RENDERIZAR PRISÃO DE PLACAS (Esmagamento 3A)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerPrisaoPlacas.length - 1; i >= 0; i--) {
            const pr = window.vfxSummonerPrisaoPlacas[i];
            const decorrido = agora - pr.criadoEm;
            if (decorrido >= pr.duracao) {
                window.vfxSummonerPrisaoPlacas.splice(i, 1);
                continue;
            }
            const prog = decorrido / pr.duracao;
            let fatorAltura = 1.0;
            if (prog < 0.15) {
                fatorAltura = Math.min(1.0, prog / 0.15);
            } else if (prog > 0.80) {
                fatorAltura = Math.max(0, (1.0 - prog) / 0.20);
            }

            ctx.save();
            ctx.translate(pr.x, pr.y);

            // Anel telúrico no chão prendendo a área
            ctx.strokeStyle = `rgba(192, 132, 252, ${(0.6 * (1 - prog * 0.4)).toFixed(3)})`;
            ctx.lineWidth = 2.0;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.ellipse(0, 0, pr.raio, pr.raio * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Poeira subindo
            for (const p of pr.poeira) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.08;
                ctx.fillStyle = p.cor;
                ctx.globalAlpha = Math.max(0, 1 - prog);
                ctx.beginPath();
                ctx.arc(p.x - pr.x, p.y - pr.y, p.tam, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // Placas rochosas pontiagudas erguidas do solo
            for (const pl of pr.placas) {
                const alt = pl.alturaMax * fatorAltura;
                if (alt <= 0) continue;
                const lx = pl.px - pr.x;
                const ly = pl.py - pr.y;

                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(pl.inclinacao);

                // Desenha a placa pontiaguda (prisma triangular de obsidiana)
                ctx.fillStyle = pl.cor;
                ctx.strokeStyle = pl.corBorda;
                ctx.lineWidth = 1.5;
                ctx.shadowColor = '#c084fc';
                ctx.shadowBlur = 8;

                ctx.beginPath();
                ctx.moveTo(-pl.largura / 2, 0);
                ctx.lineTo(-pl.largura * 0.25, -alt * 0.6);
                ctx.lineTo(0, -alt); // ponta afiada superior
                ctx.lineTo(pl.largura * 0.25, -alt * 0.6);
                ctx.lineTo(pl.largura / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Fissura de cristal no meio da placa
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(0, -alt * 0.9);
                ctx.lineTo((pl.semente - 0.5) * 4, -alt * 0.3);
                ctx.stroke();

                ctx.restore();
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 14. RENDERIZAR MARTELO DO COLOSSO HIT (Esmagamento 4B)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerMartelosColosso.length - 1; i >= 0; i--) {
            const m = window.vfxSummonerMartelosColosso[i];
            const decorrido = agora - m.criadoEm;
            if (decorrido >= m.duracao) {
                window.vfxSummonerMartelosColosso.splice(i, 1);
                continue;
            }
            const prog = decorrido / m.duracao;
            const alpha = 1.0 - prog;

            ctx.save();
            ctx.translate(m.x, m.y);

            // Flash de impacto monumental nos primeiros 100ms
            if (prog < 0.2) {
                const flashAlpha = (1 - prog / 0.2);
                ctx.fillStyle = `rgba(255, 255, 255, ${(0.85 * flashAlpha).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(0, 0, 50 * flashAlpha, 0, Math.PI * 2);
                ctx.fill();
            }

            // Onda de choque dourada expandindo
            const raioOnda = m.raioMax * prog;
            ctx.strokeStyle = `rgba(245, 158, 11, ${(0.9 * alpha).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.5, 6.0 * (1 - prog));
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 16 * alpha;
            ctx.beginPath();
            ctx.ellipse(0, 0, raioOnda, raioOnda * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Segunda onda violeta logo atrás
            ctx.strokeStyle = `rgba(192, 132, 252, ${(0.7 * alpha).toFixed(3)})`;
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, raioOnda * 0.75, raioOnda * 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Estilhaços telúricos de rocha e magma
            for (const est of m.estilhacos) {
                est.x += est.vx;
                est.y += est.vy;
                est.vy += 0.28;
                ctx.fillStyle = est.cor;
                ctx.globalAlpha = alpha;
                ctx.fillRect(est.x - m.x, est.y - m.y, est.tam, est.tam * 0.7);
            }

            ctx.restore();
        }

        // -------------------------------------------------------------
        // 15. RENDERIZAR COLAPSO TERRITORIAL (Esmagamento 4A)
        // -------------------------------------------------------------
        for (let i = window.vfxSummonerColapsosTerritoriais.length - 1; i >= 0; i--) {
            const col = window.vfxSummonerColapsosTerritoriais[i];
            const decorrido = agora - col.criadoEm;
            if (decorrido >= col.duracao) {
                window.vfxSummonerColapsosTerritoriais.splice(i, 1);
                continue;
            }
            const prog = decorrido / col.duracao;
            const alpha = 1.0 - prog * 0.3;
            const tremor = Math.sin(agora * 0.04) * 2;

            ctx.save();
            ctx.translate(col.x + tremor, col.y);

            // Círculo de terreno instável pulsando com rachaduras
            ctx.fillStyle = `rgba(59, 7, 100, ${(0.22 * alpha).toFixed(3)})`;
            ctx.strokeStyle = `rgba(168, 85, 247, ${(0.65 * alpha).toFixed(3)})`;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, col.raio, col.raio * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Ondas gravitacionais concêntricas se movendo para dentro
            const raioIn = col.raio * (1.0 - ((decorrido % 800) / 800));
            ctx.strokeStyle = `rgba(245, 158, 11, ${(0.5 * alpha).toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, raioIn, raioIn * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    };

})();
