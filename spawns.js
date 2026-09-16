// spawns.js - Sistema de Gerenciamento de Spawns em Tempo Real (Ferramenta Admin)
// Responsável por: registro de monstros/bosses, permissão admin e persistência das bandeiras.
// A lógica de jogo (spawn/respawn/agro dentro do loop) vive no server.js, que chama este módulo.
const fs = require('fs');
const path = require('path');

const FILE_BANDEIRAS = path.join(__dirname, 'spawn_flags.json');
const FILE_ADMINS = path.join(__dirname, 'admins.json');

// ============ CARGOS / PERMISSÃO DE ADMIN ============
let _cacheAdmins = null;
function carregarAdmins() {
    if (_cacheAdmins !== null) return _cacheAdmins;
    try {
        const conteudo = fs.readFileSync(FILE_ADMINS, 'utf-8');
        const parsed = JSON.parse(conteudo || '{}');
        const lista = Array.isArray(parsed.admins) ? parsed.admins : [];
        _cacheAdmins = lista.map(function (n) { return String(n).trim(); }).filter(Boolean);
    } catch (e) {
        console.error('spawns.js: Erro ao ler admins.json:', e.message);
        _cacheAdmins = [];
    }
    return _cacheAdmins;
}

function ehAdmin(nome) {
    return carregarAdmins().indexOf(String((nome || '').trim()).toLowerCase()) !== -1;
}

// ============ REGISTRO DE MONSTROS E BOSSES ============
const TIPOS_MONSTROS = {
    melee: { nome: 'Slime Melee', emoji: '🟢', baseHp: 50, boss: false, aggroRange: 280, attackRange: 55, dano: 12, cor: '#76d7c4' },
    ranged: { nome: 'Slime Arqueiro', emoji: '🔵', baseHp: 40, boss: false, aggroRange: 380, attackRange: 9999, dano: 10, cor: '#5dade2' },
    zumbi: { nome: 'Zumbi', emoji: '🧟', baseHp: 120, boss: false, aggroRange: 320, attackRange: 50, dano: 18, cor: '#58d68d' },
    besouro_negro: { nome: 'Besouro Negro', emoji: '🪲', baseHp: 300, boss: false, aggroRange: 420, attackRange: 340, dano: 14, cor: '#17202a' },
    morcego: { nome: 'Morcego', emoji: '🦇', baseHp: 90, boss: false, aggroRange: 340, attackRange: 45, dano: 16, cor: '#5b2c6f' },
    golem_pedra: { nome: 'GOLEM DE PEDRA', emoji: '🗿', baseHp: 6000, boss: true, aggroRange: 520, attackRange: 90, dano: 45, cor: '#e74c3c' }
};

// Bioma do Besouro Negro: vive APENAS no deserto (x ∈ [1800, 3400), y ∈ [0, 1800))
const DESERTO_X_MIN = 1800;
const DESERTO_X_MAX = 3400;
const DESERTO_Y_MAX = 1800;

// ============ PERSISTÊNCIA DAS BANDEIRAS (tempo real em JSON) ============
function carregarBandeiras() {
    try {
        if (!fs.existsSync(FILE_BANDEIRAS)) return [];
        const conteudo = fs.readFileSync(FILE_BANDEIRAS, 'utf-8');
        const dados = JSON.parse(conteudo || '[]');
        return Array.isArray(dados) ? dados : [];
    } catch (e) {
        console.error('spawns.js: Erro ao ler spawn_flags.json:', e.message);
        return [];
    }
}

function salvarBandeiras(lista) {
    try {
        fs.writeFileSync(FILE_BANDEIRAS, JSON.stringify(lista, null, 2), 'utf-8');
    } catch (e) {
        console.error('spawns.js: Erro ao gravar spawn_flags.json:', e.message);
    }
}

