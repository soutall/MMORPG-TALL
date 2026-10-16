'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const intro = fs.readFileSync(path.join(__dirname, '..', 'intro.js'), 'utf8');

test('intro is temporarily skipped without removing its implementation', () => {
    assert.match(html, /window\.INTRO_TEMPORARIAMENTE_DESATIVADA = true/);
    assert.match(html, /if \(window\.INTRO_TEMPORARIAMENTE_DESATIVADA\) \{\s*window\.INTRO_RODOU_FLAG = true;\s*return;\s*\}/);
    assert.match(html, /html\.intro-temporariamente-desativada #intro-overlay \{ display: none !important; \}/);
    assert.match(intro, /if \(global\.INTRO_TEMPORARIAMENTE_DESATIVADA\) \{\s*console\.info\('\[intro\] introdução temporariamente desativada\.'\);\s*return;\s*\}/);
    assert.match(intro, /function criarDOM\(\)/);
    assert.match(html, /<script src="intro\.js\?v=2"><\/script>/);
    assert.match(html, /const GAME_VERSION = 'v1\.75\.110'/);
});
