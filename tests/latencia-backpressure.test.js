'use strict';

// Regressão da correção de picos de RTT em localhost.
// Contexto: AUDITORIA_LATENCIA_MAPA_E_PING.md + ping-diagnostics.log (280 eventos).
// Sintoma medido: RTT de até 37 s com serverProcessingMs = 0 e fila de 80 MB,
// porque o world_update de 20 Hz era fire-and-forget sem backpressure.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('o world_update respeita backpressure e nao despeja fila sem limite', () => {
    // O limite precisa existir e ser um valor finito e modesto.
    assert.match(
        serverSource,
        /const WORLD_UPDATE_LIMITE_BUFFER_BYTES = (\d+) \* 1024;/,
        'WORLD_UPDATE_LIMITE_BUFFER_BYTES nao declarado em bytes'
    );
    const limite = Number(serverSource.match(/const WORLD_UPDATE_LIMITE_BUFFER_BYTES = (\d+) \* 1024;/)[1]);
    assert.ok(limite > 0 && limite <= 4096, `limite fora da faixa esperada (0..4096 KB): ${limite} KB`);

    // O bufferedAmount precisa ser lido ANTES do envio do world_update...
    assert.match(serverSource, /client\.bufferedAmount/, 'o tick nao le o bufferedAmount do cliente');

    // ...e precisa realmente abortar o envio quando estoura. A checagem tem que
    // estar no corpo do tick (perto do broadcast), nao na declaracao da constante.
    const inicioMarcador = serverSource.indexOf('BACKPRESSURE (anti-pico de RTT em localhost)');
    assert.ok(inicioMarcador > 0, 'nao encontrei o bloco de backpressure do tick');
    const bloco = serverSource.slice(inicioMarcador, inicioMarcador + 1500);
    assert.match(
        bloco,
        /if \(bufferizado > WORLD_UPDATE_LIMITE_BUFFER_BYTES\) \{[\s\S]*?return;/,
        'o tick nao aborta o envio quando a fila estoura o limite'
    );
    // O `return` precisa vir ANTES do client.send do world_update, senao o
    // snapshot continua sendo despejado na fila (que era exatamente o bug).
    const indiceAborta = bloco.indexOf('WORLD_UPDATE_LIMITE_BUFFER_BYTES) {');
    const indiceEnvia = bloco.indexOf('client.send(');
    assert.ok(
        indiceAborta > -1 && indiceEnvia === -1,
        'ainda existe um client.send dentro do trecho de backpressure'
    );
});

test('o tick contabiliza os snapshots segurados para diagnostico', () => {
    assert.match(serverSource, /_worldUpdateTicksPerdidos/, 'sem contador de ticks perdidos');
    assert.match(serverSource, /_worldUpdateBufferPico/, 'sem registro de pico de fila');
    // E o cliente precisa receber a telemetria.
    assert.match(serverSource, /backpressure:\s*diagnosticoBackpressure/, 'world_update nao expoe backpressure');
    assert.match(indexHtml, /dados\.backpressure/, 'cliente nao le a telemetria de backpressure');
});

test('o pong nunca depende da fila de world_update', () => {
    // O pong precisa continuar sendo enviado sempre, mesmo com fila alta:
    // ele e pequeno e e justamente o que o jogador olha no HUD.
    const trechoPong = serverSource.slice(
        serverSource.indexOf("data.action === 'ping'"),
        serverSource.indexOf("data.action === 'ping'") + 900
    );
    assert.match(trechoPong, /ws\.send\(/, 'o pong parou de ser enviado');
    assert.doesNotMatch(
        trechoPong,
        /bufferized > WORLD_UPDATE_LIMITE_BUFFER_BYTES/,
        'o pong foi condicionado ao backpressure e deixaria de responder'
    );
});

test('o loop de render tem teto de FPS e nao depende do refresh do monitor', () => {
    assert.match(indexHtml, /const FPS_MAXIMO = /, 'teto de FPS ausente');
    assert.match(indexHtml, /agendarProximoFrame\(\);/, 'o loop nao usa o agendador com teto');
    // O desenho precisa continuar dentro de requestAnimationFrame, senao o
    // canvas pode ser composto fora do ciclo de pintura da pagina.
    assert.match(
        indexHtml,
        /function agendarProximoFrame\(\) \{\s*requestAnimationFrame\(/,
        'o agendador saiu do requestAnimationFrame'
    );
});

test('a lista de NPCs admin so e montada sob demanda', () => {
    // Antes as DUAS listas eram construidas a cada tick para todos os clientes.
    assert.match(serverSource, /function npcsAdminDoCache\(cache\)/, 'faltou o getter preguiçoso de npcsAdmin');
    assert.match(serverSource, /_npcsAdminCache:\s*null/, 'o cache admin nao foi preparado para memoizacao');
    assert.match(
        serverSource,
        /npcs: isClientAdmin \? npcsAdminDoCache\(cache\) : cache\.npcs/,
        'o world_update ainda consome a lista admin pré-calculada'
    );
});

test('o HUD expoe a fila de saida, que e a metrica que provou a causa', () => {
    assert.match(indexHtml, /pingBufferBytes = Math\.max\(0, Number\(dados\.serverBufferedBytes\)/, 'cliente nao guarda o buffer do servidor');
    assert.match(indexHtml, /FILA: /, 'HUD nao exibe a fila de saida');
});
