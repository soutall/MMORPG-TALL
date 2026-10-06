const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('player nicknames are rendered after collision and map texture overlays', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const collisionOverlay = source.indexOf('window.desenharOverlayColisoes(ctx)');
    const mapOverlay = source.indexOf('window.desenharOverlayMapaEditor(ctx)');
    const finalNicknamePass = source.indexOf('Passagem final dos nicks');

    assert.ok(collisionOverlay >= 0);
    assert.ok(mapOverlay > collisionOverlay);
    assert.ok(finalNicknamePass > mapOverlay, 'nickname pass must run after collision and map-editor overlays');
    assert.match(source.slice(finalNicknamePass), /Object\.keys\(window\.todosJogadores \|\| \{\}\)/);
    assert.match(source.slice(finalNicknamePass), /ctx\.fillText\(jogador\.nome, posX \+ 12, posY \+ nickY\)/);
});
