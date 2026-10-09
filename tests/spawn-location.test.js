'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('new characters and respawns use the configured Gaia birth location', () => {
    assert.match(server, /const MUNDO_SPAWN_X = 143854, MUNDO_SPAWN_Y = 13897;/);
    assert.match(server, /const CIDADE_SPAWN_X = MUNDO_SPAWN_X, CIDADE_SPAWN_Y = MUNDO_SPAWN_Y;/);
    assert.match(html, /window\.SPAWN_CIDADE = \{ x: 143854, y: 13897 \};/);
    assert.match(html, /window\.SPAWN_MUNDO = \{ x: 143854, y: 13897 \};/);
    assert.match(html, /window\.meuX = 143854, window\.meuY = 13897/);
});
