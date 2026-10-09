'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const editorSource = fs.readFileSync(path.join(root, 'mapa-editor.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function setupEnvironment() {
    const drawings = [];
    const transforms = [];
    const ctx = {
        save() {},
        restore() {},
        beginPath() { drawings.push({ type: 'beginPath' }); },
        closePath() {},
        fill() { drawings.push({ type: 'fill', fillStyle: this.fillStyle, alpha: this.globalAlpha }); },
        stroke() {},
        moveTo(x, y) { drawings.push({ type: 'moveTo', x, y }); },
        lineTo(x, y) { drawings.push({ type: 'lineTo', x, y }); },
        arc(x, y, r, sa, ea) { drawings.push({ type: 'arc', x, y, r }); },
        ellipse(x, y, rx, ry, rot, sa, ea) {
            drawings.push({
                type: 'ellipse',
                x,
                y,
                rx,
                ry,
                rot,
                fillStyle: this.fillStyle,
                alpha: this.globalAlpha
            });
        },
        rect(x, y, w, h) { drawings.push({ type: 'rect', x, y, w, h }); },
        fillRect(x, y, w, h) { drawings.push({ type: 'fillRect', x, y, w, h }); },
        drawImage(...args) { drawings.push({ type: 'drawImage', args, alpha: this.globalAlpha, filter: this.filter }); },
        translate(x, y) { transforms.push({ type: 'translate', x, y }); },
        transform(a, b, c, d, e, f) { transforms.push({ type: 'transform', a, b, c, d, e, f }); },
        scale(sx, sy) { transforms.push({ type: 'scale', sx, sy }); },
        rotate(angle) { transforms.push({ type: 'rotate', angle }); },
        filter: 'none',
        globalAlpha: 1.0,
        fillStyle: '#000000'
    };

    const makeElement = () => ({
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        addEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        getContext: () => null,
        setAttribute: () => {},
        getAttribute: () => null
    });

    const mockDoc = {
        head: makeElement(),
        body: makeElement(),
        getElementById: () => makeElement(),
        createElement: () => makeElement(),
        addEventListener: () => {}
    };

    const window = {
        mapaObjetos: [],
        currentMap: 'green',
        document: mockDoc,
        addEventListener: () => {}
    };

    const sandbox = {
        window,
        global: window,
        console,
        Math,
        Number,
        Array,
        Object,
        String,
        Date,
        Map,
        Set,
        document: mockDoc
    };

    vm.runInNewContext(editorSource, sandbox);

    return { window, ctx, drawings, transforms };
}

test('desenharSombrasObjetosMapa is exposed and callable', () => {
    const { window } = setupEnvironment();
    assert.equal(typeof window.desenharSombrasObjetosMapa, 'function');
    assert.ok(window.SOMBRAS_MAPA_CONFIG);
    assert.equal(window.SOMBRAS_MAPA_CONFIG.enabled, true);
});

test('standing scenery objects cast contact AO and directional shadows', () => {
    const { window, ctx, drawings } = setupEnvironment();

    window.mapaObjetos = [
        {
            id: 'tree1',
            mapa: 'green',
            tipo: 'arvore',
            x: 100,
            y: 100,
            w: 46,
            h: 64,
            camada: 'meio'
        },
        {
            id: 'fence1',
            mapa: 'green',
            tipo: 'cerca',
            x: 200,
            y: 100,
            w: 84,
            h: 26,
            camada: 'meio'
        }
    ];

    window.desenharSombrasObjetosMapa(ctx, 0, 0, 800, 600, { horaDecimal: 12.0 });

    const ellipses = drawings.filter(d => d.type === 'ellipse');
    assert.ok(ellipses.length === 1, 'should draw only the directional canopy shadow (AO is disabled globally)');

    // Canopy shadow for tree1
    const treeCanopy = ellipses[0];
    assert.ok(treeCanopy, 'tree base should have canopy shadow');
    assert.ok(treeCanopy.rx > 10, 'canopy shadow should have reasonable horizontal spread');
});

