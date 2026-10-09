(function (root, factory) {
    'use strict';

    const createCombatModule = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = createCombatModule;
    root.EnhancedModeModules = root.EnhancedModeModules || {};
    root.EnhancedModeModules.combat = createCombatModule();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    return function createCombatModule() {
        const pool = Array.from({ length: 64 }, function () {
            return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#ffe6a3' };
        });
        let cursor = 0;
        let enabled = false;

        function emitImpact(event) {
            if (!enabled || !event || !Number.isFinite(event.x) || !Number.isFinite(event.y)) return;
            const count = event.kind === 'boss' ? 16 : 8;
            const baseAngle = Number(event.angle) || 0;
            for (let i = 0; i < count; i++) {
                const particle = pool[cursor];
                cursor = (cursor + 1) % pool.length;
                const angle = baseAngle + (Math.PI * 2 * i / count);
                const speed = 1.2 + ((i * 7) % 5) * 0.42;
                particle.active = true;
                particle.x = event.x;
                particle.y = event.y;
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.life = particle.maxLife = 12 + (i % 5) * 2;
                particle.size = event.kind === 'boss' ? 2.6 : 1.8;
                particle.color = i % 3 === 0 ? '#fff4c2' : '#ed9a55';
            }
        }

        return {
            setEnabled: function (value) {
                enabled = !!value;
                if (!enabled) pool.forEach(function (particle) { particle.active = false; });
            },
            impact: emitImpact,
            update: function (dt, state) {
                if (!enabled) return;
                if (state && state.reducedMotion) {
                    pool.forEach(function (particle) { particle.active = false; });
                    return;
                }
                for (let i = 0; i < pool.length; i++) {
                    const particle = pool[i];
                    if (!particle.active) continue;
                    particle.x += particle.vx * dt;
                    particle.y += particle.vy * dt;
                    particle.vx *= Math.pow(0.94, dt);
                    particle.vy = particle.vy * Math.pow(0.94, dt) + 0.025 * dt;
                    particle.life -= dt;
                    if (particle.life <= 0) particle.active = false;
                }
            },
            render: function (ctx) {
                if (!enabled) return;
                for (let i = 0; i < pool.length; i++) {
                    const particle = pool[i];
                    if (!particle.active) continue;
                    const alpha = Math.max(0, particle.life / particle.maxLife);
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = particle.color;
                    ctx.lineWidth = particle.size * 0.65;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(particle.x - particle.vx * 1.8, particle.y - particle.vy * 1.8);
                    ctx.stroke();
                    ctx.restore();
                }
            },
            getParticleCount: function () { return pool.length; },
            getActiveParticleCount: function () {
                return pool.reduce(function (count, particle) { return count + (particle.active ? 1 : 0); }, 0);
            }
        };
    };
});
