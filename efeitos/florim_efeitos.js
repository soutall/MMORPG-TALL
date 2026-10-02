// efeitos/florim_efeitos.js — VFX Florim v2.0: Árvore Ancestral, Planta Carnívora, Rosa de Mana, Espinhos e Parede
(function(){
'use strict';

window.florimArvoresVfx = window.florimArvoresVfx || [];
window.florimSementesVfx = window.florimSementesVfx || [];
window.florimEspinhosVfx = window.florimEspinhosVfx || [];
window.florimParedesVfx = window.florimParedesVfx || [];
window.florimBasicVfx = window.florimBasicVfx || [];
window.florimSangramentoVfx = window.florimSangramentoVfx || [];

let ultimoTempo = performance.now();

// Helper: desenha uma rosa com camadas ricas de pétalas
function desenharRosaVfx(ctx, rx, ry, escala, ang) {
    ctx.save();
    ctx.translate(rx, ry);
    if (ang) ctx.rotate(ang);
    ctx.scale(escala, escala);
    
    // Pétalas externas
    ctx.fillStyle = '#7a1532';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.cos(i * 1.256) * 3.5, Math.sin(i * 1.256) * 3.5, 3.8, 2.5, i * 1.256, 0, Math.PI * 2);
        ctx.fill();
    }
    // Pétalas médias
    ctx.fillStyle = '#d63364';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.cos(i * 1.256 + 0.6) * 2.2, Math.sin(i * 1.256 + 0.6) * 2.2, 2.8, 2.0, i * 1.256 + 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    // Centro vivo
    ctx.fillStyle = '#f0658e';
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffd154';
    ctx.beginPath();
    ctx.arc(0.4, -0.4, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// -------------------------------------------------------------
// GERADORES DE ANIMAÇÃO EXPOSTOS EM WINDOW
// -------------------------------------------------------------

window.criarAnimacaoAtaqueBasicoFlorim = function(x, y, ang) {
    window.florimBasicVfx.push({
        startX: x, startY: y,
        ang: ang || 0,
        vidaMax: 380,
        vida: 380,
        rastro: []
    });
};

window.criarAnimacaoArvoreFlorim = function(id, x, y, raio) {
    let folhas = [];
    const r = raio || 100;
    for (let i = 0; i < 28; i++) {
        folhas.push({
            ox: (Math.random() - 0.5) * r * 1.6,
            oy: -65 - Math.random() * 45,
            velY: Math.random() * 0.8 + 0.6,
            ang: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.08,
            escala: Math.random() * 0.5 + 0.75,
            vidaMax: 2200 + Math.random() * 1200,
            vida: 2200 + Math.random() * 1200
        });
    }

    window.florimArvoresVfx.push({
        id: id,
        x: x, y: y,
        raio: r,
        vidaMax: 8000,
        vida: 8000,
        folhasCaindo: folhas,
        pulsos: [{ max: 1200, atual: 1200 }],
        particulasPolem: []
    });
};

window.criarAnimacaoArvoreCuraFlorim = function(id, x, y, raio) {
    let arv = window.florimArvoresVfx.find(a => a.id === id);
    if (!arv) {
        window.criarAnimacaoArvoreFlorim(id, x, y, raio);
        arv = window.florimArvoresVfx.find(a => a.id === id);
    }
    if (arv) {
        arv.pulsos.push({ max: 900, atual: 900 });
        const r = arv.raio || 100;
        for (let i = 0; i < 18; i++) {
            arv.folhasCaindo.push({
                ox: (Math.random() - 0.5) * r * 1.7,
                oy: -70 - Math.random() * 30,
                velY: Math.random() * 1.2 + 0.8,
                ang: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.1,
                escala: Math.random() * 0.6 + 0.8,
                vidaMax: 1800 + Math.random() * 1000,
                vida: 1800 + Math.random() * 1000
            });
        }
    }
};

window.criarAnimacaoSementeFlorim = function(id, x, y) {
    window.florimSementesVfx.push({
        id: id, x: x, y: y,
        vidaMax: 20000, vida: 20000,
        fase: 'plantada',
        brotos: [
            { ang: 0, r: 8 },
            { ang: 2.1, r: 9 },
            { ang: 4.2, r: 7 }
        ]
    });
};

window.criarAnimacaoSementeAtivadaFlorim = function(x, y, tipo) {
    // Remove sementes plantadas próximas deste ponto
    window.florimSementesVfx = window.florimSementesVfx.filter(s => {
        if (s.fase === 'plantada' && Math.hypot(s.x - x, s.y - y) < 45) return false;
        return true;
    });

    const isCarnivora = tipo === 'carnivora';
    const duracao = isCarnivora ? 5000 : 4000;

    let detritos = [];
    for (let k = 0; k < 16; k++) {
        let angK = Math.random() * Math.PI * 2;
        let spd = Math.random() * 3.5 + 1.5;
        detritos.push({
            x: 0, y: 0,
            vx: Math.cos(angK) * spd,
            vy: Math.sin(angK) * spd * 0.6 - 2.5,
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            cor: k % 2 === 0 ? '#4d331a' : '#2f5922'
        });
    }

    window.florimSementesVfx.push({
        x: x, y: y,
        tipo: tipo || 'carnivora',
        vidaMax: duracao,
        vida: duracao,
        fase: 'ativada',
        mordidaTimer: 0,
        detritos: detritos,
        particulasMana: []
    });
};

window.criarAnimacaoEspinhosFlorim = function(id, x, y, raio) {
    const r = raio || 120;
    const estalagmites = [];
    for (let i = 0; i < 22; i++) {
        let angP = Math.random() * Math.PI * 2;
        let distP = Math.sqrt(Math.random()) * (r * 0.92);
        estalagmites.push({
            ox: Math.cos(angP) * distP,
            oy: Math.sin(angP) * distP * 0.6,
            alturaMax: Math.random() * 22 + 16,
            largura: Math.random() * 7 + 6,
            delay: Math.random() * 250,
            inclinacao: (Math.random() - 0.5) * 0.4,
            temRosa: Math.random() < 0.65
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
    const totalEstacas = 18;
    for (let i = 0; i < totalEstacas; i++) {
        let angE = (i / totalEstacas) * Math.PI * 2;
        estacas.push({
            ang: angE,
            ox: Math.cos(angE) * r,
            oy: Math.sin(angE) * r * 0.65,
            alturaMax: Math.random() * 20 + 26,
            largura: Math.random() * 6 + 7,
            delay: (i % 4) * 80
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
    for (let i = 0; i < 6; i++) {
        gotas.push({
            x: (Math.random() - 0.5) * 16,
            y: (Math.random() - 0.5) * 12 - 10,
            vx: (Math.random() - 0.5) * 2.2,
            vy: Math.random() * 2.5 + 1.5,
            tamanho: Math.random() * 2.5 + 1.5
        });
    }
    window.florimSangramentoVfx.push({
        x: x, y: y,
        vidaMax: 700, vida: 700,
        gotas: gotas
    });
};

// -------------------------------------------------------------
// RENDERIZADOR PRINCIPAL DE EFEITOS FLORIM
// -------------------------------------------------------------
window.desenharEfeitosFlorim = function() {
    const ctx = window.ctx || (document.getElementById('gameCanvas') ? document.getElementById('gameCanvas').getContext('2d') : null);
    if (!ctx) return;

    let agora = performance.now();
    let dt = Math.min(60, Math.max(1, agora - ultimoTempo));
    ultimoTempo = agora;
    const tSeg = agora / 1000;

    // ---------------------------------------------------------
    // 1. ATAQUE BÁSICO (Projétil de Espinho & Pólen)
    // ---------------------------------------------------------
    for (let i = window.florimBasicVfx.length - 1; i >= 0; i--) {
        let b = window.florimBasicVfx[i];
        b.vida -= dt;
        if (b.vida <= 0) {
            window.florimBasicVfx.splice(i, 1);
            continue;
        }
        let prog = 1 - (b.vida / b.vidaMax);
        let dist = prog * 320;
        let cx = b.startX + Math.cos(b.ang) * dist;
        let cy = b.startY + Math.sin(b.ang) * dist;

        b.rastro.push({ x: cx, y: cy, vida: 220 });

        // Desenha rastro luminoso de pólen
        for (let j = b.rastro.length - 1; j >= 0; j--) {
            let r = b.rastro[j];
            r.vida -= dt;
            if (r.vida <= 0) {
                b.rastro.splice(j, 1);
                continue;
            }
            let alphaR = r.vida / 220;
            ctx.fillStyle = `rgba(136, 255, 68, ${alphaR * 0.7})`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 2.5 * alphaR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Desenha o Dardo Vegetal
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(b.ang);

        // Halo
        ctx.shadowColor = '#88ff44';
        ctx.shadowBlur = 12;

        // Madeira do dardo
        ctx.fillStyle = '#4d331a';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-7, -4);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-7, 4);
        ctx.closePath();
        ctx.fill();

        // Veio de seiva brilhante
        ctx.fillStyle = '#88ff44';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-2, -1.2);
        ctx.lineTo(-2, 1.2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 2. SKILL 1: ÁRVORE CURATIVA ANCESTRAL
    // ---------------------------------------------------------
    for (let i = window.florimArvoresVfx.length - 1; i >= 0; i--) {
        let arv = window.florimArvoresVfx[i];
        arv.vida -= dt;
        if (arv.vida <= 0) {
            window.florimArvoresVfx.splice(i, 1);
            continue;
        }

        let fadeAlpha = Math.min(1.0, arv.vida / 600, (arv.vidaMax - arv.vida) / 400);

        ctx.save();
        ctx.translate(arv.x, arv.y);
        ctx.globalAlpha = fadeAlpha;

        // (a) Anel de Solo Sagrado da Natureza
        const rArea = arv.raio || 100;
        const pulsoSolo = Math.sin(tSeg * 3) * 0.05 + 0.95;
        
        ctx.save();
        ctx.fillStyle = 'rgba(77, 138, 54, 0.16)';
        ctx.beginPath();
        ctx.ellipse(0, 5, rArea * pulsoSolo, rArea * 0.55 * pulsoSolo, 0, 0, Math.PI * 2);
        ctx.fill();

        // Borda fênix vegetal do anel
        ctx.strokeStyle = 'rgba(136, 255, 68, 0.55)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 5, rArea, rArea * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // (b) Ondas concêntricas de cura expandindo
        for (let pIdx = arv.pulsos.length - 1; pIdx >= 0; pIdx--) {
            let pulso = arv.pulsos[pIdx];
            pulso.atual -= dt;
            if (pulso.atual <= 0) {
                arv.pulsos.splice(pIdx, 1);
                continue;
            }
            let pProg = 1 - (pulso.atual / pulso.max);
            let pAlpha = (1 - pProg) * 0.75;
            ctx.save();
            ctx.strokeStyle = `rgba(136, 255, 68, ${pAlpha})`;
            ctx.lineWidth = 3.5 * (1 - pProg);
            ctx.beginPath();
            ctx.ellipse(0, 5, rArea * pProg, rArea * 0.55 * pProg, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Runas de cura no raio
            ctx.fillStyle = `rgba(255, 230, 100, ${pAlpha})`;
            for (let k = 0; k < 6; k++) {
                let angK = k * (Math.PI * 2 / 6) + pProg * 0.5;
                let kx = Math.cos(angK) * (rArea * pProg);
                let ky = 5 + Math.sin(angK) * (rArea * 0.55 * pProg);
                ctx.beginPath();
                ctx.arc(kx, ky, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // (c) Sombra massiva das raízes no solo
        ctx.fillStyle = 'rgba(15, 25, 10, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 7, 34, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // (d) Raízes Ancestrais Cravadas no Chão
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#3d2510';
        // Raiz esquerda
        ctx.beginPath();
        ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-18, 5, -28, 11); ctx.stroke();
        // Raiz direita
        ctx.beginPath();
        ctx.moveTo(5, 0); ctx.quadraticCurveTo(18, 5, 27, 10); ctx.stroke();
        // Raiz central
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(0, 2); ctx.quadraticCurveTo(0, 8, -4, 15); ctx.stroke();

        // (e) Tronco Monumental de Madeira com Textura
        ctx.save();
        // Casca base
        const gradTronco = ctx.createLinearGradient(-16, 0, 16, -65);
        gradTronco.addColorStop(0, '#2a1708');
        gradTronco.addColorStop(0.4, '#4d2e14');
        gradTronco.addColorStop(0.7, '#6b4320');
        gradTronco.addColorStop(1, '#8c5a2c');
        ctx.fillStyle = gradTronco;

        ctx.beginPath();
        ctx.moveTo(-16, 5);
        ctx.quadraticCurveTo(-10, -25, -20, -65);
        ctx.lineTo(20, -65);
        ctx.quadraticCurveTo(10, -25, 16, 5);
        ctx.closePath();
        ctx.fill();

        // Estrias de casca 3D
        ctx.strokeStyle = '#221105';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-7, 3); ctx.quadraticCurveTo(-4, -25, -9, -60);
        ctx.moveTo(1, 4); ctx.quadraticCurveTo(3, -20, 2, -62);
        ctx.moveTo(8, 2); ctx.quadraticCurveTo(5, -22, 10, -58);
        ctx.stroke();

        // Veios de seiva brilhante escorrendo pelo tronco
        ctx.strokeStyle = 'rgba(136, 255, 68, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-1, -20, -4, -55);
        ctx.stroke();

        // Trepadeiras de Rosas envolvendo o tronco
        ctx.strokeStyle = '#2f5922';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -18, 11, -30);
        ctx.moveTo(11, -30); ctx.quadraticCurveTo(0, -42, -14, -54);
        ctx.stroke();

        desenharRosaVfx(ctx, -2, -16, 0.9, 0.3);
        desenharRosaVfx(ctx, 8, -32, 1.1, -0.4);
        desenharRosaVfx(ctx, -9, -48, 0.95, 0.2);
        ctx.restore();

        // (f) Copa da Árvore em Múltiplas Camadas Volumétricas
        ctx.save();
        const copaY = -72;
        
        // Camada de fundo (sombra)
        ctx.fillStyle = '#1c3814';
        ctx.beginPath();
        ctx.arc(-24, copaY + 8, 28, 0, Math.PI * 2);
        ctx.arc(24, copaY + 8, 28, 0, Math.PI * 2);
        ctx.arc(0, copaY - 6, 36, 0, Math.PI * 2);
        ctx.fill();

        // Camada média (folhas vivas com gradiente)
        const gradCopa = ctx.createRadialGradient(0, copaY - 10, 6, 0, copaY, 45);
        gradCopa.addColorStop(0, '#75c44f');
        gradCopa.addColorStop(0.5, '#44822d');
        gradCopa.addColorStop(1, '#234a17');
        ctx.fillStyle = gradCopa;

        ctx.beginPath();
        ctx.arc(-22, copaY + 5, 26, 0, Math.PI * 2);
        ctx.arc(22, copaY + 5, 26, 0, Math.PI * 2);
        ctx.arc(0, copaY - 8, 33, 0, Math.PI * 2);
        ctx.arc(-10, copaY - 24, 22, 0, Math.PI * 2);
        ctx.arc(12, copaY - 22, 22, 0, Math.PI * 2);
        ctx.fill();

        // Brilho solar no topo da copa
        ctx.fillStyle = 'rgba(170, 240, 90, 0.35)';
        ctx.beginPath();
        ctx.arc(0, copaY - 18, 22, 0, Math.PI * 2);
        ctx.fill();

        // Rosas grandiosas na copa
        desenharRosaVfx(ctx, -16, copaY - 12, 1.25, -0.2);
        desenharRosaVfx(ctx, 18, copaY - 8, 1.35, 0.3);
        desenharRosaVfx(ctx, 2, copaY - 28, 1.45, 0.1);
        desenharRosaVfx(ctx, -4, copaY + 8, 1.15, -0.5);
        ctx.restore();

        // (g) Chuva Orgânica de Folhas Curativas Caindo em Espiral
        for (let fIdx = arv.folhasCaindo.length - 1; fIdx >= 0; fIdx--) {
            let folha = arv.folhasCaindo[fIdx];
            folha.vida -= dt;
            if (folha.vida <= 0) {
                arv.folhasCaindo.splice(fIdx, 1);
                continue;
            }
            folha.oy += folha.velY * (dt / 16.6);
            folha.ang += folha.rotSpeed;
            let fAlpha = Math.min(1.0, folha.vida / 400);

            let posX = folha.ox + Math.sin(tSeg * 3 + fIdx) * 14;
            let posY = folha.oy;

            // Se tocar o chão, vira fagulha de cura
            if (posY >= 5) {
                folha.oy = -65 - Math.random() * 30;
                folha.ox = (Math.random() - 0.5) * rArea * 1.5;
            }

            ctx.save();
            ctx.translate(posX, posY);
            ctx.rotate(folha.ang);
            ctx.scale(folha.escala, folha.escala);
            ctx.globalAlpha = fAlpha * fadeAlpha;

            // Folha com nervura
            ctx.fillStyle = fIdx % 2 === 0 ? '#88ff44' : '#5ba342';
            ctx.beginPath();
            ctx.ellipse(0, 0, 3.2, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(0, -5); ctx.lineTo(0, 5);
            ctx.stroke();

            // Sombra da folha no solo
            ctx.restore();
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 3. SKILL 2: SEMENTE DUAL (Armadilha / Carnívora / Rosa Mana)
    // ---------------------------------------------------------
    for (let i = window.florimSementesVfx.length - 1; i >= 0; i--) {
        let sem = window.florimSementesVfx[i];
        sem.vida -= dt;
        if (sem.vida <= 0) {
            window.florimSementesVfx.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.translate(sem.x, sem.y);

        // FASE 1: SEMENTE PLANTADA
        if (sem.fase === 'plantada') {
            const pulsoSem = Math.sin(tSeg * 4.5) * 0.15 + 0.85;

            // Sombra no chão
            ctx.fillStyle = 'rgba(15, 25, 10, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 3, 10 * pulsoSem, 5 * pulsoSem, 0, 0, Math.PI * 2);
            ctx.fill();

            // Anel sutil de terra mexida
            ctx.strokeStyle = 'rgba(107, 71, 36, 0.8)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, 2, 8, 4, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Broto da semente (bulbo verde com listras douradas)
            ctx.fillStyle = '#44822d';
            ctx.beginPath();
            ctx.ellipse(0, -2, 5 * pulsoSem, 7 * pulsoSem, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pequeno broto de flor no topo
            ctx.fillStyle = '#d63364';
            ctx.beginPath();
            ctx.arc(0, -9 * pulsoSem, 2.8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#88ff44';
            ctx.beginPath();
            ctx.arc(0, -9 * pulsoSem, 1.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (sem.tipo === 'carnivora') {
            // FASE 2A: PLANTA CARNÍVORA GIGANTE MORDENDO EM ÁREA
            sem.mordidaTimer += dt;
            let cicloMordida = (sem.mordidaTimer % 1000) / 1000; // 0..1 por segundo
            let bocaAberta = Math.sin(cicloMordida * Math.PI) * 1.1; // Abre e morde

            // Sombra
            ctx.fillStyle = 'rgba(10, 20, 8, 0.55)';
            ctx.beginPath();
            ctx.ellipse(0, 8, 22, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Caule espinhoso grosso
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#2f5922';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 5);
            ctx.quadraticCurveTo(-6, -10, 0, -20);
            ctx.stroke();

            // Mandíbula Inferior (Boca Carnívora 3D)
            ctx.save();
            ctx.translate(0, -20);

            // Mandíbula inferior abre para baixo
            ctx.save();
            ctx.rotate(bocaAberta * 0.45);
            ctx.fillStyle = '#1c3614';
            ctx.beginPath();
            ctx.ellipse(0, 10, 14, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Interior vermelho carne
            ctx.fillStyle = '#8c1b3d';
            ctx.beginPath();
            ctx.ellipse(0, 8, 11, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Dentes inferiores pontiagudos
            ctx.fillStyle = '#f5f0d8';
            for (let d = -4; d <= 4; d++) {
                ctx.beginPath();
                ctx.moveTo(d * 2.4, 4);
                ctx.lineTo(d * 2.4 + 1.2, 10);
                ctx.lineTo(d * 2.4 - 1.2, 10);
                ctx.fill();
            }
            ctx.restore();

            // Mandíbula superior abre para cima
            ctx.save();
            ctx.rotate(-bocaAberta * 0.65);
            ctx.fillStyle = '#2f5922';
            ctx.beginPath();
            ctx.ellipse(0, -10, 15, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            // Lábios externos rajados
            ctx.strokeStyle = '#6ab84d';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Interior vermelho sangue
            ctx.fillStyle = '#a62446';
            ctx.beginPath();
            ctx.ellipse(0, -7, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Dentes superiores afiados
            ctx.fillStyle = '#f5f0d8';
            for (let d = -4; d <= 4; d++) {
                ctx.beginPath();
                ctx.moveTo(d * 2.4, -3);
                ctx.lineTo(d * 2.4 + 1.4, -9);
                ctx.lineTo(d * 2.4 - 1.4, -9);
                ctx.fill();
            }

            // Olhos selvagens de predador vegetal
            ctx.fillStyle = '#ffd154';
            ctx.beginPath();
            ctx.arc(-7, -13, 2.5, 0, Math.PI * 2);
            ctx.arc(7, -13, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-7, -13, 1.2, 0, Math.PI * 2);
            ctx.arc(7, -13, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Saliva de seiva ácida pingando
            if (bocaAberta > 0.4) {
                ctx.fillStyle = 'rgba(136, 255, 68, 0.85)';
                ctx.beginPath();
                ctx.arc(-5, 0, 1.8, 0, Math.PI * 2);
                ctx.arc(5, 2, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Onda de choque no momento exato do impacto da mordida
            if (cicloMordida > 0.88) {
                ctx.strokeStyle = 'rgba(214, 51, 100, 0.65)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, 6, 45 * (cicloMordida - 0.88) * 8, 22 * (cicloMordida - 0.88) * 8, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

        } else if (sem.tipo === 'rosa') {
            // FASE 2B: ROSA SAGRADA DE MANA DESABROCHADA
            const pulsoRosa = Math.sin(tSeg * 3.5) * 0.1 + 0.9;

            // Halo celestial azul e rosa
            const gradMana = ctx.createRadialGradient(0, -12, 2, 0, -12, 38 * pulsoRosa);
            gradMana.addColorStop(0, 'rgba(120, 200, 255, 0.6)');
            gradMana.addColorStop(0.5, 'rgba(240, 101, 142, 0.3)');
            gradMana.addColorStop(1, 'rgba(60, 120, 255, 0)');
            ctx.fillStyle = gradMana;
            ctx.beginPath();
            ctx.arc(0, -12, 38 * pulsoRosa, 0, Math.PI * 2);
            ctx.fill();

            // Sombra
            ctx.fillStyle = 'rgba(10, 20, 30, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 6, 18, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Caule elegante
            ctx.strokeStyle = '#3d7a2f';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 5); ctx.quadraticCurveTo(2, -6, 0, -14); ctx.stroke();

            // Rosa desabrochando imponente
            ctx.save();
            ctx.translate(0, -16);
            desenharRosaVfx(ctx, 0, 0, 2.2 * pulsoRosa, tSeg * 0.4);
            ctx.restore();

            // Partículas de mana subindo em espiral
            for (let m = 0; m < 5; m++) {
                let angM = tSeg * 3.5 + m * (Math.PI * 2 / 5);
                let distM = 14 + Math.sin(tSeg * 2 + m) * 4;
                let mx = Math.cos(angM) * distM;
                let my = -16 - (m * 6) + Math.sin(angM * 1.5) * 4;
                ctx.fillStyle = m % 2 === 0 ? '#70d0ff' : '#ffffff';
                ctx.beginPath();
                ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 4. SKILL 3: ESPINHOS DE ROSA (Debuff 20% DEF/ATK)
    // ---------------------------------------------------------
    for (let i = window.florimEspinhosVfx.length - 1; i >= 0; i--) {
        let esp = window.florimEspinhosVfx[i];
        esp.vida -= dt;
        if (esp.vida <= 0) {
            window.florimEspinhosVfx.splice(i, 1);
            continue;
        }

        let fadeAlpha = Math.min(1.0, esp.vida / 400, (esp.vidaMax - esp.vida) / 300);

        ctx.save();
        ctx.translate(esp.x, esp.y);
        ctx.globalAlpha = fadeAlpha;

        // Fissura de solo e trincheira escura
        const rArea = esp.raio || 120;
        ctx.fillStyle = 'rgba(28, 18, 10, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 4, rArea, rArea * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();

        // Borda de espinhos rúnicos no solo
        ctx.strokeStyle = 'rgba(214, 51, 100, 0.65)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 4, rArea, rArea * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Erupção de Estalagmites Espinhosas 3D
        for (let sIdx = 0; sIdx < esp.estalagmites.length; sIdx++) {
            let s = esp.estalagmites[sIdx];
            let decorrido = esp.vidaMax - esp.vida - s.delay;
            if (decorrido <= 0) continue;

            // Erupção com easeOutBack
            let progErup = Math.min(1.0, decorrido / 250);
            let alt = s.alturaMax * progErup;

            ctx.save();
            ctx.translate(s.ox, s.oy);
            ctx.rotate(s.inclinacao);

            // Sombra da estalagmite no chão
            ctx.fillStyle = 'rgba(10, 15, 8, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 2, s.largura, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Madeira facetada da estalagmite
            ctx.fillStyle = '#4d331a';
            ctx.beginPath();
            ctx.moveTo(-s.largura / 2, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(s.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            // Lado iluminado da madeira
            ctx.fillStyle = '#6b4724';
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(s.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            // Espinhos laterais
            ctx.fillStyle = '#88ff44';
            ctx.beginPath();
            ctx.moveTo(-2, -alt * 0.6); ctx.lineTo(-6, -alt * 0.65); ctx.lineTo(-1, -alt * 0.7); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(2, -alt * 0.4); ctx.lineTo(6, -alt * 0.45); ctx.lineTo(1, -alt * 0.5); ctx.fill();

            // Rosa vermelha no topo da estalagmite
            if (s.temRosa && progErup > 0.8) {
                desenharRosaVfx(ctx, 0, -alt, 0.75, 0.2);
            }
            ctx.restore();
        }

        // Névoa tóxica de debuff flutuando na área
        ctx.fillStyle = 'rgba(214, 51, 100, 0.12)';
        for (let n = 0; n < 8; n++) {
            let angN = tSeg * 1.5 + n * (Math.PI * 2 / 8);
            let distN = (rArea * 0.6) + Math.sin(tSeg * 2 + n) * 15;
            let nx = Math.cos(angN) * distN;
            let ny = Math.sin(angN) * distN * 0.58;
            ctx.beginPath();
            ctx.arc(nx, ny, 18, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 5. SKILL 4: PAREDE DE ESPINHOS (Barricada Vegetal Circular)
    // ---------------------------------------------------------
    for (let i = window.florimParedesVfx.length - 1; i >= 0; i--) {
        let par = window.florimParedesVfx[i];
        par.vida -= dt;
        if (par.vida <= 0) {
            window.florimParedesVfx.splice(i, 1);
            continue;
        }

        let fadeAlpha = Math.min(1.0, par.vida / 300, (par.vidaMax - par.vida) / 250);

        ctx.save();
        ctx.translate(par.x, par.y);
        ctx.globalAlpha = fadeAlpha;

        // Solo sob a parede
        const rParede = par.raio || 80;
        ctx.strokeStyle = 'rgba(47, 89, 34, 0.75)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(0, 4, rParede, rParede * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Estacas da Barricada Circular
        for (let eIdx = 0; eIdx < par.estacas.length; eIdx++) {
            let e = par.estacas[eIdx];
            let decorrido = par.vidaMax - par.vida - e.delay;
            if (decorrido <= 0) continue;
            let prog = Math.min(1.0, decorrido / 200);
            let alt = e.alturaMax * prog;

            ctx.save();
            ctx.translate(e.ox, e.oy);

            // Sombra da estaca
            ctx.fillStyle = 'rgba(10, 15, 8, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3, e.largura, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Estaca de madeira robusta
            ctx.fillStyle = '#3a2412';
            ctx.beginPath();
            ctx.moveTo(-e.largura / 2, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(e.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#5c3a1d';
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(0, -alt);
            ctx.lineTo(e.largura / 2, 2);
            ctx.closePath();
            ctx.fill();

            // Espinhos farpados pontiagudos saindo da estaca
            ctx.fillStyle = '#88ff44';
            ctx.beginPath();
            ctx.moveTo(-2, -alt * 0.5); ctx.lineTo(-8, -alt * 0.55); ctx.lineTo(-1, -alt * 0.65); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(2, -alt * 0.7); ctx.lineTo(8, -alt * 0.75); ctx.lineTo(1, -alt * 0.85); ctx.fill();

            // Rosa protetora no topo de cada segunda estaca
            if (eIdx % 2 === 0) {
                desenharRosaVfx(ctx, 0, -alt, 0.85, 0.1);
            }

            ctx.restore();
        }

        ctx.restore();
    }

    // ---------------------------------------------------------
    // 6. PASSIVA: SANGRAMENTO VEGETAL
    // ---------------------------------------------------------
    for (let i = window.florimSangramentoVfx.length - 1; i >= 0; i--) {
        let sang = window.florimSangramentoVfx[i];
        sang.vida -= dt;
        if (sang.vida <= 0) {
            window.florimSangramentoVfx.splice(i, 1);
            continue;
        }

        let sAlpha = sang.vida / sang.vidaMax;
        ctx.save();
        ctx.translate(sang.x, sang.y);
        ctx.globalAlpha = sAlpha;
        ctx.fillStyle = '#a61b34';

        for (let g of sang.gotas) {
            g.x += g.vx * (dt / 16.6);
            g.y += g.vy * (dt / 16.6);
            g.vy += 0.15; // gravidade
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.tamanho, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
};

})();