// efeitos/mago_efeitos.js — Efeitos visuais: Vulcão + Queimadura Congelante Extrema

window.vulcoesAtivos = window.vulcoesAtivos || [];
window.vulcaoProjeteis = window.vulcaoProjeteis || [];
window.vulcaoImpactos = window.vulcaoImpactos || [];
window.vulcaoIndicadores = window.vulcaoIndicadores || [];
window.queimadurasFx = window.queimadurasFx || [];
window.reacoesCongelantes = window.reacoesCongelantes || [];

// =====================================================================
// CRIAR VULCÃO
// =====================================================================
window.pedrasEnormesAtivas = window.pedrasEnormesAtivas || [];
window.criarPedraEnorme = function(sx, sy, tx, ty) {
    window.pedrasEnormesAtivas.push({ sx: sx, sy: sy, tx: tx, ty: ty, progresso: 0, velocidade: 0.05, rot: 0 });
};
window.desenharPedrasEnormes = function() {
    let ctx = window.ctx;
    if (!ctx) return;
    for (let i = window.pedrasEnormesAtivas.length - 1; i >= 0; i--) {
        let p = window.pedrasEnormesAtivas[i];
        p.progresso += p.velocidade;
        p.rot += 0.2;
        if (p.progresso >= 1) { window.pedrasEnormesAtivas.splice(i, 1); if (typeof window.tremorTela !== 'undefined') window.tremorTela = 6; continue; }
        let t = p.progresso;
        let curX = p.sx + (p.tx - p.sx) * t;
        let curY = p.sy + (p.ty - p.sy) * t - 100 * Math.sin(t * Math.PI);
        ctx.save();
        ctx.translate(curX, curY);
        ctx.rotate(p.rot);
        ctx.fillStyle = '#6b5039';
        ctx.beginPath();
        ctx.moveTo(-12, -10); ctx.lineTo(10, -14); ctx.lineTo(14, 8); ctx.lineTo(-8, 14); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(120,90,60,0.3)';
        ctx.beginPath(); ctx.arc(curX, curY, 6, 0, Math.PI * 2); ctx.fill();
    }
};

window.criarAnimacaoVulcao = function(tx, ty, radius, duracao) {
    if (typeof tocarSomVulcaoErupcao === 'function') tocarSomVulcaoErupcao();
    let duracaoTicks = duracao || 200;
    let rachaduras = [];
    for (let i = 0; i < 12; i++) {
        let ang = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.4;
        let comp = 18 + Math.random() * 22;
        rachaduras.push({ ang: ang, comp: comp, largura: 1 + Math.random() * 2, delay: Math.random() * 15 });
    }
    let pedras = [];
    for (let i = 0; i < 16; i++) {
        let ang = Math.random() * Math.PI * 2;
        let d = 8 + Math.random() * 20;
        pedras.push({
            x: Math.cos(ang) * d, y: Math.sin(ang) * d,
            vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 4,
            size: 2 + Math.random() * 3, life: 30 + Math.random() * 20
        });
    }
    window.vulcoesAtivos.push({
        x: tx, y: ty, radius: radius || 140,
        fase: 'emergindo', timer: 0,
        startTime: Date.now(), duracaoMs: duracaoTicks * 50,
        emergirDuracao: 40, rachaduras: rachaduras,
        pedras: pedras, altura: 0, alturaMax: 38,
        fumacas: [], brasas: [], lavaEscorrendo: []
    });
};

// =====================================================================
// CRIAR PROJÉTIL DO VULCÃO
// =====================================================================
window.criarVulcaoProjetil = function(vx, vy, tx, ty, tipo, id) {
    if (typeof tocarSomVulcaoLancamento === 'function') tocarSomVulcaoLancamento();
    window.vulcaoIndicadores.push({
        x: tx, y: ty, timer: 0, maxTimer: 50,
        raio: 40, tipo: tipo, id: id
    });
    window.vulcaoProjeteis.push({
        id: id, sx: vx, sy: vy - 30,
        tx: tx, ty: ty, tipo: tipo,
        progresso: 0, velocidade: 0.04,
        trail: [], brasas: []
    });
};

