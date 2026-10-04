// teste_guerreiro_upgrades.js — Teste Automatizado da Árvore de Upgrades do Guerreiro
const assert = require('assert');
const SkillUpgradeTree = require('./skill_upgrade_tree.js');

console.log('--- INICIANDO TESTES DA ÁRVORE DE UPGRADES DO GUERREIRO ---');

// 1. Verifica skills participantes
const skillsGuerreiro = SkillUpgradeTree.obterSkillsParticipantes('guerreiro');
console.log('1. Skills participantes do Guerreiro:', skillsGuerreiro);
assert.deepStrictEqual(skillsGuerreiro, ['postura_guardiao', 'tornado', 'provocacao', 'escudo_lancamento'], 'Deve conter as 4 skills do Guerreiro');

// 2. Verifica a estrutura de cada skill (4 Tiers, A=DPS, B=TANK)
let totalNos = 0;
skillsGuerreiro.forEach(skillId => {
    const tree = SkillUpgradeTree.SKILL_UPGRADE_TREES.guerreiro[skillId];
    assert(tree, `Árvore de ${skillId} deve existir`);
    assert.strictEqual(tree.id, skillId);
    assert(tree.nome, 'Deve ter nome');
    assert(tree.icon, 'Deve ter ícone');
    assert(tree.descBase, 'Deve ter descrição base');

    for (let t = 1; t <= 4; t++) {
        const tier = tree.tiers[t];
        assert(tier, `Tier ${t} de ${skillId} deve existir`);
        assert.strictEqual(tier.nivelRequerido, t * 10, `Tier ${t} deve requerer nível ${t * 10}`);

        // Ramo A = DPS
        assert(tier.A, `Tier ${t} de ${skillId} deve ter ramo A`);
        assert(tier.A.id, `Ramo A deve ter id`);
        assert(tier.A.nome, `Ramo A deve ter nome`);
        assert(tier.A.desc, `Ramo A deve ter desc`);
        assert(tier.A.valores, `Ramo A deve ter valores`);
        assert(tier.A.categoria.includes('DPS'), `Ramo A de ${skillId} Tier ${t} deve ser DPS: ${tier.A.categoria}`);
        totalNos++;

        // Ramo B = TANK
        assert(tier.B, `Tier ${t} de ${skillId} deve ter ramo B`);
        assert(tier.B.id, `Ramo B deve ter id`);
        assert(tier.B.nome, `Ramo B deve ter nome`);
        assert(tier.B.desc, `Ramo B deve ter desc`);
        assert(tier.B.valores, `Ramo B deve ter valores`);
        assert(tier.B.categoria.includes('TANK'), `Ramo B de ${skillId} Tier ${t} deve ser TANK: ${tier.B.categoria}`);
        totalNos++;
    }
});

console.log(`2. Total de nós de upgrade verificados: ${totalNos} nós (exatamente 4 skills x 4 tiers x 2 ramos)`);
assert.strictEqual(totalNos, 32, 'Deve ter exatamente 32 nós de upgrade');

// 3. Teste de Validação de Compra: Nível 1 vs Nível 10
let upgrades = {};
const vNivel1 = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 1, 'A', 1, upgrades);
assert.strictEqual(vNivel1.valido, false, 'Nível 1 não deve poder comprar upgrade');
console.log('3. Bloqueio por nível baixo validado com sucesso.');

// 4. Compra válida no Nível 10 (Tier 1 A - Vórtice Cortante)
const vNivel10 = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 1, 'A', 10, upgrades);
assert.strictEqual(vNivel10.valido, true, 'Nível 10 deve poder comprar Tier 1 A');
SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'tornado', 1, 'A');

assert.strictEqual(SkillUpgradeTree.temUpgrade(upgrades, 'tornado', 1, 'A'), true, 'Deve possuir tornado 1 A');
assert.strictEqual(SkillUpgradeTree.temUpgrade(upgrades, 'tornado', 1, 'B'), false, 'Não deve possuir tornado 1 B');
assert.strictEqual(SkillUpgradeTree.obterEscolhaTier(upgrades, 'tornado', 1), 'A');
console.log('4. Compra do Tier 1 A aplicada e ramo B bloqueado.');

// 5. Tentativa de comprar Tier 1 novamente (deve falhar)
const vRecompra = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 1, 'B', 10, upgrades);
assert.strictEqual(vRecompra.valido, false, 'Não deve poder recomprar ou trocar Tier já adquirido');

// 6. Tentativa de pular Tier 2 e comprar Tier 3 (deve falhar)
const vPularTier = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 3, 'A', 30, upgrades);
assert.strictEqual(vPularTier.valido, false, 'Deve adquirir Tier anterior primeiro');
console.log('5. Bloqueio de salto de Tiers validado.');

// 7. Progressão até o Tier 4 no Nível 40 (Escolhas mistas DPS e TANK)
// Tier 2: Escolhe B (Ciclone Gravitacional - TANK)
const vT2 = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 2, 'B', 40, upgrades);
assert.strictEqual(vT2.valido, true);
SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'tornado', 2, 'B');

// Tier 3: Escolhe A (Ímpeto da Tempestade - DPS)
const vT3 = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 3, 'A', 40, upgrades);
assert.strictEqual(vT3.valido, true);
SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'tornado', 3, 'A');

// Tier 4: Escolhe B (Olho do Furacão - TANK)
const vT4 = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'tornado', 4, 'B', 40, upgrades);
assert.strictEqual(vT4.valido, true);
SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'tornado', 4, 'B');

assert.strictEqual(upgrades.tornado.purchased, 4);
assert.deepStrictEqual(upgrades.tornado.choices, ['A', 'B', 'A', 'B']);
console.log('6. Progressão completa de 4 tiers no Guerreiro validada.');

// 8. Teste da Visão do Cliente com Revelação Progressiva (Enigma)
const visaoNova = SkillUpgradeTree.gerarVisaoCliente('guerreiro', 'postura_guardiao', 15, {});
assert(visaoNova, 'Visão do cliente deve ser gerada');
assert.strictEqual(visaoNova.tiers[0].status, 'disponivel', 'Tier 1 deve estar disponível');
assert.strictEqual(visaoNova.tiers[1].status, 'oculto', 'Tier 2 deve estar oculto / enigma');
assert.strictEqual(visaoNova.tiers[1].enigma, true);
console.log('7. Sistema de Enigma / Revelação progressiva da Árvore validado.');

console.log('--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
