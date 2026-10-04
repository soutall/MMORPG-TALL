'use strict';

const crypto = require('crypto');
const raritiesConfig = require('./config/rarities.json');
const statDefinitions = require('./config/stat-definitions.json');
const rollConfig = require('./config/roll-config.json');
const classesConfig = require('./config/classes.json');
const tiersConfig = require('./config/item-tiers.json');
const biomesConfig = require('./config/biomes.json');
const lootConfig = require('./config/loot-tables.json');
const weaponsConfig = require('./definitions/weapons.json');
const equipmentConfig = require('./definitions/equipment.json');

const WEAPON_SLOTS = new Set(['arma', 'armaSecundaria']);
const ITEM_LEVEL_CAP = tiersConfig.itemLevelCap;
const RARITIES = new Map(raritiesConfig.rarities.map(function (rarity) {
    return [rarity.id, rarity];
}));
const ITEM_TIERS = new Map(tiersConfig.tiers.map(function (tier) {
    return [tier.id, tier];
}));
const ARMOR_DEFINITIONS_BY_SLOT = new Map(equipmentConfig.equipment.map(function (definition) {
    return [definition.slot, definition];
}));
const WEAPONS = new Map(weaponsConfig.weapons.map(function (definition) {
    return [definition.id, definition];
}));
const EQUIPMENT = new Map(equipmentConfig.equipment.map(function (definition) {
    return [definition.id, definition];
}));
const ITEM_DEFINITIONS = new Map([...WEAPONS, ...EQUIPMENT]);
const PRIMARY_STATS = new Set(Object.keys(statDefinitions.primaryAttributes));
const SECONDARY_STATS = new Set(Object.keys(statDefinitions.secondaryStats));
const ALL_STATS = new Set([...PRIMARY_STATS, ...SECONDARY_STATS]);
const QUALITY_BANDS = Object.freeze(rollConfig.rollBands.slice());
const BIOME_IDS_BY_NAME = new Map();

