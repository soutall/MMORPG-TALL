'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const malakar = require('../sistemas/lord_malakar.js');

function player(overrides) {
    return Object.assign({
        classe: 'lord_malakar',
        hp: 1000,
        maxHp: 1000,
        x: 100,
        y: 200,
        atributos: { forca: 10, agilidade: 10, divindade: 10 }
    }, overrides || {});
}

test('ataque básico do Lord Malakar causa exatamente 1 de dano base', () => {
    assert.equal(malakar.CONFIG.basicAttackDamage, 1);
    assert.equal(malakar.CONFIG.basicAttackTickMs, 300);
});

test('ataque básico tem o mesmo alcance do Mago e Vínculo Mortal mantém alcance próprio', () => {
    assert.equal(malakar.CONFIG.basicAttackRange, 242);
    assert.equal(malakar.CONFIG.linkBreakDistance, 260);
});

test('Evocação Demoníaca respeita cooldown, custo petrificado e limites por tipo', () => {
    const p = player();
    for (let i = 0; i < 5; i++) {
        const result = malakar.summonSkull(p, i * 4000);
        assert.equal(result.ok, true);
        assert.equal(result.cooldownMs, malakar.CONFIG.skills.summonSkull.cooldownMs);
    }
    assert.deepEqual(p.lordMalakar.skulls.map((skull) => skull.type), [
        'skull_warrior', 'skull_warrior', 'skull_archer', 'skull_archer', 'skull_mage'
    ]);
    assert.equal(malakar.petrifiedPercent(p.lordMalakar), 0.15);
    assert.equal(p.hp, 850);
    assert.equal(malakar.summonSkull(p, 20000).reason, 'skull_limit');
    for (let i = 0; i < p.lordMalakar.skulls.length; i++) {
        for (let j = i + 1; j < p.lordMalakar.skulls.length; j++) {
            const a = p.lordMalakar.skulls[i];
            const b = p.lordMalakar.skulls[j];
            assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 28);
        }
    }
});

test('liberar uma caveira restaura a capacidade de cura sem conceder cura', () => {
    const p = player();
    const skull = malakar.summonSkull(p, 1000).entity;
    assert.equal(malakar.availableMaxHp(p), 970);
    assert.equal(malakar.releaseSkull(p, skull.id), skull);
    assert.equal(malakar.availableMaxHp(p), 1000);
    assert.equal(p.hp, 970);
});

test('evocações não podem reduzir a vida disponível abaixo de 20%', () => {
    const p = player({ hp: 225 });
    assert.equal(malakar.summonSkull(p, 1000).reason, 'insufficient_hp');
    assert.equal(p.lordMalakar.skulls.length, 0);
});

test('passiva aplica a tabela configurada e não afeta outras classes', () => {
    const p = player();
    assert.equal(malakar.damageReduction(p), 0);
    for (let i = 0; i < 5; i++) malakar.summonSkull(p, i * 4000);
    assert.equal(malakar.damageReduction(p), 0.10);
    assert.equal(malakar.damageReduction(player({ classe: 'guerreiro' })), 0);
});

test('chance do lacaio usa o maior atributo e empate mantém pesos iguais', () => {
    assert.deepEqual(malakar.minionChances(player({
        atributos: { forca: 12, agilidade: 10, divindade: 9 }
    })), { reaper: 0.43333333333333335, sniper: 0.2833333333333333, cleric: 0.2833333333333333 });
    assert.deepEqual(malakar.minionChances(player()), { reaper: 1 / 3, sniper: 1 / 3, cleric: 1 / 3 });
    assert.equal(malakar.rollMinion(player(), () => 0.5), 'sniper');
});

test('Invocação Aleatória substitui um lacaio e recusa vida insuficiente sem removê-lo', () => {
    const p = player({ atributos: { forca: 10, agilidade: 10, divindade: 15 } });
    const first = malakar.summonMinion(p, 1000, () => 0.99);
    assert.equal(first.entity.type, 'cleric');
    assert.equal(first.entity.hp, first.entity.maxHp);
    assert.equal(first.cooldownMs, malakar.CONFIG.skills.randomSummon.cooldownMs);
    p.hp = 240;
    const rejected = malakar.summonMinion(p, 22000, () => 0);
    assert.equal(rejected.reason, 'insufficient_hp');
    assert.equal(p.lordMalakar.minion.id, first.entity.id);
});

