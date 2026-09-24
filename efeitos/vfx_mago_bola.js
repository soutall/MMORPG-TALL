window.vfxListeners = window.vfxListeners || [];
window.vfxMagoBolas = [];
window.vfxMagoBolasHits = [];

// Helper function to find player starting position
function window.obterPosicaoEntidade(ownerId) {
    if (window.jogadores && window.jogadores[ownerId]) {
        return { x: window.jogadores[ownerId].x, y: window.jogadores[ownerId].y };
    }
    if (window.players && window.players[ownerId]) {
        return { x: window.players[ownerId].x, y: window.players[ownerId].y };
    }
    return { x: 0, y: 0 }; // Fallback if player object not found
}

window.vfxListeners.push(function(dados) {
    if (dados.type === 'action_mago_bola_elemental') {
        const p = window.obterPosicaoEntidade(dados.ownerId);
        window.vfxMagoBolas.push({
            id: dados.id,
            x: p.x,
            y: p.y,
            targetX: dados.targetX,
            targetY: dados.targetY,
            ballType: 'normal',
            progress: 0,
            startTime: Date.now(),
            duration: 800, // Travel time in ms
            particles: [],
            startX: p.x,
            startY: p.y
        });
    } else if (dados.type === 'action_mago_bola_transform') {
        const ball = window.vfxMagoBolas.find(b => b.id === dados.id);
        if (ball) {
            ball.ballType = dados.newType; // 'gelo' or 'fogo'
            // If the server provides updated coords during transform
            if (dados.x !== undefined) ball.x = dados.x;
            if (dados.y !== undefined) ball.y = dados.y;
            
            // Add a burst of particles on transform
            for(let i=0; i<15; i++) {
                ball.particles.push({
                    x: ball.x,
                    y: ball.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 1,
                    maxLife: 20 + Math.random() * 20
                });
            }
        }
    } else if (dados.type === 'action_mago_bola_hit') {
        window.vfxMagoBolasHits.push({
            x: dados.x,
            y: dados.y,
            ballType: dados.ballType || 'normal',
            startTime: Date.now(),
            duration: 600,
            particles: []
        });
    }
});

