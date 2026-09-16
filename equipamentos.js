/* ===== SISTEMA DE EQUIPAMENTOS (drop) — server-side =====
   Módulo puro de CONFIGURAÇÃO + GERAÇÃO de itens.
   Usado por server.js para criar o drop no chão na morte de monstros/bosses.
   NÃO altera fórmulas de combate: apenas gera itens cujos status
   alimentam getAtr() no server.js (bônus somados sobre os atributos base). */

// ============================================================
// >>> CONFIGURAÇÃO PROVISÓRIA DE BALANCEAMENTO <<<
// Todos os números abaixo (chances de raridade, faixas de status,
// chances de drop, pesos) são PROVISÓRIOS e facilmente alteráveis
// AQUI, num único lugar. Não considerar balanceamento definitivo.
// ============================================================

const BALANCE = {
    // --- Raridades: chance (%) e faixas de geração de status ---
    raridades: {
        comum:   { chance: 60, minStatus: 1, maxStatus: 1, valorMin: 1, valorMax: 3,   cor: '#ffffff', corChao: '255,255,255' },
        raro:    { chance: 27, minStatus: 2, maxStatus: 2, valorMin: 2, valorMax: 5,   cor: '#4da6ff', corChao: '77,166,255' },
        epico:   { chance: 10, minStatus: 2, maxStatus: 3, valorMin: 4, valorMax: 8,   cor: '#a855f7', corChao: '168,85,247' },
        lendario:{ chance: 3,  minStatus: 3, maxStatus: 4, valorMin: 6, valorMax: 12,  cor: '#ff7a00', corChao: '255,122,0' }
    },

    // --- Chance de drop de monstros comuns ---
    // A chance final é proporcional ao HP base do monstro (dificuldade).
    chanceDropMonstroMin: 0.08,
    chanceDropMonstroMax: 0.55,
    hpReferenciaEscala: 120,      // HP a partir do qual a chance atinge o máximo

    // --- Bosses: SEMPRE dropam; quantidade de itens por morte ---
    dropsPorBoss: 2,

    // --- Coleta / item no chão ---
    raioColeta: 70,               // distância máx. (px) para o servidor aceitar a coleta
    raioToqueCliente: 48,         // raio de toque/clique usado no cliente
    tempoVidaDropMs: 150000,      // 150s no chão antes de sumir

    // --- Pesos de status POR SLOT (somente os 8 status oficiais do jogo) ---
    slots: {
        capacete: { icone: '🪖', nome: '🪖 CAPACETE', pesos: { forca: 3, divindade: 4, vida: 3, inteligencia: 2, agilidade: 1, destreza: 1 } },
        peitoral: { icone: '🛡️', nome: '🛡️ ARMADURA', pesos: { vida: 6, forca: 4, divindade: 3, inteligencia: 2, agilidade: 1, destreza: 1 } },
        capa:     { icone: '🧥', nome: '🧥 CAPA',     pesos: { agilidade: 4, vida: 3, inteligencia: 3, destreza: 2, divindade: 1 } },
        luva:     { icone: '🧤', nome: '🧤 LUVA',     pesos: { destreza: 5, forca: 3, agilidade: 3, vida: 1, inteligencia: 1 } },
        bota:     { icone: '🥾', nome: '🥾 BOTA',     pesos: { agilidade: 5, destreza: 3, vida: 2, forca: 1, divindade: 1 } },
        anel:     { icone: '💍', nome: '💍 ANEL',     pesos: { afinidade: 8, destreza: 3, inteligencia: 3, forca: 2, vida: 2, divindade: 1 } },
        colar:    { icone: '📿', nome: '📿 COLAR',    pesos: { divindade: 5, inteligencia: 4, vida: 3, afinidade: 2, forca: 1 } }
        // arma / armaSecundaria: pesos dinâmicos conforme a classe (abaixo)
    },

    // --- Prioridade relativa de cada slot no sorteio do drop ---
    pesoSlots: {
        capacete: 1, peitoral: 1, capa: 1, luva: 1, bota: 1, anel: 1, colar: 1,
        arma: 0.9, armaSecundaria: 0.6
    },

    // --- ARMAS POR CLASSE ---
    // Bárbaro e Roqueiro estão SEM armas (configuração preparada e vazia
    // — equipamentos de arma NUNCA caem para essas classes).
    armas: {
        guerreiro: {
            espada_pedra: { slot: 'arma', nome: 'Espada de Pedra',     icon: '🗡️', pesos: { forca: 7, destreza: 3, vida: 2 } },
            escudo_pedra: { slot: 'armaSecundaria', nome: 'Escudo de Pedra', icon: '🛡️', pesos: { vida: 7, divindade: 3, forca: 2, agilidade: 1 } }
        },
        mago: {
            cajado_arcano: { slot: 'arma', nome: 'Cajado Arcano',      icon: '🪄', pesos: { inteligencia: 8, divindade: 3, vida: 1 } },
            grimorio_arcano: { slot: 'armaSecundaria', nome: 'Grimório Arcano', icon: '📖', pesos: { inteligencia: 7, divindade: 3, agilidade: 2, vida: 1 } }
        },
        summoner: {
            orbe_sombras: { slot: 'arma', nome: 'Orbe das Sombras',    icon: '🔮', pesos: { inteligencia: 5, afinidade: 6, profanidade: 2 } },
            calice_sombras: { slot: 'armaSecundaria', nome: 'Cálice das Sombras', icon: '🏆', pesos: { afinidade: 7, inteligencia: 3, profanidade: 3, vida: 1 } }
        },
        arqueiro: {
            arco_longo: { slot: 'arma', nome: 'Arco Longo',            icon: '🏹', pesos: { destreza: 6, forca: 3, agilidade: 3 } },
            aljava_peregrina: { slot: 'armaSecundaria', nome: 'Aljava Peregrina', icon: '🪶', pesos: { destreza: 6, agilidade: 4, vida: 2 } }
        },
        curandeiro: {
            luz_sagrada: { slot: 'arma', nome: 'Luz Sagrada',          icon: '✨', pesos: { divindade: 7, inteligencia: 4, vida: 2 } },
            rosario_sagrado: { slot: 'armaSecundaria', nome: 'Rosário Sagrado', icon: '🕊️', pesos: { divindade: 7, inteligencia: 3, vida: 2 } }
        },
        barbaro: { },
        roqueiro: { }
    }
};

