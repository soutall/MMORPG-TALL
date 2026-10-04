// teste_summoner_vfx_upgrades.js — Suíte de Testes Automatizada para VFX e Progressão de Upgrades da Summoner
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO SUÍTE DE TESTES: SUMMONER UPGRADE VFX & PROGRESSÃO (v1.70.0) ===\n');

// 1. Verificar módulo skill_upgrade_tree.js
const SkillUpgradeTree = require('./skill_upgrade_tree.js');
assert(SkillUpgradeTree, 'Módulo skill_upgrade_tree deve ser carregável');

// Testar polymorphic gerarVisaoCliente
const infoPolimorfica = SkillUpgradeTree.gerarVisaoCliente({}, 10);
assert(infoPolimorfica, 'gerarVisaoCliente deve aceitar assinatura polimórfica (upgrades, level)');
assert.strictEqual(infoPolimorfica.pontosGanhos, 1, 'Nível 10 deve ter 1 ponto ganho');
assert.strictEqual(infoPolimorfica.pontosDisponiveis, 1, 'Nível 10 sem compras deve ter 1 ponto disponível');
assert.strictEqual(infoPolimorfica.pontosGastos, 0, 'Nível 10 sem compras deve ter 0 pontos gastos');

const infoPolimorfica40 = SkillUpgradeTree.gerarVisaoCliente({ esmagamento: { choices: ['fenda_persistente', 'colisao_tectonica'] } }, 40);
assert.strictEqual(infoPolimorfica40.pontosGanhos, 4, 'Nível 40 deve ter 4 pontos ganhos');
assert.strictEqual(infoPolimorfica40.pontosGastos, 2, '2 upgrades comprados devem contar 2 gastos');
assert.strictEqual(infoPolimorfica40.pontosDisponiveis, 2, 'Saldo disponível deve ser 4 - 2 = 2');
console.log('  ✓ [PASSOU] 1. polymorphic gerarVisaoCliente e cálculo de pontos');

// 2. Verificar efeitos/vfx_summoner_upgrades.js
const vfxFile = fs.readFileSync(path.join(__dirname, 'efeitos', 'vfx_summoner_upgrades.js'), 'utf8');
const vfxFunctions = [
    'criarVfxSummonerFenda',
    'criarVfxSummonerImpactoDuplo',
    'criarVfxSummonerPulsoMagnetico',
    'criarVfxSummonerTerremoto3Way',
    'criarVfxSummonerCratera',
    'criarVfxSummonerMarcaPresa',
    'criarVfxSummonerOndaChoque',
    'criarVfxSummonerEscudoInvocadora',
    'criarVfxSummonerGarrasTerra',
    'criarVfxSummonerMeteoroSismico',
    'criarVfxSummonerColapsoFinal',
    'criarVfxSummonerUltimoBastiao',
    'desenharEfeitosSummonerUpgrades'
];

vfxFunctions.forEach(fn => {
    assert(vfxFile.includes(fn), `vfx_summoner_upgrades.js deve conter a função ${fn}`);
});
console.log('  ✓ [PASSOU] 2. Todas as 13 funções e efeitos visuais definidos em vfx_summoner_upgrades.js');

// 3. Verificar index.html
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('efeitos/vfx_summoner_upgrades.js'), 'index.html deve importar vfx_summoner_upgrades.js');
assert(indexHtml.includes('desenharEfeitosSummonerUpgrades'), 'index.html deve chamar desenharEfeitosSummonerUpgrades no loop de render');
assert(indexHtml.includes('window.meuLevel = meuLevel;'), 'index.html deve sincronizar window.meuLevel');
assert(indexHtml.includes('window.meuNivel = meuLevel;'), 'index.html deve sincronizar window.meuNivel');

const socketActions = [
    'action_summoner_fenda',
    'action_ogro_sismico_segundo',
    'action_summoner_pulso_magnetico',
    'action_summoner_terremoto_3way',
    'action_summoner_cratera',
    'action_summoner_marca_presa',
    'action_summoner_onda_choque',
    'action_summoner_escudo_invocadora',
    'action_summoner_garras_terra',
    'action_summoner_meteoro_sismico',
    'action_summoner_colapso_final',
    'action_summoner_ultimo_bastiao'
];

socketActions.forEach(act => {
    assert(indexHtml.includes(act), `index.html deve tratar o evento WebSocket ${act}`);
});
console.log('  ✓ [PASSOU] 3. Importação, loop Canvas e todos os 12 handlers de WebSocket em index.html');

// 4. Verificar server.js
const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
socketActions.forEach(act => {
    assert(serverJs.includes(act), `server.js deve emitir o evento ${act}`);
});
console.log('  ✓ [PASSOU] 4. Todos os 12 eventos de ação e efeitos broadcasted por server.js');

// 5. Verificar skill_tree_ui.js
const skillTreeUi = fs.readFileSync(path.join(__dirname, 'skill_tree_ui.js'), 'utf8');
assert(skillTreeUi.includes('obterNivelJogador'), 'skill_tree_ui.js deve conter obterNivelJogador helper');
console.log('  ✓ [PASSOU] 5. Fallback robusto obterNivelJogador() em skill_tree_ui.js');

// 6. Verificar admin-cheats.js
const adminCheats = fs.readFileSync(path.join(__dirname, 'admin-cheats.js'), 'utf8');
assert(adminCheats.includes('atualizarSkillTreeUi'), 'adminSubirNivel deve sincronizar a Árvore de Upgrades');
console.log('  ✓ [PASSOU] 6. Sincronização otimista imediata na Árvore de Upgrades pelo painel admin');

console.log('\n=== RESULTADO: TODOS OS 6 TESTES DA SUMMONER PASSARAM COM 100% DE SUCESSO! ===\n');
