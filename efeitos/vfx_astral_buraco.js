if (typeof window.vfxListeners === 'undefined') {
    window.vfxListeners = [];
}

window.vfxAstralBuracos = [];

window.vfxListeners.push(function(dados) {
    if (dados.type === 'action_astral_buraco_negro') {
        window.vfxAstralBuracos.push({
            ownerId: dados.ownerId,
            x: dados.targetX,
            y: dados.targetY,
            time: 0,
            phase: 'suction', // 'suction', 'collapse', 'explode'
            particles: [],
            accretionAngle: 0,
            radius: 0
        });
    } else if (dados.type === 'action_astral_buraco_negro_end') {
        const bh = window.vfxAstralBuracos.find(b => b.ownerId === dados.ownerId && b.phase === 'suction');
        if (bh) {
            bh.phase = 'collapse';
            bh.collapseTime = 0;
            if (dados.x !== undefined) bh.x = dados.x;
            if (dados.y !== undefined) bh.y = dados.y;
        }
    }
});

window.desenharVfxAstralBuraco = function(ctx) {
    const dt = 16.6; // Approximation for 60fps
    
    for (let i = window.vfxAstralBuracos.length - 1; i >= 0; i--) {
        const bh = window.vfxAstralBuracos[i];
        bh.time += dt;

        ctx.save();
        ctx.translate(bh.x, bh.y);

        if (bh.phase === 'suction') {
            // Grow radius up to 45
            if (bh.radius < 45) {
                bh.radius += 1.5;
            }
            bh.accretionAngle += 0.08;

            // Generate suction particles
            if (Math.random() < 0.6) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 150 + Math.random() * 80;
                bh.particles.push({
                    angle: angle,
                    dist: dist,
                    speed: 3 + Math.random() * 4,
                    color: Math.random() > 0.5 ? '#8A2BE2' : '#00FFFF', // purple or cyan
                    size: 1 + Math.random() * 2
                });
            }

            // Draw accretion disk glow
            const gradient = ctx.createRadialGradient(0, 0, bh.radius * 0.8, 0, 0, bh.radius * 3);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(0.2, 'rgba(75, 0, 130, 0.9)'); // indigo
            gradient.addColorStop(0.5, 'rgba(0, 0, 139, 0.5)'); // dark blue
            gradient.addColorStop(0.8, 'rgba(0, 255, 255, 0.2)'); // cyan
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, bh.radius * 3, 0, Math.PI * 2);
            ctx.fill();

            // Distortion lines (gravitational lensing effect)
            ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)';
            ctx.lineWidth = 1.5;
            for (let j = 0; j < 4; j++) {
                ctx.beginPath();
                ctx.arc(0, 0, bh.radius + 15 + Math.random() * 30, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Swirling accretion matter
            ctx.rotate(bh.accretionAngle);
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.arc(0, 0, bh.radius * 1.6, j * Math.PI * 2/3, j * Math.PI * 2/3 + Math.PI/2);
                ctx.strokeStyle = 'rgba(148, 0, 211, 0.6)';
                ctx.lineWidth = 6;
                ctx.stroke();
            }
            ctx.rotate(-bh.accretionAngle);

            // The Pitch-Black Hole Center
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
            ctx.fill();

            // Event Horizon glow edge
            ctx.strokeStyle = '#4B0082';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Suction particles spiraling in
            for (let p = bh.particles.length - 1; p >= 0; p--) {
                const part = bh.particles[p];
                part.angle += 0.12; // spiral angle speed
                part.dist -= part.speed;
                
                if (part.dist <= bh.radius) {
                    bh.particles.splice(p, 1);
                    continue;
                }
                
                const px = Math.cos(part.angle) * part.dist;
                const py = Math.sin(part.angle) * part.dist;
                
                ctx.fillStyle = part.color;
                ctx.beginPath();
                ctx.arc(px, py, part.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Light trails for particles
                ctx.strokeStyle = part.color;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(px, py);
                const tailX = Math.cos(part.angle - 0.25) * (part.dist + part.speed * 2.5);
                const tailY = Math.sin(part.angle - 0.25) * (part.dist + part.speed * 2.5);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Fallback expiration (around 5s) if server fails to send _end
            if (bh.time > 5000) {
                bh.phase = 'collapse';
                bh.collapseTime = 0;
            }

        } else if (bh.phase === 'collapse') {
            bh.collapseTime += dt;
            bh.radius -= 3; // fast collapse
            
            if (bh.radius <= 0) {
                bh.radius = 0;
                bh.phase = 'explode';
                bh.explodeTime = 0;
            } else {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (bh.phase === 'explode') {
            bh.explodeTime += dt;
            const progress = bh.explodeTime / 800; // 0.8s explosion duration
            const currentRadius = progress * 200;
            const alpha = Math.max(0, 1 - progress);

            // Supernova shockwave
            const expGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
            expGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            expGrad.addColorStop(0.3, `rgba(238, 130, 238, ${alpha})`); // violet
            expGrad.addColorStop(0.6, `rgba(138, 43, 226, ${alpha * 0.6})`); // blue violet
            expGrad.addColorStop(1, `rgba(0, 0, 0, 0)`);

            ctx.fillStyle = expGrad;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Exploding energy rays
            ctx.strokeStyle = `rgba(255, 0, 255, ${alpha})`;
            ctx.lineWidth = 3;
            for(let j = 0; j < 12; j++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const a = (j * Math.PI * 2 / 12) + (bh.explodeTime * 0.002);
                const rayLength = currentRadius * (0.8 + Math.random() * 0.4);
                ctx.lineTo(Math.cos(a) * rayLength, Math.sin(a) * rayLength);
                ctx.stroke();
            }

            if (bh.explodeTime > 800) {
                window.vfxAstralBuracos.splice(i, 1);
            }
        }

        ctx.restore();
    }
};
