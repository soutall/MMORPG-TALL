'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const dash = require('../dash.js');

const client = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('Curandeira Space checks the stamina state synchronized with the HUD', () => {
    assert.match(client, /if \(cfg\.stamina === 'TODA'\) \{\s*if \(\(minhaEstamina \|\| 0\) < 20\)/);
    assert.doesNotMatch(client, /if \(cfg\.stamina === 'TODA'\) \{\s*if \(\(window\.minhaEstamina \|\| 0\)/);
    assert.match(client, /if \(dados\.type === 'stamina_sync' && dados\.estamina !== undefined\) \{\s*minhaEstamina = dados\.estamina;/);
});

test('Curandeira Space applies its group shield and documented tradeoffs server-side', () => {
    const config = dash.configDe('curandeiro');
    assert.equal(config.tipo, 'area');
    assert.equal(config.raio, 160);
    assert.equal(config.duracaoMs, 10000);
    assert.equal(config.stamina, 'TODA');
    assert.equal(config.cooldownMs, 20000);
    assert.equal(config.escudoFrac, 0.20);
    assert.equal(config.atordoamentoMs, 5000);
    assert.equal(config.reducaoAtordoado, 0.50);

    assert.match(server, /darEscudoAbsorvente\(m, Math\.round\(m\.maxHp \* 0\.20\), cfg\.duracaoMs\)/);
    assert.match(server, /p\.stunTimer = Math\.max\(p\.stunTimer \|\| 0, Math\.floor\(cfg\.atordoamentoMs \/ 50\)\)/);
    assert.match(server, /p\.estamina = 0;\s*ws\.send\(JSON\.stringify\(\{ type: 'stamina_sync', estamina: 0 \}\)\)/);
});
