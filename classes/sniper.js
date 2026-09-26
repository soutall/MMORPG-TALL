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


function desenharFolhaGhillie(ctx, lx, ly, tam, ang, cor) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(0, 0, tam, tam * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
}

function desenharSniperGhilliePlanta(ctx, x, y, isMoving, angulo, posicao, armaV, danoFlash) {
    ctx.save();
    let agora = Date.now();
    let resp = Math.sin(agora / 400) * 0.8;
    let corFolhaEscura = danoFlash ? '#c0392b' : '#183a1b';
    let corFolhaMedia  = danoFlash ? '#e74c3c' : '#275a2a';
    let corFolhaViva   = danoFlash ? '#ff7675' : '#3d8344';
    let corFolhaClara  = danoFlash ? '#ffbe76' : '#69b85c';
    let corFolhaLuz    = danoFlash ? '#ffffff' : '#9ce08d';

    if (!posicao) {
        // Postura em pé / agachado camuflado de arbusto
        ctx.translate(x, y);
        // Sombra de folhagem no chão
        ctx.fillStyle = "rgba(10, 30, 10, 0.45)";
        ctx.beginPath();
        ctx.ellipse(12, 32, 11, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        let sway = isMoving ? Math.sin(window.walkCycle || (agora / 100)) * 2.2 : 0;
        ctx.translate(12, 16 + resp * 0.4);

        // 1) Pernas e base do arbusto (folhagem densa inferior)
        for (let i = -3; i <= 3; i++) {
            let fx = i * 3.8 + Math.sin(i * 1.5) * 1.8;
            let fy = 10 + Math.abs(i) * 1.4;
            let angF = (i * 0.28) + (sway * 0.05);
            desenharFolhaGhillie(ctx, fx, fy, 6.2, angF + Math.PI / 2, corFolhaEscura);
            desenharFolhaGhillie(ctx, fx, fy - 2, 5.2, angF + Math.PI / 2, corFolhaMedia);
        }

        // 2) Tronco e manto de camuflagem (Ghillie foliage cloak)
        ctx.fillStyle = corFolhaEscura;
        ctx.beginPath();
        ctx.ellipse(0, 2, 10, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        const folhasCorpo = [
            [-7, 5, 5.8, -0.6], [-4, 7.5, 6.2, -0.2], [0, 8.5, 6.8, 0], [4, 7.5, 6.2, 0.2], [7, 5, 5.8, 0.6],
            [-8, 0, 5.8, -0.8], [-4, 3, 5.8, -0.3], [0, 3.5, 6.2, 0], [4, 3, 5.8, 0.3], [8, 0, 5.8, 0.8],
            [-6, -4, 5.2, -0.7], [-2, -2, 5.8, -0.2], [2, -2, 5.8, 0.2], [6, -4, 5.2, 0.7],
            [-4, -6.5, 4.8, -0.5], [0, -5.5, 5.2, 0], [4, -6.5, 4.8, 0.5]
        ];
        for (let j = 0; j < folhasCorpo.length; j++) {
            let fc = folhasCorpo[j];
            let cor = (j % 3 === 0) ? corFolhaViva : ((j % 2 === 0) ? corFolhaMedia : corFolhaClara);
            desenharFolhaGhillie(ctx, fc[0], fc[1], fc[2], fc[3], cor);
        }

        // 3) Capuz Ghillie e folhagem da cabeça
        ctx.fillStyle = corFolhaMedia;
        ctx.beginPath();
        ctx.arc(0, -11, 6.2, 0, Math.PI * 2);
        ctx.fill();

        const folhasCapuz = [
            [-5, -14, 4.8, -0.8], [0, -15.5, 5.2, -Math.PI / 2], [5, -14, 4.8, 0.8],
            [-6, -11, 4.2, -0.5], [6, -11, 4.2, 0.5],
            [-3, -14.5, 4.2, -1.1], [3, -14.5, 4.2, 1.1]
        ];
        for (let k = 0; k < folhasCapuz.length; k++) {
            let fk = folhasCapuz[k];
            desenharFolhaGhillie(ctx, fk[0], fk[1], fk[2], fk[3], (k % 2 === 0) ? corFolhaViva : corFolhaClara);
        }

        desenharFolhaGhillie(ctx, -2.5, -9.8, 4.2, 0.1, corFolhaViva);
        desenharFolhaGhillie(ctx, 2.5, -9.8, 4.2, -0.1, corFolhaViva);

        // Fresta dos olhos táticos peering through foliage
        ctx.fillStyle = "#0c180d";
        ctx.beginPath();
        ctx.ellipse(0, -9.5, 4.2, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5eff78";
        ctx.shadowColor = "#39ff5c";
        ctx.shadowBlur = 5;
        ctx.fillRect(-2.4, -10.2, 1.7, 1.3);
        ctx.fillRect(0.7, -10.2, 1.7, 1.3);
        ctx.shadowBlur = 0;

        // 4) Braços camuflados segurando o RIFLE BARRETT
        ctx.save();
        ctx.rotate(angulo || 0);
        ctx.translate(7, 2);
        desenharFolhaGhillie(ctx, -2, -1, 4.8, 0, corFolhaMedia);
        desenharFolhaGhillie(ctx, 1, 0, 4.2, 0.3, corFolhaViva);
        if (typeof window.desenharFuzilExposta === 'function') {
            window.desenharFuzilExposta(ctx, armaV);
        }
        desenharFolhaGhillie(ctx, 5, -2, 3.2, -0.4, corFolhaViva);
        desenharFolhaGhillie(ctx, 11, -2, 3.0, -0.3, corFolhaClara);
        ctx.restore();

        ctx.restore();
    } else {
        // Postura deitado camuflado (moita rasteira)
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(10, 30, 10, 0.45)";
        ctx.beginPath();
        ctx.ellipse(12, 20, 16, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(12, 20);

        ctx.fillStyle = corFolhaEscura;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        const folhasDeitado = [
            [-10, -2, 5.8, -0.3], [-6, -3, 6.2, -0.1], [0, -3.5, 6.8, 0], [6, -3, 6.2, 0.1], [10, -2, 5.8, 0.3],
            [-9, 2, 5.2, 0.4], [-4, 2.5, 5.8, 0.1], [2, 2.5, 5.8, -0.1], [8, 2, 5.2, -0.4],
            [-12, 0, 4.8, -0.8], [12, 0, 4.8, 0.8]
        ];
        for (let j = 0; j < folhasDeitado.length; j++) {
            let fd = folhasDeitado[j];
            desenharFolhaGhillie(ctx, fd[0], fd[1], fd[2], fd[3], (j % 2 === 0) ? corFolhaMedia : corFolhaViva);
        }

        ctx.fillStyle = "#5eff78";
        ctx.shadowColor = "#39ff5c";
        ctx.shadowBlur = 4;
        ctx.fillRect(-8, -2, 1.8, 1.2);
        ctx.fillRect(-5, -2, 1.8, 1.2);
        ctx.shadowBlur = 0;

        ctx.save();
        ctx.rotate(angulo || 0);
        ctx.translate(2, 0);
        if (typeof window.desenharFuzilExposta === 'function') {
            window.desenharFuzilExposta(ctx, armaV);
        }
        desenharFolhaGhillie(ctx, 4, -2, 3.2, -0.3, corFolhaViva);
        desenharFolhaGhillie(ctx, 10, -2, 3.0, -0.2, corFolhaClara);
        ctx.restore();

        ctx.restore();
    }
    ctx.restore();
}

window.desenharSniper = function(x, y, isMoving, angulo, hp, maxHp, extra) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    let ehEu = !!(extra && extra.eu) || !(extra && extra.pp);
    let pp = (extra && extra.pp) || null;

    let posicao = (pp ? !!pp.snPosicao : !!window.snPosicaoAtivo);
    let camuflado = (pp ? !!pp.snCamuflado : !!window.snCamufladoAtivo);

    // ===== v1.50.0 — ROUPA DE CAMUFLAGEM (vestida pelo DASH, 5s) =====
    // Não é mais "transparência esverdeada": o Sniper troca de visual e
    // passa a usar um uniforme de camuflagem de verdade (manchas sobre
    // calça, colete, capacete e gola). Opaco de propósito — o que esconde
    // o Sniper agora é a ROUPA, não a transparência.
    let vestindoRoupa = pp
        ? !!pp.snRoupaCamo
        : (Date.now() < (window.snRoupaCamoAte || 0));
    // Escondido no mato (skill 4): mantém um véu leve por cima da roupa
    let alph = camuflado ? 0.62 : 1.0;
    let corTorso = vestindoRoupa ? "#4a5d3a" : (camuflado ? "#2d6a4f" : "#556b2f");
    let corCalca = vestindoRoupa ? "#3c4a2f" : "#4a5326";
    let corDetalhe = vestindoRoupa ? "#2e3a22" : "#3a4420";
    let corBolso = vestindoRoupa ? "#26301c" : "#2f3a1c";
    let corPele = vestindoRoupa ? "#8f9a7d" : "#cbbd9c";
    // Paleta de manchas do camuflagem (3 tons de verde/castanho)
    const CAMO = vestindoRoupa
        ? ['#6b7a45', '#3f4a2a', '#8a8455', '#2b3320', '#55603a']
        : null;

    ctx.save();
    ctx.globalAlpha = alph;

    // Manchas de camuflagem: manchas fixas (não "fazem crawl"), recortadas
    // dentro de cada peça. Helper local que só existe no modo camuflado.
    function manchas(quadro, semente) {
        if (!CAMO) return;
        // 5 elipses determinísticas por peça — mesma roupa todo frame
        for (let i = 0; i < 5; i++) {
            const h1 = ((semente + i * 7) % 11) / 11;
            const h2 = ((semente * 3 + i * 5) % 13) / 13;
            const h3 = ((semente * 5 + i * 3) % 7) / 7;
            ctx.fillStyle = CAMO[i % CAMO.length];
            ctx.beginPath();
            ctx.ellipse(
                quadro[0] + h1 * quadro[2],
                quadro[1] + h2 * quadro[3],
                1.6 + h3 * 2.6,
                1.1 + h1 * 1.9,
                h2 * 1.6, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    let wpItem = window.inventario ? window.inventario.arma : null;
    let armaVisual = null;
    if (x === window.meuX && y === window.meuY) { 
        if (wpItem && wpItem.customVisual) armaVisual = wpItem;
    }
    let danoFlashAtivo = ((window.danoFlashTimer || 0) > 0);

    // ===== v1.51.0: CAMUFLAGEM DE PLANTA / GHILLIE SUIT COMPLETO =====
    // Quando camuflado (dash ou skill), o visual MUDA COMPLETAMENTE para
    // uma planta/moita humanoide (folhagem densa, capuz, folhas rasteiras),
    // mantendo apenas o fuzil Barrett empunhado na mira.
    if (vestindoRoupa || camuflado) {
        desenharSniperGhilliePlanta(ctx, x, y, isMoving, angulo, posicao, armaVisual, danoFlashAtivo);
        ctx.restore();

        // Aim line própria
        if (ehEu && window.snAimAtivo && typeof window.desenharLinhaMiraSniper === "function") {
            window.desenharLinhaMiraSniper(x + 12, y + 16, angulo, 700);
        }
        desenharBadgeCamo(x, y, posicao, pp, ctx);
        return;
    }

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

        // Pernas — calça camuflada
        let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 3.2 : 0;
        ctx.fillStyle = corCalca;
        ctx.fillRect(-5, 9, 3.2, 7 + legOffset);
        ctx.fillRect(2, 9, 3.2, 7 - legOffset);
        manchas([-5, 9, 3.2, 7 + legOffset], 3);
        manchas([2, 9, 3.2, 7 - legOffset], 9);
        ctx.fillStyle = vestindoRoupa ? "#20281a" : "#2c2c1a";
        ctx.fillRect(-6, 16 + legOffset, 5, 3);
        ctx.fillRect(1, 16 - legOffset, 5, 3);

        // Corpo: colete tático (ou colete de camuflagem)
        let torso = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : corTorso;
        ctx.fillStyle = torso;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, -6);
        ctx.lineTo(8, 10);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        manchas([-6, -6, 14, 16], 5);
        ctx.fillStyle = corDetalhe;
        ctx.fillRect(-6, 3, 12, 2);
        ctx.fillStyle = vestindoRoupa ? "#7f8a5a" : "#8f9b4a";
        ctx.fillRect(2, 4, 3, 2); // coldre
        // Bolso de arame/camuflagem
        ctx.fillStyle = corBolso;
        ctx.fillRect(-7, -2, 3, 4);

        // Cabeça com óculos de mira
        ctx.fillStyle = corPele;
        ctx.beginPath();
        ctx.arc(0, -11, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // capacete de camuflagem (substitui a faixa de cabeça)
        if (vestindoRoupa) {
            ctx.fillStyle = "#55603a";
            ctx.beginPath();
            ctx.arc(0, -12, 5.0, Math.PI * 1.02, Math.PI * 1.98);
            ctx.fill();
            manchas([-5, -17, 10, 6], 11);
            // aba/capuz puxado para a frente
            ctx.fillStyle = "#3f4a2a";
            ctx.beginPath();
            ctx.ellipse(2.6, -14.6, 4.4, 2.4, -0.15, 0, Math.PI * 2);
            ctx.fill();
        }
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
        if (!vestindoRoupa) {
            // Faixa de camuflagem na cabeça (visual normal)
            ctx.fillStyle = "#556b2f";
            ctx.fillRect(-5, -7.4, 10, 1.6);
        } else {
            // gola alta do uniforme
            ctx.fillStyle = "#3f4a2a";
            ctx.fillRect(-5, -7.6, 10, 2.0);
        }

        // Braço + RIFLE BARRETT longo (segue a mira)
        ctx.save();
        ctx.rotate(angulo || 0);
        ctx.translate(7, 2);
        ctx.fillStyle = vestindoRoupa ? "#55603a" : "#5c6840";
        ctx.fillRect(-3, -1.6, 6, 3.2); // braço
        manchas([-3, -1.6, 6, 3.2], 17);
        // Rifle
        let wp = window.inventario ? window.inventario.arma : null;
        let armaV = null;
        if (x === window.meuX && y === window.meuY) { 
            if (wp && wp.customVisual) armaV = wp;
        }
        if (typeof window.desenharFuzilExposta === 'function') window.desenharFuzilExposta(ctx, armaV);
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
        manchas([-6, -3, 13, 5.4], 23);
        ctx.fillStyle = corDetalhe;
        ctx.fillRect(-4, 0, 9, 2);
        // Pernas esticadas
        ctx.fillStyle = corCalca;
        ctx.beginPath();
        ctx.roundRect(5, -2, 10, 3.6, 2);
        ctx.fill();
        manchas([5, -2, 10, 3.6], 29);
        // Cabeça deitada apoiada
        ctx.fillStyle = corPele;
        ctx.beginPath();
        ctx.arc(-8, -1, 3.6, 0, Math.PI * 2);
        ctx.fill();
        if (vestindoRoupa) {          // capacete deitado
            ctx.fillStyle = "#55603a";
            ctx.beginPath();
            ctx.arc(-8, -1.4, 4.0, Math.PI * 1.0, Math.PI * 2.0);
            ctx.fill();
            manchas([-12, -5.5, 8, 4.5], 31);
        }
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
        let wp = window.inventario ? window.inventario.arma : null;
        let armaV = null;
        if (x === window.meuX && y === window.meuY) { 
            if (wp && wp.customVisual) armaV = wp;
        }
        if (typeof window.desenharFuzilExposta === 'function') window.desenharFuzilExposta(ctx, armaV);
        ctx.restore();

        ctx.restore();
    }
    ctx.restore();

    // Aim line própria (self, enquanto mira o Disparo Supremo)
    if (ehEu && window.snAimAtivo && typeof window.desenharLinhaMiraSniper === "function") {
        window.desenharLinhaMiraSniper(x + 12, y + 16, angulo, 700);
    }

    function desenharBadgeCamo(x, y, posicao, pp, ctx) {
    // Fica acima da cabeça só enquanto o uniforme está vestido (5s), para o
    // jogador (e quem o vê) saber que a skill 4 está liberada e até quando.
    //
    // O TEMPO restante é a fonte da verdade e vem SEMPRE do prazo absoluto, que
    // pode vir de dois lugares: o snapshot do servidor (outros jogadores) ou o
    // `expiraEm` que o cliente guardou para si. Calcular o tempo ANTES de
    // qualquer desenho garante a limpeza mesmo se o flag ficou "preso" — sem
    // isso, um pacote perdido deixaria o Sniper vestido de camuflagem para
    // sempre (o `snRoupaCamo` do snapshot nunca mais viria para limpar).
    const camoRestante = pp
        ? Math.max(0, (pp.snRoupaCamoAte || 0) - Date.now())
        : Math.max(0, (window.snRoupaCamoAte || 0) - Date.now());
    if (camoRestante <= 0) {
        // prazo vencido (ou nunca houve): limpa o flag para o corpo voltar ao
        // personagem normal. Nao depende de `vestindoRoupa` — se o flag ficou
        // preso, `vestindoRoupa` ja e false e o `if` nao entraria.
        if (pp) pp.snRoupaCamo = false; else window.snRoupaCamoAte = 0;
    } else {
        let seg = (camoRestante / 1000).toFixed(1);
        let bx = x + 12, by = (posicao ? y + 4 : y - 22) - 20;
        ctx.save();
        // últimos 1,5s: pisca (avisa que o uniforme está prestes a cair)
        if (camoRestante < 1500 && Math.floor(Date.now() / 200) % 2 === 0) ctx.globalAlpha = 0.55;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx - 16, by - 8, 32, 16, 5); else ctx.rect(bx - 16, by - 8, 32, 16);
        ctx.fill();
        ctx.fillStyle = '#27ae60';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌿 ' + seg + 's', bx, by + 0.5);
        // barra fininha de tempo
        ctx.fillStyle = 'rgba(39,174,96,0.85)';
        ctx.fillRect(bx - 15, by + 9, 30 * Math.min(1, camoRestante / 5000), 2);
        ctx.restore();
    }
}
    desenharBadgeCamo(x, y, posicao, pp, ctx);

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

window.desenharFuzilExposta = function(ctx, armaVisualCustom) {
    let tamanho = 20;
    let largura = 3.4;
    let cBase = "#353b21";
    let cMeio = "#232917";
    let cPonta = "#3c4526";
    let cFio = "#1a1f10";

    if (armaVisualCustom && armaVisualCustom.customVisual) {
        let cv = armaVisualCustom.customVisual;
        if (cv.tamanho) tamanho = cv.tamanho;
        if (cv.largura) largura = cv.largura;
        if (cv.cBase) cBase = cv.cBase;
        if (cv.cMeio) cMeio = cv.cMeio;
        if (cv.cPonta) cPonta = cv.cPonta;
        if (cv.cFio) cFio = cv.cFio;
    }

    ctx.fillStyle = cBase;
    ctx.fillRect(2, -largura/2 - 0.7, tamanho, largura);
    ctx.fillStyle = cMeio;
    ctx.fillRect(6, -1.2, 2, largura); // ferrolho
    ctx.fillStyle = "#10150a";
    ctx.fillRect(-2, -2.4, 4, 3); // luneta
    ctx.fillStyle = "#69ff7c";
    ctx.shadowColor = "#39ff5c";
    ctx.shadowBlur = 5;
    ctx.fillRect(-1, -2.1, 1.8, 1.8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = cPonta;
    ctx.fillRect(2 + tamanho, -2.8, 3, 4.2); // boca do cano
    ctx.fillStyle = cFio;
    ctx.beginPath();
    ctx.moveTo(2 + tamanho + 3, -2.8); ctx.lineTo(2 + tamanho + 9, -1.6); ctx.lineTo(2 + tamanho + 9, 1.6); ctx.lineTo(2 + tamanho + 3, 2.8);
    ctx.closePath();
    ctx.fill();
    // Recuo/mira
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(2 + tamanho + 3, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
};