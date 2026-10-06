const { getSpeciesById } = require('./pet_species.js');

const MESTRIA_CONFIG = Object.freeze({
    baseXp: 80,
    multiplier: 1.28,
    levelCurve: 160
});

function getMasteryXpToNext(level) {
    return Math.max(120, MESTRIA_CONFIG.levelCurve + (Number(level || 0) * 140));
}

function computeMasteryXpGain(options) {
    const playerLevel = Number.isFinite(Number(options && options.playerLevel !== undefined ? options.playerLevel : 1))
        ? Number(options.playerLevel)
        : 1;
    const monsterLevel = Number.isFinite(Number(options && options.monsterLevel !== undefined ? options.monsterLevel : 1))
        ? Number(options.monsterLevel)
        : 1;
    const levelDifference = Number.isFinite(Number(options && options.levelDifference !== undefined ? options.levelDifference : Math.max(0, playerLevel - monsterLevel)))
        ? Number(options.levelDifference !== undefined ? options.levelDifference : Math.max(0, playerLevel - monsterLevel))
        : Math.max(0, playerLevel - monsterLevel);
    const normalizado = Math.max(0.35, 1 - (Math.min(40, Math.abs(levelDifference)) / 40));
    const base = (monsterLevel * 12) + (playerLevel * 6) + MESTRIA_CONFIG.baseXp;
    return Math.max(15, Math.round(base * normalizado * MESTRIA_CONFIG.multiplier));
}

function createMasteryRecord(speciesId, overrides) {
    const species = getSpeciesById(speciesId);
    if (!species) {
        throw new Error('Espécie sem registro para maestria: ' + speciesId);
    }

    return Object.assign({
        species_id: species.species_id,
        nome: species.nome,
        nivelMaestria: 0,
        xpMaestria: 0,
        xpParaProximo: getMasteryXpToNext(0),
        recompensas: [],
        ultimaAtualizacao: new Date().toISOString(),
        habitat: species.habitat || null
    }, overrides || {});
}

function applyMasteryXp(record, options) {
    if (!record || typeof record !== 'object') {
        throw new TypeError('Registro de maestria inválido.');
    }
    const xpToApply = Number.isFinite(Number(options && options.xp))
        ? Number(options.xp)
        : computeMasteryXpGain(options || {});

    record.xpMaestria = Number(record.xpMaestria || 0) + Math.max(0, xpToApply);
    record.ultimaAtualizacao = new Date().toISOString();

    while (record.xpMaestria >= getMasteryXpToNext(record.nivelMaestria)) {
        record.xpMaestria -= getMasteryXpToNext(record.nivelMaestria);
        record.nivelMaestria += 1;
        record.xpParaProximo = getMasteryXpToNext(record.nivelMaestria);
        record.recompensas = record.recompensas || [];
        record.recompensas.push({ nivel: record.nivelMaestria, tipo: 'recompensa_maestria' });
    }
    if (!record.xpParaProximo || record.xpParaProximo <= 0) {
        record.xpParaProximo = getMasteryXpToNext(record.nivelMaestria);
    }
    return record;
}

module.exports = {
    MESTRIA_CONFIG,
    getMasteryXpToNext,
    computeMasteryXpGain,
    createMasteryRecord,
    applyMasteryXp
};
