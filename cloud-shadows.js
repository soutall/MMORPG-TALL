(function (root) {
    'use strict';

    const MASK_WIDTH = 1024;
    const MASK_HEIGHT = 768;
    const config = {
        enabled: true,
        speed: 12,
        opacity: 0.68,
        scale: 1,
        density: 0.95,
        windX: 1,
        windY: 0.12
    };
    let maskCanvas = null;

    function createRandom(seed) {
        let value = seed >>> 0;
        return function () {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    }

    function createMask() {
        if (!root.document || typeof root.document.createElement !== 'function') return null;
        const canvas = root.document.createElement('canvas');
        canvas.width = MASK_WIDTH;
        canvas.height = MASK_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const random = createRandom(0x5c10d5);
        const clouds = [];
        for (let i = 0; i < 8; i++) {
            const cloud = {
                x: random() * MASK_WIDTH,
                y: random() * MASK_HEIGHT,
                lobes: []
            };
            const lobeCount = 4 + Math.floor(random() * 3);
            for (let j = 0; j < lobeCount; j++) {
                const angle = random() * Math.PI * 2;
                const distance = j === 0 ? 0 : 35 + random() * 105;
                cloud.lobes.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance * 0.55,
                    radiusX: 75 + random() * 75,
                    radiusY: 32 + random() * 48
                });
            }
            clouds.push(cloud);
        }

        for (let i = 0; i < clouds.length; i++) {
            const cloud = clouds[i];
            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    for (let j = 0; j < cloud.lobes.length; j++) {
                        const lobe = cloud.lobes[j];
                        const x = cloud.x + offsetX * MASK_WIDTH + lobe.x;
                        const y = cloud.y + offsetY * MASK_HEIGHT + lobe.y;
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.scale(lobe.radiusX, lobe.radiusY);
                        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
                        gradient.addColorStop(0, 'rgba(6, 10, 19, 0.62)');
                        gradient.addColorStop(0.42, 'rgba(6, 10, 19, 0.34)');
                        gradient.addColorStop(1, 'rgba(6, 10, 19, 0)');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(-1, -1, 2, 2);
                        ctx.restore();
                    }
                }
            }
        }

        return canvas;
    }

    function positiveModulo(value, modulus) {
        return ((value % modulus) + modulus) % modulus;
    }

    function daylightFactor(worldTime) {
        const hour = Number(worldTime && worldTime.horaDecimal);
        if (!Number.isFinite(hour)) return 0.85;
        const sunHeight = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
        return 0.24 + sunHeight * 0.76;
    }

    const api = {
        config: config,
        setEnabled: function (enabled) {
            config.enabled = !!enabled;
        },
        render: function (ctx, bounds, elapsedSeconds, worldTime) {
            if (!config.enabled || !ctx || !bounds) return 0;
            const scale = Number(config.scale);
            const density = Number(config.density);
            const opacity = Number(config.opacity);
            const speed = Number(config.speed);
            if (!Number.isFinite(scale) || scale <= 0 ||
                !Number.isFinite(density) || density <= 0 ||
                !Number.isFinite(opacity) || opacity <= 0 ||
                !Number.isFinite(speed)) return 0;

            if (!maskCanvas) maskCanvas = createMask();
            if (!maskCanvas) return 0;

            const tileWidth = MASK_WIDTH * scale;
            const tileHeight = MASK_HEIGHT * scale;
            const time = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
            const flowX = time * speed * (Number(config.windX) || 0);
            const flowY = time * speed * (Number(config.windY) || 0);
            const offsetX = positiveModulo(flowX, tileWidth);
            const offsetY = positiveModulo(flowY, tileHeight);
            const startX = Math.floor((bounds.minX - offsetX) / tileWidth) * tileWidth + offsetX;
            const startY = Math.floor((bounds.minY - offsetY) / tileHeight) * tileHeight + offsetY;
            const endX = bounds.maxX;
            const endY = bounds.maxY;

            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.min(1, opacity * density * daylightFactor(worldTime));
            let drawCount = 0;
            for (let y = startY; y < endY; y += tileHeight) {
                for (let x = startX; x < endX; x += tileWidth) {
                    ctx.drawImage(maskCanvas, x, y, tileWidth, tileHeight);
                    drawCount++;
                }
            }
            ctx.restore();
            return drawCount;
        }
    };

    Object.defineProperty(api, 'enabled', {
        enumerable: true,
        get: function () { return config.enabled; },
        set: function (enabled) { config.enabled = !!enabled; }
    });

    root.CloudShadows = api;
})(typeof window !== 'undefined' ? window : globalThis);
