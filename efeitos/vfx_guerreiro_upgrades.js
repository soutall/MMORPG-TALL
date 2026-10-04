// efeitos/vfx_guerreiro_upgrades.js — Efeitos Visuais dos Upgrades do Guerreiro
// =========================================================================================
// Renderização em Canvas 2D de alta performance (60 FPS, PC e Mobile) para Upgrades:
// 1. Postura do Guardião:
//    - Lado A (DPS): Fúria do Vanguarda (aura flamejante rubra), Espinhos de Retaliação,
//                    Pulso de Ruptura (fenda sísmica), Fúria Berserker (olhos carmesins).
//    - Lado B (TANK): Bastião Inabalável (cúpula dourada com escudetes orbitais),
//                     Armadura Titânica (placas de aço translúcidas), Égide Protetora,
//                     Fortaleza Indestrutível (muralha celestial impenetrável com runas).
// 2. Giro do Vanguarda (Tornado):
//    - Lado A (DPS): Vórtice Cortante (lâminas de vento vermelho-sangue), Lâminas Dilacerantes
//                    (projéteis em cruz), Ímpeto da Tempestade (faíscas elétricas e flash crítico),
//                    Cataclismo de Lâminas (tornado colossal de aço com detonação final).
//    - Lado B (TANK): Vórtice Protetor (escudo cinético azul defletor), Ciclone Gravitacional
//                     (espiral de atração), Barricada de Vento (hexágonos de absorção),
//                     Olho do Furacão (baque sísmico com stun e anjo/leão protetor).
// 3. Grito Estrondoso (Provocação):
//    - Lado A (DPS): Rugido Agressivo (ondas sônicas com presas espectrais), Onda Ressonante
//                    (fissuras de quebra de armadura), Fervor de Batalha (chamas de adrenalina),
//                    Brado do Conquistador (explosão acústica monumental com repulsão).
//    - Lado B (TANK): Rugido Encouraçado (nova dupla de cura dourada/esmeralda),
//                     Desmoralização (névoa espectral de pavor), Fôlego Inabalável (gotículas
//                     curativas contínuas), Avatar da Vanguarda (espírito do Leão Ancestral).
// 4. Lançamento do Escudo:
//    - Lado A (DPS): Escudo Serrilhado (serra circular giratória sangrenta), Ricocheteador
//                    (raio zig-zag entre inimigos), Estilhaços Cortantes (6 fragmentos afiados),
//                    Escudo Titânico (cometa colossal de fogo e aço perfurante).
//    - Lado B (TANK): Impacto Esmagador (estrelas e sino de choque), Vórtice de Atração
//                     (implosão magnética no acerto), Escudo de Retorno (bumerangue luminoso),
//                     Muralha Protetora (escudo fincado no solo com cúpula de estandarte sagrado).
// =========================================================================================

