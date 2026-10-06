function normalizePetProfile(profile) {
    const safeProfile = profile && typeof profile === 'object' ? profile : {};
    const pets = Array.isArray(safeProfile.pets) ? safeProfile.pets.slice() : [];
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

module.exports = {
    normalizePetProfile,
    ensurePlayerPetState,
    setPetState
};