function validarConfiguracao() {
    if (!Number.isInteger(ITEM_LEVEL_CAP) || ITEM_LEVEL_CAP < 1) {
        throw new Error('Limite de nível de item inválido.');
    }
    if (RARITIES.size !== raritiesConfig.rarities.length ||
        WEAPONS.size !== weaponsConfig.weapons.length ||
        EQUIPMENT.size !== equipmentConfig.equipment.length ||
        ITEM_TIERS.size !== tiersConfig.tiers.length) {
        throw new Error('Há IDs duplicados nas definições de equipamento.');
    }
    tiersConfig.tiers.forEach(function (tier) {
        if (!Number.isInteger(tier.itemLevelMin) || !Number.isInteger(tier.itemLevelMax) ||
            tier.itemLevelMin < 1 || tier.itemLevelMin > tier.itemLevelMax ||
            tier.itemLevelMax > ITEM_LEVEL_CAP) {
            throw new Error('Tier de item inválido: ' + tier.id);
        }
    });
    const somaRaridades = raritiesConfig.rarities.reduce(function (soma, raridade) {
        if (!Number.isFinite(raridade.weight) || raridade.weight <= 0 ||
            !Number.isInteger(raridade.minAffixes) ||
            !Number.isInteger(raridade.maxAffixes) ||
            raridade.minAffixes < 0 ||
            raridade.maxAffixes < raridade.minAffixes ||
            !Array.isArray(raridade.valueRange) ||
            raridade.valueRange.length !== 2 ||
            raridade.valueRange[0] > raridade.valueRange[1]) {
            throw new Error('Configuração inválida para raridade: ' + raridade.id);
        }
        return soma + raridade.weight;
    }, 0);
    if (Math.abs(somaRaridades - 100) > 0.000001) {
        throw new Error('Os pesos de raridade devem somar 100.');
    }
    const somaQualidades = rollConfig.rollBands.reduce(function (soma, banda) {
        if (!Number.isFinite(banda.weight) || banda.weight <= 0 ||
            banda.minPercent < 0 || banda.maxPercent > 100 ||
            banda.minPercent > banda.maxPercent) {
            throw new Error('Faixa de rolagem inválida: ' + banda.id);
        }
        return soma + banda.weight;
    }, 0);
    if (Math.abs(somaQualidades - 100) > 0.000001) {
        throw new Error('Os pesos das faixas de rolagem devem somar 100.');
    }
    Object.keys(lootConfig.tables).forEach(function (tableId) {
        const table = lootConfig.tables[tableId];
        validarFaixa(table.itemLevel, 'itemLevel da loot table ' + tableId);
        if (!Number.isFinite(table.equipmentChance) || table.equipmentChance < 0 || table.equipmentChance > 1 ||
            !Number.isFinite(table.weaponChance) || table.weaponChance < 0 || table.weaponChance > 1) {
            throw new Error('Chance inválida na loot table: ' + tableId);
        }
        const entries = Object.keys(table.rarityWeights || {});
        const total = entries.reduce(function (sum, rarityId) {
            if (!RARITIES.has(rarityId) || !Number.isFinite(table.rarityWeights[rarityId]) ||
                table.rarityWeights[rarityId] <= 0) {
                throw new Error('Peso de raridade inválido na loot table: ' + tableId + '/' + rarityId);
            }
            return sum + table.rarityWeights[rarityId];
        }, 0);
        if (Math.abs(total - 100) > 0.000001) {
            throw new Error('Os pesos de raridade devem somar 100 na loot table: ' + tableId);
        }
    });
    Object.keys(classesConfig.classes).forEach(function (classId) {
        const classe = classesConfig.classes[classId];
        [classe.primaryWeapon, classe.secondaryWeapon].forEach(function (weaponId, index) {
            const definition = WEAPONS.get(weaponId);
            const slot = index === 0 ? 'arma' : 'armaSecundaria';
            if (!definition || definition.classRestriction !== classId || definition.slot !== slot) {
                throw new Error('Arma incompatível ou ausente para ' + classId + ': ' + weaponId);
            }
        });
        Object.keys(classesConfig.classes).forEach(function (classId) {
            if (!weaponsConfig.weapons.some(function (definition) { return definition.classRestriction === classId; })) {
                throw new Error('Classe sem arma configurada: ' + classId);
            }
        });
    });
    weaponsConfig.weapons.forEach(validarDefinicaoEquipamento);
    equipmentConfig.equipment.forEach(validarDefinicaoEquipamento);
    Object.keys(biomesConfig.biomes).forEach(function (biomeId) {
        const biome = biomesConfig.biomes[biomeId];
        if (!lootConfig.tables[biome.lootTableId]) {
            throw new Error('Loot table não encontrada para o bioma: ' + biomeId);
        }
        if (!ITEM_TIERS.has('t' + biome.progressionTier)) {
            throw new Error('Tier de item não encontrado para o bioma: ' + biomeId);
        }
        validarFaixa(biome.itemLevel, 'itemLevel de ' + biomeId);
        validarFaixa(biome.monsterLevel, 'monsterLevel de ' + biomeId);
        validarFaixa(biome.recommendedLevel, 'recommendedLevel de ' + biomeId);
        const normalizedName = normalizarNomeBioma(biome.name);
        if (!normalizedName || BIOME_IDS_BY_NAME.has(normalizedName)) {
            throw new Error('Nome de bioma ausente ou ambíguo: ' + biomeId);
        }
        BIOME_IDS_BY_NAME.set(normalizedName, biomeId);
        const normalizedBaseName = normalizarNomeBioma(biome.name.replace(/\s*\([^)]*\)/g, ''));
        if (normalizedBaseName && BIOME_IDS_BY_NAME.has(normalizedBaseName) &&
            BIOME_IDS_BY_NAME.get(normalizedBaseName) !== biomeId) {
            throw new Error('Nome base de bioma ambíguo: ' + biomeId);
        }
        if (normalizedBaseName && !BIOME_IDS_BY_NAME.has(normalizedBaseName)) {
            BIOME_IDS_BY_NAME.set(normalizedBaseName, biomeId);
        }
        Object.keys(biome.primaryStatBias || {}).forEach(function (stat) {
            if (!PRIMARY_STATS.has(stat)) throw new Error('Atributo primário inválido no bioma: ' + biomeId + '/' + stat);
        });
        Object.keys(biome.secondaryStatBias || {}).forEach(function (stat) {
            if (!SECONDARY_STATS.has(stat)) throw new Error('Atributo secundário inválido no bioma: ' + biomeId + '/' + stat);
        });
        (biome.specialStatPool || []).forEach(function (stat) {
            if (!ALL_STATS.has(stat)) throw new Error('Atributo especial inválido no bioma: ' + biomeId + '/' + stat);
        });
    });
}

function normalizarNomeBioma(name) {
    return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

function validarDefinicaoEquipamento(definition) {
    if (!definition.id || !definition.name ||
        !['capacete', 'peitoral', 'capa', 'luva', 'bota', 'anel', 'colar', 'arma', 'armaSecundaria'].includes(definition.slot) ||
        !definition.allowedAttributes || typeof definition.allowedAttributes !== 'object') {
        throw new Error('Definição de equipamento inválida: ' + (definition.id || 'sem ID'));
    }
    Object.keys(definition.allowedAttributes).forEach(function (stat) {
        if (!ALL_STATS.has(stat) || !Number.isFinite(definition.allowedAttributes[stat]) || definition.allowedAttributes[stat] <= 0) {
            throw new Error('Pool de status inválido em ' + definition.id + ': ' + stat);
        }
    });
    if (WEAPON_SLOTS.has(definition.slot) && !definition.classRestriction) {
        throw new Error('Arma sem restrição de classe: ' + definition.id);
    }
    if (definition.classRestriction &&
        !Object.prototype.hasOwnProperty.call(classesConfig.classes, definition.classRestriction)) {
        throw new Error('Classe inexistente na definição: ' + definition.id);
    }
    [['baseAttack', 'attackPerLevel'], ['baseDefense', 'defensePerLevel']].forEach(function (fields) {
        const baseRange = definition[fields[0]];
        const perLevel = definition[fields[1]];
        if (baseRange === undefined && perLevel === undefined) return;
        if (!Array.isArray(baseRange) || baseRange.length !== 2 ||
            !baseRange.every(Number.isFinite) || baseRange[0] < 0 || baseRange[0] > baseRange[1] ||
            !Array.isArray(perLevel) || perLevel.length !== 2 ||
            !perLevel.every(Number.isFinite) || perLevel[0] < 0 || perLevel[0] > perLevel[1]) {
            throw new Error('Escala de ataque/defesa inválida: ' + definition.id);
        }
    });
}

function obterIdBiomaPorNome(name) {
    const normalized = normalizarNomeBioma(String(name || '').replace(/\s*\([^)]*\)/g, ''));
    return BIOME_IDS_BY_NAME.get(normalized) || null;
}

