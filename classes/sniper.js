// classes/sniper.js - Renderização do Sniper (franco-atirador)
// Estilo: colete verde-oliva, rifle Barrett longo, óculos de mira.
// Posição de Franco-Atirador: deita no chão. Camuflagem: silhueta esverdeada.

// Arame Prendedor voando até o local (visual otimista local)
window.criarArameRedeVoo = function(sx, sy, tx, ty) {
    if (!window.sniperRedesVoo) window.sniperRedesVoo = [];
    window.sniperRedesVoo.push({ x: sx, y: sy - 4, tx: tx, ty: ty, vx: (tx - sx) / 16, vy: (ty - sy) / 16, vida: 16 });
};

// Projétil do tiro do sniper (visual local p/ action_sniper_tiro / action_sniper_super_tiro)
window.criarTiroSniper = function(sx, sy, tx, ty, ehSuper) {
    if (!window.sniperProjeteis) window.sniperProjeteis = [];
    let d = Math.hypot(tx - sx, ty - sy) || 1;
    let vx = (tx - sx) / 10, vy = (ty - sy) / 10;
    window.sniperProjeteis.push({ tipo: ehSuper ? 'sniper_super' : 'sniper_tiro', x: sx, y: sy, vx: vx, vy: vy, ang: Math.atan2(vy, vx), vida: 22 });
};

// Zona de rede (Arame Prendedor)
window.desenharRedeSniper = function(z, t) {
    if (!window.ctx || !z) return;
    let ctx = window.ctx;
    let fade = Math.min(1, (z.tempo || 40) / 16);
    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.beginPath();
    ctx.moveTo(z.x, z.y);
    for (let k = 0; k < 8; k++) {
        let a = k * 0.7853;
        ctx.moveTo(z.x, z.y);
        ctx.lineTo(z.x + Math.cos(a) * 34, z.y + Math.sin(a) * 34);
    }
    ctx.strokeStyle = "#9f9f9f";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
        ctx.globalAlpha = 0.35 * fade;
        ctx.setLineDash([3, 7]);
        ctx.strokeStyle = "#c9c9c9";
        ctx.lineWidth = 1;
        ctx.beginPath();
        let d = 6 + k * 5;
        for (let j = 0; j <= 8; j++) {
            let a = j * 0.7853;
            let px = z.x + Math.cos(a) * d, py = z.y + Math.sin(a) * d;
            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.setLineDash([]);
    // Brilho central
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = "#e9e9e9";
    ctx.shadowColor = "#9f9f9f";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

// Linha de mira do Disparo Supremo (enquanto snAimAtivo)
window.desenharLinhaMiraSniper = function(x, y, ang, comprimento) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    comprimento = comprimento || 700;
    let tx = x + Math.cos(ang) * comprimento;
    let ty = y + Math.sin(ang) * comprimento;
    let t = Date.now() / 40;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(0,255,60,0.5)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * 26, y + Math.sin(ang) * 26);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    // Marcos de distância / mira reticulada
    ctx.strokeStyle = "rgba(0,255,60,0.65)";
    for (let k = 1; k <= 4; k++) {
        let mx = x + Math.cos(ang) * (k * 140);
        let my = y + Math.sin(ang) * (k * 140);
        ctx.beginPath();
        ctx.moveTo(mx - Math.sin(ang) * 6, my + Math.cos(ang) * 6);
        ctx.lineTo(mx + Math.sin(ang) * 6, my - Math.cos(ang) * 6);
        ctx.stroke();
    }
    // Reticulado central pulsante
    let pu = 1 + Math.sin(t) * 0.25;
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "#7dff8a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(tx, ty, 9 * pu, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx - 14 * pu, ty); ctx.lineTo(tx - 5, ty);
    ctx.moveTo(tx + 5, ty); ctx.lineTo(tx + 14 * pu, ty);
    ctx.moveTo(tx, ty - 14 * pu); ctx.lineTo(tx, ty - 5);
    ctx.moveTo(tx, ty + 5); ctx.lineTo(tx, ty + 14 * pu);
    ctx.stroke();
    ctx.restore();
};

