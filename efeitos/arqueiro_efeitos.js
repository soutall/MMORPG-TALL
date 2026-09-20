// efeitos/arqueiro_efeitos.js - Renderização de magias e projéteis do Arqueiro
window.chuvasFlechas = [];
window.flechasPerfurantes = [];
window.rajadasFlechas = [];
window.flechasBasicas = [];
window.cargasRajada = {};
window._cargasRajadaIds = window._cargasRajadaIds || [];

var ARQUEIRO_PARTICLE_POOL = window._arqueiroParticlePool || (window._arqueiroParticlePool = []);
var ARQUEIRO_PARTICLE_LIST_POOL = window._arqueiroParticleListPool || (window._arqueiroParticleListPool = []);
var ARQUEIRO_ARROW_POOL = window._arqueiroArrowPool || (window._arqueiroArrowPool = []);
var ARQUEIRO_RAJADA_POOL = window._arqueiroRajadaPool || (window._arqueiroRajadaPool = []);
var ARQUEIRO_VFX_SPRITES = window._arqueiroVfxSprites || (window._arqueiroVfxSprites = {});
var ARQUEIRO_TRAIL_SIZE = 8;

function obterListaParticulasRajada() {
    return ARQUEIRO_PARTICLE_LIST_POOL.pop() || [];
}

function obterParticulaRajada() {
    return ARQUEIRO_PARTICLE_POOL.pop() || {};
}

function criarParticulasRajada(quantidade, origem, cor) {
    let particulas = obterListaParticulasRajada();
    particulas.length = 0;
    for (let i = 0; i < quantidade; i++) {
        let ang = Math.random() * Math.PI * 2;
        let p = obterParticulaRajada();
        p.x = origem.x;
        p.y = origem.y;
        p.vx = Math.cos(ang) * (0.3 + Math.random() * 1.5);
        p.vy = Math.sin(ang) * (0.3 + Math.random() * 1.5);
        p.vida = 18 + Math.random() * 42;
        p.tamanho = 1 + Math.random() * 2.5;
        p.cor = cor || (Math.random() > 0.5 ? '#c8ff75' : '#ffd86a');
        p.folha = Math.random() > 0.72;
        particulas.push(p);
    }
    return particulas;
}

function liberarParticulasRajada(particulas) {
    if (!Array.isArray(particulas)) return;
    for (let i = 0; i < particulas.length; i++) ARQUEIRO_PARTICLE_POOL.push(particulas[i]);
    particulas.length = 0;
    ARQUEIRO_PARTICLE_LIST_POOL.push(particulas);
}

function obterFlechaRajada() {
    let flecha = ARQUEIRO_ARROW_POOL.pop() || {
        trilhaX: new Float32Array(ARQUEIRO_TRAIL_SIZE),
        trilhaY: new Float32Array(ARQUEIRO_TRAIL_SIZE),
        trilhaVida: new Float32Array(ARQUEIRO_TRAIL_SIZE)
    };
    flecha.distancia = 0;
    flecha.lateral = 0;
    flecha.velocidade = 0;
    flecha.comprimento = 0;
    flecha.espessura = 0;
    flecha.angulo = 0;
    flecha.trilhaCabeca = 0;
    flecha.trilhaQuantidade = 0;
    return flecha;
}

function liberarRajadaFlechas(rajada) {
    if (!rajada) return;
    liberarParticulasRajada(rajada.particulas);
    if (Array.isArray(rajada.flechas)) {
        for (let i = 0; i < rajada.flechas.length; i++) ARQUEIRO_ARROW_POOL.push(rajada.flechas[i]);
        rajada.flechas.length = 0;
    }
    rajada.particulas = null;
    ARQUEIRO_RAJADA_POOL.push(rajada);
}

function criarSpriteCanvasRajada(largura, altura, desenhar) {
    if (typeof document === 'undefined') return null;
    let canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    desenhar(canvas.getContext('2d'), largura, altura);
    return canvas;
}

