const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

process.on('uncaughtException', (err) => {
    console.error('[ERRO NÃO TRATADO]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[PROMISE NÃO TRATADA]', reason);
});

let mapaDeserto = null;
try {
    mapaDeserto = require('./mapa_deserto.js');
    console.log("Fase 2 'Deserto com Oásis' carregada (" + mapaDeserto.COLS + "x" + mapaDeserto.ROWS + " tiles).");
} catch (e) {
    console.log("Aviso: mapa_deserto.js não carregado: " + e.message);
}

let mapaPantano = null;
try {
    mapaPantano = require('./mapa_pantano.js');
    console.log("Fase 3 'Pântano Lodoso' carregada (" + mapaPantano.COLS + "x" + mapaPantano.ROWS + " tiles).");
} catch (e) {
    console.log("Aviso: mapa_pantano.js não carregado: " + e.message);
}

let mapaCaverna = null;
try {
    mapaCaverna = require('./mapa_caverna.js');
    console.log("Fase 4 'Caverna Sombria (DG)' carregada (" + mapaCaverna.COLS + "x" + mapaCaverna.ROWS + " tiles).");
} catch (e) {
    console.log("Aviso: mapa_caverna.js não carregado: " + e.message);
}

let mapaCidade = null;
try {
    mapaCidade = require('./mapa_cidade.js');
    console.log("Fase 5 'Cidade de Davahl' carregada (" + mapaCidade.COLS + "x" + mapaCidade.ROWS + " tiles).");
} catch (e) {
    console.log("Aviso: mapa_cidade.js não carregado: " + e.message);
}

let salvarProgresso = () => {}, carregarProgresso = () => null;
try {
    const db = require('./database.js');
    if (db.salvarProgresso) salvarProgresso = db.salvarProgresso;
    if (db.carregarProgresso) carregarProgresso = db.carregarProgresso;
} catch (e) {
    console.log("Aviso: database.js em memória.");
}

// ============ SISTEMA DE BANDEIRAS DE SPAWN (modo admin) ============
let spawnsAdmin = null;
try {
    spawnsAdmin = require('./spawns.js');
    console.log("Sistema de Spawns (bandeiras admin) carregado.");
} catch (e) {
    console.log("Aviso: spawns.js não carregado: " + e.message);
}

// ============ SISTEMA DE EQUIPAMENTOS (drop) ============
let equipamentos = null;
try {
    equipamentos = require('./equipamentos.js');
    console.log("Sistema de Equipamentos (drop) carregado.");
} catch (e) {
    console.log("Aviso: equipamentos.js não carregado: " + e.message);
}

// ============ SISTEMA DE DEBUFFS/BUFFS ============
let efeitos = null;
try {
    efeitos = require('./debuffs.js');
    console.log("Sistema de Debuffs/Buffs carregado.");
} catch (e) {
    console.log("Aviso: debuffs.js não carregado: " + e.message);
}

const server = http.createServer((req, res) => {
    let urlSemQuery = req.url.split('?')[0]; 
    let urlFinal = urlSemQuery === '/' ? '/index.html' : urlSemQuery;
    let filePath = path.join(__dirname, urlFinal);
    let extname = path.extname(filePath);
    let contentType = 'text/html; charset=utf-8';
    
    if (extname === '.js') contentType = 'text/javascript; charset=utf-8';
    if (extname === '.css') contentType = 'text/css; charset=utf-8';
    if (extname === '.json') contentType = 'application/json; charset=utf-8';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end("Arquivo não encontrado.");
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        res.end(data);
    });
});

const wss = new WebSocket.Server({ server });
wss.on('error', (err) => {
    console.error('[WSS ERRO]', err && err.message ? err.message : err);
});
let players = {};
let playerSockets = {};
let trades = {}; // { tradeId: { p1: id1, p2: id2, items1: [], items2: [], conf1: false, conf2: false } }
let tradeCounter = 1;
let parties = {}; // { partyId: [playerId1, playerId2, ...] }
let partyCounter = 1;
let slimes = [];
let projeteis = [];
let playerProjeteis = [];
let blizzards = [];
let chuvasServidor = [];
let lacaios = {};
let petRespawnTimer = {};
let bandas = {};
let bateriaCanal = {};
let dropsChao = [];

// Bandeiras de spawn criadas por admins (persistidas em spawn_flags.json)
let bandeirasSpawn = (spawnsAdmin && typeof spawnsAdmin.carregarBandeiras === 'function') ? spawnsAdmin.carregarBandeiras() : [];
let bandeirasInicializadas = false;

const WORLD_WIDTH = 63800;
const WORLD_HEIGHT = 36000;
const LARGURA_VERDE = 18000; // Fase 1 (mapa verde — 10x maior)
const LARGURA_DESERTO = 50000; // Fase 2 (deserto — 20x maior)
const LARGURA_PANTANO = 58000; // Fase 3 (pântano — 5x maior)
const LARGURA_CAVERNA = 58000; // Fase 4 (caverna / DG) - começa aqui
const FIM_CAVERNA = 59800;
const LARGURA_CIDADE = 59800; // Fase 5 (cidade separada)
const FIM_CIDADE = 63800;
const ALTO_VERDE = 18000, ALTO_DESERTO = 36000, ALTO_PANTANO = 9000, ALTO_CAVERNA = 1800, ALTO_CIDADE = 3000;
const CIDADE_SPAWN_X = 61824, CIDADE_SPAWN_Y = 1783;
const PONTOS_TELEPORTE = { green: { x: 5200, y: 1400 }, desert: { x: 18300, y: 4500 }, pantano: { x: 50200, y: 1000 }, caverna: { x: 58080, y: 900 }, cidade: { x: CIDADE_SPAWN_X, y: CIDADE_SPAWN_Y } };

const tabelaXp = {};
for (let lvl = 1; lvl <= 60; lvl++) {
    tabelaXp[lvl] = Math.floor(100 * Math.pow(lvl, 1.45));
}

// ============ SISTEMA DE ATRIBUTOS ============
const ATRIBUTOS = ['forca', 'inteligencia', 'agilidade', 'destreza', 'vida', 'profanidade', 'divindade', 'afinidade'];
const PONTOS_INICIAIS = 3; // pontos ganhos ao criar o personagem pela 1ª vez
const PONTOS_POR_LEVEL = 1; // +1 ponto a cada level up

function atributosIniciais() {
    return { forca: 1, inteligencia: 1, agilidade: 1, destreza: 1, vida: 1, profanidade: 1, divindade: 1, afinidade: 1 };
}

function getAtr(player, chave) {
    if (!player || !player.atributos) return 1;
    let base = typeof player.atributos[chave] === 'number' ? player.atributos[chave] : 1;
    // Bônus de equipamentos: somados sobre o atributo base (alimenta as fórmulas existentes)
    if (player.inventario && player.inventario.slots) {
        for (let s in player.inventario.slots) {
            let itemSlots = player.inventario.slots[s];
            if (itemSlots && itemSlots.status && typeof itemSlots.status[chave] === 'number') {
                base += itemSlots.status[chave];
            }
        }
    }
    return base;
}

function inventarioPadrao() {
    return {
        slots: {
            capacete: null, peitoral: null, arma: null, armaSecundaria: null,
            colar: null, anel: null, capa: null, bota: null, luva: null
        },
        mochila: []
    };
}

function atributosTotais(player) {
    let total = {};
    for (let ch of ATRIBUTOS) total[ch] = getAtr(player, ch);
    return total;
}

// Spawna o drop no chão na morte de um monstro/boss.
// A classe do item é decidida pela ÚNICA regra isolada em equipamentos.js
// (escolherCriadorDrop = maior contribuidor de dano).
function gerarDropNoChao(x, y, tabelaDano, baseHp, ehBoss) {
    if (!equipamentos) return;
    let vezes = ehBoss ? (equipamentos.BALANCE.dropsPorBoss || 1) : 1;
    if (!ehBoss && !equipamentos.rolarDropMonstro(baseHp)) return;
    let criadorId = equipamentos.escolherCriadorDrop(tabelaDano);
    let classe = (criadorId && players[criadorId]) ? players[criadorId].classe : null;
    if (!classe) return;
    for (let i = 0; i < vezes; i++) {
        let item = equipamentos.gerarEquipamento(classe);
        console.log(`[LOG ITEM GERADO] Item UID ${item.uid || item.id} (${item.nome}) criado no chao (X: ${x}, Y: ${y})`);
        dropsChao.push({ id: item.id, x: x, y: y, criadoEm: Date.now(), item: item });
        if (item.raridade === 'epico' || item.raridade === 'lendario') {
            let msg = JSON.stringify({ type: 'drop_raro', dropId: item.id, x: x, y: y, raridade: item.raridade, nome: item.nome || 'Item' });
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(msg);
            });
        }
    }
}

// VIDA máxima: base 100 + (vida-1)*20 + (forca-1)*4
function calcularMaxHp(player) {
    return 100 + (getAtr(player, 'vida') - 1) * 20 + (getAtr(player, 'forca') - 1) * 4;
}

// MANA máxima: base 50 + (inteligencia-1)*10
function calcularMaxMp(player) {
    return 50 + (getAtr(player, 'inteligencia') - 1) * 10;
}

// ===== SISTEMA DE SKILLS (níveis persistidos por jogador) =====
const NIVEL_SKILL_MAX = 10;

function obterNivelSkill(p, skillId) {
    return (p && p.skills && p.skills[skillId]) ? p.skills[skillId] : 1;
}

// Dano/cura escala +25% por nível
function dmgSkill(p, skillId, base) {
    if (!base) return base;
    return Math.round(base * (1 + (obterNivelSkill(p, skillId) - 1) * 0.25));
}

// Custo de mana escala +6% por nível
function mpSkill(p, skillId, baseMp) {
    if (!baseMp) return 0;
    return Math.round(baseMp * (1 + (obterNivelSkill(p, skillId) - 1) * 0.06));
}

// Checa mana e desconta; se insuficiente avisa e retorna false
function gastarMana(ws, p, custo) {
    if (!custo || custo <= 0) return true;
    if ((p.mana || 0) < custo) {
        ws.send(JSON.stringify({ type: 'mp_insuficiente', custo: custo, mana: Math.round(p.mana || 0) }));
        return false;
    }
    p.mana = Math.max(0, Math.round(p.mana - custo));
    ws.send(JSON.stringify({ type: 'mp_sync', mp: p.mana, maxMp: p.maxMp }));
    return true;
}

// AFINIDADE: vida do lacaio/ogro (90 base)
function calcularVidaPet(player) {
    return 90 + (getAtr(player, 'afinidade') - 1) * 15;
}

// Calcula dano final do autor, aplicando multiplicadores de atributo + crítico
// tipoOrigem: 'player' (força/inteligência por classe + crítico), 'pet' (afinidade), 'dot' (profanidade)
function calcularDanoJogador(autorId, quantidade, tipoOrigem) {
    let p = players[autorId];
    if (!p) return { dano: Math.round(quantidade), critico: false };
    let mult = 1;
    let critMult = 1;
    if (tipoOrigem === 'pet') {
        mult += (getAtr(p, 'afinidade') - 1) * 0.05;
    } else if (tipoOrigem === 'dot') {
        mult += (getAtr(p, 'profanidade') - 1) * 0.05;
    } else {
        let ehMagico = ['mago', 'summoner', 'curandeiro', 'roqueiro'].indexOf(p.classe) !== -1;
        mult += (getAtr(p, ehMagico ? 'inteligencia' : 'forca') - 1) * 0.05;
        // DESTREZA: 5% base + 1% por ponto de chance; 1.5x + 3% por ponto de multiplicador
        if (Math.random() < (0.05 + (getAtr(p, 'destreza') - 1) * 0.01)) {
            critMult = 1.5 + (getAtr(p, 'destreza') - 1) * 0.03;
        }
    }
    // Debuffs/buffs alteram o dano causado
    if (efeitos) {
        if (efeitos.temEfeito(p, 'reducaoAtk')) mult *= 0.75; // Enfraquecido: -25%
        if (efeitos.temEfeito(p, 'fervor')) mult *= 1.25;     // Fervor: +25%
    }
    return { dano: Math.round(quantidade * mult * critMult), critico: critMult > 1 };
}

// Cura DIVINDADE: +5% por ponto (influencia cura e escudos)
function calcularCuraJogador(autorId, curaBase) {
    let p = players[autorId];
    if (!p) return Math.round(curaBase);
    return Math.round(curaBase * (1 + (getAtr(p, 'divindade') - 1) * 0.05));
}

function broadcastCritico(x, y, autorId) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'texto_critico', x: x, y: y, autorId: autorId }));
        }
    });
}

function broadcastBesouroDecolagem(id, x, y, ang) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_besouro_decolagem', id: id, x: x, y: y, ang: ang }));
        }
    });
}

function broadcastBesouroImpacto(pid, x, y) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_besouro_impacto', pid: pid, x: x, y: y }));
        }
    });
}

// Rios foram removidos do mapa verde (substituídos por lagos acessíveis).
// Mantida a função para compatibilidade, mas nada bloqueia mais por água.
function estaNaAgua(x, y) {
    return false;
}

function xNoDeserto(x) { return x >= LARGURA_VERDE && x < LARGURA_DESERTO; }

// Movimento de entidades (monstros/banda): respeita os grids de colisão
// de cada bioma + os limites de altura de cada mapa.
function podeAndar(x, y) {
    if (!(y >= 0)) return false;
    if (x < LARGURA_VERDE) return y < ALTO_VERDE;
    if (x < LARGURA_DESERTO) {
        if (y >= ALTO_DESERTO) return false;
        if (mapaDeserto && mapaDeserto.colideDeserto(x, y)) return false;
        return true;
    }
    if (x < LARGURA_PANTANO) {
        if (y >= ALTO_PANTANO) return false;
        if (mapaPantano && mapaPantano.colidePantano(x, y)) return false;
        if (mapaPantano && mapaPantano.ehVenenoPantano && mapaPantano.ehVenenoPantano(x, y)) return false;
        return true;
    }
    if (x < FIM_CAVERNA) {
        if (y >= ALTO_CAVERNA) return false;
        if (mapaCaverna && mapaCaverna.colideCaverna(x, y)) return false;
        return true;
    }
    if (x < FIM_CIDADE) {
        if (y >= ALTO_CIDADE) return false;
        if (mapaCidade && mapaCidade.colideCidade(x, y)) return false;
        return true;
    }
    return false;
}

function gerarPosicaoValida() {
    let x, y;
    do {
        x = Math.random() * (LARGURA_VERDE - 200) + 100;
        y = Math.random() * (ALTO_VERDE - 200) + 100;
    } while (x >= LARGURA_VERDE || !podeAndar(x, y));
    return { x, y };
}

// Posição válida APENAS dentro do deserto (x ∈ [18000, 50000))
function gerarPosicaoDeserto() {
    let x, y;
    do {
        x = LARGURA_VERDE + Math.random() * (LARGURA_DESERTO - LARGURA_VERDE - 60) + 30;
        y = Math.random() * (ALTO_DESERTO - 60) + 30;
    } while (!podeAndar(x, y));
    return { x, y };
}

// Posição válida APENAS dentro da caverna (x ∈ [58000, 59800)) para Morcegos
function gerarPosicaoCaverna() {
    let x, y;
    do {
        x = LARGURA_CAVERNA + Math.random() * (FIM_CAVERNA - LARGURA_CAVERNA - 60) + 30;
        y = Math.random() * (ALTO_CAVERNA - 60) + 30;
    } while (!podeAndar(x, y));
    return { x, y };
}

// Posição de um player/entidade sobre o tile de água venenosa do pântano
function sobVenenoPantano(x, y) {
    if (!(x >= LARGURA_DESERTO && x < LARGURA_PANTANO)) return false;
    if (!mapaPantano || typeof mapaPantano.ehVenenoPantano !== 'function') return false;
    return mapaPantano.ehVenenoPantano(x, y);
}

function registrarDanoMonstro(slime, autorId, quantidade, tipoOrigem) {
    if (!slime || !autorId || slime.hp <= 0) return { dano: 0, critico: false };
    let calc = calcularDanoJogador(autorId, quantidade, tipoOrigem);
    let danoFinal = calc.dano;
    if (!slime.tabelaDano) slime.tabelaDano = {};
    slime.tabelaDano[autorId] = (slime.tabelaDano[autorId] || 0) + danoFinal;
    if (!slime.flagPassivo) slime.targetId = autorId;
    slime.hp -= danoFinal;
    if (calc.critico) broadcastCritico(slime.x, slime.y, autorId);
    if (danoFinal > 0 && players[autorId] && tipoOrigem !== 'pet') broadcastDanoFlut(slime.x, slime.y, danoFinal, autorId);

    if (slime.hp <= 0) {
        slime.hp = 0;
        gerarDropNoChao(slime.x, slime.y, slime.tabelaDano, slime.baseHp || slime.maxHp || 0, false);
        distribuirXpMorte(slime);
    }
    return { dano: danoFinal, critico: calc.critico };
}

