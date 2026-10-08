const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(root, 'monstros.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function functionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `expected production function ${name}`);
    const braceStart = source.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = braceStart; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
    }
    assert.fail(`could not parse production function ${name}`);
}

function loadFunction(name, globals) {
    const context = vm.createContext(globals);
    return { context, fn: vm.runInContext(`(${functionSource(serverSource, name)})`, context) };
}

test('Tundra of Dragon registers its original directional asset, elite tags, HP and 1.8 scale', () => {
    const spawns = require('../spawns');
    const worldMap = require('../mapas/mapa_mundo');
    const config = spawns.getMonstroConfig('tundra_dragon_elite');
    const assetDir = path.join(root, 'sprites', 'monstros', 'dragon negro_aeecf00d');
    const metadata = JSON.parse(fs.readFileSync(path.join(assetDir, 'spritesheet.json'), 'utf8'));
    const clips = new Map(metadata.clips.map(clip => [clip.name, clip]));

    assert.equal(config.nome, 'Tundra of Dragon');
    assert.equal(config.baseHp, 50000, 'elite HP multiplier must not inflate the requested 50,000 HP');
    assert.equal(config.escala, 1.8);
    assert.equal(config.bioma, 'Tundra Gélida');
    assert.deepEqual(config.tags, ['elite', 'magos', 'hibridos', 'debuffers', 'buffers']);
    assert.equal(worldMap.biomaNome(
        worldMap.CENTROS_BIOMAS.neve.x, worldMap.CENTROS_BIOMAS.neve.y
    ), config.bioma);
    assert.match(serverSource, /gerarPosicaoNaturalBioma\(\s*TUNDRA_CORUJA_BIOMA,\s*mapaMundo\.CENTROS_BIOMAS\.neve,\s*2600\s*\)/);
    assert.match(serverSource, /const dragon = criarSlimeNatural\(pos\.x, pos\.y, null, 'tundra_dragon_elite'\)/);
    for (const state of ['idle', 'walk', 'run', 'action', 'rest_enter', 'sleep', 'rest_exit']) {
        for (const direction of ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']) {
            assert.ok(clips.has(`${state}_${direction}`), `missing ${state}_${direction}`);
        }
    }
    assert.ok(clips.get('idle_E').frames.every(frame => frame.page === 0));
    assert.ok(clips.get('sleep_E').frames.every(frame => frame.page === 1));
    assert.match(rendererSource, /'dragon negro_aeecf00d':\s*\{\s*metadata:\s*null/);
    assert.match(rendererSource, /slime\.tipo === 'tundra_dragon_elite'[\s\S]{0,140}_carregarSpriteSlime\(slime\.asset\)/);
    assert.match(rendererSource, /_carregarPaginaSpriteSlime\(sprite, paginaQuadro\)/);
    assert.match(rendererSource, /!_desenharSpriteSlime\(ctx, slime, estS\) && slime\.tipo !== 'tundra_dragon_elite'/);
    assert.match(rendererSource, /slime\.tipo === 'tundra_dragon_elite'/);
    assert.match(serverSource, /inicializarSpawnNaturalTundraDragonElite\(\);/);
});

test('elite HP helper preserves 50,000 for the dragon and keeps the normal elite multiplier', () => {
    const { fn } = loadFunction('calcularHpMonstro', {
        calcularHpElite: (hp, elite) => elite ? Math.floor(hp * 1.8) : hp
    });
    assert.equal(fn('tundra_dragon_elite', 50000, true), 50000);
    assert.equal(fn('slime_elite', 8000, true), 14400);
});

test('ice breath hits only players inside its cone and applies the three-second slow', () => {
    const hits = [];
    const synced = [];
    const target = (x, y) => ({ x, y, hp: 1000, classe: 'guerreiro' });
    const globals = {
        Math,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players: { front: target(100, 0), side: target(0, 100), far: target(600, 0) },
        danoTundraDragon: () => 180,
        tundraDragonPodeAtingirJogador: () => true,
        aplicarDanoJogador: (id, x, y, amount) => hits.push({ id, amount }),
        efeitos: { aplicarEfeito: (player, id, ticks) => { player.effect = { id, ticks }; } },
        sincronizarEfeitos: id => synced.push(id),
        enviarEventoSlimeElite: () => {}
    };
    const { fn } = loadFunction('aplicarBafoGeloTundraDragon', globals);
    fn({ id: 'dragon', x: 0, y: 0, dano: 180, eliteBerserk: false }, 0);

    assert.deepEqual(hits, [{ id: 'front', amount: 180 }]);
    assert.deepEqual(synced, ['front']);
    assert.deepEqual(globals.players.front.effect, { id: 'tundra_sopro_gelido', ticks: 60 });
    assert.match(serverSource, /temEfeito\(p, 'tundra_sopro_gelido'\)\) mult \*= 1\.5/);
    assert.match(serverSource, /soproGelido\) mult \*= 0\.5/);

    const speedFor = slowed => loadFunction('velocidadeMaximaMovimentoJogador', {
        Date,
        Math,
        AGILIDADE_MOVIMENTO_BONUS_MAXIMO: 0.5,
        AGILIDADE_MOVIMENTO_BONUS_POR_PONTO: 0.01,
        getAtr: () => 1,
        efeitos: { temEfeito: (player, id) => slowed && id === 'tundra_sopro_gelido' }
    }).fn({ classe: 'guerreiro' });
    const normalSpeed = speedFor(false);
    assert.ok(Math.abs(speedFor(true) - normalSpeed * 0.5) < 0.01);

    const attackSpeedMultiplier = loadFunction('multiplicadorVelocidadeAtaque', {
        Date,
        efeitos: { temEfeito: (player, id) => id === 'tundra_sopro_gelido' }
    }).fn({});
    assert.equal(attackSpeedMultiplier, 1.5);
});

