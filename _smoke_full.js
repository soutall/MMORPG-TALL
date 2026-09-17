const http = require('http');
const WebSocket = require('ws');

let pass = 0, fail = 0;
function r(n, ok, msg) {
    if (ok) { pass++; console.log('PASS ' + n + (msg ? ' · ' + msg : '')); }
    else { fail++; console.log('FAIL ' + n + ' — ' + msg); }
}

async function main() {
    // 1. Testar HTTP
    try {
        let html = await new Promise((resolve, reject) => {
            http.get('http://localhost:8080/', (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            }).on('error', reject);
        });
        r('http_200', html.status === 200, 'status=' + html.status);
        r('html_tamanho', html.data.length > 100000, html.data.length + ' bytes');
        r('html_mmorpg', html.data.includes('MMORPG') || html.data.includes('Jogo'), 'conteúdo presente');
        r('html_dragdrop', html.data.includes('dragdrop.js'), 'script registrado');
        r('html_data_ui', html.data.includes('data-ui'), 'atributos data-ui presentes');
        r('html_minimap', html.data.includes('minimap'), 'minimap presente');
    } catch (e) {
        r('http', false, e.message);
    }