// =====================================================================
// CRIAR IMPACTO
// =====================================================================
window.criarVulcaoImpacto = function(tx, ty, tipo, id) {
    if (typeof tocarSomVulcaoImpacto === 'function') tocarSomVulcaoImpacto();
    for (let i = window.vulcaoIndicadores.length - 1; i >= 0; i--) {
        if (window.vulcaoIndicadores[i].id === id) {
            window.vulcaoIndicadores.splice(i, 1);
            break;
        }
    }
    let frags = [];
    for (let i = 0; i < 18; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = 1.5 + Math.random() * 4;
        frags.push({
            x: 0, y: 0,
            vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 2,
            size: 2 + Math.random() * 3,
            life: 20 + Math.random() * 15,
            cor: tipo === 'lava' ? '#e74c3c' : '#f39c12'
        });
    }
    window.vulcaoImpactos.push({
        x: tx, y: ty, tipo: tipo, timer: 0,
        maxTimer: 35, frags: frags, ondaChoque: 0
    });
    if (typeof window.tremorTela !== 'undefined') window.tremorTela = 4;
};

// =====================================================================
// CRIAR REAÇÃO CONGELANTE
// =====================================================================
window.criarReacaoCongelante = function(x, y) {
    let parts = [];
    for (let i = 0; i < 20; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = 1 + Math.random() * 3;
        let tipo = Math.random() < 0.33 ? 'fogo' : (Math.random() < 0.5 ? 'gelo' : 'vapor');
        parts.push({
            x: 0, y: 0,
            vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 1.5,
            life: 25 + Math.random() * 20, tipo: tipo,
            size: 2 + Math.random() * 3
        });
    }
    window.reacoesCongelantes.push({ x: x, y: y, timer: 0, maxTimer: 45, parts: parts });
};

// =====================================================================
// DESENHAR TODOS OS EFEITOS DO MAGO
// =====================================================================
window.desenharEfeitosMago = function() {
    let ctx = window.ctx;
    if (!ctx) return;
    let agora = Date.now();

    desenharVulcoes(ctx, agora);
    desenharIndicadores(ctx, agora);
    desenharProjeteis(ctx, agora);
    desenharImpactos(ctx, agora);
    desenharReacoesCongelantes(ctx, agora);
};