function obterSpritesRajada() {
    if (ARQUEIRO_VFX_SPRITES.flecha) return ARQUEIRO_VFX_SPRITES;

    ARQUEIRO_VFX_SPRITES.flecha = criarSpriteCanvasRajada(128, 32, function(ctx) {
        ctx.save();
        ctx.translate(4, 16);
        ctx.shadowColor = '#caff70';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#62dd4e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(92, 0);
        ctx.stroke();
        ctx.fillStyle = '#fff4ba';
        ctx.beginPath();
        ctx.moveTo(108, 0);
        ctx.lineTo(91, -7);
        ctx.lineTo(94, 0);
        ctx.lineTo(91, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d69b35';
        ctx.fillRect(0, -3, 12, 6);
        ctx.restore();
    });

    ARQUEIRO_VFX_SPRITES.particula = criarSpriteCanvasRajada(16, 16, function(ctx) {
        ctx.shadowColor = '#b8ff62';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#b8ff62';
        ctx.fillRect(5, 5, 6, 6);
    });

    ARQUEIRO_VFX_SPRITES.folha = criarSpriteCanvasRajada(20, 20, function(ctx) {
        ctx.save();
        ctx.translate(10, 10);
        ctx.rotate(-0.25);
        ctx.shadowColor = '#c8ff75';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#c8ff75';
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(0, -4);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });

    ARQUEIRO_VFX_SPRITES.aura = criarSpriteCanvasRajada(128, 128, function(ctx) {
        let aura = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
        aura.addColorStop(0, 'rgba(255, 245, 170, 0.45)');
        aura.addColorStop(0.45, 'rgba(177, 255, 91, 0.22)');
        aura.addColorStop(1, 'rgba(177, 255, 91, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, 128, 128);
    });
    return ARQUEIRO_VFX_SPRITES;
}

function rajadaEstaVisivel(x, y, raio) {
    let canvas = window.canvas;
    if (!canvas || window.camX === undefined || window.camY === undefined) return true;
    let largura = canvas.width / (window.ZOOM_CAMERA || 1);
    let altura = canvas.height / (window.ZOOM_CAMERA || 1);
    return x + raio >= window.camX && x - raio <= window.camX + largura &&
        y + raio >= window.camY && y - raio <= window.camY + altura;
}

window.iniciarCarregamentoRajada = function(id, x, y, angulo) {
    let chave = id || 'local';
    let cargaAnterior = window.cargasRajada[chave];
    if (cargaAnterior) liberarParticulasRajada(cargaAnterior.particulas);
    let carga = {
        x: x,
        y: y,
        angulo: angulo || 0,
        progresso: 0,
        particulas: criarParticulasRajada(34, { x: x, y: y }, '#c8ff75'),
        vida: 1,
        flash: 0
    };
    window.cargasRajada[chave] = carga;
    if (window._cargasRajadaIds.indexOf(chave) === -1) window._cargasRajadaIds.push(chave);
};

window.atualizarCarregamentoRajada = function(id, x, y, progresso, angulo) {
    let chave = id || 'local';
    let carga = window.cargasRajada[chave];
    if (!carga) window.iniciarCarregamentoRajada(chave, x, y, angulo);
    carga = window.cargasRajada[chave];
    carga.x = x;
    carga.y = y;
    carga.angulo = angulo === undefined ? carga.angulo : angulo;
    carga.progresso = Math.max(0, Math.min(1, Number(progresso) || 0));
};

window.cancelarCarregamentoRajada = function(id) {
    let carga = window.cargasRajada[id || 'local'];
    if (carga) carga.vida = 0.01;
};

window.criarAnimacaoRajadaFlechas = function(x, y, angulo) {
    let quantidade = 38;
    let flechas = [];
    for (let n = 0; n < quantidade; n++) {
        let progressoLateral = (n / (quantidade - 1)) * 2 - 1;
        let flecha = obterFlechaRajada();
        flecha.lateral = progressoLateral * (0.4 + Math.random() * 0.55);
        flecha.velocidade = 15 + Math.random() * 4;
        flecha.comprimento = 18 + Math.random() * 7;
        flecha.espessura = 1.4 + Math.random() * 1.2;
        flecha.angulo = progressoLateral * 0.18 + (Math.random() - 0.5) * 0.08;
        flechas.push(flecha);
    }
    let rajada = ARQUEIRO_RAJADA_POOL.pop() || {};
    rajada.x = x;
    rajada.y = y;
    rajada.angulo = angulo || 0;
    rajada.vida = 60;
    rajada.tempo = 0;
    rajada.flechas = flechas;
    rajada.ondas = [0, 42, 84, 126];
    rajada.particulas = criarParticulasRajada(110, { x: x, y: y }, '#b8ff62');
    rajada.particulasVivas = rajada.particulas.length;
    rajada.flash = 10;
    window.rajadasFlechas.push(rajada);
};

window.finalizarRajadaVisual = function(id) {
    let carga = window.cargasRajada[id || 'local'];
    if (carga) {
        carga.vida = 0;
        carga.particulas = Array.isArray(carga.particulas) ? carga.particulas : [];
    }
};

window.criarAnimacaoFlechaBasica = function(x, y, vx, vy) {
    window.flechasBasicas.push({ x: x, y: y, vx: vx, vy: vy, vida: 18 });
};

window.criarAnimacaoChuvaFlechas = function(x, y, duracaoMs) {
    let flechas = [];
    for (let i = 0; i < 28; i++) {
        flechas.push({
            x: x + (Math.random() * 110 - 55),
            y: y - 220 - (Math.random() * 120),
            targetY: y + (Math.random() * 60 - 30),
            velocidade: Math.random() * 4 + 11,
            caiu: false
        });
    }
    window.chuvasFlechas.push({
        x: x,
        y: y,
        duracao: 140,
        startTime: Date.now(),
        duracaoMs: Number.isFinite(duracaoMs) ? duracaoMs : Math.round(140 * (1000 / 60)),
        flechas: flechas
    });
    window.floatingTexts.push({ x: x, y: y - 35, text: "🏹 CHUVA DE FLECHAS!", color: "#1abc9c", alpha: 1.0 });
};

window.criarAnimacaoDisparoPerfurante = function(x, y, vx, vy, angulo) {
    window.flechasPerfurantes.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        angulo: angulo,
        vida: 40,
        rastro: []
    });
};

