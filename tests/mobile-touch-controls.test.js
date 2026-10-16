'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
    handleHudActionTouchStart,
    canAimLanternWithTouch,
    findAimAssistTarget
} = require('../mobile-touch-controls.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

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

test('mobile aim assist favors the target nearest the current aim and respects range and cone', () => {
    const nearAim = { id: 'near-aim', x: 100, y: 8, hp: 30 };
    const nearerButOffAim = { id: 'off-aim', x: 12, y: 24, hp: 30 };
    const outOfRange = { id: 'far', x: 700, y: 0, hp: 30 };
    const result = findAimAssistTarget(
        [nearerButOffAim, nearAim, outOfRange],
        0, 0, 0, 600, 0.25
    );

    assert.equal(result.target.id, 'near-aim');
    assert.ok(result.angleDifference < 0.1);
    assert.equal(findAimAssistTarget([nearAim], 0, 0, Math.PI, 600, 0.25), null);
});

test('mobile aim assist ignores dead and malformed targets', () => {
    const result = findAimAssistTarget([
        { id: 'dead', x: 20, y: 0, hp: 0 },
        { id: 'invalid', x: NaN, y: 0, hp: 10 }
    ], 0, 0, 0, 600, 0.5);

    assert.equal(result, null);
});

test('the helper loads before touch listeners and controls disable browser gestures', () => {
    assert.match(html, /mobile-touch-controls\.js\?v=3/);
    assert.match(html, /document\.addEventListener\("touchstart", window\.handleHudActionTouchStart, \{ capture: true, passive: false \}\)/);
    assert.match(html, /let joystickTouchId = null; let lanternaTouchId = null/);
    assert.match(html, /window\.canAimLanternWithTouch\([\s\S]{0,300}joystickTouchId !== null/);
    assert.match(html, /touchmove[\s\S]{0,1600}touch\.identifier === lanternaTouchId/);
    assert.match(html, /if \(e\.changedTouches\[i\]\.identifier === joystickTouchId\) \{\s*joystickTouchId = null;[\s\S]{0,120}moveX = 0;/);
    const mobileCss = fs.readFileSync(path.join(__dirname, '..', 'mobile-hud.css'), 'utf8');
    assert.match(mobileCss, /#hud-pocoes button,[\s\S]{0,140}\.actions \.btn-action,[\s\S]{0,100}touch-action:\s*none\s*!important/);
});

test('aim assist is mobile-only and desktop attacks use the clicked aim without requiring a target', () => {
    const mobileCss = fs.readFileSync(path.join(__dirname, '..', 'mobile-hud.css'), 'utf8');
    const desktopCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

    assert.match(html, /btnAttack\.addEventListener\("click"[\s\S]{0,150}executarAtaqueBasico\(true\)/);
    assert.match(html, /e\.pointerType === 'touch' \|\| e\.button !== 0/);
    assert.match(html, /executarAtaqueBasico\(false\)/);
    assert.doesNotMatch(html, /atualizarAutoAtaque\(\);/);
    assert.match(html, /mobileAssistido \? selecionarAlvoAtaqueBasico\(anguloMira\) : null/);
    assert.match(html, /const permiteDisparoLivre = window\.minhaClasse !== 'lord_malakar'/);
    assert.match(html, /const classesDeProjetilLivre = \['mago', 'summoner', 'arqueiro', 'curandeiro', 'roqueiro'\]/);
    assert.match(html, /mobileAssistido && alvoMira \? alvoMira\.angle : anguloMira/);
    assert.match(html, /window\.meuAngulo = Math\.atan2\(my - playerY, mx - playerX\)/);
    assert.match(html, /if \(!\['mago', 'summoner', 'arqueiro', 'curandeiro', 'roqueiro'\]\.includes\(window\.minhaClasse\)\) \{[\s\S]{0,4000}executarAtaqueBasico\(false, clickedTarget\)/);
    assert.match(html, /findAimAssistTarget\([\s\S]{0,180}0\.52/);
    assert.match(server, /function obterAlvoAtaqueBasicoOpcional/);
    assert.match(server, /if \(\(alvoInformado && !alvoAuto\) \|\|/);
    assert.match(server, /Math\.floor\(alcanceAtaqueBasicoClasse\(players\[playerId\]\) \/ velocidadeProj\)/);
    assert.match(server, /const alcanceTiroRobo = alcanceAtaqueBasicoClasse\(pD\)/);
    assert.match(server, /const alcanceBarrett = alcanceAtaqueBasicoClasse\(pS\)/);
    for (const action of ['ataque_barbaro', 'ataque_ladino', 'ataque_pikeman', 'ataque_kaledron', 'corte']) {
        const actionStart = server.indexOf(`if (data.action === '${action}')`);
        assert.notEqual(actionStart, -1, `server handler exists for ${action}`);
        const nextHandler = server.indexOf('\n                if (data.action === ', actionStart + 1);
        const actionBlock = server.slice(actionStart, nextHandler === -1 ? undefined : nextHandler);
        assert.doesNotMatch(actionBlock, /alvoValidado\.invalido\) return/);
        assert.match(actionBlock, /client\.send\(JSON\.stringify\(\{ type:/);
    }
    assert.match(server, /data\.action === 'ataque_roqueiro'[\s\S]{0,550}alvoInformado && !alvoAuto/);
    assert.match(server, /typeof data\.angulo === 'number' && Number\.isFinite\(data\.angulo\)[\s\S]{0,150}players\[playerId\]\.angulo/);
    assert.match(server, /targetX: alvoAuto \? alvoAuto\.x : pX \+ Math\.cos\(ang\) \* velocidadeProj \* vidaProj/);
    assert.match(desktopCss, /\.btn-attack\s*\{\s*display:\s*none;/);
    assert.match(mobileCss, /#btn-attack\s*\{[\s\S]{0,500}display:\s*flex\s*!important/);
});