(function () {
    'use strict';

    // Arrays de entidades visuais ativas
    window.vfxGuerreiroAuras = [];
    window.vfxGuerreiroPulsosRuptura = [];
    window.vfxGuerreiroEspinhosRetaliacao = [];
    window.vfxGuerreiroTornados = [];
    window.vfxGuerreiroLaminasVento = [];
    window.vfxGuerreiroDetonacoesTornado = [];
    window.vfxGuerreiroGritos = [];
    window.vfxGuerreiroAvatares = [];
    window.vfxGuerreiroEscudosVoando = [];
    window.vfxGuerreiroImpactosEscudo = [];
    window.vfxGuerreiroMuralhas = [];
    window.vfxGuerreiroBarreiras = [];

    // Cores temáticas do Guerreiro: DPS (Fogo/Carmesim/Aço) vs TANK (Ouro/Safira/Titânio)
    const CORES_DPS = {
        fogoClaro: '#fed7aa',
        fogo: '#f97316',
        carmesim: '#ef4444',
        sangue: '#b91c1c',
        sangueEscuro: '#450a0a',
        furiaBrilho: '#ffedd5',
        aco: '#e2e8f0',
        acoEscuro: '#64748b'
    };

    const CORES_TANK = {
        ouroClaro: '#fef08a',
        ouro: '#eab308',
        ouroEscuro: '#ca8a04',
        safiraClaro: '#bae6fd',
        safira: '#38bdf8',
        safiraEscuro: '#0284c7',
        titanio: '#cbd5e1',
        sagrado: '#ffffff'
    };

    // =========================================================================
    // 1. POSTURA DO GUARDIÃO (Aura, Bastião, Armadura, Égide, Berserker, Fortaleza)
    // =========================================================================
    window.criarVfxGuerreiroPostura = function (dados) {
        if (!dados || !dados.id) return;
        const agora = performance.now();
        const duracao = (dados.expiraEm ? Math.max(1000, dados.expiraEm - Date.now()) : 10000);
        
        // Remove anterior se existir
        window.vfxGuerreiroAuras = window.vfxGuerreiroAuras.filter(a => a.id !== dados.id);

        const upg = dados.upgrades || {};
        const isDPS = upg.furia || upg.espinhos || upg.pulso || upg.berserker;
        const isTANK = upg.bastiao || upg.titanica || upg.egide || upg.fortaleza;

        window.vfxGuerreiroAuras.push({
            id: dados.id,
            x: dados.x || 0,
            y: dados.y || 0,
            criadoEm: agora,
            duracao: duracao,
            upgrades: upg,
            isDPS: isDPS,
            isTANK: isTANK,
            angRot: 0,
            particulas: []
        });

        // Se tem Fortaleza Indestrutível (4B TANK), adiciona cúpula celestial monumental nos primeiros 3s
        if (upg.fortaleza) {
            window.vfxGuerreiroBarreiras.push({
                id: dados.id,
                x: dados.x,
                y: dados.y,
                criadoEm: agora,
                duracao: 3000,
                raio: 55,
                tipo: 'fortaleza',
                cor: CORES_TANK.ouroClaro
            });
        }
    };

    // Pulso Sísmico de Ruptura (3A DPS)
    window.criarVfxGuerreiroPulsoRuptura = function (x, y, raio) {
        raio = raio || 140;
        const particulas = [];
        for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.random() * raio * 0.8;
            particulas.push({
                x: x + Math.cos(ang) * dist,
                y: y + Math.sin(ang) * dist * 0.7,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1.0 - Math.random() * 2.0,
                tam: 2 + Math.random() * 3,
                vida: 1.0,
                cor: Math.random() > 0.4 ? CORES_DPS.fogo : CORES_DPS.carmesim
            });
        }
        window.vfxGuerreiroPulsosRuptura.push({
            x: x,
            y: y,
            raio: raio,
            criadoEm: performance.now(),
            duracao: 900,
            particulas: particulas
        });
    };

    // Espinhos de Retaliação (2A DPS)
    window.criarVfxGuerreiroEspinhosRetaliacao = function (x, y) {
        const espinhos = [];
        const n = 12;
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            espinhos.push({
                ang: ang,
                len: 30 + Math.random() * 40,
                larg: 3 + Math.random() * 3,
                fase: Math.random()
            });
        }
        window.vfxGuerreiroEspinhosRetaliacao.push({
            x: x,
            y: y,
            criadoEm: performance.now(),
            duracao: 500,
            espinhos: espinhos
        });
    };

    // =========================================================================
    // 2. GIRO DO VANGUARDA (Tornado, Lâminas, Protetor, Ciclone, Cataclismo)
    // =========================================================================
    window.criarVfxGuerreiroTornado = function (dados) {
        if (!dados || !dados.id) return;
        const upg = dados.upgrades || {};
        const isDPS = upg.cortante || upg.laminas || upg.impeto || upg.cataclismo;
        const isTANK = upg.protetor || upg.gravitacional || upg.barricada || upg.furacao;
        const agora = performance.now();
        const raio = upg.cataclismo ? 140 : 85;

        window.vfxGuerreiroTornados = window.vfxGuerreiroTornados.filter(t => t.id !== dados.id);

        const particulas = [];
        for (let i = 0; i < 28; i++) {
            particulas.push({
                dist: 15 + Math.random() * (raio - 20),
                ang: Math.random() * Math.PI * 2,
                velAng: 0.18 + Math.random() * 0.15,
                yOffset: (Math.random() - 0.5) * 20,
                tam: 2 + Math.random() * 3.5,
                alpha: 0.4 + Math.random() * 0.6
            });
        }

        window.vfxGuerreiroTornados.push({
            id: dados.id,
            x: dados.x || 0,
            y: dados.y || 0,
            criadoEm: agora,
            duracao: 800,
            raio: raio,
            upgrades: upg,
            isDPS: isDPS,
            isTANK: isTANK,
            rotacao: 0,
            particulas: particulas
        });

        // 2A DPS: Lâminas Dilacerantes arremessadas em cruz
        if (upg.laminas) {
            window.criarVfxGuerreiroLaminasVento(dados.x, dados.y);
        }

        // 4A DPS: Cataclismo de Lâminas detonação agendada
        if (upg.cataclismo) {
            setTimeout(() => {
                window.criarVfxGuerreiroDetonacaoTornado(dados.x, dados.y, 'cataclismo');
            }, 750);
        }

        // 4B TANK: Olho do Furacão impacto final com Stun e Luz Celeste
        if (upg.furacao) {
            setTimeout(() => {
                window.criarVfxGuerreiroDetonacaoTornado(dados.x, dados.y, 'furacao');
            }, 750);
        }
    };

    // Lâminas de vento em cruz (2A DPS)
    window.criarVfxGuerreiroLaminasVento = function (x, y) {
        const direcoes = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
        const agora = performance.now();
        direcoes.forEach(ang => {
            window.vfxGuerreiroLaminasVento.push({
                x: x,
                y: y,
                ang: ang,
                speed: 6.5,
                dist: 0,
                maxDist: 180,
                criadoEm: agora,
                duracao: 700
            });
        });
    };

    // Detonação final do Tornado (Cataclismo ou Olho do Furacão)
    window.criarVfxGuerreiroDetonacaoTornado = function (x, y, tipo) {
        window.vfxGuerreiroDetonacoesTornado.push({
            x: x,
            y: y,
            tipo: tipo,
            criadoEm: performance.now(),
            duracao: tipo === 'cataclismo' ? 800 : 900,
            raio: tipo === 'cataclismo' ? 150 : 130
        });
    };

    // =========================================================================
    // 3. GRITO ESTRONDOSO (Provocação, Rugido, Onda, Avatar do Leão)
    // =========================================================================
    window.criarVfxGuerreiroGrito = function (dados) {
        if (!dados) return;
        const upg = dados.upgrades || {};
        const agora = performance.now();
        const x = dados.x || 0;
        const y = dados.y || 0;

        window.vfxGuerreiroGritos.push({
            id: dados.id,
            x: x,
            y: y,
            criadoEm: agora,
            duracao: 1100,
            upgrades: upg,
            cura: dados.cura || 0
        });

        // 4B TANK: Avatar da Vanguarda (Espírito do Leão Celestial sobre o Guerreiro)
        if (upg.avatar) {
            window.criarVfxGuerreiroAvatarLeao(dados.id, x, y, 10000);
        }
    };

    // Avatar do Leão Celestial (4B TANK)
    window.criarVfxGuerreiroAvatarLeao = function (id, x, y, duracao) {
        window.vfxGuerreiroAvatares = window.vfxGuerreiroAvatares.filter(a => a.id !== id);
        window.vfxGuerreiroAvatares.push({
            id: id,
            x: x,
            y: y,
            criadoEm: performance.now(),
            duracao: duracao || 10000,
            alpha: 0.9,
            pulsacao: 0
        });
    };

    // =========================================================================
    // 4. LANÇAMENTO DO ESCUDO (Serrilhado, Titânico, Ricochete, Muralha, Vórtice)
    // =========================================================================
    window.criarVfxGuerreiroLancamentoEscudo = function (dados) {
        if (!dados) return;
        const upg = dados.upgrades || {};
        const agora = performance.now();
        const isTitanico = !!upg.titanico;
        const isSerrilhado = !!upg.serrilhado;

        window.vfxGuerreiroEscudosVoando.push({
            id: dados.id || Math.random(),
            ownerId: dados.ownerId,
            startX: dados.startX || dados.x || 0,
            startY: dados.startY || dados.y || 0,
            x: dados.startX || dados.x || 0,
            y: dados.startY || dados.y || 0,
            targetX: dados.targetX,
            targetY: dados.targetY,
            ang: dados.ang || Math.atan2((dados.targetY || 0) - (dados.startY || 0), (dados.targetX || 0) - (dados.startX || 0)),
            speed: isTitanico ? 11 : 9.5,
            dist: 0,
            maxDist: isTitanico ? 360 : (dados.maxDist || 300),
            rotacao: 0,
            escala: isTitanico ? 2.1 : 1.0,
            upgrades: upg,
            isSerrilhado: isSerrilhado,
            isTitanico: isTitanico,
            rastro: [],
            criadoEm: agora
        });
    };

    // Impacto do Escudo (Stun, Estilhaços, Vórtice, Muralha)
    window.criarVfxGuerreiroEscudoHit = function (dados) {
        if (!dados) return;
        const upg = dados.upgrades || {};
        const agora = performance.now();
        const x = dados.x || 0;
        const y = dados.y || 0;

        window.vfxGuerreiroImpactosEscudo.push({
            x: x,
            y: y,
            ownerId: dados.ownerId,
            upgrades: upg,
            criadoEm: agora,
            duracao: 800
        });

        // 4B TANK: Muralha Protetora fincada no solo
        if (upg.muralha) {
            window.criarVfxGuerreiroMuralha(x, y, 5000);
        }

        // 3B TANK: Barreira no retorno do escudo
        if (upg.retorno && dados.ownerId) {
            window.vfxGuerreiroBarreiras.push({
                id: dados.ownerId,
                x: dados.targetX || x,
                y: dados.targetY || y,
                criadoEm: agora,
                duracao: 6000,
                raio: 45,
                tipo: 'retorno',
                cor: CORES_TANK.safira
            });
        }
    };

    // Muralha Protetora no Solo (4B TANK)
    window.criarVfxGuerreiroMuralha = function (x, y, duracao) {
        window.vfxGuerreiroMuralhas.push({
            x: x,
            y: y,
            criadoEm: performance.now(),
            duracao: duracao || 5000,
            raio: 110,
            pulsacao: 0
        });
    };

    // =========================================================================
    // RENDERIZADOR MASTER: window.desenharEfeitosGuerreiroUpgrades()
    // =========================================================================
    window.desenharEfeitosGuerreiroUpgrades = function () {
        const ctx = window.ctx;
        if (!ctx) return;

        const agora = performance.now();

        // ---------------------------------------------------------------------
        // 1. MURALHAS PROTETORAS NO SOLO (4B TANK - Escudo)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroMuralhas.length - 1; i >= 0; i--) {
            const m = window.vfxGuerreiroMuralhas[i];
            const elapsed = agora - m.criadoEm;
            if (elapsed >= m.duracao) {
                window.vfxGuerreiroMuralhas.splice(i, 1);
                continue;
            }
            const prog = elapsed / m.duracao;
            const alpha = prog > 0.85 ? (1 - prog) / 0.15 : Math.min(1.0, elapsed / 300);

            ctx.save();
            ctx.translate(m.x, m.y);

            // Círculo sagrado no chão
            ctx.beginPath();
            ctx.ellipse(0, 0, m.raio, m.raio * 0.65, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(234, 179, 8, ${0.12 * alpha})`;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.7 * alpha})`;
            ctx.setLineDash([8, 6]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Escudo cravado no centro
            ctx.fillStyle = `rgba(202, 138, 4, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(14, -8);
            ctx.lineTo(10, 14);
            ctx.lineTo(0, 22);
            ctx.lineTo(-10, 14);
            ctx.lineTo(-14, -8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Símbolo do leão no escudo cravado
            ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            // Runas flutuantes ao redor
            const numRunas = 6;
            for (let r = 0; r < numRunas; r++) {
                const angRuna = (r / numRunas) * Math.PI * 2 + (elapsed * 0.001);
                const rx = Math.cos(angRuna) * m.raio * 0.85;
                const ry = Math.sin(angRuna) * m.raio * 0.55;
                ctx.fillStyle = `rgba(254, 240, 138, ${0.65 * alpha})`;
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 2. PULSOS SÍSMICOS DE RUPTURA (3A DPS - Postura)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroPulsosRuptura.length - 1; i >= 0; i--) {
            const p = window.vfxGuerreiroPulsosRuptura[i];
            const elapsed = agora - p.criadoEm;
            if (elapsed >= p.duracao) {
                window.vfxGuerreiroPulsosRuptura.splice(i, 1);
                continue;
            }
            const prog = elapsed / p.duracao;
            const curRaio = p.raio * Math.sin(prog * Math.PI * 0.5);
            const alpha = (1 - prog);

            ctx.save();
            ctx.translate(p.x, p.y);

            // Anel de choque no solo
            ctx.beginPath();
            ctx.ellipse(0, 0, curRaio, curRaio * 0.65, 0, 0, Math.PI * 2);
            ctx.lineWidth = 3 * (1 - prog);
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.85 * alpha})`;
            ctx.stroke();

            // Segundo anel interior de fogo
            ctx.beginPath();
            ctx.ellipse(0, 0, curRaio * 0.75, curRaio * 0.75 * 0.65, 0, 0, Math.PI * 2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 * alpha})`;
            ctx.stroke();

            // Partículas de fagulhas
            if (p.particulas) {
                p.particulas.forEach(pt => {
                    pt.x += pt.vx;
                    pt.y += pt.vy;
                    pt.vy += 0.05; // gravidade
                    pt.vida -= 0.02;
                    if (pt.vida > 0) {
                        ctx.fillStyle = pt.cor;
                        ctx.globalAlpha = pt.vida * alpha;
                        ctx.beginPath();
                        ctx.arc(pt.x - p.x, pt.y - p.y, pt.tam, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 3. ESPINHOS DE RETALIAÇÃO (2A DPS - Postura)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroEspinhosRetaliacao.length - 1; i >= 0; i--) {
            const e = window.vfxGuerreiroEspinhosRetaliacao[i];
            const elapsed = agora - e.criadoEm;
            if (elapsed >= e.duracao) {
                window.vfxGuerreiroEspinhosRetaliacao.splice(i, 1);
                continue;
            }
            const prog = elapsed / e.duracao;
            const alpha = 1 - prog;

            ctx.save();
            ctx.translate(e.x, e.y);
            e.espinhos.forEach(esp => {
                const len = esp.len * Math.min(1.0, prog * 3.5);
                const tipX = Math.cos(esp.ang) * len;
                const tipY = Math.sin(esp.ang) * len * 0.7;

                ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.lineWidth = esp.larg * (1 - prog * 0.5);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();

                // Brilho na ponta do espinho
                ctx.fillStyle = `rgba(255, 237, 213, ${alpha * 0.9})`;
                ctx.beginPath();
                ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 4. AURAS E BASTIÕES DO GUERREIRO (Postura do Guardião)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroAuras.length - 1; i >= 0; i--) {
            const a = window.vfxGuerreiroAuras[i];
            const elapsed = agora - a.criadoEm;
            if (elapsed >= a.duracao) {
                window.vfxGuerreiroAuras.splice(i, 1);
                continue;
            }

            // Localiza jogador dono da aura para seguir sua posição
            let px = a.x, py = a.y;
            if (a.id === window.meuId) {
                px = (window.meuX || 0) + 12;
                py = (window.meuY || 0) + 16;
            } else if (window.todosJogadores && window.todosJogadores[a.id]) {
                const pj = window.todosJogadores[a.id];
                px = (pj.x || 0) + 12;
                py = (pj.y || 0) + 16;
            }
            a.x = px;
            a.y = py;

            const upg = a.upgrades || {};
            const alphaGeral = Math.min(1.0, (a.duracao - elapsed) / 1000);

            ctx.save();
            ctx.translate(px, py);

            if (a.isDPS || upg.furia || upg.berserker) {
                // Ramo A: DPS (Chamas de Fúria / Carmesim)
                a.angRot += 0.04;
                const pulso = Math.sin(elapsed * 0.006) * 4;

                // Anel de fogo giratório
                ctx.beginPath();
                ctx.ellipse(0, 8, 38 + pulso, (38 + pulso) * 0.55, a.angRot, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(249, 115, 22, ${0.75 * alphaGeral})`;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Brasas ascendentes
                if (Math.random() < 0.4) {
                    a.particulas.push({
                        x: (Math.random() - 0.5) * 36,
                        y: 8 + (Math.random() - 0.5) * 12,
                        vy: -1.2 - Math.random() * 1.5,
                        vida: 1.0
                    });
                }
                for (let k = a.particulas.length - 1; k >= 0; k--) {
                    const pt = a.particulas[k];
                    pt.y += pt.vy;
                    pt.vida -= 0.035;
                    if (pt.vida <= 0) {
                        a.particulas.splice(k, 1);
                    } else {
                        ctx.fillStyle = `rgba(239, 68, 68, ${pt.vida * alphaGeral})`;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // 4A: Fúria Berserker (Olhos vermelhos incandescentes)
                if (upg.berserker) {
                    ctx.fillStyle = `rgba(255, 0, 0, ${0.9 * alphaGeral})`;
                    ctx.shadowColor = '#ff0000';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(-3, -20, 2, 0, Math.PI * 2);
                    ctx.arc(3, -20, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            } else {
                // Ramo B: TANK (Cúpula Dourada de Bastião / Escudos Orbitais)
                a.angRot += 0.03;
                const pulso = Math.sin(elapsed * 0.005) * 3;

                // Anel dourado no chão
                ctx.beginPath();
                ctx.ellipse(0, 8, 40 + pulso, (40 + pulso) * 0.55, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(234, 179, 8, ${0.85 * alphaGeral})`;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // 3 pequenos escudetes dourados orbitando
                const numEscudos = 3;
                for (let s = 0; s < numEscudos; s++) {
                    const angS = a.angRot + (s / numEscudos) * Math.PI * 2;
                    const sx = Math.cos(angS) * 34;
                    const sy = 6 + Math.sin(angS) * 18;

                    ctx.fillStyle = `rgba(234, 179, 8, ${0.85 * alphaGeral})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 6);
                    ctx.lineTo(sx + 5, sy - 3);
                    ctx.lineTo(sx + 4, sy + 5);
                    ctx.lineTo(sx, sy + 8);
                    ctx.lineTo(sx - 4, sy + 5);
                    ctx.lineTo(sx - 5, sy - 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                // 2B: Armadura Titânica (Ombreiras metálicas translúcidas azuis)
                if (upg.titanica) {
                    ctx.fillStyle = `rgba(56, 189, 248, ${0.45 * alphaGeral})`;
                    ctx.beginPath();
                    ctx.arc(-14, -12, 6, 0, Math.PI * 2);
                    ctx.arc(14, -12, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 3B: Égide Protetora (Aura expandida suave)
                if (upg.egide) {
                    ctx.beginPath();
                    ctx.ellipse(0, 8, 120, 75, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 * alphaGeral})`;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 5. GIRO DO VANGUARDA / TORNADO (Vórtices, Protetores, Cataclismo)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroTornados.length - 1; i >= 0; i--) {
            const t = window.vfxGuerreiroTornados[i];
            const elapsed = agora - t.criadoEm;
            if (elapsed >= t.duracao) {
                window.vfxGuerreiroTornados.splice(i, 1);
                continue;
            }

            // Segue o jogador se possível
            let tx = t.x, ty = t.y;
            if (t.id === window.meuId) {
                tx = (window.meuX || 0) + 12;
                ty = (window.meuY || 0) + 16;
            } else if (window.todosJogadores && window.todosJogadores[t.id]) {
                const pj = window.todosJogadores[t.id];
                tx = (pj.x || 0) + 12;
                ty = (pj.y || 0) + 16;
            }

            const prog = elapsed / t.duracao;
            const alpha = prog > 0.8 ? (1 - prog) / 0.2 : Math.min(1.0, elapsed / 100);
            t.rotacao += 0.25;

            ctx.save();
            ctx.translate(tx, ty);

            const isDPS = t.isDPS;
            const raio = t.raio;

            // Anel do tornado
            ctx.beginPath();
            ctx.ellipse(0, 0, raio, raio * 0.65, t.rotacao, 0, Math.PI * 2);
            ctx.lineWidth = isDPS ? 4 : 3;
            ctx.strokeStyle = isDPS ? `rgba(239, 68, 68, ${0.8 * alpha})` : `rgba(56, 189, 248, ${0.8 * alpha})`;
            ctx.stroke();

            // Linhas espirais de vento
            for (let w = 0; w < 3; w++) {
                const angW = t.rotacao + (w / 3) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(0, 0, raio * 0.7, angW, angW + 1.2);
                ctx.strokeStyle = isDPS ? `rgba(249, 115, 22, ${0.65 * alpha})` : `rgba(186, 230, 253, ${0.75 * alpha})`;
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            // Partículas orbitando velozmente
            t.particulas.forEach(pt => {
                pt.ang += pt.velAng;
                const px = Math.cos(pt.ang) * pt.dist;
                const py = Math.sin(pt.ang) * pt.dist * 0.65 + pt.yOffset;
                ctx.fillStyle = isDPS ? CORES_DPS.fogo : CORES_TANK.safiraClaro;
                ctx.globalAlpha = pt.alpha * alpha;
                ctx.beginPath();
                ctx.arc(px, py, pt.tam, 0, Math.PI * 2);
                ctx.fill();
            });

            // 3A: Ímpeto da Tempestade (Faíscas elétricas de relâmpago)
            if (t.upgrades && t.upgrades.impeto) {
                for (let k = 0; k < 2; k++) {
                    const angR = Math.random() * Math.PI * 2;
                    const rDist = Math.random() * raio;
                    ctx.strokeStyle = '#fef08a';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angR) * rDist * 0.5 + (Math.random() - 0.5) * 15, Math.sin(angR) * rDist * 0.35);
                    ctx.lineTo(Math.cos(angR) * rDist, Math.sin(angR) * rDist * 0.65);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 6. LÂMINAS DE VENTO EM CRUZ (2A DPS - Tornado)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroLaminasVento.length - 1; i >= 0; i--) {
            const l = window.vfxGuerreiroLaminasVento[i];
            const elapsed = agora - l.criadoEm;
            if (elapsed >= l.duracao || l.dist >= l.maxDist) {
                window.vfxGuerreiroLaminasVento.splice(i, 1);
                continue;
            }
            l.dist += l.speed;
            const curX = l.x + Math.cos(l.ang) * l.dist;
            const curY = l.y + Math.sin(l.ang) * l.dist;
            const alpha = 1 - (l.dist / l.maxDist);

            ctx.save();
            ctx.translate(curX, curY);
            ctx.rotate(l.ang);

            // Foice / lâmina crescente de vento vermelho
            ctx.beginPath();
            ctx.arc(0, 0, 16, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 12, -Math.PI * 0.3, Math.PI * 0.3);
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255, 237, 213, ${alpha * 0.9})`;
            ctx.stroke();

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 7. DETONAÇÕES FINAIS DO TORNADO (Cataclismo ou Olho do Furacão)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroDetonacoesTornado.length - 1; i >= 0; i--) {
            const d = window.vfxGuerreiroDetonacoesTornado[i];
            const elapsed = agora - d.criadoEm;
            if (elapsed >= d.duracao) {
                window.vfxGuerreiroDetonacoesTornado.splice(i, 1);
                continue;
            }
            const prog = elapsed / d.duracao;
            const alpha = 1 - prog;
            const r = d.raio * Math.sin(prog * Math.PI * 0.5);

            ctx.save();
            ctx.translate(d.x, d.y);

            if (d.tipo === 'cataclismo') {
                // Detonação massiva de aço e fogo
                ctx.beginPath();
                ctx.ellipse(0, 0, r, r * 0.65, 0, 0, Math.PI * 2);
                ctx.lineWidth = 4 * (1 - prog);
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.9 * alpha})`;
                ctx.stroke();

                // Estilhaços metálicos espalhados
                const numEst = 8;
                for (let e = 0; e < numEst; e++) {
                    const angE = (e / numEst) * Math.PI * 2;
                    const ex = Math.cos(angE) * r * 0.9;
                    const ey = Math.sin(angE) * r * 0.6;
                    ctx.fillStyle = CORES_DPS.aco;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Olho do Furacão: Anel de choque dourado/azul de Stun
                ctx.beginPath();
                ctx.ellipse(0, 0, r, r * 0.65, 0, 0, Math.PI * 2);
                ctx.lineWidth = 3.5 * (1 - prog);
                ctx.strokeStyle = `rgba(234, 179, 8, ${0.9 * alpha})`;
                ctx.stroke();

                ctx.fillStyle = `rgba(254, 240, 138, ${0.15 * alpha})`;
                ctx.fill();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 8. GRITO ESTRONDOSO (Ondas Sônicas, Cura Dupla, Presas, Conquistador)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroGritos.length - 1; i >= 0; i--) {
            const g = window.vfxGuerreiroGritos[i];
            const elapsed = agora - g.criadoEm;
            if (elapsed >= g.duracao) {
                window.vfxGuerreiroGritos.splice(i, 1);
                continue;
            }
            const prog = elapsed / g.duracao;
            const alpha = 1 - prog;
            const upg = g.upgrades || {};
            const isDPS = upg.agressivo || upg.ressonante || upg.fervor || upg.conquistador;
            const maxRaio = upg.conquistador ? 320 : 250;
            const curRaio = maxRaio * Math.pow(prog, 0.7);

            ctx.save();
            ctx.translate(g.x, g.y);

            // 3 anéis sônicos concêntricos em expansão
            for (let w = 0; w < 3; w++) {
                const subProg = Math.max(0, prog - w * 0.15);
                if (subProg <= 0) continue;
                const rW = maxRaio * Math.pow(subProg, 0.7);
                const aW = (1 - subProg) * alpha;

                ctx.beginPath();
                ctx.ellipse(0, 0, rW, rW * 0.65, 0, 0, Math.PI * 2);
                ctx.lineWidth = isDPS ? 3.5 : 2.5;
                ctx.strokeStyle = isDPS ? `rgba(239, 68, 68, ${0.85 * aW})` : `rgba(234, 179, 8, ${0.85 * aW})`;
                ctx.stroke();
            }

            // 1A DPS: Presas espectrais de leão rugindo
            if (upg.agressivo) {
                const fAngs = [-0.3, 0.3, Math.PI - 0.3, Math.PI + 0.3];
                fAngs.forEach(fa => {
                    const fx = Math.cos(fa) * curRaio * 0.6;
                    const fy = Math.sin(fa) * curRaio * 0.4;
                    ctx.fillStyle = `rgba(239, 68, 68, ${0.75 * alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(fx, fy - 6);
                    ctx.lineTo(fx + 6, fy + 8);
                    ctx.lineTo(fx - 6, fy + 8);
                    ctx.closePath();
                    ctx.fill();
                });
            }

            // 1B TANK: Brilho duplo de cura esmeralda + dourado
            if (upg.encouracado) {
                ctx.fillStyle = `rgba(74, 222, 128, ${0.25 * alpha})`;
                ctx.beginPath();
                ctx.ellipse(0, 0, curRaio * 0.5, curRaio * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 9. AVATAR DA VANGUARDA (4B TANK - Leão Celestial Dourado)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroAvatares.length - 1; i >= 0; i--) {
            const av = window.vfxGuerreiroAvatares[i];
            const elapsed = agora - av.criadoEm;
            if (elapsed >= av.duracao) {
                window.vfxGuerreiroAvatares.splice(i, 1);
                continue;
            }

            // Segue posição do Guerreiro
            let ax = av.x, ay = av.y;
            if (av.id === window.meuId) {
                ax = (window.meuX || 0) + 12;
                ay = (window.meuY || 0) + 16;
            } else if (window.todosJogadores && window.todosJogadores[av.id]) {
                const pj = window.todosJogadores[av.id];
                ax = (pj.x || 0) + 12;
                ay = (pj.y || 0) + 16;
            }

            const alphaGeral = Math.min(1.0, (av.duracao - elapsed) / 1000);
            const pulso = Math.sin(elapsed * 0.004) * 0.15;

            ctx.save();
            ctx.translate(ax, ay - 35);
            ctx.scale(1.3 + pulso, 1.3 + pulso);

            // Efígie dourada translúcida do Leão da Vanguarda
            ctx.fillStyle = `rgba(234, 179, 8, ${0.35 * alphaGeral})`;
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.85 * alphaGeral})`;
            ctx.lineWidth = 2;

            // Crina do Leão
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Orelhas
            ctx.beginPath();
            ctx.moveTo(-18, -12);
            ctx.lineTo(-24, -26);
            ctx.lineTo(-10, -22);
            ctx.moveTo(18, -12);
            ctx.lineTo(24, -26);
            ctx.lineTo(10, -22);
            ctx.stroke();

            // Olhos brilhantes sagrados
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-8, -4, 2.5, 0, Math.PI * 2);
            ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Focinho
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.9 * alphaGeral})`;
            ctx.beginPath();
            ctx.moveTo(-5, 6);
            ctx.lineTo(0, 10);
            ctx.lineTo(5, 6);
            ctx.stroke();

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 10. LANÇAMENTO DO ESCUDO (Projétil Voando e Girando)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroEscudosVoando.length - 1; i >= 0; i--) {
            const e = window.vfxGuerreiroEscudosVoando[i];
            e.dist += e.speed;
            e.x += Math.cos(e.ang) * e.speed;
            e.y += Math.sin(e.ang) * e.speed;
            e.rotacao += 0.35;

            // Salva rastro
            e.rastro.unshift({ x: e.x, y: e.y });
            if (e.rastro.length > 8) e.rastro.pop();

            if (e.dist >= e.maxDist) {
                // Chegou ao fim do curso: gera impacto final
                window.criarVfxGuerreiroEscudoHit({
                    x: e.x,
                    y: e.y,
                    ownerId: e.ownerId,
                    upgrades: e.upgrades
                });
                window.vfxGuerreiroEscudosVoando.splice(i, 1);
                continue;
            }

            ctx.save();

            // Desenha rastro luminoso
            for (let r = 0; r < e.rastro.length - 1; r++) {
                const rProg = 1 - (r / e.rastro.length);
                ctx.beginPath();
                ctx.moveTo(e.rastro[r].x, e.rastro[r].y);
                ctx.lineTo(e.rastro[r + 1].x, e.rastro[r + 1].y);
                ctx.lineWidth = (e.isTitanico ? 8 : 4) * rProg;
                ctx.strokeStyle = e.isTitanico
                    ? `rgba(239, 68, 68, ${0.6 * rProg})`
                    : (e.isSerrilhado ? `rgba(249, 115, 22, ${0.5 * rProg})` : `rgba(56, 189, 248, ${0.5 * rProg})`);
                ctx.stroke();
            }

            ctx.translate(e.x, e.y);
            ctx.rotate(e.rotacao);
            ctx.scale(e.escala, e.escala);

            if (e.isTitanico) {
                // 4A DPS: Escudo Colossal de Fogo Titânico
                ctx.fillStyle = CORES_DPS.carmesim;
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.moveTo(0, -18);
                ctx.lineTo(16, -8);
                ctx.lineTo(12, 14);
                ctx.lineTo(0, 22);
                ctx.lineTo(-12, 14);
                ctx.lineTo(-16, -8);
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#fef08a';
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (e.isSerrilhado) {
                // 1A DPS: Escudo Serrilhado com dentes de serra
                ctx.fillStyle = '#7f1d1d';
                ctx.beginPath();
                ctx.arc(0, 0, 11, 0, Math.PI * 2);
                ctx.fill();

                // Dentes de serra
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                for (let d = 0; d < 8; d++) {
                    const angD = (d / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angD) * 11, Math.sin(angD) * 11);
                    ctx.lineTo(Math.cos(angD + 0.2) * 16, Math.sin(angD + 0.2) * 16);
                    ctx.stroke();
                }
            } else {
                // Base / TANK: Escudo Ogival de Aço Dourado
                ctx.fillStyle = '#ca8a04';
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(10, -5);
                ctx.lineTo(8, 10);
                ctx.lineTo(0, 15);
                ctx.lineTo(-8, 10);
                ctx.lineTo(-10, -5);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 11. IMPACTOS DO ESCUDO (Stun, Estilhaços, Vórtice)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroImpactosEscudo.length - 1; i >= 0; i--) {
            const h = window.vfxGuerreiroImpactosEscudo[i];
            const elapsed = agora - h.criadoEm;
            if (elapsed >= h.duracao) {
                window.vfxGuerreiroImpactosEscudo.splice(i, 1);
                continue;
            }
            const prog = elapsed / h.duracao;
            const alpha = 1 - prog;
            const upg = h.upgrades || {};

            ctx.save();
            ctx.translate(h.x, h.y);

            // Flash de impacto central
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, 18 * (1 - prog), 0, Math.PI * 2);
            ctx.fill();

            // 1B TANK: Estrelas de Stun (Impacto Esmagador)
            if (upg.esmagador) {
                for (let s = 0; s < 4; s++) {
                    const angS = (s / 4) * Math.PI * 2 + (elapsed * 0.008);
                    const sx = Math.cos(angS) * 22;
                    const sy = Math.sin(angS) * 12 - 15;
                    ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // 3A DPS: Estilhaços Cortantes (6 fragmentos afiados em 360°)
            if (upg.estilhacos) {
                for (let k = 0; k < 6; k++) {
                    const angK = (k / 6) * Math.PI * 2;
                    const distK = 50 * prog;
                    ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angK) * (distK - 10), Math.sin(angK) * (distK - 10));
                    ctx.lineTo(Math.cos(angK) * distK, Math.sin(angK) * distK);
                    ctx.stroke();
                }
            }

            // 2B TANK: Vórtice de Atração no Impacto
            if (upg.vortice) {
                ctx.beginPath();
                ctx.ellipse(0, 0, 60 * (1 - prog), 35 * (1 - prog), elapsed * 0.01, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 * alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // 12. BARREIRAS DE ESCUDO TEMPORÁRIAS (Bastião, Retorno, Barricada)
        // ---------------------------------------------------------------------
        for (let i = window.vfxGuerreiroBarreiras.length - 1; i >= 0; i--) {
            const b = window.vfxGuerreiroBarreiras[i];
            const elapsed = agora - b.criadoEm;
            if (elapsed >= b.duracao) {
                window.vfxGuerreiroBarreiras.splice(i, 1);
                continue;
            }

            // Segue o jogador se tiver ID
            let bx = b.x, by = b.y;
            if (b.id === window.meuId) {
                bx = (window.meuX || 0) + 12;
                by = (window.meuY || 0) + 16;
            } else if (window.todosJogadores && window.todosJogadores[b.id]) {
                const pj = window.todosJogadores[b.id];
                bx = (pj.x || 0) + 12;
                by = (pj.y || 0) + 16;
            }

            const alpha = Math.min(1.0, (b.duracao - elapsed) / 800);
            const pulso = Math.sin(elapsed * 0.005) * 3;

            ctx.save();
            ctx.translate(bx, by);

            ctx.beginPath();
            ctx.arc(0, 0, b.raio + pulso, 0, Math.PI * 2);
            ctx.fillStyle = b.cor === CORES_TANK.ouroClaro
                ? `rgba(234, 179, 8, ${0.20 * alpha})`
                : `rgba(56, 189, 248, ${0.20 * alpha})`;
            ctx.fill();

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = b.cor === CORES_TANK.ouroClaro
                ? `rgba(254, 240, 138, ${0.85 * alpha})`
                : `rgba(186, 230, 253, ${0.85 * alpha})`;
            ctx.stroke();

            ctx.restore();
        }
    };
})();