window.criarAnimacaoImpactoFlecha = function(x, y, stacks) {
    if (!window.floatingTexts) return;
    window.floatingTexts.push({ x: x, y: y - 20, text: "✦ " + (stacks || 1) + "x", color: "#00bcd4", alpha: 1.0 });
};

window.desenharEfeitosArqueiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;
    let frameScale = Number(window.dt) || 1;
    frameScale = Math.max(0.5, Math.min(3, frameScale));
    let particleDamping = Math.pow(0.985, frameScale);
    let sprites = obterSpritesRajada();
    let pulsoGlobal = 1 + Math.sin(Date.now() / 75) * 0.08;

    for (let cargaIndex = window._cargasRajadaIds.length - 1; cargaIndex >= 0; cargaIndex--) {
        let chave = window._cargasRajadaIds[cargaIndex];
        let carga = window.cargasRajada[chave];
        if (!carga || !Array.isArray(carga.particulas)) {
            delete window.cargasRajada[chave];
            window._cargasRajadaIds.splice(cargaIndex, 1);
            continue;
        }
        if (carga.vida <= 0) {
            carga.vida -= 0.08 * frameScale;
        } else {
            carga.vida = Math.min(1, carga.vida + 0.08 * frameScale);
        }
        let intensidade = Math.max(0.08, carga.progresso) * carga.vida;
        let cargaVisivel = rajadaEstaVisivel(carga.x, carga.y, 90);
        let particulasVivas = 0;

        if (cargaVisivel) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
        }
        for (let pIndex = 0; pIndex < carga.particulas.length; pIndex++) {
            let p = carga.particulas[pIndex];
            if (p.vida <= 0) {
                if (carga.vida > 0) {
                    p.x = carga.x;
                    p.y = carga.y;
                    p.vida = 18 + Math.random() * 38;
                } else {
                    continue;
                }
            }
            p.x += p.vx * frameScale;
            p.y += p.vy * frameScale;
            p.vx *= particleDamping;
            p.vy *= particleDamping;
            p.vida -= 0.8 * frameScale;
            particulasVivas++;

            if (cargaVisivel && p.vida > 0) {
                ctx.globalAlpha = Math.min(1, p.vida / 18) * intensidade;
                let particulaSprite = p.folha ? sprites.folha : sprites.particula;
                let tamanho = p.tamanho * 2.5;
                ctx.drawImage(particulaSprite, p.x - tamanho / 2, p.y - tamanho / 2, tamanho, tamanho);
            }
        }

        if (cargaVisivel) {
            let auraTamanho = (32 + intensidade * 30) * pulsoGlobal;
            ctx.globalAlpha = intensidade;
            ctx.drawImage(sprites.aura, carga.x - auraTamanho, carga.y - auraTamanho, auraTamanho * 2, auraTamanho * 2);

            ctx.save();
            ctx.translate(carga.x, carga.y);
            ctx.rotate(carga.angulo);
            ctx.strokeStyle = 'rgba(255, 222, 103, ' + (0.45 * intensidade) + ')';
            ctx.lineWidth = 2 + intensidade * 2;
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.quadraticCurveTo(22, -10 - intensidade * 12, 42, 0);
            ctx.moveTo(5, 0);
            ctx.quadraticCurveTo(22, 10 + intensidade * 12, 42, 0);
            ctx.stroke();
            ctx.restore();
        }

        if (carga.progresso >= 0.98 && carga.flash <= 0 && carga.vida > 0) carga.flash = 8;
        if (cargaVisivel && carga.flash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = carga.flash / 10;
            ctx.fillStyle = '#fff5bb';
            ctx.beginPath();
            ctx.arc(carga.x, carga.y, 8 + (10 - carga.flash) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        if (carga.flash > 0) carga.flash -= frameScale;
        if (carga.vida <= 0 && particulasVivas === 0) {
            liberarParticulasRajada(carga.particulas);
            delete window.cargasRajada[chave];
            window._cargasRajadaIds.splice(cargaIndex, 1);
        }
        if (cargaVisivel) ctx.restore();
    }

    for (let i = window.flechasBasicas.length - 1; i >= 0; i--) {
        let f = window.flechasBasicas[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vida--;
        let ang = Math.atan2(f.vy, f.vx);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(ang);
        ctx.strokeStyle = '#f5b041';
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 9;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(7, -4);
        ctx.lineTo(7, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (f.vida <= 0) window.flechasBasicas.splice(i, 1);
    }

    // Chuva de Flechas
    for (let i = window.chuvasFlechas.length - 1; i >= 0; i--) {
        let chuva = window.chuvasFlechas[i];
        chuva.duracao--;

        if (chuva.startTime && Date.now() - chuva.startTime >= chuva.duracaoMs) {
            window.chuvasFlechas.splice(i, 1);
            continue;
        }

        ctx.save();
        // Círculo no solo
        ctx.fillStyle = "rgba(26, 188, 156, 0.18)";
        ctx.beginPath();
        ctx.arc(chuva.x, chuva.y, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(46, 204, 113, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flechas caindo
        chuva.flechas.forEach(f => {
            if (!f.caiu) {
                f.y += f.velocidade;
                ctx.strokeStyle = "#f39c12";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(f.x, f.y);
                ctx.lineTo(f.x, f.y - 14);
                ctx.stroke();

                if (f.y >= f.targetY) {
                    f.caiu = true;
                }
            } else {
                ctx.fillStyle = "rgba(243, 156, 18, 0.4)";
                ctx.beginPath();
                ctx.arc(f.x, f.targetY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        if (chuva.duracao <= 0) {
            window.chuvasFlechas.splice(i, 1);
        }
    }

    // Disparo Perfurante
    for (let i = window.flechasPerfurantes.length - 1; i >= 0; i--) {
        let f = window.flechasPerfurantes[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vida--;

        f.rastro.push({ x: f.x, y: f.y, alpha: 1.0 });

        ctx.save();
        for (let r of f.rastro) {
            r.alpha -= 0.08;
            ctx.fillStyle = "rgba(26, 188, 156, " + r.alpha + ")";
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(f.x, f.y);
        ctx.rotate(f.angulo);
        ctx.fillStyle = "#1abc9c";
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 12;
        ctx.fillRect(-16, -2, 32, 4);
        ctx.restore();

        if (f.vida <= 0) {
            window.flechasPerfurantes.splice(i, 1);
        }
    }

    for (let i = window.rajadasFlechas.length - 1; i >= 0; i--) {
        let r = window.rajadasFlechas[i];
        if (!r || !Array.isArray(r.flechas)) {
            liberarRajadaFlechas(r);
            window.rajadasFlechas.splice(i, 1);
            continue;
        }
        if (!Array.isArray(r.particulas)) r.particulas = [];
        r.vida -= frameScale;
        r.tempo += frameScale;

        let rajadaVisivel = rajadaEstaVisivel(r.x, r.y, 330);
        let alphaRajada = Math.min(1, r.vida / 16);

        for (let fIndex = 0; fIndex < r.flechas.length; fIndex++) {
            let f = r.flechas[fIndex];
            f.distancia += f.velocidade * frameScale;
            let larguraCone = 5 + f.distancia * 0.28;
            let px = f.distancia;
            let py = f.lateral * larguraCone + Math.sin(r.tempo * 0.12 + f.lateral * 4) * 1.5;
            let anguloFlecha = f.angulo + Math.atan2(f.lateral * larguraCone, Math.max(20, f.distancia));
            f.px = px;
            f.py = py;
            f.anguloAtual = anguloFlecha;
            f.trilhaCos = Math.cos(anguloFlecha) * 20;
            f.trilhaSin = Math.sin(anguloFlecha) * 20;
            let trailIndex = f.trilhaCabeca;
            f.trilhaX[trailIndex] = px;
            f.trilhaY[trailIndex] = py;
            f.trilhaVida[trailIndex] = 1;
            f.trilhaCabeca = (trailIndex + 1) % ARQUEIRO_TRAIL_SIZE;
            if (f.trilhaQuantidade < ARQUEIRO_TRAIL_SIZE) f.trilhaQuantidade++;

            for (let trailOffset = 0; trailOffset < f.trilhaQuantidade; trailOffset++) {
                let trailSlot = (f.trilhaCabeca - f.trilhaQuantidade + trailOffset + ARQUEIRO_TRAIL_SIZE) % ARQUEIRO_TRAIL_SIZE;
                f.trilhaVida[trailSlot] -= 0.12 * frameScale;
            }
        }

        if (rajadaVisivel) {
            let ondas = r.ondas;
            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.rotate(r.angulo);
            ctx.globalCompositeOperation = 'lighter';

            if (r.flash > 0) {
                ctx.globalAlpha = r.flash / 10;
                ctx.fillStyle = '#fff4af';
                ctx.beginPath();
                ctx.arc(0, 0, 18 + (10 - r.flash) * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = '#d8ff8a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let ondaIndex = 0; ondaIndex < ondas.length; ondaIndex++) {
                let idade = r.tempo - ondas[ondaIndex];
                if (idade < 0 || idade > 58) continue;
                let progressoOnda = idade / 58;
                let distanciaOnda = progressoOnda * 230;
                ctx.moveTo(distanciaOnda + 22 + progressoOnda * 34, 0);
                ctx.arc(distanciaOnda, 0, 22 + progressoOnda * 34, -1.05, 1.05);
            }
            ctx.globalAlpha = 0.5;
            ctx.stroke();

            for (let faixa = 0; faixa < 2; faixa++) {
                ctx.beginPath();
                for (let fIndex = 0; fIndex < r.flechas.length; fIndex++) {
                    let f = r.flechas[fIndex];
                    for (let trailOffset = 0; trailOffset < f.trilhaQuantidade; trailOffset++) {
                        let ehBrilho = trailOffset >= 5;
                        if ((faixa === 1) !== ehBrilho) continue;
                        let trailSlot = (f.trilhaCabeca - f.trilhaQuantidade + trailOffset + ARQUEIRO_TRAIL_SIZE) % ARQUEIRO_TRAIL_SIZE;
                        if (f.trilhaVida[trailSlot] <= 0) continue;
                        ctx.moveTo(f.trilhaX[trailSlot] - f.trilhaCos, f.trilhaY[trailSlot] - f.trilhaSin);
                        ctx.lineTo(f.trilhaX[trailSlot], f.trilhaY[trailSlot]);
                    }
                }
                ctx.globalAlpha = faixa === 0 ? 0.24 : 0.48;
                ctx.strokeStyle = faixa === 0 ? '#8dff55' : '#ffd866';
                ctx.lineWidth = faixa === 0 ? 2 : 3;
                ctx.stroke();
            }

            ctx.globalAlpha = alphaRajada;
            let flechaSprite = sprites.flecha;
            for (let fIndex = 0; fIndex < r.flechas.length; fIndex++) {
                let f = r.flechas[fIndex];
                let anguloFlecha = f.anguloAtual;
                let desenhoLargura = f.comprimento * 2.2;
                ctx.translate(f.px, f.py);
                ctx.rotate(anguloFlecha);
                ctx.drawImage(flechaSprite, -f.comprimento, -8, desenhoLargura, 16);
                ctx.rotate(-anguloFlecha);
                ctx.translate(-f.px, -f.py);
            }
            ctx.restore();
        }

        let particulasVivas = 0;
        if (rajadaVisivel) ctx.save();
        if (rajadaVisivel) ctx.globalCompositeOperation = 'lighter';
        for (let pIndex = 0; pIndex < r.particulas.length; pIndex++) {
            let p = r.particulas[pIndex];
            p.x += (p.vx + 2.2) * frameScale;
            p.y += p.vy * frameScale;
            p.vida -= frameScale;
            if (p.vida <= 0) continue;
            particulasVivas++;
            if (rajadaVisivel) {
                ctx.globalAlpha = Math.min(1, p.vida / 18) * 0.75;
                let tamanho = p.tamanho * 2.5;
                ctx.drawImage(sprites.particula, p.x - tamanho / 2, p.y - tamanho / 2, tamanho, tamanho);
            }
        }
        if (rajadaVisivel) ctx.restore();
        r.particulasVivas = particulasVivas;
        r.flash -= frameScale;

        if (r.vida <= 0 && particulasVivas === 0) {
            liberarRajadaFlechas(r);
            window.rajadasFlechas.splice(i, 1);
        }
    }
};
