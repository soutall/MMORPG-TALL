'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const selector = fs.readFileSync(path.join(root, 'personagem-select.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('character selection uses the supplied Malakar and Florim PNG portraits', () => {
    assert.match(selector, /Perfil\/Frorin\.png/);
    assert.match(selector, /Perfil\/Malakar\.png/);
    assert.ok(fs.existsSync(path.join(root, 'imagem', 'HUD', 'Perfil', 'Frorin.png')));
    assert.ok(fs.existsSync(path.join(root, 'imagem', 'HUD', 'Perfil', 'Malakar.png')));
});

test('HUD resolves Malakar to his supplied portrait', () => {
    assert.match(html, /lord_malakar:\s*'Malakar'/);
    assert.match(html, /var _perfilMapa = \{[\s\S]*?lord_malakar:\s*'Malakar'/);
});

test('all other class renderers are visually enlarged around the feet without scaling Malakar', () => {
    assert.match(html, /ctx\.save\(\);\s*if \(classeJogador !== 'lord_malakar'\) \{\s*const escalaVisualClasse = 1\.3;/);
    assert.match(html, /ctx\.scale\(escalaVisualClasse, escalaVisualClasse\)/);
    assert.match(html, /ctx\.restore\(\);[\s\S]{0,700}if \(classeJogador === 'lord_malakar' && window\.desenharLordMalakarBuff\)/);
});
