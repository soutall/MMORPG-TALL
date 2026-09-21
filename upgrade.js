/* ============================================================================
   SISTEMA DE UPGRADE DE EQUIPAMENTOS (NPC FERREIRO) — server-side
   Módulo de REGRAS DO NEGÓCIO (puro): tabelas de chance, pedras, pools de
   status extras e a função que aplica o resultado de um upgrade no ITEM.

   A QUEM VALIDA TUDO é o server.js (autoridade do servidor):
   - dono do item / itemInstanceId / bloqueio / troca / material / cooldown
   - sorteio de sucesso e consumo da pedra
   - persistência (salvarProgresso)
   Não existe qualquer decisão de chance/resultado no cliente.
   ============================================================================ */

'use strict';

const UPGRADE_MAX = 20;

// Chance de SUCESSO para chegar ao nível ALVO (nível atual + 1). Índice = nível alvo.
const CHANCES = {
    1: 1.0,  2: 1.0,  3: 1.0,  4: 1.0,  5: 1.0,
    6: 0.80, 7: 0.75, 8: 0.60, 9: 0.50, 10: 0.30,
    11: 0.20, 12: 0.15, 13: 0.15, 14: 0.10, 15: 0.05,
    16: 0.02, 17: 0.01, 18: 0.005, 19: 0.004, 20: 0.002
};

// As 4 pedras de upgrade (+ nome, ícone, cor, faixa de uso)
const PEDRAS = {
    'FADEO':     { nome: '💠 FADEO',     icon: '💠', cor: '#6ec6ff', desc: 'Pedra de upgrade — níveis +1 ~ +5.' },
    'MURK':      { nome: '🔮 MURK',      icon: '🔮', cor: '#b46bff', desc: 'Pedra de upgrade — níveis +6 ~ +10.' },
    'DIVINE':    { nome: '🌟 DIVINE',    icon: '🌟', cor: '#ffd166', desc: 'Pedra de upgrade — níveis +11 ~ +15.' },
    'STONE_GOD': { nome: '🗿 STONE GOD', icon: '🗿', cor: '#ff8c42', desc: 'Pedra de upgrade — níveis +16 ~ +20.' }
};

// Os 8 status oficiais do jogo (+ velocidadeAtaque, usado por armas/luvas)
const ATRIBUTOS = ['forca', 'inteligencia', 'agilidade', 'destreza', 'vida', 'profanidade', 'divindade', 'afinidade'];

// Pools de atributos ALEATÓRIOS por tipo de slot (respeitam o tipo do item).
// Espelham os pesos do equipamentos.js (BALANCE.slots + pesos das armas).
const POOLS_EXTRAS = {
    arma:            ['forca', 'destreza', 'agilidade', 'inteligencia', 'vida', 'profanidade', 'divindade', 'afinidade', 'velocidadeAtaque'],
    armaSecundaria:  ['forca', 'destreza', 'agilidade', 'inteligencia', 'vida', 'profanidade', 'divindade', 'afinidade', 'velocidadeAtaque'],
    capacete:        ['forca', 'divindade', 'vida', 'inteligencia', 'agilidade', 'destreza'],
    peitoral:        ['vida', 'forca', 'divindade', 'inteligencia', 'agilidade', 'destreza'],
    capa:            ['agilidade', 'vida', 'inteligencia', 'destreza', 'divindade'],
    luva:            ['destreza', 'forca', 'agilidade', 'vida', 'inteligencia', 'velocidadeAtaque'],
    bota:            ['agilidade', 'destreza', 'vida', 'forca', 'divindade'],
    anel:            ['afinidade', 'destreza', 'inteligencia', 'forca', 'vida', 'divindade'],
    colar:           ['divindade', 'inteligencia', 'vida', 'afinidade', 'forca']
};

const NOMES_STATUS = {
    forca: 'Força', inteligencia: 'Inteligência', agilidade: 'Agilidade',
    destreza: 'Destreza', vida: 'Vida', profanidade: 'Profanidade',
    divindade: 'Divindade', afinidade: 'Afinidade', velocidadeAtaque: 'Vel. de Ataque'
};

// NPC Ferreiro no mapa da Cidade de Davahl (ao lado da Forja dos Dragões)
const FERREIRO_NPC = { x: 60800, y: 400, r: 52, raioInteracao: 170 };

function chanceParaNivel(nivelAtual) {
    if (nivelAtual === undefined || nivelAtual === null) nivelAtual = 0;
    if (nivelAtual >= UPGRADE_MAX) return 0;
    return CHANCES[nivelAtual + 1] || 0;
}

function chanceParaAlvo(nivelAlvo) {
    return CHANCES[nivelAlvo] || 0;
}

// Qual pedra é usada para chegar ao nível ALVO
function pedraParaNivel(nivelAlvo) {
    if (nivelAlvo <= 5) return { pedra: 'FADEO', faixa: '1 ~ 5' };
    if (nivelAlvo <= 10) return { pedra: 'MURK', faixa: '6 ~ 10' };
    if (nivelAlvo <= 15) return { pedra: 'DIVINE', faixa: '11 ~ 15' };
    return { pedra: 'STONE_GOD', faixa: '16 ~ 20' };
}

