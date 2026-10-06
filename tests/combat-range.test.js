'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const dash = require('../dash.js');

const projectRoot = path.resolve(__dirname, '..');
const clientSource = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

test('melee basic-attack search ranges match between client and server', () => {
    const expected = {
        guerreiro: 50,
        barbaro: 50,
        ladino: 44,
        pikeman: 50,
        guerreiro_kaledron: 55
    };

    for (const [className, range] of Object.entries(expected)) {
        assert.match(clientSource, new RegExp("c === '" + className + "'\\) return " + range + ";"));
        assert.match(serverSource, new RegExp("p\\.classe === '" + className + "'\\) return " + range + ";"));
    }
});

test('berserker charge dash distance is reduced to 280 units', () => {
    assert.equal(dash.DASH.barbaro.distancia, 280);
});
