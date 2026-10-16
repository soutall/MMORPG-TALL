'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const client = read('index.html');
const server = read('server.js');
const barbarianEffects = read('efeitos/barbaro_efeitos.js');

test('Dronemaster suppression broadcasts one target per projectile from the drone', () => {
    assert.match(server, /type: 'action_dm_supressao_tiro',[\s\S]{0,180}droneX: dxD,[\s\S]{0,100}targets: tirosD\.map/);
    assert.match(client, /action_dm_supressao_tiro[\s\S]{0,700}targets\.forEach[\s\S]{0,220}criarProjetilDrone\(droneX, droneY, target\.x, target\.y, false\)/);
    assert.match(client, /Number\.isFinite\(dados\.droneX\)[\s\S]{0,100}dados\.droneX/);
});

test('Malakar hold attack tracks the enemy under the mouse and stops on mouse release', () => {
    assert.match(client, /canvas\.addEventListener\("mousedown", function \(e\) \{[\s\S]{0,250}window\.minhaClasse !== 'lord_malakar'/);
    assert.match(client, /function atacarMalakarSobMouse\(\)[\s\S]{0,700}executarAtaqueBasico\(false, alvo\)/);
    assert.match(client, /window\.addEventListener\('mouseup', function \(e\) \{[\s\S]{0,260}ataqueMalakarSegurado = false;[\s\S]{0,140}clearTimeout\(timerAtaqueMalakar\)/);
});

test('Barbarian blood VFX is sparse and only uses server-confirmed hit coordinates', () => {
    assert.match(barbarianEffects, /for \(let i = 0; i < 7; i\+\+\)/);
    assert.match(server, /type: 'action_machadada',[\s\S]{0,350}hitX: alvoAuto \? alvoAuto\.x : null,[\s\S]{0,80}hitY: alvoAuto \? alvoAuto\.y : null/);
    assert.match(client, /Number\.isFinite\(dados\.hitX\) && Number\.isFinite\(dados\.hitY\)[\s\S]{0,140}criarAnimacaoSangue\(dados\.hitX, dados\.hitY\)/);
});
