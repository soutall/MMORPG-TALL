'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const test = require('node:test');

const root = path.join(__dirname, '..');

function createCanvasContext() {
    const calls = [];
    const ctx = new Proxy({ globalAlpha: 1 }, {
        get(target, name) {
            if (name in target) return target[name];
            if (name === 'createLinearGradient') {
                return () => ({ addColorStop() {} });
            }
            return (...args) => calls.push([name, ...args]);
        }
    });
    return { ctx, calls };
}

test('Pikeman redesign keeps the renderer, scythe and every skill animation drawable', () => {
    const window = { personagemInvisivelAtual: false };
    const { ctx, calls } = createCanvasContext();
    window.ctx = ctx;

    const source = fs.readFileSync(path.join(root, 'classes', 'pikeman.js'), 'utf8');
    vm.runInNewContext(source, { window, performance, Date, Math });

    assert.equal(typeof window.desenharPikeman, 'function');
    assert.equal(typeof window.desenharFoiceExposta, 'function');

    for (const estado of ['idle', 'andando', 'foice', 'giro', 'pirueta', 'geada', 'execucao']) {
        const pid = `pikeman-${estado}`;
        window.registrarPikemanAnim(pid, estado, 3000, { hit: 1, dir: 1 });
        window.desenharPikeman(40, 60, estado === 'andando', 0.4, 75, 100, {
            pp: { id: pid, pikemanProgresso: 0.5 }
        }, pid);
    }

    assert.ok(calls.filter(([name]) => name === 'fill').length > 20, 'character and weapon paths are filled');
    assert.ok(calls.filter(([name]) => name === 'arc').length > 10, 'mask details, rivets and scythe fittings are drawn');
});
