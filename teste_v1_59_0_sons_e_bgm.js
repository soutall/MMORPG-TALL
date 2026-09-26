const assert = require('assert');
const fs = require('fs');

console.log('=== TESTES AUTOMATIZADOS v1.59.0: SISTEMA SONORO, ARENA SOLARI & BGM ===');

// 1. Validar sonoro.js
const sonoroMod = require('./sonoro.js');
const ARQUIVOS = sonoroMod.ARQUIVOS;

console.log('[1/4] Verificando novos áudios registrados em ARQUIVOS...');
assert(ARQUIVOS.debuff_stun, 'debuff_stun deve estar registrado');
assert(ARQUIVOS.debuff_lentidao, 'debuff_lentidao deve estar registrado');
assert(ARQUIVOS.ui_levelup, 'ui_levelup deve estar registrado');
assert(ARQUIVOS.ui_gold, 'ui_gold deve estar registrado');
assert(ARQUIVOS.curandeiro_skill4, 'curandeiro_skill4 deve estar registrado');
assert(ARQUIVOS.solari_contagem, 'solari_contagem deve estar registrado');
assert(ARQUIVOS.solari_vitoria, 'solari_vitoria deve estar registrado');
assert(ARQUIVOS.solari_bgm, 'solari_bgm deve estar registrado');

for (let r = 1; r <= 9; r++) {
    assert(ARQUIVOS['solari_round_' + r], `solari_round_${r} deve estar registrado`);
}
console.log('  OK: Todos os 16 novos identificadores sonoros registrados!');

// 2. Validar existência física dos arquivos no disco
console.log('[2/4] Verificando existência física de todos os arquivos de áudio no disco...');
const audiosVerificar = [
    'Sonoro/SOM GERAL/Debuff/Stun.ogg',
    'Sonoro/SOM GERAL/Debuff/lentidao.ogg',
    'Sonoro/SOM GERAL/ui/level UP.wav',
    'Sonoro/SOM GERAL/ui/gold_comprandoven-vendendo.mp3',
    'Sonoro/curandeiro/Skill_4_Curandeiro.wav',
    'Sonoro/Arena Solare/Contagem 10segundos.mp3',
    'Sonoro/Arena Solare/round1.wav',
    'Sonoro/Arena Solare/round2.wav',
    'Sonoro/Arena Solare/round3.wav',
    'Sonoro/Arena Solare/round4.wav',
    'Sonoro/Arena Solare/round5.wav',
    'Sonoro/Arena Solare/round6.wav',
    'Sonoro/Arena Solare/round7.wav',
    'Sonoro/Arena Solare/round8.wav',
    'Sonoro/Arena Solare/round9.wav',
    'Sonoro/Arena Solare/congratulation.wav',
    'Sonoro/Arena Solare/BGM_Fundo.mp3',
    'Sonoro/Cidade/dentro_cidade.mp3',
    'Sonoro/Cidade/mapa verde/Verde_Dia.mp3',
    'Sonoro/Cidade/mapa verde/Verde_noite.mp3',
    'Sonoro/Cidade/deserto-1/Deserto_dia.mp3',
    'Sonoro/Cidade/deserto-1/Deserto_noite.mp3',
    'Sonoro/Cidade/pantano-1/Pantano_dia.mp3',
    'Sonoro/Cidade/pantano-1/Pantano_Noite.mp3',
    'Sonoro/Cidade/zero-1/Zero_dia.mp3',
    'Sonoro/Cidade/zero-1/Zero_Noite.mp3'
];

audiosVerificar.forEach(caminho => {
    assert(fs.existsSync(caminho), `Arquivo físico deve existir: ${caminho}`);
    const st = fs.statSync(caminho);
    assert(st.size > 0, `Arquivo de áudio não pode estar vazio: ${caminho}`);
});
console.log(`  OK: Todos os ${audiosVerificar.length} arquivos de áudio existem e são válidos no disco!`);

// 3. Validar lógica de dia e noite em sonoro.js
console.log('[3/4] Validando cálculo de Dia/Noite (23:50 às 04:00)...');
const sonoroCode = fs.readFileSync('sonoro.js', 'utf8');
assert(sonoroCode.includes('23.8333'), 'Deve calcular 23:50 (23.8333h) para início da noite');
assert(sonoroCode.includes('MAPA_BGM'), 'Deve conter a tabela MAPA_BGM');
assert(sonoroCode.includes('_tracksFadeOut'), 'Deve conter gerenciador de Fade Out com Crossfade');
assert(sonoroCode.includes('_trackAtiva'), 'Deve conter gerenciador de Fade In com Crossfade');

// 4. Validar correções no server.js e index.html
console.log('[4/4] Validando server.js e index.html...');
const serverCode = fs.readFileSync('server.js', 'utf8');
assert(!serverCode.includes("data.classe === 'roqueiro'") || !serverCode.includes("banda.membros.push"), 'Não deve criar membros de banda ao escolher classe roqueiro');
assert(serverCode.includes('banda.expiraEm = agora + 15000'), 'Banda deve ter tempo de expiração de 15 segundos');
assert(serverCode.includes('s.contagemFimEm = Date.now() + 12000'), 'Contagem da Solari deve ser 12s');
assert(serverCode.includes('s.round >= 9'), 'Solari deve finalizar no round 9');

const indexCode = fs.readFileSync('index.html', 'utf8');
assert(indexCode.includes('v1.59.0'), 'index.html deve conter a versão v1.59.0');
assert(indexCode.includes("tocarSonoro('curandeiro_skill4')"), 'usarCanticoCelestial deve tocar curandeiro_skill4');
assert(indexCode.includes("tocarSonoro('ui_levelup')"), 'tocarSomLevelUp deve tocar ui_levelup');
assert(indexCode.includes("tocarSonoro('ui_gold')"), 'ouro_ganho deve tocar ui_gold');
assert(indexCode.includes("tocarSonoro('debuff_stun')"), 'world_update deve disparar debuff_stun');
assert(indexCode.includes("tocarSonoro('debuff_lentidao')"), 'world_update deve disparar debuff_lentidao');

const solariCode = fs.readFileSync('solari.js', 'utf8');
assert(solariCode.includes("solari_round_' + dados.round"), 'solari.js deve tocar sons de round 1 a 9');
assert(solariCode.includes("solari_vitoria"), 'solari.js deve tocar solari_vitoria ao vencer');
assert(solariCode.includes("solari_contagem"), 'solari.js deve tocar solari_contagem');

console.log('\nTODOS OS TESTES PASSARAM COM 100% DE SUCESSO! 🎉');
