(function (root, factory) {
    'use strict';

    const createCameraModule = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = createCameraModule;
    root.EnhancedModeModules = root.EnhancedModeModules || {};
    root.EnhancedModeModules.camera = createCameraModule();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    return function createCameraModule() {
        let strength = 0;
        let age = 0;
        let pulse = 0;

        return {
            setEnabled: function (enabled) {
                if (!enabled) {
                    strength = 0;
                    age = 0;
                }
            },
            impact: function (amount) {
                strength = Math.min(4, strength + Math.max(0, Number(amount) || 0));
                age = 0;
                pulse++;
            },
            update: function (dt, state) {
                if ((state && state.reducedMotion) || strength < 0.08) {
                    strength = 0;
                    return { x: 0, y: 0 };
                }
                age += dt;
                strength *= Math.pow(0.84, dt);
                const phase = age * 0.9 + pulse * 1.71;
                return {
                    x: Math.sin(phase) * strength,
                    y: Math.cos(phase * 1.37) * strength * 0.68
                };
            }
        };
    };
});
