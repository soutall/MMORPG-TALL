'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');

function createContext() {
    const stack = [];
    return {
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        draws: [],
        save() {
            stack.push([this.globalAlpha, this.globalCompositeOperation]);
        },
        restore() {
            const previous = stack.pop();
            if (previous) {
                this.globalAlpha = previous[0];
                this.globalCompositeOperation = previous[1];
            }
        },
        translate() {},
        scale() {},
        fillRect() {},
        createRadialGradient() {
            this.gradients = this.gradients || [];
            const stops = [];
            this.gradients.push(stops);
            return { addColorStop(offset, color) { stops.push([offset, color]); } };
        },
        drawImage(...args) {
            this.draws.push({
                image: args[0],
                x: args[1],
                y: args[2],
                width: args[3],
                height: args[4],
                alpha: this.globalAlpha,
                composite: this.globalCompositeOperation
            });
        }
    };
}

function loadCloudShadows() {
    let canvasCreations = 0;
    const maskContexts = [];
    const window = {
        document: {
            createElement(name) {
                assert.equal(name, 'canvas');
                canvasCreations++;
                return {
                    width: 0,
                    height: 0,
                    getContext(type) {
                        assert.equal(type, '2d');
                        const ctx = createContext();
                        maskContexts.push(ctx);
                        return ctx;
                    }
                };
            }
        }
    };
    const source = fs.readFileSync(path.join(root, 'cloud-shadows.js'), 'utf8');
    vm.runInNewContext(source, { window, Math, Number, Object });
    return {
        api: window.CloudShadows,
        getCanvasCreations: () => canvasCreations,
        maskContexts: maskContexts
    };
}

test('cloud shadows use a cached organic mask that drifts through world coordinates', () => {
    const { api, getCanvasCreations, maskContexts } = loadCloudShadows();
    const ctx = createContext();
    const bounds = { minX: 1000, minY: 2000, maxX: 1700, maxY: 2600 };

    const firstDrawCount = api.render(ctx, bounds, 0, { horaDecimal: 12 });
    const firstFrame = ctx.draws.slice();
    const firstAlpha = firstFrame[0].alpha;
    ctx.draws.length = 0;
    api.render(ctx, bounds, 10, { horaDecimal: 12 });
    const movedFrame = ctx.draws.slice();

    assert.ok(firstDrawCount > 0);
    assert.equal(movedFrame.length, firstDrawCount);
    assert.notEqual(firstFrame[0].x, movedFrame[0].x, 'cloud texture should advance with elapsed time');
    assert.ok(firstAlpha > 0.6, 'cloud shading should be strong enough to read in-game');
    assert.ok(
        maskContexts[0].gradients.some(stops => stops.some(([, color]) => color.includes('0.62'))),
        'cached cloud lobes should have a visible soft core'
    );
    assert.ok(movedFrame.every(draw => draw.composite === 'source-over'));
    assert.equal(getCanvasCreations(), 1, 'the procedural cloud mask is created only once');

    ctx.draws.length = 0;
    api.render(ctx, { minX: 3000, minY: 2000, maxX: 3700, maxY: 2600 }, 10, { horaDecimal: 12 });
    assert.equal(ctx.draws.length, firstDrawCount, 'camera movement should reveal the same world-space texture');
});

test('cloud density follows daylight smoothly and disabling restores normal rendering', () => {
    const { api } = loadCloudShadows();
    const ctx = createContext();
    const bounds = { minX: 0, minY: 0, maxX: 900, maxY: 700 };

    api.render(ctx, bounds, 1, { horaDecimal: 12 });
    const middayAlpha = ctx.draws[0].alpha;
    ctx.draws.length = 0;
    api.render(ctx, bounds, 1, { horaDecimal: 0 });
    const midnightAlpha = ctx.draws[0].alpha;
    ctx.draws.length = 0;
    api.render(ctx, bounds, 1, { horaDecimal: 6 });
    const dawnAlpha = ctx.draws[0].alpha;

    assert.ok(middayAlpha > dawnAlpha);
    assert.ok(dawnAlpha >= midnightAlpha);
    assert.ok(midnightAlpha > 0);

    ctx.draws.length = 0;
    api.setEnabled(false);
    assert.equal(api.enabled, false);
    assert.equal(api.render(ctx, bounds, 2, { horaDecimal: 12 }), 0);
    assert.equal(ctx.draws.length, 0, 'disabled shadows should not draw over the original scene');
    api.enabled = true;
    assert.equal(api.render(ctx, bounds, 2, { horaDecimal: 12 }) > 0, true);
});

test('cloud shadows are loaded and rendered after terrain but before world entities', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /<script src="cloud-shadows\.js\?v=2"><\/script>/);
    assert.match(html, /desenharCenarioMundo\(tempoAnimacao, ctx\);[\s\S]*CloudShadows\.render\(ctx, cameraBounds, tempoAnimacao, window\.tempoMundo\);[\s\S]*desenharPinosLocalizacao/);
});
