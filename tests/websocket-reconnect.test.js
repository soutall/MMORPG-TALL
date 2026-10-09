const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const characterSelect = fs.readFileSync(path.join(root, 'personagem-select.js'), 'utf8');

test('WebSocket close retries with capped exponential backoff and stops after the limit', () => {
    assert.match(html, /const MAX_TENTATIVAS_RECONEXAO = 8/);
    assert.match(html, /Math\.min\(1000 \* \(2 \*\* tentativasReconexao\), 20000\)/);
    assert.match(html, /if \(!reconexaoHabilitada \|\| !credential\) return/);
    assert.match(html, /if \(reconexaoHabilitada && ws === socket\) conectarWebSocket\(credential, true\)/);
    assert.match(html, /if \(tentativasReconexao >= MAX_TENTATIVAS_RECONEXAO\)/);
});

test('logout, superseded sessions, and rejected reconnect credentials do not loop', () => {
    assert.match(html, /window\.logoutGoogleConta = function \(\) \{[\s\S]{0,200}reconexaoHabilitada = false;/);
    assert.match(html, /window\.ws\.close\(\)/);
    assert.match(html, /if \(event\.code === 4001\) \{[\s\S]{0,120}reconexaoHabilitada = false/);
    assert.match(html, /if \(ehReconexao\) \{[\s\S]{0,200}reconexaoHabilitada = false/);
});

test('an interrupted in-world session reselects the same character after account authentication', () => {
    assert.match(html, /window\.PersonagemSelect\.prepararReconexao\(window\.meuId\)/);
    assert.match(characterSelect, /function prepararReconexao\(nome\)/);
    assert.match(characterSelect, /estado\.reconexaoPendente = null/);
    assert.match(characterSelect, /estado\.entrouSelecionado = true;[\s\S]{0,130}action: 'personagem_selecionar', personagem: nomeReconectado/);
    assert.match(characterSelect, /autoEntrarComClasse: autoEntrarComClasse,[\s\S]{0,80}prepararReconexao: prepararReconexao/);
});

test('client and character selector caches are advanced for the reconnect fix', () => {
    assert.match(html, /GAME_VERSION = 'v1\.75\.103'/);
    assert.match(html, /personagem-select\.js\?v=8/);
});