test('lacaios skill 4 têm dano reduzido e expiram removendo seu estado', () => {
    assert.deepEqual(
        [
            malakar.CONFIG.minions.reaper.durationMs,
            malakar.CONFIG.minions.sniper.durationMs,
            malakar.CONFIG.minions.cleric.durationMs
        ],
        [30000, 30000, 15000]
    );
    assert.equal(malakar.CONFIG.minions.reaper.movementSpeedMultiplier, 1.5);
    assert.equal(malakar.CONFIG.minions.cleric.movementSpeedMultiplier, 1.5);
    assert.deepEqual(
        [malakar.CONFIG.reaperDamage, malakar.CONFIG.reaperSpinDamage, malakar.CONFIG.sniperDamage],
        [2, 2, 3]
    );
    assert.equal(malakar.CONFIG.skullMovementStep, 2.5);
    assert.equal(malakar.CONFIG.minionMovementStep, 3);
    assert.deepEqual(
        [malakar.CONFIG.warriorDamage, malakar.CONFIG.archerDamage, malakar.CONFIG.mageDamage],
        [2, 3, 5]
    );
    const p = player();
    const summoned = malakar.summonMinion(p, 1000, () => 0);
    assert.equal(summoned.entity.type, 'reaper');
    const events = malakar.tickPlayer(p, summoned.entity.expiresAt);
    assert.equal(p.lordMalakar.minion, null);
    assert.ok(events.some((event) => event.type === 'minion_removed' &&
        event.entity.id === summoned.entity.id && event.reason === 'expired'));
});

test('Vínculo Mortal limita alvos únicos a quatro e cura apenas fração do dano', () => {
    const p = player();
    const result = malakar.linkTargets(p, ['a', 'b', 'a', 'c', 'd', 'e'], 1000);
    assert.equal(result.ok, true);
    assert.equal(result.cooldownMs, malakar.CONFIG.skills.mortalBond.cooldownMs);
    assert.deepEqual(result.link.targetIds, ['a', 'b', 'c', 'd']);
    assert.equal(malakar.linkedHealAmount(100), 10);
    assert.equal(malakar.linkedHealAmount(3), 1);
    assert.equal(malakar.linkedHealAmount(2), 1);
    assert.equal(malakar.linkedHealAmount(0), 0);
});

test('Sofrimento Eterno drena conforme invocações e desativa no limite de 20%', () => {
    const p = player({ hp: 205 });
    assert.equal(malakar.toggleSuffering(p, 1000).ok, true);
    const result = malakar.drainSuffering(p, 2000);
    assert.equal(result.deactivated, true);
    assert.equal(p.hp, 200);
    assert.equal(p.lordMalakar.sufferingActive, false);
    assert.equal(malakar.cooldownRemaining(p, malakar.CONFIG.skills.eternalSuffering.id, 2000), 13000);
});

test('limpeza remove entidades temporárias e não as persiste', () => {
    const p = player();
    malakar.summonSkull(p, 1000);
    const removed = malakar.clear(p);
    assert.equal(removed.length, 1);
    assert.equal(p.lordMalakar, null);
});

test('limpeza por troca de mapa remove summons e conserva estado e cooldowns', () => {
    const p = player();
    const skull = malakar.summonSkull(p, 1000).entity;
    const cooldown = p.lordMalakar.cooldowns[malakar.CONFIG.skills.summonSkull.id];
    const removed = malakar.clearSummons(p);
    assert.equal(removed[0], skull);
    assert.equal(p.lordMalakar.skulls.length, 0);
    assert.equal(p.lordMalakar.cooldowns[malakar.CONFIG.skills.summonSkull.id], cooldown);
    assert.equal(p.hp, 970);
});
