(function (global) {
    'use strict';

    function handleHudActionTouchStart(event) {
        var target = event && event.target;
        var button = target && typeof target.closest === 'function'
            ? target.closest('#hud-pocoes button, .actions .btn-action')
            : null;
        if (!button) return false;

        if (event.cancelable) event.preventDefault();
        if (button.hasAttribute('ontouchstart')) return true;

        if (typeof button.click === 'function') button.click();
        event.stopPropagation();
        return true;
    }

    function canAimLanternWithTouch(touch, target, joystickActive, lanternActive, screenWidth) {
        if (lanternActive || !touch || !Number.isFinite(touch.clientX) ||
            !Number.isFinite(screenWidth) || screenWidth <= 0 ||
            !target || typeof target.closest !== 'function') return false;
        if (target.closest('#joystick-base, button, a, input, textarea, select, [data-ui], .modal-window')) {
            return false;
        }
        return joystickActive || touch.clientX >= screenWidth / 2;
    }

    global.handleHudActionTouchStart = handleHudActionTouchStart;
    global.canAimLanternWithTouch = canAimLanternWithTouch;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            handleHudActionTouchStart: handleHudActionTouchStart,
            canAimLanternWithTouch: canAimLanternWithTouch
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
