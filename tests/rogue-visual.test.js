'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rogueSource = fs.readFileSync(path.join(__dirname, '..', 'classes', 'ladino.js'), 'utf8');
const effectsSource = fs.readFileSync(path.join(__dirname, '..', 'efeitos', 'ladino_efeitos.js'), 'utf8');

function createCanvasContext() {
    const calls = { fills: 0, strokes: 0, gradients: 0, bars: 0 };
    const gradient = { addColorStop() {} };
    const ctx = new Proxy({
        globalAlpha: 1,
        calls,
        createRadialGradient() { calls.gradients++; return gradient; },
        createLinearGradient() { calls.gradients++; return gradient; },
        fill() { calls.fills++; },
        fillRect() { calls.fills++; },
        stroke() { calls.strokes++; },
        save() {},
        restore() {}
    }, {
        get(target, key) {
            if (key in target) return target[key];
            return function () {};
        }
    });
    return ctx;
}

test('the rogue keeps its renderer API and draws the new hooded double-dagger silhouette', () => {
    const ctx = createCanvasContext();
    const window = {
        ctx,
        walkCycle: 0.3,
        inventario: { arma: { customVisual: { cBase: '#123456' } } },
        desenharBarraHp() { ctx.calls.bars++; }
    };
    const sandbox = vm.createContext({ window, Date, Math });
    vm.runInContext(rogueSource, sandbox, { filename: 'classes/ladino.js' });

    assert.equal(typeof window.desenharLadino, 'function');
    assert.doesNotThrow(() => window.desenharLadino(100, 120, false, 0.5, 100, 100));
    assert.doesNotThrow(() => window.desenharLadino(100, 120, true, 2.1, 70, 100));
    assert.ok(ctx.calls.fills > 20, 'the layered cloak, armor, face, and daggers should render');
    assert.ok(ctx.calls.strokes > 8, 'the outfit should include sharp layered details');
    assert.equal(ctx.calls.bars, 2, 'the existing health bar callback remains available');

    const fillsBeforeDeadRender = ctx.calls.fills;
    window.desenharLadino(100, 120, false, 0, 0, 100);
    assert.equal(ctx.calls.fills, fillsBeforeDeadRender, 'dead characters remain hidden');
});

test('remote rogue walk animation advances independently from the local walk cycle', () => {
    const ctx = createCanvasContext();
    let time = 1000;
    const window = {
        ctx,
        meuId: 'local',
        walkCycle: 0,
        desenharBarraHp() {}
    };
    const sandbox = vm.createContext({
        window,
        Date: { now: () => time },
        Math
    });

    test('the rogue basic attack creates two staggered dagger slashes', () => {
        const window = {};
        vm.runInNewContext(effectsSource, { window, Date, Math });
        window.criarAnimacaoAdagaBasica(20, 30, 0.4);

        assert.equal(window.ladinoCortes.length, 2);
        assert.notEqual(window.ladinoCortes[0].ang, window.ladinoCortes[1].ang);
        assert.equal(window.ladinoCortes[0].atraso, 0);
        assert.equal(window.ladinoCortes[1].atraso, 0.11);
        assert.equal(typeof window.criarSangueLadino, 'function',
            'confirmed hits can display the dagger damage reaction');
    });
    vm.runInContext(rogueSource, sandbox, { filename: 'classes/ladino.js' });

    window.desenharLadino(100, 120, true, 0, 100, 100, 'remote');
    const initialPhase = window.ladinoPassos.remote.phase;
    time += 200;
    window.desenharLadino(100, 120, true, 0, 100, 100, 'remote');

    assert.ok(window.ladinoPassos.remote.phase > initialPhase,
        'a remote player should get an advancing gait phase while reported as moving');
    assert.equal(window.walkCycle, 0, 'the remote gait must not rely on or modify the local cycle');
});

test('poison haze and Death Star render layered animation while preserving server coordinates', () => {
    const ctx = createCanvasContext();
    const points = [
        { x: 100, y: 20 }, { x: 124, y: 88 }, { x: 65, y: 45 },
        { x: 135, y: 45 }, { x: 76, y: 88 }
    ];
    const window = {
        ctx,
        gasesVeneno: [{ x: 100, y: 60, raio: 80, tempo: 80 }],
        ladinoQueda: { x: 100, y: 60, vida: 1 }
    };
    const sandbox = vm.createContext({ window, Date, Math });
    vm.runInContext(effectsSource, sandbox, { filename: 'efeitos/ladino_efeitos.js' });
    window.criarEstrelaLadino(100, 60, 80, points);
    window.criarPuffVeneno(100, 60, 40, true);

    assert.doesNotThrow(() => window.desenharEfeitosLadino());
    assert.ok(ctx.calls.gradients >= 6, 'the poison cloud and puffs should use soft layered volumes');
    assert.ok(ctx.calls.strokes >= 10, 'the star, orbit rings, vertex markers, and impact beam should draw');
    assert.equal(window.ladinoEstrelaVisual.cx, 100, 'the visual retains the server-provided center');
    assert.equal(window.ladinoEstrelaVisual.cy, 60, 'the visual retains the server-provided center');
    assert.equal(window.gasesVeneno[0].x, 100, 'the poison zone remains server-positioned');
    assert.equal(window.gasesVeneno[0].y, 60, 'the poison zone remains server-positioned');
});
