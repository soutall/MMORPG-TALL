(function (window) {
    'use strict';

    const baseSprites = new URL('../sprites/classes/curandeira/', document.currentScript.src);
    const direcoesAndando = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    const direcoesParada = ['east', 'south', 'west', 'north'];
    const grupos = Object.create(null);
    const direcoesJogadores = Object.create(null);
    const posicoesJogadores = Object.create(null);
    const ultimosFrames = Object.create(null);
    const escalaSprite = 1;

    function obterDirecao(angulo, andando, idJogador) {
        const quantidadeSetores = andando ? direcoesAndando.length : direcoesParada.length;
        const larguraSetor = Math.PI * 2 / quantidadeSetores;
        const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
        const estadoAnterior = direcoesJogadores[idJogador];
        let setor = ((Math.round(anguloSeguro / larguraSetor) % quantidadeSetores) + quantidadeSetores) % quantidadeSetores;

        if (estadoAnterior && estadoAnterior.andando === andando) {
            const centroAnterior = estadoAnterior.setor * larguraSetor;
            const diferenca = Math.atan2(
                Math.sin(anguloSeguro - centroAnterior),
                Math.cos(anguloSeguro - centroAnterior)
            );
            if (Math.abs(diferenca) < larguraSetor / 2 + Math.PI / 45) {
                setor = estadoAnterior.setor;
            }
        }

        direcoesJogadores[idJogador] = { andando: andando, setor: setor };
        return andando ? direcoesAndando[setor] : direcoesParada[setor];
    }

    function carregarGrupo(andando, direcao) {
        const animacao = andando ? 'walking' : 'Idle';
        const chave = animacao + ':' + direcao;
        if (grupos[chave]) return grupos[chave];

        const pasta = andando
            ? 'andando/animations/walking/'
            : 'parado/animations/Idle/';
        const grupo = { imagens: [], carregadas: 0, falhou: false };
        grupos[chave] = grupo;

        for (let i = 0; i < 8; i++) {
            const imagem = new Image();
            imagem.onload = function () {
                grupo.carregadas++;
            };
            imagem.onerror = function () {
                grupo.falhou = true;
                console.error('Falha ao carregar frame da Curandeira:', imagem.src);
            };
            imagem.src = new URL(pasta + direcao + '/frame_' + String(i).padStart(3, '0') + '.png', baseSprites).href;
            grupo.imagens.push(imagem);
        }
        return grupo;
    }

    direcoesParada.forEach(function (direcao) {
        carregarGrupo(false, direcao);
    });
    direcoesAndando.forEach(function (direcao) {
        carregarGrupo(true, direcao);
    });

    function obterFrameDisponivel(grupo, indice) {
        const frameAtual = grupo.imagens[indice];
        if (frameAtual && frameAtual.complete && frameAtual.naturalWidth > 0) return frameAtual;

        for (let distancia = 1; distancia < grupo.imagens.length; distancia++) {
            const anterior = grupo.imagens[(indice - distancia + grupo.imagens.length) % grupo.imagens.length];
            const seguinte = grupo.imagens[(indice + distancia) % grupo.imagens.length];
            if (anterior && anterior.complete && anterior.naturalWidth > 0) return anterior;
            if (seguinte && seguinte.complete && seguinte.naturalWidth > 0) return seguinte;
        }
        return null;
    }

    function alinharPosicaoNaGrade(ctx, x, y) {
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

    window.desenharCurandeiro = function (x, y, isMoving, angulo, hp, maxHp, pid, anguloMovimento) {
        if (hp <= 0 || !window.ctx) return;

        const ctx = window.ctx;
        const andando = Boolean(isMoving);
        const idJogador = pid || '__local__';
        const posicaoAnterior = posicoesJogadores[idJogador];
        let anguloCorpo = Number.isFinite(angulo) ? angulo : 0;

        if (andando && Number.isFinite(anguloMovimento)) {
            anguloCorpo = anguloMovimento;
        } else if (andando && posicaoAnterior) {
            const dx = x - posicaoAnterior.x;
            const dy = y - posicaoAnterior.y;
            if (Math.hypot(dx, dy) > 0.5) anguloCorpo = Math.atan2(dy, dx);
        }
        posicoesJogadores[idJogador] = { x: x, y: y };

        const direcao = obterDirecao(anguloCorpo, andando, idJogador);
        const grupo = carregarGrupo(andando, direcao);
        const indice = Math.floor(Date.now() / (andando ? 110 : 160)) % grupo.imagens.length;
        let imagem = obterFrameDisponivel(grupo, indice);
        if (imagem) ultimosFrames[idJogador] = imagem;
        else imagem = ultimosFrames[idJogador];

        const posicaoRender = alinharPosicaoNaGrade(ctx, x, y);
        ctx.save();
        try {
            ctx.translate(posicaoRender.x, posicaoRender.y);

            if (imagem && imagem.complete && imagem.naturalWidth > 0) {
                const suavizacaoAnterior = ctx.imageSmoothingEnabled;
                const qualidadeSuavizacaoAnterior = ctx.imageSmoothingQuality;
                const larguraSprite = imagem.naturalWidth * escalaSprite;
                const alturaSprite = imagem.naturalHeight * escalaSprite;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                try {
                    ctx.drawImage(imagem, -36, -47, larguraSprite, alturaSprite);
                } finally {
                    ctx.imageSmoothingEnabled = suavizacaoAnterior;
                    ctx.imageSmoothingQuality = qualidadeSuavizacaoAnterior;
                }
            }

            if (typeof window.desenharCajadoLuzExposta === 'function') {
                const arma = window.inventario ? window.inventario.arma : null;
                const armaVisual = x === window.meuX && y === window.meuY && arma && arma.customVisual ? arma : null;
                const ladoStaff = Math.cos(anguloCorpo) >= 0 ? 1 : -1;
                const deslocamentoLateral = ladoStaff * 23;
                const flutuacao = Math.sin(Date.now() / 240 + (idJogador === '__local__' ? 0 : 1)) * 1.2;
                ctx.save();
                try {
                    ctx.translate(12 + deslocamentoLateral, 8 + flutuacao);
                    ctx.rotate(ladoStaff * Math.PI / 4);
                    window.desenharCajadoLuzExposta(ctx, armaVisual);
                } finally {
                    ctx.restore();
                }
            }
        } finally {
            ctx.restore();
        }

        if (typeof window.desenharBarraHp === 'function') {
            window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
        }
    };
})(window);
