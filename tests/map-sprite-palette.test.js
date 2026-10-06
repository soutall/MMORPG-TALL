const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const editor = fs.readFileSync(path.join(root, 'mapa-editor.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('map editor wires atlas-region editing to a persistent virtual sprite palette', () => {
    assert.match(editor, /me-recorte-preview/);
    assert.match(editor, /window\.meSetCropField\s*=/);
    assert.match(editor, /window\.meAdicionarSpritePaleta\s*=/);
    assert.match(editor, /admin_map_sprite_palette_save/);
    assert.match(editor, /window\.receberSpritePalette\s*=/);
    assert.match(server, /data\.action === 'admin_map_sprite_palette_get'/);
    assert.match(server, /data\.action === 'admin_map_sprite_palette_save'/);
    assert.match(server, /x \+ w > spriteInfo\.width \|\| y \+ h > spriteInfo\.height/);
    assert.match(server, /map_sprite_palette\.json/);
    assert.match(server, /'map_sprite_palette\.json'/);
    assert.match(html, /dados\.type === 'map_sprite_palette_saved'/);
    assert.match(html, /dados\.type === 'map_sprite_palette'/);
});

test('palette placement persists independent editable instances and supports editor shortcuts', () => {
    for (const field of ['spriteId', 'assetRect', 'escalaX', 'escalaY', 'rotacao', 'ordem', 'categoria']) {
        assert.ok(editor.includes(field + ':'), `editor instance should include ${field}`);
        assert.ok(server.includes(field + ':'), `server should normalize ${field}`);
    }
    assert.match(editor, /stampPlacementArmed = true/);
    assert.match(editor, /meDuplicar/);
    assert.match(editor, /meExcluirSel/);
    assert.match(editor, /window\.meRotateSelected\s*=/);
    assert.match(editor, /window\.meSetSelScaleAxis\s*=/);
    assert.match(editor, /window\.meSetSelOrder\s*=/);
    assert.match(editor, /window\.meToggleSnap\s*=/);
    for (const layer of ['ground', 'decoration_behind', 'objects', 'decoration_front', 'buildings', 'foreground']) {
        assert.ok(editor.includes(layer), `editor should support the ${layer} render layer`);
        assert.ok(server.includes(layer), `server should persist the ${layer} render layer`);
    }
    assert.match(editor, /deltaX \* Math\.cos\(radians\) - deltaY \* Math\.sin\(radians\)/);
    assert.match(server, /o\.escalaX \|\| 1/);
    assert.match(server, /o\.escalaY \|\| 1/);
    assert.match(server, /deltaX \* Math\.cos\(radians\) - deltaY \* Math\.sin\(radians\)/);
});

test('mouse coordinates use the displayed canvas bounds and atlas preview keeps its image aspect ratio', () => {
    assert.match(editor, /var rect = cv\.getBoundingClientRect\(\)/);
    assert.match(editor, /cx - rect\.left/);
    assert.match(editor, /cy - rect\.top/);
    assert.doesNotMatch(editor, /var iw = window\.innerWidth \|\| 1, ih = window\.innerHeight \|\| 1/);
    assert.match(editor, /width:min\(100%,900px,calc\(\(100vh - 360px\)\*1\.5\)\)!important;height:auto!important;max-height:none!important/);
    assert.match(editor, /width="900" height="600"/);
    assert.match(editor, /width:min\(1080px,calc\(100vw - 20px\)\);height:min\(960px,calc\(100vh - 16px\)\)/);
});

