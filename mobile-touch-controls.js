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

    global.handleHudActionTouchStart = handleHudActionTouchStart;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { handleHudActionTouchStart: handleHudActionTouchStart };
    }
})(typeof window !== 'undefined' ? window : globalThis);
