const { getSpeciesById, isMonsterCapturable, validateSpeciesId } = require('./pet_species.js');
const { createPetInstance } = require('./pet_instance.js');
const { rollRarity, generatePetStatus } = require('./pet_rarity.js');
const { generatePassiveSet } = require('./pet_passives.js');
const { pickTraits } = require('./pet_traits.js');
const { ensurePlayerPetState } = require('./pet_persistence.js');

const CAPTURE_CONFIG = Object.freeze({
    maxDistance: 140,
    cooldownMs: 3000,
    resistanceDecayMs: 60000,
    maxResistance: 0.72,
    minChance: 0.02,
    maxChance: 0.88,
    monsterCapWindow: {
        above75: 0.34,
        between75and50: 0.56,
        between50and30: 0.74,
        between30and15: 1.0,
        below15: 1.18
    }
});

function normalizeCaptureProfile(profile) {
    const normalized = ensurePlayerPetState(profile || {});
    if (!normalized.captureState || typeof normalized.captureState !== 'object') {
        normalized.captureState = { species: {}, lastCaptureAt: 0, successfulAttempts: 0 };
    }
    if (!normalized.captureState.species || typeof normalized.captureState.species !== 'object') {
        normalized.captureState.species = {};
    }
    return normalized;
}

function getSpeciesCaptureRecord(profile, speciesId) {
    const normalized = normalizeCaptureProfile(profile);
    const key = String(speciesId || '').trim();
    if (!normalized.captureState.species[key]) {
        normalized.captureState.species[key] = {
            attempts: 0,
            fails: 0,
            captures: 0,
            bestRarity: 'comum',
            bestPotential: 0,
            resistance: 0,
            resistanceUntil: 0,
            lastAttemptAt: 0,
            lastFailureAt: 0
        };
    }
    if (profile && typeof profile === 'object') {
        profile.captureState = normalized.captureState;
    }
    return normalized.captureState.species[key];
}

function getResistanceMultiplier(record) {
    const now = Date.now();
    if (!record) return 1;
    if (record.resistanceUntil && record.resistanceUntil <= now) {
        record.resistance = 0;
        record.resistanceUntil = 0;
    }
    return Math.max(0, 1 - (Number(record.resistance || 0) || 0));
}

function calculateCaptureChance(options) {
    const playerLevel = Number.isFinite(Number(options && options.playerLevel !== undefined ? options.playerLevel : 1))
        ? Number(options.playerLevel)
        : 1;
    const monsterLevel = Number.isFinite(Number(options && options.monsterLevel !== undefined ? options.monsterLevel : 1))
        ? Number(options.monsterLevel)
        : 1;
    const monsterHp = Number.isFinite(Number(options && options.monsterHp !== undefined ? options.monsterHp : 1))
        ? Number(options.monsterHp)
        : 1;
    const maxHp = Number.isFinite(Number(options && options.maxHp !== undefined ? options.maxHp : 1))
        ? Number(options.maxHp)
        : 1;
    const masteryLevel = Number.isFinite(Number(options && options.masteryLevel !== undefined ? options.masteryLevel : 0))
        ? Number(options.masteryLevel)
        : 0;
    const pityFails = Number.isFinite(Number(options && options.pityFails !== undefined ? options.pityFails : 0))
        ? Number(options.pityFails)
        : 0;
    const resistance = Number.isFinite(Number(options && options.resistance !== undefined ? options.resistance : 0))
        ? Number(options.resistance)
        : 0;
    const knowledgeLevelValue = Number(options && options.knowledgeLevel);
    const knowledgeLevel = Number.isFinite(knowledgeLevelValue) ? Math.max(0, knowledgeLevelValue) : 0;

    const levelGap = monsterLevel - playerLevel;
    const levelBias = levelGap <= -10 ? 28 :
        levelGap <= -5 ? 20 :
        levelGap <= 0 ? 15 :
        levelGap <= 10 ? 9 :
        levelGap <= 20 ? 5 :
        levelGap <= 35 ? 2 : 1;

    const hpRatio = maxHp > 0 ? monsterHp / maxHp : 0;
    const hpWindow = hpRatio > 0.75 ? CAPTURE_CONFIG.monsterCapWindow.above75 :
        hpRatio > 0.5 ? CAPTURE_CONFIG.monsterCapWindow.between75and50 :
        hpRatio > 0.3 ? CAPTURE_CONFIG.monsterCapWindow.between50and30 :
        hpRatio > 0.15 ? CAPTURE_CONFIG.monsterCapWindow.between30and15 :
        CAPTURE_CONFIG.monsterCapWindow.below15;

    const masteryBonus = Math.min(23, masteryLevel * 1.8);
    const knowledgeBonus = Math.min(15, Math.max(0, knowledgeLevel) * 1.5);
    const pityBonus = Math.min(18, pityFails * 2.2);
    const resistancePenalty = resistance * 52;
    const chance = (35 + levelBias + hpWindow * 24 + masteryBonus + knowledgeBonus + pityBonus - resistancePenalty);
    const clamped = Math.min(CAPTURE_CONFIG.maxChance, Math.max(CAPTURE_CONFIG.minChance, chance / 100));
    return Number(clamped.toFixed(4));
}

