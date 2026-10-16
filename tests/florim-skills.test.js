'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const client = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

test('Florim HUD skills use the shared cooldown ring and ready glow', () => {
    for (const [id, state, seconds] of [
        ['btn-florim-arvore', 'florimArvoreCooldown', 15],
        ['btn-florim-semente', 'florimSementeCooldown', 10],
        ['btn-florim-espinhos', 'florimEspinhosCooldown', 13],
        ['btn-florim-parede', 'florimParedeCooldown', 10]
    ]) {
        assert.match(client, new RegExp(`\\['${id}', \\(\\) => ${state}, ${seconds}\\]`));
    }
    assert.match(client, /if \(dados\.id === window\.meuId\) iniciarCooldownFlorim\('florim_parede', 10000\)/);
    assert.match(client, /iniciarCooldownFlorim\(dados\.skill, dados\.restante\)/);
    assert.match(styles, /\.btn-action\.cd-ready\s*\{\s*animation:\s*cdProntoPulso/);
    assert.match(styles, /\.btn-action\.cd-active::after/);
});

test('Florim thorn wall roots monsters and eligible PvP players for the wall remaining lifetime', () => {
    assert.match(server, /const presoAte = Date\.now\(\) \+ z\.tempo \* 50;[\s\S]*?const duracaoPresoTicks = Math\.max\(1, z\.tempo\)/);
    assert.match(server, /m\.isPreso=Math\.max\(m\.isPreso\|\|0,presoAte\); efeitos\.aplicarEfeito\(m,'paralisia',duracaoPresoTicks,1\)/);
    assert.match(server, /b\.isPreso=Math\.max\(b\.isPreso\|\|0,presoAte\); efeitos\.aplicarEfeito\(b,'paralisia',duracaoPresoTicks,1\)/);
    assert.match(server, /q\.isPreso=Math\.max\(q\.isPreso\|\|0,presoAte\); efeitos\.aplicarEfeito\(q,'paralisia',duracaoPresoTicks,1\); sincronizarEfeitos\(pid, q\)/);
    assert.match(server, /pid!==z\.ownerId && pvpPodeAtacar\(z\.ownerId, pid\)/);
});
