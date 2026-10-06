const TRAIT_LIBRARY = Object.freeze({
    agressivo: { nome: 'Agressivo', descricao: 'Maior agressividade em combate e foco em dano.', impact: { ataque: 1.08 } },
    leal: { nome: 'Leal', descricao: 'Mais estabilidade e disciplina em combate.', impact: { defesa: 1.08 } },
    cauteloso: { nome: 'Cauteloso', descricao: 'Maior atenção e melhor sobrevivência.', impact: { vida: 1.08 } },
    covarde: { nome: 'Covarde', descricao: 'Mais receptividade à fuga e evasão.', impact: { velocidade: 1.08 } }
});

function listTraits() {
    return Object.keys(TRAIT_LIBRARY);
}

function pickTraits(options) {
    const random = options && typeof options.random === 'function' ? options.random : Math.random;
    const traitPool = Array.isArray(options && options.traitPool) && options.traitPool.length
        ? options.traitPool
        : listTraits();
    const rawCount = options && options.count !== undefined ? Number(options.count) : 1;
    const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(Math.floor(rawCount), traitPool.length)) : 1;
    const uniqueTraits = new Set();
    const maxTries = Math.max(20, traitPool.length * 5);
    let tries = 0;
    while (uniqueTraits.size < count && tries < maxTries) {
        tries += 1;
        const choice = traitPool[Math.floor(random() * traitPool.length)];
        if (choice) uniqueTraits.add(choice);
    }
    return Array.from(uniqueTraits).map((key) => ({ key, nome: TRAIT_LIBRARY[key].nome, descricao: TRAIT_LIBRARY[key].descricao }));
}

module.exports = {
    TRAIT_LIBRARY,
    listTraits,
    pickTraits
};
