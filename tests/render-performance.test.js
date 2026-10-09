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
    assert.match(html, /mapas\/mapa_mundo\.js\?v=24/);
});

test('the world-map renderer exposes chunk queue work time for per-frame profiling', () => {
    assert.match(mapSource, /global\._perfMapChunkMs = 0/);
    assert.match(mapSource, /global\._perfMapChunkMs = Math\.max\(0,[\s\S]*?inicioPerfilMapa/);
});

test('world-map texture generation limits synchronous preview and movement work', () => {
    assert.match(mapSource, /const PREVIA_CHUNK_RESOLUCAO = 8/);
    assert.match(mapSource, /const DISTANCIA_PRE_CARREGAMENTO = CHUNK \* 2/);
    assert.match(mapSource, /const INTERVALO_PRE_CARREGAMENTO_MS = 250/);
    assert.match(mapSource, /agora - ultimoPreCarregamentoEm >= INTERVALO_PRE_CARREGAMENTO_MS/);
    assert.match(mapSource, /jogadorEmMovimento \? 1\.5 : 0\.75/);
    assert.doesNotMatch(mapSource, /CHUNK \* 7/);
});

test('client diagnostics send and log FPS separately from ping', () => {
    assert.match(html, /fps: window\._fpsRenderizado \|\| 0, ping: pingAtual/);
    assert.match(serverSource, /'fps=' \+ \(data\.fps === undefined \? '\?' : data\.fps\)/);
    assert.match(serverSource, /'ping=' \+ \(data\.ping === undefined \? '\?' : data\.ping\)/);
});

test('idle movement reports are suppressed and changed network state remains rate-limited', () => {
    assert.match(html, /ultimoEstadoRedeEnviado\.x !== window\.meuX/);
    assert.match(html, /ultimoEstadoRedeEnviado\.angulo !== window\.meuAngulo/);
    assert.match(html, /ultimoEstadoRedeEnviado\.moving !== movingReportado/);
    assert.match(html, /agora - ultimoEnvioRede > 30/);
    assert.match(html, /ultimoEstadoRedeEnviado\.socket !== ws/);
});

test('minimap and world map rendering run at most ten times per second', () => {
    assert.match(html, /const INTERVALO_MAPAS_AUXILIARES_MS = 100/);
    assert.match(html, /agora - ultimoMinimapRenderEm >= INTERVALO_MAPAS_AUXILIARES_MS/);
    assert.match(html, /agora - ultimoBigMapRenderEm < INTERVALO_MAPAS_AUXILIARES_MS/);
    assert.match(html, /agora - ultimaDescobertaMapaEm < INTERVALO_MAPAS_AUXILIARES_MS/);
});

test('the per-frame sprite sort buffer is reused and portrait drawing pauses in hidden tabs', () => {
    assert.match(html, /const spritesSort = \[\];[\s\S]{0,500}spritesSort\.length = 0/);
    assert.doesNotMatch(html, /let spritesSort = \[\]/);
    assert.match(html, /if \(document\.hidden \|\| !c \|\| !window\.minhaClasse \|\| !window\.meuId\) return/);
});

test('server synchronizes each player instance once before constructing the visible snapshot', () => {
    const snapshotStart = serverSource.indexOf('// Players visíveis: sem inventário privado');
    const snapshotEnd = serverSource.indexOf('const tempoMundoAtual', snapshotStart);
    assert.notEqual(snapshotStart, -1);
    assert.notEqual(snapshotEnd, -1);
    const snapshotBlock = serverSource.slice(snapshotStart, snapshotEnd);
    assert.equal((snapshotBlock.match(/sincronizarInstanciaMapaJogador\(pid\)/g) || []).length, 1);
    assert.match(snapshotBlock, /const jogadoresIdsSnapshot = Object\.keys\(players\)/);
    assert.match(snapshotBlock, /for \(const pid of jogadoresIdsSnapshot\)/);
});
