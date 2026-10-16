(function (root, factory) {
    'use strict';

    const createGrass = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = createGrass;
    if (typeof window !== 'undefined' && root === window) {
        root.GramaMundo = createGrass(function (x, y) {
            return !!(root.mapaMundo && typeof root.mapaMundo.ehTerrenoGrama === 'function' &&
                root.mapaMundo.ehTerrenoGrama(x, y));
        }, function (x, y) {
            return !!(root.mapaMundo && typeof root.mapaMundo.ehPlanicieCentral === 'function' &&
                root.mapaMundo.ehPlanicieCentral(x, y));
        });
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const CELL_WIDTH = 48;
    const CELL_HEIGHT = 42;
    const MAX_PATCHES = 360;
    const MAX_CACHE_SIZE = 8000;
    const BEND_RADIUS = 54;
    const CLUSTER_CELL_SIZE = 5;

    function hash(x, y) {
        let value = Math.imul(x ^ 0x2c1b3c6d, 0x297a2d39) ^
            Math.imul(y ^ 0x297a2d39, 0x1b56c4e9);
        value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
        value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
        return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
    }

    function smoothstep(value) {
        return value * value * (3 - 2 * value);
    }

    function clusterDensity(cellX, cellY) {
        const gridX = Math.floor(cellX / CLUSTER_CELL_SIZE);
        const gridY = Math.floor(cellY / CLUSTER_CELL_SIZE);
        const blendX = smoothstep((cellX - gridX * CLUSTER_CELL_SIZE) / CLUSTER_CELL_SIZE);
        const blendY = smoothstep((cellY - gridY * CLUSTER_CELL_SIZE) / CLUSTER_CELL_SIZE);
        const top = hash(gridX + 1201, gridY - 809) * (1 - blendX) +
            hash(gridX + 1202, gridY - 809) * blendX;
        const bottom = hash(gridX + 1201, gridY - 808) * (1 - blendX) +
            hash(gridX + 1202, gridY - 808) * blendX;
        return top * (1 - blendY) + bottom * blendY;
    }

    function createGrass(isGrassTerrain, isEnhancedTerrain) {
        const patches = new Map();
        const visiblePatches = [];
        const previousPlayers = new Map();
        let now = 0;
        let playerSnapshots = [];

        function createPatch(cellX, cellY) {
            const seed = hash(cellX, cellY);
            const x = (cellX + 0.18 + hash(cellX + 71, cellY - 19) * 0.64) * CELL_WIDTH;
            const y = (cellY + 0.18 + hash(cellX - 43, cellY + 53) * 0.64) * CELL_HEIGHT;
            if (!isGrassTerrain(x, y)) return null;

            const enhanced = typeof isEnhancedTerrain === 'function' && isEnhancedTerrain(x, y);
            const spawnChance = enhanced ? 0.12 + clusterDensity(cellX, cellY) * 0.62 : 0.43;
            if (seed > spawnChance) return null;
            const colorVariant = hash(cellX + 113, cellY + 211);
            const tuftVariant = hash(cellX + 401, cellY - 293);
            const patch = {
                x: x,
                y: y,
                z: y,
                phase: hash(cellX - 317, cellY + 127) * Math.PI * 2,
                height: enhanced
                    ? 13 + hash(cellX + 251, cellY - 97) * 8
                    : 9 + hash(cellX + 251, cellY - 97) * 8,
                bladeCount: enhanced ? 3 + Math.floor(tuftVariant * 5) : 3,
                fanWidth: enhanced ? 0.22 + hash(cellX - 227, cellY + 367) * 0.3 : 0,
                rootSpread: enhanced ? 0.7 + hash(cellX + 109, cellY + 317) * 0.8 : 1.1,
                enhanced: enhanced,
                bendRadius: enhanced ? 76 : BEND_RADIUS,
                bendScale: enhanced ? 1.35 : 1,
                lean: 0,
                leanX: 0,
                leanY: 0,
                color: enhanced
                    ? (colorVariant < 0.34 ? '#8edb58' : (colorVariant < 0.68 ? '#b4ed63' : '#dcf47a'))
                    : (colorVariant < 0.34 ? '#4f9a42' : (colorVariant < 0.68 ? '#68ad4e' : '#83b95b')),
                shade: enhanced
                    ? (colorVariant < 0.5 ? '#4b9c42' : '#68b94a')
                    : (colorVariant < 0.34 ? '#34783c' : '#4a8b3f'),
                draw: drawPatch
            };
            return patch;
        }

        function updatePlayers(players) {
            const snapshots = [];
            const seen = new Set();
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) continue;
                const id = String(player.id);
                if (seen.has(id)) continue;
                seen.add(id);
                const previous = previousPlayers.get(id);
                let directionX = 0;
                let directionY = 0;
                if (previous) {
                    const dx = player.x - previous.x;
                    const dy = player.y - previous.y;
                    const distance = Math.hypot(dx, dy);
                    if (distance > 0.15 && distance < 100) {
                        directionX = dx / distance;
                        directionY = dy / distance;
                    }
                }
                if (directionX === 0 && directionY === 0 && player.moving && Number.isFinite(player.angle)) {
                    directionX = Math.cos(player.angle);
                    directionY = Math.sin(player.angle);
                }
                previousPlayers.set(id, { x: player.x, y: player.y });
                if (player.moving || directionX !== 0 || directionY !== 0) {
                    snapshots.push({
                        x: player.x + 12,
                        y: player.y + 24,
                        directionX: directionX,
                        directionY: directionY
                    });
                }
            }
            for (const id of previousPlayers.keys()) {
                if (!seen.has(id)) previousPlayers.delete(id);
            }
            playerSnapshots = snapshots;
        }

        function drawPatch(ctx) {
            const breeze = Math.sin(now / (this.enhanced ? 650 : 850) + this.phase) *
                (this.enhanced ? 0.2 : 0.12);
            const bendX = this.leanX * this.bendScale + breeze;
            const bendY = this.leanY * this.bendScale;
            const height = this.height;

            ctx.save();
            ctx.globalAlpha = this.enhanced ? 0.96 : 0.78;
            ctx.lineCap = 'round';
            ctx.lineWidth = this.enhanced ? 2.3 : 1.7;
            ctx.strokeStyle = this.shade;
            ctx.beginPath();
            const bladeCount = this.bladeCount;
            const centerBlade = (bladeCount - 1) / 2;
            for (let blade = 0; blade < bladeCount; blade++) {
                const side = blade - centerBlade;
                const spread = this.enhanced ? side * height * this.fanWidth : side * 2.1;
                const rootX = this.x + side * this.rootSpread;
                const bladeHeight = height * (this.enhanced
                    ? 0.7 + (1 - Math.abs(side) / centerBlade) * 0.22
                    : 0.72 + blade * 0.12);
                const sway = bendX * bladeHeight * (this.enhanced ? 1.35 : 1.45) + breeze * (blade + 1) * 2.2;
                const lift = bendY * bladeHeight * (this.enhanced ? 0.8 : 0.55);
                ctx.moveTo(rootX, this.y);
                ctx.quadraticCurveTo(
                    rootX + spread * 0.45 + sway * 0.45,
                    this.y - bladeHeight * 0.58 + lift,
                    rootX + spread + sway,
                    this.y - bladeHeight + lift
                );
            }
            ctx.stroke();

            ctx.lineWidth = this.enhanced ? 1.1 : 0.8;
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 1);
            ctx.lineTo(this.x + bendX * height * 0.8, this.y - height * 0.55 + bendY * height * 0.4);
            ctx.stroke();
            ctx.restore();
        }

        function collect(cameraBounds, players, deltaFrames, timestamp, currentMap) {
            visiblePatches.length = 0;
            if (currentMap !== 'mundo' || !cameraBounds || typeof isGrassTerrain !== 'function') return visiblePatches;

            now = Number.isFinite(timestamp) ? timestamp : Date.now();
            updatePlayers(Array.isArray(players) ? players : []);
            const minCellX = Math.floor((cameraBounds.minX - 32) / CELL_WIDTH);
            const maxCellX = Math.floor((cameraBounds.maxX + 32) / CELL_WIDTH);
            const minCellY = Math.floor((cameraBounds.minY - 32) / CELL_HEIGHT);
            const maxCellY = Math.floor((cameraBounds.maxY + 32) / CELL_HEIGHT);
            const frameBlend = Math.min(1, Math.max(0.05, (Number(deltaFrames) || 1) * 0.18));

            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
                    const key = cellX + ':' + cellY;
                    let patch = patches.get(key);
                    if (patch === undefined) {
                        patch = createPatch(cellX, cellY) || null;
                        patches.set(key, patch);
                    }
                    if (!patch) continue;

                    let targetLean = 0;
                    let targetLeanX = 0;
                    let targetLeanY = 0;
                    let patchFrameBlend = frameBlend;
                    for (let i = 0; i < playerSnapshots.length; i++) {
                        const player = playerSnapshots[i];
                        const dx = patch.x - player.x;
                        const dy = patch.y - player.y;
                        const distance = Math.hypot(dx, dy);
                        if (distance >= patch.bendRadius) continue;
                        const strength = 1 - distance / patch.bendRadius;
                        if (strength > targetLean) {
                            targetLean = strength;
                            const bendStrength = patch.enhanced ? Math.pow(strength, 0.9) : strength;
                            targetLeanX = player.directionX * bendStrength;
                            targetLeanY = player.directionY * bendStrength;
                            if (patch.enhanced) patchFrameBlend = Math.min(1, Math.max(patchFrameBlend, (Number(deltaFrames) || 1) * 0.34));
                        }
                    }

                    patch.lean += (targetLean - patch.lean) * patchFrameBlend;
                    patch.leanX += (targetLeanX - patch.leanX) * patchFrameBlend;
                    patch.leanY += (targetLeanY - patch.leanY) * patchFrameBlend;
                    visiblePatches.push(patch);
                    if (visiblePatches.length >= MAX_PATCHES) break;
                }
                if (visiblePatches.length >= MAX_PATCHES) break;
            }

            if (patches.size > MAX_CACHE_SIZE) patches.clear();
            return visiblePatches;
        }

        return {
            collect: collect,
            getCachedPatchCount: function () { return patches.size; }
        };
    }

    return createGrass;
});
