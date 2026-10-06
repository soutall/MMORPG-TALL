const crypto = require('node:crypto');
const { getSpeciesById, validateSpeciesId } = require('./pet_species.js');

const PET_DEFAULT_STATUS = Object.freeze({
    vida: 1,
    ataque: 1,
    defesa: 1,
    agilidade: 1,
    sorte: 1,
    critico: 1,
    velocidade: 1
});

function getPetXpThreshold(level) {
    const normalizedLevel = Math.max(1, Number(level || 1));
    return Math.round(90 + (normalizedLevel * 90));
}

function getPetLevelFromXp(xp) {
    let totalXp = Math.max(0, Number(xp || 0));
    let level = 1;
    while (totalXp >= getPetXpThreshold(level)) {
        totalXp -= getPetXpThreshold(level);
        level += 1;
    }
    return level;
}

function getPetXpProgress(xp) {
    let remainingXp = Math.max(0, Number(xp || 0));
    let level = 1;
    while (remainingXp >= getPetXpThreshold(level)) {
        remainingXp -= getPetXpThreshold(level);
        level += 1;
    }
    return {
        level: level,
        xpProgress: remainingXp,
        xpToNext: getPetXpThreshold(level)
    };
}

function gainPetXp(pet, xpGain) {
    if (!pet || typeof pet !== 'object') throw new TypeError('Instância de pet inválida.');
    const xp = Math.max(0, Number(xpGain || 0));
    pet.pet_xp = Number(pet.pet_xp || pet.xp || 0) + xp;
    pet.xp = pet.pet_xp;
    const progression = getPetXpProgress(pet.pet_xp);
    const previousLevel = Math.max(1, Number(pet.level || pet.pet_level) || 1);
    const currentStatus = pet.status && typeof pet.status === 'object' ? pet.status : {};
    if (!pet.status_base || typeof pet.status_base !== 'object') {
        pet.status_base = Object.assign({}, currentStatus);
    }
    const appliedLevel = Math.max(1, Number(pet.status_level_applied) || previousLevel);
    const levelsGained = Math.max(0, progression.level - appliedLevel);
    if (levelsGained > 0) {
        ['vida', 'ataque', 'defesa', 'agilidade', 'sorte', 'critico', 'velocidade'].forEach(function (stat) {
            const baseValue = Math.max(0, Number(pet.status_base[stat]) || 0);
            const increasePerLevel = Math.max(1, baseValue * 0.05);
            const cap = stat === 'critico' ? 100 : Infinity;
            currentStatus[stat] = Math.min(cap, Math.round((baseValue + increasePerLevel *
                (progression.level - appliedLevel)) * 100) / 100);
        });
    }
    pet.status = currentStatus;
    pet.status_level_applied = Math.max(appliedLevel, progression.level);
    pet.level = progression.level;
    pet.pet_level = progression.level;
    pet.pet_xp_progress = progression.xpProgress;
    pet.pet_xp_to_next = progression.xpToNext;
    return pet;
}

function assertUniquePetInstanceId(existingIds, petInstanceId) {
    if (!petInstanceId) return false;
    if (Array.isArray(existingIds) && existingIds.includes(petInstanceId)) {
        throw new Error('pet_instance_id duplicado: ' + petInstanceId);
    }
    return true;
}

