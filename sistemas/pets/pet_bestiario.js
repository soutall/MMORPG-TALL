const { getSpeciesById } = require('./pet_species.js');

const KNOWLEDGE_MAX_LEVEL = 10;

function getKnowledgeXpToNext(level) {
    const currentLevel = Math.max(0, Math.min(KNOWLEDGE_MAX_LEVEL, Math.floor(Number(level) || 0)));
    if (currentLevel >= KNOWLEDGE_MAX_LEVEL) return 0;
    return 100 + currentLevel * 75;
}

function getKnowledgeCaptureBonus(level) {
    const currentLevel = Math.max(0, Math.min(KNOWLEDGE_MAX_LEVEL, Math.floor(Number(level) || 0)));
    return Math.min(15, currentLevel * 1.5);
}

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
        conhecimentoXp: 0,
        nivelConhecimento: 0,
        conhecimentoXpParaProximo: getKnowledgeXpToNext(0),
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
    const increment = Math.max(0, Math.floor(Number(amount === undefined ? 1 : amount) || 0));
    entry.monstrosMortos = Number(entry.monstrosMortos || 0) + increment;
    entry.ultimaAtualizacao = new Date().toISOString();
    return entry;
}

function grantMonsterKnowledge(bestiario, speciesId, monsterLevel, amount) {
    const entry = incrementMonsterKills(bestiario, speciesId, amount === undefined ? 1 : amount);
    const kills = Math.max(0, Math.floor(Number(amount === undefined ? 1 : amount) || 0));
    const level = Math.max(1, Number(monsterLevel) || 1);
    const xpGain = Math.max(1, Math.round((20 + level * 3) * kills));
    let currentLevel = Math.max(0, Math.min(KNOWLEDGE_MAX_LEVEL,
        Math.floor(Number(entry.nivelConhecimento) || 0)));
    let currentXp = Math.max(0, Number(entry.conhecimentoXp) || 0) + xpGain;
    const previousLevel = currentLevel;

    while (currentLevel < KNOWLEDGE_MAX_LEVEL) {
        const threshold = getKnowledgeXpToNext(currentLevel);
        if (currentXp < threshold) break;
        currentXp -= threshold;
        currentLevel++;
    }
    if (currentLevel >= KNOWLEDGE_MAX_LEVEL) currentXp = 0;

    entry.nivelConhecimento = currentLevel;
    entry.conhecimentoXp = currentXp;
    entry.conhecimentoXpParaProximo = getKnowledgeXpToNext(currentLevel);
    entry.bonusCapturaConhecimento = getKnowledgeCaptureBonus(currentLevel);
    entry.ultimaAtualizacao = new Date().toISOString();
    return {
        entry: entry,
        xpGain: xpGain,
        level: currentLevel,
        levelUp: currentLevel > previousLevel,
        xpProgress: currentXp,
        xpToNext: entry.conhecimentoXpParaProximo,
        captureBonusPercent: entry.bonusCapturaConhecimento
    };
}

module.exports = {
    KNOWLEDGE_MAX_LEVEL,
    getKnowledgeXpToNext,
    getKnowledgeCaptureBonus,
    createBestiaryEntry,
    registerBestiarySpecies,
    incrementMonsterKills,
    grantMonsterKnowledge
};