test('vortex damages only players inside the large circular field at a controlled cadence', () => {
    const hits = [];
    const globals = {
        Math,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players: { inside: { x: 100, y: 0, hp: 1000 }, outside: { x: 400, y: 0, hp: 1000 } },
        danoTundraDragon: () => 36,
        tundraDragonPodeAtingirJogador: () => true,
        aplicarDanoJogador: (id, x, y, amount) => hits.push({ id, amount })
    };
    const { fn } = loadFunction('aplicarDanoVorticeTundraDragon', globals);
    const vortex = { radius: 360, nextDamageAt: 1000 };
    fn({ id: 'dragon', x: 0, y: 0 }, vortex, 1500);

    assert.deepEqual(hits, [{ id: 'inside', amount: 36 }]);
    assert.equal(vortex.nextDamageAt, 2000);
});

test('dragon vortex remains active for the full five seconds, including while the dragon is stunned', () => {
    const events = [];
    const globals = {
        Math,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players: {},
        entidadeEmBiomaValido: () => true,
        enviarEventoSlimeElite: (_slime, type, data) => events.push({ type, data }),
        danoTundraDragon: () => 36,
        aplicarDanoVorticeTundraDragon: () => {},
        tundraDragonPodeAtingirJogador: () => false,
        aplicarDanoJogador: () => {}
    };
    const { fn } = loadFunction('atualizarHabilidadesTundraDragon', globals);
    const dragon = {
        id: 'dragon', x: 0, y: 0, dano: 180, eliteBerserk: false,
        tundraDragonVortexCooldownAt: 0,
        tundraDragonDashCooldownAt: 100000,
        tundraDragonDashNextRollAt: 100000
    };

    assert.equal(fn(dragon, { x: 500, y: 0, hp: 1000 }, 1000), true);
    assert.equal(dragon.tundraDragonVortex.startedAt, 1000);
    assert.equal(dragon.tundraDragonVortex.endsAt, 6000);
    assert.equal(events[0].type, 'tundra_dragon_vortex_start');
    assert.equal(events[0].data.duration, 5000);
    dragon.stunTimer = 10;
    assert.equal(fn(dragon, null, 5999), true);
    assert.equal(dragon.tundraDragonVortex.endsAt, 6000);
    assert.equal(events.some(event => event.type === 'tundra_dragon_vortex_end'), false);
    assert.equal(fn(dragon, null, 6000), false);
    assert.equal(events.some(event => event.type === 'tundra_dragon_vortex_end'), true);
    assert.match(serverSource, /slime\.tipo === 'tundra_dragon_elite' && slime\.tundraDragonVortex[\s\S]{0,150}if \(slime\.stunTimer > 0\)/);
});

