'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sniperSource = fs.readFileSync(path.join(__dirname, '..', 'classes', 'sniper.js'), 'utf8');

function criarContexto() {
    const calls = { fills: 0, strokes: 0, ellipses: 0, leafCurves: 0, transforms: [], shapes: [], colors: [], healthBars: 0, rifles: 0 };
    const ctx = new Proxy({
        calls,
        fill() { calls.fills++; },
        fillRect() { calls.fills++; },
        stroke() { calls.strokes++; },
        strokeRect() { calls.strokes++; },
        ellipse() { calls.ellipses++; },
        quadraticCurveTo() { calls.leafCurves++; },
        translate(x, y) { calls.transforms.push([x, y]); },
        roundRect(...args) { calls.shapes.push(args); },
        save() {},
        restore() {}
    }, {
        set(target, key, value) {
            if (key === 'fillStyle') calls.colors.push(value);
            target[key] = value;
            return true;
        },
        get(target, key) {
            if (key in target) return target[key];
            return function () {};
        }
    });
    return ctx;
}

function prepararSniper(tempoInicial) {
    const ctx = criarContexto();
    let tempo = tempoInicial;
    const window = {
        ctx,
        meuX: 100,
        meuY: 120,
        walkCycle: 1000,
        inventario: { arma: { customVisual: { tamanho: 48, cBase: '#123456' } } },
        desenharBarraHp() { ctx.calls.healthBars++; }
    };
    const sandbox = vm.createContext({
        window,
        Date: { now: () => tempo },
        Math
    });
    vm.runInContext(sniperSource, sandbox, { filename: 'classes/sniper.js' });
    return { window, ctx, avancar(ms) { tempo += ms; } };
}

test('the new Sniper renderer covers standing, prone skill posture, weapon, and health bar', () => {
    const { window, ctx } = prepararSniper(1000);

    assert.equal(typeof window.desenharSniper, 'function');
    assert.doesNotThrow(() => window.desenharSniper(100, 120, false, 0.3, 100, 100, { eu: true }));
    window.desenharSniper(100, 120, false, 0.3, 80, 100, {
        eu: false,
        pp: { snPosicao: true, snCamuflado: false, snRoupaCamo: false }
    });

    assert.ok(ctx.calls.fills > 80, 'the tactical uniform, equipment, face, and rifle should render');
    assert.ok(ctx.calls.strokes >= 2, 'armor and headgear should have defined outlines');
    assert.equal(ctx.calls.healthBars, 2, 'the existing health bar callback remains supported');

    const fillsBeforeDeadRender = ctx.calls.fills;
    window.desenharSniper(100, 120, false, 0, 0, 100);
    assert.equal(ctx.calls.fills, fillsBeforeDeadRender, 'dead Snipers remain hidden');
});

test('the Space camouflage state replaces the soldier with foliage, visible eyes, and rifle', () => {
    const { window, ctx } = prepararSniper(1000);
    window.desenharSniper(100, 120, false, 0.2, 100, 100, {
        eu: false,
        pp: { snPosicao: false, snCamuflado: true, snRoupaCamo: true, snRoupaCamoAte: 6000 }
    });

    assert.ok(ctx.calls.ellipses <= 3, 'camouflage should not use a large oval mass for the bush');
    assert.ok(ctx.calls.leafCurves >= 60, 'camouflage should use many pointed, overlapping leaves');
    assert.ok(ctx.calls.colors.includes('#b6d37a'), 'only the eyes should stand out inside the foliage');
    assert.ok(ctx.calls.colors.includes('#203b25'), 'the plant should use natural foliage colors');
    assert.ok(ctx.calls.fills > 25, 'the rifle and layered leaves should both render');
    assert.equal(ctx.calls.healthBars, 1, 'the camouflage preserves the health bar');
});

test('breathing moves the chest and head without accelerating the legs', () => {
    const { window, ctx, avancar } = prepararSniper(1000);
    window.desenharSniper(100, 120, true, 0, 100, 100);
    const standingFirst = ctx.calls.transforms.slice();
    const firstLegY = ctx.calls.shapes[0][1];
    ctx.calls.transforms.length = 0;
    ctx.calls.shapes.length = 0;
    avancar(350);
    window.desenharSniper(100, 120, true, 0, 100, 100);
    const standingSecond = ctx.calls.transforms.slice();
    const secondLegY = ctx.calls.shapes[0][1];

    assert.deepEqual(standingFirst[1], [12, 0], 'the leg group stays independent from breathing');
    assert.deepEqual(standingSecond[1], [12, 0], 'the leg group stays independent from breathing');
    assert.ok(Math.abs(secondLegY - firstLegY) > 0.2 && Math.abs(secondLegY - firstLegY) < 3,
        'walking legs should move at a moderate, readable pace');
    assert.ok(Math.abs(standingFirst[2][1] - standingSecond[2][1]) > 0.5,
        'the standing chest breathing should be clearly visible');
    assert.ok(Math.abs(standingFirst[3][1] - standingSecond[3][1]) > 0.25,
        'the head follows the standing breath visibly');

    const prone = prepararSniper(1000);
    prone.window.desenharSniper(100, 120, false, 0, 100, 100, {
        eu: false,
        pp: { snPosicao: true, snCamuflado: false, snRoupaCamo: false }
    });
    const proneFirst = prone.ctx.calls.transforms.slice();
    prone.ctx.calls.transforms.length = 0;
    prone.avancar(350);
    prone.window.desenharSniper(100, 120, false, 0, 100, 100, {
        eu: false,
        pp: { snPosicao: true, snCamuflado: false, snRoupaCamo: false }
    });
    const proneSecond = prone.ctx.calls.transforms.slice();

    assert.ok(Math.abs(proneFirst[1][1] - proneSecond[1][1]) > 0.4,
        'the skill-3 prone chest breathing should be clearly visible');
    assert.ok(Math.abs(proneFirst[2][1] - proneSecond[2][1]) > 0.2,
        'the prone head should follow the breath visibly');
});
