const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

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
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        enviarAvisoAtaqueMonstro: (_mob, warning) => warnings.push(warning)
    });
    vm.runInContext(functionSource('velocidadeMovimentoMonstro'), context);
    vm.runInContext(functionSource('prepararAtaqueMonstroComAviso'), context);
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

test('basic and ranged enemy attacks warn for 300ms before firing into the cone', () => {
    const harness = telegraphContext();
    const prepare = vm.runInContext('prepararAtaqueMonstroComAviso', harness.context);
    const monster = { id: 'mob-1', x: 0, y: 0, targetId: 'player-1', attackCooldown: 45 };
    const target = { id: 'player-1', x: 50, y: 0, hp: 100 };

    assert.equal(prepare(monster, target, 200, 'ranged').status, 'pending');
    assert.equal(monster.attackCooldown, 0);
    assert.equal(harness.warnings.length, 1);
    assert.equal(harness.warnings[0].attackKind, 'ranged');
    harness.setNow(1299);
    assert.equal(prepare(monster, target, 200, 'ranged').status, 'pending');
    harness.setNow(1300);
    const ready = prepare(monster, target, 200, 'ranged');
    assert.equal(ready.status, 'ready');
    assert.equal(ready.angle, 0);
    assert.equal(monster.ataqueTelegraph, null);
});

test('moving out of the marked cone avoids the pending enemy attack', () => {
    const harness = telegraphContext();
    const prepare = vm.runInContext('prepararAtaqueMonstroComAviso', harness.context);
    const monster = { id: 'mob-2', x: 0, y: 0, targetId: 'player-2' };
    const target = { id: 'player-2', x: 50, y: 0, hp: 100 };

    assert.equal(prepare(monster, target, 100, 'melee').status, 'pending');
    target.x = 0;
    target.y = 50;
    harness.setNow(1300);
    assert.equal(prepare(monster, target, 100, 'melee').status, 'missed');
});

test('client receives and draws the timed enemy attack cone telegraph', () => {
    assert.match(html, /dados\.type === 'monster_attack_telegraph'/);
    assert.match(html, /window\.monsterAttackTelegraphs\.push/);
    assert.match(html, /ctx\.arc\(aviso\.x, aviso\.y, alcance, aviso\.angle - abertura, aviso\.angle \+ abertura\)/);
    assert.match(html, /aviso\.expiresAt - Date\.now\(\)/);
});
