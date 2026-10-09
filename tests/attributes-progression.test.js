'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const progression = require('../sistemas/progressao_atributos.js');

test('Vida concede cinco pontos de HP por ponto acima do inicial, sem bônus de Força', () => {
    assert.equal(progression.calcularVidaMaxima(1), 100);
    assert.equal(progression.calcularVidaMaxima(10), 145);
    assert.equal(progression.calcularVidaMaximaLacaio(0), 100);
    assert.equal(progression.calcularVidaMaximaLacaio(2), 110);
});

test('Força e Inteligência concedem dano plano por ponto acima do inicial', () => {
    assert.equal(progression.bonusDanoAtributo('forca', 11), 10);
    assert.equal(progression.bonusDanoAtributo('inteligencia', 11), 100);
});

test('ataques básicos mágicos recebem um de dano por ponto de Inteligência', () => {
    assert.equal(progression.bonusDanoAtaqueBasicoMagico(1), 0);
    assert.equal(progression.bonusDanoAtaqueBasicoMagico(11), 10);
});

test('Destreza concede chance crítica até o limite de 70%', () => {
    assert.equal(progression.chanceCriticaDestreza(1), 0.05);
    assert.equal(progression.chanceCriticaDestreza(10), 0.14);
    assert.equal(progression.chanceCriticaDestreza(100), 0.70);
});

test('Profanidade concede 1% de dano periódico por ponto acima do inicial', () => {
    assert.equal(progression.multiplicadorDanoPeriodico(1), 1);
    assert.equal(progression.multiplicadorDanoPeriodico(11), 1.1);
});

test('snapshot de herança arredonda 10% dos atributos efetivos', () => {
    assert.deepEqual(progression.snapshotAtributosHerdados({
        forca: 15,
        inteligencia: 24,
        agilidade: 10,
        destreza: 5,
        vida: 11,
        profanidade: 14,
        divindade: 6,
        afinidade: 8
    }), {
        forca: 2,
        inteligencia: 2,
        agilidade: 1,
        destreza: 1,
        vida: 1,
        profanidade: 1,
        divindade: 1,
        afinidade: 1
    });
});