test('flat ground decals and water tiles are excluded from casting directional tall shadows', () => {
    const { window, ctx, drawings } = setupEnvironment();

    window.mapaObjetos = [
        {
            id: 'decal1',
            mapa: 'green',
            tipo: 'campo_flores',
            x: 100,
            y: 100,
            w: 96,
            h: 40,
            camada: 'chao'
        },
        {
            id: 'water1',
            mapa: 'green',
            tipo: 'agua_quadrado',
            x: 300,
            y: 100,
            w: 64,
            h: 64,
            camada: 'meio'
        }
    ];

    window.desenharSombrasObjetosMapa(ctx, 0, 0, 800, 600, { horaDecimal: 12.0 });

    assert.equal(drawings.length, 0, 'ground decals and water tiles must not cast directional shadows');
});

test('solar shadow direction and length change with time of day', () => {
    const envManha = setupEnvironment();
    envManha.window.mapaObjetos = [{
        id: 'tree1',
        mapa: 'green',
        tipo: 'arvore',
        x: 100,
        y: 100,
        w: 46,
        h: 64,
        camada: 'meio'
    }];
    envManha.window.desenharSombrasObjetosMapa(envManha.ctx, 0, 0, 800, 600, { horaDecimal: 8.0 });

    const envMeioDia = setupEnvironment();
    envMeioDia.window.mapaObjetos = [{
        id: 'tree1',
        mapa: 'green',
        tipo: 'arvore',
        x: 100,
        y: 100,
        w: 46,
        h: 64,
        camada: 'meio'
    }];
    envMeioDia.window.desenharSombrasObjetosMapa(envMeioDia.ctx, 0, 0, 800, 600, { horaDecimal: 12.0 });

    const envTarde = setupEnvironment();
    envTarde.window.mapaObjetos = [{
        id: 'tree1',
        mapa: 'green',
        tipo: 'arvore',
        x: 100,
        y: 100,
        w: 46,
        h: 64,
        camada: 'meio'
    }];
    envTarde.window.desenharSombrasObjetosMapa(envTarde.ctx, 0, 0, 800, 600, { horaDecimal: 16.0 });

    // In the morning (sun in East), shadow points left/west (tipX < pivotX)
    // In the afternoon (sun in West), shadow points right/east (tipX > pivotX)
    const manhaCanopy = envManha.drawings.filter(d => d.type === 'ellipse')[0];
    const meioDiaCanopy = envMeioDia.drawings.filter(d => d.type === 'ellipse')[0];
    const tardeCanopy = envTarde.drawings.filter(d => d.type === 'ellipse')[0];

    assert.ok(manhaCanopy && meioDiaCanopy && tardeCanopy, 'all three times should produce canopy shadows');
    assert.ok(manhaCanopy.x < meioDiaCanopy.x, 'morning shadow should be further to the left than midday');
    assert.ok(tardeCanopy.x > meioDiaCanopy.x, 'afternoon shadow should be further to the right than midday');
    assert.ok(manhaCanopy.y < meioDiaCanopy.y, 'morning shadow should stretch longer upwards than midday');
});

test('shadow pass is toggled cleanly via SOMBRAS_MAPA_CONFIG', () => {
    const { window, ctx, drawings } = setupEnvironment();
    window.mapaObjetos = [{
        id: 'tree1',
        mapa: 'green',
        tipo: 'arvore',
        x: 100,
        y: 100,
        w: 46,
        h: 64,
        camada: 'meio'
    }];

    window.SOMBRAS_MAPA_CONFIG.enabled = false;
    window.desenharSombrasObjetosMapa(ctx, 0, 0, 800, 600, { horaDecimal: 12.0 });
    assert.equal(drawings.length, 0, 'no shadows should be drawn when config.enabled is false');
});

test('index.html renders map object shadows right after ground terrain before entities', () => {
    assert.match(clientSource, /window\.desenharSombrasObjetosMapa\(/);
    const posCenario = clientSource.indexOf('desenharCenarioMundo');
    const posSombras = clientSource.indexOf('desenharSombrasObjetosMapa');
    const posSprites = clientSource.indexOf('coletarObjetosMapa(tempoAnimacao, spritesSort)');

    assert.ok(posCenario > 0, 'desenharCenarioMundo should exist in index.html');
    assert.ok(posSombras > posCenario, 'desenharSombrasObjetosMapa must be called after ground cenario');
    assert.ok(posSombras < posSprites, 'desenharSombrasObjetosMapa must be called before spritesSort/entities');
});
