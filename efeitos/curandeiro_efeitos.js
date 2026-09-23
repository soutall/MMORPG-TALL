// efeitos/curandeiro_efeitos.js - Habilidades de Cura e Julgamento Divino
window.curasAtivas = [];
window.julgamentosAtivos = [];
window.aurasSagradas = [];

function particulasSagradas(x, y, quantidade) {
    let lista = [];
    for (let i = 0; i < quantidade; i++) {
        let ang = Math.random() * Math.PI * 2;
        let raio = 18 + Math.random() * 82;
        lista.push({
            x: x + Math.cos(ang) * raio,
            y: y + Math.sin(ang) * raio * 0.52,
            ang: ang,
            raio: raio,
            velocidade: 0.004 + Math.random() * 0.012,
            vida: 0.45 + Math.random() * 0.55,
            tamanho: 1 + Math.random() * 2.6,
            fase: Math.random() * 6,
            tipo: Math.random() > 0.78 ? 'estrela' : 'luz'
        });
    }
    return lista;
}

window.__auraSagradaCache = window.__auraSagradaCache || {
    particleSprite: null,
    runeSprite: null,
    runeSpriteGold: null
};

function criarCanvasOffscreen(largura, altura) {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(largura, altura);
    }
    let c = document.createElement('canvas');
    c.width = largura;
    c.height = altura;
    return c;
}

function gerarSpriteParticulaAura() {
    if (window.__auraSagradaCache.particleSprite) return window.__auraSagradaCache.particleSprite;
    let canvas = criarCanvasOffscreen(28, 28);
    let ctx = canvas.getContext('2d');
    let grad = ctx.createRadialGradient(14, 14, 1, 14, 14, 14);
    grad.addColorStop(0, 'rgba(255,255,220,1)');
    grad.addColorStop(0.25, 'rgba(255,220,110,0.9)');
    grad.addColorStop(0.6, 'rgba(255,188,62,0.42)');
    grad.addColorStop(1, 'rgba(255,188,62,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 28, 28);
    window.__auraSagradaCache.particleSprite = canvas;
    return canvas;
}

function gerarSpriteRunaAura() {
    if (window.__auraSagradaCache.runeSprite) return window.__auraSagradaCache.runeSprite;
    let canvas = criarCanvasOffscreen(40, 40);
    let ctx = canvas.getContext('2d');
    ctx.translate(20, 20);
    ctx.strokeStyle = '#fff5bc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(0, -12);
    ctx.lineTo(10, 8);
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.stroke();
    window.__auraSagradaCache.runeSprite = canvas;
    return canvas;
}

function obterBudgetParticulasAura() {
    if (!window.innerWidth) return 48;
    let area = window.innerWidth * window.innerHeight;
    if (area < 600000) return 32;
    if (area < 1200000) return 48;
    if (area < 2000000) return 64;
    return 72;
}

function resetarParticulaAura(particula, cx, cy) {
    let ang = Math.random() * Math.PI * 2;
    let raio = 18 + Math.random() * 82;
    particula.x = cx + Math.cos(ang) * raio;
    particula.y = cy + Math.sin(ang) * raio * 0.52;
    particula.ang = ang;
    particula.raio = raio;
    particula.velocidade = 0.004 + Math.random() * 0.012;
    particula.vida = 0.45 + Math.random() * 0.55;
    particula.tamanho = 1 + Math.random() * 2.6;
    particula.fase = Math.random() * 6;
    particula.tipo = Math.random() > 0.78 ? 'estrela' : 'luz';
    return particula;
}

function criarParticulasAura(cx, cy, quantidade) {
    let lista = [];
    for (let i = 0; i < quantidade; i++) {
        lista.push(resetarParticulaAura({
            x: cx,
            y: cy,
            ang: 0,
            raio: 0,
            velocidade: 0,
            vida: 1,
            tamanho: 1,
            fase: 0,
            tipo: 'luz'
        }, cx, cy));
    }
    return lista;
}

function shouldRenderAura(aura) {
    if (!aura || !aura.ativa) return false;
    let camX = window.camX || 0;
    let camY = window.camY || 0;
    let vw = window.innerWidth || 800;
    let vh = window.innerHeight || 600;
    let margem = (aura.raioMax || 190) + 30;
    return !(aura.x + margem < camX || aura.x - margem > camX + vw || aura.y + margem < camY || aura.y - margem > camY + vh);
}

function prepararBaseAura(aura) {
    if (!aura) return null;
    let radiusRequired = Math.ceil((aura.raioMax || 190) * 1.2);
    let needsNew = !aura.baseCache || aura.baseCache.radius !== radiusRequired || aura.baseCache.alpha !== aura.alpha;
    if (!needsNew) return aura.baseCache;

    let canvas = criarCanvasOffscreen(radiusRequired * 2 + 8, radiusRequired * 2 + 8);
    let ctx = canvas.getContext('2d');
    let cx = canvas.width / 2;
    let cy = canvas.height / 2;

    let halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, radiusRequired);
    halo.addColorStop(0, 'rgba(255,248,190,0.27)');
    halo.addColorStop(0.35, 'rgba(255,216,90,0.22)');
    halo.addColorStop(0.7, 'rgba(231,184,63,0.08)');
    halo.addColorStop(1, 'rgba(255,204,62,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let camada = 0; camada < 3; camada++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusRequired * (0.7 + camada * 0.15), radiusRequired * (0.34 + camada * 0.08), 0, 0, Math.PI * 2);
        ctx.strokeStyle = camada === 1 ? 'rgba(255,246,176,0.8)' : 'rgba(231,184,63,0.75)';
        ctx.lineWidth = camada === 1 ? 2 : 1.2;
        ctx.setLineDash(camada === 2 ? [3, 8] : [12, 6]);
        ctx.stroke();
    }

    aura.baseCache = {
        canvas: canvas,
        width: canvas.width,
        height: canvas.height,
        radius: radiusRequired,
        alpha: aura.alpha || 1
    };
    return aura.baseCache;
}

