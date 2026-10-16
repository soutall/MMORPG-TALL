const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rendererSource = fs.readFileSync(path.join(root, 'monstros.js'), 'utf8');

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

function skillHarness(randomValues) {
    const events = [];
    const projectiles = [];
    const damaged = [];
    const players = {
        target: { x: 250, y: 0, hp: 500, stunTimer: 0, instanciaId: null }
    };
    const math = Object.create(Math);
    let randomIndex = 0;
    math.random = () => randomValues[randomIndex++] ?? 0;
    const context = vm.createContext({
        Math: math,
        Number,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players,
        projeteis: projectiles,
        mapaPorCoordenada: () => 'mundo',
        instanciaCompativel: () => true,
        entidadeEmBiomaValido: () => true,
        jogadorPodeSerAlvoDoSlime: (_id, player) => !!player && player.hp > 0,
        aplicarDanoJogador: (id, _x, _y, damage) => {
            players[id].hp -= damage;
            damaged.push({ id, damage });
            return true;
        },
        efeitos: { aplicarEfeito(player, id, ticks) {
            player.receivedEffect = { id, ticks };
        } },
        sincronizarEfeitos() {},
        enviarEventoSlimeElite: (_slime, type, data) => events.push({ type, ...data })
    });
    for (const name of [
        'aplicarDanoSaltoSlimeInicial',
        'dispararGosmaSlimeInicial',
        'atualizarHabilidadesSlimeInicial'
    ]) {
        vm.runInContext(functionSource(name), context);
    }
    return { context, events, projectiles, damaged, players };
}

test('initial slime leap marks the player position, jumps and stuns on impact', () => {
    const harness = skillHarness([0, 0, 0.99]);
    const update = harness.context.atualizarHabilidadesSlimeInicial;
    const slime = { id: 'starter', tipo: 'slime', x: 0, y: 0, dano: 20, targetId: 'target' };
    const target = harness.players.target;

    assert.equal(update(slime, target, 1000), true);
    assert.equal(slime.slimeInitialLeap.jumpAt, 1800);
    assert.equal(harness.events[0].type, 'slime_initial_leap_telegraph');
    assert.equal(harness.events[0].duration, 800);

    assert.equal(update(slime, null, 1800), true);
    assert.equal(harness.events[1].type, 'slime_initial_leap_jump');
    assert.equal(slime.slimeInitialLeap.landAt, 2250);

    assert.equal(update(slime, null, 2250), true);
    assert.equal(slime.x, target.x);
    assert.equal(harness.damaged[0].damage, 25);
    assert.equal(target.stunTimer, 10);
    assert.deepEqual(target.receivedEffect, { id: 'stun', ticks: 10 });
    assert.equal(harness.events.at(-2).skill, 'slime_initial_leap');
});

test('initial slime spits 1, then 2, then 1 fast projectiles on its telegraphed timings', () => {
    const harness = skillHarness([0, 0, 0]);
    const update = harness.context.atualizarHabilidadesSlimeInicial;
    const target = harness.players.target;
    target.x = 600;
    const slime = { id: 'starter', tipo: 'slime', x: 0, y: 0, dano: 20, targetId: 'target' };

    assert.equal(update(slime, target, 1000), true);
    assert.equal(harness.events[0].type, 'slime_spit_telegraph');
    assert.equal(harness.events[0].duration, 800);
    assert.deepEqual(Array.from(harness.events[0].offsets), [0]);

    update(slime, null, 1800);
    assert.equal(harness.projectiles.length, 1);
    assert.equal(slime.slimeSpit.nextShotAt, 2400);
    assert.deepEqual(Array.from(harness.events[1].offsets), [-0.16, 0.16]);

    update(slime, null, 2400);
    assert.equal(harness.projectiles.length, 3);
    assert.deepEqual(Array.from(harness.events[2].offsets), [0]);

    update(slime, null, 3000);
    assert.equal(harness.projectiles.length, 4);
    assert.equal(harness.projectiles[0].tipo, 'slime_gosma');
    assert.equal(harness.projectiles[0].vx, 17);
    assert.equal(harness.projectiles[0].dano, 13);
    assert.equal(harness.events.at(-1).type, 'slime_spit_telegraph_end');
});

test('initial slimes attempt their ranged skill more often and prefer it over leap', () => {
    const harness = skillHarness([0.5, 0, 0.25]);
    const update = harness.context.atualizarHabilidadesSlimeInicial;
    const target = harness.players.target;
    const slime = { id: 'starter', tipo: 'slime', x: 0, y: 0, dano: 20, targetId: 'target' };

    assert.equal(update(slime, target, 1000), true);
    assert.equal(slime.slimeSpit.volley, 0, 'choose the shot when both skills are in range');
    assert.equal(slime.slimeSkillNextRollAt, 2750);

    const endingHarness = skillHarness([0]);
    const endingSlime = {
        id: 'starter', tipo: 'slime', x: 0, y: 0, dano: 20,
        slimeSpit: { angle: 0, volley: 2, nextShotAt: 1000 }
    };
    endingHarness.context.atualizarHabilidadesSlimeInicial(endingSlime, null, 1000);
    assert.equal(endingSlime.slimeSpitCooldownAt, 4500);
});

test('slime spit applies a server-synchronized 60 percent movement slow for three seconds', () => {
    assert.match(serverSource, /efeitos\.aplicarEfeito\(player, 'slime_gosma_lentidao', 60, 0\.6\)/);
    assert.match(serverSource, /mult \*= multiplicadorGosma;\s*multControle \*= multiplicadorGosma;/);
    assert.match(clientSource, /multEfeitosVel \*= 1 - Math\.min\(0\.9,[\s\S]{0,130}lentidaoGosma\.intensidade/);
    assert.match(clientSource, /e\.id === 'slime_gosma_lentidao'/);

    const effects = {
        temEfeito: (_player, id) => id === 'slime_gosma_lentidao',
        pegarEfeito: () => ({ intensidade: 0.6 })
    };
    const context = vm.createContext({
        Math,
        Date,
        efeitos: effects,
        getAtr: () => 1,
        AGILIDADE_MOVIMENTO_BONUS_MAXIMO: 0,
        AGILIDADE_MOVIMENTO_BONUS_POR_PONTO: 0
    });
    vm.runInContext(functionSource('velocidadeMaximaMovimentoJogador'), context);
    const speedWithSlow = context.velocidadeMaximaMovimentoJogador({ classe: 'guerreiro' });
    context.efeitos.temEfeito = () => false;
    const normalSpeed = context.velocidadeMaximaMovimentoJogador({ classe: 'guerreiro' });
    assert.ok(Math.abs(speedWithSlow / normalSpeed - 0.4) < 0.001);
});

test('slime skill markers render and damage triggers recoil with a red silhouette glow', () => {
    assert.match(clientSource, /dados\.type === 'slime_initial_leap_telegraph'/);
    assert.match(clientSource, /dados\.type === 'slime_initial_leap_jump'/);
    assert.match(clientSource, /dados\.type === 'slime_spit_telegraph'/);
    assert.match(clientSource, /ctx\.lineTo\(spit\.x \+ Math\.cos\(angle\) \* spit\.range/);
    assert.match(clientSource, /if \(p\.tipo === 'slime_gosma'\)/);
    assert.match(rendererSource, /slime\.hp < est\.hitFeedbackHp/);
    assert.match(rendererSource, /ctx\.translate\(-Math\.cos\(est\.hitFeedbackAngle\) \* recuo/);
    assert.match(rendererSource, /drop-shadow\(0 0 6px rgba\(255, 20, 35/);
});
