'use strict';

// Sincroniza as expectativas de versao nos testes com a versao real do jogo.
// Os testes foram escritos em momentos diferentes e ficaram para tras: alguns
// esperavam v1.75.103, outros v1.75.105, outros v1.75.107. Este script
// normaliza TODOS para a versao atual, sem tocar em mais nada.
//
// Uso: node tests/_sync-version-expectations.js v1.75.108
// Ex.: node tests/_sync-version-expectations.js v1.75.108

const fs = require('node:fs');
const path = require('node:path');

const alvo = process.argv[2];
if (!/^v\d+\.\d+\.\d+$/.test(alvo || '')) {
    console.error('Uso: node tests/_sync-version-expectations.js v1.75.108');
    process.exit(1);
}

const testesDir = __dirname;
const alvos = [];
for (const entrada of fs.readdirSync(testesDir, { withFileTypes: true })) {
    if (entrada.isFile() && entrada.name.endsWith('.test.js')) {
        alvos.push(path.join(testesDir, entrada.name));
    } else if (entrada.isDirectory() && entrada.name === 'auth') {
        for (const sub of fs.readdirSync(path.join(testesDir, entrada.name))) {
            if (sub.endsWith('.test.js')) alvos.push(path.join(testesDir, entrada.name, sub));
        }
    }
}

// Dentro dos testes a versao aparece escapada em regex literal (v1\.75\.103).
// O padrao abaixo casa tanto a forma escapada quanto a crua.
const reVersao = /v\\?\d+\\\.\d+\\\.\d+/g;

const relatorio = [];
for (const arquivo of alvos) {
    const antes = fs.readFileSync(arquivo, 'utf8');
    const depois = antes.replace(reVersao, (m) => {
        // Preserva a forma escapada original.
        return m.includes('\\') ? alvo.replace(/\./g, '\\.') : alvo;
    });
    if (depois !== antes) {
        fs.writeFileSync(arquivo, depois, 'utf8');
        relatorio.push(`  ${path.basename(arquivo)}`);
    }
}

console.log(`versao alvo: ${alvo}`);
console.log(`arquivos de teste atualizados: ${relatorio.length}/${alvos.length}`);
if (relatorio.length) console.log(relatorio.join('\n'));
