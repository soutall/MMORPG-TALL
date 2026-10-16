// classes/guerreiro.js — Renderização completa do Guerreiro (CAVALEIRO DA VANGUARDA / TANQUE PESADO)
// Corpo por sprites; escudo, lança e efeitos de combate mantidos em Canvas 2D.
(function () {
    'use strict';

    function _agora() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    // ---- estados visuais por jogador ----
    window.guerreiroPrepTimers = window.guerreiroPrepTimers || {}; // recuo elástico do Grito de Provocação
    window.guerreiroCortes = window.guerreiroCortes || {};         // início (ms) da estocada de lança / pid
    window.guerreiroDefesas = window.guerreiroDefesas || {};       // início (ms) da postura defensiva / pid
    window.guerreiroPassos = window.guerreiroPassos || {};         // fase de caminhada independente por jogador
    const GUERREIRO_BASE_SPRITES = (typeof document !== 'undefined' && document.currentScript)
        ? new URL('../sprites/classes/Guerreiro/', document.currentScript.src)
        : null;
    const GUERREIRO_DIRECOES_ANDANDO = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    const GUERREIRO_DIRECOES_PARADO = ['east', 'south', 'west', 'north'];
    const guerreiroGruposSprites = Object.create(null);
    const guerreiroDirecoesSprites = Object.create(null);
    const guerreiroUltimosFrames = Object.create(null);

    function guerreiroCarregarGrupo(andando, direcao) {
        if (!GUERREIRO_BASE_SPRITES || typeof Image !== 'function') return null;
        const animacao = andando ? 'walking' : 'idle_breathing';
        const chave = animacao + ':' + direcao;
        if (guerreiroGruposSprites[chave]) return guerreiroGruposSprites[chave];

        const pasta = andando ? 'Andando/animations/Walking/' : 'parado/animations/idle_breathing/';
        const grupo = { imagens: [] };
        guerreiroGruposSprites[chave] = grupo;
        for (let i = 0; i < 8; i++) {
            const imagem = new Image();
            imagem.onerror = function () {
                console.error('Falha ao carregar frame do Guerreiro:', imagem.src);
            };
            imagem.src = new URL(
                pasta + direcao + '/frame_' + String(i).padStart(3, '0') + '.png',
                GUERREIRO_BASE_SPRITES
            ).href;
            grupo.imagens.push(imagem);
        }
        return grupo;
    }

    function guerreiroObterFrameDisponivel(grupo, indice) {
        if (!grupo) return null;
        const atual = grupo.imagens[indice];
        if (atual && atual.complete && atual.naturalWidth > 0) return atual;
        for (let distancia = 1; distancia < grupo.imagens.length; distancia++) {
            const anterior = grupo.imagens[(indice - distancia + grupo.imagens.length) % grupo.imagens.length];
            const seguinte = grupo.imagens[(indice + distancia) % grupo.imagens.length];
            if (anterior && anterior.complete && anterior.naturalWidth > 0) return anterior;
            if (seguinte && seguinte.complete && seguinte.naturalWidth > 0) return seguinte;
        }
        return null;
    }

    function guerreiroObterDirecaoSprite(angulo, andando, idJogador) {
        const direcoes = andando ? GUERREIRO_DIRECOES_ANDANDO : GUERREIRO_DIRECOES_PARADO;
        const passoSetor = Math.PI * 2 / direcoes.length;
        const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
        const anterior = guerreiroDirecoesSprites[idJogador];
        let setor = ((Math.round(anguloSeguro / passoSetor) % direcoes.length) + direcoes.length) % direcoes.length;
        if (anterior && anterior.andando === andando) {
            const centroAnterior = anterior.setor * passoSetor;
            const diferenca = Math.atan2(
                Math.sin(anguloSeguro - centroAnterior),
                Math.cos(anguloSeguro - centroAnterior)
            );
            if (Math.abs(diferenca) < passoSetor / 2 + Math.PI / 36) setor = anterior.setor;
        }
        guerreiroDirecoesSprites[idJogador] = { andando: andando, setor: setor };
        return direcoes[setor];
    }

    function guerreiroAlinharNaGrade(ctx, x, y) {
        if (typeof ctx.getTransform !== 'function') return { x: x, y: y };
        const transformacao = ctx.getTransform();
        const determinante = transformacao.a * transformacao.d - transformacao.b * transformacao.c;
        if (!Number.isFinite(determinante) || Math.abs(determinante) < 0.000001) return { x: x, y: y };
        const telaX = transformacao.a * x + transformacao.c * y + transformacao.e;
        const telaY = transformacao.b * x + transformacao.d * y + transformacao.f;
        const deltaX = Math.round(telaX) - telaX;
        const deltaY = Math.round(telaY) - telaY;
        return {
            x: x + (transformacao.d * deltaX - transformacao.c * deltaY) / determinante,
            y: y + (-transformacao.b * deltaX + transformacao.a * deltaY) / determinante
        };
    }

    function desenharSpriteGuerreiro(ctx, andando, angulo, idJogador, agora) {
        const direcao = guerreiroObterDirecaoSprite(angulo, andando, idJogador);
        const grupo = guerreiroCarregarGrupo(andando, direcao);
        const indice = Math.floor(agora / (andando ? 110 : 160)) % 8;
        let imagem = guerreiroObterFrameDisponivel(grupo, indice);
        if (imagem) guerreiroUltimosFrames[idJogador] = imagem;
        else imagem = guerreiroUltimosFrames[idJogador];
        if (!imagem || !imagem.complete || imagem.naturalWidth <= 0) return;

        const escalaSprite = 1 / 1.3;
        const largura = imagem.naturalWidth * escalaSprite;
        const altura = imagem.naturalHeight * escalaSprite;
        const posicao = guerreiroAlinharNaGrade(ctx, 0, 0);
        const suavizacaoAnterior = ctx.imageSmoothingEnabled;
        const qualidadeSuavizacaoAnterior = ctx.imageSmoothingQuality;
        ctx.save();
        ctx.translate(posicao.x, posicao.y);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        try {
            ctx.drawImage(imagem, 12 - largura / 2, 30 - altura, largura, altura);
        } finally {
            ctx.imageSmoothingEnabled = suavizacaoAnterior;
            ctx.imageSmoothingQuality = qualidadeSuavizacaoAnterior;
            ctx.restore();
        }
    }

    GUERREIRO_DIRECOES_PARADO.forEach(function (direcao) {
        guerreiroCarregarGrupo(false, direcao);
    });
    GUERREIRO_DIRECOES_ANDANDO.forEach(function (direcao) {
        guerreiroCarregarGrupo(true, direcao);
    });

    window.registrarCorteGuerreiro = function (pid) { if (pid) window.guerreiroCortes[pid] = _agora(); };
    window.registrarDefesaGuerreiro = function (pid) { if (pid) window.guerreiroDefesas[pid] = _agora(); };

    // partículas locais (poeira / faíscas de bloqueio / glints metálicos / cruzes de cura) — só do próprio jogador
    let dust = [], sparks = [], glints = [], healCrosses = [];
    let lastDust = 0;

    /* ---------- utilitários de desenho ---------- */
    function _grad(ctx, x1, y1, x2, y2, stops) {
        let g = ctx.createLinearGradient(x1, y1, x2, y2);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        return g;
    }

    function _radGrad(ctx, x1, y1, r1, x2, y2, r2, stops) {
        let g = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        return g;
    }

    function _rr(ctx, x, y, w, h, r) {
        r = Math.min(r === undefined ? 3 : r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function _lin(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /* ============================================================
       1. ESCUDO OGIVAL (KITE SHIELD) COM LEÃO RAMPANTE DOURADO
       Baseado diretamente na arte de referência: formato em ogiva/gota,
       borda dourada chanfrada com relevo e o Leão Heráldico Rampante.
       ============================================================ */
    function desenharPathEscudoOgival(ctx, x, y, w, h) {
        let topArc = h * 0.10;
        let sideH = h * 0.44;
        let midX = x + w / 2;
        ctx.beginPath();
        ctx.moveTo(x, y + topArc);
        ctx.quadraticCurveTo(midX, y - 1.2, x + w, y + topArc);
        ctx.lineTo(x + w, y + sideH);
        ctx.quadraticCurveTo(x + w * 0.94, y + h * 0.78, midX, y + h);
        ctx.quadraticCurveTo(x + w * 0.06, y + h * 0.78, x, y + sideH);
        ctx.closePath();
    }

    // Renderiza o Leão Rampante Dourado heráldico no centro do escudo
    function desenharLeaoRampante(ctx, cx, cy, escala) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(escala, escala);

        let gOuro = _grad(ctx, -5, -8, 6, 8, [
            0, '#fff6a6',
            0.3, '#f1c40f',
            0.7, '#d4ac0d',
            1, '#8f6b08'
        ]);

        ctx.fillStyle = gOuro;
        ctx.strokeStyle = '#634b05';
        ctx.lineWidth = 0.55;

        // Cabeça do Leão com juba e boca rugindo
        ctx.beginPath();
        ctx.moveTo(-1.8, -7.2);
        ctx.lineTo(-3.6, -7.0); // focinho
        ctx.lineTo(-4.2, -6.2); // boca aberta
        ctx.lineTo(-3.2, -5.8);
        ctx.lineTo(-4.0, -5.4); // mandíbula
        ctx.lineTo(-2.8, -4.8); // queixo
        // Juba ondulada em camadas
        ctx.lineTo(-3.4, -3.8);
        ctx.lineTo(-1.8, -3.2);
        ctx.lineTo(-2.6, -2.0);
        ctx.lineTo(-0.8, -1.5);
        // Peito musculoso
        ctx.lineTo(-1.2, 0.5);
        ctx.lineTo(-0.4, 2.2); // abdômen
        // Pata dianteira inferior (reachiing forward)
        ctx.lineTo(-2.2, 1.0);
        ctx.lineTo(-3.8, 1.4);
        ctx.lineTo(-4.2, 1.0); // garra
        ctx.lineTo(-3.2, 0.4);
        ctx.lineTo(-1.6, -0.2);
        // Pata dianteira superior (erguida atacando)
        ctx.lineTo(-2.8, -2.6);
        ctx.lineTo(-4.6, -3.2);
        ctx.lineTo(-5.2, -2.6); // garras
        ctx.lineTo(-4.8, -2.0);
        ctx.lineTo(-3.6, -1.8);
        ctx.lineTo(-2.0, -1.2);
        // Dorso e perna traseira esquerda
        ctx.lineTo(0.8, -2.5);
        ctx.lineTo(1.6, 0.0);
        ctx.lineTo(2.2, 2.8); // coxa traseira
        ctx.lineTo(1.0, 4.4);
        ctx.lineTo(-0.4, 5.8); // pata traseira apoiada
        ctx.lineTo(-1.2, 5.6);
        ctx.lineTo(0.2, 4.2);
        ctx.lineTo(1.2, 3.0);
        // Perna traseira direita (avançada)
        ctx.lineTo(1.8, 4.8);
        ctx.lineTo(2.6, 6.4);
        ctx.lineTo(3.2, 6.0);
        ctx.lineTo(2.4, 4.2);
        ctx.lineTo(1.8, 2.2);
        // Cauda sinuosa em 'S' erguida com tufo no topo
        ctx.lineTo(2.0, 0.8);
        ctx.quadraticCurveTo(3.8, -1.5, 4.2, -4.2);
        ctx.quadraticCurveTo(3.8, -6.4, 2.6, -6.8);
        // Tufo da cauda (bifurcado)
        ctx.lineTo(3.4, -7.8);
        ctx.lineTo(2.4, -8.2);
        ctx.lineTo(1.8, -7.2);
        ctx.lineTo(2.0, -6.2);
        ctx.quadraticCurveTo(3.0, -5.8, 3.0, -4.0);
        ctx.quadraticCurveTo(2.6, -1.8, 1.2, -0.4);
        // Orelha e topo da cabeça
        ctx.lineTo(0.6, -3.8);
        ctx.lineTo(0.8, -6.2);
        ctx.lineTo(-0.2, -7.4); // orelha
        ctx.lineTo(-0.8, -6.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Olho brilhante do Leão
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-2.6, -6.4, 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Filetes de luz especular nas garras e juba
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 0.5;
        _lin(ctx, -1.6, -6.8, -0.8, -6.2);
        _lin(ctx, -4.2, -2.8, -3.2, -2.2);
        _lin(ctx, 2.4, -7.2, 3.0, -4.8);

        ctx.restore();
    }

    // Desenha o escudo completo no frame do braço / tronco
    function desenharEscudoOgivalLeao(ctx, x0, top, W, H, modo) {
        let midX = x0 + W / 2;

        // Sombra suave sob o escudo
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1.5;
        ctx.shadowOffsetY = 2;

        // 1. Base / Moldura Chanfrada Dourada Externa
        desenharPathEscudoOgival(ctx, x0, top, W, H);
        let gMoldura = _grad(ctx, x0, top, x0 + W, top + H, [
            0, '#ffe57f',
            0.2, '#f1c40f',
            0.5, '#d4ac0d',
            0.8, '#9a7d0a',
            1, '#614e04'
        ]);
        ctx.fillStyle = gMoldura;
        ctx.fill();
        ctx.restore();

        // Contorno fino escuro da moldura
        ctx.strokeStyle = '#382a02';
        ctx.lineWidth = 0.8;
        desenharPathEscudoOgival(ctx, x0, top, W, H);
        ctx.stroke();

        // 2. Campo Interno de Aço Temperado (aço-cinza profundo com reflexos azuis)
        let pad = 2.1;
        let inX = x0 + pad, inY = top + pad, inW = W - pad * 2, inH = H - pad * 2.2;
        desenharPathEscudoOgival(ctx, inX, inY, inW, inH);
        let gCampo = _grad(ctx, inX, inY, inX + inW, inY + inH, [
            0, '#667d94',
            0.25, '#4a5b6c',
            0.6, '#313d49',
            1, '#1c242c'
        ]);
        ctx.fillStyle = gCampo;
        ctx.fill();

        // Filete de borda dourada interna
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.65)';
        ctx.lineWidth = 0.7;
        desenharPathEscudoOgival(ctx, inX, inY, inW, inH);
        ctx.stroke();

        // 3. Reflexo Especular Diagonal (Luz no Aço)
        ctx.save();
        desenharPathEscudoOgival(ctx, inX, inY, inW, inH);
        ctx.clip();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.moveTo(inX, inY);
        ctx.lineTo(inX + inW * 0.7, inY);
        ctx.lineTo(inX, inY + inH * 0.75);
        ctx.closePath();
        ctx.fill();

        // Linha de dobra central do escudo (vinco longitudinal de reforço)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.8;
        _lin(ctx, midX - 0.3, inY + 0.5, midX - 0.3, inY + inH - 1);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 0.8;
        _lin(ctx, midX + 0.3, inY + 0.5, midX + 0.3, inY + inH - 1);

        // 4. O BRASÃO HERÁLDICO: LEÃO RAMPANTE DOURADO
        let escalaLeao = Math.min(inW / 18, inH / 26) * 1.35;
        desenharLeaoRampante(ctx, midX, inY + inH * 0.48, escalaLeao);

        ctx.restore();

        // 5. Rebites dourados na borda superior e lateral
        ctx.fillStyle = '#fff4a3';
        let rebites = [
            [x0 + 2.5, top + 3.2],
            [midX, top + 1.2],
            [x0 + W - 2.5, top + 3.2],
            [x0 + 1.6, top + H * 0.38],
            [x0 + W - 1.6, top + H * 0.38],
            [midX, top + H - 2.2]
        ];
        rebites.forEach(function (pt) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 0.7, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /* ============================================================
       2. A LANÇA DE BATALHA (ORNATE BATTLE SPEAR)
       Substitui a espada antiga. Haste de madeira escura reforçada,
       borla vermelha no pomo traseiro, asas de proteção douradas
       e lâmina afiada em folha de louro com fio de luz prateado.
       ============================================================ */
    window.desenharLancaBatalhaExposta = desenharLancaBatalha;
    window.desenharLaminaLargaExposta = desenharLancaBatalha; // retrocompatibilidade

    function desenharLancaBatalha(ctx, off, armaVisual, faseAtk) {
        const comprimento = 31;
        const madeira = '#6b4a2f';
        const madeiraEscura = '#39271d';
        let acoClaro = '#f4f6f7';
        let acoMeio = '#bdc3c7';
        let acoEscuro = '#64717d';
        let ouro = '#e0b64d';
        if (armaVisual && armaVisual.customVisual) {
            acoClaro = armaVisual.customVisual.cBase || acoClaro;
            acoMeio = armaVisual.customVisual.cMeio || acoMeio;
            acoEscuro = armaVisual.customVisual.cPonta || acoEscuro;
        } else if (armaVisual && armaVisual.raridade === 'raro') {
            acoClaro = '#bfe6ff'; acoMeio = '#5dade2'; acoEscuro = '#3486b4'; ouro = '#69c8ef';
        } else if (armaVisual && armaVisual.raridade === 'epico') {
            acoClaro = '#e8c8ff'; acoMeio = '#af7ac5'; acoEscuro = '#8852ac'; ouro = '#c58be9';
        } else if (armaVisual && armaVisual.raridade === 'lendario') {
            acoClaro = '#fff0b0'; acoMeio = '#e4a13a'; acoEscuro = '#ca7927'; ouro = '#ffc44d';
        }

        ctx.save();
        ctx.translate(Number(off) || 0, Math.sin((faseAtk || 0) * Math.PI * 2 + Date.now() / 260) * 0.7);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#22160f';
        ctx.lineWidth = 3.2;
        _lin(ctx, -3, 0, comprimento - 4, 0);
        ctx.strokeStyle = madeira;
        ctx.lineWidth = 2;
        _lin(ctx, -3, -0.2, comprimento - 4, -0.2);
        ctx.strokeStyle = 'rgba(255,235,190,0.55)';
        ctx.lineWidth = 0.55;
        _lin(ctx, 0, -0.8, comprimento - 5, -0.8);

        [-1, 5, 19].forEach(function (x) {
            ctx.fillStyle = ouro;
            ctx.fillRect(x, -1.5, 1.2, 3);
            ctx.fillStyle = madeiraEscura;
            ctx.fillRect(x + 1.2, -0.35, 0.6, 0.7);
        });

        ctx.fillStyle = ouro;
        ctx.beginPath();
        ctx.moveTo(comprimento - 9, -2.8);
        ctx.lineTo(comprimento - 5, -1.4);
        ctx.lineTo(comprimento - 4, 0);
        ctx.lineTo(comprimento - 5, 1.4);
        ctx.lineTo(comprimento - 9, 2.8);
        ctx.lineTo(comprimento - 8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#76521c';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        const ponta = comprimento + 1;
        ctx.fillStyle = acoEscuro;
        ctx.beginPath();
        ctx.moveTo(comprimento - 7, -1.7);
        ctx.lineTo(comprimento - 3, -3.1);
        ctx.lineTo(ponta, 0);
        ctx.lineTo(comprimento - 3, 3.1);
        ctx.lineTo(comprimento - 7, 1.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = _grad(ctx, comprimento - 7, -2.4, ponta, 2.4, [
            0, acoClaro, 0.52, acoMeio, 1, acoEscuro
        ]);
        ctx.beginPath();
        ctx.moveTo(comprimento - 7, -1.7);
        ctx.lineTo(comprimento - 3, -2.3);
        ctx.lineTo(ponta - 1, 0);
        ctx.lineTo(comprimento - 3, 2.3);
        ctx.lineTo(comprimento - 7, 1.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 0.6;
        _lin(ctx, comprimento - 6, -1.5, ponta - 1.5, -0.1);
        ctx.restore();
    }

    function desenharLancaFlutuante(ctx, anguloMira, atk, armaVisual, tempo) {
        const oscilacao = Math.sin(tempo / 240) * 1.1;
        const impulso = atk > 0 && atk < 1 ? Math.sin(Math.PI * atk) * 4 : 0;
        const anguloSeguro = Number.isFinite(anguloMira) ? anguloMira : 0;
        ctx.save();
        ctx.translate(23 + Math.cos(anguloSeguro) * impulso, -7 + oscilacao + Math.sin(anguloSeguro) * impulso);
        ctx.rotate(anguloSeguro);
        desenharLancaBatalha(ctx, 0, armaVisual, atk);
        ctx.restore();

        if (atk >= 0.25 && atk <= 0.85) {
            const intensidade = Math.sin(Math.PI * ((atk - 0.25) / 0.60));
            ctx.save();
            ctx.globalAlpha = Math.max(0, intensidade) * 0.55;
            ctx.strokeStyle = '#fff1a8';
            ctx.lineWidth = 1.1;
            _lin(ctx, 22, -7, 39, -7);
            ctx.restore();
        }
    }

    /* ============================================================
       3. PERNAS E BOTAS (GREVAS ARTICULADAS E SABATONS)
       ============================================================ */
    function desenharPernas(ctx, passo, mov, defesa) {
        let amp = mov ? 2.8 : 0.8;
        let f1 = Math.sin(passo * Math.PI * 2) * amp;
        let f2 = Math.sin(passo * Math.PI * 2 + Math.PI) * amp;
        let crouch = defesa ? 1.8 : 0;
        ctx.lineCap = 'round';

        let pernas = [
            { base: 14.5, f: f1, frente: true },
            { base: 8.5, f: f2, frente: false }
        ];

        pernas.forEach(function (pl) {
            let hx = pl.base, hy = 20.0 - crouch;
            let kx = hx + pl.f * 2.2, ky = 23.0;
            let ax = hx + pl.f * 3.2, ay = 25.8;
            let fx = hx + pl.f * 4.6, fy = 30.0;

            // Malha de aço inferior
            ctx.strokeStyle = '#1a232b';
            ctx.lineWidth = 6.5;
            _lin(ctx, hx, hy, ax, ay);

            // Coxa de placas prateadas (cuisse)
            let gCoxa = _grad(ctx, hx - 2, hy, kx + 2, ky, [0, '#95a5a6', 0.5, '#7f8c8d', 1, '#34495e']);
            ctx.strokeStyle = gCoxa;
            ctx.lineWidth = 5.0;
            _lin(ctx, hx, hy, kx, ky);

            // Joelheira de placa pontiaguda articulada (poleyn)
            ctx.fillStyle = '#bdc3c7';
            ctx.beginPath();
            ctx.moveTo(kx - 1.8, ky - 2.2);
            ctx.lineTo(kx + 2.5, ky);
            ctx.lineTo(kx - 1.8, ky + 2.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Rebite da joelheira
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(kx, ky, 0.7, 0, Math.PI * 2); ctx.fill();

            // Greva (canela de placa de aço)
            let gGreva = _grad(ctx, kx, ky, ax, ay, [0, '#bdc3c7', 0.6, '#7f8c8d', 1, '#2c3e50']);
            ctx.strokeStyle = gGreva;
            ctx.lineWidth = 4.4;
            _lin(ctx, kx, ky, ax, ay);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 0.8;
            _lin(ctx, kx + 0.8, ky + 0.3, ax + 0.8, ay);

            // Sabaton (bota de aço articulada pesada com bico pontiagudo)
            ctx.fillStyle = '#34495e';
            ctx.beginPath();
            ctx.moveTo(fx - 3.2, ay - 0.6);
            ctx.lineTo(fx + 2.6, ay - 0.8);
            ctx.lineTo(fx + 4.5, fy - 0.4);
            ctx.lineTo(fx + 3.0, fy);
            ctx.lineTo(fx - 3.4, fy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#1b2631';
            ctx.lineWidth = 0.9;
            ctx.stroke();

            // Placas articuladas no peito do pé
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 0.7;
            _lin(ctx, fx - 1.5, ay + 1.2, fx + 2.8, fy - 0.5);
        });
    }

    /* ============================================================
       4. TRONCO, COTA DE MALHA E COURAÇA GRAVADA
       ============================================================ */
    function desenharTronco(ctx, dano, resp) {
        // 1. Saia de Cota de Malha (Fauld) sob o peitoral
        ctx.fillStyle = '#212f3d';
        ctx.beginPath();
        ctx.moveTo(4.6, 19.5);
        ctx.lineTo(19.8, 19.5);
        ctx.lineTo(20.4, 23.6);
        ctx.lineTo(4.0, 23.6);
        ctx.closePath();
        ctx.fill();
        // Textura da cota de malha
        ctx.strokeStyle = 'rgba(189, 195, 199, 0.4)';
        ctx.lineWidth = 0.8;
        for (let my = 20.2; my <= 23.2; my += 1.4) {
            ctx.beginPath();
            ctx.setLineDash([1.5, 1.5]);
            ctx.moveTo(4.6, my); ctx.lineTo(19.8, my);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Tassets de aço articulados sobre as coxas
        let tassets = [
            [5.0, 20.2, 8.2, 23.4],
            [8.8, 20.2, 12.2, 23.8],
            [12.8, 20.2, 16.2, 23.8],
            [16.8, 20.2, 19.8, 23.4]
        ];
        tassets.forEach(function (t, i) {
            let gT = _grad(ctx, t[0], t[1], t[2], t[3], [0, '#bdc3c7', 0.5, '#7f8c8d', 1, '#2c3e50']);
            ctx.fillStyle = gT;
            ctx.beginPath();
            ctx.moveTo(t[0], t[1]);
            ctx.lineTo(t[2], t[1]);
            ctx.lineTo(t[2] + 0.4, t[3]);
            ctx.lineTo(t[0] - 0.4, t[3]);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#1b2631';
            ctx.lineWidth = 0.7;
            ctx.stroke();
            // Rebite
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc((t[0] + t[2]) / 2, t[3] - 1.0, 0.6, 0, Math.PI * 2); ctx.fill();
        });

        // Cinto de couro reforçado com fivela dourada
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(4.5, 18.8, 15.6, 1.8);
        ctx.fillStyle = '#f1c40f';
        _rr(ctx, 11.0, 18.6, 3.4, 2.2, 0.6);
        ctx.fill();
        ctx.strokeStyle = '#7f6000';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // 2. PEITORAL MACIÇO DE AÇO COM FILIGRANAS GRAVADAS
        let gP = _grad(ctx, 4.5, 7.5, 20.5, 18.5, [
            0, '#ecf0f1',
            0.25, '#bdc3c7',
            0.65, '#7f8c8d',
            1, '#2c3e50'
        ]);
        ctx.fillStyle = gP;
        ctx.beginPath();
        ctx.moveTo(5.2, 8.6 + resp * 0.2);
        ctx.quadraticCurveTo(12.0, 6.8, 19.4, 8.6 + resp * 0.2);
        ctx.lineTo(20.2, 18.4);
        ctx.quadraticCurveTo(12.5, 20.0, 4.6, 18.4);
        ctx.quadraticCurveTo(4.2, 13.0, 5.2, 8.6 + resp * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1c2833';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Crista central vertical de reforço da couraça
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.2;
        _lin(ctx, 12.0, 8.0 + resp * 0.2, 12.0, 18.6);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.9;
        _lin(ctx, 12.7, 8.2 + resp * 0.2, 12.7, 18.5);

        // Filigranas esculpidas em relevo nas laterais da couraça (arabescos imperiais)
        ctx.strokeStyle = 'rgba(33, 47, 61, 0.65)';
        ctx.lineWidth = 0.75;
        // Filigrana lado esquerdo
        ctx.beginPath();
        ctx.moveTo(7.0, 11.0);
        ctx.quadraticCurveTo(9.5, 10.5, 10.5, 13.0);
        ctx.quadraticCurveTo(9.0, 15.5, 7.5, 14.5);
        ctx.stroke();
        // Filigrana lado direito
        ctx.beginPath();
        ctx.moveTo(17.4, 11.0);
        ctx.quadraticCurveTo(14.9, 10.5, 13.9, 13.0);
        ctx.quadraticCurveTo(15.4, 15.5, 16.9, 14.5);
        ctx.stroke();

        // Brilho especular sutil sobre as filigranas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(7.2, 10.8); ctx.quadraticCurveTo(9.6, 10.3, 10.6, 12.8);
        ctx.moveTo(17.2, 10.8); ctx.quadraticCurveTo(14.8, 10.3, 13.8, 12.8);
        ctx.stroke();

        // Flash vermelho de dano
        if (dano) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.45)';
            ctx.fill();
        }
    }

    /* ============================================================
       5. OMBREIRAS (PAULDRONS EM CAMADAS TRIPLAS)
       ============================================================ */
    function desenharOmbros(ctx, dano) {
        function omb(x, y, w, h, flip) {
            // Placa 1 (superior maior)
            let g1 = _grad(ctx, x, y, x + w, y + h, [0, '#ecf0f1', 0.45, '#bdc3c7', 1, '#34495e']);
            ctx.fillStyle = g1;
            _rr(ctx, x, y, w, h, 3.2);
            ctx.fill();
            ctx.strokeStyle = '#1b2631';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Placa 2 (camada inferior articulada)
            ctx.fillStyle = '#7f8c8d';
            _rr(ctx, x + 0.6, y + h * 0.45, w - 1.2, h * 0.55, 2.0);
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Borda dourada ornamental
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + 1.8, w * 0.38, Math.PI, 0);
            ctx.stroke();

            // Rebites dourados
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(x + 1.6, y + h - 1.4, 0.65, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w - 1.6, y + h - 1.4, 0.65, 0, Math.PI * 2); ctx.fill();
        }

        omb(2.0, 6.8, 6.8, 7.0, false);  // ombreira esquerda
        omb(15.6, 6.8, 7.0, 7.0, true);  // ombreira direita
    }

    /* ============================================================
       6. CAPACETE (GREAT HELM DE CRUZADO / CAVALEIRO MEDIEVAL)
       Design 100% fiel à imagem de referência: Elmo cilíndrico de aço,
       topo plano/abaulado, T-Visor com cruz frontal e orifícios de respiração.
       ============================================================ */
    function desenharCapacete(ctx, resp) {
        let gElmo = _grad(ctx, 8.2, -2.5, 17.0, 7.8, [
            0, '#ecf0f1',
            0.2, '#bdc3c7',
            0.6, '#7f8c8d',
            1, '#2c3e50'
        ]);

        // Cúpula do Great Helm
        ctx.fillStyle = gElmo;
        ctx.beginPath();
        ctx.moveTo(8.6, 6.4);
        ctx.lineTo(8.4, 0.4);
        ctx.quadraticCurveTo(8.6, -2.8, 12.8, -2.8); // topo plano/abaulado
        ctx.quadraticCurveTo(17.0, -2.8, 17.2, 0.4);
        ctx.lineTo(17.0, 6.4);
        ctx.quadraticCurveTo(15.2, 7.8, 12.8, 7.8);
        ctx.quadraticCurveTo(10.2, 7.8, 8.6, 6.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1b2631';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Luz superior na borda da coroa
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(12.8, -2.0, 3.4, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1. Faixa Vertical Central Reforçada (Haste vertical da cruz)
        let gFaixaV = _grad(ctx, 11.8, -2.6, 13.8, 7.6, [0, '#f1c40f', 0.5, '#bdc3c7', 1, '#34495e']);
        ctx.fillStyle = gFaixaV;
        ctx.fillRect(12.0, -2.4, 1.6, 9.8);
        ctx.strokeStyle = '#1a252f';
        ctx.lineWidth = 0.55;
        ctx.strokeRect(12.0, -2.4, 1.6, 9.8);

        // 2. Fenda do Visor Horizontal (T-VISOR / Fenda de Olhar Negra Profunda)
        ctx.fillStyle = '#06090e';
        ctx.beginPath();
        ctx.moveTo(9.8, 1.8);
        ctx.lineTo(15.8, 1.8);
        ctx.lineTo(15.6, 3.0);
        ctx.lineTo(9.9, 3.0);
        ctx.closePath();
        ctx.fill();

        // Brilho azulado/aço gélido discreto dentro do visor (olhos do cavaleiro)
        ctx.fillStyle = 'rgba(133, 193, 233, 0.65)';
        ctx.fillRect(10.8, 2.1, 1.2, 0.7);
        ctx.fillRect(13.6, 2.1, 1.2, 0.7);

        // Fenda central descendente (T-Visor)
        ctx.fillStyle = '#06090e';
        ctx.fillRect(12.4, 3.0, 0.8, 3.0);

        // 3. Orifícios Circulares de Ventilação (Breathing Holes na Queixeira)
        ctx.fillStyle = '#06090e';
        // Lado esquerdo (3 furos)
        [3.8, 4.9, 6.0].forEach(function (hy) {
            ctx.beginPath(); ctx.arc(10.8, hy, 0.45, 0, Math.PI * 2); ctx.fill();
        });
        // Lado direito (3 furos)
        [3.8, 4.9, 6.0].forEach(function (hy) {
            ctx.beginPath(); ctx.arc(14.8, hy, 0.45, 0, Math.PI * 2); ctx.fill();
        });

        // 4. Rebites metálicos contornando o Great Helm
        ctx.fillStyle = '#d5dbdb';
        [
            [9.4, -1.2], [16.2, -1.2],
            [9.2, 5.2], [16.4, 5.2],
            [12.8, -2.2]
        ].forEach(function (pt) {
            ctx.beginPath(); ctx.arc(pt[0], pt[1], 0.65, 0, Math.PI * 2); ctx.fill();
        });
    }

    /* ============================================================
       7. BRAÇOS E EMPUNHADURAS (LANÇA E ESCUDO)
       ============================================================ */

    // Braço esquerdo segurando o Escudo Ogival
    function desenharBracoEscudo(ctx, resp, mov, defesa) {
        ctx.lineCap = 'round';
        let v = resp * 0.6 + (mov ? 1.0 : 0.2);

        // Braço em cota de malha + braçadeira de placas
        ctx.strokeStyle = '#212f3d';
        ctx.lineWidth = 4.8;
        _lin(ctx, -5.0, -5.4, -1.8, -2.0 + v * 0.3);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 3.8;
        _lin(ctx, -1.8, -2.0 + v * 0.3, 3.0, 0.6 + v * 0.2);

        // Manopla de placas de aço segurando a alça do escudo
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(4.8, 1.8 + v * 0.2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f1c40f'; // anel dourado no punho
        ctx.lineWidth = 0.7;
        ctx.stroke();
    }

    // Braço direito empunhando a Lança de Batalha (Estocada Penetrante)
    function desenharBracoLanca(ctx, atk, armaVisual) {
        ctx.lineCap = 'round';

        // Cinemática da estocada (Spear Thrust):
        // 0.0 - 0.25: Recuo elástico (wind-up)
        // 0.25 - 0.70: Estocada penetrante violenta para a frente
        // 0.70 - 1.0: Impacto e recuperação suave
        let thrustX = 0;
        let rotAng = -0.22; // inclinação natural da lança em guarda

        if (atk > 0 && atk < 1) {
            if (atk < 0.25) {
                let fRecuo = atk / 0.25;
                thrustX = -5.0 * Math.sin(fRecuo * Math.PI / 2);
                rotAng = -0.22 - 0.15 * fRecuo;
            } else if (atk < 0.70) {
                let fAvanco = (atk - 0.25) / 0.45;
                thrustX = -5.0 + 20.0 * Math.sin(fAvanco * Math.PI / 2);
                rotAng = -0.37 + 0.37 * fAvanco;
            } else {
                let fRetorno = (atk - 0.70) / 0.30;
                thrustX = 15.0 * (1 - fRetorno);
                rotAng = fRetorno * -0.22;
            }
        }

        ctx.save();
        ctx.translate(thrustX, 0);

        // Braço em cota de malha
        ctx.strokeStyle = '#212f3d';
        ctx.lineWidth = 4.8;
        _lin(ctx, -4.2, -5.0, -1.0, -2.2);
        // Braçadeira de placas prateadas com cotoveleira pontiaguda
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 3.9;
        _lin(ctx, -1.0, -2.2, 2.0, -0.6);
        // Cotoveleira (couter)
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(-1.0, -2.2, 1.2, 0, Math.PI * 2); ctx.fill();

        // Manopla articulada (mão segurando a haste da lança)
        ctx.fillStyle = '#34495e';
        ctx.beginPath(); ctx.arc(2.5, -0.4, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1b2631';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Aplica a rotação da lança a partir da manopla
        ctx.save();
        ctx.translate(2.5, -0.4);
        ctx.rotate(rotAng);

        // Rastro de perfuração aerodinâmica da lança no ar
        if (atk >= 0.28 && atk <= 0.75) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([8, 4]);
            _lin(ctx, -8, -0.5, 34, -0.5);
            ctx.strokeStyle = 'rgba(241, 196, 15, 0.35)';
            ctx.lineWidth = 1.0;
            _lin(ctx, -4, 0.5, 38, 0.5);
            ctx.setLineDash([]);
            ctx.restore();
        }

        // DESENHO DA LANÇA
        desenharLancaBatalha(ctx, 0, armaVisual, atk);

        // Flash de impacto penetrante na ponta (Star-Burst)
        if (atk >= 0.65 && atk <= 0.85) {
            let fImp = 1 - Math.abs(atk - 0.75) / 0.10;
            let tipX = 30.0;
            ctx.save();
            ctx.translate(tipX, 0);

            // Explosão estelar na ponta da lança
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.95 * fImp) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, 3.8 * fImp + 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Raios dourados cruzados
            ctx.strokeStyle = 'rgba(241, 196, 15, ' + (0.85 * fImp) + ')';
            ctx.lineWidth = 1.5;
            let rMax = 8.5 * fImp;
            _lin(ctx, -rMax, 0, rMax, 0);
            _lin(ctx, 0, -rMax, 0, rMax);
            _lin(ctx, -rMax * 0.7, -rMax * 0.7, rMax * 0.7, rMax * 0.7);
            _lin(ctx, -rMax * 0.7, rMax * 0.7, rMax * 0.7, -rMax * 0.7);
            ctx.restore();
        }

        ctx.restore(); // fim rotação da lança
        ctx.restore(); // fim translação da estocada
    }

    // Lança preparada em prontidão na Postura Defensiva / Dash (ao lado do escudo)
    function desenharLancaDefesa(ctx, armaVisual) {
        ctx.lineCap = 'round';
        // Braço recuado atrás da couraça
        ctx.strokeStyle = '#212f3d';
        ctx.lineWidth = 4.6;
        _lin(ctx, 22.0, 9.0, 25.5, 12.0);
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 3.8;
        _lin(ctx, 25.5, 12.0, 28.0, 13.6);

        // Manopla segurando a lança
        ctx.fillStyle = '#34495e';
        ctx.beginPath(); ctx.arc(28.6, 14.0, 1.9, 0, Math.PI * 2); ctx.fill();

        // Lança apontada para a frente em ângulo penetrante
        ctx.save();
        ctx.translate(28.6, 14.0);
        ctx.rotate(-0.12);
        desenharLancaBatalha(ctx, -4, armaVisual, 0);
        ctx.restore();
    }

    /* ============================================================
       8. SKILL 1: AURA DO VANGUARDA (BUFF / PROTEÇÃO - CÚPULA DOURADA)
       Fiel à arte: Cúpula translúcida dourada com arcos filigranados,
       mini-escudos heráldicos orbitando e estrelas cintilantes.
       ============================================================ */
    function desenharAuraVanguarda(ctx, agora) {
        ctx.save();
        let cx = 12.0, cy = 16.0;
        let pulso = 0.5 + 0.5 * Math.sin(agora / 180);
        let raioX = 26.0 + pulso * 2.5;
        let raioY = 30.0 + pulso * 2.0;

        // 1. Cúpula de Energia Translúcida Dourada
        let gCupula = ctx.createRadialGradient(cx, cy - 2, 4, cx, cy, raioY);
        gCupula.addColorStop(0, 'rgba(255, 245, 157, 0.08)');
        gCupula.addColorStop(0.7, 'rgba(241, 196, 15, ' + (0.16 + pulso * 0.08) + ')');
        gCupula.addColorStop(1, 'rgba(255, 215, 0, ' + (0.42 + pulso * 0.18) + ')');

        ctx.fillStyle = gCupula;
        ctx.beginPath();
        ctx.ellipse(cx, cy, raioX, raioY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Borda luminosa da cúpula com glow
        ctx.strokeStyle = 'rgba(255, 235, 120, ' + (0.75 + pulso * 0.25) + ')';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 10 + pulso * 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Arcos de Filigrana Gótica Entrelaçados no topo e base da cúpula
        ctx.strokeStyle = 'rgba(255, 248, 180, ' + (0.55 + pulso * 0.25) + ')';
        ctx.lineWidth = 1.0;
        for (let a = -1; a <= 1; a += 0.65) {
            ctx.beginPath();
            ctx.ellipse(cx + a * 6, cy, raioX * 0.65, raioY * 0.92, a * 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. Mini-Escudos de Proteção Orbitando (Brasões flutuantes com runas)
        let qtdBrasoes = 4;
        let angOrbit = agora / 650;
        for (let i = 0; i < qtdBrasoes; i++) {
            let a = angOrbit + (i / qtdBrasoes) * Math.PI * 2;
            let bx = cx + Math.cos(a) * (raioX + 2);
            let by = cy + Math.sin(a) * (raioY * 0.72);

            ctx.save();
            ctx.translate(bx, by);

            // Mini Kite Shield
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.moveTo(-3, -4);
            ctx.lineTo(3, -4);
            ctx.lineTo(3, 1);
            ctx.lineTo(0, 5);
            ctx.lineTo(-3, 1);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#7d6608';
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Cruz central do mini-escudo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-0.5, -3, 1, 6);
            ctx.fillRect(-2, -1, 4, 1);

            // Brilho estelar sobre o mini-escudo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath(); ctx.arc(0, 0, 0.9 + pulso * 0.4, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }

        // 4. Estrelas e Partículas Douradas Cintilantes (✦)
        for (let s = 0; s < 5; s++) {
            let sAng = agora / 420 + s * 1.25;
            let sx = cx + Math.cos(sAng) * (raioX * 0.85);
            let sy = cy + Math.sin(sAng) * (raioY * 0.85);
            let sTam = 1.2 + 0.8 * Math.sin(agora / 120 + s);

            ctx.fillStyle = '#fff9c4';
            ctx.beginPath();
            ctx.arc(sx, sy, sTam, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /* ============================================================
       9. SKILL 2: GIRO DO VANGUARDA (TORNADO COM LANÇA E POEIRA)
       Fiel à arte: Varredura de lança em 360°, arcos concêntricos
       cortantes prateados e nuvens de poeira levantadas no solo.
       ============================================================ */
    function desenharGiroLanca(ctx, progresso) {
        ctx.save();
        ctx.translate(12, 16);

        let alphaGiro = 1.0 - (progresso * 0.25);

        // 1. Arco Cortante Externo (Lâmina da Lança cortando o ar)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4.2;
        ctx.shadowColor = '#d5dbdb';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 36, -Math.PI * 0.2, Math.PI * 1.5);
        ctx.stroke();

        // 2. Arco Interno Prateado/Dourado com Gradiente
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(241, 196, 15, ' + (0.75 * alphaGiro) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, 26, Math.PI * 0.6, Math.PI * 2.2);
        ctx.stroke();

        // 3. Estrias de Velocidade Cortante
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.85 * alphaGiro) + ')';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) {
            let a = k * (Math.PI / 3) + progresso * Math.PI * 4;
            ctx.beginPath();
            ctx.arc(0, 0, 31 + (k % 2) * 5, a, a + 0.35);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ============================================================
       10. PASSIVA: RESISTÊNCIA DO ÚLTIMO FÔLEGO (3 NÍVEIS)
       ============================================================ */
    function desenharAuraUltimoFolego(ctx, pctHp, agora) {
        ctx.save();
        let cx = 12, cy = 20;

        if (pctHp <= 0.10) {
            let pulso = Math.sin(agora / 80) * 3.5;
            let r = 24 + pulso;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, r, r * 0.58, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(231, 76, 60, 0.9)";
            ctx.lineWidth = 3.2;
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, r - 4, (r - 4) * 0.58, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(241, 196, 15, 0.85)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
        } else if (pctHp <= 0.30) {
            let pulso = Math.sin(agora / 160) * 2.2;
            let r = 20 + pulso;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, r, r * 0.55, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(230, 126, 34, 0.75)";
            ctx.lineWidth = 2.4;
            ctx.stroke();
        } else {
            let pulso = Math.sin(agora / 260) * 1.5;
            let r = 16 + pulso;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, r, r * 0.52, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(243, 156, 18, 0.45)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
        ctx.restore();
    }

    /* ---------- atualização de partículas locais ---------- */
    function atualizarParticulas(ctx, agora) {
        for (let i = dust.length - 1; i >= 0; i--) {
            let d = dust[i];
            d.x += d.vx; d.y += d.vy; d.vy -= 0.012; d.life -= 0.024; d.r += 0.14;
            if (d.life <= 0) { dust.splice(i, 1); continue; }
            ctx.fillStyle = 'rgba(195, 175, 145, ' + (d.life * 0.32) + ')';
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r, d.r * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
            let s = sparks[i];
            s.x += s.vx; s.y += s.vy; s.vy += 0.22; s.life -= 0.055;
            if (s.life <= 0) { sparks.splice(i, 1); continue; }
            ctx.strokeStyle = s.cor;
            ctx.globalAlpha = s.life;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        for (let i = glints.length - 1; i >= 0; i--) {
            let gl = glints[i];
            gl.life -= 0.045;
            if (gl.life <= 0) { glints.splice(i, 1); continue; }
            ctx.fillStyle = 'rgba(255, 240, 150, ' + (gl.life * 0.65) + ')';
            ctx.beginPath();
            ctx.arc(gl.x, gl.y, 1.0 + gl.life * 1.0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (agora % 1400 < 30 && glints.length < 4) {
            glints.push({ x: 8 + Math.random() * 10, y: 7 + Math.random() * 8, life: 1 });
        }
        if ((agora - lastDust) > 120) {
            lastDust = agora;
            if ((typeof window.walkCycle === 'number') && Math.abs(Math.sin(window.walkCycle * Math.PI * 2)) > 0.65) {
                let lado = (Math.sin(window.walkCycle * Math.PI * 2) > 0) ? 1 : -1;
                dust.push({ x: 12 + lado * 3 + (Math.random() - 0.5), y: 30, vx: -0.5 - Math.random() * 0.5, vy: -0.25 - Math.random() * 0.3, life: 0.9, r: 1.8 + Math.random() * 1.6 });
            }
        }
    }

    function desenharFormaRenovadaGuerreiro(ctx, corCapa, passo, movendo, defendendo, dano) {
        const capeColor = corCapa || '#8e2734';
        const legSwing = movendo ? Math.sin(passo * Math.PI * 2) * 2.2 : 0;
        const crouch = defendendo ? 1.2 : 0;
        const chestBreath = 0.5 + 0.5 * Math.sin(_agora() / 760);
        const chestLift = chestBreath * 1.25;

        // Capa curta recortada, visivel atras da armadura.
        ctx.save();
        ctx.fillStyle = _grad(ctx, 4, 7, 20, 29, [
            0, capeColor,
            0.62, capeColor,
            1, '#381d2a'
        ]);
        ctx.beginPath();
        ctx.moveTo(6, 7);
        ctx.quadraticCurveTo(12, 5.5, 18, 7);
        ctx.lineTo(20, 15);
        ctx.lineTo(18 + legSwing * 0.25, 24);
        ctx.lineTo(15, 22);
        ctx.lineTo(12, 26);
        ctx.lineTo(9, 22);
        ctx.lineTo(5, 25);
        ctx.lineTo(4, 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#291c27';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,220,190,0.38)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(7, 10);
        ctx.quadraticCurveTo(10, 16, 9 + legSwing * 0.2, 22);
        ctx.moveTo(16, 9);
        ctx.quadraticCurveTo(14, 15, 15, 21);
        ctx.stroke();
        ctx.restore();

        // Pernas articuladas com botas largas para uma silhueta mais robusta.
        ctx.lineCap = 'round';
        [
            { x: 8.5, swing: -legSwing },
            { x: 15.5, swing: legSwing }
        ].forEach(function (leg, index) {
            const hipY = 20 - crouch;
            const kneeX = leg.x + leg.swing * 0.55;
            const kneeY = 24;
            const footX = leg.x + leg.swing;
            const footY = 29.5;

            ctx.strokeStyle = '#19232e';
            ctx.lineWidth = 5.5;
            _lin(ctx, leg.x, hipY, kneeX, kneeY);
            ctx.strokeStyle = index === 0 ? '#526477' : '#3d4d60';
            ctx.lineWidth = 3.8;
            _lin(ctx, leg.x, hipY, kneeX, kneeY);

            ctx.fillStyle = '#9aa9b5';
            ctx.beginPath();
            ctx.moveTo(kneeX - 2.1, kneeY - 1.4);
            ctx.lineTo(kneeX + 1.8, kneeY - 1.2);
            ctx.lineTo(kneeX + 2.2, kneeY + 1.1);
            ctx.lineTo(kneeX - 1.3, kneeY + 1.8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#202a36';
            ctx.lineWidth = 0.7;
            ctx.stroke();

            ctx.strokeStyle = '#687b8d';
            ctx.lineWidth = 3.2;
            _lin(ctx, kneeX, kneeY + 1, footX, footY - 1);
            ctx.fillStyle = '#202a35';
            ctx.beginPath();
            ctx.moveTo(footX - 2.8, footY - 1.6);
            ctx.lineTo(footX + 2.1, footY - 1.4);
            ctx.lineTo(footX + 3.4, footY + 0.8);
            ctx.lineTo(footX + 2.2, footY + 1.5);
            ctx.lineTo(footX - 3.2, footY + 1.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#0e1720';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(209,225,234,0.58)';
            ctx.lineWidth = 0.65;
            _lin(ctx, footX - 1.2, footY - 0.8, footX + 1.7, footY - 0.7);
        });

        // Cota curta e peitoral sobrepostos em placas de aço azul-escuro.
        ctx.fillStyle = '#202c39';
        ctx.beginPath();
        ctx.moveTo(5.2, 17);
        ctx.lineTo(18.8, 17);
        ctx.lineTo(19.8, 21.5);
        ctx.lineTo(17.5, 23.2);
        ctx.lineTo(6.3, 23.2);
        ctx.lineTo(4.2, 21.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#101923';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        for (let x = 7; x <= 17; x += 2) {
            ctx.fillStyle = '#82919a';
            ctx.fillRect(x, 19.3, 0.8, 0.8);
            ctx.fillRect(x + 0.8, 20.2, 0.8, 0.8);
        }

        ctx.fillStyle = '#542b32';
        ctx.fillRect(5.2, 17.4, 13.6, 2.2);
        ctx.fillStyle = '#d5b36a';
        ctx.fillRect(10.3, 17.4, 3.3, 2.2);
        ctx.save();
        ctx.translate(12, 13.5 - crouch - chestLift);
        ctx.scale(1 + chestBreath * 0.12, 1 + chestBreath * 0.16);
        ctx.translate(-12, -13.5 + crouch);
        ctx.fillStyle = '#283646';
        ctx.beginPath();
        ctx.moveTo(5.2, 8.8 - crouch);
        ctx.quadraticCurveTo(11.8, 5.7 - crouch, 18.8, 8.5 - crouch);
        ctx.lineTo(20.1, 14.8);
        ctx.quadraticCurveTo(19.4, 18.1, 16.2, 19);
        ctx.lineTo(7.6, 19);
        ctx.quadraticCurveTo(4.5, 17.4, 4.2, 14.7);
        ctx.closePath();
        ctx.fillStyle = _grad(ctx, 5, 8, 20, 18, [
            0, '#a7b7c1',
            0.24, '#657889',
            0.58, '#354657',
            1, '#1b2632'
        ]);
        ctx.fill();
        ctx.strokeStyle = '#101923';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Peitoral central em vermelho escuro com insígnia de lança.
        ctx.fillStyle = '#6e3038';
        ctx.beginPath();
        ctx.moveTo(8.2, 9.1 - crouch);
        ctx.lineTo(12, 8.2 - crouch);
        ctx.lineTo(15.8, 9.1 - crouch);
        ctx.lineTo(15.1, 15.5);
        ctx.lineTo(12, 17.2);
        ctx.lineTo(8.9, 15.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d1b16d';
        ctx.lineWidth = 0.75;
        ctx.stroke();
        ctx.strokeStyle = '#f0d99c';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(12, 10);
        ctx.lineTo(12, 14.2);
        ctx.moveTo(10.4, 11.7);
        ctx.lineTo(12, 10.5);
        ctx.lineTo(13.6, 11.7);
        ctx.stroke();
        ctx.fillStyle = '#e2bf74';
        ctx.beginPath();
        ctx.arc(12, 15.1, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ombreiras assimetricas e braçadeiras segmentadas.
        ctx.fillStyle = '#9aabb6';
        ctx.beginPath();
        ctx.moveTo(3.2, 8.5); ctx.lineTo(6.1, 6.3); ctx.lineTo(9.1, 7.5);
        ctx.lineTo(8.6, 11.1); ctx.lineTo(5.4, 12.1); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#202a36'; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.fillStyle = '#b9c5ca';
        ctx.beginPath();
        ctx.moveTo(15.5, 7.5); ctx.lineTo(18.4, 6.8); ctx.lineTo(21, 9);
        ctx.lineTo(19.1, 12); ctx.lineTo(16.2, 11.2); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#202a36'; ctx.stroke();
        ctx.fillStyle = '#d8b46c';
        ctx.beginPath(); ctx.arc(6.2, 9.2, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(18.2, 9.2, 0.7, 0, Math.PI * 2); ctx.fill();

        ctx.lineCap = 'round';
        ctx.strokeStyle = '#17222d';
        ctx.lineWidth = 4.2;
        _lin(ctx, 5.2, 10.5, 4.6, 15.1);
        _lin(ctx, 18.6, 10.5, 19.1, 14.3);
        ctx.strokeStyle = '#728493';
        ctx.lineWidth = 2.8;
        _lin(ctx, 5, 12.3, 4.5, 15.4);
        _lin(ctx, 18.7, 12.1, 19.2, 14.6);
        ctx.fillStyle = '#263442';
        ctx.beginPath(); ctx.arc(4.5, 15.6, 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(19.3, 14.8, 1.6, 0, Math.PI * 2); ctx.fill();

        // Capacete fechado, visor luminoso e crista de tecido.
        ctx.fillStyle = capeColor;
        ctx.beginPath();
        ctx.moveTo(8, 5.4);
        ctx.quadraticCurveTo(8, 0.8, 12.1, 0.3);
        ctx.quadraticCurveTo(16.7, 0.7, 17, 5.1);
        ctx.lineTo(14.9, 7.6);
        ctx.lineTo(9.1, 7.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#311d27'; ctx.lineWidth = 1; ctx.stroke();

        ctx.fillStyle = '#758796';
        ctx.beginPath();
        ctx.moveTo(8.1, 5.1);
        ctx.quadraticCurveTo(8.2, 1.1, 12.2, 1.2);
        ctx.quadraticCurveTo(16.1, 1.1, 16.7, 5.1);
        ctx.lineTo(15.7, 7.8);
        ctx.lineTo(9.2, 7.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#17212b'; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.fillStyle = '#101923';
        ctx.beginPath();
        ctx.moveTo(9.2, 3.8); ctx.lineTo(15.7, 3.8); ctx.lineTo(15.2, 5.1); ctx.lineTo(9.5, 5.1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6fe2df';
        ctx.fillRect(10, 4.15, 1.7, 0.45);
        ctx.fillRect(13.2, 4.15, 1.7, 0.45);
        ctx.strokeStyle = '#d5b36a'; ctx.lineWidth = 1;
        _lin(ctx, 12.5, 1.6, 12.5, 7.2);
        ctx.fillStyle = '#e8cf91';
        ctx.fillRect(11.9, 1.9, 1.2, 0.7);

        if (dano) {
            ctx.fillStyle = 'rgba(255,70,60,0.32)';
            ctx.beginPath();
            ctx.moveTo(5.2, 8.8 - crouch);
            ctx.quadraticCurveTo(11.8, 5.7 - crouch, 18.8, 8.5 - crouch);
            ctx.lineTo(20.1, 14.8);
            ctx.quadraticCurveTo(19.4, 18.1, 16.2, 19);
            ctx.lineTo(7.6, 19);
            ctx.quadraticCurveTo(4.5, 17.4, 4.2, 14.7);
            ctx.closePath();
            ctx.fill();
        }
    }

    function desenharEscudoRenovado(ctx, x, y, w, h) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#15212d';
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.quadraticCurveTo(w * 0.5, -1.5, w, 1);
        ctx.lineTo(w - 0.5, h * 0.57);
        ctx.quadraticCurveTo(w * 0.82, h * 0.84, w * 0.5, h);
        ctx.quadraticCurveTo(w * 0.18, h * 0.84, 0.5, h * 0.57);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d5b36a'; ctx.lineWidth = 1.2; ctx.stroke();

        ctx.fillStyle = _grad(ctx, 1.5, 1, w - 1, h, [
            0, '#496173', 0.5, '#283c50', 1, '#162431'
        ]);
        ctx.beginPath();
        ctx.moveTo(2, 2.5);
        ctx.quadraticCurveTo(w * 0.5, 1, w - 2, 2.5);
        ctx.lineTo(w - 2.2, h * 0.55);
        ctx.quadraticCurveTo(w * 0.78, h * 0.81, w * 0.5, h - 2);
        ctx.quadraticCurveTo(w * 0.22, h * 0.81, 2.2, h * 0.55);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#8f3540';
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 4);
        ctx.lineTo(w * 0.74, h * 0.42);
        ctx.lineTo(w * 0.5, h * 0.7);
        ctx.lineTo(w * 0.26, h * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e8cf91'; ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.19);
        ctx.lineTo(w * 0.5, h * 0.52);
        ctx.moveTo(w * 0.35, h * 0.34);
        ctx.lineTo(w * 0.5, h * 0.22);
        ctx.lineTo(w * 0.65, h * 0.34);
        ctx.stroke();
        ctx.restore();
    }

    function desenharEscudoNaDirecao(ctx, angulo, y, w, h) {
        const x = Math.cos(angulo || 0) >= 0 ? -6.5 : 15.5;
        desenharEscudoRenovado(ctx, x, y + 5, w, h);
    }

    function desenharEquipamentosFlutuantes(ctx, anguloMira, atk, armaVisual, agora) {
        const oscilacao = Math.sin(agora / 240) * 1.1;
        ctx.save();
        ctx.translate(-7, -11 + oscilacao);
        desenharEscudoRenovado(ctx, 0, 0, 15, 23);
        ctx.restore();
        desenharLancaFlutuante(ctx, anguloMira, atk, armaVisual, agora);
    }

    /* ============================================================
       DESENHADOR PRINCIPAL DO GUERREIRO — ASSINATURA INALTERADA
       (x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid, anguloMovimento)
       ============================================================ */
    window.desenharGuerreiro = function (x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid, anguloMovimento) {
        if (hp <= 0 || !window.ctx) return;
        let ctx = window.ctx;
        ctx.save();
        ctx.translate(x, y);

        let armaVisual = null;
        if (pid === window.meuId) {
            if (window.inventario && window.inventario.arma) {
                armaVisual = {
                    nome: window.inventario.arma.nome,
                    raridade: window.inventario.arma.raridade,
                    customVisual: window.inventario.arma.customVisual || null
                };
            }
        } else if (pid && window.players && window.players[pid] && window.players[pid].armaVisual) {
            armaVisual = window.players[pid].armaVisual;
        }

        let agora = _agora();
        let pctHp = (maxHp && maxHp > 0) ? (hp / maxHp) : 1;
        let resp = Math.sin(agora / 680);
        let passo = (typeof window.walkCycle === 'number') ? window.walkCycle : 0;
        if (pid && pid !== window.meuId) {
            let passoRemoto = window.guerreiroPassos[pid];
            if (!passoRemoto) passoRemoto = window.guerreiroPassos[pid] = { fase: 0, atualizadoEm: agora };
            let dtPasso = Math.max(0, Math.min(0.05, (agora - passoRemoto.atualizadoEm) / 1000));
            passoRemoto.atualizadoEm = agora;
            if (isMoving) passoRemoto.fase += dtPasso * 2.6;
            passo = passoRemoto.fase;
        }
        let dano = (window.danoFlashTimer || 0) > 0;
        let pidK = pid || '';
        let dadosJogador = (pidK && window.todosJogadores && window.todosJogadores[pidK]) || null;
        let guardiaoAte = dadosJogador ? (dadosJogador.guerreiroBuffAte || 0) : 0;
        if (pidK === window.meuId) guardiaoAte = Math.max(guardiaoAte, window.guerreiroBuffAte || 0);
        let guardiaoAtivo = guardiaoAte > Date.now();

        // Recuo elástico do Grito de Provocação (mantido)
        let prepTimer = window.guerreiroPrepTimers[pidK] || 0;
        if (prepTimer > 0) {
            let fPrep = Math.min(1.0, prepTimer / 10);
            ctx.translate(12, 16);
            ctx.scale(1.0 + Math.sin(fPrep * Math.PI) * 0.12, 1.0 - Math.sin(fPrep * Math.PI) * 0.16);
            ctx.translate(-12, -16);
        }

        let angulo = anguloBase;
        let progressoGiro = 0;
        if (isSpinning) {
            progressoGiro = (30 - (spinTimer || 0)) / 30;
            angulo = anguloBase + (progressoGiro * Math.PI * 10);
        }

        let defIni = window.guerreiroDefesas[pidK] || 0;
        let defesa = (prepTimer > 0) || (defIni && (agora - defIni) < 620);

        let escudoDash = false;
        if (pidK) {
            if (pidK === window.meuId) escudoDash = !!window.escudoGuerreiroAtivo;
            else {
                const reg = window.guerreiroEscudoDe;
                escudoDash = !!(reg && reg[pidK]);
            }
        }
        if (escudoDash) defesa = true;

        // Aura da Passiva
        if (pctHp <= 0.50) desenharAuraUltimoFolego(ctx, pctHp, Date.now());

        // SKILL 1: Aura do Vanguarda (Cúpula Dourada de Proteção)
        if (guardiaoAtivo) desenharAuraVanguarda(ctx, Date.now());

        // Postura defensiva baixa
        if (defesa) ctx.translate(0.6, 1.4);

        // ROTAÇÃO DO CORPO NO TORNADO (GIRO)
        if (isSpinning) {
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(-12, -16);
        }

        let atk = 0;
        let corteIni = window.guerreiroCortes[pidK] || 0;
        if (corteIni) atk = Math.max(0, Math.min(1, (agora - corteIni) / 380));

        const anguloSprite = isMoving && Number.isFinite(anguloMovimento)
            ? anguloMovimento
            : (Number.isFinite(anguloBase) ? anguloBase : 0);
        const olhandoParaCima = Math.sin(anguloSprite) < -Math.SQRT1_2;
        if (olhandoParaCima) desenharEquipamentosFlutuantes(ctx, anguloBase, atk, armaVisual, agora);
        desenharSpriteGuerreiro(ctx, Boolean(isMoving), anguloSprite, pidK || '__local__', agora);
        if (!olhandoParaCima) desenharEquipamentosFlutuantes(ctx, anguloBase, atk, armaVisual, agora);

        // Faíscas de bloqueio locais
        if (pidK === window.meuId) {
            if (dano) {
                let n = 3 + Math.floor(Math.random() * 2);
                for (let i = 0; i < n; i++) {
                    sparks.push({
                        x: 8 + Math.random() * 8,
                        y: 8 + Math.random() * 12,
                        vx: (Math.random() - 0.5) * 2.8,
                        vy: -1.2 - Math.random() * 1.8,
                        life: 1,
                        cor: Math.random() > 0.4 ? '#f1c40f' : '#ecf0f1'
                    });
                }
            }
            atualizarParticulas(ctx, agora);
        }

        if (isSpinning) ctx.restore(); // fim da rotação do corpo

        // SKILL 2: Efeito Visual do Giro do Vanguarda (Arcos de Lança)
        if (isSpinning) desenharGiroLanca(ctx, progressoGiro);

        ctx.restore();
    };

    window.enviarAtaqueGuerreiro = function (ws) {
        if (window.estaMorto) return;
        if (typeof window.registrarCorteGuerreiro === 'function') window.registrarCorteGuerreiro(window.meuId);
        if (typeof window.tocarSomCorte === 'function') window.tocarSomCorte();
        if (typeof window.criarEfeitoCorte === 'function') window.criarEfeitoCorte(window.meuX + 12, window.meuY + 16, window.meuAngulo);
        if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'corte' })); }
    };

})();