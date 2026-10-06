const http = require('http');
const fs = require('fs');
const path = require('path');
const MAPAS_REGISTRY = require('./mapas-registry.js');
const INSTANCIAS = require('./instancias.js');
const WebSocket = require('ws');
const itemSystem = require('./items/item-system.js');
const { verificarGoogleCredential } = require('./google-auth.js');
const { executeAttack: executeSharedMonsterAttack } = require('./sistemas/pets/monster_combat_executor.js');
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || '683484909196-v0a7ed8fthbh7imsk61le98jf17gaksu.apps.googleusercontent.com').trim();
const LOCAL_ID_LOGIN_ENABLED = process.env.NODE_ENV !== 'production' && process.env.LOCAL_ID_LOGIN_ENABLED === '1';
const LOCAL_LASSO_DIAGNOSTICS = process.env.LOCAL_LASSO_DIAGNOSTICS === '1';
const SERVER_VERSION = 'v1.75.43';
const ANIMACOES_MAPA_SPRITE = new Set([
    'nenhuma', 'brisa_suave', 'vento_constante', 'rajada_vento', 'copa_ondulante',
    'folhas_tremulas', 'arvore_tempestade', 'respirar', 'pulsar', 'batimento',
    'esticar', 'compressao', 'crescer', 'flutuar', 'levitar_lento', 'saltitar',
    'balanco_vertical', 'balanco_horizontal', 'inclinar', 'balanco_profundo',
    'tronco_flexivel', 'ondular', 'tremular', 'sacudir', 'tremor', 'giro_horario',
    'giro_lento', 'oscilacao', 'deriva_vento', 'vibracao_folhas', 'squash_stretch'
]);
const { AsyncLocalStorage } = require('async_hooks');
const combateContextStorage = new AsyncLocalStorage();

process.on('uncaughtException', (err) => {
    console.error('[ERRO NÃO TRATADO]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[PROMISE NÃO TRATADA]', reason);
});

let mapaVerde = null, mapaDeserto = null, mapaPantano = null, mapaCaverna = null,
    mapaCidade = null, mapaSolari = null, mapaCidadePerdida = null, mapaTesteVisual = null,
    mapaZonaZero = null, mapaBemVindo = null, mapaRuinas01 = null, mapaCastelo = null,
    mapaFloresta = null, mapaNebulos = null, mapaAbissal = null, mapaPantanoSombrio = null,
    mapaTileTeste = null;

let mapaMundo = null;
try {
    mapaMundo = require('./mapas/mapa_mundo.js');
    console.log("Continente de Gaia carregado como MAPA ÚNICO (" + mapaMundo.W + "x" + mapaMundo.H + " px).");
} catch (e) {
    console.error("Aviso: mapas/mapa_mundo.js não carregado: " + e.message);
}

let SkillUpgradeTree = null;
try {
    SkillUpgradeTree = require('./skill_upgrade_tree.js');
    console.log("Sistema de Árvore de Upgrades de Habilidades carregado.");
} catch (e) {
    console.error("Erro ao carregar skill_upgrade_tree.js:", e.message);
}

let salvarProgresso = () => {}, carregarProgresso = () => null;
let salvarProgressoEmLote = () => { throw new Error('Persistência em lote indisponível.'); };
let migrarIdentidadesItens = null;
let dbCarregarTodos = () => ({}), dbRemoverProgresso = () => false;
try {
    const db = require('./database.js');
    if (db.salvarProgresso) salvarProgresso = db.salvarProgresso;
    if (db.salvarProgressoEmLote) salvarProgressoEmLote = db.salvarProgressoEmLote;
    if (db.migrarIdentidadesItens) migrarIdentidadesItens = db.migrarIdentidadesItens;
    if (db.carregarProgresso) carregarProgresso = db.carregarProgresso;
    if (db.carregarTodos) dbCarregarTodos = db.carregarTodos;
    if (db.removerProgresso) dbRemoverProgresso = db.removerProgresso;
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
let bancoItens = null;

// ============ SISTEMA DE CICLO DIA E NOITE (v1.52.0) ============
let sistemaDiaNoite = null;
try {
    sistemaDiaNoite = require('./sistema_dia_noite.js');
    console.log("Sistema de Ciclo Dia e Noite carregado (v1.52.0).");
} catch (e) {
    console.log("Aviso: sistema_dia_noite.js não carregado: " + e.message);
}
try {
    equipamentos = require('./equipamentos.js');
    console.log("Sistema de Equipamentos (drop) carregado.");
    
    // Carregar itens customizados e injetá-los
    bancoItens = require('./banco_itens.js');
    let itensCustom = bancoItens.carregarItens();
    itensCustom.forEach(item => equipamentos.adicionarEquipamentoCustomizado(item));
    console.log(`Banco de Itens Customizados carregado (${itensCustom.length} itens).`);
} catch (e) {
    console.log("Aviso: equipamentos.js não carregado: " + e.message);
}

// ============ SISTEMA DE UPGRADE DE EQUIPAMENTOS (NPC FERREIRO) ============
let ferreiroMod = null;
try {
    ferreiroMod = require('./upgrade.js');
    console.log("Sistema de Upgrade do Ferreiro carregado.");
} catch (e) {
    console.log("Aviso: upgrade.js não carregado: " + e.message);
}

// ============ SISTEMA DE DASH v2 (compartilhado com o cliente) ============
// dash.js é ISOMÓRFICO: o mesmo arquivo é carregado no <script> do index.html
// e no require() daqui. Cliente e servidor resolvem o caminho do dash com o
// MESMO algoritmo, então a predição do cliente e a autoridade do servidor
// convergem sem o personagem "puxar" para trás.
let DASH_MOD = null;
try {
    DASH_MOD = require('./dash.js');
    console.log("Sistema de Dash v2 carregado (" + Object.keys(DASH_MOD.DASH).length + " classes).");
} catch (e) {
    console.log("ERRO FATAL: dash.js não carregou: " + e.message);
    throw e;
}

// ============ SISTEMA DE DEBUFFS/BUFFS ============
let efeitos = null;
try {
    efeitos = require('./debuffs.js');
    console.log("Sistema de Debuffs/Buffs carregado.");
} catch (e) {
    console.log("Aviso: debuffs.js não carregado: " + e.message);
}

// ============ SISTEMA UNIVERSAL DE AFINIDADE (pets/lacaios) ============
// Tabela única de transferência + herança de atributos. Só o servidor calcula.
let afinidadePets = null;
try {
    afinidadePets = require('./sistemas/afinidade_pets.js');
    console.log("Sistema de Afinidade de Pets carregado.");
} catch (e) {
    console.log("ERRO FATAL: sistemas/afinidade_pets.js não carregou: " + e.message);
    throw e;
}

let petSystem = null;
let petAi = null;
try {
    petSystem = require('./sistemas/pets/pets_system.js');
    petAi = require('./sistemas/pets/pet_ai.js');
    global.PetSystem = petSystem;
    global.PetAI = petAi;
    console.log("Sistema de Pets por Captura carregado.");
} catch (e) {
    console.log("ERRO FATAL: sistemas/pets/pets_system.js ou pet_ai.js não carregou: " + e.message);
    throw e;
}

const server = http.createServer((req, res) => {
    let urlSemQuery = req.url.split('?')[0];
    try { urlSemQuery = decodeURIComponent(urlSemQuery); } catch (e) { /* mantém original */ }
    let urlFinal = urlSemQuery === '/' ? '/index.html' : urlSemQuery;
    if (urlFinal === '/auth/google-config') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({
            enabled: !LOCAL_ID_LOGIN_ENABLED && !!GOOGLE_CLIENT_ID,
            clientId: LOCAL_ID_LOGIN_ENABLED ? '' : GOOGLE_CLIENT_ID,
            localIdLogin: LOCAL_ID_LOGIN_ENABLED
        }));
        return;
    }
    // Health check (Render usa GET /health para validar o Web Service).
    // Rota fixa, sem tocar no resto do servidor de arquivos.
    if (urlFinal === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('OK');
        return;
    }
    let filePath = path.join(__dirname, urlFinal);
    // Segurança: nunca servir arquivos fora da pasta do projeto.
    const raizProjeto = __dirname + path.sep;
    if (filePath !== __dirname && filePath.indexOf(raizProjeto) !== 0) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end("Acesso negado.");
        return;
    }
    const segmentosUrl = urlFinal.split(/[\\/]+/).filter(Boolean);
    if (segmentosUrl.some(segmento => segmento === '.git' || segmento.startsWith('.git/') || segmento.startsWith('.') || segmento.toLowerCase() === 'char deletados' || /\.(?:lock|tmp)$/i.test(segmento))) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Arquivo não encontrado.');
        return;
    }
    // Segurança crítica: arquivos de servidor, banco, administração e persistência
    // nunca devem ser expostos pelo servidor HTTP público.
    const arquivosPrivados = new Set([
        'server.js', 'database.js', 'spawns.js', 'upgrade.js',
        'admins.json', 'jogadores.json',
        'jogadores.json.lock', 'jogadores.json.tmp', 'spawn_flags.json', 'banco_itens.json',
        'map_vfx.json', 'map_objetos.json', 'map_sprite_palette.json', 'monster_configs.json'
    ]);
    if (arquivosPrivados.has(path.basename(filePath).toLowerCase())) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end("Arquivo não encontrado.");
        return;
    }
    let extname = path.extname(filePath).toLowerCase();
    let contentType = 'text/html; charset=utf-8';
    
    if (extname === '.js') contentType = 'text/javascript; charset=utf-8';
    if (extname === '.css') contentType = 'text/css; charset=utf-8';
    if (extname === '.json') contentType = 'application/json; charset=utf-8';
    if (extname === '.png') contentType = 'image/png';
    if (extname === '.jpg' || extname === '.jpeg') contentType = 'image/jpeg';
    if (extname === '.webp') contentType = 'image/webp';
    if (extname === '.wav') contentType = 'audio/wav';
    if (extname === '.mp3') contentType = 'audio/mpeg';
    if (extname === '.ogg') contentType = 'audio/ogg';
    if (extname === '.glb') contentType = 'model/gltf-binary';
    if (extname === '.gltf') contentType = 'model/gltf+json';

    fs.realpath(filePath, (realpathErr, resolvedPath) => {
        const relativoReal = realpathErr ? '' : path.relative(__dirname, resolvedPath);
        if (realpathErr || relativoReal === '..' || relativoReal.startsWith('..' + path.sep) || path.isAbsolute(relativoReal)) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end('Arquivo não encontrado.');
            return;
        }
        fs.readFile(resolvedPath, (err, data) => {
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
});

// A máscara raster do Laço 2 pode passar de 64 KiB; o limite ainda impede frames excessivos.
const MAX_WS_PAYLOAD_BYTES = 8 * 1024 * 1024;
const wss = new WebSocket.Server({ server, maxPayload: MAX_WS_PAYLOAD_BYTES });
wss.on('error', (err) => {
    console.error('[WSS ERRO]', err && err.message ? err.message : err);
});

// CONTEXTO DE BROADCAST: qualquer broadcast síncrono iniciado por uma ação
// usa automaticamente mapaId + instanciaId do jogador que originou a ação.
// Isso protege inclusive código legado que ainda usa wss.clients.forEach().
let contextoBroadcastAtual = null;

// FILTRO GLOBAL DE COMBATE: nenhum evento de skill pode atravessar mapa/instância.
// Eventos com ownerId/autorId usam o contexto persistente do dono; eventos legados
// sem dono usam o contexto da ação síncrona atual.
const webSocketSendOriginal = WebSocket.prototype.send;
WebSocket.prototype.send = function (payload) {
    let dados = null;
    try { dados = typeof payload === 'string' ? JSON.parse(payload) : null; } catch (e) {}
    const ehEventoCombate = !!(dados && (
        (typeof dados.type === 'string' && (dados.type.indexOf('action_') === 0 || dados.type.indexOf('skill_') === 0)) ||
        dados.type === 'monster_lanceiro_block_hit' || dados.type === 'mob_block' ||
        dados.type === 'boss_golem_reflexo'
    ));
    if (ehEventoCombate) {
        const contexto = contextoDeEventoCombate(dados) || combateContextStorage.getStore() || contextoBroadcastAtual;
        if (contexto && !contextoClienteCompativel(this, contexto)) return;
    }
    return webSocketSendOriginal.apply(this, arguments);
};
let players = {};
let playerSockets = {};
let trades = {}; // { tradeId: { p1: id1, p2: id2, items1: [], items2: [], conf1: false, conf2: false } }
let tradeCounter = 1;
let parties = {}; // { partyId: [playerId1, playerId2, ...] }
let partyCounter = 1;

function entidadeEhElite(entidade) {
    return !!(entidade && (entidade.elite || (Array.isArray(entidade.tags) && entidade.tags.indexOf('elite') !== -1)));
}

function calcularHpElite(hpBase, ehElite) {
    const hp = Math.max(10, Math.floor(Number(hpBase) || 10));
    return ehElite ? Math.floor(hp * 1.8) : hp;
}

function notificarSpawnElite(elite) {
    if (!entidadeEhElite(elite)) return;
    const mapaElite = mapaPorCoordenada(elite.x);
    if (!mapaElite) return;
    const alerta = JSON.stringify({ type: 'elite_spawn_alert', id: elite.id, nome: elite.nome || 'Elite', x: elite.x, y: elite.y, mapa: mapaElite });
    for (const pid of Object.keys(players)) {
        const jogador = players[pid];
        const socket = playerSockets[pid];
        if (!jogador || !socket || socket.readyState !== WebSocket.OPEN) continue;
        if (mapaPorCoordenada(jogador.x + PLAYER_OFFSET_X) !== mapaElite || !instanciaCompativel(jogador, elite)) continue;
        try { socket.send(alerta); } catch (e) {}
    }
}
// ===== ARENA DE SOLARI — sessões independentes por instanciaId =====
// Cada entrada cria sua própria sala. Cada sala possui estado, monstros, timers e leilão isolados.
const solariSessoes = new Map();
let solariCounter = 1;
function solariSessaoDoJogador(pid) {
    if (!pid) return null;
    for (const s of solariSessoes.values()) {
        if (s.membros.some(function (m) { return m.id === pid; })) return s;
    }
    return null;
}
function solariSessaoPorInstancia(instanciaId) {
    return instanciaId ? (solariSessoes.get(instanciaId) || null) : null;
}
let slimes = [];
// ===== TUTORIAL INICIAL — somente personagens novos =====
// Etapa 1: status/pontos | Etapa 2: abrir/ler uma skill | Etapa 4: tutorial encerrado.
const TUTORIAL_BEMVINDO_NPC = { x: 85820, y: 930 };
const TUTORIAL_BEMVINDO_MONSTRO_ATK = 1;
const tutorialDemonioPorPlayer = {};

// Registro base de NPCs interativos. Novos NPCs entram aqui sem criar lógica nova no cliente.
const NPCS_INTERATIVOS = {
    tutorial_guia: { id: 'tutorial_guia', nome: 'Guia', x: TUTORIAL_BEMVINDO_NPC.x, y: TUTORIAL_BEMVINDO_NPC.y, mapa: 'bemvindo', raioInteracao: 125, dialogo: 'Olá, aventureiro! Posso te ajudar a conhecer este mundo.' }
};
function npcsParaMapa(mapa) {
    return Object.values(NPCS_INTERATIVOS).filter(n => n.mapa === mapa).map(n => ({ ...n }));
}

function tutorialSalvar(p) {
    if (!p || !p.nome) return;
    try {
        salvarProgresso(p.nome, {
            tutorialEtapa: p.tutorialEtapa || 0,
            tutorialStatusConcluido: !!p.tutorialStatusConcluido,
            tutorialSkillConcluida: !!p.tutorialSkillConcluida
        });
    } catch (e) {}
}

function tutorialAvancar(p, etapa) {
    if (!p || !p.tutorialEtapa || p.tutorialEtapa >= etapa) return;
    p.tutorialEtapa = etapa;
    tutorialSalvar(p);
}

function tutorialRemoverDemonio(p) {
    if (!p) return;
    const id = 'heroi_' + p.nome;
    const d = tutorialDemonioPorPlayer[p.nome];
    if (d) {
        const i = slimes.indexOf(d); if (i !== -1) slimes.splice(i, 1);
        delete tutorialDemonioPorPlayer[p.nome];
    }
}

function tutorialEstadoParaPlayer(p) {
    if (!p || !p.tutorialEtapa) return null;
    const demonio = tutorialDemonioPorPlayer[p.nome];
    return {
        etapa: p.tutorialEtapa,
        npc: TUTORIAL_BEMVINDO_NPC,
        statusAberto: !!p.tutorialStatusAberto,
        skillAberta: !!p.tutorialSkillAberta,
        skillLida: !!p.tutorialSkillLida,
        statusConcluido: !!p.tutorialStatusConcluido,
        skillConcluida: !!p.tutorialSkillConcluida,
        demonio: demonio && demonio.hp > 0 ? { id: demonio.id, x: demonio.x, y: demonio.y } : null
    };
}

// ============================================================================
// CONTEXTO GLOBAL DE COMBATE — MAPA + INSTÂNCIA
// Toda skill, zona, projétil e efeito persistente criado por um jogador deve
// carregar este contexto. Isso elimina dependência de coordenada física.
// ============================================================================

function contextoCombateDoJogador(playerId) {
    const p = players && players[playerId];
    if (!p) return null;
    const sessao = typeof solariSessaoDoJogador === 'function' ? solariSessaoDoJogador(playerId) : null;
    return {
        mapaId: sessao ? 'solari' : mapaPorCoordenada(p.x + PLAYER_OFFSET_X),
        instanciaId: sessao ? sessao.instanciaId : (p.instanciaId || null),
        instanciaTipo: sessao ? 'solari' : (p.instanciaTipo || null),
        ownerId: playerId
    };
}

function contextoCombateDaEntidade(entidade) {
    if (!entidade) return null;
    if (entidade.mapaId || entidade.instanciaId || entidade.solariInstanceId) {
        return {
            mapaId: entidade.mapaId || (entidade.solari ? 'solari' : mapaPorCoordenada(entidade.x)),
            instanciaId: entidade.instanciaId || entidade.solariInstanceId || null,
            instanciaTipo: entidade.instanciaTipo || (entidade.solari ? 'solari' : null),
            ownerId: entidade.ownerId || entidade.autorId || null
        };
    }
    const ownerId = entidade.ownerId || entidade.autorId || entidade.playerId || entidade.pid;
    return ownerId ? contextoCombateDoJogador(ownerId) : null;
}

function aplicarContextoCombate(entidade, contexto) {
    if (!entidade || !contexto) return entidade;
    entidade.mapaId = contexto.mapaId || null;
    entidade.instanciaId = contexto.instanciaId || null;
    entidade.instanciaTipo = contexto.instanciaTipo || null;
    if (contexto.mapaId === 'solari') {
        entidade.solari = true;
        entidade.solariInstanceId = contexto.instanciaId || null;
    }
    return entidade;
}

function entidadeNoContextoCombate(entidade, contexto) {
    if (!entidade || !contexto) return false;
    const ec = contextoCombateDaEntidade(entidade);
    if (!ec) return false;
    if (ec.mapaId !== contexto.mapaId) return false;
    if (contexto.instanciaId || ec.instanciaId) return !!contexto.instanciaId && !!ec.instanciaId && contexto.instanciaId === ec.instanciaId;
    return true;
}

function contextoClienteCompativel(client, contexto) {
    if (!client || !contexto || !client._playerId) return false;
    const cc = contextoCombateDoJogador(client._playerId);
    return !!cc && cc.mapaId === contexto.mapaId &&
        ((!contexto.instanciaId && !cc.instanciaId) || (!!contexto.instanciaId && contexto.instanciaId === cc.instanciaId));
}

function broadcastContextoCombate(contexto, payload) {
    if (!contexto) return;
    const msg = JSON.stringify(payload || {});
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && contextoClienteCompativel(client, contexto)) client.send(msg);
    });
}

function filtrarContextoCombate(lista, contexto) {
    return Array.isArray(lista) ? lista.filter(e => entidadeNoContextoCombate(e, contexto)) : [];
}

function contextoDeEventoCombate(dados) {
    if (!dados) return null;
    const ownerId = dados.ownerId || dados.autorId || dados.playerId || dados.pid ||
        (dados.id && players[dados.id] ? dados.id : null);
    if (ownerId) return contextoCombateDoJogador(ownerId);

    const colecoes = [
        projeteis, playerProjeteis, blizzards, vulcoes, chuvasServidor,
        florimSementes, florimArvores, florimEspinhos, florimParedes,
        meteorFires, escudosLancados, bolasElementais, buracosNegros,
        chuvasFlechaNova, canticosCelestiais, gasesVeneno, caixasFerramentas,
        chuvasCometas, orbeConstelacoes, redesSniper,
        summonerFendas, summonerCrateras, summonerImpactosAtrasados, summonerMiniFissuras
    ];
    if (dados.id != null) {
        for (const lista of colecoes) {
            if (!Array.isArray(lista)) continue;
            const ent = lista.find(e => e && e.id === dados.id);
            if (ent) return contextoCombateDaEntidade(ent);
        }
    }
    const mobId = dados.mobId || dados.monstroId || dados.bossId;
    if (mobId != null) {
        const alvo = (typeof slimes !== 'undefined' && slimes.find(e => e && e.id === mobId)) ||
            (typeof bosses !== 'undefined' && bosses.find(e => e && e.id === mobId));
        if (alvo) return contextoCombateDaEntidade(alvo);
    }
    if (dados.x != null && dados.y != null && typeof lacaios !== 'undefined') {
        for (const pid of Object.keys(lacaios)) {
            const pet = lacaios[pid];
            if (pet && Math.hypot((pet.x || 0) - dados.x, (pet.y || 0) - dados.y) < 4) {
                return contextoCombateDoJogador(pid);
            }
        }
    }
    return null;
}

function colecaoCombate(nome) {
    const arr = [];
    return new Proxy(arr, {
        get(target, prop, receiver) {
            if (prop === 'push') {
                return function () {
                    for (const item of arguments) {
                        if (item && typeof item === 'object') {
                            const ownerId = item.ownerId || item.autorId || item.playerId || item.pid;
                            const contexto = ownerId ? contextoCombateDoJogador(ownerId) : null;
                            if (contexto) aplicarContextoCombate(item, contexto);
                        }
                    }
                    return Array.prototype.push.apply(target, arguments);
                };
            }
            return Reflect.get(target, prop, receiver);
        }
    });
}

// Coleções persistentes de skills/efeitos passam a nascer com contexto automaticamente.
let projeteis = colecaoCombate('projeteis');
let playerProjeteis = colecaoCombate('playerProjeteis');
let blizzards = colecaoCombate('blizzards');
let vulcoes = colecaoCombate('vulcoes');
let chuvasServidor = colecaoCombate('chuvasServidor');
let lacaios = {};
let petsAtivos = Object.create(null);
let petRespawnTimer = {};
let bandas = {};
let bateriaCanal = {};
let rajadaCanal = {};
// ===== PIKEMAN: canalização da Execução da Morte (3s → 3 golpes) =====
// canal = { startX, startY, alvoTipo, alvoId, timer (ticks 50ms), total, angulo }
let pikemanCanais = {};
let florimSementes = colecaoCombate('florimSementes');
let florimArvores = colecaoCombate('florimArvores');
let florimEspinhos = colecaoCombate('florimEspinhos');
let florimParedes = colecaoCombate('florimParedes');
let aurasSagradas = {};

// ======= NOVAS SKILLS (GLOBALS) =======
let meteorFires = colecaoCombate('meteorFires');
let escudosLancados = colecaoCombate('escudosLancados');
let bolasElementais = colecaoCombate('bolasElementais');
let vinculosBerserker = {};
let buracosNegros = colecaoCombate('buracosNegros');
let chuvasFlechaNova = colecaoCombate('chuvasFlechaNova');
let canticosCelestiais = colecaoCombate('canticosCelestiais');
let golemsSismicos = {};
let summonerFendas = colecaoCombate('summonerFendas');
let summonerCrateras = colecaoCombate('summonerCrateras');
let summonerImpactosAtrasados = colecaoCombate('summonerImpactosAtrasados');
let summonerMiniFissuras = colecaoCombate('summonerMiniFissuras');
let summonerColapsos = colecaoCombate('summonerColapsos');
let proximoSummonerEntidadeId = 1;
let golemsMago = {};
let magoBolasFogoProjeteis = [];
let magoMiniTornados = [];


// ===== PIKEMAN — helpers da Execução da Morte (3 hits separados) =====
// Resolve o alvo informado pelo cliente. 'player' passa pelas regras de PvP
// (ambos com PvP ligado, vivos e no mesmo mapa) — nunca confiar no cliente.
function pikemanLocalizarAlvo(playerId, alvoTipo, alvoId) {
    if (alvoTipo === 'slime') {
        for (let s of slimes) { if (s.id === alvoId && s.hp > 0) return s; }
        return null;
    }
    if (alvoTipo === 'boss') {
        for (let b of bosses) { if (b.id === alvoId && b.hp > 0) return b; }
        return null;
    }
    if (alvoTipo === 'player') {
        if (!pvpPodeAtacar(playerId, alvoId)) return null;
        return players[alvoId];
    }
    if (alvoTipo === 'pet') {
        const pet = petRuntimeDoId(alvoId);
        if (!pet || !pvpPodeAtacar(playerId, pet.owner_id) || !validarOwnerPet(pet.owner_id, pet)) return null;
        return pet;
    }
    return null;
}

// PIRUETA DA MORTE — um golpe individual da cadeia de 3 (validado e contabilizado sozinho)
function pikemanGolpePirueta(playerId, alvoTipo, alvoId, dano, num) {
    let pk = players[playerId];
    if (!pk || pk.hp <= 0) return;
    let alvo = pikemanLocalizarAlvo(playerId, alvoTipo, alvoId);
    if (alvo) {
        let pX = pk.x + 12, pY = pk.y + 16;
        // ainda dentro do alcance (135 de folga sobre os 120 do disparo)
        if (Math.hypot(alvo.x - pX, alvo.y - pY) <= 135) {
            if (alvoTipo === 'slime') registrarDanoMonstro(alvo, playerId, dano, 'player');
            else if (alvoTipo === 'boss') registrarDanoBoss(alvo, playerId, dano, 'skill', 'player');
            else if (alvoTipo === 'pet') {
                const danoCalculado = calcularDanoJogador(playerId, dano, 'player', alvo).dano;
                applyDamageToCapturedPet(alvo, danoCalculado, playerId);
            }
            else aplicarDanoPvP(playerId, alvoId, dano, 'pirueta');
        }
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'action_pikeman_pirueta_hit', id: playerId, x: Math.round(alvo.x), y: Math.round(alvo.y), hit: num }));
            }
        });
    }
}

function pikemanGolpeExecucao(playerId, alvoTipo, alvoId, dano, num) {
    let pk = players[playerId];
    if (!pk || pk.hp <= 0) return;
    let alvo = pikemanLocalizarAlvo(playerId, alvoTipo, alvoId);
    let pX = pk.x + 12, pY = pk.y + 16;
    // Mesmo que o alvo morra antes, o golpe desce forte na posição (área frontal)
    let golpeouAlvo = false;
    if (alvo && Math.hypot(alvo.x - pX, alvo.y - pY) <= 145) {
        if (alvoTipo === 'slime') registrarDanoMonstro(alvo, playerId, dano, 'player');
        else if (alvoTipo === 'boss') registrarDanoBoss(alvo, playerId, dano, 'skill', 'player');
        else if (alvoTipo === 'pet') {
            const danoCalculado = calcularDanoJogador(playerId, dano, 'player', alvo).dano;
            applyDamageToCapturedPet(alvo, danoCalculado, playerId);
        }
        else aplicarDanoPvP(playerId, alvoId, dano, 'execucao');
        golpeouAlvo = true;
    } else {
        // AOE de impacto no chão quando o alvo morreu/escapou
        danoEmBosses(pX, pY, 90, playerId, dano, 'skill', 'player');
        for (let s of slimes) {
            if (s.hp > 0 && Math.hypot(s.x - pX, s.y - pY) < 90) registrarDanoMonstro(s, playerId, dano, 'player');
        }
    }
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'action_pikeman_execucao_hit', id: playerId,
                x: golpeouAlvo ? alvo.x : pX, y: golpeouAlvo ? alvo.y : pY,
                hit: num, pX: Math.round(pX), pY: Math.round(pY)
            }));
        }
    });
}

// TAAA → TAAA → TAAAAAAAA : cada golpe validado e contabilizado individualmente
function pikemanDispararExecucao(playerId, alvoTipo, alvoId) {
    let pk = players[playerId];
    if (!pk || pk.hp <= 0) return;
    pk.pikemanSkillAte = Date.now() + 640;
    let dano = dmgSkill(pk, 'execucao_morte', 42);
    pikemanGolpeExecucao(playerId, alvoTipo, alvoId, dano, 1);
    setTimeout(() => pikemanGolpeExecucao(playerId, alvoTipo, alvoId, dano, 2), 240);
    setTimeout(() => pikemanGolpeExecucao(playerId, alvoTipo, alvoId, dano, 3), 520);
}
let cooldownAuraSagrada = {};
let cooldownRessurreicao = {};
let dropsChao = [];
// ===== LADINO: zonas de gás venenoso (Névoa Venenosa) =====
// zona = { id, x, y, mapa, raio, tempo (ticks restantes), duracao (ticks), ownerId, danoBase }
let gasesVeneno = colecaoCombate('gasesVeneno');
let gasVenenoSeq = 0;

// ===== NOVAS CLASSES (v1.31): zonas de chão persistentes =====
// caixa de ferramentas (DroneMaster), chamas/poças/tornados/poços (Arqueiro Arcano),
// redes de arame (Sniper). Cada zona segue o MESMO padrão das gasesVeneno.
let caixasFerramentas = colecaoCombate('caixasFerramentas');
let chuvasCometas = colecaoCombate('chuvasCometas');        // ARQUEIRO ASTRAL: chuva de cometas (4s DoT)
let orbeConstelacoes = colecaoCombate('orbeConstelacoes');     // ARQUEIRO ASTRAL: orbe de constelação (cativeiro 2s + implosão)
let redesSniper = colecaoCombate('redesSniper');
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
// Mini Robô (Modo Assalto): 3x a velocidade base do DroneMaster (3.6) por tick do servidor
const DRONE_ASSALTO_VELOCIDADE = 10.8;

function sniperNoMato(x, y) {
    for (let m of MOITAS_SNIPER) {
        if (Math.hypot(x - m.x, y - m.y) <= m.raio) return m;
    }
    return null;
}

// Bandeiras de spawn criadas por admins (persistidas em spawn_flags.json)
let bandeirasSpawn = (spawnsAdmin && typeof spawnsAdmin.carregarBandeiras === 'function') ? spawnsAdmin.carregarBandeiras() : [];
let bandeirasInicializadas = false;
let timersBandeiraInstancia = {};
const MAP_VFX_FILE = path.join(__dirname, 'map_vfx.json');
let mapVfx = [];
try { mapVfx = JSON.parse(fs.readFileSync(MAP_VFX_FILE, 'utf8') || '[]'); if (!Array.isArray(mapVfx)) mapVfx = []; } catch (e) { mapVfx = []; }

const MAP_OBJETOS_FILE = path.join(__dirname, 'map_objetos.json');
const MAPA_SPRITES_DIR = path.join(__dirname, 'sprites', 'Objetos', 'editor');
let mapObjetos = [];
try { mapObjetos = JSON.parse(fs.readFileSync(MAP_OBJETOS_FILE, 'utf8') || '[]'); if (!Array.isArray(mapObjetos)) mapObjetos = []; } catch (e) { mapObjetos = []; }
const MAP_SPRITE_PALETTE_FILE = path.join(__dirname, 'map_sprite_palette.json');
let mapSpritePalette = [];
try {
    mapSpritePalette = JSON.parse(fs.readFileSync(MAP_SPRITE_PALETTE_FILE, 'utf8') || '[]');
    if (!Array.isArray(mapSpritePalette)) mapSpritePalette = [];
} catch (e) {
    if (e.code !== 'ENOENT') console.error('Erro ao carregar a paleta de sprites:', e.message);
}

function salvarMapVfx() { try { fs.writeFileSync(MAP_VFX_FILE, JSON.stringify(mapVfx, null, 2), 'utf8'); } catch (e) { console.error('Erro ao salvar map_vfx.json:', e.message); } }
function broadcastMapVfx() {
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'map_vfx', vfx: mapVfx }));
    });
}
function listarSpritesMapa() {
    return fs.readdirSync(MAPA_SPRITES_DIR, { withFileTypes: true })
        .filter(function (entry) { return entry.isFile() && /\.(?:png|jpe?g|webp)$/i.test(entry.name); })
        .map(function (entry) {
            const file = path.join(MAPA_SPRITES_DIR, entry.name);
            let fd;
            try {
                fd = fs.openSync(file, 'r');
                const header = Buffer.alloc(24);
                const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
                if (bytesRead === header.length && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
                    return { name: entry.name, width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
                }
                return { name: entry.name, width: 0, height: 0 };
            } finally {
                if (fd !== undefined) fs.closeSync(fd);
            }
        });
}

function salvarMapObjetos() {
    try {
        fs.writeFileSync(MAP_OBJETOS_FILE, JSON.stringify(mapObjetos, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar map_objetos.json:', e.message);
        return false;
    }
}
function mapaObjetosRemoverUm(lista, id) {
    if (!Array.isArray(lista) || typeof id !== 'string' || !id.trim()) return null;
    const index = lista.findIndex(function (objeto) { return objeto && objeto.id === id; });
    if (index < 0) return null;
    return lista.filter(function (_, itemIndex) { return itemIndex !== index; });
}
function mapaObjetosLimparMapa(lista, mapa) {
    if (!Array.isArray(lista) || typeof mapa !== 'string' || !mapa.trim()) return null;
    return lista.filter(function (objeto) { return objeto && objeto.mapa !== mapa; });
}
function mapaObjetosMesclarMapa(lista, objetos, mapa) {
    if (!Array.isArray(lista) || !Array.isArray(objetos) || typeof mapa !== 'string' || !mapa.trim()) return null;
    const resultado = lista.slice();
    objetos.forEach(function (objeto) {
        const index = resultado.findIndex(function (existente) {
            return existente && existente.id === objeto.id;
        });
        if (index < 0) resultado.push(objeto);
        else resultado[index] = objeto;
    });
    return resultado;
}
function salvarPaletaSprites() {
    try {
        fs.writeFileSync(MAP_SPRITE_PALETTE_FILE, JSON.stringify(mapSpritePalette, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar a paleta de sprites:', e.message);
        return false;
    }
}
function rasterMascaraValida(mask, region) {
    if (!mask || !region || !Number.isInteger(mask.w) || !Number.isInteger(mask.h) ||
        mask.w !== region.w || mask.h !== region.h || mask.w < 1 || mask.h < 1 ||
        mask.w * mask.h > 2000000 || typeof mask.data !== 'string' ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(mask.data)) return false;
    const bytes = Math.floor(mask.data.length * 3 / 4) -
        (mask.data.endsWith('==') ? 2 : (mask.data.endsWith('=') ? 1 : 0));
    return Math.ceil(mask.w * mask.h / 8) === bytes;
}
function broadcastMapObjetos() {
    if (LOCAL_LASSO_DIAGNOSTICS) {
        mapObjetos.forEach(function (objeto) { logDiagnosticoLaco('LOAD_BROADCAST', objeto); });
    }
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'map_objetos', objetos: mapObjetos }));
    });
}

// ============================================================================
// EDITOR DE MAPA (Admin) — Objetos persistentes com colisão/camada/efeito.
// Espelha o catálogo de TIPO_OBJETOS_MAPA do cliente (mapa-editor.js).
// ============================================================================
const TIPOS_OBJETOS_MAPA = [
    // Árvores
    'arvore', 'arvore_pinheiro', 'arvore_florida', 'arvore_dupla', 'arvore_outono', 'palmeira',
    'arvore_sakura', 'arvore_carvalho', 'arvore_pantano', 'arvore_gelo', 'arvore_deserto',
    'arvore_selva', 'arvore_profana', 'arvore_cristal', 'muda',
    // Paredes Vivas (Labirintos)
    'parede_viva', 'parede_viva_florida', 'parede_viva_curva', 'roseiral',
    // Pedras
    'pedra', 'pedra2', 'rocha_grande', 'pedregulho', 'pedra_pontuda',
    'pedra_musgo', 'laje', 'pilha_pedra', 'cristais_rocha', 'pedra_lunar',
    // Montanhas / Blocos
    'montanha', 'montanha_gigante', 'montanha_neve', 'montanha_vulcanica', 'duna_gigante',
    'iceberg_editor', 'bloco_pedra', 'bloco_granito', 'coluna', 'obelisco', 'ruina',
    'muro_pedra', 'muro_pedra_vertical', 'muro_pedra_diagonal', 'muralha', 'portao', 'ponte',
    // Paredes / Estruturas
    'parede_tijolo', 'parede_tijolo_vertical', 'parede_madeira', 'parede_madeira_vertical',
    'parede_gelo', 'muro_pantano', 'cerca', 'cerca_vertical', 'torre',
    'parede_troncos', 'tocha', 'fogueira',
    // Vegetação
    'moita', 'moita2', 'moita_esconderijo', 'arbusto', 'grama', 'grama_alta', 'juncos_pantano',
    'raizes_pantano', 'arbusto_desertico', 'cristal_colossal', 'rocha_lava',
    'capim', 'samambaia', 'bambu', 'cogumelo', 'tronco', 'toco',
    'arbusto_florido', 'samambaia_gigante', 'planta_carnivora', 'cogumelo_gigante', 'campo_flores', 'caminho_pedras', 'teia', 'osso',
    // Plantas / Flores
    'planta', 'planta_dupla', 'rosa_vermelha', 'rosa_amarela', 'flor_roxa', 'girassol', 'tulipa', 'cacto_florido',
    'flor_branca', 'flor_laranja', 'flor_azul',
    // Água
    'agua_quadrado', 'lagoa', 'canal',
    // Decoração
    'banco', 'lamparina', 'estaca_flamejante', 'bandeira', 'ancoradouro',
    'fonte', 'poco', 'caixa', 'barril', 'carroca', 'placa', 'ruina_ancestral',
    // Floresta dos Sussurros (árvores animadas, cabanas, fogueiras, água)
    'arvore_florestal', 'arvore_gigante_f', 'pinheiro_silvestre', 'salgueiro', 'arvore_morta', 'tronco_musgo',
    'cabana_grande', 'cabana_media', 'cabana_palha',
    'fogueira_pedra', 'fogueira_grande',
    'lago_grande', 'riacho',
    'colmeia', 'cogumelos_grupo', 'toco_musgo', 'galhos', 'pilha_lenha',
    'torre_vigia', 'barco_lago', 'pier_madeira', 'ponte_pedra', 'secador_peles', 'arvore_betula', 'entrada_caverna', 'horta',
    // Zonas pintadas (colisão livre / frente livre)
    'zona_colisao', 'zona_frente'
];

function mascaraPoligonoObjetoValida(mask) {
    return Array.isArray(mask) && mask.length >= 3 && mask.length <= 256 &&
        mask.every(function (point) {
            return point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
                point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
        });
}

function pontoDentroMascaraObjeto(mask, x, y) {
    let dentro = false;
    for (let i = 0, j = mask.length - 1; i < mask.length; j = i++) {
        const a = mask[i], b = mask[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) dentro = !dentro;
    }
    return dentro;
}

function colideMascaraSpriteObjeto(objeto, x, y, raio) {
    const escala = objeto.escala || 1;
    const w = (objeto.w || 40) * escala * (objeto.escalaX || 1);
    const h = (objeto.h || 40) * escala * (objeto.escalaY || 1);
    const radians = -(Number(objeto.rotacao) || 0) * Math.PI / 180;
    const dx = x - (objeto.x + w / 2), dy = y - (objeto.y + h / 2);
    const localX = dx * Math.cos(radians) - dy * Math.sin(radians) + w / 2;
    const localY = dx * Math.sin(radians) + dy * Math.cos(radians) + h / 2;
    const r = Math.max(0, Number(raio) || 0);
    if (localX < -r || localX > w + r || localY < -r || localY > h + r) return false;
    if (pontoDentroMascaraObjeto(objeto.assetCollisionMask, localX / w, localY / h)) return true;
    if (!r) return false;
    for (let i = 0; i < objeto.assetCollisionMask.length; i++) {
        const a = objeto.assetCollisionMask[i], b = objeto.assetCollisionMask[(i + 1) % objeto.assetCollisionMask.length];
        const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
        if (distPontoSegmento(localX, localY, ax, ay, bx, by) <= r) return true;
    }
    return false;
}

function colisaoObjetosDoMapa(mapa, cx, cy, raio) {
    const r = (typeof raio === 'number') ? raio : PLAYER_COLLISION_RADIUS;
    for (let i = 0; i < mapObjetos.length; i++) {
        const o = mapObjetos[i];
        if (!o || o.mapa !== mapa || !o.colisao) continue;
        if (o.tipo === 'zona_colisao' && Array.isArray(o.pontos) && o.pontos.length) {
            const raioX = Math.max(1, Number(o.raioX) || 12);
            const raioY = Math.max(1, Number(o.raioY) || 12);
            if (cx < o.x - r || cx > o.x + o.w + r || cy < o.y - r || cy > o.y + o.h + r) continue;
            const px = cx / raioX, py = cy / raioY;
            const tolerancia = 1 + r / Math.min(raioX, raioY);
            if (o.pontos.length === 1) {
                if (Math.hypot(px - o.pontos[0].x / raioX, py - o.pontos[0].y / raioY) <= tolerancia) return true;
            } else {
                for (let j = 1; j < o.pontos.length; j++) {
                    const p1 = o.pontos[j - 1], p2 = o.pontos[j];
                    if (distPontoSegmento(px, py, p1.x / raioX, p1.y / raioY, p2.x / raioX, p2.y / raioY) <= tolerancia) return true;
                }
            }
            continue;
        }
        if (o.tipo === 'sprite_personalizado' && mascaraPoligonoObjetoValida(o.assetCollisionMask)) {
            if (colideMascaraSpriteObjeto(o, cx, cy, r)) return true;
            continue;
        }
        const escala = o.escala || 1;
        const w = (o.w || 40) * escala * (o.escalaX || 1);
        const h = (o.h || 40) * escala * (o.escalaY || 1);
        const radians = -(Number(o.rotacao) || 0) * Math.PI / 180;
        const deltaX = cx - (o.x + w / 2), deltaY = cy - (o.y + h / 2);
        const dx = Math.abs(deltaX * Math.cos(radians) - deltaY * Math.sin(radians));
        const dy = Math.abs(deltaX * Math.sin(radians) + deltaY * Math.cos(radians));
        if (dx >= w / 2 + r || dy >= h / 2 + r) continue;
        const ox = dx - w / 2, oy = dy - h / 2;
        if (ox <= 0 || oy <= 0) return true;
        if (ox * ox + oy * oy <= r * r) return true;
    }
    return false;
}

const WORLD_WIDTH = 126800; // inclui as Florestas dos Sussurros, dos Nebulos, a Floresta Abissal e o Pântano Sombrio (117200..126800)
const WORLD_HEIGHT = 14000;
const LARGURA_MUNDO = MAPAS_REGISTRY.mundo.x0;
const FIM_MUNDO = MAPAS_REGISTRY.mundo.x0 + MAPAS_REGISTRY.mundo.w;
const TOPO_MUNDO = MAPAS_REGISTRY.mundo.y0 || 0;
const ALTO_MUNDO = TOPO_MUNDO + MAPAS_REGISTRY.mundo.h;

// Constantes mantidas como fallbacks de segurança
const LARGURA_VERDE = 18000, LARGURA_DESERTO = 50000, LARGURA_PANTANO = 58000,
    LARGURA_CAVERNA = 58000, FIM_CAVERNA = 59800, LARGURA_CIDADE = 59800, FIM_CIDADE = 61174,
    LARGURA_SOLARI = 63800, FIM_SOLARI = 65040, LARGURA_CIDADE_PERDIDA = 65040, FIM_CIDADE_PERDIDA = 71920,
    LARGURA_TESTE_VISUAL = 72000, FIM_TESTE_VISUAL = 73280, LARGURA_ZONA_ZERO = 74000, FIM_ZONA_ZERO = 82000,
    LARGURA_CASTELO = 82000, FIM_CASTELO = 84200, LARGURA_BEMVINDO = 85000, FIM_BEMVINDO = 87400, ALTO_BEMVINDO = 1800,
    RUINAS_01_X0 = 87400, RUINAS_01_X1 = 90000, ALTO_RUINAS_01 = 1900,
    LARGURA_FLORESTA = 90000, FIM_FLORESTA = 98000, ALTO_FLORESTA = 6000,
    LARGURA_NEBOLOS = 98000, FIM_NEBOLOS = 107600, ALTO_NEBOLOS = 5400,
    LARGURA_ABISSAL = 107600, FIM_ABISSAL = 117200, ALTO_ABISSAL = 5400,
    LARGURA_PANTANO_SOMBRIO = 117200, FIM_PANTANO_SOMBRIO = 126800, ALTO_PANTANO_SOMBRIO = 5400,
    LARGURA_TILETESTE = 128000, FIM_TILETESTE = 128960, ALTO_TILETESTE = 600,
    ALTO_VERDE = 5400, ALTO_DESERTO = 36000, ALTO_PANTANO = 9000, ALTO_CAVERNA = 1800, ALTO_CIDADE = 1145, ALTO_SOLARI = 1240, ALTO_CIDADE_PERDIDA = 3920, ALTO_TESTE_VISUAL = 960, ALTO_ZONA_ZERO = 9000, ALTO_CASTELO = 1800;

// SPAWN OFICIAL E ÚNICO: CENTRO EXATO DO CONTINENTE DE GAIA (144000, 14018)
const MUNDO_SPAWN_X = 144000, MUNDO_SPAWN_Y = 14018;
const CIDADE_SPAWN_X = MUNDO_SPAWN_X, CIDADE_SPAWN_Y = MUNDO_SPAWN_Y;
const BEMVINDO_SPAWN_X = MUNDO_SPAWN_X, BEMVINDO_SPAWN_Y = MUNDO_SPAWN_Y;

const PONTOS_TELEPORTE = Object.keys((mapaMundo && mapaMundo.CENTROS_BIOMAS) || {}).reduce(function (pontos, id) {
    const centro = mapaMundo.CENTROS_BIOMAS[id];
    pontos[id] = { x: centro.x, y: centro.y };
    return pontos;
}, {
    mundo: { x: MUNDO_SPAWN_X, y: MUNDO_SPAWN_Y },
    cidade: { x: MUNDO_SPAWN_X, y: MUNDO_SPAWN_Y },
    green: { x: MUNDO_SPAWN_X, y: MUNDO_SPAWN_Y },
    desert: { x: 153000, y: 14000 }
});

// ============================================================================
// CONFIGURAÇÃO MULTI-MAPA DE COLISÕES E CAMADAS (Admin Editor v1.46.0 / v1.47.0)
// ============================================================================
const MAPAS_CONFIG = MAPAS_REGISTRY;

const colisoesPorMapa = {};
const camadasPorMapa = {};

function carregarColisoesECamadasTodas() {
    Object.keys(MAPAS_CONFIG).forEach(function (mapa) {
        // Carrega colisões
        try {
            const fileCol = path.join(__dirname, 'colisoes_' + mapa + '.json');
            if (fs.existsSync(fileCol)) {
                const raw = fs.readFileSync(fileCol, 'utf-8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) colisoesPorMapa[mapa] = parsed;
                else colisoesPorMapa[mapa] = [];
            } else {
                colisoesPorMapa[mapa] = [];
            }
        } catch (e) {
            console.error('Erro ao carregar colisoes_' + mapa + '.json:', e.message);
            colisoesPorMapa[mapa] = [];
        }

        // Carrega camadas
        try {
            const fileCam = path.join(__dirname, 'camadas_' + mapa + '.json');
            if (fs.existsSync(fileCam)) {
                const rawCam = fs.readFileSync(fileCam, 'utf-8');
                const parsedCam = JSON.parse(rawCam);
                if (Array.isArray(parsedCam)) camadasPorMapa[mapa] = parsedCam;
                else camadasPorMapa[mapa] = [];
            } else {
                camadasPorMapa[mapa] = [];
            }
        } catch (e) {
            console.error('Erro ao carregar camadas_' + mapa + '.json:', e.message);
            camadasPorMapa[mapa] = [];
        }
    });

    // Sincroniza cidade se mapaCidade carregar dados próprios
    if (mapaCidade && typeof mapaCidade.obterObstaculos === 'function') {
        const obsCidade = mapaCidade.obterObstaculos();
        if (Array.isArray(obsCidade) && obsCidade.length > 0) {
            colisoesPorMapa['cidade'] = obsCidade;
        }
    }
    if (mapaCidade && typeof mapaCidade.obterCamadas === 'function') {
        const camCidade = mapaCidade.obterCamadas();
        if (Array.isArray(camCidade) && camCidade.length > 0) {
            camadasPorMapa['cidade'] = camCidade;
        }
    }
}
carregarColisoesECamadasTodas();

function distPontoSegmento(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function colideObstaculosCustomizados(mapa, cx, cy, raio) {
    const lista = colisoesPorMapa[mapa];
    if (!Array.isArray(lista) || lista.length === 0) return false;
    const cfg = MAPAS_CONFIG[mapa];
    if (!cfg) return false;

    const r = (typeof raio === 'number') ? raio : PLAYER_COLLISION_RADIUS;
    const lx = cx - cfg.x0;
    const ly = cy - cfg.y0;

    for (let i = 0; i < lista.length; i++) {
        const o = lista[i];
        if (!o) continue;

        const ox = (o.cx !== undefined) ? o.cx : ((o.x !== undefined) ? (o.x + (o.w ? o.w / 2 : 0)) : 0);
        const oy = (o.cy !== undefined) ? o.cy : ((o.y !== undefined) ? (o.y + (o.h ? o.h / 2 : 0)) : 0);
        if (o.tipo === 'line' && o.pontos && o.pontos.length >= 2) {
            const esp = (o.espessura ? o.espessura / 2 : 8) + r;
            if (lx < o.x - esp || lx > o.x + o.w + esp ||
                ly < o.y - esp || ly > o.y + o.h + esp) continue;
            for (let j = 0; j < o.pontos.length - 1; j++) {
                const p1 = o.pontos[j], p2 = o.pontos[j + 1];
                if (lx < Math.min(p1.x, p2.x) - esp || lx > Math.max(p1.x, p2.x) + esp ||
                    ly < Math.min(p1.y, p2.y) - esp || ly > Math.max(p1.y, p2.y) + esp) continue;
                if (distPontoSegmento(lx, ly, p1.x, p1.y, p2.x, p2.y) <= esp) return true;
            }
            continue;
        }
        if (Math.abs(lx - ox) > 160 || Math.abs(ly - oy) > 160) continue;

        if (o.tipo === 'rect' || o.tipo === 'caixa' || o.tipo === 'box') {
            const x1 = o.x !== undefined ? o.x : (o.x1 !== undefined ? o.x1 : 0);
            const y1 = o.y !== undefined ? o.y : (o.y1 !== undefined ? o.y1 : 0);
            const x2 = o.w !== undefined ? (x1 + o.w) : (o.x2 !== undefined ? o.x2 : x1 + 40);
            const y2 = o.h !== undefined ? (y1 + o.h) : (o.y2 !== undefined ? o.y2 : y1 + 40);

            if (lx + r >= x1 && lx - r <= x2 && ly + r >= y1 && ly - r <= y2) {
                return true;
            }
        } else if (o.tipo === 'circle' || o.tipo === 'circulo') {
            const dx = lx - (o.cx !== undefined ? o.cx : (o.x || 0));
            const dy = ly - (o.cy !== undefined ? o.cy : (o.y || 0));
            const rTotal = (o.r || 20) + r;
            if ((dx * dx + dy * dy) <= rTotal * rTotal) {
                return true;
            }
        }
    }
    return false;
}


// ============ ARENA DE SOLARI ============
// Solari é uma instância independente e usa a geometria própria do mapa Solari:
// física, mas NÃO compartilha a instância lógica com jogadores da Arena normal.
// 9 rounds oficiais; as coordenadas abaixo são a única fonte de verdade do
// portal e do ponto de chegada da instância.
const SOLARI_COORDS = {
    portalCidade: { x: 60488, y: 236, r: 42 },
    solari: {
        x0: mapaSolari ? mapaSolari.SOLARI_X0 : 63800,
        x1: mapaSolari ? mapaSolari.SOLARI_X1 : 65040,
        y1: mapaSolari ? mapaSolari.SOLARI_Y1 : 1240,
        chegada: mapaSolari && mapaSolari.PONTO_CHEGADA ? mapaSolari.PONTO_CHEGADA : { x: 64180, y: 460 }
    },
    rounds: 9
};
const PORTAL_ROXO_SOLARI = SOLARI_COORDS.portalCidade;
const SOLARI_MAX_MEMBROS = 5;
const SOLARI_ROUNDS = [
    { round: 1,  danoMult: 1.00, hpMult: 1.00, total: 30  },
    { round: 2,  danoMult: 1.20, hpMult: 1.30, total: 40  },
    { round: 3,  danoMult: 1.25, hpMult: 1.35, total: 80  },
    { round: 4,  danoMult: 1.30, hpMult: 1.40, total: 100 },
    { round: 5,  danoMult: 1.35, hpMult: 1.45, total: 150, elite: true },
    { round: 6,  danoMult: 1.45, hpMult: 1.50, total: 180 },
    { round: 7,  danoMult: 1.55, hpMult: 1.60, total: 200 },
    { round: 8,  danoMult: 2.25, hpMult: 2.50, total: 220 },
    { round: 9,  danoMult: 3.55, hpMult: 5.00, total: 320, elite: true } // Último round oficial
];
if (SOLARI_ROUNDS.length !== SOLARI_COORDS.rounds) {
    throw new Error('[SOLARI] Configuração inválida: quantidade de rounds não corresponde ao total oficial.');
}
// Tipos usados na arena (sem clamp de bioma, sem projéteis invisíveis e com
// dano escalável): melee, zumbi, caveira_melee, escorpiao, assassino, ogro,
// gargula, mamute. 2 tipos aleatórios por round.
const SOLARI_TIPOS = [];

// Tabela de XP oficial: valores progressivos (explicitos) do nível 1 ao 60.
// TOTAL de 1 a 60: 946.465 XP — fórmula original: floor(100 * lvl^1.45)
const TABELA_XP_LITERAL = [0, 100, 273, 491, 746, 1031, 1343, 1680, 2039, 2419, 2818, 3236, 3671, 4123, 4590, 5073, 5571, 6083, 6609, 7148, 7700, 8264, 8841, 9429, 10030, 10641, 11264, 11898, 12542, 13197, 13861, 14536, 15221, 15916, 16620, 17333, 18056, 18788, 19529, 20278, 21037, 21804, 22579, 23363, 24154, 24955, 25763, 26579, 27403, 28234, 29074, 29921, 30775, 31637, 32506, 33383, 34266, 35157, 36055, 36960, 37872];
const NIVEL_MAXIMO = 100;
const tabelaXp = {};
for (let lvl = 1; lvl <= NIVEL_MAXIMO; lvl++) {
    tabelaXp[lvl] = TABELA_XP_LITERAL[lvl] || Math.floor(100 * Math.pow(lvl, 1.45));
}
const XP_TETO_ABSOLUTO = tabelaXp[NIVEL_MAXIMO];

// Whitelist ÚNICA de classes do servidor. Usada na criação do personagem E em
// 'escolher_classe' — antes esse segundo caminho aceitava qualquer string e a
// gravava em jogadores.json (bypass de 'classePodeEquipar' e poluição do banco).
const CLASSES_VALIDAS = ['guerreiro', 'mago', 'summoner', 'arqueiro', 'curandeiro', 'barbaro', 'roqueiro', 'ladino', 'dronemaster', 'arqueiro_arcano', 'sniper', 'pikeman', 'florim', 'guerreiro_kaledron'];
function classeValida(c) {
    return typeof c === 'string' && CLASSES_VALIDAS.indexOf(c) !== -1;
}

/**
 * Normaliza level/xp de um jogador e Garante a INVARIANTE do level-up:
 *   1 <= level <= 60   e   0 <= xp < tabelaXp[level]
 * Sem isso, um xp inflado (vindo do disco ou de qualquer origem futura não
 * validada) faz o `while` de level-up disparar dezenas de vezes de uma vez,
 * entregando +1 ponto de atributo e +1 ponto de skill por nível.
 * @returns {boolean} true se corrigiu algo (registro suspeito).
 */
function sanitizarLevelXp(jogador) {
    if (!jogador) return false;
    let corrigido = false;
    let lvl = Number(jogador.level);
    if (!Number.isFinite(lvl) || lvl < 1) { lvl = 1; corrigido = true; }
    lvl = Math.floor(lvl);
    if (lvl > NIVEL_MAXIMO) { lvl = NIVEL_MAXIMO; corrigido = true; }
    if (jogador.level !== lvl) jogador.level = lvl;

    let xp = Number(jogador.xp);
    if (!Number.isFinite(xp) || xp < 0) { xp = 0; corrigido = true; }
    xp = Math.floor(xp);
    // Teto absoluto: nunca dá mais XP que o necessário para o nível 60.
    const teto = Math.max(0, XP_TETO_ABSOLUTO);
    if (xp > teto) { xp = teto; corrigido = true; }
    // Invariante: o xp guardado é sempre MENOR que o limiar do nível atual.
    const limiar = tabelaXp[lvl] || 100;
    if (xp >= limiar) { xp = Math.max(0, limiar - 1); corrigido = true; }
    if (jogador.xp !== xp) jogador.xp = xp;
    return corrigido;
}

/** Concede XP de forma segura: sanitiza ANTES e DEPOIS do loop de level-up. */
function concederXpSeguro(jogador, quantidade) {
    if (!jogador) return false;
    sanitizarLevelXp(jogador);
    const qtd = Number(quantidade);
    jogador.xp += (Number.isFinite(qtd) && qtd > 0) ? Math.floor(qtd) : 0;
    let subiu = false;
    while (jogador.xp >= (tabelaXp[jogador.level] || 100) && jogador.level < NIVEL_MAXIMO) {
        jogador.xp -= (tabelaXp[jogador.level] || 100);
        jogador.level++;
        jogador.pontosDisponiveis = (jogador.pontosDisponiveis === undefined ? 0 : jogador.pontosDisponiveis) + PONTOS_POR_LEVEL;
        jogador.pontosHabilidade = (jogador.pontosHabilidade || 0) + 1;
        jogador.mana = jogador.maxMp;
        subiu = true;
    }
    sanitizarLevelXp(jogador);
    return subiu;
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
    const atributoBase = typeof player.atributos[chave] === 'number' ? player.atributos[chave] : 1;
    let base = atributoBase;
    // Bônus de equipamentos: somados sobre o atributo base (alimenta as fórmulas existentes)
    if (player.inventario && player.inventario.slots) {
        for (let s in player.inventario.slots) {
            let itemSlots = player.inventario.slots[s];
            if (itemSlots && itemSlots.status && typeof itemSlots.status[chave] === 'number') {
                base += itemSlots.status[chave];
            }
        }
    }
    if (player.classe === 'mago' && chave === 'inteligencia') {
        base += Math.floor(Math.max(0, atributoBase - 1) / 5);
    }
    return base;
}

function ataqueEquipado(player) {
    if (!player || !player.inventario || !player.inventario.slots) return 0;
    return ['arma', 'armaSecundaria'].reduce(function (total, slot) {
        const item = player.inventario.slots[slot];
        if (!item || item.schemaVersion !== 1 || !itemSystem.validateEquipmentForClass(player.classe, item).valid) {
            return total;
        }
        return total + item.attack;
    }, 0);
}

function normalizarEquipamentosPorClasse(inventario, classe) {
    if (!inventario || typeof inventario !== 'object') return false;
    if (!inventario.slots || typeof inventario.slots !== 'object' || Array.isArray(inventario.slots)) inventario.slots = {};
    if (!Array.isArray(inventario.mochila)) inventario.mochila = [];
    let alterado = false;
    Object.keys(inventario.slots).forEach(function (slot) {
        const item = inventario.slots[slot];
        if (!item || item.tipo === 'vazio') return;
        const valido = item.schemaVersion === 1 && item.slot === slot &&
            itemSystem.validateEquipmentForClass(classe, item).valid;
        if (valido) return;
        inventario.slots[slot] = null;
        const itemId = item.itemInstanceId || item.uid || item.id;
        const jaNaMochila = itemId && inventario.mochila.some(function (outro) {
            return outro && (outro.itemInstanceId || outro.uid || outro.id) === itemId;
        });
        if (!jaNaMochila) inventario.mochila.push(item);
        alterado = true;
    });
    return alterado;
}

// Dados antigos podem manter um item equipado depois de uma troca de classe.
// Não deixa esse estado inválido lançar uma exceção em todo tick de dano:
// itens incompatíveis são ignorados, sem receber bônus defensivo.
function calcularDefesaEquipamentoJogador(player, dano) {
    const slots = player && player.inventario && player.inventario.slots || {};
    return itemSystem.reduzirDanoPelaDefesaEquipamentoCompativel(player.classe, slots, dano);
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

// v1.34: DROPS AUXILIARES — Ouro (quase todo monstro), Poções (chance) e
// Pedras de Upgrade (raridade escala com a dificuldade do monstro).
// Não precisam de "criador de drop" — caem com chance própria.
function gerarDropsAuxiliares(x, y, baseHp, ehBoss) {
    if (!equipamentos) return;
    const bal = equipamentos.BALANCE;

    // OURO: pequena quantidade em quase todos os monstros (90%)
    if (!ehBoss && Math.random() < (bal.chanceOuroMonstro || 0.9)) {
        let ouro = equipamentos.gerarOuro(baseHp, false);
        dropsChao.push({ id: ouro.id, x: x, y: y, criadoEm: Date.now(), item: ouro });
    }
    if (ehBoss) {
        let ouro = equipamentos.gerarOuro(baseHp, true);
        dropsChao.push({ id: ouro.id, x: x, y: y, criadoEm: Date.now(), item: ouro });
    }

    // POÇÕES: 30% dos monstros comuns; boss sempre larga 2
    if (ehBoss) {
        for (let i = 0; i < 2; i++) {
            let pocao = equipamentos.gerarPocao(Math.random() < 0.5 ? 'hp' : 'mp', equipamentos.sortearPocao(baseHp || 100));
            dropsChao.push({ id: pocao.id, x: x + (Math.random() * 30 - 15), y: y + (Math.random() * 30 - 15), criadoEm: Date.now(), item: pocao });
        }
    } else if (Math.random() < (bal.chancePocaoMonstro || 0.3)) {
        let pocao = equipamentos.gerarPocao(Math.random() < 0.5 ? 'hp' : 'mp', equipamentos.sortearPocao(baseHp || 30));
        dropsChao.push({ id: pocao.id, x: x, y: y, criadoEm: Date.now(), item: pocao });
    }

    // PEDRAS DE UPGRADE: raridade conforme dificuldade
    let pedra = equipamentos.gerarPedraUpgrade(baseHp || 0);
    if (pedra) {
        dropsChao.push({ id: pedra.id, x: x, y: y, criadoEm: Date.now(), item: pedra });
        let msg = JSON.stringify({ type: 'drop_raro', dropId: pedra.id, x: x, y: y, raridade: pedra.raridade, nome: pedra.nome || 'Item', especial: 'pedra' });
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(msg);
        });
    }
}

function resolverBiomaDrop(x, y, entidade) {
    const biomeName = entidade && (entidade.bioma || entidade.biome);
    const explicitBiomeId = itemSystem.getBiomeIdByName(biomeName);
    if (explicitBiomeId) return explicitBiomeId;
    if (mapaMundo && typeof mapaMundo.isMundo === 'function' && mapaMundo.isMundo(x, y)) {
        const worldBiomeId = itemSystem.getBiomeIdByName(mapaMundo.biomaNome(x, y));
        if (worldBiomeId) return worldBiomeId;
    }
    return null;
}

function gerarEquipamentoParaDrop(classe, x, y, entidade) {
    if (!itemSystem.getClass(classe)) {
        console.error('[LOOT] Classe inválida para drop de equipamento:', classe);
        return null;
    }
    const biomeId = resolverBiomaDrop(x, y, entidade);
    if (!biomeId) {
        console.error('[LOOT] Bioma não resolvido para drop de equipamento:', {
            tipo: entidade && (entidade.tipo || entidade.nome),
            bioma: entidade && entidade.bioma,
            x: x,
            y: y
        });
        return null;
    }
    const biome = itemSystem.getBiome(biomeId);
    const range = itemSystem.getItemLevelRange(biomeId);
    const levelValue = entidade && (entidade.nivel || entidade.level || entidade.nivelMonstro);
    const monsterLevel = Number.isFinite(Number(levelValue))
        ? Math.round(Number(levelValue))
        : biome.recommendedLevel[0];
    const itemLevel = Math.max(range[0], Math.min(range[1], monsterLevel));
    try {
        return itemSystem.generateEquipment({
            classId: classe,
            biomeId: biomeId,
            itemLevel: itemLevel
        });
    } catch (e) {
        console.error('[LOOT] Falha ao gerar equipamento:', e && e.stack ? e.stack : e);
        return null;
    }
}

// Spawna o drop no chão na morte de um monstro/boss.
// A classe do item é decidida pela ÚNICA regra isolada em equipamentos.js
// (escolherCriadorDrop = maior contribuidor de dano).
function gerarDropNoChao(x, y, tabelaDano, baseHp, ehBoss, entidade) {
    if (!equipamentos) return;
    let vezes = ehBoss ? (equipamentos.BALANCE.dropsPorBoss || 1) : 1;
    if (!ehBoss && !equipamentos.rolarDropMonstro(baseHp)) return;
    let criadorId = equipamentos.escolherCriadorDrop(tabelaDano);
    let classe = (criadorId && players[criadorId]) ? players[criadorId].classe : null;
    if (!classe) return;
    for (let i = 0; i < vezes; i++) {
        let item = gerarEquipamentoParaDrop(classe, x, y, entidade);
        if (!item) continue;
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

// ===== EDITOR "EDIT MOOB": tabela de drops configurável por monstro =====
// `drops` = [{ item: 'ouro'|'pocao_hp'|'pocao_mp'|'pedra_upgrade'|'equipamento', chance: 0-100 }]
function gerarDropsConfigurados(slime) {
    if (!slime || !Array.isArray(slime.drops) || !slime.drops.length) return;
    if (!equipamentos) return;
    slime.drops.forEach(function (d) {
        if (!d || typeof d.chance !== 'number') return;
        if (Math.random() * 100 >= d.chance) return;
        var baseHp = slime.baseHp || slime.maxHp || 100;
        var item = null;
        var dropId = null;
        switch (d.item) {
            case 'ouro':
                item = equipamentos.gerarOuro(baseHp, false);
                dropId = item.id;
                break;
            case 'pocao_hp':
                item = equipamentos.gerarPocao('hp', equipamentos.sortearPocao(baseHp));
                dropId = item.id;
                break;
            case 'pocao_mp':
                item = equipamentos.gerarPocao('mp', equipamentos.sortearPocao(baseHp));
                dropId = item.id;
                break;
            case 'pedra_upgrade':
                item = equipamentos.gerarPedraUpgrade(baseHp);
                if (item) {
                    dropId = item.id;
                    var msgPedra = JSON.stringify({ type: 'drop_raro', dropId: dropId, x: slime.x, y: slime.y, raridade: item.raridade, nome: item.nome || 'Item', especial: 'pedra' });
                    wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(msgPedra); });
                }
                break;
            case 'equipamento': {
                let criadorId = equipamentos.escolherCriadorDrop(slime.tabelaDano);
                let classe = (criadorId && players[criadorId]) ? players[criadorId].classe : null;
                if (classe) {
                    item = gerarEquipamentoParaDrop(classe, slime.x, slime.y, slime);
                    dropId = item.id;
                    if (item.raridade === 'epico' || item.raridade === 'lendario') {
                        let msgEq = JSON.stringify({ type: 'drop_raro', dropId: dropId, x: slime.x, y: slime.y, raridade: item.raridade, nome: item.nome || 'Item' });
                        wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(msgEq); });
                    }
                }
                break;
            }
        }
        if (item && dropId) {
            dropsChao.push({ id: dropId, x: slime.x + (Math.random() * 24 - 12), y: slime.y + (Math.random() * 24 - 12), criadoEm: Date.now(), item: item });
            console.log(`[LOG ITEM GERADO] Item UID ${item.uid || item.id} (${item.nome}) dropado por config do mob ${slime.tipo}`);
        }
    });
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
const DANO_BASE_ATAQUE_BASICO = Object.freeze({ melee: 5, physicalRanged: 3, magic: 4 });

function obterNivelSkill(p, skillId) {
    return (p && p.skills && p.skills[skillId]) ? p.skills[skillId] : 1;
}

// Dano/cura escala +25% por nível
function dmgSkill(p, skillId, base) {
    if (!base) return base;
    let d = Math.round(base * (1 + (obterNivelSkill(p, skillId) - 1) * 0.25));
    if (p && p.classe === 'mago' && p.nevascaBuffStacks && p.nevascaBuffExpires && Date.now() < p.nevascaBuffExpires) {
        d = Math.round(d * (1 + p.nevascaBuffStacks * 0.10));
    }
    return d;
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
    if (p.vinculoAtivo && p.vinculoExpires > Date.now()) mult *= 0.80; // VÍNCULO BERSERKER: +20% velocidade de ataque
    if (p.kaledronBradoAte && p.kaledronBradoAte > Date.now()) mult *= 0.80; // BRADO DE GUERRA VULCÂNICO: +20% velocidade de ataque
    if (p.inventario && p.inventario.slots) {
        for (let s in p.inventario.slots) {
            let it = p.inventario.slots[s];
            if (it && it.status && typeof it.status.velocidadeAtaque === 'number' && it.status.velocidadeAtaque > 0) {
                mult *= (1 - Math.min(0.20, it.status.velocidadeAtaque / 100));
            }
        }
    }
    if (efeitos && efeitos.temEfeito(p, 'selva_ataque_lento')) mult *= 1.4;
    if (!Number.isFinite(mult) || mult <= 0) mult = 0.4;
    return Math.max(0.4, Math.min(1.6, mult));
}

// ===== ATAQUE BÁSICO AUTOMÁTICO: VALIDAÇÃO DE ALVO (server-authoritative) =====
// O cliente apenas solicita com { alvoTipo: 'slime'|'boss'|'player', alvoId }. O
// servidor valida existência, vida, mesmo mapa e distância REAL (quadrada) antes
// de aplicar dano. Alvo 'player' exige PvP ligado dos DOIS lados.
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
    if (p.classe === 'pikeman') return 100;
    if (p.classe === 'guerreiro_kaledron') return 110;
    if (p.classe === 'dronemaster') return (p.dmTitaAtivo ? 242 : 124); // +15% (108→124; Tita 210→242)
    if (p.classe === 'sniper') return 384; // range reduzido em 20% (480 -> 384)
    if (p.classe === 'florim') return 180;
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
    if (p.classe === 'pikeman') return 520;
    if (p.classe === 'florim') return 420;
    if (p.classe === 'guerreiro_kaledron') return 840;
    return 300;
}

// ===== ALVO JOGADOR (PvP) =====
// Regra única e server-authoritative para qualquer habilidade mirar num jogador:
// os dois com PvP ligado, vivos, no mesmo mapa e distintos entre si.
// Usar SEMPRE antes de aplicarDanoPvP em caminho de alvo único.
function pvpPodeAtacar(atkId, defId) {
    const p1 = players[atkId];
    const p2 = players[defId];
    if (!p1 || !p2) return false;
    if (atkId === defId) return false;
    if (p1.hp <= 0 || p2.hp <= 0) return false;
    if (!p1.pvpAtivo || !p2.pvpAtivo) return false;
    // Solari é PvE e é uma instância isolada: PvP nunca atravessa sua fronteira.
    if (solariEmSessao(atkId) || solariEmSessao(defId)) return false;
    if (mapaDoJogador(atkId) !== mapaDoJogador(defId)) return false;
    return true;
}

// Distância em linha reta entre o centro de um jogador e o ponto de origem informado.
function pvpDistancia(atk, ox, oy) {
    return Math.hypot(atk.x + PLAYER_OFFSET_X - ox, atk.y + PLAYER_OFFSET_Y - oy);
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
    if (alvoTipo === 'player') {
        const p2 = players[alvoId];
        if (p2 && p2.hp > 0) return p2;
        return null;
    }
    if (alvoTipo === 'pet') {
        const pet = petRuntimeDoId(alvoId);
        if (pet && pet.hp > 0 && pet.state !== petAi.PET_STATES.DEAD &&
            pet.state !== petAi.PET_STATES.RESPAWN) return pet;
        return null;
    }
    return null;
}

function validarAtaqueBasicoAlvo(playerId, p, alvoTipo, alvoId) {
    if (!p || p.hp <= 0) return null;
    if (!alvoTipo || !alvoId) return null;
    let alvo = obterAlvoAtaqueServidor(alvoTipo, alvoId);
    if (!alvo) return null;
    let px = p.x + PLAYER_OFFSET_X;
    let py = p.y + PLAYER_OFFSET_Y;
    // Ataque básico respeita a instância Solari, não apenas a coordenada física.
    if (entidadeEhSolari(p) !== entidadeEhSolari(alvo)) return null;
    if (!instanciaCompativel(p, alvo)) return null;
    // PvP: o cliente não pode forjar alvo em jogador com PvP desligado.
    if (alvoTipo === 'player' && !pvpPodeAtacar(playerId, alvoId)) return null;
    if (alvoTipo === 'pet' && (!players[alvo.owner_id] ||
        !pvpPodeAtacar(playerId, alvo.owner_id) || !validarOwnerPet(alvo.owner_id, alvo))) return null;
    let alc = alcanceAtaqueBasicoClasse(p);
    let dx = alvo.x - px;
    let dy = alvo.y - py;
    if (dx * dx + dy * dy > alc * alc) return null;
    return alvo;
}

// Ataques básicos são sempre de alvo único. A validação de alvo/acesso ocorre
// antes de chamar este helper; ele nunca procura inimigos vizinhos nem cria AoE.
function aplicarDanoAtaqueBasicoAlvo(playerId, alvoTipo, alvoId, dano, tipoPvP) {
    const alvo = obterAlvoAtaqueServidor(alvoTipo, alvoId);
    if (!alvo) return false;
    if (alvoTipo === 'player') {
        if (!pvpPodeAtacar(playerId, alvoId)) return false;
        const danoCalculado = calcularDanoJogador(playerId, dano, 'player', alvo).dano;
        aplicarDanoPvP(playerId, alvoId, danoCalculado, tipoPvP || 'físico');
        return true;
    }
    if (alvoTipo === 'pet') {
        if (!pvpPodeAtacar(playerId, alvo.owner_id) || !validarOwnerPet(alvo.owner_id, alvo)) return false;
        const danoCalculado = calcularDanoJogador(playerId, dano, 'player', alvo).dano;
        return applyDamageToCapturedPet(alvo, danoCalculado, playerId);
    }
    if (alvoTipo === 'boss') {
        return registrarDanoBoss(alvo, playerId, dano, 'basico', 'player').dano > 0;
    }
    return registrarDanoMonstro(alvo, playerId, dano, 'player').dano > 0;
}

function atualizarBonusMaxHpGritoGuerra(p) {
    if (!p) return;
    let baseMax = calcularMaxHp(p) + (p.gritoGuerraBonus || 0);
    const bonusGuardiao = p.classe === 'guerreiro' && p.guerreiroBuffAte > Date.now()
        ? Math.round(baseMax * 0.10)
        : 0;
    p.maxHp = baseMax + bonusGuardiao;
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
    let cdMs = 0;
    if (motivo === 'manual') {
        cdMs = 5000; // CD de 5 segundos somente quando a skill for usada novamente
        cooldownAuraSagrada[healerId] = Date.now() + cdMs;
    } else if (motivo === 'mana_baixa') {
        cdMs = 10000;
        cooldownAuraSagrada[healerId] = Date.now() + cdMs;
    }
    transmitirAura('action_aura_sagrada_end', healerId, { motivo: motivo || 'manual', cooldownMs: cdMs });
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
    if (p && p.adminCheats && p.adminCheats.manaInfinita) {
        p.mana = p.maxMp || 100;
        return true;
    }
    if ((p.mana || 0) < custo) {
        ws.send(JSON.stringify({ type: 'mp_insuficiente', custo: custo, mana: Math.round(p.mana || 0) }));
        return false;
    }
    p.mana = Math.max(0, Math.round(p.mana - custo));
    ws.send(JSON.stringify({ type: 'mp_sync', mp: p.mana, maxMp: p.maxMp }));
    return true;
}

// v1.34: STAMINA — o DASH passa a consumir stamina (não mana).
// Igual ao gastarMana, mas usa a barra laranja de estamina.
function gastarEstamina(ws, p, custo) {
    if (!custo || custo <= 0) return true;
    if (p && p.adminCheats && p.adminCheats.semCooldown) {
        p.estamina = 100;
        return true;
    }
    if ((p.estamina || 0) < custo) {
        ws.send(JSON.stringify({ type: 'stamina_insuficiente', custo: custo, estamina: Math.round(p.estamina || 0) }));
        return false;
    }
    p.estamina = Math.max(0, Math.round(p.estamina - custo));
    ws.send(JSON.stringify({ type: 'stamina_sync', estamina: p.estamina }));
    return true;
}

// v1.30.3: avisa o cliente quando uma skill é rejeitada por FORA DE ALCANCE
// (o cliente usa isso para mostrar "Fora de alcance!" e cancelar o cooldown visual).
function avisaForaAlcance(ws, skill) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'skill_aviso', skill: skill || '', motivo: 'fora_alcance' }));
}

// v1.60.1 — AUDITORIA: ALCANCE VALIDADO NO SERVIDOR.
// O cliente já validava (checarSkill/SKILLS_DRAG), mas o servidor aceitava o
// cast de qualquer coordenada. Agora o servidor é a autoridade: alvo não finito
// ou além de `limitePx` (medido do centro do jogador) => rejeita.
// Usa o MESMO feedback já existente (avisaForaAlcance) e roda ANTES do cooldown,
// para que um cast errado não queime a recarga da skill.
function alcanceSkillValido(p, targetX, targetY, limitePx) {
    if (!p) return false;
    const x = Number(targetX), y = Number(targetY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return Math.hypot(x - (p.x + PLAYER_OFFSET_X), y - (p.y + PLAYER_OFFSET_Y)) <= limitePx;
}

// v1.60.0 — AUDITORIA: COOLDOWN SERVER-SIDE
// Antes destas 9 skills o cooldown existia SÓ no cliente (o servidor aceitava
// spam se o client fosse adulterado). O servidor passa a ser quem decide.
// Os valores são os do cliente COM a margem de -500ms já usada pelo resto do
// servidor (ex.: lastVulcao 19500 p/ 20s, lastCantico 14500 p/ 15s): o cliente
// zera o anel no ENVIO e o servidor começa a contar no RECEBIMENTO, então a
// margem evita o "pronto no cliente, ainda em recarga no servidor".
// Usa o MESMO padrão já existente de `p.lastX` (ex.: lastVulcao/lastBola),
// por isso o bypass de admin `semCooldown` (que zera esses campos) continua
// funcionando — basta manter o campo na lista de reset.
function avisaSkillCooldown(ws, skill, restanteMs) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'skill_aviso', skill: skill || '', motivo: 'cooldown', restante: Math.max(0, Math.round(restanteMs || 0)) }));
}

// Retorna false e avisa o cliente se a skill ainda estiver em recarga.
function cdSkillExpirado(ws, p, campoLast, cdMs, acao) {
    if (!p) return false;
    if (!p[campoLast]) p[campoLast] = 0;
    const restante = cdMs - (Date.now() - p[campoLast]);
    if (restante > 0) {
        avisaSkillCooldown(ws, acao, restante);
        return false;
    }
    return true;
}

// Marca o início do cooldown DEPOIS que a skill realmente foi aceita
// (se o mana falhar, a skill não entra em recarga).
function marcarSkillUsada(p, campoLast) {
    if (p) p[campoLast] = Date.now();
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
    const listaEfeitos = efeitos.exporEfeitos(p);
    const efeitosPublicos = listaEfeitos.filter((efeito) => efeito && efeito.id !== 'invisivel' && efeito.id !== 'camuflagem');
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            const ehDono = client._playerId === pid;
            client.send(JSON.stringify({ type: 'efeitos_sync', id: pid, efeitos: ehDono ? listaEfeitos : efeitosPublicos }));
        }
    });
}

// ============================================================================
// DASH v2 (v1.50.0) — SERVIDOR AUTORITATIVO
//
// O dash deixou de ser "um teleport genérico" e virou uma mecânica por classe,
// toda validada AQUI (nada de cooldown ou custo só no cliente).
//
// · COOLDOWN validado no servidor  -> elimina o exploit de spamming
// · CUSTO de stamina validado aqui -> cliente não decide o preço
// · DESTINO validado com o mesmo algoritmo do cliente (dash.js) -> sem divergência
// · ANIMAÇÃO (corrida/investida/arranque) roda no tick de 50ms -> o char
//   realmente CORRE no servidor; o cliente só desenha o que o servidor decide
// ============================================================================

function removerEfeitoAoVivo(pid, efeitoId) {
    if (!efeitos) return;
    if (efeitos.removerEfeito(players[pid], efeitoId)) {
        sincronizarEfeitos(pid, players[pid]);
    }
}

function dashEnviar(tipo, dados) {
    const msg = JSON.stringify(Object.assign({ type: tipo }, dados || {}));
    wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

function dashEnviarAoJogador(pid, tipo, dados) {
    const socket = playerSockets[pid];
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(Object.assign({ type: tipo }, dados || {})));
    }
}

function dashNoCd(p) {
    if (p.adminCheats && p.adminCheats.semCooldown) return true;
    return Date.now() >= (p.dashCdAte || 0);
}

function dashAplicarCd(p, cfg) {
    p.dashCdAte = Date.now() + (cfg.cooldownMs || 2000);
}

// Colisão do jogador no servidor (usa a MESMA função do movimento normal, com
// o offset do centro do corpo). Fora do castelo o raio 12px já vem embutido.
function dashColide(px, py) {
    return !posicaoJogadorValida(px, py);
}

function dashDestino(p, ang, distancia) {
    return DASH_MOD.resolverDestino(p.x, p.y, ang, distancia, dashColide);
}

function dashIniciarAnimacao(p, x1, y1, ang, duracaoMs) {
    p.dashAnim = {
        x0: p.x, y0: p.y, x1: x1, y1: y1, ang: ang,
        inicio: Date.now(), duracaoMs: duracaoMs,
        ultimoX: p.x, ultimoY: p.y
    };
}

// Investida do Bárbaro: dano contínuo nos slimes que atravessar + atropelamento.
// Bosses TOMAM dano reduzido mas NÃO são movidos.
function dashInvestidaDano(pid, p, d) {
    const cfg = DASH_MOD.configDe(p.classe);
    const agora = Date.now();
    if (d.proximoDano && agora < d.proximoDano) return;
    d.proximoDano = agora + 120;
    const cx = p.x + PLAYER_OFFSET_X, cy = p.y + PLAYER_OFFSET_Y;
    const danoCheio = dmgSkill(p, 'dash', cfg.dano);
    slimes.forEach(s => {
        if (s.hp <= 0) return;
        if (Math.hypot(s.x - cx, s.y - cy) > cfg.raioLateral) return;
        registrarDanoMonstro(s, pid, danoCheio);
        if (!s.isBoss) {
            const a = Math.atan2(s.y - cy, s.x - cx);
            moverMonstroDirecionalComDesvio(s, Math.cos(a), Math.sin(a), cfg.empurraoPx);
            s.stunTimer = Math.max(s.stunTimer || 0, 10);
        }
    });
    bosses.forEach(b => {
        if (b.hp <= 0) return;
        if (Math.hypot(b.x - cx, b.y - cy) > cfg.raioLateral) return;
        registrarDanoBoss(b, pid, Math.round(danoCheio * cfg.danoBossMult), 'skill', 'player');
    });
    // PvP: a investida atropela quem estiver com PvP ligado no mesmo mapa.
    if (p.pvpAtivo) {
        for (let outro in players) {
            if (!pvpPodeAtacar(pid, outro)) continue;
            const p2 = players[outro];
            if (Math.hypot(p2.x - cx, p2.y - cy) > cfg.raioLateral) continue;
            aplicarDanoPvP(pid, outro, danoCheio, 'dash');
        }
    }

}

// Escudo de área da Curandeira: só allies do MESMO GRUPO, empurra inimigos
// (nunca bosses) e atordoa a própria Curandeira.
function dashEscudoArea(pid, p) {
    const cfg = DASH_MOD.configDe('curandeiro');
    const cx = p.x + PLAYER_OFFSET_X, cy = p.y + PLAYER_OFFSET_Y;
    const protegidos = [pid];
    if (p.partyId && parties[p.partyId]) {
        parties[p.partyId].forEach(mid => {
            const m = players[mid];
            if (!m || m.hp <= 0) return;
            if (Math.hypot((m.x + PLAYER_OFFSET_X) - cx, (m.y + PLAYER_OFFSET_Y) - cy) <= cfg.raio) {
                if (mid !== pid) protegidos.push(mid);
            }
        });
    }
    protegidos.forEach(mid => {
        const m = players[mid];
        if (!m) return;
        darEscudoAbsorvente(m, Math.round(m.maxHp * 0.20), cfg.duracaoMs);
        // A própria Curandeira TAMBÉM recebe o evento: sem isso ela só veria o
        // flash de 0,9s da predição local e ficaria 9s sem saber que está
        // protegida. `proprio` diz ao cliente para segurar o domo a duracao toda.
        dashEnviar('action_curandeiro_escudo_area', {
            id: mid, x: m.x, y: m.y, duracaoMs: cfg.duracaoMs, proprio: (mid === pid)
        });
    });
    dashEnviar('action_curandeiro_escudo_area_carga', { id: pid, x: p.x, y: p.y, raio: cfg.raio });

    // Empurra inimigos para longe (BOSSES NUNCA são empurrados)
    const empurrar = (e, ehBoss) => {
        if (e.hp <= 0 || ehBoss) return;
        const a = Math.atan2(e.y - cy, e.x - cx);
        moverMonstroDirecionalComDesvio(e, Math.cos(a), Math.sin(a), cfg.empurraoPx);
    };
    slimes.forEach(s => empurrar(s, s.isBoss));
    bosses.forEach(b => empurrar(b, true));

    // ATORDOAMENTO DA PRÓPRIA CURANDEIRA (castigo)
    p.stunTimer = Math.max(p.stunTimer || 0, Math.floor(cfg.atordoamentoMs / 50));
    p.curandeiraAtordoada = true;
    p.curandeiraAtordoadaAte = Date.now() + cfg.atordoamentoMs;
    p.reducaoAtordoada = cfg.reducaoAtordoado;
}

function dashSummonerPetTeleporta(pid, p) {
    const ogro = lacaios[pid];
    if (!ogro) return;
    // EXCEÇÃO: não teleporta enquanto o Golem Sísmico está em cena
    if (ogro.sismicoAtivo || p.golemSismoAtivo) return;
    const alvo = DASH_MOD.resolverDestino(p.x, p.y, p.angulo, 55, function (x, y) {
        return !posicaoPetValida(x, y);
    });
    ogro.x = alvo.x; ogro.y = alvo.y;
    dashEnviar('action_summoner_pet_teleporte', { id: pid, x: ogro.x, y: ogro.y });
}

// ---------------------------------------------------------------------------
// SNIPER — ROUPA DE CAMUFLAGEM (v1.50.0)
// O dash não cria mais moita: ele VESTE o uniforme de camuflagem por 5s.
// Esse estado (`snRoupaCamo`) é o que LIBERA a skill 4 (Camuflagem Natural),
// que antes exigia apenas estar dentro de uma moita do mapa.
//
// São dois estados de propósito:
//   snRoupaCamo -> "está VESTIDO" (visual + habilita a skill 4). Vem do DASH.
//   snCamuflado -> "está ESCONDIDO no mato" (inimigos perdem o alvo, ataque
//                  básico bloqueado, CD da skill 1 zerado). Vem da SKILL 4.
//
// A camuflagem nunca sobrevive à roupa: quando o uniforme cai, as duas caem.
// ---------------------------------------------------------------------------
function dashCamuflagemSniper(pid, p, duracaoMs) {
    const dur = duracaoMs || DASH_MOD.configDe('sniper').duracaoMs;
    p.snRoupaCamo = true;
    p.snRoupaCamoAte = Date.now() + dur;
    p.snCamuflado = true;
    p.snCamofladoAte = Date.now() + dur;
    if (efeitos) efeitos.aplicarEfeito(p, 'camuflagem', Math.ceil(dur / 50), 1);
    if (p.snPosicao) {                          // não dá pra deitar usando o uniforme
        p.snPosicao = false;
        dashEnviar('action_sniper_posicao', { id: pid, ativo: false });
    }
    dashEnviarAoJogador(pid, 'action_sniper_camuflagem', { id: pid, ativo: true });
    dashEnviarAoJogador(pid, 'action_sniper_roupa_camo', {
        id: pid, x: p.x, y: p.y, duracaoMs: dur, expiraEm: p.snRoupaCamoAte
    });
    return p.snRoupaCamoAte;
}

// ---------------------------------------------------------------------------
// GUERREIRO — BAQUE DE ESCUDO (disparado 1x a cada 2s com o escudo erguido)
// Estocada na direção em que a espada está apontando: dano + empurrão nos
// inimigos dentro do arco frontal. Bosses TOMAM dano reduzido e NÃO são
// empurrados. O arco é o MESMO do arco de bloqueio (66°), então o que o
// jogador protege é exatamente o que ele empurra.
// ---------------------------------------------------------------------------
function escudoGuerreiroBaque(pid, p, cfg) {
    const cx = p.x + PLAYER_OFFSET_X, cy = p.y + PLAYER_OFFSET_Y;
    const ang = (p.escudoGuerreiro && Number.isFinite(p.escudoGuerreiro.ang))
        ? p.escudoGuerreiro.ang
        : (p.angulo || 0);
    const meioArco = (cfg.arco || 1.15) / 2;
    const danoBase = dmgSkill(p, 'dash', cfg.danoBaque);

    // só conta quem está DENTRO do arco protegido (mesmosLados normaliza o ângulo)
    const noArco = (ex, ey) => {
        const dx = ex - cx, dy = ey - cy;
        if (Math.hypot(dx, dy) > cfg.raioBaque) return false;
        return Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - ang), Math.cos(Math.atan2(dy, dx) - ang))) <= meioArco;
    };

    slimes.forEach(s => {
        if (s.hp <= 0 || !noArco(s.x, s.y)) return;
        registrarDanoMonstro(s, pid, danoBase);
        moverMonstroDirecionalComDesvio(s, Math.cos(ang), Math.sin(ang), cfg.empurraoBaque);
        s.stunTimer = Math.max(s.stunTimer || 0, cfg.atordoaBaque);
    });
    bosses.forEach(b => {
        if (b.hp <= 0 || !noArco(b.x, b.y)) return;
        registrarDanoBoss(b, pid, Math.round(danoBase * cfg.danoBaqueBossMult), 'skill', 'player');
    });
    // PvP: só entre jogadores com PvP ligado e no mesmo mapa
    if (p.pvpAtivo) {
        for (let outro in players) {
            if (!pvpPodeAtacar(pid, outro)) continue;
            if (!noArco(players[outro].x + PLAYER_OFFSET_X, players[outro].y + PLAYER_OFFSET_Y)) continue;
            aplicarDanoPvP(pid, outro, danoBase, 'baque');
        }
    }

    dashEnviar('action_guerreiro_escudo_baque', {
        id: pid, angulo: ang, x: cx, y: cy, raio: cfg.raioBaque
    });
}

function iniciarDash(playerId, ws, data) {
    const p = players[playerId];
    if (!p || p.hp <= 0) return;

    if (data.acao === 'soltar') {
        if (p.escudoGuerreiro) soltarEscudoGuerreiro(playerId, p, false);
        return;
    }
    if (p.stunTimer > 0) return;
    if (p.canalizandoMeteoro) { ws.send(JSON.stringify({ type: 'skill_erro', mensagem: 'Canalizando magia!' })); return; }
    if (p.dashAnim) return;                       // já está animando um dash

    const cfg = DASH_MOD.configDe(p.classe);

    // ---------- GUERREIRO: escudo frontal SEGURADO ----------
    if (cfg.tipo === 'escudo') {
        if (p.escudoGuerreiro) return;
        if (!dashNoCd(p)) { ws.send(JSON.stringify({ type: 'skill_erro', mensagem: 'Escudo em recarga!' })); return; }
        if ((p.estamina || 0) < 10) { ws.send(JSON.stringify({ type: 'stamina_insuficiente', custo: 10, estamina: Math.round(p.estamina || 0) })); return; }
        const agora = Date.now();
        p.escudoGuerreiro = {
            ang: Number(data.angulo) || p.angulo || 0,
            desde: agora,
            staminaInicial: p.estamina || 0,   // base ABSOLUTA do dreno (ver tick)
            angUltimoSync: -99,                 // evita reenviar o mesmo ângulo
            ultimoSync: 0,
            proximoBaque: agora + cfg.primeiroBaqueMs   // 1º baque logo depois de erguer
        };
        p.dashBloqueiaAcoes = true;
        dashEnviar('action_guerreiro_escudo', { id: playerId, angulo: p.escudoGuerreiro.ang, ativo: true });
        ws.send(JSON.stringify({ type: 'dash_confirmado', classe: p.classe, tipo: 'escudo', cooldownMs: cfg.cooldownMs }));
        return;
    }

    // ---------- DRONEMASTER: inalterado (escudo de energia) ----------
    if (cfg.tipo === 'energia') {
        if (!dashNoCd(p)) return;
        if (p.escudoAbsoluto > 0 && p.escudoAbsolutoExpirador > Date.now()) return;
        let dmCusto = 40;
        if (mapaMundo && typeof mapaMundo.ehDeserto === 'function' && mapaMundo.ehDeserto(p.x, p.y)) dmCusto *= 3;
        if (!gastarEstamina(ws, p, dmCusto)) return;
        dashAplicarCd(p, cfg);
        const escudoDash = Math.round(p.maxHp * 0.50);
        darEscudoAbsorvente(p, escudoDash, 3000);
        p.dmDashEscudo = escudoDash;
        p.dmDashEscudoExpirador = Date.now() + 3000;
        dashEnviar('action_dm_dash_escudo', { id: playerId });
        ws.send(JSON.stringify({ type: 'dash_confirmado', classe: p.classe, tipo: 'energia', cooldownMs: cfg.cooldownMs }));
        return;
    }

    if (!dashNoCd(p)) return;
    let custoDash = cfg.stamina;
    if (typeof custoDash === 'number' && mapaMundo && typeof mapaMundo.ehDeserto === 'function' && mapaMundo.ehDeserto(p.x, p.y)) {
        custoDash *= 3;
    }
    if (cfg.stamina === 'TODA') {
        if ((p.estamina || 0) < 20) { ws.send(JSON.stringify({ type: 'stamina_insuficiente', custo: 20, estamina: Math.round(p.estamina || 0) })); return; }
    } else if (!gastarEstamina(ws, p, custoDash)) return;
    dashAplicarCd(p, cfg);

    const ang = Number.isFinite(Number(data.angulo)) ? Number(data.angulo) : (p.angulo || 0);

    // ---------- CURANDEIRO: escudo de área, não move ----------
    if (cfg.tipo === 'area') {
        p.estamina = 0;
        ws.send(JSON.stringify({ type: 'stamina_sync', estamina: 0 }));
        dashEscudoArea(playerId, p);
        dashEnviar('action_curandeiro_escudo_solto', { id: playerId });
        ws.send(JSON.stringify({ type: 'dash_confirmado', classe: p.classe, tipo: 'area', cooldownMs: cfg.cooldownMs }));
        return;
    }

    // ---------- SNIPER: veste a ROUPA DE CAMUFLAGEM (5s), não move ----------
    if (cfg.tipo === 'camuflagem') {
        const expiraEm = dashCamuflagemSniper(playerId, p, cfg.duracaoMs);
        dashEnviar('action_dash', { id: playerId, x: p.x, y: p.y, vfx: cfg.vfx, angulo: ang, duracaoMs: cfg.duracaoMs });
        ws.send(JSON.stringify({
            type: 'dash_confirmado', classe: p.classe, tipo: 'camuflagem',
            x: p.x, y: p.y, duracaoMs: cfg.duracaoMs, expiraEm: expiraEm, cooldownMs: cfg.cooldownMs
        }));
        return;
    }

    // ---------- LADINO: SÓ BUFF (invisível + 90% de velocidade por 2s) ----------
    // Não roteiriza nada: o jogador continua no comando dele, só que mais
    // rápido e invisível. O movimento por inércia (ice/água) continua valendo.
    if (cfg.tipo === 'arranque' && cfg.soBuff) {
        p.dashAngulo = ang;
        p.dashVelocidadeMult = DASH_MOD.multVelocidade(p.classe, true);
        p.dashAte = Date.now() + cfg.duracaoMs;
        if (efeitos) efeitos.aplicarEfeito(p, 'invisivel', Math.floor(cfg.invisivelMs / 50), 1);
        sincronizarEfeitos(playerId, p);
        dashEnviar('action_dash', { id: playerId, x: p.x, y: p.y, vfx: cfg.vfx, angulo: ang, duracaoMs: cfg.duracaoMs });
        ws.send(JSON.stringify({
            type: 'dash_confirmado', classe: p.classe, tipo: 'arranque',
            soBuff: true, multVelocidade: p.dashVelocidadeMult,
            multVelAte: Date.now() + DASH_MOD.duracaoBuffVelocidade(p.classe),
            x: p.x, y: p.y, angulo: ang, cooldownMs: cfg.cooldownMs
        }));
        return;
    }

    const destino = dashDestino(p, ang, cfg.distancia);

    // ---------- TELEA PORTE (mago / summoner / arqueiro_arcano) ----------
    if (cfg.tipo === 'teleporte') {
        const origemX = p.x, origemY = p.y;
        p.x = destino.x; p.y = destino.y;
        // A posição resultante agora é a autoridade. Registrada ANTES do pet:
        // dashSummonerPetTeleporta lê p.x/p.y, então a sincronia do ogro
        // continua idêntica.
        dashGuardarPosicao(p, origemX, origemY, p.x, p.y, cfg.duracaoMs);
        if (p.classe === 'summoner') dashSummonerPetTeleporta(playerId, p);
        dashEnviar('action_dash', { id: playerId, x: p.x, y: p.y, vfx: cfg.vfx, angulo: ang });
        // Dano de contato (mantém o comportamento antigo do dash)
        const danoDash = dmgSkill(p, 'dash', 20);
        slimes.forEach(s => {
            if (s.hp > 0 && Math.hypot((p.x + 12) - s.x, (p.y + 16) - s.y) < 65) {
                registrarDanoMonstro(s, playerId, danoDash);
                s.stunTimer = 40;
            }
        });
        danoEmBosses(p.x + 12, p.y + 16, 90, playerId, danoDash, 'skill');
        ws.send(JSON.stringify({ type: 'dash_confirmado', classe: p.classe, tipo: 'teleporte', x: p.x, y: p.y, cooldownMs: cfg.cooldownMs }));
        return;
    }

    // ---------- CORRIDA / INVESTIDA / ARRANQUE: animação ----------
    if (destino.distPercorrida < 4) {
        // Parede colada: sem animação, mas sem penalizar o jogador
        dashEnviar('action_dash', { id: playerId, x: p.x, y: p.y, vfx: cfg.vfx, angulo: ang, semMovimento: true });
        ws.send(JSON.stringify({ type: 'dash_confirmado', classe: p.classe, tipo: cfg.tipo, x: p.x, y: p.y, semMovimento: true, cooldownMs: cfg.cooldownMs }));
        return;
    }

    p.dashAngulo = ang;
    p.dashVelocidadeMult = DASH_MOD.multVelocidade(p.classe, cfg.tipo === 'arranque');
    p.dashAte = Date.now() + cfg.duracaoMs;
    if (cfg.tipo === 'arranque') {
        if (efeitos) efeitos.aplicarEfeito(p, 'invisivel', Math.floor(cfg.invisivelMs / 50), 1);
        sincronizarEfeitos(playerId, p);
    }
    dashIniciarAnimacao(p, destino.x, destino.y, ang, cfg.duracaoMs);
    dashEnviar('action_dash', {
        id: playerId, tipo: cfg.tipo, vfx: cfg.vfx, angulo: ang,
        x0: p.dashAnim.x0, y0: p.dashAnim.y0, x1: destino.x, y1: destino.y,
        duracaoMs: cfg.duracaoMs
    });
    ws.send(JSON.stringify({
        type: 'dash_confirmado', classe: p.classe, tipo: cfg.tipo,
        x0: p.dashAnim.x0, y0: p.dashAnim.y0, x1: destino.x, y1: destino.y,
        duracaoMs: cfg.duracaoMs, angulo: ang, cooldownMs: cfg.cooldownMs
    }));
}

function soltarEscudoGuerreiro(playerId, p, forcado) {
    if (!p || !p.escudoGuerreiro) return;
    p.escudoGuerreiro = null;
    p.dashBloqueiaAcoes = false;
    const cfg = DASH_MOD.configDe('guerreiro');
    p.dashCdAte = Date.now() + cfg.cooldownMs;
    dashEnviar('action_guerreiro_escudo', { id: playerId, ativo: false, forcado: !!forcado });
    const ws = playerSockets[playerId];
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'guerreiro_escudo_fim' }));
}

// Ao desconectar, o Sniper não deixa fita de camuflagem pendurada: os dois
// estados (roupa + camuflagem) são por jogador e morrem com ele.
function limparCamuflagemSniper(pid) {
    const p = players[pid];
    if (!p) return;
    p.snRoupaCamo = false; p.snRoupaCamoAte = 0;
    p.snCamuflado = false; p.snCamofladoAte = 0;
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

// Alvos válidos (slimes) num raio — lista unificada para as novas classes
function slimesNoRaio(x, y, raio, mapa, instanciaId) {
    const alvos = [];
    for (let s of slimes) {
        if (s.hp <= 0 || s.flagPassivo) continue;
        if (mapa !== undefined && mapaPorCoordenada(s.x) !== mapa) continue;
        if (mapaEhInstanciado(mapa) && instanciaId && s.instanciaId !== instanciaId) continue;
        if (Math.hypot(s.x - x, s.y - y) <= raio) alvos.push(s);
    }
    return alvos;
}

// ==== DRONEMASTER ====
function danoBasicoDrone(p) { return dmgSkill(p, 'drone_dm', DANO_BASE_ATAQUE_BASICO.physicalRanged); }
function danoBasicoRobo(p) { return dmgSkill(p, 'tita_dm', DANO_BASE_ATAQUE_BASICO.physicalRanged); }

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
    p.snCamofladoAte = 0;
    if (efeitos) efeitos.removerEfeito(p, 'camuflagem');
    dashEnviarAoJogador(pid, 'action_sniper_camuflagem_fim', { id: pid, motivo: motivo || 'ataque' });
    sincronizarEfeitos(pid, p);
}

// ==== SNIPER: congela os cooldowns enquanto camuflado (server-side) ====
function congelarCooldownsSniper(p, ticks) {
    if (!p || !p.snCamuflado || p.moving) return;
    if (p.snAimCooldown > 0) p.snAimCooldown += ticks;
    if (p.snRedeCooldown > 0) p.snRedeCooldown += ticks;
    if (p.snPosicaoCd > 0) p.snPosicaoCd += ticks;
}



// congelar inimigos numa zona (slimes/bosses/players PvP)
function congelarNaZona(z, tempoTicks, danoBase, ownerId) {
    const dono = players[ownerId];
    if (!dono || dono.hp <= 0) return;
    slimes.forEach(s => {
        if (s.hp > 0 && instanciaCompativel(dono, s) && mapaPorCoordenada(s.x) === z.mapa && Math.hypot(s.x - z.x, s.y - z.y) <= z.raio) {
            s.stunTimer = Math.max(s.stunTimer || 0, tempoTicks);
            efeitos.aplicarEfeito(s, 'congelado', tempoTicks, 1);
        }
    });
    bosses.forEach(b => {
        if (b.hp > 0 && instanciaCompativel(dono, b) && mapaPorCoordenada(b.x) === z.mapa && Math.hypot(b.x - z.x, b.y - z.y) <= z.raio) {
            b.stunTimer = Math.max(b.stunTimer || 0, tempoTicks);
            efeitos.aplicarEfeito(b, 'congelado', tempoTicks, 1);
        }
    });
    // PvP: paralisia (não pode se mover)
    (function () {
        if (!dono.pvpAtivo) return;
        for (let pId in players) {
            if (pId === ownerId) continue;
            const p2 = players[pId];
            if (pvpPodeAtacar(ownerId, pId) && instanciaCompativel(dono, p2) && mapaPorCoordenada(p2.x + PLAYER_OFFSET_X) === z.mapa &&
                Math.hypot((p2.x + PLAYER_OFFSET_X) - z.x, (p2.y + PLAYER_OFFSET_Y) - z.y) <= z.raio) {
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

// AFINIDADE: vida do lacaio/ogro (90 base) — herda a Vida efetiva do personagem
function calcularVidaPet(player) {
    const herdados = afinidadePets.getPetInheritedAttributes(player, atributosTotais(player));
    let base = 90 + herdados.vida * 15;
    if (player && player.classe === 'summoner' && typeof SkillUpgradeTree !== 'undefined' && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(player.skillUpgrades, 'colossal', 1, 'A')) {
        base = Math.round(base * 1.25);
    }
    return base;
}

// Calcula dano final do autor, aplicando multiplicadores de atributo + crítico
// tipoOrigem: 'player' (força/inteligência por classe + crítico), 'pet' (atributos herdados pela Afinidade), 'dot' (profanidade)
function calcularDanoJogador(autorId, quantidade, tipoOrigem, alvo) {
    let p = players[autorId];
    if (!p) return { dano: Math.round(quantidade), critico: false };
    let mult = 1;
    let critMult = 1;
    if (tipoOrigem === 'pet') {
        const herdadosPet = afinidadePets.getPetInheritedAttributes(p, atributosTotais(p));
        mult += (herdadosPet.forca + herdadosPet.inteligencia) * 0.05;
    } else if (tipoOrigem === 'dot') {
        mult += (getAtr(p, 'profanidade') - 1) * 0.05;
    } else {
        let ehMagico = ['mago', 'summoner', 'curandeiro', 'roqueiro', 'arqueiro_arcano', 'arqueiro_astral', 'florim'].indexOf(p.classe) !== -1;
        mult += (getAtr(p, ehMagico ? 'inteligencia' : 'forca') - 1) * 0.05;
        // DESTREZA: 5% base + 1% por ponto de chance; 1.5x + 3% por ponto de multiplicador
        let chanceCritico = 0.05 + (getAtr(p, 'destreza') - 1) * 0.01;
        if (efeitos && efeitos.temEfeito(p, 'gritoDeGuerra')) {
            chanceCritico += 0.30;
        }
        // PIKEMAN — PASSIVA INSTINTO DA MORTE: +10% chance de crítico, +50% dano
        // crítico e +20% de dano contra alvos sob LENTIDÃO/CONGELAMENTO.
        let critMultExtra = 1;
        if (p.classe === 'pikeman') {
            chanceCritico += 0.10;
            critMultExtra = 1.5;
            if (alvo) {
                let alvoLento = (typeof alvo.slowTimer === 'number' && alvo.slowTimer > 0) ||
                    (alvo.efeitos && alvo.efeitos.some(function (ef) { return ef && (ef.id === 'lentidao' || ef.id === 'gelo' || ef.id === 'congelado'); }));
                if (alvoLento) mult *= 1.20; // Dano Final = Dano Normal × 1.20
            }
        }
        // DRONEMASTER — PROTOCOLO TITÃ: +30% dano e +20% de chance de crítico
        if (p.classe === 'dronemaster' && p.dmTitaAtivo) {
            mult *= 1.30;
            chanceCritico += 0.20;
        }
        // SNIPER — POSIÇÃO DE FRANCO-ATIRADOR: +100% dano (×2) e +100% taxa crítica garantida
        if (p.classe === 'sniper' && p.snPosicao) {
            mult *= 2.0;
            chanceCritico += 1.0;
        }
        if (Math.random() < chanceCritico) {
            critMult = (1.5 + (getAtr(p, 'destreza') - 1) * 0.03) * critMultExtra;
            if (efeitos && efeitos.temEfeito(p, 'gritoDeGuerra')) {
                critMult *= 1.5;
            }
        }
    }
    if (p.classe === 'mago') {
        const manaMaxima = Math.max(1, calcularMaxMp(p));
        const manaAtual = Math.max(0, Math.min(manaMaxima, Number(p.mana) || 0));
        mult *= 1 + (manaAtual / manaMaxima) * 0.10;
    }
    // Debuffs/buffs alteram o dano causado
    if (efeitos) {
        if (efeitos.temEfeito(p, 'reducaoAtk')) mult *= 0.75; // Enfraquecido: -25%
        if (efeitos.temEfeito(p, 'deserto_reducao_ataque')) mult *= 0.80;
        if (efeitos.temEfeito(p, 'fervor')) mult *= 1.25;     // Fervor: +25%
    }
    if (aliadoNaAura(autorId)) mult *= 1.05;
    if (p && p.vinculoAtivo && p.vinculoExpires > Date.now()) mult *= 1.30; // VÍNCULO BERSERKER: +30% de dano
    if (p && p.kaledronBradoAte && p.kaledronBradoAte > Date.now()) mult *= 1.35; // BRADO DE GUERRA VULCÂNICO: +35% de dano
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
    const attackBonus = tipoOrigem === 'pet' || tipoOrigem === 'dot' ? 0 : ataqueEquipado(p);
    return { dano: Math.round((quantidade + attackBonus) * mult * critMult), critico: critMult > 1 };
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
    dashEnviarAoJogador(pid, 'action_ladino_invisivel', { id: pid, ativo: false });
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
        if (s.hp > 0 && mapaPorCoordenada(s.x) === mapa && instanciaCompativel(player, s)) {
            const d2 = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
            if (d2 <= alcance * alcance) candidatos.push({ id: s.id, tipo: 'slime', x: s.x, y: s.y });
        }
    });
    bosses.forEach(b => {
        if (b.hp > 0 && mapaPorCoordenada(b.x) === mapa && instanciaCompativel(player, b)) {
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
function monstroEhVoador(entidade) {
    return !!(entidade && Array.isArray(entidade.tags) && entidade.tags.includes('voadores'));
}

function podeAndarTerreno(x, y, entidade) {
    const ignoraColisaoTerreno = monstroEhVoador(entidade);
    if (x >= LARGURA_MUNDO && x < FIM_MUNDO) {
        if (!(y >= TOPO_MUNDO) || y >= ALTO_MUNDO) return false;
        return ignoraColisaoTerreno || !(mapaMundo && mapaMundo.colideMundo(x, y, MONSTER_COLLISION_RADIUS));
    }
    if (!(y >= 0)) return false;
    if (x < LARGURA_VERDE) {
        if (y >= ALTO_VERDE) return false;
        if (!ignoraColisaoTerreno && mapaVerde && mapaVerde.colideVerde(x, y)) return false;
        return true;
    }
    if (x < LARGURA_DESERTO) {
        if (y >= ALTO_DESERTO) return false;
        if (!ignoraColisaoTerreno && mapaDeserto && mapaDeserto.colideDeserto(x, y)) return false;
        return true;
    }
    if (x < LARGURA_PANTANO) {
        if (y >= ALTO_PANTANO) return false;
        if (!ignoraColisaoTerreno && mapaPantano && mapaPantano.colidePantano(x, y)) return false;
        if (mapaPantano && mapaPantano.ehVenenoPantano && mapaPantano.ehVenenoPantano(x, y)) return false;
        return true;
    }
    if (x < FIM_CAVERNA) {
        if (y >= ALTO_CAVERNA) return false;
        if (!ignoraColisaoTerreno && mapaCaverna && mapaCaverna.colideCaverna(x, y)) return false;
        return true;
    }
    if (x < FIM_CIDADE) {
        if (y >= ALTO_CIDADE) return false;
        if (!ignoraColisaoTerreno && mapaCidade && mapaCidade.colideCidade(x, y)) return false;
        return true;
    }
    if (x < LARGURA_SOLARI) {
        return false;
    }
    if (x < FIM_SOLARI) {
        if (y >= ALTO_SOLARI) return false;
        if (!ignoraColisaoTerreno && mapaSolari && mapaSolari.colideSolari(x, y)) return false;
        return true;
    }
    if (x < FIM_CIDADE_PERDIDA) {
        if (y >= ALTO_CIDADE_PERDIDA) return false;
        if (!ignoraColisaoTerreno && mapaCidadePerdida && mapaCidadePerdida.colideCidadePerdida(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_CASTELO && x < FIM_CASTELO) {
        if (y >= ALTO_CASTELO) return false;
        if (!ignoraColisaoTerreno && mapaCastelo && mapaCastelo.colideCastelo(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_BEMVINDO && x < FIM_BEMVINDO) {
        if (y >= ALTO_BEMVINDO) return false;
        if (!ignoraColisaoTerreno && mapaBemVindo && mapaBemVindo.colideBemVindo(x, y, 12)) return false;
        return true;
    }
    if (x >= LARGURA_FLORESTA && x < FIM_FLORESTA) {
        if (y >= ALTO_FLORESTA) return false;
        if (!ignoraColisaoTerreno && mapaFloresta && mapaFloresta.colideFloresta(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_NEBOLOS && x < FIM_NEBOLOS) {
        if (y >= ALTO_NEBOLOS) return false;
        if (!ignoraColisaoTerreno && mapaNebulos && mapaNebulos.colideNebulos(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_ABISSAL && x < FIM_ABISSAL) {
        if (y >= ALTO_ABISSAL) return false;
        if (!ignoraColisaoTerreno && mapaAbissal && mapaAbissal.colideAbissal(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_PANTANO_SOMBRIO && x < FIM_PANTANO_SOMBRIO) {
        if (y >= ALTO_PANTANO_SOMBRIO) return false;
        if (!ignoraColisaoTerreno && mapaPantanoSombrio && mapaPantanoSombrio.colidePantanoSombrio(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_TILETESTE && x < FIM_TILETESTE) {
        if (y >= ALTO_TILETESTE) return false;
        if (!ignoraColisaoTerreno && mapaTileTeste && mapaTileTeste.colideTileTeste(x, y)) return false;
        return true;
    }
    if (x >= LARGURA_MUNDO && x < FIM_MUNDO) {
        if (y >= ALTO_MUNDO) return false;
        if (!ignoraColisaoTerreno && mapaMundo && mapaMundo.colideMundo(x, y, MONSTER_COLLISION_RADIUS)) return false;
        return true;
    }
    return false;
}

function podeAndar(x, y, entidade) {
    if (!podeAndarTerreno(x, y, entidade)) return false;
    if (monstroEhVoador(entidade)) return true;
    const mapa = mapaPorCoordenada(x);
    if (!mapa) return false;
    const raio = Math.max(2, Number(entidade && entidade.raioColisao) || MONSTER_COLLISION_RADIUS);
    return !colideObstaculosCustomizados(mapa, x, y, raio);
}

function moverMonstroDirecionalComDesvio(monstro, dx, dy, passo, opcoes) {
    if (!monstro || !Number.isFinite(dx) || !Number.isFinite(dy) || !(passo > 0)) return false;
    const distancia = Math.hypot(dx, dy);
    if (distancia < 0.001) return false;
    const alcancePasso = opcoes && opcoes.limitarDistancia ? Math.min(passo, distancia) : passo;
    const anguloAlvo = Math.atan2(dy, dx);
    const podeOcupar = function (x, y) {
        return podeAndar(x, y, monstro) &&
            !(opcoes && opcoes.bloquearPets && petBloqueiaMonstro(monstro, x, y));
    };
    const moverNaDirecao = function (angulo) {
        const x = monstro.x + Math.cos(angulo) * alcancePasso;
        const y = monstro.y + Math.sin(angulo) * alcancePasso;
        if (!podeOcupar(x, y)) return false;
        monstro.x = x;
        monstro.y = y;
        return true;
    };

    if (moverNaDirecao(anguloAlvo)) {
        monstro.aiDesvioColisaoLado = 0;
        return true;
    }

    let lado = Number(monstro.aiDesvioColisaoLado);
    if (lado !== -1 && lado !== 1) {
        const id = String(monstro.id || monstro.tipo || '');
        let soma = 0;
        for (let i = 0; i < id.length; i++) soma = (soma + id.charCodeAt(i)) | 0;
        lado = (soma & 1) ? 1 : -1;
    }
    if (moverNaDirecao(anguloAlvo + lado * Math.PI / 2)) {
        monstro.aiDesvioColisaoLado = lado;
        return true;
    }
    if (moverNaDirecao(anguloAlvo - lado * Math.PI / 2)) {
        monstro.aiDesvioColisaoLado = -lado;
        return true;
    }
    for (let graus = 15; graus <= 165; graus += 15) {
        const desvio = graus * Math.PI / 180;
        if (moverNaDirecao(anguloAlvo + lado * desvio)) {
            monstro.aiDesvioColisaoLado = lado;
            return true;
        }
        if (moverNaDirecao(anguloAlvo - lado * desvio)) {
            monstro.aiDesvioColisaoLado = -lado;
            return true;
        }
    }
    return false;
}

// Validação central de posição do jogador. As coordenadas do jogador são o
// canto superior esquerdo; os mapas/colisões recebem o centro físico.
const PLAYER_OFFSET_X = 12;
const PLAYER_OFFSET_Y = 16;
const PLAYER_COLLISION_RADIUS = 12;
const MONSTER_COLLISION_RADIUS = 14;
const MAX_PLAYER_COLLISION_STEP = 12;

// ---------------------------------------------------------------------------
// GUARDA DO DASH — rede de segurança do rubber-band do dash
// ---------------------------------------------------------------------------
// O pacote de movimento do cliente é {x, y, angulo, moving} e NÃO tem `action`.
// validarMovimentoJogador NÃO limita a distância, porque o movimento normal é
// validado por colisão, não por velocidade. Resultado: um pacote que já estava
// em viagem quando o dash foi autorizado chega DEPOIS dele; como a posição
// enviada é a VELHA, o servidor a aceita como movimento normal e desfaz o
// teleporte. O cliente então se corrige (limiar de 120px) e o personagem vai e
// volta.
//
// A guarda marca a posição de ORIGEM e a RESULTANTE do dash. Enquanto ela vale,
// um pacote de movimento que ainda aponta para a região antiga (ou seja, que
// desfaz o teleporte) é descartado. Qualquer pacote que já sai da posição
// pós-dash dentro de um passo normal é movimento legítimo e fecha a guarda na
// hora — o jogador não fica congelado. A guarda também morre sozinha no timeout,
// então uma confirmação perdida não prende ninguém.
//
// Nenhum valor de gameplay foi alterado: as distâncias de cada classe continuam
// exatamente as de dash.js, e a validação de colisão é a mesma de antes.
//
// Janela de tempo: 400ms (mesma margem da predição local do cliente) + a duração
// local do dash + 400ms para cobrir um cliente ANTIGO. O cliente corrigido para
// de enviar movimento assim que monta o dash, então os pacotes obsoletos dele
// chegam em até 1 RTT. Um cliente sem a correção continua enviando até receber
// dash_confirmado (1 RTT depois), e esses pacotes chegam em até 2 RTT. Os dois
// cenários caem dentro desta janela até 400ms de RTT.
const DASH_GUARDA_MS = 400;
const DASH_GUARDA_RTT_ANTIGO = 400;
// Tolerancia para reconhecer a posicao velha: o cliente antigo mandava a
// propria posicao nos ultimos frames antes do dash, entao esses pacotes caem
// a poucos pixels da origem. Eh fixa porque vale para qualquer tamanho de dash.
const DASH_GUARDA_TOLERANCIA = 40;

// origem = posição antes do dash (o que um pacote antigo ainda aponta);
// destino = posição resultante (a nova autoridade).
function dashGuardarPosicao(p, origemX, origemY, destinoX, destinoY, duracaoMs) {
    if (!p) return;
    p.dashGuardOrigemX = origemX;
    p.dashGuardOrigemY = origemY;
    p.dashGuardX = destinoX;
    p.dashGuardY = destinoY;
    p.dashGuardAte = Date.now()
        + DASH_GUARDA_MS
        + DASH_GUARDA_RTT_ANTIGO
        + (Number.isFinite(duracaoMs) ? duracaoMs : 0);
}

function limparDashGuarda(p) {
    if (!p) return;
    p.dashGuardAte = 0;
    p.dashGuardX = 0;
    p.dashGuardY = 0;
    p.dashGuardOrigemX = 0;
    p.dashGuardOrigemY = 0;
}

// true = o pacote de movimento é obsoleto (viajou antes do dash) e deve ser
// ignorado. Cobre o dash animado pelo `dashAnim`, que já é dirigido pelo tick.
function dashMovimentoObsoleto(p, targetX, targetY) {
    if (!p) return false;
    // Dash roteirizado (corrida/investida/arranque): quem manda na posição é
    // o tick de 50ms, não o cliente.
    if (p.dashAnim) return true;
    if (!p.dashGuardAte) return false;
    if (Date.now() > p.dashGuardAte) { limparDashGuarda(p); return false; }

    // Passo normal saindo da posição pós-dash: é o jogador andando de novo,
    // então a guarda já cumpriu o papel dela e encerra na hora.
    if (Math.hypot(targetX - p.dashGuardX, targetY - p.dashGuardY) <= MAX_PLAYER_COLLISION_STEP) {
        limparDashGuarda(p);
        return false;
    }

    // Um pacote obsoleto carrega a posição que o cliente tinha ANTES do dash,
    // ou seja, cai na origem. Um passo legítimo nunca fica nesse ponto: o
    // cliente envia a posição a cada 30ms e anda poucos pixels por pacote, então
    // qualquer movimento real a partir do destino já sai desta área.
    if (Math.hypot(targetX - p.dashGuardOrigemX, targetY - p.dashGuardOrigemY) <= DASH_GUARDA_TOLERANCIA) {
        return true;
    }

    // Não é a posição velha: é movimento legítimo (o jogador andou para longe da
    // origem ou algo o deslocou). A guarda já cumpriu o papel dela e encerra,
    // para nunca interferir depois disso.
    limparDashGuarda(p);
    return false;
}

function mapaPorCoordenada(x) {
    if (!Number.isFinite(x)) return null;
    const ids = Object.keys(MAPAS_REGISTRY);
    for (let i = 0; i < ids.length; i++) {
        const m = MAPAS_REGISTRY[ids[i]];
        if (x >= m.x0 && x < m.x0 + m.w) return m.id;
    }
    return null;
}

// ===== INSTÂNCIAS DE MAPA — migração gradual, mapa por mapa =====
// Primeiro mapa migrado: Campo Verde (green). O mapa físico continua no mesmo
// intervalo de coordenadas; a separação passa a ser lógica pelo instanciaId.
const MAPAS_INSTANCIADOS = new Set(['green']);
const LIMITE_JOGADORES_INSTANCIA = { green: 50 };
// V1.2: gerenciador genérico passa a ser a fonte de criação/remoção das instâncias,
// mantendo instanciasMapa como compatibilidade temporária durante a migração.
const GERENCIADOR_INSTANCIAS = INSTANCIAS.criarGerenciador({ limitePadrao: 50 });
let instanciasMapa = {};

function mapaEhInstanciado(mapa) {
    return !!(mapa && MAPAS_INSTANCIADOS.has(mapa));
}

function criarInstanciaMapa(mapa) {
    if (!mapaEhInstanciado(mapa)) return null;
    const instancia = GERENCIADOR_INSTANCIAS.criar(mapa, mapa, { maxMembros: LIMITE_JOGADORES_INSTANCIA[mapa] || 50 });
    instanciasMapa[instancia.id] = instancia;
    return instancia;
}

function instanciaMapaDoJogador(playerId) {
    const p = players[playerId];
    return p && p.instanciaId && instanciasMapa[p.instanciaId] ? instanciasMapa[p.instanciaId] : null;
}

function garantirInstanciaMapaParaJogador(playerId, mapa) {
    const p = players[playerId];
    if (!p || !mapaEhInstanciado(mapa)) return null;
    const atual = instanciaMapaDoJogador(playerId);
    if (atual && atual.mapaId === mapa) return atual;

    let destino = GERENCIADOR_INSTANCIAS.encontrarDisponivel(mapa, LIMITE_JOGADORES_INSTANCIA[mapa] || 50);
    if (!destino) destino = criarInstanciaMapa(mapa);
    if (destino && !instanciasMapa[destino.id]) instanciasMapa[destino.id] = destino;
    if (!destino) return null;

    if (atual) atual.membros.delete(playerId);
    destino.membros.add(playerId);
    p.instanciaId = destino.id;
    p.instanciaTipo = mapa;
    // Ao abrir uma nova instância, materializa os spawns persistentes daquele mapa
    // exclusivamente nela. As bandeiras continuam sendo a fonte de configuração.
    if (bandeirasSpawn && bandeirasInicializadas) {
        bandeirasSpawn.forEach(function (flag) {
            if (mapaPorCoordenada(flag.x) === mapa) preencherBandeira(flag, destino.id);
        });
    }
    return destino;
}

function limparEntidadesInstancia(instanciaId) {
    if (!instanciaId) return;
    slimes = slimes.filter(function (s) { return s.instanciaId !== instanciaId; });
    bosses = bosses.filter(function (b) { return b.instanciaId !== instanciaId; });
    projeteis = projeteis.filter(function (p) { return p.instanciaId !== instanciaId; });
    playerProjeteis = playerProjeteis.filter(function (p) { return p.instanciaId !== instanciaId; });
    dropsChao = dropsChao.filter(function (d) { return d.instanciaId !== instanciaId; });
    gasesVeneno = gasesVeneno.filter(function (g) { return g.instanciaId !== instanciaId; });
    florimSementes = florimSementes.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimArvores = florimArvores.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimEspinhos = florimEspinhos.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimParedes = florimParedes.filter(function (z) { return z.instanciaId !== instanciaId; });
    summonerFendas = summonerFendas.filter(function (z) { return z.instanciaId !== instanciaId; });
    summonerCrateras = summonerCrateras.filter(function (z) { return z.instanciaId !== instanciaId; });
    summonerImpactosAtrasados = summonerImpactosAtrasados.filter(function (z) { return z.instanciaId !== instanciaId; });
    summonerMiniFissuras = summonerMiniFissuras.filter(function (z) { return z.instanciaId !== instanciaId; });
    delete timersBandeiraInstancia[instanciaId];
}

function removerJogadorDaInstanciaMapa(playerId) {
    const p = players[playerId];
    if (!p || !p.instanciaId) return;
    const instancia = instanciasMapa[p.instanciaId];
    if (instancia) {
        instancia.membros.delete(playerId);
        if (instancia.membros.size === 0) {
            limparEntidadesInstancia(instancia.id);
            GERENCIADOR_INSTANCIAS.remover(instancia.id);
            delete instanciasMapa[instancia.id];
        }
    }
    p.instanciaId = null;
    p.instanciaTipo = null;
}

function sincronizarInstanciaMapaJogador(playerId) {
    const p = players[playerId];
    if (!p) return;
    const sessaoSolari = solariSessaoDoJogador(playerId);
    if (sessaoSolari) {
        p.instanciaId = sessaoSolari.instanciaId;
        p.instanciaTipo = 'solari';
        return;
    }
    const mapa = mapaPorCoordenada(p.x + PLAYER_OFFSET_X);
    if (mapaEhInstanciado(mapa)) {
        garantirInstanciaMapaParaJogador(playerId, mapa);
    } else if (p.instanciaId) {
        removerJogadorDaInstanciaMapa(playerId);
    }
}

function sincronizarEntidadesInstanciadas() {
    // Reforço global: qualquer entidade persistente criada por skill recebe
    // mapaId/instanciaId mesmo que tenha sido criada por código legado.
    const colecoes = [
        projeteis, playerProjeteis, blizzards, vulcoes, chuvasServidor,
        florimSementes, florimArvores, florimEspinhos, florimParedes,
        meteorFires, escudosLancados, bolasElementais, buracosNegros,
        chuvasFlechaNova, canticosCelestiais, gasesVeneno, caixasFerramentas,
        chuvasCometas, orbeConstelacoes, redesSniper,
        summonerFendas, summonerCrateras, summonerImpactosAtrasados, summonerMiniFissuras
    ];
    colecoes.forEach(function (lista) {
        if (!Array.isArray(lista)) return;
        lista.forEach(function (ent) {
            if (!ent || ent.mapaId) return;
            const ownerId = ent.ownerId || ent.autorId || ent.playerId || ent.pid;
            if (ownerId && players[ownerId]) aplicarContextoCombate(ent, contextoCombateDoJogador(ownerId));
        });
    });

    // Projéteis/zonas ligados a jogador herdam a instância do dono.
    const listas = [playerProjeteis, dropsChao, gasesVeneno, florimSementes, florimArvores, florimEspinhos, florimParedes, summonerFendas, summonerCrateras, summonerImpactosAtrasados, summonerMiniFissuras];
    listas.forEach(function (lista) {
        if (!Array.isArray(lista)) return;
        lista.forEach(function (ent) {
            if (!ent || ent.instanciaId) return;
            if (ent.ownerId && players[ent.ownerId]) {
                ent.instanciaId = players[ent.ownerId].instanciaId || null;
                if (ent.solari) ent.solariInstanceId = players[ent.ownerId].instanciaId || null;
            }
            else if (ent.autorId && players[ent.autorId]) ent.instanciaId = players[ent.autorId].instanciaId || null;
        });
    });
    projeteis.forEach(function (ent) {
        if (!ent || ent.instanciaId) return;
        if (ent.ownerMonstro) {
            const dono = slimes.find(function (s) { return s && s.id === ent.ownerMonstro; }) || bosses.find(function (b) { return b && b.id === ent.ownerMonstro; });
            if (dono) ent.instanciaId = dono.instanciaId || null;
        } else if (ent.ownerId && players[ent.ownerId]) {
            ent.instanciaId = players[ent.ownerId].instanciaId || null;
        }
    });
    Object.keys(lacaios).forEach(function (pid) {
        if (lacaios[pid] && players[pid]) lacaios[pid].instanciaId = players[pid].instanciaId || null;
    });
    Object.values(petsAtivos).forEach(function (pet) {
        if (pet && players[pet.owner_id]) pet.instanciaId = players[pet.owner_id].instanciaId || null;
    });
    Object.keys(bandas).forEach(function (pid) {
        if (bandas[pid] && players[pid]) bandas[pid].instanciaId = players[pid].instanciaId || null;
    });
}

function instanciaCompativel(a, b) {
    if (!a || !b) return false;
    const ca = contextoCombateDaEntidade(a);
    const cb = contextoCombateDaEntidade(b);
    if (ca && cb) {
        if (ca.mapaId !== cb.mapaId) return false;
        if (ca.instanciaId || cb.instanciaId) return !!ca.instanciaId && !!cb.instanciaId && ca.instanciaId === cb.instanciaId;
        return true;
    }
    const mapaA = mapaPorCoordenada(a.x);
    const mapaB = mapaPorCoordenada(b.x);
    if (mapaA !== mapaB) return false;
    if (a.solari || b.solari) return !!a.instanciaId && !!b.instanciaId && a.instanciaId === b.instanciaId;
    if (!mapaEhInstanciado(mapaA)) return true;
    return !!a.instanciaId && a.instanciaId === b.instanciaId;
}

function jogadoresPodemTrocar(idA, idB) {
    const a = players[idA], b = players[idB];
    if (!a || !b || a.hp <= 0 || b.hp <= 0 || idA === idB) return false;
    if (mapaPorCoordenada(a.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(b.x + PLAYER_OFFSET_X)) return false;
    if (!instanciaCompativel(a, b)) return false;
    return Math.hypot((a.x + PLAYER_OFFSET_X) - (b.x + PLAYER_OFFSET_X), (a.y + PLAYER_OFFSET_Y) - (b.y + PLAYER_OFFSET_Y)) <= 150;
}

function entidadeNoMapa(entidade, mapa, instanciaId) {
    if (!entidade) return false;
    // Entidades da Arena de Solari são uma instância isolada. Isso inclui
    // monstros e projéteis marcados pelo servidor, que nunca aparecem na Arena normal.
    if (entidade.solari === true) return mapa === 'solari' && (!instanciaId || (entidade.solariInstanceId || entidade.instanciaId) === instanciaId);
    const mp = mapaPorCoordenada(entidade.x);
    // Cliente da Solari enxerga tudo que está na faixa da arena (x [63800,65040)).
    if (mapa === 'solari') return mp === 'solari' && (!instanciaId || entidade.instanciaId === instanciaId);
    if (mp !== mapa) return false;
    if (mapaEhInstanciado(mapa) && instanciaId) return entidade.instanciaId === instanciaId;
    return true;
}

function filtrarPorMapa(lista, mapa, instanciaId) {
    return Array.isArray(lista) ? lista.filter(function (item) { return entidadeNoMapa(item, mapa, instanciaId); }) : [];
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
    if (destino === 'ruinas_01') return (mapaAtual === 'cidade' && perto(60474, 640)) || (mapaAtual === 'bemvindo' && perto(86780, 950));
    if (!PONTOS_TELEPORTE[destino] &&
        (destino === 'pantano' || destino === 'caverna' || destino === 'cidadeperdida' ||
            destino === 'testevisual' || destino === 'zonazero' || destino === 'castelo' ||
            destino === 'floresta' || destino === 'nebulos' || destino === 'abissal' ||
            destino === 'pantano_sombrio' || destino === 'tileteste' || destino === 'mundo')) {
        return mapaAtual === 'cidade' && perto(60474, 640);
    }
    if (destino === 'cidade' || destino === 'santuario' || destino === 'mundo') return true; // Retorno livre ao centro/cidade
    if (PONTOS_TELEPORTE[destino]) return true; // Viagem para os biomas pelo mapa mundial
    return false;
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

function monstroPertenceABiomaDoMundo(monstro) {
    if (!monstro || !monstro.bioma || !mapaMundo || typeof mapaMundo.isMundo !== 'function') return false;
    garantirOrigemInimigo(monstro);
    return mapaMundo.isMundo(monstro.origemX, monstro.origemY) &&
        mapaMundo.biomaNome(monstro.origemX, monstro.origemY) === monstro.bioma;
}

function resetarMonstroNoBiomaNatal(monstro) {
    garantirOrigemInimigo(monstro);
    monstro.x = monstro.origemX;
    monstro.y = monstro.origemY;
    if (Number.isFinite(monstro.maxHp) && monstro.maxHp > 0) monstro.hp = monstro.maxHp;
    monstro.targetId = null;
    monstro.aiForcedTargetId = null;
    monstro.aiForcedTargetAte = 0;
    monstro.tabelaDano = {};
    monstro.efeitos = [];
    monstro.buffsMonstros = [];
    monstro.venenoCastAte = 0;
    monstro.venenoAlvoX = null;
    monstro.venenoAlvoY = null;
    monstro.attackCooldown = 0;
    monstro.ataqueTelegraph = null;
    monstro.stunTimer = 0;
    monstro.slowTimer = 0;
    monstro.skillCharging = false;
    monstro.skillChargeTimer = 0;
    monstro.skillAim = null;
    monstro.aiAtacandoAte = 0;
    monstro.aiEstado = monstro.aiDormindo ? 'sleep' : 'idle';
    monstro.aiEstadoTimer = 0;
    monstro.aiPatrolX = monstro.origemX;
    monstro.aiPatrolY = monstro.origemY;
    monstro.aiProximoPatrulha = 0;
    monstro.aiBloqueadoTicks = 0;
    monstro.retornandoAoLar = false;
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
    if (!moverMonstroComDesvio(inimigo, inimigo.origemX, inimigo.origemY, velocidade)) {
        inimigo.retornandoAoLar = false;
        inimigo.patrolTimer = 0;
    }
    return true;
}

function entidadeEhSolari(entidade) {
    if (!entidade) return false;
    if (entidade.solari === true) return true;
    if (entidade.id && solariEmSessao(entidade.id)) return true;
    return false;
}

function podeEntidadeAtacarAlvo(entidade, alvo, alcance) {
    if (!entidade || !alvo || alvo.hp <= 0) return false;
    // Solari é uma instância lógica separada da Arena física. Um monstro Solari
    // nunca pode adquirir/atingir um jogador da Arena normal e vice-versa.
    if (entidadeEhSolari(entidade) !== entidadeEhSolari(alvo)) return false;
    // LADINO invisível (Camuflagem Sombria): inimigos não o enxergam —
    // não miram nele (agro) nem acertam ataques normais/projéteis.
    if (efeitos && efeitos.temEfeito(alvo, 'invisivel')) return false;
    if (entidadeEhSolari(entidade)) {
        if (!entidade.id || !entidade.solari) return false;
        if (alvo.id && !solariEmSessao(alvo.id)) return false;
    }
    if (!instanciaCompativel(entidade, alvo)) return false;
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
    if (efeitos && efeitos.temEfeito(entidade, 'cegueira')) {
        entidade.ataqueTelegraph = null;
        return false;
    }
    return true;
}

const MONSTER_MOVEMENT_SPEED_MULTIPLIER = 1.25;
const MONSTER_ATTACK_WARNING_MS = 300;
const MONSTER_ATTACK_WARNING_HALF_ANGLE = Math.PI / 5;

function velocidadeMovimentoMonstro(velocidade) {
    const valor = Number(velocidade);
    return Number.isFinite(valor) ? Math.max(0, valor) * MONSTER_MOVEMENT_SPEED_MULTIPLIER : 0;
}

function enviarAvisoAtaqueMonstro(monstro, aviso) {
    const mapa = mapaPorCoordenada(monstro.x);
    const dados = {
        id: monstro.id,
        x: monstro.x,
        y: monstro.y,
        angle: aviso.angle,
        range: aviso.range,
        halfAngle: MONSTER_ATTACK_WARNING_HALF_ANGLE,
        attackKind: aviso.attackKind,
        duration: MONSTER_ATTACK_WARNING_MS,
        mapa: mapa,
        instanciaId: monstro.instanciaId || monstro.solariInstanceId || null,
        solari: !!monstro.solari
    };
    if (monstro.solari) {
        solariBroadcastParaEntidade(monstro, 'monster_attack_telegraph', dados);
        return;
    }
    const mensagem = JSON.stringify(Object.assign({ type: 'monster_attack_telegraph' }, dados));
    wss.clients.forEach(function (client) {
        if (client.readyState !== WebSocket.OPEN) return;
        const jogador = client._playerId ? players[client._playerId] : null;
        if (jogador && entidadeNoMapa(jogador, mapa, monstro.instanciaId || null)) client.send(mensagem);
    });
}

function prepararAtaqueMonstroComAviso(monstro, alvo, alcance, attackKind) {
    if (!monstro || !alvo || !Number.isFinite(alcance) || alcance <= 0) {
        if (monstro) monstro.ataqueTelegraph = null;
        return { status: 'cancelled' };
    }
    const alvoKey = monstro.tauntTimer > 0 && monstro.tauntId && lacaios[monstro.tauntId] === alvo
        ? 'pet:' + monstro.tauntId
        : 'player:' + String(monstro.targetId || alvo.id || '');
    const pendente = monstro.ataqueTelegraph;
    if (pendente && pendente.targetKey !== alvoKey) monstro.ataqueTelegraph = null;
    if (monstro.ataqueTelegraph) {
        const aviso = monstro.ataqueTelegraph;
        if (Date.now() < aviso.expiresAt) return { status: 'pending' };
        monstro.ataqueTelegraph = null;
        const offsetX = players[monstro.targetId] === alvo ? PLAYER_OFFSET_X : 0;
        const offsetY = players[monstro.targetId] === alvo ? PLAYER_OFFSET_Y : 0;
        const dx = alvo.x + offsetX - monstro.x;
        const dy = alvo.y + offsetY - monstro.y;
        const distancia = Math.hypot(dx, dy);
        const anguloAlvo = Math.atan2(dy, dx);
        const diferencaAngulo = Math.atan2(Math.sin(anguloAlvo - aviso.angle), Math.cos(anguloAlvo - aviso.angle));
        if (alvo.hp <= 0 || distancia > aviso.range || Math.abs(diferencaAngulo) > aviso.halfAngle) {
            return { status: 'missed' };
        }
        return { status: 'ready', angle: aviso.angle };
    }

    const offsetX = players[monstro.targetId] === alvo ? PLAYER_OFFSET_X : 0;
    const offsetY = players[monstro.targetId] === alvo ? PLAYER_OFFSET_Y : 0;
    const angle = Math.atan2(alvo.y + offsetY - monstro.y, alvo.x + offsetX - monstro.x);
    const aviso = {
        targetKey: alvoKey,
        angle: angle,
        range: alcance,
        halfAngle: MONSTER_ATTACK_WARNING_HALF_ANGLE,
        attackKind: attackKind === 'ranged' ? 'ranged' : 'melee',
        expiresAt: Date.now() + MONSTER_ATTACK_WARNING_MS
    };
    monstro.ataqueTelegraph = aviso;
    monstro.attackCooldown = 0;
    enviarAvisoAtaqueMonstro(monstro, aviso);
    return { status: 'pending' };
}

// Atualização e expiração de todos os debuffs de monstros e bosses (tick a tick)
function atualizarDebuffsEntidade(ent, agora) {
    if (!ent) return;
    if (ent.imuneControle) {
        ent.stunTimer = 0;
        ent.slowTimer = 0;
        ent.lentidaoTimer = 0;
        ent.lentidao = 1.0;
        ent.presoTimer = 0;
        ent.isPreso = 0;
        if (Array.isArray(ent.efeitos)) {
            ent.efeitos = ent.efeitos.filter(ef => !['stun', 'lentidao', 'paralisia', 'sono', 'gelo'].includes(ef.id));
        }
    }

    // 1. Slow / Lentidão
    if (ent.slowTimer > 0 && !ent.imuneControle) {
        ent.slowTimer--;
    }
    if (ent.lentidaoTimer > 0) {
        ent.lentidaoTimer--;
        if (ent.lentidaoTimer <= 0) {
            ent.lentidao = 1.0;
        }
    } else {
        ent.lentidao = 1.0;
    }

    // 2. Preso / Enraizado
    if (ent.isPreso) {
        if (agora >= ent.isPreso) {
            ent.isPreso = 0;
            ent.presoTimer = 0;
        } else {
            ent.presoTimer = Math.max(0, Math.ceil((ent.isPreso - agora) / 50));
        }
    } else if (ent.presoTimer > 0) {
        ent.presoTimer--;
    }

    // 3. Fratura Exposta / Redução de Defesa
    if (ent.fraturaExpostaExpires) {
        if (agora >= ent.fraturaExpostaExpires) {
            ent.fraturaExpostaExpires = 0;
            ent.reducaoDefTimer = 0;
        } else {
            ent.reducaoDefTimer = Math.max(0, Math.ceil((ent.fraturaExpostaExpires - agora) / 50));
        }
    } else if (ent.reducaoDefTimer > 0) {
        ent.reducaoDefTimer--;
    }

    // 4. Fratura Defensiva (Esmagamento 3B: +12% dano)
    if (ent.fraturaDefensivaExpires && agora >= ent.fraturaDefensivaExpires) {
        ent.fraturaDefensivaExpires = 0;
    }

    // 5. Marca da Presa (Salto 1A: +15% dano)
    if (ent.marcaPresaExpires && agora >= ent.marcaPresaExpires) {
        ent.marcaPresaExpires = 0;
        ent.marcaPresaOwner = null;
    }

    // 6. Queimadura
    if (ent.queimaduraExpires && agora >= ent.queimaduraExpires) {
        ent.queimaduraExpires = 0;
    }

    // 7. Redução de Ataque
    if (ent.reducaoAtkTimer > 0) {
        ent.reducaoAtkTimer--;
    }
}

function limitesMapaJogador(cx, cy) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    if (cx < 0 || cy < 0) return null;
    if (cx >= LARGURA_MUNDO && cx < FIM_MUNDO) return { minX: LARGURA_MUNDO, maxX: FIM_MUNDO, maxY: ALTO_MUNDO };

    if (cx < LARGURA_VERDE) return { minX: 0, maxX: LARGURA_VERDE, maxY: ALTO_VERDE };
    if (cx < LARGURA_DESERTO) return { minX: LARGURA_VERDE, maxX: LARGURA_DESERTO, maxY: ALTO_DESERTO };
    if (cx < LARGURA_PANTANO) return { minX: LARGURA_DESERTO, maxX: LARGURA_PANTANO, maxY: ALTO_PANTANO };
    if (cx < FIM_CAVERNA) return { minX: LARGURA_CAVERNA, maxX: FIM_CAVERNA, maxY: ALTO_CAVERNA };
    if (cx < FIM_CIDADE) return { minX: LARGURA_CIDADE, maxX: FIM_CIDADE, maxY: ALTO_CIDADE };
    if (cx >= LARGURA_SOLARI && cx < FIM_SOLARI) return { minX: LARGURA_SOLARI, maxX: FIM_SOLARI, maxY: ALTO_SOLARI };
    if (cx >= LARGURA_CIDADE_PERDIDA && cx < FIM_CIDADE_PERDIDA) return { minX: LARGURA_CIDADE_PERDIDA, maxX: FIM_CIDADE_PERDIDA, maxY: ALTO_CIDADE_PERDIDA };
    if (cx >= LARGURA_TESTE_VISUAL && cx < FIM_TESTE_VISUAL) return { minX: LARGURA_TESTE_VISUAL, maxX: FIM_TESTE_VISUAL, maxY: ALTO_TESTE_VISUAL };
    if (cx >= LARGURA_ZONA_ZERO && cx < FIM_ZONA_ZERO) return { minX: LARGURA_ZONA_ZERO, maxX: FIM_ZONA_ZERO, maxY: ALTO_ZONA_ZERO };
    if (cx >= LARGURA_CASTELO && cx < FIM_CASTELO) return { minX: LARGURA_CASTELO, maxX: FIM_CASTELO, maxY: ALTO_CASTELO };
    if (cx >= LARGURA_BEMVINDO && cx < FIM_BEMVINDO) return { minX: LARGURA_BEMVINDO, maxX: FIM_BEMVINDO, maxY: ALTO_BEMVINDO };
    if (cx >= RUINAS_01_X0 && cx < RUINAS_01_X1) return { minX: RUINAS_01_X0, maxX: RUINAS_01_X1, maxY: ALTO_RUINAS_01 };
    if (cx >= LARGURA_FLORESTA && cx < FIM_FLORESTA) return { minX: LARGURA_FLORESTA, maxX: FIM_FLORESTA, maxY: ALTO_FLORESTA };
    if (cx >= LARGURA_NEBOLOS && cx < FIM_NEBOLOS) return { minX: LARGURA_NEBOLOS, maxX: FIM_NEBOLOS, maxY: ALTO_NEBOLOS };
    if (cx >= LARGURA_ABISSAL && cx < FIM_ABISSAL) return { minX: LARGURA_ABISSAL, maxX: FIM_ABISSAL, maxY: ALTO_ABISSAL };
    if (cx >= LARGURA_PANTANO_SOMBRIO && cx < FIM_PANTANO_SOMBRIO) return { minX: LARGURA_PANTANO_SOMBRIO, maxX: FIM_PANTANO_SOMBRIO, maxY: ALTO_PANTANO_SOMBRIO };
    if (cx >= LARGURA_TILETESTE && cx < FIM_TILETESTE) return { minX: LARGURA_TILETESTE, maxX: FIM_TILETESTE, maxY: ALTO_TILETESTE };
    if (cx >= LARGURA_MUNDO && cx < FIM_MUNDO) return { minX: LARGURA_MUNDO, maxX: FIM_MUNDO, maxY: ALTO_MUNDO };
    return null;
}

function colideMapaJogador(cx, cy) {
    if (cx >= LARGURA_MUNDO && cx < FIM_MUNDO) {
        if (mapaMundo && mapaMundo.colideMundo(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('mundo', cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        return colideObstaculosCustomizados('mundo', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx < LARGURA_VERDE) {
        if (mapaVerde && mapaVerde.colideVerde(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        return colideObstaculosCustomizados('green', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx < LARGURA_DESERTO) {
        if (mapaDeserto && mapaDeserto.colideDeserto(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('desert', cx, cy)) return true;
        return colideObstaculosCustomizados('desert', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx < LARGURA_PANTANO) {
        if (mapaPantano && mapaPantano.colidePantano(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('pantano', cx, cy)) return true;
        return colideObstaculosCustomizados('pantano', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx < FIM_CAVERNA) {
        if (mapaCaverna && mapaCaverna.colideCaverna(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('caverna', cx, cy)) return true;
        return colideObstaculosCustomizados('caverna', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx < FIM_CIDADE) {
        if (mapaCidade && mapaCidade.colideCidade(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('cidade', cx, cy)) return true;
        return colideObstaculosCustomizados('cidade', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_SOLARI && cx < FIM_SOLARI) {
        if (mapaSolari && mapaSolari.colideSolari(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('solari', cx, cy)) return true;
        return colideObstaculosCustomizados('solari', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_CIDADE_PERDIDA && cx < FIM_CIDADE_PERDIDA) {
        if (mapaCidadePerdida && mapaCidadePerdida.colideCidadePerdida(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('cidadeperdida', cx, cy)) return true;
        return colideObstaculosCustomizados('cidadeperdida', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_TESTE_VISUAL && cx < FIM_TESTE_VISUAL) {
        if (mapaTesteVisual && mapaTesteVisual.colide(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        return colideObstaculosCustomizados('testevisual', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_ZONA_ZERO && cx < FIM_ZONA_ZERO) {
        if (mapaZonaZero && mapaZonaZero.colideZonaZero(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('zonazero', cx, cy)) return true;
        return colideObstaculosCustomizados('zonazero', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_CASTELO && cx < FIM_CASTELO) {
        if (mapaCastelo && mapaCastelo.colideCastelo(cx, cy)) return true;
        if (colisaoObjetosDoMapa('castelo', cx, cy)) return true;
        return colideObstaculosCustomizados('castelo', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_BEMVINDO && cx < FIM_BEMVINDO) {
        // BemVindo não possui colisões fixas no mapa. Somente colisões
        // criadas pelo sistema Admin/editor são consideradas aqui.
        return colideObstaculosCustomizados('bemvindo', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= RUINAS_01_X0 && cx < RUINAS_01_X1) {
        // Ruínas de Âmbar começa sem colisões fixas; o Editor Admin pode
        // acrescentar obstáculos persistentes por ID de mapa.
        return colideObstaculosCustomizados('ruinas_01', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_FLORESTA && cx < FIM_FLORESTA) {
        if (mapaFloresta && mapaFloresta.colideFloresta(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('floresta', cx, cy)) return true;
        return colideObstaculosCustomizados('floresta', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_NEBOLOS && cx < FIM_NEBOLOS) {
        if (mapaNebulos && mapaNebulos.colideNebulos(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('nebulos', cx, cy)) return true;
        return colideObstaculosCustomizados('nebulos', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_ABISSAL && cx < FIM_ABISSAL) {
        if (mapaAbissal && mapaAbissal.colideAbissal(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('abissal', cx, cy)) return true;
        return colideObstaculosCustomizados('abissal', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_PANTANO_SOMBRIO && cx < FIM_PANTANO_SOMBRIO) {
        if (mapaPantanoSombrio && mapaPantanoSombrio.colidePantanoSombrio(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('pantano_sombrio', cx, cy)) return true;
        return colideObstaculosCustomizados('pantano_sombrio', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_TILETESTE && cx < FIM_TILETESTE) {
        if (mapaTileTeste && mapaTileTeste.colideTileTeste(cx, cy, PLAYER_COLLISION_RADIUS)) return true;
        if (colisaoObjetosDoMapa('tileteste', cx, cy)) return true;
        return colideObstaculosCustomizados('tileteste', cx, cy, PLAYER_COLLISION_RADIUS);
    }
    if (cx >= LARGURA_MUNDO && cx < FIM_MUNDO) {
        return !!(mapaMundo && mapaMundo.colideMundo(cx, cy, PLAYER_COLLISION_RADIUS));
    }
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

function velocidadeMaximaMovimentoJogador(player) {
    if (!player) return 216;
    const agilidade = Math.max(1, Math.min(100, getAtr(player, 'agilidade') || 1));
    let mult = 1 + (agilidade - 1) * 0.03;
    if (player.classe === 'barbaro' && player.furiaTimer > 0) mult *= 1.3;
    if (efeitos && efeitos.temEfeito(player, 'lentidao')) mult *= 0.5;
    if (efeitos && efeitos.temEfeito(player, 'deserto_lentidao')) {
        const slow = efeitos.pegarEfeito(player, 'deserto_lentidao');
        mult *= 1 - Math.min(0.9, Math.max(0, Number(slow && slow.intensidade) || 0.3));
    }
    if (efeitos && efeitos.temEfeito(player, 'velocidade')) {
        const haste = efeitos.pegarEfeito(player, 'velocidade');
        mult *= 1 + Math.min(1, Math.max(0, Number(haste && haste.intensidade) || 0.5));
    }
    if (player.dashVelocidadeAte > Date.now()) {
        mult *= Math.max(1, Math.min(3, Number(player.dashVelocidadeMult) || 1));
    }
    if (player.classe === 'mago' && player.formaIgneaAte > Date.now()) mult *= 2;
    // Client uses at most √2 diagonal speed; extra margin covers frame clamping,
    // water/terrain differences and small serialization/rounding drift.
    return Math.max(216, Math.min(1800, 3.6 * 60 * mult * Math.SQRT2 * 1.15));
}

function limitarMovimentoRecebido(player, targetX, targetY, agora) {
    const velocidade = velocidadeMaximaMovimentoJogador(player);
    if (!Number.isFinite(player.movimentoBudget) || !Number.isFinite(player.movimentoBudgetAt)) {
        player.movimentoBudget = velocidade * 0.05;
        player.movimentoBudgetAt = agora;
    } else {
        const dt = Math.max(0, Math.min(0.12, (agora - player.movimentoBudgetAt) / 1000));
        player.movimentoBudget = Math.min(velocidade * 0.12, player.movimentoBudget + velocidade * dt);
        player.movimentoBudgetAt = agora;
    }
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distancia = Math.hypot(dx, dy);
    const permitido = Math.min(player.movimentoBudget, velocidade * 0.12);
    if (distancia <= permitido || distancia === 0) {
        return { x: targetX, y: targetY, permitido, distancia };
    }
    const fator = permitido / distancia;
    return { x: player.x + dx * fator, y: player.y + dy * fator, permitido, distancia: permitido };
}

function validarDestinoJogador(targetX, targetY, mapaOrigem) {
    if (!posicaoJogadorValida(targetX, targetY)) {
        return { aceito: false, bloqueado: true, x: targetX, y: targetY };
    }
    // FIX v1.34.2 (tela verde na Arena/Solari): skills de reposicionamento NÃO
    // podem cruzar a fronteira do mapa atual. Antes da Cidade Perdida existir o
    // mundo terminava em 65040 (= borda leste da Arena), então mirar a leste era
    // destino inválido e o jogador era barrado. Agora x ∈ [65040,71920) pertence
    // à Cidade Perdida (fundo verde) e o destino virava uma "fuga" para outro mapa.
    if (mapaOrigem) {
        const mapaDestino = mapaPorCoordenada(targetX + PLAYER_OFFSET_X);
        if (mapaDestino !== mapaOrigem) {
            return { aceito: false, bloqueado: true, x: targetX, y: targetY };
        }
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

const SANTUARIO_SLIME_BIOMA = 'Planície das Plantas (Santuário)';
const SANTUARIO_SLIME_CENTRO = { x: 144000, y: 14018 };
const SANTUARIO_SLIME_ELITE_CENTRO = { x: 145300, y: 14018 };
const SANTUARIO_SLIME_GRUPOS = [
    { x: 142950, y: 13000 }, { x: 145050, y: 13000 },
    { x: 142950, y: 15035 }, { x: 145050, y: 15035 }
];

function slimeEmBiomaValido(x, y) {
    return entidadeEmBiomaValido({ bioma: SANTUARIO_SLIME_BIOMA }, x, y);
}

function entidadeEmBiomaValido(monstro, x, y) {
    if (monstro.bioma) {
        return !!mapaMundo &&
            x >= LARGURA_MUNDO && x < FIM_MUNDO &&
            y >= 0 && y < ALTO_MUNDO &&
            mapaMundo.biomaNome(x, y) === monstro.bioma &&
            podeAndar(x, y, monstro);
    }
    return podeAndar(x, y, monstro);
}

function gerarPosicaoSantuarioSlime(origem, raio) {
    for (let tentativa = 0; tentativa < 100; tentativa++) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.sqrt(Math.random()) * raio;
        const x = origem.x + Math.cos(angulo) * distancia;
        const y = origem.y + Math.sin(angulo) * distancia;
        if (slimeEmBiomaValido(x, y)) return { x, y };
    }
    return null;
}

function gerarPosicaoNaturalBioma(bioma, origem, raio) {
    if (!mapaMundo || !bioma) return null;
    for (let tentativa = 0; tentativa < 180; tentativa++) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.sqrt(Math.random()) * (raio || 700);
        const x = origem.x + Math.cos(angulo) * distancia;
        const y = origem.y + Math.sin(angulo) * distancia;
        if (entidadeEmBiomaValido({ bioma: bioma, raioColisao: MONSTER_COLLISION_RADIUS }, x, y)) {
            return { x: Math.round(x), y: Math.round(y) };
        }
    }
    return null;
}

function criarSlimeNatural(x, y, grupoId, tipo) {
    tipo = tipo || 'slime';
    const conf = spawnsAdmin.getMonstroConfig(tipo);
    const ehElite = Array.isArray(conf.tags) && conf.tags.indexOf('elite') !== -1;
    const hp = calcularHpElite(conf.baseHp, ehElite);
    const agora = Date.now();
    const hora = sistemaDiaNoite ? sistemaDiaNoite.calcularTempoMundo(agora).horaDecimal : 12;
    const dormindo = hora < 6 || hora >= 23;
    return {
        id: tipo + '_natural_' + Math.random().toString(36).slice(2, 12),
        tipo: tipo,
        nome: conf.nome,
        asset: spawnsAdmin.TIPOS_MONSTROS[tipo].asset,
        nivel: conf.nivel || 1,
        tags: conf.tags.slice(),
        elite: ehElite,
        aiManaged: true,
        bioma: conf.bioma || SANTUARIO_SLIME_BIOMA,
        raioColisao: spawnsAdmin.TIPOS_MONSTROS[tipo].radius || MONSTER_COLLISION_RADIUS,
        x: x,
        y: y,
        hp: hp,
        maxHp: hp,
        baseHp: Math.max(10, Math.floor(conf.baseHp)),
        dano: conf.dano,
        xpBase: conf.xpBase,
        aggroRange: conf.aggroRange,
        attackRange: conf.attackRange,
        velocidade: conf.velocidade,
        cadenciaAtk: conf.cadenciaAtk,
        velProjetil: conf.velProjetil || 9,
        petAttackSkill: conf.petAttackSkill ? Object.assign({}, conf.petAttackSkill) : null,
        ehMelee: conf.ehMelee !== false,
        escala: conf.escala || 1,
        defesa: conf.defesa || 0,
        block: conf.block || 0,
        imuneDebuffs: conf.imuneDebuffs || [],
        debuffsAplicados: conf.debuffsAplicados || [],
        buffsAplicados: conf.buffsAplicados || [],
        drops: conf.drops || [],
        targetId: null,
        tabelaDano: {},
        attackCooldown: 0,
        stunTimer: 0,
        slowTimer: 0,
        flagPassivo: false,
        flagAgressivo: true,
        spawnNatural: true,
        spawnGrupoId: grupoId || null,
        origemX: x,
        origemY: y,
        aiEstado: dormindo ? 'sleep' : 'idle',
        aiDormindo: dormindo,
        aiEstadoTimer: 0,
        aiPatrolX: x,
        aiPatrolY: y,
        aiProximoPatrulha: agora + 1000 + Math.random() * 3000,
        aiUltimoMovimento: agora,
        aiUltimoDodge: 0,
        aiIsNight: false,
        criadoEm: agora
    };
}

function gerarPosicaoNaturalDeserto(origem, raio) {
    if (!mapaMundo || typeof mapaMundo.ehDeserto !== 'function') return null;
    const centro = origem || mapaMundo.CENTROS_BIOMAS.deserto;
    for (let tentativa = 0; tentativa < 160; tentativa++) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.sqrt(Math.random()) * (raio || 9000);
        const x = centro.x + Math.cos(angulo) * distancia;
        const y = centro.y + Math.sin(angulo) * distancia;
        if (mapaMundo.ehDeserto(x, y) &&
            !mapaMundo.colideMundo(x, y, MONSTER_COLLISION_RADIUS)) {
            return { x: Math.round(x), y: Math.round(y) };
        }
    }
    return null;
}

function gerarPosicaoNaturalSelva(origem, raio) {
    const centro = origem || mapaMundo.CENTROS_BIOMAS.selva;
    return gerarPosicaoNaturalBioma('Selva Proibida', centro, raio || 9000);
}

function inicializarSpawnsNaturaisSlime() {
    if (!spawnsAdmin || !mapaMundo) return;
    let distribuidos = 0;
    for (let i = 0; i < 24; i++) {
        const pos = gerarPosicaoSantuarioSlime(SANTUARIO_SLIME_CENTRO, 2900);
        if (!pos) break;
        slimes.push(criarSlimeNatural(pos.x, pos.y, null));
        distribuidos++;
    }
    let emGrupos = 0;
    SANTUARIO_SLIME_GRUPOS.forEach(function (centro, indice) {
        const quantidade = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < quantidade; i++) {
            const pos = gerarPosicaoSantuarioSlime(centro, 130);
            if (!pos) continue;
            slimes.push(criarSlimeNatural(pos.x, pos.y, 'santuario_' + indice));
            emGrupos++;
        }
    });
    const elitePos = gerarPosicaoSantuarioSlime(SANTUARIO_SLIME_ELITE_CENTRO, 160);
    if (elitePos) slimes.push(criarSlimeNatural(elitePos.x, elitePos.y, null, 'slime_elite'));
    console.log('Slimes naturais do Santuário: ' + distribuidos + ' distribuídos, ' + emGrupos + ' em grupos, elite ' + (elitePos ? 'posicionado' : 'sem posição livre') + '.');
}

function inicializarSpawnsNaturaisDeserto() {
    if (!spawnsAdmin || !mapaMundo) return;
    const centro = mapaMundo.CENTROS_BIOMAS.deserto;
    const distribuicao = [
        ['besouro_dourado', 10],
        ['escorpiao_escaldante', 8],
        ['formiga_sauva', 12],
        ['besouro_negro_deserto', 1]
    ];
    let total = 0;
    distribuicao.forEach(function (entrada) {
        for (let i = 0; i < entrada[1]; i++) {
            const pos = gerarPosicaoNaturalDeserto(centro, 9500);
            if (!pos) continue;
            slimes.push(criarSlimeNatural(pos.x, pos.y, null, entrada[0]));
            total++;
        }
    });
    console.log('Monstros naturais do Deserto Escaldante posicionados: ' + total + '.');
}

function inicializarSpawnsNaturaisSelva() {
    if (!spawnsAdmin || !mapaMundo || !mapaMundo.CENTROS_BIOMAS.selva) return;
    const centro = mapaMundo.CENTROS_BIOMAS.selva;
    const distribuicao = [
        ['cogumelo_proibido', 8],
        ['anaconda_selvagem', 10],
        ['jararaca', 10],
        ['louvadermi', 8]
    ];
    let total = 0;
    distribuicao.forEach(function (entrada) {
        for (let i = 0; i < entrada[1]; i++) {
            const pos = gerarPosicaoNaturalSelva(centro, 9000);
            if (!pos) continue;
            slimes.push(criarSlimeNatural(pos.x, pos.y, null, entrada[0]));
            total++;
        }
    });
    console.log('Monstros naturais da Selva Proibida posicionados: ' + total + '.');
}

function jogadorPodeSerAlvoDoSlime(pid, jogador, slime) {
    if (!jogador || !(jogador.hp > 0) ||
        mapaPorCoordenada(jogador.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(slime.x) ||
        !instanciaCompativel(jogador, slime) ||
        (efeitos && (efeitos.temEfeito(jogador, 'invisivel') || efeitos.temEfeito(jogador, 'camuflagem')))) return false;
    return !monstroPertenceABiomaDoMundo(slime) ||
        mapaMundo.biomaNome(jogador.x + PLAYER_OFFSET_X, jogador.y + PLAYER_OFFSET_Y) === slime.bioma;
}

function moverMonstroComDesvio(slime, destinoX, destinoY, velocidade) {
    const dx = destinoX - slime.x;
    const dy = destinoY - slime.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia < 1) return false;
    const angulo = Math.atan2(dy, dx);
    const passo = Math.min(velocidadeMovimentoMonstro(velocidade), distancia);
    if (monstroPertenceABiomaDoMundo(slime)) {
        const passoTeste = Math.max(12, passo);
        const destinoDiretoX = slime.x + Math.cos(angulo) * passoTeste;
        const destinoDiretoY = slime.y + Math.sin(angulo) * passoTeste;
        if (mapaMundo.biomaNome(destinoDiretoX, destinoDiretoY) !== slime.bioma) {
            resetarMonstroNoBiomaNatal(slime);
            return true;
        }
    }
    const podeIrDireto = function (direcao) {
        const testeX = slime.x + Math.cos(direcao) * passo;
        const testeY = slime.y + Math.sin(direcao) * passo;
        if (!entidadeEmBiomaValido(slime, testeX, testeY)) return false;
        slime.x = testeX;
        slime.y = testeY;
        slime.angulo = direcao;
        slime.aiDesvioColisaoLado = 0;
        slime.aiBloqueadoTicks = 0;
        slime.aiUltimoMovimento = Date.now();
        return true;
    };
    if (podeIrDireto(angulo)) return true;

    let lado = Number(slime.aiDesvioColisaoLado);
    if (lado !== -1 && lado !== 1) {
        const id = String(slime.id || slime.tipo || '');
        let soma = 0;
        for (let i = 0; i < id.length; i++) soma = (soma + id.charCodeAt(i)) | 0;
        lado = (soma & 1) ? 1 : -1;
    }
    const tangente = angulo + lado * Math.PI / 2;
    if (podeIrDireto(tangente)) {
        slime.aiDesvioColisaoLado = lado;
        return true;
    }
    if (podeIrDireto(angulo - lado * Math.PI / 2)) {
        slime.aiDesvioColisaoLado = -lado;
        return true;
    }
    const candidatos = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3,
        Math.PI / 2, -Math.PI / 2, Math.PI * 2 / 3, -Math.PI * 2 / 3, Math.PI];
    let melhor = null;
    let melhorDistancia = distancia;
    let melhorAlternativa = null;
    let melhorPontuacaoAlternativa = Infinity;
    for (let i = 0; i < candidatos.length; i++) {
        const direcao = angulo + candidatos[i];
        const testeX = slime.x + Math.cos(direcao) * passo;
        const testeY = slime.y + Math.sin(direcao) * passo;
        if (!entidadeEmBiomaValido(slime, testeX, testeY)) continue;
        const restante = Math.hypot(destinoX - testeX, destinoY - testeY);
        const pontuacao = restante + Math.abs(candidatos[i]) * 8;
        if (pontuacao < melhorPontuacaoAlternativa) {
            melhorPontuacaoAlternativa = pontuacao;
            melhorAlternativa = direcao;
        }
        if (restante < melhorDistancia) {
            melhorDistancia = restante;
            melhor = direcao;
        }
    }
    if (melhor === null) {
        melhor = melhorAlternativa;
        if (melhor === null) {
            slime.aiBloqueadoTicks = (slime.aiBloqueadoTicks || 0) + 1;
            return false;
        }
    }
    const novoX = slime.x + Math.cos(melhor) * passo;
    const novoY = slime.y + Math.sin(melhor) * passo;
    if (!entidadeEmBiomaValido(slime, novoX, novoY)) return false;
    slime.x = novoX;
    slime.y = novoY;
    slime.angulo = melhor;
    slime.aiBloqueadoTicks = 0;
    slime.aiUltimoMovimento = Date.now();
    return true;
}

function atualizarIAMonstro(slime, agora, horaDecimal) {
    if (!slime.targetId) slime.ataqueTelegraph = null;
    if (slime.hp > 0 && monstroPertenceABiomaDoMundo(slime) &&
        mapaMundo.biomaNome(slime.x, slime.y) !== slime.bioma) {
        resetarMonstroNoBiomaNatal(slime);
    }
    if (!slime.aiManaged) return false;
    const tags = Array.isArray(slime.tags) ? slime.tags : [];
    const noturno = tags.indexOf('noturno') !== -1;
    const dormePorHorario = noturno
        ? !(horaDecimal >= 0 && horaDecimal < 4)
        : !(horaDecimal >= 6 && horaDecimal < 23);
    if (!slime.aiInicializada) {
        slime.aiInicializada = true;
        if (dormePorHorario && !slime.targetId) {
            slime.aiDormindo = true;
            slime.aiEstado = 'sleep';
        }
    }
    if (slime.hp <= 0) {
        slime.ataqueTelegraph = null;
        if (!slime.spawnNatural) return false;
        slime.aiRespawnTimer = (slime.aiRespawnTimer || 0) + 1;
        if (slime.aiRespawnTimer < 2400) return true;
        const pos = slime.bioma === SANTUARIO_SLIME_BIOMA
            ? gerarPosicaoSantuarioSlime({ x: slime.origemX, y: slime.origemY }, slime.spawnGrupoId ? 220 : 700)
            : (slime.bioma === 'Deserto Escaldante'
                ? gerarPosicaoNaturalDeserto({ x: slime.origemX, y: slime.origemY }, slime.spawnGrupoId ? 220 : 9500)
                : (slime.bioma === 'Selva Proibida'
                    ? gerarPosicaoNaturalSelva({ x: slime.origemX, y: slime.origemY }, slime.spawnGrupoId ? 220 : 9000)
                    : null));
        if (!pos) return true;
        slime.x = pos.x;
        slime.y = pos.y;
        slime.hp = slime.maxHp;
        slime.captureConsumed = false;
        slime.aiRespawnTimer = 0;
        slime.targetId = null;
        slime.tabelaDano = {};
        slime.buffsMonstros = [];
        slime.venenoCastAte = 0;
        slime.venenoAlvoX = null;
        slime.venenoAlvoY = null;
        slime.aiDormindo = dormePorHorario;
        slime.aiEstado = slime.aiDormindo ? 'sleep' : 'idle';
        slime.aiEstadoTimer = 0;
        notificarSpawnElite(slime);
    }
    const noite = horaDecimal >= 23 || horaDecimal < 6;
    if (slime._velocidadeBase == null) slime._velocidadeBase = slime.velocidade || 1.4;
    slime.aiIsNight = noite;
    const buffsAtivos = obterBuffsMonstroAtivos(slime, agora);
    const multVelocidadeBuff = buffsAtivos.reduce(function (mult, buff) {
        return mult * (buff.velocidadeMult || 1);
    }, 1);
    const multVelocidadeBioma = slime.bioma === 'Deserto Escaldante' ? 1.5 : 1;
    slime.velocidade = slime._velocidadeBase * multVelocidadeBioma * (noite ? 3 : 1) * multVelocidadeBuff;
    if (slime.stunTimer > 0) {
        slime.stunTimer--;
        return true;
    }
    if (!slime.aiDormindo) {
        atualizarBuffAreaMonstro(slime, agora);
        if (slime.tipo === 'cogumelo_proibido') atualizarRotinaCogumelo(slime, agora);
    }

    if (slime.aiEstadoTimer > 0) {
        slime.aiEstadoTimer--;
        if (slime.aiEstadoTimer === 0) {
            if (slime.aiEstado === 'rest_enter') slime.aiEstado = 'sleep';
            else if (slime.aiEstado === 'rest_exit') slime.aiEstado = 'idle';
        }
    }
    const petProvocando = !slime.flagPassivo && slime.tauntTimer > 0 && slime.tauntId
        ? (lacaios[slime.tauntId] || petRuntimeDoId(slime.targetId))
        : petRuntimeDoId(slime.targetId);
    const alvoPetValido = petProvocando && petProvocando.hp > 0 &&
        players[petProvocando.owner_id] && players[petProvocando.owner_id].hp > 0 &&
        mapaPorCoordenada(petProvocando.x) === mapaPorCoordenada(slime.x) &&
        instanciaCompativel(slime, petProvocando);
    let alvoPet = !!alvoPetValido;
    let alvo = alvoPet ? petProvocando : (slime.targetId && players[slime.targetId]);
    if (alvoPet && !petProvocando.pet_instance_id) slime.targetId = slime.tauntId;
    if (alvo && !alvoPet && !jogadorPodeSerAlvoDoSlime(slime.targetId, alvo, slime)) {
        slime.targetId = null;
        alvo = null;
    }
    const alvoXAtual = alvo ? alvo.x + (alvoPet ? 0 : PLAYER_OFFSET_X) : 0;
    const alvoYAtual = alvo ? alvo.y + (alvoPet ? 0 : PLAYER_OFFSET_Y) : 0;
    if (alvo && Math.hypot(alvoXAtual - slime.x, alvoYAtual - slime.y) > 900) {
        slime.targetId = null;
        alvo = null;
        alvoPet = false;
    }
    let alvoForcado = alvoPet;
    if (!alvoPet && slime.aiForcedTargetAte > agora) {
        const curador = players[slime.aiForcedTargetId];
        if (jogadorPodeSerAlvoDoSlime(slime.aiForcedTargetId, curador, slime)) {
            slime.targetId = slime.aiForcedTargetId;
            alvo = curador;
            alvoForcado = true;
        } else {
            slime.aiForcedTargetAte = 0;
            slime.aiForcedTargetId = null;
        }
    }
    if (!alvoForcado && !slime.flagPassivo && (!dormePorHorario || !slime.aiDormindo)) {
        let jogadorMaisProximo = null;
        let idMaisProximo = null;
        let menorDistancia = slime.aggroRange || 320;
        const candidatos = [];
        for (const pid of Object.keys(players)) {
            const jogador = players[pid];
            if (!jogadorPodeSerAlvoDoSlime(pid, jogador, slime)) continue;
            const distancia = Math.hypot((jogador.x + PLAYER_OFFSET_X) - slime.x, (jogador.y + PLAYER_OFFSET_Y) - slime.y);
            if (distancia <= menorDistancia) candidatos.push({ pid: pid, jogador: jogador, distancia: distancia });
        }
        for (const pet of Object.values(petsAtivos)) {
            const owner = pet && players[pet.owner_id];
            if (!owner || owner.hp <= 0 || pet.hp <= 0 || pet.mode === 'PARADO' ||
                !podeEntidadeAtacarAlvo(slime, pet, slime.aggroRange || 320)) continue;
            const distancia = Math.hypot(pet.x - slime.x, pet.y - slime.y);
            if (distancia <= menorDistancia) {
                candidatos.push({ pid: pet.pet_instance_id, jogador: pet, distancia: distancia, pet: true });
            }
        }
        const elite = tags.indexOf('elite') !== -1 || tags.indexOf('boss') !== -1;
        const assassino = tags.indexOf('assassinos') !== -1;
        if (elite) {
            candidatos.sort(function (a, b) {
                const danoA = (slime.tabelaDano && slime.tabelaDano[a.pid]) || 0;
                const danoB = (slime.tabelaDano && slime.tabelaDano[b.pid]) || 0;
                const rangedA = /arqueiro|mago|curandeiro/i.test(a.jogador.classe || '') ? 1 : 0;
                const rangedB = /arqueiro|mago|curandeiro/i.test(b.jogador.classe || '') ? 1 : 0;
                return (danoB + rangedB * 1000) - (danoA + rangedA * 1000) || a.distancia - b.distancia;
            });
        } else if (assassino) {
            candidatos.sort(function (a, b) {
                const preferenciaA = /curandeiro|arqueiro|mago/i.test(a.jogador.classe || '') ? 0 : 1;
                const preferenciaB = /curandeiro|arqueiro|mago/i.test(b.jogador.classe || '') ? 0 : 1;
                return preferenciaA - preferenciaB || a.distancia - b.distancia;
            });
        } else {
            candidatos.sort(function (a, b) { return a.distancia - b.distancia; });
        }
        if (candidatos.length) {
            jogadorMaisProximo = candidatos[0].jogador;
            idMaisProximo = candidatos[0].pid;
            menorDistancia = candidatos[0].distancia;
        }
        if (jogadorMaisProximo) {
            slime.targetId = idMaisProximo;
            alvo = jogadorMaisProximo;
            alvoPet = !!candidatos[0].pet;
        }
    }
    if (alvo && slime.aiDormindo) {
        slime.aiDormindo = false;
        slime.aiEstado = 'rest_exit';
        slime.aiEstadoTimer = 12;
    }
    if (dormePorHorario && !alvo) {
        slime.targetId = null;
        slime.aiDormindo = true;
        if (slime.aiEstado !== 'sleep' && slime.aiEstado !== 'rest_enter') {
            slime.aiEstado = 'rest_enter';
            slime.aiEstadoTimer = 12;
        }
        slime.attackCooldown = Math.max(slime.attackCooldown || 0, 1);
        return true;
    }
    if (!dormePorHorario && slime.aiDormindo) {
        slime.aiDormindo = false;
        slime.aiEstado = 'rest_exit';
        slime.aiEstadoTimer = 12;
    }
    if (slime.aiEstado === 'rest_enter' || slime.aiEstado === 'rest_exit') return true;
    if (alvo) {
        const alvoX = alvo.x + (alvoPet ? 0 : PLAYER_OFFSET_X);
        const alvoY = alvo.y + (alvoPet ? 0 : PLAYER_OFFSET_Y);
        const dx = alvoX - slime.x;
        const dy = alvoY - slime.y;
        const distancia = Math.hypot(dx, dy);
        slime.angulo = Math.atan2(dy, dx);
        slime.aiEstado = 'combat';
        const melee = slime.ehMelee !== false;
        const alcanceAtaque = slime.attackRange || (melee ? 48 : 180);
        const distanciaPreferida = slime.distanciaPreferida || (melee ? alcanceAtaque : 200);
        if (!alvoPet && slime.tipo === 'escorpiao_escaldante') {
            atualizarCombateEscorpiao(slime, alvo, distancia, agora, noite, buffsAtivos);
            return true;
        }
        if (!alvoPet && slime.tipo === 'besouro_negro_deserto' &&
            distancia <= 240 && agora >= (slime.proximoDebuffAreaAte || 0)) {
            aplicarDebuffAreaBesouroNegro(slime, agora);
        }
        if (!alvoPet && !melee && slime.hp <= slime.maxHp * 0.5 && distancia < distanciaPreferida) {
            const fugaX = slime.x - (dx / Math.max(1, distancia)) * 120;
            const fugaY = slime.y - (dy / Math.max(1, distancia)) * 120;
            slime.aiEstado = moverMonstroComDesvio(slime, fugaX, fugaY, slime.velocidade || 1.4)
                ? 'kite' : 'blocked';
        } else if (!alvoPet && !melee && distancia < 260 && agora >= (slime.aiProximoDodge || 0)) {
            const lado = Math.random() < 0.5 ? -1 : 1;
            const dodgeX = slime.x + (-dy / Math.max(1, distancia)) * lado * 90;
            const dodgeY = slime.y + (dx / Math.max(1, distancia)) * lado * 90;
            moverMonstroComDesvio(slime, dodgeX, dodgeY, (slime.velocidade || 1.4) * 2);
            slime.aiProximoDodge = agora + 1400 + Math.random() * 900;
            slime.aiEstado = 'dodge';
        } else if (distancia <= alcanceAtaque || slime.ataqueTelegraph) {
            slime.attackCooldown = Math.max(0, (slime.attackCooldown || 0) - 1);
            if (slime.attackCooldown === 0 || slime.ataqueTelegraph) {
                const multDanoBuff = buffsAtivos.reduce(function (mult, buff) {
                    return mult * (buff.danoMult || 1);
                }, 1);
                const danoBase = Math.max(1, Math.floor((slime.dano || 8) * (noite ? 2 : 1) * multDanoBuff));
                const aviso = monstroPodeAtacar(slime)
                    ? prepararAtaqueMonstroComAviso(slime, alvo, alcanceAtaque, melee ? 'melee' : 'ranged')
                    : { status: 'cancelled' };
                if (aviso.status === 'missed') slime.attackCooldown = cadenciaAtaqueMonstro(slime);
                if (aviso.status === 'ready' && (distancia <= alcanceAtaque)) {
                    if (slime.petAttackSkill && slime.petAttackSkill.projectileType) {
                        const skill = slime.petAttackSkill;
                        const shot = executeSharedMonsterAttack({
                            attacker: slime,
                            target: alvo,
                            range: slime.attackRange || alcanceAtaque,
                            now: agora,
                            cooldownMs: 0,
                            validate: function () {
                                return alvo.hp > 0 && instanciaCompativel(slime, alvo)
                                    ? { valid: true }
                                    : { valid: false, reason: 'target_invalid' };
                            },
                            applyDamage: function () {
                                return dispararProjetilMonstro(slime, alvo, skill.projectileType, danoBase,
                                    skill.projectileSpeed || slime.velProjetil || 11,
                                    skill.projectileLife || 80, aviso.angle);
                            }
                        });
                        if (shot.valid) {
                            slime.aiSkillAt = agora;
                            slime.aiAtacandoAte = agora + 801;
                            slime.attackCooldown = cadenciaAtaqueMonstro(slime);
                        } else {
                            slime.attackCooldown = 1;
                        }
                    } else {
                        const hit = executeSharedMonsterAttack({
                            attacker: slime,
                            target: alvo,
                            range: alcanceAtaque,
                            now: agora,
                            cooldownMs: 0,
                            validate: function () {
                                if (!alvo || alvo.hp <= 0 || !instanciaCompativel(slime, alvo)) {
                                    return { valid: false, reason: 'target_invalid' };
                                }
                                if (alvo.pet_instance_id && petRuntimeDoId(alvo.pet_instance_id) !== alvo) {
                                    return { valid: false, reason: 'pet_not_active' };
                                }
                                if (!alvoPet && !jogadorPodeSerAlvoDoSlime(slime.targetId, alvo, slime)) {
                                    return { valid: false, reason: 'player_not_targetable' };
                                }
                                return { valid: true };
                            },
                            applyDamage: function () {
                                if (alvo.pet_instance_id) return applyDamageToCapturedPet(alvo, danoBase, slime.id);
                                if (alvoPet) {
                                    danoCausadoAoOgro(slime.tauntId, danoBase, alvo.x, alvo.y);
                                    return true;
                                }
                                return aplicarDanoJogador(slime.targetId, slime.x, slime.y, danoBase);
                            }
                        });
                        if (!hit.valid) {
                            slime.attackCooldown = 1;
                            return true;
                        }
                        slime.aiAtacandoAte = agora + (slime.bioma === 'Deserto Escaldante' ? 801 : 1122);
                        slime.attackCooldown = cadenciaAtaqueMonstro(slime);
                        if (!alvoPet && slime.tipo === 'besouro_dourado' && efeitos) {
                            efeitos.aplicarEfeito(alvo, 'deserto_lentidao', 200, 0.3);
                        }
                    }
                }

            }

        } else {
            const moveu = moverMonstroComDesvio(slime, alvoX, alvoY, (slime.velocidade || 1.4) * (slime.slowTimer > 0 ? 0.5 : 1));
            slime.aiEstado = moveu
                ? (slime.velocidade > slime._velocidadeBase * 2 ? 'run' : 'walk')
                : 'blocked';
        }
        return true;
    }

    if (slime.aiDormindo) return true;
    if (agora >= (slime.aiProximoPatrulha || 0) ||
        Math.hypot(slime.aiPatrolX - slime.x, slime.aiPatrolY - slime.y) < 20 ||
        (slime.aiBloqueadoTicks || 0) > 20) {
        let patrulha = null;
        const raioPatrulha = entidadeEhElite(slime) ? 9000 : (slime.spawnGrupoId ? 220 : 700);
        if (slime.bioma === SANTUARIO_SLIME_BIOMA) {
            patrulha = gerarPosicaoSantuarioSlime({ x: slime.origemX, y: slime.origemY }, raioPatrulha);
        } else if (slime.bioma === 'Deserto Escaldante') {
            patrulha = gerarPosicaoNaturalDeserto({ x: slime.origemX, y: slime.origemY }, raioPatrulha);
        } else if (slime.bioma === 'Selva Proibida') {
            patrulha = gerarPosicaoNaturalSelva({ x: slime.origemX, y: slime.origemY }, raioPatrulha);
        } else {
            for (let tentativa = 0; tentativa < 30 && !patrulha; tentativa++) {
                const angulo = Math.random() * Math.PI * 2;
                const distancia = Math.random() * raioPatrulha;
                const x = slime.origemX + Math.cos(angulo) * distancia;
                const y = slime.origemY + Math.sin(angulo) * distancia;
                if (entidadeEmBiomaValido(slime, x, y)) patrulha = { x: x, y: y };
            }
        }
        if (patrulha) {
            slime.aiPatrolX = patrulha.x;
            slime.aiPatrolY = patrulha.y;
        }
        slime.aiProximoPatrulha = agora + 3000 + Math.random() * 7000;
        slime.aiBloqueadoTicks = 0;
    }
    if (Math.hypot(slime.aiPatrolX - slime.x, slime.aiPatrolY - slime.y) > 20) {
        slime.aiEstado = moverMonstroComDesvio(slime, slime.aiPatrolX, slime.aiPatrolY, slime.velocidade || 1.4)
            ? 'walk' : 'blocked';
    } else {
        slime.aiEstado = 'idle';
    }
    return true;
}

function obterBuffsMonstroAtivos(monstro, agora) {
    if (!Array.isArray(monstro.buffsMonstros)) monstro.buffsMonstros = [];
    monstro.buffsMonstros = monstro.buffsMonstros.filter(function (buff) {
        return buff && buff.expiraEm > agora;
    });
    return monstro.buffsMonstros;
}

function cadenciaAtaqueMonstro(monstro) {
    const base = Math.max(1, Number(monstro.cadenciaAtk) || 45);
    return Math.max(1, Math.round(base / (monstro.bioma === 'Deserto Escaldante' ? 1.4 : 1)));
}

function aplicarBuffAreaMonstros(caster, agora) {
    const definicoes = [
        { id: 'buff_ataque_deserto', icon: '⚔️', cor: '#ff9d57', nome: 'Ataque +10%', danoMult: 1.1 },
        { id: 'buff_velocidade_deserto', icon: '💨', cor: '#79e7ff', nome: 'Velocidade +20%', velocidadeMult: 1.2 }
    ];
    for (const aliado of slimes) {
        if (!aliado || aliado === caster || aliado.hp <= 0 ||
            mapaPorCoordenada(aliado.x) !== mapaPorCoordenada(caster.x) ||
            Math.hypot(aliado.x - caster.x, aliado.y - caster.y) > 260 ||
            !mapaMundo.ehDeserto(aliado.x, aliado.y)) continue;
        const buffs = obterBuffsMonstroAtivos(aliado, agora);
        definicoes.forEach(function (def) {
            const existente = buffs.find(function (buff) { return buff.id === def.id; });
            const novo = Object.assign({ expiraEm: agora + 10000 }, def);
            if (existente) Object.assign(existente, novo);
            else buffs.push(novo);
        });
    }
}

function atualizarBuffAreaMonstro(monstro, agora) {
    if (monstro.tipo !== 'formiga_sauva' && monstro.tipo !== 'escorpiao_escaldante') return;
    if (agora < (monstro.proximoBuffAreaAte || 0)) return;
    aplicarBuffAreaMonstros(monstro, agora);
    monstro.proximoBuffAreaAte = agora + 20000;
    monstro.aiAtacandoAte = agora + (monstro.bioma === 'Deserto Escaldante' ? 643 : 900);
}

function atualizarRotinaCogumelo(cogumelo, agora) {
    if (agora < (cogumelo.proximoPulsoAte || 0)) return;
    cogumelo.proximoPulsoAte = agora + 5000;
    cogumelo.aiSkillAt = agora;
    cogumelo.aiAtacandoAte = agora + 800;
    const buffDefesa = {
        id: 'selva_defesa_cogumelo',
        icon: '🛡️',
        cor: '#c084fc',
        nome: 'Defesa +10%',
        danoRecebidoMult: 0.9,
        expiraEm: agora + 5500
    };
    for (const aliado of slimes) {
        if (!aliado || aliado.hp <= 0 || aliado.bioma !== 'Selva Proibida' ||
            Math.hypot(aliado.x - cogumelo.x, aliado.y - cogumelo.y) > 280) continue;
        const buffs = obterBuffsMonstroAtivos(aliado, agora);
        const existente = buffs.find(function (buff) { return buff.id === buffDefesa.id; });
        if (existente) Object.assign(existente, buffDefesa);
        else buffs.push(Object.assign({}, buffDefesa));
        if (aliado.hp < aliado.maxHp) {
            aliado.hp = Math.min(aliado.maxHp, aliado.hp + Math.max(1, Math.round(aliado.maxHp * 0.12)));
        }
    }
}

function atualizarCombateEscorpiao(slime, alvo, distancia, agora, noite, buffsAtivos) {
    let avisoResolvido = null;
    if (slime.ataqueTelegraph) {
        avisoResolvido = prepararAtaqueMonstroComAviso(
            slime,
            alvo,
            slime.ataqueTelegraph.range,
            slime.ataqueTelegraph.attackKind
        );
        if (avisoResolvido.status === 'pending') return;
        if (avisoResolvido.status === 'missed') {
            slime.attackCooldown = cadenciaAtaqueMonstro(slime);
            return;
        }
    }
    if (slime.venenoCastAte && agora < slime.venenoCastAte) {
        slime.aiEstado = 'action';
        slime.aiAtacandoAte = slime.venenoCastAte;
        return;
    }
    if (slime.venenoCastAte && agora >= slime.venenoCastAte) {
        for (const pid of Object.keys(players)) {
            const jogador = players[pid];
            if (!jogadorPodeSerAlvoDoSlime(pid, jogador, slime) ||
                Math.hypot(jogador.x + PLAYER_OFFSET_X - slime.venenoAlvoX, jogador.y + PLAYER_OFFSET_Y - slime.venenoAlvoY) > (slime.venenoRaio || 165)) continue;
            const multDano = buffsAtivos.reduce(function (mult, buff) { return mult * (buff.danoMult || 1); }, 1);
            aplicarDanoJogador(pid, slime.x, slime.y, Math.round((slime.dano || 56) * 1.25 * (noite ? 2 : 1) * multDano));
            if (efeitos) efeitos.aplicarEfeito(jogador, 'veneno', 100, 1);
            aplicarContatoMonstro(slime, jogador);
        }
        for (const pet of Object.values(petsAtivos)) {
            const owner = pet && players[pet.owner_id];
            if (!owner || owner.hp <= 0 || pet.hp <= 0 ||
                entidadeEhSolari(slime) !== entidadeEhSolari(pet) ||
                !instanciaCompativel(slime, pet) ||
                mapaPorCoordenada(pet.x) !== mapaPorCoordenada(slime.x) ||
                Math.hypot(pet.x - slime.venenoAlvoX, pet.y - slime.venenoAlvoY) > (slime.venenoRaio || 165)) continue;
            const multDano = buffsAtivos.reduce(function (mult, buff) { return mult * (buff.danoMult || 1); }, 1);
            applyDamageToCapturedPet(pet,
                Math.round((slime.dano || 56) * 1.25 * (noite ? 2 : 1) * multDano), slime.id);
            if (efeitos) efeitos.aplicarEfeito(pet, 'veneno', 100, 1);
            aplicarContatoMonstro(slime, pet);
        }
        slime.venenoCastAte = 0;
        slime.venenoAlvoX = null;
        slime.venenoAlvoY = null;
        slime.proximoAtaqueVeneno = false;
        slime.attackCooldown = cadenciaAtaqueMonstro(slime);
        slime.aiAtacandoAte = agora;
        return;
    }
    slime.attackCooldown = Math.max(0, (slime.attackCooldown || 0) - 1);
    if (slime.proximoAtaqueVeneno && slime.attackCooldown <= 0 && distancia <= 520) {
        const aviso = avisoResolvido || prepararAtaqueMonstroComAviso(slime, alvo, 520, 'ranged');
        if (aviso.status !== 'ready') return;
        const offsetAlvo = alvo.pet_instance_id ? 0 : PLAYER_OFFSET_X;
        const offsetAlvoY = alvo.pet_instance_id ? 0 : PLAYER_OFFSET_Y;
        slime.venenoAlvoX = alvo.x + offsetAlvo;
        slime.venenoAlvoY = alvo.y + offsetAlvoY;
        slime.venenoRaio = 165;
        slime.venenoCastDuracao = slime.bioma === 'Deserto Escaldante' ? 714 : 1000;
        slime.venenoCastAte = agora + slime.venenoCastDuracao;
        slime.aiAtacandoAte = slime.venenoCastAte;
        slime.aiEstado = 'action';
        return;
    }
    if (!slime.proximoAtaqueVeneno && distancia <= (slime.attackRange || 48) && slime.attackCooldown <= 0) {
        const aviso = avisoResolvido || prepararAtaqueMonstroComAviso(slime, alvo, slime.attackRange || 48, 'melee');
        if (aviso.status !== 'ready') return;
        const multDano = buffsAtivos.reduce(function (mult, buff) { return mult * (buff.danoMult || 1); }, 1);
        const damage = Math.round((slime.dano || 56) * (noite ? 2 : 1) * multDano);
        if (alvo.pet_instance_id) applyDamageToCapturedPet(alvo, damage, slime.id);
        else aplicarDanoJogador(slime.targetId, slime.x, slime.y, damage);
        aplicarContatoMonstro(slime, alvo);
        slime.proximoAtaqueVeneno = true;
        slime.attackCooldown = cadenciaAtaqueMonstro(slime);
        slime.aiAtacandoAte = agora + (slime.bioma === 'Deserto Escaldante' ? 801 : 1122);
        return;
    }
    if (distancia > (slime.proximoAtaqueVeneno ? 520 : (slime.attackRange || 48))) {
        const alvoX = alvo.x + (alvo.pet_instance_id ? 0 : PLAYER_OFFSET_X);
        const alvoY = alvo.y + (alvo.pet_instance_id ? 0 : PLAYER_OFFSET_Y);
        const moveu = moverMonstroComDesvio(slime, alvoX, alvoY,
            (slime.velocidade || 1.7) * (slime.slowTimer > 0 ? 0.5 : 1));
        slime.aiEstado = moveu ? 'walk' : 'blocked';
    }
}

function aplicarDebuffAreaBesouroNegro(slime, agora) {
    for (const pid of Object.keys(players)) {
        const jogador = players[pid];
        if (!jogadorPodeSerAlvoDoSlime(pid, jogador, slime) ||
            Math.hypot(jogador.x + PLAYER_OFFSET_X - slime.x, jogador.y + PLAYER_OFFSET_Y - slime.y) > 240) continue;
        if (efeitos) {
            efeitos.aplicarEfeito(jogador, 'deserto_reducao_ataque', 200, 0.2);
            efeitos.aplicarEfeito(jogador, 'deserto_reducao_defesa', 200, 0.1);
            efeitos.aplicarEfeito(jogador, 'deserto_lentidao', 200, 0.3);
        }
    }
    for (const pet of Object.values(petsAtivos)) {
        const owner = pet && players[pet.owner_id];
        if (!owner || owner.hp <= 0 || pet.hp <= 0 ||
            entidadeEhSolari(slime) !== entidadeEhSolari(pet) ||
            !instanciaCompativel(slime, pet) ||
            Math.hypot(pet.x - slime.x, pet.y - slime.y) > 240) continue;
        if (efeitos) {
            efeitos.aplicarEfeito(pet, 'deserto_reducao_ataque', 200, 0.2);
            efeitos.aplicarEfeito(pet, 'deserto_reducao_defesa', 200, 0.1);
            efeitos.aplicarEfeito(pet, 'deserto_lentidao', 200, 0.3);
        }
    }
    slime.proximoDebuffAreaAte = agora + 20000;
    slime.aiAtacandoAte = agora + (slime.bioma === 'Deserto Escaldante' ? 643 : 900);
}

// Posição de um player/entidade sobre o tile de água venenosa do pântano
function sobVenenoPantano(x, y) {
    if (!(x >= LARGURA_DESERTO && x < LARGURA_PANTANO)) return false;
    if (!mapaPantano || typeof mapaPantano.ehVenenoPantano !== 'function') return false;
    return mapaPantano.ehVenenoPantano(x, y);
}

function registrarDanoMonstro(slime, autorId, quantidade, tipoOrigem) {
    if (!slime || !autorId || slime.hp <= 0) return { dano: 0, critico: false };
    if (Array.isArray(slime.tags) && slime.tags.indexOf('invenciveis') !== -1) return { dano: 0, critico: false };
    const autorP = players[autorId];
    if (autorP && !instanciaCompativel(autorP, slime)) return { dano: 0, critico: false };
    let calc = calcularDanoJogador(autorId, quantidade, tipoOrigem, slime);
    let danoFinal = calc.dano;
    // ===== ADMIN CHEAT: SUPER ATAQUE =====
    if (autorP && autorP.adminCheats && autorP.adminCheats.superAtaque) {
        danoFinal = 9999999;
        calc.critico = true;
    }

    // ===== SOLDADO LANCEIRO: BLOQUEIO FRONTAL ABSOLUTO =====
    // A direção é server-side: compara a posição do atacante com a face do escudo.
    if (danoFinal > 0 && slime.arquetipo === 'lanceiro' && slime.lanceiroBloqueando && autorP) {
        const sx = autorP.x + PLAYER_OFFSET_X;
        const sy = autorP.y + PLAYER_OFFSET_Y;
        const angFonte = Math.atan2(sy - slime.y, sx - slime.x);
        const diffFonte = Math.abs(Math.atan2(Math.sin(angFonte - (slime.lanceiroFaceAngle || 0)), Math.cos(angFonte - (slime.lanceiroFaceAngle || 0))));
        if (diffFonte <= Math.PI / 3) {
            danoFinal = 0;
            const bloco = { id: slime.id, x: Math.round(slime.x), y: Math.round(slime.y - 8), autorId: autorId || null };
            if (slime.solari) solariBroadcastParaEntidade(slime, 'monster_lanceiro_block_hit', bloco);
            else wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'monster_lanceiro_block_hit', ...bloco })); });
        }
    }

    // ===== EDITOR "EDIT MOOB": defesa (% de redução) e block (chance de bloquear) =====
    if (danoFinal > 0 && slime.defesa > 0) {
        let defEfetiva = slime.defesa;
        if (slime.canticoDebuffExpires && slime.canticoDebuffExpires > Date.now()) {
            defEfetiva = defEfetiva * 0.8;
        }
        danoFinal = Math.max(1, Math.floor(danoFinal * (1 - Math.min(90, defEfetiva) / 100)));
        if (danoFinal <= 0) danoFinal = 1;
    }
    if (danoFinal > 0) {
        const agoraBuff = Date.now();
        const multiplicadorDefesaMonstro = obterBuffsMonstroAtivos(slime, agoraBuff).reduce(function (mult, buff) {
            return mult * (Number(buff.danoRecebidoMult) || 1);
        }, 1);
        danoFinal = Math.max(1, Math.floor(danoFinal * multiplicadorDefesaMonstro));
    }
    if (danoFinal > 0 && slime.canticoDebuffExpires && slime.canticoDebuffExpires > Date.now()) {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.20));
    }
    if (danoFinal > 0 && efeitos && efeitos.temEfeito(slime, 'reducaoDef')) danoFinal = Math.max(1, Math.round(danoFinal * 1.25));
    if (danoFinal > 0 && slime.fraturaDefensivaExpires && slime.fraturaDefensivaExpires > Date.now()) {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.12));
    }
    if (danoFinal > 0 && slime.marcaPresaExpires && slime.marcaPresaExpires > Date.now() && slime.marcaPresaOwner === autorId) {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.15));
    }
    if (danoFinal > 0 && slime.presaInescapavelAte && slime.presaInescapavelAte > Date.now() && tipoOrigem === 'pet') {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.30));
    }
    if (danoFinal > 0 && slime.block > 0 && Math.random() * 100 < Math.min(90, slime.block)) {
        danoFinal = 0;
        const bloco = { x: Math.round(slime.x), y: Math.round(slime.y - 8), autorId: autorId || null };
        if (slime.solari) {
            solariBroadcast('mob_block', bloco);
        } else {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'mob_block', ...bloco }));
            });
        }
    }

    if (!slime.tabelaDano) slime.tabelaDano = {};
    if (danoFinal > 0) slime.tabelaDano[autorId] = (slime.tabelaDano[autorId] || 0) + danoFinal;
    if (!slime.flagPassivo || slime.aiManaged) {
        // LADINO invisível / SNIPER camuflado: o dano NÃO revela a posição (sem agro)
        if (!autorP || !(efeitos && (efeitos.temEfeito(autorP, 'invisivel') || efeitos.temEfeito(autorP, 'camuflagem')))) {
            slime.targetId = autorId;
            if (slime.aiManaged && slime.aiDormindo) {
                slime.aiDormindo = false;
                slime.aiEstado = 'rest_exit';
                slime.aiEstadoTimer = 12;
            }
        }
    }
    slime.hp -= danoFinal;
    // LADINO — PASSIVA LÂMINAS SANGRENTAS (20% → sangramento 20% do dano físico/s por 5s)
    if (tipoOrigem === 'player' && danoFinal > 0) tentarSangrarLadino(slime, autorId, danoFinal);
    if (autorP && autorP.classe === 'barbaro' && (autorP.vinculoAtivo || (autorP.vampirismoBonus && autorP.vampirismoBonus > 0)) && autorP.vinculoExpires > Date.now() && danoFinal > 0) {
        let pctVamp = autorP.vampirismoBonus || 0.20;
        aplicarCuraAoJogador(autorId, Math.max(1, Math.round(danoFinal * pctVamp)));
    }
    if (calc.critico) broadcastCritico(slime.x, slime.y, autorId);
    if (danoFinal > 0 && autorP && tipoOrigem !== 'pet') broadcastDanoFlut(slime.x, slime.y, danoFinal, autorId);

    if (slime.hp <= 0) {
        slime.hp = 0;
        if (slime.solari) {
            // Monstros da Arena de Solari: NÃO dropam item (recompensa só no leilão final).
            const sessaoSolari = solariSessaoPorInstancia(slime.solariInstanceId);
            if (sessaoSolari && sessaoSolari.vivos > 0) sessaoSolari.vivos--;
        } else {
            gerarDropNoChao(slime.x, slime.y, slime.tabelaDano, slime.baseHp || slime.maxHp || 0, false, slime);
            gerarDropsAuxiliares(slime.x, slime.y, slime.baseHp || slime.maxHp || 0, false);
            gerarDropsConfigurados(slime);
        }
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
    // EDITOR "EDIT MOOB": XP por monstro é configurável (padrão: 35)
    let xpBase = (slime && slime.xpBase) || 35;
    let xpPorPessoa = Math.max(15, Math.floor(xpBase / beneficiariosArr.length));
    // Bonus for party: +20% XP per person
    xpPorPessoa = Math.floor(xpPorPessoa * 1.2); 

    beneficiariosArr.forEach(pid => {
        let p = players[pid];
        let wsTarget = playerSockets[pid];
        if (p && wsTarget && wsTarget.readyState === WebSocket.OPEN) {
            // Anti-hack: o level-up é creditado pelo servidor a partir do XP
            // que ELE mesmo concessionou, e sanitizarLevelXp() garante que um xp
            // inflado (do disco ou de qualquer origem) nunca dispare dozens de
            // pontos de atributo/skill de uma vez.
            let subiuLevel = concederXpSeguro(p, xpPorPessoa);


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
    // ===== ADMIN CHEAT: VIDA INFINITA (GOD MODE) =====
    if (jogador.adminCheats && jogador.adminCheats.vidaInfinita) {
        jogador.hp = jogador.maxHp;
        return true;
    }
    let debuffedAttacker = false;
    for (let s of slimes) {
        if (s && s.hp > 0 && s.canticoDebuffExpires && s.canticoDebuffExpires > Date.now()) {
            if (Math.hypot(s.x - origemX, s.y - origemY) < 40) { debuffedAttacker = true; break; }
        }
    }
    if (!debuffedAttacker) {
        for (let b of bosses) {
            if (b && b.hp > 0 && b.canticoDebuffExpires && b.canticoDebuffExpires > Date.now()) {
                if (Math.hypot(b.x - origemX, b.y - origemY) < 90) { debuffedAttacker = true; break; }
            }
        }
    }
    if (debuffedAttacker) {
        dano = Math.max(1, Math.round(dano * 0.95));
    }

    if (jogador.classe === 'guerreiro') {
        const agoraDanoG = Date.now();
        // Postura do Guardião
        if (jogador.guerreiroBuffAte && jogador.guerreiroBuffAte > agoraDanoG) {
            let multDef = 0.70;
            // Bastião Inabalável (Tier 1 B): +50% Defesa total (em vez de +30%)
            if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(jogador.skillUpgrades, 'postura_guardiao', 1, 'B')) {
                multDef = 0.50;
            }
            dano = Math.max(1, Math.round(dano * multDef));

            // Fortaleza Indestrutível (Tier 4 B): primeiros 3s dão 80% redução de dano absoluta
            if (jogador.fortalezaIndestrutivelAte && jogador.fortalezaIndestrutivelAte > agoraDanoG) {
                dano = Math.max(1, Math.round(dano * 0.20));
            }

            // Espinhos de Retaliação (Tier 2 A): reflete 35% do dano em área (120px)
            if (jogador.espinhosRetaliacaoAte && jogador.espinhosRetaliacaoAte > agoraDanoG && dano > 0) {
                let danoRefletido = Math.max(1, Math.round(dano * 0.35));
                let gx = jogador.x + PLAYER_OFFSET_X, gy = jogador.y + PLAYER_OFFSET_Y;
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(gx - s.x, gy - s.y) < 120) {
                        registrarDanoMonstro(s, pid, danoRefletido, 'player');
                        s.sangramentoTimer = 60;
                        s.sangramentoDano = 8;
                        s.sangramentoOwner = pid;
                    }
                });
                danoEmBosses(gx, gy, 125, pid, danoRefletido, 'skill', 'player');
                wss.clients.forEach(c => {
                    if (c.readyState === WebSocket.OPEN) {
                        c.send(JSON.stringify({ type: 'action_guerreiro_espinhos_retaliacao', id: pid, x: gx, y: gy }));
                    }
                });
            }
        }

        // Vórtice Protetor (Tornado Tier 1 B): 40% redução de dano sofrido durante o giro
        if (jogador.vorticeProtetorAte && jogador.vorticeProtetorAte > agoraDanoG) {
            dano = Math.max(1, Math.round(dano * 0.60));
        }

        // Rugido Encouraçado (Provocação Tier 1 B): +20% defesa (sofre 20% a menos)
        if (jogador.bonusDefesaGritoAte && jogador.bonusDefesaGritoAte > agoraDanoG) {
            dano = Math.max(1, Math.round(dano * 0.80));
        }

        // Avatar da Vanguarda (Provocação Tier 4 B): +50% defesa (sofre 50% a menos)
        if (jogador.avatarVanguardaAte && jogador.avatarVanguardaAte > agoraDanoG) {
            dano = Math.max(1, Math.round(dano * 0.50));
        }

        // Absorções de barreiras:
        // 1. Barreira da Postura (Bastião Inabalável 1B)
        if (jogador.barreiraPostura && jogador.barreiraPosturaAte > agoraDanoG && dano > 0) {
            let abs = Math.min(jogador.barreiraPostura, dano);
            jogador.barreiraPostura -= abs;
            dano -= abs;
            if (dano <= 0) return true;
        }
        // 2. Barreira do Avatar (4B)
        if (jogador.barreiraAvatar && jogador.barreiraAvatarAte > agoraDanoG && dano > 0) {
            let abs = Math.min(jogador.barreiraAvatar, dano);
            jogador.barreiraAvatar -= abs;
            dano -= abs;
            if (dano <= 0) return true;
        }
        // 3. Barreira de Vento (Tornado 3B)
        if (jogador.barreiraVento && jogador.barreiraVentoAte > agoraDanoG && dano > 0) {
            let abs = Math.min(jogador.barreiraVento, dano);
            jogador.barreiraVento -= abs;
            dano -= abs;
            if (dano <= 0) return true;
        }
        // 4. Barreira do Escudo de Retorno (Escudo 3B)
        if (jogador.barreiraEscudoRetorno && jogador.barreiraEscudoRetornoAte > agoraDanoG && dano > 0) {
            let abs = Math.min(jogador.barreiraEscudoRetorno, dano);
            jogador.barreiraEscudoRetorno -= abs;
            dano -= abs;
            if (dano <= 0) return true;
        }
    }


    if (jogador.classe === 'summoner') {
        // Escudo do Salto de Recuo (Tier 3 A)
        if (jogador.escudoSummoner && jogador.escudoSummonerExpires > Date.now()) {
            let absorvido = Math.min(jogador.escudoSummoner, dano);
            jogador.escudoSummoner -= absorvido;
            dano -= absorvido;
            if (dano <= 0) return true;
        }

        // Carapaça Colossal: reduz todo dano sofrido pela Invocadora em 8% (Tier 1 A)
        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(jogador.skillUpgrades, 'colossal', 1, 'A')) {
            dano = Math.max(1, Math.round(dano * 0.92));
        }

        // Guarda da Invocadora: 25% de todo dano sofrido é transferido para o Golem (Tier 2 A)
        if (lacaios[pid] && lacaios[pid].hp > 0 && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(jogador.skillUpgrades, 'colossal', 2, 'A')) {
            let transferido = Math.round(dano * 0.25);
            if (transferido > 0) {
                dano = Math.max(1, dano - transferido);
                danoCausadoAoOgro(pid, transferido, jogador.x, jogador.y);
            }
        }
    }

    if (jogador.classe === 'mago') {
        const agoraDanoM = Date.now();
        // Forma Ígnea (Meteoro Tier 4 B): Mago vira Bola de Fogo e reduz todo dano recebido em 50%
        if (jogador.formaIgneaAte && jogador.formaIgneaAte > agoraDanoM) {
            dano = Math.max(1, Math.round(dano * 0.50));
        }
        // Escudo Elemental de Vanguarda (Bola Elemental Tier 3 B): -35% de dano sofrido
        if (jogador.escudoVanguardaAte && jogador.escudoVanguardaAte > agoraDanoM) {
            dano = Math.max(1, Math.round(dano * 0.65));
        }
        // Bolha de Proteção do Rugido do Golem (Vulcão Tier 3 B): 20% HP Máx absorvido
        if (jogador.escudoGolemMago && jogador.escudoGolemMago > 0 && jogador.escudoGolemMagoAte > agoraDanoM) {
            let absMago = Math.min(jogador.escudoGolemMago, dano);
            jogador.escudoGolemMago -= absMago;
            dano -= absMago;
            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ type: 'action_mago_escudo_sync', id: pid, shieldVal: jogador.escudoGolemMago }));
                }
            });
            if (dano <= 0) return true;
        }
    }

    // LADINO — DANÇA DAS ADAGAS: imune a dano durante a sequência de teleportes
    if (jogador.ladinoDancaAtivo) return true;

    // ARQUEIRO — SALTO + CHUVA DO ALTO: `p.imune` era setado/limpo pelo servidor
    // mas NUNCA era lido aqui (imunidade declarada e inoperante). Agora vale.
    // Vale enquanto o arqueiro está "no alto": do cast até o tiro ou 3s (o que
    // vier primeiro) — mesma janela que já era controlada por saltoChuvaExpires.
    // SÓ PvE: `aplicarDanoPvP` NÃO consulta .imune de propósito — a imunidade
    // nunca vira imunidade PvP (v1.60.1).
    if (jogador.imune) return true;

    // LADINO — CAMUFLAGEM SOMBRIA: invisível = inimigos NÃO o acertam (nem melee,
    // nem projéteis em voo, nem AOE de monstro). PvP usa aplicarDanoPvP (separado).
    if (efeitos && efeitos.temEfeito(jogador, 'invisivel')) return true;

    // ===== GUERREIRO — ESCUDO FRONTAL SEGURADO (DASH v2) =====
    // Com o escudo erguido, o arco de bloqueio acompanha a MIRA atual
    // (p.escudoGuerreiro.ang é reescrito a cada tick com p.angulo, ou seja,
    // o escudo vira para onde a ESPADA está apontando). Fora do arco frontal
    // o dano passa inteiro.
    //
    // `arco` é a LARGURA TOTAL; o meio-ângulo é metade dela. Antes usava
    // `arco` inteiro como meio-ângulo (132° reais em vez dos 66° do design).
    if (jogador.escudoGuerreiro) {
        const cfgEsc = DASH_MOD.configDe('guerreiro');
        const angAtaque = Math.atan2(origemY - (jogador.y + 16), origemX - (jogador.x + 12));
        const diff = Math.abs(Math.atan2(
            Math.sin(angAtaque - jogador.escudoGuerreiro.ang),
            Math.cos(angAtaque - jogador.escudoGuerreiro.ang)
        ));
        if (diff <= (cfgEsc.arco / 2)) {
            dano = Math.max(1, Math.round(dano * (1 - cfgEsc.reducaoFrontal)));
        }
    }

    // ===== CURANDEIRA — ATORDOADA PELO PRÓPRIO ESCUDO DE ÁREA (DASH v2) =====
    // O castigo pelos 5s de atordoamento NÃO é morte instantânea: 50% de redução.
    if (jogador.curandeiraAtordoada && jogador.reducaoAtordoada > 0) {
        dano = Math.max(1, Math.round(dano * (1 - jogador.reducaoAtordoada)));
    }

    // PASSIVA ANTIGA (bloqueio por estamina ao estar virado para o golpe):
    // não roda junto com o escudo erguido, senão a redução viraria 91%.
    if (jogador.classe === 'guerreiro' && jogador.estamina >= 15 && !jogador.escudoGuerreiro) {
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

    // GUERREIRO KALEDRON — FORJA SOLAR: -10% de dano físico recebido
    if (jogador.classe === 'guerreiro_kaledron') {
        dano = Math.round(dano * 0.90);
    }

    // Debuffs/buffs alteram o dano recebido
    if (efeitos) {
        if (efeitos.temEfeito(jogador, 'reducaoDef')) dano = Math.round(dano * 1.25); // Defesa quebrada: +25%
        if (efeitos.temEfeito(jogador, 'deserto_reducao_defesa')) dano = Math.round(dano * 1.10);
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
    dano = calcularDefesaEquipamentoJogador(jogador, dano);

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
    if (jogador.hp <= 0) {
        solariMarcaMorte(pid);
        tentarRessurreicaoAutomatica(pid);
    }
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

function provocarMonstrosPelaCura(curadorId, aliadoId) {
    if (!curadorId || !aliadoId || curadorId === aliadoId) return;
    const curador = players[curadorId];
    if (!curador || curador.hp <= 0) return;
    const x = curador.x + PLAYER_OFFSET_X;
    const y = curador.y + PLAYER_OFFSET_Y;
    const agora = Date.now();
    for (const slime of slimes) {
        if (!slime || !slime.aiManaged || slime.hp <= 0 ||
            mapaPorCoordenada(slime.x) !== mapaPorCoordenada(x) ||
            !instanciaCompativel(curador, slime) ||
            Math.hypot(slime.x - x, slime.y - y) > 500) continue;
        slime.targetId = curadorId;
        slime.aiForcedTargetId = curadorId;
        slime.aiForcedTargetAte = agora + 10000;
        if (slime.aiDormindo) {
            slime.aiDormindo = false;
            slime.aiEstado = 'rest_exit';
            slime.aiEstadoTimer = 12;
        }
    }
}

// Aplica cura respeitando cortaCura no destinatário
function aplicarCuraAoJogador(pid, quantidade, curadorId) {
    let p = players[pid];
    if (!p || p.hp <= 0) return;
    let cura = quantidade;
    if (efeitos && efeitos.temEfeito(p, 'cortaCura')) cura = Math.round(cura * 0.5);
    if (aliadoNaAura(pid)) cura = Math.round(cura * 1.10);
    p.hp = Math.min(p.maxHp, p.hp + cura);
    if (curadorId) provocarMonstrosPelaCura(curadorId, pid);
}

// Dano ambiental por biomas (Lava ardente, Água de Veneno do Pântano, etc.)
function aplicarDanoAmbiente(pid, dano, tipoDano, texto) {
    let jogador = players[pid];
    if (!jogador || jogador.hp <= 0) return;
    if (jogador.adminCheats && jogador.adminCheats.vidaInfinita) return;
    dano = itemSystem.reduzirDanoPelaDefesaEquipamento(
        jogador.classe,
        jogador.inventario && jogador.inventario.slots || {},
        dano
    );
    jogador.hp = Math.max(0, jogador.hp - dano);
    let ws = playerSockets[pid];
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'dano_ambiente',
            dano: dano,
            tipo: tipoDano,
            hp: jogador.hp,
            maxHp: jogador.maxHp,
            texto: texto
        }));
        ws.send(JSON.stringify({ type: 'hp_sync', hp: jogador.hp, maxHp: jogador.maxHp }));
    }
    if (jogador.hp <= 0) {
        solariMarcaMorte(pid);
        tentarRessurreicaoAutomatica(pid);
    }
}

// ============ BOSS: GOLEM DE PEDRA ============
let bosses = [];

function registrarDanoBoss(boss, autorId, quantidade, tipo, tipoOrigem) {
    if (!boss || !autorId || boss.hp <= 0) return { dano: 0, critico: false };
    const autorP0 = players[autorId];
    if (autorP0 && !instanciaCompativel(autorP0, boss)) return { dano: 0, critico: false };
    let tipoDano = (tipo === 'basico') ? 'basico' : 'skill';

    let calc = calcularDanoJogador(autorId, quantidade, tipoOrigem, boss);
    let danoFinal = calc.dano;
    let autorP = players[autorId];
    // ===== ADMIN CHEAT: SUPER ATAQUE =====
    if (autorP && autorP.adminCheats && autorP.adminCheats.superAtaque) {
        danoFinal = 9999999;
        calc.critico = true;
    }
    if (danoFinal > 0 && efeitos && efeitos.temEfeito(boss, 'reducaoDef')) danoFinal = Math.max(1, Math.round(danoFinal * 1.25));
    if (danoFinal > 0 && boss.canticoDebuffExpires && boss.canticoDebuffExpires > Date.now()) {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.20));
    }
    if (danoFinal > 0 && boss.fraturaDefensivaExpires && boss.fraturaDefensivaExpires > Date.now()) {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.12));
    }
    if (danoFinal > 0 && boss.marcaPresaExpires && boss.marcaPresaExpires > Date.now() && boss.marcaPresaOwner === autorId) {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.15));
    }
    if (danoFinal > 0 && boss.presaInescapavelAte && boss.presaInescapavelAte > Date.now() && tipoOrigem === 'pet') {
        danoFinal = Math.max(1, Math.round(danoFinal * 1.30));
    }

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
    let autorBossP = players[autorId];
    if (autorBossP && autorBossP.classe === 'barbaro' && (autorBossP.vinculoAtivo || (autorBossP.vampirismoBonus && autorBossP.vampirismoBonus > 0)) && autorBossP.vinculoExpires > Date.now() && danoFinal > 0) {
        let pctVamp = autorBossP.vampirismoBonus || 0.20;
        aplicarCuraAoJogador(autorId, Math.max(1, Math.round(danoFinal * pctVamp)));
    }
    if (calc.critico) broadcastCritico(boss.x, boss.y, autorId);
    if (danoFinal > 0 && autorBossP && tipoOrigem !== 'pet') broadcastDanoFlut(boss.x, boss.y, danoFinal, autorId);
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

// `ang`/`meiaAbertura` são repassados ao dano em jogadores: quando o corpo-a-corpo
// chama com cone, o PvP passa a respeitar a mesma abertura usada contra slimes
// (a área contra bosses continua 360°, como sempre foi).
function danoEmBosses(x, y, raio, autorId, quantidade, tipo, tipoOrigem, ang, meiaAbertura) {
    danoEmPlayers(x, y, raio, autorId, quantidade, tipo, null, ang, meiaAbertura);
    const contexto = contextoCombateDoJogador(autorId);
    let ret = null;
    for (let bb of bosses) {
        if (contexto && !entidadeNoContextoCombate(bb, contexto)) continue;
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

function clonarInventario(inventory) {
    return JSON.parse(JSON.stringify(inventory || inventarioPadrao()));
}

function adicionarItemAoInventarioPreparado(inventory, item) {
    if (!inventory.slots || typeof inventory.slots !== 'object') inventory.slots = inventarioPadrao().slots;
    if (!Array.isArray(inventory.mochila)) inventory.mochila = [];
    const instanceId = item && (item.itemInstanceId || item.uid || item.id);
    if (!instanceId) throw new Error('Item sem identificador não pode ser transferido.');
    const duplicate = Object.keys(inventory.slots).some(function (slot) {
        const existing = inventory.slots[slot];
        return existing && (existing.itemInstanceId || existing.uid || existing.id) === instanceId;
    }) || inventory.mochila.some(function (existing) {
        return existing && existing.tipo !== 'vazio' &&
            (existing.itemInstanceId || existing.uid || existing.id) === instanceId;
    });
    if (duplicate) throw new Error('Instância de item já pertence a este inventário.');
    const emptyIndex = inventory.mochila.findIndex(function (entry) { return entry && entry.tipo === 'vazio'; });
    if (emptyIndex >= 0) inventory.mochila[emptyIndex] = item;
    else inventory.mochila.push(item);
}

function inventarioTradePreparado(playerId, ownerId, items) {
    const player = players[playerId];
    const saved = player ? null : carregarProgresso(ownerId);
    const currentInventory = player && player.inventario
        ? player.inventario
        : (saved && saved.inventario);
    const inventory = clonarInventario(currentInventory);
    items.forEach(function (item) { adicionarItemAoInventarioPreparado(inventory, item); });
    return inventory;
}

function persistirRetornoTrade(trade) {
    const inv1 = inventarioTradePreparado(trade.p1, trade.owner1, trade.items1);
    const inv2 = inventarioTradePreparado(trade.p2, trade.owner2, trade.items2);
    salvarProgressoEmLote([
        { userId: trade.owner1, dados: { inventario: inv1 } },
        { userId: trade.owner2, dados: { inventario: inv2 } }
    ]);
    if (players[trade.p1]) players[trade.p1].inventario = inv1;
    if (players[trade.p2]) players[trade.p2].inventario = inv2;
}

// ============================================================================
// HELPERS DO SISTEMA DE UPGRADE (NPC FERREIRO)
// Localização de item por instância (id único + uid = itemInstanceId).
// O item pode estar na mochila OU equipado num slot — nunca nos dois ao mesmo
// tempo (equipar move entre mochila e slots).
// ============================================================================
function localizarItemInstancia(p, id, uid) {
    if (!p || !p.inventario || id === undefined || id === null) return null;
    let res = null;
    if (Array.isArray(p.inventario.mochila)) {
        for (let i = 0; i < p.inventario.mochila.length; i++) {
            let it = p.inventario.mochila[i];
            if (!it || it.tipo === 'vazio') continue;
            if (String(it.id) === String(id) && (!uid || it.uid === uid)) {
                res = { item: it, onde: 'mochila' };
                break;
            }
        }
    }
    if (!res && p.inventario.slots) {
        for (let ch in p.inventario.slots) {
            let it = p.inventario.slots[ch];
            if (!it) continue;
            if (String(it.id) === String(id) && (!uid || it.uid === uid)) {
                res = { item: it, onde: ch };
                break;
            }
        }
    }
    return res;
}

function contarPedra(p, pedra) {
    if (!p || !p.inventario || !Array.isArray(p.inventario.mochila)) return 0;
    let total = 0;
    for (let i = 0; i < p.inventario.mochila.length; i++) {
        let it = p.inventario.mochila[i];
        if (it && it.tipo === 'pedra' && it.pedra === pedra) total += (it.quantidade || 1);
    }
    return total;
}

function consumirPedra(p, pedra, qtd) {
    if (!p || !p.inventario || !Array.isArray(p.inventario.mochila)) return 0;
    let restante = qtd;
    for (let i = p.inventario.mochila.length - 1; i >= 0 && restante > 0; i--) {
        let it = p.inventario.mochila[i];
        if (it && it.tipo === 'pedra' && it.pedra === pedra) {
            let disp = it.quantidade || 1;
            if (disp <= restante) {
                p.inventario.mochila.splice(i, 1);
                restante -= disp;
            } else {
                it.quantidade = disp - restante;
                restante = 0;
            }
        }
    }
    return qtd - restante;
}

function adicionarPedra(pid, pedra, qtd) {
    let p = players[pid];
    if (!p) return;
    if (!p.inventario) p.inventario = inventarioPadrao();
    if (!p.inventario.mochila) p.inventario.mochila = [];
    for (let i = 0; i < p.inventario.mochila.length; i++) {
        let it = p.inventario.mochila[i];
        if (it && it.tipo === 'pedra' && it.pedra === pedra) {
            it.quantidade = (it.quantidade || 1) + qtd;
            return;
        }
    }
    if (ferreiroMod) {
        let novoItem = ferreiroMod.novoItemPedra(pedra, qtd);
        if (novoItem) p.inventario.mochila.push(novoItem);
    }
}

// ============================================================================
// ARENA DE SOLARI — partida em grupo (recrutamento → rounds → leilão)
// ============================================================================
function solariEmSessao(pid) {
    const s = solariSessaoDoJogador(pid);
    if (!s || !pid) return null;
    const mi = s.membros.findIndex(function (m) { return m.id === pid; });
    return mi === -1 ? null : s.membros[mi];
}

function solariEnviarA(pid, tipo, dados) {
    const wsS = playerSockets[pid];
    if (wsS && wsS.readyState === WebSocket.OPEN) wsS.send(JSON.stringify(Object.assign({ type: tipo }, dados || {})));
}

function solariBroadcast(s, tipo, dados) {
    // Compatibilidade temporária para emissores antigos que ainda chamam
    // solariBroadcast(tipo, dados). O alvo é resolvido pela instanciaId.
    if (typeof s === 'string') {
        const legadoTipo = s;
        const legadoDados = tipo || {};
        const entidade = legadoDados.id ? slimes.find(function (x) { return x && x.id === legadoDados.id && x.solari; }) : null;
        s = entidade ? solariSessaoPorInstancia(entidade.solariInstanceId) : null;
        tipo = legadoTipo;
        dados = legadoDados;
    }
    if (!s) return;
    s.membros.forEach(function (m) { solariEnviarA(m.id, tipo, dados); });
}

function solariBroadcastParaEntidade(entidade, tipo, dados) {
    if (!entidade || !entidade.solari) return;
    const s = solariSessaoPorInstancia(entidade.solariInstanceId);
    if (s) solariBroadcast(s, tipo, dados);
}

// Mapa efetivo de um jogador (leva em conta a sessão Solari).
function mapaDoJogador(pid) {
    const p = players && players[pid];
    if (!p) return null;
    if (solariSessaoDoJogador(pid)) return 'solari';
    return mapaPorCoordenada(p.x + PLAYER_OFFSET_X);
}

// Envia um pacote apenas para os clientes que estão no MESMO mapa que o jogador `pid`.
// Evita que efeitos/áudios (ex.: Bateria do Roqueiro) sejam disparados em clientes
// de outros mapas — e reduz spam visual/travamento (tela verde) entre muitos jogadores.
function enviarParaMapaDoJogador(pid, tipo, dados) {
    const mapaDono = mapaDoJogador(pid);
    if (!mapaDono) return;
    const payload = JSON.stringify(Object.assign({ type: tipo }, dados || {}));
    wss.clients.forEach((client) => {
        if (client.readyState !== WebSocket.OPEN) return;
        const jogadorCliente = client._playerId ? players[client._playerId] : null;
        const sessaoClienteSolari = client._playerId ? solariSessaoDoJogador(client._playerId) : null;
        const clienteEmSolari = !!sessaoClienteSolari;
        const mapaCliente = clienteEmSolari ? 'solari' : (jogadorCliente ? mapaPorCoordenada(jogadorCliente.x + PLAYER_OFFSET_X) : null);
        if (mapaCliente === mapaDono) client.send(payload);
    });
}

function solariEstado(s) {
    if (!s) return null;
    return {
        fase: s.fase,
        round: s.round,
        roundsTotal: SOLARI_COORDS.rounds,
        instanciaId: s.instanciaId,
        instanciaTipo: s.instanciaTipo,
        mapaInstanciaId: s.mapaInstanciaId,
        liderId: s.liderId,
        membros: s.membros.map(function (m) {
            const p = players[m.id];
            return { id: m.id, nick: p ? p.nome : '?', lvl: p ? p.level : 1, classe: p ? p.classe : '?', ok: !!m.ok, vivo: !!p && p.hp > 0 };
        })
    };
}

function solariEnviarEstado(s) { solariBroadcast(s, 'solari_estado', solariEstado(s)); }

function solariCriarSessao(pid) {
    const instanciaId = INSTANCIAS.criarId('solari');
    const s = {
        instanciaId: instanciaId,
        instanciaTipo: 'solari',
        mapaInstanciaId: 'solari',
        liderId: pid,
        fase: 'recrutando',
        round: 0,
        membros: [{ id: pid, ok: false }],
        convites: {},
        spawned: 0,
        vivos: 0,
        eliteSpawnou: false,
        tiposRound: [],
        rodandoInicio: 0,
        proximoSpawnEm: 0,
        contagemFimEm: 0,
        contagemUltimoSeg: -1,
        transicaoFimEm: 0,
        transicaoUltimoSeg: -1,
        ultimaAtividade: Date.now(),
        todosMortosDesde: 0,
        fimEm: 0,
        leilao: null
    };
    solariSessoes.set(s.instanciaId, s);
    return s;
}

function solariAbrir(pid) {
    const p = players[pid];
    if (!p) return;
    if (SOLARI_TIPOS.length < 2) {
        solariEnviarA(pid, 'solari_aviso', { texto: 'A Arena de Solari ficará indisponível até haver monstros cadastrados.' });
        return;
    }
    const existente = solariSessaoDoJogador(pid);
    if (existente) {
        existente.ultimaAtividade = Date.now();
        solariEnviarA(pid, 'solari_painel', solariEstado(existente));
        return;
    }
    // Regra da nova arquitetura: uma entrada independente sempre cria uma nova sala.
    // Convites são o único caminho para ingressar na sala de outro jogador.
    const s = solariCriarSessao(pid);
    s.ultimaAtividade = Date.now();
    console.log('[SOLARI] abrir por ' + p.nome + ' (' + pid + ') nova sala=' + s.instanciaId);
    solariEnviarA(pid, 'solari_painel', solariEstado(s));
    solariEnviarEstado(s);
}

function solariConvidar(dePid, alvoPid) {
    const s = solariSessaoDoJogador(dePid);
    if (!s || s.fase !== 'recrutando') return false;
    if (s.liderId !== dePid) return false;
    if (s.membros.length >= SOLARI_MAX_MEMBROS) return false;
    const lider = players[dePid];
    if (!lider || lider.hp <= 0) return false;
    const lx = lider.x + PLAYER_OFFSET_X, ly = lider.y + PLAYER_OFFSET_Y;
    if (Math.hypot(lx - PORTAL_ROXO_SOLARI.x, ly - PORTAL_ROXO_SOLARI.y) > 460) return false;
    if (solariEmSessao(alvoPid)) return false;
    const alvo = players[alvoPid];
    if (!alvo) return false;
    if (alvo.hp <= 0) return false;
    const cx = alvo.x + PLAYER_OFFSET_X, cy = alvo.y + PLAYER_OFFSET_Y;
    if (Math.hypot(cx - PORTAL_ROXO_SOLARI.x, cy - PORTAL_ROXO_SOLARI.y) > 460) return false;
    const deP = players[dePid];
    s.convites[alvoPid] = { deId: dePid, deNick: deP ? deP.nome : '?', expiraEm: Date.now() + 20000 };
    s.ultimaAtividade = Date.now();
    solariEnviarA(alvoPid, 'solari_convite', { deId: dePid, deNick: s.convites[alvoPid].deNick });
    // NÃO envia solari_painel junto — o cliente apagaria o modal do convite.
    // O painel chega quando o convidado ACEITAR.
    return true;
}

function solariAceitar(pid, deId) {
    const s = solariSessaoDoJogador(deId);
    if (!s || s.fase !== 'recrutando') return false;
    if (solariEmSessao(pid)) return false;
    const convite = s.convites && s.convites[pid];
    if (!convite || convite.deId !== deId || convite.expiraEm < Date.now()) return false;
    if (s.membros.length >= SOLARI_MAX_MEMBROS) return false;
    delete s.convites[pid];
    s.membros.push({ id: pid, ok: false });
    s.ultimaAtividade = Date.now();
    solariEnviarA(pid, 'solari_painel', solariEstado(s));
    solariEnviarEstado(s);
    return true;
}

function solariRecusar(pid, deId) {
    const s = solariSessaoDoJogador(deId);
    if (!s || !s.convites) return false;
    const convite = s.convites[pid];
    if (convite && convite.deId === deId) delete s.convites[pid];
    return true;
}

function solariDarOk(pid) {
    const s = solariSessaoDoJogador(pid);
    const m = s ? solariEmSessao(pid) : null;
    const p = players[pid];
    if (!s || !m || s.fase !== 'recrutando' || !p || p.hp <= 0) return;
    m.ok = !m.ok;
    s.ultimaAtividade = Date.now();
    solariEnviarEstado(s);
}

function solariTeleportarParaSolari(pid, s) {
    const p = players[pid];
    if (!p || !s) return;
    const base = SOLARI_COORDS.solari.chegada;
    const destino = encontrarPosicaoJogadorSegura(p, base.x + (Math.random() * 40 - 20), base.y + (Math.random() * 40 - 20));
    p.x = destino ? destino.x : base.x;
    p.y = destino ? destino.y : base.y;
    p.mapaTransicaoAte = Date.now() + 500;
    p.instanciaId = s.instanciaId;
    solariEnviarA(pid, 'teleporte_confirmado', { mapa: 'solari', x: p.x, y: p.y, instanciaId: p.instanciaId, instanciaTipo: 'solari' });
}

function solariIniciar(pid) {
    if (SOLARI_TIPOS.length < 2) {
        solariEnviarA(pid, 'solari_aviso', { texto: 'A Arena de Solari ficará indisponível até haver monstros cadastrados.' });
        return false;
    }
    const s = solariSessaoDoJogador(pid);
    if (!s || s.fase !== 'recrutando') return false;
    if (s.liderId !== pid) return false;
    if (s.membros.length < 1) return false;
    const todosOk = s.membros.every(function (m) { return m.ok && players[m.id] && players[m.id].hp > 0; });
    if (!todosOk) return false;
    s.fase = 'contagem';
    s.contagemFimEm = Date.now() + 12000; // 12 segundos sincronizados com o áudio oficial
    s.contagemUltimoSeg = -1;
    s.membros.forEach(function (m) { if (players[m.id]) solariTeleportarParaSolari(m.id, s); });
    solariEnviarEstado(s);
    solariBroadcast(s, 'solari_contagem', { seg: 10, mensagem: '' });
    solariBroadcast(s, 'solari_banner', { texto: 'ARENA DE SOLARI', cor: '#c77dff', fim: false });
    return true;
}

function solariEscolherDoisTipos() {
    if (SOLARI_TIPOS.length < 2) throw new Error('[SOLARI] São necessários pelo menos dois tipos de monstros.');
    const t1 = SOLARI_TIPOS[Math.floor(Math.random() * SOLARI_TIPOS.length)];
    let t2 = t1;
    while (t2 === t1) t2 = SOLARI_TIPOS[Math.floor(Math.random() * SOLARI_TIPOS.length)];
    return [t1, t2];
}

function solariPosAleatoria() {
    const quad = Math.floor(Math.random() * 4);
    for (let tent = 0; tent < 24; tent++) {
        let x, y;
        if (quad === 0) { x = 63960 + Math.random() * 460; y = 160 + Math.random() * 320; }
        else if (quad === 1) { x = 64860 - Math.random() * 460; y = 160 + Math.random() * 320; }
        else if (quad === 2) { x = 63960 + Math.random() * 460; y = 1120 - Math.random() * 320; }
        else { x = 64860 - Math.random() * 460; y = 1120 - Math.random() * 320; }
        if (!mapaSolari.colideSolari(x, y, 12)) return { x: Math.round(x), y: Math.round(y) };
    }
    return { x: 64400, y: 620 };
}

function solariSpawnarUm(s, conf) {
    const tipo = s.tiposRound[Math.random() < 0.5 ? 0 : 1];
    const confBase = (spawnsAdmin && spawnsAdmin.TIPOS_MONSTROS[tipo]) || { aggroRange: 320, attackRange: 55, dano: 12, baseHp: 60, arquetipo: null };
    const elite = !!(conf.elite && !s.eliteSpawnou);
    if (elite) s.eliteSpawnou = true;
    const hpBase = Math.max(10, Math.round((confBase.baseHp || 60) * conf.hpMult));
    const danoBase = Math.max(1, Math.round((confBase.dano || 12) * conf.danoMult));
    const hp = elite ? hpBase * 3 : hpBase;
    const dano = elite ? danoBase * 3 : danoBase;
    const pos = solariPosAleatoria();
    const alvo = (function () {
        const vivos = s.membros.filter(function (m) { return players[m.id] && players[m.id].hp > 0; });
        return vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].id : null;
    })();
    const mob = {
        id: 'solari_' + (solariCounter++) + '_' + Date.now(),
        tipo: tipo,
        solari: true,
        solariInstanceId: s.instanciaId,
        instanciaId: s.instanciaId,
        elite: elite,
        escala: elite ? 1.5 : 1,
        x: pos.x, y: pos.y,
        origemX: pos.x, origemY: pos.y,
        hp: hp, maxHp: hp,
        targetId: alvo,
        respawnTimer: 0,
        attackCooldown: 0,
        stunTimer: 0,
        slowTimer: 0,
        dx: (Math.random() - 0.5) * 0.7,
        dy: (Math.random() - 0.5) * 0.7,
        patrolTimer: 0,
        patrulhaFase: Math.random() * Math.PI * 2,
        tabelaDano: {},
        aggroRange: Math.round((confBase.aggroRange || 320) * 1.25),
        attackRange: confBase.attackRange || 55,
        dano: dano,
        nivelMinimo: 1,
        arquetipo: confBase.arquetipo || null,
        velocidade: confBase.velocidade || 2.2,
        distanciaPreferida: confBase.distanciaPreferida,
        skillRange: confBase.skillRange || null,
        skillCooldown: Math.floor(30 + Math.random() * 90),
        skillCooldownMax: confBase.skillCooldown || 200,
        skillCharging: false,
        skillChargeTimer: 0,
        skillChargeMax: confBase.skillChargeMax || 20,
        skillAim: null,
        fleaDistance: null,
        fleeDistance: confBase.fleeDistance || null,
        poisonDuration: confBase.poisonDuration || 400,
        tags: Array.isArray(confBase.tags) ? confBase.tags.slice() : [],
        ignoreMapCollision: Array.isArray(confBase.tags) && confBase.tags.includes('voadores'),
        imuneControle: !!confBase.imuneControle,
        resistenciaControle: confBase.resistenciaControle || 0,
        invisivel: false,
        efeitos: [],
        flagPassivo: false,
        flagAgressivo: true,
        isHorda: false,
        retornandoAoLar: false,
        tauntTimer: 0,
        tauntId: null,
        fugindo: false
    };
    slimes.push(mob);
    s.spawned++;
    s.vivos++;
}

function solariLimparMonstros(s) {
    if (!s) return;
    for (let i = slimes.length - 1; i >= 0; i--) {
        if (slimes[i] && slimes[i].solari && slimes[i].solariInstanceId === s.instanciaId) slimes.splice(i, 1);
    }
    s.vivos = 0;
}

// Cada round sorteia 5 itens entre os membros APÓS a finalização do combate daquele round.
function solariIniciarSorteio(s) {
    if (!s || s.fase !== 'rodando') return;
    const classes = s.membros.map(function (m) { const p = players[m.id]; return p ? p.classe : 'guerreiro'; });
    const itens = [];
    for (let i = 0; i < 5; i++) {
        const classe = classes[Math.floor(Math.random() * classes.length)];
        const item = gerarEquipamentoParaDrop(classe, 0, 0, {
            bioma: 'Planície das Plantas (Santuário)',
            nivel: Math.max(1, Math.min(15, Math.round(s.membros.reduce(function (total, member) {
                return total + ((players[member.id] && players[member.id].level) || 1);
            }, 0) / Math.max(1, s.membros.length))))
        });
        if (item) itens.push(item);
    }
    if (!itens.length) {
        for (let i = 0; i < 5; i++) {
            const item = gerarEquipamentoParaDrop('guerreiro', 0, 0, {
                bioma: 'Planície das Plantas (Santuário)',
                nivel: 1
            });
            if (item) itens.push(item);
        }
    }
    const conf = SOLARI_ROUNDS[s.round - 1];
    if (!conf) { solariEncerrarSessao(s); return; }
    s.fase = 'leilao';
    s.leilao = { itens: itens, indice: 0, rolagens: {}, ultimaRolagemEm: 0, itemAbertoEm: Date.now(), estado: 'aberto', vencedorId: undefined };
    solariBroadcast(s, 'solari_leilao', { fase: 'abrir', indice: 1, total: itens.length, item: itens[0], classeBonus: true, round: s.round, roundsTotal: SOLARI_COORDS.rounds });
    solariBroadcast(s, 'solari_banner', { texto: '🎲 SORTEIO DA RODADA ' + s.round, cor: '#ffd700', fim: false });
    console.log('[SOLARI] round=' + s.round + ' sorteio pós-combate=' + itens.length + ' itens');
    solariEnviarEstado(s);
}

// Combate da rodada (inicia diretamente na entrada do round)
function solariComecarCombate(s) {
    if (!s) return;
    const conf = SOLARI_ROUNDS[s.round - 1];
    s.tiposRound = solariEscolherDoisTipos();
    s.spawned = 0;
    s.vivos = 0;
    s.eliteSpawnou = false;
    s.rodandoInicio = Date.now();
    s.proximoSpawnEm = Date.now() + 800;
    s.fase = 'rodando';
    solariBroadcast(s, 'solari_round', { round: s.round, total: conf ? conf.total : 0, elite: !!(conf && conf.elite) });
    solariBroadcast(s, 'solari_banner', { texto: '⚔️ ROUND ' + s.round + ' — OS MONSTROS ESTÃO CHEGANDO!', cor: '#ff7b00', fim: false });
    console.log('[SOLARI] round=' + s.round + ' combate iniciado (' + (conf ? conf.total : 0) + ' monstros)');
    solariEnviarEstado(s);
}

function solariMarcaMorte(pid) {
    const m = solariEmSessao(pid);
    if (!m) return;
    const p = players[pid];
    if (p && p.hp <= 0 && !m.mortoEm) {
        m.mortoEm = Date.now();
        m.morreuX = p.x;
        m.morreuY = p.y;
    }
}

function solariReviveNoLocal(pid) {
    const m = solariEmSessao(pid);
    if (m) { m.mortoEm = 0; m.morreuX = 0; m.morreuY = 0; }
}

function solariRemoverMembro(pid, motivo) {
    const s = solariSessaoDoJogador(pid);
    if (!s) return false;
    const idx = s.membros.findIndex(function (m) { return m.id === pid; });
    if (idx === -1) return false;
    s.membros.splice(idx, 1);
    if (players[pid]) players[pid].instanciaId = null;
    if (s.convites && s.convites[pid]) delete s.convites[pid];
    if (s.liderId === pid) s.liderId = s.membros.length ? s.membros[0].id : null;

    // Saída voluntária/respawn/timeout devolve o jogador para Davahl. Não deixa
    // um jogador sem sessão preso fisicamente dentro da faixa da Arena.
    const p = players[pid];
    if (p && motivo !== 'pvp' && motivo !== 'desconexao') {
        p.hp = p.maxHp;
        p.mana = p.maxMp;
        p.estamina = 100;
        const dest = encontrarPosicaoJogadorSegura(p, CIDADE_SPAWN_X, CIDADE_SPAWN_Y);
        p.x = dest ? dest.x : CIDADE_SPAWN_X;
        p.y = dest ? dest.y : CIDADE_SPAWN_Y;
        const ws = playerSockets[pid];
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'respawn_confirmado', mapa: 'cidade', x: p.x, y: p.y }));
        }
    }

    if (!s.membros.length) {
        solariEncerrarSessao(s);
        return true;
    }
    solariEnviarEstado(s);
    return true;
}

function solariEncerrarSessao(s) {
    if (!s) return;
    s.membros.forEach(function (m) { if (players[m.id]) players[m.id].instanciaId = null; });
    for (let i = slimes.length - 1; i >= 0; i--) {
        if (slimes[i] && slimes[i].solari && slimes[i].solariInstanceId === s.instanciaId) slimes.splice(i, 1);
    }
    solariSessoes.delete(s.instanciaId);
}

function solariVoltarCidade(pid) {
    const p = players[pid];
    if (!p) return;
    p.hp = p.maxHp;
    p.estamina = 100;
    p.mana = p.maxMp;
    p.stunTimer = 0;
    p.efeitos = [];
    // ===== DASH v2: estado por sessão (nada disso é salvo em disco) =====
    p.dashCdAte = 0;              // cooldown do dash, autoritativo (anti-exploit)
    p.dashAnim = null;            // animação de corrida/investida/arranque em curso
    limparDashGuarda(p);          // respawn não herda a guarda do dash anterior
    p.dashAte = 0;                // fim do buff de velocidade/invisibilidade
    p.dashAngulo = 0;
    p.dashVelocidadeMult = 1;
    p.escudoGuerreiro = null;     // escudo frontal SEGURADO
    p.dashBloqueiaAcoes = false;  // trava skills/ataque básico enquanto segura
    p.curandeiraAtordoada = false;
    p.reducaoAtordoada = 0;
    // Sniper: "roupa de camuflagem" (dash) x "camuflagem natural" (skill 4)
    p.snRoupaCamo = false;
    p.snRoupaCamoAte = 0;
    p.snCamuflado = false;
    p.snCamofladoAte = 0;
    const dest = encontrarPosicaoJogadorSegura(p, CIDADE_SPAWN_X, CIDADE_SPAWN_Y);
    p.x = dest ? dest.x : CIDADE_SPAWN_X;
    p.y = dest ? dest.y : CIDADE_SPAWN_Y;
    solariEnviarA(pid, 'respawn_confirmado', { mapa: 'cidade', x: p.x, y: p.y });
}

// Lógica da partida rodada a cada tick do servidor (50ms)
function atualizarSolari() {
    const agora = Date.now();
    for (const s of Array.from(solariSessoes.values())) atualizarSolariSessao(s, agora);
}

function atualizarSolariSessao(s, agora) {

    if (s.convites) {
        for (const cid in s.convites) {
            if (s.convites[cid].expiraEm < agora) delete s.convites[cid];
        }
    }

    // Morte: janela de 20s p/ ser revivido no local; senão volta pra cidade.
    if (s.membros.length) {
        const copia = s.membros.slice();
        for (const m of copia) {
            const p = players[m.id];
            if (m.mortoEm) {
                if (p && p.hp > 0) { m.mortoEm = 0; m.morreuX = 0; m.morreuY = 0; }
                else if (agora - m.mortoEm >= 20000) {
                    solariVoltarCidade(m.id);
                    solariRemoverMembro(m.id, 'tempo');
                }
            }
        }
        if (!solariSessoes.has(s.instanciaId)) return;
    }

    // Contagem regressiva de entrada (12s) → START (ROUND 1 direto no combate).
    if (s.fase === 'contagem') {
        const decorrido = agora - (s.contagemFimEm - 12000);
        const restante = Math.max(0, Math.min(10, 11 - Math.floor(decorrido / 1000)));
        if (restante !== s.contagemUltimoSeg) {
            s.contagemUltimoSeg = restante;
            solariBroadcast(s, 'solari_contagem', { seg: restante, mensagem: '' });
        }
        if (agora >= s.contagemFimEm) {
            s.round = 1;
            solariBroadcast(s, 'solari_contagem', { seg: 0, mensagem: '' });
            solariComecarCombate(s);
        }
        return;
    }

    // Rodando: nasce 1 monstro a cada 0.5s (0.3s com 10s de arena, 0.2s com 30s).
    if (s.fase === 'rodando') {
        const conf = SOLARI_ROUNDS[s.round - 1];
        if (conf) {
            const tempoRodando = agora - (s.rodandoInicio || agora);
            let intervalo = 500;
            if (tempoRodando >= 30000) intervalo = 200;
            else if (tempoRodando >= 10000) intervalo = 300;
            if (s.spawned < conf.total && agora >= s.proximoSpawnEm) {
                s.proximoSpawnEm = agora + intervalo;
                solariSpawnarUm(s, conf);
            }
            // Reconta os slimes Solari realmente vivos a cada tick: o round só é
            // dado como limpo quando NÃO resta nenhum (não depende só do contador).
            let vivosReais = 0;
            for (let i = 0; i < slimes.length; i++) {
                if (slimes[i] && slimes[i].solari && slimes[i].solariInstanceId === s.instanciaId && slimes[i].hp > 0) vivosReais++;
            }
            s.vivos = vivosReais;
            const roundCompleto = s.spawned >= conf.total && vivosReais <= 0;
            // Tempo máximo por round: se estourar, os monstros restantes morrem e o
            // round é dado como limpo e a partida segue até o round 9.
            const estourouTempo = tempoRodando >= 120000;
            if (roundCompleto || estourouTempo) {
                solariLimparMonstros(s);
                // Premiação só acontece APÓS a finalização de cada round
                solariIniciarSorteio(s);
            }
        }
        return;
    }

    // Transição entre rounds (10s com a mensagem piscando).
    if (s.fase === 'transicao') {
        const restante = Math.max(0, Math.ceil((s.transicaoFimEm - agora) / 1000));
        if (restante !== s.transicaoUltimoSeg) {
            s.transicaoUltimoSeg = restante;
            solariBroadcast(s, 'solari_contagem', { seg: restante, mensagem: 'PARABÉNS! BORA PRO PRÓXIMO ROUND!' });
        }
        if (agora >= s.transicaoFimEm) {
            s.round++;
            solariComecarCombate(s);
        }
        return;
    }

    // Sorteio da rodada: 5 itens, dados 1-100, +20 para a classe do item,
    // doação se ninguém rolar. Ocorre APÓS a finalização de cada round.
    if (s.fase === 'leilao' && s.leilao) {
        const L = s.leilao;
        const itemAtual = L.itens[L.indice];
        if (!itemAtual) {
            if (s.round >= SOLARI_COORDS.rounds) {
                s.fase = 'fim';
                s.fimEm = agora + 6000;
                solariBroadcast(s, 'solari_banner', { texto: '🏆 ARENA DE SOLARI CONCLUÍDA!', cor: '#ffd700', fim: true });
                solariEnviarEstado(s);
            } else {
                s.fase = 'transicao';
                s.transicaoFimEm = agora + 10000;
                s.transicaoUltimoSeg = -1;
                solariBroadcast(s, 'solari_contagem', { seg: 10, mensagem: 'PARABÉNS! BORA PRO PRÓXIMO ROUND!' });
                solariEnviarEstado(s);
            }
            return;
        }
        if (L.estado === 'aberto') {
            const todosRolaram = s.membros.every(function (m) { return L.rolagens[m.id] !== undefined; });
            const fimItem = todosRolaram ? (L.ultimaRolagemEm + 2200) : (L.itemAbertoEm + 30000);
            if (agora >= fimItem) {
                let vencedor = null, maior = -1;
                for (const m of s.membros) {
                    const dado = L.rolagens[m.id];
                    if (dado === undefined) continue;
                    const p = players[m.id];
                    let efetivo = dado;
                    if (itemAtual.classe && p && p.classe === itemAtual.classe) efetivo += 20;
                    if (efetivo > maior) { maior = efetivo; vencedor = m.id; }
                }
                if (!vencedor) {
                    const sorteado = s.membros[Math.floor(Math.random() * s.membros.length)];
                    vencedor = sorteado ? sorteado.id : null;
                }
                L.vencedorId = vencedor;
                L.doado = !s.membros.some(function (m) { return L.rolagens[m.id] !== undefined; });
                if (vencedor && itemAtual) {
                    adicionarAoInventario(vencedor, itemAtual);
                    syncInventario(vencedor);
                }
                const nick = vencedor && players[vencedor] ? players[vencedor].nome : '?';
                L.estado = 'resultado';
                L.estadoEm = agora;
                solariBroadcast(s, 'solari_leilao', {
                    fase: 'resultado',
                    indice: L.indice + 1,
                    total: L.itens.length,
                    item: itemAtual,
                    rolagens: L.rolagens,
                    vencedorId: vencedor,
                    vencedorNick: nick,
                    doado: !!L.doado,
                    round: s.round,
                    roundsTotal: SOLARI_COORDS.rounds
                });
            }
        } else if (L.estado === 'resultado') {
            if (agora - L.estadoEm >= 7000) {
                L.indice++;
                if (L.indice >= L.itens.length) {
                    // Sorteio pós-round finalizado!
                    if (s.round >= SOLARI_COORDS.rounds) {
                        s.fase = 'fim';
                        s.fimEm = agora + 6000;
                        solariBroadcast(s, 'solari_banner', { texto: '🏆 ARENA DE SOLARI CONCLUÍDA!', cor: '#ffd700', fim: true });
                        solariEnviarEstado(s);
                    } else {
                        s.fase = 'transicao';
                        s.transicaoFimEm = agora + 10000;
                        s.transicaoUltimoSeg = -1;
                        solariBroadcast(s, 'solari_contagem', { seg: 10, mensagem: 'PARABÉNS! BORA PRO PRÓXIMO ROUND!' });
                        solariEnviarEstado(s);
                    }
                } else {
                    L.estado = 'aberto';
                    L.rolagens = {};
                    L.ultimaRolagemEm = 0;
                    L.itemAbertoEm = agora;
                    L.vencedorId = undefined;
                    solariBroadcast(s, 'solari_leilao', { fase: 'abrir', indice: L.indice + 1, total: L.itens.length, item: L.itens[L.indice], classeBonus: true, round: s.round, roundsTotal: SOLARI_COORDS.rounds });
                }
            }
        }
        return;
    }

    // Fim: volta todos pra cidade e encerra a sessão.
    if (s.fase === 'fim') {
        if (agora >= s.fimEm) {
            s.membros.forEach(function (m) { solariVoltarCidade(m.id); });
            solariEncerrarSessao(s);
        }
        return;
    }

    // Recrutando: sessão ociosa encerra após 3 minutos.
    if (s.fase === 'recrutando' && agora - s.ultimaAtividade > 180000) {
        solariEncerrarSessao(s);
    }
}

function cancelarTrade(pid) {
    let p = players[pid];
    if (!p || !p.tradeId) return;
    let tid = p.tradeId;
    let trade = trades[tid];
    if (trade) {
        try {
            persistirRetornoTrade(trade);
        } catch (e) {
            console.error('[TRADE] Falha ao persistir cancelamento; itens permanecem em escrow:', e && e.stack ? e.stack : e);
            [trade.p1, trade.p2].forEach(function (playerId) {
                if (playerSockets[playerId] && playerSockets[playerId].readyState === WebSocket.OPEN) {
                    playerSockets[playerId].send(JSON.stringify({
                        type: 'trade_erro',
                        mensagem: 'Não foi possível persistir o cancelamento. Os itens foram mantidos na sessão de troca.'
                    }));
                }
            });
            return;
        }
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
    const atk0 = players[atkId];
    if (atk0 && !instanciaCompativel(atk0, p2)) return;
    // ===== ADMIN CHEAT: VIDA INFINITA (PVP) =====
    if (p2.adminCheats && p2.adminCheats.vidaInfinita) {
        p2.hp = p2.maxHp;
        return;
    }
    // LADINO — imune durante a Dança das Adagas (server-side, inclusive PvP)
    if (p2.ladinoDancaAtivo) return;
    // NOTA v1.60.1: `p2.imune` (Salto + Chuva do Alto, Arqueiro) NÃO é consultado
    // aqui de propósito — essa imunidade é PvE e não pode virar imunidade PvP.
    // LADINO — CAMUFLAGEM SOMBRIA: primeiro acerto em PvP também consome o bônus +100%
    let atk = players[atkId];
    // ===== ADMIN CHEAT: SUPER ATAQUE (PVP) =====
    if (atk && atk.adminCheats && atk.adminCheats.superAtaque) {
        dano = 9999999;
    }
    if (atk && atk.classe === 'ladino' && atk.ladinoInvisivel && atk.ladinoInvisivelBonus) {
        dano = Math.round(dano * 2);
        finalizarInvisibilidadeLadino(atk, atkId);
    }
    if (p2.classe === 'guerreiro' && p2.guerreiroBuffAte > Date.now()) {
        dano = Math.max(1, Math.round(dano * 0.70));
    }
    if (aliadoNaAura(atkId)) dano = Math.round(dano * 1.05);
    if (aliadoNaAura(defId)) dano = Math.round(dano * 0.90);
    if (p2 && p2.classe === 'guerreiro_kaledron') dano = Math.round(dano * 0.90); // Forja Solar
    // CÂNTICO CELESTIAL (Curandeira): espelha a regra dos monstros — quem está
    // sob o cântico causa e recebe +20% de dano pelos 10s do debuff.
    const agoraCantico = Date.now();
    if (p2.canticoDebuffExpires && p2.canticoDebuffExpires > agoraCantico) dano = Math.max(1, Math.round(dano * 1.20));
    if (atk && atk.canticoDebuffExpires && atk.canticoDebuffExpires > agoraCantico) dano = Math.max(1, Math.round(dano * 1.20));
    dano = itemSystem.reduzirDanoPelaDefesaEquipamento(
        p2.classe,
        p2.inventario && p2.inventario.slots || {},
        dano
    );
    p2.hp -= dano;
    if (p2.hp < 0) p2.hp = 0;
    if (atk && atk.classe === 'barbaro' && (atk.vinculoAtivo || (atk.vampirismoBonus && atk.vampirismoBonus > 0)) && atk.vinculoExpires > Date.now() && dano > 0) {
        let pctVamp = atk.vampirismoBonus || 0.20;
        aplicarCuraAoJogador(atkId, Math.max(1, Math.round(dano * pctVamp)));
    }
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
        // Arena de Solari: morreu por PvP → sai da partida de forma limpa
        if (solariEmSessao(defId)) {
            solariMarcaMorte(defId);
            solariRemoverMembro(defId, 'pvp');
        }
        p2.hp = p2.maxHp;
        const posicaoRessurgimento = encontrarPosicaoJogadorSegura(p2, CIDADE_SPAWN_X, CIDADE_SPAWN_Y);
        p2.x = posicaoRessurgimento ? posicaoRessurgimento.x : CIDADE_SPAWN_X;
        p2.y = posicaoRessurgimento ? posicaoRessurgimento.y : CIDADE_SPAWN_Y;
        const wsPvp = playerSockets[defId];
        if (wsPvp && wsPvp.readyState === WebSocket.OPEN) {
            wsPvp.send(JSON.stringify({ type: 'respawn_confirmado', mapa: 'cidade', x: p2.x, y: p2.y }));
        }
    }
}

// Atinge jogadores com PvP ligado. Por padrão é uma área CHEIA (360°) em volta de
// (x, y) — o comportamento das skills em área. Ataque básico corpo-a-corpo passa
// `ang` + `meiaAbertura` para restringirem o dano ao cone realmente animado.
// `mapaFixo` evita atingir jogadores do mapa vizinho (bandas de X encostadas).
function danoEmPlayers(x, y, raio, attackerId, dano, tipo = 'skill', cb = null, ang = null, meiaAbertura = null) {
    let p1 = players[attackerId];
    if (!p1 || !p1.pvpAtivo) return;
    const mapaAtk = mapaPorCoordenada(p1.x + PLAYER_OFFSET_X);
    for (let pId in players) {
        if (pId === attackerId) continue;
        let p2 = players[pId];
        if (!p2.pvpAtivo || p2.hp <= 0) continue;
        // Sem PvP entre mapas: as bandas de X são encostadas e o raio pode passar.
        if (mapaPorCoordenada(p2.x + PLAYER_OFFSET_X) !== mapaAtk) continue;
        if (!instanciaCompativel(p1, p2)) continue;
        if (Math.hypot(p2.x - x, p2.y - y) >= raio) continue;
        if (ang !== null && meiaAbertura !== null) {
            let angAteAlvo = Math.atan2(p2.y - y, p2.x - x);
            let diff = Math.atan2(Math.sin(angAteAlvo - ang), Math.cos(angAteAlvo - ang));
            if (Math.abs(diff) >= meiaAbertura) continue;
        }
        aplicarDanoPvP(attackerId, pId, dano, tipo);
        if (cb) cb(p2);
    }
}

// ============ SISTEMA DE BANDEIRAS DE SPAWN (Admin) ============
function posicaoBandeiraValida(flag, raio) {
    const conf = spawnsAdmin && spawnsAdmin.TIPOS_MONSTROS[flag.tipo];
    const usaBioma = !!(conf && conf.bioma);
    const minX = usaBioma ? LARGURA_MUNDO + 12 : 12;
    const maxX = usaBioma ? FIM_MUNDO - 12 : WORLD_WIDTH - 12;
    const maxY = usaBioma ? ALTO_MUNDO - 12 : WORLD_HEIGHT - 12;
    for (let t = 0; t < 8; t++) {
        let ang = Math.random() * Math.PI * 2;
        let dist = Math.random() * raio;
        let x = Math.max(minX, Math.min(maxX, flag.x + Math.cos(ang) * dist));
        let y = Math.max(12, Math.min(maxY, flag.y + Math.sin(ang) * dist));
        const biomaValido = !conf || !conf.bioma ||
            entidadeEmBiomaValido({ bioma: conf.bioma, raioColisao: conf.radius }, x, y);
        if (!estaNaAgua(x, y) && podeAndar(x, y) && biomaValido) return { x, y };
    }
    return { x: flag.x, y: flag.y };
}

function spawnMonstroBandeira(flag, instanciaId) {
    if (!spawnsAdmin) return;
    // BemVindo é mapa inicial/tutorial: nenhum spawn de bandeira pode nascer aqui.
    if (Number.isFinite(flag.x) && mapaPorCoordenada(flag.x) === 'bemvindo') return;
    const configMonstro = spawnsAdmin.TIPOS_MONSTROS[flag.tipo];
    if (configMonstro && configMonstro.bioma &&
        !entidadeEmBiomaValido({ bioma: configMonstro.bioma, raioColisao: configMonstro.radius }, flag.x, flag.y)) return;
    let ehBoss = spawnsAdmin.TIPOS_MONSTROS[flag.tipo] && spawnsAdmin.TIPOS_MONSTROS[flag.tipo].boss;
    const ehElite = !!(configMonstro && Array.isArray(configMonstro.tags) && configMonstro.tags.indexOf('elite') !== -1);
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
            let novoBoss = spawnsAdmin.criarBossBandeira(flag);
            if (mapaEhInstanciado(mapaPorCoordenada(flag.x))) novoBoss.instanciaId = instanciaId || null;
            bosses.push(novoBoss);
        }
        return;
    }

    let mob = slimes.find(s => s.flagId === flag.id && s.hp <= 0 && (!mapaEhInstanciado(mapaPorCoordenada(flag.x)) || s.instanciaId === instanciaId));
    if (mob) {
        let pos = posicaoBandeiraValida(flag, 60);
        mob.hp = calcularHpElite(flag.hpBase || (configMonstro && configMonstro.baseHp), ehElite);
        mob.maxHp = mob.hp;
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
        if (mapaEhInstanciado(mapaPorCoordenada(flag.x))) mob.instanciaId = instanciaId || null;
        if (mob.tipo === 'zumbi') {
            mob.skillCharging = false;
            mob.skillChargeTimer = 0;
            mob.skillCooldown = Math.floor(40 + Math.random() * 90);
            mob.skillAim = null;
        }
        if (mob.tipo === 'soldado_lanceiro') {
            mob.skillCharging = false;
            mob.skillChargeTimer = 0;
            mob.skillAim = null;
            mob.skillKind = null;
            mob.skillCooldown = Math.floor(70 + Math.random() * 80);
            mob.lanceiroDashing = false;
            mob.lanceiroDashFrames = 0;
            mob.lanceiroDashHit = false;
            mob.lanceiroBloqueando = false;
            mob.lanceiroBlockTimer = 0;
            mob.lanceiroBlockCooldown = 90;
        }
        notificarSpawnElite(mob);
    } else {
        let novoMob = spawnsAdmin.criarMonstroBandeira(flag);
        if (entidadeEhElite(novoMob)) {
            novoMob.maxHp = calcularHpElite(novoMob.maxHp, true);
            novoMob.hp = novoMob.maxHp;
        }
        if (mapaEhInstanciado(mapaPorCoordenada(flag.x))) novoMob.instanciaId = instanciaId || null;
        slimes.push(novoMob);
        notificarSpawnElite(novoMob);
    }
}

function preencherBandeira(flag, instanciaId) {
    if (!spawnsAdmin) return;
    const config = spawnsAdmin.TIPOS_MONSTROS[flag.tipo];
    if (config && config.maxQtd) flag.maxQtd = Math.min(flag.maxQtd, config.maxQtd);
    let ehBoss = spawnsAdmin.TIPOS_MONSTROS[flag.tipo] && spawnsAdmin.TIPOS_MONSTROS[flag.tipo].boss;
    let vivos = 0;
    if (ehBoss) {
        for (let b of bosses) if (b.flagId === flag.id && b.hp > 0 && (!mapaEhInstanciado(mapaPorCoordenada(flag.x)) || b.instanciaId === instanciaId)) vivos++;
    } else {
        for (let s of slimes) if (s.flagId === flag.id && s.hp > 0 && (!mapaEhInstanciado(mapaPorCoordenada(flag.x)) || s.instanciaId === instanciaId)) vivos++;
    }
    let faltando = flag.maxQtd - vivos;
    for (let i = 0; i < faltando && i < 60; i++) spawnMonstroBandeira(flag, instanciaId);
    if (mapaEhInstanciado(mapaPorCoordenada(flag.x)) && instanciaId) {
        if (!timersBandeiraInstancia[instanciaId]) timersBandeiraInstancia[instanciaId] = {};
        timersBandeiraInstancia[instanciaId][flag.id] = Math.max(1, Math.round(flag.respawnSeg * 20));
    } else {
        flag.timerRespawn = Math.max(1, Math.round(flag.respawnSeg * 20));
    }
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

// EDITOR "EDIT MOOB": reaplica a config editada nos monstros VIVOS do tipo
function aplicarConfigTipo(tipo) {
    if (!spawnsAdmin || !tipo) return;
    const conf = spawnsAdmin.getMonstroConfig(tipo);
    const campos = [
        'nome', 'emoji', 'baseHp', 'dano', 'defesa', 'block', 'aggroRange', 'attackRange',
        'velocidade', 'cadenciaAtk', 'velAtk', 'velProjetil', 'ehMelee', 'xpBase', 'escala',
        'cor', 'tags', 'imuneDebuffs', 'debuffsAplicados', 'buffsAplicados', 'efeitoVisual',
        'vfxCor', 'vfxIntensidade', 'drops'
    ];
    slimes.forEach(s => {
        if (s.tipo !== tipo) return;
        campos.forEach(c => { if (conf[c] !== undefined) s[c] = Array.isArray(conf[c]) ? conf[c].slice() : conf[c]; });
        if (conf.baseHp && !s.flagId) {
            let hpAlvo = Math.floor(conf.baseHp);
            s.maxHp = hpAlvo; if (s.hp > hpAlvo) s.hp = hpAlvo;
        }
    });
    bosses.forEach(b => {
        if (b.tipo !== tipo) return;
        campos.forEach(c => { if (conf[c] !== undefined) b[c] = Array.isArray(conf[c]) ? conf[c].slice() : conf[c]; });
        if (conf.baseHp && !b.flagId) { b.maxHp = Math.floor(conf.baseHp); if (b.hp > b.maxHp) b.hp = b.maxHp; }
    });

    // envia para os admins a config atualizada
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.ehAdminCliente) {
            client.send(JSON.stringify({ type: 'monstros_config', conf: spawnsAdmin.MONSTROS_EDITAVEIS, tags: spawnsAdmin.TAGS_MONSTRO }));
        }
    });
}

function validarEdicaoMob(data) {
    if (!data || !spawnsAdmin) return null;
    if (!data.tipo || !spawnsAdmin.MONSTROS_EDITAVEIS[data.tipo]) return null;
    let n = (v, mn, mx, d) => { let x = Number(v); return isFinite(x) ? Math.max(mn, Math.min(mx, x)) : d; };
    let c = spawnsAdmin.MONSTROS_EDITAVEIS[data.tipo];
    let novo = {};
    if (typeof data.nome === 'string') novo.nome = data.nome.slice(0, 40);
    if (typeof data.emoji === 'string') novo.emoji = data.emoji.slice(0, 4);
    if (data.baseHp !== undefined) novo.baseHp = n(data.baseHp, 1, 2000000, c.baseHp);
    if (data.dano !== undefined) novo.dano = n(data.dano, 0, 100000, c.dano);
    if (data.defesa !== undefined) novo.defesa = n(data.defesa, 0, 90, c.defesa || 0);
    if (data.block !== undefined) novo.block = n(data.block, 0, 90, c.block || 0);
    if (data.aggroRange !== undefined) novo.aggroRange = n(data.aggroRange, 20, 8000, c.aggroRange);
    if (data.attackRange !== undefined) novo.attackRange = n(data.attackRange, 0, 8000, c.attackRange);
    if (data.velocidade !== undefined) novo.velocidade = n(data.velocidade, 0.05, 60, c.velocidade);
    if (data.cadenciaAtk !== undefined) novo.cadenciaAtk = Math.floor(n(data.cadenciaAtk, 1, 600, c.cadenciaAtk));
    if (data.velAtk !== undefined) novo.velAtk = n(data.velAtk, 0.05, 40, c.velAtk || 1);
    if (data.velProjetil !== undefined) novo.velProjetil = n(data.velProjetil, 0.05, 120, c.velProjetil || 11);
    if (typeof data.ehMelee === 'boolean') novo.ehMelee = data.ehMelee;
    if (data.xpBase !== undefined) novo.xpBase = n(data.xpBase, 0, 10000000, c.xpBase);
    if (data.escala !== undefined) novo.escala = n(data.escala, 0.1, 9, c.escala || 1);
    if (typeof data.cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.cor)) novo.cor = data.cor;
    if (Array.isArray(data.tags)) {
        const tagsValidas = spawnsAdmin.TAGS_MONSTRO || {};
        novo.tags = data.tags.filter(function (tag) {
            return typeof tag === 'string' && Object.prototype.hasOwnProperty.call(tagsValidas, tag);
        }).slice(0, Object.keys(tagsValidas).length);
    }
    if (Array.isArray(data.imuneDebuffs)) novo.imuneDebuffs = data.imuneDebuffs.filter(x => typeof x === 'string').slice(0, 40);
    if (Array.isArray(data.debuffsAplicados)) novo.debuffsAplicados = data.debuffsAplicados.filter(d => d && typeof d === 'object' && d.id).slice(0, 12);
    if (Array.isArray(data.buffsAplicados)) novo.buffsAplicados = data.buffsAplicados.filter(d => d && typeof d === 'object' && d.id).slice(0, 12);
    if (typeof data.efeitoVisual === 'string') novo.efeitoVisual = data.efeitoVisual.slice(0, 40);
    if (typeof data.vfxCor === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.vfxCor)) novo.vfxCor = data.vfxCor;
    if (data.vfxIntensidade !== undefined) novo.vfxIntensidade = n(data.vfxIntensidade, 0.1, 6, c.vfxIntensidade || 1);
    if (Array.isArray(data.drops)) novo.drops = data.drops.filter(d => d && typeof d === 'object' && typeof d.item === 'string' && isFinite(Number(d.chance))).map(d => ({ item: String(d.item).slice(0, 20), chance: Math.max(0, Math.min(100, Number(d.chance))) })).slice(0, 24);
    return novo;
}

function atualizarBandeirasSpawn() {
    if (!spawnsAdmin) return;
    if (!bandeirasInicializadas) {
        for (let flag of bandeirasSpawn) {
            const mapaFlag = mapaPorCoordenada(flag.x);
            // Mapas instanciados só geram mobs quando existe uma instância ativa.
            if (!mapaEhInstanciado(mapaFlag)) preencherBandeira(flag);
        }
        bandeirasInicializadas = true;
        return;
    }
    for (let flag of bandeirasSpawn) {
        const mapaFlag = mapaPorCoordenada(flag.x);
        if (mapaEhInstanciado(mapaFlag)) {
            Object.values(instanciasMapa).filter(i => i.mapaId === mapaFlag && i.membros.size > 0).forEach(function (instancia) {
                const iid = instancia.id;
                if (!timersBandeiraInstancia[iid]) timersBandeiraInstancia[iid] = {};
                if (timersBandeiraInstancia[iid][flag.id] == null) timersBandeiraInstancia[iid][flag.id] = 0;
                if (timersBandeiraInstancia[iid][flag.id] > 0) {
                    timersBandeiraInstancia[iid][flag.id]--;
                    return;
                }
                preencherBandeira(flag, iid);
            });
            continue;
        }
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
        nomeBioma = 'Pantanal';
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
        let confEdit = (spawnsAdmin && typeof spawnsAdmin.getMonstroConfig === 'function') ? spawnsAdmin.getMonstroConfig(mobTipo) : null;
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
            isHorda: true,
            defesa: confEdit ? (confEdit.defesa || 0) : 0,
            block: confEdit ? (confEdit.block || 0) : 0,
            xpBase: confEdit ? (confEdit.xpBase || 35) : 35,
            escala: confEdit ? (confEdit.escala || 1) : 1,
            velAtk: confEdit ? (confEdit.velAtk || 1) : 1,
            velProjetil: confEdit ? (confEdit.velProjetil || 11) : 11,
            cadenciaAtk: confEdit ? (confEdit.cadenciaAtk || 45) : 45,
            ehMelee: confEdit ? confEdit.ehMelee !== false : true,
            imuneDebuffs: (confEdit && Array.isArray(confEdit.imuneDebuffs)) ? confEdit.imuneDebuffs.slice() : [],
            debuffsAplicados: (confEdit && Array.isArray(confEdit.debuffsAplicados)) ? confEdit.debuffsAplicados.slice() : [],
            buffsAplicados: (confEdit && Array.isArray(confEdit.buffsAplicados)) ? confEdit.buffsAplicados.slice() : [],
            efeitoVisual: confEdit ? (confEdit.efeitoVisual || 'none') : 'none',
            vfxCor: confEdit ? (confEdit.vfxCor || '#ffffff') : '#ffffff',
            vfxIntensidade: confEdit ? (confEdit.vfxIntensidade || 1) : 1,
            drops: (confEdit && Array.isArray(confEdit.drops)) ? confEdit.drops.slice() : []
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
        const usaBioma = !!tipoConfig.bioma;
        x = Math.max(usaBioma ? LARGURA_MUNDO + 12 : 12,
            Math.min(usaBioma ? FIM_MUNDO - 12 : WORLD_WIDTH - 12, x));
        y = Math.max(12, Math.min(usaBioma ? ALTO_MUNDO - 12 : WORLD_HEIGHT - 12, y));
        if (estaNaAgua(x, y) || !podeAndar(x, y)) return null;
        if (tipoConfig.bioma &&
            !entidadeEmBiomaValido({ bioma: tipoConfig.bioma, raioColisao: tipoConfig.radius }, x, y)) return null;
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
    if (!ogro || !dano || dano <= 0 || ogro.imune || ogro.sismicoAtivo) return;

    let p = players[pid];
    // Carapaça Colossal (Tier 1 A): reduz todo dano recebido pelo Golem em 20%
    if (p && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(p.skillUpgrades, 'colossal', 1, 'A')) {
        dano = Math.max(1, Math.round(dano * 0.80));
    }

    // Último Bastião (Tier 4 A): sobrevive com 10% de HP e ganha 1.2s de imunidade (1x por ativação do Colossal)
    if (ogro.colossalAtivo && p && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(p.skillUpgrades, 'colossal', 4, 'A') && !ogro.ultimoBastiaoUsado) {
        if (ogro.hp - dano <= 0) {
            ogro.ultimoBastiaoUsado = true;
            ogro.hp = Math.max(1, Math.round(ogro.maxHp * 0.10));
            ogro.imune = true;
            setTimeout(() => { if (ogro) ogro.imune = false; }, 1200);
            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ type: 'action_summoner_ultimo_bastiao', x: Math.round(ogro.x), y: Math.round(ogro.y), duracao: 1200 }));
                }
            });
            broadcastDanoNoOgro(x, y, dano);
            return;
        }
    }

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
    // EDITOR "EDIT MOOB": XP do boss é configurável (padrão: 1500)
    let xpBase = (boss && boss.xpBase) || 1500;
    let xpPorPessoa = Math.max(100, Math.floor(xpBase / beneficiariosArr.length));
    xpPorPessoa = Math.floor(xpPorPessoa * 1.2); 

    beneficiariosArr.forEach(pid => {
        let p = players[pid];
        let wsTarget = playerSockets[pid];
        if (p && wsTarget && wsTarget.readyState === WebSocket.OPEN) {
            // Anti-hack: o level-up é creditado pelo servidor a partir do XP
            // que ELE mesmo concessionou, e sanitizarLevelXp() garante que um xp
            // inflado (do disco ou de qualquer origem) nunca dispare dozens de
            // pontos de atributo/skill de uma vez.
            let subiuLevel = concederXpSeguro(p, xpPorPessoa);

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
    if (!spawnsAdmin || !spawnsAdmin.TIPOS_MONSTROS.golem_pedra) return;
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
    const passo = velocidadeMovimentoMonstro(velocidade * fatorLentidao);
    return moverMonstroDirecionalComDesvio(slime, dx, dy, passo, { bloquearPets: true, limitarDistancia: true });
}

// ===== COLISÃO DOS PETs/LACAIOS (Ogro/Golem do Summoner) =====
// O lacaio respeita os grids de colisão de cada bioma + objetos do mapa
// (como o jogador) e o corpo dos inimigos (slimes/bosses).
const PET_COLLISION_RADIUS = 24;
const PET_DISTANCIA_INIMIGO = 30;      // distância mínima do corpo dos slimes
const PET_DISTANCIA_BOSS = 34;         // bosses são maiores
// DG Castelo: a passagem secreta da Câmara Secreta tem 1 tile (40px) de largura,
// então o pet usa um raio menor para ainda conseguir atravessá-la.
const PET_COLLISION_RADIUS_CASTELO = 12;

function posicaoPetValida(ox, oy) {
    if (!Number.isFinite(ox) || !Number.isFinite(oy)) return false;
    if (ox < 0 || oy < 0) return false;
    // O mundo de biomas ocupa coordenadas que se sobrepõem às antigas faixas
    // de mapas. Ele precisa ser resolvido antes dos fallbacks legados.
    if (ox >= LARGURA_MUNDO && ox < FIM_MUNDO) {
        if (oy < TOPO_MUNDO || oy >= ALTO_MUNDO) return false;
        if (mapaMundo && mapaMundo.colideMundo(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('mundo', ox, oy, PET_COLLISION_RADIUS)) return false;
        return !colideObstaculosCustomizados('mundo', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox < LARGURA_VERDE) {
        if (oy >= ALTO_VERDE) return false;
        return !colideObstaculosCustomizados('green', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox < LARGURA_DESERTO) {
        if (oy >= ALTO_DESERTO) return false;
        if (mapaDeserto && mapaDeserto.colideDeserto(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('desert', ox, oy)) return false;
        return !colideObstaculosCustomizados('desert', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox < LARGURA_PANTANO) {
        if (oy >= ALTO_PANTANO) return false;
        if (mapaPantano && mapaPantano.colidePantano(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('pantano', ox, oy)) return false;
        return !colideObstaculosCustomizados('pantano', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox < FIM_CAVERNA) {
        if (oy >= ALTO_CAVERNA) return false;
        if (mapaCaverna && mapaCaverna.colideCaverna(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('caverna', ox, oy)) return false;
        return !colideObstaculosCustomizados('caverna', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox < FIM_CIDADE) {
        if (oy >= ALTO_CIDADE) return false;
        if (mapaCidade && mapaCidade.colideCidade(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('cidade', ox, oy)) return false;
        return !colideObstaculosCustomizados('cidade', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox >= LARGURA_SOLARI && ox < FIM_SOLARI) {
        if (oy >= ALTO_SOLARI) return false;
        if (mapaSolari && mapaSolari.colideSolari(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('solari', ox, oy)) return false;
        return !colideObstaculosCustomizados('solari', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox >= LARGURA_CIDADE_PERDIDA && ox < FIM_CIDADE_PERDIDA) {
        if (oy >= ALTO_CIDADE_PERDIDA) return false;
        if (mapaCidadePerdida && mapaCidadePerdida.colideCidadePerdida(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('cidadeperdida', ox, oy)) return false;
        return !colideObstaculosCustomizados('cidadeperdida', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox >= LARGURA_TESTE_VISUAL && ox < FIM_TESTE_VISUAL) {
        if (oy >= ALTO_TESTE_VISUAL) return false;
        if (mapaTesteVisual && mapaTesteVisual.colide(ox, oy, PET_COLLISION_RADIUS)) return false;
        return !colideObstaculosCustomizados('testevisual', ox, oy, PET_COLLISION_RADIUS);
    }
    if (ox >= LARGURA_ZONA_ZERO && ox < FIM_ZONA_ZERO) {
        if (oy >= ALTO_ZONA_ZERO) return false;
        if (mapaZonaZero && mapaZonaZero.colideZonaZero(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('zonazero', ox, oy)) return false;
        return !colideObstaculosCustomizados('zonazero', ox, oy, PET_COLLISION_RADIUS);
    }
    // DG «Castelo Anda 1» — SEM este ramo o pet nascia e ficava CONGELADO dentro do
    // castelo (todas as posições caíam no `return false` final). Raio menor que o
    // global porque a passagem secreta da Câmara Secreta tem apenas 1 tile (40px).
    if (ox >= LARGURA_CASTELO && ox < FIM_CASTELO) {
        if (oy >= ALTO_CASTELO) return false;
        if (mapaCastelo && mapaCastelo.colideCastelo(ox, oy, PET_COLLISION_RADIUS_CASTELO)) return false;
        if (colisaoObjetosDoMapa('castelo', ox, oy)) return false;
        return !colideObstaculosCustomizados('castelo', ox, oy, PET_COLLISION_RADIUS_CASTELO);
    }
    // Ilha BemVindo — o Golem do Summoner também precisa usar a colisão genérica
    // do novo mapa; sem este ramo o pet nascia, mas qualquer movimento ficava bloqueado.
    if (ox >= LARGURA_BEMVINDO && ox < FIM_BEMVINDO) {
        if (oy >= ALTO_BEMVINDO) return false;
        if (colisaoObjetosDoMapa('bemvindo', ox, oy)) return false;
        return !colideObstaculosCustomizados('bemvindo', ox, oy, PET_COLLISION_RADIUS);
    }
    // Floresta dos Sussurros — o pet também respeita o grid exclusivo do bioma.
    if (ox >= LARGURA_FLORESTA && ox < FIM_FLORESTA) {
        if (oy >= ALTO_FLORESTA) return false;
        if (mapaFloresta && mapaFloresta.colideFloresta(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('floresta', ox, oy)) return false;
        return !colideObstaculosCustomizados('floresta', ox, oy, PET_COLLISION_RADIUS);
    }
    // Floresta dos Nebulos — idem (grid + objetos do editor)
    if (ox >= LARGURA_NEBOLOS && ox < FIM_NEBOLOS) {
        if (oy >= ALTO_NEBOLOS) return false;
        if (mapaNebulos && mapaNebulos.colideNebulos(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('nebulos', ox, oy)) return false;
        return !colideObstaculosCustomizados('nebulos', ox, oy, PET_COLLISION_RADIUS);
    }
    // Floresta Abissal — o pet respeita o grid e colisões do bioma
    if (ox >= LARGURA_ABISSAL && ox < FIM_ABISSAL) {
        if (oy >= ALTO_ABISSAL) return false;
        if (mapaAbissal && mapaAbissal.colideAbissal(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('abissal', ox, oy)) return false;
        return !colideObstaculosCustomizados('abissal', ox, oy, PET_COLLISION_RADIUS);
    }
    // Pântano Sombrio — o pet respeita o grid e colisões do bioma
    if (ox >= LARGURA_PANTANO_SOMBRIO && ox < FIM_PANTANO_SOMBRIO) {
        if (oy >= ALTO_PANTANO_SOMBRIO) return false;
        if (mapaPantanoSombrio && mapaPantanoSombrio.colidePantanoSombrio(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('pantano_sombrio', ox, oy)) return false;
        return !colideObstaculosCustomizados('pantano_sombrio', ox, oy, PET_COLLISION_RADIUS);
    }
    // TileTeste — o pet respeita o terreno e relevo procedural
    if (ox >= LARGURA_TILETESTE && ox < FIM_TILETESTE) {
        if (oy >= ALTO_TILETESTE) return false;
        if (mapaTileTeste && mapaTileTeste.colideTileTeste(ox, oy, PET_COLLISION_RADIUS)) return false;
        if (colisaoObjetosDoMapa('tileteste', ox, oy)) return false;
        return !colideObstaculosCustomizados('tileteste', ox, oy, PET_COLLISION_RADIUS);
    }
    return false;
}

// O corpo dos inimigos bloqueia o pet (ignorarId = slime/boss que ele já está atacando)
function petColideComInimigo(ox, oy, ignorarId) {
    for (let i = 0; i < slimes.length; i++) {
        const s = slimes[i];
        if (s.hp <= 0 || (ignorarId && s.id === ignorarId)) continue;
        const dx = s.x - ox, dy = s.y - oy;
        if (dx * dx + dy * dy < PET_DISTANCIA_INIMIGO * PET_DISTANCIA_INIMIGO) return true;
    }
    for (let i = 0; i < bosses.length; i++) {
        const b = bosses[i];
        if (b.hp <= 0 || (ignorarId && b.id === ignorarId)) continue;
        const dx2 = b.x - ox, dy2 = b.y - oy;
        if (dx2 * dx2 + dy2 * dy2 < PET_DISTANCIA_BOSS * PET_DISTANCIA_BOSS) return true;
    }
    return false;
}

// Move o pet com colisão de Mapa + Inimigos (desliza nas paredes em vez de travar).
// Se ficar totalmente bloqueado por ~1,25s (ex.: atrás de uma multidão de slimes),
// libera o atravessamento de inimigos por 1s para nunca ficar preso — mas a colisão
// com o MAPA (paredes/obstáculos) é SEMPRE respeitada.
function moverPetComColisao(ogro, dx, dy, passo, ignorarInimigoId) {
    const dist = Math.hypot(dx, dy) || 1;
    const nx = (dx / dist) * passo;
    const ny = (dy / dist) * passo;
    const atravessar = (ogro.atravessarInimigos || 0) > 0;
    if (posicaoPetValida(ogro.x + nx, ogro.y + ny) && (atravessar || !petColideComInimigo(ogro.x + nx, ogro.y + ny, ignorarInimigoId))) {
        ogro.x += nx; ogro.y += ny;
        ogro.petBloqueioTicks = 0;
        if (atravessar) ogro.atravessarInimigos--;
        return;
    }
    if (nx !== 0 && posicaoPetValida(ogro.x + nx, ogro.y) && (atravessar || !petColideComInimigo(ogro.x + nx, ogro.y, ignorarInimigoId))) {
        ogro.x += nx;
        ogro.petBloqueioTicks = 0;
        if (atravessar) ogro.atravessarInimigos--;
        return;
    }
    if (ny !== 0 && posicaoPetValida(ogro.x, ogro.y + ny) && (atravessar || !petColideComInimigo(ogro.x, ogro.y + ny, ignorarInimigoId))) {
        ogro.y += ny;
        ogro.petBloqueioTicks = 0;
        if (atravessar) ogro.atravessarInimigos--;
        return;
    }
    ogro.petBloqueioTicks = (ogro.petBloqueioTicks || 0) + 1;
    if (ogro.petBloqueioTicks > 25) {
        ogro.petBloqueioTicks = 0;
        ogro.atravessarInimigos = 20; // atravessa a multidão por ~1s
    }
}

// O pet bloqueia monstros (slimes) que tentem atravessar o corpo dele
function petBloqueiaMonstro(slime, proximoX, proximoY) {
    for (let pid in lacaios) {
        const ogro = lacaios[pid];
        if (!ogro) continue;
        if (slime.targetId === pid) continue; // monstro que já está atacando o pet não é bloqueado
        const somaRaios = PET_COLLISION_RADIUS + (slime.raioColisao || 16);
        // Se o monstro já está DENTRO do corpo (ex.: nasceu por cima), deixa ele sair — nunca prende.
        const dxAtual = slime.x - ogro.x, dyAtual = slime.y - ogro.y;
        if (dxAtual * dxAtual + dyAtual * dyAtual < somaRaios * somaRaios) continue;
        const dx = proximoX - ogro.x, dy = proximoY - ogro.y;
        if (dx * dx + dy * dy < somaRaios * somaRaios) return true;
    }
    return false;
}

function petRuntimeDoId(petId) {
    return petId && Object.prototype.hasOwnProperty.call(petsAtivos, petId) ? petsAtivos[petId] : null;
}

function petProfileForClient(owner) {
    if (!owner || !owner.petProfile) return null;
    return {
        pets: owner.petProfile.pets,
        bestiario: owner.petProfile.bestiario,
        maestria: owner.petProfile.maestria,
        petActiveId: owner.petActiveId || null,
        species: petSystem.listMonsterSpecies().map(function (species) {
            return {
                species_id: species.species_id,
                nome: species.nome,
                tipo: species.tipo,
                asset: species.visual && species.visual.asset ? species.visual.asset : null,
                cor: species.visual && species.visual.cor ? species.visual.cor : '#ffffff',
                capturavel: species.capturavel,
                habitat: species.habitat || null,
                skills: Array.isArray(species.skills) ? species.skills : []
            };
        })
    };
}

function posicaoSeguraPet(owner, pet) {
    if (!owner) return null;
    const centroX = owner.x + PLAYER_OFFSET_X;
    const centroY = owner.y + PLAYER_OFFSET_Y;
    for (let raio = 42; raio <= 126; raio += 28) {
        for (let i = 0; i < 12; i++) {
            const angulo = (Math.PI * 2 * i) / 12;
            const x = centroX + Math.cos(angulo) * raio;
            const y = centroY + Math.sin(angulo) * raio;
            if (!posicaoPetValida(x, y) || petColideComInimigo(x, y, pet && pet.targetId)) continue;
            const outroPet = Object.values(petsAtivos).some(function (ativo) {
                return ativo !== pet && ativo.hp > 0 && Math.hypot(ativo.x - x, ativo.y - y) < PET_COLLISION_RADIUS * 1.5;
            });
            if (!outroPet) return { x: x, y: y };
        }
    }
    return null;
}

function spawnPetRuntime(ownerId, petInstance) {
    const owner = players[ownerId];
    if (!owner || owner.hp <= 0 || !petInstance || !petInstance.pet_instance_id) return null;
    const existingPetIds = owner.petProfile && Array.isArray(owner.petProfile.pets)
        ? owner.petProfile.pets.filter(function (pet) {
            return pet && pet !== petInstance;
        }).map(function (pet) { return pet.pet_instance_id; })
        : [];
    try {
        petSystem.validatePetInstance(petInstance, existingPetIds);
    } catch (error) {
        console.error('[PET] Instância persistida inválida; runtime não criado:', ownerId, error.message);
        return null;
    }
    const species = petSystem.getSpeciesById(petInstance.species_id);
    if (!species || !species.capturavel) return null;
    const alreadyActive = petRuntimeDoId(petInstance.pet_instance_id);
    if (alreadyActive) {
        if (alreadyActive.owner_id === ownerId) return alreadyActive;
        delete petsAtivos[alreadyActive.pet_instance_id];
    }
    for (const active of Object.values(petsAtivos)) {
        if (active.owner_id === ownerId) delete petsAtivos[active.pet_instance_id];
    }

    const position = posicaoSeguraPet(owner, null);
    if (!position) return null;
    const monsterConfig = species.monster_data || {};
    const level = Math.max(1, Number(petInstance.level || petInstance.pet_level) || 1);
    const maxHp = Math.max(1, Math.round((Number(monsterConfig.baseHp) || 80) *
        (1 + Math.min(50, level - 1) * 0.04)));
    const persistedDead = Number(petInstance.hp) <= 0 ||
        petInstance.state === petAi.PET_STATES.DEAD ||
        petInstance.state === petAi.PET_STATES.RESPAWN;
    const runtime = Object.assign({}, petInstance, {
        id: petInstance.pet_instance_id,
        type: 'pet',
        tipo: species.species_id,
        owner_id: ownerId,
        ownerId: ownerId,
        x: position.x,
        y: position.y,
        hp: persistedDead ? 0 : maxHp,
        maxHp: maxHp,
        state: persistedDead ? petAi.PET_STATES.DEAD : petAi.PET_STATES.FOLLOW,
        mode: ['ATK', 'DEFESA', 'PARADO'].includes(String(petInstance.mode || '').toUpperCase())
            ? String(petInstance.mode).toUpperCase()
            : 'ATK',
        attackRange: Math.max(24, Number(monsterConfig.attackRange) || 48),
        attackDamage: Math.max(1, Number(monsterConfig.dano) || 8),
        inheritedAttackSkill: species.combat_profile && species.combat_profile.petAttackSkill
            ? Object.assign({}, species.combat_profile.petAttackSkill)
            : null,
        attackCooldownMs: Math.max(500, Number(
            species.combat_profile && species.combat_profile.petAttackSkill &&
            species.combat_profile.petAttackSkill.cooldownMs
        ) || (Number(monsterConfig.cadenciaAtk) || 45) * 50),
        nextAttackAt: 0,
        inheritedSkills: species.skills,
        visual: species.visual,
        asset: species.visual && species.visual.asset ? species.visual.asset : null,
        animationState: persistedDead ? 'DEAD' : 'IDLE',
        animationStartedAt: 0,
        animationUntil: 0,
        moving: false,
        aiEstado: 'idle',
        aiAtacandoAte: 0,
        angulo: 0,
        escala: Number(monsterConfig.escala) || 1,
        tags: Array.isArray(monsterConfig.tags) ? monsterConfig.tags.slice() : [],
        instanciaId: owner.instanciaId || null,
        solari: !!solariEmSessao(ownerId),
        solariInstanceId: owner.instanciaId || null,
        lastProgressAt: Date.now(),
        stuckMs: 0,
        targetId: null,
        respawnAt: persistedDead
            ? Math.max(Date.now(), Number(petInstance.respawnAt) || 0)
            : 0
    });
    petsAtivos[runtime.pet_instance_id] = runtime;
    return runtime;
}

function despawnPetsDoOwner(ownerId) {
    const petIds = new Set();
    for (const petId of Object.keys(petsAtivos)) {
        const pet = petsAtivos[petId];
        if (pet && pet.owner_id === ownerId) {
            petIds.add(pet.pet_instance_id);
            delete petsAtivos[petId];
        }
    }
    slimes.forEach(function (monster) {
        if (monster && petIds.has(monster.targetId)) {
            monster.targetId = null;
            monster.ataqueTelegraph = null;
        }
    });
    for (let index = projeteis.length - 1; index >= 0; index--) {
        if (projeteis[index] && petIds.has(projeteis[index].petAlvo)) projeteis.splice(index, 1);
    }
}

function syncPetRuntimeToProfile(runtime) {
    const owner = runtime && players[runtime.owner_id];
    if (!owner || !owner.petProfile || !Array.isArray(owner.petProfile.pets)) return;
    const persisted = owner.petProfile.pets.find(function (pet) {
        return pet && pet.pet_instance_id === runtime.pet_instance_id;
    });
    if (!persisted) return;
    persisted.mode = runtime.mode;
    persisted.hp = runtime.hp;
    persisted.maxHp = runtime.maxHp;
    persisted.state = runtime.state;
    persisted.respawnAt = runtime.respawnAt;
}

function applyDamageToCapturedPet(runtime, damage, source) {
    if (!runtime || !petsAtivos[runtime.pet_instance_id] || runtime.state === petAi.PET_STATES.DEAD ||
        runtime.state === petAi.PET_STATES.RESPAWN || runtime.hp <= 0) return false;
    const owner = players[runtime.owner_id];
    if (!owner || owner.hp <= 0) return false;
    const amount = Math.max(0, Math.floor(Number(damage) || 0));
    if (!amount) return false;
    runtime.hp = Math.max(0, runtime.hp - amount);
    runtime.lastDamageSource = source || null;
    runtime.animationStartedAt = Date.now();
    runtime.animationUntil = runtime.animationStartedAt + 450;
    if (runtime.hp <= 0) {
        runtime.hp = 0;
        runtime.state = petAi.PET_STATES.DEAD;
        runtime.animationState = 'DEAD';
        runtime.deadAt = Date.now();
        runtime.respawnAt = runtime.deadAt + petAi.PET_DEFAULT_CONFIG.respawnDelayMs;
        runtime.targetId = null;
        runtime.ataqueTelegraph = null;
        runtime.moving = false;
        runtime.aiEstado = 'idle';
    } else {
        runtime.animationState = 'HIT';
        runtime.aiAtacandoAte = 0;
    }
    syncPetRuntimeToProfile(runtime);
    return true;
}

function validarOwnerPet(ownerId, runtime) {
    const owner = runtime && players[runtime.owner_id];
    return !!(ownerId && runtime && owner && owner.hp > 0 && runtime.hp > 0 &&
        runtime.state !== petAi.PET_STATES.DEAD &&
        runtime.state !== petAi.PET_STATES.RESPAWN &&
        runtime.owner_id === ownerId &&
        instanciaCompativel(owner, runtime));
}

function aplicarDanoAtaquePet(ownerId, targetType, targetId, damage, attackKind) {
    const owner = players[ownerId];
    if (!owner || owner.hp <= 0 || !damage) return false;
    if (targetType === 'slime') {
        const target = slimes.find(function (mob) { return mob && mob.id === targetId && mob.hp > 0; });
        if (!target || !instanciaCompativel(owner, target)) return false;
        return registrarDanoMonstro(target, ownerId, damage, 'pet').dano > 0;
    }
    if (targetType === 'boss') {
        const target = bosses.find(function (boss) { return boss && boss.id === targetId && boss.hp > 0; });
        if (!target || !instanciaCompativel(owner, target)) return false;
        return registrarDanoBoss(target, ownerId, damage, attackKind === 'basico' ? 'basico' : 'skill', 'pet').dano > 0;
    }
    if (targetType === 'player') {
        const target = players[targetId];
        if (!target || !pvpPodeAtacar(ownerId, targetId) || !instanciaCompativel(owner, target)) return false;
        const calculated = calcularDanoJogador(ownerId, damage, 'pet', target).dano;
        aplicarDanoPvP(ownerId, targetId, calculated, 'pet');
        return true;
    }
    if (targetType === 'pet') {
        const target = petRuntimeDoId(targetId);
        if (!target || target.owner_id === ownerId || !pvpPodeAtacar(ownerId, target.owner_id) ||
            !instanciaCompativel(owner, target)) return false;
        const calculated = calcularDanoJogador(ownerId, damage, 'pet', target).dano;
        return applyDamageToCapturedPet(target, calculated, 'pet:' + ownerId);
    }
    return false;
}

function escolherAlvoPet(runtime, owner) {
    const ownerId = runtime.owner_id;
    const species = petSystem.getSpeciesById(runtime.species_id);
    const acquireRange = Math.max(180, Number(species && species.combat_profile && species.combat_profile.skillRange) || 320);
    const monsters = slimes.concat(bosses).filter(function (mob) {
        if (!mob || mob.hp <= 0 || !instanciaCompativel(runtime, mob)) return false;
        if (runtime.mode === 'DEFESA') {
            return mob.targetId === ownerId &&
                Math.hypot(mob.x - (owner.x + PLAYER_OFFSET_X), mob.y - (owner.y + PLAYER_OFFSET_Y)) <= acquireRange;
        }
        return runtime.mode === 'ATK' && Math.hypot(mob.x - runtime.x, mob.y - runtime.y) <= acquireRange;
    });
    const targets = monsters.map(function (mob) {
        const point = runtime.mode === 'DEFESA'
            ? { x: owner.x + PLAYER_OFFSET_X, y: owner.y + PLAYER_OFFSET_Y }
            : runtime;
        return {
            type: bosses.includes(mob) ? 'boss' : 'slime',
            entity: mob,
            distance: Math.hypot(mob.x - point.x, mob.y - point.y)
        };
    });
    if (runtime.mode === 'ATK' && owner.pvpAtivo) {
        for (const id of Object.keys(players)) {
            const candidate = players[id];
            if (!candidate || candidate.hp <= 0 || !pvpPodeAtacar(ownerId, id) ||
                !instanciaCompativel(owner, candidate)) continue;
            const point = { x: candidate.x + PLAYER_OFFSET_X, y: candidate.y + PLAYER_OFFSET_Y };
            const distance = Math.hypot(point.x - runtime.x, point.y - runtime.y);
            if (distance <= acquireRange) {
                targets.push({ type: 'player', entity: Object.assign({ id: id }, point), distance: distance });
            }
        }
    }
    const enemyPets = Object.values(petsAtivos).filter(function (candidate) {
        return candidate && candidate !== runtime && candidate.hp > 0 &&
            runtime.mode === 'ATK' && owner.pvpAtivo &&
            candidate.owner_id !== runtime.owner_id && pvpPodeAtacar(ownerId, candidate.owner_id) &&
            instanciaCompativel(runtime, candidate) &&
            Math.hypot(candidate.x - runtime.x, candidate.y - runtime.y) <= acquireRange;
    }).sort(function (a, b) {
        return Math.hypot(a.x - runtime.x, a.y - runtime.y) -
            Math.hypot(b.x - runtime.x, b.y - runtime.y);
    });
    enemyPets.forEach(function (pet) {
        targets.push({
            type: 'pet',
            entity: pet,
            distance: Math.hypot(pet.x - runtime.x, pet.y - runtime.y)
        });
    });
    targets.sort(function (a, b) { return a.distance - b.distance; });
    return targets.length ? { type: targets[0].type, entity: targets[0].entity } : null;
}

function dispararProjetilPet(runtime, target, projectileType, damage, speed, lifetime) {
    const ownerId = runtime && runtime.owner_id;
    const owner = ownerId && players[ownerId];
    const targetId = target && (target.entity.id || target.entity.pet_instance_id);
    const targetType = target && target.type;
    if (!runtime || !owner || !validarOwnerPet(ownerId, runtime) || !targetId ||
        !['slime', 'boss', 'player', 'pet'].includes(targetType)) return false;
    const targetEntity = target.entity;
    if (targetType === 'player' && !pvpPodeAtacar(ownerId, targetId)) return false;
    if (targetType === 'pet' && (!pvpPodeAtacar(ownerId, targetEntity.owner_id) ||
        !validarOwnerPet(targetEntity.owner_id, targetEntity))) return false;
    if ((targetType === 'slime' || targetType === 'boss') && !instanciaCompativel(runtime, targetEntity)) return false;
    const targetX = targetType === 'player' ? targetEntity.x + PLAYER_OFFSET_X : targetEntity.x;
    const targetY = targetType === 'player' ? targetEntity.y + PLAYER_OFFSET_Y : targetEntity.y;
    const distance = Math.hypot(targetX - runtime.x, targetY - runtime.y);
    if (distance > runtime.attackRange || mapaPorCoordenada(runtime.x) !== mapaPorCoordenada(targetX)) return false;
    projeteis.push({
        x: runtime.x,
        y: runtime.y,
        vx: Math.cos(Math.atan2(targetY - runtime.y, targetX - runtime.x)) * speed,
        vy: Math.sin(Math.atan2(targetY - runtime.y, targetX - runtime.x)) * speed,
        vida: lifetime,
        mapa: mapaPorCoordenada(runtime.x),
        solari: !!runtime.solari,
        tipo: projectileType,
        raio: projectileType === 'void_laser' ? 7 : 8,
        dano: damage,
        petOwnerId: ownerId,
        petInstanceId: runtime.pet_instance_id,
        petTargetType: targetType,
        petTargetId: targetId
    });
    return true;
}

function aplicarEfeitoProjetilPet(projectile, target, targetType, targetId) {
    if (!efeitos || !projectile || !target) return;
    if (projectile.tipo === 'cogumelo_veneno') {
        efeitos.aplicarEfeito(target, 'veneno', 100, 1);
        efeitos.aplicarEfeito(target, 'confusao', 100, 1);
        return;
    }
    if (projectile.tipo !== 'louva_folha') return;
    efeitos.aplicarEfeito(target, 'selva_ataque_lento', 100, 0.4);
    if (targetType !== 'player') return;
    const player = players[targetId];
    if (!player) return;
    const manaStolen = Math.min(
        Math.max(0, Number(player.mana) || 0),
        Math.max(1, Math.round((Number(player.maxMp) || 100) * 0.08))
    );
    player.mana = Math.max(0, (Number(player.mana) || 0) - manaStolen);
    if (manaStolen > 0) {
        const socket = playerSockets[targetId];
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(player.mana), maxMp: player.maxMp }));
        }
    }
}

function atualizarPetsAtivos(now) {
    const tickNow = Number.isFinite(now) ? now : Date.now();
    for (const petId of Object.keys(petsAtivos)) {
        const runtime = petsAtivos[petId];
        const ownerId = runtime && runtime.owner_id;
        const owner = ownerId && players[ownerId];
        if (!runtime || !owner) {
            if (runtime) delete petsAtivos[runtime.pet_instance_id];
            continue;
        }
        runtime.instanciaId = owner.instanciaId || null;
        runtime.solari = !!solariEmSessao(runtime.owner_id);
        runtime.solariInstanceId = owner.instanciaId || null;
        if (runtime.state !== petAi.PET_STATES.RESPAWN &&
            (runtime.hp <= 0 || runtime.state === petAi.PET_STATES.DEAD)) {
            runtime.state = petAi.PET_STATES.DEAD;
            runtime.targetId = null;
            if (tickNow >= runtime.respawnAt && owner.hp > 0) {
                runtime.state = petAi.PET_STATES.RESPAWN;
            }
            syncPetRuntimeToProfile(runtime);
            continue;
        }
        if (runtime.state === petAi.PET_STATES.RESPAWN) {
            runtime.targetId = null;
            const safe = owner.hp > 0 ? posicaoSeguraPet(owner, runtime) : null;
            if (safe) {
                runtime.x = safe.x;
                runtime.y = safe.y;
                runtime.hp = runtime.maxHp;
                runtime.state = petAi.PET_STATES.FOLLOW;
                runtime.respawnAt = 0;
                runtime.stuckMs = 0;
                runtime.animationState = 'IDLE';
                runtime.animationStartedAt = tickNow;
                runtime.animationUntil = 0;
                runtime.aiAtacandoAte = 0;
                runtime.moving = false;
                runtime.aiEstado = 'idle';
            }
            syncPetRuntimeToProfile(runtime);
            continue;
        }
        if (owner.hp <= 0) {
            runtime.state = petAi.PET_STATES.IDLE;
            runtime.targetId = null;
            slimes.forEach(function (monster) {
                if (monster && monster.targetId === runtime.pet_instance_id) {
                    monster.targetId = null;
                    monster.ataqueTelegraph = null;
                }
            });
            continue;
        }
        if (tickNow - (runtime.lastTickAt || 0) < 150) continue;
        const elapsed = runtime.lastTickAt ? tickNow - runtime.lastTickAt : 150;
        runtime.lastTickAt = tickNow;
        const ownerPoint = { x: owner.x + PLAYER_OFFSET_X, y: owner.y + PLAYER_OFFSET_Y };
        const ownerDistance = Math.hypot(ownerPoint.x - runtime.x, ownerPoint.y - runtime.y);
        const followDistance = runtime.mode === 'DEFESA' ? 110 : 76;
        const returnDistance = 300;
        const previousX = runtime.x;
        const previousY = runtime.y;
        let movementIntent = false;
        const movementElapsed = Math.min(elapsed, 250);
        const followSpeed = velocidadeMaximaMovimentoJogador(owner) *
            (ownerDistance > returnDistance ? 1.6 : 1.15);
        if (runtime.mode === 'DEFESA') {
            const threat = slimes.concat(bosses).filter(function (mob) {
                return mob && mob.hp > 0 && mob.targetId === ownerId &&
                    instanciaCompativel(runtime, mob) &&
                    Math.hypot(mob.x - ownerPoint.x, mob.y - ownerPoint.y) <= 220;
            }).sort(function (a, b) {
                return Math.hypot(a.x - runtime.x, a.y - runtime.y) -
                    Math.hypot(b.x - runtime.x, b.y - runtime.y);
            })[0];
            if (threat) threat.targetId = runtime.pet_instance_id;
        }
        let target = runtime.mode === 'PARADO' ? null : escolherAlvoPet(runtime, owner);

        if (target) {
            runtime.targetId = target.entity.id || target.entity.pet_instance_id;
            const targetPoint = target.type === 'player'
                ? { x: target.entity.x, y: target.entity.y }
                : target.entity;
            const targetDistance = Math.hypot(targetPoint.x - runtime.x, targetPoint.y - runtime.y);
            if (targetDistance > runtime.attackRange) {
                runtime.state = petAi.PET_STATES.COMBAT;
                movementIntent = true;
                runtime.angulo = Math.atan2(targetPoint.y - runtime.y, targetPoint.x - runtime.x);
                moverPetComColisao(runtime, targetPoint.x - runtime.x, targetPoint.y - runtime.y,
                    Math.min(followSpeed * movementElapsed / 1000, targetDistance - runtime.attackRange),
                    target.entity.id || target.entity.pet_instance_id);
            } else {
                runtime.state = petAi.PET_STATES.COMBAT;
                runtime.angulo = Math.atan2(targetPoint.y - runtime.y, targetPoint.x - runtime.x);
                const result = executeSharedMonsterAttack({
                    attacker: runtime,
                    target: target.entity,
                    range: runtime.attackRange,
                    now: tickNow,
                    cooldownMs: runtime.attackCooldownMs,
                    validate: function () {
                        if (!validarOwnerPet(ownerId, runtime)) return { valid: false, reason: 'pet_not_active' };
                        if (target.type === 'player' && !pvpPodeAtacar(ownerId, target.entity.id)) {
                            return { valid: false, reason: 'pvp_rejected' };
                        }
                        if (target.type === 'pet' && !pvpPodeAtacar(ownerId, target.entity.owner_id)) {
                            return { valid: false, reason: 'pvp_rejected' };
                        }
                        return { valid: true };
                    },
                    applyDamage: function () {
                        runtime.animationState = 'ATTACK';
                        runtime.animationStartedAt = tickNow;
                        runtime.animationUntil = tickNow + 700;
                        runtime.aiAtacandoAte = runtime.animationUntil;
                        runtime.moving = false;
                        runtime.aiEstado = 'combat';
                        const damage = Math.max(1, Math.round(runtime.attackDamage *
                            (1 + Math.min(50, Number(runtime.level || 1) - 1) * 0.02)));
                        if (runtime.inheritedAttackSkill) {
                            const skill = runtime.inheritedAttackSkill;
                            return dispararProjetilPet(runtime, target, skill.projectileType, damage,
                                skill.projectileSpeed || 10, skill.projectileLife || 80);
                        }
                        return aplicarDanoAtaquePet(ownerId, target.type,
                            target.entity.id || target.entity.pet_instance_id, damage, 'basico');
                    }
                });
                if (!result.valid && result.reason !== 'cooldown_active') runtime.targetId = null;
            }
        } else {
            runtime.targetId = null;
            runtime.state = ownerDistance > returnDistance
                ? petAi.PET_STATES.RETURN
                : ownerDistance > followDistance ? petAi.PET_STATES.FOLLOW : petAi.PET_STATES.IDLE;
            if (ownerDistance > followDistance) {
                movementIntent = true;
                runtime.angulo = Math.atan2(ownerPoint.y - runtime.y, ownerPoint.x - runtime.x);
                moverPetComColisao(runtime, ownerPoint.x - runtime.x, ownerPoint.y - runtime.y,
                    Math.min(followSpeed * movementElapsed / 1000,
                        Math.max(1, ownerDistance - followDistance)), null);
            }
        }

        const moved = Math.hypot(runtime.x - previousX, runtime.y - previousY);
        if (moved > 0.75) {
            runtime.lastProgressAt = tickNow;
            runtime.stuckMs = 0;
            runtime.moving = true;
        } else if (movementIntent) {
            runtime.stuckMs = (runtime.stuckMs || 0) + elapsed;
            runtime.moving = false;
        } else {
            runtime.stuckMs = 0;
            runtime.moving = false;
        }
        if (runtime.state === petAi.PET_STATES.COMBAT && runtime.stuckMs >= 1500) {
            runtime.targetId = null;
            runtime.state = petAi.PET_STATES.RETURN;
            runtime.stuckMs = 0;
        } else if (runtime.state !== petAi.PET_STATES.COMBAT &&
            (runtime.stuckMs >= 1500 || (ownerDistance > 900 && movementIntent))) {
            const safe = posicaoSeguraPet(owner, runtime);
            if (safe) {
                runtime.x = safe.x;
                runtime.y = safe.y;
                runtime.state = petAi.PET_STATES.RETURN;
                runtime.stuckMs = 0;
                runtime.lastProgressAt = tickNow;
                runtime.moving = false;
            }
        }
        if (runtime.animationState !== 'ATTACK' || runtime.animationUntil <= tickNow) {
            if (runtime.animationState === 'HIT' && runtime.animationUntil > tickNow) {
                runtime.aiEstado = 'combat';
            } else {
                runtime.animationState = runtime.moving ? 'WALK' : 'IDLE';
                runtime.aiEstado = runtime.moving
                    ? (runtime.state === petAi.PET_STATES.COMBAT ? 'walk' : 'walk')
                    : (runtime.state === petAi.PET_STATES.COMBAT ? 'combat' : 'idle');
                if (runtime.animationUntil <= tickNow) runtime.aiAtacandoAte = 0;
            }
        }
        syncPetRuntimeToProfile(runtime);
    }
}

function dispararProjetilMonstro(slime, alvo, tipo, dano, velocidade, vida, anguloTravado) {
    if (!alvo || !podeEntidadeAtacarAlvo(slime, alvo, slime.skillRange || slime.attackRange || 320)) return false;
    const dx = alvo.x - slime.x;
    const dy = alvo.y - slime.y;
    const angulo = Number.isFinite(anguloTravado) ? anguloTravado : Math.atan2(dy, dx);
    projeteis.push({
        x: slime.x,
        y: slime.y - 10,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        vida: vida || 80,
        mapa: mapaPorCoordenada(slime.x),
        solari: !!slime.solari,
        tipo: tipo,
        raio: tipo === 'void_laser' ? 7 : 8,
        dano: dano,
        ownerMonstro: slime.id,
        petAlvo: alvo && alvo.pet_instance_id ? alvo.pet_instance_id :
            ((slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) ? slime.tauntId : null)
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

    if (slime.skillKind === 'lanceiro_investida') {
        const ang = Math.atan2(ty - slime.y, tx - slime.x);
        const dist = Math.max(1, Math.hypot(tx - slime.x, ty - slime.y));
        slime.lanceiroDashing = true;
        slime.lanceiroDashHit = false;
        slime.lanceiroDashFrames = Math.min(22, Math.max(10, Math.ceil(dist / 11)));
        slime.lanceiroDashVx = Math.cos(ang) * 11;
        slime.lanceiroDashVy = Math.sin(ang) * 11;
        slime.lanceiroFaceAngle = ang;
        slime.skillCharging = false;
        slime.skillAim = null;
        slime.skillCooldown = slime.skillCooldownMax || 180;
        const msg = { type: 'monster_lanceiro_dash', id: slime.id, x: Math.round(slime.x), y: Math.round(slime.y), targetX: Math.round(tx), targetY: Math.round(ty), duracao: slime.lanceiroDashFrames * 50 };
        if (slime.solari) solariBroadcastParaEntidade(slime, 'monster_lanceiro_dash', msg); else wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(msg)); });
        return;
    }
    if (slime.skillKind === 'void_laser') {
        dispararProjetilMonstro(slime, { x: tx, y: ty, hp: 1 }, 'void_laser', slime.dano + 12, slime.velProjetil || 18, 55);
    } else {
        const raio = slime.skillKind === 'meteor' ? 105 : 95;
        for (let pid in players) {
            const player = players[pid];
            if (player.hp <= 0) continue;
            // Skills especiais de monstros Solari só afetam membros da instância.
            if (slime.solari && !solariEmSessao(pid)) continue;
            if (!slime.solari && solariEmSessao(pid)) continue;
            if (mapaPorCoordenada(player.x) !== mapaPorCoordenada(slime.x)) continue;
            if (Math.hypot(player.x + 12 - tx, player.y + 16 - ty) > raio) continue;
            if (slime.skillKind === 'web') {
                aplicarDanoJogador(pid, tx, ty, slime.dano);
                efeitos.aplicarEfeito(player, 'lentidao', 100, 0.5);
                player.slowTimer = Math.max(player.slowTimer || 0, 100);
            } else {
                aplicarDanoJogador(pid, tx, ty, slime.dano + 14);
                efeitos.aplicarEfeito(player, 'queimadura', 100, 4);
            }
            aplicarContatoMonstro(slime, player);
        }
        for (const pet of Object.values(petsAtivos)) {
            const owner = pet && players[pet.owner_id];
            if (!owner || owner.hp <= 0 || pet.hp <= 0 ||
                entidadeEhSolari(slime) !== entidadeEhSolari(pet) ||
                !instanciaCompativel(slime, pet) ||
                mapaPorCoordenada(pet.x) !== mapaPorCoordenada(slime.x) ||
                Math.hypot(pet.x - tx, pet.y - ty) > raio ||
                atingidos.has(pet.pet_instance_id)) continue;
            applyDamageToCapturedPet(pet, slime.skillKind === 'web' ? slime.dano : slime.dano + 14, slime.id);
            if (slime.skillKind === 'web' && efeitos) {
                efeitos.aplicarEfeito(pet, 'lentidao', 100, 0.5);
                pet.slowTimer = Math.max(pet.slowTimer || 0, 100);
            } else if (efeitos) {
                efeitos.aplicarEfeito(pet, 'queimadura', 100, 4);
            }
            aplicarContatoMonstro(slime, pet);
        }
    }
    if (slime.solari) {
        solariBroadcast('monster_skill_impact', { id: slime.id, skill: slime.skillKind, x: tx, y: ty, mapa: 'solari' });
    } else {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'monster_skill_impact', id: slime.id, skill: slime.skillKind, x: tx, y: ty, mapa: mapaPorCoordenada(slime.x) }));
            }
        });
    }
    slime.skillCharging = false;
    slime.skillAim = null;
    slime.skillCooldown = slime.skillCooldownMax || 200;
}

// EDITOR "EDIT MOOB": aplica debuffs (no alvo) e buffs (em si) ao acertar
function aplicarContatoMonstro(slime, alvo) {
    if (!slime || !alvo || !efeitos) return;
    if (Array.isArray(slime.debuffsAplicados) && slime.debuffsAplicados.length) {
        slime.debuffsAplicados.forEach(function (d) {
            if (!d || !d.id) return;
            if (!efeitos.EFEITOS || !efeitos.EFEITOS[d.id]) return;
            efeitos.aplicarEfeito(alvo, d.id, d.tempo || 120, d.intensidade);
            if (d.id === 'stun' && typeof alvo.stunTimer === 'number') alvo.stunTimer = Math.max(alvo.stunTimer || 0, Math.floor(d.tempo || 120));
            if (d.id === 'lentidao' && typeof alvo.slowTimer === 'number') alvo.slowTimer = Math.max(alvo.slowTimer || 0, Math.floor(d.tempo || 120));
        });
    }
    if (Array.isArray(slime.buffsAplicados) && slime.buffsAplicados.length) {
        slime.buffsAplicados.forEach(function (d) {
            if (!d || !d.id) return;
            if (!efeitos.EFEITOS || !efeitos.EFEITOS[d.id]) return;
            efeitos.aplicarEfeito(slime, d.id, d.tempo || 240, d.intensidade);
        });
    }
}

function atualizarMonstroEspecial(slime, alvo, dx, dy, dist, fatorLentidao) {
    const tipo = slime.arquetipo;
    if (!tipo) return false;

    if (tipo === 'lanceiro') {
        if (!Number.isFinite(slime.lanceiroFaceAngle)) slime.lanceiroFaceAngle = Math.atan2(dy, dx);
        if (slime.lanceiroBlockCooldown > 0) slime.lanceiroBlockCooldown--;
        if (slime.lanceiroBloqueando) {
            slime.lanceiroBlockTimer--;
            if (slime.lanceiroBlockTimer <= 0) {
                slime.lanceiroBloqueando = false;
                slime.lanceiroBlockTimer = 0;
            } else {
                slime.lanceiroFaceAngle = Math.atan2(dy, dx);
                return true;
            }
        }
        if (slime.lanceiroDashing) {
            const lanceiroMoveu = moverMonstroDirecionalComDesvio(
                slime,
                slime.lanceiroDashVx,
                slime.lanceiroDashVy,
                velocidadeMovimentoMonstro(Math.hypot(slime.lanceiroDashVx, slime.lanceiroDashVy) * fatorLentidao),
                { limitarDistancia: true }
            );
            slime.lanceiroDashFrames--;
            slime.lanceiroFaceAngle = Math.atan2(slime.lanceiroDashVy, slime.lanceiroDashVx);
            if (slime.lanceiroDashFrames <= 0 || !lanceiroMoveu) {
                slime.lanceiroDashing = false;
                slime.lanceiroDashFrames = 0;
            }
            if (!slime.lanceiroDashHit) {
                for (const pid in players) {
                    const pHit = players[pid];
                    if (!pHit || pHit.hp <= 0) continue;
                    if (slime.solari && !solariEmSessao(pid)) continue;
                    if (!slime.solari && solariEmSessao(pid)) continue;
                    if (mapaPorCoordenada(pHit.x) !== mapaPorCoordenada(slime.x)) continue;
                    if (Math.hypot((pHit.x + 12) - slime.x, (pHit.y + 16) - slime.y) > 46) continue;
                    const danoInvestida = Math.max(slime.dano + 12, 70);
                    aplicarDanoJogador(pid, slime.x, slime.y, danoInvestida);
                    pHit.stunTimer = Math.max(pHit.stunTimer || 0, 40);
                    if (efeitos) efeitos.aplicarEfeito(pHit, 'stun', 40, 1);
                    const hitMsg = { type: 'monster_lanceiro_hit', id: slime.id, targetId: pid, x: Math.round(pHit.x + 12), y: Math.round(pHit.y + 16), stun: 2000 };
                    if (slime.solari) solariBroadcast('monster_lanceiro_hit', hitMsg); else wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(hitMsg)); });
                    slime.lanceiroDashHit = true;
                    slime.lanceiroDashing = false;
                    slime.lanceiroDashFrames = 0;
                    break;
                }
                if (!slime.lanceiroDashHit) {
                    for (const pet of Object.values(petsAtivos)) {
                        const owner = pet && players[pet.owner_id];
                        if (!owner || owner.hp <= 0 || pet.hp <= 0 ||
                            entidadeEhSolari(slime) !== entidadeEhSolari(pet) ||
                            !instanciaCompativel(slime, pet) ||
                            mapaPorCoordenada(pet.x) !== mapaPorCoordenada(slime.x) ||
                            Math.hypot(pet.x - slime.x, pet.y - slime.y) > 46) continue;
                        applyDamageToCapturedPet(pet, Math.max(slime.dano + 12, 70), slime.id);
                        pet.stunTimer = Math.max(pet.stunTimer || 0, 40);
                        if (efeitos) efeitos.aplicarEfeito(pet, 'stun', 40, 1);
                        slime.lanceiroDashHit = true;
                        slime.lanceiroDashing = false;
                        slime.lanceiroDashFrames = 0;
                        break;
                    }
                }
            }
            return true;
        }
        if (slime.skillCharging) {
            slime.skillChargeTimer--;
            if (slime.skillChargeTimer <= 0) resolverSkillEspecial(slime, alvo);
            return true;
        }
        if (slime.skillCooldown > 0) slime.skillCooldown--;
        if (dist <= 250 && dist > (slime.attackRange || 70) + 25 && slime.skillCooldown <= 0) {
            slime.ataqueTelegraph = null;
            slime.skillKind = 'lanceiro_investida';
            slime.skillCharging = true;
            slime.skillChargeMax = 20;
            slime.skillChargeTimer = 20;
            slime.skillAim = { x: alvo.x, y: alvo.y };
            slime.lanceiroFaceAngle = Math.atan2(dy, dx);
            const chargeMsg = { type: 'monster_lanceiro_charge', id: slime.id, x: Math.round(slime.x), y: Math.round(slime.y), duracao: 1000 };
            if (slime.solari) solariBroadcast('monster_lanceiro_charge', chargeMsg); else wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(chargeMsg)); });
            return true;
        }
        if (dist <= 240 && slime.lanceiroBlockCooldown <= 0 && !slime.lanceiroBloqueando) {
            slime.lanceiroBloqueando = true;
            slime.lanceiroBlockTimer = 60;
            slime.lanceiroBlockCooldown = 180;
            slime.lanceiroFaceAngle = Math.atan2(dy, dx);
            const blockMsg = { type: 'monster_lanceiro_block', id: slime.id, x: Math.round(slime.x), y: Math.round(slime.y), duracao: 3000 };
            if (slime.solari) solariBroadcast('monster_lanceiro_block', blockMsg); else wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(blockMsg)); });
            return true;
        }
        if (dist > (slime.attackRange || 70) && !slime.ataqueTelegraph) moverMonstroEspecial(slime, dx, dy, slime.velocidade || 2.45, fatorLentidao);
        else {
            slime.attackCooldown++;
            slime.lanceiroFaceAngle = Math.atan2(dy, dx);
            if ((slime.attackCooldown > (slime.cadenciaAtk || 50) || slime.ataqueTelegraph) && monstroPodeAtacar(slime)) {
                const aviso = prepararAtaqueMonstroComAviso(slime, alvo, slime.attackRange || 70, 'melee');
                if (aviso.status === 'ready') {
                    if (alvo && alvo.pet_instance_id) applyDamageToCapturedPet(alvo, slime.dano || 58, slime.id);
                    else aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 58);
                    aplicarContatoMonstro(slime, alvo);
                    slime.attackCooldown = 0;
                } else if (aviso.status === 'missed') {
                    slime.attackCooldown = 0;
                }
            }
        }
        return true;
    }

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
        slime.ataqueTelegraph = null;
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
        else if (dist < preferida - 35 && !slime.ataqueTelegraph) moverMonstroEspecial(slime, -dx, -dy, slime.velocidade || 2.2, fatorLentidao);
        slime.attackCooldown++;
        if ((slime.attackCooldown > (slime.cadenciaAtk || 55) || slime.ataqueTelegraph) &&
            (dist <= ataqueDistancia || slime.ataqueTelegraph)) {
            // CEGUEIRA: ranged cego não dispara flechas/pedras normais
            if (monstroPodeAtacar(slime)) {
                const aviso = prepararAtaqueMonstroComAviso(slime, alvo, ataqueDistancia, 'ranged');
                if (aviso.status === 'ready' && dispararProjetilMonstro(
                    slime, alvo, tipo === 'goblin' ? 'goblin_pedra' : 'caveira_flecha',
                    slime.dano, slime.velProjetil || 11, 80, aviso.angle
                )) slime.attackCooldown = 0;
                else if (aviso.status === 'missed') slime.attackCooldown = 0;
            }
        }
        return true;
    }

    if (dist > ataqueDistancia && !slime.ataqueTelegraph) {
        moverMonstroEspecial(slime, dx, dy, slime.velocidade || 2.3, fatorLentidao);
    } else {
        slime.attackCooldown++;
        if (slime.attackCooldown > (slime.cadenciaAtk || (tipo === 'tank_melee' ? 65 : 42)) || slime.ataqueTelegraph) {
            // CEGUEIRA (Ladino): monstro cego erra ataques normais — só habilidades seguem
            if (monstroPodeAtacar(slime)) {
                const aviso = prepararAtaqueMonstroComAviso(slime, alvo, ataqueDistancia, 'melee');
                if (aviso.status === 'pending') return true;
                if (aviso.status === 'missed') {
                    slime.attackCooldown = 0;
                    return true;
                }
                if (aviso.status !== 'ready') return true;
                // v1.30.3: monstro especial TAUNTADO atinge o Golem (não só o jogador)
                if (tipo === 'poison_melee' && alvo && Array.isArray(alvo.efeitos)) {
                    efeitos.aplicarEfeito(alvo, 'veneno', slime.poisonDuration || 400, 2);
                }
                if (players[slime.targetId] && alvo === players[slime.targetId]) {
                    aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano);
                    aplicarContatoMonstro(slime, alvo);
                } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                    danoCausadoAoOgro(slime.tauntId, slime.dano, alvo.x, alvo.y);
                } else if (alvo && alvo.pet_instance_id) {
                    applyDamageToCapturedPet(alvo, slime.dano, slime.id);
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

    let alvo = players[slime.targetId] || lacaios[slime.targetId] || petRuntimeDoId(slime.targetId);
    if (slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) alvo = lacaios[slime.tauntId];
    let petAlvoZumbi = alvo && alvo.pet_instance_id ? alvo.pet_instance_id :
        ((alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) ? slime.tauntId : null);
    let tx = (slime.skillAim && slime.skillAim.x != null) ? slime.skillAim.x : (alvo ? alvo.x : slime.x + 120);
    let ty = (slime.skillAim && slime.skillAim.y != null) ? slime.skillAim.y : (alvo ? alvo.y : slime.y);
    let dx = tx - slime.x;
    let dy = ty - slime.y;
    let dist = Math.hypot(dx, dy) || 1;
    let vel = Math.min(slime.velProjetil || 13, 4 + dist * 0.02);

    projeteis.push({
        x: slime.x,
        y: slime.y - 8,
        vx: (dx / dist) * vel,
        vy: (dy / dist) * vel,
        vida: 80,
        mapa: mapaPorCoordenada(slime.x),
        tipo: 'fedido',
        raio: 9,
        dano: slime.dano || 16,
        petAlvo: petAlvoZumbi,
        ownerMonstro: slime.id
    });
    slime.skillAim = null;
}

// ============ SPAWNS NATURAIS ============
// Slimes do Santuário são criados em pontos dispersos e grupos fixos; os demais
// monstros continuam usando as bandeiras administrativas até serem cadastrados.

console.log("Servidor Rodando: Classe Bárbaro Sangrento Ativa!");
inicializarSpawnsNaturaisSlime();
inicializarSpawnsNaturaisDeserto();
inicializarSpawnsNaturaisSelva();

setInterval(() => {

    // ======= NOVAS SKILLS LOOP =======
    let agora = Date.now();
    global.slimeAiTick = (global.slimeAiTick || 0) + 1;
    if (global.slimeAiTick % 20 === 1) {
        global.slimeAiHoraDecimal = sistemaDiaNoite
            ? sistemaDiaNoite.calcularTempoMundo(agora).horaDecimal
            : 12;
    }
    slimes.forEach(slime => {
        atualizarIAMonstro(slime, agora, global.slimeAiHoraDecimal || 12);
    });
    atualizarPetsAtivos(agora);
    
    // Meteoro Fires
    for (let i = meteorFires.length - 1; i >= 0; i--) {
        let f = meteorFires[i];
        if (agora >= f.expiresAt) { meteorFires.splice(i, 1); continue; }
        if (agora >= f.nextTick) {
            f.nextTick = agora + 1000;
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y) < 100) {
                    registrarDanoMonstro(s, f.ownerId, Math.floor(f.dano * 0.2));
                }
            });
            danoEmBosses(f.x, f.y, 100, f.ownerId, Math.floor(f.dano * 0.2), 'skill');
        }
    }
    // Escudos Lancados (com Upgrades do Guerreiro)
    for (let i = escudosLancados.length - 1; i >= 0; i--) {
        let e = escudosLancados[i];
        e.x += Math.cos(e.ang) * e.speed;
        e.y += Math.sin(e.ang) * e.speed;
        e.dist += e.speed;
        const maxDist = e.maxDist || 300;
        const upg = e.upgrades || {};

        if (e.dist >= maxDist) {
            // Se tem muralha protetora (4B TANK), projeta a zona defensiva ao final
            if (upg.muralha) {
                wss.clients.forEach(c => {
                    if (c.readyState === 1) c.send(JSON.stringify({
                        type: 'action_guerreiro_escudo_hit',
                        x: e.x,
                        y: e.y,
                        ownerId: e.ownerId,
                        upgrades: upg
                    }));
                });
            }
            escudosLancados.splice(i, 1);
            continue;
        }

        // Se é titânico (4A DPS), perfura todos os monstros pelo caminho sem parar!
        if (upg.titanico) {
            if (!e.mobsAtingidos) e.mobsAtingidos = [];
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < 55 && !e.mobsAtingidos.includes(s.id)) {
                    e.mobsAtingidos.push(s.id);
                    registrarDanoMonstro(s, e.ownerId, e.dano);
                }
            });
            danoEmBosses(e.x, e.y, 60, e.ownerId, e.dano, 'skill', 'player');
            continue;
        }

        let hit = slimes.find(s => s.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < 40);
        if (hit) {
            let p = players[e.ownerId];
            if(p) {
                hit.pull = { x: p.x + Math.cos(e.ang)*30, y: p.y + Math.sin(e.ang)*30, speed: 14 };
                hit.tauntTarget = e.ownerId;
                hit.tauntTimer = 100;

                // 1A DPS: Sangramento pesado (6 ticks de 10)
                if (upg.serrilhado) {
                    hit.sangramentoTimer = 120;
                    hit.sangramentoDano = 10;
                    hit.sangramentoOwner = e.ownerId;
                }
                // 1B TANK: Atordoamento (Stun 2s)
                if (upg.esmagador) {
                    hit.stunTimer = 40;
                }
                // 2A DPS: Ricochete em até 2 inimigos adicionais
                if (upg.ricochete) {
                    let ricocheteados = 0;
                    slimes.forEach(s => {
                        if (s.hp > 0 && s.id !== hit.id && ricocheteados < 2 && Math.hypot(s.x - hit.x, s.y - hit.y) < 140) {
                            registrarDanoMonstro(s, e.ownerId, Math.round(e.dano * 0.85));
                            ricocheteados++;
                        }
                    });
                }
                // 2B TANK: Vórtice de Atração no ponto do impacto
                if (upg.vortice) {
                    slimes.forEach(s => {
                        if (s.hp > 0 && s.id !== hit.id && Math.hypot(s.x - hit.x, s.y - hit.y) < 120) {
                            const angV = Math.atan2(hit.y - s.y, hit.x - s.x);
                            moverMonstroDirecionalComDesvio(s, Math.cos(angV), Math.sin(angV), 40);
                        }
                    });
                }
                // 3A DPS: Estilhaços Cortantes (30 dano em área 120px)
                if (upg.estilhacos) {
                    slimes.forEach(s => {
                        if (s.hp > 0 && Math.hypot(s.x - hit.x, s.y - hit.y) < 120) {
                            registrarDanoMonstro(s, e.ownerId, 30);
                        }
                    });
                }
                // 3B TANK: Barreira no Retorno (15% HP por 6s)
                if (upg.retorno) {
                    p.barreiraEscudoRetorno = Math.round(p.maxHp * 0.15);
                    p.barreiraEscudoRetornoAte = Date.now() + 6000;
                }

                registrarDanoMonstro(hit, e.ownerId, e.dano);

                wss.clients.forEach(c => {
                    if(c.readyState === 1) c.send(JSON.stringify({
                        type: 'action_guerreiro_escudo_hit',
                        mobId: hit.id,
                        x: hit.x,
                        y: hit.y,
                        ownerId: e.ownerId,
                        targetX: p.x + Math.cos(e.ang)*30,
                        targetY: p.y + Math.sin(e.ang)*30,
                        upgrades: upg
                    }));
                });
            }
            escudosLancados.splice(i, 1);
        }
    }
    // Bolas Elementais (v2 — Bola Elemental: rola pelo chão, transforma ao cruzar Nevasca/Meteoro + Upgrades Mago)
    for (let i = bolasElementais.length - 1; i >= 0; i--) {
        let b = bolasElementais[i];
        const upg = b.upgrades || {};
        
        b.x += Math.cos(b.ang) * b.speed;
        b.y += Math.sin(b.ang) * b.speed;
        b.dist += b.speed;

        // Bumerangue: retorno ao atingir distância máxima
        if (upg.bumerangue && !upg.retornando && b.dist >= (b.maxDist || 400)) {
            upg.retornando = true;
        }

        if (upg.retornando) {
            let pCaster = players[b.ownerId];
            if (pCaster && pCaster.hp > 0) {
                b.ang = Math.atan2(pCaster.y - b.y, pCaster.x - b.x);
                let distP = Math.hypot(pCaster.x - b.x, pCaster.y - b.y);
                if (distP <= 35) {
                    let mpRecov = Math.round((pCaster.maxMp || 100) * 0.15);
                    let hpRecov = Math.round((pCaster.maxHp || 100) * 0.10);
                    pCaster.mana = Math.min(pCaster.maxMp, pCaster.mana + mpRecov);
                    pCaster.hp = Math.min(pCaster.maxHp, pCaster.hp + hpRecov);
                    wss.clients.forEach(c => {
                        if (c.readyState === 1) {
                            c.send(JSON.stringify({ type: 'action_mago_bumerangue_catch', id: b.ownerId, mp: mpRecov, hp: hpRecov }));
                            c.send(JSON.stringify({ type: 'hp_sync', id: b.ownerId, hp: pCaster.hp, maxHp: pCaster.maxHp }));
                            c.send(JSON.stringify({ type: 'mp_sync', id: b.ownerId, mana: pCaster.mana, maxMp: pCaster.maxMp }));
                        }
                    });
                    bolasElementais.splice(i, 1);
                    continue;
                }
            } else {
                bolasElementais.splice(i, 1);
                continue;
            }
        } else if (b.dist >= (b.maxDist || 400)) {
            // Alcance máximo atingido sem retorno: detonação/supernova/singularidade
            if (upg.supernova) {
                const rSuper = 180;
                const danoSuper = Math.round(b.dano * 2.5);
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= rSuper) {
                        registrarDanoMonstro(s, b.ownerId, danoSuper);
                        s.stunTimer = Math.max(s.stunTimer || 0, 40);
                        efeitos.aplicarEfeito(s, 'congelado', 40, 1);
                    }
                });
                danoEmBosses(b.x, b.y, rSuper, b.ownerId, danoSuper, 'skill');
                bosses.forEach(bs => {
                    if (bs.hp > 0 && Math.hypot(bs.x - b.x, bs.y - b.y) <= rSuper) {
                        bs.stunTimer = Math.max(bs.stunTimer || 0, 40);
                        efeitos.aplicarEfeito(bs, 'congelado', 40, 1);
                    }
                });
                meteorFires.push({ x: b.x, y: b.y, ownerId: b.ownerId, expiresAt: Date.now() + 5000, nextTick: Date.now() + 1000, dano: Math.round(b.dano * 0.5) });
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_supernova', id: b.id, x: b.x, y: b.y, raio: rSuper })); });
            } else if (upg.singularidade) {
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_singularidade', id: b.id, x: b.x, y: b.y, raio: 200, duracaoMs: 6000 })); });
                for (let st = 0; st < 12; st++) {
                    setTimeout(() => {
                        slimes.forEach(s => {
                            if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= 200) {
                                let a = Math.atan2(b.y - s.y, b.x - s.x);
                                moverMonstroDirecionalComDesvio(s, Math.cos(a), Math.sin(a), 20);
                                registrarDanoMonstro(s, b.ownerId, Math.round(b.dano * 0.25));
                            }
                        });
                        danoEmBosses(b.x, b.y, 200, b.ownerId, Math.round(b.dano * 0.25), 'skill');
                    }, st * 500);
                }
            }
            bolasElementais.splice(i, 1);
            continue;
        }
        
        // Vórtice gravitacional (Tier 1 B): atrai inimigos próximos continuamente
        if (upg.vortex) {
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= 150) {
                    let a = Math.atan2(b.y - s.y, b.x - s.x);
                    moverMonstroDirecionalComDesvio(s, Math.cos(a), Math.sin(a), 6);
                }
            });
        }

        // Pulsos tri-elementais (Tier 2 A): a cada 6 ticks (~300ms) emite pulso de dano
        if (upg.pulsos) {
            b.pulseTick = (b.pulseTick || 0) + 1;
            if (b.pulseTick % 6 === 0) {
                const rPulse = 90;
                const dPulse = Math.round(b.dano * 0.35);
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= rPulse) {
                        registrarDanoMonstro(s, b.ownerId, dPulse);
                    }
                });
                danoEmBosses(b.x, b.y, rPulse, b.ownerId, dPulse, 'skill');
                wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_pulso_elemental', x: b.x, y: b.y, raio: rPulse })); });
            }
        }

        // Transformação elemental ao cruzar zonas
        if (b.type === 'normal') {
            if (blizzards.some(bl => Math.hypot(bl.x - b.x, bl.y - b.y) <= bl.radius)) {
                b.type = 'gelo';
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_bola_transform', id: b.id, newType: 'gelo', x: b.x, y: b.y })); });
            } else if (meteorFires.some(mf => Math.hypot(mf.x - b.x, mf.y - b.y) <= 110)) {
                b.type = 'fogo';
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_bola_transform', id: b.id, newType: 'fogo', x: b.x, y: b.y })); });
            }
        }
        
        // Perfurante (Tier 1 A): não é destruída ao tocar nos inimigos, atinge múltiplos alvos
        if (upg.perfurante) {
            b.mobsAtingidos = b.mobsAtingidos || [];
            const rPerfurar = 36;
            slimes.forEach(s => {
                if (s.hp > 0 && !b.mobsAtingidos.includes('s_' + s.id) && Math.hypot(s.x - b.x, s.y - b.y) < rPerfurar) {
                    b.mobsAtingidos.push('s_' + s.id);
                    registrarDanoMonstro(s, b.ownerId, b.dano);
                    if (b.type === 'fogo') efeitos.aplicarEfeito(s, 'queimadura', 100, 8);
                    if (b.type === 'gelo') efeitos.aplicarEfeito(s, 'congelado', 40, 1);
                }
            });
            bosses.forEach(bs => {
                if (bs.hp > 0 && !b.mobsAtingidos.includes('b_' + bs.id) && Math.hypot(bs.x - b.x, bs.y - b.y) < rPerfurar) {
                    b.mobsAtingidos.push('b_' + bs.id);
                    registrarDanoMonstro(bs, b.ownerId, b.dano);
                    if (b.type === 'fogo') efeitos.aplicarEfeito(bs, 'queimadura', 100, 8);
                    if (b.type === 'gelo') efeitos.aplicarEfeito(bs, 'congelado', 40, 1);
                }
            });
            continue;
        }

        // Primeiro inimigo em contato (raio 28 = bola gigante giratória padrão)
        let hit = slimes.find(s => s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) < 28);
        if (!hit) hit = bosses.find(bs => bs.hp > 0 && Math.hypot(bs.x - b.x, bs.y - b.y) < 28);
        if (hit) {
            if (b.type === 'fogo') {
                const raioExplosao = 130;
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= raioExplosao) {
                        registrarDanoMonstro(s, b.ownerId, b.dano * 2);
                    }
                });
                danoEmBosses(b.x, b.y, raioExplosao, b.ownerId, b.dano * 2, 'skill');
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_bola_hit', id: b.id, x: b.x, y: b.y, ballType: 'fogo', radius: raioExplosao })); });
            } else if (b.type === 'gelo') {
                const raioGelo = 85;
                const tempoCongelado = 40; // 40 ticks @50ms = 2s
                let alvos = [];
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= raioGelo) {
                        s.stunTimer = Math.max(s.stunTimer || 0, tempoCongelado);
                        efeitos.aplicarEfeito(s, 'congelado', tempoCongelado, 1);
                        registrarDanoMonstro(s, b.ownerId, b.dano);
                        alvos.push(s);
                    }
                });
                bosses.forEach(bs => {
                    if (bs.hp > 0 && Math.hypot(bs.x - b.x, bs.y - b.y) <= raioGelo) {
                        bs.stunTimer = Math.max(bs.stunTimer || 0, tempoCongelado);
                        efeitos.aplicarEfeito(bs, 'congelado', tempoCongelado, 1);
                        registrarDanoMonstro(bs, b.ownerId, b.dano);
                        alvos.push(bs);
                    }
                });
                wss.clients.forEach(c => {
                    if(c.readyState === 1) {
                        c.send(JSON.stringify({ type: 'action_mago_bola_hit', id: b.id, x: b.x, y: b.y, ballType: 'gelo', radius: raioGelo }));
                        alvos.forEach(al => c.send(JSON.stringify({ type: 'reacao_congelante', x: al.x, y: al.y })));
                    }
                });
            } else {
                registrarDanoMonstro(hit, b.ownerId, b.dano);
                if (hit.isBoss || bosses.indexOf(hit) !== -1) {
                } else {
                    moverMonstroDirecionalComDesvio(hit, Math.cos(b.ang), Math.sin(b.ang), 60);
                }
                slimes.forEach(s => {
                    if (s.hp > 0 && s !== hit && Math.hypot(s.x - b.x, s.y - b.y) <= 60) {
                        moverMonstroDirecionalComDesvio(s, Math.cos(b.ang), Math.sin(b.ang), 60);
                    }
                });
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_bola_hit', id: b.id, x: b.x, y: b.y, ballType: 'normal', radius: 60 })); });
            }
            if (upg.supernova) {
                const rSuper = 180;
                const danoSuper = Math.round(b.dano * 2.5);
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) <= rSuper) {
                        registrarDanoMonstro(s, b.ownerId, danoSuper);
                        s.stunTimer = Math.max(s.stunTimer || 0, 40);
                        efeitos.aplicarEfeito(s, 'congelado', 40, 1);
                    }
                });
                danoEmBosses(b.x, b.y, rSuper, b.ownerId, danoSuper, 'skill');
                bosses.forEach(bs => {
                    if (bs.hp > 0 && Math.hypot(bs.x - b.x, bs.y - b.y) <= rSuper) {
                        bs.stunTimer = Math.max(bs.stunTimer || 0, 40);
                        efeitos.aplicarEfeito(bs, 'congelado', 40, 1);
                    }
                });
                meteorFires.push({ x: b.x, y: b.y, ownerId: b.ownerId, expiresAt: Date.now() + 5000, nextTick: Date.now() + 1000, dano: Math.round(b.dano * 0.5) });
                wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_supernova', id: b.id, x: b.x, y: b.y, raio: rSuper })); });
            }
            bolasElementais.splice(i, 1);
        }
    }
    
    // Golems Sísmicos (Summoner Skill 4 - 8s duração, pulsos acelerados de 1.0s até 0.3s, dano alto e lentidão)
    for(let pid in golemsSismicos) {
        let g = golemsSismicos[pid];
        if(!g.active) continue;
        let elapsed = agora - g.startTime;
        let ogro = lacaios[pid];
        let p = players[pid];
        
        // Garante que o golem permaneça travado e imune enquanto a skill durar
        if (ogro) {
            ogro.x = g.x;
            ogro.y = g.y;
            ogro.isJumping = false;
            ogro.sismicoAtivo = true;
            ogro.imune = true;
        }

        if(g.cancelado || elapsed >= (g.duration || 8000) || !ogro || ogro.hp <= 0 || !p || p.hp <= 0) {
            let upgradesSismicoFim = (p && p.skillUpgrades) || {};
            // Tier 4 B: Colapso Final (implosão massiva ao terminar os 8s causando 120% do dano base)
            if (!g.cancelado && elapsed >= (g.duration || 8000) && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismicoFim, 'sismico', 4, 'B')) {
                let baseDanoFim = p ? dmgSkill(p, 'sismico', 55) : 45;
                let danoColapso = Math.round(baseDanoFim * 1.20);
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - g.x, s.y - g.y) < 260) {
                        let r = registrarDanoMonstro(s, pid, danoColapso, 'pet');
                        broadcastDanoLacaio(s.x, s.y, r ? r.dano : danoColapso);
                    }
                });
                let dbColapso = danoEmBosses(g.x, g.y, 275, pid, danoColapso, 'skill', 'pet');
                if (dbColapso) broadcastDanoLacaio(dbColapso.x, dbColapso.y, dbColapso.dano);
                wss.clients.forEach(c => {
                    if (c.readyState === 1) c.send(JSON.stringify({ type: 'action_summoner_colapso_final', x: g.x, y: g.y, raio: 260 }));
                });
            }

            g.active = false;
            delete golemsSismicos[pid];
            if (ogro) {
                ogro.sismicoAtivo = false;
                ogro.imune = false;
            }
            if (p) {
                p.golemSismicoAtivo = false;
            }
            wss.clients.forEach(c => { 
                if(c.readyState === 1) c.send(JSON.stringify({ 
                    type: 'action_summoner_golem_sismico_end', 
                    ownerId: pid, 
                    x: g.x, 
                    y: g.y 
                })); 
            });
            continue;
        }

        if(agora >= g.nextPulse) {
            g.pulses++;
            let progress = Math.min(1, elapsed / (g.duration || 8000));
            // Aceleração progressiva dos tremores: 1000ms no início -> 300ms no final
            let delay = Math.max(300, Math.round(1000 - progress * 700));
            g.nextPulse = agora + delay;
            
            let upgradesSismico = (p && p.skillUpgrades) || {};
            let baseDano = p ? dmgSkill(p, 'sismico', 55) : 45;
            let multInstavel = 1;

            // Tier 1 B: Núcleo Instável (+3% cumulativo por pulso)
            if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismico, 'sismico', 1, 'B')) {
                multInstavel = 1 + (g.pulses * 0.03);
            }

            let danoPulso = Math.round(baseDano * (1 + progress * 0.45) * multInstavel);
            let raioArea = 260; // Grande área de efeito
            let alvosAtingidos = [];

            // Tier 2 A: Prisão Tectônica (pulso 1 e penúltimo/último enraízam 2s)
            let enraizar = false;
            if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismico, 'sismico', 2, 'A')) {
                if (g.pulses === 1 || elapsed >= 7000) enraizar = true;
            }

            // Tier 4 A: Domínio das Placas (nos últimos 2s da skill = elapsed >= 6000, enraíza inimigos)
            if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismico, 'sismico', 4, 'A') && elapsed >= 6000) {
                enraizar = true;
            }

            slimes.forEach(s => {
                let dist = Math.hypot(s.x - g.x, s.y - g.y);
                if(s.hp > 0 && dist < raioArea) {
                    let r = registrarDanoMonstro(s, pid, danoPulso, 'pet');
                    broadcastDanoLacaio(s.x, s.y, r ? r.dano : danoPulso);

                    // Lentidão padrão 50%
                    s.lentidao = 0.5;
                    s.lentidaoTimer = 40;

                    // Tier 1 A: Campo de Falha (borda raio 200-260 sofre 60% lentidão)
                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismico, 'sismico', 1, 'A') && dist >= 200) {
                        s.lentidao = 0.4;
                    }

                    // Enraizar se aplicável
                    if (enraizar) {
                        s.isPreso = Date.now() + 2000;
                        s.presoTimer = 40;
                    }

                    // Tier 3 A: Anel de Contenção (puxa inimigos 25px para dentro em direção ao Golem)
                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismico, 'sismico', 3, 'A')) {
                        let angPuxa = Math.atan2(g.y - s.y, g.x - s.x);
                        moverMonstroDirecionalComDesvio(s, Math.cos(angPuxa), Math.sin(angPuxa), 25);
                    }

                    if (alvosAtingidos.length < 8) alvosAtingidos.push({ id: s.id, x: s.x, y: s.y });
                }
            });

            // Tier 2 B: Chuva de Meteoros Sísmicos (a cada 2 pulsos, 2 fragmentos caem causando 30 dano)
            if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSismico, 'sismico', 2, 'B') && (g.pulses % 2 === 0)) {
                for (let mi = 0; mi < 2; mi++) {
                    let angM = Math.random() * Math.PI * 2;
                    let distM = Math.random() * 200;
                    let mx = g.x + Math.cos(angM) * distM;
                    let my = g.y + Math.sin(angM) * distM;
                    slimes.forEach(s => {
                        if (s.hp > 0 && Math.hypot(s.x - mx, s.y - my) < 50) {
                            let r = registrarDanoMonstro(s, pid, 30, 'pet');
                            broadcastDanoLacaio(s.x, s.y, r ? r.dano : 30);
                        }
                    });
                    wss.clients.forEach(c => {
                        if (c.readyState === 1) c.send(JSON.stringify({ type: 'action_summoner_meteoro_sismico', x: mx, y: my }));
                    });
                }
            }

            let dbSis = danoEmBosses(g.x, g.y, raioArea, pid, danoPulso, 'skill', 'pet');
            if (dbSis) broadcastDanoLacaio(dbSis.x, dbSis.y, dbSis.dano);

            let intensity = +(1 + progress * 2.5).toFixed(2);
            wss.clients.forEach(c => { 
                if(c.readyState === 1) {
                    c.send(JSON.stringify({ 
                        type: 'action_summoner_golem_pulse', 
                        ownerId: pid, 
                        x: g.x, 
                        y: g.y, 
                        progress: progress,
                        intensity: intensity,
                        radius: raioArea,
                        targets: alvosAtingidos
                    })); 
                } 
            });
        }
    }
    
    // Chuva de Flechas Arqueiro
    for(let pid in players) {
        let p = players[pid];
        if (p.adminCheats) {
            if (p.adminCheats.vidaInfinita && p.hp < p.maxHp) p.hp = p.maxHp;
            if (p.adminCheats.manaInfinita && p.mana < p.maxMp) p.mana = p.maxMp;
        }
        if(p.saltoChuvaAtivo && agora >= p.saltoChuvaExpires) {
            p.saltoChuvaAtivo = false;
            p.saltoChuvaEmAndamento = false;
            p.imune = false;
            wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_arqueiro_salto_chuva_down', ownerId: pid })); });
        }
    }
    for (let i = chuvasFlechaNova.length - 1; i >= 0; i--) {
        let ch = chuvasFlechaNova[i];
        if (agora >= ch.expires) { chuvasFlechaNova.splice(i, 1); continue; }
        if (agora >= ch.nextTick) {
            ch.nextTick = agora + 50; // fast ticks
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - ch.x, s.y - ch.y) < 120 && Math.random() > 0.5) {
                    let arqueiraDona = players[ch.ownerId];
                    registrarDanoMonstro(s, ch.ownerId, arqueiraDona ? dmgSkill(arqueiraDona, 'salto_chuva', 15) : 15);
                }
            });
        }
    }
    
    // Barbaro Vinculo
    for(let pid in vinculosBerserker) {
        let v = vinculosBerserker[pid];
        let p = players[pid];
        let target = slimes.find(s => s && s.id === v.targetId);
        if (!target) target = bosses.find(b => b && b.id === v.targetId);
        if (!target) target = players[v.targetId];
        let distanciaQuebrou = false;
        if (p && target) {
            let dist = Math.hypot(p.x - target.x, p.y - target.y);
            if (dist > (v.maxDistance || 450)) distanciaQuebrou = true;
        }
        if(!p || !target || target.hp <= 0 || agora >= v.expires || distanciaQuebrou) {
            if(p) {
                p.vampirismoBonus = 0;
                p.danoBonus = 0;
                p.atkSpeedBonus = 0;
                p.vinculoAtivo = false;
            }
            delete vinculosBerserker[pid];
            wss.clients.forEach(c => {
                if(c.readyState === 1) {
                    c.send(JSON.stringify({
                        type: 'action_barbaro_vinculo_end',
                        ownerId: pid,
                        motivo: distanciaQuebrou ? 'distancia' : (target && target.hp <= 0 ? 'morte' : 'tempo')
                    }));
                }
            });
        }
    }
    
    // Buracos Negros
    for (let i = buracosNegros.length - 1; i >= 0; i--) {
        let bn = buracosNegros[i];
        if (agora >= bn.expires) { 
            buracosNegros.splice(i, 1); 
            wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_astral_buraco_negro_end', ownerId: bn.ownerId, x: bn.x, y: bn.y })); });
            continue; 
        }
        slimes.forEach(s => {
            if(s.hp > 0 && Math.hypot(s.x - bn.x, s.y - bn.y) < 200) {
                let ang = Math.atan2(bn.y - s.y, bn.x - s.x);
                moverMonstroDirecionalComDesvio(s, Math.cos(ang), Math.sin(ang), 4);
                s.lentidao = 0.2; s.lentidaoTimer = 40;
                if(Math.random() < 0.1) {
                    let donoBN = players[bn.ownerId];
                    registrarDanoMonstro(s, bn.ownerId, donoBN ? dmgSkill(donoBN, 'buraco_negro', 5) : 5);
                }
            }
        });
    }

    for (let pid in players) {
        let player = players[pid];

        if (player.guerreiroBuffAte && player.guerreiroBuffAte <= agora) {
            player.guerreiroBuffAte = 0;
            atualizarBonusMaxHpGritoGuerra(player);
            const wsGuardiao = playerSockets[pid];
            if (wsGuardiao && wsGuardiao.readyState === WebSocket.OPEN) {
                wsGuardiao.send(JSON.stringify({ type: 'hp_sync', hp: player.hp, maxHp: player.maxHp }));
            }
        }

        if (player.furiaTimer > 0) {
            player.furiaTimer--;
        }
        if (player.giroDescontroladoCooldown > 0) {
            player.giroDescontroladoCooldown--;
        }
        if (player.giroDescontroladoAtivo && player.giroDescontroladoExpiresAt && Date.now() >= player.giroDescontroladoExpiresAt) {
            player.giroDescontroladoTimer = 0;
            player.giroDescontroladoAtivo = false;
            player.giroDescontroladoCooldown = 300; // 15s de cooldown
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_barbaro_giro_end', id: pid }));
                }
            });
        } else if (player.giroDescontroladoTimer > 0) {
            player.giroDescontroladoTimer--;
            if (player.giroDescontroladoTimer <= 0) {
                player.giroDescontroladoAtivo = false;
                player.giroDescontroladoCooldown = 300; // 15s de cooldown
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
            const danoGiro = Math.round(dmgSkill(player, 'giro_descontrolado', 18) * 0.2); // v-cXX: dano reduzido em 80%
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

        // ============================================================
        // DASH v2 — máquina de estado por TICK (50ms)
        // Roda DEPOIS da regeneração de stamina, então o dreno do escudo
        // do Guerreiro vence a regeneração (dreno 50/s vs regen 15/s).
        // ============================================================
        if (player.hp > 0) {
            // ---- 1) ANIMAÇÃO (corrida / investida / arranque) ----
            // O servidor é quem MOVE o personagem durante o dash. O cliente
            // só desenha. Sem isto, um dash animado seria só um teleport
            // com VFX e o servidor aceitaria a posição final como um
            // "movimento normal" (teletransporte de graça).
            if (player.dashAnim) {
                const d = player.dashAnim;
                const cfg = DASH_MOD.configDe(player.classe);
                const amostra = DASH_MOD.amostrar(d, Date.now() - d.inicio);
                let travou = false;
                if (amostra.t >= 1) {
                    // Fim: confirma a posição final se for válida
                    if (!dashColide(d.x1, d.y1)) { player.x = d.x1; player.y = d.y1; }
                    else { player.x = d.ultimoX; player.y = d.ultimoY; }
                } else {
                    if (!dashColide(amostra.x, amostra.y)) {
                        player.x = amostra.x;
                        player.y = amostra.y;
                        d.ultimoX = amostra.x;
                        d.ultimoY = amostra.y;
                    } else {
                        travou = true;
                        player.x = d.ultimoX;
                        player.y = d.ultimoY;
                    }
                }

                if (cfg.tipo === 'investida' && !travou) dashInvestidaDano(pid, player, d);

                if (travou || amostra.t >= 1) {
                    player.dashAnim = null;
                    player.dashVelocidadeMult = 1;
                    player.dashAte = 0;
                    // A animação acabou: a posição final do dash é a nova
                    // referência. Registra a mesma janela de guarda usada pelas
                    // classes de teleporte, para que um pacote de movimento que
                    // saiu antes do dash não sobrescreva esse destino em seguida.
                    dashGuardarPosicao(player, d.x0, d.y0, player.x, player.y, 0);
                    if (cfg.tipo === 'arranque') {
                        // Arranque ended: reaparece
                        removerEfeitoAoVivo(pid, 'invisivel');
                        dashEnviar('action_dash_fim', { id: pid, x: player.x, y: player.y, vfx: cfg.vfx });
                    }
                }
            } else if (player.dashAte && Date.now() >= player.dashAte) {
                player.dashAte = 0;
                player.dashVelocidadeMult = 1;
                removerEfeitoAoVivo(pid, 'invisivel');
                dashEnviar('action_dash_fim', { id: pid, x: player.x, y: player.y });
            }

            // ---- 2) ESCUDO DO GUERREIRO (segurado) ----
            if (player.escudoGuerreiro) {
                const cfgE = DASH_MOD.configDe('guerreiro');
                const eg = player.escudoGuerreiro;
                const agora = Date.now();

                // 2a) O escudo SEGUE A ESPADA: o arco de bloqueio (-70%) é
                //     recalculado a partir do ângulo de mira atual (p.angulo),
                //     não do ângulo do instante em que o escudo foi erguido.
                //     Sem isto o jogador "viraria" o escudo e o servidor
                //     continuaria protegendo a direção antiga.
                if (Number.isFinite(player.angulo)) eg.ang = player.angulo;

                // 2b) Ângulo é sincronizado para os OUTROS clientes com
                //     orçamento: só reenvia se mudou o bastante (0,20 rad ≈ 11°)
                //     E se já passou 120ms. No máx. ~8 pacotes/s por guerreiro.
                if (agora - (eg.ultimoSync || 0) >= 120 && Math.abs(eg.ang - (eg.angUltimoSync ?? -99)) >= 0.20) {
                    eg.ultimoSync = agora;
                    eg.angUltimoSync = eg.ang;
                    dashEnviar('action_guerreiro_escudo_ang', { id: pid, angulo: eg.ang });
                }

                // 2c) BAQUE DE ESCUDO: 1x a cada 2s com o escudo erguido, na
                //     direção da espada. É a "ação" do escudo segurado.
                if (agora >= (eg.proximoBaque || 0)) {
                    eg.proximoBaque = agora + cfgE.intervaloBaqueMs;
                    escudoGuerreiroBaque(pid, player, cfgE);
                }

                // 2d) Dreno ABSOLUTO a partir da stamina do instante em que o escudo
                //     foi erguido. Subtrair do valor já drenado a cada tick daria um
                //     juro geométrico (100 zerava em 0,5s em vez dos 2s previstos).
                const decorrido = (agora - eg.desde) / 1000;
                const alvo = Math.max(0, Math.min(100, eg.staminaInicial - (cfgE.drenoPorSegundo * decorrido)));
                player.estamina = alvo;
                playerSockets[pid] && playerSockets[pid].readyState === 1 &&
                    playerSockets[pid].send(JSON.stringify({ type: 'stamina_sync', estamina: Math.round(alvo) }));
                if (alvo <= 0) soltarEscudoGuerreiro(pid, player, true);
            }

            // ---- 3) ATORDOAMENTO DA CURANDEIRA ----
            if (player.curandeiraAtordoada && Date.now() >= (player.curandeiraAtordoadaAte || 0)) {
                player.curandeiraAtordoada = false;
                player.reducaoAtordoada = 0;
            }
        }

        // (a expiração da ROUPA DE CAMUFLAGEM do Sniper é tratada no bloco
        //  "===== SNIPER" mais abaixo, junto dos outros estados de skill)

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
                            const destDanca = validarDestinoJogador(alvo.x - PLAYER_OFFSET_X, alvo.y - PLAYER_OFFSET_Y, mapaPorCoordenada(player.x + PLAYER_OFFSET_X));
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
                        const ret = validarDestinoJogador(d.startX, d.startY, mapaPorCoordenada(player.x + PLAYER_OFFSET_X));
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
                    dashEnviarAoJogador(pid, 'action_ladino_invisivel', { id: pid, ativo: true });
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
                            const destPonto = validarDestinoJogador(pt.x, pt.y, mapaPorCoordenada(player.x + PLAYER_OFFSET_X));
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
                            const destCentro = validarDestinoJogador(e.centroX - PLAYER_OFFSET_X, e.centroY - PLAYER_OFFSET_Y, mapaPorCoordenada(player.x + PLAYER_OFFSET_X));
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
                    const alvosD = slimesNoRaio(dxD, dyD, 300, mapaPorCoordenada(player.x), player.instanciaId);
                    const alvosBossD = [];
                    for (let b of bosses) {
                        if (b.hp > 0 && mapaPorCoordenada(b.x) === mapaPorCoordenada(player.x) && instanciaCompativel(player, b) && Math.hypot(b.x - dxD, b.y - dyD) <= 300) alvosBossD.push(b);
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
                        // ultrapassou o limite: abandona o alvo e volta rápido para o DroneMaster
                        const angV = Math.atan2(pCy - player.dmDroneY, pCx - player.dmDroneX);
                        player.dmDroneX += Math.cos(angV) * DRONE_ASSALTO_VELOCIDADE;
                        player.dmDroneY += Math.sin(angV) * DRONE_ASSALTO_VELOCIDADE;
                        player.dmDroneAlvo = null;
                    } else if (distRobo > 42) {
                        // Mini Robô MUITO rápido: 3x a velocidade do DroneMaster (corre atrás do alvo)
                        const angV = Math.atan2(alvoRobo.y - player.dmDroneY, alvoRobo.x - player.dmDroneX);
                        player.dmDroneX += Math.cos(angV) * DRONE_ASSALTO_VELOCIDADE;
                        player.dmDroneY += Math.sin(angV) * DRONE_ASSALTO_VELOCIDADE;
                    } else {
                        // ataque corpo a corpo mecânico (2x dano do básico, ~0,4s / +50% vel ataque)
                        player.dmDroneAtaqueCd--;
                        if (player.dmDroneAtaqueCd <= 0) {
                            player.dmDroneAtaqueCd = 8; // velocidade de ataque aumentada em +50% (era 12)
                            const danoAssaltoD = Math.round(dmgSkill(player, 'assalto_dm', 13) * 2);
                            if (player.dmDroneAlvo.tipo === 'slime') registrarDanoMonstro(alvoRobo, pid, danoAssaltoD, 'player');
                            else registrarDanoBoss(alvoRobo, pid, danoAssaltoD, 'skill', 'player');
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'action_dm_assalto_ataque',
                                        id: pid,
                                        x: alvoRobo.x,
                                        y: alvoRobo.y,
                                        angulo: Math.atan2(alvoRobo.y - player.dmDroneY, alvoRobo.x - player.dmDroneX)
                                    }));
                                }
                            });
                        }
                    }
                } else {
                    player.dmDroneAlvo = null;
                }
                if (player.dmAssaltoTimer <= 0) {
                    // Tempo acabou: o Mini Robô volta a ser um Drone ACOPLADO em cima do DroneMaster
                    player.dmDroneAlvo = null;
                    player.dmDroneX = player.x + PLAYER_OFFSET_X + 26;
                    player.dmDroneY = player.y + PLAYER_OFFSET_Y - 16;
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
            // ROUPA DE CAMUFLAGEM (vinda do DASH): quando o uniforme cai, o
            // corpo volta ao normal E a Camuflagem Natural cai junto.
            if (player.snRoupaCamo && Date.now() >= (player.snRoupaCamoAte || 0)) {
                player.snRoupaCamo = false;
                player.snRoupaCamoAte = 0;
                // avisa SEMPRE (mesmo com a camuflagem ativa): é este evento que
                // troca o uniforme do personagem na tela dos outros jogadores
                dashEnviar('action_sniper_roupa_camo', { id: pid, ativo: false });
                if (player.snCamuflado) finalizarCamuflagemSniper(player, pid, 'tempo');
            }
            // Camuflado: congelamento dos cooldowns (não contam enquanto escondido)
            if (player.snCamuflado) {
                congelarCooldownsSniper(player, 50);
                if (Date.now() >= (player.snCamofladoAte || 0)) finalizarCamuflagemSniper(player, pid, 'tempo');
                else if (!efeitos.temEfeito(player, 'camuflagem')) finalizarCamuflagemSniper(player, pid, 'efeito_removido');
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
                    const socketDetector = playerSockets[pid];
                    if (socketDetector && socketDetector.readyState === WebSocket.OPEN) {
                        socketDetector.send(JSON.stringify({ type: 'action_sniper_deteccao', id: pid, x: detectou.x, y: detectou.y, alvoId: detectou.id }));
                    }
                }
            }
            if (player.hp <= 0) {
                player.snAim = null;
                player.snPosicao = false;
                if (player.snCamuflado) finalizarCamuflagemSniper(player, pid, 'morte');
                player.snRoupaCamo = false; player.snRoupaCamoAte = 0;
            }
        }

        if (player.classe === 'summoner' && player.hp > 0) {
            if (petRespawnTimer[pid] !== undefined) {
                petRespawnTimer[pid]--;
                if (petRespawnTimer[pid] <= 0) delete petRespawnTimer[pid];
            } else if (!lacaios[pid]) {
                let petHp = calcularVidaPet(player);
                let petSpawnX = player.x + 35, petSpawnY = player.y + 35;
                // Spawn respeita colisão: se a posição padrão cair em parede/obstáculo,
                // procura o ponto livre mais próximo do summoner.
                if (!posicaoPetValida(petSpawnX, petSpawnY)) {
                    const ofsetSpawn = [[0, 0], [45, 0], [-45, 0], [0, 45], [0, -45], [60, 60], [-60, 60], [60, -60], [-60, -60], [90, 0], [-90, 0], [0, 90], [0, -90]];
                    for (let i = 0; i < ofsetSpawn.length; i++) {
                        const cxx = player.x + ofsetSpawn[i][0], cyy = player.y + ofsetSpawn[i][1];
                        if (posicaoPetValida(cxx, cyy)) { petSpawnX = cxx; petSpawnY = cyy; break; }
                    }
                }
                lacaios[pid] = { 
                    x: petSpawnX, y: petSpawnY, hp: petHp, maxHp: petHp, 
                    attackCooldown: 0, angleOffset: Math.random() * Math.PI * 2, 
                    skillCooldown: 0, skill2Cooldown: 0,
                    isJumping: false, jumpStart: null, jumpTarget: null, jumpProgress: 0,
                    targetSlimeId: null, modoAgressivoTimer: 0, focoAlvo: null,
                    petBloqueioTicks: 0, atravessarInimigos: 0,
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
                        let playerColossal = players[pid];
                        let upgradesColossal = (playerColossal && playerColossal.skillUpgrades) || {};

                        // Tier 3 A: Aura do Bastião (raio 140px: inimigos sofrem 20% lentidão)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 3, 'A')) {
                            slimes.forEach(sl => {
                                if (sl.hp > 0 && Math.hypot(sl.x - ogro.x, sl.y - ogro.y) < 140) {
                                    sl.lentidao = Math.min(sl.lentidao || 1, 0.80);
                                    sl.lentidaoTimer = 10;
                                }
                            });
                        }

                        // Tier 4 B: Chuva de Cerco (últimos 6s = 120 ticks: cadência 10 ticks e até 3 alvos)
                        let cadenciaPedra = 20;
                        let maxAlvosPedra = 1;
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 4, 'B') && ogro.colossalTimer <= 120) {
                            cadenciaPedra = 10;
                            maxAlvosPedra = 3;
                        }

                        ogro.colossalPedraCd = (ogro.colossalPedraCd || 0) + 1;
                        if (ogro.colossalPedraCd >= cadenciaPedra) {
                            ogro.colossalPedraCd = 0;
                            ogro.colossalPedrasContador = (ogro.colossalPedrasContador || 0) + 1;
                            const alcancePedraColossal = 650;
                            let isPedraGigante = (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 2, 'B') && (ogro.colossalPedrasContador % 4 === 0));

                            // Seleciona alvos (até maxAlvosPedra)
                            let alvosPedra = [];
                            let slimesNoAlcance = slimes.filter(s => s.hp > 0 && Math.hypot(s.x - ogro.x, s.y - ogro.y) < alcancePedraColossal);
                            slimesNoAlcance.sort((a, b) => Math.hypot(a.x - ogro.x, a.y - ogro.y) - Math.hypot(b.x - ogro.x, b.y - ogro.y));
                            for (let i = 0; i < Math.min(maxAlvosPedra, slimesNoAlcance.length); i++) {
                                alvosPedra.push({ pid: null, x: slimesNoAlcance[i].x, y: slimesNoAlcance[i].y, slimeId: slimesNoAlcance[i].id });
                            }

                            if (alvosPedra.length === 0) {
                                for (let pid2 in players) {
                                    let alvoP = players[pid2];
                                    if (!alvoP || alvoP.hp <= 0 || pid2 === pid) continue;
                                    let d = Math.hypot(alvoP.x - ogro.x, alvoP.y - ogro.y);
                                    if (d <= alcancePedraColossal && alvosPedra.length < maxAlvosPedra) {
                                        alvosPedra.push({ pid: pid2, x: alvoP.x, y: alvoP.y });
                                    }
                                }
                            }

                            alvosPedra.forEach(alvoPedra => {
                                let danoPedra = dmgSkill(players[pid], 'colossal', 30);
                                if (isPedraGigante) {
                                    danoPedra = Math.round(danoPedra * 1.80); // Munição Pesada: +80% dano
                                }

                                if (alvoPedra.pid && players[alvoPedra.pid]) {
                                    aplicarDanoJogador(alvoPedra.pid, ogro.x, ogro.y, danoPedra);
                                } else if (alvoPedra.slimeId) {
                                    let slAlvo = slimes.find(s => s.id === alvoPedra.slimeId);
                                    if (slAlvo) {
                                        if (isPedraGigante) slAlvo.stunTimer = Math.max(slAlvo.stunTimer || 0, 30); // 1.5s stun

                                        // Tier 1 B: Munição Incandescente (queima em raio de 50px por 3s)
                                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 1, 'B')) {
                                            slimes.forEach(slAround => {
                                                if (slAround.hp > 0 && Math.hypot(slAround.x - slAlvo.x, slAround.y - slAlvo.y) < 50) {
                                                    if (efeitos) efeitos.aplicarEfeito(slAround, 'queimadura', 60, 12);
                                                }
                                            });
                                        }

                                        // Tier 3 B: Bombardeio de Estilhaços (3 estilhaços atingem inimigos próximos causando 40% do dano)
                                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 3, 'B')) {
                                            let estilhacos = 0;
                                            slimes.forEach(slEst => {
                                                if (slEst.id !== slAlvo.id && slEst.hp > 0 && Math.hypot(slEst.x - slAlvo.x, slEst.y - slAlvo.y) < 80 && estilhacos < 3) {
                                                    estilhacos++;
                                                    let r = registrarDanoMonstro(slEst, pid, Math.round(danoPedra * 0.40), 'pet');
                                                    broadcastDanoLacaio(slEst.x, slEst.y, r.dano);
                                                }
                                            });
                                        }

                                        registrarDanoMonstro(slAlvo, pid, danoPedra, 'pet');
                                    }
                                }
                                let isIncandescente = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 1, 'B'));
                                let isEstilhacos = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesColossal, 'colossal', 3, 'B'));
                                wss.clients.forEach((client) => {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify({ 
                                            type: 'ogro_pedra_enorme', 
                                            sx: ogro.x, 
                                            sy: ogro.y, 
                                            tx: alvoPedra.x, 
                                            ty: alvoPedra.y, 
                                            gigante: isPedraGigante,
                                            incandescente: isIncandescente,
                                            estilhacos: isEstilhacos
                                        }));
                                    }
                                });
                            });
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
                    // Pouso respeita a colisão do mapa: se o alvo do salto caiu em parede/obstáculo,
                    // acha o ponto livre mais próximo (espiral até 120px do ponto alvo).
                    let pousoX = ogro.jumpTarget.x, pousoY = ogro.jumpTarget.y;
                    if (!posicaoPetValida(pousoX, pousoY)) {
                        let achouPouso = false;
                        for (let raio = 10; raio <= 120 && !achouPouso; raio += 10) {
                            for (let ang = 0; ang < Math.PI * 2 && !achouPouso; ang += Math.PI / 8) {
                                const cxx = ogro.jumpTarget.x + Math.cos(ang) * raio;
                                const cyy = ogro.jumpTarget.y + Math.sin(ang) * raio;
                                if (posicaoPetValida(cxx, cyy)) { pousoX = cxx; pousoY = cyy; achouPouso = true; }
                            }
                        }
                        if (!achouPouso) {
                            pousoX = ogro.jumpStart.x;
                            pousoY = ogro.jumpStart.y;
                        }
                    }
                    ogro.x = pousoX;
                    ogro.y = pousoY;

                    let playerDono = players[pid];
                    let upgradesSalto = (playerDono && playerDono.skillUpgrades) || {};
                    let raioPouso = 70;
                    let multDanoSalto = 1;
                    let stunTicksSalto = 10;

                    // Tier 4 B: Queda Cataclímica (+60% raio = 112px, +50% dano, 2s stun = 40 ticks)
                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSalto, 'salto', 4, 'B')) {
                        raioPouso = 112;
                        multDanoSalto = 1.50;
                        stunTicksSalto = 40;
                    }

                    let danoSaltoFinal = Math.round(dmgSkill(players[pid], 'salto', 35) * multDanoSalto);
                    let primeiroAlvoHit = null;

                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - ogro.x, slime.y - ogro.y) < raioPouso) {
                            if (!primeiroAlvoHit) primeiroAlvoHit = slime;
                            let r = registrarDanoMonstro(slime, pid, danoSaltoFinal, 'pet');
                            broadcastDanoLacaio(slime.x, slime.y, r.dano);
                            slime.stunTimer = Math.max(slime.stunTimer || 0, stunTicksSalto);
                        }
                    });
                    let db = danoEmBosses(ogro.x, ogro.y, raioPouso + 15, pid, danoSaltoFinal, 'skill', 'pet');
                    if (db) {
                        broadcastDanoLacaio(db.x, db.y, db.dano);
                        if (!primeiroAlvoHit && bosses.length > 0) {
                            for (let b of bosses) {
                                if (b.hp > 0 && Math.hypot(b.x - ogro.x, b.y - ogro.y) < raioPouso + 15) {
                                    primeiroAlvoHit = b;
                                    break;
                                }
                            }
                        }
                    }

                    // Tier 1 A: Marca da Presa (alvo principal marcado por 6s: +15% dano)
                    if (primeiroAlvoHit && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSalto, 'salto', 1, 'A')) {
                        primeiroAlvoHit.marcaPresaExpires = Date.now() + 6000;
                        primeiroAlvoHit.marcaPresaOwner = pid;
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({ 
                                    type: 'action_summoner_marca_presa', 
                                    alvoId: primeiroAlvoHit.id, 
                                    alvoTipo: primeiroAlvoHit.tipo || 'slime', 
                                    x: Math.round(primeiroAlvoHit.x), 
                                    y: Math.round(primeiroAlvoHit.y), 
                                    duracao: 6000, 
                                    golemX: Math.round(ogro.x), 
                                    golemY: Math.round(ogro.y) 
                                }));
                            }
                        });
                    }

                    // Tier 4 A: Presa Inescapável (imobiliza por 2.5s, ataques do Golem causam +30%)
                    if (primeiroAlvoHit && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSalto, 'salto', 4, 'A')) {
                        primeiroAlvoHit.isPreso = Date.now() + 2500;
                        primeiroAlvoHit.presoTimer = 50;
                        primeiroAlvoHit.presaInescapavelAte = Date.now() + 2500;
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({ 
                                    type: 'action_summoner_garras_terra', 
                                    x: Math.round(primeiroAlvoHit.x), 
                                    y: Math.round(primeiroAlvoHit.y), 
                                    duracao: 2500 
                                }));
                            }
                        });
                    }

                    // Tier 1 B: Cratera de Impacto (5s, 30% lentidão)
                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSalto, 'salto', 1, 'B')) {
                        summonerCrateras.push({
                            id: proximoSummonerEntidadeId++,
                            ownerId: pid,
                            x: ogro.x,
                            y: ogro.y,
                            raio: 80,
                            lentidao: 0.30,
                            expires: Date.now() + 5000,
                            mapa: playerDono ? playerDono.mapa : null,
                            instanciaId: playerDono ? playerDono.instanciaId : null
                        });
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({ type: 'action_summoner_cratera', x: ogro.x, y: ogro.y, raio: 80, duracao: 5000 }));
                            }
                        });
                    }

                    // Tier 2 A: Caçada Voraz (Golem ganha +40% vel mov e +25% vel atk por 5s)
                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSalto, 'salto', 2, 'A')) {
                        ogro.cacadaVorazExpires = Date.now() + 5000;
                    }

                    // Tier 2 B: Onda de Choque Sísmica (raio 180px, empurra inimigos leves e causa 25 dano)
                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgradesSalto, 'salto', 2, 'B')) {
                        slimes.forEach(s => {
                            let d = Math.hypot(s.x - ogro.x, s.y - ogro.y);
                            if (s.hp > 0 && d >= raioPouso && d <= 180) {
                                let ang = Math.atan2(s.y - ogro.y, s.x - ogro.x);
                                moverMonstroDirecionalComDesvio(s, Math.cos(ang), Math.sin(ang), 40);
                                let r = registrarDanoMonstro(s, pid, 25, 'pet');
                                broadcastDanoLacaio(s.x, s.y, r.dano);
                            }
                        });
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({ type: 'action_summoner_onda_choque', x: ogro.x, y: ogro.y, raio: 180 }));
                            }
                        });
                    }

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
                        moverPetComColisao(ogro, dx, dy, 4.16, slimeAlvo.id);
                    } else {
                        ogro.attackCooldown++;
                        if (ogro.attackCooldown > (ogro.colossalAtivo ? 13 : 27)) {
                            let danoBasePet = dmgSkill(players[pid], 'ogro', 15);
                            let multSoco = 1;
                            let foiMartelo = false;

                            // Tier 4 B: Martelo do Colosso (+70% dano no próximo soco do Golem)
                            if (ogro.marteloColossoAtivo) {
                                multSoco += 0.70;
                                ogro.marteloColossoAtivo = false;
                                foiMartelo = true;
                            }

                            // Tier 2 B: Fratura Exposta (+15% dano recebido de ataques básicos do Golem)
                            if (slimeAlvo.fraturaExpostaExpires && slimeAlvo.fraturaExpostaExpires > agora) {
                                multSoco += 0.15;
                            }

                            let danoFinalSoco = Math.round(danoBasePet * multSoco);
                            let r = registrarDanoMonstro(slimeAlvo, pid, danoFinalSoco, 'pet');
                            broadcastDanoLacaio(slimeAlvo.x, slimeAlvo.y, r ? r.dano : danoFinalSoco);

                            if (foiMartelo) {
                                wss.clients.forEach(c => {
                                    if (c.readyState === WebSocket.OPEN) {
                                        c.send(JSON.stringify({ type: 'action_summoner_martelo_colosso_hit', x: slimeAlvo.x, y: slimeAlvo.y, dano: (r ? r.dano : danoFinalSoco), pid: pid }));
                                    }
                                });
                            }

                            let db = danoEmBosses(ogro.x, ogro.y, 95, pid, danoFinalSoco, 'basico', 'pet');
                            if (db) broadcastDanoLacaio(db.x, db.y, db.dano);
                            ogro.attackCooldown = 0;
                        }
                    }
                } else if (bossAlvo) {
                    let dxB = bossAlvo.x - ogro.x;
                    let dyB = bossAlvo.y - ogro.y;
                    let distB = Math.hypot(dxB, dyB);
                    if (distB > 42) {
                        moverPetComColisao(ogro, dxB, dyB, 4.16, bossAlvo.id);
                    } else {
                        ogro.attackCooldown++;
                        if (ogro.attackCooldown > (ogro.colossalAtivo ? 13 : 27)) {
                            let danoBasePet = dmgSkill(players[pid], 'ogro', 15);
                            let multSoco = 1;
                            let foiMartelo = false;

                            if (ogro.marteloColossoAtivo) {
                                multSoco += 0.70;
                                ogro.marteloColossoAtivo = false;
                                foiMartelo = true;
                            }

                            if (bossAlvo.fraturaExpostaExpires && bossAlvo.fraturaExpostaExpires > agora) {
                                multSoco += 0.15;
                            }

                            let danoFinalSoco = Math.round(danoBasePet * multSoco);
                            registrarDanoBoss(bossAlvo, pid, danoFinalSoco, 'basico');

                            if (foiMartelo) {
                                wss.clients.forEach(c => {
                                    if (c.readyState === WebSocket.OPEN) {
                                        c.send(JSON.stringify({ type: 'action_summoner_martelo_colosso_hit', x: bossAlvo.x, y: bossAlvo.y, dano: danoFinalSoco, pid: pid }));
                                    }
                                });
                            }

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
                        moverPetComColisao(ogro, dx, dy, Math.min(dist, velocidadePet), null);
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
            // LADINO — Dança das Adagas / ARQUEIRO — Salto + Chuva: imunes ao veneno do pântano
            if (!p.ladinoDancaAtivo && !p.imune && efeitos.temEfeito(p, 'veneno') && global.venenoTick % 10 === 0) {
                const veneno = efeitos.pegarEfeito(p, 'veneno');
                const danoVeneno = Math.max(5, Math.round(5 * ((veneno && veneno.intensidade) || 1)));
                p.hp = Math.max(0, p.hp - itemSystem.reduzirDanoPelaDefesaEquipamento(
                    p.classe,
                    p.inventario && p.inventario.slots || {},
                    danoVeneno
                ));
            }
        }
    }

    // ===== ZONAS DE UPGRADES DO SUMMONER (Fendas, Crateras, Impactos Atrasados, Colapsos) =====
    for (let i = summonerFendas.length - 1; i >= 0; i--) {
        const z = summonerFendas[i];
        if (agora >= z.expires) {
            let dono = players[z.ownerId];
            let upFenda = (dono && dono.skillUpgrades) || {};
            // Tier 3 A: Prisão de Placas (no instante em que a fissura fecha, placas rochosas prendem todos na área)
            if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upFenda, 'esmagamento', 3, 'A')) {
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                        s.isPreso = agora + 700;
                        s.presoTimer = 14;
                    }
                });
                bosses.forEach(b => {
                    if (b.hp > 0 && Math.hypot(b.x - z.x, b.y - z.y) < z.raio) {
                        b.isPreso = agora + 700;
                        b.presoTimer = 14;
                    }
                });
                wss.clients.forEach(c => {
                    if (c.readyState === WebSocket.OPEN) {
                        c.send(JSON.stringify({ type: 'action_summoner_prisao_placas', x: z.x, y: z.y, raio: z.raio, duracao: 700 }));
                    }
                });
            }
            summonerFendas.splice(i, 1);
            continue;
        }
        if (agora >= z.nextTick) {
            z.nextTick = agora + 1000;
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                    let r = registrarDanoMonstro(s, z.ownerId, z.dano, 'pet');
                    broadcastDanoLacaio(s.x, s.y, r ? r.dano : z.dano);
                    s.lentidao = Math.min(s.lentidao || 1, 1 - z.lentidao);
                    s.lentidaoTimer = 20;
                }
            });
            let db = danoEmBosses(z.x, z.y, z.raio, z.ownerId, z.dano, 'skill', 'pet');
            if (db) broadcastDanoLacaio(db.x, db.y, db.dano);
        }
    }

    // Colapso Territorial (Esmagamento 4A: lentidão 50% e tremores por 3s + implosão final com puxão forte)
    for (let i = summonerColapsos.length - 1; i >= 0; i--) {
        const z = summonerColapsos[i];
        if (agora >= z.expires) {
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                    let ang = Math.atan2(z.y - s.y, z.x - s.x);
                    moverMonstroDirecionalComDesvio(s, Math.cos(ang), Math.sin(ang), 45);
                    let r = registrarDanoMonstro(s, z.ownerId, z.danoFinal, 'pet');
                    broadcastDanoLacaio(s.x, s.y, r ? r.dano : z.danoFinal);
                }
            });
            let db = danoEmBosses(z.x, z.y, z.raio, z.ownerId, z.danoFinal, 'skill', 'pet');
            if (db) broadcastDanoLacaio(db.x, db.y, db.dano);
            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ type: 'action_summoner_colapso_territorial_implosao', x: z.x, y: z.y, raio: z.raio }));
                }
            });
            summonerColapsos.splice(i, 1);
            continue;
        }
        slimes.forEach(s => {
            if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                s.lentidao = Math.min(s.lentidao || 1, 0.50);
                s.lentidaoTimer = 10;
            }
        });
    }

    for (let i = summonerCrateras.length - 1; i >= 0; i--) {
        const z = summonerCrateras[i];
        if (agora >= z.expires) {
            summonerCrateras.splice(i, 1);
            continue;
        }
        slimes.forEach(s => {
            if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                s.lentidao = Math.min(s.lentidao || 1, 1 - z.lentidao);
                s.lentidaoTimer = 10;
            }
        });
    }

    for (let i = summonerImpactosAtrasados.length - 1; i >= 0; i--) {
        const z = summonerImpactosAtrasados[i];
        if (agora >= z.triggerAt) {
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - z.x, s.y - z.y) < z.raio) {
                    let r = registrarDanoMonstro(s, z.ownerId, z.dano, 'pet');
                    broadcastDanoLacaio(s.x, s.y, r ? r.dano : z.dano);
                }
            });
            let db = danoEmBosses(z.x, z.y, z.raio, z.ownerId, z.dano, 'skill', 'pet');
            if (db) broadcastDanoLacaio(db.x, db.y, db.dano);
            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ type: 'action_ogro_sismico_segundo', x: z.x, y: z.y, raio: z.raio }));
                }
            });
            summonerImpactosAtrasados.splice(i, 1);
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

    // ============ FLORIM: ARVORES, SEMENTES, ESPINHOS, PAREDES E PASSIVA ============
    for (let i = florimArvores.length - 1; i >= 0; i--) {
        const z = florimArvores[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_arvore_fim', id: z.id, x: z.x, y: z.y }); florimArvores.splice(i, 1); continue; }
        if (z.tempo % 20 === 0) {
            let alvosCurados = [];
            let curaVal = z.curaBase || 30;
            for (let pid in players) {
                const p = players[pid]; if (!p || p.hp <= 0) continue;
                if (entidadeEhSolari(p) !== !!z.solari) continue;
                if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
                if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > 100) continue;
                const ehAliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
                if (ehAliado) { 
                    aplicarCuraAoJogador(pid, curaVal, z.ownerId);
                    alvosCurados.push({ id: pid, x: Math.round(p.x + PLAYER_OFFSET_X), y: Math.round(p.y + PLAYER_OFFSET_Y), valor: curaVal });
                }
            }
            florimBroadcastGlobal({ type: 'action_florim_arvore_cura', id: z.id, x: z.x, y: z.y, alvos: alvosCurados, valor: curaVal });
        }
    }

    for (let i = florimSementes.length - 1; i >= 0; i--) {
        const z = florimSementes[i]; z.tempo--;
        if (z.estado === 'carnivora') {
            if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
            if (z.tempo % 20 === 0) {
                for (const m of slimes) { if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y)<=60) registrarDanoMonstro(m, z.ownerId, 25, 'skill'); }
                for (const b of bosses) { if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y)<=60) registrarDanoBoss(b, z.ownerId, 25, 'skill', 'skill'); }
                for (let pid in players) { const q = players[pid]; if (!q || q.hp<=0 || entidadeEhSolari(q)!==!!z.solari || (!z.solari && mapaPorCoordenada(q.x+PLAYER_OFFSET_X)!==z.mapa)) continue; if (Math.hypot((q.x+PLAYER_OFFSET_X)-z.x,(q.y+PLAYER_OFFSET_Y)-z.y)<=60 && pid!==z.ownerId && pvpPodeAtacar(z.ownerId, pid)) { aplicarDanoPvP(z.ownerId, pid, 25, 'natureza'); sincronizarEfeitos(pid, q); } }
            }
            continue;
        }
        if (z.estado === 'rosa') {
            if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
            if (z.tempo % 20 === 0) {
                for (let pid in players) {
                    const p = players[pid]; if (!p || p.hp <= 0) continue;
                    if (entidadeEhSolari(p) !== !!z.solari) continue;
                    if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
                    if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > 60) continue;
                    const ehAliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
                    if (ehAliado) { p.mana = Math.min((p.mana || 0) + 8, p.maxMp || 100); wss.clients.forEach(c => { if(c._playerId === pid && c.readyState === 1) c.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp })); }); }
                }
            }
            continue;
        }
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
        
        let ativou = false, aliado = false, alvoId = null;
        for (let pid in players) {
            const p = players[pid]; if (!p || p.hp <= 0) continue;
            if (entidadeEhSolari(p) !== !!z.solari) continue;
            if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
            if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > z.raio) continue;
            aliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
            if (!aliado && !pvpPodeAtacar(z.ownerId, pid)) continue;
            ativou = true; alvoId = pid; break;
        }
        if (!ativou) {
            for (const m of slimes) { if (!m || m.hp <= 0 || entidadeEhSolari(m) !== !!z.solari || (!z.solari && mapaPorCoordenada(m.x) !== z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y) <= z.raio) { ativou=true; alvoId=m.id; aliado=false; break; } }
        }
        if (!ativou) {
            for (const b of bosses) { if (!b || b.hp <= 0 || entidadeEhSolari(b) !== !!z.solari || (!z.solari && mapaPorCoordenada(b.x) !== z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y) <= z.raio) { ativou=true; alvoId=b.id; aliado=false; break; } }
        }
        if (ativou) {
            if (aliado) { z.estado = 'rosa'; z.tempo = 80; florimBroadcastGlobal({ type:'action_florim_semente_ativada', id:z.id, x:z.x, y:z.y, tipo:'rosa' }); }
            else { z.estado = 'carnivora'; z.tempo = 100; florimBroadcastGlobal({ type:'action_florim_semente_ativada', id:z.id, x:z.x, y:z.y, tipo:'carnivora' }); }
        }
    }

    for (let i = florimEspinhos.length - 1; i >= 0; i--) {
        const z = florimEspinhos[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_espinhos_fim', id: z.id, x: z.x, y: z.y }); florimEspinhos.splice(i, 1); continue; }
        
        let inimigosAfetados = [];
        for (const m of slimes) { 
            if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue; 
            if (Math.hypot(m.x-z.x,m.y-z.y)<=z.raio) { 
                efeitos.aplicarEfeito(m,'reducaoDef',100,.20); 
                efeitos.aplicarEfeito(m,'reducaoAtk',100,.20);
                m.reducaoDefTimer = 100;
                m.reducaoAtkTimer = 100;
                inimigosAfetados.push({ tipo: 'slime', id: m.id, x: Math.round(m.x), y: Math.round(m.y) });
            } 
        }
        for (const b of bosses) { 
            if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue; 
            if (Math.hypot(b.x-z.x,b.y-z.y)<=z.raio) { 
                efeitos.aplicarEfeito(b,'reducaoDef',100,.20); 
                efeitos.aplicarEfeito(b,'reducaoAtk',100,.20);
                b.reducaoDefTimer = 100;
                b.reducaoAtkTimer = 100;
                inimigosAfetados.push({ tipo: 'boss', id: b.id, x: Math.round(b.x), y: Math.round(b.y) });
            } 
        }
        for (let pid in players) { 
            const q = players[pid]; 
            if (!q || q.hp<=0 || entidadeEhSolari(q)!==!!z.solari || (!z.solari && mapaPorCoordenada(q.x+PLAYER_OFFSET_X)!==z.mapa)) continue; 
            if (Math.hypot((q.x+PLAYER_OFFSET_X)-z.x,(q.y+PLAYER_OFFSET_Y)-z.y)<=z.raio && pid!==z.ownerId && pvpPodeAtacar(z.ownerId, pid)) { 
                efeitos.aplicarEfeito(q,'reducaoDef',100,.20); 
                efeitos.aplicarEfeito(q,'reducaoAtk',100,.20); 
                sincronizarEfeitos(pid, q);
                inimigosAfetados.push({ tipo: 'player', id: pid, x: Math.round(q.x + PLAYER_OFFSET_X), y: Math.round(q.y + PLAYER_OFFSET_Y) });
            } 
        }
        if (z.tempo % 20 === 0 && inimigosAfetados.length > 0) {
            florimBroadcastGlobal({ type: 'action_florim_espinhos_debuff', id: z.id, alvos: inimigosAfetados });
        }
    }

    for (let i = florimParedes.length - 1; i >= 0; i--) {
        const z = florimParedes[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_parede_fim', id: z.id, x: z.x, y: z.y }); florimParedes.splice(i, 1); continue; }
        if (z.tempo % 10 === 0) {
            for (const m of slimes) { if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y)<=z.raio) { m.isPreso=Math.max(m.isPreso||0,Date.now()+250); efeitos.aplicarEfeito(m,'paralisia',5,1); } }
            for (const b of bosses) { if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y)<=z.raio) { b.isPreso=Math.max(b.isPreso||0,Date.now()+250); efeitos.aplicarEfeito(b,'paralisia',5,1); } }
            for (let pid in players) { const q = players[pid]; if (!q || q.hp<=0 || entidadeEhSolari(q)!==!!z.solari || (!z.solari && mapaPorCoordenada(q.x+PLAYER_OFFSET_X)!==z.mapa)) continue; if (Math.hypot((q.x+PLAYER_OFFSET_X)-z.x,(q.y+PLAYER_OFFSET_Y)-z.y)<=z.raio && pid!==z.ownerId && pvpPodeAtacar(z.ownerId, pid)) { q.isPreso=Math.max(q.isPreso||0,Date.now()+250); efeitos.aplicarEfeito(q,'paralisia',5,1); sincronizarEfeitos(pid, q); } }
        }
    }

    global.florimPassivaTick = ((global.florimPassivaTick || 0) + 1);
    if (global.florimPassivaTick % 40 === 0) {
        for (let fid in players) {
            const f = players[fid];
            if (!f || f.hp <= 0 || f.classe !== 'florim') continue;
            for (let pid in players) {
                const p = players[pid]; if (!p || p.hp <= 0) continue;
                if (entidadeEhSolari(p) !== entidadeEhSolari(f)) continue;
                if (!entidadeEhSolari(f) && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(f.x + PLAYER_OFFSET_X)) continue;
                if (Math.hypot((p.x + PLAYER_OFFSET_X) - (f.x + PLAYER_OFFSET_X), (p.y + PLAYER_OFFSET_Y) - (f.y + PLAYER_OFFSET_Y)) > 120) continue;
                const ehAliado = pid === fid || (f.partyId && p.partyId === f.partyId);
                if (ehAliado) { 
                    p.mana = Math.min((p.mana || 0) + 5, p.maxMp || 100); 
                    wss.clients.forEach(c => { if(c._playerId === pid && c.readyState === 1) c.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp })); });
                } else if (pvpPodeAtacar(fid, pid)) {
                    efeitos.aplicarEfeito(p, 'sangramento', 60, 2); 
                    sincronizarEfeitos(pid, p);
                }
            }
            for (const m of slimes) {
                if (!m || m.hp <= 0 || entidadeEhSolari(m) !== entidadeEhSolari(f) || (!entidadeEhSolari(f) && mapaPorCoordenada(m.x) !== mapaPorCoordenada(f.x + PLAYER_OFFSET_X))) continue;
                if (Math.hypot(m.x - (f.x + PLAYER_OFFSET_X), m.y - (f.y + PLAYER_OFFSET_Y)) <= 120) efeitos.aplicarEfeito(m, 'sangramento', 60, 2);
            }
            for (const b of bosses) {
                if (!b || b.hp <= 0 || entidadeEhSolari(b) !== entidadeEhSolari(f) || (!entidadeEhSolari(f) && mapaPorCoordenada(b.x) !== mapaPorCoordenada(f.x + PLAYER_OFFSET_X))) continue;
                if (Math.hypot(b.x - (f.x + PLAYER_OFFSET_X), b.y - (f.y + PLAYER_OFFSET_Y)) <= 120) efeitos.aplicarEfeito(b, 'sangramento', 60, 2);
            }
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
            let ehAliado = (pidC === z.ownerId) || (donoC.partyId && pC.partyId === donoC.partyId);
            if (!ehAliado) continue; // v1.39.4: Caixa de suprimento apenas no grupo
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
                    aplicarCuraAoJogador(alvoId, curaAura, healerId);
                    alvos.push({ id: alvoId, x: alvo.x + 12, y: alvo.y + 16 });
                }
            }
            transmitirAura('action_aura_sagrada_tick', healerId, { x: healer.x + 12, y: healer.y + 16, alvos: alvos });
            let wsMana = playerSockets[healerId];
            if (wsMana && wsMana.readyState === WebSocket.OPEN) wsMana.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(healer.mana), maxMp: healer.maxMp }));
        }
    }

    // ============ REGEN DE MANA & EFEITOS AMBIENTAIS DE BIOMA (a cada 0,5s) ============
    global.manaTick = ((global.manaTick || 0) + 1);
    if (global.manaTick % 10 === 0) {
        for (let pid in players) {
            let p = players[pid];
            if (p.mana === undefined) { p.mana = p.maxMp || 50; continue; }
            if (!p.maxMp) p.maxMp = calcularMaxMp(p);
            let regen = Math.max(1, Math.ceil(p.maxMp * 0.03));
            let wsTarget = playerSockets[pid];

            // Mecânicas ambientais nos Biomas do Continente de Gaia
            if (p.hp > 0 && mapaMundo && (p.mapa === 'mundo' || !p.mapa)) {
                // 1. LAVA DO VULCÃO: Dano contínuo de Fogo
                if (typeof mapaMundo.ehLava === 'function' && mapaMundo.ehLava(p.x, p.y)) {
                    aplicarDanoAmbiente(pid, 8, 'fogo', '🔥 Lava (-8)');
                }
                // 2. PÂNTANO: Águas de Veneno tóxicas
                else if (typeof mapaMundo.ehVeneno === 'function' && mapaMundo.ehVeneno(p.x, p.y)) {
                    aplicarDanoAmbiente(pid, 5, 'veneno', '🧪 Veneno (-5)');
                }
                // 3. VALE DOS CRISTAIS: Ressonância Arcana (+12 MP de regen extra)
                if (typeof mapaMundo.ehCristal === 'function' && mapaMundo.ehCristal(p.x, p.y)) {
                    regen += 12;
                }
                // 4. SELVA PROIBIDA: Vitalidade Primordial (+4 HP a cada 0.5s)
                if (typeof mapaMundo.ehSelva === 'function' && mapaMundo.ehSelva(p.x, p.y) && p.hp < p.maxHp) {
                    p.hp = Math.min(p.maxHp, p.hp + 4);
                    if (wsTarget && wsTarget.readyState === WebSocket.OPEN) {
                        wsTarget.send(JSON.stringify({ type: 'hp_sync', hp: p.hp, maxHp: p.maxHp }));
                    }
                }
            }

            p.mana = Math.min(p.maxMp, p.mana + regen);
            if (wsTarget && wsTarget.readyState === WebSocket.OPEN) {
                wsTarget.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
            }
        }
    }

    for (let pid in bandas) {
        let banda = bandas[pid];
        let player = players[pid];
        if (!player || player.hp <= 0 || (banda.expiraEm && Date.now() > banda.expiraEm)) {
            delete bandas[pid];
            continue;
        }

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
                    m.x += (dx / dist) * 3.3; // +50% vel movimento (era 2.2)
                    m.y += (dy / dist) * 3.3;
                } else {
                    m.attackCooldown++;
                    if (m.attackCooldown > 22) { // +80% vel ataque (era 40)
                        registrarDanoMonstro(slimeAlvo, pid, dmgSkill(players[pid], 'banda', 12), 'pet'); // +20% dano (era 10)
                        danoEmBosses(m.x, m.y, 45, pid, dmgSkill(players[pid], 'banda', 12), 'basico', 'pet');
                        m.attackCooldown = 0;
                    }
                }
            } else if (bossAlvo) {
                let dxB = bossAlvo.x - m.x;
                let dyB = bossAlvo.y - m.y;
                let distB = Math.hypot(dxB, dyB);
                if (distB > 34) {
                    m.x += (dxB / distB) * 3.3; // +50% vel movimento (era 2.2)
                    m.y += (dyB / distB) * 3.3;
                } else {
                    m.attackCooldown++;
                    if (m.attackCooldown > 22) { // +80% vel ataque (era 40)
                        registrarDanoBoss(bossAlvo, pid, dmgSkill(players[pid], 'banda', 12), 'basico'); // +20% dano (era 10)
                        m.attackCooldown = 0;
                    }
                }
            } else {
                let dx = player.x - m.x;
                let dy = player.y - m.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 28) {
                    m.x += (dx / dist) * Math.min(dist, 4.8); // +50% vel retorno (era 3.2)
                    m.y += (dy / dist) * Math.min(dist, 4.8);
                }
            }
        }
    }

    for (let i = blizzards.length - 1; i >= 0; i--) {
        let b = blizzards[i];
        if (b.expiresAt && Date.now() >= b.expiresAt) {
            // Ao expirar: estacas de gelo ou mini tornados
            if (b.miniTornados) {
                for (let k = 0; k < 4; k++) {
                    let angMini = (Math.PI * 2 / 4) * k;
                    magoMiniTornados.push({
                        x: b.x + Math.cos(angMini) * 25,
                        y: b.y + Math.sin(angMini) * 25,
                        ownerId: b.ownerId,
                        duracao: 100,
                        expiresAt: Date.now() + 5000,
                        dano: Math.round((b.danoNevasca || 6) * 1.5)
                    });
                }
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_mini_tornados_spawn', x: b.x, y: b.y, count: 4, duracaoMs: 5000 }));
                });
            }
            if (b.estacasGelo) {
                let danoEstacas = Math.round((b.danoNevasca || 6) * 4);
                slimes.forEach(slime => {
                    if (slime.hp > 0 && Math.hypot(slime.x - b.x, slime.y - b.y) <= b.radius) {
                        registrarDanoMonstro(slime, b.ownerId, danoEstacas);
                    }
                });
                danoEmBosses(b.x, b.y, b.radius, b.ownerId, danoEstacas, 'skill');
                wss.clients.forEach(c => {
                    if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify({ type: 'action_mago_estacas_explosao', x: b.x, y: b.y, raio: b.radius }));
                });
            }
            blizzards.splice(i, 1);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'sound_event', action: 'stop', soundId: b.soundId }));
            });
            continue;
        }
        b.duracao--;

        // Tornado Crescente Caçador (Tier 4 B): aumenta de tamanho e persegue alvos
        if (b.crescente) {
            b.radius = Math.min(b.maxRadius || 200, b.radius + 0.35);
            b.danoNevasca = (b.danoNevasca || 6) * 1.002;
        }
        if (b.perseguidor) {
            let nearest = null;
            let minDist = 400;
            slimes.forEach(s => {
                if (s.hp > 0) {
                    let d = Math.hypot(s.x - b.x, s.y - b.y);
                    if (d < minDist) { minDist = d; nearest = s; }
                }
            });
            if (!nearest) {
                bosses.forEach(bs => {
                    if (bs.hp > 0) {
                        let d = Math.hypot(bs.x - b.x, bs.y - b.y);
                        if (d < minDist) { minDist = d; nearest = bs; }
                    }
                });
            }
            if (nearest && minDist > 15) {
                let dx = nearest.x - b.x, dy = nearest.y - b.y;
                b.x += (dx / minDist) * 1.6;
                b.y += (dy / minDist) * 1.6;
            }
        }

        slimes.forEach(slime => {
            if (slime.hp > 0 && Math.hypot(slime.x - b.x, slime.y - b.y) < b.radius) {
                if (b.isFogo) {
                    efeitos.aplicarEfeito(slime, 'queimadura', 60, 4);
                } else {
                    slime.slowTimer = 15;
                    efeitos.aplicarEfeito(slime, 'gelo', 60, 1);
                }
                if (b.isTornado) {
                    efeitos.aplicarEfeito(slime, 'debuff_defesa', 40, 20);
                }
                if (b.congelamentoProfundo) {
                    slime.tempoEmNevasca = (slime.tempoEmNevasca || 0) + 1;
                    if (slime.tempoEmNevasca >= 60) {
                        slime.stunTimer = Math.max(slime.stunTimer || 0, 30);
                        efeitos.aplicarEfeito(slime, 'congelado', 30, 1);
                        slime.tempoEmNevasca = 0;
                    }
                }
                if (b.duracao % 20 === 0) {
                    registrarDanoMonstro(slime, b.ownerId, b.danoNevasca || 6);
                }
            }
        });

        if (b.duracao % 20 === 0) {
            danoEmBosses(b.x, b.y, b.radius, b.ownerId, b.danoNevasca || 6, 'skill');
            bosses.forEach(bb => {
                if (bb.hp > 0 && Math.hypot(bb.x - b.x, bb.y - b.y) < b.radius) {
                    if (b.isFogo) {
                        efeitos.aplicarEfeito(bb, 'queimadura', 60, 4);
                    } else {
                        efeitos.aplicarEfeito(bb, 'gelo', 60, 1);
                    }
                    if (b.isTornado) {
                        efeitos.aplicarEfeito(bb, 'debuff_defesa', 40, 20);
                    }
                    if (b.congelamentoProfundo) {
                        bb.tempoEmNevasca = (bb.tempoEmNevasca || 0) + 1;
                        if (bb.tempoEmNevasca >= 60) {
                            bb.stunTimer = Math.max(bb.stunTimer || 0, 30);
                            efeitos.aplicarEfeito(bb, 'congelado', 30, 1);
                            bb.tempoEmNevasca = 0;
                        }
                    }
                }
            });
        }

        if (b.duracao <= 0 || (b.expiresAt && Date.now() >= b.expiresAt)) {
            if (b.miniTornados) {
                for (let k = 0; k < 4; k++) {
                    let angMini = (Math.PI * 2 / 4) * k;
                    magoMiniTornados.push({
                        x: b.x + Math.cos(angMini) * 25,
                        y: b.y + Math.sin(angMini) * 25,
                        ownerId: b.ownerId,
                        duracao: 100,
                        expiresAt: Date.now() + 5000,
                        dano: Math.round((b.danoNevasca || 6) * 1.5)
                    });
                }
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_mini_tornados_spawn', x: b.x, y: b.y, count: 4, duracaoMs: 5000 }));
                });
            }
            if (b.estacasGelo) {
                let danoEstacas = Math.round((b.danoNevasca || 6) * 4);
                slimes.forEach(slime => {
                    if (slime.hp > 0 && Math.hypot(slime.x - b.x, slime.y - b.y) <= b.radius) {
                        registrarDanoMonstro(slime, b.ownerId, danoEstacas);
                    }
                });
                danoEmBosses(b.x, b.y, b.radius, b.ownerId, danoEstacas, 'skill');
                wss.clients.forEach(c => {
                    if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify({ type: 'action_mago_estacas_explosao', x: b.x, y: b.y, raio: b.radius }));
                });
            }
            blizzards.splice(i, 1);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'sound_event', action: 'stop', soundId: b.soundId }));
            });
        }
    }

    for (let vi = vulcoes.length - 1; vi >= 0; vi--) {
        let v = vulcoes[vi];
        v.duracao--;
        const upgV = v.upgrades || {};

        // Zona de Calor (Tier 4 A): raio 220 enfraquecendo velocidade de ataque e reduzindo 10% defesa
        if (upgV.zonaCalor && v.duracao % 20 === 0) {
            slimes.forEach(slime => {
                if (slime.hp > 0 && Math.hypot(slime.x - v.x, slime.y - v.y) < 220) {
                    efeitos.aplicarEfeito(slime, 'debuff_defesa', 40, 10);
                }
            });
            bosses.forEach(b => {
                if (b.hp > 0 && Math.hypot(b.x - v.x, b.y - v.y) < 220) {
                    efeitos.aplicarEfeito(b, 'debuff_defesa', 40, 10);
                }
            });
        }

        if (v.emergindo > 0) { v.emergindo--; }
        else {
            v.tickCounter++;
            const freqTiro = upgV.cadenciaDupla ? 10 : 20;
            const qtdDisparos = upgV.cadenciaDupla ? 2 : 1;

            if (v.tickCounter % freqTiro === 0) {
                for (let q = 0; q < qtdDisparos; q++) {
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
                            if (upgV.pocasLava) efeitos.aplicarEfeito(slime, 'debuff_ataque', 100, 30);
                        }
                    });
                    danoEmBosses(pp.tx, pp.ty, raioImpacto + 10, v.ownerId, v.danoImpacto, 'skill');
                    bosses.forEach(b => {
                        if (b.hp > 0 && Math.hypot(b.x - pp.tx, b.y - pp.ty) < raioImpacto + 10) {
                            efeitos.aplicarEfeito(b, 'stun', 10, 1);
                            efeitos.aplicarEfeito(b, 'queimadura', 200, v.danoDot);
                            if (upgV.pocasLava) efeitos.aplicarEfeito(b, 'debuff_ataque', 100, 5);
                        }
                    });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'vulcao_impacto', tx: pp.tx, ty: pp.ty, tipo: pp.tipo, id: pp.id
                            }));
                        }
                    });
                    // Segunda Explosão (Tier 3 A): detonação secundária 200ms depois
                    if (upgV.segundaExplosao) {
                        setTimeout(() => {
                            const dSegunda = Math.round(v.danoImpacto * 0.7);
                            slimes.forEach(s => {
                                if (s.hp > 0 && Math.hypot(s.x - pp.tx, s.y - pp.ty) < raioImpacto) {
                                    registrarDanoMonstro(s, v.ownerId, dSegunda);
                                }
                            });
                            danoEmBosses(pp.tx, pp.ty, raioImpacto + 10, v.ownerId, dSegunda, 'skill');
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_mago_vulcao_segunda_explosao', x: pp.tx, y: pp.ty, raio: raioImpacto }));
                                }
                            });
                        }, 200);
                    }
                }
                if (pp.timer <= -5) v.projeteis.splice(pi, 1);
            }
        }
        if (v.duracao <= 0) vulcoes.splice(vi, 1);
    }

    // ===== TICKS DOS LACAIOS E ENTIDADES DO MAGO =====
    // 1. Golem Incandescente do Mago (Vulcão Lado B)
    for (let pid in golemsMago) {
        let g = golemsMago[pid];
        let p = players[pid];
        if (!p || p.hp <= 0 || Date.now() >= g.expiresAt) {
            delete golemsMago[pid];
            wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_golem_despawn', ownerId: pid })); });
            continue;
        }

        // Segue o Mago mantendo proximidade
        let distP = Math.hypot(p.x - g.x, p.y - g.y);
        if (distP > 50) {
            let ang = Math.atan2(p.y - g.y, p.x - g.x);
            g.x += Math.cos(ang) * 4.2;
            g.y += Math.sin(ang) * 4.2;
        }

        // Procura inimigos próximos em raio 350
        let alvoGolem = slimes.find(s => s.hp > 0 && Math.hypot(s.x - g.x, s.y - g.y) < 350);
        if (!alvoGolem) alvoGolem = bosses.find(b => b.hp > 0 && Math.hypot(b.x - g.x, b.y - g.y) < 350);

        if (alvoGolem) {
            // Ataque básico (projéteis de fogo / gelo)
            if (Date.now() >= g.nextAtk) {
                g.nextAtk = Date.now() + (g.hasGeloHand ? 700 : 1000);
                g.altMao = !g.altMao;
                let tipoAtk = (g.hasGeloHand && g.altMao) ? 'gelo' : 'fogo';
                let danoAtk = (tipoAtk === 'gelo') ? Math.round(g.danoBase * 1.35) : g.danoBase;
                let projId = 'golem_proj_' + Date.now() + '_' + Math.floor(Math.random() * 999);
                wss.clients.forEach(c => {
                    if (c.readyState === 1) {
                        c.send(JSON.stringify({
                            type: 'action_mago_golem_atk',
                            ownerId: pid, gx: g.x, gy: g.y, tx: alvoGolem.x, ty: alvoGolem.y, tipo: tipoAtk, id: projId
                        }));
                    }
                });
                setTimeout(() => {
                    if (alvoGolem && alvoGolem.hp > 0) {
                        registrarDanoMonstro(alvoGolem, pid, danoAtk, 'pet');
                        if (tipoAtk === 'gelo') efeitos.aplicarEfeito(alvoGolem, 'gelo', 50, 1);
                        else efeitos.aplicarEfeito(alvoGolem, 'queimadura', 60, 4);
                    }
                }, 220);
            }

            // Rugido com Bolha Protetora 20% HP Máx (Tier 3 B - a cada 10s)
            if (g.hasRugido && Date.now() >= g.nextRoar) {
                g.nextRoar = Date.now() + 10000;
                let escudoValor = Math.round((p.maxHp || 100) * 0.20);
                p.escudoMago = escudoValor;
                p.escudoMagoMax = escudoValor;
                wss.clients.forEach(c => {
                    if (c.readyState === 1) {
                        c.send(JSON.stringify({ type: 'action_mago_golem_rugido', ownerId: pid, gx: g.x, gy: g.y }));
                        c.send(JSON.stringify({ type: 'action_mago_escudo_sync', id: pid, valor: escudoValor, max: escudoValor }));
                    }
                });
            }

            // Meteoros de Fogo e Gelo periódicos (Tier 4 B - a cada 5s)
            if (g.hasMeteoros && Date.now() >= g.nextMeteor) {
                g.nextMeteor = Date.now() + 5000;
                let ex = alvoGolem.x, ey = alvoGolem.y;
                wss.clients.forEach(c => {
                    if (c.readyState === 1) c.send(JSON.stringify({ type: 'action_mago_golem_meteoros', ownerId: pid, x: ex, y: ey }));
                });
                setTimeout(() => {
                    slimes.forEach(s => { if (s.hp > 0 && Math.hypot(s.x - ex, s.y - ey) < 75) registrarDanoMonstro(s, pid, 35, 'pet'); });
                    danoEmBosses(ex, ey, 80, pid, 35, 'skill', 'pet');
                }, 350);
                setTimeout(() => {
                    slimes.forEach(s => {
                        if (s.hp > 0 && Math.hypot(s.x - ex, s.y - ey) < 75) {
                            registrarDanoMonstro(s, pid, 35, 'pet');
                            s.stunTimer = Math.max(s.stunTimer || 0, 20);
                            efeitos.aplicarEfeito(s, 'congelado', 20, 1);
                        }
                    });
                    danoEmBosses(ex, ey, 80, pid, 35, 'skill', 'pet');
                }, 750);
            }
        }
    }

    // 2. Mini-Tornados do Mago (Nevasca B3)
    for (let ti = magoMiniTornados.length - 1; ti >= 0; ti--) {
        let mt = magoMiniTornados[ti];
        mt.duracao--;
        if (mt.duracao <= 0 || Date.now() >= mt.expiresAt) {
            magoMiniTornados.splice(ti, 1);
            continue;
        }
        let alvoT = slimes.find(s => s.hp > 0 && Math.hypot(s.x - mt.x, s.y - mt.y) < 300);
        if (!alvoT) alvoT = bosses.find(b => b.hp > 0 && Math.hypot(b.x - mt.x, b.y - mt.y) < 300);
        if (alvoT) {
            let ang = Math.atan2(alvoT.y - mt.y, alvoT.x - mt.x);
            mt.x += Math.cos(ang) * 3.8;
            mt.y += Math.sin(ang) * 3.8;
        }
        if (mt.duracao % 10 === 0) {
            slimes.forEach(s => {
                if (s.hp > 0 && Math.hypot(s.x - mt.x, s.y - mt.y) < 35) {
                    registrarDanoMonstro(s, mt.ownerId, mt.dano);
                    efeitos.aplicarEfeito(s, 'queimadura', 40, 3);
                }
            });
            danoEmBosses(mt.x, mt.y, 40, mt.ownerId, mt.dano, 'skill');
        }
    }

    // 3. Metamorfose Ígnea do Mago (Meteoro B4 - dano por segundo por atropelamento)
    for (let pid in players) {
        let pMago = players[pid];
        if (pMago && pMago.classe === 'mago' && pMago.formaIgneaAte && pMago.formaIgneaAte > Date.now()) {
            if (pMago.hp > 0 && agora % 250 < 50) {
                let danoAtropelo = dmgSkill(pMago, 'meteoro', 15);
                slimes.forEach(s => {
                    if (s.hp > 0 && Math.hypot(s.x - pMago.x, s.y - pMago.y) < 55) {
                        registrarDanoMonstro(s, pid, danoAtropelo, 'player');
                        s.slowTimer = 15;
                        efeitos.aplicarEfeito(s, 'queimadura', 60, 5);
                    }
                });
                danoEmBosses(pMago.x, pMago.y, 60, pid, danoAtropelo, 'skill', 'player');
            }
        }
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
        if (mapaVerde && p.x < LARGURA_VERDE && mapaVerde.colideProjetilVerde(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaDeserto && xNoDeserto(p.x) && mapaDeserto.colideProjetilDeserto(p.x, p.y)) {
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
        if (!projectileRemoved && mapaCidade && p.x >= LARGURA_CIDADE && p.x < FIM_CIDADE && mapaCidade.colideProjetilCidade(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaTesteVisual && p.x >= LARGURA_TESTE_VISUAL && p.x < FIM_TESTE_VISUAL && mapaTesteVisual.colideProjetil(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaZonaZero && p.x >= LARGURA_ZONA_ZERO && p.x < FIM_ZONA_ZERO && mapaZonaZero.colideProjetilZonaZero(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaFloresta && p.x >= LARGURA_FLORESTA && p.x < FIM_FLORESTA && mapaFloresta.colideProjetilFloresta(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaNebulos && p.x >= LARGURA_NEBOLOS && p.x < FIM_NEBOLOS && mapaNebulos.colideProjetilNebulos(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaAbissal && p.x >= LARGURA_ABISSAL && p.x < FIM_ABISSAL && mapaAbissal.colideProjetilAbissal(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaPantanoSombrio && p.x >= LARGURA_PANTANO_SOMBRIO && p.x < FIM_PANTANO_SOMBRIO && mapaPantanoSombrio.colideProjetilPantanoSombrio(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && mapaTileTeste && p.x >= LARGURA_TILETESTE && p.x < FIM_TILETESTE && mapaTileTeste.colideProjetilTileTeste(p.x, p.y)) {
            projeteis.splice(i, 1);
            projectileRemoved = true;
        }
        if (!projectileRemoved && p.petOwnerId) {
            const sourcePet = petRuntimeDoId(p.petInstanceId);
            const target = obterAlvoAtaqueServidor(p.petTargetType, p.petTargetId);
            if (!sourcePet || sourcePet.owner_id !== p.petOwnerId || !target ||
                (p.petTargetType === 'player' && !pvpPodeAtacar(p.petOwnerId, p.petTargetId)) ||
                (p.petTargetType === 'pet' && (!pvpPodeAtacar(p.petOwnerId, target.owner_id) ||
                    !validarOwnerPet(target.owner_id, target)))) {
                projeteis.splice(i, 1);
                projectileRemoved = true;
            } else {
                const targetX = p.petTargetType === 'player' ? target.x + PLAYER_OFFSET_X : target.x;
                const targetY = p.petTargetType === 'player' ? target.y + PLAYER_OFFSET_Y : target.y;
                const hitRadius = (p.raio || 5) + (p.petTargetType === 'pet' ? PET_COLLISION_RADIUS : 15);
                if ((!p.mapa || p.mapa === mapaPorCoordenada(targetX)) &&
                    Math.hypot(targetX - p.x, targetY - p.y) < hitRadius) {
                    const landed = aplicarDanoAtaquePet(
                        p.petOwnerId, p.petTargetType, p.petTargetId, p.dano || 10, 'skill'
                    );
                    if (landed) aplicarEfeitoProjetilPet(p, target, p.petTargetType, p.petTargetId);
                    projeteis.splice(i, 1);
                    projectileRemoved = true;
                }
            }
        }
        if (!projectileRemoved && p.petAlvo && petRuntimeDoId(p.petAlvo)) {
            const capturedPetTarget = petRuntimeDoId(p.petAlvo);
            const radiusCapturedPet = (p.raio || 5) + PET_COLLISION_RADIUS;
            if (capturedPetTarget.hp > 0 &&
                (!p.mapa || p.mapa === mapaPorCoordenada(capturedPetTarget.x)) &&
                Math.hypot(capturedPetTarget.x - p.x, capturedPetTarget.y - p.y) < radiusCapturedPet) {
                applyDamageToCapturedPet(capturedPetTarget, p.dano || 10, p.ownerMonstro || 'monster');
                projeteis.splice(i, 1);
                projectileRemoved = true;
            }
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
                if (p.tipo === 'cogumelo_veneno' && efeitos) {
                    efeitos.aplicarEfeito(player, 'veneno', 100, 1);
                    efeitos.aplicarEfeito(player, 'confusao', 100, 1);
                }
                if (p.tipo === 'louva_folha' && efeitos) {
                    efeitos.aplicarEfeito(player, 'selva_ataque_lento', 100, 0.4);
                    const manaRoubada = Math.min(Math.max(0, Number(player.mana) || 0), Math.max(1, Math.round((Number(player.maxMp) || 100) * 0.08)));
                    player.mana = Math.max(0, (Number(player.mana) || 0) - manaRoubada);
                    if (manaRoubada > 0) {
                        const socketMana = playerSockets[pid];
                        if (socketMana && socketMana.readyState === WebSocket.OPEN) {
                            socketMana.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(player.mana), maxMp: player.maxMp }));
                        }
                    }
                }
                // EDITOR "EDIT MOOB": projétil de monstro aplica debuffs configurados no alvo
                if (p.ownerMonstro) {
                    for (let ss of slimes) { if (ss.id === p.ownerMonstro) { aplicarContatoMonstro(ss, player); break; } }
                }
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
        if (mapaVerde && pp.x < LARGURA_VERDE && mapaVerde.colideProjetilVerde(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaDeserto && xNoDeserto(pp.x) && mapaDeserto.colideProjetilDeserto(pp.x, pp.y)) {
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
        if (!removido && mapaCidade && pp.x >= LARGURA_CIDADE && pp.x < FIM_CIDADE && mapaCidade.colideProjetilCidade(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaTesteVisual && pp.x >= LARGURA_TESTE_VISUAL && pp.x < FIM_TESTE_VISUAL && mapaTesteVisual.colideProjetil(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaFloresta && pp.x >= LARGURA_FLORESTA && pp.x < FIM_FLORESTA && mapaFloresta.colideProjetilFloresta(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaNebulos && pp.x >= LARGURA_NEBOLOS && pp.x < FIM_NEBOLOS && mapaNebulos.colideProjetilNebulos(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaAbissal && pp.x >= LARGURA_ABISSAL && pp.x < FIM_ABISSAL && mapaAbissal.colideProjetilAbissal(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaPantanoSombrio && pp.x >= LARGURA_PANTANO_SOMBRIO && pp.x < FIM_PANTANO_SOMBRIO && mapaPantanoSombrio.colideProjetilPantanoSombrio(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaTileTeste && pp.x >= LARGURA_TILETESTE && pp.x < FIM_TILETESTE && mapaTileTeste.colideProjetilTileTeste(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido && mapaZonaZero && pp.x >= LARGURA_ZONA_ZERO && pp.x < FIM_ZONA_ZERO && mapaZonaZero.colideProjetilZonaZero(pp.x, pp.y)) {
            playerProjeteis.splice(i, 1);
            removido = true;
        }
        if (!removido) for (let s of slimes) {
            if (pp.origemBasica && pp.alvoId && (pp.alvoTipo !== 'slime' || String(s.id) !== String(pp.alvoId))) continue;
            if (s.hp > 0 && Math.hypot(s.x - pp.x, s.y - pp.y) < 30) {
                registrarDanoMonstro(s, pp.ownerId, pp.dano);
                if (pp.tipo === 'magia_gelo') {
                    s.hitsGeloBasico = (s.hitsGeloBasico || 0) + 1;
                    if (s.hitsGeloBasico >= 3) {
                        s.stunTimer = Math.max(s.stunTimer || 0, 20);
                        efeitos.aplicarEfeito(s, 'congelado', 20, 1);
                        s.hitsGeloBasico = 0;
                        wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'reacao_congelante', x: s.x, y: s.y })); });
                    }
                }
                if (!pp.perfurante) {
                    playerProjeteis.splice(i, 1);
                    removido = true;
                    break;
                }
            }
        }
        if (!removido) {
            for (let bb of bosses) {
                if (pp.origemBasica && pp.alvoId && (pp.alvoTipo !== 'boss' || String(bb.id) !== String(pp.alvoId))) continue;
                if (bb.hp > 0 && Math.hypot(bb.x - pp.x, bb.y - pp.y) < 82) {
                    registrarDanoBoss(bb, pp.ownerId, pp.dano, pp.origemBasica ? 'basico' : 'skill');
                    if (pp.tipo === 'magia_gelo') {
                        bb.hitsGeloBasico = (bb.hitsGeloBasico || 0) + 1;
                        if (bb.hitsGeloBasico >= 3) {
                            bb.stunTimer = Math.max(bb.stunTimer || 0, 20);
                            efeitos.aplicarEfeito(bb, 'congelado', 20, 1);
                            bb.hitsGeloBasico = 0;
                            wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'reacao_congelante', x: bb.x, y: bb.y })); });
                        }
                    }
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
                    if (pp.origemBasica && pp.alvoId && (pp.alvoTipo !== 'player' || String(pd) !== String(pp.alvoId))) continue;
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
        if (!removido) {
            const p1 = players[pp.ownerId];
            const targetedPet = pp.origemBasica && pp.alvoTipo === 'pet'
                ? petRuntimeDoId(pp.alvoId)
                : null;
            const petTargets = targetedPet ? [targetedPet] : Object.values(petsAtivos);
            for (const pet of petTargets) {
                const owner = pet && players[pet.owner_id];
                if (!p1 || !p1.pvpAtivo || !owner || pet.hp <= 0 ||
                    !pvpPodeAtacar(pp.ownerId, pet.owner_id) ||
                    !validarOwnerPet(pet.owner_id, pet) ||
                    (pp.origemBasica && pp.alvoId && pet.pet_instance_id !== pp.alvoId) ||
                    (pp.mapa && pp.mapa !== mapaPorCoordenada(pet.x)) ||
                    Math.hypot(pet.x - pp.x, pet.y - pp.y) >= (pp.raio || 5) + PET_COLLISION_RADIUS) continue;
                aplicarDanoAtaquePet(pp.ownerId, 'pet', pet.pet_instance_id, pp.dano, 'skill');
                if (!pp.perfurante) {
                    playerProjeteis.splice(i, 1);
                    removido = true;
                    break;
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
        if (slime.hp <= 0) slime.ataqueTelegraph = null;
        if (slime.aiManaged) {
            if (slime.flagId && slime.hp <= 0) slime.respawnTimer = 0;
            return;
        }
        if (slime.hp <= 0) {
            // Demônio do tutorial: morte encerra o tutorial, sem respawn.
            if (slime.tipo === 'tutorial_demonio' && slime.tutorialOwnerId) {
                const donoId = slime.tutorialOwnerId;
                const dono = players[donoId];
                if (dono && dono.tutorialEtapa < 4) {
                    dono.tutorialEtapa = 4;
                    tutorialSalvar(dono);
                    const wsDono = playerSockets[donoId];
                    if (wsDono && wsDono.readyState === WebSocket.OPEN) {
                        wsDono.send(JSON.stringify({ type: 'tutorial_estado', tutorial: tutorialEstadoParaPlayer(dono), eventoTutorial: 'tutorial_concluido', mensagem: 'PARABÉNS! Tutorial concluído. Aproveite o vasto mundo de MMORP-Tall.' }));
                    }
                }
                if (tutorialDemonioPorPlayer[dono && dono.nome]) delete tutorialDemonioPorPlayer[dono.nome];
                const idxTutorial = slimes.indexOf(slime);
                if (idxTutorial !== -1) slimes.splice(idxTutorial, 1);
                return;
            }
            // Se for monstro de horda aleatória ou da Arena de Solari, não respawna (remove após a morte)
            if (slime.isHorda || slime.solari) {
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
                slime.captureConsumed = false;
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
                slime.lentidaoTimer = 0;
                slime.lentidao = 1.0;
                slime.presoTimer = 0;
                slime.isPreso = 0;
                slime.reducaoDefTimer = 0;
                slime.reducaoAtkTimer = 0;
                slime.fraturaExpostaExpires = 0;
                slime.fraturaDefensivaExpires = 0;
                slime.marcaPresaExpires = 0;
                slime.queimaduraExpires = 0;
                slime.respawnTimer = 0;
                slime.tabelaDano = {};
                slime.skillCharging = false;
                slime.skillChargeTimer = 0;
                slime.skillCooldown = (slime.tipo === "besouro_negro") ? Math.floor(180 + Math.random() * 120) : Math.floor(40 + Math.random() * 90);
                slime.skillAim = null;
                slime.tauntTimer = 0;
                slime.tauntId = null;
                slime.ataqueTelegraph = null;
                if (slime.tipo === "besouro_negro") {
                    slime.dashing = false;
                    slime.dashVx = 0;
                    slime.dashVy = 0;
                    slime.dashFrames = 0;
                }
            }
            return;
        }

        // Atualização e expiração de todos os debuffs do monstro (Stun, Slow, Preso, Fratura, etc.)
        atualizarDebuffsEntidade(slime, Date.now());

        // PUXÃO DE HABILIDADE (ex: Lançamento de Escudo do Guerreiro)
        if (slime.pull) {
            let pDx = slime.pull.x - slime.x;
            let pDy = slime.pull.y - slime.y;
            let pDist = Math.hypot(pDx, pDy);
            let pSpeed = slime.pull.speed || 14;
            moverMonstroDirecionalComDesvio(slime, pDx, pDy, pSpeed, { limitarDistancia: true });
            if (Math.hypot(slime.pull.x - slime.x, slime.pull.y - slime.y) < 10) delete slime.pull;
        }

        if (slime.stunTimer > 0 && !slime.imuneControle) {
            slime.stunTimer--;
            return;
        }
        // Soldado Lanceiro: estados de investida/bloqueio continuam mesmo se o alvo sair do agro.
        // Isso evita congelar a investida no instante em que o jogador muda de posição.
        if (slime.arquetipo === 'lanceiro' && (slime.lanceiroDashing || slime.lanceiroBloqueando)) {
            const alvoLanceiro = players[slime.targetId] || lacaios[slime.targetId] ||
                petRuntimeDoId(slime.targetId) || null;
            const dxL = alvoLanceiro ? (alvoLanceiro.x - slime.x) : 0;
            const dyL = alvoLanceiro ? (alvoLanceiro.y - slime.y) : 0;
            const distL = alvoLanceiro ? Math.hypot(dxL, dyL) : 0;
            atualizarMonstroEspecial(slime, alvoLanceiro, dxL, dyL, distL, fatorLentidao);
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
        if (slime.slowTimer > 0 && !slime.imuneControle) {
            fatorLentidao = Math.min(fatorLentidao, 0.5);
        }
        if (typeof slime.lentidao === 'number' && slime.lentidao < 1.0) {
            fatorLentidao = Math.min(fatorLentidao, slime.lentidao);
        }

        // ===== DEMÔNIO DO TUTORIAL =====
        // Instância privada do personagem novo. Persegue o dono e usa uma skill
        // telegráfica: escolhe a área, mantém o alerta por exatamente 1 segundo
        // (20 ticks) e então causa 1 de dano.
        if (slime.tipo === 'tutorial_demonio') {
            const dono = players[slime.tutorialOwnerId];
            if (!dono || dono.hp <= 0 || dono.tutorialEtapa < 3) return;
            const dxT = (dono.x + 12) - slime.x;
            const dyT = (dono.y + 16) - slime.y;
            const distT = Math.hypot(dxT, dyT);
            if (slime.tutorialSkillCharging) {
                slime.tutorialSkillTimer--;
                if (slime.tutorialSkillTimer <= 0) {
                    const ax = slime.tutorialSkillAim ? slime.tutorialSkillAim.x : dono.x + 12;
                    const ay = slime.tutorialSkillAim ? slime.tutorialSkillAim.y : dono.y + 16;
                    slime.tutorialSkillCharging = false;
                    slime.tutorialSkillAim = null;
                    slime.tutorialSkillCooldown = 80;
                    wss.clients.forEach(c => {
                        if (c.readyState === WebSocket.OPEN && c.playerId === slime.tutorialOwnerId) {
                            c.send(JSON.stringify({ type: 'tutorial_demon_skill_impact', id: slime.id, x: ax, y: ay, raio: 58, dano: 1 }));
                        }
                    });
                    if (Math.hypot((dono.x + 12) - ax, (dono.y + 16) - ay) <= 58) {
                        aplicarDanoJogador(slime.tutorialOwnerId, ax, ay, 1);
                    }
                }
                return;
            }
            if (slime.tutorialSkillCooldown > 0) slime.tutorialSkillCooldown--;
            if (slime.tutorialSkillCooldown <= 0 && distT > 90 && distT < 650) {
                slime.tutorialSkillCharging = true;
                slime.tutorialSkillTimer = 20;
                slime.tutorialSkillMax = 20;
                slime.tutorialSkillAim = { x: dono.x + 12, y: dono.y + 16 };
                wss.clients.forEach(c => {
                    if (c.readyState === WebSocket.OPEN && c.playerId === slime.tutorialOwnerId) {
                        c.send(JSON.stringify({ type: 'tutorial_demon_skill_charge', id: slime.id, x: slime.tutorialSkillAim.x, y: slime.tutorialSkillAim.y, duracao: 1000, raio: 58 }));
                    }
                });
                return;
            }
            if (distT > (slime.attackRange || 48) && !slime.ataqueTelegraph) {
                const passoT = velocidadeMovimentoMonstro(Math.min(slime.velocidade || 1.8, Math.max(0, distT - 42)));
                moverMonstroDirecionalComDesvio(slime, dxT, dyT, passoT, { limitarDistancia: true });
            } else {
                slime.attackCooldown++;
                if (slime.attackCooldown > (slime.cadenciaAtk || 60) || slime.ataqueTelegraph) {
                    const aviso = prepararAtaqueMonstroComAviso(slime, dono, slime.attackRange || 48, 'melee');
                    if (aviso.status === 'ready') {
                        slime.attackCooldown = 0;
                        aplicarDanoJogador(slime.tutorialOwnerId, slime.x, slime.y, TUTORIAL_BEMVINDO_MONSTRO_ATK);
                    } else if (aviso.status === 'missed') slime.attackCooldown = 0;
                }
            }
            return;
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
                // Monstros Solari só podem adquirir jogadores da própria sessão.
                if (slime.solari && !solariEmSessao(pid)) continue;
                if (!slime.solari && solariEmSessao(pid)) continue;
                // LADINO invisível / SNIPER camuflado: não são vistos pelo agro de proximidade
                if (efeitos && (efeitos.temEfeito(p, 'invisivel') || efeitos.temEfeito(p, 'camuflagem'))) {
                    if (p.classe === 'sniper' && (p.snCamuflado || p.snRoupaCamo)) {
                        if (!p.moving) continue;
                    } else {
                        continue;
                    }
                }
                if (!alvoDentroDaVisao(slime, p)) continue;
                let d2 = distanciaEntidadesQuadrada(p, slime);
                if (d2 < menorDist * menorDist) { menorDist = Math.sqrt(d2); alvoProximo = pid; }
            }
            for (const pet of Object.values(petsAtivos)) {
                const owner = pet && players[pet.owner_id];
                if (!owner || owner.hp <= 0 || pet.hp <= 0 || pet.mode === 'PARADO' ||
                    !alvoDentroDaVisao(slime, pet)) continue;
                const distancia = Math.sqrt(distanciaEntidadesQuadrada(pet, slime));
                if (distancia < menorDist) {
                    menorDist = distancia;
                    alvoProximo = pet.pet_instance_id;
                }
            }
            if (alvoProximo) slime.targetId = alvoProximo;
        }

        if (slime.targetId && petRuntimeDoId(slime.targetId) &&
            (!players[petRuntimeDoId(slime.targetId).owner_id] ||
                players[petRuntimeDoId(slime.targetId).owner_id].hp <= 0)) {
            slime.targetId = null;
            slime.ataqueTelegraph = null;
        }
        if (slime.targetId && (players[slime.targetId] || lacaios[slime.targetId] || petRuntimeDoId(slime.targetId))) {
            let alvo = players[slime.targetId] || lacaios[slime.targetId] || petRuntimeDoId(slime.targetId);
            // TAUNT do Golem (v1.30.3): o Golem vive em `lacaios[pid]` com a MESMA chave do
            // jogador, então durante o rugido o LACAIO deve vencer o `players` na resolução.
            if (slime.tauntTimer > 0 && slime.tauntId) {
                if (lacaios[slime.tauntId]) alvo = lacaios[slime.tauntId];
                else if (players[slime.tauntId]) alvo = players[slime.tauntId];
            }
            // LADINO invisível / SNIPER camuflado: o alvo some da visão — solta o agro
            const sniperParado = (alvo.classe === 'sniper' && (alvo.snCamuflado || alvo.snRoupaCamo) && !alvo.moving);
            if (efeitos && (efeitos.temEfeito(alvo, 'invisivel') || sniperParado || (alvo.classe === 'sniper' && efeitos.temEfeito(alvo, 'camuflagem') && !alvo.moving))) {
                slime.targetId = null;
                return;
            }
            let dx = alvo.x - slime.x;
            let dy = alvo.y - slime.y;
            let dist = Math.hypot(dx, dy);
            let distanciaDesiste = Math.max(slime.aggroRange || 320, DISTANCIA_RETORNO_INIMIGO);

            if (mapaPorCoordenada(slime.x) !== mapaPorCoordenada(alvo.x) || dist > distanciaDesiste) {
                slime.targetId = null;
                slime.ataqueTelegraph = null;
                slime.retornandoAoLar = true;
                slime.skillCharging = false;
                slime.skillChargeTimer = 0;
                slime.skillAim = null;
                slime.attackCooldown = 0;
                return;
            }

            if (slime.arquetipo && atualizarMonstroEspecial(slime, alvo, dx, dy, dist, fatorLentidao)) {
                return;
            } else if (slime.tipo === "melee" || slime.tipo === "globin" || (slime.tipo === "ranged" && slime.ehMelee)) {
                const alcanceMelee = slime.attackRange || 55;
                if (dist > alcanceMelee && !slime.ataqueTelegraph) {
                    let velSlime = velocidadeMovimentoMonstro((slime.velocidade || 3.2) * fatorLentidao);
                    moverMonstroDirecionalComDesvio(slime, dx, dy, velSlime, { limitarDistancia: true });
                } else {
                    slime.attackCooldown++;
                    if (slime.attackCooldown > (slime.cadenciaAtk || 45) || slime.ataqueTelegraph) {
                        // CEGUEIRA: melee cego erra a mordida/corte normal
                        if (monstroPodeAtacar(slime)) {
                            const aviso = prepararAtaqueMonstroComAviso(slime, alvo, alcanceMelee, 'melee');
                            if (aviso.status === 'pending') return;
                            if (aviso.status === 'missed') {
                                slime.attackCooldown = 0;
                                return;
                            }
                            if (aviso.status !== 'ready') return;
                            if (alvo === players[slime.targetId]) {
                                // melee padrão usa o dano escalável (Arena de Solari usa isso)
                                aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 12);
                                aplicarContatoMonstro(slime, alvo);
                            } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                                danoCausadoAoOgro(slime.tauntId, slime.dano || 12, alvo.x, alvo.y);
                            } else if (alvo && alvo.pet_instance_id) {
                                applyDamageToCapturedPet(alvo, slime.dano || 12, slime.id);
                            } else if (alvo) {
                                alvo.hp -= slime.dano || 12;
                                if (alvo.hp < 0) alvo.hp = 0;
                            }
                        }
                        slime.attackCooldown = 0;
                    }
                }
            } else if (slime.tipo === "ranged") {
                const alcanceAtaqueRanged = slime.attackRange > 1000 ? (slime.attackRange || 220) : (slime.attackRange <= 0 ? 220 : slime.attackRange || 220);
                const distanciaEngajamento = Math.min(alcanceAtaqueRanged, 420);
                if (dist > distanciaEngajamento) {
                    let velArqueiro = velocidadeMovimentoMonstro((slime.velocidade || 1.04) * fatorLentidao);
                    moverMonstroDirecionalComDesvio(slime, dx, dy, velArqueiro, { limitarDistancia: true });
                } else if (dist < (slime.distanciaPreferida || 150)) {
                    moverMonstroDirecionalComDesvio(slime, -dx, -dy, velocidadeMovimentoMonstro(0.65 * fatorLentidao), { limitarDistancia: true });
                }

                slime.attackCooldown++;
                if ((slime.attackCooldown > (slime.cadenciaAtk || 60) || slime.ataqueTelegraph) &&
                    (podeEntidadeAtacarAlvo(slime, alvo, alcanceAtaqueRanged) || slime.ataqueTelegraph)) {
                    if (monstroPodeAtacar(slime)) {
                        const aviso = prepararAtaqueMonstroComAviso(slime, alvo, alcanceAtaqueRanged, 'ranged');
                        if (aviso.status === 'ready') {
                            const velProj = slime.velProjetil || 10.125;
                            projeteis.push({
                                x: slime.x,
                                y: slime.y,
                                vx: Math.cos(aviso.angle) * velProj,
                                vy: Math.sin(aviso.angle) * velProj,
                                vida: 70,
                                mapa: mapaPorCoordenada(slime.x),
                                solari: !!slime.solari,
                                dano: slime.dano || 10,
                                ownerMonstro: slime.id,
                                petAlvo: alvo && alvo.pet_instance_id ? alvo.pet_instance_id :
                                    ((slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) ? slime.tauntId : null)
                            });
                            slime.attackCooldown = 0;
                        } else if (aviso.status === 'missed') slime.attackCooldown = 0;
                    }
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
                    if (dist > alcanceAtaque && !slime.ataqueTelegraph) {
                        let velZumbi = velocidadeMovimentoMonstro((slime.velocidade || 2.04) * fatorLentidao);
                        moverMonstroDirecionalComDesvio(slime, dx, dy, velZumbi, { limitarDistancia: true });
                    } else {
                        slime.attackCooldown++;
                        if (slime.attackCooldown > (slime.cadenciaAtk || 50) || slime.ataqueTelegraph) {
                            // CEGUEIRA: zumbi cego erra a mordida normal (cuspida tóxica é skill e continua)
                            if (monstroPodeAtacar(slime)) {
                                const aviso = prepararAtaqueMonstroComAviso(slime, alvo, alcanceAtaque, 'melee');
                                if (aviso.status === 'pending') return;
                                if (aviso.status === 'missed') {
                                    slime.attackCooldown = 0;
                                    return;
                                }
                                if (aviso.status !== 'ready') return;
                                if (players[slime.targetId] && alvo === players[slime.targetId]) {
                                    aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 18);
                                    aplicarContatoMonstro(slime, alvo);
                                } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                                    danoCausadoAoOgro(slime.tauntId, slime.dano || 18, alvo.x, alvo.y);
                                } else if (alvo && alvo.pet_instance_id) {
                                    applyDamageToCapturedPet(alvo, slime.dano || 18, slime.id);
                                    aplicarContatoMonstro(slime, alvo);
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
                            slime.dashFrames--;
                            const dashMoveu = moverMonstroDirecionalComDesvio(slime, slime.dashVx, slime.dashVy, 18);
                            if (!dashMoveu) {
                                slime.dashing = false;
                                slime.dashVx = 0;
                                slime.dashVy = 0;
                                slime.skillCooldown = 220;
                            }
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
                    if (!atingiu) {
                        for (const pet of Object.values(petsAtivos)) {
                            const owner = pet && players[pet.owner_id];
                            if (!owner || owner.hp <= 0 || pet.hp <= 0 ||
                                entidadeEhSolari(slime) !== entidadeEhSolari(pet) ||
                                !instanciaCompativel(slime, pet) ||
                                Math.hypot(pet.x - slime.x, pet.y - slime.y) >= 40) continue;
                            if (pet.stunTimer <= 0) {
                                pet.stunTimer = slime.stunOnHit || 100;
                                if (efeitos) efeitos.aplicarEfeito(pet, 'stun', pet.stunTimer, 1);
                            } else {
                                applyDamageToCapturedPet(pet, 18, slime.id);
                            }
                            atingiu = true;
                            break;
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
                        let alvoDash = players[slime.targetId] || petRuntimeDoId(slime.targetId);
                        if (!alvoDash && slime.tauntTimer > 0 && lacaios[slime.tauntId]) alvoDash = lacaios[slime.tauntId];
                        if (alvoDash && alvoDash.hp > 0) {
                            let ang = Math.atan2(alvoDash.y - slime.y, alvoDash.x - slime.x);
                            const velVoo = velocidadeMovimentoMonstro(18); // 'extremamente rápido' (360px/s)
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
                        let velBesouro = velocidadeMovimentoMonstro((slime.velocidade || 1.7) * fatorLentidao);
                        moverMonstroDirecionalComDesvio(slime, dx, dy, velBesouro, { limitarDistancia: true });
                    } else if (dist < 150) {
                        moverMonstroDirecionalComDesvio(slime, -dx, -dy, velocidadeMovimentoMonstro(0.6 * fatorLentidao), { limitarDistancia: true });
                    }

                    slime.attackCooldown++;
                    const alcanceAtaqueBesouro = slime.attackRange || 320;
                    if ((slime.attackCooldown > 20 || slime.ataqueTelegraph) &&
                        (podeEntidadeAtacarAlvo(slime, alvo, alcanceAtaqueBesouro) || slime.ataqueTelegraph)) {
                        if (monstroPodeAtacar(slime)) {
                            const aviso = prepararAtaqueMonstroComAviso(slime, alvo, alcanceAtaqueBesouro, 'ranged');
                            if (aviso.status === 'ready') {
                                projeteis.push({
                                    x: slime.x,
                                    y: slime.y,
                                    vx: Math.cos(aviso.angle) * 40.5, // 4x a velocidade padrão (10.125)
                                    vy: Math.sin(aviso.angle) * 40.5,
                                    vida: 90,
                                    mapa: mapaPorCoordenada(slime.x),
                                    solari: !!slime.solari,
                                    dano: slime.dano || 14,
                                    tipo: 'besouro',
                                    raio: 7,
                                    petAlvo: (slime.tauntTimer > 0 && slime.tauntId && lacaios[slime.tauntId]) ? slime.tauntId : null
                                });
                                slime.attackCooldown = 0;
                            } else if (aviso.status === 'missed') slime.attackCooldown = 0;
                        }
                    }

                    // Inicia a skill: trava no chão por 1.2s carregando e depois voa
                    if (slime.skillCooldown <= 0 && dist < 620 && dist > 100) {
                        slime.skillCharging = true;
                        slime.skillChargeTimer = slime.skillChargeMax || 24;
                        slime.skillAim = { x: alvo.x, y: alvo.y };
                    }
                }
            } else if (slime.tipo === "morcego" || slime.tipo === "morcegote") {
                // ============ MORCEGO (voador da caverna) ============
                if (slime.tipo === "morcego") {
                    slime.x = Math.max(LARGURA_CAVERNA, Math.min(FIM_CAVERNA - 10, slime.x));
                    slime.y = Math.max(0, Math.min(ALTO_CAVERNA - 10, slime.y));
                }

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

                if (dist > (slime.attackRange || 45) && !slime.ataqueTelegraph) {
                    // Persegue com ziguezague (movimento sinuoso de voador)
                    let velBat = velocidadeMovimentoMonstro((slime.velocidade || 2.3) * fatorLentidao);
                    let ang = Math.atan2(dy, dx);
                    slime.ziguezague++;
                    let desvio = Math.sin(slime.ziguezague * 0.45) * 0.9;
                    moverMonstroDirecionalComDesvio(slime, Math.cos(ang + desvio * 0.4), Math.sin(ang + desvio * 0.4), velBat);
                } else {
                    // Ataque corpo-a-corpo (mordida)
                    slime.attackCooldown++;
                    if (slime.attackCooldown > 35 || slime.ataqueTelegraph) {
                        // CEGUEIRA: morcego cego erra a mordida normal
                        if (monstroPodeAtacar(slime)) {
                            const aviso = prepararAtaqueMonstroComAviso(slime, alvo, slime.attackRange || 45, 'melee');
                            if (aviso.status === 'pending') return;
                            if (aviso.status === 'missed') {
                                slime.attackCooldown = 0;
                                return;
                            }
                            if (aviso.status !== 'ready') return;
                            if (players[slime.targetId] && alvo === players[slime.targetId]) {
                                aplicarDanoJogador(slime.targetId, slime.x, slime.y, slime.dano || 16);
                            } else if (alvo && slime.tauntTimer > 0 && slime.tauntId && alvo === lacaios[slime.tauntId]) {
                                danoCausadoAoOgro(slime.tauntId, slime.dano || 16, alvo.x, alvo.y);
                            } else if (alvo && alvo.pet_instance_id) {
                                applyDamageToCapturedPet(alvo, slime.dano || 16, slime.id);
                            } else if (alvo) {
                                alvo.hp -= (slime.dano || 16);
                                if (alvo.hp < 0) alvo.hp = 0;
                            }
                            slime.attackCooldown = 0;
                        }
                    }
                }
            }

            if (alvo.hp <= 0) {
                slime.targetId = null;
                slime.tauntTimer = 0;
                slime.tauntId = null;
                slime.ataqueTelegraph = null;
            } else if (dist > distanciaDesiste && slime.tauntTimer <= 0) {
                slime.targetId = null;
                slime.retornandoAoLar = true;
                slime.attackCooldown = 0;
            }
        } else {
            slime.ataqueTelegraph = null;
            const distanciaOrigem = Math.hypot(slime.x - slime.origemX, slime.y - slime.origemY);
            if (distanciaOrigem > DISTANCIA_RETORNO_INIMIGO) {
                slime.retornandoAoLar = true;
                moverInimigoParaOrigem(slime, fatorLentidao);
                return;
            }

            slime.patrolTimer++;
            if (slime.patrolTimer > 120) {
                let fatorVel = velocidadeMovimentoMonstro((slime.tipo === "melee" ? 0.84 : 0.65) * fatorLentidao);
                slime.patrulhaFase += (Math.random() - 0.5) * 0.7;
                slime.dx = Math.cos(slime.patrulhaFase) * fatorVel;
                slime.dy = Math.sin(slime.patrulhaFase) * fatorVel;
                slime.patrolTimer = 0;
            }

            const moveuPatrulha = moverMonstroDirecionalComDesvio(
                slime,
                slime.dx,
                slime.dy,
                Math.hypot(slime.dx, slime.dy) * fatorLentidao,
                { limitarDistancia: true }
            );
            if (!moveuPatrulha) {
                slime.dx *= -1;
                slime.dy *= -1;
            }

            if (slime.tipo === "besouro_negro") {
                slime.x = Math.max(LARGURA_VERDE, Math.min(LARGURA_DESERTO - 10, slime.x));
                slime.y = Math.max(0, Math.min(ALTO_DESERTO - 10, slime.y));
            }
        }
    });

    // ROQUEIRO: canal de bateria (infinito até mana < 10%; consumo progressivo; stun de 5s só no 1º hit)
    for (let pid in bateriaCanal) {
        let canal = bateriaCanal[pid];
        let player = players[pid];

        let cancelar = false;
        if (!player || player.hp <= 0) {
            cancelar = true;
        } else if (Math.abs(player.x - canal.startX) > 5 || Math.abs(player.y - canal.startY) > 5) {
            cancelar = true;
        } else if (player.maxMp > 0 && player.mana <= player.maxMp * 0.10) {
            cancelar = true;
            player.bateriaCooldown = Date.now() + 10000; // 10s CD quando acaba por mana
        }

        if (cancelar) {
            delete bateriaCanal[pid];
            let applyCd = (player.maxMp > 0 && player.mana <= player.maxMp * 0.10);
            enviarParaMapaDoJogador(pid, 'action_roqueiro_bateria_end', { id: pid, cooldown: applyCd });
            continue;
        }

        canal.tickAtivo++;
        canal.beat++;
        
        // Consumo progressivo de mana a cada segundo (20 ticks)
        if (canal.tickAtivo % 20 === 0) {
            let segundosAtivos = canal.tickAtivo / 20;
            // Reduzido drasticamente: começa com ~6 de mana por segundo e sobe gradativamente
            let custoMana = Math.floor(5 + (segundosAtivos * 1.5));
            if (player.mana >= custoMana) {
                player.mana -= custoMana;
            } else {
                player.mana = 0;
            }
            // Sincroniza mana pro client dono
            wss.clients.forEach(c => {
                if (c.playerId === pid && c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ type: 'mp_sync', mp: player.mana, maxMp: player.maxMp }));
                }
            });
        }

        if (canal.beat < 10) continue; // Batida visual e de dano a cada 500ms

        canal.beat = 0;
        let pX = player.x + 12;
        let pY = player.y + 16;

        enviarParaMapaDoJogador(pid, 'action_roqueiro_bateria', { id: pid, x: pX, y: pY, beat: true });

        slimes.forEach(slime => {
            if (slime.hp > 0 && Math.hypot(slime.x - pX, slime.y - pY) < 110) {
                registrarDanoMonstro(slime, pid, canal.danoBateria);
                if (!canal.stunsAplicados[slime.id]) {
                    canal.stunsAplicados[slime.id] = true;
                    slime.stunTimer = 100; // 5 segundos
                }
            }
        });
        danoEmBosses(pX, pY, 115, pid, canal.danoBateria, 'skill');
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
                // Notifica clientes: fase de disparo começou (som "soltar")
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'action_arqueiro_rajada_fire', id: pid, angulo: canal.angulo, x: player.x + 12, y: player.y + 16 }));
                    }
                });
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

    // ===== PIKEMAN: EXECUÇÃO DA MORTE (3s de carga; cancela se mover/demorir) =====
    for (let pid in pikemanCanais) {
        let canal = pikemanCanais[pid];
        let player = players[pid];

        if (!player || player.hp <= 0) {
            delete pikemanCanais[pid];
            if (player) { player.pikemanProgresso = 0; delete player.pikemanSkillAte; }
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_pikeman_execucao_cancel', id: pid }));
                }
            });
            continue;
        }

        let moveDist = Math.hypot(player.x - canal.startX, player.y - canal.startY);
        if (moveDist > 1.6) {
            // moveu durante o carregamento → cancela (igual Rajada)
            delete pikemanCanais[pid];
            player.pikemanProgresso = 0;
            delete player.pikemanSkillAte;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_pikeman_execucao_cancel', id: pid }));
                }
            });
            continue;
        }

        canal.timer--;
        player.pikemanProgresso = Math.max(0, Math.min(1, 1 - canal.timer / canal.total));
        if (canal.timer <= 0) {
            // carga completa → dispara os 3 golpes da execução
            delete pikemanCanais[pid];
            player.pikemanProgresso = 0;
            pikemanDispararExecucao(pid, canal.alvoTipo, canal.alvoId);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'action_pikeman_execucao_end', id: pid }));
                }
            });
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
        if (!g) continue;
        if (g.hp > 0) atualizarDebuffsEntidade(g, Date.now());

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
                    gerarDropNoChao(g.x, g.y, g.tabelaDano, g.maxHp || 0, true, g);
                    gerarDropsAuxiliares(g.x, g.y, g.maxHp || 0, true);
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

    // Expira drops antigos (tempo de vida no chão)
    if (equipamentos && dropsChao.length) {
        let vidaDrop = equipamentos.BALANCE.tempoVidaDropMs || 150000;
        let agoraDrop = Date.now();
        for (let i = dropsChao.length - 1; i >= 0; i--) {
            if (agoraDrop - dropsChao[i].criadoEm > vidaDrop) dropsChao.splice(i, 1);
        }
    }

    // ===== v1.34: COLETA AUTOMÁTICA — itens com autocoleta (ouro, poções,
    // pedras e lendários) são pegos ao passar por cima. Autoritativo no servidor. =====
    if (equipamentos && dropsChao.length) {
        let raioAuto = (equipamentos.BALANCE.raioToqueCliente || 48) + 12;
        for (let pid2 in players) {
            let pJ = players[pid2];
            if (!pJ || pJ.hp <= 0) continue;
            let wsJ = playerSockets[pid2];
            if (!wsJ || wsJ.readyState !== WebSocket.OPEN) continue;
            for (let i = dropsChao.length - 1; i >= 0; i--) {
                let dInfo = dropsChao[i];
                if (!dInfo || !dInfo.item || !dInfo.item.autocoleta) continue;
                // só coleta no mesmo mapa do jogador
                if (mapaPorCoordenada(dInfo.x) !== mapaPorCoordenada(pJ.x + PLAYER_OFFSET_X)) continue;
                let distAuto = Math.hypot((pJ.x + 12) - dInfo.x, (pJ.y + 16) - dInfo.y);
                if (distAuto <= raioAuto) {
                    // coleta e notifica o dono
                    let itemAuto = dInfo.item;
                    dropsChao.splice(i, 1);
                    if (itemAuto.tipo === 'ouro') {
                        let qtd = Math.max(1, Math.round(itemAuto.quantidade || 1));
                        pJ.ouro = Math.max(0, (pJ.ouro || 0) + qtd);
                        wsJ.send(JSON.stringify({ type: 'ouro_ganho', quantidade: qtd, ouro: pJ.ouro }));
                    } else {
                        if (!pJ.inventario) pJ.inventario = inventarioPadrao();
                        if (!pJ.inventario.mochila) pJ.inventario.mochila = [];
                        let chaveStack = null;
                        if (itemAuto.tipo === 'consumivel') chaveStack = 'pocao:' + (itemAuto.subtipo || itemAuto.tipo) + ':' + (itemAuto.nivel || 0);
                        else if (itemAuto.tipo === 'pedra') chaveStack = 'pedra:' + (itemAuto.raridade || 'comum');
                        if (chaveStack) {
                            let existente = pJ.inventario.mochila.find(mi => mi && (
                                (mi.tipo === 'consumivel' && chaveStack === 'pocao:' + (mi.subtipo || mi.tipo) + ':' + (mi.nivel || 0)) ||
                                (mi.tipo === 'pedra' && chaveStack === 'pedra:' + (mi.raridade || 'comum'))
                            ));
                            if (existente) { existente.quantidade = (existente.quantidade || 1) + 1; }
                            else { itemAuto.quantidade = itemAuto.quantidade || 1; pJ.inventario.mochila.push(itemAuto); }
                        } else {
                            pJ.inventario.mochila.push(itemAuto);
                        }
                        salvarProgresso(pJ.nome, { inventario: pJ.inventario, ouro: pJ.ouro || 0 });
                        wsJ.send(JSON.stringify({ type: 'item_coletado', item: itemAuto, equipadoMsg: null }));
                    }
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'item_removido_chao', dropId: dInfo.id }));
                        }
                    });
                }
            }
        }
    }

    // ===== ARENA DE SOLARI — lógica da partida (contagem, rounds, leilão) =====
    atualizarSolari();

    // Players visíveis: sem inventário privado (sincronizado só com o dono)
    // e com atributosTotais (base + bônus de equipamento) para o cliente exibir
    for (const pid of Object.keys(players)) sincronizarInstanciaMapaJogador(pid);
    let playersVisivel = {};
    for (let pid in players) {
        let p = players[pid];
        playersVisivel[pid] = Object.assign({}, p);
        delete playersVisivel[pid].inventario;
        // Expõe dados básicos da arma para visual (v1.39.6)
        let armaSlot = p.inventario && p.inventario.slots && p.inventario.slots.arma;
        playersVisivel[pid].armaVisual = armaSlot ? { nome: armaSlot.nome, raridade: armaSlot.raridade, customVisual: armaSlot.customVisual || null } : null;
        playersVisivel[pid].atributosTotais = atributosTotais(p);
        playersVisivel[pid].efeitos = (efeitos ? efeitos.exporEfeitos(p).filter((efeito) => efeito && efeito.id !== 'invisivel' && efeito.id !== 'camuflagem') : []);
        playersVisivel[pid].kaledronBradoAte = p.kaledronBradoAte || 0;
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
        // Roupa de camuflagem (dash do Sniper) — o cliente troca o visual inteiro
        playersVisivel[pid].snRoupaCamo = (p.classe === 'sniper') ? !!p.snRoupaCamo : false;
        playersVisivel[pid].snRoupaCamoAte = (p.classe === 'sniper') ? (p.snRoupaCamoAte || 0) : 0;
        // Escudo do Guerreiro: ângulo do arco de bloqueio (o cliente desenha o
        // escudo real na mão nessa direção e o brilho do arco protegido)
        playersVisivel[pid].escudoGuerreiroAtivo = !!p.escudoGuerreiro;
        playersVisivel[pid].escudoGuerreiroAng = p.escudoGuerreiro ? (p.escudoGuerreiro.ang || 0) : 0;
        playersVisivel[pid].guerreiroBuffAte = p.classe === 'guerreiro' ? (p.guerreiroBuffAte || 0) : 0;
        playersVisivel[pid].snAimAtivo = (p.classe === 'sniper') ? !!p.snAim : false;
        playersVisivel[pid].escudoAbsoluto = Math.round(p.escudoAbsoluto || 0);
        playersVisivel[pid].escudoAbsolutoMax = Math.round(p.escudoAbsolutoMax || 0);
        // PvP: o cliente só mira em quem está com PvP ligado, então o estado
        // precisa viajar na sincronia (antes o botão do próprio jogador era o
        // único lugar que recebia essa flag).
        playersVisivel[pid].pvpAtivo = !!p.pvpAtivo;
        playersVisivel[pid].instanciaId = p.instanciaId || null;
        playersVisivel[pid].instanciaTipo = p.instanciaTipo || null;
    }

    // Mantém a identidade de instância sincronizada mesmo quando o jogador
    // atravessa uma fronteira de mapa por movimento, dash ou teleporte.
    for (const pid of Object.keys(players)) sincronizarInstanciaMapaJogador(pid);
    sincronizarEntidadesInstanciadas();

    const tempoMundoAtual = sistemaDiaNoite ? sistemaDiaNoite.calcularTempoMundo() : null;

    wss.clients.forEach((client) => {
        if (client.readyState !== WebSocket.OPEN) return;
        const jogadorCliente = client._playerId ? players[client._playerId] : null;
        const sessaoClienteSolari = client._playerId ? solariSessaoDoJogador(client._playerId) : null;
        const clienteEmSolari = !!sessaoClienteSolari;
        const mapaCliente = clienteEmSolari ? 'solari' : (jogadorCliente ? mapaPorCoordenada(jogadorCliente.x + PLAYER_OFFSET_X) : null);
        const instanciaCliente = clienteEmSolari ? sessaoClienteSolari.instanciaId : (jogadorCliente && mapaEhInstanciado(mapaCliente) ? jogadorCliente.instanciaId : null);
        const instanciaTipoCliente = clienteEmSolari ? 'solari' : (mapaEhInstanciado(mapaCliente) ? mapaCliente : null);
        const jogadoresDoMapa = {};
        if (mapaCliente) {
            for (const pid in playersVisivel) {
                const jogadorAlvo = players[pid];
                const oculto = jogadorAlvo && efeitos && (efeitos.temEfeito(jogadorAlvo, 'invisivel') || efeitos.temEfeito(jogadorAlvo, 'camuflagem'));
                const detectadoPeloSniper = oculto && jogadorCliente && jogadorCliente.classe === 'sniper' && jogadorCliente.snPosicao &&
                    efeitos.temEfeito(jogadorAlvo, 'invisivel') && mapaPorCoordenada(jogadorAlvo.x) === mapaPorCoordenada(jogadorCliente.x) &&
                    Math.hypot(jogadorAlvo.x - (jogadorCliente.x + PLAYER_OFFSET_X), jogadorAlvo.y - (jogadorCliente.y + PLAYER_OFFSET_Y)) <= SNIPER_DETECTION_RADIUS;
                if (pid !== client._playerId && oculto && !detectadoPeloSniper) continue;
                if (clienteEmSolari) {
                    // Durante a Solari: só enxerga os colegas da partida
                    const sessaoAlvo = solariSessaoDoJogador(pid);
                    if (sessaoAlvo && sessaoAlvo.instanciaId === instanciaCliente) jogadoresDoMapa[pid] = playersVisivel[pid];
                } else {
                    if (solariEmSessao(pid)) continue;
                    if (entidadeNoMapa(playersVisivel[pid], mapaCliente, instanciaCliente)) jogadoresDoMapa[pid] = playersVisivel[pid];
                }
            }
        }
        const tempoMundoCliente = jogadorCliente && sistemaDiaNoite && typeof sistemaDiaNoite.aplicarEscuridaoPorClasse === 'function'
            ? sistemaDiaNoite.aplicarEscuridaoPorClasse(tempoMundoAtual, jogadorCliente.classe)
            : tempoMundoAtual;
        client.send(JSON.stringify({
            type: 'world_update',
            tempoMundo: tempoMundoCliente,
            instanciaId: instanciaCliente,
            instanciaTipo: instanciaTipoCliente,
            players: jogadoresDoMapa,
            slimes: filtrarPorMapa(slimes, mapaCliente, instanciaCliente).filter(function (s) {
                return s && (s.tipo !== 'tutorial_demonio' || s.tutorialOwnerId === client._playerId);
            }),
            tutorial: tutorialEstadoParaPlayer(jogadorCliente),
            npcs: npcsParaMapa(mapaCliente),
            projeteis: filtrarPorMapa(projeteis, mapaCliente, instanciaCliente),
            playerProjeteis: filtrarPorMapa(playerProjeteis, mapaCliente, instanciaCliente),
            lacaios: Object.fromEntries(Object.entries(lacaios).filter(function (entry) { return entidadeNoMapa(entry[1], mapaCliente, instanciaCliente); })), 
            pets: Object.fromEntries(Object.entries(petsAtivos).filter(function (entry) {
                return entidadeNoMapa(entry[1], mapaCliente, instanciaCliente);
            }).map(function (entry) {
                const pet = entry[1];
                return [entry[0], {
                    id: pet.pet_instance_id,
                    pet_instance_id: pet.pet_instance_id,
                    species_id: pet.species_id,
                    owner_id: pet.owner_id,
                    type: 'pet',
                    tipo: pet.tipo,
                    asset: pet.asset,
                    visual: pet.visual,
                    x: pet.x,
                    y: pet.y,
                    hp: pet.hp,
                    maxHp: pet.maxHp,
                    state: pet.state,
                    mode: pet.mode,
                    targetId: pet.targetId || null,
                    animationState: pet.animationState || 'IDLE',
                    animationStartedAt: pet.animationStartedAt || 0,
                    animationUntil: pet.animationUntil || 0,
                    aiAtacandoAte: pet.aiAtacandoAte || 0,
                    aiEstado: pet.aiEstado || 'idle',
                    moving: !!pet.moving,
                    angulo: Number.isFinite(pet.angulo) ? pet.angulo : 0,
                    level: pet.level,
                    rarity: pet.rarity,
                    escala: pet.escala,
                    instanciaId: pet.instanciaId || null
                }];
            })),
            bandas: Object.fromEntries(Object.entries(bandas).filter(function (entry) { return players[entry[0]] && (clienteEmSolari ? solariEmSessao(entry[0]) : (mapaPorCoordenada(players[entry[0]].x + PLAYER_OFFSET_X) === mapaCliente && (!mapaEhInstanciado(mapaCliente) || players[entry[0]].instanciaId === instanciaCliente))); })),
            bosses: filtrarPorMapa(bosses, mapaCliente, instanciaCliente),
            drops: filtrarPorMapa(dropsChao, mapaCliente, instanciaCliente),
            gases: filtrarPorMapa(gasesVeneno, mapaCliente, instanciaCliente),
            mapVfx: mapVfx.filter(function (v) { return v.mapa === mapaCliente; }),
            // ===== NOVAS CLASSES (v1.31): zonas de chão + moitas =====
            caixasFerramentas: filtrarPorMapa(caixasFerramentas, mapaCliente, instanciaCliente),
            chuvasCometas: filtrarPorMapa(chuvasCometas, mapaCliente, instanciaCliente),
            orbeConstelacoes: filtrarPorMapa(orbeConstelacoes, mapaCliente, instanciaCliente),
            redesSniper: filtrarPorMapa(redesSniper, mapaCliente, instanciaCliente),
            florimSementes: filtrarPorMapa(florimSementes, mapaCliente, instanciaCliente),
            florimArvores: filtrarPorMapa(florimArvores, mapaCliente, instanciaCliente),
            florimEspinhos: filtrarPorMapa(florimEspinhos, mapaCliente, instanciaCliente),
            florimParedes: filtrarPorMapa(florimParedes, mapaCliente, instanciaCliente),
            moitas: MOITAS_SNIPER
        }), () => {});
    });
}, 50);

// ============ SISTEMA DE PERSONAGENS (seleção / criação / exclusão) ============
// O personagem só é criado no mundo depois que o cliente confirma a seleção.
const MAX_PERSONAGENS_POR_CONTA = 10;
const TAMANHO_MIN_NOME = 3;
const TAMANHO_MAX_NOME = 16;
const PASTA_CHAR_DELETADOS = path.join(__dirname, 'Char deletados');
const PALAVRAS_PROIBIDAS_NOME = ['admin', 'administrator', 'moderador', 'moderator', 'suporte', 'game_master', 'gamemaster', 'staff', 'owner', 'root'];

// Ações aceitas enquanto o jogador ainda não escolheu um personagem.
// Qualquer outra ação é descartada: nada de gameplay antes da confirmação.
const ACOES_ANTES_DA_SELECAO = [
    'login', 'google_login', 'personagem_listar', 'personagem_verificar_nome',
    'personagem_criar', 'personagem_deletar', 'personagem_selecionar',
    'ping', 'client_error', 'client_estado'
];

function validarNomePersonagem(valor) {
    if (typeof valor !== 'string') return { ok: false, mensagem: 'Contem Caracteres proibido ou inapropriados' };
    const nome = valor.trim();
    if (nome.length < TAMANHO_MIN_NOME || nome.length > TAMANHO_MAX_NOME) {
        return { ok: false, mensagem: 'Contem Caracteres proibido ou inapropriados' };
    }
    if (!/^[A-Za-z0-9_-]+$/.test(nome)) {
        return { ok: false, mensagem: 'Contem Caracteres proibido ou inapropriados' };
    }
    const baixo = nome.toLowerCase();
    for (let i = 0; i < PALAVRAS_PROIBIDAS_NOME.length; i++) {
        if (baixo.indexOf(PALAVRAS_PROIBIDAS_NOME[i]) !== -1) {
            return { ok: false, mensagem: 'Contem Caracteres proibido ou inapropriados' };
        }
    }
    return { ok: true, nome: nome };
}

// Registro legado (conta == nome) não tem "owner": nesse caso a chave é a conta.
function contaDoRegistro(registro, nomeChave) {
    if (registro && typeof registro.owner === 'string' && registro.owner) return registro.owner;
    return nomeChave;
}

function personagemPertenceAConta(nome, contaId) {
    if (!nome || !contaId) return false;
    const registro = carregarProgresso(nome);
    if (!registro) return false;
    return contaDoRegistro(registro, nome) === contaId;
}

function contaAutenticada(ws) {
    return !!(ws && (ws._googleAuthenticated || ws._localIdAuthenticated));
}

function diagnosticoMascaraRaster(mask) {
    if (!mask || typeof mask.data !== 'string') return null;
    const packed = Buffer.from(mask.data, 'base64');
    let selected = 0;
    for (const byte of packed) {
        let value = byte;
        while (value) {
            value &= value - 1;
            selected++;
        }
    }
    return { width: mask.w, height: mask.h, selectedPixels: selected, transparentPixels: Math.max(0, mask.w * mask.h - selected) };
}

function logDiagnosticoLaco(stage, objeto, extra) {
    if (!LOCAL_LASSO_DIAGNOSTICS || !objeto || objeto.assetMaskMode !== 'auto') return;
    console.info('[LASSO DIAG ' + stage + ']', JSON.stringify({
        id: objeto.id || null,
        spriteId: objeto.spriteId || null,
        asset: objeto.asset || null,
        sourceRegion: objeto.assetRect || objeto.region || null,
        bounds: { x: objeto.x, y: objeto.y, w: objeto.w, h: objeto.h },
        textureReference: objeto.asset || null,
        hasRasterMask: !!objeto.assetMaskRaster,
        mask: diagnosticoMascaraRaster(objeto.assetMaskRaster),
        extra: extra || null
    }));
}
if (LOCAL_LASSO_DIAGNOSTICS) {
    mapObjetos.forEach(function (objeto) { logDiagnosticoLaco('LOAD_DISK', objeto); });
}

function listarPersonagensDaConta(contaId) {
    const lista = [];
    let banco = {};
    try { banco = dbCarregarTodos() || {}; } catch (e) { banco = {}; }
    for (const chave of Object.keys(banco)) {
        const registro = banco[chave];
        if (!registro || typeof registro !== 'object') continue;
        if (contaDoRegistro(registro, chave) !== contaId) continue;
        lista.push({
            personagem: chave,
            personagemId: (typeof registro.personagemId === 'string' && registro.personagemId) ? registro.personagemId : chave,
            classe: registro.classe || 'guerreiro',
            level: registro.level || 1,
            xp: registro.xp || 0
        });
    }
    lista.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    return lista;
}

function vincularPersonagensGoogle(accountId, emailVerificado) {
    const banco = dbCarregarTodos() || {};
    const email = String(emailVerificado || '').trim().toLowerCase();
    const atualizacoes = [];
    for (const nome of Object.keys(banco)) {
        const registro = banco[nome];
        if (!registro || typeof registro !== 'object') continue;
        const owner = contaDoRegistro(registro, nome);
        if (owner.toLowerCase() === email && owner !== accountId) {
            atualizacoes.push({ userId: nome, dados: { owner: accountId, googleEmail: email } });
        }
    }
    if (atualizacoes.length) salvarProgressoEmLote(atualizacoes);
}

function gerarIdPersonagem(nome) {
    const sufixo = Math.random().toString(36).slice(2, 8);
    return 'p_' + nome + '_' + sufixo;
}

// Backup obrigatório ANTES de apagar. Se falhar, a exclusão é abortada.
function criarBackupExclusaoPersonagem(nome, registro) {
    const idUnico = (registro && typeof registro.personagemId === 'string' && registro.personagemId) ? registro.personagemId : nome;
    const pastaId = String(idUnico).replace(/[^A-Za-z0-9_-]/g, '_');
    const destino = path.join(PASTA_CHAR_DELETADOS, pastaId);
    const pastaLogs = path.join(destino, 'logs');
    if (!fs.existsSync(PASTA_CHAR_DELETADOS)) fs.mkdirSync(PASTA_CHAR_DELETADOS, { recursive: true });
    if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });
    if (!fs.existsSync(pastaLogs)) fs.mkdirSync(pastaLogs, { recursive: true });
    fs.writeFileSync(path.join(destino, 'personagem.json'), JSON.stringify(registro, null, 2), 'utf-8');
    fs.writeFileSync(path.join(pastaLogs, 'exclusao.json'), JSON.stringify({
        personagem: nome,
        personagemId: idUnico,
        conta: contaDoRegistro(registro, nome),
        backupEm: Date.now(),
        dataISO: new Date().toISOString(),
        dados: registro
    }, null, 2), 'utf-8');
    return destino;
}

wss.on('connection', (ws) => {
    ws.on('error', (err) => {
        console.error('[WS CLIENTE ERRO]', err && err.message ? err.message : err);
    });
    console.log('[CONEXAO] cliente conectado (' + new Date().toISOString() + ')');
    let playerId = null;
    let userId = null;

    // ===== LAYOUT DE UI POR DISPOSITIVO (pc/mobile) =====
    // uiLayout agora é { pc: {...}, mobile: {...} }. Formatos antigos (plano)
    // são tratados como layout de PC e migrados automaticamente.
    function normalizarUiLayout(dados) {
        const vazio = { pc: {}, mobile: {} };
        if (!dados || typeof dados !== 'object') return vazio;
        if (dados.pc && typeof dados.pc === 'object' && !Array.isArray(dados.pc)
            && dados.mobile && typeof dados.mobile === 'object' && !Array.isArray(dados.mobile)) {
            return { pc: dados.pc, mobile: dados.mobile };
        }
        // formato antigo (plano) → assume que foi feito no PC
        return { pc: dados, mobile: {} };
    }

    ws.on('message', async (message) => {
        let data = null;
        try {
            data = JSON.parse(message);
            let agora = Date.now();

            if (playerId && playerSockets[playerId] && playerSockets[playerId] !== ws) {
                try { ws.close(4001, 'Sessão substituída por uma conexão mais recente.'); } catch (e) {}
                return;
            }

            // Cada mensagem entra em seu próprio contexto assíncrono. Timers,
            // setTimeouts e callbacks disparados pela skill herdam o mesmo mapa/instância.
            contextoBroadcastAtual = playerId ? contextoCombateDoJogador(playerId) : null;
            combateContextStorage.enterWith(contextoBroadcastAtual);

            // Nenhuma ação de jogo antes de o personagem ser selecionado/criado.
            if (!ws._charSelecionado && ACOES_ANTES_DA_SELECAO.indexOf(data.action) === -1) return;

            // Login legado por nome foi desativado: nomes enviados pelo cliente não provam identidade.
            if (data.action === 'login') {
                const remoteAddress = String(ws._socket && ws._socket.remoteAddress || '').replace(/^::ffff:/, '');
                const requestedId = typeof data.id === 'string' ? data.id.trim() : '';
                if (!LOCAL_ID_LOGIN_ENABLED || !['127.0.0.1', '::1'].includes(remoteAddress) ||
                    !/^[A-Za-z0-9_-]{1,64}$/.test(requestedId)) {
                    ws.send(JSON.stringify({ type: 'login_erro', mensagem: 'Login por ID disponível somente no modo local de teste.' }));
                    return;
                }
                const localRecord = carregarProgresso(requestedId);
                if (!localRecord) {
                    ws.send(JSON.stringify({ type: 'login_erro', mensagem: 'ID local de teste não encontrado.' }));
                    return;
                }
                ws._localIdAuthenticated = true;
                ws._localCharacterId = requestedId;
                ws._contaId = contaDoRegistro(localRecord, requestedId);
                ws.ehAdminContaGlobal = true;
                ws.ehAdminCliente = true;
                ws.send(JSON.stringify({
                    type: 'personagens_lista',
                    conta: ws._contaId,
                    maximo: 1,
                    personagens: [{
                        personagem: requestedId,
                        personagemId: typeof localRecord.personagemId === 'string' ? localRecord.personagemId : requestedId,
                        classe: localRecord.classe || 'guerreiro',
                        level: Number(localRecord.level) || 1,
                        xp: Number(localRecord.xp) || 0
                    }],
                    localIdLogin: true
                }));
                return;
            }

            if (data.action === 'google_login') {
                if (LOCAL_ID_LOGIN_ENABLED) {
                    ws.send(JSON.stringify({ type: 'login_erro', mensagem: 'Use o login local por ID neste servidor de teste.' }));
                    return;
                }
                if (ws._charSelecionado || ws._googleAuthenticating) return;
                if (!GOOGLE_CLIENT_ID) {
                    ws.send(JSON.stringify({ type: 'login_erro', mensagem: 'Login Google ainda não configurado neste servidor.' }));
                    return;
                }
                ws._googleAuthenticating = true;
                try {
                    const identidade = await verificarGoogleCredential(data.credential, GOOGLE_CLIENT_ID);
                    const contaId = 'google:' + identidade.sub;
                    vincularPersonagensGoogle(contaId, identidade.email);
                    ws._googleAuthenticated = true;
                    ws._googleSubject = identidade.sub;
                    ws._googleEmail = identidade.email;
                    ws._contaId = contaId;
                    ws.ehAdminContaGlobal = !!(spawnsAdmin && (spawnsAdmin.ehAdmin(identidade.email) || spawnsAdmin.ehAdmin(contaId)));
                    ws.ehAdminCliente = ws.ehAdminContaGlobal;
                    ws.send(JSON.stringify({
                        type: 'personagens_lista',
                        conta: contaId,
                        email: identidade.email,
                        maximo: MAX_PERSONAGENS_POR_CONTA,
                        personagens: listarPersonagensDaConta(contaId)
                    }));
                } catch (authError) {
                    console.warn('[LOGIN GOOGLE] autenticação rejeitada:', authError && authError.message ? authError.message : 'erro');
                    ws.send(JSON.stringify({ type: 'login_erro', mensagem: 'Não foi possível confirmar sua conta Google. Tente novamente.' }));
                } finally {
                    ws._googleAuthenticating = false;
                }
                return;
            }

            if (data.action === 'personagem_listar') {
                if (!contaAutenticada(ws) || !ws._contaId) return;
                ws.send(JSON.stringify({
                    type: 'personagens_lista',
                    conta: ws._contaId,
                    email: ws._googleEmail,
                    maximo: MAX_PERSONAGENS_POR_CONTA,
                    personagens: listarPersonagensDaConta(ws._contaId)
                }));
                return;
            }

            if (data.action === 'personagem_verificar_nome') {
                if (!ws._googleAuthenticated || !ws._contaId) return;
                const entrada = typeof data.personagem === 'string' ? data.personagem : '';
                const verificado = validarNomePersonagem(entrada);
                if (!verificado.ok) {
                    ws.send(JSON.stringify({ type: 'personagem_nome_status', personagem: entrada, disponivel: false, mensagem: verificado.mensagem }));
                    return;
                }
                const jaExiste = !!carregarProgresso(verificado.nome);
                ws.send(JSON.stringify({
                    type: 'personagem_nome_status',
                    personagem: verificado.nome,
                    disponivel: !jaExiste,
                    mensagem: jaExiste ? 'Nome já Utilizado' : ''
                }));
                return;
            }

            if (data.action === 'personagem_criar') {
                if (!ws._googleAuthenticated || !ws._contaId) return;
                const contaId = ws._contaId;
                const atuais = listarPersonagensDaConta(contaId);
                if (atuais.length >= MAX_PERSONAGENS_POR_CONTA) {
                    ws.send(JSON.stringify({ type: 'personagem_criado', ok: false, mensagem: 'Limite de personagens atingido.' }));
                    return;
                }
                const validado = validarNomePersonagem(data.personagem);
                if (!validado.ok) {
                    ws.send(JSON.stringify({ type: 'personagem_criado', ok: false, personagem: typeof data.personagem === 'string' ? data.personagem : '', mensagem: validado.mensagem }));
                    return;
                }
                const nomeNovo = validado.nome;
                if (carregarProgresso(nomeNovo)) {
                    ws.send(JSON.stringify({ type: 'personagem_criado', ok: false, personagem: nomeNovo, mensagem: 'Nome já Utilizado' }));
                    return;
                }
                // CLASSES_VALIDAS agora vive no escopo do módulo (fonte única).
                const classe = classeValida(data.classe) ? data.classe : 'guerreiro';
                try {
                    salvarProgresso(nomeNovo, {
                        personagemId: gerarIdPersonagem(nomeNovo),
                        owner: contaId,
                        classe: classe,
                        level: 1,
                        xp: 0,
                        hp: 100,
                        x: BEMVINDO_SPAWN_X,
                        y: BEMVINDO_SPAWN_Y,
                        atributos: atributosIniciais(),
                        pontosDisponiveis: PONTOS_INICIAIS,
                        pontosHabilidade: 0,
                        skills: {},
                        tutorialEtapa: 0,
                        tutorialStatusConcluido: false,
                        tutorialSkillConcluida: false,
                        inventario: inventarioPadrao(),
                        uiLayout: normalizarUiLayout(null),
                        criadoEm: Date.now()
                    });
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'personagem_criado', ok: false, personagem: nomeNovo, mensagem: 'Erro ao criar o personagem.' }));
                    return;
                }
                console.log('[PERSONAGEM] criado "' + nomeNovo + '" (classe ' + classe + ') na conta "' + contaId + '"');
                ws.send(JSON.stringify({ type: 'personagem_criado', ok: true, personagem: nomeNovo, classe: classe }));
                ws.send(JSON.stringify({
                    type: 'personagens_lista',
                    conta: contaId,
                    maximo: MAX_PERSONAGENS_POR_CONTA,
                    personagens: listarPersonagensDaConta(contaId)
                }));
                return;
            }

            if (data.action === 'personagem_deletar') {
                if (!ws._googleAuthenticated || !ws._contaId) return;
                const contaId = ws._contaId;
                const nomeDel = String(data.personagem || '').trim();
                if (!nomeDel || !personagemPertenceAConta(nomeDel, contaId)) {
                    ws.send(JSON.stringify({ type: 'personagem_deletado', ok: false, mensagem: 'Personagem inválido.' }));
                    return;
                }
                const registroDel = carregarProgresso(nomeDel);
                if (!registroDel) {
                    ws.send(JSON.stringify({ type: 'personagem_deletado', ok: false, mensagem: 'Personagem inválido.' }));
                    return;
                }
                let caminhoBackup = null;
                try {
                    caminhoBackup = criarBackupExclusaoPersonagem(nomeDel, registroDel);
                } catch (e) {
                    console.error('[PERSONAGEM] Falha no backup de "' + nomeDel + '", exclusão abortada:', e.message);
                    ws.send(JSON.stringify({ type: 'personagem_deletado', ok: false, mensagem: 'Falha no backup. O personagem NÃO foi excluído.' }));
                    return;
                }
                // Se estiver online em outra conexão, derruba a sessão antes de apagar.
                const idOnline = 'heroi_' + nomeDel;
                if (players[idOnline]) {
                    if (playerSockets[idOnline] && playerSockets[idOnline] !== ws) {
                        try { playerSockets[idOnline].close(); } catch (e) {}
                    }
                    delete players[idOnline];
                    delete playerSockets[idOnline];
                    delete lacaios[idOnline];
                    delete petRespawnTimer[idOnline];
                    delete aurasSagradas[idOnline];
                    delete cooldownAuraSagrada[idOnline];
                    delete cooldownRessurreicao[idOnline];
                    delete bandas[idOnline];
                }
                try {
                    dbRemoverProgresso(nomeDel);
                } catch (e) {
                    console.error('[PERSONAGEM] Falha ao remover "' + nomeDel + '":', e.message);
                    ws.send(JSON.stringify({ type: 'personagem_deletado', ok: false, mensagem: 'Erro ao excluir o personagem.' }));
                    return;
                }
                console.log('[PERSONAGEM] "' + nomeDel + '" excluído da conta "' + contaId + '" | backup em: ' + caminhoBackup);
                ws.send(JSON.stringify({ type: 'personagem_deletado', ok: true, personagem: nomeDel, backup: caminhoBackup }));
                ws.send(JSON.stringify({
                    type: 'personagens_lista',
                    conta: contaId,
                    maximo: MAX_PERSONAGENS_POR_CONTA,
                    personagens: listarPersonagensDaConta(contaId)
                }));
                return;
            }

            // ============ SELECIONAR — a partir daqui o personagem existe no mundo ============
            if (data.action === 'personagem_selecionar') {
                const contaId = ws._contaId || '';
                const nomeSel = String(data.personagem || '').trim();
                const localCharacterAllowed = ws._localIdAuthenticated && ws._localCharacterId === nomeSel;
                if (!contaAutenticada(ws) || !contaId || !nomeSel ||
                    !(localCharacterAllowed || personagemPertenceAConta(nomeSel, contaId))) {
                    ws.send(JSON.stringify({ type: 'personagem_selecionar_erro', mensagem: 'Personagem inválido.' }));
                    return;
                }
                // Troca de personagem exige nova conexão (evita sessão órfã no mundo).
                if (ws._charSelecionado && userId && userId !== nomeSel) {
                    ws.send(JSON.stringify({ type: 'personagem_selecionar_erro', mensagem: 'Conecte novamente para trocar de personagem.' }));
                    return;
                }

                userId = nomeSel;
                playerId = "heroi_" + userId;
                const socketAnterior = playerSockets[playerId];
                if (socketAnterior && socketAnterior !== ws) {
                    cancelarTrade(playerId);
                    socketAnterior._superseded = true;
                    try { socketAnterior.close(4001, 'Personagem conectado em outra sessão.'); } catch (e) {}
                }
                ws._playerId = playerId;
                playerSockets[playerId] = ws;
                ws._charSelecionado = true;

                let dadosSalvos = carregarProgresso(userId);

                let ehAdminConta = contaAutenticada(ws) && ws.ehAdminContaGlobal === true;
                ws.ehAdminCliente = ehAdminConta;

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
                    x: (dadosSalvos && dadosSalvos.x !== undefined && mapaPorCoordenada(dadosSalvos.x)) ? dadosSalvos.x : CIDADE_SPAWN_X,
                    y: (dadosSalvos && dadosSalvos.y !== undefined && mapaPorCoordenada(dadosSalvos.x)) ? dadosSalvos.y : CIDADE_SPAWN_Y,
                    angulo: 0,
                    moving: false,
                    hp: dadosSalvos && dadosSalvos.hp !== undefined ? dadosSalvos.hp : 100,
                    maxHp: 100,
                    estamina: 100,
                    classe: dadosSalvos ? (dadosSalvos.classe || 'guerreiro') : 'guerreiro',
                    level: dadosSalvos ? (Number(dadosSalvos.level) || 1) : 1,
                    xp: dadosSalvos ? (Number(dadosSalvos.xp) || 0) : 0,
                    atributos: (dadosSalvos && dadosSalvos.atributos) ? dadosSalvos.atributos : atributosIniciais(),
                    pontosDisponiveis: pontosInit,
                    skills: (dadosSalvos && dadosSalvos.skills) ? dadosSalvos.skills : {},
                    skillUpgrades: (dadosSalvos && dadosSalvos.skillUpgrades && typeof dadosSalvos.skillUpgrades === 'object') ? dadosSalvos.skillUpgrades : {},
                    // FIX: antes era hardcoded 0 — zerava os pontos de habilidade a cada login,
                    // ignorando o valor salvo em disco (salvarProgresso grava pontosHabilidade).
                    pontosHabilidade: (dadosSalvos && typeof dadosSalvos.pontosHabilidade === 'number') ? dadosSalvos.pontosHabilidade : 0,
                    // Só personagens criados agora recebem o tutorial. Personagens antigos
                    // não ganham etapas novas nem ficam presos por ele.
                    tutorialEtapa: (dadosSalvos && Number(dadosSalvos.tutorialEtapa) > 0) ? (Number(dadosSalvos.tutorialEtapa) >= 3 ? 4 : Number(dadosSalvos.tutorialEtapa)) : 0,
                    tutorialStatusConcluido: !!(dadosSalvos && dadosSalvos.tutorialStatusConcluido),
                    tutorialSkillConcluida: !!(dadosSalvos && dadosSalvos.tutorialSkillConcluida),
                    pvpAtivo: false,
                    ouro: dadosSalvos && typeof dadosSalvos.ouro === 'number' ? dadosSalvos.ouro : 0,
                    pocoes: (dadosSalvos && Array.isArray(dadosSalvos.pocoes)) ? dadosSalvos.pocoes : [], // v1.34: estoque de poções
                    mana: (dadosSalvos && dadosSalvos.mana !== undefined) ? dadosSalvos.mana : 50,
                    maxMp: 50,
                    inventario: (dadosSalvos && dadosSalvos.inventario) ? dadosSalvos.inventario : inventarioPadrao(),
                    upgradeTxn: (dadosSalvos && dadosSalvos.upgradeTxn && typeof dadosSalvos.upgradeTxn === 'object')
                        ? dadosSalvos.upgradeTxn
                        : null,
                    uiLayout: normalizarUiLayout(dadosSalvos && dadosSalvos.uiLayout),
                    isDashing: false,
                    mapaTransicaoAte: 0,
                    furiaTimer: 0,
                    giroDescontroladoTimer: 0,
                    giroDescontroladoCooldown: 0,
                    giroDescontroladoAtivo: false,
                    furiaCrescenteNivel: 0,
                    stunTimer: 0,
                    guerreiroBuffAte: 0,
                    lastGuerreiroGuardiao: 0,
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
                    dmDashEscudoCooldown: 0,    // Escudo de Energia: CD 10s
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
                    snRoupaCamo: false,         // ROUPA de camuflagem (vestida pelo DASH, 5s)
                    snRoupaCamoAte: 0,
                    snCamofladoAte: 0,
                    snPosicao: false,           // Posição de Franco-Atirador (deitado)
                    snPosicaoCd: 0,
                    // ===== ESCUDO ABSORVENTE (caixa de ferramentas / dash do DroneMaster) =====
                    escudoAbsoluto: 0,
                    escudoAbsolutoExpirador: 0,
                    escudoAbsolutoMax: 0,
                    // SUMMONER: modo do Golem (agressivo ataca o alvo focado; passivo só rodeia a invocadora)
                    ogroModo: (dadosSalvos && (dadosSalvos.ogroModo === 'agressivo' || dadosSalvos.ogroModo === 'passivo')) ? dadosSalvos.ogroModo : 'agressivo',
                    isAdmin: ehAdminConta,
                    adminCheats: { vidaInfinita: false, superAtaque: false, manaInfinita: false, semCooldown: false }
                };
                players[playerId].petProfile = petSystem.ensurePlayerPetState({
                    pets: dadosSalvos && dadosSalvos.pets,
                    bestiario: dadosSalvos && dadosSalvos.bestiario,
                    maestria: dadosSalvos && dadosSalvos.maestria,
                    captureState: dadosSalvos && dadosSalvos.captureState
                });
                players[playerId].petActiveId = dadosSalvos && typeof dadosSalvos.petActiveId === 'string'
                    ? dadosSalvos.petActiveId
                    : null;
                players[playerId].maxHp = calcularMaxHp(players[playerId]);
                if (players[playerId].hp > players[playerId].maxHp) players[playerId].hp = players[playerId].maxHp;
                players[playerId].maxMp = calcularMaxMp(players[playerId]);
                if (players[playerId].mana > players[playerId].maxMp) players[playerId].mana = players[playerId].maxMp;
                // Anti-hack (defesa em profundidade): revalida level/xp vindos do
                // disco. Registros forjados por versões antigas do
                // 'salvar_progresso' (aceitava level/xp do cliente) são corrigidos
                // aqui na entrada em vez de contaminarem o level-up.
                if (sanitizarLevelXp(players[playerId])) {
                    console.warn('[ANTI-HACK] level/xp inválido corrigido ao carregar:',
                        userId, '| level=' + players[playerId].level, 'xp=' + players[playerId].xp);
                }
                if (normalizarEquipamentosPorClasse(players[playerId].inventario, players[playerId].classe)) {
                    salvarProgresso(userId, { inventario: players[playerId].inventario });
                    console.warn('[INVENTÁRIO] equipamento incompatível movido para a mochila:', userId);
                }
                // CORREÇÃO (canto preso): se a posição salva caiu na "zona morta" entre o fim
                // da cidade (FIM_CIDADE) e o início da Solari (LARGURA_SOLARI) — onde NÃO existe
                // mapa — o char não consegue andar nem teleportar. Nesse caso, devolve para a
                // cidade de Davahl no login.
                let posXLogin = players[playerId].x;
                let posYLogin = players[playerId].y;
                if (!mapaPorCoordenada(posXLogin)) {
                    posXLogin = CIDADE_SPAWN_X;
                    posYLogin = CIDADE_SPAWN_Y;
                }
                const posicaoLogin = encontrarPosicaoJogadorSegura(players[playerId], posXLogin, posYLogin);
                if (posicaoLogin) {
                    players[playerId].x = posicaoLogin.x;
                    players[playerId].y = posicaoLogin.y;
                } else {
                    players[playerId].x = CIDADE_SPAWN_X;
                    players[playerId].y = CIDADE_SPAWN_Y;
                }
                const petPersistidoAtivo = players[playerId].petProfile.pets.find(function (pet) {
                    return pet && pet.pet_instance_id === players[playerId].petActiveId;
                }) || players[playerId].petProfile.pets[0];
                if (petPersistidoAtivo) {
                    players[playerId].petActiveId = petPersistidoAtivo.pet_instance_id;
                    spawnPetRuntime(playerId, petPersistidoAtivo);
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
                    skillUpgrades: players[playerId].skillUpgrades || {},
                    petProfile: petProfileForClient(players[playerId]),
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
                    if (spawnsAdmin && spawnsAdmin.MONSTROS_EDITAVEIS) {
                        ws.send(JSON.stringify({ type: 'monstros_config', conf: spawnsAdmin.MONSTROS_EDITAVEIS, dropTipos: spawnsAdmin.DROPS_TIPOS || [], tags: spawnsAdmin.TAGS_MONSTRO }));
                    }
                }
                ws.send(JSON.stringify({ type: 'map_vfx', vfx: mapVfx }));
                ws.send(JSON.stringify({ type: 'map_objetos', objetos: mapObjetos }));
                if (LOCAL_LASSO_DIAGNOSTICS) {
                    mapObjetos.forEach(function (objeto) { logDiagnosticoLaco('LOAD_WS', objeto, { recipient: playerId }); });
                }
                // Sincronização de colisões e camadas de todos os mapas (v1.46.0)
                ws.send(JSON.stringify({
                    type: 'colisoes_iniciais',
                    mapas: MAPAS_CONFIG,
                    colisoes: colisoesPorMapa,
                    camadas: camadasPorMapa
                }));
                if (mapaCidade && typeof mapaCidade.obterObstaculos === 'function') {
                    ws.send(JSON.stringify({
                        type: 'colisoes_atualizadas',
                        mapa: 'cidade',
                        obstaculos: mapaCidade.obterObstaculos(),
                        camadas: typeof mapaCidade.obterCamadas === 'function' ? mapaCidade.obterCamadas() : []
                    }));
                }
                if (players[playerId].uiLayout && typeof players[playerId].uiLayout === 'object') {
                    let ul = players[playerId].uiLayout;
                    let temPC = ul.pc && typeof ul.pc === 'object' && Object.keys(ul.pc).length > 0;
                    let temMob = ul.mobile && typeof ul.mobile === 'object' && Object.keys(ul.mobile).length > 0;
                    if (temPC || temMob) {
                        ws.send(JSON.stringify({ type: 'ui_layout', layout: { pc: ul.pc || {}, mobile: ul.mobile || {} } }));
                    }
                }
                const mapaEntrada = mapaPorCoordenada(players[playerId].x + PLAYER_OFFSET_X);
                const elitePresente = slimes
                    .filter(function (mob) {
                        return mob && mob.hp > 0 && entidadeEhElite(mob) &&
                            mapaPorCoordenada(mob.x) === mapaEntrada && instanciaCompativel(players[playerId], mob);
                    })
                    .sort(function (a, b) {
                        return Math.hypot(a.x - players[playerId].x, a.y - players[playerId].y) -
                            Math.hypot(b.x - players[playerId].x, b.y - players[playerId].y);
                    })[0];
                if (elitePresente) {
                    ws.send(JSON.stringify({ type: 'elite_spawn_alert', id: elitePresente.id, nome: elitePresente.nome || 'Elite', x: elitePresente.x, y: elitePresente.y, mapa: mapaEntrada }));
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
                // RTT real da conexão WebSocket: devolve o timestamp enviado pelo cliente.
                // O cliente calcula Date.now() - t, sem depender do relógio do servidor.
                ws.send(JSON.stringify({ type: 'pong', t: Number.isFinite(Number(data.t)) ? Number(data.t) : Date.now(), time: agora, sTime: Date.now() }));
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
                let targetName = typeof data.targetName === 'string' ? data.targetName.trim().toLowerCase() : '';
                if (!targetName || targetName.length > TAMANHO_MAX_NOME) return;
                let targetId = null;
                for (let tid in players) {
                    if (players[tid].nome.toLowerCase() === targetName) {
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
                if (!jogadoresPodemTrocar(playerId, targetId) || p1.tradeId || p2.tradeId) {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: "Jogador muito longe para troca!" }));
                    return;
                }
                if (players[targetId] && playerSockets[targetId]) {
                    players[targetId].tradeInvite = { playerId: playerId, expiresAt: Date.now() + 30000 };
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
                let invite = p2 && p2.tradeInvite;
                let inviterId = invite && invite.playerId;
                if (invite) delete p2.tradeInvite;
                if (inviterId && invite.expiresAt > Date.now() && players[inviterId] && playerSockets[inviterId] &&
                    playerSockets[inviterId].readyState === WebSocket.OPEN && !p2.tradeId && !players[inviterId].tradeId &&
                    jogadoresPodemTrocar(inviterId, playerId)) {
                    let tid = "trade_" + tradeCounter++;
                    trades[tid] = {
                        p1: inviterId,
                        p2: playerId,
                        owner1: players[inviterId].nome,
                        owner2: p2.nome,
                        items1: [],
                        items2: [],
                        conf1: false,
                        conf2: false
                    };
                    
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
                if (trade && trade.p1 !== playerId && trade.p2 !== playerId) {
                    ws.send(JSON.stringify({ type: 'trade_erro', mensagem: 'Você não participa desta troca.' }));
                    return;
                }
                if (trade && (trade.p1 === playerId || trade.p2 === playerId) &&
                    p && p.tradeId === tid && !trade.conf1 && !trade.conf2 &&
                    !isNaN(idx) && p.inventario && p.inventario.mochila &&
                    idx >= 0 && idx < p.inventario.mochila.length) {
                    let isP1 = (trade.p1 === playerId);
                    let myItems = isP1 ? trade.items1 : trade.items2;
                    if (myItems.length < 4 && p.inventario.mochila[idx] && p.inventario.mochila[idx].tipo !== 'vazio') {
                        // 🔒 Item bloqueado não pode ir para a troca (validação no servidor)
                        if (p.inventario.mochila[idx].locked) {
                            ws.send(JSON.stringify({ type: 'inventario_erro', motivo: '🔒 Item bloqueado não pode ser colocado na troca.' }));
                            return;
                        }
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
                if (trade && trade.p1 !== playerId && trade.p2 !== playerId) {
                    ws.send(JSON.stringify({ type: 'trade_erro', mensagem: 'Você não participa desta troca.' }));
                    return;
                }
                if (trade && (trade.p1 === playerId || trade.p2 === playerId) &&
                    p && p.tradeId === tid && !trade.conf1 && !trade.conf2 &&
                    !isNaN(idx) && p.inventario && p.inventario.mochila) {
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
                if (trade && trade.p1 !== playerId && trade.p2 !== playerId) {
                    ws.send(JSON.stringify({ type: 'trade_erro', mensagem: 'Você não participa desta troca.' }));
                    return;
                }
                if (trade && (trade.p1 === playerId || trade.p2 === playerId) &&
                    players[playerId] && players[playerId].tradeId === tid) {
                    if (!jogadoresPodemTrocar(trade.p1, trade.p2) ||
                        !playerSockets[trade.p1] || playerSockets[trade.p1].readyState !== WebSocket.OPEN ||
                        !playerSockets[trade.p2] || playerSockets[trade.p2].readyState !== WebSocket.OPEN) {
                        cancelarTrade(playerId);
                        ws.send(JSON.stringify({ type: 'trade_erro', mensagem: 'Troca cancelada: jogadores desconectados, distantes ou em instâncias diferentes.' }));
                        return;
                    }
                    if (trade.p1 === playerId) trade.conf1 = true;
                    if (trade.p2 === playerId) trade.conf2 = true;

                    if (trade.conf1 && trade.conf2) {
                        let p1 = players[trade.p1];
                        let p2 = players[trade.p2];
                        if (p1 && p2) {
                            try {
                                const inventario1 = inventarioTradePreparado(trade.p1, trade.owner1, trade.items2);
                                const inventario2 = inventarioTradePreparado(trade.p2, trade.owner2, trade.items1);
                                salvarProgressoEmLote([
                                    { userId: trade.owner1, dados: { inventario: inventario1 } },
                                    { userId: trade.owner2, dados: { inventario: inventario2 } }
                                ]);
                                p1.inventario = inventario1;
                                p2.inventario = inventario2;
                            } catch (e) {
                                trade.conf1 = false;
                                trade.conf2 = false;
                                console.error('[TRADE] Falha ao persistir troca; itens permanecem em escrow:', e && e.stack ? e.stack : e);
                                ws.send(JSON.stringify({
                                    type: 'trade_erro',
                                    mensagem: 'A troca não foi concluída porque o salvamento falhou. Os itens continuam reservados.'
                                }));
                                broadcastTradeUpdate(tid);
                                return;
                            }
                            trade.items2.forEach(it => console.log(`[LOG TRADE] Item UID ${it.uid || it.id} (${it.nome}) transferido de ${trade.p2} para ${trade.p1}`));
                            trade.items1.forEach(it => console.log(`[LOG TRADE] Item UID ${it.uid || it.id} (${it.nome}) transferido de ${trade.p1} para ${trade.p2}`));
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

            // ===== DROP: coleta de item no chão (autoritário no servidor) =====
            // v1.34: além de equipamentos, coleta OURO (vira gold), POÇÕES e PEDRAS.
            function coletarDropEspecifico(idxDrop, userIdColeta, wsColeta, playerIdColeta) {
                if (idxDrop < 0 || idxDrop >= dropsChao.length) return;
                let pC = players[playerIdColeta];
                if (!pC || pC.hp <= 0) return;
                let drop = dropsChao[idxDrop];
                let item = drop.item || {};
                let inventarioSeguinte = clonarInventario(pC.inventario);
                let ouroSeguinte = pC.ouro || 0;
                if (item.tipo === 'ouro') { // cai como "gold" direto na carteira
                    let qtdOuro = Math.max(1, Math.round(item.quantidade || 1));
                    ouroSeguinte = Math.max(0, ouroSeguinte + qtdOuro);
                } else {
                    if (item.schemaVersion === 1) {
                        const validation = itemSystem.validateDefinitionAndInstance(item);
                        if (!validation.valid) {
                            console.error('[LOOT] Drop de instância inválida recusado:', validation.reason);
                            wsColeta.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Este drop está inválido e não foi coletado.' }));
                            return;
                        }
                    }
                    // v1.34: poções e pedras empilham (mesmo subtipo+nível / tipo+raridade)
                    let chaveStack = null;
                    if (item.tipo === 'consumivel') chaveStack = 'pocao:' + (item.subtipo || item.tipo) + ':' + (item.nivel || 0);
                    else if (item.tipo === 'pedra') chaveStack = 'pedra:' + (item.raridade || 'comum');
                    if (chaveStack) {
                        let existente = inventarioSeguinte.mochila.find(mi => mi && (mi._stackChave === chaveStack || (
                            (mi.tipo === 'consumivel' && chaveStack === 'pocao:' + (mi.subtipo || mi.tipo) + ':' + (mi.nivel || 0)) ||
                            (mi.tipo === 'pedra' && chaveStack === 'pedra:' + (mi.raridade || 'comum'))
                        )));
                        if (existente) {
                            existente.quantidade = (existente.quantidade || 1) + 1;
                            existente._stackChave = chaveStack;
                        } else {
                            const itemEmpilhado = JSON.parse(JSON.stringify(item));
                            itemEmpilhado.quantidade = itemEmpilhado.quantidade || 1;
                            itemEmpilhado._stackChave = chaveStack;
                            inventarioSeguinte.mochila.push(itemEmpilhado);
                        }
                    } else {
                        adicionarItemAoInventarioPreparado(inventarioSeguinte, JSON.parse(JSON.stringify(item)));
                    }
                }
                try {
                    salvarProgresso(userIdColeta, {
                        inventario: inventarioSeguinte,
                        ouro: ouroSeguinte
                    });
                } catch (e) {
                    console.error('[DROP] Falha ao persistir coleta:', e && e.stack ? e.stack : e);
                    wsColeta.send(JSON.stringify({
                        type: 'inventario_erro',
                        motivo: 'A coleta não foi concluída porque o salvamento falhou. Tente novamente.'
                    }));
                    return;
                }
                dropsChao.splice(idxDrop, 1);
                pC.ouro = ouroSeguinte;
                pC.inventario = inventarioSeguinte;
                if (item.tipo === 'ouro') {
                    let qtdOuro = Math.max(1, Math.round(item.quantidade || 1));
                    wsColeta.send(JSON.stringify({ type: 'ouro_ganho', quantidade: qtdOuro, ouro: pC.ouro }));
                    console.log(`[LOG DROP] Ouro +${qtdOuro} coletado por ${playerIdColeta}`);
                } else {
                    console.log(`[LOG DROP] Item UID ${item.uid || item.id} (${item.nome || item.tipo}) coletado por ${playerIdColeta}`);
                    wsColeta.send(JSON.stringify({ type: 'item_coletado', item: item, equipadoMsg: null }));
                    if (pC.pocoes && item.tipo === 'consumivel') {
                        // mantém o HUD de poções sincronizado
                        wsColeta.send(JSON.stringify({ type: 'pocoes_sync', pocoes: pC.pocoes }));
                    }
                }
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'item_removido_chao', dropId: drop.id }));
                    }
                });
            }

            if (data.action === 'coletar_item') {
                let p = players[playerId];
                if (p.hp <= 0) return;
                let dropId = data.dropId;
                let idxDrop = dropsChao.findIndex(d => d.id === dropId);
                if (idxDrop === -1) return;
                let drop = dropsChao[idxDrop];
                let distDrop = Math.hypot((p.x + 12) - drop.x, (p.y + 16) - drop.y);
                if (distDrop > (equipamentos ? equipamentos.BALANCE.raioColeta : 70)) return;
                coletarDropEspecifico(idxDrop, userId, ws, playerId);
                return;
            }

            // ===== v1.34: USAR POÇÃO (slot HP/MP do HUD) =====
            if (data.action === 'usar_pocao') {
                let pP = players[playerId];
                if (!pP || pP.hp <= 0) return;
                if (data.subtipo !== 'mp' && data.subtipo !== 'hp') {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Tipo de poção inválido.' }));
                    return;
                }
                let subtipo = data.subtipo === 'mp' ? 'pocao_mp' : 'pocao_hp';
                if (!pP.inventario || !Array.isArray(pP.inventario.mochila)) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Inventário indisponível no servidor.' }));
                    return;
                }
                // A ação do HUD legado escolhe a poção de maior nível; a mochila pode enviar o ID exato.
                let candidatas = pP.inventario.mochila.filter(mi => mi && mi.tipo === 'consumivel' && (mi.subtipo || '') === subtipo);
                if (!candidatas.length) {
                    ws.send(JSON.stringify({ type: 'pocao_indisponivel', subtipo: subtipo }));
                    return;
                }
                let pocao;
                if (data.id != null) {
                    const itemId = typeof data.id === 'string' ? data.id.trim() : '';
                    const selecionadas = candidatas.filter(function (item) { return item.id === itemId; });
                    if (!itemId || selecionadas.length !== 1) {
                        ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'A poção selecionada não existe ou está duplicada.' }));
                        return;
                    }
                    pocao = selecionadas[0];
                } else {
                    candidatas.sort((a, b) => (b.nivel || 0) - (a.nivel || 0));
                    pocao = candidatas[0];
                }
                let pct = pocao.pctCura || (pocao.nivel === 3 ? 1 : (pocao.nivel === 2 ? 0.4 : 0.2));
                if (!Number.isFinite(pct) || pct <= 0 || pct > 1) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Poção inválida; uso recusado.' }));
                    return;
                }
                const inventarioSeguinte = clonarInventario(pP.inventario);
                const pocaoSeguinte = inventarioSeguinte.mochila.find(function (item) {
                    return item && item.id === pocao.id;
                });
                if (!pocaoSeguinte) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Poção não encontrada.' }));
                    return;
                }
                let hpSeguinte = pP.hp;
                let manaSeguinte = pP.mana || 0;
                if (subtipo === 'pocao_mp') {
                    let curaMp = Math.round((pP.maxMp || 50) * pct);
                    manaSeguinte = Math.min(pP.maxMp || 50, manaSeguinte + curaMp);
                } else {
                    let curaHp = Math.round((pP.maxHp || 100) * pct);
                    hpSeguinte = Math.min(pP.maxHp || 100, hpSeguinte + curaHp);
                }
                // consome 1 unidade
                pocaoSeguinte.quantidade = (pocaoSeguinte.quantidade || 1) - 1;
                if (pocaoSeguinte.quantidade <= 0) {
                    inventarioSeguinte.mochila = inventarioSeguinte.mochila.filter(mi => mi !== pocaoSeguinte);
                }
                try {
                    salvarProgresso(userId, {
                        inventario: inventarioSeguinte,
                        hp: hpSeguinte,
                        mana: manaSeguinte
                    });
                } catch (e) {
                    console.error('[INVENTARIO] Falha ao persistir uso de poção:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Poção não consumida: falha ao salvar.' }));
                    return;
                }
                pP.inventario = inventarioSeguinte;
                pP.hp = hpSeguinte;
                pP.mana = manaSeguinte;
                if (subtipo === 'pocao_mp') {
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: pP.mana, maxMp: pP.maxMp }));
                } else {
                    ws.send(JSON.stringify({ type: 'hp_sync', hp: pP.hp, maxHp: pP.maxHp }));
                }
                ws.send(JSON.stringify({ type: 'pocao_usada', subtipo: subtipo, nivel: pocao.nivel, nome: pocao.nome }));
                ws.send(JSON.stringify({ type: 'inventario_sync', inventario: JSON.parse(JSON.stringify(pP.inventario)) }));
                return;
            }

            // ===== EQUIPAR item da mochila (valida classe/slot no servidor) =====
            if (data.action === 'equipar_item') {
                let p = players[playerId];
                if (!p.inventario || !Array.isArray(p.inventario.mochila)) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Inventário indisponível no servidor.' }));
                    return;
                }
                const itemId = typeof data.id === 'string' ? data.id.trim() : '';
                const matches = p.inventario.mochila.filter(i => i && i.id === itemId);
                if (!itemId || matches.length !== 1) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Item inválido, ausente ou duplicado na mochila.' }));
                    return;
                }
                let itemMochila = matches[0];
                if (data.uid && itemMochila.uid && data.uid !== itemMochila.uid) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'A identidade deste item não corresponde ao estado do servidor.' }));
                    return;
                }
                const slotsPermitidos = inventarioPadrao().slots;
                const slotDestino = itemMochila.slot;
                const referenciasMesmoItem = Object.keys(p.inventario.slots || {}).filter(function (slot) {
                    return p.inventario.slots[slot] && p.inventario.slots[slot].id === itemId;
                }).length + p.inventario.mochila.filter(function (item) { return item && item.id === itemId; }).length;
                if (itemMochila.tipo !== 'equipamento' ||
                    typeof slotDestino !== 'string' ||
                    !Object.prototype.hasOwnProperty.call(slotsPermitidos, slotDestino) ||
                    referenciasMesmoItem !== 1) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Equipamento, slot ou ID do item inválido.' }));
                    return;
                }
                if (itemMochila.locked) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Desbloqueie o item antes de equipá-lo.' }));
                    return;
                }
                const validEquip = itemMochila.schemaVersion === 1
                    ? itemSystem.validateEquipmentForClass(p.classe, itemMochila)
                    : { valid: !!(equipamentos && equipamentos.classePodeEquipar(p.classe, itemMochila)) };
                if (!validEquip.valid) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'Sua classe não pode usar ' + (itemMochila.nome || 'esse item') + '!' }));
                    return;
                }
                if (itemMochila.schemaVersion === 1 && validEquip.definition.slot !== slotDestino) {
                    ws.send(JSON.stringify({ type: 'equipar_falhou', motivo: 'O slot do item não corresponde à definição validada pelo servidor.' }));
                    return;
                }
                if (Number.isFinite(Number(itemMochila.requiredLevel)) && p.level < Number(itemMochila.requiredLevel)) {
                    ws.send(JSON.stringify({
                        type: 'equipar_falhou',
                        motivo: 'Você precisa estar no nível ' + itemMochila.requiredLevel + ' para equipar este item.'
                    }));
                    return;
                }
                const inventarioSeguinte = clonarInventario(p.inventario);
                const itemSeguinte = inventarioSeguinte.mochila.find(i => i.id === itemMochila.id);
                const antigo = inventarioSeguinte.slots[slotDestino] || null;
                inventarioSeguinte.mochila = inventarioSeguinte.mochila.filter(i => i.id !== itemMochila.id);
                if (antigo) inventarioSeguinte.mochila.push(antigo);
                inventarioSeguinte.slots[slotDestino] = itemSeguinte;
                const jogadorSeguinte = Object.assign({}, p, { inventario: inventarioSeguinte });
                const maxHpSeguinte = calcularMaxHp(jogadorSeguinte);
                const hpSeguinte = Math.min(p.hp, maxHpSeguinte);
                const maxMpSeguinte = calcularMaxMp(jogadorSeguinte);
                const manaSeguinte = Math.min(p.mana, maxMpSeguinte);
                try {
                    salvarProgresso(userId, {
                        inventario: inventarioSeguinte,
                        maxHp: maxHpSeguinte,
                        hp: hpSeguinte,
                        maxMp: maxMpSeguinte,
                        mana: manaSeguinte
                    });
                } catch (e) {
                    console.error('[INVENTARIO] Falha ao persistir equipamento:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Equipamento não alterado: falha ao salvar.' }));
                    return;
                }
                p.inventario = inventarioSeguinte;
                p.maxHp = maxHpSeguinte;
                p.hp = hpSeguinte;
                p.maxMp = maxMpSeguinte;
                p.mana = manaSeguinte;
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
                if (!p.inventario || !Array.isArray(p.inventario.mochila)) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Inventário indisponível no servidor.' }));
                    return;
                }
                let slotDeseq = data.slot;
                const slotsPermitidos = inventarioPadrao().slots;
                if (typeof slotDeseq !== 'string' ||
                    !Object.prototype.hasOwnProperty.call(slotsPermitidos, slotDeseq) ||
                    !p.inventario.slots || !Object.prototype.hasOwnProperty.call(p.inventario.slots, slotDeseq)) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Slot de equipamento inválido.' }));
                    return;
                }
                let itemSlot = p.inventario.slots[slotDeseq];
                if (!itemSlot) return;
                const referenciasMesmoItem = Object.keys(p.inventario.slots).filter(function (slot) {
                    return p.inventario.slots[slot] && p.inventario.slots[slot].id === itemSlot.id;
                }).length + p.inventario.mochila.filter(function (item) { return item && item.id === itemSlot.id; }).length;
                if (!itemSlot.id || referenciasMesmoItem !== 1) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Item equipado inválido ou duplicado; nada foi alterado.' }));
                    return;
                }
                const inventarioSeguinte = clonarInventario(p.inventario);
                inventarioSeguinte.slots[slotDeseq] = null;
                adicionarItemAoInventarioPreparado(inventarioSeguinte, itemSlot);
                const jogadorSeguinte = Object.assign({}, p, { inventario: inventarioSeguinte });
                const maxHpSeguinte = calcularMaxHp(jogadorSeguinte);
                const hpSeguinte = Math.min(p.hp, maxHpSeguinte);
                const maxMpSeguinte = calcularMaxMp(jogadorSeguinte);
                const manaSeguinte = Math.min(p.mana, maxMpSeguinte);
                try {
                    salvarProgresso(userId, {
                        inventario: inventarioSeguinte,
                        maxHp: maxHpSeguinte,
                        hp: hpSeguinte,
                        maxMp: maxMpSeguinte,
                        mana: manaSeguinte
                    });
                } catch (e) {
                    console.error('[INVENTARIO] Falha ao persistir desequipamento:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Desequipamento não alterado: falha ao salvar.' }));
                    return;
                }
                p.inventario = inventarioSeguinte;
                p.maxHp = maxHpSeguinte;
                p.hp = hpSeguinte;
                p.maxMp = maxMpSeguinte;
                p.mana = manaSeguinte;
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
                // 🔒 Item bloqueado não pode ser destruído (validação no servidor)
                if (p.inventario.mochila[idx].locked) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: '🔒 Item bloqueado — desbloqueie no inventário antes de destruir.' }));
                    return;
                }
                const inventarioSeguinte = clonarInventario(p.inventario);
                inventarioSeguinte.mochila.splice(idx, 1);
                try {
                    salvarProgresso(userId, { inventario: inventarioSeguinte });
                } catch (e) {
                    console.error('[INVENTARIO] Falha ao persistir destruição:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Item não destruído: falha ao salvar.' }));
                    return;
                }
                p.inventario = inventarioSeguinte;
                ws.send(JSON.stringify({ type: 'inventario_sync', inventario: p.inventario }));
                return;
            }

            // ===== BLOQUEAR / DESBLOQUEAR item (🔒 persistente, server-authoritative) =====
            if (data.action === 'bloquear_item' || data.action === 'desbloquear_item') {
                let p = players[playerId];
                if (!p || !p.inventario) return;
                let ref = localizarItemInstancia(p, data.id, data.uid);
                if (!ref || !ref.item) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Item não encontrado para bloquear/desbloquear.' }));
                    return;
                }
                const inventarioSeguinte = clonarInventario(p.inventario);
                let itemSeguinte = null;
                if (ref.onde === 'mochila') {
                    itemSeguinte = inventarioSeguinte.mochila.find(function (item) {
                        return item && String(item.id) === String(data.id);
                    });
                } else {
                    itemSeguinte = inventarioSeguinte.slots[ref.onde];
                }
                if (!itemSeguinte) {
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Item não encontrado para bloquear/desbloquear.' }));
                    return;
                }
                itemSeguinte.locked = (data.action === 'bloquear_item');
                try {
                    salvarProgresso(userId, { inventario: inventarioSeguinte });
                } catch (e) {
                    console.error('[INVENTARIO] Falha ao persistir bloqueio:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'inventario_erro', motivo: 'Bloqueio não alterado: falha ao salvar.' }));
                    return;
                }
                p.inventario = inventarioSeguinte;
                ws.send(JSON.stringify({ type: 'inventario_sync', inventario: p.inventario }));
                return;
            }

            // ===== FERREIRO: tentativa de upgrade (100% server-authoritative) =====
            if (data.action === 'ferreiro_upgrade') {
                let p = players[playerId];
                if (!p || !p.inventario) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Jogador inválido.' }));
                    return;
                }
                if (!ferreiroMod || !ferreiroMod.FERREIRO_NPC) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Sistema de forja indisponível.' }));
                    return;
                }
                // 1) Proximidade do FERREIRO (o cliente não decide onde o upgrade vale)
                let npcF = ferreiroMod.FERREIRO_NPC;
                if (p.x < LARGURA_CIDADE || p.x >= FIM_CIDADE || Math.hypot(p.x - npcF.x, p.y - npcF.y) > npcF.raioInteracao) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Você precisa estar perto do FERREIRO para usar a forja.' }));
                    return;
                }
                // 2) Não pode estar em troca
                if (p.tradeId) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Você está em uma negociação. Finalize ou cancele antes de usar a forja.' }));
                    return;
                }
                // 3) Item existe, pertence ao jogador e é a MESMA instância (uid)
                let itemRef = localizarItemInstancia(p, data.id, data.uid);
                if (!itemRef || !itemRef.item) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Item não encontrado. Ele pode ter sido vendido, destruído ou trocado.' }));
                    return;
                }
                let itemUp = itemRef.item;
                if (itemUp.tipo !== 'equipamento') {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Apenas EQUIPAMENTOS podem ser melhorados na forja.' }));
                    return;
                }
                if (itemUp.schemaVersion === 1) {
                    const validation = itemSystem.validateEquipmentForClass(p.classe, itemUp);
                    if (!validation.valid) {
                        ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Item inválido: a forja foi recusada.' }));
                        return;
                    }
                }
                // 4) Item bloqueado → recusa
                if (itemUp.locked) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: '🔒 Item bloqueado — desbloqueie no inventário para melhorar.' }));
                    return;
                }
                // 5) Nível válido
                let nivelAtual = Math.min(ferreiroMod.UPGRADE_MAX, Math.max(0, Number(itemUp.upgrade) || 0));
                if (nivelAtual >= ferreiroMod.UPGRADE_MAX) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Este item já está no nível máximo (+' + ferreiroMod.UPGRADE_MAX + ')!' }));
                    return;
                }
                // 6) Idempotência: mesma transação reenviada (lag/toque duplo/reconexão) → reenvia o MESMO resultado
                let txnId = data.transactionId;
                if (typeof txnId !== 'string' || !txnId.trim() || txnId.length > 128) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Identificador de transação inválido.' }));
                    return;
                }
                if (txnId && p.upgradeTxn && p.upgradeTxn.id === txnId) {
                    let payload = Object.assign({ type: 'ferreiro_upgrade_resultado', repetido: true }, p.upgradeTxn.resultado || {});
                    ws.send(JSON.stringify(payload));
                    return;
                }
                // 7) Operação única por jogador (anti-spam de duplo clique)
                let agoraUp = Date.now();
                if (p.upgradeEmAte && agoraUp < p.upgradeEmAte) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'A forja ainda está processando sua operação. Aguarde...' }));
                    return;
                }
                // 8) Material necessário existe e o jogador tem 1 unidade
                let alvo = nivelAtual + 1;
                let pedraInfo = ferreiroMod.pedraParaNivel(alvo);
                if (!pedraInfo || !ferreiroMod.PEDRAS[pedraInfo.pedra]) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Erro na tabela de pedras.' }));
                    return;
                }
                let qtdPedras = contarPedra(p, pedraInfo.pedra);
                if (qtdPedras < 1) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Material insuficiente: precisa de 1x ' + ferreiroMod.PEDRAS[pedraInfo.pedra].nome + ' para chegar a +' + alvo + '.' }));
                    return;
                }

                // Trava anti-spam da operação (aproximadamente a duração da animação)
                p.upgradeEmAte = agoraUp + 2600;

                const inventarioSeguinte = clonarInventario(p.inventario);
                const itemRefSeguinte = itemRef.onde === 'mochila'
                    ? inventarioSeguinte.mochila.find(function (item) { return item && item.id === itemUp.id; })
                    : { item: inventarioSeguinte.slots[itemRef.onde] };
                const itemSeguinte = itemRef.onde === 'mochila' ? itemRefSeguinte : itemRefSeguinte.item;
                if (!itemSeguinte) {
                    p.upgradeEmAte = 0;
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Item não encontrado para a forja.' }));
                    return;
                }
                const jogadorSeguinte = Object.assign({}, p, { inventario: inventarioSeguinte });

                // 9) Decisão do resultado SOMENTE no servidor
                let chance = ferreiroMod.chanceParaNivel(nivelAtual);
                let sucesso = Math.random() < chance;
                let infoUpgrade = null;
                if (sucesso) {
                    itemSeguinte.upgrade = alvo;
                    infoUpgrade = ferreiroMod.aplicarUpgrade(itemSeguinte, alvo);
                    if (itemSeguinte.schemaVersion === 1) itemSystem.recalculateDerived(itemSeguinte);
                }

                // 10) Consome a pedra (após decidir; se já era sucesso, o nível já subiu)
                consumirPedra(jogadorSeguinte, pedraInfo.pedra, 1);

                // 11) Recalcula atributos/vida (o item pode estar EQUIPADO — reflete imediatamente)
                const maxHpSeguinte = calcularMaxHp(jogadorSeguinte);
                const hpSeguinte = Math.min(p.hp, maxHpSeguinte);
                const maxMpSeguinte = calcularMaxMp(jogadorSeguinte);
                const manaSeguinte = Math.min(p.mana, maxMpSeguinte);

                let resultado = {
                    sucesso: sucesso,
                    repetido: false,
                    upgrade: itemSeguinte.upgrade || nivelAtual,
                    nivelAnterior: nivelAtual,
                    chance: chance,
                    pedra: pedraInfo.pedra,
                    item: itemSeguinte,
                    infoUpgrade: infoUpgrade,
                    inventario: inventarioSeguinte,
                    maxHp: maxHpSeguinte, hp: hpSeguinte,
                    maxMp: maxMpSeguinte, mana: Math.round(manaSeguinte),
                    atributosTotais: atributosTotais(jogadorSeguinte)
                };
                const upgradeTxnSeguinte = { id: txnId, resultado: resultado };
                try {
                    salvarProgresso(userId, {
                        inventario: inventarioSeguinte,
                        maxHp: maxHpSeguinte,
                        hp: hpSeguinte,
                        maxMp: maxMpSeguinte,
                        mana: manaSeguinte,
                        upgradeTxn: upgradeTxnSeguinte
                    });
                } catch (e) {
                    p.upgradeEmAte = 0;
                    console.error('[FORJA] Falha ao persistir upgrade:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Upgrade não aplicado: falha ao salvar.' }));
                    return;
                }
                p.inventario = inventarioSeguinte;
                p.maxHp = maxHpSeguinte;
                p.hp = hpSeguinte;
                p.maxMp = maxMpSeguinte;
                p.mana = manaSeguinte;
                p.upgradeTxn = upgradeTxnSeguinte;

                // 14) Envia o resultado final (o cliente só anima por ~3s e revela)
                ws.send(JSON.stringify(Object.assign({ type: 'ferreiro_upgrade_resultado' }, resultado)));
                console.log(`[LOG UPGRADE] ${playerId} ${itemSeguinte.nome} +${nivelAtual} → +${itemSeguinte.upgrade} (${sucesso ? 'SUCESSO' : 'FALHA'}, pedra ${pedraInfo.pedra}, chance ${(chance * 100).toFixed(1)}%)`);
                return;
            }

            // ===== FERREIRO (ADMIN): gerar pedras para teste =====
            if (data.action === 'ferreiro_admin_pedra') {
                let pa = players[playerId];
                let ehAdmin = (pa && pa.isAdmin) || (ws && ws.ehAdminCliente);
                if (!ehAdmin) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Apenas ADMINS podem gerar pedras.' }));
                    return;
                }
                let pedra = String(data.pedra || '').toUpperCase();
                let qtd = Math.max(1, Math.min(200, parseInt(data.qtd, 10) || 1));
                if (!ferreiroMod || !ferreiroMod.PEDRAS[pedra]) {
                    ws.send(JSON.stringify({ type: 'ferreiro_erro', motivo: 'Pedra inválida. Use FADEO, MURK, DIVINE ou STONE_GOD.' }));
                    return;
                }
                adicionarPedra(playerId, pedra, qtd);
                syncInventario(playerId);
                if (ws) ws.send(JSON.stringify({ type: 'ferreiro_aviso', motivo: 'Pedras adicionadas: ' + qtd + 'x ' + ferreiroMod.PEDRAS[pedra].nome + '.' }));
                return;
            }

            // ===== ORGANIZAR mochila (raridade → slot → nome) =====
            if (data.action === 'organizar_mochila') {
                let p = players[playerId];
                if (!p.inventario || !p.inventario.mochila) return;
                var ORDEM_RARIDADE = { lendario: 0, epico: 1, raro: 2, incomum: 3, comum: 4 };
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

            // ===== SALVAR / RESTAURAR layout da interface (Editor de UI) — POR DISPOSITIVO =====
            if (data.action === 'salvar_ui_layout') {
                let p = players[playerId];
                let dev = (data.device === 'mobile') ? 'mobile' : 'pc';
                let layoutLimpo = {};
                let cont = 0;
                if (data.layout && typeof data.layout === 'object') {
                    for (let k in data.layout) {
                        if (cont >= 60) break;
                        let v = data.layout[k];
if (v && typeof v.x === 'number' && typeof v.y === 'number'
                        && Number.isFinite(v.x) && Number.isFinite(v.y)) {
                        let pos = { x: Math.round(v.x), y: Math.round(v.y) };
                        if (typeof v.w === 'number' && Number.isFinite(v.w) && v.w > 0 && v.w <= 3000) pos.w = Math.round(v.w);
                        if (typeof v.h === 'number' && Number.isFinite(v.h) && v.h > 0 && v.h <= 3000) pos.h = Math.round(v.h);
                        layoutLimpo[k] = pos;
                        cont++;
                    }
                    }
                }
                p.uiLayout = normalizarUiLayout(p.uiLayout);
                p.uiLayout[dev] = layoutLimpo;
                salvarProgresso(userId, { uiLayout: p.uiLayout });
                ws.send(JSON.stringify({ type: 'ui_layout_saved', layout: p.uiLayout }));
                return;
            }

            if (data.action === 'restaurar_ui_layout') {
                let p = players[playerId];
                let dev = (data.device === 'mobile') ? 'mobile' : 'pc';
                p.uiLayout = normalizarUiLayout(p.uiLayout);
                p.uiLayout[dev] = {};
                salvarProgresso(userId, { uiLayout: p.uiLayout });
                ws.send(JSON.stringify({ type: 'ui_layout_reset' }));
                return;
            }

            if (data.action === 'escolher_classe') {
                // Anti-hack: classe tem que existir na whitelist do servidor.
                // Antes aceitava qualquer string do cliente e persistia.
                if (!classeValida(data.classe)) return;
                if (aurasSagradas[playerId]) desativarAuraSagrada(playerId, 'classe_alterada');
                players[playerId].classe = data.classe;
                if (normalizarEquipamentosPorClasse(players[playerId].inventario, data.classe)) {
                    salvarProgresso(userId, { inventario: players[playerId].inventario });
                    ws.send(JSON.stringify({ type: 'inventario_sync', inventario: players[playerId].inventario }));
                }
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
                // Roqueiro: ao trocar para outra classe, remove qualquer banda ativa
                if (data.classe !== 'roqueiro') {
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
                    np.dmDashEscudoCooldown = 0;
                    np.escudoAbsoluto = 0;
                    np.snAim = null;
                    np.snPosicao = false;
                    if (np.snCamuflado) finalizarCamuflagemSniper(np, playerId, 'classe_alterada');
                    np.snCamuflado = false;
                    np.snCamofladoAte = 0;
                    np.snRoupaCamo = false;
                    np.snRoupaCamoAte = 0;
                    if (efeitos) efeitos.removerEfeito(np, 'camuflagem');
                }
                // PIKEMAN: limpa máquinas de estado ao trocar de classe
                {
                    let pk = players[playerId];
                    pk.pikemanGiroCd = 0;
                    pk.pikemanPiruetaCd = 0;
                    pk.pikemanGeadaCd = 0;
                    pk.pikemanExecucaoCd = 0;
                    pk.pikemanProgresso = 0;
                    if (pikemanCanais[playerId]) {
                        delete pikemanCanais[playerId];
                        pk.pikemanProgresso = 0;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_pikeman_execucao_cancel', id: playerId }));
                            }
                        });
                    }
                }
                // zera zonas do jogador que trocou de classe (caixas não persistem)
                for (let i = caixasFerramentas.length - 1; i >= 0; i--) {
                    if (caixasFerramentas[i].ownerId === playerId) caixasFerramentas.splice(i, 1);
                }
            }
            // ===== ADMIN: CONTROLE GLOBAL DO CICLO DIA/NOITE =====
            if (data.action === 'admin_tempo_mundo') {
                if (!ws.ehAdminCliente || !sistemaDiaNoite) {
                    console.warn('[ADMIN TEMPO] Tentativa não autorizada ou sistema indisponível:', playerId);
                    return;
                }
                let controle;
                try {
                    if (data.modo === 'dia') {
                        controle = sistemaDiaNoite.definirHorarioFixo(12, 0);
                    } else if (data.modo === 'noite') {
                        controle = sistemaDiaNoite.definirHorarioFixo(22, 0);
                    } else if (data.modo === 'fixar') {
                        const match = typeof data.horario === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(data.horario);
                        if (!match) {
                            ws.send(JSON.stringify({ type: 'admin_tempo_mundo_result', ok: false, mensagem: 'Horário inválido.' }));
                            return;
                        }
                        const partesHorario = data.horario.split(':').map(Number);
                        controle = sistemaDiaNoite.definirHorarioFixo(partesHorario[0], partesHorario[1]);
                    } else if (data.modo === 'retomar') {
                        controle = sistemaDiaNoite.retomarCicloNatural();
                    } else {
                        ws.send(JSON.stringify({ type: 'admin_tempo_mundo_result', ok: false, mensagem: 'Comando de horário inválido.' }));
                        return;
                    }
                } catch (e) {
                    console.error('[ADMIN TEMPO] Falha ao alterar horário:', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({ type: 'admin_tempo_mundo_result', ok: false, mensagem: 'Não foi possível alterar o horário.' }));
                    return;
                }
                const horaFixada = controle.travado ? sistemaDiaNoite.calcularTempoMundo().horaFormatada : null;
                ws.send(JSON.stringify({
                    type: 'admin_tempo_mundo_result',
                    ok: true,
                    controle: { travado: controle.travado, horaFormatada: horaFixada }
                }));
                console.log('[ADMIN TEMPO]', playerId, controle.travado ? 'horário fixo ' + horaFixada : 'ciclo natural retomado');
                return;
            }

            // ===== ADMIN CHEATS (MODO TESTE) =====
            if (data.action === 'admin_cheats_toggle') {
                if (!ws.ehAdminCliente) {
                    console.warn('[ADMIN CHEATS] Tentativa não autorizada rejeitada para:', playerId);
                    return;
                }
                let p = players[playerId];
                if (!p) return;
                p.adminCheats = Object.assign({
                    vidaInfinita: false,
                    superAtaque: false,
                    manaInfinita: false,
                    semCooldown: false
                }, p.adminCheats || {}, data.cheats || {});

                if (p.adminCheats.vidaInfinita) p.hp = p.maxHp;
                if (p.adminCheats.manaInfinita) p.mana = p.maxMp;

                console.log('[ADMIN CHEATS]', p.nome || playerId, 'atualizou cheats:', p.adminCheats);
                ws.send(JSON.stringify({
                    type: 'admin_cheats_sync',
                    cheats: p.adminCheats
                }));
            }

            // ===== ADMIN: SUBIR DE NÍVEL (LEVEL UP RÁPIDO PARA TESTES) =====
            if (data.action === 'admin_subir_level') {
                let p = players[playerId];
                let ehAdmin = (p && p.isAdmin) || (ws && ws.ehAdminCliente);
                if (!ehAdmin || !p) {
                    console.warn('[ADMIN LEVEL] Tentativa não autorizada rejeitada para:', playerId);
                    return;
                }
                let qtd = Math.max(1, Math.min(100, Math.floor(Number(data.quantidade) || 1)));
                let nivelAntigo = p.level || 1;
                let novoLevel = Math.min(NIVEL_MAXIMO, nivelAntigo + qtd);
                let diff = novoLevel - nivelAntigo;
                if (diff > 0) {
                    p.level = novoLevel;
                    p.xp = 0;
                    p.pontosDisponiveis = (p.pontosDisponiveis === undefined ? 0 : p.pontosDisponiveis) + (diff * PONTOS_POR_LEVEL);
                    p.pontosHabilidade = (p.pontosHabilidade || 0) + diff;
                    p.maxHp = calcularMaxHp(p);
                    p.maxMp = calcularMaxMp(p);
                    p.hp = p.maxHp;
                    p.mana = p.maxMp;
                    if (lacaios[playerId]) {
                        let novaVidaPet = calcularVidaPet(p);
                        lacaios[playerId].maxHp = novaVidaPet;
                        lacaios[playerId].hp = novaVidaPet;
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
                        pontosHabilidade: p.pontosHabilidade || 0,
                        skillUpgrades: p.skillUpgrades || {}
                    });

                    ws.send(JSON.stringify({
                        type: 'xp_ganho',
                        quantidade: 0,
                        level: p.level,
                        xp: p.xp,
                        pontos: p.pontosDisponiveis,
                        pontosHabilidade: p.pontosHabilidade,
                        subiuLevel: true
                    }));

                    if (SkillUpgradeTree) {
                        let infoTree = SkillUpgradeTree.gerarVisaoCliente(p.skillUpgrades || {}, p.level);
                        ws.send(JSON.stringify({
                            type: 'skill_upgrades_sync',
                            skillUpgrades: p.skillUpgrades || {},
                            characterLevel: p.level,
                            pontosDisponiveis: infoTree.pontosDisponiveis,
                            pontosGanhos: infoTree.pontosGanhos,
                            pontosGastos: infoTree.pontosGastos
                        }));
                    }

                    console.log(`[ADMIN LEVEL] ${p.nome || playerId} subiu de nível: ${nivelAntigo} -> ${p.level} (+${diff})`);
                }
            }

            // ===== ADMIN: RESETAR NÍVEL (VOLTA AO NÍVEL 1 PARA REINICIAR TESTES) =====
            if (data.action === 'admin_resetar_level') {
                let p = players[playerId];
                let ehAdmin = (p && p.isAdmin) || (ws && ws.ehAdminCliente);
                if (!ehAdmin || !p) {
                    console.warn('[ADMIN LEVEL RESET] Tentativa não autorizada rejeitada para:', playerId);
                    return;
                }
                p.level = 1;
                p.xp = 0;
                p.atributos = atributosIniciais();
                p.pontosDisponiveis = PONTOS_INICIAIS;
                p.pontosHabilidade = 0;
                p.skillUpgrades = {};
                p.maxHp = calcularMaxHp(p);
                p.maxMp = calcularMaxMp(p);
                p.hp = p.maxHp;
                p.mana = p.maxMp;
                if (lacaios[playerId]) {
                    let novaVidaPet = calcularVidaPet(p);
                    lacaios[playerId].maxHp = novaVidaPet;
                    lacaios[playerId].hp = novaVidaPet;
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
                    pontosHabilidade: p.pontosHabilidade || 0,
                    skillUpgrades: p.skillUpgrades || {}
                });

                ws.send(JSON.stringify({
                    type: 'xp_ganho',
                    quantidade: 0,
                    level: p.level,
                    xp: p.xp,
                    pontos: p.pontosDisponiveis,
                    pontosHabilidade: p.pontosHabilidade,
                    subiuLevel: true
                }));

                ws.send(JSON.stringify({
                    type: 'atributos_resetados',
                    atributos: p.atributos,
                    pontos: p.pontosDisponiveis,
                    maxHp: p.maxHp,
                    maxMp: p.maxMp,
                    mana: p.mana
                }));

                if (SkillUpgradeTree) {
                    let infoTree = SkillUpgradeTree.gerarVisaoCliente(p.skillUpgrades || {}, p.level);
                    ws.send(JSON.stringify({
                        type: 'skill_upgrades_sync',
                        skillUpgrades: p.skillUpgrades || {},
                        characterLevel: p.level,
                        pontosDisponiveis: infoTree.pontosDisponiveis,
                        pontosGanhos: infoTree.pontosGanhos,
                        pontosGastos: infoTree.pontosGastos
                    }));
                }

                console.log(`[ADMIN LEVEL RESET] ${p.nome || playerId} resetado para nível 1`);
            }
            // ===== FIM ADMIN CHEATS =====
            // ===== ADMIN: FORJADOR DE ARMAS =====
            if (data.action === 'admin_spawn_weapon') {
                let p = players[playerId];
                if (!p || !p.isAdmin) return;

                try {
                    const novoItem = itemSystem.createAdminEquipment({
                        classId: data.classe || 'guerreiro',
                        slot: data.slotItem || 'arma',
                        name: data.nome || 'Arma Forjada',
                        rarityId: data.raridade || 'lendario',
                        forca: data.forca,
                        vida: data.vida,
                        customVisual: data.customVisual || null
                    });
                    const inventario = clonarInventario(p.inventario);
                    adicionarItemAoInventarioPreparado(inventario, novoItem);
                    salvarProgresso(userId, { inventario: inventario });
                    p.inventario = inventario;
                    ws.send(JSON.stringify({ type: 'inventario_sync', inventario: p.inventario }));
                    ws.send(JSON.stringify({
                        type: 'server_msg',
                        cor: '#00ff00',
                        texto: 'Item forjado vinculado à definição ' + novoItem.itemDefinitionId + ' e salvo na mochila.'
                    }));
                } catch (e) {
                    console.error('[ITEM ADMIN] Falha ao forjar item para', userId, ':', e && e.stack ? e.stack : e);
                    ws.send(JSON.stringify({
                        type: 'server_msg',
                        cor: '#ff6666',
                        texto: 'Não foi possível forjar o item: ' + (e && e.message ? e.message : 'erro interno de persistência.')
                    }));
                }
                return;
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
                    if (!dados) {
                        const config = spawnsAdmin.TIPOS_MONSTROS[data.tipo];
                        const mensagem = config && config.bioma
                            ? 'Este monstro só pode ser colocado no bioma ' + config.bioma + ', em uma área livre.'
                            : 'Dados ou posição inválidos para a bandeira.';
                        ws.send(JSON.stringify({ type: 'admin_spawn_result', success: false, message: mensagem }));
                        return;
                    }

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
                    ws.send(JSON.stringify({
                        type: 'admin_spawn_result',
                        success: true,
                        message: sub === 'editar' ? 'Bandeira atualizada!' : 'Bandeira plantada!'
                    }));
                } else {
                    let flag = bandeirasSpawn.find(f => f.id === data.flagId);
                    if (flag) excluirBandeira(flag);
                }
                return;
            }

            // ===== EDITOR "EDIT MOOB" (tempo real) =====
            if (data.action === 'admin_mob_editar' || data.action === 'admin_mob_resetar') {
                let p = players[playerId];
                if (!p || !p.isAdmin || !spawnsAdmin) return;
                if (data.action === 'admin_mob_resetar' && data.tipo) {
                    if (typeof spawnsAdmin.resetarMonstroConfig === 'function') {
                        spawnsAdmin.resetarMonstroConfig(data.tipo);
                        aplicarConfigTipo(data.tipo);
                    }
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN && client.ehAdminCliente) {
                            client.send(JSON.stringify({ type: 'monstros_config', conf: spawnsAdmin.MONSTROS_EDITAVEIS, tags: spawnsAdmin.TAGS_MONSTRO }));
                        }
                    });
                    console.log('[EDIT MOOB] Config do mob ' + data.tipo + ' restaurada ao padrão.');
                    return;
                }
                let edicao = validarEdicaoMob(data);
                if (!edicao) return;
                Object.assign(spawnsAdmin.MONSTROS_EDITAVEIS[data.tipo], edicao);
                spawnsAdmin.salvarMonstrosConfig();
                aplicarConfigTipo(data.tipo);
                console.log('[EDIT MOOB] ' + data.tipo + ' atualizado:', JSON.stringify(edicao).slice(0, 300));
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

            // ===== NPCs: interação por proximidade =====
            if (data.action === 'npc_interact') {
                const pNpc = players[playerId];
                const npc = NPCS_INTERATIVOS[String(data.npcId || '')];
                if (!pNpc || !npc) return;
                const mapaP = mapaPorCoordenada(pNpc.x + PLAYER_OFFSET_X);
                if (npc.mapa !== mapaP) return;
                if (Math.hypot(pNpc.x - npc.x, pNpc.y - npc.y) > (npc.raioInteracao || 125)) return;
                if (npc.id === 'tutorial_guia') {
                    let etapaAntes = Number(pNpc.tutorialEtapa || 0);

                    // O tutorial avança SOMENTE quando o jogador volta a falar com o Guia.
                    // Antes de concluir a etapa atual, uma nova interação com o Guia não é permitida.
                    if (etapaAntes === 1 && !pNpc.tutorialStatusConcluido) return;
                    if (etapaAntes === 2 && !pNpc.tutorialSkillConcluida) return;
                    if (etapaAntes === 0) {
                        pNpc.tutorialEtapa = 1;
                        pNpc.tutorialStatusAberto = false;
                        pNpc.tutorialStatusConcluido = false;
                        pNpc.tutorialSkillAberta = false;
                        pNpc.tutorialSkillLida = false;
                        pNpc.tutorialSkillConcluida = false;
                        tutorialSalvar(pNpc);
                    } else if (etapaAntes === 1 && pNpc.tutorialStatusConcluido) {
                        pNpc.tutorialEtapa = 2;
                        pNpc.tutorialStatusAberto = false;
                        pNpc.tutorialSkillAberta = false;
                        pNpc.tutorialSkillLida = false;
                        pNpc.tutorialSkillConcluida = false;
                        tutorialSalvar(pNpc);
                    } else if (etapaAntes === 2 && pNpc.tutorialSkillConcluida) {
                        pNpc.tutorialSkillAberta = false;
                        pNpc.tutorialEtapa = 4;
                        tutorialSalvar(pNpc);
                    } else if (etapaAntes >= 4) {
                        // Última conversa do tutorial: leva o jogador para a Cidade de Davahl.
                        // Usa o mesmo ponto oficial de destino do sistema de teleporte.
                        const destinoCidade = PONTOS_TELEPORTE.cidade;
                        const destinoCidadeX = destinoCidade.x + (Math.random() * 20 - 10);
                        const destinoCidadeY = destinoCidade.y + (Math.random() * 20 - 10);
                        const destinoCidadeSeguro = encontrarPosicaoJogadorSegura(pNpc, destinoCidadeX, destinoCidadeY);
                        if (destinoCidadeSeguro) {
                            pNpc.x = destinoCidadeSeguro.x;
                            pNpc.y = destinoCidadeSeguro.y;
                            pNpc.mapaTransicaoAte = Date.now() + 500;
                            if (pNpc.classe === 'summoner' && lacaios[playerId]) {
                                lacaios[playerId].x = pNpc.x + 30;
                                lacaios[playerId].y = pNpc.y + 30;
                            }
                            tutorialSalvar(pNpc);
                            ws.send(JSON.stringify({
                                type: 'teleporte_confirmado',
                                mapa: 'cidade',
                                x: pNpc.x,
                                y: pNpc.y,
                                motivo: 'tutorial_concluido'
                            }));
                            return;
                        }
                    }

                    const eventoInicio = etapaAntes === 0 ? 'tutorial_iniciado_npc' : (etapaAntes === 1 ? 'tutorial_etapa_2' : (etapaAntes === 2 ? 'tutorial_concluido' : null));
                    // O NPC continua abrindo sua caixa de diálogo normalmente.
                    // A instrução do passo aparece separadamente no centro da tela.
                    ws.send(JSON.stringify({
                        type: 'npc_dialogo',
                        npc: {
                            ...npc,
                            tutorial: true,
                            etapa: pNpc.tutorialEtapa,
                            dialogo: pNpc.tutorialEtapa === 1
                                ? 'Olá, aventureiro, vejo que está perdido aqui nesta ilha. Vou te ajudar com umas dicas.'
                                : pNpc.tutorialEtapa === 2
                                    ? 'Muito bem! Vamos continuar seu treinamento. Agora vamos conhecer suas Skills.'
                                    : pNpc.tutorialEtapa === 3
                                        ? 'Eita! Perigo à vista! Prepare-se. Um Demônio do Tutorial apareceu. Derrote-o para concluir seu treinamento!'
                                        : npc.dialogo
                        }
                    }));
                    ws.send(JSON.stringify({
                        type: 'tutorial_estado',
                        tutorial: tutorialEstadoParaPlayer(pNpc),
                        eventoTutorial: eventoInicio
                    }));
                    return;
                }
                ws.send(JSON.stringify({ type: 'npc_dialogo', npc: npc }));
                return;
            }

            // ===== TUTORIAL: única interação permitida durante as etapas guiadas =====
            if (data.action === 'tutorial_status_opened') {
                const pTut = players[playerId];
                if (pTut && pTut.tutorialEtapa === 1 && !pTut.tutorialStatusAberto) {
                    pTut.tutorialStatusAberto = true;
                    ws.send(JSON.stringify({
                        type: 'tutorial_estado',
                        tutorial: tutorialEstadoParaPlayer(pTut)
                    }));
                }
                return;
            }
            if (data.action === 'tutorial_status_closed') {
                const pTut = players[playerId];
                if (pTut && pTut.tutorialEtapa === 1 && pTut.tutorialStatusAberto) {
                    pTut.tutorialStatusAberto = false;
                    const incompleto = !pTut.tutorialStatusConcluido || (pTut.pontosDisponiveis || 0) > 0;
                    ws.send(JSON.stringify({
                        type: 'tutorial_estado',
                        tutorial: tutorialEstadoParaPlayer(pTut),
                        eventoTutorial: incompleto ? 'tutorial_status_fechado_incompleto' : 'pontos_concluidos'
                    }));
                }
                return;
            }
            if (data.action === 'tutorial_skill_opened') {
                const pTut = players[playerId];
                if (pTut && pTut.tutorialEtapa === 2) {
                    pTut.tutorialSkillAberta = true;
                    pTut.tutorialSkillLida = false;
                    ws.send(JSON.stringify({
                        type: 'tutorial_estado',
                        tutorial: tutorialEstadoParaPlayer(pTut)
                    }));
                }
                return;
            }
            if (data.action === 'tutorial_skill_viewed') {
                const pTut = players[playerId];
                if (pTut && pTut.tutorialEtapa === 2 && pTut.tutorialSkillAberta) {
                    pTut.tutorialSkillLida = true;
                    ws.send(JSON.stringify({
                        type: 'tutorial_estado',
                        tutorial: tutorialEstadoParaPlayer(pTut)
                    }));
                }
                return;
            }
            if (data.action === 'tutorial_skill_closed') {
                const pTut = players[playerId];
                if (pTut && pTut.tutorialEtapa === 2 && pTut.tutorialSkillAberta) {
                    const concluida = !!pTut.tutorialSkillLida;
                    pTut.tutorialSkillAberta = false;
                    if (concluida) {
                        // A leitura de uma Skill encerra a etapa 2 imediatamente.
                        // O monstro final começa sem exigir nova conversa com o Guia.
                        pTut.tutorialSkillConcluida = true;
                        pTut.tutorialEtapa = 3;
                        pTut.tutorialEtapa = 4;
                        tutorialSalvar(pTut);
                        ws.send(JSON.stringify({
                            type: 'tutorial_estado',
                            tutorial: tutorialEstadoParaPlayer(pTut),
                            eventoTutorial: 'tutorial_concluido',
                            mensagem: 'PARABÉNS! Treinamento concluído. Aproveite o vasto mundo de MMORP-Tall.'
                        }));
                    } else {
                        tutorialSalvar(pTut);
                        ws.send(JSON.stringify({
                            type: 'tutorial_estado',
                            tutorial: tutorialEstadoParaPlayer(pTut),
                            eventoTutorial: 'tutorial_skill_fechada_incompleta'
                        }));
                    }
                }
                return;
            }
            if (players[playerId] && (players[playerId].tutorialEtapa === 1 || players[playerId].tutorialEtapa === 2)) {
                // Nesta fase o servidor rejeita movimento, ataque, skills, inventário,
                // PvP, dash e demais comandos. A exceção são os pontos de atributo
                // e o ciclo abrir/fechar Skills do tutorial.
                if (data.action !== 'distribuir_ponto' && data.action !== 'npc_interact' && data.action !== 'tutorial_status_opened' && data.action !== 'tutorial_skill_opened' && data.action !== 'tutorial_skill_viewed' && data.action !== 'tutorial_skill_closed') return;
            }

            // ===== ADMIN: EDITOR DE MAPA (objetos persistentes: criar/editar/excluir/limpar) =====
            if (data.action === 'admin_map_objetos' || data.action === 'admin_map_objetos_excluir' || data.action === 'admin_map_objetos_limpar' || data.action === 'admin_map_objetos_sync' || data.action === 'admin_map_sprites_list' || data.action === 'admin_map_sprite_palette_get' || data.action === 'admin_map_sprite_palette_save') {
                let p = players[playerId];
                let ehAdmin = (p && p.isAdmin) || (ws && ws.ehAdminCliente);
                if (!ehAdmin) {
                    console.warn('[SEGURANÇA] Tentativa não autorizada de editar mapa por: ' + (p ? p.nome : 'desconhecido'));
                    return;
                }
                if (data.action === 'admin_map_sprites_list') {
                    try {
                        ws.send(JSON.stringify({ type: 'map_sprites_catalog', arquivos: listarSpritesMapa() }));
                    } catch (err) {
                        console.error('Erro ao listar sprites do Editor de Mapa:', err.message);
                        ws.send(JSON.stringify({ type: 'map_sprites_catalog', arquivos: [], erro: 'Não foi possível ler a pasta de sprites.' }));
                    }
                    return;
                }
                if (data.action === 'admin_map_sprite_palette_get') {
                    try {
                        ws.send(JSON.stringify({ type: 'map_sprite_palette', items: mapSpritePalette }));
                    } catch (err) {
                        console.error('Erro ao enviar a paleta de sprites:', err.message);
                        ws.send(JSON.stringify({ type: 'map_sprite_palette', items: [], erro: 'Não foi possível carregar a paleta de sprites.' }));
                    }
                    return;
                }
                if (data.action === 'admin_map_sprite_palette_save') {
                    const items = Array.isArray(data.items) ? data.items : null;
                    if (!items || items.length > 500) {
                        ws.send(JSON.stringify({ type: 'map_sprite_palette_saved', ok: false, erro: 'A paleta deve conter no máximo 500 sprites.' }));
                        return;
                    }
                    const sprites = listarSpritesMapa();
                    const ids = new Set();
                    const normalizados = [];
                    for (const item of items) {
                        if (!item || typeof item !== 'object') {
                            ws.send(JSON.stringify({ type: 'map_sprite_palette_saved', ok: false, erro: 'A paleta contém um item inválido.' }));
                            return;
                        }
                        const id = String(item.id || '').slice(0, 64);
                        const asset = String(item.asset || '');
                        const spriteInfo = sprites.find(function (sprite) { return sprite.name === asset; });
                        const region = item.region;
                        const x = Number(region && region.x), y = Number(region && region.y);
                        const w = Number(region && region.w), h = Number(region && region.h);
                        const mask = item.mask == null ? null : item.mask;
                        const maskRaster = item.maskRaster == null ? null : item.maskRaster;
                        const maskMode = item.maskMode === 'auto' || item.maskMode === 'manual' ? item.maskMode : '';
                        const name = String(item.name || '').trim().slice(0, 64);
                        const category = String(item.category || 'Geral').trim().slice(0, 48);
                        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || ids.has(id) || !spriteInfo ||
                            !spriteInfo.width || !spriteInfo.height ||
                            ![x, y, w, h].every(Number.isFinite) ||
                            !Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(w) || !Number.isInteger(h) ||
                            x < 0 || y < 0 || w < 4 || h < 4 ||
                            x + w > spriteInfo.width || y + h > spriteInfo.height || !name || !category ||
                            (maskMode === 'auto' && maskRaster === null) ||
                            (maskRaster !== null && !rasterMascaraValida(maskRaster, { w: w, h: h })) ||
                            (mask !== null && (!Array.isArray(mask) || mask.length < 3 || mask.length > 256 ||
                                mask.some(function (point) {
                                    return !point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y)) ||
                                        Number(point.x) < 0 || Number(point.x) > 1 || Number(point.y) < 0 || Number(point.y) > 1;
                                })))) {
                            ws.send(JSON.stringify({ type: 'map_sprite_palette_saved', ok: false, erro: 'Um sprite da paleta tem nome, textura ou recorte inválido.' }));
                            return;
                        }
                        ids.add(id);
                        normalizados.push({
                            id: id, name: name, asset: asset,
                            region: { x: x, y: y, w: w, h: h },
                            mask: mask ? mask.map(function (point) { return { x: Number(point.x), y: Number(point.y) }; }) : undefined,
                            maskRaster: maskRaster || undefined,
                            maskMode: (mask || maskRaster) ? maskMode : '',
                            category: category
                        });
                    }
                    const anterior = mapSpritePalette;
                    mapSpritePalette = normalizados;
                    if (!salvarPaletaSprites()) {
                        mapSpritePalette = anterior;
                        ws.send(JSON.stringify({ type: 'map_sprite_palette_saved', ok: false, erro: 'Não foi possível gravar map_sprite_palette.json.' }));
                        return;
                    }
                    ws.send(JSON.stringify({ type: 'map_sprite_palette_saved', ok: true }));
                    ws.send(JSON.stringify({ type: 'map_sprite_palette', items: mapSpritePalette }));
                    return;
                }
                if (data.action === 'admin_map_objetos_sync') {
                    const mapaSincronizado = typeof data.mapa === 'string' && MAPAS_CONFIG[data.mapa] ? data.mapa : '';
                    let sincronizados = 0;
                    if (Array.isArray(data.objetos)) {
                        if (!mapaSincronizado || data.objetos.length > 5000) {
                            ws.send(JSON.stringify({
                                type: 'map_objetos_sync_result', ok: false,
                                erro: 'Mapa inválido ou quantidade de objetos acima do limite; nenhum objeto foi alterado.'
                            }));
                            return;
                        }
                        const ids = new Set();
                        const normalizados = [];
                        for (const item of data.objetos) {
                            const objeto = normalizarMapaObjeto(item);
                            if (!objeto || objeto.mapa !== mapaSincronizado ||
                                typeof objeto.id !== 'string' || !objeto.id ||
                                ids.has(objeto.id)) {
                                ws.send(JSON.stringify({
                                    type: 'map_objetos_sync_result', ok: false,
                                    mapa: mapaSincronizado,
                                    objetoId: item && typeof item.id === 'string' ? item.id : '',
                                    erro: 'Há um objeto inválido ou duplicado; nenhum objeto foi alterado. Revise o objeto e tente novamente.'
                                }));
                                return;
                            }
                            ids.add(objeto.id);
                            normalizados.push(objeto);
                        }
                        const anterior = mapObjetos;
                        const mesclados = mapaObjetosMesclarMapa(mapObjetos, normalizados, mapaSincronizado);
                        if (!mesclados) {
                            ws.send(JSON.stringify({
                                type: 'map_objetos_sync_result', ok: false,
                                erro: 'Não foi possível preparar os objetos; nenhum objeto foi alterado.'
                            }));
                            return;
                        }
                        mapObjetos = mesclados;
                        if (!salvarMapObjetos()) {
                            mapObjetos = anterior;
                            ws.send(JSON.stringify({
                                type: 'map_objetos_sync_result', ok: false,
                                erro: 'Não foi possível gravar os objetos; os dados anteriores foram mantidos.'
                            }));
                            return;
                        }
                        sincronizados = normalizados.length;
                    }
                    broadcastMapObjetos();
                    ws.send(JSON.stringify({
                        type: 'map_objetos_sync_result',
                        ok: true,
                        mapa: mapaSincronizado,
                        sincronizados: sincronizados,
                        total: mapObjetos.length,
                        noMapa: mapaSincronizado
                            ? mapObjetos.filter(function (objeto) { return objeto && objeto.mapa === mapaSincronizado; }).length
                            : null
                    }));
                    return;
                }

                function normalizarMapaObjeto(o) {
                    if (!o || typeof o !== 'object') return null;
                    const x = Number(o.x), y = Number(o.y);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                    const pincelColisao = String(o.tipo || '') === 'zona_colisao' && Array.isArray(o.pontos);
                    const pontoInicialX = pincelColisao && o.pontos.length ? Number(o.pontos[0] && o.pontos[0].x) : x;
                    const mapa = mapaPorCoordenada(pontoInicialX);
                    if (!mapa) return null;
                    const configMapa = MAPAS_CONFIG[mapa];
                    const tipo = String(o.tipo || '').slice(0, 32);
                    const spritePersonalizado = tipo === 'sprite_personalizado';
                    if (!spritePersonalizado && TIPOS_OBJETOS_MAPA.indexOf(tipo) === -1) return null;
                    const asset = spritePersonalizado ? String(o.asset || '') : '';
                    let spriteInfo = null;
                    if (spritePersonalizado) {
                        if (path.basename(asset) !== asset || !/\.(?:png|jpe?g|webp)$/i.test(asset)) return null;
                        try {
                            spriteInfo = listarSpritesMapa().find(function (arquivo) { return arquivo.name === asset; }) || null;
                            if (!spriteInfo) return null;
                        } catch (err) {
                            console.error('Erro ao validar sprite do Editor de Mapa:', err.message);
                            return null;
                        }
                    }
                    if (!pincelColisao && (y < configMapa.y0 || y >= configMapa.y0 + configMapa.h)) return null;
                    let pontos = null;
                    let raioX = 0, raioY = 0;
                    let objetoX = x, objetoY = y;
                    let objetoW = Math.max(4, Math.min(500, Math.round(Number(o.w) || 40)));
                    let objetoH = Math.max(4, Math.min(500, Math.round(Number(o.h) || 40)));
                    let animacaoArea = null;
                    let assetRect = null;
                    let assetMask = null;
                    let assetMaskRaster = null;
                    let assetCollisionMask = null;
                    let ySortAnchor = null;
                    let assetDepthSplit = null;
                    if (spritePersonalizado && o.assetRect != null) {
                        const recorte = o.assetRect;
                        if (!spriteInfo || !spriteInfo.width || !spriteInfo.height || !recorte || typeof recorte !== 'object') return null;
                        const rx = Number(recorte.x), ry = Number(recorte.y), rw = Number(recorte.w), rh = Number(recorte.h);
                        if (![rx, ry, rw, rh].every(Number.isFinite) || rx < 0 || ry < 0 || rw < 4 || rh < 4 ||
                            rx + rw > spriteInfo.width || ry + rh > spriteInfo.height) return null;
                        assetRect = { x: Math.floor(rx), y: Math.floor(ry), w: Math.ceil(rx + rw) - Math.floor(rx), h: Math.ceil(ry + rh) - Math.floor(ry) };
                        if (assetRect.x + assetRect.w > spriteInfo.width || assetRect.y + assetRect.h > spriteInfo.height) return null;
                    }
                    if (spritePersonalizado && o.assetMask != null) {
                        if (!Array.isArray(o.assetMask) || o.assetMask.length < 3 || o.assetMask.length > 256) return null;
                        assetMask = [];
                        for (const point of o.assetMask) {
                            const px = Number(point && point.x), py = Number(point && point.y);
                            if (!Number.isFinite(px) || !Number.isFinite(py) || px < 0 || px > 1 || py < 0 || py > 1) return null;
                            assetMask.push({ x: px, y: py });
                        }
                    }
                    if (spritePersonalizado && o.assetMaskRaster != null) {
                        if (!assetRect || !rasterMascaraValida(o.assetMaskRaster, assetRect)) return null;
                        assetMaskRaster = { w: o.assetMaskRaster.w, h: o.assetMaskRaster.h, data: o.assetMaskRaster.data };
                    }
                    if (spritePersonalizado && o.assetMaskMode === 'auto' && !assetMaskRaster) return null;
                    if (spritePersonalizado && o.assetCollisionMask != null) {
                        if (!mascaraPoligonoObjetoValida(o.assetCollisionMask)) return null;
                        assetCollisionMask = o.assetCollisionMask.map(function (point) { return { x: point.x, y: point.y }; });
                    }
                    if (spritePersonalizado && o.ySortAnchor != null) {
                        const anchor = Number(o.ySortAnchor);
                        if (!Number.isFinite(anchor) || anchor < 0 || anchor > 1) return null;
                        ySortAnchor = anchor;
                    }
                    if (spritePersonalizado && o.assetDepthSplit != null) {
                        const split = Number(o.assetDepthSplit);
                        if (!Number.isFinite(split) || split < 0.1 || split > 0.9 ||
                            !assetMask || !assetCollisionMask || ySortAnchor !== split) return null;
                        assetDepthSplit = split;
                    }
                    if (spritePersonalizado && o.animacaoArea != null) {
                        const area = o.animacaoArea;
                        if (!area || typeof area !== 'object') return null;
                        const ax = Number(area.x), ay = Number(area.y), aw = Number(area.w), ah = Number(area.h);
                        if (![ax, ay, aw, ah].every(Number.isFinite) ||
                            ax < 0 || ay < 0 || aw < 0.01 || ah < 0.01 || ax + aw > 1 || ay + ah > 1) return null;
                        animacaoArea = { x: ax, y: ay, w: aw, h: ah };
                    }
                    if (pincelColisao) {
                        if (o.pontos.length < 1 || o.pontos.length > 512) return null;
                        pontos = [];
                        for (const ponto of o.pontos) {
                            const px = Number(ponto && ponto.x), py = Number(ponto && ponto.y);
                            if (!Number.isFinite(px) || !Number.isFinite(py) ||
                                mapaPorCoordenada(px) !== mapa || py < configMapa.y0 || py >= configMapa.y0 + configMapa.h) return null;
                            pontos.push({ x: Math.round(px), y: Math.round(py) });
                        }
                        raioX = Math.max(2, Math.min(100, Number(o.raioX) || 12));
                        raioY = Math.max(2, Math.min(100, Number(o.raioY) || 12));
                        const xs = pontos.map(function (ponto) { return ponto.x; });
                        const ys = pontos.map(function (ponto) { return ponto.y; });
                        objetoX = Math.floor(Math.min.apply(null, xs) - raioX);
                        objetoY = Math.floor(Math.min.apply(null, ys) - raioY);
                        objetoW = Math.ceil(Math.max.apply(null, xs) - Math.min.apply(null, xs) + raioX * 2);
                        objetoH = Math.ceil(Math.max.apply(null, ys) - Math.min.apply(null, ys) + raioY * 2);
                    }
                    const normalizado = {
                        id: String(o.id || ('obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7))),
                        tipo: tipo,
                        asset: asset,
                        assetRect: assetRect,
                        assetMask: assetMask,
                        assetMaskRaster: assetMaskRaster,
                        assetCollisionMask: assetCollisionMask,
                        ySortAnchor: ySortAnchor,
                        assetDepthSplit: assetDepthSplit,
                        assetMaskMode: (assetMask || assetMaskRaster) && (o.assetMaskMode === 'auto' || o.assetMaskMode === 'manual') ? o.assetMaskMode : '',
                        mapa: mapa,
                        x: objetoX,
                        y: objetoY,
                        w: objetoW,
                        h: objetoH,
                        escala: Math.max(0.2, Math.min(4, Number(o.escala) || 1)),
                        escalaX: Math.max(0.2, Math.min(4, Number(o.escalaX) || 1)),
                        escalaY: Math.max(0.2, Math.min(4, Number(o.escalaY) || 1)),
                        rotacao: Number.isFinite(Number(o.rotacao)) ? ((Number(o.rotacao) % 360) + 360) % 360 : 0,
                        spriteId: spritePersonalizado ? String(o.spriteId || '').slice(0, 64) : '',
                        categoria: String(o.categoria || 'Geral').trim().slice(0, 48),
                        ordem: Math.max(0, Math.min(1000000, Math.round(Number(o.ordem) || 0))),
                        variante: Math.max(0, Math.min(8, Math.round(Number(o.variante) || 0))),
                        colisao: pincelColisao || !!o.colisao,
                        camada: ({
                            chao: 'ground', meio: 'objects', frente: 'foreground'
                        })[o.camada] || (['ground', 'decoration_behind', 'objects', 'decoration_front', 'buildings', 'foreground'].includes(o.camada) ? o.camada : 'objects'),
                        efeito: String(o.efeito || '').slice(0, 24),
                        efeitoCor: /^#[0-9a-fA-F]{6}$/.test(o.efeitoCor || '') ? o.efeitoCor : '',
                        animacao: spritePersonalizado && ANIMACOES_MAPA_SPRITE.has(o.animacao) ? o.animacao : 'nenhuma',
                        animacaoArea: animacaoArea
                    };
                    if (pincelColisao) {
                        normalizado.pontos = pontos;
                        normalizado.raioX = raioX;
                        normalizado.raioY = raioY;
                    }
                    return normalizado;
                }

                if (data.action === 'admin_map_objetos_excluir') {
                    const idExcluir = typeof data.id === 'string' ? data.id : '';
                    const novaLista = mapaObjetosRemoverUm(mapObjetos, idExcluir);
                    if (!novaLista) {
                        if (!idExcluir) {
                            ws.send(JSON.stringify({ type: 'map_objeto_excluido', ok: false, erro: 'ID do objeto inválido.' }));
                            return;
                        }
                        broadcastMapObjetos();
                        ws.send(JSON.stringify({ type: 'map_objeto_excluido', ok: true, id: idExcluir, removido: false }));
                        return;
                    }
                    const objetosAnteriores = mapObjetos;
                    mapObjetos = novaLista;
                    if (!salvarMapObjetos()) {
                        mapObjetos = objetosAnteriores;
                        ws.send(JSON.stringify({ type: 'map_objeto_excluido', ok: false, erro: 'Não foi possível gravar a exclusão.' }));
                        return;
                    }
                    broadcastMapObjetos();
                    ws.send(JSON.stringify({ type: 'map_objeto_excluido', ok: true, id: idExcluir }));
                    return;
                }
                if (data.action === 'admin_map_objetos_limpar') {
                    const mapaLimpar = typeof data.mapa === 'string' ? data.mapa : '';
                    if (!mapaLimpar || !MAPAS_CONFIG[mapaLimpar]) {
                        ws.send(JSON.stringify({ type: 'map_objetos_limpos', ok: false, erro: 'Mapa inválido; nenhum objeto foi removido.' }));
                        return;
                    }
                    const objetosAnteriores = mapObjetos;
                    mapObjetos = mapaObjetosLimparMapa(mapObjetos, mapaLimpar);
                    if (!salvarMapObjetos()) {
                        mapObjetos = objetosAnteriores;
                        ws.send(JSON.stringify({ type: 'map_objetos_limpos', ok: false, erro: 'Não foi possível gravar a limpeza.' }));
                        return;
                    }
                    broadcastMapObjetos();
                    ws.send(JSON.stringify({ type: 'map_objetos_limpos', ok: true, mapa: mapaLimpar }));
                    return;
                }
                logDiagnosticoLaco('SAVE_RECEIVED', data.objeto, {
                    payloadMaskPresent: !!(data.objeto && data.objeto.assetMaskRaster),
                    payloadMask: diagnosticoMascaraRaster(data.objeto && data.objeto.assetMaskRaster)
                });
                const objeto = normalizarMapaObjeto(data.objeto);
                if (!objeto) {
                    try { ws.send(JSON.stringify({ type: 'map_objeto_salvo', ok: false, erro: 'Objeto inválido ou sprite não encontrado na pasta do editor.' })); } catch (_) {}
                    return;
                }
                logDiagnosticoLaco('SAVE_NORMALIZED', objeto, {
                    sourceReference: objeto.asset,
                    sourceRegion: objeto.assetRect,
                    raster: diagnosticoMascaraRaster(objeto.assetMaskRaster)
                });
                const mapObjetosAnteriores = mapObjetos.map(function (existente) {
                    return Object.assign({}, existente);
                });
                if (data.sub === 'editar') {
                    const existe = mapObjetos.find(function (o) { return o && o.id === objeto.id; });
                    if (existe) Object.assign(existe, objeto); else mapObjetos.push(objeto);
                } else {
                    mapObjetos.push(objeto);
                }
                if (!salvarMapObjetos()) {
                    mapObjetos = mapObjetosAnteriores;
                    try { ws.send(JSON.stringify({ type: 'map_objeto_salvo', ok: false, erro: 'Não foi possível gravar map_objetos.json.' })); } catch (_) {}
                    return;
                }
                logDiagnosticoLaco('SAVE_DISK', objeto, { file: path.basename(MAP_OBJETOS_FILE) });
                broadcastMapObjetos();
                try { ws.send(JSON.stringify({ type: 'map_objeto_salvo', ok: true, id: objeto.id })); } catch (_) {}
                return;
            }

            // ===== ADMIN: EDITOR DE COLISÕES (validação estrita de cargo) =====
            if (data.action === 'admin_salvar_colisoes') {
                let p = players[playerId];
                let ehAdmin = (p && p.isAdmin) || (ws && ws.ehAdminCliente);
                if (!ehAdmin) {
                    console.warn('[SEGURANÇA] Tentativa não autorizada de salvar colisões por: ' + (p ? p.nome : 'desconhecido'));
                    return;
                }
                const mapa = data.mapa || 'mundo';
                if (!MAPAS_CONFIG[mapa] || !Array.isArray(data.obstaculos) || data.obstaculos.length > 10000 ||
                    (data.camadas !== undefined && (!Array.isArray(data.camadas) || data.camadas.length > 10000))) {
                    ws.send(JSON.stringify({ type: 'colisoes_salvas', sucesso: false, mapa: mapa, erro: 'Mapa ou dados de colisão inválidos.' }));
                    return;
                }
                try {
                    const fileCol = path.join(__dirname, 'colisoes_' + mapa + '.json');
                    fs.writeFileSync(fileCol, JSON.stringify(data.obstaculos, null, 2), 'utf-8');
                    if (Array.isArray(data.camadas)) {
                        const fileCamadas = path.join(__dirname, 'camadas_' + mapa + '.json');
                        fs.writeFileSync(fileCamadas, JSON.stringify(data.camadas, null, 2), 'utf-8');
                    }
                } catch (err) {
                    console.error('Erro ao salvar colisões/camadas do mapa ' + mapa + ':', err.message);
                    ws.send(JSON.stringify({ type: 'colisoes_salvas', sucesso: false, mapa: mapa, erro: 'Falha ao gravar os arquivos no servidor.' }));
                    return;
                }
                colisoesPorMapa[mapa] = data.obstaculos;
                if (Array.isArray(data.camadas)) camadasPorMapa[mapa] = data.camadas;
                console.log('[ADMIN] Colisões do mapa ' + mapa + ' salvas com sucesso (' + data.obstaculos.length + ' obstáculos).');
                if (mapa === 'cidade') {
                    if (mapaCidade && typeof mapaCidade.carregarObstaculos === 'function') {
                        mapaCidade.carregarObstaculos(data.obstaculos);
                    }
                    if (Array.isArray(data.camadas) && mapaCidade && typeof mapaCidade.carregarCamadas === 'function') {
                        mapaCidade.carregarCamadas(data.camadas);
                    }
                }
                const msg = JSON.stringify({
                    type: 'colisoes_atualizadas',
                    mapa: mapa,
                    obstaculos: colisoesPorMapa[mapa] || [],
                    camadas: camadasPorMapa[mapa] || []
                });
                wss.clients.forEach(function (c) {
                    if (c.readyState === WebSocket.OPEN) c.send(msg);
                });
                try {
                    ws.send(JSON.stringify({
                        type: 'colisoes_salvas',
                        sucesso: true,
                        mapa: mapa,
                        total: data.obstaculos.length,
                        totalCamadas: Array.isArray(data.camadas) ? data.camadas.length : 0
                    }));
                } catch (_) {}
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

                // O tutorial só libera a próxima etapa quando todos os pontos iniciais
                // foram distribuídos. O restante do jogo continua bloqueado até então.
                if (p.tutorialEtapa === 1 && p.pontosDisponiveis <= 0 && !p.tutorialStatusConcluido) {
                    // Os 3 pontos concluem o passo de Status, mas o tutorial
                    // permanece na etapa 1 até o jogador voltar ao Guia.
                    p.tutorialStatusConcluido = true;
                    tutorialSalvar(p);
                    ws.send(JSON.stringify({
                        type: 'tutorial_estado',
                        tutorial: tutorialEstadoParaPlayer(p),
                        eventoTutorial: 'pontos_concluidos'
                    }));
                }

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

                // AFINIDADE/ATRIBUTOS HERDADOS: recalcula a vida do lacaio do summoner também
                const atributoHerdadoPet = (data.atributo === 'afinidade' || afinidadePets.ATRIBUTOS_HERDADOS.indexOf(data.atributo) !== -1);
                if (atributoHerdadoPet && lacaios[playerId]) {
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
                if (skillId === 'postura_guardiao') {
                    ws.send(JSON.stringify({ type: 'skill_erro', mensagem: 'Os efeitos desta habilidade são fixos.' }));
                    return;
                }

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

            // ===== ÁRVORE DE UPGRADES DE HABILIDADES (SUMMONER) =====
            if (data.action === 'comprar_upgrade_skill') {
                let p = players[playerId];
                if (!p) return;
                let skillId = String(data.skillId || '').trim();
                let tier = Number(data.tier);
                let branch = String(data.branch || '').toUpperCase().trim();

                if (!SkillUpgradeTree) {
                    ws.send(JSON.stringify({ type: 'skill_upgrade_tree_erro', mensagem: 'Sistema de upgrades indisponível.' }));
                    return;
                }

                let validacao = SkillUpgradeTree.validarCompraUpgrade(
                    p.classe,
                    skillId,
                    tier,
                    branch,
                    p.level || 1,
                    p.skillUpgrades || {}
                );

                if (!validacao.valido) {
                    ws.send(JSON.stringify({
                        type: 'skill_upgrade_tree_erro',
                        mensagem: validacao.motivo || 'Upgrade inválido.'
                    }));
                    return;
                }

                if (!p.skillUpgrades) p.skillUpgrades = {};
                SkillUpgradeTree.aplicarCompraUpgrade(p.skillUpgrades, skillId, tier, branch);

                salvarProgresso(userId, { skillUpgrades: p.skillUpgrades });

                let infoTreeCompra = SkillUpgradeTree.gerarVisaoCliente(p.skillUpgrades || {}, p.level || 1);
                ws.send(JSON.stringify({
                    type: 'skill_upgrade_tree_sucesso',
                    skillId: skillId,
                    tier: tier,
                    branch: branch,
                    nome: validacao.upgrade ? validacao.upgrade.nome : 'Novo Poder',
                    skillUpgrades: p.skillUpgrades,
                    characterLevel: p.level || 1,
                    pontosDisponiveis: infoTreeCompra ? infoTreeCompra.pontosDisponiveis : 0,
                    pontosGanhos: infoTreeCompra ? infoTreeCompra.pontosGanhos : 0
                }));

                // Se comprou upgrade do colossal tier 1 A, recalcular vida do pet imediatamente
                if (skillId === 'colossal' && tier === 1 && branch === 'A' && lacaios[playerId]) {
                    let novaVidaPet = calcularVidaPet(p);
                    lacaios[playerId].maxHp = novaVidaPet;
                    lacaios[playerId].hp = Math.min(lacaios[playerId].hp + Math.round(novaVidaPet * 0.25), novaVidaPet);
                }
                return;
            }

            if (data.action === 'resetar_upgrades_skills') {
                let p = players[playerId];
                if (!p) return;
                p.skillUpgrades = {};
                salvarProgresso(userId, { skillUpgrades: p.skillUpgrades });
                let infoTreeReset = SkillUpgradeTree.gerarVisaoCliente(p.skillUpgrades || {}, p.level || 1);
                ws.send(JSON.stringify({
                    type: 'skill_upgrades_tree_reset_sucesso',
                    skillUpgrades: p.skillUpgrades,
                    characterLevel: p.level || 1,
                    pontosDisponiveis: infoTreeReset ? infoTreeReset.pontosDisponiveis : 0,
                    pontosGanhos: infoTreeReset ? infoTreeReset.pontosGanhos : 0
                }));
                // Recalcular vida do pet se tiver pet ativo
                if (lacaios[playerId]) {
                    let novaVidaPet = calcularVidaPet(p);
                    lacaios[playerId].maxHp = novaVidaPet;
                    if (lacaios[playerId].hp > novaVidaPet) lacaios[playerId].hp = novaVidaPet;
                }
                return;
            }

            if (data.action === 'pet_capture') {
                const owner = players[playerId];
                const targetId = typeof data.targetId === 'string' ? data.targetId : '';
                const monster = slimes.find(function (candidate) {
                    return candidate && candidate.id === targetId;
                });
                if (!owner || owner.hp <= 0 || !monster || monster.captureConsumed ||
                    !instanciaCompativel(owner, monster) ||
                    entidadeEhSolari(owner) !== entidadeEhSolari(monster)) {
                    ws.send(JSON.stringify({ type: 'pet_capture_result', success: false, reason: 'target_invalid' }));
                    return;
                }
                const result = petSystem.createPetCaptureResult({
                    player: Object.assign({ id: playerId }, owner),
                    monster: Object.assign({}, monster, { species_id: monster.tipo }),
                    profile: owner.petProfile,
                    sourceX: owner.x + PLAYER_OFFSET_X,
                    sourceY: owner.y + PLAYER_OFFSET_Y,
                    targetX: monster.x,
                    targetY: monster.y
                });
                if (!result.valid) {
                    ws.send(JSON.stringify({ type: 'pet_capture_result', success: false, reason: result.reason }));
                    return;
                }
                owner.petProfile = result.profile;
                if (result.success) {
                    owner.petProfile = petSystem.registerAutoSpecies(
                        result.pet.species_id,
                        owner.petProfile
                    ).profile;
                    monster.captureConsumed = true;
                    monster.hp = 0;
                    monster.targetId = null;
                    monster.ataqueTelegraph = null;
                    const entry = petSystem.registerBestiarySpecies(owner.petProfile.bestiario, result.pet.species_id);
                    entry.capturas = Number(entry.capturas || 0) + 1;
                    entry.maiorLevelPet = Math.max(Number(entry.maiorLevelPet || 0), Number(result.pet.level) || 1);
                    entry.skillsConhecidas = Array.from(new Set((entry.skillsConhecidas || []).concat(result.pet.skills || [])));
                    if (!owner.petActiveId) {
                        owner.petActiveId = result.pet.pet_instance_id;
                        spawnPetRuntime(playerId, result.pet);
                    }
                }
                salvarProgresso(userId, {
                    pets: owner.petProfile.pets,
                    bestiario: owner.petProfile.bestiario,
                    maestria: owner.petProfile.maestria,
                    captureState: owner.petProfile.captureState,
                    petActiveId: owner.petActiveId
                });
                ws.send(JSON.stringify({
                    type: 'pet_capture_result',
                    success: result.success,
                    reason: result.reason,
                    chance: result.chance,
                    pet: result.success ? result.pet : null,
                    petProfile: petProfileForClient(owner)
                }));
                return;
            }

            if (data.action === 'pet_set_mode') {
                const owner = players[playerId];
                const runtime = owner && petRuntimeDoId(owner.petActiveId);
                const requestedMode = String(data.mode || '').trim().toUpperCase();
                const now = Date.now();
                if (!owner || owner.hp <= 0 || !runtime || runtime.owner_id !== playerId ||
                    runtime.hp <= 0 || runtime.state === petAi.PET_STATES.DEAD ||
                    runtime.state === petAi.PET_STATES.RESPAWN ||
                    !['ATK', 'DEFESA', 'PARADO'].includes(requestedMode) ||
                    now - (runtime.modeChangedAt || 0) < 500) {
                    ws.send(JSON.stringify({
                        type: 'pet_mode_result',
                        success: false,
                        mode: runtime ? runtime.mode : null,
                        petInstanceId: runtime ? runtime.pet_instance_id : null
                    }));
                    return;
                }
                runtime.mode = requestedMode;
                runtime.modeChangedAt = now;
                runtime.targetId = null;
                runtime.state = requestedMode === 'PARADO' ? petAi.PET_STATES.IDLE : petAi.PET_STATES.FOLLOW;
                syncPetRuntimeToProfile(runtime);
                salvarProgresso(userId, {
                    pets: owner.petProfile.pets,
                    petActiveId: owner.petActiveId
                });
                ws.send(JSON.stringify({
                    type: 'pet_mode_result',
                    success: true,
                    mode: runtime.mode,
                    petInstanceId: runtime.pet_instance_id
                }));
                return;
            }

            // Respawn tem prioridade sobre a janela de transicao do teleporte:
            // morrer e renascer deve sempre devolver o jogador para a cidade.
            if (data.action === 'respawn' && players[playerId]) {
                // Anti-hack: só renasce se estiver MORTO. Sem esta guarda o
                // jogador enviava {action:'respawn'} a qualquer momento e o
                // servidor curava HP/MP/estamina, zerava todo CC/buff e ainda
                // persistia o HP novo em jogadores.json (botão de fuga/reset
                // infinito, inclusive no meio de uma briga).
                if (players[playerId].hp > 0) return;
                // Arena de Solari: renascer (botão) = sair da partida e voltar pra cidade
                if (solariEmSessao(playerId)) solariRemoverMembro(playerId, 'respawn');
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
                ws.send(JSON.stringify({ type: 'respawn_confirmado', mapa: 'mundo', x: players[playerId].x, y: players[playerId].y }));
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
                // SNIPER: tentar mover cancela a Posição de Franco-Atirador.
                // O próprio pacote de movimento que cancelou a posição pode
                // continuar, então o jogador volta a andar imediatamente.
                if (podeMover && players[playerId].snPosicao) {
                    const mxTentativa = data.x !== undefined ? Number(data.x) : players[playerId].x;
                    const myTentativa = data.y !== undefined ? Number(data.y) : players[playerId].y;
                    if (Number.isFinite(mxTentativa) && Number.isFinite(myTentativa) &&
                        Math.hypot(mxTentativa - players[playerId].x, myTentativa - players[playerId].y) > 0.5) {
                        players[playerId].snPosicao = false;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: false, motivo: 'movimento' }));
                            }
                        });
                    }
                }
                // Enquanto a mira do Disparo Supremo estiver ativa, movimento continua bloqueado.
                if (podeMover && players[playerId].snAim) {
                    podeMover = false;
                }
                if (podeMover && players[playerId].canalizandoMeteoro) {
                    podeMover = false;
                }
                if (efeitos && podeMover) {
                    podeMover = !efeitos.temEfeito(players[playerId], 'paralisia') && !efeitos.temEfeito(players[playerId], 'sono') && !efeitos.temEfeito(players[playerId], 'rede');
                }
                if (podeMover) {
                    const targetX = data.x !== undefined ? Number(data.x) : players[playerId].x;
                    const targetY = data.y !== undefined ? Number(data.y) : players[playerId].y;
                    const movimentoLimitado = limitarMovimentoRecebido(players[playerId], targetX, targetY, agora);
                    // GUARDA DO DASH: pacote que apontou para a posição antiga
                    // durante um dash autorizado é descartado. Todo o resto do
                    // caminho (validarMovimentoJogador, colisão, `moving`) fica
                    // exatamente como estava.
                    if (!dashMovimentoObsoleto(players[playerId], movimentoLimitado.x, movimentoLimitado.y)) {
                        const movimento = validarMovimentoJogador(players[playerId], movimentoLimitado.x, movimentoLimitado.y, { maxDistance: movimentoLimitado.permitido });
                        if (movimento.aceito || movimento.parcial) {
                            const dxAceito = movimento.x - players[playerId].x;
                            const dyAceito = movimento.y - players[playerId].y;
                            players[playerId].movimentoBudget = Math.max(0, players[playerId].movimentoBudget - Math.hypot(dxAceito, dyAceito));
                            players[playerId].x = movimento.x;
                            players[playerId].y = movimento.y;
                        }
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
                    // O cliente NUNCA envia esta mensagem (verificado em index.html
                    // e em todos os .js do cliente). Ela existia só para gravar
                    // posição, mas aceitava level/xp CRU do cliente — um jogador
                    // com devtools podia mandar level/xp de qualquer valor e o
                    // servidor gravava em jogadores.json (vindo a ser XP falsa
                    // que o loop de level-up converte em pontos de atributo/skill).
                    // AGORA: level/xp NUNCA vêm do cliente. Só a posição e o
                    // status que o SERVIDOR já calculou são persistidos.
                    salvarProgresso(userId, {
                        x: Math.round(players[playerId].x),
                        y: Math.round(players[playerId].y)
                    });
                }

                // ===== ADMIN CHEATS: BYPASS COOLDOWNS & RECURSOS =====
                if (players[playerId] && players[playerId].adminCheats) {
                    let pAc = players[playerId];
                    if (pAc.adminCheats.semCooldown) {
                        pAc.lastEscudo = 0; pAc.lastBola = 0; pAc.lastGolemSismico = 0; pAc.lastSaltoChuva = 0;
                        pAc.lastCantico = 0; pAc.lastVinculo = 0; pAc.lastBuraco = 0; pAc.lastProvocacao = 0;
                        pAc.lastVulcao = 0; pAc.lastDash = 0; pAc.lastTornado = 0; pAc.lastFuria = 0;
                        pAc.lastEsmagamento = 0; pAc.lastGiro = 0; pAc.lastCura = 0; pAc.lastJulgamento = 0;
                        pAc.lastAura = 0; pAc.lastRiff = 0; pAc.lastBateria = 0; pAc.lastTeleporte = 0;
                        pAc.lastMeteoro = 0; pAc.lastNevasca = 0; pAc.lastChuva = 0;
                        pAc.lastPerfurante = 0; pAc.lastRajada = 0;
                        pAc.lastGrito = 0; pAc.lastDanca = 0; pAc.lastBomba = 0; pAc.lastCamuflagem = 0;
                        pAc.lastEstrela = 0; pAc.lastSupressao = 0; pAc.lastAssalto = 0; pAc.lastCaixa = 0;
                        pAc.lastTita = 0; pAc.lastCometas = 0; pAc.lastOrbe = 0; pAc.lastCascata = 0;
                        pAc.lastApontar = 0; pAc.lastRede = 0; pAc.lastPosicao = 0;
                        pAc.ladinoCamuflagemCooldown = 0; pAc.giroDescontroladoCooldown = 0;
                        pAc.snAimCooldown = 0; pAc.snRedeCooldown = 0;
                        pAc.pikemanGiroCd = 0; pAc.pikemanPiruetaCd = 0; pAc.pikemanGeadaCd = 0; pAc.pikemanExecucaoCd = 0;
                        pAc.lastFlorimSemente = 0; pAc.lastFlorimArvore = 0; pAc.lastFlorimEspinhos = 0; pAc.lastFlorimParede = 0;
                        pAc.estamina = 100;
                    }
                    if (pAc.adminCheats.manaInfinita) {
                        pAc.mana = pAc.maxMp || 100;
                    }
                    if (pAc.adminCheats.vidaInfinita) {
                        pAc.hp = pAc.maxHp || 100;
                    }
                }
                // ===== FIM ADMIN CHEATS BYPASS =====

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
                    'ataque_sniper', 'sniper_apontar', 'sniper_fogo', 'sniper_rede', 'sniper_camuflagem', 'sniper_posicao',
                    'ataque_pikeman', 'pikeman_giro', 'pikeman_pirueta', 'pikeman_geada', 'pikeman_execucao', 'ataque_florim', 'florim_arvore', 'florim_semente', 'florim_espinhos', 'florim_parede',
                    'ataque_kaledron', 'kaledron_golpe_fulminante', 'kaledron_impacto_terrestre', 'kaledron_redemoinho', 'kaledron_brado_guerra'
                ];
                if (ccAtivo && acoesBloqueadasPorCC.indexOf(data.action) !== -1) {
                    return; // Bloqueado por CC
                }

                // ===== DASH v2 — GUERREIRO COM ESCUDO ERGUIDO =====
                // Enquanto o escudo está segurado, skills e ataque básico são
                // BLOQUEADOS NO SERVIDOR (o cliente também bloqueia, mas quem
                // decide é o servidor — um client modificado não ganha nada).
                // O `dash` com acao:'soltar' passa: é justamente o gesto de
                // baixar o escudo. Também passam movimento/salvar/estado.
                if (players[playerId] && players[playerId].dashBloqueiaAcoes) {
                    const eEscudo = (data.action === 'dash' && data.acao === 'soltar');
                    // ATENCAO: o pacote de MOVIMENTO do cliente nao tem `action`
                    // (e so {x, y, angulo, moving}). Sem tratar o undefined aqui
                    // o servidor descartava TODO movimento enquanto o escudo
                    // estava erguido — o guerreiro ficava congelado no lugar.
                    const eMovimento = (data.action === undefined && data.x !== undefined);
                    const eLivre = eMovimento ||
                        ['movimento', 'salvar_progresso', 'client_estado', 'dash', 'usar_item', 'abrir_inventario', 'fechar_inventario', 'chat', 'abrir_loja'].indexOf(data.action) !== -1;
                    if (!eEscudo && !eLivre) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'dash_bloqueado', motivo: 'escudo_erguido' }));
                        }
                        return;
                    }
                }
                if (players[playerId] && players[playerId].saltoChuvaEmAndamento) {
                    const acaoArqueira = typeof data.action === 'string' &&
                        (data.action === 'dash' || data.action.startsWith('ataque_arqueiro') || data.action.startsWith('arqueiro_'));
                    if (acaoArqueira && data.action !== 'arqueiro_salto_chuva_shoot') {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'acao_bloqueada_salto_arqueiro', action: data.action }));
                        }
                        return;
                    }
                }
                // PIKEMAN — EXECUÇÃO DA MORTE: durante o carregamento, ações de ataque são bloqueadas
                if (pikemanCanais[playerId] && data.action !== 'pikeman_execucao_cancelar' && data.action !== 'client_estado' && data.action !== 'movimento' && data.action !== 'salvar_progresso') {
                    let acoesDuranteExecucao = ['ataque_pikeman', 'pikeman_giro', 'pikeman_pirueta', 'pikeman_geada', 'ataque_barbaro', 'ataque_roqueiro', 'ataque_mago', 'ataque_summoner', 'ataque_arqueiro', 'ataque_curandeiro', 'corte', 'dash', 'tornado', 'arqueiro_chuva', 'arqueiro_rajada', 'mago_vulcao', 'ladino_danca', 'barbaro_furia', 'barbaro_esmagamento'];
                    if (acoesDuranteExecucao.indexOf(data.action) !== -1) return;
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
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, players[playerId], data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return; // ataque básico exige exatamente um alvo válido

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let anguloMachado = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_machadada', id: playerId, x: pX, y: pY }));
                        }
                    });

                    let danoMachado = dmgSkill(players[playerId], 'machadada', DANO_BASE_ATAQUE_BASICO.melee);
                    const acertouAlvo = aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoMachado, 'físico');
                    if (acertouAlvo && players[playerId].furiaTimer > 0) aplicarCuraAoJogador(playerId, 8);
                }

                // HABILIDADE 1 DO BÁRBARO: FÚRIA BERSERKER (6s de buff de vampirismo, CD 15s)
                if (data.action === 'barbaro_furia') {
                    if (players[playerId].furiaCooldown && Date.now() < players[playerId].furiaCooldown) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'furia', 20))) return;
                    players[playerId].furiaCooldown = Date.now() + 15000;
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
                        alvoEsmagamentoY - PLAYER_OFFSET_Y,
                        mapaPorCoordenada(players[playerId].x + PLAYER_OFFSET_X)
                    );
                    if (!destinoEsmagamento.aceito) return;
                    if (!cdSkillExpirado(ws, players[playerId], 'lastEsmagamento', 5500, 'barbaro_esmagamento')) return; // CD 6s no cliente / margem server -500ms
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'esmagamento-barbaro', 25))) return;
                    marcarSkillUsada(players[playerId], 'lastEsmagamento');
                    players[playerId].x = destinoEsmagamento.x;
                    players[playerId].y = destinoEsmagamento.y;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_esmagamento', id: playerId, x: players[playerId].x + PLAYER_OFFSET_X, y: players[playerId].y + PLAYER_OFFSET_Y }));
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

                // HABILIDADE 3 DO BÁRBARO: GIRO DESCONTROLADO (4s de dano em área + sangramento + redução 10%, CD 15s)
                if (data.action === 'barbaro_giro_descontrolado') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if (p.giroDescontroladoTimer > 0 || p.giroDescontroladoCooldown > 0) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'giro_descontrolado', 30))) return;

                    const duracaoGiroMs = 4000;
                    p.giroDescontroladoTimer = Math.ceil(duracaoGiroMs / 50);
                    p.giroDescontroladoExpiresAt = Date.now() + duracaoGiroMs;
                    p.giroDescontroladoAtivo = true;
                    p.giroDescontroladoCooldown = 300; // 15s de cooldown
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_barbaro_giro_start', id: playerId, x: p.x + 12, y: p.y + 16, duracaoMs: duracaoGiroMs }));
                        }
                    });
                }

                // ROQUEIRO: RIFF DE GUITARRA (Ataque básico)
                if (data.action === 'ataque_roqueiro') {
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, players[playerId], data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;
                    players[playerId].lastBasicAttack = agora;

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let ang = (data.angulo !== undefined) ? data.angulo : players[playerId].angulo;
                    if (alvoAuto) ang = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX); // mira o alvo validado

                    const ownerInSolari = !!solariSessaoDoJogador(playerId);
                    playerProjeteis.push({
                        ownerId: playerId,
                        x: pX,
                        y: pY,
                        vx: Math.cos(ang) * 12.0,
                        vy: Math.sin(ang) * 12.0,
                        dano: dmgSkill(players[playerId], 'riff', DANO_BASE_ATAQUE_BASICO.magic),
                        vida: 55,
                        perfurante: false,
                        tipo: 'riff',
                        origemBasica: true,
                        alvoTipo: data.alvoTipo,
                        alvoId: data.alvoId,
                        solari: ownerInSolari
                    });

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_riff', id: playerId }));
                        }
                    });
                }

                // ROQUEIRO: BATERIA SOLO (Canal infinito até acabar mana, dano em área repetido)
                if (data.action === 'roqueiro_bateria') {
                    if (players[playerId].bateriaCooldown && Date.now() < players[playerId].bateriaCooldown) return;

                    if (bateriaCanal[playerId]) {
                        // Clicar novamente cancela o uso contínuo da bateria
                        delete bateriaCanal[playerId];
                        enviarParaMapaDoJogador(playerId, 'action_roqueiro_bateria_end', { id: playerId });
                        return;
                    }

                    if (players[playerId].maxMp > 0 && players[playerId].mana <= players[playerId].maxMp * 0.1) return;
                    
                    bateriaCanal[playerId] = { 
                        tickAtivo: 0, 
                        beat: 0, 
                        startX: players[playerId].x, 
                        startY: players[playerId].y, 
                        danoBateria: dmgSkill(players[playerId], 'bateria', 21),
                        stunsAplicados: {}
                    };

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    enviarParaMapaDoJogador(playerId, 'action_roqueiro_bateria', { id: playerId, x: pX, y: pY, start: true });
                }

                if (data.action === 'roqueiro_bateria_cancelar') {
                    if (bateriaCanal[playerId]) {
                        delete bateriaCanal[playerId];
                        enviarParaMapaDoJogador(playerId, 'action_roqueiro_bateria_end', { id: playerId });
                    }
                }

                // ROQUEIRO: STAGE DIVE (Teletransporte direcionado — NÃO cancela o uso contínuo da Bateria)
                if (data.action === 'roqueiro_teleporte') {
                    const tx = Number(data.targetX);
                    const ty = Number(data.targetY);
                    const destinoTeleporte = validarDestinoJogador(
                        tx - PLAYER_OFFSET_X,
                        ty - PLAYER_OFFSET_Y,
                        mapaPorCoordenada(players[playerId].x + PLAYER_OFFSET_X)
                    );
                    if (!destinoTeleporte.aceito) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'teleporte', 15))) return;
                    players[playerId].x = destinoTeleporte.x;
                    players[playerId].y = destinoTeleporte.y;

                    // Se a Bateria estiver ativa, atualiza a posição de origem para que NÃO cancele a Bateria
                    if (bateriaCanal[playerId]) {
                        bateriaCanal[playerId].startX = destinoTeleporte.x;
                        bateriaCanal[playerId].startY = destinoTeleporte.y;
                    }

                    enviarParaMapaDoJogador(playerId, 'action_roqueiro_teleporte', { id: playerId, x: players[playerId].x, y: players[playerId].y });
                }

                // ROQUEIRO: CHAMAR A BANDA (1 membro que segue e ataca durante 15s)
                if (data.action === 'roqueiro_banda') {
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'banda', 30))) return;
                    if (!bandas[playerId]) bandas[playerId] = { membros: [] };
                    let banda = bandas[playerId];
                    banda.expiraEm = agora + 15000;
                    banda.membros = [];
                    let angBanda = Math.random() * Math.PI * 2;
                    banda.membros.push({
                        x: players[playerId].x + Math.cos(angBanda) * 40,
                        y: players[playerId].y + Math.sin(angBanda) * 40,
                        angulo: 0,
                        attackCooldown: 0
                    });

                    enviarParaMapaDoJogador(playerId, 'action_roqueiro_banda', { id: playerId });
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
                    enviarParaMapaDoJogador(playerId, 'action_roqueiro_grito_guerra', { id: playerId, x: p.x + 12, y: p.y + 16, raio: raio, alvos: alvos });
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
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, pA, data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;

                    let pX = pA.x + 12;
                    let pY = pA.y + 16;
                    let anguloAdaga = alvoAuto ? Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX) : ((data.angulo !== undefined) ? data.angulo : pA.angulo);

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_ladino_golpe', id: playerId, x: pX, y: pY, angulo: anguloAdaga }));
                        }
                    });

                    let danoAdaga = dmgSkill(pA, 'adaga', DANO_BASE_ATAQUE_BASICO.melee);
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoAdaga, 'físico');
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
                    if (pD.dmAssaltoTimer > 0) return; // durante o Assalto o Drone é o mini robô (sem tiro básico)
                    if (pD.dmTitaAtivo) {
                        // Forma Robô: ataque à distância tecnológico (mesmo handler, outro dano)
                        if (Date.now() - pD.lastBasicAttack < tempoAtaqueBasico(pD, 416)) return;
                        pD.lastBasicAttack = Date.now();
                        let alvoAutoR = validarAtaqueBasicoAlvo(playerId, pD, data.alvoTipo, data.alvoId);
                        if (!alvoAutoR) return;
                        let pXR = pD.x + PLAYER_OFFSET_X, pYR = pD.y + PLAYER_OFFSET_Y;
                        let angR = Math.atan2(alvoAutoR.y - pYR, alvoAutoR.x - pXR);
                        let danoR = danoBasicoRobo(pD);
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_dm_tiro_tita', id: playerId, x: pD.x + PLAYER_OFFSET_X, y: pD.y + PLAYER_OFFSET_Y, ang: angR, alvoX: alvoAutoR.x, alvoY: alvoAutoR.y }));
                            }
                        });
                        aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoR, 'físico');
                        return;
                    }
                    // Drone normal: tiro à distância do Drone (range 90)
                    if (Date.now() - pD.lastBasicAttack < tempoAtaqueBasico(pD, 560)) return;
                    pD.lastBasicAttack = Date.now();
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, pD, data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;
                    let pX = pD.dmDroneX !== undefined ? pD.dmDroneX : (pD.x + PLAYER_OFFSET_X + 30);
                    let pY = pD.dmDroneY !== undefined ? pD.dmDroneY : (pD.y + PLAYER_OFFSET_Y - 14);
                    let angulo = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);
                    let danoDrone = danoBasicoDrone(pD);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_dm_tiro', id: playerId, droneX: pD.dmDroneX, droneY: pD.dmDroneY, x: pD.x + PLAYER_OFFSET_X, y: pD.y + PLAYER_OFFSET_Y, ang: angulo, alvoX: alvoAuto.x, alvoY: alvoAuto.y }));
                        }
                    });
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoDrone, 'físico');
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
                    pA.dmAssaltoCooldown = Date.now() + 15000;
                    pA.dmAssaltoTimer = 160; // 8s de transformação (160 ticks * 50ms = 8000ms)
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
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, pA, data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;
                    let pX = pA.x + PLAYER_OFFSET_X, pY = pA.y + PLAYER_OFFSET_Y;
                    let angulo = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);
                    let danoFlecha = dmgSkill(pA, 'flecha_arcana', DANO_BASE_ATAQUE_BASICO.magic);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arcano_flecha', id: playerId, x: pX, y: pY, ang: angulo, alvoX: alvoAuto.x, alvoY: alvoAuto.y }));
                        }
                    });
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoFlecha, 'mágico');
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
                    // Camuflado: disparar quebra a camuflagem
                    if (pS.snCamuflado) finalizarCamuflagemSniper(pS, playerId, 'tiro');
                    if (pS.snAim) return; // não atira básico enquanto mira o super tiro
                    if (Date.now() - pS.lastBasicAttack < tempoAtaqueBasico(pS, 936)) return;
                    pS.lastBasicAttack = Date.now();
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, pS, data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;
                    let pX = pS.x + PLAYER_OFFSET_X, pY = pS.y + PLAYER_OFFSET_Y;
                    let angulo = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);
                    let danoBarrett = dmgSkill(pS, 'tiro_barrett', DANO_BASE_ATAQUE_BASICO.physicalRanged);
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_tiro', id: playerId, x: pX, y: pY, ang: angulo, alvoX: alvoAuto.x, alvoY: alvoAuto.y, noMato: pS.snCamuflado }));
                        }
                    });
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoBarrett, 'físico');
                }

                // ---- SNIPER SKILL 1: DISPARO SUPREMO — APONTAR (estado AIMING, 3s) ----
                if (data.action === 'sniper_apontar') {
                    let pA = players[playerId];
                    if (!pA || pA.hp <= 0) return;
                    if (pA.snAim || Date.now() - pA.snAimCooldown < 0) return;
                    // Deitado (Posição de Franco-Atirador): mira sem sair da posição
                    if (!gastarMana(ws, pA, mpSkill(pA, 'disparo_supremo', 30))) return;
                    // Usar qualquer habilidade cancela a Posição de Franco-Atirador.
                    // O ataque básico é a exceção: ele continua usando a posição.
                    if (pA.snPosicao) {
                        pA.snPosicao = false;
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: false, motivo: 'habilidade' }));
                            }
                        });
                    }
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
                    let danoFinal = Math.round(dmgSkill(pF, 'disparo_supremo', 54) * 3); // 3x dano (base 54, +20%)
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
                    // PvP: concorre na mesma seleção de "1 inimigo" (PvP ligado, mesmo mapa,
                    // até 700px do atirador e a 42px do ponto mirado).
                    let pvpAlvo = null;
                    if (!alvoF && !bossAlvo) {
                        for (let outro in players) {
                            if (!pvpPodeAtacar(playerId, outro)) continue;
                            const p2 = players[outro];
                            let dist = Math.hypot(p2.x - fx0, p2.y - fy0);
                            if (dist > 700) continue;
                            let dp = Math.hypot(p2.x - tpX, p2.y - tpY);
                            if (dp <= 42) { if (!pvpAlvo || dp < pvpAlvo.dp) pvpAlvo = { id: outro, dp: dp, x: p2.x, y: p2.y }; }
                        }
                    }
                    const tx = alvoF ? alvoF.s.x : (bossAlvo ? bossAlvo.b.x : (pvpAlvo ? pvpAlvo.x : Math.round(tpX)));
                    const ty = alvoF ? alvoF.s.y : (bossAlvo ? bossAlvo.b.y : (pvpAlvo ? pvpAlvo.y : Math.round(tpY)));
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_super_tiro', id: playerId, x: fx0, y: fy0, tx: tx, ty: ty }));
                        }
                    });
                    if (alvoF) registrarDanoMonstro(alvoF.s, playerId, danoFinal, 'player');
                    if (bossAlvo) registrarDanoBoss(bossAlvo.b, playerId, danoFinal, 'skill', 'player');
                    if (pvpAlvo) aplicarDanoPvP(playerId, pvpAlvo.id, danoFinal, 'disparo_supremo');
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
                        if (!alvoRede && s.hp > 0 && instanciaCompativel(pR, s) && Math.hypot(s.x - rx, s.y - ry) <= 60) { alvoRede = { tipo: 'slime', ent: s }; }
                    }
                    if (!alvoRede) {
                        for (let b of bosses) {
                            if (!alvoRede && b.hp > 0 && instanciaCompativel(pR, b) && Math.hypot(b.x - rx, b.y - ry) <= 60) { alvoRede = { tipo: 'boss', ent: b }; }
                        }
                    }
                    // PvP: rede também prende jogadores
                    let alvoJogadorRede = null;
                    if (pR.pvpAtivo && !alvoRede) {
                        for (let pId in players) {
                            if (pId === playerId) continue;
                            let p2 = players[pId];
                            if (pvpPodeAtacar(playerId, pId) && instanciaCompativel(pR, p2) &&
                                Math.hypot((p2.x + PLAYER_OFFSET_X) - rx, (p2.y + PLAYER_OFFSET_Y) - ry) <= 60) { alvoJogadorRede = p2; break; }
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

                // ---- SNIPER SKILL 3: CAMUFLAGEM NATURAL (exige a ROUPA do dash + estar no mato) ----
                if (data.action === 'sniper_camuflagem') {
                    let pC = players[playerId];
                    if (!pC || pC.hp <= 0) return;
                    if (pC.snCamuflado) return;
                    // v1.50.0: o DASH (ESPAÇO) é o que veste o uniforme por 5s.
                    // A Camuflagem Natural só LIGA enquanto ele estiver vestido.
                    if (!pC.snRoupaCamo) {
                        ws.send(JSON.stringify({ type: 'skill_aviso', skill: 'sniper_camuflagem', motivo: 'sem_roupa' }));
                        return;
                    }
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
                    // Agora sim: escondido no mato. A camuflagem NUNCA passa da
                    // roupa (o uniforme é o prazo do dash: 5s, e acabou). Se o
                    // jogador usar a skill quase no fim, ela dá o que sobrou.
                    const restante = Math.max(500, (pC.snRoupaCamoAte || 0) - Date.now());
                    pC.snCamuflado = true;
                    pC.snCamofladoAte = Date.now() + restante;
                    efeitos.aplicarEfeito(pC, 'camuflagem', Math.ceil(restante / 50), 1);
                    pC.snAimCooldown = 0; // RESET do cooldown da Skill 1 (Disparo Supremo)
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_sniper_camuflagem', id: playerId,
                                origem: 'skill', expiraEm: pC.snCamofladoAte
                            }));
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
                    pP.snAimCooldown = 0; // Reset imediato do CD do Disparo Supremo
                    if (pP.snCamuflado) finalizarCamuflagemSniper(pP, playerId, 'skill');
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_sniper_posicao', id: playerId, ativo: true, resetCdDisparo: true }));
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
    iniciarDash(playerId, ws, data);
}


                if (data.action === 'tornado') {
                    let pTornado = players[playerId];
                    if (!pTornado || pTornado.hp <= 0) return;
                    if (!cdSkillExpirado(ws, pTornado, 'lastTornado', 4500, 'tornado')) return;
                    if (!gastarMana(ws, pTornado, mpSkill(pTornado, 'tornado', 20))) return;
                    marcarSkillUsada(pTornado, 'lastTornado');

                    // Upgrades do Guerreiro - Tornado
                    const upgTornado = pTornado.skillUpgrades || {};
                    const has1A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 1, 'A')); // Vórtice Cortante (+40% dano + bleed)
                    const has1B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 1, 'B')); // Vórtice Protetor (-40% dano sofrido por 800ms)
                    const has2A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 2, 'A')); // Lâminas Dilacerantes (4 lâminas em cruz)
                    const has2B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 2, 'B')); // Ciclone Gravitacional (puxão + slow)
                    const has3A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 3, 'A')); // Ímpeto da Tempestade (+50% move speed + 4º pulso crítico)
                    const has3B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 3, 'B')); // Barricada de Vento (barreira por hit)
                    const has4A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 4, 'A')); // Cataclismo de Lâminas (+60% raio, +100% dano, detonação)
                    const has4B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgTornado, 'tornado', 4, 'B')); // Olho do Furacão (stun 1.8s + cura 15% HP)

                    if (has1B) {
                        pTornado.vorticeProtetorAte = Date.now() + 800;
                    }
                    if (has3A) {
                        pTornado.impetoTempestadeAte = Date.now() + 800;
                    }

                    let pX = pTornado.x + 12;
                    let pY = pTornado.y + 16;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_tornado',
                                id: playerId,
                                x: pX,
                                y: pY,
                                upgrades: {
                                    cortante: has1A,
                                    protetor: has1B,
                                    laminas: has2A,
                                    gravitacional: has2B,
                                    impeto: has3A,
                                    barricada: has3B,
                                    cataclismo: has4A,
                                    furacao: has4B
                                }
                            }));
                        }
                    });

                    // 2A: Lâminas Dilacerantes em cruz
                    if (has2A) {
                        const direcoes = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
                        direcoes.forEach(ang => {
                            for (let step = 40; step <= 180; step += 35) {
                                const lx = pX + Math.cos(ang) * step;
                                const ly = pY + Math.sin(ang) * step;
                                slimes.forEach(slime => {
                                    if (slime.hp > 0 && Math.hypot(lx - slime.x, ly - slime.y) < 35) {
                                        registrarDanoMonstro(slime, playerId, 35, 'player');
                                    }
                                });
                                danoEmBosses(lx, ly, 40, playerId, 35, 'skill', 'player');
                            }
                        });
                    }

                    // 2B: Ciclone Gravitacional (Puxa inimigos em raio 160px para o centro e aplica lentidão)
                    if (has2B) {
                        slimes.forEach(slime => {
                            if (slime.hp > 0 && Math.hypot(pX - slime.x, pY - slime.y) < 160) {
                                const angPuxao = Math.atan2(pY - slime.y, pX - slime.x);
                                moverMonstroDirecionalComDesvio(slime, Math.cos(angPuxao), Math.sin(angPuxao), 35);
                                slime.slowTimer = 60; // 3s de slow
                            }
                        });
                    }

                    let danoTornadoTotal = dmgSkill(pTornado, 'tornado', 25);
                    if (has1A) danoTornadoTotal = Math.round(danoTornadoTotal * 1.40);
                    if (has4A) danoTornadoTotal = Math.round(danoTornadoTotal * 2.00);

                    const numPulsos = has3A ? 4 : 3;
                    const raioHit = has4A ? 160 : 100;
                    let danoTornadoBase = Math.floor(danoTornadoTotal / numPulsos);
                    let inimigosAtingidosBarricada = 0;

                    for (let tick = 0; tick < numPulsos; tick++) {
                        setTimeout(function () {
                            let atacante = players[playerId];
                            if (!atacante || atacante.hp <= 0) return;
                            let danoTick = (tick === numPulsos - 1) ? (danoTornadoTotal - danoTornadoBase * (numPulsos - 1)) : danoTornadoBase;
                            // Se 3A (Ímpeto da Tempestade), o 4º pulso tem Acerto Crítico (1.5x)
                            if (has3A && tick === 3) {
                                danoTick = Math.round(danoTick * 1.5);
                            }
                            let centroX = atacante.x + 12;
                            let centroY = atacante.y + 16;
                            slimes.forEach(slime => {
                                if (slime.hp > 0 && Math.hypot(centroX - slime.x, centroY - slime.y) < raioHit) {
                                    registrarDanoMonstro(slime, playerId, danoTick, 'player');
                                    inimigosAtingidosBarricada++;
                                    // 1A: Sangramento lacerante
                                    if (has1A) {
                                        slime.sangramentoTimer = 80;
                                        slime.sangramentoDano = 7;
                                        slime.sangramentoOwner = playerId;
                                    }
                                }
                            });
                            danoEmBosses(centroX, centroY, raioHit + 5, playerId, danoTick, 'skill', 'player');

                            // 3B: Barricada de Vento (Gera barreira por monstro atingido)
                            if (has3B && inimigosAtingidosBarricada > 0) {
                                const maxBarr = Math.round(atacante.maxHp * 0.25);
                                const addBarr = Math.round(atacante.maxHp * 0.05) * Math.min(5, inimigosAtingidosBarricada);
                                atacante.barreiraVento = Math.min(maxBarr, (atacante.barreiraVento || 0) + addBarr);
                                atacante.barreiraVentoAte = Date.now() + 5000;
                            }
                        }, tick * 200);
                    }

                    // 4A: Cataclismo de Lâminas (Detonação final estilhaçante aos 750ms)
                    if (has4A) {
                        setTimeout(function () {
                            let atacante = players[playerId];
                            if (!atacante || atacante.hp <= 0) return;
                            let cx = atacante.x + 12, cy = atacante.y + 16;
                            slimes.forEach(slime => {
                                if (slime.hp > 0 && Math.hypot(cx - slime.x, cy - slime.y) < 160) {
                                    registrarDanoMonstro(slime, playerId, 55, 'player');
                                }
                            });
                            danoEmBosses(cx, cy, 165, playerId, 55, 'skill', 'player');
                        }, 750);
                    }

                    // 4B: Olho do Furacão (Stun coletivo de 1.8s e cura 15% HP)
                    if (has4B) {
                        setTimeout(function () {
                            let atacante = players[playerId];
                            if (!atacante || atacante.hp <= 0) return;
                            let cx = atacante.x + 12, cy = atacante.y + 16;
                            slimes.forEach(slime => {
                                if (slime.hp > 0 && Math.hypot(cx - slime.x, cy - slime.y) < 130) {
                                    slime.stunTimer = 36; // 1.8s
                                }
                            });
                            bosses.forEach(b => {
                                if (b.hp > 0 && Math.hypot(cx - b.x, cy - b.y) < 135) {
                                    b.stunTimer = 20; // 1s em bosses
                                }
                            });
                            let curaFuracao = Math.round(atacante.maxHp * 0.15);
                            aplicarCuraAoJogador(playerId, curaFuracao);
                        }, 750);
                    }
                }

                // HABILIDADE DO GUERREIRO: GRITO DE PROVOCAÇÃO
                // Cooldown: 15s. Cura 20% HP max. Taunt monstros (10s = 200 ticks), Taunt bosses (5s = 100 ticks).
                
                // --- NOVAS SKILLS ---
                if (data.action === 'guerreiro_escudo_lancamento') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0) return;
                    if(!p.lastEscudo) p.lastEscudo = 0;
                    if(Date.now() - p.lastEscudo < 9500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'escudo_lancamento', 15))) return;
                    p.lastEscudo = Date.now();
                    const escudoTX = Number(data.targetX), escudoTY = Number(data.targetY);
                    if (!Number.isFinite(escudoTX) || !Number.isFinite(escudoTY)) return;
                    let ang = Math.atan2(escudoTY - p.y, escudoTX - p.x);

                    // Upgrades do Guerreiro - Lançamento do Escudo
                    const upgEscudo = p.skillUpgrades || {};
                    const has1A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 1, 'A')); // Escudo Serrilhado (+35% dano + bleed)
                    const has1B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 1, 'B')); // Impacto Esmagador (Stun 2s)
                    const has2A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 2, 'A')); // Escudo Ricocheteador (ricochete 2 alvos)
                    const has2B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 2, 'B')); // Vórtice de Atração
                    const has3A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 3, 'A')); // Estilhaços Cortantes (6 estilhaços)
                    const has3B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 3, 'B')); // Escudo de Retorno (Barreira 15% HP)
                    const has4A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 4, 'A')); // Escudo Titânico (2x tam, +100% dano, perfura tudo)
                    const has4B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgEscudo, 'escudo_lancamento', 4, 'B')); // Muralha Protetora (zona de defesa 5s)

                    let danoEscudo = dmgSkill(p, 'escudo_lancamento', 45);
                    if (has1A) danoEscudo = Math.round(danoEscudo * 1.35);
                    if (has4A) danoEscudo = Math.round(danoEscudo * 2.00);

                    const maxDistEscudo = has4A ? 360 : 300;

                    escudosLancados.push({
                        id: Math.random(),
                        ownerId: playerId,
                        x: p.x,
                        y: p.y,
                        ang: ang,
                        speed: has4A ? 11 : 10,
                        dist: 0,
                        maxDist: maxDistEscudo,
                        dano: danoEscudo,
                        upgrades: {
                            serrilhado: has1A,
                            esmagador: has1B,
                            ricochete: has2A,
                            vortice: has2B,
                            estilhacos: has3A,
                            retorno: has3B,
                            titanico: has4A,
                            muralha: has4B
                        },
                        mobsAtingidos: []
                    });

                    wss.clients.forEach(c => {
                        if(c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({
                                type: 'action_guerreiro_escudo',
                                lancamento: true,
                                ownerId: playerId,
                                targetX: data.targetX,
                                targetY: data.targetY,
                                startX: p.x,
                                startY: p.y,
                                ang: ang,
                                maxDist: maxDistEscudo,
                                upgrades: {
                                    serrilhado: has1A,
                                    esmagador: has1B,
                                    ricochete: has2A,
                                    vortice: has2B,
                                    estilhacos: has3A,
                                    retorno: has3B,
                                    titanico: has4A,
                                    muralha: has4B
                                }
                            }));
                        }
                    });
                }
                if (data.action === 'mago_bola_elemental') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0) return;
                    if(!p.lastBola) p.lastBola = 0;
                    if(Date.now() - p.lastBola < 20000) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'bola_elemental', 30))) return;
                    p.lastBola = Date.now();

                    const bolaTX = Number(data.targetX), bolaTY = Number(data.targetY);
                    if (!Number.isFinite(bolaTX) || !Number.isFinite(bolaTY)) return;

                    const upgBola = p.skillUpgrades || {};
                    const hasBA1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 1, 'A')); // +25% tamanho, +30% velocidade, perfurante
                    const hasBA2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 2, 'A')); // Pulsos tri-elementais
                    const hasBA3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 3, 'A')); // Bolas gêmeas
                    const hasBA4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 4, 'A')); // Supernova 180px
                    const hasBB1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 1, 'B')); // Vórtice gravitacional
                    const hasBB2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 2, 'B')); // Bumerangue retorno + 15% MP / 10% HP
                    const hasBB3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 3, 'B')); // Barreira vanguarda (-35% dano)
                    const hasBB4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgBola, 'bola_elemental', 4, 'B')); // Singularidade do Vazio 6s

                    // Tier 3 B: Barreira Elemental de Vanguarda (-35% dano sofrido por 5s)
                    if (hasBB3) {
                        p.escudoVanguardaAte = Date.now() + 5000;
                    }

                    const angBase = Math.atan2(bolaTY - p.y, bolaTX - p.x);
                    const angulos = hasBA3 ? [angBase - 0.22, angBase + 0.22] : [angBase];
                    const speedBola = hasBA1 ? 15.6 : 12;
                    const danoBase = dmgSkill(p, 'bola_elemental', 60);

                    for (let ang of angulos) {
                        let novaBola = {
                            id: Math.random(),
                            ownerId: playerId,
                            x: p.x,
                            y: p.y,
                            startX: p.x,
                            startY: p.y,
                            ang: ang,
                            speed: speedBola,
                            dist: 0,
                            maxDist: 400,
                            dano: danoBase,
                            type: 'normal',
                            upgrades: {
                                perfurante: hasBA1,
                                pulsos: hasBA2,
                                supernova: hasBA4,
                                vortex: hasBB1,
                                bumerangue: hasBB2,
                                retornando: false,
                                singularidade: hasBB4
                            },
                            mobsAtingidos: []
                        };
                        bolasElementais.push(novaBola);

                        wss.clients.forEach(c => {
                            if(c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({
                                    type: 'action_mago_bola_elemental',
                                    ownerId: playerId, id: novaBola.id,
                                    x: p.x, y: p.y, targetX: data.targetX, targetY: data.targetY,
                                    speed: novaBola.speed, dist: 400
                                }));
                            }
                        });
                    }
                }
                                if (data.action === 'summoner_golem_sismico') {
                    let p = players[playerId];
                    let ogro = lacaios[playerId];
                    if(!p || p.hp <= 0 || !ogro || ogro.hp <= 0) return;
                    if(!p.lastGolemSismico) p.lastGolemSismico = 0;
                    if(data.cancelar) {
                        if(golemsSismicos[playerId]) {
                            golemsSismicos[playerId].cancelado = true;
                            if(ogro) ogro.isJumping = false;
                            wss.clients.forEach(c => { if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_summoner_golem_sismico_end', ownerId: playerId })); });
                        }
                        return;
                    }
                    if(Date.now() - p.lastGolemSismico < 29500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'sismico', 40))) return;
                    p.lastGolemSismico = Date.now();
                    ogro.isJumping = true; // Paralyze pet
                    golemsSismicos[playerId] = { active: true, startTime: Date.now(), nextPulse: Date.now() + 1000, pulses: 0, x: ogro.x, y: ogro.y };
                    wss.clients.forEach(c => {
                        if(c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({ type: 'action_summoner_golem_sismico', ownerId: playerId, x: ogro.x, y: ogro.y }));
                        }
                    });
                }
                if (data.action === 'arqueiro_salto_chuva') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0) return;
                    if(!p.lastSaltoChuva) p.lastSaltoChuva = 0;
                    if(Date.now() - p.lastSaltoChuva < 24500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'salto_chuva', 25))) return;
                    p.lastSaltoChuva = Date.now();
                    p.imune = true;
                    p.saltoChuvaAtivo = true;
                    p.saltoChuvaEmAndamento = true;
                    p.saltoChuvaExpires = Date.now() + 3000;
                    wss.clients.forEach(c => {
                        if(c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({ type: 'action_arqueiro_salto_chuva_up', ownerId: playerId }));
                        }
                    });
                }
                if (data.action === 'arqueiro_salto_chuva_shoot') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0 || !p.saltoChuvaAtivo) return;
                    p.saltoChuvaAtivo = false;
                    p.saltoChuvaEmAndamento = true;
                    p.imune = false;
                    chuvasFlechaNova.push({ x: data.targetX, y: data.targetY, ownerId: playerId, expires: Date.now() + 2000, nextTick: Date.now() + 100, ticks: 0 });
                    wss.clients.forEach(c => {
                        if(c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({ type: 'action_arqueiro_salto_chuva_shoot', ownerId: playerId, targetX: data.targetX, targetY: data.targetY }));
                        }
                    });
                    // Depois da chuva acabar (2.5s), mandar a arqueira descer e reativar tudo
                    setTimeout(() => {
                        if (p) p.saltoChuvaEmAndamento = false;
                        wss.clients.forEach(c => {
                            if(c.readyState === 1) c.send(JSON.stringify({ type: 'action_arqueiro_salto_chuva_down', ownerId: playerId }));
                        });
                    }, 2500);
                }
                
                // ===== FLORIM: ATAQUE BÁSICO E 4 SKILLS =====
                function florimPos(p) { return { x: p.x + PLAYER_OFFSET_X, y: p.y + PLAYER_OFFSET_Y }; }
                function florimMesmoEspaco(a, b) {
                    if (!a || !b) return false;
                    if (entidadeEhSolari(a) !== entidadeEhSolari(b)) return false;
                    if (entidadeEhSolari(a)) return true;
                    return mapaPorCoordenada(a.x) === mapaPorCoordenada(b.x);
                }
                function florimDistPonto(p, x, y) { const q = florimPos(p); return Math.hypot(q.x - x, q.y - y); }
                function florimId(prefixo) { return prefixo + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6); }
                function florimBroadcast(msg, origem) {
                    wss.clients.forEach(client => {
                        if (client.readyState !== WebSocket.OPEN) return;
                        if (!origem || !client._playerId || !players[client._playerId] || florimMesmoEspaco(players[client._playerId], origem)) client.send(JSON.stringify(msg));
                    });
                }
                function florimAlvoValido(atkId, alvoTipo, alvoId, alcance) {
                    const p = players[atkId];
                    const alvo = obterAlvoAtaqueServidor(alvoTipo, alvoId);
                    if (!p || !alvo || p.hp <= 0 || alvo.hp <= 0 || !florimMesmoEspaco(p, alvo)) return null;
                    if (alvoTipo === 'player' && !pvpPodeAtacar(atkId, alvoId)) return null;
                    const pp = florimPos(p);
                    if (Math.hypot(alvo.x - pp.x, alvo.y - pp.y) > alcance) return null;
                    return alvo;
                }

                if (data.action === 'ataque_florim') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimBasic', 550, 'ataque_florim')) return;
                    marcarSkillUsada(p, 'lastFlorimBasic');
                    let alvo = validarAtaqueBasicoAlvo(playerId, p, data.alvoTipo, data.alvoId);
                    if (!alvo) return;
                    const dano = dmgSkill(p, 'ataque_florim', DANO_BASE_ATAQUE_BASICO.magic);
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, dano, 'natureza');
                    florimBroadcast({ type: 'action_florim_basic', id: playerId, x: p.x + PLAYER_OFFSET_X, y: p.y + PLAYER_OFFSET_Y, angulo: Number(data.angulo) || p.angulo }, p);
                    return;
                }

                if (data.action === 'florim_arvore') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimArvore', 15000, 'florim_arvore')) return;
                    const custo = 25; if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_arvore'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimArvore');
                    const z = { id: florimId('tree'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 100, tempo: 160, curaBase: 30, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimArvores.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_arvore', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 8000 }, p);
                    return;
                }

                if (data.action === 'florim_semente') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimSemente', 10000, 'florim_semente')) return;
                    const custo = 18; if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_semente'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimSemente');
                    const z = { id: florimId('seed'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 40, tempo: 400, estado: 'espera', mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimSementes.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_semente', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 20000 }, p);
                    return;
                }

                if (data.action === 'florim_espinhos') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimEspinhos', 13000, 'florim_espinhos')) return;
                    const custo = 22; if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_espinhos'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimEspinhos');
                    const z = { id: florimId('thorns'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 120, tempo: 100, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimEspinhos.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_espinhos', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 13500 }, p);
                    return;
                }

                if (data.action === 'florim_parede') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimParede', 10000, 'florim_parede')) return;
                    const custo = 20; if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 250) { avisaForaAlcance(ws, 'florim_parede'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimParede');
                    const z = { id: florimId('wall'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 80, tempo: 80, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimParedes.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_parede', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 4000 }, p);
                    return;
                }

                if (data.action === 'curandeiro_cantico') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0) return;
                    if(!p.lastCantico) p.lastCantico = 0;
                    if(Date.now() - p.lastCantico < 14500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'cantico', 30))) return;
                    p.lastCantico = Date.now();

                    let candidatos = [];
                    slimes.forEach(s => {
                        if (s && s.hp > 0) {
                            let dist = Math.hypot(s.x - p.x, s.y - p.y);
                            if (dist <= 320) candidatos.push({ ent: s, tipo: 'slime', dist: dist });
                        }
                    });
                    bosses.forEach(b => {
                        if (b && b.hp > 0) {
                            let dist = Math.hypot(b.x - p.x, b.y - p.y);
                            if (dist <= 360) candidatos.push({ ent: b, tipo: 'boss', dist: dist });
                        }
                    });
                    // PvP: jogadores com PvP ligado entram na mesma disputa pelos 5 alvos.
                    if (p.pvpAtivo) {
                        for (let outro in players) {
                            if (!pvpPodeAtacar(playerId, outro)) continue;
                            const p2 = players[outro];
                            let dist = Math.hypot(p2.x - p.x, p2.y - p.y);
                            if (dist <= 360) candidatos.push({ ent: p2, tipo: 'player', id: outro, dist: dist });
                        }
                    }
                    candidatos.sort((a, b) => a.dist - b.dist);
                    let escolhidos = candidatos.slice(0, 5);

                    let netTargets = escolhidos.map(c => ({
                        id: c.tipo === 'player' ? c.id : c.ent.id,
                        tipo: c.tipo,
                        x: Math.round(c.ent.x),
                        y: Math.round(c.ent.y)
                    }));

                    wss.clients.forEach(c => {
                        if (c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({
                                type: 'action_curandeiro_cantico',
                                ownerId: playerId,
                                x: Math.round(p.x),
                                y: Math.round(p.y),
                                targets: netTargets,
                                duration: 10000
                            }));
                        }
                    });

                    // Aplica o impacto e o debuff aos 600ms (quando os anjos atingem os alvos)
                    setTimeout(() => {
                        let danoBase = (typeof dmgSkill === 'function' ? dmgSkill(p, 'cantico', 25) : 25) || 25;
                        escolhidos.forEach(c => {
                            let target = c.ent;
                            if (!target || target.hp <= 0) return;
                            // PvP revalida 600ms depois: o alvo pode ter saído do PvP ou do mapa.
                            if (c.tipo === 'player' && !pvpPodeAtacar(playerId, c.id)) return;

                            target.canticoDebuffExpires = Date.now() + 10000;
                            target.canticoDefDebuff = 0.20;
                            target.canticoAtkDebuff = 0.05;

                            if (c.tipo === 'slime') {
                                registrarDanoMonstro(target, playerId, danoBase, 'skill');
                            } else if (c.tipo === 'boss') {
                                registrarDanoBoss(target, playerId, danoBase, 'skill', 'player');
                            } else {
                                aplicarDanoPvP(playerId, c.id, danoBase, 'cantico');
                            }
                        });
                    }, 600);
                }
                if (data.action === 'barbaro_vinculo') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0) return;
                    if(!p.lastVinculo) p.lastVinculo = 0;
                    if(Date.now() - p.lastVinculo < 29500) return;

                    let target = null;
                    let targetTipo = 'slime';
                    if (data.targetId) {
                        target = slimes.find(s => s && s.id === data.targetId && s.hp > 0);
                        if (!target) {
                            target = bosses.find(b => b && b.id === data.targetId && b.hp > 0);
                            if (target) targetTipo = 'boss';
                        }
                    }
                    if (!target) {
                        let menorDist = 380;
                        slimes.forEach(s => {
                            if (s && s.hp > 0) {
                                let d = Math.hypot(s.x - p.x, s.y - p.y);
                                if (d < menorDist) { menorDist = d; target = s; targetTipo = 'slime'; }
                            }
                        });
                        bosses.forEach(b => {
                            if (b && b.hp > 0) {
                                let d = Math.hypot(b.x - p.x, b.y - p.y);
                                if (d < menorDist) { menorDist = d; target = b; targetTipo = 'boss'; }
                            }
                        });
                    }

                    if (!target || Math.hypot(target.x - p.x, target.y - p.y) > 420) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'msg_aviso', mensagem: 'Nenhum alvo ao alcance!' }));
                            ws.send(JSON.stringify({ type: 'skill_rejeitada', skill: 'barbaro_vinculo' }));
                        }
                        return;
                    }

                    if (!gastarMana(ws, p, mpSkill(p, 'vinculo', 20))) return;
                    p.lastVinculo = Date.now();

                    p.vinculoAtivo = true;
                    p.vinculoExpires = Date.now() + 10000;
                    vinculosBerserker[playerId] = {
                        targetId: target.id,
                        targetTipo: targetTipo,
                        expires: Date.now() + 10000,
                        maxDistance: 450
                    };
                    p.vampirismoBonus = 0.2;
                    p.danoBonus = 0.3;
                    p.atkSpeedBonus = 0.2;
                    
                    wss.clients.forEach(c => {
                        if(c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({
                                type: 'action_barbaro_vinculo',
                                ownerId: playerId,
                                targetId: target.id,
                                targetTipo: targetTipo,
                                x: target.x,
                                y: target.y,
                                duration: 10000
                            }));
                        }
                    });
                }
                if (data.action === 'astral_buraco_negro') {
                    let p = players[playerId];
                    if(!p || p.hp <= 0) return;
                    if(!p.lastBuraco) p.lastBuraco = 0;
                    if(Date.now() - p.lastBuraco < 24500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'buraco_negro', 40))) return;
                    p.lastBuraco = Date.now();

                    buracosNegros.push({ x: data.targetX, y: data.targetY, ownerId: playerId, expires: Date.now() + 3000 });
                    wss.clients.forEach(c => {
                        if(c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({ type: 'action_astral_buraco_negro', ownerId: playerId, targetX: data.targetX, targetY: data.targetY }));
                        }
                    });
                }

                if (data.action === 'guerreiro_postura_guardiao') {
                    const p = players[playerId];
                    if (!p || p.hp <= 0 || p.classe !== 'guerreiro') return;
                    if (p.stunTimer > 0) {
                        ws.send(JSON.stringify({ type: 'skill_rejeitada', skill: 'postura_guardiao' }));
                        return;
                    }
                    if (p.dashBloqueiaAcoes || p.escudoGuerreiro) {
                        ws.send(JSON.stringify({ type: 'skill_rejeitada', skill: 'postura_guardiao' }));
                        return;
                    }
                    const agoraGuardiao = Date.now();
                    if (agoraGuardiao - (p.lastGuerreiroGuardiao || 0) < 14000) {
                        ws.send(JSON.stringify({ type: 'skill_rejeitada', skill: 'postura_guardiao' }));
                        return;
                    }

                    p.lastGuerreiroGuardiao = agoraGuardiao;
                    p.guerreiroBuffAte = agoraGuardiao + 10000;

                    // Upgrades do Guerreiro - Postura do Guardião
                    const upgPostura = p.skillUpgrades || {};
                    const has1A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 1, 'A')); // Fúria do Vanguarda (+25% dano, +15% vel atk)
                    const has1B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 1, 'B')); // Bastião Inabalável (+50% defesa, barreira 20% HP)
                    const has2A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 2, 'A')); // Espinhos de Retaliação (reflete 35% dano)
                    const has2B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 2, 'B')); // Armadura Titânica (imune slow/knockback, -50% dano crit)
                    const has3A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 3, 'A')); // Pulso Sísmico de Ruptura (pulsos a cada 2s)
                    const has3B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 3, 'B')); // Égide Protetora (-20% dano aliados)
                    const has4A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 4, 'A')); // Fúria Berserker (golpes estendem + critico)
                    const has4B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgPostura, 'postura_guardiao', 4, 'B')); // Fortaleza Indestrutível (80% reducao + imune CC por 3s)

                    if (has1A) p.furiaVanguardaAte = p.guerreiroBuffAte;
                    if (has1B) {
                        p.barreiraPostura = Math.round(p.maxHp * 0.20);
                        p.barreiraPosturaAte = agoraGuardiao + 10000;
                    }
                    if (has2A) p.espinhosRetaliacaoAte = p.guerreiroBuffAte;
                    if (has2B) p.armaduraTitanicaAte = p.guerreiroBuffAte;
                    if (has3A) p.pulsoRupturaAte = p.guerreiroBuffAte;
                    if (has3B) p.egideProtetoraAte = p.guerreiroBuffAte;
                    if (has4A) {
                        p.furiaBerserkerAte = p.guerreiroBuffAte;
                        p.furiaBerserkerStacks = 0;
                    }
                    if (has4B) {
                        p.fortalezaIndestrutivelAte = agoraGuardiao + 3000;
                    }

                    atualizarBonusMaxHpGritoGuerra(p);
                    ws.send(JSON.stringify({ type: 'hp_sync', hp: p.hp, maxHp: p.maxHp }));

                    let mobsProvocados = 0;
                    let bossesProvocados = 0;
                    const centroX = p.x + PLAYER_OFFSET_X;
                    const centroY = p.y + PLAYER_OFFSET_Y;
                    const mapaJogador = mapaPorCoordenada(centroX);
                    const mesmaSala = entidade => entidadeEhSolari(p) === entidadeEhSolari(entidade) && instanciaCompativel(p, entidade);
                    slimes.forEach(slime => {
                        if (!slime || slime.hp <= 0 || slime.flagPassivo || !mesmaSala(slime)) return;
                        if (mapaPorCoordenada(slime.x) !== mapaJogador || Math.hypot(slime.x - centroX, slime.y - centroY) > 300) return;
                        slime.tauntId = playerId;
                        slime.tauntTimer = 40;
                        slime.targetId = playerId;
                        mobsProvocados++;
                    });
                    bosses.forEach(boss => {
                        if (!boss || boss.hp <= 0 || boss.flagPassivo || !mesmaSala(boss)) return;
                        if (mapaPorCoordenada(boss.x) !== mapaJogador || Math.hypot(boss.x - centroX, boss.y - centroY) > 300) return;
                        boss.tauntId = playerId;
                        boss.tauntTimer = 40;
                        boss.targetId = playerId;
                        bossesProvocados++;
                    });

                    // 3A: Se tem Pulso Sísmico de Ruptura, dispara ondas a cada 2s
                    if (has3A) {
                        for (let pTick = 1; pTick <= 4; pTick++) {
                            setTimeout(function () {
                                let guerreiro = players[playerId];
                                if (!guerreiro || guerreiro.hp <= 0 || Date.now() > (guerreiro.guerreiroBuffAte || 0)) return;
                                let gx = guerreiro.x + PLAYER_OFFSET_X, gy = guerreiro.y + PLAYER_OFFSET_Y;
                                slimes.forEach(s => {
                                    if (s.hp > 0 && Math.hypot(gx - s.x, gy - s.y) < 140) {
                                        registrarDanoMonstro(s, playerId, 40, 'player');
                                        s.armaduraShredTimer = 60; // 3s
                                    }
                                });
                                danoEmBosses(gx, gy, 145, playerId, 40, 'skill', 'player');
                                wss.clients.forEach(c => {
                                    if (c.readyState === WebSocket.OPEN) {
                                        c.send(JSON.stringify({ type: 'action_guerreiro_pulso_ruptura', id: playerId, x: gx, y: gy, raio: 140 }));
                                    }
                                });
                            }, pTick * 2000);
                        }
                    }

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'action_guerreiro_postura_guardiao',
                                id: playerId,
                                x: centroX,
                                y: centroY,
                                expiraEm: p.guerreiroBuffAte,
                                mobsProvocados,
                                bossesProvocados,
                                upgrades: {
                                    furia: has1A,
                                    bastiao: has1B,
                                    espinhos: has2A,
                                    titanica: has2B,
                                    pulso: has3A,
                                    egide: has3B,
                                    berserker: has4A,
                                    fortaleza: has4B
                                }
                            }));
                        }
                    });
                }

                if (data.action === 'guerreiro_provocacao') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if (!p.lastProvocacao) p.lastProvocacao = 0;
                    if (agora - p.lastProvocacao < 14500) return; // Cooldown 15 segundos
                    if (!gastarMana(ws, p, mpSkill(p, 'provocacao', 20))) return;

                    p.lastProvocacao = agora;
                    let pX = p.x + 12;
                    let pY = p.y + 16;

                    // Upgrades do Guerreiro - Provocação
                    const upgProvocacao = p.skillUpgrades || {};
                    const has1A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 1, 'A')); // Rugido Agressivo (+25% dano contra alvos)
                    const has1B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 1, 'B')); // Rugido Encouraçado (35% cura, +20% def 6s)
                    const has2A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 2, 'A')); // Onda Ressonante (50 dano + -25% def inimigos)
                    const has2B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 2, 'B')); // Desmoralização (-30% atk inimigos 8s)
                    const has3A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 3, 'A')); // Fervor de Batalha (+8% ATK / +5% AS por mob provocado)
                    const has3B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 3, 'B')); // Fôlego Inabalável (regen 4% HP/s por 5s)
                    const has4A = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 4, 'A')); // Brado do Conquistador (90 dano + repulsão + slow 60%)
                    const has4B = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgProvocacao, 'provocacao', 4, 'B')); // Avatar da Vanguarda (+25% tam, +50% def, 40% HP barreira 10s)

                    // Cura instantânea: 35% se has1B, 20% base
                    let curaPct = has1B ? 0.35 : 0.20;
                    let curaVal = Math.round(p.maxHp * curaPct);
                    aplicarCuraAoJogador(playerId, curaVal);

                    if (has1B) {
                        p.bonusDefesaGritoAte = agora + 6000;
                    }

                    // 3B: Fôlego Inabalável (Cura 4% HP/s por 5 segundos)
                    if (has3B) {
                        for (let s = 1; s <= 5; s++) {
                            setTimeout(function () {
                                let guerreiro = players[playerId];
                                if (!guerreiro || guerreiro.hp <= 0) return;
                                let regVal = Math.round(guerreiro.maxHp * 0.04);
                                aplicarCuraAoJogador(playerId, regVal);
                            }, s * 1000);
                        }
                    }

                    // 4B: Avatar da Vanguarda (+50% defesa e barreira de 40% do HP Máx por 10s)
                    if (has4B) {
                        p.avatarVanguardaAte = agora + 10000;
                        p.barreiraAvatar = Math.round(p.maxHp * 0.40);
                        p.barreiraAvatarAte = agora + 10000;
                    }

                    // Provocação em área para monstros normais
                    let monstrosAfetados = 0;
                    slimes.forEach(slime => {
                        if (slime.hp <= 0 || slime.flagPassivo) return;
                        if (Math.hypot(slime.x - pX, slime.y - pY) <= 300) {
                            slime.tauntId = playerId;
                            slime.tauntTimer = 200; // 10 segundos
                            slime.targetId = playerId;
                            monstrosAfetados++;

                            // 1A: Rugido Agressivo
                            if (has1A) slime.alvoRugidoAgressivoDe = playerId;
                            // 2A: Onda Ressonante (50 dano + quebra de defesa)
                            if (has2A) {
                                registrarDanoMonstro(slime, playerId, 50, 'player');
                                slime.debuffDefesaQuebradaTimer = 120; // 6s
                            }
                            // 2B: Desmoralização (-30% ataque do monstro)
                            if (has2B) slime.debuffDesmoralizadoTimer = 160; // 8s
                            // 4A: Brado do Conquistador (90 dano + slow 60% + repulsão)
                            if (has4A) {
                                registrarDanoMonstro(slime, playerId, 90, 'player');
                                slime.slowTimer = 80; // 4s
                                const angRepulsao = Math.atan2(slime.y - pY, slime.x - pX);
                                moverMonstroDirecionalComDesvio(slime, Math.cos(angRepulsao), Math.sin(angRepulsao), 45);
                            }
                        }
                    });

                    // Provocação para Bosses
                    let bossesAfetados = 0;
                    bosses.forEach(b => {
                        if (b.hp <= 0 || b.flagPassivo) return;
                        if (Math.hypot(b.x - pX, b.y - pY) <= 320) {
                            b.tauntId = playerId;
                            b.tauntTimer = 100; // 5 segundos
                            bossesAfetados++;

                            if (has1A) b.alvoRugidoAgressivoDe = playerId;
                            if (has2A) {
                                danoEmBosses(pX, pY, 320, playerId, 50, 'skill', 'player');
                                b.debuffDefesaQuebradaTimer = 120;
                            }
                            if (has2B) b.debuffDesmoralizadoTimer = 160;
                            if (has4A) {
                                danoEmBosses(pX, pY, 320, playerId, 90, 'skill', 'player');
                                b.slowTimer = 60;
                            }
                        }
                    });

                    // 3A: Fervor de Batalha (+8% ATK / +5% AS por inimigo provocado, até 5 stacks)
                    if (has3A && (monstrosAfetados + bossesAfetados) > 0) {
                        const totalProvocados = Math.min(5, monstrosAfetados + bossesAfetados);
                        p.fervorBatalhaStacks = totalProvocados;
                        p.fervorBatalhaAte = agora + 8000;
                    }

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
                                bossesAfetados: bossesAfetados,
                                upgrades: {
                                    agressivo: has1A,
                                    encouracado: has1B,
                                    ressonante: has2A,
                                    desmoralizacao: has2B,
                                    fervor: has3A,
                                    folego: has3B,
                                    conquistador: has4A,
                                    avatar: has4B
                                }
                            }));
                        }
                    });
                }

                // ============================================================
                // PIKEMAN — ATAQUE BÁSICO: FOICADA (Foice Curta, golpe em cone)
                // ============================================================
                if (data.action === 'ataque_pikeman') {
                    if (pikemanCanais[playerId]) return;
                    if (players[playerId] && players[playerId].pikemanSkillAte && agora < players[playerId].pikemanSkillAte) return;
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    players[playerId].lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, players[playerId], data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_pikeman_foice', id: playerId }));
                        }
                    });

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let anguloFoice = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);
                    let danoFoice = dmgSkill(players[playerId], 'foicada', DANO_BASE_ATAQUE_BASICO.melee);
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoFoice, 'físico');
                }

                // ============================================================
                // PIKEMAN — SKILL 1: GIRO DA FOICE (AoE circular ao redor)
                // ============================================================
                if (data.action === 'pikeman_giro') {
                    let pk = players[playerId];
                    if (pk.pikemanGiroCd && Date.now() < pk.pikemanGiroCd) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'giro_foice', 25))) return;
                    pk.pikemanGiroCd = Date.now() + 7000;
                    pk.pikemanSkillAte = Date.now() + 1200;
                    let pX = pk.x + 12, pY = pk.y + 16;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_pikeman_giro', id: playerId, x: Math.round(pX), y: Math.round(pY), durMs: 1200 }));
                        }
                    });
                    let danoGiro = dmgSkill(pk, 'giro_foice', 26);
                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            if (Math.hypot(pX - slime.x, pY - slime.y) < 143) {
                                registrarDanoMonstro(slime, playerId, danoGiro, 'player');
                                wss.clients.forEach((client) => {
                                    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_pikeman_giro_hit', x: Math.round(slime.x), y: Math.round(slime.y) }));
                                });
                            }
                        }
                    });
                    danoEmBosses(pX, pY, 143, playerId, danoGiro, 'skill', 'player');
                }

                // ============================================================
                // PIKEMAN — SKILL 2: PIRUETA DA MORTE (3 cortes em sequência)
                // ============================================================
                if (data.action === 'pikeman_pirueta') {
                    let pk = players[playerId];
                    if (pk.pikemanPiruetaCd && Date.now() < pk.pikemanPiruetaCd) return;
                    if (!data.alvoTipo || !data.alvoId) return;
                    let alvoPirueta = obterAlvoAtaqueServidor(data.alvoTipo, data.alvoId);
                    if (!alvoPirueta) return;
                    let pX = pk.x + 12, pY = pk.y + 16;
                    if (mapaPorCoordenada(pk.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(alvoPirueta.x)) return;
                    if (Math.hypot(alvoPirueta.x - pX, alvoPirueta.y - pY) > 120) return; // fora do alcance da pirueta
                    if (!gastarMana(ws, pk, mpSkill(pk, 'pirueta_morte', 22))) return;
                    pk.pikemanPiruetaCd = Date.now() + 10000;
                    pk.pikemanSkillAte = Date.now() + 860;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_pikeman_pirueta', id: playerId, x: Math.round(pX), y: Math.round(pY), alvoX: Math.round(alvoPirueta.x), alvoY: Math.round(alvoPirueta.y) }));
                        }
                    });
                    let danoPirueta = dmgSkill(pk, 'pirueta_morte', 18);
                    // Corte→giro→corte→giro→corte final — hits separados, contabilizados individualmente
                    pikemanGolpePirueta(playerId, data.alvoTipo, data.alvoId, danoPirueta, 1);
                    setTimeout(() => pikemanGolpePirueta(playerId, data.alvoTipo, data.alvoId, danoPirueta, 2), 260);
                    setTimeout(() => pikemanGolpePirueta(playerId, data.alvoTipo, data.alvoId, danoPirueta, 3), 520);
                }

                // ============================================================
                // PIKEMAN — SKILL 3: GEADA DA MORTE (AoE com 60% de lentidão)
                // ============================================================
                if (data.action === 'pikeman_geada') {
                    let pk = players[playerId];
                    if (pk.pikemanGeadaCd && Date.now() < pk.pikemanGeadaCd) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'geada_morte', 25))) return;
                    pk.pikemanGeadaCd = Date.now() + 12000;
                    pk.pikemanSkillAte = Date.now() + 650;
                    let pX = pk.x + 12, pY = pk.y + 16;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_pikeman_geada', id: playerId, x: Math.round(pX), y: Math.round(pY), raio: 130 }));
                        }
                    });
                    let danoGeada = dmgSkill(pk, 'geada_morte', 14);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(pX - slime.x, pY - slime.y) < 130) {
                            registrarDanoMonstro(slime, playerId, danoGeada, 'player');
                            // 60% de lentidão (3s) + visual de congelamento → ativa a passiva (+20% dano)
                            efeitos.aplicarEfeito(slime, 'gelo', 60, 1);
                            slime.slowTimer = Math.max(slime.slowTimer || 0, 60);
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_pikeman_geada_hit', x: Math.round(slime.x), y: Math.round(slime.y) }));
                            });
                        }
                    });
                    bosses.forEach(bb => {
                        if (bb.hp > 0 && Math.hypot(pX - bb.x, pY - bb.y) < 130) {
                            registrarDanoBoss(bb, playerId, danoGeada, 'skill', 'player');
                            efeitos.aplicarEfeito(bb, 'gelo', 60, 1);
                            if (typeof bb.slowTimer === 'number') bb.slowTimer = Math.max(bb.slowTimer, 45);
                        }
                    });
                    // PvP: mesma geada (dano + 60% de lentidão) em quem estiver com PvP ligado.
                    if (pk.pvpAtivo) {
                        for (let outro in players) {
                            if (!pvpPodeAtacar(playerId, outro)) continue;
                            const p2 = players[outro];
                            if (Math.hypot(p2.x - pX, p2.y - pY) >= 130) continue;
                            aplicarDanoPvP(playerId, outro, danoGeada, 'geada');
                            efeitos.aplicarEfeito(p2, 'gelo', 60, 1);
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_pikeman_geada_hit', x: Math.round(p2.x), y: Math.round(p2.y) }));
                            });
                        }
                    }
                }

                // ============================================================
                // PIKEMAN — SKILL 4: EXECUÇÃO DA MORTE (canal 3s → 3 golpes)
                // ============================================================
                if (data.action === 'pikeman_execucao') {
                    let pk = players[playerId];
                    if (pikemanCanais[playerId]) return; // já está canalizando
                    if (pk.pikemanExecucaoCd && Date.now() < pk.pikemanExecucaoCd) return;
                    if (!data.alvoTipo || !data.alvoId) return;
                    let alvoExe = obterAlvoAtaqueServidor(data.alvoTipo, data.alvoId);
                    if (!alvoExe) return;
                    let pX0 = pk.x + 12, pY0 = pk.y + 16;
                    if (mapaPorCoordenada(pk.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(alvoExe.x)) return;
                    if (Math.hypot(alvoExe.x - pX0, alvoExe.y - pY0) > 125) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'execucao_morte', 35))) return;
                    pk.pikemanExecucaoCd = Date.now() + 30000;
                    pk.pikemanSkillAte = Date.now() + 3600;
                    pikemanCanais[playerId] = {
                        startX: pk.x, startY: pk.y,
                        alvoTipo: data.alvoTipo, alvoId: data.alvoId,
                        timer: 60, total: 60, // 60 ticks × 50ms = 3s de carga
                        angulo: pk.angulo
                    };
                    pk.pikemanProgresso = 0;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_pikeman_execucao', id: playerId, x: Math.round(pk.x + 12), y: Math.round(pk.y + 16), alvoX: Math.round(alvoExe.x), alvoY: Math.round(alvoExe.y), durMs: 3000 }));
                        }
                    });
                }

                if (data.action === 'pikeman_execucao_cancelar') {
                    if (pikemanCanais[playerId]) {
                        delete pikemanCanais[playerId];
                        if (players[playerId]) {
                            players[playerId].pikemanProgresso = 0;
                            delete players[playerId].pikemanSkillAte;
                        }
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_pikeman_execucao_cancel', id: playerId }));
                            }
                        });
                    }
                }

                // ============================================================
                // GUERREIRO KALEDRON — ATAQUE BÁSICO: CORTE ÍGNEO (Telecinese)
                // ============================================================
                if (data.action === 'ataque_kaledron') {
                    let pk = players[playerId];
                    if (!pk) return;
                    if (agora - pk.lastBasicAttack < tempoAtaqueBasico(pk, tempoBaseAtaqueBasico(pk))) return;
                    pk.lastBasicAttack = agora;

                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, pk, data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;

                    let pX = pk.x + 12;
                    let pY = pk.y + 16;
                    let anguloCorte = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);
                    anguloCorte = Math.atan2(Math.sin(anguloCorte), Math.cos(anguloCorte));
                    let danoCorte = dmgSkill(pk, 'kaledron_corte', DANO_BASE_ATAQUE_BASICO.melee);

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_kaledron_ataque', id: playerId, x: Math.round(pX), y: Math.round(pY), angulo: anguloCorte }));
                        }
                    });

                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoCorte, 'físico');
                }

                // ============================================================
                // GUERREIRO KALEDRON — SKILL 1: GOLPE FULMINANTE (slash_strike)
                // ============================================================
                if (data.action === 'kaledron_golpe_fulminante') {
                    let pk = players[playerId];
                    if (!pk) return;
                    if (pk.kaledronGolpeCd && Date.now() < pk.kaledronGolpeCd) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'slash_strike', 15))) return;
                    pk.kaledronGolpeCd = Date.now() + 4000;

                    let pX = pk.x + 12, pY = pk.y + 16;
                    let ang = (data.angulo !== undefined && data.angulo !== null) ? Number(data.angulo) : pk.angulo;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_kaledron_golpe_fulminante', id: playerId, x: Math.round(pX), y: Math.round(pY), angulo: ang }));
                        }
                    });

                    let danoGolpe = dmgSkill(pk, 'slash_strike', 48); // 160% de 30 = 48
                    slimes.forEach(slime => {
                        if (slime.hp > 0) {
                            let dist = Math.hypot(pX - slime.x, pY - slime.y);
                            if (dist <= 140) {
                                let angSlime = Math.atan2(slime.y - pY, slime.x - pX);
                                let diff = Math.atan2(Math.sin(ang - angSlime), Math.cos(ang - angSlime));
                                if (Math.abs(diff) < 0.95) {
                                    registrarDanoMonstro(slime, playerId, danoGolpe, 'player');
                                }
                            }
                        }
                    });

                    danoEmBosses(pX, pY, 140, playerId, danoGolpe, 'skill', 'player');
                    danoEmPlayers(pX, pY, 140, playerId, danoGolpe, 'fisico', null, ang, 0.95);
                }

                // ============================================================
                // GUERREIRO KALEDRON — SKILL 2: IMPACTO TERRESTRE (ground_slam)
                // ============================================================
                if (data.action === 'kaledron_impacto_terrestre') {
                    let pk = players[playerId];
                    if (!pk) return;
                    if (pk.kaledronImpactoCd && Date.now() < pk.kaledronImpactoCd) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'ground_slam', 25))) return;
                    pk.kaledronImpactoCd = Date.now() + 10000;

                    let pX = pk.x + 12, pY = pk.y + 16;
                    let raioImpacto = 110;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_kaledron_impacto_terrestre', id: playerId, x: Math.round(pX), y: Math.round(pY), raio: raioImpacto }));
                        }
                    });

                    let danoImpacto = dmgSkill(pk, 'ground_slam', 45);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(pX - slime.x, pY - slime.y) <= raioImpacto) {
                            registrarDanoMonstro(slime, playerId, danoImpacto, 'player');
                            slime.stunTimer = Math.max(slime.stunTimer || 0, 30); // 1.5s stun (30 ticks)
                            if (efeitos) efeitos.aplicarEfeito(slime, 'atordoado', 30, 1);
                        }
                    });

                    bosses.forEach(b => {
                        if (b.hp > 0 && Math.hypot(pX - b.x, pY - b.y) <= raioImpacto) {
                            registrarDanoMonstro(b, playerId, danoImpacto, 'player');
                            b.stunTimer = Math.max(b.stunTimer || 0, 10); // 0.5s stun em boss
                        }
                    });

                    // Aplica em outros jogadores caso PvP esteja ativo
                    for (let pid2 in players) {
                        let p2 = players[pid2];
                        if (pid2 !== playerId && p2 && p2.hp > 0 && pvpPodeAtacar(playerId, pid2)) {
                            if (Math.hypot(pX - (p2.x + 12), pY - (p2.y + 16)) <= raioImpacto) {
                                aplicarDanoPvP(playerId, pid2, danoImpacto, 'fisico');
                                p2.stunTimer = Math.max(p2.stunTimer || 0, 30);
                            }
                        }
                    }
                }

                // ============================================================
                // GUERREIRO KALEDRON — SKILL 3: REDEMOINHO DE AÇO (whirlwind)
                // ============================================================
                if (data.action === 'kaledron_redemoinho') {
                    let pk = players[playerId];
                    if (!pk) return;
                    if (pk.kaledronRedemoinhoCd && Date.now() < pk.kaledronRedemoinhoCd) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'whirlwind', 30))) return;
                    pk.kaledronRedemoinhoCd = Date.now() + 12000;

                    let pX = pk.x + 12, pY = pk.y + 16;
                    let raioRed = 120;
                    let danoTotalRedemoinho = dmgSkill(pk, 'whirlwind', 20) * 3;
                    let danoBaseTick = Math.floor(danoTotalRedemoinho / 10);
                    let ticksAplicados = 0;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_kaledron_redemoinho', id: playerId, x: Math.round(pX), y: Math.round(pY), durMs: 3000 }));
                        }
                    });

                    // Função auxiliar para aplicar tick do redemoinho
                    function aplicarTickRedemoinho() {
                        let tickAtual = ticksAplicados++;
                        let danoTick = tickAtual === 9 ? danoTotalRedemoinho - danoBaseTick * 9 : danoBaseTick;
                        let curP = players[playerId];
                        if (!curP || curP.hp <= 0) return;
                        let cx = curP.x + 12, cy = curP.y + 16;
                        slimes.forEach(slime => {
                            if (slime.hp > 0 && Math.hypot(cx - slime.x, cy - slime.y) <= raioRed) {
                                registrarDanoMonstro(slime, playerId, danoTick, 'player');
                            }
                        });
                        danoEmBosses(cx, cy, raioRed, playerId, danoTick, 'skill', 'player');
                        danoEmPlayers(cx, cy, raioRed, playerId, danoTick, 'fisico');
                    }

                    for (let tick = 0; tick < 10; tick++) {
                        setTimeout(aplicarTickRedemoinho, tick * 300);
                    }
                }

                // ============================================================
                // GUERREIRO KALEDRON — SKILL 4: BRADO DE GUERRA VULCÂNICO (battle_cry)
                // ============================================================
                if (data.action === 'kaledron_brado_guerra') {
                    let pk = players[playerId];
                    if (!pk) return;
                    if (pk.kaledronBradoCd && Date.now() < pk.kaledronBradoCd) return;
                    if (!gastarMana(ws, pk, mpSkill(pk, 'battle_cry', 20))) return;
                    pk.kaledronBradoCd = Date.now() + 25000;

                    let agoraMs = Date.now();
                    pk.kaledronBradoAte = agoraMs + 10000; // 10s de buff

                    let pX = pk.x + 12, pY = pk.y + 16;
                    let raioBuff = 240;

                    // Aplica buff a aliados próximos ou membros do grupo
                    for (let pidA in players) {
                        let pA = players[pidA];
                        if (pA && pA.hp > 0) {
                            let ehMesmoGrupo = pk.partyId && pA.partyId === pk.partyId;
                            let estaPerto = Math.hypot(pX - (pA.x + 12), pY - (pA.y + 16)) <= raioBuff;
                            let ehAliado = ehMesmoGrupo || !pvpPodeAtacar(playerId, pidA);
                            if (pidA === playerId || (estaPerto && ehAliado)) {
                                pA.kaledronBradoAte = agoraMs + 10000;
                            }
                        }
                    }

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_kaledron_brado_guerra', id: playerId, x: Math.round(pX), y: Math.round(pY), durMs: 10000 }));
                        }
                    });
                }

                if (data.action === 'corte') {
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;
                    players[playerId].lastBasicAttack = agora;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, players[playerId], data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;

                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_corte', id: playerId }));
                        }
                    });

                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let danoCorte = dmgSkill(players[playerId], 'corte', DANO_BASE_ATAQUE_BASICO.melee);
                    aplicarDanoAtaqueBasicoAlvo(playerId, data.alvoTipo, data.alvoId, danoCorte, 'físico');
                }

                if (data.action === 'ataque_mago' || data.action === 'ataque_summoner' || data.action === 'ataque_arqueiro' || data.action === 'ataque_curandeiro') {
                    if (agora - players[playerId].lastBasicAttack < tempoAtaqueBasico(players[playerId], tempoBaseAtaqueBasico(players[playerId]))) return;

                    // Auto-ataque com alvo informado exige validação completa no servidor
                    let alvoAuto = validarAtaqueBasicoAlvo(playerId, players[playerId], data.alvoTipo, data.alvoId);
                    if (!alvoAuto) return;
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
                    let ang = Math.atan2(alvoAuto.y - pY, alvoAuto.x - pX);

                    let danoProj = dmgSkill(players[playerId], 'magia', DANO_BASE_ATAQUE_BASICO.magic);
                    if (data.action === 'ataque_summoner') danoProj = dmgSkill(players[playerId], 'orbe', DANO_BASE_ATAQUE_BASICO.magic);
                    if (data.action === 'ataque_arqueiro') danoProj = dmgSkill(players[playerId], 'flecha', DANO_BASE_ATAQUE_BASICO.physicalRanged);
                    if (data.action === 'ataque_curandeiro') danoProj = dmgSkill(players[playerId], 'sagrado', DANO_BASE_ATAQUE_BASICO.magic);

                    let velocidadeProj = 10.0;
                    if (data.action === 'ataque_arqueiro') velocidadeProj = 14.0;

                    // Alcance do arqueiro ~10% maior que o das classes mágicas (48 ticks x 14 = ~672px vs 600px)
                    let vidaProj = 60;
                    if (data.action === 'ataque_arqueiro') vidaProj = 48;

                    let isGeloBasico = false;
                    if (data.action === 'ataque_mago') {
                        const hasNevascaAtiva = blizzards.some(bl => bl.ownerId === playerId);
                        if (hasNevascaAtiva && SkillUpgradeTree && SkillUpgradeTree.temUpgrade(players[playerId].skillUpgrades, 'nevasca', 3, 'A')) {
                            isGeloBasico = true;
                        }
                    }

                    let tipoProj = isGeloBasico ? 'magia_gelo' :
                                   (data.action === 'ataque_mago') ? 'magia' :
                                   (data.action === 'ataque_summoner') ? 'orbe' :
                                   (data.action === 'ataque_arqueiro') ? 'flecha' : 'sagrado';

                    const ownerInSolari = !!solariSessaoDoJogador(playerId);
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
                        origemBasica: true,
                        alvoTipo: data.alvoTipo,
                        alvoId: data.alvoId,
                        solari: ownerInSolari
                    });

                    let tipoAcao = isGeloBasico ? 'action_mago_tiro_gelo' :
                                   (data.action === 'ataque_mago') ? 'action_magia_basica' :
                                   (data.action === 'ataque_summoner') ? 'action_orbe' :
                                   (data.action === 'ataque_arqueiro') ? 'action_flecha' : 'action_sagrado';

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
                    if (!cdSkillExpirado(ws, players[playerId], 'lastCura', 4500, 'curandeiro_cura')) return; // CD 5s no cliente / margem server -500ms
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'cura', 25))) return;
                    marcarSkillUsada(players[playerId], 'lastCura');
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
                            aplicarCuraAoJogador(id, curaBase, playerId);
                        }
                    }

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_curandeiro_cura', x: pX, y: pY, valor: curaBase }));
                        }
                    });
                }

                if (data.action === 'curandeiro_julgamento') {
                    if (!alcanceSkillValido(players[playerId], data.targetX, data.targetY, 340)) { avisaForaAlcance(ws, 'curandeiro_julgamento'); return; } // mira 340px (autoridade server)
                    if (!cdSkillExpirado(ws, players[playerId], 'lastJulgamento', 6000, 'curandeiro_julgamento')) return; // CD 6.5s no cliente / margem server -500ms
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'julgamento', 24))) return;
                    marcarSkillUsada(players[playerId], 'lastJulgamento');
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_curandeiro_julgamento', targetX: data.targetX, targetY: data.targetY }));
                        }
                    });

                    let danoJulg = dmgSkill(players[playerId], 'julgamento', 28);
                    slimes.forEach(slime => {
                        if (slime.hp > 0 && Math.hypot(slime.x - data.targetX, slime.y - data.targetY) < 78) {
                            registrarDanoMonstro(slime, playerId, danoJulg);
                            slime.slowTimer = 35;
                        }
                    });
                    danoEmBosses(data.targetX, data.targetY, 102, playerId, danoJulg, 'skill');
                }

                if (data.action === 'arqueiro_chuva') {
                    if (!alcanceSkillValido(players[playerId], data.targetX, data.targetY, 420)) { avisaForaAlcance(ws, 'arqueiro_chuva'); return; } // mira 420px (autoridade server)
                    if (!cdSkillExpirado(ws, players[playerId], 'lastChuva', 5500, 'arqueiro_chuva')) return; // CD 6s no cliente / margem server -500ms
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'chuva', 22))) return;
                    marcarSkillUsada(players[playerId], 'lastChuva');
                    const duracaoChuvaMs = Math.round(140 * (1000 / 60));
                    chuvasServidor.push({ ownerId: playerId, x: data.targetX, y: data.targetY, duracao: Math.ceil(duracaoChuvaMs / 50), expiresAt: Date.now() + duracaoChuvaMs, danoChuva: dmgSkill(players[playerId], 'chuva', 8) });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arqueiro_chuva', targetX: data.targetX, targetY: data.targetY, duracaoMs: duracaoChuvaMs }));
                        }
                    });
                }

                if (data.action === 'arqueiro_perfurante') {
                    if (!cdSkillExpirado(ws, players[playerId], 'lastPerfurante', 4000, 'arqueiro_perfurante')) return; // CD 4.5s no cliente / margem server -500ms
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'perfurante', 18))) return;
                    marcarSkillUsada(players[playerId], 'lastPerfurante');
                    let pX = players[playerId].x + 12;
                    let pY = players[playerId].y + 16;
                    let ang = (data.angulo !== undefined) ? data.angulo : players[playerId].angulo;
                    let vel = 18.0;
                    const dirX = Math.cos(ang);
                    const dirY = Math.sin(ang);
                    const pontaFlecha = 22;

                    const ownerInSolari = !!solariSessaoDoJogador(playerId);
                    playerProjeteis.push({
                        ownerId: playerId,
                        x: pX + dirX * pontaFlecha,
                        y: pY + dirY * pontaFlecha,
                        vx: dirX * vel,
                        vy: dirY * vel,
                        dano: dmgSkill(players[playerId], 'perfurante', 32),
                        vida: 40,
                        tipo: 'arqueiro_perfurante',
                        perfurante: true,
                        origemBasica: false,
                        solari: ownerInSolari
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_arqueiro_perfurante', x: pX, y: pY, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, angulo: ang }));
                        }
                    });
                }

                if (data.action === 'arqueiro_rajada') {
                    if (!cdSkillExpirado(ws, players[playerId], 'lastRajada', 11500, 'arqueiro_rajada')) return; // CD 12s no cliente / margem server -500ms
                    if (rajadaCanal[playerId]) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'rajada', 30))) return;
                    marcarSkillUsada(players[playerId], 'lastRajada');
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
                    const mago = players[playerId];
                    if (!mago || mago.hp <= 0) return;
                    if (!alcanceSkillValido(mago, data.targetX, data.targetY, 380)) { avisaForaAlcance(ws, 'meteoro'); return; }

                    const upgMet = mago.skillUpgrades || {};
                    const hasMA1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 1, 'A')); // 5 Meteoros seguidos
                    const hasMA2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 2, 'A')); // +30% Dano, -3s Recarga
                    const hasMA3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 3, 'A')); // 10 Meteoros, MicroStun 0.5s, Paralisado
                    const hasMA4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 4, 'A')); // Cometa Gigante final
                    const hasMB1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 1, 'B')); // Bola de Fogo + Knockback + Rastro
                    const hasMB2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 2, 'B')); // Desfragmentação + Queimadura 5s
                    const hasMB3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 3, 'B')); // 3 Bolas de Fogo (100%, 50%, 20%)
                    const hasMB4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgMet, 'meteoro', 4, 'B')); // Metamorfose Orbe Vivo 5s

                    const cdMeteoro = hasMA2 ? 3500 : 6500;
                    if (!cdSkillExpirado(ws, mago, 'lastMeteoro', cdMeteoro, 'meteoro')) return;
                    if (!gastarMana(ws, mago, mpSkill(mago, 'meteoro', 30))) return;
                    marcarSkillUsada(mago, 'lastMeteoro');

                    const tx = Number(data.targetX), ty = Number(data.targetY);
                    let baseDano = 25;
                    if (hasMA2) baseDano = Math.round(baseDano * 1.30);
                    if (hasMA3) baseDano = Math.round(baseDano * 1.50);
                    const danoMeteoro = dmgSkill(mago, 'meteoro', baseDano);

                    // Lado B4: Metamorfose Elemental — Mago vira Bola de Fogo viva por 5s
                    if (hasMB4) {
                        mago.formaIgneaAte = Date.now() + 5000;
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({ type: 'action_mago_forma_ignea', id: playerId, duracaoMs: 5000 }));
                            }
                        });
                        return;
                    }

                    // Lado B1/B2/B3: Bola de Fogo disparada
                    if (hasMB1) {
                        const pX = mago.x + 12, pY = mago.y + 16;
                        const ang = Math.atan2(ty - pY, tx - pX);
                        const qtdBolas = hasMB3 ? 3 : 1;
                        const mults = [1.0, 0.5, 0.2];

                        for (let b = 0; b < qtdBolas; b++) {
                            setTimeout(() => {
                                const caster = players[playerId];
                                if (!caster || caster.hp <= 0) return;
                                const danoAtual = Math.round(danoMeteoro * mults[b]);
                                wss.clients.forEach(c => {
                                    if (c.readyState === WebSocket.OPEN) {
                                        c.send(JSON.stringify({
                                            type: 'action_mago_bola_fogo_tiro',
                                            id: playerId, x: pX, y: pY, ang: ang, speed: 14, danoMult: mults[b], knockback: 90
                                        }));
                                    }
                                });
                                // Registra impacto da bola de fogo ao longo do trajeto
                                setTimeout(() => {
                                    const cx = pX + Math.cos(ang) * 320;
                                    const cy = pY + Math.sin(ang) * 320;
                                    // Knockback nos monstros atingidos
                                    slimes.forEach(s => {
                                        if (s.hp > 0 && Math.hypot(s.x - cx, s.y - cy) < 70) {
                                            moverMonstroDirecionalComDesvio(s, Math.cos(ang), Math.sin(ang), 90);
                                            registrarDanoMonstro(s, playerId, danoAtual, 'player');
                                            if (hasMB2) efeitos.aplicarEfeito(s, 'queimadura', 100, 8);
                                        }
                                    });
                                    danoEmBosses(cx, cy, 75, playerId, danoAtual, 'skill', 'player');
                                    bosses.forEach(bs => {
                                        if (bs.hp > 0 && Math.hypot(bs.x - cx, bs.y - cy) < 75) {
                                            if (hasMB2) efeitos.aplicarEfeito(bs, 'queimadura', 100, 8);
                                        }
                                    });
                                    if (hasMB2) {
                                        wss.clients.forEach(c => {
                                            if (c.readyState === WebSocket.OPEN) {
                                                c.send(JSON.stringify({ type: 'action_mago_bola_fogo_desfragmentar', x: cx, y: cy, qtd: 6 }));
                                            }
                                        });
                                    }
                                    // Deixa rastro de fogo no chão
                                    meteorFires.push({ x: cx, y: cy, ownerId: playerId, expiresAt: Date.now() + 4000, nextTick: Date.now() + 1000, dano: Math.round(danoAtual * 0.4) });
                                }, 250);
                            }, b * 150);
                        }
                        return;
                    }

                    // Lado A: Chuva de Meteoros (5 ou 10) e Cometa Gigante Final
                    const castDur = hasMA1 ? 1500 : 1000;
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_cast_start', id: playerId, skill: 'meteoro', durMs: castDur }));
                    });

                    // Tier 3 A: Se for canalizado, paralisa o mago durante o cast e chuva
                    if (hasMA3) {
                        mago.canalizandoMeteoro = true;
                        mago.isPreso = Date.now() + 2800;
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify({ type: 'action_mago_canalizacao', id: playerId, x: mago.x, y: mago.y, durMs: 2800 }));
                        });
                        setTimeout(() => { if (mago) mago.canalizandoMeteoro = false; }, 2800);
                    }

                    setTimeout(() => {
                        const caster = players[playerId];
                        if (!caster || caster.hp <= 0) {
                            wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_cast_end', id: playerId })); });
                            return;
                        }

                        if (hasMA1 || hasMA3) {
                            // Intervalos: meteoro 1 (0), 2 (0.4s), 3 (0.2s), 4 (0.1s), 5 (junto com 4)
                            const baseIntervalos = [0, 400, 600, 700, 700];
                            const extraIntervalos = [850, 950, 1050, 1150, 1200];
                            const totalMeteoros = hasMA3 ? 10 : 5;
                            const listaTempos = hasMA3 ? baseIntervalos.concat(extraIntervalos) : baseIntervalos;

                            for (let mIdx = 0; mIdx < totalMeteoros; mIdx++) {
                                setTimeout(() => {
                                    const dono = players[playerId];
                                    if (!dono || dono.hp <= 0) return;
                                    const offAng = Math.random() * Math.PI * 2;
                                    const offDist = (mIdx === 0) ? 0 : (Math.random() * 45 + 15);
                                    const mx = tx + Math.cos(offAng) * offDist;
                                    const my = ty + Math.sin(offAng) * offDist;

                                    wss.clients.forEach(c => {
                                        if (c.readyState === WebSocket.OPEN) {
                                            c.send(JSON.stringify({
                                                type: 'action_mago_meteoro_queda',
                                                id: playerId, x: mx, y: my, isGrande: (mIdx === totalMeteoros - 1),
                                                shake: 12, microStun: hasMA3
                                            }));
                                        }
                                    });

                                    slimes.forEach(slime => {
                                        if (slime.hp > 0 && Math.hypot(slime.x - mx, slime.y - my) < 85) {
                                            registrarDanoMonstro(slime, playerId, danoMeteoro, 'player');
                                            if (hasMA3) {
                                                slime.stunTimer = Math.max(slime.stunTimer || 0, 10);
                                                efeitos.aplicarEfeito(slime, 'stun', 10, 1);
                                            }
                                        }
                                    });
                                    danoEmBosses(mx, my, 95, playerId, danoMeteoro, 'skill', 'player');
                                    bosses.forEach(bs => {
                                        if (bs.hp > 0 && Math.hypot(bs.x - mx, bs.y - my) < 95) {
                                            if (hasMA3) {
                                                bs.stunTimer = Math.max(bs.stunTimer || 0, 10);
                                                efeitos.aplicarEfeito(bs, 'stun', 10, 1);
                                            }
                                        }
                                    });
                                }, listaTempos[mIdx]);
                            }

                            // Tier 4 A: Cometa Gigante Final após todos os meteoros
                            if (hasMA4) {
                                const delayCometa = (hasMA3 ? 1200 : 700) + 500;
                                setTimeout(() => {
                                    const dono = players[playerId];
                                    if (!dono || dono.hp <= 0) return;
                                    wss.clients.forEach(c => {
                                        if (c.readyState === WebSocket.OPEN) {
                                            c.send(JSON.stringify({
                                                type: 'action_mago_cometa_gigante',
                                                id: playerId, x: tx, y: ty, raio: 140, duracaoChamas: 10000
                                            }));
                                        }
                                    });
                                    // Impacto do Cometa após descida lenta (2000ms)
                                    setTimeout(() => {
                                        const d = players[playerId];
                                        if (!d || d.hp <= 0) return;
                                        const danoCometa = Math.round(danoMeteoro * 2.2);
                                        slimes.forEach(slime => {
                                            if (slime.hp > 0 && Math.hypot(slime.x - tx, slime.y - ty) < 140) {
                                                registrarDanoMonstro(slime, playerId, danoCometa, 'player');
                                            }
                                        });
                                        danoEmBosses(tx, ty, 150, playerId, danoCometa, 'skill', 'player');
                                        meteorFires.push({ x: tx, y: ty, ownerId: playerId, expiresAt: Date.now() + 10000, nextTick: Date.now() + 1000, dano: Math.round(danoMeteoro * 0.8) });
                                    }, 2000);
                                }, delayCometa);
                            } else {
                                meteorFires.push({ x: tx, y: ty, ownerId: playerId, expiresAt: Date.now() + 5000, nextTick: Date.now() + 1000, dano: danoMeteoro });
                            }
                        } else {
                            // Meteoro Padrão
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_meteoro', id: playerId, targetX: tx, targetY: ty }));
                            });
                            setTimeout(() => {
                                const dono = players[playerId];
                                if (!dono || dono.hp <= 0) return;
                                slimes.forEach(slime => {
                                    if (slime.hp > 0 && Math.hypot(slime.x - tx, slime.y - ty) < 85) registrarDanoMonstro(slime, playerId, danoMeteoro, 'player');
                                });
                                danoEmBosses(tx, ty, 95, playerId, danoMeteoro, 'skill', 'player');
                                meteorFires.push({ x: tx, y: ty, ownerId: playerId, expiresAt: Date.now() + 5000, nextTick: Date.now() + 1000, dano: danoMeteoro });
                            }, 600);
                        }
                    }, castDur);
                }

                if (data.action === 'nevasca') {
                    const mago = players[playerId];
                    if (!mago || mago.hp <= 0) return;
                    if (!alcanceSkillValido(mago, data.targetX, data.targetY, 350)) { avisaForaAlcance(ws, 'nevasca'); return; }
                    if (!cdSkillExpirado(ws, mago, 'lastNevasca', 11500, 'nevasca')) return;
                    if (!gastarMana(ws, mago, mpSkill(mago, 'nevasca', 35))) return;
                    marcarSkillUsada(mago, 'lastNevasca');

                    const upgNev = mago.skillUpgrades || {};
                    const hasNA1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 1, 'A')); // Congela >3s por 1.5s
                    const hasNA2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 2, 'A')); // +10% Dano Mágico por 10s (acumula 3x)
                    const hasNA3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 3, 'A')); // Ataque básico de gelo
                    const hasNA4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 4, 'A')); // Estacas de gelo explodem no final
                    const hasNB1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 1, 'B')); // Funde ao fogo (queimadura sem slow)
                    const hasNB2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 2, 'B')); // Tornado de Fogo (-20% def)
                    const hasNB3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 3, 'B')); // 4 mini-tornados no final
                    const hasNB4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgNev, 'nevasca', 4, 'B')); // Tornado colossal crescente caçador 10s

                    // Tier 2 A: +10% Dano Mágico por 10s (acumula até 3x = +30%)
                    if (hasNA2) {
                        mago.nevascaBuffStacks = Math.min((mago.nevascaBuffStacks || 0) + 1, 3);
                        mago.nevascaBuffExpires = Date.now() + 10000;
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({ type: 'action_mago_aura_gelo', id: playerId, stacks: mago.nevascaBuffStacks, duracaoMs: 10000, x: mago.x, y: mago.y }));
                            }
                        });
                    }

                    const tx = Number(data.targetX), ty = Number(data.targetY);
                    const duracaoSegundos = hasNB4 ? 10 : 8;
                    const duracaoNevascaMs = duracaoSegundos * 1000;
                    const soundIdNevasca = 'nevasca_' + playerId + '_' + Date.now();
                    const danoNevasca = dmgSkill(mago, 'nevasca', 6);

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_cast_start', id: playerId, skill: 'nevasca', durMs: 1000 }));
                    });

                    setTimeout(() => {
                        const caster = players[playerId];
                        if (!caster || caster.hp <= 0) {
                            wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_cast_end', id: playerId })); });
                            return;
                        }

                        const novaNevasca = {
                            ownerId: playerId,
                            x: tx,
                            y: ty,
                            radius: 115,
                            maxRadius: hasNB4 ? 200 : 115,
                            duracao: Math.ceil(duracaoNevascaMs / 50),
                            duracaoInicial: Math.ceil(duracaoNevascaMs / 50),
                            expiresAt: Date.now() + duracaoNevascaMs,
                            soundId: soundIdNevasca,
                            danoNevasca: danoNevasca,
                            isFogo: hasNB1 || hasNB2 || hasNB3 || hasNB4,
                            isTornado: hasNB2 || hasNB3 || hasNB4,
                            crescente: hasNB4,
                            perseguidor: hasNB4,
                            miniTornados: hasNB3,
                            congelamentoProfundo: hasNA1,
                            estacasGelo: hasNA4
                        };
                        blizzards.push(novaNevasca);

                        if (novaNevasca.isTornado) {
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'action_mago_tornado_fogo',
                                        id: soundIdNevasca, x: tx, y: ty, radius: 115,
                                        duracaoMs: duracaoNevascaMs, crescente: hasNB4, perseguidor: hasNB4
                                    }));
                                }
                            });
                        } else {
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'action_nevasca',
                                        ownerId: playerId, targetX: tx, targetY: ty,
                                        radius: 115, duracaoMs: duracaoNevascaMs, soundId: soundIdNevasca,
                                        isFogo: novaNevasca.isFogo
                                    }));
                                }
                            });
                        }

                        // Tier 4 A: Estacas de Gelo erguem-se sob os inimigos
                        if (hasNA4) {
                            const posInimigos = [];
                            slimes.forEach(s => { if (s.hp > 0 && Math.hypot(s.x - tx, s.y - ty) < 115) posInimigos.push({ x: s.x, y: s.y }); });
                            bosses.forEach(b => { if (b.hp > 0 && Math.hypot(b.x - tx, b.y - ty) < 115) posInimigos.push({ x: b.x, y: b.y }); });
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_mago_estacas_gelo', x: tx, y: ty, inimigosPos: posInimigos, duracaoMs: duracaoNevascaMs }));
                                }
                            });
                        }
                    }, 1000);
                }

                if (data.action === 'mago_vulcao') {
                    let p = players[playerId];
                    if (!p || p.hp <= 0) return;
                    if (!alcanceSkillValido(p, data.targetX, data.targetY, 380)) { avisaForaAlcance(ws, 'mago_vulcao'); return; }
                    if (!p.lastVulcao) p.lastVulcao = 0;
                    if (agora - p.lastVulcao < 19500) return;
                    if (!gastarMana(ws, p, mpSkill(p, 'vulcao', 20))) return;
                    p.lastVulcao = agora;

                    const upgVul = p.skillUpgrades || {};
                    const hasVA1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 1, 'A')); // 2x fragmentos e cadência
                    const hasVA2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 2, 'A')); // Poças de larva no solo
                    const hasVA3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 3, 'A')); // 2ª explosão nos fragmentos
                    const hasVA4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 4, 'A')); // +20% área, +40% dano, Zona de Calor
                    const hasVB1 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 1, 'B')); // Despertar do Golem de Fogo por 30s
                    const hasVB2 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 2, 'B')); // Golem mão de gelo
                    const hasVB3 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 3, 'B')); // Golem rugido 10s bolha 20% HP
                    const hasVB4 = !!(SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgVul, 'vulcao', 4, 'B')); // Golem meteoros dual 5s

                    // Lado B: Transforma Vulcão no Golem Lacaio Incandescente por 30s
                    if (hasVB1) {
                        golemsMago[playerId] = {
                            active: true,
                            ownerId: playerId,
                            x: p.x - 30,
                            y: p.y - 20,
                            duracao: 30000,
                            expiresAt: Date.now() + 30000,
                            nextAtk: Date.now() + 1000,
                            nextRoar: Date.now() + 10000,
                            nextMeteor: Date.now() + 5000,
                            danoBase: 28,
                            hasGeloHand: hasVB2,
                            altMao: false,
                            hasRugido: hasVB3,
                            hasMeteoros: hasVB4
                        };
                        wss.clients.forEach(c => {
                            if (c.readyState === WebSocket.OPEN) {
                                c.send(JSON.stringify({
                                    type: 'action_mago_golem_spawn',
                                    ownerId: playerId, x: p.x - 30, y: p.y - 20,
                                    duracaoMs: 30000, hasGeloHand: hasVB2
                                }));
                            }
                        });
                        return;
                    }

                    let danoBase = dmgSkill(p, 'vulcao', 18);
                    if (hasVA4) danoBase = Math.round(danoBase * 1.40);
                    let dotBase = dmgSkill(p, 'vulcao', 4);
                    let vx = Number(data.targetX), vy = Number(data.targetY);
                    let raioVulcao = hasVA4 ? Math.round(140 * 1.20) : 140;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'action_mago_cast_start', id: playerId, skill: 'vulcao', durMs: 1000 }));
                        }
                    });

                    setTimeout(() => {
                        let caster = players[playerId];
                        if (!caster || caster.hp <= 0) {
                            wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'action_mago_cast_end', id: playerId })); });
                            return;
                        }

                        vulcoes.push({
                            ownerId: playerId, x: vx, y: vy,
                            radius: raioVulcao, duracao: 200, tickCounter: 0,
                            danoImpacto: danoBase, danoDot: dotBase,
                            emergindo: 30, projeteis: [],
                            upgrades: {
                                cadenciaDupla: hasVA1,
                                pocasLava: hasVA2,
                                segundaExplosao: hasVA3,
                                zonaCalor: hasVA4
                            }
                        });

                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_vulcao', targetX: vx, targetY: vy, radius: raioVulcao, duracao: 200, ownerId: playerId }));
                            }
                        });

                        // Tier 2 A: Poças de larva no solo ao redor
                        if (hasVA2) {
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_mago_vulcao_pocas', x: vx, y: vy, raio: raioVulcao, duracaoMs: 10000 }));
                                }
                            });
                        }

                        // Tier 4 A: Zona de Calor enfraquecedora
                        if (hasVA4) {
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_mago_vulcao_zona_calor', x: vx, y: vy, raio: 220, duracaoMs: 10000 }));
                                }
                            });
                        }
                    }, 1000);
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
                    if (lacaios[playerId] && (lacaios[playerId].sismicoAtivo || (players[playerId] && players[playerId].golemSismicoAtivo))) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'esmagamento', 25))) return;
                    if (lacaios[playerId] && lacaios[playerId].skillCooldown === 0) {
                        lacaios[playerId].skillCooldown = 120;
                        let ogro = lacaios[playerId];
                        let player = players[playerId];
                        let upgrades = (player && player.skillUpgrades) || {};
                        ogro.modoAgressivoTimer = 140;

                        // Tier 2 A: Colisão Tectônica (puxa inimigos em raio 160 em direção ao Golem)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 2, 'A')) {
                            slimes.forEach(slime => {
                                if (slime.hp > 0 && Math.hypot(slime.x - ogro.x, slime.y - ogro.y) < 160) {
                                    let ang = Math.atan2(ogro.y - slime.y, ogro.x - slime.x);
                                    moverMonstroDirecionalComDesvio(slime, Math.cos(ang), Math.sin(ang), 45);
                                }
                            });
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_summoner_pulso_magnetico', x: ogro.x, y: ogro.y, raio: 160 }));
                                }
                            });
                        }

                        // Tier 4 B: Martelo do Colosso (canaliza tremor no braço: próximo soco básico tem +70% dano e VFX massivo)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 4, 'B')) {
                            ogro.marteloColossoAtivo = true;
                            ogro.marteloColossoExpires = Date.now() + 6000;
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_summoner_martelo_colosso_ready', pid: playerId, x: ogro.x, y: ogro.y }));
                                }
                            });
                        }

                        // Tier 4 A: Colapso Territorial (zona instável por 3s com 50% slow e implosão final com puxão forte)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 4, 'A')) {
                            summonerColapsos.push({
                                id: proximoSummonerEntidadeId++,
                                ownerId: playerId,
                                x: ogro.x,
                                y: ogro.y,
                                raio: 110,
                                danoFinal: Math.round(dmgSkill(player, 'esmagamento', 45) * 0.8),
                                expires: Date.now() + 3000,
                                mapa: player.mapa,
                                instanciaId: player.instanciaId
                            });
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_summoner_colapso_territorial', x: ogro.x, y: ogro.y, raio: 110, duracao: 3000 }));
                                }
                            });
                        }

                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'action_ogro_sismico', x: ogro.x, y: ogro.y }));
                            }
                        });

                        let raioEsmaga = 100;
                        let danoPetSis = Math.round(dmgSkill(player, 'esmagamento', 45));
                        let alvosAtingidos = 0;

                        slimes.forEach(slime => {
                            let dist = Math.hypot(slime.x - ogro.x, slime.y - ogro.y);
                            if (slime.hp > 0 && dist < raioEsmaga) {
                                alvosAtingidos++;
                                let danoFinalAlvo = danoPetSis;
                                let stunTicks = 30;

                                // Tier 2 B: Fratura Exposta (Debuff Fraturado 4s: carapaça rompida, +15% dano de socos do Golem)
                                if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 2, 'B')) {
                                    slime.fraturaExpostaExpires = Date.now() + 4000;
                                    slime.reducaoDefTimer = 80;
                                }

                                // Tier 3 B: Fratura Defensiva (Reduz Defesa Física em 12% por 4s)
                                if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 3, 'B')) {
                                    slime.fraturaDefensivaExpires = Date.now() + 4000;
                                    slime.reducaoDefTimer = 80;
                                }

                                let r = registrarDanoMonstro(slime, playerId, danoFinalAlvo, 'pet');
                                broadcastDanoLacaio(slime.x, slime.y, r ? r.dano : danoFinalAlvo);
                                slime.stunTimer = Math.max(slime.stunTimer || 0, stunTicks);
                                ogro.targetSlimeId = slime.id;
                            }
                        });

                        let dbSis = danoEmBosses(ogro.x, ogro.y, raioEsmaga + 15, playerId, danoPetSis, 'skill', 'pet');
                        if (dbSis) {
                            broadcastDanoLacaio(dbSis.x, dbSis.y, dbSis.dano);
                            bosses.forEach(b => {
                                if (b.hp > 0 && Math.hypot(b.x - ogro.x, b.y - ogro.y) < raioEsmaga + 15) {
                                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 2, 'B')) {
                                        b.fraturaExpostaExpires = Date.now() + 4000;
                                    }
                                    if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 3, 'B')) {
                                        b.fraturaDefensivaExpires = Date.now() + 4000;
                                    }
                                }
                            });
                        }

                        // Tier 1 A: Fenda Persistente (solo por 4s causando 15 dano/s e 25% lentidão)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 1, 'A')) {
                            summonerFendas.push({
                                id: proximoSummonerEntidadeId++,
                                ownerId: playerId,
                                x: ogro.x,
                                y: ogro.y,
                                raio: 90,
                                dano: 15,
                                lentidao: 0.25,
                                expires: Date.now() + 4000,
                                nextTick: Date.now() + 1000,
                                mapa: player.mapa,
                                instanciaId: player.instanciaId
                            });
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_summoner_fenda', x: ogro.x, y: ogro.y, raio: 90, duracao: 4000 }));
                                }
                            });
                        }

                        // Tier 1 B: Impacto Duplo (0.8s após impacto, 60% dano em área +20%)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 1, 'B')) {
                            summonerImpactosAtrasados.push({
                                ownerId: playerId,
                                x: ogro.x,
                                y: ogro.y,
                                triggerAt: Date.now() + 800,
                                dano: Math.round(danoPetSis * 0.60),
                                raio: Math.round(raioEsmaga * 1.20),
                                mapa: player.mapa,
                                instanciaId: player.instanciaId
                            });
                        }

                        // Tier 3 B: Fissura Ecoante (até 5 mini-fissuras causando 20 de dano)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 3, 'B')) {
                            let ecos = Math.min(5, Math.max(1, alvosAtingidos));
                            for (let ei = 0; ei < ecos; ei++) {
                                let angEco = (ei / ecos) * Math.PI * 2;
                                let txEco = ogro.x + Math.cos(angEco) * 120;
                                let tyEco = ogro.y + Math.sin(angEco) * 120;
                                slimes.forEach(s => {
                                    if (s.hp > 0 && Math.hypot(s.x - txEco, s.y - tyEco) < 40) {
                                        let r = registrarDanoMonstro(s, playerId, 20, 'pet');
                                        broadcastDanoLacaio(s.x, s.y, r.dano);
                                    }
                                });
                            }
                        }

                        // Tier 4 B: Terremoto Devastador (3 direções quebrando o solo causando 35 dano)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 4, 'B')) {
                            for (let ti = 0; ti < 3; ti++) {
                                let angT = ti * ((Math.PI * 2) / 3);
                                let txT = ogro.x + Math.cos(angT) * 180;
                                let tyT = ogro.y + Math.sin(angT) * 180;
                                slimes.forEach(s => {
                                    if (s.hp > 0 && Math.hypot(s.x - txT, s.y - tyT) < 60) {
                                        let r = registrarDanoMonstro(s, playerId, 35, 'pet');
                                        broadcastDanoLacaio(s.x, s.y, r.dano);
                                    }
                                });
                            }
                            wss.clients.forEach(c => {
                                if (c.readyState === WebSocket.OPEN) {
                                    c.send(JSON.stringify({ type: 'action_summoner_terremoto_3way', x: ogro.x, y: ogro.y }));
                                }
                            });
                        }
                    }
                }

                if (data.action === 'comando_ogro_colossal') {
                    if (lacaios[playerId] && (lacaios[playerId].sismicoAtivo || (players[playerId] && players[playerId].golemSismicoAtivo))) return;
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
                    if (lacaios[playerId] && (lacaios[playerId].sismicoAtivo || (players[playerId] && players[playerId].golemSismicoAtivo))) return;
                    if (!gastarMana(ws, players[playerId], mpSkill(players[playerId], 'salto', 20))) return;
                    if (lacaios[playerId] && !lacaios[playerId].isJumping && lacaios[playerId].skill2Cooldown === 0) {
                        let ogro = lacaios[playerId];
                        let player = players[playerId];
                        let upgrades = (player && player.skillUpgrades) || {};
                        ogro.modoAgressivoTimer = 160;

                        // Tier 3 A: Salto de Recuo / Reposicionamento (se próximo à invocadora < 120px, concede escudo 40 HP por 4s)
                        if (SkillUpgradeTree && SkillUpgradeTree.temUpgrade(upgrades, 'salto', 3, 'A')) {
                            if (Math.hypot(ogro.x - player.x, ogro.y - player.y) < 120) {
                                player.escudoSummoner = Math.max(player.escudoSummoner || 0, 40);
                                player.escudoSummonerExpires = Date.now() + 4000;
                                wss.clients.forEach(c => {
                                    if (c.readyState === WebSocket.OPEN) {
                                        c.send(JSON.stringify({ type: 'action_summoner_escudo_invocadora', x: Math.round(player.x), y: Math.round(player.y), duracao: 4000 }));
                                    }
                                });
                            }
                        }

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
                            const donoNoMundoBiomas = mapaMundo && mapaMundo.isMundo(
                                player.x + PLAYER_OFFSET_X,
                                player.y + PLAYER_OFFSET_Y
                            );
                            if (donoNoMundoBiomas) {
                                txSalto = Math.max(LARGURA_MUNDO + 40, Math.min(FIM_MUNDO - 40, txSalto));
                                tySalto = Math.max(TOPO_MUNDO + 40, Math.min(ALTO_MUNDO - 40, tySalto));
                            } else {
                                txSalto = Math.max(20, Math.min(WORLD_WIDTH - 40, txSalto));
                                tySalto = Math.max(20, Math.min(WORLD_HEIGHT - 40, tySalto));
                            }
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
                const biomasDoMapa = mapaMundo && mapaMundo.CENTROS_BIOMAS;
                if (biomasDoMapa && Object.prototype.hasOwnProperty.call(biomasDoMapa, data.mapa) && !ws.ehAdminCliente) {
                    ws.send(JSON.stringify({ type: 'teleporte_recusado', mapa: data.mapa }));
                    return;
                }
                if (!jogadorPodeUsarPortalMapa(players[playerId], data.mapa)) {
                    ws.send(JSON.stringify({ type: 'teleporte_recusado', mapa: data.mapa }));
                    return;
                }
                // Só encerra a sessão depois de validar o portal de retorno.
                if (data.mapa === 'cidade' && solariEmSessao(playerId)) solariRemoverMembro(playerId, 'portal');
                const destinoSolicitadoX = (data.mapa === 'cidade' || data.mapa === 'santuario' || data.mapa === 'mundo') ? destino.x : (destino.x + (Math.random() * 20 - 10));
                const destinoSolicitadoY = (data.mapa === 'cidade' || data.mapa === 'santuario' || data.mapa === 'mundo') ? destino.y : (destino.y + (Math.random() * 20 - 10));
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

            // ===== ARENA DE SOLARI — painel, convites, START e leilão =====
            if (data.action === 'solari_abrir') {
                if (players[playerId]) solariAbrir(playerId);
                return;
            }
            if (data.action === 'solari_convidar') {
                if (players[playerId] && data.alvoId && players[data.alvoId]) solariConvidar(playerId, data.alvoId);
                return;
            }
            if (data.action === 'solari_convidar_nick') {
                if (!players[playerId]) return;
                const nickT = String(data.nick || '').trim();
                if (!nickT) return;
                let alvoId = null;
                for (const id in players) {
                    if (players[id] && players[id].nome && players[id].nome.toLowerCase() === nickT.toLowerCase()) { alvoId = id; break; }
                }
                if (!alvoId) { ws.send(JSON.stringify({ type: 'solari_aviso', texto: 'Jogador "' + nickT + '" não encontrado.' })); return; }
                if (!solariConvidar(playerId, alvoId)) ws.send(JSON.stringify({ type: 'solari_aviso', texto: 'Não foi possível convidar (grupo cheio, já no grupo ou longe do portal).' }));
                return;
            }
            if (data.action === 'solari_aceitar') {
                if (players[playerId]) solariAceitar(playerId, data.deId);
                return;
            }
            if (data.action === 'solari_recusar') {
                if (players[playerId]) solariRecusar(playerId, data.deId);
                return;
            }
            if (data.action === 'solari_ok') { solariDarOk(playerId); return; }
            if (data.action === 'solari_start') { solariIniciar(playerId); return; }
            if (data.action === 'solari_sair') {
                if (players[playerId] && solariEmSessao(playerId)) solariRemoverMembro(playerId, 'sair');
                return;
            }
            if (data.action === 'solari_rolar_dado') {
                const sSol = solariSessaoDoJogador(playerId);
                const mSol = solariEmSessao(playerId);
                if (sSol && mSol && sSol.fase === 'leilao' && sSol.leilao && sSol.leilao.estado === 'aberto' && sSol.leilao.rolagens[playerId] === undefined) {
                    const dado = 1 + Math.floor(Math.random() * 100);
                    sSol.leilao.rolagens[playerId] = dado;
                    sSol.leilao.ultimaRolagemEm = Date.now();
                    solariBroadcast(sSol, 'solari_leilao', { fase: 'rolagem', dado: dado, quem: playerId, rolagens: sSol.leilao.rolagens, nick: players[playerId] ? players[playerId].nome : '' });
                }
                return;
            }

            if (data.action === 'toggle_pvp') {
                if (players[playerId]) {
                    players[playerId].pvpAtivo = !players[playerId].pvpAtivo;
                }
            }

            if (data.action === 'respawn') {
                // Mesma guarda do handler de respawn acima: só renasce morto.
                if (!players[playerId] || players[playerId].hp > 0) return;
                // Arena de Solari: renascer (botão) = sair da partida e voltar pra cidade
                if (solariEmSessao(playerId)) solariRemoverMembro(playerId, 'respawn');
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
                    mapa: 'mundo',
                    x: players[playerId].x,
                    y: players[playerId].y
                }));
            }
        } catch (e) {
            // Antes era catch vazio: qualquer erro (inclusive vindo de uma
            // mensagem forjada pelo cliente) sumia sem deixar rastro, e era
            // impossível detectar tentativa de exploit em produção.
            if (e instanceof SyntaxError) {
                console.warn('[WS] JSON inválido recebido (ignorado).');
            } else {
                console.error('[WS] erro ao processar mensagem de', userId || ws._contaId || '?',
                    '| action=' + ((data && data.action) || '?'), '|', (e && e.message) || e);
            }
        }
    });

    ws.on('close', () => {
        if (playerId && playerSockets[playerId] === ws && players[playerId] && userId) {
            // Arena de Solari: saiu da partida → volta pra cidade ao reconectar
            if (solariEmSessao(playerId)) {
                players[playerId].x = CIDADE_SPAWN_X;
                players[playerId].y = CIDADE_SPAWN_Y;
                players[playerId].hp = players[playerId].maxHp;
                solariRemoverMembro(playerId, 'desconexao');
            }
            Object.values(petsAtivos).forEach(function (pet) {
                if (pet && pet.owner_id === playerId) syncPetRuntimeToProfile(pet);
            });
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
                mana: players[playerId].mana,
                pets: players[playerId].petProfile.pets,
                bestiario: players[playerId].petProfile.bestiario,
                maestria: players[playerId].petProfile.maestria,
                captureState: players[playerId].petProfile.captureState,
                petActiveId: players[playerId].petActiveId
            });
            despawnPetsDoOwner(playerId);
            cancelarTrade(playerId);
            // DASH v2: a roupa de camuflagem do Sniper é estado do jogador —
            // limpo aqui para não sobrar flag ao recarregar o personagem
            limparCamuflagemSniper(playerId);
            removerJogadorDaInstanciaMapa(playerId);
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

// Forçar sempre a porta de produção do Google Login: 8080.
// Não há fallback para 8081 neste ambiente.
const PORT = Number(process.env.PORT) || 8080;

server.on('error', (err) => {
    console.error('[ERRO SERVIDOR HTTP]', err);
    process.exit(1);
});

if (!migrarIdentidadesItens) {
    throw new Error('Migração segura dos identificadores de itens indisponível; servidor não iniciado.');
}
const itemMigrationStats = migrarIdentidadesItens();
const savedItemRecords = dbCarregarTodos();
itemSystem.assertUniqueInventoryOwnership(savedItemRecords);
for (const ownerId of Object.keys(savedItemRecords)) {
    const savedCharacter = savedItemRecords[ownerId] || {};
    const inventory = savedCharacter.inventario || {};
    if (normalizarEquipamentosPorClasse(inventory, savedCharacter.classe || 'guerreiro')) {
        salvarProgresso(ownerId, { inventario: inventory });
        console.warn('[INVENTÁRIO] equipamento incompatível movido para a mochila:', ownerId);
    }
    if (Array.isArray(inventory.mochila)) {
        inventory.mochila.forEach(function (item) {
            if (!item || item.schemaVersion !== 1) return;
            const validacao = itemSystem.validateDefinitionAndInstance(item);
            if (!validacao.valid) {
                throw new Error('Item salvo inválido (' + validacao.reason + ') no personagem ' + ownerId);
            }
        });
    }
}
console.log('[LOOT] migração de identidade concluída:', itemMigrationStats);

// '0.0.0.0' obrigatorio no Render: escutar so em localhost/127.0.0.1 deixa o
// servico inalcancavel por fora. Sem host o Node ja faz isso, mas ficar
// explicito evita regressao.
server.listen(PORT, LOCAL_ID_LOGIN_ENABLED ? '127.0.0.1' : '0.0.0.0', () => {
    console.log("Servidor rodando na porta " + PORT);
});
function florimBroadcastGlobal(msg) { wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(msg)); }); }
