'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
const configCss = fs.readFileSync(path.join(root, 'config.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('visual settings activate a horizontal, compact card layout', () => {
    assert.match(config, /classList\.toggle\("visual-ativa",\s*aba === 'visual'\)/);
    assert.match(configCss, /#settings-window\.visual-ativa\s*\{[^}]*width:\s*min\(1000px,\s*94vw\)/s);
    assert.match(configCss, /#settings-window\.visual-ativa #settings-tab-visual\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
    assert.match(configCss, /#settings-window\.visual-ativa #settings-acoes\s*\{[^}]*flex-direction:\s*row/s);
    assert.match(configCss, /@media \(max-width:\s*560px\) and \(orientation:\s*portrait\)/);
    assert.match(html, /config\.css\?v=152/);
});

test('desktop audio settings share the visual tab window styling without changing mobile layout', () => {
    assert.match(config, /classList\.toggle\("audio-ativa",\s*aba === 'audio' && plataformaEhPC\(\)\)/);
    assert.match(configCss, /@media \(min-width:\s*1025px\) and \(pointer:\s*fine\)/);
    assert.match(configCss, /#settings-window\.audio-ativa #settings-tab-audio\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
    assert.match(configCss, /#settings-window\.audio-ativa #settings-acoes\s*\{[^}]*flex-direction:\s*row/s);
});
