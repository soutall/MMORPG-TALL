'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
    handleHudActionTouchStart,
    canAimLanternWithTouch
} = require('../mobile-touch-controls.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function makeTouchEvent(button) {
    const result = { prevented: false, stopped: false, clicks: 0 };
    const event = {
        cancelable: true,
        target: { closest: () => button },
        preventDefault() { result.prevented = true; },
        stopPropagation() { result.stopped = true; }
    };
    return { event, result };
}

test('click-only HUD buttons such as potions activate immediately on a second touch', () => {
    const { event, result } = makeTouchEvent({
        hasAttribute: () => false,
        click() { result.clicks++; }
    });

    assert.equal(handleHudActionTouchStart(event), true);
    assert.equal(result.prevented, true);
    assert.equal(result.clicks, 1);
    assert.equal(result.stopped, true);
});

test('buttons with touch handlers are not invoked a second time', () => {
    const { event, result } = makeTouchEvent({
        hasAttribute: (name) => name === 'ontouchstart',
        click() { result.clicks++; }
    });

    assert.equal(handleHudActionTouchStart(event), true);
    assert.equal(result.prevented, true);
    assert.equal(result.clicks, 0);
    assert.equal(result.stopped, false);
});

test('touches outside HUD action buttons do not get intercepted', () => {
    const { event, result } = makeTouchEvent(null);

    assert.equal(handleHudActionTouchStart(event), false);
    assert.equal(result.prevented, false);
    assert.equal(result.clicks, 0);
    assert.equal(result.stopped, false);
});

test('a field touch can aim the lantern alone or while moving, but HUD touches cannot', () => {
    const world = { closest: () => null };
    const button = { closest: () => ({}) };

    assert.equal(canAimLanternWithTouch({ clientX: 700 }, world, false, false, 1000), true);
    assert.equal(canAimLanternWithTouch({ clientX: 200 }, world, true, false, 1000), true);
    assert.equal(canAimLanternWithTouch({ clientX: 700 }, world, false, true, 1000), false);
    assert.equal(canAimLanternWithTouch({ clientX: 700 }, button, true, false, 1000), false);
    assert.equal(canAimLanternWithTouch({ clientX: 200 }, world, false, false, 1000), false);
});

test('the helper loads before touch listeners and controls disable browser gestures', () => {
    assert.match(html, /mobile-touch-controls\.js\?v=2/);
    assert.match(html, /document\.addEventListener\("touchstart", window\.handleHudActionTouchStart, \{ capture: true, passive: false \}\)/);
    assert.match(html, /let joystickTouchId = null; let lanternaTouchId = null/);
    assert.match(html, /window\.canAimLanternWithTouch\([\s\S]{0,300}joystickTouchId !== null/);
    assert.match(html, /touchmove[\s\S]{0,1600}touch\.identifier === lanternaTouchId/);
    assert.match(html, /if \(e\.changedTouches\[i\]\.identifier === joystickTouchId\) \{\s*joystickTouchId = null;[\s\S]{0,120}moveX = 0;/);
    const mobileCss = fs.readFileSync(path.join(__dirname, '..', 'mobile-hud.css'), 'utf8');
    assert.match(mobileCss, /#hud-pocoes button,[\s\S]{0,140}\.actions \.btn-action,[\s\S]{0,100}touch-action:\s*none\s*!important/);
});
