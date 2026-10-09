(function (root, factory) {
    'use strict';

    const createAtmosphereModule = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = createAtmosphereModule;
    root.EnhancedModeModules = root.EnhancedModeModules || {};
    root.EnhancedModeModules.atmosphere = createAtmosphereModule();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    return function createAtmosphereModule() {
        const motes = Array.from({ length: 18 }, function (_, index) {
            const seed = index * 127.1 + 311.7;
            const fraction = function (value) { return value - Math.floor(value); };
            return {
                x: 0,
                y: 0,
                offsetX: (fraction(Math.sin(seed) * 43758.5453) - 0.5) * 760,
                offsetY: (fraction(Math.sin(seed + 19.19) * 9631.417) - 0.5) * 440,
                drift: 0.08 + fraction(Math.sin(seed + 7.3) * 1531.9) * 0.16,
                phase: fraction(Math.sin(seed + 41.7) * 7331.2) * Math.PI * 2
            };
        });
        let enabled = false;
        let initialized = false;

        return {
            setEnabled: function (value) {
                enabled = !!value;
                if (!enabled) initialized = false;
            },
            update: function (dt, state) {
                if (!enabled) return;
                const centerX = Number(state.playerX) || 0;
                const centerY = Number(state.playerY) || 0;
                for (let i = 0; i < motes.length; i++) {
                    const mote = motes[i];
                    if (!initialized || Math.hypot(mote.x - centerX, mote.y - centerY) > 520) {
                        mote.x = centerX + mote.offsetX;
                        mote.y = centerY + mote.offsetY;
                    } else if (!state.reducedMotion) {
                        mote.y -= mote.drift * dt;
                        mote.phase += 0.012 * dt;
                    }
                }
                initialized = true;
            },
            render: function (ctx, state) {
                if (!enabled) return;
                for (let i = 0; i < motes.length; i++) {
                    const mote = motes[i];
                    const alpha = state.reducedMotion ? 0.22 : 0.18 + (Math.sin(mote.phase) + 1) * 0.1;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = i % 4 === 0 ? '#ffc875' : '#c8d9df';
                    ctx.beginPath();
                    ctx.arc(mote.x, mote.y, i % 4 === 0 ? 1.5 : 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            },
            getMoteCount: function () { return motes.length; }
        };
    };
});
