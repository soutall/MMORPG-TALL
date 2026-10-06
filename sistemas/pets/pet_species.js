const spawns = require('../../spawns.js');

const TOP_LEVEL_MONSTERS = spawns && spawns.TIPOS_MONSTROS ? spawns.TIPOS_MONSTROS : {};

function normalizeSpeciesId(speciesId) {
    const cleaned = String(speciesId || '').trim();
    if (!cleaned) {
        throw new Error('species_id é obrigatório.');
    }
    if (!/^[a-z0-9_]+$/.test(cleaned)) {
        throw new Error('species_id inválido. Use apenas letras minúsculas, números e underscore.');
    }
    return cleaned;
}

function resolveMonsterReference(reference) {
    if (!reference) return null;
    if (typeof reference === 'string') {
        if (spawns && typeof spawns.getMonstroConfig === 'function') {
            try {
                return spawns.getMonstroConfig(reference);
            } catch (error) {
                return TOP_LEVEL_MONSTERS[reference] || null;
            }
        }
        return TOP_LEVEL_MONSTERS[reference] || null;
    }
    if (typeof reference === 'object') {
        return reference;
    }
    return null;
}

function isEliteMonsterReference(monsterReference) {
    const conf = resolveMonsterReference(monsterReference);
    if (!conf) return false;
    const tags = Array.isArray(conf.tags) ? conf.tags : [];
    return tags.includes('elite') || conf.elite === true;
}

function isBossMonsterReference(monsterReference) {
    const conf = resolveMonsterReference(monsterReference);
    if (!conf) return false;
    const tags = Array.isArray(conf.tags) ? conf.tags : [];
    return tags.includes('boss') || conf.boss === true;
}

function isMonsterCapturable(monsterReference) {
    const conf = resolveMonsterReference(monsterReference);
    if (!conf) return false;
    const tags = Array.isArray(conf.tags) ? conf.tags : [];
    return !isEliteMonsterReference(conf) && !isBossMonsterReference(conf) && !tags.includes('invenciveis');
}

function buildSpeciesDefinition(monsterReference, forceKey) {
    const conf = resolveMonsterReference(monsterReference);
    if (!conf) {
        return null;
    }
    const monsterKey = String(forceKey || conf.tipo || conf.key || conf.species_id || conf.nome || '').trim();
    const speciesId = normalizeSpeciesId(monsterKey || 'monster_sem_nome');
    const tags = Array.isArray(conf.tags) ? conf.tags.slice() : [];
    const elite = isEliteMonsterReference(conf);
    const boss = isBossMonsterReference(conf);
    const capturavel = !elite && !boss && !tags.includes('invenciveis');
    const monsterSkills = Array.isArray(conf.skills) ? conf.skills.slice() : [];

    const icon = conf.icon || conf.emoji || '🐾';
    return {
        species_id: speciesId,
        nome: conf.nome || speciesId,
        monster_type: conf.tipo || speciesId,
        monster_data: conf,
        emoji: conf.emoji || icon,
        icon: conf.icon || conf.emoji || icon,
        skills: monsterSkills,
        combat_profile: {
            ehMelee: conf.ehMelee !== false,
            attackRange: Number(conf.attackRange) || null,
            skillRange: Number(conf.skillRange) || null,
            cadenciaAtk: Number(conf.cadenciaAtk) || null,
            dano: Number(conf.dano) || null,
            arquetipo: conf.arquetipo || null,
            petAttackSkill: conf.petAttackSkill ? Object.assign({}, conf.petAttackSkill) : null,
            aiManaged: !!conf.aiManaged,
            specializedBehavior: speciesId
        },
        visual: {
            asset: conf.asset || null,
            cor: conf.cor || '#ffffff',
            sprite: conf.asset || null,
            emoji: conf.emoji || icon,
            icon: conf.icon || conf.emoji || icon
        },
        tipo: conf.tipo || speciesId,
        level: Number(conf.nivel || conf.level || 1),
        elite: !!elite,
        boss: !!boss,
        capturavel: !!capturavel,
        habitat: conf.bioma || conf.habitat || null,
        source_of_truth: 'spawns.TIPOS_MONSTROS',
        tags: tags.slice(),
        rarity: 'comum'
    };
}

function buildSpeciesRegistry(customRegistry) {
    const source = customRegistry && typeof customRegistry === 'object' ? customRegistry : TOP_LEVEL_MONSTERS;
    const registry = {};
    for (const [key, value] of Object.entries(source)) {
        const species = buildSpeciesDefinition(value, key);
        if (!species) continue;
        registry[species.species_id] = species;
    }
    return registry;
}

function listMonsterSpecies(customRegistry) {
    return Object.values(buildSpeciesRegistry(customRegistry));
}

function getSpeciesById(speciesId) {
    const normalized = normalizeSpeciesId(speciesId);
    const registry = buildSpeciesRegistry();
    return registry[normalized] || null;
}

function getCapturableSpecies(customRegistry) {
    return listMonsterSpecies(customRegistry).filter(function (species) {
        return species.capturavel;
    });
}

module.exports = {
    TOP_LEVEL_MONSTERS,
    normalizeSpeciesId,
    resolveMonsterReference,
    isEliteMonsterReference,
    isBossMonsterReference,
    isMonsterCapturable,
    buildSpeciesDefinition,
    buildSpeciesRegistry,
    listMonsterSpecies,
    getSpeciesById,
    getCapturableSpecies,
    validateSpeciesId: normalizeSpeciesId
};
