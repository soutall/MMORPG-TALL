const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

async function main() {
    try {
        let html = await get('http://localhost:8080/');
        console.log('HTML:', html.status, 'bytes:', html.data.length);
        console.log('  Tem minimap:', html.data.includes('minimap'));
        console.log('  Tem dragdrop.js:', html.data.includes('dragdrop.js'));
        console.log('  Tem data-ui:', html.data.includes('data-ui'));
        
        let css = await get('http://localhost:8080/dragdrop.css');
        console.log('CSS:', css.status, 'bytes:', css.data.length);
        console.log('  Tem ui-editor-bar:', css.data.includes('ui-editor-bar'));
        console.log('  Tem data-ui-ignored:', css.data.includes('data-ui-ignored'));
        
        let js = await get('http://localhost:8080/dragdrop.js');
        console.log('JS:', js.status, 'bytes:', js.data.length);
        console.log('  Tem InterfaceEditor:', js.data.includes('InterfaceEditor'));
        console.log('  Tem data-ui-ignored:', js.data.includes('data-ui-ignored'));
        
        let wss = await get('http://localhost:8080/ws');
        console.log('WSS:', wss.status, '(esperado 400 ou similar)');
    } catch (e) {
        console.log('ERRO:', e.message);
    }
}

main();