window.desenharSniper = function(x, y, isMoving, angulo, hp, maxHp, extra) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    let ehEu = !!(extra && extra.eu) || !(extra && extra.pp);
    let pp = (extra && extra.pp) || null;

    let posicao = (pp ? !!pp.snPosicao : !!window.snPosicaoAtivo);
    let camuflado = (pp ? !!pp.snCamuflado : !!window.snCamufladoAtivo);
    let alph = camuflado ? 0.22 : 1.0;
    let corTorso = camuflado ? "#2d6a4f" : "#556b2f";

    ctx.save();
    ctx.globalAlpha = alph;

    if (!posicao) {
        // ===== POSTURA EM PÉ (agachado) =====
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath();
        ctx.ellipse(12, 32, 8, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        let agachamento = Math.sin(Date.now() / 500) * (isMoving ? 1.2 : 2.2);
        ctx.save();
        ctx.translate(12, 14 + agachamento * 0.3);

        // Pernas
        let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3.2 : 0;
        ctx.fillStyle = "#4a5326";
        ctx.fillRect(-5, 9, 3.2, 7 + legOffset);
        ctx.fillRect(2, 9, 3.2, 7 - legOffset);
        ctx.fillStyle = "#2c2c1a";
        ctx.fillRect(-6, 16 + legOffset, 5, 3);
        ctx.fillRect(1, 16 - legOffset, 5, 3);

        // Corpo: colete tático
        let torso = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : corTorso;
        ctx.fillStyle = torso;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, -6);
        ctx.lineTo(8, 10);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#3a4420";
        ctx.fillRect(-6, 3, 12, 2);
        ctx.fillStyle = "#8f9b4a";
        ctx.fillRect(2, 4, 3, 2); // coldre
        // Bolso de arame/camuflagem
        ctx.fillStyle = "#2f3a1c";
        ctx.fillRect(-7, -2, 3, 4);

        // Cabeça com óculos de mira
        ctx.fillStyle = "#cbbd9c";
        ctx.beginPath();
        ctx.arc(0, -11, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3d4223";
        ctx.beginPath();
        ctx.arc(0, -13, 4.4, Math.PI * 1.05, Math.PI * 1.95);
        ctx.fill();
        ctx.fillStyle = "#1f2a12";
        ctx.beginPath();
        ctx.roundRect(-4, -12.5, 8, 3, 1.6);
        ctx.fill();
        ctx.fillStyle = "#5aff5a";
        ctx.shadowColor = "#39ff5c";
        ctx.shadowBlur = 6;
        ctx.fillRect(-3.2, -11.6, 1.6, 1.8);
        ctx.fillRect(1.6, -11.6, 1.6, 1.8);
        ctx.shadowBlur = 0;
        // Faixa de camuflagem na cabeça
        ctx.fillStyle = "#556b2f";
        ctx.fillRect(-5, -7.4, 10, 1.6);

        // Braço + RIFLE BARRETT longo (segue a mira)
        ctx.save();
        ctx.rotate(angulo || 0);
        ctx.translate(7, 2);
        ctx.fillStyle = "#5c6840";
        ctx.fillRect(-3, -1.6, 6, 3.2); // braço
        // Rifle
        ctx.fillStyle = "#353b21";
        ctx.fillRect(2, -2.4, 20, 3.4);
        ctx.fillStyle = "#232917";
        ctx.fillRect(6, -1.2, 2, 3.4); // ferrolho
        ctx.fillStyle = "#10150a";
        ctx.fillRect(-2, -2.4, 4, 3); // luneta
        ctx.fillStyle = "#69ff7c";
        ctx.shadowColor = "#39ff5c";
        ctx.shadowBlur = 5;
        ctx.fillRect(-1, -2.1, 1.8, 1.8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#3c4526";
        ctx.fillRect(22, -2.8, 3, 4.2); // boca do cano
        ctx.fillStyle = "#1a1f10";
        ctx.beginPath();
        ctx.moveTo(25, -2.8); ctx.lineTo(31, -1.6); ctx.lineTo(31, 1.6); ctx.lineTo(25, 2.8);
        ctx.closePath();
        ctx.fill();
        // Recuo/mira
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(25, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    } else {
        // ===== POSIÇÃO DE FRANCO-ATIRADOR (deitado) =====
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath();
        ctx.ellipse(12, 20, 15, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(12, 20);

        // Corpo deitado (compridão no chão)
        let torso = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : corTorso;
        ctx.fillStyle = torso;
        ctx.beginPath();
        ctx.roundRect(-6, -3, 13, 5.4, 2);
        ctx.fill();
        ctx.fillStyle = "#3a4420";
        ctx.fillRect(-4, 0, 9, 2);
        // Pernas esticadas
        ctx.fillStyle = "#4a5326";
        ctx.beginPath();
        ctx.roundRect(5, -2, 10, 3.6, 2);
        ctx.fill();
        // Cabeça deitada apoiada
        ctx.fillStyle = "#cbbd9c";
        ctx.beginPath();
        ctx.arc(-8, -1, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1f2a12";
        ctx.beginPath();
        ctx.roundRect(-11, -2.8, 7, 2.4, 1.4);
        ctx.fill();
        ctx.fillStyle = "#5aff5a";
        ctx.fillRect(-10.2, -2.2, 1.6, 1.4);
        ctx.fillRect(-7.2, -2.2, 1.6, 1.4);

        // Rifle apontado para a frente (mira ativa)
        ctx.save();
        ctx.rotate(angulo || 0);
        ctx.translate(2, 0);
        ctx.fillStyle = "#353b21";
        ctx.fillRect(0, -2, 26, 3);
        ctx.fillStyle = "#10150a";
        ctx.fillRect(3, -2, 4, 2.6); // luneta
        ctx.fillStyle = "#69ff7c";
        ctx.shadowColor = "#39ff5c";
        ctx.shadowBlur = 5;
        ctx.fillRect(4, -1.7, 1.8, 1.6);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#1a1f10";
        ctx.beginPath();
        ctx.moveTo(26, -2); ctx.lineTo(32, -1.4); ctx.lineTo(32, 1.4); ctx.lineTo(26, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }
    ctx.restore();

    // Aim line própria (self, enquanto mira o Disparo Supremo)
    if (ehEu && window.snAimAtivo && typeof window.desenharLinhaMiraSniper === "function") {
        window.desenharLinhaMiraSniper(x + 12, y + 16, angulo, 700);
    }

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// Ataque básico: Tiro de Barrett perfurante (o dano é do servidor; o traçador vem via broadcast)
window.enviarAtaqueSniper = function(ang, alvoTipo, alvoId) {
    if (window.estaMorto) return;
    if (window.snAimAtivo) return; // não atira básico enquanto mira o super tiro
    let msg = { action: 'ataque_sniper' };
    if (alvoTipo) { msg.alvoTipo = alvoTipo; msg.alvoId = alvoId; }
    if (ang !== undefined) msg.angulo = ang;
    if (window.tocarSonoro) window.tocarSonoro('sniper_atk');
    if (window.ws && window.ws.readyState === 1) {
        window.ws.send(JSON.stringify(msg));
    }
};