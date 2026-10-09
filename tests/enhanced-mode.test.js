'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createEnhancedMode } = require('../modo-melhorado/manager');
const createCameraModule = require('../modo-melhorado/camera');
const createCombatModule = require('../modo-melhorado/combate');
const createAtmosphereModule = require('../modo-melhorado/atmosfera');
const createShadowModule = require('../modo-melhorado/sombras');

test('enhanced mode starts off unless the browser startup query enables it', () => {
    const off = createEnhancedMode();
    const on = createEnhancedMode({ query: '?enhanced=1' });

    assert.equal(off.isEnabled(), false);
    assert.equal(on.isEnabled(), true);
    assert.equal(off.update(1, {}).x, 0);
});

test('enhanced manager modules are wired in the client before the game loop', () => {
    const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
    assert.match(html, /modo-melhorado\/camera\.js\?v=1/);
    assert.match(html, /modo-melhorado\/combate\.js\?v=1/);
    assert.match(html, /modo-melhorado\/atmosfera\.js\?v=1/);
    assert.match(html, /modo-melhorado\/sombras\.js\?v=1/);
    assert.match(html, /modo-melhorado\/manager\.js\?v=1/);
    assert.match(html, /window\.EnhancedMode\.renderEffects\(ctx, enhancedFrameState\)/);
    assert.match(html, /window\.EnhancedMode\.handleNetworkEvent\(dados\)/);
    assert.match(html, /GAME_VERSION = 'v1\.75\.103'/);
});

test('module diagnostics can disable one effect without disabling the enhanced mode', () => {
    const mode = createEnhancedMode({ modules: { camera: createCameraModule() }, query: '?enhanced=1&enhancedOff=camera' });

    assert.equal(mode.isEnabled(), true);
    assert.equal(mode.getModuleState().camera, false);
    assert.equal(mode.update(1, {}).x, 0);
    assert.equal(mode.setModuleEnabled('camera', true), true);
});

test('accessibility reduced-motion setting suppresses enhanced camera shake', () => {
    const camera = createCameraModule();
    const mode = createEnhancedMode({ modules: { camera }, query: '?enhanced=1' });
    mode.handleNetworkEvent({ type: 'boss_golem_impacto', x: 10, y: 20 });

    assert.notDeepEqual(mode.update(1, {}), { x: 0, y: 0 });
    mode.setReducedMotion(true);
    mode.handleNetworkEvent({ type: 'boss_golem_impacto', x: 10, y: 20 });
    assert.deepEqual(mode.update(1, {}), { x: 0, y: 0 });
});

test('reduced motion suppresses added combat particles as well as camera shake', () => {
    const combat = createCombatModule();
    const mode = createEnhancedMode({ modules: { combat }, query: '?enhanced=1' });
    mode.setReducedMotion(true);
    mode.handleNetworkEvent({ type: 'monster_skill_impact', x: 10, y: 20 });

    assert.equal(combat.getActiveParticleCount(), 0);
});

test('combat VFX uses a bounded particle pool and ignores invalid impacts', () => {
    const combat = createCombatModule();
    combat.setEnabled(true);
    combat.impact({ x: 4, y: 8, kind: 'impact' });
    combat.impact({ x: NaN, y: 8, kind: 'boss' });

    assert.equal(combat.getParticleCount(), 64);
    assert.equal(combat.getActiveParticleCount(), 8);
});

test('atmosphere and shadow modules can be disabled without retaining active rendering', () => {
    const atmosphere = createAtmosphereModule();
    const shadows = createShadowModule();

    atmosphere.setEnabled(true);
    atmosphere.update(1, { playerX: 0, playerY: 0 });
    atmosphere.setEnabled(false);
    shadows.setEnabled(true);
    shadows.setEnabled(false);

    assert.equal(atmosphere.getMoteCount(), 18);
    assert.equal(shadows.isEnabled(), false);
});
