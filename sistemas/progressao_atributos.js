'use strict';

const ATTRIBUTE_KEYS = [
    'forca', 'inteligencia', 'agilidade', 'destreza',
    'vida', 'profanidade', 'divindade', 'afinidade'
];

function valorSeguro(value) {
    return Number.isFinite(value) ? value : 1;
}

function snapshotAtributosHerdados(atributosEfetivos) {
    const effective = atributosEfetivos || {};
    return ATTRIBUTE_KEYS.reduce(function (inherited, key) {
        inherited[key] = Math.round(valorSeguro(effective[key]) * 0.10);
        return inherited;
    }, {});
}

function calcularVidaMaxima(vidaEfetiva) {
    return 100 + Math.max(0, valorSeguro(vidaEfetiva) - 1) * 5;
}

function calcularVidaMaximaLacaio(vidaHerdada) {
    const inheritedLife = Number.isFinite(vidaHerdada) ? Math.max(0, vidaHerdada) : 0;
    return 100 + inheritedLife * 5;
}

function bonusDanoAtributo(atributo, valorEfetivo) {
    const points = Math.max(0, valorSeguro(valorEfetivo) - 1);
    if (atributo === 'forca') return points;
    if (atributo === 'inteligencia') return points * 10;
    return 0;
}

function chanceCriticaDestreza(destrezaEfetiva) {
    const points = Math.max(0, valorSeguro(destrezaEfetiva) - 1);
    return Math.min(0.70, 0.05 + points * 0.01);
}

function multiplicadorDanoPeriodico(profanidadeEfetiva) {
    const points = Math.max(0, valorSeguro(profanidadeEfetiva) - 1);
    return 1 + points * 0.01;
}

module.exports = {
    ATTRIBUTE_KEYS,
    snapshotAtributosHerdados,
    calcularVidaMaxima,
    calcularVidaMaximaLacaio,
    bonusDanoAtributo,
    chanceCriticaDestreza,
    multiplicadorDanoPeriodico
};