function distribuirXpMorte(slime) {
    if (!slime.tabelaDano) return;
    let participantesIds = Object.keys(slime.tabelaDano);
    if (participantesIds.length === 0) return;

    // Expand participants to include their party members
    let allBeneficiaries = new Set();
    participantesIds.forEach(pid => {
        allBeneficiaries.add(pid);
        let p = players[pid];
        if (p && p.partyId && parties[p.partyId]) {
            parties[p.partyId].forEach(memberId => {
                allBeneficiaries.add(memberId);
            });
        }
    });

    let beneficiariosArr = Array.from(allBeneficiaries);
    let xpBase = 35;
    let xpPorPessoa = Math.max(15, Math.floor(xpBase / beneficiariosArr.length));
    // Bonus for party: +20% XP per person
    xpPorPessoa = Math.floor(xpPorPessoa * 1.2); 

    beneficiariosArr.forEach(pid => {
        let p = players[pid];
        let wsTarget = playerSockets[pid];
        if (p && wsTarget && wsTarget.readyState === WebSocket.OPEN) {
            p.xp += xpPorPessoa;
            let subiuLevel = false;
            let xpNecessario = tabelaXp[p.level] || 100;

            while (p.xp >= xpNecessario && p.level < 60) {
                p.xp -= xpNecessario;
                p.level++;
                if (p.pontosDisponiveis === undefined) p.pontosDisponiveis = 0;
                p.pontosDisponiveis += PONTOS_POR_LEVEL;
                p.pontosHabilidade = (p.pontosHabilidade || 0) + 1;
                p.mana = p.maxMp;
                subiuLevel = true;
                xpNecessario = tabelaXp[p.level] || 100;
            }


            salvarProgresso(p.nome, {
                level: p.level,
                xp: p.xp,
                classe: p.classe,
                hp: p.hp,
                x: Math.round(p.x),
                y: Math.round(p.y),
                atributos: p.atributos,
                pontosDisponiveis: p.pontosDisponiveis,
                skills: p.skills || {},
                pontosHabilidade: p.pontosHabilidade || 0
            });

            wsTarget.send(JSON.stringify({
                type: 'xp_ganho',
                quantidade: xpPorPessoa,
                level: p.level,
                xp: p.xp,
                pontos: (p.pontosDisponiveis || 0),
                pontosHabilidade: (p.pontosHabilidade || 0),
                subiuLevel: subiuLevel
            }));
        }
    });

    slime.tabelaDano = {};
}

function aplicarDanoJogador(pid, origemX, origemY, dano) {
    let jogador = players[pid];
    if (!jogador || jogador.hp <= 0) return false;

    if (jogador.classe === 'guerreiro' && jogador.estamina >= 15) {
        let anguloAtaque = Math.atan2(origemY - (jogador.y + 16), origemX - (jogador.x + 12));
        let anguloEscudo = jogador.angulo + Math.PI;
        let diff = Math.abs(Math.atan2(Math.sin(anguloEscudo - anguloAtaque), Math.cos(anguloEscudo - anguloAtaque)));
        if (diff < 0.8) {
            jogador.estamina = Math.max(0, jogador.estamina - 20);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_block', id: pid }));
                }
            });
            return true;
        }
    }

    // Debuffs/buffs alteram o dano recebido
    if (efeitos) {
        if (efeitos.temEfeito(jogador, 'reducaoDef')) dano = Math.round(dano * 1.25); // Defesa quebrada: +25%
        if (efeitos.temEfeito(jogador, 'escudo')) dano = Math.round(dano * 0.8);      // Escudo: -20%
        // SONO: qualquer dano recebido acorda o jogador
        if (efeitos.removerEfeito(jogador, 'sono')) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'efeitos_sync', id: pid, efeitos: efeitos.exporEfeitos(jogador) }));
                }
            });
        }
    }
    if (dano < 0) dano = 0;

    jogador.hp -= dano;
    if (jogador.hp < 0) jogador.hp = 0;
    return false;
}

// Aplica cura respeitando cortaCura no destinatário
function aplicarCuraAoJogador(pid, quantidade) {
    let p = players[pid];
    if (!p || p.hp <= 0) return;
    let cura = quantidade;
    if (efeitos && efeitos.temEfeito(p, 'cortaCura')) cura = Math.round(cura * 0.5);
    p.hp = Math.min(p.maxHp, p.hp + cura);
}

// ============ BOSS: GOLEM DE PEDRA ============
let bosses = [];

function registrarDanoBoss(boss, autorId, quantidade, tipo, tipoOrigem) {
    if (!boss || !autorId || boss.hp <= 0) return { dano: 0, critico: false };
    let tipoDano = (tipo === 'basico') ? 'basico' : 'skill';

    let calc = calcularDanoJogador(autorId, quantidade, tipoOrigem);
    let danoFinal = calc.dano;

    // Escudos de espinhos do golem
    if (boss.escudoTipo === 'vermelho' && tipoDano === 'basico') {
        refletirDanoBoss(boss, autorId, danoFinal);
        return { dano: 0, critico: false };
    }
    if (boss.escudoTipo === 'azul' && tipoDano === 'skill') {
        refletirDanoBoss(boss, autorId, danoFinal);
        return { dano: 0, critico: false };
    }

    if (!boss.tabelaDano) boss.tabelaDano = {};
    boss.tabelaDano[autorId] = (boss.tabelaDano[autorId] || 0) + danoFinal;
    boss.hp -= danoFinal;
    if (boss.hp < 0) boss.hp = 0;
    if (calc.critico) broadcastCritico(boss.x, boss.y, autorId);
    if (danoFinal > 0 && players[autorId] && tipoOrigem !== 'pet') broadcastDanoFlut(boss.x, boss.y, danoFinal, autorId);
    return { dano: danoFinal, critico: calc.critico };
}

function refletirDanoBoss(boss, autorId, quantidade) {
    let jogador = players[autorId];
    if (!jogador || jogador.hp <= 0) return;
    aplicarDanoJogador(autorId, boss.x, boss.y, quantidade);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'boss_golem_reflexo', x: boss.x, y: boss.y, autorId: autorId, dano: quantidade, cor: boss.escudoTipo }));
        }
    });
}

function danoEmBosses(x, y, raio, autorId, quantidade, tipo, tipoOrigem) {
    danoEmPlayers(x, y, raio, autorId, quantidade, tipo);
    let ret = null;
    for (let bb of bosses) {
        if (bb.hp > 0 && Math.hypot(bb.x - x, bb.y - y) < raio) {
            let r = registrarDanoBoss(bb, autorId, quantidade, tipo || 'skill', tipoOrigem);
            if (r && r.dano > 0 && (!ret || r.dano > ret.dano)) {
                ret = { x: bb.x, y: bb.y, dano: r.dano };
            }
        }
    }
    return ret;
}

function broadcastTradeUpdate(tid) {
    let trade = trades[tid];
    if (!trade) return;
    if (playerSockets[trade.p1]) {
        playerSockets[trade.p1].send(JSON.stringify({
            type: 'trade_update',
            itemsMe: trade.items1, itemsThem: trade.items2,
            confMe: trade.conf1, confThem: trade.conf2
        }));
    }
    if (playerSockets[trade.p2]) {
        playerSockets[trade.p2].send(JSON.stringify({
            type: 'trade_update',
            itemsMe: trade.items2, itemsThem: trade.items1,
            confMe: trade.conf2, confThem: trade.conf1
        }));
    }
}

function syncInventario(pid) {
    if (players[pid] && playerSockets[pid]) {
        let p = players[pid];
        if (p.inventario && p.inventario.mochila) {
            p.inventario.mochila = p.inventario.mochila.filter(i => i && i.tipo !== 'vazio');
        }
        playerSockets[pid].send(JSON.stringify({
            type: 'inventario_sync',
            inventario: p.inventario
        }));
    }
}

function adicionarAoInventario(pid, item) {
    let p = players[pid];
    if (!p || !p.inventario || !p.inventario.mochila) return;
    let invSlot = p.inventario.mochila.findIndex(x => x.tipo === 'vazio');
    if (invSlot !== -1) p.inventario.mochila[invSlot] = item;
    else p.inventario.mochila.push(item);
}

function cancelarTrade(pid) {
    let p = players[pid];
    if (!p || !p.tradeId) return;
    let tid = p.tradeId;
    let trade = trades[tid];
    if (trade) {
        trade.items1.forEach(it => adicionarAoInventario(trade.p1, it));
        trade.items2.forEach(it => adicionarAoInventario(trade.p2, it));
        syncInventario(trade.p1);
        syncInventario(trade.p2);
        if (playerSockets[trade.p1]) playerSockets[trade.p1].send(JSON.stringify({ type: 'trade_close', mensagem: "Trade Cancelado" }));
        if (playerSockets[trade.p2]) playerSockets[trade.p2].send(JSON.stringify({ type: 'trade_close', mensagem: "Trade Cancelado" }));
        if (players[trade.p1]) players[trade.p1].tradeId = null;
        if (players[trade.p2]) players[trade.p2].tradeId = null;
        delete trades[tid];
    }
}

function aplicarDanoPvP(atkId, defId, dano, type = 'físico') {
    let p2 = players[defId];
    if (!p2 || p2.hp <= 0) return;
    p2.hp -= dano;
    if (p2.hp < 0) p2.hp = 0;
    broadcastDanoFlut(p2.x, p2.y - 20, dano, atkId);
    if (p2.hp <= 0) {
        p2.hp = p2.maxHp;
        p2.x = CIDADE_SPAWN_X;
        p2.y = CIDADE_SPAWN_Y;
    }
}

function danoEmPlayers(x, y, raio, attackerId, dano, tipo = 'skill', cb = null) {
    let p1 = players[attackerId];
    if (!p1 || !p1.pvpAtivo) return;
    for (let pId in players) {
        if (pId === attackerId) continue;
        let p2 = players[pId];
        if (p2.pvpAtivo && p2.hp > 0) {
            if (Math.hypot(p2.x - x, p2.y - y) < raio) {
                aplicarDanoPvP(attackerId, pId, dano, tipo);
                if (cb) cb(p2);
            }
        }
    }
}

// ============ SISTEMA DE BANDEIRAS DE SPAWN (Admin) ============
function posicaoBandeiraValida(flag, raio) {
    for (let t = 0; t < 8; t++) {
        let ang = Math.random() * Math.PI * 2;
        let dist = Math.random() * raio;
        let x = Math.max(12, Math.min(WORLD_WIDTH - 12, flag.x + Math.cos(ang) * dist));
        let y = Math.max(12, Math.min(WORLD_HEIGHT - 12, flag.y + Math.sin(ang) * dist));
        if (!estaNaAgua(x, y) && podeAndar(x, y)) return { x, y };
    }
    return { x: flag.x, y: flag.y };
}

function spawnMonstroBandeira(flag) {
    if (!spawnsAdmin) return;
    let ehBoss = spawnsAdmin.TIPOS_MONSTROS[flag.tipo] && spawnsAdmin.TIPOS_MONSTROS[flag.tipo].boss;
    let passivo = flag.comportamento !== 'agressivo';
    let agressivo = !passivo;

    if (ehBoss) {
        let mob = bosses.find(b => b.flagId === flag.id && b.hp <= 0);
        if (mob) {
            mob.hp = flag.hpBase;
            mob.maxHp = flag.hpBase;
            mob.x = flag.x;
            mob.y = flag.y;
            mob.pedraX = flag.x;
            mob.pedraY = flag.y - 30;
            mob.fase = 'idle';
            mob.faseTick = 0;
            mob.cooldown = 40;
            mob.mortoTimer = 0;
            mob.mortoAnunciado = false;
            mob.tabelaDano = {};
            mob.escudoTipo = null;
            mob.escudoTimer = 0;
            mob.proximoEscudo = 120;
            mob.lastEscudo = 'azul';
            mob.tauntId = null;
            mob.tauntTimer = 0;
            mob.flagPassivo = passivo;
            mob.flagAgressivo = agressivo;
        } else {
            bosses.push(spawnsAdmin.criarBossBandeira(flag));
        }
        return;
    }

    let mob = slimes.find(s => s.flagId === flag.id && s.hp <= 0);
    if (mob) {
        let pos = posicaoBandeiraValida(flag, 60);
        mob.hp = flag.hpBase;
        mob.maxHp = flag.hpBase;
        mob.x = pos.x;
        mob.y = pos.y;
        mob.targetId = null;
        mob.stunTimer = 0;
        mob.slowTimer = 0;
        mob.respawnTimer = 0;
        mob.tabelaDano = {};
        mob.tauntTimer = 0;
        mob.tauntId = null;
        mob.flagPassivo = passivo;
        mob.flagAgressivo = agressivo;
        if (mob.tipo === 'zumbi') {
            mob.skillCharging = false;
            mob.skillChargeTimer = 0;
            mob.skillCooldown = Math.floor(40 + Math.random() * 90);
            mob.skillAim = null;
        }
    } else {
        slimes.push(spawnsAdmin.criarMonstroBandeira(flag));
    }
}

function preencherBandeira(flag) {
    if (!spawnsAdmin) return;
    let ehBoss = spawnsAdmin.TIPOS_MONSTROS[flag.tipo] && spawnsAdmin.TIPOS_MONSTROS[flag.tipo].boss;
    let vivos = 0;
    if (ehBoss) {
        for (let b of bosses) if (b.flagId === flag.id && b.hp > 0) vivos++;
    } else {
        for (let s of slimes) if (s.flagId === flag.id && s.hp > 0) vivos++;
    }
    let faltando = flag.maxQtd - vivos;
    for (let i = 0; i < faltando && i < 60; i++) spawnMonstroBandeira(flag);
    flag.timerRespawn = Math.max(1, Math.round(flag.respawnSeg * 20));
}

function sincronizarMonstrosBandeira(flag) {
    let vivos = [];
    for (let i = slimes.length - 1; i >= 0; i--) {
        let s = slimes[i];
        if (s.flagId !== flag.id) continue;
        if (s.hp > 0) {
            s.maxHp = flag.hpBase;
            if (s.hp > flag.hpBase) s.hp = flag.hpBase;
            s.flagPassivo = flag.comportamento !== 'agressivo';
            s.flagAgressivo = flag.comportamento === 'agressivo';
            vivos.push(s);
        }
    }
    for (let i = bosses.length - 1; i >= 0; i--) {
        let b = bosses[i];
        if (b.flagId !== flag.id) continue;
        if (b.hp > 0) {
            b.maxHp = flag.hpBase;
            if (b.hp > flag.hpBase) b.hp = flag.hpBase;
            b.flagPassivo = flag.comportamento !== 'agressivo';
            b.flagAgressivo = flag.comportamento === 'agressivo';
            vivos.push(b);
        }
    }
    while (vivos.length > flag.maxQtd) {
        let mob = vivos.pop();
        let idxS = slimes.indexOf(mob);
        if (idxS !== -1) slimes.splice(idxS, 1);
        let idxB = bosses.indexOf(mob);
        if (idxB !== -1) bosses.splice(idxB, 1);
    }
    preencherBandeira(flag); // se a quantidade aumentou, completa
}

function excluirBandeira(bandeira) {
    if (!spawnsAdmin) return;
    let idx = bandeirasSpawn.indexOf(bandeira);
    if (idx !== -1) bandeirasSpawn.splice(idx, 1);
    for (let i = slimes.length - 1; i >= 0; i--) {
        if (slimes[i].flagId === bandeira.id) slimes.splice(i, 1);
    }
    for (let i = bosses.length - 1; i >= 0; i--) {
        if (bosses[i].flagId === bandeira.id) bosses.splice(i, 1);
    }
    spawnsAdmin.salvarBandeiras(bandeirasSpawn);
    broadcastBandeiras();
}

function atualizarBandeirasSpawn() {
    if (!spawnsAdmin) return;
    if (!bandeirasInicializadas) {
        for (let flag of bandeirasSpawn) preencherBandeira(flag);
        bandeirasInicializadas = true;
        return;
    }
    for (let flag of bandeirasSpawn) {
        let vivos = 0;
        for (let s of slimes) if (s.flagId === flag.id && s.hp > 0) vivos++;
        for (let b of bosses) if (b.flagId === flag.id && b.hp > 0) vivos++;
        if (vivos >= flag.maxQtd) continue;
        if (flag.timerRespawn == null) flag.timerRespawn = 0;
        if (flag.timerRespawn > 0) {
            flag.timerRespawn--;
            continue;
        }
        flag.timerRespawn = Math.max(1, Math.round(flag.respawnSeg * 20));
        spawnMonstroBandeira(flag);
    }
}

// ============ EVENTO DE HORDA ALEATÓRIA (~20 monstros) ============
let proximoEventoHorda = Date.now() + 180000;

function verificarEventoHorda() {
    let agora = Date.now();
    if (agora < proximoEventoHorda) return;
    proximoEventoHorda = agora + (180000 + Math.floor(Math.random() * 120000)); // 3 a 5 min

    let pids = Object.keys(players);
    if (pids.length === 0) return;

    let candidatos = pids.map(id => players[id]).filter(p => {
        if (!p || p.hp <= 0) return false;
        if (p.x >= LARGURA_CIDADE) return false; // cidade é safe
        if (Math.hypot(p.x - 5000, p.y - 1200) < 400) return false; // safe zone verde
        return true;
    });

    if (candidatos.length === 0) return;

    let alvo = candidatos[Math.floor(Math.random() * candidatos.length)];
    let nomeBioma = 'Campo Verde';
    let mobTipo = 'melee';
    let hpBase = 70;

    if (alvo.x >= LARGURA_PANTANO) {
        nomeBioma = 'Caverna Sombria (DG)';
        mobTipo = 'morcego';
        hpBase = 180;
    } else if (alvo.x >= LARGURA_DESERTO) {
        nomeBioma = 'Pântano Lodoso';
        mobTipo = 'zumbi';
        hpBase = 450;
    } else if (alvo.x >= LARGURA_VERDE) {
        nomeBioma = 'Deserto das Areias';
        mobTipo = Math.random() < 0.5 ? 'besouro_negro' : 'zumbi';
        hpBase = (mobTipo === 'besouro_negro') ? 320 : 250;
    } else {
        mobTipo = Math.random() < 0.5 ? 'melee' : 'ranged';
        hpBase = 65;
    }

    console.log(`[EVENTO HORDA] Uma horda de 20 ${mobTipo} invadiu ${nomeBioma} próximo de ${alvo.nome || 'jogador'}!`);

    let msgAlerta = {
        type: 'alerta_horda',
        texto: `⚠️ HORDA! Um bando de 20 monstros atacou no ${nomeBioma}!`,
        bioma: nomeBioma,
        x: Math.round(alvo.x),
        y: Math.round(alvo.y)
    };
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(msgAlerta));
    });

    for (let i = 0; i < 20; i++) {
        let ang = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        let dist = 320 + Math.random() * 180;
        let sx = Math.max(20, Math.min(WORLD_WIDTH - 20, alvo.x + Math.cos(ang) * dist));
        let sy = Math.max(20, Math.min(WORLD_HEIGHT - 20, alvo.y + Math.sin(ang) * dist));
        if (estaNaAgua(sx, sy)) continue;

        let conf = (spawnsAdmin && spawnsAdmin.TIPOS_MONSTROS[mobTipo]) || { aggroRange: 380, attackRange: 55, dano: 14 };
        let mob = {
            id: 'horda_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
            tipo: mobTipo,
            x: sx,
            y: sy,
            hp: hpBase,
            maxHp: hpBase,
            targetId: alvo.id || null,
            respawnTimer: 0,
            attackCooldown: 0,
            stunTimer: 0,
            slowTimer: 0,
            dx: 0,
            dy: 0,
            patrolTimer: 0,
            tabelaDano: {},
            aggroRange: 550,
            attackRange: conf.attackRange || 55,
            dano: conf.dano || 14,
            flagPassivo: false,
            flagAgressivo: true,
            isHorda: true
        };
        slimes.push(mob);
    }
}

