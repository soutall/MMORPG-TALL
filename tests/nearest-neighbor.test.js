'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'nearest-neighbor.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const map = fs.readFileSync(path.join(root, 'mapas', 'mapa_mundo.js'), 'utf8');

function makeCanvasType() {
    function Canvas() {}
    Canvas.prototype.getContext = function (type) {
        return { type: type, imageSmoothingEnabled: true };
    };
    return Canvas;
}

test('nearest-neighbor disables smoothing in regular and offscreen 2D canvases only', () => {
    const HTMLCanvasElement = makeCanvasType();
    const OffscreenCanvas = makeCanvasType();
    vm.runInNewContext(source, { window: { HTMLCanvasElement, OffscreenCanvas } });

    const canvas2d = new HTMLCanvasElement().getContext('2d');
    const offscreen2d = new OffscreenCanvas().getContext('2d');
    const webgl = new HTMLCanvasElement().getContext('webgl');

    assert.equal(canvas2d.imageSmoothingEnabled, false);
    assert.equal(offscreen2d.imageSmoothingEnabled, false);
    assert.equal(webgl.imageSmoothingEnabled, true);
});

test('nearest-neighbor is loaded before game scripts and preserved for images and scaled map layers', () => {
    assert.ok(html.indexOf('nearest-neighbor.js?v=3') < html.indexOf('style.css?v=260'));
    assert.match(html, /GAME_VERSION = 'v1\.75\.103'/);
    assert.match(css, /img,\s*canvas,\s*video,\s*svg image\s*\{\s*image-rendering:\s*crisp-edges;\s*image-rendering:\s*pixelated;/);
    assert.match(map, /ctx\.imageSmoothingEnabled = false;\s*if \(imagemChunk\)/);
    assert.match(html, /bigMapCtx\.imageSmoothingEnabled = false/);
    assert.doesNotMatch(source, /PixelSnap|Pixel Snap|pixelSnap|snapCameraTransform|calcularPixelSnapOffset/);
    assert.doesNotMatch(html, /snapCameraTransform|pixelSnapOffset/);
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'sistema_dia_noite_cliente.js'), 'utf8'), /pixelSnapOffset/);
});
