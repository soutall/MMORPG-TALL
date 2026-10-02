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
        // 1.1 CORDA DE ENERGIA VERDE E DOURADA (Energy Tether)
        // Conforme arte de referência: puxando o inimigo com corda de energia esmeralda
        // ==========================================
        ctx.save();
        let ox = ownerX + 12, oy = ownerY + 16;
        let dx = currentX - ox, dy = currentY - oy;
        let dist = Math.hypot(dx, dy);
        let midChordX = (ox + currentX) / 2;
        let midChordY = (oy + currentY) / 2 - Math.sin(now / 150) * Math.min(22, dist * 0.15);

        // Brilho externo da corda de energia
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(midChordX, midChordY, currentX, currentY);
        ctx.strokeStyle = (vfx.state === 'puxando') ? 'rgba(46, 204, 113, 0.85)' : 'rgba(241, 196, 15, 0.65)';
        ctx.lineWidth = (vfx.state === 'puxando') ? 4.5 : 3.0;
        ctx.shadowColor = (vfx.state === 'puxando') ? '#2ecc71' : '#f1c40f';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Núcleo branco/esmeralda luminoso
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(midChordX, midChordY, currentX, currentY);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Nódulos de energia correndo ao longo da corda
        let qtdNodulos = Math.min(8, Math.max(3, Math.floor(dist / 32)));
        for (let k = 0; k < qtdNodulos; k++) {
            let tNod = ((now / 320) + (k / qtdNodulos)) % 1.0;
            if (vfx.state === 'puxando') tNod = 1.0 - tNod; // corre em direção ao guerreiro no puxão
            let nx = Math.pow(1 - tNod, 2) * ox + 2 * (1 - tNod) * tNod * midChordX + Math.pow(tNod, 2) * currentX;
            let ny = Math.pow(1 - tNod, 2) * oy + 2 * (1 - tNod) * tNod * midChordY + Math.pow(tNod, 2) * currentY;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(nx, ny, 3.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ==========================================
        // 1.2 AFTERIMAGE TRAIL DO ESCUDO OGIVAL
        // ==========================================
        ctx.save();
        for (let j = 0; j < vfx.afterimages.length; j++) {
            let img = vfx.afterimages[j];
            let age = now - img.time;
            let alpha = Math.max(0, (1 - age / 220) * 0.45);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(img.x, img.y);
            ctx.rotate(img.rot);

            // Silhueta translúcida do Kite Shield
            let wA = 22, hA = 32;
            let xA = -wA / 2, yA = -hA / 2;
            let midXA = 0;
            ctx.beginPath();
            ctx.moveTo(xA, yA + hA * 0.12);
            ctx.quadraticCurveTo(midXA, yA - 1, xA + wA, yA + hA * 0.12);
            ctx.lineTo(xA + wA, yA + hA * 0.44);
            ctx.quadraticCurveTo(xA + wA * 0.94, yA + hA * 0.78, midXA, yA + hA);
            ctx.quadraticCurveTo(xA + wA * 0.06, yA + hA * 0.78, xA, yA + hA * 0.44);
            ctx.closePath();

            ctx.fillStyle = 'rgba(241, 196, 15, 0.32)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();

        // ==========================================
        // 1.3 ESCUDO OGIVAL METÁLICO PRINCIPAL GIRATÓRIO COM LEÃO DOURADO
        // ==========================================
        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(rotation);

        // Halo de energia externa dourada/esmeralda
        let haloGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, 26);
        haloGlow.addColorStop(0, (vfx.state === 'puxando') ? 'rgba(46, 204, 113, 0.65)' : 'rgba(255, 215, 0, 0.55)');
        haloGlow.addColorStop(0.6, (vfx.state === 'puxando') ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 180, 0, 0.22)');
        haloGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGlow;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();

        // Dimensões do Kite Shield em voo
        let wS = 24, hS = 35;
        let xS = -wS / 2, yS = -hS / 2;
        let midS = 0;

        function pathKite(c, px, py, pw, ph) {
            c.beginPath();
            c.moveTo(px, py + ph * 0.12);
            c.quadraticCurveTo(px + pw / 2, py - 1.2, px + pw, py + ph * 0.12);
            c.lineTo(px + pw, py + ph * 0.44);
            c.quadraticCurveTo(px + pw * 0.94, py + ph * 0.78, px + pw / 2, py + ph);
            c.quadraticCurveTo(px + pw * 0.06, py + ph * 0.78, px, py + ph * 0.44);
            c.closePath();
        }

        // 1. Moldura Grossa Dourada Chanfrada
        pathKite(ctx, xS, yS, wS, hS);
        let gMold = ctx.createLinearGradient(xS, yS, xS + wS, yS + hS);
        gMold.addColorStop(0, '#fff48d');
        gMold.addColorStop(0.25, '#f1c40f');
        gMold.addColorStop(0.65, '#d4ac0d');
        gMold.addColorStop(1, '#7d6608');
        ctx.fillStyle = gMold;
        ctx.fill();
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = '#4e3d02';
        ctx.stroke();

        // 2. Campo Interno de Aço Temperado Azul-Metálico
        let pIn = 2.4;
        let xIn = xS + pIn, yIn = yS + pIn, wIn = wS - pIn * 2, hIn = hS - pIn * 2.2;
        pathKite(ctx, xIn, yIn, wIn, hIn);
        let gCamp = ctx.createLinearGradient(xIn, yIn, xIn + wIn, yIn + hIn);
        gCamp.addColorStop(0, '#667d94');
        gCamp.addColorStop(0.3, '#4a5b6c');
        gCamp.addColorStop(0.7, '#2c3945');
        gCamp.addColorStop(1, '#172027');
        ctx.fillStyle = gCamp;
        ctx.fill();
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.7)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 3. O LEÃO RAMPANTE DOURADO NO CENTRO DO ESCUDO GIRATÓRIO
        ctx.save();
        ctx.translate(0, 1.0);
        ctx.scale(1.4, 1.4);

        let gLeao = ctx.createLinearGradient(-5, -7, 5, 7);
        gLeao.addColorStop(0, '#fff9c4');
        gLeao.addColorStop(0.35, '#f1c40f');
        gLeao.addColorStop(0.75, '#d4ac0d');
        gLeao.addColorStop(1, '#8f6b08');
        ctx.fillStyle = gLeao;
        ctx.strokeStyle = '#5c4503';
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(-1.6, -6.8);
        ctx.lineTo(-3.4, -6.6); // boca rugindo
        ctx.lineTo(-4.0, -5.8);
        ctx.lineTo(-3.0, -5.4);
        ctx.lineTo(-3.8, -5.0);
        ctx.lineTo(-2.6, -4.4);
        ctx.lineTo(-3.2, -3.4);
        ctx.lineTo(-1.6, -3.0);
        ctx.lineTo(-2.4, -1.8);
        ctx.lineTo(-0.8, -1.4);
        // Peito
        ctx.lineTo(-1.0, 0.4);
        ctx.lineTo(-0.4, 2.0);
        // Pata dianteira inferior
        ctx.lineTo(-2.0, 0.8);
        ctx.lineTo(-3.6, 1.2);
        ctx.lineTo(-4.0, 0.8);
        ctx.lineTo(-3.0, 0.2);
        ctx.lineTo(-1.4, -0.2);
        // Pata dianteira superior
        ctx.lineTo(-2.6, -2.4);
        ctx.lineTo(-4.4, -3.0);
        ctx.lineTo(-5.0, -2.4);
        ctx.lineTo(-4.6, -1.8);
        ctx.lineTo(-3.4, -1.6);
        ctx.lineTo(-1.8, -1.0);
        // Dorso e perna traseira
        ctx.lineTo(0.6, -2.2);
        ctx.lineTo(1.4, 0.0);
        ctx.lineTo(2.0, 2.6);
        ctx.lineTo(0.8, 4.2);
        ctx.lineTo(-0.4, 5.6);
        ctx.lineTo(-1.0, 5.4);
        ctx.lineTo(0.2, 4.0);
        ctx.lineTo(1.0, 2.8);
        ctx.lineTo(1.6, 4.6);
        ctx.lineTo(2.4, 6.2);
        ctx.lineTo(3.0, 5.8);
        ctx.lineTo(2.2, 4.0);
        ctx.lineTo(1.6, 2.0);
        // Cauda em S
        ctx.lineTo(1.8, 0.6);
        ctx.quadraticCurveTo(3.6, -1.4, 4.0, -4.0);
        ctx.quadraticCurveTo(3.6, -6.2, 2.4, -6.6);
        ctx.lineTo(3.2, -7.6);
        ctx.lineTo(2.2, -8.0);
        ctx.lineTo(1.6, -7.0);
        ctx.lineTo(1.8, -6.0);
        ctx.quadraticCurveTo(2.8, -5.6, 2.8, -3.8);
        ctx.quadraticCurveTo(2.4, -1.6, 1.0, -0.2);
        // Topo da cabeça
        ctx.lineTo(0.4, -3.6);
        ctx.lineTo(0.6, -6.0);
        ctx.lineTo(-0.4, -7.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // 4. Rebites dourados nos cantos do escudo
        ctx.fillStyle = '#fff9c4';
        [
            [-wS / 2 + 2.5, -hS / 2 + 3.5],
            [0, -hS / 2 + 1.5],
            [wS / 2 - 2.5, -hS / 2 + 3.5],
            [-wS / 2 + 1.8, -hS / 2 + hS * 0.40],
            [wS / 2 - 1.8, -hS / 2 + hS * 0.40],
            [0, hS / 2 - 2.5]
        ].forEach(function (pt) {
            ctx.beginPath(); ctx.arc(pt[0], pt[1], 0.8, 0, Math.PI * 2); ctx.fill();
        });

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