function validarFaixa(range, label) {
    if (!Array.isArray(range) || range.length !== 2 ||
        !Number.isFinite(range[0]) || !Number.isFinite(range[1]) ||
        range[0] < 1 || range[0] > range[1]) {
        throw new Error('Faixa inválida: ' + label);
    }
}

validarConfiguracao();

function numeroAleatorio(random) {
    const valor = random
        ? random()
        : crypto.randomInt(0, 0x100000000) / 0x100000000;
    if (!Number.isFinite(valor) || valor < 0 || valor >= 1) {
        throw new RangeError('A fonte aleatória deve retornar um número entre 0 (inclusivo) e 1 (exclusivo).');
    }
    return valor;
}

function escolhaPonderada(itens, pesoFn, random) {
    const elegiveis = itens.filter(function (item) {
        return Number.isFinite(pesoFn(item)) && pesoFn(item) > 0;
    });
    const total = elegiveis.reduce(function (soma, item) {
        return soma + pesoFn(item);
    }, 0);
    if (!elegiveis.length || total <= 0) throw new Error('Não há resultados válidos para a rolagem ponderada.');
    let alvo = numeroAleatorio(random) * total;
    for (let i = 0; i < elegiveis.length; i++) {
        alvo -= pesoFn(elegiveis[i]);
        if (alvo < 0) return elegiveis[i];
    }
    return elegiveis[elegiveis.length - 1];
}

function inteiroAleatorio(minimo, maximo, random) {
    return minimo + Math.floor(numeroAleatorio(random) * (maximo - minimo + 1));
}

function raridadePorId(rarityId) {
    const rarity = RARITIES.get(rarityId);
    if (!rarity) throw new Error('Raridade desconhecida: ' + rarityId);
    return rarity;
}

function obterDefinicao(definitionId) {
    return ITEM_DEFINITIONS.get(definitionId) || null;
}

function copiarJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function obterBioma(biomeId) {
    const biome = biomesConfig.biomes[biomeId];
    if (!biome) throw new Error('Bioma desconhecido: ' + biomeId);
    return biome;
}

function escolherNivelItem(biomeId, requestedLevel, random) {
    const range = obterFaixaNivelItem(biomeId);
    const min = range[0];
    const max = range[1];
    if (requestedLevel !== undefined) {
        const level = Number(requestedLevel);
        if (!Number.isInteger(level) || level < min || level > max) {
            throw new RangeError('Nível de item fora da faixa configurada para o bioma.');
        }
        return level;
    }
    return inteiroAleatorio(min, max, random);
}

function obterFaixaNivelItem(biomeId) {
    const biome = obterBioma(biomeId);
    const table = lootConfig.tables[biome.lootTableId];
    const tier = ITEM_TIERS.get('t' + biome.progressionTier);
    const min = Math.max(1, biome.itemLevel[0], table.itemLevel[0], tier.itemLevelMin);
    const max = Math.min(ITEM_LEVEL_CAP, biome.itemLevel[1], table.itemLevel[1], tier.itemLevelMax);
    if (min > max) throw new Error('As faixas de item do bioma não se sobrepõem à loot table: ' + biomeId);
    return [min, max];
}

function escolherRaridade(table, random) {
    const pesos = table && table.rarityWeights;
    const entries = Object.keys(pesos || {}).map(function (id) {
        return { id: id, weight: pesos[id] };
    });
    return escolhaPonderada(entries, function (entry) {
        return entry.weight;
    }, random).id;
}

function escolherDefinicao(classId, table, requestedDefinitionId, random) {
    if (!Object.prototype.hasOwnProperty.call(classesConfig.classes, classId)) {
        throw new Error('Classe desconhecida: ' + classId);
    }
    if (requestedDefinitionId) {
        const requested = obterDefinicao(requestedDefinitionId);
        if (!requested) throw new Error('Definição de item inexistente: ' + requestedDefinitionId);
        if (requested.classRestriction && requested.classRestriction !== classId) {
            throw new Error('A classe não pode gerar essa arma.');
        }
        return requested;
    }
    const armasClasse = weaponsConfig.weapons.filter(function (weapon) {
        return weapon.classRestriction === classId;
    });
    const armadura = equipmentConfig.equipment;
    const pool = [];
    if (numeroAleatorio(random) < table.weaponChance) {
        armasClasse.forEach(function (weapon) {
            pool.push({ definition: weapon, weight: weapon.slot === 'arma' ? 0.6 : 0.4 });
        });
    } else {
        armadura.forEach(function (definition) {
            pool.push({ definition: definition, weight: 1 });
        });
    }
    if (!pool.length) throw new Error('A classe não possui equipamentos definidos: ' + classId);
    return escolhaPonderada(pool, function (entry) {
        return entry.weight;
    }, random).definition;
}

