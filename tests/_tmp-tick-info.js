'use strict';
// Encontra o intervalo (ms) de um setInterval 说indo de uma linha 1-based,
// contando chaves para achar o fechamento correspondente.
const fs = require('node:fs');
const path = require('node:path');

const arquivo = path.join(__dirname, '..', 'server.js');
const linhas = fs.readFileSync(arquivo, 'utf8').split(/\r?\n/);
const inicio = Number(process.argv[2]) - 1;

let profundidade = 0;
let achou = false;
for (let i = inicio; i < linhas.length; i++) {
    const l = linhas[i];
    for (const ch of l) {
        if (ch === '{') { profundidade++; achou = true; }
        else if (ch === '}') profundidade--;
    }
    if (achou && profundidade === 0) {
        console.log(`abre na linha ${inicio + 1}`);
        console.log(`fecha na linha ${i + 1}`);
        console.log(`tamanho do bloco: ${i + 1 - inicio} linhas`);
        console.log(`linha de fechamento: ${l.trim()}`);
        // procura o numero do intervalo
        const m = l.match(/\}\s*,\s*(\d+)\s*\)/);
        console.log(m ? `INTERVALO = ${m[1]} ms` : 'intervalo nao encontrado nesta linha');
        process.exit(0);
    }
}
console.log('nao fechou');
