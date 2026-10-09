'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const createCameraModule = require('../modo-melhorado/camera');

function simulateCamera(fps, durationSeconds, inputAt) {
    const camera = createCameraModule();
    const bounds = { minX: 0, maxX: 5000, minY: 0, maxY: 3000 };
    let playerX = 1200;
    let playerY = 800;
    let desiredX = 700;
    let desiredY = 450;
    let time = 0;
    const dt = 1 / fps;
    let output = camera.follow(desiredX, desiredY, playerX, playerY, dt, bounds, 'mundo:alive');
    const positions = [];

    while (time < durationSeconds) {
        const input = inputAt(time, playerX, playerY);
        playerX += input.vx * dt;
        playerY += input.vy * dt;
        desiredX = Math.max(0, Math.min(5000, playerX - 500));
        desiredY = Math.max(0, Math.min(3000, playerY - 350));
        output = camera.follow(desiredX, desiredY, playerX, playerY, dt, bounds, 'mundo:alive');
        positions.push({ x: output.x, y: output.y });
        time += dt;
    }
    return { camera, positions, playerX, playerY, bounds };
}

test('camera spring gives near-equivalent motion at 30, 60, and 120 FPS', () => {
    const motion = time => ({ vx: time < 2 ? 120 : 0, vy: time < 2 ? -55 : 0 });
    const at30 = simulateCamera(30, 4, motion);
    const at60 = simulateCamera(60, 4, motion);
    const at120 = simulateCamera(120, 4, motion);
    const last30 = at30.positions.at(-1);
    const last60 = at60.positions.at(-1);
    const last120 = at120.positions.at(-1);

    assert.ok(Math.abs(last30.x - last60.x) < 4);
    assert.ok(Math.abs(last60.x - last120.x) < 4);
    assert.ok(Math.abs(last30.y - last60.y) < 4);
    assert.ok(Math.abs(last60.y - last120.y) < 4);
    assert.ok(Math.abs(last60.x - (at60.playerX - 500)) < 2, 'camera should settle back onto the player after stopping');
});

test('lead reverses smoothly, remains bounded, and camera clamps at map edges', () => {
    const forward = simulateCamera(60, 1, () => ({ vx: 220, vy: 0 }));
    const beforeReverse = forward.camera.follow(900, 450, 1420, 800, 1 / 60, forward.bounds, 'mundo:alive').x;
    const reversing = forward.camera.follow(900, 450, 1416, 800, 1 / 60, forward.bounds, 'mundo:alive');

    assert.ok(Math.abs(reversing.x - beforeReverse) < 20, 'direction changes should not snap the camera');
    const nearEdge = forward.camera.follow(0, 0, 12, 16, 1 / 60, forward.bounds, 'mundo:alive');
    assert.ok(nearEdge.x >= 0 && nearEdge.y >= 0);
    const teleported = forward.camera.follow(4800, 2800, 4812, 2816, 1 / 60, forward.bounds, 'mundo:alive');
    assert.ok(teleported.x > 4000 && teleported.y > 2200, 'large position corrections should snap instead of dragging from spawn');
    const changedMap = forward.camera.follow(2500, 1400, 2512, 1416, 1 / 60, forward.bounds, 'green:alive');
    assert.equal(changedMap.x, 2500, 'map changes should reinitialize the camera at the new target');
    const deadCameraX = forward.camera.follow(900, 500, 912, 516, 1 / 60, forward.bounds, 'green:dead').x;
    const respawnCameraX = forward.camera.follow(1200, 700, 1212, 716, 1 / 60, forward.bounds, 'green:alive').x;
    assert.equal(deadCameraX, 900);
    assert.equal(respawnCameraX, 1200, 'death and respawn should reset stale camera momentum');
});