function sortearRolagem(range, random) {
    const banda = escolhaPonderada(QUALITY_BANDS, function (entry) {
        return entry.weight;
    }, random);
    const percent = inteiroAleatorio(banda.minPercent, banda.maxPercent, random);
    const min = Number(range[0]);
    const max = Number(range[1]);
    const value = Math.round((min + ((max - min) * percent / 100)) * 100) / 100;
    return {
        value: value,
        min: min,
        max: max,
        rollPercent: percent,
        quality: banda.id,
        perfect: percent === 100
    };
}

function faixasDeValor(definition, itemLevel, rarity, random) {
    const raridade = raridadePorId(rarity);
    const affixes = {};
    const pool = Object.keys(definition.allowedAttributes);
    const countMax = Math.min(raridade.maxAffixes, pool.length);
    const countMin = Math.min(raridade.minAffixes, countMax);
    const count = inteiroAleatorio(countMin, countMax, random);
    const chosenStats = [];
    const availableStats = pool.slice();
    while (chosenStats.length < count) {
        const stat = escolhaPonderada(availableStats.map(function (id) {
            return { id: id, weight: definition.allowedAttributes[id] };
        }), function (entry) {
            return entry.weight;
        }, random);
        chosenStats.push(stat.id);
        availableStats.splice(availableStats.indexOf(stat.id), 1);
    }
    chosenStats.forEach(function (stat) {
        affixes[stat] = raridade.valueRange;
    });
    const scaleFields = {};
    if (definition.baseAttack) scaleFields.attack = obterFaixaEscalada(definition.baseAttack, definition.attackPerLevel, itemLevel);
    if (definition.baseDefense) scaleFields.defense = obterFaixaEscalada(definition.baseDefense, definition.defensePerLevel, itemLevel);
    return { affixes: affixes, scaleFields: scaleFields };
}

function obterFaixaEscalada(baseRange, perLevel, level) {
    if (!Array.isArray(baseRange) || !Array.isArray(perLevel)) {
        throw new Error('Faixa de ataque/defesa ausente na definição.');
    }
    return [
        Math.round((baseRange[0] + (level - 1) * perLevel[0]) * 100) / 100,
        Math.round((baseRange[1] + (level - 1) * perLevel[1]) * 100) / 100
    ];
}

function calcularItemPower(instance, rarity) {
    const cfg = rollConfig.itemPower;
    const affixTotal = Object.keys(instance.status).reduce(function (total, key) {
        return total + Number(instance.status[key] || 0);
    }, 0);
    const qualityAverage = instance.rolls.length
        ? instance.rolls.reduce(function (total, roll) { return total + roll.rollPercent; }, 0) / instance.rolls.length
        : 0;
    return Math.round((
        instance.itemLevel * cfg.levelWeight +
        Number(instance.attack || 0) * cfg.attackWeight +
        Number(instance.defense || 0) * cfg.defenseWeight +
        Object.keys(instance.status).length * cfg.affixCountWeight +
        affixTotal * cfg.affixValueWeight +
        qualityAverage * cfg.qualityPercentWeight +
        rarity.itemPowerBonus
    ) * 100) / 100;
}

function atualizarItemPower(instance) {
    const rarity = raridadePorId(instance.raridade);
    instance.itemPower = calcularItemPower(instance, rarity);
    return instance.itemPower;
}

function criarInstancia(definition, options) {
    const opts = options || {};
    const classId = opts.classId;
    if (definition.classRestriction && definition.classRestriction !== classId) {
        throw new Error('A classe não pode usar essa definição de arma.');
    }
    const itemLevel = escolherNivelItem(opts.biomeId, opts.itemLevel, opts.random);
    const rarityId = opts.rarityId || escolherRaridade(
        lootConfig.tables[obterBioma(opts.biomeId).lootTableId],
        opts.random
    );
    const rarity = raridadePorId(rarityId);
    const ranges = faixasDeValor(definition, itemLevel, rarityId, opts.random);
    const id = 'item_' + crypto.randomUUID();
    const rolls = [];
    const status = {};
    Object.keys(ranges.affixes).forEach(function (statId) {
        const result = sortearRolagem(ranges.affixes[statId], opts.random);
        status[statId] = result.value;
        rolls.push(Object.assign({ statId: statId }, result));
    });
    const scaleRolls = {};
    Object.keys(ranges.scaleFields).forEach(function (field) {
        const result = sortearRolagem(ranges.scaleFields[field], opts.random);
        scaleRolls[field] = result;
        rolls.push(Object.assign({ statId: field }, result));
    });
    const itemName = definition.name + (rarityId === 'comum' ? '' : ' ' + rarity.name);
    const instance = {
        schemaVersion: 1,
        itemInstanceId: id,
        id: id,
        uid: id,
        itemDefinitionId: definition.id,
        nome: itemName,
        icon: definition.icon || (definition.slot === 'peitoral' ? '🛡️' : '🎒'),
        tipo: 'equipamento',
        slot: definition.slot,
        raridade: rarityId,
        raridadeNome: rarity.name,
        cor: rarity.color,
        classe: definition.classRestriction || null,
        armaChave: WEAPON_SLOTS.has(definition.slot) ? definition.id : null,
        biomeId: opts.biomeId,
        progressionTier: obterBioma(opts.biomeId).progressionTier,
        requiredLevel: Math.min(itemLevel, obterBioma(opts.biomeId).recommendedLevel[1]),
        itemLevel: itemLevel,
        attack: scaleRolls.attack ? scaleRolls.attack.value : 0,
        defense: scaleRolls.defense ? scaleRolls.defense.value : 0,
        status: status,
        rolls: rolls,
        quality: {
            averagePercent: rolls.length
                ? Math.round(rolls.reduce(function (total, roll) { return total + roll.rollPercent; }, 0) / rolls.length)
                : 0,
            perfectRollCount: rolls.filter(function (roll) { return roll.perfect; }).length
        },
        isPerfect: rolls.length > 0 && rolls.every(function (roll) { return roll.perfect; }),
        upgrade: 0,
        upgradeExtras: [],
        createdAt: Date.now()
    };
    atualizarItemPower(instance);
    return instance;
}

