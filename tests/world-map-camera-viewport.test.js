'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const mapSource = fs.readFileSync(path.join(__dirname, '..', 'mapas', 'mapa_mundo.js'), 'utf8');
const vistaSource = mapSource.match(/function vista\(\)\s*\{[\s\S]*?\n        \}/);
assert.ok(vistaSource, 'world map should define its viewport calculation');

function createVista(options) {
    const global = {
        camX: 320,
        camY: 640,
        cameraZoomAtual: 2,
        CAMERA_25D: options.tilted,
        CAMERA_TILT_Y: options.tilt,
        canvas: { width: 1800, height: 900 }
    };
    return vm.runInNewContext(`(${vistaSource[0]})`, { global })();
}

test('the world-map viewport covers the full vertically tilted canvas', () => {
    const view = createVista({ tilted: true, tilt: 0.88 });

    assert.equal(view.x, 320);
    assert.equal(view.y, 640);
    assert.equal(view.w, 900);
    assert.ok(Math.abs(view.h - 900 / (2 * 0.88)) < 1e-10);
});

test('the world-map viewport remains unchanged when the 2.5D tilt is disabled', () => {
    const view = createVista({ tilted: false, tilt: 0.88 });

    assert.equal(view.h, 450);
});