function validateCaptureAttempt(options) {
    const player = options && options.player ? options.player : null;
    const monster = options && options.monster ? options.monster : null;
    const profile = options && options.profile ? options.profile : {};
    const now = options && options.now ? options.now : Date.now();
    const targetX = Number(options && options.targetX !== undefined ? options.targetX : monster && monster.x !== undefined ? monster.x : 0);
    const targetY = Number(options && options.targetY !== undefined ? options.targetY : monster && monster.y !== undefined ? monster.y : 0);
    const sourceX = Number(options && options.sourceX !== undefined ? options.sourceX : player && player.x !== undefined ? player.x : 0);
    const sourceY = Number(options && options.sourceY !== undefined ? options.sourceY : player && player.y !== undefined ? player.y : 0);

    if (!player || !player.id) return { valid: false, reason: 'player_missing' };
    if (!monster || !monster.id) return { valid: false, reason: 'monster_missing' };
    if (monster.hp == null || Number(monster.hp) <= 0) return { valid: false, reason: 'monster_dead' };
    if (monster.maxHp == null || Number(monster.maxHp) <= 0) return { valid: false, reason: 'monster_max_hp_invalid' };

    const speciesId = monster.species_id || monster.tipo || monster.monster_type;
    if (!speciesId) return { valid: false, reason: 'species_missing' };
    const species = getSpeciesById(validateSpeciesId(String(speciesId)));
    if (!species) return { valid: false, reason: 'species_unknown' };
    if (!isMonsterCapturable(species)) return { valid: false, reason: 'species_not_capturable' };

    const distance = Math.hypot((sourceX || 0) - (targetX || 0), (sourceY || 0) - (targetY || 0));
    if (distance > CAPTURE_CONFIG.maxDistance) return { valid: false, reason: 'distance_invalid' };

    const captureProfile = normalizeCaptureProfile(profile);
    const record = getSpeciesCaptureRecord(captureProfile, species.species_id);
    const lastCaptureAt = Number(captureProfile.captureState.lastCaptureAt || 0);
    if (lastCaptureAt && now - lastCaptureAt < CAPTURE_CONFIG.cooldownMs) {
        return { valid: false, reason: 'cooldown_active' };
    }
    const resistanceMultiplier = getResistanceMultiplier(record);
    const masteryLevel = Number((captureProfile.maestria && captureProfile.maestria[species.species_id] && captureProfile.maestria[species.species_id].nivelMaestria) || 0);
    const knowledgeLevel = Number((captureProfile.bestiario && captureProfile.bestiario[species.species_id] &&
        captureProfile.bestiario[species.species_id].nivelConhecimento) || 0);
    const chance = calculateCaptureChance({
        playerLevel: Number((player.level || player.nivel || 1)),
        monsterLevel: Number(monster.nivel || species.level || 1),
        monsterHp: Number(monster.hp),
        maxHp: Number(monster.maxHp),
        masteryLevel,
        knowledgeLevel,
        pityFails: Number(record.fails || 0),
        resistance: Number(record.resistance || 0) * resistanceMultiplier
    });

    return {
        valid: true,
        reason: 'valid',
        species: species,
        record: record,
        chance: chance,
        profile: captureProfile,
        hpRatio: Number((monster.hp / monster.maxHp).toFixed(4))
    };
}

function applyFailedCapture(profile, speciesId, now) {
    const normalized = normalizeCaptureProfile(profile);
    const record = getSpeciesCaptureRecord(normalized, speciesId);
    record.attempts = Number(record.attempts || 0) + 1;
    record.fails = Number(record.fails || 0) + 1;
    record.lastFailureAt = now;
    record.resistance = Math.min(CAPTURE_CONFIG.maxResistance, Number(record.resistance || 0) + 0.18);
    record.resistanceUntil = now + CAPTURE_CONFIG.resistanceDecayMs;
    normalized.captureState.lastCaptureAt = now;
    return normalized;
}

