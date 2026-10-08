'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mapSource = fs.readFileSync(path.join(root, 'mapas', 'mapa_mundo.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('the full-screen layer snapshot is skipped when the map has no generic foreground layers', () => {
    assert.match(html, /Array\.isArray\(camadasSnapshot\)\s*&&\s*camadasSnapshot\.length\s*>\s*0/);
    assert.match(html, /typeof rendererCamadaAtivo !== 'function'/);
    assert.match(html, /layerSnapCtx\.drawImage\(canvas, 0, 0\)/);
});

test('the minimap bitmap is resized only when its dimensions are wrong', () => {
    assert.match(html, /if \(mmCanvas\.width !== 176\) mmCanvas\.width = 176/);
    assert.match(html, /if \(mmCanvas\.height !== 100\) mmCanvas\.height = 100/);
    assert.doesNotMatch(html, /let mw = mmCanvas\.width = 176/);
});

test('mobile profiling is opt-in and reports the frame phases, chunk cost, sprites, and canvas size', () => {
    assert.match(html, /get\('perf'\) === '1'/);
    assert.match(html, /perfAcumulado\.simulacao/);
    assert.match(html, /perfAcumulado\.mundo/);
    assert.match(html, /perfAcumulado\.restante/);
    assert.match(html, /perfAcumulado\.mapa/);
    assert.match(html, /perfAcumulado\.sprites/);
    assert.match(html, /canvas\.width \+ 'x' \+ canvas\.height/);
    assert.match(html, /mapas\/mapa_mundo\.js\?v=22/);
});

test('the world-map renderer exposes chunk queue work time for per-frame profiling', () => {
    assert.match(mapSource, /global\._perfMapChunkMs = 0/);
    assert.match(mapSource, /global\._perfMapChunkMs = Math\.max\(0,[\s\S]*?inicioPerfilMapa/);
});

test('client diagnostics send and log FPS separately from ping', () => {
    assert.match(html, /fps: window\._fpsRenderizado \|\| 0, ping: pingAtual/);
    assert.match(serverSource, /'fps=' \+ \(data\.fps === undefined \? '\?' : data\.fps\)/);
    assert.match(serverSource, /'ping=' \+ \(data\.ping === undefined \? '\?' : data\.ping\)/);
});
