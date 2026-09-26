// ============================================================================
// BÁRBARO — VÍNCULO BERSERKER (REMAKE COMPLETO)
// ============================================================================

window.vfxListeners = window.vfxListeners || [];
window.vfxBarbaroVinculos = window.vfxBarbaroVinculos || {};

window.vfxListeners.push(function(dados) {
    if (!dados) return;

    if (dados.type === 'action_barbaro_vinculo') {
        let now = Date.now();
        window.vfxBarbaroVinculos[dados.ownerId] = {
            active: true,
            terminating: false,
            termReason: '',
            termTime: 0,
            ownerId: dados.ownerId,
            targetId: dados.targetId,
            targetTipo: dados.targetTipo || 'slime',
            startTime: now,
            expiresAt: now + (dados.duration || 10000),
            time: 0,
            pulseTimer: 0,
            lastPulse: 0,
            pulses: [],
            beamParticles: [],
            shards: [],
            lastOwnerX: Number.isFinite(dados.x) ? dados.x : 0,
            lastOwnerY: Number.isFinite(dados.y) ? dados.y : 0,
            lastTargetX: Number.isFinite(dados.x) ? dados.x : 0,
            lastTargetY: Number.isFinite(dados.y) ? dados.y : 0
        };

        if (dados.ownerId === window.meuId) {
            window.barbaroVinculoAtivo = true;
            window.barbaroVinculoExpires = now + (dados.duration || 10000);
        }
    } else if (dados.type === 'action_barbaro_vinculo_end') {
        const vfx = window.vfxBarbaroVinculos[dados.ownerId];
        if (vfx && vfx.active && !vfx.terminating) {
            vfx.active = false;
            vfx.terminating = true;
            vfx.termReason = dados.motivo || 'fim';
            vfx.termTime = Date.now();
        }
        if (dados.ownerId === window.meuId) {
            window.barbaroVinculoAtivo = false;
        }
    }
});