function createPetInstance(speciesId, overrides) {
    const normalizedSpeciesId = validateSpeciesId(speciesId);
    const species = getSpeciesById(normalizedSpeciesId);
    if (!species) {
        throw new Error('Espécie de pet não registrada: ' + normalizedSpeciesId);
    }
    if (!species.capturavel) {
        throw new Error('Espécie ' + normalizedSpeciesId + ' não pode ser capturada (Elite/Boss).');
    }

    const petInstanceId = 'pet_' + crypto.randomUUID();
    const mergedOverrides = overrides && typeof overrides === 'object' ? overrides : {};
    const baseStatus = Object.assign({}, PET_DEFAULT_STATUS, mergedOverrides.status || {});
    const speciesIcon = species.icon || species.emoji || '🐾';
    const instance = Object.assign({
        pet_instance_id: petInstanceId,
        species_id: species.species_id,
        nome: species.nome,
        emoji: species.emoji || speciesIcon,
        icon: species.icon || species.emoji || speciesIcon,
        rarity: 'comum',
        level: 1,
        pet_level: 1,
        xp: 0,
        pet_xp: 0,
        pet_xp_progress: 0,
        pet_xp_to_next: getPetXpThreshold(1),
        potencial: 0,
        status: baseStatus,
        status_base: Object.assign({}, baseStatus),
        status_level_applied: Math.max(1, Number(mergedOverrides.level || mergedOverrides.pet_level) || 1),
        passivas: [],
        traits: [],
        skills: Array.isArray(species.skills) ? species.skills.slice() : [],
        combat_profile_ref: species.species_id,
        skill_source: 'spawns.TIPOS_MONSTROS',
        visual: {
            asset: species.visual && species.visual.asset ? species.visual.asset : null,
            cor: species.visual && species.visual.cor ? species.visual.cor : '#ffffff',
            icon: species.visual && species.visual.icon ? species.visual.icon : (species.icon || species.emoji || speciesIcon),
            emoji: species.visual && species.visual.emoji ? species.visual.emoji : (species.emoji || speciesIcon)
        },
        atributos: {
            vida: 0,
            ataque: 0,
            defesa: 0,
            agilidade: 0,
            sorte: 0
        },
        flag_capturada: true,
        source_of_truth: species.source_of_truth,
        created_at: new Date().toISOString()
    }, mergedOverrides);

    instance.emoji = instance.emoji || instance.icon || species.emoji || species.icon || speciesIcon;
    instance.icon = instance.icon || instance.emoji || species.icon || species.emoji || speciesIcon;
    if (!instance.visual || typeof instance.visual !== 'object') instance.visual = {};
    instance.visual.icon = instance.visual.icon || instance.icon || instance.emoji || speciesIcon;
    instance.visual.emoji = instance.visual.emoji || instance.emoji || instance.icon || speciesIcon;
    if (instance.visual.asset == null && species.visual && species.visual.asset) instance.visual.asset = species.visual.asset;
    if (instance.pet_level == null) instance.pet_level = instance.level || 1;
    if (instance.pet_xp == null) instance.pet_xp = Number(instance.xp || 0);
    if (instance.xp == null) instance.xp = Number(instance.pet_xp || 0);
    if (instance.level == null) instance.level = instance.pet_level || 1;
    instance.pet_level = instance.level;
    instance.pet_xp_to_next = getPetXpThreshold(instance.pet_level);

    if (typeof instance.pet_instance_id !== 'string' || !/^pet_[0-9a-f-]+$/i.test(instance.pet_instance_id)) {
        throw new Error('pet_instance_id inválido.');
    }
    if (instance.species_id !== normalizedSpeciesId) {
        throw new Error('species_id incompatível com pet_instance_id gerado.');
    }

    return instance;
}

function validatePetInstance(instance, existingIds) {
    if (!instance || typeof instance !== 'object') {
        throw new TypeError('Instância de pet inválida.');
    }
    const speciesId = validateSpeciesId(instance.species_id);
    const species = getSpeciesById(speciesId);
    if (!species) {
        throw new Error('Espécie do pet não existe: ' + speciesId);
    }
    if (!species.capturavel) {
        throw new Error('Captura rejeitada para a espécie ' + speciesId + '.');
    }
    if (typeof instance.pet_instance_id !== 'string' || !/^pet_[0-9a-f-]+$/i.test(instance.pet_instance_id)) {
        throw new Error('pet_instance_id inválido.');
    }
    assertUniquePetInstanceId(existingIds, instance.pet_instance_id);
    return {
        valid: true,
        species: species,
        instance: instance
    };
}

module.exports = {
    PET_DEFAULT_STATUS,
    getPetXpThreshold,
    getPetLevelFromXp,
    getPetXpProgress,
    gainPetXp,
    createPetInstance,
    validatePetInstance,
    assertUniquePetInstanceId
};