// =====================================================================
// VULCÃO PRINCIPAL
// =====================================================================
function desenharVulcoes(ctx, agora) {
    for (let i = window.vulcoesAtivos.length - 1; i >= 0; i--) {
        let v = window.vulcoesAtivos[i];
        v.timer++;

        ctx.save();
        ctx.translate(v.x, v.y);

        let progEmergir = Math.min(1, v.timer / v.emergirDuracao);
        let easeEmergir = 1 - Math.pow(1 - progEmergir, 3);

        // FASE 1: Rachaduras no chão
        if (v.timer < v.emergirDuracao) {
            let brilhoRach = Math.min(1, v.timer / 15);
            for (let r = 0; r < v.rachaduras.length; r++) {
                let rach = v.rachaduras[r];
                if (v.timer < rach.delay) continue;
                let progR = Math.min(1, (v.timer - rach.delay) / 12);
                ctx.save();
                ctx.rotate(rach.ang);
                ctx.beginPath();
                ctx.moveTo(6, 0);
                ctx.lineTo(6 + rach.comp * progR, (Math.random() - 0.5) * 2);
                ctx.strokeStyle = 'rgba(231,76,60,' + (0.5 + brilhoRach * 0.5) + ')';
                ctx.lineWidth = rach.largura * progR;
                ctx.stroke();
                ctx.strokeStyle = 'rgba(241,196,15,' + (brilhoRach * 0.6) + ')';
                ctx.lineWidth = rach.largura * progR * 0.5;
                ctx.stroke();
                ctx.restore();
            }

            // Poeira
            for (let p = 0; p < v.pedras.length; p++) {
                let pd = v.pedras[p];
                if (pd.life <= 0) continue;
                pd.x += pd.vx * 0.3;
                pd.y += pd.vy * 0.3;
                pd.vy += 0.15;
                pd.life--;
                ctx.fillStyle = 'rgba(139,90,43,' + (pd.life / 50) + ')';
                ctx.fillRect(pd.x - pd.size / 2, pd.y - pd.size / 2, pd.size, pd.size);
            }
        }

        // FASE 2: Vulcão ativo
        if (progEmergir > 0.3) {
            v.altura = v.alturaMax * easeEmergir;
            let h = v.altura;
            let baseW = 32 + h * 0.6;

            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 4, baseW + 4, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Corpo do vulcão
            let gradCorpo = ctx.createLinearGradient(0, 0, 0, -h);
            gradCorpo.addColorStop(0, '#5d3a1a');
            gradCorpo.addColorStop(0.4, '#7a4a2a');
            gradCorpo.addColorStop(0.8, '#4a2a0a');
            gradCorpo.addColorStop(1, '#3a1a00');
            ctx.fillStyle = gradCorpo;
            ctx.beginPath();
            ctx.moveTo(-baseW, 2);
            ctx.quadraticCurveTo(-baseW * 0.8, -h * 0.3, -12, -h);
            ctx.lineTo(12, -h);
            ctx.quadraticCurveTo(baseW * 0.8, -h * 0.3, baseW, 2);
            ctx.closePath();
            ctx.fill();

            // Contorno
            ctx.strokeStyle = 'rgba(90,50,20,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Brilho na cratera
            let pulsoCratera = Math.sin(agora / 120) * 0.15 + 0.85;
            let gradCratera = ctx.createRadialGradient(0, -h, 2, 0, -h, 14);
            gradCratera.addColorStop(0, 'rgba(255,120,20,' + pulsoCratera + ')');
            gradCratera.addColorStop(0.5, 'rgba(231,76,60,' + (pulsoCratera * 0.7) + ')');
            gradCratera.addColorStop(1, 'rgba(180,30,0,0)');
            ctx.fillStyle = gradCratera;
            ctx.beginPath();
            ctx.ellipse(0, -h, 14, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Lava escorrendo
            if (v.timer % 8 === 0 && v.lavaEscorrendo.length < 6) {
                let side = Math.random() < 0.5 ? -1 : 1;
                v.lavaEscorrendo.push({
                    x: side * (4 + Math.random() * 6), y: -h + 3,
                    vy: 0.3 + Math.random() * 0.3, life: 30 + Math.random() * 20
                });
            }
            for (let li = v.lavaEscorrendo.length - 1; li >= 0; li--) {
                let lv = v.lavaEscorrendo[li];
                lv.y += lv.vy;
                lv.life--;
                if (lv.life <= 0 || lv.y > 2) { v.lavaEscorrendo.splice(li, 1); continue; }
                ctx.fillStyle = 'rgba(231,76,60,' + (lv.life / 50) + ')';
                ctx.beginPath();
                ctx.arc(lv.x, lv.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Fumaça subindo
            if (v.timer % 6 === 0 && v.fumacas.length < 10) {
                v.fumacas.push({
                    x: (Math.random() - 0.5) * 10, y: -h - 2,
                    vy: -0.5 - Math.random() * 0.8,
                    size: 4 + Math.random() * 6,
                    life: 30 + Math.random() * 20, alpha: 0.4
                });
            }
            for (let fi = v.fumacas.length - 1; fi >= 0; fi--) {
                let fm = v.fumacas[fi];
                fm.y += fm.vy;
                fm.x += (Math.random() - 0.5) * 0.5;
                fm.size += 0.15;
                fm.life--;
                if (fm.life <= 0) { v.fumacas.splice(fi, 1); continue; }
                let a = (fm.life / 50) * fm.alpha;
                ctx.fillStyle = 'rgba(80,80,80,' + a + ')';
                ctx.beginPath();
                ctx.arc(fm.x, fm.y, fm.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Brasas
            if (v.timer % 4 === 0 && v.brasas.length < 12) {
                v.brasas.push({
                    x: (Math.random() - 0.5) * 8, y: -h,
                    vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 2,
                    life: 15 + Math.random() * 15
                });
            }
            for (let bi = v.brasas.length - 1; bi >= 0; bi--) {
                let br = v.brasas[bi];
                br.x += br.vx;
                br.y += br.vy;
                br.vy += 0.05;
                br.life--;
                if (br.life <= 0) { v.brasas.splice(bi, 1); continue; }
                ctx.fillStyle = 'rgba(255,' + Math.floor(100 + Math.random() * 80) + ',20,' + (br.life / 30) + ')';
                ctx.beginPath();
                ctx.arc(br.x, br.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Brilho interno pulsante
            let pulso = Math.sin(agora / 200) * 0.1 + 0.2;
            ctx.fillStyle = 'rgba(255,80,20,' + pulso + ')';
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.4, baseW * 0.4, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pequenas explosões aleatórias na cratera
            if (v.timer % 18 === 0) {
                let expSize = 3 + Math.random() * 4;
                ctx.fillStyle = 'rgba(255,180,40,0.7)';
                ctx.beginPath();
                ctx.arc((Math.random() - 0.5) * 10, -h + (Math.random() - 0.5) * 4, expSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();

        if (Date.now() - v.startTime >= v.duracaoMs) {
            window.vulcoesAtivos.splice(i, 1);
        }
    }
}

// =====================================================================
// INDICADORES DE IMPACTO
// =====================================================================
function desenharIndicadores(ctx, agora) {
    for (let i = window.vulcaoIndicadores.length - 1; i >= 0; i--) {
        let ind = window.vulcaoIndicadores[i];
        ind.timer++;
        let prog = ind.timer / ind.maxTimer;
        let pulso = 1 + Math.sin(agora / (80 - prog * 40)) * (0.05 + prog * 0.12);
        let r = ind.raio * pulso;

        ctx.save();
        ctx.translate(ind.x, ind.y);

        // Preenchimento translúcido
        let corBase = ind.tipo === 'lava' ? '231,76,60' : '241,196,15';
        ctx.fillStyle = 'rgba(' + corBase + ',' + (0.08 + prog * 0.15) + ')';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Círculo externo
        ctx.strokeStyle = 'rgba(' + corBase + ',' + (0.4 + prog * 0.5) + ')';
        ctx.lineWidth = 1.5 + prog * 1.5;
        ctx.stroke();

        // Animação de carregamento (arco crescente)
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + prog * 0.4) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r - 3, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();

        // Brasas no indicador
        if (ind.timer % 5 === 0) {
            let ba = Math.random() * Math.PI * 2;
            let bd = Math.random() * r * 0.8;
            ctx.fillStyle = 'rgba(255,140,20,0.6)';
            ctx.beginPath();
            ctx.arc(Math.cos(ba) * bd, Math.sin(ba) * bd, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        if (ind.timer >= ind.maxTimer + 10) {
            window.vulcaoIndicadores.splice(i, 1);
        }
    }
}

// =====================================================================
// PROJÉTEIS (Bolas de Fogo / Lava)
// =====================================================================
function desenharProjeteis(ctx, agora) {
    for (let i = window.vulcaoProjeteis.length - 1; i >= 0; i--) {
        let p = window.vulcaoProjeteis[i];
        p.progresso += p.velocidade;
        if (p.progresso >= 1) {
            window.vulcaoProjeteis.splice(i, 1);
            continue;
        }

        let t = p.progresso;
        let curX = p.sx + (p.tx - p.sx) * t;
        let arcH = -120 * Math.sin(t * Math.PI);
        let curY = p.sy + (p.ty - p.sy) * t + arcH;

        // Trail
        p.trail.push({ x: curX, y: curY, alpha: 0.7 });
        if (p.trail.length > 12) p.trail.shift();
        for (let ti = 0; ti < p.trail.length; ti++) {
            let tr = p.trail[ti];
            tr.alpha *= 0.88;
            if (tr.alpha < 0.02) continue;
            let corTrail = p.tipo === 'lava' ? '231,76,60' : '241,160,15';
            ctx.fillStyle = 'rgba(' + corTrail + ',' + tr.alpha + ')';
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, 3 * tr.alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        // Brasas no ar
        if (p.progresso > 0.1 && Math.random() < 0.4) {
            ctx.fillStyle = 'rgba(255,' + Math.floor(80 + Math.random() * 100) + ',20,0.5)';
            ctx.beginPath();
            ctx.arc(curX + (Math.random() - 0.5) * 8, curY + (Math.random() - 0.5) * 8, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fumaça no ar
        if (Math.random() < 0.3) {
            ctx.fillStyle = 'rgba(100,100,100,0.2)';
            ctx.beginPath();
            ctx.arc(curX + (Math.random() - 0.5) * 6, curY - 3, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Corpo do projétil
        ctx.save();
        ctx.translate(curX, curY);
        let size = p.tipo === 'lava' ? 7 : 6;
        let gradP = ctx.createRadialGradient(0, 0, 1, 0, 0, size);
        if (p.tipo === 'lava') {
            gradP.addColorStop(0, '#fff');
            gradP.addColorStop(0.3, '#ff6b35');
            gradP.addColorStop(0.7, '#e74c3c');
            gradP.addColorStop(1, 'rgba(180,30,0,0)');
        } else {
            gradP.addColorStop(0, '#fff');
            gradP.addColorStop(0.3, '#f1c40f');
            gradP.addColorStop(0.7, '#e67e22');
            gradP.addColorStop(1, 'rgba(200,100,0,0)');
        }
        ctx.fillStyle = gradP;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Brilho externo
        ctx.fillStyle = p.tipo === 'lava' ? 'rgba(231,76,60,0.2)' : 'rgba(241,196,15,0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, size + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// =====================================================================
// IMPACTOS
// =====================================================================
function desenharImpactos(ctx, agora) {
    for (let i = window.vulcaoImpactos.length - 1; i >= 0; i--) {
        let imp = window.vulcaoImpactos[i];
        imp.timer++;
        let prog = imp.timer / imp.maxTimer;

        ctx.save();
        ctx.translate(imp.x, imp.y);

        // Onda de choque
        if (imp.timer < 15) {
            let ondaR = imp.timer * 4;
            ctx.strokeStyle = 'rgba(255,180,60,' + (1 - imp.timer / 15) * 0.6 + ')';
            ctx.lineWidth = 3 - imp.timer * 0.18;
            ctx.beginPath();
            ctx.arc(0, 0, ondaR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Flash de explosão
        if (imp.timer < 8) {
            let flashR = 20 - imp.timer * 2;
            let gradExp = ctx.createRadialGradient(0, 0, 1, 0, 0, flashR);
            gradExp.addColorStop(0, 'rgba(255,255,200,' + (1 - imp.timer / 8) + ')');
            gradExp.addColorStop(0.4, 'rgba(255,120,20,' + (1 - imp.timer / 8) * 0.8 + ')');
            gradExp.addColorStop(1, 'rgba(200,40,0,0)');
            ctx.fillStyle = gradExp;
            ctx.beginPath();
            ctx.arc(0, 0, flashR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fogo persistente
        if (imp.timer < 25) {
            for (let f = 0; f < 4; f++) {
                let fx = (Math.random() - 0.5) * 24;
                let fy = (Math.random() - 0.5) * 16;
                let fs = 3 + Math.random() * 4;
                ctx.fillStyle = 'rgba(231,76,60,' + (1 - prog) * 0.4 + ')';
                ctx.beginPath();
                ctx.arc(fx, fy, fs, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Fumaça
        if (imp.timer > 5 && imp.timer < 30) {
            for (let s = 0; s < 2; s++) {
                let sx = (Math.random() - 0.5) * 20;
                let sy = -imp.timer * 0.8 - Math.random() * 10;
                ctx.fillStyle = 'rgba(80,80,80,' + (1 - prog) * 0.25 + ')';
                ctx.beginPath();
                ctx.arc(sx, sy, 4 + Math.random() * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Fragmentos
        for (let fi = imp.frags.length - 1; fi >= 0; fi--) {
            let fr = imp.frags[fi];
            fr.x += fr.vx;
            fr.y += fr.vy;
            fr.vy += 0.18;
            fr.life--;
            if (fr.life <= 0) { imp.frags.splice(fi, 1); continue; }
            ctx.fillStyle = fr.cor;
            ctx.globalAlpha = fr.life / 35;
            ctx.fillRect(fr.x - fr.size / 2, fr.y - fr.size / 2, fr.size, fr.size);
            ctx.globalAlpha = 1;
        }

        // Lava no chão
        if (imp.tipo === 'lava' && imp.timer < 20) {
            ctx.fillStyle = 'rgba(200,40,0,' + (1 - prog) * 0.3 + ')';
            ctx.beginPath();
            ctx.ellipse(0, 2, 18, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        if (imp.timer >= imp.maxTimer) {
            window.vulcaoImpactos.splice(i, 1);
        }
    }
}

// =====================================================================
// REAÇÃO CONGELANTE (Fogo + Gelo + Vapor)
// =====================================================================
function desenharReacoesCongelantes(ctx, agora) {
    for (let i = window.reacoesCongelantes.length - 1; i >= 0; i--) {
        let rc = window.reacoesCongelantes[i];
        rc.timer++;
        let prog = rc.timer / rc.maxTimer;

        ctx.save();
        ctx.translate(rc.x, rc.y);

        // Flash inicial
        if (rc.timer < 6) {
            let gradFlash = ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
            gradFlash.addColorStop(0, 'rgba(200,180,255,' + (1 - rc.timer / 6) * 0.7 + ')');
            gradFlash.addColorStop(0.5, 'rgba(100,200,255,' + (1 - rc.timer / 6) * 0.4 + ')');
            gradFlash.addColorStop(1, 'rgba(231,76,60,0)');
            ctx.fillStyle = gradFlash;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Partículas
        for (let pi = rc.parts.length - 1; pi >= 0; pi--) {
            let pt = rc.parts[pi];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.08;
            pt.life--;
            if (pt.life <= 0) { rc.parts.splice(pi, 1); continue; }
            let a = pt.life / 45;
            if (pt.tipo === 'fogo') {
                ctx.fillStyle = 'rgba(231,76,60,' + a + ')';
            } else if (pt.tipo === 'gelo') {
                ctx.fillStyle = 'rgba(100,200,255,' + a + ')';
            } else {
                ctx.fillStyle = 'rgba(220,220,240,' + a * 0.7 + ')';
            }
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (pt.life / 45), 0, Math.PI * 2);
            ctx.fill();
        }

        // Vapor central subindo
        if (rc.timer < 35) {
            for (let v = 0; v < 2; v++) {
                let vx = (Math.random() - 0.5) * 12;
                let vy = -rc.timer * 0.6 - Math.random() * 8;
                ctx.fillStyle = 'rgba(220,230,255,' + (1 - prog) * 0.2 + ')';
                ctx.beginPath();
                ctx.arc(vx, vy, 3 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Gelo rachando (linhas)
        if (rc.timer < 15) {
            for (let c = 0; c < 5; c++) {
                let cAng = (Math.PI * 2 / 5) * c + 0.3;
                let cLen = 6 + rc.timer * 1.2;
                ctx.strokeStyle = 'rgba(150,220,255,' + (1 - rc.timer / 15) * 0.6 + ')';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(cAng) * cLen, Math.sin(cAng) * cLen);
                ctx.stroke();
            }
        }

        ctx.restore();

        if (rc.timer >= rc.maxTimer) {
            window.reacoesCongelantes.splice(i, 1);
        }
    }
}
