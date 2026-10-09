(function (root, factory) {
    'use strict';

    const createShadowModule = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = createShadowModule;
    root.EnhancedModeModules = root.EnhancedModeModules || {};
    root.EnhancedModeModules.shadows = createShadowModule();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    return function createShadowModule() {
        let enabled = false;

        function drawShadow(ctx, x, y, width, height) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            ctx.save();
            ctx.fillStyle = 'rgba(4, 8, 12, 0.28)';
            ctx.beginPath();
            ctx.ellipse(x + 12, y + 29, width, height, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        return {
            setEnabled: function (value) { enabled = !!value; },
            render: function (ctx, state) {
                if (!enabled) return;
                drawShadow(ctx, state.playerX, state.playerY, 11, 4);
                const players = state.players || {};
                Object.keys(players).forEach(function (id) {
                    const player = players[id];
                    if (!player || id === state.playerId) return;
                    drawShadow(ctx, Number(player.x), Number(player.y), 10, 3.5);
                });
            },
            isEnabled: function () { return enabled; }
        };
    };
});
