window.vfxArqueiroSaltos = { windBlasts: [], afterimages: [], arrowRains: [], landingImpacts: [] };

window.vfxListeners = window.vfxListeners || [];

window.vfxListeners.push(function(dados) {
    if (!dados) return;
    
        if (dados.type === 'action_arqueiro_salto_chuva_up') {
        window.arqueirosNoAlto = window.arqueirosNoAlto || {};
        window.arqueirosNoAlto[dados.ownerId] = true;
        if (dados.ownerId === window.meuId) {
            window.arqueiroSaltoNoAlto = true;
            window.arqueiroSaltoEmAndamento = true;
            // Auto-ativar mira para a chuva de flechas
            window.modoMiraSaltoChuva = true;
            let btn = document.getElementById('btn-arqueiro-salto');
            if (btn) btn.classList.add('aiming');
        }
        
        let jogador = window.obterPosicaoEntidade(dados.ownerId);
        let x = jogador ? jogador.x : 0;
        let y = jogador ? jogador.y : 0;

        window.vfxArqueiroSaltos.windBlasts.push({
            x: x, y: y,
            startTime: Date.now(),
            duration: 500,
            radius: 10
        });

        window.vfxArqueiroSaltos.afterimages.push({
            x: x, y: y,
            startTime: Date.now(),
            duration: 600,
            offsetY: 0
        });
    }

    if (dados.type === 'action_arqueiro_salto_chuva_shoot') {
        let arrows = [];
        for (let i = 0; i < 40; i++) {
            let angle = Math.random() * Math.PI * 2;
            let radius = Math.random() * 120;
            let targetX = dados.targetX + Math.cos(angle) * radius;
            let targetY = dados.targetY + Math.sin(angle) * radius;
            let delay = Math.random() * 1500; // stagger over 1.5 seconds

            arrows.push({
                targetX: targetX,
                targetY: targetY,
                delay: delay,
                startX: targetX - 300 + Math.random() * 600, // come from sky
                startY: targetY - 800 - Math.random() * 200,
                active: false,
                hit: false,
                trail: []
            });
        }

        let cx = Number.isFinite(dados.targetX) ? dados.targetX : (window.meuX || 0);
        let cy = Number.isFinite(dados.targetY) ? dados.targetY : (window.meuY || 0);
        window.vfxArqueiroSaltos.arrowRains.push({
            x: cx,
            y: cy,
            targetX: cx,
            targetY: cy,
            startTime: Date.now(),
            arrows: arrows,
            duration: 2500
        });
    }

        if (dados.type === 'action_arqueiro_salto_chuva_down') {
        window.arqueirosNoAlto = window.arqueirosNoAlto || {};
        window.arqueirosNoAlto[dados.ownerId] = false;
        if (dados.ownerId === window.meuId) {
            window.arqueiroSaltoNoAlto = false;
            window.arqueiroSaltoEmAndamento = false;
        }

        let jogador = window.obterPosicaoEntidade(dados.ownerId);
        let x = jogador ? jogador.x : 0;
        let y = jogador ? jogador.y : 0;

        window.vfxArqueiroSaltos.landingImpacts.push({
            x: x, y: y,
            startTime: Date.now(),
            duration: 600,
            radius: 5
        });
    }
});

