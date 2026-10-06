const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

test('collision editor defaults to the unified world and repairs stored curve bounds', () => {
    const document = {
        readyState: 'loading',
        getElementById: () => null,
        addEventListener: () => {}
    };
    const window = {
        MAPAS_REGISTRY: {
            mundo: { id: 'mundo', x0: 100000, y0: 0, w: 88000, h: 28000 }
        },
        document,
        addEventListener: () => {},
        innerWidth: 800,
        innerHeight: 600
    };
    const context = vm.createContext({ window, document, console, setTimeout });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'colisao-editor.js'), 'utf8'), context);

    assert.equal(window.mapaEdicaoAtivo, 'mundo');
    const curva = {
        id: 'curva-antiga',
        tipo: 'line',
        espessura: 16,
        pontos: [{ x: 100, y: 250 }, { x: 220, y: 250 }, { x: 220, y: 330 }]
    };
    window.carregarColisoesIniciais({ mundo: [curva] }, { mundo: [] });

    assert.deepEqual(
        { x: curva.x, y: curva.y, w: curva.w, h: curva.h },
        { x: 100, y: 250, w: 120, h: 80 }
    );
    assert.equal(window.colideObstaculosCustomizadosCliente('mundo', 100150, 250, 12), true);
});

test('collision editor pointer conversion follows the live zoom and 2.5D camera tilt', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'colisao-editor.js'), 'utf8');
    const match = source.match(/function telaParaLocal\(clientX, clientY\) \{[\s\S]*?\n    \}/);
    assert.ok(match, 'production screen-to-map coordinate conversion should exist');
    const global = {
        canvas: {
            width: 1600,
            height: 900,
            getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 450 })
        },
        cameraZoomAtual: 0.8,
        CAMERA_25D: true,
        CAMERA_TILT_Y: 0.88,
        camX: 1000,
        camY: 500
    };
    const context = vm.createContext({
        global,
        window: { innerWidth: 800, innerHeight: 600 },
        obterConfigMapaAtivo: () => ({ x0: 1200, y0: 300 })
    });
    const convert = vm.runInContext(`(${match[0]})`, context);

    assert.deepEqual(
        JSON.parse(JSON.stringify(convert(500, 275))),
        { lx: 800, ly: 839, wx: 2000, wy: 1139 }
    );
});

test('fast line drawing fills intermediate curve samples and includes the mouse-up endpoint', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'colisao-editor.js'), 'utf8');
    const match = source.match(/function acrescentarPontosLinha\([\s\S]*?\n    \}/);
    assert.ok(match, 'production curve interpolation helper should exist');
    const append = vm.runInNewContext(`(${match[0]})`);
    const points = [{ x: 0, y: 0 }];

    append(points, 120, 0, 12);
    append(points, 120, 120, 12);

    assert.ok(points.length >= 21, 'each long movement segment should be sampled at no more than 12 map pixels');
    assert.equal(points[points.length - 1].x, 120);
    assert.equal(points[points.length - 1].y, 120);
    assert.match(source, /function finalizarInteracao\(e\)[\s\S]*?changedTouches[\s\S]*?acrescentarPontosLinha\(de\.pontos, pos\.lx, pos\.ly, 12\)/);
});

test('long curved collisions are checked across their full bounds on both client and server', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'colisao-editor.js'), 'utf8');
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const segmentMatch = server.match(/function distPontoSegmento\([\s\S]*?\n\}/);
    const collisionMatch = server.match(/function colideObstaculosCustomizados\([\s\S]*?\n\}/);
    assert.ok(segmentMatch && collisionMatch, 'production authoritative collision code should exist');
    const dist = vm.runInNewContext(`(${segmentMatch[0]})`);
    const line = {
        tipo: 'line',
        x: 0, y: 100, w: 1200, h: 0, espessura: 16,
        pontos: [{ x: 0, y: 100 }, { x: 1200, y: 100 }]
    };
    const serverContext = vm.createContext({
        MAPAS_CONFIG: { mundo: { x0: 100000, y0: 0 } },
        colisoesPorMapa: { mundo: [line] },
        PLAYER_COLLISION_RADIUS: 0,
        distPontoSegmento: dist,
        Math
    });
    const serverCollision = vm.runInContext(`(${collisionMatch[0]})`, serverContext);
    assert.equal(serverCollision('mundo', 100900, 100, 0), true, 'server should detect collision near a distant line endpoint');
    assert.equal(serverCollision('mundo', 100900, 140, 0), false, 'server should keep points outside the line width walkable');

    const client = {
        MAPAS_REGISTRY: { mundo: { id: 'mundo', x0: 100000, y0: 0 } },
        document: { readyState: 'loading', getElementById: () => null, addEventListener: () => {} },
        addEventListener: () => {},
        innerWidth: 800,
        innerHeight: 600
    };
    const clientContext = vm.createContext({ window: client, document: client.document, console, setTimeout });
    vm.runInContext(source, clientContext);
    client.carregarColisoesIniciais({ mundo: [line] }, { mundo: [] });
    assert.equal(client.colideObstaculosCustomizadosCliente('mundo', 100900, 100, 0), true, 'client should detect the same distant line segment');
    assert.equal(client.colideObstaculosCustomizadosCliente('mundo', 100900, 140, 0), false, 'client should keep points outside the line width walkable');
});