window.criarAnimacaoAuraSagrada = function(id, x, y, raio) {
    if (typeof id === 'number' && typeof y === 'undefined') {
        raio = 190;
        y = x;
        x = id;
        id = 'cura-local';
    }
    let aura = window.aurasSagradas.find(function(item) {
        return item.id === id || Math.hypot(item.x - x, item.y - y) < 40;
    });
    if (aura) {
        aura.tempo = 0;
        aura.ativa = true;
        aura.alpha = Math.min(1, aura.alpha + 0.18);
        return;
    }

    let budget = obterBudgetParticulasAura();
    let novaAura = {
        id: id,
        x: x,
        y: y,
        raio: 18,
        raioMax: raio || 190,
        ativa: true,
        tempo: 0,
        alpha: 0,
        curas: [],
        ondas: [],
        particulas: criarParticulasAura(x, y, budget),
        runas: Array.from({ length: 12 }, function(_, i) {
            return { ang: (i / 12) * Math.PI * 2, fase: Math.random() * 6, escala: 0.8 + Math.random() * 0.4 };
        }),
        _lastTs: performance.now ? performance.now() : Date.now(),
        baseCache: null
    };
    window.aurasSagradas.push(novaAura);
};

window.atualizarAuraSagrada = function(id, x, y) {
    let aura = window.aurasSagradas.find(function(item) { return item.id === id; });
    if (!aura) {
        window.criarAnimacaoAuraSagrada(id, x, y, 190);
        return;
    }
    aura.x = x;
    aura.y = y;
    aura.ativa = true;
    aura.tempo = Math.min(aura.tempo, 120);
};

window.finalizarAuraSagrada = function(id) {
    let aura = window.aurasSagradas.find(function(item) { return item.id === id; });
    if (aura) aura.ativa = false;
};

window.criarEfeitoPulsoAuraSagrada = function(id, x, y, alvos) {
    let aura = window.aurasSagradas.find(function(item) { return item.id === id; });
    if (!aura) return;
    aura.ondas.push({ raio: 12, alpha: 0.9 });
    (alvos || []).forEach(function(alvo) {
        aura.curas.push({ x: aura.x, y: aura.y, tx: alvo.x, ty: alvo.y, vida: 1 });
    });
};

