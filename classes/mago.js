// classes/mago.js — Sprites do corpo do Mago e orbes elementais
// ============================================================================
// O corpo usa os frames existentes de parado/andando; as orbes substituem o
// cajado e a aura arcana no chão permanece preservada.
// ============================================================================
(function () {
    'use strict';

    const baseSprites = new URL('../sprites/classes/mago/', document.currentScript.src);
    const direcoesAndando = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    const direcoesParado = ['east', 'south', 'west', 'north'];
    const grupos = Object.create(null);
    const direcoesJogadores = Object.create(null);
    const ultimosFrames = Object.create(null);
    let frameReserva = null;

    function carregarGrupo(andando, direcao) {
        const animacao = andando ? 'walking' : 'idle';
        const chave = animacao + ':' + direcao;
        if (grupos[chave]) return grupos[chave];

        const pasta = andando ? 'andando/animations/walking/' : 'Parado/animations/Idle/';
        const grupo = { imagens: [] };
        grupos[chave] = grupo;
        for (let i = 0; i < 8; i++) {
            const imagem = new Image();
            imagem.onload = function () {
                if (!frameReserva) frameReserva = imagem;
            };
            imagem.onerror = function () {
                console.error('Falha ao carregar frame do Mago:', imagem.src);
            };
            imagem.src = new URL(
                pasta + direcao + '/frame_' + String(i).padStart(3, '0') + '.png',
                baseSprites
            ).href;
            grupo.imagens.push(imagem);
        }
        return grupo;
    }

    function obterFrameDisponivel(grupo, indice) {
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

    function obterDirecao(angulo, andando, idJogador) {
        const direcoes = andando ? direcoesAndando : direcoesParado;
        const passoSetor = Math.PI * 2 / direcoes.length;
        const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
        const anterior = direcoesJogadores[idJogador];
        let setor = ((Math.round(anguloSeguro / passoSetor) % direcoes.length) + direcoes.length) % direcoes.length;
        if (anterior && anterior.andando === andando) {
            const centroAnterior = anterior.setor * passoSetor;
            const diferenca = Math.atan2(
                Math.sin(anguloSeguro - centroAnterior),
                Math.cos(anguloSeguro - centroAnterior)
            );
            if (Math.abs(diferenca) < passoSetor / 2 + Math.PI / 36) setor = anterior.setor;
        }
        direcoesJogadores[idJogador] = { andando: andando, setor: setor };
        return direcoes[setor];
    }

    function alinharNaGrade(ctx) {
        if (typeof ctx.getTransform !== 'function') return { x: 0, y: 0 };
        const transformacao = ctx.getTransform();
        const determinante = transformacao.a * transformacao.d - transformacao.b * transformacao.c;
        if (!Number.isFinite(determinante) || Math.abs(determinante) < 0.000001) return { x: 0, y: 0 };
        const deltaX = Math.round(transformacao.e) - transformacao.e;
        const deltaY = Math.round(transformacao.f) - transformacao.f;
        return {
            x: (transformacao.d * deltaX - transformacao.c * deltaY) / determinante,
            y: (-transformacao.b * deltaX + transformacao.a * deltaY) / determinante
        };
    }

    function desenharCorpo(ctx, andando, angulo, idJogador, agora) {
        const direcao = obterDirecao(angulo, andando, idJogador);
        const grupo = carregarGrupo(andando, direcao);
        const indice = Math.floor(agora / (andando ? 110 : 160)) % 8;
        let imagem = obterFrameDisponivel(grupo, indice);
        if (!imagem && frameReserva && frameReserva.complete && frameReserva.naturalWidth > 0) imagem = frameReserva;
        if (imagem) ultimosFrames[idJogador] = imagem;
        else imagem = ultimosFrames[idJogador];
        if (!imagem || !imagem.complete || imagem.naturalWidth <= 0) return;

        const escala = 1 / 1.3;
        const largura = imagem.naturalWidth * escala;
        const altura = imagem.naturalHeight * escala;
        const posicao = alinharNaGrade(ctx);
        const suavizacaoAnterior = ctx.imageSmoothingEnabled;
        const qualidadeAnterior = ctx.imageSmoothingQuality;
        ctx.save();
        ctx.translate(posicao.x, posicao.y);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        try {
            ctx.drawImage(imagem, 12 - largura / 2, 30 - altura, largura, altura);
        } finally {
            ctx.imageSmoothingEnabled = suavizacaoAnterior;
            ctx.imageSmoothingQuality = qualidadeAnterior;
            ctx.restore();
        }
    }

    function desenharOrbe(ctx, x, y, agora, deslocamentoFase) {
        const faseElemental = agora / 1000 + deslocamentoFase;
        const paletas = [
            { base: '#ff482f', luz: '#ffd08a', sombra: '#8f1e26' },
            { base: '#35aaff', luz: '#c8f5ff', sombra: '#164cba' },
            { base: '#ffd52f', luz: '#fff7a8', sombra: '#b46a17' }
        ];
        const elemento = Math.floor(faseElemental) % paletas.length;
        const proximaPaleta = paletas[(elemento + 1) % paletas.length];
        const fase = faseElemental - Math.floor(faseElemental);
        const transicaoSuave = fase * fase * (3 - 2 * fase);
        const misturarCores = function (corInicial, corFinal) {
            const inicio = parseInt(corInicial.slice(1), 16);
            const fim = parseInt(corFinal.slice(1), 16);
            const canais = [16, 8, 0].map(function (deslocamento) {
                const valorInicial = (inicio >> deslocamento) & 255;
                const valorFinal = (fim >> deslocamento) & 255;
                return Math.round(valorInicial + (valorFinal - valorInicial) * transicaoSuave);
            });
            return '#' + canais.map(function (canal) {
                return canal.toString(16).padStart(2, '0');
            }).join('');
        };
        const paletaAtual = paletas[elemento];
        const paleta = {
            base: misturarCores(paletaAtual.base, proximaPaleta.base),
            luz: misturarCores(paletaAtual.luz, proximaPaleta.luz),
            sombra: misturarCores(paletaAtual.sombra, proximaPaleta.sombra)
        };
        const semente = deslocamentoFase * 13.7 + x;
        const flutuacao = Math.sin(agora / 210 + semente) * 1.15;
        const rotacao = agora / (390 + deslocamentoFase * 170) + semente;
        const brilho = 0.78
            + Math.sin(agora / (105 + deslocamentoFase * 35) + semente) * 0.13
            + Math.sin(agora / (67 + deslocamentoFase * 19) + semente * 1.7) * 0.09;

        ctx.save();
        ctx.translate(x, y + flutuacao);
        ctx.globalAlpha = brilho;

        ctx.shadowColor = paleta.base;
        ctx.shadowBlur = 8;
        ctx.fillStyle = paleta.sombra;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        const gradiente = ctx.createRadialGradient(-1.4, -1.8, 0.3, 0, 0, 4.7);
        gradiente.addColorStop(0, paleta.luz);
        gradiente.addColorStop(0.45, paleta.base);
        gradiente.addColorStop(1, paleta.sombra);
        ctx.fillStyle = gradiente;
        ctx.beginPath();
        ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = paleta.luz;
        ctx.globalAlpha = brilho * 0.8;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = brilho;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.05;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (elemento === 0) {
            ctx.moveTo(-1.5, 1.5);
            ctx.quadraticCurveTo(-2.5, -0.1, -0.5, -1.7);
            ctx.quadraticCurveTo(-0.2, -0.4, 1.3, -0.4);
            ctx.quadraticCurveTo(2.1, 1.1, -1.5, 1.5);
        } else if (elemento === 1) {
            ctx.moveTo(0, -2.1);
            ctx.quadraticCurveTo(-0.5, -0.6, -1.4, 0.4);
            ctx.arc(0, 0.1, 1.5, Math.PI * 0.85, Math.PI * 0.15, true);
            ctx.quadraticCurveTo(0.5, -0.8, 0, -2.1);
        } else {
            ctx.moveTo(0.6, -2.2);
            ctx.lineTo(-1.2, 0.1);
            ctx.lineTo(0.1, 0.1);
            ctx.lineTo(-0.7, 2.1);
        }
        ctx.stroke();

        // Brilho de carga percorre continuamente a borda de cada orbe.
        const anguloBrilho = rotacao + fase * Math.PI * 2;
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = paleta.luz;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(Math.cos(anguloBrilho) * 5.5, Math.sin(anguloBrilho) * 5.5, 1.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function desenharOrbesElementais(ctx, agora) {
        desenharOrbe(ctx, -1, 6, agora, 0);
        desenharOrbe(ctx, 25, 6, agora, 0.37);
    }

    direcoesParado.forEach(function (direcao) { carregarGrupo(false, direcao); });
    direcoesAndando.forEach(function (direcao) { carregarGrupo(true, direcao); });

    window.desenharOrbesMagoExposta = function (ctx) {
        desenharOrbesElementais(ctx, Date.now());
    };

    window.desenharMago = function (x, y, isMoving, angulo, hp, maxHp, pid, anguloMovimento) {
        if (hp <= 0 || !window.ctx) return;
        if (window.vfxMagoFormaIgnea && window.vfxMagoFormaIgnea.ativo && Date.now() < window.vfxMagoFormaIgnea.expiraEm) {
            if (Math.hypot((window.meuX || 0) - x, (window.meuY || 0) - y) < 15) return;
        }

        const ctx = window.ctx;
        const t = Date.now() / 1000;
        const ang = Number.isFinite(angulo) ? angulo : 0;
        const andando = Boolean(isMoving);
        const idJogador = pid || '__local__';
        const anguloSprite = andando && Number.isFinite(anguloMovimento) ? anguloMovimento : ang;

        ctx.save();
        ctx.translate(x, y);

        const pulsoAura = 1 + Math.sin(t * 2.4) * 0.07;
        const gAura = ctx.createRadialGradient(12, 31.2, 0.5, 12, 31.2, 9.8);
        gAura.addColorStop(0, 'rgba(155, 89, 182, 0.22)');
        gAura.addColorStop(0.55, 'rgba(108, 52, 131, 0.09)');
        gAura.addColorStop(1, 'rgba(60, 30, 90, 0)');
        ctx.fillStyle = gAura;
        ctx.beginPath();
        ctx.ellipse(12, 31.2, 9.8 * pulsoAura, 3.6 * pulsoAura, 0, 0, Math.PI * 2);
        ctx.fill();

        desenharCorpo(ctx, andando, anguloSprite, idJogador, Date.now());

        desenharOrbesElementais(ctx, Date.now());
        ctx.restore();

        if (typeof window.desenharBarraHp === 'function') {
            window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
        }
    };

})();

window.enviarAtaqueMago = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSonoro === 'function') window.tocarSonoro('mago_atk');
    else if (typeof window.tocarSomMagiaBasica === 'function') window.tocarSomMagiaBasica();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_mago', angulo: anguloDisparo })); }
};
