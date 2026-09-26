const WebSocket = require('ws');
const assert = require('assert');

console.log('=== TESTE E2E: CONEXÃO COM O SERVIDOR E SINCRONIZAÇÃO DE TEMPO MUNDO ===\n');

const ws = new WebSocket('ws://localhost:8080');

let timeout = setTimeout(() => {
    console.error('TIMEOUT: Servidor não respondeu a tempo.');
    process.exit(1);
}, 5000);

ws.on('open', () => {
    console.log('Conectado ao servidor WS na porta 8080.');
    ws.send(JSON.stringify({
        action: 'login',
        id: 'TestPlayer_' + Math.floor(Math.random() * 1000),
        classe: 'guerreiro'
    }));
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'world_update') {
            console.log('Recebido world_update do servidor!');
            assert.strictEqual(!!msg.tempoMundo, true, 'world_update deve conter tempoMundo!');
            console.log('  Horário Recebido:', msg.tempoMundo.horaFormatada, msg.tempoMundo.icone);
            console.log('  Fase:', msg.tempoMundo.fase);
            console.log('  Escuridão:', msg.tempoMundo.escuridao);
            console.log('  Duração Dia:', msg.tempoMundo.duracaoDiaSegundos + 's');
            console.log('  Duração Noite:', msg.tempoMundo.duracaoNoiteSegundos + 's');
            
            assert.strictEqual(typeof msg.tempoMundo.hora, 'number');
            assert.strictEqual(typeof msg.tempoMundo.minuto, 'number');
            assert.strictEqual(typeof msg.tempoMundo.escuridao, 'number');
            assert.strictEqual(msg.tempoMundo.escuridao >= 0 && msg.tempoMundo.escuridao <= 0.70, true);

            clearTimeout(timeout);
            ws.close();
            console.log('\nTESTE E2E DE SINCRONIZAÇÃO DE TEMPO MUNDO CONCLUÍDO COM SUCESSO! ☀️🌙');
            process.exit(0);
        }
    } catch (err) {
        console.error('Erro ao processar mensagem:', err);
        process.exit(1);
    }
});
