// instancias.js — camada base de instâncias do MMORPG
// Fase inicial: usada pela Arena de Solari.
// Não altera mapas públicos; fornece identidade espacial lógica.
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) module.exports = factory();
    else root.INSTANCIAS = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    let sequencia = 1;
    function criarId(prefixo) {
        const p = String(prefixo || 'inst').replace(/[^a-z0-9_]/gi, '_');
        return p + '_' + (sequencia++);
    }
    function criar(tipo, mapaId, meta) {
        return {
            id: criarId(tipo),
            tipo: tipo || 'generica',
            mapaId: mapaId || null,
            criadaEm: Date.now(),
            meta: meta || {}
        };
    }
    return Object.freeze({
        versao: '1.0.0',
        criarId: criarId,
        criar: criar
    });
});
