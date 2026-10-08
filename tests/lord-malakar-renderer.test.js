'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'classes', 'lord_malakar.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('Lord Malakar summons display current and maximum health below their health bars', () => {
    assert.match(renderer, /const hpText = Math\.max\(0, Math\.ceil\(entity\.hp\)\) \+ '\/'/);
    assert.match(renderer, /ctx\.fillText\(hpText, 0, 25\)/);
    assert.match(renderer, /const hovering = Number\.isFinite\(pointerX\) && Number\.isFinite\(pointerY\)[\s\S]{0,120}if \(hovering\)/);
});

test('Malakar HUD shows icon-only counts for active summons below stamina', () => {
    assert.match(client, /function desenharIconesLacaiosMalakar/);
    assert.match(client, /entity\.hp > 0/);
    assert.match(client, /ctx\.fillText\('x' \+ item\.quantidade/);
    assert.match(client, /B\.stamina\.y, animacaoAgora/);
    assert.match(client, /ctx\.canvas\.width \* 0\.012/);
    assert.doesNotMatch(client, /function desenharIconesLacaiosMalakar\(ctx, e, x, y, agora\)[\s\S]{0,1200}\bhx\b/);
    for (const type of ['skull_warrior', 'skull_archer', 'skull_mage', 'reaper', 'sniper', 'cleric']) {
        assert.ok(client.includes("id: '" + type + "'"));
    }
});

test('player health floaters round fractional server HP deltas for display only', () => {
    assert.match(client, /text:\s*"-"\s*\+\s*Math\.round\(danoRecebido\)/);
    assert.match(client, /text:\s*"\+"\s*\+\s*Math\.round\(curado\)/);
    assert.match(client, /window\.meuHp\s*=\s*hpServidor/);
});

test('skull warrior has independent walk and sweeping basic-attack animations', () => {
    assert.match(renderer, /function drawWarriorSkull/);
    assert.match(renderer, /entity\.moving \? Math\.sin\(time \/ 66\)/);
    assert.match(renderer, /ctx\.arc\(5, -2, 21, -2\.2 \+ sweep \* 1\.85/);
    assert.match(renderer, /if \(type === 'skull_warrior'\) \{\s*ctx\.save\(\);\s*ctx\.scale\(\.85, \.85\);\s*drawWarriorSkull/);
});

test('warrior, archer, and mage skulls are visually scaled down without changing summon stats', () => {
    const skullDispatch = renderer.match(/function drawSkull\(ctx, entity, time\) \{([\s\S]*?)\r?\n    \}\r?\n\r?\n    function drawCleric/);
    assert.ok(skullDispatch);
    for (const type of ['skull_warrior', 'skull_archer', 'skull_mage']) {
        const branch = skullDispatch[1].match(new RegExp("if \\(type === '" + type + "'\\) \\{([\\s\\S]*?)return;"));
        assert.ok(branch, type + ' must have a visual renderer');
        assert.match(branch[1], /ctx\.scale\(\.85, \.85\)/);
    }
    assert.match(renderer, /ctx\.translate\(entity\.x, entity\.y\);[\s\S]{0,100}drawSkull\(ctx, entity, time\)/);
});

test('skull archer has its own detailed animation and teal basic attack effect', () => {
    assert.match(renderer, /function drawArcherSkull/);
    assert.match(renderer, /if \(type === 'skull_archer'\) \{\s*ctx\.save\(\);\s*ctx\.scale\(\.85, \.85\);\s*drawArcherSkull/);
    assert.match(renderer, /const teal = '#39f0d0'/);
    assert.match(renderer, /if \(attacking && progress > \.56\)/);
    assert.match(renderer, /const arrowColor = '#42f3d1'/);
});

test('skull mage has an arcane blue-gold design, animated staff, and oversized lightning attack', () => {
    const mage = renderer.match(/function drawMageSkull\(ctx, entity, time\) \{([\s\S]*?)\r?\n    \}\r?\n\r?\n    function drawSkull/);
    assert.ok(mage);
    assert.match(renderer, /if \(type === 'skull_mage'\) \{\s*ctx\.save\(\);\s*ctx\.scale\(\.85, \.85\);\s*drawMageSkull/);
    assert.match(mage[1], /const blue = '#168dff'/);
    assert.match(mage[1], /const gold = '#e9b95f'/);
    assert.match(mage[1], /ctx\.scale\(facing \* 1\.04, 1\.04\)/);
    assert.match(mage[1], /const kneeX = hipX \+ phase \* 1\.5/);
    assert.match(mage[1], /const footX = hipX \+ phase \* 3\.2/);
    assert.match(mage[1], /const hipX = side \* 4/);
    assert.match(mage[1], /ctx\.lineTo\(2, -23\)/);
    assert.match(renderer, /attack === 'skull_mage'[\s\S]{0,1000}rgba\(14, 46, 174, \.76\)/);
    assert.match(renderer, /attack === 'skull_mage'[\s\S]{0,6000}ctx\.setLineDash\(\[3, 4\]\)/);
});

test('skull warrior sword floats beside the summon and mirrors with its facing direction', () => {
    assert.match(renderer, /ctx\.scale\(facing \* 1\.12, 1\.12\)/);
    assert.match(renderer, /const swordFloat = Math\.sin\(time \/ 145/);
    assert.match(renderer, /ctx\.translate\(13 \+ Math\.sin\(time \/ 310/);
    assert.match(renderer, /ctx\.rotate\(attacking \? -\.75/);
});

test('summoned skulls move 50% faster while pursuing enemies', () => {
    assert.match(server, /const movementMultiplier = target \? 1\.5 : 1/);
    assert.match(server, /lordMalakar\.CONFIG\.skullMovementStep \* movementMultiplier/);
});
