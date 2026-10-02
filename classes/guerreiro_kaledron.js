// classes/guerreiro_kaledron.js — Renderização completa do Guerreiro Kaledron (Magma Knight)
// 100% procedural em Canvas 2D (conforme GDD: GUERREIRO_KALEDRON.gdd e VISUAL_CLASSES_GUIDE.gdd).
(function () {
    'use strict';

    function _agora() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    // Estados de animação e posições inerciais de espada por jogador (pid -> dados)
    window.kaledronAnims = window.kaledronAnims || {};
    window.kaledronEspadas = window.kaledronEspadas || {}; // LERP e inércia do montante flutuante
    window.kaledronParticulas = window.kaledronParticulas || {}; // Brasas, poeira e fumaça por jogador

    // Estado local para o próprio jogador
    window.kaledronEstadoLocal = window.kaledronEstadoLocal || {
        redemoinhoAtivo: false,
        redemoinhoInicio: 0,
        redemoinhoDur: 3000,
        bradoAtivo: false,
        bradoExpira: 0
    };

    // Registra animações de ataque ou skills
    window.registrarKaledronAnim = function (pid, estado, dur, dados) {
        if (!pid) return;
        let base = { estado: estado, inicio: _agora(), dur: dur || 420 };
        if (dados) Object.assign(base, dados);
        window.kaledronAnims[pid] = base;

        if (pid === window.meuId) {
            if (estado === 'redemoinho') {
                window.kaledronEstadoLocal.redemoinhoAtivo = true;
                window.kaledronEstadoLocal.redemoinhoInicio = base.inicio;
                window.kaledronEstadoLocal.redemoinhoDur = dur || 3000;
            }
            if (estado === 'idle') {
                window.kaledronEstadoLocal.redemoinhoAtivo = false;
            }
        }
    };

    // Helper que verifica se o Kaledron está travado em animação de skill (ex: redemoinho ou impacto)
    window.kaledronEmAnimacaoSkill = function (pid) {
        let id = pid || window.meuId;
        if (!id) return false;
        let agora = _agora();
        let anim = window.kaledronAnims && window.kaledronAnims[id];
        if (anim && (anim.estado === 'impacto' || anim.estado === 'redemoinho' || anim.estado === 'brado')) {
            let decorrido = agora - (anim.inicio || 0);
            if (decorrido >= 0 && decorrido < (anim.dur || 0)) {
                return true;
            } else {
                if (id === window.meuId && window.kaledronEstadoLocal) {
                    if (anim.estado === 'redemoinho') window.kaledronEstadoLocal.redemoinhoAtivo = false;
                }
            }
        }
        if (id === window.meuId && window.kaledronEstadoLocal && window.kaledronEstadoLocal.redemoinhoAtivo) {
            let decorrido = agora - (window.kaledronEstadoLocal.redemoinhoInicio || 0);
            if (decorrido >= 0 && decorrido < (window.kaledronEstadoLocal.redemoinhoDur || 3000)) return true;
            window.kaledronEstadoLocal.redemoinhoAtivo = false;
        }
        return false;
    };

    // Utilitário de gradiente
    function _grad(ctx, x1, y1, x2, y2, stops) {
        let g = ctx.createLinearGradient(x1, y1, x2, y2);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        return g;
    }

    // Inicializa sistema de partículas locais por jogador
    function obterParticulas(pid) {
        if (!window.kaledronParticulas[pid]) {
            window.kaledronParticulas[pid] = {
                embers: [],
                smoke: [],
                sparks: [],
                lavaShards: [],
                lastEmber: 0,
                lastSmoke: 0,
                lastLavaShard: 0,
                walkCycle: 0,
                lastX: 0,
                lastY: 0
            };
        }
        return window.kaledronParticulas[pid];
    }

    /* =========================================================================
       RENDERIZAÇÃO PROCEDURAL DO GUERREIRO KALEDRON (Canvas 2D)
       ========================================================================= */
    window.desenharKaledron = function (x, y, isMoving, anguloBase, hp, maxHp, pid, opcoes) {
        let ctx = window.ctx;
        if (!ctx) return;

        let agora = _agora();
        let id = pid || 'kaledron_local';
        let dadosPart = obterParticulas(id);
        let anim = window.kaledronAnims[id];
        let progAnim = 0;
        let estadoAnim = 'idle';
        let anguloAtaque = Number.isFinite(anim && anim.angulo) ? anim.angulo : (anguloBase || 0);

        if (anim) {
            let decorrido = agora - anim.inicio;
            if (decorrido < anim.dur) {
                progAnim = decorrido / anim.dur;
                estadoAnim = anim.estado;
            } else {
                delete window.kaledronAnims[id];
            }
        }

        // Determina orientação (olhando para a direita ou esquerda)
        let facingRight = true;
        if (anguloBase !== undefined && anguloBase !== null) {
            facingRight = Math.cos(anguloBase) >= 0;
        }

        // Variáveis de ciclo
        let dt = 0.016;
        let breathTime = agora * 0.0026;
        let breathBob = Math.sin(breathTime * 1.5) * 1.8; // Bobbing de respiração (0..2px)
        let pauldronBob = Math.sin(breathTime * 1.5 + 0.3) * 2.5;

        if (isMoving) {
            dadosPart.walkCycle += dt * 9.5;
        }

        ctx.save();
        ctx.translate(x, y);

        /* =====================================================================
           [CAMADA 1] EFEITO DE SOLO: CRATERA VULCÂNICA & FISSURAS INCANDESCENTES
           (GDD 2.1: elipse x, y + 14, 26, 10 com pulso de calor e fissuras de lava)
           ===================================================================== */
        ctx.save();
        let pulsoCalor = Math.sin(breathTime * 1.5) * 2.0;
        let raioCrateraX = 26 + pulsoCalor;
        let raioCrateraY = 10 + (pulsoCalor * 0.38);

        // Halo térmico sob os pés
        let glowGrad = ctx.createRadialGradient(0, 14, 2, 0, 14, raioCrateraX);
        glowGrad.addColorStop(0, 'rgba(255, 87, 34, 0.45)');
        glowGrad.addColorStop(0.5, 'rgba(230, 126, 34, 0.22)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 14, raioCrateraX, raioCrateraY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Solo rachado / Rocha escura
        ctx.fillStyle = 'rgba(26, 26, 36, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fissuras de lava em zigue-zague
        ctx.strokeStyle = '#ff5722';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-16, 14);
        ctx.lineTo(-8, 12);
        ctx.lineTo(-2, 15);
        ctx.lineTo(6, 13);
        ctx.lineTo(15, 14);
        ctx.stroke();

        ctx.strokeStyle = '#fdcb6e';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-10, 14);
        ctx.lineTo(-4, 15);
        ctx.lineTo(3, 14);
        ctx.lineTo(11, 13);
        ctx.stroke();

        // Brasas subindo da cratera (emberParticles)
        if (agora - dadosPart.lastEmber > 90) {
            dadosPart.lastEmber = agora;
            if (dadosPart.embers.length < 18) {
                dadosPart.embers.push({
                    x: (Math.random() - 0.5) * 36,
                    y: 14 + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: -0.6 - Math.random() * 0.8,
                    tam: 1.0 + Math.random() * 1.8,
                    vida: 1.0,
                    dec: 0.02 + Math.random() * 0.02,
                    cor: Math.random() > 0.4 ? '#ff5722' : '#fdcb6e'
                });
            }
        }
        for (let i = dadosPart.embers.length - 1; i >= 0; i--) {
            let em = dadosPart.embers[i];
            em.x += em.vx;
            em.y += em.vy;
            em.vida -= em.dec;
            if (em.vida <= 0) {
                dadosPart.embers.splice(i, 1);
                continue;
            }
            ctx.fillStyle = em.cor;
            ctx.globalAlpha = em.vida * 0.85;
            ctx.beginPath();
            ctx.arc(em.x, em.y, em.tam, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        /* =====================================================================
           [CAMADA 2] SOMBRA DO MONTANTE COLOSSAL FLUTUANTE NO SOLO
           (GDD 2.3: projetada no solo abaixo da espada, expande/contrai com a altura)
           ===================================================================== */
        let swordOsc = Math.sin(breathTime * 1.2) * 5.0; // Oscilação em Y da espada
        let swordRestX = facingRight ? 24 : -24;
        let swordRestY = -12 + swordOsc;

        // Se estiver em animação de ataque, impacto ou redemoinho, posiciona conforme o estado
        let espadaX = swordRestX;
        let espadaY = swordRestY;
        let espadaAngulo = facingRight ? 0.18 : -0.18;
        let escalaEspadaSombra = 1.0;

        if (estadoAnim === 'ataque') {
            if (progAnim < 0.3) {
                let p = progAnim / 0.3;
                espadaX = swordRestX - Math.cos(anguloAtaque) * 18 * p;
                espadaY = swordRestY - Math.sin(anguloAtaque) * 18 * p;
                espadaAngulo = anguloAtaque + Math.PI * 0.5 - 0.85 * p;
            } else if (progAnim < 0.65) {
                let p = (progAnim - 0.3) / 0.35;
                let sweep = (p - 0.5) * 0.9;
                espadaX = Math.cos(anguloAtaque) * 28;
                espadaY = Math.sin(anguloAtaque) * 28;
                espadaAngulo = anguloAtaque + Math.PI * 0.5 + sweep;
            } else {
                // Fase 3: Recovery suave
                let p = (progAnim - 0.65) / 0.35;
                let finalX = facingRight ? 24 : -24;
                let finalY = -12 + swordOsc;
                espadaX = (facingRight ? 30 : -30) * (1 - p) + finalX * p;
                espadaY = 6 * (1 - p) + finalY * p;
                espadaAngulo = (facingRight ? 0.4 : -0.4) * (1 - p) + (facingRight ? 0.18 : -0.18) * p;
            }
        } else if (estadoAnim === 'redemoinho') {
            // Montante orbita em alta velocidade a 360° em raio 38px
            let angGiro = progAnim * Math.PI * 14;
            let raioRed = 38;
            espadaX = Math.cos(angGiro) * raioRed;
            espadaY = Math.sin(angGiro) * (raioRed * 0.55);
            espadaAngulo = angGiro + Math.PI * 0.5;
        } else if (estadoAnim === 'impacto') {
            // Salto e enterro violento no solo
            if (progAnim < 0.4) {
                let p = progAnim / 0.4;
                espadaX = 0;
                espadaY = -34 * (1 - p * 0.2);
                espadaAngulo = Math.PI * 0.5;
            } else {
                let p = (progAnim - 0.4) / 0.6;
                espadaX = 0;
                espadaY = 4 + p * 6;
                espadaAngulo = Math.PI * 0.5;
            }
        } else if (estadoAnim === 'brado') {
            // Ergue ao alto com manoplas
            espadaX = facingRight ? 20 : -20;
            espadaY = -28;
            espadaAngulo = facingRight ? -0.1 : 0.1;
        } else if (isMoving) {
            // Arrasto inercial do montante na marcha
            espadaX = swordRestX - (facingRight ? 7 : -7);
            espadaY = swordRestY + 2;
            espadaAngulo = facingRight ? 0.42 : -0.42;
        }

        // Desenha a sombra da espada no chão
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        let alturaEspadaSolo = 14 - espadaY;
        escalaEspadaSombra = Math.max(0.45, Math.min(1.3, 1.0 - (alturaEspadaSolo - 26) * 0.015));
        ctx.beginPath();
        ctx.ellipse(espadaX, 15, 14 * escalaEspadaSombra, 5 * escalaEspadaSombra, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* =====================================================================
           [CAMADA 3] INCLINAÇÃO DO CORPO COM INÉRCIA (5 graus na marcha)
           (GDD 3.2: facingRight ? +0.08 rad : -0.08 rad)
           ===================================================================== */
        ctx.save();
        let bodyTilt = isMoving ? (facingRight ? 0.08 : -0.08) : 0;
        ctx.rotate(bodyTilt);

        // Deslocamento vertical de respiração e passada
        let legBaseY = -6;
        let torsoY = legBaseY + breathBob;
        let legSwing = isMoving ? Math.sin(dadosPart.walkCycle) * 6.0 : 0;

        /* =====================================================================
           [CAMADA 4] PERNAS E GREVAS DE AÇO NEGRO
           (GDD 2.2: colunas reforçadas com placas dobráveis nos joelhos)
           ===================================================================== */
        ctx.save();
        let corAco1 = '#1a1a24';
        let corAco2 = '#2d3436';
        let bordaAco = '#636e72';

        // Perna Traseira
        let pTrasX = facingRight ? -7 - legSwing * 0.8 : 7 - legSwing * 0.8;
        ctx.fillStyle = corAco1;
        ctx.strokeStyle = bordaAco;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(pTrasX - 4, legBaseY + 12, 7, 13, 2);
        ctx.fill();
        ctx.stroke();

        // Joelheira traseira
        ctx.fillStyle = corAco2;
        ctx.beginPath();
        ctx.roundRect(pTrasX - 5, legBaseY + 15, 9, 5, 2);
        ctx.fill();
        ctx.stroke();

        // Perna Dianteira
        let pDiantX = facingRight ? 5 + legSwing * 0.8 : -5 + legSwing * 0.8;
        ctx.fillStyle = corAco2;
        ctx.beginPath();
        ctx.roundRect(pDiantX - 4, legBaseY + 12, 8, 14, 2);
        ctx.fill();
        ctx.stroke();

        // Joelheira dianteira angular
        ctx.fillStyle = '#3d444b';
        ctx.beginPath();
        ctx.moveTo(pDiantX - 5, legBaseY + 15);
        ctx.lineTo(pDiantX + 5, legBaseY + 15);
        ctx.lineTo(pDiantX + 6, legBaseY + 18);
        ctx.lineTo(pDiantX, legBaseY + 21);
        ctx.lineTo(pDiantX - 6, legBaseY + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Botas de ferro chanfradas fixadas no chão
        ctx.fillStyle = corAco1;
        ctx.beginPath();
        ctx.roundRect(pDiantX - 5, legBaseY + 23, 10, 4, 1.5);
        ctx.fill();
        ctx.restore();

        /* =====================================================================
           [CAMADA 5] TORSO: PEITORAL SEGMENTADO COM FENDA EM "V" DE MAGMA
           (GDD 2.2: Aço negro com fenda em V por onde brilha núcleo vulcânico)
           ===================================================================== */
        ctx.save();
        ctx.translate(0, torsoY);

        // Base do peitoral em placas chanfradas
        let gradTorso = _grad(ctx, -12, -10, 12, 14, [0, '#1a1a24', 0.5, '#2d3436', 1, '#111118']);
        ctx.fillStyle = gradTorso;
        ctx.strokeStyle = bordaAco;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-11, -8);
        ctx.lineTo(11, -8);
        ctx.lineTo(13, 3);
        ctx.lineTo(8, 13);
        ctx.lineTo(-8, 13);
        ctx.lineTo(-13, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fenda no peito em forma de "V" incandescente de magma
        let magmaPulso = Math.sin(agora * 0.005) * 0.25 + 0.75;
        let gradMagmaV = _grad(ctx, 0, -4, 0, 10, [0, '#ffd166', 0.4, '#ff5722', 1, '#d63031']);
        ctx.fillStyle = gradMagmaV;
        ctx.shadowColor = '#ff5722';
        ctx.shadowBlur = 12 * magmaPulso;
        ctx.beginPath();
        ctx.moveTo(-5, -3);
        ctx.lineTo(5, -3);
        ctx.lineTo(3, 3);
        ctx.lineTo(0, 9);
        ctx.lineTo(-3, 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; // Reseta shadowBlur

        // Linha central incandescente do núcleo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 7);
        ctx.stroke();

        // Placas segmentadas do abdômen
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-7, 6);
        ctx.lineTo(7, 6);
        ctx.moveTo(-6, 9);
        ctx.lineTo(6, 9);
        ctx.stroke();
        ctx.restore();

        /* =====================================================================
           [CAMADA 6] OMBREIRAS MASSIVAS & MANOPLAS DE ROCHA VULCÂNICA
           (GDD 2.2: duas placas angulares espessas 14x18 com pontas e manoplas livres com fumaça)
           ===================================================================== */
        ctx.save();
        ctx.translate(0, torsoY + pauldronBob * 0.4);

        // Ombreira Esquerda (Traseira ou Frontal conforme facing)
        ctx.fillStyle = corAco2;
        ctx.strokeStyle = bordaAco;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-12, -10);
        ctx.lineTo(-19, -15);
        ctx.lineTo(-17, -2);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ombreira Direita (Massiva, saliente)
        ctx.fillStyle = '#3a444d';
        ctx.beginPath();
        ctx.moveTo(12, -10);
        ctx.lineTo(19, -15);
        ctx.lineTo(17, -2);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Brilho de magma na junção da ombreira
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(14, -6, 2, 0, Math.PI * 2);
        ctx.arc(-14, -6, 2, 0, Math.PI * 2);
        ctx.fill();

        // Manoplas de pura rocha vulcânica incandescente (mãos livres!)
        let maoEsqX = -13, maoEsqY = 5;
        let maoDirX = 13, maoDirY = 5;

        if (estadoAnim === 'brado') {
            // No Brado de Guerra, Kaledron ergue as duas manoplas aos céus
            maoEsqY = -18;
            maoDirY = -18;
        }

        // Manopla Esquerda
        let gradManopla = _grad(ctx, maoEsqX - 4, maoEsqY - 4, maoEsqX + 4, maoEsqY + 4, [0, '#2d3436', 0.6, '#e17055', 1, '#ff7675']);
        ctx.fillStyle = gradManopla;
        ctx.beginPath();
        ctx.roundRect(maoEsqX - 4, maoEsqY - 4, 8, 9, 2);
        ctx.fill();

        // Manopla Direita
        ctx.fillStyle = gradManopla;
        ctx.beginPath();
        ctx.roundRect(maoDirX - 4, maoDirY - 4, 8, 9, 2);
        ctx.fill();

        // Fumaça saindo das manoplas
        if (agora - dadosPart.lastSmoke > 110) {
            dadosPart.lastSmoke = agora;
            if (dadosPart.smoke.length < 12) {
                dadosPart.smoke.push({
                    x: maoDirX + (Math.random() - 0.5) * 4,
                    y: maoDirY - 2,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.5 - Math.random() * 0.7,
                    tam: 2.0 + Math.random() * 2.5,
                    vida: 1.0,
                    dec: 0.03
                });
            }
        }
        for (let i = dadosPart.smoke.length - 1; i >= 0; i--) {
            let smk = dadosPart.smoke[i];
            smk.x += smk.vx;
            smk.y += smk.vy;
            smk.tam += 0.08;
            smk.vida -= smk.dec;
            if (smk.vida <= 0) {
                dadosPart.smoke.splice(i, 1);
                continue;
            }
            ctx.fillStyle = 'rgba(90, 90, 95, ' + (smk.vida * 0.38) + ')';
            ctx.beginPath();
            ctx.arc(smk.x, smk.y, smk.tam, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        /* =====================================================================
           [CAMADA 7] CABEÇA & ELMO FECHADO COM VISOR RUBRO INCANDESCENTE
           (GDD 2.2: Elmo de cavaleiro fechado com visor estreito #ff4757 e fumaça no topo)
           ===================================================================== */
        ctx.save();
        ctx.translate(0, torsoY - 14);

        // Elmo fechado em aço escuro
        ctx.fillStyle = '#22252a';
        ctx.strokeStyle = bordaAco;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-7, 6);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-4, -9);
        ctx.lineTo(4, -9);
        ctx.lineTo(8, -4);
        ctx.lineTo(7, 6);
        ctx.lineTo(0, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crista superior do elmo
        ctx.fillStyle = '#404952';
        ctx.beginPath();
        ctx.moveTo(-2, -9);
        ctx.lineTo(2, -9);
        ctx.lineTo(3, -14);
        ctx.lineTo(-3, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Visor horizontal estreito com brilho rubro (#ff4757)
        let visorX = facingRight ? -2 : -5;
        ctx.fillStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(visorX, -1, 8, 2.4, 1);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Fumaça escapando do topo do elmo (GDD 2.2)
        ctx.fillStyle = 'rgba(80, 80, 80, 0.32)';
        let smokeBob = Math.sin(agora * 0.003) * 1.5;
        ctx.beginPath();
        ctx.arc(smokeBob, -16, 2.5, 0, Math.PI * 2);
        ctx.arc(smokeBob * 1.4, -20, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore(); // Fecha o ctx.rotate(bodyTilt)

        /* =====================================================================
           [CAMADA 8] O GRANDE MONTANTE COLOSSAL FLUTUANTE (Floating Greatsword)
           (GDD 2.3: Lâmina 48px, largura 10px, ponta diamante, canaleta de magma)
           ===================================================================== */
        ctx.save();
        ctx.translate(espadaX, espadaY);
        ctx.rotate(espadaAngulo);

        // Brilho na espada durante ataque ou redemoinho
        if (estadoAnim === 'ataque' && progAnim < 0.3) {
            ctx.shadowColor = '#ff5722';
            ctx.shadowBlur = 20;
        } else if (estadoAnim === 'redemoinho') {
            ctx.shadowColor = '#ff9800';
            ctx.shadowBlur = 16;
        }

        // 1. Guarda cruzada em ferro batido
        ctx.fillStyle = '#2d3436';
        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-10, 6, 20, 5, 1.5);
        ctx.fill();
        ctx.stroke();

        // Gemas rúnicas nas extremidades da guarda
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(-8, 8.5, 1.8, 0, Math.PI * 2);
        ctx.arc(8, 8.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 2. Empunhadura e Pomo
        ctx.fillStyle = '#111118';
        ctx.beginPath();
        ctx.roundRect(-2.2, 11, 4.4, 9, 1);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d63031';
        ctx.beginPath();
        ctx.arc(0, 22, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Lâmina Colossal (comprimento 48px, largura 10px, ponta diamante)
        let gradLamina = _grad(ctx, -5, -42, 5, 6, [0, '#2d3436', 0.5, '#636e72', 1, '#1a1a24']);
        ctx.fillStyle = gradLamina;
        ctx.strokeStyle = '#b2bec3';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-5, 6);
        ctx.lineTo(-5, -34);
        ctx.lineTo(0, -42); // Ponta chanfrada em diamante
        ctx.lineTo(5, -34);
        ctx.lineTo(5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Canaleta esculpida (fuller) preenchida com gradiente de magma incandescente
        let gradMagmaLamina = _grad(ctx, 0, -32, 0, 4, [0, '#ffffff', 0.25, '#fdcb6e', 0.7, '#e67e22', 1, '#d63031']);
        ctx.fillStyle = gradMagmaLamina;
        ctx.beginPath();
        ctx.moveTo(-1.6, 5);
        ctx.lineTo(-1.6, -30);
        ctx.lineTo(0, -33);
        ctx.lineTo(1.6, -30);
        ctx.lineTo(1.6, 5);
        ctx.closePath();
        ctx.fill();

        // Runas de fogo pulsando ao longo da lâmina
        let runaAlpha = Math.sin(agora * 0.007) * 0.3 + 0.7;
        ctx.strokeStyle = 'rgba(255, 235, 150, ' + runaAlpha + ')';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-2, -6); ctx.lineTo(2, -6);
        ctx.moveTo(0, -12); ctx.lineTo(0, -18);
        ctx.moveTo(-2, -22); ctx.lineTo(2, -22);
        ctx.stroke();

        // Brasas desprendendo da lâmina
        if (Math.random() > 0.75) {
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc((Math.random() - 0.5) * 8, -10 - Math.random() * 24, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        /* =====================================================================
           [CAMADA 9] VFX DE ARCO DE CORTE (Fase 2 do Ataque Básico: 30% a 60%)
           (GDD 3.3: rastro em arco de 180° com gradiente crescente de fogo)
           ===================================================================== */
        if (estadoAnim === 'ataque' && progAnim >= 0.25 && progAnim <= 0.65) {
            ctx.save();
            let pCorte = (progAnim - 0.25) / 0.40;
            let raioArco = 42;
            ctx.rotate(anguloAtaque);

            ctx.lineWidth = 16 * (1 - pCorte * 0.6);
            let gradArco = ctx.createLinearGradient(0, -20, 40, 20);
            gradArco.addColorStop(0, 'rgba(255, 240, 160, 0.9)');
            gradArco.addColorStop(0.5, 'rgba(255, 87, 34, 0.75)');
            gradArco.addColorStop(1, 'rgba(214, 48, 49, 0)');
            ctx.strokeStyle = gradArco;
            ctx.beginPath();
            ctx.arc(0, 0, raioArco, -0.9, 0.9);
            ctx.stroke();

            // Faíscas pontuais voando do corte
            for (let f = 0; f < 4; f++) {
                let angF = -0.9 + 1.8 * Math.random();
                let fx = Math.cos(angF) * (raioArco + (Math.random() - 0.5) * 12);
                let fy = Math.sin(angF) * (raioArco + (Math.random() - 0.5) * 12);
                ctx.fillStyle = '#ffeaa7';
                ctx.beginPath();
                ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /* =====================================================================
           [CAMADA 10] AURA SUPREMA DO BRADO DE GUERRA (se ativo)
           ===================================================================== */
        if (window.kaledronEstadoLocal && window.kaledronEstadoLocal.bradoAtivo && agora < window.kaledronEstadoLocal.bradoExpira) {
            ctx.save();
            let pulsoBrado = Math.sin(agora * 0.008) * 3;
            ctx.strokeStyle = 'rgba(230, 126, 34, 0.65)';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, 14, 28 + pulsoBrado, 12 + pulsoBrado * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 87, 34, 0.12)';
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        let jogadorBuff = window.todosJogadores && window.todosJogadores[id];
        let bradoAte = Number(jogadorBuff && jogadorBuff.kaledronBradoAte) || 0;
        let bradoAtivo = bradoAte > Date.now() || (id === window.meuId && window.kaledronEstadoLocal && window.kaledronEstadoLocal.bradoAtivo && window.kaledronEstadoLocal.bradoExpira > agora);
        if (!Array.isArray(dadosPart.lavaShards)) dadosPart.lavaShards = [];
        if (bradoAtivo && agora - dadosPart.lastLavaShard > 75) {
            dadosPart.lastLavaShard = agora;
            for (let i = 0; i < 2 && dadosPart.lavaShards.length < 24; i++) {
                dadosPart.lavaShards.push({
                    x: (Math.random() - 0.5) * 20,
                    y: 8 + Math.random() * 18,
                    vx: (Math.random() - 0.5) * 3.2,
                    vy: -1.2 - Math.random() * 3.2,
                    size: 2 + Math.random() * 2.5,
                    angle: Math.random() * Math.PI,
                    spin: (Math.random() - 0.5) * 0.24,
                    life: 0.55 + Math.random() * 0.4,
                    color: Math.random() > 0.5 ? '#ffb12e' : '#f04416'
                });
            }
        }
        if (dadosPart.lavaShards.length) {
            ctx.save();
            for (let i = dadosPart.lavaShards.length - 1; i >= 0; i--) {
                let shard = dadosPart.lavaShards[i];
                shard.x += shard.vx;
                shard.y += shard.vy;
                shard.vy += 0.11;
                shard.angle += shard.spin;
                shard.life -= 0.025;
                if (shard.life <= 0) {
                    dadosPart.lavaShards.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.translate(x + shard.x, y + shard.y);
                ctx.rotate(shard.angle);
                ctx.globalAlpha = Math.min(1, shard.life * 1.8);
                ctx.shadowColor = shard.color;
                ctx.shadowBlur = 8;
                ctx.fillStyle = shard.color;
                ctx.beginPath();
                ctx.moveTo(0, -shard.size * 1.6);
                ctx.lineTo(shard.size, -shard.size * 0.2);
                ctx.lineTo(shard.size * 0.35, shard.size * 1.3);
                ctx.lineTo(-shard.size * 0.8, shard.size * 0.45);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
    };

    /* =========================================================================
       DISPARADOR DE AUTO-ATAQUE / ATAQUE BÁSICO DO KALEDRON
       ========================================================================= */
    window.enviarAtaqueKaledron = function (ang, alvoTipo, alvoId) {
        if (window.estaMorto) return;
        if (window.kaledronEmAnimacaoSkill && window.kaledronEmAnimacaoSkill(window.meuId)) return;

        // Registra animação local de 420ms
        window.registrarKaledronAnim(window.meuId, 'ataque', 650, { angulo: Number.isFinite(Number(ang)) ? Number(ang) : (window.meuAngulo || 0) });

        // Áudio
        if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('kaledron_espada');
        } else if (typeof window.tocarSomEspada === 'function') {
            window.tocarSomEspada();
        }

        // Envia mensagem ao servidor
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            let msg = { action: 'ataque_kaledron', angulo: Number.isFinite(Number(ang)) ? Number(ang) : (window.meuAngulo || 0) };
            if (alvoTipo && alvoId) {
                msg.alvoTipo = alvoTipo;
                msg.alvoId = alvoId;
            }
            window.ws.send(JSON.stringify(msg));
        }
    };

})();
