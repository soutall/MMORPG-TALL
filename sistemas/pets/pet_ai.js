const PET_STATES = Object.freeze({
    IDLE: 'IDLE',
    FOLLOW: 'FOLLOW',
    RETURN: 'RETURN',
    COMBAT: 'COMBAT',
    DEAD: 'DEAD',
    RESPAWN: 'RESPAWN'
});

const PET_BEHAVIOR_MODES = Object.freeze({
    ATK: 'ATK',
    DEFESA: 'DEFESA',
    PARADO: 'PARADO'
});

const PET_DEFAULT_CONFIG = Object.freeze({
    followDistance: 90,
    returnDistance: 260,
    combatRange: 160,
    maxSpeed: 7,
    stuckThreshold: 32,
    stuckRecoveryMs: 1500,
    combatCooldownMs: 1200,
    respawnDelayMs: 5000,
    maxIdleMs: 3000,
    maxFollowOffset: 32,
    defendRange: 180
});

function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function safeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
}

function distance(a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function normalizePetMode(mode) {
    const normalized = String(mode || PET_BEHAVIOR_MODES.ATK).trim().toUpperCase();
    return Object.values(PET_BEHAVIOR_MODES).includes(normalized) ? normalized : PET_BEHAVIOR_MODES.ATK;
}

function createPetAIState(pet, ownerId, options) {
    const petRef = pet && typeof pet === 'object' ? pet : {};
    const config = Object.assign({}, PET_DEFAULT_CONFIG, options && typeof options === 'object' ? options : {});
    const uid = petRef.pet_instance_id || petRef.id || 'pet_' + Math.random().toString(16).slice(2);
    const hpValue = safeNumber(petRef.hp ?? petRef.vida ?? petRef.status?.vida ?? 100, 100);
    const maxHpValue = safeNumber(petRef.maxHp ?? petRef.max_hp ?? petRef.status?.maxHp ?? petRef.status?.vida ?? hpValue, hpValue || 100);
    const mode = normalizePetMode(petRef.mode || petRef.behavior || petRef.estado || PET_BEHAVIOR_MODES.ATK);
    const state = {
        pet_instance_id: uid,
        species_id: petRef.species_id || 'unknown',
        ownerId: ownerId || petRef.ownerId || petRef.owner_id || petRef.donoId || null,
        state: PET_STATES.FOLLOW,
        mode,
        x: safeNumber(petRef.x, 0),
        y: safeNumber(petRef.y, 0),
        hp: hpValue,
        maxHp: maxHpValue,
        lastOwnerPos: { x: safeNumber(petRef.x, 0), y: safeNumber(petRef.y, 0) },
        lastMoveAt: Date.now(),
        lastCombatAt: 0,
        lastSeenEnemyAt: 0,
        stuckTimer: 0,
        deadAt: 0,
        respawnAt: 0,
        config,
        targetEnemyId: null,
        targetEnemyType: null,
        commandSource: 'server'
    };
    if (typeof petRef.status === 'object' && petRef.status) {
        state.hp = safeNumber(petRef.status.vida ?? state.hp, state.hp);
        state.maxHp = safeNumber(petRef.maxHp ?? petRef.status.maxHp ?? state.maxHp, state.hp || 100);
    }
    if (state.hp <= 0) {
        state.state = PET_STATES.DEAD;
        state.deadAt = Date.now();
        state.respawnAt = Date.now() + config.respawnDelayMs;
    }
    return state;
}

function isPetActionAllowed(petState, owner, options) {
    const validOwner = !!(owner && owner.id && petState.ownerId === owner.id);
    if (!petState || typeof petState !== 'object') return { valid: false, reason: 'pet_missing' };
    if (Number(petState.hp) <= 0) return { valid: false, reason: 'pet_dead' };
    if (!validOwner) return { valid: false, reason: 'owner_mismatch' };
    return { valid: true, reason: 'valid' };
}

function selectNearestEnemy(petState, enemies, options) {
    if (!Array.isArray(enemies) || !enemies.length) return null;
    const cfg = petState && petState.config ? petState.config : PET_DEFAULT_CONFIG;
    const filter = options && typeof options.filter === 'function' ? options.filter : null;
    return enemies
        .filter((enemy) => enemy && enemy.hp > 0 && (!filter || filter(enemy)))
        .filter((enemy) => distance(petState, enemy) <= (options && Number.isFinite(options.maxDistance) ? Number(options.maxDistance) : cfg.combatRange))
        .sort((a, b) => distance(petState, a) - distance(petState, b))[0] || null;
}

function resolvePetTarget(petState, enemies, options) {
    const candidates = Array.isArray(enemies) ? enemies : [];
    const cfg = petState && petState.config ? petState.config : PET_DEFAULT_CONFIG;
    if (!candidates.length) return null;
    const maxRange = options && Number.isFinite(options.maxDistance) ? Number(options.maxDistance) : cfg.combatRange;
    const filtered = candidates.filter((enemy) => enemy && enemy.hp > 0 && (!options || !options.targetType || enemy.type === options.targetType));
    return filtered.sort((a, b) => distance(petState, a) - distance(petState, b)).find((enemy) => distance(petState, enemy) <= maxRange) || null;
}

function computePetState(petState, owner, enemyList, now) {
    if (!petState || typeof petState !== 'object') return PET_STATES.IDLE;
    const cfg = petState.config || PET_DEFAULT_CONFIG;
    const currentNow = Number.isFinite(now) ? now : Date.now();
    if (Number(petState.hp) <= 0) {
        petState.state = PET_STATES.DEAD;
        petState.deadAt = petState.deadAt || currentNow;
        petState.respawnAt = petState.respawnAt || (currentNow + (cfg.respawnDelayMs || 0));
        return PET_STATES.DEAD;
    }
    if (petState.state === PET_STATES.RESPAWN && Number(petState.respawnAt) <= currentNow) {
        petState.hp = petState.maxHp || petState.hp;
        petState.state = PET_STATES.FOLLOW;
        return PET_STATES.FOLLOW;
    }
    if (!owner || !owner.id) return PET_STATES.RETURN;

    const ownerDistance = distance(petState, owner);
    if (ownerDistance > cfg.returnDistance) return PET_STATES.RETURN;
    if (petState.mode === PET_BEHAVIOR_MODES.PARADO) {
        if (ownerDistance > cfg.followDistance) return PET_STATES.RETURN;
        if ((currentNow - (petState.lastMoveAt || 0)) > cfg.maxIdleMs) return PET_STATES.IDLE;
        return PET_STATES.FOLLOW;
    }

    const nearestEnemy = resolvePetTarget(petState, enemyList || [], { maxDistance: cfg.combatRange });
    if (nearestEnemy) {
        petState.targetEnemyId = nearestEnemy.id || null;
        petState.targetEnemyType = nearestEnemy.type || 'monster';
        petState.lastSeenEnemyAt = currentNow;
        return PET_STATES.COMBAT;
    }

    if (ownerDistance > cfg.followDistance) return PET_STATES.FOLLOW;
    if ((currentNow - (petState.lastMoveAt || 0)) > cfg.maxIdleMs) return PET_STATES.IDLE;
    return PET_STATES.FOLLOW;
}

function moveTowards(entity, target, amount, options) {
    if (!entity || !target || !Number.isFinite(amount) || amount <= 0) return entity;
    const dx = (target.x || 0) - (entity.x || 0);
    const dy = (target.y || 0) - (entity.y || 0);
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(amount, dist);
    entity.x += (dx / dist) * step;
    entity.y += (dy / dist) * step;
    return entity;
}

function handlePetRespawn(petState, options) {
    if (!petState || typeof petState !== 'object') return { valid: false, reason: 'pet_missing' };
    const now = Number.isFinite(options && options.now) ? Number(options.now) : Date.now();
    if (Number(petState.hp) > 0) return { valid: false, reason: 'pet_alive', petState };
    if (Number(petState.respawnAt) > now) {
        petState.state = PET_STATES.RESPAWN;
        return { valid: false, reason: 'respawn_cooldown', petState };
    }
    petState.hp = petState.maxHp || (petState.hp || 100);
    petState.state = PET_STATES.RESPAWN;
    petState.targetEnemyId = null;
    petState.targetEnemyType = null;
    petState.respawnAt = now + (petState.config && petState.config.respawnDelayMs ? petState.config.respawnDelayMs : 0);
    return { valid: true, reason: 'respawned', petState };
}

function applyPetDamage(petState, amount, source, options) {
    if (!petState || typeof petState !== 'object') return { valid: false, reason: 'pet_missing' };
    const damage = Math.max(0, Number(amount || 0));
    const before = Number(petState.hp || 0);
    const after = Math.max(0, before - damage);
    petState.hp = after;
    if (after <= 0) {
        petState.hp = 0;
        petState.state = PET_STATES.DEAD;
        petState.deadAt = Date.now();
        petState.respawnAt = Date.now() + (petState.config && petState.config.respawnDelayMs ? petState.config.respawnDelayMs : PET_DEFAULT_CONFIG.respawnDelayMs);
        petState.targetEnemyId = null;
        petState.targetEnemyType = null;
    }
    return {
        valid: true,
        beforeHp: before,
        afterHp: after,
        damage,
        source: source || null,
        dead: after <= 0,
        petState
    };
}

function updatePetFollowState(petState, owner, options) {
    if (!petState || typeof petState !== 'object') return null;
    const cfg = Object.assign({}, PET_DEFAULT_CONFIG, petState.config || {}, options && typeof options === 'object' ? options : {});
    petState.config = cfg;
    const now = Date.now();
    const enemyList = Array.isArray(options && options.enemyList) ? options.enemyList : [];

    if (Number(petState.hp) <= 0) {
        petState.state = PET_STATES.DEAD;
        petState.deadAt = petState.deadAt || now;
        petState.respawnAt = petState.respawnAt || (now + (cfg.respawnDelayMs || 0));
        return petState;
    }

    if (petState.state === PET_STATES.RESPAWN && Number(petState.respawnAt) <= now) {
        petState.hp = petState.maxHp || petState.hp || 100;
        petState.state = PET_STATES.FOLLOW;
    }

    const nextState = computePetState(petState, owner, enemyList, now);
    petState.state = nextState;

    if (!owner || !owner.id) {
        petState.state = PET_STATES.RETURN;
        return petState;
    }

    const ownerDistance = distance(petState, owner);
    const desiredDistance = petState.mode === PET_BEHAVIOR_MODES.DEFESA ? Math.max(30, cfg.defendRange || cfg.followDistance) : cfg.followDistance;

    if (nextState === PET_STATES.RETURN || ownerDistance > cfg.returnDistance) {
        moveTowards(petState, owner, cfg.maxSpeed || 5, { safe: true });
        petState.lastMoveAt = now;
        petState.lastOwnerPos = { x: owner.x || 0, y: owner.y || 0 };
        petState.state = PET_STATES.RETURN;
        return petState;
    }

    if (nextState === PET_STATES.COMBAT) {
        const enemy = resolvePetTarget(petState, enemyList, { maxDistance: cfg.combatRange });
        if (enemy) {
            const range = Number(enemy.range || cfg.combatRange);
            if (distance(petState, enemy) > range) {
                moveTowards(petState, enemy, cfg.maxSpeed || 5, { safe: true });
            }
            petState.lastMoveAt = now;
            petState.targetEnemyId = enemy.id || null;
            petState.targetEnemyType = enemy.type || 'monster';
            petState.state = PET_STATES.COMBAT;
        }
        return petState;
    }

    if (ownerDistance > desiredDistance) {
        moveTowards(petState, owner, cfg.maxSpeed || 5, { safe: true });
        petState.lastMoveAt = now;
        petState.lastOwnerPos = { x: owner.x || 0, y: owner.y || 0 };
        petState.state = PET_STATES.FOLLOW;
        return petState;
    }

    const lastOwner = petState.lastOwnerPos || { x: petState.x, y: petState.y };
    const movedDistance = Math.hypot((petState.x || 0) - (lastOwner.x || 0), (petState.y || 0) - (lastOwner.y || 0));
    if (movedDistance <= cfg.stuckThreshold) {
        petState.stuckTimer = (petState.stuckTimer || 0) + (options && Number.isFinite(options.deltaMs) ? Number(options.deltaMs) : 150);
    } else {
        petState.stuckTimer = 0;
        petState.lastOwnerPos = { x: owner.x || 0, y: owner.y || 0 };
    }

    if (petState.stuckTimer >= cfg.stuckRecoveryMs) {
        const fallbackX = (owner.x || 0) + (cfg.followDistance / 2 || 32);
        const fallbackY = (owner.y || 0) + 12;
        petState.x = fallbackX;
        petState.y = fallbackY;
        petState.state = PET_STATES.RETURN;
        petState.stuckTimer = 0;
        return petState;
    }

    if (petState.mode === PET_BEHAVIOR_MODES.PARADO) {
        petState.state = PET_STATES.IDLE;
        return petState;
    }

    petState.state = ownerDistance > desiredDistance ? PET_STATES.FOLLOW : PET_STATES.IDLE;
    return petState;
}

function validatePetServerAction(action, petState, owner, target, options) {
    if (!petState || typeof petState !== 'object') {
        return { valid: false, reason: 'pet_missing' };
    }
    const cfg = Object.assign({}, PET_DEFAULT_CONFIG, petState.config || {}, options && typeof options === 'object' ? options : {});
    const ownerCheck = isPetActionAllowed(petState, owner, options);
    if (!ownerCheck.valid) return ownerCheck;
    if (Number(petState.hp) <= 0) {
        return { valid: false, reason: 'pet_dead' };
    }
    const now = Date.now();

    if (action === 'set_mode') {
        const mode = normalizePetMode(target && target.mode ? target.mode : target);
        petState.mode = mode;
        petState.state = mode === PET_BEHAVIOR_MODES.PARADO ? PET_STATES.IDLE : PET_STATES.FOLLOW;
        return { valid: true, reason: 'valid', mode };
    }

    if (action === 'follow') {
        petState.state = PET_STATES.FOLLOW;
        return { valid: true, reason: 'valid' };
    }

    if (action === 'return') {
        petState.state = PET_STATES.RETURN;
        return { valid: true, reason: 'valid' };
    }

    if (action === 'respawn') {
        if (Number(petState.hp) > 0) return { valid: false, reason: 'pet_alive' };
        if (Number(petState.respawnAt) > now) return { valid: false, reason: 'respawn_cooldown' };
        petState.hp = petState.maxHp || 100;
        petState.state = PET_STATES.RESPAWN;
        petState.targetEnemyId = null;
        petState.targetEnemyType = null;
        return { valid: true, reason: 'valid', hp: petState.hp };
    }

    if (action === 'attack') {
        if (petState.mode === PET_BEHAVIOR_MODES.PARADO) {
            return { valid: false, reason: 'pet_parado' };
        }
        if (!target || !target.id) {
            return { valid: false, reason: 'target_missing' };
        }
        if (target.hp !== undefined && Number(target.hp) <= 0) {
            return { valid: false, reason: 'target_dead' };
        }
        const dist = distance(petState, target);
        if (dist > (cfg.combatRange || 160)) {
            return { valid: false, reason: 'target_out_of_range' };
        }
        if (now - (petState.lastCombatAt || 0) < (cfg.combatCooldownMs || 1200)) {
            return { valid: false, reason: 'cooldown_active' };
        }
        petState.lastCombatAt = now;
        petState.targetEnemyId = target.id;
        petState.targetEnemyType = target.type || 'monster';
        petState.state = PET_STATES.COMBAT;
        return { valid: true, reason: 'valid', targetId: target.id, targetType: target.type || 'monster', cooldownMs: cfg.combatCooldownMs };
    }

    if (action === 'defend') {
        petState.mode = PET_BEHAVIOR_MODES.DEFESA;
        petState.state = PET_STATES.FOLLOW;
        return { valid: true, reason: 'valid', mode: PET_BEHAVIOR_MODES.DEFESA };
    }

    if (action === 'idle') {
        petState.mode = PET_BEHAVIOR_MODES.PARADO;
        petState.state = PET_STATES.IDLE;
        return { valid: true, reason: 'valid', mode: PET_BEHAVIOR_MODES.PARADO };
    }

    return { valid: true, reason: 'valid' };
}

module.exports = {
    PET_STATES,
    PET_BEHAVIOR_MODES,
    PET_DEFAULT_CONFIG,
    clamp,
    distance,
    safeNumber,
    normalizePetMode,
    createPetAIState,
    isPetActionAllowed,
    selectNearestEnemy,
    resolvePetTarget,
    computePetState,
    moveTowards,
    handlePetRespawn,
    applyPetDamage,
    updatePetFollowState,
    validatePetServerAction
};
