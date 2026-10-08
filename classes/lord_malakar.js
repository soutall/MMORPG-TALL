(function () {
    'use strict';

    const TAU = Math.PI * 2;

    function path(ctx, points, close) {
        ctx.beginPath();
        points.forEach(function (point, index) {
            if (index === 0) ctx.moveTo(point[0], point[1]);
            else ctx.lineTo(point[0], point[1]);
        });
        if (close !== false) ctx.closePath();
    }

    function glowOrb(ctx, x, y, radius, color, blur) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur || 12;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    function drawBook(ctx, x, y, angle, time) {
        ctx.save();
        ctx.translate(x, y + Math.sin(time / 360) * 2);
        ctx.rotate(angle * 0.18 + Math.sin(time / 720) * 0.12);
        ctx.shadowColor = '#fa2347';
        ctx.shadowBlur = 13;
        ctx.fillStyle = '#130a10';
        path(ctx, [[-9, -12], [5, -14], [11, -9], [9, 11], [-5, 14], [-10, 8]]);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#b32b3e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = '#d09b54';
        ctx.lineWidth = 1;
        path(ctx, [[-5, -10], [4, -11], [7, -7], [6, 8], [-3, 10], [-6, 6]]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 10);
        ctx.stroke();
        ctx.fillStyle = '#ba233c';
        path(ctx, [[-3, -4], [0, -7], [3, -4], [0, 2]]);
        ctx.fill();
        glowOrb(ctx, 0, 0, 1.6, '#ff3955', 8);
        ctx.restore();
    }

    function drawLantern(ctx, x, y, time) {
        ctx.save();
        ctx.translate(x, y + Math.sin(time / 260) * 1.5);
        ctx.strokeStyle = '#aa824a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -3, 4, Math.PI, 0);
        ctx.lineTo(4, 4);
        ctx.stroke();
        ctx.fillStyle = '#28191a';
        path(ctx, [[-4, -3], [4, -3], [3, 5], [-3, 5]]);
        ctx.fill();
        ctx.strokeStyle = '#d3a45e';
        ctx.stroke();
        glowOrb(ctx, 0, 1, 1.8, '#ff314b', 12);
        ctx.restore();
    }

    function drawBloodDrips(ctx, time, seed) {
        for (let i = 0; i < 5; i++) {
            const phase = ((time / 280 + i * 0.71 + seed * 0.31) % 1);
            const x = Math.sin(i * 12.7 + seed) * (5 + i % 3);
            const y = -19 + phase * 43;
            const alpha = Math.min(1, (1 - phase) * 2.4);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = i % 2 ? '#ff304e' : '#a80d28';
            ctx.lineWidth = i % 2 ? 1.8 : 1.2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.sin(phase * 8 + i) * 1.4, y + 4 + phase * 2);
            ctx.stroke();
            ctx.fillStyle = '#e41f3e';
            ctx.beginPath();
            ctx.ellipse(x, y + 5 + phase * 2, 1, 1.7, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawMalakar(x, y, isMoving, angle, hp, maxHp, playerId) {
        const ctx = window.ctx;
        if (!ctx || hp <= 0) return;
        const now = Date.now();
        const time = now;
        const local = playerId === window.meuId;
        const player = window.todosJogadores && window.todosJogadores[playerId];
        const suffering = !!(player && player.lordMalakarSuffering);
        const walk = isMoving ? Math.sin((window.walkCycle || 0) * 0.7) : 0;
        const breath = Math.sin(time / 430 + (Number(playerId && playerId.length) || 0)) * 1.3;
        const cx = x + 12;
        const cy = y + 16;
        const aimX = local && window.mouseJaMoveu ? window.mouseWorldX - cx : Math.cos(angle || 0) * 140;
        const aimY = local && window.mouseJaMoveu ? window.mouseWorldY - cy : Math.sin(angle || 0) * 140;
        const aimAngle = Math.atan2(aimY || 0, aimX || 1);
        const bookX = Math.cos(aimAngle) * 34 + Math.cos(time / 800) * 2;
        const bookY = Math.sin(aimAngle) * 19 - 5;

        ctx.save();
        ctx.translate(cx, cy);

        ctx.fillStyle = 'rgba(10, 3, 9, .54)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 20, 6, 0, 0, TAU);
        ctx.fill();

        if (suffering) {
            const pulse = 0.18 + (Math.sin(time / 170) + 1) * 0.08;
            ctx.strokeStyle = 'rgba(255, 24, 57, ' + pulse + ')';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(0, 12, 17 + Math.sin(time / 230) * 2, 5, 0, 0, TAU);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(0, breath * 0.65);
        ctx.scale(1, 1 + breath * 0.006);

        ctx.fillStyle = '#09090e';
        path(ctx, [[-9, 6], [-8, 12 + walk], [-3, 12 + walk], [-2, 5]]);
        ctx.fill();
        path(ctx, [[2, 5], [3, 12 - walk], [8, 12 - walk], [9, 6]]);
        ctx.fill();
        ctx.fillStyle = '#32141c';
        path(ctx, [[-10, 10 + walk], [-2, 10 + walk], [-2, 13 + walk], [-11, 13 + walk]]);
        ctx.fill();
        path(ctx, [[2, 10 - walk], [10, 10 - walk], [12, 13 - walk], [3, 13 - walk]]);
        ctx.fill();
        ctx.strokeStyle = '#a1283c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, 10 + walk);
        ctx.lineTo(-2, 10 + walk);
        ctx.moveTo(2, 10 - walk);
        ctx.lineTo(10, 10 - walk);
        ctx.stroke();

        ctx.fillStyle = '#130b10';
        ctx.shadowColor = suffering ? '#ec173d' : '#45101f';
        ctx.shadowBlur = suffering ? 15 : 7;
        path(ctx, [[-10, -9], [-15, -4], [-17, 8], [-12, 13], [-7, 7], [-5, -4]]);
        ctx.fill();
        path(ctx, [[9, -9], [15, -4], [17, 8], [12, 13], [7, 7], [5, -4]]);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#812238';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#5d1324';
        path(ctx, [[-15, -2], [-19, 4], [-14, 3], [-12, 7], [-9, 1]]);
        ctx.fill();
        path(ctx, [[15, -2], [19, 4], [14, 3], [12, 7], [9, 1]]);
        ctx.fill();

        ctx.fillStyle = '#201219';
        path(ctx, [[-10, -9], [-7, -15], [-3, -17], [4, -17], [8, -13], [11, 0], [7, 9], [0, 12], [-8, 8], [-11, 0]]);
        ctx.fill();
        ctx.strokeStyle = '#b28b58';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#501927';
        path(ctx, [[-8, -14], [-13, -18], [-7, -18], [-2, -15], [0, -10]]);
        ctx.fill();
        path(ctx, [[8, -14], [13, -18], [7, -18], [2, -15], [0, -10]]);
        ctx.fill();
        ctx.fillStyle = '#171017';
        path(ctx, [[-7, -15], [-5, -19], [-1, -16], [2, -19], [7, -14], [5, -10], [-4, -10]]);
        ctx.fill();
        ctx.strokeStyle = '#b08a57';
        ctx.lineWidth = .8;
        ctx.stroke();

        ctx.fillStyle = '#bca9a5';
        path(ctx, [[-4, -15], [-5, -10], [-3, -7], [0, -6], [4, -9], [4, -14]]);
        ctx.fill();
        ctx.fillStyle = '#e7d1c7';
        ctx.beginPath();
        ctx.ellipse(0, -12, 4.1, 5.6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#38232b';
        path(ctx, [[-4, -14], [0, -17], [5, -14], [3, -12], [-1, -13]]);
        ctx.fill();
        glowOrb(ctx, -2.1, -11.7, .8, '#ff263f', 8);
        glowOrb(ctx, 2.2, -11.7, .8, '#ff263f', 8);
        ctx.strokeStyle = '#6a3940';
        ctx.lineWidth = .6;
        ctx.beginPath();
        ctx.moveTo(-1, -9);
        ctx.lineTo(0, -7);
        ctx.lineTo(1, -9);
        ctx.stroke();

        ctx.fillStyle = '#bbb2bd';
        path(ctx, [[-5, -15], [-8, -21], [-6, -27], [-3, -20], [-1, -25], [0, -19], [4, -26], [4, -19], [8, -22], [7, -15], [4, -13], [2, -17], [-1, -13]]);
        ctx.fill();
        ctx.fillStyle = '#64505f';
        path(ctx, [[-7, -18], [-10, -24], [-9, -17], [-6, -14]]);
        ctx.fill();
        path(ctx, [[6, -17], [11, -23], [9, -16], [6, -12]]);
        ctx.fill();

        ctx.fillStyle = '#130b10';
        path(ctx, [[-8, -5], [-13, 1], [-12, 8], [-8, 5], [-5, -2]]);
        ctx.fill();
        path(ctx, [[8, -5], [13, 1], [12, 8], [8, 5], [5, -2]]);
        ctx.fill();
        ctx.strokeStyle = '#bb9b66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-9, -4);
        ctx.lineTo(-13, 2);
        ctx.moveTo(9, -4);
        ctx.lineTo(13, 2);
        ctx.stroke();
        ctx.fillStyle = '#9f1c34';
        path(ctx, [[-7, 4], [-3, 9], [0, 6], [3, 9], [7, 4], [6, 11], [0, 14], [-6, 11]]);
        ctx.fill();
        ctx.strokeStyle = '#8f6c4b';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 6);
        ctx.stroke();
        glowOrb(ctx, 0, 1, 1.7, '#ff1d3f', suffering ? 15 : 8);

        ctx.fillStyle = '#171014';
        path(ctx, [[-5, 1], [-9, 6], [-7, 10], [-3, 6]]);
        ctx.fill();
        path(ctx, [[5, 1], [9, 6], [7, 10], [3, 6]]);
        ctx.fill();
        ctx.strokeStyle = '#b4915f';
        ctx.beginPath();
        ctx.moveTo(-7, 5);
        ctx.lineTo(-4, 9);
        ctx.moveTo(7, 5);
        ctx.lineTo(4, 9);
        ctx.stroke();

        if (suffering) drawBloodDrips(ctx, time, String(playerId || '').length);
        ctx.restore();

        drawLantern(ctx, -15, -4, time);
        drawBook(ctx, bookX, bookY, aimAngle, time);

        const petrified = player && player.lordMalakarPetrifiedPercent || 0;
        if (petrified > 0) {
            ctx.fillStyle = 'rgba(17, 7, 20, .88)';
            ctx.fillRect(-14, -34, 28, 4);
            ctx.fillStyle = '#bc55ed';
            ctx.fillRect(-13, -33, 26 * Math.min(1, petrified / .30), 2);
        }
        ctx.restore();
    }

    function drawWarriorSkull(ctx, entity, time) {
        const attacking = entity.animationState === 'ATTACK';
        const attackStarted = (entity.animationUntil || time) - 450;
        const progress = attacking ? Math.max(0, Math.min(1, (time - attackStarted) / 450)) : 0;
        const walk = entity.moving ? Math.sin(time / 66) : Math.sin(time / 390) * .08;
        const sway = Math.sin(time / 190 + entity.id.length) * .7;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;
        const strike = attacking ? Math.sin(Math.PI * progress) : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, .48)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 15, 4, 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.scale(facing * 1.12, 1.12);
        ctx.translate(0, Math.sin(time / 170 + entity.id.length) * .8 - strike * .8);

        const cape = ctx.createLinearGradient(-18, -8, 14, 13);
        cape.addColorStop(0, '#a31e2b');
        cape.addColorStop(.4, '#631521');
        cape.addColorStop(1, '#210d13');
        ctx.fillStyle = cape;
        path(ctx, [[-5, -9], [-13, -7], [-17 - sway, -1], [-22 - sway, 7],
            [-16, 6], [-13, 13], [-7, 9], [-2, 14], [3, 9], [10, 13],
            [14 + sway, 6], [10, -5], [6, -10]]);
        ctx.fill();
        ctx.strokeStyle = '#320e16';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#d0443e';
        ctx.lineWidth = .9;
        ctx.beginPath();
        ctx.moveTo(-9, -5);
        ctx.quadraticCurveTo(-14 - sway, 4, -11, 10);
        ctx.moveTo(5, -7);
        ctx.quadraticCurveTo(12 + sway, 2, 10, 9);
        ctx.stroke();

        ctx.save();
        ctx.translate(-4, 4);
        ctx.rotate(walk * .12);
        ctx.fillStyle = '#17151a';
        path(ctx, [[-3, -1], [-4, 3], [-3, 8], [-5, 11], [2, 11], [3, 9], [1, 4], [2, 0]]);
        ctx.fill();
        ctx.fillStyle = '#5a392b';
        path(ctx, [[-5, 8], [2, 8], [4, 11], [-5, 11]]);
        ctx.fill();
        ctx.strokeStyle = '#c39c69';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-4, 9);
        ctx.lineTo(2, 9);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(4, 4);
        ctx.rotate(-walk * .12);
        ctx.fillStyle = '#17151a';
        path(ctx, [[-2, 0], [-1, 4], [-3, 9], [-2, 11], [5, 11], [4, 9], [3, 4], [3, -1]]);
        ctx.fill();
        ctx.fillStyle = '#5a392b';
        path(ctx, [[-2, 8], [5, 8], [7, 11], [-2, 11]]);
        ctx.fill();
        ctx.strokeStyle = '#c39c69';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.lineTo(5, 9);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#1d1a1c';
        path(ctx, [[-8, -10], [-10, -6], [-8, 5], [-5, 8], [5, 8], [9, 4], [10, -6], [6, -11], [0, -13]]);
        ctx.fill();
        ctx.strokeStyle = '#a57d52';
        ctx.lineWidth = 1;
        ctx.stroke();
        const plate = ctx.createLinearGradient(-7, -9, 8, 7);
        plate.addColorStop(0, '#75634e');
        plate.addColorStop(.42, '#3c3430');
        plate.addColorStop(1, '#19171b');
        ctx.fillStyle = plate;
        path(ctx, [[-6, -8], [-8, -3], [-5, 3], [0, 6], [6, 3], [8, -3], [5, -8], [0, -10]]);
        ctx.fill();
        ctx.strokeStyle = '#b08b5f';
        ctx.lineWidth = .7;
        ctx.stroke();
        ctx.strokeStyle = '#d1b18a';
        ctx.lineWidth = .75;
        ctx.beginPath();
        ctx.moveTo(-4, -5);
        ctx.lineTo(0, -2);
        ctx.lineTo(4, -5);
        ctx.moveTo(-3, 1);
        ctx.lineTo(0, 4);
        ctx.lineTo(3, 1);
        ctx.stroke();

        ctx.fillStyle = '#56303a';
        path(ctx, [[-8, -8], [-13, -12], [-15, -8], [-10, -3]]);
        ctx.fill();
        path(ctx, [[8, -8], [13, -12], [15, -8], [10, -3]]);
        ctx.fill();
        ctx.strokeStyle = '#c19a67';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-12, -9);
        ctx.lineTo(-9, -5);
        ctx.moveTo(12, -9);
        ctx.lineTo(9, -5);
        ctx.stroke();

        ctx.fillStyle = '#c7bda9';
        ctx.beginPath();
        ctx.ellipse(0, -12, 7.2, 7.4, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#77695d';
        ctx.lineWidth = .75;
        ctx.stroke();
        ctx.fillStyle = '#ede0c6';
        ctx.beginPath();
        ctx.ellipse(0, -12, 5.7, 5.9, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#281b20';
        path(ctx, [[-5, -13], [-2, -15], [-1, -11], [-3, -10]]);
        ctx.fill();
        path(ctx, [[5, -13], [2, -15], [1, -11], [3, -10]]);
        ctx.fill();
        ctx.fillStyle = '#3a252b';
        ctx.beginPath();
        ctx.moveTo(-3.4, -7);
        ctx.lineTo(-2, -9);
        ctx.lineTo(2, -9);
        ctx.lineTo(3.4, -7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e8dcc4';
        for (let i = 0; i < 4; i++) ctx.fillRect(-2.6 + i * 1.7, -8.2, 1, 2.5);
        glowOrb(ctx, -2.8, -12.5, 1.45, '#ff252b', 12 + strike * 12);
        glowOrb(ctx, 2.8, -12.5, 1.45, '#ff252b', 12 + strike * 12);

        ctx.save();
        ctx.translate(-9, -2);
        ctx.rotate(-.08 + sway * .025);
        ctx.fillStyle = '#31151d';
        ctx.strokeStyle = '#bd9560';
        ctx.lineWidth = 1.1;
        path(ctx, [[-5, -7], [2, -9], [7, -5], [6, 5], [1, 9], [-5, 6], [-8, 0]]);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#e0c18d';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(3, -6);
        ctx.lineTo(4, 3);
        ctx.lineTo(0, 6);
        ctx.stroke();
        ctx.fillStyle = '#c9b99f';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.3, 2.7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#29161c';
        ctx.fillRect(-1.4, -.8, 1, 1);
        ctx.fillRect(.4, -.8, 1, 1);
        ctx.restore();

        if (attacking) {
            const sweep = Math.max(0, Math.min(1, (progress - .12) / .72));
            ctx.save();
            ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, sweep)) * .9;
            ctx.strokeStyle = '#b8172b';
            ctx.shadowColor = '#ff2339';
            ctx.shadowBlur = 9;
            ctx.lineWidth = 5.5;
            ctx.beginPath();
            ctx.arc(5, -2, 21, -2.2 + sweep * 1.85, -1.3 + sweep * 1.85);
            ctx.stroke();
            ctx.strokeStyle = '#ff7880';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(5, -2, 20, -2.15 + sweep * 1.85, -1.45 + sweep * 1.85);
            ctx.stroke();
            ctx.restore();
        }
        const swordFloat = Math.sin(time / 145 + entity.id.length) * 1.8;
        const swordSway = Math.sin(time / 260 + entity.id.length) * .12;
        ctx.save();
        ctx.translate(13 + Math.sin(time / 310 + entity.id.length) * 1.4,
            -8 + swordFloat - strike * 2.5);
        ctx.rotate(attacking ? -.75 + progress * 1.8 : swordSway);
        ctx.strokeStyle = '#221b1a';
        ctx.lineWidth = 3.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 7);
        ctx.stroke();
        ctx.strokeStyle = '#986d49';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, 7);
        ctx.stroke();
        ctx.strokeStyle = '#d5d0c2';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(0, -17);
        ctx.stroke();
        ctx.fillStyle = '#ded8c9';
        path(ctx, [[0, 9], [-3, 7], [-1, -16], [0, -21], [1, -16], [3, 7]]);
        ctx.fill();
        ctx.strokeStyle = '#7e292b';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(0, -14);
        ctx.stroke();
        ctx.fillStyle = '#d8c49a';
        ctx.beginPath();
        ctx.arc(0, -2, 1.5, 0, TAU);
        ctx.fill();
        ctx.restore();
        if (attacking && progress > .16 && progress < .82) {
            const phase = (progress - .16) / .66;
            for (let i = 0; i < 4; i++) {
                const spark = phase * 2 + i * .23;
                const angle = -1.85 + spark * 1.1;
                glowOrb(ctx, 5 + Math.cos(angle) * 22, -2 + Math.sin(angle) * 22,
                    .9 + (i % 2) * .5, i % 2 ? '#ffd0a0' : '#ff3948', 8);
            }
        }
        ctx.restore();
    }

    function drawArcherSkull(ctx, entity, time) {
        const attacking = entity.animationState === 'ATTACK';
        const attackStarted = (entity.animationUntil || time) - 450;
        const progress = attacking ? Math.max(0, Math.min(1, (time - attackStarted) / 450)) : 0;
        const draw = attacking ? Math.sin(Math.PI * progress) : 0;
        const walk = entity.moving ? Math.sin(time / 70) : Math.sin(time / 410) * .06;
        const sway = Math.sin(time / 230 + entity.id.length) * 1.1;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;
        const teal = '#39f0d0';
        const glow = '#9affed';

        ctx.fillStyle = 'rgba(0, 0, 0, .46)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 14, 3.8, 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.scale(facing * 1.1, 1.1);
        ctx.translate(0, Math.sin(time / 190 + entity.id.length) * .8 - draw);

        const cloak = ctx.createLinearGradient(-20, -10, 16, 15);
        cloak.addColorStop(0, '#247e77');
        cloak.addColorStop(.28, '#174943');
        cloak.addColorStop(.7, '#102a2b');
        cloak.addColorStop(1, '#081316');
        ctx.fillStyle = cloak;
        path(ctx, [[-7, -12], [-14, -8], [-17 - sway, -2], [-22 - sway, 8],
            [-16, 7], [-14, 14], [-7, 10], [-3, 15], [3, 10], [10, 14],
            [15 + sway, 7], [13, -4], [8, -11], [0, -15]]);
        ctx.fill();
        ctx.strokeStyle = '#2ed9bd';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(105, 255, 223, .8)';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-9, -7);
        ctx.quadraticCurveTo(-14 - sway, 2, -12, 11);
        ctx.moveTo(6, -10);
        ctx.quadraticCurveTo(14 + sway, 1, 11, 11);
        ctx.moveTo(-4, 2);
        ctx.lineTo(-9, 12);
        ctx.moveTo(4, 3);
        ctx.lineTo(7, 12);
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
            const phase = (time / (420 + i * 55) + i * .31 + entity.id.length * .05) % 1;
            const side = i % 2 ? -1 : 1;
            const px = side * (10 + i * 2 + Math.sin(time / 170 + i) * 1.8);
            const py = 10 - phase * 30;
            ctx.globalAlpha = (1 - phase) * .78;
            ctx.strokeStyle = i % 2 ? teal : glow;
            ctx.lineWidth = i % 2 ? 1.3 : .9;
            ctx.beginPath();
            ctx.moveTo(px, py + 3);
            ctx.quadraticCurveTo(px + side * 3, py, px + side * 6, py - 5);
            ctx.stroke();
            glowOrb(ctx, px + side * 5, py - 4, .8, teal, 8);
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(-4, 4);
        ctx.rotate(walk * .12);
        ctx.fillStyle = '#171918';
        path(ctx, [[-3, -1], [-4, 3], [-3, 8], [-5, 11], [2, 11], [3, 9], [1, 4], [2, 0]]);
        ctx.fill();
        ctx.fillStyle = '#714b30';
        path(ctx, [[-5, 8], [2, 8], [4, 11], [-5, 11]]);
        ctx.fill();
        ctx.strokeStyle = '#d7ad6b';
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(-4, 9);
        ctx.lineTo(2, 9);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(4, 4);
        ctx.rotate(-walk * .12);
        ctx.fillStyle = '#171918';
        path(ctx, [[-2, 0], [-1, 4], [-3, 9], [-2, 11], [5, 11], [4, 9], [3, 4], [3, -1]]);
        ctx.fill();
        ctx.fillStyle = '#714b30';
        path(ctx, [[-2, 8], [5, 8], [7, 11], [-2, 11]]);
        ctx.fill();
        ctx.strokeStyle = '#d7ad6b';
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.lineTo(5, 9);
        ctx.stroke();
        ctx.restore();

        const armor = ctx.createLinearGradient(-11, -12, 10, 10);
        armor.addColorStop(0, '#5a5143');
        armor.addColorStop(.4, '#302b26');
        armor.addColorStop(1, '#131819');
        ctx.fillStyle = armor;
        ctx.strokeStyle = '#b18a55';
        ctx.lineWidth = 1;
        path(ctx, [[-7, -11], [-11, -6], [-9, 2], [-6, 7], [-2, 5],
            [1, 8], [6, 5], [9, 7], [11, 0], [9, -7], [5, -12],
            [1, -14], [-4, -13]]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a514a';
        path(ctx, [[-3, -9], [0, -12], [3, -9], [2, 2], [0, 5], [-2, 2]]);
        ctx.fill();
        ctx.strokeStyle = glow;
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 3);
        ctx.stroke();
        glowOrb(ctx, 0, -2, 1.1 + draw, teal, 9 + draw * 12);

        ctx.fillStyle = '#174540';
        ctx.strokeStyle = '#4be6c8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, -13);
        ctx.quadraticCurveTo(-10, -24, -3, -29);
        ctx.lineTo(2, -30);
        ctx.quadraticCurveTo(10, -23, 7, -14);
        ctx.lineTo(2, -10);
        ctx.lineTo(-4, -11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#dccfb9';
        ctx.beginPath();
        ctx.ellipse(0, -17, 4.6, 5.2, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#151819';
        path(ctx, [[-4, -18], [-1, -21], [0, -17], [-2, -15]]);
        ctx.fill();
        path(ctx, [[4, -18], [1, -21], [0, -17], [2, -15]]);
        ctx.fill();
        ctx.fillStyle = '#1e2523';
        ctx.fillRect(-2, -13, 4, 2);
        glowOrb(ctx, -2.1, -17.6, 1.1, teal, 11 + draw * 12);
        glowOrb(ctx, 2.1, -17.6, 1.1, teal, 11 + draw * 12);
        ctx.strokeStyle = '#d6c3a2';
        ctx.lineWidth = .6;
        ctx.beginPath();
        ctx.moveTo(-1.8, -12.5);
        ctx.lineTo(-.8, -11.5);
        ctx.lineTo(0, -12.5);
        ctx.lineTo(.8, -11.5);
        ctx.lineTo(1.8, -12.5);
        ctx.stroke();

        ctx.save();
        ctx.translate(-10, -8);
        ctx.rotate(-.25 + sway * .035);
        ctx.fillStyle = '#30271e';
        ctx.strokeStyle = '#b48b57';
        ctx.lineWidth = 1;
        path(ctx, [[-4, -5], [2, -8], [5, 7], [0, 9], [-6, 6]]);
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = i % 2 ? '#4effd8' : '#adfff0';
            ctx.shadowColor = '#37f3d0';
            ctx.shadowBlur = 5;
            ctx.lineWidth = 1.2;
            const arrowX = -4 + i * 2.2;
            const arrowY = -5 - (i % 2) * 1.3;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY + 8);
            ctx.lineTo(arrowX - 1, arrowY - 2);
            ctx.moveTo(arrowX - 1, arrowY + 1);
            ctx.lineTo(arrowX - 3, arrowY - 1);
            ctx.moveTo(arrowX - 1, arrowY + 1);
            ctx.lineTo(arrowX + 1, arrowY - 1);
            ctx.stroke();
            glowOrb(ctx, arrowX - 1, arrowY - 2, .8, glow, 8);
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.save();
        ctx.translate(2, -7);
        ctx.rotate(attacking ? -.12 + progress * .28 : Math.sin(time / 280) * .025);
        ctx.fillStyle = '#67452e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 2.2, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#c69c62';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, -13);
        ctx.quadraticCurveTo(29, 0, 16, 14);
        ctx.stroke();
        ctx.strokeStyle = '#57351f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, -13);
        ctx.quadraticCurveTo(25, 0, 16, 14);
        ctx.stroke();
        ctx.strokeStyle = '#9c7b51';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(18, -11);
        ctx.lineTo(18, 12);
        ctx.stroke();

        const pull = attacking ? Math.sin(Math.PI * progress) * 4 : 0;
        ctx.strokeStyle = '#c3a774';
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(16, -13);
        ctx.quadraticCurveTo(18 - pull, 0, 16, 14);
        ctx.stroke();
        ctx.strokeStyle = '#9a774c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, -1);
        ctx.stroke();
        ctx.strokeStyle = '#d2bd8c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.lineTo(13, -1);
        ctx.stroke();
        ctx.strokeStyle = teal;
        ctx.shadowColor = teal;
        ctx.shadowBlur = 9 + draw * 15;
        ctx.lineWidth = attacking ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(13, -1);
        ctx.stroke();
        ctx.restore();

        if (attacking && progress > .56) {
            const release = Math.min(1, (progress - .56) / .44);
            ctx.globalAlpha = 1 - release * .6;
            ctx.strokeStyle = glow;
            ctx.shadowColor = teal;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(9, -8);
            ctx.lineTo(21 + release * 9, -9);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(21 + release * 9, -9);
            ctx.lineTo(16 + release * 9, -12);
            ctx.lineTo(17 + release * 9, -7);
            ctx.closePath();
            ctx.fillStyle = glow;
            ctx.fill();
            for (let i = 0; i < 4; i++) {
                const phase = (time / (160 + i * 24) + i * .29) % 1;
                glowOrb(ctx, 8 + phase * 17, -8 + Math.sin(phase * 8 + i) * 2,
                    1.1 - phase * .55, i % 2 ? teal : glow, 8);
            }
            ctx.globalAlpha = 1;
        }
        if (entity.moving) {
            for (let i = 0; i < 3; i++) {
                const phase = (time / 240 + i / 3) % 1;
                ctx.globalAlpha = (1 - phase) * .45;
                ctx.strokeStyle = i % 2 ? teal : '#c0fff4';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8 - phase * 7, 1 + i * 4);
                ctx.lineTo(-15 - phase * 8, -2 + i * 4);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    function drawMageSkullLegacy(ctx, entity, time) {
        const attacking = entity.animationState === 'ATTACK';
        const attackStarted = (entity.animationUntil || time) - 450;
        const progress = attacking ? Math.max(0, Math.min(1, (time - attackStarted) / 450)) : 0;
        const cast = attacking ? Math.sin(Math.PI * progress) : 0;
        const walk = entity.moving ? Math.sin(time / 68) : Math.sin(time / 430) * .07;
        const sway = Math.sin(time / 220 + entity.id.length) * 1.2;
        const pulse = .5 + (Math.sin(time / 115 + entity.id.length) + 1) * .25;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;
        const blue = '#168dff';
        const cyan = '#75eaff';
        const gold = '#e9b95f';
        const bob = Math.sin(time / 180 + entity.id.length) * 1.1;

        ctx.fillStyle = 'rgba(0, 0, 0, .5)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 20, 5, 0, 0, TAU);
        ctx.fill();

        const aura = ctx.createRadialGradient(0, -10, 2, 0, -10, 35 + pulse * 8 + cast * 14);
        aura.addColorStop(0, 'rgba(28, 132, 255, .34)');
        aura.addColorStop(.5, 'rgba(35, 92, 255, .16)');
        aura.addColorStop(1, 'rgba(30, 75, 255, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.ellipse(0, -8, 31 + pulse * 5 + cast * 8, 34 + cast * 7, 0, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.scale(facing * 1.12, 1.12);
        ctx.translate(0, bob - cast * 2);

        if (attacking) {
            ctx.save();
            ctx.globalAlpha = .55 + pulse * .3;
            ctx.strokeStyle = cyan;
            ctx.shadowColor = blue;
            ctx.shadowBlur = 13 + cast * 12;
            ctx.lineWidth = 1.2 + cast;
            ctx.beginPath();
            ctx.ellipse(0, 8, 17 + cast * 10, 5 + cast * 2, 0,
                time / 160, time / 160 + TAU * .82);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(-10, -8 + Math.sin(time / 150) * 1.5);
        ctx.rotate(-.22 + sway * .025);
        ctx.shadowColor = blue;
        ctx.shadowBlur = 14 + pulse * 8;
        ctx.strokeStyle = '#a8dfff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -1, 7 + pulse, time / 330, time / 330 + TAU * .82);
        ctx.stroke();
        ctx.strokeStyle = '#185dff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -1, 10 + pulse * 2, -time / 260, -time / 260 + TAU * .7);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
            const angle = time / 310 + i * TAU / 5;
            glowOrb(ctx, Math.cos(angle) * (7 + pulse), -1 + Math.sin(angle) * (7 + pulse),
                i === 0 ? 1.8 : 1.1, i % 2 ? cyan : '#fff5c5', 11);
        }
        ctx.restore();

        for (let side = -1; side <= 1; side += 2) {
            const stride = walk * side * 2.4;
            ctx.fillStyle = side < 0 ? '#17142b' : '#21183b';
            path(ctx, [
                [side * 4, 4], [side * 10, 5], [side * (13 + sway), 13],
                [side * (17 + sway), 17 + stride], [side * 8, 16],
                [side * 3, 12]
            ]);
            ctx.fill();
            ctx.strokeStyle = side < 0 ? '#613b91' : gold;
            ctx.lineWidth = .9;
            ctx.stroke();
            ctx.strokeStyle = '#b7864c';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(side * 8, 15);
            ctx.lineTo(side * 15, 16 + stride);
            ctx.stroke();
            ctx.fillStyle = '#17151d';
            path(ctx, [[side * 10, 15 + stride], [side * 17, 16 + stride],
                [side * 18, 18 + stride], [side * 9, 18 + stride]]);
            ctx.fill();
        }

        const robe = ctx.createLinearGradient(-17, -7, 18, 17);
        robe.addColorStop(0, '#28234f');
        robe.addColorStop(.3, '#191936');
        robe.addColorStop(.68, '#101426');
        robe.addColorStop(1, '#080d1b');
        ctx.fillStyle = robe;
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.25;
        path(ctx, [[-8, -13], [-15, -10], [-18, -3], [-15, 5], [-17, 15],
            [-11, 13], [-6, 18], [-2, 14], [2, 18], [7, 14], [13, 16],
            [12, 7], [16, 1], [12, -9], [6, -13], [0, -15]]);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#8f6bff';
        ctx.shadowColor = '#437aff';
        ctx.shadowBlur = 7;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-13, -7);
        ctx.quadraticCurveTo(-18 + sway, 3, -15, 13);
        ctx.moveTo(11, -8);
        ctx.quadraticCurveTo(16 - sway, 2, 12, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#342553';
        path(ctx, [[-7, -11], [-10, -7], [-8, 1], [-5, 7], [0, 10],
            [5, 7], [8, 1], [9, -7], [5, -12], [0, -14]]);
        ctx.fill();
        ctx.strokeStyle = '#dcae5c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 8);
        ctx.moveTo(-5, -7);
        ctx.lineTo(0, -3);
        ctx.lineTo(5, -7);
        ctx.stroke();
        ctx.fillStyle = '#e9bd67';
        path(ctx, [[0, -5], [-2, -2], [0, 1], [2, -2]]);
        ctx.fill();
        glowOrb(ctx, 0, -1, 2 + cast * 2, blue, 15 + cast * 18);

        const hood = ctx.createLinearGradient(-11, -34, 12, -9);
        hood.addColorStop(0, '#3b2b68');
        hood.addColorStop(.45, '#211b43');
        hood.addColorStop(1, '#111327');
        ctx.fillStyle = hood;
        ctx.strokeStyle = '#e5b458';
        ctx.lineWidth = 1.2;
        path(ctx, [[-10, -14], [-13, -23], [-10, -31], [-5, -35],
            [1, -37], [8, -32], [12, -22], [8, -14], [4, -17],
            [0, -19], [-5, -16]]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#080b17';
        path(ctx, [[-7, -22], [-5, -29], [1, -32], [7, -28], [8, -21],
            [4, -17], [0, -18], [-4, -17]]);
        ctx.fill();
        ctx.fillStyle = '#e7dfd0';
        ctx.beginPath();
        ctx.ellipse(0, -22, 5.1, 6.2, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#171522';
        path(ctx, [[-5, -23], [-2, -27], [0, -22], [-3, -20]]);
        ctx.fill();
        path(ctx, [[5, -23], [2, -27], [0, -22], [3, -20]]);
        ctx.fill();
        ctx.fillStyle = '#25202b';
        ctx.fillRect(-2.7, -18, 5.4, 2.5);
        ctx.strokeStyle = gold;
        ctx.lineWidth = .7;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            ctx.moveTo(-2.7 + i * 1.8, -18);
            ctx.lineTo(-2.7 + i * 1.8, -15.5);
        }
        ctx.stroke();
        glowOrb(ctx, -2, -23, 1.4 + pulse * .4, '#38a8ff', 15 + cast * 18);
        glowOrb(ctx, 2, -23, 1.4 + pulse * .4, '#38a8ff', 15 + cast * 18);

        ctx.save();
        ctx.translate(10, -8 - cast * 2);
        ctx.rotate(attacking ? -.2 - progress * .7 : Math.sin(time / 320) * .06);
        ctx.strokeStyle = '#dcb15d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(2, -23);
        ctx.stroke();
        ctx.strokeStyle = '#704b93';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(2, -18);
        ctx.stroke();
        ctx.fillStyle = '#271a3b';
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-6, -21);
        ctx.lineTo(-5, -28);
        ctx.lineTo(0, -34);
        ctx.lineTo(6, -28);
        ctx.lineTo(7, -21);
        ctx.lineTo(3, -17);
        ctx.lineTo(-3, -17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#52aaff';
        ctx.shadowColor = '#126dff';
        ctx.shadowBlur = 14 + pulse * 12 + cast * 18;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -31);
        ctx.quadraticCurveTo(-4, -37 - pulse * 3, 0, -42 - pulse * 4);
        ctx.quadraticCurveTo(5, -36, 1, -33);
        ctx.stroke();
        glowOrb(ctx, 1, -27, 3.2 + pulse * 1.4 + cast * 2, '#27a5ff', 20 + cast * 20);
        glowOrb(ctx, 1, -27, 1.5 + cast, '#f0ffff', 12);
        for (let i = 0; i < 4; i++) {
            const arcPhase = time / (95 + i * 18) + i * 1.7;
            const arcX = 1 + Math.cos(arcPhase) * (5 + (i % 2) * 2);
            const arcY = -28 + Math.sin(arcPhase * 1.2) * (5 + (i % 2) * 2);
            ctx.strokeStyle = i % 2 ? '#2d77ff' : '#a3f5ff';
            ctx.lineWidth = i % 2 ? 1.4 : .9;
            ctx.beginPath();
            ctx.moveTo(1, -27);
            ctx.lineTo(arcX, arcY);
            ctx.lineTo(arcX + Math.sin(arcPhase * 2) * 2, arcY - 3);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        for (let i = 0; i < 8; i++) {
            const orbitAngle = time / (390 + i * 19) + i * TAU / 8 + entity.id.length;
            const radius = 16 + (i % 3) * 3 + cast * 5;
            const px = Math.cos(orbitAngle) * radius;
            const py = -10 + Math.sin(orbitAngle) * radius * .78;
            ctx.globalAlpha = .58 + Math.sin(orbitAngle * 2) * .25;
            if (i % 2 === 0) {
                ctx.strokeStyle = i % 4 === 0 ? '#dffaff' : '#378aff';
                ctx.shadowColor = '#188aff';
                ctx.shadowBlur = 10;
                ctx.lineWidth = 1.1;
                ctx.beginPath();
                ctx.moveTo(px - 2, py - 2);
                ctx.lineTo(px + 1, py + 1);
                ctx.lineTo(px - 1, py + 4);
                ctx.lineTo(px + 3, py + 5);
                ctx.stroke();
            } else {
                glowOrb(ctx, px, py, 1.1 + (i % 3) * .3, i % 3 ? cyan : '#fff5cb', 9);
            }
        }
        ctx.globalAlpha = 1;

        if (attacking && progress > .18) {
            const windup = Math.min(1, (progress - .18) / .45);
            ctx.save();
            ctx.globalAlpha = .8 * (1 - Math.max(0, progress - .72) / .28);
            ctx.strokeStyle = '#46aaff';
            ctx.shadowColor = '#136dff';
            ctx.shadowBlur = 18;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(7, -13, 9 + windup * 13, -1.2, 1.8 + windup * 1.5);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const angle = time / 120 + i * TAU / 6;
                const radius = 10 + windup * 8;
                glowOrb(ctx, 7 + Math.cos(angle) * radius,
                    -13 + Math.sin(angle) * radius, 1.2, i % 2 ? cyan : '#fff', 11);
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function drawMageSkull(ctx, entity, time) {
        const attacking = entity.animationState === 'ATTACK';
        const attackStarted = (entity.animationUntil || time) - 450;
        const progress = attacking ? Math.max(0, Math.min(1, (time - attackStarted) / 450)) : 0;
        const cast = attacking ? Math.sin(Math.PI * progress) : 0;
        const walk = entity.moving ? Math.sin(time / 66) : Math.sin(time / 420) * .04;
        const sway = Math.sin(time / 255 + entity.id.length) * 1.1;
        const pulse = .5 + (Math.sin(time / 145 + entity.id.length) + 1) * .25;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;
        const blue = '#168dff';
        const cyan = '#75eaff';
        const gold = '#e9b95f';
        const bob = Math.sin(time / 205 + entity.id.length) * .65;

        ctx.fillStyle = 'rgba(0, 0, 0, .48)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 16, 4.2, 0, 0, TAU);
        ctx.fill();

        const aura = ctx.createRadialGradient(0, -8, 2, 0, -8, 29 + pulse * 5 + cast * 8);
        aura.addColorStop(0, 'rgba(28, 132, 255, .27)');
        aura.addColorStop(.55, 'rgba(35, 92, 255, .12)');
        aura.addColorStop(1, 'rgba(30, 75, 255, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.ellipse(0, -8, 25 + pulse * 3 + cast * 5, 28 + cast * 5, 0, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.scale(facing * 1.04, 1.04);
        ctx.translate(0, bob - cast * 1.2);

        if (attacking) {
            ctx.save();
            ctx.globalAlpha = .45 + pulse * .25;
            ctx.strokeStyle = cyan;
            ctx.shadowColor = blue;
            ctx.shadowBlur = 11 + cast * 8;
            ctx.lineWidth = 1 + cast * .7;
            ctx.beginPath();
            ctx.ellipse(0, 9, 14 + cast * 7, 4 + cast, 0,
                time / 170, time / 170 + TAU * .78);
            ctx.stroke();
            ctx.restore();
        }

        // Split robe leaves the articulated shin guards and boots visible.
        for (let side = -1; side <= 1; side += 2) {
            const phase = walk * side;
            const hipX = side * 4;
            const kneeX = hipX + phase * 1.5 + side * 1.2;
            const footX = hipX + phase * 3.2 + side * 1.6;
            const kneeY = 8 - Math.max(0, phase) * 1.1;
            const footY = 12 - Math.max(0, -phase) * 1.6;

            ctx.fillStyle = '#b8b0a3';
            ctx.strokeStyle = '#332843';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(hipX - 1.5, 1);
            ctx.lineTo(kneeX - 1.6, kneeY);
            ctx.lineTo(kneeX + 1.1, kneeY + .5);
            ctx.lineTo(hipX + 2, 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#29223b';
            ctx.beginPath();
            ctx.moveTo(kneeX - 1.6, kneeY);
            ctx.lineTo(footX - 1.5, footY);
            ctx.lineTo(footX + 1.3, footY);
            ctx.lineTo(kneeX + 1.5, kneeY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#d5b878';
            ctx.lineWidth = .8;
            ctx.stroke();

            ctx.fillStyle = '#d7c79f';
            ctx.beginPath();
            ctx.moveTo(kneeX - 2.3, kneeY - 1.2);
            ctx.lineTo(kneeX, kneeY - 2.3);
            ctx.lineTo(kneeX + 2.3, kneeY - 1.2);
            ctx.lineTo(kneeX + 1.7, kneeY + 1);
            ctx.lineTo(kneeX - 1.7, kneeY + 1);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = gold;
            ctx.stroke();
            ctx.fillStyle = blue;
            ctx.beginPath();
            ctx.arc(kneeX, kneeY - .4, .65, 0, TAU);
            ctx.fill();

            ctx.strokeStyle = '#d1bd8b';
            ctx.lineWidth = .7;
            ctx.beginPath();
            ctx.moveTo(hipX - 1, 3);
            ctx.lineTo(kneeX - 1, kneeY - 1);
            ctx.moveTo(hipX + 1, 3);
            ctx.lineTo(kneeX + 1, kneeY - 1);
            ctx.stroke();

            ctx.fillStyle = '#171421';
            ctx.strokeStyle = '#9a754a';
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.moveTo(footX - 2.4, footY - .5);
            ctx.lineTo(footX + 1.8, footY - .5);
            ctx.lineTo(footX + 3.7, footY + 1.5);
            ctx.lineTo(footX + 2.9, footY + 2.6);
            ctx.lineTo(footX - 2.5, footY + 2.6);
            ctx.lineTo(footX - 3.2, footY + 1.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = gold;
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.moveTo(footX - 1.5, footY + .6);
            ctx.lineTo(footX + 2.3, footY + .6);
            ctx.stroke();
        }

        const robe = ctx.createLinearGradient(-12, -8, 13, 14);
        robe.addColorStop(0, '#30274e');
        robe.addColorStop(.45, '#1d1b37');
        robe.addColorStop(1, '#111222');
        ctx.fillStyle = robe;
        ctx.strokeStyle = '#b68b4e';
        ctx.lineWidth = 1;
        path(ctx, [[-7, -12], [-12, -8], [-13, -1], [-10, 3],
            [-12, 8], [-10, 13], [-7, 11], [-5, 7], [-2, 13],
            [0, 9], [2, 13], [5, 7], [7, 11], [11, 13],
            [12, 8], [10, 3], [13, -1], [11, -8], [6, -12], [0, -14]]);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#7758bf';
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(-9, 3);
        ctx.lineTo(-11, 9);
        ctx.moveTo(9, -6);
        ctx.lineTo(8, 3);
        ctx.lineTo(10, 9);
        ctx.stroke();

        ctx.fillStyle = '#40305c';
        path(ctx, [[-5, -10], [0, -12], [5, -10], [6, -2],
            [3, 4], [0, 6], [-3, 4], [-6, -2]]);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(0, 4);
        ctx.moveTo(-4, -6);
        ctx.lineTo(0, -3);
        ctx.lineTo(4, -6);
        ctx.stroke();
        ctx.fillStyle = '#e9bd67';
        path(ctx, [[0, -4], [-1.7, -2], [0, 1], [1.7, -2]]);
        ctx.fill();
        glowOrb(ctx, 0, 0, 1.4 + cast, blue, 12 + cast * 12);

        ctx.save();
        ctx.translate(-8, -5 + Math.sin(time / 150) * .8);
        ctx.rotate(-.24 + sway * .02);
        ctx.strokeStyle = '#a8dfff';
        ctx.shadowColor = blue;
        ctx.shadowBlur = 10 + pulse * 4;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5 + pulse, time / 330, time / 330 + TAU * .78);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
            const angle = time / 280 + i * TAU / 3;
            glowOrb(ctx, Math.cos(angle) * 6, Math.sin(angle) * 6,
                1, i % 2 ? cyan : '#fff5c5', 8);
        }
        ctx.restore();

        const hood = ctx.createLinearGradient(-9, -31, 10, -12);
        hood.addColorStop(0, '#46366f');
        hood.addColorStop(.5, '#292245');
        hood.addColorStop(1, '#171729');
        ctx.fillStyle = hood;
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1;
        path(ctx, [[-8, -12], [-10, -20], [-8, -27], [-4, -31],
            [1, -33], [7, -29], [10, -21], [8, -13], [4, -16],
            [0, -17], [-4, -15]]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#090b16';
        path(ctx, [[-6, -20], [-4, -27], [1, -29], [6, -26],
            [7, -20], [4, -16], [0, -17], [-4, -16]]);
        ctx.fill();

        ctx.fillStyle = '#ddd6c9';
        ctx.beginPath();
        ctx.ellipse(0, -20, 4.3, 5.1, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#171522';
        path(ctx, [[-4, -21], [-2, -24], [0, -20], [-3, -18]]);
        ctx.fill();
        path(ctx, [[4, -21], [2, -24], [0, -20], [3, -18]]);
        ctx.fill();
        ctx.fillStyle = '#5f5260';
        ctx.fillRect(-2.5, -16.7, 5, 1.7);
        ctx.strokeStyle = '#b9ac95';
        ctx.lineWidth = .55;
        ctx.beginPath();
        ctx.moveTo(-1.5, -16.5);
        ctx.lineTo(-1.5, -15);
        ctx.moveTo(0, -16.5);
        ctx.lineTo(0, -15);
        ctx.moveTo(1.5, -16.5);
        ctx.lineTo(1.5, -15);
        ctx.stroke();
        glowOrb(ctx, -1.8, -21, 1.05 + pulse * .2, '#38a8ff', 11 + cast * 9);
        glowOrb(ctx, 1.8, -21, 1.05 + pulse * .2, '#38a8ff', 11 + cast * 9);

        // Preserve the original staff silhouette and its blue flame treatment.
        ctx.save();
        ctx.translate(9, -7 - cast * 1.2);
        ctx.rotate(attacking ? -.2 - progress * .7 : Math.sin(time / 320) * .06);
        ctx.strokeStyle = '#dcb15d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(2, -23);
        ctx.stroke();
        ctx.strokeStyle = '#704b93';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(2, -18);
        ctx.stroke();
        ctx.fillStyle = '#271a3b';
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-6, -21);
        ctx.lineTo(-5, -28);
        ctx.lineTo(0, -34);
        ctx.lineTo(6, -28);
        ctx.lineTo(7, -21);
        ctx.lineTo(3, -17);
        ctx.lineTo(-3, -17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#52aaff';
        ctx.shadowColor = '#126dff';
        ctx.shadowBlur = 14 + pulse * 12 + cast * 14;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -31);
        ctx.quadraticCurveTo(-4, -37 - pulse * 3, 0, -42 - pulse * 4);
        ctx.quadraticCurveTo(5, -36, 1, -33);
        ctx.stroke();
        glowOrb(ctx, 1, -27, 3.2 + pulse * 1.2 + cast * 1.6, '#27a5ff', 18 + cast * 16);
        glowOrb(ctx, 1, -27, 1.5 + cast * .5, '#f0ffff', 11);
        for (let i = 0; i < 3; i++) {
            const arcPhase = time / (100 + i * 18) + i * 1.7;
            const arcX = 1 + Math.cos(arcPhase) * (5 + (i % 2) * 2);
            const arcY = -28 + Math.sin(arcPhase * 1.2) * (5 + (i % 2) * 2);
            ctx.strokeStyle = i % 2 ? '#2d77ff' : '#a3f5ff';
            ctx.lineWidth = i % 2 ? 1.2 : .8;
            ctx.beginPath();
            ctx.moveTo(1, -27);
            ctx.lineTo(arcX, arcY);
            ctx.lineTo(arcX + Math.sin(arcPhase * 2) * 2, arcY - 3);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        for (let i = 0; i < 5; i++) {
            const angle = time / (410 + i * 23) + i * TAU / 5 + entity.id.length;
            const radius = 14 + (i % 3) * 2;
            const px = Math.cos(angle) * radius;
            const py = -7 + Math.sin(angle) * radius * .72;
            ctx.globalAlpha = .52 + Math.sin(angle * 2) * .24;
            if (i % 2 === 0) {
                ctx.strokeStyle = i % 4 === 0 ? '#dffaff' : '#378aff';
                ctx.shadowColor = '#188aff';
                ctx.shadowBlur = 8;
                ctx.lineWidth = .9;
                ctx.beginPath();
                ctx.moveTo(px - 1.5, py - 1.5);
                ctx.lineTo(px + 1, py + 1);
                ctx.lineTo(px - .8, py + 3);
                ctx.stroke();
            } else {
                glowOrb(ctx, px, py, 1, i % 3 ? cyan : '#fff5cb', 7);
            }
        }
        ctx.globalAlpha = 1;

        if (attacking && progress > .2) {
            const charge = Math.min(1, (progress - .2) / .42);
            ctx.save();
            ctx.globalAlpha = .68 * (1 - Math.max(0, progress - .74) / .26);
            ctx.strokeStyle = '#46aaff';
            ctx.shadowColor = '#136dff';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 1.7;
            ctx.beginPath();
            ctx.arc(5, -11, 8 + charge * 10, -1.2, 1.8 + charge);
            ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = time / 125 + i * TAU / 4;
                glowOrb(ctx, 5 + Math.cos(angle) * (9 + charge * 5),
                    -11 + Math.sin(angle) * (9 + charge * 5), 1, i % 2 ? cyan : '#fff', 9);
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function drawSkull(ctx, entity, time) {
        const type = entity.type;
        if (type === 'skull_warrior') {
            ctx.save();
            ctx.scale(.85, .85);
            drawWarriorSkull(ctx, entity, time);
            ctx.restore();
            return;
        }
        if (type === 'skull_archer') {
            ctx.save();
            ctx.scale(.85, .85);
            drawArcherSkull(ctx, entity, time);
            ctx.restore();
            return;
        }
        if (type === 'skull_mage') {
            ctx.save();
            ctx.scale(.85, .85);
            drawMageSkull(ctx, entity, time);
            ctx.restore();
            return;
        }
        const warrior = type === 'skull_warrior';
        const archer = type === 'skull_archer';
        const mage = type === 'skull_mage';
        const color = warrior ? '#d9d2c2' : archer ? '#ded7cd' : '#d9cee7';
        const pulse = 0.5 + (Math.sin(time / 150) + 1) * .25;

        ctx.fillStyle = 'rgba(0, 0, 0, .42)';
        ctx.beginPath();
        ctx.ellipse(0, 12, 11, 3.5, 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(0, Math.sin(time / 230 + (entity.id.length % 7)) * 1.4);

        ctx.fillStyle = '#17131a';
        path(ctx, [[-6, 2], [-7, 7], [-4, 9], [-2, 3], [2, 3], [4, 9], [7, 7], [6, 2]]);
        ctx.fill();
        ctx.fillStyle = warrior ? '#301821' : mage ? '#27172f' : '#1a2530';
        path(ctx, [[-8, -1], [-11, 6], [-7, 9], [-4, 5], [0, 7], [4, 5], [7, 9], [11, 6], [8, -1], [5, -5], [-5, -5]]);
        ctx.fill();
        ctx.strokeStyle = warrior ? '#ac7846' : mage ? '#8e52c3' : '#5b9fa8';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#120d13';
        path(ctx, [[-5, -2], [-8, -8], [-5, -13], [0, -15], [5, -13], [8, -8], [6, -2], [3, 2], [-3, 2]]);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, -8, 6.2, 6.4, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#c0b9ae';
        ctx.fillRect(-3.4, -4, 6.8, 3);
        ctx.fillStyle = '#23151c';
        path(ctx, [[-5, -9], [-2, -11], [-1, -7], [-3, -6]]);
        ctx.fill();
        path(ctx, [[5, -9], [2, -11], [1, -7], [3, -6]]);
        ctx.fill();
        ctx.fillStyle = '#43343a';
        [-2, 0, 2].forEach(function (toothX) { ctx.fillRect(toothX - .35, -3.8, .7, 2.5); });
        glowOrb(ctx, -3, -8.5, 1.25, warrior ? '#ff3d35' : archer ? '#ff633c' : '#bb53ff', 8 + pulse * 5);
        glowOrb(ctx, 3, -8.5, 1.25, warrior ? '#ff3d35' : archer ? '#ff633c' : '#bb53ff', 8 + pulse * 5);

        ctx.strokeStyle = '#a88c69';
        ctx.lineWidth = 1.2;
        if (warrior) {
            ctx.fillStyle = '#823047';
            path(ctx, [[-8, -13], [-12, -17], [-8, -16], [-4, -13]]);
            ctx.fill();
            path(ctx, [[8, -13], [12, -17], [8, -16], [4, -13]]);
            ctx.fill();
            ctx.fillStyle = '#98794b';
            ctx.fillRect(-7, -15, 14, 1.4);
            ctx.strokeStyle = '#b6b0a1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(8, -2);
            ctx.lineTo(13, 9);
            ctx.stroke();
            ctx.fillStyle = '#c5c1b6';
            path(ctx, [[12, 6], [17, 7], [16, 11], [11, 10]]);
            ctx.fill();
            ctx.fillStyle = '#4d242d';
            ctx.strokeStyle = '#c39461';
            ctx.lineWidth = 1;
            path(ctx, [[-14, -1], [-10, -3], [-9, 5], [-13, 7]]);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-12, 2, 2, 0, TAU);
            ctx.stroke();
        } else if (archer) {
            ctx.strokeStyle = '#b8754e';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(10, -1, 6, -Math.PI * .55, Math.PI * .55);
            ctx.stroke();
            ctx.strokeStyle = '#e4d1a4';
            ctx.lineWidth = .7;
            ctx.beginPath();
            ctx.moveTo(7, -6);
            ctx.lineTo(7, 5);
            ctx.stroke();
            ctx.strokeStyle = '#c6a65e';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-9, 0);
            ctx.lineTo(8, -1);
            ctx.stroke();
            ctx.fillStyle = '#e9d7b7';
            path(ctx, [[8, -1], [5, -3], [5, 1]]);
            ctx.fill();
            ctx.strokeStyle = '#65e6f2';
            ctx.beginPath();
            ctx.moveTo(-7, 3);
            ctx.lineTo(3, -2);
            ctx.stroke();
            ctx.fillStyle = '#122029';
            path(ctx, [[-7, -14], [-4, -18], [0, -15], [4, -18], [8, -13]]);
            ctx.fill();
        } else if (mage) {
            ctx.strokeStyle = '#b58ae4';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, -13, 7, Math.PI, TAU);
            ctx.stroke();
            ctx.fillStyle = '#432158';
            path(ctx, [[-7, -13], [-4, -19], [0, -23], [4, -19], [7, -13]]);
            ctx.fill();
            ctx.strokeStyle = '#9e6bd5';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(10, 4);
            ctx.lineTo(13, -16);
            ctx.stroke();
            glowOrb(ctx, 13, -18, 3.2, '#db66ff', 15);
            ctx.strokeStyle = 'rgba(226, 151, 255, .8)';
            ctx.beginPath();
            ctx.arc(13, -18, 6 + pulse * 2, time / 180, time / 180 + Math.PI * 1.4);
            ctx.stroke();
        }
        if (entity.animationState === 'ATTACK') {
            const attackStartedAt = (entity.animationUntil || time) - 450;
            const attackProgress = Math.max(0, Math.min(1, (time - attackStartedAt) / 450));
            ctx.strokeStyle = warrior ? '#ff334c' : mage ? '#c96dff' : '#ff714f';
            ctx.globalAlpha = .35 + pulse * .45;
            ctx.lineWidth = 1.5 + (1 - attackProgress);
            ctx.beginPath();
            ctx.arc(0, -4, 13 + attackProgress * 10, -2.3 + attackProgress * 1.5,
                -.2 + attackProgress * 1.1);
            ctx.stroke();
            if (warrior) {
                ctx.save();
                ctx.translate(11, 2);
                ctx.rotate(-1.1 + attackProgress * 2.2);
                ctx.strokeStyle = '#fff0d8';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 15);
                ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    function drawCleric(ctx, entity, time) {
        const healing = entity.animationState === 'HEAL';
        const animationStarted = (entity.animationUntil || time) - 500;
        const healProgress = healing ? Math.max(0, Math.min(1, (time - animationStarted) / 500)) : 0;
        const cast = healing ? Math.sin(Math.PI * healProgress) : 0;
        const bob = Math.sin(time / 210 + entity.id.length) * 1.1;
        const sway = entity.moving ? Math.sin(time / 90) * 1.8 : Math.sin(time / 470) * .7;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;

        ctx.save();
        ctx.translate(0, bob - cast * 1.4);

        const ground = ctx.createRadialGradient(0, 12, 1, 0, 12, 21 + cast * 9);
        ground.addColorStop(0, 'rgba(255, 205, 100, .3)');
        ground.addColorStop(.52, 'rgba(255, 168, 55, .12)');
        ground.addColorStop(1, 'rgba(255, 150, 45, 0)');
        ctx.fillStyle = ground;
        ctx.beginPath();
        ctx.ellipse(0, 12, 21 + cast * 9, 6 + cast * 2, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, .48)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 13, 3.8, 0, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.translate(sway * .35, 0);

        ctx.fillStyle = '#342334';
        path(ctx, [[-6, 5], [-5, 11], [-2, 12], [-1, 6], [2, 6], [3, 12], [7, 11], [7, 5]]);
        ctx.fill();
        ctx.fillStyle = '#b49567';
        ctx.fillRect(-6, 10, 4, 1);
        ctx.fillRect(3, 10, 4, 1);

        const robe = ctx.createLinearGradient(-14, -10, 13, 13);
        robe.addColorStop(0, '#fff1d7');
        robe.addColorStop(.38, '#d9c4a9');
        robe.addColorStop(.72, '#a8907d');
        robe.addColorStop(1, '#51404a');
        ctx.fillStyle = robe;
        ctx.strokeStyle = '#392b31';
        ctx.lineWidth = 1.2;
        path(ctx, [[-7, -11], [-13, -7], [-15, 1], [-12, 6], [-10, 3], [-11, 12],
            [-8, 15], [-5, 11], [-1, 15], [2, 11], [6, 15], [9, 11], [11, 14],
            [14, 10], [11, 2], [13, -6], [7, -11], [3, -13], [-3, -13]]);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 247, 223, .9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.quadraticCurveTo(-13, 2, -9, 12);
        ctx.moveTo(9, -7);
        ctx.quadraticCurveTo(13, 2, 10, 11);
        ctx.moveTo(-5, 2);
        ctx.quadraticCurveTo(-4, 8, -7, 13);
        ctx.moveTo(4, 1);
        ctx.quadraticCurveTo(5, 8, 8, 13);
        ctx.stroke();

        ctx.fillStyle = '#702333';
        path(ctx, [[-4, -11], [4, -11], [5, 2], [2, 13], [-1, 15], [-5, 3]]);
        ctx.fill();
        ctx.fillStyle = '#a33b3e';
        path(ctx, [[-2, -8], [2, -8], [2, 5], [0, 9], [-2, 5]]);
        ctx.fill();
        ctx.strokeStyle = '#e0bd7d';
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.moveTo(-4, -9);
        ctx.lineTo(-2, -7);
        ctx.lineTo(0, -9);
        ctx.lineTo(2, -7);
        ctx.lineTo(4, -9);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 5);
        ctx.stroke();

        ctx.fillStyle = '#3b2930';
        path(ctx, [[-11, -8], [-15 + sway * .2, -2], [-11, 2], [-7, -3]]);
        ctx.fill();
        ctx.fillStyle = '#f0dfc5';
        path(ctx, [[8, -8], [14 + sway * .2, -2], [11, 2], [7, -3]]);
        ctx.fill();
        ctx.strokeStyle = '#c4a56d';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-9, -1);
        ctx.moveTo(10, -4);
        ctx.lineTo(13, -1);
        ctx.stroke();

        ctx.fillStyle = '#efe2cf';
        ctx.beginPath();
        ctx.moveTo(-6, -13);
        ctx.quadraticCurveTo(-8, -23, -1, -26);
        ctx.quadraticCurveTo(6, -25, 7, -14);
        ctx.lineTo(4, -10);
        ctx.lineTo(-4, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#57434a';
        ctx.lineWidth = 1;
        ctx.stroke();
        const face = ctx.createLinearGradient(-4, -20, 4, -10);
        face.addColorStop(0, '#18151c');
        face.addColorStop(1, '#07080c');
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.ellipse(0, -16, 4.7, 6, 0, 0, TAU);
        ctx.fill();
        path(ctx, [[-4, -14], [-2, -17], [0, -15], [2, -18], [4, -14], [3, -10], [0, -8], [-3, -10]]);
        ctx.fillStyle = '#ded2c1';
        ctx.fill();
        ctx.strokeStyle = '#8a756c';
        ctx.lineWidth = .55;
        ctx.stroke();
        glowOrb(ctx, -2, -16, .65, '#ff3b2f', 8);
        glowOrb(ctx, 2, -16, .65, '#ff3b2f', 8);

        ctx.save();
        ctx.translate(0, -27);
        ctx.rotate(Math.sin(time / 550) * .05);
        ctx.strokeStyle = 'rgba(248, 195, 109, .72)';
        ctx.lineWidth = 1.35;
        ctx.shadowColor = '#ffb949';
        ctx.shadowBlur = 7 + cast * 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 3.5, 0, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let i = 0; i < 8; i++) {
            const angle = i * TAU / 8 + time / 1200;
            const inner = 8.5;
            const outer = i % 2 ? 10 : 13;
            ctx.strokeStyle = i % 2 ? '#d8b278' : '#fff0bd';
            ctx.lineWidth = i % 2 ? .9 : 1.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * .4);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * .4);
            ctx.stroke();
            if (i % 2 === 0) glowOrb(ctx, Math.cos(angle) * outer,
                Math.sin(angle) * outer * .4, .8, '#ffe5a1', 5);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(facing * 10, -cast * 3);
        ctx.rotate(facing * (-.22 - cast * .52));
        ctx.strokeStyle = '#4b3028';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(1, 17);
        ctx.stroke();
        ctx.strokeStyle = '#c7a36a';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-1, 2);
        ctx.lineTo(1, 16);
        ctx.stroke();
        ctx.fillStyle = '#7a2837';
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(0, -5);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e2bd7b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -8, 5, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const angle = i * TAU / 8;
            const inner = 4.5;
            const outer = i % 2 ? 6 : 9;
            ctx.strokeStyle = i % 2 ? '#d29b51' : '#ffe7a4';
            ctx.lineWidth = i % 2 ? 1 : 1.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, -8 + Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, -8 + Math.sin(angle) * outer);
            ctx.stroke();
        }
        glowOrb(ctx, 0, -8, 2.4 + cast * 1.6, '#ff4b37', 13 + cast * 12);
        glowOrb(ctx, 0, -8, 1, '#fff1c2', 8);
        ctx.restore();

        ctx.restore();

        if (healing) {
            const pulse = 1 - healProgress;
            ctx.save();
            ctx.globalAlpha = Math.sin(Math.PI * healProgress) * .9;
            ctx.strokeStyle = '#ffe7a0';
            ctx.shadowColor = '#ffc451';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(0, 12, 12 + healProgress * 17, 4 + healProgress * 5, 0,
                time / 300, time / 300 + TAU * .85);
            ctx.stroke();
            ctx.setLineDash([2, 3]);
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.ellipse(0, 12, 8 + healProgress * 12, 2.5 + healProgress * 3, 0,
                -time / 250, -time / 250 + TAU * .8);
            ctx.stroke();
            ctx.setLineDash([]);
            for (let i = 0; i < 5; i++) {
                const angle = i * TAU / 5 - time / 300;
                const radius = 13 + healProgress * 13;
                const px = Math.cos(angle) * radius;
                const py = 8 + Math.sin(angle) * radius * .3 - pulse * 5;
                ctx.strokeStyle = '#fff4c4';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px - 1.5, py);
                ctx.lineTo(px + 1.5, py);
                ctx.moveTo(px, py - 1.5);
                ctx.lineTo(px, py + 1.5);
                ctx.stroke();
                glowOrb(ctx, px, py, 1.1, '#ffc95b', 7);
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function drawReaper(ctx, entity, time) {
        const attacking = entity.animationState === 'ATTACK';
        const attackStarted = (entity.animationUntil || time) - 450;
        const attackProgress = attacking ? Math.max(0, Math.min(1, (time - attackStarted) / 450)) : 0;
        const attackPower = attacking ? Math.sin(Math.PI * attackProgress) : 0;
        const walk = entity.moving ? Math.sin(time / 72) : 0;
        const breath = Math.sin(time / 390 + entity.id.length) * .7;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;

        ctx.save();
        ctx.translate(0, -attackPower * 2);

        const aura = ctx.createRadialGradient(0, 4, 2, 0, 4, 27 + attackPower * 9);
        aura.addColorStop(0, 'rgba(137, 6, 24, .2)');
        aura.addColorStop(.55, 'rgba(86, 3, 18, .09)');
        aura.addColorStop(1, 'rgba(45, 2, 12, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.ellipse(0, 5, 27 + attackPower * 9, 12 + attackPower * 3, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, .5)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 17 + Math.abs(walk), 4.5, 0, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.scale(facing, 1);
        ctx.translate(0, breath + Math.abs(walk) * .25);

        const cloakSwing = walk * 1.5 + Math.sin(time / 250) * 1.2 + attackPower * 2.5;
        ctx.fillStyle = '#100a10';
        path(ctx, [[-7, -10], [-17, -4], [-18 - cloakSwing, 5], [-23 - cloakSwing, 15],
            [-15, 12], [-10, 16], [-4, 12], [2, 15], [8, 10], [15, 15],
            [18 + cloakSwing, 7], [14, -6], [7, -12]]);
        ctx.fill();
        ctx.fillStyle = '#291019';
        path(ctx, [[-8, -7], [-14, 0], [-14 - cloakSwing, 12], [-8, 10],
            [-4, 15], [0, 8], [5, 15], [11, 10], [16 + cloakSwing, 13],
            [12, -1], [8, -9], [1, -12]]);
        ctx.fill();

        const mantle = ctx.createLinearGradient(-12, -12, 12, 15);
        mantle.addColorStop(0, '#42101b');
        mantle.addColorStop(.38, '#200b13');
        mantle.addColorStop(1, '#08090d');
        ctx.fillStyle = mantle;
        ctx.strokeStyle = '#10080e';
        ctx.lineWidth = 1.2;
        path(ctx, [[-8, -12], [-14, -8], [-12, -1], [-15, 6], [-13, 14],
            [-8, 11], [-5, 16], [-1, 11], [3, 16], [7, 10], [12, 14],
            [14, 6], [10, -2], [12, -8], [6, -12], [0, -15]]);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(160, 26, 43, .8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -7);
        ctx.quadraticCurveTo(-15 - cloakSwing * .4, 4, -11, 12);
        ctx.moveTo(8, -9);
        ctx.quadraticCurveTo(13 + cloakSwing * .35, 3, 11, 11);
        ctx.moveTo(-4, 4);
        ctx.lineTo(-7, 12);
        ctx.moveTo(3, 4);
        ctx.lineTo(5, 12);
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
            const phase = (time / (370 + i * 45) + i * .29 + entity.id.length * .07) % 1;
            const side = i % 2 ? -1 : 1;
            const px = side * (10 + i * 2 + Math.sin(time / 190 + i) * 2);
            const py = 8 - phase * 30;
            ctx.globalAlpha = (1 - phase) * .72;
            ctx.strokeStyle = i % 2 ? '#ff253c' : '#8e142c';
            ctx.lineWidth = i % 2 ? 1.4 : .9;
            ctx.beginPath();
            ctx.moveTo(px, py + 3);
            ctx.quadraticCurveTo(px + side * 4, py, px + side * (2 + attackPower * 4), py - 5);
            ctx.stroke();
            glowOrb(ctx, px + side * 2, py - 4, .8, '#ff3446', 7);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#08090d';
        path(ctx, [[-8, 3], [-7 + walk, 10], [-5, 13], [-1, 12], [-2, 4]]);
        ctx.fill();
        path(ctx, [[2, 4], [2 - walk, 10], [5, 13], [9, 11], [7, 3]]);
        ctx.fill();
        ctx.fillStyle = '#55202a';
        path(ctx, [[-9 + walk, 10], [-2, 10], [-1, 13], [-10 + walk, 13]]);
        ctx.fill();
        path(ctx, [[2, 10], [9 - walk, 10], [11 - walk, 13], [4, 13]]);
        ctx.fill();
        ctx.strokeStyle = '#b53a42';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-9, 11);
        ctx.lineTo(-3, 11);
        ctx.moveTo(4, 11);
        ctx.lineTo(9, 11);
        ctx.stroke();

        ctx.fillStyle = '#171017';
        path(ctx, [[-10, -10], [-15, -7], [-17, -1], [-12, 2], [-8, -4]]);
        ctx.fill();
        path(ctx, [[8, -10], [14, -7], [16, -1], [11, 3], [7, -4]]);
        ctx.fill();
        ctx.fillStyle = '#601722';
        path(ctx, [[-13, -7], [-19, -3], [-14, -4], [-10, 0], [-8, -5]]);
        ctx.fill();
        path(ctx, [[11, -7], [17, -4], [13, -4], [9, 0], [7, -5]]);
        ctx.fill();

        const armor = ctx.createLinearGradient(-8, -14, 8, 9);
        armor.addColorStop(0, '#3a3037');
        armor.addColorStop(.48, '#1b151d');
        armor.addColorStop(1, '#0a0a0f');
        ctx.fillStyle = armor;
        ctx.strokeStyle = '#6d3540';
        ctx.lineWidth = .9;
        path(ctx, [[-8, -11], [-10, -5], [-8, 4], [-5, 8], [5, 8],
            [9, 3], [10, -5], [7, -11], [3, -14], [-3, -14]]);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(218, 190, 168, .78)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -7);
        ctx.lineTo(-3, -3);
        ctx.lineTo(0, -5);
        ctx.lineTo(3, -2);
        ctx.lineTo(6, -6);
        ctx.moveTo(-5, 0);
        ctx.lineTo(-2, 3);
        ctx.lineTo(1, 1);
        ctx.lineTo(4, 4);
        ctx.stroke();

        ctx.strokeStyle = '#a91c31';
        ctx.shadowColor = '#f11837';
        ctx.shadowBlur = 7 + attackPower * 12;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-8, -5);
        ctx.lineTo(-4, -1);
        ctx.lineTo(-6, 3);
        ctx.moveTo(7, -7);
        ctx.lineTo(3, -3);
        ctx.lineTo(5, 1);
        ctx.moveTo(-2, -10);
        ctx.lineTo(0, -7);
        ctx.lineTo(2, -9);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#8c7165';
        ctx.beginPath();
        ctx.ellipse(0, 1, 4.2, 4.8, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d0b9a4';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 3.6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a1720';
        ctx.fillRect(-2.1, -1, 1.2, 1.2);
        ctx.fillRect(.9, -1, 1.2, 1.2);
        ctx.strokeStyle = '#513840';
        ctx.lineWidth = .55;
        ctx.beginPath();
        ctx.moveTo(-2, 2);
        ctx.lineTo(-1.2, 3);
        ctx.lineTo(-.4, 2);
        ctx.lineTo(.4, 3);
        ctx.lineTo(1.2, 2);
        ctx.lineTo(2, 3);
        ctx.stroke();

        ctx.fillStyle = '#0c0a10';
        ctx.beginPath();
        ctx.moveTo(-6, -14);
        ctx.quadraticCurveTo(-10, -19, -7, -25);
        ctx.lineTo(-3, -29);
        ctx.lineTo(0, -25);
        ctx.lineTo(4, -30);
        ctx.lineTo(8, -24);
        ctx.lineTo(7, -16);
        ctx.lineTo(4, -12);
        ctx.lineTo(2, -17);
        ctx.lineTo(-1, -13);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#63303b';
        ctx.lineWidth = .8;
        ctx.stroke();
        ctx.strokeStyle = '#a51c31';
        ctx.shadowColor = '#ff1e3d';
        ctx.shadowBlur = 9 + attackPower * 8;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -22);
        ctx.lineTo(-2, -19);
        ctx.lineTo(1, -23);
        ctx.lineTo(5, -20);
        ctx.stroke();
        ctx.shadowBlur = 0;
        glowOrb(ctx, -2, -19, .8, '#ff283f', 8);
        glowOrb(ctx, 2, -19, .8, '#ff283f', 8);

        ctx.fillStyle = '#d5c1a7';
        ctx.beginPath();
        ctx.ellipse(0, 7.2, 3.3, 3.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#170e15';
        ctx.fillRect(-2, 6.2, 1.1, 1.1);
        ctx.fillRect(.9, 6.2, 1.1, 1.1);
        ctx.strokeStyle = '#6a4344';
        ctx.lineWidth = .65;
        ctx.beginPath();
        ctx.moveTo(-2, 8.5);
        ctx.lineTo(2, 8.5);
        ctx.stroke();
        ctx.strokeStyle = '#b79774';
        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(-6, 9);
        ctx.lineTo(-3, 11);
        ctx.moveTo(4, 5);
        ctx.lineTo(6, 9);
        ctx.lineTo(3, 11);
        ctx.stroke();

        ctx.save();
        ctx.translate(8, -6);
        ctx.rotate(-.48 + (attacking ? -1.15 + attackProgress * 2.35 : Math.sin(time / 260) * .035));
        ctx.strokeStyle = '#100d13';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(3, 26);
        ctx.stroke();
        ctx.strokeStyle = '#98734f';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(.3, 2);
        ctx.lineTo(3, 25);
        ctx.stroke();
        ctx.strokeStyle = '#c9a875';
        ctx.lineWidth = .75;
        for (let i = 0; i < 4; i++) {
            const yy = 6 + i * 5;
            ctx.beginPath();
            ctx.moveTo(.6 + i * .3, yy);
            ctx.lineTo(2.4 + i * .3, yy + 1.1);
            ctx.stroke();
        }
        ctx.fillStyle = '#5f1522';
        ctx.beginPath();
        ctx.moveTo(-1, 2);
        ctx.lineTo(2, -3);
        ctx.lineTo(5, 2);
        ctx.lineTo(2, 5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#171016';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2, 2);
        ctx.quadraticCurveTo(21, -4, 17, -21);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.fillStyle = '#1e171e';
        ctx.beginPath();
        ctx.moveTo(16, -21);
        ctx.quadraticCurveTo(26, -39, 39, -36);
        ctx.quadraticCurveTo(30, -31, 28, -20);
        ctx.quadraticCurveTo(23, -11, 14, -10);
        ctx.quadraticCurveTo(22, -19, 16, -21);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#64424b';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#a71930';
        ctx.shadowColor = '#ff193b';
        ctx.shadowBlur = 12 + attackPower * 17;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(18, -22);
        ctx.quadraticCurveTo(27, -35, 36, -35);
        ctx.quadraticCurveTo(29, -29, 27, -21);
        ctx.stroke();
        ctx.strokeStyle = '#ff6470';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(20, -22);
        ctx.quadraticCurveTo(28, -32, 34, -34);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#a61b31';
        path(ctx, [[13, -18], [10, -22], [16, -21], [18, -17]]);
        ctx.fill();
        glowOrb(ctx, 18, -21, 1.5 + attackPower * .8, '#ff263f', 12);
        ctx.restore();

        if (attacking) {
            const sweep = -2.45 + attackProgress * 2.5;
            ctx.globalAlpha = attackPower * .75;
            ctx.strokeStyle = '#ff263d';
            ctx.shadowColor = '#ff102e';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 3 + attackPower * 2;
            ctx.beginPath();
            ctx.arc(5, -2, 25 + attackPower * 6, sweep - .95, sweep + .2);
            ctx.stroke();
            ctx.strokeStyle = '#ffd1b3';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(5, -2, 27 + attackPower * 6, sweep - .78, sweep + .05);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const angle = sweep - .7 + i * .21;
                const radius = 25 + attackPower * 8 + Math.sin(time / 35 + i) * 2;
                glowOrb(ctx, 5 + Math.cos(angle) * radius, -2 + Math.sin(angle) * radius * .55,
                    1.1 + (i % 2) * .6, i % 2 ? '#ff5264' : '#ffc1a1', 9);
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        for (let i = 0; i < 3; i++) {
            const angle = time / (370 + i * 40) + i * TAU / 3 + entity.id.length;
            const radius = 13 + i * 2 + attackPower * 4;
            glowOrb(ctx, Math.cos(angle) * radius, -5 + Math.sin(angle) * radius * .5,
                .8 + (i % 2) * .4, i % 2 ? '#ff263f' : '#c92538', 8);
        }
        ctx.restore();
    }

    function drawSniper(ctx, entity, time) {
        const attacking = entity.animationState === 'ATTACK';
        const attackStarted = (entity.animationUntil || time) - 450;
        const attackProgress = attacking ? Math.max(0, Math.min(1, (time - attackStarted) / 450)) : 0;
        const recoil = attacking ? Math.sin(Math.PI * attackProgress) : 0;
        const walk = entity.moving ? Math.sin(time / 78) : 0;
        const sway = Math.sin(time / 310 + entity.id.length) * .8;
        const facing = Math.cos(entity.angle || 0) < 0 ? -1 : 1;
        const fifthShot = (entity.shotCount || 0) === 5;
        const energy = fifthShot ? '#71e7ff' : '#379aff';

        ctx.save();
        ctx.translate(0, -recoil * .6);

        const blueAura = ctx.createRadialGradient(0, 1, 2, 0, 1, 25 + recoil * 8);
        blueAura.addColorStop(0, 'rgba(29, 102, 217, .2)');
        blueAura.addColorStop(.55, 'rgba(22, 61, 128, .09)');
        blueAura.addColorStop(1, 'rgba(13, 24, 49, 0)');
        ctx.fillStyle = blueAura;
        ctx.beginPath();
        ctx.ellipse(0, 3, 25 + recoil * 8, 10 + recoil * 2, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, .5)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 14.5, 4, 0, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.scale(facing, 1);
        ctx.translate(-recoil * 1.5, Math.abs(walk) * .2);
        ctx.scale(.92, 1);

        const cape = ctx.createLinearGradient(-15, -8, 12, 16);
        cape.addColorStop(0, '#253c6a');
        cape.addColorStop(.38, '#17243b');
        cape.addColorStop(1, '#090c14');
        ctx.fillStyle = cape;
        path(ctx, [[-6, -12], [-14, -8], [-17 + sway, 0], [-20 + sway, 12],
            [-14, 10], [-10, 16], [-5, 11], [0, 16], [6, 10], [11 + sway, 14],
            [15 + sway, 6], [11, -5], [7, -12]]);
        ctx.fill();
        ctx.strokeStyle = '#111722';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(63, 143, 255, .8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.quadraticCurveTo(-16 + sway, 4, -13, 12);
        ctx.moveTo(8, -8);
        ctx.quadraticCurveTo(13 + sway, 3, 12, 10);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
            const phase = (time / (390 + i * 80) + i * .37) % 1;
            const px = (i % 2 ? -1 : 1) * (9 + i * 3 + Math.sin(time / 210 + i) * 2);
            const py = 8 - phase * 29;
            ctx.globalAlpha = (1 - phase) * .75;
            ctx.strokeStyle = i % 2 ? '#238cff' : '#8feaff';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(px, py + 3);
            ctx.lineTo(px + (i % 2 ? -1 : 1) * 5, py - 4);
            ctx.stroke();
            glowOrb(ctx, px, py - 3, .85, energy, 7);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#11131a';
        ctx.save();
        ctx.translate(-4, 3);
        ctx.rotate(walk * .11);
        path(ctx, [[-3, -1], [-4, 5], [-3, 10], [-5, 12], [2, 12], [3, 10], [1, 5], [2, 0]]);
        ctx.fill();
        ctx.fillStyle = '#493c33';
        path(ctx, [[-5, 9], [2, 9], [4, 12], [-5, 12]]);
        ctx.fill();
        ctx.strokeStyle = '#bf9a64';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-3, 10);
        ctx.lineTo(2, 10);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#11131a';
        ctx.save();
        ctx.translate(4, 3);
        ctx.rotate(-walk * .11);
        path(ctx, [[-2, 0], [-1, 5], [-3, 10], [-2, 12], [5, 12], [4, 10], [3, 5], [3, -1]]);
        ctx.fill();
        ctx.fillStyle = '#493c33';
        path(ctx, [[-2, 9], [5, 9], [7, 12], [-2, 12]]);
        ctx.fill();
        ctx.strokeStyle = '#bf9a64';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(5, 10);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#bf9a64';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-8, 11);
        ctx.lineTo(-3, 11);
        ctx.moveTo(4, 11);
        ctx.lineTo(9, 11);
        ctx.stroke();

        const armor = ctx.createLinearGradient(-10, -13, 10, 9);
        armor.addColorStop(0, '#62606a');
        armor.addColorStop(.25, '#30313b');
        armor.addColorStop(.7, '#181b25');
        armor.addColorStop(1, '#0a0d14');
        ctx.fillStyle = armor;
        ctx.strokeStyle = '#96724d';
        ctx.lineWidth = 1;
        path(ctx, [[-6, -11], [-10, -7], [-9, 1], [-7, 7], [-3, 5],
            [0, 8], [4, 5], [7, 7], [10, 1], [9, -7], [5, -12],
            [2, -14], [-4, -13]]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#493a2e';
        path(ctx, [[-9, -8], [-14, -6], [-13, -1], [-8, -2]]);
        ctx.fill();
        path(ctx, [[7, -9], [13, -7], [14, -2], [8, -1]]);
        ctx.fill();
        ctx.strokeStyle = '#c19a61';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-12, -5);
        ctx.lineTo(-9, -2);
        ctx.moveTo(12, -6);
        ctx.lineTo(8, -2);
        ctx.stroke();

        ctx.fillStyle = '#273b62';
        path(ctx, [[-3, -10], [0, -12], [3, -10], [2, 2], [0, 5], [-2, 2]]);
        ctx.fill();
        ctx.strokeStyle = '#79caff';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 3);
        ctx.stroke();
        glowOrb(ctx, 0, -3, 1.1 + recoil * .6, energy, 8);

        ctx.fillStyle = '#131722';
        ctx.beginPath();
        ctx.moveTo(-6, -12);
        ctx.quadraticCurveTo(-9, -20, -5, -26);
        ctx.lineTo(-1, -30);
        ctx.lineTo(3, -27);
        ctx.lineTo(8, -23);
        ctx.lineTo(6, -15);
        ctx.lineTo(2, -12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#725b4b';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#409dff';
        ctx.shadowColor = '#168cff';
        ctx.shadowBlur = 7;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-5, -23);
        ctx.lineTo(-1, -20);
        ctx.lineTo(3, -24);
        ctx.lineTo(6, -21);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#070b12';
        path(ctx, [[-4, -18], [0, -21], [5, -18], [4, -14], [0, -12], [-4, -14]]);
        ctx.fill();
        glowOrb(ctx, 1, -17, .8, '#81e7ff', 8);

        ctx.save();
        ctx.translate(1, -8);
        ctx.rotate(recoil * .025);
        ctx.fillStyle = '#30251f';
        ctx.strokeStyle = '#a27c50';
        ctx.lineWidth = 1;
        path(ctx, [[-1, -2], [4, -4], [9, -2], [12, 0], [10, 2],
            [5, 1], [1, 5], [-5, 6], [-8, 3], [-3, 1]]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#503a2d';
        path(ctx, [[-6, 4], [-11, 5], [-12, 8], [-6, 8], [-2, 6]]);
        ctx.fill();

        ctx.strokeStyle = '#141923';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(30, -1 - recoil * 1.2);
        ctx.stroke();
        ctx.strokeStyle = '#a37c50';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(8, -1);
        ctx.lineTo(30, -2 - recoil * 1.2);
        ctx.stroke();
        ctx.strokeStyle = '#28364d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(9, 1);
        ctx.lineTo(22, 1);
        ctx.stroke();
        ctx.strokeStyle = '#84dfff';
        ctx.shadowColor = energy;
        ctx.shadowBlur = 8 + recoil * 14;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(21, -2 - recoil * 1.2);
        ctx.lineTo(29, -2 - recoil * 1.2);
        ctx.stroke();
        ctx.fillStyle = '#131924';
        path(ctx, [[27, -4], [35, -4], [39, -2], [35, 0], [27, 0]]);
        ctx.fill();
        ctx.strokeStyle = '#d2b179';
        ctx.lineWidth = .7;
        ctx.stroke();
        ctx.fillStyle = '#0a101b';
        ctx.fillRect(12, -3, 2.3, 7);
        ctx.fillRect(20, -3, 2.3, 7);
        ctx.strokeStyle = '#d0a76d';
        ctx.lineWidth = .6;
        ctx.strokeRect(12, -3, 2.3, 7);
        ctx.strokeRect(20, -3, 2.3, 7);

        ctx.save();
        ctx.translate(29, -2 - recoil * 1.2);
        ctx.strokeStyle = '#b89461';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 3.3, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#0e1928';
        ctx.beginPath();
        ctx.arc(0, 0, 1.9, 0, TAU);
        ctx.fill();
        glowOrb(ctx, 0, 0, .9, energy, 7);
        ctx.restore();
        ctx.restore();

        if (attacking) {
            const flash = Math.max(0, 1 - attackProgress * 4) * (fifthShot ? 1 : .75);
            const muzzleX = 38;
            const muzzleY = -2 - recoil * 1.2;
            ctx.globalAlpha = flash;
            ctx.strokeStyle = fifthShot ? '#eaffff' : '#9cecff';
            ctx.shadowColor = energy;
            ctx.shadowBlur = fifthShot ? 22 : 14;
            ctx.lineWidth = fifthShot ? 3 : 1.7;
            ctx.beginPath();
            ctx.moveTo(muzzleX - 3, muzzleY);
            ctx.lineTo(muzzleX + (fifthShot ? 13 : 8), muzzleY);
            ctx.moveTo(muzzleX, muzzleY - 4);
            ctx.lineTo(muzzleX + (fifthShot ? 9 : 5), muzzleY + 3);
            ctx.moveTo(muzzleX, muzzleY + 4);
            ctx.lineTo(muzzleX + (fifthShot ? 9 : 5), muzzleY - 3);
            ctx.stroke();
            glowOrb(ctx, muzzleX + 1, muzzleY, fifthShot ? 3.3 : 2, energy,
                fifthShot ? 20 : 12);
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        for (let i = 0; i < 3; i++) {
            const angle = time / (430 + i * 65) + i * TAU / 3 + entity.id.length;
            const radius = 15 + i * 2;
            glowOrb(ctx, Math.cos(angle) * radius, -7 + Math.sin(angle) * radius * .45,
                .75 + (i % 2) * .4, i === 1 ? '#b0f2ff' : '#368cff', 7);
        }
        ctx.restore();
    }

    function drawMinion(ctx, entity, time) {
        if (entity.type === 'reaper') {
            drawReaper(ctx, entity, time);
            return;
        }
        if (entity.type === 'sniper') {
            drawSniper(ctx, entity, time);
            return;
        }
        if (entity.type === 'cleric') {
            drawCleric(ctx, entity, time);
            return;
        }
        const reaper = entity.type === 'reaper';
        const sniper = entity.type === 'sniper';
        const cleric = entity.type === 'cleric';
        const color = reaper ? '#f22e4e' : sniper ? '#ff492f' : '#f5edff';
        const bob = Math.sin(time / (reaper ? 120 : 180) + entity.id.length) * 1.5;

        ctx.fillStyle = 'rgba(0, 0, 0, .46)';
        ctx.beginPath();
        ctx.ellipse(0, 13, 14, 4, 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(0, bob);
        ctx.globalAlpha = cleric ? .96 : .94;
        ctx.fillStyle = cleric ? '#d8d0dd' : '#140e18';
        path(ctx, [[-7, -7], [-12, 1], [-16, 10], [-11, 9], [-7, 4], [-9, 13], [8, 13], [5, 3], [12, 10], [14, 7], [9, -8]]);
        ctx.fill();
        ctx.fillStyle = reaper ? '#641522' : sniper ? '#24202a' : '#6e6079';
        path(ctx, [[-8, -7], [-5, -18], [0, -21], [6, -17], [10, -6], [7, 7], [0, 11], [-7, 6]]);
        ctx.fill();
        ctx.strokeStyle = cleric ? '#e7c9ff' : '#6a3444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = cleric ? 'rgba(255, 239, 255, .8)' : 'rgba(255, 112, 127, .72)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -7);
        ctx.lineTo(-3, 1);
        ctx.lineTo(0, 4);
        ctx.lineTo(3, 1);
        ctx.lineTo(5, -7);
        ctx.moveTo(-6, 7);
        ctx.lineTo(-2, 10);
        ctx.lineTo(2, 10);
        ctx.lineTo(6, 7);
        ctx.stroke();
        if (cleric) {
            ctx.fillStyle = '#e7dfe9';
            path(ctx, [[-6, -17], [-8, -26], [-3, -21], [0, -28], [4, -21], [8, -25], [6, -16]]);
            ctx.fill();
            ctx.strokeStyle = '#a472bf';
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(0, 9);
            ctx.moveTo(-5, -2);
            ctx.lineTo(5, -2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(240, 202, 255, .8)';
            ctx.beginPath();
            ctx.ellipse(0, -29, 11, 3, Math.sin(time / 240) * .12, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = '#fff4ff';
            ctx.fillRect(-2, -14, 4, 2);
            ctx.fillRect(-1, -15, 2, 4);
            glowOrb(ctx, 10, -8, 3.5, '#f5deff', 16);
        } else if (reaper) {
            ctx.fillStyle = '#160b12';
            path(ctx, [[-6, -21], [-9, -29], [-3, -26], [0, -31], [4, -25], [9, -29], [6, -20]]);
            ctx.fill();
            ctx.strokeStyle = '#ced3d8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(7, -12);
            ctx.lineTo(12, 8);
            ctx.quadraticCurveTo(26, -1, 14, -8);
            ctx.stroke();
            ctx.strokeStyle = '#ff3451';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-4, -4);
            ctx.lineTo(4, 4);
            ctx.moveTo(4, -4);
            ctx.lineTo(-4, 4);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 73, 98, .8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-5, -12);
            ctx.lineTo(-10, -4);
            ctx.lineTo(-5, 2);
            ctx.moveTo(5, -12);
            ctx.lineTo(10, -4);
            ctx.lineTo(5, 2);
            ctx.stroke();
            glowOrb(ctx, 1, -7, 2.2, '#ff334f', 14);
        } else {
            ctx.fillStyle = '#17161d';
            path(ctx, [[-8, -17], [-6, -25], [0, -28], [7, -24], [9, -16]]);
            ctx.fill();
            ctx.strokeStyle = '#756148';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(5, -4);
            ctx.lineTo(15, -1);
            ctx.lineTo(23, -1);
            ctx.stroke();
            ctx.fillStyle = '#5a3c2f';
            ctx.fillRect(12, -4, 9, 5);
            ctx.strokeStyle = '#f05b42';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(17, -2);
            ctx.lineTo(23, -2);
            ctx.stroke();
            ctx.strokeStyle = '#f5d18c';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(7, -3, 9, -1.15, 1.15);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 112, 76, .8)';
            ctx.beginPath();
            ctx.moveTo(-6, -23);
            ctx.lineTo(0, -19);
            ctx.lineTo(6, -23);
            ctx.stroke();
            glowOrb(ctx, 17, -2, 1.8, '#ffb36c', 10);
            ctx.fillStyle = '#312b36';
            ctx.fillRect(-4, -2, 9, 2);
            ctx.fillStyle = '#9f1a30';
            ctx.fillRect(-2, 0, 4, 5);
        }
        ctx.strokeStyle = cleric ? 'rgba(242, 211, 255, .8)' : 'rgba(255, 52, 78, .8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, -7);
        ctx.lineTo(-4, -2);
        ctx.lineTo(-6, 3);
        ctx.moveTo(7, -7);
        ctx.lineTo(4, -2);
        ctx.lineTo(6, 3);
        ctx.stroke();
        if (reaper) {
            ctx.strokeStyle = '#d9dce7';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(10, -10);
            ctx.lineTo(17, 7);
            ctx.quadraticCurveTo(25, 2, 18, -5);
            ctx.stroke();
            ctx.strokeStyle = '#ff3150';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-5, -5);
            ctx.lineTo(5, 5);
            ctx.moveTo(5, -5);
            ctx.lineTo(-5, 5);
            ctx.stroke();
        } else if (sniper) {
            ctx.strokeStyle = '#e0b36d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-8, -22);
            ctx.lineTo(0, -29);
            ctx.lineTo(8, -22);
            ctx.stroke();
            glowOrb(ctx, 0, -25, 1.4, '#ff603f', 9);
        } else {
            ctx.strokeStyle = '#f0dcff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, -17, 7, 0, TAU);
            ctx.stroke();
        }
        if (entity.animationState === 'ATTACK' || entity.animationState === 'HEAL') {
            const attackAt = (entity.animationUntil || time) - 450;
            const progress = Math.max(0, Math.min(1, (time - attackAt) / 450));
            const effectColor = entity.animationState === 'HEAL' ? '#edbdff' : color;
            ctx.save();
            ctx.globalAlpha = 1 - progress * .65;
            ctx.strokeStyle = effectColor;
            ctx.shadowColor = effectColor;
            ctx.shadowBlur = 14;
            ctx.lineWidth = 2;
            if (cleric || sniper) {
                ctx.beginPath();
                ctx.moveTo(cleric ? 10 : 17, -8);
                ctx.lineTo((cleric ? 10 : 17) + progress * 24, -8 - progress * 3);
                ctx.stroke();
                glowOrb(ctx, (cleric ? 10 : 17) + progress * 24, -8 - progress * 3,
                    cleric ? 3 : 1.6, effectColor, 12);
            } else {
                ctx.beginPath();
                ctx.arc(0, 1, 12 + progress * 13, -2.2 + progress * 1.5,
                    -.2 + progress * 1.4);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.fillStyle = cleric ? '#fff5ff' : '#20111a';
        ctx.beginPath();
        ctx.ellipse(0, -17, 4, 5, 0, 0, TAU);
        ctx.fill();
        glowOrb(ctx, -1.5, -17, 1, color, 8);
        glowOrb(ctx, 1.5, -17, 1, color, 8);
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawBubble(ctx, text, x, y) {
        ctx.save();
        ctx.font = "bold 12px 'Rajdhani', 'Segoe UI', Arial, sans-serif";
        const width = Math.max(72, Math.min(158, ctx.measureText(text).width + 20));
        const height = 26;
        const boxY = y - 51;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 0, 0, .65)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#fff8df';
        ctx.strokeStyle = '#49345b';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - width / 2, boxY, width, height, 7);
        else ctx.rect(x - width / 2, boxY, width, height);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 5, boxY + height - 1);
        ctx.lineTo(x, boxY + height + 6);
        ctx.lineTo(x + 5, boxY + height - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#342844';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, boxY + height / 2, width - 12);
        ctx.restore();
    }

    function drawMinionLifetime(ctx, entity, time) {
        if (!['reaper', 'sniper', 'cleric'].includes(entity.type) ||
            !Number.isFinite(entity.expiresAt)) return;
        const remaining = Math.max(0, entity.expiresAt - time);
        const seconds = Math.ceil(remaining / 1000);
        const duration = entity.type === 'cleric' ? 15000 : 30000;
        const ratio = Math.min(1, remaining / duration);
        const x = 17;
        const y = -45;

        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(8, 11, 18, .88)';
        ctx.strokeStyle = entity.type === 'sniper' ? 'rgba(99, 186, 255, .82)' :
            entity.type === 'cleric' ? 'rgba(255, 202, 101, .82)' : 'rgba(255, 73, 89, .82)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-13, -6, 26, 12, 5);
        else ctx.rect(-13, -6, 26, 12);
        ctx.fill();
        ctx.stroke();

        const color = entity.type === 'sniper' ? '#71d9ff' :
            entity.type === 'cleric' ? '#ffd477' : '#ff5363';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-8, 0, 3.4, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = "700 8px 'Rajdhani', Arial, sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seconds + 's', 3, .4);
        ctx.restore();
    }

    function drawSummon(entity) {
        const ctx = window.ctx;
        if (!ctx || !entity || entity.hp <= 0) return;
        const time = Date.now();
        ctx.save();
        ctx.translate(entity.x, entity.y);
        if (entity.type.indexOf('skull_') === 0) drawSkull(ctx, entity, time);
        else drawMinion(ctx, entity, time);

        const hpRatio = Math.max(0, Math.min(1, entity.hp / Math.max(1, entity.maxHp)));
        ctx.fillStyle = 'rgba(0, 0, 0, .78)';
        ctx.fillRect(-12, 15, 24, 3);
        ctx.fillStyle = entity.type === 'cleric' ? '#e8c2ff' :
            entity.type === 'skull_mage' ? '#bc60ef' : '#ea2c48';
        ctx.fillRect(-11, 16, 22 * hpRatio, 1.5);
        const pointerX = Number(window.mouseWorldX);
        const pointerY = Number(window.mouseWorldY);
        const hovering = Number.isFinite(pointerX) && Number.isFinite(pointerY) &&
            Math.abs(pointerX - entity.x) <= 27 && Math.abs(pointerY - entity.y) <= 34;
        if (hovering) {
            ctx.fillStyle = 'rgba(5, 6, 10, .78)';
            ctx.fillRect(-23, 20, 46, 10);
            ctx.font = "700 8px 'Rajdhani', Arial, sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0, 0, 0, .95)';
            const hpText = Math.max(0, Math.ceil(entity.hp)) + '/' +
                Math.max(1, Math.ceil(entity.maxHp || entity.hp));
            ctx.strokeText(hpText, 0, 25);
            ctx.fillStyle = '#fff';
            ctx.fillText(hpText, 0, 25);
        }
        drawMinionLifetime(ctx, entity, time);
        if (entity.dialogueText && (!entity.dialogueUntil || entity.dialogueUntil > time)) {
            drawBubble(ctx, entity.dialogueText, 0, -15);
        }
        if (entity.lordMalakarBuffActive) {
            const buffY = -38 + Math.sin(time / 150) * 2;
            ctx.save();
            ctx.translate(0, buffY);
            ctx.rotate(time / 540);
            ctx.shadowColor = '#ba72ff';
            ctx.shadowBlur = 13;
            ctx.strokeStyle = 'rgba(216, 166, 255, .92)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 8.5, .1, Math.PI * 1.82);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 218, 143, .85)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 5.2, Math.PI * .95, Math.PI * 2.82);
            ctx.stroke();
            ctx.fillStyle = '#e8c4ff';
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            for (let i = 0; i < 4; i++) {
                const angle = time / 300 + i * TAU / 4;
                glowOrb(ctx, Math.cos(angle) * 11, Math.sin(angle) * 7,
                    1.1 + (i % 2) * .4, i % 2 ? '#ffe0a3' : '#c77cff', 9);
            }
            ctx.restore();
        }
        if (entity.createdAt && time - entity.createdAt < 900) {
            const progress = (time - entity.createdAt) / 900;
            ctx.globalAlpha = 1 - progress;
            ctx.strokeStyle = entity.type === 'skull_mage' ? '#d468ff' : '#ff354f';
            ctx.lineWidth = 2 - progress;
            ctx.beginPath();
            ctx.ellipse(0, 10, 10 + progress * 30, 3 + progress * 9, 0, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawBloodTether(ctx, x1, y1, x2, y2, time, intensity) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.hypot(dx, dy) || 1;
        const nx = -dy / distance;
        const ny = dx / distance;
        const wave = Math.sin(time / 95) * Math.min(11, distance * .035);
        ctx.save();
        ctx.globalAlpha = intensity || 1;
        ctx.strokeStyle = 'rgba(105, 4, 25, .9)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2 + nx * wave, (y1 + y2) / 2 + ny * wave, x2, y2);
        ctx.stroke();
        ctx.strokeStyle = '#f31d43';
        ctx.shadowColor = '#ff173e';
        ctx.shadowBlur = 11;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let i = 0; i < 13; i++) {
            const flow = (time / 430 + i / 13) % 1;
            const t = 1 - flow;
            const bend = Math.sin(Math.PI * t) * wave;
            const px = x1 + dx * t + nx * bend;
            const py = y1 + dy * t + ny * bend;
            glowOrb(ctx, px, py, i % 4 === 0 ? 2.4 : 1.3,
                i % 3 ? '#ff304e' : '#ffb0ba', i % 4 === 0 ? 12 : 7);
        }
        ctx.restore();
    }

    function drawChain(ctx, x1, y1, x2, y2, time, index) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.hypot(dx, dy) || 1;
        const nx = -dy / distance;
        const ny = dx / distance;
        const wave = Math.sin(time / 90 + index) * 5;
        ctx.save();
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 13;
        ctx.strokeStyle = 'rgba(229, 24, 63, .82)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2 + nx * wave, (y1 + y2) / 2 + ny * wave, x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        const links = Math.max(3, Math.floor(distance / 15));
        for (let i = 1; i < links; i++) {
            const t = i / links;
            const curve = Math.sin(Math.PI * t) * wave;
            const x = x1 + dx * t + nx * curve;
            const y = y1 + dy * t + ny * curve;
            const twist = time / 160 + i * 1.8 + index;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.atan2(dy, dx) + twist);
            ctx.strokeStyle = i % 2 ? '#ff8a9b' : '#711022';
            ctx.lineWidth = 1.6;
            ctx.strokeRect(-3.2, -1.2, 6.4, 2.4);
            ctx.restore();
        }
        glowOrb(ctx, x1, y1, 3 + Math.sin(time / 110 + index) * .8, '#ff2448', 13);
        glowOrb(ctx, x2, y2, 3, '#ff435d', 11);
        for (let i = 0; i < 11; i++) {
            const flow = (time / 520 + i / 11 + index * .17) % 1;
            const t = 1 - flow;
            const bend = Math.sin(Math.PI * t) * wave;
            const px = x1 + dx * t + nx * bend;
            const py = y1 + dy * t + ny * bend;
            glowOrb(ctx, px, py, i % 3 === 0 ? 2.1 : 1.2,
                i % 2 ? '#ff2548' : '#ffb0c0', 9);
        }
        ctx.restore();
    }

    function drawLinks(player, targets, x, y) {
        const ctx = window.ctx;
        const link = player && player.lordMalakarLink;
        if (!ctx || !link || link.expiresAt <= Date.now()) return;
        const ids = new Set(link.targetIds || []);
        const centerX = x + 12;
        const centerY = y + 16;
        const time = Date.now();
        const remaining = Math.max(0, link.expiresAt - time);
        const pulse = (Math.sin(time / 85) + 1) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(95, 3, 27, .08)';
        ctx.strokeStyle = 'rgba(226, 25, 58, .2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([7, 8]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 600, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = .45 + pulse * .3;
        ctx.strokeStyle = '#ff3456';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 34 + pulse * 3, Date.now() / 500, Date.now() / 500 + Math.PI * 1.7);
        ctx.stroke();
        ctx.globalAlpha = 1;
        targets.forEach(function (target, index) {
            if (!target || target.hp <= 0 || !ids.has(target.id)) return;
            drawChain(ctx, centerX, centerY, target.x, target.y, Date.now(), index);
            ctx.save();
            ctx.translate(target.x, target.y);
            ctx.strokeStyle = 'rgba(255, 44, 75, ' + (.55 + pulse * .3) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 17 + pulse * 3, Date.now() / 240, Date.now() / 240 + Math.PI * 1.55);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const dropY = 5 + ((time / 95 + i * 0.23) % 1) * 17;
                ctx.globalAlpha = .35 + pulse * .45;
                ctx.strokeStyle = i % 2 ? '#ff7a91' : '#9f0829';
                ctx.lineWidth = i % 2 ? 1.8 : 1.2;
                ctx.beginPath();
                ctx.moveTo(Math.sin(i * 4.3) * 7, dropY - 2);
                ctx.lineTo(Math.sin(i * 4.3) * 7 + 1, dropY + 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        });
        ctx.fillStyle = 'rgba(26, 5, 13, .78)';
        ctx.fillRect(centerX - 14, centerY + 20, 28, 3);
        ctx.fillStyle = '#f12d50';
        ctx.fillRect(centerX - 13, centerY + 21, 26 * Math.min(1, remaining / 5000), 1.5);
        ctx.restore();
    }

    function drawSkillEffect(effect) {
        const ctx = window.ctx;
        if (!ctx || !effect) return;
        const progress = Math.max(0, Math.min(1, (Date.now() - effect.startedAt) / effect.duration));
        if (effect.skill === 'blood_tether' || effect.skill === 'summonAttack' ||
            effect.skill === 'heal') {
            const targetX = Number.isFinite(effect.targetX) ? effect.targetX : effect.x + 40;
            const targetY = Number.isFinite(effect.targetY) ? effect.targetY : effect.y;
            if (effect.skill === 'blood_tether') {
                drawBloodTether(ctx, effect.x, effect.y, targetX, targetY, Date.now(), 1 - progress);
            } else if (effect.skill === 'heal') {
                const time = Date.now();
                const dx = effect.x - (effect.fromX || effect.x);
                const dy = effect.y - (effect.fromY || effect.y);
                const distance = Math.hypot(dx, dy) || 1;
                const controlX = (effect.x + (effect.fromX || effect.x)) / 2;
                const controlY = (effect.y + (effect.fromY || effect.y)) / 2 - Math.min(42, distance * .16);
                const travel = 1 - Math.pow(1 - progress, 2.2);
                const ring = 8 + progress * 34;
                ctx.save();

                ctx.globalAlpha = .8 * (1 - progress * .45);
                ctx.strokeStyle = 'rgba(255, 202, 98, .48)';
                ctx.shadowColor = '#ffc653';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(effect.fromX || effect.x, effect.fromY || effect.y);
                ctx.quadraticCurveTo(controlX, controlY, effect.x, effect.y);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 248, 206, .95)';
                ctx.shadowBlur = 8;
                ctx.lineWidth = 1;
                ctx.stroke();

                for (let i = 0; i < 7; i++) {
                    const t = Math.max(0, travel - i * .045);
                    const inverse = 1 - t;
                    const px = inverse * inverse * (effect.fromX || effect.x) +
                        2 * inverse * t * controlX + t * t * effect.x;
                    const py = inverse * inverse * (effect.fromY || effect.y) +
                        2 * inverse * t * controlY + t * t * effect.y;
                    glowOrb(ctx, px, py, i === 0 ? 3.8 : 1.5 + (i % 2) * .5,
                        i === 0 ? '#fff4c1' : '#ffc653', i === 0 ? 18 : 9);
                }

                ctx.globalAlpha = .9 * (1 - progress * .2);
                ctx.strokeStyle = '#ffe7a0';
                ctx.shadowColor = '#ffbf4d';
                ctx.shadowBlur = 19;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.ellipse(effect.x, effect.y + 7, ring, ring * .3, 0,
                    time / 220, time / 220 + TAU * .82);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 247, 208, .88)';
                ctx.lineWidth = .8;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.ellipse(effect.x, effect.y + 7, ring * .68, ring * .22, 0,
                    -time / 270, -time / 270 + TAU * .78);
                ctx.stroke();
                ctx.setLineDash([]);

                const impact = Math.max(0, 1 - progress * 1.25);
                for (let i = 0; i < 8; i++) {
                    const angle = i * TAU / 8 + time / 350;
                    const orbit = ring * (.62 + (i % 2) * .1);
                    const px = effect.x + Math.cos(angle) * orbit;
                    const py = effect.y + 5 + Math.sin(angle) * orbit * .28 -
                        ((time / 24 + i * 9) % 16);
                    ctx.globalAlpha = impact * .85;
                    ctx.strokeStyle = i % 2 ? '#fff2bd' : '#ffd064';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.moveTo(px - 2.2, py);
                    ctx.lineTo(px + 2.2, py);
                    ctx.moveTo(px, py - 2.2);
                    ctx.lineTo(px, py + 2.2);
                    ctx.stroke();
                    glowOrb(ctx, px, py, 1.2, '#ffe7a0', 8);
                }
                ctx.globalAlpha = .95 * (1 - progress);
                ctx.strokeStyle = '#fff3c2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(effect.x - 3, effect.y - 2);
                ctx.lineTo(effect.x + 3, effect.y + 4);
                ctx.lineTo(effect.x, effect.y + 8);
                ctx.lineTo(effect.x - 3, effect.y + 4);
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                ctx.globalAlpha = 1 - progress;
                const attack = effect.attack || '';
                if (attack === 'sniper') {
                    const travel = Math.min(1, progress / .82);
                    const px = effect.x + (targetX - effect.x) * travel;
                    const py = effect.y + (targetY - effect.y) * travel;
                    const angle = Math.atan2(targetY - effect.y, targetX - effect.x);
                    const critical = effect.critical || effect.fifthShot;
                    const energy = effect.fifthShot ? '#c6fbff' : '#56baff';
                    const tail = Math.max(0, travel - .12);
                    ctx.globalAlpha = progress < .82 ? 1 - progress * .35 :
                        Math.max(0, 1 - (progress - .82) / .18);
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = 'rgba(24, 80, 168, .5)';
                    ctx.shadowColor = energy;
                    ctx.shadowBlur = effect.fifthShot ? 22 : 14;
                    ctx.lineWidth = effect.fifthShot ? 5 : 3;
                    ctx.beginPath();
                    ctx.moveTo(effect.x + (targetX - effect.x) * tail,
                        effect.y + (targetY - effect.y) * tail);
                    ctx.lineTo(px, py);
                    ctx.stroke();
                    ctx.strokeStyle = energy;
                    ctx.lineWidth = effect.fifthShot ? 2.4 : 1.5;
                    ctx.beginPath();
                    ctx.moveTo(effect.x + (targetX - effect.x) * tail,
                        effect.y + (targetY - effect.y) * tail);
                    ctx.lineTo(px, py);
                    ctx.stroke();
                    const headLength = effect.fifthShot ? 15 : 10;
                    ctx.strokeStyle = '#e8fcff';
                    ctx.lineWidth = effect.fifthShot ? 2.5 : 1.7;
                    ctx.beginPath();
                    ctx.moveTo(px - Math.cos(angle) * headLength,
                        py - Math.sin(angle) * headLength);
                    ctx.lineTo(px + Math.cos(angle) * 3, py + Math.sin(angle) * 3);
                    ctx.stroke();

                    for (let i = 0; i < 4; i++) {
                        const trailT = Math.max(0, travel - i * .035);
                        const side = (i % 2 ? -1 : 1) * (2 + i * 1.5);
                        const sx = effect.x + (targetX - effect.x) * trailT -
                            Math.sin(angle) * side;
                        const sy = effect.y + (targetY - effect.y) * trailT +
                            Math.cos(angle) * side;
                        glowOrb(ctx, sx, sy, i === 0 ? 2 : 1.1, i % 2 ? energy : '#d5fbff', 9);
                    }
                    if (travel >= .96) {
                        const impactAlpha = Math.min(1, (travel - .96) / .04);
                        ctx.globalAlpha = impactAlpha * (1 - progress) * 5;
                        ctx.strokeStyle = '#a9eeff';
                        ctx.shadowColor = energy;
                        ctx.shadowBlur = effect.fifthShot ? 25 : 15;
                        ctx.lineWidth = effect.fifthShot ? 2.5 : 1.5;
                        ctx.beginPath();
                        ctx.arc(targetX, targetY, 5 + (travel - .96) * 180,
                            0, TAU);
                        ctx.stroke();
                        glowOrb(ctx, targetX, targetY,
                            effect.fifthShot ? 5 : 3, energy, effect.fifthShot ? 24 : 14);
                        for (let i = 0; i < 5; i++) {
                            const sparkAngle = i * TAU / 5 + angle;
                            const length = 8 + (travel - .96) * 130;
                            ctx.beginPath();
                            ctx.moveTo(targetX, targetY);
                            ctx.lineTo(targetX + Math.cos(sparkAngle) * length,
                                targetY + Math.sin(sparkAngle) * length);
                            ctx.stroke();
                        }
                    } else {
                        glowOrb(ctx, px, py, effect.fifthShot ? 3.8 : 2.7, energy,
                            effect.fifthShot ? 22 : 15);
                    }
                } else if (attack === 'skull_archer') {
                    const t = progress;
                    const px = effect.x + (targetX - effect.x) * t;
                    const py = effect.y + (targetY - effect.y) * t;
                    const angle = Math.atan2(targetY - effect.y, targetX - effect.x);
                    const arrowColor = '#42f3d1';
                    ctx.strokeStyle = 'rgba(23, 135, 120, .58)';
                    ctx.shadowColor = ctx.strokeStyle;
                    ctx.shadowBlur = 15;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(px - Math.cos(angle) * 22, py - Math.sin(angle) * 22);
                    ctx.lineTo(px + Math.cos(angle) * 9, py + Math.sin(angle) * 9);
                    ctx.stroke();
                    ctx.strokeStyle = '#a5fff0';
                    ctx.shadowColor = arrowColor;
                    ctx.shadowBlur = 13;
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.moveTo(px - Math.cos(angle) * 19, py - Math.sin(angle) * 19);
                    ctx.lineTo(px + Math.cos(angle) * 10, py + Math.sin(angle) * 10);
                    ctx.stroke();
                    ctx.strokeStyle = arrowColor;
                    ctx.lineWidth = 1.1;
                    ctx.beginPath();
                    ctx.moveTo(px, py - 3);
                    ctx.lineTo(px - Math.sin(angle) * 4, py + Math.cos(angle) * 4);
                    ctx.moveTo(px, py + 3);
                    ctx.lineTo(px + Math.sin(angle) * 4, py - Math.cos(angle) * 4);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(px + Math.cos(angle) * 11, py + Math.sin(angle) * 11);
                    ctx.lineTo(px + Math.cos(angle + 2.55) * 5, py + Math.sin(angle + 2.55) * 5);
                    ctx.lineTo(px + Math.cos(angle - 2.55) * 5, py + Math.sin(angle - 2.55) * 5);
                    ctx.closePath();
                    ctx.fillStyle = '#c6fff5';
                    ctx.fill();
                    for (let i = 1; i <= 5; i++) {
                        const trailT = Math.max(0, t - i * .035);
                        const tx = effect.x + (targetX - effect.x) * trailT;
                        const ty = effect.y + (targetY - effect.y) * trailT;
                        glowOrb(ctx, tx, ty, 2.4 - i * .25,
                            i % 2 ? arrowColor : '#b2fff1', 9);
                    }
                    glowOrb(ctx, px, py, 2.2 + Math.sin(Date.now() / 32) * .7,
                        '#d7fff9', 15);
                } else if (attack === 'skull_mage') {
                    const t = Math.min(1, progress * 1.35);
                    const px = effect.x + (targetX - effect.x) * t;
                    const py = effect.y + (targetY - effect.y) * t;
                    const angle = Math.atan2(targetY - effect.y, targetX - effect.x);
                    const impact = Math.max(0, Math.min(1, (progress - .72) / .28));
                    const pulse = .5 + (Math.sin(Date.now() / 38) + 1) * .25;
                    const headX = px - Math.cos(angle) * 11;
                    const headY = py - Math.sin(angle) * 11;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = 'rgba(14, 46, 174, .76)';
                    ctx.shadowColor = '#126dff';
                    ctx.shadowBlur = 22;
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.moveTo(effect.x, effect.y);
                    ctx.lineTo(px, py);
                    ctx.stroke();
                    ctx.strokeStyle = '#348bff';
                    ctx.shadowBlur = 19;
                    ctx.lineWidth = 4.5;
                    ctx.stroke();
                    ctx.strokeStyle = '#d8fcff';
                    ctx.shadowColor = '#a6f5ff';
                    ctx.shadowBlur = 12;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    for (let i = 1; i <= 7; i++) {
                        const trailT = Math.max(0, t - i * .032);
                        glowOrb(ctx,
                            effect.x + (targetX - effect.x) * trailT,
                            effect.y + (targetY - effect.y) * trailT,
                            2.4 - i * .12, i % 2 ? '#45aaff' : '#c2fbff', 13);
                    }
                    ctx.save();
                    ctx.translate(headX, headY);
                    ctx.rotate(angle);
                    ctx.shadowColor = '#168bff';
                    ctx.shadowBlur = 25;
                    ctx.fillStyle = '#176fff';
                    ctx.beginPath();
                    ctx.moveTo(-12, -7);
                    ctx.quadraticCurveTo(0, -9, 13, 0);
                    ctx.quadraticCurveTo(0, 9, -12, 7);
                    ctx.quadraticCurveTo(-6, 0, -12, -7);
                    ctx.fill();
                    ctx.fillStyle = '#d9fcff';
                    ctx.beginPath();
                    ctx.ellipse(1, 0, 6, 3.2, 0, 0, TAU);
                    ctx.fill();
                    ctx.restore();
                    glowOrb(ctx, px, py, 5 + pulse * 2, '#42aaff', 23);
                    glowOrb(ctx, px, py, 2.2, '#efffff', 15);
                    for (let i = 0; i < 3; i++) {
                        const side = i - 1;
                        const forkBaseX = effect.x + (px - effect.x) * Math.max(0, t - .24 + i * .1);
                        const forkBaseY = effect.y + (py - effect.y) * Math.max(0, t - .24 + i * .1);
                        const perpX = -Math.sin(angle);
                        const perpY = Math.cos(angle);
                        const forkLength = (9 + pulse * 7) * (side === 0 ? .8 : 1);
                        ctx.strokeStyle = i % 2 ? '#80edff' : '#4e85ff';
                        ctx.shadowColor = '#207eff';
                        ctx.shadowBlur = 12;
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        ctx.moveTo(forkBaseX, forkBaseY);
                        ctx.lineTo(forkBaseX + perpX * forkLength * side + Math.cos(angle) * 4,
                            forkBaseY + perpY * forkLength * side + Math.sin(angle) * 4);
                        ctx.lineTo(forkBaseX + perpX * forkLength * (side + .35),
                            forkBaseY + perpY * forkLength * (side + .35));
                        ctx.stroke();
                    }
                    if (impact > 0) {
                        ctx.save();
                        ctx.translate(targetX, targetY);
                        ctx.globalAlpha = impact;
                        const radius = 12 + impact * 25 + pulse * 3;
                        ctx.strokeStyle = '#248aff';
                        ctx.shadowColor = '#168bff';
                        ctx.shadowBlur = 24;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(0, 0, radius, 0, TAU);
                        ctx.stroke();
                        ctx.strokeStyle = '#c8f8ff';
                        ctx.shadowBlur = 12;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.arc(0, 0, radius * .67, -Date.now() / 90, -Date.now() / 90 + TAU * .76);
                        ctx.stroke();
                        ctx.setLineDash([3, 4]);
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(0, 0, radius * .86, Date.now() / 130, Date.now() / 130 + TAU * .8);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        for (let i = 0; i < 8; i++) {
                            const sparkAngle = i * TAU / 8 + Date.now() / 180;
                            const inner = radius * .55;
                            const outer = radius + 8 + pulse * 5;
                            ctx.strokeStyle = i % 2 ? '#62caff' : '#efffff';
                            ctx.lineWidth = i % 2 ? 2 : 1.2;
                            ctx.beginPath();
                            ctx.moveTo(Math.cos(sparkAngle) * inner, Math.sin(sparkAngle) * inner);
                            ctx.lineTo(Math.cos(sparkAngle) * outer, Math.sin(sparkAngle) * outer);
                            ctx.stroke();
                            glowOrb(ctx, Math.cos(sparkAngle) * outer, Math.sin(sparkAngle) * outer,
                                1.5, '#b7f7ff', 13);
                        }
                        glowOrb(ctx, 0, 0, 7 + (1 - impact) * 11, '#258aff', 30);
                        glowOrb(ctx, 0, 0, 2.7, '#efffff', 18);
                        ctx.restore();
                    }
                } else if (attack === 'reaper_spin') {
                    const time = Date.now();
                    const windup = Math.min(1, progress / .18);
                    const sweep = Math.max(0, Math.min(1, (progress - .08) / .72));
                    const fade = Math.max(0, 1 - Math.max(0, progress - .74) / .26);
                    const reach = 112 * (sweep < .68 ? Math.min(1, sweep / .68) : 1);
                    const rotation = -Math.PI * .95 + sweep * TAU * 1.18;
                    ctx.save();
                    ctx.translate(effect.x, effect.y);
                    ctx.scale(1, .56);

                    ctx.globalAlpha = .18 * (1 - progress);
                    ctx.fillStyle = '#3d0612';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 24 + reach, 24 + reach, 0, 0, TAU);
                    ctx.fill();

                    ctx.globalAlpha = fade * (.72 + windup * .28);
                    ctx.shadowColor = '#ff102e';
                    ctx.shadowBlur = 24;
                    ctx.fillStyle = 'rgba(155, 7, 28, .82)';
                    const outerRadius = Math.max(10, reach);
                    const innerRadius = Math.max(3, reach - 19 - sweep * 8);
                    const startAngle = rotation - 1.55;
                    const endAngle = rotation + .5;
                    ctx.beginPath();
                    ctx.arc(0, 0, outerRadius, startAngle, endAngle);
                    ctx.arc(0, 0, innerRadius, endAngle, startAngle, true);
                    ctx.closePath();
                    ctx.fill();

                    ctx.strokeStyle = '#ff1838';
                    ctx.lineWidth = 5 + windup * 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, outerRadius - 3, startAngle, endAngle);
                    ctx.stroke();
                    ctx.strokeStyle = '#ff9b8e';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, outerRadius - 7, startAngle + .06, endAngle - .1);
                    ctx.stroke();

                    ctx.globalAlpha = fade * .72;
                    ctx.strokeStyle = 'rgba(224, 24, 48, .86)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, reach * .76, reach * .76, 0,
                        rotation - 2.2, rotation + 1.8);
                    ctx.stroke();
                    ctx.strokeStyle = 'rgba(255, 135, 112, .82)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 7]);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, reach * .57, reach * .57, 0,
                        -rotation, -rotation + Math.PI * 1.35);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    for (let i = 0; i < 15; i++) {
                        const angle = rotation + i * TAU / 15;
                        const radius = innerRadius + (i % 3) * 7;
                        const px = Math.cos(angle) * radius;
                        const py = Math.sin(angle) * radius;
                        ctx.globalAlpha = fade * (.52 + (i % 3) * .12);
                        ctx.strokeStyle = i % 2 ? '#ff344a' : '#ffd0a5';
                        ctx.lineWidth = i % 3 === 0 ? 2 : 1.1;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + Math.cos(angle + .6) * (5 + sweep * 4),
                            py + Math.sin(angle + .6) * (5 + sweep * 4));
                        ctx.stroke();
                        glowOrb(ctx, px, py, i % 4 === 0 ? 2.2 : 1.2,
                            i % 2 ? '#ff223d' : '#ffb19a', 10);
                    }

                    ctx.globalAlpha = fade;
                    ctx.fillStyle = '#210b12';
                    ctx.strokeStyle = '#ff3447';
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = '#ff102e';
                    ctx.shadowBlur = 18;
                    ctx.beginPath();
                    ctx.arc(0, -outerRadius * .72, 6 + (1 - sweep) * 3, 0, TAU);
                    ctx.fill();
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#ff4350';
                    ctx.beginPath();
                    ctx.arc(-2, -outerRadius * .72 - 1, 1, 0, TAU);
                    ctx.arc(2, -outerRadius * .72 - 1, 1, 0, TAU);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(-2.5, -outerRadius * .72 + 2);
                    ctx.lineTo(-1, -outerRadius * .72 + 4);
                    ctx.lineTo(0, -outerRadius * .72 + 2);
                    ctx.lineTo(1, -outerRadius * .72 + 4);
                    ctx.lineTo(2.5, -outerRadius * .72 + 2);
                    ctx.stroke();

                    ctx.restore();
                } else {
                    ctx.translate(effect.x, effect.y);
                    ctx.rotate(progress * TAU * 1.5);
                    ctx.strokeStyle = attack === 'reaper_spin' ? '#ff3c5d' : '#ffd5df';
                    ctx.shadowColor = '#ff2448';
                    ctx.shadowBlur = 16;
                    ctx.lineWidth = 3 - progress;
                    ctx.beginPath();
                    ctx.arc(0, 0, 12 + progress * 31, -.7, Math.PI * 1.35);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, 0, 8 + progress * 23, Math.PI, Math.PI * 2.4);
                    ctx.stroke();
                    if (attack === 'reaper_spin') {
                        for (let i = 0; i < 8; i++) {
                            const angle = i * TAU / 8 + progress * TAU;
                            const inner = 14 + progress * 7;
                            const outer = 25 + progress * 15;
                            ctx.strokeStyle = i % 2 ? '#ff9caa' : '#ffd1a1';
                            ctx.lineWidth = i % 2 ? 1.5 : 2.2;
                            ctx.beginPath();
                            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
                            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
                            ctx.stroke();
                            glowOrb(ctx, Math.cos(angle) * outer, Math.sin(angle) * outer,
                                1.8, i % 2 ? '#ff526d' : '#ffd18b', 9);
                        }
                    }
                }
                ctx.restore();
            }
            return;
        }
        const alpha = 1 - progress;
        const radius = effect.radius * (effect.expand ? .3 + progress * .7 : 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(effect.x, effect.y);
        ctx.strokeStyle = effect.color;
        ctx.fillStyle = effect.fill || 'rgba(145, 8, 38, .12)';
        ctx.lineWidth = 2.2 * (1 - progress * .45);
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, Math.max(4, radius * .28), 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        const spokes = effect.skill === 'link' ? 8 : 6;
        for (let i = 0; i < spokes; i++) {
            const angle = i * TAU / spokes + Date.now() / 600;
            const inner = radius * .6;
            const outer = radius * .86;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * .28);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * .28);
            ctx.stroke();
        }
        for (let i = 0; i < 7; i++) {
            const angle = i * TAU / 7 - Date.now() / 500;
            const orbit = radius * (.55 + (i % 3) * .1);
            glowOrb(ctx, Math.cos(angle) * orbit, Math.sin(angle) * orbit * .28,
                1.5 + (i % 2), i % 2 ? '#ff3150' : '#f39aff', 10);
        }
        if (effect.skill === 'suffering') {
            ctx.strokeStyle = '#ff4360';
            ctx.beginPath();
            ctx.arc(0, -12, radius * (.45 + progress * .4), -Math.PI, 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawRange(player, x, y, local, hasTarget, targetInfo) {
        const ctx = window.ctx;
        if (!ctx || !local || !hasTarget) return;
        const px = x + 12;
        const py = y + 16;
        ctx.save();
        ctx.fillStyle = 'rgba(222, 20, 55, .035)';
        ctx.strokeStyle = 'rgba(251, 57, 83, .34)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(px, py, 200, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        const target = targetInfo && (targetInfo.tipo === 'slime'
            ? (window.listaSlimes || []).find(function (mob) { return mob && mob.id === targetInfo.id; })
            : targetInfo);
        if (target) {
            ctx.strokeStyle = 'rgba(255, 72, 95, .78)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawBuffMarker(x, y, player) {
        const ctx = window.ctx;
        if (!ctx || !player || !player.lordMalakarBuffAtivo) return;
        const pulse = (Math.sin(Date.now() / 120) + 1) / 2;
        ctx.save();
        const time = Date.now();
        ctx.translate(x + 12, y - 43 + Math.sin(time / 180) * 2);
        ctx.shadowColor = '#ff2445';
        ctx.shadowBlur = 13 + pulse * 12;
        ctx.strokeStyle = 'rgba(255, 47, 84, .72)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 8, 15 + pulse * 2, 5 + pulse, 0, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(38, 5, 14, .94)';
        ctx.strokeStyle = '#ff526c';
        ctx.beginPath();
        ctx.arc(0, 0, 8.5 + pulse, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ff526c';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.bezierCurveTo(-8, -1, -4, 5, 0, 6);
        ctx.bezierCurveTo(5, 3, 8, -2, 0, -6);
        ctx.fill();
        for (let i = 0; i < 4; i++) {
            const angle = time / 260 + i * TAU / 4;
            const orbit = 13 + Math.sin(time / 95 + i) * 2;
            glowOrb(ctx, Math.cos(angle) * orbit, Math.sin(angle) * orbit * .55,
                1.25 + (i % 2) * .5, i % 2 ? '#ffb0bd' : '#ff3155', 8);
        }
        ctx.restore();
    }

    function drawBloodTetherFromPlayer(x1, y1, x2, y2) {
        const ctx = window.ctx;
        if (ctx) drawBloodTether(ctx, x1, y1, x2, y2, Date.now(), 1);
    }

    window.desenharLordMalakar = drawMalakar;
    window.desenharLordMalakarInvocacao = drawSummon;
    window.desenharLordMalakarVinculos = drawLinks;
    window.desenharLordMalakarEfeito = drawSkillEffect;
    window.desenharLordMalakarCorrenteSangue = drawBloodTetherFromPlayer;
    window.desenharLordMalakarAlcance = drawRange;
    window.desenharLordMalakarBuff = drawBuffMarker;
})();
