'use strict';

// Verificacao em tempo real da correcao de latencia (v1.75.108).
// Conecta um cliente real na porta 8080, mede RTT do pong e observa:
//  - presenca do campo `backpressure` no world_update
//  - tamanho da fila de saida (bufferedAmount) do lado do cliente
//  - RTT maximo observado
//
// Uso: node tests/verificar-latencia-ao-vivo.js [host:porta] [segundos]

const WebSocket = require('ws');

const alvo = process.argv[2] || '127.0.0.1:8080';
const segundos = Number(process.argv[3]) || 20;
const [host, porta] = alvo.split(':');

const rtt = [];
let pongs = 0;
let worldUpdates = 0;
let comBackpressure = 0;
let maiorFila = 0;
let picoRtt = 0;
let tamanhoWorldUpdate = 0;

const ws = new WebSocket(`ws://${host}:${porta}`);

ws.on('open', () => {
    console.log(`conectado em ws://${host}:${porta}`);
    // Login local de teste, aceito quando LOCAL_ID_LOGIN esta habilitado.
    ws.send(JSON.stringify({
        type: 'login',
        id: 'verificador-latencia-teste',
        nome: 'VerificadorLatencia',
        characterId: 'verificador-latencia-teste'
    }));

    const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping', t: Date.now() }));
        }
    }, 1000);
    ws._pingTimer = ping;
});

ws.on('message', (raw) => {
    const agora = Date.now();
    maiorFila = Math.max(maiorFila, ws.bufferedAmount);

    let dados = null;
    try { dados = JSON.parse(raw); } catch { return; }
    if (!dados || typeof dados !== 'object') return;

    if (dados.type === 'pong' && dados.serverProcessingMs !== undefined) {
        pongs++;
        // `t` volta como o timestamp que o cliente mandou.
        const rttMs = Math.max(0, agora - Number(dados.t));
        rtt.push(rttMs);
        picoRtt = Math.max(picoRtt, rttMs);
        return;
    }

    if (dados.type === 'world_update') {
        worldUpdates++;
        tamanhoWorldUpdate = Math.max(tamanhoWorldUpdate, raw.length);
        if (dados.backpressure && typeof dados.backpressure === 'object') comBackpressure++;
    }
});

ws.on('error', (e) => {
    console.error('erro:', e.message);
    process.exit(1);
});

setTimeout(() => {
    clearInterval(ws._pingTimer);
    const rttMedio = rtt.length ? rtt.reduce((a, b) => a + b, 0) / rtt.length : 0;
    const rttP95 = rtt.length ? [...rtt].sort((a, b) => a - b)[Math.floor(rtt.length * 0.95)] : 0;
    const kb = (n) => (n / 1024).toFixed(1);

    console.log('\n================ VERIFICACAO AO VIVO (v1.75.108) ================');
    console.log(`world_update recebidos : ${worldUpdates}`);
    console.log(`  com campo backpressure: ${comBackpressure} ${comBackpressure === worldUpdates ? '(100% - OK)' : '(ATENCAO)'}`);
    console.log(`  maior payload         : ${kb(tamanhoWorldUpdate)} KB`);
    console.log(`pongs recebidos         : ${pongs}`);
    console.log(`RTT medio               : ${rttMedio.toFixed(1)} ms`);
    console.log(`RTT p95                 : ${rttP95.toFixed(1)} ms`);
    console.log(`RTT maximo              : ${picoRtt.toFixed(1)} ms`);
    console.log(`maior fila do cliente   : ${kb(maiorFila)} KB  ${maiorFila === 0 ? '(saudavel)' : ''}`);
    console.log('===============================================================');

    // Criterio de sucesso do projeto: RTT estavel e sem fila acumulada.
    const passou = picoRtt < 500 && maiorFila < 512 * 1024;
    console.log(passou ? 'RESULTADO: OK' : 'RESULTADO: ainda ha pico ou fila acumulada');
    ws.close();
    process.exit(passou ? 0 : 2);
}, segundos * 1000);