test('dragon dash has a 1.5-second telegraph and stuns targets hit along its line for five seconds', () => {
    const events = [];
    const random = Object.create(Math);
    random.random = () => 0.49;
    const globals = {
        Math: random,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        entidadeEmBiomaValido: () => true,
        enviarEventoSlimeElite: (slime, type, data) => events.push({ type, data }),
        danoTundraDragon: () => 270,
        distanciaPontoSegmento: (x, y, x1, y1, x2, y2) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
            return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
        },
        players: {
            line: { x: 300, y: 20, hp: 1000, stunTimer: 0 },
            offLine: { x: 300, y: 100, hp: 1000, stunTimer: 0 }
        },
        tundraDragonPodeAtingirJogador: () => true,
        aplicarDanoJogador: () => {},
        efeitos: { aplicarEfeito: (player, id, ticks) => { player.effect = { id, ticks }; } },
        sincronizarEfeitos: () => {}
    };
    const { fn } = loadFunction('atualizarHabilidadesTundraDragon', globals);
    const dragon = {
        id: 'dragon', x: 0, y: 0, dano: 180, eliteBerserk: false,
        tundraDragonVortexCooldownAt: 100000,
        tundraDragonDashCooldownAt: 0,
        tundraDragonDashNextRollAt: 0
    };
    const target = { x: 500, y: 0, hp: 1000 };

    assert.equal(fn(dragon, target, 1000), true);
    assert.equal(dragon.tundraDragonDashState.dashAt, 2500);
    assert.equal(events[0].type, 'tundra_dragon_dash_telegraph');
    assert.equal(events[0].data.duration, 1500);
    assert.equal(fn(dragon, null, 2499), true);
    assert.equal(dragon.tundraDragonDashState.phase, 'telegraph');
    fn(dragon, null, 2500);
    assert.equal(dragon.tundraDragonDashState.phase, 'dash');
    assert.equal(events[1].type, 'tundra_dragon_dash');

    const dash = { fromX: 0, fromY: 0, toX: 500, toY: 0 };
    const hit = loadFunction('aplicarDanoDashTundraDragon', globals).fn;
    hit(dragon, dash);
    assert.equal(globals.players.line.stunTimer, 100);
    assert.deepEqual(globals.players.line.effect, { id: 'stun', ticks: 100 });
    assert.equal(globals.players.offLine.stunTimer, 0);
});

test('dragon dash only starts on a successful 50 percent chance roll', () => {
    const random = Object.create(Math);
    random.random = () => 0.5;
    const { fn } = loadFunction('atualizarHabilidadesTundraDragon', {
        Math: random,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        entidadeEmBiomaValido: () => true,
        enviarEventoSlimeElite: () => {}
    });
    const dragon = {
        id: 'dragon', x: 0, y: 0, dano: 180, eliteBerserk: false,
        tundraDragonVortexCooldownAt: 100000,
        tundraDragonDashCooldownAt: 0,
        tundraDragonDashNextRollAt: 0
    };
    assert.equal(fn(dragon, { x: 500, y: 0, hp: 1000 }, 1000), false);
    assert.equal(dragon.tundraDragonDashState, undefined);
});

test('berserk increases dragon damage and strictly filters its targets to ranged/support classes', () => {
    const { fn } = loadFunction('danoTundraDragon', {});
    assert.equal(fn({ dano: 180, eliteBerserk: true }, 1), 252);
    const { fn: validTarget } = loadFunction('classeValidaAlvoTundraDragon', {});
    assert.equal(validTarget({ classe: 'mago' }), true);
    assert.equal(validTarget({ classe: 'curandeiro' }), true);
    assert.equal(validTarget({ classe: 'arqueiro' }), true);
    assert.equal(validTarget({ classe: 'guerreiro' }), false);
    assert.match(serverSource, /candidatos\[i\]\.pet \|\| !classeValidaAlvoTundraDragon\(candidatos\[i\]\.jogador\)/);
    assert.match(serverSource, /multiplicadorVelocidadeTundraDragon = slime\.tipo === 'tundra_dragon_elite' && slime\.eliteBerserk \? 1\.4 : 1/);
    assert.match(clientSource, /dados\.type === 'tundra_dragon_vortex_start'/);
    assert.match(clientSource, /effect\.kind === 'vortex'/);
    assert.match(clientSource, /rgba\(15, 79, 153, \.72\)/);
    assert.match(clientSource, /ctx\.strokeStyle = '#102e68'/);
    assert.match(clientSource, /ctx\.strokeStyle = '#00d9f2'/);
    assert.match(clientSource, /ring === 1 \? '#087fbd' : '#00c8e8'/);
    assert.match(clientSource, /tundra_dragon_flight/);
    assert.match(clientSource, /activeTundraDragonLoops\[loopDragon\]/);
    assert.match(rendererSource, /slime\.tipo === 'tundra_dragon_elite' && slime\.eliteBerserk === true/);
    assert.match(rendererSource, /estadoDesejado === 'idle'\) estadoDesejado = 'run'/);
    assert.match(serverSource, /const dragonBerserk = slime\.tipo === 'tundra_dragon_elite' && slime\.eliteBerserk/);
});

