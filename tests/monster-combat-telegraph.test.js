const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const monstrosSource = fs.readFileSync(path.join(root, 'monstros.js'), 'utf8');

function functionSource(name) {
    const start = serverSource.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `expected production function ${name}`);
    const braceStart = serverSource.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = braceStart; i < serverSource.length; i++) {
        const ch = serverSource[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) return serverSource.slice(start, i + 1);
    }
    assert.fail(`could not parse function ${name}`);
}

function eliteLeapContext() {
    let now = 1000;
    let randomValue = 0.1;
    const events = [];
    const damaged = [];
    const math = Object.create(Math);
    math.random = () => randomValue;
    const context = vm.createContext({
        Date: class extends Date { static now() { return now; } },
        Math: math,
        Number,
        SLIME_ELITE_LEAP_RANGE: 1800,
        SLIME_ELITE_LEAP_CHANCE: 0.30,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players: {
            target: { x: 900, y: 100, hp: 500, stunTimer: 0, instanciaId: null },
            outside: { x: 1100, y: 500, hp: 500, stunTimer: 0, instanciaId: null }
        },
        petsAtivos: {},
        mapaPorCoordenada: () => 'mundo',
        instanciaCompativel: () => true,
        entidadeEhSolari: () => false,
        aplicarDanoJogador: (id, x, y, damage) => {
            context.players[id].hp -= damage;
            damaged.push({ id, damage });
            return true;
        },
        applyDamageToCapturedPet: () => true,
        efeitos: { aplicarEfeito() {} },
        enviarEventoSlimeElite: (_slime, type, data) => events.push({ type, ...data })
    });
    vm.runInContext(functionSource('multiplicadorVelocidadeSlimeElite'), context);
    vm.runInContext(functionSource('aplicarDanoSaltoSlimeElite'), context);
    vm.runInContext(functionSource('atualizarSaltoSlimeElite'), context);
    return {
        context,
        events,
        damaged,
        setRandom(value) { randomValue = value; },
        setNow(value) { now = value; }
    };
}

function telegraphContext() {
    let now = 1000;
    const warnings = [];
    class FakeDate extends Date {
        static now() { return now; }
    }
    const context = vm.createContext({
        Math,
        Date: FakeDate,
        MONSTER_MOVEMENT_SPEED_MULTIPLIER: 1.25,
        MONSTER_ATTACK_WARNING_MS: 300,
        MONSTER_ATTACK_WARNING_HALF_ANGLE: Math.PI / 5,
        lacaios: {},
        players: {},
        PLAYER_OFFSET_X: 12,
        PLAYER_OFFSET_Y: 16,
        enviarAvisoAtaqueMonstro: (_mob, warning) => warnings.push(warning)
    });
    vm.runInContext(functionSource('velocidadeMovimentoMonstro'), context);
    vm.runInContext(functionSource('pontoAlvoAtaqueMonstro'), context);
    vm.runInContext(functionSource('prepararAtaqueMonstroComAviso'), context);
    vm.runInContext(functionSource('monstroUsaAtaqueMeleeBasico'), context);
    return {
        context,
        warnings,
        setNow(value) { now = value; }
    };
}

test('enemy movement speeds are increased by 25 percent', () => {
    const context = vm.createContext({ MONSTER_MOVEMENT_SPEED_MULTIPLIER: 1.25, Math, Number });
    const speed = vm.runInContext(`(${functionSource('velocidadeMovimentoMonstro')})`, context);
    assert.equal(speed(2), 2.5);
    assert.equal(speed(0), 0);
});

test('Slime Elite gains 50 percent speed normally and doubles it in Berserk', () => {
    const harness = eliteLeapContext();
    const multiplier = vm.runInContext('multiplicadorVelocidadeSlimeElite', harness.context);
    assert.equal(multiplier({ tipo: 'slime_elite', eliteBerserk: false }), 1.5);
    assert.equal(multiplier({ tipo: 'slime_elite', eliteBerserk: true }), 3);
    assert.equal(multiplier({ tipo: 'slime', eliteBerserk: false }), 1);
    assert.match(serverSource, /multVelocidadeBuff \* multiplicadorVelocidadeSlimeElite\(slime\)/);
});