// Status PRINCIPAL do item = o de maior valor (primeiro em caso de empate)
function statusPrincipal(item) {
    const st = (item && item.status) || {};
    const keys = Object.keys(st);
    if (!keys.length) return null;
    let melhor = keys[0];
    let melhorV = st[melhor] || 0;
    for (let i = 1; i < keys.length; i++) {
        const v = st[keys[i]] || 0;
        if (v > melhorV) { melhorV = v; melhor = keys[i]; }
    }
    return melhor;
}

// Pool de status extras válidos para o slot, excluindo os que o item já possui
function poolParaSlot(slot, item) {
    let pool = POOLS_EXTRAS[slot] || ATRIBUTOS.slice();
    if (item && item.status) {
        pool = pool.filter(function (k) { return !(item.status[k] !== undefined && item.status[k] !== null); });
    }
    if (pool.length === 0) pool = ATRIBUTOS.slice(0, 3);
    return pool;
}

function novoUid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// Aplica um upgrade de SUCESSO no item (nível já incrementado ANTES da chamada).
// Regras:
//   - cada nível: +1 no STATUS PRINCIPAL (bônus cresce a cada 5 níveis: +1,+2,+3,+4)
//   - +5  → +1 status ALEATÓRIO (pool do tipo do item)
//   - +10 → +1 status ALEATÓRIO
//   - +15 → +1 status ALEATÓRIO
//   - +20 → reforça TODOS os status atuais em +10% (ceil, aplicado uma única vez)
// Retorna um objeto de registro para o log/UI do cliente.
function aplicarUpgrade(item, novoNivel) {
    if (!item) return null;
    if (!item.status) item.status = {};
    if (!Array.isArray(item.upgradeExtras)) item.upgradeExtras = [];

    const info = { principalChave: null, principalAntes: 0, principalDepois: 0, extras: [], reforco: false };

    let chave = statusPrincipal(item);
    if (!chave) chave = 'forca';
    const antes = item.status[chave] || 0;
    const ganho = 1 + Math.floor((novoNivel - 1) / 5); // +5→2? (1+floor(4/5)=1) — dependente do nível alvo
    item.status[chave] = antes + ganho;
    info.principalChave = chave;
    info.principalAntes = antes;
    info.principalDepois = item.status[chave];

    // Atributos aleatórios em +5, +10 e +15 (valor escala: +5→1, +10→2, +15→3)
    if (novoNivel === 5 || novoNivel === 10 || novoNivel === 15) {
        const pool = poolParaSlot(item.slot, item);
        const escolhida = pool[Math.floor(Math.random() * pool.length)];
        if (escolhida) {
            const valorExtra = Math.ceil(novoNivel / 5);
            item.status[escolhida] = (item.status[escolhida] || 0) + valorExtra;
            let existente = null;
            for (let i = 0; i < item.upgradeExtras.length; i++) {
                if (item.upgradeExtras[i].chave === escolhida) { existente = item.upgradeExtras[i]; break; }
            }
            if (existente) existente.valor += valorExtra;
            else item.upgradeExtras.push({ chave: escolhida, valor: valorExtra });
            info.extras.push({ chave: escolhida, valor: valorExtra });
        }
    }

    // +20: reforça TODOS os status atuais em +10% (arredonda para cima, sempre ganha)
    if (novoNivel >= 20) {
        for (const k in item.status) {
            if (typeof item.status[k] === 'number') {
                item.status[k] = Math.ceil(item.status[k] * 1.1);
            }
        }
        info.reforco = true;
    }

    return info;
}

// Cria um item de pedra (tipo 'pedra', empilhável pela chave `pedra`)
function novoItemPedra(pedra, quantidade) {
    const def = PEDRAS[pedra];
    if (!def) return null;
    return {
        id: 'pedra_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        uid: novoUid(),
        tipo: 'pedra',
        pedra: pedra,
        nome: def.nome,
        icon: def.icon,
        desc: def.desc,
        cor: def.cor,
        quantidade: quantidade || 1,
        stackavel: true
    };
}

module.exports = {
    UPGRADE_MAX: UPGRADE_MAX,
    CHANCES: CHANCES,
    PEDRAS: PEDRAS,
    ATRIBUTOS: ATRIBUTOS,
    NOMES_STATUS: NOMES_STATUS,
    POOLS_EXTRAS: POOLS_EXTRAS,
    FERREIRO_NPC: FERREIRO_NPC,
    chanceParaNivel: chanceParaNivel,
    chanceParaAlvo: chanceParaAlvo,
    pedraParaNivel: pedraParaNivel,
    statusPrincipal: statusPrincipal,
    poolParaSlot: poolParaSlot,
    novoUid: novoUid,
    aplicarUpgrade: aplicarUpgrade,
    novoItemPedra: novoItemPedra
};