// efeitos/vfx_guerreiro_escudo.js — Lançamento do Escudo do Guerreiro com Puxão e Afterimage Trail
window.vfxGuerreiroEscudos = window.vfxGuerreiroEscudos || [];
window.vfxGuerreiroEscudoHits = window.vfxGuerreiroEscudoHits || [];

if (!window.vfxListeners) {
    window.vfxListeners = [];
}

window.vfxListeners.push(function(dados) {
    if (!dados) return;

    // Lançamento do escudo (ignora eventos de postura do Dash que usam dados.ativo)
    if (dados.type === 'action_guerreiro_escudo' || dados.type === 'action_guerreiro_escudo_lancamento') {
        if (dados.ativo !== undefined && !dados.lancamento) return; // ignora postura do dash

        let ownerId = dados.ownerId || dados.id;
        let owner = window.obterPosicaoEntidade(ownerId);
        let startX = (dados.startX !== undefined) ? dados.startX : (owner ? owner.x : (window.meuX || 0));
        let startY = (dados.startY !== undefined) ? dados.startY : (owner ? owner.y : (window.meuY || 0));

        let tx = (dados.targetX !== undefined) ? dados.targetX : (startX + 160);
        let ty = (dados.targetY !== undefined) ? dados.targetY : startY;

        let ang = (dados.ang !== undefined) ? dados.ang : Math.atan2(ty - startY, tx - startX);
        let maxDist = dados.maxDist || 300;
        let destX = startX + Math.cos(ang) * maxDist;
        let destY = startY + Math.sin(ang) * maxDist;

        let speed = 540; // pixels por segundo
        let duration = (maxDist / speed) * 1000; // ~550ms para 300px

        // Som de lançamento para outros jogadores
        if (ownerId !== window.meuId && typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('guerreiro_skill4', startX, startY);
        }

        window.vfxGuerreiroEscudos.push({
            id: Math.random(),
            ownerId: ownerId,
            startX: startX,
            startY: startY,
            destX: destX,
            destY: destY,
            ang: ang,
            currentX: startX,
            currentY: startY,
            startTime: Date.now(),
            duration: duration,
            state: 'indo', // 'indo', 'puxando', 'retornando'
            retractStartX: destX,
            retractStartY: destY,
            retractStartTime: 0,
            retractDuration: 380,
            mobId: null,
            afterimages: [],
            lastAfterimage: 0,
            trail: []
        });
    } else if (dados.type === 'action_guerreiro_escudo_hit') {
        let x = dados.x;
        let y = dados.y;
        let mobId = dados.mobId;
        let ownerId = dados.ownerId;
        let now = Date.now();

        // Encontra o escudo mais próximo ou do mesmo ownerId para acionar o retorno e puxão
        let vfxAlvo = null;
        let menorD = 99999;
        for (let i = 0; i < window.vfxGuerreiroEscudos.length; i++) {
            let v = window.vfxGuerreiroEscudos[i];
            if (v.state === 'indo') {
                if (ownerId && v.ownerId === ownerId) {
                    vfxAlvo = v;
                    break;
                }
                let d = Math.hypot(v.currentX - x, v.currentY - y);
                if (d < menorD) {
                    menorD = d;
                    vfxAlvo = v;
                }
            }
        }

        if (vfxAlvo) {
            vfxAlvo.state = 'puxando';
            vfxAlvo.mobId = mobId;
            vfxAlvo.retractStartX = x;
            vfxAlvo.retractStartY = y;
            vfxAlvo.retractStartTime = now;
            vfxAlvo.retractDuration = 420;
        }

        // Som de impacto metálico do escudo com proximidade
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('guerreiro_block', x, y);
        }

        // Partículas e faíscas metálicas douradas e prateadas do impacto
        let particles = [];
        for (let i = 0; i < 28; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 220 + 60;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: Math.random() > 0.4 ? '#FFD700' : '#E0E6ED'
            });
        }

        window.vfxGuerreiroEscudoHits.push({
            x: x,
            y: y,
            startTime: now,
            duration: 420,
            particles: particles,
            maxRadius: 75
        });
    }
});

