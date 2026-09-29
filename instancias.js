// instancias.js — camada base de instâncias do MMORPG
// Fase 1 da migração: identidade estável de mapa + identidade única de sala.
// Mantém a API antiga e acrescenta um gerenciador genérico, sem alterar o runtime atual.
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) module.exports = factory();
    else root.INSTANCIAS = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    let sequencia = 1;

    function normalizarPrefixo(prefixo) {
        return String(prefixo || 'inst').replace(/[^a-z0-9_]/gi, '_');
    }

    function criarId(prefixo) {
        const p = normalizarPrefixo(prefixo);
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

    function criarGerenciador(opcoes) {
        const config = opcoes || {};
        const limitePadrao = Number.isFinite(config.limitePadrao) ? config.limitePadrao : 50;
        const instancias = new Map();

        function criarInstancia(mapaId, tipo, meta) {
            const instancia = criar(tipo || mapaId || 'generica', mapaId, meta);
            instancia.membros = new Set();
            instancia.limite = Number.isFinite(instancia.meta.maxMembros)
                ? instancia.meta.maxMembros
                : limitePadrao;
            instancias.set(instancia.id, instancia);
            return instancia;
        }

        function obter(instanciaId) {
            return instanciaId ? (instancias.get(instanciaId) || null) : null;
        }

        function remover(instanciaId) {
            return instancias.delete(instanciaId);
        }

        function listar(mapaId) {
            const lista = Array.from(instancias.values());
            return mapaId ? lista.filter(function (instancia) {
                return instancia.mapaId === mapaId;
            }) : lista;
        }

        function encontrarDisponivel(mapaId, limite) {
            const max = Number.isFinite(limite) ? limite : limitePadrao;
            return listar(mapaId).find(function (instancia) {
                return instancia.membros.size < max;
            }) || null;
        }

        function garantir(mapaId, tipo, meta, politica) {
            const regra = politica || 'reutilizar';
            if (regra === 'nova_por_entrada') {
                return criarInstancia(mapaId, tipo, meta);
            }
            return encontrarDisponivel(mapaId, meta && meta.maxMembros) || criarInstancia(mapaId, tipo, meta);
        }

        function adicionarMembro(instanciaId, playerId) {
            const instancia = obter(instanciaId);
            if (!instancia) return false;
            if (instancia.membros.has(playerId)) return true;
            if (instancia.membros.size >= instancia.limite) return false;
            instancia.membros.add(playerId);
            return true;
        }

        function removerMembro(instanciaId, playerId) {
            const instancia = obter(instanciaId);
            if (!instancia) return false;
            return instancia.membros.delete(playerId);
        }

        function vazia(instanciaId) {
            const instancia = obter(instanciaId);
            return !instancia || instancia.membros.size === 0;
        }

        return Object.freeze({
            criar: criarInstancia,
            obter: obter,
            remover: remover,
            listar: listar,
            encontrarDisponivel: encontrarDisponivel,
            garantir: garantir,
            adicionarMembro: adicionarMembro,
            removerMembro: removerMembro,
            vazia: vazia
        });
    }

    return Object.freeze({
        versao: '1.1.0',
        criarId: criarId,
        criar: criar,
        criarGerenciador: criarGerenciador
    });
});
