const {
    PET_STATES,
    PET_BEHAVIOR_MODES,
    PET_DEFAULT_CONFIG,
    createPetAIState,
    updatePetFollowState,
    validatePetServerAction,
    applyPetDamage,
    resolvePetTarget,
    distance
} = require('./pet_ai.js');

function normalizePetRuntimeList(list) {
    return Array.isArray(list) ? list.filter(Boolean) : [];
}

function ensurePetRuntime(pet, ownerId, options) {
    const runtime = createPetAIState(pet, ownerId, options || {});
    runtime.mode = runtime.mode || PET_BEHAVIOR_MODES.ATK;
    return runtime;
}

function calculatePetAttackDamage(pet, target, options) {
    const petStats = pet && pet.status && typeof pet.status === 'object' ? pet.status : {};
    const baseAttack = Number(petStats.ataque || petStats.ataqueBase || pet.ataque || pet.attack || 12);
    const rarityBias = Number((pet && pet.rarity && { comum: 1, incomum: 1.15, raro: 1.3, epico: 1.55, lendario: 1.8 }[pet.rarity]) || 1);
    const potentialBias = Number((pet && Number.isFinite(Number(pet.potential)) ? Number(pet.potential) : 50) / 100 + 0.5);
    const targetDefense = target && target.defesa ? Number(target.defesa) : 0;
    const raw = Math.max(1, Math.round(baseAttack * rarityBias * potentialBias - targetDefense * 0.35));
    return Number.isFinite(raw) ? raw : 1;
}

function canPetAttackTarget(pet, owner, target, options) {
    if (!pet || !owner || !target) return { valid: false, reason: 'target_missing' };
    const runtime = ensurePetRuntime(pet, owner.id, options || {});
    const validation = validatePetServerAction('attack', runtime, owner, target, options || {});
    if (!validation.valid) return validation;
    if (target.ownerId && target.ownerId === owner.id) return { valid: false, reason: 'target_ally' };
    if (target.type === 'player' && target.id === owner.id) return { valid: false, reason: 'self_target' };
    return { valid: true, reason: 'valid', runtime };
}

function processPetTick({ owner, pets, enemies, players, now, config, allowRespawn }) {
    const runtimeList = normalizePetRuntimeList(pets);
    const ownerId = owner && owner.id ? owner.id : null;
    const enemyList = Array.isArray(enemies) ? enemies.slice() : [];
    const playerList = Array.isArray(players) ? players.slice() : (players ? Object.values(players) : []);

    return runtimeList.map((pet) => {
        const petState = ensurePetRuntime(pet, ownerId, config || {});
        const candidateEnemies = enemyList.concat(
            playerList.filter((candidate) => candidate && candidate.id && candidate.id !== ownerId && candidate.hp > 0)
        );
        const updated = updatePetFollowState(petState, owner, {
            enemyList: candidateEnemies,
            deltaMs: 150,
            now: now || Date.now()
        });

        if (Number(updated.hp) <= 0 && allowRespawn !== false) {
            const respawn = { valid: true, petState: updated, reason: 'respawn_pending' };
            updated.state = PET_STATES.RESPAWN;
            updated.respawnAt = (updated.respawnAt || Date.now()) + (updated.config && updated.config.respawnDelayMs ? updated.config.respawnDelayMs : PET_DEFAULT_CONFIG.respawnDelayMs);
            return { pet: updated, respawn, state: updated.state };
        }

        return { pet: updated, state: updated.state };
    });
}

function handlePetOwnerDisconnect({ ownerId, pets, fallbackOwner, now }) {
    const runtimeList = normalizePetRuntimeList(pets);
    return runtimeList.map((pet) => {
        const state = ensurePetRuntime(pet, ownerId || null, {});
        state.ownerId = null;
        state.state = PET_STATES.RETURN;
        if (fallbackOwner && fallbackOwner.id) {
            state.ownerId = fallbackOwner.id;
            state.state = PET_STATES.FOLLOW;
        }
        state.respawnAt = Number.isFinite(now) ? now : Date.now();
        return { pet: state, state: state.state };
    });
}

function setPetMode(pet, owner, mode, options) {
    const runtime = ensurePetRuntime(pet, owner && owner.id ? owner.id : pet.ownerId || null, options || {});
    const normalized = String(mode || PET_BEHAVIOR_MODES.ATK).trim().toUpperCase();
    runtime.mode = Object.values(PET_BEHAVIOR_MODES).includes(normalized) ? normalized : PET_BEHAVIOR_MODES.ATK;
    runtime.state = runtime.mode === PET_BEHAVIOR_MODES.PARADO ? PET_STATES.IDLE : PET_STATES.FOLLOW;
    return { valid: true, mode: runtime.mode, petState: runtime };
}

function executePetAttack({ pet, owner, target, now, options }) {
    const petRef = pet && typeof pet === 'object' ? pet : null;
    const ownerRef = owner && typeof owner === 'object' ? owner : null;
    const targetRef = target && typeof target === 'object' ? target : null;
    if (!petRef || !ownerRef || !targetRef) {
        return { valid: false, reason: 'invalid_attack_context' };
    }

    const runtime = ensurePetRuntime(petRef, ownerRef.id, options || {});
    const validation = validatePetServerAction('attack', runtime, ownerRef, targetRef, options || {});
    if (!validation.valid) return validation;

    const targetKind = String(targetRef.type || targetRef.kind || 'monster').toLowerCase();
    const canTarget = targetKind === 'monster' || targetKind === 'player' || targetKind === 'pet';
    if (!canTarget) return { valid: false, reason: 'invalid_target_type' };
    if (targetRef.hp !== undefined && Number(targetRef.hp) <= 0) return { valid: false, reason: 'target_dead' };

    const damage = calculatePetAttackDamage(petRef, targetRef, options || {});
    const applied = applyPetDamage({
        hp: Number(targetRef.hp || 0),
        maxHp: Number(targetRef.maxHp || targetRef.max_hp || 100),
        state: targetRef.state,
        ownerId: targetRef.ownerId || targetRef.owner_id || null
    }, damage, { source: 'pet', ownerId: ownerRef.id, petInstanceId: runtime.pet_instance_id });

    if (targetKind === 'player' && targetRef.id === ownerRef.id) {
        return { valid: false, reason: 'self_target' };
    }

    const result = {
        valid: true,
        reason: 'valid',
        petState: runtime,
        target: targetRef,
        damage,
        targetAfterDamage: applied,
        state: PET_STATES.COMBAT
    };

    return result;
}

module.exports = {
    PET_STATES,
    PET_BEHAVIOR_MODES,
    PET_DEFAULT_CONFIG,
    normalizePetRuntimeList,
    ensurePetRuntime,
    calculatePetAttackDamage,
    canPetAttackTarget,
    processPetTick,
    handlePetOwnerDisconnect,
    setPetMode,
    executePetAttack,
    resolvePetTarget
};
