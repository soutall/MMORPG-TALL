const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const editor = fs.readFileSync(path.join(root, 'mapa-editor.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractFunction(source, name) {
    const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
    assert.ok(match, `expected production function ${name}`);
    return match[0];
}

function extractWindowFunction(source, name) {
    const match = source.match(new RegExp(`window\\.${name} = function \\([\\s\\S]*?\\n    \\};`));
    assert.ok(match, `expected production window function ${name}`);
    return match[0];
}

test('single-object deletion removes exactly one matching ID and treats unknown IDs as local-only cleanup', () => {
    const removeOne = vm.runInNewContext(`(${extractFunction(server, 'mapaObjetosRemoverUm')})`);
    const objects = [
        { id: 'plant-1', mapa: 'green' },
        { id: 'plant-2', mapa: 'green' },
        { id: 'plant-3', mapa: 'green' }
    ];
    assert.deepEqual(Array.from(removeOne(objects, 'plant-3'), item => item.id), ['plant-1', 'plant-2']);
    assert.equal(removeOne(objects, ''), null, 'missing IDs must not mutate map state');
    assert.equal(removeOne(objects, 'not-found'), null, 'unknown IDs must not mutate map state');
    assert.equal(objects.length, 3, 'the source array remains unchanged until the server persists the result');
    assert.match(server, /type: 'map_objeto_excluido', ok: true, id: idExcluir, removido: false/);
});

test('map cleanup requires an explicit map and preserves every other map', () => {
    const clearMap = vm.runInNewContext(`(${extractFunction(server, 'mapaObjetosLimparMapa')})`);
    const objects = [
        { id: 'green-1', mapa: 'green' },
        { id: 'desert-1', mapa: 'desert' },
        { id: 'green-2', mapa: 'green' }
    ];
    assert.deepEqual(Array.from(clearMap(objects, 'green'), item => item.id), ['desert-1']);
    assert.equal(clearMap(objects, ''), null);
    assert.match(server, /if \(!mapaLimpar \|\| !MAPAS_CONFIG\[mapaLimpar\]\)/);
    assert.doesNotMatch(server, /if \(data\.mapa\)[\s\S]{0,180}else\s*\{\s*mapObjetos = \[\]/);
});

test('save requests synchronization only and confirms server-side object counts', () => {
    const save = extractWindowFunction(editor, 'meSalvar');
    assert.match(save, /action: 'admin_map_objetos_sync', mapa: mapa, objetos: objetos/);
    assert.doesNotMatch(save, /admin_map_objetos_limpar|admin_map_objetos_excluir/);
    assert.match(server, /mapaObjetosMesclarMapa\(mapObjetos, normalizados, mapaSincronizado\)/);
    assert.match(server, /type: 'map_objetos_sync_result'/);
    assert.match(server, /Há um objeto inválido ou duplicado; nenhum objeto foi alterado/);
    assert.match(html, /dados\.type === 'map_objetos_sync_result'/);
    assert.match(html, /dados\.objetoId/);
    assert.match(html, /mapa-editor\.js\?v=29/);
    const merge = vm.runInNewContext(`(${extractFunction(server, 'mapaObjetosMesclarMapa')})`);
    const merged = merge([
        { id: 'old-world', mapa: 'mundo', x: 1 },
        { id: 'other-map', mapa: 'desert', x: 2 }
    ], [
        { id: 'old-world', mapa: 'mundo', x: 3 },
        { id: 'new-world', mapa: 'mundo', x: 4 }
    ], 'mundo');
    assert.deepEqual(Array.from(merged, object => [object.id, object.x]), [
        ['old-world', 3], ['other-map', 2], ['new-world', 4]
    ], 'save updates/creates objects while preserving objects in other maps');
});

test('newly placed and duplicated map objects are persisted immediately and report save results', () => {
    const placement = editor.slice(editor.indexOf('function colocarNoPonto('), editor.indexOf('function apagarNoPonto('));
    const collisionStroke = editor.slice(editor.indexOf('function finalizarTracoColisao('), editor.indexOf('function colocarNoPonto('));
    const duplicate = extractWindowFunction(editor, 'meDuplicar');
    const saveHandler = server.slice(server.indexOf("logDiagnosticoLaco('SAVE_NORMALIZED'"), server.indexOf('// ===== ADMIN: EDITOR DE COLISÕES'));

    assert.match(editor, /function enviarNovoObjeto\(objeto\)[\s\S]*enviar\(objeto, 'criar'\)/);
    assert.match(placement, /enviarNovoObjeto\(o\)/);
    assert.match(collisionStroke, /enviarNovoObjeto\(objeto\)/);
    assert.match(duplicate, /enviarNovoObjeto\(copia\)/);
    assert.match(saveHandler, /const mapObjetosAnteriores = mapObjetos\.map/);
    assert.match(saveHandler, /if \(!salvarMapObjetos\(\)\) \{[\s\S]*mapObjetos = mapObjetosAnteriores/);
    assert.ok(saveHandler.indexOf('salvarMapObjetos()') < saveHandler.indexOf("type: 'map_objeto_salvo', ok: true"));
    assert.match(html, /Objeto salvo automaticamente no mapa/);
    assert.match(html, /Erro ao salvar objeto:/);
});

test('automatic depth-split sprites serialize all required masks and large raster frames stay within WebSocket limits', () => {
    const send = editor.slice(editor.indexOf('function enviar(objeto, sub)'), editor.indexOf('function enviarNovoObjeto(objeto)'));
    assert.match(send, /assetCollisionMask: mascaraPoligonoValida\(o\.assetCollisionMask\)/);
    assert.match(send, /ySortAnchor: Number\.isFinite\(o\.ySortAnchor\)/);
    assert.match(send, /assetDepthSplit: divisaoSpriteValida\(o\) \? o\.assetDepthSplit/);
    assert.match(server, /const MAX_WS_PAYLOAD_BYTES = 8 \* 1024 \* 1024/);
    assert.match(server, /maxPayload: MAX_WS_PAYLOAD_BYTES/);
    assert.match(html, /GAME_VERSION = 'v1\.75\.43'/);
});

test('client waits for the authoritative server broadcast before removing the selected object', () => {
    const remove = extractWindowFunction(editor, 'meExcluir');
    assert.match(remove, /action: 'admin_map_objetos_excluir', id: id/);
    assert.doesNotMatch(remove, /window\.mapaObjetos\s*=/);
    assert.doesNotMatch(remove, /filter\(function/);
    assert.match(remove, /Objeto ainda não confirmado pelo servidor/);
    assert.match(html, /dados\.type === 'map_objeto_excluido'/);
});

test('Delete shortcut works when a non-text editor control has focus', () => {
    const helper = editor.match(/function editorCampoCapturaDelete\([\s\S]*?\n    \}/);
    assert.ok(helper, 'expected production keyboard focus helper');
    const predicate = vm.runInNewContext(`(${helper[0]})`);
    assert.equal(predicate({ tagName: 'INPUT', type: 'range' }), false);
    assert.equal(predicate({ tagName: 'INPUT', type: 'checkbox' }), false);
    assert.equal(predicate({ tagName: 'SELECT', type: 'select-one' }), false);
    assert.equal(predicate({ tagName: 'INPUT', type: 'text' }), true);
    assert.equal(predicate({ tagName: 'TEXTAREA' }), true);
    assert.equal(predicate({ tagName: 'DIV', isContentEditable: true }), true);
    assert.match(editor, /if \(!editingText && \(e\.key === 'Delete' \|\| e\.key === 'Backspace'\) && meSelId\)/);
});
