// spawns.js - Sistema de Gerenciamento de Spawns em Tempo Real (Ferramenta Admin)
// Responsável por: registro de monstros/bosses, permissão admin e persistência das bandeiras.
// A lógica de jogo (spawn/respawn/agro dentro do loop) vive no server.js, que chama este módulo.
const fs = require('fs');
const path = require('path');

const FILE_BANDEIRAS = path.join(__dirname, 'spawn_flags.json');
const FILE_ADMINS = path.join(__dirname, 'admins.json');

const TAGS_MONSTRO = Object.freeze({
    tank: { nome: 'Tank', descricao: 'Monstro resistente, com muita vida.' },
    dps: { nome: 'DPS', descricao: 'Especializado em causar dano.' },
    arqueiros: { nome: 'Arqueiros', descricao: 'Causa dano físico à distância.' },
    magos: { nome: 'Magos', descricao: 'Ataca à distância com dano mágico.' },
    assassinos: { nome: 'Assassinos', descricao: 'Rápido; prioriza curandeiros e atacantes à distância.' },
    noturno: { nome: 'Noturno', descricao: 'Ativo durante a madrugada; descansa durante o dia.' },
    diurno: { nome: 'Diurno', descricao: 'Ativo durante o dia; descansa entre 23:00 e 06:00.' },
    invenciveis: { nome: 'Invencíveis', descricao: 'Não recebe dano e não pode ser derrotado.' },
    hibridos: { nome: 'Híbridos', descricao: 'Combina ataques físicos, mágicos, corpo a corpo ou à distância.' },
    healers: { nome: 'Healers', descricao: 'Cura outros monstros.' },
    buffers: { nome: 'Buffers', descricao: 'Aplica benefícios a outros monstros.' },
    debuffers: { nome: 'Debuffers', descricao: 'Aplica efeitos negativos aos jogadores.' },
    elite: { nome: 'Elite', descricao: 'Exibe a barra de vida de elite na interface.' },
    boss: { nome: 'Boss', descricao: 'Exibe a barra de vida de boss na interface.' },
    voadores: { nome: 'Voadores', descricao: 'Monstros que voam e podem atravessar colisões do mapa.' }
});

