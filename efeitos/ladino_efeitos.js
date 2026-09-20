// efeitos/ladino_efeitos.js - Efeitos visuais do Ladino (otimizados p/ mobile)
// Padrões do projeto: partículas de vida curta em arrays globais, SEM timers
// individuais, desenho por frame no loop principal (window.desenharEfeitosLadino()).
// Nada aqui é autoritativo — o servidor manda 'action_ladino_*' e world_update.

// ===== ESTADO GLOBAL DOS EFEITOS =====
window.ladinoCortes = [];        // cortes da adaga (ataque básico)
window.ladinoRastros = [];       // rastros sombrios da Dança das Adagas
window.ladinoBombasVoo = [];     // bombas em arco no ar
window.ladinoGasPuffs = [];      // puffs de veneno (dano/explosão da névoa)
window.ladinoFumaças = [];       // fumaça roxa da camuflagem/invisibilidade
window.ladinoEstrelaVisual = null; // estrela desenhada no chão { cx, cy, raio, pontos[], vida }
window.ladinoFlashes = [];       // flashes/faíscas nos vértices e cortes
window.ladinoOndas = [];         // ondas de choque (impacto central da estrela)
window.ladinoSangues = [];       // partículas de sangue (passiva Lâminas Sangrentas)
window.ladinoQueda = null;       // { x, y, vida } rastro de queda vertical

// ===== PARTÍCULA GENÉRICA (reúso para tudo, sem timers) =====
function ladinoPush(lista, p) {
    if (!Array.isArray(window[lista])) window[lista] = [];
    if (window[lista].length < 220) window[lista].push(p); // pool/limite p/ mobile
}

// ===== ATAQUE BÁSICO: CORTE DA ADAGA (arco + faísca) =====
window.criarAnimacaoAdagaBasica = function(x, y, ang) {
    if (x === undefined || y === undefined) return;
    ladinoPush('ladinoCortes', {
        x: x, y: y, ang: ang || 0,
        raio: 14, vida: 0.16, alpha: 1.0, vivo: 1
    });
    // Faísca rápida na ponta da lâmina
    for (let i = 0; i < 3; i++) {
        ladinoPush('ladinoFlashes', {
            x: x + Math.cos(ang || 0) * 18,
            y: y + Math.sin(ang || 0) * 18,
            vx: (Math.random() - 0.5) * 1.6,
            vy: (Math.random() - 0.5) * 1.6,
            alpha: 1.0, vida: 0.22, tamanho: 1.6, cor: '#e67e22'
        });
    }
};

// ===== DANÇA DAS ADAGAS: rastro sombrio (afterimage) =====
window.criarRastroLadino = function(x, y) {
    if (x === undefined || y === undefined) return;
    ladinoPush('ladinoRastros', {
        x: x, y: y, alpha: 0.7, vida: 0.4, cor: '#8e44ad'
    });
};

// ===== NÉVOA VENENOSA: bomba em arco + puff de explosão + puffs de dano =====
window.criarBombaVoo = function(origemX, origemY, alvoX, alvoY) {
    const d = Math.hypot(alvoX - origemX, alvoY - origemY) || 1;
    ladinoPush('ladinoBombasVoo', {
        x: origemX, y: origemY,
        alvoX: alvoX, alvoY: alvoY,
        vx: (alvoX - origemX) / 20, // chegada em ~20 frames
        vy: (alvoY - origemY) / 20,
        altura: Math.max(14, d * 0.22), // arco
        prog: 0, vida: 0.42, giro: 0
    });
};

window.criarPuffVeneno = function(x, y, raio, forte) {
    const n = Math.max(4, Math.floor((raio || 40) / 8));
    for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 0.3 + Math.random() * (forte ? 1.4 : 0.7);
        ladinoPush('ladinoGasPuffs', {
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 0.5,
            alpha: 0.75, vida: forte ? 0.8 : 0.5,
            tamanho: 5 + Math.random() * 8, cor: '#27ae60'
        });
    }
};

