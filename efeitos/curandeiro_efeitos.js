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

// Efeito da Cura Divina
window.criarAnimacaoCuraDivina = function(x, y, valor) {
    let particulasLuz = [];
    for (let i = 0; i < 20; i++) {
        particulasLuz.push({
            x: x + (Math.random() * 40 - 20),
            y: y + (Math.random() * 20 - 5),
            vy: Math.random() * 1.5 + 1.2,
            vida: 1.0,
            tamanho: Math.random() * 3 + 2
        });
    }

    window.curasAtivas.push({
        x: x,
        y: y,
        raio: 15,
        raioMax: 70,
        alpha: 1.0,
        particulas: particulasLuz
    });

    if (valor !== undefined && valor !== null) {
        window.floatingTexts.push({ x: x, y: y - 25, text: "+" + valor + " HP ✨", color: "#2ecc71", alpha: 1.0 });
    }
};

// Efeito do Julgamento Sagrado (Coluna de Luz)
window.criarAnimacaoJulgamentoSagrado = function(x, y) {
    window.julgamentosAtivos.push({
        x: x,
        y: y,
        alturaRaio: 450,
        largura: 60,
        duracao: 35,
        alpha: 1.0
    });
};

window.desenharEfeitosCurandeiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let agora = performance.now ? performance.now() : Date.now();

    for (let i = window.aurasSagradas.length - 1; i >= 0; i--) {
        let aura = window.aurasSagradas[i];
        let delta = Math.max(1, (agora - (aura._lastTs || agora)) / 16.67);
        aura._lastTs = agora;

        if (!shouldRenderAura(aura)) {
            continue;
        }

        aura.tempo += delta;
        if (!aura.ativa || aura.tempo > 360) aura.alpha -= 0.025 * delta;
        else aura.alpha = Math.min(1, aura.alpha + 0.035 * delta);
        aura.raio += (aura.raioMax - aura.raio) * 0.06 * delta;

        if (aura.tempo % 32 < delta && aura.ondas.length < 4) {
            aura.ondas.push({ raio: 18, alpha: 0.72 });
        }

        let base = prepararBaseAura(aura);
        if (base) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            let drawX = aura.x - base.width / 2;
            let drawY = aura.y - base.height / 2;
            ctx.drawImage(base.canvas, drawX, drawY, base.width, base.height);
            ctx.restore();
        }

        let pulso = 1 + Math.sin(aura.tempo * 0.055) * 0.045;
        let haloRadius = aura.raio * 1.08;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.ellipse(aura.x, aura.y, haloRadius * pulso, haloRadius * 0.52 * pulso, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 230, 110, ' + (0.08 * aura.alpha) + ')';
        ctx.fill();
        ctx.restore();

        let runeSprite = gerarSpriteRunaAura();
        let particleSprite = gerarSpriteParticulaAura();
        const particleSize = 18;

        for (let r = 0; r < aura.runas.length; r++) {
            let runa = aura.runas[r];
            let ang = runa.ang + aura.tempo * 0.002 * (runa.fase > 3 ? -1 : 1);
            let rx = aura.x + Math.cos(ang) * aura.raio * 0.72;
            let ry = aura.y + Math.sin(ang) * aura.raio * 0.38;
            let brilho = 0.35 + Math.sin(aura.tempo * 0.08 + runa.fase) * 0.18;
            ctx.save();
            ctx.globalAlpha = aura.alpha * brilho;
            ctx.translate(rx, ry);
            ctx.rotate(ang + Math.PI / 2);
            ctx.drawImage(runeSprite, -18 * runa.escala, -18 * runa.escala, 36 * runa.escala, 36 * runa.escala);
            ctx.restore();
        }

        for (let w = aura.ondas.length - 1; w >= 0; w--) {
            let onda = aura.ondas[w];
            onda.raio += 3.2 * delta;
            onda.alpha -= 0.025 * delta;
            ctx.save();
            ctx.globalAlpha = Math.max(0, onda.alpha) * aura.alpha;
            ctx.strokeStyle = (w % 2 ? '#fff8c7' : '#f4cf5e');
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(aura.x, aura.y, onda.raio, onda.raio * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            if (onda.alpha <= 0) aura.ondas.splice(w, 1);
        }

        for (let c = aura.curas.length - 1; c >= 0; c--) {
            let cura = aura.curas[c];
            cura.vida -= 0.08 * delta;
            let t = 1 - cura.vida;
            let px = cura.x + (cura.tx - cura.x) * t;
            let py = cura.y + (cura.ty - cura.y) * t;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.max(0, cura.vida);
            ctx.strokeStyle = '#fff1a1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cura.x, cura.y);
            ctx.quadraticCurveTo((cura.x + cura.tx) / 2, cura.y - 28, px, py);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (cura.vida <= 0) aura.curas.splice(c, 1);
        }

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let p = 0; p < aura.particulas.length; p++) {
            let particula = aura.particulas[p];
            particula.ang += particula.velocidade * delta * 32;
            particula.raio += Math.sin(aura.tempo * 0.02 + particula.fase) * 0.12 * delta;
            particula.vida -= 0.006 * delta;
            if (particula.vida <= 0) {
                resetarParticulaAura(particula, aura.x, aura.y);
            }
            let px = aura.x + Math.cos(particula.ang) * particula.raio;
            let py = aura.y + Math.sin(particula.ang) * particula.raio * 0.52 - (1 - particula.vida) * 12;
            let alpha = Math.max(0, particula.vida * aura.alpha * 0.8);
            let size = particula.tamanho * 2.6;
            ctx.globalAlpha = alpha;
            ctx.drawImage(particleSprite, px - size * 0.5, py - size * 0.5, size, size);
        }
        ctx.restore();

        if (aura.alpha <= 0) window.aurasSagradas.splice(i, 1);
    }

    for (let i = window.ressurreicoesSagradas.length - 1; i >= 0; i--) {
        let res = window.ressurreicoesSagradas[i];
        res.tempo++;
        res.vida--;
        if (res.tempo % 28 === 0 && res.ondas.length < 4) res.ondas.push({ raio: 18, alpha: 0.85 });

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let brilho = Math.min(1, res.tempo / 55) * Math.min(1, res.vida / 35);
        let halo = ctx.createRadialGradient(res.x, res.y, 2, res.x, res.y, 75);
        halo.addColorStop(0, 'rgba(255,255,220,' + (0.55 * brilho) + ')');
        halo.addColorStop(0.5, 'rgba(255,210,75,' + (0.22 * brilho) + ')');
        halo.addColorStop(1, 'rgba(255,210,75,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(res.x, res.y, 75, 0, Math.PI * 2);
        ctx.fill();
        [38, 58, 82].forEach(function(raio, indice) {
            ctx.save();
            ctx.globalAlpha = brilho * (0.65 - indice * 0.12);
            ctx.strokeStyle = indice === 1 ? '#fff6bf' : '#e5b83f';
            ctx.lineWidth = 1.5;
            ctx.setLineDash(indice === 2 ? [4, 8] : []);
            ctx.beginPath();
            ctx.ellipse(res.x, res.y, raio, raio * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
        res.runas.forEach(function(runa) {
            let ang = runa.ang + res.tempo * 0.006;
            desenharRunaSagrada(ctx, res.x + Math.cos(ang) * 54, res.y + Math.sin(ang) * 25, ang, 0.8, brilho * 0.6);
        });
        res.ondas.forEach(function(onda) {
            onda.raio += 3;
            onda.alpha -= 0.025;
            ctx.globalAlpha = Math.max(0, onda.alpha) * brilho;
            ctx.strokeStyle = '#fff8c9';
            ctx.beginPath();
            ctx.ellipse(res.x, res.y, onda.raio, onda.raio * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
        });
        res.ondas = res.ondas.filter(function(onda) { return onda.alpha > 0; });
        ctx.restore();

        res.particulas.forEach(function(p) {
            p.ang += p.velocidade * 2;
            p.vida -= 0.009;
            let px = res.x + Math.cos(p.ang) * p.raio;
            let py = res.y + Math.sin(p.ang) * p.raio * 0.48 - (1 - p.vida) * 28;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, p.vida) * brilho;
            ctx.fillStyle = p.tipo === 'estrela' ? '#ffffff' : '#ffd75e';
            ctx.beginPath();
            ctx.arc(px, py, p.tamanho, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        if (res.vida <= 0) window.ressurreicoesSagradas.splice(i, 1);
    }

    // Desenha Efeito de Cura
    for (let i = window.curasAtivas.length - 1; i >= 0; i--) {
        let c = window.curasAtivas[i];
        c.raio += 2.0;
        c.alpha -= 0.035;

        if (c.alpha <= 0) {
            window.curasAtivas.splice(i, 1);
        } else {
            ctx.save();
            ctx.strokeStyle = "rgba(46, 204, 113, " + c.alpha + ")";
            ctx.lineWidth = 4;
            ctx.shadowColor = "#2ecc71";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.raio, 0, Math.PI * 2);
            ctx.stroke();

            // Partículas flutuando para o céu
            for (let p of c.particulas) {
                p.y -= p.vy;
                p.vida -= 0.04;
                ctx.fillStyle = "rgba(241, 196, 15, " + Math.max(0, p.vida) + ")";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // Desenha Coluna de Julgamento Celeste
    for (let i = window.julgamentosAtivos.length - 1; i >= 0; i--) {
        let j = window.julgamentosAtivos[i];
        j.duracao--;
        j.alpha = j.duracao / 35;

        if (j.duracao <= 0) {
            window.julgamentosAtivos.splice(i, 1);
        } else {
            ctx.save();
            // Coluna de luz caindo do topo da tela
            let grad = ctx.createLinearGradient(j.x, j.y - j.alturaRaio, j.x, j.y);
            grad.addColorStop(0, "rgba(255, 255, 255, 0)");
            grad.addColorStop(0.3, "rgba(241, 196, 15, " + (j.alpha * 0.7) + ")");
            grad.addColorStop(1, "rgba(255, 255, 255, " + j.alpha + ")");

            ctx.fillStyle = grad;
            ctx.shadowColor = "#f1c40f";
            ctx.shadowBlur = 20;
            ctx.fillRect(j.x - j.largura / 2, j.y - j.alturaRaio, j.largura, j.alturaRaio);

            // Círculo sagrado no ponto de impacto no chão
            ctx.fillStyle = "rgba(241, 196, 15, " + (j.alpha * 0.4) + ")";
            ctx.beginPath();
            ctx.ellipse(j.x, j.y, 45, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, " + j.alpha + ")";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.restore();
        }
    }
};
