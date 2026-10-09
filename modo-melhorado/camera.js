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
        let followInitialized = false;
        let followedPlayerX = 0;
        let followedPlayerY = 0;
        let cameraX = 0;
        let cameraY = 0;
        let velocityX = 0;
        let velocityY = 0;
        let leadX = 0;
        let leadY = 0;
        let impulseX = 0;
        let impulseY = 0;
        let impulseAge = 0;
        let followKey = null;
        const followResult = { x: 0, y: 0 };
        const config = {
            enabled: true,
            stiffness: 144,
            dampingRatio: 1,
            leadTime: 0.14,
            maxLead: 58,
            maxImpulse: 18,
            impulseDuration: 0.24,
            teleportThreshold: 600,
            maxFrameDelta: 0.05,
            screenShakeScale: 0.1,
            attackImpulse: 0.35,
            dashImpulse: 10
        };

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        return {
            config: config,
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
            impulse: function (angle, amount) {
                if (!config.enabled) return;
                const magnitude = Math.max(0, Number(amount) || 0);
                if (magnitude === 0 || !Number.isFinite(Number(angle))) return;
                impulseX = clamp(Math.cos(angle) * magnitude, -config.maxImpulse, config.maxImpulse);
                impulseY = clamp(Math.sin(angle) * magnitude, -config.maxImpulse, config.maxImpulse);
                impulseAge = 0;
            },
            resetFollow: function () {
                followInitialized = false;
                velocityX = 0;
                velocityY = 0;
                leadX = 0;
                leadY = 0;
                impulseX = 0;
                impulseY = 0;
                impulseAge = 0;
                followKey = null;
            },
            follow: function (targetX, targetY, playerX, playerY, dt, bounds, key) {
                if (!Number.isFinite(targetX) || !Number.isFinite(targetY) ||
                    !Number.isFinite(playerX) || !Number.isFinite(playerY)) {
                    return followResult;
                }
                const step = clamp(Number(dt) || 0, 0, config.maxFrameDelta);
                const limits = bounds || {};
                const minX = Number.isFinite(limits.minX) ? limits.minX : -Infinity;
                const maxX = Number.isFinite(limits.maxX) ? Math.max(minX, limits.maxX) : Infinity;
                const minY = Number.isFinite(limits.minY) ? limits.minY : -Infinity;
                const maxY = Number.isFinite(limits.maxY) ? Math.max(minY, limits.maxY) : Infinity;
                let desiredX = clamp(targetX, minX, maxX);
                let desiredY = clamp(targetY, minY, maxY);

                if (!config.enabled) {
                    followInitialized = true;
                    followKey = key;
                    followedPlayerX = playerX;
                    followedPlayerY = playerY;
                    cameraX = desiredX;
                    cameraY = desiredY;
                    velocityX = 0;
                    velocityY = 0;
                    leadX = 0;
                    leadY = 0;
                    impulseX = 0;
                    impulseY = 0;
                    impulseAge = 0;
                    followResult.x = cameraX;
                    followResult.y = cameraY;
                    return followResult;
                }

                const playerDeltaX = playerX - followedPlayerX;
                const playerDeltaY = playerY - followedPlayerY;
                const teleportLimit = config.teleportThreshold;
                const teleported = followInitialized &&
                    (Math.abs(playerDeltaX) > teleportLimit || Math.abs(playerDeltaY) > teleportLimit);
                if (!followInitialized || key !== followKey || teleported) {
                    followInitialized = true;
                    followKey = key;
                    followedPlayerX = playerX;
                    followedPlayerY = playerY;
                    cameraX = desiredX;
                    cameraY = desiredY;
                    velocityX = 0;
                    velocityY = 0;
                    leadX = 0;
                    leadY = 0;
                    impulseX = 0;
                    impulseY = 0;
                    impulseAge = 0;
                    followResult.x = cameraX;
                    followResult.y = cameraY;
                    return followResult;
                }

                if (step > 0) {
                    const playerVelocityX = clamp(playerDeltaX / step, -900, 900);
                    const playerVelocityY = clamp(playerDeltaY / step, -900, 900);
                    followedPlayerX = playerX;
                    followedPlayerY = playerY;
                    let targetLeadX = playerVelocityX * config.leadTime;
                    let targetLeadY = playerVelocityY * config.leadTime;
                    const leadLength = Math.hypot(targetLeadX, targetLeadY);
                    if (leadLength > config.maxLead) {
                        const factor = config.maxLead / leadLength;
                        targetLeadX *= factor;
                        targetLeadY *= factor;
                    }
                    const leadBlend = 1 - Math.exp(-step * 8);
                    leadX += (targetLeadX - leadX) * leadBlend;
                    leadY += (targetLeadY - leadY) * leadBlend;

                    desiredX = clamp(targetX + leadX, minX, maxX);
                    desiredY = clamp(targetY + leadY, minY, maxY);
                    const omega = Math.sqrt(config.stiffness);
                    const damping = 2 * config.dampingRatio * omega;
                    velocityX += (config.stiffness * (desiredX - cameraX) - damping * velocityX) * step;
                    velocityY += (config.stiffness * (desiredY - cameraY) - damping * velocityY) * step;
                    cameraX += velocityX * step;
                    cameraY += velocityY * step;
                    const boundedX = clamp(cameraX, minX, maxX);
                    const boundedY = clamp(cameraY, minY, maxY);
                    if (boundedX !== cameraX) velocityX = 0;
                    if (boundedY !== cameraY) velocityY = 0;
                    cameraX = boundedX;
                    cameraY = boundedY;
                    impulseAge += step;
                }

                const impulseProgress = config.impulseDuration > 0
                    ? clamp(1 - impulseAge / config.impulseDuration, 0, 1)
                    : 0;
                const impulseEase = impulseProgress * impulseProgress * (3 - 2 * impulseProgress);
                followResult.x = clamp(cameraX + impulseX * impulseEase, minX, maxX);
                followResult.y = clamp(cameraY + impulseY * impulseEase, minY, maxY);
                return followResult;
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
