const UNIVERSAL_PASSIVES = Object.freeze([
    { key: 'regeneracao_arcana', nome: 'Regeneração Arcana', description: '+8% de regeneração de mana.', type: 'mana', modifier: 0.08 },
    { key: 'instinto_goblin', nome: 'Instinto Goblin', description: '+10% de velocidade.', type: 'velocidade', modifier: 0.1 },
    { key: 'catador', nome: 'Catador', description: '+5% de chance de materiais.', type: 'loot', modifier: 0.05 },
    { key: 'ferocidade', nome: 'Ferocidade', description: '+6% de dano em HP baixo.', type: 'dano_hp_baixo', modifier: 0.06 },
    { key: 'saqueador', nome: 'Saqueador', description: '+4% de chance de loot.', type: 'loot', modifier: 0.04 }
]);

const SPECIES_PASSIVES = Object.freeze({
    slime: [
        { key: 'viscosidade', nome: 'Viscosidade', description: '+7% de resistência a controle.', type: 'resistencia', modifier: 0.07 },
        { key: 'resistencia_slime', nome: 'Resistência de Slime', description: '+5% de defesa base.', type: 'defesa', modifier: 0.05 }
    ],
    goblin: [
        { key: 'instinto_goblin', nome: 'Instinto Goblin', description: '+10% de velocidade.', type: 'velocidade', modifier: 0.1 },
        { key: 'catador', nome: 'Catador', description: '+5% de chance de materiais.', type: 'loot', modifier: 0.05 }
    ],
    wolf: [
        { key: 'faro', nome: 'Faro', description: '+8% de percepção e rastreio.', type: 'percepcao', modifier: 0.08 },
        { key: 'presa', nome: 'Presa', description: '+9% de dano em alvo fraco.', type: 'dano', modifier: 0.09 }
    ]
});

function getPassivePool(speciesId) {
    const normalized = String(speciesId || '').trim().toLowerCase();
    const speciesPool = SPECIES_PASSIVES[normalized] || [];
    return [].concat(UNIVERSAL_PASSIVES, speciesPool);
}

function generatePassiveSet(speciesId, rarity, potential, options) {
    const random = options && typeof options.random === 'function' ? options.random : Math.random;
    const pool = getPassivePool(speciesId);
    const count = Math.min(3, Math.max(1, Math.round((potential || 50) / 35) + (rarity === 'epico' || rarity === 'lendario' ? 1 : 0)));
    const chosen = [];
    const seen = new Set();
    for (let i = 0; i < Math.min(count, pool.length); i += 1) {
        const item = pool[Math.floor(random() * pool.length)];
        if (!item || seen.has(item.key)) continue;
        seen.add(item.key);
        chosen.push({ key: item.key, nome: item.nome, description: item.description, type: item.type, modifier: item.modifier });
    }
    if (!chosen.length && pool.length) {
        const fallback = pool[0];
        chosen.push({ key: fallback.key, nome: fallback.nome, description: fallback.description, type: fallback.type, modifier: fallback.modifier });
    }
    return chosen;
}

module.exports = {
    UNIVERSAL_PASSIVES,
    SPECIES_PASSIVES,
    getPassivePool,
    generatePassiveSet
};
