'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rendererSource = fs.readFileSync(path.join(__dirname, '../../monstros.js'), 'utf8');

function renderPetAnimation(animationState) {
    let now = 10000;
    const draws = [];
    const canvas = {
        save() {},
        restore() {},
        translate() {},
        scale() {},
        drawImage(...args) { draws.push(args); }
    };
    class ControlledDate extends Date {
        static now() { return now; }
    }
    const window = { ctx: canvas };
    const context = vm.createContext({
        window,
        Date: ControlledDate,
        console: { error() {} },
        fetch: () => Promise.resolve({ ok: false, status: 404 })
    });

    vm.runInContext(rendererSource, context, { filename: 'monstros.js' });
    const frames = {
        idle_E: 1,
        walk_E: 2,
        action_E: 3,
        hit_E: 4
    };
    context._slimeSprites.slime = {
        metadata: { frameWidth: 8, frameHeight: 8, originX: 4, originY: 7 },
        image: {},
        clipsByName: Object.fromEntries(Object.entries(frames).map(([name, x]) => [
            name,
            { name, fps: 10, loop: true, frames: [{ page: 0, x, y: 0, durationMs: 100 }] }
        ]))
    };
    const pet = {
        id: 'pet-renderer-test',
        pet_instance_id: 'pet-renderer-test',
        species_id: 'slime',
        tipo: 'slime',
        asset: 'slime',
        x: 10,
        y: 10,
        hp: 80,
        maxHp: 100,
        angulo: 0,
        aiEstado: 'combat',
        animationState,
        animationStartedAt: now,
        animationUntil: now + 700,
        aiAtacandoAte: animationState === 'ATTACK' ? now + 700 : 0
    };

    window.desenharSlime(pet);
    now += 100;
    return draws[0] && draws[0][1];
}

test('shared monster renderer plays Pet ATTACK and HIT clips from runtime animation state', () => {
    assert.equal(renderPetAnimation('ATTACK'), 3,
        'ATTACK must select the species action clip through desenharSlime');
    assert.equal(renderPetAnimation('HIT'), 4,
        'HIT must select the species damage clip through desenharSlime');
});
