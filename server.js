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

let mapaArena = null;
try {
    mapaArena = require('./mapa_arena.js');
    console.log("Fase 6 'Arena' carregada (" + mapaArena.COLS + "x" + mapaArena.ROWS + " tiles).");
} catch (e) {
    console.log("Aviso: mapa_arena.js não carregado: " + e.message);
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
let vulcoes = [];
let chuvasServidor = [];
let lacaios = {};
let petRespawnTimer = {};
let bandas = {};
let bateriaCanal = {};
let rajadaCanal = {};
let aurasSagradas = {};
let cooldownAuraSagrada = {};
let cooldownRessurreicao = {};
let dropsChao = [];
// ===== LADINO: zonas de gás venenoso (Névoa Venenosa) =====
// zona = { id, x, y, mapa, raio, tempo (ticks restantes), duracao (ticks), ownerId, danoBase }
let gasesVeneno = [];
let gasVenenoSeq = 0;

// ===== NOVAS CLASSES (v1.31): zonas de chão persistentes =====
// caixa de ferramentas (DroneMaster), chamas/poças/tornados/poços (Arqueiro Arcano),
// redes de arame (Sniper). Cada zona segue o MESMO padrão das gasesVeneno.
let caixasFerramentas = [];
let chuvasCometas = [];        // ARQUEIRO ASTRAL: chuva de cometas (4s DoT)
let orbeConstelacoes = [];     // ARQUEIRO ASTRAL: orbe de constelação (cativeiro 2s + implosão)
let redesSniper = [];
let seqZonaNova = 0;

// ===== MOITAS DE MATO (Sniper — Camuflagem Natural) =====
// Zonas fixas de camuflagem detectadas pelo SERVIDOR (nunca pelo cliente).
// Espalhadas por todos os mapas/biomas EXCETO Cidade e Arena.
const MOITAS_SNIPER = [
    // green
    { x: 4200,  y: 1500,  raio: 100 },
    { x: 8200,  y: 3800,  raio: 95  },
    { x: 12800, y: 6200,  raio: 100 },
    { x: 15600, y: 10500, raio: 95  },
    { x: 11200, y: 15000, raio: 100 },
    { x: 6600,  y: 13000, raio: 95  },
    { x: 2400,  y: 9800,  raio: 100 },
    { x: 16800, y: 2600,  raio: 95  },
    // desert
    { x: 20000, y: 4000,  raio: 100 },
    { x: 26000, y: 8000,  raio: 95  },
    { x: 32000, y: 18000, raio: 100 },
    { x: 38000, y: 26000, raio: 95  },
    { x: 44000, y: 12000, raio: 100 },
    { x: 23000, y: 22000, raio: 95  },
    { x: 47000, y: 30000, raio: 100 },
    { x: 47500, y: 5000,  raio: 95  },
    // pantano
    { x: 51000, y: 1500,  raio: 95  },
    { x: 52500, y: 4500,  raio: 100 },
    { x: 54000, y: 7200,  raio: 95  },
    { x: 55500, y: 2000,  raio: 100 },
    { x: 57200, y: 6000,  raio: 95  },
    // caverna / DG
    { x: 58400, y: 900,  raio: 90 },
    { x: 59050, y: 700,  raio: 90 },
    { x: 59550, y: 1400, raio: 90 }
];
const SNIPER_DETECTION_RADIUS = 420;      // Skill 4: raio de detecção de invisíveis
const DRONE_MAX_DISTANCE_FROM_OWNER = 340; // DroneMaster: distância máxima do Drone ao dono

function sniperNoMato(x, y) {
    for (let m of MOITAS_SNIPER) {
        if (Math.hypot(x - m.x, y - m.y) <= m.raio) return m;
    }
    return null;
}

// Bandeiras de spawn criadas por admins (persistidas em spawn_flags.json)
let bandeirasSpawn = (spawnsAdmin && typeof spawnsAdmin.carregarBandeiras === 'function') ? spawnsAdmin.carregarBandeiras() : [];
let bandeirasInicializadas = false;
const MAP_VFX_FILE = path.join(__dirname, 'map_vfx.json');
let mapVfx = [];
try { mapVfx = JSON.parse(fs.readFileSync(MAP_VFX_FILE, 'utf8') || '[]'); if (!Array.isArray(mapVfx)) mapVfx = []; } catch (e) { mapVfx = []; }

const MAP_OBJETOS_FILE = path.join(__dirname, 'map_objetos.json');
let mapObjetos = [];
try { mapObjetos = JSON.parse(fs.readFileSync(MAP_OBJETOS_FILE, 'utf8') || '[]'); if (!Array.isArray(mapObjetos)) mapObjetos = []; } catch (e) { mapObjetos = []; }

function salvarMapVfx() { try { fs.writeFileSync(MAP_VFX_FILE, JSON.stringify(mapVfx, null, 2), 'utf8'); } catch (e) { console.error('Erro ao salvar map_vfx.json:', e.message); } }
function broadcastMapVfx() {
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'map_vfx', vfx: mapVfx }));
    });
}
function salvarMapObjetos() { try { fs.writeFileSync(MAP_OBJETOS_FILE, JSON.stringify(mapObjetos, null, 2), 'utf8'); } catch (e) { console.error('Erro ao salvar map_objetos.json:', e.message); } }
function broadcastMapObjetos() {
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'map_objetos', objetos: mapObjetos }));
    });
}
}

const WORLD_WIDTH = 65040;
const WORLD_HEIGHT = 36000;
const LARGURA_VERDE = 18000; // Fase 1 (mapa verde — 10x maior)
const LARGURA_DESERTO = 50000; // Fase 2 (deserto — 20x maior)
const LARGURA_PANTANO = 58000; // Fase 3 (pântano — 5x maior)
const LARGURA_CAVERNA = 58000; // Fase 4 (caverna / DG) - começa aqui
const FIM_CAVERNA = 59800;
const LARGURA_CIDADE = 59800; // Fase 5 (cidade separada)
const FIM_CIDADE = 61174;
const LARGURA_ARENA = 63800; // Fase 6 (arena, apos a cidade)
const FIM_ARENA = 65040;
const ALTO_VERDE = 18000, ALTO_DESERTO = 36000, ALTO_PANTANO = 9000, ALTO_CAVERNA = 1800, ALTO_CIDADE = 1145, ALTO_ARENA = 1240;
const CIDADE_SPAWN_X = 60474, CIDADE_SPAWN_Y = 640;
// ATENCAO: cada ponto precisa ficar FORA do raio do portal de retorno do mapa,
// senao o cliente detecta o portal e dispara transicao falsa (tela preta).
// arena: 64180/460 = PONTO_CHEGADA de mapa_arena.js (portal fica em 63980/460, r=62).
const PONTOS_TELEPORTE = { green: { x: 5000, y: 1200 }, desert: { x: 18300, y: 4500 }, pantano: { x: 50200, y: 1000 }, caverna: { x: 58080, y: 900 }, cidade: { x: CIDADE_SPAWN_X, y: CIDADE_SPAWN_Y }, arena: { x: 64180, y: 460 } };

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

function tempoAtaqueBasico(p, baseMs) {
    if (!baseMs || baseMs <= 0) return 0;
    return Math.max(120, Math.round(baseMs * multiplicadorVelocidadeAtaque(p)));
}

// ===== VELOCIDADE DE ATAQUE (fonte central ÚNICA do attack speed) =====
// Multiplica o INTERVALO real do ataque básico: 1.0 = base; < 1.0 = mais rápido.
// Fontes (não existe atributo distribuível de attack speed):
//   - Buff Grito de Guerra: -10% de intervalo (regra já existente, mantida)
//   - Equipamentos com status 'velocidadeAtaque': cada ponto = -1% de intervalo
//     por peça (máx. 20% por peça)
// Limites de segurança: intervalo nunca abaixo de 120ms e nunca acima do base.
function multiplicadorVelocidadeAtaque(p) {
    if (!p) return 1;
    let mult = 1;
    if (efeitos && efeitos.temEfeito(p, 'gritoDeGuerra')) mult *= 0.90;
    if (p.inventario && p.inventario.slots) {
        for (let s in p.inventario.slots) {
            let it = p.inventario.slots[s];
            if (it && it.status && typeof it.status.velocidadeAtaque === 'number' && it.status.velocidadeAtaque > 0) {
                mult *= (1 - Math.min(0.20, it.status.velocidadeAtaque / 100));
            }
        }
    }
    if (!Number.isFinite(mult) || mult <= 0) mult = 0.4;
    return Math.max(0.4, Math.min(1, mult));
}

// ===== ATAQUE BÁSICO AUTOMÁTICO: VALIDAÇÃO DE ALVO (server-authoritative) =====
// O cliente apenas solicita com { alvoTipo: 'slime'|'boss', alvoId }. O servidor
// valida existência, vida, mesmo mapa e distância REAL (quadrada) antes de aplicar
// dano. Auto-ataque NUNCA mira em jogadores (PvP segue as regras atuais).
function alcanceAtaqueBasicoClasse(p) {
    if (!p) return 300;
    if (p.classe === 'arqueiro') return 250;
    if (p.classe === 'roqueiro') return 200;
    if (p.classe === 'guerreiro') return 100;
    if (p.classe === 'barbaro') return 100;
    if (p.classe === 'mago') return 200;
    if (p.classe === 'summoner') return 190;
    if (p.classe === 'curandeiro') return 200;
    if (p.classe === 'ladino') return 110;
    return 300;
}

// Tabela de tempo base do ataque básico por classe (espelha o cliente).
// "Diminuir attack speed em X%" = intervalo base / (1 - X):
//   mago 300/0.5=600 · summoner 300/0.2=1500 · arqueiro 300/0.7≈430
//   curandeiro 300/0.5=600 · roqueiro 300/0.4=750 · barbaro 350/0.6≈580 · guerreiro 350
function tempoBaseAtaqueBasico(p) {
    if (!p) return 300;
    if (p.classe === 'guerreiro') return 350;
    if (p.classe === 'barbaro') return 580;
    if (p.classe === 'mago') return 600;
    if (p.classe === 'summoner') return 1500;
    if (p.classe === 'arqueiro') return 430;
    if (p.classe === 'curandeiro') return 600;
    if (p.classe === 'roqueiro') return 750;
    if (p.classe === 'ladino') return 400;
    return 300;
}

function obterAlvoAtaqueServidor(alvoTipo, alvoId) {
    if (alvoTipo === 'slime') {
        for (let s of slimes) { if (s.id === alvoId && s.hp > 0) return s; }
        return null;
    }
    if (alvoTipo === 'boss') {
        for (let b of bosses) { if (b.id === alvoId && b.hp > 0) return b; }
        return null;
    }
    return null;
}

function validarAtaqueBasicoAlvo(p, alvoTipo, alvoId) {
    if (!p || p.hp <= 0) return null;
    if (!alvoTipo || !alvoId) return null;
    let alvo = obterAlvoAtaqueServidor(alvoTipo, alvoId);
    if (!alvo) return null;
    let px = p.x + PLAYER_OFFSET_X;
    let py = p.y + PLAYER_OFFSET_Y;
    if (mapaPorCoordenada(px) !== mapaPorCoordenada(alvo.x)) return null;
    let alc = alcanceAtaqueBasicoClasse(p);
    let dx = alvo.x - px;
    let dy = alvo.y - py;
    if (dx * dx + dy * dy > alc * alc) return null;
    return alvo;
}

function atualizarBonusMaxHpGritoGuerra(p) {
    if (!p) return;
    let baseMax = calcularMaxHp(p);
    p.maxHp = baseMax + (p.gritoGuerraBonus || 0);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
}

function aliadoNaAura(alvoId) {
    let alvo = players[alvoId];
    if (!alvo || alvo.hp <= 0) return null;
    for (let healerId in aurasSagradas) {
        let aura = aurasSagradas[healerId];
        let healer = players[healerId];
        if (!aura.ativa || !healer || healer.hp <= 0) continue;
        let aliado = alvoId === healerId || (healer.partyId && alvo.partyId === healer.partyId);
        if (aliado && Math.hypot(alvo.x - healer.x, alvo.y - healer.y) <= aura.raio) return aura;
    }
    return null;
}

function transmitirAura(tipo, healerId, extra) {
    let msg = Object.assign({ type: tipo, id: healerId }, extra || {});
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(msg));
    });
}

function desativarAuraSagrada(healerId, motivo) {
    let aura = aurasSagradas[healerId];
    if (!aura) return;
    aura.ativa = false;
    delete aurasSagradas[healerId];
    if (players[healerId]) players[healerId].auraSagradaAtiva = false;
    if (motivo === 'mana_baixa') cooldownAuraSagrada[healerId] = Date.now() + 10000;
    transmitirAura('action_aura_sagrada_end', healerId, { motivo: motivo || 'manual' });
}

function tentarRessurreicaoAutomatica(alvoId) {
    let alvo = players[alvoId];
    if (!alvo || alvo.hp > 0) return false;
    let agora = Date.now();
    for (let healerId in players) {
        let healer = players[healerId];
        if (!healer || healer.classe !== 'curandeiro' || healer.hp <= 0) continue;
        if ((cooldownRessurreicao[healerId] || 0) > agora) continue;
        if (Math.hypot(alvo.x - healer.x, alvo.y - healer.y) > 190) continue;
        alvo.hp = Math.max(1, Math.round(alvo.maxHp * 0.35));
        alvo.stunTimer = 0;
        cooldownRessurreicao[healerId] = agora + 600000;
        transmitirAura('action_ressurreicao_automatica', healerId, {
            alvoId: alvoId,
            x: alvo.x + 12,
            y: alvo.y + 16,
            cooldownMs: 600000
        });
        return true;
    }
    return false;
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

// v1.30.3: avisa o cliente quando uma skill é rejeitada por FORA DE ALCANCE
// (o cliente usa isso para mostrar "Fora de alcance!" e cancelar o cooldown visual).
function avisaForaAlcance(ws, skill) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'skill_aviso', skill: skill || '', motivo: 'fora_alcance' }));
}

// ==================================================================
// NOVAS CLASSES (v1.31) — HELPERS COMPARTILHADOS
// ==================================================================

// Aplica ESCUDO ABSORVENTE (absorve dano até esgotar OU expirar).
// `quantidade` e `duracaoMs` são validados no servidor.
function darEscudoAbsorvente(p, quantidade, duracaoMs) {
    if (!p || p.hp <= 0) return false;
    p.escudoAbsoluto = Math.max(p.escudoAbsoluto || 0, Math.round(quantidade));
    p.escudoAbsolutoMax = p.escudoAbsoluto;
    p.escudoAbsolutoExpirador = Date.now() + duracaoMs;
    let donoId = null;
    for (let pid in players) { if (players[pid] === p) { donoId = pid; break; } }
    const wsD = donoId ? playerSockets[donoId] : null;
    if (wsD && wsD.readyState === WebSocket.OPEN) {
        wsD.send(JSON.stringify({ type: 'escudo_sync', escudo: p.escudoAbsoluto, escudoMax: p.escudoAbsolutoMax, expiraEm: p.escudoAbsolutoExpirador - Date.now() }));
    }
    // Buff "Escudo de Energia": barra branca sobre o HP (visível no dono E nos aliados)
    if (efeitos && typeof efeitos.aplicarEfeito === 'function') {
        const ticks = Math.max(1, Math.round(duracaoMs / 50));
        const frac = (p.maxHp > 0) ? Math.min(1, p.escudoAbsoluto / p.maxHp) : 0.5;
        efeitos.aplicarEfeito(p, 'escudoEnergia', ticks, frac);
        sincronizarEfeitos(donoId, p);
    }
    return true;
}

// Reenvia os efeitos/status de um jogador para TODOS os clientes (visuais multiplayer:
// ícones de buff/debuff e barra de escudo aparecem para o dono E para os aliados)
function sincronizarEfeitos(pid, p) {
    if (!efeitos || !p || !pid || !wss) return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'efeitos_sync', id: pid, efeitos: efeitos.exporEfeitos(p) }));
        }
    });
}

// Zona de chão com remoção + broadcast de fim (padrão gasesVeneno)
function removerZonaNova(array, index, tipoFim) {
    const z = array[index];
    array.splice(index, 1);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: tipoFim, id: z.id, x: z.x, y: z.y }));
        }
    });
}

function mesmosLados(angA, angB, margem) {
    return Math.abs(Math.atan2(Math.sin(angA - angB), Math.cos(angA - angB))) <= margem;
}

// Alvos válidos (slimes) num raio — lista unificada para as novas classes
function slimesNoRaio(x, y, raio, mapa) {
    const alvos = [];
    for (let s of slimes) {
        if (s.hp <= 0 || s.flagPassivo) continue;
        if (mapa !== undefined && mapaPorCoordenada(s.x) !== mapa) continue;
        if (Math.hypot(s.x - x, s.y - y) <= raio) alvos.push(s);
    }
    return alvos;
}

// ==== DRONEMASTER ====
function danoBasicoDrone(p) { return dmgSkill(p, 'drone_dm', 13); }
function danoBasicoRobo(p) { return dmgSkill(p, 'tita_dm', 15); }

function posicaoDrone(p) {
    // Posição orbital do Drone relativa ao dono (server-authoritative para snapshot)
    const alvoExiste = (p.dmAssaltoTimer > 0 && p.dmDroneAlvo);
    if (p.dmAssaltoTimer > 0) return; // o robô tem posição própria
    const raio = 42;
    const cx = p.x + PLAYER_OFFSET_X, cy = p.y + PLAYER_OFFSET_Y;
    p.dmOrbitaAng = (p.dmOrbitaAng || 0) + 0.06;
    const tx = cx + Math.cos(p.dmOrbitaAng) * raio;
    const ty = cy + Math.sin(p.dmOrbitaAng) * raio - 14;
    // suavização (nunca teleporta)
    p.dmDroneX = p.dmDroneX + (tx - p.dmDroneX) * 0.25;
    p.dmDroneY = p.dmDroneY + (ty - p.dmDroneY) * 0.25;
}

function finalizarCamuflagemSniper(p, pid, motivo) {
    if (!p || !p.snCamuflado) return;
    p.snCamuflado = false;
    if (efeitos) efeitos.removerEfeito(p, 'camuflagem');
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_sniper_camuflagem_fim', id: pid, motivo: motivo || 'ataque' }));
        }
    });
    sincronizarEfeitos(pid, p);
}

// ==== SNIPER: congela os cooldowns enquanto camuflado (server-side) ====
function congelarCooldownsSniper(p, ticks) {
    if (!p || !p.snCamuflado) return;
    if (p.snAimCooldown > 0) p.snAimCooldown += ticks;
    if (p.snRedeCooldown > 0) p.snRedeCooldown += ticks;
    if (p.snPosicaoCd > 0) p.snPosicaoCd += ticks;
}



// congelar inimigos numa zona (slimes/bosses/players PvP)
function congelarNaZona(z, tempoTicks, danoBase, ownerId) {
    slimes.forEach(s => {
        if (s.hp > 0 && mapaPorCoordenada(s.x) === z.mapa && Math.hypot(s.x - z.x, s.y - z.y) <= z.raio) {
            s.stunTimer = Math.max(s.stunTimer || 0, tempoTicks);
            efeitos.aplicarEfeito(s, 'congelado', tempoTicks, 1);
        }
    });
    bosses.forEach(b => {
        if (b.hp > 0 && mapaPorCoordenada(b.x) === z.mapa && Math.hypot(b.x - z.x, b.y - z.y) <= z.raio) {
            b.stunTimer = Math.max(b.stunTimer || 0, tempoTicks);
            efeitos.aplicarEfeito(b, 'congelado', tempoTicks, 1);
        }
    });
    // PvP: paralisia (não pode se mover)
    (function () {
        const dono = players[ownerId];
        if (!dono || !dono.pvpAtivo) return;
        for (let pId in players) {
            if (pId === ownerId) continue;
            const p2 = players[pId];
            if (p2.pvpAtivo && p2.hp > 0 && mapaPorCoordenada(p2.x) === z.mapa && Math.hypot(p2.x - z.x, p2.y - z.y) <= z.raio) {
                efeitos.aplicarEfeito(p2, 'paralisia', tempoTicks, 1);
            }
        }
    })();
}

function causarDanoZona(z, danoBase) {
    slimes.forEach(s => {
        if (s.hp > 0 && mapaPorCoordenada(s.x) === z.mapa && Math.hypot(s.x - z.x, s.y - z.y) <= z.raio) {
            registrarDanoMonstro(s, z.ownerId, danoBase, 'dot');
        }
    });
    danoEmBosses(z.x, z.y, z.raio, z.ownerId, danoBase, 'skill', 'dot');
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
        let chanceCritico = 0.05 + (getAtr(p, 'destreza') - 1) * 0.01;
        if (efeitos && efeitos.temEfeito(p, 'gritoDeGuerra')) {
            chanceCritico += 0.30;
        }
        // DRONEMASTER — PROTOCOLO TITÃ: +30% dano e +20% de chance de crítico
        if (p.classe === 'dronemaster' && p.dmTitaAtivo) {
            mult *= 1.30;
            chanceCritico += 0.20;
        }
        // SNIPER — POSIÇÃO DE FRANCO-ATIRADOR: +100% dano (×2)
        if (p.classe === 'sniper' && p.snPosicao) {
            mult *= 2.0;
        }
        if (Math.random() < chanceCritico) {
            critMult = 1.5 + (getAtr(p, 'destreza') - 1) * 0.03;
            if (efeitos && efeitos.temEfeito(p, 'gritoDeGuerra')) {
                critMult *= 1.5;
            }
        }
    }
    // Debuffs/buffs alteram o dano causado
    if (efeitos) {
        if (efeitos.temEfeito(p, 'reducaoAtk')) mult *= 0.75; // Enfraquecido: -25%
        if (efeitos.temEfeito(p, 'fervor')) mult *= 1.25;     // Fervor: +25%
    }
    if (aliadoNaAura(autorId)) mult *= 1.05;
    if (p && p.classe === 'barbaro' && p.maxHp > 0) {
        let pctHp = (p.hp > 0 ? p.hp : p.maxHp) / p.maxHp;
        if (pctHp <= 0.20) mult *= 1.15;
        else if (pctHp <= 0.40) mult *= 1.10;
        else if (pctHp <= 0.60) mult *= 1.05;
    }
    // LADINO — CAMUFLAGEM SOMBRIA: o PRIMEIRO hit real (que causa dano) recebe +100%
    // e consome a invisibilidade na hora. Só hits com tipoOrigem 'player' consomem;
    // DoT ('dot') e pet ('pet') nunca tocam no bônus.
    if (tipoOrigem === 'player' && p && p.classe === 'ladino' && p.ladinoInvisivel && p.ladinoInvisivelBonus) {
        mult *= 2;
        finalizarInvisibilidadeLadino(p, autorId);
    }
    return { dano: Math.round(quantidade * mult * critMult), critico: critMult > 1 };
}

// ===== LADINO: máquina de estados e helpers compartilhados =====

// Encerra a invisibilidade da Camuflagem Sombria (por hit, por tempo ou morte).
// Regra: o COOLDOWN da skill 3 só começa QUANDO a invisibilidade termina.
function finalizarInvisibilidadeLadino(player, pid) {
    if (!player) return;
    if (player.ladinoInvisivel) {
        player.ladinoInvisivel = false;
        player.ladinoInvisivelBonus = false;
        player.ladinoInvisivelTimer = 0;
    }
    player.ladinoCamuflagemDelay = 0;
    if (!player.ladinoCamuflagemCdAtivo) {
        player.ladinoCamuflagemCdAtivo = true;
        player.ladinoCamuflagemCooldown = Date.now() + 10000; // CD 10s inicia ao sair da invis
        setTimeout(() => {
            if (players[pid]) players[pid].ladinoCamuflagemCdAtivo = false;
        }, 10000);
    }
    if (efeitos) efeitos.removerEfeito(player, 'invisivel');
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_ladino_invisivel', id: pid, ativo: false }));
        }
    });
    sincronizarEfeitos(pid, player);
}

// PASSIVA LÂMINAS SANGRENTAS: 20% de chance → sangramento 20% do dano físico/s por 5s.
// Reutiliza o efeito 'sangramento' + autorId para creditar o dano do DoT ao Ladino.
function tentarSangrarLadino(alvo, autorId, danoFisico) {
    if (!alvo || !alvo.hp || alvo.hp <= 0 || !danoFisico || danoFisico <= 0) return;
    const p = players[autorId];
    if (!p || p.classe !== 'ladino') return;
    if (Math.random() >= 0.20) return;
    const danoPorSegundo = Math.max(1, Math.round(danoFisico * 0.20));
    efeitos.aplicarEfeito(alvo, 'sangramento', 100, danoPorSegundo); // 5s de DoT
    const ef = efeitos.pegarEfeito(alvo, 'sangramento');
    if (ef) ef.autorId = autorId;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'action_ladino_sangue', x: alvo.x, y: alvo.y, alvoId: alvo.id }));
        }
    });
}

