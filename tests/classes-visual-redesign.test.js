'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const backup = path.join(root, 'backups', 'class-visuals-2026-10-07');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('class weapon and companion renderers keep their public entry points with the new art', () => {
    const berserker = read('classes/barbaro.js');
    const pikeman = read('classes/pikeman.js');
    const roqueiro = read('classes/roqueiro.js');
    const florim = read('classes/florim.js');

    assert.match(berserker, /window\.desenharBarbaro\s*=/);
    assert.match(berserker, /MACHADO DE GUERRA FLUTUANTE/);
    assert.match(berserker, /ladoArma \* \(27 \+ avancarGolpe\)/);
    assert.match(berserker, /ctx\.scale\(tamanho \* 0\.84, largura \* 0\.84\)/);
    assert.match(berserker, /ctx\.moveTo\(-1, -8\);[\s\S]{0,100}ctx\.lineTo\(13, -22\);[\s\S]{0,180}ctx\.lineTo\(8, 9\);/);
    assert.match(berserker, /ctx\.moveTo\(-3, -10\);[\s\S]{0,100}ctx\.lineTo\(11, -7\);[\s\S]{0,100}ctx\.lineTo\(-3, -4\);/);
    assert.doesNotMatch(berserker, /ctx\.ellipse\(-12, -20/);
    assert.match(pikeman, /window\.desenharPikeman\s*=/);
    assert.match(pikeman, /const armaFlutuante = estado === 'idle' \|\| estado === 'andando'/);
    assert.match(pikeman, /Deep hood, engraved executioner mask and red eye slits/);
    assert.match(pikeman, /Heavy crescent blade sweeps from the haft/);
    assert.match(pikeman, /ctx\.translate\(0, estado === 'execucao' \|\| estado === 'geada' \? 1\.8 : 3\)/);
    assert.match(pikeman, /ctx\.lineTo\(5, -26\); ctx\.lineTo\(0, -23\);[\s\S]{0,40}ctx\.closePath\(\);/);
    assert.match(pikeman, /window\.desenharFoiceExposta\s*=/);
    assert.match(roqueiro, /window\.desenharRoqueiro\s*=/);
    assert.match(roqueiro, /GUItARRA ELÉTRICA PRESA AO PEITO/i);
    assert.match(roqueiro, /window\.desenharBandaRoqueiro\s*=/);
    assert.match(roqueiro, /Microfone erguido na mao e ondas sonoras do vocal/);
    assert.match(florim, /window\.desenharFlorim\s*=/);
    assert.match(florim, /Cajado das Rosas/i);
});

test('class skill effects follow the revised visual themes without changing skill handlers', () => {
    const berserkerEffects = read('efeitos/barbaro_efeitos.js');
    const pikemanEffects = read('efeitos/pikeman_efeitos.js');
    const roqueiroEffects = read('efeitos/roqueiro_efeitos.js');
    const florimEffects = read('efeitos/florim_efeitos.js');

    assert.match(berserkerEffects, /Fraturas carmesim abrem no chao/);
    assert.match(pikemanEffects, /Arcos em forma de foice/);
    assert.match(roqueiroEffects, /entrada de palco do lacaio vocalista/);
    assert.match(florimEffects, /ROSEIRA ANCESTRAL/i);
    assert.match(florimEffects, /crescimentoArvore/);
    assert.match(florimEffects, /desenharRosaVfx/);
});

test('all changed class and skill files have a restorable original backup', () => {
    const files = [
        'classes__barbaro.js',
        'classes__pikeman.js',
        'classes__roqueiro.js',
        'classes__florim.js',
        'efeitos__barbaro_efeitos.js',
        'efeitos__pikeman_efeitos.js',
        'efeitos__roqueiro_efeitos.js',
        'efeitos__florim_efeitos.js',
        'efeitos__vfx_barbaro_vinculo.js',
        'index.html'
    ];

    for (const file of files) {
        const saved = path.join(backup, file);
        assert.ok(fs.existsSync(saved), `missing backup: ${file}`);
        assert.ok(fs.statSync(saved).size > 0, `empty backup: ${file}`);
    }
});

test('browser caches load the redesigned class and skill renderers', () => {
    const html = read('index.html');

    assert.match(html, /const GAME_VERSION = 'v1\.75\.103'/);
    assert.equal((html.match(/game-version-display">v1\.75\.103/g) || []).length, 1);
    for (const [script, version] of [
        ['classes/barbaro.js', '1005'],
        ['classes/pikeman.js', '14'],
        ['classes/roqueiro.js', '1003'],
        ['classes/florim.js', '7'],
        ['efeitos/barbaro_efeitos.js', '232'],
        ['efeitos/pikeman_efeitos.js', '3'],
        ['efeitos/roqueiro_efeitos.js', '232'],
        ['efeitos/florim_efeitos.js', '6']
    ]) {
        const escapedScript = script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(html, new RegExp(`${escapedScript}\\?v=${version}`));
    }
});
