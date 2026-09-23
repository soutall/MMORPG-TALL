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

    // ===== DROPS AUXILIARES (v1.34) =====
    // Poções de Vida/Mana com 3 níveis (nível 1 = pouca cura, 2 = média, 3 = cheia)
    pocoesHp: [
        { nivel: 1, pct: 0.20, nome: '🧪 Poção de Vida I',   icon: '🧪', cor: '#e74c3c' },
        { nivel: 2, pct: 0.40, nome: '🧪 Poção de Vida II',  icon: '🧪', cor: '#e74c3c' },
        { nivel: 3, pct: 1.00, nome: '🧪 Poção de Vida III', icon: '❣️', cor: '#ff4d4d' }
    ],
    pocoesMp: [
        { nivel: 1, pct: 0.20, nome: '🔮 Poção de Mana I',   icon: '🔮', cor: '#3498db' },
        { nivel: 2, pct: 0.30, nome: '🔮 Poção de Mana II',  icon: '🔮', cor: '#3498db' },
        { nivel: 3, pct: 1.00, nome: '🔮 Poção de Mana III', icon: '💎', cor: '#7ec8ff' }
    ],

    // chance de cair poção numa morte comum (bosses: sempre 2 poções)
    chancePocaoMonstro: 0.30,

    // Ouro: chance de quase todos os monstros + faixa de quantidade
    chanceOuroMonstro: 0.90,
    ouroMin: 1,
    ouroMax: 6,
    ouroBaseBoss: 25,

    // --- Tabela de Raridade das Pedras de Upgrade ---
    // Quanto mais difícil (HP base alto) o monstro, maior a chance de cair
    // pedra E melhor a raridade sorteada.
    pedras: {
        raridades: {
            comum:   { chance: 52, cor: '#ffffff', corChao: '255,255,255', nome: 'Pedra de Upgrade Comum' },
            raro:    { chance: 27, cor: '#4da6ff', corChao: '77,166,255',  nome: 'Pedra de Upgrade Rara' },
            epico:   { chance: 15, cor: '#a855f7', corChao: '168,85,247',  nome: 'Pedra de Upgrade Épica' },
            lendario:{ chance: 6,  cor: '#ff7a00', corChao: '255,122,0',   nome: 'Pedra de Upgrade Lendária' }
        },
        chancePedraMonstroMin: 0.04,   // chance de cair pedra (monstro muito fraco)
        chancePedraMonstroMax: 0.45,   // chance de cair pedra (monstro muito forte)
        // bônus de % que desloca a raridade p/ cima conforme a dificuldade
        bonusRaridadePorDificuldade: 35
    },

    // Ícone/cor do drop de OURO no chão
    ouroDrop: { icon: '🪙', cor: '#f1c40f', corChao: '241,196,15' },

    // --- Pesos de status POR SLOT (somente os 8 status oficiais do jogo) ---
    slots: {
        capacete: { icone: '🪖', nome: '🪖 CAPACETE', pesos: { forca: 3, divindade: 4, vida: 3, inteligencia: 2, agilidade: 1, destreza: 1 } },
        peitoral: { icone: '🛡️', nome: '🛡️ ARMADURA', pesos: { vida: 6, forca: 4, divindade: 3, inteligencia: 2, agilidade: 1, destreza: 1 } },
        capa:     { icone: '🧥', nome: '🧥 CAPA',     pesos: { agilidade: 4, vida: 3, inteligencia: 3, destreza: 2, divindade: 1 } },
        luva:     { icone: '🧤', nome: '🧤 LUVA',     pesos: { destreza: 5, forca: 3, agilidade: 3, vida: 1, inteligencia: 1, velocidadeAtaque: 4 } },
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
            espada_pedra: { slot: 'arma', nome: 'Espada de Pedra',     icon: '🗡️', pesos: { forca: 7, destreza: 3, vida: 2, velocidadeAtaque: 3 } },
            escudo_pedra: { slot: 'armaSecundaria', nome: 'Escudo de Pedra', icon: '🛡️', pesos: { vida: 7, divindade: 3, forca: 2, agilidade: 1 } }
        },
        mago: {
            cajado_arcano: { slot: 'arma', nome: 'Cajado Arcano',      icon: '🪄', pesos: { inteligencia: 8, divindade: 3, vida: 1, velocidadeAtaque: 2 } },
            grimorio_arcano: { slot: 'armaSecundaria', nome: 'Grimório Arcano', icon: '📖', pesos: { inteligencia: 7, divindade: 3, agilidade: 2, vida: 1 } }
        },
        summoner: {
            orbe_sombras: { slot: 'arma', nome: 'Orbe das Sombras',    icon: '🔮', pesos: { inteligencia: 5, afinidade: 6, profanidade: 2, velocidadeAtaque: 2 } },
            calice_sombras: { slot: 'armaSecundaria', nome: 'Cálice das Sombras', icon: '🏆', pesos: { afinidade: 7, inteligencia: 3, profanidade: 3, vida: 1 } }
        },
        arqueiro: {
            arco_longo: { slot: 'arma', nome: 'Arco Longo',            icon: '🏹', pesos: { destreza: 6, forca: 3, agilidade: 3, velocidadeAtaque: 4 } },
            aljava_peregrina: { slot: 'armaSecundaria', nome: 'Aljava Peregrina', icon: '🪶', pesos: { destreza: 6, agilidade: 4, vida: 2 } }
        },
        curandeiro: {
            luz_sagrada: { slot: 'arma', nome: 'Luz Sagrada',          icon: '✨', pesos: { divindade: 7, inteligencia: 4, vida: 2, velocidadeAtaque: 2 } },
            rosario_sagrado: { slot: 'armaSecundaria', nome: 'Rosário Sagrado', icon: '🕊️', pesos: { divindade: 7, inteligencia: 3, vida: 2 } }
        },
        barbaro: { },
        roqueiro: { },
        ladino: {
            adaga_ladino: { slot: 'arma', nome: 'Adaga do Assassino',   icon: '🗡️', pesos: { destreza: 7, forca: 3, agilidade: 3, velocidadeAtaque: 4 } },
            bomba_veneno: { slot: 'armaSecundaria', nome: 'Bomba de Veneno', icon: '🧪', pesos: { destreza: 5, profanidade: 5, agilidade: 3, vida: 1 } }
        },
        dronemaster: {
            chave_tecnico: { slot: 'arma', nome: 'Chave Técnica',       icon: '🔧', pesos: { forca: 6, destreza: 4, inteligencia: 3, velocidadeAtaque: 3 } },
            modulo_energia: { slot: 'armaSecundaria', nome: 'Módulo de Energia', icon: '🔋', pesos: { inteligencia: 6, forca: 3, vida: 3, velocidadeAtaque: 2 } }
        },
        arqueiro_arcano: {
            arco_elemental: { slot: 'arma', nome: 'Arco Elemental',    icon: '🏹', pesos: { inteligencia: 6, destreza: 4, afinidade: 3, velocidadeAtaque: 4 } },
            runas_ancestrais: { slot: 'armaSecundaria', nome: 'Runas Ancestrais', icon: '🔮', pesos: { inteligencia: 6, afinidade: 4, divindade: 2, vida: 1 } }
        },
        sniper: {
            barrett_antimateria: { slot: 'arma', nome: 'Barrett Antimatéria', icon: '🔫', pesos: { destreza: 7, forca: 4, agilidade: 2, velocidadeAtaque: 2 } },
            luneta_tatica: { slot: 'armaSecundaria', nome: 'Luneta Tática',     icon: '🔭', pesos: { destreza: 6, agilidade: 4, vida: 2 } }
        },
        pikeman: {
            foice_da_morte: { slot: 'arma', nome: 'Foice da Morte',    icon: '⚖️', pesos: { forca: 8, destreza: 3, vida: 3, velocidadeAtaque: 3 } },
            foice_curta: { slot: 'armaSecundaria', nome: 'Foice Curta', icon: '🔪', pesos: { forca: 7, agilidade: 3, destreza: 2, vida: 1 } }
        }
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