// Coleta alvos válidos para a Dança das Adagas (até `max` por tipo; mescla slimes+bosses).
// Retorna array de { id, tipo } — entidades vivas, mesmo mapa, dentro do alcance.
function coletarAlvosDancaLadino(player, alcance) {
    if (!player) return [];
    const px = player.x + PLAYER_OFFSET_X;
    const py = player.y + PLAYER_OFFSET_Y;
    const mapa = mapaPorCoordenada(px);
    const candidatos = [];
    slimes.forEach(s => {
        if (s.hp > 0 && mapaPorCoordenada(s.x) === mapa) {
            const d2 = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
            if (d2 <= alcance * alcance) candidatos.push({ id: s.id, tipo: 'slime', x: s.x, y: s.y });
        }
    });
    bosses.forEach(b => {
        if (b.hp > 0 && mapaPorCoordenada(b.x) === mapa) {
            const d2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
            if (d2 <= alcance * alcance) candidatos.push({ id: b.id, tipo: 'boss', x: b.x, y: b.y });
        }
    });
    // Embaralha (Fisher–Yates) e depois garante a prioridade por proximidade
    for (let i = candidatos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = candidatos[i]; candidatos[i] = candidatos[j]; candidatos[j] = tmp;
    }
    candidatos.sort((a, b) => {
        const da = (a.x - px) * (a.x - px) + (a.y - py) * (a.y - py);
        const db = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
        return da - db;
    });
    return candidatos;
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
    if (x < LARGURA_ARENA) {
        return false;
    }
    if (x < FIM_ARENA) {
        if (y >= ALTO_ARENA) return false;
        if (mapaArena && mapaArena.colideArena(x, y)) return false;
        return true;
    }
    return false;
}

// Validação central de posição do jogador. As coordenadas do jogador são o
// canto superior esquerdo; os mapas/colisões recebem o centro físico.
const PLAYER_OFFSET_X = 12;
const PLAYER_OFFSET_Y = 16;
const PLAYER_COLLISION_RADIUS = 12;
const MAX_PLAYER_COLLISION_STEP = 12;

function mapaPorCoordenada(x) {
    if (!Number.isFinite(x)) return null;
    if (x < LARGURA_VERDE) return 'green';
    if (x < LARGURA_DESERTO) return 'desert';
    if (x < LARGURA_PANTANO) return 'pantano';
    if (x < FIM_CAVERNA) return 'caverna';
    if (x < FIM_CIDADE) return 'cidade';
    if (x >= LARGURA_ARENA && x < FIM_ARENA) return 'arena';
    return null;
}

function entidadeNoMapa(entidade, mapa) {
    return entidade && mapaPorCoordenada(entidade.x) === mapa;
}

function filtrarPorMapa(lista, mapa) {
    return Array.isArray(lista) ? lista.filter(function (item) { return entidadeNoMapa(item, mapa); }) : [];
}

function jogadorPodeUsarPortalMapa(player, destino) {
    if (!player) return false;
    const mapaAtual = mapaPorCoordenada(player.x + PLAYER_OFFSET_X);
    const cx = player.x + PLAYER_OFFSET_X;
    const cy = player.y + PLAYER_OFFSET_Y;
    const perto = function (x, y, raio) { return Math.hypot(cx - x, cy - y) <= (raio || 150); };
    if (destino === 'green') {
        return (mapaAtual === 'cidade' && (perto(60474, 640) || perto(60487, 1080))) ||
            (mapaAtual === 'desert' && perto(18090, 4500, 260)) ||
            (mapaAtual === 'caverna' && perto(58080, 820));
    }
    if (destino === 'desert') {
        return (mapaAtual === 'cidade' && perto(60474, 640)) ||
            (mapaAtual === 'green' && perto(17080, 4500));
    }
    if (destino === 'pantano' || destino === 'caverna' || destino === 'arena') {
        return mapaAtual === 'cidade' && perto(60474, 640);
    }
    if (destino !== 'cidade') return false;
    if (mapaAtual === 'cidade') return true;
    const portaisRetorno = [
        { x: 5000, y: 1200, r: 150 },
        { x: 52000, y: 4500, r: 150 },
        { x: 63980, y: 460, r: 150 }
    ];
    return portaisRetorno.some(function (portal) { return Math.hypot(cx - portal.x, cy - portal.y) <= portal.r; });
}

function distanciaEntidadesQuadrada(a, b) {
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return Infinity;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

const DISTANCIA_RETORNO_INIMIGO = 720;
const DISTANCIA_TOLERANCIA_ORIGEM = 28;

function garantirOrigemInimigo(inimigo) {
    if (!inimigo) return;
    if (!Number.isFinite(inimigo.origemX)) inimigo.origemX = inimigo.x;
    if (!Number.isFinite(inimigo.origemY)) inimigo.origemY = inimigo.y;
    if (!Number.isFinite(inimigo.patrulhaFase)) inimigo.patrulhaFase = Math.random() * Math.PI * 2;
}

function moverInimigoParaOrigem(inimigo, fatorLentidao) {
    garantirOrigemInimigo(inimigo);
    const dx = inimigo.origemX - inimigo.x;
    const dy = inimigo.origemY - inimigo.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia <= DISTANCIA_TOLERANCIA_ORIGEM) {
        inimigo.x = inimigo.origemX;
        inimigo.y = inimigo.origemY;
        inimigo.retornandoAoLar = false;
        inimigo.patrolTimer = 0;
        inimigo.dx = 0;
        inimigo.dy = 0;
        return true;
    }

    const velocidade = Math.max(1.2, (inimigo.velocidade || 2.2) * 0.85) * fatorLentidao;
    const passo = Math.min(velocidade, distancia);
    const proximoX = inimigo.x + (dx / distancia) * passo;
    const proximoY = inimigo.y + (dy / distancia) * passo;
    if (podeAndar(proximoX, proximoY)) {
        inimigo.x = proximoX;
        inimigo.y = proximoY;
    } else {
        inimigo.retornandoAoLar = false;
        inimigo.patrolTimer = 0;
    }
    return true;
}

function podeEntidadeAtacarAlvo(entidade, alvo, alcance) {
    if (!entidade || !alvo || alvo.hp <= 0) return false;
    // LADINO invisível (Camuflagem Sombria): inimigos não o enxergam —
    // não miram nele (agro) nem acertam ataques normais/projéteis.
    if (efeitos && efeitos.temEfeito(alvo, 'invisivel')) return false;
    if (mapaPorCoordenada(entidade.x) !== mapaPorCoordenada(alvo.x)) return false;
    if (!Number.isFinite(alcance)) return false;
    return distanciaEntidadesQuadrada(entidade, alvo) <= alcance * alcance;
}

function alvoDentroDaVisao(entidade, alvo) {
    const visao = Number(entidade && entidade.aggroRange);
    return podeEntidadeAtacarAlvo(entidade, alvo, Number.isFinite(visao) ? visao : 320);
}

// CEGUEIRA do Ladino (Névoa Venenosa): monstro cego NÃO consegue acertar
// ataques normais (melee/ranged). Habilidades especiais/mágicas continuam.
function monstroPodeAtacar(entidade) {
    if (!entidade) return true;
    return !(efeitos && efeitos.temEfeito(entidade, 'cegueira'));
}

function limitesMapaJogador(cx, cy) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    if (cx < 0 || cy < 0) return null;

    if (cx < LARGURA_VERDE) return { minX: 0, maxX: LARGURA_VERDE, maxY: ALTO_VERDE };
    if (cx < LARGURA_DESERTO) return { minX: LARGURA_VERDE, maxX: LARGURA_DESERTO, maxY: ALTO_DESERTO };
    if (cx < LARGURA_PANTANO) return { minX: LARGURA_DESERTO, maxX: LARGURA_PANTANO, maxY: ALTO_PANTANO };
    if (cx < FIM_CAVERNA) return { minX: LARGURA_CAVERNA, maxX: FIM_CAVERNA, maxY: ALTO_CAVERNA };
    if (cx < FIM_CIDADE) return { minX: LARGURA_CIDADE, maxX: FIM_CIDADE, maxY: ALTO_CIDADE };
    if (cx >= LARGURA_ARENA && cx < FIM_ARENA) return { minX: LARGURA_ARENA, maxX: FIM_ARENA, maxY: ALTO_ARENA };
    return null;
}

function colideMapaJogador(cx, cy) {
    if (cx < LARGURA_VERDE) return false;
    if (cx < LARGURA_DESERTO) return !!(mapaDeserto && mapaDeserto.colideDeserto(cx, cy, PLAYER_COLLISION_RADIUS));
    if (cx < LARGURA_PANTANO) return !!(mapaPantano && mapaPantano.colidePantano(cx, cy, PLAYER_COLLISION_RADIUS));
    if (cx < FIM_CAVERNA) return !!(mapaCaverna && mapaCaverna.colideCaverna(cx, cy, PLAYER_COLLISION_RADIUS));
    if (cx < FIM_CIDADE) return !!(mapaCidade && mapaCidade.colideCidade(cx, cy, PLAYER_COLLISION_RADIUS));
    if (cx >= LARGURA_ARENA && cx < FIM_ARENA) return !!(mapaArena && mapaArena.colideArena(cx, cy, PLAYER_COLLISION_RADIUS));
    return true;
}

function posicaoJogadorValida(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const cx = x + PLAYER_OFFSET_X;
    const cy = y + PLAYER_OFFSET_Y;
    const limites = limitesMapaJogador(cx, cy);
    if (!limites) return false;
    if (cx - PLAYER_COLLISION_RADIUS < limites.minX || cx + PLAYER_COLLISION_RADIUS >= limites.maxX ||
        cy - PLAYER_COLLISION_RADIUS < 0 || cy + PLAYER_COLLISION_RADIUS >= limites.maxY) return false;
    return !colideMapaJogador(cx, cy);
}

function validarMovimentoJogador(player, targetX, targetY, opcoes) {
    opcoes = opcoes || {};
    if (!player || !Number.isFinite(targetX) || !Number.isFinite(targetY)) {
        return { aceito: false, bloqueado: true, x: player ? player.x : targetX, y: player ? player.y : targetY };
    }

    let inicioX = Number(player.x);
    let inicioY = Number(player.y);
    if (!Number.isFinite(inicioX) || !Number.isFinite(inicioY)) {
        return { aceito: false, bloqueado: true, x: inicioX, y: inicioY };
    }

    const mapaInicial = mapaPorCoordenada(inicioX + PLAYER_OFFSET_X);

    if (!posicaoJogadorValida(inicioX, inicioY)) {
        const posicaoEmergencia = encontrarPosicaoJogadorSegura(player, inicioX, inicioY) ||
            (posicaoJogadorValida(CIDADE_SPAWN_X, CIDADE_SPAWN_Y) ? { x: CIDADE_SPAWN_X, y: CIDADE_SPAWN_Y } : null);
        if (!posicaoEmergencia) return { aceito: false, bloqueado: true, x: inicioX, y: inicioY };
        inicioX = posicaoEmergencia.x;
        inicioY = posicaoEmergencia.y;
        player.x = inicioX;
        player.y = inicioY;
    }

    let dx = targetX - inicioX;
    let dy = targetY - inicioY;
    const distancia = Math.hypot(dx, dy);
    const maxDistance = Number(opcoes.maxDistance);
    if (Number.isFinite(maxDistance) && distancia > maxDistance && distancia > 0) {
        const fator = maxDistance / distancia;
        dx *= fator;
        dy *= fator;
        targetX = inicioX + dx;
        targetY = inicioY + dy;
    }

    const passos = Math.max(1, Math.ceil(Math.hypot(targetX - inicioX, targetY - inicioY) / (opcoes.maxStep || MAX_PLAYER_COLLISION_STEP)));
    let ultimoX = inicioX;
    let ultimoY = inicioY;
    for (let passo = 1; passo <= passos; passo++) {
        const progresso = passo / passos;
        const proximoX = inicioX + (targetX - inicioX) * progresso;
        const proximoY = inicioY + (targetY - inicioY) * progresso;
        if (!posicaoJogadorValida(proximoX, proximoY)) {
            return { aceito: false, bloqueado: true, parcial: ultimoX !== inicioX || ultimoY !== inicioY, x: ultimoX, y: ultimoY };
        }
        if (mapaPorCoordenada(proximoX + PLAYER_OFFSET_X) !== mapaInicial) {
            return { aceito: false, bloqueado: true, parcial: ultimoX !== inicioX || ultimoY !== inicioY, x: ultimoX, y: ultimoY };
        }
        ultimoX = proximoX;
        ultimoY = proximoY;
    }
    return { aceito: true, bloqueado: false, parcial: false, x: ultimoX, y: ultimoY };
}

function validarDestinoJogador(targetX, targetY) {
    if (!posicaoJogadorValida(targetX, targetY)) {
        return { aceito: false, bloqueado: true, x: targetX, y: targetY };
    }
    return { aceito: true, bloqueado: false, x: targetX, y: targetY };
}

function encontrarPosicaoJogadorSegura(player, x, y) {
    if (posicaoJogadorValida(x, y)) return { x: x, y: y };
    const raios = [20, 40, 60, 80, 120, 160];
    for (let ri = 0; ri < raios.length; ri++) {
        const raio = raios[ri];
        for (let amostra = 0; amostra < 16; amostra++) {
            const angulo = (amostra / 16) * Math.PI * 2;
            const candidatoX = x + Math.cos(angulo) * raio;
            const candidatoY = y + Math.sin(angulo) * raio;
            if (posicaoJogadorValida(candidatoX, candidatoY)) return { x: candidatoX, y: candidatoY };
        }
    }
    return null;
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
    if (!slime.flagPassivo) {
        const autorP = players[autorId];
        // LADINO invisível / SNIPER camuflado: o dano NÃO revela a posição (sem agro)
        if (!autorP || !(efeitos && (efeitos.temEfeito(autorP, 'invisivel') || efeitos.temEfeito(autorP, 'camuflagem')))) slime.targetId = autorId;
    }
    slime.hp -= danoFinal;
    // LADINO — PASSIVA LÂMINAS SANGRENTAS (20% → sangramento 20% do dano físico/s por 5s)
    if (tipoOrigem === 'player' && danoFinal > 0) tentarSangrarLadino(slime, autorId, danoFinal);
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

    // LADINO — DANÇA DAS ADAGAS: imune a dano durante a sequência de teleportes
    if (jogador.ladinoDancaAtivo) return true;

    // LADINO — CAMUFLAGEM SOMBRIA: invisível = inimigos NÃO o acertam (nem melee,
    // nem projéteis em voo, nem AOE de monstro). PvP usa aplicarDanoPvP (separado).
    if (efeitos && efeitos.temEfeito(jogador, 'invisivel')) return true;

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

    // PASSIVA DO GUERREIRO: RESISTÊNCIA DO ÚLTIMO FÔLEGO
    // <= 50% HP: 5% redução | <= 30% HP: 10% redução | <= 10% HP: 15% redução
    if (jogador.classe === 'guerreiro' && jogador.maxHp > 0) {
        let pctHp = jogador.hp / jogador.maxHp;
        if (pctHp <= 0.10) {
            dano = Math.round(dano * 0.85); // 15% de redução de dano
        } else if (pctHp <= 0.30) {
            dano = Math.round(dano * 0.90); // 10% de redução de dano
        } else if (pctHp <= 0.50) {
            dano = Math.round(dano * 0.95); // 5% de redução de dano
        }
    }

    // DRONEMASTER — PROTOCOLO TITÃ: +30% de defesa (dano recebido -30%)
    if (jogador.classe === 'dronemaster' && jogador.dmTitaAtivo) {
        dano = Math.round(dano * 0.70);
    }

    // Debuffs/buffs alteram o dano recebido
    if (efeitos) {
        if (efeitos.temEfeito(jogador, 'reducaoDef')) dano = Math.round(dano * 1.25); // Defesa quebrada: +25%
        if (efeitos.temEfeito(jogador, 'escudo')) dano = Math.round(dano * 0.8);      // Escudo: -20%
        if (jogador.classe === 'barbaro' && jogador.giroDescontroladoTimer > 0) dano = Math.round(dano * 0.90);
        // SONO: qualquer dano recebido acorda o jogador
        if (efeitos.removerEfeito(jogador, 'sono')) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'efeitos_sync', id: pid, efeitos: efeitos.exporEfeitos(jogador) }));
                }
            });
        }
    }
    if (aliadoNaAura(pid)) dano = Math.round(dano * 0.9);
    if (dano < 0) dano = 0;

    if (jogador.escudoAbsoluto > 0) {
        let absorvido = Math.min(jogador.escudoAbsoluto, dano);
        jogador.escudoAbsoluto -= absorvido;
        dano -= absorvido;
        let wsT = playerSockets[pid];
        if (wsT && wsT.readyState === WebSocket.OPEN) {
            wsT.send(JSON.stringify({ type: 'escudo_sync', escudo: jogador.escudoAbsoluto }));
        }
        // Escudo esgotou: remove o buff da barra branca para todos verem
        if (jogador.escudoAbsoluto <= 0 && efeitos && efeitos.removerEfeito(jogador, 'escudoEnergia')) {
            sincronizarEfeitos(pid, jogador);
        }
    }

    jogador.hp -= dano;
    if (jogador.hp < 0) jogador.hp = 0;
    if (jogador.hp <= 0) tentarRessurreicaoAutomatica(pid);
    // DRONEMASTER — PROTOCOLO TITÃ: morrendo na forma Robô NÃO morre definitivamente.
    // Cancela a forma, "revive" com 50% da vida máxima e entra em CD de 5 minutos.
    if (jogador.hp <= 0 && jogador.classe === 'dronemaster' && jogador.dmTitaAtivo && jogador.dmTitaReviveCooldown <= Date.now()) {
        jogador.dmTitaAtivo = false;
        jogador.dmTitaTimer = 0;
        jogador.dmTitaReviveCooldown = Date.now() + 300000; // 5 minutos
        jogador.hp = Math.round(jogador.maxHp * 0.50);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'action_dm_tita_revive', id: pid }));
            }
        });
        const wsT = playerSockets[pid];
        if (wsT && wsT.readyState === WebSocket.OPEN) {
            wsT.send(JSON.stringify({ type: 'hp_sync', hp: jogador.hp, maxHp: jogador.maxHp }));
        }
    }
    return false;
}

// Aplica cura respeitando cortaCura no destinatário
function aplicarCuraAoJogador(pid, quantidade) {
    let p = players[pid];
    if (!p || p.hp <= 0) return;
    let cura = quantidade;
    if (efeitos && efeitos.temEfeito(p, 'cortaCura')) cura = Math.round(cura * 0.5);
    if (aliadoNaAura(pid)) cura = Math.round(cura * 1.10);
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
    // LADINO — PASSIVA LÂMINAS SANGRENTAS em Bosses
    if (tipoOrigem === 'player' && danoFinal > 0) tentarSangrarLadino(boss, autorId, danoFinal);
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
    // LADINO — imune durante a Dança das Adagas (server-side, inclusive PvP)
    if (p2.ladinoDancaAtivo) return;
    // LADINO — CAMUFLAGEM SOMBRIA: primeiro acerto em PvP também consome o bônus +100%
    let atk = players[atkId];
    if (atk && atk.classe === 'ladino' && atk.ladinoInvisivel && atk.ladinoInvisivelBonus) {
        dano = Math.round(dano * 2);
        finalizarInvisibilidadeLadino(atk, atkId);
    }
    if (aliadoNaAura(atkId)) dano = Math.round(dano * 1.05);
    if (aliadoNaAura(defId)) dano = Math.round(dano * 0.90);
    p2.hp -= dano;
    if (p2.hp < 0) p2.hp = 0;
    broadcastDanoFlut(p2.x, p2.y - 20, dano, atkId);
    if (p2.hp <= 0) {
        // DRONEMASTER — PROTOCOLO TITÃ (revive especial em PvP também)
        if (p2.classe === 'dronemaster' && p2.dmTitaAtivo && p2.dmTitaReviveCooldown <= Date.now()) {
            p2.dmTitaAtivo = false;
            p2.dmTitaTimer = 0;
            p2.dmTitaReviveCooldown = Date.now() + 300000;
            p2.hp = Math.round(p2.maxHp * 0.50);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_dm_tita_revive', id: defId }));
                }
            });
            const wsT = playerSockets[defId];
            if (wsT && wsT.readyState === WebSocket.OPEN) {
                wsT.send(JSON.stringify({ type: 'hp_sync', hp: p2.hp, maxHp: p2.maxHp }));
            }
            return;
        }
        if (tentarRessurreicaoAutomatica(defId)) return;
        p2.hp = p2.maxHp;
        const posicaoRessurgimento = encontrarPosicaoJogadorSegura(p2, CIDADE_SPAWN_X, CIDADE_SPAWN_Y);
        p2.x = posicaoRessurgimento ? posicaoRessurgimento.x : CIDADE_SPAWN_X;
        p2.y = posicaoRessurgimento ? posicaoRessurgimento.y : CIDADE_SPAWN_Y;
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
        mob.origemX = flag.x;
        mob.origemY = flag.y;
        mob.retornandoAoLar = false;
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
    const config = spawnsAdmin.TIPOS_MONSTROS[flag.tipo];
    if (config && config.maxQtd) flag.maxQtd = Math.min(flag.maxQtd, config.maxQtd);
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
    const config = spawnsAdmin && spawnsAdmin.TIPOS_MONSTROS[flag.tipo];
    if (config && config.maxQtd) flag.maxQtd = Math.min(flag.maxQtd, config.maxQtd);
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
        mob.origemX = sx;
        mob.origemY = sy;
        mob.retornandoAoLar = false;
        slimes.push(mob);
    }
}

function validarDadosBandeira(data) {
    if (!data || !spawnsAdmin) return null;
    if (!data.tipo || !spawnsAdmin.TIPOS_MONSTROS[data.tipo]) return null;
    let maxQtd = Math.floor(Number(data.maxQtd));
    if (!isFinite(maxQtd) || maxQtd < 1 || maxQtd > 50) return null;
    const tipoConfig = spawnsAdmin.TIPOS_MONSTROS[data.tipo];
    if (tipoConfig.maxQtd) maxQtd = Math.min(maxQtd, tipoConfig.maxQtd);
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
        tauntTimer: 0,
        stunTimer: 0 // stun (Estrela da Morte do Ladino): 40 ticks = 2s
    });
}

criarGolemPedra();

function moverMonstroEspecial(slime, dx, dy, velocidade, fatorLentidao) {
    const distancia = Math.hypot(dx, dy) || 1;
    const passo = velocidade * fatorLentidao;
    const proximoX = slime.x + (dx / distancia) * passo;
    const proximoY = slime.y + (dy / distancia) * passo;
    if (slime.ignoreMapCollision || podeAndar(proximoX, proximoY)) {
        slime.x = proximoX;
        slime.y = proximoY;
    }
}

function dispararProjetilMonstro(slime, alvo, tipo, dano, velocidade, vida) {
    if (!alvo || !podeEntidadeAtacarAlvo(slime, alvo, slime.skillRange || slime.attackRange || 320)) return false;
    const dx = alvo.x - slime.x;
    const dy = alvo.y - slime.y;
    const distancia = Math.hypot(dx, dy) || 1;
    projeteis.push({
        x: slime.x,
        y: slime.y - 10,
        vx: (dx / distancia) * velocidade,
        vy: (dy / distancia) * velocidade,
        vida: vida || 80,
        mapa: mapaPorCoordenada(slime.x),
        tipo: tipo,
        raio: tipo === 'void_laser' ? 7 : 8,
        dano: dano,
        ownerMonstro: slime.id,
        petAlvo: (slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) ? slime.tauntId : null
    });
    return true;
}

