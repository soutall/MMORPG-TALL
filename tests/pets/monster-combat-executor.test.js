'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { executeAttack } = require('../../sistemas/pets/monster_combat_executor');

test('executes validated attack through server damage adapter and starts cooldown', () => {
    const attacker = { x: 0, y: 0, hp: 10, nextAttackAt: 0 };
    const target = { x: 3, y: 4, hp: 10 };
    let appliedDamage = 0;

    const result = executeAttack({
        attacker,
        target,
        range: 5,
        now: 1000,
        cooldownMs: 400,
        validate: () => ({ valid: true }),
        applyDamage: () => { appliedDamage += 2; return true; }
    });

    assert.equal(result.valid, true);
    assert.equal(appliedDamage, 2);
    assert.equal(attacker.nextAttackAt, 1400);
});

test('rejects out-of-range and cooldown attacks without applying damage', () => {
    const attacker = { x: 0, y: 0, hp: 10, nextAttackAt: 1200 };
    const target = { x: 10, y: 0, hp: 10 };
    let appliedDamage = 0;
    const options = {
        attacker,
        target,
        range: 5,
        now: 1000,
        cooldownMs: 400,
        applyDamage: () => { appliedDamage += 1; return true; }
    };

    assert.equal(executeAttack(options).reason, 'target_out_of_range');
    target.x = 3;
    assert.equal(executeAttack(options).reason, 'cooldown_active');
    assert.equal(appliedDamage, 0);
});

test('rejects server target validation before invoking damage', () => {
    let appliedDamage = false;
    const result = executeAttack({
        attacker: { x: 0, y: 0, hp: 10 },
        target: { x: 1, y: 0, hp: 10 },
        range: 5,
        now: 1000,
        validate: () => ({ valid: false, reason: 'pvp_rejected' }),
        applyDamage: () => { appliedDamage = true; return true; }
    });

    assert.equal(result.reason, 'pvp_rejected');
    assert.equal(appliedDamage, false);
});
