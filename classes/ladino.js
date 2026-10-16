// Ladino: silhueta furtiva com capuz, manto rasgado, couro segmentado e adagas violetas.
window.ladinoPassos = window.ladinoPassos || {};
window.desenharLadino = function (x, y, isMoving, angulo, hp, maxHp, pid) {
    if (hp <= 0 || !window.ctx) return;
    const ctx = window.ctx;
    const now = Date.now();
    const invisible = !!window.personagemInvisivelAtual;
    const attacking = (window.ladinoUltimoAtaqueEm || 0) > 0 && now - window.ladinoUltimoAtaqueEm < 260;
    let cycle = Number(window.walkCycle) || 0;
    if (pid && pid !== window.meuId) {
        let stepState = window.ladinoPassos[pid];
        if (!stepState) stepState = window.ladinoPassos[pid] = { phase: 0, updatedAt: now };
        const elapsed = Math.max(0, Math.min(50, now - stepState.updatedAt)) / 1000;
        stepState.updatedAt = now;
        if (isMoving) stepState.phase += elapsed * 2.6;
        cycle = stepState.phase;
    }
    const stride = isMoving ? Math.sin(cycle * Math.PI * 2) * 2.4 : 0;
    const breath = isMoving ? 0 : Math.sin(now / 720) * 0.35;
    const aim = Number.isFinite(angulo) ? angulo : 0;
    const lunge = attacking ? 2.5 : 0;
    const weapon = window.inventario && window.inventario.arma;
    const weaponVisual = weapon && weapon.customVisual ? weapon : null;

    ctx.save();
    ctx.globalAlpha *= invisible ? 0.24 : 1;
    ctx.translate(x + lunge, y);

    // Tecido traseiro rasgado, usado como silhueta do manto.
    ctx.fillStyle = '#211529';
    ctx.beginPath();
    ctx.moveTo(7, 7); ctx.lineTo(17, 7); ctx.lineTo(21, 19);
    ctx.lineTo(18, 26 + stride * 0.25); ctx.lineTo(15, 23);
    ctx.lineTo(12, 29); ctx.lineTo(9, 23); ctx.lineTo(5, 26 - stride * 0.2);
    ctx.lineTo(3, 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#572d72'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(160,83,205,0.55)';
    ctx.beginPath();
    ctx.moveTo(6, 13); ctx.lineTo(9, 20); ctx.lineTo(8, 24);
    ctx.moveTo(17, 12); ctx.lineTo(15, 19); ctx.lineTo(17, 23);
    ctx.stroke();

    // Pernas estreitas com faixas e botas pontudas articuladas.
    for (let leg = 0; leg < 2; leg++) {
        const side = leg === 0 ? -1 : 1;
        const hipX = 12 + side * 3;
        const offset = side * stride;
        ctx.strokeStyle = '#100e17'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hipX, 18); ctx.lineTo(hipX + offset * 0.45, 24); ctx.lineTo(hipX + offset, 29); ctx.stroke();
        ctx.strokeStyle = leg === 0 ? '#51435b' : '#332a3d'; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(hipX, 18); ctx.lineTo(hipX + offset * 0.45, 24); ctx.lineTo(hipX + offset, 29); ctx.stroke();
        ctx.fillStyle = '#17131e';
        ctx.beginPath();
        ctx.moveTo(hipX + offset - 2.5, 28); ctx.lineTo(hipX + offset + 2, 27.5);
        ctx.lineTo(hipX + offset + 4, 30); ctx.lineTo(hipX + offset - 2, 31);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8d7898'; ctx.lineWidth = 0.65;
        ctx.beginPath(); ctx.moveTo(hipX + offset - 1.5, 27.5); ctx.lineTo(hipX + offset + 1.5, 29.2); ctx.stroke();
        ctx.fillStyle = '#6f4b83'; ctx.fillRect(hipX + offset - 1.8, 24.8, 3.6, 1.2);
    }

    // Couro acolchoado, corset de placas e tiras cruzadas.
    ctx.fillStyle = '#17131e';
    ctx.beginPath();
    ctx.moveTo(6, 7 + breath); ctx.lineTo(18, 7 + breath); ctx.lineTo(20, 17);
    ctx.lineTo(17, 21); ctx.lineTo(7, 21); ctx.lineTo(4, 17); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#44364f'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#352b3d';
    ctx.beginPath();
    ctx.moveTo(7, 9 + breath); ctx.lineTo(17, 9 + breath); ctx.lineTo(18, 16);
    ctx.lineTo(15, 19); ctx.lineTo(9, 19); ctx.lineTo(6, 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#927b9c'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = '#aa8b62'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(7, 9); ctx.lineTo(16, 18); ctx.stroke();
    ctx.strokeStyle = '#211b28'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(16, 9); ctx.lineTo(7, 18); ctx.stroke();
    ctx.strokeStyle = '#927b9c'; ctx.lineWidth = 0.65;
    ctx.beginPath(); ctx.moveTo(16, 9); ctx.lineTo(7, 18); ctx.stroke();
    ctx.fillStyle = '#b49369'; ctx.fillRect(9.7, 13, 2.3, 2.2);
    ctx.fillStyle = '#19151f'; ctx.fillRect(10.2, 13.5, 1.3, 1.2);

    // Cinto, bainha lateral e pequeno frasco de toxina.
    ctx.fillStyle = '#211a27'; ctx.fillRect(5.5, 18.6, 13, 2.5);
    ctx.strokeStyle = '#8d765d'; ctx.lineWidth = 0.75;
    ctx.strokeRect(5.5, 18.6, 13, 2.5);
    ctx.fillStyle = '#c4a06a'; ctx.fillRect(10.8, 18.5, 2.4, 2.8);
    ctx.fillStyle = '#6b347e';
    ctx.beginPath(); ctx.moveTo(17, 19); ctx.lineTo(20, 20); ctx.lineTo(18.5, 26); ctx.lineTo(16, 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ad8e65'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = '#4bf08d'; ctx.beginPath(); ctx.arc(18, 22.2, 0.8, 0, Math.PI * 2); ctx.fill();

    // Capuz profundo, rosto quase coberto, faixa e olhos mágicos.
    ctx.fillStyle = '#100d16';
    ctx.beginPath();
    ctx.moveTo(6, 7); ctx.lineTo(6, 1); ctx.quadraticCurveTo(7, -5, 12, -5);
    ctx.quadraticCurveTo(18, -4, 18, 2); ctx.lineTo(19, 8); ctx.lineTo(15, 6);
    ctx.lineTo(12, 8); ctx.lineTo(9, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6f4388'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#30243a';
    ctx.beginPath(); ctx.moveTo(8, 2); ctx.quadraticCurveTo(9, -3, 12, -3);
    ctx.quadraticCurveTo(16, -3, 16, 2); ctx.lineTo(15, 7); ctx.lineTo(9, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#09080e';
    ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(16, 2); ctx.lineTo(15, 5.4); ctx.lineTo(12, 6.5); ctx.lineTo(9, 5.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f3d8ff';
    ctx.beginPath(); ctx.moveTo(8.8, 3.1); ctx.lineTo(11.5, 3.6); ctx.lineTo(10.2, 4.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12.5, 3.6); ctx.lineTo(15.2, 3.1); ctx.lineTo(13.8, 4.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c64aff';
    ctx.fillRect(9.8, 3.45, 1.1, 0.55); ctx.fillRect(13.1, 3.45, 1.1, 0.55);
    ctx.fillStyle = '#17131e';
    ctx.beginPath(); ctx.moveTo(8.5, 5); ctx.lineTo(15.5, 5); ctx.lineTo(13.8, 8); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill();

    // Ombros, antebraços enfaixados e punhos com garras metálicas.
    ctx.fillStyle = '#40354a';
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(7, 6); ctx.lineTo(9, 8); ctx.lineTo(8, 11); ctx.lineTo(5, 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ad8e65'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#33283d';
    ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(19, 7); ctx.lineTo(21, 10); ctx.lineTo(19, 12); ctx.lineTo(16, 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8d7898'; ctx.stroke();

    let weaponX = 19, weaponY = 12;
    if (attacking) { weaponX += Math.cos(aim) * 6; weaponY += Math.sin(aim) * 6; }
    ctx.strokeStyle = '#17111f'; ctx.lineWidth = 3.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(weaponX, weaponY); ctx.stroke();
    ctx.strokeStyle = '#594866'; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(weaponX, weaponY); ctx.stroke();

    ctx.save();
    ctx.translate(weaponX, weaponY);
    ctx.rotate(aim + (attacking ? 0.45 : -0.72));
    window.desenharAdagaExposta(ctx, weaponVisual, false);
    ctx.restore();

    ctx.save();
    ctx.translate(5, 12);
    ctx.rotate(aim + Math.PI + 0.6);
    ctx.strokeStyle = '#17111f'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, 0); ctx.stroke();
    ctx.translate(4, 0);
    window.desenharAdagaExposta(ctx, weaponVisual, true);
    ctx.restore();

    ctx.restore();

    if (invisible) {
        if (!Array.isArray(window.ladinoSombras)) window.ladinoSombras = [];
        if (window.ladinoSombras.length < 14 && Math.random() < 0.35) {
            window.ladinoSombras.push({
                x: x + 12 + (Math.random() - 0.5) * 20,
                y: y + 25 + (Math.random() - 0.5) * 10,
                vy: -0.4 - Math.random() * 0.5,
                alpha: 0.45 + Math.random() * 0.4,
                tamanho: 1.5 + Math.random() * 2
            });
        }
        for (let i = window.ladinoSombras.length - 1; i >= 0; i--) {
            const shadow = window.ladinoSombras[i];
            shadow.y += shadow.vy;
            shadow.alpha -= 0.035;
            if (shadow.alpha <= 0) { window.ladinoSombras.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = shadow.alpha * 0.55;
            ctx.fillStyle = '#a240cf';
            ctx.beginPath(); ctx.arc(shadow.x, shadow.y, shadow.tamanho, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
    if (typeof window.desenharBarraHp === 'function') window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
};

// Ataque básico: adaga (o efeito visual do golpe é local; o dano é do servidor)
window.enviarAtaqueLadino = function(ang, alvoTipo, alvoId) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomAdaga === 'function') window.tocarSomAdaga();
    let msg = { action: 'ataque_ladino' };
    if (alvoTipo) { msg.alvoTipo = alvoTipo; msg.alvoId = alvoId; }
    if (ang !== undefined) msg.angulo = ang;
    window.ladinoUltimoAtaqueEm = Date.now();
    // Efeito local do corte (o servidor replica para os outros jogadores)
    if (typeof window.criarAnimacaoAdagaBasica === 'function') {
        window.criarAnimacaoAdagaBasica(window.meuX + 12, window.meuY + 16, ang !== undefined ? ang : (window.meuAngulo || 0));
    }
    if (window.ws && window.ws.readyState === 1) {
        window.ws.send(JSON.stringify(msg));
    }
};
window.desenharAdagaExposta = function(ctx, armaVisualCustom, isLeft) {
    let t = 1.0, w = 1.0;
    let cBase = "#392347", cMeio = "#8f6aa1", cPonta = "#d5c8e5", cFio = "#f7eaff";

    if (armaVisualCustom && armaVisualCustom.customVisual) {
        let cv = armaVisualCustom.customVisual;
        if (cv.tamanho) t = cv.tamanho;
        if (cv.largura) w = cv.largura;
        if (cv.cBase) cBase = cv.cBase;
        if (cv.cMeio) cMeio = cv.cMeio;
        if (cv.cPonta) cPonta = cv.cPonta;
        if (cv.cFio) cFio = cv.cFio;
    }

    ctx.save();
    ctx.rotate(isLeft ? 0.35 : -0.35);

    // Cabo, guarda curva e lâmina facetada com fio violeta.
    ctx.fillStyle = cBase;
    ctx.fillRect(-3.8, -1.6 * w, 6.8, 3.2 * w);
    ctx.strokeStyle = '#b99bc9';
    ctx.lineWidth = 0.65 * w;
    ctx.beginPath(); ctx.moveTo(-2.7, -1.3 * w); ctx.lineTo(1.7, 1.3 * w); ctx.stroke();
    ctx.fillStyle = cMeio;
    ctx.beginPath();
    ctx.moveTo(-3.5, -2.7 * w); ctx.lineTo(-4.5, -1.8 * w); ctx.lineTo(-3.4, 0);
    ctx.lineTo(-4.5, 1.8 * w); ctx.lineTo(-3.5, 2.7 * w); ctx.lineTo(-2.1, 0); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cPonta;
    ctx.beginPath();
    ctx.moveTo(2.2, -2.8 * w);
    ctx.lineTo(3 + 9 * t, 0);
    ctx.lineTo(2.2, 2.8 * w);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7251a4';
    ctx.beginPath();
    ctx.moveTo(3.1, -1.8 * w);
    ctx.lineTo(3 + 7.1 * t, 0);
    ctx.lineTo(3.1, 1.8 * w);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 0.65 * w;
    ctx.beginPath(); ctx.moveTo(3, -1.2 * w); ctx.lineTo(3 + 6.5 * t, 0); ctx.stroke();
    ctx.fillStyle = '#65f5d0';
    ctx.beginPath(); ctx.moveTo(-1.5, -1.7 * w); ctx.lineTo(0.2, 0); ctx.lineTo(-1.5, 1.7 * w); ctx.lineTo(-3.2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath(); ctx.arc(-1.5, 0, 0.65 * w, 0, Math.PI * 2); ctx.fill();
    
    ctx.restore();
};
