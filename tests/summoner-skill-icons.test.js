const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const skills = fs.readFileSync(path.join(root, 'skills.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const credits = fs.readFileSync(path.join(root, 'imagem/HUD/skills/Slotbar/Summoner/CREDITS.txt'), 'utf8');
const skillsCss = fs.readFileSync(path.join(root, 'skills.css'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const mobileHud = fs.readFileSync(path.join(root, 'mobile-hud.css'), 'utf8');

const icons = [
    { id: 'orbe', file: 'orbe-das-sombras.png' },
    { id: 'ogro', file: 'ogro-guardiao.png' },
    { id: 'esmagamento', file: 'esmagamento-sismico.png' },
    { id: 'salto', file: 'salto-do-ogro.png' },
    { id: 'colossal', file: 'golem-colossal.png' },
    { id: 'sismico', file: 'golem-sismico.png' }
];

test('every Summoner skill and passive uses a valid local Kenney PNG pictogram', () => {
    for (const icon of icons) {
        const file = `imagem/HUD/skills/Slotbar/Summoner/${icon.file}`;
        const escapedPath = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(skills, new RegExp(`id: '${icon.id}'[^\\n]*iconImage: '${escapedPath}'`));

        const image = fs.readFileSync(path.join(root, file));
        assert.deepEqual(
            Array.from(image.subarray(0, 8)),
            [137, 80, 78, 71, 13, 10, 26, 10],
            `${icon.file} must be a PNG`
        );
        assert.equal(image.readUInt32BE(16), 64, `${icon.file} must use the Kenney 2x size`);
        assert.equal(image.readUInt32BE(20), 64, `${icon.file} must be square`);
    }
    assert.match(skillsCss, /\.skill-icon-img\[src\*="\/Summoner\/"\][\s\S]*?background:\s*linear-gradient/);
    assert.match(styleCss, /\.btn-ogro-skill \.btn-action-icon-img,[\s\S]*?width:\s*90%;[\s\S]*?height:\s*90%;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/);
    assert.doesNotMatch(styleCss, /\.btn-ogro-skill \.btn-action-icon-img\s*\{[^}]*radial-gradient/);
    assert.doesNotMatch(mobileHud, /#btn-ogro-skill \.btn-action-icon-img/);
    assert.match(skills, /skillIconeHtml\(skill\)/);
    assert.match(skills, /skillIconeHtml\(skillSel\)/);
});

test('Summoner HUD action buttons use matching images and preserve their handlers', () => {
    const buttons = [
        { id: 'btn-ogro-skill', handler: 'usarComandoOgro', file: 'esmagamento-sismico.png' },
        { id: 'btn-ogro-salto', handler: 'ativarSaltoSmartCast', file: 'salto-do-ogro.png' },
        { id: 'btn-ogro-colossal', handler: 'usarOgroColossal', file: 'golem-colossal.png' },
        { id: 'btn-summoner-golem', handler: 'usarGolemSismico', file: 'golem-sismico.png' }
    ];

    for (const button of buttons) {
        const markup = html.match(new RegExp(`<button id="${button.id}"[^\\n]*`));
        assert.ok(markup, `${button.id} must exist`);
        assert.match(markup[0], new RegExp(`onclick="${button.handler}\\(`));
        assert.match(markup[0], new RegExp(`Summoner/${button.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        assert.match(markup[0], /class="btn-action-icon-img"/);
    }
});

test('Kenney attribution and CC0 license are documented locally and in the Summoner skill screen', () => {
    assert.match(credits, /Kenney Game Icons/);
    assert.match(credits, /Kenney Vleugels/);
    assert.match(credits, /CC0 1\.0/);
    assert.match(html, /id="skills-icon-credits"[^>]*kenney\.nl\/assets\/game-icons/);
    assert.match(html, /Ícones: Kenney Game Icons · CC0/);
    assert.match(skills, /creditosIcones\.style\.display = classe === 'summoner'/);
});

test('game and asset cache versions are advanced', () => {
    assert.match(html, /GAME_VERSION = 'v1\.75\.103'/);
    assert.match(html, /skills\.js\?v=157/);
    assert.match(html, /skills\.css\?v=149/);
    assert.match(html, /style\.css\?v=257/);
    assert.match(html, /mobile-hud\.css\?v=11/);
});