// ===== CAMUFLAGEM SOMBRIA: fumaça roxa (fade-in/out) =====
window.criarFumacaLadino = function(x, y, n, cor) {
    for (let i = 0; i < (n || 8); i++) {
        const ang = Math.random() * Math.PI * 2;
        ladinoPush('ladinoFumaças', {
            x: x + (Math.random() - 0.5) * 22,
            y: y + (Math.random() - 0.5) * 22,
            vx: Math.cos(ang) * 0.5,
            vy: Math.sin(ang) * 0.5 - 0.8,
            alpha: 0.6, vida: 0.9, tamanho: 4 + Math.random() * 7,
            cor: cor || '#9b59b6'
        });
    }
};

// ===== ESTRELA DA MORTE (visual no chão + eventos) =====
// Vida acompanha a coreografia mais lenta (~2s de vértices + salto/queda).
window.criarEstrelaLadino = function(cx, cy, raio, pontos) {
    window.ladinoEstrelaVisual = {
        cx: cx, cy: cy, raio: raio || 120,
        pontos: pontos || [],
        vida: 4.2, alpha: 0.9,
        giro: Math.random() * Math.PI * 2
    };
};

window.criarFlashLadino = function(x, y, cor, n) {
    for (let i = 0; i < (n || 5); i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 0.6 + Math.random() * 1.8;
        ladinoPush('ladinoFlashes', {
            x: x, y: y,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel,
            alpha: 1.0, vida: 0.3, tamanho: 1.8, cor: cor || '#9b59b6'
        });
    }
};

window.criarOndaImpacto = function(x, y, raio) {
    ladinoPush('ladinoOndas', {
        x: x, y: y, raio: 10, raioMax: (raio || 90), alpha: 0.9, vida: 0.6
    });
    // Poeira do impacto
    for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        ladinoPush('ladinoFumaças', {
            x: x + Math.cos(ang) * (raio || 45),
            y: y + Math.sin(ang) * (raio || 45),
            vx: Math.cos(ang) * 1.2, vy: Math.sin(ang) * 1.2 - 1.0,
            alpha: 0.5, vida: 0.7, tamanho: 5 + Math.random() * 6, cor: '#bdc3c7'
        });
    }
};

// ===== PASSIVA LÂMINAS SANGRENTAS: sangue =====
window.criarSangueLadino = function(x, y) {
    const n = 5;
    for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const vel = 0.8 + Math.random() * 1.6;
        ladinoPush('ladinoSangues', {
            x: x + (Math.random() - 0.5) * 12,
            y: y + (Math.random() - 0.5) * 12,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel,
            alpha: 0.9, vida: 0.5, tamanho: 1.8 + Math.random() * 2.2
        });
    }
};

