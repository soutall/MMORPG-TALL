'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('damage and critical feedback is coalesced per attacker, instance, and target', () => {
    assert.match(server, /const danosFlutuantesPendentes = new Map\(\)/);
    assert.match(server, /JSON\.stringify\(\[autorId \|\| null, instanciaId \|\| null, idAlvo\]\)/);
    assert.match(server, /obterDanoFlutuantePendente\([\s\S]{0,100}\)\.dano \+= Math\.round\(dano\)/);
    assert.match(server, /obterDanoFlutuantePendente\([\s\S]{0,180}\)\.critico = true/);
    assert.match(server, /setTimeout\(flushDanosFlutuantes, 100\)/);
    assert.match(server, /broadcastDanoFlut\(slime\.x, slime\.y, danoFinal, autorId, slime\.id, slime\.instanciaId\)/);
});

test('damage feedback rendering uses bounded queues and bounded overlap checks', () => {
    assert.match(html, /function adicionarTextoVisualLimitado\(lista, texto, limite\)[\s\S]{0,150}lista\.splice\(0, lista\.length - limite\)/);
    assert.match(html, /adicionarTextoVisualLimitado\(window\.floatingTexts,[\s\S]{0,300}\}, 100\)/);
    assert.match(html, /adicionarTextoVisualLimitado\(window\.petDamageTexts,[\s\S]{0,500}\}, 100\)/);
    assert.match(html, /for \(let i = window\.floatingTexts\.length - 1, vistos = 0; i >= 0 && vistos < 24;/);
});
