// efeitos/florim_efeitos.js — VFX da classe Florim
(function () {
    'use strict';
    window.florimSementesVfx = [];
    window.florimCorrentesVfx = [];
    window.florimAneisVfx = [];
    window.florimDebuffsVfx = [];

    function push(arr, obj) { arr.push(Object.assign({ tempo: 0 }, obj)); }
    window.criarAnimacaoSementeFlorim = function (id, x, y, raio) {
        push(window.florimSementesVfx, { id, x, y, raio: raio || 34, vida: 420, ativada: false });
    };
    window.criarAnimacaoSementeFlorimAtivada = function (x, y, aliado) {
        push(window.florimSementesVfx, { x, y, raio: 42, vida: 34, ativada: true, aliado: !!aliado });
    };
    window.criarAnimacaoCorrenteFlorim = function (id, x, y, alvoX, alvoY, durMs) {
        push(window.florimCorrentesVfx, { id, x, y, alvoX, alvoY, vida: durMs || 3000, durMs: durMs || 3000 });
    };
    window.criarAnimacaoAnelFlorim = function (id, x, y, raio, durMs) {
        push(window.florimAneisVfx, { id, x, y, raio: raio || 85, vida: durMs || 5000, durMs: durMs || 5000 });
    };
    window.criarAnimacaoDebuffFlorim = function (x, y, raio, durMs) {
        push(window.florimDebuffsVfx, { x, y, raio: raio || 170, vida: durMs || 4000, durMs: durMs || 4000 });
    };

    function desenharEspinho(ctx, x, y, ang, tam) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = '#5da943'; ctx.strokeStyle = '#214f28'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, -tam); ctx.lineTo(tam * 0.45, tam * 0.35); ctx.lineTo(0, tam * 0.15); ctx.lineTo(-tam * 0.45, tam * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    function atualizar(arr, dt) { for (let i = arr.length - 1; i >= 0; i--) { arr[i].tempo += dt; arr[i].vida -= dt; if (arr[i].vida <= 0) arr.splice(i, 1); } }

    window.desenharEfeitosFlorim = function () {
        if (!window.ctx) return;
        const ctx = window.ctx;
        const agora = performance.now ? performance.now() : Date.now();
        const dt = Math.min(40, Math.max(1, agora - (window._florimVfxTs || agora)));
        window._florimVfxTs = agora;
        atualizar(window.florimSementesVfx, dt);
        atualizar(window.florimCorrentesVfx, dt);
        atualizar(window.florimAneisVfx, dt);
        atualizar(window.florimDebuffsVfx, dt);

        // Sementes armadas: pequeno broto pulsando no chão.
        for (const s of window.florimSementesVfx) {
            const p = Math.max(0, Math.min(1, s.vida / 420));
            if (s.ativada) {
                const q = 1 - s.vida / 34;
                ctx.globalAlpha = 0.9 * (1 - q);
                ctx.strokeStyle = s.aliado ? '#7dff9a' : '#c95dff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(s.x, s.y, 8 + q * 32, 0, Math.PI * 2); ctx.stroke();
                for (let k = 0; k < 8; k++) desenharEspinho(ctx, s.x + Math.cos(k) * q * 24, s.y + Math.sin(k) * q * 12, k, 3 + q * 3);
            } else {
                ctx.globalAlpha = 0.65 + Math.sin(agora * 0.006 + s.x) * 0.18;
                ctx.fillStyle = '#6fc85a'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#b7ff83'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x, s.y + 3); ctx.quadraticCurveTo(s.x - 4, s.y - 9, s.x, s.y - 6); ctx.stroke();
                ctx.fillStyle = '#d56ac8'; ctx.beginPath(); ctx.arc(s.x, s.y - 6, 2.8, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Corrente: raízes que percorrem o chão até o alvo.
        for (const c of window.florimCorrentesVfx) {
            const alpha = Math.min(1, c.vida / 300) * 0.95;
            ctx.globalAlpha = alpha; ctx.strokeStyle = '#4f9f45'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(c.x, c.y);
            const dx = c.alvoX - c.x, dy = c.alvoY - c.y, dist = Math.hypot(dx, dy) || 1;
            const nx = -dy / dist, ny = dx / dist;
            for (let k = 0; k <= 10; k++) { const t = k / 10; const bx = c.x + dx * t + nx * Math.sin(t * 18 + c.tempo * 0.015) * 7; const by = c.y + dy * t + ny * Math.sin(t * 18 + c.tempo * 0.015) * 7; if (k === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by); }
            ctx.stroke();
            for (let k = 0; k < 7; k++) { const t = (k + 1) / 8; desenharEspinho(ctx, c.x + dx * t, c.y + dy * t, Math.atan2(dy, dx) + Math.PI / 2, 5); }
            ctx.globalAlpha = alpha * 0.8; ctx.strokeStyle = '#b6ee7b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(c.alvoX, c.alvoY, 18 + Math.sin(c.tempo * 0.02) * 3, 0, Math.PI * 2); ctx.stroke();
        }
        // Anel de flores e espinhos.
        for (const a of window.florimAneisVfx) {
            const alpha = Math.min(1, a.vida / 350) * 0.95;
            const pulso = 1 + Math.sin(a.tempo * 0.012) * 0.05;
            ctx.globalAlpha = alpha * 0.18; ctx.fillStyle = '#5ecb54'; ctx.beginPath(); ctx.ellipse(a.x, a.y, a.raio * pulso, a.raio * 0.48 * pulso, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = alpha; ctx.strokeStyle = '#62bd4d'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(a.x, a.y, a.raio * pulso, a.raio * 0.48 * pulso, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#b4ef77'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(a.x, a.y, a.raio * 0.84, a.raio * 0.40, 0, 0, Math.PI * 2); ctx.stroke();
            for (let k = 0; k < 14; k++) { const q = k / 14 * Math.PI * 2; const ex = a.x + Math.cos(q) * a.raio; const ey = a.y + Math.sin(q) * a.raio * 0.48; desenharEspinho(ctx, ex, ey, q, 6); }
            for (let k = 0; k < 8; k++) { const q = k / 8 * Math.PI * 2 + a.tempo * 0.001; const fx = a.x + Math.cos(q) * (a.raio + 5); const fy = a.y + Math.sin(q) * (a.raio + 5) * 0.48; ctx.fillStyle = k % 2 ? '#e78ad6' : '#f4d36a'; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill(); }
            ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = '#8bff62'; ctx.beginPath(); ctx.arc(a.x, a.y, 22 + Math.sin(a.tempo * 0.02) * 5, 0, Math.PI * 2); ctx.fill();
        }

        // Pulso da skill 4: folhas circulares e pólen.
        for (const d of window.florimDebuffsVfx) {
            const alpha = Math.min(1, d.vida / 400) * 0.8;
            ctx.globalAlpha = alpha * 0.12; ctx.fillStyle = '#6ecb52'; ctx.beginPath(); ctx.arc(d.x, d.y, d.raio, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = alpha * 0.45; ctx.strokeStyle = '#a3e86d'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.arc(d.x, d.y, d.raio * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
            for (let k = 0; k < 18; k++) { const q = k * 2.399 + d.tempo * 0.002; const rr = (d.raio * 0.75) * ((k % 7) / 7); const px = d.x + Math.cos(q) * rr; const py = d.y + Math.sin(q) * rr * 0.55; ctx.fillStyle = k % 2 ? '#c6f78b' : '#e5a6db'; ctx.fillRect(px, py, 2, 2); }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
    };
})();
