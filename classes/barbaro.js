// classes/barbaro.js - Berserker com sprites e machado de guerra
// ============================================================================
// INTERFACES PÚBLICAS:
//     window.desenharBarbaro(x, y, isMoving, angulo, hp, maxHp [, pid])
//     window.enviarAtaqueBarbaro(ws)
//     window.registrarMachadadaBarbaro(id)
// ============================================================================

const BARBARO_COR = {
    cabelo: '#7f1020',
    couroClaro: '#784212',
    ferro: '#3a4658',
    ferroClaro: '#6b7b8f',
    aco: '#aeb6bf',
    acoBrilho: '#e8edf2'
};
const BARBARO_BASE_SPRITES = new URL('../sprites/classes/berseker/', document.currentScript.src);
const BARBARO_ESCALA_SPRITE = 1.5 / 1.3;
const BARBARO_DIRECOES_ANDANDO = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const BARBARO_DIRECOES_PARADO = ['east', 'south', 'west', 'north'];
const barbaroGruposSprites = Object.create(null);
const barbaroPosicoes = Object.create(null);
const barbaroDirecoes = Object.create(null);
const barbaroUltimosFrames = Object.create(null);
const barbaroSetoresAndando = Object.create(null);

function barbaroObterDirecao(angulo, andando, idJogador) {
    const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
    if (andando) {
        const setorAnterior = barbaroSetoresAndando[idJogador];
        let setor = ((Math.round(anguloSeguro / (Math.PI / 4)) % 8) + 8) % 8;
        if (Number.isInteger(setorAnterior)) {
            const centroAnterior = setorAnterior * Math.PI / 4;
            const diferenca = Math.atan2(
                Math.sin(anguloSeguro - centroAnterior),
                Math.cos(anguloSeguro - centroAnterior)
            );
            if (Math.abs(diferenca) < Math.PI / 8 + Math.PI / 36) {
                setor = setorAnterior;
            }
        }
        barbaroSetoresAndando[idJogador] = setor;
        return { nome: BARBARO_DIRECOES_ANDANDO[setor], espelhar: false };
    }

    const setor = ((Math.round(anguloSeguro / (Math.PI / 2)) % 4) + 4) % 4;
    const nome = BARBARO_DIRECOES_PARADO[setor];
    return { nome: nome === 'west' ? 'east' : nome, espelhar: nome === 'west' };
}

function barbaroPosicaoNaGrade(ctx, x, y) {
    if (typeof ctx.getTransform !== 'function') return { x: x, y: y };

    const transformacao = ctx.getTransform();
    const determinante = transformacao.a * transformacao.d - transformacao.b * transformacao.c;
    if (!Number.isFinite(determinante) || Math.abs(determinante) < 0.000001) {
        return { x: x, y: y };
    }

    const telaX = transformacao.a * x + transformacao.c * y + transformacao.e;
    const telaY = transformacao.b * x + transformacao.d * y + transformacao.f;
    const deltaX = Math.round(telaX) - telaX;
    const deltaY = Math.round(telaY) - telaY;
    return {
        x: x + (transformacao.d * deltaX - transformacao.c * deltaY) / determinante,
        y: y + (-transformacao.b * deltaX + transformacao.a * deltaY) / determinante
    };
}

function barbaroCarregarGrupo(andando, direcao) {
    const animacao = andando ? 'walking' : 'idle_breathing';
    const chave = animacao + ':' + direcao;
    if (barbaroGruposSprites[chave]) return barbaroGruposSprites[chave];

    const caminho = andando
        ? 'andando/animations/walking/'
        : 'parado/animations/idle_breathing/';
    const grupo = { imagens: [], carregadas: 0, falhou: false };
    barbaroGruposSprites[chave] = grupo;

    for (let i = 0; i < 8; i++) {
        const imagem = new Image();
        imagem.onload = function () {
            grupo.carregadas++;
        };
        imagem.onerror = function () {
            grupo.falhou = true;
            console.error('Falha ao carregar frame do Berserker:', imagem.src);
        };
        imagem.src = new URL(caminho + direcao + '/frame_' + String(i).padStart(3, '0') + '.png', BARBARO_BASE_SPRITES).href;
        grupo.imagens.push(imagem);
    }
    return grupo;
}

window.machadadasBarbaro = window.machadadasBarbaro || {};
window.registrarMachadadaBarbaro = function (id) {
    window.machadadasBarbaro[id] = Date.now();
};

