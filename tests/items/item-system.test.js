'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const items = require('../../items/item-system');
const inventoryMigration = require('../../items/migrate-inventories');
const biomeConfig = require('../../items/config/biomes.json');
const worldMap = require('../../mapas/mapa_mundo.js');

const classIds = [
    'guerreiro', 'mago', 'summoner', 'arqueiro', 'curandeiro', 'barbaro',
    'roqueiro', 'ladino', 'dronemaster', 'arqueiro_arcano', 'sniper',
    'florim', 'pikeman', 'guerreiro_kaledron'
];

function criarItem(options) {
    return items.generateEquipment(Object.assign({
        biomeId: 'santuario',
        itemLevel: 1,
        rarityId: 'raro',
        random: function () { return 0.5; }
    }, options));
}

test('gera e valida as duas armas configuradas para cada classe', function () {
    for (const classId of classIds) {
        const classe = items.getClass(classId);
        assert.ok(classe, 'classe existente: ' + classId);
        for (const definitionId of [classe.primaryWeapon, classe.secondaryWeapon]) {
            const instance = criarItem({ classId: classId, definitionId: definitionId });
            assert.equal(instance.icon, items.getDefinition(definitionId).icon);
            assert.equal(instance.itemDefinitionId, definitionId);
            assert.equal(items.validateEquipmentForClass(classId, instance).valid, true);
            assert.match(instance.itemInstanceId, /^item_[0-9a-f-]{36}$/i);
            assert.equal(instance.uid, instance.itemInstanceId);
            assert.equal(instance.id, instance.itemInstanceId);
            assert.ok(instance.itemPower > 0);
        }
    }
});

test('gera todos os slots de equipamento e mantém a classe sem restrição', function () {
    const slots = ['capacete', 'peitoral', 'capa', 'luva', 'bota', 'anel', 'colar'];
    const icones = {
        capacete: '🪖',
        peitoral: '🛡️',
        capa: '🧥',
        luva: '🧤',
        bota: '🥾',
        anel: '💍',
        colar: '📿'
    };
    for (const slot of slots) {
        const definitionId = {
            capacete: 'armor_helmet',
            peitoral: 'armor_chest',
            capa: 'armor_cloak',
            luva: 'armor_gloves',
            bota: 'armor_boots',
            anel: 'accessory_ring',
            colar: 'accessory_necklace'
        }[slot];
        const instance = criarItem({ classId: 'mago', definitionId: definitionId });
        assert.equal(instance.slot, slot);
        assert.equal(instance.icon, icones[slot]);
        assert.equal(items.validateEquipmentForClass('mago', instance).valid, true);

        const legado = Object.assign({}, instance, { icon: slot === 'peitoral' ? '🛡️' : '🎒' });
        assert.equal(items.validateEquipmentForClass('mago', legado).valid, true, 'mantém compatibilidade com ícones antigos');
    }
});

test('gera itens dentro das faixas de todos os biomas e tiers configurados', function () {
    for (const biomeId of Object.keys(biomeConfig.biomes)) {
        assert.equal(items.getBiomeIdByName(biomeConfig.biomes[biomeId].name), biomeId);
        const instance = items.generateEquipment({
            classId: 'mago',
            biomeId: biomeId,
            rarityId: 'incomum',
            random: function () { return 0.5; }
        });
        assert.equal(items.validateDefinitionAndInstance(instance).valid, true, biomeId);
        assert.ok(instance.itemLevel >= biomeConfig.biomes[biomeId].itemLevel[0], biomeId);
        assert.ok(instance.itemLevel <= biomeConfig.biomes[biomeId].itemLevel[1], biomeId);
    }
});

test('resolve os 18 centros reais do mapa para as loot tables corretas', function () {
    const centers = worldMap.CENTROS_BIOMAS;
    assert.equal(Object.keys(centers).length, 18);
    for (const biomeId of Object.keys(centers)) {
        const center = centers[biomeId];
        const actualName = worldMap.biomaNome(center.x, center.y);
        assert.equal(items.getBiomeIdByName(actualName), biomeId, actualName);
    }
});

