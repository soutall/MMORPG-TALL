const assert = require('assert');
const { temVisaoNoturnaAprimorada, aplicarEscuridaoPorClasse } = require('../sistema_dia_noite.js');

assert.strictEqual(temVisaoNoturnaAprimorada('ladino'), true, 'Ladino deve ter a passiva de visão noturna');
assert.strictEqual(temVisaoNoturnaAprimorada('pikeman'), true, 'Pikeman deve ter a passiva de visão noturna');
assert.strictEqual(temVisaoNoturnaAprimorada('guerreiro'), false, 'Guerreiro não deve receber a passiva');

const estadoMadrugada = { horaDecimal: 1.5, escuridao: 0.97 };
const ajustado = aplicarEscuridaoPorClasse(estadoMadrugada, 'ladino');
assert.strictEqual(ajustado.escuridao, 0.90, 'Escuridão máxima para ladino deve ser 90% na madrugada');

const estadoNormal = aplicarEscuridaoPorClasse({ horaDecimal: 8, escuridao: 0.60 }, 'ladino');
assert.strictEqual(estadoNormal.escuridao, 0.60, 'Fora da madrugada, o breu não deve ser alterado');
console.log('night_vision_passive.test.js OK');