// ============ CARGOS / PERMISSÃO DE ADMIN ============
let _cacheAdmins = null;
function carregarAdmins() {
    if (_cacheAdmins !== null) return _cacheAdmins;
    try {
        const conteudo = fs.readFileSync(FILE_ADMINS, 'utf-8');
        const parsed = JSON.parse(conteudo || '{}');
        const lista = Array.isArray(parsed.admins) ? parsed.admins : [];
        _cacheAdmins = lista.map(function (n) { return String(n).trim().toLowerCase(); }).filter(Boolean);
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
    slime: {
        nome: 'Slime',
        emoji: '🟢',
        nivel: 1,
        baseHp: 80,
        dano: 8,
        boss: false,
        ehMelee: true,
        aggroRange: 320,
        attackRange: 48,
        velocidade: 1.4,
        cadenciaAtk: 45,
        xpBase: 35,
        cor: '#7fcf45',
        bioma: 'Planície das Plantas (Santuário)',
        asset: 'slime',
        aiManaged: true,
        radius: 14,
        tags: ['diurno']
    },
    slime_elite: {
        nome: 'Slime Elite',
        emoji: '👑',
        nivel: 1,
        baseHp: 8000,
        dano: 48,
        boss: false,
        maxQtd: 1,
        ehMelee: true,
        aggroRange: 460,
        attackRange: 48,
        velocidade: 1.4,
        cadenciaAtk: 45,
        xpBase: 210,
        cor: '#b6ff55',
        bioma: 'Planície das Plantas (Santuário)',
        asset: 'slime_elite_729c5814',
        aiManaged: true,
        escala: 2.16,
        radius: 25,
        tags: ['elite']
    },
    besouro_dourado: {
        nome: 'Besouro Dourado',
        emoji: '🪲',
        nivel: 10,
        baseHp: 1800,
        dano: 42,
        boss: false,
        ehMelee: true,
        aggroRange: 380,
        attackRange: 48,
        velocidade: 1.5,
        cadenciaAtk: 50,
        xpBase: 110,
        cor: '#d6ad35',
        bioma: 'Deserto Escaldante',
        asset: 'besouro dourado_f71ed54d',
        aiManaged: true,
        radius: 18,
        tags: ['tank', 'diurno', 'debuffers']
    },
    escorpiao_escaldante: {
        nome: 'Escorpião Escaldante',
        emoji: '🦂',
        nivel: 12,
        baseHp: 2200,
        dano: 56,
        boss: false,
        ehMelee: true,
        aggroRange: 500,
        attackRange: 48,
        velocidade: 1.7,
        cadenciaAtk: 50,
        xpBase: 145,
        cor: '#b87545',
        bioma: 'Deserto Escaldante',
        asset: 'escorpiao patas marrom_c0792507',
        aiManaged: true,
        radius: 25,
        tags: ['dps', 'hibridos', 'buffers', 'noturno']
    },
    formiga_sauva: {
        nome: 'Formiga Saúva',
        emoji: '🐜',
        nivel: 10,
        baseHp: 1100,
        dano: 32,
        boss: false,
        ehMelee: true,
        aggroRange: 360,
        attackRange: 42,
        velocidade: 2.1,
        cadenciaAtk: 38,
        xpBase: 100,
        cor: '#815033',
        bioma: 'Deserto Escaldante',
        asset: 'formiga a_4f74a16a',
        aiManaged: true,
        radius: 16,
        tags: ['assassinos', 'diurno', 'buffers']
    },
    besouro_negro_deserto: {
        nome: 'Besouro Negro',
        emoji: '🪲',
        nivel: 25,
        baseHp: 30000,
        dano: 115,
        boss: false,
        maxQtd: 1,
        ehMelee: true,
        aggroRange: 600,
        attackRange: 58,
        velocidade: 1.5,
        cadenciaAtk: 48,
        xpBase: 2500,
        cor: '#282a2d',
        bioma: 'Deserto Escaldante',
        asset: 'rolabosta_e5b819e6',
        aiManaged: true,
        escala: 2.7,
        radius: 28,
        tags: ['elite', 'debuffers', 'noturno', 'tank']
    },
    cogumelo_proibido: {
        nome: 'Cogumelo Proibido',
        emoji: '🍄',
        nivel: 14,
        baseHp: 1600,
        dano: 48,
        boss: false,
        ehMelee: false,
        aggroRange: 520,
        attackRange: 420,
        distanciaPreferida: 280,
        velocidade: 1.35,
        cadenciaAtk: 65,
        petAttackSkill: {
            projectileType: 'cogumelo_veneno',
            projectileSpeed: 8,
            projectileLife: 80,
            cooldownMs: 3250
        },
        xpBase: 180,
        cor: '#ba59d1',
        bioma: 'Selva Proibida',
        asset: 'cogumelo_50cc70dc',
        aiManaged: true,
        radius: 20,
        tags: ['magos', 'diurno', 'healers', 'buffers']
    },
    anaconda_selvagem: {
        nome: 'Anaconda Selvagem',
        emoji: '🐍',
        nivel: 15,
        baseHp: 2600,
        dano: 64,
        boss: false,
        ehMelee: true,
        aggroRange: 440,
        attackRange: 58,
        velocidade: 3.6,
        cadenciaAtk: 38,
        xpBase: 190,
        cor: '#4c9b45',
        bioma: 'Selva Proibida',
        asset: 'anaconda_b42dd2b8',
        aiManaged: true,
        radius: 22,
        tags: ['assassinos', 'diurno']
    },
    jararaca: {
        nome: 'Jararaca',
        emoji: '🐍',
        nivel: 13,
        baseHp: 1900,
        dano: 52,
        boss: false,
        ehMelee: true,
        aggroRange: 420,
        attackRange: 52,
        velocidade: 3.0,
        cadenciaAtk: 27,
        xpBase: 155,
        cor: '#a36b3f',
        bioma: 'Selva Proibida',
        asset: 'anaconda_marrom_53b6e531',
        aiManaged: true,
        radius: 19,
        tags: ['assassinos', 'diurno']
    },
    louvadermi: {
        nome: 'Louvadermi',
        emoji: '🦗',
        nivel: 16,
        baseHp: 2100,
        dano: 58,
        boss: false,
        ehMelee: false,
        aggroRange: 480,
        attackRange: 390,
        distanciaPreferida: 280,
        velocidade: 1.9,
        cadenciaAtk: 42,
        petAttackSkill: {
            projectileType: 'louva_folha',
            projectileSpeed: 11,
            projectileLife: 80,
            cooldownMs: 2100
        },
        xpBase: 205,
        cor: '#76a63b',
        bioma: 'Selva Proibida',
        asset: 'louva deus_dd5845ad',
        aiManaged: true,
        radius: 20,
        tags: ['arqueiros', 'noturno', 'debuffers']
    }
};

// Bioma do Besouro Negro: vive APENAS no deserto (x ∈ [1800, 3400), y ∈ [0, 1800))
const DESERTO_X_MIN = 1800;
const DESERTO_X_MAX = 3400;
const DESERTO_Y_MAX = 1800;

// ============ CONFIG EDITÁVEL DOS MOBS (aba "EDIT MOOB") ============
// Cada tipo ganha um dicionário editável em tempo real (arquivo JSON).
// `getMonstroConfig(tipo)` mescla o base fixo (TIPOS_MONSTROS) com as edições.
const FILE_MONSTROS = path.join(__dirname, 'monster_configs.json');

const CADENCIA_POR_TIPO = {};

const VELOCIDADE_POR_TIPO = {};

const EHEMELLE_POR_TIPO = {};

const DEBUFFS_INICIAIS = {};

const IMUNES_INICIAIS = {};

function montarBaseEditavel() {
    var base = {};
    for (var tipo in TIPOS_MONSTROS) {
        if (!Object.prototype.hasOwnProperty.call(TIPOS_MONSTROS, tipo)) continue;
        var c = TIPOS_MONSTROS[tipo];
        base[tipo] = {
            nome: c.nome,
            emoji: c.emoji || '👾',
            nivel: c.nivel || 1,
            baseHp: c.baseHp || 50,
            dano: c.dano || 12,
            defesa: 0,                       // % de redução de dano recebido (0-90)
            block: 0,                        // % de chance de bloquear ataque (0-90)
            aggroRange: c.aggroRange || 320,
            attackRange: c.attackRange || 55,
            velocidade: VELOCIDADE_POR_TIPO[tipo] || c.velocidade || 2.2,
            cadenciaAtk: CADENCIA_POR_TIPO[tipo] || 45,
            velAtk: 1,                       // multiplicador da animação/lunge de ataque
            velProjetil: 11,
            ehMelee: EHEMELLE_POR_TIPO[tipo] !== false,
            xpBase: c.xpBase || ((tipo === 'golem_pedra') ? 1500 : 35),
            tags: Array.isArray(c.tags) ? c.tags.slice() : [],
            aiManaged: !!c.aiManaged,
            escala: 1,                       // tamanho visual (0.2 a 6)
            cor: c.cor || '#ffffff',
            imuneDebuffs: (IMUNES_INICIAIS[tipo] || []).slice(),
            debuffsAplicados: JSON.parse(JSON.stringify(DEBUFFS_INICIAIS[tipo] || [])),
            buffsAplicados: [],
            efeitoVisual: 'none',
            vfxCor: c.cor || '#ffffff',
            vfxIntensidade: 1,
            drops: [],                       // [{ item: 'ouro', chance: 50 }, ...]
            escala: c.escala || 1
        };
    }
    return base;
}

let MONSTROS_EDITAVEIS = montarBaseEditavel();

function carregarMonstrosConfig() {
    try {
        if (!fs.existsSync(FILE_MONSTROS)) return;
        const conteudo = fs.readFileSync(FILE_MONSTROS, 'utf-8');
        const dados = JSON.parse(conteudo || '{}');
        if (!dados || typeof dados !== 'object') return;
        for (var tipo in dados) {
            if (!MONSTROS_EDITAVEIS[tipo] || !dados[tipo]) continue;
            for (var k in dados[tipo]) MONSTROS_EDITAVEIS[tipo][k] = dados[tipo][k];
        }
    } catch (e) {
        console.error('spawns.js: Erro ao ler monster_configs.json:', e.message);
    }
}
carregarMonstrosConfig();

function salvarMonstrosConfig() {
    try {
        fs.writeFileSync(FILE_MONSTROS, JSON.stringify(MONSTROS_EDITAVEIS, null, 2), 'utf-8');
    } catch (e) {
        console.error('spawns.js: Erro ao gravar monster_configs.json:', e.message);
    }
}

// Restaura o tipo para a config PADRÃO (ignora o que foi editado) e persiste.
function resetarMonstroConfig(tipo) {
    if (!MONSTROS_EDITAVEIS[tipo]) return null;
    var base = montarBaseEditavel();
    if (!base[tipo]) return MONSTROS_EDITAVEIS[tipo];
    MONSTROS_EDITAVEIS[tipo] = JSON.parse(JSON.stringify(base[tipo]));
    salvarMonstrosConfig();
    return MONSTROS_EDITAVEIS[tipo];
}

function getMonstroConfig(tipo) {
    var base = TIPOS_MONSTROS[tipo];
    if (!base) throw new Error('Tipo de monstro não cadastrado: ' + tipo);
    var edit = MONSTROS_EDITAVEIS[tipo] || {};
    var conf = {};
    for (var a in base) conf[a] = base[a];
    for (var b in edit) conf[b] = edit[b];
    conf.tipo = tipo;
    conf.boss = !!base.boss;
    conf.tags = Array.isArray(conf.tags)
        ? conf.tags.filter(function (tag) { return Object.prototype.hasOwnProperty.call(TAGS_MONSTRO, tag); })
        : [];
    return conf;
}

// Itens que o editor de drops aceita (chave -> gerador)
const DROPS_TIPOS = [
    ['ouro', '🪙 Ouro'], ['pocao_hp', '🧪 Poção HP'], ['pocao_mp', '💧 Poção MP'],
    ['pedra_upgrade', '💎 Pedra de Upgrade'], ['equipamento', '⚔️ Equipamento aleatório']
];

// ============ PERSISTÊNCIA DAS BANDEIRAS (tempo real em JSON) ============
function carregarBandeiras() {
    try {
        if (!fs.existsSync(FILE_BANDEIRAS)) return [];
        const conteudo = fs.readFileSync(FILE_BANDEIRAS, 'utf-8');
        const dados = JSON.parse(conteudo || '[]');
        if (!Array.isArray(dados)) return [];
        const validas = dados.filter(function (flag) { return flag && TIPOS_MONSTROS[flag.tipo]; });
        if (validas.length !== dados.length) salvarBandeiras(validas);
        return validas;
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
    var conf = getMonstroConfig(flag.tipo);
    var hp = Math.max(10, Math.floor(flag.hpBase || conf.baseHp));
    var passivo = flag.comportamento !== 'agressivo';
    var mob = {
        id: 'band_' + flag.id + '_' + Math.random().toString(36).slice(2, 10),
        tipo: flag.tipo,
        nome: conf.nome,
        cor: conf.cor || '#ffffff',
        nivel: conf.nivel || 1,
        tags: conf.tags.slice(),
        asset: TIPOS_MONSTROS[flag.tipo].asset || null,
        aiManaged: !!conf.aiManaged,
        elite: conf.tags.indexOf('elite') !== -1,
        bioma: TIPOS_MONSTROS[flag.tipo].bioma || null,
        raioColisao: TIPOS_MONSTROS[flag.tipo].radius || 12,
        x: flag.x,
        y: flag.y,
        origemX: flag.x,
        origemY: flag.y,
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
        aiEstado: 'idle',
        aiDormindo: false,
        aiEstadoTimer: 0,
        aiPatrolX: flag.x,
        aiPatrolY: flag.y,
        aiIsNight: false,
        _velocidadeBase: conf.velocidade || 2.2,
        tabelaDano: {},
        aggroRange: conf.aggroRange,
        attackRange: conf.attackRange,
        dano: conf.dano,
        nivelMinimo: conf.nivelMinimo || 1,
        arquetipo: conf.arquetipo || null,
        velocidade: conf.velocidade || 2.2,
        distanciaPreferida: conf.distanciaPreferida || null,
        skillRange: conf.skillRange || null,
        skillCooldownMax: conf.skillCooldown || 200,
        skillCooldown: Math.floor(30 + Math.random() * 90),
        petAttackSkill: conf.petAttackSkill ? Object.assign({}, conf.petAttackSkill) : null,
        fleeDistance: conf.fleeDistance || null,
        poisonDuration: conf.poisonDuration || 400,
        ignoreMapCollision: Array.isArray(conf.tags) && conf.tags.includes('voadores'),
        imuneControle: !!conf.imuneControle,
        resistenciaControle: conf.resistenciaControle || 0,
        invisivel: false,
        efeitos: [],
        flagId: flag.id,
        flagPassivo: passivo,
        flagAgressivo: !passivo,
        respawnTick: 1000000,
        // ===== EDITOR "EDIT MOOB" (tempo real) =====
        defesa: conf.defesa || 0,
        block: conf.block || 0,
        xpBase: conf.xpBase || 35,
        escala: conf.escala || 1,
        velAtk: conf.velAtk || 1,
        velProjetil: conf.velProjetil || 11,
        cadenciaAtk: conf.cadenciaAtk || 45,
        ehMelee: conf.ehMelee !== false,
        imuneDebuffs: Array.isArray(conf.imuneDebuffs) ? conf.imuneDebuffs.slice() : [],
        debuffsAplicados: Array.isArray(conf.debuffsAplicados) ? conf.debuffsAplicados.slice() : [],
        buffsAplicados: Array.isArray(conf.buffsAplicados) ? conf.buffsAplicados.slice() : [],
        efeitoVisual: conf.efeitoVisual || 'none',
        vfxCor: conf.vfxCor || conf.cor || '#ffffff',
        vfxIntensidade: conf.vfxIntensidade || 1,
        tags: Array.isArray(conf.tags) ? conf.tags.slice() : [],
        drops: Array.isArray(conf.drops) ? conf.drops.slice() : []
    };
    if (conf.maxQtd) mob.maxSpawnQtd = conf.maxQtd;
    if (flag.tipo === 'zumbi') {
        mob.velocidade = conf.velocidade || 3.8;
        mob.goldDrop = 3;
        mob.respawnTick = 220;
        mob.skillCharging = false;
        mob.skillChargeTimer = 0;
        mob.skillChargeMax = 20;
        mob.skillCooldown = Math.floor(40 + Math.random() * 90);
        mob.skillAim = null;
    }
    if (flag.tipo === 'besouro_negro') {
        mob.velocidade = conf.velocidade || 3.4;
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
    if (flag.tipo === 'morcego' || flag.tipo === 'morcegote') {
        mob.velocidade = conf.velocidade || 4.2;
        mob.goldDrop = flag.tipo === 'morcegote' ? 10 : 6;
        mob.respawnTick = 240;
        mob.voando = true;
        mob.alturaVoo = 0;
        mob.ziguezague = 0;
        if (flag.tipo === 'morcego') {
            mob.x = Math.max(5000, Math.min(6790, mob.x));
            mob.y = Math.max(0, Math.min(1790, mob.y));
        }
    }
    if (flag.tipo === 'soldado_lanceiro') {
        mob.skillCooldown = Math.floor(70 + Math.random() * 80);
        mob.skillChargeMax = 20;
        mob.skillChargeTimer = 0;
        mob.skillCharging = false;
        mob.skillAim = null;
        mob.skillKind = null;
        mob.lanceiroFaceAngle = 0;
        mob.lanceiroDashing = false;
        mob.lanceiroDashVx = 0;
        mob.lanceiroDashVy = 0;
        mob.lanceiroDashFrames = 0;
        mob.lanceiroDashHit = false;
        mob.lanceiroBloqueando = false;
        mob.lanceiroBlockTimer = 0;
        mob.lanceiroBlockCooldown = 90;
        mob.escudoFrontal = true;
    }
    return mob;
}

function criarBossBandeira(flag) {
    var conf = getMonstroConfig('golem_pedra');
    var hp = Math.max(50, Math.floor(flag.hpBase || conf.baseHp));
    var passivo = flag.comportamento !== 'agressivo';
    return {
        id: 'band_' + flag.id + '_' + Math.random().toString(36).slice(2, 10),
        tipo: 'golem_pedra',
        nome: conf.nome || 'GOLEM DE PEDRA',
        tags: Array.isArray(conf.tags) ? conf.tags.slice() : [],
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
        flagAgressivo: !passivo,
        // ===== EDITOR "EDIT MOOB" (tempo real) =====
        defesa: conf.defesa || 0,
        block: conf.block || 0,
        xpBase: conf.xpBase || 1500,
        escala: conf.escala || 1,
        velAtk: conf.velAtk || 1,
        velProjetil: conf.velProjetil || 11,
        cadenciaAtk: conf.cadenciaAtk || 65,
        ehMelee: conf.ehMelee !== false,
        imuneDebuffs: Array.isArray(conf.imuneDebuffs) ? conf.imuneDebuffs.slice() : [],
        debuffsAplicados: Array.isArray(conf.debuffsAplicados) ? conf.debuffsAplicados.slice() : [],
        buffsAplicados: Array.isArray(conf.buffsAplicados) ? conf.buffsAplicados.slice() : [],
        efeitoVisual: conf.efeitoVisual || 'none',
        vfxCor: conf.vfxCor || conf.cor || '#ffffff',
        vfxIntensidade: conf.vfxIntensidade || 1,
        drops: Array.isArray(conf.drops) ? conf.drops.slice() : []
    };
}

module.exports = {
    TAGS_MONSTRO: TAGS_MONSTRO,
    TIPOS_MONSTROS: TIPOS_MONSTROS,
    MONSTROS_EDITAVEIS: MONSTROS_EDITAVEIS,
    resetarMonstroConfig: resetarMonstroConfig,
    DROPS_TIPOS: DROPS_TIPOS,
    getMonstroConfig: getMonstroConfig,
    carregarMonstrosConfig: carregarMonstrosConfig,
    salvarMonstrosConfig: salvarMonstrosConfig,
    carregarBandeiras: carregarBandeiras,
    salvarBandeiras: salvarBandeiras,
    ehAdmin: ehAdmin,
    criarMonstroBandeira: criarMonstroBandeira,
    criarBossBandeira: criarBossBandeira
};