const test = require('node:test');
const assert = require('node:assert/strict');
const ciclo = require('../sistema_dia_noite.js');

test('fixa horários exatos, mantém dia/noite e retoma o ciclo normal', function () {
    ciclo.definirHorarioFixo(12, 34);
    const meioDia = ciclo.calcularTempoMundo(0);
    assert.equal(meioDia.horaFormatada, '12:34');
    assert.equal(meioDia.fase, 'dia');
    assert.equal(meioDia.horarioTravado, true);

    ciclo.definirHorarioFixo(23, 59);
    const noite = ciclo.calcularTempoMundo(0);
    assert.equal(noite.horaFormatada, '23:59');
    assert.equal(noite.fase, 'noite');
    assert.equal(noite.horarioTravado, true);

    ciclo.retomarCicloNatural();
    assert.equal(ciclo.obterControleHorario().travado, false);
    assert.equal(ciclo.calcularTempoMundo(0).horarioTravado, false);
});

test('rejeita horas e minutos fora do intervalo', function () {
    assert.throws(function () { ciclo.definirHorarioFixo(24, 0); }, RangeError);
    assert.throws(function () { ciclo.definirHorarioFixo(12, 60); }, RangeError);
});
