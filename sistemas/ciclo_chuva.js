'use strict';

const INTENSIDADES = ['fraca', 'media', 'tempestade'];

const CONFIGURACAO = Object.freeze({
    esperaMinimaMs: 3 * 60 * 1000,
    esperaMaximaMs: 15 * 60 * 1000,
    chuvaMinimaMs: 3 * 60 * 1000,
    chuvaMaximaMs: 30 * 60 * 1000,
    trocaIntensidadeMinimaMs: 30 * 1000,
    trocaIntensidadeMaximaMs: 60 * 1000
});

function criarCicloChuva(opcoes) {
    const configuracao = Object.assign({}, CONFIGURACAO, opcoes || {});
    const random = opcoes && typeof opcoes.random === 'function' ? opcoes.random : Math.random;
    const agoraInicial = opcoes && Number.isFinite(opcoes.agoraInicial) ? opcoes.agoraInicial : Date.now();

    function intervalo(minimo, maximo) {
        const amostra = Math.max(0, Math.min(0.999999999, Number(random()) || 0));
        return Math.floor(minimo + amostra * (maximo - minimo + 1));
    }

    let chuvaAtiva = false;
    let intensidade = 'fraca';
    let indiceIntensidade = 0;
    let proximaChuvaEm = agoraInicial + intervalo(configuracao.esperaMinimaMs, configuracao.esperaMaximaMs);
    let chuvaTerminaEm = 0;
    let trocaIntensidadeEm = 0;
    let controleManual = false;

    function estado() {
        return { chuvaAtiva: chuvaAtiva, intensidade: intensidade };
    }

    function atualizar(agora) {
        if (controleManual) return estado();

        while (agora >= (chuvaAtiva ? chuvaTerminaEm : proximaChuvaEm)) {
            if (chuvaAtiva) {
                chuvaAtiva = false;
                intensidade = 'fraca';
                proximaChuvaEm = chuvaTerminaEm +
                    intervalo(configuracao.esperaMinimaMs, configuracao.esperaMaximaMs);
                trocaIntensidadeEm = 0;
                continue;
            }

            chuvaAtiva = true;
            chuvaTerminaEm = proximaChuvaEm +
                intervalo(configuracao.chuvaMinimaMs, configuracao.chuvaMaximaMs);
            indiceIntensidade = intervalo(0, INTENSIDADES.length - 1);
            intensidade = INTENSIDADES[indiceIntensidade];
            trocaIntensidadeEm = proximaChuvaEm +
                intervalo(configuracao.trocaIntensidadeMinimaMs, configuracao.trocaIntensidadeMaximaMs);
        }

        if (chuvaAtiva) {
            while (agora >= trocaIntensidadeEm && trocaIntensidadeEm < chuvaTerminaEm) {
                indiceIntensidade = (indiceIntensidade + 1) % INTENSIDADES.length;
                intensidade = INTENSIDADES[indiceIntensidade];
                trocaIntensidadeEm += intervalo(
                    configuracao.trocaIntensidadeMinimaMs,
                    configuracao.trocaIntensidadeMaximaMs
                );
            }
        }

        return estado();
    }

    function definirManual(ativa, novaIntensidade, agora) {
        if (ativa) {
            chuvaAtiva = true;
            intensidade = novaIntensidade || intensidade;
            controleManual = true;
            chuvaTerminaEm = 0;
            trocaIntensidadeEm = 0;
            return estado();
        }

        chuvaAtiva = false;
        intensidade = 'fraca';
        controleManual = false;
        chuvaTerminaEm = 0;
        trocaIntensidadeEm = 0;
        proximaChuvaEm = agora + intervalo(configuracao.esperaMinimaMs, configuracao.esperaMaximaMs);
        return estado();
    }

    function definirIntensidadeManual(novaIntensidade) {
        intensidade = novaIntensidade;
        controleManual = true;
        return estado();
    }

    return {
        atualizar: atualizar,
        definirManual: definirManual,
        definirIntensidadeManual: definirIntensidadeManual,
        estado: estado
    };
}

module.exports = {
    CONFIGURACAO: CONFIGURACAO,
    criarCicloChuva: criarCicloChuva
};
