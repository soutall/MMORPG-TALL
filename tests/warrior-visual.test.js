'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const warriorSource = fs.readFileSync(
    path.join(__dirname, '..', 'classes', 'guerreiro.js'),
    'utf8'
);

function createContext() {
    const calls = { fills: 0, strokes: 0, paths: 0, translations: [], rotations: [], scales: [] };
    const gradient = { addColorStop() {} };
    const context = new Proxy({
        calls,
        createLinearGradient() { return gradient; },
        createRadialGradient() { return gradient; },
        translate(x, y) { calls.translations.push([x, y]); },
        rotate(angle) { calls.rotations.push(angle); },
        scale(x, y) { calls.scales.push([x, y]); },
        beginPath() { calls.paths++; },
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
    return context;
}

test('the redesigned warrior renders idle, movement, defense, and spin with the existing API', () => {
    const ctx = createContext();
    const window = {
        ctx,
        meuId: 'local',
        walkCycle: 0.25,
        guerreiroEscudoDe: {},
        tornadoTimers: {},
        todosJogadores: {},
        players: {}
    };
    const sandbox = vm.createContext({
        window,
        Date,
        Math,
        performance: { now: () => 1000 }
    });
    vm.runInContext(warriorSource, sandbox, { filename: 'classes/guerreiro.js' });

    assert.equal(typeof window.desenharGuerreiro, 'function');
    assert.doesNotThrow(() => window.desenharGuerreiro(100, 120, '#8e2734', false, 0, 100, 100, false, 0, 'idle'));
    assert.doesNotThrow(() => window.desenharGuerreiro(100, 120, '#2980b9', true, Math.PI / 2, 80, 100, false, 0, 'moving'));
    window.escudoGuerreiroAtivo = true;
    assert.doesNotThrow(() => window.desenharGuerreiro(100, 120, '#8e2734', true, Math.PI, 60, 100, false, 0, 'defending'));
    window.escudoGuerreiroAtivo = false;
    assert.doesNotThrow(() => window.desenharGuerreiro(100, 120, '#8e2734', true, 1, 100, 100, true, 12, 'spinning'));
    assert.ok(ctx.calls.fills > 30, 'the new layered armor and shield should draw a complete character');
    assert.ok(ctx.calls.strokes > 10, 'the new armor should retain crisp outlines and details');
});

test('the warrior shield stays upright and changes side when aim turns around', () => {
    const ctx = createContext();
    const window = {
        ctx,
        meuId: 'local',
        walkCycle: 0,
        guerreiroEscudoDe: {},
        todosJogadores: {},
        players: {}
    };
    const sandbox = vm.createContext({
        window,
        Date,
        Math,
        performance: { now: () => 1000 }
    });
    vm.runInContext(warriorSource, sandbox, { filename: 'classes/guerreiro.js' });

    window.desenharGuerreiro(100, 120, '#8e2734', false, 0, 100, 100, false, 0, 'aim-right');
    window.desenharGuerreiro(100, 120, '#8e2734', false, Math.PI, 100, 100, false, 0, 'aim-left');

    assert.ok(ctx.calls.translations.some(([x, y]) => x === -6.5 && y === 3.5),
        'when aiming right, the upright shield should sit behind on the left');
    assert.ok(ctx.calls.translations.some(([x, y]) => x === 15.5 && y === 3.5),
        'when aiming left, the upright shield should sit behind on the right');
});

test('remote warrior walk animation advances independently from the local walk cycle', () => {
    const ctx = createContext();
    let time = 1000;
    const window = {
        ctx,
        meuId: 'local',
        walkCycle: 0,
        guerreiroEscudoDe: {},
        todosJogadores: {},
        players: {}
    };
    const sandbox = vm.createContext({
        window,
        Date,
        Math,
        performance: { now: () => time }
    });
    vm.runInContext(warriorSource, sandbox, { filename: 'classes/guerreiro.js' });

    window.desenharGuerreiro(100, 120, '#2980b9', true, 0, 100, 100, false, 0, 'remote');
    const initialPhase = window.guerreiroPassos.remote.fase;
    time += 200;
    window.desenharGuerreiro(100, 120, '#2980b9', true, 0, 100, 100, false, 0, 'remote');

    assert.ok(window.guerreiroPassos.remote.fase > initialPhase,
        'a remote player should get an advancing gait phase while reported as moving');
    assert.equal(window.walkCycle, 0, 'the remote gait must not rely on or modify the local cycle');
});

test('idle breathing scales only the chest armor, not the cape or whole character', () => {
    const ctx = createContext();
    let time = 0;
    const window = {
        ctx,
        meuId: 'local',
        walkCycle: 0,
        guerreiroEscudoDe: {},
        todosJogadores: {},
        players: {}
    };
    const sandbox = vm.createContext({
        window,
        Date,
        Math,
        performance: { now: () => time }
    });
    vm.runInContext(warriorSource, sandbox, { filename: 'classes/guerreiro.js' });

    window.desenharGuerreiro(100, 120, '#8e2734', false, 0, 100, 100, false, 0, 'breathing');
    const relaxedScale = ctx.calls.scales[ctx.calls.scales.length - 1];
    const relaxedChestY = ctx.calls.translations.filter(function ([x, y]) {
        return x === 12 && y > 12 && y < 14;
    }).at(-1)[1];

    time = Math.PI * 760 / 2;
    window.desenharGuerreiro(100, 120, '#8e2734', false, 0, 100, 100, false, 0, 'breathing');
    const expandedScale = ctx.calls.scales[ctx.calls.scales.length - 1];
    const expandedChestY = ctx.calls.translations.filter(function ([x, y]) {
        return x === 12 && y > 12 && y < 14;
    }).at(-1)[1];

    assert.equal(ctx.calls.scales.length, 2, 'only the isolated chest should receive breathing scales');
    assert.ok(expandedScale[0] - relaxedScale[0] >= 0.05, 'chest expansion should be visible horizontally');
    assert.ok(expandedScale[1] - relaxedScale[1] >= 0.07, 'chest expansion should be visible vertically');
    assert.ok(relaxedChestY - expandedChestY >= 0.5, 'the chest should rise visibly while inhaling');
});