test('Slime Elite telegraphs for one second, jumps, then deals area damage and stun', () => {
    const harness = eliteLeapContext();
    const updateLeap = vm.runInContext('atualizarSaltoSlimeElite', harness.context);
    const elite = {
        id: 'elite-test', tipo: 'slime_elite', x: 100, y: 100,
        hp: 8000, dano: 48, instanciaId: null
    };
    const target = { x: 900, y: 100, hp: 500, instanciaId: null };

    assert.equal(updateLeap(elite, target, 1000), true);
    assert.equal(harness.events[0].type, 'monster_elite_leap_telegraph');
    assert.equal(harness.events[0].duration, 1000);
    assert.equal(harness.events[0].radius, 155);
    assert.equal(elite.eliteLeapState.phase, 'telegraph');

    harness.setNow(2000);
    assert.equal(updateLeap(elite, null, 2000), true);
    assert.equal(harness.events[1].type, 'monster_elite_leap_jump');
    assert.equal(elite.eliteLeapJump.endsAt, 2600);
    assert.equal(harness.damaged.length, 0);

    harness.setNow(2600);
    assert.equal(updateLeap(elite, null, 2600), true);
    assert.equal(elite.x, 900);
    assert.equal(elite.y, 100);
    assert.equal(harness.damaged[0].damage, 72);
    assert.equal(harness.context.players.target.stunTimer, 30);
    assert.equal(harness.context.players.outside.hp, 500);
    assert.equal(harness.events[2].skill, 'slime_elite_leap');
    assert.equal(elite.eliteLeapCooldownAt, 12600);
});

test('Slime Elite rolls a 30 percent chance to leap beyond its old close range', () => {
    const harness = eliteLeapContext();
    const updateLeap = vm.runInContext('atualizarSaltoSlimeElite', harness.context);
    const elite = {
        id: 'elite-far-test', tipo: 'slime_elite', x: 100, y: 100,
        hp: 8000, dano: 48, instanciaId: null
    };
    const target = { x: 900, y: 100, hp: 500, instanciaId: null };

    harness.setRandom(0.7);
    assert.equal(updateLeap(elite, target, 1000), false);
    assert.equal(elite.eliteLeapState, undefined);
    assert.equal(elite.eliteLeapNextRollAt, 3500);

    harness.setNow(3499);
    harness.setRandom(0.1);
    assert.equal(updateLeap(elite, target, 3499), false);
    assert.equal(elite.eliteLeapState, undefined);

    harness.setNow(3500);
    assert.equal(updateLeap(elite, target, 3500), true);
    assert.equal(elite.eliteLeapState.x, 900);
    assert.equal(harness.events[0].type, 'monster_elite_leap_telegraph');
    assert.match(serverSource, /aggroRange: tipo === 'slime_elite'[\s\S]{0,160}SLIME_ELITE_LEAP_RANGE/);
});

test('basic and ranged enemy attacks warn for 300ms before firing into the cone', () => {
    const harness = telegraphContext();
    const prepare = vm.runInContext('prepararAtaqueMonstroComAviso', harness.context);
    const monster = { id: 'mob-1', x: 0, y: 0, targetId: 'player-1', attackCooldown: 45 };
    const target = { id: 'player-1', x: 50, y: 0, hp: 100 };
    harness.context.players['player-1'] = target;

    assert.equal(prepare(monster, target, 200, 'ranged').status, 'pending');
    assert.equal(monster.attackCooldown, 0);
    assert.equal(harness.warnings.length, 1);
    assert.equal(harness.warnings[0].attackKind, 'ranged');
    harness.setNow(1299);
    assert.equal(prepare(monster, target, 200, 'ranged').status, 'pending');
    harness.setNow(1300);
    const ready = prepare(monster, target, 200, 'ranged');
    assert.equal(ready.status, 'ready');
    assert.equal(ready.angle, Math.atan2(16, 62));
    assert.equal(monster.ataqueTelegraph, null);
});