test('gera UUIDs criptográficos distintos e rejeita fontes aleatórias inválidas', function () {
    const first = items.generateEquipment({
        classId: 'mago',
        biomeId: 'santuario',
        itemLevel: 1,
        rarityId: 'comum',
        definitionId: 'cajado_arcano'
    });
    const second = items.generateEquipment({
        classId: 'mago',
        biomeId: 'santuario',
        itemLevel: 1,
        rarityId: 'comum',
        definitionId: 'cajado_arcano'
    });
    assert.notEqual(first.itemInstanceId, second.itemInstanceId);
    assert.equal(items.validateDefinitionAndInstance(first).valid, true);
    assert.throws(function () {
        criarItem({ classId: 'mago', random: function () { return 1; } });
    }, RangeError);
});

test('forja itens administrativos vinculados a definições e valida seus limites', function () {
    const forged = items.createAdminEquipment({
        classId: 'sniper',
        slot: 'arma',
        rarityId: 'lendario',
        name: 'Lâmina de teste',
        forca: 500,
        vida: 20,
        customVisual: {
            tamanho: 25,
            largura: 3.5,
            cBase: '#39434f',
            cMeio: '#6b7e92',
            cPonta: '#b8c9db',
            cFio: '#eef6ff'
        },
        random: function () { return 0.5; }
    });
    assert.equal(forged.itemDefinitionId, 'barrett_antimateria');
    assert.equal(items.validateEquipmentForClass('sniper', forged).valid, true);
    assert.equal(forged.status.forca, 500);
    assert.throws(function () {
        items.createAdminEquipment({
            classId: 'sniper',
            slot: 'arma',
            rarityId: 'lendario',
            forca: 501,
            random: function () { return 0.5; }
        });
    }, RangeError);
    assert.throws(function () {
        items.createAdminEquipment({
            classId: 'sniper',
            slot: 'arma',
            rarityId: 'lendario',
            customVisual: { cBase: 'url(javascript:alert(1))' },
            random: function () { return 0.5; }
        });
    }, /Cor de visual customizado inválida/);
});

test('rejeita classe, nível e definição inválidos', function () {
    assert.throws(function () {
        criarItem({ classId: 'classe_inexistente' });
    }, /Classe desconhecida/);
    assert.throws(function () {
        criarItem({ classId: 'mago', definitionId: 'arma_de_outra_fonte' });
    }, /Definição de item inexistente/);
    assert.throws(function () {
        criarItem({ classId: 'mago', definitionId: 'espada_de_pedra' });
    }, /classe não pode gerar/i);
    assert.throws(function () {
        criarItem({ classId: 'mago', itemLevel: 100 });
    }, RangeError);
});

test('rejeita alterações posteriores aos valores de combate e status', function () {
    const instance = criarItem({ classId: 'guerreiro', definitionId: 'espada_de_pedra' });
    const wrongClass = items.validateEquipmentForClass('mago', instance);
    assert.equal(wrongClass.valid, false);
    assert.equal(wrongClass.reason, 'class_restricted');

    const changedAttack = Object.assign({}, instance, { attack: instance.attack + 1 });
    assert.equal(items.validateDefinitionAndInstance(changedAttack).valid, false);

    const changedStatus = JSON.parse(JSON.stringify(instance));
    const stat = Object.keys(changedStatus.status)[0];
    changedStatus.status[stat] += 1;
    assert.equal(items.validateDefinitionAndInstance(changedStatus).valid, false);
});

test('reconhece rolagens perfeitas e IDs duplicados na mesma ou em várias mochilas', function () {
    const perfect = criarItem({
        classId: 'guerreiro',
        definitionId: 'espada_de_pedra',
        random: function () { return 0.999999; }
    });
    assert.equal(perfect.isPerfect, true);
    assert.equal(perfect.rolls.every(function (roll) { return roll.perfect; }), true);

    const duplicateId = 'item_00000000-0000-4000-8000-000000000000';
    assert.throws(function () {
        items.assertUniqueInventoryOwnership({
            playerA: { inventario: { slots: {}, mochila: [{ id: duplicateId }] } },
            playerB: { inventario: { slots: {}, mochila: [{ uid: duplicateId }] } }
        });
    }, /Instância duplicada/);
});