function generateEquipment(options) {
    const opts = options || {};
    const biome = obterBioma(opts.biomeId);
    const table = lootConfig.tables[biome.lootTableId];
    const itemLevel = escolherNivelItem(opts.biomeId, opts.itemLevel, opts.random);
    const definition = escolherDefinicao(opts.classId, table, opts.definitionId, opts.random);
    return criarInstancia(definition, {
        classId: opts.classId,
        biomeId: opts.biomeId,
        itemLevel: itemLevel,
        rarityId: opts.rarityId || escolherRaridade(table, opts.random),
        random: opts.random
    });
}

function createAdminEquipment(options) {
    const opts = options || {};
    const classId = opts.classId;
    const classDefinition = classesConfig.classes[classId];
    if (!classDefinition) throw new Error('Classe desconhecida: ' + classId);

    let definitionId;
    if (opts.slot === 'arma') definitionId = classDefinition.primaryWeapon;
    else if (opts.slot === 'armaSecundaria') definitionId = classDefinition.secondaryWeapon;
    else {
        const armorDefinition = ARMOR_DEFINITIONS_BY_SLOT.get(opts.slot);
        if (!armorDefinition) throw new Error('Slot administrativo inválido: ' + opts.slot);
        definitionId = armorDefinition.id;
    }
    const definition = ITEM_DEFINITIONS.get(definitionId);
    const instance = generateEquipment({
        classId: classId,
        biomeId: opts.biomeId || 'santuario',
        itemLevel: 1,
        rarityId: opts.rarityId,
        definitionId: definitionId,
        random: opts.random
    });
    const requestedStats = {
        forca: Number(opts.forca || 0),
        vida: Number(opts.vida || 0)
    };
    const adminStats = {};
    Object.keys(requestedStats).forEach(function (stat) {
        const value = requestedStats[stat];
        if (!Number.isFinite(value) || value < 0 || value > 500) {
            throw new RangeError('Status administrativo fora do limite permitido.');
        }
        if (value > 0) {
            adminStats[stat] = value;
        }
    });
    const name = String(opts.name || '').replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 64);
    if (opts.name && !name) throw new Error('Nome administrativo inválido.');
    instance.nome = name || 'Item Forjado';
    instance.status = adminStats;
    instance.adminCustom = { name: instance.nome, status: copiarJson(adminStats) };
    if (opts.customVisual !== undefined && opts.customVisual !== null) {
        const visual = opts.customVisual;
        if (!visual || typeof visual !== 'object' || Array.isArray(visual)) {
            throw new TypeError('Visual customizado inválido.');
        }
        const colorFields = ['cBase', 'cMeio', 'cPonta', 'cFio'];
        const normalizedVisual = {
            tamanho: Math.max(10, Math.min(300, Number(visual.tamanho) || 80)),
            largura: Math.max(1, Math.min(100, Number(visual.largura) || 12))
        };
        colorFields.forEach(function (field) {
            const color = String(visual[field] || '#ffffff');
            if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Cor de visual customizado inválida.');
            normalizedVisual[field] = color;
        });
        instance.customVisual = normalizedVisual;
    }
    atualizarItemPower(instance);
    return instance;
}

