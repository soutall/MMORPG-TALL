// ============================================================================
// mapa_deserto.js — FASE 2: "Deserto com Oásis" (20x)
// Módulo isomórfico: roda no NAVEGADOR (expõe funções em window) E no SERVIDOR
// (module.exports), então o mesmo grid de colisão vale para os dois lados.
//
//   • Fase 1 (mapa verde)  : x em [0, 18000) — intacta.
//   • Fase 2 (deserto)     : x em [18000, 50000) × y em [0, 36000).
//   • Tile = 40px → COLS=800, ROWS=900.
//   • Alturas: 0=livre, 1=pequena (bloqueia entidades, projéteis passam),
//     2=média (bloqueia entidades E projéteis), 3=alta (bloqueia tudo).
//
// Transição: borda leste do verde / borda oeste do deserto + vórtices; a leste
// há um desfiladeiro (garganta) em y ~8000-8600 que dá acesso ao Pântano.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const DES_X0 = 18000;
    const DES_X1 = 50000;
    const DES_Y1 = 36000;
    const COLS = (DES_X1 - DES_X0) / TILE;   // 800
    const ROWS = DES_Y1 / TILE;              // 900

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        areia: 0, duna: 0, flor: 0,
        agua: ALT_PEQUENA,
        palma: ALT_PEQUENA,
        cacto: ALT_PEQUENA,
        pedrag: ALT_PEQUENA,
        pedrap: ALT_PEQUENA,
        ruina: ALT_MEDIA,
        mont: ALT_ALTA
    };

    // Vórtices espaciais (marcos visuais + teleporte) próximos à divisa
    const PORTA_VERDE = { x: 17080, y: 4500, r: 58, alvo: { x: 18080, y: 4500 } };
    const PORTA_DESERTO = { x: 18090, y: 4500, r: 58, alvo: { x: 17020, y: 4500 } };
    const BORDA_ESTE = 17980;   // verde: cruzou a leste -> deserto
    const BORDA_OESTE = 18020;  // deserto: cruzou a oeste -> verde

    // Desfiladeiro leste (acesso ao Pântano): faixa de linhas ABERTAS na boca
    const GATE_L0 = 200;   // y 8000
    const GATE_L1 = 215;   // y 8600
    const ALVO_PANTANO = { x: 50080, y: 8300 };

    let grid = null;
    let sortables = [];
    let decor = [];

    // ---------- PRNG determinístico ----------
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash2(a, b) {
        let n = (a * 374761393 + b * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function ruidoDuna(c, l) {
        let s1 = Math.sin(c * 0.05 + l * 0.013 + 1.7);
        let s2 = Math.sin(c * 0.021 - l * 0.047 + 4.2);
        let s3 = Math.sin((c + l) * 0.011 + 0.6);
        return s1 * 0.55 + s2 * 0.30 + s3 * 0.15;
    }

    // ---------- Geração ----------
    function marcar(c, l, tipo) {
        grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] };
    }

    function gerarDeserto() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'areia', alt: 0 };
        }

        const rnd = mulberry32(20260915);

        // 1) Dunas: faixas suaves e extensas (só visual e relevo, livres)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (ruidoDuna(c, l) > 0.72) marcar(c, l, 'duna');
            }
        }

        // 2) Montanhas: borda leste do deserto EXCETO o desfiladeiro (GATE_L0..GATE_L1)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                let montanha = false;
                if (c >= COLS - 2 && (l < GATE_L0 || l > GATE_L1)) montanha = true;
                if (c >= COLS - 1 && (l < GATE_L0 - 8 || l > GATE_L1 + 8)) montanha = true;
                if (montanha) marcar(c, l, 'mont');
            }
        }

        // 3) Oásis (águas acessíveis só para decoração do deserto bloqueiam entidades)
        const oases = [
            { cx: 100, cy: 200, r: 7 },
            { cx: 405, cy: 560, r: 9 },
            { cx: 625, cy: 130, r: 6 },
            { cx: 230, cy: 800, r: 5 }
        ];
        for (let k = 0; k < oases.length; k++) {
            const O = oases[k];
            for (let l = Math.max(0, Math.floor(O.cy - O.r - 2)); l <= Math.min(ROWS - 1, Math.ceil(O.cy + O.r + 2)); l++) {
                for (let c = Math.max(0, Math.floor(O.cx - O.r - 2)); c <= Math.min(COLS - 1, Math.ceil(O.cx + O.r + 2)); c++) {
                    if (grid[l][c].tipo === 'mont') continue;
                    const d = Math.hypot(c + 0.5 - O.cx, l + 0.5 - O.cy);
                    if (d <= O.r) marcar(c, l, 'agua');
                }
            }
        }

        // 4) Anel de palmeiras ao redor das águas
        for (let k = 0; k < oases.length; k++) {
            const O = oases[k];
            for (let l = 0; l < ROWS; l++) {
                for (let c = 0; c < COLS; c++) {
                    if (grid[l][c].tipo !== 'areia') continue;
                    const d = Math.hypot(c + 0.5 - O.cx, l + 0.5 - O.cy);
                    if (d > O.r + 0.7 && d < O.r + 2.2) marcar(c, l, 'palma');
                }
            }
        }

        // 5) Ruínas: poucos blocos 2×2 (paisagem limpa)
        [[220, 120], [500, 700], [120, 620], [700, 300]].forEach(function (centro) {
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
                let c = centro[0] + dx, l = centro[1] + dy;
                if (grid[l] && grid[l][c] && grid[l][c].tipo === 'areia') marcar(c, l, 'ruina');
            }
        });

        // 6) Pedras grandes poucas (obstáculo baixo)
        let pedrasG = 0, tent = 0;
        while (pedrasG < 14 && tent < 8000) {
            tent++;
            let c = 3 + Math.floor(rnd() * (COLS - 6));
            let l = 3 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'areia') { marcar(c, l, 'pedrag'); pedrasG++; }
        }

        // 7) Cactos e pedrinhas soltas (quantidade proporcional menor que o antigo)
        let contadores = { cacto: 40, pedrap: 60, flor: 26 };
        for (let chave in contadores) {
            let restantes = contadores[chave];
            let tentativas = 0;
            while (restantes > 0 && tentativas < 12000) {
                tentativas++;
                let c = 2 + Math.floor(rnd() * (COLS - 4));
                let l = Math.floor(rnd() * ROWS);
                if (grid[l][c].tipo === 'areia') { marcar(c, l, chave); restantes--; }
            }
        }

        // 8) Colchão de decoração — pedrinhas no chão (não bloqueia)
        decor = [];
        const nDecor = 900;
        for (let i = 0; i < nDecor; i++) {
            let c = Math.floor(rnd() * COLS);
            let l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo !== 'areia' && grid[l][c].tipo !== 'duna') continue;
            decor.push({
                x: DES_X0 + c * TILE + 5 + rnd() * (TILE - 10),
                y: l * TILE + 5 + rnd() * (TILE - 10),
                r: 1.5 + rnd() * 2,
                tonal: rnd()
            });
        }

        // 9) Snapshot dos sprites y-sort (palmeiras, ruínas, pedras, cactos)
        sortables = [];
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                let tipo = grid[l][c].tipo;
                if (tipo !== 'palma' && tipo !== 'ruina' && tipo !== 'pedrag' && tipo !== 'pedrap' && tipo !== 'cacto') continue;
                sortables.push({
                    tipo: tipo,
                    c: c, l: l,
                    x: DES_X0 + c * TILE + TILE / 2,
                    base: l * TILE + TILE - alturaRelevo(tipo)
                });
            }
        }

        return grid;
    }

    // ---------- Colisão / consulta ----------
    function isDeserto(x, y) { return x >= DES_X0; }

    function alvoEmDeserto(x, y) {
        if (x < DES_X0) return null;
        let c = Math.floor((x - DES_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return null;
        return grid[l][c];
    }

    function alcanceAltura(x, y, minimo, raio) {
        let amostras = [[0, 0], [raio, 0], [-raio, 0], [0, raio], [0, -raio]];
        for (let i = 0; i < amostras.length; i++) {
            let px = x + amostras[i][0], py = y + amostras[i][1];
            if (px < DES_X0) continue;
            let c = Math.floor((px - DES_X0) / TILE);
            let l = Math.floor(py / TILE);
            if (c < 0 || c >= COLS || l < 0 || l >= ROWS) continue;
            if (grid[l][c].alt >= minimo) return true;
        }
        return false;
    }

    function colideDeserto(x, y, raio) {
        if (!grid || x < DES_X0) return false;
        return alcanceAltura(x, y, ALT_PEQUENA, (typeof raio === 'number') ? raio : 8);
    }

    function colideProjetilDeserto(x, y) {
        if (!grid || x < DES_X0) return false;
        return alcanceAltura(x, y, ALT_MEDIA, 8);
    }

    // ---------------- Transição de mapa ----------------
    let transicaoAtiva = false;
    let overlayEl = null;

    function obterOverlay() {
        if (overlayEl) return overlayEl;
        overlayEl = document.createElement('div');
        overlayEl.id = 'overlay-mapa';
        overlayEl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#0a0e12;z-index:99999;opacity:0;pointer-events:none;transition:opacity .35s ease;';
        document.body.appendChild(overlayEl);
        return overlayEl;
    }

    function infoPortalDeserto(x, y) {
        if (x < DES_X0) {
            if (Math.hypot(x - PORTA_VERDE.x, y - PORTA_VERDE.y) < PORTA_VERDE.r) {
                return { via: 'portal', mapa: 'desert', alvo: PORTA_VERDE.alvo };
            }
            if (x >= BORDA_ESTE) {
                return { via: 'borda', mapa: 'desert', alvo: { x: 18080, y: 4500 } };
            }
        } else {
            // FASE 3: cruzou o desfiladeiro leste -> entra no Pântano
            if (x >= DES_X1 - 30) {
                return { via: 'borda', mapa: 'pantano', alvo: ALVO_PANTANO };
            }
            if (Math.hypot(x - PORTA_DESERTO.x, y - PORTA_DESERTO.y) < PORTA_DESERTO.r) {
                return { via: 'portal', mapa: 'desert', alvo: PORTA_DESERTO.alvo };
            }
            if (x <= BORDA_OESTE) {
                return { via: 'borda', mapa: 'desert', alvo: { x: 17020, y: 4500 } };
            }
        }
        return null;
    }

    function switchMapaFade(cb) {
        if (typeof document === 'undefined' || !document.body) { cb(); return; }
        let ov = obterOverlay();
        ov.style.opacity = '1';
        setTimeout(function () {
            cb();
            ov.style.opacity = '0';
        }, 380);
    }

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        let info = infoPortalDeserto(x, y);
        if (!info) return;
        transicaoAtiva = true;
        switchMapaFade(function () {
            global.meuX = info.alvo.x;
            global.meuY = info.alvo.y;
            global.currentMap = (info.mapa === 'pantano') ? 'pantano' : ((info.alvo.x >= DES_X0) ? 'desert' : 'green');
            transicaoAtiva = false;
        });
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideDeserto(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 4; r++) {
            for (let a = 0; a < 8; a++) {
                let ang = (a / 8) * Math.PI * 2;
                let x = x0 + Math.cos(ang) * r * TILE;
                let y = y0 + Math.sin(ang) * r * TILE;
                if (x < DES_X0) x = DES_X0 + 20;
                if (!colideDeserto(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: 18080, y: 4500 };
    }

    // ---------------- Desenho (navegador) ----------------
    function alturaRelevo(tipo) {
        if (tipo === 'duna') return 4;
        if (tipo === 'ruina') return 8;
        if (tipo === 'mont') return 12;
        return 0;
    }

    function desenharDesertoCenario(t) {
        const ctx = global.ctx;
        if (!ctx || !grid) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) || (global.innerWidth || 800);
        let ch = (global.canvas && global.canvas.height) || (global.innerHeight || 600);
        cw = cw / (global.ZOOM_CAMERA || 1);
        ch = ch / (global.ZOOM_CAMERA || 1);

        let c0 = Math.max(0, Math.floor((camX - DES_X0 - 80) / TILE));
        let c1 = Math.min(COLS - 1, Math.ceil((camX - DES_X0 + cw + 80) / TILE));
        let l0 = Math.max(0, Math.floor((camY - 80) / TILE));
        let l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 80) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                let cel = grid[l][c];
                let x = DES_X0 + c * TILE;
                let y = l * TILE;
                let eh = alturaRelevo(cel.tipo);
                if (cel.tipo === 'mont') { desenharMontanha(ctx, x, y, c, l, eh); continue; }
                desenharAreiaBase(ctx, x, y, c, l, cel.tipo, eh);
            }
        }

        for (let i = 0; i < decor.length; i++) {
            let d = decor[i];
            if (d.x < camX - 20 || d.x > camX + cw + 20 || d.y < camY - 20 || d.y > camY + ch + 20) continue;
            let dc = Math.floor((d.x - DES_X0) / TILE);
            let dl = Math.floor(d.y / TILE);
            let de = (grid[dl] && grid[dl][dc]) ? alturaRelevo(grid[dl][dc].tipo) : 0;
            if (de > 0) d.offsetY = de; else delete d.offsetY;
            desenharDecor(ctx, d);
        }

        if (camX + cw > DES_X0 - 80) {
            ctx.fillStyle = 'rgba(70, 45, 12, 0.22)';
            ctx.fillRect(DES_X0 - 30, Math.max(0, camY - 200), 30, ch + 400);
            ctx.fillStyle = 'rgba(255, 236, 160, 0.20)';
            ctx.fillRect(DES_X0, Math.max(0, camY - 200), 20, ch + 400);
        }
    }

    function desenharAreiaBase(ctx, x, y, c, l, tipo, eh) {
        eh = eh || 0;
        let ty = y - eh;
        let tomBase = hash2(c, l);
        let corBase = '#d9b45c';
        if (tipo === 'duna') corBase = '#e6c67e';

        if (eh > 0) {
            ctx.fillStyle = '#b58f4c';
            ctx.fillRect(x, y + TILE - eh, TILE + 1, eh);
            ctx.fillStyle = '#93743b';
            ctx.fillRect(x + TILE - eh, ty, eh, TILE + eh);
            ctx.fillStyle = corBase;
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(255, 240, 185, 0.30)';
            ctx.fillRect(x, ty, TILE + 1, 2);
            ctx.fillStyle = 'rgba(255, 240, 185, 0.14)';
            ctx.fillRect(x, ty, 2, TILE + 1);
        } else {
            ctx.fillStyle = corBase;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        }

        if (tipo === 'agua') {
            let f = Math.sin((x + y) * 0.06 + performance.now() * 0.0018) * 2;
            ctx.fillStyle = '#3aa8d8';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = '#6fc9ef';
            ctx.fillRect(x + 6 + f, y + 9, 13, 4);
            ctx.fillStyle = '#8fd9f7';
            ctx.fillRect(x + 22 - f, y + 26, 10, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.beginPath();
            ctx.arc(x + 27 + f, y + 14, 2.4, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        if (tipo === 'flor') {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.arc(x + 12, y + 16, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f39c12';
            ctx.beginPath(); ctx.arc(x + 28, y + 26, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e84393';
            ctx.beginPath(); ctx.arc(x + 6, y + 30, 2.6, 0, Math.PI * 2); ctx.fill();
            return;
        }

        if (tipo === 'palma' || tipo === 'ruina' || tipo === 'pedrag' || tipo === 'pedrap' || tipo === 'cacto') {
            ctx.fillStyle = 'rgba(120, 90, 40, 0.25)';
            ctx.beginPath(); ctx.ellipse(x + 20, ty + TILE - 8, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        }

        if (tipo !== 'duna' && tomBase > 0.72) {
            ctx.fillStyle = 'rgba(255, 235, 170, 0.55)';
            ctx.fillRect(x + 4, ty + 26, 8, 3);
            ctx.fillRect(x + 26, ty + 14, 6, 2);
        }
    }

    function desenharMontanha(ctx, x, y, c, l, eh) {
        eh = eh || 0;
        let ty = y - eh;
        ctx.fillStyle = '#4a4339';
        ctx.fillRect(x, y + TILE - eh, TILE + 1, eh);
        ctx.fillStyle = '#3b352e';
        ctx.fillRect(x + TILE - eh, ty, eh, TILE + eh);
        ctx.fillStyle = '#6b6257';
        ctx.fillRect(x, ty, TILE + 1, TILE + 1);
        ctx.fillStyle = '#574f46';
        ctx.beginPath();
        ctx.moveTo(x, ty + TILE);
        ctx.lineTo(x + TILE / 2, ty + (TILE * 0.18));
        ctx.lineTo(x + TILE, ty + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7a7267';
        ctx.beginPath();
        ctx.moveTo(x + TILE * 0.55, ty + TILE);
        ctx.lineTo(x + TILE * 0.78, ty + TILE * 0.45);
        ctx.lineTo(x + TILE, ty + TILE);
        ctx.closePath();
        ctx.fill();
        if (hash2(c, l) > 0.5) {
            ctx.strokeStyle = 'rgba(240, 240, 240, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 8, ty + TILE - 8);
            ctx.lineTo(x + TILE - 8, ty + TILE - 8);
            ctx.stroke();
        }
    }

    function desenharDecor(ctx, d) {
        let dy = d.offsetY || 0;
        if (dy > 0) {
            ctx.fillStyle = 'rgba(140, 110, 45, 0.35)';
            ctx.fillRect(d.x - d.r, d.y - dy + d.r + 1, d.r * 2 + 2, 2);
        }
        ctx.fillStyle = d.tonal > 0.5 ? 'rgba(120, 96, 40, 0.5)' : 'rgba(160, 130, 60, 0.6)';
        ctx.beginPath();
        ctx.arc(d.x, d.y - dy, d.r, 0, Math.PI * 2);
        ctx.fill();
        if (d.tonal < 0.25) {
            ctx.strokeStyle = 'rgba(140, 120, 60, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(d.x - 4, d.y - dy - 1);
            ctx.lineTo(d.x + 4, d.y - dy - 1);
            ctx.stroke();
        }
    }

    // Vórtices espaciais — cada mapa desenha APENAS o seu próprio marco
    function desenharPortalVerde(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_VERDE.x, PORTA_VERDE.y, t, '#a55eea');
    }

    function desenharPortalDeserto(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_DESERTO.x, PORTA_DESERTO.y, t, '#e84393');
    }

    function desenharVortex(ctx, x, y, t, cor) {
        ctx.save();
        ctx.shadowColor = cor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(20, 10, 40, 0.55)';
        ctx.beginPath(); ctx.arc(x, y, 54, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 26;
        ctx.strokeStyle = cor;
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 5; i++) {
            let raio = 18 + i * 8;
            let a0 = t * 1.4 + i * 1.25;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, raio, a0, a0 + Math.PI * 0.8);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ---------------- Sprites y-sort ----------------
    function coletarDesertSortables(t, arr) {
        if (!grid) gerarDeserto();
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = (global.canvas && global.canvas.width) ? (global.canvas.width / (global.ZOOM_CAMERA || 1)) : 900;
        const ch = (global.canvas && global.canvas.height) ? (global.canvas.height / (global.ZOOM_CAMERA || 1)) : 600;
        for (let i = 0; i < sortables.length; i++) {
            let s = sortables[i];
            if (s.x < camX - 200 || s.x > camX + cw + 200 || s.base < camY - 220 || s.base > camY + ch + 40) continue;
            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () {
                        if (spr.tipo === 'palma') desenharPalmeira(global.ctx, spr, tm);
                        else if (spr.tipo === 'ruina') desenharRuina(global.ctx, spr, tm);
                        else if (spr.tipo === 'pedrag') desenharPedraGrande(global.ctx, spr, tm);
                        else if (spr.tipo === 'pedrap') desenharPedraPequena(global.ctx, spr, tm);
                        else desenharCacto(global.ctx, spr, tm);
                    };
                })(s, t)
            });
        }
    }

    function desenharPalmeira(ctx, s, t) {
        if (!ctx) return;
        let balanco = Math.sin(t * 1.6 + s.x * 0.05) * 3;
        ctx.save();
        ctx.translate(s.x, s.base);

        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(0, -4, 26, 9, 0, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#7c4f28';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(6 + balanco, -30, 4 + balanco, -58);
        ctx.stroke();
        ctx.strokeStyle = '#96603a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-1, 0);
        ctx.quadraticCurveTo(4 + balanco, -30, 2 + balanco, -58);
        ctx.stroke();

        let copaX = 5 + balanco, copaY = -62;
        ctx.fillStyle = '#2f9e57';
        for (let i = 0; i < 6; i++) {
            let a = -Math.PI * 0.9 + (i / 5) * Math.PI * 1.6;
            ctx.save();
            ctx.translate(copaX, copaY);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.ellipse(20, 0, 21, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#238e48';
        ctx.beginPath(); ctx.arc(copaX, copaY, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b8712f';
        ctx.beginPath(); ctx.arc(copaX + 14, copaY + 12, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a35f24';
        ctx.beginPath(); ctx.arc(copaX - 6, copaY + 15, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function desenharCacto(ctx, s, t) {
        if (!ctx) return;
        let aparecen = Math.sin(t * 2 + s.x * 0.1) * 1.5;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, -2, 16, 6, 0, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#2e9e47';
        ctx.lineCap = 'round';
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10 + aparecen, -18); ctx.lineTo(10 + aparecen, -26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-10 - aparecen, -24); ctx.lineTo(-10 - aparecen, -32); ctx.stroke();

        ctx.strokeStyle = '#217a35';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            let y2 = -4 - i * 5;
            ctx.moveTo(-5, y2); ctx.lineTo(-9, y2 - 3);
        }
        ctx.stroke();
        ctx.restore();
    }

    function desenharPedraGrande(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, -4, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8d8377';
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-16, -8);
        ctx.lineTo(-4, -22);
        ctx.lineTo(12, -18);
        ctx.lineTo(22, -6);
        ctx.lineTo(20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a49a8d';
        ctx.beginPath();
        ctx.moveTo(-8, -20);
        ctx.lineTo(6, -20);
        ctx.lineTo(10, -10);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,40,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(14, -4); ctx.stroke();
        ctx.restore();
    }

    function desenharPedraPequena(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(0, -2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9a9084';
        ctx.beginPath();
        ctx.moveTo(-13, 0);
        ctx.lineTo(-9, -9);
        ctx.lineTo(4, -11);
        ctx.lineTo(13, -3);
        ctx.lineTo(11, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b3a999';
        ctx.beginPath(); ctx.ellipse(-1, -6, 6, 3, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function desenharRuina(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, -6, 34, 12, 0, 0, Math.PI * 2); ctx.fill();

        for (let lado = -1; lado <= 1; lado += 2) {
            let px = lado * 14;
            ctx.fillStyle = '#cbb58a';
            ctx.fillRect(px - 6, -34, 12, 34);
            ctx.fillStyle = '#deca9d';
            ctx.fillRect(px - 6, -34, 12, 6);
            ctx.fillRect(px - 6, -18, 12, 8);
            ctx.fillStyle = '#b8a175';
            ctx.fillRect(px - 4, -16, 3, 16);
            ctx.fillRect(px + 1, -10, 3, 10);
        }

        ctx.fillStyle = '#c9b284';
        ctx.fillRect(-7, -16, 14, 16);
        ctx.fillStyle = '#d8c392';
        ctx.fillRect(-7, -16, 14, 5);
        ctx.strokeStyle = 'rgba(90, 70, 40, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(7, -3); ctx.stroke();

        ctx.fillStyle = '#b09a6e';
        ctx.fillRect(8, -7, 7, 7);
        ctx.fillRect(-16, -10, 6, 5);
        ctx.restore();
    }

    // ---------- Reset de instância ----------
    function resetarDeserto() {
        grid = null;
        sortables = [];
        decor = [];
    }

    // ---------------- API ----------------
    const api = {
        TILE: TILE,
        DES_X0: DES_X0, DES_X1: DES_X1, DES_Y1: DES_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        porcoes: { PORTA_VERDE: PORTA_VERDE, PORTA_DESERTO: PORTA_DESERTO, BORDA_ESTE: BORDA_ESTE, BORDA_OESTE: BORDA_OESTE },
        gerarDeserto: gerarDeserto,
        resetarDeserto: resetarDeserto,
        grid: function () { return grid; },
        isDeserto: isDeserto,
        colideDeserto: colideDeserto,
        colideProjetilDeserto: colideProjetilDeserto,
        infoPortalDeserto: infoPortalDeserto,
        onUpdatePosicao: onUpdatePosicao,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharDesertoCenario: desenharDesertoCenario,
        coletarDesertSortables: coletarDesertSortables,
        desenharPortalVerde: desenharPortalVerde,
        desenharPortalDeserto: desenharPortalDeserto,
        sortables: function () { return sortables; }
    };

    // Expoê para o navegador
    if (global.window) {
        gerarDeserto();
        global.desenharDesertoCenario = desenharDesertoCenario;
        global.coletarDesertSortables = coletarDesertSortables;
        global.colideDeserto = colideDeserto;
        global.desenharPortalVerde = desenharPortalVerde;
        global.desenharPortalDeserto = desenharPortalDeserto;
        global.resetarDeserto = resetarDeserto;
        global.mapaDeserto = api;
    }

    // Expoê para o Node
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarDeserto();
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : this);