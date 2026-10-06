const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');
const objects = JSON.parse(fs.readFileSync(path.join(projectRoot, 'map_objetos.json'), 'utf8'));
const villageAssetsDirectory = path.join(projectRoot, 'sprites', 'Objetos', 'editor');

test('reverted central village leaves existing map objects and editor assets intact', () => {
    const uniqueIds = new Set(objects.map(object => object.id));
    assert.equal(uniqueIds.size, objects.length, 'map object ids must remain unique');
    assert.equal(objects.length, 93, 'all preexisting map objects must be preserved');
    assert.equal(objects.filter(object => object.id.startsWith('cidade_central_')).length, 0);
    assert.equal(
        fs.readdirSync(villageAssetsDirectory).filter(name => /^Vila_Central_cidade_central_[a-z0-9_]+\.png$/.test(name)).length,
        0,
        'all PNGs extracted for the reverted village must be removed'
    );
});
