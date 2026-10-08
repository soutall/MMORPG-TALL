'use strict';

const BASIC_ATTACK_RANGE = 242;
const MORTAL_BOND_RANGE = 260;

const CONFIG = Object.freeze({
    classId: 'lord_malakar',
    skills: Object.freeze({
        summonSkull: Object.freeze({ id: 'lord_malakar_evocacao_demoníaca', cooldownMs: 4000, petrifiedPercent: 0.03 }),
        mortalBond: Object.freeze({ id: 'lord_malakar_vinculo_mortal', cooldownMs: 15000, durationMs: 5000, maxTargets: 4, healPercent: 0.10 }),
        eternalSuffering: Object.freeze({ id: 'lord_malakar_sofrimento_eterno', cooldownMs: 13000, baseCostPerSecond: 0.01, summonCostPerSecond: 0.005, minimumHpPercent: 0.20 }),
        randomSummon: Object.freeze({ id: 'lord_malakar_invocacao_aleatoria', cooldownMs: 20000 })
    }),
    skulls: Object.freeze([
        Object.freeze({ type: 'skull_warrior', label: 'Caveira Guerreira', petrifiedPercent: 0.03, maxCount: 2 }),
        Object.freeze({ type: 'skull_archer', label: 'Caveira Arqueira', petrifiedPercent: 0.03, maxCount: 2 }),
        Object.freeze({ type: 'skull_mage', label: 'Caveira Maga', petrifiedPercent: 0.03, maxCount: 1 })
    ]),
    minions: Object.freeze({
        reaper: Object.freeze({ id: 'reaper', label: 'Morte Ceifadora', petrifiedPercent: 0.10, durationMs: 30000, movementSpeedMultiplier: 1.5, attackCooldownMs: 1000, specialCooldownMs: 5000 }),
        sniper: Object.freeze({ id: 'sniper', label: 'Atirador das Profundezas', petrifiedPercent: 0.10, durationMs: 30000, attackCooldownMs: 1800 }),
        cleric: Object.freeze({ id: 'cleric', label: 'Clérigo das Almas', petrifiedPercent: 0.15, durationMs: 15000, movementSpeedMultiplier: 1.5, healCooldownMs: 2000 })
    }),
    damageReductionByPetrification: Object.freeze([
        Object.freeze({ percent: 0, reduction: 0 }),
        Object.freeze({ percent: 0.03, reduction: 0.02 }),
        Object.freeze({ percent: 0.06, reduction: 0.04 }),
        Object.freeze({ percent: 0.09, reduction: 0.06 }),
        Object.freeze({ percent: 0.12, reduction: 0.08 }),
        Object.freeze({ percent: 0.15, reduction: 0.10 })
    ]),
    maxSkulls: 5,
    linkBreakDistance: MORTAL_BOND_RANGE,
    skullWanderMinRadius: 55,
    skullWanderMaxRadius: 135,
    reaperDamage: 2,
    reaperSpinDamage: 2,
    sniperDamage: 3,
    warriorDamage: 2,
    archerDamage: 3,
    mageDamage: 5,
    entityAttackRange: 72,
    rangedAttackRange: 420,
    minionSpecialRange: 120,
    skullMovementStep: 2.5,
    minionMovementStep: 3,
    basicAttackDamage: 1,
    basicAttackCooldownMs: 500,
    basicAttackTickMs: 300,
    basicAttackRange: BASIC_ATTACK_RANGE
});