window.desenharBarbaro = function (x, y, isMoving, angulo, hp, maxHp, pid, anguloMovimento) {
    if (hp <= 0 || !window.ctx) return;

    const ctx = window.ctx;
    const agora = Date.now();
    const t = agora / 1000;
    const andando = Boolean(isMoving);
    const idJogador = pid || '__local__';
    const posicaoAnterior = barbaroPosicoes[idJogador];
    let anguloCorpo = Number.isFinite(angulo) ? angulo : (barbaroDirecoes[idJogador] || 0);

    if (andando && Number.isFinite(anguloMovimento)) {
        anguloCorpo = anguloMovimento;
    } else if (andando && posicaoAnterior) {
        const dx = x - posicaoAnterior.x;
        const dy = y - posicaoAnterior.y;
        if (Math.hypot(dx, dy) > 0.5) anguloCorpo = Math.atan2(dy, dx);
        else if (Number.isFinite(barbaroDirecoes[idJogador])) anguloCorpo = barbaroDirecoes[idJogador];
    }
    barbaroPosicoes[idJogador] = { x: x, y: y };
    barbaroDirecoes[idJogador] = anguloCorpo;

    const direcao = barbaroObterDirecao(anguloCorpo, andando, idJogador);
    const grupo = barbaroCarregarGrupo(andando, direcao.nome);
    const indice = Math.floor(agora / (andando ? 110 : 160)) % 8;
    const pctHp = maxHp > 0 ? hp / maxHp : 1;
    const furyStage = pctHp <= 0.2 ? 3 : pctHp <= 0.4 ? 2 : pctHp <= 0.6 ? 1 : 0;
    const furyScale = furyStage === 3 ? 0.18 : furyStage === 2 ? 0.09 : furyStage === 1 ? 0.04 : 0;

    let swingT = 0;
    const atqInicio = window.machadadasBarbaro[pid] || 0;
    if (atqInicio) {
        const dtSwing = agora - atqInicio;
        if (dtSwing < 280) swingT = 1 - dtSwing / 280;
        else window.machadadasBarbaro[pid] = 0;
    }

    let giroAtivo = pid === window.meuId
        ? !!window.giroDescontroladoLigado
        : !!(window.girosBarbaro && window.girosBarbaro.some(function (g) {
            return g.id === pid && g.ativo && !g.encerrando;
        }));
    if (!giroAtivo && pid === window.meuId && window.girosBarbaro) {
        giroAtivo = window.girosBarbaro.some(function (g) {
            return g.id === pid && g.ativo && !g.encerrando;
        });
    }
    const giroSpin = giroAtivo ? t * 15.5 : 0;

    ctx.save();
    const posicaoRender = barbaroPosicaoNaGrade(ctx, x, y);
    ctx.translate(posicaoRender.x, posicaoRender.y);
    ctx.scale(1 + furyScale, 1 + furyScale);

    if (furyStage > 0) {
        const raioAura = 24 + furyStage * 9 + Math.sin(t * 3.2) * 3;
        ctx.save();
        const gAura = ctx.createRadialGradient(12, 16, 4, 12, 16, raioAura);
        const alphaAura = furyStage === 3 ? 0.4 : furyStage === 2 ? 0.27 : 0.16;
        gAura.addColorStop(0, 'rgba(220,30,30,' + alphaAura + ')');
        gAura.addColorStop(1, 'rgba(220,30,30,0)');
        ctx.fillStyle = gAura;
        ctx.beginPath();
        ctx.arc(12, 16, raioAura, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4 + furyStage * 3; i++) {
            const a = t * 1.7 + i * 1.9;
            const px = 12 + Math.cos(a) * (10 + furyStage * 5);
            const py = 25 - ((t * 20 + i * 31) % 48);
            const br = 0.25 + ((Math.sin(t * 4 + i * 2) + 1) / 2) * 0.3;
            ctx.fillStyle = 'rgba(255,110,50,' + br.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(px, py, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    let imagem = grupo.imagens[indice];
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) {
        imagem = null;
        for (let distancia = 1; distancia < grupo.imagens.length; distancia++) {
            const antes = grupo.imagens[(indice - distancia + grupo.imagens.length) % grupo.imagens.length];
            const depois = grupo.imagens[(indice + distancia) % grupo.imagens.length];
            if (antes && antes.complete && antes.naturalWidth > 0) {
                imagem = antes;
                break;
            }
            if (depois && depois.complete && depois.naturalWidth > 0) {
                imagem = depois;
                break;
            }
        }
    }
    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        barbaroUltimosFrames[idJogador] = imagem;
    } else {
        imagem = barbaroUltimosFrames[idJogador];
    }
    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        const suavizacaoAnterior = ctx.imageSmoothingEnabled;
        const qualidadeSuavizacaoAnterior = ctx.imageSmoothingQuality;
        const larguraSprite = imagem.naturalWidth * BARBARO_ESCALA_SPRITE;
        const alturaSprite = imagem.naturalHeight * BARBARO_ESCALA_SPRITE;
        const spriteX = 8 - larguraSprite / 2;
        const spriteY = -3 - alturaSprite / 2;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        try {
            if (direcao.espelhar) {
                ctx.save();
                ctx.translate(16, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(imagem, spriteX, spriteY, larguraSprite, alturaSprite);
                ctx.restore();
            } else {
                ctx.drawImage(imagem, spriteX, spriteY, larguraSprite, alturaSprite);
            }
        } finally {
            ctx.imageSmoothingEnabled = suavizacaoAnterior;
            ctx.imageSmoothingQuality = qualidadeSuavizacaoAnterior;
        }
    }

    ctx.save();
    const ladoArma = Math.cos(angulo || 0) < 0 ? -1 : 1;
    if (giroSpin > 0) {
        ctx.translate(12, 16);
        ctx.rotate((angulo || 0) + giroSpin);
        ctx.rotate(-Math.PI / 4);
    } else {
        ctx.translate(12 + ladoArma * 22, 4 + Math.sin(t * 2.4) * 1.2);
        ctx.scale(ladoArma, 1);
    }

    let swing = 0;
    if (giroSpin > 0) {
        swing = Math.sin(giroSpin * 3 + t * 2) * 0.05;
    } else if (swingT > 0) {
        const progresso = 1 - swingT;
        const preparacao = Math.min(1, progresso / 0.28);
        const corte = Math.max(0, Math.min(1, (progresso - 0.28) / 0.52));
        const recuperacao = Math.max(0, (progresso - 0.8) / 0.2);
        const easePreparacao = preparacao * preparacao * (3 - 2 * preparacao);
        const easeCorte = corte * corte * (3 - 2 * corte);
        swing = -0.85 + easePreparacao * 0.18 + easeCorte * 1.72 - recuperacao * 0.2;
        ctx.translate(4 * Math.sin(Math.PI * progresso), 1.5 * Math.sin(Math.PI * progresso));
    } else {
        const ciclo = window.walkCycle || 0;
        swing = andando ? Math.sin(ciclo) * 0.08 : Math.sin(t * 2.0) * 0.035;
        if (furyStage === 3) swing += Math.sin(t * 9) * 0.04;
    }
    ctx.rotate((giroSpin > 0 ? 1 : ladoArma) * swing);

    const arma = window.inventario ? window.inventario.arma : null;
    const armaVisual = x === window.meuX && y === window.meuY && arma && arma.customVisual ? arma : null;
    if (typeof window.desenharMachadoExposta === 'function') {
        window.desenharMachadoExposta(ctx, armaVisual);
    }
    barbaroDesenharGotasSangue(ctx, t, swingT > 0);
    ctx.restore();
    ctx.restore();

    if (typeof window.desenharBarraHp === 'function') {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueBarbaro = function (ws) {
    if (window.estaMorto) return;
    window.registrarMachadadaBarbaro(window.meuId);
    if (typeof window.tocarSomMachado === 'function') window.tocarSomMachado();
    const pX = window.meuX + 12;
    const pY = window.meuY + 16;
    const tx = pX + Math.cos(window.meuAngulo) * 35;
    const ty = pY + Math.sin(window.meuAngulo) * 35;
    if (typeof window.criarAnimacaoSangue === 'function') window.criarAnimacaoSangue(tx, ty);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ action: 'ataque_barbaro', angulo: window.meuAngulo }));
    }
};