function resolverSkillEspecial(slime, alvo) {
    const tx = slime.skillAim ? slime.skillAim.x : (alvo ? alvo.x : slime.x);
    const ty = slime.skillAim ? slime.skillAim.y : (alvo ? alvo.y : slime.y);
    const distancia = Math.hypot(tx - slime.x, ty - slime.y);
    if (distancia > (slime.skillRange || 500) || mapaPorCoordenada(slime.x) !== mapaPorCoordenada(tx)) {
        slime.skillCharging = false;
        slime.skillAim = null;
        return;
    }

    if (slime.skillKind === 'void_laser') {
        dispararProjetilMonstro(slime, { x: tx, y: ty, hp: 1 }, 'void_laser', slime.dano + 12, 18, 55);
    } else {
        const raio = slime.skillKind === 'meteor' ? 105 : 95;
        for (let pid in players) {
            const player = players[pid];
            if (player.hp <= 0 || mapaPorCoordenada(player.x) !== mapaPorCoordenada(slime.x)) continue;
            if (Math.hypot(player.x + 12 - tx, player.y + 16 - ty) > raio) continue;
            if (slime.skillKind === 'web') {
                aplicarDanoJogador(pid, tx, ty, slime.dano);
                efeitos.aplicarEfeito(player, 'lentidao', 100, 0.5);
                player.slowTimer = Math.max(player.slowTimer || 0, 100);
            } else {
                aplicarDanoJogador(pid, tx, ty, slime.dano + 14);
                efeitos.aplicarEfeito(player, 'queimadura', 100, 4);
            }
        }
    }
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'monster_skill_impact', id: slime.id, skill: slime.skillKind, x: tx, y: ty, mapa: mapaPorCoordenada(slime.x) }));
        }
    });
    slime.skillCharging = false;
    slime.skillAim = null;
    slime.skillCooldown = slime.skillCooldownMax || 200;
}

