const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const editor = fs.readFileSync(path.join(__dirname, '..', 'mapa-editor.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('world biome renderer leaves only the terrain and does not create invisible prop collisions', () => {
    const window = {};
    const sandbox = { window, module: { exports: {} }, console, Map, Set, Math, Date };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'mapas', 'mapa_mundo.js'), 'utf8'), sandbox);

    const sortables = [];
    window.coletarMundoSortables(0, sortables);
    assert.equal(sortables.length, 0);

    const collisionSource = fs.readFileSync(path.join(__dirname, '..', 'mapas', 'mapa_mundo.js'), 'utf8');
    const collisionFunction = collisionSource.slice(collisionSource.indexOf('function colideMundo('), collisionSource.indexOf('function colideProjetilMundo('));
    assert.doesNotMatch(collisionFunction, /propEm\(/);
});

test('every predefined map-editor object is accepted by the server', () => {
    const paletteBody = editor.match(/var PALETA = \[([\s\S]*?)\n    \];/);
    const serverTypesBody = server.match(/const TIPOS_OBJETOS_MAPA = \[([\s\S]*?)\n\];/);
    assert.ok(paletteBody);
    assert.ok(serverTypesBody);

    const editorTypes = Array.from(paletteBody[1].matchAll(/^\s*\['([^']+)'/gm), match => match[1]);
    const serverTypes = new Set(Array.from(serverTypesBody[1].matchAll(/'([^']+)'/g), match => match[1]));
    assert.ok(editorTypes.length > 100, 'the editor should expose an expanded predefined catalog');
    assert.deepEqual(editorTypes.filter(type => !serverTypes.has(type)), []);
});

test('biome-specific object groups cover every selectable biome', () => {
    const filterBody = editor.match(/var BIOMAS_CATALOGO = \[([\s\S]*?)\n    \];/);
    assert.ok(filterBody);
    const biomes = new Set(Array.from(filterBody[1].matchAll(/\['([^']+)'/g), match => match[1]));
    const taggedRows = Array.from(editor.matchAll(/^\s*\['[^']+',[\s\S]*?\['([^']+(?:',\s*'[^']+)*)'\]\],?$/gm));
    assert.equal(biomes.size, 19);
    for (const match of taggedRows) {
        const tags = match[1].split(/',\s*'/);
        for (const tag of tags) assert.ok(biomes.has(tag), `unknown biome filter tag: ${tag}`);
    }
    assert.ok(editor.includes("if (meBiomaCatalogo !== 'todos' && def.biomas.length"));
});

test('sprite animation areas are rendered as isolated regions and validated before persistence', () => {
    assert.ok(editor.includes("ctx.clip('evenodd')"));
    assert.ok(editor.includes('recorte.x + area.x * recorte.w'));
    assert.ok(editor.includes('recorte.y + area.y * recorte.h'));
    assert.ok(editor.includes('animacaoArea: o.animacaoArea ?'));
    assert.ok(server.includes('if (spritePersonalizado && o.animacaoArea != null)'));
    assert.ok(server.includes('ax + aw > 1 || ay + ah > 1'));
});
