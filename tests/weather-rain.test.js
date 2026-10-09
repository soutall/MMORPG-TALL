'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const chuva = require('../chuva-cliente');
const cicloChuva = require('../sistemas/ciclo_chuva.js');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin-cheats.js'), 'utf8');
const dayNight = fs.readFileSync(path.join(root, 'sistema_dia_noite_cliente.js'), 'utf8');

test('rain audio fades in and out while looping, and thunder audio follows lightning distance', () => {
    const tracks = [];
    class MockAudio {
        constructor(src) {
            this.src = src;
            this.volume = 1;
            this.loop = false;
            this.preload = '';
            this.paused = true;
            tracks.push(this);
        }
        play() { this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
    }
    const controller = chuva.criarControladorAudioChuva(MockAudio, () => 0.5, function (error) {
        throw error;
    });
    controller.atualizar(true, 1000);
    assert.equal(tracks[0].src, 'Sonoro/SOM%20GERAL/chuva/chuva.mp3');
    assert.equal(tracks[0].loop, true);
    assert.equal(tracks[0].volume, 0);
    for (let tempo = 1100; tempo <= 1600; tempo += 100) controller.atualizar(true, tempo);
    assert.equal(tracks[0].volume, 0.25);
    for (let tempo = 1700; tempo <= 2900; tempo += 100) controller.atualizar(false, tempo);
    assert.equal(tracks[0].volume, 0);
    assert.equal(tracks[0].paused, true);

    const thunderSounds = [];
    const lightning = chuva.criarEfeitoTrovao(() => 0.5, function (perto) {
        thunderSounds.push(perto ? 'forte' : 'fraco');
    });
    lightning.atualizar(true, true, 0);
    lightning.atualizar(true, true, 21000);
    lightning.desenhar({ canvas: { width: 1280, height: 720 }, save() {}, restore() {}, setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }, 21000);
    assert.deepEqual(thunderSounds, ['forte']);
});

test('rain intensity increases density by the configured levels and storm drops fall faster', () => {
    function captureFrames(intensidade) {
        const frames = [];
        let frameAtual = [];
        let transform = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
        const ctx = {
            canvas: { width: 1280, height: 720 },
            save() {},
            restore() {},
            setTransform(scaleX, _skewX, _skewY, scaleY, offsetX, offsetY) {
                transform = { scaleX, scaleY, offsetX, offsetY };
            },
            beginPath() {},
            moveTo(x, y) {
                frameAtual.push({
                    x: x * transform.scaleX + transform.offsetX,
                    y: y * transform.scaleY + transform.offsetY
                });
            },
            lineTo() {},
            stroke() {}
        };
        const drawRain = chuva.criarRenderizadorChuva(() => 0.5);
        for (const tempo of [0, 50]) {
            frameAtual = [];
            drawRain(ctx, true, tempo, { x: 0, y: 0, zoom: 1, inclinacaoY: 1 }, intensidade);
            frames.push(frameAtual);
        }
        return frames;
    }

    const fraca = captureFrames('fraca');
    const media = captureFrames('media');
    const tempestade = captureFrames('tempestade');
    assert.equal(media[0].length, Math.floor(1280 * 720 / 9000 * 1.3));
    assert.equal(tempestade[0].length, Math.floor(1280 * 720 / 9000 * 1.6));
    assert.ok(tempestade[1][0].y - tempestade[0][0].y >
        fraca[1][0].y - fraca[0][0].y, 'storm rain should fall faster than light rain');
});

test('rain renderer stays idle when disabled and draws a bounded particle batch when enabled', () => {
    const calls = { begins: 0, moves: [], lines: 0, strokes: 0 };
    const ctx = {
        canvas: { width: 1280, height: 720 },
        save() {},
        restore() {},
        setTransform() {},
        beginPath() { calls.begins++; },
        moveTo(x, y) { calls.moves.push({ x, y }); },
        lineTo() { calls.lines++; },
        stroke() { calls.strokes++; }
    };
    const drawRain = chuva.criarRenderizadorChuva(() => 0.5);

    drawRain(ctx, false, 0);
    assert.equal(calls.strokes, 0);

    drawRain(ctx, true, 1000);
    drawRain(ctx, true, 1016);
    assert.equal(calls.strokes, 2);
    assert.ok(calls.moves.length >= 90 && calls.moves.length <= 280);
    assert.equal(calls.moves.length, calls.lines);
    for (const quadrante of [
        { minX: 0, maxX: 640, minY: 0, maxY: 360 },
        { minX: 640, maxX: 1280, minY: 0, maxY: 360 },
        { minX: 0, maxX: 640, minY: 360, maxY: 720 },
        { minX: 640, maxX: 1280, minY: 360, maxY: 720 }
    ]) {
        const gotasNoQuadrante = calls.moves.filter(function (gota) {
            return gota.x >= quadrante.minX && gota.x < quadrante.maxX &&
                gota.y >= quadrante.minY && gota.y < quadrante.maxY;
        });
        assert.ok(gotasNoQuadrante.length >= 15, 'each screen quadrant must receive rain');
    }
});

test('rain drops create short-lived splash marks when they reach the visible ground', () => {
    const strokes = [];
    const ctx = {
        canvas: { width: 1280, height: 720 },
        save() {},
        restore() {},
        setTransform() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() { strokes.push({ color: this.strokeStyle, alpha: this.globalAlpha }); }
    };
    const drawRain = chuva.criarRenderizadorChuva(() => 0.5);

    for (let tempo = 0; tempo <= 350; tempo += 50) drawRain(ctx, true, tempo);

    const splashStrokes = strokes.filter(function (stroke) {
        return stroke.color === 'rgba(205, 235, 255, 0.8)';
    });
    assert.ok(splashStrokes.length > 0, 'rain impacts should draw ground splashes');
    assert.ok(splashStrokes.some(function (stroke) { return stroke.alpha < 1; }), 'splashes should fade as they disappear');
});

test('lightning brightens the night veil in short pulses and draws the bolt on the map', () => {
    const calls = { fills: 0, strokes: 0, segments: 0 };
    const ctx = {
        canvas: { width: 1280, height: 720 },
        save() {},
        restore() {},
        setTransform() {},
        fillRect() { calls.fills++; },
        beginPath() {},
        moveTo() { calls.segments++; },
        lineTo() { calls.segments++; },
        stroke() { calls.strokes++; }
    };
    const lightning = chuva.criarEfeitoTrovao(() => 0.5);

    assert.equal(lightning.atualizar(false, true, 0), 0, 'daytime should disable lightning');
    assert.equal(lightning.atualizar(true, true, 0), 0);
    assert.equal(lightning.atualizar(true, true, 20099), 0, 'the first strike should wait for a random interval');
    const primeiraPiscada = lightning.atualizar(true, true, 21000);
    assert.ok(primeiraPiscada > 0.9, 'the first pulse should almost lift the darkness veil');
    lightning.desenhar(ctx, 21000);
    assert.equal(calls.fills, 0, 'the visible scene should be revealed by reducing the night veil');
    assert.equal(calls.strokes, 1);
    assert.ok(calls.segments >= 14, 'the lightning bolt should contain multiple segments');
    assert.ok(lightning.atualizar(true, true, 21070) < primeiraPiscada, 'the first pulse should fade quickly');
    assert.equal(lightning.atualizar(true, true, 21110), 0.72, 'a secondary pulse should briefly reveal the map again');

    assert.equal(lightning.atualizar(false, true, 21120), 0, 'daytime should cancel the flash');
    assert.equal(lightning.atualizar(true, true, 21140), 0, 'returning to night starts a new random wait');
});

test('thunder is disabled whenever rain is inactive, including an in-progress lightning flash', () => {
    const lightning = chuva.criarEfeitoTrovao(() => 0.5);
    assert.equal(lightning.atualizar(true, false, 0), 0, 'night without rain must not schedule thunder');
    assert.equal(lightning.atualizar(true, false, 21000), 0, 'night without rain must not create lightning');

    assert.equal(lightning.atualizar(true, true, 0), 0);
    assert.ok(lightning.atualizar(true, true, 21000) > 0, 'rain at night allows lightning');
    assert.equal(lightning.atualizar(true, false, 21001), 0, 'ending rain immediately cancels lightning');
});

test('rain schedule starts randomly, lasts 3 to 30 minutes, and cycles all intensities', () => {
    const cycle = cicloChuva.criarCicloChuva({ random: () => 0, agoraInicial: 0 });
    assert.deepEqual(cycle.atualizar(179999), { chuvaAtiva: false, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(180000), { chuvaAtiva: true, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(210000), { chuvaAtiva: true, intensidade: 'media' });
    assert.deepEqual(cycle.atualizar(240000), { chuvaAtiva: true, intensidade: 'tempestade' });
    assert.deepEqual(cycle.atualizar(270000), { chuvaAtiva: true, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(359999), { chuvaAtiva: true, intensidade: 'tempestade' });
    assert.deepEqual(cycle.atualizar(360000), { chuvaAtiva: false, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(539999), { chuvaAtiva: false, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(540000), { chuvaAtiva: true, intensidade: 'fraca' });

    const maxCycle = cicloChuva.criarCicloChuva({ random: () => 1, agoraInicial: 0 });
    assert.deepEqual(maxCycle.atualizar(900000), { chuvaAtiva: true, intensidade: 'tempestade' });
    assert.deepEqual(maxCycle.atualizar(2699999), { chuvaAtiva: true, intensidade: 'media' });
    assert.deepEqual(maxCycle.atualizar(2700000), { chuvaAtiva: false, intensidade: 'fraca' });
});

test('rain schedule can be manually overridden and resumes after the admin turns it off', () => {
    const cycle = cicloChuva.criarCicloChuva({ random: () => 0, agoraInicial: 0 });
    assert.deepEqual(cycle.definirManual(true, 'media', 0), { chuvaAtiva: true, intensidade: 'media' });
    assert.deepEqual(cycle.atualizar(3600000), { chuvaAtiva: true, intensidade: 'media' });
    assert.deepEqual(cycle.definirManual(false, 'media', 3600000), { chuvaAtiva: false, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(3779999), { chuvaAtiva: false, intensidade: 'fraca' });
    assert.deepEqual(cycle.atualizar(3780000), { chuvaAtiva: true, intensidade: 'fraca' });
});

test('rain is automatically scheduled, has admin overrides, and synchronizes to every client', () => {
    assert.match(server, /let chuvaAtiva = false/);
    assert.match(server, /let intensidadeChuva = 'fraca'/);
    assert.match(server, /criarCicloChuva\(\)/);
    assert.match(server, /setInterval\(atualizarCicloChuva, 1000\)/);
    assert.match(server, /data\.action === 'admin_chuva_toggle'[\s\S]{0,200}if \(!ws\.ehAdminCliente\)/);
    assert.match(server, /typeof data\.ativa !== 'boolean'/);
    assert.match(server, /cicloChuva\.definirManual\(data\.ativa, intensidadeChuva, Date\.now\(\)\)/);
    assert.match(server, /data\.action === 'admin_chuva_intensidade'[\s\S]{0,250}if \(!ws\.ehAdminCliente\)/);
    assert.match(server, /cicloChuva\.definirIntensidadeManual\(data\.intensidade\)/);
    assert.match(server, /type: 'world_update',\s*chuvaAtiva: chuvaAtiva,\s*intensidadeChuva: intensidadeChuva/);
});

test('admin panel exposes a synchronized rain switch and client draws it in the scene', () => {
    assert.match(admin, /id="ac-toggle-chuva"[\s\S]{0,300}adminDefinirChuva/);
    assert.match(admin, /action: 'admin_chuva_toggle', ativa: !!ativa/);
    assert.match(admin, /window\.atualizarVisualChuvaAdmin = function/);
    assert.match(html, /chuva-cliente\.js\?v=11/);
    assert.match(html, /window\.chuvaAtiva = dados\.chuvaAtiva === true/);
    assert.match(html, /window\.intensidadeChuva = dados\.intensidadeChuva/);
    assert.match(html, /window\.desenharChuva\(ctx, window\.chuvaAtiva === true, undefined, \{[\s\S]{0,300}window\.intensidadeChuva/);
    assert.match(admin, /id="ac-intensidade-chuva"/);
    assert.match(admin, /action: 'admin_chuva_intensidade', intensidade: intensidade/);
    assert.match(html, /window\.atualizarTrovao\(estaNoite, window\.chuvaAtiva === true\)/);
    assert.match(html, /window\.desenharTrovao\(ctx\)/);
    assert.match(html, /const estaNoite = Number\.isFinite\(horaMundoAtual\) && \(horaMundoAtual >= 19 \|\| horaMundoAtual < 6\)/);
    assert.match(dayNight, /var escuridaoDuranteTrovao = escuridao \* \(1 - intensidadeTrovao\)/);
    assert.match(dayNight, /Math\.min\(1\.0, escuridaoDuranteTrovao\)/);
    assert.match(dayNight, /escuridaoDuranteTrovao \* 0\.22/);
});

test('global rain entry point forwards camera coordinates to keep rain visible in world maps', () => {
    const global = {};
    const source = fs.readFileSync(path.join(root, 'chuva-cliente.js'), 'utf8');
    const module = { exports: {} };
    const factory = new Function('window', 'module', 'globalThis', source);
    factory(global, module, global);

    const points = [];
    const ctx = {
        canvas: { width: 1280, height: 720 },
        save() {},
        restore() {},
        setTransform() {},
        beginPath() {},
        moveTo(x, y) { points.push({ x, y }); },
        lineTo() {},
        stroke() {}
    };
    global.desenharChuva(ctx, true, 1000, { x: 143854, y: 13897, zoom: 1, inclinacaoY: 1 });

    assert.ok(points.length > 0);
    assert.ok(points.every(function (point) {
        return point.x > 140000 && point.y > 13000;
    }), 'rain should be generated near the active camera, not the map origin');
});

test('rain droplets stay anchored to map coordinates as the camera follows the player', () => {
    const firstFrame = [];
    const secondFrame = [];
    let collecting = firstFrame;
    let transform = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    const ctx = {
        canvas: { width: 1280, height: 720 },
        save() {},
        restore() {},
        setTransform(scaleX, _skewX, _skewY, scaleY, offsetX, offsetY) {
            transform = { scaleX, scaleY, offsetX, offsetY };
        },
        beginPath() {},
        moveTo(x, y) {
            collecting.push({
                x: x * transform.scaleX + transform.offsetX,
                y: y * transform.scaleY + transform.offsetY
            });
        },
        lineTo() {},
        stroke() {}
    };
    let seed = 1;
    const drawRain = chuva.criarRenderizadorChuva(function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    });

    drawRain(ctx, true, 1000, { x: 0, y: 0, zoom: 1, inclinacaoY: 1 });
    collecting = secondFrame;
    drawRain(ctx, true, 1000, { x: 120, y: 40, zoom: 1, inclinacaoY: 1 });

    assert.ok(firstFrame.length > 0);
    assert.equal(secondFrame.length, firstFrame.length);
    assert.ok(Math.abs((firstFrame[0].x - secondFrame[0].x) - 120) < 1e-6,
        'moving the camera should shift existing world-anchored drops across the screen');
    assert.ok(Math.abs((firstFrame[0].y - secondFrame[0].y) - 40) < 1e-6,
        'moving the camera vertically should shift existing drops with the map');
});

test('rain follows camera travel gradually and keeps recycled drops within the visible world area', () => {
    const initialPositions = [];
    const jumpedCameraPositions = [];
    const laterWorldPositions = [];
    let collecting = initialPositions;
    let transform = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    let cameraX = 0;
    const ctx = {
        canvas: { width: 1280, height: 720 },
        save() {},
        restore() {},
        setTransform(scaleX, _skewX, _skewY, scaleY, offsetX, offsetY) {
            transform = { scaleX, scaleY, offsetX, offsetY };
        },
        beginPath() {},
        moveTo(x, y) {
            const screenX = x * transform.scaleX + transform.offsetX;
            const screenY = y * transform.scaleY + transform.offsetY;
            collecting.push({
                x: screenX / transform.scaleX + cameraX,
                y: screenY / transform.scaleY
            });
        },
        lineTo() {},
        stroke() {}
    };
    let seed = 7;
    const drawRain = chuva.criarRenderizadorChuva(function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    });

    drawRain(ctx, true, 1000, { x: cameraX, y: 0, zoom: 1, inclinacaoY: 1 });
    cameraX = 20000;
    collecting = jumpedCameraPositions;
    drawRain(ctx, true, 1000, { x: cameraX, y: 0, zoom: 1, inclinacaoY: 1 });
    collecting = laterWorldPositions;
    for (let tempo = 1050; tempo <= 5000; tempo += 50) {
        drawRain(ctx, true, tempo, { x: cameraX, y: 0, zoom: 1, inclinacaoY: 1 });
    }

    assert.ok(initialPositions.length > 0);
    assert.ok(initialPositions.every(function (position) { return position.x < 5000; }));
    assert.ok(jumpedCameraPositions.length > 0);
    assert.ok(jumpedCameraPositions.every(function (position) { return position.x < 5000; }),
        'existing drops should remain at their world positions immediately after camera travel');
    assert.ok(laterWorldPositions.some(function (position) { return position.x >= 19000 && position.x < 23000; }),
        'recycled drops should replenish rain around the new camera position');
    assert.ok(laterWorldPositions.every(function (position) { return position.x < 25000; }),
        'recycled drops should not drift away from the visible world area');
});
