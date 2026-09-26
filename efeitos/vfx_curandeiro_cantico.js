// ============================================================================
// CURANDEIRO — CÂNTICO CELESTIAL (REMAKE COMPLETO)
// ============================================================================

window.vfxCurandeiroCanticos = window.vfxCurandeiroCanticos || [];
window.curandeiroCanticoDebuffs = window.curandeiroCanticoDebuffs || [];

if (!window.vfxListeners) {
    window.vfxListeners = [];
}

window.vfxListeners.push(function(dados) {
    if (!dados || dados.type !== 'action_curandeiro_cantico') return;

    let now = Date.now();

    // 1. Localiza a posição do Curandeiro
    let healerX = 0, healerY = 0, healerFound = false;
    if (dados.ownerId === window.meuId) {
        healerX = window.meuX + 12;
        healerY = window.meuY + 16;
        healerFound = true;
    } else if (window.todosJogadores && window.todosJogadores[dados.ownerId]) {
        let p = window.todosJogadores[dados.ownerId];
        healerX = p.x + 12;
        healerY = p.y + 16;
        healerFound = true;
    } else if (Number.isFinite(dados.x) && Number.isFinite(dados.y)) {
        healerX = dados.x + 12;
        healerY = dados.y + 16;
        healerFound = true;
    }

    // 2. Cria a Aura Celestial e o Feixe de Luz no Curandeiro
    if (healerFound) {
        if (dados.ownerId === window.meuId) {
            if (window.tocarSonoro) window.tocarSonoro('curandeiro_skill4');
        } else if (window.tocarSonoroProximidade) {
            window.tocarSonoroProximidade('curandeiro_skill4', healerX, healerY);
        }
        window.vfxCurandeiroCanticos.push({
            type: 'aura_celestial',
            x: healerX,
            y: healerY,
            startTime: now,
            duration: 1800,
            particles: []
        });
    }

    // 3. Processa até 5 alvos selecionados
    if (dados.targets && Array.isArray(dados.targets)) {
        let maxTargets = Math.min(5, dados.targets.length);
        for (let i = 0; i < maxTargets; i++) {
            let t = dados.targets[i];
            let mobId = (typeof t === 'object') ? t.id : t;
            let initX = (typeof t === 'object' && Number.isFinite(t.x)) ? t.x : healerX;
            let initY = (typeof t === 'object' && Number.isFinite(t.y)) ? t.y : healerY;
            let tipo = (typeof t === 'object' && t.tipo) ? t.tipo : 'slime';

            // Tenta obter posição em tempo real do alvo se já estiver no canvas
            let liveTarget = null;
            if (typeof window.obterPosicaoEntidade === 'function') {
                liveTarget = window.obterPosicaoEntidade(mobId);
            }
            if (liveTarget && Number.isFinite(liveTarget.x) && Number.isFinite(liveTarget.y)) {
                initX = liveTarget.x;
                initY = liveTarget.y;
            }

            // Cada anjo desce com leve defasagem estética
            let delay = i * 60;
            let lateralOffset = (i - 2) * 20;

            window.vfxCurandeiroCanticos.push({
                type: 'anjo_celestial',
                mobId: mobId,
                tipo: tipo,
                targetX: initX,
                targetY: initY,
                startX: initX + lateralOffset,
                startY: initY - 380,
                startTime: now + delay,
                impactTime: 650,
                duration: 2200,
                hitApplied: false,
                sparks: [],
                angelParticles: []
            });
        }
    }
});

