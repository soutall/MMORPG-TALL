function executeAttack(options) {
    const config = options && typeof options === 'object' ? options : {};
    const attacker = config.attacker;
    const target = config.target;
    if (!attacker || !target) return { valid: false, reason: 'entity_missing' };
    if (Number(attacker.hp) <= 0 || Number(target.hp) <= 0) {
        return { valid: false, reason: 'entity_dead' };
    }

    const ax = Number.isFinite(config.attackerX) ? Number(config.attackerX) : Number(attacker.x || 0);
    const ay = Number.isFinite(config.attackerY) ? Number(config.attackerY) : Number(attacker.y || 0);

    const isPlayer = !!(target.classe && !target.pet_instance_id && !target.owner_id);
    const defaultTx = Number(target.x || 0) + (isPlayer ? 12 : 0);
    const defaultTy = Number(target.y || 0) + (isPlayer ? 16 : 0);
    const tx = Number.isFinite(config.targetX) ? Number(config.targetX) : defaultTx;
    const ty = Number.isFinite(config.targetY) ? Number(config.targetY) : defaultTy;

    const distance = Math.hypot(ax - tx, ay - ty);
    const tolerance = Number.isFinite(config.tolerance)
        ? Math.max(0, Number(config.tolerance))
        : (config.isMelee || config.attackKind === 'melee' ? 14 : 0);
    const range = Number(config.range);
    if (Number.isFinite(range) && distance > (range + tolerance)) {
        return { valid: false, reason: 'target_out_of_range' };
    }
    if (typeof config.validate === 'function') {
        const validation = config.validate(attacker, target);
        if (!validation || validation.valid !== true) {
            return validation || { valid: false, reason: 'target_invalid' };
        }
    }

    const now = Number.isFinite(config.now) ? config.now : Date.now();
    const cooldownMs = Math.max(0, Number(config.cooldownMs) || 0);
    const cooldownAt = Number(attacker.nextAttackAt) || 0;
    if (cooldownAt > now) {
        return { valid: false, reason: 'cooldown_active', cooldownAt };
    }
    if (typeof config.applyDamage !== 'function') {
        throw new TypeError('O executor de combate exige o adaptador de dano do servidor.');
    }

    const result = config.applyDamage(attacker, target);
    if (result === false || (result && result.valid === false)) {
        return result || { valid: false, reason: 'damage_rejected' };
    }
    attacker.nextAttackAt = now + cooldownMs;
    return { valid: true, reason: 'valid', result, nextAttackAt: attacker.nextAttackAt };
}

module.exports = { executeAttack };
