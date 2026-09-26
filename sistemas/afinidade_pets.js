/* ===== SISTEMA UNIVERSAL DE AFINIDADE — PETS / LACAIOS =====
   Módulo do SERVIDOR (require no server.js). Único local da tabela.
   Vale para qualquer criatura controlada pelo jogador: summoner, pets futuros,
   necromante, druida, etc. O navegador não calcula nada disso. */

const AFINIDADE_MAXIMA = 100;

const TABELA_AFINIDADE = [
    { afinidade: 1, transferencia: 2 },
    { afinidade: 5, transferencia: 5 },
    { afinidade: 10, transferencia: 10 },
    { afinidade: 20, transferencia: 15 },
    { afinidade: 30, transferencia: 20 },
    { afinidade: 40, transferencia: 25 },
    { afinidade: 50, transferencia: 30 },
    { afinidade: 60, transferencia: 32 },
    { afinidade: 70, transferencia: 34 },
    { afinidade: 80, transferencia: 36 },
    { afinidade: 90, transferencia: 38 },
    { afinidade: 100, transferencia: 40 }
];

const ATRIBUTOS_HERDADOS = ['forca', 'inteligencia', 'destreza', 'agilidade', 'vida'];

function _numero(valor, padrao) {
    const n = Number(valor);
    return isFinite(n) ? n : padrao;
}

// Escada: usa o percentual do último degrau atingido. 10 -> 10%, 50 -> 30%, 100 -> 40%.
function getPetAffinityTransfer(afinidade) {
    const af = _numero(afinidade, 0);
    if (af < 1) return 0;
    if (af >= AFINIDADE_MAXIMA) return TABELA_AFINIDADE[TABELA_AFINIDADE.length - 1].transferencia;
    let transferencia = 0;
    for (let i = 0; i < TABELA_AFINIDADE.length; i++) {
        if (af >= TABELA_AFINIDADE[i].afinidade) transferencia = TABELA_AFINIDADE[i].transferencia;
        else break;
    }
    return transferencia;
}

// Atributos efetivos (base + equipamentos) -> parcela herdada pelo pet.
// Recebe `atributosEfetivos` pronto (server.js usa atributosTotais); sem ele, usa player.atributos.
function getPetInheritedAttributes(player, atributosEfetivos) {
    const efetivos = atributosEfetivos || (player && player.atributos) || {};
    let afinidade = efetivos.afinidade;
    if (afinidade === undefined || afinidade === null) {
        afinidade = (player && player.atributos && player.atributos.afinidade);
    }
    const transferencia = getPetAffinityTransfer(_numero(afinidade, 1));

    const herdados = {};
    for (let i = 0; i < ATRIBUTOS_HERDADOS.length; i++) {
        const chave = ATRIBUTOS_HERDADOS[i];
        const valor = _numero(efetivos[chave], 1);
        herdados[chave] = Math.round(valor * transferencia / 100);
    }
    return herdados;
}

module.exports = {
    AFINIDADE_MAXIMA: AFINIDADE_MAXIMA,
    TABELA_AFINIDADE: TABELA_AFINIDADE,
    ATRIBUTOS_HERDADOS: ATRIBUTOS_HERDADOS,
    getPetAffinityTransfer: getPetAffinityTransfer,
    getPetInheritedAttributes: getPetInheritedAttributes
};