// ============================================================================
// LOOP DE RENDERIZAÇÃO
// ============================================================================
window.desenharVfxCurandeiroCantico = function(ctx) {
    if (!ctx) return;
    let now = Date.now();

    // ------------------------------------------------------------------------
    // A) DESENHA OS EFEITOS ATIVOS (AURAS, ANJOS E IMPACTOS)
    // ------------------------------------------------------------------------
    if (window.vfxCurandeiroCanticos && window.vfxCurandeiroCanticos.length > 0) {
        for (let i = window.vfxCurandeiroCanticos.length - 1; i >= 0; i--) {
            let vfx = window.vfxCurandeiroCanticos[i];
            if (now < vfx.startTime) continue; // Ainda aguardando o delay de início

            let elapsed = now - vfx.startTime;
            let progress = elapsed / vfx.duration;

            if (progress >= 1) {
                window.vfxCurandeiroCanticos.splice(i, 1);
                continue;
            }

            ctx.save();

            // ----------------------------------------------------------------
            // 1. AURA CELESTIAL AO REDOR DO CURANDEIRO
            // ----------------------------------------------------------------
            if (vfx.type === 'aura_celestial') {
                let alpha = (progress < 0.2) ? (progress / 0.2) : (1 - (progress - 0.2) / 0.8);
                alpha = Math.max(0, Math.min(1, alpha));

                ctx.translate(vfx.x, vfx.y);

                // Feixe de luz celestial subindo até o céu
                let beamAlpha = alpha * 0.45;
                let gradBeam = ctx.createLinearGradient(0, 20, 0, -420);
                gradBeam.addColorStop(0, `rgba(255, 240, 180, ${beamAlpha * 0.9})`);
                gradBeam.addColorStop(0.3, `rgba(255, 215, 0, ${beamAlpha * 0.6})`);
                gradBeam.addColorStop(1, `rgba(255, 255, 255, 0)`);
                ctx.fillStyle = gradBeam;
                ctx.fillRect(-28, -420, 56, 440);

                // Anel de luz interior e exterior pulsando
                let radius = 25 + progress * 115;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.85})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 12;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 240, ${alpha * 0.9})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Estrela sagrada rúnica girando
                let angleOffset = progress * Math.PI * 0.8;
                ctx.beginPath();
                let points = 6;
                let rOut = radius * 0.8;
                let rIn = radius * 0.35;
                for (let p = 0; p < points * 2; p++) {
                    let a = angleOffset + (p * Math.PI / points);
                    let r = (p % 2 === 0) ? rOut : rIn;
                    let px = Math.cos(a) * r;
                    let py = Math.sin(a) * r;
                    if (p === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.strokeStyle = `rgba(255, 245, 180, ${alpha * 0.75})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Raios de luz dourada
                for (let r = 0; r < 8; r++) {
                    let rayAngle = angleOffset * 0.5 + (r * Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(rayAngle) * (radius * 0.3), Math.sin(rayAngle) * (radius * 0.3));
                    ctx.lineTo(Math.cos(rayAngle) * (radius * 1.08), Math.sin(rayAngle) * (radius * 1.08));
                    ctx.strokeStyle = `rgba(255, 230, 100, ${alpha * 0.6})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Partículas subindo em direção ao céu
                if (Math.random() < 0.65) {
                    vfx.particles.push({
                        x: (Math.random() - 0.5) * 60,
                        y: 10 + Math.random() * 10,
                        vy: -2.5 - Math.random() * 2.5,
                        vx: (Math.random() - 0.5) * 1.2,
                        size: 2 + Math.random() * 3,
                        alpha: 1.0,
                        color: Math.random() < 0.6 ? '#ffd700' : '#ffffff'
                    });
                }

                for (let pIdx = vfx.particles.length - 1; pIdx >= 0; pIdx--) {
                    let pt = vfx.particles[pIdx];
                    pt.x += pt.vx;
                    pt.y += pt.vy;
                    pt.alpha -= 0.025;
                    if (pt.alpha <= 0) {
                        vfx.particles.splice(pIdx, 1);
                        continue;
                    }
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                    ctx.fillStyle = pt.color;
                    ctx.globalAlpha = pt.alpha * alpha;
                    ctx.shadowColor = pt.color;
                    ctx.shadowBlur = 8;
                    ctx.fill();
                }
            }

            // ----------------------------------------------------------------
            // 2. ANJO DE ENERGIA (DESCIDA -> IMPACTO -> RETORNO VERMELHO)
            // ----------------------------------------------------------------
            else if (vfx.type === 'anjo_celestial') {
                // Atualiza posição do alvo se ele estiver vivo
                let liveMob = null;
                if (Array.isArray(window.listaSlimes)) {
                    liveMob = window.listaSlimes.find(s => s && s.id === vfx.mobId && s.hp > 0);
                }
                if (!liveMob && (typeof listaBosses !== 'undefined' && Array.isArray(listaBosses))) {
                    liveMob = listaBosses.find(b => b && b.id === vfx.mobId && b.hp > 0);
                }
                if (!liveMob && Array.isArray(window.listaBosses)) {
                    liveMob = window.listaBosses.find(b => b && b.id === vfx.mobId && b.hp > 0);
                }

                if (liveMob) {
                    vfx.targetX = liveMob.x;
                    vfx.targetY = liveMob.y;
                }

                let currentX = vfx.targetX;
                let currentY = vfx.targetY;
                let rColor = 255, gColor = 215, bColor = 0; // Padrão dourado
                let glowColor = '#ffd700';
                let angelAlpha = 1.0;
                let wingSpanScale = 1.0;

                // FASE 1: DESCIDA CELESTIAL DO CÉU (0ms até 650ms)
                if (elapsed < vfx.impactTime) {
                    let pDesc = elapsed / vfx.impactTime;
                    let ease = pDesc * pDesc; // Aceleração suave
                    currentX = vfx.startX + (vfx.targetX - vfx.startX) * ease;
                    currentY = vfx.startY + (vfx.targetY - vfx.startY) * ease;
                    angelAlpha = Math.min(1.0, pDesc * 2.0);
                    rColor = 255; gColor = 235; bColor = 120;
                    glowColor = '#ffeaa7';

                    // Rastro de luz stardust
                    if (Math.random() < 0.6) {
                        vfx.angelParticles.push({
                            x: currentX + (Math.random() - 0.5) * 16,
                            y: currentY + (Math.random() - 0.5) * 12,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: -1.0 - Math.random() * 2,
                            size: 2.5 + Math.random() * 2.5,
                            alpha: 1.0,
                            color: Math.random() < 0.5 ? '#ffd700' : '#ffffff'
                        });
                    }
                }
                // FASE 2 & 3: IMPACTO E ASCENSÃO COM MUDANÇA PARA VERMELHO
                else {
                    let ascElapsed = elapsed - vfx.impactTime;
                    let ascDuration = vfx.duration - vfx.impactTime;
                    let pAsc = ascElapsed / ascDuration;

                    // Gatilho de impacto no primeiro instante da fase
                    if (!vfx.hitApplied) {
                        vfx.hitApplied = true;

                        // Adiciona/atualiza o debuff na lista ativa
                        let existing = window.curandeiroCanticoDebuffs.find(d => d.id === vfx.mobId);
                        if (existing) {
                            existing.startTime = now;
                            existing.duration = 10000;
                            existing.x = vfx.targetX;
                            existing.y = vfx.targetY;
                        } else {
                            window.curandeiroCanticoDebuffs.push({
                                id: vfx.mobId,
                                tipo: vfx.tipo,
                                x: vfx.targetX,
                                y: vfx.targetY,
                                startTime: now,
                                duration: 10000
                            });
                        }

                        // Gera faíscas radiais de impacto
                        for (let s = 0; s < 16; s++) {
                            let spAngle = (s / 16) * Math.PI * 2;
                            let spSpeed = 3.0 + Math.random() * 4.5;
                            vfx.sparks.push({
                                x: vfx.targetX,
                                y: vfx.targetY - 10,
                                vx: Math.cos(spAngle) * spSpeed,
                                vy: Math.sin(spAngle) * spSpeed - 1.0,
                                size: 2.5 + Math.random() * 3,
                                alpha: 1.0,
                                color: s % 2 === 0 ? '#ffd700' : '#ffffff'
                            });
                        }
                    }

                    // Posição subindo de volta ao céu
                    let easeUp = Math.pow(pAsc, 1.35);
                    currentX = vfx.targetX;
                    currentY = (vfx.targetY - 10) - (easeUp * 420);
                    angelAlpha = (pAsc > 0.75) ? (1.0 - (pAsc - 0.75) / 0.25) : 1.0;

                    // TRANSIÇÃO DE ENERGIA PARA VERMELHO (Absorção de Poder)
                    // Dourado/Branco -> Vermelho Sangue Carmesim (#ff1744)
                    let shift = Math.min(1.0, pAsc * 1.6);
                    rColor = 255;
                    gColor = Math.round(220 * (1 - shift) + 20 * shift);
                    bColor = Math.round(70 * (1 - shift) + 40 * shift);
                    glowColor = shift > 0.5 ? '#ff1744' : '#ffd700';

                    // Emite partículas duplas: Douradas e Vermelhas
                    if (Math.random() < 0.7) {
                        vfx.angelParticles.push({
                            x: currentX + (Math.random() - 0.5) * 20,
                            y: currentY + 10 + Math.random() * 10,
                            vx: (Math.random() - 0.5) * 2.0,
                            vy: 2.0 + Math.random() * 2.5, // caindo para trás
                            size: 2.5 + Math.random() * 2.5,
                            alpha: 1.0,
                            color: Math.random() < shift ? '#ff2a2a' : '#ffd700'
                        });
                    }

                    // Desenha o choque de impacto nos primeiros 200ms após o toque
                    if (ascElapsed < 220) {
                        let shockProg = ascElapsed / 220;
                        let shockRad = 15 + shockProg * 45;
                        ctx.beginPath();
                        ctx.arc(vfx.targetX, vfx.targetY - 10, shockRad, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(255, 235, 150, ${1 - shockProg})`;
                        ctx.lineWidth = 3 * (1 - shockProg);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(vfx.targetX, vfx.targetY - 10, shockRad * 0.5, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - shockProg) * 0.7})`;
                        ctx.fill();
                    }
                }

                // Desenha faíscas de impacto
                for (let sIdx = vfx.sparks.length - 1; sIdx >= 0; sIdx--) {
                    let sp = vfx.sparks[sIdx];
                    sp.x += sp.vx;
                    sp.y += sp.vy;
                    sp.vx *= 0.94;
                    sp.vy += 0.12; // gravidade leve
                    sp.alpha -= 0.04;
                    if (sp.alpha <= 0) {
                        vfx.sparks.splice(sIdx, 1);
                        continue;
                    }
                    ctx.beginPath();
                    ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
                    ctx.fillStyle = sp.color;
                    ctx.globalAlpha = sp.alpha;
                    ctx.shadowColor = sp.color;
                    ctx.shadowBlur = 6;
                    ctx.fill();
                }

                // Desenha partículas do rastro do anjo
                for (let pIdx = vfx.angelParticles.length - 1; pIdx >= 0; pIdx--) {
                    let ap = vfx.angelParticles[pIdx];
                    ap.x += ap.vx;
                    ap.y += ap.vy;
                    ap.alpha -= 0.035;
                    if (ap.alpha <= 0) {
                        vfx.angelParticles.splice(pIdx, 1);
                        continue;
                    }
                    ctx.beginPath();
                    ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
                    ctx.fillStyle = ap.color;
                    ctx.globalAlpha = ap.alpha * angelAlpha;
                    ctx.shadowColor = ap.color;
                    ctx.shadowBlur = 6;
                    ctx.fill();
                }

                // DESENHO PROCEDURAL DO ANJO CELESTIAL
                if (angelAlpha > 0) {
                    ctx.translate(currentX, currentY);
                    ctx.globalAlpha = Math.max(0, Math.min(1, angelAlpha));

                    // 1. Auréola Sagrada (Halo)
                    ctx.beginPath();
                    ctx.ellipse(0, -44, 15, 5, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(${rColor}, ${gColor}, ${bColor}, 0.95)`;
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = glowColor;
                    ctx.shadowBlur = 12;
                    ctx.stroke();

                    // 2. Cabeça / Núcleo de Luz
                    ctx.beginPath();
                    ctx.arc(0, -32, 6.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, 0.95)`;
                    ctx.shadowColor = glowColor;
                    ctx.shadowBlur = 10;
                    ctx.fill();

                    // 3. Vestimenta Celestial / Corpo de Luz Fluida
                    let gradBody = ctx.createLinearGradient(0, -26, 0, 24);
                    gradBody.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
                    gradBody.addColorStop(0.4, `rgba(${rColor}, ${gColor}, ${bColor}, 0.85)`);
                    gradBody.addColorStop(1, `rgba(${rColor}, ${gColor}, ${bColor}, 0)`);
                    ctx.fillStyle = gradBody;

                    ctx.beginPath();
                    ctx.moveTo(-6, -26);
                    ctx.lineTo(6, -26);
                    ctx.quadraticCurveTo(12, 0, 3, 26);
                    ctx.lineTo(-3, 26);
                    ctx.quadraticCurveTo(-12, 0, -6, -26);
                    ctx.closePath();
                    ctx.fill();

                    // 4. Asas Radiantes com Batimento Gracioso
                    let flap = Math.sin(now / 85) * 14;
                    let wingSpan = 48 + flap;

                    // Asa Esquerda
                    ctx.beginPath();
                    ctx.moveTo(-4, -22);
                    ctx.bezierCurveTo(-28, -48 + flap, -45, -30 + flap, -wingSpan, -10 + flap);
                    ctx.bezierCurveTo(-45, 12 + flap, -25, 4, -4, -6);
                    ctx.fillStyle = `rgba(${rColor}, ${gColor}, ${bColor}, 0.40)`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(${rColor}, ${gColor}, ${bColor}, 0.95)`;
                    ctx.lineWidth = 2.2;
                    ctx.stroke();

                    // Penas / Nervuras internas (Asa Esquerda)
                    for (let w = 1; w <= 3; w++) {
                        ctx.beginPath();
                        ctx.moveTo(-4, -20 + w * 4);
                        ctx.quadraticCurveTo(-26, -30 + flap + w * 6, -wingSpan * (0.5 + w * 0.15), -12 + flap + w * 4);
                        ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                    }

                    // Asa Direita
                    ctx.beginPath();
                    ctx.moveTo(4, -22);
                    ctx.bezierCurveTo(28, -48 + flap, 45, -30 + flap, wingSpan, -10 + flap);
                    ctx.bezierCurveTo(45, 12 + flap, 25, 4, 4, -6);
                    ctx.fillStyle = `rgba(${rColor}, ${gColor}, ${bColor}, 0.40)`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(${rColor}, ${gColor}, ${bColor}, 0.95)`;
                    ctx.lineWidth = 2.2;
                    ctx.stroke();

                    // Penas / Nervuras internas (Asa Direita)
                    for (let w = 1; w <= 3; w++) {
                        ctx.beginPath();
                        ctx.moveTo(4, -20 + w * 4);
                        ctx.quadraticCurveTo(26, -30 + flap + w * 6, wingSpan * (0.5 + w * 0.15), -12 + flap + w * 4);
                        ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                    }
                }
            }

            ctx.restore();
        }
    }

    // ------------------------------------------------------------------------
    // B) DESENHA OS INDICADORES DE DEBUFFS ACIMA DA CABEÇA DOS INIMIGOS
    // ------------------------------------------------------------------------
    if (window.curandeiroCanticoDebuffs && window.curandeiroCanticoDebuffs.length > 0) {
        for (let dIdx = window.curandeiroCanticoDebuffs.length - 1; dIdx >= 0; dIdx--) {
            let debuff = window.curandeiroCanticoDebuffs[dIdx];
            let remTime = debuff.duration - (now - debuff.startTime);

            if (remTime <= 0) {
                window.curandeiroCanticoDebuffs.splice(dIdx, 1);
                continue;
            }

            // Acompanha a posição do monstro em tempo real
            let liveMob = null;
            if (Array.isArray(window.listaSlimes)) {
                liveMob = window.listaSlimes.find(s => s && s.id === debuff.id);
            }
            if (!liveMob && (typeof listaBosses !== 'undefined' && Array.isArray(listaBosses))) {
                liveMob = listaBosses.find(b => b && b.id === debuff.id);
            }
            if (!liveMob && Array.isArray(window.listaBosses)) {
                liveMob = window.listaBosses.find(b => b && b.id === debuff.id);
            }

            if (liveMob) {
                // Se o monstro morreu, remove o debuff imediatamente
                if (liveMob.hp <= 0) {
                    window.curandeiroCanticoDebuffs.splice(dIdx, 1);
                    continue;
                }
                debuff.x = liveMob.x;
                debuff.y = liveMob.y;
            }

            // Posição acima do monstro: logo acima da barra de HP (y - 42)
            let badgeX = debuff.x;
            let badgeY = debuff.y - 42;
            let pProg = Math.max(0, Math.min(1, remTime / debuff.duration));

            ctx.save();
            ctx.translate(badgeX, badgeY);

            // ================================================================
            // BADGE 1: DEFESA -20% (ESCUDO AZUL/DOURADO)
            // ================================================================
            let b1X = -44, b1Y = -8, b1W = 41, b1H = 16, b1R = 4;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(b1X, b1Y, b1W, b1H, b1R) : ctx.rect(b1X, b1Y, b1W, b1H);
            ctx.fillStyle = 'rgba(12, 18, 30, 0.90)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#3498db';
            ctx.shadowBlur = 4;
            ctx.stroke();

            // Ícone 🛡️ e Texto -20%
            ctx.font = "bold 10px 'Rajdhani', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.fillText("🛡️", b1X + 2, b1Y + 8);
            ctx.fillStyle = "#74b9ff";
            ctx.fillText("-20%", b1X + 17, b1Y + 9);

            // Barra de duração do debuff de defesa (fundo do badge)
            if (pProg > 0) {
                ctx.beginPath();
                ctx.moveTo(b1X + 2, b1Y + b1H - 1.5);
                ctx.lineTo(b1X + 2 + (b1W - 4) * pProg, b1Y + b1H - 1.5);
                ctx.strokeStyle = '#0984e3';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // ================================================================
            // BADGE 2: ATAQUE -5% (ESPADA VERMELHA)
            // ================================================================
            let b2X = 3, b2Y = -8, b2W = 41, b2H = 16, b2R = 4;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(b2X, b2Y, b2W, b2H, b2R) : ctx.rect(b2X, b2Y, b2W, b2H);
            ctx.fillStyle = 'rgba(28, 12, 12, 0.90)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#e74c3c';
            ctx.shadowBlur = 4;
            ctx.stroke();

            // Ícone ⚔️ e Texto -5%
            ctx.font = "bold 10px 'Rajdhani', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.fillText("⚔️", b2X + 2, b2Y + 8);
            ctx.fillStyle = "#ff7675";
            ctx.fillText("-5%", b2X + 18, b2Y + 9);

            // Barra de duração do debuff de ataque (fundo do badge)
            if (pProg > 0) {
                ctx.beginPath();
                ctx.moveTo(b2X + 2, b2Y + b2H - 1.5);
                ctx.lineTo(b2X + 2 + (b2W - 4) * pProg, b2Y + b2H - 1.5);
                ctx.strokeStyle = '#d63031';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.restore();
        }
    }
};