// ============================================================
// (v1.34) DROPS AUXILIARES: POÇÕES, OURO E PEDRAS DE UPGRADE
// ============================================================

// Poção de Vida ou Mana (nivel 1..3 conforme BALANCE.pocoesHp/pocoesMp)
function gerarPocao(tipo, nivel) {
    let lista = (tipo === 'mp') ? BALANCE.pocoesMp : BALANCE.pocoesHp;
    let def = lista[nivel - 1] || lista[lista.length - 1];
    return {
        id: novoId(), uid: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
        tipo: 'consumivel',
        subtipo: tipo === 'mp' ? 'pocao_mp' : 'pocao_hp',
        nivel: def.nivel,
        nome: def.nome,
        icon: def.icon,
        cor: def.cor,
        pctCura: def.pct,
        quantidade: 1,
        autocoleta: true,
        stackavel: false // poções não empilham no mochilão (cada uso consome 1 unidade)
    };
}

// Sorteia o nível da poção conforme a dificuldade (HP base) do monstro
function sortearPocao(baseHp) {
    let hp = baseHp || 0;
    let r = Math.random();
    if (hp >= 150) { return r < 0.45 ? 3 : (r < 0.85 ? 2 : 1); }
    if (hp >= 70) { return r < 0.25 ? 3 : (r < 0.70 ? 2 : 1); }
    return r < 0.10 ? 2 : 1;
}