function atualizarMonstroEspecial(slime, alvo, dx, dy, dist, fatorLentidao) {
    const tipo = slime.arquetipo;
    if (!tipo) return false;

    if (slime.skillCharging) {
        slime.skillChargeTimer--;
        if (slime.skillChargeTimer <= 0) resolverSkillEspecial(slime, alvo);
        return true;
    }
    if (slime.skillCooldown > 0) slime.skillCooldown--;

    if (tipo === 'assassin') {
        slime.invisivel = dist > (slime.revealDistance || 250);
    } else {
        slime.invisivel = false;
    }

    if (tipo === 'goblin' && dist < (slime.fleeDistance || 150)) {
        moverMonstroEspecial(slime, -dx, -dy, slime.velocidade || 2.6, fatorLentidao);
        slime.fugindo = true;
        return true;
    }
    slime.fugindo = false;

    if ((tipo === 'web' || tipo === 'meteor' || tipo === 'void_laser') &&
        slime.skillCooldown <= 0 && dist <= (slime.skillRange || 500)) {
        slime.skillKind = tipo;
        slime.skillCharging = true;
        slime.skillChargeMax = tipo === 'web' ? 24 : 36;
        slime.skillChargeTimer = slime.skillChargeMax;
        slime.skillAim = { x: alvo.x, y: alvo.y };
        return true;
    }

    const ataqueDistancia = slime.attackRange || 60;
    if (tipo === 'ranged' || tipo === 'goblin') {
        const preferida = slime.distanciaPreferida || Math.max(ataqueDistancia * 0.7, 220);
        if (dist > preferida + 35) moverMonstroEspecial(slime, dx, dy, slime.velocidade || 2.2, fatorLentidao);
        else if (dist < preferida - 35) moverMonstroEspecial(slime, -dx, -dy, slime.velocidade || 2.2, fatorLentidao);
        slime.attackCooldown++;
        if (slime.attackCooldown > 55 && dist <= ataqueDistancia) {
            // CEGUEIRA: ranged cego não dispara flechas/pedras normais
            if (monstroPodeAtacar(slime) && dispararProjetilMonstro(slime, alvo, tipo === 'goblin' ? 'goblin_pedra' : 'caveira_flecha', slime.dano, 11, 80)) slime.attackCooldown = 0;
        }
        return true;
    }

    if (dist > ataqueDistancia) {
        moverMonstroEspecial(slime, dx, dy, slime.velocidade || 2.3, fatorLentidao);
    } else {
        slime.attackCooldown++;
        if (slime.attackCooldown > (tipo === 'tank_melee' ? 65 : 42)) {
            // CEGUEIRA (Ladino): monstro cego erra ataques normais — só habilidades seguem
            if (monstroPodeAtacar(slime)) {
                // v1.30.3: monstro especial TAUNTADO atinge o Golem (não só o jogador)
                if (tipo === 'poison_melee' && alvo && Array.isArray(alvo.efeitos)) {
                    efeitos.aplicarEfeito(alvo, 'veneno', slime.poisonDuration || 400, 2);
                }
                if (players[slime.targetId] && alvo === players[slime.targetId]) {
                    aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano);
                } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                    danoCausadoAoOgro(slime.tauntId, slime.dano, alvo.x, alvo.y);
                } else if (alvo) {
                    alvo.hp = Math.max(0, (alvo.hp || 0) - slime.dano);
                }
                slime.attackCooldown = 0;
            }
        }
    }
    return true;
}

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
        mapa: mapaPorCoordenada(slime.x),
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
        if (player.giroDescontroladoCooldown > 0) {
            player.giroDescontroladoCooldown--;
        }
        if (player.giroDescontroladoAtivo && player.giroDescontroladoExpiresAt && Date.now() >= player.giroDescontroladoExpiresAt) {
            player.giroDescontroladoTimer = 0;
            player.giroDescontroladoAtivo = false;
            player.giroDescontroladoCooldown = 240;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_barbaro_giro_end', id: pid }));
                }
            });
        } else if (player.giroDescontroladoTimer > 0) {
            player.giroDescontroladoTimer--;
            if (player.giroDescontroladoTimer <= 0) {
                player.giroDescontroladoAtivo = false;
                player.giroDescontroladoCooldown = 240; // 12s de cooldown
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'action_barbaro_giro_end', id: pid }));
                    }
                });
            }
        }

        if (player.giroDescontroladoAtivo && (!player.giroDescontroladoExpiresAt || Date.now() < player.giroDescontroladoExpiresAt)) {
            const tx = player.x + 12;
            const ty = player.y + 16;
            const danoGiro = dmgSkill(player, 'giro_descontrolado', 18);
            slimes.forEach(slime => {
                if (slime.hp > 0 && Math.hypot(slime.x - tx, slime.y - ty) < 90) {
                    registrarDanoMonstro(slime, pid, danoGiro, 'player');
                    efeitos.aplicarEfeito(slime, 'sangramento', 80, 3);
                }
            });
            bosses.forEach(boss => {
                if (boss.hp > 0 && Math.hypot(boss.x - tx, boss.y - ty) < 90) {
                    registrarDanoBoss(boss, pid, danoGiro, 'skill', 'player');
                    efeitos.aplicarEfeito(boss, 'sangramento', 80, 3);
                }
            });
        }

        if (player.classe === 'barbaro' && player.maxHp > 0) {
            let hpPct = player.hp / player.maxHp;
            player.furiaCrescenteNivel = hpPct <= 0.20 ? 3 : hpPct <= 0.40 ? 2 : hpPct <= 0.60 ? 1 : 0;
        }

        if (player.estamina === undefined) player.estamina = 100;
        if (player.estamina < 100) player.estamina = Math.min(100, player.estamina + 0.75);

        // ===== LADINO: máquinas de estado das skills (Dança / Camuflagem / Estrela) =====
        if (player.classe === 'ladino' && player.hp > 0) {
            // --- DANÇA DAS ADAGAS (sequência de teleportes + imunidade) ---
            if (player.ladinoDancaAtivo && player.ladinoDanca) {
                let d = player.ladinoDanca;
                d.step--;
                if (d.step <= 0) {
                    d.step = 3; // 1 hit a cada ~150ms — sequência rápida
                    if (d.idx < d.seq.length) {
                        const seqAlvo = d.seq[d.idx];
                        d.idx++;
                        let alvo = null;
                        if (seqAlvo.tipo === 'slime') for (let s of slimes) { if (s.id === seqAlvo.id && s.hp > 0) { alvo = s; break; } }
                        else for (let b of bosses) { if (b.id === seqAlvo.id && b.hp > 0) { alvo = b; break; } }
                        if (alvo) {
                            // Teleporte até o alvo (posição validada pelo servidor)
                            const destDanca = validarDestinoJogador(alvo.x - PLAYER_OFFSET_X, alvo.y - PLAYER_OFFSET_Y);
                            if (destDanca.aceito) { player.x = destDanca.x; player.y = destDanca.y; }
                            // 1 hit no alvo
                            if (alvo.hp > 0) {
                                if (seqAlvo.tipo === 'slime') registrarDanoMonstro(alvo, pid, d.danoBase, 'player');
                                else registrarDanoBoss(alvo, pid, d.danoBase, 'skill', 'player');
                            }
                        }
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ladino_danca_hit', id: pid, idx: d.idx - 1, x: player.x + PLAYER_OFFSET_X, y: player.y + PLAYER_OFFSET_Y, alvoId: seqAlvo.id, alvoTipo: seqAlvo.tipo }));
                            }
                        });
                    } else {
                        // Fim da sequência: volta à POSIÇÃO INICIAL exata
                        const ret = validarDestinoJogador(d.startX, d.startY);
                        if (ret.aceito) { player.x = ret.x; player.y = ret.y; }
                        player.ladinoDancaAtivo = false;
                        player.ladinoDanca = null;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ladino_danca_end', id: pid, x: player.x + PLAYER_OFFSET_X, y: player.y + PLAYER_OFFSET_Y }));
                            }
                        });
                    }
                }
            }
            // --- CAMUFLAGEM SOMBRIA (delay 1s → invis 10s → CD inicia ao sair) ---
            if (player.ladinoCamuflagemDelay > 0) {
                player.ladinoCamuflagemDelay--;
                if (player.ladinoCamuflagemDelay <= 0) {
                    player.ladinoInvisivel = true;
                    player.ladinoInvisivelTimer = 200; // 10s = 200 ticks
                    player.ladinoInvisivelBonus = true;
                    efeitos.aplicarEfeito(player, 'invisivel', 200, 1);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_ladino_invisivel', id: pid, ativo: true }));
                        }
                    });
                    sincronizarEfeitos(pid, player);
                }
            }
            if (player.ladinoInvisivel) {
                player.ladinoInvisivelTimer--;
                if (player.ladinoInvisivelTimer <= 0) {
                    finalizarInvisibilidadeLadino(player, pid); // tempo esgotou: invis acaba, CD começa
                }
            }
            // --- ESTRELA DA MORTE (5 vértices → centro → salto → queda + stun) ---
            if (player.ladinoEstrela && player.hp > 0) {
                let e = player.ladinoEstrela;
                e.step--;
                if (e.step <= 0) {
                    if (e.fase === 'star') {
                        e.idx++;
                        if (e.idx < e.pontos.length) {
                            e.step = 4; // ~200ms por vértice — coreografia 50% mais lenta e legível
                            const pt = e.pontos[e.idx];
                            const destPonto = validarDestinoJogador(pt.x, pt.y);
                            if (destPonto.aceito) { player.x = destPonto.x; player.y = destPonto.y; }
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'action_ladino_estrela_ponto', id: pid, idx: e.idx, x: player.x + PLAYER_OFFSET_X, y: player.y + PLAYER_OFFSET_Y }));
                                }
                            });
                        } else {
                            // Terminou os vértices: vai ao CENTRO e salta (600ms)
                            e.fase = 'jump';
                            e.step = 12;
                            const destCentro = validarDestinoJogador(e.centroX - PLAYER_OFFSET_X, e.centroY - PLAYER_OFFSET_Y);
                            if (destCentro.aceito) { player.x = destCentro.x; player.y = destCentro.y; }
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'action_ladino_estrela_salto', id: pid, x: player.x + PLAYER_OFFSET_X, y: player.y + PLAYER_OFFSET_Y }));
                                }
                            });
                        }
                    } else if (e.fase === 'jump') {
                        e.fase = 'fall';
                        e.step = 10; // queda 500ms
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ladino_estrela_queda', id: pid, x: player.x + PLAYER_OFFSET_X, y: player.y + PLAYER_OFFSET_Y }));
                            }
                        });
                    } else if (e.fase === 'fall') {
                        // IMPACTO CENTRAL: dano + STUN 2s (40 ticks) server-side
                        const cx = e.centroX, cy = e.centroY;
                        slimes.forEach(slim => {
                            if (slim.hp > 0 && Math.hypot(slim.x - cx, slim.y - cy) < 90) {
                                registrarDanoMonstro(slim, pid, e.danoBase, 'player');
                                slim.stunTimer = 40; // 2s de stun
                            }
                        });
                        danoEmBosses(cx, cy, 90, pid, e.danoBase, 'skill');
                        bosses.forEach(bb => {
                            if (bb.hp > 0 && Math.hypot(bb.x - cx, bb.y - cy) < 90) bb.stunTimer = 40;
                        });
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ladino_estrela_impacto', id: pid, x: cx, y: cy, raio: 90 }));
                            }
                        });
                        player.ladinoEstrela = null;
                    }
                }
            }
            // Cancelamento de segurança ao morrer (nunca deixa imune presa)
            if (player.hp <= 0) {
                player.ladinoDancaAtivo = false;
                player.ladinoDanca = null;
                player.ladinoEstrela = null;
                if (player.ladinoInvisivel) finalizarInvisibilidadeLadino(player, pid);
            }
        }

        // ===== NOVAS CLASSES (v1.31): máquinas de estado das skills =====
        // --- DRONEMASTER ---
        if (player.classe === 'dronemaster' && player.hp > 0) {
            // Passiva "Drone Companheiro": +2% da VIDA MÁXIMA por segundo (sem overheal)
            player.dmHealTick++;
            if (player.dmHealTick >= 20) { // 20 ticks = 1s
                player.dmHealTick = 0;
                if (player.hp < player.maxHp) {
                    const curaDrone = Math.round(player.maxHp * 0.02);
                    player.hp = Math.min(player.maxHp, player.hp + curaDrone);
                    const wsH = playerSockets[pid];
                    if (wsH && wsH.readyState === WebSocket.OPEN) wsH.send(JSON.stringify({ type: 'hp_sync', hp: Math.round(player.hp), maxHp: player.maxHp }));
                }
            }
            // Drone acompanha o dono (posição orbital suavizada — nunca teleporta)
            posicaoDrone(player);
            // Escudo do Dash: expira
            if (player.escudoAbsoluto > 0 && player.escudoAbsolutoExpirador && Date.now() >= player.escudoAbsolutoExpirador) {
                player.escudoAbsoluto = 0;
                const wsE = playerSockets[pid];
                if (wsE && wsE.readyState === WebSocket.OPEN) wsE.send(JSON.stringify({ type: 'escudo_sync', escudo: 0 }));
                if (efeitos && efeitos.removerEfeito(player, 'escudoEnergia')) sincronizarEfeitos(pid, player);
            }
            if (player.dmDashEscudo > 0 && Date.now() >= player.dmDashEscudoExpirador) player.dmDashEscudo = 0;

            // Skill 4 — Protocolo Titã: timer da forma Robô (10s)
            if (player.dmTitaAtivo) {
                player.dmTitaTimer--;
                if (player.dmTitaTimer <= 0) {
                    player.dmTitaAtivo = false;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_tita', id: pid, ativo: false }));
                        }
                    });
                }
            }

            // Skill 1 — Modo Supressão: o Drone dispara até 3 alvos (cadência server-side)
            if (player.dmSupressaoTimer > 0) {
                player.dmSupressaoTimer--;
                player.dmDroneAtaqueCd--;
                if (player.dmDroneAtaqueCd <= 0) {
                    player.dmDroneAtaqueCd = 8; // ~400ms entre rajadas
                    const dxD = player.dmDroneX, dyD = player.dmDroneY;
                    // até 3 slimes mais próximos + bosses na área (range 300)
                    const alvosD = slimesNoRaio(dxD, dyD, 300, mapaPorCoordenada(player.x));
                    const alvosBossD = [];
                    for (let b of bosses) {
                        if (b.hp > 0 && mapaPorCoordenada(b.x) === mapaPorCoordenada(player.x) && Math.hypot(b.x - dxD, b.y - dyD) <= 300) alvosBossD.push(b);
                    }
                    const tirosD = [];
                    for (let i = 0; i < Math.min(3, alvosD.length); i++) tirosD.push({ tipo: 'slime', a: alvosD[i] });
                    let idxB = 0;
                    while (tirosD.length < 3 && idxB < alvosBossD.length) { tirosD.push({ tipo: 'boss', a: alvosBossD[idxB++] }); }
                    const danoSup = dmgSkill(player, 'supressao_dm', 12);
                    tirosD.forEach(t => {
                        if (t.tipo === 'slime') registrarDanoMonstro(t.a, pid, danoSup, 'player');
                        else registrarDanoBoss(t.a, pid, danoSup, 'skill', 'player');
                    });
                    if (tirosD.length) {
                        const primeira = tirosD[0].a;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_dm_supressao_tiro', id: pid, x: primeira.x, y: primeira.y, n: tirosD.length }));
                            }
                        });
                    }
                }
                if (player.dmSupressaoTimer <= 0) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_supressao_fim', id: pid }));
                        }
                    });
                }
            }

            // Skill 2 — Modo Assalto: Drone vira mini robô quad (corre + ataca corpo a corpo 2x)
            if (player.dmAssaltoTimer > 0) {
                player.dmAssaltoTimer--;
                const pCx = player.x + PLAYER_OFFSET_X, pCy = player.y + PLAYER_OFFSET_Y;
                if (!player.dmDroneAlvo) {
                    let melhorD = null, melhorDistD = 99999;
                    for (let s of slimes) {
                        if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(player.x)) continue;
                        let dDono = Math.hypot(s.x - pCx, s.y - pCy);
                        if (dDono > DRONE_MAX_DISTANCE_FROM_OWNER) continue; // nunca longe demais
                        let d = Math.hypot(s.x - player.dmDroneX, s.y - player.dmDroneY);
                        if (d < melhorDistD) { melhorDistD = d; melhorD = { tipo: 'slime', ent: s }; }
                    }
                    if (!melhorD) {
                        for (let b of bosses) {
                            if (b.hp <= 0 || mapaPorCoordenada(b.x) !== mapaPorCoordenada(player.x)) continue;
                            let dDono = Math.hypot(b.x - pCx, b.y - pCy);
                            if (dDono > DRONE_MAX_DISTANCE_FROM_OWNER) continue;
                            melhorD = { tipo: 'boss', ent: b }; break;
                        }
                    }
                    player.dmDroneAlvo = melhorD;
                }
                const alvoRobo = player.dmDroneAlvo ? player.dmDroneAlvo.ent : null;
                if (alvoRobo && alvoRobo.hp > 0) {
                    const distDonoRobo = Math.hypot(player.dmDroneX - pCx, player.dmDroneY - pCy);
                    const distRobo = Math.hypot(alvoRobo.x - player.dmDroneX, alvoRobo.y - player.dmDroneY);
                    if (distDonoRobo > DRONE_MAX_DISTANCE_FROM_OWNER) {
                        // ultrapassou o limite: abandona o alvo e volta para o DroneMaster
                        const angV = Math.atan2(pCy - player.dmDroneY, pCx - player.dmDroneX);
                        player.dmDroneX += Math.cos(angV) * 6;
                        player.dmDroneY += Math.sin(angV) * 6;
                        player.dmDroneAlvo = null;
                    } else if (distRobo > 42) {
                        const angV = Math.atan2(alvoRobo.y - player.dmDroneY, alvoRobo.x - player.dmDroneX);
                        player.dmDroneX += Math.cos(angV) * 5;
                        player.dmDroneY += Math.sin(angV) * 5;
                    } else {
                        // ataque corpo a corpo mecânico (2x dano do básico, ~0,6s)
                        player.dmDroneAtaqueCd--;
                        if (player.dmDroneAtaqueCd <= 0) {
                            player.dmDroneAtaqueCd = 12;
                            const danoAssaltoD = Math.round(dmgSkill(player, 'assalto_dm', 13) * 2);
                            if (player.dmDroneAlvo.tipo === 'slime') registrarDanoMonstro(alvoRobo, pid, danoAssaltoD, 'player');
                            else registrarDanoBoss(alvoRobo, pid, danoAssaltoD, 'skill', 'player');
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'action_dm_assalto_ataque', id: pid, x: alvoRobo.x, y: alvoRobo.y }));
                                }
                            });
                        }
                    }
                } else {
                    player.dmDroneAlvo = null;
                }
                if (player.dmAssaltoTimer <= 0) {
                    player.dmDroneAlvo = null;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_assalto_fim', id: pid }));
                        }
                    });
                }
            }
        }

        // --- SNIPER ---
        if (player.classe === 'sniper' && player.hp > 0) {
            // Disparo Supremo: janela de 3s (60 ticks) — sem disparo = encerra e inicia o CD
            if (player.snAim) {
                player.snAim.timer--;
                if (player.snAim.timer <= 0 && !player.snAim.fired) {
                    player.snAim = null;
                    player.snAimCooldown = Date.now() + 20000;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_aim', id: pid, ativo: false }));
                        }
                    });
                }
            }
            // Camuflado: congelamento dos cooldowns (não contam enquanto escondido)
            if (player.snCamuflado) {
                congelarCooldownsSniper(player, 50);
                if (!efeitos.temEfeito(player, 'camuflagem')) finalizarCamuflagemSniper(player, pid, 'efeito_removido');
            }
            // Posição de Franco-Atirador: detecta inimigos invisíveis na área
            if (player.snPosicao) {
                const pSx = player.x + PLAYER_OFFSET_X, pSy = player.y + PLAYER_OFFSET_Y;
                let detectou = null;
                for (let pId in players) {
                    if (pId === pid) continue;
                    const p2 = players[pId];
                    if (!p2 || p2.hp <= 0) continue;
                    if (efeitos && efeitos.temEfeito(p2, 'invisivel') && mapaPorCoordenada(p2.x) === mapaPorCoordenada(player.x)
                        && Math.hypot(p2.x - pSx, p2.y - pSy) <= SNIPER_DETECTION_RADIUS) {
                        detectou = { x: p2.x, y: p2.y, id: pId };
                        break;
                    }
                }
                if (detectou) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_deteccao', id: pid, x: detectou.x, y: detectou.y, alvoId: detectou.id }));
                        }
                    });
                }
            }
            if (player.hp <= 0) {
                player.snAim = null;
                player.snPosicao = false;
                if (player.snCamuflado) finalizarCamuflagemSniper(player, pid, 'morte');
            }
        }

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
                    modo: (player && (player.ogroModo === 'passivo' ? 'passivo' : 'agressivo')) || 'agressivo',
                    rugidoTimer: 200, rugindoTimer: 0
                };
            }
            let ogro = lacaios[pid];
            if (!ogro) continue;
            if (ogro.skillCooldown > 0) ogro.skillCooldown--;
            if (ogro.skill2Cooldown > 0) ogro.skill2Cooldown--;
            if (ogro.modoAgressivoTimer > 0) ogro.modoAgressivoTimer--;
            if (ogro.colossalCooldown > 0) ogro.colossalCooldown--;

            try {
                if (ogro.colossalAtivo) {
                    ogro.colossalTimer--;
                    if (ogro.colossalTimer <= 0) {
                        ogro.colossalAtivo = false;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ogro_colossal_fim', pid: pid }));
                            }
                        });
                    } else {
                        ogro.colossalPedraCd = (ogro.colossalPedraCd || 0) + 1;
                        if (ogro.colossalPedraCd >= 20) {
                            ogro.colossalPedraCd = 0;
                            const alcancePedraColossal = 650;
                            let classesRanged = ['mago', 'arqueiro', 'curandeiro', 'summoner'];
                            let alvoPedra = null, melhorPrio = -1, melhorDist = 99999;
                            for (let pid2 in players) {
                                let alvoP = players[pid2];
                                if (!alvoP || alvoP.hp <= 0 || pid2 === pid) continue;
                                let d = Math.hypot(alvoP.x - ogro.x, alvoP.y - ogro.y);
                                if (d > alcancePedraColossal) continue;
                                let prio = classesRanged.indexOf(alvoP.classe) !== -1 ? 1 : 0;
                                if (prio > melhorPrio || (prio === melhorPrio && d < melhorDist)) {
                                    melhorPrio = prio; melhorDist = d; alvoPedra = { pid: pid2, x: alvoP.x, y: alvoP.y };
                                }
                            }
                            if (!alvoPedra) {
                                slimes.forEach(sl => {
                                    if (sl.hp > 0) {
                                        let d = Math.hypot(sl.x - ogro.x, sl.y - ogro.y);
                                        if (d < alcancePedraColossal && d < melhorDist) { melhorDist = d; alvoPedra = { pid: null, x: sl.x, y: sl.y, slimeId: sl.id }; }
                                    }
                                });
                            }
                            if (alvoPedra) {
                                let danoPedra = dmgSkill(players[pid], 'colossal', 30);
                                if (alvoPedra.pid && players[alvoPedra.pid]) {
                                    aplicarDanoJogador(alvoPedra.pid, ogro.x, ogro.y, danoPedra);
                                } else if (alvoPedra.slimeId) {
                                    let slAlvo = slimes.find(s => s.id === alvoPedra.slimeId);
                                    if (slAlvo) registrarDanoMonstro(slAlvo, pid, danoPedra, 'pet');
                                }
                                wss.clients.forEach((client) => {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify({ type: 'ogro_pedra_enorme', sx: ogro.x, sy: ogro.y, tx: alvoPedra.x, ty: alvoPedra.y }));
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (eColossal) {
                console.error('[ERRO GOLEM COLOSSAL]', eColossal);
                ogro.colossalAtivo = false;
            }

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
                        slime.tauntTimer = 100; // 5 segundos
                        slime.targetId = pid;
                    });
                    bosses.forEach(g => {
                        if (g.hp <= 0) return;
                        if (g.flagPassivo) return; // passivos não são provocados
                        if (Math.hypot(g.x - ogro.x, g.y - ogro.y) > 300) return;
                        g.tauntId = pid;
                        g.tauntTimer = 100; // 5 segundos
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

                // MODO PASSIVO: o golem (modo === 'passivo') NÃO ataca — só rodeia a invocadora.
                // Nesse modo a seleção de alvos abaixo é pulada e ele permanece no "segue ao lado".
                if (ogro.modo !== 'passivo' && ogro.focoAlvo) {
                    if (ogro.focoAlvo.tipo === 'slime') {
                        let s = slimes.find(x => x.id === ogro.focoAlvo.id && x.hp > 0);
                        if (s) slimeAlvo = s; else ogro.focoAlvo = null;
                    } else if (ogro.focoAlvo.tipo === 'boss') {
                        let b = bosses.find(x => x.id === ogro.focoAlvo.id && x.hp > 0);
                        if (b) bossAlvo = b; else ogro.focoAlvo = null;
                    }
                }

                // 2) sem alvo focado: persegue quem mira o summoner / comando agressivo / boss próximo
                if (ogro.modo !== 'passivo' && !slimeAlvo && !bossAlvo) {
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && slime.targetId === pid) slimeAlvo = slime;
                    });

                    if (!slimeAlvo && ogro.modoAgressivoTimer > 0 && ogro.targetSlimeId) {
                        let encontrado = slimes.find(s => s.id === ogro.targetSlimeId && s.hp > 0);
                        if (encontrado) slimeAlvo = encontrado;
                    }

                    // FIX AGRO: comando agressivo caça o slime mais próximo (raio 440)
                    if (!slimeAlvo && ogro.modoAgressivoTimer > 0) {
                        let menorSlimeDist = 440;
                        for (let s of slimes) {
                            if (s.hp > 0 && !s.flagPassivo) {
                                let ds = Math.hypot(s.x - ogro.x, s.y - ogro.y);
                                if (ds < menorSlimeDist) { menorSlimeDist = ds; slimeAlvo = s; }
                            }
                        }
                        if (!slimeAlvo) {
                            let menorBossDist = 440;
                            for (let bb of bosses) {
                                if (bb.hp > 0) {
                                    let db = Math.hypot(bb.x - ogro.x, bb.y - ogro.y);
                                    if (db < menorBossDist) { menorBossDist = db; bossAlvo = bb; }
                                }
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
                if (ogro.modo !== 'passivo' && (slimeAlvo || bossAlvo) && ogro.focoAlvo) {
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
                        if (ogro.attackCooldown > (ogro.colossalAtivo ? 13 : 27)) {
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
                        if (ogro.attackCooldown > (ogro.colossalAtivo ? 13 : 27)) {
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
            if (p.gritoGuerraBonus && !efeitos.temEfeito(p, 'gritoDeGuerra')) {
                p.gritoGuerraBonus = 0;
                atualizarBonusMaxHpGritoGuerra(p);
                efeitosMudaram[pid] = true;
            }
            // Sincroniza efeitos derivados (stun/lentidão já estão em efeitos via tick)
            // Inclui 'stun' se stunTimer > 0, 'lentidao' se slowTimer > 0 — para exibição na UI
            if (p.stunTimer > 0 && !efeitos.temEfeito(p, 'stun')) {
                efeitos.aplicarEfeito(p, 'stun', p.stunTimer, 1);
            }
        }
        if (Object.keys(efeitosMudaram).length > 0) {
            for (let pid in efeitosMudaram) {
                let p = players[pid];
                sincronizarEfeitos(pid, p);
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
                    sincronizarEfeitos(pid, p);
                }
            }
            // LADINO — Dança das Adagas: imune inclusive ao veneno do pântano
            if (!p.ladinoDancaAtivo && efeitos.temEfeito(p, 'veneno') && global.venenoTick % 10 === 0) {
                const veneno = efeitos.pegarEfeito(p, 'veneno');
                p.hp = Math.max(0, p.hp - Math.max(5, Math.round(5 * ((veneno && veneno.intensidade) || 1))));
            }
        }
    }

    // ============ QUEIMADURA DoT EM MONSTROS (a cada 20 ticks = 1s) ============
    global.queimaduraTick = ((global.queimaduraTick || 0) + 1);
    if (global.queimaduraTick % 20 === 0) {
        slimes.forEach(slime => {
            if (slime.hp <= 0) return;
            let efQ = efeitos.pegarEfeito(slime, 'queimadura');
            let efQC = efeitos.pegarEfeito(slime, 'queimaduraCongelante');
            if (efQ && efQ.intensidade > 0) {
                slime.hp = Math.max(0, slime.hp - efQ.intensidade);
            }
            if (efQC && efQC.intensidade > 0) {
                slime.hp = Math.max(0, slime.hp - efQC.intensidade);
            }
        });
        bosses.forEach(b => {
            if (b.hp <= 0) return;
            let efQ = efeitos.pegarEfeito(b, 'queimadura');
            let efQC = efeitos.pegarEfeito(b, 'queimaduraCongelante');
            if (efQ && efQ.intensidade > 0) {
                b.hp = Math.max(0, b.hp - efQ.intensidade);
            }
            if (efQC && efQC.intensidade > 0) {
                b.hp = Math.max(0, b.hp - efQC.intensidade);
            }
        });
    }
    // Atualizar efeitos nos mobs
    slimes.forEach(slime => { if (slime.hp > 0) efeitos.atualizarEfeitos(slime); });
    bosses.forEach(b => { if (b.hp > 0) efeitos.atualizarEfeitos(b); });

    // ============ LADINO: NÉVOA VENENOSA (zonas de gás persistente) ============
    // Cada tick: aplica CEGUEIRA (refresh) em quem está dentro; a cada 10 ticks (0,5s)
    // aplica dano contínuo controlado. Zona vive 5s (100 ticks).
    for (let i = gasesVeneno.length - 1; i >= 0; i--) {
        const zona = gasesVeneno[i];
        zona.tempo--;
        if (zona.tempo <= 0) {
            gasesVeneno.splice(i, 1);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_ladino_gas_fim', id: zona.id, x: zona.x, y: zona.y }));
                }
            });
            continue;
        }
        const dono = players[zona.ownerId];
        // Cegueira enquanto permanece na área (duração acima do intervalo do tick)
        slimes.forEach(slim => {
            if (slim.hp > 0 && mapaPorCoordenada(slim.x) === zona.mapa && Math.hypot(slim.x - zona.x, slim.y - zona.y) < zona.raio) {
                efeitos.aplicarEfeito(slim, 'cegueira', 10, 1);
            }
        });
        bosses.forEach(bb => {
            if (bb.hp > 0 && mapaPorCoordenada(bb.x) === zona.mapa && Math.hypot(bb.x - zona.x, bb.y - zona.y) < zona.raio) {
                efeitos.aplicarEfeito(bb, 'cegueira', 10, 1);
            }
        });
        // Dano contínuo em intervalos controlados (a cada 0,5s)
        if (zona.tempo % 10 === 0 && dono) {
            slimes.forEach(slim => {
                if (slim.hp > 0 && mapaPorCoordenada(slim.x) === zona.mapa && Math.hypot(slim.x - zona.x, slim.y - zona.y) < zona.raio) {
                    registrarDanoMonstro(slim, zona.ownerId, zona.danoBase, 'dot');
                }
            });
            danoEmBosses(zona.x, zona.y, zona.raio, zona.ownerId, zona.danoBase, 'skill', 'dot');
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_ladino_gas_dano', id: zona.id, x: zona.x, y: zona.y }));
                }
            });
        }
    }

    // ============ NOVAS CLASSES (v1.31): ZONAS DE CHÃO PERSISTENTES ============
    // --- CAIXA DE FERRAMENTAS (DroneMaster): dá escudo 50% vida máx por 10s ---
    for (let i = caixasFerramentas.length - 1; i >= 0; i--) {
        const z = caixasFerramentas[i];
        z.tempo--;
        if (z.tempo <= 0) { removerZonaNova(caixasFerramentas, i, 'action_dm_caixa_fim'); continue; }
        const donoC = players[z.ownerId];
        if (!donoC) continue;
        for (let pidC in players) {
            const pC = players[pidC];
            if (!pC || pC.hp <= 0) continue;
            if (z.aplicados[pidC]) continue; // controle anti reapply
            if (mapaPorCoordenada(pC.x) !== z.mapa) continue;
            if (Math.hypot((pC.x + PLAYER_OFFSET_X) - z.x, (pC.y + PLAYER_OFFSET_Y) - z.y) > z.raio) continue;
            // já possui escudo ativo? não sobrescreve (anti duplicação)
            if (pC.escudoAbsoluto > 0 && pC.escudoAbsolutoExpirador > Date.now()) {
                z.aplicados[pidC] = Date.now() + 5000; // aguarda 5s antes de tentar de novo
                continue;
            }
            darEscudoAbsorvente(pC, z.escudoBase, 10000); // 10s
            z.aplicados[pidC] = Date.now() + 10000; // não reaplica enquanto durar
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_dm_caixa_escudo', id: z.id, pid: pidC, x: pC.x, y: pC.y }));
                }
            });
        }
    }

    // --- CHUVA DE COMETAS (Arqueiro Astral — Chuva de Cometas): chuva 4s ---
    for (let i = chuvasCometas.length - 1; i >= 0; i--) {
        const z = chuvasCometas[i];
        z.tempo--;
        if (z.tempo <= 0) { removerZonaNova(chuvasCometas, i, 'action_arcano_cometas_fim'); continue; }
        if (z.tempo % 10 === 0) {
            causarDanoZona(z, z.danoBase);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_arcano_cometas_dano', id: z.id, x: z.x, y: z.y }));
                }
            });
        }
    }

    // --- ORBE DE CONSTELAÇÃO (Arqueiro Astral): cativeiro 2s → implosão ---
    for (let i = orbeConstelacoes.length - 1; i >= 0; i--) {
        const z = orbeConstelacoes[i];
        z.tempo--;
        if (z.tempo <= 0) {
            // fim do cativeiro: implosão estelar (dano de quebra)
            causarDanoZona(z, z.danoBase);
            slimes.forEach(s => { if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) <= z.raio) { s.stunTimer = Math.max(0, (s.stunTimer || 0)); } });
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_arcano_orbe_quebra', id: z.id, x: z.x, y: z.y }));
                }
            });
            removerZonaNova(orbeConstelacoes, i, 'action_arcano_orbe_fim');
            continue;
        }
        // mantém cativados (congelados) enquanto dentro (refresh)
        if (z.tempo % 10 === 0) {
            slimes.forEach(s => {
                if (s.hp > 0 && mapaPorCoordenada(s.x) === z.mapa && Math.hypot(s.x - z.x, s.y - z.y) <= z.raio) {
                    s.stunTimer = Math.max(s.stunTimer || 0, 10);
                    efeitos.aplicarEfeito(s, 'congelado', 10, 1);
                }
            });
            bosses.forEach(b => {
                if (b.hp > 0 && mapaPorCoordenada(b.x) === z.mapa && Math.hypot(b.x - z.x, b.y - z.y) <= z.raio) {
                    b.stunTimer = Math.max(b.stunTimer || 0, 10);
                    efeitos.aplicarEfeito(b, 'congelado', 10, 1);
                }
            });
        }
    }

    // --- REDES DE ARAME (Sniper — Arame Prendedor): imobiliza 3s ---
    for (let i = redesSniper.length - 1; i >= 0; i--) {
        const z = redesSniper[i];
        z.tempo--;
        if (z.tempo <= 0) { removerZonaNova(redesSniper, i, 'action_sniper_rede_fim'); continue; }
        slimes.forEach(s => {
            if (s.hp > 0 && mapaPorCoordenada(s.x) === z.mapa && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                s.isPreso = Math.max(s.isPreso || 0, Date.now() + 1500);
                efeitos.aplicarEfeito(s, 'rede', 30, 1);
            }
        });
        bosses.forEach(b => {
            if (b.hp > 0 && mapaPorCoordenada(b.x) === z.mapa && Math.hypot(b.x - z.x, b.y - z.y) < z.raio) {
                b.isPreso = Math.max(b.isPreso || 0, Date.now() + 1500);
                efeitos.aplicarEfeito(b, 'rede', 30, 1);
            }
        });
    }

    // ============ LADINO: SANGRAMENTO (passiva Lâminas Sangrentas) ============
    // A cada 20 ticks (1s) aplica 20% do dano físico que originou o sangramento.
    // Reutiliza o DoT do efeito; crédito/dano via registrarDano* (tipoOrigem 'dot').
    global.sangramentoTick = ((global.sangramentoTick || 0) + 1);
    if (global.sangramentoTick % 20 === 0) {
        slimes.forEach(slim => {
            if (slim.hp <= 0) return;
            const efSang = efeitos.pegarEfeito(slim, 'sangramento');
            if (efSang && efSang.intensidade > 0 && efSang.autorId) {
                registrarDanoMonstro(slim, efSang.autorId, Math.round(efSang.intensidade), 'dot');
            }
        });
        bosses.forEach(bb => {
            if (bb.hp <= 0) return;
            const efSang = efeitos.pegarEfeito(bb, 'sangramento');
            if (efSang && efSang.intensidade > 0 && efSang.autorId) {
                registrarDanoBoss(bb, efSang.autorId, Math.round(efSang.intensidade), 'skill', 'dot');
            }
        });
    }

    // ============ PASSIVA: QUEIMADURA CONGELANTE EXTREMA ============
    // Se fogo (queimadura) atingir um mob com gelo, converter para queimaduraCongelante
    slimes.forEach(slime => {
        if (slime.hp <= 0) return;
        if (efeitos.temEfeito(slime, 'queimadura') && efeitos.temEfeito(slime, 'gelo')) {
            let efFogo = efeitos.pegarEfeito(slime, 'queimadura');
            let efGelo = efeitos.pegarEfeito(slime, 'gelo');
            let dotCombo = Math.round((efFogo.intensidade || 4) * 1.8);
            let duracaoCombo = Math.max(efFogo.tempo, efGelo.tempo);
            efeitos.removerEfeito(slime, 'queimadura');
            efeitos.removerEfeito(slime, 'gelo');
            efeitos.aplicarEfeito(slime, 'queimaduraCongelante', duracaoCombo, dotCombo);
            slime.slowTimer = Math.max(slime.slowTimer || 0, 30);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'reacao_congelante', x: slime.x, y: slime.y }));
                }
            });
        }
    });
    bosses.forEach(b => {
        if (b.hp <= 0) return;
        if (efeitos.temEfeito(b, 'queimadura') && efeitos.temEfeito(b, 'gelo')) {
            let efFogo = efeitos.pegarEfeito(b, 'queimadura');
            let efGelo = efeitos.pegarEfeito(b, 'gelo');
            let dotCombo = Math.round((efFogo.intensidade || 4) * 1.8);
            let duracaoCombo = Math.max(efFogo.tempo, efGelo.tempo);
            efeitos.removerEfeito(b, 'queimadura');
            efeitos.removerEfeito(b, 'gelo');
            efeitos.aplicarEfeito(b, 'queimaduraCongelante', duracaoCombo, dotCombo);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'reacao_congelante', x: b.x, y: b.y }));
                }
            });
        }
    });

    // ============ AURA SAGRADA DO CURANDEIRO (mana contínua + cura por segundo) ============
    global.auraSagradaTick = ((global.auraSagradaTick || 0) + 1);
    if (global.auraSagradaTick % 20 === 0) {
        for (let healerId in aurasSagradas) {
            let aura = aurasSagradas[healerId];
            let healer = players[healerId];
            if (!aura || !healer || healer.hp <= 0 || healer.mana <= healer.maxMp * 0.10) {
                desativarAuraSagrada(healerId, 'mana_baixa');
                if (healer) {
                    healer.mana = Math.max(0, healer.mana || 0);
                    let wsMana = playerSockets[healerId];
                    if (wsMana && wsMana.readyState === WebSocket.OPEN) wsMana.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(healer.mana), maxMp: healer.maxMp }));
                }
                continue;
            }
            let consumoAura = Math.max(1, Math.ceil(healer.maxMp * 0.08));
            healer.mana = Math.max(0, healer.mana - consumoAura);
            // Cura base 2% HP/s ESCALADA pelo atributo DIVINDADE da Curandeira (+5% por ponto).
            let curaAura = Math.max(1, calcularCuraJogador(healerId, Math.round(healer.maxHp * 0.02)));
            let alvos = [];
            for (let alvoId in players) {
                let alvo = players[alvoId];
                let aliado = alvoId === healerId || (healer.partyId && alvo.partyId === healer.partyId);
                if (aliado && alvo.hp > 0 && Math.hypot(alvo.x - healer.x, alvo.y - healer.y) <= aura.raio) {
                    aplicarCuraAoJogador(alvoId, curaAura);
                    alvos.push({ id: alvoId, x: alvo.x + 12, y: alvo.y + 16 });
                }
            }
            transmitirAura('action_aura_sagrada_tick', healerId, { x: healer.x + 12, y: healer.y + 16, alvos: alvos });
            let wsMana = playerSockets[healerId];
            if (wsMana && wsMana.readyState === WebSocket.OPEN) wsMana.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(healer.mana), maxMp: healer.maxMp }));
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
        if (b.expiresAt && Date.now() >= b.expiresAt) {
            blizzards.splice(i, 1);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'sound_event', action: 'stop', soundId: b.soundId }));
            });
            continue;
        }
        b.duracao--;
        slimes.forEach(slime => {
            if (slime.hp > 0 && Math.hypot(slime.x - b.x, slime.y - b.y) < b.radius) {
                slime.slowTimer = 15;
                efeitos.aplicarEfeito(slime, 'gelo', 60, 1);
                if (b.duracao % 20 === 0) {
                    registrarDanoMonstro(slime, b.ownerId, b.danoNevasca || 6);
                }
            }
        });
        if (b.duracao % 20 === 0) {
            danoEmBosses(b.x, b.y, b.radius, b.ownerId, b.danoNevasca || 6, 'skill');
            bosses.forEach(bb => {
                if (bb.hp > 0 && Math.hypot(bb.x - b.x, bb.y - b.y) < b.radius) {
                    efeitos.aplicarEfeito(bb, 'gelo', 60, 1);
                }
            });
        }
        if (b.duracao <= 0 || (b.expiresAt && Date.now() >= b.expiresAt)) {
            blizzards.splice(i, 1);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'sound_event', action: 'stop', soundId: b.soundId }));
            });
        }
    }

    for (let vi = vulcoes.length - 1; vi >= 0; vi--) {
        let v = vulcoes[vi];
        v.duracao--;
        if (v.emergindo > 0) { v.emergindo--; }
        else {
            v.tickCounter++;
            if (v.tickCounter % 20 === 0) {
                let ang = Math.random() * Math.PI * 2;
                let dist = Math.random() * v.radius;
                let tx = v.x + Math.cos(ang) * dist;
                let ty = v.y + Math.sin(ang) * dist;
                let tipo = Math.random() < 0.5 ? 'fireball' : 'lava';
                let projId = 'vp_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
                v.projeteis.push({ id: projId, tx: tx, ty: ty, tipo: tipo, timer: 16, landed: false });
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'vulcao_projetil', vx: v.x, vy: v.y,
                            tx: tx, ty: ty, tipo: tipo, id: projId
                        }));
                    }
                });
            }
            for (let pi = v.projeteis.length - 1; pi >= 0; pi--) {
                let pp = v.projeteis[pi];
                pp.timer--;
                if (pp.timer <= 0 && !pp.landed) {
                    pp.landed = true;
                    let raioImpacto = 40;
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - pp.tx, slime.y - pp.ty) < raioImpacto) {
                            registrarDanoMonstro(slime, v.ownerId, v.danoImpacto);
                            efeitos.aplicarEfeito(slime, 'stun', 10, 1);
                            efeitos.aplicarEfeito(slime, 'queimadura', 200, v.danoDot);
                        }
                    });
                    danoEmBosses(pp.tx, pp.ty, raioImpacto + 10, v.ownerId, v.danoImpacto, 'skill');
                    bosses.forEach(b => {
                        if (b.hp > 0 && Math.hypot(b.x - pp.tx, b.y - pp.ty) < raioImpacto + 10) {
                            efeitos.aplicarEfeito(b, 'stun', 10, 1);
                            efeitos.aplicarEfeito(b, 'queimadura', 200, v.danoDot);
                        }
                    });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'vulcao_impacto', tx: pp.tx, ty: pp.ty, tipo: pp.tipo, id: pp.id
                            }));
                        }
                    });
                }
                if (pp.timer <= -5) v.projeteis.splice(pi, 1);
            }
        }
        if (v.duracao <= 0) vulcoes.splice(vi, 1);
    }

    for (let i = chuvasServidor.length - 1; i >= 0; i--) {
        let ch = chuvasServidor[i];
        if (ch.expiresAt && Date.now() >= ch.expiresAt) {
            chuvasServidor.splice(i, 1);
            continue;
        }
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
        if (ch.duracao <= 0 || (ch.expiresAt && Date.now() >= ch.expiresAt)) chuvasServidor.splice(i, 1);
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
            if ((!p.mapa || p.mapa === mapaPorCoordenada(ogroAlvo.x)) && Math.hypot(ogroAlvo.x - p.x, ogroAlvo.y - p.y) < raioHitOgro) {
                danoCausadoAoOgro(p.petAlvo, p.dano || 10, ogroAlvo.x, ogroAlvo.y);
                projeteis.splice(i, 1);
                projectileRemoved = true;
            }
        }
        if (!projectileRemoved) for (let pid in players) {
            let player = players[pid];
            let raioHit = (p.raio || 5) + 15;
            if (player.hp > 0 && (!p.mapa || p.mapa === mapaPorCoordenada(player.x)) && Math.hypot(player.x + 12 - p.x, player.y + 16 - p.y) < raioHit) {
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
                const passoDash = validarMovimentoJogador(
                    player,
                    player.x + (dx / dist) * 18,
                    player.y + (dy / dist) * 18,
                    { maxStep: MAX_PLAYER_COLLISION_STEP }
                );
                if (passoDash.aceito || passoDash.parcial) {
                    player.x = passoDash.x;
                    player.y = passoDash.y;
                }
                player.dashFrames--;
                if (passoDash.bloqueado) {
                    player.isDashing = false;
                    player.dashTarget = null;
                    player.dashFrames = 0;
                }
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
                slime.origemX = novaPos.x;
                slime.origemY = novaPos.y;
                slime.retornandoAoLar = false;
                slime.targetId = null;
                slime.efeitos = [];
                slime.invisivel = false;
                slime.fugindo = false;
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

        if (slime.stunTimer > 0 && !slime.imuneControle) {
            slime.stunTimer--;
            return;
        }

        // ARAME PRENDEDOR (Sniper — Skill 2): preso = não se move nem ataca
        if (slime.isPreso && Date.now() < slime.isPreso) {
            return;
        }

        if (slime.tauntTimer > 0) {
            slime.tauntTimer--;
            if (slime.tauntTimer <= 0) { slime.tauntId = null; slime.targetId = null; }
        }

        let fatorLentidao = 1.0;
        if (slime.imuneControle) {
            slime.stunTimer = 0;
            slime.slowTimer = 0;
            if (Array.isArray(slime.efeitos)) {
                slime.efeitos = slime.efeitos.filter(ef => !['stun', 'lentidao', 'paralisia', 'sono', 'gelo'].includes(ef.id));
            }
        }
        if (slime.slowTimer > 0 && !slime.imuneControle) {
            slime.slowTimer--;
            fatorLentidao = 0.5;
        }

        let permiteAgroProximidade = !slime.flagPassivo && (slime.flagAgressivo || slime.tipo === "zumbi");
        garantirOrigemInimigo(slime);

        if (slime.retornandoAoLar) {
            moverInimigoParaOrigem(slime, fatorLentidao);
            return;
        }

        if (!slime.flagPassivo && slime.tauntTimer > 0 && (players[slime.tauntId] || lacaios[slime.tauntId])) {
            slime.targetId = slime.tauntId;
        } else if (permiteAgroProximidade && !slime.targetId) {
            let menorDist = slime.aggroRange || 320;
            let alvoProximo = null;
            for (let pid in players) {
                let p = players[pid];
                if (p.hp <= 0) continue;
                // LADINO invisível / SNIPER camuflado: não são vistos pelo agro de proximidade
                if (efeitos && (efeitos.temEfeito(p, 'invisivel') || efeitos.temEfeito(p, 'camuflagem'))) continue;
                if (!alvoDentroDaVisao(slime, p)) continue;
                let d2 = distanciaEntidadesQuadrada(p, slime);
                if (d2 < menorDist * menorDist) { menorDist = Math.sqrt(d2); alvoProximo = pid; }
            }
            if (alvoProximo) slime.targetId = alvoProximo;
        }

        if (slime.targetId && (players[slime.targetId] || lacaios[slime.targetId])) {
            let alvo = players[slime.targetId] || lacaios[slime.targetId];
            // TAUNT do Golem (v1.30.3): o Golem vive em `lacaios[pid]` com a MESMA chave do
            // jogador, então durante o rugido o LACAIO deve vencer o `players` na resolução.
            if (slime.tauntTimer > 0 && slime.tauntId) {
                if (lacaios[slime.tauntId]) alvo = lacaios[slime.tauntId];
                else if (players[slime.tauntId]) alvo = players[slime.tauntId];
            }
            // LADINO invisível / SNIPER camuflado: o alvo some da visão — solta o agro
            if (efeitos && (efeitos.temEfeito(alvo, 'invisivel') || (alvo.classe === 'sniper' && efeitos.temEfeito(alvo, 'camuflagem')))) {
                slime.targetId = null;
                return;
            }
            let dx = alvo.x - slime.x;
            let dy = alvo.y - slime.y;
            let dist = Math.hypot(dx, dy);
            let distanciaDesiste = Math.max(slime.aggroRange || 320, DISTANCIA_RETORNO_INIMIGO);

            if (mapaPorCoordenada(slime.x) !== mapaPorCoordenada(alvo.x) || dist > distanciaDesiste) {
                slime.targetId = null;
                slime.retornandoAoLar = true;
                slime.skillCharging = false;
                slime.skillChargeTimer = 0;
                slime.skillAim = null;
                slime.attackCooldown = 0;
                return;
            }

            if (slime.arquetipo && atualizarMonstroEspecial(slime, alvo, dx, dy, dist, fatorLentidao)) {
                return;
            } else if (slime.tipo === "melee") {
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
                        // CEGUEIRA: melee cego erra a mordida/corte normal
                        if (monstroPodeAtacar(slime)) {
                            if (alvo === players[slime.targetId]) {
                                aplicarDanoJogador(slime.targetId, slime.x, slime.y, 12);
                            } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                                danoCausadoAoOgro(slime.tauntId, 12, alvo.x, alvo.y);
                            } else if (alvo) {
                                alvo.hp -= 12;
                                if (alvo.hp < 0) alvo.hp = 0;
                            }
                        }
                        slime.attackCooldown = 0;
                    }
                }
            } else if (slime.tipo === "ranged") {
                const alcanceAtaqueRanged = slime.attackRange || 220;
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
                if (slime.attackCooldown > 60 && monstroPodeAtacar(slime) && podeEntidadeAtacarAlvo(slime, alvo, alcanceAtaqueRanged)) {
                    let ang = Math.atan2(dy, dx);
                    projeteis.push({
                        x: slime.x,
                        y: slime.y,
                        vx: Math.cos(ang) * 10.125,
                        vy: Math.sin(ang) * 10.125,
                        vida: 70,
                        mapa: mapaPorCoordenada(slime.x),
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
                            // CEGUEIRA: zumbi cego erra a mordida normal (cuspida tóxica é skill e continua)
                            if (monstroPodeAtacar(slime)) {
                                if (players[slime.targetId] && alvo === players[slime.targetId]) {
                                    aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 18);
                                } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                                    danoCausadoAoOgro(slime.tauntId, slime.dano || 18, alvo.x, alvo.y);
                                } else if (alvo) {
                                    alvo.hp -= (slime.dano || 18);
                                    if (alvo.hp < 0) alvo.hp = 0;
                                }
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
                    const alcanceAtaqueBesouro = slime.attackRange || 320;
                    if (slime.attackCooldown > 20 && podeEntidadeAtacarAlvo(slime, alvo, alcanceAtaqueBesouro)) {
                        let ang = Math.atan2(dy, dx);
                        projeteis.push({
                            x: slime.x,
                            y: slime.y,
                            vx: Math.cos(ang) * 40.5, // 4x a velocidade padrão (10.125)
                            vy: Math.sin(ang) * 40.5,
                            vida: 90,
                            mapa: mapaPorCoordenada(slime.x),
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
                        // CEGUEIRA: morcego cego erra a mordida normal
                        if (monstroPodeAtacar(slime)) {
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
            }

            if (alvo.hp <= 0) {
                slime.targetId = null;
                slime.tauntTimer = 0;
                slime.tauntId = null;
            } else if (dist > distanciaDesiste && slime.tauntTimer <= 0) {
                slime.targetId = null;
                slime.retornandoAoLar = true;
                slime.attackCooldown = 0;
            }
        } else {
            const distanciaOrigem = Math.hypot(slime.x - slime.origemX, slime.y - slime.origemY);
            if (distanciaOrigem > DISTANCIA_RETORNO_INIMIGO) {
                slime.retornandoAoLar = true;
                moverInimigoParaOrigem(slime, fatorLentidao);
                return;
            }

            slime.patrolTimer++;
            if (slime.patrolTimer > 120) {
                let fatorVel = (slime.tipo === "melee" ? 0.84 : 0.65) * fatorLentidao;
                slime.patrulhaFase += (Math.random() - 0.5) * 0.7;
                slime.dx = Math.cos(slime.patrulhaFase) * fatorVel;
                slime.dy = Math.sin(slime.patrulhaFase) * fatorVel;
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

    // ROQUEIRO: canal de bateria (5s = 100 ticks; batida a cada 10 ticks = 500ms; cancela se mover/morrer)
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

    // ARQUEIRO: rajada de flechas (1s carregando + disparo, cancela ao mover)
    for (let pid in rajadaCanal) {
        let canal = rajadaCanal[pid];
        let player = players[pid];

        if (!player || player.hp <= 0) {
            delete rajadaCanal[pid];
            if (player) player.rajadaAtiva = false;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_arqueiro_rajada_cancel', id: pid }));
                }
            });
            continue;
        }

        let moveDist = Math.hypot(player.x - canal.startX, player.y - canal.startY);
        if (canal.fase === 'carregando' && moveDist > 1.6) {
            delete rajadaCanal[pid];
            player.rajadaAtiva = false;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_arqueiro_rajada_cancel', id: pid }));
                }
            });
            continue;
        }

        if (canal.fase === 'carregando') {
            canal.timer--;
            player.rajadaFase = 'carregando';
            player.rajadaProgresso = Math.max(0, Math.min(1, 1 - canal.timer / 20));
            if (canal.timer <= 0) {
                canal.fase = 'disparo';
                canal.timer = 200;
                player.rajadaFase = 'disparo';
                player.rajadaProgresso = 0;
            }
            continue;
        }

        if (canal.fase === 'disparo') {
            canal.timer--;
            player.rajadaFase = 'disparo';
            player.rajadaProgresso = Math.max(0, Math.min(1, 1 - canal.timer / 200));
            if (canal.timer % 12 === 0) {
                let pX = player.x + 12;
                let pY = player.y + 16;
                let ang = canal.angulo;
                let cone = 1.05; // meia-abertura do cone do VISUAL da rajada (~60°)
                let raioCone = 230; // alcança até onde o visual da rajada percorre (~230px)
                let dano = dmgSkill(player, 'rajada', 18 + Math.min(14, Math.floor((200 - canal.timer) / 15)));
                let alvosAtingidos = 0;

                // Dano em ÁREA: TODOS os inimigos dentro do cone do visual são atingidos (slimes e bosses)
                slimes.forEach(slime => {
                    if (!slime || slime.hp <= 0) return;
                    let dx = slime.x - pX;
                    let dy = slime.y - pY;
                    let dist = Math.hypot(dx, dy);
                    if (dist > raioCone) return;
                    let angAlvo = Math.atan2(dy, dx);
                    let diff = Math.atan2(Math.sin(ang - angAlvo), Math.cos(ang - angAlvo));
                    if (Math.abs(diff) <= cone) {
                        if (canal.stackTargetId === slime.id && canal.stackCount > 0) {
                            canal.stackCount = Math.min(6, canal.stackCount + 1);
                        } else if (alvosAtingidos === 0) {
                            canal.stackCount = 1;
                            canal.stackTargetId = slime.id;
                        }
                        player.rajadaStacks = canal.stackCount;
                        player.rajadaStackTargetId = slime.id;
                        player.rajadaStackTimer = 120;
                        player.velocidadeCrescenteStacks = canal.stackCount;
                        player.velocidadeCrescenteTimer = 120;

                        let bonus = 1 + (canal.stackCount - 1) * 0.12;
                        registrarDanoMonstro(slime, pid, dano * bonus, 'skill');
                        alvosAtingidos++;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_arqueiro_rajada_hit', id: pid, x: slime.x, y: slime.y, stacks: player.rajadaStacks || 0 }));
                            }
                        });
                    }
                });

                // Bosses também são atingidos na mesma rajada (área do cone)
                bosses.forEach(boss => {
                    if (!boss || boss.hp <= 0) return;
                    let dx = boss.x - pX;
                    let dy = boss.y - pY;
                    let dist = Math.hypot(dx, dy);
                    if (dist > raioCone) return;
                    let angAlvo = Math.atan2(dy, dx);
                    let diff = Math.atan2(Math.sin(ang - angAlvo), Math.cos(ang - angAlvo));
                    if (Math.abs(diff) <= cone) {
                        if (canal.stackTargetId === boss.id && canal.stackCount > 0) {
                            canal.stackCount = Math.min(6, canal.stackCount + 1);
                        } else if (alvosAtingidos === 0) {
                            canal.stackCount = 1;
                            canal.stackTargetId = boss.id;
                        }
                        player.rajadaStacks = canal.stackCount;
                        player.rajadaStackTargetId = boss.id;
                        player.rajadaStackTimer = 120;
                        player.velocidadeCrescenteStacks = canal.stackCount;
                        player.velocidadeCrescenteTimer = 120;

                        let bonus = 1 + (canal.stackCount - 1) * 0.12;
                        registrarDanoBoss(boss, pid, dano * bonus, 'skill', 'skill');
                        alvosAtingidos++;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_arqueiro_rajada_hit', id: pid, x: boss.x, y: boss.y, stacks: player.rajadaStacks || 0 }));
                            }
                        });
                    }
                });
            }

            if (canal.timer <= 0) {
                delete rajadaCanal[pid];
                player.rajadaStacks = 0;
                player.rajadaAtiva = false;
                player.rajadaFase = null;
                player.rajadaProgresso = 0;
                player.rajadaStackTargetId = null;
                player.rajadaStackTimer = 0;
                player.velocidadeCrescenteStacks = 0;
                player.velocidadeCrescenteTimer = 0;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'action_arqueiro_rajada_end', id: pid }));
                    }
                });
            }
        }
    }

    for (let pid in players) {
        let p = players[pid];
        if (p.rajadaStackTimer > 0) {
            p.rajadaStackTimer--;
            p.velocidadeCrescenteTimer = p.rajadaStackTimer;
            if (p.rajadaStackTimer <= 0) {
                p.rajadaStacks = 0;
                p.rajadaStackTargetId = null;
                p.velocidadeCrescenteStacks = 0;
                p.velocidadeCrescenteTimer = 0;
            }
        }
        if (p.rajadaStacks > 0 && p.rajadaStackTimer > 0 && efeitos) {
            efeitos.aplicarEfeito(p, 'velocidade', p.rajadaStackTimer, 0.15 + (p.rajadaStacks - 1) * 0.08);
        }
    }

    if (efeitos) {
        for (let pid in players) {
            let p = players[pid];
            if (p && !p.rajadaStacks && efeitos.temEfeito(p, 'velocidade') && p.classe === 'arqueiro' && p.rajadaStackTimer <= 0) {
                let ef = efeitos.pegarEfeito(p, 'velocidade');
                if (ef && ef.intensidade <= 0.2 && ef.intensidade > 0) {
                    efeitos.removerEfeito(p, 'velocidade');
                }
            }
        }
    }

    // ============ BOSS: SIMULAÇÃO GOLEM DE PEDRA ============
    for (let i = bosses.length - 1; i >= 0; i--) {
        let g = bosses[i];

        // STUN (Ladino — Estrela da Morte): golem parado por 2s (40 ticks)
        if (g.stunTimer > 0) {
            g.stunTimer--;
            if (g.stunTimer > 0) {
                // pedra orbital continua orbitando visualmente (o corpo fica imóvel)
                g.pedraX = g.x + Math.cos(g.pedraOrbita) * 58;
                g.pedraY = g.y - 30 + Math.sin(g.pedraOrbita) * 46;
                continue;
            }
        }

        // ARAME PRENDEDOR (Sniper — Skill 2): boss preso = imóvel e sem atacar
        if (g.isPreso && Date.now() < g.isPreso) {
            continue;
        }

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
                g.stunTimer = 0;
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
                // LADINO invisível / SNIPER camuflado: o golem não os enxerga (só o taunt obriga)
                if (efeitos && (efeitos.temEfeito(p, 'invisivel') || efeitos.temEfeito(p, 'camuflagem'))) continue;
                if (mapaPorCoordenada(g.x) !== mapaPorCoordenada(p.x)) continue;
                let d = Math.hypot((p.x + 12) - g.x, (p.y + 16) - g.y);
                if (d < menorDist) {
                    menorDist = d;
                    melhorJogador = pid;
                }
            }
            if (g.tauntTimer > 0 && g.tauntId && (lacaios[g.tauntId] || (players[g.tauntId] && players[g.tauntId].hp > 0))) melhorJogador = g.tauntId;
        }

        // v1.30.3: alvo CONCRETO do bait — quando o taunt veio do Golem (lacaio com mesma
        // chave do jogador), o boss mira e acerta o GOLEM, não o summoner.
        let entidadeAlvo = null;
        if (g.tauntTimer > 0 && g.tauntId && lacaios[g.tauntId]) entidadeAlvo = lacaios[g.tauntId];
        else if (melhorJogador && players[melhorJogador]) entidadeAlvo = players[melhorJogador];

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
        if (entidadeAlvo) {
            let alvoAng = Math.atan2((entidadeAlvo.y + 16) - g.y, (entidadeAlvo.x + 12) - g.x);
            g.angulo += Math.atan2(Math.sin(alvoAng - g.angulo), Math.cos(alvoAng - g.angulo)) * 0.12;
        }

        switch (g.fase) {
            case 'idle': {
                g.pedraOrbita += 0.018 * fatorVel;
                g.pedraX = g.x + Math.cos(g.pedraOrbita) * 58;
                g.pedraY = g.y - 32 + Math.sin(g.pedraOrbita) * 46;
                g.cooldown--;
                if (g.cooldown <= 0 && melhorJogador && entidadeAlvo) {
                    g.alvoX = entidadeAlvo.x + 12;
                    g.alvoY = entidadeAlvo.y + 16;
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
                        if (p.hp > 0 && mapaPorCoordenada(p.x) === mapaPorCoordenada(g.x) && Math.hypot((p.x + 12) - g.alvoX, (p.y + 16) - g.alvoY) < 90) {
                            aplicarDanoJogador(pid, g.alvoX, g.alvoY, danoAtual);
                        }
                    }
                    // Boss tauntado pelo Golem: a pedra também acerta o próprio Golem
                    if (g.tauntTimer > 0 && g.tauntId && lacaios[g.tauntId] && lacaios[g.tauntId].hp > 0) {
                        const ogroBoss = lacaios[g.tauntId];
                        if (mapaPorCoordenada(ogroBoss.x) === mapaPorCoordenada(g.x) && Math.hypot(ogroBoss.x - g.alvoX, ogroBoss.y - g.alvoY) < 90) {
                            danoCausadoAoOgro(g.tauntId, danoAtual, ogroBoss.x, ogroBoss.y);
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
        playersVisivel[pid].ressurreicaoCooldownRestante = Math.max(0, (cooldownRessurreicao[pid] || 0) - Date.now());
        playersVisivel[pid].auraSagradaAliado = !!aliadoNaAura(pid);
        // NOVAS CLASSES (v1.31): estado do Drone e modos ativos (server-authoritative)
        playersVisivel[pid].dmDroneX = (p.classe === 'dronemaster') ? Math.round(p.dmDroneX || 0) : 0;
        playersVisivel[pid].dmDroneY = (p.classe === 'dronemaster') ? Math.round(p.dmDroneY || 0) : 0;
        playersVisivel[pid].dmTitaAtivo = (p.classe === 'dronemaster') ? !!p.dmTitaAtivo : false;
        playersVisivel[pid].dmSupressaoAtivo = (p.classe === 'dronemaster') ? (p.dmSupressaoTimer > 0) : false;
        playersVisivel[pid].dmAssaltoAtivo = (p.classe === 'dronemaster') ? (p.dmAssaltoTimer > 0) : false;
        playersVisivel[pid].snPosicao = (p.classe === 'sniper') ? !!p.snPosicao : false;
        playersVisivel[pid].snCamuflado = (p.classe === 'sniper') ? !!p.snCamuflado : false;
        playersVisivel[pid].snAimAtivo = (p.classe === 'sniper') ? !!p.snAim : false;
        playersVisivel[pid].escudoAbsoluto = Math.round(p.escudoAbsoluto || 0);
        playersVisivel[pid].escudoAbsolutoMax = Math.round(p.escudoAbsolutoMax || 0);
    }

    wss.clients.forEach((client) => {
        if (client.readyState !== WebSocket.OPEN) return;
        const jogadorCliente = client._playerId ? players[client._playerId] : null;
        const mapaCliente = jogadorCliente ? mapaPorCoordenada(jogadorCliente.x + PLAYER_OFFSET_X) : null;
        const jogadoresDoMapa = {};
        if (mapaCliente) {
            for (const pid in playersVisivel) {
                if (entidadeNoMapa(playersVisivel[pid], mapaCliente)) jogadoresDoMapa[pid] = playersVisivel[pid];
            }
        }
        client.send(JSON.stringify({
            type: 'world_update',
            players: jogadoresDoMapa,
            slimes: filtrarPorMapa(slimes, mapaCliente),
            projeteis: filtrarPorMapa(projeteis, mapaCliente),
            playerProjeteis: filtrarPorMapa(playerProjeteis, mapaCliente),
            lacaios: Object.fromEntries(Object.entries(lacaios).filter(function (entry) { return entidadeNoMapa(entry[1], mapaCliente); })),
            bandas: Object.fromEntries(Object.entries(bandas).filter(function (entry) { return players[entry[0]] && mapaPorCoordenada(players[entry[0]].x + PLAYER_OFFSET_X) === mapaCliente; })),
            bosses: filtrarPorMapa(bosses, mapaCliente),
            drops: filtrarPorMapa(dropsChao, mapaCliente),
            gases: filtrarPorMapa(gasesVeneno, mapaCliente),
            mapVfx: mapVfx.filter(function (v) { return v.mapa === mapaCliente; }),
            // ===== NOVAS CLASSES (v1.31): zonas de chão + moitas =====
            caixasFerramentas: filtrarPorMapa(caixasFerramentas, mapaCliente),
            chuvasCometas: filtrarPorMapa(chuvasCometas, mapaCliente),
            orbeConstelacoes: filtrarPorMapa(orbeConstelacoes, mapaCliente),
            redesSniper: filtrarPorMapa(redesSniper, mapaCliente),
            moitas: MOITAS_SNIPER
        }), () => {});
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
                userId = (data.userId || data.id || "Guerreiro").trim();
                playerId = "heroi_" + userId;
                ws._playerId = playerId;
                playerSockets[playerId] = ws;

                let ehAdminConta = (userId.toLowerCase() === 'admin') || (spawnsAdmin ? spawnsAdmin.ehAdmin(userId) : false);
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
                    uiLayout: (dadosSalvos && dadosSalvos.uiLayout) ? dadosSalvos.uiLayout : {},
                    isDashing: false,
                    mapaTransicaoAte: 0,
                    furiaTimer: 0,
                    giroDescontroladoTimer: 0,
                    giroDescontroladoCooldown: 0,
                    giroDescontroladoAtivo: false,
                    furiaCrescenteNivel: 0,
                    stunTimer: 0,
                    lastBasicAttack: 0,
                    // ===== LADINO (estado de skills — server-authoritative) =====
                    ladinoDancaAtivo: false,
                    ladinoDanca: null,
                    ladinoDancaCooldown: 0,
                    ladinoInvisivel: false,
                    ladinoInvisivelTimer: 0,
                    ladinoInvisivelBonus: false,
                    ladinoCamuflagemDelay: 0,
                    ladinoCamuflagemCdAtivo: false,
                    ladinoCamuflagemCooldown: 0,
                    ladinoBombaCooldown: 0,
                    ladinoEstrela: null,
                    ladinoEstrelaCooldown: 0,
                    // ===== DRONEMASTER (estado das skills — server-authoritative) =====
                    dmOrbitaAng: Math.random() * Math.PI * 2,
                    dmDroneX: (dadosSalvos && dadosSalvos.x !== undefined ? dadosSalvos.x : CIDADE_SPAWN_X) + 35,
                    dmDroneY: (dadosSalvos && dadosSalvos.y !== undefined ? dadosSalvos.y : CIDADE_SPAWN_Y) + 35,
                    dmDroneAlvo: null,          // alvo corrente do Drone (id + tipo)
                    dmDroneAtaqueCd: 0,         // cadência interna do Drone (ticks)
                    dmSupressaoTimer: 0,        // skill 1 (Modo Supressão) — ticks restantes
                    dmSupressaoCooldown: 0,
                    dmAssaltoTimer: 0,          // skill 2 (Modo Assalto — mini robô)
                    dmAssaltoCooldown: 0,
                    dmCaixaCooldown: 0,         // skill 3 (Caixa de Ferramentas)
                    dmTitaAtivo: false,         // skill 4 (Protocolo Titã)
                    dmTitaTimer: 0,
                    dmTitaCooldown: 0,
                    dmTitaReviveCooldown: 0,    // 5 min após o revive do robô
                    dmDashEscudo: 0,            // Dash = Escudo (50% vida máx, 3s)
                    dmDashEscudoExpirador: 0,
                    dmHealTick: 0,              // passiva: +2% vida máx/s
                    // ===== ARQUEIRO ARCANO (estado das skills — server-authoritative) =====
aaCometasCooldown: 0,
                   aaOrbeCooldown: 0,
                   aaCascataCooldown: 0,
                    // ===== SNIPER (estado das skills — server-authoritative) =====
                    snAim: null,                // { timer (ticks), fired } — Disparo Supremo
                    snAimCooldown: 0,
                    snRedeCooldown: 0,
                    snCamuflado: false,
                    snPosicao: false,           // Posição de Franco-Atirador (deitado)
                    snPosicaoCd: 0,
                    // ===== ESCUDO ABSORVENTE (caixa de ferramentas / dash do DroneMaster) =====
                    escudoAbsoluto: 0,
                    escudoAbsolutoExpirador: 0,
                    escudoAbsolutoMax: 0,
                    // SUMMONER: modo do Golem (agressivo ataca o alvo focado; passivo só rodeia a invocadora)
                    ogroModo: (dadosSalvos && (dadosSalvos.ogroModo === 'agressivo' || dadosSalvos.ogroModo === 'passivo')) ? dadosSalvos.ogroModo : 'agressivo',
                    isAdmin: ehAdminConta
                };
                players[playerId].maxHp = calcularMaxHp(players[playerId]);
                if (players[playerId].hp > players[playerId].maxHp) players[playerId].hp = players[playerId].maxHp;
                players[playerId].maxMp = calcularMaxMp(players[playerId]);
                if (players[playerId].mana > players[playerId].maxMp) players[playerId].mana = players[playerId].maxMp;
                const posicaoLogin = encontrarPosicaoJogadorSegura(players[playerId], players[playerId].x, players[playerId].y);
                if (posicaoLogin) {
                    players[playerId].x = posicaoLogin.x;
                    players[playerId].y = posicaoLogin.y;
                } else {
                    players[playerId].x = CIDADE_SPAWN_X;
                    players[playerId].y = CIDADE_SPAWN_Y;
                }

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
                    ogroModo: players[playerId].ogroModo || 'agressivo',
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
                ws.send(JSON.stringify({ type: 'map_vfx', vfx: mapVfx }));
                if (mapaCidade && typeof mapaCidade.obterObstaculos === 'function') {
                    ws.send(JSON.stringify({
                        type: 'colisoes_atualizadas',
                        mapa: 'cidade',
                        obstaculos: mapaCidade.obterObstaculos(),
                        camadas: typeof mapaCidade.obterCamadas === 'function' ? mapaCidade.obterCamadas() : []
                    }));
                }
                if (players[playerId].uiLayout && Object.keys(players[playerId].uiLayout).length) {
                    ws.send(JSON.stringify({ type: 'ui_layout', layout: players[playerId].uiLayout }));
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

            // ===== MOVER item dentro da mochila (Drag & Drop de reordenação) =====
            if (data.action === 'mover_item_mochila') {
                let p = players[playerId];
                if (!p.inventario || !Array.isArray(p.inventario.mochila)) return;
                let idxOrig = p.inventario.mochila.findIndex(i => String(i.id) === String(data.id));
                if (idxOrig === -1) return;
                let item = p.inventario.mochila.splice(idxOrig, 1)[0];
                let idxAlvo = -1;
                if (data.targetId) idxAlvo = p.inventario.mochila.findIndex(i => String(i.id) === String(data.targetId));
                if (idxAlvo >= 0) p.inventario.mochila.splice(idxAlvo, 0, item);
                else p.inventario.mochila.push(item);
                salvarProgresso(userId, { inventario: p.inventario });
                ws.send(JSON.stringify({ type: 'inventario_sync', inventario: p.inventario }));
                return;
            }

            // ===== SALVAR / RESTAURAR layout da interface (Editor de UI) =====
            if (data.action === 'salvar_ui_layout') {
                let p = players[playerId];
                let layoutLimpo = {};
                let cont = 0;
                if (data.layout && typeof data.layout === 'object') {
                    for (let k in data.layout) {
                        if (cont >= 60) break;
                        let v = data.layout[k];
                        if (v && typeof v.x === 'number' && typeof v.y === 'number'
                            && Number.isFinite(v.x) && Number.isFinite(v.y)) {
                            layoutLimpo[k] = { x: Math.round(v.x), y: Math.round(v.y) };
                            cont++;
                        }
                    }
                }
                p.uiLayout = layoutLimpo;
                salvarProgresso(userId, { uiLayout: p.uiLayout });
                ws.send(JSON.stringify({ type: 'ui_layout_saved', layout: p.uiLayout }));
                return;
            }

            if (data.action === 'restaurar_ui_layout') {
                let p = players[playerId];
                p.uiLayout = {};
                salvarProgresso(userId, { uiLayout: p.uiLayout });
                ws.send(JSON.stringify({ type: 'ui_layout_reset' }));
                return;
            }

            if (data.action === 'escolher_classe') {
                if (aurasSagradas[playerId]) desativarAuraSagrada(playerId, 'classe_alterada');
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
                    lacaios[playerId] = { x: players[playerId].x + 35, y: players[playerId].y + 35, hp: petHp, maxHp: petHp, attackCooldown: 0, angleOffset: 0, skillCooldown: 0, skill2Cooldown: 0, isJumping: false, targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null, modo: (players[playerId].ogroModo === 'passivo' ? 'passivo' : 'agressivo'), rugidoTimer: 200, rugindoTimer: 0 };
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
                // Ladino: limpa máquinas de estado ao trocar de classe
                {
                    let lp = players[playerId];
                    lp.ladinoDancaAtivo = false;
                    lp.ladinoDanca = null;
                    lp.ladinoEstrela = null;
                    lp.ladinoInvisivel = false;
                    lp.ladinoInvisivelBonus = false;
                    lp.ladinoInvisivelTimer = 0;
                    lp.ladinoCamuflagemDelay = 0;
                    lp.ladinoCamuflagemCdAtivo = false;
                    if (efeitos) efeitos.removerEfeito(lp, 'invisivel');
                }
                // Novas classes (v1.31): limpa máquinas de estado ao trocar de classe
                {
                    let np = players[playerId];
                    np.dmSupressaoTimer = 0;
                    np.dmAssaltoTimer = 0;
                    np.dmTitaAtivo = false;
                    np.dmTitaTimer = 0;
                    np.dmDroneAlvo = null;
                    np.dmDashEscudo = 0;
                    np.escudoAbsoluto = 0;
                    np.snAim = null;
                    np.snPosicao = false;
                    if (np.snCamuflado) finalizarCamuflagemSniper(np, playerId, 'classe_alterada');
                    np.snCamuflado = false;
                    if (efeitos) efeitos.removerEfeito(np, 'camuflagem');
                }
                // zera zonas do jogador que trocou de classe (caixas não persistem)
                for (let i = caixasFerramentas.length - 1; i >= 0; i--) {
                    if (caixasFerramentas[i].ownerId === playerId) caixasFerramentas.splice(i, 1);
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

            if (data.action === 'admin_map_vfx' || data.action === 'admin_map_vfx_excluir') {
                let p = players[playerId];
                if (!p || !p.isAdmin) return;
                if (data.action === 'admin_map_vfx_excluir') {
                    mapVfx = mapVfx.filter(function (v) { return v.id !== data.id; });
                } else if (data.vfx && ['criar', 'editar'].includes(data.sub)) {
                    let v = data.vfx;
                    let mapa = mapaPorCoordenada(Number(v.x));
                    if (!mapa || !Number.isFinite(Number(v.x)) || !Number.isFinite(Number(v.y))) return;
                    let lim = mapVfx.find(function (item) { return item.id === v.id; });
                    let limpo = { id: String(v.id || ('vfx_' + Date.now().toString(36))), mapa: mapa, x: Math.round(Number(v.x)), y: Math.round(Number(v.y)), tipo: String(v.tipo || 'lampada').slice(0, 32), escala: Math.max(.3, Math.min(4, Number(v.escala) || 1)), intensidade: Math.max(.1, Math.min(2, Number(v.intensidade) || 1)), raio: Math.max(20, Math.min(260, Number(v.raio) || 80)), cor: /^#[0-9a-fA-F]{6}$/.test(v.cor || '') ? v.cor : '#ffd166' };
                    if (lim) Object.assign(lim, limpo); else mapVfx.push(limpo);
                }
                salvarMapVfx();
                broadcastMapVfx();
                return;
            }

            // ===== ADMIN: EDITOR DE COLISÕES (validação estrita de cargo) =====
            if (data.action === 'admin_salvar_colisoes') {
                let p = players[playerId];
                let ehAdmin = (p && p.isAdmin) || (ws && ws.ehAdminCliente) || (p && p.nome && p.nome.toLowerCase() === 'admin');
                if (!ehAdmin) {
                    console.warn('[SEGURANÇA] Tentativa não autorizada de salvar colisões por: ' + (p ? p.nome : 'desconhecido'));
                    return;
                }
                const mapa = data.mapa || 'cidade';
                if (mapa === 'cidade' && Array.isArray(data.obstaculos)) {
                    if (mapaCidade && typeof mapaCidade.carregarObstaculos === 'function') {
                        mapaCidade.carregarObstaculos(data.obstaculos);
                    }
                    try {
                        const fileCol = path.join(__dirname, 'colisoes_cidade.json');
                        fs.writeFileSync(fileCol, JSON.stringify(data.obstaculos, null, 2), 'utf-8');
                        console.log('[ADMIN] Colisões da cidade salvas com sucesso (' + data.obstaculos.length + ' obstáculos).');
                    } catch (err) {
                        console.error('Erro ao salvar colisoes_cidade.json:', err.message);
                    }
                    if (Array.isArray(data.camadas) && mapaCidade && typeof mapaCidade.carregarCamadas === 'function') {
                        mapaCidade.carregarCamadas(data.camadas);
                        try {
                            const fileCamadas = path.join(__dirname, 'camadas_cidade.json');
                            fs.writeFileSync(fileCamadas, JSON.stringify(data.camadas, null, 2), 'utf-8');
                            console.log('[ADMIN] Camadas da cidade salvas com sucesso (' + data.camadas.length + ' áreas).');
                        } catch (err) {
                            console.error('Erro ao salvar camadas_cidade.json:', err.message);
                        }
                    }
                    // Broadcast para todos os clientes conectados
                    const msg = JSON.stringify({
                        type: 'colisoes_atualizadas',
                        mapa: 'cidade',
                        obstaculos: (mapaCidade && typeof mapaCidade.obterObstaculos === 'function') ? mapaCidade.obterObstaculos() : data.obstaculos,
                        camadas: (mapaCidade && typeof mapaCidade.obterCamadas === 'function') ? mapaCidade.obterCamadas() : (data.camadas || [])
                    });
                    wss.clients.forEach(function (c) {
                        if (c.readyState === WebSocket.OPEN) c.send(msg);
                    });
                    try {
                        ws.send(JSON.stringify({
                            type: 'colisoes_salvas',
                            sucesso: true,
                            total: data.obstaculos.length,
                            totalCamadas: Array.isArray(data.camadas) ? data.camadas.length : 0
                        }));
                    } catch (_) {}
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

            // Respawn tem prioridade sobre a janela de transicao do teleporte:
            // morrer e renascer deve sempre devolver o jogador para a cidade.
            if (data.action === 'respawn' && players[playerId]) {
                if (aurasSagradas[playerId]) desativarAuraSagrada(playerId, 'respawn');
                players[playerId].hp = players[playerId].maxHp;
                players[playerId].estamina = 100;
                players[playerId].mana = players[playerId].maxMp;
                players[playerId].stunTimer = 0;
                players[playerId].efeitos = [];
                players[playerId].gritoGuerraBonus = 0;
                players[playerId].furiaTimer = 0;
                players[playerId].giroDescontroladoTimer = 0;
                players[playerId].isDashing = false;
                players[playerId].dashTarget = null;
                const destinoRespawnPrioritario = encontrarPosicaoJogadorSegura(players[playerId], CIDADE_SPAWN_X, CIDADE_SPAWN_Y);
                players[playerId].x = destinoRespawnPrioritario ? destinoRespawnPrioritario.x : CIDADE_SPAWN_X;
                players[playerId].y = destinoRespawnPrioritario ? destinoRespawnPrioritario.y : CIDADE_SPAWN_Y;
                players[playerId].mapaTransicaoAte = 0;
                delete bateriaCanal[playerId];
                if (players[playerId].classe === 'summoner') {
                    delete petRespawnTimer[playerId];
                    let petHp = calcularVidaPet(players[playerId]);
                    lacaios[playerId] = { x: players[playerId].x + 30, y: players[playerId].y + 30, hp: petHp, maxHp: petHp, attackCooldown: 0, angleOffset: 0, skillCooldown: 0, skill2Cooldown: 0, isJumping: false, targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null, modo: (players[playerId].ogroModo === 'passivo' ? 'passivo' : 'agressivo'), rugidoTimer: 200, rugindoTimer: 0 };
                }
                salvarProgresso(userId, { hp: players[playerId].hp, x: players[playerId].x, y: players[playerId].y });
                ws.send(JSON.stringify({ type: 'respawn_confirmado', mapa: 'cidade', x: players[playerId].x, y: players[playerId].y }));
                return;
            }

            if (players[playerId].hp > 0) {
                if (players[playerId].mapaTransicaoAte && players[playerId].mapaTransicaoAte > Date.now()) {
                    if (data.angulo !== undefined) players[playerId].angulo = data.angulo;
                    return;
                }
                let podeMover = players[playerId].stunTimer <= 0;
                // LADINO: movimento travado durante a Dança das Adagas e a Estrela da Morte
                // (o servidor controla a posição na coreografia; o cliente não deve interromper)
                if (podeMover && (players[playerId].ladinoDancaAtivo || players[playerId].ladinoEstrela)) {
                    podeMover = false;
                }
                // SNIPER: sem movimento durante a mira do Disparo Supremo e na Posição de Franco-Atirador
                if (podeMover && (players[playerId].snAim || players[playerId].snPosicao)) {
                    podeMover = false;
                }
                if (efeitos && podeMover) {
                    podeMover = !efeitos.temEfeito(players[playerId], 'paralisia') && !efeitos.temEfeito(players[playerId], 'sono') && !efeitos.temEfeito(players[playerId], 'rede');
                }
                if (podeMover) {
                    const targetX = data.x !== undefined ? Number(data.x) : players[playerId].x;
                    const targetY = data.y !== undefined ? Number(data.y) : players[playerId].y;
                    const movimento = validarMovimentoJogador(players[playerId], targetX, targetY);
                    if (movimento.aceito || movimento.parcial) {
                        players[playerId].x = movimento.x;
                        players[playerId].y = movimento.y;
                    }
                    if (data.moving !== undefined) players[playerId].moving = data.moving;
                    // SNIPER — CAMUFLAGEM: saiu do mato → perde a camuflagem
                    const pSnC = players[playerId];
                    if (pSnC && pSnC.snCamuflado && !sniperNoMato(pSnC.x + PLAYER_OFFSET_X, pSnC.y + PLAYER_OFFSET_Y)) {
                        finalizarCamuflagemSniper(pSnC, playerId, 'saiu_mato');
                    }
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
                    'dash', 'tornado', 'corte', 'guerreiro_provocacao', 'ataque_mago', 'mago_vulcao', 'ataque_summoner', 'ataque_arqueiro', 'ataque_curandeiro',
                    'ataque_dronemaster', 'dronemaster_supressao', 'dronemaster_assalto', 'dronemaster_caixa', 'dronemaster_tita',
                    'ataque_arqueiro_arcano', 'arqueiro_cometas', 'arqueiro_orbe', 'arqueiro_cascata',
                    'ataque_sniper', 'sniper_apontar', 'sniper_fogo', 'sniper_rede', 'sniper_camuflagem', 'sniper_posicao'
                ];
                if (ccAtivo && acoesBloqueadasPorCC.indexOf(data.action) !== -1) {
                    return; // Bloqueado por CC
                }
                if (rajadaCanal[playerId] && rajadaCanal[playerId].fase === 'carregando' && data.action !== 'arqueiro_rajada') {
                    let acoesDuranteRajada = ['ataque_barbaro', 'ataque_roqueiro', 'ataque_mago', 'ataque_summoner', 'ataque_arqueiro', 'ataque_curandeiro', 'corte', 'dash', 'tornado'];
                    if (acoesDuranteRajada.indexOf(data.action) !== -1) return;
                }

                // ATAQUE BÁSICO DO BÁRBARO: MACHADADA ENSANGUENTADA (20 DANO + VAMPIRISMO EM FÚRIA)
                if (data.action === 'ataque_barbaro') {
                    // GIRO DESCONTROLADO ativo: o ataque básico NÃO funciona (server-authoritative)
                    if (players[playerId].giroDescontroladoAtivo) return;
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    players[playerId].lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(players[playerId], data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) {
                        if (!alvoAuto) return; // alvo inválido/morto/outro mapa/fora do alcance → rejeita
                    }

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let anguloMachado = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : players[playerId].angulo;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_machadada', id: playerId, x: pX, y: pY }));
                        }
                    });

                    let danoMachado = dmgSkill(players[playerId], 'machadada', 20);
                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            let dist = Math.hypot(pX - slime.x, pY - slime.y);
                            if (dist < 100) {
                                let anguloAteSlime = Math.atan2(slime.y - pY, slime.x - pX);
                                let diff = Math.atan2(Math.sin(anguloMachado - anguloAteSlime), Math.cos(anguloMachado - anguloAteSlime));

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
                    danoEmBosses(pX, pY, 100, playerId, 20, 'basico');
                    if (players[playerId].furiaTimer > 0 && bosses.some(bb => bb.hp > 0 && Math.hypot(pX - bb.x, pY - bb.y) < 95)) {
                        aplicarCuraAoJogador(playerId, 8);
                    }
                }

                // HABILIDADE 1 DO BÁRBARO: FÚRIA BERSERKER (6s de buff de vampirismo)
                if (data.action === 'barbaro_furia') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'furia', 20))) return;
                    players[playerId].furiaTimer = 120; // 6 segundos
                    efeitos.aplicarEfeito(players[playerId], 'furia', 120, 0.25);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_furia', id: playerId, duracaoMs: 6000 }));
                        }
                    });
                    sincronizarEfeitos(playerId, players[playerId]);
                }

                // HABILIDADE 2 DO BÁRBARO: SALTO ESMAGADOR (35 de dano em área + Salto)
                if (data.action === 'barbaro_esmagamento') {
                    const alvoEsmagamentoX = Number(data.targetX);
                    const alvoEsmagamentoY = Number(data.targetY);
                    const destinoEsmagamento = validarDestinoJogador(
                        alvoEsmagamentoX - PLAYER_OFFSET_X,
                        alvoEsmagamentoY - PLAYER_OFFSET_Y
                    );
                    if (!destinoEsmagamento.aceito) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'esmagamento-barbaro', 25))) return;
                    players[playerId].x = destinoEsmagamento.x;
                    players[playerId].y = destinoEsmagamento.y;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_esmagamento', x: players[playerId].x + PLAYER_OFFSET_X, y: players[playerId].y + PLAYER_OFFSET_Y }));
                        }
                    });

                    let danoEsmaga = dmgSkill(players[playerId], 'esmagamento-barbaro', 35);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - (players[playerId].x + PLAYER_OFFSET_X), slime.y - (players[playerId].y + PLAYER_OFFSET_Y)) < 75) {
                            registrarDanoMonstro(slime, playerId, danoEsmaga);
                            slime.stunTimer = 25;
                        }
                    });
                    danoEmBosses(players[playerId].x + PLAYER_OFFSET_X, players[playerId].y + PLAYER_OFFSET_Y, 90, playerId, danoEsmaga, 'skill');
                }

                // HABILIDADE 3 DO BÁRBARO: GIRO DESCONTROLADO (10s de dano em área + sangramento + redução 10%)
                if (data.action === 'barbaro_giro_descontrolado') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if (p.giroDescontroladoTimer > 0 || p.giroDescontroladoCooldown > 0) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'giro_descontrolado', 30))) return;

                    const duracaoGiroMs = 10000;
                    p.giroDescontroladoTimer = Math.ceil(duracaoGiroMs / 50);
                    p.giroDescontroladoExpiresAt = Date.now() + duracaoGiroMs;
                    p.giroDescontroladoAtivo = true;
                    p.giroDescontroladoCooldown = 240; // 12s de cooldown
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_giro_start', id: playerId, x: p.x + 12, y: p.y + 16, duracaoMs: duracaoGiroMs }));
                        }
                    });
                }

                // ROQUEIRO: RIFF DE GUITARRA (Ataque básico)
                if (data.action === 'ataque_roqueiro') {
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    players[playerId].lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(players[playerId], data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) {
                        if (!alvoAuto) return; // alvo inválido/morto/outro mapa/fora do alcance → rejeita
                    }

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let ang = (data.angulo !== undefined) ? data.angulo : players[playerId].angulo;
                    if (alvoAuto) ang = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX); // mira o alvo validado

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
                    bateriaCanal[playerId] = { timer: 100, beat: 0, startX: players[playerId].x, startY: players[playerId].y, danoBateria: dmgSkill(players[playerId], 'bateria', 30) };

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
                    const tx = Number(data.targetX);
                    const ty = Number(data.targetY);
                    const destinoTeleporte = validarDestinoJogador(
                        tx - PLAYER_OFFSET_X,
                        ty - PLAYER_OFFSET_Y
                    );
                    if (!destinoTeleporte.aceito) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'teleporte', 15))) return;
                    players[playerId].x = destinoTeleporte.x;
                    players[playerId].y = destinoTeleporte.y;

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

                // ROQUEIRO: GRITO DE GUERRA (buff em área: crítico, dano crítico e HP temporal)
                if (data.action === 'roqueiro_grito_guerra') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if ((p.gritoGuerraCooldown || 0) > agora) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'grito_guerra', 30))) return;

                    let raio = 220;
                    let alvos = [];
                    for (let id in players) {
                        let ally = players[id];
                        if (!ally || ally.hp <= 0) continue;
                        let ehAliado = (id === playerId) || (p.partyId && ally.partyId === p.partyId);
                        if (ehAliado && Math.hypot((ally.x + 12) - (p.x + 12), (ally.y + 16) - (p.y + 16)) <= raio) {
                            alvos.push(id);
                        }
                    }
                    if (alvos.length === 0) alvos.push(playerId);

                    alvos.forEach((alvoId) => {
                        let alvo = players[alvoId];
                        if (!alvo || alvo.hp <= 0) return;
                        let bonusMaxHp = Math.round((alvo.maxHp || 100) * 0.05);
                        alvo.gritoGuerraBonus = Math.max(alvo.gritoGuerraBonus || 0, bonusMaxHp);
                        atualizarBonusMaxHpGritoGuerra(alvo);
                        alvo.hp = Math.min(alvo.maxHp, alvo.hp + bonusMaxHp);
                        efeitos.aplicarEfeito(alvo, 'gritoDeGuerra', 600, 1);
                        sincronizarEfeitos(alvoId, alvo);
                    });

                    p.gritoGuerraCooldown = agora + 60000;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_roqueiro_grito_guerra', id: playerId, x: p.x + 12, y: p.y + 16, raio: raio, alvos: alvos }));
                        }
                    });
                }

                // ===== LADINO: ATAQUE BÁSICO (ADAGA) — cone curto e rápido =====
                if (data.action === 'ataque_ladino') {
                    let pA = players[playerId];
                    if (!pA || pA.hp <= 0) return;
                    // Travado durante coreografias (servidor controla a posição)
                    if (pA.ladinoDancaAtivo || pA.ladinoEstrela) return;
                    if (agora - pA.lastBasicAttack < tempoAtaqueBasico(pA, tempoBaseAtaqueBasico(pA))) return;
                    pA.lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(pA, data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) {
                        if (!alvoAuto) return; // alvo inválido/morto/outro mapa/fora do alcance → rejeita
                    }

                    let pX = pA.x + 12;
                    let pY = pA.y + 16;
                    let anguloAdaga = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : ((data.angulo !== undefined) ? data.angulo : pA.angulo);

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_ladino_golpe', id: playerId, x: pX, y: pY, angulo: anguloAdaga }));
                        }
                    });

                    let danoAdaga = dmgSkill(pA, 'adaga', 12);
                    const alcanceAdaga = alcanceAtaqueBasicoClasse(pA); // 110
                    slimes.forEach(slime => {
                        if (slime.hp <= 0) return;
                        let dist = Math.hypot(pX - slime.x, pY - slime.y);
                        if (dist < alcanceAdaga) {
                            let anguloAteSlime = Math.atan2(slime.y - pY, slime.x - pX);
                            let diff = Math.atan2(Math.sin(anguloAdaga - anguloAteSlime), Math.cos(anguloAdaga - anguloAteSlime));
                            if (Math.abs(diff) < 1.05) {
                                registrarDanoMonstro(slime, playerId, danoAdaga, 'player');
                            }
                        }
                    });
                    danoEmBosses(pX, pY, alcanceAdaga, playerId, danoAdaga, 'basico', 'player');
                }

                // ===== LADINO SKILL 1: DANÇA DAS ADAGAS (5 teleportes/hits + retorno + imune) =====
                if (data.action === 'ladino_danca') {
                    let pD = players[playerId];
                    if (!pD || pD.hp <= 0) return;
                    if (pD.ladinoDancaAtivo || (agora - pD.ladinoDancaCooldown) < 0) return;
                    // Busca alvos ANTES de gastar mana: sem alvo válido = skill não consome nada.
                    // LIMITE DE DISTÂNCIA: a dança só alcança os alvos MAIS PRÓXIMOS (110px = ~50% do antigo 220px).
                    const alvosDanca = coletarAlvosDancaLadino(pD, 110);
                    if (alvosDanca.length === 0) { avisaForaAlcance(ws, 'ladino_danca'); return; }
                    if (!gastarMana(ws, pD, mpSkill(pD, 'danca_das_adagas', 25))) return;
                    pD.ladinoDancaCooldown = agora + 12000; // CD 12s

                    // Monta a sequência de até 5 hits: `coletarAlvosDancaLadino` já devolve
                    // ordenado por proximidade — a coreografia atinge até 5 alvos MAIS PRÓXIMOS
                    // (distintos primeiro) sem teleporte para alvo distante, e repete entre
                    // esse grupo para completar os 5 hits quando houver menos de 5 alvos.
                    const proximosDanca = alvosDanca.slice(0, Math.min(5, alvosDanca.length));
                    const seqDanca = [];
                    for (let i = 0; i < proximosDanca.length; i++) seqDanca.push({ id: proximosDanca[i].id, tipo: proximosDanca[i].tipo });
                    while (seqDanca.length < 5) {
                        const esc = proximosDanca[Math.floor(Math.random() * proximosDanca.length)];
                        seqDanca.push({ id: esc.id, tipo: esc.tipo });
                    }

                    pD.ladinoDancaAtivo = true;
                    pD.ladinoDanca = {
                        seq: seqDanca,
                        idx: 0,
                        step: 1, // primeiro hit imediato
                        startX: pD.x,
                        startY: pD.y,
                        danoBase: dmgSkill(pD, 'danca_das_adagas', 15)
                    };

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_ladino_danca',
                                id: playerId,
                                startX: pD.x + 12,
                                startY: pD.y + 16,
                                alvos: alvosDanca.map(a => ({ x: a.x, y: a.y, tipo: a.tipo }))
                            }));
                        }
                    });
                }

                // ===== LADINO SKILL 2: NÉVOA VENENOSA (bomba → zona de gás 5s + cegueira) =====
                if (data.action === 'ladino_bomba') {
                    let pB = players[playerId];
                    if (!pB || pB.hp <= 0) return;
                    if (agora - pB.ladinoBombaCooldown < 0) return;
                    const bombX = Number(data.targetX);
                    const bombY = Number(data.targetY);
                    if (!Number.isFinite(bombX) || !Number.isFinite(bombY)) return;
                    const pBx = pB.x + PLAYER_OFFSET_X;
                    const pBy = pB.y + PLAYER_OFFSET_Y;
                    // Mesmo mapa e alcance máximo de 400px (mira validada)
                    if (mapaPorCoordenada(pBx) !== mapaPorCoordenada(bombX)) return;
                    const distBomba = Math.hypot(bombX - pBx, bombY - pBy);
                    if (distBomba > 200) { avisaForaAlcance(ws, 'ladino_bomba'); return; } // alcance de arremesso reduzido ~50% (era 400px); a área da nuvem (raio 90) permanece
                    if (!gastarMana(ws, pB, mpSkill(pB, 'nevoeiro_venenoso', 20))) return;
                    pB.ladinoBombaCooldown = agora + 8000; // CD 8s

                    gasVenenoSeq++;
                    const zonaId = 'gas_' + playerId + '_' + gasVenenoSeq;
                    gasesVeneno.push({
                        id: zonaId,
                        x: bombX,
                        y: bombY,
                        mapa: mapaPorCoordenada(bombX),
                        raio: 90,
                        tempo: 100,      // 5s = 100 ticks de 50ms
                        duracao: 100,
                        ownerId: playerId,
                        danoBase: dmgSkill(pB, 'nevoeiro_venenoso', 8)
                    });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_ladino_bomba', id: zonaId, x: bombX, y: bombY, raio: 90, ownerId: playerId }));
                        }
                    });
                }

                // ===== LADINO SKILL 3: CAMUFLAGEM SOMBRIA (delay 1s → invis 10s → CD travado) =====
                if (data.action === 'ladino_camuflagem') {
                    let pC = players[playerId];
                    if (!pC || pC.hp <= 0) return;
                    // Não reativa durante delay/invis; CD só inicia quando a invis TERMINA
                    if (pC.ladinoCamuflagemDelay > 0 || pC.ladinoInvisivel || pC.ladinoCamuflagemCdAtivo) return;
                    if (!gastarMana(ws, pC, mpSkill(pC, 'camuflagem_sombria', 20))) return;
                    pC.ladinoCamuflagemDelay = 20; // 1s = 20 ticks
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_ladino_camuflagem', id: playerId }));
                        }
                    });
                }

                // ===== LADINO SKILL 4: ESTRELA DA MORTE (5 vértices → centro → salto → stun 2s) =====
                if (data.action === 'ladino_estrela') {
                    let pE = players[playerId];
                    if (!pE || pE.hp <= 0) return;
                    if (pE.ladinoEstrela || (agora - pE.ladinoEstrelaCooldown) < 0) return;
                    const estrelaX = Number(data.targetX);
                    const estrelaY = Number(data.targetY);
                    if (!Number.isFinite(estrelaX) || !Number.isFinite(estrelaY)) return;
                    const pEx = pE.x + PLAYER_OFFSET_X;
                    const pEy = pE.y + PLAYER_OFFSET_Y;
                    if (mapaPorCoordenada(pEx) !== mapaPorCoordenada(estrelaX)) return;
                    const distEstrela = Math.hypot(estrelaX - pEx, estrelaY - pEy);
                    if (distEstrela > 380) { avisaForaAlcance(ws, 'ladino_estrela'); return; }
                    if (!gastarMana(ws, pE, mpSkill(pE, 'estrela_da_morte', 30))) return;
                    pE.ladinoEstrelaCooldown = agora + 20000; // CD 20s

                    // 5 vértices de uma estrela de 5 pontas em volta do centro (raio 120)
                    const centroE = { x: estrelaX, y: estrelaY };
                    const raioE = 120;
                    const pontosE = [];
                    for (let i = 0; i < 5; i++) {
                        const angE = (i * 0.8) * Math.PI * 2; // passos de 144° = caminho de estrela
                        pontosE.push({
                            x: centroE.x + Math.cos(angE) * raioE - PLAYER_OFFSET_X,
                            y: centroE.y + Math.sin(angE) * raioE - PLAYER_OFFSET_Y
                        });
                    }

                    pE.ladinoEstrela = {
                        centroX: centroE.x,
                        centroY: centroE.y,
                        pontos: pontosE,
                        idx: -1,
                        step: 2,
                        fase: 'star',
                        danoBase: dmgSkill(pE, 'estrela_da_morte', 25)
                    };

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_ladino_estrela',
                                id: playerId,
                                cx: centroE.x,
                                cy: centroE.y,
                                raio: raioE,
                                pontos: pontosE.map(pt => ({ x: pt.x + PLAYER_OFFSET_X, y: pt.y + PLAYER_OFFSET_Y }))
                            }));
                        }
                    });
                }

                // ====================================================================
                // NOVAS CLASSES (v1.31) — HANDLERS DE SKILLS (server-authoritative)
                // ====================================================================

                // ---- DRONEMASTER: ATAQUE BÁSICO (Drone dispara) ----
                if (data.action === 'ataque_dronemaster') {
                    let pD = players[playerId];
                    if (!pD || pD.hp <= 0) return;
                    if (pD.dmTitaAtivo) {
                        // Forma Robô: ataque à distância tecnológico (mesmo handler, outro dano)
                        if (Date.now() - pD.lastBasicAttack < tempoAtaqueBasico(pD, 416)) return;
                        pD.lastBasicAttack = Date.now();
                        let alvoAutoR = validarAtaqueBasicoAlvo(pD, data.alvoTipo, data.alvoId);
                        if (data.alvoTipo || data.alvoId) { if (!alvoAutoR) return; }
                        let pXR = pD.x + PLAYER_OFFSET_X, pYR = pD.y + PLAYER_OFFSET_Y;
                        let angR = alvoAutoR ? Math.atan2(alvoAutoR.y - pYR, alvoAutoR.x - pXR) : ((data.angulo !== undefined) ? data.angulo : pD.angulo);
                        let danoR = danoBasicoRobo(pD);
                        // projétil de laser: primeira entidade na linha (range 480)
                        let atingiuR = null;
                        for (let s of slimes) {
                            if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(pD.x)) continue;
                            let ddx = s.x - pXR, ddy = s.y - pYR;
                            let distR = Math.hypot(ddx, ddy);
                            if (distR > 210) continue;
                            let angS = Math.atan2(ddy, ddx);
                            if (mesmosLados(angS, angR, 0.35)) {
                                // primeiro alvo no caminho (o mais próximo)
                                if (!atingiuR || distR < atingiuR.dist) { atingiuR = { s: s, dist: distR }; }
                            }
                        }
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_dm_tiro_tita', id: playerId, x: pD.x + PLAYER_OFFSET_X, y: pD.y + PLAYER_OFFSET_Y, ang: angR, alvoX: atingiuR ? atingiuR.s.x : pXR + Math.cos(angR) * 300, alvoY: atingiuR ? atingiuR.s.y : pYR + Math.sin(angR) * 300 }));
                            }
                        });
                        if (atingiuR) registrarDanoMonstro(atingiuR.s, playerId, danoR, 'player');
                        danoEmBosses(pXR, pYR, 210, playerId, danoR, 'basico', 'player');
                        return;
                    }
                    // Drone normal: tiro à distância do Drone (range 90)
                    if (Date.now() - pD.lastBasicAttack < tempoAtaqueBasico(pD, 560)) return;
                    pD.lastBasicAttack = Date.now();
                    let alvoAuto = validarAtaqueBasicoAlvo(pD, data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) { if (!alvoAuto) return; }
                    let pX = pD.dmDroneX !== undefined ? pD.dmDroneX : (pD.x + PLAYER_OFFSET_X + 30);
                    let pY = pD.dmDroneY !== undefined ? pD.dmDroneY : (pD.y + PLAYER_OFFSET_Y - 14);
                    let angulo = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : ((data.angulo !== undefined) ? data.angulo : pD.angulo);
                    let danoDrone = danoBasicoDrone(pD);
                    let alvoTiro = null;
                    for (let s of slimes) {
                        if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(pD.x)) continue;
                        let ddx = s.x - pX, ddy = s.y - pY;
                        let distD = Math.hypot(ddx, ddy);
                        if (distD > 108) continue; // v1.32: range do Drone +20% (90 → 108)
                        if (mesmosLados(Math.atan2(ddy, ddx), angulo, 0.5)) {
                            if (!alvoTiro || distD < alvoTiro.dist) alvoTiro = { s: s, dist: distD };
                        }
                    }
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_tiro', id: playerId, droneX: pD.dmDroneX, droneY: pD.dmDroneY, x: pD.x + PLAYER_OFFSET_X, y: pD.y + PLAYER_OFFSET_Y, ang: angulo, alvoX: alvoTiro ? alvoTiro.s.x : pX + Math.cos(angulo) * 200, alvoY: alvoTiro ? alvoTiro.s.y : pY + Math.sin(angulo) * 200 }));
                        }
                    });
                    if (alvoTiro) registrarDanoMonstro(alvoTiro.s, playerId, danoDrone, 'player');
                    danoEmBosses(pX, pY, 108, playerId, danoDrone, 'basico', 'player');
                }

                // ---- DRONEMASTER SKILL 1: MODO SUPRESSÃO (até 3 alvos) ----
                if (data.action === 'dronemaster_supressao') {
                    let pS = players[playerId];
                    if (!pS || pS.hp <= 0) return;
                    if (pS.dmSupressaoTimer > 0 || Date.now() - pS.dmSupressaoCooldown < 0) return;
                    if (pS.dmAssaltoTimer > 0) return; // não pode durante o Modo Assalto
                    if (!gastarMana(ws, pS, mpSkill(pS, 'supressao_dm', 25))) return;
                    pS.dmSupressaoCooldown = Date.now() + 10000;
                    pS.dmSupressaoTimer = 100; // 5s de supressão (tick controla a cadência)
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_supressao', id: playerId }));
                        }
                    });
                }

                // ---- DRONEMASTER SKILL 2: MODO ASSALTO (Drone vira mini robô — 2x dano) ----
                if (data.action === 'dronemaster_assalto') {
                    let pA = players[playerId];
                    if (!pA || pA.hp <= 0) return;
                    if (pA.dmAssaltoTimer > 0 || Date.now() - pA.dmAssaltoCooldown < 0) return;
                    if (pA.dmSupressaoTimer > 0) return;
                    if (!gastarMana(ws, pA, mpSkill(pA, 'assalto_dm', 25))) return;
                    pA.dmAssaltoCooldown = Date.now() + 10000;
                    pA.dmAssaltoTimer = 60; // 3s de transformação
                    // O robô nasce ao lado do dono
                    pA.dmDroneX = pA.x + PLAYER_OFFSET_X + 20;
                    pA.dmDroneY = pA.y + PLAYER_OFFSET_Y - 10;
                    pA.dmDroneAlvo = null;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_assalto', id: playerId }));
                        }
                    });
                }

                // ---- DRONEMASTER SKILL 3: CAIXA DE FERRAMENTAS (escudo 50% vida máx p/ aliados, 10s) ----
                if (data.action === 'dronemaster_caixa') {
                    let pC = players[playerId];
                    if (!pC || pC.hp <= 0) return;
                    if (Date.now() - pC.dmCaixaCooldown < 0) return;
                    const cx = Number(data.targetX), cy = Number(data.targetY);
                    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
                    if (mapaPorCoordenada(pC.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(cx)) return;
                    const distCaixa = Math.hypot(cx - (pC.x + PLAYER_OFFSET_X), cy - (pC.y + PLAYER_OFFSET_Y));
                    if (distCaixa > 200) { avisaForaAlcance(ws, 'dronemaster_caixa'); return; }
                    if (!gastarMana(ws, pC, mpSkill(pC, 'caixa_dm', 30))) return;
                    pC.dmCaixaCooldown = Date.now() + 15000;
                    const escudoCaixa = Math.round(pC.maxHp * 0.50); // 50% da vida máxima do DroneMaster
                    caixasFerramentas.push({
                        id: 'cx_' + playerId + '_' + (++seqZonaNova),
                        x: cx, y: cy,
                        mapa: mapaPorCoordenada(cx),
                        raio: 140,
                        tempo: 200, duracao: 200, // 10s
                        ownerId: playerId,
                        escudoBase: escudoCaixa,
                        aplicados: {} // controle anti reapply por aliado
                    });
                    const zonaCaixa = caixasFerramentas[caixasFerramentas.length - 1];
                    // O DroneMaster SEMPRE recebe o escudo ao armar a caixa (não fica dependente do raio)
                    darEscudoAbsorvente(pC, escudoCaixa, 10000);
                    zonaCaixa.aplicados[playerId] = Date.now() + 10000;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_caixa', id: zonaCaixa.id, x: cx, y: cy, raio: 140, ownerId: playerId }));
                            client.send(JSON.stringify({ type: 'action_dm_caixa_escudo', id: zonaCaixa.id, pid: playerId, x: pC.x, y: pC.y }));
                        }
                    });
                }

                // ---- DRONEMASTER SKILL 4: PROTOCOLO TITÃ (+30% dano/def, +20% crit, 10s) ----
                if (data.action === 'dronemaster_tita') {
                    let pT = players[playerId];
                    if (!pT || pT.hp <= 0) return;
                    if (pT.dmTitaAtivo || Date.now() - pT.dmTitaCooldown < 0) return;
                    if (Date.now() - pT.dmTitaReviveCooldown < 0) {
                        ws.send(JSON.stringify({ type: 'skill_aviso', skill: 'dronemaster_tita', motivo: 'cooldown_revive' }));
                        return;
                    }
                    if (!gastarMana(ws, pT, mpSkill(pT, 'tita_dm', 40))) return;
                    pT.dmTitaCooldown = Date.now() + 45000;
                    pT.dmTitaAtivo = true;
                    pT.dmTitaTimer = 200; // 10s de forma Robô
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_tita', id: playerId, ativo: true }));
                        }
                    });
                }

                // ---- ARQUEIRO ARCANO: ATAQUE BÁSICO (Arco Elementalista) ----
                if (data.action === 'ataque_arqueiro_arcano') {
                    let pA = players[playerId];
                    if (!pA || pA.hp <= 0) return;
                    if (Date.now() - pA.lastBasicAttack < tempoAtaqueBasico(pA, 500)) return;
                    pA.lastBasicAttack = Date.now();
                    let alvoAuto = validarAtaqueBasicoAlvo(pA, data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) { if (!alvoAuto) return; }
                    let pX = pA.x + PLAYER_OFFSET_X, pY = pA.y + PLAYER_OFFSET_Y;
                    let angulo = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : ((data.angulo !== undefined) ? data.angulo : pA.angulo);
                    let danoFlecha = dmgSkill(pA, 'flecha_arcana', 16);
                    let alvoTiro = null;
                    for (let s of slimes) {
                        if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(pA.x)) continue;
                        let dx = s.x - pX, dy = s.y - pY;
                        let dist = Math.hypot(dx, dy);
                        if (dist > 260) continue;
                        if (mesmosLados(Math.atan2(dy, dx), angulo, 0.5)) {
                            if (!alvoTiro || dist < alvoTiro.dist) alvoTiro = { s: s, dist: dist };
                        }
                    }
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arcano_flecha', id: playerId, x: pX, y: pY, ang: angulo, alvoX: alvoTiro ? alvoTiro.s.x : pX + Math.cos(angulo) * 180, alvoY: alvoTiro ? alvoTiro.s.y : pY + Math.sin(angulo) * 180 }));
                        }
                    });
                    if (alvoTiro) registrarDanoMonstro(alvoTiro.s, playerId, danoFlecha, 'player');
                    danoEmBosses(pX, pY, 260, playerId, danoFlecha, 'basico', 'player');
                }

                // ---- ARQUEIRO ASTRAAL SKILL 1: CHUVA DE COMETAS (impacto + chuva 4s) ----
                if (data.action === 'arqueiro_cometas') {
                    let pF = players[playerId];
                    if (!pF || pF.hp <= 0) return;
                    if (Date.now() - pF.aaCometasCooldown < 0) return;
                    const fx = Number(data.targetX), fy = Number(data.targetY);
                    if (!Number.isFinite(fx) || !Number.isFinite(fy)) return;
                    if (mapaPorCoordenada(pF.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(fx)) return;
                    const distCometas = Math.hypot(fx - (pF.x + PLAYER_OFFSET_X), fy - (pF.y + PLAYER_OFFSET_Y));
                    if (distCometas > 300) { avisaForaAlcance(ws, 'arqueiro_cometas'); return; }
                    if (!gastarMana(ws, pF, mpSkill(pF, 'cometas_astral', 25))) return;
                    pF.aaCometasCooldown = Date.now() + 7000;
                    // Dano de impacto em área + chuva de cometas (4s)
                    const danoImpacto = dmgSkill(pF, 'cometas_astral', 22);
                    chuvasCometas.push({
                        id: 'ast_' + playerId + '_' + (++seqZonaNova),
                        x: fx, y: fy,
                        mapa: mapaPorCoordenada(fx),
                        raio: 85,
                        tempo: 80, duracao: 80, // 4s
                        ownerId: playerId,
                        danoBase: dmgSkill(pF, 'cometas_astral', 9)
                    });
                    slimes.forEach(s => {
                        if (s.hp > 0 && mapaPorCoordenada(s.x) === mapaPorCoordenada(fx) && Math.hypot(s.x - fx, s.y - fy) <= 85) {
                            registrarDanoMonstro(s, playerId, danoImpacto, 'player');
                        }
                    });
                    danoEmBosses(fx, fy, 85, playerId, danoImpacto, 'skill', 'player');
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arcano_cometas', id: chuvasCometas[chuvasCometas.length - 1].id, x: fx, y: fy, raio: 85, ownerId: playerId, ang: Math.atan2(fy - (pF.y + PLAYER_OFFSET_Y), fx - (pF.x + PLAYER_OFFSET_X)) }));
                        }
                    });
                }

                // ---- ARQUEIRO ASTRAAL SKILL 2: ORBE DE CONSTELAÇÃO (cativeiro 2s → implosão) ----
                if (data.action === 'arqueiro_orbe') {
                    let pP = players[playerId];
                    if (!pP || pP.hp <= 0) return;
                    if (Date.now() - pP.aaOrbeCooldown < 0) return;
                    const px = Number(data.targetX), py = Number(data.targetY);
                    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
                    if (mapaPorCoordenada(pP.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(px)) return;
                    const distOrbe = Math.hypot(px - (pP.x + PLAYER_OFFSET_X), py - (pP.y + PLAYER_OFFSET_Y));
                    if (distOrbe > 260) { avisaForaAlcance(ws, 'arqueiro_orbe'); return; }
                    if (!gastarMana(ws, pP, mpSkill(pP, 'orbe_constelacao', 25))) return;
                    pP.aaOrbeCooldown = Date.now() + 8000;
                    orbeConstelacoes.push({
                        id: 'orb_' + playerId + '_' + (++seqZonaNova),
                        x: px, y: py,
                        mapa: mapaPorCoordenada(px),
                        raio: 100,
                        tempo: 40, duracao: 40, // 2s cativando (fase 1)
                        fase: 1,
                        ownerId: playerId,
                        danoBase: dmgSkill(pP, 'orbe_constelacao', 26)
                    });
                    // Cativa quem está dentro AGORA
                    congelarNaZona(orbeConstelacoes[orbeConstelacoes.length - 1], 40, 0, playerId);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arcano_orbe', id: orbeConstelacoes[orbeConstelacoes.length - 1].id, x: px, y: py, raio: 100, ownerId: playerId }));
                        }
                    });
                }

                // ---- ARQUEIRO ASTRAAL SKILL 3: CASCATA ESTELAR (onda de estrelas — trava 2s em cone) ----
                if (data.action === 'arqueiro_cascata') {
                    let pV = players[playerId];
                    if (!pV || pV.hp <= 0) return;
                    if (Date.now() - pV.aaCascataCooldown < 0) return;
                    if (!gastarMana(ws, pV, mpSkill(pV, 'cascata_estelar', 25))) return;
                    pV.aaCascataCooldown = Date.now() + 8000;
                    const angV = (data.angulo !== undefined) ? Number(data.angulo) : pV.angulo;
                    const vx0 = pV.x + PLAYER_OFFSET_X, vy0 = pV.y + PLAYER_OFFSET_Y;
                    const ALCANCE_VENTO = 280, LARGURA_VENTO = 160;
                    slimes.forEach(s => {
                        if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(pV.x)) return;
                        let dx = s.x - vx0, dy = s.y - vy0;
                        let dist = Math.hypot(dx, dy);
                        if (dist > ALCANCE_VENTO) return;
                        let perpendicular = Math.abs(Math.sin(angV) * dx - Math.cos(angV) * dy); // distância lateral
                        if (perpendicular <= LARGURA_VENTO) {
                            efeitos.aplicarEfeito(s, 'paralisia', 40, 1); // trava 2s (root)
                        }
                    });
                    bosses.forEach(b => {
                        if (b.hp <= 0 || mapaPorCoordenada(b.x) !== mapaPorCoordenada(pV.x)) return;
                        let dx = b.x - vx0, dy = b.y - vy0;
                        let dist = Math.hypot(dx, dy);
                        if (dist > ALCANCE_VENTO) return;
                        let perpendicular = Math.abs(Math.sin(angV) * dx - Math.cos(angV) * dy);
                        if (perpendicular <= LARGURA_VENTO) {
                            efeitos.aplicarEfeito(b, 'paralisia', 40, 1);
                        }
                    });
                    // PvP: paralisia nos jogadores no cone
                    if (pV.pvpAtivo) {
                        for (let pId in players) {
                            if (pId === playerId) continue;
                            let p2 = players[pId];
                            if (!p2 || p2.hp <= 0 || !p2.pvpAtivo) continue;
                            let dx = p2.x - vx0, dy = p2.y - vy0;
                            let dist = Math.hypot(dx, dy);
                            if (dist > ALCANCE_VENTO) continue;
                            let perpendicular = Math.abs(Math.sin(angV) * dx - Math.cos(angV) * dy);
                            if (perpendicular <= LARGURA_VENTO) {
                                efeitos.aplicarEfeito(p2, 'paralisia', 40, 1);
                            }
                        }
                    }
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arcano_cascata', id: playerId, x: vx0, y: vy0, ang: angV }));
                        }
                    });
                }

                // ---- SNIPER: ATAQUE BÁSICO (Barrett — tiro perfurante em linha) ----
                if (data.action === 'ataque_sniper') {
                    let pS = players[playerId];
                    if (!pS || pS.hp <= 0) return;
                    // Camuflado na moita: ataque básico BLOQUEADO até usar uma skill (que quebra a camuflagem)
                    if (pS.snCamuflado) return;
                    if (pS.snAim) return; // não atira básico enquanto mira o super tiro
                    if (Date.now() - pS.lastBasicAttack < tempoAtaqueBasico(pS, 936)) return;
                    pS.lastBasicAttack = Date.now();
                    let alvoAuto = validarAtaqueBasicoAlvo(pS, data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) { if (!alvoAuto) return; }
                    let pX = pS.x + PLAYER_OFFSET_X, pY = pS.y + PLAYER_OFFSET_Y;
                    let angulo = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : ((data.angulo !== undefined) ? data.angulo : pS.angulo);
                    let danoBarrett = dmgSkill(pS, 'tiro_barrett', 30);
                    // perfurante: acerta TODOS na linha (range 480)
                    let alvosLinha = [];
                    for (let s of slimes) {
                        if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(pS.x)) continue;
                        let dx = s.x - pX, dy = s.y - pY;
                        let dist = Math.hypot(dx, dy);
                        if (dist > 480) continue;
                        let lateral = Math.abs(Math.sin(angulo) * dx - Math.cos(angulo) * dy);
                        if (lateral <= 14) alvosLinha.push({ s: s, dist: dist });
                    }
                    alvosLinha.sort((a, b) => a.dist - b.dist);
                    let alvoFinal = alvosLinha.length ? alvosLinha[0] : null;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_tiro', id: playerId, x: pX, y: pY, ang: angulo, alvoX: alvoFinal ? alvoFinal.s.x : pX + Math.cos(angulo) * 260, alvoY: alvoFinal ? alvoFinal.s.y : pY + Math.sin(angulo) * 260, noMato: pS.snCamuflado }));
                        }
                    });
                    alvosLinha.forEach(ent => registrarDanoMonstro(ent.s, playerId, danoBarrett, 'player'));
                    danoEmBosses(pX, pY, 480, playerId, danoBarrett, 'basico', 'player');
                }

                // ---- SNIPER SKILL 1: DISPARO SUPREMO — APONTAR (estado AIMING, 3s) ----
                if (data.action === 'sniper_apontar') {
                    let pA = players[playerId];
                    if (!pA || pA.hp <= 0) return;
                    if (pA.snAim || Date.now() - pA.snAimCooldown < 0) return;
                    // Deitado (Posição de Franco-Atirador): mira sem sair da posição
                    if (!gastarMana(ws, pA, mpSkill(pA, 'disparo_supremo', 30))) return;
                    pA.snAim = { timer: 60, fired: false }; // 3s de preparação
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_aim', id: playerId, ativo: true }));
                        }
                    });
                }

                // ---- SNIPER SKILL 1: DISPARO SUPREMO — DISPARAR (3x dano, 1 alvo) ----
                if (data.action === 'sniper_fogo') {
                    let pF = players[playerId];
                    if (!pF || pF.hp <= 0) return;
                    if (!pF.snAim || pF.snAim.fired) return;
                    // Camuflado: tiro quebra a camuflagem
                    if (pF.snCamuflado) finalizarCamuflagemSniper(pF, playerId, 'tiro');
                    const angF = (data.angulo !== undefined) ? Number(data.angulo) : pF.angulo;
                    const fx0 = pF.x + PLAYER_OFFSET_X, fy0 = pF.y + PLAYER_OFFSET_Y;
                    // Ponto selecionado (cliente envia onde o jogador clicou/mirou)
                    let tpX = (data.targetX !== undefined) ? Number(data.targetX) : fx0 + Math.cos(angF) * 400;
                    let tpY = (data.targetY !== undefined) ? Number(data.targetY) : fy0 + Math.sin(angF) * 400;
                    if (!Number.isFinite(tpX) || !Number.isFinite(tpY)) { tpX = fx0 + Math.cos(angF) * 400; tpY = fy0 + Math.sin(angF) * 400; }
                    const distTP = Math.hypot(tpX - fx0, tpY - fy0);
                    if (distTP > 700) { tpX = fx0 + ((tpX - fx0) / distTP) * 700; tpY = fy0 + ((tpY - fy0) / distTP) * 700; }
                    // 1 inimigo: o mais próximo do ponto mirado (alcance 700)
                    let alvoF = null;
                    for (let s of slimes) {
                        if (s.hp <= 0 || mapaPorCoordenada(s.x) !== mapaPorCoordenada(pF.x)) continue;
                        let dist = Math.hypot(s.x - fx0, s.y - fy0);
                        if (dist > 700) continue;
                        let dp = Math.hypot(s.x - tpX, s.y - tpY);
                        if (dp <= 42) { if (!alvoF || dp < alvoF.dp) alvoF = { s: s, dp: dp, dist: dist }; }
                    }
                    let danoFinal = Math.round(dmgSkill(pF, 'disparo_supremo', 45) * 3); // 3x dano
                    let bossAlvo = null;
                    if (!alvoF) {
                        for (let b of bosses) {
                            if (b.hp <= 0 || mapaPorCoordenada(b.x) !== mapaPorCoordenada(pF.x)) continue;
                            let dist = Math.hypot(b.x - fx0, b.y - fy0);
                            if (dist > 700) continue;
                            let dp = Math.hypot(b.x - tpX, b.y - tpY);
                            if (dp <= 42) { if (!bossAlvo || dp < bossAlvo.dp) bossAlvo = { b: b, dp: dp, dist: dist, x: b.x, y: b.y }; }
                        }
                    }
                    const tx = alvoF ? alvoF.s.x : (bossAlvo ? bossAlvo.b.x : Math.round(tpX));
                    const ty = alvoF ? alvoF.s.y : (bossAlvo ? bossAlvo.b.y : Math.round(tpY));
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_super_tiro', id: playerId, x: fx0, y: fy0, tx: tx, ty: ty }));
                        }
                    });
                    if (alvoF) registrarDanoMonstro(alvoF.s, playerId, danoFinal, 'player');
                    if (bossAlvo) registrarDanoBoss(bossAlvo.b, playerId, danoFinal, 'skill', 'player');
                    // Um único tiro por preparação
                    pF.snAim.fired = true;
                    pF.snAim = null;
                    pF.snAimCooldown = Date.now() + 20000;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_aim', id: playerId, ativo: false }));
                        }
                    });
                }

                // ---- SNIPER SKILL 2: ARAME PRENDEDOR (rede → root 3s) ----
                if (data.action === 'sniper_rede') {
                    let pR = players[playerId];
                    if (!pR || pR.hp <= 0) return;
                    if (Date.now() - pR.snRedeCooldown < 0) return;
                    // Usar outra skill obriga a sair da Posição de Franco-Atirador
                    if (pR.snPosicao) {
                        pR.snPosicao = false;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: false }));
                            }
                        });
                    }
                    const rx = Number(data.targetX), ry = Number(data.targetY);
                    if (!Number.isFinite(rx) || !Number.isFinite(ry)) return;
                    if (mapaPorCoordenada(pR.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(rx)) return;
                    const distRede = Math.hypot(rx - (pR.x + PLAYER_OFFSET_X), ry - (pR.y + PLAYER_OFFSET_Y));
                    if (distRede > 320) { avisaForaAlcance(ws, 'sniper_rede'); return; }
                    if (!gastarMana(ws, pR, mpSkill(pR, 'arame_rede', 15))) return;
                    pR.snRedeCooldown = Date.now() + 10000;
                    if (pR.snCamuflado) finalizarCamuflagemSniper(pR, playerId, 'skill');
                    // Zona de arame no chão (visual + root em área por 3s, como as outras zonas)
                    const redeZona = {
                        id: 'rd_' + playerId + '_' + (++seqZonaNova),
                        x: rx, y: ry,
                        mapa: mapaPorCoordenada(rx),
                        raio: 60,
                        tempo: 60, duracao: 60, // 3s
                        ownerId: playerId
                    };
                    redesSniper.push(redeZona);
                    let alvoRede = null;
                    for (let s of slimes) {
                        if (!alvoRede && s.hp > 0 && Math.hypot(s.x - rx, s.y - ry) <= 60) { alvoRede = { tipo: 'slime', ent: s }; }
                    }
                    if (!alvoRede) {
                        for (let b of bosses) {
                            if (!alvoRede && b.hp > 0 && Math.hypot(b.x - rx, b.y - ry) <= 60) { alvoRede = { tipo: 'boss', ent: b }; }
                        }
                    }
                    // PvP: rede também prende jogadores
                    let alvoJogadorRede = null;
                    if (pR.pvpAtivo && !alvoRede) {
                        for (let pId in players) {
                            if (pId === playerId) continue;
                            let p2 = players[pId];
                            if (p2.pvpAtivo && p2.hp > 0 && Math.hypot(p2.x - rx, p2.y - ry) <= 60) { alvoJogadorRede = p2; break; }
                        }
                    }
                    if (alvoRede) {
                        if (alvoRede.tipo === 'slime') {
                            alvoRede.ent.isPreso = (Date.now() + 3000); // não se move por 3s
                            efeitos.aplicarEfeito(alvoRede.ent, 'rede', 60, 1);
                        } else {
                            alvoRede.ent.isPreso = (Date.now() + 3000);
                            efeitos.aplicarEfeito(alvoRede.ent, 'rede', 60, 1);
                        }
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_sniper_rede_acerto', id: playerId, x: rx, y: ry, alvoX: alvoRede.ent.x, alvoY: alvoRede.ent.y }));
                            }
                        });
                    } else if (alvoJogadorRede) {
                        efeitos.aplicarEfeito(alvoJogadorRede, 'rede', 60, 1); // não pode se mover
                    }
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_rede', id: playerId, x: rx, y: ry, redeId: redeZona.id }));
                        }
                    });
                }

                // ---- SNIPER SKILL 3: CAMUFLAGEM (só dentro do mato — reset CD da Skill 1) ----
                if (data.action === 'sniper_camuflagem') {
                    let pC = players[playerId];
                    if (!pC || pC.hp <= 0) return;
                    if (pC.snCamuflado) return;
                    // Camuflar-se obriga a sair da Posição de Franco-Atirador
                    if (pC.snPosicao) {
                        pC.snPosicao = false;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: false }));
                            }
                        });
                    }
                    if (!sniperNoMato(pC.x + PLAYER_OFFSET_X, pC.y + PLAYER_OFFSET_Y)) {
                        ws.send(JSON.stringify({ type: 'skill_aviso', skill: 'sniper_camuflagem', motivo: 'fora_mato' }));
                        return;
                    }
                    pC.snCamuflado = true;
                    efeitos.aplicarEfeito(pC, 'camuflagem', 200000, 1); // enquanto estiver no mato
                    pC.snAimCooldown = 0; // RESET do cooldown da Skill 1 (Disparo Supremo)
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_camuflagem', id: playerId }));
                        }
                    });
                    sincronizarEfeitos(playerId, pC);
                }

                // ---- SNIPER SKILL 4: POSIÇÃO DE FRANCO-ATIRADOR (deitado — +100% dano, detecta invis) ----
                if (data.action === 'sniper_posicao') {
                    let pP = players[playerId];
                    if (!pP || pP.hp <= 0) return;
                    if (pP.snPosicao || Date.now() - pP.snPosicaoCd < 0) return;
                    if (!gastarMana(ws, pP, mpSkill(pP, 'posicao_sniper', 30))) return;
                    pP.snPosicao = true;
                    pP.snPosicaoCd = Date.now() + 15000;
                    if (pP.snCamuflado) finalizarCamuflagemSniper(pP, playerId, 'skill');
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: true }));
                        }
                    });
                }

                // ---- SNIPER: CANCELAR POSIÇÃO (volta ao normal) ----
                if (data.action === 'sniper_cancelar_posicao') {
                    let pX2 = players[playerId];
                    if (!pX2 || !pX2.snPosicao) return;
                    pX2.snPosicao = false;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: false }));
                        }
                    });
                }

                if (data.action === 'dash') {
                    // DRONEMASTER: o Dash vira um ESCUDO tecnológico (50% vida máx, 3s)
                    const pDm = players[playerId];
                    if (pDm && pDm.classe === 'dronemaster') {
                        if (pDm.escudoAbsoluto > 0 && pDm.escudoAbsolutoExpirador > Date.now()) return; // já ativo
                        if (!gastarMana(ws, pDm, mpSkill(pDm, 'dash', 15))) return;
                        const escudoDash = Math.round(pDm.maxHp * 0.50);
                        darEscudoAbsorvente(pDm, escudoDash, 3000);
                        pDm.dmDashEscudo = escudoDash;
                        pDm.dmDashEscudoExpirador = Date.now() + 3000;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_dm_dash_escudo', id: playerId }));
                            }
                        });
                        return;
                    }
                    const dashX = Number(data.novoX);
                    const dashY = Number(data.novoY);
                    const destinoDash = validarMovimentoJogador(
                        players[playerId],
                        dashX,
                        dashY,
                        { maxStep: MAX_PLAYER_COLLISION_STEP, maxDistance: 160 }
                    );
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'dash', 15))) return;
                    if (destinoDash.aceito || destinoDash.parcial) {
                        players[playerId].x = destinoDash.x;
                        players[playerId].y = destinoDash.y;
                    }

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

                // HABILIDADE DO GUERREIRO: GRITO DE PROVOCAÇÃO
                // Cooldown: 15s. Cura 20% HP max. Taunt monstros (10s = 200 ticks), Taunt bosses (5s = 100 ticks).
                if (data.action === 'guerreiro_provocacao') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if (!p.lastProvocacao) p.lastProvocacao = 0;
                    if (agora - p.lastProvocacao < 14500) return; // Cooldown 15 segundos
                    if (!gastarMana(ws, p, mpSkill(p, 'provocacao', 20))) return;

                    p.lastProvocacao = agora;
                    let pX = p.x + 12;
                    let pY = p.y + 16;

                    // Cura instantânea de 20% do HP Máximo
                    let curaVal = Math.round(p.maxHp * 0.20);
                    aplicarCuraAoJogador(playerId, curaVal);

                    // Provocação em área para monstros normais (10 segundos = 200 ticks de 50ms)
                    let monstrosAfetados = 0;
                    slimes.forEach(slime => {
                        if (slime.hp <= 0 || slime.flagPassivo) return;
                        if (Math.hypot(slime.x - pX, slime.y - pY) <= 300) {
                            slime.tauntId = playerId;
                            slime.tauntTimer = 200; // 10 segundos
                            slime.targetId = playerId;
                            monstrosAfetados++;
                        }
                    });

                    // Provocação para Bosses (ex: Golem de Pedra) (5 segundos = 100 ticks de 50ms)
                    let bossesAfetados = 0;
                    bosses.forEach(b => {
                        if (b.hp <= 0 || b.flagPassivo) return;
                        if (Math.hypot(b.x - pX, b.y - pY) <= 320) {
                            b.tauntId = playerId;
                            b.tauntTimer = 100; // 5 segundos
                            bossesAfetados++;
                        }
                    });

                    // Broadcast do efeito para todos os clientes
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_guerreiro_provocacao',
                                id: playerId,
                                x: pX,
                                y: pY,
                                cura: curaVal,
                                monstrosAfetados: monstrosAfetados,
                                bossesAfetados: bossesAfetados
                            }));
                        }
                    });
                }

                if (data.action === 'corte') {
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    players[playerId].lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(players[playerId], data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) {
                        if (!alvoAuto) return; // alvo inválido/morto/outro mapa/fora do alcance → rejeita
                    }

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_corte', id: playerId }));
                        }
                    });

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let anguloCorte = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : players[playerId].angulo;
                    let danoCorte = dmgSkill(players[playerId], 'corte', 12);

                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            let dist = Math.hypot(pX - slime.x, pY - slime.y);

                            if (dist < 100) { // TESTE: dano real do guerreiro = 100 (era 66)
                                let anguloAteSlime = Math.atan2(slime.y - pY, slime.x - pX);
                                let diff = Math.atan2(Math.sin(anguloCorte - anguloAteSlime), Math.cos(anguloCorte - anguloAteSlime));

                                if (Math.abs(diff) < 1.0) {
                                    registrarDanoMonstro(slime, playerId, danoCorte);
                                }
                            }
                        }
                    });
                    danoEmBosses(pX, pY, 100, playerId, danoCorte, 'basico'); // TESTE: dano real do guerreiro em boss = 100 (era 110)
                }

                if (data.action === 'ataque_mago' || data.action === 'ataque_summoner' || data.action === 'ataque_arqueiro' || data.action === 'ataque_curandeiro') {
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    players[playerId].lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(players[playerId], data.alvoTipo, data.alvoId);
                    if (data.alvoTipo || data.alvoId) {
                        if (!alvoAuto) return; // alvo inválido/morto/outro mapa/fora do alcance → rejeita
                    }

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
                    if (alvoAuto) ang = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX); // mira o alvo validado
                    
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
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: tipoAcao, id: playerId, x: pX, y: pY, vx: Math.cos(ang) * velocidadeProj, vy: Math.sin(ang) * velocidadeProj }));
                        }
                    });
                }

                if (data.action === 'curandeiro_aura') {
                    let healer = players[playerId];
                    if (!healer || healer.classe !== 'curandeiro') return;
                    if (aurasSagradas[playerId]) {
                        desativarAuraSagrada(playerId, 'manual');
                        return;
                    }
                    if ((cooldownAuraSagrada[playerId] || 0) > Date.now()) {
                        ws.send(JSON.stringify({ type: 'aura_sagrada_cooldown', restante: cooldownAuraSagrada[playerId] - Date.now() }));
                        return;
                    }
                    if ((healer.mana || 0) <= healer.maxMp * 0.10) {
                        ws.send(JSON.stringify({ type: 'mp_insuficiente', custo: 0, mana: Math.round(healer.mana || 0) }));
                        return;
                    }
                    aurasSagradas[playerId] = { ativa: true, raio: 190 };
                    healer.auraSagradaAtiva = true;
                    healer.auraSagradaRaio = 190;
                    transmitirAura('action_aura_sagrada_start', playerId, { x: healer.x + 12, y: healer.y + 16, raio: 190 });
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
                    const duracaoChuvaMs = Math.round(140 * (1000 / 60));
                    chuvasServidor.push({ ownerId: playerId, x: data.targetX, y: data.targetY, duracao: Math.ceil(duracaoChuvaMs / 50), expiresAt: Date.now() + duracaoChuvaMs, danoChuva: dmgSkill(players[playerId], 'chuva', 8) });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arqueiro_chuva', targetX: data.targetX, targetY: data.targetY, duracaoMs: duracaoChuvaMs }));
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

                if (data.action === 'arqueiro_rajada') {
                    if (rajadaCanal[playerId]) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'rajada', 30))) return;
                    rajadaCanal[playerId] = {
                        startX: players[playerId].x,
                        startY: players[playerId].y,
                        angulo: (data.angulo !== undefined) ? data.angulo : players[playerId].angulo,
                        fase: 'carregando',
                        timer: 20,
                        stackTargetId: null,
                        stackCount: 0
                    };
                    players[playerId].rajadaAtiva = true;
                    players[playerId].rajadaFase = 'carregando';
                    players[playerId].rajadaProgresso = 0;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arqueiro_rajada_start', id: playerId, angulo: rajadaCanal[playerId].angulo, x: players[playerId].x + 12, y: players[playerId].y + 16 }));
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
                    const duracaoNevascaMs = Math.round(480 * (1000 / 60));
                    const soundIdNevasca = 'nevasca_' + playerId + '_' + Date.now();
                    blizzards.push({ ownerId: playerId, x: data.targetX, y: data.targetY, radius: 115, duracao: Math.ceil(duracaoNevascaMs / 50), expiresAt: Date.now() + duracaoNevascaMs, soundId: soundIdNevasca, danoNevasca: dmgSkill(players[playerId], 'nevasca', 6) });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_nevasca', targetX: data.targetX, targetY: data.targetY, radius: 115, duracaoMs: duracaoNevascaMs, soundId: soundIdNevasca }));
                        }
                    });
                }

                if (data.action === 'mago_vulcao') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if (!p.lastVulcao) p.lastVulcao = 0;
                    if (agora - p.lastVulcao < 19500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'vulcao', 20))) return;
                    p.lastVulcao = agora;
                    let danoBase = dmgSkill(p, 'vulcao', 18);
                    let dotBase = dmgSkill(p, 'vulcao', 4);
                    let vx = data.targetX, vy = data.targetY;
                    vulcoes.push({
                        ownerId: playerId, x: vx, y: vy,
                        radius: 140, duracao: 200, tickCounter: 0,
                        danoImpacto: danoBase, danoDot: dotBase,
                        emergindo: 30, projeteis: []
                    });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_vulcao', targetX: vx, targetY: vy,
                                radius: 140, duracao: 200, ownerId: playerId
                            }));
                        }
                    });
                }

                // SUMMONER: alterna o MODO do Golem — 'agressivo' (ataca o que a summoner focar)
                // ou 'passivo' (fica só rodeando a invocadora, sem atacar). Persiste no save.
                if (data.action === 'ogro_modo') {
                    if (!players[playerId] || players[playerId].classe !== 'summoner') return;
                    let modoOgro = (data.modo === 'passivo') ? 'passivo' : 'agressivo';
                    players[playerId].ogroModo = modoOgro;
                    if (lacaios[playerId]) {
                        lacaios[playerId].modo = modoOgro;
                        if (modoOgro === 'passivo') lacaios[playerId].focoAlvo = null;
                    }
                    salvarProgresso(userId, { ogroModo: modoOgro });
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

                if (data.action === 'comando_ogro_colossal') {
                    let ogroC = lacaios[playerId];
                    if (ogroC && ogroC.hp > 0 && !ogroC.colossalAtivo && (!ogroC.colossalCooldown || ogroC.colossalCooldown <= 0)) {
                        if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'colossal', 40))) return;
                        ogroC.colossalAtivo = true;
                        ogroC.colossalTimer = 400;
                        ogroC.colossalPedraCd = 0;
                        ogroC.colossalCooldown = 900;
                        ogroC.hp = Math.min(ogroC.maxHp, ogroC.hp + ogroC.maxHp * 0.5);
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ogro_colossal', pid: playerId, x: ogroC.x, y: ogroC.y }));
                            }
                        });
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
                if (!jogadorPodeUsarPortalMapa(players[playerId], data.mapa)) {
                    ws.send(JSON.stringify({ type: 'teleporte_recusado', mapa: data.mapa }));
                    return;
                }
                const destinoSolicitadoX = destino.x + (Math.random() * 20 - 10);
                const destinoSolicitadoY = destino.y + (Math.random() * 20 - 10);
                const destinoSeguro = encontrarPosicaoJogadorSegura(players[playerId], destinoSolicitadoX, destinoSolicitadoY);
                if (!destinoSeguro) return;
                players[playerId].x = destinoSeguro.x;
                players[playerId].y = destinoSeguro.y;
                players[playerId].mapaTransicaoAte = Date.now() + 500;
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
                if (aurasSagradas[playerId]) desativarAuraSagrada(playerId, 'respawn');
                players[playerId].hp = players[playerId].maxHp;
                players[playerId].estamina = 100;
                players[playerId].mana = players[playerId].maxMp;
                players[playerId].stunTimer = 0;
                players[playerId].efeitos = [];
                players[playerId].gritoGuerraBonus = 0;
                players[playerId].furiaTimer = 0;
                players[playerId].giroDescontroladoTimer = 0;
                players[playerId].isDashing = false;
                players[playerId].dashTarget = null;
                const destinoRespawn = encontrarPosicaoJogadorSegura(players[playerId], CIDADE_SPAWN_X, CIDADE_SPAWN_Y);
                players[playerId].x = destinoRespawn ? destinoRespawn.x : CIDADE_SPAWN_X;
                players[playerId].y = destinoRespawn ? destinoRespawn.y : CIDADE_SPAWN_Y;
                delete bateriaCanal[playerId];
                if (players[playerId].classe === 'summoner') {
                    delete petRespawnTimer[playerId];
                    let petHp = calcularVidaPet(players[playerId]);
                    lacaios[playerId] = { x: CIDADE_SPAWN_X + 30, y: CIDADE_SPAWN_Y + 30, hp: petHp, maxHp: petHp, attackCooldown: 0, angleOffset: 0, skillCooldown: 0, skill2Cooldown: 0, isJumping: false, targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null, modo: (players[playerId].ogroModo === 'passivo' ? 'passivo' : 'agressivo'), rugidoTimer: 200, rugindoTimer: 0 };
                }
                salvarProgresso(userId, { hp: players[playerId].hp, x: players[playerId].x, y: players[playerId].y });
                ws.send(JSON.stringify({
                    type: 'respawn_confirmado',
                    mapa: 'cidade',
                    x: players[playerId].x,
                    y: players[playerId].y
                }));
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
            delete aurasSagradas[playerId];
            delete cooldownAuraSagrada[playerId];
            delete cooldownRessurreicao[playerId];
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