window.desenharMachadoExposta = function (ctx, armaVisualCustom) {
    let tamanho = 1;
    let largura = 1;
    let cBase = BARBARO_COR.cabelo;
    let cMeio = BARBARO_COR.aco;
    let cPonta = BARBARO_COR.ferro;
    let cFio = BARBARO_COR.acoBrilho;

    if (armaVisualCustom && armaVisualCustom.customVisual) {
        const cv = armaVisualCustom.customVisual;
        if (cv.tamanho) tamanho = cv.tamanho;
        if (cv.largura) largura = cv.largura;
        if (cv.cBase) cBase = cv.cBase;
        if (cv.cMeio) cMeio = cv.cMeio;
        if (cv.cPonta) cPonta = cv.cPonta;
        if (cv.cFio) cFio = cv.cFio;
    }

    ctx.save();
    ctx.scale(tamanho * 0.84, largura * 0.84);

    const cabo = ctx.createLinearGradient(-2.2, 0, 2.2, 0);
    cabo.addColorStop(0, '#21150f');
    cabo.addColorStop(0.42, '#80502e');
    cabo.addColorStop(0.7, '#4c2b1c');
    cabo.addColorStop(1, '#1a120f');
    ctx.fillStyle = cabo;
    ctx.beginPath();
    ctx.moveTo(-2.2, -9);
    ctx.lineTo(2.2, -9);
    ctx.lineTo(2.8, 24);
    ctx.lineTo(1.1, 29);
    ctx.lineTo(-1.5, 27);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#160e0a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Empunhadura de couro vermelho escuro e anéis de ferro.
    ctx.strokeStyle = '#7d1d19';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 5; i++) {
        const y = 7 + i * 3.1;
        ctx.beginPath();
        ctx.moveTo(-1.8, y);
        ctx.lineTo(1.8, y + 1.6);
        ctx.stroke();
    }
    ctx.fillStyle = '#c49a59';
    [-7, -3.5, 4.5].forEach(function (y) {
        ctx.fillRect(-3, y, 6, 1.4);
        ctx.fillStyle = '#3a2a1b';
        ctx.fillRect(-0.55, y + 0.25, 1.1, 0.9);
        ctx.fillStyle = '#c49a59';
    });

    // Pomo pesado e anel de fixação.
    ctx.fillStyle = '#31251c';
    ctx.beginPath();
    ctx.moveTo(-1.5, 25);
    ctx.lineTo(1.5, 25);
    ctx.lineTo(3.4, 28);
    ctx.lineTo(0, 31);
    ctx.lineTo(-3.4, 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b88a48';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#6f1719';
    ctx.beginPath();
    ctx.arc(0, 28, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça larga de aço escuro, com gume curvo e cristas de metal.
    ctx.save();
    ctx.shadowColor = 'rgba(8, 8, 12, 0.85)';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#171b22';
    ctx.strokeStyle = '#101116';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo(5, -15);
    ctx.lineTo(10, -23);
    ctx.lineTo(15, -20);
    ctx.lineTo(22, -24);
    ctx.lineTo(27, -19);
    ctx.lineTo(30, -10);
    ctx.lineTo(28, -3);
    ctx.lineTo(23, 3);
    ctx.lineTo(16, 6);
    ctx.lineTo(10, 3);
    ctx.lineTo(5, -2);
    ctx.lineTo(-2, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const lamina = ctx.createLinearGradient(7, -22, 28, 2);
    lamina.addColorStop(0, cFio);
    lamina.addColorStop(0.32, cMeio);
    lamina.addColorStop(0.72, '#59616d');
    lamina.addColorStop(1, cPonta);
    ctx.fillStyle = lamina;
    ctx.beginPath();
    ctx.moveTo(4, -13);
    ctx.lineTo(11, -22);
    ctx.lineTo(16, -18);
    ctx.lineTo(22, -22);
    ctx.lineTo(27, -17);
    ctx.lineTo(29, -10);
    ctx.quadraticCurveTo(25, -5, 21, -1);
    ctx.lineTo(16, 3);
    ctx.lineTo(10, 0);
    ctx.lineTo(6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Gume polido e nervura central da lâmina.
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(11, -21);
    ctx.lineTo(16, -18);
    ctx.lineTo(22, -22);
    ctx.lineTo(27, -17);
    ctx.lineTo(29, -10);
    ctx.quadraticCurveTo(25, -5, 21, -1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235, 239, 244, 0.6)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(8, -12);
    ctx.lineTo(17, -11);
    ctx.lineTo(26, -14);
    ctx.stroke();

    // Faixa escarlate marcada na face da lâmina.
    ctx.strokeStyle = '#8e201b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(12, -19);
    ctx.lineTo(14, -13);
    ctx.lineTo(20, -10);
    ctx.lineTo(17, -4);
    ctx.stroke();
    ctx.strokeStyle = '#d34a32';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(13, -18);
    ctx.lineTo(15, -13);
    ctx.lineTo(21, -10);
    ctx.stroke();

    // Rebites e pequenas presas no calcanhar da cabeça.
    ctx.fillStyle = '#d1ae70';
    [[4, -10], [8, -5], [12, -8]].forEach(function (ponto) {
        ctx.beginPath();
        ctx.arc(ponto[0], ponto[1], 0.9, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.fillStyle = '#262b32';
    ctx.beginPath();
    ctx.moveTo(3, -13);
    ctx.lineTo(0, -18);
    ctx.lineTo(7, -15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
};

function barbaroDesenharGotasSangue(ctx, tempo, golpeAtivo) {
    const fase = (tempo * 0.72) % 1;
    for (let i = 0; i < 2; i++) {
        const deslocamento = (fase + i * 0.53) % 1;
        if (deslocamento > 0.72) continue;
        const progresso = deslocamento / 0.72;
        const x = 24 - i * 3 + Math.sin(tempo * 2 + i) * 0.8;
        const y = -9 + progresso * 8;
        const alpha = (1 - progresso) * (golpeAtivo ? 0.9 : 0.62);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i === 0 ? '#a20f18' : '#cf2730';
        ctx.beginPath();
        ctx.moveTo(x, y - 1.8);
        ctx.quadraticCurveTo(x + 1.7, y + 0.4, x, y + 1.5);
        ctx.quadraticCurveTo(x - 1.7, y + 0.4, x, y - 1.8);
        ctx.fill();
        ctx.restore();
    }
}
