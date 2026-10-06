'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rendererSource = fs.readFileSync(path.join(__dirname, '../../monstros.js'), 'utf8');

function renderPetAnimation(animationState) {
    let now = 10000;
    const draws = [];
    const canvas = {
        save() {},
        restore() {},
        translate() {},
        scale() {},
        drawImage(...args) { draws.push(args); }
    };
    class ControlledDate extends Date {
        static now() { return now; }
    }
    const window = { ctx: canvas };
    const context = vm.createContext({
        window,
        Date: ControlledDate,
        console: { error() {} },
        fetch: () => Promise.resolve({ ok: false, status: 404 })
    });

    vm.runInContext(rendererSource, context, { filename: 'monstros.js' });
    const frames = {
        idle_E: 1,
        walk_E: 2,
        action_E: 3,
        hit_E: 4
    };
    context._slimeSprites.slime = {
        metadata: { frameWidth: 8, frameHeight: 8, originX: 4, originY: 7 },
        image: {},
        clipsByName: Object.fromEntries(Object.entries(frames).map(([name, x]) => [
            name,
            { name, fps: 10, loop: true, frames: [{ page: 0, x, y: 0, durationMs: 100 }] }
        ]))
    };
    const pet = {
        id: 'pet-renderer-test',
        pet_instance_id: 'pet-renderer-test',
        species_id: 'slime',
        tipo: 'slime',
        asset: 'slime',
        x: 10,
        y: 10,
        hp: 80,
        maxHp: 100,
        angulo: 0,
        aiEstado: 'combat',
        animationState,
        animationStartedAt: now,
        animationUntil: now + 700,
        aiAtacandoAte: animationState === 'ATTACK' ? now + 700 : 0
    };

    window.desenharSlime(pet);
    now += 100;
    return draws[0] && draws[0][1];
}

test('shared monster renderer plays Pet ATTACK and HIT clips from runtime animation state', () => {
    assert.equal(renderPetAnimation('ATTACK'), 3,
        'ATTACK must select the species action clip through desenharSlime');
    assert.equal(renderPetAnimation('HIT'), 4,
        'HIT must select the species damage clip through desenharSlime');
});

test('captured pet gets a subtle red glow only during its attack animation', () => {
    let now = 10000;
    const colors = [];
    let ellipses = 0;
    const canvas = {
        save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, fill() {}, stroke() {},
        ellipse() { ellipses += 1; },
        set fillStyle(value) { colors.push(value); },
        set strokeStyle(value) { colors.push(value); }
    };
    class ControlledDate extends Date {
        static now() { return now; }
    }
    const window = { ctx: canvas };
    const context = vm.createContext({
        window,
        Date: ControlledDate,
        console: { error() {} },
        fetch: () => Promise.resolve({ ok: false, status: 404 })
    });
    vm.runInContext(rendererSource, context, { filename: 'monstros.js' });
    const pet = {
        type: 'pet', pet_instance_id: 'pet-glow-test', x: 10, y: 20, escala: 1,
        animationState: 'ATTACK', animationStartedAt: now - 350, animationUntil: now + 350
    };

    window.desenharEfeitoAtaquePet(canvas, pet);
    assert.equal(ellipses, 2, 'attack aura should draw a soft fill and outline');
    assert.ok(colors.includes('#ff4655') && colors.includes('#ff6470'),
        'attack aura should use restrained red tones');

    pet.animationState = 'IDLE';
    window.desenharEfeitoAtaquePet(canvas, pet);
    assert.equal(ellipses, 2, 'idle pet should not retain the attack glow');
});

test('pet speech bubble appears at a random interval and disappears after two seconds', () => {
    let now = 10000;
    const spoken = [];
    const canvas = {
        save() {}, restore() {}, beginPath() {}, roundRect() {}, rect() {}, fill() {}, stroke() {},
        moveTo() {}, lineTo() {}, closePath() {}, measureText(text) { return { width: text.length * 6 }; },
        fillText(text) { spoken.push({ text, at: now }); }
    };
    class ControlledDate extends Date {
        static now() { return now; }
    }
    const window = { ctx: canvas };
    const context = vm.createContext({
        window,
        Date: ControlledDate,
        console: { error() {} },
        fetch: () => Promise.resolve({ ok: false, status: 404 })
    });
    vm.runInContext(rendererSource, context, { filename: 'monstros.js' });
    vm.runInContext('Math.random = () => 0', context);
    const pet = { id: 'pet-chat-test', type: 'pet', pet_instance_id: 'pet-chat-test', x: 20, y: 30 };
    const drawBubble = () => window.desenharBalaoConversaPet(pet);

    drawBubble();
    now += 3999;
    drawBubble();
    assert.equal(spoken.length, 0, 'bubble must wait for its randomized schedule');

    now += 1;
    drawBubble();
    assert.equal(spoken.length, 1, 'bubble must show once its schedule is reached');
    const phrase = spoken[0].text;
    now += 1999;
    drawBubble();
    assert.equal(spoken.length, 2);
    assert.equal(spoken[1].text, phrase, 'bubble text must remain stable while visible');

    now += 1;
    drawBubble();
    assert.equal(spoken.length, 2, 'bubble must disappear after 2000ms');
});