test('dash and attack impulses are brief, capped, and can be disabled', () => {
    const camera = createCameraModule();
    const bounds = { minX: 0, maxX: 5000, minY: 0, maxY: 3000 };
    camera.follow(1000, 500, 1012, 516, 1 / 60, bounds, 'mundo:alive');
    for (let i = 0; i < 30; i++) camera.follow(1000, 500, 1012, 516, 1 / 60, bounds, 'mundo:alive');
    const initialPosition = camera.follow(1000, 500, 1012, 516, 1 / 60, bounds, 'mundo:alive');
    const baselineX = initialPosition.x;
    const baselineY = initialPosition.y;

    camera.impulse(0, camera.config.dashImpulse);
    camera.impulse(0, camera.config.dashImpulse);
    const kicked = camera.follow(1000, 500, 1012, 516, 1 / 60, bounds, 'mundo:alive');
    assert.ok(kicked.x > baselineX, 'dash impulse should shift the camera toward movement');
    assert.ok(kicked.x - baselineX <= camera.config.maxImpulse, 'consecutive actions should stay within the configured impulse cap');
    camera.impulse(Math.PI / 2, camera.config.attackImpulse);
    const repeatedAttackImpulse = camera.follow(1000, 500, 1012, 516, 1 / 60, bounds, 'mundo:alive');
    assert.ok(repeatedAttackImpulse.y > baselineY, 'attack impulse should remain directional');
    assert.ok(repeatedAttackImpulse.y - baselineY <= 0.36, 'attack impulse should be reduced by 90% and must not accumulate');

    let settled = kicked;
    for (let i = 0; i < 30; i++) settled = camera.follow(1000, 500, 1012, 516, 1 / 60, bounds, 'mundo:alive');
    assert.ok(Math.abs(settled.x - baselineX) < 0.01, 'impulse should decay back to the spring position');

    camera.config.enabled = false;
    camera.impulse(Math.PI, camera.config.attackImpulse);
    assert.equal(camera.follow(700, 400, 712, 416, 1 / 60, bounds, 'mundo:alive').x, 700, 'disabling should restore rigid follow without lead or impact');
});

test('separate client camera instances keep multiplayer follow and impulses isolated', () => {
    const firstClient = createCameraModule();
    const secondClient = createCameraModule();
    const bounds = { minX: 0, maxX: 5000, minY: 0, maxY: 3000 };
    firstClient.follow(700, 400, 712, 416, 1 / 60, bounds, 'mundo:alive');
    secondClient.follow(2200, 1000, 2212, 1016, 1 / 60, bounds, 'mundo:alive');
    firstClient.impulse(0, firstClient.config.dashImpulse);
    const firstPosition = firstClient.follow(700, 400, 712, 416, 1 / 60, bounds, 'mundo:alive').x;
    const secondPosition = secondClient.follow(2200, 1000, 2212, 1016, 1 / 60, bounds, 'mundo:alive').x;

    assert.ok(firstPosition > 700);
    assert.equal(secondPosition, 2200, 'one client camera should not move another client camera');
});

test('camera lead responds to all movement directions without leaving the map', () => {
    const directions = [
        { x: 180, y: 0 },
        { x: -180, y: 0 },
        { x: 0, y: 180 },
        { x: 0, y: -180 }
    ];
    const bounds = { minX: 0, maxX: 5000, minY: 0, maxY: 3000 };
    for (const direction of directions) {
        const camera = createCameraModule();
        let playerX = 2500;
        let playerY = 1500;
        let position = camera.follow(2000, 1150, playerX, playerY, 1 / 60, bounds, 'mundo:alive');
        for (let frame = 0; frame < 30; frame++) {
            playerX += direction.x / 60;
            playerY += direction.y / 60;
            position = camera.follow(
                playerX - 500,
                playerY - 350,
                playerX,
                playerY,
                1 / 60,
                bounds,
                'mundo:alive'
            );
        }
        assert.ok(position.x >= bounds.minX && position.x <= bounds.maxX);
        assert.ok(position.y >= bounds.minY && position.y <= bounds.maxY);
    }
});

test('the current game loop owns camera follow and preserves map-space rendering coordinates', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

    assert.match(html, /modo-melhorado\/camera\.js\?v=3/);
    assert.match(html, /cameraModule\.follow\([\s\S]*dt \/ 60,[\s\S]*cameraFollowBounds/);
    assert.match(html, /window\.camX = cameraX; window\.camY = cameraY/);
    assert.match(html, /ctx\.translate\(-cameraX \+ shakeX, -cameraY \+ shakeY\)/);
    assert.match(html, /cameraModule\.impulse\(ang, cameraModule\.config\.dashImpulse\)/);
    assert.match(html, /cameraModule\.impulse\(ang, cameraModule\.config\.attackImpulse\)/);
    assert.match(html, /camera\.config\.screenShakeScale/);
    assert.equal(createCameraModule().config.screenShakeScale, 0.1);
    assert.equal(createCameraModule().config.attackImpulse, 0.35);
});
