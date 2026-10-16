'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'classes', 'animacao_jogador.js'),
    'utf8'
);

function createAnimator() {
    const window = {};
    vm.runInNewContext(source, { window, Date, Math, Object, Number }, {
        filename: 'classes/animacao_jogador.js'
    });
    return window;
}

test('remote players have independent gait phases while the local cycle is preserved', () => {
    const animator = createAnimator();
    const first = animator.atualizarAnimacaoJogador('remote-a', true, 0, 100, 1000, false, 0);
    const second = animator.atualizarAnimacaoJogador('remote-b', true, 0, 100, 1000, false, 0);
    const advanced = animator.atualizarAnimacaoJogador('remote-a', true, 0, 100, 1050, false, 0);
    const local = animator.atualizarAnimacaoJogador('local', true, 0, 100, 1050, true, 7.25);

    assert.ok(advanced.cicloCaminhada > first.cicloCaminhada);
    assert.notEqual(first.cicloCaminhada, second.cicloCaminhada);
    assert.equal(local.cicloCaminhada, 7.25);
});

test('remote facing turns smoothly across the -PI/PI boundary', () => {
    const animator = createAnimator();
    animator.atualizarAnimacaoJogador('remote', false, 3.1, 100, 1000, false, 0);
    const turning = animator.atualizarAnimacaoJogador('remote', false, -3.1, 100, 1065, false, 0);

    assert.ok(turning.angulo > 3.1, 'the short rotation should continue past PI rather than spin through zero');
    assert.ok(turning.angulo < Math.PI + 0.1);
});

test('health loss triggers a brief recoil but healing does not', () => {
    const animator = createAnimator();
    animator.atualizarAnimacaoJogador('player', false, 0, 100, 1000, false, 0);
    animator.atualizarAnimacaoJogador('player', false, 0, 80, 1100, false, 0);
    const hurt = animator.atualizarAnimacaoJogador('player', false, 0, 80, 1150, false, 0);
    const healed = animator.atualizarAnimacaoJogador('player', false, 100, 100, 1400, false, 0);

    assert.ok(hurt.intensidadeDano > 0);
    assert.ok(hurt.deslocamentoX < 0, 'the character should recoil away from its facing direction');
    assert.equal(healed.intensidadeDano, 0);
});

test('basic attacks progress through wind-up, strike, and recovery', () => {
    const animator = createAnimator();
    animator.registrarAtaqueAnimacaoJogador('player', 1000);
    const windup = animator.atualizarAnimacaoJogador('player', false, 0, 100, 1040, false, 0);
    const strike = animator.atualizarAnimacaoJogador('player', false, 0, 100, 1115, false, 0);
    const recovery = animator.atualizarAnimacaoJogador('player', false, 0, 100, 1200, false, 0);

    assert.ok(windup.deslocamentoX < 0, 'wind-up should pull the character back');
    assert.ok(strike.escalaX > 1, 'the strike should have a brief impact accent');
    assert.ok(recovery.deslocamentoX > 0, 'recovery should follow through toward the target');
});

test('idle breathing is subtle and movement replaces the idle bob', () => {
    const animator = createAnimator();
    const first = animator.atualizarAnimacaoJogador('player', false, 0, 100, 1000, false, 0);
    const next = animator.atualizarAnimacaoJogador('player', false, 0, 100, 1200, false, 0);
    const moving = animator.atualizarAnimacaoJogador('player', true, 0, 100, 1220, false, 0);

    assert.notEqual(first.deslocamentoY, next.deslocamentoY);
    assert.equal(moving.escalaX, 1);
});