window.desenharVfxArqueiroSalto = function(ctx) {
    if (!ctx) return;
    try {
        let now = Date.now();

    // Draw wind blasts (up)
    for (let i = window.vfxArqueiroSaltos.windBlasts.length - 1; i >= 0; i--) {
        let wb = window.vfxArqueiroSaltos.windBlasts[i];
        let elapsed = now - wb.startTime;
        if (elapsed > wb.duration) {
            window.vfxArqueiroSaltos.windBlasts.splice(i, 1);
            continue;
        }

        let progress = elapsed / wb.duration;
        ctx.save();
        ctx.translate(wb.x, wb.y);
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = '#e0f7fa';
        ctx.lineWidth = 5 * (1 - progress);
        ctx.beginPath();
        ctx.ellipse(0, 0, wb.radius + progress * 50, (wb.radius + progress * 50) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e0f7fa';
        for(let j=0; j<5; j++) {
            let a = Math.random() * Math.PI * 2;
            let d = progress * 80;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.5, 3 * (1-progress), 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Draw afterimages (up)
    for (let i = window.vfxArqueiroSaltos.afterimages.length - 1; i >= 0; i--) {
        let ai = window.vfxArqueiroSaltos.afterimages[i];
        let elapsed = now - ai.startTime;
        if (elapsed > ai.duration) {
            window.vfxArqueiroSaltos.afterimages.splice(i, 1);
            continue;
        }

        let progress = elapsed / ai.duration;
        let flyY = -progress * 300; // Fly up
        
        ctx.save();
        ctx.translate(ai.x, ai.y + flyY);
        ctx.globalAlpha = (1 - progress) * 0.7;
        ctx.fillStyle = '#80deea';
        // Draw simple aura/afterimage of player
        ctx.beginPath();
        ctx.ellipse(0, -20, 15, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw landing impacts (down)
    for (let i = window.vfxArqueiroSaltos.landingImpacts.length - 1; i >= 0; i--) {
        let li = window.vfxArqueiroSaltos.landingImpacts[i];
        let elapsed = now - li.startTime;
        if (elapsed > li.duration) {
            window.vfxArqueiroSaltos.landingImpacts.splice(i, 1);
            continue;
        }

        let progress = elapsed / li.duration;
        ctx.save();
        ctx.translate(li.x, li.y);
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = '#bcaaa4';
        ctx.lineWidth = 10 * (1 - progress);
        ctx.beginPath();
        ctx.ellipse(0, 0, li.radius + progress * 80, (li.radius + progress * 80) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#8d6e63';
        for(let j=0; j<8; j++) {
            let a = (Math.PI*2/8) * j + progress;
            let d = progress * 100;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.5 - progress * 20, 4 * (1-progress), 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
    // ===============================
// CHUVA DE FLECHAS — VFX REFINADO
// ===============================

for (let i = window.vfxArqueiroSaltos.arrowRains.length - 1; i >= 0; i--) {

    let ar = window.vfxArqueiroSaltos.arrowRains[i];
    let elapsed = now - ar.startTime;

    if (elapsed > ar.duration) {
        window.vfxArqueiroSaltos.arrowRains.splice(i, 1);
        continue;
    }

    ctx.save();
    ctx.translate(ar.x, ar.y);

    // ==========================================
    // RETÍCULA VERDE NO SOLO
    // ==========================================

    if (elapsed < 1500) {

        let fade = 1 - elapsed / 1500;
        let pulse = 0.65 + Math.sin(elapsed * 0.015) * 0.35;

        let tx = 0;
        let ty = 0;

        // Iluminação suave no chão
        let groundGlow = ctx.createRadialGradient(tx, ty, 10, tx, ty, 125);
        groundGlow.addColorStop(0, `rgba(46, 255, 120, ${0.18 * fade})`);
        groundGlow.addColorStop(0.45, `rgba(46, 204, 113, ${0.10 * fade})`);
        groundGlow.addColorStop(1, 'rgba(46, 204, 113, 0)');

        ctx.fillStyle = groundGlow;
        ctx.beginPath();
        ctx.arc(tx, ty, 125, 0, Math.PI * 2);
        ctx.fill();

        // Anel externo
        ctx.beginPath();
        ctx.arc(tx, ty, 120, 0, Math.PI * 2);

        ctx.strokeStyle =
            `rgba(46, 255, 120, ${0.75 * fade * pulse})`;

        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -elapsed * 0.055;
        ctx.shadowColor = 'rgba(46, 255, 120, 0.8)';
        ctx.shadowBlur = 12;

        ctx.stroke();

        // Segundo anel interno
        ctx.beginPath();
        ctx.arc(tx, ty, 94 + Math.sin(elapsed * 0.01) * 4, 0, Math.PI * 2);

        ctx.strokeStyle =
            `rgba(130, 255, 180, ${0.35 * fade * pulse})`;

        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 12]);
        ctx.lineDashOffset = elapsed * 0.04;

        ctx.stroke();

        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Cruz central de mira
        ctx.strokeStyle =
            `rgba(190, 255, 215, ${0.7 * fade * pulse})`;

        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(tx - 15, ty);
        ctx.lineTo(tx + 15, ty);
        ctx.moveTo(tx, ty - 15);
        ctx.lineTo(tx, ty + 15);
        ctx.stroke();
    }

    // ==========================================
    // FLECHAS
    // ==========================================

    for (let j = 0; j < ar.arrows.length; j++) {

        let a = ar.arrows[j];

        if (elapsed > a.delay && !a.hit) {

            let flyTime = Math.max(1, elapsed - a.delay);
            let t = flyTime / 300;

            if (t >= 1) {

                a.hit = true;
                a.hitTime = now;

            } else {

                let ax =
                    a.startX +
                    (a.targetX - a.startX) * t -
                    ar.x;

                let ay =
                    a.startY +
                    (a.targetY - a.startY) * t -
                    ar.y;

                let ang =
                    Math.atan2(
                        a.targetY - a.startY,
                        a.targetX - a.startX
                    );

                let dx = Math.cos(ang);
                let dy = Math.sin(ang);

                // Comprimento visual da flecha
                let length = 42;

                let tailX = ax - dx * length;
                let tailY = ay - dy * length;

                // ------------------------------------------
                // RASTRO LUMINOSO
                // ------------------------------------------

                ctx.save();

                ctx.lineCap = 'round';

                // Halo externo
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(tailX, tailY);

                ctx.strokeStyle = 'rgba(180, 255, 210, 0.18)';
                ctx.lineWidth = 7;
                ctx.shadowColor = 'rgba(80, 255, 150, 0.9)';
                ctx.shadowBlur = 12;
                ctx.stroke();

                // Núcleo do rastro
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(tailX, tailY);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.lineWidth = 2.2;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                ctx.shadowBlur = 5;
                ctx.stroke();

                // Pequeno núcleo verde próximo à ponta
                ctx.beginPath();
                ctx.moveTo(ax - dx * 5, ay - dy * 5);
                ctx.lineTo(ax - dx * 16, ay - dy * 16);

                ctx.strokeStyle = 'rgba(150, 255, 190, 0.95)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Ponta brilhante
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.shadowColor = 'rgba(100, 255, 160, 1)';
                ctx.shadowBlur = 10;

                ctx.beginPath();
                ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

        } else if (a.hit) {

            // ==========================================
            // IMPACTO NO SOLO
            // ==========================================

            let hitElapsed = now - (a.hitTime || now);

            if (hitElapsed < 300) {

                let p = hitElapsed / 300;
                let fade = 1 - p;

                let tx = a.targetX - ar.x;
                let ty = a.targetY - ar.y;

                // Flash central
                ctx.beginPath();
                ctx.arc(
                    tx,
                    ty,
                    7 + p * 13,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    `rgba(235, 255, 240, ${0.65 * fade})`;

                ctx.shadowColor =
                    'rgba(80, 255, 140, 0.9)';

                ctx.shadowBlur = 16;

                ctx.fill();

                ctx.shadowBlur = 0;

                // Onda de impacto
                ctx.beginPath();
                ctx.arc(
                    tx,
                    ty,
                    8 + p * 34,
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    `rgba(110, 255, 160, ${0.65 * fade})`;

                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Segunda onda
                ctx.beginPath();
                ctx.arc(
                    tx,
                    ty,
                    5 + p * 18,
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    `rgba(220, 255, 230, ${0.45 * fade})`;

                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Poeira e fragmentos
                for (let k = 0; k < 6; k++) {

                    let angle =
                        (Math.PI * 2 / 6) * k;

                    let dist =
                        p * (18 + k * 2);

                    let px =
                        tx +
                        Math.cos(angle) * dist;

                    let py =
                        ty +
                        Math.sin(angle) * dist;

                    ctx.fillStyle =
                        `rgba(190, 220, 195, ${0.55 * fade})`;

                    ctx.fillRect(
                        px - 1,
                        py - 1,
                        2,
                        2
                    );
                }
            }
        }
    }

    ctx.restore();
}
    } catch (errVfx) {
        console.error("Erro VFX Arqueiro Salto:", errVfx);
    }
};
