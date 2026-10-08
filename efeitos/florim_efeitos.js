// ============================================================================
// efeitos/florim_efeitos.js — VFX Florin v3.0: "Classe das Rosas"
// Efeitos visuais mágicos e botânicos de alta fidelidade:
// - Ataque Básico: Rosa giratória incandescente com dardo de espinho dourado e rastro de pétalas
// - Skill 1: Roseira Ancestral Curativa com tronco entrelaçado, rosas gigantes e anéis de cura sagrada
// - Skill 2: Semente Dourada, Flor Carnívora Predadora de Espinhos Dourados e Rosa Arcana de Mana
// - Skill 3: Tapete Místico de Raízes com Estalagmites de Espinhos Dourados, Rosas e Névoa Debuff
// - Skill 4: Muralha Circular de Espinheiros Gigantes e Rosas Carmesim Bloqueadoras
// - Passiva: Pétalas de rosa e sangue carmesim com aura esmeralda
// ============================================================================
(function(){
'use strict';

window.florimArvoresVfx = window.florimArvoresVfx || [];
window.florimSementesVfx = window.florimSementesVfx || [];
window.florimEspinhosVfx = window.florimEspinhosVfx || [];
window.florimParedesVfx = window.florimParedesVfx || [];
window.florimBasicVfx = window.florimBasicVfx || [];
window.florimSangramentoVfx = window.florimSangramentoVfx || [];

let ultimoTempo = performance.now();

// =============================================================
// HELPER: Desenha Rosa Carmesim Detalhada para Efeitos
// =============================================================
function desenharRosaVfx(ctx, rx, ry, escala, ang, corCentro) {
    ctx.save();
    ctx.translate(rx, ry);
    if (ang) ctx.rotate(ang);
    ctx.scale(escala, escala);
    
    // Sépalas verdes na base
    ctx.fillStyle = '#133924';
    for (let s = 0; s < 4; s++) {
        const angS = s * (Math.PI / 2) + 0.35;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angS) * 4.2, Math.sin(angS) * 4.2);
        ctx.lineTo(Math.cos(angS + 0.32) * 2.8, Math.sin(angS + 0.32) * 2.8);
        ctx.closePath();
        ctx.fill();
    }

    // Pétalas externas escuras
    ctx.fillStyle = '#6b0615';
    for (let i = 0; i < 5; i++) {
        const angP = i * 1.256;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angP) * 3.4, Math.sin(angP) * 3.4, 3.6, 2.4, angP, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pétalas médias vivas
    ctx.fillStyle = '#b81228';
    for (let i = 0; i < 5; i++) {
        const angP = i * 1.256 + 0.62;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angP) * 2.2, Math.sin(angP) * 2.2, 2.7, 1.9, angP, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pétalas internas com realce luminoso
    ctx.fillStyle = '#e6223d';
    for (let i = 0; i < 4; i++) {
        const angP = i * 1.57 + 0.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angP) * 1.3, Math.sin(angP) * 1.3, 1.9, 1.4, angP, 0, Math.PI * 2);
        ctx.fill();
    }

    // Miolo iluminado
    ctx.fillStyle = corCentro || '#ffe072';
    ctx.beginPath();
    ctx.arc(0.2, -0.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// =============================================================
// GERADORES DE ANIMAÇÃO EXPOSTOS EM WINDOW
// =============================================================

window.criarAnimacaoAtaqueBasicoFlorim = function(x, y, ang) {
    window.florimBasicVfx.push({
        startX: x, startY: y,
        ang: ang || 0,
        vidaMax: 360,
        vida: 360,
        rastro: []
    });
};

window.criarAnimacaoArvoreFlorim = function(id, x, y, raio) {
    let folhas = [];
    const r = raio || 100;
    for (let i = 0; i < 32; i++) {
        folhas.push({
            ox: (Math.random() - 0.5) * r * 1.6,
            oy: -75 - Math.random() * 45,
            velY: Math.random() * 0.9 + 0.7,
            ang: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.09,
            escala: Math.random() * 0.5 + 0.75,
            vidaMax: 2400 + Math.random() * 1200,
            vida: 2400 + Math.random() * 1200,
            tipoPetala: Math.random() < 0.45 // 45% pétala de rosa, 55% folha esmeralda
        });
    }

    window.florimArvoresVfx.push({
        id: id,
        x: x, y: y,
        raio: r,
        vidaMax: 8000,
        vida: 8000,
        folhasCaindo: folhas,
        pulsos: [{ max: 1200, atual: 1200 }]
    });
};

window.criarAnimacaoArvoreCuraFlorim = function(id, x, y, raio) {
    let arv = window.florimArvoresVfx.find(a => a.id === id);
    if (!arv) {
        window.criarAnimacaoArvoreFlorim(id, x, y, raio);
        arv = window.florimArvoresVfx.find(a => a.id === id);
    }
    if (arv) {
        arv.pulsos.push({ max: 950, atual: 950 });
        const r = arv.raio || 100;
        for (let i = 0; i < 20; i++) {
            arv.folhasCaindo.push({
                ox: (Math.random() - 0.5) * r * 1.7,
                oy: -75 - Math.random() * 30,
                velY: Math.random() * 1.3 + 0.8,
                ang: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.1,
                escala: Math.random() * 0.6 + 0.8,
                vidaMax: 1800 + Math.random() * 1000,
                vida: 1800 + Math.random() * 1000,
                tipoPetala: Math.random() < 0.6
            });
        }
    }
};

window.criarAnimacaoSementeFlorim = function(id, x, y) {
    window.florimSementesVfx.push({
        id: id, x: x, y: y,
        vidaMax: 20000, vida: 20000,
        fase: 'plantada'
    });
};

window.criarAnimacaoSementeAtivadaFlorim = function(x, y, tipo) {
    window.florimSementesVfx = window.florimSementesVfx.filter(s => {
        if (s.fase === 'plantada' && Math.hypot(s.x - x, s.y - y) < 45) return false;
        return true;
    });

    const isCarnivora = tipo === 'carnivora';
    const duracao = isCarnivora ? 5000 : 4000;

    let detritos = [];
    for (let k = 0; k < 18; k++) {
        let angK = Math.random() * Math.PI * 2;
        let spd = Math.random() * 3.8 + 1.8;
        detritos.push({
            x: 0, y: 0,
            vx: Math.cos(angK) * spd,
            vy: Math.sin(angK) * spd * 0.6 - 2.8,
            size: Math.random() * 4 + 2,
            cor: k % 3 === 0 ? '#b81228' : (k % 3 === 1 ? '#cfa448' : '#1e5436')
        });
    }

    window.florimSementesVfx.push({
        x: x, y: y,
        tipo: tipo || 'carnivora',
        vidaMax: duracao,
        vida: duracao,
        fase: 'ativada',
        mordidaTimer: 0,
        detritos: detritos
    });
};

window.criarAnimacaoEspinhosFlorim = function(id, x, y, raio) {
    const r = raio || 120;
    const estalagmites = [];
    for (let i = 0; i < 24; i++) {
        let angP = Math.random() * Math.PI * 2;
        let distP = Math.sqrt(Math.random()) * (r * 0.92);
        estalagmites.push({
            ox: Math.cos(angP) * distP,
            oy: Math.sin(angP) * distP * 0.6,
            alturaMax: Math.random() * 24 + 18,
            largura: Math.random() * 7 + 6,
            delay: Math.random() * 240,
            inclinacao: (Math.random() - 0.5) * 0.35,
            temRosa: Math.random() < 0.75
        });
    }

    window.florimEspinhosVfx.push({
        id: id, x: x, y: y, raio: r,
        vidaMax: 5000, vida: 5000,
        estalagmites: estalagmites,
        pulsosDebuff: [{ max: 1000, atual: 1000 }]
    });
};

window.criarAnimacaoParedeFlorim = function(id, x, y, raio) {
    const r = raio || 80;
    const estacas = [];
    const totalEstacas = 20;
    for (let i = 0; i < totalEstacas; i++) {
        let angE = (i / totalEstacas) * Math.PI * 2;
        estacas.push({
            ang: angE,
            ox: Math.cos(angE) * r,
            oy: Math.sin(angE) * r * 0.65,
            alturaMax: Math.random() * 22 + 28,
            largura: Math.random() * 6 + 7.5,
            delay: (i % 4) * 75
        });
    }

    window.florimParedesVfx.push({
        id: id, x: x, y: y, raio: r,
        vidaMax: 4000, vida: 4000,
        estacas: estacas
    });
};

window.criarAnimacaoAuraSangramentoFlorim = function(x, y) {
    let gotas = [];
    for (let i = 0; i < 8; i++) {
        gotas.push({
            x: (Math.random() - 0.5) * 18,
            y: (Math.random() - 0.5) * 14 - 10,
            vx: (Math.random() - 0.5) * 2.2,
            vy: Math.random() * 2.5 + 1.2,
            tamanho: Math.random() * 2.5 + 1.2,
            ehPetala: i % 2 === 0
        });
    }
    window.florimSangramentoVfx.push({
        x: x, y: y,
        vidaMax: 700, vida: 700,
        gotas: gotas
    });
};

// =============================================================
// RENDERIZADOR PRINCIPAL DE EFEITOS FLORIN
// =============================================================
window.desenharEfeitosFlorim = function() {
    const ctx = window.ctx || (document.getElementById('gameCanvas') ? document.getElementById('gameCanvas').getContext('2d') : null);
    if (!ctx) return;

    const agora = performance.now();
    const dt = Math.min(50, Math.max(1, agora - ultimoTempo));
    ultimoTempo = agora;
    const tSeg = agora / 1000;

    // ---------------------------------------------------------
    // 1. ATAQUE BÁSICO: ROSA MÁGICA INCANDESCENTE COM DARDO DOURADO
    // ---------------------------------------------------------
    for (let i = window.florimBasicVfx.length - 1; i >= 0; i--) {
        const b = window.florimBasicVfx[i];
        b.vida -= dt;
        if (b.vida <= 0) {
            window.florimBasicVfx.splice(i, 1);
            continue;
        }

        const prog = 1 - (b.vida / b.vidaMax);
        const dist = prog * 320;
        const cx = b.startX + Math.cos(b.ang) * dist;
        const cy = b.startY + Math.sin(b.ang) * dist;

        b.rastro.push({ x: cx, y: cy, vida: 240, angR: Math.random() * Math.PI * 2 });

        // Rastro de pétalas de rosa carmesim e pólen dourado
        for (let j = b.rastro.length - 1; j >= 0; j--) {
            const r = b.rastro[j];
            r.vida -= dt;
            if (r.vida <= 0) {
                b.rastro.splice(j, 1);
                continue;
            }
            const alphaR = r.vida / 240;
            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.rotate(r.angR);

            if (j % 2 === 0) {
                // Pétala carmesim
                ctx.fillStyle = `rgba(230, 34, 61, ${alphaR * 0.85})`;
                ctx.beginPath();
                ctx.ellipse(0, 0, 3.2 * alphaR, 1.8 * alphaR, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Faísca dourada
                ctx.fillStyle = `rgba(247, 224, 130, ${alphaR * 0.95})`;
                ctx.beginPath();
                ctx.arc(0, 0, 2.0 * alphaR, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Projétil: Grande Rosa Mágica com Espinho Dourado Central
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(b.ang);

        // Halo de energia esmeralda e carmesim
        ctx.shadowColor = '#e6223d';
        ctx.shadowBlur = 12;

        // Espinho pontiagudo dourado na ponta da flecha
        ctx.fillStyle = '#f7e082';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();

        // Rosa giratória no centro do projétil
        desenharRosaVfx(ctx, -2, 0, 1.15, tSeg * 12, '#ffe072');
        ctx.restore();
    }

    // ---------------------------------------------------------
    // 2. SKILL 1: ÁRVORE CURATIVA (ROSEIRA ANCESTRAL SAGRADA)
    // ---------------------------------------------------------
    for (let i = window.florimArvoresVfx.length - 1; i >= 0; i--) {
        const arv = window.florimArvoresVfx[i];
        arv.vida -= dt;
        if (arv.vida <= 0) {
            window.florimArvoresVfx.splice(i, 1);
            continue;
        }

        const fadeAlpha = Math.min(1.0, arv.vida / 600, (arv.vidaMax - arv.vida) / 400);

        ctx.save();
        ctx.translate(arv.x, arv.y);
        ctx.globalAlpha = fadeAlpha;

        // (a) Anel de Solo Sagrado das Rosas
        const rArea = arv.raio || 100;
        const pulsoSolo = Math.sin(tSeg * 3) * 0.05 + 0.95;

        ctx.save();
        const gradSolo = ctx.createRadialGradient(0, 5, 10, 0, 5, rArea * pulsoSolo);
        gradSolo.addColorStop(0, 'rgba(85, 170, 117, 0.22)');
        gradSolo.addColorStop(0.7, 'rgba(230, 34, 61, 0.08)');
        gradSolo.addColorStop(1, 'rgba(30, 84, 54, 0)');
        ctx.fillStyle = gradSolo;
        ctx.beginPath();
        ctx.ellipse(0, 5, rArea * pulsoSolo, rArea * 0.55 * pulsoSolo, 0, 0, Math.PI * 2);
        ctx.fill();

        // Borda dourada pontilhada com runas florais
        ctx.strokeStyle = 'rgba(247, 224, 130, 0.65)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 5, rArea, rArea * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // (b) Ondas concêntricas de cura expandindo
        for (let pIdx = arv.pulsos.length - 1; pIdx >= 0; pIdx--) {
            const pulso = arv.pulsos[pIdx];
            pulso.atual -= dt;
            if (pulso.atual <= 0) {
                arv.pulsos.splice(pIdx, 1);
                continue;
            }
            const pProg = 1 - (pulso.atual / pulso.max);
            const pAlpha = (1 - pProg) * 0.85;

            ctx.save();
            ctx.strokeStyle = `rgba(85, 220, 130, ${pAlpha})`;
            ctx.lineWidth = 3.6 * (1 - pProg);
            ctx.beginPath();
            ctx.ellipse(0, 5, rArea * pProg, rArea * 0.55 * pProg, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Runas de pétalas douradas orbitando
            ctx.fillStyle = `rgba(247, 224, 130, ${pAlpha})`;
            for (let k = 0; k < 8; k++) {
                const angK = k * (Math.PI * 2 / 8) + pProg * 0.8;
                const kx = Math.cos(angK) * (rArea * pProg);
                const ky = 5 + Math.sin(angK) * (rArea * 0.55 * pProg);
                ctx.beginPath();
                ctx.arc(kx, ky, 2.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // (c) Crescimento e Escala da Roseira
        const crescimentoArvore = Math.min(1, Math.max(0, (arv.vidaMax - arv.vida) / 500));
        ctx.save();
        ctx.translate(0, 5);
        ctx.scale(0.6 + crescimentoArvore * 0.4, 0.6 + crescimentoArvore * 0.4);
        ctx.translate(0, -5);

        // Sombra das raízes
        ctx.fillStyle = 'rgba(12, 22, 14, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 7, 36, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Raízes grossas entrelaçadas com espinhos dourados
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#25170f';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.bezierCurveTo(-12, 5, -20, 13, -37, 13);
        ctx.moveTo(0, 0); ctx.bezierCurveTo(9, 6, 23, 14, 39, 10);
        ctx.moveTo(-2, 1); ctx.quadraticCurveTo(-4, 12, -14, 19);
        ctx.moveTo(3, 1); ctx.quadraticCurveTo(5, 12, 16, 18);
        ctx.stroke();

        ctx.strokeStyle = '#cfa448';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-2, 1); ctx.quadraticCurveTo(-17, 10, -34, 12);
        ctx.moveTo(2, 2); ctx.quadraticCurveTo(18, 10, 35, 9);
        ctx.stroke();

        // Tronco bifurcado robusto
        ctx.save();
        const gradTronco = ctx.createLinearGradient(-16, -4, 15, -72);
        gradTronco.addColorStop(0, '#25170f');
        gradTronco.addColorStop(0.5, '#573722');
        gradTronco.addColorStop(1, '#8a6840');
        ctx.fillStyle = gradTronco;
        ctx.beginPath();
        ctx.moveTo(-13, 4);
        ctx.bezierCurveTo(-9, -13, -17, -31, -8, -47);
        ctx.bezierCurveTo(-4, -56, -12, -65, -17, -75);
        ctx.lineTo(-11, -72);
        ctx.quadraticCurveTo(-2, -59, -3, -50);
        ctx.bezierCurveTo(2, -62, 12, -69, 21, -76);
        ctx.lineTo(23, -71);
        ctx.quadraticCurveTo(9, -61, 4, -49);
        ctx.bezierCurveTo(15, -43, 19, -32, 13, -20);
        ctx.quadraticCurveTo(9, -7, 15, 4);
        ctx.quadraticCurveTo(1, 8, -13, 4);
        ctx.closePath();
        ctx.fill();

        // Vinhas com espinhos dourados subindo pelo tronco
        ctx.strokeStyle = '#327c52';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-12, 1); ctx.bezierCurveTo(2, -12, -11, -26, 3, -38);
        ctx.bezierCurveTo(16, -49, 2, -58, 18, -73);
        ctx.stroke();

        ctx.strokeStyle = '#f7e082';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.bezierCurveTo(0, -12, -8, -26, 4, -38);
        ctx.stroke();
        ctx.restore();

        // Ramos floridos com folhas esmeralda e grandes rosas carmesim
        const desenharRamoRoseira = (rx, ry, escala, fase) => {
            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(Math.sin(tSeg * 1.4 + fase) * 0.04);

            // Folhagens do ramo
            for (let leaf = 0; leaf < 5; leaf++) {
                const side = leaf % 2 ? 1 : -1;
                const ly = -leaf * 6 * escala;
                const lx = side * 10 * escala;
                ctx.fillStyle = leaf % 2 === 0 ? '#1e5436' : '#327c52';
                ctx.beginPath();
                ctx.ellipse(lx, ly, 7 * escala, 3.5 * escala, side * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Rosa majestosa no ápice do ramo
            desenharRosaVfx(ctx, 0, -28 * escala, 1.25 * escala, Math.sin(tSeg + fase) * 0.1);
            ctx.restore();
        };

        desenharRamoRoseira(-20, -68, 1.0, 1);
        desenharRamoRoseira(18, -70, 1.05, 2);
        desenharRamoRoseira(-2, -88, 1.2, 3);
        desenharRamoRoseira(-28, -50, 0.85, 4);
        desenharRamoRoseira(28, -52, 0.88, 5);

        ctx.restore(); // Fim escala árvore

        // (d) Chuva Celestial de Pétalas e Folhas Curativas Caindo
        for (let fIdx = arv.folhasCaindo.length - 1; fIdx >= 0; fIdx--) {
            const folha = arv.folhasCaindo[fIdx];
            folha.vida -= dt;
            if (folha.vida <= 0) {
                arv.folhasCaindo.splice(fIdx, 1);
                continue;
            }
            folha.oy += folha.velY * (dt / 16.6);
            folha.ang += folha.rotSpeed;
            const fAlpha = Math.min(1.0, folha.vida / 400);

            const posX = folha.ox + Math.sin(tSeg * 2.8 + fIdx) * 15;
            const posY = folha.oy;

            if (posY >= 5) {
                folha.oy = -75 - Math.random() * 30;
                folha.ox = (Math.random() - 0.5) * rArea * 1.5;
            }

            ctx.save();
            ctx.translate(posX, posY);
            ctx.rotate(folha.ang);
            ctx.scale(folha.escala, folha.escala);
            ctx.globalAlpha = fAlpha * fadeAlpha;

            if (folha.tipoPetala) {
                // Pétala de Rosa Carmesim brilhante
                ctx.fillStyle = fIdx % 2 === 0 ? '#e6223d' : '#b81228';
                ctx.beginPath();
                ctx.ellipse(0, 0, 4.2, 2.4, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Folha Esmeralda com nervura
                ctx.fillStyle = '#55aa75';
                ctx.beginPath();
                ctx.ellipse(0, 0, 3.2, 6.8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#f7e082';
                ctx.lineWidth = 0.7;
                ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 3. SKILL 2: SEMENTE DUAL (BOTÃO DOURADO / FLOR CARNÍVORA / ROSA MANA)
    // ---------------------------------------------------------
    for (let i = window.florimSementesVfx.length - 1; i >= 0; i--) {
        const sem = window.florimSementesVfx[i];
        sem.vida -= dt;
        if (sem.vida <= 0) {
            window.florimSementesVfx.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.translate(sem.x, sem.y);

        // FASE 1: SEMENTE PLANTADA (Botão de Rosa Dourada Mística)
        if (sem.fase === 'plantada') {
            const pulsoSem = Math.sin(tSeg * 4.5) * 0.15 + 0.85;

            // Sombra
            ctx.fillStyle = 'rgba(12, 22, 14, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 3, 11 * pulsoSem, 5.5 * pulsoSem, 0, 0, Math.PI * 2);
            ctx.fill();

            // Arabescos dourados no chão
            ctx.strokeStyle = 'rgba(207, 164, 72, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(0, 2, 9, 4.5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Botão de flor dourada com pétalas carmesim
            ctx.fillStyle = '#1e5436';
            ctx.beginPath();
            ctx.ellipse(0, -2, 5 * pulsoSem, 7 * pulsoSem, 0, 0, Math.PI * 2);
            ctx.fill();

            desenharRosaVfx(ctx, 0, -8 * pulsoSem, 0.75 * pulsoSem, 0, '#f7e082');

        } else if (sem.tipo === 'carnivora') {
            // FASE 2A: FLOR CARNÍVORA PREDADORA COM MANDÍBULAS DE ESPINHOS DOURADOS
            sem.mordidaTimer += dt;
            const cicloMordida = (sem.mordidaTimer % 950) / 950;
            const bocaAberta = Math.sin(cicloMordida * Math.PI) * 1.15;

            // Sombra
            ctx.fillStyle = 'rgba(12, 22, 14, 0.55)';
            ctx.beginPath();
            ctx.ellipse(0, 8, 24, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            // Caule espinhoso grosso
            ctx.lineWidth = 7;
            ctx.strokeStyle = '#1e5436';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 5); ctx.quadraticCurveTo(-6, -10, 0, -22); ctx.stroke();

            ctx.save();
            ctx.translate(0, -22);

            // Mandíbula inferior (Abre para baixo)
            ctx.save();
            ctx.rotate(bocaAberta * 0.5);
            ctx.fillStyle = '#133924';
            ctx.beginPath(); ctx.ellipse(0, 11, 15, 8.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6b0615';
            ctx.beginPath(); ctx.ellipse(0, 9, 12, 5.5, 0, 0, Math.PI * 2); ctx.fill();

            // Dentes pontiagudos de espinhos dourados
            ctx.fillStyle = '#f7e082';
            for (let d = -4; d <= 4; d++) {
                ctx.beginPath();
                ctx.moveTo(d * 2.5, 5);
                ctx.lineTo(d * 2.5 + 1.2, 12);
                ctx.lineTo(d * 2.5 - 1.2, 12);
                ctx.fill();
            }
            ctx.restore();

            // Mandíbula superior (Abre para cima)
            ctx.save();
            ctx.rotate(-bocaAberta * 0.7);
            ctx.fillStyle = '#1e5436';
            ctx.beginPath(); ctx.ellipse(0, -11, 16, 9.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#f7e082';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            ctx.fillStyle = '#b81228';
            ctx.beginPath(); ctx.ellipse(0, -8, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill();

            // Dentes superiores afiados
            ctx.fillStyle = '#f7e082';
            for (let d = -4; d <= 4; d++) {
                ctx.beginPath();
                ctx.moveTo(d * 2.5, -4);
                ctx.lineTo(d * 2.5 + 1.4, -11);
                ctx.lineTo(d * 2.5 - 1.4, -11);
                ctx.fill();
            }

            // Olhos selvagens da flor predadora
            ctx.fillStyle = '#f7e082';
            ctx.beginPath();
            ctx.arc(-7, -14, 2.6, 0, Math.PI * 2);
            ctx.arc(7, -14, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e6223d';
            ctx.beginPath();
            ctx.arc(-7, -14, 1.3, 0, Math.PI * 2);
            ctx.arc(7, -14, 1.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.restore();

            // Onda de choque ao morder
            if (cicloMordida > 0.86) {
                ctx.strokeStyle = 'rgba(230, 34, 61, 0.75)';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.ellipse(0, 6, 48 * (cicloMordida - 0.86) * 9, 24 * (cicloMordida - 0.86) * 9, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

        } else if (sem.tipo === 'rosa') {
            // FASE 2B: ROSA ARCANA DE MANA DESABROCHADA
            const pulsoRosa = Math.sin(tSeg * 3.5) * 0.12 + 0.88;

            // Halo celestial azul e carmesim
            const gradMana = ctx.createRadialGradient(0, -14, 2, 0, -14, 42 * pulsoRosa);
            gradMana.addColorStop(0, 'rgba(100, 210, 255, 0.65)');
            gradMana.addColorStop(0.5, 'rgba(230, 34, 61, 0.28)');
            gradMana.addColorStop(1, 'rgba(40, 110, 240, 0)');
            ctx.fillStyle = gradMana;
            ctx.beginPath(); ctx.arc(0, -14, 42 * pulsoRosa, 0, Math.PI * 2); ctx.fill();

            // Sombra
            ctx.fillStyle = 'rgba(10, 20, 30, 0.4)';
            ctx.beginPath(); ctx.ellipse(0, 6, 18, 9, 0, 0, Math.PI * 2); ctx.fill();

            // Haste mágica
            ctx.strokeStyle = '#327c52';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(2, -6, 0, -15); ctx.stroke();

            // Rosa mágica desabrochada com núcleo azul
            ctx.save();
            ctx.translate(0, -18);
            desenharRosaVfx(ctx, 0, 0, 2.3 * pulsoRosa, tSeg * 0.4, '#70d0ff');
            ctx.restore();

            // Partículas de mana subindo em espiral
            for (let m = 0; m < 6; m++) {
                const angM = tSeg * 3.5 + m * (Math.PI * 2 / 6);
                const distM = 15 + Math.sin(tSeg * 2 + m) * 4;
                const mx = Math.cos(angM) * distM;
                const my = -18 - (m * 6) + Math.sin(angM * 1.5) * 4;
                ctx.fillStyle = m % 2 === 0 ? '#70d0ff' : '#f7e082';
                ctx.beginPath(); ctx.arc(mx, my, 2.0, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 4. SKILL 3: ESPINHOS DE ROSA (DEBUFF -20% DEF/ATK)
    // ---------------------------------------------------------
    for (let i = window.florimEspinhosVfx.length - 1; i >= 0; i--) {
        const esp = window.florimEspinhosVfx[i];
        esp.vida -= dt;
        if (esp.vida <= 0) {
            window.florimEspinhosVfx.splice(i, 1);
            continue;
        }

        const fadeAlpha = Math.min(1.0, esp.vida / 400, (esp.vidaMax - esp.vida) / 300);

        ctx.save();
        ctx.translate(esp.x, esp.y);
        ctx.globalAlpha = fadeAlpha;

        // Fissura de solo e trincheira escura
        const rArea = esp.raio || 120;
        ctx.fillStyle = 'rgba(25, 15, 12, 0.48)';
        ctx.beginPath();
        ctx.ellipse(0, 4, rArea, rArea * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();

        // Borda de espinhos rúnicos no solo
        ctx.strokeStyle = 'rgba(230, 34, 61, 0.7)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 4, rArea, rArea * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Erupção de Estalagmites Espinhosas com Rosas no Topo
        for (let sIdx = 0; sIdx < esp.estalagmites.length; sIdx++) {
            const s = esp.estalagmites[sIdx];
            const decorrido = esp.vidaMax - esp.vida - s.delay;
            if (decorrido <= 0) continue;

            const progErup = Math.min(1.0, decorrido / 240);
            const alt = s.alturaMax * progErup;

            ctx.save();
            ctx.translate(s.ox, s.oy);
            ctx.rotate(s.inclinacao);

            // Sombra da estalagmite
            ctx.fillStyle = 'rgba(10, 18, 12, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 2, s.largura, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Madeira facetada
            ctx.fillStyle = '#38251b';
            ctx.beginPath();
            ctx.moveTo(-s.largura / 2, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(s.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#5e3e2c';
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(s.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            // Espinhos laterais dourados
            ctx.fillStyle = '#f7e082';
            ctx.beginPath();
            ctx.moveTo(-2, -alt * 0.6); ctx.lineTo(-7, -alt * 0.65); ctx.lineTo(-1, -alt * 0.7); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(2, -alt * 0.4); ctx.lineTo(7, -alt * 0.45); ctx.lineTo(1, -alt * 0.5); ctx.fill();

            // Rosa carmesim vibrante no topo
            if (s.temRosa && progErup > 0.8) {
                desenharRosaVfx(ctx, 0, -alt, 0.85, 0.2);
            }
            ctx.restore();
        }

        // Névoa aromática que reduz ATK/DEF
        ctx.fillStyle = 'rgba(230, 34, 61, 0.12)';
        for (let n = 0; n < 8; n++) {
            const angN = tSeg * 1.5 + n * (Math.PI * 2 / 8);
            const distN = (rArea * 0.6) + Math.sin(tSeg * 2 + n) * 15;
            const nx = Math.cos(angN) * distN;
            const ny = Math.sin(angN) * distN * 0.58;
            ctx.beginPath(); ctx.arc(nx, ny, 20, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 5. SKILL 4: PAREDE DE ESPINHOS (MURALHA BOTÂNICA CIRCULAR)
    // ---------------------------------------------------------
    for (let i = window.florimParedesVfx.length - 1; i >= 0; i--) {
        const par = window.florimParedesVfx[i];
        par.vida -= dt;
        if (par.vida <= 0) {
            window.florimParedesVfx.splice(i, 1);
            continue;
        }

        const fadeAlpha = Math.min(1.0, par.vida / 300, (par.vidaMax - par.vida) / 250);

        ctx.save();
        ctx.translate(par.x, par.y);
        ctx.globalAlpha = fadeAlpha;

        const rParede = par.raio || 80;
        ctx.strokeStyle = 'rgba(30, 84, 54, 0.85)';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.ellipse(0, 4, rParede, rParede * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Estacas da Barricada Circular com Rosas e Espinhos Dourados
        for (let eIdx = 0; eIdx < par.estacas.length; eIdx++) {
            const e = par.estacas[eIdx];
            const decorrido = par.vidaMax - par.vida - e.delay;
            if (decorrido <= 0) continue;
            const prog = Math.min(1.0, decorrido / 200);
            const alt = e.alturaMax * prog;

            ctx.save();
            ctx.translate(e.ox, e.oy);

            // Sombra
            ctx.fillStyle = 'rgba(10, 18, 12, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3, e.largura, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Estaca de madeira robusta
            ctx.fillStyle = '#25170f';
            ctx.beginPath();
            ctx.moveTo(-e.largura / 2, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(e.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#573722';
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(e.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            // Espinhos dourados pontiagudos saindo da estaca
            ctx.fillStyle = '#f7e082';
            ctx.beginPath();
            ctx.moveTo(-2, -alt * 0.5); ctx.lineTo(-9, -alt * 0.55); ctx.lineTo(-1, -alt * 0.65); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(2, -alt * 0.7); ctx.lineTo(9, -alt * 0.75); ctx.lineTo(1, -alt * 0.85); ctx.fill();

            // Rosa protetora no topo de cada estaca
            if (eIdx % 2 === 0) {
                desenharRosaVfx(ctx, 0, -alt, 0.95, 0.1);
            }

            ctx.restore();
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 6. PASSIVA: SANGRAMENTO & PÉTALAS MURCHAS
    // ---------------------------------------------------------
    for (let i = window.florimSangramentoVfx.length - 1; i >= 0; i--) {
        const sang = window.florimSangramentoVfx[i];
        sang.vida -= dt;
        if (sang.vida <= 0) {
            window.florimSangramentoVfx.splice(i, 1);
            continue;
        }

        const sAlpha = sang.vida / sang.vidaMax;
        ctx.save();
        ctx.translate(sang.x, sang.y);
        ctx.globalAlpha = sAlpha;

        for (let g of sang.gotas) {
            g.x += g.vx * (dt / 16.6);
            g.y += g.vy * (dt / 16.6);
            g.vy += 0.15;

            if (g.ehPetala) {
                ctx.fillStyle = '#b81228';
                ctx.beginPath();
                ctx.ellipse(g.x, g.y, g.tamanho * 1.5, g.tamanho * 0.9, 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#a61b34';
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
};

})();