window.desenharVfxGuerreiroEscudo = function(ctx) {
    if (!ctx) return;
    let now = Date.now();

    // 1. Escudos em movimento (indo ou retornando com o puxão)
    for (let i = window.vfxGuerreiroEscudos.length - 1; i >= 0; i--) {
        let vfx = window.vfxGuerreiroEscudos[i];
        let owner = window.obterPosicaoEntidade(vfx.ownerId);
        let ownerX = owner ? owner.x : vfx.startX;
        let ownerY = owner ? owner.y : vfx.startY;

        let currentX = vfx.startX;
        let currentY = vfx.startY;

        if (vfx.state === 'indo') {
            let elapsed = now - vfx.startTime;
            let progress = Math.min(1, elapsed / vfx.duration);
            currentX = vfx.startX + (vfx.destX - vfx.startX) * progress;
            currentY = vfx.startY + (vfx.destY - vfx.startY) * progress;

            if (progress >= 1) {
                // Chegou ao alcance máximo sem colidir: inicia o retorno suave
                vfx.state = 'retornando';
                vfx.retractStartX = vfx.destX;
                vfx.retractStartY = vfx.destY;
                vfx.retractStartTime = now;
                vfx.retractDuration = 360;
            }
        } else {
            // 'puxando' ou 'retornando'
            let elapsed = now - vfx.retractStartTime;
            let p = Math.min(1, elapsed / vfx.retractDuration);
            // Curva suave easeOutCubic
            let ease = 1 - Math.pow(1 - p, 3);
            currentX = vfx.retractStartX + (ownerX - vfx.retractStartX) * ease;
            currentY = vfx.retractStartY + (ownerY - vfx.retractStartY) * ease;

            // Se estiver puxando o monstro, sincroniza suavemente a posição do lacaio
            if (vfx.state === 'puxando' && vfx.mobId) {
                let listaS = window.listaSlimes || window.slimes;
                if (Array.isArray(listaS)) {
                    let mob = listaS.find(s => s && s.id === vfx.mobId);
                    if (mob && mob.hp > 0) {
                        mob.x = currentX;
                        mob.y = currentY;
                    }
                }
            }

            if (p >= 1) {
                window.vfxGuerreiroEscudos.splice(i, 1);
                continue;
            }
        }

        vfx.currentX = currentX;
        vfx.currentY = currentY;

        let spinSpeed = (vfx.state === 'indo') ? 220 : 340;
        let rotation = ((now % spinSpeed) / spinSpeed) * Math.PI * 2;

        // Armazena afterimages a cada ~22ms para formar o rastro de pós-imagem translúcida
        if (now - vfx.lastAfterimage >= 22) {
            vfx.lastAfterimage = now;
            vfx.afterimages.push({
                x: currentX,
                y: currentY,
                rot: rotation,
                time: now
            });
        }
        // Remove afterimages antigas (> 220ms)
        while (vfx.afterimages.length > 0 && now - vfx.afterimages[0].time > 220) {
            vfx.afterimages.shift();
        }

        // ==========================================
        // 1.1 DESENHA A CORRENTE RETRÁTIL
        // ==========================================
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ownerX + 12, ownerY + 16);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = (vfx.state === 'puxando') ? 'rgba(255, 215, 0, 0.75)' : 'rgba(210, 215, 225, 0.55)';
        ctx.lineWidth = (vfx.state === 'puxando') ? 3.5 : 2.5;
        ctx.setLineDash([7, 5]);
        ctx.stroke();
        ctx.restore();

        // ==========================================
        // 1.2 AFTERIMAGE TRAIL (Pós-imagem Translúcida)
        // ==========================================
        ctx.save();
        for (let j = 0; j < vfx.afterimages.length; j++) {
            let img = vfx.afterimages[j];
            let age = now - img.time;
            let alpha = Math.max(0, (1 - age / 220) * 0.40);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(img.x, img.y);
            ctx.rotate(img.rot);

            // Silhueta fantasma dourada/metálica
            ctx.beginPath();
            ctx.arc(0, 0, 17, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.stroke();

            // Cruz central do fantasma
            ctx.beginPath();
            ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
            ctx.moveTo(0, -12); ctx.lineTo(0, 12);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();

        // ==========================================
        // 1.3 ESCUDO METÁLICO PRINCIPAL GIRATÓRIO
        // ==========================================
        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(rotation);

        // Halo de energia externa
        let haloGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, 24);
        haloGlow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
        haloGlow.addColorStop(0.6, 'rgba(255, 180, 0, 0.2)');
        haloGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = haloGlow;
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();

        // Base de Aço Maciço
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        let gradAco = ctx.createLinearGradient(-18, -18, 18, 18);
        gradAco.addColorStop(0, '#EAECEE');
        gradAco.addColorStop(0.5, '#BDC3C7');
        gradAco.addColorStop(1, '#7F8C8D');
        ctx.fillStyle = gradAco;
        ctx.fill();
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = '#34495E';
        ctx.stroke();

        // Aro Interno Dourado
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        let gradOuro = ctx.createLinearGradient(-11, -11, 11, 11);
        gradOuro.addColorStop(0, '#FFF275');
        gradOuro.addColorStop(0.5, '#F1C40F');
        gradOuro.addColorStop(1, '#D68910');
        ctx.fillStyle = gradOuro;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#B7950B';
        ctx.stroke();

        // Cruz Heráldica Branca com Relevo
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
        ctx.moveTo(0, -14); ctx.lineTo(0, 14);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Núcleo central
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2C3E50';
        ctx.fill();

        ctx.restore();
    }

    // 2. Ondas de Choque e Faíscas dos Impactos
    for (let i = window.vfxGuerreiroEscudoHits.length - 1; i >= 0; i--) {
        let hit = window.vfxGuerreiroEscudoHits[i];
        let elapsed = now - hit.startTime;
        let progress = elapsed / hit.duration;

        if (progress >= 1) {
            window.vfxGuerreiroEscudoHits.splice(i, 1);
            continue;
        }

        let alpha = 1 - progress;

        // Onda Dourada Externa
        ctx.save();
        ctx.translate(hit.x, hit.y);
        ctx.beginPath();
        ctx.arc(0, 0, hit.maxRadius * progress, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.9})`;
        ctx.lineWidth = 5 * alpha;
        ctx.stroke();

        // Onda Prateada Interna
        ctx.beginPath();
        ctx.arc(0, 0, (hit.maxRadius * 0.55) * progress, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 3.5 * alpha;
        ctx.stroke();
        ctx.restore();

        // Faíscas de Impacto
        let dt = 16 / 1000;
        ctx.save();
        for (let j = 0; j < hit.particles.length; j++) {
            let p = hit.particles[j];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.88;
            p.vy *= 0.88;
            p.life -= dt * (1000 / hit.duration);
            if (p.life < 0) p.life = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, 3.5 * p.life), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life * alpha;
            ctx.fill();
        }
        ctx.restore();
    }
};
