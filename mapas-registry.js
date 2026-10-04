// REGISTRO CENTRAL DE MAPAS — Continente de Gaia como mundo único.
// Cliente e servidor carregam este mesmo arquivo.
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) module.exports = factory();
    else root.MAPAS_REGISTRY = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const mapas = {
        mundo: { id: 'mundo', x0: 100000, y0: 0, w: 88000, h: 28000, nome: 'Continente de Gaia Expandido', icone: '🌍' }
    };
    Object.keys(mapas).forEach(function (id) {
        const m = mapas[id];
        Object.freeze(m);
    });
    return Object.freeze(mapas);
});
