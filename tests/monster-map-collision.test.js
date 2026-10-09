const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

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
        if (ch === "'" || ch === '"' || ch === '`') {
            quote = ch;
        } else if (ch === '{') {
            depth++;
        } else if (ch === '}' && --depth === 0) {
            return serverSource.slice(start, i + 1);
        }
    }
    assert.fail(`could not parse function ${name}`);
}

function blocksObstacle(x, y) {
    return x >= 26 && x <= 114 && y >= 66 && y <= 134;
}

test('monster steering follows an open route around an editor collision', () => {
    const context = vm.createContext({
        Math,
        Date,
        velocidadeMovimentoMonstro: velocidade => velocidade * 1.25,
        podeAndar: (x, y) => !blocksObstacle(x, y),
        posicaoNoNucleoCidade: () => false,
        MONSTER_COLLISION_RADIUS: 14,
        petBloqueiaMonstro: () => false
    });
    const move = vm.runInContext(`(${functionSource('moverMonstroDirecionalComDesvio')})`, context);
    const mob = { id: 'route-test', x: 0, y: 100 };

    for (let tick = 0; tick < 160 && mob.x < 190; tick++) {
        move(mob, 200 - mob.x, 100 - mob.y, 5, { limitarDistancia: true });
        assert.equal(blocksObstacle(mob.x, mob.y), false, 'movement must never enter the editor collision');
    }

    assert.ok(mob.x >= 190, `monster should go around the obstacle, ended at x=${mob.x}, y=${mob.y}`);
});

test('AI-managed monster path selection validates each route candidate against map collisions', () => {
    const context = vm.createContext({
        Math,
        Date,
        velocidadeMovimentoMonstro: velocidade => velocidade * 1.25,
        monstroPertenceABiomaDoMundo: () => false,
        entidadeEmBiomaValido: (_mob, x, y) => !blocksObstacle(x, y)
    });
    const move = vm.runInContext(`(${functionSource('moverMonstroComDesvio')})`, context);
    const mob = { id: 'ai-route-test', x: 0, y: 100 };

    for (let tick = 0; tick < 160 && mob.x < 190; tick++) {
        move(mob, 200, 100, 5);
        assert.equal(blocksObstacle(mob.x, mob.y), false, 'AI route candidates must not cross the collision');
    }

    assert.ok(mob.x >= 190, `AI-managed monster should find the opening, ended at x=${mob.x}, y=${mob.y}`);
});

test('only the voadores tag bypasses map collision checks', () => {
    const lista = [{
        tipo: 'line',
        x: 0, y: 100, w: 100, h: 1, espessura: 16,
        pontos: [{ x: 0, y: 100 }, { x: 100, y: 100 }]
    }];
    const context = vm.createContext({
        podeAndarTerreno: () => true,
        mapaPorCoordenada: () => 'mundo',
        colisoesPorMapa: { mundo: lista },
        MAPAS_CONFIG: { mundo: { x0: 100000, y0: 0 } },
        distPontoSegmento: Math.hypot,
        PLAYER_COLLISION_RADIUS: 12,
        MONSTER_COLLISION_RADIUS: 14,
        Math
    });
    vm.runInContext(functionSource('monstroEhVoador'), context);
    vm.runInContext(functionSource('distPontoSegmento'), context);
    vm.runInContext(functionSource('colideObstaculosCustomizados'), context);
    vm.runInContext(functionSource('podeAndar'), context);
    const canWalk = vm.runInContext('podeAndar', context);

    assert.equal(canWalk(100050, 100, { tags: ['tank'] }), false, 'ground monster should stop at an editor line collision');
    assert.equal(canWalk(100050, 100, { ignoreMapCollision: true }), false, 'legacy bypass flag must not grant flight');
    assert.equal(canWalk(100050, 100, { tags: ['voadores'] }), true, 'tagged flyer should pass over the same collision');
    assert.equal(canWalk(100050, 150, { tags: ['tank'] }), true, 'ground monster can move outside the collision');
});

test('voadores is available in the admin monster tag catalog', () => {
    const spawns = require('../spawns');
    assert.equal(spawns.TAGS_MONSTRO.voadores.nome, 'Voadores');
    assert.match(spawns.TAGS_MONSTRO.voadores.descricao, /voam/i);
});

test('admin mob editing accepts the voadores tag and ignores unknown tags', () => {
    const spawns = require('../spawns');
    const context = vm.createContext({ spawnsAdmin: spawns, Number, Math, Object, Array, isFinite });
    const validate = vm.runInContext(`(${functionSource('validarEdicaoMob')})`, context);
    const result = validate({ tipo: 'slime', tags: ['voadores', 'tag-inexistente', 'tank'] });

    assert.deepEqual(JSON.parse(JSON.stringify(result.tags)), ['voadores', 'tank']);
});

test('map movement integrates editor collision checks and propagates monster tags', () => {
    assert.match(functionSource('podeAndar'), /colideObstaculosCustomizados\(mapa, x, y, raio\)/);
    assert.match(serverSource, /tags: Array\.isArray\(confBase\.tags\) \? confBase\.tags\.slice\(\) : \[\]/);
    assert.match(serverSource, /function moverMonstroComDesvio\(slime, destinoX, destinoY, velocidade\)/);
    assert.match(serverSource, /'cor', 'tags', 'imuneDebuffs'/);
});
