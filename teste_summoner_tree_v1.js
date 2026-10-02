/**
 * teste_summoner_tree_v1.js — Suíte Completa de Testes da Árvore de Upgrades do Summoner
 * Cobre todos os 14 casos de teste obrigatórios (Seção 25 do Prompt)
 */
const assert = require('assert');
const SkillUpgradeTree = require('./skill_upgrade_tree.js');

let totalTestes = 0;
let testesPassados = 0;

function test(nome, fn) {
    totalTestes++;
    try {
        fn();
        testesPassados++;
        console.log(`  ✓ [PASSOU] ${nome}`);
    } catch (err) {
        console.error(`  ✗ [FALHOU] ${nome}`);
        console.error(`    Erro: ${err.message}`);
    }
}

console.log("=== INICIANDO SUÍTE DE TESTES: ÁRVORE DE UPGRADES DO SUMMONER ===");

// 1. Ganho de pontos por nível
test("1. Ganho de pontos por nível (0 até 10 pontos)", () => {
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(1), 0);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(9), 0);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(10), 1);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(19), 1);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(20), 2);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(39), 3);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(40), 4);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(99), 9);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(100), 10);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGanhos(150), 10); // Máximo 10
});

// 2. Gasto de pontos e saldo disponível
test("2. Gasto de pontos e saldo disponível", () => {
    const upgrades = {
        esmagamento: { purchased: 2, choices: ['A', 'B'] },
        salto: { purchased: 1, choices: ['A'] }
    };
    const gastos = SkillUpgradeTree.calcularPontosUpgradeGastos(upgrades);
    assert.strictEqual(gastos, 3);

    // Lv 40 = 4 pontos ganhos, 3 gastos = 1 disponível
    const disp40 = SkillUpgradeTree.calcularPontosUpgradeDisponiveis(40, upgrades);
    assert.strictEqual(disp40, 1);

    // Lv 20 = 2 pontos ganhos, 3 gastos = 0 disponível (não fica negativo)
    const disp20 = SkillUpgradeTree.calcularPontosUpgradeDisponiveis(20, upgrades);
    assert.strictEqual(disp20, 0);
});

// 3. Limite de 4 upgrades por skill
test("3. Limite de 4 upgrades por skill", () => {
    const upgrades = {
        esmagamento: { purchased: 4, choices: ['A', 'A', 'A', 'A'] }
    };
    // Tentar comprar tier 5
    const v5 = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 5, 'A', 100, upgrades);
    assert.strictEqual(v5.valido, false);
    assert.strictEqual(v5.motivo, 'Tier inválido (deve ser entre 1 e 4)');

    // Tentar comprar tier 4 novamente
    const v4 = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 4, 'B', 100, upgrades);
    assert.strictEqual(v4.valido, false);
});

// 4. Bloqueio do caminho oposto (A/B)
test("4. Bloqueio do caminho oposto (A/B)", () => {
    const upgrades = {};
    // Compra Tier 1 Caminho A
    SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'esmagamento', 1, 'A');
    assert.strictEqual(SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 1, 'A'), true);
    assert.strictEqual(SkillUpgradeTree.temUpgrade(upgrades, 'esmagamento', 1, 'B'), false);
    assert.strictEqual(SkillUpgradeTree.obterEscolhaTier(upgrades, 'esmagamento', 1), 'A');

    // Tenta comprar Tier 1 Caminho B na mesma skill
    const v = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 1, 'B', 50, upgrades);
    assert.strictEqual(v.valido, false);
});

// 5. Nível requerido por camada (10, 20, 30, 40)
test("5. Nível requerido por camada", () => {
    const upgrades = {};
    // Lv 9 tentando comprar Tier 1
    const v1 = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 1, 'A', 9, upgrades);
    assert.strictEqual(v1.valido, false);

    // Lv 15 tentando comprar Tier 1 (OK)
    const v1_ok = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 1, 'A', 15, upgrades);
    assert.strictEqual(v1_ok.valido, true);

    SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'esmagamento', 1, 'A');

    // Lv 15 tentando comprar Tier 2 (requer Lv 20)
    const v2 = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 2, 'A', 15, upgrades);
    assert.strictEqual(v2.valido, false);

    // Lv 20 tentando comprar Tier 2 (OK)
    const v2_ok = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 2, 'A', 20, upgrades);
    assert.strictEqual(v2_ok.valido, true);
});

// 6. Progressão estritamente em ordem
test("6. Progressão estritamente em ordem (não pode pular tier)", () => {
    const upgrades = {};
    // Tenta comprar Tier 2 sem ter Tier 1 (mesmo com Lv 100)
    const vPular = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 2, 'A', 100, upgrades);
    assert.strictEqual(vPular.valido, false);
    assert.strictEqual(vPular.motivo, 'Deve adquirir o Tier 1 primeiro');

    // Tenta comprar Tier 3 sem ter Tier 2
    SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'esmagamento', 1, 'A');
    const vPular3 = SkillUpgradeTree.validarCompraUpgrade('summoner', 'esmagamento', 3, 'A', 100, upgrades);
    assert.strictEqual(vPular3.valido, false);
    assert.strictEqual(vPular3.motivo, 'Deve adquirir o Tier 2 primeiro');
});

