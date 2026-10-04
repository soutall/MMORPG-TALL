'use strict';

const crypto = require('crypto');

const MIGRATION_VERSION = 1;
const INSTANCE_ID_PATTERN = /^item_[0-9a-f-]{36}$/i;

function listarItens(inventory) {
    const items = [];
    if (!inventory || typeof inventory !== 'object') return items;
    if (inventory.slots && typeof inventory.slots === 'object' && !Array.isArray(inventory.slots)) {
        Object.keys(inventory.slots).forEach(function (slot) {
            const item = inventory.slots[slot];
            if (item && typeof item === 'object' && item.tipo !== 'vazio') items.push(item);
        });
    }
    if (Array.isArray(inventory.mochila)) {
        inventory.mochila.forEach(function (item) {
            if (item && typeof item === 'object' && item.tipo !== 'vazio') items.push(item);
        });
    }
    return items;
}

function preflight(records) {
    const owners = new Map();
    Object.keys(records || {}).forEach(function (ownerId) {
        const items = listarItens(records[ownerId] && records[ownerId].inventario);
        items.forEach(function (item) {
            const identities = new Set([item.itemInstanceId, item.id, item.uid].filter(Boolean));
            identities.forEach(function (identity) {
                const previousOwner = owners.get(identity);
                if (previousOwner && previousOwner.item !== item) {
                    throw new Error('Migração cancelada: identificador de item duplicado nos inventários.');
                }
                owners.set(identity, { owner: ownerId, item: item });
            });
        });
    });
}

function migrateInventories(records, uuidFactory) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
        throw new TypeError('O registro de personagens precisa ser um objeto.');
    }
    preflight(records);
    const migrated = JSON.parse(JSON.stringify(records));
    const assignedIds = new Set();
    const reservedIds = new Set();
    const stats = { inventories: 0, migrated: 0, unchanged: 0, byType: {} };
    const createUuid = uuidFactory || function () { return crypto.randomUUID(); };
    Object.keys(records).forEach(function (ownerId) {
        listarItens(records[ownerId] && records[ownerId].inventario).forEach(function (item) {
            [item.itemInstanceId, item.id, item.uid].forEach(function (identity) {
                if (typeof identity === 'string') reservedIds.add(identity);
            });
        });
    });

    Object.keys(migrated).forEach(function (ownerId) {
        const inventory = migrated[ownerId] && migrated[ownerId].inventario;
        if (!inventory || typeof inventory !== 'object') return;
        stats.inventories++;
        listarItens(inventory).forEach(function (item) {
            const type = item.tipo || 'sem_tipo';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            if (item.instanceMigrationVersion === MIGRATION_VERSION) {
                if (!INSTANCE_ID_PATTERN.test(item.itemInstanceId || '') ||
                    item.id !== item.itemInstanceId || item.uid !== item.itemInstanceId) {
                    throw new Error('Migração cancelada: item já migrado com identidade inconsistente.');
                }
                if (assignedIds.has(item.itemInstanceId)) {
                    throw new Error('Migração cancelada: UUID duplicado após migração.');
                }
                assignedIds.add(item.itemInstanceId);
                stats.unchanged++;
                return;
            }

            const legacyId = item.id === undefined ? null : item.id;
            const legacyUid = item.uid === undefined ? null : item.uid;
            let newId = null;
            for (let attempt = 0; attempt < 10; attempt++) {
                const candidate = 'item_' + createUuid();
                if (INSTANCE_ID_PATTERN.test(candidate) &&
                    !assignedIds.has(candidate) && !reservedIds.has(candidate)) {
                    newId = candidate;
                    break;
                }
            }
            if (!newId) throw new Error('Migração cancelada: não foi possível gerar um UUID único.');
            assignedIds.add(newId);

            item.legacyIdentityV1 = {
                id: legacyId,
                uid: legacyUid
            };
            item.itemInstanceId = newId;
            item.id = newId;
            item.uid = newId;
            item.instanceMigrationVersion = MIGRATION_VERSION;
            stats.migrated++;
        });
    });
    return { records: migrated, stats: stats };
}

module.exports = Object.freeze({
    MIGRATION_VERSION: MIGRATION_VERSION,
    migrateInventories: migrateInventories
});
