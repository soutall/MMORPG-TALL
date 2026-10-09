'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const dash = require('../dash.js');

const projectRoot = path.resolve(__dirname, '..');
const clientSource = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const malakarSource = fs.readFileSync(path.join(projectRoot, 'sistemas', 'lord_malakar.js'), 'utf8');

test('basic-attack search ranges match between client and server, except unchanged Ladino', () => {
    const expected = {
        guerreiro: 61,
        barbaro: 61,
        ladino: 44,
        pikeman: 61,
        guerreiro_kaledron: 67,
        arqueiro: 303,
        roqueiro: 242,
        mago: 242,
        summoner: 230,
        curandeiro: 242,
        dronemaster: 150,
        sniper: 464,
        florim: 387,
        arqueiro_arcano: 363,
        lord_malakar: 242
    };

    for (const [className, range] of Object.entries(expected)) {
        if (className === 'lord_malakar') {
            assert.match(clientSource, /c === 'lord_malakar'\) return 242;/);
            assert.match(serverSource, /p\.classe === lordMalakar\.CONFIG\.classId\) return lordMalakar\.CONFIG\.basicAttackRange;/);
            assert.match(malakarSource, /const BASIC_ATTACK_RANGE = 242;/);
            continue;
        }
        if (className === 'dronemaster') {
            assert.match(clientSource, /c === 'dronemaster'\) return \(window\.dmTitaAtivo \? 293 : 150\);/);
            assert.match(serverSource, /p\.classe === 'dronemaster'\) return \(p\.dmTitaAtivo \? 293 : 150\);/);
            continue;
        }
        assert.match(clientSource, new RegExp("c === '" + className + "'\\) return " + range + ";"));
        if (className === 'lord_malakar') continue;
        assert.match(serverSource, new RegExp("p\\.classe === '" + className + "'\\) return " + range + ";"));
    }
    assert.match(serverSource, /function alcanceAtaqueBasicoClasse\(p\) \{\s*if \(!p\) return 363;/);
    assert.match(clientSource, /const GAME_VERSION = 'v1\.75\.103'/);
});

test('basic attacks validate their target before consuming cooldown', () => {
    const handlers = [
        ['ataque_barbaro', 'validarAtaqueBasicoAlvo', 'players[playerId].lastBasicAttack = agora;', 1],
        ['ataque_roqueiro', 'validarAtaqueBasicoAlvo', 'players[playerId].lastBasicAttack = agora;', 1],
        ['ataque_ladino', 'validarAtaqueBasicoAlvo', 'pA.lastBasicAttack = agora;', 1],
        ['ataque_dronemaster', 'validarAtaqueBasicoAlvo', 'pD.lastBasicAttack = Date.now();', 2],
        ['ataque_arqueiro_arcano', 'validarAtaqueBasicoAlvo', 'pA.lastBasicAttack = Date.now();', 1],
        ['ataque_sniper', 'validarAtaqueBasicoAlvo', 'pS.lastBasicAttack = Date.now();', 1],
        ['ataque_florim', 'validarAtaqueBasicoAlvo', "marcarSkillUsada(p, 'lastFlorimBasic');", 1],
        ['ataque_pikeman', 'validarAtaqueBasicoAlvo', 'players[playerId].lastBasicAttack = agora;', 1],
        ['ataque_kaledron', 'validarAtaqueBasicoAlvo', 'pk.lastBasicAttack = agora;', 1],
        ['corte', 'validarAtaqueBasicoAlvo', 'players[playerId].lastBasicAttack = agora;', 1],
        ['ataque_mago', 'validarAtaqueBasicoAlvo', 'players[playerId].lastBasicAttack = agora;', 1]
    ];

    for (const [action, validation, cooldown, expectedCount] of handlers) {
        const start = serverSource.indexOf(`if (data.action === '${action}'`);
        assert.notEqual(start, -1, `missing server handler for ${action}`);
        const nextHandler = serverSource.indexOf('\n                if (data.action ===', start + 1);
        const block = serverSource.slice(start, nextHandler === -1 ? undefined : nextHandler);
        const positions = (text, value) => {
            const found = [];
            let index = block.indexOf(value);
            while (index !== -1) {
                found.push(index);
                index = block.indexOf(value, index + value.length);
            }
            return found;
        };
        const validationPositions = positions(block, validation);
        const cooldownPositions = positions(block, cooldown);
        assert.equal(validationPositions.length, expectedCount, `${action} validation count`);
        assert.equal(cooldownPositions.length, expectedCount, `${action} cooldown count`);
        validationPositions.forEach((position, index) => {
            assert.ok(position < cooldownPositions[index], `${action} consumes cooldown before target validation`);
        });
    }
});

test('berserker charge dash distance is reduced to 280 units', () => {
    assert.equal(dash.DASH.barbaro.distancia, 280);
});