function validateDefinitionAndInstance(instance) {
    if (!instance || typeof instance !== 'object') return { valid: false, reason: 'invalid_instance' };
    const instanceId = instance.itemInstanceId || instance.uid || instance.id;
    if (typeof instanceId !== 'string' || !/^item_[0-9a-f-]{36}$/i.test(instanceId)) {
        return { valid: false, reason: 'invalid_instance_id' };
    }
    if (instance.id !== instanceId || instance.uid !== instanceId) {
        return { valid: false, reason: 'instance_id_alias_mismatch' };
    }
    const definition = obterDefinicao(instance.itemDefinitionId);
    if (!definition || definition.slot !== instance.slot) return { valid: false, reason: 'invalid_definition' };
    if ((definition.classRestriction || null) !== (instance.classe || null)) {
        return { valid: false, reason: 'invalid_class_restriction' };
    }
    if (!RARITIES.has(instance.raridade) ||
        instance.raridadeNome !== RARITIES.get(instance.raridade).name) return { valid: false, reason: 'invalid_rarity' };
    if (instance.schemaVersion !== 1 || instance.tipo !== 'equipamento' ||
        !Number.isFinite(instance.createdAt) || instance.createdAt < 0 ||
        instance.armaChave !== (WEAPON_SLOTS.has(definition.slot) ? definition.id : null) ||
        instance.nome !== (instance.adminCustom ? instance.adminCustom.name :
            definition.name + (instance.raridade === 'comum' ? '' : ' ' + RARITIES.get(instance.raridade).name)) ||
        instance.cor !== RARITIES.get(instance.raridade).color ||
        instance.icon !== (definition.icon || (definition.slot === 'peitoral' ? '🛡️' : '🎒'))) {
        return { valid: false, reason: 'invalid_identity' };
    }
    if (instance.customVisual !== undefined) {
        const visual = instance.customVisual;
        if (!visual || typeof visual !== 'object' || Array.isArray(visual) ||
            !Number.isFinite(visual.tamanho) || visual.tamanho < 10 || visual.tamanho > 300 ||
            !Number.isFinite(visual.largura) || visual.largura < 1 || visual.largura > 100 ||
            ['cBase', 'cMeio', 'cPonta', 'cFio'].some(function (field) {
                return typeof visual[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(visual[field]);
            })) return { valid: false, reason: 'invalid_custom_visual' };
    }
    if (!Number.isInteger(instance.itemLevel) || instance.itemLevel < 1 || instance.itemLevel > ITEM_LEVEL_CAP) {
        return { valid: false, reason: 'invalid_item_level' };
    }
    const biome = biomesConfig.biomes[instance.biomeId];
    const tier = biome && ITEM_TIERS.get('t' + biome.progressionTier);
    if (!biome || instance.itemLevel < biome.itemLevel[0] || instance.itemLevel > biome.itemLevel[1] ||
        !tier || instance.itemLevel < tier.itemLevelMin || instance.itemLevel > tier.itemLevelMax ||
        !Number.isInteger(instance.requiredLevel) || instance.requiredLevel < 1 ||
        instance.requiredLevel > biome.recommendedLevel[1] ||
        instance.requiredLevel !== Math.min(instance.itemLevel, biome.recommendedLevel[1]) ||
        instance.progressionTier !== biome.progressionTier) {
        return { valid: false, reason: 'invalid_progression' };
    }
    if (!instance.status || typeof instance.status !== 'object' || Array.isArray(instance.status)) {
        return { valid: false, reason: 'invalid_stats' };
    }
    if (!Array.isArray(instance.rolls)) return { valid: false, reason: 'invalid_rolls' };
    const allowed = new Set(Object.keys(definition.allowedAttributes));
    const rarity = RARITIES.get(instance.raridade);
    const adminCustom = instance.adminCustom;
    const upgradeExtrasRaw = Array.isArray(instance.upgradeExtras) ? instance.upgradeExtras : [];
    if (Object.keys(instance.status).some(function (stat) {
        return (!allowed.has(stat) && !(PRIMARY_STATS.has(stat) &&
            (adminCustom || upgradeExtrasRaw.some(function (extra) { return extra && extra.chave === stat; })))) ||
            !Number.isFinite(instance.status[stat]) || instance.status[stat] < 0;
    })) return { valid: false, reason: 'invalid_stats' };
    const rollsByStat = new Map();
    for (const roll of instance.rolls) {
        const qualityBand = QUALITY_BANDS.find(function (band) {
            return roll && roll.rollPercent >= band.minPercent && roll.rollPercent <= band.maxPercent;
        });
        if (!roll || typeof roll.statId !== 'string' || rollsByStat.has(roll.statId) ||
            !Number.isInteger(roll.rollPercent) || roll.rollPercent < 0 || roll.rollPercent > 100 ||
            typeof roll.perfect !== 'boolean' || roll.perfect !== (roll.rollPercent === 100) ||
            !qualityBand || roll.quality !== qualityBand.id ||
            !Number.isFinite(roll.value) || !Number.isFinite(roll.min) || !Number.isFinite(roll.max) ||
            roll.min > roll.max || roll.value < roll.min || roll.value > roll.max) {
            return { valid: false, reason: 'invalid_rolls' };
        }
        const expectedValue = Math.round((roll.min + ((roll.max - roll.min) * roll.rollPercent / 100)) * 100) / 100;
        if (roll.value !== expectedValue) return { valid: false, reason: 'invalid_rolls' };
        if (allowed.has(roll.statId) &&
            (roll.min !== rarity.valueRange[0] || roll.max !== rarity.valueRange[1])) {
            return { valid: false, reason: 'invalid_rolls' };
        }
        if (!allowed.has(roll.statId) && roll.statId !== 'attack' && roll.statId !== 'defense') {
            return { valid: false, reason: 'invalid_rolls' };
        }
        rollsByStat.set(roll.statId, roll);
    }
    const rolledStats = Array.from(rollsByStat.keys()).filter(function (stat) {
        return allowed.has(stat);
    });
    if (adminCustom !== undefined &&
        (!adminCustom || typeof adminCustom !== 'object' || Array.isArray(adminCustom) ||
        typeof adminCustom.name !== 'string' || instance.nome !== adminCustom.name ||
        !adminCustom.status || typeof adminCustom.status !== 'object' || Array.isArray(adminCustom.status))) {
        return { valid: false, reason: 'invalid_admin_custom' };
    }
    const isAdminCustom = !!adminCustom;
    const baseStats = isAdminCustom ? Object.keys(adminCustom.status) : rolledStats;
    if (isAdminCustom && Object.keys(adminCustom.status).some(function (stat) {
        return !PRIMARY_STATS.has(stat) || !Number.isFinite(adminCustom.status[stat]) ||
            adminCustom.status[stat] < 0 || adminCustom.status[stat] > 500 ||
            instance.status[stat] !== adminCustom.status[stat];
    })) return { valid: false, reason: 'invalid_admin_custom' };
    if (!isAdminCustom && rolledStats.length !== Object.keys(instance.status).length) {
        return { valid: false, reason: 'invalid_affix_count' };
    }
    if ((!isAdminCustom && (baseStats.length < rarity.minAffixes || baseStats.length > rarity.maxAffixes)) ||
        (!isAdminCustom && baseStats.some(function (stat) {
            return !Object.prototype.hasOwnProperty.call(instance.status, stat) ||
                instance.status[stat] < rollsByStat.get(stat).value;
        }))) {
        return { valid: false, reason: 'invalid_affix_count' };
    }
    const upgrade = instance.upgrade === undefined ? 0 : instance.upgrade;
    if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > 20 ||
        (instance.upgradeExtras !== undefined && !Array.isArray(instance.upgradeExtras))) {
        return { valid: false, reason: 'invalid_upgrade' };
    }
    const extras = instance.upgradeExtras || [];
    const extraStats = new Set();
    let extraTotal = 0;
    for (const extra of extras) {
        if (!extra || !(allowed.has(extra.chave) || PRIMARY_STATS.has(extra.chave)) ||
            !Number.isInteger(extra.valor) ||
            extra.valor < 1 || extra.valor > 6 || extraStats.has(extra.chave)) {
            return { valid: false, reason: 'invalid_upgrade' };
        }
        extraStats.add(extra.chave);
        extraTotal += extra.valor;
    }
    const maxUpgradeGain = Array.from({ length: upgrade }, function (_, index) {
        return 1 + Math.floor(index / 5);
    }).reduce(function (sum, value) { return sum + value; }, 0);
    const maxExtraGain = [5, 10, 15].reduce(function (sum, milestone) {
        return sum + (upgrade >= milestone ? milestone / 5 : 0);
    }, 0);
    if (extraTotal > maxExtraGain || (extras.length > 0 && extras.length > Math.floor(upgrade / 5))) {
        return { valid: false, reason: 'invalid_upgrade' };
    }
    const allowedCurrentStats = new Set(baseStats);
    extras.forEach(function (extra) { allowedCurrentStats.add(extra.chave); });
    const expectedStatusCount = Object.keys(instance.status).length;
    if (Object.keys(instance.status).some(function (stat) {
        if (!allowedCurrentStats.has(stat)) return true;
        const baseValue = isAdminCustom
            ? (adminCustom.status[stat] || 0)
            : (rollsByStat.has(stat) ? rollsByStat.get(stat).value : 0);
        const maximum = baseValue + maxUpgradeGain + maxExtraGain;
        const maximumAfterReinforcement = upgrade >= 20 ? Math.ceil(maximum * 1.1) : maximum;
        return instance.status[stat] < baseValue ||
            (!isAdminCustom && instance.status[stat] > maximumAfterReinforcement) ||
            (isAdminCustom && instance.status[stat] > baseValue + maxUpgradeGain + maxExtraGain + Math.ceil(baseValue * 0.1));
    }) || expectedStatusCount !== allowedCurrentStats.size) {
        return { valid: false, reason: 'invalid_stats' };
    }
    const expectedAttackRange = definition.baseAttack
        ? obterFaixaEscalada(definition.baseAttack, definition.attackPerLevel, instance.itemLevel)
        : [0, 0];
    const expectedDefenseRange = definition.baseDefense
        ? obterFaixaEscalada(definition.baseDefense, definition.defensePerLevel, instance.itemLevel)
        : [0, 0];
    const attackRoll = rollsByStat.get('attack');
    const defenseRoll = rollsByStat.get('defense');
    if ((attackRoll && (attackRoll.min !== expectedAttackRange[0] || attackRoll.max !== expectedAttackRange[1])) ||
        (!attackRoll && expectedAttackRange[1] > 0) ||
        (defenseRoll && (defenseRoll.min !== expectedDefenseRange[0] || defenseRoll.max !== expectedDefenseRange[1])) ||
        (!defenseRoll && expectedDefenseRange[1] > 0) ||
        instance.attack !== (attackRoll ? attackRoll.value : 0) ||
        instance.defense !== (defenseRoll ? defenseRoll.value : 0)) {
        return { valid: false, reason: 'invalid_combat_values' };
    }
    if (!Number.isFinite(instance.attack) || instance.attack < 0 ||
        !Number.isFinite(instance.defense) || instance.defense < 0 ||
        !Number.isFinite(instance.itemPower) || instance.itemPower < 0) {
        return { valid: false, reason: 'invalid_combat_values' };
    }
    if (Math.abs(instance.itemPower - calcularItemPower(instance, rarity)) > 0.001 ||
        instance.isPerfect !== (instance.rolls.length > 0 && instance.rolls.every(function (roll) { return roll.perfect; })) ||
        !instance.quality || instance.quality.perfectRollCount !== instance.rolls.filter(function (roll) { return roll.perfect; }).length ||
        instance.quality.averagePercent !== (instance.rolls.length
            ? Math.round(instance.rolls.reduce(function (total, roll) { return total + roll.rollPercent; }, 0) / instance.rolls.length)
            : 0)) {
        return { valid: false, reason: 'invalid_derived_values' };
    }
    return { valid: true, definition: definition };
}

