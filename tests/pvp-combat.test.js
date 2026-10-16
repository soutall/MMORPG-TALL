'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('basic PvP projectile hits validate both players and collide against player centers', () => {
    assert.match(server, /function pvpPodeAtacar\(atkId, defId\)[\s\S]*?if \(!p1\.pvpAtivo \|\| !p2\.pvpAtivo\) return false;/);
    assert.match(server, /if \(pvpPodeAtacar\(pp\.ownerId, pd\) && instanciaCompativel\(p1, p2\) &&\s*Math\.hypot\(p2\.x \+ PLAYER_OFFSET_X - pp\.x, p2\.y \+ PLAYER_OFFSET_Y - pp\.y\) < 30\)/);
    assert.match(server, /aplicarDanoAtaqueBasicoAlvo\(playerId, data\.alvoTipo, data\.alvoId, danoAdaga, 'físico'\)/);
    assert.match(client, /considerar\(p, 'player', pid\)/);
    assert.match(client, /let id = alvoId !== undefined \? alvoId : alvo\.id;/);
    assert.match(server, /alvoTipo === 'player' \? alvo\.x \+ PLAYER_OFFSET_X : alvo\.x/);
});

test('Ladino Dance collects eligible PvP players and revalidates them before teleporting and damaging', () => {
    assert.match(client, /function existeAlvoLadinoProximo\(raio\)[\s\S]*?if \(eu && eu\.pvpAtivo && window\.todosJogadores\)[\s\S]*?jogador\.pvpAtivo[\s\S]*?return true;/);
    assert.match(server, /Object\.keys\(players\)\.forEach\(id => \{[\s\S]*?pvpPodeAtacar\(playerId, id\)[\s\S]*?tipo: 'player'/);
    assert.match(server, /seqAlvo\.tipo === 'player' && pvpPodeAtacar\(pid, seqAlvo\.id\)/);
    assert.match(server, /const destPvP = validarDestinoJogador\([\s\S]*?aplicarDanoPvP\(pid, seqAlvo\.id, d\.danoBase, 'físico'\)/);
});

test('Warrior shield damages and pulls valid PvP targets, including through the Titanic upgrade', () => {
    assert.match(server, /function acertarJogadorEscudo\(projetil, alvoId\)[\s\S]*?pvpPodeAtacar\(projetil\.ownerId, alvoId\)/);
    assert.match(server, /const destino = validarDestinoJogador\([\s\S]*?alvo\.x = destino\.x;[\s\S]*?alvo\.y = destino\.y;/);
    assert.match(server, /aplicarDanoPvP\(projetil\.ownerId, alvoId, projetil\.dano, 'físico'\)/);
    assert.match(server, /if \(upg\.titanico\)[\s\S]*?acertarJogadorEscudo\(e, pidAlvo\)/);
});

test('Archer skill 4 rain damages eligible PvP players inside the impact area', () => {
    assert.match(server, /const arqueiraDona = players\[ch\.ownerId\];[\s\S]*?if \(arqueiraDona && arqueiraDona\.hp > 0 && arqueiraDona\.pvpAtivo\) \{[\s\S]*?pvpPodeAtacar\(ch\.ownerId, alvoId\)[\s\S]*?instanciaCompativel\(arqueiraDona, alvo\)/);
    assert.match(server, /alvo\.x \+ PLAYER_OFFSET_X - ch\.x,[\s\S]*?alvo\.y \+ PLAYER_OFFSET_Y - ch\.y[\s\S]*?distancia < 120 && Math\.random\(\) > 0\.5[\s\S]*?aplicarDanoPvP\(\s*ch\.ownerId,\s*alvoId,\s*dmgSkill\(arqueiraDona, 'salto_chuva', 15\),\s*'físico'\s*\)/);
    assert.match(server, /if \(data\.action === 'arqueiro_salto_chuva'\) \{\s*let p = players\[playerId\];\s*if\(!p \|\| p\.hp <= 0 \|\| p\.classe !== 'arqueiro'\) return;/);
    assert.match(server, /if \(data\.action === 'arqueiro_salto_chuva_shoot'\) \{\s*let p = players\[playerId\];\s*if\(!p \|\| p\.hp <= 0 \|\| p\.classe !== 'arqueiro' \|\| !p\.saltoChuvaAtivo\) return;\s*if \(!alcanceSkillValido\(p, data\.targetX, data\.targetY, 350\)\)/);
});
