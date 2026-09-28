// REGISTRO CENTRAL DE MAPAS — IDs estáveis e limites únicos.
// Cliente e servidor carregam este mesmo arquivo.
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) module.exports = factory();
    else root.MAPAS_REGISTRY = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const mapas = {
        green: { id: 'green', x0: 0, y0: 0, w: 18000, h: 5400, nome: 'Campo Verde', icone: '🌿' },
        desert: { id: 'desert', x0: 18000, y0: 0, w: 32000, h: 36000, nome: 'Deserto com Oásis', icone: '🏜️' },
        pantano: { id: 'pantano', x0: 50000, y0: 0, w: 8000, h: 9000, nome: 'Pântano Realista', icone: '🌿' },
        caverna: { id: 'caverna', x0: 58000, y0: 0, w: 1800, h: 1800, nome: 'Caverna Sombria', icone: '🕳️' },
        cidade: { id: 'cidade', x0: 59800, y0: 0, w: 1374, h: 1145, nome: 'Cidade de Davahl', icone: '🏰' },
        arena: { id: 'arena', x0: 63800, y0: 0, w: 1240, h: 1240, nome: 'Arena de Davahl', icone: '⚔️' },
        cidadeperdida: { id: 'cidadeperdida', x0: 65040, y0: 0, w: 6880, h: 3920, nome: 'Cidade Perdida', icone: '🏛️' },
        testevisual: { id: 'testevisual', x0: 72000, y0: 0, w: 1280, h: 960, nome: 'Arena Visual Teste', icone: '🌿' },
        zonazero: { id: 'zonazero', x0: 74000, y0: 0, w: 8000, h: 9000, nome: 'Zona Zero (Gelo)', icone: '❄️' },
        castelo: { id: 'castelo', x0: 82000, y0: 0, w: 2200, h: 1800, nome: 'Castelo Anda 1', icone: '🏯' },
        bemvindo: { id: 'bemvindo', x0: 85000, y0: 0, w: 2400, h: 1800, nome: 'Ilha BemVindo', icone: '🏝️' },
        ruinas_01: { id: 'ruinas_01', x0: 87400, y0: 0, w: 2600, h: 1900, nome: 'Ruínas de Âmbar', icone: '🏚️' }
    };
    Object.keys(mapas).forEach(function (id) {
        const m = mapas[id];
        Object.freeze(m);
    });
    return Object.freeze(mapas);
});