function validarDadosBandeira(data) {
    if (!data || !spawnsAdmin) return null;
    if (!data.tipo || !spawnsAdmin.TIPOS_MONSTROS[data.tipo]) return null;
    let maxQtd = Math.floor(Number(data.maxQtd));
    if (!isFinite(maxQtd) || maxQtd < 1 || maxQtd > 50) return null;
    let comportamento = data.comportamento === 'passivo' ? 'passivo' : 'agressivo';
    let hpBase = Math.floor(Number(data.hpBase));
    if (!isFinite(hpBase) || hpBase < 10 || hpBase > 200000) return null;
    let respawnSeg = Math.floor(Number(data.respawnSeg));
    if (!isFinite(respawnSeg) || respawnSeg < 1 || respawnSeg > 10) return null;
    // posição é obrigatória apenas na criação (na edição ela permanece inalterada)
    let x = Number(data.x), y = Number(data.y);
    let temPosicao = isFinite(x) && isFinite(y);
    if (temPosicao) {
        x = Math.max(12, Math.min(WORLD_WIDTH - 12, x));
        y = Math.max(12, Math.min(WORLD_HEIGHT - 12, y));
        if (estaNaAgua(x, y) || !podeAndar(x, y)) return null;
    } else {
        x = 0;
        y = 0;
    }
    return { tipo: data.tipo, maxQtd, comportamento, hpBase, respawnSeg, x, y, temPosicao };
}

function broadcastBandeiras() {
    if (!spawnsAdmin) return;
    let msg = JSON.stringify({ type: 'spawn_flags', bandeiras: bandeirasSpawn });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.ehAdminCliente) client.send(msg);
    });
}

function broadcastDanoLacaio(x, y, dano) {
    if (!dano || dano <= 0) return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_golem_ataque', x: Math.round(x), y: Math.round(y), dano: Math.round(dano) }));
        }
    });
}

// Número flutuante de dano REAL aplicado por JOGADOR (monstros/bosses). Pet já tem o seu.
function broadcastDanoFlut(x, y, dano, autorId) {
    if (!dano || dano <= 0) return;
    let msg = { type: 'texto_dano', x: Math.round(x), y: Math.round(y), dano: Math.round(dano), autorId: autorId || null };
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

function broadcastDanoNoOgro(x, y, dano) {
    if (!dano || dano <= 0) return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_lacaio_dano', x: Math.round(x), y: Math.round(y), dano: Math.round(dano) }));
        }
    });
}

function danoCausadoAoOgro(pid, dano, x, y) {
    let ogro = lacaios[pid];
    if (!ogro || !dano || dano <= 0) return;
    ogro.hp = Math.max(0, ogro.hp - dano);
    broadcastDanoNoOgro(x, y, dano);
    if (ogro.hp <= 0) {
        delete lacaios[pid];
        petRespawnTimer[pid] = 240;
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'action_lacaio_morreu', x: Math.round(x), y: Math.round(y), pid: pid }));
            }
        });
    }
}

function distribuirXpBoss(boss) {
    if (!boss.tabelaDano) return;
    let participantesIds = Object.keys(boss.tabelaDano);
    if (participantesIds.length === 0) return;

    let allBeneficiaries = new Set();
    participantesIds.forEach(pid => {
        allBeneficiaries.add(pid);
        let p = players[pid];
        if (p && p.partyId && parties[p.partyId]) {
            parties[p.partyId].forEach(memberId => {
                allBeneficiaries.add(memberId);
            });
        }
    });

    let beneficiariosArr = Array.from(allBeneficiaries);
    let xpBase = TIPOS_MONSTROS[boss.tipo].xpBase || 1500;
    let xpPorPessoa = Math.max(100, Math.floor(xpBase / beneficiariosArr.length));
    xpPorPessoa = Math.floor(xpPorPessoa * 1.2); 

    beneficiariosArr.forEach(pid => {
        let p = players[pid];
        let wsTarget = playerSockets[pid];
        if (p && wsTarget && wsTarget.readyState === WebSocket.OPEN) {
            p.xp += xpPorPessoa;
            let subiuLevel = false;
            let xpNecessario = tabelaXp[p.level] || 100;

            while (p.xp >= xpNecessario && p.level < 60) {
                p.xp -= xpNecessario;
                p.level++;
                if (p.pontosDisponiveis === undefined) p.pontosDisponiveis = 0;
                p.pontosDisponiveis += PONTOS_POR_LEVEL;
                p.pontosHabilidade = (p.pontosHabilidade || 0) + 1;
                p.mana = p.maxMp;
                subiuLevel = true;
                xpNecessario = tabelaXp[p.level] || 100;
            }

            salvarProgresso(p.nome, {
                level: p.level,
                xp: p.xp,
                classe: p.classe,
                hp: p.hp,
                x: Math.round(p.x),
                y: Math.round(p.y),
                atributos: p.atributos,
                pontosDisponiveis: p.pontosDisponiveis,
                skills: p.skills || {},
                pontosHabilidade: p.pontosHabilidade || 0
            });

            wsTarget.send(JSON.stringify({
                type: 'xp_ganho',
                quantidade: xpPorPessoa,
                level: p.level,
                xp: p.xp,
                pontos: (p.pontosDisponiveis || 0),
                pontosHabilidade: (p.pontosHabilidade || 0),
                subiuLevel: subiuLevel
            }));
        }
    });

    boss.tabelaDano = {};
}

function criarGolemPedra() {
    // Fica no centro da nova arena da caverna: x = 58000 + (36*40) = 59440, y = 22*40 = 880
    let pos = { x: 59440, y: 880 };

    bosses.push({
        id: 'golem_pedra',
        tipo: 'golem_pedra',
        nome: 'GOLEM DE PEDRA',
        x: pos.x,
        y: pos.y,
        angulo: 0,
        hp: 8000,
        maxHp: 8000,
        fase: 'idle',
        faseTick: 0,
        cooldown: 40,
        mortoTimer: 0,
        mortoAnunciado: false,
        alvoX: 0,
        alvoY: 0,
        alvoPosX: 0,
        alvoPosY: 0,
        pedraOrbita: 0,
        pedraX: pos.x,
        pedraY: pos.y - 30,
        tabelaDano: {},
        escudoTipo: null,
        escudoTimer: 0,
        proximoEscudo: 120,
        lastEscudo: 'azul',
        tauntId: null,
        tauntTimer: 0
    });
}

criarGolemPedra();

function dispararSkillZumbi(slime) {
    slime.skillCharging = false;
    slime.skillChargeTimer = slime.skillChargeMax || 20;
    slime.skillCooldown = 160;

    let alvo = players[slime.targetId] || lacaios[slime.targetId];
    if (slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) alvo = lacaios[slime.tauntId];
    let petAlvoZumbi = (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) ? slime.tauntId : null;
    let tx = (slime.skillAim && slime.skillAim.x != null) ? slime.skillAim.x : (alvo ? alvo.x : slime.x + 120);
    let ty = (slime.skillAim && slime.skillAim.y != null) ? slime.skillAim.y : (alvo ? alvo.y : slime.y);
    let dx = tx - slime.x;
    let dy = ty - slime.y;
    let dist = Math.hypot(dx, dy) || 1;
    let vel = Math.min(13, 4 + dist * 0.02);

    projeteis.push({
        x: slime.x,
        y: slime.y - 8,
        vx: (dx / dist) * vel,
        vy: (dy / dist) * vel,
        vida: 80,
        tipo: 'fedido',
        raio: 9,
        dano: 16,
        petAlvo: petAlvoZumbi,
        ownerMonstro: slime.id
    });
    slime.skillAim = null;
}

// ============ SPAWNS AUTOMÁTICOS REMOVIDOS (decisão de design) ============
// Nenhum monstro nasce automaticamente nos mapas. Os monstros passam a ser
// posicionados pelo jogador via bandeiras de spawn (sistema admin / spawns.js).

console.log("Servidor Rodando: Classe Bárbaro Sangrento Ativa!");