const ATRIBUTOS = ['forca', 'inteligencia', 'agilidade', 'destreza', 'vida', 'profanidade', 'divindade', 'afinidade'];

const NOME_RARIDADES = { comum: 'COMUM', raro: 'RARO', epico: 'ÉPICO', lendario: 'LENDÁRIO' };

let seqId = 0;
function novoId() {
    seqId++;
    return 'drop_' + Date.now() + '_' + seqId;
}

function valorAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ============================================================
   >>> REGRA ISOLADA: QUEM DEFINE A CLASSE DO DROP <<<
   Por padrão: o jogador com MAIOR dano causado na morte define a
   classe do equipamento que cai. Para mudar a regra (ex.: último
   a acertar, aleatório, individual por participante...) altere
   SOMENTE esta função.
   ============================================================ */
function escolherCriadorDrop(tabelaDano) {
    if (!tabelaDano) return null;
    let melhorId = null;
    let melhorDano = -1;
    for (let pid in tabelaDano) {
        if (tabelaDano[pid] > melhorDano) {
            melhorDano = tabelaDano[pid];
            melhorId = pid;
        }
    }
    return melhorId;
}

function armasDaClasse(classe) {
    return (BALANCE.armas && BALANCE.armas[classe]) ? BALANCE.armas[classe] : {};
}

// Slots de equipamento que a classe pode receber (arma/secundária só se tiver arma definida)
function slotsDisponiveis(classe) {
    let armas = armasDaClasse(classe);
    let temArma = false, temSec = false;
    for (let chave in armas) {
        if (armas[chave].slot === 'arma') temArma = true;
        if (armas[chave].slot === 'armaSecundaria') temSec = true;
    }
    let slots = [];
    for (let s in BALANCE.pesoSlots) {
        if (s === 'arma' && !temArma) continue;
        if (s === 'armaSecundaria' && !temSec) continue;
        slots.push(s);
    }
    return slots;
}

function sortearSlot(classe) {
    let slots = slotsDisponiveis(classe);
    let total = 0;
    for (let s of slots) total += (BALANCE.pesoSlots[s] || 0.1);
    let r = Math.random() * total;
    for (let s of slots) {
        r -= (BALANCE.pesoSlots[s] || 0.1);
        if (r <= 0) return s;
    }
    return slots[slots.length - 1];
}

function sortearRaridade() {
    let r = Math.random() * 100;
    let acc = 0;
    for (let chave in BALANCE.raridades) {
        acc += BALANCE.raridades[chave].chance;
        if (r < acc) return chave;
    }
    return 'comum';
}