test('mantém os itens válidos após um nível de upgrade e recalcula o Item Power', function () {
    const instance = criarItem({ classId: 'guerreiro', definitionId: 'espada_de_pedra' });
    const stat = Object.keys(instance.status).sort(function (a, b) {
        return instance.status[b] - instance.status[a];
    })[0];
    const itemPowerOriginal = instance.itemPower;
    instance.status[stat] += 1;
    instance.upgrade = 1;
    items.recalculateDerived(instance);
    assert.ok(instance.itemPower > itemPowerOriginal);
    assert.equal(items.validateDefinitionAndInstance(instance).valid, true);
});

test('subtrai a defesa equipada do dano e mantém o mínimo de 1 por acerto', function () {
    const capacete = criarItem({ classId: 'guerreiro', definitionId: 'armor_helmet' });
    const escudo = criarItem({ classId: 'guerreiro', definitionId: 'escudo_de_pedra' });
    const slots = {
        capacete: capacete,
        armaSecundaria: escudo,
        anel: { tipo: 'equipamento', status: { defesa: 999 } }
    };
    const defesaTotal = capacete.defense + escudo.defense;

    assert.equal(items.calcularDefesaEquipamento('guerreiro', slots), defesaTotal);
    assert.equal(
        items.reduzirDanoPelaDefesaEquipamento('guerreiro', slots, 50),
        Math.max(1, Math.round(50 - defesaTotal))
    );
    assert.equal(items.reduzirDanoPelaDefesaEquipamento('guerreiro', slots, 1), 1);
    assert.equal(items.reduzirDanoPelaDefesaEquipamento('guerreiro', slots, 0), 0);
    assert.throws(function () {
        items.reduzirDanoPelaDefesaEquipamento('mago', slots, 50);
    }, /Item equipado inválido/);
});

test('ignora equipamento legado incompatível sem interromper o dano recebido', function () {
    const weaponGuerreiro = criarItem({ classId: 'guerreiro', definitionId: 'espada_de_pedra' });
    const dano = items.reduzirDanoPelaDefesaEquipamentoCompativel('ladino', {
        arma: weaponGuerreiro
    }, 100);
    assert.equal(dano, 100);
});

test('migra identidades sem rerrolar nem alterar dados de itens', function () {
    let uuid = 0;
    const original = {
        playerA: {
            inventario: {
                slots: { arma: { id: 'old-a', uid: 'legacy-a', tipo: 'equipamento', status: { forca: 7 } } },
                mochila: [{ id: 'old-b', tipo: 'consumivel', quantidade: 3 }]
            }
        },
        playerB: { inventario: { slots: {}, mochila: [{ tipo: 'pedra', quantidade: 2 }] } }
    };
    const migrated = inventoryMigration.migrateInventories(original, function () {
        uuid++;
        return '00000000-0000-4000-8000-' + String(uuid).padStart(12, '0');
    });

    assert.equal(migrated.stats.migrated, 3);
    assert.deepEqual(original.playerA.inventario.slots.arma.status, { forca: 7 });
    assert.equal(migrated.records.playerA.inventario.slots.arma.legacyIdentityV1.id, 'old-a');
    assert.equal(migrated.records.playerA.inventario.slots.arma.legacyIdentityV1.uid, 'legacy-a');
    assert.equal(
        migrated.records.playerA.inventario.slots.arma.id,
        migrated.records.playerA.inventario.slots.arma.uid
    );
    assert.match(migrated.records.playerB.inventario.mochila[0].itemInstanceId, /^item_[0-9a-f-]{36}$/i);

    const rerun = inventoryMigration.migrateInventories(migrated.records, function () {
        throw new Error('A segunda execução não deve gerar UUIDs.');
    });
    assert.equal(rerun.stats.migrated, 0);
    assert.equal(rerun.stats.unchanged, 3);
    assert.deepEqual(rerun.records, migrated.records);
});

test('cancela migração se encontrar IDs legados duplicados', function () {
    assert.throws(function () {
        inventoryMigration.migrateInventories({
            playerA: { inventario: { slots: {}, mochila: [{ id: 'duplicate' }] } },
            playerB: { inventario: { slots: {}, mochila: [{ uid: 'duplicate' }] } }
        });
    }, /identificador de item duplicado/);
});
