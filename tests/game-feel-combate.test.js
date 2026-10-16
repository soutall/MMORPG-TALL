'use strict';

// Regressão das melhorias de game feel do combate (v1.75.108).
//
// Contexto: o combate "parecia lento" mesmo com CPU folgada. As medicoes
//reroberam que servidor (tick 0.9-6.6 ms de 50 ms), render do cliente
// (2.4 ms de 16.7 ms) e GC (0.2 ms) estavam todos folgados. O que faltava era
// RESPOSTA e PESO no acerto:
//
//  1. input buffering - aperto durante o cooldown era descartado em silencio
//  2. feedback de impacto - acerto basico so fazia sangue + som (2 de 5-8 canais)
//  3. codigo morto - o clique do Barbaro varria 195 slimes e descartava tudo
//  4. medicao de loop lag inflada (max com resolution 20)
//
// Estes testes travam cada um desses pontos.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

// Comentarios explicam o que foi removido e citam o padrao antigo; sem isso
// um teste de "codigo morto" acusaria o proprio comentario que documenta a
// remocao. Para checar CODIGO, sempre usamos a versao sem comentarios.
function semComentarios(texto) {
    return texto
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');
}
const indexCodigo = semComentarios(indexHtml);

// ---------------------------------------------------------------- buffering

test('o aperto de ataque durante o cooldown e guardado, nao descartado', () => {
    assert.match(indexHtml, /const JANELA_BUFFER_ATAQUE_MS = \d+;/,
        'janela de buffer do ataque nao declarada');
    const janela = Number(indexHtml.match(/const JANELA_BUFFER_ATAQUE_MS = (\d+);/)[1]);
    assert.ok(janela >= 100 && janela <= 300, `janela fora da faixa util (100-300ms): ${janela}ms`);

    // Ao bater no cooldown, o pedido precisa ser ARMAZADO, nao simplesmente
    // devolvido com false.
    const bloco = indexHtml.slice(
        indexHtml.indexOf('if (agora < proximoAtaqueBasicoEm)'),
        indexHtml.indexOf('if (agora < proximoAtaqueBasicoEm)') + 700
    );
    assert.match(bloco, /ataqueBufferizadoEm\s*=\s*agora/, 'o aperto nao e memorizado durante o cooldown');
    assert.match(bloco, /ataqueBufferizadoArgs\s*=/, 'os argumentos do ataque nao sao memorizados');
    assert.match(bloco, /armarConsumoBufferAtaque\(\)/, 'o consumo do buffer nao e armado');
});

test('o buffer dispara o ataque assim que o cooldown termina', () => {
    // Precisa existir um consumidor que observa o cooldown e dispara sozinho.
    assert.match(indexHtml, /function armarConsumoBufferAtaque\(\)/, 'consumidor do buffer ausente');
    const inicio = indexHtml.indexOf('function armarConsumoBufferAtaque()');
    const bloco = indexHtml.slice(inicio, inicio + 1200);
    assert.match(bloco, /performance\.now\(\) >= proximoAtaqueBasicoEm/,
        'o consumidor nao espera o cooldown terminar');
    assert.match(bloco, /executarAtaqueBasico\(/, 'o buffer nao executa o ataque');
    // E precisa descartar o que expirou, senao a fila cresce sem parar.
    assert.match(bloco, /JANELA_BUFFER_ATAQUE_MS\)[\s\S]*?ataqueBufferizadoEm = 0/,
        'o buffer nao expira pedido antigo');
});

// ------------------------------------------------------- pacote de feedback

