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
    assert.equal(worldMap.ehPlanicieCentral(144000, 14018), true, 'the central plain should receive enhanced grass');
    assert.equal(worldMap.ehPlanicieCentral(144000, 8800), false, 'the forest must keep its original grass');
});

test('only central plain grass gets stronger color, height, and bending', () => {
    const grass = createGrass(() => true, function (x) { return x < 300; });
    const regularGrass = createGrass(() => true, () => false);
    const visible = grass.collect(
        { minX: 0, maxX: 700, minY: 0, maxY: 420 },
        [],
        1,
        1000,
        'mundo'
    );
    const player = { id: 'traveler', x: 240, y: 280, moving: true, angle: 0 };
    grass.collect({ minX: 0, maxX: 700, minY: 0, maxY: 420 }, [player], 1, 1016, 'mundo');
    regularGrass.collect({ minX: 0, maxX: 700, minY: 0, maxY: 420 }, [player], 1, 1016, 'mundo');
    player.x += 8;
    const bendingEnhanced = grass.collect(
        { minX: 0, maxX: 700, minY: 0, maxY: 420 }, [player], 1, 1032, 'mundo'
    );
    const bendingRegular = regularGrass.collect(
        { minX: 0, maxX: 700, minY: 0, maxY: 420 }, [player], 1, 1032, 'mundo'
    );
    const enhanced = visible.filter(function (patch) { return patch.enhanced; });
    const regular = visible.filter(function (patch) { return !patch.enhanced; });

    assert.ok(enhanced.length > 0);
    assert.ok(regular.length > 0);
    assert.ok(enhanced.every(function (patch) {
        return patch.height >= 13 && patch.height < 21 && patch.bendRadius === 76 && patch.bendScale === 1.35;
    }));
    assert.ok(regular.every(function (patch) {
        return patch.height >= 9 && patch.height < 17 && patch.bendRadius === 54 && patch.bendScale === 1;
    }));
    const bentPlainPatch = bendingEnhanced.find(function (patch) {
        return patch.enhanced && patch.leanX > 0.02;
    });
    assert.ok(bentPlainPatch, 'moving through the plain should visibly bend enhanced grass');
    const matchingRegularPatch = bendingRegular.find(function (patch) {
        return patch.x === bentPlainPatch.x && patch.y === bentPlainPatch.y;
    });
    assert.ok(bentPlainPatch.leanX > matchingRegularPatch.leanX,
        'the plain grass should respond more quickly to movement than regular grass');
});

test('central plain grass forms deterministic clusters with varied tuft shapes', () => {
    const isPlain = function () { return true; };
    const bounds = { minX: 0, maxX: 2400, minY: 0, maxY: 1200 };
    const first = createGrass(isPlain, isPlain).collect(bounds, [], 1, 1000, 'mundo');
    const second = createGrass(isPlain, isPlain).collect(bounds, [], 1, 1016, 'mundo');
    const bladeCounts = new Set(first.map(function (patch) { return patch.bladeCount; }));
    const tileCounts = new Map();
    for (const patch of first) {
        const tile = Math.floor(patch.x / 240) + ':' + Math.floor(patch.y / 210);
        tileCounts.set(tile, (tileCounts.get(tile) || 0) + 1);
    }

    assert.deepEqual(
        second.map(function (patch) { return [patch.x, patch.y, patch.bladeCount]; }),
        first.map(function (patch) { return [patch.x, patch.y, patch.bladeCount]; }),
        'cluster placement and tuft shape should be deterministic'
    );
    assert.ok(bladeCounts.size > 1, 'tufts should have different numbers of blades');
    assert.ok(Math.max(...tileCounts.values()) - Math.min(...tileCounts.values()) >= 3,
        'nearby areas should vary between sparse grass and denser clumps');
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

test('central plain tufts draw open, fanned blades suitable for the world Y-sort pass', () => {
    const grass = createGrass(() => true, () => true);
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
    const bladeCount = visible[0].bladeCount;
    assert.equal(curves.length, bladeCount, 'central plain tufts should render their varied blade count');
    const bladeTips = curves.slice(0, bladeCount).map(function (curve) { return curve.endX; });
    assert.ok(Math.max(...bladeTips) - Math.min(...bladeTips) > 12,
        'blade tips should spread into a fan instead of staying parallel');
});
