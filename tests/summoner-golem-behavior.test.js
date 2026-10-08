'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const server = read('server.js');
const client = read('index.html');
const renderer = read('classes/summoner.js');
const skills = read('skills.js');
const golemVfx = read('efeitos/vfx_summoner_golem.js');
const upgradeVfx = read('efeitos/vfx_summoner_upgrades.js');

test('Colossal transformation expires against a real server timestamp', () => {
    assert.match(server, /ogroC\.colossalExpiresAt = Date\.now\(\) \+ duracaoColossal/);
    assert.match(server, /ogro\.colossalTimer = Math\.max\(0, Math\.ceil\(\(ogro\.colossalExpiresAt - agora\) \/ 50\)\)/);
    assert.match(server, /duracao:\s*duracaoColossal/);
    assert.match(client, /window\.lacaioColossalTimers\[dados\.pid\] = Date\.now\(\) \+ \(dados\.duracao \|\| 20000\)/);
    assert.match(renderer, /Date\.now\(\) >= colossalExpiraEm/);
});

test('Summoner Golem attacks use the rising-and-falling pet damage display', () => {
    assert.match(client, /dados\.type === 'action_golem_ataque'[\s\S]{0,650}window\.petDamageTexts\.push/);
    assert.match(client, /isSummoner:\s*true/);
    assert.match(client, /petText\.isMalakar \|\| petText\.isSummoner/);
    assert.match(client, /petText\.isSummoner \? '🪨'/);
});

test('Golem HP is revealed on pointer hover in normal, colossal and seismic forms', () => {
    assert.match(renderer, /function _desenharTooltipHpGolem/);
    assert.match(renderer, /Math\.abs\(pointerX - x\) > larguraHit/);
    assert.match(renderer, /Math\.ceil\(hp\).*Math\.ceil\(maxHp \|\| hp\)/);
    assert.equal((renderer.match(/_desenharTooltipHpGolem\(ctx,/g) || []).length, 3);
});

test('Golem Seismic damage and all primary area radii are reduced by the requested amounts', () => {
    assert.match(server, /multInstavel \* 0\.5/);
    assert.match(server, /danoColapso = Math\.round\(baseDanoFim \* 1\.20 \* 0\.5\)/);
    assert.match(server, /Math\.hypot\(s\.x - g\.x, s\.y - g\.y\) < 182/);
    assert.match(server, /danoEmBosses\(g\.x, g\.y, 193, pid, danoColapso/);
    assert.match(server, /let raioArea = 182/);
    assert.match(server, /Math\.random\(\) \* 140/);
    assert.match(server, /Math\.hypot\(s\.x - mx, s\.y - my\) < 35/);
    assert.match(server, /registrarDanoMonstro\(s, pid, 15, 'pet'\)/);
    assert.match(server, /dist >= 140/);
    assert.match(skills, /danoBase: 28[\s\S]{0,180}Raio 182/);
    assert.match(golemVfx, /let radius = dados\.radius \|\| 182/);
    assert.match(golemVfx, /77 \+ progress \* 42/);
    assert.match(upgradeVfx, /raio = raio \|\| 182/);
});