setInterval(() => {
    for (let pid in players) {
        let player = players[pid];

        if (player.furiaTimer > 0) {
            player.furiaTimer--;
        }

        if (player.estamina === undefined) player.estamina = 100;
        if (player.estamina < 100) player.estamina = Math.min(100, player.estamina + 0.75);

        if (player.classe === 'summoner' && player.hp > 0) {
            if (petRespawnTimer[pid] !== undefined) {
                petRespawnTimer[pid]--;
                if (petRespawnTimer[pid] <= 0) delete petRespawnTimer[pid];
            } else if (!lacaios[pid]) {
                let petHp = calcularVidaPet(player);
                lacaios[pid] = { 
                    x: player.x + 35, y: player.y + 35, hp: petHp, maxHp: petHp, 
                    attackCooldown: 0, angleOffset: Math.random() * Math.PI * 2, 
                    skillCooldown: 0, skill2Cooldown: 0,
                    isJumping: false, jumpStart: null, jumpTarget: null, jumpProgress: 0,
                    targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null,
                    rugidoTimer: 200, rugindoTimer: 0
                };
            }
            let ogro = lacaios[pid];
            if (!ogro) continue;
            if (ogro.skillCooldown > 0) ogro.skillCooldown--;
            if (ogro.skill2Cooldown > 0) ogro.skill2Cooldown--;
            if (ogro.modoAgressivoTimer > 0) ogro.modoAgressivoTimer--;

            // Regeneração lenta do golem (não morre sozinho aguentando o agro)
            if (ogro.hp < ogro.maxHp) ogro.hp = Math.min(ogro.maxHp, ogro.hp + 0.25);

            // ===== RUGIDO PASSIVO: a cada 10s, só com inimigo por perto (raio 300) =====
            if (ogro.rugidoTimer > 0) ogro.rugidoTimer--;
            if (ogro.rugidoTimer <= 0 && !ogro.isJumping) {
                let temInimigoPerto = false;
                for (let s of slimes) {
                    if (s.hp > 0 && !s.flagPassivo && Math.hypot(s.x - ogro.x, s.y - ogro.y) <= 300) { temInimigoPerto = true; break; }
                }
                if (!temInimigoPerto) {
                    for (let g of bosses) {
                        if (g.hp > 0 && !g.flagPassivo && Math.hypot(g.x - ogro.x, g.y - ogro.y) <= 300) { temInimigoPerto = true; break; }
                    }
                }
                if (!temInimigoPerto) {
                    // sem inimigo perto: não ruge, tenta de novo em 1s
                    ogro.rugidoTimer = 20;
                } else {
                    ogro.rugidoTimer = 200; // 10s
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_ogro_rugido', x: ogro.x, y: ogro.y }));
                        }
                    });
                    slimes.forEach(slime => {
                        if (slime.hp <= 0) return;
                        if (slime.flagPassivo) return; // passivos não são provocados
                        if (Math.hypot(slime.x - ogro.x, slime.y - ogro.y) > 300) return;
                        slime.tauntId = pid;
                        slime.tauntTimer = 80; // 4 segundos
                        slime.targetId = pid;
                    });
                    bosses.forEach(g => {
                        if (g.hp <= 0) return;
                        if (g.flagPassivo) return; // passivos não são provocados
                        if (Math.hypot(g.x - ogro.x, g.y - ogro.y) > 300) return;
                        g.tauntId = pid;
                        g.tauntTimer = 80; // 4 segundos
                    });
                }
            }

            if (ogro.isJumping) {
                ogro.jumpProgress += 0.05;
                if (ogro.jumpProgress >= 1.0) {
                    ogro.jumpProgress = 1.0;
                    ogro.isJumping = false;
                    ogro.x = ogro.jumpTarget.x;
                    ogro.y = ogro.jumpTarget.y;

                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - ogro.x, slime.y - ogro.y) < 70) {
                            let r = registrarDanoMonstro(slime, pid, dmgSkill(players[pid], 'salto', 35), 'pet');
                            broadcastDanoLacaio(slime.x, slime.y, r.dano);
                            slime.stunTimer = 10;
                        }
                    });
                    let db = danoEmBosses(ogro.x, ogro.y, 85, pid, dmgSkill(players[pid], 'salto', 35), 'skill', 'pet');
                    if (db) broadcastDanoLacaio(db.x, db.y, db.dano);

                    // Ao cair, o golem foca o inimigo mais próximo (slime OU boss)
                    let alvoAposSalto = null;
                    let menorDistApos = 340;
                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            let dd = Math.hypot(slime.x - ogro.x, slime.y - ogro.y);
                            if (dd < menorDistApos) { menorDistApos = dd; alvoAposSalto = { tipo: 'slime', id: slime.id }; }
                        }
                    });
                    for (let bb of bosses) {
                        if (bb.hp > 0) {
                            let dd = Math.hypot(bb.x - ogro.x, bb.y - ogro.y);
                            if (dd < menorDistApos) { menorDistApos = dd; alvoAposSalto = { tipo: 'boss', id: bb.id }; }
                        }
                    }
                    if (alvoAposSalto) ogro.focoAlvo = alvoAposSalto;
                } else {
                    ogro.x = ogro.jumpStart.x + (ogro.jumpTarget.x - ogro.jumpStart.x) * ogro.jumpProgress;
                    ogro.y = ogro.jumpStart.y + (ogro.jumpTarget.y - ogro.jumpStart.y) * ogro.jumpProgress;
                }
            } else {
                let slimeAlvo = null;
                let bossAlvo = null;

                // 1) o inimigo focado pelo summoner tem prioridade absoluta
                if (ogro.focoAlvo) {
                    if (ogro.focoAlvo.tipo === 'slime') {
                        let s = slimes.find(x => x.id === ogro.focoAlvo.id && x.hp > 0);
                        if (s) slimeAlvo = s; else ogro.focoAlvo = null;
                    } else if (ogro.focoAlvo.tipo === 'boss') {
                        let b = bosses.find(x => x.id === ogro.focoAlvo.id && x.hp > 0);
                        if (b) bossAlvo = b; else ogro.focoAlvo = null;
                    }
                }

                // 2) sem alvo focado: persegue quem mira o summoner / comando agressivo / boss próximo
                if (!slimeAlvo && !bossAlvo) {
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && slime.targetId === pid) slimeAlvo = slime;
                    });

                    if (!slimeAlvo && ogro.modoAgressivoTimer > 0 && ogro.targetSlimeId) {
                        let encontrado = slimes.find(s => s.id === ogro.targetSlimeId && s.hp > 0);
                        if (encontrado) slimeAlvo = encontrado;
                    }

                    if (!slimeAlvo && ogro.modoAgressivoTimer > 0) {
                        let menorBossDist = 440;
                        for (let bb of bosses) {
                            if (bb.hp > 0) {
                                let db = Math.hypot(bb.x - ogro.x, bb.y - ogro.y);
                                if (db < menorBossDist) { menorBossDist = db; bossAlvo = bb; }
                            }
                        }
                    } else if (!slimeAlvo) {
                        let menorBossDist = 300;
                        for (let bb of bosses) {
                            if (bb.hp > 0) {
                                let db = Math.hypot(bb.x - ogro.x, bb.y - ogro.y);
                                if (db < menorBossDist) { menorBossDist = db; bossAlvo = bb; }
                            }
                        }
                    }
                }

                // 3) se o alvo focado ficar longe do summoner, o lacaio retorna e desfoca
                if ((slimeAlvo || bossAlvo) && ogro.focoAlvo) {
                    let leash = Math.hypot(ogro.x - player.x, ogro.y - player.y);
                    if (leash > 560) {
                        ogro.focoAlvo = null;
                        slimeAlvo = null;
                        bossAlvo = null;
                    }
                }

                if (slimeAlvo) {
                    let dx = slimeAlvo.x - ogro.x;
                    let dy = slimeAlvo.y - ogro.y;
                    let dist = Math.hypot(dx, dy);

                    if (dist > 38) {
                        ogro.x += (dx / dist) * 4.16;
                        ogro.y += (dy / dist) * 4.16;
                    } else {
                        ogro.attackCooldown++;
                        if (ogro.attackCooldown > 40) {
                            let r = registrarDanoMonstro(slimeAlvo, pid, dmgSkill(players[pid], 'ogro', 15), 'pet');
                            broadcastDanoLacaio(slimeAlvo.x, slimeAlvo.y, r.dano);
                            let db = danoEmBosses(ogro.x, ogro.y, 95, pid, dmgSkill(players[pid], 'ogro', 15), 'basico', 'pet');
                            if (db) broadcastDanoLacaio(db.x, db.y, db.dano);
                            ogro.attackCooldown = 0;
                        }
                    }
                } else if (bossAlvo) {
                    let dxB = bossAlvo.x - ogro.x;
                    let dyB = bossAlvo.y - ogro.y;
                    let distB = Math.hypot(dxB, dyB);
                    if (distB > 42) {
                        ogro.x += (dxB / distB) * 4.16;
                        ogro.y += (dyB / distB) * 4.16;
                    } else {
                        ogro.attackCooldown++;
                        if (ogro.attackCooldown > 40) {
                            registrarDanoBoss(bossAlvo, pid, dmgSkill(players[pid], 'ogro', 15), 'basico');
                            ogro.attackCooldown = 0;
                        }
                    }
                } else {
                    ogro.angleOffset += 0.025;
                    let targetX = player.x + Math.cos(ogro.angleOffset) * 45;
                    let targetY = player.y + Math.sin(ogro.angleOffset) * 45;

                    let dx = targetX - ogro.x;
                    let dy = targetY - ogro.y;
                    let dist = Math.hypot(dx, dy);

                    if (dist > 6) {
                        let velocidadePet = player.moving ? 4.68 : 2.6; 
                        ogro.x += (dx / dist) * Math.min(dist, velocidadePet);
                        ogro.y += (dy / dist) * Math.min(dist, velocidadePet);
                    }
                }
            }
        } else {
            delete lacaios[pid];
            delete petRespawnTimer[pid];
        }
    }

    // ============ STUN DE JOGADOR (5s = 100 ticks): atordoado não se move ============
    for (let pid in players) {
        let pp = players[pid];
        if (pp.stunTimer > 0) {
            pp.stunTimer--;
            if (pp.stunTimer <= 0) {
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'action_stun_fim', id: pid }));
                    }
                });
            }
        }
    }

    // ============ ATUALIZAÇÃO DE EFEITOS (debuffs/buffs) ============
    if (efeitos) {
        let efeitosMudaram = {};
        for (let pid in players) {
            let p = players[pid];
            if (efeitos.atualizarEfeitos(p)) efeitosMudaram[pid] = true;
            // Sincroniza efeitos derivados (stun/lentidão já estão em efeitos via tick)
            // Inclui 'stun' se stunTimer > 0, 'lentidao' se slowTimer > 0 — para exibição na UI
            if (p.stunTimer > 0 && !efeitos.temEfeito(p, 'stun')) {
                efeitos.aplicarEfeito(p, 'stun', p.stunTimer, 1);
            }
        }
        if (Object.keys(efeitosMudaram).length > 0) {
            for (let pid in efeitosMudaram) {
                let p = players[pid];
                let wsTarget = playerSockets[pid];
                if (wsTarget && wsTarget.readyState === WebSocket.OPEN) {
                    wsTarget.send(JSON.stringify({ type: 'efeitos_sync', efeitos: efeitos.exporEfeitos(p) }));
                }
            }
        }
    }

    // ============ ÁGUA VENENOSA DO PÂNTANO (dano por 5s ao entrar) ============
    if (mapaPantano && typeof mapaPantano.ehVenenoPantano === 'function') {
        global.venenoTick = ((global.venenoTick || 0) + 1);
        for (let pid in players) {
            let p = players[pid];
            if (!p || p.hp <= 0) continue;
            if (sobVenenoPantano(p.x, p.y)) {
                if (!efeitos.temEfeito(p, 'veneno')) {
                    efeitos.aplicarEfeito(p, 'veneno', 100, 1);
                    let wsTarget = playerSockets[pid];
                    if (wsTarget && wsTarget.readyState === WebSocket.OPEN) {
                        wsTarget.send(JSON.stringify({ type: 'efeitos_sync', efeitos: efeitos.exporEfeitos(p) }));
                    }
                }
            }
            if (efeitos.temEfeito(p, 'veneno') && global.venenoTick % 10 === 0) {
                p.hp = Math.max(0, p.hp - 5);
            }
        }
    }

    // ============ REGEN DE MANA (a cada 0,5s; ~3% do máximo por tick) ============
    global.manaTick = ((global.manaTick || 0) + 1);
    if (global.manaTick % 10 === 0) {
        for (let pid in players) {
            let p = players[pid];
            if (p.mana === undefined) { p.mana = p.maxMp || 50; continue; }
            if (!p.maxMp) p.maxMp = calcularMaxMp(p);
            let regen = Math.max(1, Math.ceil(p.maxMp * 0.03));
            p.mana = Math.min(p.maxMp, p.mana + regen);
            let wsTarget = playerSockets[pid];
            if (wsTarget && wsTarget.readyState === WebSocket.OPEN) {
                wsTarget.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
            }
        }
    }

    for (let pid in bandas) {
        let banda = bandas[pid];
        let player = players[pid];
        if (!player || player.hp <= 0) { delete bandas[pid]; continue; }

        for (let i = banda.membros.length - 1; i >= 0; i--) {
            let m = banda.membros[i];
            m.angulo += 0.2;

            let slimeAlvo = null;
            let menorDist = 160;
            slimes.forEach(slime => {
                if (slime.hp > 0) {
                    let dist = Math.hypot(slime.x - m.x, slime.y - m.y);
                    if (dist < menorDist) { menorDist = dist; slimeAlvo = slime; }
                }
            });

            let bossAlvo = null;
            if (!slimeAlvo) {
                let menorBossDist = 220;
                for (let bb of bosses) {
                    if (bb.hp > 0) {
                        let db = Math.hypot(bb.x - m.x, bb.y - m.y);
                        if (db < menorBossDist) { menorBossDist = db; bossAlvo = bb; }
                    }
                }
            }

            if (slimeAlvo) {
                let dx = slimeAlvo.x - m.x;
                let dy = slimeAlvo.y - m.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 30) {
                    m.x += (dx / dist) * 2.2;
                    m.y += (dy / dist) * 2.2;
                } else {
                    m.attackCooldown++;
                    if (m.attackCooldown > 40) {
                        registrarDanoMonstro(slimeAlvo, pid, dmgSkill(players[pid], 'banda', 10), 'pet');
                        danoEmBosses(m.x, m.y, 45, pid, dmgSkill(players[pid], 'banda', 10), 'basico', 'pet');
                        m.attackCooldown = 0;
                    }
                }
            } else if (bossAlvo) {
                let dxB = bossAlvo.x - m.x;
                let dyB = bossAlvo.y - m.y;
                let distB = Math.hypot(dxB, dyB);
                if (distB > 34) {
                    m.x += (dxB / distB) * 2.2;
                    m.y += (dyB / distB) * 2.2;
                } else {
                    m.attackCooldown++;
                    if (m.attackCooldown > 40) {
                        registrarDanoBoss(bossAlvo, pid, dmgSkill(players[pid], 'banda', 10), 'basico');
                        m.attackCooldown = 0;
                    }
                }
            } else {
                let dx = player.x - m.x;
                let dy = player.y - m.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 28) {
                    m.x += (dx / dist) * Math.min(dist, 3.2);
                    m.y += (dy / dist) * Math.min(dist, 3.2);
                }
            }
        }
    }

    for (let i = blizzards.length - 1; i >= 0; i--) {
        let b = blizzards[i];
        b.duracao--;
        slimes.forEach(slime => {
            if (slime.hp > 0 && Math.hypot(slime.x - b.x, slime.y - b.y) < b.radius) {
                slime.slowTimer = 15;
                if (b.duracao % 20 === 0) {
                    registrarDanoMonstro(slime, b.ownerId, b.danoNevasca || 6);
                }
            }
        });
        if (b.duracao % 20 === 0) danoEmBosses(b.x, b.y, b.radius, b.ownerId, b.danoNevasca || 6, 'skill');
        if (b.duracao <= 0) blizzards.splice(i, 1);
    }

    for (let i = chuvasServidor.length - 1; i >= 0; i--) {
        let ch = chuvasServidor[i];
        ch.duracao--;
        slimes.forEach(slime => {
            if (slime.hp > 0 && Math.hypot(slime.x - ch.x, slime.y - ch.y) < 65) {
                slime.slowTimer = 15;
                if (ch.duracao % 20 === 0) {
                    registrarDanoMonstro(slime, ch.ownerId, ch.danoChuva || 8);
                }
            }
        });
        if (ch.duracao % 20 === 0) danoEmBosses(ch.x, ch.y, 70, ch.ownerId, ch.danoChuva || 8, 'skill');
        if (ch.duracao <= 0) chuvasServidor.splice(i, 1);
    }

    for (let i = projeteis.length - 1; i >= 0; i--) {
        let p = projeteis[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vida--;

        let projectileRemoved = false;
        if (mapaDeserto && xNoDeserto(p.x) && mapaDeserto.colideProjetilDeserto(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaPantano && p.x >= LARGURA_DESERTO && mapaPantano.colideProjetilPantano(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaCaverna && p.x >= LARGURA_CAVERNA && mapaCaverna.colideProjetilCaverna(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaCidade && p.x >= LARGURA_CIDADE && mapaCidade.colideProjetilCidade(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && p.petAlvo && lacaios[p.petAlvo]) {
            let ogroAlvo = lacaios[p.petAlvo];
            let raioHitOgro = (p.raio || 5) + 24;
            if (Math.hypot(ogroAlvo.x - p.x, ogroAlvo.y - p.y) < raioHitOgro) {
                danoCausadoAoOgro(p.petAlvo, p.dano || 10, ogroAlvo.x, ogroAlvo.y);
                projeteis.splice(i, 1);
                projectileRemoved = true;
            }
        }
        if (!projectileRemoved) for (let pid in players) {
            let player = players[pid];
            let raioHit = (p.raio || 5) + 15;
            if (player.hp > 0 && Math.hypot(player.x + 12 - p.x, player.y + 16 - p.y) < raioHit) {
                aplicarDanoJogador(pid, p.x, p.y, p.dano || 10);
                projeteis.splice(i, 1);
                projectileRemoved = true;
                break;
            }
        }
        if (!projectileRemoved && p && p.vida <= 0) projeteis.splice(i, 1);
    }

    for (let i = playerProjeteis.length - 1; i >= 0; i--) {
        let pp = playerProjeteis[i];
        pp.x += pp.vx;
        pp.y += pp.vy;
        pp.vida--;

        let removido = false;
        if (mapaDeserto && xNoDeserto(pp.x) && mapaDeserto.colideProjetilDeserto(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaPantano && pp.x >= LARGURA_DESERTO && mapaPantano.colideProjetilPantano(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaCaverna && pp.x >= LARGURA_CAVERNA && mapaCaverna.colideProjetilCaverna(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaCidade && pp.x >= LARGURA_CIDADE && mapaCidade.colideProjetilCidade(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido) for (let s of slimes) {
            if (s.hp > 0 && Math.hypot(s.x - pp.x, s.y - pp.y) < 30) {
                registrarDanoMonstro(s, pp.ownerId, pp.dano);
                if (!pp.perfurante) {
                    playerProjeteis.splice(i, 1);
                    removido = true;
                    break;
                }
            }
        }
        if (!removido) {
            for (let bb of bosses) {
                if (bb.hp > 0 && Math.hypot(bb.x - pp.x, bb.y - pp.y) < 82) {
                    registrarDanoBoss(bb, pp.ownerId, pp.dano, pp.origemBasica ? 'basico' : 'skill');
                    if (!pp.perfurante) {
                        playerProjeteis.splice(i, 1);
                        removido = true;
                        break;
                    }
                }
            }
        }
        if (!removido) {
            let p1 = players[pp.ownerId];
            if (p1 && p1.pvpAtivo) {
                for (let pd in players) {
                    if (pd === pp.ownerId) continue;
                    let p2 = players[pd];
                    if (p2.pvpAtivo && p2.hp > 0 && Math.hypot(p2.x - pp.x, p2.y - pp.y) < 30) {
                        aplicarDanoPvP(pp.ownerId, pd, pp.dano, 'projétil');
                        if (!pp.perfurante) {
                            playerProjeteis.splice(i, 1);
                            removido = true;
                            break;
                        }
                    }
                }
            }
        }
        if (!removido && pp.vida <= 0) playerProjeteis.splice(i, 1);
    }

    for (let pid in players) {
        let player = players[pid];
        if (player.isDashing && player.dashTarget) {
            let dx = player.dashTarget.x - (player.x + 12);
            let dy = player.dashTarget.y - (player.y + 16);
            let dist = Math.hypot(dx, dy);

            if (dist > 30 && player.dashFrames > 0) {
                player.x += (dx / dist) * 18;
                player.y += (dy / dist) * 18;
                player.dashFrames--;
            } else {
                slimes.forEach(slime => {
                    if (slime.hp > 0 && Math.hypot((player.x + 12) - slime.x, (player.y + 16) - slime.y) < 55) {
                        registrarDanoMonstro(slime, pid, dmgSkill(players[pid], 'dash', 20));
                        slime.stunTimer = 40;
                    }
                });
                danoEmBosses(player.x + 12, player.y + 16, 95, pid, dmgSkill(players[pid], 'dash', 20), 'skill');
                player.isDashing = false;
                player.dashTarget = null;
            }
        }
    }

    slimes.forEach(slime => {
        if (slime.hp <= 0) {
            // Se for monstro de horda aleatória, não respawna (remove após a morte)
            if (slime.isHorda) {
                let idx = slimes.indexOf(slime);
                if (idx !== -1) slimes.splice(idx, 1);
                return;
            }
            // Monstros de bandeira: respawn é gerenciado pelo sistema de bandeiras
            if (slime.flagId) { slime.respawnTimer = 0; return; }
            slime.respawnTimer++;
            if (slime.respawnTimer > (slime.respawnTick || 100)) {
                let novaPos = (slime.tipo === "besouro_negro") ? gerarPosicaoDeserto() :
                (slime.tipo === "morcego") ? gerarPosicaoCaverna() : gerarPosicaoValida();
                slime.hp = slime.maxHp;
                slime.x = novaPos.x;
                slime.y = novaPos.y;
                slime.targetId = null;
                slime.stunTimer = 0;
                slime.slowTimer = 0;
                slime.respawnTimer = 0;
                slime.tabelaDano = {};
                slime.skillCharging = false;
                slime.skillChargeTimer = 0;
                slime.skillCooldown = (slime.tipo === "besouro_negro") ? Math.floor(180 + Math.random() * 120) : Math.floor(40 + Math.random() * 90);
                slime.skillAim = null;
                slime.tauntTimer = 0;
                slime.tauntId = null;
                if (slime.tipo === "besouro_negro") {
                    slime.dashing = false;
                    slime.dashVx = 0;
                    slime.dashVy = 0;
                    slime.dashFrames = 0;
                }
            }
            return;
        }

        if (slime.stunTimer > 0) {
            slime.stunTimer--;
            return;
        }

        if (slime.tauntTimer > 0) {
            slime.tauntTimer--;
            if (slime.tauntTimer <= 0) { slime.tauntId = null; slime.targetId = null; }
        }

        let fatorLentidao = 1.0;
        if (slime.slowTimer > 0) {
            slime.slowTimer--;
            fatorLentidao = 0.5;
        }

        let permiteAgroProximidade = !slime.flagPassivo && (slime.flagAgressivo || slime.tipo === "zumbi");
        if (!slime.flagPassivo && slime.tauntTimer > 0 && lacaios[slime.tauntId]) {
            slime.targetId = slime.tauntId;
        } else if (permiteAgroProximidade && !slime.targetId) {
            let menorDist = slime.aggroRange || 320;
            let alvoProximo = null;
            for (let pid in players) {
                let p = players[pid];
                if (p.hp <= 0) continue;
                let d = Math.hypot(p.x - slime.x, p.y - slime.y);
                if (d < menorDist) { menorDist = d; alvoProximo = pid; }
            }
            if (alvoProximo) slime.targetId = alvoProximo;
        }

        if (slime.targetId && (players[slime.targetId] || lacaios[slime.targetId])) {
let alvo = players[slime.targetId] || lacaios[slime.targetId];
    if (slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) alvo = lacaios[slime.tauntId];
            // Durante o RUGIDO, o alvo real vira o GOLEM (lacaio) do summoner
            if (slime.tauntTimer > 0 && lacaios[slime.tauntId]) alvo = lacaios[slime.tauntId];
            let dx = alvo.x - slime.x;
            let dy = alvo.y - slime.y;
            let dist = Math.hypot(dx, dy);

            if (slime.tipo === "melee") {
                if (dist > 55) {
                    let velSlime = 3.2 * fatorLentidao;
                    let proximoX = slime.x + (dx / dist) * velSlime;
                    let proximoY = slime.y + (dy / dist) * velSlime;
                    if (podeAndar(proximoX, proximoY)) {
                        slime.x = proximoX;
                        slime.y = proximoY;
                    }
                } else {
                    slime.attackCooldown++;
                    if (slime.attackCooldown > 45) {
                        if (alvo === players[slime.targetId]) {
                            aplicarDanoJogador(slime.targetId, slime.x, slime.y, 12);
                        } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                            danoCausadoAoOgro(slime.tauntId, 12, alvo.x, alvo.y);
                        } else if (alvo) {
                            alvo.hp -= 12;
                            if (alvo.hp < 0) alvo.hp = 0;
                        }
                        slime.attackCooldown = 0;
                    }
                }
            } else if (slime.tipo === "ranged") {
                if (dist > 220) {
                    let velArqueiro = 1.04 * fatorLentidao;
                    let proximoX = slime.x + (dx / dist) * velArqueiro;
                    let proximoY = slime.y + (dy / dist) * velArqueiro;
                    if (podeAndar(proximoX, proximoY)) {
                        slime.x = proximoX;
                        slime.y = proximoY;
                    }
                } else if (dist < 150) {
                    slime.x -= (dx / dist) * (0.65 * fatorLentidao);
                    slime.y -= (dy / dist) * (0.65 * fatorLentidao);
                }

                slime.attackCooldown++;
                if (slime.attackCooldown > 60) {
                    let ang = Math.atan2(dy, dx);
                    projeteis.push({
                        x: slime.x,
                        y: slime.y,
                        vx: Math.cos(ang) * 10.125,
                        vy: Math.sin(ang) * 10.125,
                        vida: 70,
                        petAlvo: (slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) ? slime.tauntId : null
                    });
                    slime.attackCooldown = 0;
                }
            } else if (slime.tipo === "zumbi") {
                // SKILL: altinha para por 1s carregando, depois cuspirada tóxica
                if (slime.skillCharging) {
                    slime.skillChargeTimer--;
                    if (slime.skillChargeTimer <= 0) dispararSkillZumbi(slime);
                } else {
                    if (slime.skillCooldown > 0) slime.skillCooldown--;
                    if (slime.skillCooldown <= 0 && dist < 460 && slime.hp > 0) {
                        slime.skillCharging = true;
                        slime.skillChargeTimer = slime.skillChargeMax || 20;
                        slime.skillAim = { x: alvo.x, y: alvo.y };
                    }
                    let alcanceAtaque = slime.attackRange || 50;
                    if (dist > alcanceAtaque) {
                        let velZumbi = (slime.velocidade || 2.04) * fatorLentidao;
                        let proximoX = slime.x + (dx / dist) * velZumbi;
                        let proximoY = slime.y + (dy / dist) * velZumbi;
                        if (podeAndar(proximoX, proximoY)) {
                            slime.x = proximoX;
                            slime.y = proximoY;
                        }
                    } else {
                        slime.attackCooldown++;
                        if (slime.attackCooldown > 50) {
                            if (players[slime.targetId] && alvo === players[slime.targetId]) {
                                aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 18);
                            } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                                danoCausadoAoOgro(slime.tauntId, slime.dano || 18, alvo.x, alvo.y);
                            } else if (alvo) {
                                alvo.hp -= (slime.dano || 18);
                                if (alvo.hp < 0) alvo.hp = 0;
                            }
                            slime.attackCooldown = 0;
                        }
                    }
                }
            } else if (slime.tipo === "besouro_negro") {
                // ============ BESOURO NEGRO (vive apenas no deserto) ============
                slime.x = Math.max(LARGURA_VERDE, Math.min(LARGURA_DESERTO - 10, slime.x));
                slime.y = Math.max(0, Math.min(ALTO_DESERTO - 10, slime.y));

                if (slime.dashing) {
                    // ===== VOO DA SKILL: em linha reta até o jogador; colidiu = STUN 5s =====
                    slime.x += slime.dashVx;
                    slime.y += slime.dashVy;
                    slime.dashFrames--;
                    if (slime.x < LARGURA_VERDE) { slime.x = LARGURA_VERDE; slime.dashVx = Math.abs(slime.dashVx); }
                    if (slime.x >= LARGURA_DESERTO - 10) { slime.x = LARGURA_DESERTO - 10; slime.dashVx = -Math.abs(slime.dashVx); }
                    if (slime.y < 0) { slime.y = 0; slime.dashVy = Math.abs(slime.dashVy); }
                    if (slime.y >= ALTO_DESERTO - 10) { slime.y = ALTO_DESERTO - 10; slime.dashVy = -Math.abs(slime.dashVy); }

                    let atingiu = false;
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.hp <= 0) continue;
                        if (Math.hypot((p.x + 12) - slime.x, (p.y + 16) - slime.y) < 40) {
                            if (p.stunTimer <= 0) {
                                p.stunTimer = slime.stunOnHit || 100;
                                p.isDashing = false;
                                p.dashTarget = null;
                                broadcastBesouroImpacto(pid, slime.x, slime.y);
                            } else {
                                aplicarDanoJogador(pid, slime.x, slime.y, 18);
                                broadcastBesouroImpacto(pid, slime.x, slime.y);
                            }
                            atingiu = true;
                            break;
                        }
                    }
                    if (!atingiu && slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) {
                        let ogroAlvo = lacaios[slime.tauntId];
                        if (ogroAlvo.hp > 0 && Math.hypot(ogroAlvo.x - slime.x, ogroAlvo.y - slime.y) < 40) {
                            danoCausadoAoOgro(slime.tauntId, 18, ogroAlvo.x, ogroAlvo.y);
                            atingiu = true;
                        }
                    }
                    if (atingiu || slime.dashFrames <= 0) {
                        slime.dashing = false;
                        slime.dashVx = 0;
                        slime.dashVy = 0;
                        slime.skillCooldown = 220;
                    }
                } else if (slime.skillCharging) {
                    // ===== CARREGANDO A SKILL (barra acima + efeitos) =====
                    slime.skillChargeTimer--;
                    if (slime.skillChargeTimer <= 0) {
                        slime.skillCharging = false;
                        slime.skillAim = null;
                        let alvoDash = players[slime.targetId];
                        if (!alvoDash && slime.tauntTimer > 0 && lacaios[slime.tauntId]) alvoDash = lacaios[slime.tauntId];
                        if (alvoDash && alvoDash.hp > 0) {
                            let ang = Math.atan2(alvoDash.y - slime.y, alvoDash.x - slime.x);
                            const velVoo = 18; // 'extremamente rápido' (360px/s)
                            slime.dashing = true;
                            slime.dashVx = Math.cos(ang) * velVoo;
                            slime.dashVy = Math.sin(ang) * velVoo;
                            slime.dashFrames = Math.min(45, Math.max(18, Math.round(Math.hypot(alvoDash.x - slime.x, alvoDash.y - slime.y) / velVoo) + 6));
                            broadcastBesouroDecolagem(slime.id, slime.x, slime.y, ang);
                        } else {
                            slime.skillCooldown = Math.floor(120 + Math.random() * 80);
                        }
                    }
                } else {
                    // ===== ATK BÁSICO: ranged com projéteis 4x MAIS RÁPIDOS =====
                    if (slime.skillCooldown > 0) slime.skillCooldown--;

                    if (dist > 320) {
                        let velBesouro = (slime.velocidade || 1.7) * fatorLentidao;
                        let proximoX = slime.x + (dx / dist) * velBesouro;
                        let proximoY = slime.y + (dy / dist) * velBesouro;
                        if (podeAndar(proximoX, proximoY)) {
                            slime.x = proximoX;
                            slime.y = proximoY;
                        }
                    } else if (dist < 150) {
                        slime.x -= (dx / dist) * (0.6 * fatorLentidao);
                        slime.y -= (dy / dist) * (0.6 * fatorLentidao);
                    }

                    slime.attackCooldown++;
                    if (slime.attackCooldown > 20) {
                        let ang = Math.atan2(dy, dx);
                        projeteis.push({
                            x: slime.x,
                            y: slime.y,
                            vx: Math.cos(ang) * 40.5, // 4x a velocidade padrão (10.125)
                            vy: Math.sin(ang) * 40.5,
                            vida: 90,
                            dano: slime.dano || 14,
                            tipo: 'besouro',
                            raio: 7,
                            petAlvo: (slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) ? slime.tauntId : null
                        });
                        slime.attackCooldown = 0;
                    }

                    // Inicia a skill: trava no chão por 1.2s carregando e depois voa
                    if (slime.skillCooldown <= 0 && dist < 620 && dist > 100) {
                        slime.skillCharging = true;
                        slime.skillChargeTimer = slime.skillChargeMax || 24;
                        slime.skillAim = { x: alvo.x, y: alvo.y };
                    }
                }
            } else if (slime.tipo === "morcego") {
                // ============ MORCEGO (voador da caverna) ============
                slime.x = Math.max(LARGURA_CAVERNA, Math.min(FIM_CAVERNA - 10, slime.x));
                slime.y = Math.max(0, Math.min(ALTO_CAVERNA - 10, slime.y));

                if (slime.ziguezague === undefined) slime.ziguezague = 0;

                // Chirp sonoro/visual a cada ~8s (efeito de susto)
                slime.attackCooldown++;
                if (slime.attackCooldown > 160) {
                    slime.attackCooldown = 0;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_morcego_chirp', id: slime.id, x: slime.x, y: slime.y }));
                        }
                    });
                }

                if (dist > (slime.attackRange || 45)) {
                    // Persegue com ziguezague (movimento sinuoso de voador)
                    let velBat = (slime.velocidade || 2.3) * fatorLentidao;
                    let ang = Math.atan2(dy, dx);
                    slime.ziguezague++;
                    let desvio = Math.sin(slime.ziguezague * 0.45) * 0.9;
                    let proximoX = slime.x + Math.cos(ang + desvio * 0.4) * velBat;
                    let proximoY = slime.y + Math.sin(ang + desvio * 0.4) * velBat;
                    if (podeAndar(proximoX, proximoY)) {
                        slime.x = proximoX;
                        slime.y = proximoY;
                    } else {
                        slime.x += (dx / dist) * velBat;
                        slime.y += (dy / dist) * velBat;
                    }
                } else {
                    // Ataque corpo-a-corpo (mordida)
                    slime.attackCooldown++;
                    if (slime.attackCooldown > 35) {
                        slime.attackCooldown = 0;
                        if (players[slime.targetId] && alvo === players[slime.targetId]) {
                            aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 16);
                        } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                            danoCausadoAoOgro(slime.tauntId, slime.dano || 16, alvo.x, alvo.y);
                        } else if (alvo) {
                            alvo.hp -= (slime.dano || 16);
                            if (alvo.hp < 0) alvo.hp = 0;
                        }
                    }
                }
            }

            let distanciaDesiste = (slime.tipo === "zumbi" || slime.tipo === "besouro_negro" || slime.tipo === "morcego") ? 700 : 450;
            if (alvo.hp <= 0 || dist > distanciaDesiste) slime.targetId = null;
        } else {
            slime.patrolTimer++;
            if (slime.patrolTimer > 120) {
                let fatorVel = (slime.tipo === "melee" ? 0.84 : 0.65) * fatorLentidao;
                slime.dx = (Math.random() - 0.5) * fatorVel;
                slime.dy = (Math.random() - 0.5) * fatorVel;
                slime.patrolTimer = 0;
            }

            let proximoX = slime.x + slime.dx * fatorLentidao;
            let proximoY = slime.y + slime.dy * fatorLentidao;

            if (podeAndar(proximoX, proximoY)) {
                slime.x = proximoX;
                slime.y = proximoY;
            } else {
                slime.dx *= -1;
                slime.dy *= -1;
            }

            if (slime.tipo === "besouro_negro") {
                slime.x = Math.max(LARGURA_VERDE, Math.min(LARGURA_DESERTO - 10, slime.x));
                slime.y = Math.max(0, Math.min(ALTO_DESERTO - 10, slime.y));
            }
        }
    });

    // ROQUEIRO: canal de bateria (5s = 250 ticks; batida a cada 10 ticks = 500ms; cancela se mover/morrer)
    for (let pid in bateriaCanal) {
        let canal = bateriaCanal[pid];
        let player = players[pid];

        let cancelar = false;
        if (!player || player.hp <= 0) {
            cancelar = true;
        } else if (Math.abs(player.x - canal.startX) > 1 || Math.abs(player.y - canal.startY) > 1) {
            cancelar = true;
        }

        if (cancelar || canal.timer <= 0) {
            delete bateriaCanal[pid];
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_roqueiro_bateria_end', id: pid }));
                }
            });
            continue;
        }

        canal.timer--;
        canal.beat++;
        if (canal.beat < 10) continue;

        canal.beat = 0;
        let pX = player.x + 12;
        let pY = player.y + 16;

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'action_roqueiro_bateria', x: pX, y: pY }));
            }
        });

        slimes.forEach(slime => {
            if (slime.hp > 0 && Math.hypot(slime.x - pX, slime.y - pY) < 110) {
                registrarDanoMonstro(slime, pid, dmgSkill(players[pid], 'bateria', 30));
                slime.stunTimer = 25;
            }
        });
        danoEmBosses(pX, pY, 115, pid, dmgSkill(players[pid], 'bateria', 30), 'skill');
    }

    // ============ BOSS: SIMULAÇÃO GOLEM DE PEDRA ============
    for (let i = bosses.length - 1; i >= 0; i--) {
        let g = bosses[i];

if (g.hp <= 0) {
                g.mortoTimer++;
                if (!g.mortoAnunciado) {
                    g.mortoAnunciado = true;
                    distribuirXpBoss(g);
                    gerarDropNoChao(g.x, g.y, g.tabelaDano, g.maxHp || 0, true);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'boss_golem_morte', x: g.x, y: g.y }));
                        }
                    });
                }
                // Boss de bandeira: o respawn é gerenciado pelo sistema de bandeiras (na posição da bandeira)
                if (g.flagId) {
                    g.mortoTimer = 0;
                    continue;
                }
                if (g.mortoTimer > 200) {
                let pos = { x: 59400, y: 900 };
                g.x = pos.x;
                g.y = pos.y;
                g.hp = g.maxHp;
                g.tabelaDano = {};
                g.fase = 'idle';
                g.faseTick = 0;
                g.cooldown = 80;
                g.mortoTimer = 0;
                g.mortoAnunciado = false;
                g.pedraOrbita = 0;
                g.pedraX = g.x;
                g.pedraY = g.y - 30;
                g.escudoTipo = null;
                g.escudoTimer = 0;
                g.proximoEscudo = 120;
                g.lastEscudo = 'azul';
                g.tauntId = null;
                g.tauntTimer = 0;
            }
            continue;
        }

        // Taunt (rugido): boss foca o summoner durante 4s
        if (g.tauntTimer > 0) g.tauntTimer--;

        // Escolhe o jogador vivo mais próximo (alcance de visão do golem)
        let melhorJogador = null;
        if (!g.flagPassivo) {
            let menorDist = 520;
            for (let pid in players) {
                let p = players[pid];
                if (p.hp <= 0) continue;
                let d = Math.hypot((p.x + 12) - g.x, (p.y + 16) - g.y);
                if (d < menorDist) {
                    menorDist = d;
                    melhorJogador = pid;
                }
            }
            if (g.tauntTimer > 0 && g.tauntId && players[g.tauntId] && players[g.tauntId].hp > 0) melhorJogador = g.tauntId;
        }

        // Enrage: quanto mais HP perdido, mais dano e mais velocidade
        let ratioHp = g.hp / g.maxHp;
        let fatorVel = 1 + (1 - ratioHp) * 1.8; // até 2.8x de velocidade
        let danoAtual = Math.round(45 + (1 - ratioHp) * 50); // até 95 de dano

        // ===== CICLO DE ESCUDO DE ESPINHOS =====
        if (g.escudoTipo) {
            g.escudoTimer++;
            if (g.escudoTimer >= 200) { // 10 segundos com o escudo
                g.escudoTipo = null;
                g.escudoTimer = 0;
                g.proximoEscudo = 90;
            }
        } else if (g.proximoEscudo > 0) {
            g.proximoEscudo--;
        } else {
            g.escudoTipo = (g.lastEscudo === 'vermelho') ? 'azul' : 'vermelho';
            g.lastEscudo = g.escudoTipo;
            g.escudoTimer = 0;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'boss_golem_escudo', x: g.x, y: g.y, tipo: g.escudoTipo }));
                }
            });
        }

        // Vira lentamente para o alvo
        if (melhorJogador) {
            let p = players[melhorJogador];
            let alvoAng = Math.atan2((p.y + 16) - g.y, (p.x + 12) - g.x);
            g.angulo += Math.atan2(Math.sin(alvoAng - g.angulo), Math.cos(alvoAng - g.angulo)) * 0.12;
        }

        switch (g.fase) {
            case 'idle': {
                g.pedraOrbita += 0.018 * fatorVel;
                g.pedraX = g.x + Math.cos(g.pedraOrbita) * 58;
                g.pedraY = g.y - 32 + Math.sin(g.pedraOrbita) * 46;
                g.cooldown--;
                if (g.cooldown <= 0 && melhorJogador) {
                    let p = players[melhorJogador];
                    g.alvoX = p.x + 12;
                    g.alvoY = p.y + 16;
                    g.alvoPosX = g.pedraX;
                    g.alvoPosY = g.pedraY;
                    g.durFase = Math.max(4, Math.round(14 / fatorVel));
                    g.fase = 'levantar';
                    g.faseTick = 0;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'boss_golem_levantar', x: g.x, y: g.y }));
                        }
                    });
                }
                break;
            }
            case 'levantar': {
                g.faseTick++;
                let prog = Math.min(1, g.faseTick / g.durFase);
                let suave = 1 - Math.pow(1 - prog, 3);
                g.pedraX = g.alvoPosX + (g.x - g.alvoPosX) * suave;
                g.pedraY = g.alvoPosY + ((g.y - 108) - g.alvoPosY) * suave;
                if (g.faseTick >= g.durFase) {
                    g.durFase = Math.max(5, Math.round(18 / fatorVel));
                    g.fase = 'marcar';
                    g.faseTick = 0;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'boss_golem_marca', x: g.alvoX, y: g.alvoY }));
                        }
                    });
                }
                break;
            }
            case 'marcar': {
                g.faseTick++;
                g.pedraX = g.x + Math.sin(g.faseTick * 0.7) * 2;
                g.pedraY = g.y - 108 + Math.sin(g.faseTick * 0.9) * 4;
                if (g.faseTick >= g.durFase) {
                    g.durFase = Math.max(3, Math.round(8 / fatorVel));
                    g.fase = 'lancar';
                    g.faseTick = 0;
                }
                break;
            }
            case 'lancar': {
                g.faseTick++;
                let prog = Math.min(1, g.faseTick / g.durFase);
                let suave = prog * prog;
                g.pedraX = g.x + (g.alvoX - g.x) * suave;
                g.pedraY = (g.y - 108) + (g.alvoY - (g.y - 108)) * suave;
                if (g.faseTick >= g.durFase) {
                    g.durFase = Math.max(5, Math.round(18 / fatorVel));
                    g.fase = 'retorno';
                    g.faseTick = 0;
                    g.alvoPosX = g.x + Math.cos(g.pedraOrbita) * 58;
                    g.alvoPosY = g.y - 32 + Math.sin(g.pedraOrbita) * 46;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'boss_golem_impacto', x: g.alvoX, y: g.alvoY }));
                        }
                    });
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.hp > 0 && Math.hypot((p.x + 12) - g.alvoX, (p.y + 16) - g.alvoY) < 90) {
                            aplicarDanoJogador(pid, g.alvoX, g.alvoY, danoAtual);
                        }
                    }
                }
                break;
            }
            case 'retorno': {
                g.faseTick++;
                let prog = Math.min(1, g.faseTick / g.durFase);
                let suave = 1 - Math.pow(1 - prog, 3);
                g.pedraX = g.alvoX + (g.alvoPosX - g.alvoX) * suave;
                g.pedraY = g.alvoY + (g.alvoPosY - g.alvoY) * suave;
                if (g.faseTick >= g.durFase) {
                    g.fase = 'idle';
                    g.faseTick = 0;
                    g.cooldown = Math.max(8, Math.round(30 / fatorVel));
                    g.pedraOrbita += 0.018 * fatorVel;
                }
                break;
            }
        }
    }

    // Sistema de bandeiras: garante os spawns/respawns sincronizados
    atualizarBandeirasSpawn();
    verificarEventoHorda();

    // Expira drops antigos (tempo de vida no chão)
    if (equipamentos && dropsChao.length) {
        let vidaDrop = equipamentos.BALANCE.tempoVidaDropMs || 150000;
        let agoraDrop = Date.now();
        for (let i = dropsChao.length - 1; i >= 0; i--) {
            if (agoraDrop - dropsChao[i].criadoEm > vidaDrop) dropsChao.splice(i, 1);
        }
    }

    // Players visíveis: sem inventário privado (sincronizado só com o dono)
    // e com atributosTotais (base + bônus de equipamento) para o cliente exibir
    let playersVisivel = {};
    for (let pid in players) {
        let p = players[pid];
        playersVisivel[pid] = Object.assign({}, p);
        delete playersVisivel[pid].inventario;
        playersVisivel[pid].atributosTotais = atributosTotais(p);
        playersVisivel[pid].efeitos = (efeitos ? efeitos.exporEfeitos(p) : []);
    }

    let estadoMundo = {
        type: 'world_update',
        players: playersVisivel,
        slimes: slimes,
        projeteis: projeteis,
        playerProjeteis: playerProjeteis,
        lacaios: lacaios,
        bandas: bandas,
        bosses: bosses,
        drops: dropsChao
    };

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(estadoMundo), () => {});
        }
    });
}, 50);