function numeric(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function maxHpOf(player) {
    return Math.max(1, numeric(player && player.maxHp, 1));
}

function getState(player) {
    if (!player || player.classe !== CONFIG.classId) return null;
    if (!player.lordMalakar || typeof player.lordMalakar !== 'object') {
        player.lordMalakar = {
            skulls: [],
            minion: null,
            link: null,
            sufferingActive: false,
            cooldowns: Object.create(null),
            nextDrainAt: 0,
            nextDialogueAt: 0,
            dialogue: null
        };
    }
    return player.lordMalakar;
}

function activeEntities(state) {
    return state.skulls.length + (state.minion ? 1 : 0);
}

function petrifiedPercent(state) {
    if (!state) return 0;
    return state.skulls.reduce(function (sum, skull) {
        return sum + numeric(skull.petrifiedPercent, 0);
    }, 0) + (state.minion ? numeric(state.minion.petrifiedPercent, 0) : 0);
}

function petrifiedHp(player) {
    const state = getState(player);
    return state ? Math.min(maxHpOf(player), maxHpOf(player) * petrifiedPercent(state)) : 0;
}

function availableMaxHp(player) {
    return Math.max(1, maxHpOf(player) - petrifiedHp(player));
}

function clampCurrentHpToAvailable(player) {
    if (!getState(player)) return;
    player.hp = Math.min(numeric(player.hp, 0), availableMaxHp(player));
}

function cooldownRemaining(player, skillId, now) {
    const state = getState(player);
    if (!state) return 0;
    return Math.max(0, numeric(state.cooldowns[skillId], 0) - numeric(now, Date.now()));
}

function setCooldown(player, skillId, now, durationMs) {
    const state = getState(player);
    if (!state) return false;
    state.cooldowns[skillId] = numeric(now, Date.now()) + Math.max(0, numeric(durationMs, 0));
    return true;
}

function canAffordPetrification(player, percent) {
    const maximum = maxHpOf(player);
    const cost = maximum * percent;
    return numeric(player.hp, 0) - cost >= maximum * CONFIG.skills.eternalSuffering.minimumHpPercent;
}

function selectSkullType(state) {
    const counts = state.skulls.reduce(function (result, skull) {
        result[skull.type] = (result[skull.type] || 0) + 1;
        return result;
    }, Object.create(null));
    return CONFIG.skulls.find(function (skull) {
        return (counts[skull.type] || 0) < skull.maxCount;
    }) || null;
}

function summonSkull(player, now) {
    const state = getState(player);
    const skill = CONFIG.skills.summonSkull;
    if (!state || player.hp <= 0) return { ok: false, reason: 'invalid_player' };
    if (cooldownRemaining(player, skill.id, now) > 0) return { ok: false, reason: 'cooldown' };
    if (state.skulls.length >= CONFIG.maxSkulls) return { ok: false, reason: 'skull_limit' };

    const type = selectSkullType(state);
    if (!type) return { ok: false, reason: 'skull_limit' };
    if (!canAffordPetrification(player, type.petrifiedPercent)) return { ok: false, reason: 'insufficient_hp' };

    const ownerX = numeric(player.x, 0) + 12;
    const ownerY = numeric(player.y, 0) + 16;
    let spawnPosition = null;
    for (const radius of [42, 54, 66, 78]) {
        const slots = radius === 42 ? CONFIG.maxSkulls : 12;
        for (let slot = 0; slot < slots; slot++) {
            const angle = slot * Math.PI * 2 / slots;
            const candidate = {
                x: ownerX + Math.cos(angle) * radius,
                y: ownerY + Math.sin(angle) * radius
            };
            if (state.skulls.every(function (skull) {
                return Math.hypot(skull.x - candidate.x, skull.y - candidate.y) >= 28;
            })) {
                spawnPosition = candidate;
                break;
            }
        }
        if (spawnPosition) break;
    }

    const skull = {
        id: 'malakar_' + type.type + '_' + Math.random().toString(36).slice(2, 12),
        type: type.type,
        label: type.label,
        x: spawnPosition ? spawnPosition.x : ownerX + 42,
        y: spawnPosition ? spawnPosition.y : ownerY,
        hp: 100,
        maxHp: 100,
        petrifiedPercent: type.petrifiedPercent,
        createdAt: now,
        attackAt: 0,
        targetId: null,
        targetType: null,
        stuckSince: 0,
        moving: false,
        angle: 0
    };
    state.skulls.push(skull);
    clampCurrentHpToAvailable(player);
    setCooldown(player, skill.id, now, skill.cooldownMs);
    return { ok: true, entity: skull, cooldownMs: skill.cooldownMs };
}

function getAttributes(player) {
    const attributes = player && player.atributos || {};
    return {
        forca: numeric(attributes.forca, 0),
        agilidade: numeric(attributes.agilidade, 0),
        divindade: numeric(attributes.divindade, 0)
    };
}

function minionChances(player) {
    const attributes = getAttributes(player);
    const maximum = Math.max(attributes.forca, attributes.agilidade, attributes.divindade);
    const winners = ['forca', 'agilidade', 'divindade'].filter(function (key) {
        return attributes[key] === maximum;
    });
    if (winners.length !== 1) return { reaper: 1 / 3, sniper: 1 / 3, cleric: 1 / 3 };
    const bonusId = winners[0] === 'forca' ? 'reaper' : winners[0] === 'agilidade' ? 'sniper' : 'cleric';
    const chances = { reaper: 1 / 3, sniper: 1 / 3, cleric: 1 / 3 };
    chances[bonusId] += 0.10;
    Object.keys(chances).forEach(function (key) {
        if (key !== bonusId) chances[key] -= 0.05;
    });
    return chances;
}

function rollMinion(player, random) {
    const chances = minionChances(player);
    const value = Math.max(0, Math.min(0.999999999, numeric((random || Math.random)(), 0)));
    let cumulative = 0;
    for (const id of ['reaper', 'sniper', 'cleric']) {
        cumulative += chances[id];
        if (value < cumulative) return id;
    }
    return 'cleric';
}

function summonMinion(player, now, random) {
    const state = getState(player);
    const skill = CONFIG.skills.randomSummon;
    if (!state || player.hp <= 0) return { ok: false, reason: 'invalid_player' };
    if (cooldownRemaining(player, skill.id, now) > 0) return { ok: false, reason: 'cooldown' };

    const typeId = rollMinion(player, random);
    const config = CONFIG.minions[typeId];
    const oldMinion = state.minion;
    state.minion = null;
    if (!canAffordPetrification(player, config.petrifiedPercent)) {
        state.minion = oldMinion;
        return { ok: false, reason: 'insufficient_hp' };
    }

    const minion = {
        id: 'malakar_' + typeId + '_' + Math.random().toString(36).slice(2, 12),
        type: typeId,
        label: config.label,
        x: numeric(player.x, 0) - 30,
        y: numeric(player.y, 0) + 20,
        hp: 100,
        maxHp: 100,
        createdAt: now,
        expiresAt: now + config.durationMs,
        petrifiedPercent: config.petrifiedPercent,
        attackAt: 0,
        specialAt: typeId === 'reaper' ? now + config.specialCooldownMs : 0,
        healAt: 0,
        targetId: null,
        targetType: null,
        shotCount: 0,
        moving: false,
        angle: 0
    };
    state.minion = minion;
    clampCurrentHpToAvailable(player);
    setCooldown(player, skill.id, now, skill.cooldownMs);
    return { ok: true, entity: minion, replaced: oldMinion, cooldownMs: skill.cooldownMs };
}

function releaseSkull(player, skullId) {
    const state = getState(player);
    if (!state) return null;
    const index = state.skulls.findIndex(function (skull) { return skull.id === skullId; });
    if (index < 0) return null;
    const removed = state.skulls.splice(index, 1)[0];
    return removed;
}

function releaseMinion(player) {
    const state = getState(player);
    if (!state || !state.minion) return null;
    const removed = state.minion;
    state.minion = null;
    return removed;
}

function toggleSuffering(player, now) {
    const state = getState(player);
    const skill = CONFIG.skills.eternalSuffering;
    if (!state || player.hp <= 0) return { ok: false, reason: 'invalid_player' };
    if (state.sufferingActive) {
        state.sufferingActive = false;
        state.nextDrainAt = 0;
        setCooldown(player, skill.id, now, skill.cooldownMs);
        return { ok: true, active: false, cooldownMs: skill.cooldownMs };
    }
    if (cooldownRemaining(player, skill.id, now) > 0) return { ok: false, reason: 'cooldown' };
    if (player.hp <= maxHpOf(player) * skill.minimumHpPercent) return { ok: false, reason: 'hp_threshold' };
    state.sufferingActive = true;
    state.nextDrainAt = now + 1000;
    return { ok: true, active: true, cooldownMs: 0 };
}

function drainSuffering(player, now) {
    const state = getState(player);
    if (!state || !state.sufferingActive || now < state.nextDrainAt) return { drained: 0, deactivated: false };
    const skill = CONFIG.skills.eternalSuffering;
    const elapsedSeconds = Math.max(1, Math.floor((now - state.nextDrainAt) / 1000) + 1);
    const rate = skill.baseCostPerSecond + activeEntities(state) * skill.summonCostPerSecond;
    const threshold = maxHpOf(player) * skill.minimumHpPercent;
    const drain = Math.min(Math.max(0, player.hp - threshold), maxHpOf(player) * rate * elapsedSeconds);
    player.hp = Math.max(threshold, player.hp - drain);
    state.nextDrainAt += elapsedSeconds * 1000;
    if (player.hp <= threshold) {
        state.sufferingActive = false;
        state.nextDrainAt = 0;
        setCooldown(player, skill.id, now, skill.cooldownMs);
        return { drained: drain, deactivated: true };
    }
    return { drained: drain, deactivated: false };
}

function linkTargets(player, targets, now) {
    const state = getState(player);
    const skill = CONFIG.skills.mortalBond;
    if (!state || player.hp <= 0) return { ok: false, reason: 'invalid_player' };
    if (cooldownRemaining(player, skill.id, now) > 0) return { ok: false, reason: 'cooldown' };
    const uniqueTargets = Array.from(new Set((targets || []).filter(function (id) {
        return typeof id === 'string' && id.length > 0;
    }))).slice(0, skill.maxTargets);
    if (uniqueTargets.length === 0) return { ok: false, reason: 'no_valid_targets' };
    state.link = {
        targetIds: uniqueTargets,
        createdAt: now,
        expiresAt: now + skill.durationMs,
        sourceX: numeric(player.x, 0) + 12,
        sourceY: numeric(player.y, 0) + 16
    };
    setCooldown(player, skill.id, now, skill.cooldownMs);
    return { ok: true, link: state.link, cooldownMs: skill.cooldownMs };
}

function unlink(player) {
    const state = getState(player);
    if (!state || !state.link) return null;
    const link = state.link;
    state.link = null;
    return link;
}

function clearSummons(player) {
    const state = getState(player);
    if (!state) return [];
    const removed = state.skulls.slice();
    if (state.minion) removed.push(state.minion);
    if (state.link) removed.push({ type: 'link', ...state.link });
    state.skulls = [];
    state.minion = null;
    state.link = null;
    state.sufferingActive = false;
    state.nextDrainAt = 0;
    state.dialogue = null;
    clampCurrentHpToAvailable(player);
    return removed;
}

function linkedHealAmount(damage) {
    const damageDealt = Math.max(0, numeric(damage, 0));
    if (damageDealt <= 0) return 0;
    return Math.max(1, Math.floor(damageDealt * CONFIG.skills.mortalBond.healPercent));
}

function damageReduction(player) {
    const percent = petrifiedPercent(getState(player));
    let reduction = 0;
    for (const row of CONFIG.damageReductionByPetrification) {
        if (percent + 1e-9 >= row.percent) reduction = row.reduction;
        else break;
    }
    return reduction;
}

function tickPlayer(player, now) {
    const state = getState(player);
    if (!state) return null;
    const events = [];
    for (let i = state.skulls.length - 1; i >= 0; i--) {
        if (state.skulls[i].hp <= 0) {
            const dead = state.skulls.splice(i, 1)[0];
            events.push({ type: 'skull_removed', entity: dead, reason: 'dead' });
        }
    }
    if (state.minion && state.minion.expiresAt <= now) {
        events.push({ type: 'minion_removed', entity: state.minion, reason: 'expired' });
        state.minion = null;
    }
    if (state.link) {
        if (state.link.expiresAt <= now) {
            events.push({ type: 'link_removed', reason: 'expired', link: state.link });
            state.link = null;
        } else {
            state.link.sourceX = numeric(player.x, 0) + 12;
            state.link.sourceY = numeric(player.y, 0) + 16;
        }
    }
    clampCurrentHpToAvailable(player);
    const drain = drainSuffering(player, now);
    if (drain.drained > 0) events.push({ type: 'suffering_drain', amount: drain.drained });
    if (drain.deactivated) events.push({ type: 'suffering_deactivated', reason: 'hp_threshold' });
    return events;
}

function clear(player) {
    const state = getState(player);
    if (!state) return [];
    const removed = state.skulls.slice();
    if (state.minion) removed.push(state.minion);
    if (state.link) removed.push({ type: 'link', ...state.link });
    player.lordMalakar = null;
    return removed;
}

module.exports = {
    CONFIG,
    getState,
    activeEntities,
    petrifiedPercent,
    petrifiedHp,
    availableMaxHp,
    clampCurrentHpToAvailable,
    cooldownRemaining,
    setCooldown,
    summonSkull,
    minionChances,
    rollMinion,
    summonMinion,
    releaseSkull,
    releaseMinion,
    toggleSuffering,
    drainSuffering,
    linkTargets,
    unlink,
    clearSummons,
    linkedHealAmount,
    damageReduction,
    tickPlayer,
    clear
};
