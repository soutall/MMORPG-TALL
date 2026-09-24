window.vfxGuerreiroEscudos = window.vfxGuerreiroEscudos || [];
window.vfxGuerreiroEscudoHits = window.vfxGuerreiroEscudoHits || [];

if (!window.vfxListeners) {
    window.vfxListeners = [];
}

window.vfxListeners.push(function(dados) {
    if (dados.type === 'action_guerreiro_escudo') {
        let ownerId = dados.ownerId;
        let targetX = dados.targetX;
        let targetY = dados.targetY;
        
        let owner = window.obterPosicaoEntidade(ownerId);
        let startX = owner ? owner.x : (window.meuX || targetX);
        let startY = owner ? owner.y : (window.meuY || targetY);
        
        let dx = targetX - startX;
        let dy = targetY - startY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let speed = 700; // speed in pixels per second
        let duration = dist > 0 ? (dist / speed) * 1000 : 300; // ms
        
        window.vfxGuerreiroEscudos.push({
            ownerId: ownerId,
            startX: startX,
            startY: startY,
            targetX: targetX,
            targetY: targetY,
            startTime: Date.now(),
            duration: duration,
            trail: []
        });
    } else if (dados.type === 'action_guerreiro_escudo_hit') {
        let x = dados.x;
        let y = dados.y;
        
        let particles = [];
        for (let i = 0; i < 25; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 200 + 50;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: Math.random() > 0.5 ? '#FFD700' : '#FFFFFF' // golden or silver
            });
        }
        
        window.vfxGuerreiroEscudoHits.push({
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 400, // ms
            particles: particles,
            maxRadius: 70
        });
    }
});

window.desenharVfxGuerreiroEscudo = function(ctx) {
    let now = Date.now();
    
    // Draw traveling shields
    for (let i = window.vfxGuerreiroEscudos.length - 1; i >= 0; i--) {
        let vfx = window.vfxGuerreiroEscudos[i];
        let elapsed = now - vfx.startTime;
        let progress = elapsed / vfx.duration;
        
        if (progress >= 1) {
            window.vfxGuerreiroEscudos.splice(i, 1);
            continue;
        }
        
        let currentX = vfx.startX + (vfx.targetX - vfx.startX) * progress;
        let currentY = vfx.startY + (vfx.targetY - vfx.startY) * progress;
        
        vfx.trail.push({ x: currentX, y: currentY, time: now });
        // Keep trail length based on time (last 200ms)
        while (vfx.trail.length > 0 && now - vfx.trail[0].time > 200) {
            vfx.trail.shift();
        }
        
        let owner = window.obterPosicaoEntidade(vfx.ownerId || ownerId);
        let linkX = owner ? owner.x : vfx.startX;
        let linkY = owner ? owner.y : vfx.startY;
        
        // Draw Semi-transparent Chain
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(linkX, linkY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]); // Gives a chain-like dashed look
        ctx.stroke();
        ctx.restore();
        
        // Draw Golden/Silver Trail
        ctx.save();
        if (vfx.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(vfx.trail[0].x, vfx.trail[0].y);
            for (let j = 1; j < vfx.trail.length; j++) {
                ctx.lineTo(vfx.trail[j].x, vfx.trail[j].y);
            }
            
            let grad = ctx.createLinearGradient(currentX, currentY, vfx.trail[0].x, vfx.trail[0].y);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0.8)'); // Solid Gold near shield
            grad.addColorStop(1, 'rgba(192, 192, 192, 0)'); // Fades to transparent Silver
            
            ctx.strokeStyle = grad;
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw Spinning Metallic Shield
        ctx.save();
        ctx.translate(currentX, currentY);
        let rotation = (now % 400) / 400 * Math.PI * 2; // Fast spin
        ctx.rotate(rotation);
        
        // Shield Base (Silver)
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#C0C0C0';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#808080';
        ctx.stroke();
        
        // Golden Inner Circle
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#B8860B';
        ctx.stroke();
        
        // Shield Cross Embellishment
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
        ctx.moveTo(0, -14); ctx.lineTo(0, 14);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Draw Impacts
    for (let i = window.vfxGuerreiroEscudoHits.length - 1; i >= 0; i--) {
        let hit = window.vfxGuerreiroEscudoHits[i];
        let elapsed = now - hit.startTime;
        let progress = elapsed / hit.duration;
        
        if (progress >= 1) {
            window.vfxGuerreiroEscudoHits.splice(i, 1);
            continue;
        }
        
        let alpha = 1 - progress;
        
        // Draw Shockwave (Outer)
        ctx.save();
        ctx.translate(hit.x, hit.y);
        ctx.beginPath();
        ctx.arc(0, 0, hit.maxRadius * progress, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`; // Golden wave
        ctx.lineWidth = 5 * alpha;
        ctx.stroke();
        
        // Draw Shockwave (Inner)
        ctx.beginPath();
        ctx.arc(0, 0, (hit.maxRadius * 0.5) * progress, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(192, 192, 192, ${alpha})`; // Silver wave
        ctx.lineWidth = 3 * alpha;
        ctx.stroke();
        ctx.restore();
        
        // Draw Particles (Sparks)
        let dt = 16 / 1000; // approximate frame delta for smooth physics
        ctx.save();
        for (let j = 0; j < hit.particles.length; j++) {
            let p = hit.particles[j];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.85; // friction drag
            p.vy *= 0.85;
            p.life -= dt * (1000 / hit.duration);
            if (p.life < 0) p.life = 0;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life * alpha;
            ctx.fill();
        }
        ctx.restore();
    }
};