// 7. Revelação Progressiva (Enigma / Fog of War)
test("7. Revelação Progressiva (apenas próximo upgrade revelado)", () => {
    const upgrades = {}; // Sem compras
    const visao0 = SkillUpgradeTree.gerarVisaoCliente('summoner', 'esmagamento', 25, upgrades);
    assert.strictEqual(visao0.purchased, 0);
    // Tier 1 revelado
    assert.strictEqual(visao0.tiers[0].enigma, false);
    assert.strictEqual(typeof visao0.tiers[0].A.nome, 'string');
    // Tier 2, 3, 4 devem ser enigma
    assert.strictEqual(visao0.tiers[1].enigma, true);
    assert.strictEqual(visao0.tiers[1].oculto, true);
    assert.strictEqual(visao0.tiers[1].A, undefined);
    assert.strictEqual(visao0.tiers[2].enigma, true);
    assert.strictEqual(visao0.tiers[3].enigma, true);

    // Compra Tier 1
    SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'esmagamento', 1, 'A');
    const visao1 = SkillUpgradeTree.gerarVisaoCliente('summoner', 'esmagamento', 25, upgrades);
    assert.strictEqual(visao1.purchased, 1);
    // Tier 1 adquirido (revelado)
    assert.strictEqual(visao1.tiers[0].status, 'adquirido');
    assert.strictEqual(visao1.tiers[0].A.selecionado, true);
    assert.strictEqual(visao1.tiers[0].B.bloqueado, true);
    // Tier 2 agora está revelado!
    assert.strictEqual(visao1.tiers[1].enigma, false);
    assert.strictEqual(typeof visao1.tiers[1].A.nome, 'string');
    // Tier 3 e 4 ainda são enigma
    assert.strictEqual(visao1.tiers[2].enigma, true);
    assert.strictEqual(visao1.tiers[3].enigma, true);
});

// 8. Independência do sistema de nível de skill
test("8. Independência do sistema de nível de skill (1/10)", () => {
    // Um jogador pode ter skill nível 1 ou 10, a árvore funciona por nível do personagem
    const upgrades = {};
    const lvlChar = 40;
    const v = SkillUpgradeTree.validarCompraUpgrade('summoner', 'salto', 1, 'B', lvlChar, upgrades);
    assert.strictEqual(v.valido, true);
});

// 9. Validação do servidor contra dupla compra
test("9. Validação do servidor contra dupla compra", () => {
    const upgrades = {
        colossal: { purchased: 1, choices: ['A'] }
    };
    const vDupla = SkillUpgradeTree.validarCompraUpgrade('summoner', 'colossal', 1, 'A', 50, upgrades);
    assert.strictEqual(vDupla.valido, false);
    assert.strictEqual(vDupla.motivo, 'Tier 1 já foi adquirido');
});

// 10. Validação do servidor contra compra sem pontos
test("10. Validação do servidor contra compra sem pontos", () => {
    // Lv 20 tem 2 pontos
    const upgrades = {
        esmagamento: { purchased: 1, choices: ['A'] },
        salto: { purchased: 1, choices: ['A'] }
    };
    // Gastou 2 de 2 pontos disponíveis
    const vSemPontos = SkillUpgradeTree.validarCompraUpgrade('summoner', 'colossal', 1, 'A', 20, upgrades);
    assert.strictEqual(vSemPontos.valido, false);
    assert.strictEqual(vSemPontos.motivo, 'Sem pontos de upgrade disponíveis');
});

// 11. Reset da árvore
test("11. Reset da árvore", () => {
    let upgrades = {
        esmagamento: { purchased: 2, choices: ['A', 'B'] },
        colossal: { purchased: 2, choices: ['B', 'A'] }
    };
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGastos(upgrades), 4);
    // Simula reset
    upgrades = {};
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeGastos(upgrades), 0);
    assert.strictEqual(SkillUpgradeTree.calcularPontosUpgradeDisponiveis(40, upgrades), 4);
});

// 12. Persistência de dados
test("12. Persistência de dados (estrutura JSON)", () => {
    const upgrades = {};
    SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'sismico', 1, 'B');
    SkillUpgradeTree.aplicarCompraUpgrade(upgrades, 'sismico', 2, 'A');

    const jsonStr = JSON.stringify(upgrades);
    const parsed = JSON.parse(jsonStr);

    assert.strictEqual(parsed.sismico.purchased, 2);
    assert.deepStrictEqual(parsed.sismico.choices, ['B', 'A']);
    assert.strictEqual(SkillUpgradeTree.temUpgrade(parsed, 'sismico', 2, 'A'), true);
});

// 13. Outras classes sem árvore
test("13. Outras classes sem árvore", () => {
    const vGuerreiro = SkillUpgradeTree.validarCompraUpgrade('guerreiro', 'esmagamento', 1, 'A', 50, {});
    assert.strictEqual(vGuerreiro.valido, false);
    assert.strictEqual(vGuerreiro.motivo, 'Árvore de upgrades ainda não disponível para a classe guerreiro');
});

// 14. Skills não participantes
test("14. Skills não participantes (Orbe, Ogro Guardião, Teleporte)", () => {
    const vOrbe = SkillUpgradeTree.validarCompraUpgrade('summoner', 'orbe_sombras', 1, 'A', 50, {});
    assert.strictEqual(vOrbe.valido, false);
    assert.strictEqual(vOrbe.motivo, 'Skill não possui árvore de upgrades nesta versão');

    const vGuardião = SkillUpgradeTree.validarCompraUpgrade('summoner', 'ogro_guardiao', 1, 'A', 50, {});
    assert.strictEqual(vGuardião.valido, false);

    const vTeleporte = SkillUpgradeTree.validarCompraUpgrade('summoner', 'teleporte_sombrio', 1, 'A', 50, {});
    assert.strictEqual(vTeleporte.valido, false);
});

console.log(`\n=== RESULTADO DOS TESTES: ${testesPassados}/${totalTestes} PASSARAM ===`);
if (testesPassados === totalTestes) {
    console.log("🎉 TODOS OS 14 CASOS DE TESTE PASSARAM COM SUCESSO!");
} else {
    process.exit(1);
}