function validateEquipmentForClass(classId, instance) {
    const result = validateDefinitionAndInstance(instance);
    if (!result.valid) return result;
    if (result.definition.classRestriction && result.definition.classRestriction !== classId) {
        return { valid: false, reason: 'class_restricted' };
    }
    return { valid: true, definition: result.definition };
}

function assertUniqueInventoryOwnership(characterRecords) {
    const ownersByInstance = new Map();
    Object.keys(characterRecords || {}).forEach(function (ownerId) {
        const inventory = characterRecords[ownerId] && characterRecords[ownerId].inventario;
        if (!inventory) return;
        const items = [];
        if (inventory.slots && typeof inventory.slots === 'object') {
            Object.keys(inventory.slots).forEach(function (slot) {
                if (inventory.slots[slot]) items.push(inventory.slots[slot]);
            });
        }
        if (Array.isArray(inventory.mochila)) {
            inventory.mochila.forEach(function (item) {
                if (item && item.tipo !== 'vazio') items.push(item);
            });
        }
        items.forEach(function (item) {
            const id = item.itemInstanceId || item.uid || item.id;
            if (!id) return;
            if (ownersByInstance.has(id)) {
                throw new Error('Instância duplicada entre inventários: ' + id);
            }
            ownersByInstance.set(id, ownerId);
        });
    });
    return ownersByInstance;
}

