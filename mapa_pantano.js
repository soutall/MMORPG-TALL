// ============================================================================
// mapa_pantano.js — FASE 3: "Pântano das Almas" (5x)
// Módulo isomórfico: roda no NAVEGADOR (expõe funções em window) E no SERVIDOR
// (module.exports), então o mesmo grid de colisão vale para os dois lados.
//
//   • Fase 2 (deserto)     : x em [18000, 50000) × y em [0, 36000).
//   • Fase 3 (pântano)     : x em [50000, 58000) × y em [0, 9000).
//   • Tile = 40px → COLS=200, ROWS=225.
//   • Alturas: 0=livre, 1=pequena (bloqueia entidades, projéteis passam),
//     2=média (bloqueia entidades E projéteis), 3=alta (bloqueia tudo).
//   • Água de veneno (tipo 'veneno') TEM ALTURA LIVRE — bloqueia apenas
//     monstros (via ehVenenoPantano que o servidor usa), causa dano ao jogador.
//
// Transição: desfiladeiro leste do deserto → pântano; borda oeste → volta deserto.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const PAN_X0 = 50000;
    const PAN_X1 = 58000;
    const PAN_Y1 = 9000;
    const COLS = (PAN_X1 - PAN_X0) / TILE;     // 200
    const ROWS = PAN_Y1 / TILE;                 // 225

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        lama: ALT_LIVRE,
        grama: ALT_LIVRE,
        flor: ALT_LIVRE,
        veneno: ALT_LIVRE,  // água venenosa: livre p/ jogador, monstros bloqueados via ehVenenoPantano
        rocha: ALT_PEQUENA,
        arvore: ALT_MEDIA,
        ruina: ALT_MEDIA,
        parede: ALT_MEDIA,
        mont: ALT_ALTA
    };

    // Faixa aberta no desfiladeiro (mesma do mapa_deserto): linhas 200..215 em y
    const GATE_L0 = 200;
    const GATE_L1 = 215;
    const ALVO_RETORNO_DESERTO = { x: 49960, y: 8300 };
    const ALVO_RETORNO_CIDADE = { x: 60487, y: 660 };

    // Portais visuais
    const PORTA_ENTRADA = { x: PAN_X0 + 80, y: 8300, r: 58, alvo: ALVO_RETORNO_DESERTO };
    const PORTA_RETORNO = { x: PAN_X0 + 2000, y: 4500, r: 58, alvo: ALVO_RETORNO_CIDADE };
    const BORDA_OESTE = PAN_X0 + 40;  // pântano: cruzou a oeste -> deserto

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

    // ---------- Geração (estática, uma única vez) ----------
    function marcar(c, l, tipo) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS)
            grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] };
    }

    function gerarPantano() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'lama', alt: ALT_LIVRE };
        }

        const rnd = mulberry32(20260916);

        // 1) Montanhas altas: borda leste (fim do mundo) + borda oeste exceto o desfiladeiro
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                let montanha = false;
                if (c >= COLS - 2) montanha = true;                          // leste
                if (c <= 1 && (l < GATE_L0 || l > GATE_L1)) montanha = true; // oeste isolado
                if (montanha) marcar(c, l, 'mont');
            }
        }

        // 2) Lagos de água VENENOSA (poca → veneno, visibly green)
        const lagosVeneno = [
            { cx: 60, cy: 110, r: 9 },
            { cx: 145, cy: 60, r: 7 },
            { cx: 90, cy: 180, r: 11 },
            { cx: 170, cy: 130, r: 8 },
            { cx: 30, cy: 60, r: 6 },
            { cx: 120, cy: 35, r: 5 },
            { cx: 180, cy: 200, r: 10 }
        ];
        for (let k = 0; k < lagosVeneno.length; k++) {
            const L = lagosVeneno[k];
            for (let l = Math.max(0, Math.floor(L.cy - L.r - 1)); l <= Math.min(ROWS - 1, Math.ceil(L.cy + L.r + 1)); l++) {
                for (let c = Math.max(0, Math.floor(L.cx - L.r - 1)); c <= Math.min(COLS - 1, Math.ceil(L.cx + L.r + 1)); c++) {
                    if (grid[l][c].tipo === 'mont') continue;
                    const d = Math.hypot(c + 0.5 - L.cx, l + 0.5 - L.cy);
                    if (d <= L.r - 0.8) marcar(c, l, 'veneno');
                    else if (d <= L.r + 0.6 && grid[l][c].tipo === 'lama') marcar(c, l, 'lama');
                }
            }
        }

        // 3) Anel de grama musgosa ao redor de lagos + manchas soltas
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[l][c].tipo !== 'lama') continue;
                let pertoLago = false;
                for (let k = 0; k < lagosVeneno.length; k++) {
                    const d = Math.hypot(c + 0.5 - lagosVeneno[k].cx, l + 0.5 - lagosVeneno[k].cy);
                    if (d > lagosVeneno[k].r + 0.4 && d < lagosVeneno[k].r + 2.4) { pertoLago = true; break; }
                }
                if (pertoLago) marcar(c, l, 'grama');
            }
        }
        let gramaSolta = 0;
        while (gramaSolta < 260) {
            const c = 2 + Math.floor(rnd() * (COLS - 6));
            const l = 1 + Math.floor(rnd() * (ROWS - 4));
            if (grid[l][c].tipo === 'lama') { marcar(c, l, 'grama'); gramaSolta++; }
        }

        // 4) Rochas com musgo
        let rochas = 0;
        while (rochas < 120) {
            const c = 2 + Math.floor(rnd() * (COLS - 4));
            const l = 2 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'lama' || grid[l][c].tipo === 'grama') { marcar(c, l, 'rocha'); rochas++; }
        }

        // 5) Paredes de raízes
        let muros = 0;
        while (muros < 100) {
            const c = 2 + Math.floor(rnd() * (COLS - 4));
            const l = 2 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'lama' || grid[l][c].tipo === 'grama') { marcar(c, l, 'parede'); muros++; }
        }

        // 6) Ruínas musgosas (blocos 2×2)
        let ruinasCentros = [[80,50],[150,190],[40,150],[120,30],[170,70],[20,80]];
        for (let k = 0; k < ruinasCentros.length; k++) {
            let centro = ruinasCentros[k];
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
                const c = centro[0] + dx, l = centro[1] + dy;
                if (grid[l] && grid[l][c] && (grid[l][c].tipo === 'lama' || grid[l][c].tipo === 'grama')) marcar(c, l, 'ruina');
            }
        }

        // 7) Árvores retorcidas em clusters e soltas
        const clusters = [
            { cx: 50, cy: 100, n: 5 },
            { cx: 130, cy: 50, n: 4 },
            { cx: 175, cy: 160, n: 4 },
            { cx: 30, cy: 190, n: 3 },
            { cx: 100, cy: 100, n: 3 },
            { cx: 160, cy: 25, n: 3 },
            { cx: 80, cy: 210, n: 3 }
        ];
        for (let k = 0; k < clusters.length; k++) {
            const cl = clusters[k];
            for (let i = 0; i < cl.n; i++) {
                const c = cl.cx - 1 + Math.floor(rnd() * 3);
                const l = cl.cy - 1 + Math.floor(rnd() * 3);
                if (grid[l] && grid[l][c] && (grid[l][c].tipo === 'lama' || grid[l][c].tipo === 'grama')) marcar(c, l, 'arvore');
            }
        }
        let arvoresSoltas = 0;
        while (arvoresSoltas < 120) {
            const c = 3 + Math.floor(rnd() * (COLS - 6));
            const l = 2 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'lama' || grid[l][c].tipo === 'grama') { marcar(c, l, 'arvore'); arvoresSoltas++; }
        }

        // 8) Flores de charco
        let flores = 0;
        while (flores < 80) {
            const c = 2 + Math.floor(rnd() * (COLS - 4));
            const l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo === 'lama' || grid[l][c].tipo === 'grama') { marcar(c, l, 'flor'); flores++; }
        }

        // 9) Colchão de decoração: juncos e cogumelos
        decor = [];
        const nDecor = 450;
        for (let i = 0; i < nDecor; i++) {
            const c = Math.floor(rnd() * COLS);
            const l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo === 'veneno' || grid[l][c].tipo === 'mont' || grid[l][c].tipo === 'arvore' || grid[l][c].tipo === 'ruina' || grid[l][c].tipo === 'parede') continue;
            decor.push({
                x: PAN_X0 + c * TILE + 5 + rnd() * (TILE - 10),
                y: l * TILE + 5 + rnd() * (TILE - 10),
                tipo: rnd() < 0.55 ? 'reid' : 'cogumelo',
                s: rnd()
            });
        }

        // 10) Snapshot dos sprites y-sort
        sortables = [];
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                const tipo = grid[l][c].tipo;
                if (tipo !== 'arvore' && tipo !== 'ruina' && tipo !== 'rocha' && tipo !== 'parede') continue;
                sortables.push({
                    tipo: tipo,
                    c: c, l: l,
                    x: PAN_X0 + c * TILE + TILE / 2,
                    base: l * TILE + TILE - alturaRelevo(tipo)
                });
            }
        }

        return grid;
    }

    // ---------- Reset ----------
    function resetarPantano() {
        grid = null; sortables = []; decor = [];
        if (global.mapaDeserto && typeof global.mapaDeserto.resetarDeserto === 'function')
            global.mapaDeserto.resetarDeserto();
        global.arvores = undefined;
    }

    // ---------- Colisão / consulta ----------
    function isPantano(x) { return x >= PAN_X0; }

    function alvoEmPantano(x, y) {
        if (x < PAN_X0) return null;
        const c = Math.floor((x - PAN_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return null;
        return grid[l][c];
    }

    function alcanceAltura(x, y, minimo, raio) {
        const amostras = [[0, 0], [raio, 0], [-raio, 0], [0, raio], [0, -raio]];
        for (let i = 0; i < amostras.length; i++) {
            const px = x + amostras[i][0];
            const py = y + amostras[i][1];
            if (px < PAN_X0) continue;
            const c = Math.floor((px - PAN_X0) / TILE);
            const l = Math.floor(py / TILE);
            if (c < 0 || c >= COLS || l < 0 || l >= ROWS) continue;
            if (grid[l][c].alt >= minimo) return true;
        }
        return false;
    }

    function colidePantano(x, y, raio) {
        if (!grid) gerarPantano();
        if (x < PAN_X0) return false;
        return alcanceAltura(x, y, ALT_PEQUENA, (typeof raio === 'number') ? raio : 8);
    }

    function colideProjetilPantano(x, y) {
        if (!grid) gerarPantano();
        if (x < PAN_X0) return false;
        return alcanceAltura(x, y, ALT_MEDIA, 8);
    }

    function ehVenenoPantano(x, y) {
        if (!grid || x < PAN_X0) return false;
        const c = Math.floor((x - PAN_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return false;
        return grid[l][c].tipo === 'veneno';
    }

    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        if (m === 'pantano') return colidePantano(x, y, raio);
        if (m === 'desert') return (global.colideDeserto ? global.colideDeserto(x, y, raio) : false);
        return false;
    }

    // ---------- Transição ----------
    let transicaoAtiva = false;
    let overlayEl = null;

    function obterOverlay() {
        if (overlayEl) return overlayEl;
        overlayEl = document.createElement('div');
        overlayEl.id = 'overlay-mapa-pantano';
        overlayEl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#0a0e12;z-index:99999;opacity:0;pointer-events:none;transition:opacity .35s ease;';
        document.body.appendChild(overlayEl);
        return overlayEl;
    }

    function infoPortalPantano(x, y) {
        if (x < PAN_X0) return null;
        if (Math.hypot(x - PORTA_RETORNO.x, y - PORTA_RETORNO.y) < PORTA_RETORNO.r) {
            return { via: 'portal', mapa: 'cidade', alvo: PORTA_RETORNO.alvo };
        }
        return null;
    }

    function switchMapaFade(cb) {
        if (typeof document === 'undefined' || !document.body) { cb(); return; }
        const ov = obterOverlay();
        ov.style.opacity = '1';
        setTimeout(function () {
            cb();
            ov.style.opacity = '0';
        }, 380);
    }

    function _determinarMapa(x) {
        const LW = global.LARGURA_VERDE || 18000, LD = global.LARGURA_DESERTO || 50000, LP = global.LARGURA_PANTANO || 58000;
        if (x >= 59800) return 'cidade';
        if (x >= LP) return 'caverna';
        if (x >= LD) return 'pantano';
        if (x >= LW) return 'desert';
        return 'green';
    }

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= PAN_X0) {
            info = infoPortalPantano(x, y);
        } else if (global.mapaDeserto && global.mapaDeserto.infoPortalDeserto) {
            info = global.mapaDeserto.infoPortalDeserto(x, y);
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'pantano_' + info.mapa);
            return;
        }
        transicaoAtiva = true;
        switchMapaFade(function () {
            global.meuX = info.alvo.x;
            global.meuY = info.alvo.y;
            global.currentMap = _determinarMapa(info.alvo.x);
            transicaoAtiva = false;
        });
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colidePantano(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 4; r++) {
            for (let a = 0; a < 8; a++) {
                const ang = (a / 8) * Math.PI * 2;
                const x = x0 + Math.cos(ang) * r * TILE;
                const y = y0 + Math.sin(ang) * r * TILE;
                if (x < PAN_X0) x = PAN_X0 + 20;
                if (!colidePantano(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: ALVO_RETORNO_DESERTO.x, y: ALVO_RETORNO_DESERTO.y };
    }

    // ---------- Desenho (navegador) ----------
    const COR_FUNDO_LAMA = '#24301a';

    function alturaRelevo(tipo) {
        if (tipo === 'grama') return 4;
        if (tipo === 'ruina') return 8;
        if (tipo === 'mont') return 12;
        return 0;
    }

    function desenharCenarioPantano(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) || (global.innerWidth || 800);
        let ch = (global.canvas && global.canvas.height) || (global.innerHeight || 600);
        cw = cw / (global.ZOOM_CAMERA || 1);
        ch = ch / (global.ZOOM_CAMERA || 1);

        ctx.clearRect(camX, camY, cw, ch);
        ctx.fillStyle = COR_FUNDO_LAMA;
        ctx.fillRect(camX, camY, cw, ch);

        if (!grid) gerarPantano();

        let c0 = Math.max(0, Math.floor((camX - PAN_X0 - 200) / TILE));
        let c1 = Math.min(COLS - 1, Math.ceil((camX - PAN_X0 + cw + 200) / TILE));
        let l0 = Math.max(0, Math.floor((camY - 200) / TILE));
        let l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 200) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const cel = grid[l][c];
                const x = PAN_X0 + c * TILE;
                const y = l * TILE;
                const eh = alturaRelevo(cel.tipo);
                if (cel.tipo === 'mont') { desenharMontanhaMusgo(ctx, x, y, c, l, eh); continue; }
                desenharLamaBase(ctx, x, y, c, l, cel.tipo, grid, eh);
            }
        }

        for (let i = 0; i < decor.length; i++) {
            const d = decor[i];
            if (d.x < camX - 20 || d.x > camX + cw + 20 || d.y < camY - 20 || d.y > camY + ch + 20) continue;
            const dc = Math.floor((d.x - PAN_X0) / TILE);
            const dl = Math.floor(d.y / TILE);
            const de = (grid[dl] && grid[dl][dc]) ? alturaRelevo(grid[dl][dc].tipo) : 0;
            if (de > 0) d.offsetY = de; else delete d.offsetY;
            desenharDecorPantano(ctx, d, t);
        }

        if (camX + cw > PAN_X0 - 80) {
            ctx.fillStyle = 'rgba(8, 14, 8, 0.30)';
            ctx.fillRect(PAN_X0 - 20, Math.max(0, camY - 200), 20, ch + 400);
            ctx.fillStyle = 'rgba(70, 96, 50, 0.18)';
            ctx.fillRect(PAN_X0, Math.max(0, camY - 200), 24, ch + 400);
        }
    }

    function desenharLamaBase(ctx, x, y, c, l, tipo, grid, eh) {
        eh = eh || 0;
        let ty = y - eh;
        let corBase = (tipo === 'grama') ? '#58663a' : (tipo === 'veneno') ? '#2e5d3a' : '#3d472a';

        if (eh > 0) {
            ctx.fillStyle = '#2a3220';
            ctx.fillRect(x, y + TILE - eh, TILE + 1, eh);
            ctx.fillStyle = '#22291a';
            ctx.fillRect(x + TILE - eh, ty, eh, TILE + eh);
            ctx.fillStyle = corBase;
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(210, 230, 170, 0.18)';
            ctx.fillRect(x, ty, TILE + 1, 2);
        } else {
            ctx.fillStyle = corBase;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        }

        // Água venenosa — mesma pintura contínua que poça
        if (tipo === 'veneno') {
            ctx.fillStyle = '#2e5d3a';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            const h1 = hash2(c, l);
            const h2 = hash2(c + 31, l + 7);
            ctx.fillStyle = '#35684a';
            const vy = 10 + h1 * 20;
            const continuaEsq = (c > 0 && grid[l][c - 1].tipo === 'veneno');
            const continuaDir = (c + 1 < COLS && grid[l][c + 1].tipo === 'veneno');
            const xLeito = continuaEsq ? (x + 2) : (x + 6 + h2 * 3);
            const largLeito = continuaEsq && continuaDir ? (TILE - 2) : (continuaEsq || continuaDir ? (TILE - 5 - h2 * 3) : (TILE - 10 - h2 * 6));
            ctx.fillRect(xLeito, y + vy, largLeito, 5 + h2 * 3);
            ctx.fillStyle = 'rgba(24, 30, 15, 0.85)';
            if (c === 0 || grid[l][c - 1].tipo !== 'veneno') ctx.fillRect(x, y - 1, TILE + 1, 2);
            if (c + 1 === COLS || grid[l][c + 1].tipo !== 'veneno') ctx.fillRect(x, y + TILE - 1, TILE + 1, 2);
            if (l === 0 || grid[l - 1][c].tipo !== 'veneno') ctx.fillRect(x - 1, y, 2, TILE + 1);
            if (l + 1 === ROWS || grid[l + 1][c].tipo !== 'veneno') ctx.fillRect(x + TILE - 1, y, 2, TILE + 1);
            // Brilho de toxina
            const f = Math.sin((x + y) * 0.06 + (global.performance ? global.performance.now() : Date.now()) * 0.002) * 2;
            ctx.fillStyle = 'rgba(200, 255, 120, 0.22)';
            ctx.beginPath(); ctx.ellipse(x + 22 + f, y + 18, 8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
            if (h2 > 0.6) {
                ctx.fillStyle = 'rgba(180, 240, 80, 0.3)';
                ctx.beginPath(); ctx.arc(x + 8 + h1 * 18, y + 24 + f, 2, 0, Math.PI * 2); ctx.fill();
            }
            return;
        }

        if (tipo === 'flor') {
            ctx.fillStyle = '#d9e264';
            ctx.beginPath(); ctx.arc(x + 12, y + 16, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e8f0a0';
            ctx.beginPath(); ctx.arc(x + 28, y + 26, 2.6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#cdd45a';
            ctx.beginPath(); ctx.arc(x + 6, y + 30, 2.2, 0, Math.PI * 2); ctx.fill();
            return;
        }

        if (tipo === 'arvore' || tipo === 'ruina' || tipo === 'rocha' || tipo === 'parede') {
            ctx.fillStyle = 'rgba(15, 24, 12, 0.30)';
            ctx.beginPath(); ctx.ellipse(x + 20, y + TILE - 8, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(120, 150, 90, 0.20)';
            ctx.beginPath(); ctx.ellipse(x + 20, y + TILE - 8, 13, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        }

        const th1 = hash2(c, l);
        const th2 = hash2(c + 17, l + 11);
        if (tipo === 'lama') {
            ctx.fillStyle = 'rgba(73, 87, 48, 0.5)';
            ctx.beginPath(); ctx.ellipse(x + 10 + th1 * 20, ty + 24 + th2 * 8, 9 + th1 * 4, 4, 0, 0, Math.PI * 2); ctx.fill();
            if (th2 > 0.72) {
                ctx.fillStyle = 'rgba(130, 170, 100, 0.30)';
                ctx.fillRect(x + 5 + th1 * 22, ty + 8, 7, 3);
            }
        } else if (tipo === 'grama' && th1 > 0.45) {
            ctx.fillStyle = 'rgba(148, 184, 104, 0.28)';
            ctx.beginPath(); ctx.ellipse(x + 14 + th2 * 14, ty + 16 + th1 * 14, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    function desenharMontanhaMusgo(ctx, x, y, c, l, eh) {
        eh = eh || 0;
        let ty = y - eh;
        ctx.fillStyle = '#1d2416';
        ctx.fillRect(x, y + TILE - eh, TILE + 1, eh);
        ctx.fillStyle = '#171d12';
        ctx.fillRect(x + TILE - eh, ty, eh, TILE + eh);
        ctx.fillStyle = '#333c2d';
        ctx.fillRect(x, ty, TILE + 1, TILE + 1);
        ctx.fillStyle = '#27301f';
        ctx.beginPath();
        ctx.moveTo(x, ty + TILE);
        ctx.lineTo(x + TILE / 2, ty + (TILE * 0.18));
        ctx.lineTo(x + TILE, ty + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3d4a33';
        ctx.beginPath();
        ctx.moveTo(x + TILE * 0.55, ty + TILE);
        ctx.lineTo(x + TILE * 0.8, ty + TILE * 0.5);
        ctx.lineTo(x + TILE, ty + TILE);
        ctx.closePath();
        ctx.fill();
        if (hash2(c, l) > 0.5) {
            ctx.fillStyle = 'rgba(110, 150, 80, 0.5)';
            ctx.beginPath(); ctx.arc(x + 8, ty + 14, 3.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 27, ty + 26, 2.8, 0, Math.PI * 2); ctx.fill();
        }
    }

    function desenharDecorPantano(ctx, d, t) {
        let dy = d.offsetY || 0;
        if (d.tipo === 'cogumelo') {
            ctx.fillStyle = '#7a5a34';
            ctx.fillRect(d.x, d.y - dy - 5, 3, 6);
            ctx.fillStyle = '#c96a53';
            ctx.beginPath(); ctx.arc(d.x + 1, d.y - dy - 6, 4, Math.PI, 0); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(d.x - 1, d.y - dy - 7, 1.2, 0, Math.PI * 2); ctx.fill();
        } else {
            const f = Math.sin(t * 2 + d.x * 0.1) * 1.5;
            ctx.strokeStyle = 'rgba(150, 180, 110, 0.7)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(d.x - 3, d.y - dy + 2);
            ctx.lineTo(d.x - 3 + f, d.y - dy - 8);
            ctx.moveTo(d.x + 3, d.y - dy + 2);
            ctx.lineTo(d.x + 3 + f, d.y - dy - 6);
            ctx.moveTo(d.x, d.y - dy + 2);
            ctx.lineTo(d.x + f, d.y - dy - 10);
            ctx.stroke();
        }
    }

    // ---------------- Sprites y-sort ----------------
    function coletarPantanoSortables(t, arr) {
        if (!grid) gerarPantano();
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = (global.canvas && global.canvas.width) ? (global.canvas.width / (global.ZOOM_CAMERA || 1)) : 900;
        const ch = (global.canvas && global.canvas.height) ? (global.canvas.height / (global.ZOOM_CAMERA || 1)) : 600;
        for (let i = 0; i < sortables.length; i++) {
            const s = sortables[i];
            if (s.x < camX - 200 || s.x > camX + cw + 200 || s.base < camY - 220 || s.base > camY + ch + 40) continue;
            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () {
                        const ctx = global.ctx;
                        if (!ctx) return;
                        if (spr.tipo === 'arvore') desenharArvoreMorta(ctx, spr, tm);
                        else if (spr.tipo === 'ruina') desenharRuinaMusgosa(ctx, spr, tm);
                        else if (spr.tipo === 'rocha') desenharRochaMusgo(ctx, spr, tm);
                        else desenharParedeRaiz(ctx, spr, tm);
                    };
                })(s, t)
            });
        }
    }

    function desenharArvoreMorta(ctx, s, t) {
        const bal = Math.sin(t * 1.3 + s.x * 0.05) * 2.5;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(8, 14, 8, 0.4)';
        ctx.beginPath(); ctx.ellipse(0, -3, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#4a3a25';
        ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(bal, -28, -6 + bal, -62); ctx.stroke();
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-2 + bal, -40); ctx.lineTo(-20 + bal, -56); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3 + bal, -50); ctx.lineTo(-16 + bal, -40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3 + bal, -56); ctx.lineTo(12 + bal, -70); ctx.stroke();
        ctx.strokeStyle = '#5c7a4a';
        ctx.lineWidth = 2.4;
        for (let i = 0; i < 3; i++) {
            const px = -12 + i * 9 + bal;
            ctx.beginPath(); ctx.moveTo(px, -50 + i * 5); ctx.lineTo(px - 3, -38 + i * 4); ctx.stroke();
        }
        ctx.restore();
    }

    function desenharRochaMusgo(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(8, 14, 8, 0.35)';
        ctx.beginPath(); ctx.ellipse(0, -2, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b6b55';
        ctx.beginPath();
        ctx.moveTo(-15, 0); ctx.lineTo(-10, -10); ctx.lineTo(-2, -14); ctx.lineTo(10, -12); ctx.lineTo(15, -4); ctx.lineTo(12, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7c7c66';
        ctx.beginPath(); ctx.ellipse(-1, -8, 7, 3.6, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(92, 122, 74, 0.9)';
        ctx.beginPath(); ctx.arc(-8, -6, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -10, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function desenharRuinaMusgosa(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(8, 12, 8, 0.42)';
        ctx.beginPath(); ctx.ellipse(0, -5, 30, 11, 0, 0, Math.PI * 2); ctx.fill();
        for (let lado = -1; lado <= 1; lado += 2) {
            const px = lado * 13;
            ctx.fillStyle = '#3f4044';
            ctx.fillRect(px - 7, -38, 14, 38);
            ctx.fillStyle = '#4c4d52';
            ctx.fillRect(px - 7, -38, 14, 6);
            ctx.fillStyle = '#59604a';
            ctx.fillRect(px - 7, -32, 14, 3);
            ctx.fillStyle = '#353639';
            ctx.fillRect(px - 4, -16, 3, 16);
            ctx.fillRect(px + 1, -11, 3, 11);
        }
        ctx.fillStyle = '#3f423c';
        ctx.fillRect(-6, -15, 12, 15);
        ctx.fillStyle = '#8aa06a';
        ctx.fillRect(-4, -7, 2, 7);
        ctx.restore();
    }

    function desenharParedeRaiz(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(6, 10, 6, 0.45)';
        ctx.beginPath(); ctx.ellipse(0, -4, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#33342e';
        ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.stroke();
        ctx.strokeStyle = '#45463e';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-16, -34); ctx.lineTo(-18, -48); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(14, -52); ctx.lineTo(12, -66); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(-10, -72); ctx.stroke();
        ctx.strokeStyle = 'rgba(92, 122, 74, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-14, -18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, -50); ctx.lineTo(14, -40); ctx.stroke();
        ctx.restore();
    }

    // Vórtices espaciais
    function desenharPortalPantano(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_RETORNO.x, PORTA_RETORNO.y, t, '#7a5233');
    }

    function desenharPortalEntradaPantano(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_ENTRADA.x, PORTA_ENTRADA.y, t, '#3d7a52');
    }

    function desenharVortex(ctx, x, y, t, cor) {
        ctx.save();
        ctx.shadowColor = cor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(8, 18, 12, 0.6)';
        ctx.beginPath(); ctx.arc(x, y, 54, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 26;
        ctx.strokeStyle = cor;
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 5; i++) {
            const raio = 18 + i * 8;
            const a0 = t * 1.4 + i * 1.25;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, raio, a0, a0 + Math.PI * 0.8); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ---------------- API ----------------
    const api = {
        TILE: TILE,
        PAN_X0: PAN_X0, PAN_X1: PAN_X1, PAN_Y1: PAN_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        gerarPantano: gerarPantano,
        resetarPantano: resetarPantano,
        carregado: function () { return !!(grid); },
        grid: function () { return grid; },
        entidades: function () { return sortables; },
        isPantano: isPantano,
        colidePantano: colidePantano,
        colideProjetilPantano: colideProjetilPantano,
        ehVenenoPantano: ehVenenoPantano,
        colideMapaAtivo: colideMapaAtivo,
        infoPortalPantano: infoPortalPantano,
        onUpdatePosicao: onUpdatePosicao,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharCenarioPantano: desenharCenarioPantano,
        coletarPantanoSortables: coletarPantanoSortables,
        desenharPortalPantano: desenharPortalPantano,
        desenharPortalEntradaPantano: desenharPortalEntradaPantano
    };

    // Expoê para o navegador
    if (global.window) {
        gerarPantano();
        global.desenharCenarioPantano = desenharCenarioPantano;
        global.coletarPantanoSortables = coletarPantanoSortables;
        global.colidePantano = colidePantano;
        global.colideMapaAtivo = colideMapaAtivo;
        global.ehVenenoPantano = ehVenenoPantano;
        global.desenharPortalPantano = desenharPortalPantano;
        global.desenharPortalEntradaPantano = desenharPortalEntradaPantano;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.resetarPantano = resetarPantano;
        global.mapaPantano = api;
    }

    // Expoê para o Node
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarPantano();
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : this);