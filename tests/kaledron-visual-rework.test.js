'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');

function createCanvasContext() {
    const stack = [];
    return {
        globalAlpha: 1,
        translations: [],
        scales: [],
        save() { stack.push(this.globalAlpha); },
        restore() {
            const previousAlpha = stack.pop();
            this.globalAlpha = previousAlpha === undefined ? 1 : previousAlpha;
        },
        translate(x, y) { this.translations.push([x, y]); },
        rotate() {},
        scale(x, y) { this.scales.push([x, y]); },
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {},
        arc() {},
        ellipse() {},
        fillRect() {},
        strokeRect() {},
        fill() {},
        stroke() {}
    };
}

function loadVisualModule(fileName, window, getTime) {
    const source = fs.readFileSync(path.join(root, fileName), 'utf8');
    const context = vm.createContext({
        window,
        Math,
        Date,
        performance: { now: getTime }
    });
    vm.runInContext(source, context, { filename: fileName });
}

test('the modular Kaledron renderer supports all combat poses, damage, death, and respawn', () => {
    let time = 1000;
    const window = {
        ctx: createCanvasContext(),
        meuId: 'local',
        todosJogadores: {},
        kaledronAnims: {},
        kaledronEstadoLocal: { bradoAtivo: false, bradoExpira: 0 }
    };
    loadVisualModule('classes/kaledron_visual.js', window, () => time);

    for (const state of ['idle', 'ataque', 'impacto', 'redemoinho', 'brado']) {
        window.kaledronAnims.local = { estado: state, inicio: time, dur: 3000, angulo: 0 };
        assert.doesNotThrow(() => window.desenharKaledron(120, 180, state === 'idle', Math.PI, 100, 100, 'local'));
        time += 300;
    }

    const idleContext = createCanvasContext();
    window.ctx = idleContext;
    window.kaledronAnims.idle = { estado: 'idle', inicio: time, dur: 3000, angulo: 0 };
    window.desenharKaledron(120, 180, false, 0, 100, 100, 'idle');
    const idleState = window.kaledronVisualStates.idle;
    const idleWalkPhase = idleState.walkPhase;
    assert.ok(idleContext.scales.some(([x, y]) => x === 0.68 && y === 0.68), 'Kaledron should use the reduced standard-size scale');
    assert.ok(idleContext.scales.some(([x, y]) => x > 1 && x < 1.03 && y > 1 && y < 1.02), 'idle breathing should expand only the chest subtly');
    time += 500;
    window.desenharKaledron(120, 180, false, 0, 100, 100, 'idle');
    assert.deepEqual(
        idleContext.translations.filter(([, y]) => y === 7).map(([x]) => x),
        [-6, 6, -6, 6],
        'idle leg positions should remain unchanged across frames'
    );
    assert.equal(idleContext.translations.filter(([x, y]) => x === 120 && y === 180).length, 2, 'the idle body should stay grounded without vertical bobbing');
    assert.equal(idleState.walkPhase, idleWalkPhase, 'legs should stay still while idle');

    window.ctx = createCanvasContext();
    window.kaledronAnims.local = {};
    window.desenharKaledron(120, 180, false, 0, 100, 100, 'local');
    time += 16;
    window.desenharKaledron(120, 180, false, 0, 72, 100, 'local');
    const state = window.kaledronVisualStates.local;
    assert.ok(state.hitAt > 0, 'taking damage should start a short visual reaction');
    assert.ok(state.particles.length > 0, 'the hit reaction should emit a small bounded spark burst');
    assert.ok(state.particles.length <= 28);

    time += 16;
    window.desenharKaledron(120, 180, false, 0, 0, 100, 'local');
    assert.equal(state.particles.length, 0, 'death should clear temporary player particles');
    time += 1000;
    window.desenharKaledron(120, 180, false, 0, 100, 100, 'local');
    assert.equal(state.deathAt, 0, 'respawning should restore the active visual state');

    for (let i = 0; i < 140; i++) {
        time += 1;
        window.desenharKaledron(120, 180, false, 0, 100, 100, 'remote-' + i);
    }
    assert.ok(Object.keys(window.kaledronVisualStates).length <= 128, 'remote visual state cache must stay bounded');
});

test('Kaledron skill visuals retain their public APIs, remain bounded, and expire cleanly', () => {
    let time = 2000;
    const window = {
        ctx: createCanvasContext(),
        meuId: 'local',
        meuX: 100,
        meuY: 120,
        todosJogadores: {},
        registrarKaledronAnim() {}
    };
    loadVisualModule('efeitos/kaledron_visual_efeitos.js', window, () => time);

    window.criarAnimacaoGolpeFulminanteKaledron('local', 112, 136, 0);
    window.criarAnimacaoImpactoTerrestreKaledron('local', 112, 136, 110);
    window.criarAnimacaoRedemoinhoKaledron('local', 112, 136, 3000);
    window.criarAnimacaoBradoGuerraKaledron('local', 112, 136);
    assert.equal(window.kaledronOndasMagma.length, 1);
    assert.equal(window.kaledronCrateras.length, 1);
    assert.equal(window.kaledronRedemoinhos.length, 1);
    assert.equal(window.kaledronBrados.length, 1);

    for (let i = 0; i < 70; i++) {
        window.criarAnimacaoGolpeFulminanteKaledron('other-' + i, 112, 136, 0);
    }
    assert.equal(window.kaledronOndasMagma.length, 64, 'simultaneous effect storage must have a hard cap');
    assert.doesNotThrow(() => window.desenharEfeitosKaledron());

    time += 1600;
    window.desenharEfeitosKaledron();
    assert.equal(window.kaledronCrateras.length, 0);
    assert.equal(window.kaledronBrados.length, 0);
    assert.equal(window.kaledronOndasMagma.length, 0);
    assert.equal(window.kaledronRedemoinhos.length, 1);

    time += 1600;
    window.desenharEfeitosKaledron();
    assert.equal(window.kaledronRedemoinhos.length, 0);
    assert.ok(window.kaledronFlashes.length > 0, 'the whirlwind should end with a brief impact flash');
    time += 300;
    window.desenharEfeitosKaledron();
    assert.equal(window.kaledronFlashes.length, 0);
});

test('the new visual modules are loaded after legacy APIs without changing server combat handlers', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    const skills = fs.readFileSync(path.join(root, 'skills.js'), 'utf8');

    assert.match(html, /classes\/guerreiro_kaledron\.js\?v=2[\s\S]*classes\/kaledron_visual\.js\?v=3/);
    assert.match(html, /efeitos\/kaledron_efeitos\.js\?v=2[\s\S]*efeitos\/kaledron_visual_efeitos\.js\?v=\d+/);
    for (const action of [
        'kaledron_golpe_fulminante', 'kaledron_impacto_terrestre',
        'kaledron_redemoinho', 'kaledron_brado_guerra'
    ]) {
        assert.ok(server.includes("'" + action + "'"), 'server combat action should remain present: ' + action);
    }
    assert.match(skills, /id: 'slash_strike'[\s\S]*?mp: 15, cd: 4/);
    assert.match(skills, /id: 'ground_slam'[\s\S]*?mp: 25, cd: 10/);
    assert.match(skills, /id: 'whirlwind'[\s\S]*?mp: 30, cd: 12/);
    assert.match(skills, /id: 'battle_cry'[\s\S]*?mp: 20, cd: 25/);
});