test('magnetic lasso stores a bounded virtual alpha-edge mask and clips palette and placed sprites', () => {
    assert.match(editor, /window\.meSetCropMode\s*=/);
    assert.match(editor, /me-crop-mode-lasso/);
    assert.match(editor, /getImageData\(left, top, right - left \+ 1, bottom - top \+ 1\)/);
    assert.match(editor, /function meCroparMascara/);
    assert.match(editor, /assetMaskValida\(o\.assetMask\)/);
    assert.match(editor, /assetMask: assetMaskValida\(brush\.assetMask\)/);
    assert.match(editor, /paletteItem\.mask/);
    assert.match(editor, /window\.meLimparMascaraSprite\s*=/);
    assert.match(server, /item\.mask == null \? null : item\.mask/);
    assert.match(server, /mask: mask \? mask\.map/);
    assert.match(server, /item\.maskRaster == null \? null : item\.maskRaster/);
    assert.match(server, /maskRaster: maskRaster \|\| undefined/);
    assert.match(server, /o\.assetMask != null/);
    assert.match(server, /o\.assetMaskRaster != null/);
    assert.match(server, /assetMaskRaster: assetMaskRaster/);
    assert.match(server, /assetMask: assetMask/);
});

test('Laço 2 selects the clicked connected opaque component while preserving the manual lasso', () => {
    assert.match(editor, /me-crop-mode-lasso2/);
    assert.match(editor, /Laço 2 — clique automático/);
    assert.match(editor, /mode === 'auto'/);
    assert.match(editor, /function meLacoAutomatico/);
    assert.match(editor, /visited\[next\] \|\| alpha\[next\] < alphaThreshold/);
    assert.match(editor, /meAplicarRecorteMascara\(target, crop\)/);
    assert.match(editor, /A seleção automática ficou grande demais/);
    assert.match(editor, /assetCropMode === 'lasso'/);
    assert.match(editor, /function meSalvarSpritePaletteItems/);
    assert.match(editor, /target\.assetMaskMode === 'auto' \? 'Laço 2: '/);
    assert.match(editor, /paletteItem\.maskMode = target\.assetMaskMode/);
    assert.match(editor, /paletteItem\.mask = null/);
    assert.match(editor, /function meCriarMascaraRaster\(visited, atlasWidth, region\)/);
    assert.match(editor, /assetMaskRaster: brush\.assetMaskRaster/);
    assert.match(editor, /paletteItem\.maskRaster = crop\.raster \|\| undefined/);
    assert.match(editor, /assetMaskRaster: o\.assetMaskRaster \|\| undefined/);
    assert.match(server, /function rasterMascaraValida\(mask, region\)/);
    assert.match(server, /assetMaskMode: \(assetMask \|\| assetMaskRaster\)/);
    assert.match(editor, /Laço removido\. O recorte retangular atual foi mantido\./);
});