function calcularDefesaEquipamento(classId, equippedSlots) {
    if (!classesConfig.classes[classId]) throw new Error('Classe inválida para calcular defesa.');
    if (equippedSlots !== undefined && equippedSlots !== null &&
        (typeof equippedSlots !== 'object' || Array.isArray(equippedSlots))) {
        throw new TypeError('Slots equipados inválidos.');
    }
    const totalDefense = Object.keys(equippedSlots || {}).reduce(function (total, slot) {
        const item = equippedSlots[slot];
        if (!item || item.schemaVersion !== 1) return total;
        const validation = validateEquipmentForClass(classId, item);
        if (!validation.valid) throw new Error('Item equipado inválido ao calcular defesa: ' + validation.reason);
        if (item.slot !== slot) throw new Error('Slot equipado incompatível ao calcular defesa: ' + slot);
        return total + item.defense;
    }, 0);
    return totalDefense;
}

function reduzirDanoPelaDefesaEquipamento(classId, equippedSlots, damage) {
    if (!Number.isFinite(damage)) throw new TypeError('Dano recebido inválido.');
    if (damage <= 0) return 0;
    const totalDefense = calcularDefesaEquipamento(classId, equippedSlots);
    return Math.max(1, Math.round(damage - totalDefense));
}

module.exports = Object.freeze({
    ITEM_LEVEL_CAP: ITEM_LEVEL_CAP,
    getClass: function (classId) {
        return classesConfig.classes[classId] ? copiarJson(classesConfig.classes[classId]) : null;
    },
    getBiome: function (biomeId) {
        return biomesConfig.biomes[biomeId] ? copiarJson(biomesConfig.biomes[biomeId]) : null;
    },
    getBiomeIdByName: obterIdBiomaPorNome,
    getItemLevelRange: obterFaixaNivelItem,
    getDefinition: function (definitionId) {
        const definition = obterDefinicao(definitionId);
        return definition ? copiarJson(definition) : null;
    },
    generateEquipment: generateEquipment,
    createAdminEquipment: createAdminEquipment,
    recalculateDerived: function (instance) {
        if (!instance || !RARITIES.has(instance.raridade)) {
            throw new Error('Não é possível recalcular os derivados de um item inválido.');
        }
        return atualizarItemPower(instance);
    },
    validateDefinitionAndInstance: validateDefinitionAndInstance,
    validateEquipmentForClass: validateEquipmentForClass,
    calcularDefesaEquipamento: calcularDefesaEquipamento,
    reduzirDanoPelaDefesaEquipamento: reduzirDanoPelaDefesaEquipamento,
    assertUniqueInventoryOwnership: assertUniqueInventoryOwnership
});
