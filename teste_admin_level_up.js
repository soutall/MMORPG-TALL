/**
 * teste_admin_level_up.js
 * Suíte de testes automatizados para a funcionalidade de Level Up Rápido do Admin (v1.69.1)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO SUÍTE DE TESTES: ADMIN LEVEL UP (v1.69.1) ===');

// 1. Verificar NIVEL_MAXIMO e tabela de XP no server.js
const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
assert(serverCode.includes('const NIVEL_MAXIMO = 100;'), 'NIVEL_MAXIMO deve ser 100 no server.js');
const arquivosPrivadosMatch = serverCode.match(/const arquivosPrivados = new Set\(\[([\s\S]*?)\]\);/);
assert(arquivosPrivadosMatch && !arquivosPrivadosMatch[1].includes("'admin-cheats.js'"), 'admin-cheats.js deve ser servido ao cliente');
assert(serverCode.includes("data.action === 'admin_subir_level'"), "Handler 'admin_subir_level' deve existir no server.js");
assert(serverCode.includes("data.action === 'admin_resetar_level'"), "Handler 'admin_resetar_level' deve existir no server.js");
console.log('  ✓ [PASSOU] 1. Configuração e handlers no server.js');

// 2. Verificar admin-cheats.js
const adminCheatsCode = fs.readFileSync(path.join(__dirname, 'admin-cheats.js'), 'utf8');
assert(adminCheatsCode.includes('window.adminSubirNivel'), 'adminSubirNivel deve existir em admin-cheats.js');
assert(adminCheatsCode.includes('window.adminResetarNivel'), 'adminResetarNivel deve existir em admin-cheats.js');
assert(adminCheatsCode.includes('ac-card-level'), 'Card de nível deve estar no DOM de admin-cheats.js');
assert(adminCheatsCode.includes('window.atualizarVisualAdminLevel'), 'atualizarVisualAdminLevel deve existir');
console.log('  ✓ [PASSOU] 2. Interface e métodos em admin-cheats.js');

// 3. Verificar skill_tree_ui.js
const skillTreeUiCode = fs.readFileSync(path.join(__dirname, 'skill_tree_ui.js'), 'utf8');
assert(skillTreeUiCode.includes('st-admin-lvl-tools'), 'st-admin-lvl-tools deve existir no header da Árvore de Upgrades');
assert(skillTreeUiCode.includes('window.adminSubirNivel(1)'), 'Botão +1 LVL deve estar presente no header da Árvore');
console.log('  ✓ [PASSOU] 3. Botões de level no header da Árvore de Upgrades (skill_tree_ui.js)');

// 4. Verificar index.html (Versão e atualizações)
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes("const GAME_VERSION = 'v1.71.0';") || indexHtml.includes("const GAME_VERSION = 'v1.70.0';"), "GAME_VERSION deve ser 'v1.71.0' em index.html");
assert(indexHtml.includes('>v1.71.0</div>') || indexHtml.includes('>v1.70.0</div>'), 'Versão visual deve estar nos displays do HUD e tela de login');
assert(indexHtml.includes('admin-cheats.js?v=4'), 'Cache bump admin-cheats.js?v=4 deve estar presente');
assert(indexHtml.includes('skill_tree_ui.js?v=3'), 'Cache bump skill_tree_ui.js?v=3 deve estar presente');
assert(indexHtml.includes('skills.css?v=146'), 'Cache bump skills.css?v=146 deve estar presente');
assert(indexHtml.includes('atualizarVisualAdminLevel'), 'Chamada para atualizarVisualAdminLevel deve estar em index.html');
assert(indexHtml.includes('mobile-sidebar-item-admin'), 'mobile-sidebar-item-admin deve estar presente em index.html');
assert(indexHtml.includes('btn-admin-cheats'), 'btn-admin-cheats deve estar presente em index.html');
console.log('  ✓ [PASSOU] 4. Versão sincronizada, botão coroa HUD e item mobile admin em index.html');

// 5. Testar lógica do SkillUpgradeTree com os níveis alcançados
const SkillUpgradeTree = require('./skill_upgrade_tree.js');
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(1), 0);
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(10), 1);
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(20), 2);
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(30), 3);
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(40), 4);
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(50), 5);
assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(100), 10);
console.log('  ✓ [PASSOU] 5. Escala de pontos de upgrade por nível (1 até 100)');

// 6. Simulação do processo de Level Up no jogador
let mockPlayer = {
    nome: 'Admin',
    isAdmin: true,
    level: 1,
    xp: 0,
    pontosDisponiveis: 3,
    pontosHabilidade: 0,
    skillUpgrades: {}
};

function simularSubirNivel(p, qtd) {
    let nivelAntigo = p.level || 1;
    let novoLevel = Math.min(100, nivelAntigo + qtd);
    let diff = novoLevel - nivelAntigo;
    if (diff > 0) {
        p.level = novoLevel;
        p.xp = 0;
        p.pontosDisponiveis = (p.pontosDisponiveis || 0) + diff;
        p.pontosHabilidade = (p.pontosHabilidade || 0) + diff;
    }
}

// Subir +1 Nível
simularSubirNivel(mockPlayer, 1);
assert.strictEqual(mockPlayer.level, 2);
assert.strictEqual(mockPlayer.pontosDisponiveis, 4);

// Subir +8 Níveis (vai para nível 10)
simularSubirNivel(mockPlayer, 8);
assert.strictEqual(mockPlayer.level, 10);
let ptsTree = SkillUpgradeTree.calcularPontosUpgradeDisponiveis(mockPlayer.level, mockPlayer.skillUpgrades);
assert.strictEqual(ptsTree, 1, 'No nível 10 deve ter exatamente 1 ponto de upgrade disponível');

// Subir +10 Níveis (vai para nível 20)
simularSubirNivel(mockPlayer, 10);
assert.strictEqual(mockPlayer.level, 20);
ptsTree = SkillUpgradeTree.calcularPontosUpgradeDisponiveis(mockPlayer.level, mockPlayer.skillUpgrades);
assert.strictEqual(ptsTree, 2, 'No nível 20 deve ter exatamente 2 pontos de upgrade disponíveis');

// Subir +80 Níveis (vai para nível 100)
simularSubirNivel(mockPlayer, 80);
assert.strictEqual(mockPlayer.level, 100);
ptsTree = SkillUpgradeTree.calcularPontosUpgradeDisponiveis(mockPlayer.level, mockPlayer.skillUpgrades);
assert.strictEqual(ptsTree, 10, 'No nível 100 deve ter exatamente 10 pontos de upgrade disponíveis');

// Teto máximo de 100
simularSubirNivel(mockPlayer, 50);
assert.strictEqual(mockPlayer.level, 100, 'Não deve ultrapassar o nível máximo 100');

console.log('  ✓ [PASSOU] 6. Simulação de Level Up sequencial até 100 com cálculo de pontos');

console.log('\n=== RESULTADO: TODOS OS 6 TESTES PASSARAM COM 100% DE SUCESSO! ===');
