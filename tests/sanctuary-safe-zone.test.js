'use strict';

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
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) return serverSource.slice(start, i + 1);
    }
    assert.fail(`could not parse function ${name}`);
}

function spawnContext(randomValues) {
    const math = Object.create(Math);
    const values = randomValues.slice();
    math.random = () => values.length ? values.shift() : 0;
    const context = vm.createContext({
        Math: math,
        SANTUARIO_SLIME_BIOMA: 'Planície das Plantas (Santuário)',
        SANTUARIO_SLIME_CENTRO: { x: 144000, y: 14018 },
        SANTUARIO_CIDADE_ZONA_SEGURA_RAIO: 900,
        LARGURA_MUNDO: 100000,
        FIM_MUNDO: 188000,
        ALTO_MUNDO: 28000,
        MONSTER_COLLISION_RADIUS: 14,
        mapaMundo: { biomaNome: () => 'Planície das Plantas (Santuário)' },
        podeAndar: () => true,
        petBloqueiaMonstro: () => false
    });
    for (const name of [
        'posicaoNoNucleoCidade',
        'entidadeEmBiomaValido',
        'slimeEmBiomaValido',
        'gerarPosicaoSantuarioSlime',
        'moverMonstroDirecionalComDesvio'
    ]) {
        vm.runInContext(functionSource(name), context);
    }
    return context;
}

test('natural Slime spawns avoid the protected town center', () => {
    const center = { x: 144000, y: 14018 };
    const protectedContext = spawnContext([0, 0]);
    const generateNearCenter = vm.runInContext('gerarPosicaoSantuarioSlime', protectedContext);
    assert.equal(generateNearCenter(center, 500), null);

    const outsideContext = spawnContext([0, 0.64]);
    const generateOutside = vm.runInContext('gerarPosicaoSantuarioSlime', outsideContext);
    assert.deepEqual(
        JSON.parse(JSON.stringify(generateOutside(center, 1500))),
        { x: 145200, y: 14018 }
    );
});

test('the town center blocks monster entry and prevents sanctuary monsters targeting players inside', () => {
    const context = spawnContext([]);
    const move = vm.runInContext('moverMonstroDirecionalComDesvio', context);
    const monster = {
        id: 'safe-zone-test',
        bioma: 'Planície das Plantas (Santuário)',
        x: 144930,
        y: 14018,
        raioColisao: 14
    };
    move(monster, -30, 0, 30, { limitarDistancia: true });
    assert.ok(Math.hypot(monster.x - 144000, monster.y - 14018) >= 914);

    assert.match(serverSource, /!posicaoNoNucleoCidade\(x, y, monstro\.raioColisao/);
    assert.match(serverSource, /posicaoNoNucleoCidade\(x, y, monstro\.raioColisao[\s\S]{0,100}posicaoNoNucleoCidade\(monstro\.x, monstro\.y/);
    assert.match(
        functionSource('jogadorPodeSerAlvoDoSlime'),
        /slime\.bioma === SANTUARIO_SLIME_BIOMA[\s\S]{0,150}posicaoNoNucleoCidade\(jogador\.x \+ PLAYER_OFFSET_X, jogador\.y \+ PLAYER_OFFSET_Y\)/
    );
});