// Drop de OURO: quantidade pequena proporcional à dificuldade
function gerarOuro(baseHp, ehBoss) {
    let qtd = ehBoss ? BALANCE.ouroBaseBoss : valorAleatorio(BALANCE.ouroMin, BALANCE.ouroMax);
    if (!ehBoss) qtd += Math.floor((baseHp || 0) / 40);
    return {
        id: novoId(), uid: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
        tipo: 'ouro',
        nome: 'Ouro',
        icon: BALANCE.ouroDrop.icon,
        cor: BALANCE.ouroDrop.cor,
        quantidade: Math.max(1, qtd),
        autocoleta: true,
        stackavel: false
    };
}

// Tabela de raridade das PEDRAS DE UPGRADE: dificuldade alta => melhor raridade.
// Retorna null quando a morte não der pedra.
function gerarPedraUpgrade(baseHp) {
    let hp = baseHp || 0;
    let prog = Math.min(1, Math.max(0, hp / (BALANCE.hpReferenciaEscala || 1)));
    let chance = BALANCE.pedras.chancePedraMonstroMin + (BALANCE.pedras.chancePedraMonstroMax - BALANCE.pedras.chancePedraMonstroMin) * prog;
    if (Math.random() > chance) return null;

    // Sorteia raridade com bônus que sobe conforme a dificuldade
    let raridades = BALANCE.pedras.raridades;
    let chaves = Object.keys(raridades);
    let bonus = Math.round(BALANCE.pedras.bonusRaridadePorDificuldade * prog);
    let total = 0;
    for (let k of chaves) total += raridades[k].chance;
    let alvo = Math.random() * (total + bonus * 2);
    let acumulado = 0;
    let raridade = chaves[0];
    for (let i = 0; i < chaves.length; i++) {
        let k = chaves[i];
        let peso = raridades[k].chance;
        // bônus desloca probabilidade para raro/épico/lendário (dificuldades altas)
        if (k === 'raro') peso += bonus * 0.5;
        if (k === 'epico') peso += bonus * 0.9;
        if (k === 'lendario') peso += bonus * 0.6;
        acumulado += peso;
        if (alvo < acumulado) { raridade = k; break; }
    }
    let def = raridades[raridade];
    return {
        id: novoId(), uid: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
        tipo: 'pedra',
        raridade: raridade,
        raridadeNome: (def.nome || raridade).toUpperCase(),
        nome: '💎 ' + def.nome,
        icon: '💎',
        cor: def.cor,
        quantidade: 1,
        autocoleta: true,
        stackavel: false,
        pedra: true
    };
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
    gerarPocao: gerarPocao,
    sortearPocao: sortearPocao,
    gerarOuro: gerarOuro,
    gerarPedraUpgrade: gerarPedraUpgrade,
    slotsDisponiveis: slotsDisponiveis,
    armasDaClasse: armasDaClasse,
    nomeRaridade: nomeRaridade
};
