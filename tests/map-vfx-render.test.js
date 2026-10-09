const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function criarAmbienteRender() {
    const chamadas = [];
    const rotacoes = [];
    const translacoes = [];
    const ctx = new Proxy({
        createRadialGradient() {
            chamadas.push('createRadialGradient');
            return { addColorStop() {} };
        }
    }, {
        get(alvo, chave) {
            if (chave in alvo) return alvo[chave];
            if (chave === 'rotate') return (angulo) => rotacoes.push(angulo);
            if (chave === 'translate') return (x, y) => translacoes.push([x, y]);
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
    return { window, chamadas, rotacoes, translacoes };
}

function desenharTipo(window, tipo, propriedades) {
    window.receberVfxMapa([Object.assign({
        id: 'teste-' + tipo,
        mapa: 'teste',
        tipo,
        x: 100,
        y: 120,
        escala: 1,
        intensidade: 1,
        raio: 80,
        cor: '#ff8040'
    }, propriedades || {})]);
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

test('spotlights render in each of the eight fixed directions', () => {
    const { window, rotacoes } = criarAmbienteRender();
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

    for (const direcao of directions) {
        desenharTipo(window, 'holofote', { direcao });
    }

    assert.deepEqual(rotacoes, [
        Math.PI, -Math.PI * 0.75, -Math.PI / 2, -Math.PI * 0.25,
        0, Math.PI * 0.25, Math.PI / 2, Math.PI * 0.75
    ]);
});

test('VFX are rendered only in the selected foreground or background pass', () => {
    const { window, translacoes } = criarAmbienteRender();
    window.receberVfxMapa([
        { id: 'back', mapa: 'teste', tipo: 'ondas', x: 101, y: 120, camada: 'atras', raio: 30 },
        { id: 'front', mapa: 'teste', tipo: 'ondas', x: 202, y: 120, camada: 'frente', raio: 30 }
    ]);

    window.desenharVfxMapa('atras');
    assert.deepEqual(translacoes.filter((point) => point[1] === 120), [[101, 120]]);
    translacoes.length = 0;
    window.desenharVfxMapa('frente');
    assert.deepEqual(translacoes.filter((point) => point[1] === 120), [[202, 120]]);
});

test('all VFX catalog types render without throwing', () => {
    const { window } = criarAmbienteRender();
    const source = fs.readFileSync(path.join(__dirname, '..', 'map-vfx-admin.js'), 'utf8');
    const ids = Array.from(source.matchAll(/\{ id: '([^']+)', nome:/g), (match) => match[1]);

    assert.ok(ids.length >= 40);
    for (const tipo of ids) assert.doesNotThrow(() => desenharTipo(window, tipo), tipo);
});

test('editor, server, lighting, and world renderer persist and apply spotlight direction and VFX layer', () => {
    const root = path.join(__dirname, '..');
    const admin = fs.readFileSync(path.join(root, 'map-vfx-admin.js'), 'utf8');
    const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    const lighting = fs.readFileSync(path.join(root, 'sistema_dia_noite_cliente.js'), 'utf8');
    const mapEditor = fs.readFileSync(path.join(root, 'mapa-editor.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    assert.match(admin, /DIREÇÃO DO HOLOFOTE/);
    assert.match(admin, /Na frente das texturas/);
    assert.match(admin, /direcao: document\.getElementById\('map-vfx-direcao'\)\.value/);
    assert.match(admin, /camada: document\.getElementById\('map-vfx-camada'\)\.value/);
    assert.match(server, /direcoesHolofote\.includes\(v\.direcao\) \? v\.direcao : 'n'/);
    assert.match(server, /camada: v\.camada === 'frente' \? 'frente' : 'atras'/);
    assert.match(lighting, /tVf === 'holofote'/);
    assert.match(lighting, /recortarFeixeLanterna\(\s*luzCtx,[\s\S]{0,160}feixeHolofote/);
    assert.match(mapEditor, /luz\.tipo === 'holofote'/);
    assert.match(mapEditor, /angleDiffHolofote/);
    assert.match(html, /desenharVfxMapa\('atras'\)/);
    assert.match(html, /desenharVfxMapa\('frente'\)/);
});