window.desenharVfxMagoBola = function(ctx) {
    const now = Date.now();

    // 1. Draw Active Balls
    for (let i = window.vfxMagoBolas.length - 1; i >= 0; i--) {
        const ball = window.vfxMagoBolas[i];
        const elapsed = now - ball.startTime;
        const t = Math.min(elapsed / ball.duration, 1);
        
        // Interpolate position towards target
        ball.x = ball.startX + (ball.targetX - ball.startX) * t;
        ball.y = ball.startY + (ball.targetY - ball.startY) * t;
        
        // Spawn trail particles
        if (Math.random() > 0.1) {
            ball.particles.push({
                x: ball.x + (Math.random() - 0.5) * 15,
                y: ball.y + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                life: 1,
                maxLife: 15 + Math.random() * 15
            });
        }
        
        // Update and draw particles
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for(let j = ball.particles.length - 1; j >= 0; j--) {
            let p = ball.particles[j];
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            
            if (p.life >= p.maxLife) {
                ball.particles.splice(j, 1);
                continue;
            }
            
            const lifeRatio = 1 - (p.life / p.maxLife);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6 * lifeRatio, 0, Math.PI * 2);
            
            if (ball.ballType === 'gelo') {
                ctx.fillStyle = `rgba(100, 255, 255, ${lifeRatio})`;
            } else if (ball.ballType === 'fogo') {
                ctx.fillStyle = `rgba(255, 100, 0, ${lifeRatio})`;
            } else {
                ctx.fillStyle = `rgba(180, 50, 255, ${lifeRatio})`; // Arcane
            }
            ctx.fill();
        }
        ctx.restore();
        
        // Draw main elemental ball
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(elapsed * 0.015);
        ctx.globalCompositeOperation = 'lighter';
        
        let outerColor, innerColor, glowColor;
        if (ball.ballType === 'gelo') {
            outerColor = 'rgba(0, 200, 255, 0.8)';
            innerColor = 'white';
            glowColor = 'cyan';
        } else if (ball.ballType === 'fogo') {
            outerColor = 'rgba(255, 80, 0, 0.8)';
            innerColor = 'yellow';
            glowColor = 'red';
        } else { // normal/arcane
            outerColor = 'rgba(150, 0, 255, 0.8)';
            innerColor = 'magenta';
            glowColor = 'purple';
        }

        ctx.shadowBlur = 25;
        ctx.shadowColor = glowColor;
        
        // Core outer
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = outerColor;
        ctx.fill();
        
        // Core inner
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = innerColor;
        ctx.fill();
        
        // Elemental specific visual flair
        if (ball.ballType === 'gelo') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            for(let j=0; j<4; j++) {
                ctx.rotate(Math.PI/2);
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(6, 6);
                ctx.lineTo(-6, 6);
                ctx.fill();
            }
        } else if (ball.ballType === 'fogo') {
            ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
            for(let j=0; j<5; j++) {
                ctx.rotate((Math.PI*2)/5);
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(8, 0);
                ctx.lineTo(-8, 0);
                ctx.fill();
            }
        } else {
            // Arcane rings
            ctx.rotate(-elapsed * 0.03); // Counter rotation
            ctx.strokeStyle = 'rgba(255, 100, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 22, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Cleanup reached balls.
        // Hits are driven by 'action_mago_bola_hit' so we just clear when duration expires.
        if (t >= 1) {
            window.vfxMagoBolas.splice(i, 1);
        }
    }
    
    // 2. Draw Hits / Explosions
    for (let i = window.vfxMagoBolasHits.length - 1; i >= 0; i--) {
        const hit = window.vfxMagoBolasHits[i];
        const elapsed = now - hit.startTime;
        const lifeRatio = Math.max(0, 1 - (elapsed / hit.duration));
        
        if (elapsed > hit.duration) {
            window.vfxMagoBolasHits.splice(i, 1);
            continue;
        }
        
        // Initialize particles on first frame
        if (hit.particles.length === 0) {
            let numParticles = hit.ballType === 'fogo' ? 60 : (hit.ballType === 'gelo' ? 40 : 30);
            for (let j = 0; j < numParticles; j++) {
                hit.particles.push({
                    x: 0,
                    y: 0,
                    vx: (Math.random() - 0.5) * (hit.ballType === 'fogo' ? 20 : 12),
                    vy: (Math.random() - 0.5) * (hit.ballType === 'fogo' ? 20 : 12),
                    size: Math.random() * 6 + 2,
                    angle: Math.random() * Math.PI * 2
                });
            }
        }
        
        ctx.save();
        ctx.translate(hit.x, hit.y);
        ctx.globalCompositeOperation = 'lighter';
        
        if (hit.ballType === 'gelo') {
            // Frost nova shatter
            let radius = (1 - lifeRatio) * 70;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.lineWidth = lifeRatio * 6;
            ctx.strokeStyle = `rgba(100, 255, 255, ${lifeRatio})`;
            ctx.stroke();
            
            // Shatter pieces
            hit.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle + elapsed * 0.01);
                ctx.fillStyle = `rgba(200, 255, 255, ${lifeRatio})`;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            });
            
        } else if (hit.ballType === 'fogo') {
            // Huge fiery explosion
            let radius = (1 - lifeRatio) * 90;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 0, ${lifeRatio * 0.4})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 150, 0, ${lifeRatio * 0.6})`;
            ctx.fill();
            
            hit.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 50, ${lifeRatio})`;
                ctx.fill();
            });
            
            // Optional basic screen shake concept could be applied if ctx allows global translation
            // ctx.translate((Math.random()-0.5)*10*lifeRatio, (Math.random()-0.5)*10*lifeRatio);
            
        } else {
            // Normal / Arcane blast
            let radius = (1 - lifeRatio) * 60;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.lineWidth = lifeRatio * 10;
            ctx.strokeStyle = `rgba(180, 50, 255, ${lifeRatio})`;
            ctx.stroke();
            
            hit.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 150, 255, ${lifeRatio})`;
                ctx.fill();
            });
        }
        
        ctx.restore();
    }
};
