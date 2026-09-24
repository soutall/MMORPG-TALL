if (!window.vfxListeners) window.vfxListeners = [];
if (!window.vfxBarbaroVinculos) window.vfxBarbaroVinculos = {};

window.vfxListeners.push(function(dados) {
    if (dados.type === 'action_barbaro_vinculo') {
        window.vfxBarbaroVinculos[dados.ownerId] = {
            active: true,
            targetId: dados.targetId,
            time: 0,
            shards: [],
            skullsFade: 1
        };
    } else if (dados.type === 'action_barbaro_vinculo_end') {
        const vfx = window.vfxBarbaroVinculos[dados.ownerId];
        if (vfx && vfx.active) {
            vfx.active = false;
            // Generate shards along the line
            const owner = window.obterPosicaoEntidade(dados.ownerId);
            const target = window.slimes && window.slimes.find(s => s.id === vfx.targetId);
            if (owner && target) {
                const dx = target.x - owner.x;
                const dy = target.y - owner.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const count = Math.floor(dist / 10);
                for(let i=0; i<count; i++) {
                    const f = i / count;
                    vfx.shards.push({
                        x: owner.x + dx * f + (Math.random()-0.5)*20,
                        y: owner.y + dy * f + (Math.random()-0.5)*20,
                        vx: (Math.random()-0.5)*5,
                        vy: (Math.random()-0.5)*5,
                        life: 1.0,
                        size: Math.random() * 4 + 2
                    });
                }
            }
        }
    }
});

window.desenharVfxBarbaroVinculo = function(ctx) {
    for (const ownerId in window.vfxBarbaroVinculos) {
        const vfx = window.vfxBarbaroVinculos[ownerId];
        const owner = window.obterPosicaoEntidade(ownerId);
        const target = window.slimes && window.slimes.find(s => s.id === vfx.targetId);
        
        if (!owner) continue;

        if (vfx.active && target) {
            vfx.time += 0.1;
            
            // Draw spectral chain
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(owner.x, owner.y);
            
            // Wavy line
            const dx = target.x - owner.x;
            const dy = target.y - owner.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const segments = Math.floor(dist / 15);
            
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const wave = Math.sin(t * Math.PI * 4 + vfx.time * 5) * 10;
                const perpX = -dy / dist * wave;
                const perpY = dx / dist * wave;
                ctx.lineTo(owner.x + dx * t + perpX, owner.y + dy * t + perpY);
            }
            ctx.lineTo(target.x, target.y);
            
            ctx.strokeStyle = 'rgba(180, 0, 0, ' + (0.6 + Math.sin(vfx.time*10)*0.2) + ')';
            ctx.lineWidth = 6 + Math.sin(vfx.time*15)*2;
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = -vfx.time * 20;
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(255, 50, 50, ' + (0.8 + Math.sin(vfx.time*10)*0.2) + ')';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.stroke();
            ctx.restore();
            
            // Draw skull / aura
            const drawSkull = (x, y, scale) => {
                ctx.save();
                ctx.translate(x, y - 40 - Math.sin(vfx.time * 3) * 10);
                ctx.scale(scale, scale);
                
                // Roaring skull
                ctx.fillStyle = 'rgba(200, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
                ctx.beginPath();
                ctx.arc(0, -5, 15, Math.PI, 0);
                ctx.lineTo(10, 15 + Math.sin(vfx.time*20)*5); // Roaring jaw
                ctx.lineTo(-10, 15 + Math.sin(vfx.time*20)*5);
                ctx.fill();
                
                // Eyes
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(-6, -5, 4, 0, Math.PI * 2);
                ctx.arc(6, -5, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Eye glow
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(-6, -5, 2, 0, Math.PI * 2);
                ctx.arc(6, -5, 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            };
            
            drawSkull(owner.x, owner.y, 1.2 * vfx.skullsFade);
            drawSkull(target.x, target.y, 1.0 * vfx.skullsFade);
            
        } else if (!vfx.active) {
            // Shatter / Fade
            if (vfx.skullsFade > 0) {
                vfx.skullsFade -= 0.05;
                if (vfx.skullsFade < 0) vfx.skullsFade = 0;
                
                // Draw skulls fading out
                const targetEnd = window.slimes && window.slimes.find(s => s.id === vfx.targetId);
                
                const drawSkullFade = (x, y, scale) => {
                    ctx.save();
                    ctx.globalAlpha = vfx.skullsFade;
                    ctx.translate(x, y - 40);
                    ctx.scale(scale, scale);
                    ctx.fillStyle = 'rgba(200, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(0, 0, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
                    ctx.beginPath();
                    ctx.arc(0, -5, 15, Math.PI, 0);
                    ctx.lineTo(10, 15);
                    ctx.lineTo(-10, 15);
                    ctx.fill();
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(-6, -5, 4, 0, Math.PI * 2);
                    ctx.arc(6, -5, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'red';
                    ctx.beginPath();
                    ctx.arc(-6, -5, 2, 0, Math.PI * 2);
                    ctx.arc(6, -5, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                };
                
                if (owner) drawSkullFade(owner.x, owner.y, 1.2);
                if (targetEnd) drawSkullFade(targetEnd.x, targetEnd.y, 1.0);
            }
            
            if (vfx.shards.length > 0) {
                ctx.save();
                vfx.shards.forEach(s => {
                    s.x += s.vx;
                    s.y += s.vy;
                    s.vy += 0.2; // Gravity
                    s.life -= 0.03;
                    if (s.life > 0) {
                        ctx.fillStyle = 'rgba(255, 0, 0, ' + s.life + ')';
                        ctx.beginPath();
                        ctx.rect(s.x, s.y, s.size, s.size);
                        ctx.fill();
                    }
                });
                vfx.shards = vfx.shards.filter(s => s.life > 0);
                ctx.restore();
            }
            
            if (vfx.shards.length === 0 && vfx.skullsFade <= 0) {
                delete window.vfxBarbaroVinculos[ownerId];
            }
        }
    }
};
