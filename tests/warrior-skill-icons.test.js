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
        file: 'imagem/HUD/skills/Slotbar/guerreiro/ataque basico.png',
        name: 'ataque basico.png'
    },
    {
        id: 'tornado',
        file: 'imagem/HUD/skills/Slotbar/guerreiro/Giro do Vanguarda.png',
        name: 'Giro do Vanguarda.png'
    },
    {
        id: 'escudo_lancamento',
        file: 'imagem/HUD/skills/Slotbar/guerreiro/lancamento do escudo.png',
        name: 'lancamento do escudo.png'
    }
];

test('Warrior skill menu uses supplied image icons and preserves emoji fallback for passives', () => {
    for (const icon of icons) {
        const escapedPath = icon.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(skills, new RegExp(`id: '${icon.id}'[^\\n]*iconImage: '${escapedPath}'`));
    }
    assert.match(skills, /skillIconeHtml\(skill\)/);
    assert.match(skills, /skillIconeHtml\(skillSel\)/);
    assert.match(skills, /return skill \? skill\.icon : ''/);
    assert.match(skills, /id: 'bloqueio', nome: 'Escudo Ogival do Leão \(Passiva\)', icon: '🛡️'/);
    assert.match(skills, /id: 'ultimo_folego', nome: 'Último Fôlego \(Passiva\)', icon: '🔥'/);
});

test('the two Warrior action buttons use their matching images without changing their handlers', () => {
    assert.match(html, /id="btn-tornado"[^>]*onclick="usarTornado\(\);[^"]*"[^>]*><img src="imagem\/HUD\/skills\/Slotbar\/guerreiro\/Giro%20do%20Vanguarda\.png"/);
    assert.match(html, /id="btn-guerreiro-escudo"[^>]*onclick="ativarEscudoSmartCast\(\);[^"]*"[^>]*><img src="imagem\/HUD\/skills\/Slotbar\/guerreiro\/lancamento%20do%20escudo\.png"/);
    assert.match(html, /class="btn-action-icon-img"/);
});

test('HUD skill images use the full slot without clipping their artwork', () => {
    assert.match(style, /\.btn-action-icon-img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*border-radius:\s*0;/);
    assert.match(mobileHud, /\.btn-action-icon-img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*border-radius:\s*0;/);
});

test('all prepared icons are valid square PNGs and the version/cache references are updated', () => {
    for (const icon of icons) {
        const image = fs.readFileSync(path.join(root, icon.file));
        assert.deepEqual(
            Array.from(image.subarray(0, 8)),
            [137, 80, 78, 71, 13, 10, 26, 10],
            `${icon.name} must be a PNG`
        );
        assert.equal(image.readUInt32BE(16), image.readUInt32BE(20), `${icon.name} must be square`);
        assert.ok(image.readUInt32BE(16) > 0);
    }
    assert.match(html, /GAME_VERSION = 'v1\.75\.50'/);
    assert.match(html, /skills\.js\?v=156/);
    assert.match(html, /skills\.css\?v=149/);
    assert.match(html, /style\.css\?v=254/);
    assert.match(html, /mobile-hud\.css\?v=9/);
});
