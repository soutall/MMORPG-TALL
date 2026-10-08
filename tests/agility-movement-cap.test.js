'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const attributesSource = fs.readFileSync(path.join(root, 'atributos.js'), 'utf8');

test('agility movement bonus is capped at 50% on both client and server', () => {
    assert.match(serverSource, /AGILIDADE_MOVIMENTO_BONUS_POR_PONTO = 0\.03/);
    assert.match(serverSource, /AGILIDADE_MOVIMENTO_BONUS_MAXIMO = 0\.50/);
    assert.match(serverSource, /Math\.min\(1 \+ AGILIDADE_MOVIMENTO_BONUS_MAXIMO/);
    assert.match(clientSource, /Math\.min\(1\.5, 1 \+ Math\.max\(0, agilidadeMovimento - 1\) \* 0\.03\)/);
});

test('server rejects agility points after the movement bonus reaches its cap', () => {
    assert.match(
        serverSource,
        /data\.atributo === 'agilidade'[\s\S]{0,220}AGILIDADE_MOVIMENTO_BONUS_MAXIMO/
    );
    assert.match(serverSource, /type: 'atributo_limite'/);
    assert.match(attributesSource, /btnPlus\.disabled = pts <= 0 \|\| limiteAgilidade/);
    assert.match(attributesSource, /Limite de \+50% de velocidade atingido/);
});

test('integer agility progression reaches the capped bonus at agility 18', () => {
    const movementBonus = (agility) => Math.min(0.5, (agility - 1) * 0.03);
    assert.equal(movementBonus(17), 0.48);
    assert.equal(movementBonus(18), 0.5);
    assert.equal(movementBonus(19), 0.5);
});
