'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const createGrass = require('../grama-cliente');
const worldMap = require('../mapas/mapa_mundo');

test('world grass is deterministic, terrain-gated, and bounded to visible patches', () => {
    const isGrassTerrain = function (x, y) {
        return x < 700;
    };
    const grass = createGrass(isGrassTerrain);
    const secondGrass = createGrass(isGrassTerrain);
    const bounds = { minX: 0, maxX: 1200, minY: 0, maxY: 800 };
    const visible = grass.collect(bounds, [], 1, 1000, 'mundo');
    const second = secondGrass.collect(bounds, [], 1, 1016, 'mundo');

    assert.ok(visible.length > 0);
    assert.ok(visible.length <= 360);
    assert.deepEqual(
        second.map(function (patch) { return [patch.x, patch.y]; }),
        visible.map(function (patch) { return [patch.x, patch.y]; }),
        'the same world coordinates should produce the same grass tufts'
    );
    assert.ok(second.every(function (patch) { return patch.x < 700; }));
    assert.equal(grass.collect(bounds, [], 1, 1032, 'deserto').length, 0);

    assert.equal(worldMap.ehTerrenoGrama(144000, 14018), true, 'the plant sanctuary should grow grass');
    assert.equal(worldMap.ehTerrenoGrama(153000, 14000), false, 'the desert should not grow grass');
    assert.equal(worldMap.ehTerrenoGrama(144000, 20000), false, 'the tundra should not grow grass');
});

test('moving players bend nearby grass, which then springs back after they pass', () => {
    const grass = createGrass(() => true);
    const bounds = { minX: 100, maxX: 700, minY: 100, maxY: 500 };
    const player = { id: 'player-1', x: 380, y: 280, moving: true, angle: 0 };

    grass.collect(bounds, [player], 1, 1000, 'mundo');
    player.x += 8;
    let visible = grass.collect(bounds, [player], 1, 1016, 'mundo');
    visible = grass.collect(bounds, [player], 1, 1032, 'mundo');
    const bentPatches = visible.filter(function (patch) { return patch.lean > 0.05; });

    assert.ok(bentPatches.length > 0, 'grass near a moving character should bend');
    assert.ok(bentPatches.some(function (patch) { return patch.leanX > 0; }),
        'the bend direction should follow the player movement');

    player.x = 1000;
    player.moving = false;
    for (let frame = 0; frame < 24; frame++) {
        visible = grass.collect(bounds, [player], 1, 1048 + frame * 16, 'mundo');
    }
    assert.ok(visible.every(function (patch) { return patch.lean < 0.02; }),
        'bent grass should recover after the player leaves');
});

test('grass tufts draw curved blades suitable for the world Y-sort pass', () => {
    const grass = createGrass(() => true);
    const curves = [];
    const context = {
        save() {},
        restore() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        quadraticCurveTo(controlX, controlY, endX, endY) {
            curves.push({ controlX, controlY, endX, endY });
        },
        stroke() {}
    };
    const visible = grass.collect(
        { minX: 0, maxX: 400, minY: 0, maxY: 300 },
        [],
        1,
        1000,
        'mundo'
    );

    assert.ok(visible.length > 0);
    visible[0].draw.call(visible[0], context);
    assert.equal(curves.length, 3, 'each tuft should render three curved blades');
});