test('existe um pacote de feedback de impacto com tiers', () => {
    assert.match(indexHtml, /const IMPACTO_TIERS = \{/, 'tiers de impacto ausentes');
    for (const tier of ['small', 'medium', 'large']) {
        assert.match(indexHtml, new RegExp(`${tier}:\\s*\\{`), `tier ${tier} ausente`);
    }
    assert.match(indexHtml, /window\.aplicarFeedbackImpacto = function/, 'funcao de feedback ausente');
    // O pacote precisa cobrir os canais de impacto, nao so tremor.
    assert.match(indexHtml, /hitStopMs:/, 'hit-stop nao faz parte do tier');
    assert.match(indexHtml, /trauma:/, 'tremor nao faz parte do tier');
    assert.match(indexHtml, /flashMs:/, 'flash no alvo nao faz parte do tier');
});

test('o feedback e ligado num ponto unico, e nao em 12 handlers', () => {
    // Um unico ponto no onmessage recebe todo evento action_* com hitX/hitY.
    assert.match(indexHtml, /dados\.type\.indexOf\('action_'\) === 0/, 'filtro de eventos de acerto ausente');
    assert.match(indexHtml, /Number\.isFinite\(dados\.hitX\) && Number\.isFinite\(dados\.hitY\)/,
        'o filtro nao exige coordenadas de impacto');
    // O hit-stop precisa estar realmente ligado no loop de render.
    assert.match(indexHtml, /if \(window\.estaEmHitStop && window\.estaEmHitStop\(\)\) \{\s*\n\s*dt = 0;/,
        'o hit-stop nao congela o dt do desenho');
    // E o alvo precisa ser_flashado, o que exige o id do alvo no payload.
    assert.match(indexHtml, /window\.flashAlvoAtingido = function/, 'flash no alvo ausente');
});

// ------------------------------------------------------------- protocolo

test('o servidor envia o dano no payload do ataque basico', () => {
    // Sem o valor no payload o cliente nao consegue mostrar numero de dano.
    const bloco = serverSource.slice(
        serverSource.indexOf("type: 'action_machadada'"),
        serverSource.indexOf("type: 'action_machadada'") + 700
    );
    assert.match(bloco, /dano:\s*danoMachadoCausado/, 'o dano nao viaja no evento de machadada');
    assert.match(bloco, /alvoId:/, 'o id do alvo nao viaja no evento (flash impossible)');
    // O dano tem de ser calculado ANTES do broadcast.
    const aplicar = serverSource.indexOf('danoMachadoCausado = Number(aplicarDanoAtaqueBasicoAlvo');
    const broadcast = serverSource.indexOf("type: 'action_machadada'");
    assert.ok(aplicar > -1 && aplicar < broadcast,
        'o dano precisa ser aplicado antes do broadcast, senao viaja zero');
});

test('aplicarDanoAtaqueBasicoAlvo devolve o valor do dano, nao booleano', () => {
    // 0 continua falsy, entao os `if (...)` existentes seguem funcionando.
    const bloco = serverSource.slice(
        serverSource.indexOf('function aplicarDanoAtaqueBasicoAlvo'),
        serverSource.indexOf('function aplicarDanoAtaqueBasicoAlvo') + 1800
    );
    assert.doesNotMatch(bloco, /return true;/, 'ainda ha retorno booleano no ataque basico');
    assert.doesNotMatch(bloco, /\.dano > 0;/, 'o dano continua sendo reduzido a booleano');
    assert.match(bloco, /\)\.dano;\s*$/m, 'o retorno final nao e o dano');
});

// ----------------------------------------------------------- codigo morto

test('o clique do Barbaro nao varre mais a lista de slimes', () => {
    const inicio = indexCodigo.indexOf('function enviarAtaqueBarbaro(');
    const bloco = indexCodigo.slice(inicio, inicio + 1400);
    assert.doesNotMatch(bloco, /listaSlimes\.forEach/,
        'ainda ha varredura de slimes no clique de ataque (o resultado era descartado)');
    assert.match(bloco, /action: 'ataque_barbaro'/, 'o envio do ataque foi quebrado');
});

// --------------------------------------------------------- medicao do loop

test('a medicao de loop lag usa p99 e resolucao fina', () => {
    // resolution 20 tinha piso de ~20ms e o .max da janela inflava o numero.
    assert.match(serverSource, /monitorEventLoopDelay\(\{ resolution: 10 \}\)/,
        'resolucao do monitor de event loop ainda e grossa');
    assert.match(serverSource, /percentile\(99\)/, 'o numero exibido ainda usa o maximo da janela');
});

// ------------------------------------------------------------- instrumentacao

test('a instrumentacao de performance do servidor esta no lugar', () => {
    assert.match(serverSource, /\[PERF\] tick 50ms/, 'relatorio do tick ausente');
    assert.match(serverSource, /\[PERF-GC\]/, 'relatorio de GC ausente');
    const db = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
    assert.match(db, /\[PERF-DISCO\]/, 'relatorio de disco ausente');
});
