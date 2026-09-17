"use strict";
const WebSocket = require('ws');
const http = require('http');

const s = http.createServer();
const wsSrv = new WebSocket.Server({ server: s, path: '/ws' });
const savedPlayers = {};
s.listen(8119, '127.0.0.1', () => {
    console.log('SRV 8119 OK');
    wsSrv.on('connection', (ws) => {
        ws.on('message', (raw) => {
            let d;
            try { d = JSON.parse(raw); } catch (e) { ws.close(); return; }
            if (d.action === 'login') {
                ws.p = d.userId;
                ws.send(JSON.stringify({ type: 'init', id: ws.p, uiLayout: savedPlayers[ws.p] || {} }));
            } else if (d.action === 'salvar_ui_layout') {
                savedPlayers[d.userId] = { a: { x: 10, y: 20 } };
                ws.send(JSON.stringify({ type: 'ui_layout_saved', layout: savedPlayers[d.userId] }));
            }
        });
        ws.on('close', () => {});
    });

    let c = new WebSocket('ws://127.0.0.1:8119/ws');
    c.on('message', (raw) => {
        let m = JSON.parse(raw);
        if (m.type === 'init') {
            console.log('1. cli got init OK');
            c.send(JSON.stringify({ action: 'salvar_ui_layout', userId: m.id, layout: { a: { x: 10, y: 20 } } }));
        } else if (m.type === 'ui_layout_saved') {
            console.log('2. cli got salvo OK');
            c.close();
            setTimeout(() => {
                let c2 = new WebSocket('ws://127.0.0.1:8119/ws');
                c2.on('message', (raw) => {
                    let m = JSON.parse(raw);
                    if (m.type === 'init') {
                        console.log('3. cli2 got init. uiLayout:', JSON.stringify(m.uiLayout));
                        if (m.uiLayout && m.uiLayout.a && m.uiLayout.a.x === 10) {
                            console.log('✅ SUCESSO: layout persistido na reconectar');
                        } else {
                            console.log('❌ FALHA: layout não persistido na reconectar');
                        }
                        c2.close();
                        setTimeout(() => {
                            console.log('\nTeste concluido. Saindo...');
                            s.close();
                            process.exit(0);
                        }, 300);
                    }
                });
                c2.on('open', () => {
                    console.log('3. cli2 sending login...');
                    c2.send(JSON.stringify({ action: 'login', userId: 'teste' }));
                });
                c2.on('error', (e) => console.log('WS ERROR:', e.message));
            }, 400);
        }
    });
    c.on('open', () => {
        console.log('0. cli sending login...');
        c.send(JSON.stringify({ action: 'login', userId: 'teste' }));
    });
    c.on('error', (e) => console.log('WS ERROR:', e.message));
});