window.ressurreicoesSagradas = [];
window.criarAnimacaoRessurreicaoAutomatica = function(alvoId, x, y, healerId) {
    window.ressurreicoesSagradas.push({
        alvoId: alvoId,
        healerId: healerId,
        x: x,
        y: y,
        tempo: 0,
        vida: 220,
        ondas: [],
        particulas: particulasSagradas(x, y, 80),
        runas: Array.from({ length: 10 }, function(_, i) { return { ang: i * Math.PI * 0.2, fase: Math.random() * 6 }; })
    });
};

function desenharRunaSagrada(ctx, x, y, ang, escala, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff1a8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-5 * escala, 4 * escala);
    ctx.lineTo(0, -5 * escala);
    ctx.lineTo(5 * escala, 4 * escala);
    ctx.moveTo(-3 * escala, 0);
    ctx.lineTo(3 * escala, 0);
    ctx.moveTo(0, -5 * escala);
    ctx.lineTo(0, 5 * escala);
    ctx.stroke();
    ctx.restore();
}

// Efeito da Cura Divina — Círculo DIVINO otimizado para 60 FPS
window.__curandeiroVFXCache = window.__curandeiroVFXCache || {};

function gerarSpriteCruzDivina() {
    if (window.__curandeiroVFXCache.cruz) return window.__curandeiroVFXCache.cruz;
    let c = criarCanvasOffscreen(24, 24);
    let g = c.getContext('2d');
    g.clearRect(0, 0, 24, 24);
    // Halo pré-renderizado: custo alto ocorre uma única vez.
    let halo = g.createRadialGradient(12, 12, 1, 12, 12, 12);
    halo.addColorStop(0, 'rgba(255,255,245,0.9)');
    halo.addColorStop(0.38, 'rgba(255,224,110,0.35)');
    halo.addColorStop(1, 'rgba(255,210,70,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, 24, 24);
    g.strokeStyle = '#fffdf0';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(12, 4); g.lineTo(12, 20);
    g.moveTo(6.5, 9); g.lineTo(17.5, 9);
    g.stroke();
    g.strokeStyle = '#ffd75c';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(12, 5.5); g.lineTo(12, 18.5);
    g.moveTo(7.5, 9); g.lineTo(16.5, 9);
    g.stroke();
    window.__curandeiroVFXCache.cruz = c;
    return c;
}

window.criarAnimacaoCuraDivina = function(x, y, valor) {
    let cruzes = [];
    // Reduzido de 58 para 28: mantém a sensação de "muitas" sem sobrecarregar o Canvas.
    for (let i = 0; i < 28; i++) {
        let ang = Math.random() * Math.PI * 2;
        cruzes.push({
            ang: ang,
            raio: 8 + Math.random() * 18,
            velocidade: 3.0 + Math.random() * 3.8,
            vida: 1,
            tamanho: 0.55 + Math.random() * 0.55,
            brilho: 0.65 + Math.random() * 0.35,
            yOff: (Math.random() - 0.5) * 5
        });
    }

    window.curasAtivas.push({
        x: x,
        y: y,
        raio: 12,
        raioMax: 125,
        alpha: 1.0,
        tempo: 0,
        cruzes: cruzes,
        ondas: [
            { raio: 10, alpha: 1.0, velocidade: 5.6, largura: 3 },
            { raio: 22, alpha: 0.85, velocidade: 3.8, largura: 1.6 }
        ],
        raios: Array.from({ length: 10 }, function(_, i) {
            return {
                ang: (i / 10) * Math.PI * 2,
                comprimento: 25 + Math.random() * 42,
                atraso: Math.random() * 16,
                brilho: 0.35 + Math.random() * 0.4
            };
        })
    });

    if (valor !== undefined && valor !== null && Array.isArray(window.floatingTexts)) {
        window.floatingTexts.push({
            x: x,
            y: y - 25,
            text: '+' + valor + ' HP ✨',
            color: '#2ecc71',
            alpha: 1.0
        });
    }
};

// Efeito do Julgamento Sagrado — Queda do Arcanjo e Voo Divino (otimizado)
function garantirCacheJulgamento() {
    let cache = window.__curandeiroVFXCache;
    if (!cache.beam) {
        let c = criarCanvasOffscreen(190, 450);
        let g = c.getContext('2d');
        let grad = g.createLinearGradient(0, 0, 0, 450);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.18, 'rgba(255,255,255,0.16)');
        grad.addColorStop(0.48, 'rgba(255,231,122,0.34)');
        grad.addColorStop(0.82, 'rgba(255,248,190,0.56)');
        grad.addColorStop(1, 'rgba(255,255,255,0.92)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 190, 450);
        cache.beam = c;
    }
    if (!cache.burst) {
        let c = criarCanvasOffscreen(280, 170);
        let g = c.getContext('2d');
        let grad = g.createRadialGradient(140, 85, 4, 140, 85, 140);
        grad.addColorStop(0, 'rgba(255,255,255,0.96)');
        grad.addColorStop(0.22, 'rgba(255,244,168,0.72)');
        grad.addColorStop(0.58, 'rgba(255,210,65,0.22)');
        grad.addColorStop(1, 'rgba(255,210,65,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 280, 170);
        cache.burst = c;
    }
    if (!cache.ring) {
        let c = criarCanvasOffscreen(260, 120);
        let g = c.getContext('2d');
        g.strokeStyle = 'rgba(255,249,205,0.95)';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(130, 60, 116, 42, 0, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = 'rgba(255,211,81,0.7)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(130, 60, 84, 30, 0, 0, Math.PI * 2);
        g.stroke();
        cache.ring = c;
    }
    if (!cache.arcanjo) {
        let c = criarCanvasOffscreen(128, 112);
        let g = c.getContext('2d');
        g.clearRect(0, 0, 128, 112);
        let halo = g.createRadialGradient(64, 31, 3, 64, 31, 34);
        halo.addColorStop(0, 'rgba(255,255,255,0.9)');
        halo.addColorStop(0.38, 'rgba(255,232,126,0.48)');
        halo.addColorStop(1, 'rgba(255,210,70,0)');
        g.fillStyle = halo;
        g.fillRect(24, 0, 80, 72);

        g.strokeStyle = '#fffdf0';
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.lineWidth = 3.2;
        for (let lado of [-1, 1]) {
            g.beginPath();
            g.moveTo(64 + lado * 8, 36);
            g.quadraticCurveTo(64 + lado * 32, 14, 64 + lado * 54, 34);
            g.quadraticCurveTo(64 + lado * 32, 42, 64 + lado * 12, 48);
            g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,0.96)';
        g.beginPath(); g.ellipse(64, 52, 9, 19, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,219,101,0.78)';
        g.beginPath(); g.moveTo(55, 57); g.lineTo(64, 98); g.lineTo(73, 57); g.closePath(); g.fill();
        g.fillStyle = '#fffef5';
        g.beginPath(); g.arc(64, 28, 7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fffde9';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(59, 50); g.lineTo(48, 60);
        g.moveTo(69, 50); g.lineTo(80, 60);
        g.stroke();
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(64, 10); g.lineTo(64, 35);
        g.moveTo(57, 18); g.lineTo(71, 18);
        g.stroke();
        cache.arcanjo = c;
    }
}

window.criarAnimacaoJulgamentoSagrado = function(x, y) {
    garantirCacheJulgamento();
    window.julgamentosAtivos.push({
        x: x,
        y: y,
        alturaRaio: 450,
        largura: 60,
        duracao: 92,
        alpha: 1.0,
        tempo: 0,
        fase: 'queda',
        impacto: 0,
        vooX: x,
        vooY: y,
        vooVX: -2.4,
        vooVY: -2.8,
        arcanjoEscala: 0.62,
        asas: 0,
        particulas: Array.from({ length: 16 }, function() {
            return {
                ang: Math.random() * Math.PI * 2,
                raio: 20 + Math.random() * 80,
                velocidade: 1.0 + Math.random() * 1.6,
                vida: 0.5 + Math.random() * 0.5,
                tamanho: 1.2 + Math.random() * 2.2
            };
        })
    });
};

function desenharArcanjoDivino(ctx, x, y, escala, alpha, batida, invertido) {
    let sprite = window.__curandeiroVFXCache.arcanjo;
    if (!sprite || alpha <= 0) return;
    // Um único transform por frame, em vez de dezenas de strokes + shadowBlur.
    ctx.save();
    if (invertido) {
        ctx.translate(x + sprite.width * escala, y - sprite.height * escala * 0.55);
        ctx.scale(-escala, escala);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height);
    } else {
        ctx.translate(x - sprite.width * escala * 0.5, y - sprite.height * escala * 0.55);
        ctx.scale(escala, escala);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height);
    }
    ctx.restore();
}

window.desenharEfeitosCurandeiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let agora = performance.now ? performance.now() : Date.now();

    // ==============================
    // AURAS EXISTENTES — versão leve
    // ==============================
    for (let i = window.aurasSagradas.length - 1; i >= 0; i--) {
        let aura = window.aurasSagradas[i];
        let delta = Math.max(1, (agora - (aura._lastTs || agora)) / 16.67);
        aura._lastTs = agora;
        if (!shouldRenderAura(aura)) continue;

        aura.tempo += delta;
        if (!aura.ativa || aura.tempo > 360) aura.alpha -= 0.025 * delta;
        else aura.alpha = Math.min(1, aura.alpha + 0.035 * delta);
        aura.raio += (aura.raioMax - aura.raio) * 0.06 * delta;

        if (aura.tempo % 42 < delta && aura.ondas.length < 3) {
            aura.ondas.push({ raio: 18, alpha: 0.68 });
        }

        let base = prepararBaseAura(aura);
        if (base) {
            ctx.globalAlpha = aura.alpha;
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(base.canvas, aura.x - base.width / 2, aura.y - base.height / 2, base.width, base.height);
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = aura.alpha * 0.08;
        ctx.fillStyle = '#ffe66f';
        ctx.beginPath();
        ctx.ellipse(aura.x, aura.y, aura.raio, aura.raio * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        let runeSprite = gerarSpriteRunaAura();
        for (let r = 0; r < aura.runas.length; r += 2) {
            let runa = aura.runas[r];
            let ang = runa.ang + aura.tempo * 0.002;
            let rx = aura.x + Math.cos(ang) * aura.raio * 0.72;
            let ry = aura.y + Math.sin(ang) * aura.raio * 0.38;
            ctx.globalAlpha = aura.alpha * 0.26;
            ctx.drawImage(runeSprite, rx - 14, ry - 14, 28, 28);
        }

        for (let w = aura.ondas.length - 1; w >= 0; w--) {
            let onda = aura.ondas[w];
            onda.raio += 3.2 * delta;
            onda.alpha -= 0.025 * delta;
            ctx.globalAlpha = Math.max(0, onda.alpha) * aura.alpha;
            ctx.strokeStyle = w % 2 ? '#fff8c7' : '#f4cf5e';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.ellipse(aura.x, aura.y, onda.raio, onda.raio * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            if (onda.alpha <= 0) aura.ondas.splice(w, 1);
        }

        if (aura.curas && aura.curas.length) {
            ctx.strokeStyle = '#fff1a1';
            ctx.lineWidth = 1.3;
            for (let c = aura.curas.length - 1; c >= 0; c--) {
                let cura = aura.curas[c];
                cura.vida -= 0.08 * delta;
                let t = 1 - cura.vida;
                let px = cura.x + (cura.tx - cura.x) * t;
                let py = cura.y + (cura.ty - cura.y) * t;
                ctx.globalAlpha = Math.max(0, cura.vida);
                ctx.beginPath();
                ctx.moveTo(cura.x, cura.y);
                ctx.lineTo(px, py);
                ctx.stroke();
                if (cura.vida <= 0) aura.curas.splice(c, 1);
            }
        }

        let particleSprite = gerarSpriteParticulaAura();
        ctx.globalCompositeOperation = 'lighter';
        for (let p = 0; p < aura.particulas.length; p += 2) {
            let particula = aura.particulas[p];
            particula.ang += particula.velocidade * delta * 24;
            particula.vida -= 0.006 * delta;
            if (particula.vida <= 0) resetarParticulaAura(particula, aura.x, aura.y);
            let px = aura.x + Math.cos(particula.ang) * particula.raio;
            let py = aura.y + Math.sin(particula.ang) * particula.raio * 0.52 - (1 - particula.vida) * 10;
            ctx.globalAlpha = Math.max(0, particula.vida * aura.alpha * 0.65);
            let size = particula.tamanho * 2.2;
            ctx.drawImage(particleSprite, px - size * 0.5, py - size * 0.5, size, size);
        }

        if (aura.alpha <= 0) window.aurasSagradas.splice(i, 1);
    }

    // ==============================
    // RESSURREIÇÕES — mantém aspecto sagrado, reduzindo custo
    // ==============================
    for (let i = window.ressurreicoesSagradas.length - 1; i >= 0; i--) {
        let res = window.ressurreicoesSagradas[i];
        res.tempo++;
        res.vida--;
        if (res.tempo % 34 === 0 && res.ondas.length < 3) res.ondas.push({ raio: 18, alpha: 0.78 });

        let brilho = Math.min(1, res.tempo / 55) * Math.min(1, res.vida / 35);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.32 * brilho;
        ctx.fillStyle = '#ffe66f';
        ctx.beginPath();
        ctx.arc(res.x, res.y, 62, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = brilho * 0.55;
        ctx.strokeStyle = '#fff6bf';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(res.x, res.y, 60, 24, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (let p = 0; p < res.particulas.length; p += 3) {
            let part = res.particulas[p];
            part.ang += part.velocidade * 2;
            part.vida -= 0.009;
            let px = res.x + Math.cos(part.ang) * part.raio;
            let py = res.y + Math.sin(part.ang) * part.raio * 0.48 - (1 - part.vida) * 28;
            ctx.globalAlpha = Math.max(0, part.vida) * brilho;
            ctx.fillStyle = p % 2 ? '#ffffff' : '#ffd75e';
            ctx.fillRect(px, py, Math.max(1, part.tamanho), Math.max(1, part.tamanho));
        }
        if (res.vida <= 0) window.ressurreicoesSagradas.splice(i, 1);
    }

    // ==============================
    // SKILL 1 — CÍRCULO DIVINO
    // ==============================
    let cruzSprite = gerarSpriteCruzDivina();
    for (let i = window.curasAtivas.length - 1; i >= 0; i--) {
        let c = window.curasAtivas[i];
        c.tempo += 1;
        c.raio += (c.raioMax - c.raio) * 0.08;
        c.alpha -= 0.022;
        if (c.alpha <= 0) {
            window.curasAtivas.splice(i, 1);
            continue;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Piso divino sem gradiente por frame.
        ctx.globalAlpha = 0.10 * c.alpha;
        ctx.fillStyle = '#ffe36f';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.raio, c.raio * 0.43, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3 anéis simples.
        for (let r = 0; r < 3; r++) {
            let rr = c.raio * (0.48 + r * 0.19);
            ctx.globalAlpha = c.alpha * (0.24 - r * 0.045);
            ctx.strokeStyle = r === 1 ? '#fffde7' : '#f6cf57';
            ctx.lineWidth = r === 1 ? 1.8 : 1;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Ondas de expansão.
        for (let w = c.ondas.length - 1; w >= 0; w--) {
            let onda = c.ondas[w];
            onda.raio += onda.velocidade;
            onda.alpha -= 0.030;
            ctx.globalAlpha = Math.max(0, onda.alpha) * c.alpha;
            ctx.strokeStyle = w === 0 ? '#ffffff' : '#ffd95e';
            ctx.lineWidth = onda.largura;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, onda.raio, onda.raio * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            if (onda.alpha <= 0) c.ondas.splice(w, 1);
        }

        // Feixes radiais mais leves.
        for (let r = 0; r < c.raios.length; r++) {
            let raio = c.raios[r];
            let energia = Math.max(0, Math.min(1, (c.tempo - raio.atraso) / 20));
            ctx.globalAlpha = c.alpha * energia * raio.brilho * 0.65;
            ctx.strokeStyle = r % 3 === 0 ? '#ffffff' : '#ffe58a';
            ctx.lineWidth = 1;
            let sx = c.x + Math.cos(raio.ang) * 12;
            let sy = c.y + Math.sin(raio.ang) * 4;
            let ex = c.x + Math.cos(raio.ang) * (12 + raio.comprimento);
            let ey = c.y + Math.sin(raio.ang) * (4 + raio.comprimento * 0.34);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // Mini-cruzes: drawImage sem shadow/transform individual.
        for (let k = c.cruzes.length - 1; k >= 0; k--) {
            let cruz = c.cruzes[k];
            cruz.raio += cruz.velocidade;
            cruz.yOff -= 0.20;
            cruz.vida -= 0.020;
            let px = c.x + Math.cos(cruz.ang) * cruz.raio;
            let py = c.y + Math.sin(cruz.ang) * cruz.raio * 0.42 + cruz.yOff;
            ctx.globalAlpha = Math.max(0, cruz.vida) * cruz.brilho * c.alpha;
            let size = 18 * cruz.tamanho;
            ctx.drawImage(cruzSprite, px - size * 0.5, py - size * 0.5, size, size);

            if (cruz.vida <= 0 || cruz.raio > c.raioMax * 1.08) {
                cruz.ang = Math.random() * Math.PI * 2;
                cruz.raio = 8 + Math.random() * 14;
                cruz.velocidade = 3.0 + Math.random() * 3.8;
                cruz.tamanho = 0.55 + Math.random() * 0.55;
                cruz.vida = 0.92 + Math.random() * 0.08;
                cruz.brilho = 0.65 + Math.random() * 0.35;
                cruz.yOff = 0;
            }
        }

        // Pequenas faíscas sem arcs caros.
        for (let p = 0; p < 8; p++) {
            let ang = c.tempo * 0.035 + p * 0.785;
            let rr = 12 + ((c.tempo * 2 + p * 19) % Math.max(20, c.raio));
            ctx.globalAlpha = c.alpha * 0.38;
            ctx.fillStyle = p % 2 ? '#fff7bc' : '#ffffff';
            ctx.fillRect(c.x + Math.cos(ang) * rr, c.y + Math.sin(ang) * rr * 0.42, 1.5, 1.5);
        }
    }

    // ==============================
    // SKILL 2 — ARCANJO DIVINO
    // ==============================
    garantirCacheJulgamento();
    let cache = window.__curandeiroVFXCache;
    for (let i = window.julgamentosAtivos.length - 1; i >= 0; i--) {
        let j = window.julgamentosAtivos[i];
        j.tempo++;

        if (j.tempo < 34) {
            j.fase = 'queda';
            j.alpha = Math.min(1, j.tempo / 7);
            j.impacto = 0;
        } else if (j.tempo < 48) {
            j.fase = 'impacto';
            j.alpha = 1 - (j.tempo - 34) / 90;
            j.impacto = Math.min(1, (j.tempo - 34) / 14);
        } else {
            j.fase = 'voo';
            let t = (j.tempo - 48) / 44;
            j.alpha = Math.max(0, 1 - t);
            j.vooX += j.vooVX * (1 + t * 1.8);
            j.vooY += j.vooVY * (1 + t * 1.25);
            j.arcanjoEscala = 0.62 - t * 0.18;
        }

        if (j.tempo >= j.duracao || j.alpha <= 0) {
            window.julgamentosAtivos.splice(i, 1);
            continue;
        }

        ctx.globalCompositeOperation = 'lighter';

        if (j.fase === 'queda') {
            ctx.globalAlpha = j.alpha * 0.72;
            ctx.drawImage(cache.beam, j.x - 95, j.y - j.alturaRaio);

            // Linhas rápidas de luz, poucas e curtas.
            ctx.globalAlpha = j.alpha * 0.30;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            for (let p = 0; p < 8; p++) {
                let yy = j.y - j.alturaRaio + ((j.tempo * 10 + p * 57) % 400);
                let xx = j.x + ((p & 1) ? 16 : -16);
                ctx.beginPath();
                ctx.moveTo(xx, yy);
                ctx.lineTo(xx, yy + 12 + (p % 3) * 5);
                ctx.stroke();
            }

            let tQueda = Math.min(1, j.tempo / 34);
            let ay = j.y - j.alturaRaio * (1 - tQueda) + 18;
            desenharArcanjoDivino(ctx, j.x, ay, j.arcanjoEscala + tQueda * 0.08, j.alpha, j.tempo * 0.45, false);

            ctx.globalAlpha = j.alpha * 0.24;
            ctx.strokeStyle = '#ffe581';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(j.x, j.y, 30 + j.tempo * 0.9, 12 + j.tempo * 0.28, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (j.fase === 'impacto') {
            let p = j.impacto;
            ctx.globalAlpha = j.alpha * 0.95;
            ctx.drawImage(cache.burst, j.x - 140 * p - 20, j.y - 85 * p - 10, 280 * p + 40, 170 * p + 20);

            for (let r = 0; r < 3; r++) {
                let rr = 20 + p * (40 + r * 34);
                ctx.globalAlpha = j.alpha * (0.66 - r * 0.14);
                ctx.strokeStyle = r % 2 ? '#fffde5' : '#ffd85b';
                ctx.lineWidth = r === 0 ? 2.4 : 1.1;
                ctx.beginPath();
                ctx.ellipse(j.x, j.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalAlpha = j.alpha * 0.55;
            ctx.drawImage(cache.ring, j.x - 130, j.y - 60, 260, 120);
            desenharArcanjoDivino(ctx, j.x, j.y - 8 - p * 7, 0.72 + p * 0.05, j.alpha * 0.88, j.tempo * 0.65, false);
        } else {
            // Voo: rastro enxuto + poucas cruzes.
            let t = (j.tempo - 48) / 44;
            ctx.globalAlpha = j.alpha * 0.30;
            ctx.strokeStyle = '#fff6bd';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(j.x, j.y);
            ctx.quadraticCurveTo((j.x + j.vooX) * 0.5, (j.y + j.vooY) * 0.5 - 28, j.vooX, j.vooY);
            ctx.stroke();

            for (let p = 0; p < 10; p++) {
                let tx = j.vooX - j.vooVX * p * 4.0;
                let ty = j.vooY - j.vooVY * p * 3.0 + Math.sin(p * 1.7 + j.tempo * 0.1) * 5;
                ctx.globalAlpha = j.alpha * (1 - p / 10) * 0.65;
                ctx.fillStyle = p % 2 ? '#ffe48a' : '#ffffff';
                ctx.fillRect(tx, ty, 2 + (p % 2), 2 + (p % 2));
                if (p % 3 === 0) ctx.drawImage(cruzSprite, tx - 6, ty - 6, 12, 12);
            }

            desenharArcanjoDivino(ctx, j.vooX, j.vooY, Math.max(0.32, j.arcanjoEscala), j.alpha, j.tempo * 0.58, true);
        }

        // Partículas do Julgamento, muito reduzidas.
        for (let p = 0; p < j.particulas.length; p += 2) {
            let part = j.particulas[p];
            part.ang += 0.018 * (1 + p % 3);
            part.raio += 0.8;
            part.vida -= 0.010;
            if (part.vida <= 0 || part.raio > 130) {
                part.ang = Math.random() * Math.PI * 2;
                part.raio = 18 + Math.random() * 35;
                part.vida = 0.8 + Math.random() * 0.2;
            }
            let px = j.x + Math.cos(part.ang) * part.raio;
            let py = j.y + Math.sin(part.ang) * part.raio * 0.42;
            ctx.globalAlpha = j.alpha * Math.max(0, part.vida) * 0.55;
            ctx.fillStyle = p % 3 === 0 ? '#ffffff' : '#ffd95e';
            ctx.fillRect(px, py, 1.5, 1.5);
        }
    }

    // Restaurar estado principal do Canvas para não afetar outros renderizadores.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
};
