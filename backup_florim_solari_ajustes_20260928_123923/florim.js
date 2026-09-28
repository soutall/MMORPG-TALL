// classes/florim.js — Classe Florim, guardiã vegetal
(function () {
    'use strict';
    function corDano(normal, flash) { return (window.danoFlashTimer || 0) > 0 ? flash : normal; }
    window.desenharFlorim = function (x, y, isMoving, angulo, hp, maxHp) {
        if (hp <= 0 || !window.ctx) return;
        const ctx = window.ctx, t = Date.now() / 1000;
        const passo = isMoving ? Math.sin(window.walkCycle || 0) : 0;
        const respiracao = isMoving ? 0 : Math.sin(t * 2.2) * 0.5;
        const verde = corDano('#4f9d45', '#c94b43');
        const verdeEscuro = corDano('#245f36', '#7f2929');
        const folha = corDano('#72c85a', '#e05a4f');
        const flor = corDano('#d96ac7', '#ff9c92');
        const petala = corDano('#ffd1f3', '#ffe0d9');
        ctx.save(); ctx.translate(x, y + respiracao);
        ctx.globalAlpha = 0.20 + Math.sin(t * 2.4) * 0.04; ctx.fillStyle = '#6bd66a';
        ctx.beginPath(); ctx.ellipse(12, 31, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.40; ctx.fillStyle = '#172b1b';
        ctx.beginPath(); ctx.ellipse(12, 32, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = verdeEscuro; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(8, 22); ctx.quadraticCurveTo(5 + passo, 27, 7, 31); ctx.moveTo(16, 22); ctx.quadraticCurveTo(19 - passo, 27, 17, 31); ctx.stroke();
        const corpo = ctx.createLinearGradient(4, 10, 20, 29); corpo.addColorStop(0, '#9bdd68'); corpo.addColorStop(0.55, verde); corpo.addColorStop(1, verdeEscuro);
        ctx.fillStyle = corpo; ctx.strokeStyle = '#173c25'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(7, 11); ctx.quadraticCurveTo(3, 20, 5, 29); ctx.quadraticCurveTo(12, 32, 19, 29); ctx.quadraticCurveTo(21, 20, 17, 11); ctx.quadraticCurveTo(12, 8, 7, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = folha; ctx.strokeStyle = '#234d2b'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(3.8, 16, 4.5, 2, -0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(20.2, 16, 4.5, 2, 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(5.2, 23, 4, 1.8, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(18.8, 23, 4, 1.8, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const a = angulo || 0;
        ctx.strokeStyle = verdeEscuro; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(7, 14); ctx.quadraticCurveTo(1 + Math.cos(a) * 5, 17 + Math.sin(a) * 5, 2 + Math.cos(a) * 8, 16 + Math.sin(a) * 8);
        ctx.moveTo(17, 14); ctx.quadraticCurveTo(23 + Math.cos(a) * 5, 17 + Math.sin(a) * 5, 22 + Math.cos(a) * 8, 16 + Math.sin(a) * 8); ctx.stroke();
        ctx.fillStyle = corDano('#b97945', '#e36b5e'); ctx.beginPath(); ctx.arc(12, 8, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3d291c'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = '#16251a';
        ctx.fillRect(9.7, 7.2, 1.2, 1.2); ctx.fillRect(13.1, 7.2, 1.2, 1.2);
        ctx.fillStyle = folha; ctx.beginPath(); ctx.ellipse(8, 4.1, 2.8, 1.2, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(16, 4.1, 2.8, 1.2, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = flor;
        for (let i = 0; i < 5; i++) { const q = i * Math.PI * 0.4 + t * 0.12; ctx.beginPath(); ctx.arc(12 + Math.cos(q) * 3.5, 3 + Math.sin(q) * 2, 1.7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = petala; ctx.beginPath(); ctx.arc(12, 3.1, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f5d35b'; ctx.beginPath(); ctx.arc(12, 16.8, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e6a9df'; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) { const q = i * Math.PI * 0.4; ctx.beginPath(); ctx.arc(12 + Math.cos(q) * 2, 16.8 + Math.sin(q) * 1.5, 1, 0, Math.PI * 2); ctx.stroke(); }
        ctx.save(); ctx.translate(12, 17); ctx.rotate(a); ctx.strokeStyle = '#75482d'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(12, 9); ctx.lineTo(12, 30); ctx.stroke();
        ctx.fillStyle = '#6fbd50'; ctx.beginPath(); ctx.ellipse(12, 7, 3.2, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d86bc6'; ctx.beginPath(); ctx.arc(12, 5.4, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.restore();
        if (typeof window.desenharBarraHp === 'function') window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    };
    window.enviarAtaqueFlorim = function (anguloForcado, alvoTipo, alvoId) {
        if (window.estaMorto || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        const msg = { action: 'ataque_florim', angulo: (anguloForcado !== undefined ? anguloForcado : window.meuAngulo) };
        if (alvoTipo && alvoId) { msg.alvoTipo = alvoTipo; msg.alvoId = alvoId; }
        window.ws.send(JSON.stringify(msg));
    };
})();
