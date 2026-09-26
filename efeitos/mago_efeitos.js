// efeitos/mago_efeitos.js — VFX avançados do Mago
// Mantém as APIs públicas existentes e adiciona VFX de Meteoro + Nevasca híbrida.
// IMPORTANTE: este arquivo NÃO altera dano/cooldown/servidor; somente renderização.

window.vulcoesAtivos = window.vulcoesAtivos || [];
window.vulcaoProjeteis = window.vulcaoProjeteis || [];
window.vulcaoImpactos = window.vulcaoImpactos || [];
window.vulcaoIndicadores = window.vulcaoIndicadores || [];
window.queimadurasFx = window.queimadurasFx || [];
window.reacoesCongelantes = window.reacoesCongelantes || [];

// Novos VFX do Mago — preparados para serem acionados pelo evento das skills.
window.meteorosMagoAtivos = window.meteorosMagoAtivos || [];
window.nevascasMagoAtivas = window.nevascasMagoAtivas || [];

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function rgba(hex, alpha) {
    const h = String(hex || '#ffffff').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${clamp01(alpha).toFixed(3)})`;
}

function drawGlowCircle(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(2, r * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawStar4(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(2, r * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.24, y - r * 0.24);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.24, y + r * 0.24);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.24, y + r * 0.24);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.24, y - r * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// =====================================================================
// SKILL 1 — METEORO
// =====================================================================
// Renderização preparada para o evento "action_meteoro".
// O meteoro entra do alto, aquece o chão, deixa rastro de fogo/fumaça,
// ganha brilho atmosférico e termina com impacto + craterização visual.
window.criarMeteoroMago = function(tx, ty, raio) {
    if (typeof window.tocarSonoroProximidade === 'function') window.tocarSonoroProximidade('mago_meteoro_queda', tx, ty);
    else if (typeof window.tocarSonoro === 'function') window.tocarSonoro('mago_meteoro_queda');
    window.meteorosMagoAtivos.push({
        x: tx, y: ty,
        raio: raio || 85,
        timer: 0,
        maxTimer: 52,
        impacto: false,
        particulas: []
    });
};

function desenharMeteorosMago(ctx) {
    for (let i = window.meteorosMagoAtivos.length - 1; i >= 0; i--) {
        const m = window.meteorosMagoAtivos[i];
        m.timer++;

        const pre = Math.min(1, m.timer / 18);
        const impactT = Math.max(0, (m.timer - 34) / 12);
        const desaparecer = m.timer > 42 ? 1 - (m.timer - 42) / 10 : 1;

        ctx.save();

        // Campo térmico e luz projetada no solo.
        const luzR = 24 + pre * 56;
        const heat = ctx.createRadialGradient(m.x, m.y + 10, 2, m.x, m.y + 10, luzR);
        heat.addColorStop(0, rgba('#fff3b0', 0.30 * pre));
        heat.addColorStop(0.35, rgba('#ff9d32', 0.18 * pre));
        heat.addColorStop(0.75, rgba('#ef4f21', 0.07 * pre));
        heat.addColorStop(1, rgba('#ef4f21', 0));
        ctx.fillStyle = heat;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y + 10, luzR, luzR * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Marca circular de impacto prévia.
        ctx.strokeStyle = rgba('#ff8b3d', 0.26 * pre);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y + 10, m.raio * 0.55, m.raio * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (m.timer <= 34) {
            // Trajetória do céu até o alvo.
            const p = m.timer / 34;
            const sx = m.x + 210 - 120 * p;
            const sy = m.y - 290 + 290 * p;
            const meteorX = m.x + 95 * (1 - p);
            const meteorY = m.y - 290 + 290 * p;
            const ang = Math.atan2(meteorY - (m.y - 290), meteorX - m.x);

            // Cauda larga com camadas de fogo.
            for (let t = 0; t < 7; t++) {
                const bx = meteorX - Math.cos(ang) * (t * 9 + 5);
                const by = meteorY - Math.sin(ang) * (t * 9 + 5);
                const a = (1 - t / 8) * 0.22;
                ctx.fillStyle = rgba(t < 2 ? '#fff4c2' : '#ff5b1f', a);
                ctx.shadowColor = t < 2 ? '#fff4c2' : '#ff3d00';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(bx, by, 7 - t * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // Núcleo rochoso incandescente.
            ctx.save();
            ctx.translate(meteorX, meteorY);
            ctx.rotate(ang + Math.PI / 2);
            ctx.shadowColor = '#ff4a16';
            ctx.shadowBlur = 18;
            const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
            g.addColorStop(0, '#fffde1');
            g.addColorStop(0.25, '#ffd166');
            g.addColorStop(0.60, '#ff6b1a');
            g.addColorStop(1, '#8f1f0a');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(-8, 4); ctx.lineTo(-2, -9); ctx.lineTo(8, -5);
            ctx.lineTo(6, 8); ctx.lineTo(-4, 10); ctx.closePath();
            ctx.fill();
            ctx.restore();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // Fagulhas.
            for (let s = 0; s < 4; s++) {
                const a = (s * 1.57) + m.timer * 0.08;
                const dist = 10 + s * 4;
                drawGlowCircle(ctx, meteorX + Math.cos(a) * dist, meteorY + Math.sin(a) * dist,
                    1.3, '#ffbd55', 0.55);
            }

            // Fumaça discreta no caminho.
            for (let s = 0; s < 2; s++) {
                const sy2 = meteorY + 8 + s * 4;
                ctx.fillStyle = rgba('#56525d', 0.12);
                ctx.beginPath();
                ctx.arc(meteorX - s * 7, sy2, 3 + s, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Impacto final: explosão + anéis + fragmentos.
        if (impactT > 0) {
            if (!m.impactoTocado) {
                m.impactoTocado = true;
                if (typeof window.tocarSonoroProximidade === 'function') window.tocarSonoroProximidade('mago_meteoro_impacto', m.x, m.y);
                else if (typeof window.tocarSonoro === 'function') window.tocarSonoro('mago_meteoro_impacto');
            }
            const f = clamp01(impactT);
            const alpha = Math.max(0, desaparecer);

            ctx.globalAlpha = alpha;
            for (let ring = 0; ring < 3; ring++) {
                const rr = 12 + f * (34 + ring * 18);
                ctx.strokeStyle = ring === 0 ? '#fff4c2' : (ring === 1 ? '#ff9e3d' : '#e94c24');
                ctx.lineWidth = 4 - ring * 0.8;
                ctx.shadowColor = ctx.strokeStyle;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.ellipse(m.x, m.y + 10, rr, rr * 0.36, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            const flash = ctx.createRadialGradient(m.x, m.y + 10, 1, m.x, m.y + 10, 45);
            flash.addColorStop(0, '#ffffff');
            flash.addColorStop(0.18, rgba('#ffd66e', 0.85));
            flash.addColorStop(0.55, rgba('#ff6b22', 0.35));
            flash.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = flash;
            ctx.beginPath();
            ctx.arc(m.x, m.y + 10, 45 * (0.7 + f * 0.3), 0, Math.PI * 2);
            ctx.fill();

            for (let p = 0; p < 14; p++) {
                const a = p * (Math.PI * 2 / 14);
                const rr = 10 + f * 46;
                drawGlowCircle(ctx,
                    m.x + Math.cos(a) * rr,
                    m.y + 6 + Math.sin(a) * rr * 0.52,
                    1.5 + (1 - f),
                    p % 3 === 0 ? '#fff3b0' : '#ff7a21',
                    0.75 * alpha
                );
            }

            // Cratera escura.
            ctx.globalAlpha = 0.30 * alpha;
            ctx.fillStyle = '#2a1713';
            ctx.beginPath();
            ctx.ellipse(m.x, m.y + 10, m.raio * 0.48, m.raio * 0.17, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        if (m.timer >= m.maxTimer) window.meteorosMagoAtivos.splice(i, 1);
    }
}

// =====================================================================
// SKILL 2 — NEVASCA HÍBRIDA (GELO + FOGO)
// =====================================================================
// Renderização preparada para "action_nevasca". O código só cria o efeito;
// dano, duração e aplicação do slow continuam no servidor.
window.criarNevascaMago = function(tx, ty, radius, duracao) {
    window.nevascasMagoAtivas.push({
        x: tx, y: ty,
        raio: radius || 115,
        timer: 0,
        duracao: duracao || 480,
        neve: [],
        brasas: []
    });
};

function desenharNevascasMago(ctx) {
    for (let i = window.nevascasMagoAtivas.length - 1; i >= 0; i--) {
        const n = window.nevascasMagoAtivas[i];
        n.timer++;
        const ciclo = n.timer * 0.07;
        const vida = clamp01(1 - Math.max(0, n.timer - n.duracao) / 35);

        ctx.save();

        // Campo de tempestade azul.
        const g = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, n.raio);
        g.addColorStop(0, 'rgba(120,190,255,0.14)');
        g.addColorStop(0.48, 'rgba(70,130,255,0.09)');
        g.addColorStop(0.80, 'rgba(180,220,255,0.05)');
        g.addColorStop(1, 'rgba(100,170,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, n.raio, n.raio * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();

        // Halo de fogo junto ao chão.
        const gf = ctx.createRadialGradient(n.x, n.y + 8, 2, n.x, n.y + 8, n.raio * 0.78);
        gf.addColorStop(0, 'rgba(255,210,90,0.18)');
        gf.addColorStop(0.3, 'rgba(255,90,20,0.11)');
        gf.addColorStop(0.72, 'rgba(220,40,10,0.045)');
        gf.addColorStop(1, 'rgba(150,20,0,0)');
        ctx.fillStyle = gf;
        ctx.beginPath();
        ctx.ellipse(n.x, n.y + 8, n.raio * 0.78, n.raio * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Anel de gelo giratório.
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(ciclo * 0.35);
        ctx.strokeStyle = 'rgba(160,225,255,0.50)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 16]);
        ctx.beginPath();
        ctx.ellipse(0, 0, n.raio * 0.92, n.raio * 0.75, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Queda de cristais de gelo.
        for (let s = 0; s < 10; s++) {
            const a = s * 0.9 + ciclo * (0.7 + s * 0.01);
            const rr = n.raio * (0.15 + 0.75 * ((s * 37) % 10) / 10);
            const x = n.x + Math.cos(a) * rr;
            const y = n.y + Math.sin(a) * rr * 0.78 - ((n.timer * (0.9 + (s % 3) * 0.25) + s * 13) % 34);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a * 1.3);
            ctx.fillStyle = 'rgba(185,235,255,0.78)';
            ctx.shadowColor = '#78d7ff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(0, -4); ctx.lineTo(1.5, -1); ctx.lineTo(0, 4);
            ctx.lineTo(-1.5, -1); ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // TORNADOS DE FOGO NO CHÃO — dois fluxos em espiral.
        for (let side = -1; side <= 1; side += 2) {
            const ox = n.x + side * n.raio * 0.26;
            const oy = n.y + 8;
            for (let q = 0; q < 9; q++) {
                const p = q / 8;
                const ang = ciclo * 2.0 + q * 0.72 + side * 0.7;
                const rr = (6 + p * 16) * (0.85 + 0.12 * Math.sin(ciclo * 3 + q));
                const px = ox + Math.cos(ang) * rr;
                const py = oy - p * 30 + Math.sin(ang * 1.2) * 4;
                const sz = 1.8 + p * 2.2;
                ctx.fillStyle = q % 2 === 0 ? 'rgba(255,145,35,0.68)' : 'rgba(220,48,18,0.52)';
                ctx.shadowColor = '#ff5c1a';
                ctx.shadowBlur = 7;
                ctx.beginPath();
                ctx.arc(px, py, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // Pico do tornado.
            ctx.strokeStyle = 'rgba(255,190,90,0.28)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(ox, oy - 8, 9 + 2 * Math.sin(ciclo), Math.PI * 0.2, Math.PI * 1.75);
            ctx.stroke();
        }

        // Vapor misto gelo/fogo.
        for (let s = 0; s < 4; s++) {
            const px = n.x + Math.sin(ciclo * 0.9 + s * 1.8) * (n.raio * 0.55);
            const py = n.y - 8 - ((n.timer * 0.8 + s * 17) % 28);
            ctx.fillStyle = 'rgba(228,235,255,0.10)';
            ctx.beginPath();
            ctx.arc(px, py, 7 + s, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        if (n.timer >= n.duracao) window.nevascasMagoAtivas.splice(i, 1);
    }
}

// =====================================================================
// VULCÃO
// =====================================================================
window.pedrasEnormesAtivas = window.pedrasEnormesAtivas || [];
window.criarPedraEnorme = function(sx, sy, tx, ty) {
    window.pedrasEnormesAtivas.push({
        sx, sy, tx, ty, progresso: 0, velocidade: 0.05,
        rot: 0, seed: Math.random() * 1000
    });
};

window.desenharPedrasEnormes = function() {
    const ctx = window.ctx;
    if (!ctx) return;
    for (let i = window.pedrasEnormesAtivas.length - 1; i >= 0; i--) {
        const p = window.pedrasEnormesAtivas[i];
        p.progresso += p.velocidade;
        p.rot += 0.2;
        if (p.progresso >= 1) {
            window.pedrasEnormesAtivas.splice(i, 1);
            if (typeof window.tremorTela !== 'undefined') window.tremorTela = 6;
            continue;
        }
        const t = p.progresso;
        const curX = p.sx + (p.tx - p.sx) * t;
        const curY = p.sy + (p.ty - p.sy) * t - 100 * Math.sin(t * Math.PI);
        ctx.save();
        ctx.translate(curX, curY);
        ctx.rotate(p.rot);
        const rg = ctx.createLinearGradient(-12, -14, 12, 12);
        rg.addColorStop(0, '#8a6547');
        rg.addColorStop(0.5, '#5e422f');
        rg.addColorStop(1, '#2f2118');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(-12, -10); ctx.lineTo(-1, -16); ctx.lineTo(13, -7);
        ctx.lineTo(10, 8); ctx.lineTo(-7, 14); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2a1c14';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
};

window.criarAnimacaoVulcao = function(tx, ty, radius, duracao) {
    const rachaduras = [];
    for (let i = 0; i < 16; i++) {
        const ang = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.35;
        rachaduras.push({
            ang,
            comp: 20 + Math.random() * 40,
            largura: 1 + Math.random() * 2,
            delay: Math.random() * 15
        });
    }

    const pedras = [];
    for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2;
        const d = 8 + Math.random() * 24;
        pedras.push({
            x: Math.cos(ang) * d,
            y: Math.sin(ang) * d,
            vx: (Math.random() - 0.5) * 2.4,
            vy: -2.2 - Math.random() * 4.8,
            size: 2 + Math.random() * 4,
            life: 34 + Math.random() * 24
        });
    }

    window.vulcoesAtivos.push({
        x: tx, y: ty, radius: radius || 140,
        fase: 'emergindo', timer: 0,
        startTime: Date.now(), duracaoMs: (duracao || 200) * 50,
        emergirDuracao: 40,
        rachaduras, pedras,
        altura: 0, alturaMax: 48,
        fumacas: [], brasas: [], lavaEscorrendo: [],
        ondas: []
    });
};

window.criarVulcaoProjetil = function(vx, vy, tx, ty, tipo, id) {
    window.vulcaoIndicadores.push({
        x: tx, y: ty, timer: 0, maxTimer: 50,
        raio: 40, tipo, id
    });

    window.vulcaoProjeteis.push({
        id, sx: vx, sy: vy - 40,
        tx, ty, tipo,
        progresso: 0, velocidade: 0.04,
        trail: [], brasas: []
    });
};

window.criarVulcaoImpacto = function(tx, ty, tipo, id) {
    for (let i = window.vulcaoIndicadores.length - 1; i >= 0; i--) {
        if (window.vulcaoIndicadores[i].id === id) {
            window.vulcaoIndicadores.splice(i, 1);
            break;
        }
    }

    const frags = [];
    for (let i = 0; i < 26; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 1.7 + Math.random() * 5.2;
        frags.push({
            x: 0, y: 0,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 2.2,
            size: 2 + Math.random() * 4,
            life: 24 + Math.random() * 18,
            cor: tipo === 'lava' ? '#ff5426' : '#ffad32'
        });
    }

    window.vulcaoImpactos.push({
        x: tx, y: ty, tipo, timer: 0, maxTimer: 40,
        frags, ondaChoque: 0
    });

    if (typeof window.tremorTela !== 'undefined') window.tremorTela = 6;
};

// =====================================================================
// REAÇÃO CONGELANTE
// =====================================================================
window.criarReacaoCongelante = function(x, y) {
    const parts = [];
    for (let i = 0; i < 26; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 1 + Math.random() * 3.8;
        const tipo = Math.random() < 0.34 ? 'fogo' : (Math.random() < 0.52 ? 'gelo' : 'vapor');
        parts.push({
            x: 0, y: 0,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 1.8,
            life: 28 + Math.random() * 22,
            tipo,
            size: 2 + Math.random() * 3.5
        });
    }
    window.reacoesCongelantes.push({
        x, y, timer: 0, maxTimer: 50, parts,
        rot: 0
    });
};

// =====================================================================
// DESENHAR TODOS OS EFEITOS DO MAGO
// =====================================================================
window.desenharEfeitosMago = function() {
    const ctx = window.ctx;
    if (!ctx) return;
    const agora = Date.now();

    ctx.save();
    try {
        desenharMeteorosMago(ctx);
        desenharNevascasMago(ctx);

        desenharVulcoes(ctx, agora);
        desenharIndicadores(ctx, agora);
        desenharProjeteis(ctx, agora);
        desenharImpactos(ctx, agora);
        desenharReacoesCongelantes(ctx, agora);

        // Mantém a API anterior caso algum sistema externo use a função.
        if (typeof window.desenharPedrasEnormes === 'function') {
            window.desenharPedrasEnormes();
        }
    } finally {
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }
};

// =====================================================================
// VULCÃO PRINCIPAL — versão mais realista
// =====================================================================
function desenharVulcoes(ctx, agora) {
    for (let i = window.vulcoesAtivos.length - 1; i >= 0; i--) {
        const v = window.vulcoesAtivos[i];
        v.timer++;

        const progEmergir = Math.min(1, v.timer / v.emergirDuracao);
        const easeEmergir = 1 - Math.pow(1 - progEmergir, 3);
        const h = v.alturaMax * easeEmergir;
        v.altura = h;

        ctx.save();
        ctx.translate(v.x, v.y);

        // Luz quente sobre o chão.
        const heat = ctx.createRadialGradient(0, 7, 2, 0, 7, v.radius * 0.72);
        heat.addColorStop(0, 'rgba(255,170,55,0.15)');
        heat.addColorStop(0.4, 'rgba(230,60,20,0.08)');
        heat.addColorStop(1, 'rgba(150,20,0,0)');
        ctx.fillStyle = heat;
        ctx.beginPath();
        ctx.ellipse(0, 7, v.radius * 0.72, v.radius * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fissuras do terreno.
        if (v.timer < v.emergirDuracao) {
            const brilhoRach = Math.min(1, v.timer / 15);
            for (let r = 0; r < v.rachaduras.length; r++) {
                const rach = v.rachaduras[r];
                if (v.timer < rach.delay) continue;
                const progR = Math.min(1, (v.timer - rach.delay) / 12);

                ctx.save();
                ctx.rotate(rach.ang);
                ctx.beginPath();
                ctx.moveTo(5, 0);
                ctx.lineTo(5 + rach.comp * progR, Math.sin(r * 2.1) * 1.8);
                ctx.strokeStyle = 'rgba(255,86,28,' + (0.55 + brilhoRach * 0.45) + ')';
                ctx.lineWidth = rach.largura * progR;
                ctx.shadowColor = '#ff4d18';
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.restore();
            }

            for (let p = 0; p < v.pedras.length; p++) {
                const pd = v.pedras[p];
                if (pd.life <= 0) continue;
                pd.x += pd.vx * 0.34;
                pd.y += pd.vy * 0.34;
                pd.vy += 0.17;
                pd.life--;

                ctx.fillStyle = 'rgba(111,76,50,' + (pd.life / 58) + ')';
                ctx.beginPath();
                ctx.rect(pd.x - pd.size / 2, pd.y - pd.size / 2, pd.size, pd.size);
                ctx.fill();
            }
        }

        if (progEmergir > 0.15) {
            const baseW = 34 + h * 0.78;

            // Sombra e base.
            ctx.fillStyle = 'rgba(0,0,0,0.34)';
            ctx.beginPath();
            ctx.ellipse(0, 6, baseW + 12, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            // Corpo vulcânico com camadas rochosas.
            const corpo = ctx.createLinearGradient(-baseW, 0, baseW, -h);
            corpo.addColorStop(0, '#2b211c');
            corpo.addColorStop(0.18, '#50382a');
            corpo.addColorStop(0.42, '#755039');
            corpo.addColorStop(0.72, '#402a20');
            corpo.addColorStop(1, '#201611');
            ctx.fillStyle = corpo;
            ctx.beginPath();
            ctx.moveTo(-baseW, 3);
            ctx.quadraticCurveTo(-baseW * 0.88, -h * 0.18, -baseW * 0.48, -h * 0.44);
            ctx.quadraticCurveTo(-baseW * 0.22, -h * 0.70, -14, -h);
            ctx.quadraticCurveTo(0, -h - 4, 14, -h);
            ctx.quadraticCurveTo(baseW * 0.22, -h * 0.70, baseW * 0.48, -h * 0.44);
            ctx.quadraticCurveTo(baseW * 0.88, -h * 0.18, baseW, 3);
            ctx.closePath();
            ctx.fill();

            // Estratos/rochas laterais.
            ctx.strokeStyle = 'rgba(40,25,18,0.72)';
            ctx.lineWidth = 1.4;
            for (let q = 0; q < 7; q++) {
                const yy = 2 - h * (0.12 + q * 0.11);
                ctx.beginPath();
                ctx.moveTo(-baseW * (0.8 - q * 0.055), yy);
                ctx.quadraticCurveTo(0, yy + Math.sin(q) * 2.2, baseW * (0.8 - q * 0.055), yy + 1.5);
                ctx.stroke();
            }

            // Veios de lava.
            for (let side = -1; side <= 1; side += 2) {
                const x0 = side * 5;
                const topY = -h + 2;
                ctx.strokeStyle = 'rgba(255,85,18,0.80)';
                ctx.lineWidth = 2.2;
                ctx.shadowColor = '#ff4d18';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(x0, topY + 2);
                ctx.quadraticCurveTo(side * 9, -h * 0.50, side * (17 + h * 0.08), 1);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(255,188,70,0.35)';
                ctx.lineWidth = 0.9;
                ctx.shadowBlur = 0;
                ctx.stroke();
            }

            // Borda da cratera.
            ctx.fillStyle = '#1b120f';
            ctx.beginPath();
            ctx.ellipse(0, -h + 2, 18, 7.5, 0, 0, Math.PI * 2);
            ctx.fill();

            const craterPulse = 0.82 + Math.sin(agora / 120) * 0.18;
            const crater = ctx.createRadialGradient(0, -h, 1, 0, -h, 18);
            crater.addColorStop(0, 'rgba(255,250,198,' + craterPulse + ')');
            crater.addColorStop(0.24, 'rgba(255,166,55,' + (craterPulse * 0.95) + ')');
            crater.addColorStop(0.62, 'rgba(237,55,10,' + (craterPulse * 0.72) + ')');
            crater.addColorStop(1, 'rgba(130,20,0,0)');
            ctx.fillStyle = crater;
            ctx.beginPath();
            ctx.ellipse(0, -h, 18, 7.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Lava escorrendo.
            if (v.timer % 6 === 0 && v.lavaEscorrendo.length < 10) {
                const side = Math.random() < 0.5 ? -1 : 1;
                v.lavaEscorrendo.push({
                    x: side * (2 + Math.random() * 8),
                    y: -h + 4,
                    vy: 0.34 + Math.random() * 0.34,
                    life: 34 + Math.random() * 26
                });
            }
            for (let li = v.lavaEscorrendo.length - 1; li >= 0; li--) {
                const lv = v.lavaEscorrendo[li];
                lv.y += lv.vy;
                lv.life--;
                if (lv.life <= 0 || lv.y > 4) {
                    v.lavaEscorrendo.splice(li, 1);
                    continue;
                }
                const a = lv.life / 60;
                ctx.fillStyle = 'rgba(255,85,16,' + a.toFixed(3) + ')';
                ctx.shadowColor = '#ff4d18';
                ctx.shadowBlur = 7;
                ctx.beginPath();
                ctx.arc(lv.x, lv.y, 2.1, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // Coluna de fumaça mais volumosa.
            if (v.timer % 5 === 0 && v.fumacas.length < 16) {
                v.fumacas.push({
                    x: (Math.random() - 0.5) * 16,
                    y: -h - 2,
                    vx: (Math.random() - 0.5) * 0.45,
                    vy: -0.55 - Math.random() * 0.85,
                    size: 5 + Math.random() * 7,
                    life: 42 + Math.random() * 28,
                    alpha: 0.35
                });
            }
            for (let fi = v.fumacas.length - 1; fi >= 0; fi--) {
                const fm = v.fumacas[fi];
                fm.x += fm.vx + Math.sin(agora / 420 + fi) * 0.08;
                fm.y += fm.vy;
                fm.size += 0.18;
                fm.life--;
                if (fm.life <= 0) {
                    v.fumacas.splice(fi, 1);
                    continue;
                }
                const a = (fm.life / 70) * fm.alpha;
                ctx.fillStyle = 'rgba(67,62,61,' + a.toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(fm.x, fm.y, fm.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Brasas e mini erupções.
            if (v.timer % 3 === 0 && v.brasas.length < 20) {
                v.brasas.push({
                    x: (Math.random() - 0.5) * 10,
                    y: -h + 2,
                    vx: (Math.random() - 0.5) * 1.6,
                    vy: -1.3 - Math.random() * 2.4,
                    life: 18 + Math.random() * 20
                });
            }
            for (let bi = v.brasas.length - 1; bi >= 0; bi--) {
                const br = v.brasas[bi];
                br.x += br.vx;
                br.y += br.vy;
                br.vy += 0.06;
                br.life--;
                if (br.life <= 0) {
                    v.brasas.splice(bi, 1);
                    continue;
                }
                ctx.fillStyle = 'rgba(255,' + Math.floor(105 + Math.random() * 100) + ',25,' + (br.life / 38) + ')';
                ctx.shadowColor = '#ff5b1a';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(br.x, br.y, 1.5 + Math.random(), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // Pequena erupção de lava a cada ciclo.
            if (v.timer % 22 === 0) {
                const burst = 5 + Math.random() * 4;
                ctx.fillStyle = 'rgba(255,192,72,0.8)';
                ctx.shadowColor = '#ff5b1a';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc((Math.random() - 0.5) * 9, -h + 1, burst, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
            }
        }

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        if (Date.now() - v.startTime >= v.duracaoMs) {
            window.vulcoesAtivos.splice(i, 1);
        }
    }
}

function desenharIndicadores(ctx, agora) {
    for (let i = window.vulcaoIndicadores.length - 1; i >= 0; i--) {
        const ind = window.vulcaoIndicadores[i];
        ind.timer++;
        const prog = ind.timer / ind.maxTimer;
        const pulso = 1 + Math.sin(agora / 90) * 0.08;
        const r = ind.raio * pulso;

        ctx.save();
        ctx.translate(ind.x, ind.y);

        const cor = ind.tipo === 'lava' ? '255,90,20' : '245,190,50';

        ctx.fillStyle = 'rgba(' + cor + ',' + (0.07 + prog * 0.12) + ')';
        ctx.beginPath();
        ctx.ellipse(0, 9, r, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(' + cor + ',' + (0.38 + prog * 0.5) + ')';
        ctx.lineWidth = 1.7 + prog;
        ctx.beginPath();
        ctx.ellipse(0, 9, r, r * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,225,' + (0.28 + prog * 0.45) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 9, r - 3, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        if (ind.timer >= ind.maxTimer + 10) window.vulcaoIndicadores.splice(i, 1);
    }
}

function desenharProjeteis(ctx, agora) {
    ctx.save();
    try {
        for (let i = window.vulcaoProjeteis.length - 1; i >= 0; i--) {
            const p = window.vulcaoProjeteis[i];
            p.progresso += p.velocidade;
            if (p.progresso >= 1) {
                window.vulcaoProjeteis.splice(i, 1);
                continue;
            }

            const t = p.progresso;
            const curX = p.sx + (p.tx - p.sx) * t;
            const curY = p.sy + (p.ty - p.sy) * t - 115 * Math.sin(t * Math.PI);
            const cor = p.tipo === 'lava' ? '#ff4b1d' : '#f7a521';

            ctx.save();

            p.trail.push({ x: curX, y: curY, alpha: 0.78 });
            if (p.trail.length > 16) p.trail.shift();

            // Rastro de fogo fluido e otimizado (sem o peso de shadowBlur repetitivo)
            for (let ti = 0; ti < p.trail.length; ti++) {
                const tr = p.trail[ti];
                tr.alpha *= 0.89;
                if (tr.alpha < 0.03) continue;
                const size = Math.max(1, 4.5 - ti * 0.18);

                // Halo externo suave
                ctx.fillStyle = rgba(cor, tr.alpha * 0.28);
                ctx.beginPath();
                ctx.arc(tr.x, tr.y, size * 1.8, 0, Math.PI * 2);
                ctx.fill();

                // Núcleo incandescente
                ctx.fillStyle = rgba(cor, tr.alpha * 0.85);
                ctx.beginPath();
                ctx.arc(tr.x, tr.y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Fagulhas leves
            for (let s = 0; s < 3; s++) {
                if (Math.random() < 0.65) {
                    ctx.fillStyle = rgba('#ffb84a', 0.55);
                    ctx.beginPath();
                    ctx.arc(curX + (Math.random() - 0.5) * 10, curY + (Math.random() - 0.5) * 10,
                        1.1 + Math.random() * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Corpo principal da bola de fogo (com degradê radial eficiente)
            ctx.save();
            ctx.translate(curX, curY);
            const ang = Math.atan2(p.ty - p.sy, p.tx - p.sx);
            ctx.rotate(ang);

            const size = p.tipo === 'lava' ? 9 : 8;

            // Halo luminoso externo em degradê (substitui o shadowBlur=20 mantendo visual brilhante a 60 FPS)
            const haloExterno = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size * 2.2);
            haloExterno.addColorStop(0, rgba(cor, 0.45));
            haloExterno.addColorStop(0.5, rgba(cor, 0.15));
            haloExterno.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = haloExterno;
            ctx.beginPath();
            ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo esférico
            const gp = ctx.createRadialGradient(0, 0, 1, 0, 0, size);
            gp.addColorStop(0, '#fffde5');
            gp.addColorStop(0.24, '#ffd36c');
            gp.addColorStop(0.55, cor);
            gp.addColorStop(1, 'rgba(100,10,0,0)');
            ctx.fillStyle = gp;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();

            // Rocha magmática escura no centro
            ctx.fillStyle = '#3a2218';
            ctx.beginPath();
            ctx.moveTo(-4, -3); ctx.lineTo(3, -5); ctx.lineTo(6, 0);
            ctx.lineTo(2, 5); ctx.lineTo(-5, 3); ctx.closePath();
            ctx.fill();

            ctx.restore(); // Restaura corpo
            ctx.restore(); // Restaura projétil
        }
    } finally {
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }
}

function desenharImpactos(ctx, agora) {
    for (let i = window.vulcaoImpactos.length - 1; i >= 0; i--) {
        const imp = window.vulcaoImpactos[i];
        imp.timer++;
        const prog = imp.timer / imp.maxTimer;

        ctx.save();
        ctx.translate(imp.x, imp.y);

        if (imp.timer < 18) {
            const ondaR = imp.timer * 4.8;
            ctx.strokeStyle = 'rgba(255,184,85,' + (1 - imp.timer / 18) * 0.7 + ')';
            ctx.lineWidth = 3.5 - imp.timer * 0.12;
            ctx.shadowColor = '#ff6b1e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.ellipse(0, 8, ondaR, ondaR * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (imp.timer < 10) {
            const flashR = 30 - imp.timer * 2.2;
            const ge = ctx.createRadialGradient(0, 8, 1, 0, 8, flashR);
            ge.addColorStop(0, 'rgba(255,255,220,' + (1 - imp.timer / 10) + ')');
            ge.addColorStop(0.35, 'rgba(255,125,25,' + (1 - imp.timer / 10) * 0.9 + ')');
            ge.addColorStop(1, 'rgba(200,35,0,0)');
            ctx.fillStyle = ge;
            ctx.beginPath();
            ctx.arc(0, 8, flashR, 0, Math.PI * 2);
            ctx.fill();
        }

        if (imp.timer < 28) {
            for (let f = 0; f < 6; f++) {
                const fx = (Math.random() - 0.5) * 28;
                const fy = (Math.random() - 0.5) * 18;
                ctx.fillStyle = 'rgba(255,106,20,' + (1 - prog) * 0.5 + ')';
                ctx.shadowColor = '#ff5517';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(fx, fy + 6, 2.5 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }

        for (let fi = imp.frags.length - 1; fi >= 0; fi--) {
            const fr = imp.frags[fi];
            fr.x += fr.vx;
            fr.y += fr.vy;
            fr.vy += 0.20;
            fr.life--;

            if (fr.life <= 0) {
                imp.frags.splice(fi, 1);
                continue;
            }

            ctx.globalAlpha = fr.life / 42;
            ctx.fillStyle = fr.cor;
            ctx.beginPath();
            ctx.rect(fr.x - fr.size / 2, fr.y - fr.size / 2 + 5, fr.size, fr.size);
            ctx.fill();
        }

        if (imp.tipo === 'lava' && imp.timer < 26) {
            const lava = ctx.createRadialGradient(0, 8, 1, 0, 8, 22);
            lava.addColorStop(0, 'rgba(255,215,85,0.35)');
            lava.addColorStop(0.4, 'rgba(240,65,18,0.24)');
            lava.addColorStop(1, 'rgba(160,20,0,0)');
            ctx.fillStyle = lava;
            ctx.beginPath();
            ctx.ellipse(0, 9, 22, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        if (imp.timer >= imp.maxTimer) window.vulcaoImpactos.splice(i, 1);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

function desenharReacoesCongelantes(ctx, agora) {
    for (let i = window.reacoesCongelantes.length - 1; i >= 0; i--) {
        const rc = window.reacoesCongelantes[i];
        rc.timer++;
        rc.rot += 0.08;
        const prog = rc.timer / rc.maxTimer;

        ctx.save();
        ctx.translate(rc.x, rc.y);

        // Flash híbrido.
        if (rc.timer < 10) {
            const gf = ctx.createRadialGradient(0, 0, 1, 0, 0, 32);
            gf.addColorStop(0, 'rgba(255,255,255,' + (1 - rc.timer / 10) * 0.82 + ')');
            gf.addColorStop(0.35, 'rgba(120,205,255,' + (1 - rc.timer / 10) * 0.42 + ')');
            gf.addColorStop(0.65, 'rgba(255,110,35,' + (1 - rc.timer / 10) * 0.30 + ')');
            gf.addColorStop(1, 'rgba(120,40,255,0)');
            ctx.fillStyle = gf;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dois anéis contraditórios: gelo e fogo.
        for (let q = 0; q < 2; q++) {
            ctx.strokeStyle = q === 0
                ? 'rgba(145,225,255,' + (1 - prog) * 0.65 + ')'
                : 'rgba(255,95,28,' + (1 - prog) * 0.55 + ')';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, 9 + rc.timer * (1.6 + q * 0.8), rc.rot + q, rc.rot + q + Math.PI * 1.4);
            ctx.stroke();
        }

        for (let pi = rc.parts.length - 1; pi >= 0; pi--) {
            const pt = rc.parts[pi];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.09;
            pt.life--;

            if (pt.life <= 0) {
                rc.parts.splice(pi, 1);
                continue;
            }

            const a = pt.life / 50;
            ctx.shadowBlur = 7;
            if (pt.tipo === 'fogo') {
                ctx.fillStyle = 'rgba(255,100,25,' + a + ')';
                ctx.shadowColor = '#ff4d18';
            } else if (pt.tipo === 'gelo') {
                ctx.fillStyle = 'rgba(130,215,255,' + a + ')';
                ctx.shadowColor = '#78d7ff';
            } else {
                ctx.fillStyle = 'rgba(225,235,255,' + (a * 0.72) + ')';
                ctx.shadowColor = '#dfefff';
            }

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (pt.life / 50), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        if (rc.timer >= rc.maxTimer) window.reacoesCongelantes.splice(i, 1);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
};

// =====================================================================
// BRIDGE OPCIONAL DE EVENTOS
// =====================================================================
// O arquivo enviado não contém o dispatcher que recebe "action_meteoro"
// e "action_nevasca". Para permitir integração simples sem alterar o
// servidor, estas funções públicas podem ser chamadas pelo dispatcher:
//
// action_meteoro -> window.iniciarVisualMago({type:'action_meteoro', targetX, targetY})
// action_nevasca -> window.iniciarVisualMago({type:'action_nevasca', targetX, targetY, radius})
// action_vulcao -> window.iniciarVisualMago({type:'action_vulcao', targetX, targetY, radius, duracao})
window.iniciarVisualMago = function(data) {
    if (!data || !data.type) return false;

    if (data.type === 'action_meteoro') {
        window.criarMeteoroMago(data.targetX, data.targetY, data.radius || 85);
        return true;
    }

    if (data.type === 'action_nevasca') {
        window.criarNevascaMago(data.targetX, data.targetY, data.radius || 115, data.duracao || 480);
        return true;
    }

    if (data.type === 'action_vulcao') {
        window.criarAnimacaoVulcao(data.targetX, data.targetY, data.radius || 140, data.duracao || 200);
        return true;
    }

    return false;
};