function sortearStatus(pesos, raridadeDef, quantStatus) {
    let pesosUsar = pesos || {};
    let chaves = Object.keys(pesosUsar).filter(k => pesosUsar[k] > 0);
    if (chaves.length === 0) chaves = ATRIBUTOS.slice();
    let candidatos = chaves.slice();
    let status = {};
    for (let n = 0; n < quantStatus && candidatos.length > 0; n++) {
        let total = 0;
        for (let k of candidatos) total += pesosUsar[k];
        let r = Math.random() * total;
        let idx = 0;
        for (let i = 0; i < candidatos.length; i++) {
            r -= pesosUsar[candidatos[i]];
            if (r <= 0) { idx = i; break; }
        }
        let escolhido = candidatos[idx];
        status[escolhido] = valorAleatorio(raridadeDef.valorMin, raridadeDef.valorMax);
        candidatos.splice(idx, 1);
    }
    return status;
}

function nomeRaridade(chave) {
    return NOME_RARIDADES[chave] || ('' + chave).toUpperCase();
}

function gerarEquipamento(classe) {
    let raridade = sortearRaridade();
    let raridadeDef = BALANCE.raridades[raridade];
    let quantStatus = valorAleatorio(raridadeDef.minStatus, raridadeDef.maxStatus);
    let slot = sortearSlot(classe);
    let armas = armasDaClasse(classe);

    // --- ARMA (ou secundária): usa a definição da arma da classe ---
    if (slot === 'arma' || slot === 'armaSecundaria') {
        let candidatas = [];
        for (let chave in armas) {
            let def = armas[chave];
            if (def.slot === slot) candidatas.push({ chave: chave, def: def });
        }
        if (candidatas.length === 0) {
            // seguranca: classe sem arma no slot sorteado (não deve ocorrer)
            slot = 'anel';
        } else {
            let escolhida = candidatas[Math.floor(Math.random() * candidatas.length)];
            let def = escolhida.def;
            let status = sortearStatus(def.pesos, raridadeDef, quantStatus);
            return {
                id: novoId(), uid: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
                tipo: 'equipamento',
                slot: slot,
                raridade: raridade,
                raridadeNome: nomeRaridade(raridade),
                nome: def.icon + ' ' + def.nome + (raridade === 'comum' ? '' : (' ' + nomeRaridade(raridade))),
                icon: def.icon,
                status: status,
                cor: raridadeDef.cor,
                classe: classe,
                armaChave: escolhida.chave
            };
        }
    }

    // --- EQUIPAMENTO NÃO-ARMA ---
    let slotDef = BALANCE.slots[slot] || { icone: '🎒', nome: slot.toUpperCase(), pesos: {} };
    let status = sortearStatus(slotDef.pesos, raridadeDef, quantStatus);
    return {
        id: novoId(), uid: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
        tipo: 'equipamento',
        slot: slot,
        raridade: raridade,
        raridadeNome: nomeRaridade(raridade),
        nome: slotDef.nome + ' ' + nomeRaridade(raridade),
        icon: slotDef.icone || '🎒',
        status: status,
        cor: raridadeDef.cor,
        classe: null,
        armaChave: null
    };
}

// Sorteia se a morte de um monstro comum deixa um drop (por dificuldade = HP base)
function rolarDropMonstro(baseHp) {
    let hp = baseHp || 0;
    let prog = Math.min(1, Math.max(0, hp / (BALANCE.hpReferenciaEscala || 1)));
    let chance = BALANCE.chanceDropMonstroMin + (BALANCE.chanceDropMonstroMax - BALANCE.chanceDropMonstroMin) * prog;
    return Math.random() < chance;
}

// Verifica se a classe pode equipar o item (arma é exclusiva da classe)
function classePodeEquipar(classe, item) {
    if (!item || item.tipo !== 'equipamento') return false;
    if (item.slot === 'arma' || item.slot === 'armaSecundaria') {
        let armas = armasDaClasse(classe);
        return !!(item.classe && item.classe === classe && armas[item.armaChave]);
    }
    return true;
}

// Somatório de status do item (é o que alimenta getAtr)
function calcularBonus(item) {
    return (item && item.status) ? item.status : {};
}

module.exports = {
    BALANCE: BALANCE,
    ATRIBUTOS: ATRIBUTOS,
    NOME_RARIDADES: NOME_RARIDADES,
    novoId: novoId,
    gerarEquipamento: gerarEquipamento,
    calcularBonus: calcularBonus,
    classePodeEquipar: classePodeEquipar,
    escolherCriadorDrop: escolherCriadorDrop,
    rolarDropMonstro: rolarDropMonstro,
    slotsDisponiveis: slotsDisponiveis,
    armasDaClasse: armasDaClasse,
    nomeRaridade: nomeRaridade
};
