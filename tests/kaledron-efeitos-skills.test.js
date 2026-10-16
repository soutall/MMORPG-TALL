'use strict';

// Efeitos de skill do Kaledron (efeitos/kaledron_visual_efeitos.js).
//
// Este arquivoNAO valida o desenho do personagem — o visual foi refeito do
// zero (Cavaleiro do Abismo) e vive em tests/kaledron-abismo.test.js. Aqui
// fica so a cobertura dos efeitos de skill, que continuam intocados.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function carregarEfeitos() {
    const source = fs.readFileSync(path.join(root, 'efeitos', 'kaledron_visual_efeitos.js'), 'utf8');
    const now = { valor: 1000 };
    const ctx = {
        canvas: { width: 800, height: 600 },
        globalAlpha: 1,
        save() { ctx.globalAlpha = 1; },
        restore() { ctx.globalAlpha = 1; },
        translate() {}, rotate() {}, scale() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
        quadraticCurveTo() {}, arc() {}, ellipse() {},
        rect() {}, fill() {}, stroke() {}, fillRect() {}, strokeRect() {},
        clearRect() {},
        createRadialGradient() { return { addColorStop() {} }; },
        createLinearGradient() { return { addColorStop() {} }; }
    };
    const window = {
        ctx,
        meuId: 'local',
        todosJogadores: {},
        kaledronEstadoLocal: { bradoAtivo: false, bradoExpira: 0 },
        kaledronAnims: {},
        performance: { now: () => now.valor }
    };
    window.window = window;
    vm.createContext(window);
    vm.runInContext(source, window, { filename: 'kaledron_visual_efeitos.js' });
    return { window, ctx, now };
}

test('Kaledron skill visuals retain their public APIs, remain bounded, and expire cleanly', () => {
    const { window, ctx, now } = carregarEfeitos();

    // A unica entrada publica real do arquivo: o index.html chama exatamente
    // isto no loop de render (L11993).
    assert.equal(typeof window.desenharEfeitosKaledron, 'function', 'desenharEfeitosKaledron ausente');

    // As colecoes de efeito precisam existir e comecar vazias.
    for (const lista of ['kaledronOndasMagma', 'kaledronCrateras', 'kaledronRedemoinhos']) {
        assert.ok(Array.isArray(window[lista]), `${lista} nao e um array`);
        assert.equal(window[lista].length, 0, `${lista} deveria comecar vazia`);
    }

    // Desenhar sem nenhum efeito ativo nao pode estourar nem sujar o ctx.
    assert.doesNotThrow(() => window.desenharEfeitosKaledron());
    assert.equal(ctx.globalAlpha, 1, 'o efeito deixou globalAlpha sujo');

    // Many frames in a row must stay stable and not grow the collections
    // (the classic "leak" of an effects system that never expires anything).
    for (let i = 0; i < 120; i++) {
        now.valor += 16;
        assert.doesNotThrow(() => window.desenharEfeitosKaledron(), `estourou no frame ${i}`);
    }
    assert.equal(ctx.globalAlpha, 1, 'deixou globalAlpha sujo apos 120 frames');

    for (const lista of ['kaledronOndasMagma', 'kaledronCrateras', 'kaledronRedemoinhos']) {
        assert.ok(window[lista].length < 200, `${lista} cresceu demais: ${window[lista].length}`);
    }
});

test('os efeitos do Kaledron sao carregados no cliente', () => {
    assert.match(
        indexHtml,
        /efeitos\/kaledron_visual_efeitos\.js\?v=\d+/,
        'o script de efeitos do Kaledron nao esta no index.html'
    );
    // o visual novo precisa carregar TAMBEM, e depois da classe
    const classe = indexHtml.indexOf('classes/guerreiro_kaledron.js');
    const visual = indexHtml.indexOf('classes/kaledron_visual.js');
    assert.ok(classe > -1 && visual > classe,
        'a ordem de carregamento esta errada: a classe precisa vir antes do visual');
});
