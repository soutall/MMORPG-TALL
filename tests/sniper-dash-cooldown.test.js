'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const client = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('Sniper dash confirms and cooldown rejections return server remaining time', () => {
    assert.match(server, /function dashAvisarCooldown\(pid, ws, p\)[\s\S]*?motivo: 'cooldown',[\s\S]*?cooldownRestanteMs: Math\.max\(0, \(p\.dashCdAte \|\| 0\) - Date\.now\(\)\)/);
    assert.match(server, /if \(!dashNoCd\(p\)\) \{ dashAvisarCooldown\(playerId, ws, p\); return; \}/);
    assert.match(server, /if \(!dashNoCd\(p\)\) \{ dashAvisarCooldown\(playerId, ws, p\); return; \}\s*let custoDash = cfg\.stamina;/);
    assert.match(server, /tipo: 'camuflagem',[\s\S]*?cooldownRestanteMs: Math\.max\(0, p\.dashCdAte - Date\.now\(\)\)/);
});

test('Sniper dash button stays blocked and its ring follows authoritative server time', () => {
    assert.match(client, /function sincronizarCooldownDash\(restanteMs, duracaoMs\)[\s\S]*?dashCdAteServidor = Date\.now\(\) \+ restante;[\s\S]*?btnDash\.dataset\.cdUntil = String\(dashCdAteServidor\)/);
    assert.match(client, /if \(dados\.motivo === 'cooldown'\) \{\s*sincronizarCooldownDash\(dados\.cooldownRestanteMs, dashConfig\(\)\.cooldownMs\)/);
    assert.match(client, /const restante = Number\.isFinite\(Number\(dados\.cooldownRestanteMs\)\)\s*\?\s*dados\.cooldownRestanteMs\s*:\s*dados\.cooldownMs;\s*sincronizarCooldownDash\(restante, dados\.cooldownMs\)/);
    assert.match(client, /if \(Date\.now\(\) < dashCdAteServidor\) return;/);
});
