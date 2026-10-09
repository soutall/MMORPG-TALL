'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const dayNight = require('../sistema_dia_noite_cliente');

const source = fs.readFileSync(path.join(__dirname, '..', 'sistema_dia_noite_cliente.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('flashlight beam follows the mouse direction and has a 50% longer capped reach', () => {
    const beam = dayNight.calcularFeixeLanterna(100, 100, 500, 100, Math.PI, 330);

    assert.equal(beam.angulo, 0);
    assert.equal(beam.distancia, 330);
    assert.ok(beam.larguraFim > beam.larguraInicio);
    assert.ok(beam.larguraFim <= 74);
});

test('flashlight beam fades with distance and uses facing direction if the aim is at the player', () => {
    const nearTarget = dayNight.calcularFeixeLanterna(100, 100, 140, 100, Math.PI / 2, 330);
    const noTarget = dayNight.calcularFeixeLanterna(100, 100, 100, 100, Math.PI / 2, 330);

    assert.equal(nearTarget.distancia, 40);
    assert.equal(nearTarget.larguraFim, 28);
    assert.equal(noTarget.angulo, Math.PI / 2);
    assert.ok(Math.abs(noTarget.distancia - 270.6) < 0.001);
});

test('flashlight direction follows the camera vertical tilt used by the game world', () => {
    const downwardAim = dayNight.calcularFeixeLanterna(100, 100, 100, 200, 0, 330, 0.5);
    const diagonalAim = dayNight.calcularFeixeLanterna(100, 100, 200, 200, 0, 330, 0.5);

    assert.ok(Math.abs(downwardAim.angulo - Math.PI / 2) < 0.001);
    assert.equal(downwardAim.distancia, 50);
    assert.ok(diagonalAim.angulo < Math.PI / 4);
    assert.ok(diagonalAim.distancia < Math.hypot(100, 100));
});

test('mobile flashlight follows facing direction unless a world touch is aiming', () => {
    const state = {
        meuAngulo: Math.PI / 2,
        anguloLanternaMobile: 0,
        lanternaMobileAtiva: false,
        mouseWorldX: -100,
        mouseWorldY: 0
    };

    const alvoFrente = dayNight.obterAlvoLanterna(state, 100, 200, true, 330);
    assert.ok(Math.abs(alvoFrente.x - 100) < 1e-9);
    assert.ok(Math.abs(alvoFrente.y - 530) < 1e-9);

    state.lanternaMobileAtiva = true;
    const alvoToque = dayNight.obterAlvoLanterna(state, 100, 200, true, 330);
    assert.ok(Math.abs(alvoToque.x - 430) < 1e-9);
    assert.ok(Math.abs(alvoToque.y - 200) < 1e-9);

    dayNight.encerrarMiraLanternaMobile(state);
    assert.equal(state.lanternaMobileAtiva, false);
    assert.equal(state.meuAngulo, 0);
    const alvoDepoisDoToque = dayNight.obterAlvoLanterna(state, 100, 200, true, 330);
    assert.ok(Math.abs(alvoDepoisDoToque.x - 430) < 1e-9);
    assert.ok(Math.abs(alvoDepoisDoToque.y - 200) < 1e-9);
});

test('desktop flashlight remains aimed at the mouse world position', () => {
    const state = { meuAngulo: Math.PI, mouseWorldX: 450, mouseWorldY: 260 };

    assert.deepEqual(dayNight.obterAlvoLanterna(state, 100, 200, false, 330), { x: 450, y: 260 });
});

test('night lighting draws a reduced player halo and a mouse-aimed fading beam', () => {
    assert.match(source, /var raioLuzPessoal = dispositivoTouch \? 38 \+ pulsoFogo[\s\S]*?: 68 \+ pulsoFogo/);
    assert.match(source, /var forcaLuzPessoal = dispositivoTouch \? 0\.54 : 0\.78/);
    assert.match(source, /calcularFeixeLanterna\(\s*playerX,\s*playerY,\s*alvoLanterna\.x,\s*alvoLanterna\.y,\s*Number\(global\.meuAngulo\)/);
    assert.match(source, /calcularFeixeLanterna\([\s\S]*?global\.mouseWorldX[\s\S]*?global\.mouseWorldY[\s\S]*?330/);
    assert.match(source, /gradiente\.addColorStop\(0\.88,[\s\S]*?gradiente\.addColorStop\(1,\s*'rgba\(0, 0, 0, 0\)'/);
    assert.match(source, /recortarFeixeLanterna\(luzCtx,\s*pLocal\.x,\s*pLocal\.y,\s*feixe,\s*zoom,\s*escuridao\)/);
    assert.match(source, /function renderizarCicloDiaNoite\(ctx,\s*camX,\s*camY,\s*shakeX,\s*shakeY,\s*zoom,\s*inclinacaoY\)/);
    assert.match(source, /y:\s*\(wy - camY \+ shakeY\)\s*\*\s*zoom\s*\*\s*tiltY/);
    assert.match(html, /renderizarCicloDiaNoite\(ctx,\s*cameraX,\s*cameraY,\s*shakeX,\s*shakeY,\s*\(window\.cameraZoomAtual \|\| ZOOM_CAMERA\),\s*cameraTiltY\)/);
    assert.match(html, /sistema_dia_noite_cliente\.js\?v=1529/);
    assert.match(html, /let joystickTouchId = null; let lanternaTouchId = null/);
    assert.match(html, /function atualizarMiraLanternaTouch\(touch\)/);
    assert.match(html, /window\.lanternaMobileAtiva = true/);
    assert.match(html, /window\.encerrarMiraLanternaMobile\(window\)/);
    assert.match(html, /const GAME_VERSION = 'v1\.75\.103'/);
});
