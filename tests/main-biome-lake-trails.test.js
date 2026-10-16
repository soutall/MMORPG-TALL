'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const mapaMundo = require('../mapas/mapa_mundo.js');

test('the central Gaia lake has a sandy walkable shore and blocks deep water', () => {
    assert.equal(mapaMundo.biomaNome(144280, 13830), 'Planície das Plantas (Santuário)');
    assert.equal(mapaMundo.colideMundo(144280, 13830), true);
    assert.equal(mapaMundo.colideMundo(143950, 13830), false);
    assert.deepEqual(mapaMundo.corPixelRgb(143950, 13830), [145, 125, 86]);

    const water = mapaMundo.corPixelRgb(144280, 13830);
    assert.ok(water[2] > water[1] && water[1] > water[0], `expected clear blue water, got ${water}`);
    assert.equal(mapaMundo.colideMundo(143854, 13897), false, 'the configured birth point must remain on dry land');
});

test('central footpaths are visible and treated as walkable non-grass terrain', () => {
    const road = mapaMundo.corPixelRgb(144000, 15110);
    const grass = mapaMundo.corPixelRgb(144000, 15270);

    assert.ok(road[0] > road[1] && road[1] > road[2], `expected earthy path colors, got ${road}`);
    assert.equal(mapaMundo.ehTerrenoGrama(144000, 15110), false);
    assert.equal(mapaMundo.ehTerrenoGrama(144000, 15270), true);

    const spawnTrail = mapaMundo.corPixelRgb(143854, 13897);
    assert.ok(spawnTrail[0] > spawnTrail[1] && spawnTrail[1] > spawnTrail[2]);
    assert.equal(mapaMundo.ehTerrenoGrama(143854, 13897), false);
});
