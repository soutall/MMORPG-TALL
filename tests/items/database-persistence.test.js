'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('serializes inventory migration and persists multi-character updates atomically', function () {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmorpg-item-db-'));
    try {
        fs.mkdirSync(path.join(tempDir, 'items'));
        fs.copyFileSync(path.join(__dirname, '..', '..', 'database.js'), path.join(tempDir, 'database.js'));
        fs.copyFileSync(
            path.join(__dirname, '..', '..', 'items', 'migrate-inventories.js'),
            path.join(tempDir, 'items', 'migrate-inventories.js')
        );
        const savePath = path.join(tempDir, 'jogadores.json');
        const fixture = {
            playerA: {
                classe: 'guerreiro',
                inventario: { slots: { arma: null }, mochila: [{ id: 'legacy-a', tipo: 'equipamento', status: { forca: 4 } }] }
            },
            playerB: {
                classe: 'mago',
                inventario: { slots: {}, mochila: [{ id: 'legacy-b', tipo: 'pedra', quantidade: 2 }] }
            }
        };
        fs.writeFileSync(savePath, JSON.stringify(fixture), 'utf8');
        const db = require(path.join(tempDir, 'database.js'));

        const migration = db.migrarIdentidadesItens();
        assert.deepEqual(migration, {
            inventories: 2,
            migrated: 2,
            unchanged: 0,
            byType: { equipamento: 1, pedra: 1 }
        });
        const persisted = JSON.parse(fs.readFileSync(savePath, 'utf8'));
        assert.match(persisted.playerA.inventario.mochila[0].itemInstanceId, /^item_[0-9a-f-]{36}$/i);
        assert.equal(persisted.playerA.inventario.mochila[0].status.forca, 4);
        assert.equal(persisted.playerA.inventario.mochila[0].legacyIdentityV1.id, 'legacy-a');

        const rerun = db.migrarIdentidadesItens();
        assert.equal(rerun.migrated, 0);
        assert.equal(rerun.unchanged, 2);

        assert.equal(db.salvarProgressoEmLote([
            { userId: 'playerA', dados: { inventario: persisted.playerA.inventario, ouro: 7 } },
            { userId: 'playerB', dados: { inventario: persisted.playerB.inventario, ouro: 9 } }
        ]), true);
        const updated = JSON.parse(fs.readFileSync(savePath, 'utf8'));
        assert.equal(updated.playerA.ouro, 7);
        assert.equal(updated.playerB.ouro, 9);

        const stableContents = fs.readFileSync(savePath, 'utf8');
        fs.writeFileSync(path.join(tempDir, 'jogadores.json.lock'), '{"pid":-1}', 'utf8');
        assert.throws(function () {
            db.salvarProgressoEmLote([
                { userId: 'playerA', dados: { ouro: 99 } },
                { userId: 'playerB', dados: { ouro: 100 } }
            ]);
        }, /Banco de dados ocupado/);
        assert.equal(fs.readFileSync(savePath, 'utf8'), stableContents);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