function applySuccessfulCapture(profile, speciesId, rarity, potential, now) {
    const normalized = normalizeCaptureProfile(profile);
    const record = getSpeciesCaptureRecord(normalized, speciesId);
    record.attempts = Number(record.attempts || 0) + 1;
    record.captures = Number(record.captures || 0) + 1;
    record.bestRarity = rarity && getRarityRank(rarity) > getRarityRank(record.bestRarity) ? rarity : record.bestRarity;
    record.bestPotential = Math.max(Number(record.bestPotential || 0), Number(potential || 0));
    record.fails = Math.max(0, Number(record.fails || 0) - 1);
    record.resistance = 0;
    record.resistanceUntil = 0;
    normalized.captureState.lastCaptureAt = now;
    normalized.captureState.successfulAttempts = Number(normalized.captureState.successfulAttempts || 0) + 1;
    return normalized;
}

function getRarityRank(rarity) {
    const order = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
    const index = order.indexOf(String(rarity || 'comum').toLowerCase());
    return index === -1 ? 0 : index;
}

function createPetCaptureResult(options) {
    const profile = normalizeCaptureProfile(options && options.profile ? options.profile : {});
    const speciesId = String(options && options.speciesId ? options.speciesId : options && options.monster && (options.monster.species_id || options.monster.tipo || options.monster.monster_type) || '').trim();
    const species = getSpeciesById(validateSpeciesId(speciesId));
    if (!species) {
        throw new Error('Espécie inválida para captura: ' + speciesId);
    }
    const player = options && options.player ? options.player : {};
    const monster = options && options.monster ? options.monster : {};
    const now = options && options.now ? options.now : Date.now();
    const random = options && typeof options.random === 'function' ? options.random : Math.random;

    const validation = validateCaptureAttempt({
        player,
        monster,
        profile,
        now,
        sourceX: options && options.sourceX !== undefined ? options.sourceX : player.x,
        sourceY: options && options.sourceY !== undefined ? options.sourceY : player.y,
        targetX: options && options.targetX !== undefined ? options.targetX : monster.x,
        targetY: options && options.targetY !== undefined ? options.targetY : monster.y
    });

    if (!validation.valid) {
        return { success: false, reason: validation.reason, chance: 0, valid: false, profile: profile };
    }

    const record = validation.record;
    const opportunity = validation.chance;
    const roll = random();
    if (roll > opportunity) {
        const failedProfile = applyFailedCapture(profile, species.species_id, now);
        return { success: false, reason: 'capture_failed', valid: true, chance: opportunity, profile: failedProfile, resistance: Number(record.resistance || 0) + 0.18 };
    }

    const potential = Math.min(100, Math.max(0, Math.round((random() * 70) + (record.fails * 2) + (profile.captureState.successfulAttempts || 0))));
    const rarity = rollRarity({ random, pityBoost: Number(record.fails || 0) });
    const status = generatePetStatus(species, rarity, potential, random);
    const petInstance = createPetInstance(species.species_id, {
        nome: species.nome,
        level: 1,
        xp: 0,
        rarity: rarity,
        potential: potential,
        status: status,
        passivas: generatePassiveSet(species.species_id, rarity, potential, { random: random }),
        traits: pickTraits({ count: 1, random: random }),
        visual: species.visual || { asset: species.monster_data && species.monster_data.asset ? species.monster_data.asset : null },
        skills: Array.isArray(species.skills) && species.skills.length ? species.skills.slice() : [],
        monster_data: species.monster_data || {}
    });

    const successProfile = applySuccessfulCapture(profile, species.species_id, rarity, potential, now);
    successProfile.pets.push(petInstance);
    return { success: true, reason: 'capture_success', valid: true, chance: opportunity, profile: successProfile, pet: petInstance, rarity: rarity, potential: potential };
}

module.exports = {
    CAPTURE_CONFIG,
    calculateCaptureChance,
    validateCaptureAttempt,
    applyFailedCapture,
    applySuccessfulCapture,
    createPetCaptureResult,
    normalizeCaptureProfile,
    getSpeciesCaptureRecord,
    getRarityRank
};
