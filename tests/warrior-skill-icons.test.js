const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const skills = fs.readFileSync(path.join(root, 'skills.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const mobileHud = fs.readFileSync(path.join(root, 'mobile-hud.css'), 'utf8');

const icons = [
    {
        id: 'corte',
        file: 'Sonoro/Guerreiro/atk-basico.png',
        name: 'atk-basico.png'
    },
    {
        id: 'postura_guardiao',
        file: 'Sonoro/Guerreiro/skill-1.png',
        name: 'skill-1.png'
    },
    {
        id: 'escudo_lancamento',
        file: 'Sonoro/Guerreiro/skill-2.png',
        name: 'skill-2.png'
    },
    {
        id: 'provocacao',
        file: 'Sonoro/Guerreiro/skill-3.png',
        name: 'skill-3.png'
    },
    {
        id: 'tornado',
        file: 'Sonoro/Guerreiro/skill-4.png',
        name: 'skill-4.png'
    },
    {
        id: 'bloqueio',
        file: 'Sonoro/Guerreiro/passiva-1.png',
        name: 'passiva-1.png'
    },
    {
        id: 'ultimo_folego',
        file: 'Sonoro/Guerreiro/passiva-2.png',
        name: 'passiva-2.png'
    }
];

test('Warrior skill menu uses the ordered supplied icons for active skills and passives', () => {
    for (const icon of icons) {
        const escapedPath = icon.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(skills, new RegExp(`id: '${icon.id}'[^\\n]*iconImage: '${escapedPath}'`));
    }
    assert.match(skills, /skillIconeHtml\(skill\)/);
    assert.match(skills, /skillIconeHtml\(skillSel\)/);
    assert.match(skills, /return skill \? skill\.icon : ''/);
});

test('the two Warrior action buttons use their matching images without changing their handlers', () => {
    const slots = [
        ['btn-guerreiro-guardiao', 'usarPosturaGuardiao', 'skill-1.png', 'Aura do Vanguarda'],
        ['btn-tornado', 'usarTornado', 'skill-4.png', 'Giro do Vanguarda'],
        ['btn-guerreiro-provocacao', 'usarGritoProvocacao', 'skill-3.png', 'Grito Estrondoso'],
        ['btn-guerreiro-escudo', 'ativarEscudoSmartCast', 'skill-2.png', 'Lançamento do Escudo']
    ];
    for (const [buttonId, handler, file, alt] of slots) {
        const tagPattern = new RegExp(`<button id="${buttonId}"[\\s\\S]*?<\\/button>`);
        const button = html.match(tagPattern);
        assert.ok(button, `${buttonId} should exist`);
        assert.ok(button[0].includes(`onclick="${handler}();`), `${buttonId} should preserve its handler`);
        assert.ok(button[0].includes(`src="Sonoro/Guerreiro/${file}"`), `${buttonId} should use ${file}`);
        assert.ok(button[0].includes(`alt="${alt}"`), `${buttonId} should have an accessible alt label`);
    }
    assert.match(html, /class="btn-action-icon-img"/);
});

test('HUD skill images use the full slot without clipping their artwork', () => {
    assert.match(style, /\.btn-action-icon-img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*border-radius:\s*0;/);
    assert.match(mobileHud, /\.btn-action-icon-img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*border-radius:\s*0;/);
});

test('all supplied Warrior icons are valid PNGs and the version/cache references are updated', () => {
    for (const icon of icons) {
        const image = fs.readFileSync(path.join(root, icon.file));
        assert.deepEqual(
            Array.from(image.subarray(0, 8)),
            [137, 80, 78, 71, 13, 10, 26, 10],
            `${icon.name} must be a PNG`
        );
        assert.ok(image.readUInt32BE(16) > 0);
        assert.ok(image.readUInt32BE(20) > 0);
    }
    assert.match(html, /GAME_VERSION = 'v1\.75\.110'/);
    assert.match(html, /skills\.js\?v=159/);
    assert.match(html, /skills\.css\?v=149/);
    assert.match(html, /style\.css\?v=264/);
    assert.match(html, /mobile-hud\.css\?v=13/);
});
