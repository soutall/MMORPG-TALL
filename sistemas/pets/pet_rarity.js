const RARITY_SEQUENCE = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

const RARITY_CONFIG = Object.freeze({
    comum: { weight: 58, min: 0, max: 29, attributeMultiplier: 1, passiveBonus: 0, potentialFloor: 0, potentialCeiling: 34 },
    incomum: { weight: 26, min: 30, max: 49, attributeMultiplier: 1.18, passiveBonus: 0.08, potentialFloor: 25, potentialCeiling: 49 },
    raro: { weight: 12, min: 50, max: 69, attributeMultiplier: 1.36, passiveBonus: 0.14, potentialFloor: 45, potentialCeiling: 69 },
    epico: { weight: 3, min: 70, max: 89, attributeMultiplier: 1.6, passiveBonus: 0.24, potentialFloor: 70, potentialCeiling: 89 },
    lendario: { weight: 0.7, min: 90, max: 100, attributeMultiplier: 1.9, passiveBonus: 0.35, potentialFloor: 90, potentialCeiling: 100 }
});

function getRarityValue(rarity) {
    const normalized = String(rarity || 'comum').trim().toLowerCase();
    return RARITY_CONFIG[normalized] ? normalized : 'comum';
}

function getRarityWeight(rarity) {
    const value = getRarityValue(rarity);
    return RARITY_CONFIG[value].weight;
}

function getRarityGrade(rarity) {
    return RARITY_SEQUENCE.indexOf(getRarityValue(rarity));
}

function rollRarity(options) {
    const random = options && typeof options.random === 'function' ? options.random : Math.random;
    const pityBoost = Number(options && options.pityBoost ? options.pityBoost : 0);
    const weights = RARITY_SEQUENCE.map((rarityName) => {
        const config = RARITY_CONFIG[rarityName];
        const pityBonus = rarityName === 'lendario' ? pityBoost * 0.2 : pityBoost * 0.5;
        return config.weight + pityBonus;
    });
    let total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
    let draw = random() * total;
    for (let index = 0; index < RARITY_SEQUENCE.length; index += 1) {
        const rarityName = RARITY_SEQUENCE[index];
        const weight = weights[index];
        if (draw <= weight) return rarityName;
        draw -= weight;
    }
    return 'comum';
}

function getRarityMultiplier(rarity) {
    return RARITY_CONFIG[getRarityValue(rarity)].attributeMultiplier;
}

function generatePetStatus(species, rarity, potential, random) {
    const speciesLevel = Number(species && species.level ? species.level : 1);
    const rarityBoost = getRarityMultiplier(rarity);
    const randomFn = typeof random === 'function' ? random : Math.random;
    const normPotential = Math.max(0, Math.min(100, Number(potential || 50)));
    const status = {
        vida: Math.max(12, Math.round((speciesLevel * 11) * rarityBoost + (normPotential * 0.4) + (randomFn() * 14))),
        ataque: Math.max(8, Math.round((speciesLevel * 7) * rarityBoost + (normPotential * 0.32) + (randomFn() * 10))),
        defesa: Math.max(5, Math.round((speciesLevel * 6) * rarityBoost + (normPotential * 0.28) + (randomFn() * 8))),
        critico: Math.max(0, Math.min(100, Math.round((normPotential * 0.12) + (randomFn() * 18) + (RARITY_CONFIG[getRarityValue(rarity)].min * 0.08)))) ,
        velocidade: Math.max(1, Math.round((speciesLevel * 3) * rarityBoost + (normPotential * 0.16) + (randomFn() * 12))),
        sorte: Math.max(1, Math.round((speciesLevel * 2) * rarityBoost + (normPotential * 0.14) + (randomFn() * 8)))
    };
    return status;
}

module.exports = {
    RARITY_SEQUENCE,
    RARITY_CONFIG,
    getRarityValue,
    getRarityWeight,
    getRarityGrade,
    rollRarity,
    getRarityMultiplier,
    generatePetStatus
};
