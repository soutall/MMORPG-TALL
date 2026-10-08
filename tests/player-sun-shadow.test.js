'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'sombra-solar.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function criarSombra(hora) {
    const desenhos = [];
    const ctx = {
        save() {},
        restore() {},
        beginPath() {},
        fill() {},
        ellipse(...args) {
            desenhos.push({ args, alpha: this.globalAlpha });
        }
    };
    const window = {};
    vm.runInNewContext(source, { window, Math, Number });
    const desenhada = window.desenharSombraSolarJogador(ctx, 100, 200, hora);
    return { desenhada, sombra: desenhos[0] };
}

test('player sunlight shadow changes direction and length with authoritative world time', () => {
    const manha = criarSombra(8);
    const meioDia = criarSombra(12);
    const tarde = criarSombra(16);

    assert.equal(manha.desenhada, true);
    assert.equal(meioDia.desenhada, true);
    assert.equal(tarde.desenhada, true);
    assert.notDeepEqual(manha.sombra.args, meioDia.sombra.args);
    assert.notDeepEqual(meioDia.sombra.args, tarde.sombra.args);
    assert.ok(manha.sombra.args[0] > 100);
    assert.ok(tarde.sombra.args[0] < 100);
    assert.ok(manha.sombra.args[2] > meioDia.sombra.args[2]);
    assert.ok(meioDia.sombra.alpha >= 0.45, 'midday shadow should be clearly visible');
    assert.ok(meioDia.sombra.args[1] - 200 >= 45,
        'midday shadow should extend beyond the player sprite instead of hiding under it');
    assert.ok(meioDia.sombra.args[2] >= 30, 'shadow should be broad enough to read against the map');
});

test('sunlight shadow fades near dawn and dusk and is absent at night', () => {
    const dawn = criarSombra(6);
    const dusk = criarSombra(17.9);
    const night = criarSombra(23);

    assert.equal(dawn.desenhada, true);
    assert.equal(dawn.sombra.alpha, 0);
    assert.equal(dusk.desenhada, true);
    assert.ok(dusk.sombra.alpha < 0.03);
    assert.equal(night.desenhada, false);
    assert.equal(night.sombra, undefined);
});

test('the solar shadow prototype stays disabled in the client', () => {
    assert.doesNotMatch(clientSource, /sombra-solar\.js/);
    assert.doesNotMatch(clientSource, /window\.desenharSombraSolarJogador\(/);
    assert.match(clientSource, /const GAME_VERSION = 'v1\.75\.95'/);
});
