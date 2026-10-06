const { getSpeciesById } = require('./pet_species.js');

function createBestiaryEntry(speciesId, overrides) {
    const species = getSpeciesById(speciesId);
    if (!species) {
        throw new Error('Espécie não registrada para bestiário: ' + speciesId);
    }

    return Object.assign({
        species_id: species.species_id,
        nome: species.nome,
        capturavel: species.capturavel,
        monstrosMortos: 0,
        capturas: 0,
        xpMaestria: 0,
        nivelMaestria: 0,
        maiorLevelPet: 0,
        maiorRaridade: 'comum',
        skillsConhecidas: [],
        passivasDescobertas: [],
        habitat: species.habitat || null,
        recompensas: [],
        descobertas: [],
        ultimaAtualizacao: new Date().toISOString()
    }, overrides || {});
}

function registerBestiarySpecies(bestiario, speciesId, overrides) {
    if (!bestiario || typeof bestiario !== 'object') {
        throw new TypeError('Bestiário inválido.');
    }
    if (!bestiario[speciesId]) {
        bestiario[speciesId] = createBestiaryEntry(speciesId, overrides);
    }
    return bestiario[speciesId];
}

function incrementMonsterKills(bestiario, speciesId, amount) {
    const entry = registerBestiarySpecies(bestiario, speciesId);
    entry.monstrosMortos = Number(entry.monstrosMortos || 0) + Math.max(0, Number(amount || 1));
    entry.ultimaAtualizacao = new Date().toISOString();
    return entry;
}

module.exports = {
    createBestiaryEntry,
    registerBestiarySpecies,
    incrementMonsterKills
};