// ============ FACTORY: objetos de monstro/boss gerados pelas bandeiras ============
function criarMonstroBandeira(flag) {
    var conf = TIPOS_MONSTROS[flag.tipo] || TIPOS_MONSTROS.melee;
    var hp = Math.max(10, Math.floor(flag.hpBase || conf.baseHp));
    var passivo = flag.comportamento !== 'agressivo';
    var mob = {
        id: 'band_' + flag.id + '_' + Math.random().toString(36).slice(2, 10),
        tipo: flag.tipo,
        x: flag.x,
        y: flag.y,
        hp: hp,
        maxHp: hp,
        targetId: null,
        respawnTimer: 0,
        attackCooldown: 0,
        stunTimer: 0,
        slowTimer: 0,
        dx: (Math.random() - 0.5) * 0.7,
        dy: (Math.random() - 0.5) * 0.7,
        patrolTimer: 0,
        tabelaDano: {},
        aggroRange: conf.aggroRange,
        attackRange: conf.attackRange,
        dano: conf.dano,
        flagId: flag.id,
        flagPassivo: passivo,
        flagAgressivo: !passivo,
        respawnTick: 1000000
    };
    if (flag.tipo === 'zumbi') {
        mob.velocidade = 3.8;
        mob.goldDrop = 3;
        mob.respawnTick = 220;
        mob.skillCharging = false;
        mob.skillChargeTimer = 0;
        mob.skillChargeMax = 20;
        mob.skillCooldown = Math.floor(40 + Math.random() * 90);
        mob.skillAim = null;
    }
    if (flag.tipo === 'besouro_negro') {
        mob.velocidade = 3.4;
        mob.goldDrop = 12;
        mob.respawnTick = 260;
        mob.skillCharging = false;
        mob.skillChargeTimer = 0;
        mob.skillChargeMax = 24; // 1.2s de carga antes do voo
        mob.skillCooldown = Math.floor(180 + Math.random() * 120);
        mob.skillAim = null;
        mob.dashing = false;
        mob.dashVx = 0;
        mob.dashVy = 0;
        mob.dashFrames = 0;
        mob.stunOnHit = 100; // 5s de stun no jogador ao colidir (20 ticks/s)
        mob.x = Math.max(DESERTO_X_MIN, Math.min(DESERTO_X_MAX - 10, mob.x));
        mob.y = Math.max(0, Math.min(DESERTO_Y_MAX - 10, mob.y));
    }
    if (flag.tipo === 'morcego') {
        mob.velocidade = 4.2;
        mob.goldDrop = 6;
        mob.respawnTick = 240;
        mob.voando = true;
        mob.alturaVoo = 0;
        mob.ziguezague = 0;
        mob.x = Math.max(5000, Math.min(6790, mob.x));
        mob.y = Math.max(0, Math.min(1790, mob.y));
    }
    return mob;
}

function criarBossBandeira(flag) {
    var hp = Math.max(50, Math.floor(flag.hpBase || TIPOS_MONSTROS.golem_pedra.baseHp));
    var passivo = flag.comportamento !== 'agressivo';
    return {
        id: 'band_' + flag.id + '_' + Math.random().toString(36).slice(2, 10),
        tipo: 'golem_pedra',
        nome: 'GOLEM DE PEDRA',
        x: flag.x,
        y: flag.y,
        angulo: 0,
        hp: hp,
        maxHp: hp,
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
        pedraX: flag.x,
        pedraY: flag.y - 30,
        tabelaDano: {},
        escudoTipo: null,
        escudoTimer: 0,
        proximoEscudo: 120,
        lastEscudo: 'azul',
        tauntId: null,
        tauntTimer: 0,
        flagId: flag.id,
        flagPassivo: passivo,
        flagAgressivo: !passivo
    };
}

module.exports = {
    TIPOS_MONSTROS: TIPOS_MONSTROS,
    carregarBandeiras: carregarBandeiras,
    salvarBandeiras: salvarBandeiras,
    ehAdmin: ehAdmin,
    criarMonstroBandeira: criarMonstroBandeira,
    criarBossBandeira: criarBossBandeira
};