function normalizePetProfile(profile) {
    const safeProfile = profile && typeof profile === 'object' ? profile : {};
    const pets = Array.isArray(safeProfile.pets) ? safeProfile.pets.map(function (pet) {
        if (!pet || typeof pet !== 'object') return pet;
        const speciesId = String(pet.species_id || '').trim();
        const resolvedIcon = pet.icon || pet.emoji || (pet.visual && (pet.visual.icon || pet.visual.emoji)) || '🐾';
        const nextPet = Object.assign({}, pet, {
            icon: pet.icon || resolvedIcon,
            emoji: pet.emoji || resolvedIcon,
            visual: Object.assign({}, pet.visual || {}, {
                icon: (pet.visual && pet.visual.icon) || pet.icon || pet.emoji || resolvedIcon,
                emoji: (pet.visual && pet.visual.emoji) || pet.emoji || pet.icon || resolvedIcon
            })
        });
        if (speciesId && nextPet.icon === '🐾' && nextPet.visual && nextPet.visual.icon === '🐾') {
            const speciesRef = safeProfile.species && safeProfile.species.find && safeProfile.species.find(function (entry) {
                return entry && entry.species_id === speciesId;
            });
            if (speciesRef) {
                nextPet.icon = speciesRef.icon || speciesRef.emoji || nextPet.icon;
                nextPet.emoji = speciesRef.emoji || speciesRef.icon || nextPet.emoji;
                nextPet.visual.icon = speciesRef.icon || speciesRef.emoji || nextPet.visual.icon;
                nextPet.visual.emoji = speciesRef.emoji || speciesRef.icon || nextPet.visual.emoji;
            }
        }
        return nextPet;
    }) : [];
    const bestiario = safeProfile.bestiario && typeof safeProfile.bestiario === 'object'
        ? Object.assign({}, safeProfile.bestiario)
        : {};
    const maestria = safeProfile.maestria && typeof safeProfile.maestria === 'object'
        ? Object.assign({}, safeProfile.maestria)
        : {};
    const captureState = safeProfile.captureState && typeof safeProfile.captureState === 'object'
        ? Object.assign({}, safeProfile.captureState, {
            species: safeProfile.captureState.species && typeof safeProfile.captureState.species === 'object'
                ? Object.assign({}, safeProfile.captureState.species)
                : {}
        })
        : { species: {} };
    return {
        pets: pets,
        bestiario: bestiario,
        maestria: maestria,
        captureState: captureState
    };
}

function ensurePlayerPetState(profile) {
    const normalized = normalizePetProfile(profile);
    if (!normalized.pets) {
        normalized.pets = [];
    }
    if (!normalized.bestiario || typeof normalized.bestiario !== 'object') {
        normalized.bestiario = {};
    }
    if (!normalized.maestria || typeof normalized.maestria !== 'object') {
        normalized.maestria = {};
    }
    if (!normalized.captureState || typeof normalized.captureState !== 'object') {
        normalized.captureState = { species: {} };
    }
    if (!normalized.captureState.species || typeof normalized.captureState.species !== 'object') {
        normalized.captureState.species = {};
    }
    return normalized;
}

function setPetState(profile, nextState) {
    const normalized = ensurePlayerPetState(profile || {});
    const state = nextState && typeof nextState === 'object' ? nextState : {};
    normalized.pets = Array.isArray(state.pets) ? state.pets.slice() : normalized.pets;
    normalized.bestiario = state.bestiario && typeof state.bestiario === 'object' ? Object.assign({}, state.bestiario) : normalized.bestiario;
    normalized.maestria = state.maestria && typeof state.maestria === 'object' ? Object.assign({}, state.maestria) : normalized.maestria;
    normalized.captureState = state.captureState && typeof state.captureState === 'object' ? Object.assign({}, state.captureState, {
        species: state.captureState.species && typeof state.captureState.species === 'object' ? Object.assign({}, state.captureState.species) : {}
    }) : normalized.captureState;
    return normalized;
}

function setActivePet(profile, petInstanceId) {
    const normalized = ensurePlayerPetState(profile || {});
    const petId = petInstanceId && typeof petInstanceId === 'string' ? petInstanceId.trim() : '';
    if (!petId) {
        normalized.petActiveId = null;
        return { valid: true, petActiveId: null, profile: normalized, reason: 'cleared' };
    }
    const owned = Array.isArray(normalized.pets) ? normalized.pets.filter(function (pet) {
        return pet && pet.pet_instance_id && pet.pet_instance_id === petId;
    }) : [];
    if (!owned.length) {
        return { valid: false, petActiveId: normalized.petActiveId || null, profile: normalized, reason: 'pet_not_owned' };
    }
    normalized.petActiveId = petId;
    return { valid: true, petActiveId: petId, profile: normalized, reason: 'equipped' };
}

function clearActivePet(profile) {
    return setActivePet(profile, null);
}

module.exports = {
    normalizePetProfile,
    ensurePlayerPetState,
    setPetState,
    setActivePet,
    clearActivePet
};
