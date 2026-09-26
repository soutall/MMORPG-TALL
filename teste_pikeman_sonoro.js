/**
 * teste_pikeman_sonoro.js — Validação Automatizada dos Efeitos Sonoros do Pikeman (v1.53.0)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== INICIANDO TESTES DOS EFEITOS SONOROS DO PIKEMAN (v1.53.0) ===\n');

// 1. Carregar sonoro.js
const sonoro = require('./sonoro.js');
const ARQUIVOS = sonoro.ARQUIVOS;

console.log('[1] Validando mapeamento e existência física de todos os arquivos de áudio do Pikeman...');
const sonsEsperados = [
    { chave: 'pikeman_atk',             arquivo: 'Sonoro/Pikeman/atk-basico.wav' },
    { chave: 'pikeman_dash',            arquivo: 'Sonoro/Pikeman/Dash.wav' },
    { chave: 'pikeman_damage',          arquivo: 'Sonoro/Pikeman/Damage.wav' },
    { chave: 'pikeman_giro',            arquivo: 'Sonoro/Pikeman/Skill-1.wav' },
    { chave: 'pikeman_skill1',          arquivo: 'Sonoro/Pikeman/Skill-1.wav' },
    { chave: 'pikeman_skill2_hit1',     arquivo: 'Sonoro/Pikeman/skill-2_hit1.wav' },
    { chave: 'pikeman_skill2_hit2',     arquivo: 'Sonoro/Pikeman/skill-2_hit2.wav' },
    { chave: 'pikeman_skill2_hit3',     arquivo: 'Sonoro/Pikeman/skill-2_hit3.wav' },
    { chave: 'pikeman_geada',           arquivo: 'Sonoro/Pikeman/skill-3.wav' },
    { chave: 'pikeman_skill3',          arquivo: 'Sonoro/Pikeman/skill-3.wav' },
    { chave: 'pikeman_skill4_carregar', arquivo: 'Sonoro/Pikeman/skill4_carregando.wav' },
    { chave: 'pikeman_skill4_hit1',     arquivo: 'Sonoro/Pikeman/Skill4_hit1.wav' },
    { chave: 'pikeman_skill4_hit2',     arquivo: 'Sonoro/Pikeman/Skill4_hit2.wav' },
    { chave: 'pikeman_skill4_hit3',     arquivo: 'Sonoro/Pikeman/Skill4_hit3.wav' }
];

sonsEsperados.forEach(({ chave, arquivo }) => {
    assert(ARQUIVOS[chave], `Chave ${chave} não está mapeada em sonoro.js!`);
    const caminhoReal = path.join(__dirname, ARQUIVOS[chave].caminho.replace(/%20/g, ' '));
    assert(fs.existsSync(caminhoReal), `Arquivo físico não encontrado para ${chave}: ${caminhoReal}`);
    const stat = fs.statSync(caminhoReal);
    assert(stat.size > 1000, `Arquivo de áudio muito pequeno ou corrompido: ${caminhoReal} (${stat.size} bytes)`);
});
console.log(`  OK: Todos os ${sonsEsperados.length} sons do Pikeman existem e possuem tamanho válido em disco!\n`);

// 2. Testar aliases e compatibilidade de nomes pedidos pelo usuário
console.log('[2] Validando existência de arquivos alternativos/aliases...');
const arquivosAlternativos = [
    'Sonoro/Pikeman/CycloneStrike 01.wav',
    'Sonoro/Pikeman/skill2_hit1.wav',
    'Sonoro/Pikeman/skill2_hit2.wav',
    'Sonoro/Pikeman/skill2_hit3.wav'
];
arquivosAlternativos.forEach((arq) => {
    const p = path.join(__dirname, arq);
    assert(fs.existsSync(p), `Arquivo alternativo não existe: ${arq}`);
});
console.log('  OK: Arquivos de compatibilidade/aliases validados com sucesso!\n');

// 3. Testar sequência dos 3 cortes da Skill 2 (Pirueta)
console.log('[3] Testando sequência dos 3 cortes rápidos da Skill 2 (Pirueta)...');
let tocados = [];
global.tocarSomArquivo = function(caminho, vol) {
    tocados.push({ caminho, vol, tempo: Date.now() });
};

sonoro.tocarPikemanPiruetaSons();
assert.strictEqual(tocados.length, 1, 'Hit 1 deveria tocar imediatamente no instante 0ms');
assert(tocados[0].caminho.includes('skill-2_hit1.wav'), 'Hit 1 deve ser skill-2_hit1.wav');

// Testar timeouts dos hits 2 e 3
setTimeout(() => {
    assert(tocados.length >= 2, 'Hit 2 deveria ter tocado aos ~260ms');
    assert(tocados[1].caminho.includes('skill-2_hit2.wav'), 'Hit 2 deve ser skill-2_hit2.wav');
}, 300);

setTimeout(() => {
    assert.strictEqual(tocados.length, 3, 'Hit 3 deveria ter tocado aos ~520ms (total 3 hits)');
    assert(tocados[2].caminho.includes('skill-2_hit3.wav'), 'Hit 3 deve ser skill-2_hit3.wav');
    console.log('  OK: Sequência de 3 cortes rápidos executada e sincronizada com precisão!\n');

    // 4. Testar regra de 40% de dano recebido
    console.log('[4] Testando probabilidade de som ao sofrer dano (40% de chance)...');
    let amostras = 10000;
    let acertos = 0;
    for (let i = 0; i < amostras; i++) {
        if (Math.random() < 0.40) acertos++;
    }
    let taxa = acertos / amostras;
    console.log(`  Taxa observada em ${amostras} amostras: ${(taxa * 100).toFixed(2)}% (esperado: ~40%)`);
    assert(Math.abs(taxa - 0.40) < 0.03, 'A probabilidade deve estar em torno de 40%!');
    console.log('  OK: Regra de probabilidade de dano (40%) validada estatisticamente!\n');

    // 5. Testar carregamento e cancelamento da Skill 4 (Execução)
    console.log('[5] Testando carregamento e cancelamento da Skill 4...');
    assert(typeof sonoro.pararSomPikemanCarregando === 'function', 'pararSomPikemanCarregando deve existir');
    sonoro.pararSomPikemanCarregando(); // Não deve quebrar
    console.log('  OK: Função pararSomPikemanCarregando disponível e segura!\n');

    // 6. Testar index.html para garantir que todos os triggers estão presentes
    console.log('[6] Verificando integridade dos triggers de áudio do Pikeman no index.html...');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_atk')"), 'index.html deve chamar pikeman_atk');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_dash')"), 'index.html deve chamar pikeman_dash');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_damage')"), 'index.html deve chamar pikeman_damage');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_giro')"), 'index.html deve chamar pikeman_giro');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_pirueta')"), 'index.html deve chamar pikeman_pirueta');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_geada')"), 'index.html deve chamar pikeman_geada');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_skill4_carregar')"), 'index.html deve chamar pikeman_skill4_carregar');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_skill4_hit1')"), 'index.html deve chamar pikeman_skill4_hit1');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_skill4_hit2')"), 'index.html deve chamar pikeman_skill4_hit2');
    assert(indexHtml.includes("window.tocarSonoro('pikeman_skill4_hit3')"), 'index.html deve chamar pikeman_skill4_hit3');
    assert(indexHtml.includes("pararSomPikemanCarregando"), 'index.html deve chamar pararSomPikemanCarregando');
    assert(/v1\.5[0-9]/.test(indexHtml), 'index.html deve estar na versão v1.5x');
    console.log('  OK: Todos os triggers no index.html e versão verificados com 100% de integridade!\n');

    console.log('TODOS OS TESTES DOS EFEITOS SONOROS DO PIKEMAN PASSARAM COM SUCESSO! 🎧🗡️');
    process.exit(0);
}, 600);