wss.on('connection', (ws) => {
    ws.on('error', (err) => {
        console.error('[WS CLIENTE ERRO]', err && err.message ? err.message : err);
    });
    console.log('[CONEXAO] cliente conectado (' + new Date().toISOString() + ')');
    let playerId = null;
    let userId = null;

    ws.on('message', (message) => {
        try {
            let data = JSON.parse(message);
            let agora = Date.now();

            if (data.action === 'login') {
                userId = (data.userId || "Guerreiro").trim();
                playerId = "heroi_" + userId;
                playerSockets[playerId] = ws;

                let ehAdminConta = spawnsAdmin ? spawnsAdmin.ehAdmin(userId) : false;
                ws.ehAdminCliente = ehAdminConta;

                let dadosSalvos = carregarProgresso(userId);

                let pontosInit = 0;
                if (!dadosSalvos) {
                    pontosInit = PONTOS_INICIAIS;
                } else if (dadosSalvos.pontosDisponiveis === undefined || !dadosSalvos.atributos) {
                    pontosInit = PONTOS_INICIAIS;
                } else {
                    pontosInit = dadosSalvos.pontosDisponiveis || 0;
                }

                players[playerId] = {
                    nome: userId,
                    x: dadosSalvos && dadosSalvos.x !== undefined ? (dadosSalvos.x < LARGURA_VERDE ? CIDADE_SPAWN_X + (Math.random() * 40 - 20) : dadosSalvos.x) : (CIDADE_SPAWN_X + (Math.random() * 40 - 20)),
                    y: dadosSalvos && dadosSalvos.y !== undefined ? (dadosSalvos.x < LARGURA_VERDE ? CIDADE_SPAWN_Y + (Math.random() * 40 - 20) : dadosSalvos.y) : (CIDADE_SPAWN_Y + (Math.random() * 40 - 20)),
                    angulo: 0,
                    moving: false,
                    hp: dadosSalvos && dadosSalvos.hp !== undefined ? dadosSalvos.hp : 100,
                    maxHp: 100,
                    estamina: 100,
                    classe: dadosSalvos ? (dadosSalvos.classe || 'guerreiro') : 'guerreiro',
                    level: dadosSalvos ? (dadosSalvos.level || 1) : 1,
                    xp: dadosSalvos ? (dadosSalvos.xp || 0) : 0,
                    atributos: (dadosSalvos && dadosSalvos.atributos) ? dadosSalvos.atributos : atributosIniciais(),
                    pontosDisponiveis: pontosInit,
                    skills: (dadosSalvos && dadosSalvos.skills) ? dadosSalvos.skills : {},
                    pontosHabilidade: 0,
                    pvpAtivo: false,
                    mana: (dadosSalvos && dadosSalvos.mana !== undefined) ? dadosSalvos.mana : 50,
                    maxMp: 50,
                    inventario: (dadosSalvos && dadosSalvos.inventario) ? dadosSalvos.inventario : inventarioPadrao(),
                    isDashing: false,
                    furiaTimer: 0,
                    stunTimer: 0,
                    lastBasicAttack: 0,
                    isAdmin: ehAdminConta
                };
                players[playerId].maxHp = calcularMaxHp(players[playerId]);
                if (players[playerId].hp > players[playerId].maxHp) players[playerId].hp = players[playerId].maxHp;
                players[playerId].maxMp = calcularMaxMp(players[playerId]);
                if (players[playerId].mana > players[playerId].maxMp) players[playerId].mana = players[playerId].maxMp;

                if (spawnsAdmin) {
                    bandeirasSpawn = spawnsAdmin.carregarBandeiras();
                }

                console.log('[LOGIN]', userId, 'pos(' + Math.round(players[playerId].x) + ',' + Math.round(players[playerId].y) + ') classe=' + players[playerId].classe);

                ws.send(JSON.stringify({
                    type: 'init',
                    id: playerId,
                    nome: userId,
                    x: players[playerId].x,
                    y: players[playerId].y,
                    level: players[playerId].level,
                    xp: players[playerId].xp,
                    classe: players[playerId].classe,
                    atributos: players[playerId].atributos,
                    pontos: players[playerId].pontosDisponiveis,
                    maxHp: players[playerId].maxHp,
                    skills: players[playerId].skills,
                    pontosHabilidade: players[playerId].pontosHabilidade,
                    mana: Math.round(players[playerId].mana),
                    maxMp: players[playerId].maxMp,
                    admin: ehAdminConta
                }));
                ws.send(JSON.stringify({
                    type: 'inventario_sync',
                    inventario: players[playerId].inventario,
                    maxHp: players[playerId].maxHp,
                    hp: players[playerId].hp,
                    atributosTotais: atributosTotais(players[playerId])
                }));
                if (ehAdminConta) {
                    ws.send(JSON.stringify({ type: 'spawn_flags', bandeiras: bandeirasSpawn }));
                }
                return;
            }

            if (data.action === 'client_error') {
                console.error('[CLIENT_ERROR]', userId || '?', data.msg || '', '|', data.url || '', '|linha', data.linha !== undefined ? data.linha : '?', '|col', data.col !== undefined ? data.col : '?', '|stack:', data.stack || '');
                return;
            }

            if (data.action === 'client_estado') {
                console.log('[ESTADO]', userId || '?', 'x=' + Math.round(data.meuX), 'y=' + Math.round(data.meuY), 'mapa=' + data.cm, 'id=' + (data.id || 'null'), 'jog=' + data.np, 'slimes=' + data.ns, 'fps=' + data.f, 'ws=' + data.ws, 'updMs=' + (data.updMs === undefined ? '?' : data.updMs));
                return;
            }

            if (data.action === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', time: agora, sTime: Date.now() }));
                return;
            }

            // ============ SISTEMA DE GRUPO (PARTY) ============
            if (data.action === 'party_invite') {
                let targetName = data.targetName;
                let targetId = null;
                for (let tid in players) {
                    if (players[tid].nome.toLowerCase() === targetName.toLowerCase()) {
                        targetId = tid;
                        break;
                    }
                }
                if (!targetId || targetId === playerId) {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: "Jogador não encontrado!" }));
                    return;
                }
                if (players[targetId] && playerSockets[targetId]) {
                    playerSockets[targetId].send(JSON.stringify({
                        type: 'party_invite_received',
                        fromId: playerId,
                        fromName: players[playerId].nome
                    }));
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: "Convite de grupo enviado!" }));
                }
            }
            if (data.action === 'party_accept') {
                let fromId = data.fromId;
                if (!players[fromId] || !players[playerId]) return;
                
                let p1 = players[fromId];
                let p2 = players[playerId];
                
                let partyId = p1.partyId;
                if (!partyId) {
                    partyId = 'party_' + (partyCounter++);
                    parties[partyId] = [fromId];
                    p1.partyId = partyId;
                }
                
                if (parties[partyId].length < 4 && parties[partyId].indexOf(playerId) === -1) {
                    // Remove do grupo antigo
                    if (p2.partyId && parties[p2.partyId]) {
                        parties[p2.partyId] = parties[p2.partyId].filter(id => id !== playerId);
                        if (parties[p2.partyId].length <= 1) {
                            parties[p2.partyId].forEach(id => { if (players[id]) players[id].partyId = null; });
                            delete parties[p2.partyId];
                        }
                    }
                    parties[partyId].push(playerId);
                    p2.partyId = partyId;
                }
            }
            if (data.action === 'party_leave') {
                let p = players[playerId];
                if (p.partyId && parties[p.partyId]) {
                    parties[p.partyId] = parties[p.partyId].filter(id => id !== playerId);
                    if (parties[p.partyId].length <= 1) {
                        parties[p.partyId].forEach(id => { if (players[id]) players[id].partyId = null; });
                        delete parties[p.partyId];
                    }
                }
                p.partyId = null;
            }

            if (data.action === 'trade_invite') {
                let targetName = data.targetName;
                let targetId = null;
                for (let tid in players) {
                    if (players[tid].nome.toLowerCase() === targetName.toLowerCase()) {
                        targetId = tid;
                        break;
                    }
                }
                if (!targetId || targetId === playerId) {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: "Jogador não encontrado!" }));
                    return;
                }
                let p1 = players[playerId];
                let p2 = players[targetId];
                if (p1.mapa !== p2.mapa || Math.hypot(p1.x - p2.x, p1.y - p2.y) > 150) {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: "Jogador muito longe para troca!" }));
                    return;
                }
                if (players[targetId] && playerSockets[targetId]) {
                    players[targetId].tradeInviter = playerId;
                    playerSockets[targetId].send(JSON.stringify({
                        type: 'trade_invite_received',
                        fromId: playerId,
                        fromName: players[playerId].nome
                    }));
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: "Convite de troca enviado!" }));
                }
            }

            if (data.action === 'trade_accept') {
                let p2 = players[playerId];
                let inviterId = p2.tradeInviter;
                if (inviterId && players[inviterId] && playerSockets[inviterId]) {
                    let tid = "trade_" + tradeCounter++;
                    trades[tid] = { p1: inviterId, p2: playerId, items1: [], items2: [], conf1: false, conf2: false };
                    
                    players[inviterId].tradeId = tid;
                    p2.tradeId = tid;

                    playerSockets[inviterId].send(JSON.stringify({ type: 'trade_start', tradeId: tid, otherName: p2.nome }));
                    ws.send(JSON.stringify({ type: 'trade_start', tradeId: tid, otherName: players[inviterId].nome }));
                }
            }

            if (data.action === 'trade_cancel') {
                cancelarTrade(playerId);
            }

            if (data.action === 'trade_add_item') {
                let tid = data.tradeId;
                let trade = trades[tid];
                let p = players[playerId];
                let idx = parseInt(data.index);
                if (trade && !trade.conf1 && !trade.conf2 && !isNaN(idx) && p.inventario && p.inventario.mochila && idx >= 0 && idx < p.inventario.mochila.length) {
                    let isP1 = (trade.p1 === playerId);
                    let myItems = isP1 ? trade.items1 : trade.items2;
                    if (myItems.length < 4 && p.inventario.mochila[idx] && p.inventario.mochila[idx].tipo !== 'vazio') {
                        let item = p.inventario.mochila.splice(idx, 1)[0];
                        p.inventario.mochila.splice(idx, 0, { tipo: 'vazio' });
                        myItems.push(item);
                        syncInventario(playerId);
                        broadcastTradeUpdate(tid);
                    }
                }
            }

            if (data.action === 'trade_remove_item') {
                let tid = data.tradeId;
                let trade = trades[tid];
                let p = players[playerId];
                let idx = parseInt(data.index);
                if (trade && !trade.conf1 && !trade.conf2 && !isNaN(idx) && p.inventario && p.inventario.mochila) {
                    let isP1 = (trade.p1 === playerId);
                    let myItems = isP1 ? trade.items1 : trade.items2;
                    if (idx >= 0 && idx < myItems.length && myItems[idx]) {
                        let item = myItems.splice(idx, 1)[0];
                        let invSlot = p.inventario.mochila.findIndex(x => x.tipo === 'vazio');
                        if (invSlot !== -1) p.inventario.mochila[invSlot] = item;
                        else p.inventario.mochila.push(item);
                        syncInventario(playerId);
                        broadcastTradeUpdate(tid);
                    }
                }
            }

            if (data.action === 'trade_confirm') {
                let tid = data.tradeId;
                let trade = trades[tid];
                if (trade) {
                    if (trade.p1 === playerId) trade.conf1 = true;
                    if (trade.p2 === playerId) trade.conf2 = true;

                    if (trade.conf1 && trade.conf2) {
                        // SWAP ITEMS
                        let p1 = players[trade.p1];
                        let p2 = players[trade.p2];
                        if (p1 && p2) {
                            trade.items2.forEach(it => {
                                console.log(`[LOG TRADE] Item UID ${it.uid || it.id} (${it.nome}) transferido de ${trade.p2} para ${trade.p1}`);
                                adicionarAoInventario(trade.p1, it);
                            });
                            trade.items1.forEach(it => {
                                console.log(`[LOG TRADE] Item UID ${it.uid || it.id} (${it.nome}) transferido de ${trade.p1} para ${trade.p2}`);
                                adicionarAoInventario(trade.p2, it);
                            });
                            syncInventario(trade.p1);
                            syncInventario(trade.p2);
                            if(playerSockets[trade.p1]) playerSockets[trade.p1].send(JSON.stringify({ type: 'trade_close', mensagem: "Troca Concluída!" }));
                            if(playerSockets[trade.p2]) playerSockets[trade.p2].send(JSON.stringify({ type: 'trade_close', mensagem: "Troca Concluída!" }));
                            if (p1) p1.tradeId = null;
                            if (p2) p2.tradeId = null;
                            delete trades[tid];
                        }
                    } else {
                        broadcastTradeUpdate(tid);
                    }
                }
            }

            if (!playerId || !players[playerId]) return;

            // ===== DROP: coleta de equipamento no chão (autoritário no servidor) =====
            if (data.action === 'coletar_item') {
                let p = players[playerId];
                if (p.hp <= 0) return;
                let dropId = data.dropId;
                let idxDrop = dropsChao.findIndex(d => d.id === dropId);
                if (idxDrop === -1) return;
                let drop = dropsChao[idxDrop];
                let distDrop = Math.hypot((p.x + 12) - drop.x, (p.y + 16) - drop.y);
                if (distDrop > (equipamentos ? equipamentos.BALANCE.raioColeta : 70)) return;
                dropsChao.splice(idxDrop, 1);
                if (!p.inventario) p.inventario = inventarioPadrao();
                if (!p.inventario.mochila) p.inventario.mochila = [];
                p.inventario.mochila.push(drop.item);
                salvarProgresso(userId, { inventario: p.inventario });
                console.log(`[LOG DROP] Item UID ${drop.item.uid || drop.item.id} (${drop.item.nome}) coletado por ${playerId}`);
                ws.send(JSON.stringify({ type: 'item_coletado', item: drop.item, equipadoMsg: null }));
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'item_removido_chao', dropId: drop.id }));
                    }
                });
                return;
            }

            // ===== EQUIPAR item da mochila (valida classe/slot no servidor) =====
            if (data.action === 'equipar_item') {
                let p = players[playerId];
                if (!p.inventario || !p.inventario.mochila) return;
                let itemMochila = p.inventario.mochila.find(i => i.id === data.id);
                if (!itemMochila) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Item não encontrado na mochila.' }));
                    return;
                }
                if (!equipamentos || !equipamentos.classePodeEquipar(p.classe, itemMochila)) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Sua classe não pode usar ' + (itemMochila.nome || 'esse item') + '!' }));
                    return;
                }
                let slotDestino = itemMochila.slot;
                let antigo = p.inventario.slots[slotDestino] || null;
                p.inventario.mochila = p.inventario.mochila.filter(i => i.id !== itemMochila.id);
                if (antigo) p.inventario.mochila.push(antigo);
                p.inventario.slots[slotDestino] = itemMochila;
                p.maxHp = calcularMaxHp(p);
                if (p.hp > p.maxHp) p.hp = p.maxHp;
                p.maxMp = calcularMaxMp(p);
                if (p.mana > p.maxMp) p.mana = p.maxMp;
                salvarProgresso(userId, { inventario: p.inventario, maxHp: p.maxHp, hp: p.hp });
                ws.send(JSON.stringify({
                    type: 'inventario_sync',
                    inventario: p.inventario,
                    maxHp: p.maxHp,
                    hp: p.hp,
                    maxMp: p.maxMp,
                    mana: Math.round(p.mana),
                    atributosTotais: atributosTotais(p)
                }));
                return;
            }

            // ===== DESEQUIPAR item de volta para a mochila =====
            if (data.action === 'desequipar_item') {
                let p = players[playerId];
                if (!p.inventario || !p.inventario.mochila) return;
                let slotDeseq = data.slot;
                let itemSlot = p.inventario.slots[slotDeseq];
                if (!itemSlot) return;
                p.inventario.slots[slotDeseq] = null;
                p.inventario.mochila.push(itemSlot);
                p.maxHp = calcularMaxHp(p);
                if (p.hp > p.maxHp) p.hp = p.maxHp;
                p.maxMp = calcularMaxMp(p);
                if (p.mana > p.maxMp) p.mana = p.maxMp;
                salvarProgresso(userId, { inventario: p.inventario, maxHp: p.maxHp, hp: p.hp });
                ws.send(JSON.stringify({
                    type: 'inventario_sync',
                    inventario: p.inventario,
                    maxHp: p.maxHp,
                    hp: p.hp,
                    maxMp: p.maxMp,
                    mana: Math.round(p.mana),
                    atributosTotais: atributosTotais(p)
                }));
                return;
            }

            // ===== DESTRUIR item da mochila (lixeira) =====
            if (data.action === 'destruir_item') {
                let p = players[playerId];
                if (!p.inventario || !p.inventario.mochila) return;
                let idx = p.inventario.mochila.findIndex(i => i.id === data.id);
                if (idx === -1) return;
                p.inventario.mochila.splice(idx, 1);
                salvarProgresso(userId, { inventario: p.inventario });
                ws.send(JSON.stringify({ type: 'inventario_sync', inventario: p.inventario }));
                return;
            }

            // ===== ORGANIZAR mochila (raridade → slot → nome) =====
            if (data.action === 'organizar_mochila') {
                let p = players[playerId];
                if (!p.inventario || !p.inventario.mochila) return;
                var ORDEM_RARIDADE = { lendario: 0, epico: 1, raro: 2, comum: 3 };
                var ORDEM_SLOT = { arma: 0, armaSecundaria: 1, capacete: 2, peitoral: 3, luva: 4, bota: 5, capa: 6, colar: 7, anel: 8 };
                p.inventario.mochila.sort(function (a, b) {
                    let ra = ORDEM_RARIDADE[a.raridade] !== undefined ? ORDEM_RARIDADE[a.raridade] : 9;
                    let rb = ORDEM_RARIDADE[b.raridade] !== undefined ? ORDEM_RARIDADE[b.raridade] : 9;
                    if (ra !== rb) return ra - rb;
                    let sa = ORDEM_SLOT[a.slot] !== undefined ? ORDEM_SLOT[a.slot] : 9;
                    let sb = ORDEM_SLOT[b.slot] !== undefined ? ORDEM_SLOT[b.slot] : 9;
                    if (sa !== sb) return sa - sb;
                    return String(a.nome || '').localeCompare(String(b.nome || ''));
                });
                salvarProgresso(userId, { inventario: p.inventario });
                ws.send(JSON.stringify({ type: 'inventario_sync', inventario: p.inventario }));
                return;
            }

            if (data.action === 'escolher_classe') {
                players[playerId].classe = data.classe;
                salvarProgresso(userId, { 
                    level: players[playerId].level, 
                    xp: players[playerId].xp, 
                    classe: data.classe,
                    x: players[playerId].x,
                    y: players[playerId].y,
                    hp: players[playerId].hp
                });
                if (data.classe === 'summoner') {
                    delete petRespawnTimer[playerId];
                    let petHp = calcularVidaPet(players[playerId]);
                    lacaios[playerId] = { x: players[playerId].x + 35, y: players[playerId].y + 35, hp: petHp, maxHp: petHp, attackCooldown: 0, angleOffset: 0, skillCooldown: 0, skill2Cooldown: 0, isJumping: false, targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null, rugidoTimer: 200, rugindoTimer: 0 };
                } else {
                    delete lacaios[playerId];
                    delete petRespawnTimer[playerId];
                }
                if (data.classe === 'roqueiro') {
                    if (!bandas[playerId]) bandas[playerId] = { membros: [] };
                    let banda = bandas[playerId];
                    banda.membros = [];
                    let angBanda = Math.random() * Math.PI * 2;
                    banda.membros.push({
                        x: players[playerId].x + Math.cos(angBanda) * 40,
                        y: players[playerId].y + Math.sin(angBanda) * 40,
                        angulo: 0,
                        attackCooldown: 0
                    });
                } else {
                    delete bandas[playerId];
                }
            }

            // ===== ADMIN: BANDEIRAS DE SPAWN (validação de cargo no servidor) =====
            if (data.action === 'admin_spawn' || data.action === 'admin_spawn_excluir') {
                let p = players[playerId];
                if (!p || !p.isAdmin || !spawnsAdmin) return;

                if (data.action === 'admin_spawn') {
                    let sub = data.sub || 'criar';
                    let flag = null;
                    if (sub === 'editar' && data.flagId) {
                        flag = bandeirasSpawn.find(f => f.id === data.flagId);
                    }
                    let dados = validarDadosBandeira(data);
                    if (!dados) return;

                    if (sub === 'editar' && flag) {
                        // edição não muda o local; se x/y não vieram, mantém os atuais
                        if (!dados.temPosicao) { dados.x = flag.x; dados.y = flag.y; }
                        delete dados.temPosicao;
                        Object.assign(flag, dados); // atualiza maxQtd, hpBase, etc
                        sincronizarMonstrosBandeira(flag);
                        spawnsAdmin.salvarBandeiras(bandeirasSpawn);
                    } else if (sub !== 'editar') {
                        let nova = Object.assign({
                            id: 'flag_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            criadoEm: Date.now()
                        }, dados);
                        bandeirasSpawn.push(nova);
                        preencherBandeira(nova);
                        spawnsAdmin.salvarBandeiras(bandeirasSpawn);
                    }
                    broadcastBandeiras();
                } else {
                    let flag = bandeirasSpawn.find(f => f.id === data.flagId);
                    if (flag) excluirBandeira(flag);
                }
                return;
            }

            // ===== DISTRIBUIÇÃO DE PONTOS DE ATRIBUTO (validação estrita no servidor) =====
            if (data.action === 'distribuir_ponto') {
                let p = players[playerId];
                if (!p) return;
                if (!data.atributo || ATRIBUTOS.indexOf(data.atributo) === -1) return;
                if (!p.atributos) p.atributos = atributosIniciais();
                if ((p.pontosDisponiveis || 0) <= 0) return;

                p.atributos[data.atributo]++;
                p.pontosDisponiveis--;

                let novoMax = calcularMaxHp(p);
                if (novoMax !== p.maxHp) {
                    p.maxHp = novoMax;
                    if (p.hp > p.maxHp) p.hp = p.maxHp;
                }

                let novoMaxMp = calcularMaxMp(p);
                if (novoMaxMp !== p.maxMp) {
                    p.maxMp = novoMaxMp;
                    if (p.mana > p.maxMp) p.mana = p.maxMp;
                }

                // AFINIDADE: aumenta a vida do lacaio do summoner também
                if (data.atributo === 'afinidade' && lacaios[playerId]) {
                    let novaVidaPet = calcularVidaPet(p);
                    lacaios[playerId].maxHp = novaVidaPet;
                    if (lacaios[playerId].hp > novaVidaPet) lacaios[playerId].hp = novaVidaPet;
                }

                ws.send(JSON.stringify({
                    type: 'ponto_distribuido',
                    atributo: data.atributo,
                    atributos: p.atributos,
                    pontos: p.pontosDisponiveis,
                    maxHp: p.maxHp,
                    maxMp: p.maxMp,
                    mana: Math.round(p.mana)
                }));

                salvarProgresso(userId, {
                    level: p.level,
                    xp: p.xp,
                    classe: p.classe,
                    x: Math.round(p.x),
                    y: Math.round(p.y),
                    hp: p.hp,
                    atributos: p.atributos,
                    pontosDisponiveis: p.pontosDisponiveis
                });
                return;
            }

            // ===== RESETAR ATRIBUTOS (devolve todos os pontos gastos) =====
            if (data.action === 'resetar_atributos') {
                let p = players[playerId];
                if (!p) return;
                if (!p.atributos) p.atributos = atributosIniciais();

                let gastos = 0;
                ATRIBUTOS.forEach(chave => {
                    let v = (p.atributos[chave] || 1);
                    if (v > 1) gastos += v - 1;
                });
                if (gastos <= 0) {
                    ws.send(JSON.stringify({ type: 'atributos_resetados', atributos: p.atributos, pontos: p.pontosDisponiveis || 0, maxHp: p.maxHp }));
                    return;
                }

                p.atributos = atributosIniciais();
                p.pontosDisponiveis = (p.pontosDisponiveis || 0) + gastos;

                let novoMax = calcularMaxHp(p);
                if (novoMax !== p.maxHp) {
                    p.maxHp = novoMax;
                    if (p.hp > p.maxHp) p.hp = p.maxHp;
                }

                let novoMaxMpRes = calcularMaxMp(p);
                if (novoMaxMpRes !== p.maxMp) {
                    p.maxMp = novoMaxMpRes;
                    if (p.mana > p.maxMp) p.mana = p.maxMp;
                }

                // AFINIDADE: ajusta a vida do lacaio do summoner também
                if (lacaios[playerId]) {
                    let novaVidaPet = calcularVidaPet(p);
                    lacaios[playerId].maxHp = novaVidaPet;
                    if (lacaios[playerId].hp > novaVidaPet) lacaios[playerId].hp = novaVidaPet;
                }

                ws.send(JSON.stringify({
                    type: 'atributos_resetados',
                    atributos: p.atributos,
                    pontos: p.pontosDisponiveis,
                    maxHp: p.maxHp,
                    maxMp: p.maxMp,
                    mana: Math.round(p.mana || 0)
                }));

                salvarProgresso(userId, {
                    level: p.level,
                    xp: p.xp,
                    classe: p.classe,
                    x: Math.round(p.x),
                    y: Math.round(p.y),
                    hp: p.hp,
                    atributos: p.atributos,
                    pontosDisponiveis: p.pontosDisponiveis
                });
                return;
            }

            // ===== UPGRADE DE SKILL (valida no servidor, gasta ponto de habilidade) =====
            if (data.action === 'upgrade_skill') {
                let p = players[playerId];
                if (!p || !p.classe) return;
                let skillId = data.id;
                if (!skillId) return;

                let atual = obterNivelSkill(p, skillId);
                if (atual >= NIVEL_SKILL_MAX) {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: 'Esta skill já está no nível máximo.' }));
                    return;
                }
                if (!p.skills) p.skills = {};
                if (!p.pontosHabilidade) p.pontosHabilidade = 0;
                if (p.pontosHabilidade <= 0) {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: 'Sem pontos de habilidade! Suba de nível para ganhar mais.' }));
                    return;
                }

                p.skills[skillId] = atual + 1;
                p.pontosHabilidade--;

                ws.send(JSON.stringify({
                    type: 'skill_upgrade',
                    id: skillId,
                    nivel: p.skills[skillId],
                    pontosHabilidade: p.pontosHabilidade
                }));

                salvarProgresso(userId, {
                    level: p.level,
                    xp: p.xp,
                    classe: p.classe,
                    x: Math.round(p.x),
                    y: Math.round(p.y),
                    hp: p.hp,
                    atributos: p.atributos,
                    pontosDisponiveis: p.pontosDisponiveis,
                    skills: p.skills,
                    pontosHabilidade: p.pontosHabilidade,
                    mana: p.mana
                });
                return;
            }

            if (data.action === 'resetar_skill') {
                let p = players[playerId];
                if (!p) return;
                if (!p.skills) p.skills = {};
                if (p.skills[data.id]) {
                    delete p.skills[data.id];
                    ws.send(JSON.stringify({ type: 'skill_reset', id: data.id, nivel: 1 }));
                }
                return;
            }

            if (data.action === 'resetar_todas_skills') {
                let p = players[playerId];
                if (!p) return;
                p.skills = {};
                ws.send(JSON.stringify({ type: 'skill_reset_tudo' }));
                salvarProgresso(userId, {
                    level: p.level,
                    xp: p.xp,
                    classe: p.classe,
                    x: Math.round(p.x),
                    y: Math.round(p.y),
                    hp: p.hp,
                    atributos: p.atributos,
                    pontosDisponiveis: p.pontosDisponiveis,
                    skills: p.skills,
                    pontosHabilidade: p.pontosHabilidade || 0,
                    mana: p.mana
                });
                return;
            }

            if (players[playerId].hp > 0) {
                let podeMover = players[playerId].stunTimer <= 0;
                if (efeitos && podeMover) {
                    podeMover = !efeitos.temEfeito(players[playerId], 'paralisia') && !efeitos.temEfeito(players[playerId], 'sono');
                }
                if (podeMover) {
                    if (data.x !== undefined) players[playerId].x = data.x;
                    if (data.y !== undefined) players[playerId].y = data.y;
                    if (data.moving !== undefined) players[playerId].moving = data.moving;
                }
                if (data.angulo !== undefined) players[playerId].angulo = data.angulo;

                if (data.action === 'salvar_progresso') {
                    if (data.level !== undefined) players[playerId].level = data.level;
                    if (data.xp !== undefined) players[playerId].xp = data.xp;
                    salvarProgresso(userId, { 
                        level: players[playerId].level, 
                        xp: players[playerId].xp, 
                        classe: players[playerId].classe,
                        x: Math.round(players[playerId].x),
                        y: Math.round(players[playerId].y),
                        hp: players[playerId].hp,
                        atributos: players[playerId].atributos,
                        pontosDisponiveis: players[playerId].pontosDisponiveis,
                        skills: players[playerId].skills || {},
                        pontosHabilidade: players[playerId].pontosHabilidade || 0,
                        mana: players[playerId].mana
                    });
                }

                // BLOQUEIO POR CC (Stun, Sono, Paralisia, Levantado)
                let ccAtivo = false;
                if (players[playerId] && players[playerId].efeitos) {
                    let p = players[playerId];
                    if (efeitos.temEfeito(p, 'stun') || efeitos.temEfeito(p, 'sono') || efeitos.temEfeito(p, 'paralisia') || efeitos.temEfeito(p, 'levantado')) {
                        ccAtivo = true;
                    }
                }
                const acoesBloqueadasPorCC = [
                    'ataque_barbaro', 'barbaro_furia', 'barbaro_esmagamento', 
                    'ataque_roqueiro', 'roqueiro_bateria', 'roqueiro_teleporte', 'roqueiro_banda',
                    'dash', 'tornado', 'corte', 'ataque_mago', 'ataque_summoner', 'ataque_arqueiro', 'ataque_curandeiro'
                ];
                if (ccAtivo && acoesBloqueadasPorCC.indexOf(data.action) !== -1) {
                    return; // Bloqueado por CC
                }

                // ATAQUE BÁSICO DO BÁRBARO: MACHADADA ENSANGUENTADA (20 DANO + VAMPIRISMO EM FÚRIA)
                if (data.action === 'ataque_barbaro') {
                    if (agora - players[playerId].lastBasicAttack < 350) return;
                    players[playerId].lastBasicAttack = agora;

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_machadada', id: playerId, x: pX, y: pY }));
                        }
                    });

                    let danoMachado = dmgSkill(players[playerId], 'machadada', 20);
                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            let dist = Math.hypot(pX - slime.x, pY - slime.y);
                            if (dist < 72) {
                                let anguloAteSlime = Math.atan2(slime.y - pY, slime.x - pX);
                                let diff = Math.atan2(Math.sin(players[playerId].angulo - anguloAteSlime), Math.cos(players[playerId].angulo - anguloAteSlime));

                                if (Math.abs(diff) < 1.1) {
                                    registrarDanoMonstro(slime, playerId, danoMachado);

                                    // Lifesteal em Fúria: Recupera 8 de vida por golpe
                                    if (players[playerId].furiaTimer > 0) {
                                        aplicarCuraAoJogador(playerId, 8);
                                    }
                                }
                            }
                        }
                    });
                    danoEmBosses(pX, pY, 95, playerId, 20, 'basico');
                    if (players[playerId].furiaTimer > 0 && bosses.some(bb => bb.hp > 0 && Math.hypot(pX - bb.x, pY - bb.y) < 95)) {
                        aplicarCuraAoJogador(playerId, 8);
                    }
                }

                // HABILIDADE 1 DO BÁRBARO: FÚRIA BERSERKER (6s de buff de vampirismo)
                if (data.action === 'barbaro_furia') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'furia', 20))) return;
                    players[playerId].furiaTimer = 120; // 6 segundos
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_furia', id: playerId }));
                        }
                    });
                }

                // HABILIDADE 2 DO BÁRBARO: SALTO ESMAGADOR (35 de dano em área + Salto)
                if (data.action === 'barbaro_esmagamento') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'esmagamento-barbaro', 25))) return;
                    players[playerId].x = data.targetX - 12;
                    players[playerId].y = data.targetY - 16;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_esmagamento', x: data.targetX, y: data.targetY }));
                        }
                    });

                    let danoEsmaga = dmgSkill(players[playerId], 'esmagamento-barbaro', 35);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - data.targetX, slime.y - data.targetY) < 75) {
                            registrarDanoMonstro(slime, playerId, danoEsmaga);
                            slime.stunTimer = 25;
                        }
                    });
                    danoEmBosses(data.targetX, data.targetY, 90, playerId, danoEsmaga, 'skill');
                }

                // ROQUEIRO: RIFF DE GUITARRA (Ataque básico)
                if (data.action === 'ataque_roqueiro') {
                    if (agora - players[playerId].lastBasicAttack < 300) return;
                    players[playerId].lastBasicAttack = agora;

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let ang = (data.angulo !== undefined) ? data.angulo : players[playerId].angulo;

                    playerProjeteis.push({
                        ownerId: playerId,
                        x: pX,
                        y: pY,
                        vx: Math.cos(ang) * 12.0,
                        vy: Math.sin(ang) * 12.0,
                        dano: dmgSkill(players[playerId], 'riff', 15),
                        vida: 55,
                        perfurante: false,
                        tipo: 'riff',
                        origemBasica: true
                    });

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_riff', id: playerId }));
                        }
                    });
                }

                // ROQUEIRO: BATERIA SOLO (Canal de 5s: dano em área repetido a cada batida, cancela ao mover)
                if (data.action === 'roqueiro_bateria') {
                    if (bateriaCanal[playerId]) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'bateria', 25))) return;
                    bateriaCanal[playerId] = { timer: 250, beat: 0, startX: players[playerId].x, startY: players[playerId].y, danoBateria: dmgSkill(players[playerId], 'bateria', 30) };

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_roqueiro_bateria', x: pX, y: pY }));
                        }
                    });

                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - pX, slime.y - pY) < 110) {
                            registrarDanoMonstro(slime, playerId, dmgSkill(players[playerId], 'bateria', 30));
                            slime.stunTimer = 25;
                        }
                    });
                }

                // ROQUEIRO: STAGE DIVE (Teletransporte direcionado)
                if (data.action === 'roqueiro_teleporte') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'teleporte', 15))) return;
                    let tx = Math.max(20, Math.min(WORLD_WIDTH - 40, data.targetX));
                    let ty = Math.max(20, Math.min(WORLD_HEIGHT - 40, data.targetY));
                    players[playerId].x = tx - 12;
                    players[playerId].y = ty - 16;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_roqueiro_teleporte', id: playerId, x: players[playerId].x, y: players[playerId].y }));
                        }
                    });
                }

                // ROQUEIRO: CHAMAR A BANDA (1 membro que segue e ataca)
                if (data.action === 'roqueiro_banda') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'banda', 30))) return;
                    if (!bandas[playerId]) bandas[playerId] = { membros: [] };
                    let banda = bandas[playerId];
                    banda.membros = [];
                    let angBanda = Math.random() * Math.PI * 2;
                    banda.membros.push({
                        x: players[playerId].x + Math.cos(angBanda) * 40,
                        y: players[playerId].y + Math.sin(angBanda) * 40,
                        angulo: 0,
                        attackCooldown: 0
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_roqueiro_banda', id: playerId }));
                        }
                    });
                }

                if (data.action === 'dash') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'dash', 15))) return;
                    if (data.novoX !== undefined) players[playerId].x = data.novoX;
                    if (data.novoY !== undefined) players[playerId].y = data.novoY;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dash', id: playerId, x: players[playerId].x, y: players[playerId].y }));
                        }
                    });

                    let danoDash = dmgSkill(players[playerId], 'dash', 20);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot((players[playerId].x + 12) - slime.x, (players[playerId].y + 16) - slime.y) < 65) {
                            registrarDanoMonstro(slime, playerId, danoDash);
                            slime.stunTimer = 40;
                        }
                    });
                    danoEmBosses(players[playerId].x + 12, players[playerId].y + 16, 90, playerId, danoDash, 'skill');
                }

                if (data.action === 'tornado') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'tornado', 20))) return;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_tornado', id: playerId }));
                        }
                    });

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let danoTornado = dmgSkill(players[playerId], 'tornado', 25);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(pX - slime.x, pY - slime.y) < 100) {
                            registrarDanoMonstro(slime, playerId, danoTornado);
                        }
                    });
                    danoEmBosses(pX, pY, 105, playerId, danoTornado, 'skill');
                }

                if (data.action === 'corte') {
                    if (agora - players[playerId].lastBasicAttack < 350) return;
                    players[playerId].lastBasicAttack = agora;

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_corte', id: playerId }));
                        }
                    });

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let danoCorte = dmgSkill(players[playerId], 'corte', 12);

                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            let dist = Math.hypot(pX - slime.x, pY - slime.y);

                            if (dist < 66) {
                                let anguloAteSlime = Math.atan2(slime.y - pY, slime.x - pX);
                                let diff = Math.atan2(Math.sin(players[playerId].angulo - anguloAteSlime), Math.cos(players[playerId].angulo - anguloAteSlime));

                                if (Math.abs(diff) < 1.0) {
                                    registrarDanoMonstro(slime, playerId, danoCorte);
                                }
                            }
                        }
                    });
                    danoEmBosses(pX, pY, 110, playerId, danoCorte, 'basico');
                }

                if (data.action === 'ataque_mago' || data.action === 'ataque_summoner' || data.action === 'ataque_arqueiro' || data.action === 'ataque_curandeiro') {
                    if (agora - players[playerId].lastBasicAttack < 300) return;
                    players[playerId].lastBasicAttack = agora;

                    if (data.action === 'ataque_summoner' && lacaios[playerId]) {
                        if (data.alvoTipo === 'slime' && data.alvoId) {
                            lacaios[playerId].focoAlvo = { tipo: 'slime', id: data.alvoId };
                        } else if (data.alvoTipo === 'boss' && data.alvoId) {
                            lacaios[playerId].focoAlvo = { tipo: 'boss', id: data.alvoId };
                        } else {
                            lacaios[playerId].focoAlvo = null;
                        }
                    }

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let ang = (data.angulo !== undefined) ? data.angulo : players[playerId].angulo;
                    
                    let danoProj = dmgSkill(players[playerId], 'magia', 15);
                    if (data.action === 'ataque_summoner') danoProj = dmgSkill(players[playerId], 'orbe', 6);
                    if (data.action === 'ataque_arqueiro') danoProj = dmgSkill(players[playerId], 'flecha', 18);
                    if (data.action === 'ataque_curandeiro') danoProj = dmgSkill(players[playerId], 'sagrado', 12);

                    let velocidadeProj = 10.0;
                    if (data.action === 'ataque_arqueiro') velocidadeProj = 14.0;

                    // Alcance do arqueiro ~10% maior que o das classes mágicas (48 ticks x 14 = ~672px vs 600px)
                    let vidaProj = 60;
                    if (data.action === 'ataque_arqueiro') vidaProj = 48;

                    let tipoProj = (data.action === 'ataque_mago') ? 'magia' :
                                   (data.action === 'ataque_summoner') ? 'orbe' :
                                   (data.action === 'ataque_arqueiro') ? 'flecha' : 'sagrado';

                    playerProjeteis.push({
                        ownerId: playerId,
                        x: pX,
                        y: pY,
                        vx: Math.cos(ang) * velocidadeProj,
                        vy: Math.sin(ang) * velocidadeProj,
                        dano: danoProj,
                        vida: vidaProj,
                        perfurante: false,
                        tipo: tipoProj,
                        origemBasica: true
                    });

                    let tipoAcao = 'action_magia_basica';
                    if (data.action === 'ataque_summoner') tipoAcao = 'action_orbe';
                    if (data.action === 'ataque_arqueiro') tipoAcao = 'action_flecha';
                    if (data.action === 'ataque_curandeiro') tipoAcao = 'action_sagrado';

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: tipoAcao, id: playerId }));
                        }
                    });
                }

                if (data.action === 'curandeiro_cura') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'cura', 25))) return;
                    // Ponto alvo: se vier targetX/targetY usa (cura em área selecionada)
                    let pX = (typeof data.targetX === 'number') ? data.targetX : (players[playerId].x + 12);
                    let pY = (typeof data.targetY === 'number') ? data.targetY : (players[playerId].y + 16);
                    pX = Math.max(20, Math.min(WORLD_WIDTH - 20, pX));
                    pY = Math.max(20, Math.min(WORLD_HEIGHT - 20, pY));

                    let curaBase = Math.round(calcularCuraJogador(playerId, dmgSkill(players[playerId], 'cura', 35)));
                    for (let id in players) {
                        let ally = players[id];
                        let ehAliado = (id === playerId) || (players[playerId].partyId && ally.partyId === players[playerId].partyId);
                        if (ehAliado && ally.hp > 0 && Math.hypot((ally.x + 12) - pX, (ally.y + 16) - pY) < 140) {
                            aplicarCuraAoJogador(id, curaBase);
                        }
                    }

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_curandeiro_cura', x: pX, y: pY, valor: curaBase }));
                        }
                    });
                }

                if (data.action === 'curandeiro_julgamento') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'julgamento', 24))) return;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_curandeiro_julgamento', targetX: data.targetX, targetY: data.targetY }));
                        }
                    });

                    let danoJulg = dmgSkill(players[playerId], 'julgamento', 28);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - data.targetX, slime.y - data.targetY) < 65) {
                            registrarDanoMonstro(slime, playerId, danoJulg);
                            slime.slowTimer = 35;
                        }
                    });
                    danoEmBosses(data.targetX, data.targetY, 85, playerId, danoJulg, 'skill');
                }

                if (data.action === 'arqueiro_chuva') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'chuva', 22))) return;
                    chuvasServidor.push({ ownerId: playerId, x: data.targetX, y: data.targetY, duracao: 140, danoChuva: dmgSkill(players[playerId], 'chuva', 8) });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arqueiro_chuva', targetX: data.targetX, targetY: data.targetY }));
                        }
                    });
                }

                if (data.action === 'arqueiro_perfurante') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'perfurante', 18))) return;
                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let ang = (data.angulo !== undefined) ? data.angulo : players[playerId].angulo;
                    let vel = 18.0;

                    playerProjeteis.push({
                        ownerId: playerId,
                        x: pX,
                        y: pY,
                        vx: Math.cos(ang) * vel,
                        vy: Math.sin(ang) * vel,
                        dano: dmgSkill(players[playerId], 'perfurante', 32),
                        vida: 40,
                        perfurante: true,
                        origemBasica: false
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arqueiro_perfurante', x: pX, y: pY, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, angulo: ang }));
                        }
                    });
                }

                if (data.action === 'meteoro') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'meteoro', 30))) return;
                    let danoMeteoro = dmgSkill(players[playerId], 'meteoro', 25);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_meteoro', targetX: data.targetX, targetY: data.targetY }));
                        }
                    });

                    setTimeout(() => {
                        slimes.forEach(slime => {
                            if (slime.hp > 0 && Math.hypot(slime.x - data.targetX, slime.y - data.targetY) < 85) {
                                registrarDanoMonstro(slime, playerId, danoMeteoro);
                            }
                        });
                        danoEmBosses(data.targetX, data.targetY, 95, playerId, danoMeteoro, 'skill');
                    }, 600);
                }

                if (data.action === 'nevasca') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'nevasca', 35))) return;
                    blizzards.push({ ownerId: playerId, x: data.targetX, y: data.targetY, radius: 115, duracao: 480, danoNevasca: dmgSkill(players[playerId], 'nevasca', 6) });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_nevasca', targetX: data.targetX, targetY: data.targetY, radius: 115 }));
                        }
                    });
                }

                if (data.action === 'comando_pet_ogro') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'esmagamento', 25))) return;
                    if (lacaios[playerId] && lacaios[playerId].skillCooldown === 0) {
                        lacaios[playerId].skillCooldown = 120;
                        let ogro = lacaios[playerId];
                        ogro.modoAgressivoTimer = 140;

                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ogro_sismico', x: ogro.x, y: ogro.y }));
                            }
                        });

                        let danoPetSis = dmgSkill(players[playerId], 'esmagamento', 45);
                        slimes.forEach(slime => {
                            if (slime.hp > 0 && Math.hypot(slime.x - ogro.x, slime.y - ogro.y) < 100) {
                                let r = registrarDanoMonstro(slime, playerId, danoPetSis, 'pet');
                                broadcastDanoLacaio(slime.x, slime.y, r.dano);
                                slime.stunTimer = 30;
                                ogro.targetSlimeId = slime.id;
                            }
                        });
                        let dbSis = danoEmBosses(ogro.x, ogro.y, 115, playerId, danoPetSis, 'skill', 'pet');
                        if (dbSis) broadcastDanoLacaio(dbSis.x, dbSis.y, dbSis.dano);
                    }
                }

                if (data.action === 'comando_salto_ogro') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'salto', 20))) return;
                    if (lacaios[playerId] && !lacaios[playerId].isJumping && lacaios[playerId].skill2Cooldown === 0) {
                        let ogro = lacaios[playerId];
                        let player = players[playerId];
                        ogro.modoAgressivoTimer = 160;

                        let txSalto = (typeof data.targetX === 'number' && !isNaN(data.targetX)) ? data.targetX : null;
                        let tySalto = (typeof data.targetY === 'number' && !isNaN(data.targetY)) ? data.targetY : null;

                        let alvoMaisProximo = null;
                        if (txSalto === null) {
                            let menorDist = Infinity;
                            slimes.forEach(slime => {
                                if (slime.hp > 0) {
                                    let distAoSummoner = Math.hypot(slime.x - player.x, slime.y - player.y);
                                    let distAoOgro = Math.hypot(slime.x - ogro.x, slime.y - ogro.y);
                                    if (distAoSummoner < 350 && distAoOgro < menorDist) {
                                        menorDist = distAoOgro;
                                        alvoMaisProximo = slime;
                                    }
                                }
                            });
                        }

                        if (!alvoMaisProximo && (txSalto === null || tySalto === null)) {
                            // Sem alvo e sem local escolhido: salta para frente
                            txSalto = ogro.x + Math.cos(player.angulo || 0) * 150;
                            tySalto = ogro.y + Math.sin(player.angulo || 0) * 150;
                        }

                        if (txSalto !== null && tySalto !== null) {
                            txSalto = Math.max(20, Math.min(WORLD_WIDTH - 40, txSalto));
                            tySalto = Math.max(20, Math.min(WORLD_HEIGHT - 40, tySalto));
                            ogro.skill2Cooldown = 160;
                            ogro.isJumping = true;
                            ogro.jumpProgress = 0;
                            ogro.jumpStart = { x: ogro.x, y: ogro.y };
                            ogro.jumpTarget = { x: txSalto, y: tySalto };
                            if (alvoMaisProximo) ogro.targetSlimeId = alvoMaisProximo.id;

                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'action_ogro_salto', startX: ogro.x, startY: ogro.y, targetX: txSalto, targetY: tySalto }));
                                }
                            });
                        }
                    }
                }
            }

            if (data.action === 'teleporte_mapa') {
                let destino = PONTOS_TELEPORTE[data.mapa];
                if (!destino || !playerId || !players[playerId]) return;
                players[playerId].x = destino.x + (Math.random() * 20 - 10);
                players[playerId].y = destino.y + (Math.random() * 20 - 10);
                if (players[playerId].classe === 'summoner' && lacaios[playerId]) {
                    lacaios[playerId].x = players[playerId].x + 30;
                    lacaios[playerId].y = players[playerId].y + 30;
                }
                ws.send(JSON.stringify({ type: 'teleporte_confirmado', mapa: data.mapa, x: players[playerId].x, y: players[playerId].y }));
                return;
            }

            if (data.action === 'toggle_pvp') {
                if (players[playerId]) {
                    players[playerId].pvpAtivo = !players[playerId].pvpAtivo;
                }
            }

            if (data.action === 'respawn') {
                players[playerId].hp = players[playerId].maxHp;
                players[playerId].estamina = 100;
                players[playerId].mana = players[playerId].maxMp;
                players[playerId].stunTimer = 0;
                players[playerId].x = CIDADE_SPAWN_X;
                players[playerId].y = CIDADE_SPAWN_Y;
                delete bateriaCanal[playerId];
                if (players[playerId].classe === 'summoner') {
                    delete petRespawnTimer[playerId];
                    let petHp = calcularVidaPet(players[playerId]);
                    lacaios[playerId] = { x: CIDADE_SPAWN_X + 30, y: CIDADE_SPAWN_Y + 30, hp: petHp, maxHp: petHp, attackCooldown: 0, angleOffset: 0, skillCooldown: 0, skill2Cooldown: 0, isJumping: false, targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null, rugidoTimer: 200, rugindoTimer: 0 };
                }
                salvarProgresso(userId, { hp: players[playerId].hp, x: players[playerId].x, y: players[playerId].y });
            }
        } catch (e) {}
    });

    ws.on('close', () => {
        if (playerId && players[playerId] && userId) {
            salvarProgresso(userId, {
                level: players[playerId].level,
                xp: players[playerId].xp,
                classe: players[playerId].classe,
                hp: players[playerId].hp,
                x: Math.round(players[playerId].x),
                y: Math.round(players[playerId].y),
                atributos: players[playerId].atributos,
                pontosDisponiveis: players[playerId].pontosDisponiveis,
                inventario: players[playerId].inventario,
                skills: players[playerId].skills || {},
                pontosHabilidade: players[playerId].pontosHabilidade || 0,
                mana: players[playerId].mana
            });
            cancelarTrade(playerId);
            delete players[playerId];
            delete playerSockets[playerId];
            delete lacaios[playerId];
            delete petRespawnTimer[playerId];
            delete bandas[playerId];

            // Remove do party se estiver em uma
            for (let pId in parties) {
                let membros = parties[pId];
                if (membros.indexOf(playerId) !== -1) {
                    parties[pId] = membros.filter(id => id !== playerId);
                    if (parties[pId].length <= 1) {
                        parties[pId].forEach(id => { if (players[id]) players[id].partyId = null; });
                        delete parties[pId];
                    }
                }
            }
            delete bateriaCanal[playerId];
        }
    });
});

let PORT = parseInt(process.env.PORT, 10) || 8080;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`[AVISO] Porta ${PORT} em uso. Tentando porta alternativa ${PORT + 1}...`);
        PORT = PORT + 1;
        setTimeout(() => {
            try { server.close(); } catch (_) {}
            server.listen(PORT, () => {
                console.log("Servidor rodando na porta " + PORT);
            });
        }, 500);
    } else {
        console.error('[ERRO SERVIDOR HTTP]', err);
    }
});

server.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
