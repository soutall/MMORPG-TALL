'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sonoroSource = fs.readFileSync(path.join(root, 'sonoro.js'), 'utf8');

function createBgmHarness() {
    const tracks = [];
    let now = 10000;
    class MockAudio {
        constructor(src) {
            this.src = src;
            this.loop = false;
            this.preload = '';
            this.volume = 1;
            this.paused = true;
            tracks.push(this);
        }

        play() {
            this.paused = false;
            return Promise.resolve();
        }

        pause() {
            this.paused = true;
        }
    }
    class MockDate extends Date {
        static now() {
            return now;
        }
    }
    const window = {
        volumeGeral: 0.5,
        volumeBgm: 0.3,
        volumeSfx: 0.8,
        bgmLiberado: true,
        jogoIniciado: true,
        currentMap: 'mundo',
        meuX: 0,
        meuY: 0,
        tempoMundo: { horaDecimal: 12 },
        mapaMundo: {
            biomaNome(x) {
                return ({
                    1: 'Tundra Gélida',
                    2: 'Selva Proibida',
                    3: 'Planície das Plantas (Santuário)',
                    4: 'Deserto Escaldante'
                })[x] || 'Floresta Sombria';
            }
        }
    };
    vm.runInNewContext(sonoroSource, {
        window,
        Audio: MockAudio,
        Date: MockDate,
        document: { addEventListener() {} },
        Math,
        Number,
        String,
        Object,
        Array
    });
    return {
        tracks,
        window,
        setNow(value) { now = value; }
    };
}

test('map BGM files exist for day and night in the four requested biomes', () => {
    const files = [
        'sprites/mapas/Tundra/tundra-dia.mp3',
        'sprites/mapas/Tundra/tundra-noite.mp3',
        'sprites/mapas/Selva proibida/selva_proibida_dia.mp3',
        'sprites/mapas/Selva proibida/selva_proibida_noite.mp3',
        'sprites/mapas/planice/planice_dia.mp3',
        'sprites/mapas/planice/planice_noite.mp3',
        'sprites/mapas/deserto escaldante/Deserto_dia.mp3',
        'sprites/mapas/deserto escaldante/Deserto_noite.mp3'
    ];
    for (const file of files) {
        assert.ok(fs.statSync(path.join(root, file)).isFile(), `missing music asset ${file}`);
    }
});

test('map BGM follows biome and day/night changes with a volume-aware two-second crossfade', () => {
    const harness = createBgmHarness();
    const update = harness.window.atualizarBgmCidade;
    harness.window.meuX = 1;
    harness.window.tempoMundo.horaDecimal = 22;
    update();
    assert.equal(harness.tracks.at(-1).src, 'sprites/mapas/Tundra/tundra-dia.mp3');

    harness.setNow(12000);
    update();
    const tundraDay = harness.tracks[0];
    assert.ok(Math.abs(tundraDay.volume - 0.19 * 0.5 * 0.3) < 1e-8);

    harness.window.tempoMundo.horaDecimal = 22 + 1 / 60;
    update();
    const tundraNight = harness.tracks[1];
    assert.equal(tundraNight.src, 'sprites/mapas/Tundra/tundra-noite.mp3');
    assert.equal(tundraNight.loop, true);
    harness.setNow(13000);
    update();
    assert.ok(Math.abs(tundraDay.volume - 0.19 * 0.5 * 0.3 / 2) < 1e-8);
    assert.ok(Math.abs(tundraNight.volume - 0.19 * 0.5 * 0.3 / 2) < 1e-8);

    harness.window.meuX = 4;
    update();
    assert.equal(harness.tracks[2].src, 'sprites/mapas/deserto%20escaldante/Deserto_noite.mp3');
    harness.window.tempoMundo.horaDecimal = 5.99;
    update();
    assert.equal(harness.tracks.at(-1).src, 'sprites/mapas/deserto%20escaldante/Deserto_noite.mp3');
    harness.window.tempoMundo.horaDecimal = 6;
    update();
    assert.equal(harness.tracks.at(-1).src, 'sprites/mapas/deserto%20escaldante/Deserto_dia.mp3');
});

test('each requested biome resolves to its own day and night music', () => {
    const harness = createBgmHarness();
    const update = harness.window.atualizarBgmCidade;
    const expectations = [
        [2, 'sprites/mapas/Selva%20proibida/selva_proibida_dia.mp3'],
        [3, 'sprites/mapas/planice/planice_dia.mp3']
    ];
    for (const [x, src] of expectations) {
        harness.window.meuX = x;
        update();
        assert.equal(harness.tracks.at(-1).src, src);
    }
    harness.window.meuX = 5;
    update();
    assert.equal(harness.tracks.at(-1).src, 'Sonoro/Cidade/mapa%20verde/Verde_Dia.mp3',
        'leaving the requested biomes should crossfade back to the existing world music');
});
