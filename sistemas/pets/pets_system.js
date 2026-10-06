const {
    buildSpeciesRegistry,
    getCapturableSpecies,
    getSpeciesById,
    listMonsterSpecies,
    isMonsterCapturable,
    normalizeSpeciesId,
    validateSpeciesId
} = require('./pet_species.js');

const { createPetInstance, validatePetInstance, getPetLevelFromXp, getPetXpThreshold, getPetXpProgress, gainPetXp } = require('./pet_instance.js');
const { KNOWLEDGE_MAX_LEVEL, getKnowledgeXpToNext, getKnowledgeCaptureBonus, createBestiaryEntry, registerBestiarySpecies, incrementMonsterKills, grantMonsterKnowledge } = require('./pet_bestiario.js');
const { createMasteryRecord, applyMasteryXp, computeMasteryXpGain, getMasteryXpToNext } = require('./pet_maestria.js');
const { ensurePlayerPetState, normalizePetProfile, setPetState, setActivePet, clearActivePet } = require('./pet_persistence.js');
const { calculateCaptureChance, createPetCaptureResult, validateCaptureAttempt } = require('./pet_capture.js');
const { rollRarity, generatePetStatus, getRarityValue } = require('./pet_rarity.js');
const { generatePassiveSet } = require('./pet_passives.js');
const { pickTraits } = require('./pet_traits.js');
const { PET_STATES, PET_DEFAULT_CONFIG, createPetAIState, computePetState, updatePetFollowState, validatePetServerAction, selectNearestEnemy, isEnemyEngagedByOwner } = require('./pet_ai.js');

function ensureSpeciesEntry(speciesId) {
    const species = getSpeciesById(speciesId);
    if (!species) {
        throw new Error('Espécie não registrada no sistema de monstros: ' + speciesId);
    }
    return species;
}

function registerAutoSpecies(speciesId, petProfile) {
    const species = ensureSpeciesEntry(speciesId);
    const safeProfile = ensurePlayerPetState(petProfile || {});
    if (!safeProfile.bestiario[species.species_id]) {
        safeProfile.bestiario[species.species_id] = createBestiaryEntry(species.species_id);
    }
    if (!safeProfile.maestria[species.species_id]) {
        safeProfile.maestria[species.species_id] = createMasteryRecord(species.species_id);
    }
    return {
        species: species,
        profile: safeProfile
    };
}

function createCapturedPet(speciesId, overrides, petProfile) {
    const instance = createPetInstance(speciesId, overrides || {});
    const safeProfile = ensurePlayerPetState(petProfile || {});
    safeProfile.pets.push(instance);
    registerBestiarySpecies(safeProfile.bestiario, speciesId);
    if (!safeProfile.maestria[speciesId]) {
        safeProfile.maestria[speciesId] = createMasteryRecord(speciesId);
    }
    return {
        pet: instance,
        profile: safeProfile
    };
}

module.exports = {
    buildSpeciesRegistry,
    listMonsterSpecies,
    getCapturableSpecies,
    getSpeciesById,
    normalizeSpeciesId,
    validateSpeciesId,
    isMonsterCapturable,
    createPetInstance,
    validatePetInstance,
    getPetLevelFromXp,
    getPetXpThreshold,
    getPetXpProgress,
    gainPetXp,
    createBestiaryEntry,
    registerBestiarySpecies,
    incrementMonsterKills,
    KNOWLEDGE_MAX_LEVEL,
    getKnowledgeXpToNext,
    getKnowledgeCaptureBonus,
    grantMonsterKnowledge,
    createMasteryRecord,
    applyMasteryXp,
    computeMasteryXpGain,
    getMasteryXpToNext,
    calculateCaptureChance,
    validateCaptureAttempt,
    createPetCaptureResult,
    rollRarity,
    generatePetStatus,
    getRarityValue,
    generatePassiveSet,
    pickTraits,
    ensurePlayerPetState,
    normalizePetProfile,
    setPetState,
    setActivePet,
    clearActivePet,
    ensureSpeciesEntry,
    registerAutoSpecies,
    createCapturedPet,
    PET_STATES,
    PET_DEFAULT_CONFIG,
    createPetAIState,
    computePetState,
    updatePetFollowState,
    validatePetServerAction,
    selectNearestEnemy,
    isEnemyEngagedByOwner
};
