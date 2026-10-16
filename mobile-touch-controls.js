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

    function findAimAssistTarget(targets, originX, originY, aimAngle, maxDistance, maxAngle) {
        if (!Array.isArray(targets) || !Number.isFinite(originX) || !Number.isFinite(originY) ||
            !Number.isFinite(aimAngle) || !Number.isFinite(maxDistance) || maxDistance <= 0 ||
            !Number.isFinite(maxAngle) || maxAngle < 0) return null;

        var best = null;
        var maxDistanceSquared = maxDistance * maxDistance;
        targets.forEach(function (target) {
            if (!target || target.hp <= 0 || target.id === undefined || target.id === null ||
                !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;

            var dx = target.x - originX;
            var dy = target.y - originY;
            var distanceSquared = dx * dx + dy * dy;
            if (distanceSquared <= 0 || distanceSquared > maxDistanceSquared) return;

            var angle = Math.atan2(dy, dx);
            var angleDifference = Math.abs(Math.atan2(
                Math.sin(aimAngle - angle),
                Math.cos(aimAngle - angle)
            ));
            if (angleDifference > maxAngle) return;

            var distance = Math.sqrt(distanceSquared);
            var score = angleDifference + distance / maxDistance * 0.08;
            if (!best || score < best.score) {
                best = {
                    target: target,
                    angle: angle,
                    distance: distance,
                    angleDifference: angleDifference,
                    score: score
                };
            }
        });
        return best;
    }

    global.handleHudActionTouchStart = handleHudActionTouchStart;
    global.canAimLanternWithTouch = canAimLanternWithTouch;
    global.findAimAssistTarget = findAimAssistTarget;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            handleHudActionTouchStart: handleHudActionTouchStart,
            canAimLanternWithTouch: canAimLanternWithTouch,
            findAimAssistTarget: findAimAssistTarget
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