test('natural melee monsters use the basic melee attack path', () => {
    const harness = telegraphContext();
    const shouldUseMelee = vm.runInContext('monstroUsaAtaqueMeleeBasico', harness.context);
    const naturalSlime = { tipo: 'slime', aiManaged: true, ehMelee: true };

    assert.equal(require('../spawns.js').TIPOS_MONSTROS.slime.ehMelee, true);
    assert.equal(shouldUseMelee(naturalSlime), true);
    assert.equal(shouldUseMelee({ tipo: 'ranged', aiManaged: true, ehMelee: false }), false);
    assert.equal(shouldUseMelee({ tipo: 'zumbi', aiManaged: true, ehMelee: true }), false);
    assert.match(serverSource, /else if \(monstroUsaAtaqueMeleeBasico\(slime\)\)/);
});

test('moving out of the marked cone avoids the pending enemy attack', () => {
    const harness = telegraphContext();
    const prepare = vm.runInContext('prepararAtaqueMonstroComAviso', harness.context);
    const monster = { id: 'mob-2', x: 0, y: 0, targetId: 'player-2' };
    const target = { id: 'player-2', x: 50, y: 0, hp: 100 };
    harness.context.players['player-2'] = target;

    assert.equal(prepare(monster, target, 100, 'melee').status, 'pending');
    target.x = 0;
    target.y = 50;
    harness.setNow(1300);
    assert.equal(prepare(monster, target, 100, 'melee').status, 'missed');
});

test('melee AI range and telegraph both measure from the player collision center', () => {
    const harness = telegraphContext();
    const pointForTarget = vm.runInContext('pontoAlvoAtaqueMonstro', harness.context);
    const prepare = vm.runInContext('prepararAtaqueMonstroComAviso', harness.context);
    const monster = { id: 'mob-center', x: 0, y: 0, targetId: 'player-center' };
    const target = { id: 'player-center', x: 40, y: 0, hp: 100 };
    harness.context.players['player-center'] = target;

    const point = pointForTarget(monster, target);
    assert.equal(point.x, 52);
    assert.equal(point.y, 16);
    assert.ok(Math.hypot(point.x - monster.x, point.y - monster.y) > 52);
    assert.equal(prepare(monster, target, 55, 'melee').status, 'pending');
    harness.setNow(1300);
    assert.equal(prepare(monster, target, 55, 'melee').status, 'ready');
    assert.match(serverSource, /const pontoAlvo = pontoAlvoAtaqueMonstro\(slime, alvo\);\s*let dx = pontoAlvo\.x - slime\.x;\s*let dy = pontoAlvo\.y - slime\.y;/);
});

test('map loading hides the local player and blocks server damage until ready', () => {
    const damageContext = vm.createContext({
        Date: class extends Date { static now() { return 1000; } },
        players: { loading: { hp: 100, mapaCarregamentoAte: 20000 } }
    });
    const applyDamage = vm.runInContext(`(${functionSource('aplicarDanoJogador')})`, damageContext);
    assert.equal(applyDamage('loading', 0, 0, 50), false);
    assert.equal(damageContext.players.loading.hp, 100);
    assert.match(serverSource, /data\.action === 'mapa_carregamento_pronto'/);
    assert.match(html, /if \(pid === window\.meuId && window\.carregandoMapaMundo\) return;/);
});

test('client receives and draws the timed enemy attack cone telegraph', () => {
    assert.match(html, /dados\.type === 'monster_attack_telegraph'/);
    assert.match(html, /window\.monsterAttackTelegraphs\.push/);
    assert.match(html, /ctx\.arc\(aviso\.x, aviso\.y, alcance, aviso\.angle - abertura, aviso\.angle \+ abertura\)/);
    assert.match(html, /aviso\.expiresAt - Date\.now\(\)/);
});

test('client marks the elite leap zone, renders its jump and shows Berserk coloring', () => {
    assert.match(html, /dados\.type === 'monster_elite_leap_telegraph'/);
    assert.match(html, /dados\.type === 'monster_elite_leap_jump'/);
    assert.match(html, /dados\.type === 'monster_elite_leap_cancel'/);
    assert.match(html, /ctx\.arc\(leap\.x, leap\.y, leap\.radius/);
    assert.match(monstrosSource, /slime\.tipo === 'slime_elite' && slime\.eliteBerserk/);
    assert.match(monstrosSource, /slime\.eliteLeapJump && slime\.eliteLeapJump\.endsAt > Date\.now\(\)/);
});