test('manual lasso can be applied to sprite collision and Y depth from the selected-object panel', () => {
    assert.match(editor, /id="me-sel-lasso-tools"/);
    assert.match(editor, /mePosicionarRecorteSprite\(tab\)/);
    assert.match(editor, /window\.meAplicarLacoColisao\s*=/);
    assert.match(editor, /window\.meAplicarLacoCamadaY\s*=/);
    assert.match(editor, /meSel\.assetMaskMode !== 'manual'/);
    assert.match(editor, /assetCollisionMask = meSel\.assetMask\.map/);
    assert.match(editor, /meSel\.ySortAnchor = ancoraYDoLaco\(meSel\.assetMask\)/);
    assert.match(server, /assetCollisionMask: assetCollisionMask/);
    assert.match(editor, /obj\.y \+ dims\(obj\)\.H \* \(Number\.isFinite\(obj\.ySortAnchor\)/);
    assert.match(editor, /function pontoNaMascaraColisao/);
    assert.match(editor, /pontoNaMascaraColisao\(o, x, y, r\)/);
    assert.match(editor, /o\.assetCollisionMask\.forEach/);
    assert.match(server, /function mascaraPoligonoObjetoValida/);
    assert.match(server, /function colideMascaraSpriteObjeto/);
    assert.match(server, /assetCollisionMask: assetCollisionMask/);
    assert.match(server, /ySortAnchor: ySortAnchor/);
    assert.match(server, /o\.ySortAnchor != null/);
});

test('lasso sprites split at the selected height, sort both halves, and collide only below the split', () => {
    for (const functionName of ['assetMaskValida', 'mascaraPoligonoValida', 'areaMascaraPoligono', 'mascaraInferiorDoLaco']) {
        assert.match(editor, new RegExp(`function ${functionName}\\(`));
    }
    assert.match(editor, /atualizarDivisaoAutomaticaSprite\(o, 0\.5\)/);
    assert.match(editor, /pintarObjeto\(obj, global\.ctx, t \|\| 0, null, 'superior'\)/);
    assert.match(editor, /pintarObjeto\(obj, global\.ctx, t \|\| 0, null, 'inferior'\)/);
    assert.match(editor, /if \(!divisaoSpriteValida\(objeto\)\) pintarObjeto/);
    assert.match(editor, /me-sel-depth-split/);
    assert.match(editor, /assetDepthSplit: divisaoSpriteValida\(o\) \? o\.assetDepthSplit : undefined/);
    assert.match(server, /assetDepthSplit: assetDepthSplit/);
    assert.match(server, /!assetMask \|\| !assetCollisionMask \|\| ySortAnchor !== split/);

    const functions = ['assetMaskValida', 'mascaraPoligonoValida', 'areaMascaraPoligono', 'mascaraInferiorDoLaco']
        .map(name => editor.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n    \\}`))[0])
        .join('\n');
    const clipLower = vm.runInNewContext(`(() => { ${functions}; return mascaraInferiorDoLaco; })()`);
    const polygon = clipLower([
        { x: 0.2, y: 0 },
        { x: 0.8, y: 0 },
        { x: 0.9, y: 1 },
        { x: 0.1, y: 1 }
    ], 0.5);
    assert.ok(polygon);
    assert.ok(polygon.every(point => point.y >= 0.5), 'the collision polygon must exclude the upper sprite half');
    assert.ok(polygon.some(point => Math.abs(point.x - 0.15) < 1e-9 && point.y === 0.5));
    assert.ok(polygon.some(point => Math.abs(point.x - 0.85) < 1e-9 && point.y === 0.5));
    assert.equal(clipLower([{ x: 0.2, y: 0.1 }, { x: 0.8, y: 0.1 }, { x: 0.5, y: 0.4 }], 0.5), null,
        'a split with no selected pixels below it must not create a fake collision');
});

test('lasso-derived collision uses the polygon interior and excludes concave cutouts', () => {
    const match = editor.match(/function mascaraPoligonoContem\([\s\S]*?\n    \}/);
    assert.ok(match, 'production normalized polygon helper should exist');
    const contains = vm.runInNewContext(`(${match[0]})`);
    const concave = [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.35 },
        { x: 0.35, y: 0.35 }, { x: 0.35, y: 1 }, { x: 0, y: 1 }
    ];
    assert.equal(contains(concave, 0.15, 0.8), true, 'inside the lower-left polygon area should collide');
    assert.equal(contains(concave, 0.8, 0.8), false, 'the concave cutout should stay walkable');
    assert.equal(contains(concave, 0.8, 0.2), true, 'inside the upper polygon area should collide');
});

test('lasso collision respects object scale, rotation, and player radius', () => {
    const dimsMatch = editor.match(/function dims\(o\) \{[\s\S]*?\n    \}/);
    const containsMatch = editor.match(/function mascaraPoligonoContem\([\s\S]*?\n    \}/);
    const collisionMatch = editor.match(/function pontoNaMascaraColisao\([\s\S]*?\n    \}/);
    assert.ok(dimsMatch && containsMatch && collisionMatch, 'production mask collision helpers should exist');
    const dims = vm.runInNewContext(`(${dimsMatch[0]})`);
    const contains = vm.runInNewContext(`(${containsMatch[0]})`);
    const collision = vm.runInNewContext(`(${collisionMatch[0]})`, { dims, mascaraPoligonoContem: contains });
    const object = {
        x: 100, y: 200, w: 100, h: 60, escala: 1.5, escalaX: 1, escalaY: 1,
        rotacao: 90,
        assetCollisionMask: [
            { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 },
            { x: 0.75, y: 0.75 }, { x: 0.25, y: 0.75 }
        ]
    };
    assert.equal(collision(object, 175, 245, 0), true, 'center of the rotated mask should collide');
    assert.equal(collision(object, 130, 245, 0), false, 'point outside the rotated mask should remain walkable');
    assert.equal(collision(object, 202, 245, 8), true, 'player radius should extend collision at the mask boundary');
});

test('server collision uses the same lasso polygon for authoritative movement checks', () => {
    const segmentMatch = server.match(/function distPontoSegmento\([\s\S]*?\n\}/);
    const containsMatch = server.match(/function pontoDentroMascaraObjeto\([\s\S]*?\n\}/);
    const collisionMatch = server.match(/function colideMascaraSpriteObjeto\([\s\S]*?\n\}/);
    assert.ok(segmentMatch && containsMatch && collisionMatch, 'server-side polygon collision helpers should exist');
    const dist = vm.runInNewContext(`(${segmentMatch[0]})`);
    const contains = vm.runInNewContext(`(${containsMatch[0]})`);
    const collision = vm.runInNewContext(`(${collisionMatch[0]})`, {
        distPontoSegmento: dist,
        pontoDentroMascaraObjeto: contains
    });
    const object = {
        x: 100, y: 200, w: 100, h: 60, escala: 1.5, escalaX: 1, escalaY: 1,
        rotacao: 90,
        assetCollisionMask: [
            { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 },
            { x: 0.75, y: 0.75 }, { x: 0.25, y: 0.75 }
        ]
    };
    assert.equal(collision(object, 175, 245, 0), true);
    assert.equal(collision(object, 130, 245, 0), false);
    assert.equal(collision(object, 202, 245, 8), true);
});

test('sprite transform controls appear above the biome catalog selector', () => {
    const settings = editor.indexOf('id="me-brush-settings"');
    const biomeCatalog = editor.indexOf('Conjunto do bioma');
    assert.ok(settings >= 0 && biomeCatalog > settings, 'transform settings should precede the biome catalog');
    for (const control of ['me-escala', 'me-brush-scale-x', 'me-brush-scale-y', 'me-brush-rotation', 'me-colisao', 'me-efeito']) {
        assert.ok(editor.indexOf(`id="${control}"`) > settings && editor.indexOf(`id="${control}"`) < biomeCatalog,
            `${control} should be in the settings block above the biome catalog`);
    }
    assert.ok(editor.indexOf("animacoesSelectHtml('me-animacao'") > settings &&
        editor.indexOf("animacoesSelectHtml('me-animacao'") < biomeCatalog, 'sprite animation selector should precede the biome catalog');
    assert.match(editor, /function mePosicionarPainelSelecao\(tab\)/);
    assert.match(editor, /biomeRow\.parentNode\.insertBefore\(panel, biomeRow\)/);
    assert.match(editor, /activePanel\.parentNode\.insertBefore\(panel, activePanel\.nextSibling\)/);
});

test('refreshing selected-object properties does not redirect atlas cropping to a placed sprite', () => {
    const propertiesStart = editor.indexOf('function meAtualizarPropsUI()');
    const propertiesEnd = editor.indexOf('window.desenharObjetosFrente', propertiesStart);
    const properties = editor.slice(propertiesStart, propertiesEnd);
    assert.match(editor, /function meDefinirAlvoRecorteSelecao\(sel\)/);
    assert.match(editor, /meDefinirAlvoRecorteSelecao\(alvo\)/);
    assert.match(editor, /meDefinirAlvoRecorteSelecao\(selected\)/);
    assert.doesNotMatch(properties, /assetCropTarget = 'selection'/,
        'property refreshes must not override the target explicitly chosen for a new atlas sprite');
    assert.match(editor, /assetCropTarget === 'selection' && meSel === target/);
});

test('WASD movement is not blocked while the map editor is open', () => {
    const movementGuard = html.match(/if \(!window\.transicaoMapaAtiva[\s\S]{0,700}\) \{\s*let entradaMoveX = controleInvertido \? -moveX : moveX;/);
    assert.ok(movementGuard, 'movement loop condition should still guard gameplay movement');
    assert.doesNotMatch(movementGuard[0], /mapaEditorAtivo/,
        'opening the map editor must not suppress normal character movement');
    assert.match(html, /if \(code in teclasMovimento\) \{\s*teclasMovimento\[code\] = true;\s*atualizarMovimentoTeclado\(\);/);
});

test('masked sprites show and place only the lasso contour without rectangular overlays', () => {
    assert.match(editor, /assetRectValido\(recorte, imagem\) && !assetMaskValida\(target\.assetMask\)/);
    assert.match(editor, /if \(!assetMaskValida\(brush\.assetMask\)\) \{\s*ctx\.fillStyle = 'rgba\(0,229,255,0\.06\)'/);
    assert.match(editor, /if \(sel\.tipo === 'sprite_personalizado' && assetMaskValida\(sel\.assetMask\)\) \{\s*ctx\.beginPath\(\);\s*sel\.assetMask\.forEach/);
    assert.match(editor, /var imagemComMascara = obterSpriteComMascara\(o, sourceImage\)/);
});

test('masked atlas sprites are raster-clipped in memory before rendering to prevent atlas bleed', () => {
    assert.match(editor, /function obterSpriteComMascara\(o, imagem\)/);
    assert.match(editor, /context\.drawImage\(imagem, region\.x, region\.y, region\.w, region\.h, 0, 0, width, height\)/);
    assert.match(editor, /limparPixelsForaMascara\(imageData, width, height, rasterMask\)/);
    assert.match(editor, /imageData\.data\[colorIndex \+ 3\] = 0/);
    assert.match(editor, /context\.globalCompositeOperation = 'destination-in';\s*context\.drawImage\(maskCanvas, 0, 0\)/);
    assert.match(editor, /var imagemComMascara = obterSpriteComMascara\(o, sourceImage\)/);
    assert.match(editor, /objetoDesenho = Object\.assign\(\{\}, o, \{ assetRect: null, assetMask: null, assetMaskRaster: null \}\)/);
    assert.match(editor, /animarSpritePersonalizado\(objetoDesenho, ctx, imagemSprite, medidasSprite, t\)/);
    assert.match(editor, /var assetMaskSourceIds = new WeakMap\(\)/);
    assert.match(editor, /var ASSET_MASKED_SPRITES_MAX_BYTES = 32 \* 1024 \* 1024/);
    assert.match(editor, /assetMaskedSpritesBytes \+ cachedBytes > ASSET_MASKED_SPRITES_MAX_BYTES/);
    assert.match(editor, /assetMaskedSprites\.set\(key, \{ canvas: canvas, bytes: cachedBytes \}\)/);
    assert.match(editor, /Number\(imagem\.naturalWidth \|\| imagem\.width\)/);
    assert.match(editor, /Number\(imagem\.naturalHeight \|\| imagem\.height\)/);
    assert.match(editor, /mascaraAutomaticaAusente\(o, sourceRegion\)/);
    assert.match(editor, /mascaraAutomaticaAusente\(\{\s*id: paletteItem\.id, assetMaskMode: paletteItem\.maskMode/);
    assert.match(server, /mask\.w \* mask\.h > 2000000/);
    assert.match(editor, /mask\.w \* mask\.h > 2000000/);
    assert.match(editor, /var maskedCanvas = obterSpriteComMascara\(\{/);
    assert.match(editor, /pintarObjeto\(ghost, ctx, Date\.now\(\) \/ 1000, 0\.45\)/);
});

test('masked sprite cache keeps more than eight entries within a 32 MiB LRU budget', () => {
    const match = editor.match(/function guardarSpriteMascaradaNoCache\([\s\S]*?\n    \}/);
    assert.ok(match, 'production weighted mask cache helper should exist');
    const cache = new Map();
    const context = vm.createContext({
        assetMaskedSprites: cache,
        assetMaskedSpritesBytes: 0,
        ASSET_MASKED_SPRITES_MAX_BYTES: 32 * 1024 * 1024
    });
    const store = vm.runInContext(`(${match[0]})`, context);
    for (let i = 0; i < 8; i++) store(`small-${i}`, { width: 16, height: 16 });
    assert.equal(cache.size, 8);
    for (let i = 0; i < 10; i++) store(`sprite-${i}`, { width: 512, height: 512 });
    assert.equal(cache.size, 18, 'entries below the byte budget must not be evicted at an eight-item threshold');
    assert.equal(context.assetMaskedSpritesBytes, (8 * 16 * 16 + 10 * 512 * 512) * 4);
    for (let i = 10; i < 32; i++) store(`sprite-${i}`, { width: 512, height: 512 });
    assert.equal(context.assetMaskedSpritesBytes, 32 * 1024 * 1024);
    assert.equal(cache.has('small-0'), false, 'least recently used small textures should be evicted to stay within budget');
    assert.equal(cache.has('sprite-31'), true);
    store('oversized', { width: 4096, height: 4096 });
    assert.equal(cache.size, 1, 'a single texture larger than the budget must remain cached rather than rebuild every frame');
    assert.equal(context.assetMaskedSpritesBytes, 4096 * 4096 * 4);
});

test('raster lasso preserves selected RGBA and zeros every pixel outside the irregular mask', () => {
    const match = editor.match(/function limparPixelsForaMascara\([\s\S]*?\n    \}/);
    assert.ok(match, 'production RGBA mask application helper should exist');
    const applyMask = vm.runInNewContext(`(${match[0]})`, { atob });
    const fixtures = [
        { name: 'two nearby trees', w: 6, h: 3, selected: [0, 1, 6, 7, 8, 12, 13], neighbor: [4, 5, 10, 11, 16, 17] },
        { name: 'nearby stones', w: 5, h: 4, selected: [2, 6, 7, 8, 11, 12], neighbor: [4, 9, 14, 19] },
        { name: 'neighbor inside the selection bounding box', w: 7, h: 5, selected: [1, 2, 8, 9, 15, 22, 23], neighbor: [5, 12, 19, 26, 33] },
        { name: 'irregular silhouette', w: 5, h: 5, selected: [2, 6, 7, 8, 11, 12, 13, 17], neighbor: [0, 4, 20, 24] },
        { name: 'thin branches', w: 5, h: 5, selected: [1, 6, 11, 16, 21], neighbor: [3, 8, 13, 18, 23] },
        { name: 'almost touching silhouettes', w: 5, h: 3, selected: [0, 1, 2, 5, 6], neighbor: [3, 4, 8, 9, 14] },
        {
            name: 'same-size raster indexing avoids float rounding at row and column boundaries',
            w: 105,
            h: 180,
            selected: [2 * 105 + 56, 48 * 105, 103 * 105 + 97, 114 * 105 + 9],
            neighbor: [2 * 105 + 57, 49 * 105, 104 * 105 + 97, 115 * 105 + 9]
        }
    ];
    for (const fixture of fixtures) {
        const pixelCount = fixture.w * fixture.h;
        const packed = Buffer.alloc(Math.ceil(pixelCount / 8));
        for (const pixel of fixture.selected) packed[pixel >> 3] |= 1 << (pixel & 7);
        for (const pixel of fixture.neighbor) {
            assert.ok(!fixture.selected.includes(pixel), `${fixture.name}: neighbor fixtures must be outside the selection`);
        }
        const source = new Uint8ClampedArray(pixelCount * 4);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            source.set([80 + pixel, 110 + pixel, 140 + pixel, pixel === 4 ? 128 : 255], pixel * 4);
        }
        const imageData = { data: new Uint8ClampedArray(source) };
        applyMask(imageData, fixture.w, fixture.h, {
            w: fixture.w, h: fixture.h, data: packed.toString('base64')
        });
        const selectedIndices = new Set(fixture.selected);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            const actual = Array.from(imageData.data.slice(pixel * 4, pixel * 4 + 4));
            if (selectedIndices.has(pixel)) {
                assert.deepEqual(actual, Array.from(source.slice(pixel * 4, pixel * 4 + 4)),
                    `${fixture.name}: selected pixel ${pixel} must preserve source RGBA`);
            } else {
                assert.deepEqual(actual, [0, 0, 0, 0],
                    `${fixture.name}: external/neighbor pixel ${pixel} must have zero alpha`);
            }
        }
    }
});

test('automatic lasso never falls back to its simplified polygon when the exact raster mask is missing', () => {
    assert.match(editor, /if \(mascaraAutomaticaAusente\(o, region\)\) return null/);
    assert.match(editor, /if \(mascaraAutomaticaAusente\(o, sourceRegion\)\) return/);
    assert.match(editor, /if \(mascaraAutomaticaAusente\(\{[\s\S]*?assetMaskMode: paletteItem\.maskMode[\s\S]*?\}, rect\)\) return/);
    assert.match(editor, /Laço 2 sem máscara raster válida; sprite ocultada para impedir vazamento do atlas/);
    assert.match(server, /\(maskMode === 'auto' && maskRaster === null\)/);
    assert.match(server, /o\.assetMaskMode === 'auto' && !assetMaskRaster/);
});

test('lasso diagnostics trace selected pixels through the live map renderer and export its exact canvas', () => {
    for (const stage of ['SELECTION', 'MASKED_TEXTURE', 'PLACEMENT', 'SERIALIZATION', 'LOAD_CLIENT', 'FINAL_RENDER']) {
        assert.match(editor, new RegExp("lassoDiagnostico\\('" + stage + "'"));
    }
    for (const stage of ['SAVE_RECEIVED', 'SAVE_NORMALIZED', 'SAVE_DISK', 'LOAD_DISK', 'LOAD_WS', 'LOAD_BROADCAST']) {
        assert.match(server, new RegExp("logDiagnosticoLaco\\('" + stage + "'"));
    }
    assert.match(editor, /window\.meDiagnosticarLaco\s*=/);
    assert.match(editor, /window\.meExportarTexturaLaco\s*=/);
    assert.match(editor, /return texture\.toDataURL\('image\/png'\)/);
    assert.match(editor, /rendererTexture: imagemComMascara \? 'masked-canvas' : o\.asset/);
});

test('local ID login is opt-in, loopback-only, existing-character-only, and preserves Google auth', () => {
    assert.match(server, /process\.env\.NODE_ENV !== 'production' && process\.env\.LOCAL_ID_LOGIN_ENABLED === '1'/);
    assert.match(server, /LOCAL_ID_LOGIN_ENABLED \? '127\.0\.0\.1' : '0\.0\.0\.0'/);
    assert.match(server, /\['127\.0\.0\.1', '::1'\]\.includes\(remoteAddress\)/);
    assert.match(server, /const localRecord = carregarProgresso\(requestedId\)/);
    assert.match(server, /if \(data\.action === 'google_login'\)/);
    assert.match(html, /get\('local-id-login'\) === '1'/);
    assert.match(html, /window\.location\.hostname === 'localhost'/);
    assert.match(html, /googleBox\.style\.display = 'none'/);
    assert.match(html, /action: 'login', id: credential\.localId/);
});
