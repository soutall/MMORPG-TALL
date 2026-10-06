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

function gainPetXp(pet, xpGain) {
    if (!pet || typeof pet !== 'object') throw new TypeError('Instância de pet inválida.');
    const xp = Math.max(0, Number(xpGain || 0));
    pet.pet_xp = Number(pet.pet_xp || pet.xp || 0) + xp;
    pet.xp = pet.pet_xp;
    pet.level = getPetLevelFromXp(pet.pet_xp);
    pet.pet_xp_to_next = getPetXpThreshold(pet.level);
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
    const instance = Object.assign({
        pet_instance_id: petInstanceId,
        species_id: species.species_id,
        nome: species.nome,
        rarity: 'comum',
        level: 1,
        pet_level: 1,
        xp: 0,
        pet_xp: 0,
        pet_xp_to_next: getPetXpThreshold(1),
        potencial: 0,
        status: baseStatus,
        passivas: [],
        traits: [],
        skills: Array.isArray(species.skills) ? species.skills.slice() : [],
        combat_profile_ref: species.species_id,
        skill_source: 'spawns.TIPOS_MONSTROS',
        visual: {
            asset: species.visual && species.visual.asset ? species.visual.asset : null,
            cor: species.visual && species.visual.cor ? species.visual.cor : '#ffffff'
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
    gainPetXp,
    createPetInstance,
    validatePetInstance,
    assertUniquePetInstanceId
};
