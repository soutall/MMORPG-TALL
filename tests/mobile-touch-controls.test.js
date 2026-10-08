'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { handleHudActionTouchStart } = require('../mobile-touch-controls.js');

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

test('the helper loads before the capture listener and does not reset joystick input', () => {
    assert.match(html, /mobile-touch-controls\.js\?v=1/);
    assert.match(html, /document\.addEventListener\("touchstart", window\.handleHudActionTouchStart, \{ capture: true, passive: false \}\)/);
    assert.match(html, /let joystickTouchId = null; let lanternaTouchId = null/);
});