// ============================================================================
// FUNÇÃO AUXILIAR: DESENHAR ROSTO ESPECTRAL DE DEMÔNIO
// ============================================================================
function desenharRostoDemonio(ctx, x, y, scale, time, alpha, isBarbarian) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // 1. Shroud / Aura de Chamas Espectrais Vermelhas ao redor da Cabeça
    let flamePulse = 1.0 + Math.sin(time * 8) * 0.12;
    let auraGrad = ctx.createRadialGradient(0, -6, 4, 0, -6, 30 * flamePulse);
    auraGrad.addColorStop(0, 'rgba(255, 30, 40, 0.7)');
    auraGrad.addColorStop(0.5, 'rgba(180, 0, 10, 0.4)');
    auraGrad.addColorStop(1, 'rgba(80, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -6, 30 * flamePulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chifres Demoníacos Curvados Ameaçadores
    ctx.shadowColor = '#ff0038';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3.5;

    // Chifre Esquerdo
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.bezierCurveTo(-26, -18, -36, -34, -28, -48);
    ctx.bezierCurveTo(-22, -38, -14, -26, -5, -20);
    ctx.closePath();
    ctx.fillStyle = '#220005';
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.stroke();

    // Chifre Direito
    ctx.beginPath();
    ctx.moveTo(10, -12);
    ctx.bezierCurveTo(26, -18, 36, -34, 28, -48);
    ctx.bezierCurveTo(22, -38, 14, -26, 5, -20);
    ctx.closePath();
    ctx.fillStyle = '#220005';
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.stroke();

    // 3. Crânio / Máscara Demoníaca
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.quadraticCurveTo(22, -6, 17, 6);
    ctx.lineTo(12, 18);
    ctx.lineTo(0, 24);
    ctx.lineTo(-12, 18);
    ctx.lineTo(-17, 6);
    ctx.quadraticCurveTo(-22, -6, -16, -18);
    ctx.closePath();
    let skullGrad = ctx.createLinearGradient(0, -18, 0, 24);
    skullGrad.addColorStop(0, '#3a0208');
    skullGrad.addColorStop(0.6, '#6b0410');
    skullGrad.addColorStop(1, '#1a0003');
    ctx.fillStyle = skullGrad;
    ctx.fill();
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 4. Cavidades Oculares e Olhos de Fogo Flamejantes
    // Órbita esquerda
    ctx.fillStyle = '#0a0002';
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(-4, -10);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();

    // Órbita direita
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(4, -10);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();

    // Pupilas incandescentes (brilho de chama viva)
    let eyeGlow = 0.8 + Math.sin(time * 12) * 0.2;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255, 230, 80, ${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(-8, -5, 2.5, 0, Math.PI * 2);
    ctx.arc(8, -5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Fagulha central branca
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -5, 1.2, 0, Math.PI * 2);
    ctx.arc(8, -5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 5. Mandíbula Rugindo e Presas Demoníacas
    let jawDrop = Math.sin(time * 10) * 3;
    ctx.beginPath();
    ctx.moveTo(-11, 7);
    ctx.lineTo(11, 7);
    ctx.lineTo(8, 16 + jawDrop);
    ctx.lineTo(-8, 16 + jawDrop);
    ctx.closePath();
    ctx.fillStyle = '#050002';
    ctx.fill();

    // Presas superiores
    ctx.fillStyle = '#ffdede';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 7); ctx.lineTo(-6, 12); ctx.lineTo(-4, 7);
    ctx.moveTo(4, 7); ctx.lineTo(6, 12); ctx.lineTo(8, 7);
    ctx.fill();

    // Presas inferiores
    ctx.beginPath();
    ctx.moveTo(-6, 16 + jawDrop); ctx.lineTo(-4, 11 + jawDrop); ctx.lineTo(-2, 16 + jawDrop);
    ctx.moveTo(2, 16 + jawDrop); ctx.lineTo(4, 11 + jawDrop); ctx.lineTo(6, 16 + jawDrop);
    ctx.fill();

    // 6. Runa Demoníaca na Testa
    ctx.strokeStyle = 'rgba(255, 240, 150, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(0, -9);
    ctx.moveTo(-4, -13); ctx.lineTo(4, -13);
    ctx.stroke();

    ctx.restore();
}

// ============================================================================
// FUNÇÃO AUXILIAR: AURA DE FÚRIA SUPERSAIYAJIN (BÁRBARO)
// ============================================================================
function desenharAuraSuperSaiyajin(ctx, x, y, time) {
    ctx.save();
    ctx.translate(x, y);

    // 1. Chão de Ki / Elipse de Energia Incandescente aos Pés
    let kiPulse = 1.0 + Math.sin(time * 12) * 0.15;
    let groundGrad = ctx.createRadialGradient(0, 16, 4, 0, 16, 32 * kiPulse);
    groundGrad.addColorStop(0, 'rgba(255, 60, 0, 0.85)');
    groundGrad.addColorStop(0.5, 'rgba(220, 0, 30, 0.45)');
    groundGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.ellipse(0, 16, 34 * kiPulse, 12 * kiPulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chamas Spiky de Fúria Subindo (Efeito Super Saiyajin)
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 14;

    let numFlames = 9;
    for (let f = 0; f < numFlames; f++) {
        let fAngle = (f / numFlames) * Math.PI; // arco na frente e lados
        let fx = -22 + (f * 5.5);
        let flameFreq = time * 20 + f * 1.8;
        let flameH = 34 + Math.sin(flameFreq) * 16 + Math.cos(flameFreq * 0.7) * 8;
        let sway = Math.sin(flameFreq * 0.8) * 5;

        let flameGrad = ctx.createLinearGradient(fx, 16, fx + sway, 16 - flameH);
        flameGrad.addColorStop(0, 'rgba(255, 230, 50, 0.9)');
        flameGrad.addColorStop(0.3, 'rgba(255, 70, 0, 0.8)');
        flameGrad.addColorStop(0.7, 'rgba(220, 0, 40, 0.4)');
        flameGrad.addColorStop(1, 'rgba(180, 0, 0, 0)');

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(fx - 4, 16);
        ctx.quadraticCurveTo(fx - 2, 16 - flameH * 0.5, fx + sway, 16 - flameH);
        ctx.quadraticCurveTo(fx + 2, 16 - flameH * 0.5, fx + 4, 16);
        ctx.closePath();
        ctx.fill();
    }

    // 3. Faíscas de Ki Elétrico (Lightning Arcs estilo SSJ2)
    if (Math.random() < 0.45) {
        ctx.strokeStyle = Math.random() < 0.5 ? '#ffffff' : '#ff7675';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff3838';
        ctx.shadowBlur = 10;
        let arcStartX = (Math.random() - 0.5) * 36;
        let arcStartY = 14 - Math.random() * 32;
        ctx.beginPath();
        ctx.moveTo(arcStartX, arcStartY);
        for (let seg = 0; seg < 3; seg++) {
            arcStartX += (Math.random() - 0.5) * 14;
            arcStartY -= 6 + Math.random() * 8;
            ctx.lineTo(arcStartX, arcStartY);
        }
        ctx.stroke();
    }

    ctx.restore();
}

// ============================================================================
// LOOP PRINCIPAL DE RENDERIZAÇÃO
// ============================================================================
window.desenharVfxBarbaroVinculo = function(ctx) {
    if (!ctx || !window.vfxBarbaroVinculos) return;
    let now = Date.now();

    for (let ownerId in window.vfxBarbaroVinculos) {
        let vfx = window.vfxBarbaroVinculos[ownerId];
        if (!vfx) continue;

        // 1. Busca posição do Bárbaro
        let owner = null;
        if (typeof window.obterPosicaoEntidade === 'function') {
            owner = window.obterPosicaoEntidade(ownerId);
        }
        if (owner && Number.isFinite(owner.x) && Number.isFinite(owner.y)) {
            vfx.lastOwnerX = owner.x + 12;
            vfx.lastOwnerY = owner.y + 16;
        }

        // Se o Bárbaro morreu ou sumiu, encerra imediatamente
        if (owner && owner.hp <= 0) {
            vfx.active = false;
            vfx.terminating = true;
            vfx.termReason = 'morte';
        }

        // 2. Busca posição do Inimigo Alvo
        let target = null;
        if (Array.isArray(window.listaSlimes)) {
            target = window.listaSlimes.find(s => s && s.id === vfx.targetId);
        }
        if (!target && (typeof listaBosses !== 'undefined' && Array.isArray(listaBosses))) {
            target = listaBosses.find(b => b && b.id === vfx.targetId);
        }
        if (!target && Array.isArray(window.listaBosses)) {
            target = window.listaBosses.find(b => b && b.id === vfx.targetId);
        }

        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
            vfx.lastTargetX = target.x;
            vfx.lastTargetY = target.y;
        }

        // CHECAGEM CRÍTICA ANTI-ÓRFÃO: Inimigo morreu ou sumiu da tela?
        if (!target || target.hp <= 0) {
            if (vfx.active && !vfx.terminating) {
                vfx.active = false;
                vfx.terminating = true;
                vfx.termReason = 'morte';
                vfx.termTime = now;
            }
        }

        // Distância entre Bárbaro e Inimigo
        let oX = vfx.lastOwnerX;
        let oY = vfx.lastOwnerY;
        let tX = vfx.lastTargetX;
        let tY = vfx.lastTargetY;
        let dx = tX - oX;
        let dy = tY - oY;
        let dist = Math.hypot(dx, dy);

        // Se o inimigo se afastar muito (> 450px), encerra o pacto imediatamente!
        if (dist > 450 && vfx.active && !vfx.terminating) {
            vfx.active = false;
            vfx.terminating = true;
            vfx.termReason = 'distancia';
            vfx.termTime = now;
        }

        // Se estourar os 10 segundos, encerra imediatamente!
        if (now >= vfx.expiresAt && vfx.active && !vfx.terminating) {
            vfx.active = false;
            vfx.terminating = true;
            vfx.termReason = 'tempo';
            vfx.termTime = now;
        }

        vfx.time += 0.05;

        // Posição dos Rostos de Demônio (Hover flutuante proporcional ao novo tamanho)
        let hoverB = Math.sin(vfx.time * 4) * 3.5;
        let hoverT = Math.sin(vfx.time * 4 + 1.2) * 3.5;
        let bFaceX = oX;
        let bFaceY = oY - 38 + hoverB;
        let tFaceX = tX;
        let tFaceY = tY - 38 + hoverT;

        // ====================================================================
        // ESTADO ATIVO: VÍNCULO EM PLENO PODER
        // ====================================================================
        if (vfx.active && !vfx.terminating) {
            // A) Aura de Fúria Supersaiyajin no Bárbaro
            desenharAuraSuperSaiyajin(ctx, oX, oY, vfx.time);

            // B) Pulsos de Energia Periódicos (indicando aumento de poder)
            if (now - vfx.lastPulse > 1000) {
                vfx.lastPulse = now;
                vfx.pulses.push({
                    x: oX,
                    y: oY + 8,
                    radius: 12,
                    maxRadius: 65,
                    alpha: 1.0
                });
            }

            // Desenha os pulsos de choque do Bárbaro
            for (let pIdx = vfx.pulses.length - 1; pIdx >= 0; pIdx--) {
                let pulse = vfx.pulses[pIdx];
                pulse.radius += 2.2;
                pulse.alpha -= 0.035;
                if (pulse.alpha <= 0 || pulse.radius >= pulse.maxRadius) {
                    vfx.pulses.splice(pIdx, 1);
                    continue;
                }
                ctx.save();
                ctx.beginPath();
                ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 30, 60, ${pulse.alpha * 0.8})`;
                ctx.lineWidth = 2.5 * pulse.alpha;
                ctx.shadowColor = '#ff0038';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.restore();
            }

            // C) Corrente / Linha Energética Vermelha entre os dois
            ctx.save();

            let connDx = tFaceX - bFaceX;
            let connDy = tFaceY - bFaceY;
            let connDist = Math.hypot(connDx, connDy);
            let perpX = -connDy / (connDist || 1);
            let perpY = connDx / (connDist || 1);

            let pulseGlow = 0.7 + Math.sin(vfx.time * 10) * 0.3;

            // 1. Brilho largo externo vermelho pulsante
            ctx.beginPath();
            ctx.moveTo(bFaceX, bFaceY);
            ctx.lineTo(tFaceX, tFaceY);
            ctx.strokeStyle = `rgba(180, 0, 20, ${0.45 * pulseGlow})`;
            ctx.lineWidth = 10 + Math.sin(vfx.time * 8) * 3;
            ctx.shadowColor = '#ff0038';
            ctx.shadowBlur = 24;
            ctx.stroke();

            // 2. Tendril Sinusoidal em Hélice 1
            ctx.beginPath();
            let segs = Math.max(8, Math.floor(connDist / 12));
            for (let s = 0; s <= segs; s++) {
                let t = s / segs;
                let wave = Math.sin(t * Math.PI * 6 + vfx.time * 12) * 10;
                let px = bFaceX + connDx * t + perpX * wave;
                let py = bFaceY + connDy * t + perpY * wave;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = `rgba(255, 40, 50, ${0.85 * pulseGlow})`;
            ctx.lineWidth = 3.5;
            ctx.stroke();

            // 3. Tendril Sinusoidal em Hélice 2 (Fase oposta)
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                let t = s / segs;
                let wave = Math.sin(t * Math.PI * 6 + vfx.time * 12 + Math.PI) * 10;
                let px = bFaceX + connDx * t + perpX * wave;
                let py = bFaceY + connDy * t + perpY * wave;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = `rgba(255, 80, 40, ${0.75 * pulseGlow})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // 4. Corrente Espectral com Elo de Sangue (Tracejado animado)
            ctx.beginPath();
            ctx.moveTo(bFaceX, bFaceY);
            ctx.lineTo(tFaceX, tFaceY);
            ctx.strokeStyle = 'rgba(255, 30, 60, 0.9)';
            ctx.lineWidth = 4;
            ctx.setLineDash([12, 8]);
            ctx.lineDashOffset = -vfx.time * 35; // Corrente correndo em direção ao bárbaro
            ctx.stroke();

            // 5. Núcleo Incandescente Central
            ctx.beginPath();
            ctx.moveTo(bFaceX, bFaceY);
            ctx.lineTo(tFaceX, tFaceY);
            ctx.strokeStyle = 'rgba(255, 235, 230, 0.95)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();

            ctx.restore();

            // D) Partículas Vermelhas Viajando Entre os Dois (Sifão de Poder)
            if (Math.random() < 0.85) {
                vfx.beamParticles.push({
                    progress: 1.0, // Começa no inimigo (1.0) e vai para o Bárbaro (0.0)
                    speed: 0.022 + Math.random() * 0.025,
                    lateralWave: (Math.random() - 0.5) * 14,
                    size: 2.5 + Math.random() * 3,
                    color: Math.random() < 0.6 ? '#ff1744' : '#ff9f43'
                });
            }

            ctx.save();
            for (let pIdx = vfx.beamParticles.length - 1; pIdx >= 0; pIdx--) {
                let bp = vfx.beamParticles[pIdx];
                bp.progress -= bp.speed;
                if (bp.progress <= 0) {
                    vfx.beamParticles.splice(pIdx, 1);
                    continue;
                }

                let t = bp.progress;
                let wave = Math.sin(t * Math.PI * 4 + vfx.time * 8) * bp.lateralWave;
                let px = bFaceX + connDx * t + perpX * wave;
                let py = bFaceY + connDy * t + perpY * wave;

                ctx.beginPath();
                ctx.arc(px, py, bp.size, 0, Math.PI * 2);
                ctx.fillStyle = bp.color;
                ctx.shadowColor = bp.color;
                ctx.shadowBlur = 8;
                ctx.fill();
            }
            ctx.restore();

            // E) Rosto Espectral de Demônio acima do Bárbaro (reduzido em ~50%)
            desenharRostoDemonio(ctx, bFaceX, bFaceY, 0.62, vfx.time, 1.0, true);

            // F) Rosto Espectral de Demônio idêntico acima do Inimigo (reduzido em ~50%)
            desenharRostoDemonio(ctx, tFaceX, tFaceY, 0.55, vfx.time, 1.0, false);
        }
        // ====================================================================
        // ESTADO DE ENCERRAMENTO: SHATTER & FADEOUT (SEM DEIXAR ÓRFÃO)
        // ====================================================================
        else if (vfx.terminating) {
            let termElapsed = now - (vfx.termTime || now);

            // No primeiro frame da quebra, gera estilhaços de sangue cristalizado
            if (!vfx.shattered) {
                vfx.shattered = true;
                let connDx = tFaceX - bFaceX;
                let connDy = tFaceY - bFaceY;

                // Estilhaços ao longo da linha
                for (let i = 0; i < 28; i++) {
                    let f = i / 28;
                    vfx.shards.push({
                        x: bFaceX + connDx * f + (Math.random() - 0.5) * 16,
                        y: bFaceY + connDy * f + (Math.random() - 0.5) * 16,
                        vx: (Math.random() - 0.5) * 7,
                        vy: (Math.random() - 0.5) * 7 - 2,
                        size: 3 + Math.random() * 4,
                        life: 1.0,
                        color: Math.random() < 0.5 ? '#ff1744' : '#d63031'
                    });
                }

                // Estilhaços do rosto do Bárbaro
                for (let i = 0; i < 14; i++) {
                    vfx.shards.push({
                        x: bFaceX + (Math.random() - 0.5) * 20,
                        y: bFaceY + (Math.random() - 0.5) * 20,
                        vx: (Math.random() - 0.5) * 6,
                        vy: -2 - Math.random() * 4,
                        size: 3 + Math.random() * 3,
                        life: 1.0,
                        color: '#ff4757'
                    });
                }
            }

            // Desenha e atualiza os estilhaços de quebra
            if (vfx.shards && vfx.shards.length > 0) {
                ctx.save();
                for (let sIdx = vfx.shards.length - 1; sIdx >= 0; sIdx--) {
                    let sh = vfx.shards[sIdx];
                    sh.x += sh.vx;
                    sh.y += sh.vy;
                    sh.vy += 0.28; // gravidade
                    sh.life -= 0.05;
                    if (sh.life <= 0) {
                        vfx.shards.splice(sIdx, 1);
                        continue;
                    }
                    ctx.beginPath();
                    ctx.rect(sh.x, sh.y, sh.size, sh.size);
                    ctx.fillStyle = sh.color;
                    ctx.globalAlpha = Math.max(0, sh.life);
                    ctx.shadowColor = sh.color;
                    ctx.shadowBlur = 6;
                    ctx.fill();
                }
                ctx.restore();
            }

            // Após 280ms de estilhaços, apaga TOTALMENTE o objeto da memória
            if (termElapsed > 280 || (vfx.shards && vfx.shards.length === 0)) {
                if (ownerId === window.meuId) {
                    window.barbaroVinculoAtivo = false;
                }
                delete window.vfxBarbaroVinculos[ownerId];
            }
        }
    }
};