test('monsters leash pursuit to 420 pixels and gradually recover HP after losing aggro', () => {
    const startRecovery = loadFunction('iniciarRegeneracaoMonstroAposPerderAgro', {}).fn;
    const updateRecovery = loadFunction('atualizarRegeneracaoMonstroAposPerderAgro', {
        REGENERACAO_HP_APOS_PERDER_AGRO: 0.01
    }).fn;
    const monster = { hp: 50, maxHp: 100, targetId: null };

    startRecovery(monster, 1000);
    updateRecovery(monster, 2000);
    assert.equal(monster.hp, 51, 'recovery should restore 1% of max HP per second');
    updateRecovery(monster, 3000);
    assert.equal(monster.hp, 52);
    monster.targetId = 'player';
    updateRecovery(monster, 4000);
    assert.equal(monster.hp, 52, 'recovery stops once the monster has a target again');
    assert.equal(monster.aiHpRegenUltimaAtualizacao, null);

    assert.match(serverSource, /const DISTANCIA_MAXIMA_PERSEGUICAO_MONSTRO = 420/);
    assert.match(serverSource, /Math\.min\(slime\.aggroRange \|\| 320, DISTANCIA_MAXIMA_PERSEGUICAO_MONSTRO\)/);
    assert.match(serverSource, /let distanciaDesiste = DISTANCIA_MAXIMA_PERSEGUICAO_MONSTRO/);
});

test('sleep sound starts only near a sleeping dragon and stops when it wakes or the player leaves', () => {
    const calls = [];
    const context = vm.createContext({
        Math,
        Number,
        Object,
        window: {
            meuX: 0,
            meuY: 0,
            currentMap: 'mundo',
            AudioManager: {
                startSpatialLoop: (id, options) => calls.push({ action: 'start', id, options }),
                updateSpatialLoop: (key, options) => calls.push({ action: 'update', key, options }),
                stopSpatialLoop: key => calls.push({ action: 'stop', key })
            }
        }
    });
    const updateSleepAudio = vm.runInContext(
        `(${functionSource(clientSource, 'atualizarAudioSonoTundraDragon')})`, context);
    const dragon = {
        id: 'sleeping-dragon', tipo: 'tundra_dragon_elite', x: 500, y: 500, hp: 50000, aiDormindo: true
    };
    const active = Object.create(null);

    updateSleepAudio(dragon, active);
    assert.equal(calls.length, 0, 'sleep audio must stay inactive while the player is far away');

    context.window.meuX = 280;
    context.window.meuY = 280;
    updateSleepAudio(dragon, active);
    assert.equal(calls[0].action, 'start');
    assert.equal(calls[0].id, 'tundra_dragon_sleep');
    assert.equal(calls[0].options.key, 'tundra_dragon_sleep:sleeping-dragon');
    assert.equal(calls[0].options.mapa, 'mundo');

    active['tundra_dragon_sleep:sleeping-dragon'] = true;
    updateSleepAudio(Object.assign({}, dragon, { aiDormindo: false }), active);
    assert.equal(calls[1].action, 'stop');
    assert.equal(context.window._tundraDragonSleepLoops['tundra_dragon_sleep:sleeping-dragon'], undefined);

    context.window.meuX = 280;
    updateSleepAudio(dragon, active);
    context.window.meuX = 0;
    updateSleepAudio(dragon, Object.create(null));
    assert.equal(calls[calls.length - 1].action, 'stop');
});