// ===== DESENHO POR FRAME (chamado no loop principal) =====
window.desenharEfeitosLadino = function() {
    if (!window.ctx) return;
    const ctx = window.ctx;
    const dt = 0.016; // passo fixo aproximado por frame

    // --- Zonas de gás venenoso (Névoa Venenosa — autoridade do servidor) ---
    let gases = window.gasesVeneno || [];
    for (let gi = 0; gi < gases.length; gi++) {
        const gz = gases[gi];
        if (!gz || typeof gz.x !== 'number' || typeof gz.y !== 'number') continue;
        // Fade: entra (~0,5s) e some no fim (~0,5s) usando o tempo restante do servidor
        const fade = Math.max(0, Math.min(1, Math.min(gz.tempo, 10) / 10));
        if (fade <= 0) continue;
        // Nuvem base em 3 camadas translúcidas (volume suave, sem gradiente pesado)
        ctx.save();
        ctx.globalAlpha = 0.14 * fade;
        ctx.fillStyle = '#27ae60';
        ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.raio, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.20 * fade;
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath(); ctx.arc(gz.x + gz.raio * 0.15, gz.y - gz.raio * 0.1, gz.raio * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.16 * fade;
        ctx.fillStyle = '#145a32';
        ctx.beginPath(); ctx.arc(gz.x - gz.raio * 0.2, gz.y + gz.raio * 0.15, gz.raio * 0.46, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Borda tracejada delimitando a área da cegueira
        ctx.save();
        ctx.globalAlpha = 0.45 * fade;
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 7]);
        ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.raio, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // Bolhas ocasionais subindo (pool limitado, sem timers)
        if (Math.random() < 0.12 && (window.ladinoGasPuffs || []).length < 110) {
            const ba = Math.random() * Math.PI * 2;
            const bd = Math.random() * gz.raio * 0.85;
            ladinoPush('ladinoGasPuffs', {
                x: gz.x + Math.cos(ba) * bd,
                y: gz.y + Math.sin(ba) * bd,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.4 - Math.random() * 0.4,
                alpha: 0.5, vida: 0.8, tamanho: 4 + Math.random() * 6, cor: '#1e8449'
            });
        }
    }

    // --- Rastro da queda da Estrela da Morte (risco vertical rápido) ---
    if (window.ladinoQueda) {
        const q = window.ladinoQueda;
        q.vida -= dt * 1.4;
        if (q.vida <= 0) { window.ladinoQueda = null; }
        else {
            ctx.save();
            ctx.globalAlpha = q.vida * 0.7;
            ctx.strokeStyle = '#c39bd3';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(q.x, q.y - 96);
            ctx.lineTo(q.x, q.y - 10);
            ctx.stroke();
            ctx.restore();
        }
    }

    // --- Cortes da adaga (arco translúcido) ---
    for (let i = window.ladinoCortes.length - 1; i >= 0; i--) {
        const c = window.ladinoCortes[i];
        c.vida -= dt; c.alpha -= dt * 5;
        if (c.vida <= 0 || c.alpha <= 0) { window.ladinoCortes.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, c.alpha) * 0.8;
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.raio, c.ang - 0.9, c.ang + 0.5);
        ctx.stroke();
        ctx.strokeStyle = '#8e44ad';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.raio * 0.7, c.ang - 0.5, c.ang + 0.3);
        ctx.stroke();
        ctx.restore();
    }

    // --- Rastros da dança (afterimages roxos) ---
    for (let i = window.ladinoRastros.length - 1; i >= 0; i--) {
        const r = window.ladinoRastros[i];
        r.vida -= dt; r.alpha -= dt * 1.8;
        if (r.vida <= 0 || r.alpha <= 0) { window.ladinoRastros.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha) * 0.35;
        ctx.fillStyle = r.cor;
        ctx.beginPath();
        ctx.ellipse(r.x + 6, r.y + 8, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Bombas em voo (arco parabólico) ---
    for (let i = window.ladinoBombasVoo.length - 1; i >= 0; i--) {
        const b = window.ladinoBombasVoo[i];
        b.vida -= dt; b.prog += 1 / 20; b.giro += 0.4;
        if (b.vida <= 0 || b.prog >= 1) {
            window.criarPuffVeneno(b.alvoX, b.alvoY, 90, true);
            window.ladinoBombasVoo.splice(i, 1);
            continue;
        }
        const px = b.x + (b.alvoX - b.x) * b.prog;
        const py = (b.y + (b.alvoY - b.y) * b.prog) - Math.sin(b.prog * Math.PI) * b.altura;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(b.giro * 3);
        // Frasco pequeno (corpo verde + tampa)
        ctx.fillStyle = '#145a32';
        ctx.fillRect(-3, -4, 6, 8);
        ctx.fillStyle = '#1e8449';
        ctx.fillRect(-3, -2, 6, 3);
        ctx.fillStyle = '#6e2c00';
        ctx.fillRect(-1.5, -5.5, 3, 2);
        ctx.restore();
    }

    // --- Puffs de gás venenoso ---
    for (let i = window.ladinoGasPuffs.length - 1; i >= 0; i--) {
        const g = window.ladinoGasPuffs[i];
        g.vida -= dt; g.x += g.vx; g.y += g.vy; g.alpha -= dt * 1.4;
        if (g.vida <= 0 || g.alpha <= 0) { window.ladinoGasPuffs.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, g.alpha) * 0.35;
        ctx.fillStyle = g.cor || '#27ae60';
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.tamanho, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Fumaças (camuflagem/invisibilidade/quedas) ---
    for (let i = window.ladinoFumaças.length - 1; i >= 0; i--) {
        const f = window.ladinoFumaças[i];
        f.vida -= dt; f.x += f.vx; f.y += f.vy; f.alpha -= dt * 1.1;
        if (f.vida <= 0 || f.alpha <= 0) { window.ladinoFumaças.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.alpha) * 0.4;
        ctx.fillStyle = f.cor || '#9b59b6';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.tamanho, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Estrela da Morte no chão (pentagrama animado) ---
    if (window.ladinoEstrelaVisual) {
        const e = window.ladinoEstrelaVisual;
        e.vida -= dt; e.alpha -= dt * 0.20;
        if (e.vida <= 0 || e.alpha <= 0) { window.ladinoEstrelaVisual = null; }
        else {
            ctx.save();
            ctx.globalAlpha = Math.max(0, e.alpha) * 0.7;
            ctx.strokeStyle = '#c39bd3';
            ctx.lineWidth = 2;
            // Estrela de 5 pontas: liga os vértices em ordem de estrela
            const pts = e.pontos;
            if (pts && pts.length === 5) {
                const ordem = [0, 2, 4, 1, 3, 0];
                ctx.beginPath();
                for (let k = 0; k < ordem.length; k++) {
                    const p = pts[ordem[k]];
                    if (k === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            } else {
                // fallback: círculo pontilhado
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(e.cx, e.cy, e.raio, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }
    }

    // --- Flashes/faíscas ---
    for (let i = window.ladinoFlashes.length - 1; i >= 0; i--) {
        const fl = window.ladinoFlashes[i];
        fl.vida -= dt; fl.x += fl.vx; fl.y += fl.vy; fl.alpha -= dt * 3.4;
        if (fl.vida <= 0 || fl.alpha <= 0) { window.ladinoFlashes.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, fl.alpha);
        ctx.fillStyle = fl.cor || '#9b59b6';
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.tamanho || 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Ondas de choque (impacto central) ---
    for (let i = window.ladinoOndas.length - 1; i >= 0; i--) {
        const o = window.ladinoOndas[i];
        o.vida -= dt; o.raio += 4; o.alpha -= dt * 1.6;
        if (o.vida <= 0 || o.alpha <= 0) { window.ladinoOndas.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, o.alpha) * 0.8;
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(o.x, o.y, Math.min(o.raio, o.raioMax), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(o.x, o.y, Math.min(o.raio * 0.6, o.raioMax), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // --- Sangue (passiva) ---
    for (let i = window.ladinoSangues.length - 1; i >= 0; i--) {
        const s = window.ladinoSangues[i];
        s.vida -= dt; s.x += s.vx; s.y += s.vy; s.alpha -= dt * 2.2;
        if (s.vida <= 0 || s.alpha <= 0) { window.ladinoSangues.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha) * 0.85;
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.tamanho, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};

// ===== HELPERS DE LIMPEZA (usados em troca de mapa/classe) =====
window.limparEfeitosLadino = function() {
    window.ladinoCortes = [];
    window.ladinoRastros = [];
    window.ladinoBombasVoo = [];
    window.ladinoGasPuffs = [];
    window.ladinoFumaças = [];
    window.ladinoEstrelaVisual = null;
    window.ladinoFlashes = [];
    window.ladinoOndas = [];
    window.ladinoSangues = [];
    window.ladinoQueda = null;
};