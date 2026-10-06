const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function criarAmbienteRender() {
    const chamadas = [];
    const ctx = new Proxy({
        createRadialGradient() {
            chamadas.push('createRadialGradient');
            return { addColorStop() {} };
        }
    }, {
        get(alvo, chave) {
            if (chave in alvo) return alvo[chave];
            return function () { chamadas.push(chave); };
        },
        set(alvo, chave, valor) {
            alvo[chave] = valor;
            return true;
        }
    });
    const document = { getElementById: () => null };
    const window = {
        ctx,
        ehAdmin: true,
        currentMap: 'teste',
        vfxMapa: [],
        document
    };
    const contexto = vm.createContext({ window, document, console, Date, Math });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'map-vfx-admin.js'), 'utf8'), contexto);
    return { window, chamadas };
}

function desenharTipo(window, tipo) {
    window.receberVfxMapa([{
        id: 'teste-' + tipo,
        mapa: 'teste',
        tipo,
        x: 100,
        y: 120,
        escala: 1,
        intensidade: 1,
        raio: 80,
        cor: '#ff8040'
    }]);
    window.desenharVfxMapa();
}

test('fire renders shaped animated flames instead of circular particles', () => {
    const { window, chamadas } = criarAmbienteRender();

    desenharTipo(window, 'fogo');

    assert.ok(chamadas.filter((nome) => nome === 'bezierCurveTo').length >= 4);
    assert.ok(chamadas.includes('createRadialGradient'));
});

test('falling leaves and petals use distinct curved silhouettes', () => {
    const { window, chamadas } = criarAmbienteRender();

    desenharTipo(window, 'folhas');
    assert.ok(chamadas.filter((nome) => nome === 'quadraticCurveTo').length > 0);
    assert.ok(chamadas.filter((nome) => nome === 'stroke').length > 0);

    chamadas.length = 0;
    desenharTipo(window, 'petalas-caindo');
    assert.ok(chamadas.filter((nome) => nome === 'bezierCurveTo').length > 0);
});

test('all VFX catalog types render without throwing', () => {
    const { window } = criarAmbienteRender();
    const source = fs.readFileSync(path.join(__dirname, '..', 'map-vfx-admin.js'), 'utf8');
    const ids = Array.from(source.matchAll(/\{ id: '([^']+)', nome:/g), (match) => match[1]);

    assert.ok(ids.length >= 35);
    for (const tipo of ids) assert.doesNotThrow(() => desenharTipo(window, tipo), tipo);
});
